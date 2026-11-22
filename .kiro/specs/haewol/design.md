# Design: Haewol

## Where it lives
- `haewol/index.html` and `haewol/haewol.css`: the page. It loads `../style.css` for the shared panels and the memory HUD.
- `src/night/`: the game.
  | File | What it does | Pure? |
  |---|---|---|
  | `main.js` | boot: renderer, audio, settings, save data, the cold open, starting and rewinding the night | no |
  | `loop.js` | the clock: timecode, water height, when she wakes, when the name is called | yes |
  | `save.js` | what is kept across rewinds, as stored (`localStorage` key `rewind-1970:haewol`) | yes |
  | `lens.js` | the camcorder: battery, recording, what it reveals | yes |
  | `pieces.js` | shared colours and pieces: paper walls, eaves, lanterns | builds meshes |
  | `village.js` | the entry house and the courtyard, and the level data that joins every place | builds meshes |
  | `yeonhwa.js` | Yeonhwa's house | builds meshes |
  | `wol.js` | Wol's house | builds meshes |
  | `school.js` | the schoolroom, its corridor and the music room | builds meshes |
  | `lullaby.js` | the lullaby in pieces, as notes | yes |
  | `props.js` | loose things: kinds, where they lie, tables, the hotbar, falling, stacking, floating, hearing | yes (plus meshes) |
  | `nightScene.js` | runs one night: input, walking, opening, inspect, the Caller, water, lens, name, drawing | no |
  | `nightHud.js` | the memory HUD plus the island, the notification, the dock, title cards, the viewfinder and flashbacks | no |
- Shared changes: `renderer.present` takes an optional `scan` (scanline strength, default 1), and `audio.chime(hz, delayMs, ms, gain)` plays a soft bell note. Only Haewol uses them; the house game looks and sounds the same.
- Shared, unchanged: the rest of `src/render/*`, `src/audio/audio.js`, `src/core/settings.js`, `src/systems/memory/{walker,reach,presence,figures}.js`, `buildItemMesh`, `noteMesh`, `inspectOf` and friends from `market.js`.
- `nightScene.js` started as a copy of `memoryScene.js`. The input code is duplicated on purpose so the house game's verified memories are not touched. Fold it into a shared module once both are stable.

## Saved state (`save.js`)
```
{ loops: number, taken: string[], lullaby: number, answered: number, refused: number,
  seenEndings: string[], introSeen: boolean }
```
Everything else (doors, containers, the Caller, the battery, the water) resets each loop.

## The clock (`loop.js`)
- `LOOP_MS = 480000` (8 minutes). `clockAt(ms)` maps 0..LOOP_MS to 86280..86400 seconds (23:58:00 to 24:00:00), then `MIDNIGHT`.
- `waterAt(ms)`: −0.30 m (dry, below the sunken courtyard floor at −0.25) rising to +0.20 m, eased so it starts slow.
- The Caller wakes at `WAKE_MS = 45000`, or straight away from the third loop on.
- The house calls the name at 30% and 70% of the night.

## The village (`village.js`)
Coordinates as in the memories spec: yaw 0 looks toward −z.
- **Entry house:** room x −3..3, z 6..12. TV on the back wall, the camcorder's table, a door at z = 6 opening onto the courtyard. It is a safe zone: inside it the Caller can't see the user.
- **Courtyard:** x −12..12, z 6..−16, floor sunken to −0.25 inside a raised stone rim at 0. The well at (0, −5), the family shrine at (8, −13), lantern strings across the courtyard (red, the only strong colour). Stepping stones from the entry door to each house door; their tops stay above the water all night. Off the stones the water is shallow but loud: walking in it is slow (1.5 m/s) and always heard.
- **Doors off the courtyard:** Yeonhwa's house (west, z −5), Wol's house (east, z −3), the schoolroom (north, x −5), the shrine path gate (north east). They are added one milestone at a time; until then, each says it won't open tonight.

## Areas
`level.areas` lists places with their own rules: `{ id, min, max, indoor, strong, route, enterLine, callerLine }`. Outside every area you are in the courtyard and she walks `level.route`.
- `indoor`: the rain drops to 40% and lightning to 40%.
- `strong`: she sees you as if your light were up, all the time.
- `route`: while you are in the area she walks this route. She switches only while patrolling: she reappears at the waypoint farthest from you, blind for 2.5 s, and `callerLine` plays with the rewind whirr. While hunting or searching she keeps following you on foot, so a door between you matters.
- `enterLine` plays the first time each night.
- `fog`: optional `{near, far}` that replaces the level fog while you are inside (the corridor uses 1.5..8.5 so its end is never visible).

## Yeonhwa's house (`yeonhwa.js`)
x −24..−12, z 2..−14, floor raised to 0.3 m, walls of old smoke-dark paper. Her front door slides open off the courtyard at z −5.

