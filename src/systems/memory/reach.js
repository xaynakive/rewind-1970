// What the user is looking at and can reach: a ray from the eye against the
// boxes of interactables, with a little aim assist. Pure.
// Spec: .kiro/specs/memories (Requirements 3.1, 3.2)

export const REACH = 2.2;
export const ASSIST_DEG = 16;
/** Aim assist only works this close, so it never picks something across a counter. */
export const ASSIST_REACH = 1.7;

/**
 * Distance along the ray to the box, or Infinity.
 * @param {number[]} o origin, @param {number[]} d unit direction
 */
export function rayBox(o, d, min, max) {
  let t0 = 0, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (o[i] < min[i] || o[i] > max[i]) return Infinity;
      continue;
    }
    let u0 = (min[i] - o[i]) / d[i], u1 = (max[i] - o[i]) / d[i];
    if (u0 > u1) [u0, u1] = [u1, u0];
    t0 = Math.max(t0, u0);
    t1 = Math.min(t1, u1);
    if (t0 > t1) return Infinity;
  }
  return t0;
}

/**
 * @param {number[]} eye
 * @param {number[]} dir unit view direction
 * @param {{ id: string, min: number[], max: number[] }[]} targets
 * @returns {string | null}
 */
export function pick(eye, dir, targets, { reach = REACH, assistDeg = ASSIST_DEG, assistReach = ASSIST_REACH } = {}) {
  let best = null, bestT = reach;
  // Something you're standing inside (a hiding place, a booth) isn't what you're looking at.
  const inside = (t) => eye.every((v, i) => v >= t.min[i] && v <= t.max[i]);
  targets = targets.filter((t) => !inside(t));
  for (const t of targets) {
    const d = rayBox(eye, dir, t.min, t.max);
    if (d <= bestT) { best = t.id; bestT = d; }
  }
  if (best) return best;

  const cosLimit = Math.cos((assistDeg * Math.PI) / 180);
  let bestCos = cosLimit;
  for (const t of targets) {
    const c = t.min.map((v, i) => (v + t.max[i]) / 2);
    const v = c.map((x, i) => x - eye[i]);
    const dist = Math.hypot(...v);
    if (dist > assistReach || dist < 1e-6) continue;
    const cos = (v[0] * dir[0] + v[1] * dir[1] + v[2] * dir[2]) / dist;
    if (cos > bestCos) { bestCos = cos; best = t.id; }
  }
  return best;
}
