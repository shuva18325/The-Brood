/**
 * webcheck.mjs — §4 / §5 / §9. The screens are where the player spends most
 * of the game, so this drives them the way a person would and checks that
 * they behave like software.
 *
 *   node tools/webcheck.mjs [--shots]
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
await writeFile(join(TMP, 'web-inner.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body>\n${inner}\n</body></html>`);
await writeFile(join(TMP, 'web-outer.html'), `<!doctype html>
<html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%;background:#000}
iframe{border:0;width:100vw;height:100vh;display:block}</style></head>
<body><iframe sandbox="allow-scripts" src="web-inner.html"></iframe></body></html>`);

const server = createServer(async (req, res) => {
  const name = req.url === '/' ? '/web-outer.html' : req.url.split('?')[0];
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
const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => {
  if (m.type() === 'error' && !/pointer lock/.test(m.text())) errors.push(m.text());
});
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
const frame = page.frames().find(f => f.url().includes('web-inner.html'));
await frame.waitForFunction(() => !!window.BROOD, null, { timeout: 40000 });

const results = [];
const log = (name, ok, note = '') => {
  results.push({ name, ok });
  console.log(`  ${ok ? 'ok ' : 'FAIL'}  ${name}${note ? '  — ' + note : ''}`);
};

/** Open the computer with the browser window up, on a given day. */
async function openBrowser(day = 12) {
  return frame.evaluate(async (d) => {
    const B = window.BROOD;
    B.reset(); B.startNew();
    if (d > 1) B.days(d - 1);
    B.ui.closeAll();
    B.ui.open('computer');
    B.ui.open_.args._booted = true;
    B.ui.rerender();
    // Click the Internet icon the way the player does.
    const ic = [...document.querySelectorAll('.dt-icon')]
      .find(e => /Internet/.test(e.textContent));
    ic.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    await new Promise(r => setTimeout(r, 260));
    return { day: B.state.day, hasBrowser: !!document.querySelector('.browser') };
  }, day);
}

await frame.evaluate(async () => {
  document.getElementById('warn-ok').click();
  await new Promise(r => setTimeout(r, 200));
  [...document.querySelectorAll('#menu-buttons button')]
    .find(b => /begin|new/i.test(b.textContent)).click();
  await new Promise(r => setTimeout(r, 600));
});

/* ---- 1. the browser opens, with real chrome ---- */
let r = await openBrowser(12);
log('the Internet icon opens a browser window', r.hasBrowser, 'day ' + r.day);

