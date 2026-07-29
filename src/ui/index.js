/**
 * ui/index.js — the 2D layer, and the freeze-and-overlay cut.
 *
 * ARCHITECTURE RULE: no live UI is ever rendered onto a 3D surface. The
 * player walks to the computer, presses E, the scene freezes, and the game
 * cuts to a fullscreen 2D interface. Esc cuts back. The cut itself is the
 * point.
 */

import { CONFIG } from '../config.js';
import state from '../state.js';
import bus from '../bus.js';
import audio from '../audio.js';
import effects from '../effects.js';
import clock from '../systems/clock.js';

import * as scrTv from './screens/tv.js';
import * as scrComputer from './screens/computer.js';
import * as scrPhone from './screens/phone.js';
import * as scrFood from './screens/food.js';
import * as scrSleep from './screens/sleep.js';
import * as scrNotes from './screens/notes.js';
import * as scrLaptop from './screens/laptop.js';
import * as scrLeave from './screens/leave.js';
import * as scrBrave from './screens/brave.js';
import * as scrEnding from './screens/ending.js';
import * as scrScene from './screens/scene.js';

const SCREENS = {
  tv: scrTv,
  computer: scrComputer,
  phone: scrPhone,
  food: scrFood,
  sleep: scrSleep,
  notes: scrNotes,
  laptop: scrLaptop,
  leave: scrLeave,
  brave: scrBrave,
  ending: scrEnding,
  scene: scrScene,
};

