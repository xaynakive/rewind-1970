// The night market, October 30 1970: a covered hall inside a big building,
// two rows of small stalls, tables in the aisle, paper lanterns, and a shutter
// at the far end. Geometry and the level's data (moving parts, items, hiding
// places, the presence's route). Spec: .kiro/specs/memories (Requirement 6)
//
// Coordinates: the hall runs from the entrance (z = 4) to the shutter (z = -30).
// x < 0 is the left row of stalls, x > 0 the right row. The aisle is |x| < 3.4.

import { MeshBuilder } from '../../render/mesh.js';
import { translation, rotationAbout } from '../../render/math.js';
import { PALETTE, shade, mix, GLOW, UNFOGGED } from '../house/palette.js';

const GLOSS = 7;
const HALL = { x: 6, zNear: 4, zFar: -30, h: 6 };
const AISLE = 3.4;
const STALL_W = 3.6;
const STALLS = 8;

const tileA = [0.16, 0.12, 0.1];
const tileB = [0.24, 0.2, 0.16];
const wallCol = shade(PALETTE.dampWall, 1.1);
const wood = PALETTE.rotWood;
const darkWood = shade(PALETTE.rotWood, 0.6);
const metal = [0.22, 0.24, 0.26];
const paper = [0.86, 0.8, 0.66];
const ink = [0.12, 0.1, 0.12];
const lanternRed = [0.85, 0.16, 0.1];
const brass = [0.7, 0.52, 0.22];

/** Awning stripe colours, one pair per stall, so each stall reads as its own place. */
const AWNINGS = [
  [[0.6, 0.12, 0.1], [0.82, 0.74, 0.6]],
  [[0.12, 0.34, 0.3], [0.8, 0.72, 0.56]],
  [[0.5, 0.3, 0.08], [0.2, 0.14, 0.1]],
  [[0.32, 0.1, 0.3], [0.7, 0.6, 0.5]],
  [[0.1, 0.2, 0.42], [0.8, 0.76, 0.66]],
  [[0.46, 0.08, 0.08], [0.16, 0.12, 0.1]],
  [[0.18, 0.36, 0.14], [0.76, 0.7, 0.54]],
  [[0.56, 0.42, 0.1], [0.3, 0.08, 0.08]],
];

const zCentre = (i) => -1.8 - STALL_W * i;

/** Axis-aligned 3D bounds of a box given by centre and size. */
export const boundsOf = ([cx, cy, cz], [sx, sy, sz]) => ({
  min: [cx - sx / 2, cy - sy / 2, cz - sz / 2],
  max: [cx + sx / 2, cy + sy / 2, cz + sz / 2],
});
export const grow = (b, k) => ({ min: b.min.map((v) => v - k), max: b.max.map((v) => v + k) });
/** Floor-plane collider from a box given by centre and size. */
export const footprint = ([cx, , cz], [sx, , sz], low = false) => ({
  min: [cx - sx / 2, cz - sz / 2], max: [cx + sx / 2, cz + sz / 2], low,
});

// ---------- inspect-view objects (centred at the origin, glossy) ----------

export function noteMesh(lines = 6) {
  const mb = new MeshBuilder();
  mb.box([0, 0, 0], [0.21, 0.004, 0.27], paper, GLOSS);
  // A fold across the middle, and lines of handwriting.
  mb.box([0, 0.003, 0], [0.21, 0.002, 0.004], shade(paper, 0.8), GLOSS);
  for (let i = 0; i < lines; i++) {
    const w = 0.12 + ((i * 37) % 5) * 0.012;
    mb.box([-0.085 + w / 2, 0.004, -0.11 + i * 0.038], [w, 0.002, 0.006], ink, GLOSS);
  }
  return mb;
}

function photoMesh() {
  const mb = new MeshBuilder();
  mb.box([0, 0, 0], [0.07, 0.004, 0.24], [0.9, 0.88, 0.82], GLOSS);
  for (let i = 0; i < 4; i++) {
    const z = -0.088 + i * 0.058;
    mb.box([0, 0.003, z], [0.058, 0.002, 0.05], [0.16, 0.15, 0.17], GLOSS);
    // Two faces in each frame. In the last one, the second face is static.
    mb.box([-0.013, 0.005, z], [0.016, 0.002, 0.02], [0.7, 0.6, 0.52], GLOSS);
    mb.box([0.013, 0.005, z], [0.016, 0.002, 0.02], i === 3 ? [0.55, 0.58, 0.6] : [0.7, 0.6, 0.52], i === 3 ? GLOW : GLOSS);
  }
  return mb;
}

function keyMesh() {
  const mb = new MeshBuilder();
  // Bow (a ring of boxes), shaft and teeth, in brass, on a red string.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    mb.boxRot([Math.cos(a) * 0.028, 0, Math.sin(a) * 0.028 - 0.06], [0.018, 0.008, 0.012], -a, brass, GLOSS);
  }
  mb.box([0, 0, 0.0], [0.012, 0.008, 0.1], brass, GLOSS);
  mb.box([0.012, 0, 0.035], [0.014, 0.008, 0.01], brass, GLOSS);
  mb.box([0.01, 0, 0.018], [0.01, 0.008, 0.008], brass, GLOSS);
  for (let i = 0; i < 8; i++) mb.box([-0.01 - i * 0.012, 0.004, -0.09 - i * 0.008], [0.012, 0.004, 0.004], lanternRed, GLOSS);
  return mb;
}

