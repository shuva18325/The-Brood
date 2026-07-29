/**
 * imagery.js — every image on every 2D screen, generated on a canvas.
 *
 * No external files, ever. Everything here returns a data URI, cached by
 * key, so it can go straight into an <img src>.
 *
 * The rule from §1 governs this whole file: the CHROME is never stylised,
 * the CONTENT can be as degraded as it needs to be. A station logo is a
 * clean station logo. A forensic plate is a forensic plate.
 */

import P from '../fx/photo.js';
import { drawEntity } from '../fx/entityArt.js';

const cache = new Map();

function make(key, w, h, draw, encode) {
  if (cache.has(key)) return cache.get(key);
  const c = P.surface(w, h);
  draw(c.getContext('2d'), w, h, c);
  const url = encode ? encode(c) : c.toDataURL('image/png');
  cache.set(key, url);
  return url;
}

/* ================================================================== */
/* CHROME — clean, boring, correct. Never touched by the horror layer.  */
/* ================================================================== */

/**
 * WKRV 9. A local network affiliate's logo, in the house navy, exactly as
 * unremarkable as a real one. It must be indistinguishable from the real
 * thing for the first eight days, because that is what makes day nine work.
 */
export function stationLogo(w = 168, h = 54) {
  return make('logo.' + w, w, h, (g) => {
    g.fillStyle = '#0B2A4A'; g.fillRect(0, 0, w, h);
    // the swoosh every affiliate has had since 1998
    g.fillStyle = '#C4242B';
    g.beginPath();
    g.moveTo(w * 0.60, 0); g.lineTo(w, 0); g.lineTo(w * 0.80, h); g.lineTo(w * 0.40, h);
    g.closePath(); g.fill();
    g.fillStyle = '#ffffff';
    g.font = `bold ${Math.round(h * 0.52)}px Arial, Helvetica, sans-serif`;
    g.textBaseline = 'middle';
    g.fillText('WKRV', w * 0.05, h * 0.5);
    g.font = `bold ${Math.round(h * 0.72)}px Arial, Helvetica, sans-serif`;
    g.fillText('9', w * 0.70, h * 0.52);
  });
}

/** The on-air bug, bottom right of the broadcast. */
export function stationBug(w = 96, h = 34) {
  return make('bug', w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.globalAlpha = 0.82;
    g.fillStyle = '#0B2A4A';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#C4242B'; g.fillRect(0, 0, 4, h);
    g.globalAlpha = 1;
    g.fillStyle = '#ffffff';
    g.font = `bold 15px Arial, Helvetica, sans-serif`;
    g.textBaseline = 'middle';
    g.fillText('WKRV', 10, h * 0.5);
    g.font = `bold 19px Arial, Helvetica, sans-serif`;
    g.fillText('9', 66, h * 0.52);
  });
}

/**
 * The desktop wallpaper. Four people at a cookout, one of them Ray,
 * low resolution and stretched slightly wrong for the monitor.
 *
 * This is a piece of chrome that is allowed to hurt, because it is real —
 * it is just a photograph somebody set as their wallpaper and forgot.
 */
