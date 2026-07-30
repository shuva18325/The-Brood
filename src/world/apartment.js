/**
 * apartment.js — the interior, built from boxes and planes.
 *
 * Low-poly on purpose. Lighting is the art budget: do not add detail, add
 * darkness. Nothing here loads a file.
 *
 * The single most important object in this file is the spotlight outside
 * the window. It is what throws the bars across the floor.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import { ROOMS, WINDOW, CEIL, buildColliders } from './plan.js';
import { MAT, buildMaterials } from './materials.js';

const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

function place(mesh, x, y, z, ry = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  return mesh;
}

function shade(mesh, cast = true, receive = true) {
  mesh.castShadow = cast; mesh.receiveShadow = receive;
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

  const anchors = {};
  const lights = {};
  const dynamic = {};

  /* ---------------------------------------------------------------- */
  /* floors + ceilings                                                 */
  /* ---------------------------------------------------------------- */
  const floorMat = {
    main:    tiled(MAT.floorWood, 2.4, 3.2),
    kitchen: tiled(MAT.floorLino, 2.2, 2.2),
    hall:    tiled(MAT.floorLino, 1.6, 1.0),
    bath:    tiled(MAT.floorTile, 1.6, 2.4),
    bedroom: tiled(MAT.floorWood, 1.2, 1.6),
    landing: tiled(MAT.floorLino, 1.6, 1.0),
  };

  for (const [key, r] of Object.entries(ROOMS)) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorMat[key] || MAT.floorWood);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0, cz);
    floor.receiveShadow = true;
    root.add(floor);

    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), tiled(MAT.ceiling, w / 3.2, d / 3.2));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, CEIL, cz);
    ceil.receiveShadow = true;
    root.add(ceil);

    // Skirting. Painted the same white as the wall, chipped at the corners.
    const sk = (x, z, w2, d2) => root.add(shade(place(box(w2, 0.09, d2, MAT.plasticGy), x, 0.045, z), false, true));
    sk(cx, r.z0 + 0.03, w, 0.06);
    sk(cx, r.z1 - 0.03, w, 0.06);
    sk(r.x0 + 0.03, cz, 0.06, d);
    sk(r.x1 - 0.03, cz, 0.06, d);
  }

  /* A roof. Never seen — the camera is always under the ceiling — but
   * without it the window spotlight's cone clears the tops of the walls
   * and floods the interior from above, and the bar-shadows drown. */
  {
    const roof = box(12.2, 0.4, 8.6, MAT.brick);
    roof.position.set(1.2, CEIL + 0.24, 0);
    roof.castShadow = true;
    roof.receiveShadow = false;
    root.add(roof);
  }

  /* ---------------------------------------------------------------- */
  /* walls                                                             */
  /* ---------------------------------------------------------------- */
  const colliders = buildColliders();
  const wallMat = (w, d, kind) => {
    const base = kind === 'bath' ? MAT.wallBath : kind === 'stain' ? MAT.wallStained : MAT.wall;
    return tiled(base, Math.max(1, Math.max(w, d) * 0.5), 1.2);
  };

  for (const c of colliders) {
    if (!c.tag.startsWith('wall') && !c.tag.startsWith('part')) continue;
    if (c.tag === 'wall.west') { buildWestWall(root, c); continue; }

    const w = c.x1 - c.x0, d = c.z1 - c.z0;
    // The patched water stain is on the north wall, by the kitchen.
    const kind = c.tag === 'part.bath' ? 'bath'
               : (c.tag === 'wall.north' ? 'stain' : 'plain');
    root.add(shade(place(box(w, CEIL, d, wallMat(w, d, kind)),
      c.x0 + w / 2, CEIL / 2, c.z0 + d / 2)));
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
      parent.add(shade(place(box(thick, hgt, d, wallMat(thick, d, 'plain')),
        cx, y0 + hgt / 2, za + d / 2)));
    };
    seg(c.z0, z0, 0, CEIL);
    seg(z1, c.z1, 0, CEIL);
    seg(z0, z1, 0, W.sill);
    seg(z0, z1, top, CEIL);
  }

  /* ================================================================ */
  /* THE WINDOW                                                        */
  /*                                                                   */
  /* Bars with a curtain over them. Not glass in a frame. It is a       */
  /* poverty detail, a security feature that keeps things out, and the  */
  /* reason he cannot get out — the same object, three times, and the   */
  /* game never says any of it.                                         */
  /* ================================================================ */
  {
    const W = WINDOW;
    const g = new THREE.Group();
    g.position.set(W.x, 0, W.z);
    root.add(g);

    const hw = W.width / 2;
    const openTop = W.sill + W.height;

    // The reveal — the wall is 140mm thick and you can see that it is.
    const reveal = MAT.wall;
    g.add(shade(place(box(0.14, 0.05, W.width, reveal), 0, W.sill + 0.02, 0), false, true));

    // Frame: painted timber, and the paint is thick.
    const fm = MAT.plasticGy;
    g.add(shade(place(box(0.12, 0.075, W.width + 0.16, fm), 0.005, W.sill - 0.03, 0)));
    g.add(shade(place(box(0.12, 0.075, W.width + 0.16, fm), 0.005, openTop + 0.03, 0)));
    g.add(shade(place(box(0.12, W.height + 0.16, 0.075, fm), 0.005, W.sill + W.height / 2, -hw - 0.03)));
    g.add(shade(place(box(0.12, W.height + 0.16, 0.075, fm), 0.005, W.sill + W.height / 2,  hw + 0.03)));

    /* --- THE BARS. Everything about this build is downstream of these.
     * Square section, not round: a flat face throws a harder edge, and
     * the hard edge is the entire point of the image. */
    const barGeo = new THREE.BoxGeometry(W.barRadius * 2, W.height + 0.10, W.barRadius * 2);
    dynamic.bars = [];
    for (let i = 0; i < W.barCount; i++) {
      const t = (i + 0.5) / W.barCount;
      const bar = new THREE.Mesh(barGeo, MAT.barMetal);
      bar.position.set(-0.035, W.sill + W.height / 2, -hw + t * W.width);
      bar.castShadow = true;               // the whole point
      bar.receiveShadow = false;
      g.add(bar);
      dynamic.bars.push(bar);
    }
    const railGeo = new THREE.CylinderGeometry(W.barRadius * 0.9, W.barRadius * 0.9, W.width, 8);
    for (const y of [W.sill + 0.07, openTop - 0.07]) {
      const rail = new THREE.Mesh(railGeo, MAT.barMetal);
      rail.rotation.x = Math.PI / 2;
      rail.position.set(-0.035, y, 0);
      rail.castShadow = true;
      g.add(rail);
    }
    // Bolt plates, where the rust comes from.
    for (const z of [-hw + 0.04, hw - 0.04]) {
      for (const y of [W.sill + 0.07, openTop - 0.07]) {
        g.add(shade(place(box(0.03, 0.07, 0.07, MAT.barMetal), -0.035, y, z)));
      }
    }

    // The curtain. A single sheet on a wire, and it slides on Z.
    const curtain = new THREE.Mesh(
      new THREE.PlaneGeometry(W.width + 0.34, W.height + 0.38, 10, 2),
      tiled(MAT.curtain, 2, 1)
    );
    // Give it some hang so it is cloth rather than a card.
    const pos = curtain.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setZ(i, Math.sin((x / (W.width + 0.34) + 0.5) * Math.PI * 5) * 0.022);
    }
    curtain.geometry.computeVertexNormals();
    curtain.rotation.y = Math.PI / 2;
    curtain.position.set(0.085, W.sill + W.height / 2 + 0.06, 0);
    curtain.castShadow = true;
    curtain.receiveShadow = true;
    g.add(curtain);
    dynamic.curtain = curtain;
    dynamic.curtainClosedZ = 0;
    dynamic.curtainOpenZ = -(W.width + 0.26);

    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, W.width + 0.7, 4), MAT.metal);
    wire.rotation.x = Math.PI / 2;
    wire.position.set(0.085, openTop + 0.16, 0);
    g.add(wire);

    anchors.window  = place(new THREE.Object3D(), W.x + 0.55, W.sill + W.height / 2, W.z);
    anchors.curtain = anchors.window;
    root.add(anchors.window);

    /* --- THE LIGHT THROUGH THE BARS --------------------------------
     * One spotlight, outside, aimed in. Its colour is the time of day.
     * Its existence is the curtain. It casts, always — the bar-shadows
     * are the signature image of the game and they are never faked.
     */
    const S = CONFIG.light.windowShaft;
    const spot = new THREE.SpotLight(0xffffff, 0, S.distance, S.angle, S.penumbra, S.decay);
    spot.position.set(S.from[0], S.from[1], S.from[2]);
    spot.castShadow = true;
    spot.shadow.mapSize.set(CONFIG.render.shadowMapSize, CONFIG.render.shadowMapSize);
    spot.shadow.bias = S.shadowBias;
    spot.shadow.normalBias = S.shadowNormalBias;
    spot.shadow.camera.near = 1.0;
    spot.shadow.camera.far = 30;
    scene.add(spot);
    const target = new THREE.Object3D();
    target.position.set(S.to[0], S.to[1], S.to[2]);
    scene.add(target);
    spot.target = target;
    dynamic.windowShaft = spot;
    dynamic.windowShaftTarget = target;

    /* --- and the daylight that does not come in a beam ---------------
     * The same aperture, the other half of the same light: sky bounce,
     * wide, soft, shadowless, and worth nothing after sunset. Without it
     * a daytime room with an open window renders as a night room with a
     * stripe in it, because there is no bounce light in a rasteriser.
     */
    const F = CONFIG.light.windowFill;
    const fill = new THREE.SpotLight(0xffffff, 0, F.distance, F.angle, F.penumbra, F.decay);
    fill.position.set(F.from[0], F.from[1], F.from[2]);
    fill.castShadow = true;
    fill.shadow.mapSize.set(1024, 1024);
    fill.shadow.bias = F.shadowBias;
    fill.shadow.normalBias = F.shadowNormalBias;
    fill.shadow.camera.near = 0.4;
    fill.shadow.camera.far = 18;
    scene.add(fill);
    const fillTarget = new THREE.Object3D();
    fillTarget.position.set(F.to[0], F.to[1], F.to[2]);
    scene.add(fillTarget);
    fill.target = fillTarget;
    dynamic.windowFill = fill;
  }

  /* ---------------------------------------------------------------- */
  /* main room                                                         */
  /* ---------------------------------------------------------------- */

  // The mat. Thin, folded at one end, and a blanket that matches nothing.
  {
    root.add(shade(place(box(1.7, 0.11, 1.5, MAT.fabric), -3.2, 0.055, 2.6)));
    root.add(shade(place(box(0.52, 0.10, 0.34, MAT.white), -3.85, 0.16, 2.0)));
    root.add(shade(place(box(1.42, 0.07, 0.95, MAT.blanket), -3.15, 0.14, 2.95)));
    // the fold at one end — it has been folded in the same place for days
    root.add(shade(place(box(1.42, 0.10, 0.26, MAT.blanket), -3.15, 0.19, 3.36)));
    anchors.mat = place(new THREE.Object3D(), -3.2, 0.4, 2.6);
    root.add(anchors.mat);
  }

  // Desk, computer, phone, and after Day 9, his keys.
  {
    root.add(shade(place(box(2.0, 0.05, 0.7, MAT.wood), -2.3, 0.74, -3.2)));
    for (const [dx, dz] of [[-0.92, -0.3], [0.92, -0.3], [-0.92, 0.3], [0.92, 0.3]]) {
      root.add(shade(place(box(0.06, 0.72, 0.06, MAT.woodDark), -2.3 + dx, 0.36, -3.2 + dz)));
    }

    // Tower under the desk. Beige-going-yellow, dust in the vents, and a
    // fan you can see does not spin evenly.
    const tower = shade(place(box(0.19, 0.42, 0.44, MAT.beige), -3.05, 0.21, -3.25));
    root.add(tower);
    for (let i = 0; i < 7; i++) {
      root.add(place(box(0.005, 0.012, 0.30, MAT.plasticBk), -2.955, 0.30 - i * 0.022, -3.25));
    }
    const fan = new THREE.Mesh(new THREE.CircleGeometry(0.055, 5), MAT.plasticBk);
    fan.rotation.y = -Math.PI / 2;
    fan.position.set(-2.954, 0.12, -3.25);
    root.add(fan);
    dynamic.pcFan = fan;

    const monBody = shade(place(box(0.5, 0.42, 0.44, MAT.beige), -2.55, 0.98, -3.3));
    root.add(monBody);
    root.add(shade(place(box(0.24, 0.05, 0.22, MAT.beige), -2.55, 0.78, -3.28)));
    const monScreen = place(new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.30), MAT.screenPC), -2.55, 0.99, -3.077);
    root.add(monScreen);
    dynamic.pcScreen = monScreen;

    root.add(shade(place(box(0.42, 0.025, 0.15, MAT.beige), -2.5, 0.775, -2.94)));
    anchors.computer = place(new THREE.Object3D(), -2.5, 1.0, -2.75);
    root.add(anchors.computer);

    const pcLight = new THREE.PointLight(CONFIG.light.screen.computer.color, 0,
      CONFIG.light.screen.computer.distance, CONFIG.light.screen.computer.decay);
    pcLight.position.set(-2.55, 1.05, -2.92);
    root.add(pcLight);
    dynamic.pcLight = pcLight;

    // The phone, charging, face down.
    root.add(shade(place(box(0.075, 0.011, 0.15, MAT.plasticBk), -1.6, 0.775, -3.15)));
    const phScreen = place(new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.14), MAT.screenPh), -1.6, 0.782, -3.15);
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

    // His keys and wallet, from the handoff.
    const keys = shade(place(box(0.085, 0.010, 0.05, MAT.metal), -1.15, 0.775, -3.35));
    keys.visible = false;
    root.add(keys);
    dynamic.keys = keys;
    const wallet = shade(place(box(0.11, 0.022, 0.085, MAT.woodDark), -0.95, 0.782, -3.22));
    wallet.visible = false;
    root.add(wallet);
    dynamic.wallet = wallet;
    anchors.keys = place(new THREE.Object3D(), -1.15, 0.85, -3.0);
    root.add(anchors.keys);

    // A chair that is not a desk chair.
    root.add(shade(place(box(0.44, 0.045, 0.42, MAT.wood), -3.75, 0.46, -1.7)));
    root.add(shade(place(box(0.44, 0.5, 0.045, MAT.wood), -3.75, 0.72, -1.92)));
    for (const [dx, dz] of [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]]) {
      root.add(shade(place(box(0.04, 0.45, 0.04, MAT.woodDark), -3.75 + dx, 0.23, -1.7 + dz)));
    }
  }

  /* The TV. Deep-bodied, dusty, and a remote with the buttons worn off.
   *
   * It stands against the partition SOUTH of the doorway, not in front of it.
   * It used to sit squarely in the only route from the main room to the rest
   * of the flat, which is the entire reason the player could not get out of
   * the hall: there was no way through. Furniture in a doorway is a bug, not
   * a detail. It is also better here — he sleeps on the floor facing it. */
  {
    const TZ = 1.95;
    root.add(shade(place(box(1.1, 0.48, 0.5, MAT.wood), 0.25, 0.24, TZ)));
    root.add(shade(place(box(0.66, 0.52, 0.58, MAT.beige), 0.25, 0.76, TZ)));
    // the bezel is deeper than the screen, which is what makes it a CRT
    root.add(shade(place(box(0.06, 0.46, 0.52, MAT.beige), -0.07, 0.78, TZ)));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.35), MAT.screenTV);
    screen.position.set(-0.098, 0.78, TZ);
    screen.rotation.y = -Math.PI / 2;
    root.add(screen);
    dynamic.tvScreen = screen;
    anchors.tv = place(new THREE.Object3D(), -0.55, 0.85, TZ);
    root.add(anchors.tv);

    const remote = shade(place(box(0.05, 0.02, 0.16, MAT.plasticBk), 0.3, 0.50, TZ + 0.4));
    remote.rotation.y = 0.4;
    root.add(remote);

    const tvLight = new THREE.PointLight(CONFIG.light.screen.tv.color, 0,
      CONFIG.light.screen.tv.distance, CONFIG.light.screen.tv.decay);
    tvLight.position.set(-0.3, 0.85, TZ);
    root.add(tvLight);
    dynamic.tvLight = tvLight;
  }

  // The wall he marks the days on.
  {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.25, 0.95), makeTallyMaterial());
    panel.position.set(-1.6, 1.5, 3.565);
    panel.rotation.y = Math.PI;
    root.add(panel);
    dynamic.tally = panel;
    anchors.tally = place(new THREE.Object3D(), -1.6, 1.5, 3.1);
    root.add(anchors.tally);
  }

  /* ---------------------------------------------------------------- */
  /* kitchen                                                           */
  /* ---------------------------------------------------------------- */
  {
    root.add(shade(place(box(2.15, 0.88, 0.65, MAT.wood), 2.22, 0.44, -3.22)));
    root.add(shade(place(box(2.2, 0.045, 0.7, MAT.plasticGy), 2.22, 0.91, -3.22)));

    // Sink, and the dishes that accumulate in it and then stop.
    root.add(shade(place(box(0.55, 0.15, 0.42, MAT.metal), 2.55, 0.86, -3.22)));
    root.add(shade(place(box(0.035, 0.26, 0.035, MAT.metal), 2.55, 1.03, -3.44)));
    anchors.sink = place(new THREE.Object3D(), 2.55, 1.0, -2.75);
    root.add(anchors.sink);

    dynamic.dishes = [];
    for (let i = 0; i < CONFIG.decay.dishes.max; i++) {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085 + Math.random() * 0.02, 0.075, 0.014, 12),
        MAT.porcelain);
      plate.position.set(2.42 + (i % 3) * 0.10, 0.90 + Math.floor(i / 3) * 0.02, -3.30 + (i % 2) * 0.11);
      plate.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.4);
      plate.visible = false;
      shade(plate);
      root.add(plate);
      dynamic.dishes.push(plate);
    }

    // Hotplate. It trips the breaker, which is why they eat cold.
    root.add(shade(place(box(0.42, 0.065, 0.34, MAT.plasticBk), 1.55, 0.95, -3.2)));
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.055, 0.125, 20),
      new THREE.MeshStandardMaterial({ color: 0x141414, emissive: 0xff3b12, emissiveIntensity: 0, toneMapped: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(1.55, 0.985, -3.2);
    root.add(ring);
    dynamic.hotplateRing = ring;
    anchors.hotplate = place(new THREE.Object3D(), 1.55, 1.0, -2.75);
    root.add(anchors.hotplate);

    // Cabinets. The cups are behind the plates, which is not where cups go.
    root.add(shade(place(box(1.9, 0.6, 0.35, MAT.wood), 2.15, 1.85, -3.4)));
    root.add(shade(place(box(1.86, 0.03, 0.02, MAT.plasticGy), 2.15, 1.56, -3.23)));
    anchors.cabinets = place(new THREE.Object3D(), 2.15, 1.7, -2.9);
    root.add(anchors.cabinets);

    // The fridge. A discontinued colour, one hinge slightly wrong.
    root.add(shade(place(box(0.78, 1.58, 0.98, MAT.white), 3.75, 0.79, -3.05)));
    const doorPivot = new THREE.Group();
    doorPivot.position.set(3.36, 0.79, -3.54);
    root.add(doorPivot);
    const fdoor = shade(place(box(0.055, 1.54, 0.96, MAT.white), 0, 0, 0.48));
    fdoor.rotation.z = 0.008;            // the hinge
    doorPivot.add(fdoor);
    doorPivot.add(shade(place(box(0.035, 0.5, 0.035, MAT.plasticGy), -0.03, 0.1, 0.9)));
    // magnets and a takeout menu nobody is going to call
    doorPivot.add(place(box(0.004, 0.16, 0.11, MAT.paper), -0.03, 0.35, 0.62));
    for (const [my, mz, mc] of [[0.62, 0.30, 0xa8433a], [0.58, 0.72, 0x3f6a4a], [0.05, 0.78, 0xb8a24a]]) {
      doorPivot.add(place(box(0.006, 0.045, 0.045,
        new THREE.MeshStandardMaterial({ color: mc, roughness: 0.7 })), -0.03, my, mz));
    }
    dynamic.fridgeDoor = doorPivot;
    anchors.fridge = place(new THREE.Object3D(), 3.1, 1.1, -2.9);
    root.add(anchors.fridge);

    // What is left in it, as a visible countdown, shelf by shelf.
    const shelfItems = new THREE.Group();
    shelfItems.position.set(3.75, 0, -3.05);
    root.add(shelfItems);
    dynamic.fridgeItems = [];
    const jarMats = [MAT.plasticGy, MAT.paper, MAT.white];
    for (let i = 0; i < 16; i++) {
      const it = shade(box(0.085 + Math.random() * 0.05, 0.11 + Math.random() * 0.09, 0.085,
        jarMats[i % jarMats.length]));
      it.position.set(-0.22 + (i % 4) * 0.15,
                      0.40 + Math.floor(i / 4) * 0.31,
                      -0.30 + ((i * 7) % 5) * 0.14);
      shelfItems.add(it);
      dynamic.fridgeItems.push(it);
    }
    for (const y of [0.33, 0.64, 0.95, 1.26]) {
      shelfItems.add(place(box(0.62, 0.015, 0.8, MAT.metal), 0, y, 0));
    }
    const fridgeLight = new THREE.PointLight(0xd8e0c8, 0, 1.6, 2.2);
    fridgeLight.position.set(3.4, 1.0, -3.05);
    root.add(fridgeLight);
    dynamic.fridgeLight = fridgeLight;
  }

  /* ---------------------------------------------------------------- */
  /* bathroom — the safe corner. No window. That is the whole reason.   */
  /* ---------------------------------------------------------------- */
  {
    root.add(shade(place(box(0.4, 0.4, 0.55, MAT.porcelain), 1.4, 0.2, 3.2)));
    root.add(shade(place(box(0.42, 0.5, 0.18, MAT.porcelain), 1.4, 0.45, 3.42)));
    root.add(shade(place(box(0.5, 0.14, 0.42, MAT.porcelain), 2.2, 0.84, 3.28)));
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x14181c, roughness: 0.1, metalness: 0.95 }));
    mirror.position.set(2.2, 1.45, 3.55);
    mirror.rotation.y = Math.PI;
    root.add(mirror);
    dynamic.mirror = mirror;
    root.add(shade(place(box(0.7, 0.5, 1.5, MAT.porcelain), 1.42, 0.25, 1.9)));
    anchors.bathroom = place(new THREE.Object3D(), 1.7, 1.2, 2.3);
    root.add(anchors.bathroom);
  }

  /* ---------------------------------------------------------------- */
  /* his room — the only room in the game that feels lived in           */
  /* ---------------------------------------------------------------- */
  /* Laid out around a walking lane. The desk used to sit square across the
   * doorway and the dresser finished the job, so his room was sealed off by
   * its own furniture. Everything is against a wall now, and the lane from
   * the door to the bed is 780 mm of clear floor. */
  {
    // The bed, south-east corner.
    root.add(shade(place(box(1.05, 0.38, 1.15, MAT.wood), 3.62, 0.19, 2.97)));
    root.add(shade(place(box(1.00, 0.15, 1.10, MAT.fabric), 3.62, 0.46, 2.97)));
    root.add(shade(place(box(0.96, 0.06, 1.00, MAT.blanket), 3.62, 0.56, 3.02)));
    root.add(shade(place(box(0.42, 0.10, 0.30, MAT.white), 3.45, 0.58, 2.62)));

    // The desk, against the east wall, north end. Clear of the doorway.
    root.add(shade(place(box(0.36, 0.045, 0.84, MAT.wood), 3.96, 0.73, 1.56)));
    for (const [dx, dz] of [[-0.14, -0.36], [0.14, -0.36], [-0.14, 0.36], [0.14, 0.36]]) {
      root.add(shade(place(box(0.055, 0.72, 0.055, MAT.woodDark), 3.96 + dx, 0.36, 1.56 + dz)));
    }
    const laptop = shade(place(box(0.26, 0.018, 0.32, MAT.plasticBk), 3.95, 0.765, 1.50));
    laptop.rotation.y = -0.2;
    root.add(laptop);
    anchors.laptop = place(new THREE.Object3D(), 3.62, 0.95, 1.50);
    root.add(anchors.laptop);

    // His notes, in a drift across the desk and the floor.
    const notes = new THREE.Group();
    root.add(notes);
    for (let i = 0; i < 11; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.26), MAT.paper);
      p.rotation.x = -Math.PI / 2;
      p.rotation.z = Math.random() * 3;
      // On the desk, or on the floor of the lane, where he dropped them.
      const onDesk = i <= 4;
      p.position.set(
        onDesk ? 3.80 + Math.random() * 0.32 : 3.05 + Math.random() * 0.70,
        onDesk ? 0.757 : 0.01,
        onDesk ? 1.25 + Math.random() * 0.60 : 1.30 + Math.random() * 1.00);
      p.receiveShadow = true;
      notes.add(p);
    }
    dynamic.notesGroup = notes;
    anchors.notes = place(new THREE.Object3D(), 3.55, 0.9, 1.70);
    root.add(anchors.notes);

    // The dresser. The top drawer is open and it is empty and it should not be.
    root.add(shade(place(box(0.40, 1.1, 0.86, MAT.wood), 2.79, 0.55, 3.00)));
    root.add(shade(place(box(0.34, 0.2, 0.36, MAT.woodDark), 3.04, 0.88, 3.00)));
    anchors.dresser = place(new THREE.Object3D(), 3.20, 1.0, 3.00);
    root.add(anchors.dresser);

    // A photograph on the wall. The only picture in the apartment.
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.22), MAT.paper);
    pic.position.set(2.58, 1.55, 1.85);
    pic.rotation.y = Math.PI / 2;
    root.add(pic);
  }

  /* ---------------------------------------------------------------- */
  /* the landing                                                       */
  /* ---------------------------------------------------------------- */
  {
    const shaftCut = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.25),
      new THREE.MeshBasicMaterial({ color: 0x000000 }));
    shaftCut.rotation.x = -Math.PI / 2;
    shaftCut.position.set(6.05, 0.012, 0.3);
    root.add(shaftCut);
    for (const [x, z, w, d] of [[5.55, 0.3, 0.05, 1.3], [6.05, -0.35, 1.0, 0.05]]) {
      root.add(shade(place(box(w, 0.95, d, MAT.metal), x, 0.5, z)));
    }

    const doorPivot = new THREE.Group();
    doorPivot.position.set(6.58, 0, -0.32);
    root.add(doorPivot);
    doorPivot.add(shade(place(box(0.065, 2.05, 0.88, MAT.woodDark), 0, 1.03, 0.44)));
    // The two-by-four he screwed across it on the sixth day.
    doorPivot.add(shade(place(box(0.09, 0.09, 1.05, MAT.wood), -0.07, 1.15, 0.44)));
    doorPivot.add(shade(place(box(0.045, 0.045, 0.15, MAT.metal), -0.05, 1.5, 0.12)));
    dynamic.frontDoor = doorPivot;
    anchors.frontDoor = place(new THREE.Object3D(), 6.1, 1.2, 0.15);
    root.add(anchors.frontDoor);

    // The shotgun, leaning in the corner where he left it on the first day.
    const gun = new THREE.Group();
    gun.position.set(4.45, 0, 0.82);
    gun.rotation.z = 0.18;
    root.add(gun);
    gun.add(shade(place(box(0.042, 0.72, 0.042, MAT.metal), 0, 0.75, 0)));
    gun.add(shade(place(box(0.055, 0.42, 0.075, MAT.woodDark), 0, 0.24, 0.01)));
    gun.add(shade(place(box(0.048, 0.3, 0.055, MAT.woodDark), 0, 1.2, 0)));
    dynamic.shotgun = gun;
    anchors.shotgun = place(new THREE.Object3D(), 4.6, 0.9, 0.6);
    root.add(anchors.shotgun);

    // After Day 10, his shoes are still by the door.
    const shoes = new THREE.Group();
    shoes.position.set(4.9, 0, -0.15);
    for (const dz of [0, 0.16]) {
      const s = shade(place(box(0.11, 0.09, 0.29, MAT.woodDark), 0, 0.045, dz));
      s.rotation.y = (Math.random() - 0.5) * 0.4;
      shoes.add(s);
    }
    shoes.visible = false;
    root.add(shoes);
    dynamic.shoes = shoes;
  }

  /* ---------------------------------------------------------------- */
  /* dust — one plane per flat surface, opacity driven by the day       */
  /* ---------------------------------------------------------------- */
  dynamic.dust = [];
  for (const [x, y, z, w, d] of [
    [-2.3, 0.767, -3.2, 1.9, 0.66],     // the desk
    [ 0.25, 0.485, 0.5, 1.05, 0.46],    // the TV stand
    [ 2.22, 0.935, -3.22, 2.1, 0.66],   // the counter
    [ 0.25, 1.025, 0.5, 0.6, 0.5],      // the top of the TV
    [ 3.05, 0.756, 1.45, 0.85, 0.5],    // his desk
  ]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT.dust.clone());
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, y, z);
    root.add(p);
    dynamic.dust.push(p);
  }

  /* ---------------------------------------------------------------- */
  /* interior bulbs — one bare dying CFL per room                       */
  /* ---------------------------------------------------------------- */
  const bulbPos = {
    main:    [-1.8, CEIL - 0.20, 0.0],
    kitchen: [ 2.6, CEIL - 0.20, -2.0],
    bath:    [ 1.75, CEIL - 0.20, 2.3],
    bedroom: [ 3.35, CEIL - 0.20, 2.3],
    landing: [ 5.4, CEIL - 0.20, 0.3],
  };
  for (const [room, p] of Object.entries(bulbPos)) {
    const cfg = CONFIG.light.bulb[room];
    const l = new THREE.PointLight(cfg.color, 0, cfg.distance, cfg.decay);
    l.position.set(p[0], p[1], p[2]);
    // Only the main room's bulb casts — one shadow light per room is more
    // than this scene needs and the streetlight is the one that matters.
    if (room === 'main') {
      l.castShadow = true;
      l.shadow.mapSize.set(1024, 1024);
      l.shadow.bias = -0.004;
      l.shadow.camera.far = 9;
    }
    root.add(l);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0x1e1c18, emissive: cfg.color, emissiveIntensity: 0, toneMapped: false }));
    bulb.position.copy(l.position);
    root.add(bulb);
    // The flex, and no shade. Nobody put a shade on any of these.
    root.add(place(box(0.008, 0.2, 0.008, MAT.plasticBk), p[0], p[1] + 0.12, p[2]));

    // The bounce off the ceiling. Sits lower than the bulb, spreads further,
    // falls off gently, casts nothing. Without it the ceiling clips white and
    // the floor stays black, which is the state the room was unusable in.
    const B = CONFIG.light.bulbBounce;
    const bounce = new THREE.PointLight(cfg.color, 0, cfg.distance * B.distanceScale, B.decay);
    bounce.position.set(p[0], p[1] - B.drop, p[2]);
    bounce.castShadow = false;
    root.add(bounce);

    lights[room] = { light: l, bounce, bulb, cfg };
  }

  // Switches, on the wall by each doorway.
  const switchPos = {
    main:    [ 0.86, 1.15, 0.35],
    kitchen: [ 1.12, 1.15, -1.75],
    bath:    [ 1.15, 1.15, 0.86],
    bedroom: [ 3.0,  1.15, 0.86],
    landing: [ 4.32, 1.15, 0.9],
  };
  for (const [room, p] of Object.entries(switchPos)) {
    root.add(shade(place(box(0.085, 0.125, 0.022, MAT.plasticGy), p[0], p[1], p[2]), false, true));
    anchors['switch.' + room] = place(new THREE.Object3D(), p[0], p[1], p[2]);
    root.add(anchors['switch.' + room]);
  }

  /* A floor value, not a light. If it is not lit by one of the three
   * sources, it is black, and blackness is the point. */
  const ambient = new THREE.AmbientLight(0xffffff, 0.05);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0x2c3542, 0x0a0806, 0.05);
  scene.add(hemi);

  return { root, anchors, lights, dynamic, colliders, ambient, hemi };
}

