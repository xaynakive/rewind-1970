// The pond's secret. Pure: time (ms) and randomness are passed in.
// Spec: .kiro/specs/pond
//
// Ripples spread out from where the water is touched. When a ripple's ring has
// passed over the skeleton and the water settles, the skeleton shows faintly
// for a moment. Lightning shows it too. Seeing it three times is "noticing".

export const MAX_RIPPLES = 8;
export const RIPPLE_MS = 3000;
export const RIPPLE_SPEED = 0.8; // metres per second
export const SETTLE_MS = 350;    // after the ring passes, before the glimpse
export const GLIMPSE_STRENGTH = 0.35;
export const NOTICE_AFTER = 3;

/**
 * @param {{ skeleton: [number, number] }} opts skeleton centre (x, z)
 */
export function createPond({ skeleton }) {
  return { skeleton, ripples: [], glimpses: [], seen: 0, noticed: false };
}

/** Adds a ripple. Keeps at most 8, dropping the oldest. Schedules a glimpse if the ring will reach the skeleton. */
export function addRipple(pond, x, z, now, rand) {
  pond.ripples.push({ x, z, start: now });
  if (pond.ripples.length > MAX_RIPPLES) pond.ripples.shift();
  const dist = Math.hypot(x - pond.skeleton[0], z - pond.skeleton[1]);
  const reachMs = (dist / RIPPLE_SPEED) * 1000;
  if (reachMs < RIPPLE_MS) {
    pond.glimpses.push({
      at: now + reachMs + SETTLE_MS,
      duration: 300 + rand() * 300,
      strength: GLIMPSE_STRENGTH,
      counted: false,
    });
  }
}

/** Flat array of 8 × (x, z, ageSeconds) for the shader. Inactive slots have age -1. */
export function rippleUniforms(pond, now) {
  const out = new Float32Array(MAX_RIPPLES * 3).fill(-1);
  pond.ripples.forEach((r, i) => {
    const age = now - r.start;
    out[i * 3] = r.x;
    out[i * 3 + 1] = r.z;
    out[i * 3 + 2] = age >= 0 && age <= RIPPLE_MS ? age / 1000 : -1;
  });
  return out;
}

/** How visible the skeleton is now (0..1): the stronger of lightning and any glimpse. */
export function revealAt(pond, now, flash = 0) {
  let v = Math.max(0, flash);
  for (const g of pond.glimpses) {
    const t = (now - g.at) / g.duration;
    if (t >= 0 && t <= 1) v = Math.max(v, g.strength * Math.sin(Math.PI * t));
  }
  return v;
}

/**
 * Counts glimpses that have started, and drops old ripples and glimpses.
 * A glimpse only counts if the player was watching the pond when it began.
 * @returns {boolean} true the one time the secret becomes noticed
 */
export function tickPond(pond, now, watching) {
  for (const g of pond.glimpses) {
    if (!g.counted && now >= g.at) {
      g.counted = true;
      if (watching) pond.seen++;
    }
  }
  pond.glimpses = pond.glimpses.filter((g) => now < g.at + g.duration);
  pond.ripples = pond.ripples.filter((r) => now - r.start <= RIPPLE_MS);
  return checkNoticed(pond);
}

/** Lightning shows the skeleton to anyone watching the pond. */
export function noteLightning(pond, watching) {
  if (watching) pond.seen++;
  return checkNoticed(pond);
}

function checkNoticed(pond) {
  if (!pond.noticed && pond.seen >= NOTICE_AFTER) {
    pond.noticed = true;
    return true;
  }
  return false;
}
