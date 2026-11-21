# Design: Memories

## Files (`src/systems/memory/`)
| File | What it does | Pure? |
|---|---|---|
| `walker.js` | first-person movement, circle-vs-box collision on the floor plane, line of sight | yes |
| `reach.js` | what you're looking at: centre ray against boxes, then aim assist | yes |
| `presence.js` | the presence's state machine | yes |
| `progress.js` | what's been taken in each memory, as stored | yes |
| `figures.js` | June and the presence: `buildFigure({ face, coat, lamp })` | builds meshes |
| `market.js` | the night market: geometry and level data, plus shared helpers (`boundsOf`, `grow`, `footprint`, `noteMesh`, `inspectOf`, `clockFace`) | builds meshes |
| `school.js` | the school at night: geometry and level data | builds meshes |
| `memoryScene.js` | runs a memory: input, animation, sound levels, drawing | no |

UI lives in `src/ui/memoryHud.js` (prompt, story lines, inspect caption, inventory, touch buttons, pause menu, notes book). `main.js` starts a memory from the playback dialog and hands every frame to it while it runs.

## Entering and leaving
- `HOUSE_TAPES[0]` (`house-1`, the mailbox tape) has `memory: 'market'`; `HOUSE_TAPES[1]` (`house-2`, the grave tape) has `memory: 'school'`. `main.js` maps ids to builders in `MEMORY_LEVELS`. Once rewound, its playback shows **step inside**, right after the rewind and on every later play.
- Entering: house hotspots and exit arrows hide, the corner buttons hide (`body.in-memory`), rain drops to 12%, and the scene starts in `enter` mode: 1.1 s of glitch fading in (a plain fade with reduce flashing).
- Leaving (pause menu) or finishing returns to the same viewpoint in the house. The house clock carries on from where it was.
- Progress is saved under `meta['memories']`: `{ market: {...}, school: { taken: string[], opened: string[], checkpoint: string, done: boolean } }`. A finished memory can be replayed from the start.

## Walking (`walker.js`)
- Yaw 0 looks toward −z; positive yaw turns right. Eye height 1.6 m, radius 0.3 m.
- Walk 2.4 m/s, sneak 1.2 m/s, keyboard turn 2.2 rad/s, pitch ±70°.
- `step` moves along x and then z, pushing out of boxes after each, so you slide along walls. Boxes marked `low` (tables, stools, counters) block walking but not sight.
- `segmentClear(a, b, boxes)` is a 2D slab test, used for the presence's line of sight.