export function wallpaper(w = 960, h = 600) {
  return make('wall', w, h, (g) => {
    // late afternoon, back yard, too much sky
    const sky = g.createLinearGradient(0, 0, 0, h * 0.55);
    sky.addColorStop(0, '#8fa6bd'); sky.addColorStop(1, '#c9c0aa');
    g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.58);
    g.fillStyle = '#5d6b45'; g.fillRect(0, h * 0.55, w, h * 0.45);
    // a fence, a shed, a tree that is mostly a blob
    g.fillStyle = '#6b5a44'; g.fillRect(0, h * 0.44, w, h * 0.13);
    for (let x = 0; x < w; x += 26) { g.fillStyle = 'rgba(40,32,22,0.25)'; g.fillRect(x, h * 0.44, 3, h * 0.13); }
    g.fillStyle = '#3e4d33';
    g.beginPath(); g.ellipse(w * 0.16, h * 0.30, w * 0.13, h * 0.20, 0, 0, 7); g.fill();
    // the grill, and the smoke off it
    g.fillStyle = '#2b2b2e';
    g.fillRect(w * 0.72, h * 0.48, w * 0.09, h * 0.10);
    g.fillRect(w * 0.755, h * 0.58, w * 0.02, h * 0.09);
    g.fillStyle = 'rgba(220,220,215,0.30)';
    g.beginPath(); g.ellipse(w * 0.765, h * 0.42, w * 0.05, h * 0.07, 0.4, 0, 7); g.fill();

    // four people. Nobody is posed. One is turned away.
    const folk = [
      [0.30, 0.62, '#b4423c', 0.0],
      [0.41, 0.63, '#3f5f7a', 0.1],
      [0.52, 0.615, '#d8d2c2', -0.05],   // Ray, in the white shirt, mid-laugh
      [0.63, 0.635, '#4a5d3f', 0.06],
    ];
    for (const [fx, fy, shirt, tilt] of folk) {
      const px = w * fx, py = h * fy;
      g.save(); g.translate(px, py); g.rotate(tilt);
      g.fillStyle = shirt;
      g.fillRect(-w * 0.026, -h * 0.13, w * 0.052, h * 0.17);
      g.fillStyle = '#6b4f3c';
      g.beginPath(); g.arc(0, -h * 0.155, w * 0.021, 0, 7); g.fill();
      g.fillStyle = '#2f3542';
      g.fillRect(-w * 0.024, h * 0.04, w * 0.020, h * 0.16);
      g.fillRect(w * 0.004, h * 0.04, w * 0.020, h * 0.16);
      g.restore();
    }

    // a phone camera in 2019, held by someone who had had two beers
    P.exposure(g.canvas, 0.22);
    P.motionBlur(g.canvas, 4, 2, 0.28);
    P.resample(g.canvas, 0.42);
    P.chromaBleed(g.canvas, 0.4);
    P.noise(g.canvas, 12);
    P.vignette(g.canvas, 0.24);
  }, (c) => P.jpeg(c, 0.55));
}

/** The weather widget's stock photo. A beach. Nobody has updated it. */
export function weatherStock(w = 300, h = 150) {
  return make('wx', w, h, (g) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
    sky.addColorStop(0, '#4d8fc4'); sky.addColorStop(1, '#a9cbe2');
    g.fillStyle = sky; g.fillRect(0, 0, w, h * 0.62);
    g.fillStyle = '#2e6f96'; g.fillRect(0, h * 0.58, w, h * 0.20);
    g.fillStyle = '#d8c9a4'; g.fillRect(0, h * 0.76, w, h * 0.24);
    g.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 4; i++) {
      g.beginPath(); g.ellipse(w * (0.15 + i * 0.22), h * (0.18 + (i % 2) * 0.07),
        w * 0.09, h * 0.05, 0, 0, 7); g.fill();
    }
    P.jpeg(g.canvas, 0.5);
  }, (c) => P.jpeg(c, 0.5));
}

/** Local advertisers. They keep rendering long after anyone is buying. */
export function ad(kind, w = 300, h = 250) {
  return make('ad.' + kind + w, w, h, (g) => {
    const A = {
      injury: { bg: '#12233f', fg: '#f2c14e',
        l1: 'INJURED?', l2: 'HOLLIS & BRAY', l3: 'ATTORNEYS AT LAW',
        l4: 'No fee unless we win', l5: '(757) 555‑0900' },
      car:    { bg: '#8c1c1c', fg: '#ffffff',
        l1: '0% APR', l2: 'TIDEWATER FORD', l3: 'MILITARY HWY',
        l4: '48 months · O.A.C.', l5: 'SE HABLA ESPAÑOL' },
      roof:   { bg: '#20402a', fg: '#e8e2cf',
        l1: 'FREE ESTIMATE', l2: 'CASSELL ROOFING', l3: 'SINCE 1974',
        l4: 'Storm damage specialists', l5: '(757) 555‑0144' },
      hvac:   { bg: '#1c3b52', fg: '#ffe08a',
        l1: '$59 TUNE‑UP', l2: 'DELMAR HEAT & AIR', l3: '24 HOUR SERVICE',
        l4: 'Financing available', l5: '(757) 555‑0177' },
    }[kind] || {};
    g.fillStyle = A.bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 2; g.strokeRect(3, 3, w - 6, h - 6);
    g.textAlign = 'center';
    g.fillStyle = A.fg;
    g.font = `bold ${Math.round(h * 0.16)}px Arial Black, Arial, sans-serif`;
    g.fillText(A.l1, w / 2, h * 0.24);
    g.fillStyle = '#ffffff';
    g.font = `bold ${Math.round(h * 0.095)}px Arial, sans-serif`;
    g.fillText(A.l2, w / 2, h * 0.42);
    g.font = `${Math.round(h * 0.062)}px Arial, sans-serif`;
    g.fillText(A.l3, w / 2, h * 0.53);
    g.fillStyle = 'rgba(255,255,255,0.8)';
    g.font = `${Math.round(h * 0.055)}px Arial, sans-serif`;
    g.fillText(A.l4, w / 2, h * 0.68);
    g.fillStyle = A.fg;
    g.font = `bold ${Math.round(h * 0.085)}px Arial, sans-serif`;
    g.fillText(A.l5, w / 2, h * 0.84);
    g.textAlign = 'left';
  }, (c) => P.jpeg(c, 0.72));
}

