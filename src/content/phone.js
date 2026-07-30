/**
 * phone.js — family, inland, watching the sanitized coverage.
 *
 * They do not understand. Every call is emotional pressure toward the
 * wrong decision. He performs calm for them and gets disturbingly good
 * at it.
 *
 * And from Day 12, the other thread.
 */

/* ------------------------------------------------------------------ */
/* the family thread                                                   */
/* ------------------------------------------------------------------ */

export const FAMILY = [
{ id:'t01', day:1, from:'Mom', time:'19:40', body:`Did you eat` },
{ id:'t02', day:1, from:'Mom', time:'19:41', body:`I saw about the trash on the news. Is it bad there` },
{ id:'t03', day:2, from:'Court', time:'11:02', body:`mom is losing it. can you just text her a photo of a wall or something` },
{ id:'t04', day:2, from:'Mom', time:'21:15', body:`Your father wants to know if Ray has a generator` },
{ id:'t05', day:3, from:'Mom', time:'08:30', body:`They said on the news it's under control. Is it under control` },
{ id:'t06', day:3, from:'Dad', time:'22:44', body:`I can be there in four hours. Say the word.` },
{ id:'t07', day:4, from:'Mom', time:'09:12', body:`The governor was on. He seemed calm.

Are you being careful` },
{ id:'t08', day:4, from:'Court', time:'14:20', body:`ok so I looked at a map and you are ELEVEN BLOCKS from the water

why did you not say that` },
{ id:'t09', day:5, from:'Mom', time:'07:05', body:`Baby it is on every channel now.

Please come home. Ray can come too. We have the sofa and the floor and I do not care.` },
{ id:'t10', day:5, from:'Dad', time:'19:30', body:`Truck is packed.` },
{ id:'t11', day:6, from:'Mom', time:'06:50', body:`Did you see about the Guard

Why would they need the Guard if it is under control` },
{ id:'t12', day:6, from:'Court', time:'23:11', body:`are you actually ok or are you doing the thing where you say youre ok` },
{ id:'t13', day:7, from:'Mom', time:'10:00', body:`Nobody will give a number. Why will nobody give a number` },
{ id:'t14', day:7, from:'Dad', time:'20:15', body:`Roads are fine as far as Emporia. I checked. I checked twice.

Say the word.` },
{ id:'t15', day:8, from:'Mom', time:'05:30', body:`It says do not look at them

What does that mean. What does that mean` },
{ id:'t16', day:8, from:'Court', time:'16:40', body:`mom has been up since four

I'm not saying that to guilt you. I'm saying it because you should know` },
{ id:'t17', day:10, from:'Mom', time:'07:20', body:`If you leave in the morning you'd be here for dinner.

I have made the thing you like. It will keep.` },
{ id:'t18', day:11, from:'Mom', time:'06:00', body:`Is Ray with you` },
{ id:'t19', day:11, from:'Mom', time:'06:02', body:`Baby is Ray with you` },
{ id:'t20', day:11, from:'Court', time:'13:30', body:`she asked me to ask you again about ray

im not going to ask. just so you know shes asking` },
{ id:'t21', day:12, from:'Dad', time:'04:44', body:`I am not going to sleep until you answer.

I am not saying that to be dramatic. I am saying it because it is what is happening.` },
{ id:'t22', day:12, from:'Mom', time:'18:00', body:`They said do not respond to voices

Whose voices` },
{ id:'t23', day:14, from:'Court', time:'02:10', body:`I looked up how far you are from I-64

its four minutes. its FOUR MINUTES to the ramp

please` },
{ id:'t24', day:14, from:'Mom', time:'19:50', body:`I keep the porch light on. I know it doesn't help. I know you can't see it.

I keep it on.` },
{ id:'t25', day:16, from:'Dad', time:'11:11', body:`Truck's still packed.` },
{ id:'t26', day:16, from:'Mom', time:'21:00', body:`Sent` , failed:true },
{ id:'t27', day:18, from:'Court', time:'08:00', body:`nothing is going through. this might not go through

if it does: get in the car` , failed:true },
{ id:'t28', day:18, from:'Mom', time:'22:30', body:`` , failed:true },
{ id:'t29', day:20, from:'Mom', time:'—', body:`` , failed:true, empty:true },
];

/**
 * Replies the player can send. Performing calm is a skill he acquires and
 * the options get better at it, which is the horror of the mechanic.
 */
export const REPLIES = [
  { id:'r_fine',  day:1,  label:`"i'm fine. it's fine here."` },
  { id:'r_food',  day:1,  label:`"ate. don't worry. love you."` },
  { id:'r_ray',   day:3,  label:`"ray's got it handled. he knows people."` },
  { id:'r_soon',  day:5,  label:`"couple more days and the roads'll clear."` },
  { id:'r_calm',  day:7,  label:`"honestly it's quiet here. quieter than home."` },
  { id:'r_lie',   day:10,  label:`"we're stocked up. we're fine. go to bed."` },
  { id:'r_ray2',  day:11, label:`"ray's out getting stuff. he's fine."`, cost:'habitation' },
  { id:'r_true',  day:12, label:`"i don't know what to tell you."` },
  { id:'r_love',  day:16, label:`"i love you. tell dad to unpack the truck."` },
];

