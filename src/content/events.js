/**
 * events.js — the fifteen days, as a script.
 *
 * Act 1 is escalation you cannot act on. Uncollected trash, then a road
 * closed for flooding, then a collapse at night, then the dogs, then the
 * birds, then the sirens — not gradually, but between a Tuesday and a
 * Wednesday.
 *
 * Ninety percent of this game is boredom in a room you don't live in. The
 * openers are the texture, not filler.
 */

/** What he notices on waking. One per day. Plain, unliterary, exhausted. */
export const OPENERS = {
1:  `Your back has a new place that hurts. Ninth morning on this floor.

Ray is up. Ray is always up. There is coffee and there is not enough of it and he pretends that is on purpose.`,

2:  `The bins have not been collected. There are nineteen of them on this street and you have counted them twice this week, which is a thing you now do.`,

3:  `Ray says the road at the bottom of Colley is closed for flooding.

It has not rained since you got here.`,

4:  `Something came down in the night, a long way off. You woke up for it and Ray did not, which means Ray was already awake.

At breakfast he says it was probably a crane.`,

5:  `The dogs have stopped.

You did not notice them stopping. You noticed this morning that you were listening for one, which means some part of you noticed days ago and did not tell you.`,

6:  `Ray goes out at seven and comes back at nine with two bags and a face he has arranged.

He says the shop on Granby is open but you have to knock.`,

7:  `The birds are gone.

Not fewer. Gone. You stood at the window for eleven minutes and there was a sky with nothing in it.`,

8:  `Yesterday there were sirens all day. Today there are none.

Not fewer sirens. It is not a gradual thing. It was Tuesday and now it is Wednesday.`,

9:  `The water pressure is down to a dribble and the lights browned out twice before eight.

Ray is out. He left a note that says BACK BY DARK and nothing else, and he has never left a note in nine days.`,

10: `You wake up on the floor at seven and the apartment is quiet in a way it has not been quiet before, and you lie there for two minutes working out what is different.

His door is open.

The chain is off the front door. The two-by-four is leaning against the wall where he left it.

He is not here.`,

11: `Second morning. You know where the cups are now. You looked it up yesterday like a fact.

The fridge is his fridge. The mat is his mat. Everything in here belongs to somebody who is not in it.`,

12: `You slept four hours. Your hands are doing the thing.

The street below has been the same street for two days: bins, a car with a flat, the blue house.

The curtain in the blue house has not moved in the mornings since the seventh. You have started checking. You do not know when you started checking.`,

13: `You do the order without deciding to. News. Forum. Phone. Curtain.

Halfway through the phone you realise you did the curtain first today and it lands like somebody has hit you.`,

14: `There is no water at all now, just air in the pipe and a knocking.

You have not spoken out loud in two days. You test your voice and it is fine, and testing it was a strange thing to do, and you do not do it again.`,

15: `Fifteenth morning.

The keys are on the desk. They have been on the desk for five days and you have picked them up eleven times and put them down eleven times.

Whatever is left of what he brought back runs out today. You have known that since the tenth and today it stops being a thing you know and starts being today.`,
};

/**
 * Scheduled beats. `at` is an hour (24h float) or 'wake'.
 * Types are interpreted by systems/script.js.
 */
