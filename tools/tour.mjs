/**
 * tour.mjs — walk the built artifact the way a player does and photograph
 * every step, so a claim that something works can be checked rather than
 * believed.
 *
 *   node tools/tour.mjs [day]
 *
 * Writes .shot/tour-NN-name.png and prints what it found on each screen.
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DAY = +(process.argv[2] || 14);
const TMP = join(ROOT, '.shot');
await mkdir(TMP, { recursive: true });

const inner = await readFile(join(ROOT, 'dist/the-brood.html'), 'utf8');
await writeFile(join(TMP, 'tour.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body>\n${inner}\n</body></html>`);

const server = createServer(async (req, res) => {
  const name = req.url === '/' ? '/tour.html' : req.url.split('?')[0];
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
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.BROOD, null, { timeout: 40000 });

let n = 0;
async function shot(name, note = '') {
  const f = join(TMP, `tour-${String(++n).padStart(2, '0')}-${name}.png`);
  await page.screenshot({ path: f });
  console.log(`  ${String(n).padStart(2, '0')}  ${name}${note ? '  — ' + note : ''}`);
  return f;
}

/** Are the <img> elements on screen actually decoded, or broken? */
async function imageHealth() {
  return page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')];
    const bad = imgs.filter(i => i.complete && i.naturalWidth === 0);
    return {
      total: imgs.length,
      broken: bad.length,
      badSrc: bad.slice(0, 3).map(i => (i.src || '').slice(0, 60)),
      dataUris: imgs.filter(i => /^data:/.test(i.src)).length,
    };
  });
}

/* ---- start ---- */
await page.evaluate(async () => {
  document.getElementById('warn-ok').click();
  await new Promise(r => setTimeout(r, 200));
  [...document.querySelectorAll('#menu-buttons button')]
    .find(b => /begin|new/i.test(b.textContent)).click();
  await new Promise(r => setTimeout(r, 800));
});
await page.waitForTimeout(1500);
await shot('scene', 'the apartment, day 1');

/* ---- advance ---- */
await page.evaluate(async (d) => {
  const B = window.BROOD;
  while (B.state.day < d && !B.state.ended) B.sleep('good');
  B.ui.closeAll();
}, DAY);
await page.waitForTimeout(600);

/** Open the computer, with the browser at a given address. */
async function web(url, label) {
  await page.evaluate(async (u) => {
    const B = window.BROOD;
    B.state.web.history = [u];
    B.state.web.hIndex = 0;
    B.ui.closeAll(); B.ui.open('computer'); B.ui.open_.args._booted = true;
    B.ui.rerender();
    await new Promise(r => setTimeout(r, 100));
    const args = B.ui.open_.args;
    if (!(args.wins || []).some(w => w.kind === 'browser')) {
      [...document.querySelectorAll('.dt-icon')]
        .find(e => /Internet/.test(e.textContent))
        .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }
    await new Promise(r => setTimeout(r, 300));
  }, url);
  await page.waitForTimeout(900);
  const h = await imageHealth();
  await shot(label, `${h.total} images, ${h.broken} broken, ${h.dataUris} data URIs`);
  return h;
}

await web('http://forums.hrtidewater.net/', 'forum-list');
await web('http://forums.hrtidewater.net/t/mirror', 'forum-mirror-thread');
await web('http://www.safety-inspect.com.cn/', 'mirror-home');
await web('http://www.safety-inspect.com.cn/tw/tormentor', 'mirror-tormentor');
await web('http://www.safety-inspect.com.cn/tw/anguish', 'mirror-anguish');
await web('http://www.safety-inspect.com.cn/tw/incursion', 'mirror-incursion');
await web('http://www.safety-inspect.com.cn/gy/', 'mirror-about');
await web('http://www.wkrv9.com/', 'news-front');
await web('http://f.mirrorbox.io/u/archivist_p/', 'files');

/* ---- the entity photographs, as the forum shows them ---- */
await page.evaluate(async () => {
  const B = window.BROOD;
  B.state.web.history = ['http://forums.hrtidewater.net/t/red'];
  B.state.web.hIndex = 0;
  B.ui.rerender();
  await new Promise(r => setTimeout(r, 400));
});
await page.waitForTimeout(900);
await shot('forum-red-thread', JSON.stringify(await imageHealth()));

/* ---- mail, and the translator ---- */
await page.evaluate(async () => {
  const B = window.BROOD;
  B.state.flags.redLink = true; B.state.flags.redLinkDay = B.state.day - 1;
  B.ui.closeAll(); B.ui.open('computer'); B.ui.open_.args._booted = true;
  B.ui.rerender();
  await new Promise(r => setTimeout(r, 200));
  [...document.querySelectorAll('.dt-icon')].find(e => /^Mail/.test(e.textContent))
    .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await new Promise(r => setTimeout(r, 400));
  const row = [...document.querySelectorAll('.mail-item')]
    .find(e => /safety-inspect/.test(e.textContent));
  if (row) row.click();
  await new Promise(r => setTimeout(r, 300));
});
await page.waitForTimeout(700);
await shot('mail-reply');

await page.evaluate(async () => {
  const a = document.querySelector('.mail-body a.red');
  if (a) a.click();
  await new Promise(r => setTimeout(r, 300));
});
await page.waitForTimeout(500);
await shot('mail-red-line', await page.evaluate(() =>
  document.querySelector('.red-line')?.textContent || 'NO RED LINE'));

await page.evaluate(async () => {
  const B = window.BROOD;
  B.ui.closeAll(); B.ui.open('computer'); B.ui.open_.args._booted = true;
  B.ui.rerender();
  await new Promise(r => setTimeout(r, 300));
  [...document.querySelectorAll('.dt-icon')].find(e => /LingoDesk/.test(e.textContent))
    .dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await new Promise(r => setTimeout(r, 500));
  const ta = document.querySelector('.trans-in');
  if (ta) {
    ta.value = '你对此无能为力。你们都将终生受苦。';
    document.querySelector('.trans-go').click();
  }
});
await page.waitForTimeout(700);
await shot('translator', await page.evaluate(() =>
  document.querySelector('.trans-out')?.textContent?.slice(0, 60) || 'NO OUTPUT'));

/* ---- the television ---- */
await page.evaluate(async () => {
  const B = window.BROOD;
  B.ui.closeAll();
  B.state.tvOn = true;
  B.ui.open('tv');
  B.ui.rerender();
  await new Promise(r => setTimeout(r, 2500));
});
await page.waitForTimeout(1200);
await shot('tv');

console.log(errors.length ? '\nERRORS:\n' + errors.slice(0, 10).join('\n') : '\nno page errors.');
await browser.close();
server.close();
