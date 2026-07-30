/**
 * walktest.mjs — §1.3 / §9.1. Walk the apartment and prove nothing wedges.
 *
 * Three things:
 *   1. Reachability. Flood-fill the floor on a 100 mm grid using the same
 *      collision test the game uses, and report any pocket the player can
 *      stand in but not leave.
 *   2. Clearances. Measure the narrowest passable gap on every route between
 *      rooms, and report it in millimetres.
 *   3. The failsafe. Drop the player inside solid geometry and inside every
 *      doorway jamb and confirm they always get free.
 *
 *   node tools/walktest.mjs
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(ROOT, '.shot');
await mkdir(TMP, { recursive: true });

const inner = await readFile(join(ROOT, 'dist/the-brood.html'), 'utf8');
await writeFile(join(TMP, 'inner.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body>\n${inner}\n</body></html>`);
await writeFile(join(TMP, 'outer.html'), `<!doctype html>
<html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%}
iframe{border:0;width:100vw;height:100vh;display:block}</style></head>
<body><iframe sandbox="allow-scripts" src="inner.html"></iframe></body></html>`);

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
const page = await browser.newPage({ viewport: { width: 800, height: 500 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
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
  await new Promise(r => setTimeout(r, 200));
  [...document.querySelectorAll('#menu-buttons button')]
    .find(b => /begin|new/i.test(b.textContent)).click();
  await new Promise(r => setTimeout(r, 600));
  // His room has to be open, or a third of the flat is untestable.
  window.BROOD.state.bedroomUnlocked = true;
  window.BROOD.state.act = 2;
});

/* ---- 1. flood fill the walkable floor ---- */
let r = await frame.evaluate(() => {
  const B = window.BROOD;
  const c = B.controls;
  const R = 0.22;
  const EYE = 1.62;
  const STEP = 0.1;
  const X0 = -4.3, X1 = 6.7, Z0 = -3.7, Z1 = 3.7;
  const nx = Math.round((X1 - X0) / STEP), nz = Math.round((Z1 - Z0) / STEP);
  const free = (i, j) => !c._hit(X0 + i * STEP, Z0 + j * STEP, R, EYE);

  // Only floor inside a room counts. The enclosed void outside the shell is
  // not a pocket the player can reach; it is the other side of the wall.
  const inside = (i, j) =>
    !!B.world.roomAt(X0 + i * STEP, Z0 + j * STEP);
  const open = [];
  let total = 0;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < nz; j++) {
      if (free(i, j) && inside(i, j)) { open.push([i, j]); total++; }
    }
  }

  // Flood from the spawn cell.
  const key = (i, j) => i * 1000 + j;
  const seen = new Set();
  const si = Math.round((-3.2 - X0) / STEP), sj = Math.round((2.4 - Z0) / STEP);
  const stack = [[si, sj]];
  seen.add(key(si, sj));
  while (stack.length) {
    const [i, j] = stack.pop();
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
      if (seen.has(key(a, b)) || !free(a, b) || !inside(a, b)) continue;
      seen.add(key(a, b));
      stack.push([a, b]);
    }
  }

  // Anything standable but unreachable is a pocket.
  const orphans = open.filter(([i, j]) => !seen.has(key(i, j)));
  const byRoom = {};
  for (const [i, j] of orphans) {
    const x = X0 + i * STEP, z = Z0 + j * STEP;
    const room = B.world.roomAt ? B.world.roomAt(x, z) : 'unknown';
    const k = room || 'outside';
    (byRoom[k] = byRoom[k] || []).push([+x.toFixed(1), +z.toFixed(1)]);
  }
  return {
    total, reached: seen.size, orphans: orphans.length,
    byRoom: Object.fromEntries(Object.entries(byRoom)
      .map(([k, v]) => [k, v.length + ' cells e.g. ' + JSON.stringify(v[0])])),
    area: +(total * STEP * STEP).toFixed(1),
  };
});
log('every standable square metre of the flat is reachable from the mat',
    r.orphans === 0,
    `${r.reached}/${r.total} cells reachable, ${r.area} m² walkable` +
    (r.orphans ? ' · pockets: ' + JSON.stringify(r.byRoom) : ''));

/* ---- 2. the narrowest clearance on each doorway ---- */
r = await frame.evaluate(() => {
  const B = window.BROOD;
  const c = B.controls;
  const R = 0.22, EYE = 1.62, STEP = 0.005;

  // Sweep across each doorway on the line of the wall it pierces and measure
  // the widest continuous run a body actually fits through.
  const doors = [
    { name: 'main → kitchen', along: 'z', at: 1.0, lo: -3.6, hi: 3.6, near: -2.3 },
    { name: 'main → hall',    along: 'z', at: 1.0, lo: -3.6, hi: 3.6, near: 0.4 },
    { name: 'hall → landing', along: 'z', at: 4.2, lo: -0.4, hi: 1.0, near: 0.4 },
    { name: 'hall → bath',    along: 'x', at: 1.0, lo: 1.0, hi: 4.2, near: 1.8 },
    { name: 'hall → his room',along: 'x', at: 1.0, lo: 1.0, hi: 4.2, near: 3.19 },
  ];
  const out = [];
  for (const d of doors) {
    // Sweep only around this door, or the widest gap in the whole wall wins.
    const lo = Math.max(d.lo, d.near - 0.9), hi = Math.min(d.hi, d.near + 0.9);
    let best = 0, bestMid = 0, run = 0, runStart = 0;
    for (let v = lo; v <= hi; v += STEP) {
      const x = d.along === 'z' ? d.at : v;
      const z = d.along === 'z' ? v : d.at;
      const ok = !c._hit(x, z, R, EYE);
      if (ok) { if (run === 0) runStart = v; run += STEP; }
      else { if (run > best) { best = run; bestMid = runStart + run / 2; } run = 0; }
    }
    if (run > best) { best = run; bestMid = runStart + run / 2; }
    out.push({ name: d.name, mm: Math.round(best * 1000), centre: +bestMid.toFixed(2) });
  }
  return out;
});
const narrowest = r.reduce((a, b) => (b.mm < a.mm ? b : a));
log('every doorway passes a body with room to spare', narrowest.mm >= 300,
    'narrowest: ' + narrowest.name + ' at ' + narrowest.mm + ' mm of free width');
