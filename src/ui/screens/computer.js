/**
 * computer.js (screen) — the old desktop.
 *
 * Fast, specific, actionable, unverified, panicked and sometimes lethally
 * wrong. Also: a mail client on hardware old enough to be a door.
 */

import { h, head, tabRow, backLink, bodyText } from '../index.js';
import state from '../../state.js';
import bus from '../../bus.js';
import audio from '../../audio.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import { THREADS, POSTS, threadsFor, postsFor } from '../../content/forum.js';
import { mailFor, TERMINAL_LINE } from '../../content/mail.js';
import { docsFor, videosFor } from '../../content/docs.js';
import { sheetFor, TABS as SHEET_TABS, hoursSince } from '../../content/sheet.js';

const TABS = [
  { id: 'forum', label: 'forum' },
  { id: 'sheet', label: 'the sheet' },
  { id: 'files', label: 'files' },
  { id: 'video', label: 'video' },
  { id: 'mail',  label: 'mail' },
];

export function render(ctx, host, args, ui) {
  const tab = args.tab || 'forum';

  host.appendChild(head('—', netLabel(), tabRow(TABS, tab, (id) => ui.rerender({ tab: id, sub: null }))));

  if (tab === 'forum') return renderForum(ctx, host, args, ui);
  if (tab === 'sheet') return renderSheet(ctx, host, args, ui);
  if (tab === 'files') return renderFiles(ctx, host, args, ui);
  if (tab === 'video') return renderVideo(ctx, host, args, ui);
  if (tab === 'mail')  return renderMail(ctx, host, args, ui);
}

function netLabel() {
  if (state.day >= 14) return 'connection: intermittent · half the links are dead';
  if (state.day >= 11) return 'connection: slow';
  return 'connection: fine';
}

/* ------------------------------------------------------------------ */
/* forum                                                               */
/* ------------------------------------------------------------------ */

function renderForum(ctx, host, args, ui) {
  if (args.sub) {
    const t = THREADS.find(x => x.id === args.sub);
    host.appendChild(backLink('all threads', () => ui.rerender({ sub: null })));
    host.appendChild(h('div', { class: 'scr-title' }, t.title));
    host.appendChild(h('hr', { class: 'rule' }));

    const posts = postsFor(t.id, state.day);
    for (const p of posts) {
      const reread = !!state.readIds[p.id];
      understanding.read(p.id, p);
      const el = h('div', { class: 'post' + (p.corrupt ? ' gone' : '') },
        h('div', {},
          h('span', { class: 'who' + (p.op ? ' op' : '') }, p.author),
          h('span', { class: 'when' }, `Day ${p.day} · ${p.time}`)),
        h('div', { class: 'txt' }, effects.corruptText(p.body, { source: 'forum', reread }))
      );
      host.appendChild(el);
    }
    if (!posts.length) host.appendChild(h('div', { class: 'dim' }, 'nothing in here yet.'));
    return;
  }

  for (const t of threadsFor(state.day)) {
    const n = postsFor(t.id, state.day).length;
    const unread = postsFor(t.id, state.day).filter(p => !state.readIds[p.id]).length;
    host.appendChild(h('div', { class: 'row' + (unread ? '' : ' read'), onclick: () => ui.rerender({ sub: t.id }) },
      h('div', { class: 'h' }, t.title),
      h('div', { class: 'meta' }, `${n} posts${unread ? ` · ${unread} new` : ''}`)
    ));
  }
}

/* ------------------------------------------------------------------ */
/* the sheet — the single most important document in the game           */
/* ------------------------------------------------------------------ */

