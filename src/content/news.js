/**
 * news.js — the television.
 *
 * Four movements. Official, authoritative, calm, sanitized, hours behind,
 * and eventually a ninety-second loop. It is never lying on purpose. It is
 * just always the last to know, and it stops being allowed to say things.
 */

export const NEWS = [

/* ================================================================== */
/* MOVEMENT 1 — INCIDENTS. Careful nouns. A small worried smile.       */
/* ================================================================== */

{ id:'n01', day:1, movement:1, source:'WKRV 9 Tidewater', time:'6:14 PM',
  headline:'Sanitation backlog continues into second week in three Norfolk districts',
  body:`City officials say collection crews are running at roughly forty percent in the Park Place, Lambert's Point and Berkley districts and expect to be caught up "within the week."

The city has asked residents not to place additional bins on the kerb until routes resume.

A spokesperson for Public Works declined to say how many employees have not reported.`,
  u:1 },

{ id:'n02', day:1, movement:1, source:'WKRV 9 Tidewater', time:'6:21 PM',
  headline:'Tide gauges at Sewells Point reading high for the fourth straight day',
  body:`NOAA's gauge at Sewells Point has read above the predicted level every tide cycle since Friday, by margins of eleven to nineteen inches.

A researcher at ODU called the readings "unusual but not unprecedented" and said onshore wind and a stalled low were the likely cause.

The Elizabeth River bulkhead at the foot of Colley remains closed while the city inspects it.`,
  u:2, flags:['coastal_origin'] },

{ id:'n03', day:1, movement:1, source:'WKRV 9 Tidewater', time:'11:02 PM',
  headline:'Coast Guard suspends search off Cape Charles',
  body:`The Coast Guard has suspended the search for two crewmen from the Miss Dolores, a forty-two-foot trawler recovered adrift Tuesday morning nine miles east of Cape Charles.

The vessel was undamaged. Fuel and catch were aboard. Both liferafts were still in their cradles.

A spokesman said the search covered 340 square miles over 31 hours.`,
  u:2, flags:['coastal_origin'] },

{ id:'n04', day:2, movement:1, source:'WKRV 9 Tidewater', time:'12:30 PM',
  headline:'Portsmouth closes two blocks of Effingham for "roadway flooding"',
  body:`Effingham Street is closed between County and Green after standing water was reported early Thursday.

Portsmouth Public Works said the closure is precautionary and that the water is not from the river. Crews have not yet located the source.

There is no rain in the forecast through Sunday.`,
  u:3, flags:['undertow_water'] },

{ id:'n05', day:2, movement:1, source:'AP wire', time:'3:47 PM',
  headline:'Mobile, Ala. reports "animal incursions" in three neighbourhoods',
  body:`Mobile police responded to eleven calls overnight described in the log as animal incursions, in the Crichton, Toulminville and Oakdale neighbourhoods.

Two people were taken to USA Health with injuries the department described as "consistent with an animal attack." A third was not located.

Alabama Wildlife and Freshwater Fisheries said it had not been asked to assist.`,
  u:3, flags:['coastal_origin'] },

{ id:'n06', day:2, movement:1, source:'WKRV 9 Tidewater', time:'6:08 PM',
  headline:'City asks residents to report "unusual wildlife" to non-emergency line',
  body:`Animal Control has asked residents to use the non-emergency number rather than 911 for sightings of unusual wildlife, after what a spokesperson called "a heavy volume of calls" from the Ocean View and Willoughby areas.

Residents are asked not to approach and not to attempt to photograph.

The department did not describe what has been reported.`,
  u:2 },

{ id:'n07', day:3, movement:1, source:'WKRV 9 Tidewater', time:'7:55 AM',
  headline:'Charleston harbour closed to all traffic',
  body:`The Port of Charleston is closed to all commercial and recreational traffic until further notice, the third southeastern port to close this month after Mobile and Gulfport.

The Maritime Administration cited "an ongoing safety assessment."

Container operations at Norfolk International Terminals continue normally.`,
  u:3, flags:['coastal_origin'] },

{ id:'n08', day:3, movement:1, source:'WKRV 9 Tidewater', time:'6:02 PM',
  headline:'Wilmington, N.C. under voluntary evacuation for coastal neighbourhoods',
  body:`New Hanover County has issued a voluntary evacuation for neighbourhoods east of College Road, citing what the county emergency manager called "a public safety situation we don't have a category for."

Shelters are open at three schools and the convention centre.

The county has asked residents to gather at those locations rather than shelter in place.`,
  u:4, flags:['congregation_crowds'], beliefs:['shelter_is_safe'] },

{ id:'n09', day:3, movement:1, source:'WKRV 9 Tidewater', time:'6:19 PM',
  headline:'Hampton Roads hospitals move to "surge posture"',
  body:`Sentara and Bon Secours facilities across Hampton Roads have moved to surge posture, deferring elective procedures.

A joint statement said the change is precautionary and that emergency departments remain open.

Both systems declined to give current admission figures.`,
  u:2 },

{ id:'n10', day:3, movement:1, source:'WKRV 9 Tidewater', time:'11:14 PM',
  headline:'Governor to address the Commonwealth Thursday morning',
  body:`The Governor's office has announced remarks Thursday at 9 a.m. regarding what a statement called "coastal incidents in several southeastern states."

The Virginia National Guard has been placed on alert status. No units have been mobilised.`,
  u:2 },

/* ================================================================== */
/* MOVEMENT 2 — THE SITUATION. Named officials. Numbers stop.          */
/* ================================================================== */

{ id:'n11', day:4, movement:2, source:'WKRV 9 Tidewater', time:'9:14 AM',
  headline:'Governor declares state of emergency for all coastal localities',
  body:`The Governor has declared a state of emergency covering Hampton Roads, the Eastern Shore and the Northern Neck, and has mobilised approximately 1,800 Virginia National Guard personnel.

He asked residents to remain in their homes overnight and to avoid the waterfront.

Asked what residents should expect to see, he said: "I'm going to let the emergency management professionals speak to that."

He was not asked again.`,
  u:3, flags:['military_useless'] },

{ id:'n12', day:4, movement:2, source:'WKRV 9 Tidewater', time:'12:40 PM',
  headline:'VDEM: 40,000 without power across Hampton Roads',
  body:`Dominion crews are working outages affecting an estimated 40,000 customers, concentrated in Norfolk, Portsmouth and Chesapeake.

A Dominion spokesperson said the outages are not weather-related and are "consistent with physical damage to distribution infrastructure."

Restoration estimates were not given.`,
  u:2 },

{ id:'n13', day:4, movement:2, source:'AP wire', time:'4:22 PM',
  headline:'Coast Guard: eleven vessels adrift between Savannah and Cape Hatteras',
  body:`Eleven vessels have been recovered adrift along the southeastern seaboard in nine days, all undamaged, all without crew.

The Coast Guard has stopped issuing individual notices and has closed the entire coastal zone to recreational traffic.

"Do not go out," the district commander said. "There is nothing out there for you."`,
  u:4, flags:['coastal_origin'] },

{ id:'n14', day:5, movement:2, source:'WKRV 9 Tidewater', time:'7:31 AM',
  headline:'I-264 westbound closed at Ballentine after overnight incident',
  body:`State Police closed I-264 westbound at the Ballentine Boulevard exit shortly after 3 a.m. following what a trooper described as a multi-vehicle incident.

Six vehicles were removed from the roadway. Occupant information was not released.

The roadway reopened at 6:40 a.m. Troopers have asked drivers not to stop for obstructions in travel lanes under any circumstances.`,
  u:5, flags:['roadkill_never_leaves'] },

{ id:'n15', day:5, movement:2, source:'WKRV 9 Tidewater', time:'6:05 PM',
  headline:'State Police: "Do not stop your vehicle"',
  body:`Virginia State Police issued unusual guidance Friday evening asking drivers not to stop for debris, animals or persons in the roadway on interstates and primary routes.

"If there is an obstruction in your lane, change lanes," a spokesperson said. "Do not slow. Do not stop. Do not get out."

Asked whether the guidance related to the I-264 incident, the spokesperson said the guidance was general.`,
  u:6, flags:['roadkill_never_leaves'] },

{ id:'n16', day:5, movement:2, source:'WKRV 9 Tidewater', time:'6:11 PM',
  headline:'Two Norfolk shelters at capacity; residents directed to Scope arena',
  body:`Shelters at Booker T. Washington and Maury High School reached capacity Friday afternoon. The city has opened Norfolk Scope and is directing arriving residents there.

Capacity at Scope is listed at approximately 11,000.

City officials asked residents in the Ocean View, Ghent and downtown areas to relocate to Scope "as early in the day as possible."`,
  u:4, beliefs:['shelter_is_safe'] },

{ id:'n17', day:6, movement:2, source:'WKRV 9 Tidewater', time:'6:00 AM',
  headline:'Scope shelter not accepting arrivals',
  body:`Norfolk Scope is not accepting new arrivals as of 5:30 a.m. The city has not said why and has not given a figure for how many people are inside.

Residents have been asked to shelter in place.

Buses that were running to Scope from four collection points are not running.`,
  u:6, flags:['congregation_crowds'] },

{ id:'n18', day:6, movement:2, source:'WKRV 9 Tidewater', time:'6:04 PM',
  headline:'National Guard element engaged unidentified target near Suffolk',
  body:`A Virginia National Guard element engaged an unidentified target on Route 58 outside Suffolk shortly after 2 a.m. Sunday, according to a statement from the Joint Force Headquarters.

The statement said the element expended "the majority of available ordnance," including anti-armour munitions, and that the target "did not disengage."

The element withdrew. Eleven personnel are unaccounted for.

The Adjutant General said in the same statement that Guard units will no longer be deployed to engage and will be repositioned to support evacuation and logistics only.`,
  u:8, flags:['military_useless','tormentor_noise_light'] },

{ id:'n19', day:6, movement:2, source:'AP wire', time:'8:50 PM',
  headline:'Federal government declines to characterise events',
  body:`A White House spokesperson declined four times to characterise the nature of the events along the southeastern coast, saying only that the federal response is "a whole-of-government effort."

Asked whether the events are biological, geological or otherwise, the spokesperson said the question would be taken.

The briefing ran nine minutes.`,
  u:2 },

{ id:'n20', day:7, movement:2, source:'WKRV 9 Tidewater', time:'7:20 AM',
  headline:'Water pressure reduced across Norfolk and Portsmouth',
  body:`Norfolk Utilities has reduced system pressure and asked residents to limit non-essential use.

A boil water notice is in effect for areas south of Brambleton.

The utility said the reduction is to maintain service to hospitals and "priority facilities" and did not say what those are.`,
  u:2 },

{ id:'n21', day:7, movement:2, source:'WKRV 9 Tidewater', time:'6:00 PM',
  headline:'City: 22,000 relocated. Officials will not confirm casualty figures.',
  body:`The city says approximately 22,000 residents have relocated inland since Wednesday.

Asked for a casualty figure, the emergency manager said the city is "not in a position to provide that number today."

He was asked whether the city has the number. He said the city is not in a position to provide it.

That exchange was the last time a number was requested at a Norfolk briefing.`,
  u:3 },

{ id:'n22', day:7, movement:2, source:'WKRV 9 Tidewater', time:'6:12 PM',
  headline:'Chesapeake Bay Bridge-Tunnel closed indefinitely',
  body:`The Bridge-Tunnel is closed in both directions and will not reopen on a schedule, the district said.

The closure follows what the district called "a structural assessment."

Eastern Shore residents have been advised that the only remaining route off the peninsula is northbound through Maryland.`,
  u:4, flags:['roads_flooded'] },

/* ================================================================== */
/* MOVEMENT 3 — ADVISORIES. Shelter in place. Do not approach.         */
/* ================================================================== */

{ id:'n23', day:8, movement:3, source:'VDEM Advisory', time:'5:00 AM',
  headline:'ADVISORY 1: Shelter in place. Do not travel between 8 p.m. and 6 a.m.',
  body:`The Virginia Department of Emergency Management advises all residents of coastal localities to shelter in place.

DO NOT travel between 8 p.m. and 6 a.m.
DO NOT approach standing water of any depth.
DO NOT gather in groups outdoors.
DO NOT look directly at any unidentified figure. Report the location and remain indoors.

This advisory will be updated at 12-hour intervals.`,
  u:9, flags:['anguish_dont_look','undertow_water','congregation_crowds'] },

{ id:'n24', day:8, movement:3, source:'WKRV 9 Tidewater', time:'6:00 PM',
  headline:'Anchor reads advisory in full; declines to take questions',
  body:`The 6 o'clock broadcast consisted of the VDEM advisory read in full, twice, followed by a list of open pharmacies.

The anchor has been on air for eleven days. She read the fourth line of the advisory, stopped, and read it again, and then said "that's — that's what we have."

There is no weather segment now. There is a card with the tide table on it.`,
  u:3 },

{ id:'n25', day:8, movement:3, source:'AP wire', time:'9:30 PM',
  headline:'Curfews now in effect in 31 counties across four states',
  body:`Overnight curfews are in effect across 31 counties and 14 independent cities in Virginia, North Carolina, South Carolina and Georgia.

Enforcement is described as advisory. There are not enough officers to enforce it and the states have said so.`,
  u:2 },

{ id:'n26', day:9, movement:3, source:'VDEM Advisory', time:'5:00 AM',
  headline:'ADVISORY 3: Shelter in place. Minimise light and sound after dark.',
  body:`Residents are advised to minimise exterior light and audible sound between dusk and dawn.

Cover windows. Do not use exterior lighting. Do not use vehicle horns or alarms. Do not run generators overnight.

DO NOT approach standing water of any depth.
DO NOT gather in groups outdoors.
DO NOT approach any unidentified figure.

This advisory supersedes Advisory 1.`,
  u:10, flags:['tormentor_noise_light'] },

{ id:'n27', day:9, movement:3, source:'WKRV 9 Tidewater', time:'6:02 PM',
  headline:'"Do not approach" replaces "do not look directly at" in updated advisory',
  body:`The fourth line of Advisory 1 asked residents not to look directly at unidentified figures. Advisory 3 asks residents not to approach them.

Asked about the change, a VDEM spokesperson said the advisories are "reviewed for clarity at each issue."

The station has been contacted by nineteen viewers about that line.`,
  u:6, flags:['anguish_dont_look'] },

{ id:'n28', day:10, movement:3, source:'WKRV 9 Tidewater', time:'7:40 AM',
  headline:'Ocean View, Willoughby, East Beach: no further updates',
  body:`The city has removed Ocean View, Willoughby and East Beach from its status page.

A note on the page says those areas are "not currently being assessed."

The page has not been updated for eleven other neighbourhoods since Tuesday.`,
  u:4, flags:['city_composition'] },

{ id:'n29', day:10, movement:3, source:'AP wire', time:'1:15 PM',
  headline:'Wilmington: county emergency management "no longer operating"',
  body:`New Hanover County emergency management is no longer operating, according to the North Carolina Department of Public Safety.

The county's three shelters and the convention centre stopped reporting on the ninth.

Approximately 9,000 people were sheltered at those four locations.`,
  u:7, flags:['congregation_crowds'] },

{ id:'n30', day:10, movement:3, source:'WKRV 9 Tidewater', time:'6:00 PM',
  headline:'Norfolk status: eleven districts unassessed',
  body:`Eleven of the city's nineteen districts are listed as unassessed.

Park Place — where you are — has been listed as unassessed since the seventh.

Asked whether unassessed means unreachable, the city spokesperson said it means unassessed.`,
  u:5, flags:['city_composition','city_no_evac'] },

{ id:'n31', day:11, movement:3, source:'VDEM Advisory', time:'5:00 AM',
  headline:'ADVISORY 7: Remain indoors. Do not respond to voices from the street.',
  body:`Residents are advised to remain indoors at all times.

DO NOT respond to voices calling from the street, including familiar voices.
DO NOT open exterior doors for any reason.
DO NOT approach standing water.
Minimise light and sound after dark.

If you are able to travel inland, travel between 10 a.m. and 3 p.m. only, on interstate routes only, and do not stop.`,
  u:11, flags:['choir_bait','roadkill_never_leaves','tormentor_noise_light'] },

{ id:'n32', day:11, movement:3, source:'WKRV 9 Tidewater', time:'12:00 PM',
  headline:'Station reduces broadcast day to four hours',
  body:`WKRV will broadcast from 6 a.m. to 8 a.m. and 6 p.m. to 8 p.m. until further notice.

Outside those hours the station will carry emergency information on a loop.

Six of the station's staff are working. The general manager has been anchoring the evening.`,
  u:2 },

{ id:'n33', day:11, movement:3, source:'AP wire', time:'7:44 PM',
  headline:'FEMA collection points relocated inland for the third time',
  body:`Federal collection points at Franklin, Emporia and Lawrenceville have been moved west after what a FEMA statement called "site viability reassessments."

The new sites are at South Hill, Clarksville and Kenbridge.

FEMA has asked people arriving at the old sites not to wait there.`,
  u:5, flags:['congregation_crowds'] },

/* ================================================================== */
/* MOVEMENT 4 — THE LOOP.                                              */
/* ================================================================== */

{ id:'n34', day:12, movement:4, source:'WKRV 9 Tidewater', time:'6:00 AM',
  headline:'EMERGENCY INFORMATION — repeating',
  body:`Remain indoors.

Do not travel between 8 p.m. and 6 a.m.
Do not approach standing water.
Do not respond to voices from the street.
Minimise light and sound after dark.

If you require medical assistance, there is no number to call at this time.

This message repeats.`,
  u:2, loop:true },

{ id:'n35', day:12, movement:4, source:'WKRV 9 Tidewater', time:'6:00 PM',
  headline:'EMERGENCY INFORMATION — repeating',
  body:`Remain indoors.

Do not travel between 8 p.m. and 6 a.m.
Do not approach standing water.
Do not respond to voices from the street.
Minimise light and sound after dark.

If you require medical assistance, there is no number to call at this time.

This message repeats.`,
  u:0, loop:true },

{ id:'n36', day:13, movement:4, source:'WKRV 9 Tidewater', time:'—',
  headline:'EMERGENCY INFORMATION — repeating',
  body:`Remain indoors.

Do not travel between 8 p.m. and 6 a.m.
Do not approach standing water.
Do not respond to voices from the street.

If you require medical assistance, there is no number to call at this time.

This message repeats.`,
  u:0, loop:true },

{ id:'n37', day:13, movement:4, source:'WKRV 9 Tidewater', time:'—',
  headline:'The loop is ninety seconds and you have it memorised',
  body:`It is the same six lines and the same grey card and the same voice, which is not the anchor's voice and is not anybody's voice, and at the end of it there is a two-second gap before it starts again.

On the fourth run-through you notice the line about medical assistance has been removed.

Nobody removed it. There is nobody at the station.`,
  u:3, inner:true },

{ id:'n38', day:14, movement:4, source:'—', time:'—',
  headline:'TEST PATTERN',
  body:`Colour bars. A tone.

The tone is at 1 kHz and it does not stop, and after four minutes you understand that you are going to have to be the one who turns it off.`,
  u:1, pattern:true },

{ id:'n39', day:15, movement:4, source:'—', time:'—',
  headline:'SNOW',
  body:`Static.

It is the loudest thing in the apartment. It is louder than the fridge and louder than the pipes and it is louder than anything that has happened outside in six days.

You leave it on for eleven minutes because it is a sound a machine makes on purpose.`,
  u:1, snow:true },

{ id:'n40', day:15, movement:4, source:'—', time:'—',
  headline:'SNOW',
  body:`Static.`,
  u:0, snow:true },

];

/** Articles available on a given day, newest first. */
export function newsFor(day) {
  return NEWS.filter(n => n.day <= day).sort((a, b) =>
    b.day - a.day || NEWS.indexOf(b) - NEWS.indexOf(a));
}

/** What the set is doing right now — this drives how the TV screen renders. */
export function tvState(day) {
  if (day >= 15) return 'snow';
  if (day >= 14) return 'pattern';
  if (day >= 12) return 'loop';
  return 'live';
}

export default NEWS;
