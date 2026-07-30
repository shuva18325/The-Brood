/**
 * synth.js — every sound in the game, generated.
 *
 * Nothing is loaded. Filtered noise, oscillators, and procedurally built
 * impulse responses. The whole audio world is a few hundred lines of maths,
 * which is the only way it fits in a single self-contained page.
 */

/* ------------------------------------------------------------------ */
/* noise                                                               */
/* ------------------------------------------------------------------ */

const bufCache = new Map();

export function noiseBuffer(ctx, seconds = 2, kind = 'white') {
  const key = kind + seconds;
  if (bufCache.has(key)) return bufCache.get(key);

  const len = Math.floor(ctx.sampleRate * seconds);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);

  if (kind === 'white') {
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  } else if (kind === 'pink') {
    // Voss-McCartney. Pink is what rooms and traffic actually sound like.
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  } else if (kind === 'brown') {
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
  }

  bufCache.set(key, buf);
  return buf;
}

/**
 * A room's impulse response. Exponentially decaying noise, coloured to the
 * surfaces. The bathroom and the stairwell must be identifiable with your
 * eyes closed, and that is entirely down to these three numbers.
 */
export function impulseResponse(ctx, { seconds, decay, damp, predelay = 0, stereo = 0.6 }) {
  const rate = ctx.sampleRate;
  const len = Math.floor(rate * seconds);
  const pre = Math.floor(rate * predelay);
  const buf = ctx.createBuffer(2, len, rate);

  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      if (i < pre) { d[i] = 0; continue; }
      const t = (i - pre) / (len - pre);
      const env = Math.pow(1 - t, decay);
      let s = (Math.random() * 2 - 1) * env;
      // Damping: high frequencies die first, the way they do in a real room.
      lp += (s - lp) * damp;
      d[i] = lp * (ch === 0 ? 1 : (1 - stereo) + Math.random() * stereo);
    }
  }
  return buf;
}

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

export function src(ctx, buffer, { loop = true, rate = 1 } = {}) {
  const s = ctx.createBufferSource();
  s.buffer = buffer;
  s.loop = loop;
  s.playbackRate.value = rate;
  return s;
}

export function filt(ctx, type, freq, Q = 1) {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = Q;
  return f;
}

export function gain(ctx, v = 1) {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
}

/** Ramp without clicks. Web Audio's linear ramps pop on gain; use setTarget. */
export function ramp(param, value, seconds, now) {
  param.cancelScheduledValues(now);
  param.setTargetAtTime(value, now, Math.max(0.005, seconds / 3));
}

/* ------------------------------------------------------------------ */
/* THE COLLAPSE (§4.1)                                                  */
/*                                                                     */
/* Not a roar. Demolition: a low rumble, a debris tail, and everything  */
/* above 400 Hz removed by four streets of brick.                       */
/* ------------------------------------------------------------------ */

export function collapse(ctx, dest, { distance = 1, when = 0, gainDb = 0 } = {}) {
  const t = when || ctx.currentTime;
  const out = gain(ctx, 0);
  out.connect(dest);

  // Distance eats the top end. A collapse four blocks away has no treble
  // at all; one two streets away has a little grit in it.
  const cut = 900 - distance * 620;
  const lp = filt(ctx, 'lowpass', Math.max(90, cut), 0.7);
  lp.connect(out);

  // The body: brown noise, because the energy is all at the bottom.
  const body = src(ctx, noiseBuffer(ctx, 4, 'brown'), { rate: 0.55 + Math.random() * 0.2 });
  const bodyG = gain(ctx, 0);
  body.connect(bodyG).connect(lp);

  // The initial failure: a fast downward sweep. This is the sound of a
  // structure stopping being one.
  const sweep = ctx.createOscillator();
  sweep.type = 'sine';
  sweep.frequency.setValueAtTime(64, t);
  sweep.frequency.exponentialRampToValueAtTime(19, t + 1.6);
  const sweepG = gain(ctx, 0);
  sweep.connect(sweepG).connect(lp);

  // Debris: a longer, sparser tail of small impacts.
  const deb = src(ctx, noiseBuffer(ctx, 4, 'pink'), { rate: 0.8 });
  const debBp = filt(ctx, 'bandpass', 320 - distance * 180, 1.1);
  const debG = gain(ctx, 0);
  deb.connect(debBp).connect(debG).connect(lp);

  const peak = Math.pow(10, gainDb / 20) * (1 - distance * 0.72);

  bodyG.gain.setValueAtTime(0, t);
  bodyG.gain.linearRampToValueAtTime(peak, t + 0.08);
  bodyG.gain.setTargetAtTime(0, t + 0.5, 0.9);

  sweepG.gain.setValueAtTime(0, t);
  sweepG.gain.linearRampToValueAtTime(peak * 0.8, t + 0.05);
  sweepG.gain.setTargetAtTime(0, t + 0.3, 0.55);

  debG.gain.setValueAtTime(0, t + 0.25);
  debG.gain.linearRampToValueAtTime(peak * 0.42, t + 0.7);
  debG.gain.setTargetAtTime(0, t + 1.3, 1.6);

  out.gain.setValueAtTime(1, t);

  body.start(t); sweep.start(t); deb.start(t + 0.2);
  const stop = t + 7;
  body.stop(stop); sweep.stop(t + 2.2); deb.stop(stop);
  setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, (stop - ctx.currentTime + 1) * 1000);
  return out;
}

