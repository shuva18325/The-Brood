/**
 * files.js — the file host the Foundation scans and the video logs are
 * posted to.
 *
 * §5A.4: these are institutional records and they should look it.
 * Scanned, not rendered — page skew, scanner shadow down one edge, a fold
 * line, the ghost of the text on the reverse. Photocopy generations. Case
 * stamps. Redaction with the line lengths preserved.
 *
 * Graphic content is correct in here. The clinical register is what makes
 * it horrifying: a forensic photo with a case number under it is worse
 * than the same image presented dramatically, because someone filed it.
 */

import { h } from '../index.js';
import state from '../../state.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import { docsFor, videosFor } from '../../content/docs.js';
import IMG from '../imagery.js';

export const url = 'http://f.mirrorbox.io/u/archivist_p/';

/** How many photocopy generations deep a given file looks. */
function generation(d) {
  if (/1893|ACCESSION/.test(d.title)) return 3;
  if (/199[0-6]/.test(d.title)) return 2;
  return 1;
}

/** Which files carry a plate, and what it is. */
const PLATES = {
  d03: { kind: 'tablet' },
  // §8.2 — Zānuwām is never rendered in the world. This is the only place
  // anybody has ever seen it: a plate drawn from testimony, in Persis,
  // by somebody who was told about it.
  d05: { kind: 'archive', entity: 'zanuwam', opts: {
    title: 'The Zānuwām, as described at Persis',
    sub: 'Drawn after the account of ██████████, from the Ctesiphon roll.\nThe head is reported without variation. Nothing else is.',
    accession: 'CF acc. 1992·031 / pl. ii',
    stamp: 'EXAMINED 1953',
    scale: 0.70,
  } },
  // §8.1 — no sighting, no photograph, no window event, in 2,500 years.
  // One engraving, made in 1897 by the man who chose the wrong word.
  d04: { kind: 'archive', entity: 'king', opts: {
    title: 'The Crippled King upon his Throne',
    sub: 'From the Tyre tablet, after ██████████, 1897.\nThe crown and the seat are described as made by no hand.',
    accession: 'CF acc. 1991·067 / pl. i',
    stamp: 'DO NOT COPY',
    paper: '#d2c6a6',
    scale: 0.72,
  } },
  d10: { kind: 'evidence', opts: { id: 'd10', marker: 2, tone: '#1c1414',
    exhibit: 'EXHIBIT 9‑A   CF‑1996‑0202   PLATE 1 OF 4',
    caption: 'Recovered at 400 m from site. Material is not identified. Scale in cm.' } },
  d09: { kind: 'evidence', opts: { id: 'd09', marker: 7, ground: '#3c3a33', tone: '#20191a',
    exhibit: 'EXHIBIT 3‑F   CF‑2001‑0448   PLATE 2 OF 9',
    caption: 'Structural debris, north elevation. Item 7 as recovered, not repositioned.' } },
  d15: { kind: 'evidence', opts: { id: 'd15', marker: 4, ground: '#585349', tone: '#241d1c',
    exhibit: 'EXHIBIT 22‑B   CF‑2019‑1533   PLATE 5 OF 5',
    caption: 'Shelter interior, east concourse. Photographed 09:20. No further plates were taken.' } },
};

export function titleFor(loc) {
  const d = loc.path.match(/^\/d\/([\w-]+)/);
  const v = loc.path.match(/^\/v\/([\w-]+)/);
  if (d) return d[1] + ' — mirrorbox';
  if (v) return v[1] + ' — mirrorbox';
  return 'mirrorbox — archivist_p';
}

export function render(host, loc, nav) {
  // §4.1. Every document and every tape has its own address.
  const dm = loc.path.match(/^\/d\/([\w-]+)/);
  const vm = loc.path.match(/^\/v\/([\w-]+)/);
  const args = { doc: dm ? dm[1] : null, video: vm ? vm[1] : null };
  const D = (id) => nav.href('files', id ? '/d/' + id : '/u/archivist_p/');
  const V = (id) => nav.href('files', id ? '/v/' + id : '/u/archivist_p/');
  const day = state.day;

  if (args.doc) return renderDoc(host, args, nav, day);
  if (args.video) return renderVideo(host, args, nav, day);

  const page = h('div', { class: 'filehost' });
  host.appendChild(page);
  page.appendChild(h('div', { class: 'fh-head' },
    'mirrorbox / u / archivist_p  ',
    h('span', {}, '— 40 files · no description · reported 3 times')));

  const list = h('div', { class: 'fh-list' });
  page.appendChild(list);

  for (const d of docsFor(day)) {
    list.appendChild(h('div', {
      class: 'fh-row', tabindex: '0',
      onclick: () => nav.go(D(d.id)),
      onkeydown: (e) => { if (e.key === 'Enter') nav.go(D(d.id)); },
    },
      h('span', { class: 'n' }, d.title + '.pdf'),
      h('span', { class: 's' }, `${(240 + d.id.charCodeAt(1) * 7) % 900 + 100} KB`)));
  }

  page.appendChild(h('div', { class: 'fh-head', style: 'margin-top:10px' },
    'mirrorbox / u / deadmall  ', h('span', {}, '— video thread mirrors, most links dead')));
  const vlist = h('div', { class: 'fh-list' });
  page.appendChild(vlist);
  for (const v of videosFor(day)) {
    vlist.appendChild(h('div', {
      class: 'fh-row', tabindex: '0',
      onclick: () => nav.go(V(v.id)),
      onkeydown: (e) => { if (e.key === 'Enter') nav.go(V(v.id)); },
    },
      h('span', { class: 'n' }, v.title),
      h('span', { class: 's' }, v.id === 'v12' ? 'SOURCE DELETED' : 'mirror')));
  }
}

