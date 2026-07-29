/**
 * street.js — one street, seen through bars, and the billboards that
 * occasionally stand in it.
 *
 * This is the only ground truth in the game and it shows almost nothing.
 * Everything past the far kerb is fog. Every entity is a camera-facing
 * textured plane. There are no models here and there never will be — the
 * one exception in the endgame is still a billboard, it is just one that
 * can be inside.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { STREET } from './plan.js';
import { MAT, silhouette } from './materials.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

export function buildStreet(scene) {
  const root = new THREE.Group();
  root.name = 'street';
  root.position.y = STREET.roadY;
  scene.add(root);

  const dynamic = {};
  const billboards = new Map();

  const y0 = -STREET.roadY;   // ground plane in local space is the road

  /* --- the road --- */
  const roadMat = MAT.asphalt.clone();
  roadMat.map = MAT.asphalt.map.clone();
  roadMat.map.needsUpdate = true;
  roadMat.map.repeat.set(3, 20);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(6.5, STREET.z1 - STREET.z0), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(-10.25, 0, 0);
  root.add(road);

  /* --- pavements --- */
  for (const x of [-7.8, -12.7]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.8, STREET.z1 - STREET.z0), MAT.plasticGy);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.12, 0);
    root.add(p);
  }

  /* --- our own building's face, BELOW the window only. Anything taller
         than the sill would be a wall in front of the only true thing in
         the game. --- */
  const face = box(0.3, 3.4, 30, MAT.brick);
  face.position.set(-4.35, 1.7, 0);
  root.add(face);

  /* --- the blue house across the street --- */
  {
    const g = new THREE.Group();
    g.position.set(-16, 0, -1.5);
    root.add(g);
    const shell = box(4.5, 6.2, 9, MAT.blueHouse);
    shell.position.y = 3.1;
    g.add(shell);

    // Its windows — only the face we can see. One of them is the one that
    // matters, and the game never says which.
    const winMat = new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.4 });
    for (const [wy, wz] of [[1.9, -2.6], [1.9, 0.4], [1.9, 3.4], [4.5, -2.6], [4.5, 0.4], [4.5, 3.4]]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), winMat.clone());
      w.position.set(2.27, wy, wz);
      w.rotation.y = Math.PI / 2;
      g.add(w);
    }

    // The curtain in the upstairs window. It twitches in the mornings until
    // it does not, and nothing in the game ever mentions that it stopped.
    const cur = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), MAT.curtain);
    cur.position.set(2.29, 4.5, 0.4);
    cur.rotation.y = Math.PI / 2;
    g.add(cur);
    dynamic.blueCurtain = cur;
    dynamic.blueCurtainHome = cur.position.z;
  }

  /* --- parked cars, one of which is his --- */
  const carColors = [0x2a2f36, 0x3a2f2a, 0x263028];
  dynamic.cars = [];
  [-6.5, 2.5, 9.0].forEach((z, i) => {
    const c = new THREE.Group();
    c.position.set(-8.6, 0, z);
    const body = box(1.8, 0.7, 4.3, new THREE.MeshStandardMaterial({ color: carColors[i], roughness: 0.8 }));
    body.position.y = 0.62;
    c.add(body);
    const cab = box(1.6, 0.55, 2.1, new THREE.MeshStandardMaterial({ color: carColors[i], roughness: 0.8 }));
    cab.position.set(0, 1.22, -0.2);
    c.add(cab);
    for (const [wx, wz] of [[-0.86, 1.4], [0.86, 1.4], [-0.86, -1.4], [0.86, -1.4]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 10), MAT.plasticBk);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.32, wz);
      c.add(w);
    }
    root.add(c);
    dynamic.cars.push(c);
  });
  dynamic.hisCar = dynamic.cars[1];

  /* --- streetlamp --- */
  {
    const pole = box(0.14, 7, 0.14, MAT.metal);
    pole.position.set(-7.6, 3.5, -4);
    root.add(pole);
    const arm = box(1.4, 0.1, 0.1, MAT.metal);
    arm.position.set(-8.3, 6.9, -4);
    root.add(arm);
    const lamp = new THREE.PointLight(CONFIG.light.streetlamp.color, 0,
      CONFIG.light.streetlamp.distance, CONFIG.light.streetlamp.decay);
    lamp.position.set(-9.0, 6.7, -4);
    root.add(lamp);
    dynamic.streetlamp = lamp;
    const head = box(0.5, 0.16, 0.3, new THREE.MeshStandardMaterial({
      color: 0x2a2a2a, emissive: CONFIG.light.streetlamp.color, emissiveIntensity: 0,
    }));
    head.position.copy(lamp.position);
    root.add(head);
    dynamic.streetlampHead = head;
  }

  /* --- rubbish. It stops being collected in the first week and then it
         is simply part of the street. --- */
  for (let i = 0; i < 26; i++) {
    const b = box(0.4 + Math.random() * 0.3, 0.4 + Math.random() * 0.5, 0.4 + Math.random() * 0.3,
      new THREE.MeshStandardMaterial({ color: 0x1c1f1c, roughness: 1 }));
    b.position.set(-7.4 - Math.random() * 0.9, 0.3, -14 + Math.random() * 28);
    b.rotation.y = Math.random() * 3;
    b.visible = false;
    root.add(b);
    (dynamic.trash ||= []).push(b);
  }

  /* --- standing water. It arrives, and then the block below is gone. --- */
  const water = new THREE.Mesh(new THREE.PlaneGeometry(9, 40),
    new THREE.MeshStandardMaterial({ color: 0x101a1e, roughness: 0.12, metalness: 0.4,
      transparent: true, opacity: 0.85 }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(-10.5, 0.04, 8);
  water.visible = false;
  root.add(water);
  dynamic.water = water;

  /* --- sky / fog wall --- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 12, 8), MAT.sky);
  sky.position.y = 10;
  scene.add(sky);
  dynamic.sky = sky;

  /* ---------------------------------------------------------------- */
  /* billboards                                                        */
  /* ---------------------------------------------------------------- */

  /**
   * Register a billboard slot. Everything that is not architecture is one
   * of these: a plane with a silhouette on it that always faces the camera.
   */
  function makeBillboard(id, kind, { x, z, height = 1.9, y = 0 } = {}) {
    const tex = silhouette(kind);
    const mat = MAT.billboard.clone();
    mat.map = tex;
    mat.opacity = 1;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(height * 0.75, height), mat);
    m.position.set(x, y + height / 2, z);
    m.visible = false;
    m.userData.kind = kind;
    m.userData.billboard = true;
    root.add(m);
    billboards.set(id, m);
    return m;
  }

  makeBillboard('crawler.street', 'crawler', { x: -9.5, z: 3.0, height: 0.7 });
  makeBillboard('crawler.near',   'crawler', { x: -7.6, z: -1.0, height: 0.7 });
  makeBillboard('gleaner.a',      'gleaner', { x: -11.0, z: -5.0, height: 1.0 });
  makeBillboard('gleaner.b',      'gleaner', { x: -12.2, z: -3.4, height: 1.0 });
  makeBillboard('gleaner.c',      'gleaner', { x: -10.2, z: -6.6, height: 1.0 });
  makeBillboard('tormentor.far',  'tormentor', { x: -15.0, z: -17.0, height: 8.5 });
  makeBillboard('anguish.street', 'anguish', { x: -10.4, z: -0.6, height: 2.4 });
  makeBillboard('incursion.street','incursion', { x: -8.2, z: 4.2, height: 2.0 });
  makeBillboard('neighbour',      'person', { x: -9.8, z: -7.5, height: 1.75 });
  makeBillboard('neighbour.b',    'person', { x: -8.4, z: 6.5, height: 1.75 });

  return {
    root, dynamic, billboards,

    show(id, on = true) {
      const b = billboards.get(id);
      if (b) b.visible = on;
      return b;
    },

    hideAll() { for (const b of billboards.values()) b.visible = false; },

    /** Called every frame — billboards face the camera on Y only. */
    update(camera) {
      for (const b of billboards.values()) {
        if (!b.visible) continue;
        const dx = camera.position.x - (b.position.x + root.position.x);
        const dz = camera.position.z - (b.position.z + root.position.z);
        b.rotation.y = Math.atan2(dx, dz);
      }
    },

    /** True if the camera is looking within `deg` of a visible billboard. */
    lookingAt(camera, id, deg = 14) {
      const b = billboards.get(id);
      if (!b || !b.visible) return false;
      const world = new THREE.Vector3();
      b.getWorldPosition(world);
      const dir = world.sub(camera.position).normalize();
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      return fwd.dot(dir) > Math.cos((deg * Math.PI) / 180);
    },
  };
}

export default buildStreet;