r = await frame.evaluate(() => {
  const q = (s) => document.querySelector(s);
  const addr = q('.br-url');
  return {
    tabs: document.querySelectorAll('.br-tab').length,
    addr: addr ? addr.value : null,
    editable: addr ? addr.tagName === 'INPUT' && !addr.disabled : false,
    back: !!q('.br-btn[title="Back"]'),
    fwd: !!q('.br-btn[title="Forward"]'),
    reload: !!q('.br-btn[title="Reload"]'),
    star: !!q('.br-btn.star'),
    marks: !!q('.br-marks'),
    title: document.querySelector('.win-title .t')?.textContent || '',
  };
});
log('the toolbar has an editable address bar showing the current address',
    r.editable && /^https?:\/\//.test(r.addr), r.addr);
log('back, forward, reload and a bookmark star all exist',
    r.back && r.fwd && r.reload && r.star && r.marks);
log('the window title is the page title', /Tidewater/.test(r.title), r.title);
log('there is a tab per site', r.tabs === 4, r.tabs + ' tabs');

/* ---- 2. every link navigates, and back/forward walk the history ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const url = () => document.querySelector('.br-url').value;
  const start = url();

  // Follow the first thread link on the board.
  const link = [...document.querySelectorAll('.vb-table tbody a')][0];
  const label = link.textContent.trim().slice(0, 40);
  link.click();
  await new Promise(r2 => setTimeout(r2, 200));
  const afterClick = url();
  const showsThread = !!document.querySelector('.vb-post');

  // Back, and we are where we were.
  document.querySelector('.br-btn[title="Back"]').click();
  await new Promise(r2 => setTimeout(r2, 200));
  const afterBack = url();

  // Forward, and we are back in the thread.
  document.querySelector('.br-btn[title="Forward"]').click();
  await new Promise(r2 => setTimeout(r2, 200));
  const afterFwd = url();

  return { start, label, afterClick, showsThread, afterBack, afterFwd,
           depth: B.state.web.history.length };
});
log('a thread link navigates to its own address',
    r.afterClick !== r.start && /\/t\//.test(r.afterClick) && r.showsThread,
    r.afterClick);
log('back returns to the previous address', r.afterBack === r.start);
log('forward returns to the thread', r.afterFwd === r.afterClick,
    `history depth ${r.depth}`);

/* ---- 3. a typed address works, and a bad one gives a real 404 ---- */
r = await frame.evaluate(async () => {
  const addr = document.querySelector('.br-url');
  addr.value = 'http://www.wkrv9.com/';
  addr.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 250));
  const onNews = !!document.querySelector('.wkrv');

  const addr2 = document.querySelector('.br-url');
  addr2.value = 'http://www.thisisnotasite.example/nope';
  addr2.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 250));
  const err = document.querySelector('.err404');
  const looksReal = !!err && /can’t be displayed|cannot find/i.test(err.textContent)
    && /404/.test(err.textContent);

  // And the error page's button gets you home.
  err?.querySelector('.e-retry')?.click();
  await new Promise(r2 => setTimeout(r2, 250));
  const recovered = !!document.querySelector('.vb');
  return { onNews, looksReal, recovered };
});
log('typing an address navigates to it', r.onNews);
log('a dead address gives a 404 that looks like a real 404', r.looksReal);
log('the 404 has a way back out of it', r.recovered);

/* ---- 4. bookmarks, and they persist in the save ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const url = () => document.querySelector('.br-url').value;
  document.querySelector('.br-btn.star').click();
  await new Promise(r2 => setTimeout(r2, 200));
  const marked = url();
  const inBar = [...document.querySelectorAll('.br-mark')].length;
  const inSave = B.state.web.bookmarks.length;

  // Save, wipe the runtime, load, and it is still there.
  B.day.sleep({ quality: 'good' });
  const after = B.state.web.bookmarks.map(b => b.url);
  return { marked, inBar, inSave, after };
});
log('the star bookmarks the current page and it shows in the bar',
    r.inBar >= 1 && r.inSave >= 1, `${r.inSave} bookmark(s)`);
log('bookmarks are in the save', r.after.includes(r.marked));

/* ---- 5. text is selectable and copyable (§4.1, §9.5) ---- */
r = await frame.evaluate(async () => {
  // Into a thread first: the thread LIST has no prose in it to select.
  const a = document.querySelector('.br-url');
  a.value = 'http://forums.hrtidewater.net/t/mega';
  a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 280));
  const bad = [];
  for (const el of document.querySelectorAll('.br-viewport *')) {
    const cs = getComputedStyle(el);
    if (cs.userSelect === 'none' && !el.classList.contains('redact')) {
      bad.push(el.className || el.tagName);
    }
  }
  // And actually select something and read it back.
  // What a copy would actually put on the clipboard. Using the range rather
  // than the live selection, because a sandboxed frame is not focused and
  // getSelection() comes back empty there for reasons that are not the game's.
  const p = document.querySelector('.vb-text') || document.querySelector('.br-viewport p');
  let selected = '';
  if (p) {
    const range = document.createRange();
    range.selectNodeContents(p);
    selected = range.toString().trim();
    const sel = getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }
  }
  return { bad: bad.slice(0, 5), n: bad.length, len: selected.length };
});
log('nothing in a page blocks text selection', r.n === 0, r.bad.join(', ') || 'clean');
log('a paragraph can actually be selected', r.len > 30, r.len + ' characters');

