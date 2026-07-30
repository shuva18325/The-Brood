/**
 * replies.js — §5.2. What the forum says back.
 *
 * THIS IS THE NEW MECHANIC AND IT IS THE WHOLE GAME IN ONE PLACE:
 * information is survival, and seeking it exposes you.
 *
 * When the player posts, other users reply over the following in-game days.
 * Which replies they get is routed off the Understanding flags they already
 * hold, so the forum behaves like a forum: it answers the question you were
 * actually able to ask.
 *
 *   ASKED WELL       — a question about something they have already partly
 *                      figured out gets a specific, useful answer, and the
 *                      answer grants Understanding.
 *   ASKED NAIVELY    — gets mocked, corrected badly, or given confidently
 *                      wrong advice, which is worse than being ignored.
 *   DESCRIBED YOURSELF — somebody helpful replies. And something else
 *                      notices. Posting your street and your circumstances
 *                      in a public thread has a cost the player cannot see
 *                      coming and can work out afterwards.
 *
 * The voice target is the user's own example, and every post in here is
 * written against it: first-hand and overwhelmed, punctuation falling apart,
 * two separate horrors crammed into one paragraph because he cannot
 * prioritise them, naming things himself because nobody has given him a
 * name, and ending on helplessness rather than a conclusion.
 */

/* ------------------------------------------------------------------ */
/* WHAT THE PLAYER CAN POST                                            */
/*                                                                     */
/* Each topic gates on flags. `needs` means it is only offered once the  */
/* player knows enough to ask it — which is why asking well is a        */
/* consequence of having read, not a lucky guess.                       */
/* ------------------------------------------------------------------ */

export const TOPICS = [
  {
    id: 'ask_tormentor_light',
    kind: 'good',
    needs: ['tormentor_noise_light'],
    label: 'Ask whether it is the light or the noise',
    title: 'is it the light or the sound',
    body: `ok so I have been keeping a lit window one night and a dark one the next and something came up the street on the lit night and not the dark one but I also had the tv on the lit night so I have not actually tested one thing at a time have I

does anyone have a night where it was ONE of them. just one. I need somebody who did this properly because I have been doing it wrong for four days`,
  },
  {
    id: 'ask_roadkill_window',
    kind: 'good',
    needs: ['roadkill_adapt'],
    label: 'Ask how long the window after an impact lasts',
    title: 'how long after a hit is a road clear for',
    body: `The thing on the roads. Somebody hit one on the 264 and got through and I have seen two people say the road was fine for a while after and then it was not fine.

How long is a while. Is it hours. Is it a day. I am asking because I have a car and a set of keys and I am trying to work out whether a thing that happened yesterday is any use to me today and nobody will put a NUMBER on it`,
  },
  {
    id: 'ask_incursion_door',
    kind: 'good',
    needs: ['incursion_habitation'],
    label: 'Ask what makes a flat look occupied',
    title: 'what counts as lived in',
    body: `The one that comes inside. Everyone says it goes for places that look lived in and nobody says what that MEANS.

Is it heat. Is it the smell of cooking. Is it dishes. Is it that I am walking the same four steps between the desk and the window sixty times a day and wearing a line in the floor.

I am asking because I can stop doing some of those and not others`,
  },
  {
    id: 'ask_naive_shoot',
    kind: 'naive',
    label: 'Ask whether the shotgun works on the big ones',
    title: 'does buckshot work on the tall ones',
    body: `I have a shotgun and six shells. Realistically what does that do to one of the big ones. Asking seriously.`,
  },
  {
    id: 'ask_naive_shelter',
    kind: 'naive',
    label: 'Ask whether the shelters are safer',
    title: 'is it better to be with people',
    body: `Would I be better off getting to one of the places where everyone has gone. There is safety in numbers right. Feels like there has to be safety in numbers.`,
  },
  {
    id: 'ask_naive_look',
    kind: 'naive',
    label: 'Ask what happens if you look at the red one',
    title: 'the red one — what actually happens',
    body: `Serious question and I am not being morbid. Everyone says do not look at the red one. What actually happens if you do. Has anyone here done it and been fine`,
  },
  {
    /* THE ONE THAT COSTS. It is the most natural thing in the world to post
     * and it is the single worst thing the player can do. */
    id: 'tell_situation',
    kind: 'expose',
    label: 'Describe your situation and ask for help',
    title: 'alone in a flat on the second floor and out of ideas',
    body: `I am on the second floor of a walk up eleven blocks off the water, west side, the one with the bars on the windows over the shop that shut. My friend went out on the tenth and did not come back and I have his keys and his shotgun and about a week of food.

It destroyed the house at the end of my street and while the governors and the military say this thing is super strong, I saw this fleshy creature I have been calling Anguish because nobody has given it a name, posted about it on here before. I also saw one of the tall Tormentor ones and the horror of it clawing its own face off because it looked at that thing. I dont know what to do

Somebody please tell me if the roads west are anything. I am not asking anyone to come and get me. I just need to know if leaving is a thing that people are managing`,
  },
];

