/**
 * entitysheet.mjs — §3 / §9.8. Render every found photograph onto one sheet
 * so the legibility rule can actually be judged: you should be able to see it
 * perfectly and still not be able to say what any part of it is for.
 *
 *   node tools/entitysheet.mjs [out.png]
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || join(ROOT, '.shot', 'entities.png');
const TMP = join(ROOT, '.shot');
await mkdir(TMP, { recursive: true });

const inner = await readFile(join(ROOT, 'dist/the-brood.html'), 'utf8');
await writeFile(join(TMP, 'ent-inner.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body>\n${inner}\n</body></html>`);

const server = createServer(async (req, res) => {
  const name = req.url === '/' ? '/ent-inner.html' : req.url.split('?')[0];
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
const page = await browser.newPage({ viewport: { width: 1180, height: 1000 } });
page.on('pageerror', e => console.log('pageerror: ' + e.message));
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.BROOD, null, { timeout: 40000 });

// Build a contact sheet inside the page, using the game's own imagery module.
const stats = await page.evaluate(async () => {
  const IMG = (await import('/nonexistent').catch(() => null)) || null;
  void IMG;
  // The bundle does not expose modules, so reach the function the game uses.
  const mod = window.BROOD.ui;
  void mod;
  const KINDS = ['anguish', 'tormentor', 'incursion', 'crawler', 'gleaner',
                 'pathogen', 'roadkill', 'person'];

  // imagery is not on the debug API, so drive it through the forum's renderer
  // path instead: ask the UI for a screen that shows these images.
  const host = document.createElement('div');
  host.id = 'sheet';
  host.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#111;' +
    'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:8px;' +
    'font:11px ui-monospace,monospace;color:#999;overflow:auto';
  document.body.appendChild(host);

  const urls = window.BROOD.snapshots ? window.BROOD.snapshots(KINDS) : null;
  if (!urls) return { error: 'no snapshots hook' };

  const info = [];
  for (const k of KINDS) {
    const cell = document.createElement('div');
    const img = document.createElement('img');
    img.src = urls[k];
    img.style.cssText = 'width:100%;display:block;image-rendering:auto';
    const cap = document.createElement('div');
    cap.textContent = k;
    cell.appendChild(img); cell.appendChild(cap);
    host.appendChild(cell);
    info.push({ kind: k, bytes: urls[k].length });
  }
  await new Promise(res => setTimeout(res, 600));
  return { info };
});

if (stats.error) {
  console.log('FAIL: ' + stats.error);
} else {
  for (const i of stats.info) {
    console.log(`  ${i.kind.padEnd(10)} ${(i.bytes / 1024).toFixed(0)} KB of JPEG`);
  }
  await page.screenshot({ path: out, fullPage: true });
  console.log('wrote ' + out);
}
await browser.close();
server.close();
