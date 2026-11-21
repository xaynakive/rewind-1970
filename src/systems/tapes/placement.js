// Choosing where a tape hides. Pure and deterministic.
// Spec: .kiro/specs/tapes (Requirement 2)

import { fnv1a } from '../../core/hash.js';

export { fnv1a };

/** Hiding spots and the area each one belongs to. */
export const SPOTS = [
  { id: 'under-bed', area: 'bedroom' },
  { id: 'mailbox', area: 'front-yard' },
  { id: 'pumpkin-pile', area: 'messy-room' },
  { id: 'grave-1', area: 'front-yard' },
  { id: 'grave-2', area: 'front-yard' },
  { id: 'grave-3', area: 'front-yard' },
  { id: 'pond', area: 'front-yard' },
  { id: 'wardrobe', area: 'bedroom' },
  { id: 'tv-cabinet', area: 'living-room' },
  { id: 'attic-hatch', area: 'hallway' },
];

/**
 * @param {string} tapeId
 * @param {Record<string, number>} occupancy number of tapes per spot id
 * @returns {string} spot id
 */
export function chooseSpot(tapeId, occupancy = {}) {
  const start = fnv1a(tapeId) % SPOTS.length;
  for (let i = 0; i < SPOTS.length; i++) {
    const spot = SPOTS[(start + i) % SPOTS.length];
    if (!occupancy[spot.id]) return spot.id;
  }
  // Every spot is taken: stack on the least occupied one, scanning from the same start.
  let best = SPOTS[start].id;
  for (let i = 0; i < SPOTS.length; i++) {
    const spot = SPOTS[(start + i) % SPOTS.length];
    if (occupancy[spot.id] < occupancy[best]) best = spot.id;
  }
  return best;
}

export function occupancyOf(tapes) {
  const occ = {};
  for (const t of tapes) occ[t.spot] = (occ[t.spot] ?? 0) + 1;
  return occ;
}