/** Where to keep each inspect mesh so it fills the view: [mesh, size]. */
export function inspectOf(mb, size) {
  return { mesh: mb.build(), size };
}

// ---------- the hall ----------

function buildHall(mb, colliders) {
  // Checker floor, one tile per metre (also gives the flashlight vertices to land on).
  for (let x = -HALL.x; x < HALL.x; x++) {
    for (let z = HALL.zFar - 5; z < HALL.zNear; z++) {
      const c = (x + z) % 2 === 0 ? tileA : tileB;
      mb.quad([x, 0, z], [x + 1, 0, z], [x + 1, 0, z + 1], [x, 0, z + 1], c);
    }
  }
  // Side walls and the entrance wall, subdivided.
  const len = HALL.zNear - HALL.zFar;
  mb.quadGrid([-HALL.x, 0, HALL.zNear], [-HALL.x, 0, HALL.zFar], [-HALL.x, HALL.h, HALL.zFar], [-HALL.x, HALL.h, HALL.zNear], len, 4, wallCol);
  mb.quadGrid([HALL.x, 0, HALL.zFar], [HALL.x, 0, HALL.zNear], [HALL.x, HALL.h, HALL.zNear], [HALL.x, HALL.h, HALL.zFar], len, 4, wallCol);
  mb.quadGrid([HALL.x, 0, HALL.zNear], [-HALL.x, 0, HALL.zNear], [-HALL.x, HALL.h, HALL.zNear], [HALL.x, HALL.h, HALL.zNear], 8, 4, shade(wallCol, 0.8));
  // The entrance: a closed iron gate (you came in through the static, not the door).
  for (let x = -1.4; x <= 1.4; x += 0.2) mb.box([x, 1.3, HALL.zNear - 0.05], [0.04, 2.6, 0.04], metal);
  mb.box([0, 2.62, HALL.zNear - 0.05], [3, 0.08, 0.06], metal);
  // Far wall with the shutter opening (x in -1.2..1.2, up to 2.7 m).
  const zf = HALL.zFar;
  mb.quadGrid([-HALL.x, 0, zf], [-1.2, 0, zf], [-1.2, HALL.h, zf], [-HALL.x, HALL.h, zf], 5, 4, wallCol);
  mb.quadGrid([1.2, 0, zf], [HALL.x, 0, zf], [HALL.x, HALL.h, zf], [1.2, HALL.h, zf], 5, 4, wallCol);
  mb.quad([-1.2, 2.7, zf], [1.2, 2.7, zf], [1.2, HALL.h, zf], [-1.2, HALL.h, zf], wallCol);
  // Ceiling: dark boards and trusses.
  mb.quad([-HALL.x, HALL.h, HALL.zFar], [HALL.x, HALL.h, HALL.zFar], [HALL.x, HALL.h, HALL.zNear], [-HALL.x, HALL.h, HALL.zNear], shade(PALETTE.void, 2));
  for (let z = HALL.zNear - 2; z > HALL.zFar; z -= 4) {
    mb.box([0, HALL.h - 0.3, z], [HALL.x * 2, 0.2, 0.2], darkWood);
    mb.box([0, HALL.h - 0.9, z], [0.12, 1.2, 0.12], darkWood);
  }
  // Strings of lanterns run along both lanes; wires overhead.
  mb.box([-2.3, 3.9, (HALL.zNear + HALL.zFar) / 2], [0.01, 0.01, len], ink);
  mb.box([2.3, 3.9, (HALL.zNear + HALL.zFar) / 2], [0.01, 0.01, len], ink);

  colliders.push(
    { min: [-HALL.x - 1, HALL.zFar - 6], max: [-HALL.x, HALL.zNear + 1] },
    { min: [HALL.x, HALL.zFar - 6], max: [HALL.x + 1, HALL.zNear + 1] },
    { min: [-HALL.x, HALL.zNear], max: [HALL.x, HALL.zNear + 1] },
    { min: [-HALL.x, zf - 0.1], max: [-1.2, zf + 0.05] },
    { min: [1.2, zf - 0.1], max: [HALL.x, zf + 0.05] },
  );
}

/** The stairwell behind the shutter, where June waits. */
function buildStairwell(mb, colliders) {
  const z0 = HALL.zFar, z1 = HALL.zFar - 5;
  const w = 2;
  mb.quadGrid([-w, 0, z0], [-w, 0, z1], [-w, 3.2, z1], [-w, 3.2, z0], 5, 3, shade(wallCol, 0.7));
  mb.quadGrid([w, 0, z1], [w, 0, z0], [w, 3.2, z0], [w, 3.2, z1], 5, 3, shade(wallCol, 0.7));
  mb.quadGrid([-w, 0, z1], [w, 0, z1], [w, 3.2, z1], [-w, 3.2, z1], 4, 3, shade(wallCol, 0.6));
  mb.quad([-w, 3.2, z1], [w, 3.2, z1], [w, 3.2, z0], [-w, 3.2, z0], PALETTE.void);
  // Stairs going up into the dark, on the right.
  for (let i = 0; i < 8; i++) mb.box([1.2, 0.1 + i * 0.2, z0 - 1 - i * 0.45], [1.4, 0.2 + i * 0.4, 0.45], shade(stoneOf(), 1 - i * 0.06));
  // One bare bulb.
  mb.box([-0.5, 3.0, z0 - 2.5], [0.01, 0.4, 0.01], ink);
  mb.blob([-0.5, 2.75, z0 - 2.5], 0.06, 1.2, 6, 4, [1, 0.9, 0.7], GLOW);
  colliders.push(
    { min: [-w - 1, z1], max: [-w, z0] },
    { min: [w, z1], max: [w + 1, z0] },
    { min: [-w, z1 - 1], max: [w, z1] },
    { min: [0.5, z1], max: [w, z0 - 0.8] },
  );
}
const stoneOf = () => [0.21, 0.2, 0.19];

