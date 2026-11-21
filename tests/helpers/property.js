// A tiny property-based testing helper: no dependencies, seeded, reproducible.
// Each property runs `runs` times with generated inputs. On failure it reports
// the seed and the input, so the case can be replayed exactly.

import { mulberry32 } from '../../src/core/hash.js';

/** Generators take a random source and return a value. */
export const gen = {
  int: (min, max) => (rand) => min + Math.floor(rand() * (max - min + 1)),
  float: (min, max) => (rand) => min + rand() * (max - min),
  bool: () => (rand) => rand() < 0.5,
  pick: (items) => (rand) => items[Math.floor(rand() * items.length)],
  array: (item, minLen, maxLen) => (rand) => {
    const n = minLen + Math.floor(rand() * (maxLen - minLen + 1));
    return Array.from({ length: n }, () => item(rand));
  },
  /** Words, spaces, line breaks, punctuation and non-Latin text. */
  text: (maxWords = 60) => (rand) => {
    const words = ['the', 'rain', 'grandma', 'soup', 'élan', 'naïve', '雨', 'はは', 'ночь', 'محبة', '🙂', 'a', "don't", '1970', 'well,', 'end.'];
    const gaps = [' ', ' ', ' ', '  ', '\n', '\t', ' \n '];
    const n = 1 + Math.floor(rand() * maxWords);
    let s = rand() < 0.2 ? ' ' : '';
    for (let i = 0; i < n; i++) {
      s += words[Math.floor(rand() * words.length)];
      if (i < n - 1) s += gaps[Math.floor(rand() * gaps.length)];
    }
    return s;
  },
};

/**
 * @param {string} name
 * @param {Record<string, (rand: () => number) => any>} gens
 * @param {(input: Record<string, any>) => void} check throws (e.g. via assert) on failure
 * @param {{ runs?: number, seed?: number }} [opts]
 */
export function forAll(name, gens, check, { runs = 300, seed = 0x5eed1970 } = {}) {
  for (let i = 0; i < runs; i++) {
    const caseSeed = (seed + i * 0x9e3779b1) >>> 0;
    const rand = mulberry32(caseSeed);
    const input = {};
    for (const [k, g] of Object.entries(gens)) input[k] = g(rand);
    try {
      check(input);
    } catch (err) {
      err.message = `property "${name}" failed on run ${i} (seed ${caseSeed}) with input ${JSON.stringify(input)}\n${err.message}`;
      throw err;
    }
  }
}