function renderSheet(ctx, host, args, ui) {
  const sub = args.sub || 'rules';
  const data = sheetFor(state.day);

  host.appendChild(h('div', { class: 'scr-sub' },
    `CONFIRMED SIGHTINGS TRACKER — shared · ${state.day >= 14 ? 'last edit: yesterday 19:20' : 'editing: 6 people'}`));
  host.appendChild(tabRow(SHEET_TABS, sub, (id) => ui.rerender({ sub: id })));
  host.appendChild(h('hr', { class: 'rule' }));

  if (sub === 'rules') {
    understanding.read('sheet.rules', data.rules);
    host.appendChild(bodyText(data.rules.body, 'doc'));
    return;
  }

  if (sub === 'sightings') {
    understanding.read('sheet.sightings', { u: 4, flags: ['city_composition'] });
    host.appendChild(table(
      ['City', 'Where', 'Type', 'Time', 'Source', 'Verified', 'Notes'],
      data.sightings.map(r => [r.city, r.loc, r.type, r.time, r.src, ver(r.ver), r.notes])
    ));
    return;
  }

  if (sub === 'roads') {
    // Reading this tab with the hours column is the Keys ending.
    understanding.read('sheet.impacts', { u: 10, flags: ['spreadsheet_impacts', 'roadkill_window', 'roadkill_adapt'] });
    host.appendChild(h('div', { class: 'sheet-note' },
      'PT_Ellis: "hours since" is now minus the impact timestamp. it updates itself. read the tab with that column. that is what it is for.'));
    host.appendChild(table(
      ['Route', 'Milepost', 'Vehicle', 'Impact', 'hours since', 'Ver.', 'Outcome'],
      data.impacts.map(r => {
        const hs = hoursSince(r, state.day, state.hour);
        return [r.route, r.mp, r.vehicle, r.ts,
          hs === null ? '—' : String(hs), String(r.ver || '—'), r.outcome];
      })
    ));
    host.appendChild(h('div', { class: 'sheet-note' },
      'mudflat (comment, unresolved): "read the OUTCOME column, not the vehicle column. every drive that worked was under nine hours after a logged impact on the same stretch. every single one of them. and the hours column tells you where we are right now."'));
    return;
  }

  if (sub === 'flooding') {
    understanding.read('sheet.flooding', { u: 8, flags: ['roads_flooded', 'undertow_water'] });
    host.appendChild(h('div', { class: 'sheet-note' },
      'sheetmom: a road on this tab is not closed. it has stopped existing. nobody has reopened one. not one, in eleven days.'));
    host.appendChild(table(
      ['Road', 'Status', 'Notes'],
      data.flooding.map(r => [r.road, r.status, r.note])
    ));
    return;
  }

  if (sub === 'cities') {
    understanding.read('sheet.cities', { u: 8, flags: ['city_composition'] });
    host.appendChild(table(
      ['City', 'Commons', 'Big', 'Inside', 'Red', 'Other', 'Notes'],
      data.cities.map(r => [r.city, r.commons, r.big, r.inside, r.red, r.other, r.note])
    ));
  }
}

function ver(v) { return v === 'yes' ? 'yes' : v === 'no' ? '—' : v; }

function table(cols, rows) {
  const wrap = h('div', { style: 'overflow-x:auto' });
  const t = h('table', { class: 'sheet' });
  const thead = h('thead', {}, h('tr', {}, ...cols.map(c => h('th', {}, c))));
  const tbody = h('tbody', {});
  for (const r of rows) {
    tbody.appendChild(h('tr', {}, ...r.map((cell, i) => {
      const cls = /verified|yes|MADE IT|made it/i.test(String(cell)) ? 'v'
                : /^(no|NO|GONE|CLOSED)/.test(String(cell)) ? 'x'
                : i === 4 ? 'u' : '';
      return h('td', { class: cls }, String(cell ?? ''));
    })));
  }
  t.appendChild(thead); t.appendChild(tbody);
  wrap.appendChild(t);
  return wrap;
}

/* ------------------------------------------------------------------ */
/* files                                                               */
/* ------------------------------------------------------------------ */

function renderFiles(ctx, host, args, ui) {
  const docs = docsFor(state.day);
  if (args.sub) {
    const d = docs.find(x => x.id === args.sub);
    if (!d) { ui.rerender({ sub: null }); return; }
    const reread = !!state.readIds[d.id];
    understanding.read(d.id, d);
    host.appendChild(backLink('files', () => ui.rerender({ sub: null })));
    host.appendChild(h('div', { class: 'scr-title' }, d.title));
    host.appendChild(h('div', { class: 'scr-sub' }, d.meta));
    host.appendChild(h('hr', { class: 'rule' }));
    host.appendChild(redacted(effects.corruptText(d.body, { source: 'doc', reread })));
    return;
  }

  host.appendChild(h('div', { class: 'scr-sub' },
    'posted in "Foundation dump — scans, half pages, whatever I have". half of these are photographs of a photocopy.'));
  host.appendChild(h('hr', { class: 'rule' }));
  for (const d of docs) {
    const read = !!state.readIds[d.id];
    host.appendChild(h('div', { class: 'row' + (read ? ' read' : ''), onclick: () => ui.rerender({ sub: d.id }) },
      h('div', { class: 'h' }, d.title),
      h('div', { class: 'meta' }, d.meta)
    ));
  }
}