## Reaching (`reach.js`)
- Reach 2.2 m. The centre ray picks the nearest box hit. If it misses, the closest target within 16° of the view centre and 1.7 m is picked.
- Boxes that contain the eye are skipped (standing in a booth doesn't target the booth).
- Things you can take are checked before furniture, so an open box never hides what's in it.

## Moving parts
Each part has a mesh built at its closed position, interaction `bounds`, and `transform(k)` giving its model matrix at openness `k` (0..1). Openness eases toward its target at 2.6/s (the shutter at 0.55/s).
- `drawer`: slides 0.32 to 0.38 m toward the aisle. Items inside move with it.
- `lid`: rotates 1.9 rad about a hinge on the edge away from the aisle.
- `door`: rotates 1.8 rad about a vertical hinge.
- `shutter`: rolls up 2.45 m. Has a collider while less than 70% open, `needs: 'key'`, and opens one way.

The renderer has a per-mesh `model` matrix and `highlight` (added to the colour) for this; see `render/renderer.js`.

## The presence (`presence.js`)
States: `dormant → patrol ⇄ hunt → search → patrol`; story mode uses `stare → gone → patrol`.

| Rule | Value |
|---|---|
| sight | 9 m; 14 m when the user's flashlight is on |
| field of view | ±70° (anything within 1.2 m is seen regardless) |
| hearing | 3.5 m, only when the user walks without sneaking; it turns to look |
| patrol / hunt speed | 1.1 / 1.9 m/s (the user walks at 2.4) |
| lose sight | 3 s, then search 4 s at the last place it saw the user |
| catch | within 0.85 m while seeing the user |
| after a catch | it restarts at the route point farthest from the checkpoint and is blind for 8 s |
| story mode | stares 2.5 s, fades, is gone for 20 s, then returns at the far end |

It wakes after `wakeAfterNotes` (2) notes. Hiding makes the user invisible unless the presence was hunting and could see them at the moment they hid.

## The night market (`market.js`)
A hall 12 m wide from the entrance (z = 4) to the shutter (z = −30), with 8 stalls on each side (3.6 m wide), tables at z = −4.2, −10.2, −16 (with a cloth, to hide under) and −22, 16 paper lanterns over the lanes, and a stairwell behind the shutter.

| Stall | Contents | What you find |
|---|---|---|
| L0 noodles | pot, bowls, cash tin (lid) | note: two bowls |
| R0 fruit | crates of oranges | |
| L1 lanterns | lanterns for sale | |
| L2 fabric | bolts, hanging cloth | |
| R2 clocks | nine clocks, all at 00:00; counter drawer | note: my name is edith |
| L3 fortune teller | curtain (hiding place), table with drawer, crystal ball, an empty chair | note: no one in that chair |
| R3 masks | pale masks watching the aisle | |
| L4 toys | tin toys, music box (lid) | note: the key is with the radio man |
| R4 tapes | shelves of tapes, a TV of static | |
| R5 dumplings | steamers | |
| L6 tea | tins | |
| R6 radio repair | glowing radio dials, radio static you can hear, cabinet (door) | June's key |
| L7 photo booth | booth (hiding place), seat | the strip of photos |
| R7 | a mirror | |
| L5, R1 | shuttered | |

Lighting: the 3 lights nearest the eye (lanterns and stall lights, weighted), flickering; near the presence they stutter and dim. Flashlight: warm white, inner 0.24 rad, outer 0.46 rad, range 15 m, softened within 1.8 m so close-ups don't blow out. Floors and walls are subdivided (1 m) so per-vertex light can land on them.

Ending: once the shutter is open, coming within 1.7 m of `(0, −32)` turns the view toward June and plays three lines, 3.6 s each, then static.

## The school at night (`school.js`)
March 14 1962, 21:12. A corridor 3.5 m wide (x −1.5..2) from the start (z = 3) to the stair door (z = −30), tube lights every 4 m (two flicker), tall windows on the east wall, a clock at 00:00 over the bathroom door.

| Place | What you open | What you find |
|---|---|---|
| lockers, z 0..−8 (16) | locker 7, June's (door) | the caretaker's keys |
| | lockers 3 and 14 | hiding places, seen through the vents (`overlay: 'slats'`) |
| classroom, x −9.5..−1.5, z −8..−16 | June's desk (lid) | note: we swapped desks |
| | Edith's desk (lid) | the class photo, one face scratched out |
| | the teacher's drawer | the register: june. june. june. |
| music room, z −18..−26 | the piano cover (lid) | note: left hand and right hand |
| girls' bathroom, x 2..7 | nothing (by the sink) | note: only one of us in the mirror |
| | the middle stall | hiding place |

The stair door needs `keys`, opens one way at rate 1.2 with its own `openLine`, and is the level's `exitPart`. June (uniform, scaled 0.88) waits at (−0.4, −33.6); the exit trigger is 1.6 m around (−0.4, −32.4). She is glimpsed once at (0.3, −16).

The caretaker walks the corridor and looks into the music room and the classroom. Its lamp is always one of the three lights drawn (intensity 1.3, range 7 m), so its light comes down the corridor ahead of it.

Level options added for this (the market uses the defaults): `exitPart`, `part.openLine`, `part.rate`, `june.glimpse`, `juneLook`, `presenceLook`, `presenceLamp`, `storm` with `flashDir` and `flashScale` (lightning from `house/lightning.js`, so reduce flashing applies), `sky`, and `hide.overlay`.

## The inspect view
- The scene pass renders at twice the resolution (`renderer.setDetail(2)`), which also halves vertex wobble.
- The object is alone, at the origin, drawn with emissive code 7 (glossy). The fragment shader adds a reflection of a small studio: a dark floor, a cool sky, a warm horizon line and a bright strip light that sweeps with `uSweep`.
- Key, rim and under lights. Drag or arrow keys turn it; wheel, pinch or + and − zoom (0.6× to 2.6×).
- The name and text are DOM text in `.mem-caption`.

## Sound (`audio/audio.js`)
`footstep`, `presenceStep(level)`, `furniture(kind)`, `staticBurst(seconds)`, and `setMemoryLevels({ heartbeat, murmur, radio })`. The heartbeat beats faster and louder as the presence comes closer (from 9 m, 14 m while hunting).

## Testing
`tests/memory.test.js`: walking speeds, sliding, never ending a step in a box (property), pitch limits, line of sight, reach and aim assist, every presence rule including "story mode never catches" (property), progress normalising, and the layout of both memories (items, free checkpoints and route, everything reachable, the locked exit, tone words). The browser check walks through every item, the hiding places, a catch, story mode, the ending and leaving.
