/**
 * onesheet.mjs — one entity, large, so a detail can actually be judged.
 *
 *   node tools/onesheet.mjs pathogen [1000] [780]
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const kind = process.argv[2] || 'pathogen';
const W = +(process.argv[3] || 1000), H = +(process.argv[4] || 780);
const TMP = join(ROOT, '.shot');
await mkdir(TMP, { recursive: true });

const inner = await readFile(join(ROOT, 'dist/the-brood.html'), 'utf8');
await writeFile(join(TMP, 'one-inner.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body>\n${inner}\n</body></html>`);

const server = createServer(async (req, res) => {
  const name = req.url === '/' ? '/one-inner.html' : req.url.split('?')[0];
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
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => console.log('pageerror: ' + e.message));
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.BROOD, null, { timeout: 40000 });

const ok = await page.evaluate(async ([k, w, h]) => {
  const urls = window.BROOD.snapshots([k], { w, h, variant: 'big' + w });
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000';
  const img = document.createElement('img');
  img.src = urls[k];
  img.style.cssText = 'width:100%;height:100%;object-fit:contain;display:block';
  host.appendChild(img);
  document.body.appendChild(host);
  await img.decode().catch(() => {});
  await new Promise(r => setTimeout(r, 400));
  return true;
}, [kind, W, H]);

if (ok) {
  const out = join(TMP, `one-${kind}.png`);
  await page.screenshot({ path: out });
  console.log('wrote ' + out);
}
await browser.close();
server.close();
