import { test } from 'node:test';
import assert from 'node:assert/strict';
import { driftWords, tokenize, MAX_DRIFT_SHARE } from '../src/systems/decay/drift.js';
import { MAX_DECAY } from '../src/systems/decay/decay.js';

const TEXT = Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ') + '\n\nlast line  with   gaps';
const moved = (tokens) => tokens.filter((t) => t.dx !== 0 || t.dy !== 0 || t.fade !== 0);

test('tokens join back into the exact original text', () => {
  assert.equal(tokenize(TEXT).join(''), TEXT);
  assert.equal(driftWords(TEXT, 1, MAX_DECAY).map((t) => t.text).join(''), TEXT);
});

test('a clean tape has no drift', () => {
  assert.equal(moved(driftWords(TEXT, 1, 0)).length, 0);
});

test('at most 20% of words drift, even at full decay', () => {
  const words = tokenize(TEXT).filter((t) => /\S/.test(t)).length;
  const n = moved(driftWords(TEXT, 99, MAX_DECAY)).length;
  assert.equal(n, Math.floor(words * MAX_DRIFT_SHARE));
});

test('the same tape always shows the same damage', () => {
  assert.deepEqual(driftWords(TEXT, 1234, 0.5), driftWords(TEXT, 1234, 0.5));
  assert.notDeepEqual(driftWords(TEXT, 1234, 0.5), driftWords(TEXT, 4321, 0.5));
});

test('damage only accumulates: words that drift early keep drifting', () => {
  const early = new Set(moved(driftWords(TEXT, 7, 0.3)).map((t) => t.text));
  const late = new Set(moved(driftWords(TEXT, 7, MAX_DECAY)).map((t) => t.text));
  assert.ok(early.size > 0 && early.size < late.size);
  for (const w of early) assert.ok(late.has(w), `${w} stopped drifting`);
});

test('whitespace never drifts', () => {
  for (const t of driftWords(TEXT, 5, MAX_DECAY)) {
    if (t.space) assert.deepEqual([t.dx, t.dy, t.fade], [0, 0, 0]);
  }
});
