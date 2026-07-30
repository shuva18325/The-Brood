/**
 * imagery.js — every image on every 2D screen, generated on a canvas.
 *
 * No external files, ever. Everything here returns a data URI, cached by
 * key, so it can go straight into an <img src>.
 *
 * The rule from §1 governs this whole file: the CHROME is never stylised,
 * the CONTENT can be as degraded as it needs to be. A station logo is a
 * clean station logo. A forensic plate is a forensic plate.
 */

import P from '../fx/photo.js';
import { drawEntity } from '../fx/entityArt.js';

const cache = new Map();

function make(key, w, h, draw, encode) {
  if (cache.has(key)) return cache.get(key);
  const c = P.surface(w, h);
  draw(c.getContext('2d'), w, h, c);
  const url = encode ? encode(c) : c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/* ================================================================== */
/* CHROME — clean, boring, correct. Never touched by the horror layer.  */
/* ================================================================== */

/**
 * WKRV 9. A local network affiliate's logo, in the house navy, exactly as
 * unremarkable as a real one. It must be indistinguishable from the real
 * thing for the first eight days, because that is what makes day nine work.
 */
export function stationLogo(w = 168, h = 54) {
  return make('logo.' + w, w, h, (g) => {
    g.fillStyle = '#0B2A4A'; g.fillRect(0, 0, w, h);
    // the swoosh every affiliate has had since 1998
    g.fillStyle = '#C4242B';
    g.beginPath();
    g.moveTo(w * 0.60, 0); g.lineTo(w, 0); g.lineTo(w * 0.80, h); g.lineTo(w * 0.40, h);
    g.closePath(); g.fill();
    g.fillStyle = '#ffffff';
    g.font = `bold ${Math.round(h * 0.52)}px Arial, Helvetica, sans-serif`;
    g.textBaseline = 'middle';
    g.fillText('WKRV', w * 0.05, h * 0.5);
    g.font = `bold ${Math.round(h * 0.72)}px Arial, Helvetica, sans-serif`;
    g.fillText('9', w * 0.70, h * 0.52);
  });
}

/** The on-air bug, bottom right of the broadcast. */
export function stationBug(w = 96, h = 34) {
  return make('bug', w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.globalAlpha = 0.82;
    g.fillStyle = '#0B2A4A';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#C4242B'; g.fillRect(0, 0, 4, h);
    g.globalAlpha = 1;
    g.fillStyle = '#ffffff';
    g.font = `bold 15px Arial, Helvetica, sans-serif`;
    g.textBaseline = 'middle';
    g.fillText('WKRV', 10, h * 0.5);
    g.font = `bold 19px Arial, Helvetica, sans-serif`;
    g.fillText('9', 66, h * 0.52);
  });
}

/**
 * The desktop wallpaper. Four people at a cookout, one of them Ray,
 * low resolution and stretched slightly wrong for the monitor.
 *
 * This is a piece of chrome that is allowed to hurt, because it is real —
 * it is just a photograph somebody set as their wallpaper and forgot.
 */
export function wallpaper(w = 960, h = 600) {
  return make('wall', w, h, (g) => {
    // late afternoon, back yard, too much sky
    const sky = g.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#8fa6bd'); sky.addColorStop(1, '#c9c0aa');
    g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.58);
    g.fillStyle = '#5d6b45'; g.fillRect(0, h * 0.55, w, h * 0.45);
    // a fence, a shed, a tree that is mostly a blob
    g.fillStyle = '#6b5a44'; g.fillRect(0, h * 0.44, w, h * 0.13);
    for (let x = 0; x < w; x += 26) { g.fillStyle = 'rgba(40,32,22,0.25)'; g.fillRect(x, h * 0.44, 3, h * 0.13); }
    g.fillStyle = '#3e4d33';
    g.beginPath(); g.ellipse(w * 0.16, h * 0.30, w * 0.13, h * 0.20, 0, 0, 7); g.fill();
    // the grill, and the smoke off it
    g.fillStyle = '#2b2b2e';
    g.fillRect(w * 0.72, h * 0.48, w * 0.09, h * 0.10);
    g.fillRect(w * 0.755, h * 0.58, w * 0.02, h * 0.09);
    g.fillStyle = 'rgba(220,220,215,0.30)';
    g.beginPath(); g.ellipse(w * 0.765, h * 0.42, w * 0.05, h * 0.07, 0.4, 0, 7); g.fill();

    // four people. Nobody is posed. One is turned away.
    const folk = [
      [0.30, 0.62, '#b4423c', 0.0],
      [0.41, 0.63, '#3f5f7a', 0.1],
      [0.52, 0.615, '#d8d2c2', -0.05],   // Ray, in the white shirt, mid-laugh
      [0.63, 0.635, '#4a5d3f', 0.06],
    ];
    for (const [fx, fy, shirt, tilt] of folk) {
      const px = w * fx, py = h * fy;
      g.save(); g.translate(px, py); g.rotate(tilt);
      g.fillStyle = shirt;
      g.fillRect(-w * 0.026, -h * 0.13, w * 0.052, h * 0.17);
      g.fillStyle = '#6b4f3c';
      g.beginPath(); g.arc(0, -h * 0.155, w * 0.021, 0, 7); g.fill();
      g.fillStyle = '#2f3542';
      g.fillRect(-w * 0.024, h * 0.04, w * 0.020, h * 0.16);
      g.fillRect(w * 0.004, h * 0.04, w * 0.020, h * 0.16);
      g.restore();
    }

    // a phone camera in 2019, held by someone who had had two beers
    P.exposure(g.canvas, 0.22);
    P.motionBlur(g.canvas, 4, 2, 0.28);
    P.resample(g.canvas, 0.42);
    P.chromaBleed(g.canvas, 0.4);
    P.noise(g.canvas, 12);
    P.vignette(g.canvas, 0.24);
  }, (c) => P.jpeg(c, 0.55));
}

/** The weather widget's stock photo. A beach. Nobody has updated it. */
export function weatherStock(w = 300, h = 150) {
  return make('wx', w, h, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#4d8fc4'); sky.addColorStop(1, '#a9cbe2');
    g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.62);
    g.fillStyle = '#2e6f96'; g.fillRect(0, h * 0.58, w, h * 0.20);
    g.fillStyle = '#d8c9a4'; g.fillRect(0, h * 0.76, w, h * 0.24);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.ellipse(w * (0.15 + i * 0.22), h * (0.18 + (i % 2) * 0.07),
        w * 0.09, h * 0.05, 0, 0, 7); g.fill();
    }
    P.jpeg(g.canvas, 0.5);
  }, (c) => P.jpeg(c, 0.5));
}

