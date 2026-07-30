/**
 * audio.js — the audio event bus.
 *
 * PROMPT 1 EMITTED EVENTS. PROMPT 3 ATTACHED SOUNDS.
 *
 * The contract is unchanged: systems say what happened, this decides what
 * that sounds like. `play(cue, opts)`, `stop(cue)`, `bed(cue)`, `duck()`.
 * An unknown cue still warns to console.
 *
 * Everything is generated. Nothing is loaded.
 */

import { CONFIG } from './config.js';
import bus from './bus.js';
import * as S from './snd/synth.js';
import Engine from './snd/engine.js';
import SoundWorld from './snd/world.js';

const log = [];
const playing = new Set();
let ctx = null;

const engine = new Engine();
let world = null;

function trace(name, args) {
  log.push({ t: performance.now(), name, args });
  if (log.length > 600) log.shift();
  if (CONFIG.debug.traceStubs) console.debug('[snd]', name, ...args);
}

/* The cue vocabulary. Unchanged from prompt 1 — that was the contract. */
export const CUES = [
  'bed_room_day', 'bed_room_night', 'bed_street_day', 'bed_street_night',
  'bed_rain', 'bed_silence_total',
  'bed_fridge_hum', 'bed_pipes', 'bed_tv_static', 'bed_water_running',
  'bed_hotplate', 'bed_wind_through_bars',

  'step', 'step_crouch', 'breath_calm', 'breath_tight', 'breath_failing',
  'lie_down', 'get_up', 'stomach',

  'switch_on', 'switch_off', 'curtain_open', 'curtain_close',
  'fridge_open', 'fridge_close', 'cabinet', 'tap_on', 'tap_off',
  'door_open', 'door_close', 'door_locked', 'chain_rattle',
  'tv_on', 'tv_off', 'tv_channel', 'pc_boot', 'pc_fan', 'keyclack',
  'phone_ring', 'phone_pickup', 'phone_hangup', 'phone_buzz', 'phone_dead',
  'marker_squeak', 'paper', 'shotgun_pickup', 'shell_load', 'shotgun_fire',
  'shotgun_dryfire', 'eat_cold', 'eat_hot', 'dishes',

  'collapse_distant', 'collapse_near', 'collapse_adjacent',
  'debris_settle', 'car_alarm', 'car_alarm_stop', 'siren_far', 'siren_cut',
  'dog_bark', 'dog_bark_last', 'birds', 'gull',
  'helicopter', 'convoy', 'gunfire_far', 'gunfire_close',
  'water_rising', 'street_shout', 'street_running', 'street_silence',

  'crawler_scratch', 'crawler_swarm', 'crawler_hit', 'crawler_die',
  'gleaner_chitter', 'gleaner_pick',
  'tormentor_step', 'tormentor_pause', 'tormentor_wreckage',
  'anguish_arrival', 'anguish_present',
  'incursion_write', 'incursion_door', 'incursion_test', 'incursion_voice',
  'choir_call', 'choir_wrong', 'zanuwam_warmth', 'pathogen_hum',

  'day_advance', 'day_fail', 'ending_keys', 'ending_brave', 'ending_found',
  'understanding_tick',
  'menu_move', 'menu_select', 'overlay_in', 'overlay_out',
];

const CUE_SET = new Set(CUES);

/* ------------------------------------------------------------------ */
/* captions (§8) — directional, because direction is gameplay          */
/* ------------------------------------------------------------------ */

