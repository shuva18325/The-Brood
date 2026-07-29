/**
 * lighting.js — applies CONFIG.light and CONFIG.fog to the scene.
 *
 * Every value comes out of config. This file only decides WHICH entry
 * applies right now, and how fast to get there.
 *
 * The window is a light switch. No glass means the light enters freely
 * when the curtain is open — cool and flat by day, and sodium amber at
 * night, and both of them come through the bars.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import state from '../state.js';
import clock from '../systems/clock.js';
import effects from '../effects.js';

const lerp = (a, b, t) => a + (b - a) * t;

export class Lighting {
  constructor(scene, apartment, street) {
    this.scene = scene;
    this.apt = apartment;
    this.street = street;
    this.fog = new THREE.FogExp2(0x000000, 0.05);
    scene.fog = this.fog;
    this._t = 0;
    this.exterior = false;
    this.atmos = 'default';
    this.atmosBlend = 0;

    this._c = new THREE.Color();
  }

  update(dt) {
    this._t += dt;
    const phase = state.phase;
    const k = Math.min(1, dt * 2.2);

    /* ---- ambient floor -------------------------------------------- */
    const A = CONFIG.light.ambient[phase] || CONFIG.light.ambient.night;
    this.apt.ambient.color.lerp(this._c.set(A.color), k);
    this.apt.ambient.intensity = lerp(this.apt.ambient.intensity, A.intensity, k);
    this.apt.hemi.intensity = lerp(this.apt.hemi.intensity, A.intensity * CONFIG.light.hemiScale, k);

    /* ---- fog ------------------------------------------------------- */
    const F = (this.exterior ? CONFIG.fog.exterior : CONFIG.fog.interior)[phase]
            || CONFIG.fog.interior.night;
    const H = CONFIG.fog.hazeByDay;
    const haze = state.day >= H.from
      ? Math.min(H.max, (state.day - H.from) * H.perDay) : 0;

    let density = F.density + haze;
    if (this.atmos === 'silence') density *= 1.25;
    if (this.atmos === 'siege') density *= 1.15;

    this.fog.color.lerp(this._c.set(F.color), k);
    this.fog.density = lerp(this.fog.density, density, k);
    this.scene.background = this.fog.color;

    /* ---- interior bulbs: a dying CFL is never quite still ---------- */
    const B = CONFIG.light.bulbFlicker;
    const dim = effects.bulbDim();
    for (const [room, L] of Object.entries(this.apt.lights)) {
      const on = !!state.lights[room];
      const flick = on
        ? 1 - B.amount * (0.5 + 0.5 * Math.sin(this._t * B.rateA + room.length))
              * (0.5 + 0.5 * Math.sin(this._t * B.rateB))
        : 1;
      const target = on ? L.cfg.intensity * flick * dim : 0;
      // CFLs come up slowly and go out instantly.
      const rate = on ? k / B.warmup : k * 6;
      L.light.intensity = lerp(L.light.intensity, target, Math.min(1, rate * 3));
      L.bulb.material.emissiveIntensity =
        lerp(L.bulb.material.emissiveIntensity, on ? 2.2 * flick * dim : 0, k * 3);
    }

    /* ---- the light through the bars -------------------------------- */
    const S = CONFIG.light.windowShaft;
    const P = S[phase] || S.night;
    const shaft = this.apt.dynamic.windowShaft;
    // At night the source is the streetlamp, and it is on a dying grid.
    const gridOn = phase !== 'night' && phase !== 'dawn'
      ? 1
      : (state.day <= CONFIG.light.streetlampLastDay
          ? (state.day >= 4 ? 0.55 + Math.random() * 0.45 : 1)
          : 0.16);   // after the grid gives up, only what the sky throws back
    const target = state.curtainOpen ? P.intensity * gridOn : 0;
    shaft.color.lerp(this._c.set(P.color), k);
    shaft.intensity = lerp(shaft.intensity, target, k * 1.8);
    // Shadow work is wasted when the light is off.
    shaft.castShadow = shaft.intensity > 0.05;

    /* ---- screens --------------------------------------------------- */
    const D = this.apt.dynamic;
    const sdim = effects.screenDim();
    const tvOn = state.tvOn;
    // The snow on the last days is the brightest thing in the apartment.
    const snow = tvOn && state.day >= 15 ? CONFIG.light.snowBoost : 1;
    D.tvLight.intensity = lerp(D.tvLight.intensity,
      tvOn ? CONFIG.light.screen.tv.intensity * snow * sdim : 0, k * 3);
    D.tvScreen.material.emissiveIntensity = lerp(
      D.tvScreen.material.emissiveIntensity, tvOn ? 1.4 * snow * sdim : 0, k * 3);
    // A CRT does not hold a steady level; it hunts, a little, all the time.
    if (tvOn) D.tvLight.intensity *= 0.94 + Math.random() * 0.12;

    const pcOn = state.computerOn;
    D.pcLight.intensity = lerp(D.pcLight.intensity,
      pcOn ? CONFIG.light.screen.computer.intensity * sdim : 0, k * 3);
    D.pcScreen.material.emissiveIntensity = lerp(
      D.pcScreen.material.emissiveIntensity, pcOn ? 1.15 * sdim : 0, k * 3);
    if (D.pcFan && pcOn) D.pcFan.rotation.z += dt * (9 + Math.sin(this._t * 3) * 3);

    D.hotplateRing.material.emissiveIntensity =
      lerp(D.hotplateRing.material.emissiveIntensity, state.cooking ? 2.4 : 0, k * 0.8);

    if (D.fridgeLight) {
      D.fridgeLight.intensity = lerp(D.fridgeLight.intensity, state.fridgeOpen ? 1.6 : 0, k * 6);
    }

    /* ---- the street ------------------------------------------------ */
    const sd = this.street.dynamic;
    const lampOn = clock.isDark() && state.day <= CONFIG.light.streetlampLastDay;
    const flicker = lampOn && state.day >= 4 ? 0.55 + Math.random() * 0.45 : 1;
    sd.streetlamp.intensity = lerp(sd.streetlamp.intensity,
      lampOn ? CONFIG.light.streetlamp.intensity * flicker : 0, k);
    sd.streetlampHead.material.emissiveIntensity = lampOn ? 1.6 * flicker : 0;
  }

  /** Called when the player is at the window and can actually see out. */
  setExterior(on) { this.exterior = on; }

  /** Scripted beats: 'silence' | 'siege' | 'default'. */
  setAtmosphere(preset, seconds = 3) {
    this.atmos = preset;
    this.atmosBlend = seconds;
  }

  /** Snap everything to target — used after a day advance. */
  snap() {
    for (let i = 0; i < 40; i++) this.update(0.1);
  }
}

export default Lighting;
