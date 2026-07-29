/**
 * phone.js (screen) — family, inland, and his number.
 *
 * Every call is emotional pressure toward the wrong decision. He performs
 * calm for them and gets disturbingly good at it.
 */

import { h, head, tabRow, bodyText } from '../index.js';
import { CONFIG } from '../../config.js';
import state, { note } from '../../state.js';
import bus from '../../bus.js';
import audio from '../../audio.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import concealment from '../../systems/concealment.js';
import clock from '../../systems/clock.js';
import {
  FRIEND, familyFor, friendTextsFor, repliesFor, FRIEND_CALL,
} from '../../content/phone.js';

export function render(ctx, host, args, ui) {
  const tab = args.tab || 'family';
  const tabs = [{ id: 'family', label: 'family' }];
  if (state.day >= CONFIG.days.actTwo) tabs.push({ id: 'ray', label: FRIEND.name });

  host.appendChild(head('phone', signal(), tabRow(tabs, tab, (id) => ui.rerender({ tab: id }))));

  const shell = h('div', { class: 'phone-shell' });
  host.appendChild(shell);
  shell.appendChild(h('div', { class: 'phone-bar' },
    h('span', {}, clock.label()),
    h('span', {}, bars())
  ));

  if (tab === 'family') renderFamily(ctx, shell, host, ui);
  else renderRay(ctx, shell, host, ui);
}

function signal() {
  if (state.day >= 14) return 'most things are not sending';
  if (state.day >= 12) return 'one bar, sometimes';
  return '';
}

function bars() {
  const n = state.day >= 14 ? 1 : state.day >= 12 ? 2 : state.day >= 9 ? 3 : 4;
  return '▮'.repeat(n) + '▯'.repeat(4 - n);
}

/* ------------------------------------------------------------------ */

function renderFamily(ctx, shell, host, ui) {
  const msgs = familyFor(state.day);
  for (const m of msgs) {
    understanding.read(m.id, m);
    if (m.empty) {
      shell.appendChild(h('div', { class: 'msg them failed' },
        h('span', { class: 'dim' }, '(no text)'),
        h('span', { class: 't' }, `${m.from} · Day ${m.day}`)));
      continue;
    }
    shell.appendChild(h('div', { class: 'msg them' + (m.failed ? ' failed' : '') },
      effects.corruptText(m.body, { source: 'phone' }),
      h('span', { class: 't' }, `${m.from} · Day ${m.day} · ${m.time}`)));
  }

  for (const sent of state.phone.sent || []) {
    shell.appendChild(h('div', { class: 'msg me' + (sent.failed ? ' failed' : '') },
      sent.text, h('span', { class: 't' }, `Day ${sent.day}`)));
  }

  host.appendChild(h('hr', { class: 'rule' }));
  host.appendChild(h('div', { class: 'scr-sub' }, 'reply'));

  const options = repliesFor(state.day).filter(r => !(state.phone.usedReplies || {})[r.id]);
  if (!options.length) {
    host.appendChild(h('div', { class: 'dim' }, 'You have said all of it already. Several times.'));
  }
  for (const r of options.slice(-4)) {
    host.appendChild(h('button', {
      class: 'choice',
      onclick: () => sendReply(ctx, ui, r),
    }, r.label));
  }

  if (state.day >= 12) {
    host.appendChild(h('div', { class: 'scr-sub', style: 'margin-top:18px' },
      'As you become less able to explain, they become more frantic. That is the whole shape of it and there is nothing to do about it.'));
  }
}

function sendReply(ctx, ui, r) {
  state.phone.usedReplies = state.phone.usedReplies || {};
  state.phone.usedReplies[r.id] = true;
  state.phone.sent = state.phone.sent || [];

  const failed = state.day >= 14 || (state.day >= 12 && Math.random() < 0.4);
  state.phone.sent.push({ day: state.day, text: r.label.replace(/^"|"$/g, ''), failed });
  audio.play(failed ? 'phone_dead' : 'phone_buzz');
  concealment.event('answerPhone');
  if (failed && state.day >= 14) {
    note('It did not send. Your last message may not have sent either.');
  }
  ui.rerender();
}

/* ------------------------------------------------------------------ */

function renderRay(ctx, shell, host, ui) {
  const texts = friendTextsFor(state.day);

  if (!texts.length) {
    shell.appendChild(h('div', { class: 'dim', style: 'padding:20px 0' },
      'No messages.\n\nThe last one is from the eighth and it says "grabbing bread, you want anything".'));
  }

  for (const t of texts) {
    const first = !state.readIds[t.id];
    understanding.read(t.id, { u: 2 });
    shell.appendChild(h('div', { class: 'msg them' },
      effects.corruptText(t.body, { source: 'phone' }),
      h('span', { class: 't' }, `${FRIEND.name} · Day ${t.day} · ${t.time}`)));
    if (first && t.day >= 14) understanding.grant('texts_are_bait', 'the cups');
  }

  host.appendChild(h('hr', { class: 'rule' }));

  const stage = Math.min(FRIEND_CALL.length - 1, state.flags.friendVoicemailStage || 0);
  host.appendChild(h('button', {
    class: 'choice',
    onclick: () => callHim(ctx, ui),
  }, `call ${FRIEND.name}`, h('small', {}, FRIEND.number)));

  if (state.phone.lastCallText) {
    host.appendChild(bodyText(state.phone.lastCallText, 'phone'));
  }

  if (texts.length) {
    host.appendChild(h('div', { class: 'scr-sub', style: 'margin-top:18px' },
      'You are alone, six days out, and the question is whether the man who kept you alive for nine days is standing outside asking to be let in.'));
  }
  void stage;
}

function callHim(ctx, ui) {
  const day = state.day;
  const entry = [...FRIEND_CALL].reverse().find(c => c.day <= day) || FRIEND_CALL[0];
  state.flags.friendVoicemailStage = entry.stage;
  state.phone.calledFriend++;
  state.phone.lastCallText = entry.text;
  audio.play(entry.result === 'rings out' ? 'phone_ring' : 'phone_pickup');
  concealment.event('answerPhone');
  if (entry.result === 'picked up') {
    effects.sighting('incursion', { severity: 0.3 });
    understanding.grant('texts_are_bait', 'the open line');
  }
  bus.emit('phone:calledFriend', entry.stage);
  ui.rerender();
}
