// Words drifting out of place on a decayed tape. Pure and deterministic.
// Returns layout offsets only: the text itself is never changed.
// Spec: .kiro/specs/decay (Requirements 2.1, 3.2)

import { mulberry32 } from '../../core/hash.js';
import { MAX_DECAY } from './decay.js';

export const MAX_DRIFT_SHARE = 0.2;

/** Splits text into word and whitespace tokens. Joining them gives back the text. */
export function tokenize(text) {
  return text.split(/(\s+)/).filter((t) => t.length > 0);
}

/**
 * @param {string} text
 * @param {number} seed usually fnv1a(tape.id)
 * @param {number} level decay level, 0..MAX_DECAY
 * @returns {{ text: string, space: boolean, dx: number, dy: number, fade: number }[]}
 *   dx/dy in em, fade in 0..1 (how much the word has faded)
 */
export function driftWords(text, seed, level) {
  const tokens = tokenize(text);
  const words = [];
  tokens.forEach((t, i) => { if (/\S/.test(t)) words.push(i); });

  const t = Math.max(0, Math.min(1, level / MAX_DECAY));
  const count = Math.floor(words.length * MAX_DRIFT_SHARE * t);

  // One full shuffle per tape, so the words that drift at low decay keep
  // drifting as decay grows: damage only ever accumulates.
  const pick = mulberry32(seed);
  const order = words.slice();
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(pick() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const moved = new Set(order.slice(0, count));

  // Offsets come from a second stream, one draw per word, so they don't
  // depend on how many words are moving.
  const offset = mulberry32(seed ^ 0x9e3779b9);
  const shapes = new Map();
  for (const i of words) shapes.set(i, [offset() * 2 - 1, offset() * 2 - 1, offset()]);

  return tokens.map((text, i) => {
    if (!moved.has(i)) return { text, space: !/\S/.test(text), dx: 0, dy: 0, fade: 0 };
    const [x, y, f] = shapes.get(i);
    return {
      text,
      space: false,
      dx: x * (0.4 + 2.2 * t),
      dy: y * 0.55 * t,
      fade: (0.2 + 0.5 * f) * t,
    };
  });
}
