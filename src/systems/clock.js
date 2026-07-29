/**
 * clock.js — time of day, and the phase it puts the apartment in.
 *
 * The clock runs while the player is walking around AND while they are
 * reading a screen. That is deliberate: daylight is a resource and the
 * forum eats it. If you want to read everything, you read at night, and
 * reading at night costs Concealment.
 */

import { CONFIG } from '../config.js';
import state from '../state.js';
import bus from '../bus.js';
import audio from '../audio.js';

const C = CONFIG.clock;

let paused = true;

export const clock = {
  pause()  { paused = true; },
  resume() { paused = false; },
  get paused() { return paused; },

  /** dt in real seconds. */
  update(dt) {
    if (paused || state.ended) return;
    const before = state.phase;
    state.hour += (dt * C.minutesPerSecond) / 60;
    state.playtimeSeconds += dt;

    const phase = computePhase(state.hour);
    if (phase !== before) {
      state.phase = phase;
      bus.emit('clock:phase', phase);
      if (phase === 'night') bus.emit('clock:nightfall');
      if (phase === 'dusk')  bus.emit('clock:dusk');
    }

    if (state.hour >= C.exhaustionHour && !state.eventsFired['exhaust_' + state.day]) {
      state.eventsFired['exhaust_' + state.day] = state.day;
      bus.emit('clock:exhaustion');
    }
    if (state.hour >= C.collapseHour) {
      bus.emit('clock:collapse');
    }
  },

  /** "07:14" */
  label(hour = state.hour) {
    const h24 = ((hour % 24) + 24) % 24;
    const h = Math.floor(h24);
    const m = Math.floor((h24 - h) * 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  },

  isNight() { return state.phase === 'night' || state.phase === 'dawn'; },
  isDark()  { return state.phase === 'night' || state.phase === 'dawn' || state.phase === 'dusk'; },
  canSleep() { return state.hour >= C.sleepAllowedHour; },

  /** Skip forward — used only by the handoff and ending scripts. */
  advanceTo(hour) {
    state.hour = hour;
    const phase = computePhase(state.hour);
    if (phase !== state.phase) { state.phase = phase; bus.emit('clock:phase', phase); }
  },

  reset(hour = C.wakeHour) {
    state.hour = hour;
    state.phase = computePhase(hour);
    bus.emit('clock:phase', state.phase);
  },
};

export function computePhase(hour) {
  const h = ((hour % 24) + 24) % 24;
  if (h >= C.dawnHour && h < C.duskHour) return 'day';
  if (h >= C.duskHour && h < C.nightHour) return 'dusk';
  if (h >= C.nightHour || h < C.dawnHour - 1) return 'night';
  return 'dawn';
}

/* The ambient bed follows the phase. Prompt 3 makes this mean something. */
bus.on('clock:phase', (phase) => {
  audio.bed(phase === 'day' || phase === 'dawn' ? 'bed_room_day' : 'bed_room_night');
});

export default clock;
