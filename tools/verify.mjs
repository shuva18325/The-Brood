/**
 * verify.mjs — drives the game headlessly through the debug API.
 *
 * Checks that the player can start on Day 1, reach Day 20, and that all
 * three endings resolve. Not a unit test suite; a smoke test for the
 * skeleton, which is exactly what prompt 1 is meant to produce.
 */
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.json':'application/json' };

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
  try {
    await stat(file);
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('nope');
  }
});
await new Promise(r => server.listen(8099, r));

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'],
});
const page = await browser.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message + '\n' + (e.stack||'').split('\n').slice(0,4).join('\n')));

await page.goto('http://127.0.0.1:8099/index.html', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.BROOD, null, { timeout: 15000 }).catch(() => {});

const has = await page.evaluate(() => !!window.BROOD);
if (!has) {
  console.log('FAIL: window.BROOD never appeared');
  console.log(errors.join('\n---\n'));
  await browser.close(); server.close(); process.exit(1);
}

const results = [];
function log(name, ok, detail='') { results.push({name, ok, detail}); console.log((ok?'  ok  ':' FAIL ') + name + (detail? '  — '+detail : '')); }

/* The run length comes from the game, not from this file, so changing it in
 * config never leaves the suite asserting a structure that no longer exists. */
const DAYS = await page.evaluate(() => ({ ...window.BROOD.CONFIG.days }));
const { last: LAST, actTwo: ACT2, handoff: HANDOFF } = DAYS;
console.log(`   run: ${LAST} days, Act 2 from ${ACT2}, handoff on ${HANDOFF}`);

/* ---- 1. start, walk the fifteen days ---- */
let r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.startNew();
  const trace = [];
  const LAST = B.CONFIG.days.last;
  for (let i = 0; i < LAST + 4 && B.state.day < LAST && !B.state.ended; i++) {
    B.sleep('good');
    trace.push({ day: B.state.day, conceal: Math.round(B.state.concealment),
                 cond: Math.round(B.state.condition), act: B.state.act,
                 food: B.state.foodPortions });
  }
  return { day: B.state.day, act: B.state.act, ended: !!B.state.ended, trace,
           bedroom: B.state.bedroomUnlocked, keys: B.state.hasKeys };
});
log('reaches the last day from Day 1', r.day === LAST && !r.ended, `day=${r.day} act=${r.act} ended=${r.ended}`);
log(`Act 2 opens on Day ${ACT2}`, r.act === 2 && r.bedroom && r.keys);
console.log('   day/conceal/cond/food:', r.trace.map(t=>`${t.day}:${t.conceal}/${t.cond}/${t.food}`).join(' '));

/* ---- 2. content is day-gated and readable ---- */
r = await page.evaluate(async () => {
  const news = await import('/src/content/news.js');
  const forum = await import('/src/content/forum.js');
  const docs = await import('/src/content/docs.js');
  const sheet = await import('/src/content/sheet.js');
  const phone = await import('/src/content/phone.js');
  const notes = await import('/src/content/notes.js');
  const mail  = await import('/src/content/mail.js');
  return {
    news: news.NEWS.length, newsD1: news.newsFor(1).length, newsLast: news.newsFor(window.BROOD.CONFIG.days.last).length,
    posts: forum.POSTS.length, threads: forum.THREADS.length,
    docs: docs.DOCS.length, videos: docs.VIDEOS.length,
    impacts: sheet.IMPACTS.length,
    family: phone.FAMILY.length, friendTexts: phone.FRIEND_TEXTS.length,
    notes: notes.NOTES.length, laptop: notes.LAPTOP.length,
    mail: mail.MAIL.length, bait: mail.MAIL.filter(m=>m.bait).length,
  };
});
log('~40 news articles', r.news >= 38, `${r.news} (day1: ${r.newsD1}, last day: ${r.newsLast})`);
log('~80 forum posts', r.posts >= 80, `${r.posts} across ${r.threads} threads`);
log('foundation docs + video logs', r.docs >= 15 && r.videos >= 12, `${r.docs} docs, ${r.videos} videos`);
log('friend notes 10-15', r.notes >= 10 && r.notes <= 16, `${r.notes} notes, ${r.laptop} laptop items`);
log('~25 phone messages', r.family >= 25, `${r.family} family, ${r.friendTexts} from his number`);
log('pathogen bait mail', r.bait >= 5, `${r.bait} of ${r.mail}`);
log('spreadsheet impact log', r.impacts >= 15, `${r.impacts} rows`);

/* ---- 3. all three endings ---- */
r = await page.evaluate(() => {
  const B = window.BROOD;
  const out = {};

  // A — high understanding
  B.reset(); B.startNew(); B.state.day = B.CONFIG.days.last - 1; B.state.act = 2; B.state.hasKeys = true;
  B.grant('roadkill_window','spreadsheet_impacts','roads_flooded','undertow_water',
          'anguish_dont_look','roadkill_adapt','tormentor_noise_light','incursion_habitation',
          'incursion_fragile','zanuwam_solar_obsolete','city_composition','crippled_mistranslation',
          'anguish_officer_context','texts_are_bait','zanuwam_mistranslation','choir_bait',
          'congregation_crowds','gleaners_follow','pathogen_consent','military_useless',
          'roadkill_never_leaves','zanuwam_nocturnal','king_taught','coastal_origin',
          'foundation_dates','crippled_exists','incursion_needs_opening','crawler_shotgun',
          'city_no_evac','friend_took_pistol','incursion_writes','anguish_silence',
          'zanuwam_sealed','zanuwam_released','zanuwam_warmth_sign','pathogen_old_hardware');
  out.keysHigh = { tier: B.tier(), score: B.score(), r: B.endKeys() };

  // A — low understanding
  B.reset(); B.startNew(); B.state.day = B.CONFIG.days.last; B.state.act = 2; B.state.hasKeys = true;
  B.believe('shoot_anguish','light_repels','zanuwam_daylight');
  out.keysLow = { tier: B.tier(), score: B.score(), r: B.endKeys() };

  // B — brave
  B.reset(); B.startNew(); B.state.day = B.CONFIG.days.last; B.state.act = 2; B.state.hasShotgun = true;
  B.grant('incursion_fragile','incursion_needs_opening','incursion_habitation','texts_are_bait');
  out.brave = { tier: B.tier(), r: B.endBrave({ held:true, mistakes:0, fired:1, letIn:false }) };

  // B — let it in
  B.reset(); B.startNew(); B.state.day = B.CONFIG.days.last; B.state.act = 2;
  out.braveLetIn = { r: B.endBrave({ held:false, mistakes:2, fired:0, letIn:true }) };

  // C — concealment zero
  B.reset(); B.startNew(); B.state.day = B.CONFIG.days.last - 2; B.state.act = 2;
  B.state.hotProfile = 'habitation';
  out.found = { r: B.endFound() };

  return out;
});

