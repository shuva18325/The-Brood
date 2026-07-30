/**
 * newssite.js — wkrv9.com.
 *
 * A local network-affiliate TV station website in a mid-size coastal
 * Virginia city, last redesigned in 2017 by a vendor. Not a national
 * paper. Not a designed publication.
 *
 * §1: the chrome is never stylised. A station CMS does not render blood on
 * its masthead. The horror is that it renders eleven people missing in the
 * same layout it uses for high school football scores, with a sidebar ad
 * for a personal injury attorney next to it.
 */

import { h } from '../index.js';
import state from '../../state.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import { newsFor } from '../../content/news.js';
import IMG from '../imagery.js';

/**
 * Site furniture. This is not lore — it is the ordinary local journalism
 * that has to keep running underneath, because that is the entire point.
 */
const FILLER = [
  { h: 'School board approves calendar change for next year', s: 'Education', d: 1 },
  { h: 'Maury tops Granby 21‑14 in season opener', s: 'Sports', d: 1 },
  { h: 'Norfolk to resurface eight streets in Colonial Place', s: 'Community', d: 1 },
  { h: 'Restaurant week returns to Ghent with 22 participants', s: 'Community', d: 1 },
  { h: 'WKRV 9 is hiring: weekend meteorologist', s: 'Jobs', d: 1 },
  { h: 'Win tickets to the Harbor Fest fireworks', s: 'Contests', d: 1 },
  { h: 'Man arrested after Military Highway pursuit', s: 'News', d: 2 },
  { h: 'Council delays vote on stormwater fee for third time', s: 'News', d: 3 },
  { h: 'ODU announces fall enrollment figures', s: 'Education', d: 4 },
  { h: 'Recipe: the crab cakes everyone asks Judy about', s: 'Community', d: 5 },
];

const MOST_READ_FROZEN = [
  'Man arrested after Military Highway pursuit',
  'Maury tops Granby 21‑14 in season opener',
  'Recipe: the crab cakes everyone asks Judy about',
  'School board approves calendar change for next year',
  'Win tickets to the Harbor Fest fireworks',
];

const NAV = ['News', 'Weather', 'Sports', 'Traffic', 'Investigates', 'Community',
  'Contests', 'Jobs', 'Watch Live'];

export const url = 'http://www.wkrv9.com/';

export function movement(day) {
  if (day >= 13) return 4;
  if (day >= 9) return 3;
  if (day >= 5) return 2;
  return 1;
}

/** The tab and bookmark title for an address on this site. */
export function titleFor(loc) {
  const m = loc.path.match(/^\/news\/([\w-]+)/);
  if (!m) return 'WKRV 9 — Norfolk, Virginia news, weather and sports';
  const a = newsFor(state.day).find(x => x.id === m[1]);
  return a ? a.headline + ' — WKRV 9' : 'WKRV 9';
}

