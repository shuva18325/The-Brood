/**
 * world/index.js — everything three.js, behind one object.
 *
 * main.js talks to this. Nothing outside world/ imports three.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import state from '../state.js';
import bus from '../bus.js';
import audio from '../audio.js';
import effects from '../effects.js';
import { SPAWN, WINDOW, roomAt } from './plan.js';
import { buildApartment, drawTally } from './apartment.js';
import { buildStreet } from './street.js';
import { Lighting } from './lighting.js';
import { Controls } from './controls.js';
import { buildInteractables, Interaction } from './interactables.js';

export class World {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: CONFIG.render.antialias, powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, CONFIG.render.pixelRatioCap));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = CONFIG.render.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // No tone mapping: the grade lives in the post chain, where it can be
    // driven by the day counter.
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.toneMappingExposure = CONFIG.render.toneMappingExposure;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      CONFIG.render.fov, innerWidth / innerHeight, CONFIG.render.near, CONFIG.render.far);

    this.apt = buildApartment(this.scene);
    this.street = buildStreet(this.scene);
    this.lighting = new Lighting(this.scene, this.apt, this.street);
    this.dynamic = this.apt.dynamic;

    this.controls = new Controls(this.camera, canvas, this.apt.colliders);
    this.controls.spawn(SPAWN.x, SPAWN.z, SPAWN.yaw);

    this.interaction = null;
    this._curtainT = 0;
    this._screenOverride = null;
    this._windowPoint = new THREE.Vector3(WINDOW.x + 0.6, WINDOW.sill + 0.6, WINDOW.z);

    addEventListener('resize', () => this.resize());
  }

  /** Which room a point is in. Exposed so the walk test can name a pocket. */
  roomAt(x, z) { return roomAt(x, z); }

  bindInteraction(ctx) {
    const list = buildInteractables(ctx);
    this.interaction = new Interaction(ctx, list);
  }

  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    effects.resize(innerWidth, innerHeight);
  }

  update(dt) {
    this.controls.update(dt);

    // Curtain slide. Cloth has weight, so it eases.
    const d = this.dynamic;
    const target = state.curtainOpen ? d.curtainOpenZ : d.curtainClosedZ;
    d.curtain.position.z += (target - d.curtain.position.z) * Math.min(1, dt * 5);

    // The curtain in the upstairs window of the blue house twitches in the
    // mornings. It stops on the ninth and nothing ever mentions that.
    this._curtainT += dt;
    const bc = this.street.dynamic.blueCurtain;
    if (bc) {
      const home = this.street.dynamic.blueCurtainHome;
      const twitching = state.day <= CONFIG.decay.blueCurtainLastDay
        && state.hour >= 6.5 && state.hour <= 10.5;
      bc.position.z = home + (twitching && Math.sin(this._curtainT * 0.7) > 0.985 ? 0.22 : 0);
    }

    // Fog switches to the exterior table when the player is at the open
    // window and can actually see out.
    this.lighting.setExterior(
      state.curtainOpen && this.camera.position.distanceTo(this._windowPoint) < 2.4);

    this.lighting.update(dt);
    this.street.update(dt, this.camera);
    if (this.interaction) this.interaction.update();
  }

  render() {
    // Prompt 2's post chain draws the frame. If it cannot run on this
    // machine, the game falls back to a straight render and still plays.
    if (effects.renderScene(this)) return;
    this.renderer.render(this.scene, this.camera);
  }

  /* ---------------------------------------------------------------- */
  /* things the systems ask the world to do                            */
  /* ---------------------------------------------------------------- */

  /** The fridge is a visible countdown, emptying shelf by shelf. */
  updateFridge() {
    const items = this.dynamic.fridgeItems;
    for (let i = 0; i < items.length; i++) items[i].visible = i < state.foodPortions;
  }

  openHisDoor() {
    this.dynamic.notesGroup.visible = true;
    audio.play('door_open');
  }

  /** Used by effects.pathogenManifest — the monitor's light changes colour. */
  setScreenColour(which, hex, seconds = 2) {
    const map = { computer: this.dynamic.pcLight, tv: this.dynamic.tvLight };
    const light = map[which];
    if (!light) return;
    light.color.setHex(hex);
    this._screenOverride = { light, until: performance.now() + seconds * 1000 };
  }

  /** Something moved at the edge of vision and is not there now. */
  peripheralFlick(side) {
    const id = side === 'left' ? 'crawler.near' : 'crawler.far';
    const b = this.street.billboards.get(id);
    if (!b) return;
    b.visible = true;
    setTimeout(() => { b.visible = false; }, 130);
  }

  /**
   * The apartment on a given day. Nothing new is added — the same objects
   * are dressed differently, which is the whole trick of §9.
   */
  applyDay(day) {
    const D = CONFIG.decay;

    // Dishes accumulate in the sink. Then they stop, which is worse.
    const dishCount = day < D.dishes.startDay ? 0
      : Math.min(D.dishes.max, Math.min(day, D.dishes.stopDay) - D.dishes.startDay + 1);
    this.dynamic.dishes.forEach((p, i) => { p.visible = i < dishCount; });

    // Dust on flat surfaces.
    const dust = day < D.dust.startDay ? 0
      : Math.min(D.dust.max, (day - D.dust.startDay) * D.dust.perDay);
    for (const p of this.dynamic.dust) p.material.opacity = dust;

    // His shoes are still by the door.
    this.dynamic.shoes.visible = day >= D.shoesFromDay;

    // The marks. His stop at nine; the player's carry on.
    const hisMarks = Math.min(8, Math.max(0, day - 1));
    drawTally(this.dynamic.tally.material, state.marksOnWall + hisMarks, hisMarks);

    this.dynamic.shotgun.visible = !state.hasShotgun;
    this.dynamic.keys.visible = state.act >= 2;
    this.dynamic.wallet.visible = state.act >= 2;
    this.dynamic.notesGroup.visible = state.bedroomUnlocked;
    this.dynamic.fridgeDoor.rotation.y = 0;

    this.updateFridge();
    this.street.applyDay(day);
  }

  /** Reset per-day visual state after sleeping. */
  onDayAdvance() {
    this.street.hideAll();
    this.applyDay(state.day);
    this.controls.spawn(SPAWN.x, SPAWN.z, SPAWN.yaw);
    this.lighting.snap();
  }

  /** Restore the visual world from a loaded save. */
  applyState() {
    this.street.hideAll();
    this.applyDay(state.day);
    this.lighting.snap();
  }
}

export default World;
