/**
 * understanding.js — the hidden score.
 *
 * Never displayed. It does exactly one thing: it resolves the ending.
 *
 * Two ledgers. FLAGS are things the player has learned. BELIEFS are things
 * the player has been told confidently and incorrectly. A belief costs
 * nothing if the player later picks up the flag that corrects it — that is
 * the difference between having information and having understanding.
 */

import { CONFIG, conditionTier } from '../config.js';
import state from '../state.js';
import bus from '../bus.js';
import audio from '../audio.js';

/* ------------------------------------------------------------------ */
/* the catalogue                                                       */
/* ------------------------------------------------------------------ */

/**
 * weight — how much this is worth toward the raw score.
 * critical — listed in §5.4. These are the ones the endings actually read.
 */
export const FLAGS = {
  /* how things find you */
  tormentor_noise_light:  { w: 7, critical: true,  desc: 'The Tormentor reads noise and light.' },
  incursion_habitation:   { w: 7, critical: true,  desc: 'The Incursion reads signs of habitation, not noise.' },
  incursion_needs_opening:{ w: 5, desc: 'It does not make its own way in. It needs one.' },
  incursion_fragile:      { w: 6, critical: true,  desc: 'The Incursion is the one apex thing a shotgun kills.' },
  incursion_writes:       { w: 3, desc: 'It writes. Notes, chalk, lists.' },
  anguish_dont_look:      { w: 8, critical: true,  desc: 'Looking at Anguish is the loss condition.' },
  anguish_silence:        { w: 4, desc: 'Total silence means everything smaller has left the block.' },
  anguish_officer_context:{ w: 8, critical: true,  desc: 'The officer survived because of his circumstances, not because shooting works.' },
  pathogen_consent:       { w: 6, desc: 'It cannot enter uninvited. It requires a click.' },
  pathogen_old_hardware:  { w: 4, desc: 'Old devices are wide open. The TV is a door standing open.' },
  choir_bait:             { w: 5, desc: 'The voice from the street is not the person it belongs to.' },
  congregation_crowds:    { w: 4, desc: 'It scales to crowd size. The shelters were the most dangerous places in the state.' },
  undertow_water:         { w: 6, desc: 'It cannot leave standing water. Flooded roads are permanently closed.' },
  gleaners_follow:        { w: 3, desc: 'Gleaners never precede a Tormentor. They follow.' },
  crawler_shotgun:        { w: 3, desc: 'A Crawler can be killed with effort. Nothing above it can.' },
  military_useless:       { w: 4, desc: 'The Guard engaged one. Nothing is coming.' },

  /* the roads */
  roadkill_adapt:         { w: 7, critical: true,  desc: 'It adapts permanently to anything that has hurt it.' },
  roadkill_window:        { w: 9, critical: true,  desc: 'Between impact and adaptation there is a window.' },
  roadkill_never_leaves:  { w: 4, desc: 'It never leaves the roadway.' },
  spreadsheet_impacts:    { w: 8, critical: true,  desc: 'Read the impact log carefully enough to date a highway.' },
  roads_flooded:          { w: 6, critical: true,  desc: 'Which routes are underwater, and therefore Undertow ground.' },

  /* the deep record */
  zanuwam_solar_obsolete: { w: 9, critical: true,  desc: 'The solar feeding is 1,300 years out of date.' },
  zanuwam_nocturnal:      { w: 6, desc: 'It is a night creature now.' },
  zanuwam_warmth_sign:    { w: 4, desc: 'Warmth where there is no sun.' },
  zanuwam_sealed:         { w: 4, desc: 'It was cornered and sealed by a state at the height of its power.' },
  zanuwam_released:       { w: 5, desc: 'A museum storeroom. A junior conservator. The late 1980s.' },
  zanuwam_mistranslation: { w: 5, critical: true,  desc: '"Zānuwām" is an argument someone lost centuries ago.' },
  crippled_mistranslation:{ w: 6, critical: true,  desc: '"Crippled" is a mistranslation. It is not crippled.' },
  crippled_exists:        { w: 4, desc: 'There is something above Anguish.' },
  king_taught:            { w: 5, desc: 'Zānuwām learned the concept of a king from it. They transmit ideas.' },
  foundation_dates:       { w: 4, desc: 'The Foundation has been documenting this since 1989.' },
  coastal_origin:         { w: 5, desc: 'Every appearance in 2,500 years has been coastal.' },

  /* this city */
  city_composition:       { w: 8, critical: true,  desc: 'Which entity types are actually in this city.' },
  city_no_evac:           { w: 3, desc: 'Nobody gave up on this neighbourhood. The evacuation points were worse.' },
  texts_are_bait:         { w: 7, critical: true,  desc: 'The texts from his number are not from him.' },
  friend_took_pistol:     { w: 4, desc: 'He left the shotgun and took the small one.' },

  /**
   * §2. What the survivor at the door knows. She was on Hampton Boulevard on
   * the twelfth and under a car for ninety seconds of it, and she is right
   * about which way the water came. Both of these are already somewhere in
   * the record; hearing them from somebody who was there is what makes them
   * usable. This is the only knowledge in the game that comes from a person.
   */
  tormentor_travels:      { w: 6, desc: 'It works a street. It does not hunt a building.' },
  floodRoutes:            { w: 5, desc: 'Which way the water came, from somebody who watched it.' },
};