export function render(host, loc, nav) {
  // §4.1. The URL is the state: /news/<id> is an article, / is the front page.
  const m = loc.path.match(/^\/news\/([\w-]+)/);
  const args = { article: m ? m[1] : null };
  const A = (id) => nav.href('news', id ? '/news/' + id : '/');
  const day = state.day;
  const mv = movement(day);

  // Days 13–15: the stylesheet fails to load and the page renders as raw
  // browser default. This costs nothing and it is the worst frame in the
  // game, because nothing has been added — something has been removed.
  if (mv === 4) return renderUnstyled(host, args, nav, day);

  const page = h('div', { class: 'wkrv' });
  host.appendChild(page);

  /* --- the cookie banner that never goes away --- */
  page.appendChild(h('div', { class: 'wkrv-cookie' },
    h('span', {}, 'We use cookies to improve your experience. By continuing you agree to our use of cookies.'),
    h('button', { onclick: (e) => e.stopPropagation() }, 'I Agree'),
    h('button', { onclick: (e) => e.stopPropagation() }, 'Preferences')));

  /* --- leaderboard ad. It renders for the entire game. --- */
  page.appendChild(h('div', { class: 'wkrv-adlabel' }, 'Advertisement'));
  page.appendChild(h('div', { class: 'wkrv-leader' },
    h('img', { src: IMG.ad(day % 2 ? 'car' : 'hvac', 728, 90), width: 728, height: 90, alt: '' })));

  /* --- masthead --- */
  page.appendChild(h('div', { class: 'wkrv-masthead' },
    h('img', { src: IMG.stationLogo(168, 54), width: 168, height: 54, alt: 'WKRV 9' }),
    h('div', { class: 'wkrv-mast-right' },
      h('span', { class: 'wkrv-live' }, '● WATCH LIVE'),
      h('div', {}, `Norfolk, VA · ${dateLabel(day)}`))));

  page.appendChild(h('div', { class: 'wkrv-nav' },
    ...NAV.map(n => h('a', { href: '#', onclick: (e) => e.preventDefault() }, n))));

  /* --- movement 2: the red banner appears and stays --- */
  if (mv >= 2) {
    page.appendChild(h('div', { class: 'wkrv-breaking' },
      'BREAKING  ',
      h('span', {}, breakingLine(day))));
  }

  /* --- movement 3: an alert bar overlays the masthead. Ads still render. */
  if (mv >= 3) {
    page.appendChild(h('div', { class: 'wkrv-alert' },
      h('b', {}, 'CIVIL EMERGENCY MESSAGE — HAMPTON ROADS'),
      'Shelter in place. Do not travel between 8 p.m. and 6 a.m. Do not approach standing water. ' +
      'Do not respond to voices from the street. This message will be updated at 12‑hour intervals.'));
  }

  const cols = h('div', { class: 'wkrv-cols' });
  page.appendChild(cols);
  const main = h('div', { class: 'wkrv-main' });
  const side = h('div', { class: 'wkrv-side' });
  cols.appendChild(main); cols.appendChild(side);

  if (args.article) return renderArticle(main, side, args, nav, day, mv, page);

  /* ---- the running order ------------------------------------------
   * Movement 1: the emergency stories sit BELOW a school board meeting.
   * Movement 2 onward: they move up. Nobody announces the change.
   */
  const stories = newsFor(day);
  const filler = FILLER.filter(f => f.d <= day);
  const ordered = mv === 1
    ? [...filler.slice(0, 2).map(asFiller), ...stories.map(asStory), ...filler.slice(2).map(asFiller)]
    : [...stories.map(asStory), ...filler.map(asFiller)];

  const lead = ordered[0];
  if (lead) {
    main.appendChild(h('div', { class: 'wkrv-lead' },
      h('h1', {}, h('a', { href: '#', onclick: (e) => { e.preventDefault(); if (lead.id) nav.go(A(lead.id)); } },
        effects.corruptText(lead.headline, { source: 'news', reread: !!state.readIds[lead.id] }))),
      h('div', { class: 'wkrv-byline' }, `${lead.source || 'WKRV 9 Staff'} · Updated ${agoLabel(lead, day)}`),
      lead.body ? h('div', { class: 'wkrv-dek' }, firstPara(lead.body)) : null,
      // Movement 3: some images fail to load and show alt text.
      mv >= 3 ? h('div', { class: 'wkrv-broken' }, 'wkrv9_lead_photo_0912.jpg') : null));
  }

  main.appendChild(h('div', { class: 'wkrv-secthead' }, 'Latest'));
  const list = h('ul', { class: 'wkrv-list' });
  main.appendChild(list);
  for (const s of ordered.slice(1)) {
    list.appendChild(h('li', {},
      h('h2', {}, h('a', { href: '#', onclick: (e) => { e.preventDefault(); if (s.id) nav.go(A(s.id)); } },
        effects.corruptText(s.headline, { source: 'news', reread: !!state.readIds[s.id] }))),
      h('div', { class: 'meta' }, `${s.section || s.source} · ${agoLabel(s, day)}`),
      s.body ? h('div', { class: 'snip' }, firstPara(s.body).slice(0, 150) + '…') : null));
  }

  sidebar(side, day, mv);
  page.appendChild(footer(day));
}

