/**
 * sketchy.js — the part of the web the search engines gave up on.
 *
 * Two hosts, both mirrors, both several hops from anything anybody would
 * defend. They are where the photographs end up after the forums delete
 * them and the news site stops carrying them: somebody in a different
 * country scrapes the thread, wraps it in a 2004 table layout, and sells
 * advertising against it. That is genuinely how this material travels.
 *
 * THE LANGUAGE RULE, AND IT IS A HARD RULE:
 *
 * These pages are in ENGLISH. Bad English — auto-translated out of Chinese
 * by a script, so the grammar is wrong in the specific way machine
 * translation is wrong: no articles, tenses collapsed, compound nouns run
 * together, and the occasional word left untranslated because the
 * dictionary did not have it. That is what an American actually sees when
 * they land on one of these sites, and it is far more unsettling than a
 * page they simply cannot read, because they CAN read it and it is wrong.
 *
 * There is exactly ONE sentence of Chinese on either host. It is on the
 * about page, the translator on the desktop will render it, and it is the
 * only thing here a person wrote rather than a script. Everything else the
 * player reads is English.
 *
 * (The other Chinese in the game — the Pathogen's caption and the line
 * behind the red link in the reply — lives in imagery.js and mail.js. It
 * is deliberate and it is small. Do not add more.)
 *
 * WHY THEY EXIST MECHANICALLY:
 *
 *   1. They are the only place some of the images survive past the day the
 *      forums scrub them.
 *   2. They carry THE RED LINK. Everywhere else the bait comes to the
 *      player, in the mail, and the player only has to not click. Here the
 *      player has to go and find it, and what they find is not a document —
 *      it is an address.
 */

import { h } from '../index.js';
import state, { save } from '../../state.js';
import audio from '../../audio.js';
import IMG from '../imagery.js';

export const HOSTS = {
  jiance: 'www.safety-inspect.com.cn',
  pan:    'files.julypond.net',
};

/** The address the red link hands over. It is a real mailbox in the game. */
export const CONTACT = 'zw@safety-inspect.com.cn';

/* ------------------------------------------------------------------ */
/* the furniture every page on both sites carries                      */
/* ------------------------------------------------------------------ */

/**
 * A visitor counter. Seven-digit odometer, running since 2006, and it does
 * not increment while you watch — which is the detail that makes it a
 * counter rather than a graphic. It ticks once per in-game day, and the
 * player will not notice that for a week.
 */
function counter(seed) {
  const n = (seed + state.day * 3) % 10000000;
  const s = String(1284000 + n).padStart(7, '0');
  return h('span', { class: 'sk-count' }, ...s.split('').map(d => h('i', {}, d)));
}

/** The ad every page of this kind has had since about 2009. */
function adBar(which) {
  const ADS = [
    ['[RECOMMEND] Overseas server. No content limit. Open in seconds.', '$4.9/mo'],
    ['One Dollar Treasure — draw every day — register immediately', 'ENTER'],
    ['Newest film and television resource. No advertisement. High clear online.', 'WATCH FREE'],
    ['Network safety detection tool package v11.3 (cracked edition)', 'DOWNLOAD'],
  ];
  const [text, cta] = ADS[which % ADS.length];
  return h('div', { class: 'sk-ad' },
    h('span', { class: 'sk-ad-t' }, text),
    h('span', { class: 'sk-ad-c' }, cta));
}

/** Banner, nav, and the filing number in the footer. */
function chrome(host, nav, body) {
  const isMain = host === HOSTS.jiance;
  const page = h('div', { class: 'sketchy' });
  page.appendChild(h('div', { class: 'sk-banner' },
    h('div', { class: 'sk-logo' }, isMain
      ? 'NETWORK SAFETY INSPECTION CENTRE'
      : 'JULY POND — FILE SHARING'),
    h('div', { class: 'sk-sub' }, isMain
      ? 'Overseas incident observation · station established 2006'
      : 'File sharing · no registration required')));

  const N = (path) => nav.href(isMain ? 'jiance' : 'pan', path);
  const link = (label, path) => h('a', {
    href: '#', onclick: (e) => { e.preventDefault(); nav.go(N(path)); },
  }, label);
  page.appendChild(h('div', { class: 'sk-nav' },
    link('Home', '/'), link('Images', '/tw/'), link('Downloads', '/xz/'),
    link('About', '/gy/'),
    // §4.1. Every link navigates. This one navigates to a 404, which is a
    // real destination and an honest one — the page is gone.
    link('Forum', '/luntan/')));

  page.appendChild(body);

  page.appendChild(h('div', { class: 'sk-foot' },
    h('div', {}, 'Visits ', counter(isMain ? 41 : 907), ' persons'),
    h('div', {}, 'Copyright © 2006-2019. All content of this station comes ' +
      'from the internet. If there is infringement please contact to delete.'),
    h('div', {}, 'ICP filing 09' + (isMain ? '118742' : '204471') + '-3')));
  return page;
}

