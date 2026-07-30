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
import state, { save } from '../../state.js';
import audio from '../../audio.js';
import clock from '../../systems/clock.js';
import pathogen from '../../systems/pathogen.js';
import IMG from '../imagery.js';
import { MAIL } from '../../content/mail.js';

import * as browser from '../web/browser.js';
import * as appMail from '../apps/mail.js';
import * as appTrans from '../apps/translator.js';

/* The archaeology of a real life. None of it opens. */
const ICONS = [
  { id: 'browser',  label: 'Internet',            x: 22,  y: 18,  gl: 'globe' },
  { id: 'mail',     label: 'Mail',                x: 22,  y: 108, gl: 'mail' },
  // It came bundled with a scanner in about 2011 and has never been opened.
  // It is the only way to find out what any of the Chinese says.
  { id: 'trans',    label: 'LingoDesk 3.2',       x: 22,  y: 198, gl: 'trans' },
  { id: 'x1',       label: 'taxes 2023 FINAL.pdf',x: 22,  y: 290, gl: 'pdf' },
  { id: 'x2',       label: 'taxes 2023 FINAL (2).pdf', x: 118, y: 494, gl: 'pdf' },
  { id: 'x3',       label: 'resume_current.docx', x: 22,  y: 392, gl: 'doc' },
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
    // §4.2. Where the player put it, if they moved it.
    const pos = state.os.iconPos[ic.id] || [ic.x, ic.y];
    const el = h('div', {
      class: 'dt-icon', style: `left:${pos[0]}px; top:${pos[1]}px`, tabindex: '0',
      title: ic.label,
    },
      h('img', { class: 'gl', src: glyph(ic.gl), alt: '' }),
      h('div', { class: 'lb' }, ic.label));
    const open = () => {
      if (ic.id === 'browser') openWin(ctx, ui, args, 'browser');
      else if (ic.id === 'mail') openWin(ctx, ui, args, 'mail');
      else if (ic.id === 'trans') openWin(ctx, ui, args, 'trans');
      else { audio.play('menu_move'); ui.say(NOTHING[ic.id] || NOTHING._, 4200); }
    };
    el.addEventListener('dblclick', open);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(); });
    makeDraggable(el, ic.id, desk, open);
    desk.appendChild(el);
  }

  /* --- the open window, if any --- */
  args.wins = args.wins || [];
  for (const w of args.wins) {
    if (w.min) continue;                      // it is on the taskbar instead
    desk.appendChild(windowEl(ctx, ui, args, w));
  }

  // First run: seed the history so the browser has somewhere to be.
  if (state.web.hIndex < 0) {
    state.web.history = [browser.HOME];
    state.web.hIndex = 0;
  }

  /* --- taskbar. It shows what is open, and clicking restores it. --- */
  const tb = h('div', { class: 'taskbar' });
  tb.appendChild(h('div', { class: 'tb-start' }, 'start'));
  for (const w of args.wins) {
    const label = w.kind === 'mail'
      ? `Inbox — Mail${unreadMail() ? ` (${unreadMail()})` : ''}`
      : w.kind === 'trans' ? 'LingoDesk 3.2'
      : browser.pageTitle(browser.parse(browser.current()));
    tb.appendChild(h('button', {
      class: 'tb-item' + (w.min ? '' : ' on'), type: 'button',
      onclick: () => { w.min = !w.min; audio.play('menu_move'); ui.rerender(); },
    }, label));
  }
  /* And whatever else is on the machine. It reaches the CRT two days before
   * it reaches this, because this is newer — and by the time it is here it
   * has already been in the flat for two days. See CONFIG.pathogen.
   *
   * Nothing about this is announced, and the delay is so it does not land
   * on the same frame as the window that was just opened. */
  setTimeout(() => pathogen.tryGlimpse('monitor', IMG.pathogenPlate()), 1800);

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
  const existing = args.wins.find(w => w.kind === kind);
  if (existing) { existing.min = false; ui.rerender(); return; }
  args.wins.length = 0;                       // one window at a time, like he does
  args.wins.push(
    kind === 'mail' ? { kind: 'mail', state: { folder: 'inbox', mail: null } }
    : kind === 'trans' ? { kind: 'trans', state: {} }
    // The browser has no per-site state any more: the URL is the state, and
    // it lives in the save so history and bookmarks survive a reload.
    : { kind: 'browser', find: { open: false, q: '', index: 0, count: 0 } });
  audio.play(kind === 'browser' ? 'pc_fan' : 'menu_select');
  ui.rerender();
}

/**
 * §4.1 + §8. A window with working chrome. Minimise sends it to the taskbar,
 * maximise toggles between filling the desktop and a floating rectangle the
 * player can drag, and close closes it. The geometry persists in the save.
 */
