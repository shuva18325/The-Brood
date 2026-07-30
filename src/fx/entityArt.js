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
/* ------------------------------------------------------------------ */

/** A tapered limb: thick at the root, needle-thin at the tip. */
function limb(g, pts, w0, w1) {
  const n = pts.length;
  g.beginPath();
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const w = w0 + (w1 - w0) * t;
    const [x, y] = pts[i];
    const [px, py] = pts[Math.max(0, i - 1)];
    const a = Math.atan2(y - py, x - px) + Math.PI / 2;
    const ox = Math.cos(a) * w, oy = Math.sin(a) * w;
    if (i === 0) g.moveTo(x + ox, y + oy); else g.lineTo(x + ox, y + oy);
  }
  for (let i = n - 1; i >= 0; i--) {
    const t = i / (n - 1);
    const w = w0 + (w1 - w0) * t;
    const [x, y] = pts[i];
    const [px, py] = pts[Math.max(0, i - 1)];
    const a = Math.atan2(y - py, x - px) + Math.PI / 2;
    g.lineTo(x - Math.cos(a) * w, y - Math.sin(a) * w);
  }
  g.closePath();
  g.fill();
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
/* Long, slim, black, horned. Too many legs, all of them too thin for  */
/* the mass above them. Being black does not mean being featureless:    */
/* its detail is sheen and joints, and there are three joints in every  */
/* leg where an animal has one.                                         */
/*                                                                     */
/* Its silhouette is TOO TALL FOR THE STREET. The head exits the top of */
/* the window frame, so the player never sees all of it at once.        */
/* ================================================================== */

function tormentorSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  const cx = W * 0.5;

  // Body: a hanging mass, high up, small relative to the leg span.
  g.beginPath();
  g.ellipse(cx, H * 0.40, W * 0.075, H * 0.085, 0, 0, 7);
  g.fill();

  // Neck: long, thin, rising out of the top of the frame.
  limb(g, arc(cx, H * 0.36, cx - W * 0.035, H * 0.10, 0.06, 14), W * 0.021, W * 0.014);

  // Head: narrow, and the horns are the whole read.
  g.beginPath();
  g.ellipse(cx - W * 0.035, H * 0.095, W * 0.030, H * 0.026, -0.25, 0, 7);
  g.fill();

  // Horns: two, swept back and up, out of frame.
  limb(g, arc(cx - W * 0.050, H * 0.082, cx - W * 0.135, H * 0.005, 0.22, 12), W * 0.011, W * 0.003);
  limb(g, arc(cx - W * 0.022, H * 0.078, cx + W * 0.060, H * 0.000, -0.20, 12), W * 0.011, W * 0.003);

  // Legs: six, splayed wide, each far too thin to hold what is on them.
  const legs = [
    [-0.40, 1.00, 0.30], [-0.24, 1.00, 0.14], [-0.09, 1.00, 0.04],
    [ 0.10, 1.00, -0.06], [ 0.26, 1.00, -0.16], [ 0.42, 1.00, -0.30],
  ];
  for (const [dx, dy, bow] of legs) {
    limb(g, arc(cx + W * dx * 0.14, H * 0.42, cx + W * dx, H * dy, bow, 14), W * 0.016, W * 0.004);
  }
}

/**
 * §3.3. The Tormentor's detail. It is black, so the detail is entirely in
 * SHEEN and JOINTS — where the hide catches a streetlight, and how many times
 * each leg bends. Three joints per leg, on a limb that should have one.
 *
 * The weight is the point. Six needle legs under a hanging mass: each one
 * bows under load and each one is thickest exactly where it bends, and none of
 * that adds up to something that could carry what is above it.
 */
