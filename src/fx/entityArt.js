/**
 * entityArt.js — the entities, drawn.
 *
 * Every one of these is a 2D billboard and always will be. Nothing here is
 * a model. The goal is not detail: the goal is that the player never gets
 * a good enough look to be disappointed.
 *
 * Each entity draws in three layers, stacked at slightly different depths
 * so head movement gives parallax without geometry:
 *
 *   silhouette — near-black, hard-edged, the actual shape
 *   detail     — low opacity, only readable where light hits it
 *   atmosphere — soft haze in front, tinted to the fog
 *
 * Silhouette first: if the shape does not read as a solid black form at a
 * glance, it is wrong.
 */

const cache = new Map();

function surface(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return { c, g: c.getContext('2d') };
}

/* ------------------------------------------------------------------ */
/* drawing helpers                                                     */
/*                                                                     */
/* THE RULE THAT GOVERNS ALL OF THESE (§3, second pass):                */
/*                                                                     */
/* Nothing organic is allowed to be a circular arc. The first version   */
/* of this file built every entity out of `ellipse` and                 */
/* `quadraticCurveTo`, which is why they read as clip art no matter how */
/* much interior detail went on top: a contour with constant curvature  */
/* is a manufactured contour, and the eye knows it in about 40 ms.      */
/*                                                                     */
/* So every outline below is a polygon of 60-odd points pushed in and   */
/* out by two octaves of value noise, and every limb's width wobbles    */
/* along its length. It costs nothing — these are drawn once and cached */
/* — and it is the single largest difference between "a shape" and      */
/* "a thing that was photographed".                                     */
/* ------------------------------------------------------------------ */

/**
 * Deterministic value noise. It has to be deterministic rather than
 * `Math.random`, because §4.3 bakes these to PNG at build time and a
 * silhouette that differs between the baked plate and the runtime canvas is
 * a bug the player would eventually notice.
 */
function hash1(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function noise1(t, seed = 0) {
  const i = Math.floor(t), f = t - i;
  const u = f * f * (3 - 2 * f);
  return hash1(i + seed * 57.3) * (1 - u) + hash1(i + 1 + seed * 57.3) * u;
}
/** Two octaves, centred on zero, in the range roughly ±1. */
function wobble(t, seed = 0) {
  return (noise1(t, seed) - 0.5) * 1.4 + (noise1(t * 2.7, seed + 11) - 0.5) * 0.8;
}
/** A seeded stand-in for Math.random, for scatter that must be reproducible. */
function rng(seed) {
  let n = seed;
  return () => hash1(n++);
}

/**
 * A closed organic outline. An ellipse, sampled as a polygon, with each
 * radius pushed by noise — so no part of the contour has constant curvature
 * and no two entities share a silhouette. `rough` is the fraction of the
 * radius the noise is allowed to move (0.10 is a smooth animal, 0.30 is a
 * thing with lumps on it).
 *
 * `bias` lets a form be heavier at one end: a positive value fattens the
 * bottom, which is what weight does and what an ellipse never does.
 */
function blob(cx, cy, rx, ry, rough, seed, bias = 0, steps = 72) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const n = wobble((i / steps) * 7.0, seed);
    const k = 1 + n * rough;
    const heavy = 1 + Math.max(0, Math.sin(a)) * bias;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * heavy]);
  }
  return pts;
}

/** Fill a point list as a closed path. */
function fillPath(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.fill();
}

/** Clip to a point list. */
function clipPath(g, pts) {
  g.beginPath();
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
  g.closePath();
  g.clip();
}

/**
 * Mid-frequency surface breakup. Real hide is never one value: it is a
 * hundred overlapping soft patches a few percent apart. Without this a
 * gradient reads as plastic no matter what colour it is.
 *
 * Call inside a clip. `tint` is 'r,g,b'.
 */
function mottle(g, x0, y0, w, h, count, tint, alpha, seed) {
  const R = rng(seed);
  for (let i = 0; i < count; i++) {
    const r = w * (0.04 + R() * 0.16);
    const px = x0 + R() * w, py = y0 + R() * h;
    const gr = g.createRadialGradient(px, py, 0, px, py, r);
    gr.addColorStop(0, `rgba(${tint},${alpha * (0.4 + R() * 0.6)})`);
    gr.addColorStop(1, `rgba(${tint},0)`);
    g.fillStyle = gr;
    g.beginPath(); g.ellipse(px, py, r, r * (0.6 + R() * 0.8), R() * 3, 0, 7); g.fill();
  }
}

/**
 * A tapered limb: thick at the root, needle-thin at the tip.
 *
 * `rough` (0 by default, so existing callers are unchanged) wobbles the
 * half-width along the length. A limb of exactly constant taper is a cone,
 * and a cone is a manufactured object.
 */
function limb(g, pts, w0, w1, rough = 0, seed = 0) {
  const n = pts.length;
  const wAt = (i) => {
    const t = i / (n - 1);
    const w = w0 + (w1 - w0) * t;
    return rough ? w * (1 + wobble(t * 6, seed) * rough) : w;
  };
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const w = wAt(i);
    const [x, y] = pts[i];
    const [px, py] = pts[Math.max(0, i - 1)];
    const a = Math.atan2(y - py, x - px) + Math.PI / 2;
    const ox = Math.cos(a) * w, oy = Math.sin(a) * w;
    if (i === 0) g.moveTo(x + ox, y + oy); else g.lineTo(x + ox, y + oy);
  }
  for (let i = n - 1; i >= 0; i--) {
    const w = wAt(i);
    const [x, y] = pts[i];
    const [px, py] = pts[Math.max(0, i - 1)];
    const a = Math.atan2(y - py, x - px) + Math.PI / 2;
    g.lineTo(x - Math.cos(a) * w, y - Math.sin(a) * w);
  }
  g.closePath();
  g.fill();
}

/**
 * A boneless limb. Where `arc` bows once between two points, this runs
 * straight from root to tip and lays a travelling sine wave across the
 * normal — so the shape has no bend in it anywhere, it has curvature
 * everywhere. That is the difference between a leg and a tentacle, and it
 * is the whole read on the Tormentor.
 *
 * The wave is damped at the root, because the root is anchored, and widest
 * two-thirds of the way out, because that is where an unsupported length
 * carries the most travel.
 */
function tentacle(x0, y0, x1, y1, amp, waves, phase, steps = 26) {
  const pts = [];
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const env = Math.sin(t * Math.PI * 0.78) * (0.30 + t * 0.70);
    const off = Math.sin(phase + t * Math.PI * 2 * waves) * amp * env;
    pts.push([x0 + dx * t + nx * off, y0 + dy * t + ny * off]);
  }
  return pts;
}

/** A curve of points, for legs and horns. */
function arc(x0, y0, x1, y1, bow, steps = 10) {
  const pts = [];
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
  const dx = x1 - x0, dy = y1 - y0;
  const cx = mx - dy * bow, cy = my + dx * bow;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    pts.push([u * u * x0 + 2 * u * t * cx + t * t * x1,
              u * u * y0 + 2 * u * t * cy + t * t * y1]);
  }
  return pts;
}

/* ------------------------------------------------------------------ */
/* ANATOMY (§3.3)                                                      */
/*                                                                     */
/* A silhouette with nothing inside it is a cartoon, and that is what   */
/* these were before prompt 4 stopped destroying the photographs and    */
/* exposed them. Every entity now carries, at minimum:                  */
/*                                                                     */
/*   · surface texture — what the hide does under a light               */
/*   · joint articulation — where it bends, and how many times          */
/*   · weight — a limb that is loaded looks different from one that is  */
/*     hanging, and the loaded ones deform where they meet the ground   */
/*   · stretch — pale, taut skin wherever the form is pulled over       */
/*     something harder underneath                                     */
/*                                                                     */
/* And exactly one BRIGHT WRONG DETAIL each: small, sharp, in focus,    */
/* and completely unexplained. It is where the eye lands and it is the  */
/* thing the player cannot stop thinking about afterwards.              */
/* ------------------------------------------------------------------ */

/** A sheen along the top edge of a form, as if lit from above and in front. */
function sheen(g, pts, w, alpha = 0.16, tint = '255,252,244') {
  g.save();
  g.strokeStyle = `rgba(${tint},${alpha})`;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const [x, y] = pts[i];
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();
  g.restore();
}

/**
 * A joint. Swollen, and paler than the limb because the hide is stretched
 * over whatever is inside it. Drawn as a bulb plus a taut highlight.
 */
function joint(g, x, y, r, base, pale) {
  const grad = g.createRadialGradient(x - r * 0.35, y - r * 0.4, 0, x, y, r);
  grad.addColorStop(0, pale);
  grad.addColorStop(0.55, base);
  grad.addColorStop(1, base);
  g.fillStyle = grad;
  g.beginPath(); g.ellipse(x, y, r, r * 1.18, 0, 0, 7); g.fill();
  // The stretch: a thin bright crescent over the top of the bulb.
  g.strokeStyle = pale;
  g.globalAlpha = 0.55;
  g.lineWidth = Math.max(0.6, r * 0.16);
  g.beginPath(); g.ellipse(x, y - r * 0.22, r * 0.72, r * 0.42, 0, Math.PI * 1.08, Math.PI * 1.92);
  g.stroke();
  g.globalAlpha = 1;
}

/** Fine cross-hatching, for hide that is not smooth. Follows one direction. */
function hatch(g, x0, y0, x1, y1, count, alpha, angle = 0.5) {
  g.save();
  g.strokeStyle = `rgba(0,0,0,${alpha})`;
  g.lineWidth = 0.7;
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const y = y0 + (y1 - y0) * t;
    const jitter = (Math.random() - 0.5) * (y1 - y0) * 0.02;
    g.beginPath();
    g.moveTo(x0, y + jitter);
    g.lineTo(x1, y + jitter + (x1 - x0) * angle * 0.06);
    g.stroke();
  }
  g.restore();
}

/**
 * THE BRIGHT WRONG DETAIL. One per entity. Small, hard-edged, specular, and
 * it looks manufactured. Never explained, anywhere in the game.
 */
function wrongDetail(g, x, y, r, colour = '#E8E2D2') {
  // A hard rim, so it reads as a made object rather than a highlight.
  g.fillStyle = colour;
  g.beginPath(); g.ellipse(x, y, r, r, 0, 0, 7); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.lineWidth = Math.max(0.6, r * 0.22);
  g.beginPath(); g.ellipse(x, y, r, r, 0, 0, 7); g.stroke();
  // And a specular pin, off-centre, because it is wet or it is glass.
  g.fillStyle = 'rgba(255,255,255,0.92)';
  g.beginPath(); g.ellipse(x - r * 0.30, y - r * 0.32, r * 0.26, r * 0.22, 0, 0, 7); g.fill();
}

/* ================================================================== */
/* THE TORMENTOR                                                       */
/*                                                                     */
/* Long, slim, black, horned, standing over a car under a streetlamp.   */
/*                                                                     */
/* The legs are TENTACLES, not legs. That is the correction: they were  */
/* six stiff needles with three knees each, and a knee implies a bone,  */
/* and a bone implies an animal. There are eleven of them now, none of  */
/* them the same length, none of them bending in the same place, and    */
/* none of them bending — they curve continuously from root to tip.     */
/* Some are planted and some are not touching the ground at all.        */
/*                                                                     */
/* The horns are the second read and they are much larger than they     */
/* were: a heavy swept pair that goes wider than the leg span.          */
/* ================================================================== */

/* Eleven, and they do not match. [root dx, tip dx, tip y, amplitude,
 * waves, phase]. Shared so the silhouette and the detail agree exactly. */
const TORM_LEGS = [
  [-0.098, -0.56, 0.995, 0.052, 1.35, 0.40],
  [-0.082, -0.42, 0.995, 0.042, 1.75, 2.10],
  [-0.062, -0.30, 0.960, 0.036, 1.20, 4.05],
  [-0.041, -0.18, 0.995, 0.030, 1.60, 1.20],
  [-0.019, -0.07, 0.920, 0.026, 1.35, 5.15],
  [ 0.003,  0.04, 0.995, 0.024, 1.85, 3.30],
  [ 0.026,  0.16, 0.945, 0.030, 1.25, 0.90],
  [ 0.048,  0.28, 0.995, 0.038, 1.70, 2.65],
  [ 0.068,  0.40, 0.875, 0.044, 1.30, 4.70],
  [ 0.086,  0.52, 0.995, 0.050, 1.90, 1.85],
  [ 0.101,  0.63, 0.905, 0.056, 1.45, 5.60],
];

/* Proportion. The first pass put a pinhead on a giraffe neck over a small
 * egg with a fringe under it, which reads as a lamp. What makes something
 * read as an animal is that the mass is in the middle, the head is big
 * enough to have a face on it, and the limbs come out of the body rather
 * than out of a point below it. */
