// Memories: walking, reaching, the presence, progress, and the layouts of the night market and the school.
// Spec: .kiro/specs/memories

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forAll, gen } from './helpers/property.js';
import {
  step, resolve, look, forwardOf, segmentClear, RADIUS, WALK_SPEED, SNEAK_SPEED, PITCH_LIMIT,
} from '../src/systems/memory/walker.js';
import { pick, rayBox, REACH } from '../src/systems/memory/reach.js';
import {
  createPresence, tickPresence, wake, resetAfterCatch, sees, HUNT_SPEED, SIGHT, SIGHT_LIT, LOSE_MS, SEARCH_MS, STARE_MS, CATCH,
} from '../src/systems/memory/presence.js';
import { normalizeMemories, withEntry, withoutOpened, countTaken, emptyMemory } from '../src/systems/memory/progress.js';
import { buildMarket, MARKET_ITEM_IDS, MARKET_NOTE_IDS } from '../src/systems/memory/market.js';
import { buildSchool, SCHOOL_ITEM_IDS } from '../src/systems/memory/school.js';

const box = (x0, z0, x1, z1, low = false) => ({ min: [x0, z0], max: [x1, z1], low });
const overlaps = (p, b, r = RADIUS) => {
  const cx = Math.max(b.min[0], Math.min(p[0], b.max[0]));
  const cz = Math.max(b.min[1], Math.min(p[1], b.max[1]));
  return (p[0] - cx) ** 2 + (p[1] - cz) ** 2 < r * r - 1e-9;
};

// ----- walking (Requirement 2) -----

test('yaw 0 looks down -z, and positive yaw turns right', () => {
  const f = forwardOf(0);
  assert.ok(Math.abs(f[0]) < 1e-9 && Math.abs(f[2] + 1) < 1e-9);
  assert.ok(forwardOf(Math.PI / 2)[0] > 0.99);
});

test('walking forward for a second covers the walking speed; sneaking covers half', () => {
  const w = { pos: [0, 0], yaw: 0, pitch: 0 };
  let a = w, b = w;
  for (let i = 0; i < 60; i++) {
    a = step(a, { forward: 1, strafe: 0 }, 1 / 60, []);
    b = step(b, { forward: 1, strafe: 0, sneak: true }, 1 / 60, []);
  }
  assert.ok(Math.abs(-a.pos[1] - WALK_SPEED) < 1e-6);
  assert.ok(Math.abs(-b.pos[1] - SNEAK_SPEED) < 1e-6);
});

test('diagonal input is not faster than straight input', () => {
  const w = step({ pos: [0, 0], yaw: 0, pitch: 0 }, { forward: 1, strafe: 1 }, 1, []);
  assert.ok(Math.hypot(...w.pos) <= WALK_SPEED + 1e-9);
});

test('walking into a wall slides along it instead of stopping dead or passing through', () => {
  const wall = box(-5, -1.1, 5, -1); // a wall across the path, 1 m ahead
  let w = { pos: [0, 0], yaw: 0.6, pitch: 0 };
  for (let i = 0; i < 120; i++) w = step(w, { forward: 1, strafe: 0 }, 1 / 60, [wall]);
  assert.ok(w.pos[1] > -1 + RADIUS - 1e-6 - 1e-3, `went through: ${w.pos}`);
  assert.ok(w.pos[0] > 1, 'slid sideways');
});

test('property: the walker never ends a step inside a box', () => {
  const boxes = [box(-1, -3, 1, -2), box(2, -1, 3, 1), box(-3, 1, -2, 1.5, true)];
  forAll('no overlap after a step', {
    x: gen.float(-4, 4), z: gen.float(-4, 4), yaw: gen.float(-Math.PI, Math.PI),
    f: gen.float(-1, 1), s: gen.float(-1, 1), dt: gen.float(0, 0.1),
  }, ({ x, z, yaw, f, s, dt }) => {
    const start = resolve([x, z], boxes);
    const w = step({ pos: start, yaw, pitch: 0 }, { forward: f, strafe: s }, dt, boxes);
    for (const b of boxes) assert.ok(!overlaps(w.pos, b, RADIUS - 1e-3), `inside ${JSON.stringify(b)} at ${w.pos}`);
  });
});

test('looking up and down stops at 70 degrees', () => {
  const w = look({ pos: [0, 0], yaw: 0, pitch: 0 }, 0, 10);
  assert.equal(w.pitch, PITCH_LIMIT);
  assert.equal(look(w, 0, -20).pitch, -PITCH_LIMIT);
});

test('line of sight: walls block it, low tables do not', () => {
  assert.equal(segmentClear([0, 0], [0, -5], [box(-1, -3, 1, -2)]), false);
  assert.equal(segmentClear([0, 0], [0, -5], [box(-1, -3, 1, -2, true)]), true);
  assert.equal(segmentClear([0, 0], [0, -5], [box(2, -3, 3, -2)]), true);
});