// ---------- stalls ----------

/**
 * Every stall gets a frame, an awning and partitions. Each one then gets its own
 * contents from STALL_CONTENTS. `side` is -1 (left) or 1 (right).
 */
function buildStallFrame(mb, colliders, side, i) {
  const zc = zCentre(i);
  const z0 = zc + STALL_W / 2, z1 = zc - STALL_W / 2;
  const xo = side * AISLE; // front edge
  const xb = side * HALL.x; // back wall
  // Partition between this stall and the next.
  mb.box([side * (AISLE + HALL.x) / 2, 1.3, z1], [HALL.x - AISLE, 2.6, 0.08], shade(wood, 0.8));
  colliders.push(footprint([side * (AISLE + HALL.x) / 2, 0, z1], [HALL.x - AISLE, 0, 0.12]));
  if (i === 0) {
    mb.box([side * (AISLE + HALL.x) / 2, 1.3, z0], [HALL.x - AISLE, 2.6, 0.08], shade(wood, 0.8));
    colliders.push(footprint([side * (AISLE + HALL.x) / 2, 0, z0], [HALL.x - AISLE, 0, 0.12]));
  }
  // Posts and a striped awning sloping down toward the aisle.
  mb.box([xo, 1.4, z0 - 0.06], [0.1, 2.8, 0.1], darkWood);
  mb.box([xo, 1.4, z1 + 0.06], [0.1, 2.8, 0.1], darkWood);
  colliders.push(footprint([xo, 0, z0 - 0.06], [0.14, 0, 0.14]), footprint([xo, 0, z1 + 0.06], [0.14, 0, 0.14]));
  const [ca, cb] = AWNINGS[(i * 3 + (side > 0 ? 1 : 0) * 5) % AWNINGS.length];
  const stripes = 6;
  for (let k = 0; k < stripes; k++) {
    const za = z0 - (k / stripes) * STALL_W, zb = z0 - ((k + 1) / stripes) * STALL_W;
    const c = k % 2 === 0 ? ca : cb;
    const xi = side * (AISLE + 0.9), xa = side * (AISLE - 0.5);
    mb.quad([xi, 3.05, za], [xi, 3.05, zb], [xa, 2.65, zb], [xa, 2.65, za], c);
    mb.quad([xa, 2.65, za], [xa, 2.65, zb], [xa, 2.45, zb], [xa, 2.45, za], shade(c, 0.8)); // valance
  }
  // A sign board above the awning, softly lit, in the stall's colour.
  mb.box([side * (AISLE + 0.95), 3.45, zc], [0.06, 0.45, 2.2], mix(ca, [1, 0.9, 0.7], 0.3), GLOW * 0.55);
  // Back shelf.
  mb.box([xb - side * 0.22, 1.1, zc], [0.4, 2.2, STALL_W - 0.4], shade(wood, 0.9));
  for (const y of [0.6, 1.2, 1.8]) mb.box([xb - side * 0.42, y, zc], [0.04, 0.04, STALL_W - 0.5], darkWood);
  colliders.push(footprint([xb - side * 0.22, 0, zc], [0.44, 0, STALL_W - 0.4]));
  return { zc, xo, xb };
}

/** A counter along the stall front with a gap at the far end, so the stall can be entered. */
function counter(mb, colliders, side, zc, color = wood) {
  const len = 2.4;
  const cz = zc + 0.6; // gap is at the far (lower z) end
  const cx = side * (AISLE + 0.25);
  mb.box([cx, 0.5, cz], [0.5, 1.0, len], color);
  mb.box([cx, 1.02, cz], [0.6, 0.04, len + 0.1], shade(color, 1.25));
  colliders.push(footprint([cx, 0, cz], [0.5, 0, len], true));
  return { cx, cz, top: 1.04 };
}

/** A drawer in the counter's aisle face. Returns a part; its mesh is drawn at the closed position. */
function counterDrawer(id, side, cx, cz) {
  const mb = new MeshBuilder();
  const centre = [cx - side * 0.02, 0.8, cz];
  mb.box(centre, [0.44, 0.16, 0.5], shade(wood, 0.75));
  mb.box([cx - side * 0.25, 0.8, cz], [0.02, 0.17, 0.52], shade(wood, 1.15)); // front
  mb.box([cx - side * 0.27, 0.8, cz], [0.03, 0.03, 0.12], brass, GLOW * 0.3); // handle
  return {
    id, kind: 'drawer', label: 'the drawer',
    mesh: mb.build(),
    bounds: grow(boundsOf([cx - side * 0.2, 0.8, cz], [0.2, 0.2, 0.56]), 0.06),
    transform: (k) => translation([-side * 0.38 * k, 0, 0]),
  };
}

