/**
 * day.js — sleep, the day advance, and the body.
 *
 * The day ends when the player lies down on the mat. Everything the day
 * cost is charged here: food, darkness, sleep quality, the base Concealment
 * decay, and the resolution of which detection profile ran hot.
 */

import { CONFIG } from '../config.js';
import state, { save, note, anyLightOn } from '../state.js';
import bus from '../bus.js';
import audio from '../audio.js';
import effects from '../effects.js';
import clock from './clock.js';
import concealment from './concealment.js';

const D = CONFIG.days;

export const day = {

  /**
   * Can the player sleep right now, and what will it cost?
   * @returns {{allowed:boolean, quality:'good'|'poor'|'collapse', reason:string}}
   */
  sleepCheck() {
    if (state.day >= D.last && !state.ended) {
      return { allowed: true, quality: 'poor', reason: 'the last night' };
    }
    if (state.hour >= CONFIG.clock.collapseHour) {
      return { allowed: true, quality: 'collapse', reason: 'you are past deciding' };
    }
    if (clock.canSleep()) {
      return { allowed: true, quality: 'good', reason: '' };
    }
    return {
      allowed: true, quality: 'poor',
      reason: 'It is still light. You will lie there for hours.',
    };
  },

  /** End the day. Returns the summary object the sleep overlay renders. */
  sleep({ quality = 'good' } = {}) {
    if (state.ended) return null;

    const summary = { day: state.day, notes: [] };

    /* --- food ------------------------------------------------------ */
    const ate = state.ateToday;
    const dCond = CONFIG.food.conditionFromMeal[ate] ?? 0;
    adjustCondition(dCond);
    if (ate === 'none') summary.notes.push('You did not eat today.');
    else if (ate === 'ration') summary.notes.push('You ate half of what you wanted.');

    /* --- darkness -------------------------------------------------- */
    if (state.flags.litSomethingToday) {
      state.flags.livedInDarkness = 0;
    } else {
      state.flags.livedInDarkness++;
      if (state.flags.livedInDarkness >= 2) {
        adjustCondition(CONFIG.condition.darknessPenalty);
        summary.notes.push('Another day without turning anything on.');
      }
    }
    state.flags.litSomethingToday = false;

    /* --- sleep quality --------------------------------------------- */
    if (quality === 'good') adjustCondition(CONFIG.condition.goodSleepBonus);
    else adjustCondition(CONFIG.condition.badSleepPenalty);
    if (quality === 'collapse') summary.notes.push('You did not decide to sleep. It happened to you.');

    /* --- concealment ----------------------------------------------- */
    if (state.dishesLeft > 0) {
      for (let i = 0; i < Math.min(3, state.dishesLeft); i++) concealment.event('dishesLeft');
    }
    concealment.dailyBase();
    concealment.rollDay();

    /* --- advance ---------------------------------------------------- */
    audio.play('day_advance');
    effects.blackout(CONFIG.timing.sleepFade / 1000);

    state.day += 1;
    state.ateToday = 'none';
    state.markedToday = false;
    state.phone.answeredToday = false;
    state.tvOn = false;
    state.computerOn = false;
    state.waterRunning = false;
    state.cooking = false;
    state.fridgeOpen = false;
    for (const k of Object.keys(state.lights)) state.lights[k] = false;
    clock.reset(CONFIG.clock.wakeHour);

    if (state.day >= D.actTwo && state.act === 1) enterActTwo();

    effects.syncFromState(state);
    save();

    summary.newDay = state.day;
    bus.emit('day:advance', state.day);

    if (state.day > D.last) {
      // The player slept through the fifteenth night without choosing.
      bus.emit('ending:trigger', { id: 'brave', reason: 'stayed' });
    }
    return summary;
  },

  /** Called when the clock runs past 06:00 without sleep. */
  collapse() {
    if (state.ended) return null;
    note('You went down where you were standing.');
    return this.sleep({ quality: 'collapse' });
  },
};

function enterActTwo() {
  state.act = 2;
  state.bedroomUnlocked = true;
  state.hasKeys = true;
  state.hasWallet = true;
  state.foodPortions = CONFIG.food.startingPortions;
  state.concealment = CONFIG.concealment.start;
  note('His door is open.');
  bus.emit('act:two');
}

export function adjustCondition(delta) {
  const before = state.condition;
  state.condition = Math.max(CONFIG.condition.min,
                    Math.min(CONFIG.condition.max, state.condition + delta));
  if (state.condition !== before) {
    effects.syncFromState(state);
    bus.emit('condition:change', state.condition);
  }
}

/** A sighting costs condition and never gives it back. */
export function registerSighting(entity, severity = 1) {
  state.sightings += 1;
  adjustCondition(CONFIG.condition.sightingPenalty * severity);
  effects.sighting(entity, { severity });
  effects.syncFromState(state);
  bus.emit('sighting', entity);
}

bus.on('clock:collapse', () => {
  if (!state.ended) bus.emit('ui:forceSleep');
});

/* Living in the dark and never turning anything on is tracked here rather
 * than in the light switch, so every source of light counts the same. */
bus.on('light:on', () => { state.flags.litSomethingToday = true; });
bus.on('tv:on', () => { state.flags.litSomethingToday = true; });

export function isLit() { return anyLightOn() || state.tvOn || state.computerOn; }

export default day;
