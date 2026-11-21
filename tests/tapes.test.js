import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTape, MAX_TEXT, MAX_LABEL } from '../src/systems/tapes/model.js';
import { chooseSpot, occupancyOf, SPOTS } from '../src/systems/tapes/placement.js';
import { HINTS } from '../src/systems/tapes/hints.js';

const ctx = { id: 'tape-1', now: 1000, spot: 'pond' };

test('creates a tape with timestamps and defaults', () => {
  const r = createTape({ text: 'the night the power went out', label: 'blackout' }, ctx);
  assert.equal(r.ok, true);
  assert.deepEqual(r.tape, {
    id: 'tape-1', label: 'blackout', text: 'the night the power went out',
    createdAt: 1000, lastViewedAt: 1000, spot: 'pond', found: false, rewindCount: 0,
  });
});

test('empty or whitespace text is rejected', () => {
  assert.deepEqual(createTape({ text: '' }, ctx), { ok: false, reason: 'empty' });
  assert.deepEqual(createTape({ text: '  \n\t ' }, ctx), { ok: false, reason: 'empty' });
});

test('text over the limit is rejected, text at the limit is accepted', () => {
  assert.equal(createTape({ text: 'a'.repeat(MAX_TEXT + 1) }, ctx).ok, false);
  assert.equal(createTape({ text: 'a'.repeat(MAX_TEXT) }, ctx).ok, true);
});

test('empty label falls back to the first 24 characters of the text', () => {
  const r = createTape({ text: '  grandma\'s kitchen   smelled of cardamom ', label: '  ' }, ctx);
  assert.equal(r.tape.label, "grandma's kitchen smelle");
  assert.equal(r.tape.label.length, MAX_LABEL);
});

test('long labels are cut to 24 characters', () => {
  const r = createTape({ text: 'x', label: 'a'.repeat(40) }, ctx);
  assert.equal(r.tape.label.length, MAX_LABEL);
});

test('the same tape id always goes to the same spot', () => {
  assert.equal(chooseSpot('abc'), chooseSpot('abc'));
  assert.ok(SPOTS.some((s) => s.id === chooseSpot('abc')));
});

test('a new tape goes to a free spot when one exists', () => {
  const occ = {};
  for (const s of SPOTS.slice(0, SPOTS.length - 1)) occ[s.id] = 1;
  assert.equal(chooseSpot('anything', occ), SPOTS[SPOTS.length - 1].id);
});

test('when every spot is full, the tape stacks on the least occupied spot', () => {
  const occ = Object.fromEntries(SPOTS.map((s) => [s.id, 3]));
  occ['wardrobe'] = 2;
  assert.equal(chooseSpot('anything', occ), 'wardrobe');
});

test('ten tapes fill ten different spots', () => {
  const tapes = [];
  for (let i = 0; i < SPOTS.length; i++) {
    tapes.push({ spot: chooseSpot(`tape-${i}`, occupancyOf(tapes)) });
  }
  assert.equal(new Set(tapes.map((t) => t.spot)).size, SPOTS.length);
});

test('every spot has a hint, and no hint names its spot', () => {
  for (const s of SPOTS) {
    assert.ok(HINTS[s.id], `missing hint for ${s.id}`);
    assert.ok(!HINTS[s.id].includes(s.id.split('-')[0]), `hint gives away ${s.id}`);
  }
});
