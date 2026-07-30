/**
 * sheet.js — the crowdsourced tracking spreadsheet.
 *
 * The single most important document in the game, and it is someone's
 * Google Sheet. Volunteer-maintained, half-verified, constantly argued
 * over, and the thing that decides the Keys ending.
 *
 * Rows are day-gated. Nothing here is presented as authoritative and the
 * sheet itself says so, twice, in a tab most people never open.
 */

export const TABS = [
  { id: 'rules',    label: 'READ ME FIRST' },
  { id: 'sightings',label: 'Sightings' },
  { id: 'roads',    label: 'Road impacts' },
  { id: 'flooding', label: 'Flooding + closures' },
  { id: 'cities',   label: 'By city' },
];

export const RULES = {
  day: 2,
  u: 4,
  flags: ['spreadsheet_impacts'],
  body: `MAINTAINED BY: PT_Ellis, sheetmom, + 4 editors
LAST FULL AUDIT: see cell A1 of each tab

WHAT THIS IS
A list of things people say they saw. That is all it is. It is not a
government product, nobody here is qualified, and three of us are
teachers.

RULES FOR ADDING A ROW
1. City, street or route, date, TIME. A row without a time is useless
   and I will delete it.
2. Source = the person who saw it. Not the person who told you.
3. Verified = a second, independent person who saw the same thing.
   Not a second person who read the first person's post.
4. If you are guessing, say GUESS in the notes. Nobody will be angry.
   People have been angry at guesses that were labelled as facts and
   that is how this gets people killed.

ABOUT TAB 3 (ROAD IMPACTS)
This tab is not a body count. It is a clock.

Every row is a time at which the thing on the roads was hurt. There
is an interval after that during which it has not adapted yet. We do
not know how long the interval is. Our best estimate from four
well-documented cases is between four and nine hours.

The "hours since" column updates itself. Read it. That is the whole
reason this tab exists and about six people have understood that.

ABOUT TAB 4 (FLOODING)
A road on tab 4 is not a closed road. It is a road that has stopped
existing. Nobody has reopened one. Not one, in eleven days.

ABOUT TAB 5 (BY CITY)
Read your own city's row and then read a different city's row and
notice that they are not the same. Advice from Mobile will kill you
in Wilmington. This is the single most common way people are getting
hurt with information from this sheet.`,
};

/* ------------------------------------------------------------------ */

export const SIGHTINGS = [
  { day:2, city:'Norfolk',    loc:'Ocean View / 15th',      type:'commons (scratching, low)', date:'—', time:'02:40', src:'oysterknife', ver:'yes', notes:'multiple, ground level' },
  { day:2, city:'Norfolk',    loc:'Lambert\'s Point',       type:'commons',                   date:'—', time:'23:15', src:'granby_st',  ver:'yes', notes:'' },
  { day:3, city:'Norfolk',    loc:'Colley Ave',             type:'BIG — collapse',            date:'—', time:'01:20', src:'nightjar_88',ver:'yes', notes:'2 collapses, 9s gap' },
  { day:3, city:'Portsmouth', loc:'Effingham St',           type:'water',                     date:'—', time:'06:00', src:'—',          ver:'no',  notes:'road under. no rain.' },
  { day:4, city:'Norfolk',    loc:'Colley Ave',             type:'scavengers',                date:'—', time:'01:40', src:'nightjar_88',ver:'yes', notes:'TWENTY MIN AFTER. never before.' },
  { day:4, city:'Wilmington', loc:'College Rd',             type:'BIG — collapse',            date:'—', time:'22:00', src:'2nd hand',   ver:'no',  notes:'GUESS' },
  { day:5, city:'Norfolk',    loc:'Wards Corner',           type:'BIG — collapse',            date:'—', time:'23:50', src:'nightjar_88',ver:'no',  notes:'moving NE' },
  { day:5, city:'Chesapeake', loc:'Scope lot (Norfolk)',    type:'crowd event',               date:'—', time:'18:30', src:'mom_of_3',   ver:'no',  notes:'turned around. husband won\'t say.' },
  { day:6, city:'Suffolk',    loc:'Route 58 / county line', type:'BIG — engagement',          date:'—', time:'02:10', src:'Q_from_Suffolk', ver:'yes', notes:'Guard. 11 unaccounted.' },
  { day:6, city:'Norfolk',    loc:'Park Place',             type:'commons',                   date:'—', time:'03:30', src:'mudflat',    ver:'no',  notes:'heard not seen' },
  { day:7, city:'Norfolk',    loc:'Ghent',                  type:'INSIDE — entry',            date:'—', time:'—',     src:'—',          ver:'no',  notes:'house found open, occupant gone' },
  { day:8, city:'Norfolk',    loc:'unknown',                type:'RED',                       date:'—', time:'01:00', src:'trooper\'s wife', ver:'no', notes:'2nd hand. logging it anyway.' },
  { day:10, city:'Norfolk',    loc:'Berkley',                type:'BIG — collapse x2',         date:'—', time:'02:10', src:'berkley_dan',ver:'no',  notes:'long gaps both' },
  { day:10, city:'Norfolk',    loc:'Hampton Blvd',           type:'water',                     date:'—', time:'12:50', src:'video v07',  ver:'yes', notes:'4 blocks. daylight. one loss on camera.' },
  { day:11,city:'Norfolk',    loc:'Berkley',                type:'VOICE',                     date:'—', time:'21:00', src:'berkley_dan',ver:'no',  notes:'2hrs. neighbour\'s name. neighbour in GA.' },
  { day:12,city:'Norfolk',    loc:'Larchmont',              type:'INSIDE — writing',          date:'—', time:'—',     src:'stillwaters',ver:'no',  notes:'note in dead relative\'s hand' },
  { day:14,city:'Norfolk',    loc:'22nd St',                type:'VOICE',                     date:'—', time:'04:02', src:'video v10',  ver:'yes', notes:'41 calls. a door opened.' },
  { day:14,city:'Norfolk',    loc:'Park Place',             type:'scavengers',                date:'—', time:'23:40', src:'mudflat',    ver:'no',  notes:'means the big one already came through' },
  { day:16,city:'Norfolk',    loc:'Berkley',                type:'INSIDE — writing',          date:'—', time:'04:44', src:'berkley_dan',ver:'yes', notes:'INSIDE of his door.' },
  { day:18,city:'Norfolk',    loc:'Ocean View',             type:'water — total',             date:'—', time:'—',     src:'oysterknife',ver:'yes', notes:'15th is water now. the land.' },
];