/** Forum avatars. Everyone's is from a different decade. */
export function avatar(seed, size = 60) {
  return make('av.' + seed + size, size, size, (g, w, h) => {
    let s = 0; for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    const style = Math.floor(rnd() * 4);

    if (style === 0) {           // a photo of a boat, or a dog, or a truck
      g.fillStyle = `hsl(${Math.floor(rnd() * 60 + 180)},30%,${30 + rnd() * 20}%)`;
      g.fillRect(0, 0, w, h);
      g.fillStyle = `hsl(${Math.floor(rnd() * 40 + 20)},40%,45%)`;
      g.beginPath(); g.ellipse(w * 0.5, h * 0.65, w * 0.32, h * 0.22, 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)';
      g.fillRect(0, h * 0.72, w, h * 0.28);
    } else if (style === 1) {    // a solid colour and two initials
      g.fillStyle = `hsl(${Math.floor(rnd() * 360)},35%,32%)`;
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#e8e4d8';
      g.font = `bold ${Math.round(h * 0.44)}px Verdana, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(seed.slice(0, 2).toUpperCase(), w / 2, h / 2);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    } else if (style === 2) {    // the default avatar of a dead forum skin
      g.fillStyle = '#c8ccd4'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#8d95a3';
      g.beginPath(); g.arc(w * 0.5, h * 0.36, w * 0.18, 0, 7); g.fill();
      g.beginPath(); g.ellipse(w * 0.5, h * 0.92, w * 0.32, h * 0.30, 0, 0, 7); g.fill();
    } else {                     // an animated gif, from before it stopped moving
      for (let i = 0; i < 5; i++) {
        g.fillStyle = `hsl(${Math.floor(rnd() * 360)},70%,${40 + rnd() * 30}%)`;
        g.fillRect(rnd() * w, rnd() * h, w * 0.4, h * 0.4);
      }
    }
    P.noise(g.canvas, 8);
  }, (c) => P.jpeg(c, 0.6));
}

/* ================================================================== */
/* CONTENT — this is where the horror is allowed to live.               */
/* ================================================================== */

/**
 * A bad phone photograph of an entity. §3.4: someone's phone, held badly,
 * in a hurry. Never a good photograph.
 */
export function phoneSnap(kind, opts = {}) {
  const w = opts.w || 480, h = opts.h || 360;
  return make('snap.' + kind + (opts.variant || ''), w, h, (g, W, H, c) => {
    // a street at night, which is 90% of the frame and all of the exposure
    g.fillStyle = '#0d0f14'; g.fillRect(0, 0, W, H);
    const lamp = g.createRadialGradient(W * 0.22, H * 0.18, 0, W * 0.22, H * 0.18, W * 0.5);
    lamp.addColorStop(0, 'rgba(232,168,92,0.95)');
    lamp.addColorStop(0.25, 'rgba(160,104,48,0.35)');
    lamp.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = lamp; g.fillRect(0, 0, W, H);
    g.fillStyle = '#191c22'; g.fillRect(0, H * 0.72, W, H * 0.28);
    g.fillStyle = 'rgba(210,150,80,0.10)';
    g.beginPath(); g.moveTo(W * 0.1, H); g.lineTo(W * 0.3, H * 0.72);
    g.lineTo(W * 0.44, H * 0.72); g.lineTo(W * 0.35, H); g.fill();

    // the thing, off-centre, partly out of frame, at the wrong moment
    const scale = opts.scale || 0.42;
    const x = W * (opts.x ?? 0.52), y = H * (opts.y ?? 0.10);
    drawEntity(g, kind, x, y, W * scale);

    // and now ruin it
    P.exposure(c, opts.stops ?? -0.55);
    P.motionBlur(c, opts.blurAngle ?? 14, opts.blurPx ?? 7, 0.62);
    if (opts.throughGlass !== false) P.glass(c, 0.13);
    P.resample(c, 0.34);
    P.chromaBleed(c, 0.28);
    P.noise(c, 26);
    P.cast(c, 1.12, 0.98, 0.86, 0.4);
    P.vignette(c, 0.5);
  }, (c) => P.jpeg(c, opts.quality ?? 0.14));
}

/**
 * A forensic plate. §5A.4: clinical rather than lurid — flat on-camera
 * flash, bad colour, a scale ruler, an evidence marker, an exhibit number
 * below the frame.
 *
 * The clinical register is what makes it horrifying. Someone filed this.
 */
export function evidencePlate(opts = {}) {
  const w = 460, h = 400;
  return make('ev.' + (opts.id || 'x'), w, h, (g, W, H, c) => {
    const frameH = H - 42;

    // Institutional floor or a tarp, lit by nothing but the flash.
    g.fillStyle = opts.ground || '#4c4a44';
    g.fillRect(0, 0, W, frameH);
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(${90 + Math.random() * 40 | 0},${88 + Math.random() * 36 | 0},${80 + Math.random() * 30 | 0},0.25)`;
      g.fillRect(Math.random() * W, Math.random() * frameH, 2, 2);
    }
    // Flash falloff: hot in the middle, black at the corners. On-camera.
    const flash = g.createRadialGradient(W * 0.5, frameH * 0.45, 0, W * 0.5, frameH * 0.45, W * 0.72);
    flash.addColorStop(0, 'rgba(255,252,240,0.42)');
    flash.addColorStop(0.5, 'rgba(255,250,235,0.10)');
    flash.addColorStop(1, 'rgba(0,0,0,0.55)');
    g.fillStyle = flash; g.fillRect(0, 0, W, frameH);

    // The subject. Deliberately unresolved: a dark mass, a wet sheen, and
    // the thing that makes it awful is the ruler next to it.
    if (opts.subject !== 'none') {
      g.save();
      g.translate(W * 0.46, frameH * 0.56);
      g.rotate(opts.rot ?? -0.18);
      g.fillStyle = opts.tone || '#241a18';
      g.beginPath();
      g.moveTo(-95, -20);
      g.bezierCurveTo(-60, -70, 55, -66, 92, -12);
      g.bezierCurveTo(105, 26, 40, 58, -14, 50);
      g.bezierCurveTo(-70, 44, -110, 16, -95, -20);
      g.fill();
      // a sheen, because whatever it is has not dried
      g.fillStyle = 'rgba(190,180,172,0.16)';
      g.beginPath(); g.ellipse(-18, -22, 44, 15, -0.3, 0, 7); g.fill();
      // fragments, placed the way things get placed
      g.fillStyle = opts.tone || '#241a18';
      for (let i = 0; i < 5; i++) {
        g.beginPath();
        g.ellipse(-130 - Math.random() * 60, 10 + Math.random() * 44,
          6 + Math.random() * 11, 4 + Math.random() * 7, Math.random() * 3, 0, 7);
        g.fill();
      }
      g.restore();
    }

    // The scale ruler. This is the object that does the work.
    g.save();
    g.translate(W * 0.10, frameH * 0.80);
    g.rotate(0.03);
    g.fillStyle = '#e6e2d6'; g.fillRect(0, 0, 190, 22);
    g.fillStyle = '#14140f';
    for (let i = 0; i <= 15; i++) {
      const x = i * 12.4;
      g.fillRect(x, 0, 1.6, i % 5 === 0 ? 16 : 9);
      if (i % 5 === 0) { g.font = '9px Arial, sans-serif'; g.fillText(String(i), x + 2, 21); }
    }
    g.font = 'bold 9px Arial, sans-serif';
    g.fillText('cm', 168, 21);
    g.restore();

    // The evidence marker. A folded card with a number on it.
    g.save();
    g.translate(W * 0.74, frameH * 0.70);
    g.fillStyle = '#dcd7c8';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(46, -6); g.lineTo(46, 44); g.lineTo(0, 50); g.closePath(); g.fill();
    g.fillStyle = '#7d1f1a';
    g.font = 'bold 30px Arial, sans-serif';
    g.fillText(String(opts.marker ?? 3), 12, 36);
    g.restore();

    // Exhibit strip, printed below the frame by the lab, not by a designer.
    g.fillStyle = '#ffffff'; g.fillRect(0, frameH, W, H - frameH);
    g.fillStyle = '#111111';
    g.font = '12px "Courier New", monospace';
    g.fillText(opts.exhibit || 'EXHIBIT 14‑C   CF‑1996‑0202   PLATE 3 OF 6', 10, frameH + 17);
    g.font = '10px "Courier New", monospace';
    g.fillStyle = '#333333';
    g.fillText(opts.caption || 'Recovered material, site perimeter. Scale in cm.', 10, frameH + 32);

    // A polaroid-era lab camera, then a photocopier, then a scanner.
    P.cast(c, 1.06, 1.0, 0.92, 0.5);
    P.noise(c, 16);
    P.resample(c, 0.7);
  }, (c) => P.jpeg(c, 0.42));
}

