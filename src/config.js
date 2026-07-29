/**
 * config.js — every tunable number in the game.
 *
 * PROMPT 2 OWNS THIS FILE. Nothing else hardcodes a colour, a fog density,
 * an intensity, a duration or a drain rate.
 *
 * The lighting model is three motivated sources and nothing else:
 *
 *   1. The streetlight through the bars — sodium vapour amber. The only
 *      warm light in the game. Enters only when the curtain is open, and
 *      casts hard bar-shadows across the floor and up the wall. This is
 *      the signature image of the whole build.
 *   2. The interior bulb — a dying CFL, greenish-cold, slightly too dim,
 *      with a flicker at the edge of perception. The light of a place
 *      nobody chose.
 *   3. The screens — CRT blue-white, lighting the player's face and
 *      nothing else, falling off fast.
 *
 * If a corner is not lit by one of those three, it is black.
 */

export const CONFIG = {

  /* ------------------------------------------------------------------ */
  /* RENDER                                                              */
  /* ------------------------------------------------------------------ */
  render: {
    fov: 72,
    near: 0.05,
    far: 120,
    pixelRatioCap: 1.5,
    shadows: true,
    shadowMapSize: 2048,
    // ACES on a scene this dark eats the shadows. Linear + our own grade.
    toneMappingExposure: 1.0,
    antialias: false,          // the post chain resolves edges; AA costs more
  },

  /* ------------------------------------------------------------------ */
  /* LIGHTING                                                            */
  /* ------------------------------------------------------------------ */
  light: {
    /**
     * Ambient is a floor value, not a light. It exists so that unlit
     * geometry is *almost* black rather than a silhouette-flat void.
     * Do not raise these to make the room navigable — turn the bulb on.
     */
    ambient: {
      day:   { color: 0x2c3138, intensity: 0.30 },
      dusk:  { color: 0x1c1e26, intensity: 0.13 },
      night: { color: 0x0a0d14, intensity: 0.055 },
      dawn:  { color: 0x1e232c, intensity: 0.12 },
    },
    hemiScale: 0.45,

    /**
     * The window light. One spotlight, outside, aimed in through the bars,
     * shadow-casting always. Its colour is the time of day; its existence
     * is the curtain. No glass means it is not filtered by anything.
     */
    // NOTE ON UNITS: three.js is physically correct — intensity is candela
    // and irradiance falls off as 1/d². This light is ~9 m from the floor
    // it lands on, so the numbers here are two orders of magnitude larger
    // than the bulbs'. That is arithmetic, not taste.
    windowShaft: {
      day:   { color: 0xB9CBDC, intensity: 1250 },  // flat coastal overcast
      dusk:  { color: 0xD98A4E, intensity: 880 },   // the good hour, briefly
      night: { color: 0xC87F3A, intensity: 760 },   // SODIUM. the signature.
      dawn:  { color: 0x8FA2B8, intensity: 560 },
      distance: 30,
      decay: 2.0,
      // Narrow. A tighter cone spends the shadow map on the window instead
      // of on the street, which is what makes the bars resolve at all.
      angle: 0.40,
      penumbra: 0.16,
      // Where it sits, in world space, outside the west wall.
      from: [-9.2, 3.9, -3.2],
      to:   [-1.4, 0.25, 1.4],
      // The bars are 32 mm across. A normal bias anywhere near that offsets
      // the sample straight past them and erases the only image that matters.
      shadowBias: -0.0004,
      shadowNormalBias: 0.0012,
    },

    /**
     * Interior bulbs. A dying CFL is greenish, cold, and never quite still.
     * Every one of these is a liability and the player knows it.
     */
    bulb: {
      main:    { color: 0xB4C2AC, intensity: 26, distance: 9.0, decay: 2.0 },
      kitchen: { color: 0xC2CBB4, intensity: 19, distance: 6.0, decay: 2.0 },
      bath:    { color: 0xB8C6B0, intensity: 14, distance: 4.5, decay: 2.0 },
      bedroom: { color: 0xC6B79A, intensity: 17, distance: 5.5, decay: 2.0 },  // his bulb is warmer. he chose it.
      landing: { color: 0xA8B8A4, intensity: 11, distance: 5.5, decay: 2.0 },
    },
    /** CFL flicker: amplitude and rate. Sits at the edge of perception. */
    bulbFlicker: { amount: 0.055, rateA: 8.3, rateB: 21.7, warmup: 2.4 },

    /** Screens light a face and nothing else. Short distance, hard falloff. */
    screen: {
      tv:       { color: 0x9FB8CE, intensity: 15, distance: 4.0, decay: 2.2 },
      computer: { color: 0x9FB8CE, intensity: 8, distance: 2.6, decay: 2.2 },
      phone:    { color: 0xB6C8DA, intensity: 3.2, distance: 1.4, decay: 2.4 },
    },
    /** The snow on Day 15 is the brightest thing in the apartment. */
    snowBoost: 2.6,

    /** The lamp on the street itself, seen through the window. */
    streetlamp: { color: 0xC87F3A, intensity: 2600, distance: 26, decay: 2.0 },
    /** It gives up early, and after this day the street is only ever dark. */
    streetlampLastDay: 6,
  },

  /* ------------------------------------------------------------------ */
  /* FOG — exponential, low density, so even a small room softens         */
  /* ------------------------------------------------------------------ */
  fog: {
    interior: {
      day:   { color: 0x1b2026, density: 0.052 },
      dusk:  { color: 0x121419, density: 0.072 },
      night: { color: 0x04050a, density: 0.105 },
      dawn:  { color: 0x15191f, density: 0.068 },
    },
    exterior: {
      day:   { color: 0x59636f, density: 0.026 },
      dusk:  { color: 0x33303a, density: 0.042 },
      night: { color: 0x05070e, density: 0.062 },
      dawn:  { color: 0x3d444e, density: 0.040 },
    },
    /** Days 9+ the air over the water stops being air. */
    hazeByDay: { from: 9, perDay: 0.0035, max: 0.030 },
  },

  /* ------------------------------------------------------------------ */
  /* THE POST CHAIN                                                      */
  /*                                                                     */
  /* One render target, one fullscreen shader. Order inside the shader:  */
  /* barrel → chromatic aberration → edge softness → grade → vignette →  */
  /* grain → flash.                                                      */
  /* ------------------------------------------------------------------ */
  post: {
    enabled: true,
    barrel: 0.055,             // constant, very slight
    // A bare bulb and an unglazed window both blow out. This rolls the top
    // end off instead of hard-clipping it to a flat white shape.
    exposure: 1.35,
    vignette: { amount: 0.72, softness: 0.55 },
    grain: { base: 0.048, perLevel: 0.020, size: 1.35, speed: 24 },
    aberration: { base: 0.0016, perLevel: 0.0022, edgeBias: 2.2 },
    softness: { base: 0.0008, perLevel: 0.0011 },
    // No motion blur, ever. It reads as action-game polish and fights the
    // stillness this game is made of.
  },

  /**
   * Colour grade across the fifteen days.
   *   1–5   near-neutral, slightly warm. It is a hot summer in a cheap flat.
   *   6–9   desaturating. The greens drain first.
   *   10–15 cold, blue-shifted, crushed blacks. By 14 the sodium amber
   *         through the bars is the only colour left in the frame.
   */
  grade: {
    bands: [
      { untilDay: 5,  saturation: 0.94, greenPull: 0.00, temp:  0.055, lift: 0.008, gain: 1.02, crush: 0.010 },
      { untilDay: 9,  saturation: 0.74, greenPull: 0.34, temp:  0.010, lift: 0.002, gain: 0.99, crush: 0.024 },
      { untilDay: 12, saturation: 0.55, greenPull: 0.52, temp: -0.075, lift: -0.010, gain: 0.95, crush: 0.045 },
      { untilDay: 99, saturation: 0.40, greenPull: 0.66, temp: -0.125, lift: -0.020, gain: 0.92, crush: 0.062 },
    ],
    /** Sodium is protected from the desaturation. It is the last colour. */
    protectWarm: 0.72,
    blendSeconds: 2.5,
  },

  /* ------------------------------------------------------------------ */
  /* PLAYER                                                              */
  /* ------------------------------------------------------------------ */
  player: {
    eyeHeight: 1.62,
    radius: 0.28,
    walkSpeed: 1.95,
    crouchSpeed: 0.95,
    crouchHeight: 1.05,
    accel: 12,
    friction: 11,
    lookSensitivity: 0.0021,
    maxPitch: Math.PI / 2 - 0.05,
    interactRange: 2.0,

    /** Headbob. Heavy and slow — he has been sleeping on a floor. */
    headbob: { amount: 0.021, rate: 8.4, rollAmount: 0.0075 },
    /** At rest: breathing. Grows with condition loss. */
    breathe: { amount: 0.0042, perLevel: 0.0038, rate: 1.15 },
    /** Sway: a slow drift the player is always correcting for. */
    sway: { base: 0.0016, perLevel: 0.0042, rateA: 0.37, rateB: 0.23 },
    /** Every sighting adds this to sway, permanently. It never decays. */
    swayPerSighting: 0.0026,
  },

  /* ------------------------------------------------------------------ */
  /* CLOCK                                                               */
  /* ------------------------------------------------------------------ */
  clock: {
    minutesPerSecond: 3.0,
    wakeHour: 7.0,
    duskHour: 19.5,
    nightHour: 20.5,
    dawnHour: 6.0,
    sleepAllowedHour: 20.0,
    collapseHour: 30.0,
    exhaustionHour: 26.0,
  },

  /* ------------------------------------------------------------------ */
  /* CONCEALMENT                                                         */
  /* ------------------------------------------------------------------ */
  concealment: {
    start: 100,
    lockedUntilDay: 10,
    baseDaily: 6.5,

    rates: {
      lightsOnNight:   { noiseLight: 2.10, habitation: 0.35 },
      lightsOnDay:     { noiseLight: 0.10, habitation: 0.20 },
      tvOnNight:       { noiseLight: 1.40, habitation: 0.30 },
      tvOnDay:         { noiseLight: 0.30, habitation: 0.20 },
      computerNight:   { noiseLight: 0.85, habitation: 0.25 },
      computerDay:     { noiseLight: 0.10, habitation: 0.15 },
      phoneNight:      { noiseLight: 0.25, habitation: 0.10 },
      phoneDay:        { noiseLight: 0.02, habitation: 0.05 },
      waterRunning:    { noiseLight: 2.40, habitation: 1.60 },
      cooking:         { noiseLight: 1.10, habitation: 3.20 },
      curtainOpenNight:{ noiseLight: 1.80, habitation: 0.90 },
      curtainOpenDay:  { noiseLight: 0.00, habitation: 0.15 },
    },

    events: {
      tvVolumeUp:     { noiseLight: 3.0,  habitation: 0.5 },
      hotMeal:        { noiseLight: 1.5,  habitation: 4.0 },
      coldMeal:       { noiseLight: 0.0,  habitation: 0.8 },
      dishesLeft:     { noiseLight: 0.0,  habitation: 2.2 },
      markTheWall:    { noiseLight: 0.0,  habitation: 0.6 },
      answerPhone:    { noiseLight: 1.2,  habitation: 0.4 },
      shotgunFired:   { noiseLight: 34.0, habitation: 6.0 },
      frontDoorOpened:{ noiseLight: 6.0,  habitation: 12.0 },
    },

    profileHotShare: 0.60,
    bands: { calm: 60, uneasy: 35, bad: 18, terminal: 0 },
  },

  /* ------------------------------------------------------------------ */
  /* FOOD + CONDITION                                                    */
  /* ------------------------------------------------------------------ */
  food: {
    startingPortions: 16,
    act1Portions: 9,
    meal: { full: 2, ration: 1, none: 0 },
    conditionFromMeal: { full: +4, ration: -2, none: -11 },
  },

  condition: {
    start: 88,
    min: 0,
    max: 100,
    darknessPenalty: -3.5,
    badSleepPenalty: -6,
    goodSleepBonus: +3,
    sightingPenalty: -9,
    tiers: [
      { at: 75, level: 0, label: 'tired' },
      { at: 55, level: 1, label: 'worn' },
      { at: 38, level: 2, label: 'shaking' },
      { at: 20, level: 3, label: 'failing' },
      { at: 0,  level: 4, label: 'gone' },
    ],
    comprehension: [1.0, 0.92, 0.78, 0.58, 0.35],
  },

  /* ------------------------------------------------------------------ */
  /* UNDERSTANDING                                                       */
  /* ------------------------------------------------------------------ */
  understanding: {
    max: 100,
    tiers: { high: 68, partial: 36 },
  },

  shotgun: { shells: 6, braveDefenceSeconds: 150 },

  days: { first: 1, handoff: 9, actTwo: 10, textsBegin: 12, last: 15 },

  /* ------------------------------------------------------------------ */
  /* THE APARTMENT, ACROSS FIFTEEN DAYS                                  */
  /* ------------------------------------------------------------------ */
  decay: {
    /** Dishes pile up in the sink. Then they stop, which is worse. */
    dishes: { startDay: 10, stopDay: 13, max: 7 },
    /** Dust on flat surfaces. */
    dust: { startDay: 6, perDay: 0.055, max: 0.62 },
    /** He left them by the door and they are still by the door. */
    shoesFromDay: 10,
    /** Rubbish on the street arrives and never leaves. */
    trashFromDay: 2,
    /** The water comes and the blocks below stop being blocks. */
    waterFromDay: 9,
    /** The blue house curtain twitches in the mornings until it doesn't. */
    blueCurtainLastDay: 8,
  },

  /* ------------------------------------------------------------------ */
  /* THE BROADCAST                                                       */
  /* ------------------------------------------------------------------ */
  tv: {
    /** How long the set holds a channel, in seconds, by day. */
    holdSeconds: [99, 99, 99, 99, 99, 60, 40, 26, 14, 11, 9, 7, 6, 4, 2],
    /** Broadcast decay 0..1, by day. Colour first, then sync, then snow. */
    decayByDay:  [0, 0, 0, 0, 0.04, 0.10, 0.16, 0.24, 0.34, 0.44, 0.56, 0.68, 0.80, 0.92, 1.0],
    /** Audio drifts out of step with the anchor's mouth. Never acknowledged. */
    desyncMsByDay: [0, 0, 0, 0, 20, 60, 110, 180, 260, 340, 430, 520, 620, 720, 820],
    /** The one single-frame insert. Once, in the entire game. */
    insertDay: 13,
    insertFrameMs: 66,
    /** The station plays its sign-off in the middle of the afternoon. */
    signOffDay: 13,
  },

  /* ------------------------------------------------------------------ */
  /* TRANSITIONS                                                         */
  /* ------------------------------------------------------------------ */
  timing: {
    overlayFadeIn: 300,
    overlayFadeOut: 220,
    plateFade: 700,
    plateHold: 1400,
    sleepFade: 1600,
    promptFade: 120,
    subtitleHold: 4200,
    /** The machine boots slower from Day 8. */
    pcBootMs: 420,
    pcBootMsLate: 2600,
    pcBootSlowFromDay: 8,
  },

  /* ------------------------------------------------------------------ */
  /* ACCESSIBILITY — see §10. These are honoured, not decorative.         */
  /* ------------------------------------------------------------------ */
  a11y: {
    /** Set true to cap every luminance flash to a low, short pulse. */
    reducedFlashing: false,
    /** Peak luminance delta permitted when reducedFlashing is on. */
    flashCapReduced: 0.10,
    flashCapNormal: 0.34,
    /** Max flashes per second, ever, in either mode. */
    maxFlashHz: 3,
    masterVolume: 0.8,
  },

  /* ------------------------------------------------------------------ */
  /* DEBUG                                                               */
  /* ------------------------------------------------------------------ */
  debug: {
    traceStubs: false,
    exposeApi: true,
  },
};

/** Resolve the condition tier object for a condition value. */
export function conditionTier(value) {
  const t = CONFIG.condition.tiers;
  for (let i = 0; i < t.length; i++) if (value >= t[i].at) return t[i];
  return t[t.length - 1];
}

/** Resolve the colour grade band for a day. */
export function gradeBand(day) {
  for (const b of CONFIG.grade.bands) if (day <= b.untilDay) return b;
  return CONFIG.grade.bands[CONFIG.grade.bands.length - 1];
}

/** Broadcast decay 0..1 for a day. */
export function tvDecay(day) {
  const a = CONFIG.tv.decayByDay;
  return a[Math.max(0, Math.min(a.length - 1, day - 1))];
}

export default CONFIG;