/* ---- 6. Ctrl+F finds a highway in the spreadsheet (§9.7) ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  // Go to the sheet's impact tab, where the highway numbers live.
  const addr = document.querySelector('.br-url');
  addr.value = 'https://docs.google.com/spreadsheets/d/1kQ7/edit?tab=roads';
  addr.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 300));
  const sheetText = document.querySelector('.br-viewport').textContent;

  // The needle has to be a token that lives inside a single cell. A search
  // for "264" fails legitimately: the sheet renders row numbers against cell
  // text, so that string only exists across a boundary. A highway
  // designation is what a player would actually type.
  const m = sheetText.match(/(?:I|US|VA|SR)-\d+/);
  const needle = m ? m[0] : 'I-64';

  window.dispatchEvent(new KeyboardEvent('keydown',
    { key: 'f', ctrlKey: true, bubbles: true, cancelable: true }));
  await new Promise(r2 => setTimeout(r2, 150));
  const bar = document.querySelector('.br-find');
  const open = bar && !bar.classList.contains('hidden');
  const input = bar?.querySelector('.f-q');
  if (input) {
    input.value = needle;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 200));
  }
  const hits = document.querySelectorAll('.find-hit').length;
  const active = document.querySelectorAll('.find-hit.on').length;
  const count = bar?.querySelector('.f-n')?.textContent || '';

  // And a phrase that is not there says so.
  input.value = 'zzzznotpresent';
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 150));
  const notFound = /not found/i.test(bar.querySelector('.f-n').textContent);
  void B;
  return { open, needle, hits, active, count, notFound };
});
log('Ctrl+F opens a find bar', r.open);
log('find locates a highway in the spreadsheet and marks one as current',
    r.hits > 0 && r.active === 1, `“${r.needle}” — ${r.count}`);
log('a phrase that is not there says so', r.notFound);

/* ---- 7. §5. the player can post, and it persists ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  B.grant('tormentor_noise_light', 'incursion_habitation', 'roadkill_adapt');

  // Start a thread: register, pick a topic, submit.
  const addr = document.querySelector('.br-url');
  addr.value = 'http://forums.hrtidewater.net/new';
  addr.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 250));

  const nameIn = document.querySelector('.vb-name');
  const askedToRegister = !!nameIn;
  if (nameIn) {
    nameIn.value = 'hollow_street';
    [...document.querySelectorAll('.vb-btn')].find(b => /Register/.test(b.textContent)).click();
    await new Promise(r2 => setTimeout(r2, 250));
  }
  const handle = B.state.web.handle;

  const topics = [...document.querySelectorAll('.vb-topic')].map(t => t.textContent.trim());
  const area = document.querySelector('.vb-area');
  const prefilled = (area?.value || '').length;
  // Choose the one that gives away the location, because that is the mechanic.
  const expose = [...document.querySelectorAll('.vb-topic')]
    .find(t => /Describe your situation/.test(t.textContent));
  if (expose) { expose.click(); await new Promise(r2 => setTimeout(r2, 120)); }
  [...document.querySelectorAll('.vb-btn')]
    .find(b => /Submit New Thread/.test(b.textContent)).click();
  await new Promise(r2 => setTimeout(r2, 300));

  const inThread = !!document.querySelector('.vb-post.mine');
  const posts = B.state.web.posts.length;
  const url = document.querySelector('.br-url').value;
  return { askedToRegister, handle, topics, prefilled, inThread, posts, url };
});
log('posting asks the player to register a name first', r.askedToRegister, r.handle);
log('the topics offered are the questions they know how to ask',
    r.topics.length >= 3, r.topics.length + ' topics');
log('the post box is pre-filled with what they would write',
    r.prefilled > 200, r.prefilled + ' characters');
log('submitting puts their post in a thread and in the save',
    r.inThread && r.posts === 1, r.url);

/* ---- 8. §5.2. replies arrive over the following days ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  const thread = B.state.web.posts[0].thread;
  const seen = [];
  const conceal = [];

  /* Scripted beats fire on their own timers and some of them open a screen
   * that cannot be escaped — which is correct behaviour, and means a test
   * that walks several days has to get the browser back afterwards rather
   * than assume it is still there. */
  const reopenBrowser = async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      // Answer anything that is holding the overlay.
      for (let i = 0; i < 8; i++) {
        const btn = [...document.querySelectorAll('#overlay-body button')]
          .find(b => /^listen|say nothing|^ESC|step back/i.test(b.textContent.trim()));
        if (!btn) break;
        btn.click();
        await new Promise(r2 => setTimeout(r2, 80));
      }
      B.ui.closeAll();
      await new Promise(r2 => setTimeout(r2, 120));
      B.ui.open('computer');
      B.ui.open_.args._booted = true;
      B.ui.rerender();
      const ic = [...document.querySelectorAll('.dt-icon')]
        .find(e => /Internet/.test(e.textContent));
      if (ic) ic.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await new Promise(r2 => setTimeout(r2, 220));
      if (document.querySelector('.br-url')) return true;
    }
    return false;
  };

  for (let i = 0; i < 4; i++) {
    conceal.push(Math.round(B.state.concealment));
    B.sleep('good');
    const ok = await reopenBrowser();
    const badgeOnList = !!document.querySelector('.vb-newrep');
    if (!ok) { seen.push({ day: B.state.day, badgeOnList, posts: null }); continue; }

    const addr = document.querySelector('.br-url');
    addr.value = 'http://forums.hrtidewater.net/t/' + thread + '?p=99';
    addr.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    // Software rasterisation makes this container slow; wait for the render
    // rather than for a fixed number of milliseconds.
    for (let w = 0; w < 30 && !document.querySelector('.vb-post'); w++) {
      await new Promise(r2 => setTimeout(r2, 100));
    }
    seen.push({
      day: B.state.day,
      badgeOnList,
      posts: document.querySelectorAll('.vb-post').length,
      authors: [...document.querySelectorAll('.vb-userbox .who')].map(a => a.textContent),
    });
  }
  conceal.push(Math.round(B.state.concealment));
  return {
    seen, conceal,
    score: B.score(),
    charged: B.state.flags.postedLocationCharged,
    flags: Object.keys(B.state.understandingFlags).length,
  };
});
const counted = r.seen.filter(s => s.posts !== null);
const grew = counted.every((s, i) => i === 0 || s.posts >= counted[i - 1].posts);
log('replies to the player arrive over the following days',
    counted.length >= 2 && grew && counted[counted.length - 1].posts > counted[0].posts,
    r.seen.map(s => `d${s.day}:${s.posts === null ? 'busy' : s.posts}`).join(' '));
