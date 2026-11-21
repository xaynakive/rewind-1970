// The found-tape boot screen. Spec: .kiro/specs/cold-open
// Draws into a 320x240 canvas that the VHS pass shows full screen.

import { drawText, textWidth, GLYPH_H } from '../../render/bitmapFont.js';

const TYPE_MS = 26;
const LINE_PAUSES = [520, 380, 460, 600, 420, 900, 560];
const SCALE = 2;
const X = 16;
const Y = 28;
const LINE_H = 20;
/** Column where values start, so the dot leaders line up. */
const VALUE_COL = 14;

function row(name, value) {
  return `${name} ${'.'.repeat(VALUE_COL - name.length - 2)} ${value}`;
}

export function bootLines(tapesFound) {
  const lines = [
    'VIDEO CASSETTE RECORDER',
    row('TRACKING', 'AUTO'),
    row('HEAD CLEAN', 'OK'),
    row('TAPE', 'UNLABELLED'),
  ];
  if (tapesFound > 0) lines.push(`TAPES FOUND: ${String(Math.min(tapesFound, 999)).padStart(3, '0')}`);
  lines.push('', 'OCT 31 1970  00:00');
  return lines;
}

/** Widest line in canvas pixels; must fit the 320 px screen with margins. */
export const BOOT_SCALE = SCALE;
export const BOOT_MARGIN = X;

/**
 * @param {{ tapesFound: number, touch: boolean, onLine: (line: string) => void }} opts
 */
export function createColdOpen({ tapesFound, touch, onLine }) {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');
  const lines = bootLines(tapesFound);

  /** @type {{kind:'booting', line:number, chars:number, nextAt:number} | {kind:'ready', since:number} | {kind:'playing', startedAt:number}} */
  let state = { kind: 'booting', line: 0, chars: 0, nextAt: 700 };
  let announced = 0;

  function announceUpTo(n) {
    while (announced < n) {
      if (lines[announced]) onLine(lines[announced]);
      announced++;
    }
  }

  function update(t) {
    while (state.kind === 'booting' && t >= state.nextAt) {
      const text = lines[state.line];
      if (state.chars < text.length) {
        state.chars++;
        state.nextAt += TYPE_MS;
      } else {
        announceUpTo(state.line + 1);
        if (state.line + 1 >= lines.length) {
          state = { kind: 'ready', since: state.nextAt };
        } else {
          state.nextAt += LINE_PAUSES[state.line % LINE_PAUSES.length];
          state.line++;
          state.chars = 0;
        }
      }
    }
  }

  /** Enter/Space/tap. Returns 'skipped' or 'play' (or null if already playing). */
  function press(t) {
    if (state.kind === 'booting') {
      announceUpTo(lines.length);
      state = { kind: 'ready', since: t };
      return 'skipped';
    }
    if (state.kind === 'ready') {
      state = { kind: 'playing', startedAt: t };
      return 'play';
    }
    return null;
  }

  function draw(t) {
    ctx.fillStyle = '#07060a';
    ctx.fillRect(0, 0, 320, 240);
    ctx.fillStyle = '#d8cfb4';

    const shown = state.kind === 'booting' ? state.line : lines.length;
    for (let i = 0; i < shown; i++) drawText(ctx, lines[i], X, Y + i * LINE_H, SCALE);

    if (state.kind === 'booting') {
      const partial = lines[state.line].slice(0, state.chars);
      const y = Y + state.line * LINE_H;
      drawText(ctx, partial, X, y, SCALE);
      if (Math.floor(t / 300) % 2 === 0) {
        ctx.fillRect(X + textWidth(partial, SCALE), y, 5 * SCALE, GLYPH_H * SCALE);
      }
    }

    if (state.kind === 'ready' && Math.floor((t - state.since) / 560) % 2 === 0) {
      drawText(ctx, '\u25B6 PLAY', X, 180, SCALE);
      drawText(ctx, touch ? 'TAP' : 'PRESS ENTER', X, 204, 1);
    }
    if (state.kind === 'playing') drawText(ctx, 'PLAY \u25B6', X, 180, SCALE);
  }

  return {
    canvas,
    update,
    press,
    draw,
    get state() { return state; },
  };
}
