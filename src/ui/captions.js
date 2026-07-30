/**
 * captions.js — sound captions (§8).
 *
 * This game hides survival-critical information in audio: the length of the
 * gaps between collapses, whether the scratching is low and behind you,
 * whether the street has gone silent. That makes captions a CORRECTNESS
 * requirement, not a nicety.
 *
 * Direction is always included, because direction is gameplay.
 */

import bus from '../bus.js';
import { CONFIG } from '../config.js';

let host = null;
let compass = null;
const live = [];

export function initCaptions() {
  host = document.getElementById('captions');
  compass = document.getElementById('audio-compass');
  if (!host) return;

  apply();

  bus.on('caption', (c) => {
    if (!CONFIG.a11y.captions) return;
    // Soft captions are the ambient bed — the dog three streets over, the
    // gulls. They are on a separate, quieter line so the important ones
    // still read at a glance.
    push(c);
    if (CONFIG.a11y.audioCompass && c.dir) showCompass(c.dir);
  });

  // The silence gets a caption of its own, because a deaf player must be
  // told that the room has stopped making sound. That is the whole event.
  bus.on('audio:silence', () => {
    if (!CONFIG.a11y.captions) return;
    push({ text: 'silence — every sound in the building has stopped', dir: '', hold: 11000, big: true });
  });
  bus.on('audio:silenceEnd', () => {
    if (!CONFIG.a11y.captions) return;
    push({ text: 'the room tone comes back, alone', dir: '', soft: true });
  });

  bus.on('fridge', (on) => {
    if (!CONFIG.a11y.captions) return;
    push({ text: on ? 'the fridge compressor starts' : 'the fridge stops — the street gets closer',
      dir: 'east', soft: true });
  });
}

function push(c) {
  if (!host) return;
  const el = document.createElement('div');
  el.className = 'cap' + (c.soft ? ' soft' : '') + (c.big ? ' big' : '');
  const dir = c.dir ? ` — ${c.dir}` : '';
  el.textContent = `[${c.text}${dir}]`;
  host.appendChild(el);
  live.push(el);
  host.classList.remove('hidden');

  const hold = c.hold || (c.soft ? 2600 : 4200);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => {
      el.remove();
      const i = live.indexOf(el);
      if (i >= 0) live.splice(i, 1);
      if (!live.length && host) host.classList.add('hidden');
    }, 400);
  }, hold);

  // Never more than four on screen; the oldest goes.
  while (live.length > 4) {
    const old = live.shift();
    if (old) old.remove();
  }
}

/** A visual indicator of direction. Off by default. */
function showCompass(dir) {
  if (!compass) return;
  const d = String(dir).toLowerCase();
  let deg = null;
  if (d.includes('north')) deg = 0;
  else if (d.includes('south')) deg = 180;
  else if (d.includes('east')) deg = 90;
  else if (d.includes('west')) deg = 270;
  if (d.includes('below')) compass.dataset.low = '1'; else delete compass.dataset.low;
  if (deg === null && !d.includes('above') && !d.includes('below') && !d.includes('ahead')) return;

  compass.classList.remove('hidden');
  compass.style.setProperty('--deg', (deg ?? 0) + 'deg');
  compass.textContent = d.includes('above') ? '▲' : d.includes('below') ? '▼' : '▲';
  clearTimeout(compass._t);
  compass._t = setTimeout(() => compass.classList.add('hidden'), 2600);
}

export function apply() {
  if (!host) return;
  if (!CONFIG.a11y.captions) {
    host.classList.add('hidden');
    host.innerHTML = '';
    live.length = 0;
  }
  if (compass && !CONFIG.a11y.audioCompass) compass.classList.add('hidden');
}

export default initCaptions;
