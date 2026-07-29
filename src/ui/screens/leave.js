/**
 * leave.js (screen) — the front door, in Act 2.
 *
 * The keys have been on the desk since the tenth. Every day he waits he
 * knows more, and every day he waits the car is worth less. Neither meter
 * is ever shown.
 */

import { h, head, bodyText } from '../index.js';
import { CONFIG } from '../../config.js';
import state from '../../state.js';
import audio from '../../audio.js';
import concealment from '../../systems/concealment.js';
import endings from '../../systems/endings.js';
import clock from '../../systems/clock.js';

export function render(ctx, host, args, ui) {
  host.appendChild(head('the front door', `Day ${state.day} · ${clock.label()}`));

  host.appendChild(bodyText(flavour(), 'inner'));
  host.appendChild(h('hr', { class: 'rule' }));

  const night = clock.isDark();

  host.appendChild(h('button', {
    class: 'choice',
    onclick: () => go(ctx, ui),
  }, state.hasKeys ? 'take the two-by-four off and go' : 'you do not have his keys',
     h('small', {}, night
       ? 'it is dark. the advisory is not to travel between eight and six.'
       : 'the advisory says travel between ten and three, on interstates only, and do not stop.')));

  host.appendChild(h('button', {
    class: 'choice', onclick: () => ui.close(),
  }, 'put it back', h('small', {}, 'you have done this eleven times')));
}

function flavour() {
  const lines = [];
  lines.push(`Deadbolt. Chain. And the two-by-four he screwed across it on the sixth day, which takes about ninety seconds to get off and which is ninety seconds of noise.`);

  if (state.hasShotgun) lines.push(`You are carrying his shotgun. It does not go in a car well and you are going to take it anyway.`);
  if (state.foodPortions <= 2) lines.push(`There is nothing left in the fridge worth carrying.`);
  if (state.concealment < 30) lines.push(`Whatever was in the box is nearly finished. You can tell because you have started listening differently.`);
  if (state.day >= CONFIG.days.last) lines.push(`Today is the fifteenth.`);

  lines.push(`Down two flights, out the street door, forty metres to the kerb. The blue one, parked where it has been parked for the whole time you have been here.`);
  return lines.join('\n\n');
}

async function go(ctx, ui) {
  if (!state.hasKeys) { ui.close(); return; }
  state.frontDoorOpened = true;
  concealment.event('frontDoorOpened');
  audio.play('chain_rattle');
  audio.play('door_open');

  ui.closeAll();
  await ui.plate('', { hold: 900 });
  const record = endings.keys({ day: state.day });
  ui.clearPlate();
  ui.open('ending', { record, closable: false });
}

export const closable = true;

/** The game speaking, not a surface in the world. Centred column. */
export const fullBleed = false;