| Room | What you open | What you find |
|---|---|---|
| front room | | **memory: the tape in the recorder** on her shrine to Sae (photo, candles, paper boats, the recorder's red light still on); the torn page of the rite on the low table |
| kitchen (x < −18, z > −4) | the rice jar (lid) | the key to Sae's room. The cupboard is a hiding place |
| Sae's room (x < −18, z −4..−9) | Sae's door (needs the key); the little box (lid) | **memory: a red ribbon**. Through the lens, a red thread runs from the box to the door |
| bedroom (z < −9) | the chest's drawer | **memory: a telegram**. The wardrobe is a hiding place |

Through the lens: wet handprints all over the shrine.

The three flashbacks are set earlier on the same night: 22:40 (the telegram), the evening (the ribbon), 23:52 (the tape, where she starts the rite). None shows Sae in the water.

## Wol's house (`wol.js`)
x 12..22, z 2..−10, floor raised to 0.3 m, walls of dark herb-stained paper. Her door at z −3 is tied shut with red thread (`needs: 'memory-ribbon'`): Sae's ribbon is the same thread, and the door's `openLine` plays as the knot comes undone. The area is `indoor` but not `strong`: she walks `WOL_ROUTE` here.

| Room | What you open | What you find |
|---|---|---|
| study (x < 18, z > −5) | her desk drawer | **memory: her spectacles** (flashback 23:46: she leaves the book on the table for Yeonhwa). The rite copied in her hand on the desk. Her book of rites (a readable that answers what you carry) |
| herb room (x > 18, z > −5) | | herbs drying from the beams. The herb table is a low hiding place, looking out through the study door |
| back room (z < −5) | her chest (lid) | **the family photograph**, her own face scratched out. Above the altar, a page that looks blank: `note-undo`, readable only through the lens |

Through the lens: a pale margin line beside every note pinned in the study, and Wol herself, a ghost bent over her desk.

### New rules used here
- **Readables with answers:** `{ intro, answers: { [itemId]: line }, fallback }`. Reading shows the intro, then one line for each item you carry that has an answer, or the fallback if none does. Every memory has an answer, so the book is worth visiting again each loop.
- **Revealed items:** `revealed: true` items are drawn, and can be reached, only while recording.
- **Ghosts:** `level.ghosts: { id, pos, yaw, scale, y, look, line }`. Drawn only through the lens within 12 m; the line plays the first time you are within 7 m while recording. They never move or catch.

## The schoolroom (`school.js`)
North of the courtyard, dug into the hill. The north courtyard wall has a gap at x −5.6..−4.4. The door (`school-door`) needs `memory-spectacles`; its `openLine` reads the notice through them.

| Place | Bounds | What is there |
|---|---|---|
| classroom (`school`) | x −11..−1, z −16.3..−23 | small desks, the teacher's desk, the chalkboard on the north wall. **Sae's desk** (lid) holds **memory: sae's drawing** (flashback 16:10: the class goes home early; she stays to finish it and takes a clean sheet for a boat). The attendance register. The cleaning cupboard is a hiding place |
| corridor (`corridor`) | x −3..−1.4, z −23..−47 | identical lamps and doors every 6 m (`PERIOD`) |
| music room (`music`) | x −6..1, z −47..−53 | the organ, the songbook, the music box on a stool. The curtain is a hiding place |

She walks `SCHOOL_ROUTE` in the classroom and corridor, `MUSIC_ROUTE` in the music room.

### New rules used here
- **Boards:** `level.boards: { id, area, label, intro, lines, meshes, bounds, center }`, one mesh per line. `shown` starts at 1 each night. While you are in `area`, walking or hidden, and your view is more than ~57° from the board's centre (dot < 0.55) for 3 s, `shown` goes up by one and a quiet chalk scrape plays. Using the board reads the lines shown so far.
- **The corridor loop:** `level.corridor: { area, at: LOOP_AT (−35), back: PERIOD, lines, pass }`. Walking past `at` while moving without Shift moves you (and her, if she is in the corridor) `back` metres north and plays the next of `lines`. Moving with Shift, or arriving still, sets `corridorPassed` and plays `pass` if you had been sent back. Leaving the corridor northward resets it.
- **Music readables:** a readable with `music: n` plays `tune(max(n, save.lullaby))` through `audio.chime` and saves `withLullaby(save, n)`. It can't be restarted until the tune ends.
- **The lullaby** (`lullaby.js`): `PIECES` is four phrases of `[semitones above A4, beats]`, `BEAT_MS` 420, one beat of rest between phrases. `tune(n)` returns `{hz, at, ms}` for the first `n` pieces.

## The lens (`lens.js`)
- Battery 100 at the start of a loop; recording drains 2.2 a second (45 s of recording a night). It recovers 0.5 a second when not recording.
- `revealed` meshes are drawn only while recording, through a green-grey viewfinder grade: footprints, writing and the red thread.
- While recording, `light` is true for the Caller (her 14 m sight).

## The Caller
The memories presence (`presence.js`) with:
- `callerLook: { face: 'veil', coat: [0.36, 0.05, 0.05] }`: a dark wet red, and long wet hair hanging over the face (`figures.js`), never a face.
- Shared render change: rain streaks within 1.6 m of the camera are dropped in the scene shader, so one never fills the screen.
- Sight is boosted while the user is in water with a light, or has answered the name twice or more (the `light` flag is forced on).
- When she wakes, starts hunting, or comes within 8 m: `audio.whirr(1800)` plays and rain drops to 30% for a few seconds.
- Being caught, or midnight, rewinds the night (Requirement 2).

## Rewinding
`mode: 'rewind'` for 2.2 s: the picture runs with heavy tracking and glitch, the timecode counts backwards fast to 23:58:00, and `audio.whirr` plays. With reduce flashing, a plain fade. Then a fresh night is built from the saved state.

## The name
At the two call times, a line ("sae? sae, come inside.") and a choice: **answer** or **stay quiet**. Choosing is in DOM buttons, so it works by keyboard, touch and screen reader. The choice is saved.

## Memories and flashbacks
Items with `kind: 'memory'` have `flashback: string[]`. Keeping one plays its lines, 3.4 s each, over the scene with a sepia grade and heavy tracking, then the night continues. The clock does not run during a flashback.

## Testing
`tests/night.test.js`: the clock and water curve, the wake and name times, the lens battery, the saved state normalising, the village layout (start, doors, stones above the highest water, items reachable), each house's doors, items, route and hiding places, Wol's book answering every memory, and tone words.

## The look (Requirement 11)
Two looks, switched by one flag in `nightScene.js`: `tape = lens.recording || flashback || rewind`.

| | Film (default) | Tape |
|---|---|---|
| `present` | tracking 0.02, bleed 0.2, noise 0.045, `scan: 0`, no OSD | tracking 0.16, bleed 0.7, noise 0.055, scanlines, PLAY and timecode OSD |
| bars | `--bar` = 2.39:1 letterbox, max 13vh, none in portrait or with `no-bars` | `body.nt-rec` sets `--bar: 0`; the dock fades out |
| grain | a 160 px noise tile made once in `main.js`, shifted in 5 steps (still with reduce flashing or reduced motion) | same |

Inspect is always film. HUD pieces sit in the bars: the island in the top bar, the dock in the bottom bar, subtitles just above it.

- **Island** (`.nt-island`): `hud.setClock(sec)` writes `clockShort` (HH:MM) to it and to the lock screen. `hud.setThreat(0|1|2)` from the scene: 1 when she's within 9 m, 2 when hunting, 0 in story mode. While recording it widens to show the battery.
- **Notification:** `hud.ask(text, options, { from })`. The first button is the red one.
- **Dock:** `hud.setInventory([{ name, kind }])`. Icons for `memory`, `photo` and `key` are drawn with CSS. On narrow screens only icons show; names stay in the accessibility tree and the notes.
- **Title cards:** `hud.titleCard(title, sub)` at every night start: black for 1.6 s, fading to the scene, text fading out at 4.2 s. Words from `nightTitle(loops)`.
- **Lock screen:** the pause dialog. Grouped rows with switches (CSS on the checkboxes), the brightness slider, and the three actions pinned at the bottom.
- The bars setting is stored apart from the shared settings, in `localStorage` key `rewind-1970:haewol-view`.

## Carrying (`props.js`, Requirement 12)
- **Kinds:** `PROP_KINDS` gives each a name, a size (bottom at y 0), a colour and a sound (`ceramic`, `wood`, `stone`, `cloth`). `PROP_PLACES` puts 19 of them around the entry house, the courtyard and both houses. `SURFACES` lists the table tops (`{min, max, y}`); the level can pass its own as `level.surfaces`.
- **Hotbar:** `{ slots: (id|null)[9], selected }`. `addToHotbar` fills the selected slot if free, else the first free one, else returns null. `takeSelected` empties the selected slot.
- **Physics** (`stepProp`, 60 steps a second is plenty): gravity, then x and z moved separately; a blocked axis bounces back at 35%. Walls (level colliders) are infinitely tall; a table's collider only stops what is below its top. `supportAt(x, z, self, props, world, fromY)` is the highest of the ground, the flood water in the sunken courtyard (floating), table tops and the tops of resting props under the footprint, counting only what is below `fromY`. A hard landing bounces once; a resting prop whose support is taken away falls again.
- **Hearing:** a landing with impact over 0.8 is an event `{pos, loud, water}`. `hearingRange` = min(16, 3 + 1.6 × loud), ×1.2 in water. In the scene, a patrolling or searching Caller in range switches to `search` toward the spot and keeps searching (her `since` is held back) until she gets within 0.8 m or 9 s pass. The first time a night, a line plays.
- **Drawing:** one mesh per prop. The held one is drawn small at the lower right of the view.
