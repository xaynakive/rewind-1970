// Haewol on the night of the typhoon: the entry house and the courtyard.
// Spec: .kiro/specs/haewol (Requirements 3, 6.1; design "The village")
//
// Yaw 0 looks toward -z. The entry house is at the south (z 6..12); the
// courtyard runs north from its door to the schoolroom wall (z = -16).

import { MeshBuilder } from '../render/mesh.js';
import { translation } from '../render/math.js';
import { PALETTE, shade, mix, GLOW, SKY, RAIN } from '../systems/house/palette.js';
import { boundsOf, grow, footprint, noteMesh, inspectOf } from '../systems/memory/market.js';

const GLOSS = 7;
const WATER = 5;

export const SUNKEN = -0.25; // the courtyard floor, inside the stone rim
export const STONE_TOP = 0.25; // stepping stones stay above the highest water (0.2)
export const YARD = { x0: -12, x1: 12, z0: 6, z1: -16 };
export const INNER = { x0: -10.5, x1: 10.5, z0: 4.5, z1: -14.5 };
export const HOUSE = { x0: -3, x1: 3, z0: 6, z1: 12 };

const wood = PALETTE.rotWood;
const darkWood = shade(wood, 0.6);
const paper = [0.6, 0.56, 0.47];
const ink = [0.1, 0.09, 0.1];
const stone = [0.3, 0.31, 0.3];
const stoneDark = [0.2, 0.21, 0.21];
const roofTile = [0.12, 0.13, 0.15];
const lanternRed = [0.85, 0.14, 0.1];
const waterCol = [0.07, 0.1, 0.13];
const rainColor = [0.5, 0.56, 0.66];
/** Her dress: a dark, wet red. The only saturated colour besides the lanterns and the tally light. */
const CALLER_RED = [0.36, 0.05, 0.05];

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- the stepping stones ----------

/** Centres of the stepping stones: from the entry door to the well, then to each door. */
export function stonePath() {
  const out = [];
  const line = (a, b, gap = 1.1) => {
    const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / gap));
    for (let i = 0; i <= n; i++) out.push([a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n]);
  };
  line([0, 4.2], [0, -2.6]); // entry door -> the well
  line([-1.4, -5], [-10.2, -5]); // the well -> Yeonhwa's house (west)
  line([1.4, -4.4], [10.2, -3]); // the well -> Wol's house (east)
  line([-0.8, -7.2], [-5, -14.2]); // the well -> the schoolroom (north)
  line([1.2, -7.2], [8.4, -14.2]); // the well -> the shrine gate (north east)
  // Drop stones that land on top of each other where the lines meet.
  return out.filter((p, i) => out.findIndex((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.55) === i);
}
export const STONE_HALF = 0.36;

/** The ground height under a point, and whether it is the sunken courtyard floor. */
export function groundAt(x, z, stones = STONES) {
  if (x > INNER.x0 && x < INNER.x1 && z < INNER.z0 && z > INNER.z1) {
    for (const s of stones) if (Math.abs(x - s[0]) < STONE_HALF + 0.05 && Math.abs(z - s[1]) < STONE_HALF + 0.05) return { y: STONE_TOP, sunken: false, stone: true };
    return { y: SUNKEN, sunken: true, stone: false };
  }
  return { y: 0, sunken: false, stone: false };
}
const STONES = stonePath();

// ---------- pieces ----------