/**
 * Beliefs the game deliberately teaches wrong, and the flag that corrects
 * each one. An uncorrected belief subtracts. A corrected one costs nothing.
 */
export const BELIEFS = {
  shoot_anguish:   { penalty: 12, correctedBy: 'anguish_officer_context',
                     desc: 'The forums are right that it works, and that is the problem.' },
  light_repels:    { penalty: 9,  correctedBy: 'tormentor_noise_light',
                     desc: 'Leave a lamp on and you will be safe.' },
  zanuwam_daylight:{ penalty: 11, correctedBy: 'zanuwam_solar_obsolete',
                     desc: 'The oldest sources say stay dark by day. They are accurate history and fatal tactics.' },
  shelter_is_safe: { penalty: 7,  correctedBy: 'congregation_crowds',
                     desc: 'Get to an evacuation point.' },
  gun_solves_it:   { penalty: 6,  correctedBy: 'incursion_fragile',
                     desc: 'The shotgun is the answer to whatever comes.' },
};

const MAX_RAW = Object.values(FLAGS).reduce((a, f) => a + f.w, 0);

/* ------------------------------------------------------------------ */

export const understanding = {

  /** Grant flags from a piece of content. Never counts the same id twice. */
  read(contentId, { flags = [], beliefs = [], u = 0 } = {}) {
    if (state.readIds[contentId]) return 0;
    state.readIds[contentId] = true;

    // Comprehension falls as the body does. Reading badly is still reading,
    // but less of it sticks.
    const tier = conditionTier(state.condition);
    const mult = CONFIG.condition.comprehension[tier.level] ?? 1;

    let gained = 0;
    for (const f of flags) {
      if (!FLAGS[f]) { console.warn('[u] unknown flag', f); continue; }
      if (state.understandingFlags[f]) continue;
      // Low comprehension can cause a flag to simply not land.
      if (mult < 1 && Math.random() > mult + 0.25) continue;
      state.understandingFlags[f] = true;
      gained += FLAGS[f].w;
      bus.emit('understanding:flag', f);
    }
    for (const b of beliefs) {
      if (!BELIEFS[b]) { console.warn('[u] unknown belief', b); continue; }
      if (!state.beliefs[b]) {
        state.beliefs[b] = true;
        bus.emit('understanding:belief', b);
      }
    }

    state.understandingRaw += (gained + u) * mult;
    if (gained > 0) audio.play('understanding_tick');
    return gained;
  },

  has(flag) { return !!state.understandingFlags[flag]; },
  believes(b) {
    if (!state.beliefs[b]) return false;
    const corr = BELIEFS[b]?.correctedBy;
    return !(corr && state.understandingFlags[corr]);
  },

  /** Set a flag directly — used by world events, not by reading. */
  grant(flag, why = 'observed') {
    if (!FLAGS[flag] || state.understandingFlags[flag]) return;
    state.understandingFlags[flag] = true;
    state.understandingRaw += FLAGS[flag].w;
    bus.emit('understanding:flag', flag, why);
  },

  /** 0–100. Never rendered anywhere the player can see it. */
  score() {
    let raw = 0;
    for (const [f, on] of Object.entries(state.understandingFlags)) {
      if (on && FLAGS[f]) raw += FLAGS[f].w;
    }
    let penalty = 0;
    for (const b of Object.keys(BELIEFS)) if (this.believes(b)) penalty += BELIEFS[b].penalty;

    const pct = (raw / MAX_RAW) * CONFIG.understanding.max;
    return Math.max(0, Math.min(100, Math.round(pct - penalty)));
  },

  tier() {
    const s = this.score();
    if (s >= CONFIG.understanding.tiers.high) return 'high';
    if (s >= CONFIG.understanding.tiers.partial) return 'partial';
    return 'low';
  },

  /** Flags held, for the ending writer. */
  held() { return Object.keys(state.understandingFlags).filter(f => state.understandingFlags[f]); },
  heldBeliefs() { return Object.keys(BELIEFS).filter(b => this.believes(b)); },

  criticalMissing() {
    return Object.entries(FLAGS)
      .filter(([f, d]) => d.critical && !state.understandingFlags[f])
      .map(([f]) => f);
  },

  maxRaw() { return MAX_RAW; },
};

export default understanding;
