/**
 * shot.mjs — grab a frame of the built artifact from inside a sandboxed
 * iframe, at a given day and hour. Diagnostic only.
 *
 *   node tools/shot.mjs out.png [day] [hour] [yaw] [pitch]
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [out = 'shot.png', day = '1', hour = '7', yaw = '0', pitch = '0', on = ''] = process.argv.slice(2);
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
</style></head><body>
<iframe id="f" sandbox="allow-scripts" src="inner.html"></iframe>
</body></html>`);

const server = createServer(async (req, res) => {
  const name = req.url === '/' ? '/outer.html' : req.url.split('?')[0];
  // The browser asks for a favicon whatever we do; answer it so the 404 does
  // not show up as a console error and get mistaken for the game's.
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
page.on('console', (m) => { if (m.type() === 'error') console.log('  console: ' + m.text().slice(0, 300)); });
page.on('pageerror', (e) => console.log('  pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 5).join('\n')));
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
const frame = page.frames().find(f => f.url().includes('inner.html'));
await frame.waitForFunction(() => !!window.BROOD, null, { timeout: 40000 });

const info = await frame.evaluate(async ([d, h, y, p, lit]) => {
  document.getElementById('warn-ok').click();
  await new Promise(res => setTimeout(res, 300));
  const btn = [...document.querySelectorAll('#menu-buttons button')]
    .find(b => /begin|new/i.test(b.textContent));
  btn.click();
  await new Promise(res => setTimeout(res, 800));
  const B = window.BROOD;
  if (d > 1) B.days(d - 1);
  B.setHour(h);
  for (const room of lit) { B.state.lights[room] = true; }
  B.controls.yaw = y; B.controls.pitch = p;
  B.controls._apply();
  // This container rasterises in software at roughly one frame a second, so
  // a screenshot needs seconds of settling to be the frame that was asked for.
  await new Promise(res => setTimeout(res, 9000));
  B.controls.yaw = y; B.controls.pitch = p;
  B.controls._apply();
  B.world.render();
  const lights = [];
  B.world.scene.traverse((o) => {
    if (o.isLight) lights.push([o.type, o.name || '-', +(o.intensity || 0).toFixed(1),
                                o.visible, o.castShadow || false]);
  });
  return { day: B.state.day, hour: B.state.hour, phase: B.state.phase,
           lights: JSON.stringify(B.state.lights),
           sceneLights: lights,
           cam: B.world.camera.position.toArray().map(n => +n.toFixed(2)),
           yaw: +B.controls.yaw.toFixed(2), pitch: +B.controls.pitch.toFixed(2),
           curtain: B.state.curtainOpen,
           exposure: B.effects.debug ? B.effects.debug() : null };
}, [Number(day), Number(hour), Number(yaw), Number(pitch), on ? on.split(',') : []]);

console.log(info);
await page.screenshot({ path: out });
console.log('wrote ' + out);
await browser.close();
server.close();