// ----- reaching (Requirement 3) -----

test('the centre ray picks the nearest thing in reach', () => {
  const t = [
    { id: 'far', min: [-0.2, 1.4, -2.0], max: [0.2, 1.8, -1.9] },
    { id: 'near', min: [-0.2, 1.4, -1.0], max: [0.2, 1.8, -0.9] },
  ];
  assert.equal(pick([0, 1.6, 0], [0, 0, -1], t), 'near');
});

test('nothing beyond reach is picked', () => {
  const t = [{ id: 'x', min: [-0.2, 1.4, -REACH - 0.5], max: [0.2, 1.8, -REACH - 0.4] }];
  assert.equal(pick([0, 1.6, 0], [0, 0, -1], t), null);
});

test('aim assist picks something close to the centre when the ray misses', () => {
  const t = [{ id: 'drawer', min: [0.1, 1.4, -1.1], max: [0.2, 1.5, -1.0] }]; // about 11 degrees off centre
  assert.equal(rayBox([0, 1.6, 0], [0, 0, -1], t[0].min, t[0].max), Infinity);
  assert.equal(pick([0, 1.6, 0], [0, 0, -1], t), 'drawer');
  // Far off to the side: not picked.
  assert.equal(pick([0, 1.6, 0], [0, 0, -1], [{ id: 'side', min: [1, 1.5, -1], max: [1.1, 1.6, -0.9] }]), null);
});

test("a box you're standing inside is never the target", () => {
  const t = [{ id: 'booth', min: [-1, 0, -1], max: [1, 2, 1] }, { id: 'note', min: [-0.1, 1.5, -0.7], max: [0.1, 1.7, -0.6] }];
  assert.equal(pick([0, 1.6, 0], [0, 0, -1], t), 'note');
});

// ----- the presence (Requirement 5) -----

const ROUTE = [[0, -10], [0, 0], [4, 0]];
const open = () => true;
const player = (pos, extra = {}) => ({ pos, hidden: false, light: false, loud: false, ...extra });
const tick = (s, p, opts = {}) => tickPresence(s, { dt: 0.1, now: 0, route: ROUTE, colliders: [], player: p, canSee: open, story: false, ...opts });

test('the presence sleeps until woken', () => {
  const s = createPresence(ROUTE);
  const r = tick(s, player([0, -9]));
  assert.equal(r.state.kind, 'dormant');
  assert.deepEqual(r.events, []);
});

test('it sees the user in front of it within 9 m (14 m with the flashlight), not behind it', () => {
  const s = { ...wake(createPresence(ROUTE), ROUTE, 0), facing: Math.PI }; // looking toward +z
  assert.equal(sees(s, player([0, -10 + SIGHT - 0.5]), open, 1), true);
  assert.equal(sees(s, player([0, -10 + SIGHT + 1]), open, 1), false);
  assert.equal(sees(s, player([0, -10 + SIGHT + 1], { light: true }), open, 1), true);
  assert.equal(sees(s, player([0, -10 + SIGHT_LIT + 1], { light: true }), open, 1), false);
  assert.equal(sees(s, player([0, -15]), open, 1), false, 'behind it');
  assert.equal(sees(s, player([0, -6]), () => false, 1), false, 'a wall in between');
});

test('a hidden user is not seen, unless it saw them hide', () => {
  const s = { ...wake(createPresence(ROUTE), ROUTE, 0), facing: Math.PI };
  assert.equal(sees(s, player([0, -7], { hidden: true }), open, 1), false);
  assert.equal(sees(s, player([0, -7], { hidden: true, seenHiding: true }), open, 1), true);
});

test('spotting starts a hunt; it moves slower than the user walks', () => {
  let s = { ...wake(createPresence(ROUTE), ROUTE, 0), facing: Math.PI };
  const r = tick(s, player([0, -4]));
  assert.equal(r.state.kind, 'hunt');
  assert.ok(r.events.includes('spotted'));
  assert.ok(HUNT_SPEED < WALK_SPEED);
  s = r.state;
  const moved = Math.hypot(s.pos[0] - 0, s.pos[1] + 10);
  assert.ok(moved <= HUNT_SPEED * 0.1 + 1e-9);
});

