/**
 * laptop.js (screen) — his laptop, which was never locked.
 */

import { h, head, backLink, bodyText } from '../index.js';
import state from '../../state.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import { laptopFor } from '../../content/notes.js';

export function render(ctx, host, args, ui) {
  const items = laptopFor(state.day);

  if (args.sub) {
    const l = items.find(x => x.id === args.sub);
    if (!l) { ui.rerender({ sub: null }); return; }
    const reread = !!state.readIds[l.id];
    understanding.read(l.id, l);
    host.appendChild(backLink('his laptop', () => ui.rerender({ sub: null })));
    host.appendChild(h('div', { class: 'scr-title' }, l.title));
    host.appendChild(h('hr', { class: 'rule' }));
    host.appendChild(h('div', { class: 'doc' },
      effects.corruptText(l.body, { source: 'doc', reread })));
    return;
  }

  host.appendChild(head('his laptop', 'no password. it has never had a password.'));
  host.appendChild(bodyText(
    `The battery is at forty-one percent and there is no charger in the room, because the charger is in his coat pocket, because he was going to be twenty minutes.`,
    'inner'));
  host.appendChild(h('hr', { class: 'rule' }));

  for (const l of items) {
    const read = !!state.readIds[l.id];
    host.appendChild(h('div', { class: 'row' + (read ? ' read' : ''), onclick: () => ui.rerender({ sub: l.id }) },
      h('div', { class: 'h' }, l.title)
    ));
  }
}
