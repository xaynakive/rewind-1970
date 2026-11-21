// Lightning timing. Pure: randomness is injected.
// Spec: .kiro/specs/house (Requirement 3) and steering/art-style.md (Accessibility)

export const MIN_INTERVAL_MS = 8000;
export const MAX_INTERVAL_MS = 25000;

export function nextStrikeDelay(rand) {
  return MIN_INTERVAL_MS + rand() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS);
}

/**
 * @param {() => number} rand
 * @param {boolean} reduceFlashing
 * @returns {{ fade: boolean, flashes: { at: number, duration: number, peak: number }[], thunderDelay: number }}
 */
export function createStrike(rand, reduceFlashing) {
  const thunderDelay = 500 + rand() * 2500;
  if (reduceFlashing) {
    return { fade: true, flashes: [{ at: 0, duration: 700, peak: 0.5 }], thunderDelay };
  }
  const first = { at: 0, duration: 80 + rand() * 70, peak: 1 };
  const flashes = [first];
  if (rand() < 0.4) {
    flashes.push({ at: first.duration + 60 + rand() * 120, duration: 80 + rand() * 70, peak: 0.8 });
  }
  return { fade: false, flashes, thunderDelay };
}

/** Flash brightness (0..1) at `elapsed` ms after the strike began. */
export function flashIntensity(strike, elapsed) {
  let value = 0;
  for (const f of strike.flashes) {
    const t = elapsed - f.at;
    if (t < 0 || t > f.duration) continue;
    const v = strike.fade
      ? Math.sin((Math.PI * t) / f.duration) * f.peak
      : f.peak * (1 - 0.35 * (t / f.duration));
    value = Math.max(value, v);
  }
  return value;
}

export function strikeLength(strike) {
  return Math.max(...strike.flashes.map((f) => f.at + f.duration));
}
