/**
 * main.js — bootstrap and the loop.
 *
 * PROMPT 1: skeleton. Everything runs; nothing looks like anything.
 * PROMPT 2 fills in effects.js and tunes config.js.
 * PROMPT 3 fills in audio.js.
 *
 * Nothing in this file should ever hardcode a colour, a duration or a
 * sound. If it does, prompts 2 and 3 spend their budget refactoring.
 */

import * as THREE from 'three';
import { CONFIG } from './config.js';
import state, { save, load, hasSave, wipe, reset, note } from './state.js';
import bus from './bus.js';
import audio from './audio.js';
import effects from './effects.js';

import clock from './systems/clock.js';
import concealment from './systems/concealment.js';
import understanding from './systems/understanding.js';
import day from './systems/day.js';
import endings from './systems/endings.js';
import Script from './systems/script.js';

import World from './world/index.js';
import UI from './ui/index.js';

/* ------------------------------------------------------------------ */

const canvas = document.getElementById('scene');
const world = new World(canvas);
const clock3 = new THREE.Clock();

let frozen = true;
let raf = 0;

const ctx = {
  world,
  camera: world.camera,
  renderer: world.renderer,
  scene: world.scene,
  controls: world.controls,
  ui: null,
  script: null,
  state,

  freeze(on) {
    frozen = on;
    world.controls.enabled = !on;
    world.controls.clearKeys();
    if (on) { world.controls.releaseLock(); clock.pause(); }
    else { clock.resume(); }
  },

  resume() {
    if (state.ended) return;
    ctx.ui.hideMenu();
    ctx.ui.showHud(true);
    ctx.freeze(false);
    world.controls.requestLock();
  },

  saveNow() { save(); },

  restart() {
    wipe();
    location.reload();
  },
};

const ui = new UI(ctx);
ctx.ui = ui;
ui.loadSettings();
const script = new Script(ctx);
ctx.script = script;

world.bindInteraction(ctx);
effects.init({ renderer: world.renderer, scene: world.scene, camera: world.camera, world, state });
audio.init({ camera: world.camera, world, state });

/* ------------------------------------------------------------------ */
/* the loop                                                            */
/* ------------------------------------------------------------------ */

function frame() {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(0.1, clock3.getDelta());

  if (!frozen) {
    world.update(dt);
  } else {
    // The scene is frozen but the clock is not always: the overlay runs
    // time too, because reading burns daylight.
  }

  // Time and drain run behind overlays as well as in the room.
  if (state.started && !state.ended) {
    if (!frozen || ui.isOpen) {
      clock.update(dt);
      concealment.update(dt);
      script.update();
    }
  }

  effects.update(dt);
  audio.update(dt);
  ui.updateHud();
  world.render();
}

/* ------------------------------------------------------------------ */
/* pointer lock plumbing                                               */
/* ------------------------------------------------------------------ */

canvas.addEventListener('click', () => {
  audio.unlock();
  if (state.started && !state.ended && !ui.isOpen && ui.el.menu.classList.contains('hidden')) {
    world.controls.requestLock();
  }
});

bus.on('controls:lock', (locked) => {
  if (!locked && state.started && !state.ended && !ui.isOpen &&
      ui.el.menu.classList.contains('hidden')) {
    // Lost the lock without opening anything — treat it as a pause.
    ui.pause();
  }
});

/* ------------------------------------------------------------------ */
/* start / load                                                        */
/* ------------------------------------------------------------------ */

function startNew() {
  reset();
  state.started = true;
  clock.reset(CONFIG.clock.wakeHour);
  world.applyState();
  world.updateFridge();
  ui.hideMenu();
  ctx.resume();
  script.onWake(state.day);
  save();
}

function continueSaved() {
  state.started = true;
  world.applyState();
  world.onDayAdvance();
  ui.hideMenu();
  ctx.resume();
  script.onWake(state.day);
}

function showTitle() {
  const buttons = [];
  if (hasSave()) {
    buttons.push({
      label: 'continue', sub: 'the save is on this machine and nowhere else',
      onClick: () => { if (load()) continueSaved(); else startNew(); },
    });
  }
  buttons.push({
    label: hasSave() ? 'start again' : 'begin',
    sub: hasSave() ? 'this erases the days you have' : 'nine days in. the tenth morning.',
    onClick: () => startNew(),
  });

  buttons.push({
    label: 'settings', sub: 'reduced flashing · volume',
    onClick: () => ui.settings(),
  });
  ui.showMenu(buttons,
    `WASD — move · mouse — look · E — the thing you are looking at · C — crouch · ESC — stop<br>` +
    `One save slot. It writes itself when you sleep.`);
}

/* ------------------------------------------------------------------ */
/* debug harness — the verification script drives the game through this */
/* ------------------------------------------------------------------ */

if (CONFIG.debug.exposeApi) {
  window.BROOD = {
    ctx, state, bus, audio, effects, world, ui, script,
    clock, concealment, understanding, day, endings,

    startNew, continueSaved,

    /** Advance one day without walking to the mat. */
    sleep(quality = 'good') {
      const wasDay = state.day;
      const s = day.sleep({ quality });
      world.onDayAdvance();
      script.onWake(wasDay + 1);
      return s;
    },

    /** Run n days. */
    days(n = 1, quality = 'good') {
      const out = [];
      for (let i = 0; i < n && !state.ended; i++) out.push(this.sleep(quality));
      return out;
    },

    setHour(h) { clock.advanceTo(h); },

    /** Mark every piece of day-available content as read. */
    readEverything() {
      const mods = [
        ['news', () => import('./content/news.js').then(m => m.newsFor(state.day))],
      ];
      void mods;
      return understanding.score();
    },

    /** Grant flags directly — used to test ending branches. */
    grant(...flags) { for (const f of flags) understanding.grant(f, 'debug'); return understanding.score(); },
    believe(...bs) { for (const b of bs) state.beliefs[b] = true; },

    score() { return understanding.score(); },
    tier() { return understanding.tier(); },
    concealmentDebug() { return concealment.debug(); },

    endKeys() { return endings.keys({ day: state.day }); },
    endBrave(r = { held: true, mistakes: 0, fired: 1, letIn: false }) { return endings.brave(r); },
    endFound() { return endings.found(); },

    /** Drop concealment to zero, which is Ending C. */
    burnConcealment() { concealment.charge(state.concealment + 1, 0, 'debug'); },

    reset() { reset(); },
  };
}

/* ------------------------------------------------------------------ */

showTitle();
frame();

bus.on('ending:resolved', (r) => {
  ctx.freeze(true);
  ui.showHud(false);
  note(`ending: ${r.id} / ${r.outcome}`);
  console.info('[brood] ending', r.id, r.outcome, 'understanding', r.understanding, r.tier);
});

void audio; void effects; void raf;
