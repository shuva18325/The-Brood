/**
 * browser.js — §4.1. A browser that works.
 *
 * The screens are where the player spends most of the game, so they have to
 * behave like real software. That means one thing above all: THE URL IS THE
 * STATE. Every page in the game has an address, every link is a navigation to
 * an address, and back and forward walk a real history stack.
 *
 * Once that is true the rest follows almost for free — bookmarks are stored
 * addresses, the back button is an index, a reload is a re-render of the
 * current address, and scroll positions are a map keyed by address.
 *
 * Addresses look like this:
 *
 *   http://www.wkrv9.com/                        the front page
 *   http://www.wkrv9.com/news/n17                one article
 *   http://forums.hrtidewater.net/                the thread list
 *   http://forums.hrtidewater.net/t/anguish       one thread
 *   http://forums.hrtidewater.net/t/anguish?p=2   page two of it
 *   http://forums.hrtidewater.net/new             the new-thread form
 *   http://forums.hrtidewater.net/search?q=tide   a search
 *
 * A URL that resolves to nothing gets a 404 that looks like a real 404,
 * because a dead link that silently does nothing is the single most
 * immersion-breaking thing a fake computer can do.
 */

import { h } from '../index.js';
import state, { save } from '../../state.js';
import audio from '../../audio.js';

import * as siteNews from './newssite.js';
import * as siteForum from './forum.js';
import * as siteSheet from './sheet.js';
import * as siteFiles from './files.js';
import * as siteSketchy from './sketchy.js';

/* ------------------------------------------------------------------ */
/* the sites, and how to reach them                                    */
/* ------------------------------------------------------------------ */

export const SITES = {
  news:  { mod: siteNews,  host: 'www.wkrv9.com',
           tab: 'WKRV 9 — Norfolk news', scheme: 'http' },
  forum: { mod: siteForum, host: 'forums.hrtidewater.net',
           tab: 'Tidewater Forums', scheme: 'http' },
  sheet: { mod: siteSheet, host: 'docs.google.com',
           tab: 'SIGHTINGS TRACKER', scheme: 'https' },
  files: { mod: siteFiles, host: 'f.mirrorbox.io',
           tab: 'mirrorbox', scheme: 'http' },
  // Two mirrors, several hops out, in a language this town does not speak.
  // They are reachable from the forum and from the file host; nothing in
  // the game ever recommends them.
  jiance: { mod: siteSketchy, host: siteSketchy.HOSTS.jiance,
            tab: 'Safety Inspection Centre', scheme: 'http', transient: true },
  pan:    { mod: siteSketchy, host: siteSketchy.HOSTS.pan,
            tab: 'July Pond', scheme: 'http', transient: true },
};

/** The four addresses in the bookmarks bar from the start. His bookmarks. */
export const HOME = 'http://forums.hrtidewater.net/';

/**
 * Split an address into { site, path, query }. Returns site `null` for
 * anything that does not resolve — which is what produces the 404.
 */