const TORM_ROOT = 0.455;   // where the tentacles leave the mass
const TORM_BODY = 0.372;   // the centre of the mass
const TORM_BRX = 0.112, TORM_BRY = 0.118;
const TORM_HEAD = 0.135;   // the centre of the head
const TORM_HRX = 0.055, TORM_HRY = 0.042;

function tormLeg(W, H, L) {
  const [rx, tx, ty, amp, waves, phase] = L;
  return tentacle(W * 0.5 + W * rx, H * TORM_ROOT, W * 0.5 + W * tx, H * ty,
                  W * amp, waves, phase);
}

const TORM_HX = -0.036;              // the head sits left of the body's axis

function tormBody(W, H) {
  return blob(W * 0.5, H * TORM_BODY, W * TORM_BRX, H * TORM_BRY, 0.11, 101, 0.14);
}
function tormHead(W, H) {
  return blob(W * 0.5 + W * TORM_HX, H * TORM_HEAD, W * TORM_HRX, H * TORM_HRY, 0.10, 103);
}
function tormNeck(W, H) {
  return arc(W * 0.5, H * (TORM_BODY - 0.04), W * 0.5 + W * TORM_HX, H * (TORM_HEAD + 0.030),
             0.06, 14);
}
function tormHorn(W, H, s, inner) {
  const hx = W * 0.5 + W * TORM_HX;
  return inner
    ? arc(hx + s * W * 0.016, H * (TORM_HEAD - 0.014), hx + s * W * 0.108, H * 0.052, s * 0.24, 12)
    : arc(hx + s * W * 0.026, H * (TORM_HEAD - 0.026), hx + s * W * 0.252, H * 0.030, s * 0.34, 16);
}

function tormentorSilhouette(g, W, H) {
  g.fillStyle = '#000000';

  // The tentacles, behind the body, so the body's edge stays clean.
  for (const L of TORM_LEGS) {
    limb(g, tormLeg(W, H, L), W * 0.017, W * 0.0022, 0.13, 105);
  }

  // Body: a hanging mass, heavier at the bottom than the top, and it is the
  // middle of the animal rather than an afterthought below the neck.
  fillPath(g, tormBody(W, H));

  // Neck: long, thin, and it leans.
  limb(g, tormNeck(W, H), W * 0.026, W * 0.020, 0.09, 107);

  // Head: narrow, tipped down, and big enough to have a face on it.
  fillPath(g, tormHead(W, H));

  // Horns. Heavy at the root, sweeping up and out past the leg span, and
  // they are the only part of it that is symmetrical.
  for (const s of [-1, 1]) {
    limb(g, tormHorn(W, H, s, false), W * 0.026, W * 0.004, 0.08, 110 + s);
    // A second, smaller pair inside the first. Antlers do this; horns do not.
    limb(g, tormHorn(W, H, s, true), W * 0.012, W * 0.0028, 0.10, 120 + s);
  }
}

/**
 * §3.3. The Tormentor's detail. It is black, so the detail is entirely in
 * SHEEN — where a sodium streetlamp runs along the top of a wet surface.
 *
 * There are no joints anywhere on it now. A tentacle's cross-section is
 * constant and its curvature is continuous, so the sheen has to be
 * continuous too: one unbroken highlight the length of each limb, thinning
 * as the limb thins, and breaking only where the wave rolls the surface
 * away from the lamp. That break is the thing that says "boneless".
 */
function tormentorDetail(g, W, H) {
  const cx = W * 0.5;
  const hx = cx + W * TORM_HX, hy = H * TORM_HEAD;

  /* The lamp is up and to the LEFT of it, out of the entity's own canvas —
   * the same lamp the ground layer draws. Everything below keys off that
   * single direction, which is what stops the highlights looking scattered.
   *
   * And it is brighter than it was. The first pass lit a black animal with
   * 13%-alpha rims and the result was an unreadable smudge: §3.1 says the
   * player should be able to see it perfectly, and "perfectly" costs light. */
  const LAMP = '236,196,132';

  for (const L of TORM_LEGS) {
    const pts = tormLeg(W, H, L);
    // The highlight runs the whole length, fading in and out as the wave
    // turns the surface toward the lamp and away from it.
    for (let i = 1; i < pts.length; i++) {
      const t = i / (pts.length - 1);
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
      const face = (ax - bx) / (Math.hypot(bx - ax, by - ay) || 1);
      const lit = Math.max(0, 0.34 + face * 0.90);
      g.strokeStyle = `rgba(${LAMP},${(0.10 + lit * 0.34) * (1 - t * 0.40)})`;
      g.lineWidth = Math.max(0.6, W * (0.0080 - t * 0.0058));
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); g.stroke();
    }
    // Rings around the limb, close together, and they do not line up with
    // the ones on the limb beside it.
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    for (let i = 2; i < pts.length - 1; i += 2) {
      const t = i / (pts.length - 1);
      const [x, y] = pts[i];
      const w = W * (0.016 - t * 0.013);
      g.lineWidth = Math.max(0.5, W * 0.0022);
      g.beginPath();
      g.moveTo(x - w, y - H * 0.001);
      g.quadraticCurveTo(x, y + H * 0.004, x + w, y - H * 0.001);
      g.stroke();
    }
    // Only the planted ones touch. The rest end in the air, which is worse.
    const [fx, fy] = pts[pts.length - 1];
    if (L[2] > 0.96) {
      g.fillStyle = 'rgba(0,0,0,0.42)';
      g.beginPath(); g.ellipse(fx, fy, W * 0.019, H * 0.005, 0, 0, 7); g.fill();
    } else {
      g.fillStyle = `rgba(${LAMP},0.30)`;
      g.beginPath(); g.ellipse(fx, fy, W * 0.004, W * 0.004, 0, 0, 7); g.fill();
    }
  }

  /* ---- THE MASS ---- */
  const body = tormBody(W, H);
  g.save();
  clipPath(g, body);
  const bg = g.createLinearGradient(cx - W * 0.11, H * (TORM_BODY - 0.11),
                                    cx + W * 0.09, H * (TORM_BODY + 0.12));
  bg.addColorStop(0, '#4a3d28');
  bg.addColorStop(0.30, '#1d1a16');
  bg.addColorStop(0.70, '#0b0b0c');
  bg.addColorStop(1, '#040405');
  g.fillStyle = bg;
  g.fillRect(cx - W * 0.16, H * (TORM_BODY - 0.16), W * 0.32, H * 0.34);
  mottle(g, cx - W * 0.12, H * (TORM_BODY - 0.12), W * 0.24, H * 0.26, 34, LAMP, 0.07, 131);
  mottle(g, cx - W * 0.12, H * (TORM_BODY - 0.12), W * 0.24, H * 0.26, 30, '0,0,0', 0.22, 137);
  // Vertical ribbing. On a body slung horizontally, that is the wrong axis.
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.lineWidth = Math.max(0.7, W * 0.0038);
  for (let i = -5; i <= 5; i++) {
    const x = cx + i * W * 0.020;
    g.beginPath();
    g.moveTo(x, H * (TORM_BODY - 0.13));
    g.quadraticCurveTo(x + W * 0.007, H * TORM_BODY, x, H * (TORM_BODY + 0.14));
    g.stroke();
  }
  g.restore();
  // A hard rim down the lamp side of the mass. This is the single stroke
  // that makes a black animal read against a black street.
  // Drawn segment by segment so it can fade out at both ends — a rim that
  // starts and stops abruptly reads as the hem of a garment, and it is not
  // wearing anything.
  g.lineCap = 'round';
  for (let i = 1; i < body.length; i++) {
    const a = (i / body.length) * Math.PI * 2;
    if (a < Math.PI * 0.98 || a > Math.PI * 1.56) continue;
    const t = (a - Math.PI * 0.98) / (Math.PI * 0.58);
    g.strokeStyle = `rgba(${LAMP},${0.30 * Math.sin(t * Math.PI)})`;
    g.lineWidth = Math.max(1, W * 0.006);
    g.beginPath();
    g.moveTo(body[i - 1][0], body[i - 1][1]);
    g.lineTo(body[i][0], body[i][1]);
    g.stroke();
  }

  // The neck: taut, and the hide creases against the direction of the bend.
  const neck = tormNeck(W, H);
  sheen(g, neck, W * 0.010, 0.34, LAMP);
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  g.lineWidth = Math.max(0.6, W * 0.003);
  for (let i = 2; i < neck.length - 1; i += 2) {
    const [x, y] = neck[i];
    g.beginPath();
    g.moveTo(x - W * 0.019, y + H * 0.004);
    g.quadraticCurveTo(x, y - H * 0.003, x + W * 0.019, y + H * 0.004);
    g.stroke();
  }

  // The horns, catching the lamp along their upper edge. They are ridged
  // crosswise the way a ram's are, which is the one borrowed thing on it.
  for (const s of [-1, 1]) {
    const h = tormHorn(W, H, s, false);
    sheen(g, h, W * 0.010, 0.40, '246,214,158');
    g.strokeStyle = 'rgba(0,0,0,0.45)';
    for (let i = 1; i < h.length - 1; i++) {
      const t = i / (h.length - 1);
      const [x, y] = h[i];
      const w = W * (0.024 - t * 0.020);
      g.lineWidth = Math.max(0.5, W * 0.002);
      g.beginPath();
      g.moveTo(x - w * 0.7, y + w * 0.5); g.lineTo(x + w * 0.7, y - w * 0.5); g.stroke();
    }
    sheen(g, tormHorn(W, H, s, true), W * 0.005, 0.26, '246,214,158');
  }

  /* ---- THE HEAD, AND THE FACE MARKING ----
   *
   * A chalk-pale blaze down the centre of the head, and it is MATTE — dry,
   * powdery, no highlight in it anywhere, on an animal that is wet
   * everywhere else. It is shaped like a face: a narrow inverted chevron
   * with two dark spots at the top of it, in roughly the places eyes go, and
   * it is a MARKING. There is nothing behind it. The head has no eyes.
   *
   * This is the part people argue about on the forum. */
  const head = tormHead(W, H);
  g.save();
  clipPath(g, head);
  const hg = g.createLinearGradient(hx - W * 0.05, hy - H * 0.04, hx + W * 0.05, hy + H * 0.04);
  hg.addColorStop(0, '#3b3126');
  hg.addColorStop(0.45, '#14120f');
  hg.addColorStop(1, '#050506');
  g.fillStyle = hg;
  g.fillRect(hx - W * 0.08, hy - H * 0.07, W * 0.16, H * 0.14);

  g.fillStyle = 'rgba(212,204,184,0.86)';
  g.beginPath();
  g.moveTo(hx, hy - H * 0.038);
  g.lineTo(hx + W * 0.024, hy + H * 0.040);
  g.lineTo(hx + W * 0.009, hy + H * 0.043);
  g.lineTo(hx - W * 0.001, hy - H * 0.006);
  g.lineTo(hx - W * 0.013, hy + H * 0.043);
  g.lineTo(hx - W * 0.028, hy + H * 0.040);
  g.closePath();
  g.fill();
  // The two dark spots. They are IN the marking, they are part of it, and
  // they are the same dry matte black as a moth's wing.
  g.fillStyle = 'rgba(10,10,11,0.90)';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(hx + s * W * 0.014, hy - H * 0.012, W * 0.0072, H * 0.0088, s * 0.3, 0, 7);
    g.fill();
  }
  // Chalk texture, so it does not read as paint.
  const R = rng(139);
  for (let i = 0; i < 160; i++) {
    g.fillStyle = `rgba(240,234,216,${0.04 + R() * 0.11})`;
    g.fillRect(hx - W * 0.030 + R() * W * 0.060, hy - H * 0.040 + R() * H * 0.085, 1, 1);
  }
  g.restore();
  // A rim along the lamp side of the head, so it is attached to the light
  // the rest of the animal is in.
  g.strokeStyle = `rgba(${LAMP},0.40)`;
  g.lineWidth = Math.max(1, W * 0.005);
  g.beginPath();
  g.ellipse(hx, hy, W * TORM_HRX, H * TORM_HRY, 0, Math.PI * 0.86, Math.PI * 1.72);
  g.stroke();
  // The jaw, under it, and there is no mouth on the jaw.
  g.strokeStyle = 'rgba(196,164,116,0.26)';
  g.lineWidth = Math.max(0.7, W * 0.004);
  g.beginPath();
  g.ellipse(hx, hy, W * (TORM_HRX - 0.004), H * (TORM_HRY - 0.003), 0,
            Math.PI * 0.10, Math.PI * 0.90);
  g.stroke();

  /* ---- THE BRIGHT WRONG DETAIL ----
   * A row of nine small pale points along the underside of the mass, evenly
   * spaced, hard-edged, and WET — which is the opposite of the face marking,
   * and that contrast is the point. They are not eyes: they are on the
   * belly, they are in a straight line, and they are identical, which no
   * eyes are. Nothing in the game says what they are for. */
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    wrongDetail(g, cx - W * 0.070 + t * W * 0.140,
                H * (TORM_ROOT - 0.014) + Math.sin(t * Math.PI) * H * 0.005,
                W * 0.0062, '#D9CFB4');
  }
}

