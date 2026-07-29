/**
 * materials.js — procedural textures from a 2D canvas. No external files.
 *
 * Prompt 1 wants surfaces that read at all in near-darkness. Prompt 2 owns
 * everything about how they actually look; keep the material NAMES stable
 * so it can swap the bodies out.
 */

import * as THREE from 'three';

const cache = new Map();

function canvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function noise(g, size, amount, dark = 0) {
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * amount - dark;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  g.putImageData(img, 0, 0);
}

const TEX = {
  plaster: () => canvas(256, (g, s) => {
    g.fillStyle = '#8a8378'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 220; i++) {
      g.fillStyle = `rgba(${90 + Math.random() * 40|0},${84 + Math.random() * 36|0},${76 + Math.random() * 30|0},0.35)`;
      g.fillRect(Math.random() * s, Math.random() * s, 6 + Math.random() * 40, 3 + Math.random() * 20);
    }
    // Damp. There is always damp.
    g.fillStyle = 'rgba(70,66,58,0.5)';
    g.beginPath(); g.ellipse(s * 0.7, s * 0.15, s * 0.28, s * 0.12, 0.4, 0, 7); g.fill();
    noise(g, s, 26);
  }),

  ceiling: () => canvas(128, (g, s) => {
    g.fillStyle = '#6f6a62'; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(52,48,42,0.55)';
    g.beginPath(); g.ellipse(s * 0.3, s * 0.6, s * 0.3, s * 0.2, 1.1, 0, 7); g.fill();
    noise(g, s, 22, 6);
  }),

  floorWood: () => canvas(256, (g, s) => {
    g.fillStyle = '#4a3a2c'; g.fillRect(0, 0, s, s);
    const plank = s / 6;
    for (let i = 0; i < 6; i++) {
      const v = 52 + Math.random() * 26;
      g.fillStyle = `rgb(${v + 14|0},${v|0},${v - 12|0})`;
      g.fillRect(0, i * plank, s, plank - 1);
      g.strokeStyle = 'rgba(20,14,10,0.7)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, i * plank); g.lineTo(s, i * plank); g.stroke();
      for (let k = 0; k < 3; k++) {
        g.strokeStyle = 'rgba(30,22,16,0.35)';
        const y = i * plank + Math.random() * plank;
        g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(s * .3, y + 3, s * .6, y - 3, s, y); g.stroke();
      }
    }
    noise(g, s, 20, 4);
  }),

  floorLino: () => canvas(128, (g, s) => {
    g.fillStyle = '#6d6a5c'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(40,38,32,0.6)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) {
      g.beginPath(); g.moveTo(i * s / 4, 0); g.lineTo(i * s / 4, s); g.stroke();
      g.beginPath(); g.moveTo(0, i * s / 4); g.lineTo(s, i * s / 4); g.stroke();
    }
    noise(g, s, 24, 8);
  }),

  tile: () => canvas(128, (g, s) => {
    g.fillStyle = '#8d9089'; g.fillRect(0, 0, s, s);
    g.strokeStyle = 'rgba(60,62,58,0.8)'; g.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      g.beginPath(); g.moveTo(i * s / 8, 0); g.lineTo(i * s / 8, s); g.stroke();
      g.beginPath(); g.moveTo(0, i * s / 8); g.lineTo(s, i * s / 8); g.stroke();
    }
    noise(g, s, 18, 10);
  }),

  asphalt: () => canvas(256, (g, s) => {
    g.fillStyle = '#22242a'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${40 + Math.random() * 40|0},${42 + Math.random() * 40|0},${46 + Math.random() * 40|0},0.5)`;
      g.fillRect(Math.random() * s, Math.random() * s, 2, 2);
    }
    noise(g, s, 14, 6);
  }),

  brick: () => canvas(256, (g, s) => {
    g.fillStyle = '#3a3330'; g.fillRect(0, 0, s, s);
    const bh = s / 10;
    for (let r = 0; r < 10; r++) {
      const off = (r % 2) * (s / 8);
      for (let c = -1; c < 5; c++) {
        const v = 58 + Math.random() * 24;
        g.fillStyle = `rgb(${v + 12|0},${v - 4|0},${v - 10|0})`;
        g.fillRect(c * s / 4 + off + 2, r * bh + 2, s / 4 - 4, bh - 4);
      }
    }
    noise(g, s, 20, 10);
  }),

  paintBlue: () => canvas(128, (g, s) => {
    g.fillStyle = '#4a5c66'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 40; i++) {
      g.fillStyle = 'rgba(30,38,44,0.4)';
      g.fillRect(Math.random() * s, Math.random() * s, 3 + Math.random() * 18, 2 + Math.random() * 8);
    }
    noise(g, s, 18, 8);
  }),

  curtain: () => canvas(128, (g, s) => {
    g.fillStyle = '#5b4a42'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < s; i += 4) {
      g.fillStyle = `rgba(${20 + Math.random() * 20|0},${16 + Math.random() * 16|0},${14 + Math.random() * 14|0},0.5)`;
      g.fillRect(i, 0, 2, s);
    }
    noise(g, s, 12, 4);
  }),

  darkMetal: () => canvas(64, (g, s) => {
    g.fillStyle = '#2c2e31'; g.fillRect(0, 0, s, s);
    noise(g, s, 16, 4);
  }),

  screenOff: () => canvas(64, (g, s) => {
    g.fillStyle = '#0b0d10'; g.fillRect(0, 0, s, s);
    g.fillStyle = 'rgba(255,255,255,0.03)'; g.fillRect(0, 0, s, s * 0.4);
  }),

  paper: () => canvas(128, (g, s) => {
    g.fillStyle = '#cfc7b4'; g.fillRect(0, 0, s, s);
    noise(g, s, 16, 2);
  }),
};

function tex(name) {
  if (!cache.has(name)) cache.set(name, TEX[name]());
  return cache.get(name);
}

/**
 * Named materials. Keep these names; prompt 2 replaces the bodies.
 */
export const MAT = {};

export function buildMaterials() {
  const std = (map, opts = {}) => new THREE.MeshStandardMaterial({
    map, roughness: 0.92, metalness: 0.0, ...opts,
  });

  MAT.wall      = std(tex('plaster'));
  MAT.wallBath  = std(tex('tile'));
  MAT.ceiling   = std(tex('ceiling'));
  MAT.floorWood = std(tex('floorWood'));
  MAT.floorLino = std(tex('floorLino'));
  MAT.floorTile = std(tex('tile'));
  MAT.brick     = std(tex('brick'));
  MAT.asphalt   = std(tex('asphalt'));
  MAT.blueHouse = std(tex('paintBlue'));
  MAT.curtain   = std(tex('curtain'), { side: THREE.DoubleSide });
  MAT.metal     = std(tex('darkMetal'), { roughness: 0.55, metalness: 0.6 });
  MAT.screenOff = std(tex('screenOff'), { roughness: 0.3 });
  MAT.paper     = std(tex('paper'), { side: THREE.DoubleSide });

  MAT.wood      = std(null, { color: 0x4b3d31 });
  MAT.woodDark  = std(null, { color: 0x32281f });
  MAT.fabric    = std(null, { color: 0x3c3630 });
  MAT.white     = std(null, { color: 0xb9b4a8 });
  MAT.plasticBk = std(null, { color: 0x1b1c1e, roughness: 0.7 });
  MAT.plasticGy = std(null, { color: 0x8c8a84, roughness: 0.8 });
  MAT.sky       = new THREE.MeshBasicMaterial({ color: 0x2b3138, side: THREE.BackSide, fog: false });

  // Emissive screen materials — the light they throw is a Concealment fact.
  MAT.screenTV  = new THREE.MeshStandardMaterial({ color: 0x0a0d12, emissive: 0x7fb0ff, emissiveIntensity: 0 });
  MAT.screenPC  = new THREE.MeshStandardMaterial({ color: 0x0a0d12, emissive: 0x8fd0bd, emissiveIntensity: 0 });
  MAT.screenPh  = new THREE.MeshStandardMaterial({ color: 0x0a0d12, emissive: 0xbcd8ff, emissiveIntensity: 0 });

  // Billboards. Everything that is not us is one of these.
  MAT.billboard = new THREE.MeshBasicMaterial({
    transparent: true, depthWrite: false, fog: true, color: 0xffffff,
  });

  return MAT;
}

/** Simple silhouette billboard texture, generated per entity. */
export function silhouette(kind) {
  const key = 'sil.' + kind;
  if (cache.has(key)) return cache.get(key);
  const t = canvas(256, (g, s) => {
    g.clearRect(0, 0, s, s);
    g.fillStyle = SIL[kind]?.color || '#000000';
    (SIL[kind]?.draw || SIL.crawler.draw)(g, s);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  cache.set(key, t);
  return t;
}

/**
 * Programmer-art silhouettes. Deliberately crude — prompt 2 replaces these.
 * They are all 2D billboards and they always will be. Nothing here is a model.
 */
const SIL = {
  crawler: {
    color: '#0a0a0c',
    draw(g, s) {
      g.beginPath();
      g.ellipse(s / 2, s * 0.72, s * 0.24, s * 0.12, 0, 0, 7); g.fill();
      for (let i = 0; i < 6; i++) {
        g.strokeStyle = g.fillStyle; g.lineWidth = 5;
        const a = -0.4 + i * 0.35;
        g.beginPath(); g.moveTo(s / 2, s * 0.72);
        g.lineTo(s / 2 + Math.cos(a) * s * 0.3, s * 0.72 + Math.abs(Math.sin(a)) * s * 0.2);
        g.stroke();
      }
    },
  },
  gleaner: {
    color: '#101014',
    draw(g, s) {
      g.beginPath(); g.ellipse(s / 2, s * 0.6, s * 0.13, s * 0.19, 0, 0, 7); g.fill();
      g.fillRect(s / 2 - 3, s * 0.72, 6, s * 0.2);
    },
  },
  tormentor: {
    color: '#050507',
    draw(g, s) {
      g.fillRect(s * 0.44, s * 0.18, s * 0.12, s * 0.66);
      g.beginPath(); g.moveTo(s * 0.44, s * 0.2); g.lineTo(s * 0.3, s * 0.04);
      g.lineTo(s * 0.47, s * 0.16); g.fill();
      g.beginPath(); g.moveTo(s * 0.56, s * 0.2); g.lineTo(s * 0.7, s * 0.04);
      g.lineTo(s * 0.53, s * 0.16); g.fill();
      g.fillRect(s * 0.40, s * 0.84, s * 0.07, s * 0.16);
      g.fillRect(s * 0.53, s * 0.84, s * 0.07, s * 0.16);
    },
  },
  anguish: {
    color: '#7a1a18',
    draw(g, s) {
      g.fillRect(s * 0.45, s * 0.22, s * 0.10, s * 0.55);
      g.beginPath(); g.arc(s * 0.5, s * 0.2, s * 0.07, 0, 7); g.fill();
      g.lineWidth = 7; g.strokeStyle = g.fillStyle;
      g.beginPath(); g.moveTo(s * 0.46, s * 0.3); g.lineTo(s * 0.22, s * 0.52); g.stroke();
      g.beginPath(); g.moveTo(s * 0.54, s * 0.3); g.lineTo(s * 0.78, s * 0.52); g.stroke();
      g.fillRect(s * 0.44, s * 0.77, s * 0.05, s * 0.23);
      g.fillRect(s * 0.52, s * 0.77, s * 0.05, s * 0.23);
    },
  },
  incursion: {
    color: '#0d0c0f',
    draw(g, s) {
      g.fillRect(s * 0.46, s * 0.30, s * 0.08, s * 0.44);
      g.beginPath(); g.ellipse(s * 0.5, s * 0.26, s * 0.05, s * 0.07, 0, 0, 7); g.fill();
      g.lineWidth = 5; g.strokeStyle = g.fillStyle;
      g.beginPath(); g.moveTo(s * 0.47, s * 0.38); g.lineTo(s * 0.33, s * 0.62); g.stroke();
      g.beginPath(); g.moveTo(s * 0.53, s * 0.38); g.lineTo(s * 0.67, s * 0.62); g.stroke();
      g.beginPath(); g.moveTo(s * 0.48, s * 0.74); g.lineTo(s * 0.42, s * 1.0); g.stroke();
      g.beginPath(); g.moveTo(s * 0.52, s * 0.74); g.lineTo(s * 0.58, s * 1.0); g.stroke();
    },
  },
  person: {
    color: '#15171b',
    draw(g, s) {
      g.beginPath(); g.arc(s * 0.5, s * 0.3, s * 0.07, 0, 7); g.fill();
      g.fillRect(s * 0.43, s * 0.38, s * 0.14, s * 0.3);
      g.fillRect(s * 0.44, s * 0.68, s * 0.05, s * 0.3);
      g.fillRect(s * 0.51, s * 0.68, s * 0.05, s * 0.3);
    },
  },
};

export default MAT;
