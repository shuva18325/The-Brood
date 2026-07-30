/**
 * controls.js — pointer lock, WASD, and sliding AABB collision.
 *
 * Deliberately heavy and slow. He has been sleeping on a mat for nine days
 * and his back hurts more every morning; prompt 2 adds the sway that says so.
 *
 * Three ways to look, in order of preference: pointer lock, drag, arrow keys.
 * Pointer lock is refused inside a sandboxed frame, and the game has to be
 * playable there too, so the fallbacks are not optional.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import bus from '../bus.js';
import audio from '../audio.js';
import { roomAt, ROOM_CENTRES } from './plan.js';

const P = CONFIG.player;

export class Controls {
  constructor(camera, canvas, colliders) {
    this.camera = camera;
    this.canvas = canvas;
    this.colliders = colliders;

    this.enabled = false;
    this.locked = false;
    /** Set once a lock request has actually been refused. */
    this.lockDenied = false;
    this.dragging = false;
    this._dragId = null;
    this._dragX = 0;
    this._dragY = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3(0, P.eyeHeight, 0);
    this.crouching = false;
    this.keys = Object.create(null);
    this.room = null;
    this._stepAccum = 0;
    this._stuckFor = 0;
    this._lastX = 0;
    this._lastZ = 0;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onLockChange = this._onLockChange.bind(this);
    this._onLockError = this._onLockError.bind(this);
    this._onDragStart = this._onDragStart.bind(this);
    this._onDragMove = this._onDragMove.bind(this);
    this._onDragEnd = this._onDragEnd.bind(this);

    document.addEventListener('pointerlockchange', this._onLockChange);
    document.addEventListener('pointerlockerror', this._onLockError);
    document.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);

    this.canvas.addEventListener('pointerdown', this._onDragStart);
    window.addEventListener('pointermove', this._onDragMove);
    window.addEventListener('pointerup', this._onDragEnd);
    window.addEventListener('pointercancel', this._onDragEnd);
    // A drag on a touch screen must not scroll the page under the canvas.
    this.canvas.style.touchAction = 'none';
  }

  spawn(x, z, yaw = 0) {
    this.position.set(x, P.eyeHeight, z);
    this.yaw = yaw;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this._stuckFor = 0;
    this._lastX = x;
    this._lastZ = z;
    // A spawn point that has drifted inside a prop is not the player's fault.
    this._depenetrate(P.radius, P.eyeHeight);
    this._apply();
  }

  requestLock() {
    if (this.lockDenied || !this.canvas.requestPointerLock) return;
    let r;
    try { r = this.canvas.requestPointerLock(); }
    catch { this._denyLock(); return; }
    if (r && typeof r.catch === 'function') r.catch(() => this._denyLock());
  }

  releaseLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _denyLock() {
    if (this.lockDenied) return;
    this.lockDenied = true;
    this.locked = false;
    // Nothing is broken. The player just looks a different way from now on.
    bus.emit('controls:lockDenied');
  }

  _onLockError() { this._denyLock(); }

  _onLockChange() {
    this.locked = document.pointerLockElement === this.canvas;
    if (this.locked) this.lockDenied = false;
    bus.emit('controls:lock', this.locked);
  }

  _onMouseMove(e) {
    if (!this.locked || !this.enabled) return;
    this._look(e.movementX * P.lookSensitivity, e.movementY * P.lookSensitivity);
  }

  /* ---------------------------------------------------------------- */
  /* drag to look — the fallback that makes an embedded frame playable */
  /* ---------------------------------------------------------------- */

  _onDragStart(e) {
    if (!this.enabled || this.locked || this._dragId !== null) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    this._dragId = e.pointerId;
    this.dragging = true;
    this._dragX = e.clientX;
    this._dragY = e.clientY;
    if (this.canvas.setPointerCapture) {
      try { this.canvas.setPointerCapture(e.pointerId); } catch { /* not fatal */ }
    }
  }

  _onDragMove(e) {
    if (!this.dragging || e.pointerId !== this._dragId || !this.enabled) return;
    const dx = e.clientX - this._dragX;
    const dy = e.clientY - this._dragY;
    this._dragX = e.clientX;
    this._dragY = e.clientY;
    this._look(dx * P.dragSensitivity, dy * P.dragSensitivity);
  }

  _onDragEnd(e) {
    if (this._dragId === null || (e && e.pointerId !== this._dragId)) return;
    this._dragId = null;
    this.dragging = false;
  }

  _look(dYaw, dPitch) {
    this.yaw -= dYaw;
    this.pitch -= dPitch;
    this.pitch = Math.max(-P.maxPitch, Math.min(P.maxPitch, this.pitch));
  }

  _onKeyDown(e) {
    this.keys[e.code] = true;
    if (e.code === 'ControlLeft' || e.code === 'KeyC') this.crouching = true;
    if (['KeyW','KeyA','KeyS','KeyD','Space',
         'ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  }

  _onKeyUp(e) {
    this.keys[e.code] = false;
    if (e.code === 'ControlLeft' || e.code === 'KeyC') this.crouching = false;
  }

  clearKeys() {
    this.keys = Object.create(null);
    this.crouching = false;
    this._onDragEnd(null);
  }

  update(dt) {
    if (!this.enabled) { this.velocity.set(0, 0, 0); return; }

    // Arrow keys look, always, whether or not the mouse is captured.
    const lookX = (this.keys.ArrowRight ? 1 : 0) - (this.keys.ArrowLeft ? 1 : 0);
    const lookY = (this.keys.ArrowDown ? 1 : 0) - (this.keys.ArrowUp ? 1 : 0);
    if (lookX || lookY) this._look(lookX * P.keyLookSpeed * dt, lookY * P.keyLookSpeed * dt);

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
    this._unstickWatch(dt, !!(fwd || strafe));

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

  /**
   * Move with collide-and-slide against the AABB list.
   *
   * The important property is the second one: a body that is ALREADY inside
   * geometry must still be able to move. The old version rejected any move
   * from a blocked position, which meant one bad frame — a spawn on a prop, a
   * collider added under your feet — wedged the player permanently. Now an
   * overlapping body may move freely, and a separate depenetration step walks
   * it out along its shallowest face.
   */
  _move(dx, dz) {
    const r = P.radius;
    const headY = this.crouching ? P.crouchHeight : P.eyeHeight;
    let x = this.position.x, z = this.position.z;

    const stuckNow = !!this._hit(x, z, r, headY);

    // X then Z, so a diagonal into a corner slides instead of sticking.
    if (stuckNow || !this._hit(x + dx, z, r, headY)) x += dx;
    if (stuckNow || !this._hit(x, z + dz, r, headY)) z += dz;

    this.position.x = x;
    this.position.z = z;
    this.position.y = headY;

    if (stuckNow) this._depenetrate(r, headY);
  }

  /** The first solid thing overlapping a body at (x, z), or null. */
  _hit(x, z, r, headY) {
    for (const c of this.colliders) {
      // Something shorter than the knee is walked over, not into.
      if (c.h < 0.34) continue;
      if (x + r > c.x0 && x - r < c.x1 && z + r > c.z0 && z - r < c.z1) {
        // Crouching gets you under nothing here; the bar is head height.
        if (c.h < headY * 0.35) continue;
        return c;
      }
    }
    return null;
  }

  /**
   * Push out of whatever the body is inside, along the shallowest face. One
   * collider per call, which is enough: the next frame handles the next one,
   * and a body in a corner walks itself out over a few frames rather than
   * popping across the room.
   */
  _depenetrate(r, headY) {
    const c = this._hit(this.position.x, this.position.z, r, headY);
    if (!c) return false;
    const x = this.position.x, z = this.position.z;
    const out = [
      { d: (c.x0 - r) - x, axis: 'x' },   // west
      { d: (c.x1 + r) - x, axis: 'x' },   // east
      { d: (c.z0 - r) - z, axis: 'z' },   // north
      { d: (c.z1 + r) - z, axis: 'z' },   // south
    ].sort((a, b) => Math.abs(a.d) - Math.abs(b.d))[0];
    // A hair past the face, so the very next test is clean.
    if (out.axis === 'x') this.position.x += out.d + Math.sign(out.d) * 0.002;
    else this.position.z += out.d + Math.sign(out.d) * 0.002;
    return true;
  }

  /**
   * §1.3. The failsafe. If the player has been pressing into geometry for
   * longer than they could plausibly mean to, walk them toward the middle of
   * the room they are in. Not a teleport — a nudge, at walking pace, so it
   * reads as squeezing free rather than as the game giving up.
   */
  _unstickWatch(dt, wished) {
    const moved = Math.hypot(
      this.position.x - this._lastX, this.position.z - this._lastZ);
    this._lastX = this.position.x;
    this._lastZ = this.position.z;

    // Only counts as stuck if they are ASKING to move and nothing happens.
    if (wished && moved < 0.006) this._stuckFor += dt;
    else this._stuckFor = Math.max(0, this._stuckFor - dt * 2);

    if (this._stuckFor < P.unstickSeconds) return;

    const room = roomAt(this.position.x, this.position.z);
    const c = ROOM_CENTRES[room] || ROOM_CENTRES.main;
    const dx = c.x - this.position.x, dz = c.z - this.position.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.05) { this._stuckFor = 0; return; }
    const step = Math.min(len, P.walkSpeed * dt);
    const r = P.radius;
    const headY = this.crouching ? P.crouchHeight : P.eyeHeight;
    this.position.x += (dx / len) * step;
    this.position.z += (dz / len) * step;
    this._depenetrate(r, headY);
    if (!this._hit(this.position.x, this.position.z, r, headY)) {
      // Free. Let go, but leave a little credit so a corner does not re-trap.
      this._stuckFor = P.unstickSeconds * 0.4;
    }
  }

  _apply() {
    this.camera.position.copy(this.position);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this._onLockChange);
    document.removeEventListener('pointerlockerror', this._onLockError);
    document.removeEventListener('mousemove', this._onMouseMove);
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this.canvas.removeEventListener('pointerdown', this._onDragStart);
    window.removeEventListener('pointermove', this._onDragMove);
    window.removeEventListener('pointerup', this._onDragEnd);
    window.removeEventListener('pointercancel', this._onDragEnd);
  }
}

export default Controls;