/* ------------------------------------------------------------------ */

function renderDoc(host, args, nav, day) {
  const D = (id) => nav.href('files', id ? '/d/' + id : '/u/archivist_p/');
  const d = docsFor(day).find(x => x.id === args.doc);
  if (!d) { nav.go(D(null)); return; }
  const reread = !!state.readIds[d.id];
  understanding.read(d.id, d);

  const wrap = h('div', { class: 'scanwrap' });
  host.appendChild(wrap);
  wrap.appendChild(h('div', {
    style: 'width:min(760px,92%);margin:0 auto 10px;font-family:Arial,sans-serif;font-size:12px',
  }, h('a', {
    href: '#', style: 'color:#9fb6cc', tabindex: '0',
    onclick: (e) => { e.preventDefault(); nav.go(D(null)); },
  }, '‹ back to files')));

  const gen = generation(d);
  const scan = h('div', { class: 'scan' + (gen > 1 ? ' gen' + gen : '') });
  wrap.appendChild(scan);

  scan.appendChild(h('div', { class: 'scan-stamp' }, stampFor(d)));
  scan.appendChild(h('div', { class: 'scan-margin' }, 'PROPERTY OF THE FOUNDATION — DO NOT REPRODUCE'));

  scan.appendChild(h('div', {
    style: 'font-family:Arial,sans-serif;font-size:11px;letter-spacing:.08em;color:#5c574c;margin-bottom:14px',
  }, d.meta));

  // The body, with redactions drawn as solid black bars that preserve the
  // line lengths, so the player can see exactly how much is missing.
  scan.appendChild(redacted(effects.corruptText(d.body, { source: 'doc', reread })));

  // The plate, if this file has one.
  const plate = PLATES[d.id];
  if (plate) {
    const src = plate.kind === 'tablet' ? IMG.tabletPlate()
      : plate.kind === 'archive' ? IMG.archivePlate(plate.entity, plate.opts)
      : IMG.evidencePlate(plate.opts);
    const alt = plate.kind === 'tablet'
      ? 'Photographic plate, clay tablet, scale reference obscured.'
      : plate.kind === 'archive'
        ? 'An aged engraved plate, foxed and water-marked, of ' + plate.opts.title
        : 'Evidence photograph with scale and marker.';
    const cap = plate.kind === 'tablet'
      ? 'PLATE 3 — recovered object, obverse. Scale reference withheld under standing guidance.'
      : plate.kind === 'archive'
        ? plate.opts.accession + ' — plate as recovered. No conservation has been attempted.'
        : plate.opts.exhibit;
    scan.appendChild(h('div', { class: 'plate' },
      h('img', { src, alt }),
      h('div', { class: 'cap' }, cap)));
  }

  // Marginalia. A later hand contradicting an earlier one.
  const hand = HANDS[d.id];
  if (hand) {
    scan.appendChild(h('div', { class: 'scan-hand' + (hand.later ? ' later' : ''),
      style: 'margin-top:18px' }, hand.text));
  }
}

const HANDS = {
  d03: { text: '— but he was working from a COPY. see my note of 14/3. —████', later: false },
  d04: { text: 'I asked. I was told the question was not operational.', later: true },
  d05: { text: 'this is the page. this is the one everybody quotes.', later: false },
  d07: { text: 'raised again 8 Nov. raised again 3 Feb. raised again.\nnobody has amended the primary file.', later: true },
  d08: { text: 'his tea was still warm.', later: true },
  d11: { text: 'It is going to be quoted anyway.', later: false },
  d12: { text: 'a shotgun. in a hallway. that is the entire counter-measure\nfor the cleverest thing on the list.', later: true },
  d14: { text: 'FUNDING DENIED — see 2011/04 cycle', later: true },
};