test('it searches after losing sight for 3 s, then patrols again', () => {
  let s = { ...wake(createPresence(ROUTE), ROUTE, 0), facing: Math.PI };
  s = tick(s, player([0, -4]), { now: 0 }).state;
  const blind = () => false;
  s = tick(s, player([0, -4]), { now: LOSE_MS - 100, canSee: blind }).state;
  assert.equal(s.kind, 'hunt');
  const r = tick(s, player([0, -4]), { now: LOSE_MS + 100, canSee: blind });
  assert.equal(r.state.kind, 'search');
  assert.ok(r.events.includes('lost'));
  s = tick(r.state, player([0, -4]), { now: LOSE_MS + 100 + SEARCH_MS + 100, canSee: blind }).state;
  assert.equal(s.kind, 'patrol');
});

test('reaching the user is a catch, and after a reset it gives them time', () => {
  let s = { ...wake(createPresence(ROUTE), ROUTE, 0), kind: 'hunt', facing: Math.PI, pos: [0, -1], lastSeen: [0, -1 + CATCH / 2], lastSeenAt: 0 };
  const r = tick(s, player([0, -1 + CATCH / 2]), { now: 10 });
  assert.ok(r.events.includes('caught'));
  s = resetAfterCatch(r.state, ROUTE, [0, -1], 10);
  assert.equal(s.kind, 'patrol');
  assert.equal(sees(s, player([s.pos[0], s.pos[1] + 1]), open, 20), false, 'blind right after a catch');
});

test('story mode: it never hunts; it stares, then fades away', () => {
  let s = { ...wake(createPresence(ROUTE), ROUTE, 0), facing: Math.PI };
  let r = tick(s, player([0, -5]), { story: true, now: 0 });
  assert.equal(r.state.kind, 'stare');
  s = r.state;
  for (let t = 100; t < STARE_MS; t += 500) {
    r = tick(s, player([0, -5]), { story: true, now: t });
    assert.notEqual(r.state.kind, 'hunt');
    s = r.state;
  }
  r = tick(s, player([0, -5]), { story: true, now: STARE_MS + 10 });
  assert.equal(r.state.kind, 'gone');
  assert.ok(r.events.includes('faded'));
});

test('property: in story mode nothing the user does leads to a catch', () => {
  forAll('story never catches', {
    px: gen.float(-3, 5), pz: gen.float(-11, 2), ticks: gen.int(1, 200), light: gen.bool(),
  }, ({ px, pz, ticks, light }) => {
    let s = wake(createPresence(ROUTE), ROUTE, 0);
    for (let i = 0; i < ticks; i++) {
      const r = tick(s, player([px, pz], { light, loud: true }), { story: true, now: i * 100 });
      assert.ok(!r.events.includes('caught'));
      assert.notEqual(r.state.kind, 'hunt');
      s = r.state;
    }
  }, { runs: 120 });
});

// ----- progress (Requirement 1.5) -----

test('stored memory progress is read back well-formed', () => {
  const p = normalizeMemories({ market: { taken: ['a', 'a', 3], opened: 'x', checkpoint: 9, done: 'yes' } }, ['market', 'school']);
  assert.deepEqual(p.market, { taken: ['a'], opened: [], checkpoint: 'entrance', done: false });
  assert.deepEqual(p.school, emptyMemory());
  assert.deepEqual(normalizeMemories(null, ['market']).market, emptyMemory());
});

test('taking and opening are recorded once', () => {
  let m = emptyMemory();
  m = withEntry(withEntry(m, 'taken', 'key'), 'taken', 'key');
  assert.deepEqual(m.taken, ['key']);
  m = withoutOpened(withEntry(m, 'opened', 'drawer'), 'drawer');
  assert.deepEqual(m.opened, []);
  assert.equal(countTaken(m, ['key', 'photo']), 1);
});

// ----- the night market (Requirement 6) -----

const market = buildMarket();
const blocking = (level) => level.colliders.concat(level.parts.filter((p) => p.collider).map((p) => p.collider));

test('the market holds four notes, the photo and the key, each in its own place', () => {
  assert.deepEqual(market.items.map((i) => i.id).sort(), [...MARKET_ITEM_IDS].sort());
  assert.equal(market.items.filter((i) => i.kind === 'note').length, 4);
  assert.deepEqual(market.items.filter((i) => i.kind === 'note').map((i) => i.id).sort(), [...MARKET_NOTE_IDS].sort());
  const containers = market.items.map((i) => i.inside ?? i.needsOpen ?? i.id);
  assert.equal(new Set(containers).size, containers.length);
  for (const it of market.items) {
    const c = it.inside ?? it.needsOpen;
    if (c) assert.ok(market.parts.some((p) => p.id === c), `${it.id} is in ${c}`);
  }
});

test('the start, every checkpoint and the presence route are free to stand on', () => {
  const cols = blocking(market);
  const spots = [market.start.pos, ...market.items.map((i) => i.checkpoint.pos), ...market.route];
  for (const p of spots) for (const b of cols) assert.ok(!overlaps(p, b), `${p} overlaps ${JSON.stringify(b)}`);
});