export const EVENTS = [

/* ---------------- ACT 1 ---------------- */
{ id:'e1a', day:1, at:11.0, type:'say',
  text:`Ray comes back from downstairs and says the man on the second floor has gone to his sister's in Newport News.

He says it like it is good news. He says a lot of things like that.` },

{ id:'e1b', day:1, at:20.5, type:'say',
  text:`Two of you eating cold rice out of the pan because the hotplate trips the breaker.

He says it's getting better. You say yeah. Neither of you has looked at the other one for about four minutes.` },

{ id:'e2a', day:2, at:15.0, type:'say', audio:'gull',
  text:`A gull on the wire outside for most of the afternoon. It is the loudest thing on the street.` },

{ id:'e2b', day:2, at:22.0, type:'say', audio:'dog_bark',
  text:`Dogs going, three or four streets over, all at once and then all at once not.` },

{ id:'e3a', day:3, at:13.5, type:'say',
  text:`On the news: a road closed for flooding, and a graphic of tide levels, and an anchor with a small worried smile.

Ray watches the whole segment without saying anything and then goes and checks the taps.` },

{ id:'e3b', day:3, at:23.5, type:'collapse', gap:9,
  text:`Something comes down a long way off. Not a bang — a building doing the thing buildings do when they stop.

Then quiet.

Then, after a while, another one, further away.` },

{ id:'e4a', day:4, at:9.0, type:'say',
  text:`The governor is on at nine. He says the word "situation" eleven times and never says what it is a situation with.

Ray counts them out loud, which is the first joke he has made in two days, and it is not a good one.` },

{ id:'e4b', day:4, at:23.0, type:'collapse', gap:4,
  text:`Two collapses. The gap between them is short.

You do not know yet why the length of the gap matters. You will not be told. You are simply going to start counting them, the way everyone does.` },

{ id:'e5a', day:5, at:8.5, type:'say',
  text:`No dog on the street this morning. No dog yesterday either, now that you think about it, and you are thinking about it.` },

{ id:'e5b', day:5, at:21.0, type:'say', audio:'siren_far',
  text:`Sirens for most of the evening, from the direction of the water. They are the ordinary kind. It is almost comforting and you catch yourself finding it comforting and stop.` },

{ id:'e6a', day:6, at:19.0, type:'say', audio:'gunfire_far',
  text:`Gunfire, briefly, some blocks north. Two shots, then a pause, then five together.

Then nothing at all for a long time. Ray turns the TV down without being asked.` },

{ id:'e6b', day:6, at:22.5, type:'brownout',
  text:`The lights dip, come back, dip again, and settle at something less than they were.` },

{ id:'e7a', day:7, at:7.5, type:'say',
  text:`No birds. You stand at the window for eleven minutes to be sure.

Ray comes and stands next to you and does not ask what you are looking at, which means he already knows.` },

{ id:'e7b', day:7, at:14.0, type:'say',
  text:`The tap runs brown for four seconds and then clear. Ray fills everything in the flat that holds water and does not explain why, and you help, and neither of you says anything about it.` },

{ id:'e8a', day:8, at:10.0, type:'say',
  text:`No sirens today. Not fewer. None.

You wait for one until about two in the afternoon and then stop waiting.` },

{ id:'e8b', day:8, at:21.5, type:'collapse', gap:11,
  text:`Collapse to the north. The gap is long.

You have started counting. You count eleven. You do not know what to do with the eleven.` },

{ id:'e9a', day:9, at:7.2, type:'say',
  text:`BACK BY DARK, on the back of an envelope, under a mug.

You read it about forty times over the course of the day, which is not enough times for it to become more than four words.` },

{ id:'e9b', day:9, at:16.0, type:'say',
  text:`The TV holds a channel for six seconds and then loses it, and finds it, and loses it.

The blue house across the street: the curtain in the upstairs window has not moved this morning. You are not sure why you know that it usually does.` },

{ id:'e9c', day:9, at:19.6, type:'handoff' },

/* ---------------- ACT 2 ---------------- */
{ id:'e10a', day:10, at:'wake', type:'actTwo' },

{ id:'e10b', day:10, at:12.0, type:'say',
  text:`You go through his room properly, which takes forty minutes and feels like the worst thing you have ever done.

There is a laptop. There is a legal pad. There is a drawer standing open with a folded cloth in it and a shape still pressed into the cloth.

The shotgun is downstairs against the wall where it has been since the first day.` },

{ id:'e11a', day:11, at:2.0, type:'gleaners',
  text:`There is something on the street below, three or four of them, low and unhurried, going through what the bins have become.

They are not looking at the building. They are not looking at anything. They are working.` },

{ id:'e11b', day:11, at:20.0, type:'say',
  text:`You cook, because you have eaten cold food for two days and you are going to cook.

The room is warm for about an hour afterwards. It is the nicest the apartment has been since you arrived.` },

{ id:'e11c', day:11, at:26.5, type:'crawler' },

{ id:'e12a', day:12, at:'wake', type:'texts' },

{ id:'e12b', day:12, at:23.0, type:'incursionTest',
  text:`Something is on the landing.

Not banging. Not trying the handle. Just there — a weight on a board that you have stood on a hundred times and know the sound of.

It is there for about ninety seconds and then it is not.` },

{ id:'e13a', day:13, at:21.0, type:'choir', index:0 },

{ id:'e13b', day:13, at:1.5, type:'silence',
  text:`The street has gone completely silent.

Not quiet. There has been quiet for a week. This is every small sound that was still out there stopping at the same moment, and staying stopped.` },

{ id:'e13c', day:13, at:1.8, type:'anguish' },

{ id:'e14a', day:14, at:'wake', type:'say',
  text:`The static from the TV is still going. You left it on. You do not remember leaving it on.` },

{ id:'e14b', day:14, at:22.0, type:'choir', index:1 },

{ id:'e14c', day:14, at:23.5, type:'collapse', gap:3, near:true,
  text:`Close. Two streets, maybe three. The window frame moves in the wall.

The gap is short. Something ran.` },

{ id:'e15a', day:15, at:'wake', type:'lastDay' },

{ id:'e15b', day:15, at:20.0, type:'finale' },

];

/** The Day 9 handoff — the hinge of the whole game. */
export const HANDOFF = [
`He comes back at twenty to eight with four bags and he is not out of breath, which is worse than if he were.

He puts everything on the counter and stands there with his hands on the edge of it for a second.`,

`Food for three weeks, which is more food than has been in this apartment since you got here.

And then the other thing, in a box that has been taped and re-taped, which he does not open and does not explain, and which he says will "keep the place off the map" if you use it right. You ask what that means. He says he'll show you tomorrow.`,

`Then he takes his keys out and puts them on the desk.

Then his wallet, next to the keys. Then a folded piece of paper with his sister's number on it, which you did not know he had a sister.

He says the car's a stick and you'll work it out. He says the shotgun's downstairs and it's loaded and he says don't fire it in the building, twice, in exactly the same words both times.

He is calm and he is clear and he does not explain any of it.`,

`And then he says he forgot one thing.

He says it the way you'd say it about milk.

He puts his coat on and takes the small one out of the drawer and puts it in his pocket and he says back in twenty minutes, and the chain goes on the door behind him from the outside because that is how the chain works.

That was fifty minutes ago. It is dark now.`,
];

export const LAST_DAY = `Whatever was in the box is finished.

You do not know what it was. You used it the way he showed you in a note he never wrote, which is to say you guessed, and you have been guessing for five days, and today the guessing stops mattering.

Tonight the apartment is just an apartment.`;

export default EVENTS;
