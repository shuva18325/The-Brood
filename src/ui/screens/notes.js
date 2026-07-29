/**
 * notes.js (screen) — Ray's handwriting.
 */

import { h, head, backLink, bodyText } from '../index.js';
import state from '../../state.js';
import effects from '../../effects.js';
import audio from '../../audio.js';
import understanding from '../../systems/understanding.js';
import { notesFor } from '../../content/notes.js';

export function render(ctx, host, args, ui) {
  const notes = notesFor(state.day);

  if (args.sub) {
    const n = notes.find(x => x.id === args.sub);
    if (!n) { ui.rerender({ sub: null }); return; }
    const reread = !!state.readIds[n.id];
    understanding.read(n.id, n);
    audio.play('paper');
    host.appendChild(backLink('the pile', () => ui.rerender({ sub: null })));
    host.appendChild(h('div', { class: 'scr-title' }, n.title));
    host.appendChild(h('hr', { class: 'rule' }));
    host.appendChild(h('div', { class: 'doc' },
      effects.corruptText(n.body, { source: 'doc', reread })));
    return;
  }

  host.appendChild(head('his notes',
    `${notes.length} of them · a legal pad, index cards, the back of a water bill`));
  host.appendChild(bodyText(
    `He was not writing for anybody. He was working something out on paper because he had nobody to say it to, and you were eleven feet away the whole time.`,
    'inner'));
  host.appendChild(h('hr', { class: 'rule' }));

  for (const n of notes) {
    const read = !!state.readIds[n.id];
    host.appendChild(h('div', { class: 'row' + (read ? ' read' : ''), onclick: () => ui.rerender({ sub: n.id }) },
      h('div', { class: 'h' }, n.title),
      h('div', { class: 'meta' }, firstLine(n.body))
    ));
  }
}

function firstLine(body) {
  const l = body.split('\n').find(x => x.trim().length) || '';
  return l.length > 64 ? l.slice(0, 61) + '…' : l;
}

/** The game speaking, not a surface in the world. Centred column. */
export const fullBleed = false;