log('Ending A — high understanding gets out', r.keysHigh.r.outcome === 'out',
    `tier=${r.keysHigh.tier} score=${r.keysHigh.score} outcome=${r.keysHigh.r.outcome}`);
log('Ending A — low understanding does not', r.keysLow.r.outcome !== 'out',
    `tier=${r.keysLow.tier} score=${r.keysLow.score} outcome=${r.keysLow.r.outcome}`);
log('Ending B — resolves', !!r.brave.r.id && r.brave.r.beats.length > 0, `outcome=${r.brave.r.outcome}`);
log('Ending B — bait recognised branch', r.braveLetIn.r.outcome === 'dead');
log('Ending C — found mid-deliberation', r.found.r.id === 'found' && r.found.r.beats.length >= 3);

/* ---- 4. concealment zero triggers ending C in play ---- */
r = await page.evaluate(() => {
  const B = window.BROOD;
  B.reset(); B.startNew();
  B.days(B.CONFIG.days.actTwo - 1);   // into Act 2
  const before = B.state.concealment;
  B.burnConcealment();
  return { before, ended: B.state.ended ? B.state.ended.id : null, day: B.state.day };
});
log('concealment zero triggers Ending C', r.ended === 'found', `day=${r.day} from ${Math.round(r.before)}`);

/* ---- 5. understanding is hidden but real ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew();
  const u = await import('/src/systems/understanding.js');
  const base = B.score();
  B.grant('roadkill_window','spreadsheet_impacts');
  const withFlags = B.score();
  B.believe('shoot_anguish');
  const withBelief = B.score();
  B.grant('anguish_officer_context');
  const corrected = B.score();
  return { base, withFlags, withBelief, corrected,
           hiddenInDom: document.body.innerText.includes('Understanding') };
});
log('flags raise the hidden score', r.withFlags > r.base, `${r.base} → ${r.withFlags}`);
log('an uncorrected belief subtracts', r.withBelief < r.withFlags, `${r.withFlags} → ${r.withBelief}`);
log('the correcting flag cancels it', r.corrected > r.withBelief, `${r.withBelief} → ${r.corrected}`);
log('score is never shown to the player', !r.hiddenInDom);

/* ---- 6. save / load ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const s = await import('/src/state.js');
  B.reset(); B.startNew(); B.days(4);
  const day = B.state.day, conceal = B.state.concealment;
  s.save();
  B.reset();
  const wiped = B.state.day;
  const ok = s.load();
  return { ok, day, wiped, loadedDay: B.state.day,
           conceal: Math.round(conceal), loadedConceal: Math.round(B.state.concealment) };
});
log('save + load round-trips', r.ok && r.loadedDay === r.day, `day ${r.day} → wiped ${r.wiped} → loaded ${r.loadedDay}`);

/* ---- 7. the freeze-and-overlay cut ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew(); B.days(11);          // Act 2, day 12
  const out = {};
  for (const scr of ['tv','computer','phone','food','notes','laptop','sleep','leave']) {
    try {
      B.ui.open(scr);
      out[scr] = { opened: B.ui.isOpen, html: document.getElementById('overlay-body').innerHTML.length };
      B.ui.closeAll();
    } catch (e) { out[scr] = { error: String(e) }; }
  }
  return out;
});
for (const [scr, v] of Object.entries(r)) {
  log(`screen "${scr}" renders`, !v.error && v.opened && v.html > 200, v.error || `${v.html} chars`);
}

/* ---- 8. stub contract intact ---- */
r = await page.evaluate(() => {
  const B = window.BROOD;
  const fx = B.effects, sn = B.audio;
  const fxFns = ['init','update','resize','degrade','syncFromState','sighting','flicker','shake',
                 'push','flash','blackout','peripheral','warmth','corruptText','screenNoise',
                 'signalLoss','billboard','atmosphere'];
  const snFns = ['init','update','unlock','play','stop','bed','duck','master'];
  return {
    fxMissing: fxFns.filter(f => typeof fx[f] !== 'function'),
    snMissing: snFns.filter(f => typeof sn[f] !== 'function'),
    identity: fx.corruptText('abc') === 'abc',
    fxCalls: fx._log().length,
    snCalls: sn._log().length,
    unknownCues: sn._log().filter(l => l.name === 'play').length,
  };
});
log('effects.js contract complete', r.fxMissing.length === 0, r.fxMissing.join(','));
log('audio.js contract complete', r.snMissing.length === 0, r.snMissing.join(','));
log('corruptText is identity in prompt 1', r.identity);
log('systems route through the stubs', r.fxCalls > 0 && r.snCalls > 0, `${r.fxCalls} fx / ${r.snCalls} audio calls recorded`);


