import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextStrikeDelay, createStrike, flashIntensity, strikeLength,
  MIN_INTERVAL_MS, MAX_INTERVAL_MS,
} from '../src/systems/house/lightning.js';

const fixed = (v) => () => v;
function seeded(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

test('strikes are 8 to 25 seconds apart', () => {
  assert.equal(nextStrikeDelay(fixed(0)), MIN_INTERVAL_MS);
  assert.equal(nextStrikeDelay(fixed(0.999999)) <= MAX_INTERVAL_MS, true);
});

test('normal flashes last 80-150 ms and thunder follows in 0.5-3 s', () => {
  const rand = seeded(42);
  for (let i = 0; i < 500; i++) {
    const s = createStrike(rand, false);
    for (const f of s.flashes) assert.ok(f.duration >= 80 && f.duration <= 150);
    assert.ok(s.flashes.length <= 2);
    assert.ok(s.thunderDelay >= 500 && s.thunderDelay <= 3000);
  }
});

test('reduced flashing is a single fade, at most 50% bright, at least 400 ms', () => {
  const rand = seeded(7);
  for (let i = 0; i < 100; i++) {
    const s = createStrike(rand, true);
    assert.equal(s.flashes.length, 1);
    assert.ok(s.flashes[0].duration >= 400);
    let peak = 0;
    for (let t = 0; t <= strikeLength(s); t += 5) peak = Math.max(peak, flashIntensity(s, t));
    assert.ok(peak <= 0.5 + 1e-9);
  }
});

test('flash intensity is zero outside the flashes', () => {
  const s = createStrike(fixed(0.9), false); // 0.9 >= 0.4: single flash
  assert.equal(s.flashes.length, 1);
  assert.equal(flashIntensity(s, -1), 0);
  assert.ok(flashIntensity(s, 10) > 0.9);
  assert.equal(flashIntensity(s, strikeLength(s) + 1), 0);
});
