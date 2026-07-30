/**
 * world.js — the ambient bed, the absence arc, the fridge, and the TV.
 *
 * §1 is the governing principle of this entire file: the scariest sound
 * design in this game is SUBTRACTION. Act 1 is dense and comfortable and
 * believable, and then one layer at a time is removed, on a schedule,
 * without ever calling attention to it.
 *
 * There is no cue on a removal. No sting. No silence-drop. The layer is
 * simply not in the next day's bed.
 */

import * as S from './synth.js';
import state from '../state.js';
import bus from '../bus.js';

/* ------------------------------------------------------------------ */
/* THE ABSENCE ARC                                                     */
/*                                                                     */
/* lastDay is the last day on which the player hears this at all.      */
/* ------------------------------------------------------------------ */

export const LAYERS = {
  //                     lastDay  what it is
  kids:      { lastDay: 3,  caption: 'children, outside' },
  dogs:      { lastDay: 4,  caption: 'a dog, streets away' },
  birds:     { lastDay: 5,  caption: 'gulls' },
  neighbTv:  { lastDay: 6,  caption: 'a television through the wall' },
  traffic:   { lastDay: 7,  caption: 'traffic' },
  sirens:    { firstDay: 4, lastDay: 8, caption: 'sirens, distant' },
  highway:   { lastDay: 10, caption: 'the highway' },
  acUnits:   { lastDay: 12, caption: 'air conditioning units' },
  // Room tone and the fridge are not in this table. They are the floor.
};

export function layerAlive(name, day) {
  const L = LAYERS[name];
  if (!L) return false;
  if (L.firstDay && day < L.firstDay) return false;
  return day <= L.lastDay;
}

/* ------------------------------------------------------------------ */

export class SoundWorld {
  constructor(engine) {
    this.e = engine;
    this.layers = {};
    this.started = false;
    this.day = 0;
    this._fridge = null;
    this._crt = null;
    this._music = null;
    this._eas = null;
    this._dripTimer = null;
  }

  get ctx() { return this.e.ctx; }

  /* ---------------------------------------------------------------- */
  /* ROOM TONE (§2) — the most important sound in the game              */
  /* ---------------------------------------------------------------- */

