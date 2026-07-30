/**
 * pathogen.js — when it comes through a screen, and for how long.
 *
 * See CONFIG.pathogen for the schedule and the reasoning. The short version
 * is that it used to appear once, on the bad ending, and a thing you only
 * ever see after you have already lost is a death screen rather than a
 * presence. It is in the house from day 11.
 *
 * THE RULES THIS FILE ENFORCES, AND THEY ARE NOT NEGOTIABLE:
 *
 *   · No sound. Not a stinger, not a hum, not a click. The audio bus is
 *     not touched from here at all.
 *   · No cue of any kind — no shake, no cut, no vignette pulse, no
 *     subtitle, nothing on the HUD.
 *   · Nothing granted, nothing charged, no flag the player can find.
 *     Seeing it changes no number anywhere in the save.
 *   · At most once per surface per day.
 *
 * If a future change makes any glimpse announce itself, that is a bug, and
 * it is a bug that destroys the only thing this is for.
 */

import { CONFIG } from '../config.js';
import state from '../state.js';

/** How long a glimpse lasts today, in ms. Zero means not today. */
export function durationFor(day = state.day) {
  const row = CONFIG.pathogen.glimpses.find(([d]) => d === day);
  return row ? row[1] : 0;
}

/** How opaque. Early ones are not even solid. */
export function opacityFor(day = state.day) {
  const O = CONFIG.pathogen.opacityByDay;
  if (day >= O.full) return O.to;
  const first = CONFIG.pathogen.glimpses[0][0];
  const t = Math.max(0, Math.min(1, (day - first) / Math.max(1, O.full - first)));
  return O.from + (O.to - O.from) * t;
}

/** Is this surface open today at all? */
export function activeOn(surface, day = state.day) {
  const P = CONFIG.pathogen;
  if (surface === 'tv') return day >= P.tvFromDay;
  if (surface === 'monitor') return day >= P.monitorFromDay;
  return false;
}

/** Has this surface already had its one glimpse today? */
function spent(surface) {
  return state.eventsFired['pathogenGlimpse_' + surface] === state.day;
}

/** Same test effects.js uses, so the two agree about what a flash is. */
function reducedFlashing() {
  if (CONFIG.a11y.reducedFlashing) return true;
  return typeof matchMedia === 'function'
    && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** What has to be on screen for a given surface to be being looked at. */
const SURFACE = { tv: '.tvscreen', monitor: '.desktop' };

/**
 * Try to put it on a surface.
 *
 * It is mounted on the document rather than inside the screen that summoned
 * it, because it is on the DISPLAY and not in the application — and because
 * anything parented to a screen gets wiped the next time that screen
 * re-renders, which would cut a 1.5-second manifestation down to whatever
 * happened before the next repaint.
 *
 * For the same reason the liveness test is "is that kind of screen still
 * up", not "is this particular element still attached": the desktop
 * re-renders on a clock tick, so holding a reference to one render's DOM
 * node means the glimpse is silently cancelled most of the time.
 *
 * @param {string} surface  'tv' or 'monitor'
 * @param {string} url  the image
 * @returns {boolean} whether it appeared
 */
export function tryGlimpse(surface, url) {
  if (!document.querySelector(SURFACE[surface] || '\0')) return false;
  if (!activeOn(surface)) return false;
  if (spent(surface)) return false;
  const ms = durationFor();
  if (!ms) return false;
  /* Reduced flashing turns the short ones off entirely: a two-frame
   * full-screen change IS a flash, and it is precisely the thing that
   * setting exists to prevent. The long ones survive, because a picture
   * that stays on the screen for a second is not a flash — so a player
   * with the setting on still meets it, just later and only when it is
   * unambiguous. Nothing is withheld from them. */
  if (reducedFlashing() && ms < 300) return false;
  if (Math.random() > CONFIG.pathogen.chance) return false;

  state.eventsFired['pathogenGlimpse_' + surface] = state.day;

  const el = document.createElement('div');
  el.className = 'fx-glimpse fx-glimpse-' + surface;
  el.style.backgroundImage = `url(${url})`;
  el.style.opacity = String(opacityFor());
  // aria-hidden: a screen reader announcing it would be the loudest cue in
  // the game, and there is not supposed to be one.
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
  return true;
}

export default { tryGlimpse, durationFor, opacityFor, activeOn };