export class UI {
  constructor(ctx) {
    this.ctx = ctx;
    this.el = {
      hud: document.getElementById('hud'),
      prompt: document.getElementById('prompt'),
      promptText: document.getElementById('prompt-text'),
      subtitle: document.getElementById('subtitle'),
      clock: document.getElementById('clock'),
      carry: document.getElementById('carry'),
      overlay: document.getElementById('overlay'),
      body: document.getElementById('overlay-body'),
      hint: document.getElementById('overlay-hint'),
      plate: document.getElementById('plate'),
      plateText: document.getElementById('plate-text'),
      menu: document.getElementById('menu'),
      menuButtons: document.getElementById('menu-buttons'),
      menuFoot: document.getElementById('menu-foot'),
    };
    this.open_ = null;
    this.stack = [];
    this._subtitleTimer = null;
    this._closable = true;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (this.open_) { if (this._closable) this.close(); }
        else if (state.started && !state.ended) this.pause();
      }
    });
  }

  /* ---------------- HUD ---------------- */

  prompt(text) {
    if (!text) { this.el.prompt.classList.add('hidden'); return; }
    this.el.promptText.textContent = text;
    this.el.prompt.classList.remove('hidden');
  }

  /** The character's own observation. Never a hint, never a tutorial. */
  say(text, hold = CONFIG.timing.subtitleHold) {
    this.el.subtitle.textContent = effects.corruptText(text, { source: 'inner' });
    this.el.subtitle.classList.remove('hidden');
    clearTimeout(this._subtitleTimer);
    this._subtitleTimer = setTimeout(() => {
      this.el.subtitle.classList.add('hidden');
    }, hold + text.length * 18);
  }

  updateHud() {
    this.el.clock.textContent =
      `DAY ${state.day}   ${clock.label()}` + (state.hasShotgun ? '' : '');
    const carry = [];
    if (state.hasShotgun) carry.push(`shotgun · ${state.shells}`);
    if (state.hasKeys) carry.push('his keys');
    this.el.carry.textContent = carry.join('   ');
    this.el.carry.classList.toggle('hidden', carry.length === 0);
  }

  showHud(on) { this.el.hud.classList.toggle('hidden', !on); }

  /* ---------------- the cut ---------------- */

  /**
   * Freeze the 3D scene and cut to a fullscreen screen.
   * @param {string} name key in SCREENS
   * @param {object} args passed to the screen's render()
   */
  open(name, args = {}) {
    const mod = SCREENS[name];
    if (!mod) { console.warn('[ui] no screen', name); return; }

    if (this.open_) this.stack.push(this.open_);
    this.open_ = { name, args, mod };
    this._closable = args.closable !== false && mod.closable !== false;

    this.ctx.freeze(true);
    audio.play('overlay_in');
    audio.duck(0.45, 0.25);

    this.el.body.innerHTML = '';
    this.el.body.className = mod.fullBleed === false ? 'framed' : '';
    this.el.overlay.classList.remove('hidden');
    requestAnimationFrame(() => this.el.overlay.classList.add('up'));
    this.el.hint.textContent = this._closable ? 'ESC — step back' : '';
    this.showHud(false);

    mod.render(this.ctx, this.el.body, args, this);
    bus.emit('ui:open', name);
  }

  /** Re-render the current screen in place, without re-cutting. */
  rerender(args) {
    if (!this.open_) return;
    if (args) Object.assign(this.open_.args, args);
    this.el.body.innerHTML = '';
    this.el.body.className = this.open_.mod.fullBleed === false ? 'framed' : '';
    this.open_.mod.render(this.ctx, this.el.body, this.open_.args, this);
  }

  /** Replace the current screen with another, keeping the overlay up. */
  swap(name, args = {}) {
    const mod = SCREENS[name];
    if (!mod) return;
    this.open_ = { name, args, mod };
    this._closable = args.closable !== false && mod.closable !== false;
    this.el.hint.textContent = this._closable ? 'ESC — step back' : '';
    this.el.body.innerHTML = '';
    this.el.body.className = mod.fullBleed === false ? 'framed' : '';
    this.el.body.scrollTop = 0;
    mod.render(this.ctx, this.el.body, args, this);
  }

  close() {
    if (!this.open_) return;
    const closing = this.open_;
    if (closing.mod.onClose) closing.mod.onClose(this.ctx, this);

    const prev = this.stack.pop();
    if (prev) {
      this.open_ = prev;
      this.el.body.innerHTML = '';
      this.el.body.className = prev.mod.fullBleed === false ? 'framed' : '';
      this.el.body.scrollTop = 0;
      prev.mod.render(this.ctx, this.el.body, prev.args, this);
      return;
    }

    this.open_ = null;
    this.el.overlay.classList.remove('up');
    audio.play('overlay_out');
    audio.duck(0, 0.4);
    setTimeout(() => {
      if (this.open_) return;
      this.el.overlay.classList.add('hidden');
      this.el.body.innerHTML = '';
      if (!state.ended) {
        this.showHud(true);
        this.ctx.freeze(false);
      }
    }, CONFIG.timing.overlayFadeOut);
    bus.emit('ui:close', closing.name);
  }

  closeAll() {
    this.stack.length = 0;
    if (this.open_) this.close();
  }

  get isOpen() { return !!this.open_; }
  get openName() { return this.open_?.name || null; }

  /* ---------------- blackout plate ---------------- */

  plate(text = '', { hold = CONFIG.timing.plateHold } = {}) {
    return new Promise((resolve) => {
      this.el.plateText.textContent = text;
      this.el.plate.classList.remove('hidden');
      requestAnimationFrame(() => this.el.plate.classList.add('up'));
      setTimeout(() => {
        resolve();
      }, CONFIG.timing.plateFade + hold);
    });
  }

  clearPlate() {
    this.el.plate.classList.remove('up');
    setTimeout(() => this.el.plate.classList.add('hidden'), CONFIG.timing.plateFade);
  }

  /* ---------------- menu ---------------- */

  showMenu(buttons, foot = '') {
    this.el.menuButtons.innerHTML = '';
    for (const b of buttons) {
      const el = document.createElement('button');
      el.className = 'choice';
      el.innerHTML = `${b.label}${b.sub ? `<small>${b.sub}</small>` : ''}`;
      el.onclick = () => { audio.unlock(); audio.play('menu_select'); b.onClick(); };
      this.el.menuButtons.appendChild(el);
    }
    this.el.menuFoot.innerHTML = foot;
    this.el.menu.classList.remove('hidden');
    this.showHud(false);
    this.ctx.freeze(true);
  }

  hideMenu() {
    this.el.menu.classList.add('hidden');
  }

  pause() {
    this.ctx.controls.releaseLock();
    this.showMenu([
      { label: 'back to it', onClick: () => { this.hideMenu(); this.ctx.resume(); } },
      { label: 'settings', onClick: () => this.settings() },
      { label: 'save and stop', sub: 'the save is automatic anyway',
        onClick: () => { this.ctx.saveNow(); this.hideMenu(); this.ctx.resume(); } },
      { label: 'start again', sub: 'this erases the fifteen days you have',
        onClick: () => this.ctx.restart() },
    ], `Day ${state.day} · ${clock.label()}`);
  }

  /**
   * §10. Photosensitivity and volume, reachable without leaving the game.
   * prefers-reduced-motion is honoured whether or not the toggle is set.
   */
  settings() {
    this.el.menuButtons.innerHTML = '';
    const box = document.createElement('div');
    this.el.menuButtons.appendChild(box);

    const osReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    const flashRow = document.createElement('div');
    flashRow.className = 'opt-row';
    const flashLabel = document.createElement('label');
    flashLabel.setAttribute('for', 'opt-flash');
    flashLabel.textContent = 'Reduced flashing';
    const flashInput = document.createElement('input');
    flashInput.type = 'checkbox';
    flashInput.id = 'opt-flash';
    flashInput.checked = CONFIG.a11y.reducedFlashing || osReduced;
    flashInput.disabled = osReduced;
    flashInput.onchange = () => {
      CONFIG.a11y.reducedFlashing = flashInput.checked;
      try { localStorage.setItem('thebrood.a11y.flash', flashInput.checked ? '1' : '0'); } catch { /* ignore */ }
    };
    flashRow.appendChild(flashLabel); flashRow.appendChild(flashInput);
    box.appendChild(flashRow);

    const note = document.createElement('div');
    note.className = 'opt-note';
    note.textContent = osReduced
      ? 'Your system asks for reduced motion, so this is already on and cannot be turned off here.'
      : 'Caps every luminance flash to a low, short pulse. Nothing in the game requires you to see one.';
    box.appendChild(note);

    const volRow = document.createElement('div');
    volRow.className = 'opt-row';
    const volLabel = document.createElement('label');
    volLabel.setAttribute('for', 'opt-vol');
    volLabel.textContent = 'Volume';
    const vol = document.createElement('input');
    vol.type = 'range'; vol.id = 'opt-vol'; vol.min = '0'; vol.max = '100';
    vol.value = String(Math.round(CONFIG.a11y.masterVolume * 100));
    vol.oninput = () => {
      CONFIG.a11y.masterVolume = Number(vol.value) / 100;
      audio.master(CONFIG.a11y.masterVolume);
      try { localStorage.setItem('thebrood.a11y.vol', vol.value); } catch { /* ignore */ }
    };
    volRow.appendChild(volLabel); volRow.appendChild(vol);
    box.appendChild(volRow);

    const back = document.createElement('button');
    back.className = 'choice';
    back.textContent = 'back';
    back.onclick = () => this.pause();
    box.appendChild(back);

    this.el.menuFoot.textContent = 'WASD move · mouse look · E interact · C crouch · ESC back';
    flashInput.focus();
  }

  /** Restore the accessibility choices this machine has already made. */
  loadSettings() {
    try {
      const f = localStorage.getItem('thebrood.a11y.flash');
      if (f !== null) CONFIG.a11y.reducedFlashing = f === '1';
      const v = localStorage.getItem('thebrood.a11y.vol');
      if (v !== null) CONFIG.a11y.masterVolume = Number(v) / 100;
    } catch { /* ignore */ }
    audio.master(CONFIG.a11y.masterVolume);
  }
}

