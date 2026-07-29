/**
 * computer.js — the desktop.
 *
 * A tower from around 2014 running an OS from around 2011, and it has
 * never once been cleaned up.
 *
 * Windows open with title bars, not as fullscreen takeovers, so the messy
 * desktop stays visible behind them. That matters: the wallpaper is a
 * photograph of four people at a cookout, and one of them is Ray.
 */

import { h } from '../index.js';
import { CONFIG } from '../../config.js';
import state from '../../state.js';
import audio from '../../audio.js';
import clock from '../../systems/clock.js';
import IMG from '../imagery.js';

import * as siteNews from '../web/newssite.js';
import * as siteForum from '../web/forum.js';
import * as siteSheet from '../web/sheet.js';
import * as siteFiles from '../web/files.js';
import * as appMail from '../apps/mail.js';

/* The archaeology of a real life. None of it opens. */
const ICONS = [
  { id: 'browser',  label: 'Internet',            x: 22,  y: 18,  gl: 'globe' },
  { id: 'mail',     label: 'Mail',                x: 22,  y: 108, gl: 'mail' },
  { id: 'x1',       label: 'taxes 2023 FINAL.pdf',x: 22,  y: 198, gl: 'pdf' },
  { id: 'x2',       label: 'taxes 2023 FINAL (2).pdf', x: 22, y: 300, gl: 'pdf' },
  { id: 'x3',       label: 'resume_current.docx', x: 22,  y: 402, gl: 'doc' },
  { id: 'x4',       label: 'stuff',               x: 118, y: 18,  gl: 'folder' },
  { id: 'x5',       label: 'vlc-setup.exe',       x: 118, y: 108, gl: 'exe' },
  { id: 'x6',       label: 'JavaSetup8u341.exe',  x: 118, y: 198, gl: 'exe' },
  { id: 'x7',       label: 'winrar-x64-611.exe',  x: 118, y: 290, gl: 'exe' },
  // These two sit right over the wallpaper's subject, because of course
  // they do. Nobody arranges their desktop around a photograph.
  { id: 'x8',       label: 'Slay the Spire',      x: 386, y: 236, gl: 'game' },
  { id: 'x9',       label: 'IMG_20190704_1.jpg',  x: 470, y: 300, gl: 'img' },
  { id: 'media',    label: 'Media Player',        x: 22,  y: 494, gl: 'play' },
  { id: 'bin',      label: 'Recycle Bin',         x: 118, y: 402, gl: 'bin' },
];

const SITES = {
  news:  { mod: siteNews,  title: 'WKRV 9 — Norfolk, Virginia news, weather and sports' },
  forum: { mod: siteForum, title: 'Hampton Roads Tidewater Forums' },
  sheet: { mod: siteSheet, title: 'CONFIRMED SIGHTINGS TRACKER — SOUTHEAST — Google Sheets' },
  files: { mod: siteFiles, title: 'mirrorbox — archivist_p' },
};

export function render(ctx, host, args, ui) {
  if (!state.computerOn) state.computerOn = true;

  // The machine starts booting slower around Day 8.
  const slow = state.day >= CONFIG.timing.pcBootSlowFromDay;
  if (!args._booted) {
    args._booted = true;
    audio.play('pc_boot');
    const bootMs = slow ? CONFIG.timing.pcBootMsLate : CONFIG.timing.pcBootMs;
    host.appendChild(bootScreen(slow, state.flags.uncleanShutdown));
    state.flags.uncleanShutdown = false;
    setTimeout(() => { if (ui.openName === 'computer') ui.rerender(); }, bootMs);
    return;
  }

  const desk = h('div', { class: 'desktop' });
  host.appendChild(desk);

  const bg = h('div', { class: 'desktop-bg' + (state.day >= 10 ? ' dim' : '') });
  bg.style.backgroundImage = `url(${IMG.wallpaper()})`;
  desk.appendChild(bg);

  for (const ic of ICONS) {
    const el = h('div', { class: 'dt-icon', style: `left:${ic.x}px; top:${ic.y}px`, tabindex: '0' },
      h('img', { class: 'gl', src: glyph(ic.gl), alt: '' }),
      h('div', { class: 'lb' }, ic.label));
    const open = () => {
      if (ic.id === 'browser') openWin(ctx, ui, args, 'browser');
      else if (ic.id === 'mail') openWin(ctx, ui, args, 'mail');
      else audio.play('menu_move');
    };
    el.addEventListener('dblclick', open);
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    desk.appendChild(el);
  }

  /* --- the open window, if any --- */
  args.wins = args.wins || [];
  for (const w of args.wins) {
    desk.appendChild(windowEl(ctx, ui, args, w));
  }

  /* --- taskbar --- */
  const tb = h('div', { class: 'taskbar' });
  tb.appendChild(h('div', { class: 'tb-start' }, 'start'));
  for (const w of args.wins) {
    tb.appendChild(h('div', { class: 'tb-item on', onclick: () => ui.rerender() },
      w.kind === 'mail' ? 'Mail' : (SITES[w.site]?.title || 'Internet')));
  }
  tb.appendChild(h('div', { class: 'tb-tray' },
    ...['net', 'vol', 'shield', 'usb'].map(k => h('img', { class: 'ic', src: glyph(k), alt: '' })),
    // The clock: the player's most-checked object in the game.
    h('div', { class: 'tb-clock' },
      h('b', {}, clock.label()),
      h('span', {}, 'Day ' + state.day))));
  desk.appendChild(tb);
}

