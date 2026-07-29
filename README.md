# THE BROOD

A first-person horror survival game set entirely inside one apartment.

You are visiting a friend in a coastal Virginia city when a mass emergence of
unknown entities begins along the Gulf and Atlantic seaboards. You have no car,
no supplies, and no knowledge of the city. For nine days your friend keeps you
alive. On the tenth morning he is gone — and he has left you his car keys, his
shotgun, and everything he owned.

**Fifteen days. One room. Two ways out.**

---

## Status: PROMPT 2 (GRAPHICS) — complete

All fifteen days are playable, all three endings resolve, and the game now
looks like something. There is still no sound.

| Prompt | Owns | State |
|---|---|---|
| 1 | Systems, content, structure. Everything runnable. | **done** |
| 2 | `effects.js` + tuning `config.js`. Lighting, grade, horror effects. | **done** |
| 3 | `audio.js`. Ambient bed, positional cues, bugs. | not started |

### The thesis

**The 3D apartment is beautiful and dark. The 2D screens are aggressively,
authentically ugly.** The player sits in an oppressive sodium-lit room and
reads about the end of the world on a website that also has a sidebar ad for
a personal injury attorney and a weather widget with a stock photo of a beach.

The governing rule everywhere in the 2D layer is **diegetic vs decorative**.
Horror lives *inside* the content — forensic plates, tape damage, EAS
takeovers, redaction. It never touches the *chrome*: no blood on a masthead,
no horror fonts, no grunge over an interface, nothing that looks designed or
looks like a game UI. A station CMS renders eleven people missing in the same
layout it uses for high school football scores, and that is the horror.

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

  fx/
    post.js                one render target, one shader: barrel → CA →
                           edge softness → grade → vignette → grain → flash
    entityArt.js           the entities, drawn in three layers
    photo.js               the degradation that makes a drawing a photograph

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
    index.js               the freeze-and-overlay manager + settings
    imagery.js             every on-screen image, generated on a canvas
    css/base.css           the game's own chrome (HUD, plate, menu)
    css/web.css            the news site, the forum, the sheet, scans
    css/os.css             the desktop, mail, the phone, the television
    screens/               tv, computer, phone, food, sleep, notes,
                           laptop, leave, brave, ending, scene
    web/                   newssite, forum, sheet, files — sites in a browser
    apps/mail.js           three-pane mail client

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

### `effects.js` — implemented in prompt 2

The stub contract is unchanged: fire-and-forget, safe to call twice a frame,
safe to call while the scene is frozen, and `corruptText` still returns a
string. What the bodies now do:

- Camera sway, breathing and headbob driven by condition. Each sighting adds
  to sway **permanently** — it is the one thing here that never decays.
- `corruptText` alters exactly one word per *glance* once degradation is bad
  enough, never repeats an alteration, and is stable within a glance so a
  rerender never churns. Never flagged.
- Brownouts cut everything for a beat, leaving only the streetlight through
  the bars, then the bulb stutters back.
- Anguish exposure: low-amplitude rate-limited flashing, aberration spike,
  permanent worst-tier degradation for the rest of the run.
- `pathogenManifest()` stops the frame and recolours the monitor's light in
  the 3D room. No creature.

### `audio.js` — prompt 3

`CUES` is the full vocabulary and it is already exhaustive; adding cues is
fine, needing prompt 1 edited is not. `play(cue, {at, loop, …})`, `stop(cue)`,
`bed(cue)`, `duck()`. An unknown cue warns to console, which is how a typo in a
system module gets caught.

Sound does enormous work in this game. The gaps between the collapses, the
total silence that means Anguish, the static on Day 15 that is the loudest
thing in the apartment — those are all already emitted as events.

### `config.js`

Lighting per phase, fog, the post chain, the fifteen-day grade bands, player
feel, the clock, every Concealment rate, food, condition tiers, the broadcast
decay curve, the apartment's decay schedule, accessibility, timings.

**A note on light units:** three.js is physically correct — intensity is
candela and irradiance falls off as 1/d². The window spotlight is ~9 m from
the floor it lands on, so its numbers are two orders of magnitude larger than
the bulbs'. That is arithmetic, not taste. Diffuse surfaces then divide by π
and by a dark albedo, which is another factor of ten.

### The lighting model

Three motivated sources and nothing else:

| Source | Colour | Character |
|---|---|---|
| Streetlight through the bars | sodium `#C87F3A` | the only warm light in the game; hard bar-shadows |
| Interior bulb | dying CFL `#B4C2AC` | ugly, too dim, flickering at the edge of perception |
| Screens | CRT `#9FB8CE` | lights a face and nothing else |

Ambient is a floor value, not a light. If a corner is not lit by one of those
three it is black, and blackness is the point.

The **bar-shadows** are the signature image. One shadow-casting spotlight sits
outside the west wall; its colour is the time of day and its existence is the
curtain. Two things it depends on and neither is obvious: the shadow
`normalBias` must stay far below the bar radius (32 mm) or the sample offsets
straight past them, and the apartment needs a **roof** — never seen — or the
cone clears the wall tops and floods the interior from above.

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

## Accessibility

- **Reduced flashing** in Settings, reachable from the title screen and the
  pause menu. `prefers-reduced-motion` forces it on and locks the control.
  Every luminance flash is amplitude-capped and rate-limited to 3 Hz in both
  modes; nothing in the game requires seeing one.
- **Volume** in the same panel. Both choices persist per machine.
- Keyboard focus stays visible on every 2D surface; sites, tabs, files and
  mail rows are all reachable by tab and Enter.
- Post is a single fullscreen pass on one render target, pixel ratio capped
  at 1.5, one shadow-casting light in the room and one outside it.

## Save data

One slot, `localStorage["thebrood.save.v1"]`, written on every day advance.
Nothing leaves the machine. There is no backend and there never will be.

## Licence

MIT (see `LICENSE`). Three.js is vendored under its own MIT licence.