/* ------------------------------------------------------------------ */
/* small shared helpers for screen modules                             */
/* ------------------------------------------------------------------ */

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    el.appendChild(typeof kid === 'string' ? document.createTextNode(kid) : kid);
  }
  return el;
}

export function head(title, sub, tabs) {
  const t = h('div', { class: 'scr-head' },
    h('div', { class: 'scr-title' }, title),
    sub ? h('div', { class: 'scr-sub' }, sub) : null
  );
  if (tabs) t.appendChild(tabs);
  return t;
}

export function tabRow(items, active, onPick) {
  const row = h('div', { class: 'scr-tabs' });
  for (const it of items) {
    row.appendChild(h('div', {
      class: 'tab' + (it.id === active ? ' on' : ''),
      onclick: () => { audio.play('menu_move'); onPick(it.id); },
    }, it.label));
  }
  return row;
}

export function backLink(label, onClick) {
  return h('div', { class: 'back', onclick: onClick }, '‹ ' + label);
}

/** Body text with paragraph breaks, run through the corruption hook. */
export function bodyText(text, source = 'doc') {
  const el = h('div', { class: 'body-text' });
  const shown = effects.corruptText(text, { source });
  for (const p of shown.split('\n\n')) el.appendChild(h('p', {}, p));
  return el;
}

export default UI;