/** A small box on a counter with a lid hinged along its back edge (cash tin, music box). */
function lidBox(id, label, side, [x, y, z], size, color, lidColor) {
  const [sx, sy, sz] = size;
  const body = new MeshBuilder();
  body.box([x, y + sy / 2, z], [sx, sy, sz], color);
  body.box([x, y + sy - 0.005, z], [sx - 0.02, 0.01, sz - 0.02], shade(color, 0.4)); // inside, dark
  const lid = new MeshBuilder();
  lid.box([x, y + sy + 0.012, z], [sx + 0.01, 0.024, sz + 0.01], lidColor);
  const hinge = [x + side * sx / 2, y + sy + 0.012, z];
  return {
    body: body.build(),
    part: {
      id, kind: 'lid', label,
      mesh: lid.build(),
      bounds: grow(boundsOf([x, y + sy / 2, z], [sx, sy + 0.05, sz]), 0.1),
      // The hinge is on the far side from the aisle; the aisle edge swings up.
      transform: (k) => rotationAbout(hinge, 'z', -side * 1.9 * k),
    },
  };
}

function lantern(mb, [x, y, z], color = lanternRed, r = 0.22) {
  mb.box([x, y + r + 0.25, z], [0.01, 0.5, 0.01], ink);
  mb.blob([x, y, z], r, 1.15, 8, 5, color, GLOW, 6);
  mb.box([x, y + r * 1.1, z], [r * 0.7, 0.04, r * 0.7], ink);
  mb.box([x, y - r * 1.1, z], [r * 0.6, 0.04, r * 0.6], ink);
}

// ---------- the whole level ----------