/* ------------------------------------------------------------------ */
/* TAB 3 — the one that matters                                        */
/* ------------------------------------------------------------------ */

export const IMPACTS = [
  { day:8,  route:'I-64 W',   mp:'MP 291', vehicle:'sedan',        ts:'d-19 14:20', ver:2, outcome:'no survivor. car recovered.' },
  { day:8,  route:'US-58 W',  mp:'—',      vehicle:'sedan',        ts:'d-18 09:05', ver:1, outcome:'no survivor.' },
  { day:8,  route:'I-264 W',  mp:'MP 12',  vehicle:'sedan',        ts:'d-17 23:40', ver:2, outcome:'no survivor.' },
  { day:8,  route:'I-64 W',   mp:'MP 264', vehicle:'pickup',       ts:'d-15 05:30', ver:2, outcome:'DRIVER MADE IT. called back from Richmond.' },
  { day:8,  route:'US-17 N',  mp:'—',      vehicle:'pickup',       ts:'d-14 18:00', ver:1, outcome:'made it' },
  { day:8,  route:'I-64 W',   mp:'MP 238', vehicle:'pickup',       ts:'d-12 11:15', ver:2, outcome:'made it' },
  { day:8,  route:'I-64 W',   mp:'MP 250', vehicle:'pickup',       ts:'d-9 07:40',  ver:2, outcome:'NO. pickups stopped working here.' },
  { day:8,  route:'US-58 W',  mp:'—',      vehicle:'box truck',    ts:'d-9 20:10',  ver:1, outcome:'made it' },
  { day:10,  route:'I-64 W',   mp:'MP 243', vehicle:'semi',         ts:'d-7 03:00',  ver:3, outcome:'MADE IT. this is the semi everyone talks about.' },
  { day:10,  route:'I-64 W',   mp:'MP 243', vehicle:'semi',         ts:'d-6 15:45',  ver:2, outcome:'no. second semi. nothing.' },
  { day:10,  route:'I-664 N',  mp:'MP 4',   vehicle:'box truck',    ts:'d-6 22:00',  ver:1, outcome:'made it' },
  { day:11, route:'US-58 W',  mp:'county', vehicle:'MRAP (Guard)', ts:'d-5 02:10',  ver:3, outcome:'OFF THE ROAD ~6 HOURS. back on 58 by 08:00.' },
  { day:11, route:'US-58 W',  mp:'county', vehicle:'MRAP (Guard)', ts:'d-4 21:30',  ver:2, outcome:'no effect at all. second MRAP.' },
  { day:11, route:'I-64 W',   mp:'MP 205', vehicle:'box truck',    ts:'d-4 10:00',  ver:1, outcome:'made it — went 45 min after a logged impact' },
  { day:12, route:'I-264 W',  mp:'MP 9',   vehicle:'bus',          ts:'d-3 16:20',  ver:2, outcome:'made it' },
  { day:12, route:'I-64 W',   mp:'MP 220', vehicle:'bus',          ts:'d-2 06:00',  ver:1, outcome:'no.' },
  { day:14, route:'US-17 N',  mp:'—',      vehicle:'box truck',    ts:'d-2 19:40',  ver:2, outcome:'made it, 2 hrs after' },
  { day:14, route:'I-64 W',   mp:'MP 238', vehicle:'sedan',        ts:'d-1 08:30',  ver:1, outcome:'no. sedans have been dead for a week.' },
  { day:16, route:'US-58 W',  mp:'—',      vehicle:'tractor',      ts:'d-1 22:00',  ver:2, outcome:'made it. 3 hrs after.' },
  { day:18, route:'I-64 W',   mp:'MP 238', vehicle:'box truck',    ts:'today 04:10',ver:2, outcome:'unknown — no callback yet' },
  { day:20, route:'I-64 W',   mp:'MP 238', vehicle:'—',            ts:'—',          ver:0, outcome:'no new rows. sheetmom last edited 19:20 yesterday.' },
];

