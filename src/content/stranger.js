/**
 * stranger.js — §2. The survivor at the door.
 *
 * A human being knocks. A real one, or possibly not.
 *
 * THE RULE FOR THIS FILE: the game never confirms whether she was real. Not
 * in the aftermath, not in the endings, not in a document. Both choices leave
 * evidence, and the evidence is legible enough to be read and not legible
 * enough to settle. Anything written here that resolves it is a bug.
 *
 * She has a name and a reason and she is frightened, because that is what
 * makes it a decision rather than a puzzle. The Incursion has been writing in
 * his voice for two days by the time she arrives, and it is getting better at
 * it, and the player knows that. That is the whole difficulty.
 */

/** The knock, and what she says through a closed door. */
export const KNOCK = [
`Three knocks. Not hard. Spaced out, like somebody being careful about how much noise they make.

Then nothing for long enough that you start to believe you imagined it.

Then three more.`,

`A woman's voice, low, close to the door.

"Is there anyone in there? I saw your light."

You did have a light on. Some part of you does the arithmetic on that and files it somewhere you will find later.`,

`"My name's Dana. I'm from the corner of Llewellyn, the yellow house — the one with the porch. I've been in my basement since the eleventh and the water's come up."

A pause. You can hear her breathing through a hollow-core door.

"I'm not sick. I'm not — I don't have anything. I've got a can opener and about nine tins and I will give you all of it."`,
];

/** If the player looks through the gap before deciding. Costs nothing. */
export const LOOK = `You put your eye to the gap where the frame has warped.

A woman, forties, wet to the knee, a supermarket bag-for-life in one hand with square corners in it. Her coat is a work coat with a laundry tag still stapled to the collar. She is looking at the stairs, not at the door, and she is doing it constantly, in a rhythm, the way you check a mirror.

She looks exactly like a person. That is not information. It has never once been information.`;

/** Admitting her. Costs food and Concealment; gives Understanding. */
export const ADMITTED = [
`You take the two-by-four down, which takes longer than it should because your hands are not good, and she comes in fast and turns and helps you put it back.

She does that without being asked and she does it correctly.`,

`Her name is Dana Wexler and she worked in payroll at the naval hospital until the tenth and she has not seen another living person in five days.

She talks for two hours. You had forgotten what it is like when somebody else fills a room with sound.`,

`She knows things.

She saw one of the tall ones on Hampton Boulevard on the twelfth and she watched it for a minute and a half from under a car, and the thing she tells you about it — about what it did to the parked cars going past, and what it did not do — you already half knew from the sheet, and hearing it out loud from somebody who was there makes it true in a way that reading it never did.

She says the water came up Llewellyn from the south and stopped, and she is certain about which day, and she is certain about the direction.`,

`She sleeps against the far wall with the bag under her head and she is gone before you wake up.

Nine tins on the counter. The bag folded flat next to them. No note, because there was nothing to write with, or because there was nothing to write.

She left the chain off.`,
];

/** Turning her away. Costs nothing mechanically. */
export const REFUSED = [
`You do not say anything.

You stand two feet from the door with your hand flat on the wood and you do not say anything, and the not-saying takes about four minutes, and she says your friend's name once, which she should not know, and which is on the mailbox downstairs.`,

`"Okay," she says, eventually. Not angry. Not even surprised. Just the sound of somebody adjusting a plan.

"Okay. There's a boarded place on Warren with the door off. If it's still there."

The board under her foot on the landing. Then the next one. Then the stairs.`,

`It is quiet for a long time after that and then it is quiet in a different way.

You do not look. Looking would be a decision and you have made your decision.`,
];

/**
 * The aftermath, on the following morning. Two versions, and neither of them
 * closes it. Read from the script on the day after she knocks.
 */
export const AFTER = {
  admitted: `Nine tins, a folded bag, and the chain off.

You put the chain on and stand there with your hand on it.

She said the water came up Llewellyn from the south, and the sheet says the same thing in a column somebody else filled in, and two people cannot be wrong in the same direction unless they got it from the same place.`,

  refused: `There is a supermarket bag on the landing outside the door, folded flat, with nothing in it.

It is folded the way you fold a bag when you are going to use it again.

You bring it inside. You do not know why you bring it inside.`,
};

/**
 * What the Understanding system gets out of it. She was there; she saw a
 * Tormentor work a street and she was right about the water. That is real
 * knowledge and admitting her is the only way to get it from a person rather
 * than from a screen.
 */
export const ADMITTED_FLAGS = ['tormentor_travels', 'floodRoutes'];
