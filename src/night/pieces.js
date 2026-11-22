// Building pieces shared by every place in Haewol: colours, paper walls, eaves, lanterns.
// Spec: .kiro/specs/haewol (design "The village")

import { PALETTE, shade, GLOW } from '../systems/house/palette.js';

export const GLOSS = 7;
export const WATER = 5;

export const wood = PALETTE.rotWood;
export const darkWood = shade(wood, 0.6);
export const paper = [0.6, 0.56, 0.47];
export const ink = [0.1, 0.09, 0.1];
export const stone = [0.3, 0.31, 0.3];
export const stoneDark = [0.2, 0.21, 0.21];
export const roofTile = [0.12, 0.13, 0.15];
export const lanternRed = [0.85, 0.14, 0.1];
export const waterCol = [0.07, 0.1, 0.13];
export const rainColor = [0.5, 0.56, 0.66];
/** Her dress: a dark, wet red. The only saturated colour besides the lanterns and the tally light. */
export const CALLER_RED = [0.36, 0.05, 0.05];

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- pieces ----------

/** A wall along z at x, from z0 down to z1, with door gaps [za, zb]. Paper panels between posts. */
export function wallZ(mb, x, z0, z1, h, gaps = [], base = 0, col = paper) {
  const cuts = [z0, ...gaps.flat(), z1].sort((a, b) => b - a);
  for (let i = 0; i < cuts.length - 1; i += 2) {
    const a = cuts[i], b = cuts[i + 1];
    const n = Math.max(1, Math.round(a - b));
    mb.quadGrid([x, base, a], [x, base, b], [x, base + h, b], [x, base + h, a], n, 2, col);
    for (let z = a; z >= b - 1e-6; z -= Math.max(0.9, (a - b) / Math.max(1, Math.round((a - b) / 1.2)))) mb.box([x, base + h / 2, z], [0.12, h, 0.12], darkWood);
    mb.box([x, base + 0.95, (a + b) / 2], [0.1, 0.06, a - b], darkWood);
  }
  for (const [za, zb] of gaps) mb.quad([x, base + 2.2, za], [x, base + 2.2, zb], [x, base + h, zb], [x, base + h, za], col);
}
export function wallX(mb, z, x0, x1, h, gaps = [], base = 0, col = paper) {
  const cuts = [x0, ...gaps.flat(), x1].sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i += 2) {
    const a = cuts[i], b = cuts[i + 1];
    const n = Math.max(1, Math.round(b - a));
    mb.quadGrid([a, base, z], [b, base, z], [b, base + h, z], [a, base + h, z], n, 2, col);
    for (let x = a; x <= b + 1e-6; x += Math.max(0.9, (b - a) / Math.max(1, Math.round((b - a) / 1.2)))) mb.box([x, base + h / 2, z], [0.12, h, 0.12], darkWood);
    mb.box([(a + b) / 2, base + 0.95, z], [b - a, 0.06, 0.1], darkWood);
  }
  for (const [xa, xb] of gaps) mb.quad([xa, base + 2.2, z], [xb, base + 2.2, z], [xb, base + h, z], [xa, base + h, z], col);
}

/** Heavy eaves over a house front: a sloped band of dark tiles. */
export function eaves(mb, a, b, out, h) {
  // a, b: ends of the wall top [x, z]; out: unit vector away from the wall, on the floor plane.
  const lo = (p) => [p[0] + out[0] * 1.1, h - 0.45, p[1] + out[1] * 1.1];
  const hi = (p) => [p[0] - out[0] * 0.4, h + 0.55, p[1] - out[1] * 0.4];
  mb.quadGrid(lo(a), lo(b), hi(b), hi(a), Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]))), 1, roofTile);
  for (let t = 0; t <= 1.0001; t += 0.125) {
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const l = lo(p), u = hi(p);
    mb.box([(l[0] + u[0]) / 2, (l[1] + u[1]) / 2 + 0.04, (l[2] + u[2]) / 2], [Math.abs(out[1]) * 0.08 + Math.abs(out[0]) * 1.5, 0.06, Math.abs(out[0]) * 0.08 + Math.abs(out[1]) * 1.5], shade(roofTile, 0.7));
  }
}

export function lantern(mb, lights, [x, y, z], weight = 1) {
  mb.box([x, y + 0.24, z], [0.02, 0.2, 0.02], ink);
  mb.blob([x, y, z], 0.17, 1.25, 8, 5, lanternRed, GLOW * 0.85);
  mb.box([x, y + 0.2, z], [0.16, 0.03, 0.16], darkWood);
  mb.box([x, y - 0.21, z], [0.14, 0.03, 0.14], darkWood);
  lights.push({ pos: [x, y - 0.2, z], color: [1, 0.36, 0.24], weight });
}

