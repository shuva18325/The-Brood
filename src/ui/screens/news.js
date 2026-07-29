/**
 * news.js (screen) — the television.
 *
 * Official, authoritative, calm, and hours behind. It decays across four
 * movements into a ninety-second loop, then a test pattern, then snow,
 * which is the loudest thing in the apartment.
 */

import { h, head, backLink, bodyText } from '../index.js';
import state from '../../state.js';
import audio from '../../audio.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import concealment from '../../systems/concealment.js';
import { newsFor, tvState } from '../../content/news.js';

export function render(ctx, host, args, ui) {
  const mode = tvState(state.day);

  if (args.article) return renderArticle(ctx, host, args, ui);

  host.appendChild(head('WKRV 9', `Day ${state.day} · the set is fifteen years old · ${volLabel()}`,
    volTabs(ctx, ui)));

  if (mode === 'snow') {
    audio.play('bed_tv_static', { loop: true });
    effects.screenNoise('heavy', 3);
    host.appendChild(h('div', { class: 'tv-static' }, 'NO SIGNAL'));
    host.appendChild(bodyText(
      `Static.\n\nIt is the loudest thing in the apartment. It is louder than the fridge and louder than the pipes and it is louder than anything that has happened outside in six days.\n\nYou leave it on for eleven minutes because it is a sound a machine makes on purpose.`,
      'news'));
    understanding.read('n39', { u: 1 });
    return;
  }

  if (mode === 'pattern') {
    audio.play('tv_channel');
    host.appendChild(h('div', { class: 'tv-static' }, 'COLOUR BARS · 1 kHz'));
    host.appendChild(bodyText(
      `A tone.\n\nIt is at 1 kHz and it does not stop, and after four minutes you understand that you are going to have to be the one who turns it off.`,
      'news'));
    understanding.read('n38', { u: 1 });
    return;
  }

  const items = newsFor(state.day);
  if (mode === 'loop') {
    const loopItem = items.find(n => n.loop) || items[0];
    host.appendChild(h('div', { class: 'tv-frame' },
      h('div', { class: 'tv-chyron' }, 'EMERGENCY INFORMATION'),
      bodyText(loopItem.body, 'news'),
      h('div', { class: 'scr-sub' }, '— ninety seconds. then again. —')
    ));
    understanding.read(loopItem.id, loopItem);
    host.appendChild(h('hr', { class: 'rule' }));
    host.appendChild(h('div', { class: 'scr-sub' }, 'ARCHIVE — what the set still remembers'));
  }

  const list = h('div', {});
  for (const n of items) {
    if (mode === 'loop' && n.loop) continue;
    const read = !!state.readIds[n.id];
    list.appendChild(h('div', {
      class: 'row' + (read ? ' read' : ''),
      onclick: () => ui.rerender({ article: n.id }),
    },
      h('div', { class: 'meta' }, `${n.source} · Day ${n.day} · ${n.time}`),
      h('div', { class: 'h' }, effects.corruptText(n.headline, { source: 'news', reread: read }))
    ));
  }
  host.appendChild(list);
}

function renderArticle(ctx, host, args, ui) {
  const n = newsFor(state.day).find(a => a.id === args.article);
  if (!n) { ui.rerender({ article: null }); return; }

  const reread = !!state.readIds[n.id];
  understanding.read(n.id, n);

  host.appendChild(backLink('back', () => ui.rerender({ article: null })));
  host.appendChild(head(effects.corruptText(n.headline, { source: 'news', reread }),
    `${n.source} · Day ${n.day} · ${n.time}`));
  host.appendChild(bodyText(n.body, 'news'));
}

function volLabel() {
  return state.tvVolume === 'up' ? 'volume: up' : 'volume: as low as it goes';
}

function volTabs(ctx, ui) {
  const row = h('div', { class: 'scr-tabs' });
  for (const v of ['low', 'up']) {
    row.appendChild(h('div', {
      class: 'tab' + (state.tvVolume === v ? ' on' : ''),
      onclick: () => {
        if (state.tvVolume === v) return;
        state.tvVolume = v;
        audio.play('tv_channel');
        if (v === 'up') concealment.event('tvVolumeUp');
        ui.rerender();
      },
    }, v === 'low' ? 'turn it down' : 'turn it up'));
  }
  return row;
}

export function onClose(ctx) {
  audio.stop('bed_tv_static');
}
