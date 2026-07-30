/**
 * photo.js — making procedural drawings read as photographs.
 *
 * PROMPT 4 §3 OVERRIDES PROMPT 2 HERE, AND THE OVERRIDE IS THE WHOLE POINT
 * OF THIS FILE NOW.
 *
 * The old rule was "destroy the image and the brain fills it in". That was
 * wrong, and it produced noise. Illegible is not ambiguous, and only one of
 * those is frightening.
 *
 *      THE PLAYER SHOULD BE ABLE TO SEE IT PERFECTLY
 *      AND STILL NOT UNDERSTAND IT.
 *
 * The horror is not "I couldn't make it out." The horror is "I saw every
 * detail and none of it explains anything." The best real cryptid photographs
 * are terrifying because they are clear. Detail high, meaning zero.
 *
 * So: the destruction pass is roughly a fifth of what it was.
 *
 *   GONE     heavy JPEG artefacting, chroma destruction, aggressive blur,
 *            noise overlays, resolution reduction — anything that makes the
 *            subject unreadable. The helpers still exist because tape and
 *            photocopies legitimately need them; they are not for subjects.
 *
 *   KEPT     at low intensity: slightly wrong exposure, a shallow or missed
 *            focus plane, motion blur ON EXTREMITIES ONLY (a limb smeared
 *            while the body stays sharp is far worse than a smeared whole),
 *            a flare off the streetlight, a faint reflection through glass.
 *
 *   KEPT     the framing problems — off-centre, cropped, half a second too
 *            late, the top of it outside the frame. The photographer was bad.
 *            The camera was fine. Framing is a decision; blur is not.
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
 * §3.2. Motion blur confined to a rectangle, so a hand smears while the body
 * stays sharp. This is the only motion blur that touches a subject now: a
 * whole-frame smear says "bad photograph", and an arm that moved during the
 * exposure while the ribs are pin-sharp says something much worse.
 */
export function limbBlur(c, x, y, w, h, angleDeg = 20, px = 9, opacity = 0.8) {
  const W = c.width, H = c.height;
  x = Math.max(0, Math.min(W - 2, Math.round(x)));
  y = Math.max(0, Math.min(H - 2, Math.round(y)));
  w = Math.max(2, Math.min(W - x, Math.round(w)));
  h = Math.max(2, Math.min(H - y, Math.round(h)));

  // Cut the region out, smear it on its own, and feather it back in so the
  // boundary is not a visible seam.
  const cut = surface(w, h);
  cut.getContext('2d').drawImage(c, x, y, w, h, 0, 0, w, h);
  motionBlur(cut, angleDeg, px, opacity);

  const g = c.getContext('2d');
  const mask = surface(w, h);
  const mg = mask.getContext('2d');
  mg.drawImage(cut, 0, 0);
  mg.globalCompositeOperation = 'destination-in';
  const grad = mg.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.62);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.68, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  mg.fillStyle = grad;
  mg.fillRect(0, 0, w, h);
  g.drawImage(mask, x, y);
  return c;
}

/**
 * §3.2. A focus plane. Everything outside a band of depth is soft; the band
 * itself is untouched. A missed focus plane is a real photographic failure and
 * it does not cost the subject any legibility, because the subject is what the
 * band is on — or, when `missBy` is set, very nearly is.
 */
export function focusPlane(c, { y0 = 0.3, y1 = 0.7, px = 3, missBy = 0 } = {}) {
  const H = c.height, W = c.width;
  const a = Math.max(0, Math.round((y0 + missBy) * H));
  const b = Math.min(H, Math.round((y1 + missBy) * H));

  const soft = surface(W, H);
  const sg = soft.getContext('2d');
  sg.filter = `blur(${px}px)`;
  sg.drawImage(c, 0, 0);
  sg.filter = 'none';

  // Cut the sharp band out of the soft copy, feathered top and bottom.
  const g2 = soft.getContext('2d');
  const keep = surface(W, H);
  const kg = keep.getContext('2d');
  kg.drawImage(c, 0, 0);
  kg.globalCompositeOperation = 'destination-in';
  const grad = kg.createLinearGradient(0, a - H * 0.10, 0, b + H * 0.10);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.22, 'rgba(0,0,0,1)');
  grad.addColorStop(0.78, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  kg.fillStyle = grad;
  kg.fillRect(0, 0, W, H);
  g2.drawImage(keep, 0, 0);

  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  g.drawImage(soft, 0, 0);
  return c;
}

