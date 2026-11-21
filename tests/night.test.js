// Haewol: the clock, the water, the lens, the saved state and the village layout.
// Spec: .kiro/specs/haewol

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forAll, gen } from './helpers/property.js';
import {
  LOOP_MS, START_SEC, MIDNIGHT_SEC, WATER_LOW, WATER_HIGH, clockAt, isMidnight, waterAt, wakeAt, nameCallsDue, timecode,
} from '../src/night/loop.js';
import { createLens, setRecording, tickLens, BATTERY_FULL, DRAIN_PER_SEC, MIN_TO_START } from '../src/night/lens.js';
import { emptySave, normalizeSave, withTaken, nextLoop, withNameChoice, nameDrawsHer, loadSave, storeSave } from '../src/night/save.js';
import { buildVillage, groundAt, STONE_TOP, SUNKEN, VILLAGE_ITEM_IDS } from '../src/night/village.js';
import { RADIUS } from '../src/systems/memory/walker.js';
import { REACH } from '../src/systems/memory/reach.js';

// ----- the clock (Requirement 2) -----

test('the night runs from 23:58:00 to midnight over LOOP_MS', () => {
  assert.equal(timecode(clockAt(0)), '23:58:00');
  assert.equal(timecode(clockAt(LOOP_MS / 2)), '23:59:00');
  assert.equal(timecode(clockAt(LOOP_MS)), '00:00:00');
  assert.equal(clockAt(LOOP_MS * 2), MIDNIGHT_SEC, 'the clock stops at midnight');
  assert.ok(!isMidnight(LOOP_MS - 1));
  assert.ok(isMidnight(LOOP_MS));
});

test('property: the clock never runs backward during a night', () => {
  forAll('clock order', { a: gen.float(0, LOOP_MS), b: gen.float(0, LOOP_MS) }, ({ a, b }) => {
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    assert.ok(clockAt(lo) <= clockAt(hi));
    assert.ok(clockAt(lo) >= START_SEC);
  });
});

test('the water rises from below the courtyard floor to just under the stones', () => {
  assert.equal(waterAt(0), WATER_LOW);
  assert.ok(Math.abs(waterAt(LOOP_MS) - WATER_HIGH) < 1e-9);
  assert.ok(WATER_LOW < SUNKEN, 'dry at 23:58');
  assert.ok(WATER_HIGH < STONE_TOP, 'the stones stay above the water');
  assert.ok(waterAt(LOOP_MS / 4) - waterAt(0) < waterAt(LOOP_MS) - waterAt((LOOP_MS * 3) / 4), 'slow at first');
});

test('property: the water only rises', () => {
  forAll('water rises', { a: gen.float(0, LOOP_MS), b: gen.float(0, LOOP_MS) }, ({ a, b }) => {
    const [lo, hi] = a <= b ? [a, b] : [b, a];
    assert.ok(waterAt(lo) <= waterAt(hi) + 1e-12);
  });
});

test('she wakes later on the first two nights, at once after that', () => {
  assert.ok(wakeAt(0) > 30000 && wakeAt(1) === wakeAt(0));
  assert.ok(wakeAt(2) < 10000);
});

test('the name is called twice a night', () => {
  assert.deepEqual(nameCallsDue(0), []);
  assert.deepEqual(nameCallsDue(LOOP_MS * 0.5), [0]);
  assert.deepEqual(nameCallsDue(LOOP_MS), [0, 1]);
});

// ----- the lens (Requirement 4) -----

test('recording drains the battery and stops when it is empty', () => {
  let l = setRecording(createLens(), true);
  assert.ok(l.recording);
  l = tickLens(l, 10);
  assert.ok(Math.abs(l.battery - (BATTERY_FULL - DRAIN_PER_SEC * 10)) < 1e-9);
  l = tickLens(l, 1000);
  assert.equal(l.battery, 0);
  assert.equal(l.recording, false);
  assert.equal(setRecording(l, true).recording, false, "an empty battery won't start");
  l = tickLens(l, (MIN_TO_START + 1) / 0.5);
  assert.ok(setRecording(l, true).recording, 'it recovers a little when resting');
});

test('property: the battery stays between 0 and full', () => {
  forAll('battery bounds', { sec: gen.float(0, 60), rec: gen.bool() }, ({ sec, rec }) => {
    const l = tickLens(setRecording(createLens(), rec), sec);
    assert.ok(l.battery >= 0 && l.battery <= BATTERY_FULL);
  });
});