/* ------------------------------------------------------------------ */
/* CRAWLERS (§4.2) — scratching, dragging, below waist height           */
/* ------------------------------------------------------------------ */

export function scratch(ctx, dest, { when = 0, length = 0.9, wet = 0 } = {}) {
  const t = when || ctx.currentTime;
  const out = gain(ctx, 0);
  out.connect(dest);

  const n = src(ctx, noiseBuffer(ctx, 2, 'white'), { rate: 0.6 + Math.random() * 0.5 });
  const bp = filt(ctx, 'bandpass', 1900 + Math.random() * 1400, 2.6);
  const hp = filt(ctx, 'highpass', 700);
  n.connect(bp).connect(hp).connect(out);

  // Scratching is not continuous. It is a series of drags with pauses.
  const strokes = 3 + Math.floor(Math.random() * 5);
  let cur = t;
  for (let i = 0; i < strokes; i++) {
    const dur = 0.05 + Math.random() * 0.13;
    out.gain.setValueAtTime(0, cur);
    out.gain.linearRampToValueAtTime((0.5 + Math.random() * 0.5) * (wet ? 0.7 : 1), cur + 0.012);
    out.gain.setTargetAtTime(0, cur + dur, 0.03);
    cur += dur + 0.04 + Math.random() * 0.22;
  }
  n.start(t); n.stop(cur + 0.5);
  setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, (cur - ctx.currentTime + 1.5) * 1000);
  void length;
  return out;
}

/* ------------------------------------------------------------------ */
/* GLEANERS (§4.3) — many small wet sounds at once. A flock.            */
/* ------------------------------------------------------------------ */

export function gleanerFlock(ctx, dest, { when = 0, count = 14 } = {}) {
  const t = when || ctx.currentTime;
  const out = gain(ctx, 0.55);
  out.connect(dest);
  for (let i = 0; i < count; i++) {
    const at = t + Math.random() * 3.4;
    // Each one is a short wet click: a bandpassed burst with a fast decay.
    const n = src(ctx, noiseBuffer(ctx, 2, 'white'), { rate: 0.5 + Math.random() });
    const bp = filt(ctx, 'bandpass', 600 + Math.random() * 2200, 5 + Math.random() * 6);
    const g = gain(ctx, 0);
    n.connect(bp).connect(g).connect(out);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.25 + Math.random() * 0.4, at + 0.006);
    g.gain.setTargetAtTime(0, at + 0.02, 0.035);
    n.start(at); n.stop(at + 0.4);
  }
  setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, 6000);
  return out;
}

/* ------------------------------------------------------------------ */
/* THE VOICE (§4.5)                                                     */
/*                                                                     */
/* There is no recorded speech anywhere in this game, so the Choir      */
/* cannot replay a clip. What it can do is replay the SYNTHESIS — the   */
/* same formant set, the same pitch centre, the same cadence the player */
/* has been hearing since Day 1 — and then get it slightly wrong.       */
/* ------------------------------------------------------------------ */