export function buildMarket() {
  const mb = new MeshBuilder();
  const colliders = [];
  const parts = [];
  const items = [];
  const hides = [];
  const lights = [];
  const statics = []; // extra static meshes (bodies of lid boxes)

  buildHall(mb, colliders);
  buildStairwell(mb, colliders);

  // Lanterns over both lanes.
  for (let i = 0; i < STALLS; i++) {
    for (const x of [-2.3, 2.3]) {
      const pos = [x, 3.35, zCentre(i) + (x > 0 ? 0.9 : -0.9)];
      lantern(mb, pos);
      lights.push({ pos: [pos[0], pos[1] - 0.4, pos[2]], color: [1, 0.5, 0.3] });
    }
  }

  const frames = {};
  for (const side of [-1, 1]) for (let i = 0; i < STALLS; i++) frames[`${side}:${i}`] = buildStallFrame(mb, colliders, side, i);
  const F = (side, i) => frames[`${side}:${i}`];

  // --- L0: noodles. A pot, bowls, and a cash tin with the first note. ---
  {
    const { zc } = F(-1, 0);
    const c = counter(mb, colliders, -1, zc, shade(wood, 1.1));
    mb.blob([c.cx, c.top + 0.16, c.cz - 0.6], 0.2, 0.8, 8, 4, metal);
    for (let k = 0; k < 3; k++) mb.blob([c.cx + 0.05, c.top + 0.04, c.cz + 0.2 + k * 0.22], 0.08, 0.5, 8, 3, [0.8, 0.78, 0.7]);
    const tin = lidBox('noodle-tin', 'the cash tin', -1, [c.cx, c.top, c.cz + 0.95], [0.26, 0.1, 0.2], [0.3, 0.45, 0.4], [0.34, 0.5, 0.44]);
    statics.push(tin.body);
    parts.push(tin.part);
    items.push({
      id: 'note-noodles', kind: 'note', name: 'a folded note', inside: 'noodle-tin',
      pos: [c.cx, c.top + 0.105, c.cz + 0.95], size: [0.16, 0.012, 0.12], color: paper,
      text: "june ordered two bowls again. one for her, one for me. i was sitting right across from her. she looked straight through me and said, she'll be here soon.",
      checkpoint: { pos: [-2.4, zc], yaw: 0 },
      inspect: inspectOf(noteMesh(6), 0.3),
    });
    lights.push({ pos: [c.cx, 2.2, zc], color: [1, 0.7, 0.4], weight: 0.7 });
  }

  // --- R0: fruit. Crates of oranges. ---
  {
    const { zc } = F(1, 0);
    const c = counter(mb, colliders, 1, zc, shade(wood, 0.95));
    for (let k = 0; k < 3; k++) {
      mb.box([c.cx, c.top + 0.1, c.cz - 0.8 + k * 0.8], [0.5, 0.2, 0.6], shade(wood, 1.3));
      for (let q = 0; q < 4; q++) mb.blob([c.cx - 0.12 + (q % 2) * 0.24, c.top + 0.24, c.cz - 0.95 + k * 0.8 + Math.floor(q / 2) * 0.3], 0.08, 1, 6, 4, PALETTE.pumpkin);
    }
  }

  // --- L1: lanterns for sale, hanging everywhere. ---
  {
    const { zc } = F(-1, 1);
    counter(mb, colliders, -1, zc, darkWood);
    const colours = [lanternRed, [0.9, 0.6, 0.15], [0.85, 0.3, 0.4], [0.3, 0.5, 0.8]];
    for (let k = 0; k < 6; k++) lantern(mb, [-4.4 - (k % 2) * 0.8, 2.2 - (k % 3) * 0.15, zc - 1.2 + k * 0.45], colours[k % 4], 0.16);
    lights.push({ pos: [-4.8, 2, zc], color: [1, 0.55, 0.3], weight: 0.9 });
  }

  // --- R1: shuttered. ---
  shutterStall(mb, colliders, 1, F(1, 1).zc);

  // --- L2: fabric. Bolts of cloth and hanging panels. ---
  {
    const { zc } = F(-1, 2);
    const c = counter(mb, colliders, -1, zc, shade(wood, 0.9));
    const cloth = [[0.5, 0.1, 0.12], [0.12, 0.3, 0.32], [0.6, 0.48, 0.2], [0.3, 0.12, 0.34]];
    for (let k = 0; k < 4; k++) mb.box([c.cx, c.top + 0.08, c.cz - 0.9 + k * 0.6], [0.4, 0.16, 0.5], cloth[k]);
    for (let k = 0; k < 4; k++) mb.box([-4.6 - (k % 2) * 0.6, 1.5, zc - 1.2 + k * 0.7], [0.02, 1.8, 0.5], cloth[(k + 1) % 4]);
  }

  // --- R2: clocks. Every one of them says 00:00. A drawer holds the third note. ---
  {
    const { zc, xb } = F(1, 2);
    const c = counter(mb, colliders, 1, zc, darkWood);
    for (let k = 0; k < 9; k++) {
      const y = 1.0 + Math.floor(k / 3) * 0.55, z = zc - 1.0 + (k % 3) * 1.0;
      const x = xb - 0.46;
      clockFace(mb, [x, y, z], 0.18 + (k % 2) * 0.05);
    }
    clockFace(mb, [c.cx, c.top + 0.2, c.cz - 0.6], 0.14, true);
    const d = counterDrawer('clock-drawer', 1, c.cx, c.cz + 0.5);
    parts.push(d);
    items.push({
      id: 'note-clocks', kind: 'note', name: 'a note in pencil', inside: 'clock-drawer',
      pos: [c.cx - 0.02, 0.86, c.cz + 0.5], size: [0.16, 0.02, 0.14], color: paper,
      text: "every clock in this stall stopped when we walked past. june didn't notice. i'm writing things down now, so i can't lose them. my name is edith. my sister is june. we are twins.",
      checkpoint: { pos: [2.4, zc], yaw: 0 },
      inspect: inspectOf(noteMesh(7), 0.3),
    });
  }

  // --- L3: the fortune teller. A curtained booth; a table inside with a drawer. ---
  {
    const { zc } = F(-1, 3);
    const curtain = [0.32, 0.08, 0.2];
    // Curtain across the front, open at the near end so you can walk in.
    for (let k = 0; k < 5; k++) mb.box([-AISLE - 0.1, 1.35, zc - 1.6 + k * 0.5], [0.04, 2.5, 0.48], shade(curtain, 0.9 + (k % 2) * 0.2));
    colliders.push(footprint([-AISLE - 0.1, 0, zc - 0.6], [0.1, 0, 2.5]));
    // Table, two chairs, a crystal ball.
    const tx = -4.9;
    mb.box([tx, 0.72, zc], [0.9, 0.06, 0.9], shade(curtain, 0.6));
    mb.box([tx, 0.36, zc], [0.8, 0.7, 0.8], shade(curtain, 0.45));
    mb.blob([tx, 0.88, zc], 0.11, 1, 8, 5, [0.5, 0.6, 0.8], GLOW * 0.6);
    mb.box([tx - 0.75, 0.45, zc], [0.4, 0.9, 0.4], darkWood); // her chair
    mb.box([tx + 0.75, 0.25, zc], [0.4, 0.5, 0.4], darkWood); // the empty chair
    colliders.push(footprint([tx, 0, zc], [0.9, 0, 0.9]));
    const mbD = new MeshBuilder();
    const dx = tx + 0.44;
    mbD.box([dx - 0.18, 0.6, zc], [0.36, 0.12, 0.5], shade(wood, 0.7));
    mbD.box([dx + 0.01, 0.6, zc], [0.02, 0.13, 0.52], shade(curtain, 0.8));
    mbD.box([dx + 0.03, 0.6, zc], [0.03, 0.03, 0.1], brass, GLOW * 0.3);
    parts.push({
      id: 'fortune-drawer', kind: 'drawer', label: 'the drawer',
      mesh: mbD.build(),
      bounds: grow(boundsOf([dx, 0.6, zc], [0.16, 0.16, 0.56]), 0.06),
      transform: (k) => translation([0.32 * k, 0, 0]),
    });
    items.push({
      id: 'note-fortune', kind: 'note', name: 'a note, torn from a book', inside: 'fortune-drawer',
      pos: [dx - 0.15, 0.665, zc], size: [0.14, 0.02, 0.14], color: paper,
      text: "the fortune teller wouldn't take june's hand. she said, there's no one sitting in that chair, love. then she looked at me and said, go home before you forget the way.",
      checkpoint: { pos: [-2.4, zc], yaw: 0 },
      inspect: inspectOf(noteMesh(6), 0.3),
    });
    hides.push({
      id: 'fortune-curtain', label: 'hide behind the curtain',
      // At the curtain's open end; hiding puts you just behind it, looking out through the gap.
      bounds: grow(boundsOf([-AISLE - 0.1, 1.3, zc + 0.45], [0.12, 2.4, 0.4]), 0.08),
      view: { pos: [-AISLE - 0.4, 1.25, zc + 0.2], yaw: Math.PI / 2 + 0.55, pitch: -0.05 },
      exit: { pos: [-AISLE + 0.5, zc + 1.2], yaw: 0 },
    });
    lights.push({ pos: [tx, 1.4, zc], color: [0.5, 0.55, 0.9], weight: 0.6 });
  }

  // --- R3: masks. Pale faces on the back wall, watching the aisle. ---
  {
    const { zc, xb } = F(1, 3);
    counter(mb, colliders, 1, zc, darkWood);
    for (let k = 0; k < 8; k++) {
      const y = 1.1 + Math.floor(k / 4) * 0.6, z = zc - 1.2 + (k % 4) * 0.8;
      const x = xb - 0.46;
      mb.box([x, y, z], [0.03, 0.34, 0.24], [0.82, 0.78, 0.72]);
      mb.box([x - 0.02, y + 0.05, z - 0.05], [0.02, 0.05, 0.05], PALETTE.void);
      mb.box([x - 0.02, y + 0.05, z + 0.05], [0.02, 0.05, 0.05], PALETTE.void);
      mb.box([x - 0.02, y - 0.08, z], [0.02, 0.02, 0.08], k % 3 === 0 ? lanternRed : shade(PALETTE.void, 3));
    }
  }

  // --- L4: toys. Shelves of tin toys; a music box with the fourth note. ---
  {
    const { zc, xb } = F(-1, 4);
    const c = counter(mb, colliders, -1, zc, shade(wood, 1.05));
    const toy = [[0.7, 0.2, 0.15], [0.2, 0.4, 0.7], [0.8, 0.7, 0.2], [0.3, 0.6, 0.3]];
    for (let k = 0; k < 9; k++) mb.box([xb + 0.42, 0.7 + Math.floor(k / 3) * 0.6, zc - 1.1 + (k % 3) * 1.0], [0.2, 0.2, 0.25], toy[k % 4]);
    const box = lidBox('music-box', 'the music box', -1, [c.cx, c.top, c.cz + 0.2], [0.24, 0.12, 0.3], [0.45, 0.2, 0.22], [0.55, 0.26, 0.28]);
    statics.push(box.body);
    parts.push(box.part);
    items.push({
      id: 'note-musicbox', kind: 'note', name: 'a note, folded small', inside: 'music-box',
      pos: [c.cx, c.top + 0.125, c.cz + 0.2], size: [0.12, 0.012, 0.12], color: paper,
      text: "june gave me this music box when we were nine. i remember the box. i don't remember the song anymore. she has gone toward the back, to the stairs. the key is with the radio man. i left it there so i would have to remember.",
      checkpoint: { pos: [-2.4, zc], yaw: 0 },
      inspect: inspectOf(noteMesh(8), 0.3),
    });
  }

  // --- R4: tapes and records. A small TV showing static. ---
  {
    const { zc, xb } = F(1, 4);
    const c = counter(mb, colliders, 1, zc, darkWood);
    for (let k = 0; k < 24; k++) mb.box([xb - 0.46, 0.7 + Math.floor(k / 8) * 0.6, zc - 1.4 + (k % 8) * 0.38], [0.12, 0.2, 0.03], k % 5 === 0 ? PALETTE.tapeLabel : [0.1, 0.1, 0.12]);
    mb.box([c.cx, c.top + 0.2, c.cz - 0.6], [0.4, 0.38, 0.4], [0.12, 0.11, 0.1]);
    mb.box([c.cx - 0.21, c.top + 0.22, c.cz - 0.6], [0.01, 0.26, 0.3], PALETTE.crtGlow, GLOW);
    lights.push({ pos: [c.cx - 0.6, c.top + 0.3, c.cz - 0.6], color: [0.5, 0.8, 0.7], weight: 0.6 });
  }

  // --- L5: shuttered. R5: dumplings. ---
  shutterStall(mb, colliders, -1, F(-1, 5).zc);
  {
    const { zc } = F(1, 5);
    const c = counter(mb, colliders, 1, zc, shade(wood, 1.1));
    for (let k = 0; k < 3; k++) for (let h = 0; h < 3; h++) mb.box([c.cx, c.top + 0.06 + h * 0.12, c.cz - 0.8 + k * 0.7], [0.36, 0.11, 0.36], shade([0.7, 0.55, 0.3], 1 - h * 0.1));
    lights.push({ pos: [c.cx, 2.0, zc], color: [1, 0.7, 0.4], weight: 0.6 });
  }

  // --- L6: tea. R6: radio repair, with June's key in the cabinet. ---
  {
    const { zc } = F(-1, 6);
    const c = counter(mb, colliders, -1, zc, darkWood);
    for (let k = 0; k < 5; k++) mb.box([c.cx, c.top + 0.1, c.cz - 0.9 + k * 0.45], [0.18, 0.2, 0.18], [[0.5, 0.2, 0.1], [0.2, 0.3, 0.2], [0.6, 0.5, 0.3]][k % 3]);
  }
  {
    const { zc, xb } = F(1, 6);
    const c = counter(mb, colliders, 1, zc, shade(wood, 0.8));
    for (let k = 0; k < 9; k++) {
      const y = 0.75 + Math.floor(k / 3) * 0.6, z = zc - 1.1 + (k % 3) * 1.0;
      mb.box([xb - 0.5, y, z], [0.3, 0.3, 0.5], [0.3, 0.2, 0.14]);
      mb.box([xb - 0.66, y + 0.05, z], [0.01, 0.08, 0.3], [0.9, 0.6, 0.2], GLOW * 0.8);
    }
    // The cabinet on the counter, its door on the aisle side.
    const cab = [c.cx, c.top + 0.28, c.cz + 0.4];
    mb.box(cab, [0.42, 0.56, 0.6], shade(wood, 0.6), 0, ['nx']);
    mb.box([cab[0] + 0.19, cab[1], cab[2]], [0.02, 0.5, 0.54], shade(PALETTE.void, 2)); // dark back panel
    mb.box([cab[0] + 0.16, cab[1] + 0.12, cab[2]], [0.04, 0.02, 0.02], brass); // the hook
    const door = new MeshBuilder();
    const fx = cab[0] - 0.215;
    door.box([fx, cab[1], cab[2]], [0.03, 0.56, 0.6], shade(wood, 0.9));
    door.box([fx - 0.02, cab[1], cab[2] - 0.22], [0.02, 0.1, 0.03], brass, GLOW * 0.3);
    const hinge = [fx, cab[1], cab[2] + 0.3];
    parts.push({
      id: 'radio-cabinet', kind: 'door', label: 'the cabinet',
      mesh: door.build(),
      bounds: grow(boundsOf(cab, [0.44, 0.58, 0.62]), 0.06),
      transform: (k) => rotationAbout(hinge, 'y', 1.8 * k), // the free edge swings out into the aisle
    });
    items.push({
      id: 'key', kind: 'key', name: "june's key", inside: null,
      pos: [cab[0] + 0.14, cab[1] + 0.02, cab[2]], size: [0.02, 0.16, 0.05], color: brass, needsOpen: 'radio-cabinet',
      text: "a small brass key on a red string. it's warm, as if someone just let go of it.",
      checkpoint: { pos: [2.4, zc], yaw: 0 },
      inspect: inspectOf(keyMesh(), 0.3),
    });
    lights.push({ pos: [xb - 1, 1.4, zc], color: [0.9, 0.6, 0.25], weight: 0.6, radio: true });
  }

  // --- L7: the photo booth, with the strip of the twins. R7: an empty stall with a mirror. ---
  {
    const { zc } = F(-1, 7);
    const bx = -4.9;
    const booth = [0.5, 0.42, 0.2];
    mb.box([bx, 1.1, zc - 0.75], [1.4, 2.2, 0.06], booth);
    mb.box([bx, 1.1, zc + 0.75], [1.4, 2.2, 0.06], booth);
    mb.box([bx - 0.7, 1.1, zc], [0.06, 2.2, 1.5], booth);
    mb.box([bx, 2.22, zc], [1.4, 0.06, 1.56], shade(booth, 0.8));
    mb.box([bx - 0.3, 0.45, zc], [0.6, 0.06, 1.3], shade(wood, 0.7)); // the seat
    mb.box([bx + 0.72, 1.6, zc + 0.35], [0.04, 1.2, 0.7], lanternRed); // curtain, half drawn
    mb.box([bx - 0.65, 1.5, zc], [0.04, 0.3, 0.4], [0.2, 0.2, 0.22], GLOW * 0.4); // the camera window
    mb.box([bx + 0.72, 2.0, zc - 0.5], [0.04, 0.3, 0.5], [0.95, 0.9, 0.7], GLOW); // "PHOTO" light
    colliders.push(footprint([bx, 0, zc - 0.75], [1.4, 0, 0.1]), footprint([bx, 0, zc + 0.75], [1.4, 0, 0.1]), footprint([bx - 0.7, 0, zc], [0.1, 0, 1.5]));
    items.push({
      id: 'photo', kind: 'photo', name: 'a strip of photos', inside: null,
      pos: [bx - 0.3, 0.5, zc - 0.2], size: [0.08, 0.02, 0.24], color: [0.9, 0.88, 0.82],
      text: "four pictures, two girls in each. in the last one, one of the faces is only static. on the back, in pencil: oct 30 1970. the last day we both remember.",
      checkpoint: { pos: [-2.4, zc], yaw: 0 },
      inspect: inspectOf(photoMesh(), 0.26),
    });
    hides.push({
      id: 'photo-booth', label: 'hide in the photo booth',
      bounds: grow(boundsOf([bx + 0.4, 1.1, zc], [0.5, 2.0, 1.2]), 0.1),
      view: { pos: [bx - 0.1, 1.05, zc - 0.1], yaw: Math.PI / 2, pitch: -0.05 },
      exit: { pos: [-AISLE + 0.2, zc], yaw: Math.PI / 2 },
    });
    lights.push({ pos: [bx + 0.3, 1.8, zc], color: [1, 0.9, 0.7], weight: 0.7 });
  }
  {
    const { zc, xb } = F(1, 7);
    mb.box([xb - 0.3, 1.4, zc], [0.04, 1.6, 0.9], [0.4, 0.46, 0.52], GLOW * 0.25); // the mirror
    mb.box([xb - 0.28, 1.4, zc], [0.06, 1.7, 1.0], darkWood);
  }

  // --- Aisle: tables and stools. One table has a long cloth, to hide under. ---
  for (const [z, cloth] of [[-4.2, false], [-10.2, false], [-16.0, true], [-22.0, false]]) {
    const top = cloth ? [0.45, 0.1, 0.1] : shade(wood, 1.2);
    mb.box([0, 0.74, z], [1.8, 0.06, 1.0], top);
    if (cloth) {
      // The cloth stops short of the floor: from under it you see feet go by.
      mb.box([0, 0.43, z], [1.84, 0.62, 1.04], shade(top, 0.8));
      hides.push({
        id: 'cloth-table', label: 'hide under the table',
        bounds: grow(boundsOf([0, 0.4, z], [1.84, 0.8, 1.04]), 0.15),
        view: { pos: [0, 0.07, z + 0.25], yaw: Math.PI, pitch: 0.02 },
        exit: { pos: [0, z + 1.0], yaw: 0 },
        low: true,
      });
    } else {
      for (const lx of [-0.8, 0.8]) for (const lz of [-0.42, 0.42]) mb.box([lx, 0.36, z + lz], [0.05, 0.72, 0.05], darkWood);
      mb.blob([0.3, 0.82, z], 0.07, 0.6, 8, 3, [0.8, 0.78, 0.7]);
    }
    colliders.push(footprint([0, 0, z], [1.8, 0, 1.0], true));
    for (const [sx, sz] of [[-1.3, -0.3], [1.3, 0.25], [-1.3, 0.35], [1.25, -0.4]]) {
      mb.box([sx, 0.24, z + sz], [0.34, 0.48, 0.34], shade(darkWood, 1.2));
      colliders.push(footprint([sx, 0, z + sz], [0.34, 0, 0.34], true));
    }
  }

  // --- The shutter at the far end (opens with June's key), and June. ---
  const shutterMesh = new MeshBuilder();
  for (let k = 0; k < 13; k++) shutterMesh.box([0, 0.1 + k * 0.2, HALL.zFar], [2.4, 0.18, 0.06], shade(metal, 0.9 + (k % 2) * 0.15));
  shutterMesh.box([0, 0.15, HALL.zFar + 0.05], [0.2, 0.08, 0.04], brass, GLOW * 0.3); // the lock
  parts.push({
    id: 'shutter', kind: 'shutter', label: 'the shutter',
    mesh: shutterMesh.build(),
    bounds: grow(boundsOf([0, 1.3, HALL.zFar], [2.4, 2.6, 0.2]), 0.1),
    transform: (k) => translation([0, 2.45 * k, 0]),
    collider: { min: [-1.2, HALL.zFar - 0.1], max: [1.2, HALL.zFar + 0.06] },
    needs: 'key',
    lockedText: "it's locked. june had a key on a red string.",
    oneWay: true,
    openLine: 'the shutter rolls up. the stairwell is cold.',
  });

  const mesh = new MeshBuilder();
  mesh.append(mb);
  const staticMesh = mesh.build();

  return {
    id: 'market',
    title: 'the night market',
    date: 'OCT 30 1970',
    clockStart: (23 * 60 + 41) * 60,
    mesh: staticMesh,
    extra: statics,
    parts,
    items,
    hides,
    colliders,
    lights,
    start: { pos: [0, 2.6], yaw: 0 },
    checkpoints: { entrance: { pos: [0, 2.6], yaw: 0 } },
    // The presence walks the lanes in a loop, from the far end.
    route: [[2.3, -27], [2.3, -14], [2.3, -2], [-2.3, -2], [-2.3, -14], [-2.3, -27], [0, -27.6]],
    wakeAfterNotes: 2,
    june: { pos: [0, -33.2], yaw: 0, glimpse: { pos: [-2.3, -12.6], until: -11 } },
    exitPart: 'shutter',
    exitTrigger: { pos: [0, -32], radius: 1.7 },
    ambient: [0.11, 0.08, 0.09],
    fog: { color: [0.035, 0.025, 0.035], near: 5, far: 26 },
    lantern: { color: [1, 0.5, 0.3], intensity: 1.15, range: 6.5 },
    endLines: [
      "she doesn't turn around.",
      'you try to remember her voice. there is only static.',
      'june was the first thing edith forgot.',
    ],
    lines: {
      start: 'the market is closing. june is somewhere ahead.',
      glimpse: 'june? wait.',
      wake: 'the lanterns flicker. someone else is walking the aisles.',
      caught: 'the tape skips back.',
    },
  };
}