/* ------------------------------------------------------------------ */
/* WHAT COMES BACK                                                     */
/*                                                                     */
/* `after` is how many days later it lands. Several replies to the same */
/* post arrive on different days, which is what a forum thread does.    */
/* ------------------------------------------------------------------ */

export const REPLIES = {

  /* ---- asked well: specific, useful, and it grants Understanding ---- */

  ask_tormentor_light: [
    { after: 1, author: 'oysterknife', grants: ['tormentor_noise_light'], body:
`I did it properly, three nights, because I am retired and I have nothing else.

Night one: no light, tv off, one lamp in the back room where the window is bricked. Nothing came up the street.
Night two: no light at all but I had the radio on at a level you could hear from the pavement. It came up the street.
Night three: one candle at the front window, no sound at all. It came up the street.

So it is both. It is not one. I am sorry, I know you wanted one.` },
    { after: 2, author: 'Cal_Whitfield', grants: [], body:
`Listen to oysterknife. He is right and he is the only person on this board who wrote the nights down.

Twenty eight years on the job taught me one thing about this kind of information: the man who says "it is definitely X" has tested it once. The man who says "it is both, sorry" has tested it three times.` },
    { after: 3, author: 'vaporlock', grants: [], body:
`for what its worth the sound thing is worse than the light thing in my experience. i have had a lamp on for two hours and been fine. i dropped a pan on the sixth and something was on my landing in under ten minutes.

n=1. dont build a plan on me.` },
  ],

  ask_roadkill_window: [
    { after: 1, author: 'nightjar_88', grants: ['roadkill_window'], body:
`Nobody will put a number on it because the number changes, but there IS a number and it is in the sheet if you read the impact tab properly.

Sort by date. Look at the gap between an impact on a stretch and the next confirmed loss on the same stretch. It is not random. First impact on a road buys you the longest window and every one after that on the same road buys you less. The 264 got hit on the fourth and stayed clear a day and a half. It got hit again on the ninth and was gone by that evening.

So: a road that has been hit once, recently, and only once. That is your road.` },
    { after: 2, author: 'PT_Ellis', grants: ['spreadsheet_impacts'], body:
`nightjar is right, and to make it easier: the impact tab is sorted by CITY by default which is useless for this. Click the date header twice.

Also please, everyone, put the TIME in the row. Half of these say "morning".` },
    { after: 3, author: 'Q_from_Suffolk', grants: [], body:
`Or it adapts in six hours and your whole method gets somebody killed. You are all extremely confident about a pattern in about forty rows of a spreadsheet that strangers filled in.

I am not saying do not use it. I am saying say "probably" once in a while.` },
  ],

  ask_incursion_door: [
    { after: 1, author: 'mudflat', grants: ['incursion_habitation'], body:
`It is habitation, and habitation is not one thing, it is an accumulation. Here is what I have stopped doing and I am still here on day fourteen:

- no cooking. Nothing hot. The smell carries into the stairwell and it stays there for hours.
- dishes get done immediately or not used at all
- I have four places I sit and I rotate them
- I do not run water at night, ever

I have kept the light. The light is the other one's business, not this one's. I am aware that trading between them is a mug's game.` },
    { after: 2, author: 'stillwaters', grants: ['incursion_needs_opening'], body:
`Adding one thing mudflat did not say because he has a solid door.

It does not make its own way in. It has never once made its own way in. Every account I have read, including the two on this board, there was an opening — a door on the latch, a window, a vent, somebody who opened up because they heard a voice they knew.

So the accumulation gets it interested. An opening is what actually lets it happen. Those are two different problems and you can solve the second one this afternoon.` },
    { after: 4, author: 'berkley_dan', grants: [], body:
`is walking about really a thing?? I have been going up and down my hall all week

sorry that is not helpful I am just frightened` },
  ],

  /* ---- asked naively: mocked, corrected badly, or confidently wrong ---- */

  ask_naive_shoot: [
    { after: 1, author: 'Q_from_Suffolk', grants: [], body:
`Nothing. It does nothing. Next.` },
    { after: 1, author: 'mom_of_3_chesapeake', grants: [], beliefs: ['shoot_anguish'], body:
`My husbands cousin is in the Guard and he said they DID bring one down at the tunnel!!! So it can be done!!! Do not let people on here tell you that you are helpless!!! 🙏

Stay strong and keep your family close!!!` },
    { after: 2, author: 'Cal_Whitfield', grants: ['military_useless'], body:
`I am going to be careful here because there is a young person in this thread with a gun and six shells.

The Guard engaged one at the tunnel. There is footage. What the footage shows is a platoon with rifles and a vehicle-mounted weapon achieving nothing at all over about ninety seconds, and then no more footage. Whoever told you they brought it down was told that by somebody who needed it to be true.

The small ones on the ground, yes, with effort, and it will be loud, and loud is the thing that brings the big one. Please think about that trade before you make it.` },
    { after: 3, author: 'vaporlock', grants: [], body:
`the answer to "what does my gun do" is always "it makes a noise". thats it. thats the whole answer` },
  ],

  ask_naive_shelter: [
    { after: 1, author: 'granby_st', grants: [], beliefs: ['gather_shelters'], body:
`The city put out three locations and they are staffed and they have water. I am not going to tell anybody not to go to them. Being alone is its own risk.` },
    { after: 2, author: 'RN_nights', grants: ['congregation_crowds'], body:
`I worked one of them for two nights.

I am not going to describe it. I will say the thing that decided me: it got worse as the room got fuller. Not busier-worse. Worse-worse. It arrived when we passed about two hundred and it did not arrive on either of the nights we were under a hundred.

Whatever it keys on scales with us. The safest place I have been in two weeks is a room with one person in it.` },
    { after: 3, author: 'mudflat', grants: [], body:
`"There is safety in numbers" is a thing we say about wolves.

I am sorry. That was unkind. But please read what RN_nights wrote twice.` },
  ],

  ask_naive_look: [
    { after: 1, author: 'nine_of_swords', grants: [], body:
`i looked. i am fine.` },
    { after: 1, author: 'vaporlock', grants: [], body:
`^ this account is three posts old and two of them are that

do not do this` },
    { after: 2, author: 'archivist_p', grants: ['anguish_officer_context'], body:
`There is one documented account of a person who looked at it and was still able to give a statement afterwards. Everyone quotes him. Almost nobody reads the circumstances.

He was in a vehicle. He was behind laminated glass. It was over ninety metres away and it was not oriented toward him. He discharged a weapon at it, which is the part everybody remembers, and the weapon is not why he is alive — the ninety metres and the glass and the orientation are why he is alive.

The lesson people take from that account is "shooting works". The lesson in that account is "distance and glass and it was not looking at you".` },
    { after: 3, author: 'Cal_Whitfield', grants: ['anguish_dont_look'], body:
`Do not look at it. That is the whole of it. Not "try not to". Do not.

I have carried people out of situations for twenty eight years and I have never once said a sentence that simple about anything. Do not look at it.` },
  ],

  /* ---- described yourself: help arrives, and so does something else ---- */

  tell_situation: [
    { after: 1, author: 'Cal_Whitfield', grants: ['roads_flooded'], body:
`West is where I would go and west is also where the water is, so read this carefully.

Everything south of the Hague and everything below the Colley bridge is under and it did not rain, which means it is not going back down. The routes that are dry are the ones on the ridge — Llewellyn as far as 27th, then east on 27th, then the ramp. It is longer. It is dry.

You are not stupid for asking and you are not weak for asking. You have a car and keys and that puts you ahead of most of this board.` },
    { after: 1, author: 'sheetmom', grants: [], body:
`Put your street in the sheet if you are willing to. Not your number, just the block and what you have seen. We have almost nothing from your side of the water and it would help the people two streets over from you.

You do not have to. I understand entirely if you do not.` },
    { after: 2, author: 'oysterknife', grants: [], body:
`Bars on the windows over a shop that shut — that is the Granby end, isn't it. I know that building. My brother in law did the roof on it about nine years ago.

If it is the one I am thinking of, the flat roof next door is a metre lower than your sill and there is a fire door onto it that the landlord never alarmed. I do not know if that is useful. I do not know if that is the last thing you want to hear either.` },

    /* AND SOMETHING ELSE NOTICES. It is not a monster post — it is somebody
     * being helpful in a way that is very slightly wrong, and it uses two
     * details the player supplied. The cost lands later, mechanically, and
     * the player has to work backwards to this. */
    { after: 2, author: 'nine_of_swords', grants: [], marks: true, body:
`second floor, west side, bars, over the shop.

thats good. bars are good. you should keep the light on so people can find you` },
    { after: 3, author: 'mudflat', grants: [], body:
`Do not keep the light on.

OP — the account above yours is three posts old and every one of them is somebody being told to make themselves easier to find. I have reported it twice. Nothing happens, because there is nobody left to action a report.

Take everything Cal said. Ignore everything after it.` },
  ],
};

/** Every reply the player has coming, for a post made on `day`. */
export function repliesTo(topicId, postedDay) {
  return (REPLIES[topicId] || []).map((r, i) => ({
    ...r,
    id: `pr_${topicId}_${i}`,
    day: postedDay + r.after,
  }));
}

export default TOPICS;