function asStory(n) { return { ...n, section: n.source }; }
function asFiller(f) { return { headline: f.h, section: f.s, source: 'WKRV 9 Staff', day: f.d }; }

/* ------------------------------------------------------------------ */

function renderArticle(main, side, args, nav, day, mv, page) {
  const A = (id) => nav.href('news', id ? '/news/' + id : '/');
  const n = newsFor(day).find(a => a.id === args.article);
  if (!n) { nav.go(A(null)); return; }
  const reread = !!state.readIds[n.id];
  understanding.read(n.id, n);

  const art = h('div', { class: 'wkrv-article' });
  main.appendChild(art);
  art.appendChild(h('div', { style: 'font-size:11px;color:#777;margin-bottom:6px' },
    h('a', { href: '#', style: 'color:#16406d', onclick: (e) => { e.preventDefault(); nav.go(A(null)); } }, 'Home'),
    ' › ' + (n.source || 'News')));
  art.appendChild(h('h1', {}, effects.corruptText(n.headline, { source: 'news', reread })));
  art.appendChild(h('div', { class: 'wkrv-byline' },
    `By WKRV 9 Staff · ${n.source} · Posted ${n.time} · Updated ${agoLabel(n, day)}`));
  art.appendChild(h('div', { class: 'wkrv-share' },
    h('span', {}, 'Share'), h('span', {}, 'Tweet'), h('span', {}, 'Email'), h('span', {}, 'Print')));

  if (mv >= 3) art.appendChild(h('div', { class: 'wkrv-broken' }, `wkrv9_${n.id}_photo.jpg`));

  const body = h('div', { class: 'wkrv-body' });
  for (const p of effects.corruptText(n.body, { source: 'news', reread }).split('\n\n')) {
    body.appendChild(h('p', {}, p));
  }
  art.appendChild(body);

  // An ad, mid-article, because of course there is.
  art.appendChild(h('div', { class: 'wkrv-adlabel' }, 'Advertisement'));
  art.appendChild(h('img', { src: IMG.ad('injury', 468, 60), width: 468, height: 60, alt: '' }));

  sidebar(side, day, mv);
  page.appendChild(footer(day));
}

/* ------------------------------------------------------------------ */

function sidebar(side, day, mv) {
  // The weather widget. A temperature, a stock photo, a five-day forecast.
  side.appendChild(h('div', { class: 'wkrv-wx' },
    h('img', { src: IMG.weatherStock(), alt: '' }),
    h('div', { class: 'wkrv-wx-now' },
      h('div', { class: 'wkrv-wx-temp' }, '84°'),
      h('div', { class: 'wkrv-wx-meta' },
        h('div', {}, 'Norfolk, VA'),
        h('div', {}, mv >= 3 ? 'Feels like 91° · Haze' : 'Feels like 89° · Humid'),
        h('div', {}, mv >= 2 ? 'Tides running high' : 'Winds SSE 8 mph'))),
    h('div', { class: 'wkrv-wx-week' },
      ...['THU', 'FRI', 'SAT', 'SUN', 'MON'].map((d, i) =>
        h('div', {}, h('b', {}, `${86 - i}°`), d)))));

  side.appendChild(h('div', { class: 'wkrv-adlabel' }, 'Advertisement'));
  side.appendChild(h('img', { src: IMG.ad('injury'), width: 300, height: 250, alt: '' }));

  // MOST READ. Numbered, unrelated, and from movement 3 it stops updating
  // and shows the same five stories for the rest of the game.
  const mr = mv >= 3 ? MOST_READ_FROZEN
    : [...FILLER.filter(f => f.d <= day).map(f => f.h), ...newsFor(day).slice(0, 3).map(n => n.headline)]
        .slice(0, 5);
  side.appendChild(h('div', { class: 'wkrv-mostread' },
    h('h3', {}, 'MOST READ'),
    h('ol', {}, ...mr.map(t => h('li', {}, h('a', { href: '#', onclick: (e) => e.preventDefault() }, t))))));

  side.appendChild(h('div', { class: 'wkrv-adlabel' }, 'Advertisement'));
  side.appendChild(h('img', { src: IMG.ad('roof'), width: 300, height: 250, alt: '' }));
}

