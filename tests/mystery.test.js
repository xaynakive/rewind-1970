import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  HOUSE_TAPES, QUESTIONS, emptyProgress, normalizeProgress, revealOf, allFound, checkAnswers, asTape, withMark,
} from '../src/systems/mystery/mystery.js';
import { SPOTS } from '../src/systems/tapes/placement.js';
import { buildHouse } from '../src/systems/house/areas.js';
import { chooseEnding, buildFinalTape } from '../src/systems/endings/endings.js';
import { perspective, lookAt, multiply, transformPoint } from '../src/render/math.js';
import { MAX_DECAY } from '../src/systems/decay/decay.js';

const house = buildHouse();
const proj = perspective((58 * Math.PI) / 180, 4 / 3, 0.1, 70);
const ctx = (over = {}) => ({ progress: emptyProgress(), pondNoticed: false, anyUserRewound: false, ...over });
const allText = HOUSE_TAPES.map((t) => `${t.text} ${t.extra}`).join(' ').toLowerCase();

test('five house tapes, unique ids and spots, none of them a user spot', () => {
  assert.equal(HOUSE_TAPES.length, 5);
  assert.equal(new Set(HOUSE_TAPES.map((t) => t.id)).size, 5);
  assert.equal(new Set(HOUSE_TAPES.map((t) => t.spot)).size, 5);
  const userSpots = new Set(SPOTS.map((s) => s.id));
  for (const t of HOUSE_TAPES) {
    assert.ok(!userSpots.has(t.spot), `${t.spot} is a user spot`);
    assert.ok(t.decay > 0 && t.decay <= MAX_DECAY);
    assert.ok(t.extra.length > 0);
  }
});

test('every house spot is in exactly one area and on screen from one of its viewpoints', () => {
  for (const t of HOUSE_TAPES) {
    const owners = [...house.areas.values()].filter((a) => a.spots[t.spot]);
    assert.equal(owners.length, 1, `${t.spot}`);
    const spot = owners[0].spots[t.spot];
    const seen = [...house.viewpoints.values()].filter((v) => v.area === owners[0].id).some((v) => {
      const [x, y, , w] = transformPoint(multiply(proj, lookAt(v.position, v.lookAt)), spot.pos);
      return w > 0.1 && Math.abs(x / w) < 0.85 && Math.abs(y / w) < 0.85;
    });
    assert.ok(seen, `${t.spot} can't be seen`);
  }
});

test('reveal rules', () => {
  const [mail, grave, pond, wardrobe, attic] = HOUSE_TAPES;
  assert.equal(revealOf(mail, ctx()), 'shown');
  assert.equal(revealOf(grave, ctx()), 'flash');
  assert.equal(revealOf(grave, ctx({ progress: { ...emptyProgress(), lightningSeen: true } })), 'shown');
  assert.equal(revealOf(pond, ctx()), 'hidden');
  assert.equal(revealOf(pond, ctx({ pondNoticed: true })), 'shown');
  assert.equal(revealOf(wardrobe, ctx()), 'hidden');
  assert.equal(revealOf(wardrobe, ctx({ anyUserRewound: true })), 'shown');
  const fourFound = { ...emptyProgress(), found: ['house-1', 'house-2', 'house-3'] };
  assert.equal(revealOf(attic, ctx({ progress: fourFound })), 'hidden');
  assert.equal(revealOf(attic, ctx({ progress: withMark(fourFound, 'found', 'house-4') })), 'shown');
});

test('a found tape stays shown, whatever else changes', () => {
  const p = withMark(emptyProgress(), 'found', 'house-3');
  assert.equal(revealOf(HOUSE_TAPES[2], ctx({ progress: p, pondNoticed: false })), 'shown');
});

test('all found, and stored progress is cleaned up', () => {
  let p = emptyProgress();
  for (const t of HOUSE_TAPES) { assert.equal(allFound(p), false); p = withMark(p, 'found', t.id); }
  assert.equal(allFound(p), true);
  assert.deepEqual(normalizeProgress({ found: ['house-1', 'house-1', 'nope'], solved: 'yes' }),
    { found: ['house-1'], rewound: [], lightningSeen: false, solved: false });
  assert.deepEqual(normalizeProgress(null), emptyProgress());
});

test('rewinding reveals the extra line and clears the damage', () => {
  const t = HOUSE_TAPES[0];
  assert.equal(asTape(t, emptyProgress()).text, t.text);
  const r = asTape(t, withMark(emptyProgress(), 'rewound', t.id));
  assert.ok(r.text.endsWith(t.extra));
  assert.equal(r.decay, 0);
  assert.equal(r.house, true);
});

test('each extra line except the last points to where the next tape is', () => {
  const pointers = [/lightning/, /water/, /bedroom/, /ladder/];
  pointers.forEach((re, i) => assert.match(HOUSE_TAPES[i].extra, re));
});

test('the case: right answers pass, any wrong answer fails, and the answers are in the tapes', () => {
  const right = Object.fromEntries(QUESTIONS.map((q) => [q.id, q.answer]));
  assert.equal(checkAnswers(right).ok, true);
  for (const q of QUESTIONS) {
    assert.equal(checkAnswers({ ...right, [q.id]: (q.answer + 1) % q.options.length }).ok, false);
  }
  assert.equal(checkAnswers({}).ok, false);
  for (const key of ['edith', 'water', 'remember', 'forget alone']) assert.ok(allText.includes(key), key);
});

test('tone: spooky, never gore, and the date is never explained', () => {
  for (const word of ['blood', 'kill', 'murder', 'dead', 'corpse', 'gore', '1970', 'vhs']) {
    assert.ok(!allText.includes(word), `contains "${word}"`);
  }
});

test('the "found" ending: solved and at least 40% healthy, checked first', () => {
  const DAY = 86_400_000, NOW = Date.UTC(2026, 10, 30);
  const tapes = (fresh) => Array.from({ length: 5 }, (_, i) => ({
    id: `t${i}`, label: `t${i}`, text: 'a memory of the lake at night', createdAt: NOW - 50 * DAY + i,
    lastViewedAt: i < fresh ? NOW : NOW - 40 * DAY, found: true, rewindCount: 0,
  }));
  assert.equal(chooseEnding(tapes(5), NOW, true, 1, true), 'found');
  assert.equal(chooseEnding(tapes(2), NOW, false, 1, true), 'found');
  assert.equal(chooseEnding(tapes(1), NOW, false, 1, true), 'static');
  assert.equal(chooseEnding(tapes(5), NOW, true, 1, false), 'still-water');
  const s = buildFinalTape(tapes(5), 'found', { formatDate: String });
  assert.equal(s.lines.at(-1), "she's on a tape, where she wanted to be.");
});
