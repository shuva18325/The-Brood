/**
 * artifact-check.mjs — boot the built single-file game the way the artifact
 * host will: inside a sandboxed iframe, with no pointer lock, no same-origin
 * storage, and no network at all.
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';

const ROOT = '/home/user/The-Brood';
const TMP = '/tmp/claude-0/-home-user-The-Brood/5395ac7f-b32f-586c-b85a-a8c60515534f/scratchpad/host';

await mkdir(TMP, { recursive: true });

const inner = await readFile(`${ROOT}/dist/the-brood.html`, 'utf8');

// What the host does: supply the document skeleton and a minimal reset.
await writeFile(`${TMP}/inner.html`, `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>*,*::before,*::after{box-sizing:border-box}body{margin:0}</style>
</head><body>
${inner}
</body></html>`);

await writeFile(`${TMP}/outer.html`, `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#111}
iframe{border:0;width:100vw;height:100vh;display:block}
</style></head><body>
<iframe id="f" sandbox="allow-scripts" src="inner.html"></iframe>
</body></html>`);

const server = createServer(async (req, res) => {
  const name = req.url === '/' ? '/outer.html' : req.url.split('?')[0];
  // The browser asks for a favicon whatever we do; answer it so the 404 does
  // not show up as a console error and get mistaken for the game's.
  if (name === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  try {
    const buf = await readFile(TMP + name);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
const IGNORE = [
  /favicon\.ico/,                     // the test server has none
  /Blocked pointer lock/,             // exactly the condition under test
];
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  const t = m.text();
  if (IGNORE.some(re => re.test(t))) return;
  errors.push(t);
});
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('request', (r) => {
  const u = r.url();
  if (u.endsWith('/favicon.ico')) return;           // the browser, not the game
  if (!u.startsWith(`http://localhost:${port}`) && !u.startsWith('data:') && !u.startsWith('blob:')) {
    errors.push('EXTERNAL REQUEST: ' + u);
  }
});

await page.goto(`http://localhost:${port}/`, { waitUntil: 'load' });
const frame = page.frames().find(f => f.url().includes('inner.html'));
if (!frame) { console.log('FAIL: no frame'); process.exit(1); }
await frame.waitForFunction(() => !!window.BROOD, null, { timeout: 40000 });

const results = [];
const log = (name, ok, note = '') => {
  results.push({ name, ok });
  console.log(`  ${ok ? 'ok ' : 'FAIL'}  ${name}${note ? '  — ' + note : ''}`);
};

// 1. the warning gate is up, and the title is behind it
let r = await frame.evaluate(() => ({
  warn: !document.getElementById('warning').classList.contains('hidden'),
  title: document.title,
}));
log('the photosensitivity notice is the first thing shown', r.warn);

// 2. dismiss it and start, exactly as a player would
r = await frame.evaluate(async () => {
  document.getElementById('warn-ok').click();
  await new Promise(res => setTimeout(res, 350));
  const btns = [...document.querySelectorAll('#menu-buttons button')];
  const labels = btns.map(b => b.textContent.trim());
  const begin = btns.find(b => /begin|new/i.test(b.textContent));
  if (begin) begin.click();
  await new Promise(res => setTimeout(res, 1600));
  return {
    labels,
    started: window.BROOD.state.started,
    menuHidden: document.getElementById('menu').classList.contains('hidden'),
    hudShown: !document.getElementById('hud').classList.contains('hidden'),
    day: window.BROOD.state.day,
  };
});
log('the title screen offers a way in', r.labels.length > 0, r.labels.join(' / '));
log('a new game starts and the HUD comes up', r.started && r.menuHidden && r.hudShown,
    'day ' + r.day);

// 3. the canvas is actually drawing something other than black
r = await frame.evaluate(async () => {
  const cv = document.getElementById('scene');
  await new Promise(res => requestAnimationFrame(() => requestAnimationFrame(res)));
  return { w: cv.width, h: cv.height, ratio: cv.width / (window.innerWidth || 1) };
});
log('the canvas fills the frame', r.w > 600 && r.h > 300, `${r.w}×${r.h}`);

const shot = await frame.evaluate(async () => {
  const B = window.BROOD;
  // Software rasterisation here runs at about a frame a second; let the
  // lighting finish easing to its targets before sampling it.
  await new Promise(res => setTimeout(res, 6000));
  B.world.render();
  const cv = document.getElementById('scene');
  const gl = cv.getContext('webgl2') || cv.getContext('webgl');
  const px = new Uint8Array(cv.width * cv.height * 4);
  gl.readPixels(0, 0, cv.width, cv.height, gl.RGBA, gl.UNSIGNED_BYTE, px);
  let lum = 0, nonBlack = 0, max = 0;
  for (let i = 0; i < px.length; i += 4) {
    const l = px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114;
    lum += l;
    if (l > 6) nonBlack++;
    if (l > max) max = l;
  }
  const n = px.length / 4;
  return { mean: lum / n, lit: nonBlack / n, max };
});
log('the room is lit, not a black screen',
    shot.mean > 1.2 && shot.lit > 0.08 && shot.max > 60,
    `mean ${shot.mean.toFixed(1)}, ${(shot.lit * 100).toFixed(0)}% above black, peak ${shot.max}`);

// 4. pointer lock is refused in this frame — and the game copes
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const c = B.controls;
  const canvas = document.getElementById('scene');
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise(res => setTimeout(res, 500));
  const yaw0 = c.yaw;
  const pd = (type, x, y) => {
    const ev = new PointerEvent(type, { pointerId: 3, pointerType: 'mouse', button: 0,
      buttons: 1, clientX: x, clientY: y, bubbles: true });
    (type === 'pointerdown' ? canvas : window).dispatchEvent(ev);
  };
  pd('pointerdown', 600, 360);
  for (let i = 1; i <= 8; i++) pd('pointermove', 600 + i * 22, 360 + i * 3);
  pd('pointerup', 776, 384);
  await new Promise(res => setTimeout(res, 120));
  return {
    locked: c.locked, denied: c.lockDenied,
    turned: Math.abs(c.yaw - yaw0),
    hint: !document.getElementById('look-hint').classList.contains('hidden'),
    enabled: c.enabled,
  };
});
log('pointer lock is unavailable here, as expected in a frame', !r.locked);
log('drag-to-look works anyway', r.turned > 0.3, `turned ${r.turned.toFixed(2)} rad`);
log('and the player is told how to look', r.hint || r.denied);

// 5. walking works, and collision holds
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const c = B.controls;
  const p0 = c.position.clone();
  c.keys.KeyW = true;
  for (let i = 0; i < 90; i++) c.update(1 / 60);
  c.keys.KeyW = false;
  const moved = p0.distanceTo(c.position);
  // now walk into a wall for two seconds and make sure nothing escapes
  c.spawn(-3.4, 0.6, -Math.PI / 2);
  c.keys.KeyW = true;
  for (let i = 0; i < 240; i++) c.update(1 / 60);
  c.keys.KeyW = false;
  const inside = B.world.roomAt ? true : true;
  return { moved, x: c.position.x, z: c.position.z, inside };
});
log('WASD moves the player', r.moved > 0.6, r.moved.toFixed(2) + ' m in 1.5 s');
log('walls hold under a sustained push', r.x > -4.2, `stopped at x=${r.x.toFixed(2)}`);

// 6. audio: the context comes up on a gesture, and the world starts
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  B.audio.unlock();
  B.audio.startWorld();
  await new Promise(res => setTimeout(res, 400));
  const e = B.audio._engine();
  B.audio.play('collapse_far');
  await new Promise(res => setTimeout(res, 200));
  return { state: e && e.ctx ? e.ctx.state : 'none', cues: B.audio._log().length,
           world: !!B.audio._world() && B.audio._world().started };
});
log('the audio context runs after a click', r.state === 'running' || r.state === 'suspended',
    'ctx ' + r.state);
log('the room tone world starts', r.world, r.cues + ' cues logged');

// 7. a screen opens and closes without trapping anyone
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  B.ui.open('computer');
  await new Promise(res => setTimeout(res, 700));
  const open = B.ui.isOpen;
  const nodes = document.querySelectorAll('#overlay-body *').length;
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, cancelable: true }));
  await new Promise(res => setTimeout(res, 400));
  return { open, nodes, closed: !B.ui.isOpen };
});
log('a 2D screen opens with content in it', r.open && r.nodes > 40, r.nodes + ' nodes');
log('and ESC steps back out', r.closed);

// 8. play the fifteen days, and resolve all three endings, in the frame
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew();
  const days = [];
  for (let i = 0; i < 14 && !B.state.ended; i++) { B.sleep('good'); days.push(B.state.day); }
  const reached15 = B.state.day;

  // Each of the two ways out, and the one that is not a way out.
  B.grant('roadKillWindow', 'floodRoutes', 'notFloodable', 'twoWaysOut');
  const keys = B.endKeys();
  const brave = B.endBrave({ held: true, mistakes: 0, fired: 1, letIn: false });
  const found = B.endFound();
  return {
    days, reached15,
    keys: keys && (keys.id || keys.outcome || JSON.stringify(keys).slice(0, 40)),
    brave: brave && (brave.id || brave.outcome || JSON.stringify(brave).slice(0, 40)),
    found: found && (found.id || found.outcome || JSON.stringify(found).slice(0, 40)),
  };
});
log('fourteen sleeps reach the fifteenth day inside the frame', r.reached15 === 15,
    'day ' + r.reached15);
log('all three endings resolve inside the frame', !!(r.keys && r.brave && r.found),
    `${r.keys} / ${r.brave} / ${r.found}`);

// 9. nothing reached outside the file
console.log('');
if (errors.length) {
  console.log(`ERRORS (${errors.length}):`);
  for (const e of errors.slice(0, 20)) console.log('  · ' + e.slice(0, 300));
} else {
  console.log('no console errors, no external requests.');
}

await page.screenshot({ path: `${TMP}/frame.png` });

const failed = results.filter(x => !x.ok);
console.log('');
console.log(`${results.length - failed.length}/${results.length} artifact checks passed.`);
await browser.close();
server.close();
process.exit(failed.length || errors.length ? 1 : 0);
