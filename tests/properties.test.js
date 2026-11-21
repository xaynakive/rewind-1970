// Property-based tests: the rules from the specs, checked over hundreds of
// generated inputs instead of a few hand-picked ones. Helper: tests/helpers/property.js

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { forAll, gen } from './helpers/property.js';
import { decayLevel, decayStage, MAX_DECAY } from '../src/systems/decay/decay.js';
import { driftWords, tokenize, MAX_DRIFT_SHARE } from '../src/systems/decay/drift.js';
import { bootLines, BOOT_SCALE, BOOT_MARGIN } from '../src/systems/cold-open/coldOpen.js';
import { hasGlyph, textWidth } from '../src/render/bitmapFont.js';
import { chooseSpot, occupancyOf, SPOTS } from '../src/systems/tapes/placement.js';
import { normalizeProgress, checkAnswers, QUESTIONS, revealOf, HOUSE_TAPES } from '../src/systems/mystery/mystery.js';

const DAY = 86_400_000;

// ----- decay (spec: decay, Requirement 1) -----

test('property: decay always stays between 0 and MAX_DECAY (0.85)', () => {
  forAll('decay bounds', {
    viewed: gen.float(0, 4e12),
    now: gen.float(0, 4e12),
    scale: gen.pick([1, 1440, 0.5, 100]),
  }, ({ viewed, now, scale }) => {
    const d = decayLevel(viewed, now, scale);
    assert.ok(Number.isFinite(d));
    assert.ok(d >= 0 && d <= MAX_DECAY, `decay ${d}`);
  });
});

test('property: decay never goes down while a tape is left alone', () => {
  forAll('decay monotonic', {
    viewed: gen.float(0, 2e12),
    a: gen.float(0, 60),
    b: gen.float(0, 60),
  }, ({ viewed, a, b }) => {
    const [early, late] = a < b ? [a, b] : [b, a];
    assert.ok(decayLevel(viewed, viewed + early * DAY) <= decayLevel(viewed, viewed + late * DAY));
  });
});

test('property: viewing a tape (or a clock set backwards) means no decay', () => {
  forAll('decay grace', {
    viewed: gen.float(0, 2e12),
    back: gen.float(0, 1e11),
  }, ({ viewed, back }) => {
    assert.equal(decayLevel(viewed, viewed), 0);
    assert.equal(decayLevel(viewed, viewed - back), 0);
    assert.equal(decayStage(decayLevel(viewed, viewed)), 'clean');
  });
});

// ----- drift (spec: decay, Requirements 2.1, 3.2: the memory itself is never changed) -----

test('property: drift never changes the words, only where they sit', () => {
  forAll('drift keeps text', {
    text: gen.text(),
    seed: gen.int(0, 2 ** 31),
    level: gen.float(0, MAX_DECAY),
  }, ({ text, seed, level }) => {
    const out = driftWords(text, seed, level);
    assert.equal(out.map((w) => w.text).join(''), text);
  });
});

test('property: at most 1 in 5 words drift, and a clean tape has none', () => {
  forAll('drift share', {
    text: gen.text(),
    seed: gen.int(0, 2 ** 31),
    level: gen.float(0, MAX_DECAY),
  }, ({ text, seed, level }) => {
    const words = tokenize(text).filter((t) => /\S/.test(t)).length;
    const moved = driftWords(text, seed, level).filter((w) => w.dx !== 0 || w.dy !== 0 || w.fade !== 0).length;
    assert.ok(moved <= Math.floor(words * MAX_DRIFT_SHARE), `${moved} of ${words}`);
    assert.ok(driftWords(text, seed, 0).every((w) => w.dx === 0 && w.dy === 0 && w.fade === 0));
  });
});