export function parse(url) {
  const m = String(url || '').match(/^(?:(https?):\/\/)?([^/?#]+)([^?#]*)(?:\?([^#]*))?/);
  if (!m) return { site: null, host: '', path: '/', query: {}, url };
  const host = m[2].toLowerCase();
  const path = m[3] || '/';
  const query = {};
  for (const kv of (m[4] || '').split('&')) {
    if (!kv) continue;
    const [k, v] = kv.split('=');
    query[decodeURIComponent(k)] = decodeURIComponent(v || '');
  }
  let site = null;
  for (const [id, S] of Object.entries(SITES)) {
    if (host === S.host || host === S.host.replace(/^www\./, '')) { site = id; break; }
  }
  return { site, host, path, query, url: String(url) };
}

/** Build an address for a site and path. The only way pages link to pages. */
export function href(site, path = '/', query = null) {
  const S = SITES[site];
  if (!S) return 'about:blank';
  let u = `${S.scheme}://${S.host}${path}`;
  if (query) {
    const q = Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
    if (q.length) u += '?' + q.join('&');
  }
  return u;
}

/* ------------------------------------------------------------------ */
/* the history stack, which lives in the save                           */
/* ------------------------------------------------------------------ */

const MAX_HISTORY = 120;

export function current() {
  const W = state.web;
  return W.history[W.hIndex] || HOME;
}

/** Navigate. Truncates anything forward of here, exactly like a browser. */
export function go(url) {
  const W = state.web;
  if (W.history[W.hIndex] === url) return;
  W.history = W.history.slice(0, W.hIndex + 1);
  W.history.push(url);
  if (W.history.length > MAX_HISTORY) W.history.shift();
  W.hIndex = W.history.length - 1;
  save();
}

export function canBack() { return state.web.hIndex > 0; }
export function canForward() { return state.web.hIndex < state.web.history.length - 1; }
export function back() { if (canBack()) { state.web.hIndex--; save(); } }
export function forward() { if (canForward()) { state.web.hIndex++; save(); } }

/* ------------------------------------------------------------------ */
/* bookmarks                                                           */
/* ------------------------------------------------------------------ */

export function isBookmarked(url) {
  return state.web.bookmarks.some(b => b.url === url);
}

export function toggleBookmark(url, title) {
  const B = state.web.bookmarks;
  const i = B.findIndex(b => b.url === url);
  if (i >= 0) B.splice(i, 1);
  else B.push({ url, title: title || url });
  save();
  return i < 0;
}

/* ------------------------------------------------------------------ */
/* the chrome                                                          */
/* ------------------------------------------------------------------ */

/**
 * Render the browser: tab strip, toolbar, bookmarks bar, viewport, find bar.
 * `win` is the window record so the find state can live with the window.
 */
export function render(host, win, ui, ctx) {
  const url = current();
  const loc = parse(url);

  const browser = h('div', { class: 'browser' });
  host.appendChild(browser);

  const navigate = (to) => {
    go(to);
    audio.play('keyclack');
    ui.rerender();
  };

  /* ---- tab strip. One tab per site, and the tab is a navigation.
   *
   * `transient` sites get no permanent tab — they are places the player
   * stumbles into from a link, not places he keeps open. A tab appears for
   * one while you are on it and goes away when you leave, which is what a
   * browser does with a page you opened once. ---- */
  const chrome = h('div', { class: 'br-chrome' });
  const tabs = h('div', { class: 'br-tabs' });
  for (const [id, S] of Object.entries(SITES)) {
    const on = id === loc.site;
    if (S.transient && !on) continue;
    tabs.appendChild(h('button', {
      class: 'br-tab' + (on ? ' on' : ''),
      type: 'button',
      title: S.mod.url || href(id),
      onclick: () => navigate(lastVisited(id) || href(id)),
    }, S.tab));
  }
  chrome.appendChild(tabs);

  /* ---- toolbar: back, forward, reload, the address, the star ---- */
  const addr = h('input', {
    class: 'br-url', type: 'text', spellcheck: 'false',
    value: url, 'aria-label': 'Address',
  });
  addr.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    let v = addr.value.trim();
    if (!v) return;
    if (!/^https?:\/\//i.test(v)) v = 'http://' + v;
    navigate(v);
  });
  // Clicking the address selects all of it, which is what browsers do.
  addr.addEventListener('focus', () => addr.select());

  const starred = isBookmarked(url);
  const bar = h('div', { class: 'br-bar' },
    h('button', {
      class: 'br-btn', type: 'button', title: 'Back',
      disabled: canBack() ? null : 'disabled',
      onclick: () => { back(); audio.play('menu_move'); ui.rerender(); },
    }, '◀'),
    h('button', {
      class: 'br-btn', type: 'button', title: 'Forward',
      disabled: canForward() ? null : 'disabled',
      onclick: () => { forward(); audio.play('menu_move'); ui.rerender(); },
    }, '▶'),
    h('button', {
      class: 'br-btn', type: 'button', title: 'Reload',
      onclick: () => { audio.play('keyclack'); ui.rerender(); },
    }, '⟳'),
    addr,
    h('button', {
      class: 'br-btn star' + (starred ? ' on' : ''), type: 'button',
      title: starred ? 'Remove bookmark' : 'Bookmark this page',
      onclick: () => {
        toggleBookmark(url, pageTitle(loc));
        audio.play('menu_select');
        ui.rerender();
      },
    }, starred ? '★' : '☆'));
  chrome.appendChild(bar);

  /* ---- bookmarks bar. His, then the player's. ---- */
  const marks = h('div', { class: 'br-marks' });
  if (!state.web.bookmarks.length) {
    marks.appendChild(h('span', { class: 'br-mark-empty' },
      'No bookmarks. ☆ adds one.'));
  }
  for (const b of state.web.bookmarks) {
    marks.appendChild(h('button', {
      class: 'br-mark' + (b.url === url ? ' on' : ''), type: 'button',
      title: b.url,
      onclick: () => navigate(b.url),
    }, b.title));
  }
  chrome.appendChild(marks);
  browser.appendChild(chrome);

  /* ---- the viewport ---- */
  const viewport = h('div', { class: 'br-viewport', tabindex: '0' });
  browser.appendChild(viewport);

  // Restore where this address was last left, and remember it on the way out.
  const key = url;
  viewport.addEventListener('scroll', () => {
    state.web.scroll[key] = viewport.scrollTop;
  }, { passive: true });

  const nav = {
    /** The only way any page changes what is on screen. */
    go: (to) => navigate(to),
    /** Build an address without navigating to it — for real href attributes. */
    href,
    /** The current address, parsed. */
    loc,
    ui, ctx,
  };

  if (!loc.site) {
    viewport.appendChild(notFound(loc, nav));
  } else {
    SITES[loc.site].mod.render(viewport, loc, nav, ui);
  }

  // Scroll restore has to happen after the page is in the DOM.
  requestAnimationFrame(() => {
    if (state.web.scroll[key]) viewport.scrollTop = state.web.scroll[key];
  });

  /* ---- find in page (§4.1) ---- */
  browser.appendChild(findBar(viewport, win, ui));

  return { browser, viewport, loc };
}

/** The most recent address visited on a given site, so a tab remembers. */
function lastVisited(site) {
  const H = state.web.history;
  for (let i = state.web.hIndex; i >= 0; i--) {
    if (parse(H[i]).site === site) return H[i];
  }
  return null;
}

/** A title for the address bar, the tab and a bookmark. */
export function pageTitle(loc) {
  if (!loc.site) return 'Problem loading page';
  const S = SITES[loc.site];
  if (S.mod.titleFor) {
    const t = S.mod.titleFor(loc);
    if (t) return t;
  }
  return S.tab;
}

/* ------------------------------------------------------------------ */
/* the 404. It has to look like a real one.                             */
/* ------------------------------------------------------------------ */

function notFound(loc, nav) {
  const el = h('div', { class: 'err404' });
  // A browser's own error page, not a styled site page — no site served this.
  el.appendChild(h('div', { class: 'e-mark' }, '⚠'));
  el.appendChild(h('h1', {}, 'This page can’t be displayed'));
  el.appendChild(h('p', {},
    'Internet Explorer cannot find the server at ',
    h('b', {}, loc.host || '(no address)'), '.'));
  el.appendChild(h('ul', {},
    h('li', {}, 'Check that the address is correct.'),
    h('li', {}, 'The site may be temporarily unavailable.'),
    h('li', {}, 'If you typed the address, check your spelling.')));
  el.appendChild(h('button', {
    class: 'e-retry', type: 'button', onclick: () => nav.go(HOME),
  }, 'Go to your home page'));
  el.appendChild(h('div', { class: 'e-code' }, 'HTTP 404 — Not Found'));
  return el;
}

/* ------------------------------------------------------------------ */
/* FIND IN PAGE (§4.1)                                                  */
/*                                                                     */
/* A player hunting the spreadsheet for a highway number needs this, and */
/* the game hides survival-critical information in that spreadsheet, so  */
/* it is closer to a correctness feature than a convenience.             */
/* ------------------------------------------------------------------ */

const MARK = 'find-hit';

function findBar(viewport, win, ui) {
  win.find = win.find || { open: false, q: '', index: 0, count: 0 };
  const F = win.find;

  const wrap = h('div', { class: 'br-find' + (F.open ? '' : ' hidden') });
  const input = h('input', {
    class: 'f-q', type: 'text', spellcheck: 'false',
    placeholder: 'Find in page', value: F.q, 'aria-label': 'Find in page',
  });
  const count = h('span', { class: 'f-n' }, '');

  const run = (step) => {
    F.q = input.value;
    const hits = highlight(viewport, F.q);
    F.count = hits.length;
    if (!hits.length) {
      count.textContent = F.q ? 'Phrase not found' : '';
      wrap.classList.toggle('none', !!F.q);
      return;
    }
    wrap.classList.remove('none');
    F.index = ((F.index + (step || 0)) % hits.length + hits.length) % hits.length;
    for (let i = 0; i < hits.length; i++) hits[i].classList.toggle('on', i === F.index);
    hits[F.index].scrollIntoView({ block: 'center' });
    count.textContent = `${F.index + 1} of ${hits.length}`;
  };

  input.addEventListener('input', () => { F.index = 0; run(0); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); run(e.shiftKey ? -1 : 1); }
    if (e.key === 'Escape') { e.preventDefault(); close(); }
  });

  const close = () => {
    F.open = false;
    clearHighlight(viewport);
    wrap.classList.add('hidden');
    viewport.focus();
  };

  wrap.appendChild(h('span', { class: 'f-lb' }, 'Find:'));
  wrap.appendChild(input);
  wrap.appendChild(h('button', { class: 'f-b', type: 'button', onclick: () => run(-1) }, '▲'));
  wrap.appendChild(h('button', { class: 'f-b', type: 'button', onclick: () => run(1) }, '▼'));
  wrap.appendChild(count);
  wrap.appendChild(h('button', { class: 'f-x', type: 'button', onclick: close }, '✕'));

  // Ctrl+F opens it. The handler lives on the viewport's window and is
  // removed with the screen, because ui.rerender rebuilds this every time.
  const onKey = (e) => {
    if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'f') return;
    if (!document.body.contains(wrap)) { window.removeEventListener('keydown', onKey); return; }
    e.preventDefault();
    F.open = true;
    wrap.classList.remove('hidden');
    input.focus();
    input.select();
    if (F.q) run(0);
  };
  window.addEventListener('keydown', onKey);

  if (F.open) requestAnimationFrame(() => { input.focus(); if (F.q) run(0); });
  return wrap;
}

