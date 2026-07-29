/**
 * photo.js — making procedural drawings read as photographs.
 *
 * §3.4: the photos that appear on the forum and in Foundation documents
 * should look like REAL BAD PHOTOGRAPHS. Wrong exposure, motion blur,
 * camera shake, JPEG artefacts, taken through glass, at the wrong moment.
 *
 * Someone's phone, held badly, in a hurry. Never a good photograph. A
 * well-composed monster photo is a monster poster.
 *
 * The degradation is not decoration — it is what hides the fact that the
 * subject was drawn with bezier curves ten milliseconds ago. Same
 * principle as the lighting: destroy the image and the brain fills it in.
 */

export function surface(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

/* ------------------------------------------------------------------ */
/* pixel operations                                                    */
/* ------------------------------------------------------------------ */

/** Wrong exposure. Phones meter for the streetlight, not the thing. */
export function exposure(c, stops) {
  const g = c.getContext('2d');
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const k = Math.pow(2, stops);
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = Math.min(255, d[i] * k);
    d[i + 1] = Math.min(255, d[i + 1] * k);
    d[i + 2] = Math.min(255, d[i + 2] * k);
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Bad colour. Auto white balance guessing wrong under sodium. */
export function cast(c, r, gg, b, amount = 0.3) {
  const g = c.getContext('2d');
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = d[i]     * (1 - amount) + d[i]     * r  * amount;
    d[i + 1] = d[i + 1] * (1 - amount) + d[i + 1] * gg * amount;
    d[i + 2] = d[i + 2] * (1 - amount) + d[i + 2] * b  * amount;
  }
  g.putImageData(img, 0, 0);
  return c;
}

export function noise(c, amount = 18, mono = false) {
  const g = c.getContext('2d');
  const img = g.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (mono) {
      const n = (Math.random() - 0.5) * amount;
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    } else {
      d[i]     += (Math.random() - 0.5) * amount;
      d[i + 1] += (Math.random() - 0.5) * amount * 0.8;
      d[i + 2] += (Math.random() - 0.5) * amount * 1.3;
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

/** Directional smear. The camera was moving and the shutter was slow. */
export function motionBlur(c, angleDeg = 8, px = 6, opacity = 0.5) {
  const g = c.getContext('2d');
  const tmp = surface(c.width, c.height);
  tmp.getContext('2d').drawImage(c, 0, 0);
  const a = (angleDeg * Math.PI) / 180;
  g.globalAlpha = opacity / px;
  for (let i = 1; i <= px; i++) {
    g.drawImage(tmp, Math.cos(a) * i, Math.sin(a) * i);
    g.drawImage(tmp, -Math.cos(a) * i, -Math.sin(a) * i);
  }
  g.globalAlpha = 1;
  return c;
}

/**
 * Resolution loss. Downsample hard, then blow it back up. This is what
 * actually sells "phone, at night, digitally zoomed".
 */
export function resample(c, factor = 0.25) {
  const w = Math.max(2, Math.floor(c.width * factor));
  const h = Math.max(2, Math.floor(c.height * factor));
  const small = surface(w, h);
  const sg = small.getContext('2d');
  sg.imageSmoothingEnabled = true;
  sg.drawImage(c, 0, 0, w, h);
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  g.imageSmoothingEnabled = true;
  g.drawImage(small, 0, 0, c.width, c.height);
  return c;
}

/** Chroma subsampling: colour resolves at half the detail luma does. */
export function chromaBleed(c, factor = 0.3) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  const full = g.getImageData(0, 0, w, h);
  const blurred = surface(w, h);
  const bg = blurred.getContext('2d');
  bg.drawImage(c, 0, 0);
  resample(blurred, factor);
  const soft = bg.getImageData(0, 0, w, h);

  const d = full.data, s = soft.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    const slum = 0.2126 * s[i] + 0.7152 * s[i + 1] + 0.0722 * s[i + 2];
    d[i]     = Math.max(0, Math.min(255, lum + (s[i]     - slum)));
    d[i + 1] = Math.max(0, Math.min(255, lum + (s[i + 1] - slum)));
    d[i + 2] = Math.max(0, Math.min(255, lum + (s[i + 2] - slum)));
  }
  g.putImageData(full, 0, 0);
  return c;
}

/** Taken through a window, with the room behind reflected in it. */
export function glass(c, strength = 0.16) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  g.save();
  g.globalCompositeOperation = 'lighter';

  // A rectangle of the room's own light, reflected back.
  const grad = g.createLinearGradient(0, 0, w * 0.7, h);
  grad.addColorStop(0, `rgba(190,200,215,${strength})`);
  grad.addColorStop(0.35, `rgba(150,160,175,${strength * 0.35})`);
  grad.addColorStop(0.7, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);

  // And the photographer's own hand, or a lamp, as a soft blob.
  const b = g.createRadialGradient(w * 0.78, h * 0.22, 0, w * 0.78, h * 0.22, w * 0.28);
  b.addColorStop(0, `rgba(220,225,235,${strength * 1.4})`);
  b.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = b;
  g.fillRect(0, 0, w, h);
  g.restore();
  return c;
}

export function vignette(c, amount = 0.55) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  const grad = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.25, w / 2, h / 2, Math.max(w, h) * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, `rgba(0,0,0,${amount})`);
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  return c;
}

