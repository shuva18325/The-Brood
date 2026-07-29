/**
 * sleep.js (screen) — lying down on someone else's floor.
 *
 * This is the day advance. Everything the day cost is charged here.
 */

import { h, head, bodyText } from '../index.js';
import { CONFIG } from '../../config.js';
import state from '../../state.js';
import audio from '../../audio.js';
import clock from '../../systems/clock.js';
import day from '../../systems/day.js';
import { conditionTier } from '../../config.js';

export function render(ctx, host, args, ui) {
  const check = day.sleepCheck();
  host.appendChild(head('the mat', `${clock.label()} · Day ${state.day}`));
  host.appendChild(bodyText(flavour(check), 'inner'));
  host.appendChild(h('hr', { class: 'rule' }));

  if (state.day >= CONFIG.days.last) {
    host.appendChild(h('div', { class: 'warn' },
      'If you lie down tonight you are staying. That is what staying is. There is no ceremony to it.'));
    host.appendChild(h('button', {
      class: 'choice',
      onclick: () => { ui.closeAll(); ctx.script.finale(); },
    }, 'lie down', h('small', {}, 'the fifteenth night')));
    host.appendChild(h('button', {
      class: 'choice', onclick: () => ui.close(),
    }, 'get up', h('small', {}, 'not yet')));
    return;
  }

  host.appendChild(h('button', {
    class: 'choice',
    onclick: () => doSleep(ctx, ui, check.quality),
  }, check.quality === 'good' ? 'sleep' : 'lie down anyway',
     h('small', {}, check.quality === 'good'
       ? 'the day is over'
       : 'you will lie there for hours and it will not count for much')));

  host.appendChild(h('button', {
    class: 'choice', onclick: () => ui.close(),
  }, 'get up', h('small', {}, 'there is still light')));
}

function flavour(check) {
  const tier = conditionTier(state.condition);
  const lines = [];

  lines.push(`Nine days of this floor before he went and five since. Your back has stopped being a thing you notice and started being a thing you are.`);

  if (!clock.canSleep() && state.hour < CONFIG.clock.sleepAllowedHour) {
    lines.push(`It is ${clock.label()}. The light is still coming through the bars in strips and lying across the boards.`);
  }
  if (state.hour >= CONFIG.clock.exhaustionHour) {
    lines.push(`It is ${clock.label()}. You have been up for nineteen hours doing nothing at all, which is the most tiring thing there is.`);
  }
  if (state.ateToday === 'none') lines.push(`You did not eat today. You will tell yourself you were not hungry.`);
  if (tier.level >= 2) lines.push(`Your hands have been doing the thing since about four.`);
  if (state.flags.livedInDarkness >= 2) lines.push(`You have not turned a light on in this apartment for two days and you have started to be able to see, which cannot be true.`);
  if (state.day >= CONFIG.days.actTwo) lines.push(`His door is open. You do not sleep in his bed. You have thought about it and you do not.`);

  void check;
  return lines.join('\n\n');
}

async function doSleep(ctx, ui, quality) {
  const wasDay = state.day;
  ui.closeAll();
  audio.play('lie_down');
  await ui.plate('', { hold: 600 });

  const summary = day.sleep({ quality });
  ctx.world.onDayAdvance();

  const lines = [];
  lines.push(`DAY ${state.day}`);
  if (summary && summary.notes.length) lines.push(...summary.notes);
  ui.el.plateText.textContent = lines.join('\n');

  await new Promise(r => setTimeout(r, 1500));
  ui.clearPlate();
  ctx.script.onWake(wasDay + 1);
  ctx.resume();
}

/** The game speaking, not a surface in the world. Centred column. */
export const fullBleed = false;
