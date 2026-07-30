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
     * The diffuse half of the window: sky bounce coming through the same
     * hole. Wide, soft, shadowed by the walls but not by the bars, and
     * worth almost nothing after sunset — which is the whole point. By day
     * the room is legible for free; at night it is a stripe on the floor.
     *
     * This is not "ambient raised to make the room navigable": it sits in
     * the aperture and it is occluded, so the bathroom stays dark and the
     * back of the flat stays dark.
     *
     * NOTE ON UNITS: decay is 1, not 2. An aperture 1.5 m across is an area
     * source, not a point, and inverse-square is the wrong law for one at
     * these distances — it would blow out the near wall to get any light on
     * the far one. Hence intensities in single digits next to the shaft's
     * four. Different exponent, different units.
     */
    windowFill: {
      day:   { color: 0x9DB2C6, intensity: 7.6 },
      dusk:  { color: 0x9A7A5C, intensity: 2.4 },
      night: { color: 0x2E3646, intensity: 0.52 },
      dawn:  { color: 0x6B7E94, intensity: 1.8 },
      distance: 18,
      decay: 1.0,
      angle: 1.12,
      penumbra: 0.48,
      from: [-4.05, 1.70, -0.2],
      to:   [2.8, 1.05, 0.1],
      // Deliberately coarse: this light must be stopped by walls and must
      // NOT redraw the bars. There is only one bar-shadow in this game.
      shadowBias: -0.0012,
      shadowNormalBias: 0.055,
    },

    /**
     * Interior bulbs. A dying CFL is greenish, cold, and never quite still.
     * Every one of these is a liability and the player knows it.
     */
    bulb: {
      main:    { color: 0xB4C2AC, intensity: 30, distance: 9.0, decay: 2.0 },
      kitchen: { color: 0xC2CBB4, intensity: 22, distance: 6.0, decay: 2.0 },
      bath:    { color: 0xB8C6B0, intensity: 15, distance: 4.5, decay: 2.0 },
      bedroom: { color: 0xC6B79A, intensity: 19, distance: 5.5, decay: 2.0 },  // his bulb is warmer. he chose it.
      landing: { color: 0xA8B8A4, intensity: 12, distance: 5.5, decay: 2.0 },
    },

    /**
     * The bounce. A bare bulb 300 mm below a white ceiling throws most of its
     * light back off that ceiling, and a rasteriser models none of it — so the
     * direct light clips the ceiling to white while the floor two metres below
     * stays black. This is the missing half, and it is what makes a lit room
     * usable rather than merely lit.
     *
     * decay 1, like windowFill, because a ceiling is an area source. Never
     * casts a shadow: bounce light has no hard edges to cast.
     *
     * Raising these is the correct way to make the room brighter. Raising
     * `ambient` is not — that flattens everything everywhere.
     */
    bulbBounce: { scale: 0.115, decay: 1.0, distanceScale: 1.5, drop: 0.62 },
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

    /**
     * THE SKY OVER THE STREET.
     *
     * The exterior had no light source at all: three interior lights, and
     * outside was lit by nothing but the ambient floor. So the most important
     * object in the game — the window — was a black rectangle behind bars at
     * noon on a clear day.
     *
     * It is not fixed with a sun. Tidewater in this weather is flat overcast,
     * and under a uniform sky a surface's appearance is simply its albedo
     * times the sky's luminance, with no shadow term at all. That closed form
     * is applied per-material to the exterior only, which is why the interior
     * stays as dark as it was. A directional light would have been the wrong
     * physics AND would have leaked through the aperture.
     *
     * `level` is the sky's luminance; `tint` is its colour.
     */
    sky: {
      day:   { level: 0.66, tint: 0xA8BACB, horizon: 0x8C9DAE },
      dusk:  { level: 0.19, tint: 0xB0784E, horizon: 0xD9884A },
      night: { level: 0.030, tint: 0x1A2130, horizon: 0x2A2A38 },
      dawn:  { level: 0.15, tint: 0x6E8298, horizon: 0x93A2B4 },
      /** Overcast thickens as the fires do. Multiplies `level` by day. */
      overcastFromDay: 9,
      overcastPerDay: 0.055,
      overcastMax: 0.46,
    },

    /** Weather, seen only through the window. Never gameplay, always mood. */
    weather: {
      // Which days it rains. It has not rained since he got here, and the
      // first rain lands on the day the water arrives.
      rainDays: [12, 13, 17, 18],
      rainSkyMul: 0.62,
      // Smoke on the northern horizon, from the day the refineries go.
      smokeFromDay: 8,
      smokePerDay: 0.075,
      smokeMax: 0.80,
    },
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

    /**
     * THE EXPOSURE FLOOR. A dark game on a bright panel is atmosphere; a dark
     * game on a dim panel is a black rectangle, and no amount of art direction
     * survives that. So exposure is lifted by how much light the player has
     * actually arranged for: a bulb on, the curtain open in daylight, a screen
     * running. Deliberate light is always rewarded with visible room.
     *
     * This is not a substitute for lighting the scene. It is the guarantee
     * that when the player DOES light the scene, they see it.
     */
    exposureFloor: {
      // Added to exposure per source the player has going.
      bulb: 0.42,          // any bulb in the room they are standing in
      bulbElsewhere: 0.10, // a bulb somewhere else in the flat
      daylight: 0.30,      // curtain open, and it is day or dawn
      screen: 0.12,        // television or monitor running
      max: 0.85,           // total lift, capped
      blendSeconds: 1.4,   // eases, so a switch is not a hard cut
    },

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
      { untilDay: 6,  saturation: 0.94, greenPull: 0.00, temp:  0.055, lift: 0.008, gain: 1.02, crush: 0.010 },
      { untilDay: 10, saturation: 0.78, greenPull: 0.28, temp:  0.020, lift: 0.004, gain: 1.00, crush: 0.020 },
      { untilDay: 13, saturation: 0.62, greenPull: 0.44, temp: -0.040, lift: -0.004, gain: 0.97, crush: 0.034 },
      { untilDay: 16, saturation: 0.50, greenPull: 0.56, temp: -0.090, lift: -0.012, gain: 0.95, crush: 0.048 },
      { untilDay: 99, saturation: 0.38, greenPull: 0.68, temp: -0.130, lift: -0.022, gain: 0.92, crush: 0.064 },
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
    /**
     * The body. 0.28 was a shoulder-width capsule and it was too fat for an
     * apartment this cramped: with 900 mm doorways it left a 340 mm window to
     * thread, which is not a body, it is a puzzle. 0.22 still stops the player
     * pressing their face through a wall.
     */
    radius: 0.22,
    /** How long a player may press into geometry before being freed. */
    unstickSeconds: 2.0,
    walkSpeed: 1.95,
    crouchSpeed: 0.95,
    crouchHeight: 1.05,
    accel: 12,
    friction: 11,
    lookSensitivity: 0.0021,
    /** Drag-to-look, used when pointer lock is unavailable (embedded frames). */
    dragSensitivity: 0.0030,
    /** Arrow-key look, rad/s. The last resort, and it must be usable. */
    keyLookSpeed: 1.35,
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
    lockedUntilDay: 11,
    /**
     * REBALANCED FOR TEN DAYS OF ACT 2 RATHER THAN SIX.
     *
     * The old numbers spent a hundred points across six nights. Ten nights on
     * the same rates is not a harder game, it is a shorter one — the player
     * would be dead on the sixteenth with four days of content unseen. So
     * every rate here is roughly two-thirds of what it was, which keeps the
     * shape (a careful player arrives at the last night with almost nothing
     * left) while giving Act 2 the ten days it now has.
     */
    baseDaily: 5.9,

    rates: {
      lightsOnNight:   { noiseLight: 1.40, habitation: 0.24 },
      lightsOnDay:     { noiseLight: 0.07, habitation: 0.13 },
      tvOnNight:       { noiseLight: 0.94, habitation: 0.20 },
      tvOnDay:         { noiseLight: 0.20, habitation: 0.13 },
      computerNight:   { noiseLight: 0.57, habitation: 0.17 },
      computerDay:     { noiseLight: 0.07, habitation: 0.10 },
      phoneNight:      { noiseLight: 0.17, habitation: 0.07 },
      phoneDay:        { noiseLight: 0.01, habitation: 0.03 },
      waterRunning:    { noiseLight: 1.60, habitation: 1.07 },
      cooking:         { noiseLight: 0.74, habitation: 2.14 },
      curtainOpenNight:{ noiseLight: 1.20, habitation: 0.60 },
      curtainOpenDay:  { noiseLight: 0.00, habitation: 0.10 },
    },

    events: {
      tvVolumeUp:     { noiseLight: 2.0,  habitation: 0.35 },
      hotMeal:        { noiseLight: 1.0,  habitation: 2.7 },
      coldMeal:       { noiseLight: 0.0,  habitation: 0.55 },
      dishesLeft:     { noiseLight: 0.0,  habitation: 1.5 },
      markTheWall:    { noiseLight: 0.0,  habitation: 0.4 },
      answerPhone:    { noiseLight: 0.8,  habitation: 0.27 },
      // The shotgun is NOT scaled. Firing it is meant to end runs.
      shotgunFired:   { noiseLight: 34.0, habitation: 6.0 },
      frontDoorOpened:{ noiseLight: 4.0,  habitation: 8.0 },
      // A light left burning while he sleeps. Per bulb, charged at the day
      // advance. He does not choose this at the moment it costs him — he
      // chose it hours earlier and then forgot, which is the whole point.
      lightLeftOn:    { noiseLight: 4.6,  habitation: 2.0 },
      // Letting the survivor in. §2. Not scaled either: it is a decision, and
      // it should cost enough that the player feels it for days.
      strangerAdmitted:{ noiseLight: 5.0, habitation: 14.0 },
    },

    profileHotShare: 0.60,
    bands: { calm: 60, uneasy: 35, bad: 18, terminal: 0 },
  },

  /* ------------------------------------------------------------------ */
  /* FOOD + CONDITION                                                    */
  /* ------------------------------------------------------------------ */
  food: {
    /** Ten nights alone, two portions to a full meal. It is not enough. */
    startingPortions: 26,
    /** The compressor stops for good. The food and the white noise go together. */
    fridgeDiesDay: 18,
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

  /**
   * TWENTY DAYS, IN TWO ACTS OF TEN.
   *
   * Act 1 — days 1 to 10. Ray is alive. He handles the outside world and the
   *   player is a guest with no agency, which is what makes Act 2 land. He
   *   goes at the end of the tenth, having left the keys, the shotgun and
   *   everything he owned.
   *
   * Act 2 — days 11 to 20. Ten days alone, in four movements:
   *   11–13  denial. He might come back. The phone still rings.
   *   14–16  the texts. The Incursion writes from his number and gets better
   *          at it every day. His voicemail greeting is still cheerful.
   *   15–16  the survivor at the door. The moral centre, and unresolved.
   *   17–19  the squeeze. Concealment near zero, calls stop connecting.
   *   20     the finale.
   */
  days: {
    first: 1,
    /** The last night Ray is in the flat. The handoff happens in it. */
    handoff: 10,
    actTwo: 11,
    /** The Incursion starts writing from his number. */
    textsBegin: 14,
    /** The window in which a human being knocks. Once, or never. */
    strangerFrom: 15, strangerTo: 16,
    /** Family calls start failing to connect. */
    callsFailFrom: 17,
    last: 20,
  },

  /* ------------------------------------------------------------------ */
  /* THE APARTMENT, ACROSS FIFTEEN DAYS                                  */
  /* ------------------------------------------------------------------ */
  decay: {
    /** Dishes pile up in the sink. Then they stop, which is worse. */
    dishes: { startDay: 11, stopDay: 16, max: 7 },
    /** Dust on flat surfaces. */
    dust: { startDay: 7, perDay: 0.040, max: 0.62 },
    /** He left them by the door and they are still by the door. */
    shoesFromDay: 11,
    /** Rubbish on the street arrives and never leaves. */
    trashFromDay: 2,
    /** All of it, by this day. Stretched with the run, not compressed. */
    trashFullDay: 17,
    /** The water comes and the blocks below stop being blocks. */
    waterFromDay: 11,
    /** How far up the street it has come, per day, after that. */
    waterPerDay: 0.95,
    /** The blue house curtain twitches in the mornings until it doesn't. */
    blueCurtainLastDay: 8,
    /**
     * The cars go, one at a time, and never all at once. His is the one that
     * never moves, and its staying is the point — so it is not in this list.
     * [day, index]. Index 1 is his.
     */
    carsGone: [[7, 0], [13, 2]],
    /** A window across the street is broken on this day and stays broken. */
    houseBrokenFromDay: 14,
  },

  /* ------------------------------------------------------------------ */
  /* THE BROADCAST                                                       */
  /* ------------------------------------------------------------------ */
  /**
   * Twenty entries each. These arcs STRETCH across the longer run — they are
   * not compressed into the first fifteen days and then held flat, because a
   * broadcast that stopped degrading on the fifteenth would tell the player
   * the game had stopped with it.
   */
  tv: {
    /** How long the set holds a channel, in seconds, by day. */
    holdSeconds: [99, 99, 99, 99, 99, 99, 80, 60, 45, 34,
                  26, 20, 16, 13, 11, 9, 7, 5, 4, 2],
    /** Broadcast decay 0..1, by day. Colour first, then sync, then snow. */
    decayByDay:  [0, 0, 0, 0, 0, 0.03, 0.07, 0.12, 0.18, 0.25,
                  0.33, 0.42, 0.51, 0.60, 0.69, 0.77, 0.85, 0.92, 0.97, 1.0],
    /** Audio drifts out of step with the anchor's mouth. Never acknowledged. */
    desyncMsByDay: [0, 0, 0, 0, 0, 20, 50, 90, 140, 200,
                    265, 335, 410, 490, 570, 650, 720, 780, 830, 870],
    /** Off-air except for two short windows, from this day. */
    reducedFromDay: 14,
    /** Colour bars and nothing else. */
    barsFromDay: 18,
    /** Snow, and it never comes back. */
    snowFromDay: 19,
    /** The EAS starts taking the broadcast at the top of the hour. */
    easFromDay: 6,
    /** From here the tone is right and the message is wrong. */
    wrongMessageFromDay: 13,
    /** A tone with no message behind it at all. */
    emptyToneDay: 18,
    /** A tone that does not stop. */
    endlessToneDay: 20,
    /** The one single-frame insert. Once, in the entire game. */
    insertDay: 17,
    insertFrameMs: 66,
    /** The station plays its sign-off in the middle of the afternoon. */
    signOffDay: 17,
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

    /**
     * BRIGHTNESS. Non-negotiable on a game this dark: panel variance is
     * enormous and a scene authored on a good monitor is a black rectangle on
     * a cheap one. Multiplies post exposure. 1.0 is as authored.
     */
    brightness: 1.0,
    brightnessMin: 0.7,
    brightnessMax: 2.2,
    /** Display gamma trim, applied after the grade. 1.0 is as authored. */
    gamma: 1.0,
    gammaMin: 0.75,
    gammaMax: 1.35,

    /* Mixing (§7). Separate sliders, because a player who needs the
     * ambient bed down to hear the captions should not lose the effects. */
    masterVolume: 0.8,
    ambientVolume: 1.0,
    effectsVolume: 1.0,
    interfaceVolume: 0.8,
    /** A hard limiter for players who cannot risk peaks. OFF by default —
     *  compressing this master would flatten the only dynamic that matters. */
    limiter: false,

    /* Captions (§8). This game hides survival-critical information in
     * audio, so these are a correctness feature. ON by default. */
    captions: true,
    /** A visual arrow for positional audio. Off by default. */
    audioCompass: false,
    /** The photosensitivity notice, shown once per machine. */
    warningSeen: false,
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
