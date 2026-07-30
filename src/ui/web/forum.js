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
 *
 * PROMPT 4 §4/§5: IT WORKS NOW. Every link navigates to an address, the
 * player has an account and can post and can start a thread, replies come
 * back over the following days, replies quote, search searches, pagination
 * paginates, read state is tracked, and threads the player posted in show a
 * new-reply badge until they go and look.
 *
 * Routes:
 *   /                       thread list        ?sort=last|replies|views|title  ?p=N
 *   /t/<id>                 one thread         ?p=N  ?reply=1  ?quote=<postId>
 *   /new                    start a thread
 *   /search?q=<terms>       search post bodies
 *   /u/<handle>             a member's profile
 */

import { h } from '../index.js';
import state, { save, note } from '../../state.js';
import audio from '../../audio.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import concealment from '../../systems/concealment.js';
import clock from '../../systems/clock.js';
import { THREADS, postsFor } from '../../content/forum.js';
import { TOPICS, repliesTo } from '../../content/replies.js';
import IMG from '../imagery.js';

export const url = 'http://forums.hrtidewater.net/';
const PER_PAGE = 12;
const POSTS_PER_PAGE = 10;

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

/** The player's own left column, once they have one. */
function meUser() {
  return {
    title: 'Junior Member',
    posts: state.web.posts.length,
    joined: 'Sep 2026',
    loc: '—',
    sig: '',
  };
}

function userOf(author) {
  if (author === state.web.handle) return meUser();
  return USERS[author] || DEFAULT_USER;
}

/**
 * A handful of posts carry an image. They are all bad photographs, which
 * is the only kind anybody is taking.
 */
const ATTACHMENTS = {
  f009: { kind: 'tormentor', cap: 'IMG_2214.jpg (48.2 KB, 61 views)' },
  f054: { kind: 'gleaner',   cap: 'colley_0140.jpg (31.7 KB, 402 views)' },
  f093: { kind: 'anguish',   cap: 'idk.jpg (22.9 KB, 1,884 views)' },
  f156: { kind: 'incursion', cap: 'door.jpg (18.4 KB, 96 views)' },
};

/* ------------------------------------------------------------------ */
/* THE PLAYER'S OWN POSTS AND THE REPLIES TO THEM (§5.2)               */
/* ------------------------------------------------------------------ */

/** Every post in a thread: the authored ones, the player's, and the replies. */
function allPosts(threadId, day) {
  const out = postsFor(threadId, day).slice();

  for (const p of state.web.posts) {
    if (p.thread !== threadId) continue;
    out.push({
      id: p.id, thread: p.thread, author: state.web.handle, day: p.day,
      time: p.time, body: p.body, mine: true, op: p.op, quotes: p.quotes,
    });
    // The replies that have landed by today.
    for (const r of repliesTo(p.topic, p.day)) {
      if (r.day > day) continue;
      out.push({
        id: r.id, thread: p.thread, author: r.author, day: r.day,
        time: replyTime(r.id), body: r.body,
        quotes: [{ who: state.web.handle, text: firstLine(p.body) }],
        grants: r.grants, beliefs: r.beliefs, marks: r.marks,
        isReply: true,
      });
    }
  }
  out.sort((a, b) => a.day - b.day || String(a.time).localeCompare(String(b.time)));
  return out;
}