const CAPTIONS = {
  collapse_distant:  { text: 'distant structural collapse', dir: 'north' },
  collapse_near:     { text: 'structural collapse — close', dir: 'north' },
  collapse_adjacent: { text: 'STRUCTURAL COLLAPSE — ADJACENT', dir: 'north' },
  tormentor_pause:   { text: '(nothing. it is waiting.)', dir: 'north' },
  tormentor_wreckage:{ text: 'something moving in the wreckage', dir: 'north' },
  crawler_scratch:   { text: 'scratching, low, near the door', dir: 'below — east' },
  crawler_swarm:     { text: 'scratching — several, low', dir: 'below' },
  gleaner_chitter:   { text: 'small wet sounds, many', dir: 'west — the street' },
  anguish_arrival:   { text: 'silence', dir: '' },
  anguish_present:   { text: '(silence)', dir: '' },
  choir_call:        { text: 'a voice in the street, calling', dir: 'west — below' },
  choir_wrong:       { text: 'a voice in the street', dir: 'west — below' },
  incursion_door:    { text: 'weight on the landing board', dir: 'east' },
  incursion_test:    { text: 'the handle, tried once, released', dir: 'east' },
  incursion_write:   { text: 'writing — pencil on wood', dir: 'east' },
  incursion_voice:   { text: 'a voice at the door', dir: 'east' },
  zanuwam_warmth:    { text: 'the room gets warmer', dir: '' },
  pathogen_hum:      { text: 'the machine\'s fan changes pitch', dir: 'ahead' },
  shotgun_fire:      { text: 'SHOTGUN — the loudest sound in eleven blocks', dir: '' },
  gunfire_far:       { text: 'gunfire, blocks away', dir: 'north' },
  gunfire_close:     { text: 'gunfire, close', dir: 'north' },
  siren_far:         { text: 'sirens, distant', dir: 'west' },
  water_rising:      { text: 'water, moving, below', dir: 'below — west' },
  bed_tv_static:     { text: 'static', dir: 'ahead' },
  bed_water_running: { text: 'the tap running', dir: 'east' },
  bed_hotplate:      { text: 'the hotplate ticking', dir: 'east' },
  street_silence:    { text: 'the street has stopped', dir: '' },
  dog_bark:          { text: 'a dog, streets away', dir: 'west' },
  dog_bark_last:     { text: 'a dog, once, and then not again', dir: 'west' },
  door_locked:       { text: 'the deadbolt, not moving', dir: 'east' },
  chain_rattle:      { text: 'the chain', dir: 'east' },
  phone_buzz:        { text: 'the phone, on the desk', dir: 'north' },
  phone_ring:        { text: 'ringing', dir: '' },
  phone_dead:        { text: 'the call does not connect', dir: '' },
};

/* ------------------------------------------------------------------ */
/* where things are, in the world                                      */
/* ------------------------------------------------------------------ */

const AT = {
  fridge:   { x: 3.75, y: 0.8, z: -3.05 },
  sink:     { x: 2.55, y: 0.9, z: -3.22 },
  hotplate: { x: 1.55, y: 0.95, z: -3.2 },
  tv:       { x: 0.25, y: 0.78, z: 0.5 },
  desk:     { x: -2.3, y: 0.78, z: -3.2 },
  door:     { x: 6.3, y: 1.0, z: 0.1 },
  landing:  { x: 5.0, y: 0.2, z: 0.4 },
  window:   { x: -4.2, y: 1.5, z: -0.2 },
  street:   { x: -9.0, y: -2.6, z: 0 },
  north:    { x: -6, y: -1, z: -22 },
  bath:     { x: 1.7, y: 0.9, z: 2.6 },
};

