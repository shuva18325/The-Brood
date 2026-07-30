/**
 * chaincheck.mjs — the red link chain, end to end.
 *
 *   forum thread → mirror site → red link → address revealed
 *   → mail arrives the next day → red link in the mail → the sentence
 *   → the translator turns the sentence into English
 *
 * Every step has to work from the player's side: a real click on a real
 * element, not a call into a module.
 *
 *   node tools/chaincheck.mjs
 */

import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TMP = join(ROOT, '.shot');
await mkdir(TMP, { recursive: true });

let pass = 0, fail = 0;
function log(name, ok, note = '') {
  if (ok) { pass++; console.log(`  ok   ${name}${note ? '  — ' + note : ''}`); }
  else { fail++; console.log(`  FAIL  ${name}${note ? '  — ' + note : ''}`); }
}

const inner = await readFile(join(ROOT, 'dist/the-brood.html'), 'utf8');
await writeFile(join(TMP, 'chain.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><style>body{margin:0}</style></head>
<body>\n${inner}\n</body></html>`);

const server = createServer(async (req, res) => {
  const name = req.url === '/' ? '/chain.html' : req.url.split('?')[0];
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
const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`http://localhost:${server.address().port}/`, { waitUntil: 'load' });
await page.waitForFunction(() => !!window.BROOD, null, { timeout: 40000 });

const frame = page;

await frame.evaluate(async () => {
  document.getElementById('warn-ok').click();
  await new Promise(r => setTimeout(r, 200));
  [...document.querySelectorAll('#menu-buttons button')]
    .find(b => /begin|new/i.test(b.textContent)).click();
  await new Promise(r => setTimeout(r, 600));
});

/** Put the game on a given day with the desktop showing. */
async function desktop(day, fresh = false) {
  return frame.evaluate(async ([d, f]) => {
    const B = window.BROOD;
    if (f) { B.reset(); B.startNew(); }
    while (B.state.day < d && !B.state.ended) B.sleep('good');
    B.ui.closeAll();
    B.ui.open('computer');
    B.ui.open_.args._booted = true;
    B.ui.rerender();
    await new Promise(r => setTimeout(r, 120));
    return B.state.day;
  }, [day, fresh]);
}

/** Double-click a desktop icon by its label. */
async function openIcon(re) {
  await frame.evaluate((src) => {
    const rx = new RegExp(src);
    const ic = [...document.querySelectorAll('.dt-icon')]
      .find(e => rx.test(e.textContent));
    if (!ic) throw new Error('no icon matching ' + src);
    ic.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  }, re.source);
  await frame.waitForTimeout(200);
}

/* ---- 1. the two new threads are on the board ---- */
let day = await desktop(13, true);
await frame.evaluate(() => {
  window.BROOD.state.web.history = ['http://forums.hrtidewater.net/'];
  window.BROOD.state.web.hIndex = 0;
});
await openIcon(/Internet/);
await frame.waitForSelector('.br-viewport', { timeout: 15000 });

let r = await frame.evaluate(() => [...document.querySelectorAll('.vb-table td a')]
  .map(a => a.textContent));
log('the mirror thread is on the board by day 13',
    r.some(t => /chinese mirror/i.test(t)), 'day ' + day);
log('the historians thread is on the board by day 13',
    r.some(t => /ANE list/i.test(t)),
    r.find(t => /ANE list/i.test(t)) || r.join(' | ').slice(0, 90));

/* ---- 2. the historians say the things they have to say ---- */
await frame.evaluate(() => window.BROOD.ui.rerender());
await frame.evaluate(() => {
  const a = [...document.querySelectorAll('.vb-table td a')].find(x => /ANE list/i.test(x.textContent));
  a.click();
});
await frame.waitForTimeout(250);
r = await frame.evaluate(() => document.querySelector('.br-viewport').textContent);
log('the philologist objects to the word itself', /not a Middle Persian word/.test(r));
log('the mistranslation is stated plainly',
    /does not say he cannot rise/.test(r));
log('the 1897 plate is called what it is',
    /Victorian crown/.test(r));
log('and neither of them stops believing the documents are junk',
    /grain receipts are accurate/.test(r));

/* ---- 3. the pasted address in the mirror thread is a link ---- */
await frame.evaluate(() => {
  window.BROOD.state.web.history = ['http://forums.hrtidewater.net/t/mirror'];
  window.BROOD.state.web.hIndex = 0;
  window.BROOD.ui.rerender();
});
await frame.waitForTimeout(250);
r = await frame.evaluate(() => {
  const a = [...document.querySelectorAll('.vb-url')];
  return { n: a.length, first: a[0] ? a[0].textContent : '' };
});
log('the address pasted in the thread renders as a link',
    r.n >= 1 && /wlaq-jiance/.test(r.first), r.first);

/* ---- 4. clicking it navigates to the mirror ---- */
await frame.evaluate(() => document.querySelector('.vb-url').click());
await frame.waitForSelector('.sketchy', { timeout: 15000 });
r = await frame.evaluate(() => ({
  addr: document.querySelector('.br-url').value,
  title: document.querySelector('.win-title .t').textContent,
  ads: document.querySelectorAll('.sk-ad').length,
  counter: document.querySelectorAll('.sk-count i').length,
  tabs: document.querySelectorAll('.br-tab').length,
}));
log('it navigates to the mirror site', /wlaq-jiance\.com\.cn/.test(r.addr), r.addr);
log('the mirror has its own page title', /检测/.test(r.title), r.title);
log('the page furniture is there', r.ads >= 1 && r.counter === 7,
    `${r.ads} ads, ${r.counter}-digit counter`);
log('and it gets a tab only while you are on it', r.tabs === 5, r.tabs + ' tabs');

/* ---- 5. the red link, and what it does ---- */
r = await frame.evaluate(() => {
  const a = document.querySelector('.sk-red');
  const links = [...document.querySelectorAll('.sketchy a')];
  const red = links.filter(x => getComputedStyle(x).color === 'rgb(204, 0, 0)');
  return { has: !!a, colour: a ? getComputedStyle(a).color : '',
           all: links.length, red: red.length };
});
log('there is a red contact link', r.has && r.colour === 'rgb(204, 0, 0)', r.colour);
log('every other link on the site is exactly the same red',
    r.all > 3 && r.red === r.all,
    `${r.red}/${r.all} — the game does not colour the dangerous one differently`);

await frame.evaluate(() => document.querySelector('.sk-red').click());
await frame.waitForTimeout(120);
r = await frame.evaluate(() => ({
  mailto: document.querySelector('.sk-mailto')?.textContent || '',
  flag: window.BROOD.state.flags.redLink,
  day: window.BROOD.state.flags.redLinkDay,
}));
log('clicking it reveals an address and nothing else happens',
    /zw@wlaq-jiance\.com\.cn/.test(r.mailto) && r.flag === true, r.mailto.trim());
log('the day it was clicked is recorded', r.day === 13, 'day ' + r.day);

/* ---- 6. the reply is not there the same day, and is the next ---- */
async function inboxSenders() {
  await frame.evaluate(() => {
    const B = window.BROOD;
    if (B.ui.openName !== 'computer') {
      B.ui.closeAll(); B.ui.open('computer'); B.ui.open_.args._booted = true;
    }
    B.ui.rerender();
  });
  await openIcon(/^Mail/);
  return frame.evaluate(() =>
    [...document.querySelectorAll('.mail-item .from')].map(e => e.textContent));
}
let froms = await inboxSenders();
log('the reply has not arrived on the day the link was clicked',
    !froms.some(f => /wlaq-jiance/.test(f)), froms.length + ' messages');

/* Sleeping wakes the day script, which closes overlays on a timer of its
 * own — so let that settle before reopening anything, or the test ends up
 * clicking DOM that has already been torn down. */
await frame.evaluate(() => { window.BROOD.sleep('good'); });
await frame.waitForTimeout(900);
await frame.evaluate(async () => {
  const B = window.BROOD;
  B.ui.closeAll(); B.ui.open('computer');
  B.ui.open_.args._booted = true; B.ui.rerender();
  await new Promise(r => setTimeout(r, 120));
});
froms = await inboxSenders();
log('it arrives the following day',
    froms.some(f => /zw@wlaq-jiance\.com\.cn/.test(f)),
    froms.filter(f => /wlaq/.test(f)).join('') || '(absent)');

/* ---- 7. the red link in the mail, and the sentence behind it ---- */

/**
 * Everything from here happens inside single evaluates that re-open the
 * screen first. The day script closes overlays on a timer of its own and a
 * round trip to this process can take a second on a software renderer, so
 * anything that spans two evaluates is racing it.
 */
async function inApp(kind, iconRe, body, text = '') {
  return frame.evaluate(async ([k, rx, src, TEXT]) => {
    const B = window.BROOD;
    const settle = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 140)));
    /* The day script closes overlays on timers of its own, so re-assert the
     * screen after every settle rather than once at the top — and only touch
     * an icon from a render that has actually landed, because the handler on
     * a stale icon closes over a stale args object. */
    for (let attempt = 0; attempt < 8; attempt++) {
      if (B.ui.openName !== 'computer') {
        B.ui.closeAll(); B.ui.open('computer'); B.ui.open_.args._booted = true;
        B.ui.rerender();
        await settle();
        continue;
      }
      const args = B.ui.open_.args;
      if ((args.wins || []).some(w => w.kind === k) && document.querySelector('.win-body')) {
        return new Function('return (' + src + ')')()();
      }
      const ic = [...document.querySelectorAll('.dt-icon')]
        .find(e => new RegExp(rx).test(e.textContent));
      if (!ic) { B.ui.rerender(); await settle(); continue; }
      ic.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      await settle();
    }
    return { error: 'could not keep ' + k + ' on screen' };
  }, [kind, iconRe.source, body.toString().replace(/\bTEXT\b/g, JSON.stringify(text)), text]);
}
const withMail = (body) => inApp('mail', /^Mail/, body);

