// Moving between viewpoints. Pure: time is passed in.
// Spec: .kiro/specs/house (Requirements 1 and 2)
//
// Inside an area the camera glides to the next viewpoint. Between areas the
// camera pushes toward the doorway, the tape "skips" (a VHS glitch cut), and
// the camera settles into the next room. Each area keeps its own coordinates,
// so rooms never have to line up in one world.

export const WALK_MS = 900;
export const CUT_OUT_MS = 420;
export const CUT_IN_MS = 560;
export const DIRECTIONS = ['forward', 'back', 'left', 'right'];

const KEYS = {
  w: 'forward', arrowup: 'forward',
  s: 'back', arrowdown: 'back',
  a: 'left', arrowleft: 'left',
  d: 'right', arrowright: 'right',
};

/** Direction for a keyboard key, or null. */
export function directionForKey(key) {
  return KEYS[String(key).toLowerCase()] ?? null;
}

export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const add3 = (a, b, k) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
function dirOf(vp) {
  const d = [vp.lookAt[0] - vp.position[0], vp.lookAt[1] - vp.position[1], vp.lookAt[2] - vp.position[2]];
  const len = Math.hypot(d[0], d[2]) || 1;
  return [d[0] / len, 0, d[2] / len]; // horizontal only
}

/** @returns {{from: object, to: object, startedAt: number, cross: boolean}} */
export function startMove(from, to, now) {
  return { from, to, startedAt: now, cross: from.area !== to.area };
}

export function moveDuration(move) {
  return move.cross ? CUT_OUT_MS + CUT_IN_MS : WALK_MS;
}

/**
 * Camera for a move at time `now`.
 * @returns {{ position: number[], lookAt: number[], area: string, glitch: number, done: boolean }}
 */
export function cameraAt(move, now) {
  const e = Math.max(0, now - move.startedAt);
  const { from, to } = move;

  if (!move.cross) {
    const t = easeInOut(Math.min(1, e / WALK_MS));
    return {
      position: lerp3(from.position, to.position, t),
      lookAt: lerp3(from.lookAt, to.lookAt, t),
      area: to.area,
      glitch: 0,
      done: e >= WALK_MS,
    };
  }

  if (e < CUT_OUT_MS) {
    // Push toward the way out, and let the tape start to tear.
    const t = e / CUT_OUT_MS;
    const push = 0.9 * easeInOut(t);
    const d = dirOf(from);
    return {
      position: add3(from.position, d, push),
      lookAt: add3(from.lookAt, d, push),
      area: from.area,
      glitch: t,
      done: false,
    };
  }

  // Settle into the new room from slightly behind its viewpoint.
  const t = Math.min(1, (e - CUT_OUT_MS) / CUT_IN_MS);
  const back = 0.7 * (1 - easeInOut(t));
  const d = dirOf(to);
  return {
    position: add3(to.position, d, -back),
    lookAt: add3(to.lookAt, d, -back),
    area: to.area,
    glitch: 1 - t,
    done: t >= 1,
  };
}

/**
 * Checks a viewpoint graph.
 * @param {Map<string, {id:string, area:string, exits:object}>} viewpoints
 * @returns {string[]} problems (empty when valid)
 */
export function validateGraph(viewpoints) {
  const problems = [];
  for (const vp of viewpoints.values()) {
    for (const [dir, target] of Object.entries(vp.exits)) {
      if (!DIRECTIONS.includes(dir)) problems.push(`${vp.id}: unknown direction "${dir}"`);
      if (!viewpoints.has(target)) problems.push(`${vp.id}: ${dir} leads to missing viewpoint "${target}"`);
      if (target === vp.id) problems.push(`${vp.id}: ${dir} leads to itself`);
    }
  }
  return problems;
}

/** Viewpoint ids reachable from `start`. */
export function reachable(viewpoints, start) {
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const vp = viewpoints.get(queue.shift());
    for (const next of Object.values(vp?.exits ?? {})) {
      if (!seen.has(next) && viewpoints.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return seen;
}

/** Areas one step away from `areaId` (through any exit of any of its viewpoints). */
export function neighbourAreas(viewpoints, areaId) {
  const out = new Set();
  for (const vp of viewpoints.values()) {
    if (vp.area !== areaId) continue;
    for (const next of Object.values(vp.exits)) {
      const a = viewpoints.get(next)?.area;
      if (a && a !== areaId) out.add(a);
    }
  }
  return out;
}
