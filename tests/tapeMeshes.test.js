import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTapeMeshes, sortStack, slideUnder, labelColor } from '../src/systems/tapes/tapeMeshes.js';
import { applyRewind } from '../src/systems/tapes/rewind.js';
import { MAX_DECAY } from '../src/systems/decay/decay.js';

const tape = (id, createdAt, extra = {}) => ({ id, label: id, spot: 'shelf', createdAt, ...extra });
const spots = { shelf: { pos: [0, 0, 0], maxStack: 3 } };
const topOf = (tapes) => buildTapeMeshes(tapes, spots, () => 0).hotspots[0].id;

test('one hotspot per pile, and it picks the top tape', () => {
  const tapes = [tape('a', 1), tape('b', 2), tape('c', 3)];
  const { hotspots } = buildTapeMeshes(tapes, spots, () => 0);
  assert.equal(hotspots.length, 1);
  assert.equal(hotspots[0].id, 'tape:c');
  assert.match(hotspots[0].label, /2 more/);
});

test('tapes in areas that are not loaded are not drawn', () => {
  const r = buildTapeMeshes([tape('a', 1, { spot: 'pond' })], spots, () => 0);
  assert.equal(r.meshData, null);
  assert.equal(r.hotspots.length, 0);
});

test('a swapped tape slides under its pile, so the next one down comes up', () => {
  let tapes = [tape('a', 1), tape('b', 2), tape('c', 3)];
  assert.equal(topOf(tapes), 'tape:c');
  // pick up c (it leaves the pile), then b is on top
  assert.equal(topOf(tapes.filter((t) => t.id !== 'c')), 'tape:b');
  // swap: c slides under while b is picked up -> a is on top
  const c = slideUnder(tapes[2], tapes);
  tapes = [tapes[0], tapes[1], c];
  assert.deepEqual(sortStack(tapes).map((t) => t.id), ['c', 'a', 'b']);
  assert.equal(topOf(tapes.filter((t) => t.id !== 'b')), 'tape:a');
});

test('a rewound tape goes back on top of its pile', () => {
  const tapes = [tape('a', 1), tape('b', 2), tape('c', 3)];
  const a = applyRewind(tapes[0], 100);
  assert.equal(topOf([a, tapes[1], tapes[2]]), 'tape:a');
});

test('the pile is capped at maxStack when drawn, but the hotspot still counts every tape', () => {
  const tapes = Array.from({ length: 5 }, (_, i) => tape(`t${i}`, i));
  const { meshData, hotspots } = buildTapeMeshes(tapes, spots, () => 0);
  const boxesPlusLabels = meshData.length / 10 / 3; // triangles
  assert.equal(boxesPlusLabels, 3 * (12 + 2)); // 3 drawn tapes, 12 box + 2 label triangles each
  assert.match(hotspots[0].label, /4 more/);
});

test('labels change colour with decay: clean cream, then yellowed, then red', () => {
  const clean = labelColor(0);
  const worn = labelColor(MAX_DECAY * 0.5);
  const fading = labelColor(MAX_DECAY);
  assert.ok(clean[2] > worn[2], 'blue drops as the label yellows');
  assert.ok(fading[0] - fading[2] > worn[0] - worn[2], 'red dominates at the end');
});
