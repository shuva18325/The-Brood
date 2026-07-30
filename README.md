<div align="center">

# 🕯️ THE BROOD

### ᴀ ꜰɪʀꜱᴛ-ᴘᴇʀꜱᴏɴ ʜᴏʀʀᴏʀ ꜱᴜʀᴠɪᴠᴀʟ ɢᴀᴍᴇ ꜱᴇᴛ ɪɴꜱɪᴅᴇ ᴏɴᴇ ᴀᴘᴀʀᴛᴍᴇɴᴛ

**𝗧𝘄𝗲𝗻𝘁𝘆 𝗱𝗮𝘆𝘀. 𝗢𝗻𝗲 𝗿𝗼𝗼𝗺. 𝗧𝘄𝗼 𝘄𝗮𝘆𝘀 𝗼𝘂𝘁.**

</div>

```
        ╔═══════════════════════════════════════════════════════════════╗
        ║                                                               ║
        ║   NORFOLK, VIRGINIA.  SEPTEMBER.  THE SECOND WEEK.            ║
        ║                                                               ║
        ║   Something is coming out of the water along the whole        ║
        ║   Atlantic seaboard, and nobody has agreed on a word          ║
        ║   for it yet.                                                 ║
        ║                                                               ║
        ╚═══════════════════════════════════════════════════════════════╝
```

## 🩸 What the game is

You came to visit a friend. You do not live here. You have **no car, no
supplies, and no knowledge of the city** — you could not name three streets
if someone made you.

For nine days Ray keeps you alive. He knows which noises matter. He knows
which advice on the forums is going to get people killed. He goes out and
comes back.

On the tenth morning he is gone. The door is locked from the inside. He has
left you his car keys, his shotgun, and everything he owned.

> **You are now the one who decides.**
> And you are ten days behind on everything he knew.

### 🚪 The only two things you can do

|   | |
|---|---|
| 🛡️ | **Stay.** Ration the food. Keep the light off. Keep the noise down. Read everything, and work out which of it is true before it matters. |
| 🚗 | **Leave.** Take the keys. Drive out of a city you cannot navigate, through a night nobody drives in. |

Both are survivable. Both are survivable **only if you understood what you
read** — and the internet you are reading it on is fast, specific,
actionable, unverified, panicked, and sometimes lethally wrong.

Nobody in this game is a narrator. Everybody in it is writing badly, at
speed, in the worst week of their lives.

### 👁️ What it will not do

- It will **never tell you** whether you got it right until the last day.
- It will **never confirm** what the things outside are. Historians argue
  about the documents and take them apart, correctly, and it changes nothing.
- It will **never explain** the woman at the door on day fifteen. Not in the
  epilogue, not in a file, not anywhere.
- It has **no jump scares**. Not one. The horror is a website that has
  stopped updating and a hallway you have walked down.

---

## 🧾 Status: PROMPT 4 (POLISH, REMEDIATION & USABILITY)

Twenty days playable, three endings, four entities rendered rather than
drawn, and a computer that behaves like a computer.
**Headphones. The mix is quiet on purpose.**

| Prompt | Owns | State |
|---|---|---|
| 1 | Systems, content, structure. Everything runnable. | ✅ done |
| 2 | `effects.js` + tuning `config.js`. Lighting, grade, horror effects. | ✅ done |
| 3 | `audio.js` + `snd/`. The absence arc, room tone, cues, release testing. | ✅ done |
| 4 | Blocking bugs, twenty days, entity art, a usable web, a live forum. | 🔨 in progress |

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

## ⚙️ Running it

No build step. It needs a static server because it uses ES modules and an
import map.

```
npm start          # python3 -m http.server 8080  →  http://localhost:8080
```

Three.js is vendored in `vendor/three/` — nothing is fetched at runtime, and
the game works offline. There are no asset files at all: every texture, every
photograph, every document and every sound is generated at load.

**Controls** — `WASD` move · mouse, drag, or arrow keys to look · `E` interact ·
`C` crouch · `Esc` back / pause.

Mouse look uses pointer lock. A page embedded in a sandboxed frame is refused
pointer lock by the browser, so **drag-to-look and arrow-key look are always
live**, and the game says so once if the lock is denied. The refusal is
detected, never swallowed.

## Building the single file