function clearHighlight(root) {
  for (const m of [...root.querySelectorAll('.' + MARK)]) {
    const t = document.createTextNode(m.textContent);
    m.parentNode.replaceChild(t, m);
  }
  root.normalize();
}

/**
 * Wrap every occurrence of `q` in a span. Walks text nodes only, so it never
 * touches markup, and skips anything inside an input or a script.
 */
function highlight(root, q) {
  clearHighlight(root);
  if (!q || q.length < 2) return [];
  const needle = q.toLowerCase();
  // The constants are FILTER_ACCEPT and FILTER_REJECT. NodeFilter.ACCEPT does
  // not exist, and returning undefined from acceptNode accepts nothing at all,
  // which is a silent no-op rather than an error.
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
      const p = n.parentNode;
      if (!p || /^(SCRIPT|STYLE|INPUT|TEXTAREA)$/.test(p.nodeName)) {
        return NodeFilter.FILTER_REJECT;
      }
      return n.nodeValue.toLowerCase().includes(needle)
        ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  const targets = [];
  let n;
  while ((n = walker.nextNode())) targets.push(n);

  const hits = [];
  for (const node of targets) {
    const text = node.nodeValue;
    const frag = document.createDocumentFragment();
    let i = 0;
    for (;;) {
      const at = text.toLowerCase().indexOf(needle, i);
      if (at < 0) break;
      if (at > i) frag.appendChild(document.createTextNode(text.slice(i, at)));
      const m = document.createElement('span');
      m.className = MARK;
      m.textContent = text.slice(at, at + q.length);
      frag.appendChild(m);
      hits.push(m);
      i = at + q.length;
    }
    if (i < text.length) frag.appendChild(document.createTextNode(text.slice(i)));
    node.parentNode.replaceChild(frag, node);
  }
  return hits;
}

export default render;
