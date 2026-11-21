import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildHouse } from '../src/systems/house/areas.js';
import { validateGraph, reachable, neighbourAreas } from '../src/systems/house/navigation.js';
import { SPOTS } from '../src/systems/tapes/placement.js';
import { perspective, lookAt, multiply, transformPoint } from '../src/render/math.js';

const house = buildHouse();
const proj = perspective((58 * Math.PI) / 180, 4 / 3, 0.1, 20);

test('every exit leads to a real viewpoint', () => {
  assert.deepEqual(validateGraph(house.viewpoints), []);
});

test('every viewpoint can be reached from the gate, and the gate from every viewpoint', () => {
  const all = [...house.viewpoints.keys()];
  assert.deepEqual([...reachable(house.viewpoints, house.start)].sort(), all.sort());
  for (const id of all) assert.ok(reachable(house.viewpoints, id).has(house.start), `stuck at ${id}`);
});

test('every hiding spot lives in the area the placement table says', () => {
  for (const { id, area } of SPOTS) {
    const owners = [...house.areas.values()].filter((a) => a.spots[id]);
    assert.equal(owners.length, 1, `${id} is defined in ${owners.length} areas`);
    assert.equal(owners[0].id, area, `${id} should be in ${area}`);
  }
});

test('every hiding spot is on screen from at least one viewpoint in its area', () => {
  for (const { id, area } of SPOTS) {
    const spot = house.areas.get(area).spots[id];
    const views = [...house.viewpoints.values()].filter((v) => v.area === area);
    const seen = views.some((v) => {
      const [x, y, , w] = transformPoint(multiply(proj, lookAt(v.position, v.lookAt)), spot.pos);
      return w > 0.1 && Math.abs(x / w) < 0.85 && Math.abs(y / w) < 0.85;
    });
    assert.ok(seen, `${id} cannot be seen from any viewpoint in ${area}`);
  }
});

test('every area has exactly 3 lights and stays within the triangle budget', () => {
  let total = 0;
  for (const a of house.areas.values()) {
    assert.equal(a.lights(0).length, 3, `${a.id} lights`);
    for (const l of a.lights(12345)) assert.ok(l.range > 0 && l.intensity >= 0, `${a.id} light`);
    assert.ok(a.triangles <= 4000, `${a.id} has ${a.triangles} triangles`);
    assert.equal(a.meshData.length, a.triangles * 30);
    total += a.triangles;
  }
  assert.ok(total <= 20000, `house has ${total} triangles`);
});

test('neighbouring areas: the hallway connects to everything inside, and the yard', () => {
  assert.deepEqual([...neighbourAreas(house.viewpoints, 'hallway')].sort(), ['bedroom', 'front-yard', 'living-room', 'messy-room']);
  assert.deepEqual([...neighbourAreas(house.viewpoints, 'front-yard')], ['hallway']);
});
