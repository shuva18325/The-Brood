/**
 * stranger.js (screen) — §2. A human being is knocking.
 *
 * The moral centre of Act 2, and it is deliberately built as a door rather
 * than a dialogue: the player never sees her, only hears her, and the one
 * thing they can do before choosing is put their eye to a gap in the frame.
 *
 * THIS SCREEN MUST NOT RESOLVE ANYTHING. Looking tells the player she looks
 * exactly like a person, which is not information and never has been. There
 * is no tell, no detail that gives it away, no reward for suspicion and no
 * reward for trust. Both buttons are live and neither is correct.
 *
 * The screen also cannot be escaped. Everything else in this game closes with
 * ESC; a person on the other side of your door does not.
 */

import { h } from '../index.js';
import state from '../../state.js';
import audio from '../../audio.js';
import { KNOCK, LOOK, ADMITTED, REFUSED } from '../../content/stranger.js';

export function render(ctx, host, args, ui) {
  const script = ctx.script;
  const step = args.step || 0;

  // The knock plays out over three beats, and only then are there buttons.
  // Nobody decides in the first four seconds.
  const shown = KNOCK.slice(0, step + 1);
  for (const b of shown) host.appendChild(h('div', { class: 'ending-beat' }, b));

  if (args.looked) {
    host.appendChild(h('div', { class: 'ending-beat look' }, LOOK));
  }

  host.appendChild(h('hr', { class: 'rule' }));

  if (step < KNOCK.length - 1) {
    host.appendChild(h('button', { class: 'choice', onclick: () => {
      audio.play('menu_select');
      args.step = step + 1;
      ui.rerender();
    } }, 'listen'));
    return;
  }

  if (!args.looked) {
    host.appendChild(h('button', { class: 'choice', onclick: () => {
      audio.play('menu_select');
      args.looked = true;
      state.flags.strangerSeen = true;
      ui.rerender();
    } }, 'look through the gap', h('small', {}, 'costs nothing')));
  }

  host.appendChild(h('button', { class: 'choice', onclick: () => {
    audio.play('door_open');
    script.resolveStranger('admitted');
    // swap, not open: this screen is not closable, so leaving it on the stack
    // would trap the player behind it when the aftermath closes.
    ui.swap('scene', { beats: ADMITTED });
  } }, 'take the board down',
     h('small', {}, 'she has nine tins and a can opener')));

  host.appendChild(h('button', { class: 'choice', onclick: () => {
    audio.play('menu_move');
    script.resolveStranger('refused');
    ui.swap('scene', { beats: REFUSED });
  } }, 'say nothing',
     h('small', {}, 'and keep saying nothing')));
}

/** A person at your door is not a thing you can press ESC on. */
export const closable = false;
export const fullBleed = false;