/* ------------------------------------------------------------------ */
/* THE RED LINK                                                        */
/*                                                                     */
/* It is red because every link on both of these sites is red — the    */
/* stylesheet sets a:link to #cc0000 and always has. That is the whole */
/* trick, and it is not a trick: the game never colours a link to warn */
/* the player, so the one red link that matters is red for the same    */
/* boring reason as the fourteen that do not.                          */
/* ------------------------------------------------------------------ */

/**
 * What the contact link does. It does not navigate and it does not open a
 * mail composer — it reveals an address, and a day later mail arrives.
 *
 * The player gave nothing away. They did not type anything, they did not
 * submit a form, they clicked a link on a website. That is the point.
 */
function contactLink(ui) {
  const wrap = h('div', { class: 'sk-contact' });
  const show = () => {
    wrap.textContent = '';
    wrap.appendChild(h('div', { class: 'sk-mailto' },
      'Webmaster mailbox: ', h('b', {}, CONTACT)));
    wrap.appendChild(h('div', { class: 'sk-note' },
      '(This station does not reply to any letter. Please do not send repeatedly.)'));
    if (!state.flags.redLink) {
      state.flags.redLink = true;
      state.flags.redLinkDay = state.day;
      save();
      audio.play('menu_select');
      // No stinger, no cut, no flash. A website did what websites do.
      if (ui && ui.say) ui.say('The page expanded.', 2600);
    }
  };
  if (state.flags.redLink) { show(); return wrap; }
  wrap.appendChild(h('a', {
    class: 'sk-red', href: '#',
    onclick: (e) => { e.preventDefault(); show(); },
  }, 'CONTACT WEBMASTER'));
  return wrap;
}

/* ------------------------------------------------------------------ */
/* pages                                                               */
/* ------------------------------------------------------------------ */

/**
 * The mirrored photographs. The titles are what the scraper's translator
 * made of the original forum titles, which is why they read like that.
 */
const MIRRORED = [
  { kind: 'crawler',
    title: 'United States Virginia state Norfolk city — street shoot — many foot creature',
    body: 'Photograph obtains from overseas forum. Original posting already deleted. ' +
          'This station retains mirror image. Many foot organism, night, not yet confirm.',
    day: 3 },
  { kind: 'tormentor',
    title: 'Same one region — night time — tall individual under road lamp',
    body: 'Same city. Height cannot determine, road lamp is 9 metre for reference. ' +
          'Photographer does not respond to contact.',
    day: 6 },
  { kind: 'gleaner',
    title: 'Daytime — three — sidewalk — not yet confirm',
    body: 'Three individual, daylight, pavement. Uploader states no danger was felt. ' +
          'Uploader has not posted since.',
    day: 9 },
  { kind: 'incursion',
    title: 'Indoor — corridor — flash light — hand part close shot',
    body: 'Interior photograph, flash lamp used. Hand is nearer to lens than shoulder. ' +
          'Building is residence, corridor light is fluorescent tube (green).',
    day: 12 },
  { kind: 'anguish',
    title: 'Specimen — number four — complete — origin not clear',
    body: 'Plate photograph. White sweep, two lamp, scale bar. Not street photograph. ' +
          'Who has placed this on a table, this station does not know.',
    day: 15 },
];