  start() {
    if (!this.e.ready) return;
    // Already running: the graph is fine, but the day may not be. Starting a
    // new game or loading a save re-applies it.
    if (this.started) { this.applyDay(state.day || 1); return; }
    this.started = true;
    const ctx = this.ctx;

    // Building electrical: a low broadband hum with mains harmonics in it.
    const tone = S.gain(ctx, 0);
    tone.connect(this.e.buses.ambient);
    this.toneGain = tone;

    const bed = S.src(ctx, S.noiseBuffer(ctx, 4, 'brown'));
    const bedLp = S.filt(ctx, 'lowpass', 240, 0.6);
    const bedG = S.gain(ctx, 0.5);
    bed.connect(bedLp).connect(bedG).connect(tone);
    bed.start();

    // 60 Hz and its odd harmonics. This is what a building sounds like.
    this.mains = [];
    for (const [f, l] of [[60, 0.055], [180, 0.022], [300, 0.010]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = S.gain(ctx, l);
      o.connect(g).connect(tone);
      o.start();
      this.mains.push(g);
    }

    // Faint street bleed through the wall.
    const bleed = S.src(ctx, S.noiseBuffer(ctx, 4, 'pink'), { rate: 0.7 });
    const bleedBp = S.filt(ctx, 'bandpass', 420, 0.5);
    this.bleedG = S.gain(ctx, 0.05);
    bleed.connect(bleedBp).connect(this.bleedG).connect(tone);
    bleed.start();

    S.ramp(tone.gain, 1, 3, ctx.currentTime);

    this._buildLayers();
    this._buildFridge();
    this.applyDay(state.day || 1);
  }

  /* ---------------------------------------------------------------- */
  /* the layers                                                        */
  /* ---------------------------------------------------------------- */

  _buildLayers() {
    const ctx = this.ctx;
    const mk = (name, build, pos) => {
      const g = S.gain(ctx, 0);
      const p = pos ? this.e.place('ambient', pos) : this.e.buses.ambient;
      g.connect(p);
      build(g);
      this.layers[name] = { gain: g, target: 0 };
    };

    // Traffic: continuous, low, from the street side.
    mk('traffic', (out) => {
      const n = S.src(ctx, S.noiseBuffer(ctx, 4, 'pink'), { rate: 0.5 });
      const lp = S.filt(ctx, 'lowpass', 700, 0.5);
      const hp = S.filt(ctx, 'highpass', 90);
      n.connect(lp).connect(hp).connect(out);
      n.start();
    }, { x: -6, y: -2, z: 0, refDistance: 4, rolloff: 0.5 });

    // The highway. Further, flatter, and it never stops. Until it does.
    mk('highway', (out) => {
      const n = S.src(ctx, S.noiseBuffer(ctx, 4, 'brown'), { rate: 0.35 });
      const lp = S.filt(ctx, 'lowpass', 260, 0.4);
      n.connect(lp).connect(out);
      n.start();
    }, { x: -14, y: -1, z: -18, refDistance: 10, rolloff: 0.35 });

    // AC units on the building across the street.
    mk('acUnits', (out) => {
      const n = S.src(ctx, S.noiseBuffer(ctx, 4, 'pink'), { rate: 0.45 });
      const bp = S.filt(ctx, 'bandpass', 520, 1.1);
      n.connect(bp).connect(out);
      n.start();
      // Two units, slightly out of phase, because they always are.
      const o = ctx.createOscillator();
      o.frequency.value = 0.7;
      const og = S.gain(ctx, 0.25);
      o.connect(og).connect(out.gain);
      o.start();
    }, { x: -13, y: 1, z: -2, refDistance: 8, rolloff: 0.7 });

    // The neighbour's television through the wall. Muffled speech shapes.
    mk('neighbTv', (out) => {
      const n = S.src(ctx, S.noiseBuffer(ctx, 4, 'pink'), { rate: 0.9 });
      const bp = S.filt(ctx, 'bandpass', 380, 2.2);
      const lp = S.filt(ctx, 'lowpass', 900);
      n.connect(bp).connect(lp).connect(out);
      n.start();
      // Speech cadence: a slow irregular amplitude, never words.
      const lfo = ctx.createOscillator();
      lfo.type = 'square';
      lfo.frequency.value = 2.6;
      const lg = S.gain(ctx, 0.5);
      lfo.connect(lg).connect(out.gain);
      lfo.start();
    }, { x: 5.5, y: 0, z: 2, refDistance: 3, rolloff: 1.4 });

    // Intermittent things get their own scheduler rather than a drone.
    this._sched('kids', 8000, 26000, () => this._kidShout());
    this._sched('dogs', 12000, 40000, () => this._dogBark());
    this._sched('birds', 6000, 22000, () => this._gull());
    this._sched('sirens', 20000, 70000, () => this._siren());
  }

  _sched(name, minMs, maxMs, fn) {
    const tick = () => {
      const L = this.layers[name] || (this.layers[name] = { gain: null, target: 0, intermittent: true });
      L.intermittent = true;
      if (L.target > 0 && !this.e.silenced) fn();
      L.timer = setTimeout(tick, minMs + Math.random() * (maxMs - minMs));
    };
    this.layers[name] = { gain: null, target: 0, intermittent: true };
    this.layers[name].timer = setTimeout(tick, 3000 + Math.random() * 12000);
  }

  _kidShout() {
    const p = this.e.place('ambient', { x: -8, y: -3, z: 4 + Math.random() * 8, refDistance: 5 });
    const print = S.voicePrint('kid' + Math.floor(Math.random() * 3));
    print.f0 *= 2.1;
    S.callVoice(this.ctx, p, print, { syllables: 1 + Math.floor(Math.random() * 2), wrong: 0 });
    bus.emit('caption', { text: 'children, outside', dir: this._dirOf(-8, 6), soft: true });
  }

  _dogBark() {
    const p = this.e.place('ambient', { x: -10 + Math.random() * 6, y: -3, z: -12 + Math.random() * 24, refDistance: 8 });
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t = this.ctx.currentTime + i * (0.28 + Math.random() * 0.2);
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(320 + Math.random() * 90, t);
      o.frequency.exponentialRampToValueAtTime(150, t + 0.14);
      const bp = S.filt(this.ctx, 'bandpass', 700, 1.4);
      const g = S.gain(this.ctx, 0);
      o.connect(bp).connect(g).connect(p);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.32, t + 0.012);
      g.gain.setTargetAtTime(0, t + 0.05, 0.05);
      o.start(t); o.stop(t + 0.5);
    }
    bus.emit('caption', { text: 'a dog, streets away', dir: this._dirOf(-9, 0), soft: true });
  }

  _gull() {
    const p = this.e.place('ambient', { x: -6 + Math.random() * 4, y: 6, z: -6 + Math.random() * 12, refDistance: 9 });
    const t = this.ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const at = t + i * 0.34;
      const o = this.ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(900 + Math.random() * 300, at);
      o.frequency.linearRampToValueAtTime(560, at + 0.22);
      const bp = S.filt(this.ctx, 'bandpass', 1800, 3);
      const g = S.gain(this.ctx, 0);
      o.connect(bp).connect(g).connect(p);
      g.gain.setValueAtTime(0, at);
      g.gain.linearRampToValueAtTime(0.13, at + 0.03);
      g.gain.setTargetAtTime(0, at + 0.12, 0.06);
      o.start(at); o.stop(at + 0.6);
    }
    bus.emit('caption', { text: 'gulls', dir: 'above', soft: true });
  }

  _siren() {
    const p = this.e.place('ambient', { x: -12, y: -3, z: -20 + Math.random() * 40, refDistance: 14, rolloff: 0.6 });
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    o.type = 'sine';
    const g = S.gain(this.ctx, 0);
    const lp = S.filt(this.ctx, 'lowpass', 1400);
    o.connect(lp).connect(g).connect(p);
    const dur = 6 + Math.random() * 5;
    for (let i = 0; i < dur * 2; i++) {
      o.frequency.setValueAtTime(i % 2 ? 660 : 880, t + i * 0.5);
    }
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.10, t + 1.2);
    g.gain.setValueAtTime(0.10, t + dur - 1.5);
    g.gain.setTargetAtTime(0, t + dur - 1.2, 0.6);
    o.start(t); o.stop(t + dur + 1);
    bus.emit('caption', { text: 'sirens, distant', dir: this._dirOf(-12, 0), soft: true });
  }

  /* ---------------------------------------------------------------- */
  /* THE FRIDGE (§3) — a masking system, not decoration                 */
  /* ---------------------------------------------------------------- */

  _buildFridge() {
    const ctx = this.ctx;
    const p = this.e.place('ambient', { x: 3.75, y: 0.8, z: -3.05, refDistance: 1.4, rolloff: 1.3 });

    const out = S.gain(ctx, 0);
    out.connect(p);

    const n = S.src(ctx, S.noiseBuffer(ctx, 4, 'pink'), { rate: 0.4 });
    const lp = S.filt(ctx, 'lowpass', 420, 0.8);
    const ng = S.gain(ctx, 0.35);
    n.connect(lp).connect(ng).connect(out);
    n.start();

    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 118;
    const humG = S.gain(ctx, 0.16);
    hum.connect(humG).connect(out);
    hum.start();

    // The rattle that starts around Day 12.
    const rattle = S.gain(ctx, 0);
    const rn = S.src(ctx, S.noiseBuffer(ctx, 2, 'white'), { rate: 0.3 });
    const rbp = S.filt(ctx, 'bandpass', 1500, 4);
    rn.connect(rbp).connect(rattle).connect(out);
    rn.start();

    this._fridge = { out, hum, humG, rattle, on: false, dead: false, timer: null };
    this._fridgeCycle();
  }

  _fridgeCycle() {
    const F = this._fridge;
    if (!F || F.dead) return;
    const ctx = this.ctx;
    const day = this.day;

    F.on = !F.on;
    const t = ctx.currentTime;

    if (F.on) {
      // Starting harder from Day 12: a mechanical thump on the kick-in.
      if (day >= 12) S.thud(ctx, F.out, { when: t, freq: 70, level: 0.22, decay: 0.09 });
      S.ramp(F.out.gain, 1, day >= 12 ? 0.05 : 0.35, t);
      S.ramp(F.rattle.gain, day >= 12 ? 0.05 : 0, 1.5, t);
      bus.emit('fridge', true);
    } else {
      S.ramp(F.out.gain, 0, 0.9, t);
      S.ramp(F.rattle.gain, 0, 0.4, t);
      bus.emit('fridge', false);
    }

    // Running longer, and less regularly, as it fails.
    const onMs = (day >= 12 ? 55000 : 34000) + Math.random() * 22000;
    const offMs = (day >= 12 ? 12000 : 26000) + Math.random() * 20000;
    F.timer = setTimeout(() => this._fridgeCycle(), F.on ? onMs : offMs);
  }

  /**
   * Force the compressor off, right now. Used ONCE in the whole game, so
   * that a distant collapse becomes audible exactly as the room goes quiet.
   * Never repeated.
   */
  forceFridgeOff() {
    const F = this._fridge;
    if (!F || F.dead || !F.on) return false;
    clearTimeout(F.timer);
    F.on = false;
    S.ramp(F.out.gain, 0, 0.7, this.ctx.currentTime);
    bus.emit('fridge', false);
    F.timer = setTimeout(() => this._fridgeCycle(), 40000);
    return true;
  }

  /** Day 14: it stops for good. The food and the white noise go together. */
  killFridge() {
    const F = this._fridge;
    if (!F || F.dead) return;
    F.dead = true;
    clearTimeout(F.timer);
    S.ramp(F.out.gain, 0, 1.4, this.ctx.currentTime);
    bus.emit('fridge', false);
  }

  /**
   * A save loaded from before Day 14 still has a working compressor. The
   * graph is never rebuilt, so the dead flag has to be lifted instead.
   */
  _reviveFridge() {
    const F = this._fridge;
    if (!F || !F.dead) return;
    F.dead = false;
    F.on = false;
    clearTimeout(F.timer);
    S.ramp(F.out.gain, 0, 0.2, this.ctx.currentTime);
    F.timer = setTimeout(() => this._fridgeCycle(), 4000);
  }

  get fridgeRunning() { return !!(this._fridge && this._fridge.on && !this._fridge.dead); }

  /* ---------------------------------------------------------------- */
  /* the day                                                           */
  /* ---------------------------------------------------------------- */

  applyDay(day) {
    if (!this.started) return;
    this.day = day;
    const t = this.ctx.currentTime;

    for (const name of Object.keys(LAYERS)) {
      const alive = layerAlive(name, day);
      const L = this.layers[name];
      if (!L) continue;
      L.target = alive ? 1 : 0;
      // No cue, no sting. The layer is simply not in today's bed.
      if (L.gain) S.ramp(L.gain.gain, alive ? this._layerLevel(name) : 0, 6, t);
    }

    // Room tone degrades as the building empties: the electrical hum thins
    // and the tone gets colder and more isolated.
    const emptied = Math.min(1, Math.max(0, (day - 3) / 11));
    for (let i = 0; i < this.mains.length; i++) {
      S.ramp(this.mains[i].gain, [0.055, 0.022, 0.010][i] * (1 - emptied * 0.72), 8, t);
    }
    S.ramp(this.bleedG.gain, 0.05 * (1 - emptied * 0.85), 8, t);

    if (day >= 14) this.killFridge();
    else this._reviveFridge();

    // His music stops after Day 9 and never plays again.
    if (day > 9 && this._music) { this._music.stop(); this._music = null; }
  }

  _layerLevel(name) {
    return { traffic: 0.16, highway: 0.11, acUnits: 0.07, neighbTv: 0.05 }[name] ?? 0.1;
  }

  /**
   * The bathroom drip. Irregular, which is the only thing that makes a
   * drip unbearable.
   */
  setRoomTone(room) {
    clearTimeout(this._dripTimer);
    if (room !== 'bath') return;
    const drip = () => {
      if (this.e.room !== 'bath' || this.e.silenced) return;
      const p = this.e.place('ambient', { x: 2.2, y: 0.9, z: 3.3, refDistance: 1, wet: 0.7 });
      S.click(this.ctx, p, { freq: 1400 + Math.random() * 600, decay: 0.02, level: 0.16 });
      this._dripTimer = setTimeout(drip, 2600 + Math.random() * 5200);
    };
    this._dripTimer = setTimeout(drip, 1500 + Math.random() * 3000);
  }

  /* ---------------------------------------------------------------- */
  /* his music (§6)                                                    */
  /* ---------------------------------------------------------------- */

  startMusic(trackIndex) {
    if (this.day > 9 || this._music || !this.e.ready) return;
    // Through a phone speaker, on the counter, in the kitchen. Positional.
    const p = this.e.place('music', { x: 2.2, y: 1.0, z: -3.2, refDistance: 1.2, rolloff: 1.6, wet: 0.5 });
    this._music = S.phoneMusic(this.ctx, p, trackIndex);
    this._music.start();
    bus.emit('caption', { text: 'music, tinny, from the kitchen', dir: 'east', soft: true });
  }

  stopMusic() { if (this._music) { this._music.stop(); this._music = null; } }

  /* ---------------------------------------------------------------- */
  /* the television (§5)                                               */
  /* ---------------------------------------------------------------- */

  tvOn(day) {
    if (this._tv || !this.e.ready) return;
    const ctx = this.ctx;
    const p = this.e.place('effects', { x: 0.25, y: 0.78, z: 0.5, refDistance: 1.1, rolloff: 1.5, wet: 0.3 });

    const out = S.gain(ctx, 0);
    out.connect(p);

    // Programme audio: speech-shaped noise, because there is no dialogue
    // and there was never going to be.
    const speech = S.gain(ctx, 0);
    const sn = S.src(ctx, S.noiseBuffer(ctx, 4, 'pink'), { rate: 1.0 });
    const sbp = S.filt(ctx, 'bandpass', 1100, 1.4);
    sn.connect(sbp).connect(speech).connect(out);
    sn.start();
    const cadence = ctx.createOscillator();
    cadence.type = 'square';
    cadence.frequency.value = 3.1;
    const cg = S.gain(ctx, 0.45);
    cadence.connect(cg).connect(speech.gain);
    cadence.start();

    /* §5.2 — the desync. There is no mouth to drift against, so the
     * studio drifts against itself: the room tone of the studio, the
     * anchor's breath and the desk noise separate from the speech by a
     * growing offset. Never acknowledged. */
    const studio = S.gain(ctx, 0.06);
    const stn = S.src(ctx, S.noiseBuffer(ctx, 4, 'brown'), { rate: 0.5 });
    const stlp = S.filt(ctx, 'lowpass', 300);
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0;
    stn.connect(stlp).connect(delay).connect(studio).connect(out);
    stn.start();

    // Carrier hum, which arrives as the signal goes.
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.frequency.value = 120;
    const carrierG = S.gain(ctx, 0);
    carrier.connect(carrierG).connect(out);
    carrier.start();

    // Snow. Loud and bright, and when the broadcast finally dies the room
    // gets LOUDER, which is worse.
    const snow = S.gain(ctx, 0);
    const snn = S.src(ctx, S.noiseBuffer(ctx, 4, 'white'));
    const snhp = S.filt(ctx, 'highpass', 900);
    snn.connect(snhp).connect(snow).connect(out);
    snn.start();

    this._tv = { out, speech, studio, delay, carrier: carrierG, snow, p };
    this._crt = S.crtWhine(ctx, p, 0.014);

    S.ramp(out.gain, 1, 0.3, ctx.currentTime);
    this.tvMode('news', day);
  }

  tvOff() {
    if (!this._tv) return;
    S.ramp(this._tv.out.gain, 0, 0.15, this.ctx.currentTime);
    // Cut the whine the instant the set loses power. The absence is a cue.
    if (this._crt) { this._crt.stop(); this._crt = null; }
    const tv = this._tv;
    this._tv = null;
    setTimeout(() => { try { tv.out.disconnect(); } catch { /* gone */ } }, 400);
    if (this._eas) { this._eas.stop(); this._eas = null; }
  }

  /**
   * §5.3 — signal loss is a process, not a cut: the audio thins, a carrier
   * hum enters, dropout starts, and then snow.
   */
  tvMode(mode, day) {
    if (!this._tv) return;
    const t = this.ctx.currentTime;
    const T = this._tv;
    const decay = Math.min(1, Math.max(0, (day - 4) / 11));

    // The desync grows from ~40 ms around Day 8 to ~400 ms by Day 13.
    const desyncMs = day < 8 ? 0 : Math.min(400, (day - 7) * 70);
    T.delay.delayTime.setTargetAtTime(desyncMs / 1000, t, 1.5);

    const off = (g) => S.ramp(g.gain, 0, 0.3, t);

    if (mode === 'snow' || mode === 'lost') {
      off(T.speech); off(T.studio);
      S.ramp(T.carrier.gain, 0.05, 0.4, t);
      S.ramp(T.snow.gain, mode === 'snow' ? 0.42 : 0.22, 0.5, t);
      bus.emit('caption', { text: mode === 'snow' ? 'static' : 'the picture goes', dir: 'ahead' });
      return;
    }
    if (mode === 'bars') {
      off(T.speech); off(T.studio); off(T.snow);
      S.ramp(T.carrier.gain, 0.03, 0.5, t);
      // Day 14 onward the bars come with the tone, and it does not stop.
      if (day >= 14) this.easTone(Infinity);
      bus.emit('caption', { text: 'a test tone', dir: 'ahead' });
      return;
    }
    if (mode === 'eas') {
      off(T.speech); off(T.studio); off(T.snow);
      S.ramp(T.carrier.gain, 0.02, 0.4, t);
      this.easChain(day);
      return;
    }
    if (mode === 'signoff' || mode === 'ident') {
      off(T.snow);
      S.ramp(T.speech.gain, 0.10, 0.4, t);
      S.ramp(T.studio.gain, 0.05, 0.4, t);
      return;
    }
    // news
    S.ramp(T.speech.gain, 0.13 * (1 - decay * 0.5), 0.5, t);
    S.ramp(T.studio.gain, 0.06, 0.5, t);
    S.ramp(T.carrier.gain, decay * 0.035, 1.0, t);
    S.ramp(T.snow.gain, decay * decay * 0.12, 1.0, t);

    // Intermittent dropout, once the signal is going.
    clearInterval(this._dropTimer);
    if (decay > 0.35) {
      this._dropTimer = setInterval(() => {
        if (!this._tv || Math.random() > decay * 0.4) return;
        const n = this.ctx.currentTime;
        this._tv.speech.gain.setTargetAtTime(0, n, 0.01);
        this._tv.speech.gain.setTargetAtTime(0.13 * (1 - decay * 0.5), n + 0.06 + Math.random() * 0.3, 0.05);
      }, 1400);
    }
  }

  /**
   * §5.1 — the EAS chain. The tone is correct because the recognition is
   * the weapon. What changes across the fifteen days is the message.
   */
  easChain(day) {
    if (!this.e.ready) return;
    const dest = this._tv ? this._tv.out : this.e.buses.effects;
    const t = this.ctx.currentTime;

    if (day >= 15) {
      // The tone plays and does not stop. It runs over everything, and it
      // is not ducked.
      this.easTone(Infinity);
      bus.emit('caption', { text: 'the alert tone — it does not stop', dir: 'ahead' });
      return;
    }

    const headLen = S.sameBurst(this.ctx, dest, { when: t });
    const toneAt = t + headLen + 0.4;
    this._eas = S.easAttention(this.ctx, dest, { when: toneAt, seconds: 8 });
    bus.emit('caption', { text: 'the Emergency Alert System tone', dir: 'ahead' });

    if (day >= 14) {
      // The tone with no message following it.
      bus.emit('caption', { text: 'nothing follows it', dir: 'ahead' });
      return;
    }
    // Days 5–13: a message follows. From Day 10 the message is wrong, and
    // the audio has no way to tell you that, which is the point.
    setTimeout(() => {
      if (!this._tv) return;
      S.ramp(this._tv.speech.gain, 0.11, 0.4, this.ctx.currentTime);
    }, (headLen + 8.6) * 1000);
  }

  easTone(seconds) {
    if (this._eas) this._eas.stop();
    // Routed past the duck: nothing gets to pull this down.
    const dest = this.e.buses.effects;
    this._eas = S.easAttention(this.ctx, dest, { seconds, level: 0.14 });
  }

  stopEas() { if (this._eas) { this._eas.stop(); this._eas = null; } }

  /* ---------------------------------------------------------------- */

  _dirOf(x, z) {
    // Direction relative to the apartment, not the camera — captions want
    // "north", not "left", because the player has to act on it.
    if (Math.abs(x) > Math.abs(z)) return x < 0 ? 'west — the street' : 'east';
    return z < 0 ? 'north' : 'south';
  }

  dispose() {
    for (const L of Object.values(this.layers)) if (L.timer) clearTimeout(L.timer);
    if (this._fridge) clearTimeout(this._fridge.timer);
    clearTimeout(this._dripTimer);
    clearInterval(this._dropTimer);
  }
}

export default SoundWorld;
