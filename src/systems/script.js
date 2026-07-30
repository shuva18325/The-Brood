/**
 * script.js — runs the fifteen days.
 *
 * Act 1 is escalation you cannot act on. Act 2 is agency, and every action
 * might be wrong. The script never explains. It shows a thing and moves on.
 */

import { CONFIG } from '../config.js';
import state, { note, save } from '../state.js';
import bus from '../bus.js';
import audio from '../audio.js';
import effects from '../effects.js';
import clock from './clock.js';
import understanding from './understanding.js';
import concealment from './concealment.js';
import endings from './endings.js';
import day, { registerSighting } from './day.js';
import { OPENERS, EVENTS, HANDOFF, LAST_DAY } from '../content/events.js';
import { ADMITTED_FLAGS as STRANGER_FLAGS, AFTER as STRANGER_AFTER } from '../content/stranger.js';
import { writingFor } from '../content/notes.js';
import { CHOIR_CALLS } from '../content/phone.js';

const D = CONFIG.days;

export class Script {
  constructor(ctx) {
    this.ctx = ctx;
    this.pending = [];
    this._wired = false;
    this.wire();
  }

  wire() {
    if (this._wired) return;
    this._wired = true;

    // The Incursion writes while you are at the computer, and you find it
    // on the way back. That is the whole beat: a note on the fridge that
    // was not there.
    bus.on('ui:close', (name) => {
      if (name !== 'computer') return;
      const w = writingFor(state.day);
      if (!w) return;
      if (state.eventsFired['writing' + state.day]) return;
      state.eventsFired['writing' + state.day] = state.day;
      state.flags.incursionNotes++;
      understanding.read('writing' + state.day, w);
      audio.play('incursion_write');
      setTimeout(() => {
        this.ctx.ui.open('scene', {
          beats: [`You come back from the desk and there is writing ${w.where}.`, w.body],
        });
      }, 500);
    });

    bus.on('ending:trigger', ({ id }) => this.triggerEnding(id));
    bus.on('ui:forceSleep', () => this.forceSleep());
  }

  /** Called on waking, after the day counter has advanced. */
  onWake(day) {
    this.pending = EVENTS.filter(e => e.day === day).map(e => ({ ...e, fired: false }));

    // §6. He puts something on while he cooks. The same handful of tracks
    // across days 2–8, and after Day 9 it never plays again — which is the
    // emotional score of the entire second act.
    if (day >= 2 && day <= 8) {
      setTimeout(() => audio.startMusic(day % 3), 9000);
      setTimeout(() => audio.stopMusic(), 150000);
    }

    const opener = OPENERS[day];
    if (opener) setTimeout(() => this.ctx.ui.say(opener, 7000), 700);

    // Wake-time events run immediately.
    for (const e of this.pending) {
      if (e.at === 'wake') { e.fired = true; this.run(e); }
    }

    // Act 1: he handles the outside world. Food, information, and the
    // decision of when it is safe. The player is a guest with no agency,
    // so the body systems do not bite yet — that is the point of Act 1,
    // and it is why Act 2 lands.
    if (day < D.actTwo) {
      state.foodPortions = Math.max(4, CONFIG.food.act1Portions - Math.floor(day / 2));
      state.ateToday = 'full';
      state.flags.litSomethingToday = true;
      state.flags.livedInDarkness = 0;
    }

    // The morning after she knocked. Two aftermaths, and neither of them
    // closes it — that is the point, and it is enforced in stranger.js.
    if (state.flags.stranger !== 'none' && state.flags.strangerDay === day - 1) {
      const after = STRANGER_AFTER[state.flags.stranger];
      if (after) {
        setTimeout(() => this.ctx.ui.open('scene', { beats: [after] }), 3400);
      }
      if (state.flags.stranger === 'admitted') {
        // Nine tins on the counter. A net gain she did not have to make.
        state.foodPortions += 9;
        note('Nine tins on the counter, and the bag folded flat next to them.');
      }
    }

    // Whichever profile ran hot last night gets an answer this morning.
    // The player is never told which meter they tripped — only what turned
    // up, and they have to work backwards from that to what they did.
    if (day > D.actTwo && state.hotProfile) this.profileConsequence(state.hotProfile);

    save();
    bus.emit('script:wake', day);
  }