function footer(day) {
  return h('div', { class: 'wkrv-foot' },
    h('div', {}, '© ' + (2020 + (day % 2)) + ' WKRV‑TV, a Sherwood Broadcasting station. All rights reserved.'),
    h('div', { style: 'margin-top:4px' },
      ...['Terms of Use', 'Privacy Policy', 'EEO Report', 'FCC Public File', 'Closed Captioning',
        'Contact Us', 'Advertise With Us'].map((t, i) =>
        h('span', {}, i ? ' · ' : '', h('a', { href: '#', onclick: (e) => e.preventDefault() }, t)))),
    h('div', { style: 'margin-top:6px;color:#999' },
      'FCC Public File assistance: (757) 555‑0199'));
}

/* ------------------------------------------------------------------ */
/* Movement 4 — the CSS does not load                                   */
/* ------------------------------------------------------------------ */

function renderUnstyled(host, args, nav, day) {
  const page = h('div', { class: 'unstyled' });
  host.appendChild(page);

  if (args.article) {
    const n = newsFor(day).find(a => a.id === args.article);
    if (n) {
      understanding.read(n.id, n);
      page.appendChild(h('p', {}, h('a', { href: '#', onclick: (e) => { e.preventDefault(); nav.go(A(null)); } }, 'Home')));
      page.appendChild(h('h1', {}, n.headline));
      page.appendChild(h('p', {}, h('i', {}, `${n.source} — ${n.time}`)));
      for (const p of n.body.split('\n\n')) page.appendChild(h('p', {}, p));
      return;
    }
  }

  page.appendChild(h('h1', {}, 'WKRV 9'));
  page.appendChild(h('hr', {}));
  page.appendChild(h('h2', {}, 'EMERGENCY INFORMATION'));
  page.appendChild(h('p', {}, 'Remain indoors.'));
  page.appendChild(h('p', {}, 'Do not travel between 8 p.m. and 6 a.m.'));
  page.appendChild(h('p', {}, 'Do not approach standing water.'));
  page.appendChild(h('p', {}, 'Do not respond to voices from the street.'));
  page.appendChild(h('p', {}, 'If you require medical assistance, there is no number to call at this time.'));
  page.appendChild(h('hr', {}));
  const ul = h('ul', {});
  for (const n of newsFor(day).slice(0, 14)) {
    ul.appendChild(h('li', {}, h('a', {
      href: '#', onclick: (e) => { e.preventDefault(); nav.go(A(n.id)); },
    }, n.headline)));
  }
  page.appendChild(ul);
  page.appendChild(h('hr', {}));
  page.appendChild(h('p', {}, h('small', {}, '© WKRV-TV, a Sherwood Broadcasting station.')));
}

/* ------------------------------------------------------------------ */

function firstPara(body) { return (body || '').split('\n\n')[0]; }

function agoLabel(s, day) {
  const age = day - (s.day || day);
  if (age <= 0) return `${1 + Math.floor(Math.random() * 4)} hours ago`;
  if (age === 1) return 'yesterday';
  return `${age} days ago`;
}

function dateLabel(day) {
  const d = new Date(2026, 8, 1 + day);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function breakingLine(day) {
  if (day >= 11) return 'Eleven districts unassessed · Curfew in effect · Do not travel after dark';
  if (day >= 9) return 'Shelter in place order remains in effect for all coastal localities';
  if (day >= 7) return 'Bridge-Tunnel closed indefinitely · Water pressure reduced citywide';
  return 'State of emergency declared for all coastal localities';
}

export default render;
