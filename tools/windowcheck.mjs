/**
 * windowcheck.mjs — §1.4 / §9.3. The window is the most important object in
 * the game. Prove it shows a real place, at noon and at midnight, on Day 2,
 * Day 11 and Day 20 — and that those are three different places.
 *
 *   node tools/windowcheck.mjs [--shots]
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv.includes('--shots');
const TMP = join(ROOT, '.shot');
await mkdir(TMP, { recursive: true });

const inner = await readFile(join(ROOT, 'dist/the-brood.html'), 'utf8');
await writeFile(join(TMP, 'win-inner.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body>\n${inner}\n</body></html>`);
await writeFile(join(TMP, 'win-outer.html'), `<!doctype html>
<html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000}
iframe{border:0;width:100vw;height:100vh;display:block}</style></head>
<body><iframe sandbox="allow-scripts" src="win-inner.html"></iframe></body></html>`);

const server = createServer(async (req, res) => {
  const name = req.url === '/' ? '/win-outer.html' : req.url.split('?')[0];
  if (name === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  let buf;
  try { buf = await readFile(TMP + name); }
  catch { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(buf);
});
await new Promise(r => server.listen(0, r));

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
const frame = page.frames().find(f => f.url().includes('win-inner.html'));
await frame.waitForFunction(() => !!window.BROOD, null, { timeout: 40000 });

const results = [];
const log = (name, ok, note = '') => {
  results.push({ name, ok });
  console.log(`  ${ok ? 'ok ' : 'FAIL'}  ${name}${note ? '  — ' + note : ''}`);
};

await frame.evaluate(async () => {
  document.getElementById('warn-ok').click();
  await new Promise(r => setTimeout(r, 250));
  [...document.querySelectorAll('#menu-buttons button')]
    .find(b => /begin|new/i.test(b.textContent)).click();
  await new Promise(r => setTimeout(r, 700));
});

/* ---- 1. the aperture is clear: rays west must reach the street ---- */
let r = await frame.evaluate(() => {
  const B = window.BROOD;
  const rows = [];
  // Fan out through the aperture, level and slightly down, at eye height.
  for (const y of [1.05, 1.25, 1.62, 1.95, 2.15]) {
    for (const dy of [0, -0.18]) {
      const hits = B.raycast([-3.7, y, -0.2], [-1, dy, 0], 60, 6);
      // The window assembly itself lives between x −4.18 and −4.45: bars,
      // reveal, frame, sill. Hits in there are the window, not an obstruction.
      const beyond = hits.filter(h => h.x < -4.45);
      rows.push({
        y, dy,
        first: beyond[0] ? beyond[0].x : null,
        chain: hits.map(h => `${h.tag}@${h.x}`).join(' → ') || 'nothing',
      });
    }
  }
  return rows;
});
// Past the window assembly, the next thing must be across the road — not
// our own facade, which used to close the aperture off entirely.
const blocked = r.filter(row => row.first !== null && row.first > -6.0);
log('nothing of our own building stands in the aperture', blocked.length === 0,
    blocked.length ? blocked.map(b => `y${b.y}: ${b.chain}`).join(' ; ')
                   : `${r.length} rays, all clear of the reveal`);
const reached = r.filter(row => row.first !== null && row.first < -6.5);
log('the rays land on the street, not on nothing', reached.length >= 4,
    reached.slice(0, 3).map(b => `y${b.y}${b.dy ? ' down' : ''}: ${b.chain}`).join(' ; '));

