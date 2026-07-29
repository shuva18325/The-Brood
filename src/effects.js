/**
 * effects.js — the visual/horror effects manager.
 *
 * PROMPT 1 CALLS THESE. PROMPT 2 FILLS THEM IN.
 *
 * Every function here is a no-op that records the call. Nothing in prompt 1
 * may implement a visual effect inline — if a system wants the screen to
 * shake, it calls effects.shake(). If it wants text to rot, it calls
 * effects.corruptText(). Prompt 2 replaces the bodies and nothing else
 * in the codebase changes.
 *
 * Prompt 2 contract:
 *   - init(ctx) receives { renderer, scene, camera, world, state }.
 *   - update(dt) is called once per frame from the main loop, always.
 *   - Everything else is fire-and-forget. Never assume a return value.
 *   - Effects must be safe to call while the scene is frozen behind an
 *     overlay, and safe to call twice in the same frame.
 */

import { CONFIG, conditionTier } from './config.js';

const log = [];

function trace(name, args) {
  log.push({ t: performance.now(), name, args });
  if (log.length > 400) log.shift();
  if (CONFIG.debug.traceStubs) console.debug('[fx]', name, ...args);
}

/** Internal: the current degradation level, 0 (fine) to 4 (gone). */
let level = 0;
let ctx = null;

export const effects = {

  /* ---- lifecycle ------------------------------------------------- */

  /** Called once, after the renderer and world exist. */
  init(context) { ctx = context; trace('init', []); },

  /** Called every frame from main.js, before render. dt in seconds. */
  update(_dt) { /* prompt 2 */ },

  /** Called on window resize. */
  resize(_w, _h) { /* prompt 2 */ },

  /* ---- persistent state ------------------------------------------ */

  /**
   * Set the standing degradation level. Driven by condition, darkness and
   * accumulated sightings. Prompt 2 maps this to sway, grain, vignette,
   * desaturation and the text-corruption rate on 2D screens.
   * @param {number} n 0..4
   */
  degrade(n) {
    level = Math.max(0, Math.min(4, n | 0));
    trace('degrade', [level]);
  },

  /** Current degradation level, for systems that want to branch on it. */
  level() { return level; },

  /** Recompute degradation from state. Called whenever condition changes. */
  syncFromState(state) {
    const tier = conditionTier(state.condition);
    let n = tier.level;
    if (state.flags.livedInDarkness >= 3) n += 1;
    n += Math.min(2, Math.floor(state.sightings / 2));
    this.degrade(n);
  },

  /* ---- one-shots -------------------------------------------------- */

  /**
   * The player looked at something they should not have. This is the big one.
   * @param {string} entity  entity id, e.g. 'anguish' | 'tormentor' | 'incursion'
   * @param {object} opts    { severity: 0..1, permanent: bool }
   */
  sighting(entity, opts = {}) { trace('sighting', [entity, opts]); },

  /** Lights stutter. Brownout, or something drawing off the line. */
  flicker(target = 'all', opts = {}) { trace('flicker', [target, opts]); },

  /** Camera shake. Distant collapse, impact, the building taking a hit. */
  shake(magnitude = 0.5, seconds = 1.0) { trace('shake', [magnitude, seconds]); },

  /** Slow push-in / pull-back on the camera. Used at scripted beats. */
  push(amount = 0.15, seconds = 2.0) { trace('push', [amount, seconds]); },

  /** Fade the whole frame to a colour and back. */
  flash(color = 0xffffff, seconds = 0.2) { trace('flash', [color, seconds]); },

  /** Blackout plate. Returns immediately; UI handles its own timing. */
  blackout(seconds = 1.0) { trace('blackout', [seconds]); },

  /** Something moved at the edge of vision and is not there now. */
  peripheral(side = 'left') { trace('peripheral', [side]); },

  /**
   * Warmth where there is no sun. Zānuwām's signature — a heat shimmer and
   * a dimming that is not a brownout.
   */
  warmth(intensity = 0.5) { trace('warmth', [intensity]); },

  /* ---- 2D screen effects ------------------------------------------ */

  /**
   * Rot a block of text before it is shown. Prompt 2 returns altered text
   * based on degradation level: dropped words, transposed letters, and at
   * high levels, sentences that were not there the last time.
   *
   * MUST return a string. Prompt 1 relies on the identity behaviour.
   * @param {string} text
   * @param {object} opts { source: 'news'|'forum'|'doc'|'phone', reread: bool }
   */
  corruptText(text, _opts = {}) { return text; },

  /** Screen interference on a 2D overlay: scanlines, roll, dropout. */
  screenNoise(kind = 'mild', seconds = 1.0) { trace('screenNoise', [kind, seconds]); },

  /** The TV losing the channel, then finding it again. */
  signalLoss(seconds = 2.0) { trace('signalLoss', [seconds]); },

  /* ---- world dressing --------------------------------------------- */

  /**
   * Reveal / hide a billboard outside the window. The world module owns the
   * sprites; this owns how they arrive.
   * @param {string} id  billboard id registered by world/street.js
   */
  billboard(id, on = true, opts = {}) { trace('billboard', [id, on, opts]); },

  /** Fog / grade change for a scripted beat, e.g. the night it gets worse. */
  atmosphere(preset = 'default', seconds = 3.0) { trace('atmosphere', [preset, seconds]); },

  /** Debug: the recorded call log, for tests and for prompt 2. */
  _log() { return log.slice(); },
  _ctx() { return ctx; },
};

export default effects;
