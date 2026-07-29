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
import { SPAWN, WINDOW } from './plan.js';
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
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

    this.interaction = null;   // built once ctx exists
    this._curtainT = 0;

    addEventListener('resize', () => this.resize());

    bus.on('curtain', () => { /* animated in update */ });
  }

  /** Called once from main after ctx is assembled. */
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

    // curtain slide
    const d = this.dynamic;
    const target = state.curtainOpen ? d.curtainOpenZ : d.curtainClosedZ;
    d.curtain.position.z += (target - d.curtain.position.z) * Math.min(1, dt * 6);

    // Fog switches to the exterior table when the player is at the open
    // window and can actually see out. This is the only place the two
    // atmospheres meet.
    const atWindow = state.curtainOpen &&
      this.camera.position.distanceTo(new THREE.Vector3(WINDOW.x + 0.6, WINDOW.sill + 0.6, WINDOW.z)) < 2.2;
    this.lighting.setExterior(atWindow);

    // The curtain in the upstairs window of the blue house twitches in the
    // mornings. It stops on the ninth and nothing in the game ever mentions
    // that it stopped.
    this._curtainT += dt;
    const bc = this.street.dynamic.blueCurtain;
    const twitching = state.day <= 8 && state.hour >= 6.5 && state.hour <= 10.5;
    bc.position.z = bc.userData.home ?? (bc.userData.home = bc.position.z);
    if (twitching) {
      const t = this._curtainT * 0.7;
      bc.position.z += Math.sin(t) > 0.985 ? 0.22 : 0;
    }

    this.lighting.update(dt);
    this.street.update(this.camera);
    if (this.interaction) this.interaction.update();
  }

  render() { this.renderer.render(this.scene, this.camera); }

  /* ---------------------------------------------------------------- */
  /* things the systems ask the world to do                            */
  /* ---------------------------------------------------------------- */

  /** The fridge is a visible countdown. */
  updateFridge() {
    const items = this.dynamic.fridgeItems;
    for (let i = 0; i < items.length; i++) items[i].visible = i < state.foodPortions;
  }

  openHisDoor() {
    // The door itself is a gap in the plan; unlocking is a state flag.
    // What changes visually is the light and the notes.
    this.dynamic.notesGroup.visible = true;
    audio.play('door_open');
  }

  /** Reset per-day visual state after sleeping. */
  onDayAdvance() {
    this.street.hideAll();
    this.updateFridge();
    drawTally(this.dynamic.tally.material, state.marksOnWall);
    this.dynamic.shotgun.visible = !state.hasShotgun;
    this.dynamic.keys.visible = state.act >= 2;
    this.dynamic.fridgeDoor.rotation.y = 0;
    this.controls.spawn(SPAWN.x, SPAWN.z, SPAWN.yaw);

    // The street changes. The rubbish arrives and never leaves; the water
    // comes and the blocks below stop being blocks.
    const trash = this.street.dynamic.trash || [];
    const n = Math.min(trash.length, Math.floor((state.day / 15) * trash.length));
    trash.forEach((t, i) => { t.visible = i < n; });
    this.street.dynamic.water.visible = state.day >= 9;
    this.street.dynamic.water.position.z = 8 - (state.day - 9) * 1.2;

    // The curtain in the blue house stops twitching in the mornings, and
    // nothing in the game ever mentions that it stopped.
    this.street.dynamic.blueCurtain.visible = true;
    this.lighting.snap();
  }

  /** Restore the visual world from a loaded save. */
  applyState() {
    this.updateFridge();
    drawTally(this.dynamic.tally.material, state.marksOnWall);
    this.dynamic.shotgun.visible = !state.hasShotgun;
    this.dynamic.keys.visible = state.act >= 2;
    this.dynamic.notesGroup.visible = state.bedroomUnlocked;
    this.street.hideAll();
    this.street.dynamic.water.visible = state.day >= 9;
    this.lighting.snap();
  }
}

export default World;
