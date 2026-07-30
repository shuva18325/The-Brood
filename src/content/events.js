/**
 * events.js — the twenty days, as a script.
 *
 * ACT 1, days 1–10. Escalation you cannot act on. Uncollected trash, then a
 * road closed for flooding, then a collapse at night, then the dogs, then the
 * birds, then the sirens — not gradually, but between a Tuesday and a
 * Wednesday. Ray handles the outside world. The player is a guest with no
 * agency, and that is what makes Act 2 land.
 *
 * ACT 2, days 11–20. Ten days alone, in four movements:
 *
 *   11–13  DENIAL. He might come back. The phone still rings when you call
 *          it. You search his room, read his notes, and ration optimistically
 *          because there will be more food soon.
 *   14–16  THE TEXTS. Something writes from his number and gets better at it
 *          every day. Concealment is visibly dropping. Real hunger. His
 *          voicemail greeting is still cheerful.
 *   15–16  THE SURVIVOR AT THE DOOR. A human being knocks. Or does not.
 *   17–19  THE SQUEEZE. The adaptation reports worsen daily. The calls stop
 *          connecting. The keys are on the desk.
 *   20     THE FINALE.
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

9:  `Ray is on the phone in his room with the door shut, which he has not done once in eight days.

You can hear the shape of it and not the words. Twice he says the same short thing, and the second time he says it slower.

When he comes out he asks if you know how to drive a manual and then says never mind, forget it, and puts the kettle on.`,

10: `The water pressure is down to a dribble and the lights browned out twice before eight.

Ray is out. He left a note that says BACK BY DARK and nothing else, and he has never left a note in ten days.`,

/* ---- ACT 2 ---- */

11: `You wake up on the floor at seven and the apartment is quiet in a way it has not been quiet before, and you lie there for two minutes working out what is different.

His door is open.

The chain is off the front door. The two-by-four is leaning against the wall where he left it.

He is not here.`,

12: `Second morning. You know where the cups are now. You looked it up yesterday like a fact.

You call his phone at eight and it rings. Four times, five, and then it is his voice saying he'll get back to you, and he sounds like a man in a good mood, because he was in one when he recorded it.

You do not leave a message. You call again at nine.`,

13: `You have been counting how long he has been gone in hours and this morning you switch to days without deciding to.

The fridge is his fridge. The mat is his mat. Everything in here belongs to somebody who is not in it.

You eat half of what you want, because when he gets back there will be more.`,

14: `A text, at 4:12 in the morning, from his number.

    where are you

That is all of it. No punctuation, no capital. He would have written *u*. He always wrote *u*, it drove you mad, and this thing wrote *you*.`,

15: `You slept four hours. Your hands are doing the thing.

The street below has been the same street for three days: bins, a car with a flat, the blue house.

The curtain in the blue house has not moved in the mornings since the seventh. You have started checking. You do not know when you started checking.`,

16: `Two texts overnight. The second one uses your name and the first one does not, and between them is about four hours in which something learned your name.

His voicemail greeting is still the same. Still cheerful. You have listened to it nine times and you cannot make yourself stop.`,

17: `You do the order without deciding to. News. Forum. Phone. Curtain.

Halfway through the phone you realise you did the curtain first today and it lands like somebody has hit you.

Your mother's number does not connect. Not busy. Not ringing out. It makes a sound you have not heard a telephone make before and then nothing.`,

18: `There is no water at all now, just air in the pipe and a knocking.

You have not spoken out loud in two days. You test your voice and it is fine, and testing it was a strange thing to do, and you do not do it again.`,

19: `Nineteenth morning.

The keys are on the desk. They have been on the desk for eight days and you have picked them up nineteen times and put them down nineteen times.

You read the sheet again. The number in the adaptation column was 0.31 on the eleventh and this morning it is 0.74, and you understand what that means well enough to wish you did not.`,

20: `Twentieth morning.

Whatever was left of what he brought back runs out today. You have known that since the eleventh and today it stops being a thing you know and starts being today.`,
};

/**
 * Scheduled beats. `at` is an hour (24h float) or 'wake'.
 * Types are interpreted by systems/script.js.
 */