// ----- saved state (Requirement 2.4, 8) -----

test('anything read back from storage becomes a well-formed save', () => {
  assert.deepEqual(normalizeSave(null), emptySave());
  const s = normalizeSave({ loops: -2, taken: ['a', 'a', 4], lullaby: 99, answered: 1.5, introSeen: 'yes' });
  assert.deepEqual(s, { ...emptySave(), taken: ['a'], lullaby: 7 });
});

test('things taken are kept across a rewind; each night starts fresh', () => {
  let s = withTaken(emptySave(), 'memory-boat');
  s = withNameChoice(s, 'loop0-0', true);
  s = nextLoop(s);
  assert.deepEqual(s.taken, ['memory-boat']);
  assert.equal(s.loops, 1);
  assert.deepEqual(s.calls, [], 'the name will be called again');
  assert.equal(s.answered, 1, 'but answering is remembered');
});

test('each call counts once; answering twice draws her', () => {
  let s = withNameChoice(emptySave(), 'loop0-0', true);
  s = withNameChoice(s, 'loop0-0', true);
  assert.equal(s.answered, 1);
  assert.ok(!nameDrawsHer(s));
  s = withNameChoice(s, 'loop0-1', true);
  assert.ok(nameDrawsHer(s));
  assert.equal(withNameChoice(emptySave(), 'x', false).refused, 1);
});

test('the save round-trips through storage, and broken storage is survivable', () => {
  const mem = new Map();
  const storage = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const s = withTaken(emptySave(), 'note-water');
  storeSave(s, storage);
  assert.deepEqual(loadSave(storage), s);
  const broken = { getItem: () => { throw new Error('no'); }, setItem: () => { throw new Error('no'); } };
  assert.deepEqual(loadSave(broken), emptySave());
  assert.doesNotThrow(() => storeSave(s, broken));
});

// ----- the village (Requirements 3, 6.1) -----

const village = buildVillage();
const overlaps = (p, b, r = RADIUS) => {
  const cx = Math.max(b.min[0], Math.min(p[0], b.max[0]));
  const cz = Math.max(b.min[1], Math.min(p[1], b.max[1]));
  return (p[0] - cx) ** 2 + (p[1] - cz) ** 2 < r * r - 1e-9;
};
const blocking = village.colliders.concat(village.parts.filter((p) => p.collider).map((p) => p.collider));

test('the start, the route, the hiding exit and Sae are free to stand on', () => {
  const spots = [village.start.pos, ...village.route, ...village.hides.map((h) => h.exit.pos), village.sae.pos];
  for (const p of spots) for (const b of village.colliders) assert.ok(!overlaps(p, b), `${p} overlaps ${JSON.stringify(b)}`);
});

test('the entry house is safe and the door shuts it', () => {
  const s = village.safe;
  const inside = (p) => p[0] > s.min[0] && p[0] < s.max[0] && p[1] > s.min[1] && p[1] < s.max[1];
  assert.ok(inside(village.start.pos));
  for (const p of village.route) assert.ok(!inside(p), 'her route never enters it');
  const door = village.parts.find((p) => p.id === 'entry-door');
  assert.ok(door.collider && !door.needs);
});

test('every stepping stone is above the highest water and none sits in a wall', () => {
  for (const st of village.stones) {
    assert.equal(groundAt(st[0], st[1], village.stones).y, STONE_TOP);
    assert.ok(STONE_TOP > WATER_HIGH);
    for (const b of blocking) assert.ok(!overlaps(st, b, 0.05), `stone ${st} is inside ${JSON.stringify(b)}`);
  }
});

test('the stones lead to every door off the courtyard', () => {
  const doors = { 'yeonhwa-door': [-11.5, -5], 'wol-door': [11.5, -3], 'school-door': [-5, -15.5], 'hill-gate': [9, -15.5] };
  for (const [id, p] of Object.entries(doors)) {
    assert.ok(village.parts.some((x) => x.id === id), id);
    const near = Math.min(...village.stones.map((s) => Math.hypot(s[0] - p[0], s[1] - p[1])));
    assert.ok(near < 2.2, `${id}: the nearest stone is ${near.toFixed(1)} m away`);
  }
  // From the entry door to the well, no gap is wider than a step.
  const path = village.stones.filter((s) => s[0] === 0 && s[1] > -3).sort((a, b) => b[1] - a[1]);
  for (let i = 1; i < path.length; i++) assert.ok(path[i - 1][1] - path[i][1] < 1.3);
});