```
npm run build              # dist/the-brood.html — standalone, opens from disk
npm run build:artifact     # same, minus the document skeleton, for a host
                           # that supplies its own <head>
```

esbuild inlines every module, all three stylesheets and the vendored three.js
into one HTML file (~990 KB). It runs under a strict CSP with no external
hosts because it never had anything to fetch.

## Verifying it

```
npm install                # playwright + esbuild, dev only
npm run verify             # 104 checks against the source
npm run verify:artifact    # 16 checks against the built file, inside a
                           # sandboxed iframe with no pointer lock and no
                           # same-origin storage
npm run shot -- out.png 12 22.5 0.37   # a frame at a given day/hour/heading
```

`tools/verify.mjs` serves the game, drives it headlessly through
`window.BROOD`, and checks 104 things across three groups:

- **Systems** — Day 1 reaches Day 15, Act 2 opens on Day 10, all three endings
  resolve, the two detection profiles diverge, waiting makes the car worth
  less, reading the impact log beats that clock, the Understanding score never
  appears in the DOM.
- **Audio** — every one of the 102 cues renders, the absence arc removes the
  right layer on the right day, the master is unlimited by default, each room
  has its own impulse response, the Anguish gate reaches *actual zero*, the
  compressor trick fires exactly once, the EAS chain is right for each day, the
  anchor desync grows, and captions carry direction.
- **Release** — save/load at all fifteen boundaries plus mid-screen and
  mid-event, a soft-lock hunt across every overlay, the flag audit, Day 9→10
  under sixteen state combinations, careless-versus-careful balance, and 900
  cues in a row without losing the audio context.

`tools/verify-artifact.mjs` then boots the *built* file the way the host will:
inside `sandbox="allow-scripts"`, where pointer lock is refused and
`localStorage` throws. It checks the notice comes up first, a new game starts,
the room is actually lit (it samples the framebuffer), drag-look and the walls
work, audio starts on a gesture, a screen opens and closes, and fourteen sleeps
still reach the fifteenth day.

> Both harnesses run under SwiftShader software rasterisation at roughly one
> frame per second. Every frame-rate number this container could produce is
> meaningless, so none is reported. Performance figures need real hardware.

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

  snd/
    synth.js               every generator: noise, impulse responses, the
                           collapse, voice prints, the EAS tones, the CRT whine
    engine.js              buses, the gate that makes true silence possible,
                           per-room convolution, HRTF placement
    world.js               room tone, the absence arc, the fridge, the TV

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
    captions.js            directional captions, the silence, the compass
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

### `audio.js` — implemented in prompt 3

The prompt-1 contract is unchanged and nothing upstream needed editing:
`play(cue, {at, loop, …})`, `stop(cue)`, `bed(cue)`, `duck()`, `master()`, and
an unknown cue still warns to console. `snd/` sits behind it, and no system
module imports `snd/` directly.

Nothing is a sample. Every sound in the game is synthesised at runtime from
noise buffers, oscillators, biquads and procedural impulse responses.

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

The window is *two* lights, not one. The beam through the bars is the direct
half; `windowFill` is the diffuse half — sky bounce through the same aperture,
wide, soft, shadowed by the walls but deliberately **not** by the bars, because
there is only ever one bar-shadow in this game. It uses `decay: 1`, not 2: a
1.5 m aperture is an area source, and inverse-square is the wrong law for one
at these distances — it would blow out the near wall to get any light onto the
far one. That is why its intensities are single digits next to the beam's four.
Different exponent, different units.

Without it a daytime room renders as a night room with a stripe in it, because
a rasteriser has no bounce light. It is worth almost nothing after sunset,
which is the whole arrangement: **daylight is free, and sodium light is a
stripe on the floor.** Every day therefore opens with the curtain open — he
opens it at seven, an open window costs almost nothing before dark, and it
means the first thing anyone sees is the bars laid across the floor.

### Surfaces

Every large surface carries a **normal map and a roughness map derived by Sobel
from its own diffuse texture** (`normalFrom` / `roughFrom` in
`world/materials.js`). No files, no extra triangles: it is what stops low-poly
geometry in low light reading as flat polygons — the light gets something to
catch on the plaster, the brick edges and the laminate seams.