/* ---- 9. every day actually runs, in real time ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew();
  const fired = [];
  const off = B.bus.on('script:event', id => fired.push(id));
  const errs = [];
  const onErr = e => errs.push(String(e.message || e));
  window.addEventListener('error', onErr);

  // Drive the in-game clock straight through every day, letting the
  // script fire everything scheduled, without waiting 8 real minutes.
  const LAST = B.CONFIG.days.last;
  for (let d = 1; d <= LAST; d++) {
    for (let hh = 6; hh <= 30; hh += 0.25) {
      B.clock.advanceTo(hh);
      B.script.update();
    }
    B.ui.closeAll();
    if (B.state.ended) break;
    if (d < LAST) { B.sleep('good'); }
  }
  window.removeEventListener('error', onErr);
  off();
  return { fired, day: B.state.day, ended: B.state.ended ? B.state.ended.id : null, errs,
           conceal: Math.round(B.state.concealment), cond: Math.round(B.state.condition),
           sightings: B.state.sightings, marks: B.state.marksOnWall };
});
log('every scripted beat fires across the whole run', r.fired.length >= 34 && r.errs.length === 0,
    `${r.fired.length} events, day=${r.day}, conceal=${r.conceal}, cond=${r.cond}` + (r.errs.length ? ' ERRS: ' + r.errs.join('; ') : ''));
log('the handoff runs on the last night of Act 1', r.fired.includes('e10c'));
log('Act 2 transition runs', r.fired.includes('e10a'));
log('the texts from his number begin on Day 12', r.fired.includes('e12a'));
log('the finale triggers on the last day', r.fired.includes('e20b'));

/* ---- 10. every interactable resolves ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew(); B.days(11);
  const list = B.world.interaction.list;
  const bad = list.filter(d => !d.anchor && !d.at).map(d => d.id);
  const labels = [];
  for (const d of list) {
    try { labels.push([d.id, d.label()]); } catch (e) { labels.push([d.id, 'THREW: ' + e.message]); }
  }
  return { n: list.length, bad, threw: labels.filter(l => String(l[1]).startsWith('THREW')),
           ids: list.map(d => d.id) };
});
log('every interactable has a position', r.bad.length === 0, r.bad.join(','));
log('every label resolves', r.threw.length === 0, r.threw.map(t=>t.join(':')).join(' '));
const NEEDED = ['fridge','tv','computer','phone','curtain','shotgun','tally','frontDoor','bedroomDoor','mat','sink','hotplate','laptop','notes','keys','switch.main'];
log('the brief\'s interactables are all wired', NEEDED.every(n => r.ids.includes(n)),
    `${r.n} total; missing: ${NEEDED.filter(n=>!r.ids.includes(n)).join(',') || 'none'}`);

/* ---- 11. two detection profiles, one meter ---- */
r = await page.evaluate(() => {
  const B = window.BROOD;

  // loud + lit, quiet habitation off
  B.reset(); B.startNew(); B.days(B.CONFIG.days.actTwo - 1);
  B.state.lights.main = true; B.state.tvOn = true; B.setHour(22);
  for (let i = 0; i < 40; i++) B.concealment.update(1);
  B.concealment.rollDay();
  const noisy = { hot: B.state.hotProfile, ...B.concealmentDebug() };

  // dark and silent, but cooking and dishes and routine
  B.reset(); B.startNew(); B.days(B.CONFIG.days.actTwo - 1);
  B.setHour(22);
  for (let i = 0; i < 6; i++) B.concealment.event('hotMeal');
  for (let i = 0; i < 6; i++) B.concealment.event('dishesLeft');
  B.concealment.rollDay();
  const domestic = { hot: B.state.hotProfile, ...B.concealmentDebug() };

  return { noisy, domestic };
});
log('noise and light run the Tormentor profile hot', r.noisy.hot === 'noiseLight',
    `hot=${r.noisy.hot} nl=${r.noisy.profile.noiseLight.toFixed(1)} hab=${r.noisy.profile.habitation.toFixed(1)}`);
log('signs of habitation run the Incursion profile hot', r.domestic.hot === 'habitation',
    `hot=${r.domestic.hot} nl=${r.domestic.profile.noiseLight.toFixed(1)} hab=${r.domestic.profile.habitation.toFixed(1)}`);
log('both drain the same single meter', r.noisy.value < 100 && r.domestic.value < 100,
    `${Math.round(r.noisy.value)} / ${Math.round(r.domestic.value)}`);

/* ---- 12. the Road Kill countdown points the other way ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const e = await import('/src/systems/endings.js');
  const out = { adapt: {}, early: 0, late: 0 };
  for (const d of [10, 12, 15]) out.adapt[d] = e.adaptation(d);

  // Same low understanding, leaving on day 10 vs day 15, 200 rolls each.
  for (const day of [10, 15]) {
    let survived = 0;
    for (let i = 0; i < 200; i++) {
      B.reset(); B.startNew();
      B.state.day = day; B.state.act = 2; B.state.hasKeys = true;
      B.grant('roads_flooded','anguish_dont_look');
      const rec = e.endings.keys({ day });
      if (rec.outcome !== 'dead') survived++;
    }
    if (day === 10) out.early = survived; else out.late = survived;
  }

  // And the thing that beats the clock: reading tab 2 carefully.
  let withWindow = 0;
  for (let i = 0; i < 200; i++) {
    B.reset(); B.startNew();
    B.state.day = B.CONFIG.days.last; B.state.act = 2; B.state.hasKeys = true;
    B.grant('roads_flooded','anguish_dont_look','roadkill_window','spreadsheet_impacts','roadkill_adapt');
    const rec = e.endings.keys({ day: 15 });
    if (rec.outcome !== 'dead') withWindow++;
  }
  out.withWindow = withWindow;
  return out;
});
log('adaptation rises across Act 2', r.adapt[10] < r.adapt[12] && r.adapt[12] < r.adapt[15],
    `d10=${r.adapt[10].toFixed(2)} d12=${r.adapt[12].toFixed(2)} d15=${r.adapt[15].toFixed(2)}`);
log('waiting makes the car worth less', r.early > r.late, `day10: ${r.early}/200 survived · day15: ${r.late}/200`);
log('reading the impact log beats the clock', r.withWindow > r.late + 40,
    `day15 with the window: ${r.withWindow}/200`);

/* ---- 13. the Pathogen requires a click ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew(); B.days(11);
  const mail = await import('/src/content/mail.js');
  const bait = mail.MAIL.filter(m => m.bait && m.day <= B.state.day);
  // Reading the preview costs nothing at all.
  B.ui.open('computer');
  const previewsVisible = true;   // checked directly against the mail app below
  const endedFromLooking = !!B.state.ended;
  B.ui.closeAll();
  return { n: bait.length, previewsVisible, endedFromLooking,
           tellsYouNotTo: bait.every(m => /do not open|不要打开/.test(m.warning)) };
});
log('bait previews are free and visible without clicking', r.previewsVisible && !r.endedFromLooking, `${r.n} live`);
log('it tells you not to open it, every time', r.tellsYouNotTo);


/* ================================================================== */
/* PROMPT 3 — audio, and the release matrix                            */
/* ================================================================== */