/** Local advertisers. They keep rendering long after anyone is buying. */
export function ad(kind, w = 300, h = 250) {
  return make('ad.' + kind + w, w, h, (g) => {
    const A = {
      injury: { bg: '#12233f', fg: '#f2c14e',
        l1: 'INJURED?', l2: 'HOLLIS & BRAY', l3: 'ATTORNEYS AT LAW',
        l4: 'No fee unless we win', l5: '(757) 555‑0900' },
      car:    { bg: '#8c1c1c', fg: '#ffffff',
        l1: '0% APR', l2: 'TIDEWATER FORD', l3: 'MILITARY HWY',
        l4: '48 months · O.A.C.', l5: 'SE HABLA ESPAÑOL' },
      roof:   { bg: '#20402a', fg: '#e8e2cf',
        l1: 'FREE ESTIMATE', l2: 'CASSELL ROOFING', l3: 'SINCE 1974',
        l4: 'Storm damage specialists', l5: '(757) 555‑0144' },
      hvac:   { bg: '#1c3b52', fg: '#ffe08a',
        l1: '$59 TUNE‑UP', l2: 'DELMAR HEAT & AIR', l3: '24 HOUR SERVICE',
        l4: 'Financing available', l5: '(757) 555‑0177' },
    }[kind] || {};
    g.fillStyle = A.bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6);
    g.textAlign = 'center';
    g.fillStyle = A.fg;
    g.font = `bold ${Math.round(h * 0.16)}px Arial Black, Arial, sans-serif`;
    g.fillText(A.l1, w / 2, h * 0.24);
    g.fillStyle = '#ffffff';
    g.font = `bold ${Math.round(h * 0.095)}px Arial, sans-serif`;
    g.fillText(A.l2, w / 2, h * 0.42);
    g.font = `${Math.round(h * 0.062)}px Arial, sans-serif`;
    g.fillText(A.l3, w / 2, h * 0.53);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.font = `${Math.round(h * 0.055)}px Arial, sans-serif`;
    g.fillText(A.l4, w / 2, h * 0.68);
    g.fillStyle = A.fg;
    g.font = `bold ${Math.round(h * 0.085)}px Arial, sans-serif`;
    g.fillText(A.l5, w / 2, h * 0.84);
    g.textAlign = 'left';
  }, (c) => P.jpeg(c, 0.72));
}

