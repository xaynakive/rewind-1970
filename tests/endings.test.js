import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isUnlocked, healthyShare, chooseEnding, pickFragments, buildFinalTape, finaleTimeline,
  segmentAt, segmentStart, lineMs, FINAL_LABEL, MAX_FRAGMENTS,
} from '../src/systems/endings/endings.js';

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 30);
const TEXTS = [
  'we built a snowman with coal eyes and you said it looked lonely, so we built it a dog.',
  'grandma hummed while she cooked. the radio was always a little out of tune.',
  'the summer grandpa taught me to skip stones. seven skips.',
  'we swam until the stars came out.',
  'my first bike was red and too big for me.',
  'the night the power went out we told stories by candle light.',
  'dad sang in the car, badly, every single time.',
];
/** n tapes; the first `fresh` were viewed today, the rest 40 days ago. */
function house(n, fresh, extra = {}) {
  return Array.from({ length: n }, (_, i) => ({
    id: `t${i}`, label: `tape ${i}`, text: TEXTS[i % TEXTS.length],
    createdAt: NOW - (100 - i) * DAY, lastViewedAt: i < fresh ? NOW : NOW - 40 * DAY,
    found: true, rewindCount: 0, ...extra,
  }));
}

test('unlocks at 5 tapes once every tape has been found', () => {
  assert.equal(isUnlocked(house(4, 4)), false);
  assert.equal(isUnlocked(house(5, 5)), true);
  const t = house(5, 5);
  t[2].found = false;
  assert.equal(isUnlocked(t), false);
});

test('healthy means clean or worn', () => {
  assert.equal(healthyShare(house(5, 3), NOW), 0.6);
  assert.equal(healthyShare([], NOW), 0);
});

test('endings, checked in order, at their exact boundaries', () => {
  assert.equal(chooseEnding(house(5, 4), NOW, true), 'still-water');  // 80% + pond
  assert.equal(chooseEnding(house(5, 4), NOW, false), 'kept');        // 80%
  assert.equal(chooseEnding(house(5, 5), NOW, false), 'kept');
  assert.equal(chooseEnding(house(5, 2), NOW, false), 'tracking');    // 40% is not "fewer than 40%"
  assert.equal(chooseEnding(house(5, 2), NOW, true), 'tracking');     // the pond alone isn't enough
  assert.equal(chooseEnding(house(10, 3), NOW, false), 'static');     // 30%
  assert.equal(chooseEnding(house(5, 0), NOW, false), 'static');
});

test('demo time counts too', () => {
  const t = house(5, 5).map((x) => ({ ...x, lastViewedAt: NOW - 40 * 60_000 })); // 40 minutes ago
  assert.equal(chooseEnding(t, NOW, false, 1), 'kept');
  assert.equal(chooseEnding(t, NOW, false, 1440), 'static');
});

test('fragments come only from the user\'s own words, 3-6 words each, at most 5', () => {
  const tapes = house(7, 7);
  const frags = pickFragments(tapes);
  assert.equal(frags.length, MAX_FRAGMENTS);
  const sources = tapes.map((t) => t.text.replace(/\s+/g, ' '));
  for (const f of frags) {
    const n = f.split(' ').length;
    assert.ok(n >= 3 && n <= 6, `"${f}" has ${n} words`);
    assert.ok(sources.some((s) => s.includes(f)), `"${f}" is not from any tape`);
  }
});

test('fragments longer than 3 words never end on a little word like "a" or "the"', () => {
  for (let seed = 0; seed < 40; seed++) {
    const tapes = house(7, 7).map((t) => ({ ...t, id: `s${seed}-${t.id}` }));
    for (const f of pickFragments(tapes)) {
      const words = f.split(' ');
      if (words.length > 3) assert.ok(!/^(a|an|the|and|of|to|so|with)$/i.test(words.at(-1)), `"${f}"`);
    }
  }
});

test('the same house always plays the same fragments', () => {
  assert.deepEqual(pickFragments(house(7, 7)), pickFragments(house(7, 7)));
});

test('the final tape: the first recording, the most rewound tape, and the ending\'s tone', () => {
  const tapes = house(6, 6);
  tapes[3].rewindCount = 4;
  tapes[1].rewindCount = 2;
  const s = buildFinalTape(tapes, 'kept', { formatDate: (ms) => `date:${ms}` });
  assert.equal(s.label, FINAL_LABEL);
  assert.equal(s.lines[0], `date:${tapes[0].createdAt}`);
  assert.ok(s.lines.includes('you kept coming back to "tape 3".'));
  assert.equal(s.lines.at(-1), 'the house will keep them too.');
  assert.equal(s.decay, 0.1);
  assert.ok(!s.lines.some((l) => /1970|vhs/i.test(l)), 'never explains the date');
});

test('each ending sounds different, and static is the most damaged', () => {
  const tapes = house(5, 5);
  const ends = ['still-water', 'kept', 'tracking', 'static'].map((e) => buildFinalTape(tapes, e, { formatDate: String }));
  assert.equal(new Set(ends.map((s) => s.lines.at(-1))).size, 4);
  assert.ok(ends[3].decay > ends[2].decay && ends[2].decay > ends[1].decay);
  assert.ok(buildFinalTape(tapes, 'kept').lines.includes('you never rewound a single one.'));
});

test('timeline: push in, every line, the view from the tv, the end card, then home', () => {
  const s = buildFinalTape(house(5, 5), 'tracking', { formatDate: String });
  const tl = finaleTimeline(s);
  assert.equal(tl[0].kind, 'push');
  assert.deepEqual(tl.slice(-3).map((x) => x.kind), ['pov', 'card', 'return']);
  assert.deepEqual(tl.filter((x) => x.kind === 'line').map((x) => x.text), s.lines);
  for (let i = 1; i < tl.length; i++) assert.equal(tl[i].start, tl[i - 1].start + tl[i - 1].ms);
  assert.equal(segmentAt(tl, 0).kind, 'push');
  const end = tl.at(-1).start + tl.at(-1).ms;
  assert.equal(segmentAt(tl, end - 1).kind, 'return');
  assert.equal(segmentAt(tl, end), null);
  assert.equal(segmentAt(tl, segmentStart(tl, 'card')).kind, 'card');
});

test('lines stay up long enough to read, but never more than 6 s', () => {
  assert.ok(lineMs('you kept them.') >= 2000);
  assert.equal(lineMs('x'.repeat(500)), 6000);
});