test('property: damage only accumulates (a word that drifted keeps drifting as decay grows)', () => {
  forAll('drift accumulates', {
    text: gen.text(),
    seed: gen.int(0, 2 ** 31),
    a: gen.float(0, MAX_DECAY),
    b: gen.float(0, MAX_DECAY),
  }, ({ text, seed, a, b }) => {
    const [low, high] = a < b ? [a, b] : [b, a];
    const lo = driftWords(text, seed, low);
    const hi = driftWords(text, seed, high);
    lo.forEach((w, i) => {
      if (w.fade > 0) assert.ok(hi[i].fade > 0, `word ${i} recovered`);
    });
  });
});

// ----- cold open (spec: cold-open: the boot screen fits and only uses drawn glyphs) -----

test('property: boot lines fit the 320 px screen for any tape count', () => {
  forAll('boot fits', { found: gen.int(0, 100_000) }, ({ found }) => {
    for (const line of bootLines(found)) {
      assert.ok(textWidth(line, BOOT_SCALE) <= 320 - 2 * BOOT_MARGIN, line);
      for (const ch of line) assert.ok(hasGlyph(ch), `no glyph for "${ch}"`);
    }
  });
});

// ----- placement (spec: tapes: tapes spread out before they stack) -----

test('property: a new tape never stacks while an empty spot is left', () => {
  forAll('placement spreads', {
    ids: gen.array(gen.int(0, 1e9), 0, 25),
    next: gen.int(0, 1e9),
  }, ({ ids, next }) => {
    const tapes = [];
    for (const id of ids) tapes.push({ id: `t${id}`, spot: chooseSpot(`t${id}`, occupancyOf(tapes)) });
    const occ = occupancyOf(tapes);
    const spot = chooseSpot(`t${next}`, occ);
    assert.ok(SPOTS.some((s) => s.id === spot));
    const empty = SPOTS.filter((s) => !occ[s.id]).length;
    if (empty > 0) assert.ok(!occ[spot], `stacked on ${spot} with ${empty} empty spots`);
    const counts = SPOTS.map((s) => occ[s.id] ?? 0);
    assert.ok(Math.max(...counts) - Math.min(...counts) <= 1, `uneven piles ${counts}`);
  });
});

// ----- mystery (spec: mystery) -----

const junk = gen.pick([
  null, undefined, 0, 'mystery', [], {}, { found: 'house-1' }, { found: [1, null, 'house-2', 'house-2'] },
  { found: ['house-9'], rewound: {}, lightningSeen: 'yes', solved: 1 }, { solved: true, found: ['house-1'] },
]);

test('property: stored mystery progress is always read back well-formed', () => {
  forAll('progress normalized', { raw: junk }, ({ raw }) => {
    const p = normalizeProgress(raw);
    assert.ok(Array.isArray(p.found) && Array.isArray(p.rewound));
    assert.ok(p.found.every((id) => typeof id === 'string'));
    assert.equal(typeof p.lightningSeen, 'boolean');
    assert.equal(typeof p.solved, 'boolean');
    for (const t of HOUSE_TAPES) {
      assert.ok(['hidden', 'flash', 'shown'].includes(revealOf(t, { progress: p, pondNoticed: false, anyUserRewound: false })));
    }
  }, { runs: 50 });
});

test('property: exactly one set of answers solves the case', () => {
  forAll('one answer', {
    picks: (rand) => Object.fromEntries(QUESTIONS.map((q) => [q.id, Math.floor(rand() * q.options.length)])),
  }, ({ picks }) => {
    const right = QUESTIONS.every((q) => picks[q.id] === q.answer);
    assert.equal(checkAnswers(picks).ok, right);
  }, { runs: 200 });
});

test('property: a found house tape always stays shown', () => {
  forAll('found stays shown', {
    found: gen.array(gen.pick(HOUSE_TAPES.map((t) => t.id)), 0, 5),
    pond: gen.bool(),
    rewound: gen.bool(),
    lightning: gen.bool(),
  }, ({ found, pond, rewound, lightning }) => {
    const progress = normalizeProgress({ found, lightningSeen: lightning });
    for (const t of HOUSE_TAPES) {
      if (progress.found.includes(t.id)) assert.equal(revealOf(t, { progress, pondNoticed: pond, anyUserRewound: rewound }), 'shown');
    }
  });
});
