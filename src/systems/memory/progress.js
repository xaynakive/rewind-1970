// What the user has done inside each memory, as stored in the `meta` store
// under 'memories'. Pure. Spec: .kiro/specs/memories (Requirements 1.4, 1.5, 6.4)

/**
 * @typedef {{ taken: string[], opened: string[], checkpoint: string, done: boolean }} MemoryProgress
 * @typedef {Record<string, MemoryProgress>} MemoriesProgress
 */

const strings = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string'))] : []);

/** @returns {MemoryProgress} */
export function emptyMemory() {
  return { taken: [], opened: [], checkpoint: 'entrance', done: false };
}

/** Accepts whatever was stored and returns well-formed progress for every memory id given. */
export function normalizeMemories(raw, ids) {
  const out = {};
  for (const id of ids) {
    const m = raw && typeof raw === 'object' ? raw[id] : null;
    if (!m || typeof m !== 'object') { out[id] = emptyMemory(); continue; }
    out[id] = {
      taken: strings(m.taken),
      opened: strings(m.opened),
      checkpoint: typeof m.checkpoint === 'string' ? m.checkpoint : 'entrance',
      done: m.done === true,
    };
  }
  return out;
}

/** Returns progress with `id` added to `key` ('taken' or 'opened'), or the same object if it's there. */
export function withEntry(m, key, id) {
  return m[key].includes(id) ? m : { ...m, [key]: [...m[key], id] };
}

/** Returns progress with `id` removed from `opened` (a drawer closed again). */
export function withoutOpened(m, id) {
  return m.opened.includes(id) ? { ...m, opened: m.opened.filter((x) => x !== id) } : m;
}

/** How many of the given ids have been taken. */
export function countTaken(m, ids) {
  return ids.filter((id) => m.taken.includes(id)).length;
}