/** Stable per-reply timestamp, derived from the id so it never drifts. */
function replyTime(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  const hh = 6 + (Math.abs(hash) % 17);
  const mm = Math.abs(hash >> 5) % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * §4.1. A bare URL in a post is a link, because on a real board it is —
 * vBulletin has auto-linked pasted addresses since 2001. Returns an array
 * of text nodes and anchors, so it drops straight into `h(...)`.
 *
 * The addresses people paste here go to real pages in the game. A link
 * that is styled like a link and does nothing is the single most
 * immersion-breaking thing a fake computer can do.
 */
function linkify(text, nav) {
  const out = [];
  const re = /\bhttps?:\/\/[^\s<>"')\]]+/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(document.createTextNode(text.slice(last, m.index)));
    // Trailing punctuation belongs to the sentence, not to the address.
    let url = m[0];
    let tail = '';
    while (/[.,;:!?]$/.test(url)) { tail = url.slice(-1) + tail; url = url.slice(0, -1); }
    out.push(h('a', {
      href: url, class: 'vb-url',
      onclick: (e) => { e.preventDefault(); nav.go(url); },
    }, url));
    if (tail) out.push(document.createTextNode(tail));
    last = m.index + m[0].length;
  }
  out.push(document.createTextNode(text.slice(last)));
  return out;
}

function firstLine(body) {
  const l = String(body).split('\n').find(x => x.trim());
  return (l || '').slice(0, 120);
}

/** How many replies to the player's posts have landed that they have not read. */
export function unseenReplies(day = state.day) {
  let n = 0;
  for (const p of state.web.posts) {
    for (const r of repliesTo(p.topic, p.day)) {
      if (r.day <= day && !state.web.seenReplies[r.id]) n++;
    }
  }
  return n;
}

/** Which threads have unseen replies, for the list badges. */
function threadsWithUnseen(day) {
  const set = new Set();
  for (const p of state.web.posts) {
    for (const r of repliesTo(p.topic, p.day)) {
      if (r.day <= day && !state.web.seenReplies[r.id]) set.add(p.thread);
    }
  }
  return set;
}

/**
 * Mark a reply seen, and pay for it if it is the one that used the details
 * the player gave away. The charge is silent and it happens here, two days
 * after the post, which is the point.
 */
function seeReply(r) {
  if (state.web.seenReplies[r.id]) return;
  state.web.seenReplies[r.id] = state.day;
  if (r.grants) for (const f of r.grants) understanding.grant(f, 'the forum');
  if (r.beliefs) for (const b of r.beliefs) state.beliefs[b] = true;
  if (r.marks && !state.flags.postedLocationCharged) {
    state.flags.postedLocationCharged = state.day;
    concealment.event('postedLocation');
    // No note, no subtitle, no cue. The player finds out from the morning.
  }
  save();
}

/* ------------------------------------------------------------------ */
/* the page title, for the tab and the bookmark                         */
/* ------------------------------------------------------------------ */

export function titleFor(loc) {
  const m = loc.path.match(/^\/t\/([\w-]+)/);
  if (m) {
    const t = THREADS.find(x => x.id === m[1]) || userThread(m[1]);
    if (t) return t.title + ' — Tidewater Forums';
  }
  if (loc.path === '/new') return 'Post New Thread — Tidewater Forums';
  if (loc.path === '/search') return `Search Results: ${loc.query.q || ''} — Tidewater Forums`;
  if (loc.path.startsWith('/u/')) return loc.path.slice(3) + ' — Tidewater Forums';
  return 'Hampton Roads Tidewater Forums';
}

/** Threads the player started. */
function userThread(id) {
  const p = state.web.posts.find(x => x.op && x.thread === id);
  return p ? { id, title: p.title, day: p.day, mine: true } : null;
}

function allThreads(day) {
  const out = THREADS.filter(t => t.day <= day).map(t => ({ ...t }));
  for (const p of state.web.posts) {
    if (!p.op) continue;
    out.push({ id: p.thread, title: p.title, day: p.day, mine: true });
  }
  return out;
}

/* ------------------------------------------------------------------ */

export function render(host, loc, nav) {
  const day = state.day;
  const page = h('div', { class: 'vb' });
  host.appendChild(page);

  page.appendChild(h('div', { class: 'vb-head' },
    h('a', { class: 'vb-logo', href: nav.href('forum', '/'),
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/')); } },
      h('b', {}, 'Hampton Roads Tidewater Forums')),
    h('div', { class: 'sub' }, 'Local discussion for Norfolk, Portsmouth, Chesapeake, Virginia Beach and the Eastern Shore')));

  const unseen = unseenReplies(day);
  page.appendChild(h('div', { class: 'vb-strip' },
    h('span', {}, 'Welcome, '),
    h('a', {
      href: nav.href('forum', '/u/' + (state.web.handle || 'guest')),
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/u/' + (state.web.handle || 'guest'))); },
    }, state.web.handle || 'guest'),
    h('span', {}, '.  You last visited: Today at ' + (day > 10 ? '04:12 AM' : '08:31 AM')),
    unseen ? h('a', {
      class: 'vb-newrep',
      href: nav.href('forum', '/'),
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/')); },
    }, `${unseen} new repl${unseen === 1 ? 'y' : 'ies'} to your posts`) : null,
    h('span', { style: 'float:right' }, day >= 14 ? 'Server load high — posting may fail' : '1,204 users online')));

  // Search box, in the strip where a vBulletin board puts it.
  const q = h('input', { class: 'vb-q', type: 'text', value: loc.query.q || '',
    placeholder: 'Search forums', 'aria-label': 'Search forums' });
  const doSearch = () => {
    const v = q.value.trim();
    if (v) nav.go(nav.href('forum', '/search', { q: v }));
  };
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); doSearch(); } });
  page.appendChild(h('div', { class: 'vb-tools' },
    q,
    h('button', { class: 'vb-btn', type: 'button', onclick: doSearch }, 'Search'),
    h('button', {
      class: 'vb-btn new', type: 'button',
      onclick: () => nav.go(nav.href('forum', '/new')),
    }, '+ Post New Thread')));

  const thread = loc.path.match(/^\/t\/([\w-]+)/);
  if (thread) return renderThread(page, thread[1], loc, nav, day);
  if (loc.path === '/new') return renderNew(page, loc, nav, day);
  if (loc.path === '/search') return renderSearch(page, loc, nav, day);
  if (loc.path.startsWith('/u/')) return renderProfile(page, loc.path.slice(3), nav);
  return renderList(page, loc, nav, day);
}

