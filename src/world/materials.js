/**
 * materials.js — procedural textures from a 2D canvas. No external files.
 *
 * Everything in this apartment was bought second-hand or came with the
 * place. Nothing matches. Nothing was chosen. The textures should carry
 * that on their own, before a single light is turned on.
 */

import * as THREE from 'three';

const cache = new Map();

function canvas(size, draw, h) {
  const c = document.createElement('canvas');
  c.width = size; c.height = h || size;
  const g = c.getContext('2d');
  draw(g, size, h || size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function grain(g, w, h, amount, dark = 0) {
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount - dark;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

/** Chips at the corners, where a landlord's paint always goes first. */
function chips(g, w, h, count, under) {
  for (let i = 0; i < count; i++) {
    const x = Math.random() < 0.5 ? Math.random() * w * 0.09 : w - Math.random() * w * 0.09;
    const y = Math.random() * h;
    g.fillStyle = under;
    g.beginPath();
    g.ellipse(x, y, 2 + Math.random() * 7, 2 + Math.random() * 5, Math.random() * 3, 0, 7);
    g.fill();
  }
}

const TEX = {
  /* Landlord white over an older colour. The older colour is a bad green. */
  wall: () => canvas(512, (g, s) => {
    g.fillStyle = '#c8c3b6'; g.fillRect(0, 0, s, s);
    // roller marks — a wall painted quickly, by someone not being paid well
    for (let i = 0; i < 44; i++) {
      g.fillStyle = `rgba(${186 + Math.random() * 18 | 0},${182 + Math.random() * 16 | 0},${170 + Math.random() * 14 | 0},0.5)`;
      g.fillRect(Math.random() * s, Math.random() * s, 10 + Math.random() * 46, 30 + Math.random() * 130);
    }
    // scuffs at chair-back height
    for (let i = 0; i < 14; i++) {
      g.fillStyle = 'rgba(120,114,104,0.22)';
      g.fillRect(Math.random() * s, s * 0.55 + Math.random() * s * 0.1, 12 + Math.random() * 60, 2 + Math.random() * 5);
    }
    chips(g, s, s, 46, '#8e9481');   // the green underneath
    grain(g, s, s, 16);
  }),

  /* A patched water stain near the kitchen. Painted over. Came back. */
  wallStained: () => canvas(512, (g, s) => {
    g.fillStyle = '#c4bfb1'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = `rgba(${182 + Math.random() * 18 | 0},${178 + Math.random() * 16 | 0},${166 + Math.random() * 14 | 0},0.5)`;
      g.fillRect(Math.random() * s, Math.random() * s, 10 + Math.random() * 44, 30 + Math.random() * 120);
    }
    // The stain: concentric tide-lines, the way water actually dries.
    for (let r = 0; r < 5; r++) {
      g.strokeStyle = `rgba(${150 - r * 9},${138 - r * 10},${112 - r * 8},${0.30 - r * 0.045})`;
      g.lineWidth = 5 + r * 3;
      g.beginPath();
      g.ellipse(s * 0.62, s * 0.20, s * (0.10 + r * 0.045), s * (0.055 + r * 0.028), 0.3, 0, 7);
      g.stroke();
    }
    g.fillStyle = 'rgba(146,134,108,0.16)';
    g.beginPath(); g.ellipse(s * 0.62, s * 0.20, s * 0.13, s * 0.07, 0.3, 0, 7); g.fill();
    chips(g, s, s, 40, '#8e9481');
    grain(g, s, s, 16);
  }),

  /* Bathroom tile, and the grout has not been white since 2011. */
  tile: () => canvas(256, (g, s) => {
    g.fillStyle = '#6f736c'; g.fillRect(0, 0, s, s);
    const n = 6, t = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = 138 + Math.random() * 22;
      g.fillStyle = `rgb(${v | 0},${v + 4 | 0},${v - 6 | 0})`;
      g.fillRect(x * t + 2, y * t + 2, t - 4, t - 4);
      if (Math.random() < 0.12) {           // a cracked one, never replaced
        g.strokeStyle = 'rgba(60,58,54,0.6)'; g.lineWidth = 1.5;
        g.beginPath(); g.moveTo(x * t + 4, y * t + 4);
        g.lineTo(x * t + t - 6, y * t + t * 0.6); g.stroke();
      }
    }
    grain(g, s, s, 14, 6);
  }),

  /* Artex, painted over twice. The stipple has to stay low-contrast: a
   * ceiling is lit at a grazing angle and a noisy height field up there
   * turns into television snow the moment any light reaches it. */
  ceiling: () => canvas(256, (g, s) => {
    g.fillStyle = '#a7a498'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 620; i++) {
      g.fillStyle = `rgba(${150 + Math.random() * 24 | 0},${148 + Math.random() * 22 | 0},${138 + Math.random() * 20 | 0},0.13)`;
      g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 2 + Math.random() * 5, 0, 7); g.fill();
    }
    // The long brown bloom over the kitchen end. It is not going to be dealt with.
    for (let r = 0; r < 4; r++) {
      g.strokeStyle = `rgba(${142 - r * 8},${128 - r * 9},${104 - r * 8},${0.13 - r * 0.024})`;
      g.lineWidth = 8 + r * 6;
      g.beginPath();
      g.ellipse(s * 0.30, s * 0.66, s * (0.09 + r * 0.05), s * (0.05 + r * 0.03), 0.7, 0, 7);
      g.stroke();
    }
    grain(g, s, s, 8, 3);
  }),

  /* Worn laminate. Seams visible. One edge lifted, near the door. */
  laminate: () => canvas(512, (g, s) => {
    g.fillStyle = '#6b5744'; g.fillRect(0, 0, s, s);
    const planks = 5, ph = s / planks;
    for (let i = 0; i < planks; i++) {
      const v = 86 + Math.random() * 26;
      g.fillStyle = `rgb(${v + 26 | 0},${v | 0},${v - 20 | 0})`;
      g.fillRect(0, i * ph, s, ph - 1);
      // printed grain — it is a photograph of wood, and it repeats
      for (let k = 0; k < 8; k++) {
        g.strokeStyle = `rgba(${52 + Math.random() * 26 | 0},38,26,${0.13 + Math.random() * 0.16})`;
        g.lineWidth = 0.8 + Math.random() * 2;
        const y = i * ph + Math.random() * ph;
        g.beginPath(); g.moveTo(0, y);
        g.bezierCurveTo(s * 0.3, y + 5, s * 0.6, y - 5, s, y + 2);
        g.stroke();
      }
      // the seam
      g.strokeStyle = 'rgba(18,12,8,0.85)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, i * ph); g.lineTo(s, i * ph); g.stroke();
      // butt joints, staggered
      const jx = (i * 137) % s;
      g.beginPath(); g.moveTo(jx, i * ph); g.lineTo(jx, i * ph + ph); g.stroke();
    }
    // the traffic path, worn pale, between the mat and the desk
    g.fillStyle = 'rgba(180,168,150,0.10)';
    g.beginPath(); g.ellipse(s * 0.5, s * 0.5, s * 0.34, s * 0.16, 0.5, 0, 7); g.fill();
    grain(g, s, s, 18, 6);
  }),

  lino: () => canvas(256, (g, s) => {
    g.fillStyle = '#8a8672'; g.fillRect(0, 0, s, s);
    const n = 4, t = s / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const v = 128 + ((x + y) % 2) * 12 + Math.random() * 14;
      g.fillStyle = `rgb(${v | 0},${v - 2 | 0},${v - 16 | 0})`;
      g.fillRect(x * t, y * t, t, t);
    }
    g.strokeStyle = 'rgba(52,50,42,0.5)'; g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * t, 0); g.lineTo(i * t, s); g.stroke();
      g.beginPath(); g.moveTo(0, i * t); g.lineTo(s, i * t); g.stroke();
    }
    // burns and lifted corners near where a hotplate lives
    for (let i = 0; i < 5; i++) {
      g.fillStyle = 'rgba(48,40,30,0.35)';
      g.beginPath(); g.arc(Math.random() * s, Math.random() * s, 4 + Math.random() * 10, 0, 7); g.fill();
    }
    grain(g, s, s, 20, 10);
  }),

  asphalt: () => canvas(256, (g, s) => {
    g.fillStyle = '#191b1f'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 1400; i++) {
      g.fillStyle = `rgba(${34 + Math.random() * 42 | 0},${36 + Math.random() * 42 | 0},${40 + Math.random() * 44 | 0},0.55)`;
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    // a tar-sealed crack, the way roads are actually repaired
    g.strokeStyle = 'rgba(12,12,14,0.9)'; g.lineWidth = 4;
    g.beginPath(); g.moveTo(0, s * 0.4);
    g.bezierCurveTo(s * 0.3, s * 0.35, s * 0.6, s * 0.5, s, s * 0.42); g.stroke();
    grain(g, s, s, 12, 4);
  }),

  pavement: () => canvas(256, (g, s) => {
    g.fillStyle = '#4c4d49'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(30,30,28,0.7)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke();
    }
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(${70 + Math.random() * 30 | 0},${70 + Math.random() * 28 | 0},${66 + Math.random() * 26 | 0},0.4)`;
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    grain(g, s, s, 14, 8);
  }),

  brick: () => canvas(512, (g, s) => {
    g.fillStyle = '#2e2a28'; g.fillRect(0, 0, s, s);
    const rows = 14, bh = s / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (s / 8);
      for (let c = -1; c < 5; c++) {
        const v = 52 + Math.random() * 26;
        g.fillStyle = `rgb(${v + 16 | 0},${v - 3 | 0},${v - 11 | 0})`;
        g.fillRect(c * s / 4 + off + 3, r * bh + 3, s / 4 - 6, bh - 6);
      }
    }
    // efflorescence and a downpipe stain
    g.fillStyle = 'rgba(160,158,150,0.10)';
    g.beginPath(); g.ellipse(s * 0.25, s * 0.7, s * 0.16, s * 0.28, 0, 0, 7); g.fill();
    grain(g, s, s, 18, 12);
  }),

  paintBlue: () => canvas(256, (g, s) => {
    g.fillStyle = '#3f4f58'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = 'rgba(26,32,38,0.36)';
      g.fillRect(Math.random() * s, Math.random() * s, 3 + Math.random() * 22, 2 + Math.random() * 10);
    }
    // clapboard shadow lines
    g.strokeStyle = 'rgba(18,22,26,0.55)'; g.lineWidth = 2;
    for (let y = 0; y < s; y += s / 12) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); }
    grain(g, s, s, 16, 8);
  }),

  /* Rain streaks on transparent black, tiled. Weather, seen through bars. */
  rain: () => canvas(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const len = 14 + Math.random() * 40;
      g.strokeStyle = `rgba(206,214,222,${0.05 + Math.random() * 0.16})`;
      g.lineWidth = 0.6 + Math.random() * 0.9;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + 3 + Math.random() * 3, y + len);
      g.stroke();
    }
  }),

  /* A curtain that came with the place, in a colour nobody picked. */
  curtain: () => canvas(256, (g, s) => {
    g.fillStyle = '#4a3d38'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 3) {
      const v = 52 + Math.sin(i * 0.16) * 14 + Math.random() * 10;
      g.fillStyle = `rgba(${v + 14 | 0},${v | 0},${v - 6 | 0},0.55)`;
      g.fillRect(i, 0, 2, s);
    }
    // faded where the sun has been hitting it for years
    const grd = g.createLinearGradient(0, 0, 0, s);
    grd.addColorStop(0, 'rgba(150,132,110,0.14)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    grain(g, s, s, 12, 4);
  }),

  /* Bars painted over many times, with rust bleeding through at the bolts. */
  barMetal: () => canvas(128, (g, s) => {
    g.fillStyle = '#3b3d3c'; g.fillRect(0, 0, s, s);
    // successive coats, each a slightly different colour
    for (const [c, a] of [['#4a4c46', 0.5], ['#3f4340', 0.4], ['#54524a', 0.3]]) {
      g.fillStyle = c; g.globalAlpha = a;
      for (let i = 0; i < 24; i++) {
        g.fillRect(Math.random() * s, Math.random() * s, 4 + Math.random() * 30, 3 + Math.random() * 18);
      }
    }
    g.globalAlpha = 1;
    // rust, blooming outward from where the bolts are
    for (let i = 0; i < 7; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const r = g.createRadialGradient(x, y, 0, x, y, 6 + Math.random() * 16);
      r.addColorStop(0, 'rgba(126,64,28,0.75)');
      r.addColorStop(0.5, 'rgba(104,54,26,0.35)');
      r.addColorStop(1, 'rgba(90,48,24,0)');
      g.fillStyle = r; g.fillRect(0, 0, s, s);
    }
    grain(g, s, s, 20, 6);
  }),

  /* Beige-going-yellow. Every cheap computer and every cheap appliance. */
  beige: () => canvas(128, (g, s) => {
    g.fillStyle = '#b3ac96'; g.fillRect(0, 0, s, s);
    const grd = g.createLinearGradient(0, 0, s, s);
    grd.addColorStop(0, 'rgba(196,182,140,0.55)');   // sun-yellowed
    grd.addColorStop(1, 'rgba(140,136,124,0.25)');
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    grain(g, s, s, 12, 4);
  }),

  /* Appliance white, which is never white. */
  applianceWhite: () => canvas(128, (g, s) => {
    g.fillStyle = '#b8b6ac'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 20; i++) {
      g.fillStyle = 'rgba(120,116,106,0.10)';
      g.fillRect(Math.random() * s, Math.random() * s, 6 + Math.random() * 30, 2 + Math.random() * 8);
    }
    grain(g, s, s, 10, 3);
  }),

  darkMetal: () => canvas(64, (g, s) => {
    g.fillStyle = '#26282b'; g.fillRect(0, 0, s, s);
    grain(g, s, s, 16, 4);
  }),

  tyre: () => canvas(64, (g, s) => {
    g.fillStyle = '#141517'; g.fillRect(0, 0, s, s);
    grain(g, s, s, 10, 2);
  }),

  screenOff: () => canvas(64, (g, s) => {
    g.fillStyle = '#07080b'; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(200,210,225,0.035)'; g.fillRect(0, 0, s, s * 0.35);
  }),

  paper: () => canvas(128, (g, s) => {
    g.fillStyle = '#c9c2ad'; g.fillRect(0, 0, s, s);
    grain(g, s, s, 14, 2);
  }),

  fabric: () => canvas(128, (g, s) => {
    g.fillStyle = '#3a352f'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 2) {
      g.fillStyle = `rgba(${52 + Math.random() * 14 | 0},${48 + Math.random() * 12 | 0},${42 + Math.random() * 10 | 0},0.4)`;
      g.fillRect(0, i, s, 1);
      g.fillRect(i, 0, 1, s);
    }
    grain(g, s, s, 14, 4);
  }),

  /* His blanket. It does not match anything, because it was free. */
  blanket: () => canvas(128, (g, s) => {
    g.fillStyle = '#5a4740'; g.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 12) {
      g.fillStyle = y % 24 === 0 ? 'rgba(96,74,60,0.5)' : 'rgba(60,52,64,0.35)';
      g.fillRect(0, y, s, 6);
    }
    grain(g, s, s, 16, 4);
  }),
};

function tex(name) {
  if (!cache.has(name)) cache.set(name, TEX[name]());
  return cache.get(name);
}

/**
 * A normal map, derived from the diffuse texture's own luminance by Sobel.
 *
 * This is the single highest-value thing in the file. Low-poly geometry in
 * low light reads as flat polygons because there is no surface variation
 * for the light to catch; a normal map gives the plaster its texture, the
 * bricks their edges and the laminate its seams, without adding a triangle.
 *
 * @param strength 0..~4 — how deep the relief reads.
 */
function normalFrom(name, strength = 1.6) {
  const key = 'N:' + name + strength;
  if (cache.has(key)) return cache.get(key);

  const source = tex(name);
  const src = source.image;
  const w = src.width, h = src.height;

  const rc = document.createElement('canvas');
  rc.width = w; rc.height = h;
  const rg = rc.getContext('2d');
  rg.drawImage(src, 0, 0);
  const px = rg.getImageData(0, 0, w, h).data;

  // Luminance as a height field.
  const ht = new Float32Array(w * h);
  for (let i = 0, p = 0; i < ht.length; i++, p += 4) {
    ht[i] = (0.2126 * px[p] + 0.7152 * px[p + 1] + 0.0722 * px[p + 2]) / 255;
  }

  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const og = out.getContext('2d');
  const img = og.createImageData(w, h);
  const d = img.data;
  const at = (x, y) => ht[((y + h) % h) * w + ((x + w) % w)];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Sobel, wrapped, so the map tiles exactly like the diffuse does.
      const gx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1))
               - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const gy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1))
               - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));

      let nx = -gx * strength, ny = -gy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;

      const i = (y * w + x) * 4;
      d[i]     = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  og.putImageData(img, 0, 0);

  const t = new THREE.CanvasTexture(out);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}

/**
 * A roughness map, also from the diffuse: darker, damper, dirtier areas
 * are rougher. Cheap, and it stops every surface having one uniform sheen.
 */
function roughFrom(name, lo = 0.72, hi = 1.0) {
  const key = 'R:' + name + lo + hi;
  if (cache.has(key)) return cache.get(key);
  const src = tex(name).image;
  const w = src.width, h = src.height;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.drawImage(src, 0, 0);
  const img = g.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255;
    const r = (hi - (hi - lo) * lum) * 255;
    d[i] = d[i + 1] = d[i + 2] = r;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  cache.set(key, t);
  return t;
}

export const MAT = {};

export function buildMaterials() {
  const std = (map, opts = {}) => new THREE.MeshStandardMaterial({
    map, roughness: 0.94, metalness: 0.0, ...opts,
  });

  /* Every large surface gets a normal map and a roughness map derived from
   * its own diffuse. In a room this dark that is what stops a wall reading
   * as a flat polygon — the light has something to catch. */
  const surf = (name, nStrength, rLo, rHi, opts = {}) => std(tex(name), {
    normalMap: normalFrom(name, nStrength),
    normalScale: new THREE.Vector2(opts.ns ?? 1, opts.ns ?? 1),
    roughnessMap: roughFrom(name, rLo, rHi),
    ...opts,
  });

  MAT.wall        = surf('wall', 1.5, 0.80, 1.0, { ns: 0.9 });
  MAT.wallStained = surf('wallStained', 1.7, 0.78, 1.0, { ns: 1.0 });
  MAT.wallBath    = surf('tile', 2.6, 0.22, 0.62, { ns: 1.3, roughness: 0.4 });
  // A ceiling is only ever seen at a grazing angle. Almost no relief, or the
  // stipple resolves as snow instead of as plaster.
  MAT.ceiling     = surf('ceiling', 0.7, 0.90, 1.0, { ns: 0.30 });
  MAT.floorWood   = surf('laminate', 2.0, 0.44, 0.86, { ns: 1.15, roughness: 0.68 });
  MAT.floorLino   = surf('lino', 1.8, 0.40, 0.82, { ns: 1.0, roughness: 0.62 });
  MAT.floorTile   = surf('tile', 2.4, 0.24, 0.60, { ns: 1.2, roughness: 0.42 });
  MAT.brick       = surf('brick', 2.8, 0.84, 1.0, { ns: 1.4 });
  MAT.asphalt     = surf('asphalt', 2.2, 0.92, 1.0, { ns: 1.2, roughness: 0.98 });
  MAT.pavement    = surf('pavement', 2.0, 0.88, 1.0, { ns: 1.1 });
  MAT.kerb        = std(null, { color: 0x4f5049, roughness: 0.95 });
  MAT.blueHouse   = surf('paintBlue', 1.6, 0.70, 0.95, { ns: 0.9 });
  MAT.curtain     = surf('curtain', 2.6, 0.90, 1.0,
    { ns: 1.5, side: THREE.DoubleSide, roughness: 1 });
  MAT.metal       = std(tex('darkMetal'), { roughness: 0.5, metalness: 0.55 });
  MAT.barMetal    = surf('barMetal', 2.4, 0.40, 0.86,
    { ns: 1.2, roughness: 0.72, metalness: 0.35 });
  MAT.tyre        = std(tex('tyre'), { roughness: 1 });
  MAT.screenOff   = std(tex('screenOff'), { roughness: 0.22 });
  MAT.paper       = std(tex('paper'), { side: THREE.DoubleSide });
  MAT.beige       = surf('beige', 1.0, 0.62, 0.88, { ns: 0.6, roughness: 0.78 });
  MAT.white       = std(tex('applianceWhite'), { roughness: 0.62 });
  MAT.fabric      = surf('fabric', 2.2, 0.92, 1.0, { ns: 1.3, roughness: 1 });
  MAT.blanket     = surf('blanket', 2.4, 0.90, 1.0, { ns: 1.4, roughness: 1 });

  MAT.wood        = std(null, { color: 0x54432f, roughness: 0.88 });
  MAT.woodDark    = std(null, { color: 0x2e2418, roughness: 0.92 });
  MAT.plasticBk   = std(null, { color: 0x141518, roughness: 0.68 });
  MAT.plasticGy   = std(null, { color: 0x6e6c66, roughness: 0.82 });
  MAT.porcelain   = std(null, { color: 0xa8a79c, roughness: 0.35 });
  MAT.dust        = new THREE.MeshStandardMaterial({
    color: 0x9a9384, roughness: 1, transparent: true, opacity: 0,
  });

  MAT.sky = new THREE.MeshBasicMaterial({ color: 0x1b2026, side: THREE.BackSide, fog: false });

  // Rain, as a scrolling sheet of streaks. Seen through bars at twelve metres
  // this reads as rain and costs one texture.
  MAT.rainSheet = (() => {
    const t = tex('rain');
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2);
    return t;
  })();

  // Emissive screens. The light they throw is a Concealment fact.
  MAT.screenTV = new THREE.MeshStandardMaterial({
    color: 0x05070a, emissive: 0x9FB8CE, emissiveIntensity: 0, toneMapped: false });
  MAT.screenPC = new THREE.MeshStandardMaterial({
    color: 0x05070a, emissive: 0x9FB8CE, emissiveIntensity: 0, toneMapped: false });
  MAT.screenPh = new THREE.MeshStandardMaterial({
    color: 0x05070a, emissive: 0xB6C8DA, emissiveIntensity: 0, toneMapped: false });

  return MAT;
}

export default MAT;