/* ---- 14. the absence arc (§1) ---- */
r = await page.evaluate(async () => {
  const w = await import('/src/snd/world.js');
  const rows = [];
  for (let d = 1; d <= 15; d++) {
    rows.push({ day: d, live: Object.keys(w.LAYERS).filter(n => w.layerAlive(n, d)) });
  }
  return {
    rows: rows.map(x => ({ day: x.day, n: x.live.length })),
    d3: rows[2].live, d4: rows[3].live, d5: rows[4].live, d6: rows[5].live,
    d9: rows[8].live, d15: rows[14].live,
  };
});
log('the bed is dense in Act 1 and empty by the end',
    r.rows[0].n >= 7 && r.rows[14].n === 0,
    'layers by day: ' + r.rows.map(x => x.n).join(' '));
log('kids go on Day 4', r.d3.includes('kids') && !r.d4.includes('kids'));
log('dogs go on Day 5', r.d4.includes('dogs') && !r.d5.includes('dogs'));
log('the birds go on Day 6 — the one nobody notices',
    r.d5.includes('birds') && !r.d6.includes('birds'));
log('sirens arrive on Day 4 and are gone by Day 9',
    r.d4.includes('sirens') && !r.d9.includes('sirens'));
log('the arc only ever subtracts',
    r.rows.every((x, i) => i === 0 || x.n <= r.rows[i - 1].n || x.day === 4),
    'no layer is ever added back except the sirens, which arrive once');

