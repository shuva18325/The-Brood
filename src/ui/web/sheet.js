/**
 * sheet.js — the crowdsourced tracking spreadsheet.
 *
 * The single most important document in the game, and it is somebody's
 * shared sheet. Grid lines, column headers, a row-number gutter, tabs
 * along the bottom, and a "Last edit" stamp.
 *
 * Volunteer-maintained, half-verified, argued over in the comments — and
 * it decides the ending.
 */

import { h } from '../index.js';
import state from '../../state.js';
import understanding from '../../systems/understanding.js';
import clock from '../../systems/clock.js';
import { sheetFor, TABS, hoursSince } from '../../content/sheet.js';

export const url = 'https://docs.google.com/spreadsheets/d/1kQ7…/edit#gid=0';

export function titleFor(loc) {
  const t = loc.query.tab || 'rules';
  return `CONFIRMED SIGHTINGS TRACKER — ${t} — Google Sheets`;
}

export function render(host, loc, nav) {
  // §4.1. Each sheet tab is its own address, so back works between them.
  const args = { tab: loc.query.tab || 'rules' };
  const T = (id) => nav.href('sheet', '/spreadsheets/d/1kQ7/edit', { tab: id });
  const day = state.day;
  const data = sheetFor(day);
  const tab = args.tab || 'rules';

  const app = h('div', { class: 'sheet-app' });
  host.appendChild(app);

  app.appendChild(h('div', { class: 'sheet-top' },
    h('div', { class: 'sheet-title' }, 'CONFIRMED SIGHTINGS TRACKER — SOUTHEAST'),
    h('div', { class: 'sheet-meta' },
      day >= 14
        ? 'Last edit: yesterday 19:20 by sheetmom · 6 editors · '
        : 'Last edit: ',
      day >= 14 ? null : h('b', {}, `${1 + Math.floor(Math.random() * 9)} minutes ago`),
      day >= 14 ? null : ' by PT_Ellis · 6 editors · ',
      'View only')));

  const wrap = h('div', { class: 'sheet-grid-wrap' });
  app.appendChild(wrap);

  if (tab === 'rules') {
    understanding.read('sheet.rules', data.rules);
    wrap.appendChild(h('div', {
      style: 'font-family:Arial,sans-serif;font-size:12.5px;white-space:pre-wrap;' +
             'padding:14px 18px;line-height:1.6;color:#222;max-width:76ch',
    }, data.rules.body));
  }

  if (tab === 'sightings') {
    understanding.read('sheet.sightings', { u: 4, flags: ['city_composition'] });
    grid(wrap, ['City', 'Where', 'Type', 'Time', 'Source', 'Verified', 'Notes'],
      data.sightings.map(r => [r.city, r.loc, r.type, r.time, r.src,
        r.ver === 'yes' ? 'VERIFIED' : '—', r.notes]), { wrapCol: 6 });
  }

  if (tab === 'roads') {
    // Reading this tab, with that column, is the Keys ending.
    understanding.read('sheet.impacts',
      { u: 10, flags: ['spreadsheet_impacts', 'roadkill_window', 'roadkill_adapt'] });
    app.insertBefore(h('div', { class: 'sheet-comment' },
      h('b', {}, 'PT_Ellis'), ' — "hours since" is now minus the impact timestamp. it updates itself. ' +
      'read the tab with that column. that is what it is for.'), wrap);
    const rows = data.impacts.map(r => {
      const hs = hoursSince(r, day, state.hour);
      return { cells: [r.route, r.mp, r.vehicle, r.ts, hs === null ? '—' : String(hs),
        String(r.ver || '—'), r.outcome], hot: hs !== null && hs <= 9 };
    });
    grid(wrap, ['Route', 'Milepost', 'Vehicle', 'Impact', 'hours since', 'Ver.', 'Outcome'],
      rows.map(r => r.cells), { wrapCol: 6, hotRows: rows.map(r => r.hot), hotCol: 4 });
    app.appendChild(h('div', { class: 'sheet-comment' },
      h('b', {}, 'mudflat'), ' (unresolved) — "read the OUTCOME column, not the vehicle column. ' +
      'every drive that worked was under nine hours after a logged impact on the same stretch. ' +
      'every single one of them. and the hours column tells you where we are right now."'));
  }

  if (tab === 'flooding') {
    understanding.read('sheet.flooding', { u: 8, flags: ['roads_flooded', 'undertow_water'] });
    app.insertBefore(h('div', { class: 'sheet-comment' },
      h('b', {}, 'sheetmom'), ' — a road on this tab is not closed. it has stopped existing. ' +
      'nobody has reopened one. not one, in eleven days.'), wrap);
    grid(wrap, ['Road', 'Status', 'Notes'],
      data.flooding.map(r => [r.road, r.status, r.note]), { wrapCol: 2 });
  }

  if (tab === 'cities') {
    understanding.read('sheet.cities', { u: 8, flags: ['city_composition'] });
    grid(wrap, ['City', 'Commons', 'Big', 'Inside', 'Red', 'Other', 'Notes'],
      data.cities.map(r => [r.city, r.commons, r.big, r.inside, r.red, r.other, r.note]),
      { wrapCol: 6 });
  }

  const tabs = h('div', { class: 'sheet-tabs' });
  for (const t of TABS) {
    tabs.appendChild(h('div', {
      class: 'sheet-tab' + (t.id === tab ? ' on' : ''), tabindex: '0',
      onclick: () => nav.go(T(t.id)),
      onkeydown: (e) => { if (e.key === 'Enter') nav.go(T(t.id)); },
    }, t.label));
  }
  app.appendChild(tabs);
  void clock;
}

function grid(host, cols, rows, opts = {}) {
  const t = h('table', { class: 'gsheet' });
  const thead = h('thead', {}, h('tr', {},
    h('th', { style: 'width:30px' }, ''),
    ...cols.map((c, i) => h('th', {}, String.fromCharCode(65 + i) + '  ' + c))));
  const tb = h('tbody', {});
  rows.forEach((r, ri) => {
    const tr = h('tr', {}, h('td', { class: 'rowhead' }, String(ri + 2)));
    r.forEach((cell, ci) => {
      const v = String(cell ?? '');
      let cls = '';
      if (/VERIFIED|made it|MADE IT/i.test(v)) cls = 'v';
      else if (/^(no|NO|GONE|CLOSED)/.test(v) || /no survivor/i.test(v)) cls = 'x';
      if (ci === opts.wrapCol) cls += ' wrap';
      if (opts.hotRows && opts.hotRows[ri] && ci === opts.hotCol) cls += ' hot';
      tr.appendChild(h('td', { class: cls.trim() }, v));
    });
    tb.appendChild(tr);
  });
  t.appendChild(thead); t.appendChild(tb);
  host.appendChild(t);
}

export default render;
