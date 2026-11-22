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
  | `nightScene.js` | runs one night: input, walking, opening, inspect, the Caller, water, lens, name, drawing | no |
  | `nightHud.js` | the memory HUD plus the viewfinder, the battery, the name choice and flashbacks | no |
- Shared, unchanged: `src/render/*`, `src/audio/audio.js`, `src/core/settings.js`, `src/systems/memory/{walker,reach,presence,figures}.js`, `buildItemMesh`, `noteMesh`, `inspectOf` and friends from `market.js`.
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
`tests/night.test.js`: the clock and water curve, the wake and name times, the lens battery, the saved state normalising, the village layout (start, doors, stones above the highest water, items reachable), and tone words.
