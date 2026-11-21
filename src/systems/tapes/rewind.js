// Hold-to-rewind. Pure state transitions; time is passed in.
// Spec: .kiro/specs/tapes (Requirement 4)

export const REWIND_MS = 2000;

/** @typedef {{kind:'idle'} | {kind:'holding', tapeId:string, startedAt:number} | {kind:'complete', tapeId:string} | {kind:'cancelled', tapeId:string, progress:number}} RewindState */

export const idle = () => ({ kind: 'idle' });

/** @returns {RewindState} */
export function startRewind(tapeId, now) {
  return { kind: 'holding', tapeId, startedAt: now };
}

export function rewindProgress(state, now) {
  if (state.kind === 'complete') return 1;
  if (state.kind !== 'holding') return 0;
  return Math.min(1, Math.max(0, (now - state.startedAt) / REWIND_MS));
}

/** Call every frame while holding. Turns into `complete` once 2 s have passed. */
export function tickRewind(state, now) {
  if (state.kind === 'holding' && rewindProgress(state, now) >= 1) {
    return { kind: 'complete', tapeId: state.tapeId };
  }
  return state;
}

/** Releasing early cancels; releasing at or after 2 s completes. */
export function releaseRewind(state, now) {
  if (state.kind !== 'holding') return state;
  const progress = rewindProgress(state, now);
  if (progress >= 1) return { kind: 'complete', tapeId: state.tapeId };
  return { kind: 'cancelled', tapeId: state.tapeId, progress };
}

/**
 * The tape after a completed rewind: restored, counted, and laid back on
 * top of its pile. Never touches the text.
 */
export function applyRewind(tape, now) {
  return { ...tape, lastViewedAt: now, stackedAt: now, rewindCount: (tape.rewindCount ?? 0) + 1 };
}
