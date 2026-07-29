/**
 * audio.js — the audio event bus.
 *
 * PROMPT 1 EMITS EVENTS. PROMPT 3 ATTACHES SOUNDS.
 *
 * Nothing in prompt 1 constructs an Audio object, touches Web Audio, or
 * knows a file name. Systems say what happened; prompt 3 decides what that
 * sounds like. The vocabulary below is the contract — prompt 3 may add
 * cues but should not require prompt 1 to be edited.
 *
 * Positional cues pass an optional { at: THREE.Vector3 | [x,y,z] }.
 * Looping cues are started with play() and stopped with stop() using the
 * same id.
 */

import { CONFIG } from './config.js';

const log = [];
const playing = new Set();
let ctx = null;

function trace(name, args) {
  log.push({ t: performance.now(), name, args });
  if (log.length > 600) log.shift();
  if (CONFIG.debug.traceStubs) console.debug('[snd]', name, ...args);
}

/**
 * The cue vocabulary. Kept here so prompt 3 has an exhaustive list and so a
 * typo in a system module can be caught in testing.
 */
export const CUES = [
  /* --- room tone / beds (looping) --- */
  'bed_room_day', 'bed_room_night', 'bed_street_day', 'bed_street_night',
  'bed_rain', 'bed_silence_total',           // total silence = Anguish signature
  'bed_fridge_hum', 'bed_pipes', 'bed_tv_static', 'bed_water_running',
  'bed_hotplate', 'bed_wind_through_bars',

  /* --- player --- */
  'step', 'step_crouch', 'breath_calm', 'breath_tight', 'breath_failing',
  'lie_down', 'get_up', 'stomach',

  /* --- interaction --- */
  'switch_on', 'switch_off', 'curtain_open', 'curtain_close',
  'fridge_open', 'fridge_close', 'cabinet', 'tap_on', 'tap_off',
  'door_open', 'door_close', 'door_locked', 'chain_rattle',
  'tv_on', 'tv_off', 'tv_channel', 'pc_boot', 'pc_fan', 'keyclack',
  'phone_ring', 'phone_pickup', 'phone_hangup', 'phone_buzz', 'phone_dead',
  'marker_squeak', 'paper', 'shotgun_pickup', 'shell_load', 'shotgun_fire',
  'shotgun_dryfire', 'eat_cold', 'eat_hot', 'dishes',

  /* --- world / outside --- */
  'collapse_distant', 'collapse_near', 'collapse_adjacent',
  'debris_settle', 'car_alarm', 'car_alarm_stop', 'siren_far', 'siren_cut',
  'dog_bark', 'dog_bark_last', 'birds', 'gull',
  'helicopter', 'convoy', 'gunfire_far', 'gunfire_close',
  'water_rising', 'street_shout', 'street_running', 'street_silence',

  /* --- entities --- */
  'crawler_scratch', 'crawler_swarm', 'crawler_hit', 'crawler_die',
  'gleaner_chitter', 'gleaner_pick',
  'tormentor_step', 'tormentor_pause', 'tormentor_wreckage',
  'anguish_arrival', 'anguish_present',
  'incursion_write', 'incursion_door', 'incursion_test', 'incursion_voice',
  'choir_call', 'choir_wrong', 'zanuwam_warmth', 'pathogen_hum',

  /* --- stingers / structure --- */
  'day_advance', 'day_fail', 'ending_keys', 'ending_brave', 'ending_found',
  'understanding_tick',    // deliberately near-silent; prompt 3 may drop it
  'menu_move', 'menu_select', 'overlay_in', 'overlay_out',
];

const CUE_SET = new Set(CUES);

export const audio = {

  /* ---- lifecycle -------------------------------------------------- */

  init(context) { ctx = context; trace('init', []); },

  /** Called every frame. dt in seconds. Prompt 3 uses this for ducking. */
  update(_dt) { /* prompt 3 */ },

  /** Web Audio needs a user gesture. UI calls this on first click. */
  unlock() { trace('unlock', []); },

  /* ---- the bus ---------------------------------------------------- */

  /**
   * @param {string} cue  one of CUES
   * @param {object} opts { at, volume, loop, rate, delay, fade }
   */
  play(cue, opts = {}) {
    if (!CUE_SET.has(cue)) console.warn('[snd] unknown cue:', cue);
    if (opts.loop) playing.add(cue);
    trace('play', [cue, opts]);
  },

  stop(cue, opts = {}) { playing.delete(cue); trace('stop', [cue, opts]); },

  /** Cross-fade the ambient bed. Prompt 3 owns the actual crossfade. */
  bed(cue, opts = {}) { trace('bed', [cue, opts]); },

  /** Global duck — used when the overlay opens and the room recedes. */
  duck(amount = 0.4, seconds = 0.3) { trace('duck', [amount, seconds]); },

  /** Master volume for the whole game, 0..1. */
  master(v) { trace('master', [v]); },

  /** True while a looping cue is running. */
  isPlaying(cue) { return playing.has(cue); },

  /* ---- debug ------------------------------------------------------ */
  _log() { return log.slice(); },
  _playing() { return [...playing]; },
  _ctx() { return ctx; },
};

export default audio;