/**
 * §3.2. A flare off a bright source in frame — the streetlight, a headlight.
 * Streaks and two ghosts, drawn additively. It is the one thing in these
 * photographs that says "a lens was here" without costing any detail.
 */
export function lensFlare(c, x, y, r, tint = [255, 214, 150]) {
  const g = c.getContext('2d');
  const [R, G, B] = tint;
  g.save();
  g.globalCompositeOperation = 'lighter';

  // The bloom around the source.
  const halo = g.createRadialGradient(x, y, 0, x, y, r);
  halo.addColorStop(0, `rgba(${R},${G},${B},0.55)`);
  halo.addColorStop(0.3, `rgba(${R},${G},${B},0.16)`);
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = halo;
  g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();

  // Anamorphic streak: horizontal, and much longer than it is tall.
  const streak = g.createLinearGradient(x - r * 2.6, y, x + r * 2.6, y);
  streak.addColorStop(0, 'rgba(0,0,0,0)');
  streak.addColorStop(0.5, `rgba(${R},${G},${B},0.30)`);
  streak.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = streak;
  g.fillRect(x - r * 2.6, y - r * 0.055, r * 5.2, r * 0.11);

  // Two ghosts on the axis through the frame centre.
  const cx = c.width / 2, cy = c.height / 2;
  for (const [t, rr, a] of [[1.45, 0.30, 0.13], [1.95, 0.17, 0.09]]) {
    const gx = cx + (x - cx) * -t, gy = cy + (y - cy) * -t;
    const gh = g.createRadialGradient(gx, gy, 0, gx, gy, r * rr);
    gh.addColorStop(0, `rgba(${R},${G},${B},${a})`);
    gh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gh;
    g.beginPath(); g.arc(gx, gy, r * rr, 0, 7); g.fill();
  }
  g.restore();
  return c;
}

/**
 * §3.4. Unsharp mask. Used on exactly one subject in the game — the thing in
 * the headlights — because a car's beam is aimed at it, the shutter was short,
 * and there is no photographic reason for that image to be soft.
 */
export function sharpen(c, amount = 0.6) {
  const g = c.getContext('2d');
  const W = c.width, H = c.height;
  const src = g.getImageData(0, 0, W, H);
  const d = src.data;
  const out = g.createImageData(W, H);
  const o = out.data;
  const at = (x, y, k) =>
    d[((Math.min(H - 1, Math.max(0, y)) * W) + Math.min(W - 1, Math.max(0, x))) * 4 + k];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      for (let k = 0; k < 3; k++) {
        const c0 = at(x, y, k);
        const blur = (at(x - 1, y, k) + at(x + 1, y, k) + at(x, y - 1, k) + at(x, y + 1, k)) / 4;
        o[i + k] = Math.max(0, Math.min(255, c0 + (c0 - blur) * amount));
      }
      o[i + 3] = d[i + 3];
    }
  }
  g.putImageData(out, 0, 0);
  return c;
}

/**
 * Resolution loss. Downsample hard, then blow it back up.
 *
 * §3.2: DO NOT USE THIS ON A SUBJECT. It is what made the entities
 * illegible. It is still here for tape, photocopies and CRT captures, where
 * the resolution genuinely was not there.
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
  glass, vignette, jpeg, headSwitch, tracking, burnIn, autoGain, generations, photocopy,
  // §3.2 — the ones a subject is allowed to be touched by.
  limbBlur, focusPlane, lensFlare, sharpen };
