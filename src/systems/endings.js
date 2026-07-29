/**
 * endings.js — resolution.
 *
 * Understanding is the win condition, and this is the only place it is ever
 * spent. Nothing here explains anything to the player. The ending text says
 * what happened, in order, and stops.
 */

import { CONFIG } from '../config.js';
import state, { save } from '../state.js';
import bus from '../bus.js';
import audio from '../audio.js';
import understanding from './understanding.js';
import concealment from './concealment.js';

const D = CONFIG.days;

/* ------------------------------------------------------------------ */
/* Road Kill — the second countdown, pointed the other way              */
/* ------------------------------------------------------------------ */

/**
 * How thoroughly the roads have been closed by adaptation, 0..1.
 * Day 10 it has been hit by everything a panicking coast could throw at it
 * for three weeks. Day 15 it has been hit by everything.
 */
export function adaptation(day = state.day) {
  const t = (day - (D.actTwo - 1)) / (D.last - (D.actTwo - 1));
  return Math.max(0, Math.min(1, t));
}

/* ------------------------------------------------------------------ */

export const endings = {

  /** Ending A. The player took the keys and went. */
  keys({ day = state.day } = {}) {
    const u = understanding;
    const tier = u.tier();
    const adapt = adaptation(day);

    const knowsWindow = u.has('roadkill_window') && u.has('spreadsheet_impacts');
    const knowsFlood  = u.has('roads_flooded') || u.has('undertow_water');
    const knowsLook   = u.has('anguish_dont_look');
    const knowsRoad   = u.has('roadkill_adapt');

    // A fresh impact makes a road briefly passable no matter how late it is.
    // This is the entire thesis of the game expressed as one number.
    const routeRisk = knowsWindow ? 0.15 : (0.25 + adapt * 0.7);
    const floodRisk = knowsFlood ? 0.05 : 0.45;
    const lookRisk  = knowsLook ? 0.02 : (u.believes('shoot_anguish') ? 0.5 : 0.3);

    const beats = [];
    let outcome = 'out';

    beats.push(
      'The stairwell smells like other people’s cooking from a month ago. ' +
      'You do not look at the doors you pass.'
    );

    /* --- getting to the car --- */
    if (state.concealment < 25) {
      beats.push('There is something in the lot that does not move when the door bangs. You get in anyway.');
    } else {
      beats.push('The car starts on the second turn. It is a stupid thing to be grateful for.');
    }

    /* --- water --- */
    if (knowsFlood) {
      beats.push(
        'You go north on the surface streets because you know which blocks are under water, ' +
        'and you know what standing water is now. It costs you forty minutes. You do not care.'
      );
    } else {
      beats.push(
        'Twenty-second is closed, so you take Bay. Bay is flat and wet and the water is not deep, ' +
        'and for two hundred metres it is only a road with water on it.'
      );
      if (roll(floodRisk)) {
        outcome = 'dead';
        beats.push(
          'Then the water moves against the direction of the car.\n\n' +
          'It does not stop being a road. That is the part nobody writes down.'
        );
        return finish('keys', outcome, beats, { day, adapt });
      }
      beats.push('Nothing happens in the water. You will think about that for the rest of your life.');
    }

    /* --- the highway --- */
    if (knowsWindow) {
      beats.push(
        'You take 64 west, because a stranger with a spreadsheet logged an impact on that stretch ' +
        'at 04:10 and two other volunteers marked it verified, and because you read the second tab ' +
        'and understood what the gap between the columns was for.\n\n' +
        'There is something on the shoulder near the 264 split. It is not standing. ' +
        'It watches the car go past and does not follow, because it never leaves the roadway ' +
        'and because it is still busy being hurt.'
      );
    } else if (knowsRoad) {
      beats.push(
        'You know it adapts. You do not know to what, or when, or how long that takes, ' +
        'so you drive fast and hope the arithmetic is on your side.'
      );
      if (roll(routeRisk)) {
        outcome = 'dead';
        beats.push(
          'Something is standing in the westbound lanes and it does not resolve into anything ' +
          'as the headlights reach it. You have time to understand that it is not moving out of ' +
          'the way, and that this has worked before, and that it is why it is still there.'
        );
        return finish('keys', outcome, beats, { day, adapt });
      }
      beats.push('You get thirty miles before your hands stop shaking.');
    } else {
      if (roll(routeRisk)) {
        outcome = 'dead';
        beats.push(
          'There is a shape in the westbound lanes. You take it for a deer, or a tarp, ' +
          'or a thing that fell off a truck, and you are still deciding which when you reach it.\n\n' +
          'It has been hit by four states’ worth of people who were also still deciding.'
        );
        return finish('keys', outcome, beats, { day, adapt });
      }
      beats.push('The interstate is empty in a way that should have told you something.');
    }

    /* --- the thing you should not look at --- */
    if (roll(lookRisk)) {
      if (knowsLook) {
        beats.push('There is a light in the trees on the south side. You keep your eyes on the lane markings. It takes everything you have.');
      } else {
        outcome = outcome === 'out' ? 'ambiguous' : outcome;
        beats.push(
          'There is a red thing standing at the treeline near Providence Forge and you look at it ' +
          'the way anyone looks at anything.\n\n' +
          'The car is found at the bottom of the embankment eleven days later, upright, undamaged, ' +
          'with the engine off and the keys in it.'
        );
        return finish('keys', 'dead', beats, { day, adapt });
      }
    }

    /* --- resolution -------------------------------------------------
     * The road, the water and the thing you must not look at have already
     * had their say above, and they had it BEFORE the general score does,
     * because that is the point: the specific number on someone's
     * spreadsheet outranks how much you generally know.
     *
     * What is left is everything he never learned existed.
     */
    const prepared = (knowsWindow ? 1 : 0) + (knowsFlood ? 1 : 0)
                   + (knowsLook ? 1 : 0) + (knowsRoad ? 1 : 0);
    const unknownRisk = Math.max(0.02,
      (tier === 'high' ? 0.06 : tier === 'partial' ? 0.30 : 0.55) - prepared * 0.10);

    if (outcome === 'out' && roll(unknownRisk)) {
      beats.push(
        'Somewhere the far side of Waverly the road does something you were not expecting.\n\n' +
        'There was a document that would have told you. There always was. You had fifteen days ' +
        'and about four hundred pages and no way at all of knowing which four of them mattered.'
      );
      return finish('keys', 'dead', beats, { day, adapt });
    }

    if (outcome === 'out' && tier !== 'high' && prepared < 3) outcome = 'ambiguous';

    if (outcome === 'out' && tier === 'high') {
      beats.push(
        'You cross into Charlotte County a little after four. There is a fuel stop with a generator ' +
        'and a man who will not come out from behind the counter, and he sells you water through a gap.\n\n' +
        'You do not know what any of it was. You know eleven things that are true and you do not know ' +
        'what they add up to. Nobody does. That is not a thing that gets fixed later.\n\n' +
        'You are alive. You are three hundred miles inland with someone else’s wallet and ' +
        'someone else’s car, and you are alive.'
      );
    } else if (outcome === 'out') {
      beats.push(
        'You get past Richmond a little before five.\n\n' +
        'You understand almost none of it. You knew four specific things — a stretch of road, ' +
        'a set of blocks that are not blocks any more, a colour not to look at — and those four ' +
        'things were the four that came up, and that is the entire difference between you and ' +
        'everyone still behind you.\n\n' +
        'You are alive. You will spend a long time telling yourself that was not luck, and it ' +
        'mostly was not, and the part that was will not let you sleep.'
      );
    } else if (outcome === 'ambiguous') {
      beats.push(
        'You get past Richmond. The radio finds a station that is a man reading names, and then ' +
        'the station stops.\n\n' +
        'Somewhere west of there the road does something you were not expecting, and you were ' +
        'right about most of it, and most of it was not the number that mattered.\n\n' +
        'The car keeps going for a while after that.'
      );
    }

    return finish('keys', outcome, beats, { day, adapt });
  },

  /**
   * Ending B. He stayed, took the shotgun, and something spent the night
   * trying different ways in.
   * @param {object} result from ui/brave.js — { held, mistakes, letIn, fired }
   */
  brave(result = {}) {
    const u = understanding;
    const beats = [];
    let outcome = 'out';

    const knewBait   = u.has('texts_are_bait');
    const knewFrail  = u.has('incursion_fragile');
    const knewOpening= u.has('incursion_needs_opening');

    if (result.letIn) {
      beats.push(
        'You slide the chain off because the last message said the thing about the cups, ' +
        'and only he knew about the cups.\n\n' +
        'It has been listening to this apartment for six days.'
      );
      return finish('brave', 'dead', beats, result);
    }

    beats.push(
      'It starts at the kitchen window at nine and works along the front of the building ' +
      'in order, the way you would check a car park for an unlocked door.'
    );

    if (knewOpening) {
      beats.push(
        'You put the mattress against the bathroom door and sit in the tub with the shotgun ' +
        'across your knees, because it has to be given a way in and you have not given it one. ' +
        'There is no window in here. That is the whole reason for the room.'
      );
    } else {
      beats.push(
        'You stand in the middle of the main room where you can see three doorways, ' +
        'which feels correct and is not.'
      );
    }

    if (result.mistakes >= 2) {
      beats.push(
        'At some point you answer it. Not with words — you move, and it hears where you moved to, ' +
        'and after that it stops trying the windows.'
      );
    }

    if (result.held) {
      if (knewFrail && result.fired > 0) {
        beats.push(
          'It comes through the bedroom wall at ten past two, which is not a door and not a window ' +
          'and is exactly the kind of opening you left it.\n\n' +
          'You have one thing in this building that works on one thing in this city, and this is it. ' +
          'It goes down like a folding chair. It is the only fight in fifteen days that lasts under a second, ' +
          'and afterwards you sit on the floor and are sick, and then you reload.'
        );
        outcome = 'out';
      } else if (result.fired > 0) {
        beats.push(
          'You fire twice into the dark of the hall and something falls over in there.\n\n' +
          'It stops. It really does stop. But you have just made the loudest sound in eleven blocks, ' +
          'and there is a second thing in this city that comes when there is noise, and it does not ' +
          'come inside because it does not need to.'
        );
        outcome = state.concealment > 30 && u.has('tormentor_noise_light') ? 'ambiguous' : 'dead';
        if (outcome === 'dead') {
          beats.push(
            'The pause before the first collapse is nine seconds. The pause before the second is four.\n\n' +
            'You have learned to count the gaps. It does you no good at all.'
          );
        } else {
          beats.push(
            'You are out of the building before the second collapse, on foot, with four shells, ' +
            'and the last thing you take is his keys off the desk without knowing why.'
          );
        }
      } else {
        beats.push(
          'It tries the door for two hours and forty minutes. Then it writes something ' +
          'on the outside of it, and goes.\n\n' +
          'You do not read it. In the morning the street is exactly as it was, and you are still here, ' +
          'and the concealment is gone, and nothing is different except that it knows the room now.'
        );
        outcome = knewBait ? 'ambiguous' : 'dead';
      }
    } else {
      beats.push(
        'It finds the way you did not think of, because it has been thinking about this ' +
        'apartment for longer than you have.'
      );
      outcome = 'dead';
    }

    if (outcome === 'out') {
      beats.push(
        'At six the light comes through the bars and lies across the floor in strips.\n\n' +
        'You are alive, in a room, in a city, in the fourth week. His keys are still on the desk.'
      );
    }

    return finish('brave', outcome, beats, result);
  },

  /** Ending C. It ran out while he was still deciding. */
  found() {
    const hot = state.hotProfile || (state.profile.noiseLight >= state.profile.habitation
      ? 'noiseLight' : 'habitation');
    const beats = [];

    beats.push(
      'The keys are on the desk where they have been since the tenth. ' +
      'The shotgun is against the wall by the door.\n\n' +
      'You have been going to decide tomorrow for four days.'
    );

    if (hot === 'noiseLight') {
      beats.push(
        'It starts three streets over at about eleven. Then two streets. Then the sound is not ' +
        'a sound any more, it is the floor doing something floors do not do.\n\n' +
        'There is a pause. You know exactly how long the pauses are.'
      );
      beats.push(
        'It is not hunting this apartment. It has never once hunted this apartment. ' +
        'It is taking the block down to see what runs.'
      );
    } else {
      beats.push(
        'There is nothing at all outside. Inside there is a cup on the counter that you ' +
        'washed and left, and a path worn between the mat and the desk, and a room that has ' +
        'been warm every night for fifteen nights.\n\n' +
        'You did everything quietly. Quiet was the wrong axis.'
      );
      beats.push('The chain is on. It has been watching you put the chain on for six days.');
    }

    beats.push('You were going to decide tomorrow.');
    return finish('found', 'dead', beats, { hot });
  },
};

function roll(p) { return Math.random() < p; }

function finish(id, outcome, beats, detail) {
  const record = {
    id, outcome, beats,
    day: state.day,
    understanding: understanding.score(),
    tier: understanding.tier(),
    flags: understanding.held(),
    beliefs: understanding.heldBeliefs(),
    missedCritical: understanding.criticalMissing(),
    concealment: Math.round(state.concealment),
    profile: concealment.debug().profile,
    detail,
  };
  state.ended = record;
  save();
  audio.play(id === 'keys' ? 'ending_keys' : id === 'brave' ? 'ending_brave' : 'ending_found');
  bus.emit('ending:resolved', record);
  return record;
}

/* Concealment reaching zero is not a warning. It is the ending. */
bus.on('concealment:zero', () => {
  if (!state.ended) bus.emit('ending:trigger', { id: 'found', reason: 'concealment' });
});

export default endings;