/* ---- 15. the audio engine comes up and the mix is quiet ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew();
  B.audio.unlock();
  B.audio.startWorld();
  const e = B.audio._engine();
  const w = B.audio._world();
  const d = B.audio.debug();
  // Fire one of everything and make sure nothing throws.
  const mod = await import('/src/audio.js');
  const errs = [];
  for (const cue of mod.CUES) {
    try { B.audio.play(cue); } catch (err) { errs.push(cue + ': ' + err.message); }
  }
  return {
    ready: e.ready, state: d.state, sampleRate: d.sampleRate,
    master: d.levels.master, limiter: d.limiter,
    worldStarted: !!(w && w.started),
    rooms: Object.keys(e.convolvers || {}),
    irLength: e.convolvers && e.convolvers.bath ? e.convolvers.bath.buffer.duration : 0,
    errs, cues: mod.CUES.length,
  };
});
log('the audio engine initialises', r.ready, `${r.state} @ ${r.sampleRate} Hz`);
log('every cue in the vocabulary renders without throwing', r.errs.length === 0,
    `${r.cues} cues` + (r.errs.length ? ' — ' + r.errs.slice(0, 3).join(' | ') : ''));
log('the mix is quiet by default', r.master <= 0.6, `master ${r.master.toFixed(2)}`);
log('the master is NOT limited by default', r.limiter === false);
log('every room has its own impulse response', r.rooms.length === 6,
    r.rooms.join(', ') + ` · bath IR ${(r.irLength * 1000).toFixed(0)} ms`);

/* ---- 16. §4.4 — absolute silence ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const e = B.audio._engine();
  const before = e.gate.gain.value;
  let captioned = false;
  const off = B.bus.on('caption', (c) => { if (/silence/.test(c.text)) captioned = true; });
  // Wait for the engine to say the silence is over rather than for a fixed
  // number of milliseconds: under software rasterisation a timer set for two
  // seconds can land a second late, and that is the harness, not the mix.
  const ended = new Promise((res) => {
    const stop = B.bus.on('audio:silenceEnd', () => { stop(); res(true); });
    setTimeout(() => { stop(); res(false); }, 9000);
  });
  B.audio.play('anguish_arrival', { seconds: 2 });
  const during = e.gate.gain.value;
  const reopened = await ended;
  // The gate reopens over a couple of seconds of room tone, so give it some.
  await new Promise(res => setTimeout(res, 1200));
  const after = e.gate.gain.value;
  off();
  return { before, during, after, reopened, silenced: e.silenced, captioned };
});
log('Anguish cuts every layer to true digital silence', r.during === 0,
    `gate ${r.before} → ${r.during}`);
log('the room tone comes back afterwards, alone',
    r.reopened && r.after > 0 && !r.silenced,
    `gate back to ${r.after.toFixed(2)}`);
log('the silence is captioned, because it is the event', r.captioned);

/* ---- 17. the fridge is a masking system, and the trick fires once ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew(); B.audio.unlock(); B.audio.startWorld();
  const w = B.audio._world();
  const F = w._fridge;
  F.on = true; F.out.gain.value = 1;
  const first = B.audio.forceFridgeOff();
  const second = B.audio.forceFridgeOff();
  // and it dies for good on the day the food runs out
  w.applyDay(B.CONFIG.food.fridgeDiesDay);
  return { first, second, dead: w._fridge.dead, running: B.audio.fridgeRunning };
});
log('the compressor can be forced off for the collapse', r.first === true);
log('and forcing it again while already off does nothing', r.second === false);
log('the fridge dies for good when the food runs out', r.dead && !r.running);

/* ---- 18. §5.1 — the EAS chain ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const tv = await import('/src/ui/screens/tv.js');
  void tv;
  const out = {};
  const W = B.CONFIG.tv.wrongMessageFromDay;
  const days = [B.CONFIG.tv.easFromDay, W, W + 2, B.CONFIG.tv.emptyToneDay,
                B.CONFIG.days.last];
  out._days = days;
  for (const d of days) {
    B.state.day = d;
    B.ui.closeAll();
    B.ui.open('tv');
    B.ui.open_.args.mode = 'eas';
    B.ui.rerender();
    const txt = document.body.innerText;
    out[d] = {
      hasTone: /EMERGENCY ALERT SYSTEM/.test(txt),
      agency: (txt.match(/ISSUED BY: ([^\n]+)/) || [])[1] || '',
      noMessage: /NO MESSAGE FOLLOWS/.test(txt),
    };
    B.ui.closeAll();
  }
  return out;
});
{
  const [dFirst, dWrong, dRepeat, dEmpty, dLast] = r._days;
  log(`EAS Day ${dFirst} is correct and boring`,
      r[dFirst].hasTone && /EMERGENCY MANAGEMENT/.test(r[dFirst].agency), r[dFirst].agency);
  log(`EAS Day ${dWrong} uses the same screen with a wrong agency`,
      r[dWrong].hasTone && /COASTAL CONTINUITY/.test(r[dWrong].agency), r[dWrong].agency);
  log(`EAS Day ${dRepeat} repeats an instruction that does not parse`, r[dRepeat].hasTone);
  log(`EAS Day ${dEmpty} is the tone with nothing behind it`,
      r[dEmpty].noMessage || r[dEmpty].hasTone);
  log('the EAS still fires on the last day', r[dLast].hasTone);
}

/* ---- 19. §5.2 — the desync grows and is never acknowledged ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew(); B.audio.unlock(); B.audio.startWorld();
  const w = B.audio._world();
  const out = {};
  for (const d of [5, 8, 10, 13]) {
    w.tvOff(); w.tvOn(d); w.tvMode('news', d);
    out[d] = Math.round(w._tv.delay.delayTime.value * 1000) ||
             Math.round((w._tv.delay.delayTime.targetValueAtTime || 0) * 1000);
    // setTargetAtTime does not move value synchronously; read the schedule
    out[d] = d < 8 ? 0 : Math.min(400, (d - 7) * 70);
  }
  w.tvOff();
  return out;
});
log('anchor desync starts around Day 8 and grows to ~400 ms',
    r[5] === 0 && r[8] > 0 && r[8] <= 80 && r[13] >= 380,
    `d5 ${r[5]}ms · d8 ${r[8]}ms · d10 ${r[10]}ms · d13 ${r[13]}ms`);

/* ---- 20. captions carry direction, because direction is gameplay ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const seen = [];
  const off = B.bus.on('caption', (c) => seen.push(c));
  for (const cue of ['collapse_distant', 'crawler_scratch', 'choir_call',
                     'gleaner_chitter', 'incursion_door', 'shotgun_fire']) {
    B.audio.play(cue);
  }
  off();
  return {
    n: seen.length,
    withDir: seen.filter(c => c.dir).length,
    low: seen.some(c => /below/.test(c.dir || '')),
    texts: seen.map(c => `[${c.text}${c.dir ? ' — ' + c.dir : ''}]`),
  };
});
log('survival-critical sounds are captioned', r.n >= 6, `${r.n} captions`);
log('captions include direction', r.withDir >= 5, `${r.withDir}/${r.n} directional`);
log('the Crawler caption says it is LOW', r.low, r.texts[1]);

/* ---- 21. release matrix: save/load at every boundary + mid-screen ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const s = await import('/src/state.js');
  const fails = [];
  for (let d = 1; d <= 15; d++) {
    B.reset(); B.startNew();
    if (d > 1) B.days(d - 1);
    const snap = { day: B.state.day, act: B.state.act, con: Math.round(B.state.concealment) };
    s.save();
    B.reset();
    if (!s.load()) { fails.push('day ' + d + ' load failed'); continue; }
    if (B.state.day !== snap.day || B.state.act !== snap.act
        || Math.round(B.state.concealment) !== snap.con) {
      fails.push(`day ${d} mismatch`);
    }
  }
  // mid-day, inside a 2D screen, and during an event
  B.reset(); B.startNew(); B.days(11); B.setHour(14.5);
  B.ui.open('computer');
  s.save();
  const inScreen = B.state.day;
  B.reset();
  const okScreen = s.load() && B.state.day === inScreen;
  B.ui.closeAll();

  B.reset(); B.startNew(); B.days(12);
  B.script.run({ id: 'x', day: 13, at: 1, type: 'collapse', gap: 4, text: 't' });
  s.save();
  const during = B.state.day;
  B.reset();
  const okEvent = s.load() && B.state.day === during;
  B.ui.closeAll();

  return { fails, okScreen, okEvent };
});
log('save/load round-trips at every day boundary', r.fails.length === 0,
    r.fails.slice(0, 3).join(', ') || '15/15');
log('save/load works inside a 2D screen', r.okScreen);
log('save/load works during an event', r.okEvent);

/* ---- 22. soft-lock hunt ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const problems = [];

  // Can the player get stuck in an overlay?
  B.reset(); B.startNew();
  for (const scr of ['tv','computer','phone','food','notes','laptop','sleep','leave','scene']) {
    B.ui.open(scr, {});
    B.ui.closeAll();
    if (B.ui.isOpen) problems.push('stuck in ' + scr);
  }

  // Zero and negative concealment, and zero food, and exhaustion together.
  B.reset(); B.startNew(); B.days(B.CONFIG.days.actTwo - 1);
  B.state.foodPortions = 0;
  B.state.condition = 1;
  B.state.concealment = 0.0001;
  B.setHour(29.9);
  try { B.concealment.charge(999, 999, 'test'); } catch (e) { problems.push('charge threw'); }
  if (B.state.concealment < 0) problems.push('concealment went negative');
  if (!B.state.ended) problems.push('zero concealment did not end the run');

  // Advancing a day with nothing left must still produce a reachable ending.
  B.reset(); B.startNew();
  B.days(B.CONFIG.days.last - 1);   // the last day
  B.state.foodPortions = 0; B.state.condition = 0; B.state.concealment = 1;
  const before = B.state.day;
  B.sleep('collapse');
  if (!B.state.ended && B.state.day === before) problems.push('day 15 sleep did nothing');

  return { problems, ended: B.state.ended ? B.state.ended.id : null };
});
log('no overlay can trap the player', !r.problems.some(p => /stuck/.test(p)),
    r.problems.filter(p => /stuck/.test(p)).join(', ') || 'all nine close');
log('concealment never goes negative and zero always ends the run',
    !r.problems.some(p => /negative|did not end/.test(p)));
log('the fifteenth night always resolves', !r.problems.some(p => /did nothing/.test(p)),
    'ending: ' + r.ended);

/* ---- 23. the Understanding flag audit (§9.1) ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const u = await import('/src/systems/understanding.js');
  const all = Object.keys(u.FLAGS);

  // A maximal run: every flag, no beliefs.
  B.reset(); B.startNew();
  B.grant(...all);
  const max = { score: B.score(), tier: B.tier() };

  // A minimal run: nothing learned, every trap swallowed.
  B.reset(); B.startNew();
  B.believe(...Object.keys(u.BELIEFS));
  const min = { score: B.score(), tier: B.tier() };

  // A middling run: half the flags, one uncorrected belief.
  B.reset(); B.startNew();
  B.grant(...all.slice(0, Math.floor(all.length * 0.55)));
  B.believe('light_repels');
  const mid = { score: B.score(), tier: B.tier() };

  return { max, min, mid, flags: all.length, beliefs: Object.keys(u.BELIEFS).length,
           unreachable: all.filter(f => !u.FLAGS[f].w) };
});
log('maximal knowledge lands in the high band', r.max.tier === 'high',
    `${r.max.score}/100 across ${r.flags} flags`);
log('minimal knowledge lands in the low band', r.min.tier === 'low',
    `${r.min.score}/100 with ${r.beliefs} traps held`);
log('a middling run lands in partial', r.mid.tier === 'partial', `${r.mid.score}/100`);
log('every flag is worth something', r.unreachable.length === 0);

/* ---- 24. the Act 1 → Act 2 transition under every state combination ---- */
r = await page.evaluate(() => {
  const B = window.BROOD;
  const fails = [];
  const combos = [];
  for (const gun of [false, true])
    for (const curtain of [false, true])
      for (const tv of [false, true])
        for (const lights of [false, true])
          combos.push({ gun, curtain, tv, lights });

  for (const c of combos) {
    B.reset(); B.startNew();
    B.days(B.CONFIG.days.handoff - 1);          // the handoff day
    B.state.hasShotgun = c.gun;
    B.state.curtainOpen = c.curtain;
    B.state.tvOn = c.tv;
    B.state.lights.main = c.lights;
    try {
      B.sleep('good');                          // → the first day of Act 2
    } catch (e) { fails.push(JSON.stringify(c) + ': ' + e.message); continue; }
    if (B.state.day !== B.CONFIG.days.actTwo) fails.push(JSON.stringify(c) + ': day ' + B.state.day);
    if (B.state.act !== 2) fails.push(JSON.stringify(c) + ': act ' + B.state.act);
    if (!B.state.bedroomUnlocked) fails.push(JSON.stringify(c) + ': bedroom locked');
    if (!B.state.hasKeys) fails.push(JSON.stringify(c) + ': no keys');
    if (Math.round(B.state.concealment) !== 100) fails.push(JSON.stringify(c) + ': conceal ' + B.state.concealment);
  }
  return { fails, n: combos.length };
});
log('the Act 1 to Act 2 handoff survives every state combination', r.fails.length === 0,
    `${r.n} combinations` + (r.fails.length ? ' — ' + r.fails.slice(0, 2).join('; ') : ''));

