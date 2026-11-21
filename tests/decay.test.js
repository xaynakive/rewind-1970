import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decayLevel, decayStage, MAX_DECAY } from '../src/systems/decay/decay.js';

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 31);

test('no decay during the 3-day grace period', () => {
  assert.equal(decayLevel(T0, T0), 0);
  assert.equal(decayLevel(T0, T0 + 3 * DAY), 0);
});

test('decay rises after the grace period', () => {
  const a = decayLevel(T0, T0 + 3.5 * DAY);
  const b = decayLevel(T0, T0 + 16.5 * DAY);
  assert.ok(a > 0 && a < b && b < MAX_DECAY);
  assert.ok(Math.abs(b - MAX_DECAY / 2) < 1e-9, 'midpoint is half of max');
});

test('decay caps at MAX_DECAY so a tape is never fully lost', () => {
  assert.equal(decayLevel(T0, T0 + 30 * DAY), MAX_DECAY);
  assert.equal(decayLevel(T0, T0 + 900 * DAY), MAX_DECAY);
});

test('a clock earlier than lastViewedAt counts as no time passed', () => {
  assert.equal(decayLevel(T0, T0 - 50 * DAY), 0);
});

test('demo time scale speeds up decay', () => {
  const minuteAsDay = DAY / 60_000;
  assert.equal(decayLevel(T0, T0 + 30 * 60_000, minuteAsDay), MAX_DECAY);
});

test('stages', () => {
  assert.equal(decayStage(0), 'clean');
  assert.equal(decayStage(0.01), 'worn');
  assert.equal(decayStage(0.3), 'worn');
  assert.equal(decayStage(0.31), 'damaged');
  assert.equal(decayStage(0.6), 'damaged');
  assert.equal(decayStage(0.61), 'fading');
  assert.equal(decayStage(MAX_DECAY), 'fading');
});
