# Design: Pond

## Decision: no reflection render target
The first design used a 128×128 mirrored render target for the reflection. The pond is about 45 px tall at 320×240, so a real reflection would be a few blurry pixels. Instead, the moon's reflection is baked into the water's vertex colours, and ripples bend the water in the vertex shader. This needs no extra render pass and works on low-end phones.

## Water (`systems/house/frontYard.js`, scene shader code 5)
- A ring grid (12 rings × 32 segments) on the plane y = 0.03. Each vertex colour mixes dark water with blood-moon red near the reflection point.
- The scene shader moves water vertices by `rippleHeight(xz)`: up to 8 rings from `uRipples[8]` = (x, z, age in seconds). Each ring travels at 0.8 m/s with a wavelength of about 0.7 m, so the grid's vertices can show it. Rings fade over 3 s.
- Crests catch light (`+ (0.3, 0.2, 0.24) × height`), troughs darken, and lightning brightens the whole surface.

## The skeleton (scene shader code 6, "beneath")
- A flat, low-poly skeleton (skull with sockets, spine, ribs, pelvis, arms, legs, 1.25× life size so it reads at 320×240) lies 1.5 cm above the water plane, across the pond and away from the moon's reflection.
- Its vertices go through the same ripple and shading maths as the water, but start from the plain water colour `uWater`. With `uReveal` = 0 it is indistinguishable from the water. As `uReveal` rises, its colour mixes toward pale bone (up to 90%).
- `uReveal` comes from `revealAt(pond, now, flash)`: the stronger of the lightning flash and any active glimpse.

## Glimpses and noticing (`systems/pond/pond.js`, pure)
- `addRipple(pond, x, z, now, rand)` keeps at most 8 ripples. If the ring will reach the skeleton before it fades (distance ÷ 0.8 m/s < 3 s), it schedules a glimpse at arrival + 350 ms (the water settling), lasting 300–600 ms at strength 0.35 with a sine envelope.
- `tickPond(pond, now, watching)` counts each glimpse once when it begins, but only if the player is watching (at the pond viewpoint, not moving, no dialog open). `noteLightning(pond, watching)` counts each strike seen from the pond.
- At 3 sightings, the secret is noticed, exactly once. `main.js` stores `pondSecretNoticed = true` in the IndexedDB `meta` store (for the endings) and shows one quiet line: "you look away. when you look back, the water is just water."

## Touching the water
The water is a "quiet" hotspot: a button over the pond with no hover box or label, so it doesn't break the mood (keyboard focus still shows an outline). A click is turned into a point on the water with `pickPlaneY(viewProj, ndcX, ndcY, y)` (`render/math.js`). Keyboard activation, or a click outside the pond's ellipse, makes a ripple in the middle. Each ripple plays a soft synthesized plop.

## The pond tape
- The `pond` hiding spot is in the water near the near bank. Tapes there rest 35 cm down, under the opaque water, so they can't be seen or picked up.
- While the player is at the pond viewpoint, they float up over 2.5 s (ease-out). On surfacing they make a ripple, and a hint says "something rises to the surface." Only then can they be picked up.
- They sink again when the player leaves the front yard.

## Testing
- `tests/pond.test.js`: ripple cap, shader uniform ages, hidden by default, lightning reveal, glimpse timing and strength, no glimpse from far ripples, counting only while watching, noticing exactly once at 3, clean-up.
- `tests/math.test.js`: matrix inverse, a projected water point picks back to itself, a ray above the horizon misses.
- `tests/house.test.js` still checks the pond spot is on screen from the pond viewpoint.
