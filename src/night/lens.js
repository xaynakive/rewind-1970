// The camcorder: a battery that drains while recording. Pure.
// Spec: .kiro/specs/haewol (Requirement 4, design "The lens")

export const BATTERY_FULL = 100;
export const DRAIN_PER_SEC = 2.2;
export const RECOVER_PER_SEC = 0.5;
/** Below this the lens won't start recording (it can keep going down to 0). */
export const MIN_TO_START = 5;

export function createLens() {
  return { battery: BATTERY_FULL, recording: false };
}

/** Ask to raise (`want: true`) or lower the camcorder. */
export function setRecording(lens, want) {
  if (!want) return { ...lens, recording: false };
  if (lens.recording) return lens;
  return { ...lens, recording: lens.battery >= MIN_TO_START };
}

/** Advance `sec` seconds. Recording drains; resting recovers slowly. Empty stops recording. */
export function tickLens(lens, sec) {
  if (lens.recording) {
    const battery = Math.max(0, lens.battery - DRAIN_PER_SEC * sec);
    return { battery, recording: battery > 0 };
  }
  return { ...lens, battery: Math.min(BATTERY_FULL, lens.battery + RECOVER_PER_SEC * sec) };
}
