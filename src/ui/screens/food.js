/**
 * food.js (screen) — the fridge.
 *
 * A visible physical countdown, opened in 3D and read here. Rationing
 * extends days and degrades condition. Cooking is warm food and warmth is
 * a sign that somebody lives here.
 */

import { h, head, bodyText } from '../index.js';
import { CONFIG } from '../../config.js';
import state, { note } from '../../state.js';
import audio from '../../audio.js';
import concealment from '../../systems/concealment.js';
import { linesFor, heading } from '../../content/objectives.js';

/**
 * §7. THE LIST ON THE DOOR.
 *
 * This is the game's entire objective system and its entire tutorial, and
 * it is a piece of paper under a magnet. Ray kept a list; after the handoff
 * the player keeps it, in different handwriting, and nothing says so.
 *
 * Rules, from objectives.js and worth repeating where the rendering lives:
 * no checkboxes, no "complete", no arrows, nothing opens on its own, and
 * every line has to be something a person would actually write on a fridge.
 * A player who never reads it can still finish the game.
 */
function fridgeList(day) {
  const lines = linesFor(day);
  if (!lines.length) return null;
  const wrap = h('div', { class: 'fridge-list' });
  wrap.appendChild(h('div', { class: 'fl-magnet' }));
  wrap.appendChild(h('div', { class: 'fl-head' },
    heading(day, CONFIG.days.handoff)));
  for (const l of lines) {
    let done = false;
    try { done = !!l.done(state); } catch { done = false; }
    wrap.appendChild(h('div', { class: 'fl-line' + (done ? ' out' : '') }, l.text));
  }
  // The paper is a takeaway menu. It has always been a takeaway menu.
  wrap.appendChild(h('div', { class: 'fl-foot' },
    'GOLDEN WOK · 757‑555‑0170 · free delivery over $15'));
  return wrap;
}

export function render(ctx, host, args, ui) {
  const p = state.foodPortions;
  host.appendChild(head('the fridge', `${p} portion${p === 1 ? '' : 's'} · ${state.cooking ? 'the hotplate is on' : 'the hotplate is off'}`));

  const list = fridgeList(state.day);
  if (list) host.appendChild(list);

  host.appendChild(bodyText(describe(p), 'inner'));
  host.appendChild(h('hr', { class: 'rule' }));

  if (state.ateToday !== 'none') {
    host.appendChild(h('div', { class: 'dim' },
      state.ateToday === 'full' ? 'You have eaten today.' : 'You have had something today. Not much.'));
    return;
  }

  if (p <= 0) {
    host.appendChild(h('div', { class: 'bad' }, 'There is nothing in it.'));
    return;
  }

  const hot = state.cooking;

  host.appendChild(h('button', {
    class: 'choice', disabled: p < CONFIG.food.meal.full,
    onclick: () => eat(ctx, ui, 'full', hot),
  }, hot ? 'cook properly and eat' : 'eat properly — cold',
     h('small', {}, `two portions · ${hot ? 'the room will be warm for an hour' : 'straight out of the tin'}`)));

  host.appendChild(h('button', {
    class: 'choice',
    onclick: () => eat(ctx, ui, 'ration', hot),
  }, 'ration it',
     h('small', {}, 'one portion · it buys you a day and it costs you something')));

  host.appendChild(h('button', {
    class: 'choice',
    onclick: () => { state.ateToday = 'none'; note('You closed it again.'); ui.close(); },
  }, 'close it',
     h('small', {}, 'you were not going to eat, you were going to look')));
}

function eat(ctx, ui, kind, hot) {
  const cost = CONFIG.food.meal[kind];
  state.foodPortions = Math.max(0, state.foodPortions - cost);
  state.ateToday = kind;
  state.dishesLeft += 1;
  audio.play(hot ? 'eat_hot' : 'eat_cold');
  concealment.event(hot ? 'hotMeal' : 'coldMeal');
  ctx.world.updateFridge();
  note(hot ? 'You cooked. The room is warm.' : 'Cold, out of the tin, standing up.');
  ui.close();
}

function describe(p) {
  if (p <= 0) return `Empty. The light still works, which is worse.`;
  if (p <= 3) return `Two tins and something in a bag that you are not going to eat unless you have to.\n\nThe light comes on and it is the brightest thing in the apartment and you close it faster than you need to.`;
  if (p <= 7) return `It is going down faster than the arithmetic said it would, and you have done the arithmetic four times, and the arithmetic is not the problem.`;
  if (p <= 12) return `Tins, rice, a bag of onions, three things of his that you are still treating as his.\n\nYou take from the left because that is where the old stuff is. He set it up like that. You have not moved anything.`;
  return `More food than has been in this apartment since you got here.\n\nHe carried all of it up two flights in one trip because he did not want to do the stairs twice.`;
}

/** The game speaking, not a surface in the world. Centred column. */
export const fullBleed = false;
