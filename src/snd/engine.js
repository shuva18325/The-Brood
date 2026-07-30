/**
 * engine.js — the AudioContext, the buses, the rooms, and the mix.
 *
 * §7: mix QUIET. The default level should tempt the player to turn it up,
 * which puts them at the mercy of the loud events. The master is not
 * compressed — the gap between room tone and a collapse is the whole point.
 *
 * There is one optional limiter, off by default, for players who cannot
 * risk peaks. Everyone else gets the full dynamic range.
 */

import * as S from './synth.js';
import { CONFIG } from '../config.js';
import bus from '../bus.js';

export const BUSES = ['ambient', 'effects', 'interface', 'music'];

/** Each room's impulse response, and how the tone in it is coloured. */
const ROOMS = {
  main:    { seconds: 0.42, decay: 3.2, damp: 0.42, predelay: 0.004, stereo: 0.55, wet: 0.16 },
  kitchen: { seconds: 0.36, decay: 3.6, damp: 0.50, predelay: 0.003, stereo: 0.45, wet: 0.18 },
  hall:    { seconds: 0.30, decay: 4.0, damp: 0.46, predelay: 0.002, stereo: 0.35, wet: 0.20 },
  // Tighter, higher, tiled. Identifiable with your eyes closed.
  bath:    { seconds: 0.85, decay: 2.1, damp: 0.86, predelay: 0.002, stereo: 0.30, wet: 0.42 },
  // Fabric absorbs. A room where something has stopped.
  bedroom: { seconds: 0.20, decay: 5.5, damp: 0.22, predelay: 0.002, stereo: 0.40, wet: 0.09 },
  // Larger, colder, more reverberant, and there is a stairwell under it.
  landing: { seconds: 1.60, decay: 1.7, damp: 0.70, predelay: 0.010, stereo: 0.75, wet: 0.46 },
};