r = await withMail(() => {
  const row = [...document.querySelectorAll('.mail-item')]
    .find(e => /wlaq-jiance/.test(e.textContent));
  if (row) row.click();
  const a = document.querySelector('.mail-body a.red');
  return { has: !!a, colour: a ? getComputedStyle(a).color : '',
           text: a ? a.textContent : '',
           subject: document.querySelector('.mail-read h2')?.textContent || '(none)' };
});
log('the message carries a red link', r.has && r.colour === 'rgb(204, 0, 0)',
    r.has ? r.text : 'selected: ' + r.subject);

const before = await frame.evaluate(() => window.BROOD.state.concealment);
r = await withMail(() => {
  const row = [...document.querySelectorAll('.mail-item')]
    .find(e => /wlaq-jiance/.test(e.textContent));
  if (row) row.click();
  const a = document.querySelector('.mail-body a.red');
  if (a) a.click();
  return {
    line: document.querySelector('.red-line')?.textContent || '',
    screen: window.BROOD.ui.openName,
    after: window.BROOD.state.concealment,
  };
});
log('behind it is one sentence in Chinese',
    r.line === '你对此无能为力。你们都将终生受苦。', r.line);
log('opening it does NOT end the game', r.screen !== 'ending', 'screen: ' + r.screen);
// `state.concealment` is how much cover is LEFT, so a charge spends it down.
log('it costs concealment, silently — and nothing on screen says so',
    r.after < before,
    `${(+before).toFixed(1)} → ${(+r.after).toFixed(1)} (postedLocation, 20 points)`);