function bootScreen(slow, unclean) {
  const lines = unclean
    ? ['Windows did not shut down successfully.', '', 'Launch Startup Repair (recommended)',
       'Start Windows normally', '', 'Seconds until the highlighted choice will be selected: 12', '']
    : ['Award Modular BIOS v6.00PG', 'Main Processor : AMD FX(tm)-6300', 'Memory Testing : 8388608K OK',
       '', 'Detecting IDE drives ...', slow ? 'Primary Master  : ST1000DM003  (retrying)' : 'Primary Master  : ST1000DM003',
       slow ? 'Primary Master  : ST1000DM003  (retrying)' : '', ''];
  const el = h('div', { class: 'boot' + (unclean ? ' unclean' : '') });
  el.appendChild(h('pre', { style: 'margin:0;font:inherit' }, lines.join('\n')));
  el.appendChild(h('span', { class: 'cursor' }));
  return el;
}

/* ------------------------------------------------------------------ */

function openWin(ctx, ui, args, kind) {
  args.wins = args.wins || [];
  if (args.wins.some(w => w.kind === kind)) return;
  args.wins.length = 0;                       // one window at a time, like he does
  args.wins.push(kind === 'mail'
    ? { kind: 'mail', state: { folder: 'inbox', mail: null } }
    : { kind: 'browser', site: 'forum', tabs: ['news', 'forum', 'sheet', 'files'],
        state: { news: {}, forum: {}, sheet: { tab: 'rules' }, files: {} } });
  audio.play(kind === 'mail' ? 'menu_select' : 'pc_fan');
  ui.rerender();
}

function windowEl(ctx, ui, args, w) {
  const el = h('div', { class: 'win max' });
  const title = w.kind === 'mail'
    ? 'Inbox — Mail'
    : (SITES[w.site]?.title || 'Internet');

  el.appendChild(h('div', { class: 'win-title' },
    h('img', { src: glyph(w.kind === 'mail' ? 'mail' : 'globe'), width: 14, height: 14, alt: '' }),
    h('div', { class: 't' }, title),
    h('div', { class: 'win-btn' }, '–'),
    h('div', { class: 'win-btn' }, '□'),
    h('div', {
      class: 'win-btn close', tabindex: '0',
      onclick: () => { args.wins.length = 0; ui.rerender(); },
      onkeydown: (e) => { if (e.key === 'Enter') { args.wins.length = 0; ui.rerender(); } },
    }, '✕')));

  const body = h('div', { class: 'win-body' });
  el.appendChild(body);

  if (w.kind === 'mail') {
    const nav = { go: (patch) => { Object.assign(w.state, patch); ui.rerender(); } };
    appMail.render(body, w.state, nav, ui, ctx);
    return el;
  }

  /* --- the browser --- */
  const browser = h('div', { class: 'browser' });
  body.appendChild(browser);

  const chrome = h('div', { class: 'br-chrome' });
  const tabs = h('div', { class: 'br-tabs' });
  for (const t of w.tabs) {
    tabs.appendChild(h('div', {
      class: 'br-tab' + (t === w.site ? ' on' : ''), tabindex: '0',
      onclick: () => { w.site = t; audio.play('keyclack'); ui.rerender(); },
      onkeydown: (e) => { if (e.key === 'Enter') { w.site = t; ui.rerender(); } },
    }, shortTitle(t)));
  }
  chrome.appendChild(tabs);
  chrome.appendChild(h('div', { class: 'br-bar' },
    h('div', { class: 'br-btn' }, '◀'), h('div', { class: 'br-btn' }, '▶'),
    h('div', { class: 'br-btn' }, '⟳'),
    h('div', { class: 'br-url' }, SITES[w.site].mod.url),
    h('div', { class: 'br-btn' }, '☆')));
  browser.appendChild(chrome);

  const viewport = h('div', { class: 'br-viewport' });
  browser.appendChild(viewport);

  const nav = { go: (patch) => { Object.assign(w.state[w.site], patch); ui.rerender(); } };
  SITES[w.site].mod.render(viewport, w.state[w.site], nav);

  return el;
}

function shortTitle(id) {
  return { news: 'WKRV 9 — Norfolk news', forum: 'Tidewater Forums',
    sheet: 'SIGHTINGS TRACKER', files: 'mirrorbox' }[id] || id;
}

/* ------------------------------------------------------------------ */
/* icon glyphs — drawn, cached, never loaded                            */
/* ------------------------------------------------------------------ */

