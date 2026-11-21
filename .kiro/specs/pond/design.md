# Design: Pond

## Water shader
- A single plane with a `pondFragment` shader in `render/shaders.js`.
- Reflection: render the sky and moon into a small (128×128) mirrored render target, sampled with a distortion offset from the ripples.
- Ripples: an array uniform `uRipples[8]` of `vec3(x, z, startTime)`. Each ripple adds a ring wave `sin(dist * k - age * speed)` with amplitude that falls with age and distance.
- Glow: mix in `blood-moon` near the moon's reflection.

## Skeleton visibility
- The skeleton is a mesh below the water plane.
- The water shader takes `uReveal` (0–1). The surface becomes partly transparent where `uReveal` is high, so the skeleton shows through.
- `uReveal` is driven by:
  - Lightning: set to 1 for the flash duration.
  - Ripple settle: when a ripple ring passes over the skeleton point, schedule a reveal of 0.35 for 0.3–0.6 seconds.
- A counter of reveals the user saw (pond viewpoint active and in frame) emits `pond:secret-noticed` at 3.

## Testing
- Unit test the ripple-over-point check and the reveal counter.