function renderHome(host, nav, ui) {
  const b = h('div', { class: 'sk-body' });
  b.appendChild(adBar(state.day));

  b.appendChild(h('div', { class: 'sk-marq' },
    h('span', {},
      '★ This station resumed update in 2019 ★ Overseas source, not verified ★ ' +
      'Please do not reproduce to domestic platform ★ ' +
      'Webmaster online time 03:00-05:00 ★')));

  b.appendChild(h('h2', { class: 'sk-h' }, 'LATEST'));
  const list = h('div', { class: 'sk-list' });
  b.appendChild(list);
  const avail = MIRRORED.filter(m => m.day <= state.day);
  for (const m of avail) {
    list.appendChild(h('div', { class: 'sk-item' },
      h('a', {
        href: '#',
        onclick: (e) => { e.preventDefault(); nav.go(nav.href('jiance', '/tw/' + m.kind)); },
      }, m.title),
      h('span', { class: 'sk-date' }, `2019-11-${String(m.day + 3).padStart(2, '0')}`)));
  }
  if (!avail.length) {
    list.appendChild(h('div', { class: 'sk-item' },
      h('span', { style: 'color:#777' }, 'No content at present.')));
  }

  /* The mojibake block. The page declares one encoding and is served as
   * another, so exactly one block — the one pasted in from a different
   * editor — comes through as garbage. It is the only genuinely broken
   * thing on the site and it is broken the way real pages are. */
  b.appendChild(h('div', { class: 'sk-moji' },
    'ç½‘ç«™å…¬å‘Šï¼šæœ¬ç«™ä¸å†æ›´æ–°å›½å†…å†…å®¹ã€‚'));

  b.appendChild(adBar(state.day + 2));
  b.appendChild(h('h2', { class: 'sk-h' }, 'ABOUT THIS STATION'));
  b.appendChild(h('p', { class: 'sk-p' },
    'This station is the network safety enthusiast exchange platform. All ' +
    'materials are reproduced from the open channel and only supply the ' +
    'research use.'));
  b.appendChild(contactLink(ui));
  return b;
}

function renderPhoto(host, nav, ui, kind) {
  const m = MIRRORED.find(x => x.kind === kind);
  const b = h('div', { class: 'sk-body' });
  if (!m || m.day > state.day) {
    b.appendChild(h('div', { class: 'sk-gone' },
      h('div', {}, 'The content has been deleted or does not exist.')));
    return b;
  }
  b.appendChild(adBar(state.day + 1));
  b.appendChild(h('h2', { class: 'sk-h' }, m.title));
  b.appendChild(h('div', { class: 'sk-shot' },
    h('img', { src: IMG.phoneSnap(kind), alt: m.title })));
  b.appendChild(h('div', { class: 'sk-cap' },
    h('div', { class: 'sk-mt-lb' }, 'auto-translated from the original posting'),
    h('div', { class: 'sk-mt' }, m.body)));
  b.appendChild(h('div', { class: 'sk-links' },
    h('a', {
      href: '#',
      onclick: (e) => { e.preventDefault(); nav.go(nav.href('pan', '/f/' + kind)); },
    }, 'Download original image (RAR)'),
    h('a', {
      href: '#', onclick: (e) => { e.preventDefault(); nav.go(nav.href('jiance', '/')); },
    }, 'Return to home page')));
  b.appendChild(contactLink(ui));
  return b;
}

function renderDownloads(host, nav, ui) {
  const b = h('div', { class: 'sk-body' });
  b.appendChild(adBar(state.day + 3));
  b.appendChild(h('h2', { class: 'sk-h' }, 'DOWNLOADS'));
  const t = h('table', { class: 'sk-tbl' });
  b.appendChild(t);
  t.appendChild(h('tr', {},
    h('th', {}, 'File name'), h('th', {}, 'Size'), h('th', {}, 'Extract code')));
  const rows = [
    ['norfolk_2019_all_pictures.rar', '184 MB', 'a4k9'],
    ['CF_documents_scan_1991-2019.rar', '2.1 GB', 'm2xx'],
    ['audio_recording_unsorted.zip', '41 MB', '——'],
    ['do_not_spread.rar', '7 KB', '——'],
  ];
  for (const [n, s, c] of rows) {
    t.appendChild(h('tr', {},
      h('td', {}, h('a', {
        href: '#',
        onclick: (e) => { e.preventDefault(); nav.go(nav.href('pan', '/f/' + encodeURIComponent(n))); },
      }, n)),
      h('td', {}, s), h('td', {}, c)));
  }
  b.appendChild(h('p', { class: 'sk-p sk-mt' },
    'For the extraction code please the contact station elder brother.'));
  b.appendChild(contactLink(ui));
  return b;
}

