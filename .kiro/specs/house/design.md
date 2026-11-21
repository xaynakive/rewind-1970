# Design: House

## Areas and coordinates
`systems/house/areas.js` builds the house from five area modules: `frontYard.js`, `hallway.js`, `livingRoom.js`, `messyRoom.js` and `bedroom.js`.

**Decision:** each area keeps its own coordinates. Rooms don't have to line up in one world, so each room can be laid out for its camera: the camera looks roughly toward −z, which is also the way tape spines face (spots can turn piles with `rotY`). Moves between areas are cuts (see below), so the player never sees the seams.

Every area returns:
```ts
interface Area {
  id: AreaId;                 // matches the `area` of hiding spots in tapes/placement.js
  outdoors: boolean;          // rain, rain audio, far projection
  meshData: Float32Array; triangles: number;
  viewpoints: Viewpoint[];
  spots: Record<HidingSpotId, { pos: Vec3; rotY?: number; maxStack?: number }>;
  hotspots: { id: string; label: string; min: Vec3; max: Vec3 }[];   // e.g. TV, VCR
  lights(t: number): [Light, Light, Light];                          // the shader takes exactly 3
  sky: RGB; fogColor: RGB; fogNear: number; fogFar: number; ambient: RGB;
  flashDir: Vec3; flashScale: number;  // how lightning reaches this area (1 outside, ~0.45 in the hall)
}
```

## Navigation graph
Navigation uses a graph of viewpoints instead of free movement. This works the same with a mouse, keyboard and touch, keeps collisions out of scope, and fits fixed-camera PS1 horror. Free walking is a stretch goal.

```ts
interface Viewpoint {
  id: string;
  label: string;       // the place name shown on exit arrows, e.g. "the graves"
  position: Vec3;
  lookAt: Vec3;
  exits: Partial<Record<'forward' | 'back' | 'left' | 'right', string>>;
}
```

```
               yard-graves ── yard-pond
                       \       /
                       yard-gate          (start)
                           |
                       yard-porch
                           |
 living-room ──────── hall-entry ──────── messy-room
                           |
                        bedroom ("upstairs")
```

## Moving (`systems/house/navigation.js`, pure)
- **Inside an area**, the camera glides from viewpoint to viewpoint over `WALK_MS` = 900 ms (ease-in-out on position and look target).
- **Between areas**, the camera pushes 0.9 m toward the way out over `CUT_OUT_MS` = 420 ms while the tape starts to tear. At the cut it switches to the new area, starts 0.7 m behind the new viewpoint, and settles in over `CUT_IN_MS` = 560 ms while the glitch fades. Total 980 ms. With reduce flashing the glitch is replaced by a dip to black.
- The move starts from where the player is actually looking, so the camera never snaps.
- While moving, exits and hotspots are hidden and new input is ignored (Requirement 1.4). On arrival the look offset resets to straight ahead.

## Exits (`ui/navArrows.js`)
Each exit is a real `<button>` at an edge of the picture, with a CSS-drawn arrow and the destination's name: forward at the top, back at the bottom, left and right at the sides. Keys: W/A/S/D or the arrow keys. On portrait phones, the buttons move into the letterbox above and below the picture so they don't cover it. Buttons are at least 44 px tall.

## Loading (`systems/house/areaLoader.js`)
On arrival in an area, the loader keeps that area and its neighbours (areas one exit away) on the GPU and deletes the rest (Requirement 2.3). All area geometry is built once at start-up on the CPU; the whole house is about 3,500 triangles.

## Projection
Indoors: near 0.1 m, far 20 m. Outdoors: near 0.15 m, far 70 m, so the back of the house and the moon aren't clipped.

## Rain
The yard has about 380 rain streaks, built once. Each streak stores its fall phase in the vertex normal's x, and the scene shader (emissive code 3) moves it down an 8 m column with `uTime`. Streaks are kept at least 2.5 m from every viewpoint so none fills the screen. Lightning brightens them. Rain audio is full outdoors and about a third indoors.

Scene shader emissive codes: `0..1` lit to self-lit, `2` sky (windows show the lightning colour), `3` rain, `4` self-lit and unfogged (the moon).

## Hotspots
Selectable objects are `<button>`s positioned each frame over the screen-space box of the object's 3D bounds (`systems/house/hotspots.js`). Small objects are listed before large ones and stack on top, so the VCR stays clickable under the TV.

## Lightning
`systems/house/lightning.js` is pure: `nextStrikeDelay(rand)`, `createStrike(rand, reduceFlashing)` and `flashIntensity(strike, elapsed)`. `main.js` schedules strikes and feeds the intensity, times the area's `flashScale`, to the scene shader as `uFlash`. Surfaces facing `flashDir` brighten, and window "sky" vertices turn to the lightning colour.

## First visits
The first time in a session the player reaches some viewpoints, a quiet line appears. Examples: at the gate, "the porch light is on. somewhere inside, a vcr is waiting."; at the pond, "the water is very still."

## "Slightly wrong" changes
Each change has a trigger: "the camera has not seen object X for N seconds". The system checks visibility with the camera frustum. Changes apply only while the object is off-screen. (Not built yet.)

## Testing
- `tests/navigation.test.js`: walk and cut timing (0.6–1.2 s), cut switches area mid-move and ends exactly on the viewpoint, key mapping, easing, graph validation.
- `tests/house.test.js`: every exit leads to a real viewpoint; every viewpoint is reachable from the gate and can get back to it; every hiding spot is defined in exactly the area `placement.js` says; every hiding spot projects on screen from at least one viewpoint in its area; 3 lights per area; triangle budgets; neighbour areas.
- `tests/lightning.test.js`: scheduler intervals and flash limits.