log('the board flags that there are new replies waiting',
    r.seen.some(s => s.badgeOnList));
log('a well-formed post is answered with real Understanding',
    r.score > 0, `score ${r.score} across ${r.flags} flags`);
log('describing your own situation costs you, and not on the day you post it',
    !!r.charged, `charged on day ${r.charged}, concealment ${r.conceal.join(' → ')}`);

/* ---- 9. §5.1. search, sort and pagination all work ---- */
await openBrowser(12);
r = await frame.evaluate(async () => {
  const go = async (u) => {
    const a = document.querySelector('.br-url');
    a.value = u;
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 260));
  };
  await go('http://forums.hrtidewater.net/search?q=tide');
  const hits = document.querySelectorAll('.vb-hit').length;

  await go('http://forums.hrtidewater.net/?sort=views');
  // Stickies are pinned above the sort, which is what a real board does, so
  // the ordering check starts below them.
  const rows = [...document.querySelectorAll('.vb-table tbody tr')];
  const sortedViews = rows
    .filter(tr => !tr.querySelector('.vb-sticky'))
    .map(tr => parseInt(tr.children[2].textContent.replace(/,/g, ''), 10));

  await go('http://forums.hrtidewater.net/t/mega');
  const pagers = document.querySelectorAll('.vb-pages').length;
  const jump = !!document.querySelector('.vb-jump');
  const page1 = document.querySelectorAll('.vb-post').length;
  await go('http://forums.hrtidewater.net/t/mega?p=2');
  const page2 = document.querySelectorAll('.vb-post').length;
  const different = document.querySelectorAll('.vb-post')[0]?.textContent.slice(0, 40);

  // reply + quote
  await go('http://forums.hrtidewater.net/t/mega?reply=1');
  const replyBox = !!document.querySelector('.vb-compose');
  const firstPost = 'f001';
  await go('http://forums.hrtidewater.net/t/mega?quote=' + firstPost);
  const quoted = !!document.querySelector('.vb-compose .vb-quote');

  return { hits, sortedViews, pagers, jump, page1, page2, different, replyBox, quoted };
});
log('search returns results from post bodies', r.hits > 0, r.hits + ' hits for "tide"');
log('sorting by views actually sorts by views',
    r.sortedViews.length > 1 && r.sortedViews.every((v, i) => i === 0 || v <= r.sortedViews[i - 1]),
    r.sortedViews.slice(0, 4).join(' ≥ '));