test('the items are the paper boat and the note, and each can be reached', () => {
  assert.deepEqual(village.items.map((i) => i.id).sort(), [...VILLAGE_ITEM_IDS].sort());
  const boat = village.items.find((i) => i.id === 'memory-boat');
  assert.equal(boat.kind, 'memory');
  assert.ok(boat.flashback.length >= 3);
  for (const it of village.items) {
    let ok = false;
    for (let dx = -2; dx <= 2 && !ok; dx += 0.1) {
      for (let dz = -2; dz <= 2 && !ok; dz += 0.1) {
        const p = [it.pos[0] + dx, it.pos[2] + dz];
        if (village.colliders.some((b) => overlaps(p, b))) continue;
        const eye = [p[0], 1.6 + groundAt(p[0], p[1], village.stones).y, p[1]];
        if (Math.hypot(...it.pos.map((v, i) => v - eye[i])) < REACH - 0.15) ok = true;
      }
    }
    assert.ok(ok, `${it.id} is out of reach`);
  }
});

test('the words follow the tone rules', () => {
  const words = [
    ...Object.values(village.lines), ...village.nameCalls, ...village.readables.flatMap((r) => r.lines),
    ...village.items.flatMap((i) => [i.text, ...(i.flashback ?? [])]), ...village.parts.map((p) => p.lockedText ?? ''),
  ].join(' ').toLowerCase();
  for (const w of ['blood', 'gore', 'kill', 'dead body', 'corpse', 'drown', 'murder']) assert.ok(!words.includes(w), w);
});

// ----- Yeonhwa's house (Requirement 6.2) -----

test("her house: three memories, the rite, and the key to Sae's room", () => {
  const ids = ['memory-tape', 'memory-ribbon', 'memory-telegram', 'note-rite', 'key-sae'];
  for (const id of ids) assert.ok(village.items.some((i) => i.id === id), id);
  const mem = village.items.filter((i) => i.kind === 'memory' && i.id !== 'memory-boat');
  assert.equal(mem.length, 3);
  for (const m of mem) assert.ok(m.flashback.length >= 3, m.id);
  // The key is hidden in the rice jar, and opens Sae's door; her ribbon is behind it.
  assert.equal(village.items.find((i) => i.id === 'key-sae').inside, 'rice-jar');
  assert.equal(village.parts.find((p) => p.id === 'sae-door').needs, 'key-sae');
  assert.ok(village.parts.find((p) => p.id === 'sae-door').collider);
  const ribbon = village.items.find((i) => i.id === 'memory-ribbon');
  assert.ok(ribbon.pos[0] < -18 && ribbon.pos[2] < -4 && ribbon.pos[2] > -9, "the ribbon is in Sae's room");
});

test('her house is an area where she is strongest, with her own route', () => {
  const a = village.areas.find((x) => x.id === 'yeonhwa');
  assert.ok(a.indoor && a.strong && a.route.length >= 4);
  const inside = (p) => p[0] > a.min[0] && p[0] < a.max[0] && p[1] > a.min[1] && p[1] < a.max[1];
  for (const p of a.route) assert.ok(inside(p), `${p} is in her house`);
});

test('property: every route can be walked without passing through anything', () => {
  // She moves in a straight line between waypoints, pushed out of boxes; sample each leg.
  for (const r of [village.route, ...village.areas.map((a) => a.route)]) {
    r.forEach((p, i) => {
      const q = r[(i + 1) % r.length];
      for (let t = 0; t <= 1; t += 0.05) {
        const s = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
        for (const b of village.colliders) assert.ok(!overlaps(s, b, RADIUS * 0.9), `leg ${p} -> ${q} hits ${JSON.stringify(b)} at ${s}`);
      }
    });
  }
});

test('the hiding places in her house look out from just outside their doors', () => {
  for (const id of ['cupboard', 'wardrobe']) {
    const h = village.hides.find((x) => x.id === id);
    assert.ok(h, id);
    for (const b of village.colliders) assert.ok(!overlaps(h.exit.pos, b), `${id} exit`);
    // The view point is outside the furniture's footprint (or the closed front would fill the screen).
    const inBox = village.colliders.some((b) => h.view.pos[0] > b.min[0] && h.view.pos[0] < b.max[0] && h.view.pos[2] > b.min[1] && h.view.pos[2] < b.max[1]);
    assert.ok(!inBox, `${id} view is inside something`);
  }
});
