// Decay is visual only. Nothing here may change a tape's stored text.
// Spec: .kiro/specs/decay

export const GRACE_DAYS = 3;
export const FULL_DAYS = 30;
export const MAX_DECAY = 0.85;
const DAY_MS = 86_400_000;

/**
 * Decay level from 0 to MAX_DECAY.
 * @param {number} lastViewedAt epoch ms
 * @param {number} now epoch ms
 * @param {number} [timeScale=1] demo setting: multiplies elapsed time
 */
export function decayLevel(lastViewedAt, now, timeScale = 1) {
  const days = (Math.max(0, now - lastViewedAt) * timeScale) / DAY_MS;
  if (days <= GRACE_DAYS) return 0;
  const t = Math.min(1, (days - GRACE_DAYS) / (FULL_DAYS - GRACE_DAYS));
  const eased = t * t * (3 - 2 * t);
  return eased * MAX_DECAY;
}

/** @returns {'clean' | 'worn' | 'damaged' | 'fading'} */
export function decayStage(level) {
  if (level <= 0) return 'clean';
  if (level <= 0.3) return 'worn';
  if (level <= 0.6) return 'damaged';
  return 'fading';
}
