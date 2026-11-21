// Tape cassettes placed at hiding spots. Their labels yellow and bleed red
// as they decay, so you can see from across the room which ones need you.
// Spec: .kiro/specs/decay (Requirement 3.3), tapes (Requirement 3.1)

import { MeshBuilder, hexToRgb } from '../../render/mesh.js';
import { MAX_DECAY } from '../decay/decay.js';

const BODY = [0.07, 0.07, 0.08];
const LABEL = hexToRgb('#d8cfb4');
const FADED = [0.46, 0.36, 0.24];
const BLEED = hexToRgb('#8a1c1c');

// Chunkier than a real VHS cassette (PS1-style exaggeration) so the spine
// reads at 320x240. Lying flat, long side left-to-right, spine and label
// facing +z, toward the room.
const SIZE = [0.27, 0.06, 0.16];
const STACK = 0.064;

/** Label colour for a decay level: clean cream -> yellowed -> red-bled. */
export function labelColor(level) {
  const t = Math.max(0, Math.min(1, level / MAX_DECAY));
  const a = t < 0.6 ? t / 0.6 : 1;
  const b = t < 0.6 ? 0 : (t - 0.6) / 0.4;
  return LABEL.map((c, i) => {
    const faded = c + (FADED[i] - c) * a;
    return faded + (BLEED[i] - faded) * b * 0.55;
  });
}

/** When a tape was laid on its pile. Older tapes without the field use createdAt. */
export const stackedAt = (t) => t.stackedAt ?? t.createdAt;

/** Bottom-to-top order of a pile. */
export function sortStack(tapes) {
  return [...tapes].sort((a, b) => stackedAt(a) - stackedAt(b) || a.id.localeCompare(b.id));
}

/** A tape set back by swapping slides under its pile, so the next one down can be reached. */
export function slideUnder(tape, pile) {
  const others = pile.filter((t) => t.id !== tape.id);
  const lowest = others.length ? Math.min(...others.map(stackedAt)) : stackedAt(tape);
  return { ...tape, stackedAt: lowest - 1 };
}

/**
 * @param {{id:string,label:string,spot:string}[]} tapes tapes to draw
 * @param {Record<string, {pos:number[]}>} spots spot positions for this area
 * @param {(tape) => number} levelOf decay level per tape
 * @returns {{ meshData: Float32Array | null, hotspots: object[] }}
 */
export function buildTapeMeshes(tapes, spots, levelOf) {
  const mb = new MeshBuilder();
  const hotspots = [];

  // Group by spot. Stacks are ordered bottom-to-top by stackedAt.
  const bySpot = new Map();
  for (const tape of tapes) {
    if (!spots[tape.spot]) continue; // hidden in an area that isn't loaded
    if (!bySpot.has(tape.spot)) bySpot.set(tape.spot, []);
    bySpot.get(tape.spot).push(tape);
  }

  for (const [spotId, unsorted] of bySpot) {
    const stack = sortStack(unsorted);
    const base = spots[spotId].pos;
    const maxStack = spots[spotId].maxStack ?? 8;
    let top = null;
    // Draw only the newest `maxStack` tapes; the rest are buried underneath.
    stack.slice(-maxStack).forEach((tape, n) => {
      const jitter = (n % 2 ? -1 : 1) * 0.012 * Math.min(n, 3);
      const c = [base[0] + jitter, base[1] + SIZE[1] / 2 + n * STACK, base[2] + jitter * 0.5];
      mb.box(c, SIZE, BODY);
      // Spine label, 1 cm proud of the front face to avoid z-fighting.
      const z = c[2] + SIZE[2] / 2 + 0.01;
      const hx = SIZE[0] * 0.4, hy = SIZE[1] * 0.32;
      mb.quad([c[0] - hx, c[1] - hy, z], [c[0] + hx, c[1] - hy, z], [c[0] + hx, c[1] + hy, z], [c[0] - hx, c[1] + hy, z], labelColor(levelOf(tape)), 0.6);
      top = { tape, c };
    });

    // One hotspot per stack: it picks up the top tape. Its label counts all of them.
    const pad = 0.06;
    const more = stack.length > 1 ? ` (${stack.length - 1} more under it)` : '';
    hotspots.push({
      id: `tape:${top.tape.id}`,
      label: `tape: ${top.tape.label}${more}`,
      tag: stack.length > 1 ? `tapes \u00d7${stack.length}` : 'tape',
      min: [base[0] - SIZE[0] / 2 - pad, base[1] - 0.02, base[2] - SIZE[2] / 2 - pad],
      max: [base[0] + SIZE[0] / 2 + pad, top.c[1] + SIZE[1] / 2 + 0.04, base[2] + SIZE[2] / 2 + pad],
    });
  }
  return { meshData: mb.triangles ? mb.build() : null, hotspots };
}