export class Engine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.room = 'main';
    this.buses = {};
    this.levels = { master: 0.55, ambient: 1, effects: 1, interface: 0.8, music: 1 };
    this.limiterOn = false;
    this._silence = 0;          // >0 while Anguish is on the block
    this._duck = 1;
  }

  /* ---------------------------------------------------------------- */

  init() {
    if (this.ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const ctx = this.ctx;

    /* --- master chain -------------------------------------------- */
    this.master = S.gain(ctx, this.levels.master);
    // Optional, and OFF. Compressing this master would flatten the only
    // dynamic that matters.
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -6;
    this.limiter.knee.value = 0;
    this.limiter.ratio.value = 20;
    this.limiter.attack.value = 0.002;
    this.limiter.release.value = 0.18;
    this.bypass = S.gain(ctx, 1);

    this.master.connect(this.bypass).connect(ctx.destination);

    /* --- the hard silence gate (§4.4) ------------------------------
     * Everything routes through this. When Anguish is on the block it
     * goes to zero and stays there, and the result is true digital
     * silence, which never happens in a building and feels physically
     * wrong within about two seconds. */
    this.gate = S.gain(ctx, 1);
    this.gate.connect(this.master);

    for (const b of BUSES) {
      const g = S.gain(ctx, this.levels[b]);
      g.connect(this.gate);
      this.buses[b] = g;
    }

    /* --- rooms ---------------------------------------------------- */
    this.convolvers = {};
    this.roomSends = {};
    for (const [name, cfg] of Object.entries(ROOMS)) {
      const c = ctx.createConvolver();
      c.buffer = S.impulseResponse(ctx, cfg);
      const wet = S.gain(ctx, name === this.room ? cfg.wet : 0);
      c.connect(wet).connect(this.buses.ambient);
      this.convolvers[name] = c;
      this.roomSends[name] = wet;
    }
    // Everything positional goes through the current room's convolver.
    this.roomSend = S.gain(ctx, 1);
    for (const c of Object.values(this.convolvers)) this.roomSend.connect(c);

    /* --- listener ------------------------------------------------- */
    this.listener = ctx.listener;

    this.ready = true;
    bus.emit('audio:ready');
    return true;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  /* ---------------------------------------------------------------- */
  /* positioning                                                       */
  /* ---------------------------------------------------------------- */

  /**
   * A positional node. HRTF throughout — this is a headphone-first mix and
   * elevation is gameplay: Crawlers are always BELOW, and the player has to
   * hear that they are below.
   */
  panner({ x = 0, y = 0, z = 0, refDistance = 1.6, rolloff = 1.1, maxDistance = 60 } = {}) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = refDistance;
    p.rolloffFactor = rolloff;
    p.maxDistance = maxDistance;
    if (p.positionX) {
      p.positionX.value = x; p.positionY.value = y; p.positionZ.value = z;
    } else {
      p.setPosition(x, y, z);
    }
    return p;
  }

  /** Route a positional source into a bus, with the current room's tail. */
  place(busName, opts) {
    const p = this.panner(opts);
    p.connect(this.buses[busName] || this.buses.effects);
    const send = S.gain(this.ctx, opts.wet ?? 0.35);
    p.connect(send).connect(this.roomSend);
    return p;
  }

  /** The listener follows the camera. Called every frame. */
  setListener(pos, forward, up) {
    if (!this.ready) return;
    const L = this.listener;
    if (L.positionX) {
      const t = this.ctx.currentTime;
      L.positionX.setTargetAtTime(pos.x, t, 0.02);
      L.positionY.setTargetAtTime(pos.y, t, 0.02);
      L.positionZ.setTargetAtTime(pos.z, t, 0.02);
      L.forwardX.setTargetAtTime(forward.x, t, 0.02);
      L.forwardY.setTargetAtTime(forward.y, t, 0.02);
      L.forwardZ.setTargetAtTime(forward.z, t, 0.02);
      L.upX.value = up.x; L.upY.value = up.y; L.upZ.value = up.z;
    } else {
      L.setPosition(pos.x, pos.y, pos.z);
      L.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
    }
  }

  /** Move the reverb to the room the player is standing in. */
  setRoom(name) {
    if (!this.ready || !ROOMS[name] || name === this.room) return;
    this.room = name;
    const t = this.ctx.currentTime;
    for (const [n, send] of Object.entries(this.roomSends)) {
      S.ramp(send.gain, n === name ? ROOMS[n].wet : 0, 0.35, t);
    }
    bus.emit('audio:room', name);
  }

  /* ---------------------------------------------------------------- */
  /* the mix                                                           */
  /* ---------------------------------------------------------------- */

  setLevel(which, v) {
    this.levels[which] = v;
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    if (which === 'master') S.ramp(this.master.gain, v * this._duck, 0.08, t);
    else if (this.buses[which]) S.ramp(this.buses[which].gain, v, 0.08, t);
  }

  setLimiter(on) {
    this.limiterOn = on;
    if (!this.ready) return;
    try { this.master.disconnect(); } catch { /* fine */ }
    if (on) this.master.connect(this.limiter).connect(this.ctx.destination);
    else this.master.connect(this.bypass);
  }

  /**
   * §7: duck the screens under exterior events. The player's attention is
   * being pulled outside and the mix pulls with it.
   */
  duck(amount = 0.4, seconds = 0.3) {
    if (!this.ready) return;
    this._duck = 1 - amount;
    S.ramp(this.master.gain, this.levels.master * this._duck, seconds, this.ctx.currentTime);
  }

  /* ---------------------------------------------------------------- */
  /* §4.4 — total silence                                              */
  /* ---------------------------------------------------------------- */

  /**
   * Cut every layer. Not a fade — a cut. Hold it longer than is
   * comfortable, then bring the room tone back in alone.
   */
  silence(seconds = 9) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    this._silence = seconds;
    this.gate.gain.cancelScheduledValues(t);
    this.gate.gain.setValueAtTime(0, t);
    bus.emit('audio:silence', seconds);
    clearTimeout(this._silenceTimer);
    this._silenceTimer = setTimeout(() => {
      this._silence = 0;
      // Room tone alone, and slowly. Nothing else comes back for a while.
      const n = this.ctx.currentTime;
      this.gate.gain.setTargetAtTime(1, n, 2.2);
      bus.emit('audio:silenceEnd');
    }, seconds * 1000);
  }

  get silenced() { return this._silence > 0; }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }

  /** For the release tests: how many nodes are alive right now. */
  debug() {
    return {
      state: this.ctx ? this.ctx.state : 'none',
      room: this.room,
      silenced: this.silenced,
      levels: { ...this.levels },
      limiter: this.limiterOn,
      sampleRate: this.ctx ? this.ctx.sampleRate : 0,
    };
  }
}

export const ROOM_DEFS = ROOMS;
export default Engine;