The trap is that a noisy height field turns into television snow the moment any
light reaches it, because the Sobel gradient of noise is a field of 45° normals.
Ceilings are the worst case, seen at a grazing angle: the ceiling's relief is
`0.7` strength at `0.30` scale, against `2.8` for brick. **When a surface
sparkles, lower its normal strength — do not lower the light.**

---

## The sound

Nothing is a sample. Every sound is synthesised at runtime.

### The absence arc — the most important thing in the mix

The horror is **subtraction, and it is never cued.** A layer that is gone is
simply not in today's bed; there is no sting, no swell, no attention drawn.

| Layer | Last heard |
|---|---|
| Children outside | Day 3 |
| Dogs | Day 4 |
| Birds | Day 5 |
| The neighbour's television | Day 6 |
| Traffic | Day 7 |
| Sirens (which only start on Day 4) | Day 8 |
| The highway, two miles off | Day 10 |
| Air-conditioning units | Day 12 |

`LAYERS` in `snd/world.js` is the whole thing — a table of last days. The room
tone itself thins with it: the mains hum loses its harmonics as the building
empties, because there is less of the building drawing power.

### The fridge is a masking system

The compressor is the loudest thing in the apartment and it cycles all game.
It is there so that **it can stop.** Exactly once, a distant collapse is timed
against a forced compressor-off, so the room goes quiet at the moment there is
something to hear. That trick fires once and is never repeated. From Day 12 it
starts hard, with a thump and a rattle. On Day 14 it dies for good, and the
food and the white noise go together.

### Signature sounds

- **Collapses** are brown noise, a sine sweep from 64 down to 19 Hz, and a
  debris tail through a distance-dependent lowpass. The gaps between them are
  the composition, not the hits.
- **Crawlers** are always below waist height and behind you: `y: 0.12`, placed
  to the side of the camera, never in front.
- **Anguish is absolute digital silence** — a hard gate node at zero, a cut and
  not a fade. Every bus routes through it. When it lifts, the room tone comes
  back alone, over two seconds.
- **The Choir** replays a voice print the player has already heard, with the
  formants shifted, the pitch drifting, and the phrasing accumulating error.
- **The CRT whine** is 15,734 Hz — the NTSC horizontal line rate, which is why
  televisions of that era whined at that pitch.
- **The EAS attention tone** is 853 Hz and 960 Hz together, which is the real
  specification. From Day 10 the tone is correct and the *message* is wrong.
  On Day 14 the tone plays with no message behind it. On Day 15 it does not
  stop. The anchor's audio drifts out of sync with his mouth by
  `CONFIG.tv.desyncMsByDay`, and it only ever grows.

### Music

Almost none, and all of it diegetic. He puts something on while he cooks,
Days 2–8 — three seeded pentatonic tracks through a highpass and a peaking EQ
so they sound like a phone speaker in another room. **After Day 9 it never
plays again**, and that absence is the score of the whole second act.

### The mix

Quiet and uncompressed. The master sits at 0.55 and the limiter is a *toggle*,
off by default, so a loud event is actually loud. Screens duck the world.
Positional cues use HRTF panning and per-room convolution — six impulse
responses, generated procedurally; the bathroom rings for 850 ms and the
bedroom is the deadest room in the flat.

### Captions are a correctness requirement, not a courtesy

The game hides survival-critical information in audio, so captions carry
**direction**: `[distant collapse — north]`, `[scratching, low, near the door
— below — east]`. They are on by default. There is also an optional on-screen
compass, off by default, for players who want the bearing without the text.

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
- **A photosensitivity notice before the title screen**, not buried in a menu.
- **Captions for every sound, with direction**, on by default, because the game
  hides survival-critical information in audio. An optional audio compass too.
- **Four separate volume sliders** — master, ambient, effects, interface — and
  a limiter toggle for players who need the loud events tamed.
- Every choice persists per machine.
- Keyboard focus stays visible on every 2D surface; sites, tabs, files and
  mail rows are all reachable by tab and Enter.
- Post is a single fullscreen pass on one render target, pixel ratio capped
  at 1.5, one shadow-casting light in the room and one outside it.

## Save data

One slot, `localStorage["thebrood.save.v1"]`, written on every day advance.
Nothing leaves the machine. There is no backend and there never will be.

## Licence

MIT (see `LICENSE`). Three.js is vendored under its own MIT licence.