/* ------------------------------------------------------------------ */
/* the tally wall                                                      */
/* ------------------------------------------------------------------ */

function makeTallyMaterial() {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 480;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.96, transparent: true });
  m.userData.canvas = c;
  m.userData.texture = t;
  drawTally(m, 0, 0);
  return m;
}

/**
 * The marks accumulate in real time.
 *
 * @param {number} count  total marks on the wall
 * @param {number} his    how many of them are his. He started it as a joke
 *                        on the second day and his stop at nine.
 */
export function drawTally(material, count, his = 0) {
  const c = material.userData.canvas;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.lineCap = 'round';

  for (let i = 0; i < count; i++) {
    const mine = i >= his;
    // His are marker. The player's are whatever was on the desk.
    g.strokeStyle = mine ? 'rgba(30,34,44,0.80)' : 'rgba(22,18,16,0.90)';
    g.lineWidth = mine ? 5.5 : 8;

    const grp = Math.floor(i / 5), inGrp = i % 5;
    const bx = 52 + (grp % 4) * 140;
    const by = 78 + Math.floor(grp / 4) * 160;
    g.beginPath();
    if (inGrp < 4) {
      const x = bx + inGrp * 21 + (Math.random() * 3 - 1.5);
      g.moveTo(x, by);
      g.lineTo(x + (Math.random() * 7 - 3.5), by + 88);
    } else {
      g.moveTo(bx - 10, by + 80);
      g.lineTo(bx + 76, by + 6);
    }
    g.stroke();
  }
  material.userData.texture.needsUpdate = true;
}

export default buildApartment;