/* ================================================================== */
/* THE INCURSION                                                       */
/*                                                                     */
/* The only entity that comes inside, and the only one with a face.     */
/* The body is black and reads as nothing. The mask is the single       */
/* bright thing in the frame, and it is the wrong kind of bright.       */
/*                                                                     */
/* Never shown outside. In the Brave ending it may appear inside, but   */
/* only in a doorway, only partially, only at the edge of frame.        */
/* ================================================================== */

const INC_CX = 0.54;

/**
 * The reaching arm. It is not along the wall any more — it comes down and
 * ACROSS, most of the width of the frame, and it ends nearer the lens than
 * the shoulder it left. So it gets THICKER toward the wrist, which is what
 * foreshortening does and what an arm never does, and that ambiguity is
 * free: the viewer reads "closer" and "wrong" at the same time.
 */
function incReach(W, H) {
  const cx = W * INC_CX;
  return arc(cx - W * 0.075, H * 0.335, cx - W * 0.415, H * 0.505, -0.14, 20);
}

/**
 * Five fingers, splayed to the limit of the joint and a little past it.
 *
 * The version before this fanned all five evenly over 156°, which is a
 * starfish — and worse, it took its base direction from the arm, so the
 * fingers pointed back down the way the arm had come. A hand is not radially
 * symmetric: four fingers over about 100°, of four different lengths, plus a
 * thumb that goes somewhere else entirely.
 *
 * The wrist is cocked, so the fingers come UP out of it while the arm runs
 * across. Each finger is three segments — three knuckles, where a finger has
 * two — and each segment turns further than the last, so the whole hand curls
 * inward the way a hand does half a second before it closes.
 *
 * Returned as polylines so the silhouette and the detail cannot disagree.
 */
const INC_DIGITS = [
  // [base angle (screen radians, -π/2 is straight up), length, curl]
  [-2.34, 0.128, 0.16],   // little
  [-1.94, 0.166, 0.13],   // ring
  [-1.55, 0.182, 0.11],   // middle — the longest
  [-1.16, 0.158, 0.13],   // index
  [ 0.62, 0.112, 0.26],   // and the thumb, which is not opposable and is
                          // set too far down the hand to be one
];

function incFingers(W, H) {
  const reach = incReach(W, H);
  const [px, py] = reach[reach.length - 1];
  const SEG = [0.44, 0.34, 0.22];
  const out = [];
  INC_DIGITS.forEach(([a0, lenK, curl], i) => {
    const len = W * lenK;
    const pts = [[px, py]];
    let x = px, y = py, ang = a0;
    for (let s = 0; s < 3; s++) {
      const seg = len * SEG[s];
      ang += curl;
      for (let k = 1; k <= 4; k++) {
        const t = k / 4;
        const j = wobble(i * 3 + s + t, 71) * 0.03;
        pts.push([x + Math.cos(ang + j) * seg * t, y + Math.sin(ang + j) * seg * t]);
      }
      x += Math.cos(ang) * seg;
      y += Math.sin(ang) * seg;
    }
    // The claw: a hard point continuing the last direction.
    ang += curl * 0.5;
    pts.push([x + Math.cos(ang) * len * 0.22, y + Math.sin(ang) * len * 0.22]);
    out.push(pts);
  });
  return out;
}

/**
 * The body. It was a rectangle, which is why it read as a pillar with a face
 * balanced on it. It is a body: shoulders too high and too level, a chest
 * that narrows to a waist, hips, and legs — and the profile is noise-pushed
 * so no edge of it is straight.
 */
function incTorso(W, H) {
  const cx = W * INC_CX;
  const prof = [
    [0.288, 0.106], [0.330, 0.100], [0.392, 0.087], [0.462, 0.074],
    [0.538, 0.069], [0.604, 0.080], [0.658, 0.093], [0.700, 0.091],
  ];
  const left = [], right = [];
  prof.forEach(([y, w], i) => {
    left.push([cx - W * w * (1 + wobble(i * 1.7, 61) * 0.07), H * y]);
    right.push([cx + W * w * (1 + wobble(i * 1.7 + 40, 61) * 0.07), H * y]);
  });
  return [...left, ...right.reverse()];
}

/** Two legs, from the hips out of the bottom of the frame. */
function incLegs(W, H) {
  const cx = W * INC_CX;
  return [-1, 1].map(s => arc(cx + s * W * 0.048, H * 0.672,
                              cx + s * W * 0.070, H * 1.000, -s * 0.05, 10));
}

function incursionSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  const cx = W * INC_CX;

  // Legs, then torso over them.
  for (const l of incLegs(W, H)) limb(g, l, W * 0.038, W * 0.030, 0.10, 63);
  fillPath(g, incTorso(W, H));

  // Neck.
  limb(g, arc(cx, H * 0.30, cx, H * 0.19, 0, 6), W * 0.026, W * 0.022);

  // The far arm, hanging, mostly lost in the body. Drawn first so the
  // reaching one is unambiguously in front of everything.
  limb(g, arc(cx + W * 0.088, H * 0.322, cx + W * 0.146, H * 0.660, -0.06, 10),
       W * 0.020, W * 0.010, 0.12, 64);

  // The reach. Thicker at the wrist than at the shoulder.
  limb(g, incReach(W, H), W * 0.023, W * 0.034, 0.09, 65);

  // The palm — a wide flat plate, because the hand is turned toward you.
  const reach = incReach(W, H);
  const [px, py] = reach[reach.length - 1];
  fillPath(g, blob(px - W * 0.008, py - H * 0.012, W * 0.050, H * 0.040, 0.14, 66));

  // And the fingers, out of it.
  for (const f of incFingers(W, H)) {
    limb(g, f, W * 0.0128, W * 0.0009, 0.14, 67);
  }
}

function incursionDetail(g, W, H) {
  const cx = W * INC_CX;
  const my = H * 0.145, mw = W * 0.062, mh = H * 0.070;

  // The mask. Flat, matte, slightly too long, and the only thing here
  // that is not black.
  const grad = g.createLinearGradient(cx - mw, my - mh, cx + mw, my + mh);
  grad.addColorStop(0, '#e8e4da');
  grad.addColorStop(0.55, '#cdc7ba');
  grad.addColorStop(1, '#8e897d');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(cx, my, mw, mh, 0, 0, 7);
  g.fill();

  /* §3.4. It is photographed indoors with flash, AND THE FLASH WORKED. So
   * the mask has to be modelled: a brow, a cheek, a chin, and a specular
   * hit where the flash bounced off it. A flat oval with two dots would be
   * a mask emoji. */

  // Brow ridge, as a shadow, and a nose ridge that has no nostrils.
  g.fillStyle = 'rgba(88,84,76,0.32)';
  g.beginPath();
  g.moveTo(cx - mw * 0.86, my - mh * 0.18);
  g.quadraticCurveTo(cx, my - mh * 0.40, cx + mw * 0.86, my - mh * 0.18);
  g.quadraticCurveTo(cx, my - mh * 0.06, cx - mw * 0.86, my - mh * 0.18);
  g.fill();
  g.strokeStyle = 'rgba(246,242,232,0.42)';
  g.lineWidth = Math.max(0.8, W * 0.0035);
  g.beginPath();
  g.moveTo(cx + mw * 0.02, my - mh * 0.10);
  g.lineTo(cx - mw * 0.02, my + mh * 0.28);
  g.stroke();

  // Hairline cracks in the surface, radiating from the left temple. It is
  // not a mask that anybody made, and it has been damaged.
  g.strokeStyle = 'rgba(72,68,60,0.42)';
  g.lineWidth = Math.max(0.6, W * 0.0022);
  for (const a of [2.5, 2.9, 3.4]) {
    g.beginPath();
    g.moveTo(cx - mw * 0.70, my - mh * 0.30);
    g.lineTo(cx - mw * 0.70 + Math.cos(a) * mw * 0.9, my - mh * 0.30 + Math.sin(a) * mh * 0.8);
    g.stroke();
  }

  // Eye holes: black, almond, too far apart, and not looking at you. They
  // are HOLES — there is a rim of thickness visible on the inner edge.
  for (const s of [-1, 1]) {
    const ex = cx + s * mw * 0.42, ey = my - mh * 0.12;
    g.fillStyle = '#050506';
    g.beginPath();
    g.ellipse(ex, ey, mw * 0.21, mh * 0.17, s * 0.18, 0, 7);
    g.fill();
    // The inside edge of the hole, catching the flash. This is what makes
    // it a hole in something with thickness rather than a painted dot.
    g.strokeStyle = 'rgba(214,208,196,0.55)';
    g.lineWidth = Math.max(0.7, W * 0.0026);
    g.beginPath();
    g.ellipse(ex, ey, mw * 0.21, mh * 0.17, s * 0.18, Math.PI * 0.95, Math.PI * 1.75);
    g.stroke();
  }

  // The mouth is a line. It is not a smile — the smile is the Pathogen's,
  // and nothing else in the ecology has one.
  g.strokeStyle = '#1a1a1c';
  g.lineWidth = Math.max(1, W * 0.006);
  g.beginPath();
  g.moveTo(cx - mw * 0.28, my + mh * 0.44);
  g.lineTo(cx + mw * 0.30, my + mh * 0.40);
  g.stroke();

  /* ---- THE BRIGHT WRONG DETAIL ----
   * The flash, reflected off the mask, as a single hard hot spot. A matte
   * surface does not do this. Every other pale thing in the photograph is
   * matte, so the one glossy thing in it is the face. */
  g.fillStyle = 'rgba(255,255,252,0.92)';
  g.beginPath();
  g.ellipse(cx - mw * 0.30, my - mh * 0.52, mw * 0.13, mh * 0.09, -0.3, 0, 7);
  g.fill();
  g.fillStyle = 'rgba(255,255,250,0.30)';
  g.beginPath();
  g.ellipse(cx - mw * 0.30, my - mh * 0.52, mw * 0.30, mh * 0.22, -0.3, 0, 7);
  g.fill();

  /* The body. Something that hangs, with folds in it, and the folds catch
   * the flash unevenly the way cloth does and metal does not. It is the only
   * part of it that suggests how it moves.
   *
   * The flash falls off, so this is lit brightest at the chest and goes to
   * nothing at the hem — which also means the legs are barely there, which
   * is why nobody who has seen it can say how many it has. */
  const torso = incTorso(W, H);
  g.save();
  clipPath(g, torso);
  const cloth = g.createLinearGradient(cx - W * 0.10, H * 0.30, cx + W * 0.08, H * 0.72);
  cloth.addColorStop(0, '#2c2f2b');
  cloth.addColorStop(0.45, '#181a17');
  cloth.addColorStop(1, '#08090a');
  g.fillStyle = cloth;
  g.fillRect(cx - W * 0.14, H * 0.27, W * 0.28, H * 0.46);
  mottle(g, cx - W * 0.11, H * 0.29, W * 0.22, H * 0.42, 26, '150,158,146', 0.06, 31);
  const R = rng(37);
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const x = cx - W * 0.090 + t * W * 0.180;
    g.strokeStyle = `rgba(154,160,152,${0.05 + R() * 0.09})`;
    g.lineWidth = Math.max(0.8, W * 0.004);
    g.beginPath();
    g.moveTo(x, H * 0.30);
    g.bezierCurveTo(x + W * 0.014, H * 0.46, x - W * 0.012, H * 0.60, x + W * 0.006, H * 0.71);
    g.stroke();
  }
  // A collar, where the neck goes in. It is a garment. Somebody made it.
  g.strokeStyle = 'rgba(168,174,162,0.26)';
  g.lineWidth = Math.max(1, W * 0.005);
  g.beginPath();
  g.moveTo(cx - W * 0.062, H * 0.302);
  g.quadraticCurveTo(cx, H * 0.346, cx + W * 0.062, H * 0.302);
  g.stroke();
  g.restore();

  // The legs, in the last of the flash.
  for (const l of incLegs(W, H)) {
    g.fillStyle = 'rgba(30,32,29,0.9)';
    limb(g, l, W * 0.036, W * 0.028, 0.10, 63);
    sheen(g, l.slice(0, 6), W * 0.008, 0.10, '150,158,146');
  }

  // A rim of light down one edge of the body, from a doorway behind it.
  g.strokeStyle = 'rgba(190,196,186,0.30)';
  g.lineWidth = Math.max(1, W * 0.007);
  g.beginPath();
  g.moveTo(cx + W * 0.100, H * 0.300);
  g.quadraticCurveTo(cx + W * 0.070, H * 0.500, cx + W * 0.090, H * 0.690);
  g.stroke();

  /* ---- THE HAND ----
   *
   * It is the closest thing in the photograph to the lens, so it is the most
   * lit thing in it and it takes the most detail. Everything else on the
   * body is a fold in the dark; this is a hand, and it is nearly a human
   * hand, and the ways in which it is not are all visible at once.
   *
   * The flash falls off with distance, so the arm gets brighter toward the
   * wrist. That gradient is doing the depth cue on its own. */
  const reach = incReach(W, H);
  for (let i = 1; i < reach.length; i++) {
    const t = i / (reach.length - 1);
    g.strokeStyle = `rgba(122,128,120,${0.06 + t * 0.20})`;
    g.lineWidth = Math.max(1, W * (0.010 + t * 0.014));
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(reach[i - 1][0], reach[i - 1][1] - H * 0.004);
    g.lineTo(reach[i][0], reach[i][1] - H * 0.004);
    g.stroke();
  }
  const [px, py] = reach[reach.length - 1];

  // The back of the hand. A flat plate, blown slightly by the flash, with
  // the tendons standing up under it — four of them, and they run to the
  // wrong fingers.
  const palm = blob(px - W * 0.008, py - H * 0.012, W * 0.050, H * 0.040, 0.14, 66);
  g.save();
  clipPath(g, palm);
  const hand = g.createRadialGradient(px - W * 0.020, py - H * 0.026, 0,
                                      px - W * 0.008, py - H * 0.012, W * 0.064);
  hand.addColorStop(0, '#a6ab9c');
  hand.addColorStop(0.45, '#666b5e');
  hand.addColorStop(1, '#22241f');
  g.fillStyle = hand;
  g.fillRect(px - W * 0.08, py - H * 0.07, W * 0.16, H * 0.12);
  mottle(g, px - W * 0.05, py - H * 0.05, W * 0.10, H * 0.08, 18, '30,32,26', 0.18, 41);
  // Tendons standing up under the skin — four of them, and they run to the
  // wrong fingers.
  g.strokeStyle = 'rgba(186,192,176,0.32)';
  g.lineWidth = Math.max(0.7, W * 0.0035);
  for (let i = 0; i < 4; i++) {
    const o = (i - 1.5) * W * 0.016;
    g.beginPath();
    g.moveTo(px - W * 0.014 + o * 0.4, py + H * 0.026);
    g.quadraticCurveTo(px - W * 0.006 + o, py - H * 0.004, px + o * 1.5, py - H * 0.036);
    g.stroke();
  }
  // And the skin over them is stretched to translucency at the edge.
  hatch(g, px - W * 0.042, py + H * 0.004, px + W * 0.030, py + H * 0.030, 5, 0.26);
  g.restore();

  // The knuckles. Each finger has three, and each one is a pale bulb of
  // stretched skin over something bigger than the finger.
  const fingers = incFingers(W, H);
  for (const f of fingers) {
    // The lit edge of each finger, unbroken from knuckle to claw.
    sheen(g, f, W * 0.009, 0.20, '186,192,178');
    for (const k of [4, 8, 12]) {
      if (!f[k]) continue;
      const r = W * (0.0115 - (k / 12) * 0.0045);
      joint(g, f[k][0], f[k][1], r, '#2a2c26', '#b6bcae');
    }
    // The claw. Keratin: darker at the root, translucent at the tip, and
    // there is a hard line where the two meet.
    const tip = f[f.length - 1], base = f[f.length - 3];
    const cg = g.createLinearGradient(base[0], base[1], tip[0], tip[1]);
    cg.addColorStop(0, 'rgba(40,38,32,0.95)');
    cg.addColorStop(0.55, 'rgba(150,142,120,0.95)');
    cg.addColorStop(1, 'rgba(226,220,200,0.95)');
    g.strokeStyle = cg;
    g.lineWidth = Math.max(1, W * 0.006);
    g.lineCap = 'round';
    g.beginPath(); g.moveTo(base[0], base[1]); g.lineTo(tip[0], tip[1]); g.stroke();
  }

  /* And the one thing about the hand nobody can explain. There are five
   * fingers, and none of them is a thumb — all five are the same kind of
   * finger, set on the same arc, with the same three knuckles. A hand with
   * no thumb cannot have opened the door, and the door was opened. */
}