/** Forum avatars. Everyone's is from a different decade. */
export function avatar(seed, size = 60) {
  return make('av.' + seed + size, size, size, (g, w, h) => {
    let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    const style = Math.floor(rnd() * 4);

    if (style === 0) {           // a photo of a boat, or a dog, or a truck
      g.fillStyle = `hsl(${Math.floor(rnd() * 60 + 180)},30%,${30 + rnd() * 20}%)`;
      g.fillRect(0, 0, w, h);
      g.fillStyle = `hsl(${Math.floor(rnd() * 40 + 20)},40%,45%)`;
      g.beginPath(); g.ellipse(w * 0.5, h * 0.65, w * 0.32, h * 0.22, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(0, h * 0.72, w, h * 0.28);
    } else if (style === 1) {    // a solid colour and two initials
      g.fillStyle = `hsl(${Math.floor(rnd() * 360)},35%,32%)`;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8e4d8';
      g.font = `bold ${Math.round(h * 0.44)}px Verdana, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(seed.slice(0, 2).toUpperCase(), w / 2, h / 2);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    } else if (style === 2) {    // the default avatar of a dead forum skin
      g.fillStyle = '#c8ccd4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8d95a3';
      g.beginPath(); g.arc(w * 0.5, h * 0.36, w * 0.18, 0, 7); g.fill();
      g.beginPath(); g.ellipse(w * 0.5, h * 0.92, w * 0.32, h * 0.30, 0, 0, 7); g.fill();
    } else {                     // an animated gif, from before it stopped moving
      for (let i = 0; i < 5; i++) {
        g.fillStyle = `hsl(${Math.floor(rnd() * 360)},70%,${40 + rnd() * 30}%)`;
        g.fillRect(rnd() * w, rnd() * h, w * 0.4, h * 0.4);
      }
    }
    P.noise(g.canvas, 8);
  }, (c) => P.jpeg(c, 0.6));
}

/* ================================================================== */
/* CONTENT — this is where the horror is allowed to live.               */
/* ================================================================== */

/* ================================================================== */
/* THE FOUND PHOTOGRAPHS (§3)                                          */
/*                                                                     */
/* PROMPT 4 OVERRIDES PROMPT 2 HERE. The old version destroyed these   */
/* to sell "bad phone photo" and what it produced was noise. The rule  */
/* now is: the player should be able to see it perfectly and still not */
/* understand it. Detail high, meaning zero.                           */
/*                                                                     */
/* Each entity gets its own photographic CIRCUMSTANCE, because the      */
/* circumstance is the characterisation. What is wrong with the picture */
/* is composition and luck, not resolution.                            */
/* ================================================================== */

/**
 * Per-entity scene: where it was photographed, by whom, with what, and what
 * went wrong. `sharp` means the subject is not degraded at all.
 */
const SCENES = {
  /* The one image where the subject is fully sharp, because the officer who
   * took it could not look away. Everything about the exposure is wrong and
   * the thing in the middle of it is perfectly resolved. */
  anguish: {
    /* §3.5. Not a street photograph — a PLATE. Pale seamless sweep, two
     * lights at 45°, shot square, dead centre, scale bar underneath. It is
     * the only image in the game taken by somebody who had time.
     *
     * Which means there is nothing to blame for how clearly you can see it.
     * No flare, no missed focus, no motion, barely any grain and barely any
     * vignette, because a plate does not have those. The player gets to
     * look at it for as long as they want, and the horns go out past both
     * edges of the frame, and the four eyes are large enough to count. */
    ground: 'specimen', stops: 0.06, focus: null, flare: null,
    x: 0.11, y: 0.015, scale: 0.78, sharp: true, sharpen: 0.40, quality: 0.94,
    limb: null, cast: [1.00, 1.00, 1.00, 0], vignette: 0.14,
  },
  /* From below, on a phone held at chest height, with a car for scale. In
   * frame from mid-torso DOWN — the top of it is not obscured, it is outside
   * the photograph. That is a framing decision, which is legitimate. */
  tormentor: {
    /* ALL OF IT IS IN FRAME NOW. It used to be cropped at mid-torso, with a
     * note saying the head and horns were outside the photograph and that
     * this was a legitimate framing decision — and it was, and it was also
     * the reason nobody could tell what the thing was. §3.1 says the player
     * should be able to see it perfectly and still not understand it, and
     * cropping the head off is not "perfectly".
     *
     * So: whole animal, off-centre, under the lamp, with a car for scale.
     * One tentacle is still smeared, because one of eleven moving limbs
     * being blurred at 1/15s is what a real photograph of this would do. */
    ground: 'street-night', stops: -0.12, focus: null,
    flare: [0.13, 0.15, 0.26],
    // Whole animal, head to feet, inside the frame with room around it —
    // which on a 4:3 phone frame and a 0.62 aspect means it can only be
    // about 45% of the width. It is across the street. It is supposed to be.
    x: 0.26, y: 0.030, scale: 0.44, quality: 0.86,
    limb: { x: 0.30, y: 0.80, w: 0.12, h: 0.18, angle: 76, px: 8 },
    cast: [1.08, 0.99, 0.90, 0.26], vignette: 0.34, scaleRef: 'car',
  },
  /* Indoors, in a green hallway, with flash. The flash worked, and the hand
   * is nearer the lens than the person holding the phone had realised. */
  incursion: {
    ground: 'hallway-flash', stops: 0.04, focus: null,
    flare: null, x: 0.40, y: 0.02, scale: 0.74, sharp: true, quality: 0.88,
    limb: null, cast: [0.98, 1.03, 0.99, 0.16], vignette: 0.34,
  },
  /* The most-photographed entity, because it is the most survivable. Several,
   * low, clear, and almost mundane, which is its own horror. */
  crawler: {
    ground: 'kerb-daylight', stops: -0.05, focus: { y0: 0.55, y1: 1.0, px: 3 },
    flare: null, x: 0.30, y: 0.60, scale: 0.26, quality: 0.88,
    limb: null, cast: [1.00, 1.01, 1.02, 0.10], vignette: 0.22,
    extras: [[0.58, 0.66, 0.20], [0.80, 0.62, 0.16]],
  },
  gleaner: {
    ground: 'kerb-daylight', stops: -0.12, focus: { y0: 0.42, y1: 1.0, px: 3 },
    flare: null, x: 0.34, y: 0.30, scale: 0.40, quality: 0.86,
    limb: null, cast: [1.02, 1.00, 0.98, 0.12], vignette: 0.28,
    extras: [[0.66, 0.34, 0.34], [0.86, 0.38, 0.28]],
  },
  /* Rendered BY A DISPLAY, so it has no photographic excuse to be soft.
   *
   * The caption is part of the transmission, not part of the photograph. It
   * is in Simplified Chinese and it is not translated anywhere in the game
   * unless the player finds the translator on the desktop and types it in
   * themselves — at which point they learn that it says the same thing the
   * red-link mail says, which is the first evidence that the mail and the
   * thing on the screen are the same sender. */
  pathogen: {
    ground: 'monitor', stops: 0.0, focus: null, flare: null,
    x: 0.30, y: 0.02, scale: 0.42, sharp: true, quality: 0.90,
    limb: null, cast: [0.96, 1.00, 1.08, 0.20], vignette: 0.34,
    caption: '你对此无能为力。你们都将终生受苦。',
  },
  /* Through a windscreen at night with the headlights on it. Perfectly lit
   * and perfectly clear, because a car's beam is aimed exactly at it. This
   * is the sharpest image in the game. */
  roadkill: {
    ground: 'headlights', stops: 0.15, focus: null, flare: null,
    x: 0.48, y: 0.30, scale: 0.52, sharp: true, sharpen: 0.55, quality: 0.92,
    limb: null, cast: [1.00, 1.00, 1.00, 0], vignette: 0.36, glass: 0.07,
  },
  person: {
    ground: 'street-night', stops: -0.45, focus: { y0: 0.3, y1: 0.9, px: 3 },
    flare: [0.20, 0.16, 0.30], x: 0.5, y: 0.20, scale: 0.38, quality: 0.80,
    limb: null, cast: [1.12, 0.99, 0.86, 0.32], vignette: 0.44,
  },
};

/* --- the grounds. Four places, and each one lights differently. ---- */

function groundStreetNight(g, W, H) {
  g.fillStyle = '#12141a'; g.fillRect(0, 0, W, H);
  const lamp = g.createRadialGradient(W * 0.14, H * 0.20, 0, W * 0.14, H * 0.20, W * 0.62);
  lamp.addColorStop(0, 'rgba(240,180,104,0.78)');
  lamp.addColorStop(0.28, 'rgba(168,112,52,0.30)');
  lamp.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = lamp; g.fillRect(0, 0, W, H);
  // Wet asphalt, and the lamp lying along it.
  g.fillStyle = '#1b1e25'; g.fillRect(0, H * 0.70, W, H * 0.30);
  const wet = g.createLinearGradient(0, H * 0.70, 0, H);
  wet.addColorStop(0, 'rgba(214,158,88,0.16)');
  wet.addColorStop(1, 'rgba(214,158,88,0.02)');
  g.fillStyle = wet; g.fillRect(W * 0.04, H * 0.70, W * 0.30, H * 0.30);
  // A parked car, cropped by the frame edge. Scale, and something to be
  // partly behind.
  g.fillStyle = '#171a1f';
  g.beginPath();
  g.moveTo(W * 0.72, H * 0.86); g.lineTo(W * 0.78, H * 0.68);
  g.lineTo(W * 1.02, H * 0.66); g.lineTo(W * 1.02, H * 0.92);
  g.closePath(); g.fill();
  g.fillStyle = 'rgba(226,188,130,0.10)';
  g.fillRect(W * 0.80, H * 0.70, W * 0.16, H * 0.07);
}

/**
 * The hallway the Incursion is photographed in. It is GREEN, and the green
 * is not a filter — it is a failing fluorescent tube in a 1970s apartment
 * block, which goes cyan-green as the phosphor dies, and every hallway like
 * it in the world looks exactly like this at three in the morning.
 *
 * That matters because it means the colour is the building's, not the
 * thing's. Nothing in the photograph has been graded. The player is looking
 * at a corridor they have walked down.
 */
function groundHallwayFlash(g, W, H) {
  g.fillStyle = '#060a09'; g.fillRect(0, 0, W, H);

  // The corridor, in one-point perspective, vanishing slightly left of
  // centre because the person holding the phone was not standing straight.
  const VX = W * 0.46, VY = H * 0.50;
  const walls = [
    // [near x, far x, base colour]
    [0, VX - W * 0.13, '#4f6b5c'],
    [W, VX + W * 0.13, '#3f5a4d'],
  ];
  for (const [nx, fx, col] of walls) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(nx, 0); g.lineTo(fx, VY - H * 0.30);
    g.lineTo(fx, VY + H * 0.32); g.lineTo(nx, H);
    g.closePath(); g.fill();
  }
  // The end wall, further away and therefore darker and greener.
  g.fillStyle = '#25382f';
  g.fillRect(VX - W * 0.13, VY - H * 0.30, W * 0.26, H * 0.62);

  // Doors down the left side, receding. Two of them, and one is ajar.
  for (const [t, ajar] of [[0.18, false], [0.52, true]]) {
    const x0 = W * 0.02 + (VX - W * 0.13 - W * 0.02) * t;
    const x1 = W * 0.02 + (VX - W * 0.13 - W * 0.02) * (t + 0.30);
    const yTop = VY - H * 0.30 - (VY - H * 0.30) * (1 - t) * 0.92;
    const yBot = H - (H - (VY + H * 0.32)) * t * 0.92;
    g.fillStyle = '#2c4038';
    g.beginPath();
    g.moveTo(x0, yTop); g.lineTo(x1, yTop + (yBot - yTop) * 0.06);
    g.lineTo(x1, yBot - (yBot - yTop) * 0.04); g.lineTo(x0, yBot);
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(126,158,140,0.34)'; g.lineWidth = 2;
    g.stroke();
    if (ajar) {
      // The gap. Black, and the black goes further back than the wall does.
      g.fillStyle = '#000000';
      g.beginPath();
      g.moveTo(x1 - W * 0.030, yTop + (yBot - yTop) * 0.05);
      g.lineTo(x1, yTop + (yBot - yTop) * 0.06);
      g.lineTo(x1, yBot - (yBot - yTop) * 0.04);
      g.lineTo(x1 - W * 0.030, yBot - (yBot - yTop) * 0.02);
      g.closePath(); g.fill();
    }
  }

  // The carpet. Patterned, worn down the middle, and the pattern is the
  // most legible thing in the photograph.
  g.fillStyle = '#2a3a2e';
  g.beginPath();
  g.moveTo(0, H); g.lineTo(VX - W * 0.13, VY + H * 0.32);
  g.lineTo(VX + W * 0.13, VY + H * 0.32); g.lineTo(W, H);
  g.closePath(); g.fill();
  g.save();
  g.beginPath();
  g.moveTo(0, H); g.lineTo(VX - W * 0.13, VY + H * 0.32);
  g.lineTo(VX + W * 0.13, VY + H * 0.32); g.lineTo(W, H);
  g.closePath(); g.clip();
  for (let i = 0; i < 16; i++) {
    const t = i / 16;
    const y = VY + H * 0.32 + (H - VY - H * 0.32) * (t * t);
    g.strokeStyle = `rgba(150,132,96,${0.05 + t * 0.10})`;
    g.lineWidth = Math.max(1, 1 + t * 3);
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  g.restore();

  // Skirting boards, running to the vanishing point.
  g.strokeStyle = 'rgba(18,26,22,0.85)'; g.lineWidth = Math.max(2, W * 0.006);
  g.beginPath(); g.moveTo(0, H * 0.99); g.lineTo(VX - W * 0.13, VY + H * 0.32); g.stroke();
  g.beginPath(); g.moveTo(W, H * 0.99); g.lineTo(VX + W * 0.13, VY + H * 0.32); g.stroke();

  /* The tube. It is the light source, so it is drawn as an actual fixture
   * with an actual position, and it is the reason for the colour. One end of
   * it has gone — that end is pink-white and the rest is green, which is
   * exactly what a tube does in the last week of its life. */
  const tw = W * 0.30, ty = H * 0.09;
  const tube = g.createLinearGradient(VX - tw / 2, 0, VX + tw / 2, 0);
  tube.addColorStop(0, 'rgba(244,222,220,0.95)');
  tube.addColorStop(0.22, 'rgba(206,238,214,0.92)');
  tube.addColorStop(1, 'rgba(150,206,168,0.70)');
  g.fillStyle = tube;
  g.fillRect(VX - tw / 2, ty, tw, H * 0.020);
  const halo = g.createRadialGradient(VX, ty + H * 0.01, 0, VX, ty + H * 0.01, W * 0.55);
  halo.addColorStop(0, 'rgba(178,236,196,0.34)');
  halo.addColorStop(0.4, 'rgba(120,190,150,0.12)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo; g.fillRect(0, 0, W, H);

  // And the flash, which fired, and which is the only white light in the
  // frame. It falls off fast, so the far end of the corridor stays green.
  const fl = g.createRadialGradient(W * 0.5, H * 0.62, 0, W * 0.5, H * 0.62, W * 0.72);
  fl.addColorStop(0, 'rgba(255,252,242,0.26)');
  fl.addColorStop(0.42, 'rgba(240,252,244,0.06)');
  fl.addColorStop(1, 'rgba(0,4,2,0.66)');
  g.fillStyle = fl; g.fillRect(0, 0, W, H);
}

/**
 * §3.5. The Anguish plate. A pale seamless sweep, flat frontal light, a
 * scale bar, and an accession number — the way a museum photographs a
 * specimen, and the way nothing else in this game is photographed.
 *
 * The sweep is the whole horror of it. Somebody had it on a table. Somebody
 * set up two lights and a grey card. The game never says who.
 */
function groundSpecimen(g, W, H) {
  // The sweep: a paper roll coming down the back wall and curving onto the
  // table, so there is no corner anywhere and no way to tell how deep it is.
  const sw = g.createLinearGradient(0, 0, 0, H);
  sw.addColorStop(0, '#d9d6cd');
  sw.addColorStop(0.52, '#cfccc2');
  sw.addColorStop(0.72, '#bdbab0');
  sw.addColorStop(1, '#a9a69c');
  g.fillStyle = sw; g.fillRect(0, 0, W, H);
  // A soft floor shadow, from two lights at 45°, so it is doubled and neither
  // copy is dark. This is what says "table", with no table in frame.
  for (const [ox, a] of [[-0.045, 0.16], [0.052, 0.13]]) {
    const sh = g.createRadialGradient(W * (0.5 + ox), H * 0.90, 0, W * (0.5 + ox), H * 0.90, W * 0.34);
    sh.addColorStop(0, `rgba(84,80,74,${a})`);
    sh.addColorStop(1, 'rgba(84,80,74,0)');
    g.fillStyle = sh; g.fillRect(0, H * 0.66, W, H * 0.34);
  }
  // A crease in the paper, bottom left, because the roll had been used before.
  g.strokeStyle = 'rgba(150,146,138,0.40)';
  g.lineWidth = Math.max(1, W * 0.0025);
  g.beginPath();
  g.moveTo(0, H * 0.80);
  g.bezierCurveTo(W * 0.14, H * 0.775, W * 0.20, H * 0.815, W * 0.34, H * 0.79);
  g.stroke();

  // The scale bar. Millimetres, and it is long enough to say the thing is
  // about fifty centimetres tall, which is not what anybody expects.
  const bx = W * 0.06, by = H * 0.945, bw = W * 0.24;
  g.fillStyle = '#16171a';
  for (let i = 0; i < 10; i++) {
    if (i % 2 === 0) g.fillRect(bx + (bw / 10) * i, by, bw / 10, H * 0.014);
  }
  g.strokeStyle = '#16171a'; g.lineWidth = 1;
  g.strokeRect(bx, by, bw, H * 0.014);
  g.fillStyle = '#16171a';
  g.font = `${Math.round(H * 0.026)}px "Courier New", monospace`;
  g.textBaseline = 'middle';
  g.fillText('100 mm', bx + bw + W * 0.016, by + H * 0.007);
  g.textBaseline = 'alphabetic';

  // The accession strip, top right, in the hand of somebody who wrote a lot
  // of these. No agency name anywhere on it.
  g.fillStyle = 'rgba(255,255,255,0.72)';
  g.fillRect(W * 0.66, H * 0.030, W * 0.29, H * 0.072);
  g.strokeStyle = 'rgba(70,68,64,0.5)'; g.lineWidth = 1;
  g.strokeRect(W * 0.66, H * 0.030, W * 0.29, H * 0.072);
  g.fillStyle = '#24252a';
  g.font = `${Math.round(H * 0.030)}px "Courier New", monospace`;
  g.fillText('SPEC. 4 / PL. 11', W * 0.675, H * 0.062);
  g.font = `${Math.round(H * 0.024)}px "Courier New", monospace`;
  g.fillStyle = '#4a4b50';
  g.fillText('RECOVERED — INTACT', W * 0.675, H * 0.090);
}

function groundKerbDaylight(g, W, H) {
  // Flat overcast. No drama at all, which is the point: these images are
  // almost mundane, and being almost mundane is what makes them bad.
  g.fillStyle = '#8d949a'; g.fillRect(0, 0, W, H * 0.42);
  g.fillStyle = '#5f635f'; g.fillRect(0, H * 0.42, W, H * 0.14);
  g.fillStyle = '#8e8b81'; g.fillRect(0, H * 0.56, W, H * 0.10);   // pavement
  g.fillStyle = '#6a6862'; g.fillRect(0, H * 0.64, W, H * 0.04);   // kerb
  g.fillStyle = '#3f4247'; g.fillRect(0, H * 0.68, W, H * 0.32);   // road
  // Grit, a drain, a flattened box. The set dressing of a real street.
  g.fillStyle = 'rgba(30,32,36,0.5)';
  g.fillRect(W * 0.06, H * 0.78, W * 0.10, H * 0.035);
  for (let i = 0; i < 400; i++) {
    g.fillStyle = `rgba(${60 + Math.random() * 40 | 0},${62 + Math.random() * 36 | 0},${64 + Math.random() * 34 | 0},0.4)`;
    g.fillRect(Math.random() * W, H * 0.68 + Math.random() * H * 0.32, 2, 2);
  }
  g.fillStyle = 'rgba(150,144,132,0.55)';
  g.fillRect(W * 0.72, H * 0.72, W * 0.13, H * 0.05);
}

function groundMonitor(g, W, H) {
  // A CRT, photographed off the glass. Scanlines belong to the display, not
  // to the photograph — so they are drawn, not applied as damage.
  g.fillStyle = '#04060a'; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, W * 0.7);
  glow.addColorStop(0, 'rgba(74,108,140,0.30)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = glow; g.fillRect(0, 0, W, H);
}

function groundHeadlights(g, W, H) {
  // Night, from inside a car. The beam is a hard-edged cone on the tarmac
  // and everything outside it is gone.
  g.fillStyle = '#05070a'; g.fillRect(0, 0, W, H);
  g.save();
  g.beginPath();
  g.moveTo(W * 0.16, H); g.lineTo(W * 0.40, H * 0.44);
  g.lineTo(W * 0.62, H * 0.44); g.lineTo(W * 0.88, H);
  g.closePath();
  g.clip();
  const beam = g.createLinearGradient(0, H, 0, H * 0.44);
  beam.addColorStop(0, 'rgba(236,232,214,0.60)');
  beam.addColorStop(0.6, 'rgba(226,222,204,0.34)');
  beam.addColorStop(1, 'rgba(210,208,192,0.10)');
  g.fillStyle = '#3a3a36'; g.fillRect(0, H * 0.40, W, H * 0.60);
  g.fillStyle = beam; g.fillRect(0, H * 0.40, W, H * 0.60);
  // Lane markings running away under it.
  g.fillStyle = 'rgba(232,228,206,0.55)';
  for (let i = 0; i < 5; i++) {
    const t = i / 5;
    const y = H * (0.98 - t * 0.52);
    const wdt = W * (0.055 - t * 0.040);
    g.fillRect(W * 0.5 - wdt / 2, y, wdt, H * (0.030 - t * 0.021));
  }
  g.restore();
}

const GROUNDS = {
  'street-night': groundStreetNight,
  'hallway-flash': groundHallwayFlash,
  'kerb-daylight': groundKerbDaylight,
  specimen: groundSpecimen,
  monitor: groundMonitor,
  headlights: groundHeadlights,
};

/**
 * A found photograph of an entity.
 *
 * §3.1: the player should be able to see it perfectly and still not
 * understand it. Everything that made these unreadable is gone. What is left
 * is bad photography — wrong exposure, a missed focus plane, a limb that
 * moved, a flare, and framing by somebody who was not thinking about framing.
 */
export function phoneSnap(kind, opts = {}) {
  const w = opts.w || 560, h = opts.h || 420;
  const S = { ...(SCENES[kind] || SCENES.person), ...opts };
  return make('snap.' + kind + (opts.variant || ''), w, h, (g, W, H, c) => {
    (GROUNDS[S.ground] || groundStreetNight)(g, W, H);

    // Other individuals first, so the nearest one is in front.
    for (const [ex, ey, es] of S.extras || []) {
      drawEntity(g, kind, W * ex, H * ey, W * es);
    }

    // The subject. Off-centre, and sometimes not all of it is in the frame.
    drawEntity(g, kind, W * S.x, H * S.y, W * S.scale);

    if (S.ground === 'monitor') {
      /* The caption. Drawn BEFORE the scanlines, because it is coming down
       * the same signal the face is — if it sat on top of them it would read
       * as an overlay somebody added, and nobody added it. Red on black, in
       * whatever CJK face the machine has, at the size a broadcast subtitle
       * is, with a chroma bloom around it because red on a CRT bleeds. */
      if (S.caption) {
        const size = Math.round(H * 0.062);
        g.font = `${size}px "Noto Sans CJK SC","Microsoft YaHei","PingFang SC",` +
                 `"Hiragino Sans GB","Heiti SC",sans-serif`;
        g.textAlign = 'center';
        g.textBaseline = 'alphabetic';
        const cy = H * 0.885;
        // The bleed first, wide and dim.
        g.shadowColor = 'rgba(210,26,20,0.85)';
        g.shadowBlur = size * 0.9;
        g.fillStyle = 'rgba(196,24,18,0.55)';
        g.fillText(S.caption, W * 0.5, cy);
        g.shadowBlur = 0;
        // Then the glyphs, and the red channel is a pixel to the right of
        // where the luminance is, the same way it is on the face.
        g.fillStyle = 'rgba(120,10,8,0.95)';
        g.fillText(S.caption, W * 0.5 + 2, cy);
        g.fillStyle = 'rgba(236,58,48,0.98)';
        g.fillText(S.caption, W * 0.5, cy);
        g.textAlign = 'left';
      }
      // The display's own scanlines, over the subject, because they are part
      // of the picture rather than damage to it.
      g.fillStyle = 'rgba(0,0,0,0.30)';
      for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
    }

    /* ---- and now, gently ---- */

    // Slightly wrong exposure. Slightly.
    if (S.stops) P.exposure(c, S.stops);

    // A focus plane that is nearly right. Never applied to a sharp subject.
    if (S.focus && !S.sharp) P.focusPlane(c, S.focus);

    // One limb smeared while the body stays sharp.
    if (S.limb && !S.sharp) {
      P.limbBlur(c, W * S.limb.x, H * S.limb.y, W * S.limb.w, H * S.limb.h,
                 S.limb.angle, S.limb.px, 0.85);
    }

    // A flare off whatever was bright and in frame.
    if (S.flare) P.lensFlare(c, W * S.flare[0], H * S.flare[1], W * S.flare[2]);

    // A faint reflection, if it was shot through glass.
    if (S.glass) P.glass(c, S.glass);

    // Colour: the white balance guessed, and it guessed under sodium.
    if (S.cast && S.cast[3]) P.cast(c, S.cast[0], S.cast[1], S.cast[2], S.cast[3]);

    // Sensor grain. A tenth of what it was, and monochrome, because that is
    // what luminance noise actually looks like.
    P.noise(c, S.sharp ? 4 : 7, true);
    P.vignette(c, S.vignette ?? 0.34);

    // The one image the headlights were aimed at gets bite put back in.
    if (S.sharpen) P.sharpen(c, S.sharpen);
  }, (c) => P.jpeg(c, S.quality ?? 0.84));
}

/**
 * A forensic plate. §5A.4: clinical rather than lurid — flat on-camera
 * flash, bad colour, a scale ruler, an evidence marker, an exhibit number
 * below the frame.
 *
 * The clinical register is what makes it horrifying. Someone filed this.
 */
export function evidencePlate(opts = {}) {
  const w = 460, h = 400;
  return make('ev.' + (opts.id || 'x'), w, h, (g, W, H, c) => {
    const frameH = H - 42;

    // Institutional floor or a tarp, lit by nothing but the flash.
    g.fillStyle = opts.ground || '#4c4a44';
    g.fillRect(0, 0, W, frameH);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${90 + Math.random() * 40 | 0},${88 + Math.random() * 36 | 0},${80 + Math.random() * 30 | 0},0.25)`;
      g.fillRect(Math.random() * W, Math.random() * frameH, 2, 2);
    }
    // Flash falloff: hot in the middle, black at the corners. On-camera.
    const flash = g.createRadialGradient(W * 0.5, frameH * 0.45, 0, W * 0.5, frameH * 0.45, W * 0.72);
    flash.addColorStop(0, 'rgba(255,252,240,0.42)');
    flash.addColorStop(0.5, 'rgba(255,250,235,0.10)');
    flash.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = flash; g.fillRect(0, 0, W, frameH);

    // The subject. Deliberately unresolved: a dark mass, a wet sheen, and
    // the thing that makes it awful is the ruler next to it.
    if (opts.subject !== 'none') {
      g.save();
      g.translate(W * 0.46, frameH * 0.56);
      g.rotate(opts.rot ?? -0.18);
      g.fillStyle = opts.tone || '#241a18';
      g.beginPath();
      g.moveTo(-95, -20);
      g.bezierCurveTo(-60, -70, 55, -66, 92, -12);
      g.bezierCurveTo(105, 26, 40, 58, -14, 50);
      g.bezierCurveTo(-70, 44, -110, 16, -95, -20);
      g.fill();
      // a sheen, because whatever it is has not dried
      g.fillStyle = 'rgba(190,180,172,0.16)';
      g.beginPath(); g.ellipse(-18, -22, 44, 15, -0.3, 0, 7); g.fill();
      // fragments, placed the way things get placed
      g.fillStyle = opts.tone || '#241a18';
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.ellipse(-130 - Math.random() * 60, 10 + Math.random() * 44,
          6 + Math.random() * 11, 4 + Math.random() * 7, Math.random() * 3, 0, 7);
        g.fill();
      }
      g.restore();
    }

    // The scale ruler. This is the object that does the work.
    g.save();
    g.translate(W * 0.10, frameH * 0.80);
    g.rotate(0.03);
    g.fillStyle = '#e6e2d6'; g.fillRect(0, 0, 190, 22);
    g.fillStyle = '#14140f';
    for (let i = 0; i <= 15; i++) {
      const x = i * 12.4;
      g.fillRect(x, 0, 1.6, i % 5 === 0 ? 16 : 9);
      if (i % 5 === 0) { g.font = '9px Arial, sans-serif'; g.fillText(String(i), x + 2, 21); }
    }
    g.font = 'bold 9px Arial, sans-serif';
    g.fillText('cm', 168, 21);
    g.restore();

    // The evidence marker. A folded card with a number on it.
    g.save();
    g.translate(W * 0.74, frameH * 0.70);
    g.fillStyle = '#dcd7c8';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(46, -6); g.lineTo(46, 44); g.lineTo(0, 50); g.closePath(); g.fill();
    g.fillStyle = '#7d1f1a';
    g.font = 'bold 30px Arial, sans-serif';
    g.fillText(String(opts.marker ?? 3), 12, 36);
    g.restore();

    // Exhibit strip, printed below the frame by the lab, not by a designer.
    g.fillStyle = '#ffffff'; g.fillRect(0, frameH, W, H - frameH);
    g.fillStyle = '#111111';
    g.font = '12px "Courier New", monospace';
    g.fillText(opts.exhibit || 'EXHIBIT 14‑C   CF‑1996‑0202   PLATE 3 OF 6', 10, frameH + 17);
    g.font = '10px "Courier New", monospace';
    g.fillStyle = '#333333';
    g.fillText(opts.caption || 'Recovered material, site perimeter. Scale in cm.', 10, frameH + 32);

    // A polaroid-era lab camera, then a photocopier, then a scanner.
    P.cast(c, 1.06, 1.0, 0.92, 0.5);
    P.noise(c, 16);
    P.resample(c, 0.7);
  }, (c) => P.jpeg(c, 0.42));
}