/**
 * Real JPEG artefacts. toDataURL is synchronous, so encoding at a
 * genuinely bad quality gives genuine blocking and ringing — far better
 * than simulating it.
 */
export function jpeg(c, quality = 0.16) {
  return c.toDataURL('image/jpeg', quality);
}

/* ------------------------------------------------------------------ */
/* video tape (§5A.3)                                                   */
/* ------------------------------------------------------------------ */

/** Head-switching noise: a torn band at the very bottom of the frame. */
export function headSwitch(c, height = 0.045) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  const band = Math.floor(h * height);
  const y0 = h - band;
  const img = g.getImageData(0, y0, w, band);
  g.clearRect(0, y0, w, band);
  for (let y = 0; y < band; y++) {
    const shift = Math.floor((Math.random() - 0.5) * w * 0.35 * (1 - y / band));
    const row = g.createImageData(w, 1);
    for (let x = 0; x < w; x++) {
      const sx = (x + shift + w) % w;
      for (let k = 0; k < 4; k++) row.data[x * 4 + k] = img.data[(y * w + sx) * 4 + k];
    }
    g.putImageData(row, 0, y0 + y);
  }
  // The blown-out white noise strip right at the tear.
  g.fillStyle = 'rgba(228,228,232,0.55)';
  g.fillRect(0, h - Math.floor(band * 0.35), w, Math.floor(band * 0.35));
  noiseBand(g, w, h - Math.floor(band * 0.35), Math.floor(band * 0.35));
  return c;
}

function noiseBand(g, w, y, h) {
  const img = g.getImageData(0, y, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = Math.random() * 255;
    d[i] = d[i + 1] = d[i + 2] = n;
    d[i + 3] = 255;
  }
  g.putImageData(img, 0, y);
}

/** Tracking errors: horizontal displacement bands drifting vertically. */
export function tracking(c, count = 3, strength = 0.06, seed = 0) {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  for (let i = 0; i < count; i++) {
    const y = Math.floor(((i * 0.37 + seed * 0.11) % 1) * h);
    const band = Math.floor(h * (0.012 + Math.random() * 0.05));
    if (y + band > h) continue;
    const img = g.getImageData(0, y, w, band);
    const shift = Math.floor((Math.random() - 0.5) * w * strength * 2);
    g.clearRect(0, y, w, band);
    const out = g.createImageData(w, band);
    for (let yy = 0; yy < band; yy++) {
      for (let x = 0; x < w; x++) {
        const sx = (x + shift + w) % w;
        for (let k = 0; k < 4; k++) out.data[(yy * w + x) * 4 + k] = img.data[(yy * w + sx) * 4 + k];
      }
    }
    g.putImageData(out, 0, y);
  }
  return c;
}

/** Timecode and date burn-in, in the blocky camcorder font. */
export function burnIn(c, text, corner = 'br') {
  const g = c.getContext('2d');
  const w = c.width, h = c.height;
  const size = Math.max(9, Math.round(h * 0.045));
  g.font = `${size}px "Courier New", monospace`;
  g.textBaseline = 'bottom';
  const m = g.measureText(text);
  const x = corner.includes('r') ? w - m.width - size * 0.6 : size * 0.6;
  const y = corner.includes('b') ? h - size * 0.7 : size * 1.8;
  // Camcorder OSD is drawn with a hard black shadow, always.
  g.fillStyle = 'rgba(0,0,0,0.85)';
  g.fillText(text, x + 2, y + 2);
  g.fillStyle = 'rgba(236,236,224,0.92)';
  g.fillText(text, x, y);
  return c;
}

/** Auto-gain hunting: the image searching for an exposure it cannot find. */
export function autoGain(c, phase = 0) {
  const k = 1 + Math.sin(phase) * 0.22 + Math.sin(phase * 2.7) * 0.08;
  return exposure(c, Math.log2(Math.max(0.35, k)));
}

/** Generational loss. The later the log, the more copies deep it looks. */
export function generations(c, n = 1) {
  for (let i = 0; i < n; i++) {
    resample(c, 0.62);
    chromaBleed(c, 0.35);
    noise(c, 7, false);
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(12,14,18,0.05)';
    g.fillRect(0, 0, c.width, c.height);
  }
  return c;
}

/* ------------------------------------------------------------------ */
/* paper (§5A.4)                                                        */
/* ------------------------------------------------------------------ */

/**
 * Photocopy pass. Blows out the whites, crushes the greys into a lumpy
 * bitone, and leaves the speckle a drum scanner leaves.
 */
export function photocopy(c, gens = 1) {
  const g = c.getContext('2d');
  for (let n = 0; n < gens; n++) {
    const img = g.getImageData(0, 0, c.width, c.height);
    const d = img.data;
    const contrast = 1.35 + n * 0.25;
    for (let i = 0; i < d.length; i += 4) {
      for (let k = 0; k < 3; k++) {
        let v = d[i + k] / 255;
        v = (v - 0.5) * contrast + 0.5 + 0.04;
        if (Math.random() < 0.0022) v = Math.random() < 0.5 ? 0 : 1;   // speckle
        d[i + k] = Math.max(0, Math.min(255, v * 255));
      }
    }
    g.putImageData(img, 0, 0);
  }
  return c;
}

export default { surface, exposure, cast, noise, motionBlur, resample, chromaBleed,
  glass, vignette, jpeg, headSwitch, tracking, burnIn, autoGain, generations, photocopy };
