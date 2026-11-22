// What you can make at Wol's desk, what a placed talisman does, humming to the
// Caller, and where the red thread leads. Pure.
// Spec: .kiro/specs/haewol (Requirements 5.5, 7.2, 7.5, 12.7; design "Making and calming")

/**
 * Recipes: `uses` are used up, `tools` stay in your hands.
 * Checked in order; the first one you can make is made.
 */
export const RECIPES = [
  { uses: ['paper'], tools: ['ink'], makes: 'talisman',
    line: "you grind a little ink and copy the sign from wol's book onto the paper. the brush knows the way better than you do." },
  { uses: ['paper'], tools: ['thread'], makes: 'boat',
    line: 'you fold the paper into a boat, the way sae did, and tie a red thread to its bow so it can find its way back.' },
];

/** The recipe you can make with what you carry (a list of prop kinds), or null. */
export function findRecipe(kinds, recipes = RECIPES) {
  const have = new Map();
  for (const k of kinds) if (k) have.set(k, (have.get(k) ?? 0) + 1);
  for (const r of recipes) {
    const need = new Map();
    for (const k of [...r.uses, ...r.tools]) need.set(k, (need.get(k) ?? 0) + 1);
    if ([...need].every(([k, n]) => (have.get(k) ?? 0) >= n)) return r;
  }
  return null;
}

/** Which hotbar slots a recipe uses up. Assumes `findRecipe` said yes. */
export function slotsUsed(slotKinds, recipe) {
  const out = [];
  for (const k of recipe.uses) {
    const i = slotKinds.findIndex((s, j) => s === k && !out.includes(j));
    if (i >= 0) out.push(i);
  }
  return out;
}

// ---------- talismans ----------

/** Half the width of the square she can't step into around a talisman lying on the ground. */
export const WARD_HALF = 0.9;
/** A placed talisman burns for this long (night time), then is ash. */
export const WARD_MS = 30000;

/** Whether a talisman placed at `placedMs` still holds at `nightMs`. */
export const wardHolds = (placedMs, nightMs) => placedMs !== null && placedMs !== undefined && nightMs - placedMs < WARD_MS;

/** The box she can't cross, as a floor collider. */
export function wardCollider([x, , z], half = WARD_HALF) {
  return { min: [x - half, z - half], max: [x + half, z + half] };
}

// ---------- humming ----------

export const HUM_RANGE = 12;
export const HUM_COOLDOWN_MS = 20000;
/** How long she stands and listens: longer the more of the song you know. */
export const calmMs = (pieces) => 3000 * Math.max(0, pieces);

/** What humming does, given how much of the song you know and where she is. */
export function humEffect({ pieces, callerKind, dist }) {
  if (pieces <= 0) return 'unknown';
  const awake = callerKind === 'patrol' || callerKind === 'search' || callerKind === 'hunt';
  return awake && dist <= HUM_RANGE ? 'calms' : 'alone';
}

// ---------- the red thread ----------

/** The order Sae's red thread leads you through the memories. */
export const THREAD_ORDER = ['memory-boat', 'memory-tape', 'memory-ribbon', 'memory-telegram', 'memory-spectacles', 'memory-drawing'];
/** The longest stretch of thread drawn in front of you. */
export const THREAD_MAX = 7;

/** The next thing the thread leads to: the first memory in order that you don't have yet. */
export function threadTarget(taken, order = THREAD_ORDER) {
  return order.find((id) => !taken.includes(id)) ?? null;
}