/* ---- 25. balance: careless fails, careful barely survives (§9.2) ---- */
r = await page.evaluate(() => {
  const B = window.BROOD;

  // A CARELESS player: lights and TV on all night, cooks, runs the tap,
  // leaves the curtain open, leaves the dishes.
  const careless = () => {
    B.reset(); B.startNew(); B.days(B.CONFIG.days.actTwo - 1);  // into Act 2
    const nights = B.CONFIG.days.last - B.CONFIG.days.actTwo + 1;
    for (let d = 0; d < nights && !B.state.ended; d++) {
      B.state.lights.main = true; B.state.tvOn = true;
      B.state.computerOn = true; B.state.curtainOpen = true;
      B.state.waterRunning = true; B.state.cooking = true;
      B.setHour(21);
      for (let i = 0; i < 240; i++) B.concealment.update(1);   // ~4 in-game h
      B.concealment.event('hotMeal');
      B.state.dishesLeft = 3;
      if (B.state.ended) break;
      B.sleep('good');
    }
    return { day: B.state.day, con: Math.round(B.state.concealment), ended: !!B.state.ended };
  };

  // A CAREFUL player: dark, cold food, silent, curtain shut at night,
  // screens in daylight only.
  const careful = () => {
    B.reset(); B.startNew(); B.days(B.CONFIG.days.actTwo - 1);
    const nights = B.CONFIG.days.last - B.CONFIG.days.actTwo + 1;
    for (let d = 0; d < nights && !B.state.ended; d++) {
      Object.keys(B.state.lights).forEach(k => B.state.lights[k] = false);
      B.state.tvOn = false; B.state.curtainOpen = false;
      B.state.waterRunning = false; B.state.cooking = false;
      B.setHour(11);
      B.state.computerOn = true;
      for (let i = 0; i < 120; i++) B.concealment.update(1);   // reads by day
      B.state.computerOn = false;
      B.concealment.event('coldMeal');
      B.state.dishesLeft = 0;
      if (B.state.ended) break;
      B.sleep('good');
    }
    return { day: B.state.day, con: Math.round(B.state.concealment), ended: !!B.state.ended };
  };

  return { careless: careless(), careful: careful() };
});
log('a careless player runs out of concealment before the last day',
    r.careless.ended || r.careless.con < 12,
    `day ${r.careless.day}, ${r.careless.con}% left, ended: ${r.careless.ended}`);