/**
 * The Tyre tablet: a photographic plate of a clay object, with the scale
 * reference blacked out, because the Foundation blacks out scale.
 */
export function tabletPlate(w = 420, h = 320) {
  return make('tablet', w, h, (g, W, H, c) => {
    g.fillStyle = '#1a1a1a'; g.fillRect(0, 0, W, H);
    // the object, lit raking from the left so the cuneiform reads at all
    g.save(); g.translate(W * 0.5, H * 0.48); g.rotate(-0.02);
    const clay = g.createLinearGradient(-W * 0.30, -H * 0.28, W * 0.30, H * 0.28);
    clay.addColorStop(0, '#b6a086');
    clay.addColorStop(1, '#6b5b48');
    g.fillStyle = clay;
    g.fillRect(-W * 0.30, -H * 0.28, W * 0.60, H * 0.56);
    // chipped corner
    g.fillStyle = '#1a1a1a';
    g.beginPath(); g.moveTo(W * 0.30, H * 0.10); g.lineTo(W * 0.30, H * 0.28);
    g.lineTo(W * 0.12, H * 0.28); g.closePath(); g.fill();
    // cuneiform: wedges in rows, ruled
    g.strokeStyle = 'rgba(70,56,40,0.5)'; g.lineWidth = 1;
    for (let r = 0; r < 11; r++) {
      const y = -H * 0.25 + r * H * 0.048;
      g.beginPath(); g.moveTo(-W * 0.28, y); g.lineTo(W * 0.28, y); g.stroke();
      for (let i = 0; i < 22; i++) {
        const x = -W * 0.27 + i * W * 0.0245 + Math.random() * 3;
        g.fillStyle = 'rgba(58,44,30,0.85)';
        g.beginPath();
        g.moveTo(x, y + 3); g.lineTo(x + 4, y + 3); g.lineTo(x + 2, y + 9);
        g.closePath(); g.fill();
      }
    }
    g.restore();
    // the scale reference, blacked out
    g.fillStyle = '#000000'; g.fillRect(W * 0.06, H * 0.82, W * 0.30, H * 0.10);
    g.fillStyle = '#e8e4d8';
    g.font = '11px "Courier New", monospace';
    g.fillText('CF‑1991‑0067  PLATE 3', W * 0.62, H * 0.94);
    P.cast(c, 1.02, 1.0, 0.94, 0.6);
    P.noise(c, 14, true);
    P.resample(c, 0.75);
    P.photocopy(c, 1);
  }, (c) => P.jpeg(c, 0.45));
}

