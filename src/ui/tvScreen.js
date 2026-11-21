// The final tape playing on the TV: one line at a time on a 320x240 canvas,
// shown through the VHS pass. Lines use the system's fonts (any language),
// damaged with the same seeded word drift as decayed tapes.

import { drawText, textWidth } from '../render/bitmapFont.js';
import { driftWords } from '../systems/decay/drift.js';
import { MAX_DECAY } from '../systems/decay/decay.js';
import { fnv1a } from '../core/hash.js';

const SIZE = 13;
const FONT = `${SIZE}px "Courier New", "Liberation Mono", ui-monospace, monospace`;
const LINE_H = 19;
const MAX_W = 280;
const INK = '#d8cfb4';

export function createTvScreen() {
  const canvas = document.createElement('canvas');
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext('2d');

  /** Wraps drifted tokens into rows that fit MAX_W. */
  function layout(tokens) {
    ctx.font = FONT;
    const rows = [[]];
    let w = 0;
    for (const tok of tokens) {
      const tw = ctx.measureText(tok.text).width;
      if (!tok.space && w + tw > MAX_W && rows.at(-1).length) {
        rows.push([]);
        w = 0;
      }
      if (tok.space && rows.at(-1).length === 0) continue; // no leading spaces on a row
      rows.at(-1).push({ ...tok, w: tw });
      w += tw;
    }
    for (const r of rows) while (r.length && r.at(-1).space) r.pop();
    return rows.filter((r) => r.length);
  }

  function osd() {
    ctx.fillStyle = INK;
    drawText(ctx, 'PLAY \u25B6', 16, 14, 2);
    drawText(ctx, 'OCT 31 1970  00:00', 16, 212, 2);
  }

  function line(text, alpha, script) {
    const tokens = driftWords(text, (script.seed ^ fnv1a(text)) >>> 0, script.decay * MAX_DECAY);
    const rows = layout(tokens);
    const top = 120 - (rows.length * LINE_H) / 2;
    ctx.font = FONT;
    ctx.textBaseline = 'top';
    ctx.fillStyle = INK;
    rows.forEach((row, i) => {
      let x = 160 - row.reduce((s, t) => s + t.w, 0) / 2;
      for (const t of row) {
        if (!t.space) {
          ctx.globalAlpha = alpha * (1 - t.fade);
          ctx.fillText(t.text, x + t.dx * SIZE, top + i * LINE_H + t.dy * SIZE);
        }
        x += t.w;
      }
    });
    ctx.globalAlpha = 1;
  }

  return {
    canvas,
    /**
     * @param {{kind: string, ms: number, text?: string}} seg current timeline segment
     * @param {number} local ms since the segment started
     * @param {{seed: number, decay: number, title: string}} script
     */
    draw(seg, local, script) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#07060a';
      ctx.fillRect(0, 0, 320, 240);
      if (seg.kind === 'return') return;
      if (seg.kind === 'card') {
        const a = Math.min(1, local / 600, (seg.ms - local) / 500);
        ctx.globalAlpha = Math.max(0, a);
        ctx.fillStyle = INK;
        drawText(ctx, 'TAPE END', 160 - textWidth('TAPE END', 2) / 2, 96, 2);
        ctx.font = FONT;
        ctx.textBaseline = 'top';
        ctx.textAlign = 'center';
        ctx.fillText(script.title, 160, 128);
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
        return;
      }
      osd();
      if (seg.kind === 'line') {
        const a = Math.max(0, Math.min(1, local / 400, (seg.ms - local) / 300));
        line(seg.text, a, script);
      }
    },
  };
}