/**
 * The Tyre tablet: a photographic plate of a clay object, with the scale
 * reference blacked out, because the Foundation blacks out scale.
 */
export function tabletPlate(w = 420, h = 320) {
  return make('tablet', w, h, (g, W, H, c) => {
    g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, W, H);
    // the object, lit raking from the left so the cuneiform reads at all
    g.save(); g.translate(W * 0.5, H * 0.48); g.rotate(-0.02);
    const clay = g.createLinearGradient(-W * 0.30, -H * 0.28, W * 0.30, H * 0.28);
    clay.addColorStop(0, '#b6a086');
    clay.addColorStop(1, '#6b5b48');
    g.fillStyle = clay;
    g.fillRect(-W * 0.30, -H * 0.28, W * 0.60, H * 0.56);
    // chipped corner
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.moveTo(W * 0.30, H * 0.10); g.lineTo(W * 0.30, H * 0.28);
    g.lineTo(W * 0.12, H * 0.28); g.closePath(); g.fill();
    // cuneiform: wedges in rows, ruled
    g.strokeStyle = 'rgba(70,56,40,0.5)'; g.lineWidth = 1;
    for (let r = 0; r < 11; r++) {
      const y = -H * 0.25 + r * H * 0.048;
      g.beginPath(); g.moveTo(-W * 0.28, y); g.lineTo(W * 0.28, y); g.stroke();
      for (let i = 0; i < 22; i++) {
        const x = -W * 0.27 + i * W * 0.0245 + Math.random() * 3;
        g.fillStyle = 'rgba(58,44,30,0.85)';
        g.beginPath();
        g.moveTo(x, y + 3); g.lineTo(x + 4, y + 3); g.lineTo(x + 2, y + 9);
        g.closePath(); g.fill();
      }
    }
    g.restore();
    // the scale reference, blacked out
    g.fillStyle = '#000000'; g.fillRect(W * 0.06, H * 0.82, W * 0.30, H * 0.10);
    g.fillStyle = '#e8e4d8';
    g.font = '11px "Courier New", monospace';
    g.fillText('CF‑1991‑0067  PLATE 3', W * 0.62, H * 0.94);
    P.cast(c, 1.02, 1.0, 0.94, 0.6);
    P.noise(c, 14, true);
    P.resample(c, 0.75);
    P.photocopy(c, 1);
  }, (c) => P.jpeg(c, 0.45));
}