/**
 * A single frame of a video log, with the tape damage that survived a bad
 * chain of custody. §5A.3.
 */
export function videoFrame(opts = {}) {
  const w = 480, h = 360;
  return make('vid.' + (opts.id || 'x'), w, h, (g, W, H, c) => {
    g.fillStyle = opts.night === false ? '#5a6068' : '#0b0d11';
    g.fillRect(0, 0, W, H);

    if (opts.night === false) {
      const sky = g.createLinearGradient(0, 0, 0, H * 0.6);
      sky.addColorStop(0, '#8c98a6'); sky.addColorStop(1, '#b6b3a4');
      g.fillStyle = sky; g.fillRect(0, 0, W, H * 0.58);
      g.fillStyle = '#4a4d47'; g.fillRect(0, H * 0.56, W, H * 0.44);
    } else {
      const lamp = g.createRadialGradient(W * 0.7, H * 0.2, 0, W * 0.7, H * 0.2, W * 0.55);
      lamp.addColorStop(0, 'rgba(226,158,84,0.7)');
      lamp.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = lamp; g.fillRect(0, 0, W, H);
      g.fillStyle = '#15181d'; g.fillRect(0, H * 0.70, W, H * 0.30);
    }

    // Whoever held the camera was not a cinematographer.
    if (opts.subject) drawEntity(g, opts.subject, W * (opts.x ?? 0.66), H * (opts.y ?? 0.18), W * (opts.scale ?? 0.3));

    // a fence, a wall, a car — the thing the camera is actually pointed at
    g.fillStyle = 'rgba(28,30,34,0.9)';
    g.fillRect(0, H * 0.52, W * 0.22, H * 0.48);

    P.autoGain(c, opts.gainPhase ?? 1.2);
    P.generations(c, opts.gens ?? 1);
    P.tracking(c, opts.tracking ?? 3, 0.07, opts.seed ?? 0);
    P.chromaBleed(c, 0.28);
    P.noise(c, 20);
    P.headSwitch(c, 0.05);
    P.burnIn(c, opts.timecode || 'SEP 09  02:41:18', 'br');
    if (opts.label) P.burnIn(c, opts.label, 'tl');
    P.vignette(c, 0.42);
  }, (c) => P.jpeg(c, 0.2));
}

