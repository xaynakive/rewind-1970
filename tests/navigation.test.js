import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startMove, cameraAt, moveDuration, directionForKey, easeInOut, validateGraph,
  WALK_MS, CUT_OUT_MS, CUT_IN_MS,
} from '../src/systems/house/navigation.js';

const a = { id: 'a', area: 'yard', position: [0, 1, 0], lookAt: [0, 1, -5], exits: { forward: 'b' } };
const b = { id: 'b', area: 'yard', position: [2, 1, -2], lookAt: [2, 1, -7], exits: { back: 'a' } };
const c = { id: 'c', area: 'hall', position: [10, 1, 10], lookAt: [10, 1, 0], exits: {} };

test('moves inside an area glide for 0.6-1.2 s and end exactly on the viewpoint', () => {
  const m = startMove(a, b, 0);
  assert.equal(m.cross, false);
  assert.ok(moveDuration(m) >= 600 && moveDuration(m) <= 1200);
  assert.deepEqual(cameraAt(m, 0).position, a.position);
  const mid = cameraAt(m, WALK_MS / 2).position;
  assert.ok(mid[0] > 0 && mid[0] < 2);
  const end = cameraAt(m, WALK_MS);
  assert.deepEqual(end.position, b.position);
  assert.equal(end.done, true);
  assert.equal(end.glitch, 0);
});

test('moves between areas cut on a glitch and settle into the new room', () => {
  const m = startMove(a, c, 0);
  assert.equal(m.cross, true);
  assert.ok(moveDuration(m) >= 600 && moveDuration(m) <= 1200);
  const out = cameraAt(m, CUT_OUT_MS - 1);
  assert.equal(out.area, 'yard');
  assert.ok(out.glitch > 0.9);
  assert.ok(out.position[2] < 0, 'pushes forward toward the way out');
  const into = cameraAt(m, CUT_OUT_MS + 1);
  assert.equal(into.area, 'hall');
  assert.ok(into.glitch > 0.9);
  const end = cameraAt(m, CUT_OUT_MS + CUT_IN_MS);
  assert.deepEqual(end.position, c.position);
  assert.equal(end.glitch, 0);
  assert.equal(end.done, true);
});

test('keys map to directions', () => {
  assert.equal(directionForKey('W'), 'forward');
  assert.equal(directionForKey('ArrowLeft'), 'left');
  assert.equal(directionForKey('s'), 'back');
  assert.equal(directionForKey('ArrowRight'), 'right');
  assert.equal(directionForKey('q'), null);
});

test('easing starts at 0, ends at 1, and passes through the middle', () => {
  assert.equal(easeInOut(0), 0);
  assert.equal(easeInOut(1), 1);
  assert.equal(easeInOut(0.5), 0.5);
});

test('graph validation reports broken exits', () => {
  const g = new Map([['a', { id: 'a', exits: { forward: 'nowhere', up: 'a' } }]]);
  const problems = validateGraph(g);
  assert.equal(problems.length, 3);
});