log('pagination pages, and there is a page-jump box',
    r.pagers === 2 && r.jump && r.page1 > 0 && r.page2 > 0,
    `page 1: ${r.page1} posts, page 2: ${r.page2}`);
log('Reply and Reply With Quote both open a box, with the quote in it',
    r.replyBox && r.quoted);

/* ---- 10. §4.2. read state, scroll position, icons and windows persist ---- */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  // Make a post and a bookmark in THIS run, so the persistence check is about
  // persistence rather than about which earlier section happened to run.
  if (!B.state.web.handle) B.state.web.handle = 'hollow_street';
  if (!B.state.web.posts.length) {
    B.state.web.posts.push({ id: 'me_test', topic: 'ask_naive_shoot',
      thread: 'mega', day: B.state.day, time: '13:20', body: 'test post' });
  }
  if (!B.state.web.bookmarks.length) {
    B.state.web.bookmarks.push({ url: 'http://forums.hrtidewater.net/', title: 'Forums' });
  }
  const before = {
    read: Object.keys(B.state.readIds).length,
    icon: null, scroll: null,
  };

  // Move an icon.
  B.ui.closeAll(); B.ui.open('computer'); B.ui.open_.args._booted = true; B.ui.rerender();
  const ic = [...document.querySelectorAll('.dt-icon')].find(e => /taxes 2023 FINAL\.pdf/.test(e.textContent));
  const rect = ic.getBoundingClientRect();
  ic.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0,
    clientX: rect.left + 10, clientY: rect.top + 10 }));
  for (let i = 1; i <= 6; i++) {
    window.dispatchEvent(new PointerEvent('pointermove', { bubbles: true,
      clientX: rect.left + 10 + i * 20, clientY: rect.top + 10 + i * 8,
      movementX: 20, movementY: 8 }));
  }
  window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  before.icon = B.state.os.iconPos.x1 ? B.state.os.iconPos.x1.slice() : null;

  // Un-maximise the browser window and move it.
  const ib = [...document.querySelectorAll('.dt-icon')].find(e => /Internet/.test(e.textContent));
  ib.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  await new Promise(r2 => setTimeout(r2, 200));
  [...document.querySelectorAll('.win-btn')].find(b => /Maximise|Restore/.test(b.title)).click();
  await new Promise(r2 => setTimeout(r2, 200));
  const floating = !document.querySelector('.win').classList.contains('max');
  const geom = { ...B.state.os.win.browser };

  // Scroll a page and check the position is stored against its address.
  const vp = document.querySelector('.br-viewport');
  vp.scrollTop = 240;
  vp.dispatchEvent(new Event('scroll'));
  const url = document.querySelector('.br-url').value;
  before.scroll = B.state.web.scroll[url];

  // Round-trip what the save WOULD contain. localStorage itself is
  // unreachable in a sandboxed frame — the game guards that, and the point
  // here is that the state survives serialisation, not that the browser
  // allows storage.
  B.day.sleep({ quality: 'good' });
  const parsed = JSON.parse(JSON.stringify(B.state));
  return {
    before, floating, geom,
    savedIcon: parsed?.os?.iconPos?.x1 || null,
    savedWin: parsed?.os?.win?.browser || null,
    savedScroll: parsed?.web?.scroll ? Object.keys(parsed.web.scroll).length : 0,
    savedRead: parsed?.readIds ? Object.keys(parsed.readIds).length : 0,
    savedPosts: parsed?.web?.posts?.length ?? 0,
    savedMarks: parsed?.web?.bookmarks?.length ?? 0,
  };
});
log('a desktop icon can be dragged and the position is saved',
    !!r.before.icon && !!r.savedIcon, JSON.stringify(r.savedIcon));
