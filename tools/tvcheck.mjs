/**
 * tvcheck.mjs — §1.2 / §9.4. Drive the television through the whole path and
 * every broadcast state, and prove each one actually paints something.
 *
 *   node tools/tvcheck.mjs [--shots]
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
await writeFile(join(TMP, 'inner.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style>
</head><body>\n${inner}\n</body></html>`);
await writeFile(join(TMP, 'outer.html'), `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#000}
iframe{border:0;width:100vw;height:100vh;display:block}
</style></head><body><iframe sandbox="allow-scripts" src="inner.html"></iframe></body></html>`);

const server = createServer(async (req, res) => {
  const name = req.url === '/' ? '/outer.html' : req.url.split('?')[0];
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
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() === 'error' && !/pointer lock/.test(m.text())) errors.push(m.text());
});
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
const frame = page.frames().find(f => f.url().includes('inner.html'));
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

/* ---- 1. the full interaction path, exactly as a player walks it ---- */
let r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const it = B.world.interaction.list.find(x => x.id === 'tv');
  const A = B.world.apt ? B.world.apt.anchors : null;
  void A;

  // Stand where the player stands to watch television, and look at it.
  const anchor = it.anchor.getWorldPosition(new B.world.camera.position.constructor());
  const from = { x: anchor.x - 0.2, z: anchor.z + 1.5 };
  const dx = anchor.x - from.x, dz = anchor.z - from.z;
  const yaw = Math.atan2(-dx, -dz);
  B.controls.spawn(from.x, from.z, yaw);
  B.controls.enabled = true;
  B.world.interaction.refresh();

  const offered = document.getElementById('prompt-text').textContent;
  const promptVisible = !document.getElementById('prompt').classList.contains('hidden');

  // Press E, the way the player does.
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
  await new Promise(res => setTimeout(res, 600));

  const opened = B.ui.isOpen;
  const frozen = !B.controls.enabled;
  const painted = !!document.querySelector('#overlay-body .tv-pic');

  // Escape back out.
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, cancelable: true }));
  await new Promise(res => setTimeout(res, 400));
  const closed = !B.ui.isOpen;
  const thawed = B.controls.enabled;

  // And now the set is on: pressing E again must SHOW it, not switch it off.
  B.world.interaction.refresh();
  const secondLabel = document.getElementById('prompt-text').textContent;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
  await new Promise(res => setTimeout(res, 500));
  const reopened = B.ui.isOpen && !!document.querySelector('#overlay-body .tv-pic');
  const stillOn = B.state.tvOn;

  return { offered, promptVisible, opened, frozen, painted, closed, thawed,
           secondLabel, reopened, stillOn };
});
log('the set offers itself when you stand in front of it',
    r.promptVisible && /television/.test(r.offered), r.offered);
log('E opens the broadcast and freezes the room', r.opened && r.frozen);
log('the picture actually paints', r.painted);
log('ESC returns you to the room', r.closed && r.thawed);
log('pressing E on a set that is already on shows it, not switches it off',
    r.reopened && r.stillOn, r.secondLabel);

/* ---- 2. the off switch is inside the overlay ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const btn = [...document.querySelectorAll('#overlay-body .tv-controls button')]
    .find(b => /switch it off/i.test(b.textContent));
  if (!btn) return { found: false };
  btn.click();
  await new Promise(res => setTimeout(res, 400));
  return { found: true, off: !B.state.tvOn, closed: !B.ui.isOpen };
});
log('the set can be switched off from the overlay', r.found && r.off && r.closed);

/* ---- 3. every broadcast state paints ---- */
const MODES = ['ident', 'news', 'eas', 'bars', 'signoff', 'snow', 'lost'];
const seen = {};
for (const mode of MODES) {
  const out = await frame.evaluate(async (m) => {
    const B = window.BROOD;
    // A day where the mode is plausible, so the audio chain matches.
    // Each mode on a day where it is what the set would actually be doing.
    const T = B.CONFIG.tv;
    const day = { ident: 2, news: 4, eas: T.wrongMessageFromDay, bars: T.barsFromDay,
                  signoff: T.signOffDay, snow: T.snowFromDay, lost: 12 }[m];
    B.reset(); B.startNew();
    if (day > 1) B.days(day - 1);
    B.state.tvOn = true;
    B.ui.open('tv', { mode: m });
    await new Promise(res => setTimeout(res, 700));
    const pic = document.querySelector('#overlay-body .tv-pic');
    const nodes = pic ? pic.querySelectorAll('*').length : 0;
    const cls = pic ? pic.className : '';
    const text = pic ? (pic.textContent || '').trim().slice(0, 90) : '';
    const kids = pic ? [...pic.children].map(c => c.className).join(' ') : '';
    return { day, nodes, cls, text, kids, painted: !!pic };
  }, mode);
  seen[mode] = out;
  log(`the ${mode} state paints`, out.painted && (out.nodes > 0 || mode === 'snow'),
      `day ${out.day}, ${out.nodes} nodes · ${out.kids || out.text}`);
  if (SHOTS) {
    await page.screenshot({ path: join(TMP, `tv-${mode}.png`) });
  }
}

/* ---- 4. the schedule reaches every state across the run ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const hit = {};
  const byDay = {};
  for (let day = 1; day <= 20; day++) {
    const set = new Set();
    for (const hour of [6.2, 7, 10.1, 13, 14.5, 19, 22, 2]) {
      const m = B.tvSchedule(day, hour);
      hit[m] = (hit[m] || 0) + 1;
      set.add(m);
    }
    byDay[day] = [...set].join('/');
  }
  return { hit, byDay };
});
log('the schedule reaches every broadcast state across twenty days',
    ['news', 'eas', 'bars', 'signoff', 'snow'].every(m => r.hit[m] > 0),
    Object.entries(r.hit).map(([k, v]) => `${k}×${v}`).join(', '));
console.log('       ' + Object.entries(r.byDay)
  .map(([d, m]) => `d${d}:${m}`).join('  '));

console.log('');
if (errors.length) {
  console.log('ERRORS (' + errors.length + '):');
  for (const e of errors.slice(0, 15)) console.log('  · ' + e.slice(0, 300));
} else {
  console.log('no console errors.');
}
const failed = results.filter(x => !x.ok);
console.log('');
console.log(`${results.length - failed.length}/${results.length} television checks passed.`);
await browser.close();
server.close();
process.exit(failed.length || errors.length ? 1 : 0);