/**
 * A single frame of a video log, with the tape damage that survived a bad
 * chain of custody. §5A.3.
 */
export function videoFrame(opts = {}) {
  const w = 480, h = 360;
  return make('vid.' + (opts.id || 'x'), w, h, (g, W, H, c) => {
    g.fillStyle = opts.night === false ? '#5a6068' : '#0b0d11';
    g.fillRect(0, 0, W, H);

    if (opts.night === false) {
      const sky = g.createLinearGradient(0, 0, 0, H * 0.6);
      sky.addColorStop(0, '#8c98a6'); sky.addColorStop(1, '#b6b3a4');
      g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.58);
      g.fillStyle = '#4a4d47'; g.fillRect(0, H * 0.56, W, H * 0.44);
    } else {
      const lamp = g.createRadialGradient(W * 0.7, H * 0.2, 0, W * 0.7, H * 0.2, W * 0.55);
      lamp.addColorStop(0, 'rgba(226,158,84,0.7)');
      lamp.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lamp; g.fillRect(0, 0, W, H);
      g.fillStyle = '#15181d'; g.fillRect(0, H * 0.70, W, H * 0.30);
    }

    // Whoever held the camera was not a cinematographer.
    if (opts.subject) drawEntity(g, opts.subject, W * (opts.x ?? 0.66), H * (opts.y ?? 0.18), W * (opts.scale ?? 0.3));

    // a fence, a wall, a car — the thing the camera is actually pointed at
    g.fillStyle = 'rgba(28,30,34,0.9)';
    g.fillRect(0, H * 0.52, W * 0.22, H * 0.48);

    P.autoGain(c, opts.gainPhase ?? 1.2);
    P.generations(c, opts.gens ?? 1);
    P.tracking(c, opts.tracking ?? 3, 0.07, opts.seed ?? 0);
    P.chromaBleed(c, 0.28);
    P.noise(c, 20);
    P.headSwitch(c, 0.05);
    P.burnIn(c, opts.timecode || 'SEP 09  02:41:18', 'br');
    if (opts.label) P.burnIn(c, opts.label, 'tl');
    P.vignette(c, 0.42);
  }, (c) => P.jpeg(c, 0.2));
}

