/**
 * billboard.js — every entity in the game.
 *
 * Three stacked planes at slightly different depths. The parallax between
 * them as the player moves their head sells volume without a model, and it
 * is the single highest-value technique in the entity work.
 *
 *   silhouette — near-black, hard-edged, the actual shape
 *   detail     — low opacity, only readable where light hits it
 *   atmosphere — soft haze in front, tinted to the fog
 *
 * No animation loops. A loop reveals it is a flat plane. What these do
 * instead is drift, very slowly, and change position between frames the
 * player was not watching. Stillness is scarier and cheaper.
 */

import * as THREE from 'three';
import { entityLayer, entityAspect } from '../fx/entityArt.js';

const texCache = new Map();

function layerTexture(kind, layer) {
  const key = kind + '.' + layer;
  if (texCache.has(key)) return texCache.get(key);
  const t = new THREE.CanvasTexture(entityLayer(kind, layer, 512));
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  texCache.set(key, t);
  return t;
}

export class Billboard {
  /**
   * @param {object} opts
   *   kind   — entity id in entityArt
   *   height — world height in metres
   *   x, y, z — position, in the parent's space
   *   drift  — slow vertical drift amplitude (metres). Default is almost none.
   */
  constructor(parent, id, opts = {}) {
    const { kind = 'crawler', height = 2, x = 0, y = 0, z = 0 } = opts;

    this.id = id;
    this.kind = kind;
    this.opts = opts;
    this.group = new THREE.Group();
    this.group.position.set(x, y + height / 2, z);
    this.group.visible = false;
    parent.add(this.group);

    const w = height * entityAspect(kind);
    this.height = height;

    const mk = (layer, dz, opacity, blend) => {
      const tex = layerTexture(kind, layer);
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: blend || THREE.NormalBlending,
        // Silhouettes are lit by nothing. That is the point of them.
        fog: true,
        toneMapped: false,
      });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, height), mat);
      m.position.z = dz;
      m.renderOrder = 10 + Math.round(dz * 100);
      this.group.add(m);
      return m;
    };

    // Depth offsets are small — a few centimetres is enough for parallax
    // at this distance and keeps them from separating at oblique angles.
    this.silhouette = mk('silhouette', 0.00, 1.0);
    this.detail     = mk('detail',     0.055, 0.85);
    this.atmosphere = mk('atmosphere', 0.16, 0.9, THREE.AdditiveBlending);

    this._t = Math.random() * 100;
    this._driftBase = this.group.position.y;
  }

  set visible(v) { this.group.visible = v; }
  get visible() { return this.group.visible; }

  get position() { return this.group.position; }

  /**
   * Face the camera on Y only, and drift. The drift is deliberately below
   * the threshold where it reads as an animation.
   */
  update(dt, camera, worldOffset) {
    if (!this.group.visible) return;
    this._t += dt;

    const dx = camera.position.x - (this.group.position.x + worldOffset.x);
    const dz = camera.position.z - (this.group.position.z + worldOffset.z);
    this.group.rotation.y = Math.atan2(dx, dz);

    const drift = this.opts.drift ?? 0.012;
    this.group.position.y = this._driftBase + Math.sin(this._t * 0.21) * drift;
  }

  /**
   * Move it, while nobody is looking. Called between beats — never while
   * it is on screen.
   */
  reposition(x, z) {
    this.group.position.x = x;
    this.group.position.z = z;
  }

  /** Rim/backlight strength on the detail layer, 0..1. Never fully lit. */
  setLit(amount) {
    this.detail.material.opacity = 0.25 + amount * 0.7;
  }

  dispose() {
    for (const m of [this.silhouette, this.detail, this.atmosphere]) {
      m.geometry.dispose();
      m.material.dispose();
    }
    this.group.parent?.remove(this.group);
  }
}

export default Billboard;
