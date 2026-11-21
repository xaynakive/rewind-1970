// The presence: the figure that follows Edith through a memory. A small state
// machine with injected time and line of sight. Pure.
// Spec: .kiro/specs/memories (Requirement 5)

import { resolve } from './walker.js';

export const SIGHT = 9;
export const SIGHT_LIT = 14;
export const VIEW_HALF_ANGLE = (70 * Math.PI) / 180;
export const HEAR = 3.5;
export const PATROL_SPEED = 1.1;
/** Slower than walking (2.4 m/s), so walking away always works. */
export const HUNT_SPEED = 1.9;
export const CATCH = 0.85;
export const LOSE_MS = 3000;
export const SEARCH_MS = 4000;
export const STARE_MS = 2500;
export const GONE_MS = 20000;
/** After a catch, it gives the user this long before it can see them again. */
export const GRACE_MS = 8000;
const RADIUS = 0.35;

/**
 * @typedef {{ kind: 'dormant' | 'patrol' | 'hunt' | 'search' | 'stare' | 'gone',
 *   pos: [number, number], facing: number, wp: number, since: number,
 *   lastSeen: [number, number] | null, lastSeenAt: number, blindUntil: number }} Presence
 */

/** @returns {Presence} */
export function createPresence(route) {
  return { kind: 'dormant', pos: [...route[0]], facing: 0, wp: 1 % route.length, since: 0, lastSeen: null, lastSeenAt: 0, blindUntil: 0 };
}

/** Facing as a yaw (0 = toward -z, positive toward +x), like the walker. */
const yawTo = (from, to) => Math.atan2(to[0] - from[0], -(to[1] - from[1]));

function moveToward(pos, target, dist, colliders) {
  const dx = target[0] - pos[0], dz = target[1] - pos[1];
  const len = Math.hypot(dx, dz);
  if (len < 1e-6) return { pos, arrived: true };
  const k = Math.min(1, dist / len);
  let p = resolve([pos[0] + dx * k, pos[1]], colliders, RADIUS);
  p = resolve([p[0], p[1] + dz * k], colliders, RADIUS);
  return { pos: p, arrived: k >= 1 };
}

/**
 * Whether the presence sees the player right now.
 * @param {Presence} s
 * @param {{ pos: [number, number], hidden: boolean, seenHiding?: boolean, light: boolean }} player
 * @param {(a: number[], b: number[]) => boolean} canSee line of sight on the floor plane
 */
export function sees(s, player, canSee, now) {
  if (now < s.blindUntil) return false;
  if (player.hidden && !player.seenHiding) return false;
  const dx = player.pos[0] - s.pos[0], dz = player.pos[1] - s.pos[1];
  const dist = Math.hypot(dx, dz);
  if (dist > (player.light ? SIGHT_LIT : SIGHT)) return false;
  let off = Math.abs(yawTo(s.pos, player.pos) - s.facing) % (2 * Math.PI);
  if (off > Math.PI) off = 2 * Math.PI - off;
  if (dist > 1.2 && off > VIEW_HALF_ANGLE) return false;
  return canSee(s.pos, player.pos);
}

/**
 * Advances the presence by dt seconds.
 * @param {Presence} s
 * @param {{ dt: number, now: number, route: [number, number][], colliders: object[],
 *   player: { pos: [number, number], hidden: boolean, seenHiding?: boolean, light: boolean, loud: boolean },
 *   canSee: (a: number[], b: number[]) => boolean, story: boolean }} ctx
 * @returns {{ state: Presence, events: ('spotted' | 'lost' | 'caught' | 'faded' | 'returned')[] }}
 */
export function tickPresence(s, { dt, now, route, colliders, player, canSee, story }) {
  const events = [];
  if (s.kind === 'dormant') return { state: s, events };

  if (s.kind === 'gone') {
    if (now - s.since < GONE_MS) return { state: s, events };
    // Come back at the far end of the route from the player.
    let far = 0, farD = -1;
    route.forEach((w, i) => {
      const d = Math.hypot(w[0] - player.pos[0], w[1] - player.pos[1]);
      if (d > farD) { farD = d; far = i; }
    });
    events.push('returned');
    return { state: { ...s, kind: 'patrol', pos: [...route[far]], wp: (far + 1) % route.length, since: now }, events };
  }

  const seen = sees(s, player, canSee, now);
  const dist = Math.hypot(player.pos[0] - s.pos[0], player.pos[1] - s.pos[1]);
  let next = { ...s };

  if (story) {
    if (s.kind === 'stare') {
      next.facing = yawTo(s.pos, player.pos);
      if (now - s.since >= STARE_MS) {
        events.push('faded');
        next = { ...next, kind: 'gone', since: now };
      }
      return { state: next, events };
    }
    if (seen) {
      events.push('spotted');
      return { state: { ...next, kind: 'stare', since: now, facing: yawTo(s.pos, player.pos) }, events };
    }
  } else if (seen) {
    if (s.kind !== 'hunt') events.push('spotted');
    next = { ...next, kind: 'hunt', lastSeen: [...player.pos], lastSeenAt: now, since: s.kind === 'hunt' ? s.since : now };
  } else if ((s.kind === 'patrol' || s.kind === 'search') && player.loud && !player.hidden && dist < HEAR && now >= s.blindUntil) {
    // A sound close by: turn toward it. If the user is visible from there, the next tick sees them.
    next.facing = yawTo(s.pos, player.pos);
  }

  if (next.kind === 'hunt') {
    if (dist < CATCH && seen) {
      // The caller restarts the user at a checkpoint and calls resetAfterCatch.
      events.push('caught');
      return { state: next, events };
    }
    if (!seen && now - next.lastSeenAt > LOSE_MS) {
      events.push('lost');
      next = { ...next, kind: 'search', since: now };
    } else {
      const m = moveToward(next.pos, next.lastSeen, HUNT_SPEED * dt, colliders);
      next.facing = yawTo(next.pos, next.lastSeen);
      next.pos = m.pos;
    }
    return { state: next, events };
  }

  if (next.kind === 'search') {
    if (now - next.since > SEARCH_MS) next = { ...next, kind: 'patrol', since: now };
    else {
      if (next.lastSeen) next.pos = moveToward(next.pos, next.lastSeen, PATROL_SPEED * dt, colliders).pos;
      next.facing += dt * 1.4; // looking around
    }
    return { state: next, events };
  }

  // patrol (story mode patrols too, it just never hunts)
  if (next.kind === 'patrol' || next.kind === 'stare') {
    const target = route[next.wp];
    const m = moveToward(next.pos, target, PATROL_SPEED * dt, colliders);
    if (Math.hypot(target[0] - next.pos[0], target[1] - next.pos[1]) > 1e-3) next.facing = yawTo(next.pos, target);
    next.pos = m.pos;
    if (m.arrived) next.wp = (next.wp + 1) % route.length;
    next.kind = 'patrol';
  }
  return { state: next, events };
}

/** Wakes the presence at the start of its route. */
export function wake(s, route, now) {
  return { ...s, kind: 'patrol', pos: [...route[0]], wp: 1 % route.length, since: now };
}

/** After a catch: back to the route waypoint farthest from where the user restarts. */
export function resetAfterCatch(s, route, restartPos, now) {
  let far = 0, farD = -1;
  route.forEach((w, i) => {
    const d = Math.hypot(w[0] - restartPos[0], w[1] - restartPos[1]);
    if (d > farD) { farD = d; far = i; }
  });
  return { ...s, kind: 'patrol', pos: [...route[far]], wp: (far + 1) % route.length, since: now, blindUntil: now + GRACE_MS, lastSeen: null };
}
