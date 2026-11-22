// The night: 23:58:00 to 00:00:00, slowed to LOOP_MS of real time. Pure.
// Spec: .kiro/specs/haewol (Requirement 2, design "The clock")

export const LOOP_MS = 480000;
export const START_SEC = 23 * 3600 + 58 * 60; // 23:58:00
export const MIDNIGHT_SEC = 24 * 3600;
export const WAKE_MS = 45000;
/** The house calls her name at these points of the night (fractions of LOOP_MS). */
export const NAME_CALLS = [0.3, 0.7];

export const WATER_LOW = -0.3;
export const WATER_HIGH = 0.2;

const clamp01 = (t) => Math.max(0, Math.min(1, t));

/** Seconds of the day shown on the timecode, `ms` into the night. */
export function clockAt(ms) {
  return START_SEC + clamp01(ms / LOOP_MS) * (MIDNIGHT_SEC - START_SEC);
}

export function isMidnight(ms) {
  return ms >= LOOP_MS;
}

/** The water's height (m) `ms` into the night: slow at first, then faster. */
export function waterAt(ms) {
  const t = clamp01(ms / LOOP_MS);
  return WATER_LOW + (WATER_HIGH - WATER_LOW) * t * t * (1.6 - 0.6 * t);
}

/** When she wakes this night: later on the first two loops, at once after that. */
export function wakeAt(loops) {
  return loops >= 2 ? 4000 : WAKE_MS;
}

/** Which name calls are due by `ms` (indices into NAME_CALLS). */
export function nameCallsDue(ms) {
  return NAME_CALLS.map((f, i) => (ms >= f * LOOP_MS ? i : -1)).filter((i) => i >= 0);
}

/** "HH:MM:SS" for seconds of the day (24:00:00 shows as 00:00:00). */
export function timecode(sec) {
  const s = Math.floor(sec) % 86400;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

/** "HH:MM" for the lock screen and the island. */
export function clockShort(sec) {
  return timecode(sec).slice(0, 5);
}

const ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
/** The title card for a night: "the first night", ... then "night 11". `loops` counts finished nights. */
export function nightTitle(loops) {
  const n = Math.max(0, Math.floor(loops));
  return n < ORDINALS.length ? `the ${ORDINALS[n]} night` : `night ${n + 1}`;
}