/* ---- 2. the view is a picture, at six different times ---- */
const VIEWS = [
  { day: 2,  hour: 12,   name: 'day2-noon' },
  { day: 2,  hour: 0.5,  name: 'day2-midnight' },
  { day: 11, hour: 12,   name: 'day11-noon' },
  { day: 11, hour: 0.5,  name: 'day11-midnight' },
  { day: 20, hour: 12,   name: 'day20-noon' },
  { day: 20, hour: 0.5,  name: 'day20-midnight' },
];
const stats = [];
for (const v of VIEWS) {
  const out = await frame.evaluate(async ([day, hour]) => {
    const B = window.BROOD;
    B.reset(); B.startNew();
    if (day > 1) B.days(day - 1);
    B.setHour(hour);
    B.state.curtainOpen = true;
    // Stand at the window and look due west through the bars.
    B.controls.enabled = true;
    B.controls.spawn(-3.55, -0.2, Math.PI / 2);
    B.controls.pitch = -0.05;
    B.controls._apply();
    await new Promise(res => setTimeout(res, 5200));
    B.controls.spawn(-3.55, -0.2, Math.PI / 2);
    B.controls.pitch = -0.05;
    B.controls._apply();
    B.world.render();

    // Sample only the aperture: the middle of the frame, where the bars are.
    const cv = document.getElementById('scene');
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    const w = Math.floor(cv.width * 0.5), h = Math.floor(cv.height * 0.5);
    const x0 = Math.floor(cv.width * 0.25), y0 = Math.floor(cv.height * 0.25);
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(x0, y0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    let sum = 0, lit = 0, max = 0, rs = 0, gs = 0, bs = 0;
    const hist = new Array(16).fill(0);
    for (let i = 0; i < px.length; i += 4) {
      const l = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
      sum += l; rs += px[i]; gs += px[i + 1]; bs += px[i + 2];
      if (l > 8) lit++;
      if (l > max) max = l;
      hist[Math.min(15, Math.floor(l / 16))]++;
    }
    const n = px.length / 4;
    return {
      mean: +(sum / n).toFixed(2), lit: +(lit / n).toFixed(3), max,
      tint: [Math.round(rs / n), Math.round(gs / n), Math.round(bs / n)],
      // How many distinct brightness bands are actually populated: a real
      // picture fills several, a black plane fills one.
      bands: hist.filter(c => c > n * 0.004).length,
    };
  }, [v.day, v.hour]);
  stats.push({ ...v, ...out });
  if (SHOTS) await page.screenshot({ path: join(TMP, `window-${v.name}.png`) });
}

for (const s of stats) {
  console.log(`       ${s.name.padEnd(16)} mean ${String(s.mean).padStart(6)}  ` +
              `lit ${(s.lit * 100).toFixed(0).padStart(3)}%  peak ${String(s.max).padStart(3)}  ` +
              `bands ${s.bands}  rgb ${s.tint.join(',')}`);
}

const noons = stats.filter(s => s.hour === 12);
log('at noon the window shows a lit place, not a black plane',
    noons.every(s => s.mean > 6 && s.lit > 0.25 && s.bands >= 3),
    noons.map(s => `${s.name} mean ${s.mean}`).join(', '));

const nights = stats.filter(s => s.hour !== 12);
log('at midnight there is still something out there',
    nights.every(s => s.max > 30),
    nights.map(s => `${s.name} peak ${s.max}`).join(', '));

const d2 = stats.find(s => s.name === 'day2-noon');
const d11 = stats.find(s => s.name === 'day11-noon');
const d20 = stats.find(s => s.name === 'day20-noon');
const differs = (a, b) => Math.abs(a.mean - b.mean) > 0.6 ||
  Math.abs(a.tint[0] - b.tint[0]) + Math.abs(a.tint[2] - b.tint[2]) > 6;
log('Day 2, Day 11 and Day 20 are three different places',
    differs(d2, d11) && differs(d11, d20) && differs(d2, d20),
    `means ${d2.mean} / ${d11.mean} / ${d20.mean}`);

/* ---- 3. the bars occlude but never block ---- */
r = await frame.evaluate(() => {
  const B = window.BROOD;
  // Between the bars there must be a clear line out; through a bar there
  // must not be. 9 bars at 167 mm centres across 1.5 m.
  let through = 0, stopped = 0;
  for (let i = 0; i <= 40; i++) {
    const z = -0.95 + (i / 40) * 1.5;
    const hits = B.raycast([-3.7, 1.62, z], [-1, 0, 0], 60, 3);
    const firstX = hits[0] ? hits[0].x : -99;
    if (firstX < -6.5) through++;
    else stopped++;
  }
  return { through, stopped };
});
log('the bars occlude the view without blocking it',
    r.through > 12 && r.stopped > 4,
    `${r.through}/40 sightlines reach the street, ${r.stopped} land on a bar or reveal`);

console.log('');
if (errors.length) console.log('ERRORS: ' + errors.slice(0, 6).join(' | '));
else console.log('no page errors.');
const failed = results.filter(x => !x.ok);
console.log('');
console.log(`${results.length - failed.length}/${results.length} window checks passed.`);
await browser.close();
server.close();
process.exit(failed.length || errors.length ? 1 : 0);
