/**
 * verify.mjs — drives the game headlessly through the debug API.
 *
 * Checks that the player can start on Day 1, reach Day 15, and that all
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

/* ---- 1. start, walk the fifteen days ---- */
let r = await page.evaluate(async () => {
  const B = window.BROOD;
  B.startNew();
  const trace = [];
  for (let i = 0; i < 20 && B.state.day < 15 && !B.state.ended; i++) {
    B.sleep('good');
    trace.push({ day: B.state.day, conceal: Math.round(B.state.concealment),
                 cond: Math.round(B.state.condition), act: B.state.act,
                 food: B.state.foodPortions });
  }
  return { day: B.state.day, act: B.state.act, ended: !!B.state.ended, trace,
           bedroom: B.state.bedroomUnlocked, keys: B.state.hasKeys };
});
log('reaches Day 15 from Day 1', r.day === 15 && !r.ended, `day=${r.day} act=${r.act} ended=${r.ended}`);
log('Act 2 opens on Day 10', r.act === 2 && r.bedroom && r.keys);
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
    news: news.NEWS.length, newsD1: news.newsFor(1).length, newsD15: news.newsFor(15).length,
    posts: forum.POSTS.length, threads: forum.THREADS.length,
    docs: docs.DOCS.length, videos: docs.VIDEOS.length,
    impacts: sheet.IMPACTS.length,
    family: phone.FAMILY.length, friendTexts: phone.FRIEND_TEXTS.length,
    notes: notes.NOTES.length, laptop: notes.LAPTOP.length,
    mail: mail.MAIL.length, bait: mail.MAIL.filter(m=>m.bait).length,
  };
});
log('~40 news articles', r.news >= 38, `${r.news} (day1: ${r.newsD1}, day15: ${r.newsD15})`);
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
  B.reset(); B.startNew(); B.state.day = 14; B.state.act = 2; B.state.hasKeys = true;
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
  B.reset(); B.startNew(); B.state.day = 15; B.state.act = 2; B.state.hasKeys = true;
  B.believe('shoot_anguish','light_repels','zanuwam_daylight');
  out.keysLow = { tier: B.tier(), score: B.score(), r: B.endKeys() };

  // B — brave
  B.reset(); B.startNew(); B.state.day = 15; B.state.act = 2; B.state.hasShotgun = true;
  B.grant('incursion_fragile','incursion_needs_opening','incursion_habitation','texts_are_bait');
  out.brave = { tier: B.tier(), r: B.endBrave({ held:true, mistakes:0, fired:1, letIn:false }) };

  // B — let it in
  B.reset(); B.startNew(); B.state.day = 15; B.state.act = 2;
  out.braveLetIn = { r: B.endBrave({ held:false, mistakes:2, fired:0, letIn:true }) };

  // C — concealment zero
  B.reset(); B.startNew(); B.state.day = 13; B.state.act = 2;
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
  B.days(9);                       // into Act 2
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
  for (const scr of ['news','computer','phone','food','notes','laptop','sleep','leave']) {
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


/* ---- 9. the fifteen days actually run in real time ---- */
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
  for (let d = 1; d <= 15; d++) {
    for (let hh = 6; hh <= 30; hh += 0.25) {
      B.clock.advanceTo(hh);
      B.script.update();
    }
    B.ui.closeAll();
    if (B.state.ended) break;
    if (d < 15) { B.sleep('good'); }
  }
  window.removeEventListener('error', onErr);
  off();
  return { fired, day: B.state.day, ended: B.state.ended ? B.state.ended.id : null, errs,
           conceal: Math.round(B.state.concealment), cond: Math.round(B.state.condition),
           sightings: B.state.sightings, marks: B.state.marksOnWall };
});
log('every scripted beat fires across 15 days', r.fired.length >= 25 && r.errs.length === 0,
    `${r.fired.length} events, day=${r.day}, conceal=${r.conceal}, cond=${r.cond}` + (r.errs.length ? ' ERRS: ' + r.errs.join('; ') : ''));
log('the Day 9 handoff runs', r.fired.includes('e9c'));
log('Act 2 transition runs', r.fired.includes('e10a'));
log('the texts from his number begin on Day 12', r.fired.includes('e12a'));
log('the finale triggers on Day 15', r.fired.includes('e15b'));

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
  B.reset(); B.startNew(); B.days(9);
  B.state.lights.main = true; B.state.tvOn = true; B.setHour(22);
  for (let i = 0; i < 40; i++) B.concealment.update(1);
  B.concealment.rollDay();
  const noisy = { hot: B.state.hotProfile, ...B.concealmentDebug() };

  // dark and silent, but cooking and dishes and routine
  B.reset(); B.startNew(); B.days(9);
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
    B.state.day = 15; B.state.act = 2; B.state.hasKeys = true;
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
  B.ui.open('computer', { tab: 'mail' });
  const previewsVisible = bait.every(m => document.body.innerText.includes(m.preview.slice(0, 40)));
  const endedFromLooking = !!B.state.ended;
  B.ui.closeAll();
  return { n: bait.length, previewsVisible, endedFromLooking,
           tellsYouNotTo: bait.every(m => /do not open|不要打开/.test(m.warning)) };
});
log('bait previews are free and visible without clicking', r.previewsVisible && !r.endedFromLooking, `${r.n} live`);
log('it tells you not to open it, every time', r.tellsYouNotTo);

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
