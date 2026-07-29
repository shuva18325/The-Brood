/**
 * interactables.js — everything you can press E on.
 *
 * Each entry is { id, anchor, label, range, available(), act() }. The
 * interaction loop picks the nearest available one inside range that is
 * roughly in front of the camera and shows one prompt. Never two.
 *
 * Anything that opens a screen calls ui.open(...) which freezes the scene
 * and cuts to a fullscreen 2D interface. Nothing is ever rendered onto a
 * surface in the 3D world.
 */

import * as THREE from 'three';
import { CONFIG } from '../config.js';
import state, { note } from '../state.js';
import bus from '../bus.js';
import audio from '../audio.js';
import effects from '../effects.js';
import clock from '../systems/clock.js';
import concealment from '../systems/concealment.js';
import understanding from '../systems/understanding.js';
import { drawTally } from './apartment.js';

const D = CONFIG.days;

export function buildInteractables(ctx) {
  const { world, ui } = ctx;
  const apt = world.apt;
  const A = apt.anchors;
  const list = [];

  const add = (def) => { list.push(def); return def; };

  /* ---------------------------------------------------------------- */
  /* the window and its curtain                                        */
  /* ---------------------------------------------------------------- */
  add({
    id: 'curtain',
    anchor: A.curtain,
    range: 1.5,
    label: () => state.curtainOpen ? 'pull the curtain across' : 'pull the curtain back',
    act() {
      state.curtainOpen = !state.curtainOpen;
      audio.play(state.curtainOpen ? 'curtain_open' : 'curtain_close');
      bus.emit('curtain', state.curtainOpen);
      if (state.curtainOpen && state.day === 1 && !state.eventsFired.windowFirstLook) {
        state.eventsFired.windowFirstLook = state.day;
        ui.say('There is no glass. There is a frame, and bars, and then the street. ' +
               'You have been putting a curtain over a hole for nine days.');
      }
    },
  });

  /* ---------------------------------------------------------------- */
  /* screens                                                           */
  /* ---------------------------------------------------------------- */
  add({
    id: 'tv',
    anchor: A.tv,
    range: 1.6,
    label: () => state.tvOn ? 'turn the television off' : 'turn the television on',
    act() {
      state.tvOn = !state.tvOn;
      if (state.tvOn) {
        audio.play('tv_on'); bus.emit('tv:on');
        ui.open('news');
      } else {
        audio.play('tv_off');
      }
    },
  });

  add({
    id: 'computer',
    anchor: A.computer,
    range: 1.5,
    label: () => 'use the computer',
    act() {
      if (!state.computerOn) { state.computerOn = true; audio.play('pc_boot'); }
      ui.open('computer');
    },
  });

  add({
    id: 'phone',
    anchor: A.phone,
    range: 1.4,
    label: () => state.phone.unreadTexts.length ? 'the phone (' + state.phone.unreadTexts.length + ')' : 'the phone',
    act() { ui.open('phone'); },
  });

  /* ---------------------------------------------------------------- */
  /* the kitchen                                                       */
  /* ---------------------------------------------------------------- */
  add({
    id: 'fridge',
    anchor: A.fridge,
    range: 1.5,
    label: () => state.fridgeOpen ? 'close the fridge' : 'open the fridge',
    act() {
      state.fridgeOpen = !state.fridgeOpen;
      audio.play(state.fridgeOpen ? 'fridge_open' : 'fridge_close');
      apt.dynamic.fridgeDoor.rotation.y = state.fridgeOpen ? -1.9 : 0;
      if (state.fridgeOpen) ui.open('food');
    },
  });

  add({
    id: 'sink',
    anchor: A.sink,
    range: 1.4,
    label: () => state.waterRunning ? 'turn the tap off' : 'turn the tap on',
    act() {
      state.waterRunning = !state.waterRunning;
      audio.play(state.waterRunning ? 'tap_on' : 'tap_off');
      if (state.waterRunning) audio.play('bed_water_running', { loop: true });
      else audio.stop('bed_water_running');
      if (!state.waterRunning && state.dishesLeft > 0) {
        state.dishesLeft = 0;
        audio.play('dishes');
        ui.say('The dishes are done. The room smells like a room somebody lives in.');
      }
    },
  });

  add({
    id: 'hotplate',
    anchor: A.hotplate,
    range: 1.4,
    label: () => state.cooking ? 'turn the hotplate off' : 'turn the hotplate on',
    available: () => state.foodPortions > 0,
    act() {
      state.cooking = !state.cooking;
      if (state.cooking) audio.play('bed_hotplate', { loop: true });
      else audio.stop('bed_hotplate');
      bus.emit('cooking', state.cooking);
    },
  });

  add({
    id: 'cabinets',
    anchor: A.cabinets,
    range: 1.4,
    label: () => 'the cabinets',
    act() {
      audio.play('cabinet');
      const lines = [
        'Plates on the left. Cups behind the plates, which is not where cups go.',
        'You look for the cups in the wrong cabinet again. It has been ten days.',
        'Half a bag of rice. A tin with the label off. His mug, which you do not use.',
      ];
      ui.say(lines[Math.min(lines.length - 1, Math.floor(state.day / 5))]);
    },
  });

  /* ---------------------------------------------------------------- */
  /* the wall                                                          */
  /* ---------------------------------------------------------------- */
  add({
    id: 'tally',
    anchor: A.tally,
    range: 1.5,
    label: () => state.markedToday ? 'the marks on the wall' : 'mark the day',
    act() {
      if (state.markedToday) {
        ui.say(`${state.marksOnWall} marks. He started it as a joke on the second day.`);
        return;
      }
      state.markedToday = true;
      state.marksOnWall += 1;
      drawTally(apt.dynamic.tally.material, state.marksOnWall);
      audio.play('marker_squeak');
      concealment.event('markTheWall');
      bus.emit('ritual', 'tally');
    },
  });

  /* ---------------------------------------------------------------- */
  /* sleep                                                             */
  /* ---------------------------------------------------------------- */
  add({
    id: 'mat',
    anchor: A.mat,
    range: 1.6,
    label: () => 'lie down',
    act() { ui.open('sleep'); },
  });

  // The bathroom is the safe corner. No window, one door, and a room
  // small enough that the door can be taken off and put against the frame.
  add({
    id: 'bathroom',
    anchor: A.bathroom,
    range: 1.8,
    label: () => 'sit down in here',
    act() {
      const lines = [
        'No window in here. It is the only room in the apartment with no window and you have been aware of that since the first night.',
        'You sit on the floor between the tub and the door with your back against the tiles.\n\nIt is the smallest room and it is the only one where you can see the whole of it at once.',
        'The door comes off its hinges in about four minutes if you have a screwdriver. You have checked. You have checked twice.',
      ];
      ui.say(lines[Math.min(lines.length - 1, Math.floor(state.day / 6))]);
    },
  });

  /* ---------------------------------------------------------------- */
  /* the landing                                                       */
  /* ---------------------------------------------------------------- */
  add({
    id: 'shotgun',
    anchor: A.shotgun,
    range: 1.5,
    label: () => state.hasShotgun ? 'put it back' : 'take the shotgun',
    act() {
      state.hasShotgun = !state.hasShotgun;
      apt.dynamic.shotgun.visible = !state.hasShotgun;
      audio.play('shotgun_pickup');
      bus.emit('shotgun', state.hasShotgun);
      if (state.hasShotgun && !state.eventsFired.shotgunFirst) {
        state.eventsFired.shotgunFirst = state.day;
        ui.say('Heavier than it looks. Six in it. He showed you how to work it on the third day ' +
               'and then took it off you and put it back in the corner.');
      }
    },
  });

  add({
    id: 'frontDoor',
    anchor: A.frontDoor,
    range: 1.7,
    label: () => {
      if (state.act < 2) return 'the front door';
      if (state.hasKeys) return 'the front door — go';
      return 'the front door';
    },
    act() {
      if (state.act < 2) {
        audio.play('door_locked');
        ui.say('Deadbolt, chain, and the two-by-four he screwed across it on the sixth day. ' +
               'He goes out through here. You have not been out through here.');
        return;
      }
      ui.open('leave');
    },
  });

  add({
    id: 'stairs',
    anchor: null,
    at: new THREE.Vector3(5.6, 1.2, 0.3),
    range: 1.5,
    label: () => 'look down the stairs',
    act() {
      ui.say('The stairwell light has been out since before you got here. ' +
             'Down there is the street door, and the street door has a glass panel in it.');
    },
  });

  /* ---------------------------------------------------------------- */
  /* his room — Act 2                                                  */
  /* ---------------------------------------------------------------- */
  add({
    id: 'bedroomDoor',
    anchor: null,
    at: new THREE.Vector3(3.3, 1.2, 0.7),
    range: 1.5,
    label: () => state.bedroomUnlocked ? 'his door' : 'his door — locked',
    available: () => !state.bedroomUnlocked,
    act() {
      audio.play('door_locked');
      ui.say('Locked. It has been locked since you got here and you have never asked why, ' +
             'because you are sleeping on his floor for free.');
    },
  });

  add({
    id: 'laptop',
    anchor: A.laptop,
    range: 1.4,
    label: () => 'his laptop',
    available: () => state.bedroomUnlocked,
    act() { ui.open('laptop'); },
  });

  add({
    id: 'notes',
    anchor: A.notes,
    range: 1.6,
    label: () => 'his notes',
    available: () => state.bedroomUnlocked,
    act() { ui.open('notes'); },
  });

  add({
    id: 'dresser',
    anchor: A.dresser,
    range: 1.5,
    label: () => 'the open drawer',
    available: () => state.bedroomUnlocked,
    act() {
      if (!state.eventsFired.pistolGone) {
        state.eventsFired.pistolGone = state.day;
        understanding.grant('friend_took_pistol', 'the drawer');
        ui.say('Socks, a phone charger, a box of nine-millimetre with eleven left in it, ' +
               'and a folded cloth with the shape still in it.\n\n' +
               'The shotgun is downstairs against the wall.');
      } else {
        ui.say('Eleven rounds for a gun that is not in this apartment.');
      }
    },
  });

  add({
    id: 'keys',
    anchor: A.keys,
    range: 1.4,
    label: () => 'his keys',
    available: () => state.act >= 2,
    act() {
      ui.say('A car key, a house key, a key you do not recognise, and a bottle opener ' +
             'from a bar on Granby that closed in March.\n\n' +
             'The car is the blue one. It is parked where it has been parked for nine days.');
    },
  });

  /* ---------------------------------------------------------------- */
  /* light switches                                                    */
  /* ---------------------------------------------------------------- */
  for (const room of ['main', 'kitchen', 'bath', 'bedroom', 'landing']) {
    add({
      id: 'switch.' + room,
      anchor: A['switch.' + room],
      range: 1.2,
      label: () => (state.lights[room] ? 'off' : 'on'),
      available: () => room !== 'bedroom' || state.bedroomUnlocked,
      act() {
        state.lights[room] = !state.lights[room];
        audio.play(state.lights[room] ? 'switch_on' : 'switch_off');
        if (state.lights[room]) bus.emit('light:on', room);
        else bus.emit('light:off', room);
        if (state.lights[room] && clock.isDark() && state.act >= 2 && !state.eventsFired.lightWarned) {
          state.eventsFired.lightWarned = state.day;
          ui.say('The room fills up with orange. Through the bars, the street below you ' +
                 'is now a street with a lit window over it.');
        }
      },
    });
  }

  return list;
}

