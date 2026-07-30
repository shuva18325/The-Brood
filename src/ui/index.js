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
import { initCaptions, apply as applyCaptions } from './captions.js';

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
      lookHint: document.getElementById('look-hint'),
    };
    this.open_ = null;
    this.stack = [];
    this._subtitleTimer = null;
    this._closable = true;
    this._lookHintShown = false;

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

  /**
   * The browser refused pointer lock — an embedded frame always will. Say so
   * once, plainly, and get out of the way. This is chrome, so it is allowed
   * to be a clear instruction; nothing else in the game is.
   */
  lookHint() {
    const el = this.el.lookHint;
    if (!el || this._lookHintShown) return;
    this._lookHintShown = true;
    el.textContent = 'drag to look  ·  or arrow keys  ·  WASD move  ·  E interact';
    el.classList.remove('hidden', 'fading');
    setTimeout(() => {
      el.classList.add('fading');
      setTimeout(() => el.classList.add('hidden'), 900);
    }, 8000);
  }

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
   * §7 + §8 + §10. Separate sliders, captions, the compass, the flashing
   * cap and the loud-event limiter. All of it reachable without leaving
   * the game, from the title screen and from the pause menu.
   */
  settings() {
    this.el.menuButtons.innerHTML = '';
    const box = document.createElement('div');
    this.el.menuButtons.appendChild(box);

    const osReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const A = CONFIG.a11y;

    const row = (labelText) => {
      const r = document.createElement('div');
      r.className = 'opt-row';
      const l = document.createElement('label');
      l.textContent = labelText;
      r.appendChild(l);
      box.appendChild(r);
      return { row: r, label: l };
    };
    const note = (t) => {
      const n = document.createElement('div');
      n.className = 'opt-note';
      n.textContent = t;
      box.appendChild(n);
    };
    const toggle = (labelText, key, onChange, disabled) => {
      const { row: r, label: l } = row(labelText);
      const i = document.createElement('input');
      i.type = 'checkbox';
      i.id = 'opt-' + key;
      i.checked = !!A[key];
      i.disabled = !!disabled;
      l.setAttribute('for', i.id);
      i.onchange = () => { A[key] = i.checked; onChange?.(i.checked); this.saveSettings(); };
      r.appendChild(i);
      return i;
    };
    const slider = (labelText, key, onChange) => {
      const { row: r, label: l } = row(labelText);
      const i = document.createElement('input');
      i.type = 'range'; i.min = '0'; i.max = '100';
      i.id = 'opt-' + key;
      i.value = String(Math.round((A[key] ?? 1) * 100));
      l.setAttribute('for', i.id);
      i.oninput = () => { A[key] = Number(i.value) / 100; onChange?.(A[key]); this.saveSettings(); };
      r.appendChild(i);
      return i;
    };

    /* --- the mix. Quiet by default, on purpose. --- */
    slider('Master', 'masterVolume', (v) => audio.master(v));
    slider('Ambient', 'ambientVolume', (v) => audio.level('ambient', v));
    slider('Effects', 'effectsVolume', (v) => audio.level('effects', v));
    slider('Interface', 'interfaceVolume', (v) => audio.level('interface', v));
    note('Mixed quiet deliberately. Turning it up puts you at the mercy of the loud events.');

    toggle('Limit loud events', 'limiter', (on) => audio.limiter(on));
    note('A hard limiter for anyone who cannot risk peaks. Off by default, because the gap between room tone and a collapse is the point.');

    /* --- captions. Correctness, not decoration. --- */
    toggle('Sound captions', 'captions', () => applyCaptions());
    note('Directional captions for every sound. This game hides survival-critical information in audio.');
    toggle('Direction indicator', 'audioCompass', () => applyCaptions());

    /* --- photosensitivity --- */
    const flash = toggle('Reduced flashing', 'reducedFlashing', null, osReduced);
    if (osReduced) flash.checked = true;
    note(osReduced
      ? 'Your system asks for reduced motion, so this is already on and cannot be turned off here.'
      : 'Caps every luminance flash to a low, short pulse. Nothing in the game requires you to see one.');

    const back = document.createElement('button');
    back.className = 'choice';
    back.textContent = 'back';
    back.onclick = () => { if (state.started) this.pause(); else bus.emit('ui:title'); };
    box.appendChild(back);

    this.el.menuFoot.innerHTML =
      'WASD move · mouse, drag or arrow keys look · E interact · C crouch · ESC back<br>' +
      '<b>Headphones recommended.</b> The audio is positional.';
  }

  saveSettings() {
    try {
      localStorage.setItem('thebrood.a11y', JSON.stringify(CONFIG.a11y));
    } catch { /* ignore */ }
  }

  /** Restore the accessibility and mix choices this machine has made. */
  loadSettings() {
    try {
      const raw = localStorage.getItem('thebrood.a11y');
      if (raw) Object.assign(CONFIG.a11y, JSON.parse(raw));
    } catch { /* ignore */ }
    initCaptions();
  }

  /** Push the stored mix into the engine once audio actually exists. */
  applyMix() {
    const A = CONFIG.a11y;
    audio.master(A.masterVolume);
    audio.level('ambient', A.ambientVolume);
    audio.level('effects', A.effectsVolume);
    audio.level('interface', A.interfaceVolume);
    audio.limiter(A.limiter);
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
