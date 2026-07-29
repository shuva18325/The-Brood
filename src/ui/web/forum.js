/**
 * forum.js — a regional forum running vBulletin-era software, sometime
 * after everyone stopped maintaining it.
 *
 * Absolutely not Reddit. Table layout, hard 1px borders, zero radius,
 * Verdana 11px, and a left column on every post with an avatar, a user
 * title, a join date, a post count and a location.
 *
 * The people have to look real: a user with 14,000 posts and a user with
 * 3, one who types in all lowercase, one who uses too many exclamation
 * marks, one whose signature says they are a retired firefighter.
 */

import { h } from '../index.js';
import state from '../../state.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import { THREADS, postsFor } from '../../content/forum.js';
import IMG from '../imagery.js';

export const url = 'http://forums.hrtidewater.net/';

/** Who these people are, in the way a forum tells you: a left column. */
const USERS = {
  granby_st:          { title: 'Administrator',      posts: 14208, joined: 'Mar 2009', loc: 'Norfolk, VA',
    sig: '"The bins go out on Tuesday." — every landlord I have ever had' },
  mudflat:            { title: 'Senior Member',      posts: 3117,  joined: 'Nov 2011', loc: 'Larchmont',
    sig: 'I am not being difficult. I am being early.' },
  Cal_Whitfield:      { title: 'Senior Member',      posts: 6620,  joined: 'Jan 2010', loc: 'Virginia Beach',
    sig: 'Retired firefighter, City of Norfolk, 28 yrs.\nBe kind. Check on your neighbours.' },
  berkley_dan:        { title: 'Junior Member',      posts: 41,    joined: 'Aug 2026', loc: 'Berkley', sig: '' },
  PT_Ellis:           { title: 'Moderator',          posts: 2884,  joined: 'Jun 2013', loc: 'Portsmouth',
    sig: 'substitute teacher. please put the TIME in the row.' },
  sheetmom:           { title: 'Senior Member',      posts: 1907,  joined: 'Feb 2012', loc: 'Chesapeake',
    sig: 'mom of 2, wife of 1, keeper of the spreadsheet' },
  nightjar_88:        { title: 'Member',             posts: 604,   joined: 'Sep 2018', loc: 'Ghent', sig: '' },
  oysterknife:        { title: 'Senior Member',      posts: 4412,  joined: 'Apr 2007', loc: 'Ocean View',
    sig: '19 years on this street\nwww.tidewateroysterco.com  (site is down)' },
  vaporlock:          { title: 'Senior Member',      posts: 8890,  joined: 'Oct 2010', loc: 'Larchmont',
    sig: '¯\\_(ツ)_/¯' },
  Q_from_Suffolk:     { title: 'Member',             posts: 388,   joined: 'Jul 2020', loc: 'Suffolk', sig: '' },
  hrtransitguy:       { title: 'Member',             posts: 741,   joined: 'May 2016', loc: 'Norfolk',
    sig: 'HRT operator. Opinions my own. Route 20 forever.' },
  mom_of_3_chesapeake:{ title: 'Member',             posts: 233,   joined: 'Mar 2021', loc: 'Chesapeake',
    sig: 'Blessed!!! 🙏' },
  stillwaters:        { title: 'Member',             posts: 512,   joined: 'Dec 2015', loc: 'Larchmont', sig: '' },
  RN_nights:          { title: 'Junior Member',      posts: 27,    joined: 'Sep 2026', loc: '—', sig: '' },
  deadmall:           { title: 'Senior Member',      posts: 5230,  joined: 'Feb 2008', loc: 'Military Circle',
    sig: '   ___\n  /   \\   still here\n  \\___/' },
  archivist_p:        { title: 'Member',             posts: 190,   joined: 'Jan 2019', loc: '—',
    sig: 'I do not answer questions about sourcing.' },
  nine_of_swords:     { title: 'Junior Member',      posts: 3,     joined: 'Sep 2026', loc: '—', sig: '' },
};

const DEFAULT_USER = { title: 'Junior Member', posts: 12, joined: 'Sep 2026', loc: '—', sig: '' };

/**
 * A handful of posts carry an image. They are all bad photographs, which
 * is the only kind anybody is taking.
 */
const ATTACHMENTS = {
  f009: { kind: 'tormentor', cap: 'IMG_2214.jpg (48.2 KB, 61 views)', opts: { x: 0.58, y: -0.10, scale: 0.55, stops: -0.9 } },
  f054: { kind: 'gleaner',   cap: 'colley_0140.jpg (31.7 KB, 402 views)', opts: { x: 0.30, y: 0.22, scale: 0.28, blurPx: 11 } },
  f093: { kind: 'anguish',   cap: 'idk.jpg (22.9 KB, 1,884 views)', opts: { x: 0.66, y: 0.24, scale: 0.30, stops: -1.3, quality: 0.09 } },
  f156: { kind: 'incursion', cap: 'door.jpg (18.4 KB, 96 views)', opts: { x: 0.44, y: 0.05, scale: 0.40, throughGlass: false, stops: -1.1 } },
};

