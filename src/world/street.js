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
import { STREET, WINDOW } from './plan.js';
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

  /* ------------------------------------------------------------------
   * THE SKY WASH.
   *
   * Every exterior surface is lit by the overcast sky, and under a uniform
   * sky a surface's appearance is albedo × sky luminance with no shadow
   * term. So: clone the material (the interior shares these), remember its
   * albedo, and let lighting.js drive `emissive` from the phase.
   *
   * Cloning is not optional. MAT.brick is also the apartment's roof slab and
   * MAT.pavement is the window sill; washing those would light the interior.
   * ------------------------------------------------------------------ */
  const skylit = [];
  const sky = (mesh, weight = 1) => {
    mesh.traverse((o) => {
      if (!o.isMesh || !o.material || !o.material.isMeshStandardMaterial) return;
      o.material = o.material.clone();
      o.material.emissive = new THREE.Color(0x000000);
      o.material.emissiveIntensity = 1;
      skylit.push({ mat: o.material, albedo: o.material.color.clone(), weight });
    });
    return mesh;
  };
  dynamic.skylit = skylit;
  /** Add to the street group AND register for the sky wash. */
  const out = (mesh, weight = 1) => { root.add(sky(mesh, weight)); return mesh; };

  /* --- the road --- */
  const roadMat = MAT.asphalt.clone();
  roadMat.map = MAT.asphalt.map.clone();
  roadMat.map.needsUpdate = true;
  roadMat.map.repeat.set(3, 20);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(6.5, STREET.z1 - STREET.z0), roadMat);
  road.rotation.x = -Math.PI / 2;
  road.position.set(-10.25, 0, 0);
  road.receiveShadow = true;
  out(road, 0.92);

  /* --- pavements, and the kerb they sit on --- */
  for (const x of [-7.8, -12.7]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.8, STREET.z1 - STREET.z0), MAT.pavement);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, 0.13, 0);
    p.receiveShadow = true;
    out(p, 0.95);
    out(box(0.14, 0.14, STREET.z1 - STREET.z0, MAT.kerb)
      .translateX(x + (x < -10 ? -0.9 : 0.9)).translateY(0.07), 0.9);
  }

  /* --- our own building's face -------------------------------------
   * THE MOST DANGEROUS OBJECT IN THIS FILE. It is 150 mm outside the only
   * window in the game, so anything that reaches the aperture is a brick
   * wall across the one true thing the player can look at — which is exactly
   * what it used to be: 3.4 m tall from the pavement, straight over the sill.
   *
   * The street group sits at y = STREET.roadY (−3.2), so in this group's
   * space the window aperture is at y 4.15–5.40 and the sill is at 4.15.
   * The face therefore stops at 4.05, a hundred millimetres short, and the
   * return above the head of the window starts again at 5.50.
   */
  const SILL = WINDOW.sill - STREET.roadY;                 // 4.15
  const HEAD = WINDOW.sill + WINDOW.height - STREET.roadY; // 5.40
  // The interior west wall occupies x −4.34 to −4.20. The facade must sit
  // OUTSIDE that, not through it: interpenetrating boxes z-fight, and the
  // fighting was visible from the mat as a field of stripes under the window.
  const FACE_X = -4.49;
  {
    // Below the sill: the wall the player leans on.
    const below = box(0.3, SILL - 0.10, 30, MAT.brick);
    below.position.set(FACE_X, (SILL - 0.10) / 2, 0);
    below.receiveShadow = true;
    out(below, 0.78);

    // Above the window head: the rest of the building, and the eaves.
    const above = box(0.3, 2.2, 30, MAT.brick);
    above.position.set(FACE_X, HEAD + 0.10 + 1.1, 0);
    above.receiveShadow = true;
    above.castShadow = true;
    out(above, 0.82);

    // The reveal returns either side of the aperture, so the hole reads as a
    // hole in a thick wall rather than as a gap in a flat.
    const halfW = WINDOW.width / 2;
    for (const dz of [-1, 1]) {
      const side = box(0.3, HEAD - SILL + 0.2, 14, MAT.brick);
      side.position.set(FACE_X, (SILL + HEAD) / 2,
        WINDOW.z + dz * (halfW + 0.12 + 7));
      side.receiveShadow = true;
      out(side, 0.7);
    }

    // A sill course under the opening, and a lintel over it. Two boxes, and
    // they do more for the read of the building than any texture.
    // A sill projects out from the wall face and is bedded into it, so its
    // near edge is buried rather than coplanar with anything.
    const sillStone = box(0.38, 0.09, WINDOW.width + 0.5, MAT.pavement);
    sillStone.position.set(-4.47, SILL - 0.055, WINDOW.z);
    sillStone.castShadow = true;
    sillStone.receiveShadow = true;
    out(sillStone, 0.85);
    const lintel = box(0.34, 0.14, WINDOW.width + 0.5, MAT.pavement);
    lintel.position.set(-4.48, HEAD + 0.09, WINDOW.z);
    lintel.castShadow = true;
    out(lintel, 0.85);
  }

  /* --- the row across the street. Neighbours nobody ever meets, so they
         are three boxes and a roofline, and that is enough at twelve metres
         through bars. They matter because they make the street a street
         rather than one house in a void. --- */
  for (const [z, h, c] of [[-13.5, 5.4, 0x4a4640], [-22, 6.0, 0x413c38], [8.5, 5.0, 0x453f3a]]) {
    const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 });
    const b = box(4.2, h, 8.5, m);
    b.position.set(-16.2, h / 2, z);
    b.castShadow = b.receiveShadow = true;
    out(b, 0.95);
    // A roofline. One prism per house, and the street gets a skyline.
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 2.4, 8.5, 3, 1),
      new THREE.MeshStandardMaterial({ color: 0x2b2926, roughness: 1 }));
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(-16.2, h + 0.6, z);
    roof.castShadow = true;
    out(roof, 0.9);
  }

  /* --- the blue house across the street --- */
  {
    const g = new THREE.Group();
    g.position.set(-16, 0, -1.5);
    root.add(g);
    const shell = box(4.5, 6.2, 9, MAT.blueHouse);
    shell.position.y = 3.1;
    shell.castShadow = shell.receiveShadow = true;
    g.add(sky(shell, 1.0));

    // A pitched roof with eaves that overhang. Two prisms and a plate, and
    // the house stops being a slab.
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 2.9, 9.7, 3, 1),
      new THREE.MeshStandardMaterial({ color: 0x24211f, roughness: 1 }));
    roof.rotation.z = Math.PI / 2;
    roof.rotation.y = Math.PI / 2;
    roof.position.set(0, 6.9, 0);
    roof.castShadow = true;
    g.add(sky(roof, 0.9));
    // The fascia, which is the line the eye actually reads.
    g.add(sky(box(0.16, 0.26, 9.7,
      new THREE.MeshStandardMaterial({ color: 0xB7B3A6, roughness: 0.9 }))
      .translateX(2.30).translateY(6.24), 0.95));

    // A chimney, off-centre, because they always are.
    g.add(sky(box(0.8, 1.9, 0.8, MAT.brick).translateX(-0.4).translateY(7.6).translateZ(2.2), 0.9));

    // The porch: a slab, two posts, a roof, three steps. It is the piece of
    // this house that says somebody lived in it.
    const porchMat = new THREE.MeshStandardMaterial({ color: 0x6E6A60, roughness: 0.95 });
    g.add(sky(box(1.5, 0.22, 3.4, porchMat).translateX(3.0).translateY(0.55), 0.95));
    for (const pz of [-1.5, 1.5]) {
      g.add(sky(box(0.12, 2.3, 0.12, porchMat).translateX(3.65).translateY(1.8).translateZ(pz), 0.85));
    }
    g.add(sky(box(1.9, 0.14, 3.7, porchMat).translateX(3.1).translateY(3.0), 0.92));
    for (let i = 0; i < 3; i++) {
      g.add(sky(box(0.9 - i * 0.02, 0.15, 1.6, porchMat)
        .translateX(4.1 + i * 0.34).translateY(0.42 - i * 0.15), 0.95));
    }
    // The front door. Dark, shut, and it has been shut the whole time.
    g.add(sky(box(0.08, 2.0, 0.9,
      new THREE.MeshStandardMaterial({ color: 0x2A211C, roughness: 0.7 }))
      .translateX(2.30).translateY(1.66).translateZ(0.2), 0.6));

    // Only the face we can see is dressed. Nobody has ever seen the back.
    const winMat = new THREE.MeshStandardMaterial({ color: 0x080a0e, roughness: 0.35, metalness: 0.1 });
    for (const [wy, wz] of [[1.9, -2.6], [1.9, 0.4], [1.9, 3.4], [4.5, -2.6], [4.5, 0.4], [4.5, 3.4]]) {
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.3), winMat.clone());
      w.position.set(2.27, wy, wz);
      w.rotation.y = Math.PI / 2;
      g.add(sky(w, 0.35));
      out(box(0.06, 1.5, 1.2, MAT.woodDark).translateX(-16 + 2.24).translateY(wy).translateZ(-1.5 + wz), 0.8);
    }

    // The curtain in the upstairs window. It twitches in the mornings
    // until it doesn't, and nothing in the game ever mentions that.
    const cur = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.2), MAT.curtain);
    cur.position.set(2.29, 4.5, 0.4);
    cur.rotation.y = Math.PI / 2;
    g.add(sky(cur, 0.9));
    dynamic.blueCurtain = cur;
    dynamic.blueCurtainHome = cur.position.z;

    // The window that gets broken, and stays broken. Boarded from inside by
    // somebody who then did not come back out.
    const broken = box(0.1, 1.4, 1.1,
      new THREE.MeshStandardMaterial({ color: 0x0A0B0D, roughness: 1 }));
    broken.position.set(2.33, 1.9, -2.6);
    broken.visible = false;
    g.add(sky(broken, 0.25));
    dynamic.brokenWindow = broken;
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
    out(c, 0.85);
    dynamic.cars.push(c);
  });
  dynamic.hisCar = dynamic.cars[1];

  /* --- streetlamp. Sodium, and the only warm thing outside. --- */
  {
    out(box(0.14, 7, 0.14, MAT.metal).translateX(-7.6).translateY(3.5).translateZ(-4), 0.75);
    out(box(1.4, 0.1, 0.1, MAT.metal).translateX(-8.3).translateY(6.9).translateZ(-4), 0.75);
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
    out(head, 0.6);
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
    out(b, 0.8);
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
  out(water, 0.55);
  dynamic.water = water;

  /* --- the sky itself. Unlit, unfogged, and its colour IS the weather. --- */
  const dome = new THREE.Mesh(new THREE.SphereGeometry(70, 16, 10), MAT.sky.clone());
  dome.position.y = 10;
  scene.add(dome);
  dynamic.sky = dome;

  /* --- smoke on the northern horizon. Not an effect: a place that is on
         fire, eleven blocks away, getting no better. --- */
  {
    const g = new THREE.Group();
    g.position.set(-26, 0, -30);
    root.add(g);
    dynamic.smokeCols = [];
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(9 + i * 3, 26 + i * 5),
        new THREE.MeshBasicMaterial({
          color: 0x2b2723, transparent: true, opacity: 0, depthWrite: false, fog: false,
        }));
      m.position.set(i * 3.5, 11 + i * 2, -i * 6);
      m.rotation.y = Math.PI / 2;
      g.add(m);
      dynamic.smokeCols.push(m);
    }
  }

  /* --- rain. Two crossed sheets of streaks, scrolled. Cheap, and through
         bars at twelve metres it is completely convincing. --- */
  {
    const g = new THREE.Group();
    g.position.set(-10, 6, 0);
    root.add(g);
    dynamic.rain = [];
    for (let i = 0; i < 2; i++) {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(22, 14),
        new THREE.MeshBasicMaterial({
          map: MAT.rainSheet, transparent: true, opacity: 0,
          depthWrite: false, fog: false,
        }));
      m.rotation.y = i ? 0.5 : -0.35;
      m.position.z = i ? -5 : 5;
      g.add(m);
      dynamic.rain.push(m);
    }
  }

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

    /**
     * The street, on a given day. Twenty days, and the arcs stretch across
     * all of them rather than finishing early and leaving the last week
     * static — a street that stopped changing on the fifteenth would tell
     * the player the game had stopped too.
     */
    applyDay(day) {
      const D = CONFIG.decay;

      // Rubbish arrives and never leaves.
      const span = Math.max(1, D.trashFullDay - D.trashFromDay);
      const n = day < D.trashFromDay ? 0
        : Math.min(dynamic.trash.length,
            Math.round(((day - D.trashFromDay) / span) * dynamic.trash.length));
      dynamic.trash.forEach((t, i) => { t.visible = i < n; });

      // The water comes up the street and does not go back down.
      dynamic.water.visible = day >= D.waterFromDay;
      dynamic.water.position.z = 8 - (day - D.waterFromDay) * D.waterPerDay;

      // The cars go one at a time. His does not move, ever, and that is the
      // whole point of his car: it is still there on the twentieth.
      for (const c of dynamic.cars) c.visible = true;
      for (const [d, i] of D.carsGone) {
        if (day >= d && dynamic.cars[i]) dynamic.cars[i].visible = false;
      }

      // A window across the street goes and stays gone.
      if (dynamic.brokenWindow) {
        dynamic.brokenWindow.visible = day >= D.houseBrokenFromDay;
      }

      void state;
    },
  };
}

export default buildStreet;
