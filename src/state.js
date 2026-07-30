/**
 * state.js — the whole game in one plain object, plus localStorage.
 *
 * Single save slot. Autosave on day advance. No server, no accounts.
 * Everything that must survive a reload lives in `state`. Everything that
 * must not (three.js objects, DOM nodes, timers) lives elsewhere.
 */

import { CONFIG } from './config.js';
import bus from './bus.js';

const SAVE_KEY = 'thebrood.save.v1';
const SAVE_VERSION = 1;

export function freshState() {
  return {
    version: SAVE_VERSION,

    /* --- structure --- */
    day: CONFIG.days.first,
    act: 1,
    // Hours since midnight, floating. Starts at wake.
    hour: CONFIG.clock.wakeHour,
    phase: 'day',            // day | dusk | night | dawn
    started: false,
    ended: null,             // ending id once resolved

    /* --- the master clock --- */
    concealment: CONFIG.concealment.start,
    // Cumulative drain attributed to each detection profile. The Tormentor
    // reads noise and light. The Incursion reads signs of habitation.
    profile: { noiseLight: 0, habitation: 0 },
    // The same, for today only. Reset at sleep; decides tonight's threat.
    profileToday: { noiseLight: 0, habitation: 0 },
    // Which profile ran hot last night. Read by the event scheduler.
    hotProfile: null,

    /* --- body --- */
    condition: CONFIG.condition.start,
    foodPortions: CONFIG.food.act1Portions,
    ateToday: 'none',        // none | ration | full
    sightings: 0,

    /* --- the room --- */
    lights: { main: false, kitchen: false, bath: false, bedroom: false, landing: false },
    // Every day starts at seven in the morning, and by day an open window
    // costs almost nothing. So it starts open: the first thing anyone sees
    // is the bars laid across the floor. Closing it is the evening's choice.
    curtainOpen: true,
    tvOn: false,
    tvVolume: 'low',         // off | low | up
    computerOn: false,
    waterRunning: false,
    cooking: false,
    dishesLeft: 0,
    fridgeOpen: false,

    /* --- objects --- */
    hasShotgun: false,
    hasKeys: false,
    hasWallet: false,
    shells: CONFIG.shotgun.shells,
    shotgunFired: 0,
    bedroomUnlocked: false,
    frontDoorOpened: false,
    markedToday: false,
    marksOnWall: 0,

    /* --- knowledge --- */
    understandingFlags: {},  // flag -> true
    beliefs: {},             // trap beliefs the player has adopted
    readIds: {},             // content id -> true, so nothing double-counts
    understandingRaw: 0,     // accumulated before comprehension weighting

    /**
     * §4.2. THE MACHINE REMEMBERS. Everything a real browser and a real
     * desktop would keep between sessions, kept in the save.
     *
     * Read/unread state alone transforms the experience: eighty forum posts
     * with no read tracking is a chore, and with it, it is a feed.
     */
    web: {
      /** The back-stack. Entries are URLs; hIndex is where we are in it. */
      history: [],
      hIndex: -1,
      /** [{ url, title }] — persisted, so a bookmark survives a reload. */
      bookmarks: [],
      /** url -> scrollTop, so a thread reopens where you left it. */
      scroll: {},
      /** threadId -> { opened: day, seenReplies: n } for the new-reply badges. */
      threads: {},
      /** The player's own posts. §5. */
      posts: [],
      /** postId -> true for replies the player has already seen. */
      seenReplies: {},
      /** Their forum identity, made on first post and never changed. */
      handle: null,
      joinedDay: 0,
    },

    /** §4.2 + §8. The desktop, as the player has arranged it. */
    os: {
      /** iconId -> [x, y], only for icons the player has actually moved. */
      iconPos: {},
      /** windowKind -> { x, y, w, h, max } */
      win: {},
      /** mailId -> true */
      mailRead: {},
      mailDeleted: {},
    },

    /* --- the phone --- */
    phone: {
      missedCalls: 0,
      unreadTexts: [],       // ids
      seenTexts: {},
      calledFriend: 0,       // how many times the player has tried his number
      lastCallText: null,
      lastFamilyCallDay: 0,
      signalBars: 4,
      answeredToday: false,
      sent: [],              // what he has said back, and whether it went
      usedReplies: {},
    },

    /* --- scripted world state --- */
    flags: {
      livedInDarkness: 0,    // consecutive days without turning a light on
      litSomethingToday: false,
      routineBreaks: 0,
      heardChoir: false,
      sawAnguish: false,
      lookedAtAnguish: false,
      openedPathogenLink: false,
      answeredDoor: false,
      friendVoicemailStage: 0,
      incursionNotes: 0,
      guardReportSeen: false,

      /**
       * THE SURVIVOR AT THE DOOR. §2.
       *
       * 'none' until they knock. Then 'admitted' or 'refused', and that is
       * the last word on it: the game never establishes whether they were
       * real. Both outcomes leave evidence the player can partly read and
       * never finish reading.
       */
      stranger: 'none',
      /** Which day they knocked, so the aftermath can be dated. */
      strangerDay: 0,
      /** What they were carrying, if the player looked. Read afterwards. */
      strangerSeen: false,
    },

    /* --- per-day event bookkeeping --- */
    eventsFired: {},         // eventId -> day it fired
    log: [],                 // short player-facing journal of what happened

    /* --- meta --- */
    playtimeSeconds: 0,
    savedAt: null,
  };
}

export let state = freshState();

/* ------------------------------------------------------------------ */
/* persistence                                                         */
/* ------------------------------------------------------------------ */

export function save() {
  try {
    state.savedAt = Date.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    bus.emit('state:saved', state);
    return true;
  } catch (e) {
    console.warn('[state] save failed', e);
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed.version !== SAVE_VERSION) return false;
    // Merge over a fresh object so a save from an older content pass never
    // leaves a field undefined.
    Object.assign(state, freshState(), parsed);
    state.flags = Object.assign(freshState().flags, parsed.flags || {});
    state.phone = Object.assign(freshState().phone, parsed.phone || {});
    state.lights = Object.assign(freshState().lights, parsed.lights || {});
    // §4.2. The browser and the desktop, so a save restores the machine the
    // way the player left it: history, bookmarks, scroll positions, their own
    // posts, and where they dragged the icons.
    state.web = Object.assign(freshState().web, parsed.web || {});
    state.os = Object.assign(freshState().os, parsed.os || {});
    bus.emit('state:loaded', state);
    return true;
  } catch (e) {
    console.warn('[state] load failed', e);
    return false;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch { return false; }
}

export function wipe() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ }
  reset();
}

export function reset() {
  const fresh = freshState();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, fresh);
  bus.emit('state:reset', state);
  return state;
}

/** Replace state wholesale (used by the debug harness). */
export function adopt(next) {
  reset();
  Object.assign(state, next);
  bus.emit('state:loaded', state);
  return state;
}

/* ------------------------------------------------------------------ */
/* small helpers used everywhere                                       */
/* ------------------------------------------------------------------ */

export function anyLightOn() {
  return Object.values(state.lights).some(Boolean);
}

export function note(text) {
  state.log.push({ day: state.day, hour: state.hour, text });
  if (state.log.length > 300) state.log.shift();
  bus.emit('log', text);
}

export default state;