/* ------------------------------------------------------------------ */
/* the thread list                                                     */
/* ------------------------------------------------------------------ */

function renderList(page, loc, nav, day) {
  page.appendChild(h('div', { class: 'vb-crumb' },
    h('a', {
      href: nav.href('forum', '/'),
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/')); },
    }, 'Forum'), ' › Hampton Roads › ',
    h('b', {}, 'Current Situation')));

  const sort = loc.query.sort || 'last';
  const unseenSet = threadsWithUnseen(day);

  const rows = allThreads(day).map((t) => {
    const posts = allPosts(t.id, day);
    if (!posts.length) return null;
    const last = posts[posts.length - 1];
    const unread = posts.filter(p => !state.readIds[p.id] && !p.mine).length;
    return {
      t, posts, last, unread,
      replies: posts.length - 1,
      views: 1200 + posts.length * 337 + t.day * 91,
      lastDay: last.day, lastTime: last.time,
      unseen: unseenSet.has(t.id),
    };
  }).filter(Boolean);

  const cmp = {
    last:    (a, b) => b.lastDay - a.lastDay || String(b.lastTime).localeCompare(String(a.lastTime)),
    replies: (a, b) => b.replies - a.replies,
    views:   (a, b) => b.views - a.views,
    title:   (a, b) => a.t.title.localeCompare(b.t.title),
  }[sort] || (() => 0);
  rows.sort(cmp);
  // Stickies stay on top whatever the sort, which is what a board does.
  rows.sort((a, b) => (isSticky(b.t) ? 1 : 0) - (isSticky(a.t) ? 1 : 0));

  const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE));
  const pageNo = Math.min(pages, Math.max(1, parseInt(loc.query.p || '1', 10) || 1));
  const slice = rows.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);

  const th = (label, key, cls) => h('th', { class: cls || null },
    h('a', {
      class: 'vb-sort' + (sort === key ? ' on' : ''),
      href: nav.href('forum', '/', { sort: key }),
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/', { sort: key })); },
    }, label, sort === key ? h('span', { class: 'car' }, ' ▾') : null));

  const table = h('table', { class: 'vb-table' },
    h('thead', {}, h('tr', {},
      th('Thread / Thread Starter', 'title'),
      th('Replies', 'replies', 'vb-num'),
      th('Views', 'views', 'vb-num'),
      th('Last Post', 'last'))));
  const tb = h('tbody', {});
  table.appendChild(tb);
  page.appendChild(table);

  for (const r of slice) {
    const to = nav.href('forum', '/t/' + r.t.id);
    tb.appendChild(h('tr', { class: r.unread ? 'has-new' : null },
      h('td', {},
        isSticky(r.t) ? h('span', { class: 'vb-sticky' }, 'Sticky: ') : null,
        h('a', {
          class: r.unread ? 'unread' : 'read', href: to,
          onclick: (e) => { e.preventDefault(); nav.go(to); },
        }, effects.corruptText(r.t.title, { source: 'forum' })),
        r.unseen ? h('span', { class: 'vb-badge' }, 'new reply') : null,
        r.unread ? h('span', { class: 'vb-new' }, `  (${r.unread} new)`) : null,
        h('div', { class: 'vb-starter' },
          'Started by ' + r.posts[0].author,
          r.t.mine ? h('b', {}, '  · you') : null)),
      h('td', { class: 'vb-num' }, String(r.replies)),
      h('td', { class: 'vb-num' }, r.views.toLocaleString()),
      h('td', { class: 'vb-last' },
        h('div', {}, `Day ${r.lastDay}, ${r.lastTime}`),
        h('div', {}, 'by ' + r.last.author))));
  }

  page.appendChild(pager(pages, pageNo, (n) =>
    nav.href('forum', '/', { sort: sort === 'last' ? '' : sort, p: n === 1 ? '' : n }), nav));
}

