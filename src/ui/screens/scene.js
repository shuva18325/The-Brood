/**
 * scene.js (screen) — a scripted beat rendered as a plain block of text.
 *
 * Used for the Day 9 handoff, the Incursion's writing, the voice in the
 * street, and anything else that is a moment rather than an interface.
 */

import { h, bodyText } from '../index.js';
import audio from '../../audio.js';

export function render(ctx, host, args, ui) {
  if (args.title) host.appendChild(h('div', { class: 'ending-title' }, args.title));

  const beats = Array.isArray(args.beats) ? args.beats : [args.text || ''];
  for (const b of beats) host.appendChild(h('div', { class: 'ending-beat' }, b));

  if (args.choices && args.choices.length) {
    host.appendChild(h('hr', { class: 'rule' }));
    for (const c of args.choices) {
      host.appendChild(h('button', { class: 'choice', onclick: () => {
        audio.play('menu_select');
        if (c.act) c.act(ctx, ui);
        else ui.close();
      } }, c.label, c.sub ? h('small', {}, c.sub) : null));
    }
  } else if (args.closable !== false) {
    host.appendChild(h('div', { class: 'ending-foot' }, 'ESC'));
  }

  void bodyText;
}

/** The game speaking, not a surface in the world. Centred column. */
export const fullBleed = false;