/* ================================================================== */
/* ANGUISH                                                             */
/*                                                                     */
/* Red, hard-surfaced — flesh-coloured but not fleshy. Extremely fast.  */
/* Rare. This is the only entity that ever gets a clean look, and       */
/* looking at it is the loss condition.                                 */
/*                                                                     */
/* The horns are the silhouette. Everything else is thin.               */
/*                                                                     */
/* §3.5. Its one photograph is not a street photograph. It is a PLATE:  */
/* the thing on a pale sweep with a scale bar under it, shot square,    */
/* lit flat, in focus, at a resolution nothing else in the game gets.   */
/* Which raises the question of who had it on a table, and the game     */
/* does not answer that either.                                        */
/* ================================================================== */

/* Shared geometry, so the silhouette and the detail cannot disagree by a
 * pixel. The detail fills the SAME polygons rather than insetting them —
 * which leaves the silhouette showing only as the antialiased hairline at
 * the edge, and that hairline is what stops the shell reading as a sticker.
 *
 * The canvas is wider than tall (aspect 1.05) because this is an upper-body
 * plate, not a full-length shot. There are no legs in the photograph. The
 * frame cuts it at the bottom of the ribcage, the way a specimen plate does
 * when the specimen is longer than the sweep. */

const ANG = {
  // A broad low cranium and a SHORT muzzle. The first pass gave it a long
  // narrow head tapering to a point, which is a goat, and a red goat with
  // big horns is a cartoon devil no matter how the surface is painted.
  headY: 0.296, headRx: 0.094, headRy: 0.108,
  jawY: 0.472, neckY: 0.582,
  bodyY: 0.830, bodyRx: 0.132, bodyRy: 0.260,
  hornRoot: 0.070, hornMid: [0.330, 0.286], hornTip: [0.415, 0.098],
  eyeY: 0.284, eyeX: 0.042, eye2Y: 0.352, eye2X: 0.036,
};

function angSkull(W, H) {
  return blob(W * 0.5, H * ANG.headY, W * ANG.headRx, H * ANG.headRy, 0.115, 3);
}

/** The muzzle: cranium down to a narrow jaw. Not a taper — it steps in. */
function angMuzzle(W, H) {
  const cx = W * 0.5;
  return [
    ...arc(cx - W * 0.078, H * (ANG.headY + 0.030), cx - W * 0.044, H * (ANG.jawY - 0.026), 0.05, 8),
    [cx - W * 0.030, H * ANG.jawY],
    [cx + W * 0.030, H * ANG.jawY],
    ...arc(cx + W * 0.044, H * (ANG.jawY - 0.026), cx + W * 0.078, H * (ANG.headY + 0.030), 0.05, 8),
  ];
}

function angTorso(W, H) {
  return blob(W * 0.5, H * ANG.bodyY, W * ANG.bodyRx, H * ANG.bodyRy, 0.10, 7, 0.10);
}

/** Two stages: out, then up. A single arc gives a banana; this gives a horn. */
function angHorn(W, H, s) {
  const cx = W * 0.5;
  const r = [cx + s * W * ANG.hornRoot, H * (ANG.headY - 0.035)];
  const m = [cx + s * W * ANG.hornMid[0], H * ANG.hornMid[1]];
  const t = [cx + s * W * ANG.hornTip[0], H * ANG.hornTip[1]];
  // `.slice(1)` on the second arc: `arc` includes both endpoints, so
  // concatenating leaves a duplicated point at the seam, and a duplicated
  // point makes atan2(0,0) return 0, which puts a visible notch in the
  // outline exactly where the horn bends.
  return [...arc(r[0], r[1], m[0], m[1], s * 0.20, 10),
          ...arc(m[0], m[1], t[0], t[1], s * 0.26, 10).slice(1)];
}

function anguishSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  const cx = W * 0.5;

  // Torso and neck first, so the head sits over them cleanly.
  fillPath(g, angTorso(W, H));
  limb(g, arc(cx, H * (ANG.jawY - 0.075), cx, H * (ANG.neckY + 0.03), 0, 8),
       W * 0.030, W * 0.060, 0.10, 21);

  // Arms: thin, long, hanging off a body far too heavy for them, and they
  // leave the frame at the bottom rather than ending in hands.
  for (const s of [-1, 1]) {
    limb(g, arc(cx + s * W * 0.100, H * 0.700, cx + s * W * 0.262, H * 1.000, s * 0.16, 14),
         W * 0.021, W * 0.008, 0.16, 30 + s);
  }

  fillPath(g, angMuzzle(W, H));
  fillPath(g, angSkull(W, H));

  // The horns, and the brow each one grows out of.
  for (const s of [-1, 1]) {
    limb(g, angHorn(W, H, s), W * 0.055, W * 0.009, 0.07, 40 + s);
    limb(g, arc(cx + s * W * 0.024, H * (ANG.headY - 0.070),
                cx + s * W * 0.064, H * (ANG.headY - 0.026), s * 0.12, 8),
         W * 0.024, W * 0.036);
  }
}

