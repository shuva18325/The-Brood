/**
 * tv.js — the broadcast.
 *
 * §5A.1. The station ident, the colour bars, the Emergency Alert System,
 * the decay, the sign-off, and one single frame that should not be there.
 *
 * THE RULE: build the clean version first, then break it on a schedule.
 * For the first eight days this must be indistinguishable from a real
 * affiliate. The corruption needs a clean baseline to be measured against.
 */

import { h } from '../index.js';
import { CONFIG, tvDecay } from '../../config.js';
import state from '../../state.js';
import bus from '../../bus.js';
import audio from '../../audio.js';
import effects from '../../effects.js';
import clock from '../../systems/clock.js';
import understanding from '../../systems/understanding.js';
import concealment from '../../systems/concealment.js';
import { newsFor } from '../../content/news.js';
import IMG from '../imagery.js';

let tick = null;
let snowRaf = 0;

/* ------------------------------------------------------------------ */
/* what the set is doing today                                         */
/* ------------------------------------------------------------------ */

function scheduleFor(day, hour) {
  // Off-air hours. The station reduced its broadcast day on the eleventh,
  // and before that it simply signed off overnight like any affiliate.
  const onAir = day >= 11
    ? (hour >= 6 && hour < 8) || (hour >= 18 && hour < 20)
    : (hour >= 5.5 && hour < 25.5);

  if (day >= 15) return 'snow';
  if (day >= 14) return 'bars';
  if (day === CONFIG.tv.signOffDay && hour >= 14 && hour < 15.5) return 'signoff';
  if (!onAir) return 'bars';
  // From the fifth the EAS starts taking the broadcast at the top of the hour.
  if (day >= 5 && (hour % 2) < 0.45) return 'eas';
  return 'news';
}

/* ------------------------------------------------------------------ */

export function render(ctx, host, args, ui) {
  stop();

  const day = state.day;
  const decay = tvDecay(day);

  const wrap = h('div', { class: 'tvwrap' });
  const screen = h('div', { class: 'tvscreen' });
  wrap.appendChild(screen);
  host.appendChild(wrap);

  // Decay is a set of CSS variables so every mode degrades identically.
  screen.style.setProperty('--sat', String(Math.max(0.05, 1 - decay * 0.95)));
  screen.style.setProperty('--bleed', (decay * 3.2).toFixed(2) + 'px');

  const st = {
    mode: args.mode || 'ident',
    day, decay, screen, ui, ctx,
    holdLeft: CONFIG.tv.holdSeconds[Math.min(14, day - 1)],
    elapsed: 0,
  };
  args.mode = null;

  paint(st);

  // Volume. Turning it up is a Concealment event and it is the loudest
  // thing the player can choose to do short of the shotgun.
  const controls = h('div', { class: 'tv-controls' },
    h('button', { class: 'k' + (state.tvVolume === 'low' ? ' on' : ''), onclick: () => setVol(st, 'low') }, 'volume — as low as it goes'),
    h('button', { class: 'k' + (state.tvVolume === 'up' ? ' on' : ''), onclick: () => setVol(st, 'up') }, 'turn it up'),
    h('button', { class: 'k', onclick: () => { st.mode = 'ident'; st.holdLeft = CONFIG.tv.holdSeconds[Math.min(14, day - 1)]; paint(st); } }, 'try the channel again'),
  );
  screen.appendChild(controls);

  // The set loses the channel after a shortening number of seconds.
  tick = setInterval(() => {
    st.elapsed++;
    st.holdLeft--;
    if (st.mode === 'ident' && st.elapsed >= 2) { st.mode = scheduleFor(day, state.hour); paint(st); }
    if (st.holdLeft <= 0 && st.mode !== 'snow' && st.mode !== 'bars') {
      effects.signalLoss(2);
      audio.play('tv_channel');
      st.mode = 'lost';
      paint(st);
      setTimeout(() => {
        if (!tick) return;
        st.holdLeft = CONFIG.tv.holdSeconds[Math.min(14, day - 1)];
        st.mode = scheduleFor(day, state.hour);
        paint(st);
      }, 2200);
    }
    maybeInsert(st);
  }, 1000);
}

function setVol(st, v) {
  if (state.tvVolume === v) return;
  state.tvVolume = v;
  audio.play('tv_channel');
  if (v === 'up') concealment.event('tvVolumeUp');
  st.ui.rerender();
}

/* ------------------------------------------------------------------ */
/* THE SINGLE-FRAME INSERT (§5A.2)                                      */
/*                                                                     */
/* Once. In the entire game. One frame, no sound cue, no effect around  */
/* it, never referenced again and never repeated.                      */
/* ------------------------------------------------------------------ */

function maybeInsert(st) {
  if (state.day !== CONFIG.tv.insertDay) return;
  if (state.eventsFired.singleFrameInsert) return;
  if (st.mode !== 'news' && st.mode !== 'eas') return;
  if (st.elapsed < 4 || Math.random() > 0.22) return;

  state.eventsFired.singleFrameInsert = state.day;
  const f = h('div', { class: 'tv-insert' });
  f.style.backgroundImage = `url(${IMG.insertFrame()})`;
  st.screen.insertBefore(f, st.screen.firstChild.nextSibling);
  setTimeout(() => f.remove(), CONFIG.tv.insertFrameMs);
  // No cue. No shake. Nothing marks it. If the player catches it, they
  // catch it, and if they do not it never happened.
}