function isSticky(t) { return t.id === 'tracker' || t.id === 'roads'; }

/** A working pager: first, prev, numbers, next, last, and a jump box. */
function pager(pages, at, hrefFor, nav) {
  const el = h('div', { class: 'vb-pages' });
  const link = (label, n, cls) => {
    if (n === at) return h('b', { class: cls || null }, label);
    if (n < 1 || n > pages) return h('span', { class: 'off' }, label);
    const to = hrefFor(n);
    return h('a', {
      class: cls || null, href: to,
      onclick: (e) => { e.preventDefault(); nav.go(to); },
    }, label);
  };
  el.appendChild(link('«', 1));
  el.appendChild(link('‹', at - 1));
  const from = Math.max(1, Math.min(at - 2, pages - 4));
  const to = Math.min(pages, from + 4);
  for (let n = from; n <= to; n++) el.appendChild(link(String(n), n));
  if (to < pages) el.appendChild(h('span', { style: 'padding:0 4px' }, '…'));
  if (to < pages) el.appendChild(link(String(pages), pages));
  el.appendChild(link('›', at + 1));
  el.appendChild(link('»', pages));

  // Page-jump. A real board has one and a player hunting a post needs it.
  const jump = h('input', { class: 'vb-jump', type: 'text', value: String(at),
    'aria-label': 'Go to page' });
  jump.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const n = Math.max(1, Math.min(pages, parseInt(jump.value, 10) || 1));
    nav.go(hrefFor(n));
  });
  el.appendChild(h('span', { class: 'vb-jumpwrap' }, 'Page ', jump, ` of ${pages}`));
  return el;
}

/* ------------------------------------------------------------------ */
/* one thread                                                          */
/* ------------------------------------------------------------------ */

