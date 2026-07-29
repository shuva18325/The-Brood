/**
 * street.js — one street, seen through bars.
 *
 * The only ground truth in the game, and it shows almost nothing.
 * Everything past the far kerb is fog.
 *
 * Nothing out here is ever fully in frame. The billboards are placed so
 * that the bars, the window edge, a parked car or the corner of the blue
 * house always takes a piece out of them.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import state from '../state.js';
import { STREET } from './plan.js';
import { MAT } from './materials.js';
import Billboard from './billboard.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

export function buildStreet(scene) {
  const root = new THREE.Group();
  root.name = 'street';
  root.position.y = STREET.roadY;
  scene.add(root);

  const dynamic = {};
  const billboards = new Map();

  /* --- the road --- */
  const roadMat = MAT.asphalt.clone();
  roadMat.map = MAT.asphalt.map.clone();
  roadMat.map.needsUpdate = true;
  roadMat.map.repeat.set(3, 20);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(6.5, STREET.z1 - STREET.z0), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(-10.25, 0, 0);
  road.receiveShadow = true;
  root.add(road);

  /* --- pavements, and the kerb they sit on --- */
  for (const x of [-7.8, -12.7]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.8, STREET.z1 - STREET.z0), MAT.pavement);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.13, 0);
    p.receiveShadow = true;
    root.add(p);
    root.add(box(0.14, 0.14, STREET.z1 - STREET.z0, MAT.kerb)
      .translateX(x + (x < -10 ? -0.9 : 0.9)).translateY(0.07));
  }

  /* --- our own building's face, BELOW the window only. Anything taller
         would be a wall in front of the only true thing in the game. --- */
  const face = box(0.3, 3.4, 30, MAT.brick);
  face.position.set(-4.35, 1.7, 0);
  face.receiveShadow = true;
  root.add(face);

  /* --- the blue house across the street --- */
  {
    const g = new THREE.Group();
    g.position.set(-16, 0, -1.5);
    root.add(g);
    const shell = box(4.5, 6.2, 9, MAT.blueHouse);
    shell.position.y = 3.1;
    shell.castShadow = shell.receiveShadow = true;
    g.add(shell);

    // Only the face we can see is dressed. Nobody has ever seen the back.
    const winMat = new THREE.MeshStandardMaterial({ color: 0x080a0e, roughness: 0.35, metalness: 0.1 });
    for (const [wy, wz] of [[1.9, -2.6], [1.9, 0.4], [1.9, 3.4], [4.5, -2.6], [4.5, 0.4], [4.5, 3.4]]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), winMat.clone());
      w.position.set(2.27, wy, wz);
      w.rotation.y = Math.PI / 2;
      g.add(w);
      root.add(box(0.06, 1.5, 1.2, MAT.woodDark).translateX(-16 + 2.24).translateY(wy).translateZ(-1.5 + wz));
    }

    // The curtain in the upstairs window. It twitches in the mornings
    // until it doesn't, and nothing in the game ever mentions that.
    const cur = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), MAT.curtain);
    cur.position.set(2.29, 4.5, 0.4);
    cur.rotation.y = Math.PI / 2;
    g.add(cur);
    dynamic.blueCurtain = cur;
    dynamic.blueCurtainHome = cur.position.z;
  }

  /* --- parked cars, one of which is his --- */
  const carColors = [0x23272d, 0x2f2723, 0x1e2622];
  dynamic.cars = [];
  [-6.5, 2.5, 9.0].forEach((z, i) => {
    const c = new THREE.Group();
    c.position.set(-8.6, 0, z);
    const paint = new THREE.MeshStandardMaterial({ color: carColors[i], roughness: 0.62, metalness: 0.35 });
    const body = box(1.8, 0.7, 4.3, paint); body.position.y = 0.62;
    const cab = box(1.6, 0.55, 2.1, paint); cab.position.set(0, 1.22, -0.2);
    body.castShadow = cab.castShadow = true;
    c.add(body); c.add(cab);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a0d11, roughness: 0.12, metalness: 0.5 });
    c.add(box(1.55, 0.5, 0.05, glassMat).translateY(1.22).translateZ(-1.24));
    for (const [wx, wz] of [[-0.86, 1.4], [0.86, 1.4], [-0.86, -1.4], [0.86, -1.4]]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.2, 10), MAT.tyre);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.32, wz);
      c.add(w);
    }
    root.add(c);
    dynamic.cars.push(c);
  });
  dynamic.hisCar = dynamic.cars[1];

  /* --- streetlamp. Sodium, and the only warm thing outside. --- */
  {
    root.add(box(0.14, 7, 0.14, MAT.metal).translateX(-7.6).translateY(3.5).translateZ(-4));
    root.add(box(1.4, 0.1, 0.1, MAT.metal).translateX(-8.3).translateY(6.9).translateZ(-4));
    // A streetlamp points DOWN. That matters: as a point light it floods
    // the apartment through five metres of brick, and the interior sodium
    // is supposed to come from one place only — the window.
    const lamp = new THREE.SpotLight(CONFIG.light.streetlamp.color, 0,
      CONFIG.light.streetlamp.distance, 0.95, 0.45, CONFIG.light.streetlamp.decay);
    lamp.position.set(-9.0, 6.7, -4);
    root.add(lamp);
    const lampTarget = new THREE.Object3D();
    lampTarget.position.set(-9.6, 0, -4);
    root.add(lampTarget);
    lamp.target = lampTarget;
    dynamic.streetlamp = lamp;
    const head = box(0.5, 0.16, 0.3, new THREE.MeshStandardMaterial({
      color: 0x22221f, emissive: CONFIG.light.streetlamp.color, emissiveIntensity: 0,
    }));
    head.position.copy(lamp.position);
    root.add(head);
    dynamic.streetlampHead = head;
  }

  /* --- rubbish. It stops being collected in the first week and then it
         is simply part of the street. --- */
  dynamic.trash = [];
  for (let i = 0; i < 34; i++) {
    const b = box(0.35 + Math.random() * 0.35, 0.35 + Math.random() * 0.55, 0.35 + Math.random() * 0.3,
      new THREE.MeshStandardMaterial({ color: 0x15181a, roughness: 1 }));
    b.position.set(-7.4 - Math.random() * 1.0, 0.3, -15 + Math.random() * 30);
    b.rotation.y = Math.random() * 3;
    b.castShadow = true;
    b.visible = false;
    root.add(b);
    dynamic.trash.push(b);
  }

  /* --- standing water. It arrives, and the block below is gone. --- */
  const water = new THREE.Mesh(new THREE.PlaneGeometry(9, 40),
    new THREE.MeshStandardMaterial({
      color: 0x0a1216, roughness: 0.07, metalness: 0.65,
      transparent: true, opacity: 0.9,
    }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(-10.5, 0.05, 8);
  water.visible = false;
  root.add(water);
  dynamic.water = water;

  /* --- sky --- */
  const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 12, 8), MAT.sky);
  sky.position.y = 10;
  scene.add(sky);
  dynamic.sky = sky;

  /* ---------------------------------------------------------------- */
  /* the billboards                                                    */
  /*                                                                   */
  /* Placement is composition. Every one of these sits where something  */
  /* takes a bite out of it — behind a car, past the window edge, or    */
  /* far enough into the fog that it is mostly an idea.                 */
  /* ---------------------------------------------------------------- */

  const add = (id, kind, opts) => {
    const b = new Billboard(root, id, { kind, ...opts });
    billboards.set(id, b);
    return b;
  };

  // Low, below waist height, at the bottom edge of the window.
  add('crawler.street', 'crawler', { x: -9.5, z: 3.0, height: 0.62, drift: 0 });
  add('crawler.near',   'crawler', { x: -7.4, z: -1.4, height: 0.66, drift: 0 });
  add('crawler.far',    'crawler', { x: -12.1, z: 5.4, height: 0.58, drift: 0 });

  // Gleaners are always MANY, and always in the aftermath. A flock.
  add('gleaner.a', 'gleaner', { x: -10.4, z: -5.2, height: 1.15, drift: 0.02 });
  add('gleaner.b', 'gleaner', { x: -11.9, z: -3.6, height: 1.05, drift: 0.02 });
  add('gleaner.c', 'gleaner', { x: -9.6,  z: -6.9, height: 1.10, drift: 0.02 });
  add('gleaner.d', 'gleaner', { x: -12.6, z: -6.0, height: 0.95, drift: 0.02 });
  add('gleaner.e', 'gleaner', { x: -8.9,  z: -4.4, height: 1.20, drift: 0.02 });

  // The Tormentor. Far down the street, in the fog, and TOO TALL — the
  // head is above the top of the window frame from anywhere in the room.
  add('tormentor.far', 'tormentor', { x: -14.5, z: -18.5, height: 11.0, drift: 0.05 });

  // Anguish. One event, late, close, and mostly behind the parked car.
  add('anguish.street', 'anguish', { x: -9.9, z: 1.1, height: 2.35, drift: 0 });

  // A neighbour, twice, and the second time is not the same night.
  add('neighbour',   'person', { x: -9.8, z: -7.5, height: 1.75, drift: 0 });
  add('neighbour.b', 'person', { x: -8.4, z: 6.5,  height: 1.75, drift: 0 });

  const worldOffset = root.position;

  return {
    root, dynamic, billboards,

    show(id, on = true) {
      const b = billboards.get(id);
      if (b) b.visible = on;
      return b;
    },

    hideAll() { for (const b of billboards.values()) b.visible = false; },

    update(dt, camera) {
      for (const b of billboards.values()) b.update(dt, camera, worldOffset);
    },

    /** True if the camera is looking within `deg` of a visible billboard. */
    lookingAt(camera, id, deg = 14) {
      const b = billboards.get(id);
      if (!b || !b.visible) return false;
      const world = new THREE.Vector3();
      b.group.getWorldPosition(world);
      const dir = world.sub(camera.position).normalize();
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      return fwd.dot(dir) > Math.cos((deg * Math.PI) / 180);
    },

    /** The street, on a given day. */
    applyDay(day) {
      const D = CONFIG.decay;
      const n = day < D.trashFromDay ? 0
        : Math.min(dynamic.trash.length,
            Math.floor(((day - D.trashFromDay) / (15 - D.trashFromDay)) * dynamic.trash.length));
      dynamic.trash.forEach((t, i) => { t.visible = i < n; });

      dynamic.water.visible = day >= D.waterFromDay;
      dynamic.water.position.z = 8 - (day - D.waterFromDay) * 1.1;

      // His car does not move. That is the whole point of his car.
      void state;
    },
  };
}

export default buildStreet;