function shutterStall(mb, colliders, side, zc) {
  const x = side * (AISLE + 0.05);
  for (let k = 0; k < 13; k++) mb.box([x, 0.1 + k * 0.2, zc], [0.06, 0.18, STALL_W - 0.1], shade(metal, 0.8 + (k % 2) * 0.12));
  colliders.push(footprint([x, 0, zc], [0.1, 0, STALL_W]));
}

export function clockFace(mb, [x, y, z], r, standing = false) {
  // A round face toward the aisle (-x for the right row), hands both pointing up: 00:00.
  const segs = 10;
  const face = [0.86, 0.82, 0.7];
  for (let k = 0; k < segs; k++) {
    const a0 = (k / segs) * Math.PI * 2, a1 = ((k + 1) / segs) * Math.PI * 2;
    mb.tri([x, y, z], [x, y + Math.cos(a0) * r, z + Math.sin(a0) * r], [x, y + Math.cos(a1) * r, z + Math.sin(a1) * r], face, GLOW * 0.35);
  }
  mb.box([x + 0.01, y, z], [0.02, r * 2.1, r * 2.1], darkWood);
  mb.box([x - 0.012, y + r * 0.35, z], [0.008, r * 0.7, 0.02], ink); // hour hand at 12
  mb.box([x - 0.016, y + r * 0.42, z], [0.008, r * 0.85, 0.012], ink); // minute hand at 12
  if (standing) mb.box([x, y - r - 0.06, z], [0.1, 0.12, 0.2], darkWood);
}

/** A small mesh for an item in the world: a flat box in its own colour. */
export function buildItemMesh(item) {
  const mb = new MeshBuilder();
  mb.box(item.pos, item.size, item.color, GLOW * 0.15);
  return mb.build();
}

export { buildFigure } from './figures.js';
export const MARKET_ITEM_IDS = ['note-noodles', 'note-fortune', 'note-clocks', 'note-musicbox', 'photo', 'key'];
export const MARKET_NOTE_IDS = ['note-noodles', 'note-fortune', 'note-clocks', 'note-musicbox'];
export { UNFOGGED };