/** A voice print. Stable per speaker for the whole run. */
export function voicePrint(seed) {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  return {
    f0: 96 + rnd() * 46,                       // pitch centre
    formants: [
      520 + rnd() * 160,
      1180 + rnd() * 420,
      2500 + rnd() * 500,
    ],
    rasp: 0.2 + rnd() * 0.3,
    rate: 0.85 + rnd() * 0.3,
  };
}

/**
 * Speak a shape, not words. Syllable count and stress pattern only — the
 * player never hears language, they hear somebody calling from the street.
 *
 * @param opts.wrong 0..1 — pitch drift, formant shift, and a timing error
 *                   in the phrasing. At 0 it is him. At 1 it is nearly him.
 */
export function callVoice(ctx, dest, print, { when = 0, syllables = 2, wrong = 0 } = {}) {
  const t = when || ctx.currentTime;
  const out = gain(ctx, 0);
  out.connect(dest);

  // Formant shift: the single cue that makes a voice "not quite theirs".
  const shift = 1 + wrong * 0.085;
  const f0 = print.f0 * (1 + (Math.random() - 0.5) * 0.04 + wrong * 0.03);

  const glottal = ctx.createOscillator();
  glottal.type = 'sawtooth';
  glottal.frequency.value = f0;
  const rasp = src(ctx, noiseBuffer(ctx, 2, 'pink'));
  const raspG = gain(ctx, print.rasp * 0.12);

  const sum = gain(ctx, 1);
  glottal.connect(sum);
  rasp.connect(raspG).connect(sum);

  const fs = [];
  for (let i = 0; i < 3; i++) {
    const f = filt(ctx, 'bandpass', print.formants[i] * shift, 7 - i * 1.5);
    const g = gain(ctx, [1, 0.55, 0.28][i]);
    sum.connect(f).connect(g).connect(out);
    fs.push(f);
  }

  glottal.start(t); rasp.start(t);

  // Phrasing. The timing error is small and cumulative: each syllable a
  // few milliseconds later than it should be.
  let cur = t;
  for (let i = 0; i < syllables; i++) {
    const stressed = i === 0;
    const dur = (stressed ? 0.34 : 0.24) / print.rate;
    const drift = wrong * 0.035 * i;

    out.gain.setValueAtTime(0.0001, cur + drift);
    out.gain.exponentialRampToValueAtTime(stressed ? 0.5 : 0.34, cur + drift + 0.06);
    out.gain.setTargetAtTime(0.0001, cur + drift + dur * 0.6, 0.09);

    // The pitch contour of somebody calling: up at the end, always.
    const target = f0 * (i === syllables - 1 ? 1.22 : stressed ? 1.06 : 0.96);
    glottal.frequency.setTargetAtTime(target, cur + drift, 0.09);
    // Vowel movement.
    for (let k = 0; k < 3; k++) {
      fs[k].frequency.setTargetAtTime(
        print.formants[k] * shift * (stressed ? 1.0 : 0.92), cur + drift, 0.07);
    }
    cur += dur + 0.055;
  }

  const stop = cur + 0.6;
  glottal.stop(stop); rasp.stop(stop);
  setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, (stop - ctx.currentTime + 1) * 1000);
  return out;
}

/* ------------------------------------------------------------------ */
/* THE EAS (§5.1)                                                       */
/*                                                                     */
/* The real Attention Signal is 853 Hz and 960 Hz together. It is       */
/* instantly recognisable to any American, and that recognition is the  */
/* weapon — which is exactly why it must be correct.                    */
/* ------------------------------------------------------------------ */

export function easAttention(ctx, dest, { when = 0, seconds = 8, level = 0.16 } = {}) {
  const t = when || ctx.currentTime;
  const out = gain(ctx, 0);
  out.connect(dest);
  const oscs = [];
  for (const f of [853, 960]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.connect(out);
    o.start(t);
    oscs.push(o);
  }
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(level, t + 0.02);
  if (seconds !== Infinity) {
    out.gain.setValueAtTime(level, t + seconds - 0.02);
    out.gain.linearRampToValueAtTime(0, t + seconds);
    for (const o of oscs) o.stop(t + seconds + 0.05);
  }
  return { out, oscs, stop(at) {
    const s = at || ctx.currentTime;
    out.gain.cancelScheduledValues(s);
    out.gain.setTargetAtTime(0, s, 0.05);
    for (const o of oscs) { try { o.stop(s + 0.4); } catch { /* already */ } }
  } };
}

