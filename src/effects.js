/**
 * effects.js — the visual/horror effects manager.
 *
 * PROMPT 1 CALLED THESE. PROMPT 2 FILLED THEM IN.
 *
 * The contract is unchanged: every function is fire-and-forget, safe to
 * call twice in a frame, and safe to call while the scene is frozen behind
 * an overlay. corruptText() still MUST return a string.
 */

import * as THREE from 'three';
import { CONFIG, conditionTier, gradeBand } from './config.js';
import bus from './bus.js';
import PostChain from './fx/post.js';

const log = [];

function trace(name, args) {
  log.push({ t: performance.now(), name, args });
  if (log.length > 400) log.shift();
  if (CONFIG.debug.traceStubs) console.debug('[fx]', name, ...args);
}

/* ------------------------------------------------------------------ */
/* internal state                                                      */
/* ------------------------------------------------------------------ */

let ctx = null;
let post = null;
let level = 0;
let sightings = 0;
let time = 0;

/** Additive camera offsets, resolved every frame. */
const cam = {
  swayYaw: 0, swayPitch: 0,
  bobY: 0, bobRoll: 0,
  shakeMag: 0, shakeLeft: 0,
  pushZ: 0, pushTarget: 0, pushRate: 0,
  breatheY: 0,
  bobPhase: 0,
};

/** Timed one-shots. */
const timed = {
  flash: 0, flashDecay: 6,
  fade: 1, fadeTarget: 1, fadeRate: 3,
  tint: new THREE.Color(1, 1, 1), tintAmt: 0, tintTarget: 0,
  flicker: 0,          // 0..1, drives bulb dimming
  flickerLeft: 0,
  brownout: 0,         // seconds remaining of a full cut
  warmth: 0,
  peripheralLeft: 0,
};

/** Anguish exposure — permanent once it happens. */
let exposed = false;
let flashPulse = { left: 0, hz: 0, amp: 0 };

/** Grade, chased rather than snapped. */
const grade = { saturation: 0.94, greenPull: 0, temp: 0.055, lift: 0.008, gain: 1.02, crush: 0.01 };

/* ------------------------------------------------------------------ */
/* text corruption                                                     */
/*                                                                     */
/* "The player reads a headline, looks away, looks back, and one word   */
/* is different. Never flag it. Never repeat the same alteration."      */
/*                                                                     */
/* A glance is a screen being opened. Within one glance the text is     */
/* stable, so a rerender never churns; across glances it drifts.        */
/* ------------------------------------------------------------------ */

let glanceEpoch = 0;
const seenText = new Map();     // hash -> { reads, used:Set, cache:{epoch,out} }

bus.on('ui:open', () => { glanceEpoch++; });
bus.on('ui:close', () => { glanceEpoch++; });

