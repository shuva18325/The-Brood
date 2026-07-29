/**
 * controls.js — pointer lock, WASD, and sliding AABB collision.
 *
 * Deliberately heavy and slow. He has been sleeping on a mat for nine days
 * and his back hurts more every morning; prompt 2 adds the sway that says so.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import bus from '../bus.js';
import audio from '../audio.js';
import { roomAt } from './plan.js';

const P = CONFIG.player;

export class Controls {
  constructor(camera, canvas, colliders) {
    this.camera = camera;
    this.canvas = canvas;
    this.colliders = colliders;

    this.enabled = false;
    this.locked = false;
    this.yaw = 0;
    this.pitch = 0;
    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3(0, P.eyeHeight, 0);
    this.crouching = false;
    this.keys = Object.create(null);
    this.room = null;
    this._stepAccum = 0;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onLockChange = this._onLockChange.bind(this);

    document.addEventListener('pointerlockchange', this._onLockChange);
    document.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  spawn(x, z, yaw = 0) {
    this.position.set(x, P.eyeHeight, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this._apply();
  }

  requestLock() {
    if (!this.canvas.requestPointerLock) return;
    const r = this.canvas.requestPointerLock();
    if (r && typeof r.catch === 'function') r.catch(() => {});
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _onLockChange() {
    this.locked = document.pointerLockElement === this.canvas;
    bus.emit('controls:lock', this.locked);
  }

  _onMouseMove(e) {
    if (!this.locked || !this.enabled) return;
    this.yaw -= e.movementX * P.lookSensitivity;
    this.pitch -= e.movementY * P.lookSensitivity;
    this.pitch = Math.max(-P.maxPitch, Math.min(P.maxPitch, this.pitch));
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    if (e.code === 'ControlLeft' || e.code === 'KeyC') this.crouching = true;
    if (['KeyW','KeyA','KeyS','KeyD','Space'].includes(e.code)) e.preventDefault();
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
    if (e.code === 'ControlLeft' || e.code === 'KeyC') this.crouching = false;
  }

  clearKeys() { this.keys = Object.create(null); this.crouching = false; }

  update(dt) {
    if (!this.enabled) { this.velocity.set(0, 0, 0); return; }

    const fwd = (this.keys.KeyW ? 1 : 0) - (this.keys.KeyS ? 1 : 0);
    const strafe = (this.keys.KeyD ? 1 : 0) - (this.keys.KeyA ? 1 : 0);

    const speed = this.crouching ? P.crouchSpeed : P.walkSpeed;
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);

    // -Z is forward in three's camera space
    const wishX = (-sin * fwd + cos * strafe);
    const wishZ = (-cos * fwd - sin * strafe);
    const len = Math.hypot(wishX, wishZ) || 1;

    const target = new THREE.Vector3(
      (wishX / len) * speed * (fwd || strafe ? 1 : 0),
      0,
      (wishZ / len) * speed * (fwd || strafe ? 1 : 0)
    );

    const rate = (fwd || strafe) ? P.accel : P.friction;
    this.velocity.x += (target.x - this.velocity.x) * Math.min(1, rate * dt);
    this.velocity.z += (target.z - this.velocity.z) * Math.min(1, rate * dt);

    this._move(this.velocity.x * dt, this.velocity.z * dt);

    const moved = Math.hypot(this.velocity.x, this.velocity.z);
    if (moved > 0.35) {
      this._stepAccum += moved * dt;
      const stride = this.crouching ? 1.0 : 0.72;
      if (this._stepAccum > stride) {
        this._stepAccum = 0;
        audio.play(this.crouching ? 'step_crouch' : 'step', { at: this.position.toArray() });
      }
    }

    const nextRoom = roomAt(this.position.x, this.position.z);
    if (nextRoom !== this.room) { this.room = nextRoom; bus.emit('player:room', nextRoom); }

    this._apply();
  }

  /** Move with collide-and-slide against the AABB list. */
  _move(dx, dz) {
    const r = P.radius;
    let x = this.position.x, z = this.position.z;
    const headY = this.crouching ? P.crouchHeight : P.eyeHeight;

    // X then Z, so a diagonal into a corner slides instead of sticking.
    x = this._axis(x + dx, z, r, headY, 'x', x);
    z = this._axis(x, z + dz, r, headY, 'z', z);

    this.position.x = x;
    this.position.z = z;
    this.position.y = headY;
  }

  _axis(x, z, r, headY, axis, fallback) {
    for (const c of this.colliders) {
      // Something shorter than the knee is walked over, not into.
      if (c.h < 0.34) continue;
      // Crouching gets you under nothing here; the bar is head height.
      if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) {
        if (c.h < headY * 0.35) continue;
        return fallback;
      }
    }
    return axis === 'x' ? x : z;
  }

  _apply() {
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this._onLockChange);
    document.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}

export default Controls;