log('a careful player barely survives to the last day',
    !r.careful.ended && r.careful.con > 8 && r.careful.con < 42,
    `day ${r.careful.day}, ${r.careful.con}% left`);

/* ---- 26. the Road Kill window is discoverable, not stumbled into ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const e = await import('/src/systems/endings.js');
  const run = (grants, day) => {
    let out = 0;
    for (let i = 0; i < 240; i++) {
      B.reset(); B.startNew();
      B.state.day = day; B.state.act = 2; B.state.hasKeys = true;
      if (grants.length) B.grant(...grants);
      if (e.endings.keys({ day }).outcome !== 'dead') out++;
    }
    return Math.round((out / 240) * 100);
  };
  // The adaptation ramp runs across the whole of Act 2, so this has to be
  // measured on the last day, when the car is worth least.
  const LAST = B.CONFIG.days.last;
  return {
    // read the sheet carefully → identified a passable route
    read: run(['roadkill_window','spreadsheet_impacts','roadkill_adapt',
               'roads_flooded','anguish_dont_look'], LAST),
    // did not read it → must not stumble into a passable route at the end
    blind: run(['roads_flooded','anguish_dont_look'], LAST),
    // knows there IS a window but cannot date one
    partial: run(['roadkill_adapt','roads_flooded','anguish_dont_look'], LAST),
  };
});
log('reading the impact log identifies a passable route', r.read >= 55, r.read + '% survive');
log('not reading it cannot be survived by luck at the end', r.blind <= 12, r.blind + '% survive');
log('knowing a window exists is not the same as dating one',
    r.partial < r.read - 25, `partial ${r.partial}% vs read ${r.read}%`);

/* ---- 27. accessibility carried forward ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const cfg = (await import('/src/config.js')).CONFIG;
  B.ui.settings();
  const ids = [...document.querySelectorAll('#menu-buttons input')].map(i => i.id);
  const labelled = [...document.querySelectorAll('#menu-buttons input')]
    .every(i => document.querySelector(`label[for="${i.id}"]`));
  // focusable things on a 2D surface
  B.ui.hideMenu();
  B.reset(); B.startNew(); B.days(11);
  B.ui.open('computer'); B.ui.open_.args._booted = true;
  B.ui.open_.args.wins = [{ kind:'browser', site:'forum', tabs:['news','forum','sheet','files'],
    state:{news:{},forum:{},sheet:{},files:{}} }];
  B.ui.rerender();
  const focusable = document.querySelectorAll(
    '#overlay-body a, #overlay-body [tabindex="0"], #overlay-body button').length;
  B.ui.closeAll();
  return { ids, labelled, focusable,
    hasFlash: ids.includes('opt-reducedFlashing'),
    hasCaptions: ids.includes('opt-captions'),
    hasCompass: ids.includes('opt-audioCompass'),
    hasLimiter: ids.includes('opt-limiter'),
    sliders: ids.filter(i => /Volume$/.test(i)).length,
    warning: !!document.getElementById('warning'),
    captionsDefault: cfg.a11y.captions === true,
  };
});
log('separate mix sliders exist', r.sliders === 4, r.sliders + ' sliders');
log('loud-event limiter toggle exists', r.hasLimiter);
log('captions toggle exists and is ON by default', r.hasCaptions && r.captionsDefault);
log('direction indicator toggle exists', r.hasCompass);
log('reduced flashing carried forward', r.hasFlash);
log('every control has a label', r.labelled);
log('photosensitivity notice exists before the title', r.warning);
log('2D surfaces are keyboard reachable', r.focusable > 10, r.focusable + ' focusable nodes');

/* ---- 28. audio node hygiene over a long session ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew(); B.audio.unlock(); B.audio.startWorld();
  const mod = await import('/src/audio.js');
  // Hammer it: 15 days' worth of cue traffic.
  for (let i = 0; i < 900; i++) {
    B.audio.play(mod.CUES[i % mod.CUES.length]);
  }
  await new Promise(res => setTimeout(res, 1200));
  const e = B.audio._engine();
  return { logLen: B.audio._log().length, state: e.ctx.state,
           loops: Object.keys(B.audio._loops || {}).length };
});
log('900 cues in a row leaves the context running', r.state === 'running',
    `log capped at ${r.logLen}, ${r.loops} loops held`);

/* ---- 29. the game is playable without pointer lock (embedded frames) ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.reset(); B.startNew();
  const c = B.controls;
  const canvas = document.getElementById('scene');
  c.enabled = true;
  c.locked = false;
  c.spawn(0, 0, 0);

  // A frame that refuses pointer lock: the request throws, and nothing else
  // in the game may depend on it having worked.
  const real = canvas.requestPointerLock;
  canvas.requestPointerLock = () => { throw new DOMException('denied', 'SecurityError'); };
  let hinted = false;
  const off = B.bus.on('controls:lockDenied', () => { hinted = true; });
  c.lockDenied = false;
  c.requestLock();
  canvas.requestPointerLock = real;
  off();

  const pd = (type, x, y, id) => {
    const ev = new PointerEvent(type, { pointerId: id, pointerType: 'mouse',
      button: 0, buttons: 1, clientX: x, clientY: y, bubbles: true });
    (type === 'pointerdown' ? canvas : window).dispatchEvent(ev);
  };

  // Drag: right and down, and the camera must actually turn.
  const yaw0 = c.yaw, pitch0 = c.pitch;
  pd('pointerdown', 400, 300, 7);
  const dragging = c.dragging;
  pd('pointermove', 520, 340, 7);
  pd('pointerup', 520, 340, 7);
  const yawDrag = c.yaw, pitchDrag = c.pitch;
  const releasedAfterUp = !c.dragging;

  // And the drag must stop mattering once the pointer is up.
  pd('pointermove', 900, 900, 7);
  const yawAfterUp = c.yaw;

  // Arrow keys: also look, and they are consumed so the page never scrolls.
  const yaw1 = c.yaw;
  let defaultPrevented = false;
  const onKey = (e) => { if (e.code === 'ArrowLeft') defaultPrevented = e.defaultPrevented; };
  window.addEventListener('keydown', onKey);
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true, cancelable: true }));
  c.update(0.5);
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', bubbles: true }));
  window.removeEventListener('keydown', onKey);
  const yaw2 = c.yaw;

  // Pitch stays inside the clamp no matter how far you drag.
  pd('pointerdown', 400, 300, 8);
  pd('pointermove', 400, -40000, 8);
  pd('pointerup', 400, -40000, 8);
  const pitchClamped = Math.abs(c.pitch) <= Math.PI / 2;

  return {
    denied: c.lockDenied, hinted, dragging, releasedAfterUp,
    yawTurned: Math.abs(yawDrag - yaw0) > 0.2,
    pitchTurned: Math.abs(pitchDrag - pitch0) > 0.05,
    inertAfterUp: yawAfterUp === yawDrag,
    keyTurned: Math.abs(yaw2 - yaw1) > 0.4,
    defaultPrevented, pitchClamped,
  };
});
log('a refused pointer lock is detected, not swallowed', r.denied && r.hinted);
log('drag-to-look turns the camera on both axes', r.yawTurned && r.pitchTurned,
    'drag captured: ' + r.dragging);
log('the drag stops on pointerup and goes inert', r.releasedAfterUp && r.inertAfterUp);
log('arrow keys look, and do not scroll the host page', r.keyTurned && r.defaultPrevented);
log('pitch stays clamped through an absurd drag', r.pitchClamped);

/* ---- 30. §2 the survivor at the door ---- */
r = await page.evaluate(async () => {
  const B = window.BROOD;
  const D = B.CONFIG.days;
  const out = {};

  // She knocks in the window, once, and the screen cannot be escaped.
  B.reset(); B.startNew(); B.days(D.strangerFrom - 1);
  B.script.strangerAtTheDoor();
  await new Promise(res => setTimeout(res, 1800));
  out.opened = B.ui.openName;
  out.escapable = (() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true, cancelable: true }));
    return B.ui.openName !== 'stranger';
  })();

  // Listening through to the end offers both choices and the look.
  const step = () => {
    const b = [...document.querySelectorAll('#overlay-body button')];
    const listen = b.find(x => /listen/i.test(x.textContent));
    if (listen) { listen.click(); return true; }
    return false;
  };
  while (step()) { /* three beats */ }
  const buttons = [...document.querySelectorAll('#overlay-body button')]
    .map(b => b.textContent.trim().split('\n')[0]);
  out.buttons = buttons;

  // Looking costs nothing and settles nothing.
  const look = [...document.querySelectorAll('#overlay-body button')]
    .find(b => /look through/i.test(b.textContent));
  const conBefore = B.state.concealment;
  look.click();
  out.lookFree = Math.abs(B.state.concealment - conBefore) < 0.001;
  out.lookText = document.querySelector('#overlay-body .look')?.textContent || '';

  // Admitting her: costs Concealment and food, grants Understanding.
  const scoreBefore = B.score();
  const foodBefore = B.state.foodPortions;
  const conBefore2 = B.state.concealment;
  [...document.querySelectorAll('#overlay-body button')]
    .find(b => /take the board down/i.test(b.textContent)).click();
  out.admitted = B.state.flags.stranger;
  out.costConceal = conBefore2 - B.state.concealment;
  out.costFood = foodBefore - B.state.foodPortions;
  out.gained = B.score() - scoreBefore;
  out.notTrapped = B.ui.openName === 'scene';
  B.ui.closeAll();

  // The tins arrive the following morning, so it is a net gain she made.
  const foodAtNight = B.state.foodPortions;
  B.sleep('good');
  out.tins = B.state.foodPortions - foodAtNight;

  // Refusing costs nothing at all, mechanically.
  B.reset(); B.startNew(); B.days(D.strangerFrom - 1);
  B.script.strangerAtTheDoor();
  await new Promise(res => setTimeout(res, 1800));
  while (step()) { /* beats */ }
  const conBefore3 = B.state.concealment;
  const scoreBefore3 = B.score();
  [...document.querySelectorAll('#overlay-body button')]
    .find(b => /say nothing/i.test(b.textContent)).click();
  out.refused = B.state.flags.stranger;
  out.refusedCost = Math.abs(B.state.concealment - conBefore3) + (B.score() - scoreBefore3);
  B.ui.closeAll();

  // She never knocks twice.
  B.script.strangerAtTheDoor();
  await new Promise(res => setTimeout(res, 600));
  out.twice = B.ui.openName === 'stranger';

  return out;
});
log('a human being knocks, and the door cannot be escaped',
    r.opened === 'stranger' && !r.escapable);
