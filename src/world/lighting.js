/**
 * lighting.js — applies CONFIG.light and CONFIG.fog to the scene.
 *
 * Every value comes out of config. Prompt 2 retunes config; this file
 * should not need to change. It only decides WHICH entry applies right now.
 *
 * The window is a light switch. No glass means daylight enters freely when
 * the curtain is open, which is why the curtain is never a neutral toggle.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import state from '../state.js';
import clock from '../systems/clock.js';

const lerp = (a, b, t) => a + (b - a) * t;

export class Lighting {
  constructor(scene, apartment, street) {
    this.scene = scene;
    this.apt = apartment;
    this.street = street;
    this.fog = new THREE.FogExp2(0x000000, 0.05);
    scene.fog = this.fog;
    this._t = 0;
    this.exterior = false;   // true while the camera can see out
  }

  /** Called every frame. Smoothly chases the target values. */
  update(dt) {
    const phase = state.phase;
    const A = CONFIG.light.ambient[phase] || CONFIG.light.ambient.night;
    const k = Math.min(1, dt * 2.2);

    this.apt.ambient.color.lerp(new THREE.Color(A.color), k);
    this.apt.ambient.intensity = lerp(this.apt.ambient.intensity, A.intensity, k);
    this.apt.hemi.intensity = lerp(this.apt.hemi.intensity, A.intensity * 0.6, k);

    // Fog: interior unless the player is at the window with it open.
    const F = (this.exterior ? CONFIG.fog.exterior : CONFIG.fog.interior)[phase]
            || CONFIG.fog.interior.night;
    this.fog.color.lerp(new THREE.Color(F.color), k);
    this.fog.density = lerp(this.fog.density, F.density, k);
    this.scene.background = this.fog.color;

    // --- interior bulbs -------------------------------------------------
    for (const [room, L] of Object.entries(this.apt.lights)) {
      const on = !!state.lights[room];
      L.light.intensity = lerp(L.light.intensity, on ? L.cfg.intensity : 0, k * 2);
      L.bulb.material.emissiveIntensity = lerp(L.bulb.material.emissiveIntensity, on ? 1.6 : 0, k * 2);
    }

    // --- the window shaft ------------------------------------------------
    const S = CONFIG.light.windowShaft[phase] || CONFIG.light.windowShaft.night;
    const shaftTarget = state.curtainOpen ? S.intensity : 0;
    const shaft = this.apt.dynamic.windowShaft;
    shaft.color.lerp(new THREE.Color(S.color), k);
    shaft.intensity = lerp(shaft.intensity, shaftTarget, k * 1.6);

    // --- screens ----------------------------------------------------------
    const D = this.apt.dynamic;
    const tvOn = state.tvOn;
    D.tvLight.intensity = lerp(D.tvLight.intensity, tvOn ? CONFIG.light.screen.tv.intensity : 0, k * 3);
    D.tvScreen.material.emissiveIntensity = lerp(D.tvScreen.material.emissiveIntensity, tvOn ? 1.2 : 0, k * 3);

    const pcOn = state.computerOn;
    D.pcLight.intensity = lerp(D.pcLight.intensity, pcOn ? CONFIG.light.screen.computer.intensity : 0, k * 3);
    D.pcScreen.material.emissiveIntensity = lerp(D.pcScreen.material.emissiveIntensity, pcOn ? 1.0 : 0, k * 3);

    D.hotplateRing.material.emissiveIntensity =
      lerp(D.hotplateRing.material.emissiveIntensity, state.cooking ? 2.2 : 0, k);

    // --- outside ----------------------------------------------------------
    const sd = this.street.dynamic;
    const lampOn = clock.isDark() && state.day <= 6;   // the grid gives up early
    const flicker = lampOn && state.day >= 4 ? 0.6 + Math.random() * 0.4 : 1;
    sd.streetlamp.intensity = lerp(sd.streetlamp.intensity,
      lampOn ? CONFIG.light.streetlamp.intensity * flicker : 0, k);
    sd.streetlampHead.material.emissiveIntensity = lampOn ? 1.4 : 0;

    this._t += dt;
  }

  /** Called by the interaction system when the player is at the window. */
  setExterior(on) { this.exterior = on; }

  /** Snap everything to target — used after a day advance. */
  snap() {
    for (let i = 0; i < 30; i++) this.update(0.1);
  }
}

export default Lighting;