/**
 * The single-frame insert. §5A.2 — once, in the entire game. No sound cue,
 * no effect around it, never referenced again.
 */
export function insertFrame() {
  const w = 480, h = 360;
  return make('insert', w, h, (g, W, H, c) => {
    g.fillStyle = '#0a0a0c'; g.fillRect(0, 0, W, H);
    drawEntity(g, 'incursion', W * 0.30, -H * 0.06, W * 0.44);
    P.exposure(c, -0.3);
    P.chromaBleed(c, 0.3);
    P.noise(c, 30);
    P.tracking(c, 2, 0.05, 3);
  }, (c) => P.jpeg(c, 0.3));
}

/** The Pathogen, on the surface it manifests on. Never in the world. */
export function pathogenPlate(w = 420, h = 420) {
  return make('pathogen', w, h, (g, W, H, c) => {
    g.fillStyle = '#050507'; g.fillRect(0, 0, W, H);
    drawEntity(g, 'pathogen', W * 0.14, H * 0.02, W * 0.72);
    P.chromaBleed(c, 0.25);
    P.tracking(c, 4, 0.05, 7);
    P.noise(c, 16);
    P.vignette(c, 0.5);
  }, (c) => P.jpeg(c, 0.3));
}

/** SMPTE colour bars, for off-air hours. Drawn correctly, on purpose. */
export function colourBars(w = 640, h = 480) {
  return make('bars', w, h, (g, W, H) => {
    const top = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'];
    const mid = ['#0000c0', '#131313', '#c000c0', '#131313', '#00c0c0', '#131313', '#c0c0c0'];
    const bw = W / 7;
    top.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * bw, 0, bw + 1, H * 0.67); });
    mid.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * bw, H * 0.67, bw + 1, H * 0.08); });
    const bot = ['#00214c', '#ffffff', '#32006a', '#131313'];
    bot.forEach((c, i) => { g.fillStyle = c; g.fillRect(i * (W / 6), H * 0.75, W / 6 + 1, H * 0.25); });
    g.fillStyle = '#131313'; g.fillRect(W * 0.667, H * 0.75, W * 0.333, H * 0.25);
    for (let i = 0; i < 3; i++) {
      g.fillStyle = ['#080808', '#131313', '#1d1d1d'][i];
      g.fillRect(W * 0.667 + i * (W * 0.055), H * 0.75, W * 0.055, H * 0.25);
    }
  }, (c) => P.jpeg(c, 0.8));
}

export default { stationLogo, stationBug, wallpaper, weatherStock, ad, avatar,
  phoneSnap, evidencePlate, tabletPlate, videoFrame, insertFrame, pathogenPlate, colourBars };