function renderThread(page, id, loc, nav, day) {
  const t = THREADS.find(x => x.id === id) || userThread(id);
  if (!t) {
    page.appendChild(h('div', { class: 'vb-notice' },
      h('b', {}, 'Invalid Thread specified. '),
      'If you followed a valid link, please notify the ',
      h('a', { href: nav.href('forum', '/'),
        onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/')); } },
        'administrator'), '.'));
    return;
  }

  const posts = allPosts(id, day);
  const pages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  // A page number past the end shows the LAST page, which is what a board
  // does and what "jump to the newest reply" relies on.
  const pageNo = Math.min(pages, Math.max(1, parseInt(loc.query.p || '1', 10) || 1));
  const slice = posts.slice((pageNo - 1) * POSTS_PER_PAGE, pageNo * POSTS_PER_PAGE);

  page.appendChild(h('div', { class: 'vb-crumb' },
    h('a', {
      href: nav.href('forum', '/'),
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/')); },
    }, 'Forum'),
    ' › Hampton Roads › Current Situation › ', h('b', {}, t.title)));

  const hrefFor = (n) => nav.href('forum', '/t/' + id, { p: n === 1 ? '' : n });
  page.appendChild(pager(pages, pageNo, hrefFor, nav));

  slice.forEach((p, i) => {
    const n = (pageNo - 1) * POSTS_PER_PAGE + i + 1;
    const reread = !!state.readIds[p.id];
    if (p.isReply) seeReply(p);
    else if (!p.mine) understanding.read(p.id, p);
    const u = userOf(p.author);

    const content = h('div', { class: 'vb-postcontent' });

    // Quote boxes, nested two deep where somebody is arguing.
    if (p.quotes) {
      for (const q of p.quotes) {
        content.appendChild(h('div', { class: 'vb-quote' },
          h('div', { class: 'qh' }, `Originally posted by ${q.who}`), q.text));
      }
    }

    content.appendChild(h('div', { class: 'vb-text' },
      ...linkify(p.mine ? p.body : effects.corruptText(p.body, { source: 'forum', reread }), nav)));

    const att = ATTACHMENTS[p.id];
    if (att) {
      content.appendChild(h('div', { class: 'vb-attach' },
        h('img', { src: IMG.phoneSnap(att.kind), width: 560, height: 420, alt: att.cap }),
        h('div', { class: 'cap' }, 'Attached Images: ' + att.cap)));
    }

    if (p.edited || (n > 1 && n % 7 === 0)) {
      content.appendChild(h('div', { class: 'vb-edit' },
        `Last edited by ${p.author}; Day ${p.day} at ${p.time}. Reason: typo`));
    }

    if (u.sig) content.appendChild(h('div', { class: 'vb-sig' }, u.sig));

    // §5.1. Working reply and quote-reply.
    content.appendChild(h('div', { class: 'vb-postbtns' },
      h('button', {
        class: 'vb-mini', type: 'button',
        onclick: () => nav.go(nav.href('forum', '/t/' + id, { p: pageNo, reply: 1 })),
      }, 'Reply'),
      h('button', {
        class: 'vb-mini', type: 'button',
        onclick: () => nav.go(nav.href('forum', '/t/' + id, { p: pageNo, quote: p.id })),
      }, 'Reply With Quote')));

    page.appendChild(h('div', {
      class: 'vb-post' + (p.corrupt ? ' gone' : '') + (p.mine ? ' mine' : '')
             + (p.isReply && state.web.seenReplies[p.id] === state.day ? ' fresh' : ''),
      id: 'post' + p.id,
    },
      h('div', { class: 'vb-post-top' },
        h('span', {}, `Day ${p.day}, ${p.time}`),
        h('a', {
          class: 'vb-permalink',
          href: nav.href('forum', '/t/' + id, { p: pageNo }) + '#post' + p.id,
          onclick: (e) => {
            e.preventDefault();
            document.getElementById('post' + p.id)?.scrollIntoView({ block: 'start' });
          },
        }, '#' + n)),
      h('div', { class: 'vb-post-body' },
        h('div', { class: 'vb-userbox' },
          h('a', {
            class: 'who', href: nav.href('forum', '/u/' + p.author),
            onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/u/' + p.author)); },
          }, p.author),
          h('div', { class: 'title' }, p.op ? 'Thread Starter' : u.title),
          h('img', { src: IMG.avatar(p.author, 60), width: 60, height: 60, alt: '' }),
          h('div', { class: 'stat' }, 'Join Date: ' + u.joined),
          h('div', { class: 'stat' }, 'Location: ' + u.loc),
          h('div', { class: 'stat' }, 'Posts: ' + u.posts.toLocaleString())),
        content)));
  });

  page.appendChild(pager(pages, pageNo, hrefFor, nav));

  // §5.1. The reply box, when the player has asked for it.
  if (loc.query.reply || loc.query.quote) {
    page.appendChild(replyBox(id, loc, nav, day, posts));
  } else {
    page.appendChild(h('div', { class: 'vb-replybar' },
      h('button', {
        class: 'vb-btn', type: 'button',
        onclick: () => nav.go(nav.href('forum', '/t/' + id, { p: pageNo, reply: 1 })),
      }, 'Post Reply')));
  }
}

/* ------------------------------------------------------------------ */
/* posting (§5.1, §5.2)                                                */
/* ------------------------------------------------------------------ */

/**
 * The reply box. The player does not free-type into the world — they choose
 * which question to ask, because WHICH QUESTION THEY CAN ASK is the mechanic.
 * The text is shown in full before they commit, so it is their words.
 */
function replyBox(threadId, loc, nav, day, posts) {
  const box = h('div', { class: 'vb-compose' });
  box.appendChild(h('div', { class: 'ch' }, 'Post Reply'));

  const quoted = loc.query.quote
    ? posts.find(p => p.id === loc.query.quote) : null;
  if (quoted) {
    box.appendChild(h('div', { class: 'vb-quote' },
      h('div', { class: 'qh' }, `Originally posted by ${quoted.author}`),
      firstLine(quoted.body)));
  }

  const available = TOPICS.filter(t => canAsk(t) && !alreadyAsked(t.id));
  if (!available.length) {
    box.appendChild(h('div', { class: 'vb-nothing' },
      state.web.posts.length
        ? 'You have asked everything you know how to ask. Go and read something.'
        : 'You do not have a question you could write down yet.'));
    return box;
  }

  const area = h('textarea', { class: 'vb-area', rows: '9', spellcheck: 'false',
    'aria-label': 'Message' });
  let chosen = available[0];
  area.value = chosen.body;

  const picker = h('div', { class: 'vb-topics' });
  const paint = () => {
    picker.innerHTML = '';
    for (const t of available) {
      picker.appendChild(h('button', {
        class: 'vb-topic' + (t === chosen ? ' on' : ''), type: 'button',
        onclick: () => { chosen = t; area.value = t.body; paint(); },
      }, t.label));
    }
  };
  paint();
  box.appendChild(picker);
  box.appendChild(area);

  box.appendChild(h('div', { class: 'vb-composebtns' },
    h('button', {
      class: 'vb-btn submit', type: 'button',
      onclick: () => {
        submit(chosen, threadId, area.value, quoted, false);
        nav.go(nav.href('forum', '/t/' + threadId, { p: 99 }));
      },
    }, 'Submit Reply'),
    h('button', {
      class: 'vb-btn', type: 'button',
      onclick: () => nav.go(nav.href('forum', '/t/' + threadId)),
    }, 'Cancel')));
  box.appendChild(h('div', { class: 'vb-fineprint' },
    'Posting as ', h('b', {}, state.web.handle || '(you will pick a name)'),
    '. Replies usually come in over a day or two.'));
  return box;
}

/** §5.1. Starting a thread. */
function renderNew(page, loc, nav, day) {
  page.appendChild(h('div', { class: 'vb-crumb' },
    h('a', {
      href: nav.href('forum', '/'),
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/')); },
    }, 'Forum'), ' › ', h('b', {}, 'Post New Thread')));

  const box = h('div', { class: 'vb-compose' });
  page.appendChild(box);
  box.appendChild(h('div', { class: 'ch' }, 'Post New Thread'));

  // The account, once, on the first post. It is the only thing the player
  // types freely in this whole game.
  if (!state.web.handle) {
    const nameIn = h('input', { class: 'vb-name', type: 'text', maxlength: '20',
      placeholder: 'pick a user name', 'aria-label': 'User name' });
    box.appendChild(h('div', { class: 'vb-field' },
      h('label', {}, 'User Name'), nameIn));
    box.appendChild(h('div', { class: 'vb-fineprint' },
      'You have never posted here. He set the account up for you on the third ' +
      'and you have never used it.'));
    box.appendChild(h('div', { class: 'vb-composebtns' },
      h('button', {
        class: 'vb-btn submit', type: 'button',
        onclick: () => {
          const v = (nameIn.value || '').trim().replace(/\s+/g, '_').slice(0, 20);
          if (!v) { nameIn.focus(); return; }
          state.web.handle = v;
          state.web.joinedDay = state.day;
          save();
          audio.play('keyclack');
          nav.go(nav.href('forum', '/new'));
        },
      }, 'Register')));
    return;
  }

  const available = TOPICS.filter(t => canAsk(t) && !alreadyAsked(t.id));
  if (!available.length) {
    box.appendChild(h('div', { class: 'vb-nothing' },
      'You have asked everything you know how to ask.'));
    return;
  }

  const titleIn = h('input', { class: 'vb-name', type: 'text', 'aria-label': 'Title' });
  const area = h('textarea', { class: 'vb-area', rows: '11', spellcheck: 'false',
    'aria-label': 'Message' });
  let chosen = available[0];
  const sync = () => { titleIn.value = chosen.title; area.value = chosen.body; };
  sync();

  const picker = h('div', { class: 'vb-topics' });
  const paint = () => {
    picker.innerHTML = '';
    for (const t of available) {
      picker.appendChild(h('button', {
        class: 'vb-topic' + (t === chosen ? ' on' : ''), type: 'button',
        onclick: () => { chosen = t; sync(); paint(); },
      }, t.label));
    }
  };
  paint();
  box.appendChild(picker);
  box.appendChild(h('div', { class: 'vb-field' }, h('label', {}, 'Title'), titleIn));
  box.appendChild(area);
  box.appendChild(h('div', { class: 'vb-composebtns' },
    h('button', {
      class: 'vb-btn submit', type: 'button',
      onclick: () => {
        const tid = submit(chosen, null, area.value, null, true, titleIn.value);
        nav.go(nav.href('forum', '/t/' + tid));
      },
    }, 'Submit New Thread'),
    h('button', {
      class: 'vb-btn', type: 'button',
      onclick: () => nav.go(nav.href('forum', '/')),
    }, 'Cancel')));
}

function canAsk(t) {
  if (!t.needs) return true;
  return t.needs.every(f => state.understandingFlags[f]);
}
function alreadyAsked(id) {
  return state.web.posts.some(p => p.topic === id);
}

/**
 * Commit a post. It goes in the save, it appears in the thread, and the
 * replies to it are now scheduled for the next few days.
 */
function submit(topic, threadId, body, quoted, isOp, title) {
  if (!state.web.handle) state.web.handle = 'you';
  const id = 'me_' + topic.id + '_' + state.day;
  const thread = isOp ? 'mine_' + topic.id : threadId;
  state.web.posts.push({
    id, topic: topic.id, thread, day: state.day, time: clock.label(),
    body: String(body || topic.body), op: !!isOp,
    title: isOp ? (title || topic.title) : undefined,
    quotes: quoted ? [{ who: quoted.author, text: firstLine(quoted.body) }] : undefined,
  });
  audio.play('keyclack');
  note(isOp ? 'You started a thread.' : 'You posted.');
  save();
  return thread;
}

/* ------------------------------------------------------------------ */
/* search (§5.1)                                                       */
/* ------------------------------------------------------------------ */

function renderSearch(page, loc, nav, day) {
  const q = (loc.query.q || '').trim();
  page.appendChild(h('div', { class: 'vb-crumb' },
    h('a', {
      href: nav.href('forum', '/'),
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/')); },
    }, 'Forum'), ' › ', h('b', {}, 'Search Results')));

  if (q.length < 2) {
    page.appendChild(h('div', { class: 'vb-notice' },
      'Your search terms must be at least 2 characters.'));
    return;
  }

  const needle = q.toLowerCase();
  const hits = [];
  for (const t of allThreads(day)) {
    for (const p of allPosts(t.id, day)) {
      const body = String(p.body || '');
      const at = body.toLowerCase().indexOf(needle);
      const inTitle = t.title.toLowerCase().includes(needle);
      if (at < 0 && !inTitle) continue;
      hits.push({ t, p, at, body });
    }
  }

  page.appendChild(h('div', { class: 'vb-notice' },
    hits.length
      ? `${hits.length} result${hits.length === 1 ? '' : 's'} for “${q}”. Showing all.`
      : `No results for “${q}”. Try fewer words.`));

  for (const hit of hits.slice(0, 60)) {
    const to = nav.href('forum', '/t/' + hit.t.id);
    const from = Math.max(0, hit.at - 90);
    const snippet = (from ? '…' : '') +
      hit.body.slice(from, Math.min(hit.body.length, hit.at + 140)).replace(/\s+/g, ' ') +
      (hit.at + 140 < hit.body.length ? '…' : '');
    page.appendChild(h('div', { class: 'vb-hit' },
      h('a', { href: to, onclick: (e) => { e.preventDefault(); nav.go(to); } }, hit.t.title),
      h('div', { class: 'meta' }, `by ${hit.p.author} · Day ${hit.p.day}, ${hit.p.time}`),
      h('div', { class: 'snip' }, snippet)));
  }
}

/* ------------------------------------------------------------------ */
/* a member                                                            */
/* ------------------------------------------------------------------ */

function renderProfile(page, handle, nav) {
  const u = userOf(handle);
  const mine = handle === state.web.handle;
  page.appendChild(h('div', { class: 'vb-crumb' },
    h('a', {
      href: nav.href('forum', '/'),
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('forum', '/')); },
    }, 'Forum'), ' › ', h('b', {}, handle)));

  const card = h('div', { class: 'vb-profile' });
  page.appendChild(card);
  card.appendChild(h('img', { src: IMG.avatar(handle, 100), width: 100, height: 100, alt: '' }));
  const body = h('div', { class: 'p-body' });
  card.appendChild(body);
  body.appendChild(h('h2', {}, handle));
  body.appendChild(h('div', { class: 'p-title' }, u.title));
  const dl = h('dl', {});
  for (const [k, v] of [
    ['Join Date', mine ? `Day ${state.web.joinedDay || state.day}` : u.joined],
    ['Location', u.loc],
    ['Total Posts', String(u.posts)],
    ['Last Activity', mine ? 'Now' : `Day ${state.day - (handle.length % 3)}`],
  ]) {
    dl.appendChild(h('dt', {}, k));
    dl.appendChild(h('dd', {}, v));
  }
  body.appendChild(dl);
  if (u.sig) body.appendChild(h('div', { class: 'vb-sig' }, u.sig));
  if (handle === 'guest') {
    body.appendChild(h('div', { class: 'vb-nothing' },
      'You are not logged in. Start a thread to register.'));
  }
}

export default render;