export const EVENTS = [

/* ================= ACT 1 — days 1 to 10 ================= */

{ id:'e1a', day:1, at:11.0, type:'say',
  text:`Ray comes back from downstairs and says the man on the second floor has gone to his sister's in Newport News.

He says it like it is normal to know that. He knows everyone in this building and you have been here nine days and know nobody.` },

{ id:'e1b', day:1, at:20.5, type:'say',
  text:`Ray watches the news with the sound almost off and his arms folded, and when it finishes he says "well" and gets up and does the dishes.

He does the dishes every night. You have offered four times.` },

{ id:'e2a', day:2, at:15.0, type:'say', audio:'gull',
  text:`Gulls on the roof opposite, arguing about something. There are a lot of them today.

Ray says that means weather.` },

{ id:'e2b', day:2, at:22.0, type:'say', audio:'dog_bark',
  text:`A dog somewhere north, going for about ten minutes and then stopping mid-bark, the way they do when somebody finally shouts at them.` },

{ id:'e3a', day:3, at:13.5, type:'say',
  text:`On the news: a road closed for flooding, and a graphic of tide levels, and an anchor with a small worried smile.

Ray watches the whole segment without saying anything and then goes and checks the taps.` },

{ id:'e3b', day:3, at:23.5, type:'collapse', gap:9,
  text:`A long way off — south, over the water. One sound, low, and then nothing for a while.

You count. You do not know why you count. You get to nine and there is another one.` },

{ id:'e4a', day:4, at:9.0, type:'say',
  text:`Ray is on the phone to somebody about a generator and the conversation is short and he does not get the generator.

Afterwards he says "he's a chancer, always was" and starts making a list on the back of a bill.` },

{ id:'e4b', day:4, at:23.0, type:'collapse', gap:4,
  text:`Closer than the last one. Four seconds this time.

Ray comes out of his room, stands in the middle of the floor listening, and goes back in.` },

{ id:'e5a', day:5, at:8.5, type:'say',
  text:`No dogs. You mention it and Ray says the pound will have taken them, which is not a thing that happens, and he knows it is not, and you both leave it there.` },

{ id:'e5b', day:5, at:21.0, type:'say', audio:'siren_far',
  text:`Sirens, west, going for most of an hour and not coming any closer.

Ray puts the volume up two clicks and then puts it back down.` },

{ id:'e6a', day:6, at:19.0, type:'say', audio:'gunfire_far',
  text:`Three flat cracks, a long way north, spaced out like somebody being careful.

Neither of you says anything about it. He turns a page.` },

{ id:'e6b', day:6, at:22.5, type:'brownout',
  text:`The lights dip, hold for a second at about a third, and come back up.

The fridge restarts with a thump you feel through the floor.` },

{ id:'e7a', day:7, at:7.5, type:'say',
  text:`You stand at the window for eleven minutes because there is nothing in the sky and you are waiting to be wrong about that.

Ray comes and stands next to you and does not ask what you are looking at.` },

{ id:'e7b', day:7, at:14.0, type:'say',
  text:`The green car has gone from outside. It has been outside every day since you got here.

Ray says good for them.` },

{ id:'e8a', day:8, at:10.0, type:'say',
  text:`The shop on Granby is shut. Not closed — shut, with the shutter down and something spray-painted on it that Ray will not repeat.

He comes back with tinned things and a bag of rice and no eggs.` },

{ id:'e8b', day:8, at:21.5, type:'collapse', gap:11,
  text:`Two, tonight. The gap between them is eleven seconds and you know that because you counted, out loud, and Ray heard you do it.` },

{ id:'e9a', day:9, at:12.5, type:'say',
  text:`He shows you the two-by-four he has screwed across the front door and explains it twice, in two different ways, as if one of them will be the one that sticks.

Then he shows you how the chain works from the outside, which is a strange thing to show somebody.` },

{ id:'e9b', day:9, at:22.0, type:'say', audio:'siren_far',
  text:`He asks, without looking up, whether you have ever fired a gun.

You say no. He says "no, right," and nods for a while at nothing in particular, and that is the whole conversation.` },

{ id:'e10a', day:10, at:7.2, type:'say',
  text:`BACK BY DARK, on the back of an envelope, under a mug.

You read it about forty times over the course of the day, which is not enough times for it to become more than four words.` },

{ id:'e10b', day:10, at:16.0, type:'say',
  text:`The TV holds a channel for six seconds and then loses it, and finds it, and loses it.

The blue house across the street: the curtain in the upstairs window has not moved this morning. You are not sure why you know that it usually does.` },

{ id:'e10c', day:10, at:19.6, type:'handoff' },

/* ================= ACT 2 — days 11 to 20 ================= */

/* ---- 11 to 13: DENIAL ---- */

{ id:'e11a', day:11, at:'wake', type:'actTwo' },

{ id:'e11b', day:11, at:12.0, type:'say',
  text:`You go through his room properly, which takes forty minutes and feels like the worst thing you have ever done.

There is a laptop. There is a legal pad. There is a drawer standing open with a folded cloth in it and a shape still pressed into the cloth.

The shotgun is downstairs against the wall where it has been since the first day.` },

{ id:'e11c', day:11, at:21.0, type:'say',
  text:`You put the chain on and then take it off again, in case.

You leave the two-by-four leaning where he left it, in case.` },

{ id:'e12a', day:12, at:9.0, type:'say', audio:'phone_ring',
  text:`You call him again and it rings the full five and goes to voicemail, and you hang up before the beep for the third time today.

It is ringing. Somewhere, that phone is ringing. You keep arriving at that thought from a different direction and it keeps not helping.` },

{ id:'e12b', day:12, at:15.5, type:'say',
  text:`You read his legal pad properly. It is a list, and about half of it is crossed off, and the crossings-off are not in the same pen.

One line is not a task and you read it four times and it does not become one.` },

{ id:'e12c', day:12, at:2.0, type:'gleaners',
  text:`There is something on the street below, three or four of them, low and unhurried, going through what the bins have become.

They are not looking at the building. They are not looking at anything. They are working.` },

{ id:'e13a', day:13, at:20.0, type:'say',
  text:`You cook, because you have eaten cold food for two days and you are going to cook.

The room is warm for about an hour afterwards. It is the nicest the apartment has been since you arrived.` },

{ id:'e13b', day:13, at:26.5, type:'crawler' },

/* ---- 14 to 16: THE TEXTS ---- */

{ id:'e14a', day:14, at:'wake', type:'texts' },

{ id:'e14b', day:14, at:23.0, type:'incursionTest',
  text:`Something is on the landing.

Not banging. Not trying the handle. Just there — a weight on a board that you have stood on a hundred times and know the sound of.

It is there for about ninety seconds and then it is not.` },

{ id:'e15a', day:15, at:11.0, type:'say',
  text:`Another one, in daylight this time.

    are you still at the flat

He never called it a flat. He called it the place, or upstairs, or nothing at all.` },

{ id:'e15b', day:15, at:19.5, type:'stranger' },

{ id:'e15c', day:15, at:1.5, type:'choir', index:0 },

{ id:'e16a', day:16, at:13.0, type:'say',
  text:`The texts have stopped asking and started telling.

    ill be up in a minute dont get up

You read it standing in the kitchen with a tin in your hand and you do not put the tin down for a long time.` },

{ id:'e16b', day:16, at:19.5, type:'stranger' },

{ id:'e16c', day:16, at:1.8, type:'silence',
  text:`The street has gone completely silent.

Not quiet. There has been quiet for a week. This is every small sound that was still out there stopping at the same moment, and staying stopped.` },

{ id:'e16d', day:16, at:2.1, type:'anguish' },

/* ---- 17 to 19: THE SQUEEZE ---- */

{ id:'e17a', day:17, at:10.5, type:'say',
  text:`Somebody has updated the sheet. The adaptation column has a new row every day now and every number in it is bigger than the one above it.

Whoever is keeping it has started putting their initials in the notes. Yesterday's says *last one from me for a while.*` },

{ id:'e17b', day:17, at:22.0, type:'choir', index:1 },

{ id:'e18a', day:18, at:'wake', type:'say',
  text:`The static from the TV is still going. You left it on. You do not remember leaving it on.` },

{ id:'e18b', day:18, at:16.0, type:'say',
  text:`Your sister's number does the sound too now. The one that is not busy and is not ringing.

You try the sister's number Ray wrote down for you and a woman answers and says a name that is not yours and hangs up before you can finish the first word.` },

{ id:'e18c', day:18, at:23.5, type:'collapse', gap:3, near:true,
  text:`Close. Two streets, maybe three. The window frame moves in the wall.

The gap is short. Something ran.` },

{ id:'e19a', day:19, at:14.0, type:'say',
  text:`You pick the keys up and hold them for a while and put them in your pocket, and an hour later you take them out and put them back on the desk, exactly square to the edge, the way he left them.` },

{ id:'e19b', day:19, at:22.5, type:'choir', index:2 },

{ id:'e19c', day:19, at:25.0, type:'incursionTest',
  text:`On the landing again, and closer to the door than last time, and for longer.

At one point it puts weight on the board directly outside and holds it there, and does not move, for what you later work out was about four minutes.` },

/* ---- 20: THE FINALE ---- */

{ id:'e20a', day:20, at:'wake', type:'lastDay' },

{ id:'e20b', day:20, at:20.0, type:'finale' },

];

/** The Day 10 handoff — the hinge of the whole game. */
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

You do not know what it was. You used it the way he showed you in a note he never wrote, which is to say you guessed, and you have been guessing for nine days, and today the guessing stops mattering.

Tonight the apartment is just an apartment.`;
