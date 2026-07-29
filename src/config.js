/**
 * config.js — every tunable number in the game.
 *
 * PROMPT 2 TUNES THIS FILE. Nothing else should hardcode a colour, a fog
 * density, an intensity, a duration or a drain rate. If you find yourself
 * typing a number into a system module, it belongs here instead.
 */

export const CONFIG = {

  /* ------------------------------------------------------------------ */
  /* RENDER                                                              */
  /* ------------------------------------------------------------------ */
  render: {
    fov: 72,
    near: 0.05,
    far: 120,
    pixelRatioCap: 1.75,
    // Prompt 2: shadows, tone mapping, exposure curve.
    shadows: false,
    shadowMapSize: 1024,
    toneMappingExposure: 1.0,
    antialias: true,
  },

  /* ------------------------------------------------------------------ */
  /* LIGHTING — placeholder values. Prompt 2 owns everything below.       */
  /* ------------------------------------------------------------------ */
  light: {
    // Ambient floor by phase of day. Keys match systems/clock.js phases.
    ambient: {
      day:   { color: 0x8fa2b4, intensity: 0.55 },
      dusk:  { color: 0x6b6272, intensity: 0.30 },
      night: { color: 0x2a3242, intensity: 0.10 },
      dawn:  { color: 0x6f7a8c, intensity: 0.28 },
    },
    // Daylight admitted through the window when the curtain is open.
    // The window has no glass, so this is unfiltered.
    windowShaft: {
      day:   { color: 0xc9d6e4, intensity: 2.2 },
      dusk:  { color: 0xd8a071, intensity: 0.9 },
      night: { color: 0x4a5c78, intensity: 0.12 },
      dawn:  { color: 0xa9b8cc, intensity: 0.8 },
      distance: 9,
      decay: 1.4,
    },
    // Interior fixtures. Cheap, ugly, and the reason things find you.
    bulb: {
      main:    { color: 0xffd9a0, intensity: 1.5, distance: 8,  decay: 1.6 },
      kitchen: { color: 0xfff2d0, intensity: 1.1, distance: 5,  decay: 1.6 },
      bath:    { color: 0xffe9c4, intensity: 0.9, distance: 4,  decay: 1.6 },
      bedroom: { color: 0xffd9a0, intensity: 1.0, distance: 5,  decay: 1.6 },
      landing: { color: 0xc9d2c0, intensity: 0.7, distance: 5,  decay: 1.8 },
    },
    // Screens throw more light than people think. This is a Concealment fact.
    screen: {
      tv:       { color: 0x8fb6ff, intensity: 1.1, distance: 5, decay: 1.7 },
      computer: { color: 0x9fd0c0, intensity: 0.7, distance: 3, decay: 1.7 },
      phone:    { color: 0xbcd8ff, intensity: 0.35, distance: 1.6, decay: 2.0 },
    },
    streetlamp: { color: 0xffb35c, intensity: 1.4, distance: 22, decay: 1.5 },
  },

  /* ------------------------------------------------------------------ */
  /* FOG + GRADE — Prompt 2 owns this whole block                        */
  /* ------------------------------------------------------------------ */
  fog: {
    interior: {
      day:   { color: 0x2b3138, density: 0.030 },
      dusk:  { color: 0x1e2129, density: 0.048 },
      night: { color: 0x090b10, density: 0.075 },
      dawn:  { color: 0x232830, density: 0.045 },
    },
    exterior: {
      day:   { color: 0x6b7480, density: 0.022 },
      dusk:  { color: 0x453f45, density: 0.038 },
      night: { color: 0x070910, density: 0.070 },
      dawn:  { color: 0x4d545e, density: 0.036 },
    },
  },

  grade: {
    // Prompt 2: vignette, grain, chromatic aberration, colour LUT.
    vignette: 0.55,
    grain: 0.06,
    saturation: 0.82,
    // Additional grade applied per condition tier (see condition.tiers).
  },

  /* ------------------------------------------------------------------ */
  /* PLAYER                                                              */
  /* ------------------------------------------------------------------ */
  player: {
    eyeHeight: 1.62,
    radius: 0.28,
    walkSpeed: 2.15,
    crouchSpeed: 1.0,
    crouchHeight: 1.05,
    accel: 14,
    friction: 12,
    lookSensitivity: 0.0021,
    maxPitch: Math.PI / 2 - 0.05,
    interactRange: 2.0,
    // Prompt 2 raises these as condition falls. Placeholder = still.
    headbobAmplitude: 0.0,
    swayAmplitude: 0.0,
  },

  /* ------------------------------------------------------------------ */
  /* CLOCK — how long a day is, and where the phase boundaries sit        */
  /* ------------------------------------------------------------------ */
  clock: {
    // In-game minutes elapsed per real second. Overlays run the clock too:
    // reading the forum burns daylight, which is the whole point.
    minutesPerSecond: 3.0,
    wakeHour: 7.0,
    duskHour: 19.5,
    nightHour: 20.5,
    dawnHour: 6.0,
    // Sleeping is permitted from here. Earlier is possible but rests badly.
    sleepAllowedHour: 20.0,
    // Stay up past this and the body decides for you.
    collapseHour: 30.0, // 06:00 the following morning
    exhaustionHour: 26.0, // 02:00 — warnings start
  },

  /* ------------------------------------------------------------------ */
  /* CONCEALMENT — the master clock                                      */
  /* ------------------------------------------------------------------ */
  concealment: {
    start: 100,
    // Act 1: the friend maintains it. It does not move.
    lockedUntilDay: 10,

    // Charged on sleep, regardless of behaviour. The materials degrade.
    baseDaily: 6.5,

    // Continuous costs, charged per in-game hour the condition holds true.
    // NOISE_LIGHT feeds the Tormentor profile; HABITATION feeds the Incursion.
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

    // One-off charges.
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

    // Above this share of total drain, the profile is "hot" and that
    // entity's events fire tonight.
    profileHotShare: 0.60,

    // Warning bands used by the HUD and by scripted dread beats.
    bands: { calm: 60, uneasy: 35, bad: 18, terminal: 0 },
  },

  /* ------------------------------------------------------------------ */
  /* FOOD + CONDITION                                                    */
  /* ------------------------------------------------------------------ */
  food: {
    // Portions in the fridge when the friend's last run lands (end of Day 9).
    startingPortions: 16,
    // What the friend leaves you with on Day 1 is his problem, not yours.
    act1Portions: 9,
    meal: { full: 2, ration: 1, none: 0 },
    // Condition delta applied at sleep from the day's eating.
    conditionFromMeal: { full: +4, ration: -2, none: -11 },
  },

  condition: {
    start: 88,
    min: 0,
    max: 100,
    // Charged at sleep.
    darknessPenalty: -3.5,     // lived the whole day without light
    badSleepPenalty: -6,       // slept before dusk or after collapse
    goodSleepBonus: +3,
    sightingPenalty: -9,
    // Prompt 2 reads these tiers to pick sway / grain / text-corruption level.
    tiers: [
      { at: 75, level: 0, label: 'tired' },
      { at: 55, level: 1, label: 'worn' },
      { at: 38, level: 2, label: 'shaking' },
      { at: 20, level: 3, label: 'failing' },
      { at: 0,  level: 4, label: 'gone' },
    ],
    // Multiplier on Understanding gained from reading, by tier level.
    comprehension: [1.0, 0.92, 0.78, 0.58, 0.35],
  },

  /* ------------------------------------------------------------------ */
  /* UNDERSTANDING                                                       */
  /* ------------------------------------------------------------------ */
  understanding: {
    max: 100,
    // Ending A / B tiers, evaluated after flag weighting.
    tiers: { high: 68, partial: 36 },
  },

  /* ------------------------------------------------------------------ */
  /* SHOTGUN                                                             */
  /* ------------------------------------------------------------------ */
  shotgun: {
    shells: 6,
    // Ending B defence length, in real seconds.
    braveDefenceSeconds: 150,
  },

  /* ------------------------------------------------------------------ */
  /* DAYS                                                                */
  /* ------------------------------------------------------------------ */
  days: {
    first: 1,
    handoff: 9,     // he comes back with everything, then goes out again
    actTwo: 10,     // his door is open
    textsBegin: 12, // the Incursion starts writing as him
    last: 15,
  },

  /* ------------------------------------------------------------------ */
  /* TRANSITIONS — Prompt 2 may retime, but keep the names                */
  /* ------------------------------------------------------------------ */
  timing: {
    overlayFadeIn: 260,
    overlayFadeOut: 200,
    plateFade: 700,
    plateHold: 1400,
    sleepFade: 1600,
    promptFade: 120,
    subtitleHold: 4200,
  },

  /* ------------------------------------------------------------------ */
  /* DEBUG                                                               */
  /* ------------------------------------------------------------------ */
  debug: {
    // Set true to log every effects.* and audio.* call. Useful in prompts 2/3.
    traceStubs: false,
    // window.BROOD test harness. Leave on; the verification script needs it.
    exposeApi: true,
  },
};

/** Resolve the condition tier object for a condition value. */
export function conditionTier(value) {
  const t = CONFIG.condition.tiers;
  for (let i = 0; i < t.length; i++) if (value >= t[i].at) return t[i];
  return t[t.length - 1];
}

export default CONFIG;