function windowEl(ctx, ui, args, w) {
  const geom = state.os.win[w.kind] || (state.os.win[w.kind] =
    { x: 60, y: 40, w: 900, h: 560, max: true });

  const el = h('div', {
    class: 'win' + (geom.max ? ' max' : ''),
    style: geom.max ? '' :
      `left:${geom.x}px; top:${geom.y}px; width:${geom.w}px; height:${geom.h}px`,
  });

  const title = w.kind === 'mail'
    ? `Inbox — Mail${unreadMail() ? ` (${unreadMail()} unread)` : ''}`
    : w.kind === 'trans' ? 'LingoDesk 3.2'
    : browser.pageTitle(browser.parse(browser.current()));

  const close = () => {
    const i = args.wins.indexOf(w);
    if (i >= 0) args.wins.splice(i, 1);
    audio.play('menu_move');
    ui.rerender();
  };
  const btn = (cls, glyphText, label, act) => h('button', {
    class: 'win-btn ' + cls, type: 'button', title: label, 'aria-label': label,
    onclick: (e) => { e.stopPropagation(); act(); },
  }, glyphText);

  const bar = h('div', { class: 'win-title' },
    h('img', {
      src: glyph(w.kind === 'mail' ? 'mail' : w.kind === 'trans' ? 'trans' : 'globe'),
      width: 14, height: 14, alt: '',
    }),
    h('div', { class: 't' }, title),
    btn('', '–', 'Minimise', () => { w.min = true; ui.rerender(); }),
    btn('', geom.max ? '❐' : '□', geom.max ? 'Restore' : 'Maximise', () => {
      geom.max = !geom.max; save(); ui.rerender();
    }),
    btn('close', '✕', 'Close', close));
  el.appendChild(bar);

  // Dragging the title bar moves the window, and un-maximises it first,
  // which is what every window manager since 1995 has done.
  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.win-btn')) return;
    if (geom.max) return;
    const sx = e.clientX - geom.x, sy = e.clientY - geom.y;
    const move = (ev) => {
      geom.x = Math.max(-geom.w + 120, Math.min(innerWidth - 80, ev.clientX - sx));
      geom.y = Math.max(0, Math.min(innerHeight - 60, ev.clientY - sy));
      el.style.left = geom.x + 'px';
      el.style.top = geom.y + 'px';
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      save();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
  bar.addEventListener('dblclick', (e) => {
    if (e.target.closest('.win-btn')) return;
    geom.max = !geom.max; save(); ui.rerender();
  });

  const body = h('div', { class: 'win-body' });
  el.appendChild(body);

  if (w.kind === 'mail') {
    const nav = { go: (patch) => { Object.assign(w.state, patch); ui.rerender(); } };
    appMail.render(body, w.state, nav, ui, ctx);
  } else if (w.kind === 'trans') {
    appTrans.render(body, w.state, null, ui);
  } else {
    browser.render(body, w, ui, ctx);
  }

  // A resize grip, bottom right, when it is not maximised.
  if (!geom.max) {
    const grip = h('div', { class: 'win-grip', title: 'Resize' });
    grip.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      const sx = e.clientX, sy = e.clientY, sw = geom.w, sh = geom.h;
      const move = (ev) => {
        geom.w = Math.max(420, sw + (ev.clientX - sx));
        geom.h = Math.max(260, sh + (ev.clientY - sy));
        el.style.width = geom.w + 'px';
        el.style.height = geom.h + 'px';
      };
      const up = () => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        save();
        ui.rerender();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
    el.appendChild(grip);
  }

  return el;
}

/** How many messages are unread, for the taskbar and the title bar (§7.3). */
function unreadMail() {
  return MAIL.filter(m => m.day <= state.day
    && !state.os.mailRead[m.id] && !state.os.mailDeleted[m.id]).length;
}

/**
 * §4.2. Dragging an icon moves it and the position is saved. A drag that
 * covers less than a few pixels is a click, and a click opens.
 */
function makeDraggable(el, id, desk, open) {
  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const rect = el.getBoundingClientRect();
    const deskRect = desk.getBoundingClientRect();
    const offX = e.clientX - rect.left, offY = e.clientY - rect.top;
    let moved = 0;
    const move = (ev) => {
      moved += Math.abs(ev.movementX || 0) + Math.abs(ev.movementY || 0);
      if (moved < 4) return;
      el.classList.add('dragging');
      const x = Math.max(4, Math.min(deskRect.width - 84, ev.clientX - deskRect.left - offX));
      const y = Math.max(4, Math.min(deskRect.height - 96, ev.clientY - deskRect.top - offY));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      state.os.iconPos[id] = [Math.round(x), Math.round(y)];
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      el.classList.remove('dragging');
      if (moved < 4) open();
      else save();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

/**
 * What happens when you open something that is not a game mechanic. It has to
 * do SOMETHING — a dead icon that silently ignores a double-click is worse
 * than no icon. So it does what his computer would do.
 */
const NOTHING = {
  x1: 'Adobe Reader is not installed. It has never been installed.',
  x2: 'Adobe Reader is not installed. It has never been installed.',
  x3: 'A resume, last modified in March. Two of the three jobs on it have closed since.',
  x4: 'A folder called "stuff". Inside it is a folder called "stuff 2".',
  x5: 'An installer for a program that is already installed.',
  x6: 'An installer for a program nobody has needed since 2015.',
  x7: 'An installer for a program that will ask him to buy it for the rest of his life.',
  x8: 'It wants to update. There is nothing to update from.',
  x9: 'The fourth of July, four years ago. It is the wallpaper, uncropped.',
  media: 'It opens, finds nothing to play, and sits there.',
  bin: 'Forty-one items. He has never emptied it. You are not going to be the one who does.',
  _: 'Nothing happens.',
};

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
    case 'trans':
      // A CD-bundled utility's icon: a globe with a character on it, in the
      // flat teal every scanner bundle used.
      g.fillStyle = '#1f7d78'; g.beginPath(); g.arc(16, 16, 12, 0, 7); g.fill();
      g.strokeStyle = '#9fd8d4'; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(16, 16, 5.5, 12, 0, 0, 7); g.stroke();
      g.fillStyle = '#ffffff';
      g.font = 'bold 13px "Noto Sans CJK SC","Microsoft YaHei",sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('文', 16, 17);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic'; break;
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