/* ------------------------------------------------------------------ */

function paint(st) {
  const old = st.screen.querySelector('.tv-pic');
  if (old) old.remove();
  const shell = st.screen.querySelector('.tv-shell');
  if (shell) shell.remove();
  stopSnow();

  const pic = h('div', { class: 'tv-pic' + (st.decay > 0.3 ? ' bleed' : '') });
  // Sync loss: the picture starts rolling before it goes.
  if (st.decay > 0.55) {
    const roll = Math.sin(st.elapsed * 0.9) * (st.decay - 0.55) * 60;
    pic.style.setProperty('--roll', roll.toFixed(1) + 'px');
  }

  const build = {
    ident: paintIdent, news: paintNews, eas: paintEAS, bars: paintBars,
    signoff: paintSignoff, snow: paintSnow, lost: paintLost,
  }[st.mode] || paintNews;
  build(pic, st);

  st.screen.insertBefore(pic, st.screen.firstChild);
  st.screen.appendChild(h('div', { class: 'tv-shell' }));
}

/* --- the ident. Play it completely straight. --------------------- */
function paintIdent(pic) {
  audio.play('tv_on');
  const el = h('div', { class: 'tv-ident' },
    h('img', { src: IMG.stationLogo(280, 90), alt: 'WKRV 9' }),
    h('div', { class: 'tagline' }, 'TIDEWATER’S NEWS LEADER'));
  pic.appendChild(el);
}

/* --- the newscast ------------------------------------------------ */
function paintNews(pic, st) {
  const items = newsFor(st.day);
  const top = items[0];
  if (top) understanding.read(top.id, top);

  pic.appendChild(h('div', { class: 'tv-studio' },
    h('div', { class: 'tv-desk' }),
    h('div', { class: 'tv-anchor' }, h('div', { class: 'head' }), h('div', { class: 'body' }))
  ));

  pic.appendChild(h('div', { class: 'tv-clockbug' }, clock.label()));
  pic.appendChild(h('img', { class: 'tv-bug', src: IMG.stationBug(), alt: '' }));

  if (top) {
    pic.appendChild(h('div', { class: 'tv-lower' },
      h('div', { class: 'l1' }, effects.corruptText(top.headline, { source: 'news' })),
      h('div', { class: 'l2' }, st.day >= 5 ? 'BREAKING NEWS' : top.source)
    ));
  }

  const crawlText = items.slice(0, 6).map(n => n.headline).join('   •   ');
  pic.appendChild(h('div', { class: 'tv-crawl' }, h('span', {}, crawlText + '   •   ')));
}

/* --- the Emergency Alert System ----------------------------------
 *
 * The visual language NEVER changes. The Day 12 alert must use the exact
 * same layout, colour and type as the Day 6 one. Only the CONTENT is
 * wrong, and it is wrong quietly.
 */
function paintEAS(pic, st) {
  const d = st.day;
  const A = easContent(d);
  const el = h('div', { class: 'tv-eas' },
    h('h1', {}, 'EMERGENCY ALERT SYSTEM'),
    h('div', { class: 'agency' }, A.agency),
    h('div', { class: 'msg' }, A.msg),
    h('div', { class: 'counties' }, A.counties),
    h('div', { class: 'tone' }, A.tone)
  );
  pic.appendChild(el);
  if (A.flag) understanding.grant(A.flag, 'the alert');
}