/**
 * The column that is the entire point of the tab. It is live: it is now
 * minus the impact timestamp, and "now" is whatever hour it currently is
 * in the apartment. A player who opens the sheet at eight in the morning
 * and a player who opens it at four in the afternoon are not reading the
 * same document.
 */
export function hoursSince(row, day, hour = 14) {
  if (row.ts === '—') return null;
  const now = ((hour % 24) + 24) % 24;
  const m = /^d-(\d+)\s+(\d+):(\d+)$/.exec(row.ts);
  if (m) return Math.round(Number(m[1]) * 24 + (now - Number(m[2])));
  const t = /^today\s+(\d+):(\d+)$/.exec(row.ts);
  if (t) return Math.max(0, Math.round(now - Number(t[1])));
  return null;
}

/* ------------------------------------------------------------------ */

export const FLOODING = [
  { day:3,  road:'Effingham St (Portsmouth), County–Green', status:'CLOSED',    note:'first one. above the flood line.' },
  { day:5,  road:'Bay Ave, Ocean View',                     status:'CLOSED',    note:'' },
  { day:6,  road:'W 15th St, Ocean View',                   status:'CLOSED',    note:'' },
  { day:7,  road:'Hampton Blvd, 4 blocks S of the yard',    status:'CLOSED',    note:'no rain since the 2nd' },
  { day:8,  road:'Granby St, N of Wards Corner',            status:'CLOSED',    note:'' },
  { day:10,  road:'Chesapeake Bay Bridge-Tunnel',            status:'CLOSED',    note:'not water. "structural assessment."' },
  { day:10,  road:'Colonial Ave, Ghent, 2 blocks',           status:'CLOSED',    note:'' },
  { day:11, road:'Little Creek Rd, E of Tidewater',         status:'CLOSED',    note:'' },
  { day:12, road:'Terminal Blvd',                           status:'CLOSED',    note:'' },
  { day:12, road:'I-564 (both directions)',                 status:'CLOSED',    note:'base access. water at the gate.' },
  { day:14, road:'Brambleton Ave, E of Colley',             status:'CLOSED',    note:'' },
  { day:16, road:'Church St, N of Virginia Beach Blvd',     status:'CLOSED',    note:'' },
  { day:16, road:'22nd St, W of Granby',                    status:'CLOSED',    note:'one block from where the voice was' },
  { day:18, road:'Ocean View Ave (entire)',                 status:'GONE',      note:'sheetmom changed the wording. she was asked to change it back. she has not.' },
  { day:18, road:'I-264 E of Ballentine',                   status:'CLOSED',    note:'westbound still open as of this morning' },
];

/* ------------------------------------------------------------------ */

export const CITIES = [
  { day:3,  city:'Mobile, AL',      commons:'very high', big:'0',   inside:'0',  red:'0', other:'—',
    note:'enormous numbers of the small ones and nothing above them. people from here keep giving advice that only works here.' },
  { day:3,  city:'Gulfport, MS',    commons:'high',      big:'1',   inside:'0',  red:'0', other:'water',
    note:'' },
  { day:4,  city:'Wilmington, NC',  commons:'low',       big:'2',   inside:'1',  red:'1', other:'in dispute',
    note:'almost none of the small ones. we think the big ones ate them. two big ones in one city seems to mean they fight.' },
  { day:5,  city:'Charleston, SC',  commons:'moderate',  big:'0',   inside:'2',  red:'0', other:'voices',
    note:'two of the inside kind. nobody in Charleston is posting any more.' },
  { day:6,  city:'Norfolk, VA',     commons:'high',      big:'1–2', inside:'1',  red:'?', other:'water, voices',
    note:'HIGH commons and only one or two big ones, which is backwards. something is eating the small ones faster than the big one can account for.' },
  { day:10,  city:'Norfolk, VA (upd)',commons:'high',     big:'1–2', inside:'1+', red:'?', other:'water, voices',
    note:'"?" on the red column does not mean no. you cannot check for the red one remotely because the only sign is silence.' },
  { day:14, city:'Richmond, VA',    commons:'none',      big:'0',   inside:'0',  red:'0', other:'—',
    note:'inland. nothing. one hundred miles and nothing. that is the whole map, right there.' },
];

export function sheetFor(day) {
  return {
    rules: RULES,
    sightings: SIGHTINGS.filter(r => r.day <= day),
    impacts: IMPACTS.filter(r => r.day <= day),
    flooding: FLOODING.filter(r => r.day <= day),
    cities: CITIES.filter(r => r.day <= day),
  };
}

export default sheetFor;
