import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createPond, addRipple, rippleUniforms, revealAt, tickPond, noteLightning,
  MAX_RIPPLES, RIPPLE_MS, RIPPLE_SPEED, SETTLE_MS, GLIMPSE_STRENGTH,
} from '../src/systems/pond/pond.js';

const half = () => 0.5;
const pond = () => createPond({ skeleton: [0, 0] });

test('at most 8 ripples, the oldest goes first', () => {
  const p = pond();
  for (let i = 0; i < 10; i++) addRipple(p, 10 + i, 0, i, half);
  assert.equal(p.ripples.length, MAX_RIPPLES);
  assert.equal(p.ripples[0].x, 12);
});

test('shader uniforms: age in seconds, -1 for empty or finished ripples', () => {
  const p = pond();
  addRipple(p, 1, 2, 1000, half);
  const u = rippleUniforms(p, 2500);
  assert.deepEqual([...u.slice(0, 3)], [1, 2, 1.5]);
  assert.equal(u[5], -1);
  assert.equal(rippleUniforms(p, 1000 + RIPPLE_MS + 1)[2], -1);
});

test('the skeleton is hidden until something reveals it', () => {
  const p = pond();
  assert.equal(revealAt(p, 0), 0);
  assert.equal(revealAt(p, 0, 1), 1, 'lightning shows it fully');
});

test('a ripple reaching the skeleton gives a faint glimpse once the water settles', () => {
  const p = pond();
  addRipple(p, 0.8, 0, 0, half); // 0.8 m away: the ring arrives after 1 s
  const at = (0.8 / RIPPLE_SPEED) * 1000 + SETTLE_MS;
  const g = p.glimpses[0];
  assert.ok(Math.abs(g.at - at) < 1e-9);
  assert.ok(g.duration >= 300 && g.duration <= 600);
  assert.equal(revealAt(p, at - 1), 0);
  assert.ok(Math.abs(revealAt(p, at + g.duration / 2) - GLIMPSE_STRENGTH) < 1e-9);
  assert.equal(revealAt(p, at + g.duration + 1), 0);
});

test('a ripple that fades before it reaches the skeleton shows nothing', () => {
  const p = pond();
  addRipple(p, 5, 0, 0, half); // 6.25 s away
  assert.equal(p.glimpses.length, 0);
});

test('glimpses only count while watching, and noticing happens exactly once at 3', () => {
  const p = pond();
  const glimpse = (t, watching) => {
    addRipple(p, 0.4, 0, t, half);
    return tickPond(p, t + 2000, watching);
  };
  assert.equal(glimpse(0, false), false);
  assert.equal(p.seen, 0, 'not watching: not counted');
  assert.equal(glimpse(10000, true), false);
  assert.equal(noteLightning(p, false), false);
  assert.equal(noteLightning(p, true), false);
  assert.equal(p.seen, 2);
  assert.equal(glimpse(20000, true), true, 'third sighting: noticed');
  assert.equal(glimpse(30000, true), false, 'only once');
  assert.equal(p.noticed, true);
});

test('old ripples and glimpses are cleaned up', () => {
  const p = pond();
  addRipple(p, 0.4, 0, 0, half);
  tickPond(p, 10000, true);
  assert.equal(p.ripples.length, 0);
  assert.equal(p.glimpses.length, 0);
});