function renderPan(host, nav, ui, file) {
  const b = h('div', { class: 'sk-body' });
  b.appendChild(adBar(state.day));
  b.appendChild(h('h2', { class: 'sk-h' },
    file ? decodeURIComponent(file) : 'July Pond file sharing'));
  /* Every download on this host is dead, and it is dead in the specific way
   * these hosts are dead: the file is there, the link resolves, and the
   * download requires a client you are not going to install. */
  b.appendChild(h('div', { class: 'sk-pan' },
    h('div', { class: 'sk-pan-row' }, 'Status: ', h('b', {}, 'normal')),
    h('div', { class: 'sk-pan-row' }, 'Valid period: ', h('b', {}, 'permanent')),
    h('div', { class: 'sk-pan-row' }, 'Download method: ', h('b', {}, 'client required')),
    h('button', {
      class: 'sk-pan-btn', type: 'button',
      onclick: () => { audio.play('menu_move'); if (ui && ui.say) ui.say('Nothing happened.', 2400); },
    }, 'DOWNLOAD (client required)')));
  b.appendChild(h('p', { class: 'sk-p sk-mt' },
    'Downloading needs the client end. The client end no longer provides ' +
    'the downloading.'));
  b.appendChild(contactLink(ui));
  return b;
}

function renderAbout(host, nav, ui) {
  const b = h('div', { class: 'sk-body' });
  b.appendChild(h('h2', { class: 'sk-h' }, 'ABOUT'));
  b.appendChild(h('p', { class: 'sk-p' },
    'This station was established in the year 2006 and is maintained by one ' +
    'person. No interview is accepted, no cooperation is accepted, no ' +
    'request to delete a manuscript is accepted.'));

  /* THE ONE SENTENCE OF CHINESE ON EITHER HOST.
   *
   * Everything else here went through a translation script. This did not —
   * it is in the font the webmaster's editor defaulted to, it is the only
   * thing on the site a person wrote, and the game does not translate it.
   * The translator on the desktop will, if the player thinks to try.
   *
   * It says: "We have already watched it. Your side is comparatively late."
   * Do not put that anywhere the player can read it for free. */
  b.appendChild(h('p', { class: 'sk-p sk-hand' }, '我们已经看过了。你们那边比较晚。'));
  b.appendChild(h('p', { class: 'sk-p sk-mt' },
    '[ this line was not translated by the script ]'));

  b.appendChild(contactLink(ui));
  return b;
}

/* ------------------------------------------------------------------ */

export function titleFor(loc) {
  if (loc.host === HOSTS.pan) return 'July Pond — file sharing';
  if (loc.path.startsWith('/tw/')) return 'Images — Network Safety Inspection Centre';
  if (loc.path.startsWith('/xz/')) return 'Downloads — Network Safety Inspection Centre';
  if (loc.path.startsWith('/gy/')) return 'About — Network Safety Inspection Centre';
  return 'Network Safety Inspection Centre';
}

export function render(host, loc, nav, ui) {
  const H = loc.host;
  let body;
  if (H === HOSTS.pan) {
    const m = loc.path.match(/^\/f\/(.+)$/);
    body = renderPan(H, nav, ui, m ? m[1] : null);
  } else if (loc.path.startsWith('/tw/')) {
    body = renderPhoto(H, nav, ui, loc.path.slice(4));
  } else if (loc.path.startsWith('/xz')) {
    body = renderDownloads(H, nav, ui);
  } else if (loc.path.startsWith('/gy')) {
    body = renderAbout(H, nav, ui);
  } else if (loc.path.startsWith('/luntan')) {
    // An honest 404, in the site's own voice.
    body = h('div', { class: 'sk-body' },
      h('div', { class: 'sk-gone' },
        h('div', {}, '404 — The forum already closed in 2017.')));
  } else {
    body = renderHome(H, nav, ui);
  }
  host.appendChild(chrome(H, nav, body));
}
