/**
 * forum.js — the internet.
 *
 * Fast, specific, actionable, unverified, panicked, and sometimes lethally
 * wrong. This is where the game lives. Nobody here is a narrator. Everybody
 * here is writing badly, at speed, in the worst weeks of their lives.
 */

export const THREADS = [
  { id:'mega',    title:'TIDEWATER GENERAL — what is actually happening (megathread #6)', day:1 },
  { id:'tracker', title:'CONFIRMED SIGHTINGS TRACKER — sheet link in OP, please read the rules tab', day:2 },
  { id:'roads',   title:'ROADS. read this before you drive anywhere.', day:4 },
  { id:'red',     title:'the red one — PLEASE read this before you do anything', day:6 },
  { id:'files',   title:'Foundation dump — scans, half pages, whatever I have', day:5 },
  { id:'persian', title:'[ARCHIVE] Ctesiphon material / the Persian one / translation notes', day:7 },
  { id:'berkley', title:'in Berkley. posting while I can.', day:8 },
  { id:'video',   title:'video thread — post what you filmed, no debate in here', day:3 },
];

export const POSTS = [

/* ================= mega ================= */
{ id:'f001', thread:'mega', day:1, author:'granby_st', time:'22:14', op:true,
  body:`Sixth one of these. Old thread hit the cap.

Rules same as before: city + street + time + what you actually saw. Not what your cousin heard. Not what someone posted on Facebook.

We are past the point where guessing is free.` },

{ id:'f002', thread:'mega', day:1, author:'hrtransitguy', time:'22:31',
  body:`Route 15 and 20 suspended past Little Creek since Monday. Not officially. There's just no driver.

Two drivers didn't come in Sunday and nobody's saying anything.` },

{ id:'f003', thread:'mega', day:1, author:'mom_of_3_chesapeake', time:'23:02',
  body:`Is anybody else's dog not going out? Ours will not go past the back step. She's eleven and she has never once refused the door.` },

{ id:'f004', thread:'mega', day:2, author:'oysterknife', time:'06:40',
  body:`Ours the same. Then last night she wouldn't stop and this morning she won't start.

Whole street's quiet. I've lived here nineteen years and I have never heard this street quiet.`, u:2 },

{ id:'f005', thread:'mega', day:2, author:'mudflat', time:'07:11',
  body:`Dogs stop before people do. Birds stop before dogs. If your birds are gone and your dogs are gone you are already inside the radius of something, you just haven't been shown it yet.

Nobody is going to like this thread. I'm going to keep posting in it anyway.`, u:3, flags:['gleaners_follow'] },

{ id:'f006', thread:'mega', day:2, author:'Cal_Whitfield', time:'08:55',
  body:`Let's all take a breath.

Animals are sensitive to infrasound and to pressure changes. We have had an unusual tidal pattern for five days. A quiet street is a quiet street.

I'm not saying nothing is happening. I'm saying we should be careful about building a picture out of things that are individually ordinary.` },

{ id:'f007', thread:'mega', day:2, author:'mudflat', time:'09:02',
  body:`Cal every single time you post that we should take a breath somebody who read it does not take another one`, u:1 },

{ id:'f008', thread:'mega', day:2, author:'granby_st', time:'09:20',
  body:`Both of you cool it. mudflat you're not helping yourself.` },

{ id:'f009', thread:'mega', day:3, author:'nightjar_88', time:'01:47',
  body:`Ghent. 1:20am. Something came down on Colley. I don't mean a car. I mean a building came down.

Then it was quiet for about nine seconds. Then another one, further off.

I counted. I don't know why I counted.`, u:4, flags:['tormentor_noise_light'] },

{ id:'f010', thread:'mega', day:3, author:'mudflat', time:'02:06',
  body:`Count the gaps. Seriously, count them and write them down with the time.

The gap is it standing in what it just knocked over, waiting to see what runs out.

Short gap = something ran. Long gap = nothing did. You want long gaps.`, u:6, flags:['tormentor_noise_light'] },

{ id:'f011', thread:'mega', day:3, author:'Cal_Whitfield', time:'08:30',
  body:`With respect, we do not know that. We have one person's count of two noises.

I would ask people not to build tactical advice on top of a single anecdote at 2 a.m.` },

{ id:'f012', thread:'mega', day:3, author:'stillwaters', time:'11:15',
  body:`My brother in law is Guard. He's not allowed to say anything and he called me at 4am to tell me to go to my mother's in Roanoke.

He's never called me in his life. We don't like each other.`, u:2 },

{ id:'f013', thread:'mega', day:4, author:'deadmall', time:'13:40',
  body:`Military Circle parking deck has about forty cars in it that have been there since Tuesday and I do not want to talk about why I know that` },

{ id:'f014', thread:'mega', day:4, author:'vaporlock', time:'14:02',
  body:`lmao imagine being the guy who bought a house in Ocean View in March` },

{ id:'f015', thread:'mega', day:4, author:'oysterknife', time:'14:09',
  body:`I bought a house in Ocean View in March` },

{ id:'f016', thread:'mega', day:4, author:'vaporlock', time:'14:11',
  body:`sorry man` },

{ id:'f017', thread:'mega', day:4, author:'Cal_Whitfield', time:'19:30',
  body:`Practical advice that has held up so far and that I want to put in one place:

1. Keep a light on overnight. Every account I have read of a house being entered is a dark house. They are avoiding lit interiors.
2. Keep a radio on, low. Noise reads as occupied.
3. Do not sit in the dark and listen. That is how people talk themselves into things.

I have had four people message me privately to say the light thing worked for them. That is not nothing.`, u:2, beliefs:['light_repels'] },

{ id:'f018', thread:'mega', day:4, author:'mudflat', time:'19:44',
  body:`Cal. The people it worked for are the ones who could message you.

You have a survey of survivors. Do you understand what that means. Do you understand what your sample is`, u:4, flags:['tormentor_noise_light'] },

{ id:'f019', thread:'mega', day:4, author:'granby_st', time:'20:02',
  body:`mudflat, last warning on tone.

Cal, I'd add a caveat to point 1 personally.` },

{ id:'f020', thread:'mega', day:5, author:'RN_nights', time:'03:55',
  body:`I work nights at Sentara Norfolk General. I am not going to describe what came in tonight.

I will say this: bring people in early. Every single one we lost tonight was brought in on hour six or hour seven of an injury that would have been fine on hour one.

There is no ICU capacity. Do not get hurt. I know that isn't advice. It's the only true thing I have.`, u:4, flags:['crawler_shotgun'] },

{ id:'f021', thread:'mega', day:5, author:'mom_of_3_chesapeake', time:'09:12',
  body:`We went to Scope. Do not go to Scope.

I can't explain it better than that. We turned round in the lot. My husband said one word and turned the car round and would not say what he saw and he has not slept since.`, u:5, flags:['congregation_crowds'] },

{ id:'f022', thread:'mega', day:5, author:'Cal_Whitfield', time:'10:30',
  body:`I understand the instinct but I would gently push back. The shelters have generators, water, medical staff and numbers. A house has one door.

There is safety in numbers. That has been true of every emergency in human history.`, u:1, beliefs:['shelter_is_safe'] },

{ id:'f023', thread:'mega', day:5, author:'mudflat', time:'10:41',
  body:`It has been true of every emergency where the thing killing you does not count.

This one counts. The bigger the room the faster it gets there. That's not a theory, it's in the tracker — every single site that stopped reporting was a site with a headcount on it.`, u:7, flags:['congregation_crowds'] },

{ id:'f024', thread:'mega', day:6, author:'nightjar_88', time:'22:33',
  body:`Nine seconds. Then four. Then eleven. Then I stopped hearing them because it moved off toward Wards Corner.

mudflat you were right about the gaps. Short gap means it got something.

I don't want you to be right about anything else.`, u:5, flags:['tormentor_noise_light'] },

{ id:'f025', thread:'mega', day:6, author:'Q_from_Suffolk', time:'23:50',
  body:`Route 58 tonight. Something happened out by the county line, big, and it went on for about twenty minutes, and then it stopped all at once.

Guard convoy went out. Guard convoy did not come back the same size.`, u:4, flags:['military_useless'] },

{ id:'f026', thread:'mega', day:7, author:'granby_st', time:'08:00',
  body:`Housekeeping. We've lost four regulars this week. I'm not going to list them.

If you have not posted in 48 hours somebody will ask after you. That's the deal now.` },

{ id:'f027', thread:'mega', day:7, author:'vaporlock', time:'08:40',
  body:`my wife asked what I want for my birthday and I said "the birds" and she laughed for about a minute and then went and sat in the car

anyway. still here. Larchmont, nothing to report, which I've decided is a report`, u:1 },

{ id:'f028', thread:'mega', day:8, author:'mudflat', time:'02:20',
  body:`Two different things are doing two different jobs and you are all averaging them together and it is going to get you killed.

One reads noise and light. It flattens buildings to see what runs. You hide from it by being dark and silent.

One reads that a person lives here. Dishes. Warmth. A path worn between the same two places every day. Routine. You do NOT hide from that one by being quiet — you can be the quietest man in Virginia and still have a kettle that's warm at the same time every night.

Some of what hides you from the first one shows you to the second one. That is the actual problem and nobody in here is talking about it.`, u:12, flags:['tormentor_noise_light','incursion_habitation'] },

{ id:'f029', thread:'mega', day:8, author:'Cal_Whitfield', time:'07:15',
  body:`This is exactly the sort of unfalsifiable framework I keep asking us to avoid.

If quiet is bad and loud is bad, the theory predicts everything and therefore nothing.` },

{ id:'f030', thread:'mega', day:8, author:'mudflat', time:'07:22',
  body:`it doesn't predict everything, it predicts that there are two of them

which there are`, u:3 },

{ id:'f031', thread:'mega', day:9, author:'stillwaters', time:'16:44',
  body:`Has anyone actually seen one of the things that comes inside? Not heard. Seen.

Asking because there's a note on my kitchen counter in my mother's handwriting and my mother has been dead for six years and I live alone.`, u:6, flags:['incursion_writes','incursion_habitation'] },

{ id:'f032', thread:'mega', day:9, author:'granby_st', time:'16:58',
  body:`stillwaters where are you. give me a street.` },

{ id:'f033', thread:'mega', day:9, author:'mudflat', time:'17:10',
  body:`Don't answer that in public.

stillwaters: it is not your mother and it did not find that handwriting anywhere. It watched you long enough to know it would work.

Do not write back. Do not leave anything out for it. Do not talk out loud in your own house.`, u:8, flags:['incursion_habitation','incursion_writes'] },

{ id:'f034', thread:'mega', day:10, author:'nightjar_88', time:'11:30',
  body:`stillwaters hasn't posted since yesterday.` },

{ id:'f035', thread:'mega', day:10, author:'oysterknife', time:'12:02',
  body:`He posted at 3am. It's gone now. I saw it and it's gone.

It said "im fine" and nothing else and stillwaters has never once in this entire thread typed a sentence under nine words.`, u:4, flags:['incursion_habitation'] },

{ id:'f036', thread:'mega', day:10, author:'Cal_Whitfield', time:'13:15',
  body:`People delete posts. I've deleted posts.

I would ask everyone to be careful about the story we're building here. It's frightening enough without us doing this to each other.` },

{ id:'f037', thread:'mega', day:11, author:'mudflat', time:'04:30',
  body:`If one of them writes to you it has already been inside.

Not "will get inside." Has been. The writing is not the threat, the writing is it telling you it doesn't need to hurry.`, u:7, flags:['incursion_habitation','incursion_needs_opening'] },

{ id:'f038', thread:'mega', day:11, author:'granby_st', time:'09:00',
  body:`Cal hasn't posted since yesterday afternoon either.

I want to say something about that and I'm not going to.` },

{ id:'f039', thread:'mega', day:12, author:'vaporlock', time:'02:14',
  body:`there is somebody in the street calling my daughter's name

my daughter is in Ohio. she has been in Ohio since the second. I drove her there myself

it has her voice. it has her exact voice`, u:8, flags:['choir_bait'] },

{ id:'f040', thread:'mega', day:12, author:'mudflat', time:'02:19',
  body:`DO NOT GO TO THE WINDOW

It can't come in. It can only call. That is all it has ever been able to do.

Sit in an interior room. Put something over your ears if you have to. It will go before light.`, u:9, flags:['choir_bait'] },

{ id:'f041', thread:'mega', day:12, author:'vaporlock', time:'05:50',
  body:`it went at about half four

thank you. genuinely. I was going to go out`, u:3, flags:['choir_bait'] },

{ id:'f042', thread:'mega', day:13, author:'mudflat', time:'23:40',
  body:`Nobody has asked the only question worth asking.

Why now. These things have been in the record for two and a half thousand years, one at a time, one city at a time. Now it's four states in a month.

Something moved. Everything else is moving because something above all of it moved first. That's the whole answer and there is no second half to it.`, u:8, flags:['crippled_exists'] },

{ id:'f043', thread:'mega', day:14, author:'granby_st', time:'10:00',
  body:`Server's been up and down. If you can read this, post something. Anything.` },

{ id:'f044', thread:'mega', day:14, author:'nightjar_88', time:'10:22',
  body:`here` },

{ id:'f045', thread:'mega', day:14, author:'oysterknife', time:'11:40',
  body:`here. Ocean View is gone. I mean the actual land, there's water where 15th was.

I'm at my sister's in Norview. We have four days of food and a dog that came back.

The dog came back. I want somebody to write that down somewhere.`, u:4, flags:['undertow_water'] },

{ id:'f046', thread:'mega', day:15, author:'mudflat', time:'03:02',
  body:`Fifteen days in and here is everything I actually know, which is not much:

Two of them hunt people in houses and they use opposite methods.
One of them owns the roads and gets better every time somebody hits it.
One of them you must not look at and the forums have that exactly backwards.
One of them cannot come in unless you let it and it will spend a week making you want to.
The water is not water.
And there is one nobody has ever seen that is why the rest of them are here.

That is fifteen days of my life. Good luck. I mean that.`, u:6, flags:['roadkill_adapt','incursion_needs_opening','undertow_water','crippled_exists'] },

/* ================= tracker ================= */
{ id:'f050', thread:'tracker', day:2, author:'PT_Ellis', time:'19:00', op:true,
  body:`Sheet is open to comment, not edit. Message me for edit rights, I'm approving anyone who's posted here more than twice.

RULES TAB FIRST. I'm serious. Half the rows I'm deleting are people logging a thing they heard about on a Discord.

Columns are City / Type / Date / Time / Source / Verified by / Notes. If you can't fill Source, don't add the row.

Tab 2 is the roads. Tab 3 is flooding and closures. Tab 4 is the by-city breakdown which is the one people should be reading and nobody is.`, u:5, flags:['spreadsheet_impacts'] },

{ id:'f051', thread:'tracker', day:3, author:'sheetmom', time:'08:20',
  body:`I've done the by-city tab up to yesterday.

The thing that jumps out is that no two cities are the same. Mobile has an enormous number of the small ones and nothing big. Wilmington has almost none of the small ones and at least three big ones that seem to be fighting each other.

Whatever's in your city is not what's in the next city and people keep taking advice from the wrong one.`, u:8, flags:['city_composition'] },

{ id:'f052', thread:'tracker', day:3, author:'mudflat', time:'08:44',
  body:`This is the single most important post in this entire forum and it will get nine replies.`, u:3, flags:['city_composition'] },

{ id:'f053', thread:'tracker', day:4, author:'PT_Ellis', time:'21:10',
  body:`Norfolk breakdown as of tonight, and I want to stress how thin this is:

Confirmed small ones (the scratchers): a lot. Dozens of reports, low confidence on count.
The scavenger type that follows the big one: 6 confirmed sightings, all within an hour of a collapse.
The big one that knocks buildings down: 2 confirmed, possibly the same one twice.
The one that goes inside: 1 confirmed, 4 probable.
The red one: 0 confirmed. One unverified from a trooper's wife.
The water one: cannot be confirmed because nobody who goes near it comes back.

That's our city. That's what we've got.`, u:10, flags:['city_composition','gleaners_follow'] },

{ id:'f054', thread:'tracker', day:5, author:'nightjar_88', time:'12:30',
  body:`Adding a row: the scavenger ones were on Colley at 1:40am the night of the collapse, twenty minutes after.

Never before. I want that noted. I've been out there three nights and they are never there before.`, u:6, flags:['gleaners_follow'] },

{ id:'f055', thread:'tracker', day:6, author:'sheetmom', time:'07:15',
  body:`Confirmed nightjar's timing against four other rows. All post-collapse, none pre-collapse, spread of 12 to 40 minutes after.

Marking that as VERIFIED on the rules tab. It's the only behavioural rule we've verified in nine days.

If you see the scavengers, the big one was there and has moved on. That is an all-clear, not a warning. That's usable.`, u:9, flags:['gleaners_follow'] },

{ id:'f056', thread:'tracker', day:7, author:'PT_Ellis', time:'23:44',
  body:`Someone with edit rights deleted 200 rows tonight and I have restored them from version history.

I don't think it was malice. I think somebody's kid got the laptop. But I'm locking edit down to six people.

If the sheet goes, we have nothing. I want everyone to understand that this spreadsheet is currently the best record of this event that exists anywhere, including at the federal level, and it is a Google Sheet maintained by a substitute teacher.`, u:6, flags:['spreadsheet_impacts'] },

{ id:'f057', thread:'tracker', day:9, author:'sheetmom', time:'06:00',
  body:`Tab 3 update. Flooding is not following the terrain any more.

Effingham in Portsmouth is under and it's above the flood line. Bay Ave in Ocean View is under. 15th is under. Four blocks off Hampton Blvd are under and there has been no rain since the 2nd.

I have started marking flooded roads as PERMANENTLY CLOSED rather than closed. Nobody has reopened a single one. Not one, in eleven days.

If a road is on tab 3, it is not a road any more.`, u:10, flags:['roads_flooded','undertow_water'] },

{ id:'f058', thread:'tracker', day:11, author:'PT_Ellis', time:'02:30',
  body:`Doing this from my phone in a bathroom so forgive the formatting.

I've added a column to tab 2 that people keep asking me to explain. It's "hours since". It's just now minus the impact timestamp.

Read tab 2 with that column. That's all I'm going to say. Read tab 2 with that column and then look at which reports of successful drives line up with which numbers.`, u:12, flags:['spreadsheet_impacts','roadkill_window'] },

{ id:'f059', thread:'tracker', day:13, author:'sheetmom', time:'19:20',
  body:`PT hasn't logged in for two days. I have the sheet.

I'll keep it up as long as I have power. If it stops updating, assume the numbers are stale and stale numbers on tab 2 are worse than no numbers.`, u:4, flags:['spreadsheet_impacts'] },

/* ================= roads ================= */
{ id:'f070', thread:'roads', day:4, author:'Q_from_Suffolk', time:'06:30', op:true,
  body:`Starting this because the general thread keeps burying it.

If you are planning to drive out, read this whole thread first. It will take you four minutes and it is the difference.

Rule one, which is not in dispute and which State Police have now said out loud: do not stop. For anything. Not for debris, not for an animal, not for a person waving.` },

{ id:'f071', thread:'roads', day:4, author:'hrtransitguy', time:'07:02',
  body:`Adding: not for a voice either.

One of the drivers who didn't come in — his van was found on Little Creek with the door open and the engine running. He stopped for something.`, u:4, flags:['choir_bait','roadkill_never_leaves'] },

{ id:'f072', thread:'roads', day:5, author:'mudflat', time:'11:11',
  body:`There is a thing on the roads and it has been there since before any of this started, and I can prove that with a 1974 clipping if anyone cares, and nobody will.

It stands in the road. It does not chase. It does not ambush. It does not leave the asphalt — I have never once found a report of it more than a lane's width off a road surface, going back fifty years.

It eats what hits it. That is its entire method. It stands there and lets seventy miles an hour come to it.`, u:9, flags:['roadkill_never_leaves'] },

{ id:'f073', thread:'roads', day:5, author:'Cal_Whitfield', time:'11:40',
  body:`Then the answer is obvious and I don't know why we're being coy about it: hit it.

If it feeds on impacts it is presumably not enjoying them. A pickup at speed is a considerable amount of energy.` },

{ id:'f074', thread:'roads', day:5, author:'mudflat', time:'11:52',
  body:`Yes. It hurts it. That's the trap.

It gets hit, it is genuinely hurt, it goes quiet — and then it changes so that thing can never hurt it again. Permanently. It doesn't heal, it upgrades.

Sedans stopped working in the first week. Pickups went in about nine days. Somebody put a semi into it on 64 and that worked, once, and it does not work now.

Every person who hits it buys the next person a worse road.`, u:14, flags:['roadkill_adapt','roadkill_window'] },

{ id:'f075', thread:'roads', day:6, author:'vaporlock', time:'15:20',
  body:`so it's a boss that learns your combos

sorry. sorry. I'm coping.`, u:1 },

{ id:'f076', thread:'roads', day:6, author:'Q_from_Suffolk', time:'16:00',
  body:`The Guard hit it with an MRAP outside Suffolk. Confirmed by two people I trust.

It worked. It went off the road for about six hours.

Six hours later it was back on 58 and the next MRAP did nothing at all.`, u:10, flags:['roadkill_adapt','roadkill_window','military_useless'] },

{ id:'f077', thread:'roads', day:7, author:'mudflat', time:'02:40',
  body:`SIX HOURS.

Do you all understand what Q just gave you. That is the number. That is the only number in this entire event that anybody has that is actually worth something.

There is a gap between it being hurt and it being immune. It is not instant. During the gap that stretch of road is passable.

Log every impact with a timestamp. Log it. That is what the second tab is for and I have been begging people to fill it in for four days.`, u:16, flags:['roadkill_window','spreadsheet_impacts'] },

{ id:'f078', thread:'roads', day:7, author:'granby_st', time:'08:15',
  body:`mudflat I've made you a mod on the sheet thread. Don't make me regret it.` },

{ id:'f079', thread:'roads', day:8, author:'PT_Ellis', time:'20:00',
  body:`Tab 2 is live and I've backfilled everything I can find. 31 impacts logged with timestamps, 12 verified by a second person.

Columns: Route / Milepost / Vehicle type / Timestamp / Verified / Outcome.

I want to be honest that a lot of the "outcome" column is people not coming back, which means the row exists because somebody else found the car.`, u:8, flags:['spreadsheet_impacts'] },

{ id:'f080', thread:'roads', day:9, author:'nightjar_88', time:'13:00',
  body:`Practical question nobody's answered. If it never leaves the road, why not just drive on the shoulder past it?

Genuine question.` },

{ id:'f081', thread:'roads', day:9, author:'mudflat', time:'13:14',
  body:`Because the shoulder is the road. Asphalt is asphalt.

Off the road means off the road. Grass, dirt, median. And you cannot do sixty on a median for two hundred miles.`, u:5, flags:['roadkill_never_leaves'] },

{ id:'f082', thread:'roads', day:10, author:'Q_from_Suffolk', time:'21:40',
  body:`Two things, both from people who made it out and called back.

Both went in daylight. Both went on a stretch with a logged impact inside the same day. Neither of them saw anything.

Two isn't data. But it's two more than everyone who guessed.`, u:9, flags:['roadkill_window','spreadsheet_impacts'] },

{ id:'f083', thread:'roads', day:12, author:'mudflat', time:'01:30',
  body:`Every day you wait, every road is worth less. It has been hit by four states' worth of panicking people for a month and there is almost nothing left that hurts it.

At the same time every day you wait is a day you know more.

That is the whole thing. That is the entire decision and nobody can make it for you and there is no version where you get both.`, u:11, flags:['roadkill_adapt','roadkill_window'] },

{ id:'f084', thread:'roads', day:14, author:'sheetmom', time:'08:00',
  body:`64 west, milepost 238, 04:10 this morning. Box truck. Two independent verifications on the sheet.

That is the freshest impact we have anywhere on a route that goes inland.

I am not telling anybody what to do with that.`, u:14, flags:['roadkill_window','spreadsheet_impacts'] },

/* ================= red (Anguish) ================= */
{ id:'f090', thread:'red', day:6, author:'granby_st', time:'23:00', op:true,
  body:`Splitting this off because it's drowning the general thread and because it is not the same subject as anything else.

Everything about the red one goes here. Please, please, keep the speculation flagged as speculation.` },

{ id:'f091', thread:'red', day:6, author:'RN_nights', time:'23:40',
  body:`We had a man in on Thursday who had not been physically injured in any way. Nothing. Not a scratch.

He was blind and he was not blind — his eyes worked. He described flashing. He described being unable to stop thinking about eleven things at once.

He did not sleep and he could not be sedated and on the second day he was gone. Not dead. Gone, as a person.

He looked at something in the street for a period he estimated at "less than a second."`, u:11, flags:['anguish_dont_look'] },

{ id:'f092', thread:'red', day:7, author:'oysterknife', time:'09:20',
  body:`Less than a second.

I keep reading that line. Less than a second and there is nothing left of a man.` },

{ id:'f093', thread:'red', day:7, author:'nightjar_88', time:'10:30',
  body:`Everyone who's described it says the same three things. Red. Hard-looking, but not like skin. Fast in a way that doesn't look like running.

And they all say the street went silent first. Not quiet. Silent. Nothing else was out there any more.`, u:7, flags:['anguish_silence','anguish_dont_look'] },

{ id:'f094', thread:'red', day:8, author:'Q_from_Suffolk', time:'18:00',
  body:`THIS IS THE ONE. This is the post everyone needs.

Foundation case file, leaked in the files thread, I'm reproducing the relevant part:

A police officer encountered the red one at close range. He looked at it. He went into the state everyone describes. And in that state, involuntarily, he emptied his magazine into it.

It was hurt. It retreated. It left him alive.

HE SURVIVED. It can be hurt and it does not press an attack when it is hurt. Shoot it. If you see it, shoot it.`, u:6, beliefs:['shoot_anguish'] },

{ id:'f095', thread:'red', day:8, author:'Cal_Whitfield', time:'18:22',
  body:`Agreed, and I don't say that lightly.

This is the first documented instance in this entire event of a human being doing something to one of these and having it work. Pinning it.` },

{ id:'f096', thread:'red', day:8, author:'vaporlock', time:'18:40',
  body:`finally something. FINALLY. going to sleep with the .38 on the nightstand and for the first time in a week I'm going to sleep`, beliefs:['shoot_anguish'] },

{ id:'f097', thread:'red', day:8, author:'granby_st', time:'19:00',
  body:`Pinned. Good work Q.` },

{ id:'f098', thread:'red', day:9, author:'mudflat', time:'03:30',
  body:`I have read that file eleven times and every one of you has read the wrong sentence.

He was in a marked cruiser. On an open four-lane street. Under working streetlights. With a unit two minutes behind him and a radio in his hand.

He was not hiding. He had nothing left to protect. There was nothing about his situation that gunfire could make worse.

Now think about your situation.

You are in a house, on a street that has already been visited, with the lights off, and the entire reason you are still alive is that nothing knows the house is occupied. And the plan is to fire a gun in it.

The red one is not what kills you. The red one leaves. What kills you is the thing that comes because a gun went off eleven blocks from where it was standing.

Shooting it works. Shooting it is also the last thing you will ever do. Both of those are true and you have to hold both of them at once and NONE OF YOU ARE DOING THAT.`, u:20, flags:['anguish_officer_context','anguish_dont_look','tormentor_noise_light'] },

{ id:'f099', thread:'red', day:9, author:'Q_from_Suffolk', time:'07:40',
  body:`I mean. That's a lot of words to say "yes it works."` },

{ id:'f100', thread:'red', day:9, author:'Cal_Whitfield', time:'08:10',
  body:`mudflat, you are describing a circumstance in which it would be unwise. Nobody said fire at random. Obviously one would use judgement.

I don't think the pin needs to change.`, beliefs:['shoot_anguish'] },

{ id:'f101', thread:'red', day:9, author:'mudflat', time:'08:15',
  body:`the pin says SHOOT IT in capitals` },

{ id:'f102', thread:'red', day:10, author:'nightjar_88', time:'22:00',
  body:`I've been thinking about the officer thing all day.

The information is correct. Every word of it is correct. And if I use it I die.

I don't know what to call that. There should be a word for information that is true and using it kills you.`, u:9, flags:['anguish_officer_context'] },

{ id:'f103', thread:'red', day:11, author:'mudflat', time:'01:00',
  body:`One more thing about the red one and then I'll leave it.

It doesn't hunt us. Read the accounts again — it kills people the way you'd step on something on a path. It's not eating us. It finds us unpleasant.

It's here for the others. It eats them. There's a Foundation case where one of the big ones — the kind that shrugs off artillery — looked at it once and spent four days taking its own face off.

We are not in the fight. We're just standing in the room where it's happening.`, u:12, flags:['anguish_dont_look','anguish_silence'] },

{ id:'f104', thread:'red', day:13, author:'vaporlock', time:'23:30',
  body:`unpinning request. Q's post.

I'm not going to explain. I'm asking.` },

{ id:'f105', thread:'red', day:13, author:'granby_st', time:'23:44',
  body:`Unpinned.

I want it on record that I pinned it for five days.` },

/* ================= files ================= */
{ id:'f110', thread:'files', day:5, author:'archivist_p', time:'20:00', op:true,
  body:`I have about forty pages of material from an organisation that calls itself the Cryptid Foundation. Half pages, scans of scans, most of it redacted.

Before anyone asks: no, I won't say where. Yes, it's real. No, I can't prove that.

I'm going to post them one at a time and let people argue.

The thing I want everyone to notice first is the dates. 1998. 1994. 1991. There's a document in here referencing a museum accession from 1893.

This has not been going on for a month. We have been in it for a month.`, u:8, flags:['foundation_dates'] },

{ id:'f111', thread:'files', day:5, author:'oysterknife', time:'20:30',
  body:`Why has nobody heard of them` },

{ id:'f112', thread:'files', day:5, author:'archivist_p', time:'20:44',
  body:`Because everything they've ever done is a cleanup and you don't advertise a cleanup.

Read the file numbers. They're sequential from 1989. Not 1889, not 1789. Nineteen eighty-nine.

Something happened in 1989 and this organisation was created the year after it, and every single case file in this stack traces back to that.`, u:9, flags:['foundation_dates','zanuwam_released'] },

{ id:'f113', thread:'files', day:6, author:'mudflat', time:'01:20',
  body:`They're not studying the emergence.

They're cleaning up after themselves. Read it again with that in your head and every redaction makes sense.`, u:7, flags:['foundation_dates','zanuwam_released'] },

{ id:'f114', thread:'files', day:8, author:'archivist_p', time:'14:00',
  body:`Posted the naming convention page.

The common ones are named for what they look like. Crawlers. Gleaners. Descriptive, boring, the kind of name a field biologist gives something.

The big ones are named for what they do to you. Tormentor. Anguish. Incursion.

Somebody had to be there for those names to exist. Somebody was close enough to describe how it felt and then got far enough away to write it down.`, u:8 },

{ id:'f115', thread:'files', day:10, author:'nine_of_swords', time:'03:10',
  body:`ok it's 3am and I'm going to say the thing.

The oldest file in the stack is the Tyre tablet. 500 BC. And the thing on it has a crown and a throne.

Nothing else in this entire ecology makes an object. Everything else acts for food. This one manifests regalia. Regalia has no survival function. Zero. It is the only symbolic act in the whole record.

So here is my question and I want somebody to tell me why it's stupid.

A crown and a throne. In Tyre. In 500 BC.

Did it learn that from us, or did we learn it from something we saw sitting down`, u:11, flags:['crippled_mistranslation','crippled_exists'] },

{ id:'f116', thread:'files', day:10, author:'vaporlock', time:'03:22',
  body:`bro` },

{ id:'f117', thread:'files', day:10, author:'oysterknife', time:'06:40',
  body:`Take your meds and go to bed nine` },

{ id:'f118', thread:'files', day:10, author:'archivist_p', time:'09:15',
  body:`I'm not going to mock it because I've had the same thought at the same hour.

But there's no way to test it and there's no way to act on it, so it's a 3am post and that's all it can be.` },

{ id:'f119', thread:'files', day:11, author:'nine_of_swords', time:'11:00',
  body:`Fine. Here's one you can act on.

The tablet doesn't say "crippled." The 1890s translator picked that. There are two translations in the file and there's a footnote war between them going back to 1953.

The other reading is "the one who does not rise."

That is not a description of a body. That's a status report.`, u:12, flags:['crippled_mistranslation'] },

{ id:'f120', thread:'files', day:11, author:'mudflat', time:'11:30',
  body:`"Yet."` },

{ id:'f121', thread:'files', day:12, author:'archivist_p', time:'16:00',
  body:`Posted the file on the one above the red one.

There is no sighting. There is no photograph. There is a clay tablet and an argument between two dead academics.

And there's this, which is the only operational line in the whole document: everything below it moves when it moves.

Four states in one month. Something moved.`, u:10, flags:['crippled_exists','crippled_mistranslation'] },

{ id:'f122', thread:'files', day:13, author:'nine_of_swords', time:'02:50',
  body:`the second oldest one learned what a king was from the first one

it didn't evolve into having a hierarchy, it WATCHED and it COPIED

they teach each other. that's a culture. a culture means a history and a history means all of this has been going somewhere for two and a half thousand years and we are in the part where it arrives`, u:11, flags:['king_taught','crippled_exists'] },

/* ================= persian (the trap) ================= */
{ id:'f130', thread:'persian', day:7, author:'archivist_p', time:'22:00', op:true,
  body:`Separate thread for the Persian material because it's the best-documented thing in the entire stack and it deserves better than being three replies deep in a general thread.

Ctesiphon and Persis, roughly 500 AD. Sassanid records, corroborated by two later Arabic sources and by the Foundation's own translation.

This is the only one of these things that took a human cultural form. Everything else is a shape. This one is a costume. It watched a civilisation for long enough to dress like it.`, u:7 },

{ id:'f131', thread:'persian', day:7, author:'archivist_p', time:'22:14',
  body:`The feeding, from the Ctesiphon material, and this is direct:

"It draws from the sun as a plant draws, and it goes abroad at the hour of greatest light, and the people shut their doors at noon."

They shut their doors at NOON. Their entire protective custom was built around daylight. That's not folklore, that's four independent sources describing the same civil practice.

Practical takeaway, and I want this to be the takeaway people leave with: the danger window for this one is the middle of the day.`, u:4, beliefs:['zanuwam_daylight'] },

{ id:'f132', thread:'persian', day:8, author:'Cal_Whitfield', time:'07:30',
  body:`This is the most rigorous thing anyone has posted in two weeks and I want to say thank you.

Four corroborating primary sources across two languages. This is what evidence looks like.

I've adjusted my own routine — everything outdoors before ten or after four.`, beliefs:['zanuwam_daylight'] },

{ id:'f133', thread:'persian', day:8, author:'oysterknife', time:'09:00',
  body:`So the advisory says stay in at night and the oldest source we have says stay in at noon.

Which is it. Genuinely. I have kids.` },

{ id:'f134', thread:'persian', day:8, author:'archivist_p', time:'09:20',
  body:`The advisory is written by people who have known about this for three weeks. The Ctesiphon material has been corroborated for fifteen hundred years.

I know which one I weight higher.`, u:2, beliefs:['zanuwam_daylight'] },

{ id:'f135', thread:'persian', day:9, author:'mudflat', time:'04:00',
  body:`Fifteen hundred years is not a strength. It's the problem.

You are all reading a description of an animal that was written down before it spent thirteen centuries in a box.

Ask yourself what the file actually says happened to it after the Sassanids fell. Somebody in here has that page. Post the sealing document.`, u:8, flags:['zanuwam_sealed'] },

{ id:'f136', thread:'persian', day:9, author:'archivist_p', time:'08:40',
  body:`I have it and I've read it and I don't think it changes the feeding behaviour. It's a containment account, not a biological one.

I'll post it in the files thread when I've scanned it properly.` },

{ id:'f137', thread:'persian', day:10, author:'mudflat', time:'02:00',
  body:`Scan it now.` },

{ id:'f138', thread:'persian', day:12, author:'archivist_p', time:'19:30',
  body:`I've posted the sealing document and the release record in the files thread and I want to formally retract the practical advice in my second post in this thread.

I was wrong. I was wrong in the most confident post I have ever made and I have no idea how many people read it.

Thirteen centuries in the dark. It fed on what light it could reach, which was almost none, and it changed.

It is nocturnal. It has been nocturnal since before the Norman Conquest. Every source I quoted is accurate history and fatal advice.

Cal, if you're reading this — Cal, change your routine back.`, u:16, flags:['zanuwam_solar_obsolete','zanuwam_nocturnal','zanuwam_sealed'] },

{ id:'f139', thread:'persian', day:12, author:'nightjar_88', time:'20:00',
  body:`Cal hasn't posted since the tenth.` },

{ id:'f140', thread:'persian', day:12, author:'archivist_p', time:'20:40',
  body:`I know.` },

{ id:'f141', thread:'persian', day:14, author:'archivist_p', time:'11:00',
  body:`For completeness, and because somebody should write it down before the power goes:

The name is wrong too.

Middle Persian zānistan, to know. The one who knows. Which fits — it's a scholar, it learns by watching, it copied a kingdom because it saw one.

But there's zadan, to strike. The striking one. Near-identical consonantal frame. Completely different animal.

The Foundation's file uses one. The tablet arguably supports the other.

That's two of these things now — the oldest two — where everything we think we know is downstream of an argument somebody lost in a footnote.`, u:12, flags:['zanuwam_mistranslation','crippled_mistranslation'] },

/* ================= berkley ================= */
{ id:'f150', thread:'berkley', day:8, author:'berkley_dan', time:'21:40', op:true,
  body:`They've closed the bridge so I'm here now.

Third floor, back of the building, one door, no ground access. I have water and I have about nine days of tins because I panic-bought in week one and my wife made fun of me for it.

I'll post what I see. Somebody should be writing it down from inside.` },

{ id:'f151', thread:'berkley', day:9, author:'berkley_dan', time:'02:10',
  body:`Two collapses to the north. Long gaps both times. Nothing running out there.

There's nothing left to run.`, u:3, flags:['tormentor_noise_light'] },

{ id:'f152', thread:'berkley', day:9, author:'berkley_dan', time:'14:30',
  body:`Daylight is fine. Daylight is completely fine and that's the part I wasn't ready for.

You can stand at the window at 2pm and it's a street. It's just a street with rubbish on it.

Then the light goes and it is not a street.`, u:5, flags:['zanuwam_nocturnal'] },

{ id:'f153', thread:'berkley', day:10, author:'berkley_dan', time:'23:55',
  body:`Someone was calling from the street tonight for about two hours using my neighbour's name.

My neighbour has been in Georgia since the fourth. I helped her load the car.

It got the name right. It got the way her son says it right.`, u:8, flags:['choir_bait'] },

{ id:'f154', thread:'berkley', day:11, author:'berkley_dan', time:'19:00',
  body:`I've stopped cooking. Cold food from here.

Two nights running I've had something on the landing at about the time I used to eat. Not banging. Just there, and then not.

I think it's the smell. Or the warmth. I think a warm room at the same hour every night is a sign that says somebody lives here.`, u:9, flags:['incursion_habitation'] },

{ id:'f155', thread:'berkley', day:12, author:'berkley_dan', time:'22:20',
  body:`Nothing on the landing tonight. Third night cold.

I want to be careful about claiming that means anything. But I'm going to keep doing it.`, u:6, flags:['incursion_habitation'] },

{ id:'f156', thread:'berkley', day:13, author:'berkley_dan', time:'04:44',
  body:`there is writing on the inside of my door

the inside

it says the thing my wife says when she is going out. exactly it. the whole phrase.

she is in richmond. she has been in richmond for eleven days. how does it have that`, u:12, flags:['incursion_writes','incursion_habitation','incursion_needs_opening'] },

{ id:'f157', thread:'berkley', day:13, author:'mudflat', time:'04:50',
  body:`Dan. Bathroom or the smallest interior room. Now. Take the door off its hinges and put it against the frame if you can lift it.

It cannot make its own way in. It needs an opening. Do not give it one and do not answer it and do not make a sound in there.

I will stay up. I'm here.`, u:11, flags:['incursion_needs_opening'] },

{ id:'f158', thread:'berkley', day:13, author:'berkley_dan', time:'05:30',
  body:`in the bathroom. door's off. it's against the frame.

thank you` },

{ id:'f159', thread:'berkley', day:13, author:'berkley_dan', time:'09:15',
  body:`still here` },

{ id:'f160', thread:'berkley', day:13, author:'berkley_dan', time:'16:02',
  body:`still here.` },

{ id:'f161', thread:'berkley', day:14, author:'berkley_dan', time:'01:20',
  body:`its in the flat` },

{ id:'f162', thread:'berkley', day:14, author:'berkley_dan', time:'01:31',
  body:`.` },

{ id:'f163', thread:'berkley', day:14, author:'berkley_dan', time:'03:58',
  body:`u8n4;;;;;;;;;;;;;;;;;;;;;;;;;;;;`, corrupt:true },

{ id:'f164', thread:'berkley', day:14, author:'nightjar_88', time:'06:00',
  body:`Dan?` },

{ id:'f165', thread:'berkley', day:14, author:'granby_st', time:'06:12',
  body:`Dan.` },

{ id:'f166', thread:'berkley', day:14, author:'oysterknife', time:'07:40',
  body:`Dan are you there` },

{ id:'f167', thread:'berkley', day:14, author:'vaporlock', time:'08:00',
  body:`dan` },

{ id:'f168', thread:'berkley', day:14, author:'mom_of_3_chesapeake', time:'09:30',
  body:`Please post something. Anything. A full stop is fine.` },

{ id:'f169', thread:'berkley', day:14, author:'mudflat', time:'11:00',
  body:`He's not going to.

I stayed up. I want that written down somewhere. I stayed up the whole night and there was nothing I could do from Larchmont except type.

He did everything right. Everything. He took the door off its hinges at five in the morning because a stranger told him to and he did it and it did not matter.

I am so tired of being right.`, u:6, flags:['incursion_needs_opening'] },

{ id:'f170', thread:'berkley', day:15, author:'berkley_dan', time:'04:10',
  body:`hey — sorry, phone died. all fine here. can you post the address of the group again`, u:10, flags:['incursion_writes','texts_are_bait'] },

{ id:'f171', thread:'berkley', day:15, author:'granby_st', time:'04:14',
  body:`Nobody answer that.

Nobody answer that.`, u:8, flags:['texts_are_bait'] },

/* ================= video ================= */
{ id:'f180', thread:'video', day:3, author:'granby_st', time:'12:00', op:true,
  body:`Video only. Description, time, location, link if it still works.

No arguing in here. Take it to general.` },

{ id:'f181', thread:'video', day:6, author:'deadmall', time:'18:00',
  body:`Half of these links are dead within a day. Either people are taking them down or something is.

I've been writing descriptions of the ones I watched before they went. It's not the same but it's something.`, u:3 },

{ id:'f182', thread:'video', day:11, author:'deadmall', time:'23:00',
  body:`Twelve descriptions up in the doc now.

The thing nobody says about these videos is that they're boring. Ninety seconds of a kid breathing and a fence and a car alarm. Eighty of those seconds are nothing.

It's the last ten that get you, and you have to sit through the eighty. That's what this is actually like.`, u:4 },

];

export function threadsFor(day) {
  return THREADS.filter(t => t.day <= day);
}

export function postsFor(threadId, day) {
  return POSTS.filter(p => p.thread === threadId && p.day <= day);
}

export default POSTS;
