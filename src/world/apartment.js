/**
 * apartment.js — the interior, built from boxes and planes.
 *
 * Low-poly on purpose. Lighting is the art budget (see config.light), and
 * in this much darkness a box is a wall. Nothing here loads a file.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { ROOMS, DOORS, WINDOW, CEIL, buildColliders } from './plan.js';
import { MAT, buildMaterials } from './materials.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

function place(mesh, x, y, z, ry = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  return mesh;
}

/** Repeat a texture without mutating the shared material. */
function tiled(mat, rx, ry) {
  const m = mat.clone();
  if (m.map) { m.map = m.map.clone(); m.map.needsUpdate = true; m.map.repeat.set(rx, ry); }
  return m;
}

export function buildApartment(scene) {
  buildMaterials();

  const root = new THREE.Group();
  root.name = 'apartment';
  scene.add(root);

  const anchors = {};   // name -> Object3D, used by interactables.js
  const lights = {};    // room -> { light, bulbMesh }
  const dynamic = {};   // things other modules animate

  /* ---------------------------------------------------------------- */
  /* floors + ceilings                                                 */
  /* ---------------------------------------------------------------- */
  const floorMat = {
    main: tiled(MAT.floorWood, 3, 4),
    kitchen: tiled(MAT.floorLino, 3, 3),
    hall: tiled(MAT.floorLino, 2, 1.5),
    bath: tiled(MAT.floorTile, 2, 3),
    bedroom: tiled(MAT.floorWood, 1.5, 2),
    landing: tiled(MAT.floorLino, 2, 1.5),
  };

  for (const [key, r] of Object.entries(ROOMS)) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat[key] || MAT.floorWood);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    floor.receiveShadow = true;
    root.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), tiled(MAT.ceiling, w / 4.5, d / 4.5));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, CEIL, cz);
    root.add(ceil);
  }

  /* ---------------------------------------------------------------- */
  /* walls, from the collider list so geometry and collision agree      */
  /* ---------------------------------------------------------------- */
  const colliders = buildColliders();
  const wallMat = (w, d, bath) =>
    tiled(bath ? MAT.wallBath : MAT.wall, Math.max(1, Math.max(w, d) * 0.6), 1.4);

  for (const c of colliders) {
    if (!c.tag.startsWith('wall') && !c.tag.startsWith('part')) continue;

    // The west wall has a hole in it. The hole is the whole game, so it is
    // cut out of the geometry in four pieces. The COLLIDER stays solid —
    // there is no glass, but there are bars, and nothing walks through it.
    if (c.tag === 'wall.west') { buildWestWall(root, c); continue; }

    const w = c.x1 - c.x0, d = c.z1 - c.z0;
    // Only the bath/bedroom divider is tiled. The rest of the flat is
    // plaster, damp, and paint over paint.
    const mat = wallMat(w, d, c.tag === 'part.bath');
    const m = place(box(w, CEIL, d, mat), c.x0 + w / 2, CEIL / 2, c.z0 + d / 2);
    m.castShadow = m.receiveShadow = true;
    root.add(m);
  }

  function buildWestWall(parent, c) {
    const W = WINDOW;
    const thick = c.x1 - c.x0;
    const cx = c.x0 + thick / 2;
    const z0 = W.z - W.width / 2, z1 = W.z + W.width / 2;
    const top = W.sill + W.height;

    const seg = (za, zb, y0, y1) => {
      const d = zb - za, hgt = y1 - y0;
      if (d <= 0.001 || hgt <= 0.001) return;
      const m = place(box(thick, hgt, d, wallMat(thick, d, false)),
        cx, y0 + hgt / 2, za + d / 2);
      m.castShadow = m.receiveShadow = true;
      parent.add(m);
    };

    seg(c.z0, z0, 0, CEIL);        // north of the opening
    seg(z1, c.z1, 0, CEIL);        // south of it
    seg(z0, z1, 0, W.sill);        // under the sill
    seg(z0, z1, top, CEIL);        // over the head
  }

  /* ---------------------------------------------------------------- */
  /* the window — bars in a frame with a curtain over them. No glass.   */
  /* ---------------------------------------------------------------- */
  {
    const W = WINDOW;
    const g = new THREE.Group();
    g.position.set(W.x, 0, W.z);
    root.add(g);

    // The opening itself is cut out of wall.west above. What lives here is
    // the frame, the bars and the curtain — the three things that make this
    // a hole with a cloth over it rather than a window.
    const hw = W.width / 2;
    const openTop = W.sill + W.height;

    // frame
    const frameMat = MAT.woodDark;
    g.add(place(box(0.09, 0.08, W.width + 0.14, frameMat), 0, W.sill - 0.03, 0));
    g.add(place(box(0.09, 0.08, W.width + 0.14, frameMat), 0, openTop + 0.03, 0));
    g.add(place(box(0.09, W.height + 0.14, 0.08, frameMat), 0, W.sill + W.height / 2, -hw - 0.03));
    g.add(place(box(0.09, W.height + 0.14, 0.08, frameMat), 0, W.sill + W.height / 2,  hw + 0.03));

    // bars — vertical, welded, outside the frame. Not a security upgrade
    // anyone chose. They came with the building.
    const barGeo = new THREE.CylinderGeometry(W.barRadius, W.barRadius, W.height + 0.08, 6);
    for (let i = 0; i < W.barCount; i++) {
      const t = (i + 0.5) / W.barCount;
      const bar = new THREE.Mesh(barGeo, MAT.metal);
      bar.position.set(-0.02, W.sill + W.height / 2, -hw + t * W.width);
      g.add(bar);
    }
    const railGeo = new THREE.CylinderGeometry(W.barRadius, W.barRadius, W.width, 6);
    for (const y of [W.sill + 0.06, openTop - 0.06]) {
      const rail = new THREE.Mesh(railGeo, MAT.metal);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(-0.02, y, 0);
      g.add(rail);
    }

    // curtain — a single hanging sheet on a wire. It slides on Z.
    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(W.width + 0.3, W.height + 0.34, 8, 2),
      tiled(MAT.curtain, 2, 1)
    );
    curtain.rotation.y = Math.PI / 2;
    curtain.position.set(0.07, W.sill + W.height / 2 + 0.05, 0);
    g.add(curtain);
    dynamic.curtain = curtain;
    dynamic.curtainClosedZ = 0;
    dynamic.curtainOpenZ = -(W.width + 0.24);

    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, W.width + 0.6, 4), MAT.metal);
    wire.rotation.x = Math.PI / 2;
    wire.position.set(0.07, openTop + 0.14, 0);
    g.add(wire);

    anchors.window  = place(new THREE.Object3D(), W.x + 0.55, W.sill + W.height / 2, W.z);
    anchors.curtain = anchors.window;
    root.add(anchors.window);

    // Daylight comes in here, unfiltered, because there is nothing in the way.
    const shaft = new THREE.PointLight(0xffffff, 0, CONFIG.light.windowShaft.distance, CONFIG.light.windowShaft.decay);
    shaft.position.set(W.x + 0.45, W.sill + W.height * 0.6, W.z);
    root.add(shaft);
    dynamic.windowShaft = shaft;
  }

  /* ---------------------------------------------------------------- */
  /* fixtures + furniture                                              */
  /* ---------------------------------------------------------------- */

  // --- main room: the mat you sleep on ---
  {
    const mat = place(box(1.7, 0.14, 1.5, MAT.fabric), -3.2, 0.07, 2.6);
    root.add(mat);
    const pillow = place(box(0.5, 0.12, 0.34, MAT.white), -3.85, 0.19, 2.0);
    root.add(pillow);
    const blanket = place(box(1.5, 0.06, 1.0, MAT.woodDark), -3.15, 0.17, 2.9);
    root.add(blanket);
    anchors.mat = place(new THREE.Object3D(), -3.2, 0.4, 2.6);
    root.add(anchors.mat);
  }

  // --- desk: computer, phone, and after Day 9, his keys ---
  {
    const desk = place(box(2.0, 0.06, 0.7, MAT.wood), -2.3, 0.74, -3.2);
    root.add(desk);
    for (const [dx, dz] of [[-0.92, -0.3], [0.92, -0.3], [-0.92, 0.3], [0.92, 0.3]]) {
      root.add(place(box(0.07, 0.72, 0.07, MAT.woodDark), -2.3 + dx, 0.36, -3.2 + dz));
    }

    // tower under the desk, monitor on it. Old. Beige under the dust.
    root.add(place(box(0.2, 0.42, 0.42, MAT.plasticGy), -3.05, 0.21, -3.25));
    const monBody = place(box(0.52, 0.42, 0.4, MAT.plasticGy), -2.55, 0.98, -3.3);
    root.add(monBody);
    const monScreen = place(new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.32), MAT.screenPC), -2.55, 0.99, -3.09);
    root.add(monScreen);
    dynamic.pcScreen = monScreen;
    root.add(place(box(0.4, 0.03, 0.15, MAT.plasticBk), -2.5, 0.79, -2.95));
    anchors.computer = place(new THREE.Object3D(), -2.5, 1.0, -2.75);
    root.add(anchors.computer);

    const pcLight = new THREE.PointLight(CONFIG.light.screen.computer.color, 0,
      CONFIG.light.screen.computer.distance, CONFIG.light.screen.computer.decay);
    pcLight.position.set(-2.55, 1.05, -2.95);
    root.add(pcLight);
    dynamic.pcLight = pcLight;

    // the phone, charging, face down
    const phone = place(box(0.075, 0.012, 0.15, MAT.plasticBk), -1.6, 0.78, -3.15);
    root.add(phone);
    const phScreen = place(new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.14), MAT.screenPh), -1.6, 0.787, -3.15);
    phScreen.rotation.x = -Math.PI / 2;
    root.add(phScreen);
    dynamic.phoneScreen = phScreen;
    anchors.phone = place(new THREE.Object3D(), -1.6, 0.85, -2.9);
    root.add(anchors.phone);

    const phLight = new THREE.PointLight(CONFIG.light.screen.phone.color, 0,
      CONFIG.light.screen.phone.distance, CONFIG.light.screen.phone.decay);
    phLight.position.set(-1.6, 0.86, -3.1);
    root.add(phLight);
    dynamic.phoneLight = phLight;

    // his keys and wallet appear here at the handoff
    const keys = place(box(0.09, 0.012, 0.05, MAT.metal), -1.15, 0.78, -3.35);
    keys.visible = false;
    root.add(keys);
    dynamic.keys = keys;
    anchors.keys = place(new THREE.Object3D(), -1.15, 0.85, -3.0);
    root.add(anchors.keys);

    // a chair that is not a desk chair
    root.add(place(box(0.44, 0.05, 0.42, MAT.wood), -3.75, 0.46, -1.7));
    root.add(place(box(0.44, 0.5, 0.05, MAT.wood), -3.75, 0.72, -1.92));
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
      root.add(place(box(0.045, 0.45, 0.045, MAT.woodDark), -3.75 + dx, 0.23, -1.7 + dz));
    }
  }

  // --- the TV, on a low stand, facing the mat ---
  {
    const stand = place(box(1.1, 0.5, 0.5, MAT.wood), 0.25, 0.25, 0.5);
    root.add(stand);
    const tv = place(box(0.62, 0.5, 0.55, MAT.plasticGy), 0.25, 0.78, 0.5);
    root.add(tv);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.38), MAT.screenTV);
    screen.position.set(-0.07, 0.8, 0.5);
    screen.rotation.y = -Math.PI / 2;
    root.add(screen);
    dynamic.tvScreen = screen;
    anchors.tv = place(new THREE.Object3D(), -0.5, 0.85, 0.5);
    root.add(anchors.tv);

    const tvLight = new THREE.PointLight(CONFIG.light.screen.tv.color, 0,
      CONFIG.light.screen.tv.distance, CONFIG.light.screen.tv.decay);
    tvLight.position.set(-0.25, 0.85, 0.5);
    root.add(tvLight);
    dynamic.tvLight = tvLight;
  }

  // --- the wall you mark the days on ---
  {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.9), makeTallyMaterial());
    panel.position.set(-1.6, 1.5, 3.58);
    panel.rotation.y = Math.PI;
    root.add(panel);
    dynamic.tally = panel;
    anchors.tally = place(new THREE.Object3D(), -1.6, 1.5, 3.1);
    root.add(anchors.tally);
  }

  // --- kitchen: counter, sink, hotplate, cabinets, fridge ---
  {
    const counter = place(box(2.15, 0.9, 0.65, MAT.wood), 2.22, 0.45, -3.22);
    root.add(counter);
    const top = place(box(2.2, 0.05, 0.7, MAT.plasticGy), 2.22, 0.92, -3.22);
    root.add(top);

    const sink = place(box(0.55, 0.16, 0.42, MAT.metal), 2.55, 0.88, -3.22);
    root.add(sink);
    const tap = place(box(0.04, 0.26, 0.04, MAT.metal), 2.55, 1.05, -3.45);
    root.add(tap);
    anchors.sink = place(new THREE.Object3D(), 2.55, 1.0, -2.75);
    root.add(anchors.sink);

    const hotplate = place(box(0.42, 0.07, 0.34, MAT.plasticBk), 1.55, 0.97, -3.2);
    root.add(hotplate);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.13, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, emissive: 0xff3b12, emissiveIntensity: 0 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(1.55, 1.01, -3.2);
    root.add(ring);
    dynamic.hotplateRing = ring;
    anchors.hotplate = place(new THREE.Object3D(), 1.55, 1.0, -2.75);
    root.add(anchors.hotplate);

    // cabinets above, which is where the cups are, which you never remember
    root.add(place(box(1.9, 0.6, 0.35, MAT.wood), 2.15, 1.85, -3.4));
    anchors.cabinets = place(new THREE.Object3D(), 2.15, 1.7, -2.9);
    root.add(anchors.cabinets);

    // fridge
    const fridge = place(box(0.78, 1.6, 0.98, MAT.white), 3.75, 0.8, -3.05);
    root.add(fridge);
    const doorPivot = new THREE.Group();
    doorPivot.position.set(3.36, 0.8, -3.54);
    root.add(doorPivot);
    const fdoor = place(box(0.06, 1.56, 0.96, MAT.white), 0.0, 0, 0.48);
    doorPivot.add(fdoor);
    dynamic.fridgeDoor = doorPivot;
    anchors.fridge = place(new THREE.Object3D(), 3.1, 1.1, -2.9);
    root.add(anchors.fridge);

    // what is left in it, as a visible countdown
    const shelfItems = new THREE.Group();
    shelfItems.position.set(3.75, 0, -3.05);
    root.add(shelfItems);
    dynamic.fridgeItems = [];
    for (let i = 0; i < 16; i++) {
      const it = box(0.09 + Math.random() * 0.05, 0.12 + Math.random() * 0.08, 0.09, MAT.plasticGy);
      it.position.set(
        -0.22 + (i % 4) * 0.15,
        0.42 + Math.floor(i / 4) * 0.31,
        -0.3 + ((i * 7) % 5) * 0.14
      );
      shelfItems.add(it);
      dynamic.fridgeItems.push(it);
    }
    for (let y of [0.35, 0.66, 0.97, 1.28]) {
      shelfItems.add(place(box(0.62, 0.02, 0.8, MAT.metal), 0, y, 0));
    }
  }

  // --- bathroom: the safe corner ---
  {
    root.add(place(box(0.4, 0.4, 0.55, MAT.white), 1.4, 0.2, 3.2));
    root.add(place(box(0.42, 0.5, 0.18, MAT.white), 1.4, 0.45, 3.42));
    root.add(place(box(0.5, 0.15, 0.42, MAT.white), 2.2, 0.85, 3.28));
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x1a1e22, roughness: 0.15, metalness: 0.9 }));
    mirror.position.set(2.2, 1.45, 3.56);
    mirror.rotation.y = Math.PI;
    root.add(mirror);
    // tub, along the west wall of the bathroom
    root.add(place(box(0.7, 0.5, 1.5, MAT.white), 1.42, 0.25, 1.9));
    anchors.bathroom = place(new THREE.Object3D(), 1.7, 1.2, 2.3);
    root.add(anchors.bathroom);
  }

  // --- his room ---
  {
    const bed = place(box(1.5, 0.4, 1.1, MAT.wood), 3.4, 0.2, 2.95);
    root.add(bed);
    root.add(place(box(1.45, 0.16, 1.05, MAT.fabric), 3.4, 0.48, 2.95));

    const desk = place(box(0.9, 0.05, 0.55, MAT.wood), 3.05, 0.73, 1.45);
    root.add(desk);
    for (const [dx, dz] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]]) {
      root.add(place(box(0.06, 0.72, 0.06, MAT.woodDark), 3.05 + dx, 0.36, 1.45 + dz));
    }
    // his laptop, closed, and then not
    const laptop = place(box(0.34, 0.02, 0.24, MAT.plasticBk), 3.0, 0.77, 1.42);
    root.add(laptop);
    anchors.laptop = place(new THREE.Object3D(), 3.0, 0.95, 1.75);
    root.add(anchors.laptop);

    // his notes, in a drift across the desk and the floor
    const notes = new THREE.Group();
    root.add(notes);
    for (let i = 0; i < 9; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.26), MAT.paper);
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = Math.random() * 3;
      p.position.set(2.7 + Math.random() * 1.3, 0.78 + (i > 4 ? -0.77 : 0), 1.2 + Math.random() * 1.6);
      notes.add(p);
    }
    dynamic.notesGroup = notes;
    anchors.notes = place(new THREE.Object3D(), 3.3, 0.9, 1.9);
    root.add(anchors.notes);

    // the dresser. The top drawer is open and it is empty and it should not be.
    const dresser = place(box(0.5, 1.1, 0.75, MAT.wood), 3.9, 0.55, 1.55);
    root.add(dresser);
    const drawer = place(box(0.44, 0.2, 0.3, MAT.woodDark), 3.62, 0.88, 1.55);
    root.add(drawer);
    anchors.dresser = place(new THREE.Object3D(), 3.4, 1.0, 1.55);
    root.add(anchors.dresser);
  }

  // --- the landing: the shotgun, the front door, and the stairs down ---
  {
    // stair shaft: a hole with a rail. You can see down it. There is nothing.
    const shaftFloorCut = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.25),
      new THREE.MeshBasicMaterial({ color: 0x000000 }));
    shaftFloorCut.rotation.x = -Math.PI / 2;
    shaftFloorCut.position.set(6.05, 0.01, 0.3);
    root.add(shaftFloorCut);
    for (const [x, z, w, d] of [[5.55, 0.3, 0.06, 1.3], [6.05, -0.35, 1.0, 0.06]]) {
      root.add(place(box(w, 0.95, d, MAT.metal), x, 0.5, z));
    }

    const doorPivot = new THREE.Group();
    doorPivot.position.set(6.58, 0, -0.32);
    root.add(doorPivot);
    const doorMesh = place(box(0.07, 2.05, 0.88, MAT.woodDark), 0, 1.03, 0.44);
    doorPivot.add(doorMesh);
    dynamic.frontDoor = doorPivot;
    anchors.frontDoor = place(new THREE.Object3D(), 6.1, 1.2, 0.15);
    root.add(anchors.frontDoor);
    // chain and deadbolt
    doorPivot.add(place(box(0.05, 0.05, 0.16, MAT.metal), -0.04, 1.45, 0.12));

    // the shotgun, leaning in the corner where he left it on the first day
    const gun = new THREE.Group();
    gun.position.set(4.45, 0, 0.82);
    gun.rotation.z = 0.18;
    root.add(gun);
    gun.add(place(box(0.05, 0.72, 0.05, MAT.metal), 0, 0.75, 0));
    gun.add(place(box(0.06, 0.42, 0.08, MAT.woodDark), 0, 0.24, 0.01));
    gun.add(place(box(0.05, 0.3, 0.06, MAT.woodDark), 0, 1.2, 0));
    dynamic.shotgun = gun;
    anchors.shotgun = place(new THREE.Object3D(), 4.6, 0.9, 0.6);
    root.add(anchors.shotgun);
  }

  /* ---------------------------------------------------------------- */
  /* interior lights — one bare bulb per room, all of them a liability  */
  /* ---------------------------------------------------------------- */
  const bulbPos = {
    main:    [-1.8, CEIL - 0.18, 0.0],
    kitchen: [ 2.6, CEIL - 0.18, -2.0],
    bath:    [ 1.75, CEIL - 0.18, 2.3],
    bedroom: [ 3.35, CEIL - 0.18, 2.3],
    landing: [ 5.4, CEIL - 0.18, 0.3],
  };
  for (const [room, p] of Object.entries(bulbPos)) {
    const cfg = CONFIG.light.bulb[room];
    const l = new THREE.PointLight(cfg.color, 0, cfg.distance, cfg.decay);
    l.position.set(p[0], p[1], p[2]);
    root.add(l);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x2a2620, emissive: cfg.color, emissiveIntensity: 0 }));
    bulb.position.copy(l.position);
    root.add(bulb);
    root.add(place(box(0.01, 0.2, 0.01, MAT.metal), p[0], p[1] + 0.12, p[2]));
    lights[room] = { light: l, bulb, cfg };
  }

  // switches, on the wall by each doorway
  const switchPos = {
    main:    [ 0.86, 1.15, 0.35],
    kitchen: [ 1.12, 1.15, -1.75],
    bath:    [ 1.15, 1.15, 0.86],
    bedroom: [ 3.0,  1.15, 0.86],
    landing: [ 4.32, 1.15, 0.9],
  };
  for (const [room, p] of Object.entries(switchPos)) {
    const s = place(box(0.09, 0.13, 0.03, MAT.plasticGy), p[0], p[1], p[2]);
    root.add(s);
    anchors['switch.' + room] = place(new THREE.Object3D(), p[0], p[1], p[2]);
    root.add(anchors['switch.' + room]);
  }

  /* the ambient fill and the fog live on the scene, tuned per phase */
  const ambient = new THREE.AmbientLight(0xffffff, 0.1);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x4a5566, 0x181410, 0.15);
  scene.add(hemi);

  return { root, anchors, lights, dynamic, colliders, ambient, hemi };
}

/** The tally wall, drawn to a canvas and redrawn each time a day is marked. */
function makeTallyMaterial() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 384;
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95, transparent: true });
  m.userData.canvas = c;
  m.userData.texture = t;
  drawTally(m, 0);
  return m;
}

export function drawTally(material, count) {
  const c = material.userData.canvas;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.strokeStyle = 'rgba(24,20,18,0.88)';
  g.lineWidth = 7;
  g.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const grp = Math.floor(i / 5), inGrp = i % 5;
    const bx = 46 + (grp % 4) * 112;
    const by = 70 + Math.floor(grp / 4) * 130;
    g.beginPath();
    if (inGrp < 4) {
      const x = bx + inGrp * 17 + (Math.random() * 3 - 1.5);
      g.moveTo(x, by); g.lineTo(x + (Math.random() * 6 - 3), by + 74);
    } else {
      g.moveTo(bx - 8, by + 66); g.lineTo(bx + 62, by + 6);
    }
    g.stroke();
  }
  material.userData.texture.needsUpdate = true;
}

export default buildApartment;