/** A wall along z at x, from z0 down to z1, with door gaps [za, zb]. Paper panels between posts. */
function wallZ(mb, x, z0, z1, h, gaps = [], base = 0, col = paper) {
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
function wallX(mb, z, x0, x1, h, gaps = [], base = 0, col = paper) {
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
function eaves(mb, a, b, out, h) {
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

function lantern(mb, lights, [x, y, z], weight = 1) {
  mb.box([x, y + 0.24, z], [0.02, 0.2, 0.02], ink);
  mb.blob([x, y, z], 0.17, 1.25, 8, 5, lanternRed, GLOW * 0.85);
  mb.box([x, y + 0.2, z], [0.16, 0.03, 0.16], darkWood);
  mb.box([x, y - 0.21, z], [0.14, 0.03, 0.14], darkWood);
  lights.push({ pos: [x, y - 0.2, z], color: [1, 0.36, 0.24], weight });
}

function buildRain(mb, rand) {
  for (let i = 0; i < 1100; i++) {
    const x = YARD.x0 + rand() * (YARD.x1 - YARD.x0);
    const z = YARD.z1 + rand() * (YARD.z0 - YARD.z1);
    const len = 0.35 + rand() * 0.3;
    const phase = rand() * 8;
    const w = 0.016;
    const a = [x - w, 0, z], b = [x + w, 0, z], c = [x + w + 0.06, len, z], d = [x - w + 0.06, len, z];
    for (const v of [a, b, c, a, c, d]) mb.data.push(v[0], v[1], v[2], phase, 0, 0, rainColor[0], rainColor[1], rainColor[2], RAIN);
    mb.triangles += 2;
  }
}

// ---------- inspect objects ----------

function paperBoatMesh() {
  const mb = new MeshBuilder();
  const p = [0.6, 0.57, 0.48];
  // Hull: two sloped sides and a flat bottom; a sail folded up in the middle.
  mb.quad([-0.12, 0, -0.04], [0.12, 0, -0.04], [0.16, 0.06, -0.07], [-0.16, 0.06, -0.07], p, GLOSS);
  mb.quad([-0.12, 0, 0.04], [0.12, 0, 0.04], [0.16, 0.06, 0.07], [-0.16, 0.06, 0.07], shade(p, 0.9), GLOSS);
  mb.quad([-0.12, 0, -0.04], [0.12, 0, -0.04], [0.12, 0, 0.04], [-0.12, 0, 0.04], shade(p, 0.8), GLOSS);
  mb.tri([-0.08, 0.06, 0], [0.08, 0.06, 0], [0, 0.17, 0], shade(p, 1.05), GLOSS);
  // Her name on the hull, in ink: three short strokes.
  for (let k = 0; k < 3; k++) mb.box([-0.05 + k * 0.045, 0.03, -0.058], [0.03, 0.008, 0.004], ink, GLOSS);
  // Damp at the waterline.
  mb.box([0, 0.004, -0.045], [0.22, 0.006, 0.004], shade(p, 0.6), GLOSS);
  return mb;
}

// ---------- the level ----------

export function buildVillage() {
  const mb = new MeshBuilder();
  const revealed = new MeshBuilder(); // only through the lens
  const rain = new MeshBuilder();
  const colliders = [];
  const parts = [];
  const items = [];
  const hides = [];
  const lights = [];
  const rand = mulberry32(1031);

  // ----- the entry house -----
  {
    const { x0, x1, z0, z1 } = HOUSE;
    const h = 2.6;
    for (let x = x0; x < x1; x += 0.5) mb.quadGrid([x, 0, z0], [x + 0.5, 0, z0], [x + 0.5, 0, z1], [x, 0, z1], 1, 6, shade(wood, 0.75 + ((x * 2) % 2) * 0.08));
    mb.quadGrid([x0, h, z0], [x1, h, z0], [x1, h, z1], [x0, h, z1], 6, 6, shade(wood, 0.4));
    wallZ(mb, x0, z1, z0, h);
    wallZ(mb, x1, z1, z0, h);
    wallX(mb, z1, x0, x1, h);
    wallX(mb, z0, x0, x1, h, [[-0.6, 0.6]]);
    colliders.push(
      { min: [x0 - 0.2, z0], max: [x0, z1] }, { min: [x1, z0], max: [x1 + 0.2, z1] },
      { min: [x0, z1], max: [x1, z1 + 0.2] },
      { min: [x0, z0 - 0.1], max: [-0.6, z0 + 0.1] }, { min: [0.6, z0 - 0.1], max: [x1, z0 + 0.1] },
    );
    // The dead TV on a low cabinet against the back wall.
    mb.box([0, 0.3, z1 - 0.35], [1.2, 0.6, 0.5], darkWood);
    mb.box([0, 0.86, z1 - 0.4], [0.7, 0.52, 0.48], [0.13, 0.12, 0.12]);
    mb.box([0, 0.88, z1 - 0.64], [0.52, 0.38, 0.01], [0.2, 0.24, 0.24], GLOW * 0.35);
    colliders.push(footprint([0, 0, z1 - 0.35], [1.2, 0, 0.5]));
    // The low table where the camcorder was. A ring in the dust where it stood.
    mb.box([-1.8, 0.2, 8.4], [0.9, 0.06, 0.6], shade(wood, 1.1));
    for (const dx of [-0.38, 0.38]) for (const dz of [-0.24, 0.24]) mb.box([-1.8 + dx, 0.09, 8.4 + dz], [0.05, 0.18, 0.05], darkWood);
    mb.box([-1.8, 0.235, 8.4], [0.2, 0.006, 0.12], shade(wood, 0.6));
    colliders.push(footprint([-1.8, 0, 8.4], [0.9, 0, 0.6], true));
    // A wall clock at two minutes to midnight, and a folded quilt.
    mb.box([x1 - 0.06, 1.9, 9], [0.04, 0.36, 0.36], darkWood);
    mb.box([x1 - 0.09, 1.9, 9], [0.01, 0.3, 0.3], paper, GLOW * 0.2);
    mb.box([x1 - 0.1, 1.95, 9], [0.01, 0.12, 0.015], ink);
    mb.box([x1 - 0.1, 1.9, 8.98], [0.01, 0.015, 0.1], ink);
    mb.box([2.2, 0.12, 11.2], [1.1, 0.24, 0.8], [0.32, 0.3, 0.36]);
    colliders.push(footprint([2.2, 0, 11.2], [1.1, 0, 0.8], true));
    // A bare bulb.
    mb.box([0, h - 0.25, 9], [0.08, 0.1, 0.08], [1, 0.9, 0.7], GLOW);
    lights.push({ pos: [0, h - 0.4, 9], color: [1, 0.82, 0.6], weight: 2.5 });
    // Through the lens: small wet handprints on the TV glass.
    for (let k = 0; k < 2; k++) revealed.box([-0.1 + k * 0.2, 0.86, z1 - 0.655], [0.08, 0.1, 0.004], [0.6, 0.85, 0.9], GLOW);
  }
  // The sliding door: it slides along the wall, toward +x.
  {
    const door = new MeshBuilder();
    door.quadGrid([-0.6, 0, HOUSE.z0 - 0.02], [0.6, 0, HOUSE.z0 - 0.02], [0.6, 2.2, HOUSE.z0 - 0.02], [-0.6, 2.2, HOUSE.z0 - 0.02], 2, 4, paper);
    for (const x of [-0.6, 0, 0.6]) door.box([x, 1.1, HOUSE.z0 - 0.02], [0.06, 2.2, 0.06], darkWood);
    for (const y of [0.55, 1.1, 1.65]) door.box([0, y, HOUSE.z0 - 0.02], [1.2, 0.04, 0.04], darkWood);
    parts.push({
      id: 'entry-door', kind: 'door', label: 'the sliding door',
      mesh: door.build(),
      bounds: grow(boundsOf([0, 1.1, HOUSE.z0], [1.2, 2.2, 0.3]), 0.05),
      transform: (k) => translation([1.15 * k, 0, 0]),
      collider: { min: [-0.6, HOUSE.z0 - 0.1], max: [0.6, HOUSE.z0 + 0.1] },
      rate: 2.2,
    });
  }

  // ----- the courtyard -----
  {
    // The raised stone rim at y = 0 and the sunken floor inside it.
    const rim = (x0, z0, x1, z1) => mb.quadGrid([x0, 0, z0], [x1, 0, z0], [x1, 0, z1], [x0, 0, z1], Math.max(1, Math.round(Math.abs(x1 - x0))), Math.max(1, Math.round(Math.abs(z1 - z0))), stone);
    rim(YARD.x0, YARD.z0, YARD.x1, INNER.z0); // south strip (in front of the entry house)
    rim(YARD.x0, INNER.z1, YARD.x1, YARD.z1); // north strip
    rim(YARD.x0, INNER.z0, INNER.x0, INNER.z1); // west
    rim(INNER.x1, INNER.z0, YARD.x1, INNER.z1); // east
    for (let x = INNER.x0; x < INNER.x1; x++) {
      for (let z = INNER.z1; z < INNER.z0; z++) {
        const c = (Math.floor(x) + Math.floor(z)) % 2 === 0 ? stoneDark : shade(stoneDark, 0.85);
        mb.quad([x, SUNKEN, z], [x + 1, SUNKEN, z], [x + 1, SUNKEN, z + 1], [x, SUNKEN, z + 1], c);
      }
    }
    // The rim's inner faces.
    const { x0, x1, z0, z1 } = INNER;
    mb.quadGrid([x0, SUNKEN, z0], [x1, SUNKEN, z0], [x1, 0, z0], [x0, 0, z0], 21, 1, shade(stone, 0.7));
    mb.quadGrid([x0, SUNKEN, z1], [x1, SUNKEN, z1], [x1, 0, z1], [x0, 0, z1], 21, 1, shade(stone, 0.7));
    mb.quadGrid([x0, SUNKEN, z1], [x0, SUNKEN, z0], [x0, 0, z0], [x0, 0, z1], 19, 1, shade(stone, 0.7));
    mb.quadGrid([x1, SUNKEN, z1], [x1, SUNKEN, z0], [x1, 0, z0], [x1, 0, z1], 19, 1, shade(stone, 0.7));

    // Stepping stones. Through the lens, the safe ones carry Sae's wet footprints.
    STONES.forEach(([sx, sz], i) => {
      mb.box([sx, (SUNKEN + STONE_TOP) / 2, sz], [STONE_HALF * 2, STONE_TOP - SUNKEN, STONE_HALF * 2], shade(stone, 0.95 + (i % 3) * 0.06));
      const a = (i * 0.7) % Math.PI;
      revealed.boxRot([sx - 0.08, STONE_TOP + 0.004, sz + 0.05], [0.07, 0.004, 0.13], a, [0.55, 0.85, 0.92], GLOW);
      revealed.boxRot([sx + 0.09, STONE_TOP + 0.004, sz - 0.07], [0.07, 0.004, 0.13], a, [0.55, 0.85, 0.92], GLOW);
    });

    // The well: a ring of stones, a wooden frame and a bucket on a rope.
    const W = [0, -5];
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      mb.boxRot([W[0] + Math.cos(a) * 0.85, SUNKEN + 0.42, W[1] + Math.sin(a) * 0.85], [0.6, 0.84, 0.32], -a + Math.PI / 2, shade(stone, 1.1 - (k % 2) * 0.1));
    }
    mb.quad([W[0] - 0.7, SUNKEN + 0.6, W[1] - 0.7], [W[0] + 0.7, SUNKEN + 0.6, W[1] - 0.7], [W[0] + 0.7, SUNKEN + 0.6, W[1] + 0.7], [W[0] - 0.7, SUNKEN + 0.6, W[1] + 0.7], [0.01, 0.012, 0.016], WATER);
    for (const dx of [-1.05, 1.05]) mb.box([W[0] + dx, SUNKEN + 1.1, W[1]], [0.1, 2.2, 0.1], darkWood);
    mb.box([W[0], SUNKEN + 2.15, W[1]], [2.3, 0.1, 0.12], darkWood);
    mb.box([W[0], SUNKEN + 1.6, W[1]], [0.015, 1.1, 0.015], [0.5, 0.45, 0.35]);
    mb.box([W[0], SUNKEN + 1.0, W[1]], [0.26, 0.24, 0.26], shade(wood, 0.9));
    colliders.push(footprint([W[0], 0, W[1]], [2.1, 0, 2.1]));

    // The family shrine (north east): a stone base, a small roofed altar, candles.
    const S = [8, -12.6];
    mb.box([S[0], SUNKEN + 0.3, S[1]], [1.8, 0.6, 1.2], shade(stone, 1.1));
    mb.box([S[0], SUNKEN + 1.0, S[1] - 0.2], [1.2, 0.8, 0.6], darkWood);
    mb.box([S[0], SUNKEN + 1.0, S[1] + 0.12], [0.9, 0.6, 0.02], [0.16, 0.05, 0.05]);
    mb.boxRot([S[0] - 0.4, SUNKEN + 1.55, S[1] - 0.2], [0.95, 0.06, 1.0], 0, roofTile);
    mb.boxRot([S[0] + 0.4, SUNKEN + 1.55, S[1] - 0.2], [0.95, 0.06, 1.0], 0, roofTile);
    for (const dx of [-0.45, 0.45]) {
      mb.box([S[0] + dx, SUNKEN + 0.68, S[1] + 0.35], [0.05, 0.16, 0.05], [0.9, 0.86, 0.78]);
      mb.box([S[0] + dx, SUNKEN + 0.79, S[1] + 0.35], [0.02, 0.04, 0.02], [1, 0.7, 0.35], GLOW);
    }
    mb.box([S[0], SUNKEN + 0.62, S[1] + 0.35], [0.4, 0.03, 0.22], shade(wood, 1.2)); // an empty offering plate
    lights.push({ pos: [S[0], SUNKEN + 1.0, S[1] + 0.6], color: [1, 0.7, 0.4], weight: 0.9 });
    colliders.push(footprint([S[0], 0, S[1]], [1.8, 0, 1.2]));
    // Through the lens: writing on the shrine's cloth.
    for (let k = 0; k < 4; k++) revealed.box([S[0] - 0.2 + (k % 2) * 0.4, SUNKEN + 1.15 - Math.floor(k / 2) * 0.22, S[1] + 0.135], [0.25, 0.04, 0.004], [0.62, 0.86, 0.9], GLOW);

    // Lantern strings across the courtyard, for the festival of the dead.
    for (const lz of [-1.5, -9.5]) {
      for (const lx of [YARD.x0 + 1.2, YARD.x1 - 1.2]) mb.box([lx, 1.6, lz], [0.12, 3.2, 0.12], darkWood);
      mb.box([0, 3.05, lz], [YARD.x1 - YARD.x0 - 2.4, 0.015, 0.015], ink);
      for (let lx = YARD.x0 + 2.5; lx < YARD.x1 - 2; lx += 2.2) lantern(mb, lights, [lx, 2.7 - Math.abs(Math.sin(lx * 0.4)) * 0.25, lz], 0.9);
    }
    // Rain barrels by Wol's house: a place to crouch out of sight.
    for (const [bx, bz] of [[10.9, 2.6], [11.3, 3.4], [10.7, 3.6]]) {
      mb.blob([bx, 0.5, bz], 0.36, 1.45, 8, 4, shade(wood, 0.9));
      mb.box([bx, 0.95, bz], [0.66, 0.04, 0.66], [0.02, 0.03, 0.05], WATER);
    }
    colliders.push(footprint([11.0, 0, 3.2], [1.3, 0, 1.6]));
    hides.push({
      id: 'barrels', label: 'crouch behind the rain barrels', low: true,
      bounds: grow(boundsOf([11.0, 0.6, 3.2], [1.3, 1.2, 1.6]), 0.05),
      view: { pos: [10.3, 0.75, 2.0], yaw: -2.4, pitch: 0.05 },
      exit: { pos: [9.9, 2.0], yaw: -2.2 },
    });
  }

  // ----- the house fronts around the courtyard -----
  {
    const h = 3.0;
    // West: Yeonhwa's house. East: Wol's house. North: the schoolroom, and the gate to the hill path.
    wallZ(mb, YARD.x0, YARD.z0, YARD.z1, h, [[-4.4, -5.6]], 0, mix(paper, [0.5, 0.45, 0.4], 0.3));
    wallZ(mb, YARD.x1, YARD.z0, YARD.z1, h, [[-2.4, -3.6]], 0, mix(paper, [0.4, 0.42, 0.36], 0.4));
    wallX(mb, YARD.z1, YARD.x0, YARD.x1, h, [[-5.6, -4.4], [8.3, 9.7]], 0, mix(paper, [0.45, 0.45, 0.5], 0.3));
    eaves(mb, [YARD.x0, YARD.z0], [YARD.x0, YARD.z1], [1, 0], h);
    eaves(mb, [YARD.x1, YARD.z0], [YARD.x1, YARD.z1], [-1, 0], h);
    eaves(mb, [YARD.x0, YARD.z1], [YARD.x1, YARD.z1], [0, 1], h);
    // South: low stone walls either side of the entry house, and its roof.
    for (const [a, b] of [[YARD.x0, HOUSE.x0], [HOUSE.x1, YARD.x1]]) {
      mb.box([(a + b) / 2, 0.6, YARD.z0], [b - a, 1.2, 0.4], shade(stone, 0.9));
      colliders.push({ min: [a, YARD.z0 - 0.2], max: [b, YARD.z0 + 0.3] });
    }
    eaves(mb, [HOUSE.x1 + 0.4, HOUSE.z0], [HOUSE.x0 - 0.4, HOUSE.z0], [0, -1], 2.6);
    colliders.push(
      { min: [YARD.x0 - 0.3, YARD.z1], max: [YARD.x0, YARD.z0] },
      { min: [YARD.x1, YARD.z1], max: [YARD.x1 + 0.3, YARD.z0] },
      { min: [YARD.x0, YARD.z1 - 0.3], max: [YARD.x1, YARD.z1] },
    );
    // Doors that won't open tonight (each milestone opens one).
    const shut = (id, label, center, size, lockedText) => {
      const d = new MeshBuilder();
      d.box(center, size, shade(wood, 0.7));
      d.box([center[0], center[1] + 0.3, center[2]], size.map((s) => (s < 0.2 ? s + 0.02 : s * 0.7)), shade(paper, 0.6));
      parts.push({ id, kind: 'door', label, mesh: d.build(), bounds: grow(boundsOf(center, size), 0.1), transform: () => translation([0, 0, 0]), needs: `open:${id}`, lockedText });
    };
    shut('yeonhwa-door', "Yeonhwa's door", [YARD.x0 + 0.04, 1.1, -5], [0.06, 2.2, 1.2], "it won't open tonight. inside, a cassette recorder clicks off.");
    shut('wol-door', "Wol's door", [YARD.x1 - 0.04, 1.1, -3], [0.06, 2.2, 1.2], 'herbs hang from the eaves. the door is tied shut with red thread.');
    shut('school-door', 'the schoolroom door', [-5, 1.1, YARD.z1 + 0.04], [1.2, 2.2, 0.06], 'small shoes are lined up outside. the door is stuck.');
    shut('hill-gate', 'the gate to the hill', [9, 1.1, YARD.z1 + 0.04], [1.4, 2.2, 0.06], 'the path to the shrine on the hill. you know too little to climb it.');
    // The hill above the north wall, dark against the storm.
    mb.quadGrid([YARD.x0 - 6, 3.0, YARD.z1 - 1], [YARD.x1 + 6, 3.0, YARD.z1 - 1], [YARD.x1 + 6, 14, YARD.z1 - 26], [YARD.x0 - 6, 14, YARD.z1 - 26], 8, 4, [0.05, 0.07, 0.06]);
    mb.box([9, 12.6, YARD.z1 - 22], [1.6, 1.2, 1.2], [0.08, 0.06, 0.06]); // the shrine on the hill, far off
    mb.box([9, 12.6, YARD.z1 - 21.38], [0.3, 0.3, 0.02], lanternRed, GLOW);
  }

  buildRain(rain, rand);

  // ----- things to find -----
  items.push({
    id: 'memory-boat', kind: 'memory', name: 'a paper boat',
    pos: [0.62, SUNKEN + 0.88, -4.4], size: [0.2, 0.08, 0.1], color: [0.86, 0.82, 0.7],
    text: "a paper boat, soft with rain. on the hull, in a mother's handwriting: sae.",
    inspect: inspectOf(paperBoatMesh(), 0.32),
    flashback: [
      'october 31st, 1970. twenty to midnight.',
      'sae folds a paper boat on the porch. her mother writes her name on the hull.',
      'the rain is so loud they have to shout to laugh.',
      'sae sets the boat on the courtyard. the water is only ankle deep.',
      'someone calls from the house. yeonhwa turns her head, just for a moment.',
    ],
  });
  items.push({
    id: 'note-water', kind: 'note', name: "a note on the shrine",
    pos: [7.55, SUNKEN + 0.64, -12.2], size: [0.16, 0.01, 0.12], color: paper,
    text: 'stay out of still water. if you can see your face in it, something underneath can see yours too. (in an old woman\'s hand. signed: w.)',
    inspect: inspectOf(noteMesh(5), 0.3),
  });

  // The TV in the entry house: one more line of the tape each loop.
  const readables = [{
    id: 'tv', label: 'look at the tv',
    bounds: grow(boundsOf([0, 0.86, HOUSE.z1 - 0.45], [0.7, 0.52, 0.5]), 0.08),
    lines: TV_LINES,
  }];

  return {
    id: 'village',
    title: 'haewol',
    date: 'OCT 31 1970',
    mesh: mb.build(),
    revealed: revealed.build(),
    rain: rain.build(),
    water: waterMesh(),
    parts, items, hides, colliders, lights, readables,
    stones: STONES,
    groundAt: (x, z) => groundAt(x, z, STONES),
    start: { pos: [0, 10.6], yaw: 0 },
    safe: { min: [HOUSE.x0, HOUSE.z0 + 0.15], max: [HOUSE.x1, HOUSE.z1] },
    route: [[-9.6, 3.4], [-9.6, -13.6], [-3, -13.6], [-1.6, -8.2], [3.4, -8.2], [9.4, -11], [9.6, 0.8], [4.2, 3.6], [0.0, 1.0], [-4.2, 3.6]],
    sae: { pos: [-1.5, -3.4], yaw: 2.4, scale: 0.6 },
    callerLook: { face: 'veil', coat: CALLER_RED },
    saeLook: { face: 'hair', coat: [0.36, 0.38, 0.42] },
    sky: [0.06, 0.08, 0.11],
    ambient: [0.075, 0.08, 0.095],
    fog: { color: [0.025, 0.03, 0.04], near: 5, far: 26 },
    lantern: { intensity: 1.1, range: 6.5 },
    flashDir: [0.4, 0.8, -0.3],
    flashScale: 0.6,
    lines: {
      start: 'the clock on the wall reads two minutes to midnight. the door behind you is gone.',
      again: 'twenty-three fifty-eight. again. you remember the way. the house does not remember you.',
      wake: 'the cicadas stop. somewhere, a cassette begins to rewind.',
      near: 'tape is running backward, close by.',
      midnight: 'midnight. the tape runs out.',
      caught: 'wet hair. a hand on your shoulder. the picture tears.',
      sae: 'through the lens, a small girl stands by the well. she points at the stones.',
    },
    nameCalls: [
      "a woman's voice from the courtyard: sae? sae, come inside.",
      "closer now: sae. it's late. answer me.",
    ],
  };
}

export const TV_LINES = [
  'static. then, for one second: rain on a courtyard.',
  "a woman's voice, very close to the microphone: one more time.",
  'a child laughing somewhere off camera. the picture shakes.',
  'the woman again: if i play it enough, it will come out differently.',
  'a small hand in front of the lens, holding a paper boat.',
  'the tape whirrs backward. you hear it start again.',
  "it's always the same night. it's always the same two minutes.",
];

/** The courtyard's water: a grid over the sunken floor, moved up by its model matrix. */
function waterMesh() {
  const mb = new MeshBuilder();
  const { x0, x1, z0, z1 } = INNER;
  mb.quadGrid([x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [x0, 0, z0], 42, 38, waterCol, WATER);
  return mb.build();
}

export const VILLAGE_ITEM_IDS = ['memory-boat', 'note-water'];