/** ██ becomes a drawn box. */
function redacted(text) {
  const el = h('div', { class: 'doc' });
  const parts = text.split(/(█+)/g);
  for (const p of parts) {
    if (/^█+$/.test(p)) el.appendChild(h('span', { class: 'redact' }, p.replace(/█/g, '█')));
    else el.appendChild(document.createTextNode(p));
  }
  return el;
}

/* ------------------------------------------------------------------ */
/* video                                                               */
/* ------------------------------------------------------------------ */

function renderVideo(ctx, host, args, ui) {
  const vids = videosFor(state.day);
  if (args.sub) {
    const v = vids.find(x => x.id === args.sub);
    if (!v) { ui.rerender({ sub: null }); return; }
    understanding.read(v.id, v);
    host.appendChild(backLink('video thread', () => ui.rerender({ sub: null })));
    host.appendChild(h('div', { class: 'scr-title' }, v.title));
    host.appendChild(h('div', { class: 'scr-sub' }, v.by + ' · link dead, description only'));
    host.appendChild(h('hr', { class: 'rule' }));
    host.appendChild(bodyText(v.body, 'forum'));
    return;
  }
  host.appendChild(h('div', { class: 'scr-sub' },
    'deadmall has been writing descriptions of the ones that got taken down. it is not the same but it is something.'));
  host.appendChild(h('hr', { class: 'rule' }));
  for (const v of vids) {
    const read = !!state.readIds[v.id];
    host.appendChild(h('div', { class: 'row' + (read ? ' read' : ''), onclick: () => ui.rerender({ sub: v.id }) },
      h('div', { class: 'h' }, v.title),
      h('div', { class: 'meta' }, v.by)
    ));
  }
}

/* ------------------------------------------------------------------ */
/* mail — the Pathogen                                                 */
/* ------------------------------------------------------------------ */

function renderMail(ctx, host, args, ui) {
  const mail = mailFor(state.day);

  if (args.sub) {
    const m = mail.find(x => x.id === args.sub);
    if (!m) { ui.rerender({ sub: null }); return; }
    understanding.read(m.id, m);
    host.appendChild(backLink('inbox', () => ui.rerender({ sub: null })));
    host.appendChild(h('div', { class: 'scr-title' }, m.subject));
    host.appendChild(h('div', { class: 'scr-sub' }, 'from: ' + m.from));
    host.appendChild(h('hr', { class: 'rule' }));

    if (m.bait) {
      host.appendChild(h('div', { class: 'mail-preview' }, m.preview));
      host.appendChild(h('div', { class: 'body-text mail-danger' }, m.warning));
      host.appendChild(h('div', {},
        h('span', {
          class: 'mail-link',
          onclick: () => openLink(ctx, ui, m),
        }, m.body.split('\n').pop().trim())
      ));
      host.appendChild(h('div', { class: 'scr-sub', style: 'margin-top:22px' },
        'The preview is free. It has always been free. Nothing about the preview requires you to do anything.'));
    } else {
      host.appendChild(bodyText(m.body || '(nothing in the body)', 'doc'));
    }
    return;
  }

  const bait = mail.filter(m => m.bait).length;
  host.appendChild(h('div', { class: 'scr-sub' },
    `inbox · ${mail.length} messages${bait ? ` · ${bait} from no sender` : ''}`));
  host.appendChild(h('hr', { class: 'rule' }));

  for (const m of [...mail].reverse()) {
    const read = !!state.readIds[m.id];
    host.appendChild(h('div', { class: 'row' + (read ? ' read' : ''), onclick: () => ui.rerender({ sub: m.id }) },
      h('div', { class: 'meta' }, m.from),
      h('div', { class: 'h' + (m.bait ? ' bad' : '') }, m.subject),
      m.preview ? h('div', { class: m.bait ? 'mail-preview' : 'meta' }, m.preview) : null
    ));
  }
}

/**
 * The click. It cannot enter uninvited; this is the invitation.
 * It never lied about what it was.
 */
function openLink(ctx, ui, m) {
  state.flags.openedPathogenLink = true;
  // It does give you the thing. It has never once not given you the thing.
  for (const f of m.reward || []) understanding.grant(f, 'the link');
  audio.play('pathogen_hum');
  effects.screenNoise('heavy', 4);
  bus.emit('pathogen:invited', m.id);
  ui.swap('ending', { forced: 'pathogen', mail: m, line: TERMINAL_LINE });
}

export function onClose(ctx) { /* the machine stays on; that is the point */ }
