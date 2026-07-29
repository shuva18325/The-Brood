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

/* ================================================================== */
/* THE TORMENTOR                                                       */
/*                                                                     */
/* Long, slim, black, horned. Too many legs, all of them too thin for  */
/* the mass above them. Reads entirely as silhouette — there is no      */
/* detail layer worth speaking of, and that is correct.                */
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

  // Eye holes: black, almond, too far apart, and not looking at you.
  g.fillStyle = '#050506';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + s * mw * 0.42, my - mh * 0.12, mw * 0.20, mh * 0.16, s * 0.18, 0, 7);
    g.fill();
  }

  // The mouth is a line. It is not a smile. That is the Pathogen's.
  g.strokeStyle = '#1a1a1c';
  g.lineWidth = Math.max(1, W * 0.006);
  g.beginPath();
  g.moveTo(cx - mw * 0.28, my + mh * 0.44);
  g.lineTo(cx + mw * 0.30, my + mh * 0.40);
  g.stroke();

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

  // Ribbing across the torso. Segmented, regular, and not like bone.
  g.strokeStyle = 'rgba(52,10,9,0.65)';
  g.lineWidth = Math.max(1, W * 0.005);
  for (let i = 0; i < 7; i++) {
    const y = H * (0.470 + i * 0.040);
    g.beginPath();
    g.moveTo(cx - W * 0.048, y);
    g.quadraticCurveTo(cx, y + H * 0.014, cx + W * 0.048, y);
    g.stroke();
  }

  // The eyes. Wide, pale, and open in a way nothing on this coast is.
  for (const s of [-1, 1]) {
    g.fillStyle = '#d8cfc4';
    g.beginPath();
    g.ellipse(cx + s * W * 0.028, H * 0.185, W * 0.021, H * 0.017, 0, 0, 7);
    g.fill();
    g.fillStyle = '#0b0908';
    g.beginPath();
    g.ellipse(cx + s * W * 0.030, H * 0.187, W * 0.010, H * 0.011, 0, 0, 7);
    g.fill();
  }
}

/* ================================================================== */
/* THE PATHOGEN                                                        */
/*                                                                     */
/* NEVER RENDERED IN THE WORLD. It has no physical form. This asset     */
/* exists only for the surface it manifests on — a screen — and it is   */
/* used exactly once, on the bad ending, behind heavy signal damage.    */
/* ================================================================== */

function pathogenFace(g, W, H) {
  const cx = W * 0.5;

  // Black shoulders. No arms — there is nothing to reach with.
  g.fillStyle = '#050507';
  g.beginPath();
  g.moveTo(cx - W * 0.34, H * 1.00);
  g.quadraticCurveTo(cx, H * 0.66, cx + W * 0.34, H * 1.00);
  g.closePath();
  g.fill();

  // Neck: long, pale, and a column rather than a throat.
  const neck = g.createLinearGradient(cx - W * 0.09, 0, cx + W * 0.09, 0);
  neck.addColorStop(0, '#b9b3aa');
  neck.addColorStop(0.4, '#efeae2');
  neck.addColorStop(1, '#9d968c');
  g.fillStyle = neck;
  g.beginPath();
  g.moveTo(cx - W * 0.075, H * 0.42);
  g.lineTo(cx + W * 0.075, H * 0.42);
  g.lineTo(cx + W * 0.095, H * 0.82);
  g.lineTo(cx - W * 0.095, H * 0.82);
  g.closePath();
  g.fill();

  // Head: an egg, too smooth, no features but the two that matter.
  g.beginPath();
  g.ellipse(cx, H * 0.30, W * 0.135, H * 0.165, 0, 0, 7);
  g.fill();

  // Eyes: small, black, curved down. Almost nothing.
  g.fillStyle = '#0a0a0c';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + s * W * 0.052, H * 0.268, W * 0.026, H * 0.013, s * 0.30, 0, 7);
    g.fill();
  }

  // The smile. Red, wide, and the only saturated thing in the frame.
  g.strokeStyle = '#a81b17';
  g.lineWidth = Math.max(2, W * 0.030);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(cx - W * 0.085, H * 0.330);
  g.quadraticCurveTo(cx, H * 0.430, cx + W * 0.085, H * 0.330);
  g.stroke();

  // And it runs down the throat, which is the part nobody describes.
  g.strokeStyle = 'rgba(168,27,23,0.85)';
  g.lineWidth = Math.max(1, W * 0.016);
  g.beginPath();
  g.moveTo(cx, H * 0.400);
  g.quadraticCurveTo(cx + W * 0.018, H * 0.560, cx, H * 0.700);
  g.stroke();
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
  tormentor: { sil: tormentorSilhouette, detail: null,             aspect: 0.62, haze: 0.55 },
  incursion: { sil: incursionSilhouette, detail: incursionDetail,  aspect: 0.70, haze: 0.30 },
  anguish:   { sil: anguishSilhouette,   detail: anguishDetail,    aspect: 0.60, haze: 0.22 },
  pathogen:  { sil: null,                detail: pathogenFace,     aspect: 0.80, haze: 0.10 },
  crawler:   { sil: crawlerSilhouette,   detail: null,             aspect: 1.30, haze: 0.45 },
  gleaner:   { sil: gleanerSilhouette,   detail: null,             aspect: 0.80, haze: 0.45 },
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
