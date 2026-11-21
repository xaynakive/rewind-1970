# Design: House

## Navigation graph
Navigation uses a graph of viewpoints instead of free movement. This works the same with a mouse, keyboard and touch, keeps collisions out of scope, and fits fixed-camera PS1 horror. Free walking is a stretch goal after the core is finished.

```ts
interface Viewpoint {
  id: string;
  area: AreaId;
  position: [number, number, number];
  lookAt: [number, number, number];
  exits: Partial<Record<'forward' | 'back' | 'left' | 'right', string>>;
  hotspots: string[]; // ids of selectable things visible from here
}
```

Example graph:
`yard-gate → yard-graves → yard-pond`, `yard-gate → porch → hallway`, `hallway → messy-room | bedroom | living-room`.

## Camera
- Moves use position lerp and quaternion slerp with ease-in-out.
- A small head-bob (amplitude 0.02) during moves, disabled with reduced motion.

## Areas
Each area is a module that builds its triangles from primitives with `MeshBuilder` and returns its mesh data, viewpoint, lights, fog and hotspots. `systems/house/livingRoom.js` is the first area. A planned `systems/house/areaLoader.js` will load areas on demand and call `renderer.disposeMesh` on areas that are far away.

## Hotspots
Selectable objects are `<button>`s positioned each frame over the screen-space box of the object's 3D bounds (`systems/house/hotspots.js`). Small objects are listed before large ones and stack on top, so the VCR stays clickable under the TV.

## Lightning
`systems/house/lightning.js` is pure: `nextStrikeDelay(rand)`, `createStrike(rand, reduceFlashing)` and `flashIntensity(strike, elapsed)`. `main.js` schedules strikes and feeds the intensity to the scene shader as `uFlash`. Once there is more than one listener, strikes will be announced as a `storm:lightning` event. Listeners include:
- The renderer: lights surfaces facing the window and turns window "sky" vertices to the lightning colour.
- The tapes and pond systems: show lightning-only objects.
- Audio: schedules thunder after a random delay.

## "Slightly wrong" changes
Each change has a trigger: "the camera has not seen object X for N seconds". The system checks visibility with the camera frustum. Changes apply only while the object is off-screen.

## Testing
- Unit tests: lightning scheduler intervals with an injected random source, and navigation graph validity (every exit points to a real viewpoint, every hiding spot is visible from some viewpoint).