export function render(host, args, nav) {
  const day = state.day;
  const page = h('div', { class: 'vb' });
  host.appendChild(page);

  page.appendChild(h('div', { class: 'vb-head' },
    h('div', {}, h('b', {}, 'Hampton Roads Tidewater Forums')),
    h('div', { class: 'sub' }, 'Local discussion for Norfolk, Portsmouth, Chesapeake, Virginia Beach and the Eastern Shore')));
  page.appendChild(h('div', { class: 'vb-strip' },
    h('span', {}, 'Welcome, '), h('a', { href: '#', onclick: e => e.preventDefault() }, 'guest'),
    h('span', {}, '.  You last visited: Today at ' + (day > 9 ? '04:12 AM' : '08:31 AM')),
    h('span', { style: 'float:right' }, day >= 12 ? 'Server load high — posting may fail' : '1,204 users online')));

  if (args.thread) return renderThread(page, args, nav, day);

  page.appendChild(h('div', { class: 'vb-crumb' },
    h('a', { href: '#', onclick: e => e.preventDefault() }, 'Forum'), ' › Hampton Roads › ',
    h('b', {}, 'Current Situation')));

  const table = h('table', { class: 'vb-table' },
    h('thead', {}, h('tr', {},
      h('th', { style: 'width:auto' }, 'Thread / Thread Starter'),
      h('th', { class: 'vb-num' }, 'Replies'),
      h('th', { class: 'vb-num' }, 'Views'),
      h('th', { style: 'width:130px' }, 'Last Post'))));
  const tb = h('tbody', {});
  table.appendChild(tb);
  page.appendChild(table);

  for (const t of THREADS.filter(x => x.day <= day)) {
    const posts = postsFor(t.id, day);
    if (!posts.length) continue;
    const last = posts[posts.length - 1];
    const unread = posts.filter(p => !state.readIds[p.id]).length;
    tb.appendChild(h('tr', {},
      h('td', {},
        t.id === 'tracker' || t.id === 'roads' ? h('span', { class: 'vb-sticky' }, 'Sticky: ') : null,
        h('a', { href: '#', tabindex: '0', onclick: (e) => { e.preventDefault(); nav.go({ thread: t.id }); } },
          effects.corruptText(t.title, { source: 'forum' })),
        unread ? h('span', { style: 'color:#b3261e;font-size:9px' }, `  (${unread} new)`) : null,
        h('div', { style: 'color:#666;font-size:9.5px' }, 'Started by ' + posts[0].author)),
      h('td', { class: 'vb-num' }, String(posts.length - 1)),
      h('td', { class: 'vb-num' }, String(1200 + posts.length * 337 + t.day * 91)),
      h('td', { style: 'font-size:9.5px;color:#555' },
        h('div', {}, `Today, ${last.time}`),
        h('div', {}, 'by ' + last.author))));
  }

  page.appendChild(h('div', { class: 'vb-pages' },
    h('b', {}, '1'), h('a', { href: '#', onclick: e => e.preventDefault() }, '2'),
    h('a', { href: '#', onclick: e => e.preventDefault() }, '3'),
    h('span', { style: 'padding:0 4px' }, '…'),
    h('a', { href: '#', onclick: e => e.preventDefault() }, '47'),
    h('a', { href: '#', onclick: e => e.preventDefault() }, '»')));
}

/* ------------------------------------------------------------------ */

function renderThread(page, args, nav, day) {
  const t = THREADS.find(x => x.id === args.thread);
  const posts = postsFor(args.thread, day);

  page.appendChild(h('div', { class: 'vb-crumb' },
    h('a', { href: '#', tabindex: '0', onclick: (e) => { e.preventDefault(); nav.go({ thread: null }); } }, 'Forum'),
    ' › Hampton Roads › Current Situation › ', h('b', {}, t.title)));

  posts.forEach((p, i) => {
    const reread = !!state.readIds[p.id];
    understanding.read(p.id, p);
    const u = USERS[p.author] || DEFAULT_USER;

    const content = h('div', { class: 'vb-postcontent' });

    // Quote boxes, nested two deep where somebody is arguing.
    if (p.quotes) {
      for (const q of p.quotes) {
        content.appendChild(h('div', { class: 'vb-quote' },
          h('div', { class: 'qh' }, `Originally posted by ${q.who}`), q.text));
      }
    }

    content.appendChild(h('div', { class: 'vb-text' },
      effects.corruptText(p.body, { source: 'forum', reread })));

    const att = ATTACHMENTS[p.id];
    if (att) {
      content.appendChild(h('div', { class: 'vb-attach' },
        h('img', { src: IMG.phoneSnap(att.kind, att.opts), width: 480, height: 360, alt: att.cap }),
        h('div', { class: 'cap' }, 'Attached Images: ' + att.cap)));
    }

    if (p.edited || (i > 0 && i % 7 === 0)) {
      content.appendChild(h('div', { class: 'vb-edit' },
        `Last edited by ${p.author}; Today at ${p.time}. Reason: typo`));
    }

    if (u.sig) content.appendChild(h('div', { class: 'vb-sig' }, u.sig));

    page.appendChild(h('div', { class: 'vb-post' + (p.corrupt ? ' gone' : '') },
      h('div', { class: 'vb-post-top' },
        h('span', {}, `Day ${p.day}, ${p.time}`),
        h('span', {}, '#' + (i + 1))),
      h('div', { class: 'vb-post-body' },
        h('div', { class: 'vb-userbox' },
          h('div', { class: 'who' }, p.author),
          h('div', { class: 'title' }, p.op ? 'Thread Starter' : u.title),
          h('img', { src: IMG.avatar(p.author, 60), width: 60, height: 60, alt: '' }),
          h('div', { class: 'stat' }, 'Join Date: ' + u.joined),
          h('div', { class: 'stat' }, 'Location: ' + u.loc),
          h('div', { class: 'stat' }, 'Posts: ' + u.posts.toLocaleString())),
        content)));
  });

  page.appendChild(h('div', { class: 'vb-pages' },
    h('b', {}, '1'), h('a', { href: '#', onclick: e => e.preventDefault() }, '2'),
    h('a', { href: '#', onclick: e => e.preventDefault() }, '»'),
    h('span', { style: 'margin-left:10px;color:#666' },
      `Showing results 1 to ${posts.length} of ${posts.length}`)));
}

export default render;