test('every item can be reached from where you would stand', () => {
  // From its checkpoint, walk to the nearest free point within reach of the item: one must exist.
  const cols = market.colliders;
  for (const it of market.items) {
    let ok = false;
    for (let dx = -2; dx <= 2 && !ok; dx += 0.1) {
      for (let dz = -2; dz <= 2 && !ok; dz += 0.1) {
        const p = [it.pos[0] + dx, it.pos[2] + dz];
        if (cols.some((b) => overlaps(p, b))) continue;
        const eye = [p[0], 1.6, p[1]];
        if (Math.hypot(...it.pos.map((v, i) => v - eye[i])) < REACH - 0.15) ok = true;
      }
    }
    assert.ok(ok, `${it.id} is out of reach`);
  }
});

test('the shutter needs the key and blocks the way until it opens', () => {
  const s = market.parts.find((p) => p.id === 'shutter');
  assert.equal(s.needs, 'key');
  assert.ok(s.collider);
  assert.ok(s.lockedText.length > 0);
  assert.ok(!segmentClear([0, -28], market.june.pos, blocking(market)), 'June is behind it');
});

test('her lines follow the tone rules', () => {
  const words = [...market.endLines, ...Object.values(market.lines), ...market.items.map((i) => i.text)].join(' ').toLowerCase();
  for (const w of ['blood', 'gore', 'kill', 'dead body', 'corpse']) assert.ok(!words.includes(w), w);
});

// ----- the school at night (Requirement 8) -----

const school = buildSchool();

test('the school holds four notes, the class photo and the keys, each in its own place', () => {
  assert.deepEqual(school.items.map((i) => i.id).sort(), [...SCHOOL_ITEM_IDS].sort());
  assert.equal(school.items.filter((i) => i.kind === 'note').length, 4);
  const containers = school.items.map((i) => i.inside ?? i.needsOpen ?? i.id);
  assert.equal(new Set(containers).size, containers.length);
  for (const it of school.items) {
    const c = it.inside ?? it.needsOpen;
    if (c) assert.ok(school.parts.some((p) => p.id === c), `${it.id} is in ${c}`);
  }
  // Only the note by the sink lies in the open.
  assert.deepEqual(school.items.filter((i) => !(i.inside ?? i.needsOpen)).map((i) => i.id), ['note-mirror']);
});

test('school: the start, checkpoints, route, hiding exits and June are free to stand on', () => {
  const cols = blocking(school);
  const spots = [school.start.pos, ...school.items.map((i) => i.checkpoint.pos), ...school.route,
    ...school.hides.map((h) => h.exit.pos), school.june.glimpse.pos, school.exitTrigger.pos];
  for (const p of spots) for (const b of cols) assert.ok(!overlaps(p, b), `${p} overlaps ${JSON.stringify(b)}`);
});

test('school: every item can be reached from where you would stand', () => {
  const cols = school.colliders;
  for (const it of school.items) {
    let ok = false;
    for (let dx = -2; dx <= 2 && !ok; dx += 0.1) {
      for (let dz = -2; dz <= 2 && !ok; dz += 0.1) {
        const p = [it.pos[0] + dx, it.pos[2] + dz];
        if (cols.some((b) => overlaps(p, b))) continue;
        const eye = [p[0], 1.6, p[1]];
        if (Math.hypot(...it.pos.map((v, i) => v - eye[i])) < REACH - 0.15) ok = true;
      }
    }
    assert.ok(ok, `${it.id} is out of reach`);
  }
});

test('the stair door needs the keys and blocks the way to June until it opens', () => {
  const d = school.parts.find((p) => p.id === school.exitPart);
  assert.equal(d.id, 'stair-door');
  assert.equal(d.needs, 'keys');
  assert.ok(d.oneWay && d.collider && d.lockedText.length > 0 && d.openLine.length > 0);
  assert.ok(!segmentClear([0, -28], school.exitTrigger.pos, blocking(school)), 'the stairs are behind it');
  assert.ok(segmentClear([0, -28], school.exitTrigger.pos, school.colliders), 'and open once it opens');
});

test('school: two lockers and a stall to hide in', () => {
  assert.deepEqual(school.hides.map((h) => h.id).sort(), ['locker-14', 'locker-3', 'stall']);
  assert.equal(school.hides.filter((h) => h.overlay === 'slats').length, 2);
});

test('school: the words follow the tone rules', () => {
  const words = [...school.endLines, ...Object.values(school.lines), ...school.items.map((i) => i.text),
    ...school.parts.map((p) => `${p.lockedText ?? ''} ${p.openLine ?? ''}`)].join(' ').toLowerCase();
  for (const w of ['blood', 'gore', 'kill', 'dead body', 'corpse']) assert.ok(!words.includes(w), w);
});