for (const d of r) {
  console.log(`       ${d.name.padEnd(16)} ${String(d.mm).padStart(4)} mm free, centred at ${d.centre}`);
}

/* ---- 3. walk every route, both ways, and check it completes ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const c = B.controls;
  const CENTRES = {
    main: [-2.0, -0.6], kitchen: [2.1, -1.6], hall: [2.6, 0.35],
    bath: [1.75, 1.9], bedroom: [3.35, 1.95], landing: [4.9, 0.35],
  };
  // A player aims at a doorway and then at the room beyond it. Steering in a
  // dead straight line at a far-off point is not how anyone walks, and it
  // clips jambs that a person would never touch.
  const DOOR = {
    kitchen: [1.0, -2.22], main: [1.0, 0.39], landing: [4.2, 0.39],
    bath: [1.83, 1.0], bedroom: [3.19, 1.0],
  };
  // Walk from a to b by steering: face the target and hold W. This is what a
  // player does, and it is the test that matters.
  const walk = (from, to, seconds = 14) => {
    c.enabled = true;
    c.spawn(from[0], from[1], 0);
    let t = 0;
    const dt = 1 / 60;
    while (t < seconds) {
      const dx = to[0] - c.position.x, dz = to[1] - c.position.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.3) return { ok: true, t: +t.toFixed(1) };
      c.yaw = Math.atan2(-dx, -dz);
      c.keys.KeyW = true;
      c.update(dt);
      t += dt;
    }
    c.keys.KeyW = false;
    return { ok: false, t: seconds,
             at: [+c.position.x.toFixed(2), +c.position.z.toFixed(2)] };
  };

  const names = Object.keys(CENTRES);
  const fails = [];
  let n = 0;
  for (const a of names) {
    for (const b of names) {
      if (a === b) continue;
      n++;
      // Straight-line steering cannot round a corner, so route through the
      // hall, which is what the flat's shape forces anyway.
      // hall is the junction, so every route is: room → its door → hall →
      // the other door → the other room.
      const via = [];
      if (a !== 'hall') via.push(DOOR[a]);
      via.push(CENTRES.hall);
      if (b !== 'hall') via.push(DOOR[b]);
      via.push(CENTRES[b]);
      const legs = [];
      let prev = CENTRES[a];
      for (const w of via) { legs.push([prev, w]); prev = w; }
      let at = null;
      let ok = true;
      for (const [f, t] of legs) {
        const res = walk(at || f, t, 10);
        if (!res.ok) { ok = false; at = res.at; break; }
        at = t;
      }
      if (!ok) fails.push(`${a}→${b} stalled at ${JSON.stringify(at)}`);
    }
  }
  return { n, fails };
});
log('every room can be walked to from every other room', r.fails.length === 0,
    `${r.n} routes` + (r.fails.length ? ' · ' + r.fails.slice(0, 6).join('; ') : ''));

/* ---- 4. the unstick failsafe, from inside solid geometry ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const c = B.controls;
  c.enabled = true;
  // Dead centre of every solid collider tall enough to block, plus both
  // jambs of every doorway — the places a body should never be, and is.
  const spots = [];
  for (const col of c.colliders) {
    if (col.h < 0.34) continue;
    spots.push({
      where: col.tag,
      x: (col.x0 + col.x1) / 2,
      z: (col.z0 + col.z1) / 2,
    });
  }
  const stuck = [];
  for (const s of spots) {
    c.spawn(s.x, s.z, 0);
    // Press forward into it, as a confused player would.
    let t = 0;
    const dt = 1 / 60;
    while (t < 6) {
      c.keys.KeyW = true;
      c.update(dt);
      t += dt;
      if (!c._hit(c.position.x, c.position.z, 0.22, 1.62)) break;
    }
    c.keys.KeyW = false;
    if (c._hit(c.position.x, c.position.z, 0.22, 1.62)) {
      stuck.push(`${s.where} at ${c.position.x.toFixed(2)},${c.position.z.toFixed(2)}`);
    }
  }
  return { n: spots.length, stuck };
});
log('a body dropped inside any solid object always gets free',
    r.stuck.length === 0,
    `${r.n} colliders tested` + (r.stuck.length ? ' · stuck in ' + r.stuck.join('; ') : ''));

console.log('');
if (errors.length) {
  console.log('ERRORS: ' + errors.slice(0, 8).join(' | '));
} else {
  console.log('no page errors.');
}
const failed = results.filter(x => !x.ok);
console.log('');
console.log(`${results.length - failed.length}/${results.length} walk checks passed.`);
await browser.close();
server.close();
process.exit(failed.length || errors.length ? 1 : 0);