function hashText(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Deterministic PRNG so one glance always produces the same alteration. */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const WORD_RE = /[A-Za-z][A-Za-z'’-]{3,}/g;

/* ------------------------------------------------------------------ */

export const effects = {

  /* ---- lifecycle ------------------------------------------------- */

  init(context) {
    ctx = context;
    trace('init', []);
    if (!ctx || !ctx.renderer) return;
    try {
      post = new PostChain(ctx.renderer);
      post.resize(innerWidth, innerHeight);
    } catch (e) {
      console.warn('[fx] post chain unavailable:', e);
      post = null;
    }
    applyDegradeClass();
  },

  update(dt) {
    time += dt;
    if (!ctx) return;

    const state = ctx.state;

    /* ---- camera: breathing, bob, sway, shake, push ---------------- */
    const P = CONFIG.player;
    const moving = ctx.world && ctx.world.controls
      ? Math.hypot(ctx.world.controls.velocity.x, ctx.world.controls.velocity.z)
      : 0;

    // Breathing at rest. Grows as the body goes.
    const breatheAmp = P.breathe.amount + P.breathe.perLevel * level;
    cam.breatheY = Math.sin(time * P.breathe.rate * Math.PI * 2) * breatheAmp
                 * (1 - Math.min(1, moving / 1.2));

    // Headbob while walking. Heavy and slow.
    if (moving > 0.25) {
      cam.bobPhase += dt * P.headbob.rate * Math.min(1, moving / P.walkSpeed);
      const k = Math.min(1, moving / P.walkSpeed);
      cam.bobY = Math.sin(cam.bobPhase * 2) * P.headbob.amount * k;
      cam.bobRoll = Math.sin(cam.bobPhase) * P.headbob.rollAmount * k;
    } else {
      cam.bobY *= 1 - Math.min(1, dt * 5);
      cam.bobRoll *= 1 - Math.min(1, dt * 5);
    }

    // Sway: a slow drift he is always correcting for. Sightings add to it
    // permanently — that is the one thing in here that never decays.
    const swayAmp = P.sway.base + P.sway.perLevel * level + P.swayPerSighting * sightings;
    cam.swayYaw   = Math.sin(time * P.sway.rateA) * swayAmp
                  + Math.sin(time * P.sway.rateB * 2.7 + 1.3) * swayAmp * 0.45;
    cam.swayPitch = Math.cos(time * P.sway.rateB) * swayAmp * 0.7
                  + Math.sin(time * P.sway.rateA * 1.9 + 0.7) * swayAmp * 0.3;

    if (cam.shakeLeft > 0) {
      cam.shakeLeft = Math.max(0, cam.shakeLeft - dt);
      const decay = cam.shakeLeft;
      const s = cam.shakeMag * decay * decay;
      cam.swayYaw   += (Math.random() - 0.5) * s * 0.06;
      cam.swayPitch += (Math.random() - 0.5) * s * 0.05;
      cam.bobY      += (Math.random() - 0.5) * s * 0.06;
    }

    if (Math.abs(cam.pushZ - cam.pushTarget) > 0.0005) {
      cam.pushZ += (cam.pushTarget - cam.pushZ) * Math.min(1, dt * cam.pushRate);
    }

    applyCamera();

    /* ---- brownouts + flicker -------------------------------------- */
    if (timed.brownout > 0) {
      timed.brownout = Math.max(0, timed.brownout - dt);
      if (timed.brownout === 0) bus.emit('fx:brownoutEnd');
    }
    if (timed.flickerLeft > 0) {
      timed.flickerLeft = Math.max(0, timed.flickerLeft - dt);
      timed.flicker = Math.random() < 0.4 ? Math.random() : timed.flicker * 0.7;
      if (timed.flickerLeft === 0) timed.flicker = 0;
    }
    if (timed.warmth > 0) timed.warmth = Math.max(0, timed.warmth - dt * 0.35);
    if (timed.peripheralLeft > 0) timed.peripheralLeft = Math.max(0, timed.peripheralLeft - dt);

    /* ---- grade: chase the band for today --------------------------- */
    const band = gradeBand(state ? state.day : 1);
    const k = Math.min(1, dt / CONFIG.grade.blendSeconds);
    grade.saturation += (band.saturation - grade.saturation) * k;
    grade.greenPull  += (band.greenPull  - grade.greenPull)  * k;
    grade.temp       += (band.temp       - grade.temp)       * k;
    grade.lift       += (band.lift       - grade.lift)       * k;
    grade.gain       += (band.gain       - grade.gain)       * k;
    grade.crush      += (band.crush      - grade.crush)      * k;

    /* ---- flash / fade ---------------------------------------------- */
    if (flashPulse.left > 0) {
      flashPulse.left = Math.max(0, flashPulse.left - dt);
      const hz = Math.min(CONFIG.a11y.maxFlashHz, flashPulse.hz);
      timed.flash = (Math.sin(time * hz * Math.PI * 2) > 0 ? 1 : 0) * flashPulse.amp;
      if (flashPulse.left === 0) timed.flash = 0;
    } else if (timed.flash > 0) {
      timed.flash = Math.max(0, timed.flash - dt * timed.flashDecay);
    }
    timed.fade += (timed.fadeTarget - timed.fade) * Math.min(1, dt * timed.fadeRate);
    timed.tintAmt += (timed.tintTarget - timed.tintAmt) * Math.min(1, dt * 2);

    /* ---- push the uniforms ----------------------------------------- */
    if (post) {
      const u = post.uniforms;
      const G = CONFIG.post;
      const expo = exposed ? 1 : 0;
      u.uGrain.value       = G.grain.base + G.grain.perLevel * (level + expo);
      u.uAberration.value  = G.aberration.base + G.aberration.perLevel * (level + expo * 1.5)
                           + (flashPulse.left > 0 ? 0.014 : 0);
      u.uSoftness.value    = G.softness.base + G.softness.perLevel * (level + expo);
      u.uSaturation.value  = grade.saturation;
      u.uGreenPull.value   = grade.greenPull;
      u.uTemp.value        = grade.temp;
      u.uLift.value        = grade.lift;
      u.uGain.value        = grade.gain;
      u.uCrush.value       = grade.crush;
      u.uFlash.value       = timed.flash;
      u.uFade.value        = timed.brownout > 0 ? 0.0 : timed.fade;
      u.uTint.value.copy(timed.tint);
      u.uTintAmt.value     = timed.tintAmt;
      u.uVignette.value    = CONFIG.post.vignette.amount + level * 0.03;
    }
  },

  resize(w, h) {
    if (post) post.resize(w, h);
  },

  /**
   * Called from World.render(). Returns true if it drew the frame.
   * Prompt 1's renderer path stays as the fallback.
   */
  renderScene(world) {
    if (!post || !post.enabled || post.failed) return false;
    return post.render(world.scene, world.camera, 1 / 60);
  },

  /* ---- persistent state ------------------------------------------ */

  degrade(n) {
    const next = Math.max(0, Math.min(4, n | 0));
    if (next === level) return;
    level = next;
    applyDegradeClass();
    trace('degrade', [level]);
  },

  level() { return level; },

  syncFromState(state) {
    const tier = conditionTier(state.condition);
    let n = tier.level;
    if (state.flags.livedInDarkness >= 3) n += 1;
    n += Math.min(2, Math.floor(state.sightings / 2));
    sightings = state.sightings;
    if (state.flags.lookedAtAnguish) { exposed = true; n = 4; }
    this.degrade(n);
  },

  /* ---- one-shots -------------------------------------------------- */

  /**
   * The player looked at something they should not have.
   * The sway increase is permanent and is never given back.
   */
  sighting(entity, opts = {}) {
    trace('sighting', [entity, opts]);
    sightings += 1;
    this.shake(0.4 + (opts.severity || 1) * 0.3, 0.9);

    if (entity === 'anguish') {
      exposed = true;
      this.anguishExposure();
      return;
    }
    timed.flash = Math.min(cap(), 0.12 * (opts.severity || 1));
    if (post) post.uniforms.uAberration.value += 0.01;
  },

  /**
   * §8.5. Rapid low-amplitude luminance flashing, aberration spiking,
   * the frame held too long. Capped, rate-limited, and honours the
   * reduced-flashing setting and prefers-reduced-motion.
   */
  anguishExposure() {
    const reduced = reducedFlashing();
    flashPulse = {
      left: reduced ? 0.9 : 1.8,
      hz: reduced ? 2 : CONFIG.a11y.maxFlashHz,
      amp: reduced ? CONFIG.a11y.flashCapReduced : CONFIG.a11y.flashCapNormal,
    };
    this.shake(1.0, 2.2);
    document.documentElement.classList.add('fx-exposed');
    bus.emit('fx:anguish');
  },

  /** Lights stutter. Brownout, or something drawing off the line. */
  flicker(target = 'all', opts = {}) {
    trace('flicker', [target, opts]);
    if (opts.hard) {
      // A full brownout: everything cuts. Three seconds lit only by the
      // streetlight through the bars. Then the bulb stutters back.
      timed.brownout = opts.seconds ?? 0.35;
      timed.flickerLeft = 2.6;
      bus.emit('fx:brownout', opts);
    } else {
      timed.flickerLeft = Math.max(timed.flickerLeft, opts.seconds ?? 0.7);
    }
  },

  /** Current bulb dimming multiplier, read by lighting.js. */
  bulbDim() {
    if (timed.brownout > 0) return 0;
    if (timed.flickerLeft > 0) return 1 - timed.flicker * 0.85;
    return 1;
  },

  /** Screens lose a frame during a flicker. */
  screenDim() {
    if (timed.brownout > 0) return 0;
    if (timed.flickerLeft > 0 && Math.random() < 0.25) return 0;
    return 1;
  },

  shake(magnitude = 0.5, seconds = 1.0) {
    cam.shakeMag = Math.max(cam.shakeMag, magnitude);
    cam.shakeLeft = Math.max(cam.shakeLeft, seconds);
    trace('shake', [magnitude, seconds]);
  },

  push(amount = 0.15, seconds = 2.0) {
    cam.pushTarget = amount;
    cam.pushRate = 1 / Math.max(0.05, seconds);
    trace('push', [amount, seconds]);
    setTimeout(() => { cam.pushTarget = 0; }, seconds * 1000);
  },

  flash(color = 0xffffff, seconds = 0.2) {
    timed.flash = Math.min(cap(), 0.5);
    timed.flashDecay = 1 / Math.max(0.05, seconds);
    trace('flash', [color, seconds]);
  },

  blackout(seconds = 1.0) {
    timed.fadeTarget = 0;
    timed.fadeRate = 3 / Math.max(0.2, seconds);
    trace('blackout', [seconds]);
    setTimeout(() => { timed.fadeTarget = 1; }, seconds * 1000);
  },

  /** Something moved at the edge of vision and is not there now. */
  peripheral(side = 'left') {
    timed.peripheralLeft = 0.4;
    trace('peripheral', [side]);
    if (ctx && ctx.world) ctx.world.peripheralFlick(side);
  },

  /** Warmth where there is no sun. Zānuwām's signature. */
  warmth(intensity = 0.5) {
    timed.warmth = Math.max(timed.warmth, intensity);
    timed.tint.setRGB(1.08, 1.0, 0.94);
    timed.tintTarget = Math.min(0.5, intensity);
    setTimeout(() => { timed.tintTarget = 0; }, 6000);
    trace('warmth', [intensity]);
  },

  warmthAmount() { return timed.warmth; },

  /* ---- 2D screen effects ------------------------------------------ */

  /**
   * §8.2. Text becomes harder to read, and then it changes between glances.
   * One word. Never the same alteration twice. Never flagged.
   */
  corruptText(text, opts = {}) {
    if (typeof text !== 'string' || text.length < 40) return text;
    if (level < 2 && !exposed) return text;

    const key = hashText(text);
    let rec = seenText.get(key);
    if (!rec) { rec = { reads: 0, used: new Set(), cache: null }; seenText.set(key, rec); }

    // Stable within a glance, so a rerender never churns.
    if (rec.cache && rec.cache.epoch === glanceEpoch) return rec.cache.out;

    rec.reads++;
    // The first time he reads something, it is what it says.
    if (rec.reads <= 1) {
      rec.cache = { epoch: glanceEpoch, out: text };
      return text;
    }

    const chance = exposed ? 0.85 : [0, 0, 0.35, 0.6, 0.8][level];
    const rand = rng(key ^ (glanceEpoch * 2654435761));
    if (rand() > chance) {
      rec.cache = { epoch: glanceEpoch, out: text };
      return text;
    }

    const out = alterOneWord(text, rand, rec.used);
    rec.cache = { epoch: glanceEpoch, out };
    return out;
  },

  screenNoise(kind = 'mild', seconds = 1.0) {
    trace('screenNoise', [kind, seconds]);
    const el = document.getElementById('overlay');
    if (!el) return;
    const cls = kind === 'heavy' ? 'noise-heavy' : 'noise-mild';
    el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), seconds * 1000);
  },

  signalLoss(seconds = 2.0) {
    trace('signalLoss', [seconds]);
    bus.emit('fx:signalLoss', seconds);
  },

  /* ---- world dressing --------------------------------------------- */

  billboard(id, on = true, opts = {}) {
    trace('billboard', [id, on, opts]);
    if (ctx && ctx.world) ctx.world.street.show(id, on, opts);
  },

  /**
   * Fog / grade change for a scripted beat.
   * 'silence'  — the night everything smaller leaves the block
   * 'siege'    — the fifteenth night
   * 'default'  — back to the day's band
   */
  atmosphere(preset = 'default', seconds = 3.0) {
    trace('atmosphere', [preset, seconds]);
    if (!ctx || !ctx.world) return;
    ctx.world.lighting.setAtmosphere(preset, seconds);
    if (preset === 'silence') {
      timed.tint.setRGB(0.92, 0.95, 1.06);
      timed.tintTarget = 0.35;
    } else if (preset === 'siege') {
      timed.tint.setRGB(0.96, 0.93, 0.95);
      timed.tintTarget = 0.25;
    } else {
      timed.tintTarget = 0;
    }
  },

  /* ---- the Pathogen (§8.6) ---------------------------------------- */

  /**
   * Everything in the frame stops updating. The monitor's light in the 3D
   * room changes colour. There is no creature in the room.
   */
  pathogenManifest() {
    timed.tint.setRGB(0.82, 0.88, 1.0);
    timed.tintTarget = 0.75;
    document.documentElement.classList.add('fx-pathogen');
    if (ctx && ctx.world) ctx.world.setScreenColour('computer', 0xd8e4ff, 2.4);
    bus.emit('fx:pathogen');
  },

  /* ---- debug ------------------------------------------------------ */
  _log() { return log.slice(); },
  _ctx() { return ctx; },
  _post() { return post; },
  _exposed() { return exposed; },
  _resetForTests() {
    level = 0; sightings = 0; exposed = false;
    seenText.clear(); glanceEpoch = 0;
    timed.brownout = 0; timed.flickerLeft = 0; timed.flash = 0;
    timed.fade = 1; timed.fadeTarget = 1; timed.tintAmt = 0; timed.tintTarget = 0;
    flashPulse = { left: 0, hz: 0, amp: 0 };
    document.documentElement.classList.remove('fx-exposed', 'fx-pathogen');
    applyDegradeClass();
  },
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function applyCamera() {
  if (!ctx || !ctx.camera) return;
  const c = ctx.camera;
  c.rotation.y += cam.swayYaw;
  c.rotation.x += cam.swayPitch;
  c.rotation.z = cam.bobRoll;
  c.position.y += cam.bobY + cam.breatheY;
  if (cam.pushZ !== 0) c.translateZ(-cam.pushZ);
}

function applyDegradeClass() {
  document.documentElement.dataset.deg = String(level);
}

function reducedFlashing() {
  if (CONFIG.a11y.reducedFlashing) return true;
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function cap() {
  return reducedFlashing() ? CONFIG.a11y.flashCapReduced : CONFIG.a11y.flashCapNormal;
}

/**
 * Replace exactly one word with another word taken from the same text.
 * Self-contained, plausible, and never the same swap twice — which is
 * what makes it feel like a misreading rather than an effect.
 */
function alterOneWord(text, rand, used) {
  const words = [...text.matchAll(WORD_RE)];
  if (words.length < 6) return text;

  for (let attempt = 0; attempt < 12; attempt++) {
    const i = Math.floor(rand() * words.length);
    const j = Math.floor(rand() * words.length);
    if (i === j) continue;
    const from = words[i], to = words[j];
    if (from[0].toLowerCase() === to[0].toLowerCase()) continue;
    const tag = i + ':' + j;
    if (used.has(tag)) continue;
    used.add(tag);

    // Keep the capitalisation of the word that was there.
    let repl = to[0];
    if (/^[A-Z]/.test(from[0])) repl = repl[0].toUpperCase() + repl.slice(1);
    else repl = repl[0].toLowerCase() + repl.slice(1);

    return text.slice(0, from.index) + repl + text.slice(from.index + from[0].length);
  }
  return text;
}

export default effects;
