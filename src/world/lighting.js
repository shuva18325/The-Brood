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
    this._skyTint = new THREE.Color();
    this._skyLevel = 0;
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
      // The bounce tracks the bulb exactly. It is the same light.
      if (L.bounce) {
        L.bounce.intensity = lerp(L.bounce.intensity,
          target * CONFIG.light.bulbBounce.scale, Math.min(1, rate * 3));
      }
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

    // The diffuse half of the same window. Same curtain, same grid, no
    // shadow — and it goes with the sun rather than with the streetlamp.
    const W = CONFIG.light.windowFill;
    const WP = W[phase] || W.night;
    const fill = this.apt.dynamic.windowFill;
    if (fill) {
      fill.color.lerp(this._c.set(WP.color), k);
      fill.intensity = lerp(fill.intensity,
        state.curtainOpen ? WP.intensity * (phase === 'night' ? gridOn : 1) : 0, k * 1.8);
    }

    /* ---- screens --------------------------------------------------- */
    const D = this.apt.dynamic;
    const sdim = effects.screenDim();
    const tvOn = state.tvOn;
    // The snow on the last days is the brightest thing in the apartment.
    const snow = tvOn && state.day >= CONFIG.tv.snowFromDay ? CONFIG.light.snowBoost : 1;
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

    this._sky(dt, k, phase);
  }

  /**
   * THE SKY OVER THE STREET.
   *
   * Under a uniform overcast sky a surface's appearance is albedo × sky
   * luminance, with no shadow term. So every exterior material's emissive is
   * driven straight from that product, which lights the street without a
   * single extra light in the scene and without touching the interior.
   */
  _sky(dt, k, phase) {
    const S = CONFIG.light.sky;
    const W = CONFIG.light.weather;
    const P = S[phase] || S.night;
    const day = state.day;

    // The overcast thickens as the fires do, and rain closes it down further.
    const overcast = day >= S.overcastFromDay
      ? Math.min(S.overcastMax, (day - S.overcastFromDay + 1) * S.overcastPerDay) : 0;
    const raining = W.rainDays.includes(day);
    const level = P.level * (1 - overcast) * (raining ? W.rainSkyMul : 1);

    this._skyLevel = lerp(this._skyLevel ?? level, level, k * 0.6);
    this._skyTint.set(P.tint);

    for (const s of this.street.dynamic.skylit) {
      // emissive = albedo × sky, weighted by how much sky that surface sees.
      s.mat.emissive.copy(s.albedo).multiply(this._skyTint)
        .multiplyScalar(this._skyLevel * s.weight);
    }

    // The dome. It is the brightest thing out there and it always was.
    const dome = this.street.dynamic.sky;
    if (dome) {
      dome.material.color.copy(this._c.set(P.horizon))
        .multiplyScalar(0.35 + this._skyLevel * 1.15);
    }

    // Smoke, from the day the refineries go. It never clears.
    const smoke = day >= W.smokeFromDay
      ? Math.min(W.smokeMax, (day - W.smokeFromDay + 1) * W.smokePerDay) : 0;
    const cols = this.street.dynamic.smokeCols || [];
    for (let i = 0; i < cols.length; i++) {
      const m = cols[i].material;
      m.opacity = lerp(m.opacity, smoke * (0.55 + i * 0.09), k * 0.5);
      // It leans, slowly, and it is never still.
      cols[i].position.x = i * 3.5 + Math.sin(this._t * 0.07 + i) * 1.6;
    }

    // Rain. Two sheets, scrolled at different rates so it never repeats.
    const rain = this.street.dynamic.rain || [];
    for (let i = 0; i < rain.length; i++) {
      const m = rain[i].material;
      m.opacity = lerp(m.opacity, raining ? (i ? 0.30 : 0.44) : 0, k * 0.4);
      if (m.map && m.opacity > 0.002) {
        m.map.offset.y = (m.map.offset.y - dt * (i ? 2.1 : 3.4)) % 1;
        m.map.offset.x = (m.map.offset.x + dt * 0.06) % 1;
      }
    }
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