/**
 * The single-frame insert. §5A.2 — once, in the entire game. No sound cue,
 * no effect around it, never referenced again.
 */
export function insertFrame() {
  const w = 480, h = 360;
  return make('insert', w, h, (g, W, H, c) => {
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, W, H);
    drawEntity(g, 'incursion', W * 0.30, -H * 0.06, W * 0.44);
    P.exposure(c, -0.3);
    P.chromaBleed(c, 0.3);
    P.noise(c, 30);
    P.tracking(c, 2, 0.05, 3);
  }, (c) => P.jpeg(c, 0.3));
}

/** The Pathogen, on the surface it manifests on. Never in the world. */
export function pathogenPlate(w = 420, h = 420) {
  return make('pathogen', w, h, (g, W, H, c) => {
    g.fillStyle = '#050507'; g.fillRect(0, 0, W, H);
    drawEntity(g, 'pathogen', W * 0.14, H * 0.02, W * 0.72);
    P.chromaBleed(c, 0.25);
    P.tracking(c, 4, 0.05, 7);
    P.noise(c, 16);
    P.vignette(c, 0.5);
  }, (c) => P.jpeg(c, 0.3));
}

/**
 * An archival plate — a 19th-century engraving of a thing somebody drew
 * from testimony, aged to look like the document when it was first found.
 *
 * Laid paper, foxing, a plate mark, ink that has bled into the fibre, a
 * water tide-line, and a pencilled accession number in a curator's hand.
 * The Foundation did not make this. It inherited it.
 */