const glyphCache = new Map();
function glyph(kind) {
  if (glyphCache.has(kind)) return glyphCache.get(kind);
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  const paper = () => {
    g.fillStyle = '#f4f4f2'; g.fillRect(6, 3, 20, 26);
    g.fillStyle = '#c9c9c4'; g.beginPath();
    g.moveTo(20, 3); g.lineTo(26, 9); g.lineTo(20, 9); g.closePath(); g.fill();
    g.strokeStyle = '#a8a8a2'; g.lineWidth = 1; g.strokeRect(6.5, 3.5, 19, 25);
  };
  switch (kind) {
    case 'globe':
      g.fillStyle = '#2f7fc4'; g.beginPath(); g.arc(16, 16, 12, 0, 7); g.fill();
      g.strokeStyle = '#bfe0f6'; g.lineWidth = 1.4;
      g.beginPath(); g.ellipse(16, 16, 5, 12, 0, 0, 7); g.stroke();
      g.beginPath(); g.moveTo(4, 16); g.lineTo(28, 16); g.stroke(); break;
    case 'mail':
      g.fillStyle = '#e8ecef'; g.fillRect(3, 8, 26, 17);
      g.strokeStyle = '#6d7d8c'; g.strokeRect(3.5, 8.5, 25, 16);
      g.beginPath(); g.moveTo(3, 8); g.lineTo(16, 18); g.lineTo(29, 8); g.stroke(); break;
    case 'pdf': paper(); g.fillStyle = '#b3231f'; g.fillRect(6, 18, 20, 9);
      g.fillStyle = '#fff'; g.font = 'bold 8px Arial'; g.fillText('PDF', 8, 25); break;
    case 'doc': paper(); g.fillStyle = '#2b579a'; g.fillRect(6, 18, 20, 9);
      g.fillStyle = '#fff'; g.font = 'bold 8px Arial'; g.fillText('W', 13, 25); break;
    case 'folder':
      g.fillStyle = '#e8b84b'; g.fillRect(3, 9, 26, 17);
      g.fillStyle = '#f0c86a'; g.fillRect(3, 6, 12, 4); break;
    case 'exe':
      g.fillStyle = '#c8ccd2'; g.fillRect(5, 5, 22, 22);
      g.fillStyle = '#7a828c'; g.fillRect(8, 8, 16, 6);
      g.fillStyle = '#4a90d9'; g.fillRect(8, 17, 16, 7); break;
    case 'game':
      g.fillStyle = '#2a2f38'; g.fillRect(4, 8, 24, 18);
      g.fillStyle = '#d8b45a'; g.beginPath(); g.arc(16, 17, 6, 0, 7); g.fill(); break;
    case 'img':
      g.fillStyle = '#dfe6ec'; g.fillRect(4, 6, 24, 20);
      g.fillStyle = '#6fa86f'; g.beginPath();
      g.moveTo(6, 24); g.lineTo(13, 13); g.lineTo(20, 24); g.closePath(); g.fill();
      g.fillStyle = '#e8d06a'; g.beginPath(); g.arc(22, 12, 3, 0, 7); g.fill(); break;
    case 'play':
      g.fillStyle = '#e8722a'; g.beginPath(); g.arc(16, 16, 12, 0, 7); g.fill();
      g.fillStyle = '#fff'; g.beginPath();
      g.moveTo(12, 9); g.lineTo(24, 16); g.lineTo(12, 23); g.closePath(); g.fill(); break;
    case 'bin':
      g.fillStyle = '#8d99a6'; g.fillRect(9, 8, 14, 19);
      g.fillStyle = '#6d7d8c'; g.fillRect(7, 5, 18, 4);
      // full, because nobody has ever emptied it
      g.fillStyle = '#c8b98a'; g.fillRect(11, 4, 4, 3); g.fillRect(17, 3, 5, 4); break;
    case 'net': g.fillStyle = '#dfe6ec';
      for (let i = 0; i < 4; i++) g.fillRect(4 + i * 7, 26 - i * 7, 5, 4 + i * 7); break;
    case 'vol': g.fillStyle = '#dfe6ec'; g.beginPath();
      g.moveTo(6, 12); g.lineTo(12, 12); g.lineTo(19, 5); g.lineTo(19, 27); g.lineTo(12, 20);
      g.lineTo(6, 20); g.closePath(); g.fill(); break;
    case 'shield': g.fillStyle = '#e0b93f'; g.beginPath();
      g.moveTo(16, 3); g.lineTo(27, 8); g.lineTo(27, 18); g.lineTo(16, 29);
      g.lineTo(5, 18); g.lineTo(5, 8); g.closePath(); g.fill(); break;
    default: g.fillStyle = '#c2cad2'; g.fillRect(6, 10, 20, 12);
  }
  const url = c.toDataURL('image/png');
  glyphCache.set(kind, url);
  return url;
}

export function onClose() { /* the machine stays on; that is the point */ }

export default render;
