// Field of view for any screen shape, so the picture can fill the whole tab.
// The rooms were framed for 4:3 at 58° vertical. Narrower screens (phones)
// widen the vertical angle to keep the same sideways view, up to 90°.
// Wider screens keep a cinematic 50° vertical and show more to the sides.

const DEG = Math.PI / 180;
const BASE_V = 58 * DEG;
const BASE_ASPECT = 4 / 3;
export const MIN_V = 50 * DEG;
export const MAX_V = 90 * DEG;

/** Vertical field of view (radians) for a width/height aspect. */
export function fovForAspect(aspect) {
  const halfH = Math.atan(Math.tan(BASE_V / 2) * BASE_ASPECT);
  const v = 2 * Math.atan(Math.tan(halfH) / aspect);
  return Math.min(MAX_V, Math.max(MIN_V, v));
}