function anguishDetail(g, W, H) {
  const cx = W * 0.5;
  const skull = angSkull(W, H), torso = angTorso(W, H);

  /* Red. Hard-surfaced. Two lights at 45°, which means two speculars and no
   * deep shadow anywhere — a plate is lit to remove exactly the information
   * that would tell you what you are looking at. */
  /* Oxblood, not pillar-box. The reference is a dark, dull, almost brown
   * red with the saturation of dried blood — the first pass used a poster
   * red at 65% saturation across the whole animal, and a large flat area of
   * a single saturated hue is the most cartoon-looking thing a picture can
   * contain. Nearly all of it now lives between #5a1712 and #24090a, and the
   * bright red exists only as a narrow band where a light actually falls. */
  const shell = (x0, y0, x1, y1) => {
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, '#8a2c22');
    gr.addColorStop(0.20, '#6b1e18');
    gr.addColorStop(0.52, '#4c1512');
    gr.addColorStop(0.82, '#31100f');
    gr.addColorStop(1, '#1d0908');
    return gr;
  };

  // Neck and arms, in the same shell, so no black shows through anywhere.
  g.fillStyle = shell(cx - W * 0.06, H * 0.55, cx + W * 0.06, H * 0.70);
  limb(g, arc(cx, H * (ANG.jawY - 0.075), cx, H * (ANG.neckY + 0.03), 0, 8),
       W * 0.028, W * 0.058, 0.10, 21);
  for (const s of [-1, 1]) {
    const a = arc(cx + s * W * 0.100, H * 0.700, cx + s * W * 0.262, H * 1.000, s * 0.16, 14);
    g.fillStyle = shell(cx + s * W * 0.10, H * 0.70, cx + s * W * 0.26, H * 1.0);
    limb(g, a, W * 0.019, W * 0.007, 0.16, 30 + s);
    sheen(g, a, W * 0.005, 0.20, '236,178,158');
    // Two swellings per arm, and they are not at the elbow. Kept dark —
    // a pale bulb on a dark limb reads as a bead threaded onto a string.
    joint(g, a[4][0], a[4][1], W * 0.015, '#4c1512', '#7d3227');
    joint(g, a[10][0], a[10][1], W * 0.010, '#3a1010', '#6a2a22');
  }

  /* ---- THE TORSO ---- */
  g.save();
  clipPath(g, torso);
  g.fillStyle = shell(cx - W * 0.13, H * 0.62, cx + W * 0.12, H * 1.05);
  g.fillRect(cx - W * 0.20, H * 0.55, W * 0.40, H * 0.60);
  // Mottle. Without this the gradient is plastic; with it the shell has
  // been outdoors.
  mottle(g, cx - W * 0.16, H * 0.58, W * 0.32, H * 0.52, 60, '196,104,80', 0.20, 5);
  mottle(g, cx - W * 0.16, H * 0.58, W * 0.32, H * 0.52, 52, '22,5,5', 0.30, 9);
  /* Ribbing. Segmented, not like bone: each ridge is RAISED, with a hard
   * shadow under it and a hard highlight on top of it. The SPACING is
   * uneven — evenly spaced ridges read as a mattress, and the whole point
   * of this animal is that it is regular in ways that are wrong and
   * irregular in ways that ought to be regular. */
  let ry = 0.622;
  for (let i = 0; i < 10; i++) {
    ry += 0.030 + (i % 3) * 0.008 + Math.abs(wobble(i * 1.9, 71)) * 0.010;
    const y = H * ry;
    const w = W * (0.104 + Math.sin(i / 9 * Math.PI) * 0.024);
    g.strokeStyle = 'rgba(20,4,4,0.82)';
    g.lineWidth = Math.max(1, W * 0.0062);
    g.beginPath();
    g.moveTo(cx - w, y + H * 0.005);
    g.quadraticCurveTo(cx + W * 0.006, y + H * 0.026, cx + w, y + H * 0.003);
    g.stroke();
    g.strokeStyle = 'rgba(228,150,124,0.16)';
    g.lineWidth = Math.max(0.8, W * 0.0028);
    g.beginPath();
    g.moveTo(cx - w * 0.94, y);
    g.quadraticCurveTo(cx + W * 0.006, y + H * 0.020, cx + w * 0.94, y - H * 0.002);
    g.stroke();
  }
  // The sternal line, which does not run down the middle.
  g.strokeStyle = 'rgba(46,10,8,0.55)';
  g.lineWidth = Math.max(1, W * 0.004);
  g.beginPath();
  g.moveTo(cx + W * 0.012, H * 0.640);
  g.quadraticCurveTo(cx - W * 0.004, H * 0.820, cx + W * 0.016, H * 1.020);
  g.stroke();
  g.restore();

  /* ---- THE HORNS ----
   * Darker than the shell, with growth rings across them. Horn grows in
   * seasons. Nothing else about the animal suggests it has had seasons. */
  for (const s of [-1, 1]) {
    const h = angHorn(W, H, s);
    const hg = g.createLinearGradient(cx, H * ANG.headY, cx + s * W * 0.42, H * 0.10);
    hg.addColorStop(0, '#84201a');
    hg.addColorStop(0.5, '#5d1310');
    hg.addColorStop(1, '#2a0908');
    g.fillStyle = hg;
    limb(g, h, W * 0.052, W * 0.008, 0.07, 40 + s);
    sheen(g, h, W * 0.011, 0.34, '255,214,196');
    g.strokeStyle = 'rgba(28,5,4,0.50)';
    for (let i = 2; i < h.length - 1; i++) {
      const t = i / (h.length - 1);
      const [x, y] = h[i];
      const w = W * (0.050 - t * 0.043);
      g.lineWidth = Math.max(0.5, W * 0.0024);
      g.beginPath();
      g.moveTo(x - w * 0.85, y + w * 0.60);
      g.lineTo(x + w * 0.85, y - w * 0.60);
      g.stroke();
    }
    // The brow it grows out of.
    g.fillStyle = '#8e2019';
    limb(g, arc(cx + s * W * 0.024, H * (ANG.headY - 0.070),
                cx + s * W * 0.064, H * (ANG.headY - 0.026), s * 0.12, 8),
         W * 0.022, W * 0.034);
  }

  /* ---- THE HEAD ---- */
  // Muzzle first, then the cranium over it.
  g.fillStyle = shell(cx - W * 0.05, H * 0.34, cx + W * 0.05, H * 0.58);
  fillPath(g, angMuzzle(W, H));
  g.save();
  clipPath(g, angMuzzle(W, H));
  mottle(g, cx - W * 0.07, H * 0.33, W * 0.14, H * 0.25, 22, '30,6,5', 0.16, 13);
  // Two rows of small paired vents down the muzzle where nostrils are not.
  g.fillStyle = 'rgba(26,4,4,0.80)';
  for (let i = 0; i < 5; i++) {
    const y = H * (0.400 + i * 0.032);
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(cx + s * W * 0.017, y, W * 0.0055, H * 0.0042, s * 0.3, 0, 7);
      g.fill();
    }
  }
  g.restore();

  g.save();
  clipPath(g, skull);
  g.fillStyle = shell(cx - W * 0.09, H * 0.19, cx + W * 0.08, H * 0.42);
  g.fillRect(cx - W * 0.12, H * 0.16, W * 0.24, H * 0.30);
  mottle(g, cx - W * 0.08, H * 0.19, W * 0.16, H * 0.22, 30, '224,140,112', 0.11, 17);
  mottle(g, cx - W * 0.08, H * 0.19, W * 0.16, H * 0.22, 24, '28,5,4', 0.15, 23);
  // Facets. A hard shell breaks into planes; flesh does not.
  g.strokeStyle = 'rgba(44,9,7,0.42)';
  g.lineWidth = Math.max(0.7, W * 0.0032);
  for (const [ax, ay, bx, by] of [
    [-0.062, 0.256, -0.018, 0.372], [0.062, 0.256, 0.018, 0.372],
    [-0.038, 0.212, -0.010, 0.290], [0.038, 0.212, 0.010, 0.290],
    [-0.070, 0.320, -0.034, 0.398], [0.070, 0.320, 0.034, 0.398],
  ]) {
    g.beginPath();
    g.moveTo(cx + W * ax, H * ay); g.lineTo(cx + W * bx, H * by);
    g.stroke();
  }
  g.restore();

  // The specular edge along the left cheek and down the jaw. One stroke,
  // hard, and it is what says "this is not skin".
  // Clipped to the head, so it stops at the jaw instead of running on down
  // over the neck as a stray diagonal.
  g.save();
  g.beginPath();
  clipPath(g, skull);
  g.strokeStyle = 'rgba(255,222,206,0.42)';
  g.lineWidth = Math.max(1, W * 0.0048);
  g.beginPath();
  g.moveTo(cx - W * 0.086, H * 0.262);
  g.quadraticCurveTo(cx - W * 0.076, H * 0.360, cx - W * 0.044, H * 0.420);
  g.stroke();
  g.restore();
  g.save();
  clipPath(g, angMuzzle(W, H));
  g.strokeStyle = 'rgba(255,222,206,0.24)';
  g.lineWidth = Math.max(1, W * 0.0038);
  g.beginPath();
  g.moveTo(cx - W * 0.070, H * 0.336);
  g.quadraticCurveTo(cx - W * 0.058, H * 0.420, cx - W * 0.030, H * 0.466);
  g.stroke();
  g.restore();

  /* Where the arms leave the torso the shell is stretched over it — but
   * DARK. A pale bulb on a dark body reads as a bead glued on, which is
   * what the shoulders were. What is here is a shadowed socket with one
   * thin lit edge, which is what a joint under a shell actually looks like. */
  for (const s of [-1, 1]) {
    const jx = cx + s * W * 0.100, jy = H * 0.702;
    const jg = g.createRadialGradient(jx - s * W * 0.008, jy - H * 0.008, 0, jx, jy, W * 0.026);
    jg.addColorStop(0, '#5a1a14');
    jg.addColorStop(0.6, '#33100e');
    jg.addColorStop(1, 'rgba(28,9,8,0)');
    g.fillStyle = jg;
    g.beginPath(); g.ellipse(jx, jy, W * 0.026, H * 0.028, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(226,148,124,0.26)';
    g.lineWidth = Math.max(0.8, W * 0.0028);
    g.beginPath();
    g.ellipse(jx, jy, W * 0.019, H * 0.021, 0, Math.PI * 1.05, Math.PI * 1.85);
    g.stroke();
  }

  /* ---- THE EYES, WHICH ARE THE BRIGHT WRONG DETAIL ----
   *
   * Not dots. A pale sclera with no iris at all — a black aperture in a bone
   * field, ringed by a hard rim, wet at the edge. There are FOUR, in two
   * pairs, and the lower pair is smaller and shut, and nothing about the
   * arrangement is symmetrical enough to be a design or asymmetrical enough
   * to be damage.
   *
   * This is the one image in the game the subject holds still for, so these
   * have to survive being looked at for a minute. */
  for (const s of [-1, 1]) {
    const ex = cx + s * W * ANG.eyeX, ey = H * ANG.eyeY;
    // A brow shelf over each, so the eye sits UNDER something.
    g.fillStyle = 'rgba(52,10,8,0.55)';
    g.beginPath();
    g.ellipse(ex, ey - H * 0.020, W * 0.034, H * 0.016, s * 0.12, 0, 7);
    g.fill();
    /* The socket: a deep recess, so the eye sits IN the head rather than on
     * it. This is what the first pass got wrong — a bright oval sitting
     * proud of the surface is a googly eye, and no amount of slit pupil
     * rescues it. The recess is drawn as a gradient so it has a floor. */
    const soc = g.createRadialGradient(ex, ey - H * 0.004, 0, ex, ey, W * 0.036);
    soc.addColorStop(0, 'rgba(14,3,3,0.96)');
    soc.addColorStop(0.66, 'rgba(24,5,5,0.80)');
    soc.addColorStop(1, 'rgba(30,7,6,0)');
    g.fillStyle = soc;
    g.beginPath(); g.ellipse(ex, ey, W * 0.036, H * 0.030, 0, 0, 7); g.fill();
    // Sclera. Small, bone rather than white, and mostly hidden under the
    // brow — what shows is a crescent, not a circle.
    g.fillStyle = '#9d9280';
    fillPath(g, blob(ex, ey + H * 0.002, W * 0.0160, H * 0.0125, 0.10, 50 + s));
    // The aperture. No iris — just an opening, a vertical slit, very
    // slightly off-centre, and the two are off-centre the same way.
    g.fillStyle = '#0a0807';
    g.beginPath();
    g.ellipse(ex + W * 0.0022, ey + H * 0.0026, W * 0.0052, H * 0.0110, 0, 0, 7);
    g.fill();
    // Wet at the rim: two small hard speculars, one per light, and that is
    // how you know it is wet and how you know there were two lights.
    g.fillStyle = 'rgba(255,255,255,0.80)';
    g.beginPath(); g.ellipse(ex - W * 0.0074, ey - H * 0.0022, W * 0.0030, H * 0.0022, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,248,240,0.38)';
    g.beginPath(); g.ellipse(ex + W * 0.0082, ey + H * 0.0058, W * 0.0022, H * 0.0016, 0, 0, 7); g.fill();

    // The second pair, below, smaller, and shut. Nothing explains them.
    const fx = cx + s * W * ANG.eye2X, fy = H * ANG.eye2Y;
    g.fillStyle = 'rgba(28,5,5,0.82)';
    g.beginPath(); g.ellipse(fx, fy, W * 0.016, H * 0.0085, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(222,176,158,0.44)';
    g.lineWidth = Math.max(0.6, W * 0.0024);
    g.beginPath();
    g.moveTo(fx - W * 0.014, fy);
    g.quadraticCurveTo(fx, fy + H * 0.005, fx + W * 0.014, fy);
    g.stroke();
    // A lash-line of short bristles along the shut lid. On a shell.
    g.strokeStyle = 'rgba(20,4,4,0.55)';
    g.lineWidth = Math.max(0.5, W * 0.0016);
    for (let i = 0; i < 7; i++) {
      const t = i / 6, x = fx - W * 0.013 + t * W * 0.026;
      g.beginPath();
      g.moveTo(x, fy + H * 0.0035);
      g.lineTo(x + s * W * 0.002, fy + H * 0.0090);
      g.stroke();
    }
  }
}

/* ================================================================== */
/* THE PATHOGEN                                                        */
/*                                                                     */
/* NEVER RENDERED IN THE WORLD. It has no physical form. This asset     */
/* exists only for the surface it manifests on — a screen.              */
/*                                                                     */
/* It is not saved for the ending any more. It comes through displays   */
/* from the middle of Act 2 onward, briefly and repeatedly, and by the  */
/* time it stays on the screen the player has already seen it four or   */
/* five times and has stopped being able to tell themselves it was the  */
/* signal. See CONFIG.pathogen for the schedule.                        */
/* ================================================================== */

/**
 * §3.4. It is rendered BY A DISPLAY, so it is sharp and it is made of the
 * things a display is made of. Not a face: an interpolation of one.
 *
 * It has a grin, and the grin is the whole image. The mistake in the last
 * version was drawing that grin as a circular arc, which is a cartoon; the
 * mistake before that was deleting it, which left a face with nothing wrong
 * with it. What is here is a grin far wider than the head it is on, running
 * off both sides of the face so it has no corners, with forty identical
 * teeth in it — and the red of it is out of register with its own outline,
 * because the chroma channel has slipped, or because the red is not part of
 * the face. The game does not say which.
 */
/* Everything is measured off the head, because the head IS the image. The
 * version before this gave it a small face on a tapering column and a domed
 * pair of shoulders, and the result was a chess piece. A transmitted face
 * fills the frame — that is what a face on a screen does, and it is why the
 * player cannot look at something else instead. */
const PATH = {
  headY: 0.330, headRx: 0.300, headRy: 0.340,
  eyeY: 0.296, eyeX: 0.118,
  grinY: 0.492, grinW: 0.398,
  neckTop: 0.630, neckBot: 0.820, neckW: 0.098,
};

function pathogenFace(g, W, H) {
  const cx = W * 0.5;
  const head = blob(cx, H * PATH.headY, W * PATH.headRx, H * PATH.headRy, 0.090, 81);

  /* Shoulders. Wide, low, and cropped by the frame — a body that continues
   * past the bottom of the transmission. No arms: there is nothing to reach
   * with, and the absence is easier to notice on a body than on a blank. */
  g.fillStyle = '#07080a';
  g.beginPath();
  g.moveTo(cx - W * 0.62, H * 1.00);
  g.bezierCurveTo(cx - W * 0.44, H * 0.845, cx - W * 0.22, H * 0.800, cx, H * 0.798);
  g.bezierCurveTo(cx + W * 0.22, H * 0.800, cx + W * 0.44, H * 0.845, cx + W * 0.62, H * 1.00);
  g.closePath();
  g.fill();
  // A collar edge on them, catching the same light the face is under. It is
  // wearing something. That is worse than not. Faint, and it fades out
  // toward the shoulders, so the shape does not read as a plinth.
  const col = g.createLinearGradient(cx - W * 0.34, 0, cx + W * 0.34, 0);
  col.addColorStop(0, 'rgba(120,124,132,0)');
  col.addColorStop(0.5, 'rgba(120,124,132,0.26)');
  col.addColorStop(1, 'rgba(120,124,132,0)');
  g.strokeStyle = col;
  g.lineWidth = Math.max(1, W * 0.005);
  g.beginPath();
  g.moveTo(cx - W * 0.34, H * 0.900);
  g.bezierCurveTo(cx - W * 0.14, H * 0.826, cx + W * 0.14, H * 0.826, cx + W * 0.34, H * 0.900);
  g.stroke();

  // Neck: narrow, and it does not taper the way a neck tapers — it is the
  // same width top and bottom, like a length of pipe.
  const neck = g.createLinearGradient(cx - W * PATH.neckW, 0, cx + W * PATH.neckW, 0);
  neck.addColorStop(0, '#54565b');
  neck.addColorStop(0.32, '#9fa2a8');
  neck.addColorStop(0.60, '#7c7e84');
  neck.addColorStop(1, '#3c3d42');
  g.fillStyle = neck;
  g.beginPath();
  g.moveTo(cx - W * PATH.neckW, H * PATH.neckTop);
  g.lineTo(cx + W * PATH.neckW, H * PATH.neckTop);
  g.lineTo(cx + W * PATH.neckW * 1.08, H * PATH.neckBot);
  g.lineTo(cx - W * PATH.neckW * 1.08, H * PATH.neckBot);
  g.closePath();
  g.fill();

  /* ---- THE HEAD ----
   * Modelled, not flat: a brow, a nose ridge, a jaw, a temple — all in the
   * right places and none of them the right shape. That is what makes it
   * read as almost-a-face rather than as a mask. */
  g.save();
  clipPath(g, head);

  const skull = g.createRadialGradient(cx - W * 0.10, H * 0.230, 0, cx, H * 0.340, W * 0.46);
  skull.addColorStop(0, '#dcdee2');
  skull.addColorStop(0.42, '#b0b3b9');
  skull.addColorStop(0.78, '#7b7e85');
  skull.addColorStop(1, '#43454b');
  g.fillStyle = skull;
  g.fillRect(cx - W * 0.42, H * 0.00, W * 0.84, H * 0.72);
  // Skin. Not a gradient: a hundred soft patches a few percent apart.
  mottle(g, cx - W * 0.30, H * 0.02, W * 0.60, H * 0.64, 54, '236,238,242', 0.07, 83);
  mottle(g, cx - W * 0.30, H * 0.02, W * 0.60, H * 0.64, 44, '24,26,32', 0.09, 89);

  // Temples, hollow, and hollower on one side than the other.
  for (const [s, a] of [[-1, 0.20], [1, 0.13]]) {
    const t = g.createRadialGradient(cx + s * W * 0.235, H * 0.245, 0,
                                     cx + s * W * 0.235, H * 0.245, W * 0.13);
    t.addColorStop(0, `rgba(22,24,29,${a})`);
    t.addColorStop(1, 'rgba(22,24,29,0)');
    g.fillStyle = t;
    g.fillRect(cx + s * W * 0.10, H * 0.13, W * 0.30 * s, H * 0.24);
  }

  // The brow, as a shadow rather than a line, and it does not sit level.
  g.fillStyle = 'rgba(22,24,29,0.36)';
  g.beginPath();
  g.moveTo(cx - W * 0.245, H * 0.256);
  g.quadraticCurveTo(cx, H * 0.208, cx + W * 0.245, H * 0.244);
  g.quadraticCurveTo(cx, H * 0.256, cx - W * 0.245, H * 0.256);
  g.fill();

  // The nose ridge: a highlight with no nostrils under it and no wings to
  // the sides of it. Just a raised line down the middle of a face.
  g.strokeStyle = 'rgba(240,242,246,0.32)';
  g.lineWidth = Math.max(1, W * 0.016);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx + W * 0.004, H * 0.286);
  g.lineTo(cx - W * 0.010, H * 0.418);
  g.stroke();
  g.strokeStyle = 'rgba(26,28,34,0.26)';
  g.lineWidth = Math.max(1, W * 0.008);
  g.beginPath();
  g.moveTo(cx + W * 0.026, H * 0.300);
  g.lineTo(cx + W * 0.014, H * 0.420);
  g.stroke();

  // Cheekbones, symmetrical to a degree faces are not.
  for (const s of [-1, 1]) {
    g.fillStyle = 'rgba(26,28,34,0.20)';
    g.beginPath();
    g.ellipse(cx + s * W * 0.190, H * 0.386, W * 0.088, H * 0.062, s * 0.42, 0, 7);
    g.fill();
  }

  /* The eyes. Sockets with something recessed in them, and a pale ring where
   * the sclera should be — so they have depth, and they are not looking at
   * the camera by a couple of degrees, and both are off by the SAME couple
   * of degrees, which is the part that is hard to stop noticing. */
  for (const s of [-1, 1]) {
    const ex = cx + s * W * PATH.eyeX, ey = H * PATH.eyeY;
    // The orbit: a deep recess, deeper on the outside.
    const orb = g.createRadialGradient(ex, ey, 0, ex, ey, W * 0.105);
    orb.addColorStop(0, 'rgba(10,11,14,0.92)');
    orb.addColorStop(0.62, 'rgba(14,15,19,0.55)');
    orb.addColorStop(1, 'rgba(14,15,19,0)');
    g.fillStyle = orb;
    g.beginPath(); g.ellipse(ex, ey, W * 0.105, H * 0.080, s * 0.10, 0, 7); g.fill();
    g.fillStyle = 'rgba(8,9,12,0.94)';
    fillPath(g, blob(ex, ey, W * 0.072, H * 0.050, 0.10, 90 + s));
    /* Sclera. Bone rather than white, and barely showing — the lid is down
     * much further than a resting lid is, so what you get is a sliver under
     * a heavy hood. A big white sclera with a dot in it is a cartoon eye,
     * and that is what this was. */
    g.fillStyle = '#8e8a80';
    fillPath(g, blob(ex + s * W * 0.004, ey + H * 0.009, W * 0.042, H * 0.017, 0.10, 92 + s));
    // The pupil. Both a few degrees to the same side of the lens.
    g.fillStyle = '#06060a';
    g.beginPath();
    g.ellipse(ex + W * 0.014, ey + H * 0.009, W * 0.017, H * 0.014, 0, 0, 7);
    g.fill();
    g.fillStyle = 'rgba(232,236,242,0.34)';
    g.beginPath();
    g.ellipse(ex + W * 0.007, ey + H * 0.005, W * 0.006, H * 0.004, 0, 0, 7);
    g.fill();
    // The lid: a hard edge over the top of the eye, and a lash line that is
    // one continuous stroke rather than lashes.
    g.strokeStyle = 'rgba(16,17,21,0.80)';
    g.lineWidth = Math.max(1, W * 0.009);
    g.beginPath();
    g.ellipse(ex, ey, W * 0.070, H * 0.048, s * 0.10, Math.PI * 0.98, Math.PI * 1.92);
    g.stroke();
  }

  /* ---- THE GRIN ----
   *
   * It goes back in. It was taken out because a pale oval with two dots and
   * a red curve is a smiley, and a smiley is funny — but the problem was
   * never that it was a smile, it was that it was a CIRCULAR ARC. An arc is
   * a cartoon. What makes a grin frightening is that it is wider than the
   * head it is on, that it has no visible corners because it runs off both
   * sides of the face, and that the thing inside it is regular. */
  const gy = H * PATH.grinY, gw = W * PATH.grinW;

  // The mouth cavity. Deeper on the left, because the head is turned.
  g.fillStyle = '#2e0504';
  g.beginPath();
  g.moveTo(cx - gw, gy - H * 0.030);
  g.bezierCurveTo(cx - gw * 0.4, gy + H * 0.128, cx + gw * 0.4, gy + H * 0.120, cx + gw, gy - H * 0.038);
  g.bezierCurveTo(cx + gw * 0.4, gy + H * 0.052, cx - gw * 0.4, gy + H * 0.056, cx - gw, gy - H * 0.030);
  g.fill();

  // The teeth. A comb: fifty of them, identical, the same width the whole
  // way across, no canines, no gaps, and no smaller ones at the corners.
  g.save();
  g.beginPath();
  g.moveTo(cx - gw, gy - H * 0.030);
  g.bezierCurveTo(cx - gw * 0.4, gy + H * 0.128, cx + gw * 0.4, gy + H * 0.120, cx + gw, gy - H * 0.038);
  g.bezierCurveTo(cx + gw * 0.4, gy + H * 0.052, cx - gw * 0.4, gy + H * 0.056, cx - gw, gy - H * 0.030);
  g.clip();
  const teeth = g.createLinearGradient(0, gy - H * 0.02, 0, gy + H * 0.13);
  teeth.addColorStop(0, '#eae6da');
  teeth.addColorStop(0.55, '#c3bfb1');
  teeth.addColorStop(1, '#6f6b5e');
  g.fillStyle = teeth;
  g.fillRect(cx - gw * 1.1, gy - H * 0.05, gw * 2.2, H * 0.20);
  g.strokeStyle = 'rgba(42,8,6,0.72)';
  g.lineWidth = Math.max(0.8, W * 0.0030);
  for (let i = -25; i <= 25; i++) {
    const x = cx + i * gw * 0.041;
    g.beginPath(); g.moveTo(x, gy - H * 0.06); g.lineTo(x, gy + H * 0.16); g.stroke();
  }
  // The shadow inside the upper lip, so the teeth sit in a mouth.
  g.fillStyle = 'rgba(22,3,3,0.62)';
  g.beginPath();
  g.moveTo(cx - gw * 1.1, gy - H * 0.034);
  g.bezierCurveTo(cx - gw * 0.4, gy + H * 0.062, cx + gw * 0.4, gy + H * 0.058, cx + gw * 1.1, gy - H * 0.042);
  g.lineTo(cx + gw * 1.1, gy - H * 0.09);
  g.lineTo(cx - gw * 1.1, gy - H * 0.09);
  g.fill();
  g.restore();

  /* The lips. Two heavy red bands, above the teeth and below them, and they
   * are the reddest thing anywhere in the game. Drawn opaque rather than
   * blended, because a blended red on a pale field goes pink and pink is
   * not what this is. */
  const lip = (y0, y1, thick, alpha) => {
    g.strokeStyle = `rgba(158,16,13,${alpha})`;
    g.lineWidth = thick;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(cx - gw, gy + H * y0);
    g.bezierCurveTo(cx - gw * 0.4, gy + H * y1, cx + gw * 0.4, gy + H * (y1 - 0.006),
                    cx + gw, gy + H * (y0 - 0.008));
    g.stroke();
  };
  lip(-0.030, 0.052, Math.max(2, W * 0.030), 0.95);   // upper
  lip(0.006, 0.126, Math.max(2, W * 0.034), 0.95);    // lower
  // And a wash of the same red over the whole cavity, so the teeth sit in
  // something wet rather than in a slot.
  g.save();
  g.globalCompositeOperation = 'multiply';
  g.fillStyle = 'rgba(206,74,62,0.55)';
  g.beginPath();
  g.moveTo(cx - gw, gy - H * 0.030);
  g.bezierCurveTo(cx - gw * 0.4, gy + H * 0.128, cx + gw * 0.4, gy + H * 0.120, cx + gw, gy - H * 0.038);
  g.bezierCurveTo(cx + gw * 0.4, gy + H * 0.052, cx - gw * 0.4, gy + H * 0.056, cx - gw, gy - H * 0.030);
  g.fill();
  g.restore();

  /* And the red is NOT REGISTERED TO IT. The chroma channel is out by a few
   * pixels, so a second copy of the red sits down and to the right of the
   * mouth it belongs to — over the chin, off the lip. Which means either the
   * display is broken or the red is not part of the face, and there is no
   * third reading, and the game never picks one. */
  g.save();
  g.globalCompositeOperation = 'screen';
  g.fillStyle = 'rgba(190,24,18,0.50)';
  g.beginPath();
  g.moveTo(cx - gw * 0.96, gy + H * 0.006);
  g.bezierCurveTo(cx - gw * 0.36, gy + H * 0.168, cx + gw * 0.44, gy + H * 0.160, cx + gw * 1.04, gy - H * 0.002);
  g.bezierCurveTo(cx + gw * 0.44, gy + H * 0.094, cx - gw * 0.36, gy + H * 0.098, cx - gw * 0.96, gy + H * 0.006);
  g.fill();
  g.restore();

  /* THE TEAR, which is not where the mouth is — it is across the EYES. The
   * rows through them are displaced, so the two halves of the face do not
   * agree about where it is looking. The grin below is perfectly intact and
   * perfectly aligned. The undamaged part is the mouth. */
  const tearY = H * 0.330;
  const strip = g.getImageData(cx - W * 0.29, tearY, W * 0.58, H * 0.020);
  g.fillStyle = '#1a1c21';
  g.fillRect(cx - W * 0.29, tearY, W * 0.58, H * 0.020);
  g.putImageData(strip, cx - W * 0.29 + W * 0.020, tearY);
  g.strokeStyle = 'rgba(10,11,14,0.45)';
  g.lineWidth = Math.max(1, W * 0.0025);
  g.beginPath();
  g.moveTo(cx - W * 0.29, tearY); g.lineTo(cx + W * 0.29, tearY); g.stroke();

  g.restore();

  /* THE BRIGHT WRONG DETAIL, and it is not on the thing. It is a channel
   * failure: one line of red running down out of the grin and along the
   * neck, at exactly one-pixel accuracy, which is not how blood behaves and
   * is exactly how a broken chroma channel behaves. */
  g.strokeStyle = 'rgba(196,32,26,0.92)';
  g.lineWidth = Math.max(1, W * 0.005);
  g.beginPath();
  g.moveTo(cx + W * 0.030, H * 0.586);
  g.lineTo(cx + W * 0.030, H * 0.828);
  g.stroke();
  g.strokeStyle = 'rgba(196,32,26,0.26)';
  g.lineWidth = Math.max(1, W * 0.014);
  g.beginPath();
  g.moveTo(cx + W * 0.030, H * 0.586);
  g.lineTo(cx + W * 0.030, H * 0.790);
  g.stroke();

  // And the display's own structure over all of it, because that is the
  // only reason any of this is visible.
  g.fillStyle = 'rgba(0,0,0,0.16)';
  for (let y = 0; y < H; y += 3) g.fillRect(0, y, W, 1);
}

