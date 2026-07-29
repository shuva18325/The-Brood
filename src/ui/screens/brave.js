/**
 * brave.js (screen) — Ending B. The timed defence.
 *
 * The attacker is the Incursion: clever, quiet, trying different ways in.
 * Understanding determines what he knows about barricading, which rooms
 * are defensible, and whether he recognises the texts as bait.
 *
 * It never shows itself until the end, and when it does it is still a
 * billboard — just one that is inside.
 */

import { h, head, bodyText } from '../index.js';
import { CONFIG } from '../../config.js';
import state from '../../state.js';
import audio from '../../audio.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import concealment from '../../systems/concealment.js';
import endings from '../../systems/endings.js';

export const closable = false;

/** The beats it works through, in order, trying different ways in. */
const BEATS = [
  { at: 0,   text: `Nine o'clock. Something tries the kitchen window, which is painted shut and has been painted shut since before Ray moved in.\n\nIt does not force it. It tries it, the way you try a door you expect to be locked.` },
  { at: 22,  text: `The bathroom vent. A slow scrape, then a pause, then the same scrape at a different angle.\n\nIt is working along the front of the building in order.` },
  { at: 48,  text: `Your phone lights up on the desk.\n\n"open the door. i'm cold. it's me."` , text_bait: true },
  { at: 74,  text: `The landing. Weight on the board outside the front door — the one you know the sound of.\n\nThen the handle, once, very gently, and released.` },
  { at: 100, text: `Nothing for eleven seconds.\n\nThen something is writing. You can hear it. On the outside of the door, low down, at about the height of somebody kneeling.` },
  { at: 124, text: `The window. Yours. The one with the bars.\n\nBars are not a lock. Bars are a size limit.` },
];

export function render(ctx, host, args, ui) {
  if (!args._started) {
    args._started = true;
    args.log = [];
    args.mistakes = 0;
    args.fired = 0;
    args.letIn = false;
    args.holding = false;
    args.position = 'open';   // open | bathroom | barricaded
    args.t = 0;
    args.beat = 0;
    args.done = false;
    audio.play('bed_silence_total');
    effects.atmosphere('siege', 2);
  }

  host.appendChild(head('the fifteenth night', 'it has been thinking about this apartment for six days'));

  const clockEl = h('div', { class: 'defence-clock' }, fmt(CONFIG.shotgun.braveDefenceSeconds - args.t));
  host.appendChild(clockEl);

  const logEl = h('div', { class: 'defence-log' });
  for (const l of args.log) logEl.appendChild(h('div', {}, l));
  host.appendChild(logEl);
  args._logEl = logEl;

  const actions = h('div', {});
  host.appendChild(actions);
  renderActions(ctx, actions, args, ui);

  if (args._timer) clearInterval(args._timer);
  args._timer = setInterval(() => {
    if (args.done) return;
    args.t += 1;
    clockEl.textContent = fmt(CONFIG.shotgun.braveDefenceSeconds - args.t);

    const beat = BEATS[args.beat];
    if (beat && args.t >= beat.at) {
      args.beat++;
      push(args, args._logEl, beat.text);
      audio.play(beat.text_bait ? 'phone_buzz' : 'incursion_test');
      if (beat.text_bait) args._baitLive = true;
      renderActions(ctx, actions, args, ui);
    }

    if (args.t >= CONFIG.shotgun.braveDefenceSeconds) finish(ctx, args, ui);
  }, 1000);
}

function renderActions(ctx, host, args, ui) {
  host.innerHTML = '';
  const u = understanding;

  const opts = [];

  if (args.position === 'open') {
    if (u.has('incursion_needs_opening')) {
      opts.push({
        label: 'the bathroom — no window, one door, take the door off its hinges',
        sub: 'you read that somewhere at five in the morning and somebody died anyway',
        act: () => { args.position = 'barricaded'; args.holding = true;
          push(args, args._logEl, 'You get the bathroom door off its hinges and set it against the frame with the mattress behind it. There is no window in here. That is the whole reason for the room.'); },
      });
    }
    opts.push({
      label: 'the bathroom',
      sub: 'no window',
      act: () => { args.position = 'bathroom'; args.holding = true; },
    });
    opts.push({
      label: 'stand in the main room where you can see three doorways',
      sub: 'it feels correct',
      act: () => { args.position = 'open'; args.mistakes++; args.holding = false; },
    });
  } else {
    opts.push({
      label: 'hold still and say nothing',
      sub: '',
      act: () => { args.holding = true; },
    });
    opts.push({
      label: 'move to see what it is doing',
      sub: 'it will hear where you moved to',
      act: () => { args.mistakes++; args.holding = false; audio.play('step'); },
    });
  }

  if (state.hasShotgun && state.shells > 0) {
    opts.push({
      label: `fire — ${state.shells} left`,
      sub: u.has('incursion_fragile')
        ? 'the only thing in this city it kills'
        : 'the loudest thing in eleven blocks',
      act: () => {
        state.shells--; args.fired++;
        audio.play('shotgun_fire');
        effects.shake(1, 1.2);
        concealment.event('shotgunFired');
      },
    });
  }

  if (args._baitLive) {
    opts.push({
      label: 'take the chain off',
      sub: u.has('texts_are_bait') ? 'you know exactly what is out there' : 'it knew about the cups',
      act: () => { args.letIn = true; finish(ctx, args, ui); },
    });
  }

  for (const o of opts) {
    host.appendChild(h('button', { class: 'choice', onclick: () => {
      audio.play('menu_select'); o.act(); if (!args.done) renderActions(ctx, host, args, ui);
    } }, o.label, o.sub ? h('small', {}, o.sub) : null));
  }
}

function push(args, logEl, text) {
  args.log.push(text);
  if (logEl && logEl.appendChild) logEl.appendChild(h('div', {}, text));
}

function fmt(s) {
  s = Math.max(0, s);
  return String(Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0');
}

function finish(ctx, args, ui) {
  if (args.done) return;
  args.done = true;
  clearInterval(args._timer);
  const held = args.holding && args.position !== 'open' && args.mistakes < 3;
  const record = endings.brave({
    held, mistakes: args.mistakes, fired: args.fired, letIn: args.letIn,
    position: args.position,
  });
  ui.swap('ending', { record, closable: false });
}

export function onClose(ctx) { /* not closable */ }

/** The game speaking, not a surface in the world. Centred column. */
export const fullBleed = false;
