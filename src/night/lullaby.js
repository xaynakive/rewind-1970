// The lullaby Sae hummed: a short tune in pieces. Pure data.
// Spec: .kiro/specs/haewol (Requirement 7.2)
//
// Each piece is a phrase of [semitones above A4, beats]. Pieces are found one
// at a time; you can only hum what you have heard.

export const BEAT_MS = 420;
export const PIECES = [
  [[3, 1], [5, 1], [7, 2], [5, 1], [3, 1], [0, 2]],
  [[3, 1], [5, 1], [7, 1], [10, 1], [7, 2], [5, 2]],
  [[8, 1], [7, 1], [5, 1], [3, 1], [5, 2], [0, 2]],
  [[0, 1], [3, 1], [5, 2], [3, 1], [0, 1], [-2, 2]],
];
export const PIECE_COUNT = PIECES.length;

/** Notes to play, as { hz, at (ms from now), ms }, for the first `n` pieces in order. */
export function tune(n, pieces = PIECES) {
  const out = [];
  let t = 0;
  for (const phrase of pieces.slice(0, Math.max(0, Math.min(n, pieces.length)))) {
    for (const [semi, beats] of phrase) {
      out.push({ hz: 440 * 2 ** (semi / 12), at: t, ms: beats * BEAT_MS });
      t += beats * BEAT_MS;
    }
    t += BEAT_MS; // a breath between phrases
  }
  return out;
}

/** How long `tune(n)` lasts, in ms. */
export function tuneLength(n) {
  const notes = tune(n);
  return notes.length ? notes[notes.length - 1].at + notes[notes.length - 1].ms : 0;
}