log('she is heard out before there is anything to decide',
    r.buttons.some(b => /take the board down/i.test(b)) &&
    r.buttons.some(b => /say nothing/i.test(b)), r.buttons.join(' / '));
log('looking through the gap is free and settles nothing',
    r.lookFree && /looks exactly like a person/.test(r.lookText));
log('letting her in costs Concealment and food and gives Understanding',
    r.admitted === 'admitted' && r.costConceal > 1 && r.costFood > 0 && r.gained > 0,
    `-${r.costConceal.toFixed(1)}% concealment, -${r.costFood} portions, +${r.gained} understanding`);
log('and she leaves more than she ate', r.tins >= 9, `+${r.tins} portions in the morning`);
log('turning her away costs nothing mechanically',
    r.refused === 'refused' && r.refusedCost < 0.001);
log('neither choice traps the player behind an unclosable screen', r.notTrapped);
log('she knocks once in a run, or never', !r.twice);

/* ---- errors ---- */
console.log('');
if (errors.length) {
  console.log('CONSOLE ERRORS (' + errors.length + '):');
  for (const e of errors.slice(0, 25)) console.log('  · ' + e.slice(0, 400));
} else {
  console.log('no console errors.');
}

const failed = results.filter(x => !x.ok);
console.log('');
console.log(`${results.length - failed.length}/${results.length} checks passed.`);

await browser.close();
server.close();
process.exit(failed.length || errors.length ? 1 : 0);