  /**
   * Grant a flag only if the player actually watched the thing, for as long
   * as it was there to watch. The curtain being open is not the same as
   * having looked, and understanding is only ever earned by looking.
   */
  grantOnSight(ids, seconds, flag, why) {
    const camera = this.ctx.camera;
    const street = this.ctx.world.street;
    const until = performance.now() + seconds * 1000;
    const check = () => {
      if (state.ended) return;
      if (state.curtainOpen && !this.ctx.ui.isOpen &&
          ids.some(id => street.lookingAt(camera, id, 16))) {
        understanding.grant(flag, why);
        return;
      }
      if (performance.now() < until) requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }

  /**
   * The Tormentor reads noise and light. The Incursion reads that somebody
   * lives here. Some behaviours that hide you from one expose you to the
   * other, and this is the only feedback the game ever gives about it.
   */
  profileConsequence(profile) {
    const ui = this.ctx.ui;
    const world = this.ctx.world;

    if (profile === 'noiseLight') {
      setTimeout(() => {
        audio.play('gleaner_chitter');
        world.street.show('gleaner.a', true);
        world.street.show('gleaner.b', true);
        ui.say(
          'There is a gap in the roofline to the north that was not a gap.\n\n' +
          'And there are things on the street going through what is left of it, unhurried, working. ' +
          'They are always after. They have never once been before.',
          8000);
        this.grantOnSight(['gleaner.a', 'gleaner.b'], 45, 'gleaners_follow', 'the morning');
        setTimeout(() => {
          world.street.show('gleaner.a', false);
          world.street.show('gleaner.b', false);
        }, 45000);
      }, 4200);
    } else {
      setTimeout(() => {
        audio.play('incursion_door');
        ui.say(
          'The bathroom door is open.\n\n' +
          'You close it. You have closed it every night for five nights because the hinge ' +
          'ticks when the building settles and it keeps you awake.',
          7000);
        state.flags.incursionNotes++;
      }, 4200);
    }
  }

  /** Called every frame with the in-game hour. */
  update() {
    if (state.ended) return;
    for (const e of this.pending) {
      if (e.fired || e.at === 'wake') continue;
      // Events scheduled past midnight use hours > 24.
      if (state.hour >= e.at) { e.fired = true; this.run(e); }
    }
  }

  run(e) {
    const ui = this.ctx.ui;
    const world = this.ctx.world;

    switch (e.type) {
      case 'say':
        if (e.audio) audio.play(e.audio);
        ui.say(e.text, 6000);
        break;

      case 'collapse': {
        /* §3 + §4.1. ONCE in the whole game, the compressor is forced off
         * so that the collapse arrives into a room that has just gone
         * quiet. It is never repeated, and nothing marks it. */
        const trick = !state.eventsFired.fridgeTrick && state.day === 8;
        const lead = trick && audio.forceFridgeOff() ? 1500 : 0;
        if (lead) state.eventsFired.fridgeTrick = state.day;

        setTimeout(() => {
          audio.play(e.near ? 'collapse_near' : 'collapse_distant');
          effects.shake(e.near ? 0.9 : 0.35, e.near ? 2.0 : 1.2);
          ui.say(e.text, 7000);

          /* The gap IS the sound: it is the Tormentor standing in the
           * wreckage waiting to see if anything runs. Gap length is real
           * information and it is never explained. */
          setTimeout(() => {
            audio.play('tormentor_pause');
            setTimeout(() => {
              // The second one is nearer if the gap was short. Direction
              // and distance are real, so the player hears it close.
              const nearer = (e.gap || 6) <= 5;
              audio.play(nearer ? 'collapse_near' : 'collapse_distant',
                { dz: nearer ? 6 : 0 });
              if (nearer) effects.shake(0.5, 1.4);
            }, 900);
          }, (e.gap || 6) * 1000);
        }, lead);

        if (state.day >= 8) understanding.grant('tormentor_noise_light', 'the gaps');
        break;
      }

      case 'brownout':
        effects.flicker('all', { hard: true });
        audio.play('bed_pipes');
        ui.say(e.text, 4500);
        break;

      case 'gleaners':
        // If you see them, the Tormentor has already been and gone.
        world.street.show('gleaner.a', true);
        world.street.show('gleaner.b', true);
        world.street.show('gleaner.c', true);
        audio.play('gleaner_chitter');
        ui.say(e.text, 7000);
        this.grantOnSight(['gleaner.a', 'gleaner.b', 'gleaner.c'], 60,
                          'gleaners_follow', 'the window');
        setTimeout(() => {
          world.street.show('gleaner.a', false);
          world.street.show('gleaner.b', false);
          world.street.show('gleaner.c', false);
        }, 60000);
        break;

      case 'silence':
        // Every layer. Not a fade — a cut. Held longer than is comfortable.
        audio.bed('bed_silence_total', { seconds: 13 });
        effects.atmosphere('silence', 4);
        ui.say(e.text, 7000);
        understanding.grant('anguish_silence', 'the street');
        break;

      case 'anguish':
        this.anguishEvent();
        break;

      case 'choir':
        this.choirEvent(e.index);
        break;

      case 'crawler':
        this.crawlerEvent();
        break;

      case 'incursionTest':
        audio.play('incursion_door');
        ui.say(e.text, 7000);
        state.flags.incursionNotes++;
        break;

      case 'texts':
        note('Your phone buzzes on the desk. It is his number.');
        audio.play('phone_buzz');
        state.phone.unreadTexts.push('x01');
        ui.say('Your phone goes off on the desk.\n\nIt is his number.', 6000);
        break;

      case 'stranger':
        this.strangerAtTheDoor();
        break;

      case 'handoff':
        this.handoff();
        break;

      case 'actTwo':
        this.actTwo();
        break;

      case 'lastDay':
        setTimeout(() => this.ctx.ui.open('scene', {
          title: `DAY ${CONFIG.days.last}`, beats: [LAST_DAY],
        }), 2200);
        break;

      case 'finale':
        this.finale();
        break;

      default:
        console.warn('[script] unknown event type', e.type);
    }
    bus.emit('script:event', e.id);
  }

  /* ---------------------------------------------------------------- */

  /* ---------------------------------------------------------------- */
  /* §2. THE SURVIVOR AT THE DOOR — the moral centre of Act 2          */
  /*                                                                   */
  /* It fires once across a two-day window, or never. It is NOT        */
  /* resolved: the game does not establish whether she was real, here  */
  /* or anywhere else. Letting her in costs food and Concealment and   */
  /* gives real Understanding, from a person, which is the only time   */
  /* that happens. Turning her away costs nothing at all.             */
  /* ---------------------------------------------------------------- */

  strangerAtTheDoor() {
    // Once per run. The second window is only there in case the player was
    // inside a screen for the first one.
    if (state.flags.stranger !== 'none') return;
    if (state.eventsFired.strangerKnocked) return;
    state.eventsFired.strangerKnocked = state.day;
    state.flags.strangerDay = state.day;

    const ui = this.ctx.ui;
    audio.play('door_knock');
    note('Somebody knocked on the door.');

    setTimeout(() => ui.open('stranger', {}), 1400);
  }

  /** Called by the stranger screen once the player has chosen. */
  resolveStranger(choice) {
    state.flags.stranger = choice;
    if (choice === 'admitted') {
      concealment.event('strangerAdmitted');
      // She eats. Two portions, and she leaves nine tins, so it is a net
      // gain — which the player cannot know until the morning.
      state.foodPortions = Math.max(0, state.foodPortions - 2);
      for (const f of STRANGER_FLAGS) understanding.grant(f, 'Dana');
      note('You let her in. Her name was Dana.');
      // The tins arrive overnight, and the player finds them on waking.
      state.eventsFired.strangerTins = state.day;
    } else {
      note('You did not open the door.');
    }
    bus.emit('stranger:resolved', choice);
    save();
  }

  /**
   * One window event, late. Survivable only by not looking.
   *
   * The game does not tell the player to look away. It tells them the
   * street has gone silent, and then it is up to them.
   */
  anguishEvent() {
    const { world, ui, camera } = this.ctx;
    state.flags.sawAnguish = true;
    world.street.show('anguish.street', true);
    audio.play('anguish_arrival');
    effects.warmth(0.2);

    ui.say('There is something in the street.', 4000);

    let looked = false;
    const started = performance.now();
    const check = () => {
      if (looked || state.ended) return;
      const elapsed = performance.now() - started;
      if (elapsed > 14000) {
        world.street.show('anguish.street', false);
        audio.stop('bed_silence_total');
        understanding.grant('anguish_dont_look', 'not looking');
        ui.say('You did not look at it.\n\nYou will not know, ever, whether that mattered.', 6000);
        return;
      }
      // Looking through an open curtain, at the thing, is the loss.
      if (state.curtainOpen && world.street.lookingAt(camera, 'anguish.street', 12)) {
        looked = true;
        this.lookedAtAnguish();
        return;
      }
      requestAnimationFrame(check);
    };
    requestAnimationFrame(check);
  }

  lookedAtAnguish() {
    const { world, ui } = this.ctx;
    state.flags.lookedAtAnguish = true;
    world.street.show('anguish.street', false);
    audio.play('anguish_present');
    registerSighting('anguish', 3);
    effects.sighting('anguish', { severity: 1, permanent: true });

    ui.open('scene', {
      title: '—',
      closable: false,
      beats: [
        `Red. Hard-looking, but not like skin.\n\nLess than a second. Everyone who has described it has said less than a second and you had assumed they were being dramatic.`,
        `There are eleven things happening in your head and every one of them is the most important thing.\n\nThe flashing does not stop when you close your eyes, which is the part nobody wrote down, because the people who could have written it down could not write.`,
        `It does not come toward the building. It was never going to. It is not here for you and it has never been here for you and you have simply been standing in the room where it is happening.`,
      ],
      choices: [{
        label: '—',
        act: (ctx, u) => {
          const r = endings.found();
          r.beats = [
            `The apartment is exactly as it was.\n\nThe curtain is open. The keys are on the desk. The shotgun is against the wall by the door.`,
            `You are in it for six more days and you do not do any of the things that are in this room.`,
            `Somebody finds the flat in the fourth week. He is alive. He is not there.`,
          ];
          u.swap('ending', { record: r, closable: false });
        },
      }],
    });
  }

  /**
   * The only thing in the building the shotgun is actually for.
   *
   * Ray wrote it on an index card and did not use it. Firing works and
   * costs more than it is worth, which is the whole point of the object.
   */
  crawlerEvent() {
    const ui = this.ctx.ui;
    audio.play('crawler_scratch');
    ui.open('scene', {
      closable: false,
      beats: [
        `Scratching, from the landing. Below waist height, which is a thing you now notice about sounds.`,
        `It is on the stairs. It is not fast and it is not hiding and it does not seem to have decided anything about you yet.\n\nIt is about the size of a dog that is not a dog.`,
      ],
      choices: [
        {
          label: state.hasShotgun ? 'fire' : 'you do not have the shotgun',
          sub: state.hasShotgun
            ? 'it will work. it is the loudest sound in eleven blocks.'
            : 'it is downstairs, on the other side of it',
          act: (ctx, u) => {
            if (!state.hasShotgun) { u.close(); return; }
            state.shells = Math.max(0, state.shells - 1);
            state.shotgunFired++;
            audio.play('shotgun_fire');
            effects.shake(1, 1.4);
            concealment.event('shotgunFired');
            understanding.grant('crawler_shotgun', 'the landing');
            u.close();
            ctx.ui.say(
              'It comes apart. It takes one shell and about a second and it works exactly as well as everyone said it would.\n\n' +
              'Then there is the ringing, and then under the ringing there is the street, and the street has heard it.',
              9000);
          },
        },
        {
          label: 'the two-by-four',
          sub: 'it is right there against the wall',
          act: (ctx, u) => {
            registerSighting('crawler', 0.5);
            concealment.charge(3.5, 1.0, 'the landing');
            understanding.grant('crawler_shotgun', 'the landing');
            u.close();
            ctx.ui.say(
              'You hit it four times and it goes back down the stairs and you do not follow it.\n\n' +
              'Your hands do not stop for about forty minutes. There is a cut on your forearm that you did not feel happen, ' +
              'and there is no hospital in this city, and a survivable injury is not survivable here.',
              10000);
          },
        },
        {
          label: 'go into the bathroom and close the door',
          sub: 'no window. one door.',
          act: (ctx, u) => {
            concealment.charge(0, 2.0, 'waiting it out');
            u.close();
            ctx.ui.say(
              'You sit between the tub and the door for two hours and eleven minutes.\n\n' +
              'It goes at about four. It did not try the door once. You are not sure it ever knew you were here, ' +
              'and you are not sure that is better.',
              9000);
          },
        },
      ],
    });
  }

  choirEvent(index) {
    const call = CHOIR_CALLS[index] || CHOIR_CALLS[0];
    state.flags.heardChoir = true;
    audio.play('choir_call');
    this.ctx.ui.open('scene', {
      beats: [call.body],
      choices: [
        {
          label: 'stay where you are',
          sub: 'it cannot come in. it can only call.',
          act: (ctx, u) => {
            understanding.grant('choir_bait', 'the street');
            u.close();
            ctx.ui.say('It calls for another forty minutes and then it stops.\n\nIt does not sound disappointed. It does not sound like anything. It stops the way a tap stops.', 7000);
          },
        },
        {
          label: 'go to the window and answer',
          sub: '',
          act: (ctx, u) => {
            concealment.event('answerPhone');
            concealment.charge(9, 3, 'answered the street');
            registerSighting('choir', 0.6);
            u.close();
            ctx.ui.say('You say his name out loud, once, through the bars.\n\nIt stops immediately. It does not say anything else for the rest of the night.\n\nSomething now knows that this window has a person behind it.', 8000);
          },
        },
      ],
    });
  }

  /* ---------------------------------------------------------------- */
  /* the hinge                                                         */
  /* ---------------------------------------------------------------- */

  handoff() {
    const ui = this.ctx.ui;
    audio.play('door_open');
    ui.open('scene', {
      title: 'DAY 9',
      closable: false,
      beats: HANDOFF,
      choices: [{
        label: 'wait up',
        sub: 'you are going to wait up',
        act: (ctx, u) => {
          u.close();
          clock.advanceTo(23.5);
          ctx.ui.say('You wait up.', 4000);
        },
      }],
    });
  }

  actTwo() {
    const { world } = this.ctx;
    world.openHisDoor();
    world.dynamic.keys.visible = true;
    audio.play('day_advance');
    note('His door is open. The chain is off. The two-by-four is against the wall.');
  }

  /* ---------------------------------------------------------------- */

  finale() {
    if (state.ended) return;
    const ui = this.ctx.ui;
    ui.open('scene', {
      title: 'DAY 15 · 20:00',
      closable: false,
      beats: [
        `Whatever he brought back in the taped box is finished.\n\nYou can tell because the apartment sounds different. It has stopped being a place that is hidden and started being a place with a light switch in it.`,
        `The keys are on the desk.\n\nThe shotgun is against the wall by the door.`,
      ],
      choices: [
        {
          label: 'take the keys',
          sub: 'down two flights, forty metres to the kerb, and then two hundred miles',
          act: async (ctx, u) => {
            u.closeAll();
            state.frontDoorOpened = true;
            concealment.event('frontDoorOpened');
            await u.plate('', { hold: 900 });
            const r = endings.keys({ day: state.day });
            u.clearPlate();
            u.open('ending', { record: r, closable: false });
          },
        },
        {
          label: state.hasShotgun ? 'take the shotgun and stay' : 'go down and get the shotgun, and stay',
          sub: 'six shells. one of the things in this city can be killed with them.',
          act: (ctx, u) => {
            state.hasShotgun = true;
            u.swap('brave', { closable: false });
          },
        },
      ],
    });
  }

  triggerEnding(id) {
    if (state.ended) return;
    const ui = this.ctx.ui;
    if (id === 'found') {
      ui.closeAll();
      const r = endings.found();
      ui.open('ending', { record: r, closable: false });
    } else if (id === 'brave') {
      ui.closeAll();
      ui.open('brave', { closable: false });
    } else if (id === 'keys') {
      const r = endings.keys({ day: state.day });
      ui.open('ending', { record: r, closable: false });
    }
  }

  forceSleep() {
    if (state.ended) return;
    const ui = this.ctx.ui;
    ui.closeAll();
    ui.open('scene', {
      closable: false,
      beats: [`You are not deciding anything any more.`],
      choices: [{
        label: '—',
        act: async (ctx, u) => {
          u.closeAll();
          await u.plate('', { hold: 700 });
          const wasDay = state.day;
          day.collapse();
          ctx.world.onDayAdvance();
          u.clearPlate();
          ctx.script.onWake(wasDay + 1);
          ctx.resume();
        },
      }],
    });
  }
}

export default Script;