export function archivePlate(kind, opts = {}) {
  const w = 460, h = 620;
  return make('arch.' + kind, w, h, (g, W, H, c) => {
    /* --- the paper -------------------------------------------------- */
    g.fillStyle = opts.paper || '#d8cdb0';
    g.fillRect(0, 0, W, H);

    // Laid lines: the chain and wire marks of hand-made paper.
    g.strokeStyle = 'rgba(160,146,116,0.22)';
    g.lineWidth = 1;
    for (let y = 0; y < H; y += 3) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    g.strokeStyle = 'rgba(150,136,106,0.18)';
    for (let x = 0; x < W; x += 26) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
    }

    // Foxing. The brown blooms are mould, and they are always worst at
    // the edges where the paper was handled.
    for (let i = 0; i < 130; i++) {
      const edge = Math.random() < 0.6;
      const x = edge ? (Math.random() < 0.5 ? Math.random() * W * 0.16 : W - Math.random() * W * 0.16) : Math.random() * W;
      const y = edge ? (Math.random() < 0.5 ? Math.random() * H * 0.13 : H - Math.random() * H * 0.13) : Math.random() * H;
      const r = 2 + Math.random() * 9;
      const fx = g.createRadialGradient(x, y, 0, x, y, r);
      fx.addColorStop(0, `rgba(${130 + Math.random() * 30 | 0},${88 + Math.random() * 24 | 0},48,${0.16 + Math.random() * 0.24})`);
      fx.addColorStop(1, 'rgba(150,110,60,0)');
      g.fillStyle = fx;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }

    // A water tide-line across one corner. Something was stored badly.
    g.save();
    g.globalCompositeOperation = 'multiply';
    const tide = g.createLinearGradient(0, H * 0.62, W * 0.5, H);
    tide.addColorStop(0, 'rgba(255,255,255,0)');
    tide.addColorStop(0.55, 'rgba(176,150,104,0.55)');
    tide.addColorStop(0.62, 'rgba(150,124,80,0.75)');
    tide.addColorStop(0.68, 'rgba(214,196,160,0.35)');
    tide.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = tide;
    g.fillRect(0, 0, W, H);
    g.restore();

    /* --- the plate mark: the impression the copper plate left --------- */
    const m = { x: W * 0.085, y: H * 0.075, w: W * 0.83, h: H * 0.70 };
    g.strokeStyle = 'rgba(122,104,74,0.55)';
    g.lineWidth = 2.5;
    g.strokeRect(m.x, m.y, m.w, m.h);
    g.strokeStyle = 'rgba(232,222,198,0.6)';
    g.lineWidth = 1;
    g.strokeRect(m.x + 2, m.y + 2, m.w - 4, m.h - 4);

    /* --- the subject, in engraver's ink ------------------------------ */
    g.save();
    g.beginPath(); g.rect(m.x + 3, m.y + 3, m.w - 6, m.h - 6); g.clip();

    // A flat ground: the engraver put it against nothing, because the
    // testimony did not include a background.
    g.fillStyle = 'rgba(84,70,48,0.10)';
    g.fillRect(m.x, m.y + m.h * 0.72, m.w, m.h * 0.28);
    // Hatching for the ground shadow.
    g.strokeStyle = 'rgba(76,62,42,0.22)';
    g.lineWidth = 1;
    for (let i = 0; i < 90; i++) {
      const y = m.y + m.h * (0.72 + Math.random() * 0.28);
      const x = m.x + Math.random() * m.w;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + 10 + Math.random() * 26, y + 3); g.stroke();
    }

    const sw = m.w * (opts.scale || 0.66);
    drawEntity(g, kind, m.x + (m.w - sw) / 2, m.y + m.h * 0.06, sw);
    g.restore();

    // Ink bleed: the lines have crept into the fibre for a hundred years.
    P.chromaBleed(c, 0.6);

    /* --- the caption, letterpress, under the plate mark -------------- */
    g.fillStyle = 'rgba(52,42,28,0.86)';
    g.textAlign = 'center';
    g.font = `italic ${Math.round(H * 0.026)}px Georgia, "Times New Roman", serif`;
    g.fillText(opts.title || '', W / 2, m.y + m.h + H * 0.055);
    g.font = `${Math.round(H * 0.020)}px Georgia, serif`;
    g.fillStyle = 'rgba(70,58,40,0.78)';
    const sub = (opts.sub || '').split('\n');
    sub.forEach((line, i) => g.fillText(line, W / 2, m.y + m.h + H * (0.085 + i * 0.028)));
    g.textAlign = 'left';

    /* --- a curator's pencil, bottom left ---------------------------- */
    g.save();
    g.translate(W * 0.10, H * 0.955);
    g.rotate(-0.035);
    g.fillStyle = 'rgba(58,58,68,0.62)';
    g.font = `${Math.round(H * 0.024)}px "Segoe Script", "Bradley Hand", cursive`;
    g.fillText(opts.accession || '', 0, 0);
    g.restore();

    // And an inspection stamp somebody put on it in the wrong decade.
    if (opts.stamp) {
      g.save();
      g.translate(W * 0.70, H * 0.90);
      g.rotate(-0.14);
      g.strokeStyle = 'rgba(108,58,52,0.42)';
      g.lineWidth = 2;
      g.strokeRect(-58, -16, 116, 32);
      g.fillStyle = 'rgba(108,58,52,0.48)';
      g.font = `bold ${Math.round(H * 0.020)}px Arial, sans-serif`;
      g.textAlign = 'center';
      g.fillText(opts.stamp, 0, 6);
      g.textAlign = 'left';
      g.restore();
    }

    // Finally: it is a photograph OF a plate, taken on a flatbed in 1998.
    P.cast(c, 1.05, 1.0, 0.90, 0.55);
    P.noise(c, 13);
    P.resample(c, 0.78);
    P.vignette(c, 0.30);
  }, (c) => P.jpeg(c, 0.46));
}

/** SMPTE colour bars, for off-air hours. Drawn correctly, on purpose. */
export function colourBars(w = 640, h = 480) {
  return make('bars', w, h, (g, W, H) => {
    const top = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    const mid = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
    const bw = W / 7;
    top.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * bw, 0, bw + 1, H * 0.67); });
    mid.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * bw, H * 0.67, bw + 1, H * 0.08); });
    const bot = ['#00214c', '#ffffff', '#32006a', '#131313'];
    bot.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * (W / 6), H * 0.75, W / 6 + 1, H * 0.25); });
    g.fillStyle = '#131313'; g.fillRect(W * 0.667, H * 0.75, W * 0.333, H * 0.25);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = ['#080808', '#131313', '#1d1d1d'][i];
      g.fillRect(W * 0.667 + i * (W * 0.055), H * 0.75, W * 0.055, H * 0.25);
    }
  }, (c) => P.jpeg(c, 0.8));
}

export default { stationLogo, stationBug, wallpaper, weatherStock, ad, avatar,
  phoneSnap, evidencePlate, tabletPlate, videoFrame, insertFrame, pathogenPlate,
  archivePlate, colourBars };
