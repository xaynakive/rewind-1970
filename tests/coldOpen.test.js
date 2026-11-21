import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bootLines, BOOT_SCALE, BOOT_MARGIN } from '../src/systems/cold-open/coldOpen.js';
import { hasGlyph, textWidth } from '../src/render/bitmapFont.js';

test('boot lines end on the impossible date', () => {
  const lines = bootLines(0);
  assert.equal(lines.at(-1), 'OCT 31 1970  00:00');
  assert.ok(!lines.some((l) => l.startsWith('TAPES FOUND')));
});

test('returning users see how many tapes they found', () => {
  assert.ok(bootLines(4).includes('TAPES FOUND: 004'));
});

test('dot leaders line up the values', () => {
  const rows = bootLines(0).filter((l) => l.includes('..'));
  const cols = rows.map((l) => l.lastIndexOf(' ') + 1);
  assert.equal(new Set(cols).size, 1);
});

test('every boot line fits on the 320 px screen and every character has a glyph', () => {
  for (const line of [...bootLines(999), '\u25B6 PLAY', 'PLAY \u25B6', 'PRESS ENTER', 'TAP']) {
    for (const ch of line) assert.ok(hasGlyph(ch), `no glyph for "${ch}"`);
  }
  for (const line of bootLines(999)) {
    assert.ok(BOOT_MARGIN + textWidth(line, BOOT_SCALE) <= 320 - BOOT_MARGIN / 2, `"${line}" is too wide`);
  }
});