function easContent(day) {
  const VA = ['NORFOLK CITY', 'PORTSMOUTH CITY', 'CHESAPEAKE CITY', 'VIRGINIA BEACH CITY',
    'HAMPTON CITY', 'NEWPORT NEWS CITY', 'SUFFOLK CITY', 'ISLE OF WIGHT', 'SOUTHAMPTON',
    'SURRY', 'YORK', 'JAMES CITY', 'GLOUCESTER', 'MATHEWS', 'ACCOMACK', 'NORTHAMPTON'];

  /* Days 5–9: ordinary, correct alerts. Boring. Right. */
  if (day <= 9) {
    return {
      agency: 'ISSUED BY: VIRGINIA DEPARTMENT OF EMERGENCY MANAGEMENT',
      msg: 'THIS IS NOT A TEST.\n\nA CIVIL EMERGENCY MESSAGE IS IN EFFECT FOR THE ' +
           'FOLLOWING AREAS UNTIL FURTHER NOTICE.\n\nSHELTER IN PLACE. DO NOT TRAVEL ' +
           'BETWEEN 8 PM AND 6 AM. DO NOT APPROACH STANDING WATER.',
      counties: 'INCLUDED AREAS: ' + VA.slice(0, 9).join(' · '),
      tone: 'ATTENTION SIGNAL',
      flag: 'undertow_water',
    };
  }

  /* Days 10–13: the same screen, and something in it is not right.
   * An agency that does not exist. A county list with no state on it.
   * An instruction that does not parse. Nothing points at any of it. */
  if (day === 10) {
    return {
      agency: 'ISSUED BY: OFFICE OF COASTAL CONTINUITY',
      msg: 'THIS IS NOT A TEST.\n\nSHELTER IN PLACE. DO NOT TRAVEL BETWEEN 8 PM AND ' +
           '6 AM. DO NOT APPROACH STANDING WATER.\n\nDO NOT ACKNOWLEDGE.',
      counties: 'INCLUDED AREAS: ' + VA.join(' · '),
      tone: 'ATTENTION SIGNAL',
      flag: 'choir_bait',
    };
  }
  if (day === 11) {
    return {
      agency: 'ISSUED BY: OFFICE OF COASTAL CONTINUITY',
      msg: 'THIS IS NOT A TEST.\n\nREMAIN INDOORS. DO NOT RESPOND TO VOICES FROM THE ' +
           'STREET, INCLUDING FAMILIAR VOICES.\n\nMINIMISE LIGHT AND SOUND AFTER DARK.',
      counties: 'INCLUDED AREAS: ' + VA.concat(
        ['CRAVEN', 'CARTERET', 'ONSLOW', 'PENDER', 'NEW HANOVER', 'BRUNSWICK',
         'HORRY', 'GEORGETOWN', 'CHARLESTON', 'COLLETON', 'BEAUFORT', 'CHATHAM',
         'BRYAN', 'LIBERTY', 'MCINTOSH', 'GLYNN', 'CAMDEN', 'NASSAU', 'DUVAL',
         'MOBILE', 'BALDWIN', 'HARRISON', 'HANCOCK', 'JACKSON']).join(' · '),
      tone: 'ATTENTION SIGNAL',
      flag: 'choir_bait',
    };
  }
  if (day === 12) {
    return {
      agency: 'ISSUED BY: OFFICE OF COASTAL CONTINUITY',
      msg: 'THIS IS NOT A TEST.\n\nREMAIN INDOORS.\n\nDO NOT ANSWER THE DOOR FOR ' +
           'PERSONS KNOWN TO YOU.\n\nDO NOT ANSWER THE DOOR FOR PERSONS KNOWN TO YOU.',
      counties: 'INCLUDED AREAS: 41 AREAS',
      tone: 'ATTENTION SIGNAL',
      flag: 'texts_are_bait',
    };
  }
  return {
    agency: 'ISSUED BY: ██████████████████████',
    msg: 'THIS IS NOT A TEST.\n\nREMAIN INDOORS.\n\nTHERE IS NO NUMBER TO CALL AT ' +
         'THIS TIME.\n\nTHIS MESSAGE WILL NOT REPEAT.',
    counties: '',
    tone: 'ATTENTION SIGNAL — NO MESSAGE FOLLOWS',
  };
}

/* --- colour bars ------------------------------------------------- */
function paintBars(pic, st) {
  const el = h('div', { class: 'tv-bars' });
  el.style.backgroundImage = `url(${IMG.colourBars()})`;
  pic.appendChild(el);
  if (st.day >= 14) {
    understanding.read('n38', { u: 1 });
    pic.appendChild(h('div', { class: 'tv-clockbug' }, '1 kHz'));
  }
}

/* --- the sign-off, in the middle of the afternoon ----------------- */
function paintSignoff(pic) {
  pic.appendChild(h('div', { class: 'tv-signoff' },
    h('img', { src: IMG.stationLogo(220, 70), alt: 'WKRV 9' }),
    h('div', {}, 'THIS CONCLUDES OUR BROADCAST DAY'),
    h('div', { style: 'font-size:12px;color:#8b8578' },
      'WKRV‑TV · NORFOLK, VIRGINIA · 1,000 KW ERP'),
    h('div', { style: 'font-size:12px;color:#8b8578' }, 'WE NOW LEAVE THE AIR')
  ));
}

/* --- losing the channel: not a clean cut ------------------------- */
function paintLost(pic, st) {
  pic.appendChild(h('div', { class: 'tv-bars' })).style.opacity = '0.15';
  paintSnow(pic, st);
}

/* --- snow. Bright, and the brightest thing in the apartment. ------ */
function paintSnow(pic, st) {
  const el = h('div', { class: 'tv-snow' });
  const c = document.createElement('canvas');
  c.width = 320; c.height = 240;
  el.appendChild(c);
  pic.appendChild(el);
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);

  const draw = () => {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.random() * 255;
      d[i] = d[i + 1] = d[i + 2] = v;
      d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    snowRaf = requestAnimationFrame(draw);
  };
  draw();

  if (st && st.day >= 15) {
    audio.play('bed_tv_static', { loop: true });
    understanding.read('n39', { u: 1 });
  }
}

function stopSnow() {
  if (snowRaf) { cancelAnimationFrame(snowRaf); snowRaf = 0; }
}

function stop() {
  if (tick) { clearInterval(tick); tick = null; }
  stopSnow();
}

export function onClose() {
  stop();
  audio.stop('bed_tv_static');
  bus.emit('tv:closed');
}

export default render;