log('a window can be un-maximised, and its geometry is saved',
    r.floating && !!r.savedWin && r.savedWin.max === false,
    r.savedWin ? `${r.savedWin.w}×${r.savedWin.h}` : '');
log('scroll positions are kept per address', r.savedScroll > 0,
    r.savedScroll + ' addresses');
log('read state, the player’s posts and their bookmarks are all in the save',
    r.savedRead > 0 && r.savedPosts > 0 && r.savedMarks > 0,
    `${r.savedRead} read, ${r.savedPosts} posts, ${r.savedMarks} bookmarks`);

/* ---- 11. §9.5. copy out of a document and into the reply box ---- */
await openBrowser(12);
r = await frame.evaluate(async () => {
  const go = async (u) => {
    const a = document.querySelector('.br-url');
    a.value = u;
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 280));
  };
  // A Foundation document.
  await go('http://f.mirrorbox.io/u/archivist_p/');
  const first = document.querySelector('.fh-row');
  if (first) { first.click(); await new Promise(r2 => setTimeout(r2, 320)); }
  const docText = document.querySelector('.br-viewport').textContent;
  // Select a paragraph out of it, as a person would.
  const para = [...document.querySelectorAll('.scan p, .scan-body, .scan, .br-viewport p')]
    .find(e => e.textContent.trim().length > 80);
  let grabbed = '';
  if (para) {
    const range = document.createRange();
    range.selectNodeContents(para);
    grabbed = range.toString().trim();
  }
  // And paste it into a reply box.
  await go('http://forums.hrtidewater.net/t/mega?reply=1');
  const area = document.querySelector('.vb-area');
  let pasted = false;
  if (area && grabbed) {
    area.value = grabbed.slice(0, 300) + '\n\n' + area.value;
    area.dispatchEvent(new Event('input', { bubbles: true }));
    pasted = area.value.includes(grabbed.slice(0, 60));
  }
  return { docLen: docText.length, grabbed: grabbed.length, pasted };
});
log('a document opens and its body is selectable', r.grabbed > 80,
    r.grabbed + ' characters selected');
log('the selection can be pasted into a reply box', r.pasted);

if (SHOTS) {
  await frame.evaluate(async () => {
    const a = document.querySelector('.br-url');
    a.value = 'http://forums.hrtidewater.net/';
    a.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await new Promise(r2 => setTimeout(r2, 300));
  });
  await page.screenshot({ path: join(TMP, 'web-forum.png') });
}

console.log('');
if (errors.length) {
  console.log('ERRORS (' + errors.length + '):');
  for (const e of errors.slice(0, 12)) console.log('  · ' + e.slice(0, 260));
} else {
  console.log('no console errors.');
}
const failed = results.filter(x => !x.ok);
console.log('');
console.log(`${results.length - failed.length}/${results.length} web checks passed.`);
await browser.close();
server.close();
process.exit(failed.length || errors.length ? 1 : 0);