/* ---- 8. the translator ---- */

async function tr(text) {
  const out = await inApp('trans', /LingoDesk/, () => {
    const ta = document.querySelector('.trans-in');
    if (!ta) return { error: 'no translator window' };
    ta.value = TEXT;
    document.querySelector('.trans-go').click();
    return { text: document.querySelector('.trans-out').textContent };
  }, text);
  return out.error ? '(' + out.error + ')' : out.text;
}

r = await tr('你对此无能为力。你们都将终生受苦。');
log('the translator is on the desktop and translates the sentence',
    /nothing you can do/i.test(r) && /suffer/i.test(r), r);
r = await tr('本站不回复任何来信。');
log('and the boilerplate above it', /does not reply/i.test(r), r);
r = await tr('我们已经看过了。你们那边比较晚。');
log('and the one line on the mirror a person wrote', /already watched/i.test(r), r);
r = await tr('蛞蝓在墙上');
log('and it visibly mangles what it was never taught', /\[/.test(r), r);

/* ---- 9. the Pathogen is in the flat from day 11, not only at the end ---- */

r = await frame.evaluate(() => {
  const B = window.BROOD;
  const P = B.CONFIG.pathogen;
  return {
    days: P.glimpses.map(g => g[0]),
    ms: P.glimpses.map(g => g[1]),
    tv: P.tvFromDay, mon: P.monitorFromDay,
    lastDay: B.CONFIG.days.last,
  };
});
log('it is scheduled across the whole of Act 2, not on the last day',
    r.days[0] === 11 && r.days[r.days.length - 1] === r.lastDay && r.days.length >= 8,
    `days ${r.days[0]}–${r.days[r.days.length - 1]}, ${r.days.length} of them`);
log('the first ones are below the threshold of certainty',
    r.ms[0] <= 66, r.ms[0] + ' ms — about two frames');
log('and the last one is not', r.ms[r.ms.length - 1] >= 1000,
    r.ms[r.ms.length - 1] + ' ms');
log('it gets longer every time, never shorter',
    r.ms.every((v, i) => i === 0 || v >= r.ms[i - 1]), r.ms.join(' → '));
log('the CRT gets it before the newer machine does',
    r.tv < r.mon, `TV day ${r.tv}, monitor day ${r.mon}`);

/* It has to actually appear, so force the dice and WATCH — polling one
 * instant races the timer the glimpse is scheduled on, and the desktop
 * re-renders on the clock so there can be several in flight. */
r = await frame.evaluate(async () => {
  const B = window.BROOD;
  while (B.state.day < 19 && !B.state.ended) B.sleep('good');
  B.CONFIG.pathogen.chance = 1;
  delete B.state.eventsFired.pathogenGlimpse_monitor;
  B.ui.closeAll(); B.ui.open('computer'); B.ui.open_.args._booted = true;
  B.ui.rerender();

  let seen = null, frames = 0;
  for (let i = 0; i < 200 && !seen; i++) {
    await new Promise(res => setTimeout(res, 40));
    const el = document.querySelector('.fx-glimpse');
    if (!el) continue;
    const cs = getComputedStyle(el);
    seen = {
      opacity: +cs.opacity,
      position: cs.position,
      animated: cs.animationName !== 'none' || cs.transitionDuration !== '0s',
      hidden: el.getAttribute('aria-hidden'),
      pointer: cs.pointerEvents,
      hasImage: /url\(/.test(cs.backgroundImage),
    };
  }
  // How long it stays: keep watching until it goes.
  if (seen) {
    const t0 = performance.now();
    while (document.querySelector('.fx-glimpse') && frames < 200) {
      await new Promise(res => setTimeout(res, 20)); frames++;
    }
    seen.ms = Math.round(performance.now() - t0);
  }
  return {
    day: B.state.day, seen,
    once: B.state.eventsFired.pathogenGlimpse_monitor,
  };
});
log('it actually comes through the monitor', !!r.seen, 'day ' + r.day);
log('at full opacity by day 19', r.seen && r.seen.opacity > 0.9,
    r.seen ? r.seen.opacity.toFixed(2) : '—');
log('it is on the display, not inside the app that summoned it',
    r.seen && r.seen.position === 'fixed', r.seen ? r.seen.position : '—');
log('with no animation, no transition, nothing that draws the eye',
    r.seen && !r.seen.animated);
log('and a screen reader is not told about it',
    r.seen && r.seen.hidden === 'true');
log('it does not eat clicks while it is up',
    r.seen && r.seen.pointer === 'none', r.seen ? r.seen.pointer : '—');
log('it stays up for about as long as the schedule says',
    r.seen && r.seen.ms >= 400 && r.seen.ms <= 1200,
    r.seen ? `${r.seen.ms} ms (scheduled 640)` : '—');
log('once per surface per day', r.once === r.day, 'marked for day ' + r.once);

r = await frame.evaluate(async () => {
  const B = window.BROOD;
  B.ui.rerender();
  let n = 0;
  for (let i = 0; i < 90; i++) {
    await new Promise(res => setTimeout(res, 40));
    n += document.querySelectorAll('.fx-glimpse').length;
  }
  return n;
});
log('and it does not come back on the next render of the same day', r === 0,
    r + ' on screen');

/* ---- 8. no console errors anywhere in that ---- */
log('no console errors', errors.length === 0, errors.join(' | '));

console.log(`\n${pass}/${pass + fail} chain checks passed.`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