function tormentorDetail(g, W, H) {
  const cx = W * 0.5;
  const BASE = '#0a0b0d';
  const PALE = '#3d4046';

  const legs = [
    [-0.40, 1.00, 0.30], [-0.24, 1.00, 0.14], [-0.09, 1.00, 0.04],
    [ 0.10, 1.00, -0.06], [ 0.26, 1.00, -0.16], [ 0.42, 1.00, -0.30],
  ];

  for (const [dx, dy, bow] of legs) {
    const pts = arc(cx + W * dx * 0.14, H * 0.42, cx + W * dx, H * dy, bow, 14);
    // Sheen along the leading edge only, so the leg reads as round.
    sheen(g, pts.slice(0, 11), W * 0.006, 0.13, '196,206,220');
    // Three joints where an animal has one. They are evenly spaced, which is
    // worse than if they were not.
    for (const t of [0.26, 0.52, 0.78]) {
      const i = Math.round(t * (pts.length - 1));
      const r = W * (0.016 - t * 0.007);
      joint(g, pts[i][0], pts[i][1], r, BASE, PALE);
    }
    // Where it meets the ground it flattens. Load-bearing, and it shows.
    const [fx, fy] = pts[pts.length - 1];
    g.fillStyle = BASE;
    g.beginPath(); g.ellipse(fx, fy - H * 0.004, W * 0.013, H * 0.004, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath(); g.ellipse(fx, fy, W * 0.020, H * 0.005, 0, 0, 7); g.fill();
  }

  // The mass. Not smooth: a hide pulled tight over ribs that run the wrong
  // way, and a sheen only on the upper third.
  g.save();
  g.beginPath();
  g.ellipse(cx, H * 0.40, W * 0.073, H * 0.083, 0, 0, 7);
  g.clip();
  const body = g.createLinearGradient(cx - W * 0.07, H * 0.33, cx + W * 0.05, H * 0.48);
  body.addColorStop(0, '#20232a');
  body.addColorStop(0.5, '#0e1013');
  body.addColorStop(1, '#050506');
  g.fillStyle = body;
  g.fillRect(cx - W * 0.09, H * 0.30, W * 0.19, H * 0.20);
  // Vertical ribbing. On a body slung horizontally, that is the wrong axis.
  g.strokeStyle = 'rgba(0,0,0,0.55)';
  g.lineWidth = Math.max(0.7, W * 0.0035);
  for (let i = -4; i <= 4; i++) {
    const x = cx + i * W * 0.016;
    g.beginPath();
    g.moveTo(x, H * 0.320);
    g.quadraticCurveTo(x + W * 0.006, H * 0.400, x, H * 0.485);
    g.stroke();
  }
  g.restore();

  // The neck: taut, and the hide creases against the direction of the bend.
  const neck = arc(cx, H * 0.36, cx - W * 0.035, H * 0.10, 0.06, 14);
  sheen(g, neck, W * 0.007, 0.15, '186,198,214');
  g.strokeStyle = 'rgba(0,0,0,0.5)';
  g.lineWidth = Math.max(0.6, W * 0.003);
  for (let i = 2; i < neck.length - 1; i += 2) {
    const [x, y] = neck[i];
    g.beginPath();
    g.moveTo(x - W * 0.016, y + H * 0.004);
    g.quadraticCurveTo(x, y - H * 0.003, x + W * 0.016, y + H * 0.004);
    g.stroke();
  }

  // The head, barely: a jaw line and no eye anywhere on it.
  g.strokeStyle = 'rgba(150,162,178,0.22)';
  g.lineWidth = Math.max(0.7, W * 0.004);
  g.beginPath();
  g.ellipse(cx - W * 0.035, H * 0.095, W * 0.028, H * 0.024, -0.25, Math.PI * 0.9, Math.PI * 1.9);
  g.stroke();

  /* ---- THE BRIGHT WRONG DETAIL ----
   * A row of nine small pale points along the underside of the mass, evenly
   * spaced, hard-edged, and wet. They are the only bright thing on it. They
   * are not eyes — they are on the belly, they are in a straight line, and
   * they are identical, which no eyes are. Nothing in the game says what
   * they are for. */
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    wrongDetail(g, cx - W * 0.058 + t * W * 0.116,
                H * 0.478 + Math.sin(t * Math.PI) * H * 0.004,
                W * 0.0058, '#D9CFB4');
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

function incursionSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  const cx = W * 0.52;

  // Torso: narrow, tall, shoulders that are too high and too level.
  g.beginPath();
  g.moveTo(cx - W * 0.085, H * 0.30);
  g.lineTo(cx + W * 0.085, H * 0.30);
  g.lineTo(cx + W * 0.105, H * 1.00);
  g.lineTo(cx - W * 0.105, H * 1.00);
  g.closePath();
  g.fill();

  // Neck.
  limb(g, arc(cx, H * 0.30, cx, H * 0.19, 0, 6), W * 0.026, W * 0.022);

  // The reaching arm — along the wall, not toward you.
  const reach = arc(cx - W * 0.07, H * 0.34, cx - W * 0.44, H * 0.20, -0.10, 16);
  limb(g, reach, W * 0.024, W * 0.008);

  // The hand: splayed, twig-fingered, and one joint too many.
  const [hx, hy] = reach[reach.length - 1];
  for (let i = 0; i < 5; i++) {
    const a = -0.95 + i * 0.36;
    const fx = hx - Math.cos(a) * W * 0.115;
    const fy = hy + Math.sin(a) * H * 0.075;
    limb(g, arc(hx, hy, fx, fy, 0.12, 8), W * 0.0075, W * 0.0016);
  }

  // The far arm, hanging, mostly lost in the body.
  limb(g, arc(cx + W * 0.075, H * 0.34, cx + W * 0.135, H * 0.66, -0.06, 10), W * 0.020, W * 0.010);
}

function incursionDetail(g, W, H) {
  const cx = W * 0.52;
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

  // The mouth is a line. It is not a smile. That is the Pathogen's — and
  // the Pathogen does not have one either.
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

  /* The body. Not a rectangle: something that hangs, with folds in it, and
   * the folds catch the flash unevenly the way cloth does and metal does
   * not. It is the only part of it that suggests how it moves. */
  g.save();
  g.beginPath();
  g.moveTo(cx - W * 0.088, H * 0.29);
  g.lineTo(cx + W * 0.088, H * 0.29);
  g.lineTo(cx + W * 0.110, H * 1.00);
  g.lineTo(cx - W * 0.110, H * 1.00);
  g.closePath();
  g.clip();
  for (let i = 0; i < 9; i++) {
    const t = i / 8;
    const x = cx - W * 0.082 + t * W * 0.164;
    g.strokeStyle = `rgba(148,154,148,${0.05 + Math.random() * 0.07})`;
    g.lineWidth = Math.max(0.8, W * 0.004);
    g.beginPath();
    g.moveTo(x, H * 0.31);
    g.bezierCurveTo(x + W * 0.014, H * 0.52, x - W * 0.012, H * 0.74, x + W * 0.006, H * 1.00);
    g.stroke();
  }
  g.restore();

  // A rim of light down one edge of the body, from a doorway behind it.
  g.strokeStyle = 'rgba(190,196,186,0.30)';
  g.lineWidth = Math.max(1, W * 0.008);
  g.beginPath();
  g.moveTo(cx + W * 0.085, H * 0.31);
  g.lineTo(cx + W * 0.105, H * 0.99);
  g.stroke();
}

/* ================================================================== */
/* ANGUISH                                                             */
/*                                                                     */
/* Red, hard-surfaced — flesh-coloured but not fleshy. Extremely fast.  */
/* Rare. This is the only entity that ever gets a clean look, and       */
/* looking at it is the loss condition.                                 */
/*                                                                     */
/* The horns are the silhouette. Everything else is thin.               */
/* ================================================================== */

function anguishSilhouette(g, W, H) {
  g.fillStyle = '#000000';
  const cx = W * 0.5;

  // Head: long, tapering down to a narrow jaw.
  g.beginPath();
  g.moveTo(cx - W * 0.070, H * 0.145);
  g.quadraticCurveTo(cx, H * 0.075, cx + W * 0.070, H * 0.145);
  g.quadraticCurveTo(cx + W * 0.052, H * 0.290, cx, H * 0.330);
  g.quadraticCurveTo(cx - W * 0.052, H * 0.290, cx - W * 0.070, H * 0.145);
  g.fill();

  // The horns. Heavy at the root, curving up and out and back in.
  for (const s of [-1, 1]) {
    limb(g, arc(cx + s * W * 0.055, H * 0.150,
                cx + s * W * 0.175, H * 0.010, s * 0.30, 14), W * 0.030, W * 0.006);
  }

  // Neck and ribbed torso.
  limb(g, arc(cx, H * 0.320, cx, H * 0.430, 0, 6), W * 0.030, W * 0.052);
  g.beginPath();
  g.moveTo(cx - W * 0.058, H * 0.420);
  g.quadraticCurveTo(cx - W * 0.075, H * 0.620, cx - W * 0.040, H * 0.760);
  g.lineTo(cx + W * 0.040, H * 0.760);
  g.quadraticCurveTo(cx + W * 0.075, H * 0.620, cx + W * 0.058, H * 0.420);
  g.fill();

  // Arms and legs: thin, long, and hanging wrong.
  for (const s of [-1, 1]) {
    limb(g, arc(cx + s * W * 0.055, H * 0.450, cx + s * W * 0.150, H * 0.760, s * 0.14, 12), W * 0.017, W * 0.006);
    limb(g, arc(cx + s * W * 0.032, H * 0.745, cx + s * W * 0.062, H * 1.000, -s * 0.05, 10), W * 0.020, W * 0.009);
  }
}

function anguishDetail(g, W, H) {
  const cx = W * 0.5;

  // Red. Hard-surfaced. Lit flat and badly, the way a flash lights a wall.
  const grad = g.createLinearGradient(cx - W * 0.2, 0, cx + W * 0.2, H);
  grad.addColorStop(0, '#8e2019');
  grad.addColorStop(0.45, '#a82b21');
  grad.addColorStop(1, '#5c1512');
  g.fillStyle = grad;

  g.beginPath();
  g.moveTo(cx - W * 0.064, H * 0.150);
  g.quadraticCurveTo(cx, H * 0.085, cx + W * 0.064, H * 0.150);
  g.quadraticCurveTo(cx + W * 0.047, H * 0.285, cx, H * 0.322);
  g.quadraticCurveTo(cx - W * 0.047, H * 0.285, cx - W * 0.064, H * 0.150);
  g.fill();

  g.beginPath();
  g.moveTo(cx - W * 0.052, H * 0.425);
  g.quadraticCurveTo(cx - W * 0.068, H * 0.620, cx - W * 0.035, H * 0.752);
  g.lineTo(cx + W * 0.035, H * 0.752);
  g.quadraticCurveTo(cx + W * 0.068, H * 0.620, cx + W * 0.052, H * 0.425);
  g.fill();

  for (const s of [-1, 1]) {
    g.fillStyle = '#8e2019';
    limb(g, arc(cx + s * W * 0.050, H * 0.152, cx + s * W * 0.166, H * 0.020, s * 0.30, 14), W * 0.024, W * 0.005);
  }

  /* §3.4. HARD-SURFACED. Wet-looking without being fleshy — which means
   * specular, not glistening: sharp bright edges where a hard shell catches
   * the light, and no subsurface softness anywhere. */

  // Ribbing across the torso. Segmented, regular, and not like bone. Each
  // ridge is RAISED: a shadow under it and a hard highlight on top of it.
  for (let i = 0; i < 8; i++) {
    const y = H * (0.462 + i * 0.037);
    g.strokeStyle = 'rgba(38,7,6,0.72)';
    g.lineWidth = Math.max(1, W * 0.0055);
    g.beginPath();
    g.moveTo(cx - W * 0.048, y + H * 0.004);
    g.quadraticCurveTo(cx, y + H * 0.018, cx + W * 0.048, y + H * 0.004);
    g.stroke();
    g.strokeStyle = 'rgba(255,198,178,0.20)';
    g.lineWidth = Math.max(0.8, W * 0.0028);
    g.beginPath();
    g.moveTo(cx - W * 0.044, y);
    g.quadraticCurveTo(cx, y + H * 0.013, cx + W * 0.044, y);
    g.stroke();
  }

  // Facets on the skull. A hard shell breaks into planes; flesh does not.
  g.strokeStyle = 'rgba(46,9,8,0.45)';
  g.lineWidth = Math.max(0.7, W * 0.003);
  for (const [ax, ay, bx, by] of [
    [-0.052, 0.168, -0.014, 0.262], [0.052, 0.168, 0.014, 0.262],
    [-0.030, 0.120, -0.008, 0.196], [0.030, 0.120, 0.008, 0.196],
  ]) {
    g.beginPath();
    g.moveTo(cx + W * ax, H * ay);
    g.lineTo(cx + W * bx, H * by);
    g.stroke();
  }
  // The specular edge along the left cheek and down the jaw. One stroke,
  // hard, and it is what says "this is not skin".
  g.strokeStyle = 'rgba(255,214,196,0.42)';
  g.lineWidth = Math.max(1, W * 0.0045);
  g.beginPath();
  g.moveTo(cx - W * 0.058, H * 0.164);
  g.quadraticCurveTo(cx - W * 0.048, H * 0.256, cx - W * 0.006, H * 0.314);
  g.stroke();

  // Where the arms leave the torso the shell is stretched pale over it.
  for (const s of [-1, 1]) {
    joint(g, cx + s * W * 0.055, H * 0.452, W * 0.017, '#8e2019', '#d0796a');
    joint(g, cx + s * W * 0.108, H * 0.612, W * 0.011, '#7d1c16', '#c06e60');
  }

  /* ---- THE EYES, WHICH ARE THE BRIGHT WRONG DETAIL ----
   *
   * Not dots. A pale sclera with no iris at all — a black aperture in a
   * white field, ringed by a hard rim, wet at the edge. There are FOUR, in
   * two vertical pairs, and the lower pair is smaller and it is closed, and
   * nothing about the arrangement is symmetrical enough to be a design or
   * asymmetrical enough to be damage.
   *
   * This is the one image in the game where the subject is fully sharp,
   * because the officer who took it could not look away. So these have to
   * survive being looked at. */
  for (const s of [-1, 1]) {
    const ex = cx + s * W * 0.028, ey = H * 0.183;
    // The socket: a recess, so the eye sits IN the head.
    g.fillStyle = 'rgba(34,6,6,0.85)';
    g.beginPath(); g.ellipse(ex, ey, W * 0.027, H * 0.022, 0, 0, 7); g.fill();
    // Sclera, and it is bone-coloured rather than white.
    g.fillStyle = '#ddd4c6';
    g.beginPath(); g.ellipse(ex, ey, W * 0.021, H * 0.0165, 0, 0, 7); g.fill();
    // The aperture. No iris. Just an opening, and it is a vertical slit
    // rather than a circle, and it is very slightly off-centre.
    g.fillStyle = '#080706';
    g.beginPath();
    g.ellipse(ex + s * W * 0.002, ey + H * 0.001, W * 0.0055, H * 0.013, 0, 0, 7);
    g.fill();
    // Wet at the rim: two small hard speculars, which is what a wet edge
    // does under a flash.
    g.fillStyle = 'rgba(255,255,255,0.88)';
    g.beginPath(); g.ellipse(ex - W * 0.010, ey - H * 0.006, W * 0.004, H * 0.0028, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,246,236,0.45)';
    g.beginPath(); g.ellipse(ex + W * 0.011, ey + H * 0.005, W * 0.0028, H * 0.0020, 0, 0, 7); g.fill();

    // The second pair, below, smaller, and shut. Nothing explains them.
    const fy = H * 0.226;
    g.fillStyle = 'rgba(30,5,5,0.75)';
    g.beginPath(); g.ellipse(ex + s * W * 0.004, fy, W * 0.014, H * 0.008, 0, 0, 7); g.fill();
    g.strokeStyle = 'rgba(214,168,150,0.40)';
    g.lineWidth = Math.max(0.6, W * 0.0022);
    g.beginPath();
    g.moveTo(ex + s * W * 0.004 - W * 0.012, fy);
    g.quadraticCurveTo(ex + s * W * 0.004, fy + H * 0.004, ex + s * W * 0.004 + W * 0.012, fy);
    g.stroke();
  }
}

/* ================================================================== */
/* THE PATHOGEN                                                        */
/*                                                                     */
/* NEVER RENDERED IN THE WORLD. It has no physical form. This asset     */
/* exists only for the surface it manifests on — a screen — and it is   */
/* used exactly once, on the bad ending, behind heavy signal damage.    */
/* ================================================================== */

/**
 * §3.4. It is rendered BY A DISPLAY, so it is sharp and it is made of the
 * things a display is made of. Not a face: an interpolation of one.
 *
 * The previous version was a white egg with two dots and a red curve, which
 * is a smiley, which is funny. What is here now has no mouth at all — the
 * feature where a mouth would be is a horizontal tear in the scan, and the
 * red is not on the face, it is a channel that has come apart. The thing
 * looking out is doing it with a geometry that is nearly right.
 */
function pathogenFace(g, W, H) {
  const cx = W * 0.5;

  // Black shoulders. No arms — there is nothing to reach with.
  g.fillStyle = '#050507';
  g.beginPath();
  g.moveTo(cx - W * 0.34, H * 1.00);
  g.quadraticCurveTo(cx, H * 0.66, cx + W * 0.34, H * 1.00);
  g.closePath();
  g.fill();

  // Neck: a column rather than a throat, and it does not taper the way a
  // neck tapers.
  const neck = g.createLinearGradient(cx - W * 0.10, 0, cx + W * 0.10, 0);
  neck.addColorStop(0, '#6e6f74');
  neck.addColorStop(0.35, '#b9bcc2');
  neck.addColorStop(0.62, '#8e9096');
  neck.addColorStop(1, '#4c4d52');
  g.fillStyle = neck;
  g.beginPath();
  g.moveTo(cx - W * 0.078, H * 0.42);
  g.lineTo(cx + W * 0.078, H * 0.42);
  g.lineTo(cx + W * 0.098, H * 0.82);
  g.lineTo(cx - W * 0.098, H * 0.82);
  g.closePath();
  g.fill();

  /* The head. Modelled, not flat: a brow, a nose ridge, a jaw, and a
   * temple — all of them in the right places and none of them the right
   * shape. This is what makes it read as almost-a-face. */
  g.save();
  g.beginPath();
  g.ellipse(cx, H * 0.30, W * 0.140, H * 0.170, 0, 0, 7);
  g.clip();

  const skull = g.createRadialGradient(cx - W * 0.05, H * 0.24, 0, cx, H * 0.31, W * 0.20);
  skull.addColorStop(0, '#d6d8dc');
  skull.addColorStop(0.55, '#a9abb1');
  skull.addColorStop(1, '#5c5d62');
  g.fillStyle = skull;
  g.fillRect(cx - W * 0.2, H * 0.10, W * 0.4, H * 0.42);

  // The brow, as a shadow rather than a line.
  g.fillStyle = 'rgba(24,25,29,0.34)';
  g.beginPath();
  g.moveTo(cx - W * 0.13, H * 0.252);
  g.quadraticCurveTo(cx, H * 0.222, cx + W * 0.13, H * 0.252);
  g.quadraticCurveTo(cx, H * 0.268, cx - W * 0.13, H * 0.252);
  g.fill();

  // The nose ridge: a highlight with no nostrils under it.
  g.strokeStyle = 'rgba(238,240,244,0.34)';
  g.lineWidth = Math.max(1, W * 0.010);
  g.beginPath();
  g.moveTo(cx + W * 0.002, H * 0.262);
  g.lineTo(cx - W * 0.004, H * 0.348);
  g.stroke();

  // Cheekbone shadows, symmetrical to a degree faces are not.
  for (const s of [-1, 1]) {
    g.fillStyle = 'rgba(28,29,33,0.20)';
    g.beginPath();
    g.ellipse(cx + s * W * 0.088, H * 0.330, W * 0.038, H * 0.048, s * 0.4, 0, 7);
    g.fill();
  }

  /* The eyes. Sockets with something recessed in them, and a pale ring
   * where the sclera should be — so they are not dots, they have depth, and
   * they are not looking at the camera by a couple of degrees. */
  for (const s of [-1, 1]) {
    const ex = cx + s * W * 0.056, ey = H * 0.272;
    g.fillStyle = 'rgba(14,15,18,0.85)';
    g.beginPath(); g.ellipse(ex, ey, W * 0.034, H * 0.024, s * 0.10, 0, 7); g.fill();
    g.fillStyle = '#c8c4bc';
    g.beginPath(); g.ellipse(ex + s * W * 0.004, ey + H * 0.001, W * 0.022, H * 0.015, 0, 0, 7); g.fill();
    g.fillStyle = '#07070a';
    // Both pupils point a few degrees to the same side of the lens.
    g.beginPath(); g.ellipse(ex + W * 0.007, ey + H * 0.001, W * 0.009, H * 0.010, 0, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.55)';
    g.beginPath(); g.ellipse(ex + W * 0.002, ey - H * 0.005, W * 0.004, H * 0.003, 0, 0, 7); g.fill();
  }

  /* WHERE THE MOUTH IS NOT. A horizontal displacement in the scan — the
   * rows below this line are shifted, as if the image had come apart at
   * that height. There is no mouth. There has never been a mouth. */
  const tearY = H * 0.372;
  const strip = g.getImageData(cx - W * 0.14, tearY, W * 0.28, H * 0.030);
  g.fillStyle = '#0a0b0e';
  g.fillRect(cx - W * 0.14, tearY, W * 0.28, H * 0.030);
  g.putImageData(strip, cx - W * 0.14 + W * 0.026, tearY);
  g.strokeStyle = 'rgba(6,7,9,0.85)';
  g.lineWidth = Math.max(1, W * 0.004);
  g.beginPath();
  g.moveTo(cx - W * 0.135, tearY); g.lineTo(cx + W * 0.135, tearY); g.stroke();

  g.restore();

  /* THE BRIGHT WRONG DETAIL, and it is not on the thing. It is a channel
   * failure: one line of red running down out of the tear and along the
   * neck, at exactly one-pixel accuracy, which is not how blood behaves and
   * is exactly how a broken chroma channel behaves. */
  g.strokeStyle = 'rgba(196,32,26,0.92)';
  g.lineWidth = Math.max(1, W * 0.006);
  g.beginPath();
  g.moveTo(cx + W * 0.012, H * 0.386);
  g.lineTo(cx + W * 0.012, H * 0.760);
  g.stroke();
  g.strokeStyle = 'rgba(196,32,26,0.30)';
  g.lineWidth = Math.max(1, W * 0.016);
  g.beginPath();
  g.moveTo(cx + W * 0.012, H * 0.386);
  g.lineTo(cx + W * 0.012, H * 0.700);
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
  anguish:   { sil: anguishSilhouette,   detail: anguishDetail,    aspect: 0.60, haze: 0.22 },
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