/* ------------------------------------------------------------------ */
/* the interaction loop                                                */
/* ------------------------------------------------------------------ */

export class Interaction {
  constructor(ctx, list) {
    this.ctx = ctx;
    this.list = list;
    this.current = null;
    this._v = new THREE.Vector3();
    this._fwd = new THREE.Vector3();

    window.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyE') return;
      if (!this.ctx.controls.enabled) return;
      if (this.current) {
        audio.play('menu_select');
        this.current.act();
        this.refresh();
      }
    });
  }

  refresh() { this._pick(); }

  update() {
    if (!this.ctx.controls.enabled) {
      if (this.current) { this.current = null; this.ctx.ui.prompt(null); }
      return;
    }
    this._pick();
  }

  _pick() {
    const cam = this.ctx.camera;
    cam.getWorldDirection(this._fwd);

    let best = null, bestScore = -Infinity;
    for (const def of this.list) {
      if (def.available && !def.available()) continue;
      const p = def.anchor ? def.anchor.getWorldPosition(this._v.clone()) : def.at;
      if (!p) continue;
      const d = cam.position.distanceTo(p);
      const range = def.range ?? CONFIG.player.interactRange;
      if (d > range) continue;
      const dir = p.clone().sub(cam.position).normalize();
      const facing = this._fwd.dot(dir);
      if (facing < 0.15) continue;
      const score = facing * 2 - d * 0.5;
      if (score > bestScore) { bestScore = score; best = def; }
    }

    if (best !== this.current) {
      this.current = best;
      this.ctx.ui.prompt(best ? best.label() : null);
    } else if (best) {
      this.ctx.ui.prompt(best.label());
    }
  }
}

export default buildInteractables;