function stampFor(d) {
  if (/1893|ACCESSION/.test(d.title)) return 'ARCHIVE COPY';
  if (/CHARTER/.test(d.title)) return 'INTERNAL';
  if (/ANGUISH|OFFICER/.test(d.title)) return 'RESTRICTED';
  if (/TORMENTOR|ROAD KILL/.test(d.title)) return 'FIELD USE';
  return 'CONTROLLED';
}

/**
 * ██ becomes a real black bar of the same length as what it replaced.
 * Occasionally one that did not take, where the text is faintly legible.
 */
function redacted(text) {
  const el = h('div', {});
  const parts = text.split(/(█+)/g);
  let n = 0;
  for (const p of parts) {
    if (/^█+$/.test(p)) {
      n++;
      // One in about nine survives the toner.
      const failed = (n % 9) === 4;
      el.appendChild(h('span', { class: 'redact' + (failed ? ' failed' : '') },
        failed ? 'CONSERVATION'.slice(0, p.length) : p));
    } else {
      el.appendChild(document.createTextNode(p));
    }
  }
  return el;
}

/* ------------------------------------------------------------------ */

function renderVideo(host, args, nav, day) {
  const V = (id) => nav.href('files', id ? '/v/' + id : '/u/archivist_p/');
  const v = videosFor(day).find(x => x.id === args.video);
  if (!v) { nav.go(V(null)); return; }
  understanding.read(v.id, v);

  const wrap = h('div', { class: 'scanwrap' });
  host.appendChild(wrap);
  wrap.appendChild(h('div', {
    style: 'width:min(760px,92%);margin:0 auto 10px;font-family:Arial,sans-serif;font-size:12px',
  }, h('a', {
    href: '#', style: 'color:#9fb6cc', tabindex: '0',
    onclick: (e) => { e.preventDefault(); nav.go(V(null)); },
  }, '‹ back to files')));

  const box = h('div', {
    style: 'width:min(760px,92%);margin:0 auto;background:#111;padding:16px 18px 22px;color:#cfc9bd;' +
           'font-family:Arial,sans-serif',
  });
  wrap.appendChild(box);
  box.appendChild(h('div', { style: 'font-size:14px;margin-bottom:2px' }, v.title));
  box.appendChild(h('div', { style: 'font-size:11px;color:#7d786e;margin-bottom:10px' },
    v.by + (v.id === 'v12' ? ' — source deleted, description only' : '')));

  if (v.id !== 'v12') {
    const spec = VIDEO_FRAMES[v.id] || {};
    box.appendChild(h('img', {
      src: IMG.videoFrame({ id: v.id, ...spec }),
      style: 'display:block;width:100%;border:1px solid #333',
      alt: 'A frame from ' + v.title,
    }));
    box.appendChild(h('div', {
      style: 'font-size:10.5px;color:#6e6a62;margin:4px 0 12px;font-family:"Courier New",monospace',
    }, 'playback unavailable — thumbnail only'));
  }

  box.appendChild(h('div', {
    style: 'font-size:13px;line-height:1.65;white-space:pre-wrap;color:#c3bdb0;max-width:70ch',
  }, effects.corruptText(v.body, { source: 'forum' })));
}

/** What each frame is a frame OF. Off-centre, out of focus, wrong moment. */
const VIDEO_FRAMES = {
  v01: { night: false, timecode: 'SEP 03  11:20:44', gens: 1, tracking: 2, seed: 1 },
  v02: { night: false, timecode: 'SEP 04  08:02:11', gens: 1, tracking: 1, seed: 2 },
  v03: { subject: 'tormentor', x: 0.72, y: -0.22, scale: 0.7, timecode: 'SEP 05  01:38:02', gens: 2, tracking: 4, seed: 3 },
  v04: { night: false, subject: 'crawler', x: 0.55, y: 0.62, scale: 0.16, timecode: 'SEP 06  15:15:39', gens: 1, seed: 4 },
  v05: { night: false, timecode: 'SEP 07  18:40:55', gens: 2, tracking: 2, seed: 5 },
  v06: { subject: 'incursion', x: 0.70, y: 0.10, scale: 0.34, timecode: 'SEP 08  02:10:31', gens: 2, tracking: 5, seed: 6 },
  v07: { night: false, timecode: 'SEP 09  12:50:07', gens: 1, tracking: 3, seed: 7 },
  v08: { subject: 'crawler', x: 0.36, y: 0.58, scale: 0.2, timecode: 'SEP 10  23:04:12', gens: 3, tracking: 6, seed: 8 },
  v09: { timecode: 'SEP 11  22:47:50', gens: 2, tracking: 4, seed: 9 },
  v10: { timecode: 'SEP 12  04:02:18', gens: 3, tracking: 5, seed: 10 },
  v11: { night: false, timecode: 'SEP 13  19:11:03', gens: 3, tracking: 7, seed: 11 },
};

export default render;
