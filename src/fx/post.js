/**
 * post.js — the post chain.
 *
 * One render target, one fullscreen shader. No EffectComposer, no addon
 * dependencies: at this scale a single pass does everything and costs one
 * draw call.
 *
 * Order inside the shader:
 *   barrel → chromatic aberration → edge softness → grade → vignette →
 *   grain → flash
 *
 * There is no motion blur and there will never be motion blur.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';

const VERT = /* glsl */`
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const FRAG = /* glsl */`
precision highp float;

uniform sampler2D tDiffuse;
uniform vec2  uRes;
uniform float uTime;

uniform float uBarrel;
uniform float uAberration;
uniform float uEdgeBias;
uniform float uSoftness;
uniform float uGrain;
uniform float uGrainSize;
uniform float uVignette;
uniform float uVignetteSoft;

uniform float uSaturation;
uniform float uGreenPull;
uniform float uTemp;
uniform float uLift;
uniform float uGain;
uniform float uCrush;
uniform float uProtectWarm;
uniform float uExposure;

uniform float uFlash;
uniform float uFade;
uniform vec3  uTint;
uniform float uTintAmt;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

/* Barrel: push the frame out slightly at the corners. Constant, very slight. */
vec2 barrel(vec2 uv, float k) {
  vec2 c = uv - 0.5;
  float r2 = dot(c, c);
  return 0.5 + c * (1.0 + k * r2);
}

void main() {
  vec2 uv = barrel(vUv, uBarrel);

  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  vec2 c = uv - 0.5;
  float r = length(c) * 1.4142;

  /* Chromatic aberration: near zero at centre, visible at the edges. */
  float ca = uAberration * pow(r, uEdgeBias);
  vec2 dir = (r > 0.0001) ? c / r : vec2(0.0);
  vec3 col;
  col.r = texture2D(tDiffuse, uv + dir * ca).r;
  col.g = texture2D(tDiffuse, uv).g;
  col.b = texture2D(tDiffuse, uv - dir * ca).b;

  /* Edge softness: four taps, weighted by radius. Only ever at the edges. */
  float soft = uSoftness * pow(r, 1.7);
  if (soft > 0.00005) {
    vec2 px = vec2(soft, soft * uRes.x / uRes.y);
    vec3 blur =
      texture2D(tDiffuse, uv + vec2( px.x, 0.0)).rgb +
      texture2D(tDiffuse, uv + vec2(-px.x, 0.0)).rgb +
      texture2D(tDiffuse, uv + vec2(0.0,  px.y)).rgb +
      texture2D(tDiffuse, uv + vec2(0.0, -px.y)).rgb;
    col = mix(col, blur * 0.25, clamp(r * 0.9, 0.0, 0.85));
  }

  /* ---- grade ------------------------------------------------------- */

  /* How sodium-amber is this pixel? Warm light is the last colour to go. */
  float warm = clamp((col.r - col.b) * 2.4, 0.0, 1.0);
  float protect = warm * uProtectWarm;

  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float sat = mix(uSaturation, 1.0, protect);
  col = mix(vec3(lum), col, sat);

  /* The greens drain first. */
  col.g = mix(col.g, lum, uGreenPull * (1.0 - protect) * 0.55);

  /* Temperature: positive warms, negative pushes blue. */
  col.r *= 1.0 + uTemp;
  col.b *= 1.0 - uTemp;

  col = (col + uLift) * uGain;

  /* Crush the blacks. Toe only. */
  col = max(vec3(0.0), col - uCrush) / max(1e-4, 1.0 - uCrush);

  if (uTintAmt > 0.0001) col = mix(col, col * uTint, uTintAmt);

  /* Highlight rolloff. Near-linear through the mids, asymptotic at the top,
     so a bare bulb blooms rather than becoming a flat white polygon. */
  col = 1.0 - exp(-max(col, 0.0) * uExposure);

  /* ---- vignette ---------------------------------------------------- */
  float vig = smoothstep(1.0, uVignetteSoft, r);
  col *= mix(1.0, vig, uVignette);

  /* ---- grain ------------------------------------------------------- */
  vec2 gp = floor(gl_FragCoord.xy / max(0.5, uGrainSize));
  float n = hash(gp + fract(uTime) * 137.31);
  /* Grain sits in the shadows, where film grain actually lives. */
  float grainWeight = mix(1.35, 0.45, smoothstep(0.0, 0.55, lum));
  col += (n - 0.5) * uGrain * grainWeight;

  /* ---- flash / fade ------------------------------------------------ */
  col += uFlash;
  col *= uFade;

  gl_FragColor = vec4(max(col, 0.0), 1.0);
}`;

export class PostChain {
  constructor(renderer) {
    this.renderer = renderer;
    this.enabled = CONFIG.post.enabled;
    this.failed = false;

    const size = new THREE.Vector2();
    renderer.getDrawingBufferSize(size);

    this.target = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      depthBuffer: true,
      stencilBuffer: false,
    });

    this.uniforms = {
      tDiffuse:      { value: this.target.texture },
      uRes:          { value: new THREE.Vector2(size.x, size.y) },
      uTime:         { value: 0 },
      uBarrel:       { value: CONFIG.post.barrel },
      uAberration:   { value: CONFIG.post.aberration.base },
      uEdgeBias:     { value: CONFIG.post.aberration.edgeBias },
      uSoftness:     { value: CONFIG.post.softness.base },
      uGrain:        { value: CONFIG.post.grain.base },
      uGrainSize:    { value: CONFIG.post.grain.size },
      uVignette:     { value: CONFIG.post.vignette.amount },
      uVignetteSoft: { value: CONFIG.post.vignette.softness },
      uSaturation:   { value: 0.94 },
      uGreenPull:    { value: 0.0 },
      uTemp:         { value: 0.055 },
      uLift:         { value: 0.008 },
      uGain:         { value: 1.02 },
      uCrush:        { value: 0.01 },
      uProtectWarm:  { value: CONFIG.grade.protectWarm },
      uExposure:     { value: CONFIG.post.exposure },
      uFlash:        { value: 0 },
      uFade:         { value: 1 },
      uTint:         { value: new THREE.Color(1, 1, 1) },
      uTintAmt:      { value: 0 },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: this.uniforms,
      depthTest: false,
      depthWrite: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCamera = new THREE.Camera();
  }

  resize(w, h) {
    const dpr = this.renderer.getPixelRatio();
    const bw = Math.max(1, Math.floor(w * dpr));
    const bh = Math.max(1, Math.floor(h * dpr));
    this.target.setSize(bw, bh);
    this.uniforms.uRes.value.set(bw, bh);
  }

  render(scene, camera, dt) {
    if (this.failed) return false;
    try {
      this.uniforms.uTime.value += dt * CONFIG.post.grain.speed;
      this.renderer.setRenderTarget(this.target);
      this.renderer.clear();
      this.renderer.render(scene, camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.quadScene, this.quadCamera);
      return true;
    } catch (e) {
      // If the post chain cannot run on this machine, the game still plays.
      console.warn('[post] disabled:', e);
      this.failed = true;
      this.renderer.setRenderTarget(null);
      return false;
    }
  }

  dispose() {
    this.target.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}

export default PostChain;
