# THE BROOD

A first-person horror survival game set entirely inside one apartment.

You are visiting a friend in a coastal Virginia city when a mass emergence of
unknown entities begins along the Gulf and Atlantic seaboards. You have no car,
no supplies, and no knowledge of the city. For nine days your friend keeps you
alive. On the tenth morning he is gone — and he has left you his car keys, his
shotgun, and everything he owned.

**Fifteen days. One room. Two ways out.**

---

## Status: PROMPT 1 (SKELETON) — complete

This is the skeleton build. All fifteen days are playable start to finish, all
three endings resolve, and every system works. It is deliberately ugly:
programmer-art lighting, no post effects, no sound. That is the plan.

| Prompt | Owns | State |
|---|---|---|
| 1 | Systems, content, structure. Everything runnable. | **done** |
| 2 | `effects.js` + tuning `config.js`. Lighting, grade, horror effects. | not started |
| 3 | `audio.js`. Ambient bed, positional cues, bugs. | not started |

## Running it

No build step. It needs a static server because it uses ES modules and an
import map.

```
npm start          # python3 -m http.server 8080  →  http://localhost:8080
```

Three.js is vendored in `vendor/three/` — nothing is fetched at runtime, and
the game works offline.

**Controls** — `WASD` move · mouse look · `E` interact · `C` crouch · `Esc` back / pause.

## Verifying it

```
npm install        # playwright, dev only
npm run verify
```

`tools/verify.mjs` serves the game, drives it headlessly through
`window.BROOD`, and checks 48 things: that Day 1 reaches Day 15, that Act 2
opens on Day 10, that all three endings resolve, that the two detection
profiles diverge, that waiting makes the car worth less, that reading the
impact log beats that clock, that the Understanding score never appears in the
DOM, and that the effects/audio stub contracts are intact.

---

## Architecture

Four rules, and none of them are negotiable:

1. **Never render live UI onto a 3D surface.** Walk to the computer, press `E`,
   the scene freezes, and the game cuts to a fullscreen 2D interface. `Esc`
   cuts back. `src/ui/index.js` owns the cut.
2. **Entities are 2D billboards, never 3D models.** Textured planes, always
   camera-facing. The one that gets inside in the endgame is still a billboard.
3. **Lighting is the art budget.** Very dark, few sources, heavy fog. Low-poly
   geometry reads fine in low light. No photorealism.
4. **Geometry from primitives.** Boxes, planes, procedural canvas textures. No
   external model or image files anywhere in the project.

```
index.html                 import map → vendor/three
src/
  config.js                EVERY tunable number. Prompt 2 lives here.
  effects.js               visual/horror stubs. Prompt 2 fills these in.
  audio.js                 cue bus + vocabulary. Prompt 3 fills these in.
  bus.js                   tiny sync event bus
  state.js                 the whole game in one object + localStorage
  main.js                  bootstrap, the loop, window.BROOD

  systems/
    clock.js               time of day; runs behind overlays too
    concealment.js         the master clock, and the two detection profiles
    understanding.js       the hidden score, its flags, and its traps
    day.js                 sleep, the day advance, food, condition
    endings.js             resolution, incl. the Road Kill adaptation curve
    script.js              the fifteen days as a script

  world/
    plan.js                the apartment as numbers; colliders
    apartment.js           interior geometry
    street.js              the exterior + billboard slots
    materials.js           procedural canvas textures + silhouettes
    lighting.js            applies config.light / config.fog per phase
    controls.js            pointer lock, WASD, sliding AABB collision
    interactables.js       everything you can press E on
    index.js               World — the only thing that imports three

  ui/
    index.js               the freeze-and-overlay manager
    ui.css                 prompt 1 styling (legible, grey, unfinished)
    screens/               news, computer, phone, food, sleep, notes,
                           laptop, leave, brave, ending, scene

  content/
    news.js                40 articles across the four movements
    forum.js               137 posts across 8 threads
    docs.js                17 Foundation documents + 12 video logs
    sheet.js               the crowdsourced tracking spreadsheet
    mail.js                the Pathogen's bait, and the terminal line
    phone.js               29 family messages, his voicemail, the texts
    notes.js               15 of his notes, his laptop, what it writes
    events.js              openers + the scheduled beats
```

---

## The contract for prompts 2 and 3

Prompt 1 leaves hooks. **If prompt 2 or 3 finds itself refactoring, something
here was violated and should be fixed rather than worked around.**

### `effects.js` — prompt 2

Every function is a no-op that records the call. Systems already call them at
the right moments; prompt 2 replaces the bodies and edits nothing else.

- `init(ctx)` gets `{ renderer, scene, camera, world, state }`.
- `update(dt)` runs every frame, always, including behind an overlay.
- `degrade(0..4)` is the standing degradation level. `syncFromState(state)`
  recomputes it from condition, darkness and accumulated sightings.
- `corruptText(text, opts)` **must return a string.** It is called on every
  news headline, article, forum post, document, note and phone message before
  display. Prompt 1 returns the input unchanged. Prompt 2 makes text harder to
  read, and then makes it alter itself between glances.
- One-shots: `sighting · flicker · shake · push · flash · blackout ·
  peripheral · warmth · screenNoise · signalLoss · billboard · atmosphere`.

Everything is fire-and-forget, safe to call twice a frame, and safe to call
while the scene is frozen.

### `audio.js` — prompt 3

`CUES` is the full vocabulary and it is already exhaustive; adding cues is
fine, needing prompt 1 edited is not. `play(cue, {at, loop, …})`, `stop(cue)`,
`bed(cue)`, `duck()`. An unknown cue warns to console, which is how a typo in a
system module gets caught.

Sound does enormous work in this game. The gaps between the collapses, the
total silence that means Anguish, the static on Day 15 that is the loudest
thing in the apartment — those are all already emitted as events.

### `config.js` — prompt 2

Lighting per phase, fog per phase and per interior/exterior, grade, player
feel, the clock, every Concealment rate, food, condition tiers, transition
timings. Prompt 2 retunes this file rather than hunting through the codebase.

---

## Systems worth knowing about

**Concealment** is one resource that only goes down, but two detection
profiles feed it. `noiseLight` is the Tormentor: sound and light. `habitation`
is the Incursion: dishes, warmth, worn paths, routine. Some behaviours that
hide you from one expose you to the other, and whichever ran hot last night
decides what turns up this morning. The player is never told which.

**Understanding** (0–100, never displayed) resolves the endings. `FLAGS` are
things learned; `BELIEFS` are things the game teaches confidently and wrongly.
A belief costs nothing once the player picks up the flag that corrects it —
the difference between having information and having understanding. The four
big traps are shooting Anguish, leaving a light on, gathering at shelters, and
the 1,300-year-old solar feeding of Zānuwām.

**Road Kill** is a second countdown running under Concealment, pointed the
other way: `adaptation(day)` rises across Act 2, so every day the player waits
the car is worth less. Reading the spreadsheet's impact tab carefully enough
to date a highway beats that clock outright. Neither meter is ever shown.

**The window** is bars with a curtain over them, not glass in a frame. It is a
poverty detail, then a security feature that keeps things out, then the reason
he cannot get out — the same object, and the game never states any of it. It
is also a light switch: no glass means daylight enters freely when it's open.

## Save data

One slot, `localStorage["thebrood.save.v1"]`, written on every day advance.
Nothing leaves the machine. There is no backend and there never will be.

## Licence

MIT (see `LICENSE`). Three.js is vendored under its own MIT licence.