/* ================================================================== */
/* ZĀNUWĀM                                                             */
/*                                                                     */
/* NEVER RENDERED IN THE WORLD. §8.2 — it exists only in the Ctesiphon */
/* material and in a 19th-century plate. This asset is drawn ONLY for  */
/* those documents.                                                    */
/*                                                                     */
/* The head is the whole thing: a white radiating crown of branching   */
/* filaments around a small, calm, almost polite face. The body is a   */
/* black armature with too many legs and hands held up and open. It is */
/* the only entity that took a human cultural form — everything else   */
/* is a shape; this one is a costume, and the costume does not fit.    */
/* ================================================================== */

function zanuwamSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  const cx = W * 0.50;

  // Torso: narrow, angular, and held.
  g.beginPath();
  g.moveTo(cx - W * 0.055, H * 0.30);
  g.lineTo(cx + W * 0.065, H * 0.28);
  g.lineTo(cx + W * 0.085, H * 0.56);
  g.lineTo(cx - W * 0.070, H * 0.58);
  g.closePath();
  g.fill();

  // Arms, up and out, ending in splayed twig-fingers. Not reaching for
  // anything — presenting.
  for (const s of [-1, 1]) {
    const wristX = cx + s * W * 0.30;
    const wristY = H * 0.175;
    limb(g, arc(cx + s * W * 0.055, H * 0.31, wristX, wristY, s * 0.14, 14), W * 0.017, W * 0.008);
    for (let i = 0; i < 5; i++) {
      const a = -1.45 + i * 0.19;
      limb(g, arc(wristX, wristY,
        wristX + Math.sin(a) * W * 0.055, wristY - Math.cos(a) * H * 0.105, 0.05, 8),
        W * 0.0065, W * 0.0014);
    }
  }

  // Legs: six, splayed, jointed in the wrong places.
  const legs = [-0.40, -0.26, -0.12, 0.10, 0.24, 0.40];
  for (const dx of legs) {
    const kneeX = cx + dx * W * 0.72, kneeY = H * (0.74 + Math.abs(dx) * 0.10);
    limb(g, arc(cx + dx * W * 0.16, H * 0.56, kneeX, kneeY, dx * 0.16, 12), W * 0.014, W * 0.007);
    limb(g, arc(kneeX, kneeY, cx + dx * W * 1.02, H * 1.0, -dx * 0.10, 12), W * 0.007, W * 0.002);
  }
}