/* ------------------------------------------------------------------ */
/* his number                                                          */
/* ------------------------------------------------------------------ */

export const FRIEND = { name: 'Ray', number: '(757) 555‑0148' };

/**
 * Calling him. Escalates. Never resolves.
 */
export const FRIEND_CALL = [
  { stage:0, day:11, result:'rings out',
    text:`It rings eleven times and then it stops ringing without going anywhere.` },
  { stage:1, day:12, result:'voicemail',
    text:`"Yeah, this is Ray, leave it after the thing." — then the beep.

He recorded that four years ago. He is being funny in it. You can hear a television behind him.` },
  { stage:2, day:13, result:'voicemail',
    text:`"Yeah, this is Ray, leave it after the thing." — then the beep.

You start to say something and stop, because you do not know which of the two possible messages you are leaving.` },
  { stage:3, day:14, result:'voicemail',
    text:`"Yeah, this is Ray, leave it after the thing."

You have listened to this eleven times now. You know where he breathes in.

It is still cheerful. Whatever is texting you from this number has not touched it, and you cannot decide whether that means it cannot or that it has not thought of it.` },
  { stage:4, day:15, result:'rings out',
    text:`It rings out, which it has not done since the eleventh, and you find that you are relieved, and then you find that being relieved by that is not a good sign about you.` },
  { stage:5, day:16, result:'picked up',
    text:`It picks up on the second ring.

Nobody says anything.

There is no room tone. There is no breathing. There is not the sound of somebody choosing not to speak — there is the sound of a line that is open and has nothing on the other end of it.

You say his name twice.

It stays open for forty seconds and then it ends. It was not hung up. It ended.` },
  { stage:6, day:17, result:'picked up',
    text:`It picks up on the first ring and the line is open and empty again, and this time there is something at the far end of it that is not breathing but is doing something at the same rate as breathing.` },
  { stage:7, day:18, result:'picked up',
    text:`It picks up immediately.

Nothing.

You do not say his name this time. You listen for a minute and eleven seconds and then you take the phone away from your ear and look at it, and the call is still going, and you end it yourself.` },
  { stage:8, day:19, result:'picked up',
    text:`It picks up and there is a sound like a room.

Not this room. A room with a hard floor and a high ceiling, somewhere with an echo in it, and something moving across that floor unhurriedly and a long way from the phone.

You listen to it for four minutes. It never comes closer.` },
  { stage:9, day:20, result:'picked up',
    text:`It picks up before it rings.` },
];

/* ------------------------------------------------------------------ */
/* the texts from his number, from Day 12                              */
/*                                                                     */
/* The tone is slightly wrong at first and better every day, because it */
/* is learning. It never becomes perfect and never becomes obviously    */
/* false.                                                              */
/* ------------------------------------------------------------------ */

export const FRIEND_TEXTS = [
{ id:'x01', day:14, time:'21:40',
  body:`hey im ok, coming back. cant talk, open the door in 10 min` },

{ id:'x02', day:14, time:'23:55',
  body:`you did not open the door. i was at the door.

it is cold here` },

{ id:'x03', day:16, time:'20:10',
  body:`hey. sorry about last night, phone died.

im outside now. dont turn the light on, just come down and get the chain` },

{ id:'x04', day:16, time:'22:30',
  body:`did you eat? theres rice in the cabinet on the left, behind the plates

im at the door` },

{ id:'x05', day:18, time:'19:00',
  body:`I know you're scared. I'd be scared.

It's me. Ask me something.` },

{ id:'x06', day:18, time:'21:15',
  body:`You asked me on the third day why I keep the shotgun downstairs instead of up here and I said because if I have to think about it I've already lost.

Come down and get the chain.` },

{ id:'x07', day:20, time:'02:20',
  body:`You still can't find the cups.

Ten days and you still open the wrong cabinet every single time and you still don't say anything about it.

Come down. I'm tired.` },

{ id:'x08', day:20, time:'20:00',
  body:`I forgot one thing. That's all it was. I forgot one thing and I went back for it.

Open the door.` },
];

/* Voices in the street. Not the same thing, and telling them apart is a
   genuine Understanding problem. */
export const CHOIR_CALLS = [
{ day:16, voice:'Ray', body:`Somebody is calling your name from the street.

It is his voice. It is exactly his voice, including the way he pushes the end of a word up when he is annoyed.

He is calling from directly below the window, which is a place you can see, and there is nobody there.` },
{ day:18, voice:'Mom', body:`It is your mother's voice.

Your mother is two hundred and eighty miles inland and you spoke to her at eleven o'clock.

It has the thing she does where she says your name twice, close together, the second one quieter.` },
];

export function familyFor(day) { return FAMILY.filter(t => t.day <= day); }
export function friendTextsFor(day) { return FRIEND_TEXTS.filter(t => t.day <= day); }
export function repliesFor(day) { return REPLIES.filter(r => r.day <= day); }

export default FAMILY;
