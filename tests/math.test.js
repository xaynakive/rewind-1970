import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perspective, lookAt, multiply, transformPoint, invert, pickPlaneY } from '../src/render/math.js';

const viewProj = multiply(perspective(1, 4 / 3, 0.15, 70), lookAt([2.2, 1.5, 2.8], [4.2, 0.05, -1.4]));

test('a matrix times its inverse is the identity', () => {
  const id = multiply(viewProj, invert(viewProj));
  for (let i = 0; i < 16; i++) assert.ok(Math.abs(id[i] - (i % 5 === 0 ? 1 : 0)) < 1e-4, `entry ${i}`);
});

test('clicking on a point of the water finds that point again', () => {
  const point = [4.0, 0.03, -1.2];
  const [x, y, , w] = transformPoint(viewProj, point);
  const hit = pickPlaneY(viewProj, x / w, y / w, 0.03);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(hit[i] - point[i]) < 1e-3, `axis ${i}: ${hit[i]}`);
});

test('looking above the horizon misses the plane', () => {
  assert.equal(pickPlaneY(viewProj, 0, 0.99, -50), null);
});
