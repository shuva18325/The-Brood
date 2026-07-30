/**
 * objectives.js — §7. What to do today, in the fiction.
 *
 * THE PROBLEM THIS SOLVES: a first-time player is put in a dark apartment
 * with no instructions and no goal, and the honest result is that they walk
 * into a wall for ninety seconds and quit. The game has a great deal to do
 * in it and no way of saying so.
 *
 * THE THING IT MUST NOT BECOME: a quest log. No checkboxes floating over
 * the world, no "OBJECTIVE COMPLETE", no arrow pointing at the fridge, no
 * panel that opens on its own. The moment the game speaks in its own voice
 * about tasks, it stops being an apartment and becomes software.
 *
 * SO: it is a list on the fridge. Ray kept one, in pencil, on the back of a
 * takeaway menu held up by a magnet, because that is what a person living
 * alone in a bad week does. The player reads it by looking at the fridge.
 * Lines get crossed off as they are done, in the same pencil.
 *
 * Two rules that keep it honest:
 *
 *   1. Every line is something a person would actually write. "eat" and
 *      "mark the day" and "check the boards", not "Objective: Consume 1x
 *      Food Portion". If a line could not appear on a real fridge, it is
 *      wrong and it comes out.
 *   2. It is ALWAYS optional. Nothing is gated on reading it. A player who
 *      never looks at the fridge can finish the game. The list is a
 *      courtesy, not a spine.
 *
 * After the handoff on day ten the handwriting is the player's own, because
 * by then the player is the one keeping the list. Nothing announces that.
 */

/**
 * `done(state)` decides whether a line is struck through. It reads state
 * only — no side effects, ever, because this runs on every render of the
 * fridge and a side effect here would fire dozens of times.
 */
/** Any bulb on, anywhere. `state.lights` is a map of rooms, not a boolean. */
function anyLight(s) {
  return !!(s.lights && Object.values(s.lights).some(Boolean));
}
/** `ateToday` is 'none' | 'ration' | 'full' — 'none' is falsy in meaning
 *  and truthy as a string, which is exactly the sort of thing that makes a
 *  checklist lie. */
function ate(s) { return s.ateToday && s.ateToday !== 'none'; }

export const LINES = [

/* ---- day one. This is the tutorial, and it is four lines of pencil. ---- */
{ id: 'o_look',  from: 1, to: 1,
  text: 'get up. look around. the light switch is by the door',
  done: (s) => anyLight(s) },
{ id: 'o_tv1',   from: 1, to: 3,
  text: 'put the news on. see if it is still saying nothing',
  done: (s) => !!s.tvOn },
{ id: 'o_pc1',   from: 1, to: 3,
  text: 'the boards. granby_st posts at night',
  done: (s) => !!s.computerOn },
{ id: 'o_eat1',  from: 1, to: 2,
  text: 'eat something. you did not yesterday',
  done: (s) => ate(s) },
{ id: 'o_mark',  from: 1, to: 20,
  text: 'mark the day',
  done: (s) => s.markedToday },
{ id: 'o_sleep', from: 1, to: 20,
  text: 'sleep on the mat, not the bed. bed is by the window',
  done: () => false },

/* ---- the ordinary week ---- */
{ id: 'o_eat',   from: 3, to: 20,
  text: 'eat',
  done: (s) => ate(s) },
{ id: 'o_water', from: 2, to: 10,
  text: 'fill everything that holds water',
  done: (s) => !!s.waterRunning },
{ id: 'o_curt',  from: 2, to: 20,
  text: 'curtain shut before dark',
  done: (s) => !s.curtainOpen },
{ id: 'o_light', from: 4, to: 20,
  text: 'light off when you are not in the room',
  done: (s) => !anyLight(s) },
{ id: 'o_notes', from: 4, to: 9,
  text: 'read the tracker before you believe anything on the forum',
  done: (s) => (s.web.history || []).some(u => /docs\.google/.test(u)) },

/* ---- his room, once it opens ---- */
{ id: 'o_room',  from: 8, to: 12,
  text: 'his door. you have been putting it off for four days',
  done: (s) => s.bedroomUnlocked },
{ id: 'o_notes2', from: 11, to: 16,
  text: 'the pages on his desk. all of them, not the top one',
  done: (s) => Object.keys(s.readIds).some(k => /^k\d/.test(k)) },

/* ---- Act 2 ---- */
{ id: 'o_gun',   from: 11, to: 20,
  text: 'know where it is without looking',
  done: (s) => !!s.hasShotgun },
{ id: 'o_quiet', from: 13, to: 20,
  text: 'quieter. everything quieter',
  done: () => false },
{ id: 'o_door',  from: 15, to: 16,
  text: 'do not open the door. for anyone. i mean it',
  done: () => false },
{ id: 'o_food',  from: 17, to: 20,
  text: 'count what is left. actually count it',
  done: (s) => !!s.fridgeOpen },
{ id: 'o_last',  from: 20, to: 20,
  text: 'nothing today. stay where you are.',
  done: () => false },
];

/** The lines that belong on the fridge on a given day. */
export function linesFor(day) {
  return LINES.filter(l => day >= l.from && day <= l.to);
}

/**
 * The heading over the list. It changes exactly once, at the handoff, and
 * the game never says why — the hand is different because the hand is
 * different.
 */
export function heading(day, handoff) {
  return day >= handoff ? 'today' : "ray's list";
}
