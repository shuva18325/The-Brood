/**
 * ending.js (screen) — resolution.
 *
 * The text says what happened, in order, and stops. Nothing is explained
 * on the player's behalf. No codex entry closes a question.
 */

import { h } from '../index.js';
import state, { wipe } from '../../state.js';
import audio from '../../audio.js';
import understanding from '../../systems/understanding.js';
import { TERMINAL_LINE } from '../../content/mail.js';

export const closable = false;

const TITLES = {
  keys:  'THE KEYS',
  brave: 'BRAVE',
  found: '—',
  pathogen: '—',
};

export function render(ctx, host, args, ui) {
  if (args.forced === 'pathogen') return renderPathogen(ctx, host, args, ui);

  const r = args.record || state.ended;
  if (!r) { ui.close(); return; }

  host.appendChild(h('div', { class: 'ending-title' }, TITLES[r.id] || ''));

  for (const beat of r.beats) {
    host.appendChild(h('div', { class: 'ending-beat' }, beat));
  }

  host.appendChild(h('hr', { class: 'rule' }));
  host.appendChild(h('div', { class: 'ending-foot' }, footer(r)));

  host.appendChild(h('button', { class: 'choice', onclick: () => {
    wipe(); location.reload();
  } }, 'again', h('small', {}, 'from the first morning')));
}

/**
 * The only thing the ending screen tells you about your Understanding is
 * how many days it took and how it went. It never shows a number and it
 * never lists what you missed.
 */
function footer(r) {
  const days = r.day;
  const lines = [];
  lines.push(`Day ${days}.`);
  if (r.outcome === 'out') lines.push('Out.');
  else if (r.outcome === 'ambiguous') lines.push('Unresolved.');
  else lines.push('Not out.');
  return lines.join('   ·   ');
}

/* ------------------------------------------------------------------ */
/* the Pathogen. It never lied about what it was.                       */
/* ------------------------------------------------------------------ */

function renderPathogen(ctx, host, args, ui) {
  const m = args.mail;

  host.appendChild(h('div', { class: 'ending-title' }, '—'));

  host.appendChild(h('div', { class: 'ending-beat' },
    `The document opens. It is exactly what the preview said it was.\n\n` +
    `It is complete, it is genuine, it is better than anything on the forum, and reading it makes you understand three things you did not understand this morning.`));

  host.appendChild(h('div', { class: 'ending-beat' },
    `You read the whole thing. It takes four minutes.`));

  host.appendChild(h('div', { class: 'ending-beat' },
    `Then the machine does something with the fan that it has not done before.`));

  // The line. Once, ever, on a bad ending. Never as a scare.
  host.appendChild(h('div', { class: 'ending-beat', style: 'text-align:center; color:#8f8578' },
    (m && m.chinese ? TERMINAL_LINE.zh + '\n' : '') + TERMINAL_LINE.en));

  host.appendChild(h('div', { class: 'ending-beat' },
    `It told you not to. It has never once, in any case anybody has reconstructed, told anybody anything that was not true.\n\nIt does not hunt. It waits to be invited, and it makes being invited worth its while, and it has never had to do anything else.`));

  host.appendChild(h('div', { class: 'ending-beat', style: 'color:#6d6f74' },
    `Nobody will reconstruct this one. That is why the file is thin.`));

  const record = {
    id: 'pathogen', outcome: 'dead', day: state.day,
    understanding: understanding.score(), beats: [],
  };
  state.ended = record;
  audio.play('ending_found');

  host.appendChild(h('hr', { class: 'rule' }));
  host.appendChild(h('div', { class: 'ending-foot' }, `Day ${state.day}.   ·   Not out.`));
  host.appendChild(h('button', { class: 'choice', onclick: () => {
    wipe(); location.reload();
  } }, 'again', h('small', {}, 'from the first morning')));
}
