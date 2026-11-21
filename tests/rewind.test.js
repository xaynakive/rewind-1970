import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  startRewind, tickRewind, releaseRewind, rewindProgress, applyRewind, REWIND_MS,
} from '../src/systems/tapes/rewind.js';

test('holding for 2 seconds completes the rewind', () => {
  const s = startRewind('t1', 1000);
  assert.equal(tickRewind(s, 1000 + REWIND_MS - 1).kind, 'holding');
  assert.deepEqual(tickRewind(s, 1000 + REWIND_MS), { kind: 'complete', tapeId: 't1' });
});

test('releasing early cancels and reports progress', () => {
  const r = releaseRewind(startRewind('t1', 0), 500);
  assert.equal(r.kind, 'cancelled');
  assert.equal(r.progress, 0.25);
});

test('releasing after 2 seconds still completes', () => {
  assert.equal(releaseRewind(startRewind('t1', 0), REWIND_MS + 50).kind, 'complete');
});

test('progress is clamped to 0..1', () => {
  const s = startRewind('t1', 100);
  assert.equal(rewindProgress(s, 0), 0);
  assert.equal(rewindProgress(s, 100 + REWIND_MS * 3), 1);
});

test('a completed rewind restores lastViewedAt and counts the rewind, without touching the text', () => {
  const tape = { id: 't1', text: 'keep me', lastViewedAt: 1, rewindCount: 2 };
  const out = applyRewind(tape, 5000);
  assert.deepEqual(out, { id: 't1', text: 'keep me', lastViewedAt: 5000, stackedAt: 5000, rewindCount: 3 });
  assert.equal(tape.lastViewedAt, 1, 'input not mutated');
});
