/**
 * mail.js — the mail client.
 *
 * Three panes: folder list, message list, reading pane. System fonts.
 * Unread count in the folder list.
 *
 * §7 governs the Pathogen's mail absolutely: it must never look like
 * phishing spam and must never look designed. Plain text. No images.
 * Correct spelling. Calm.
 *
 * The subject and preview are visible WITHOUT opening, and the preview is
 * real, valuable, verifiable lore. The body contains the warning not to
 * click, and the link.
 *
 * The link is rendered as an ordinary blue underlined hyperlink. No glow,
 * no pulse, no special treatment, no hover effect beyond the underline it
 * already has. The restraint is the whole mechanic — the player is given
 * nothing to react to except their own curiosity.
 */

import { h } from '../index.js';
import state from '../../state.js';
import bus from '../../bus.js';
import audio from '../../audio.js';
import effects from '../../effects.js';
import understanding from '../../systems/understanding.js';
import concealment from '../../systems/concealment.js';
import { mailFor, TERMINAL_LINE, RED_REPLY_LINE } from '../../content/mail.js';

export function render(host, args, nav, ui, ctx) {
  const day = state.day;
  const all = mailFor(day, state.flags);
  const folder = args.folder || 'inbox';
  const items = folder === 'junk' ? all.filter(m => m.junk) : all.filter(m => !m.junk);
  const sel = args.mail || (items.length ? items[items.length - 1].id : null);

  const app = h('div', { class: 'mail' });
  host.appendChild(app);

  const unread = (list) => list.filter(m => !state.readIds[m.id]).length;

  /* --- folders --- */
  const folders = h('div', { class: 'mail-folders' });
  for (const [id, label, list] of [
    ['inbox', 'Inbox', all.filter(m => !m.junk)],
    ['junk', 'Junk E-mail', all.filter(m => m.junk)],
  ]) {
    const n = unread(list);
    folders.appendChild(h('div', {
      class: folder === id ? 'on' : '', tabindex: '0',
      onclick: () => nav.go({ folder: id, mail: null }),
      onkeydown: (e) => { if (e.key === 'Enter') nav.go({ folder: id, mail: null }); },
    }, label, n ? h('span', { class: 'cnt' }, '(' + n + ')') : null));
  }
  for (const label of ['Drafts', 'Sent Items', 'Deleted Items', 'Outbox']) {
    folders.appendChild(h('div', { style: 'color:#666' }, label));
  }
  app.appendChild(folders);

  /* --- message list --- */
  const list = h('div', { class: 'mail-list' });
  app.appendChild(list);
  for (const m of [...items].reverse()) {
    list.appendChild(h('div', {
      class: 'mail-item' + (m.id === sel ? ' on' : '') + (state.readIds[m.id] ? '' : ' unread'),
      tabindex: '0',
      onclick: () => nav.go({ mail: m.id }),
      onkeydown: (e) => { if (e.key === 'Enter') nav.go({ mail: m.id }); },
    },
      h('div', { class: 'from' }, m.from),
      h('div', { class: 'subj' }, m.subject),
      // The preview is free. It has always been free.
      m.preview ? h('div', { class: 'prev' }, m.preview) : null));
  }

  /* --- reading pane --- */
  const read = h('div', { class: 'mail-read' });
  app.appendChild(read);
  const m = items.find(x => x.id === sel);
  if (!m) { read.appendChild(h('div', { style: 'color:#888' }, 'No message selected.')); return; }

  understanding.read(m.id, m);

  read.appendChild(h('h2', {}, m.subject));
  read.appendChild(h('div', { class: 'mail-hdr' },
    h('div', {}, 'From: ' + m.from),
    h('div', {}, 'To: me'),
    h('div', {}, 'Sent: Day ' + m.day)));

  const body = h('div', { class: 'mail-body' });
  read.appendChild(body);

  if (m.redReply) {
    /* The reply from the site that does not reply. One line of boilerplate,
     * and under it a red link — red because every link on that site is red,
     * and this message came from that site.
     *
     * Opening it does NOT end the game. Nothing is offered and nothing is
     * taken. One sentence appears, and it is in the second person PLURAL,
     * and it is therefore not addressed to the person reading it. */
    body.appendChild(document.createTextNode(m.body + '\n\n'));
    if (state.flags.redReplyOpened) {
      body.appendChild(redLine());
    } else {
      const slot = h('span', {});
      slot.appendChild(h('a', {
        class: 'red', href: '#',
        onclick: (e) => {
          e.preventDefault();
          state.flags.redReplyOpened = true;
          // No stinger. It costs concealment, silently, because a live
          // address is now confirmed — and the player is never told.
          concealment.event('postedLocation');
          audio.play('menu_select');
          slot.textContent = '';
          slot.appendChild(redLine());
        },
      }, '▸ 查看完整回复'));
      body.appendChild(slot);
    }
    body.appendChild(document.createTextNode('\n'));
  } else if (m.bait) {
    // It never lies and never disguises itself. It tells you not to.
    body.appendChild(document.createTextNode(m.warning + '\n\n'));
    const label = m.body.split('\n').filter(Boolean).pop().trim();
    body.appendChild(h('a', {
      href: '#',
      onclick: (e) => { e.preventDefault(); openLink(ctx, ui, m); },
    }, label));
    body.appendChild(document.createTextNode('\n'));
  } else {
    body.appendChild(document.createTextNode(
      effects.corruptText(m.body || '(no message body)', { source: 'doc' })));
  }
}

/**
 * The sentence behind the red link. Rendered as text, selectable, and NOT
 * translated — the game will not tell the player what it says. The
 * translator on the desktop will, if they think to use it, and finding out
 * for yourself is worth more than being told.
 */
function redLine() {
  return h('span', { class: 'red-line' }, RED_REPLY_LINE.zh);
}

/**
 * The click. It cannot enter uninvited; this is the invitation, and it is
 * the only thing it has ever needed.
 */
function openLink(ctx, ui, m) {
  state.flags.openedPathogenLink = true;
  // It does give you the thing. It has never once not given you the thing.
  for (const f of m.reward || []) understanding.grant(f, 'the link');
  audio.play('pathogen_hum');
  effects.pathogenManifest();
  bus.emit('pathogen:invited', m.id);
  ui.swap('ending', { forced: 'pathogen', mail: m, line: TERMINAL_LINE, closable: false });
}

export default render;