/** The SAME header burst that precedes the tone. AFSK, roughly. */
export function sameBurst(ctx, dest, { when = 0, level = 0.11 } = {}) {
  const t = when || ctx.currentTime;
  const out = gain(ctx, level);
  out.connect(dest);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.connect(out);
  // 520.83 baud, mark 2083.3 Hz, space 1562.5 Hz.
  const baud = 1 / 520.83;
  let cur = t;
  for (let i = 0; i < 268; i++) {
    o.frequency.setValueAtTime(Math.random() < 0.5 ? 2083.3 : 1562.5, cur);
    cur += baud;
  }
  o.start(t); o.stop(cur + 0.02);
  setTimeout(() => { try { out.disconnect(); } catch { /* gone */ } }, (cur - ctx.currentTime + 1) * 1000);
  return cur - t;
}

/* ------------------------------------------------------------------ */
/* CRT WHINE (§4.6)                                                     */
/*                                                                     */
/* 15.734 kHz, the NTSC horizontal line rate. Some players will hear    */
/* this and some genuinely will not, and that is correct — it is a real */
/* property of the room, not an effect.                                 */
/* ------------------------------------------------------------------ */

export function crtWhine(ctx, dest, level = 0.012) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.value = 15734;
  const g = gain(ctx, 0);
  o.connect(g).connect(dest);
  o.start();
  g.gain.setTargetAtTime(level, ctx.currentTime, 0.4);
  return { osc: o, gain: g, stop() {
    // Cut it the instant the set loses power. That absence is a cue.
    g.gain.cancelScheduledValues(ctx.currentTime);
    g.gain.setValueAtTime(0, ctx.currentTime);
    try { o.stop(ctx.currentTime + 0.05); } catch { /* already */ }
  } };
}

/* ------------------------------------------------------------------ */
/* IMPACTS, DOORS, SWITCHES — the small stuff                           */
/* ------------------------------------------------------------------ */

export function click(ctx, dest, { when = 0, freq = 2400, decay = 0.03, level = 0.3, type = 'noise' } = {}) {
  const t = when || ctx.currentTime;
  const g = gain(ctx, 0);
  g.connect(dest);
  if (type === 'noise') {
    const n = src(ctx, noiseBuffer(ctx, 1, 'white'), { rate: 1 });
    const bp = filt(ctx, 'bandpass', freq, 3);
    n.connect(bp).connect(g);
    n.start(t); n.stop(t + decay * 6 + 0.1);
  } else {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(g);
    o.start(t); o.stop(t + decay * 6 + 0.1);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.004);
  g.gain.setTargetAtTime(0, t + 0.008, decay);
  setTimeout(() => { try { g.disconnect(); } catch { /* gone */ } }, 2000);
  return g;
}

export function thud(ctx, dest, { when = 0, freq = 90, level = 0.35, decay = 0.12 } = {}) {
  const t = when || ctx.currentTime;
  const g = gain(ctx, 0);
  g.connect(dest);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq * 1.8, t);
  o.frequency.exponentialRampToValueAtTime(freq * 0.6, t + 0.15);
  const n = src(ctx, noiseBuffer(ctx, 1, 'brown'));
  const ng = gain(ctx, 0.5);
  const lp = filt(ctx, 'lowpass', 420);
  o.connect(g); n.connect(ng).connect(lp).connect(g);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(level, t + 0.008);
  g.gain.setTargetAtTime(0, t + 0.02, decay);
  o.start(t); o.stop(t + 1); n.start(t); n.stop(t + 1);
  setTimeout(() => { try { g.disconnect(); } catch { /* gone */ } }, 2500);
  return g;
}

/** The shotgun. The loudest thing the player can choose to do. */
export function shotgun(ctx, dest, { when = 0 } = {}) {
  const t = when || ctx.currentTime;
  const g = gain(ctx, 0);
  g.connect(dest);
  const n = src(ctx, noiseBuffer(ctx, 2, 'white'));
  const lp = filt(ctx, 'lowpass', 3200, 0.8);
  n.connect(lp).connect(g);
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
  const og = gain(ctx, 0.7);
  o.connect(og).connect(g);
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.95, t + 0.002);
  g.gain.setTargetAtTime(0, t + 0.03, 0.22);
  n.start(t); n.stop(t + 2.5); o.start(t); o.stop(t + 1);
  setTimeout(() => { try { g.disconnect(); } catch { /* gone */ } }, 4000);
  return g;
}