function zanuwamDetail(g, W, H) {
  const cx = W * 0.50, cy = H * 0.185;
  const R = W * 0.135;

  // The radiating crown. Filaments branching twice, like something grown
  // rather than worn.
  g.strokeStyle = '#f2efe6';
  g.lineCap = 'round';
  const branch = (x, y, ang, len, wid, depth) => {
    g.lineWidth = wid;
    const x2 = x + Math.cos(ang) * len, y2 = y + Math.sin(ang) * len;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
    if (depth <= 0) return;
    branch(x2, y2, ang - 0.34 - Math.random() * 0.2, len * 0.62, wid * 0.6, depth - 1);
    branch(x2, y2, ang + 0.34 + Math.random() * 0.2, len * 0.62, wid * 0.6, depth - 1);
  };
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    branch(cx + Math.cos(a) * R * 0.82, cy + Math.sin(a) * R * 0.82, a,
      R * (0.55 + Math.random() * 0.55), Math.max(1, W * 0.008), 2);
  }

  // The face. Small, centred, symmetrical, and almost polite — which is
  // the part nobody who has written about it can account for.
  const grad = g.createRadialGradient(cx, cy, 0, cx, cy, R);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.72, '#f4f1e8');
  grad.addColorStop(1, '#d8d3c4');
  g.fillStyle = grad;
  g.beginPath(); g.arc(cx, cy, R, 0, 7); g.fill();

  g.fillStyle = '#14130f';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + s * R * 0.30, cy - R * 0.14, R * 0.075, R * 0.10, 0, 0, 7);
    g.fill();
  }
  g.strokeStyle = '#14130f';
  g.lineWidth = Math.max(1, W * 0.005);
  g.beginPath(); g.moveTo(cx, cy - R * 0.10); g.lineTo(cx - R * 0.06, cy + R * 0.20); g.stroke();
  g.beginPath();
  g.moveTo(cx - R * 0.16, cy + R * 0.44); g.lineTo(cx + R * 0.16, cy + R * 0.44);
  g.stroke();

  // A thin rim of the same white down one edge of the body: whatever the
  // head is made of, the rest of it is made of that too.
  g.strokeStyle = 'rgba(230,226,214,0.22)';
  g.lineWidth = Math.max(1, W * 0.006);
  g.beginPath(); g.moveTo(cx + W * 0.065, H * 0.29); g.lineTo(cx + W * 0.085, H * 0.56); g.stroke();
}

/* ================================================================== */
/* THE CRIPPLED KING                                                   */
/*                                                                     */
/* NEVER RENDERED IN THE WORLD. §8.1 — no sighting, no photograph, no  */
/* window event. It exists in a clay tablet, a disputed translation,   */
/* and one 1897 engraving.                                             */
/*                                                                     */
/* A manifested crown and a manifested throne, which is the only       */
/* symbolic act in the whole ecology. It does not rise.                */
/* ================================================================== */

function kingSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  const cx = W * 0.50;

  // The seat. Not a chair — a block, and it is not made of anything.
  g.fillRect(cx - W * 0.34, H * 0.70, W * 0.68, H * 0.10);
  g.fillRect(cx - W * 0.30, H * 0.80, W * 0.60, H * 0.20);

  // Seated. The proportions are wrong: too long in the spine, too long in
  // the arms, and everything folded rather than resting.
  g.beginPath();
  g.moveTo(cx - W * 0.075, H * 0.26);
  g.lineTo(cx + W * 0.075, H * 0.26);
  g.lineTo(cx + W * 0.105, H * 0.68);
  g.lineTo(cx - W * 0.105, H * 0.68);
  g.closePath();
  g.fill();

  // Skull, long and narrow.
  g.beginPath();
  g.ellipse(cx, H * 0.185, W * 0.070, H * 0.078, 0, 0, 7);
  g.fill();

  // Arms along the arms of the seat, hands over the ends.
  for (const s of [-1, 1]) {
    limb(g, arc(cx + s * W * 0.070, H * 0.30, cx + s * W * 0.285, H * 0.66, s * 0.10, 12), W * 0.020, W * 0.010);
    for (let i = 0; i < 4; i++) {
      limb(g, arc(cx + s * W * 0.285, H * 0.66,
        cx + s * W * (0.30 + i * 0.012), H * 0.74, 0, 6), W * 0.006, W * 0.002);
    }
  }
  // Legs, folded, feet flat. It has not moved.
  for (const s of [-1, 1]) {
    limb(g, arc(cx + s * W * 0.055, H * 0.68, cx + s * W * 0.145, H * 0.90, s * 0.06, 10), W * 0.022, W * 0.012);
  }
}

function kingDetail(g, W, H) {
  const cx = W * 0.50;

  // THE CROWN. Manifested, not made. It has no survival function at all,
  // and it is the first evidence that any of this has intent behind it.
  g.strokeStyle = '#d8b45a';
  g.lineWidth = Math.max(1, W * 0.011);
  g.lineCap = 'round';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const r0 = W * 0.100, r1 = W * (0.150 + (i % 3) * 0.030);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r0, H * 0.185 + Math.sin(a) * r0 * 1.1);
    g.lineTo(cx + Math.cos(a) * r1, H * 0.185 + Math.sin(a) * r1 * 1.1);
    g.stroke();
  }
  g.lineWidth = Math.max(1, W * 0.016);
  g.beginPath();
  g.ellipse(cx, H * 0.150, W * 0.086, H * 0.030, 0, 0, 7);
  g.stroke();

  // The ribcage, drawn the way an engraver draws bone: hatched, not solid.
  g.strokeStyle = '#b9b3a4';
  g.lineWidth = Math.max(1, W * 0.007);
  for (let i = 0; i < 7; i++) {
    const y = H * (0.320 + i * 0.042);
    g.beginPath();
    g.moveTo(cx - W * 0.062, y);
    g.quadraticCurveTo(cx, y + H * 0.020, cx + W * 0.062, y);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(cx, H * 0.300); g.lineTo(cx, H * 0.610);
  g.stroke();

  // The face. Two sockets and a fixed grin, and the grin is the reason the
  // 1897 plate is the one everybody reproduces.
  g.fillStyle = '#0d0c0a';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + s * W * 0.028, H * 0.170, W * 0.020, H * 0.024, 0, 0, 7);
    g.fill();
  }
  g.strokeStyle = '#d8d2c2';
  g.lineWidth = Math.max(1, W * 0.005);
  g.beginPath();
  g.moveTo(cx - W * 0.040, H * 0.215);
  g.quadraticCurveTo(cx, H * 0.238, cx + W * 0.040, H * 0.215);
  g.stroke();
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * W * 0.012;
    g.beginPath(); g.moveTo(x, H * 0.212); g.lineTo(x, H * 0.230); g.stroke();
  }

  // The seat, picked out in the one colour the plate's colourist used.
  g.fillStyle = 'rgba(96,168,164,0.62)';
  g.fillRect(cx - W * 0.30, H * 0.700, W * 0.60, H * 0.086);
  g.strokeStyle = 'rgba(150,208,204,0.5)';
  g.lineWidth = Math.max(1, W * 0.006);
  g.strokeRect(cx - W * 0.30, H * 0.700, W * 0.60, H * 0.086);
}

/* ================================================================== */
/* COMMONS                                                             */
/* ================================================================== */

function crawlerSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  // Low, below waist height. Movement is the tell, not the shape.
  g.beginPath();
  g.ellipse(W * 0.5, H * 0.66, W * 0.26, H * 0.20, 0, 0, 7);
  g.fill();
  for (let i = 0; i < 8; i++) {
    const a = -0.5 + i * 0.30;
    limb(g, arc(W * 0.5, H * 0.66,
                W * 0.5 + Math.cos(a) * W * 0.42,
                H * 0.66 + Math.abs(Math.sin(a)) * H * 0.34, 0.2, 8),
         W * 0.022, W * 0.006);
  }
}

function gleanerSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  // Hunched, mid-height. Reads as a flock more than as a creature.
  g.beginPath();
  g.ellipse(W * 0.5, H * 0.44, W * 0.17, H * 0.20, 0.2, 0, 7);
  g.fill();
  limb(g, arc(W * 0.5, H * 0.34, W * 0.63, H * 0.24, 0.18, 8), W * 0.045, W * 0.020);
  for (const s of [-1, 1]) {
    limb(g, arc(W * 0.5 + s * W * 0.06, H * 0.60, W * 0.5 + s * W * 0.16, H * 1.0, s * 0.1, 8),
         W * 0.030, W * 0.012);
  }
}

/**
 * §3.3/§3.4. The Crawler's detail. It is the most-photographed entity because
 * it is the most survivable, so it is the one the player gets to look at
 * properly, and it has to hold up to that.
 *
 * Chitin over something soft. Eight legs with two knees each, both bending
 * the wrong way. The dorsal plate is segmented and wet and it is the only
 * part of it that is armoured; underneath it is not.
 */
function crawlerDetail(g, W, H) {
  const cx = W * 0.5, cy = H * 0.66;
  const BASE = '#191a1c';
  const PALE = '#4a4c50';

  // Legs first, so the body sits on top of them.
  for (let i = 0; i < 8; i++) {
    const a = -0.5 + i * 0.30;
    const pts = arc(cx, cy, cx + Math.cos(a) * W * 0.42,
                    cy + Math.abs(Math.sin(a)) * H * 0.34, 0.2, 8);
    sheen(g, pts.slice(0, 6), W * 0.008, 0.14, '182,190,200');
    // Two knees, and they fold the opposite way to each other, which means
    // the leg cannot straighten. All eight are like this.
    for (const t of [0.34, 0.68]) {
      const k = Math.round(t * (pts.length - 1));
      joint(g, pts[k][0], pts[k][1], W * (0.019 - t * 0.006), BASE, PALE);
    }
    // The tips are hard and pale and they are the part that makes the noise.
    const [tx, ty] = pts[pts.length - 1];
    g.fillStyle = '#8b8779';
    g.beginPath(); g.ellipse(tx, ty, W * 0.008, W * 0.004, a, 0, 7); g.fill();
  }

  // The dorsal plate. Segmented across the body, wet along each ridge.
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, W * 0.255, H * 0.195, 0, 0, 7);
  g.clip();
  const shell = g.createLinearGradient(cx - W * 0.2, cy - H * 0.19, cx + W * 0.1, cy + H * 0.18);
  shell.addColorStop(0, '#2c2e31');
  shell.addColorStop(0.45, '#171819');
  shell.addColorStop(1, '#0a0a0b');
  g.fillStyle = shell;
  g.fillRect(cx - W * 0.30, cy - H * 0.22, W * 0.60, H * 0.44);
  // Five plates, overlapping front to back, each with a wet leading edge.
  for (let i = 0; i < 5; i++) {
    const t = i / 4;
    const x = cx - W * 0.20 + t * W * 0.40;
    g.strokeStyle = 'rgba(0,0,0,0.7)';
    g.lineWidth = Math.max(1, W * 0.006);
    g.beginPath();
    g.moveTo(x, cy - H * 0.20);
    g.quadraticCurveTo(x + W * 0.02, cy, x, cy + H * 0.20);
    g.stroke();
    g.strokeStyle = 'rgba(206,214,224,0.20)';
    g.lineWidth = Math.max(0.8, W * 0.0035);
    g.beginPath();
    g.moveTo(x + W * 0.005, cy - H * 0.19);
    g.quadraticCurveTo(x + W * 0.025, cy, x + W * 0.005, cy + H * 0.19);
    g.stroke();
  }
  // Where the plate meets the soft parts at the rim, the skin is stretched.
  hatch(g, cx - W * 0.24, cy + H * 0.10, cx + W * 0.24, cy + H * 0.19, 7, 0.30);
  g.restore();

  /* ---- THE BRIGHT WRONG DETAIL ----
   * A single perfectly circular pale ring set into the dorsal plate,
   * off-centre, smooth, and the same on every crawler ever photographed. It
   * is the most manufactured-looking thing on any of them. */
  wrongDetail(g, cx + W * 0.075, cy - H * 0.055, W * 0.026, '#CFC7B2');
  g.strokeStyle = 'rgba(20,18,16,0.75)';
  g.lineWidth = Math.max(0.8, W * 0.004);
  g.beginPath(); g.ellipse(cx + W * 0.075, cy - H * 0.055, W * 0.014, W * 0.014, 0, 0, 7); g.stroke();
}

/**
 * §3.3. The Gleaner's detail. The body is a sac that hangs, and everything
 * about it is about hanging: the stretch marks run down, the weight collects
 * at the bottom, the legs are set too far back to balance it.
 */
function gleanerDetail(g, W, H) {
  const cx = W * 0.5, cy = H * 0.44;
  const BASE = '#1b1c1e';
  const PALE = '#4c4e52';

  // Legs. Two, jointed backwards, and they carry a load they cannot see.
  for (const s of [-1, 1]) {
    const pts = arc(cx + s * W * 0.06, H * 0.60, cx + s * W * 0.16, H * 1.0, s * 0.1, 8);
    sheen(g, pts, W * 0.010, 0.13, '176,184,196');
    joint(g, pts[3][0], pts[3][1], W * 0.026, BASE, PALE);
    joint(g, pts[6][0], pts[6][1], W * 0.016, BASE, PALE);
    const [fx, fy] = pts[pts.length - 1];
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath(); g.ellipse(fx, fy, W * 0.026, H * 0.008, 0, 0, 7); g.fill();
  }

  // The sac. Lit along the top, heavy and dark at the bottom, and the skin
  // pulls into radial creases around the hole underneath it.
  g.save();
  g.beginPath();
  g.ellipse(cx, cy, W * 0.166, H * 0.196, 0.2, 0, 7);
  g.clip();
  const sac = g.createLinearGradient(cx, cy - H * 0.20, cx, cy + H * 0.20);
  sac.addColorStop(0, '#31333a');
  sac.addColorStop(0.4, '#1a1b1e');
  sac.addColorStop(1, '#07070a');
  g.fillStyle = sac;
  g.fillRect(cx - W * 0.20, cy - H * 0.22, W * 0.40, H * 0.44);
  // Stretch marks: pale, radiating from the underside, thickest where the
  // weight is. This is skin doing what skin does.
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI * 0.86 + (i / 13) * Math.PI * 0.72;
    g.strokeStyle = `rgba(178,172,158,${0.08 + Math.random() * 0.10})`;
    g.lineWidth = Math.max(0.6, W * 0.0035);
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * W * 0.02, cy + H * 0.16 + Math.sin(a) * H * 0.01);
    g.lineTo(cx + Math.cos(a) * W * 0.15, cy + H * 0.16 + Math.sin(a) * H * 0.15);
    g.stroke();
  }
  hatch(g, cx - W * 0.16, cy - H * 0.16, cx + W * 0.16, cy - H * 0.02, 6, 0.22);
  g.restore();

  // The head-end: a blunt stub with no features on it whatsoever.
  const nk = arc(cx, H * 0.34, cx + W * 0.13, H * 0.24, 0.18, 8);
  sheen(g, nk, W * 0.013, 0.12, '170,178,190');

  /* ---- THE BRIGHT WRONG DETAIL ----
   * A hard glossy white plate on the underside of the sac, where a mouth
   * would be if it had one. It is not a mouth: it does not open, it has no
   * lip, and it is bilaterally perfect. It is the part that goes into things. */
  g.save();
  g.translate(cx - W * 0.01, cy + H * 0.165);
  g.fillStyle = '#DCD6C4';
  g.beginPath();
  g.moveTo(-W * 0.030, 0);
  g.quadraticCurveTo(0, H * 0.050, W * 0.030, 0);
  g.quadraticCurveTo(0, -H * 0.012, -W * 0.030, 0);
  g.fill();
  g.strokeStyle = 'rgba(24,22,18,0.7)';
  g.lineWidth = Math.max(0.7, W * 0.004);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.beginPath(); g.ellipse(-W * 0.008, H * 0.010, W * 0.008, H * 0.005, 0.3, 0, 7); g.fill();
  g.restore();
}

function personSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  g.beginPath(); g.ellipse(W * 0.5, H * 0.13, W * 0.075, H * 0.055, 0, 0, 7); g.fill();
  g.beginPath();
  g.moveTo(W * 0.40, H * 0.20); g.lineTo(W * 0.60, H * 0.20);
  g.lineTo(W * 0.58, H * 0.60); g.lineTo(W * 0.42, H * 0.60);
  g.closePath(); g.fill();
  for (const s of [-1, 1]) {
    limb(g, arc(W * 0.5 + s * W * 0.09, H * 0.23, W * 0.5 + s * W * 0.14, H * 0.56, s * 0.05, 8), W * 0.028, W * 0.018);
    limb(g, arc(W * 0.5 + s * W * 0.045, H * 0.58, W * 0.5 + s * W * 0.065, H * 1.0, 0, 8), W * 0.034, W * 0.022);
  }
}

/* ================================================================== */
/* the registry                                                        */
/* ================================================================== */

const ENTITIES = {
  tormentor: { sil: tormentorSilhouette, detail: tormentorDetail,  aspect: 0.62, haze: 0.55 },
  incursion: { sil: incursionSilhouette, detail: incursionDetail,  aspect: 0.70, haze: 0.30 },
  // Wider than tall: its one image is an upper-body plate, not a full
  // length shot, and the horns go wider than the body is high.
  anguish:   { sil: anguishSilhouette,   detail: anguishDetail,    aspect: 1.05, haze: 0.22 },
  pathogen:  { sil: null,                detail: pathogenFace,     aspect: 0.80, haze: 0.10 },
  // Neither of these is ever placed in the world. They exist for the
  // documents, and the documents are the only place they have ever existed.
  zanuwam:   { sil: zanuwamSilhouette,   detail: zanuwamDetail,    aspect: 0.78, haze: 0.10 },
  king:      { sil: kingSilhouette,      detail: kingDetail,       aspect: 0.72, haze: 0.10 },
  crawler:   { sil: crawlerSilhouette,   detail: crawlerDetail,    aspect: 1.30, haze: 0.45 },
  gleaner:   { sil: gleanerSilhouette,   detail: gleanerDetail,    aspect: 0.80, haze: 0.45 },
  person:    { sil: personSilhouette,    detail: null,             aspect: 0.55, haze: 0.35 },
};

export function entityAspect(kind) { return (ENTITIES[kind] || ENTITIES.crawler).aspect; }

/**
 * @param {string} kind
 * @param {'silhouette'|'detail'|'atmosphere'} layer
 * @param {number} size
 * @returns {HTMLCanvasElement}
 */
export function entityLayer(kind, layer, size = 512) {
  const key = `${kind}.${layer}.${size}`;
  if (cache.has(key)) return cache.get(key);

  const def = ENTITIES[kind] || ENTITIES.crawler;
  const W = size, H = Math.round(size / def.aspect);
  const { c, g } = surface(W, H);

  if (layer === 'silhouette' && def.sil) {
    def.sil(g, W, H);
  } else if (layer === 'detail' && def.detail) {
    def.detail(g, W, H);
  } else if (layer === 'atmosphere') {
    // A soft haze plane in front, tinted to the scene. Sells depth and
    // takes the hard procedural edges off everything behind it.
    const grad = g.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.45, W * 0.85);
    grad.addColorStop(0, `rgba(120,132,148,${0.05 + def.haze * 0.10})`);
    grad.addColorStop(0.6, `rgba(96,106,122,${def.haze * 0.13})`);
    grad.addColorStop(1, 'rgba(70,78,92,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // A few streaks of the air between you and it.
    for (let i = 0; i < 26; i++) {
      g.fillStyle = `rgba(140,150,166,${0.012 + Math.random() * 0.022})`;
      g.fillRect(Math.random() * W, Math.random() * H, W * (0.1 + Math.random() * 0.5), 1 + Math.random() * 2);
    }
  }

  cache.set(key, c);
  return c;
}

/** Draw an entity flat onto an existing context — used by the photo layer. */
export function drawEntity(g, kind, x, y, w) {
  const def = ENTITIES[kind] || ENTITIES.crawler;
  const h = w / def.aspect;
  if (def.sil) {
    const s = entityLayer(kind, 'silhouette', 512);
    g.drawImage(s, x, y, w, h);
  }
  if (def.detail) {
    const d = entityLayer(kind, 'detail', 512);
    g.drawImage(d, x, y, w, h);
  }
  return h;
}

export default entityLayer;