export const audio = {

  /* ---- lifecycle -------------------------------------------------- */

  init(context) {
    ctx = context;
    trace('init', []);
  },

  /** Web Audio needs a gesture. Every click routes here. */
  unlock() {
    if (!engine.ctx) {
      if (!engine.init()) return;
      world = new SoundWorld(engine);
      engine.setLevel('master', CONFIG.a11y.masterVolume * 0.7);
      engine.setLimiter(CONFIG.a11y.limiter);
      bus.emit('audio:unlocked');
    }
    engine.resume();
    trace('unlock', []);
  },

  /** Called once the player is actually in the room. */
  startWorld() {
    if (!engine.ready) return;
    if (!world) world = new SoundWorld(engine);
    world.start();
  },

  update(dt) {
    if (!engine.ready || !ctx || !ctx.camera) return;
    const cam = ctx.camera;
    this._fwd = this._fwd || { x: 0, y: 0, z: -1 };
    const e = cam.matrixWorld.elements;
    // Third column of the world matrix, negated, is the look direction.
    engine.setListener(
      cam.position,
      { x: -e[8], y: -e[9], z: -e[10] },
      { x: e[4], y: e[5], z: e[6] });

    if (ctx.world && ctx.world.controls && ctx.world.controls.room) {
      const r = ctx.world.controls.room;
      if (r !== engine.room) { engine.setRoom(r); if (world) world.setRoomTone(r); }
    }
    void dt;
  },

  /* ---- the bus ---------------------------------------------------- */

  play(cue, opts = {}) {
    if (!CUE_SET.has(cue)) console.warn('[snd] unknown cue:', cue);
    if (opts.loop) playing.add(cue);
    trace('play', [cue, opts]);

    const cap = CAPTIONS[cue];
    if (cap) bus.emit('caption', { text: cap.text, dir: opts.dir ?? cap.dir, cue });

    if (!engine.ready) return;
    try { this._render(cue, opts); } catch (e) { console.warn('[snd]', cue, e); }
  },

  stop(cue, opts = {}) {
    playing.delete(cue);
    trace('stop', [cue, opts]);
    if (!engine.ready) return;
    const h = this._loops && this._loops[cue];
    if (h) { h.stop(); delete this._loops[cue]; }
    if (cue === 'bed_tv_static') { if (world) world.tvOff(); }
  },

  bed(cue, opts = {}) {
    trace('bed', [cue, opts]);
    if (!engine.ready || !world) return;
    if (cue === 'bed_silence_total') engine.silence(opts.seconds ?? 9);
  },

  duck(amount = 0.4, seconds = 0.3) {
    trace('duck', [amount, seconds]);
    if (engine.ready) engine.duck(amount, seconds);
  },

  master(v) {
    trace('master', [v]);
    engine.setLevel('master', v * 0.7);
  },

  level(which, v) { engine.setLevel(which, v); },
  limiter(on) { engine.setLimiter(on); },

  isPlaying(cue) { return playing.has(cue); },

  /* ---- the day ---------------------------------------------------- */

  applyDay(day) { if (world) world.applyDay(day); },
  startMusic(i) { if (world) world.startMusic(i); },
  stopMusic() { if (world) world.stopMusic(); },
  forceFridgeOff() { return world ? world.forceFridgeOff() : false; },
  get fridgeRunning() { return world ? world.fridgeRunning : false; },

  /* ---- rendering the cues ----------------------------------------- */

  _render(cue, opts) {
    const at = opts.at
      ? (Array.isArray(opts.at) ? { x: opts.at[0], y: opts.at[1], z: opts.at[2] } : opts.at)
      : null;
    const C = engine.ctx;
    const iface = engine.buses.interface;
    this._loops = this._loops || {};

    const place = (where, extra = {}) =>
      engine.place(extra.bus || 'effects', { ...(at || AT[where] || AT.desk), ...extra });

    switch (cue) {

      /* --- the body ------------------------------------------------ */
      case 'step': case 'step_crouch': {
        const room = engine.room;
        // Laminate, lino, tile and the mat all sound different underfoot.
        const f = { main: 260, kitchen: 420, hall: 400, bath: 900, bedroom: 200, landing: 520 }[room] || 300;
        const q = room === 'bath' ? 2.4 : 1.1;
        const g = engine.place('effects', { x: ctx.camera.position.x, y: 0.05, z: ctx.camera.position.z, refDistance: 1, wet: room === 'bath' || room === 'landing' ? 0.6 : 0.2 });
        S.click(C, g, { freq: f, decay: cue === 'step_crouch' ? 0.02 : 0.045, level: cue === 'step_crouch' ? 0.05 : 0.11 });
        S.thud(C, g, { freq: 62, level: cue === 'step_crouch' ? 0.03 : 0.07, decay: 0.05 });
        void q;
        break;
      }
      case 'breath_calm': case 'breath_tight': case 'breath_failing': {
        const lvl = { breath_calm: 0.03, breath_tight: 0.055, breath_failing: 0.085 }[cue];
        const g = S.gain(C, 0);
        g.connect(engine.buses.effects);
        const n = S.src(C, S.noiseBuffer(C, 2, 'pink'), { rate: 0.8 });
        const bp = S.filt(C, 'bandpass', cue === 'breath_failing' ? 900 : 620, 1.2);
        n.connect(bp).connect(g);
        const t = C.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(lvl, t + 0.28);
        g.gain.setTargetAtTime(0, t + 0.4, 0.22);
        n.start(t); n.stop(t + 2);
        setTimeout(() => { try { g.disconnect(); } catch { /* gone */ } }, 2500);
        break;
      }
      case 'lie_down': case 'get_up': {
        const g = place('desk', { refDistance: 0.8 });
        // Fifteen days of a bad back, and the mat, and the clothes.
        const n = S.src(C, S.noiseBuffer(C, 2, 'pink'), { rate: 0.5 });
        const bp = S.filt(C, 'bandpass', 480, 0.8);
        const gg = S.gain(C, 0);
        n.connect(bp).connect(gg).connect(g);
        const t = C.currentTime;
        gg.gain.setValueAtTime(0, t);
        gg.gain.linearRampToValueAtTime(0.10, t + 0.15);
        gg.gain.setTargetAtTime(0, t + 0.5, 0.4);
        n.start(t); n.stop(t + 3);
        if (cue === 'get_up') S.thud(C, g, { freq: 70, level: 0.06, decay: 0.2, when: t + 0.6 });
        break;
      }
      case 'stomach':
        S.thud(C, engine.buses.effects, { freq: 48, level: 0.05, decay: 0.45 });
        break;

      /* --- interaction --------------------------------------------- */
      case 'switch_on': case 'switch_off':
        S.click(C, place('desk', { refDistance: 0.9 }), { freq: 3200, decay: 0.008, level: 0.22 });
        break;
      case 'curtain_open': case 'curtain_close': {
        const g = place('window', { refDistance: 1.0, wet: 0.3 });
        const n = S.src(C, S.noiseBuffer(C, 2, 'white'), { rate: 0.4 });
        const bp = S.filt(C, 'bandpass', 2600, 1.6);
        const gg = S.gain(C, 0);
        n.connect(bp).connect(gg).connect(g);
        const t = C.currentTime;
        gg.gain.setValueAtTime(0, t);
        gg.gain.linearRampToValueAtTime(0.13, t + 0.05);
        gg.gain.setTargetAtTime(0, t + 0.28, 0.09);
        n.start(t); n.stop(t + 1.5);
        // The rings on the wire.
        for (let i = 0; i < 5; i++) {
          S.click(C, g, { when: t + i * 0.06 + Math.random() * 0.03, freq: 4200 + Math.random() * 2000, decay: 0.006, level: 0.06 });
        }
        break;
      }
      case 'fridge_open': case 'fridge_close': {
        const g = place('fridge', { refDistance: 1.0 });
        S.thud(C, g, { freq: 95, level: cue === 'fridge_close' ? 0.22 : 0.12, decay: 0.08 });
        S.click(C, g, { freq: 700, decay: 0.03, level: 0.1 });
        break;
      }
      case 'cabinet':
        S.click(C, place('hotplate', { refDistance: 1.0 }), { freq: 500, decay: 0.05, level: 0.14 });
        break;
      case 'tap_on': case 'tap_off':
        S.click(C, place('sink', { refDistance: 1.0 }), { freq: 1200, decay: 0.02, level: 0.09 });
        break;
      case 'bed_water_running': {
        const g = place('sink', { refDistance: 1.2, wet: 0.4, bus: 'ambient' });
        const n = S.src(C, S.noiseBuffer(C, 4, 'white'), { rate: 0.9 });
        const bp = S.filt(C, 'bandpass', 2400, 0.7);
        const hp = S.filt(C, 'highpass', 700);
        const gg = S.gain(C, 0);
        n.connect(bp).connect(hp).connect(gg).connect(g);
        n.start();
        S.ramp(gg.gain, 0.14, 0.3, C.currentTime);
        this._loops[cue] = { stop() { S.ramp(gg.gain, 0, 0.2, C.currentTime); setTimeout(() => n.stop(), 400); } };
        break;
      }
      case 'bed_hotplate': {
        const g = place('hotplate', { refDistance: 1.2, bus: 'ambient' });
        const gg = S.gain(C, 0.0);
        gg.connect(g);
        const tick = () => {
          if (!this._loops[cue]) return;
          S.click(C, gg, { freq: 3000 + Math.random() * 1500, decay: 0.01, level: 0.5 });
          this._loops[cue].t = setTimeout(tick, 900 + Math.random() * 2600);
        };
        S.ramp(gg.gain, 0.1, 0.5, C.currentTime);
        this._loops[cue] = { stop() { clearTimeout(this.t); S.ramp(gg.gain, 0, 0.3, C.currentTime); } };
        tick();
        break;
      }
      case 'door_open': case 'door_close':
        S.thud(C, place('door', { refDistance: 1.6, wet: 0.5 }), { freq: 78, level: 0.24, decay: 0.14 });
        break;
      case 'door_locked':
        S.click(C, place('door', { refDistance: 1.6, wet: 0.5 }), { freq: 340, decay: 0.02, level: 0.2 });
        break;
      case 'chain_rattle': {
        const g = place('door', { refDistance: 1.6, wet: 0.5 });
        for (let i = 0; i < 7; i++) {
          S.click(C, g, { when: C.currentTime + i * 0.045 + Math.random() * 0.03, freq: 3600 + Math.random() * 2400, decay: 0.007, level: 0.12 });
        }
        break;
      }
      case 'marker_squeak': {
        const g = place('desk', { refDistance: 1.0 });
        const o = C.createOscillator();
        o.type = 'sawtooth';
        const t = C.currentTime;
        o.frequency.setValueAtTime(680, t);
        o.frequency.linearRampToValueAtTime(1250, t + 0.22);
        const bp = S.filt(C, 'bandpass', 1400, 6);
        const gg = S.gain(C, 0);
        o.connect(bp).connect(gg).connect(g);
        gg.gain.setValueAtTime(0, t);
        gg.gain.linearRampToValueAtTime(0.06, t + 0.03);
        gg.gain.setTargetAtTime(0, t + 0.16, 0.05);
        o.start(t); o.stop(t + 0.6);
        break;
      }
      case 'paper': case 'keyclack':
        S.click(C, place('desk', { refDistance: 0.9 }), { freq: cue === 'paper' ? 2800 : 1800, decay: 0.012, level: 0.07 });
        break;
      case 'dishes': {
        const g = place('sink', { refDistance: 1.1 });
        for (let i = 0; i < 5; i++) {
          S.click(C, g, { when: C.currentTime + i * 0.13 + Math.random() * 0.1, freq: 2200 + Math.random() * 2600, decay: 0.06, level: 0.09, type: 'triangle' });
        }
        break;
      }
      case 'eat_cold': case 'eat_hot':
        S.click(C, place('hotplate', { refDistance: 1.2 }), { freq: 800, decay: 0.04, level: 0.06 });
        break;

      /* --- screens -------------------------------------------------- */
      case 'tv_on':
        if (world) world.tvOn(ctx.state ? ctx.state.day : 1);
        // The degauss thump every CRT makes when it wakes up.
        S.thud(C, place('tv', { refDistance: 1.1 }), { freq: 120, level: 0.2, decay: 0.09 });
        break;
      case 'tv_off':
        if (world) world.tvOff();
        S.click(C, place('tv', { refDistance: 1.1 }), { freq: 1600, decay: 0.02, level: 0.12 });
        break;
      case 'tv_channel':
        S.click(C, place('tv', { refDistance: 1.1 }), { freq: 900, decay: 0.03, level: 0.1 });
        break;
      case 'bed_tv_static':
        if (world) { world.tvOn(ctx.state ? ctx.state.day : 15); world.tvMode('snow', ctx.state ? ctx.state.day : 15); }
        break;
      case 'pc_boot': {
        const g = place('desk', { refDistance: 1.1 });
        S.click(C, g, { freq: 2000, decay: 0.01, level: 0.14 });
        const n = S.src(C, S.noiseBuffer(C, 4, 'pink'), { rate: 0.35 });
        const lp = S.filt(C, 'lowpass', 700);
        const gg = S.gain(C, 0);
        n.connect(lp).connect(gg).connect(g);
        n.start();
        S.ramp(gg.gain, 0.08, 1.6, C.currentTime);
        this._loops.pc_fan = { stop() { S.ramp(gg.gain, 0, 0.6, C.currentTime); setTimeout(() => n.stop(), 900); } };
        break;
      }
      case 'pc_fan': break;

      case 'phone_buzz': {
        const g = place('desk', { refDistance: 0.9 });
        for (let i = 0; i < 2; i++) {
          const t = C.currentTime + i * 0.42;
          S.thud(C, g, { when: t, freq: 140, level: 0.12, decay: 0.05 });
          S.click(C, g, { when: t, freq: 220, decay: 0.09, level: 0.08 });
        }
        break;
      }
      case 'phone_ring': case 'phone_pickup': case 'phone_hangup': case 'phone_dead':
        S.click(C, place('desk', { refDistance: 0.9 }), { freq: cue === 'phone_dead' ? 480 : 1000, decay: 0.05, level: 0.08, type: 'sine' });
        break;

      /* --- the shotgun ---------------------------------------------- */
      case 'shotgun_fire':
        engine.duck(0.6, 0.05);
        S.shotgun(C, engine.buses.effects);
        setTimeout(() => engine.duck(0, 2.5), 900);
        break;
      case 'shotgun_pickup': case 'shell_load':
        S.click(C, place('landing', { refDistance: 1.2, wet: 0.5 }), { freq: 1400, decay: 0.02, level: 0.14 });
        break;
      case 'shotgun_dryfire':
        S.click(C, engine.buses.effects, { freq: 2600, decay: 0.006, level: 0.2 });
        break;

      /* --- outside -------------------------------------------------- */
      case 'collapse_distant':
      case 'collapse_near':
      case 'collapse_adjacent': {
        const d = { collapse_distant: 0.86, collapse_near: 0.52, collapse_adjacent: 0.18 }[cue];
        // Direction and distance are real: when it moves to the next block
        // the player hears that it is nearer.
        const p = engine.place('effects', {
          x: AT.north.x + (opts.dx || 0), y: -1, z: AT.north.z * d + (opts.dz || 0),
          refDistance: 8, rolloff: 0.4, wet: 0.8,
        });
        S.collapse(C, p, { distance: d });
        engine.duck(0.35, 0.4);
        setTimeout(() => engine.duck(0, 3), 2600);
        break;
      }
      case 'tormentor_pause':
        // The gap IS the sound. Nothing plays. The caption fires above.
        break;
      case 'tormentor_wreckage': case 'debris_settle': {
        const p = engine.place('effects', { ...AT.north, refDistance: 9, rolloff: 0.4, wet: 0.7 });
        for (let i = 0; i < 6; i++) {
          S.click(C, p, { when: C.currentTime + Math.random() * 2.5, freq: 200 + Math.random() * 300, decay: 0.09, level: 0.09 });
        }
        break;
      }
      case 'gunfire_far': case 'gunfire_close': {
        const near = cue === 'gunfire_close';
        const p = engine.place('effects', { x: -7, y: -2, z: near ? -8 : -26, refDistance: near ? 6 : 14, rolloff: 0.5, wet: 0.7 });
        const n = 2 + Math.floor(Math.random() * 5);
        for (let i = 0; i < n; i++) {
          S.click(C, p, { when: C.currentTime + i * (0.12 + Math.random() * 0.2), freq: 420, decay: 0.05, level: near ? 0.3 : 0.12 });
        }
        break;
      }
      case 'siren_far': if (world) world._siren(); break;
      case 'dog_bark': case 'dog_bark_last': if (world) world._dogBark(); break;
      case 'gull': case 'birds': if (world) world._gull(); break;
      case 'street_silence': engine.silence(opts.seconds ?? 7); break;
      case 'water_rising': {
        const p = engine.place('effects', { x: -9, y: -3, z: 8, refDistance: 8, rolloff: 0.6, wet: 0.6 });
        const n = S.src(C, S.noiseBuffer(C, 4, 'brown'), { rate: 0.3 });
        const lp = S.filt(C, 'lowpass', 300);
        const g = S.gain(C, 0);
        n.connect(lp).connect(g).connect(p);
        const t = C.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.1, t + 2);
        g.gain.setTargetAtTime(0, t + 5, 2);
        n.start(t); n.stop(t + 12);
        break;
      }

      /* --- entities ------------------------------------------------- */
      case 'crawler_scratch': case 'crawler_swarm': {
        // Always BELOW waist height, and never in front. The sound comes
        // from where the player cannot easily look.
        const behind = Math.random() < 0.5 ? 1 : -1;
        const p = engine.place('effects', {
          x: ctx.camera.position.x + behind * (1.2 + Math.random()),
          y: 0.12,
          z: ctx.camera.position.z + (Math.random() - 0.5) * 2.4,
          refDistance: 1.4, rolloff: 1.4, wet: 0.35,
        });
        const n = cue === 'crawler_swarm' ? 4 : 1;
        for (let i = 0; i < n; i++) S.scratch(C, p, { when: C.currentTime + i * 0.5 });
        break;
      }
      case 'crawler_hit': case 'crawler_die':
        S.thud(C, place('landing', { refDistance: 1.6 }), { freq: 110, level: 0.28, decay: 0.12 });
        break;
      case 'gleaner_chitter': case 'gleaner_pick': {
        const p = engine.place('effects', { x: -9, y: -2.6, z: -4, refDistance: 6, rolloff: 0.8, wet: 0.5 });
        S.gleanerFlock(C, p, { count: 18 });
        break;
      }
      case 'anguish_arrival':
        // Every layer. Room tone, fridge, street, everything. A cut.
        engine.silence(opts.seconds ?? 11);
        break;
      case 'anguish_present':
        engine.silence(opts.seconds ?? 14);
        break;

      case 'incursion_door': case 'incursion_test': {
        const p = engine.place('effects', { ...AT.landing, refDistance: 1.8, wet: 0.6 });
        S.thud(C, p, { freq: 58, level: 0.10, decay: 0.16 });
        if (cue === 'incursion_test') {
          S.click(C, p, { when: C.currentTime + 0.9, freq: 380, decay: 0.02, level: 0.09 });
        }
        break;
      }
      case 'incursion_write': {
        const p = engine.place('effects', { ...AT.door, refDistance: 1.6, wet: 0.5 });
        for (let i = 0; i < 9; i++) {
          S.scratch(C, p, { when: C.currentTime + i * 0.28, length: 0.2 });
        }
        break;
      }
      case 'incursion_voice': case 'choir_call': case 'choir_wrong': {
        // §4.5. The same voice print the player has been hearing since
        // Day 1, from the street, below and outside — and wrong.
        const print = S.voicePrint(opts.voice || 'ray');
        const p = engine.place('effects', {
          x: -6.5, y: -2.4, z: 0.5, refDistance: 3.5, rolloff: 0.8,
          // An outdoor voice with an indoor tail. Nobody can name this cue
          // and everybody feels it.
          wet: 0.55,
        });
        const n = 3 + Math.floor(Math.random() * 3);
        for (let i = 0; i < n; i++) {
          S.callVoice(C, p, print, {
            when: C.currentTime + i * (1.9 + Math.random() * 0.8),
            syllables: 2,
            wrong: cue === 'choir_wrong' ? 0.85 : 0.55,
          });
        }
        break;
      }
      case 'zanuwam_warmth': {
        const g = S.gain(C, 0);
        g.connect(engine.buses.ambient);
        const o = C.createOscillator();
        o.type = 'sine';
        o.frequency.value = 41;
        o.connect(g);
        const t = C.currentTime;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 3);
        g.gain.setTargetAtTime(0, t + 9, 3);
        o.start(t); o.stop(t + 20);
        break;
      }
      case 'pathogen_hum': {
        const g = place('desk', { refDistance: 1.0 });
        const o = C.createOscillator();
        o.type = 'sawtooth';
        const t = C.currentTime;
        o.frequency.setValueAtTime(1900, t);
        o.frequency.exponentialRampToValueAtTime(240, t + 3.5);
        const lp = S.filt(C, 'lowpass', 1400);
        const gg = S.gain(C, 0);
        o.connect(lp).connect(gg).connect(g);
        gg.gain.setValueAtTime(0, t);
        gg.gain.linearRampToValueAtTime(0.07, t + 0.6);
        gg.gain.setTargetAtTime(0, t + 3, 1.2);
        o.start(t); o.stop(t + 8);
        break;
      }

      /* --- structure ------------------------------------------------ */
      case 'menu_move':
        S.click(C, iface, { freq: 1400, decay: 0.008, level: 0.03 });
        break;
      case 'menu_select':
        S.click(C, iface, { freq: 900, decay: 0.012, level: 0.045 });
        break;
      case 'overlay_in': case 'overlay_out':
        S.click(C, iface, { freq: cue === 'overlay_in' ? 600 : 480, decay: 0.02, level: 0.03, type: 'sine' });
        break;
      case 'understanding_tick':
        // Deliberately near-silent. Prompt 3 was permitted to drop it and
        // it very nearly is dropped.
        S.click(C, iface, { freq: 5200, decay: 0.004, level: 0.006 });
        break;
      case 'day_advance': case 'day_fail':
        break;

      /* --- the endings (§6) ----------------------------------------- */
      case 'ending_keys': {
        // Engine noise and road. No swell. Earning it should not feel
        // triumphant, so there is no music here at all.
        const g = S.gain(C, 0);
        g.connect(engine.buses.ambient);
        const n = S.src(C, S.noiseBuffer(C, 4, 'brown'), { rate: 0.45 });
        const lp = S.filt(C, 'lowpass', 380, 0.7);
        n.connect(lp).connect(g);
        n.start();
        const o = C.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = 63;
        const og = S.gain(C, 0.05);
        const olp = S.filt(C, 'lowpass', 200);
        o.connect(olp).connect(og).connect(g);
        o.start();
        S.ramp(g.gain, 0.5, 2.5, C.currentTime);
        this._loops.ending = { stop() { S.ramp(g.gain, 0, 1.5, C.currentTime); } };
        break;
      }
      case 'ending_brave': {
        // A single sustained tone, entering slowly. The first music in six
        // in-game days, and the player will notice that.
        setTimeout(() => {
          if (!engine.ready) return;
          this._loops.ending = S.drone(C, engine.buses.music, { root: 55, level: 0.07 });
        }, 3500);
        break;
      }
      case 'ending_found':
        // Nothing. The room tone continues as if nothing happened.
        break;
    }
  },

  /* ---- menu drone -------------------------------------------------- */

  menuDrone(on) {
    if (!engine.ready) return;
    if (on && !this._menuDrone) {
      this._menuDrone = S.drone(engine.ctx, engine.buses.music, { root: 41, level: 0.055 });
    } else if (!on && this._menuDrone) {
      this._menuDrone.stop();
      this._menuDrone = null;
    }
  },

  /* ---- debug ------------------------------------------------------ */
  _log() { return log.slice(); },
  _playing() { return [...playing]; },
  _ctx() { return ctx; },
  _engine() { return engine; },
  _world() { return world; },
  debug() { return engine.debug(); },
};

export default audio;