/* ------------------------------------------------------------------ */
/* THE FRIEND'S MUSIC (§6)                                              */
/*                                                                     */
/* Tinny, through a phone speaker, in the kitchen while he cooks.       */
/* Positional, never a bed. The same handful of tracks, days 2–8, and   */
/* after Day 9 it never plays again.                                    */
/* ------------------------------------------------------------------ */

const TRACKS = [
  { root: 220.00, scale: [0, 3, 5, 7, 10], bpm: 92,  pattern: [0, 2, 4, 2, 3, 1, 0, 1] },
  { root: 174.61, scale: [0, 2, 4, 7, 9],  bpm: 108, pattern: [0, 4, 3, 2, 0, 2, 3, 4] },
  { root: 196.00, scale: [0, 3, 5, 6, 10], bpm: 84,  pattern: [4, 3, 2, 3, 0, 1, 2, 0] },
];

export function phoneMusic(ctx, dest, trackIndex = 0) {
  const T = TRACKS[trackIndex % TRACKS.length];
  const out = gain(ctx, 0);

  // A phone speaker is a bandpass with nothing under 500 Hz and a nasty
  // peak around 2 kHz. That is the whole character.
  const hp = filt(ctx, 'highpass', 620, 0.7);
  const peak = filt(ctx, 'peaking', 2100, 1.4);
  peak.gain.value = 7;
  const lp = filt(ctx, 'lowpass', 5200, 0.6);
  out.connect(hp).connect(peak).connect(lp).connect(dest);

  let step = 0;
  let timer = null;
  const beat = 60 / T.bpm / 2;

  const tick = () => {
    const t = ctx.currentTime + 0.02;
    const deg = T.pattern[step % T.pattern.length];
    const semi = T.scale[deg % T.scale.length] + 12 * Math.floor(deg / T.scale.length);
    const f = T.root * Math.pow(2, semi / 12);

    for (const [mult, lvl, dur] of [[1, 0.5, 0.22], [2, 0.18, 0.16], [3, 0.07, 0.1]]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f * mult;
      const g = gain(ctx, 0);
      o.connect(g).connect(out);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(lvl, t + 0.012);
      g.gain.setTargetAtTime(0, t + 0.03, dur);
      o.start(t); o.stop(t + 1.2);
    }
    // A kick, on the ones, badly reproduced.
    if (step % 4 === 0) thud(ctx, out, { when: t, freq: 110, level: 0.28, decay: 0.06 });
    step++;
    timer = setTimeout(tick, beat * 1000);
  };

  return {
    start() { out.gain.setTargetAtTime(0.30, ctx.currentTime, 0.8); if (!timer) tick(); },
    stop() {
      out.gain.setTargetAtTime(0, ctx.currentTime, 0.5);
      if (timer) { clearTimeout(timer); timer = null; }
    },
    node: out,
  };
}

/** One sustained low drone. No melody, no percussion. */
export function drone(ctx, dest, { root = 48, level = 0.10 } = {}) {
  const out = gain(ctx, 0);
  out.connect(dest);
  const oscs = [];
  for (const [mult, det, lvl] of [[1, 0, 1], [1, 0.6, 0.7], [2, -0.4, 0.28], [3, 0.9, 0.10]]) {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = root * mult + det;
    const g = gain(ctx, lvl);
    o.connect(g).connect(out);
    o.start();
    oscs.push(o);
  }
  // A very slow breathing movement, so it is not a synth pad.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.055;
  const lfoG = gain(ctx, level * 0.35);
  lfo.connect(lfoG).connect(out.gain);
  lfo.start();
  out.gain.setTargetAtTime(level, ctx.currentTime, 3);
  return { out, stop() {
    out.gain.setTargetAtTime(0, ctx.currentTime, 1.2);
    setTimeout(() => { for (const o of oscs) { try { o.stop(); } catch { /* gone */ } }
      try { lfo.stop(); } catch { /* gone */ } }, 4000);
  } };
}

export default { noiseBuffer, impulseResponse, src, filt, gain, ramp, collapse,
  scratch, gleanerFlock, voicePrint, callVoice, easAttention, sameBurst,
  crtWhine, click, thud, shotgun, phoneMusic, drone };
