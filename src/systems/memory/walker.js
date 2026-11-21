// Walking inside a memory: first-person movement on the floor plane, with
// collision against axis-aligned boxes. Pure: no DOM, no WebGL.
// Spec: .kiro/specs/memories (Requirement 2)

export const RADIUS = 0.3;
export const WALK_SPEED = 2.4;
export const SNEAK_SPEED = 1.2;
export const TURN_SPEED = 2.2; // radians per second, for keyboard turning
export const EYE_HEIGHT = 1.6;
export const PITCH_LIMIT = (70 * Math.PI) / 180;

/**
 * Yaw 0 looks toward -z. Positive yaw turns right (toward +x).
 * @returns {[number, number, number]}
 */
export function forwardOf(yaw, pitch = 0) {
  const c = Math.cos(pitch);
  return [Math.sin(yaw) * c, Math.sin(pitch), -Math.cos(yaw) * c];
}

export function rightOf(yaw) {
  return [Math.cos(yaw), 0, Math.sin(yaw)];
}

/**
 * @typedef {{ min: [number, number], max: [number, number], low?: boolean, id?: string }} Collider
 *   A box on the floor plane (x, z). `low` boxes (tables, stools) block walking but not sight.
 * @typedef {{ pos: [number, number], yaw: number, pitch: number }} Walker
 */

/** Pushes a circle at `p` out of every box it overlaps. Returns the new position. */
export function resolve(p, colliders, radius = RADIUS) {
  let [x, z] = p;
  for (let pass = 0; pass < 2; pass++) {
    for (const b of colliders) {
      const cx = Math.max(b.min[0], Math.min(x, b.max[0]));
      const cz = Math.max(b.min[1], Math.min(z, b.max[1]));
      const dx = x - cx, dz = z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-12) {
        const d = Math.sqrt(d2);
        x += (dx / d) * (radius - d);
        z += (dz / d) * (radius - d);
      } else {
        // The centre is inside the box: leave by the nearest side.
        const out = [
          [b.min[0] - radius - x, 0], [b.max[0] + radius - x, 0],
          [0, b.min[1] - radius - z], [0, b.max[1] + radius - z],
        ].sort((m, n) => Math.abs(m[0] + m[1]) - Math.abs(n[0] + n[1]))[0];
        x += out[0];
        z += out[1];
      }
    }
  }
  return [x, z];
}

/**
 * One movement step. `input.forward` and `input.strafe` are -1..1, `input.turn` is -1..1 (keyboard turning).
 * Moves along x and then z, resolving collisions after each, so the walker slides along walls.
 * @param {Walker} w
 * @param {{ forward: number, strafe: number, turn?: number, sneak?: boolean }} input
 * @param {number} dt seconds
 * @param {Collider[]} colliders
 * @returns {Walker & { moved: number }}
 */
export function step(w, input, dt, colliders) {
  const yaw = w.yaw + (input.turn ?? 0) * TURN_SPEED * dt;
  let f = input.forward, s = input.strafe;
  const len = Math.hypot(f, s);
  if (len > 1) { f /= len; s /= len; }
  const speed = input.sneak ? SNEAK_SPEED : WALK_SPEED;
  const fw = forwardOf(yaw), rt = rightOf(yaw);
  const vx = (fw[0] * f + rt[0] * s) * speed * dt;
  const vz = (fw[2] * f + rt[2] * s) * speed * dt;
  let p = resolve([w.pos[0] + vx, w.pos[1]], colliders);
  p = resolve([p[0], p[1] + vz], colliders);
  return { pos: p, yaw, pitch: w.pitch, moved: Math.hypot(p[0] - w.pos[0], p[1] - w.pos[1]) };
}

/** Mouse or touch look. dx/dy in radians. */
export function look(w, dx, dy) {
  return { ...w, yaw: w.yaw + dx, pitch: Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, w.pitch + dy)) };
}

/**
 * Whether the segment a -> b on the floor plane crosses no blocking box.
 * `low` boxes don't block. Boxes that contain an end point are ignored, so the
 * presence can see someone standing right against a counter.
 */
export function segmentClear(a, b, colliders) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  for (const box of colliders) {
    if (box.low) continue;
    const inside = (p) => p[0] > box.min[0] && p[0] < box.max[0] && p[1] > box.min[1] && p[1] < box.max[1];
    if (inside(a) || inside(b)) continue;
    let t0 = 0, t1 = 1, hit = true;
    for (const [d, o, lo, hi] of [[dx, a[0], box.min[0], box.max[0]], [dz, a[1], box.min[1], box.max[1]]]) {
      if (Math.abs(d) < 1e-12) {
        if (o < lo || o > hi) { hit = false; break; }
        continue;
      }
      let u0 = (lo - o) / d, u1 = (hi - o) / d;
      if (u0 > u1) [u0, u1] = [u1, u0];
      t0 = Math.max(t0, u0);
      t1 = Math.min(t1, u1);
      if (t0 > t1) { hit = false; break; }
    }
    if (hit) return false;
  }
  return true;
}
