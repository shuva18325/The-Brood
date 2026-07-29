/**
 * concealment.js — the master clock.
 *
 * One resource. It only ever goes down. There is no way to get more; going
 * out is what killed the friend.
 *
 * Two detection profiles feed the same meter:
 *   noiseLight  — the Tormentor. Sound and light.
 *   habitation  — the Incursion. Dishes, warmth, worn paths, routine.
 *
 * Some behaviours that hide you from one expose you to the other. Whichever
 * profile is running hot decides what is working this block tonight. The
 * player is never told which.
 */

import { CONFIG } from '../config.js';
import state, { anyLightOn } from '../state.js';
import bus from '../bus.js';
import clock from './clock.js';

const K = CONFIG.concealment;

let lastBand = 'calm';

export const concealment = {

  /** Locked during Act 1 — the friend maintains it, and doesn't explain how. */
  get active() { return state.day >= K.lockedUntilDay; },

  /**
   * Continuous drain. Called every frame with real dt; converts to in-game
   * hours internally so the rates in config read as "per hour".
   */
  update(dt) {
    if (!this.active || state.ended) return;
    const hours = (dt * CONFIG.clock.minutesPerSecond) / 60;
    if (hours <= 0) return;

    const night = clock.isDark();
    const r = K.rates;
    let nl = 0, hb = 0;

    const add = (rate) => { nl += rate.noiseLight; hb += rate.habitation; };

    if (anyLightOn())        add(night ? r.lightsOnNight : r.lightsOnDay);
    if (state.tvOn)          add(night ? r.tvOnNight : r.tvOnDay);
    if (state.computerOn)    add(night ? r.computerNight : r.computerDay);
    if (state.waterRunning)  add(r.waterRunning);
    if (state.cooking)       add(r.cooking);
    if (state.curtainOpen)   add(night ? r.curtainOpenNight : r.curtainOpenDay);

    this.charge(nl * hours, hb * hours, 'ambient');
  },

  /** One-off charge by name from CONFIG.concealment.events. */
  event(name) {
    const e = K.events[name];
    if (!e) { console.warn('[concealment] unknown event', name); return; }
    this.charge(e.noiseLight, e.habitation, name);
  },

  /** Raw charge. Everything funnels through here. */
  charge(noiseLight, habitation, source = '?') {
    if (!this.active || state.ended) return;
    const total = noiseLight + habitation;
    if (total <= 0) return;

    state.profile.noiseLight += noiseLight;
    state.profile.habitation += habitation;
    state.profileToday.noiseLight += noiseLight;
    state.profileToday.habitation += habitation;
    state.concealment = Math.max(0, state.concealment - total);

    bus.emit('concealment:charge', { noiseLight, habitation, source, total });

    const band = this.band();
    if (band !== lastBand) { lastBand = band; bus.emit('concealment:band', band); }

    if (state.concealment <= 0 && !state.ended) bus.emit('concealment:zero');
  },

  /** Charged at sleep. The materials degrade whatever you do. */
  dailyBase() {
    if (!this.active) return;
    this.charge(K.baseDaily * 0.5, K.baseDaily * 0.5, 'base');
  },

  band() {
    const c = state.concealment;
    if (c > K.bands.calm) return 'calm';
    if (c > K.bands.uneasy) return 'uneasy';
    if (c > K.bands.bad) return 'bad';
    return 'terminal';
  },

  /**
   * Which profile ran hot today. Returns 'noiseLight' | 'habitation' | null.
   * Resolved at sleep and stored, because tonight's events depend on it.
   */
  resolveTodayProfile() {
    const p = state.profileToday;
    const total = p.noiseLight + p.habitation;
    if (total < 4) return null;             // a genuinely quiet day
    const nlShare = p.noiseLight / total;
    if (nlShare >= K.profileHotShare) return 'noiseLight';
    if ((1 - nlShare) >= K.profileHotShare) return 'habitation';
    return null;                            // hedged; both a little exposed
  },

  rollDay() {
    state.hotProfile = this.resolveTodayProfile();
    state.profileToday = { noiseLight: 0, habitation: 0 };
  },

  /** For the ending resolver and the debug HUD only. Never shown in play. */
  debug() {
    return {
      value: state.concealment,
      band: this.band(),
      profile: { ...state.profile },
      today: { ...state.profileToday },
      hot: state.hotProfile,
    };
  },
};

export default concealment;
