// The school at night, March 14 1962: a corridor of lockers with tall windows
// onto the storm, the twins' classroom, the music room, the girls' bathroom, and
// a chained door to the stairs. Someone with a lamp walks the corridor.
// Spec: .kiro/specs/memories (Requirement 8)
//
// Coordinates: the corridor runs from the start (z = 3) to the stair door (z = -30),
// x in -1.5..2. Rooms open off it: the classroom and music room at x < -1.5,
// the bathroom at x > 2. Windows are on the x = 2 wall.

import { MeshBuilder } from '../../render/mesh.js';
import { translation, rotationAbout } from '../../render/math.js';
import { PALETTE, shade, GLOW, SKY } from '../house/palette.js';
import { boundsOf, grow, footprint, noteMesh, inspectOf, clockFace } from './market.js';
import { COAT_GREY, UNIFORM } from './figures.js';

const GLOSS = 7;
const H = 3.2;
const C = { x0: -1.5, x1: 2, zNear: 3, zFar: -30 };

const floorA = [0.2, 0.2, 0.18];
const floorB = [0.14, 0.15, 0.14];
const wallLow = [0.16, 0.22, 0.2]; // the green paint below the dado rail
const wallHigh = [0.42, 0.4, 0.34];
const wood = PALETTE.rotWood;
const lockerCol = [0.22, 0.3, 0.36];
const metal = [0.3, 0.32, 0.34];
const chalk = [0.82, 0.84, 0.8];
const board = [0.07, 0.14, 0.11];
const paper = [0.86, 0.8, 0.66];
const ink = [0.12, 0.1, 0.12];
const brass = [0.7, 0.52, 0.22];
const red = [0.7, 0.14, 0.1];
const tileWhite = [0.5, 0.52, 0.5];

/** A wall along z (constant x) from z0 to z1, two-tone, with gaps [za, zb] left open (doorways). */
function wallZ(mb, x, z0, z1, gaps = [], facing = 1) {
  const cuts = [z0, ...gaps.flat(), z1].sort((a, b) => b - a);
  for (let i = 0; i < cuts.length - 1; i += 2) {
    const a = cuts[i], b = cuts[i + 1];
    const n = Math.max(1, Math.round(a - b));
    const q = (y0, y1, c) => (facing > 0
      ? mb.quadGrid([x, y0, a], [x, y0, b], [x, y1, b], [x, y1, a], n, 1, c)
      : mb.quadGrid([x, y0, b], [x, y0, a], [x, y1, a], [x, y1, b], n, 1, c));
    q(0, 1.1, wallLow);
    q(1.1, H, wallHigh);
    mb.box([x + facing * 0.02, 1.1, (a + b) / 2], [0.04, 0.05, a - b], shade(wood, 0.8)); // dado rail
  }
  // Lintels over the doorways.
  for (const [za, zb] of gaps) mb.quad([x, 2.3, za], [x, 2.3, zb], [x, H, zb], [x, H, za], wallHigh);
}

/** A wall along x (constant z). */
function wallX(mb, z, x0, x1, gaps = []) {
  const cuts = [x0, ...gaps.flat(), x1].sort((a, b) => a - b);
  for (let i = 0; i < cuts.length - 1; i += 2) {
    const a = cuts[i], b = cuts[i + 1];
    const n = Math.max(1, Math.round(b - a));
    mb.quadGrid([a, 0, z], [b, 0, z], [b, 1.1, z], [a, 1.1, z], n, 1, wallLow);
    mb.quadGrid([a, 1.1, z], [b, 1.1, z], [b, H, z], [a, H, z], n, 1, wallHigh);
  }
  for (const [xa, xb] of gaps) mb.quad([xa, 2.3, z], [xb, 2.3, z], [xb, H, z], [xa, H, z], wallHigh);
}

function floor(mb, x0, x1, z0, z1) {
  for (let x = Math.floor(x0); x < x1; x++) {
    for (let z = Math.floor(z1); z < z0; z++) {
      const xa = Math.max(x, x0), xb = Math.min(x + 1, x1), za = Math.max(z, z1), zb = Math.min(z + 1, z0);
      if (xb <= xa || zb <= za) continue;
      mb.quad([xa, 0, za], [xb, 0, za], [xb, 0, zb], [xa, 0, zb], (x + z) % 2 === 0 ? floorA : floorB);
    }
  }
  mb.quad([x0, H, z1], [x1, H, z1], [x1, H, z0], [x0, H, z0], shade(wallHigh, 0.5));
}

/** A tube light on the ceiling: an emissive box, and a light entry. */
function tube(mb, lights, pos, color = [0.85, 0.95, 0.9], weight = 1, flicker = false) {
  mb.box([pos[0], H - 0.05, pos[2]], [0.14, 0.06, 1.2], color, GLOW);
  lights.push({ pos: [pos[0], H - 0.4, pos[2]], color, weight, flicker });
}

// ---------- inspect objects ----------

function classPhotoMesh() {
  const mb = new MeshBuilder();
  mb.box([0, 0, 0], [0.26, 0.004, 0.18], [0.9, 0.88, 0.82], GLOSS);
  mb.box([0, 0.003, 0], [0.24, 0.002, 0.16], [0.2, 0.2, 0.22], GLOSS);
  // Three rows of small faces. In the front row, two faces side by side; one is scratched out.
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 8; i++) {
      const x = -0.098 + i * 0.028, z = -0.05 + row * 0.045;
      const scratched = row === 2 && i === 4;
      mb.box([x, 0.005, z], [0.014, 0.002, 0.018], scratched ? [0.05, 0.05, 0.06] : [0.72, 0.62, 0.54], GLOSS);
      if (scratched) for (let k = 0; k < 3; k++) mb.boxRot([x, 0.007, z], [0.024, 0.001, 0.002], 0.6 + k * 0.9, [0.9, 0.9, 0.86], GLOW);
    }
  }
  return mb;
}

function keyRingMesh() {
  const mb = new MeshBuilder();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    mb.boxRot([Math.cos(a) * 0.05, 0, Math.sin(a) * 0.05], [0.026, 0.008, 0.008], -a + Math.PI / 2, metal, GLOSS);
  }
  // Five keys hanging off the ring; one has a red tag.
  for (let k = 0; k < 5; k++) {
    const a = -0.9 + k * 0.45;
    const cx = Math.cos(a) * 0.05, cz = Math.sin(a) * 0.05 + 0.05;
    const col = k === 2 ? brass : shade(metal, 1.3);
    mb.boxRot([cx + Math.sin(a) * 0.04, 0, cz + 0.04], [0.012, 0.008, 0.09], -a * 0.3, col, GLOSS);
    mb.boxRot([cx + Math.sin(a) * 0.04 + 0.008, 0, cz + 0.07], [0.012, 0.008, 0.012], -a * 0.3, col, GLOSS);
  }
  mb.box([0.0, 0.005, 0.19], [0.05, 0.006, 0.035], red, GLOSS);
  return mb;
}

// ---------- furniture ----------

/** A lift-top school desk, the student facing -x (toward the blackboard). Returns its lid part. */
function desk(mb, colliders, [x, z], id = null) {
  const top = 0.72;
  mb.box([x, top / 2, z], [0.5, top, 0.6], shade(wood, 0.9));
  mb.box([x, top + 0.005, z], [0.52, 0.01, 0.62], shade(wood, 0.5)); // dark inside, under the lid
  mb.box([x + 0.48, 0.22, z], [0.36, 0.04, 0.36], shade(wood, 1.1)); // chair seat
  mb.box([x + 0.65, 0.45, z], [0.04, 0.5, 0.36], shade(wood, 1.1)); // chair back
  for (const dz of [-0.16, 0.16]) for (const dx of [0.33, 0.63]) mb.box([x + dx, 0.11, z + dz], [0.03, 0.22, 0.03], metal);
  colliders.push(footprint([x, 0, z], [0.5, 0, 0.6], true), footprint([x + 0.5, 0, z], [0.38, 0, 0.38], true));
  const lid = new MeshBuilder();
  lid.box([x, top + 0.025, z], [0.52, 0.03, 0.62], shade(wood, 1.15));
  lid.box([x - 0.2, top + 0.045, z + 0.2], [0.04, 0.01, 0.06], ink); // an inkwell groove
  const hinge = [x - 0.26, top + 0.04, z];
  return id && {
    id, kind: 'lid', label: 'the desk',
    mesh: lid.build(),
    bounds: grow(boundsOf([x, top, z], [0.52, 0.12, 0.62]), 0.06),
    transform: (k) => rotationAbout(hinge, 'z', 1.55 * k),
  };
}

// ---------- the level ----------

export function buildSchool() {
  const mb = new MeshBuilder();
  const colliders = [];
  const parts = [];
  const items = [];
  const hides = [];
  const lights = [];

  // ----- the corridor -----
  floor(mb, C.x0, C.x1, C.zNear, C.zFar);
  // West wall: lockers from z = 0 to -8, then the classroom door, then the music room door.
  wallZ(mb, C.x0, C.zNear, C.zFar, [[-8.9, -10.1], [-18.9, -20.1]], 1);
  // East wall: tall windows onto the storm, and the bathroom door.
  const winGaps = [];
  for (let z = 1.5; z > C.zFar + 1; z -= 3) if (z > -12 || z < -20) winGaps.push(z);
  wallZ(mb, C.x1, C.zNear, C.zFar, [[-13.2, -14.4]], -1);
  for (const z of winGaps) {
    mb.box([C.x1 - 0.01, 1.85, z], [0.02, 1.3, 1.6], [0.1, 0.12, 0.18], SKY); // the glass: lightning shows in it
    mb.box([C.x1 - 0.04, 1.85, z], [0.04, 1.36, 0.06], shade(wood, 0.7)); // mullion
    mb.box([C.x1 - 0.04, 1.85, z], [0.04, 0.05, 1.66], shade(wood, 0.7)); // transom
    mb.box([C.x1 - 0.08, 1.18, z], [0.16, 0.04, 1.7], shade(wood, 0.9)); // sill
  }
  wallX(mb, C.zNear, C.x0, C.x1);
  // The end wall, with the stair door.
  wallX(mb, C.zFar, C.x0, C.x1, [[-0.6, 0.6]]);
  colliders.push(
    { min: [C.x0 - 0.3, -30], max: [C.x0, C.zNear] }, // west wall (doorways cut below)
    { min: [C.x1, -30], max: [C.x1 + 0.3, C.zNear] },
    { min: [C.x0, C.zNear], max: [C.x1, C.zNear + 0.3] },
    { min: [C.x0, C.zFar - 0.1], max: [-0.6, C.zFar + 0.05] },
    { min: [0.6, C.zFar - 0.1], max: [C.x1, C.zFar + 0.05] },
  );
  // Doorways in the side walls: replace the whole-wall colliders with pieces.
  colliders.splice(0, 2,
    { min: [C.x0 - 0.3, -8.9], max: [C.x0, C.zNear] },
    { min: [C.x0 - 0.3, -18.9], max: [C.x0, -10.1] },
    { min: [C.x0 - 0.3, -30], max: [C.x0, -20.1] },
    { min: [C.x1, -13.2], max: [C.x1 + 0.3, C.zNear] },
    { min: [C.x1, -30], max: [C.x1 + 0.3, -14.4] },
  );
  for (let z = 1; z > C.zFar; z -= 4) tube(mb, lights, [0.25, 0, z], [0.8, 0.92, 0.88], 1, z === -11 || z === -23);
  // The clock above the bathroom door: 00:00, like every clock she remembers.
  clockFace(mb, [C.x1 - 0.06, 2.7, -13.8], 0.2);
  // A notice board with pinned papers.
  mb.box([C.x1 - 0.03, 1.6, -24.5], [0.04, 0.9, 1.4], [0.45, 0.32, 0.18]);
  for (let k = 0; k < 6; k++) mb.box([C.x1 - 0.06, 1.4 + (k % 2) * 0.35, -25 + Math.floor(k / 2) * 0.45], [0.01, 0.28, 0.2], paper, GLOW * 0.1);

  // ----- lockers: 16 along the west wall, z = 0 .. -8 -----
  const LOCKER_W = 0.5;
  const lockerFace = C.x0 + 0.5;
  for (let i = 0; i < 16; i++) {
    const z = -i * LOCKER_W - LOCKER_W / 2;
    mb.box([C.x0 + 0.25, 1.0, z], [0.5, 2.0, LOCKER_W - 0.02], shade(lockerCol, 0.6), 0, ['px']);
    mb.box([C.x0 + 0.25, 2.02, z], [0.5, 0.04, LOCKER_W], shade(lockerCol, 0.5));
    if (i === 6) continue; // June's locker: its door is a moving part
    mb.box([lockerFace + 0.01, 1.0, z], [0.02, 1.9, LOCKER_W - 0.04], shade(lockerCol, 0.95 + (i % 3) * 0.05));
    for (let v = 0; v < 4; v++) mb.box([lockerFace + 0.025, 1.7 + v * 0.05, z], [0.01, 0.015, 0.3], shade(lockerCol, 0.5)); // vents
    mb.box([lockerFace + 0.03, 1.0, z - 0.17], [0.02, 0.1, 0.03], metal); // handle
  }
  colliders.push({ min: [C.x0, -8], max: [lockerFace, 0] });
  // June's locker (number 7): it opens. Her keys hang inside.
  {
    const z = -6 * LOCKER_W - LOCKER_W / 2;
    mb.box([C.x0 + 0.05, 1.0, z], [0.02, 1.9, LOCKER_W - 0.04], shade(PALETTE.void, 2)); // dark back
    mb.box([C.x0 + 0.4, 1.55, z], [0.2, 0.02, 0.4], shade(lockerCol, 0.5)); // shelf
    mb.box([C.x0 + 0.42, 1.62, z + 0.1], [0.12, 0.12, 0.1], [0.6, 0.2, 0.25]); // a lunch tin
    const door = new MeshBuilder();
    door.box([lockerFace + 0.01, 1.0, z], [0.02, 1.9, LOCKER_W - 0.04], shade(lockerCol, 1.1));
    for (let v = 0; v < 4; v++) door.box([lockerFace + 0.025, 1.7 + v * 0.05, z], [0.01, 0.015, 0.3], shade(lockerCol, 0.5));
    door.box([lockerFace + 0.03, 1.0, z - 0.17], [0.02, 0.1, 0.03], metal);
    door.box([lockerFace + 0.025, 1.45, z], [0.01, 0.12, 0.2], paper, GLOW * 0.2); // a name card: june
    const hinge = [lockerFace, 1.0, z + LOCKER_W / 2 - 0.02];
    parts.push({
      id: 'june-locker', kind: 'door', label: 'locker 7',
      mesh: door.build(),
      bounds: grow(boundsOf([lockerFace - 0.1, 1.0, z], [0.2, 1.9, LOCKER_W]), 0.05),
      transform: (k) => rotationAbout(hinge, 'y', -1.7 * k),
    });
    items.push({
      id: 'keys', kind: 'key', name: "the caretaker's keys", needsOpen: 'june-locker',
      pos: [C.x0 + 0.35, 1.25, z], size: [0.04, 0.16, 0.12], color: metal,
      text: 'a ring of keys, one for every door in the school. one is tied with a red string. june must have taken them. she always said she wanted to see the roof at night.',
      checkpoint: { pos: [0.3, z], yaw: -Math.PI / 2 },
      inspect: inspectOf(keyRingMesh(), 0.3),
    });
    // Two other lockers you can climb into and hide in.
    for (const i of [2, 13]) {
      const lz = -i * LOCKER_W - LOCKER_W / 2;
      hides.push({
        id: `locker-${i + 1}`, label: `hide in locker ${i + 1}`, overlay: 'slats',
        bounds: grow(boundsOf([lockerFace, 1.0, lz], [0.1, 1.9, LOCKER_W - 0.06]), 0.05),
        // Just behind the vents: the corridor shows between the slats (drawn by the HUD).
        view: { pos: [lockerFace + 0.06, 1.62, lz], yaw: Math.PI / 2, pitch: -0.05 },
        exit: { pos: [lockerFace + 0.45, lz], yaw: Math.PI / 2 },
      });
    }
  }

  // ----- the classroom: x -9.5..-1.5, z -8..-16 -----
  {
    const x0 = -9.5, x1 = C.x0, z0 = -8, z1 = -16;
    floor(mb, x0, x1, z0, z1);
    wallZ(mb, x0, z0, z1, [], 1);
    wallX(mb, z0, x0, x1);
    wallX(mb, z1, x0, x1);
    colliders.push({ min: [x0 - 0.3, z1], max: [x0, z0] }, { min: [x0, z0], max: [x1, z0 + 0.3] }, { min: [x0, z1 - 0.3], max: [x1, z1] });
    // Blackboard with lines of chalk, and the date in the corner.
    mb.box([x0 + 0.03, 1.6, -12], [0.04, 1.2, 4], board);
    for (let k = 0; k < 6; k++) mb.box([x0 + 0.06, 1.95 - k * 0.15, -11.2 - (k % 2) * 0.3], [0.01, 0.025, 1.4 + (k % 3) * 0.4], chalk, GLOW * 0.25);
    mb.box([x0 + 0.06, 2.0, -13.6], [0.01, 0.08, 0.5], chalk, GLOW * 0.25);
    // The teacher's desk, with a drawer on the teacher's side.
    const td = [-8.0, -12];
    mb.box([td[0], 0.38, td[1]], [0.8, 0.76, 1.6], shade(wood, 1.1));
    mb.box([td[0], 0.78, td[1]], [0.86, 0.04, 1.66], shade(wood, 1.3));
    mb.blob([td[0] + 0.1, 0.86, td[1] + 0.5], 0.06, 1, 6, 4, red); // an apple
    colliders.push(footprint([td[0], 0, td[1]], [0.8, 0, 1.6]));
    const drawer = new MeshBuilder();
    const dx = td[0] - 0.4;
    drawer.box([dx + 0.2, 0.62, td[1] - 0.3], [0.38, 0.14, 0.6], shade(wood, 0.7));
    drawer.box([dx - 0.005, 0.62, td[1] - 0.3], [0.02, 0.15, 0.62], shade(wood, 1.2));
    drawer.box([dx - 0.025, 0.62, td[1] - 0.3], [0.03, 0.03, 0.12], brass, GLOW * 0.3);
    parts.push({
      id: 'teacher-drawer', kind: 'drawer', label: "the teacher's drawer",
      mesh: drawer.build(),
      bounds: grow(boundsOf([dx, 0.62, td[1] - 0.3], [0.16, 0.18, 0.64]), 0.06),
      transform: (k) => translation([-0.36 * k, 0, 0]),
    });
    items.push({
      id: 'note-register', kind: 'note', name: 'the class register', inside: 'teacher-drawer',
      pos: [dx + 0.2, 0.7, td[1] - 0.3], size: [0.26, 0.02, 0.2], color: [0.3, 0.12, 0.1],
      text: "the register. one name is crossed out and written back in, three times, in my handwriting. june. june. june. i don't remember doing it.",
      checkpoint: { pos: [-3.0, -9.5], yaw: -Math.PI / 2 },
      inspect: inspectOf(noteMesh(9), 0.3),
    });
    // Desks: four rows of three. The twins sit side by side in the back row.
    const xs = [-6.6, -5.2, -3.8], zs = [-10.9, -12.2, -13.5, -14.8];
    for (const x of xs) for (const z of zs) {
      if (x === -3.8 && (z === -12.2 || z === -13.5)) continue;
      desk(mb, colliders, [x, z]);
    }
    parts.push(desk(mb, colliders, [-3.8, -12.2], 'june-desk'));
    parts.push(desk(mb, colliders, [-3.8, -13.5], 'edith-desk'));
    // White flowers in a jar on June's desk.
    mb.box([-3.9, 0.86, -12.0], [0.08, 0.16, 0.08], [0.5, 0.6, 0.62], GLOW * 0.15);
    for (let k = 0; k < 4; k++) mb.blob([-3.9 + (k % 2) * 0.05 - 0.025, 1.0 + Math.floor(k / 2) * 0.05, -12.0 + (k % 3) * 0.03 - 0.03], 0.035, 1, 5, 3, [0.9, 0.9, 0.84], GLOW * 0.3);
    items.push({
      id: 'note-desk', kind: 'note', name: "a note in june's desk", inside: 'june-desk',
      pos: [-3.8, 0.74, -12.2], size: [0.2, 0.01, 0.16], color: paper,
      text: "june and i swapped desks today and nobody noticed. not even miss hale. june said, see? we could be anyone. i didn't like how she smiled when she said it.",
      checkpoint: { pos: [-3.0, -9.5], yaw: -Math.PI / 2 },
      inspect: inspectOf(noteMesh(7), 0.3),
    });
    items.push({
      id: 'class-photo', kind: 'photo', name: 'the class photo', inside: 'edith-desk',
      pos: [-3.8, 0.74, -13.5], size: [0.24, 0.01, 0.18], color: [0.9, 0.88, 0.82],
      text: 'the whole class, spring 1962. two girls side by side in the front row. one face has been scratched out so hard the paper is thin. you can\'t tell which twin it was.',
      checkpoint: { pos: [-3.0, -9.5], yaw: -Math.PI / 2 },
      inspect: inspectOf(classPhotoMesh(), 0.32),
    });
    tube(mb, lights, [-5.5, 0, -10.5], [0.8, 0.92, 0.88], 0.8, true);
    tube(mb, lights, [-5.5, 0, -14], [0.8, 0.92, 0.88], 0.5);
  }

  // ----- the music room: x -9.5..-1.5, z -18..-26 -----
  {
    const x0 = -9.5, x1 = C.x0, z0 = -18, z1 = -26;
    floor(mb, x0, x1, z0, z1);
    wallZ(mb, x0, z0, z1, [], 1);
    wallX(mb, z0, x0, x1);
    wallX(mb, z1, x0, x1);
    colliders.push({ min: [x0 - 0.3, z1], max: [x0, z0] }, { min: [x0, z0], max: [x1, z0 + 0.3] }, { min: [x0, z1 - 0.3], max: [x1, z1] });
    // An upright piano against the back wall, its keyboard cover closed.
    const px = -6.5, pz = z1 + 0.35;
    mb.box([px, 0.65, pz], [1.5, 1.3, 0.55], [0.1, 0.07, 0.07]);
    mb.box([px, 0.72, pz + 0.42], [1.4, 0.06, 0.3], [0.1, 0.07, 0.07]); // key bed
    for (let k = 0; k < 20; k++) mb.box([px - 0.66 + k * 0.07, 0.765, pz + 0.43], [0.06, 0.02, 0.26], [0.9, 0.88, 0.8]);
    for (let k = 0; k < 20; k++) if ([1, 2, 4, 5, 6].includes(k % 7)) mb.box([px - 0.63 + k * 0.07, 0.785, pz + 0.37], [0.03, 0.03, 0.14], [0.05, 0.05, 0.05]);
    mb.box([px - 0.5, 1.33, pz], [0.12, 0.06, 0.12], brass, GLOW * 0.3); // candle holder
    mb.box([px, 0.35, pz + 0.8], [0.8, 0.5, 0.35], shade(wood, 0.6)); // the bench, room for two
    colliders.push(footprint([px, 0, pz], [1.5, 0, 0.55]), footprint([px, 0, pz + 0.42], [1.4, 0, 0.3], true), footprint([px, 0, pz + 0.8], [0.8, 0, 0.35], true));
    const cover = new MeshBuilder();
    cover.box([px, 0.82, pz + 0.43], [1.42, 0.03, 0.3], [0.12, 0.08, 0.08]);
    const hinge = [px, 0.83, pz + 0.28];
    parts.push({
      id: 'piano-cover', kind: 'lid', label: 'the piano',
      mesh: cover.build(),
      bounds: grow(boundsOf([px, 0.8, pz + 0.43], [1.42, 0.1, 0.32]), 0.06),
      transform: (k) => rotationAbout(hinge, 'x', -1.6 * k),
    });
    items.push({
      id: 'note-piano', kind: 'note', name: 'a note on the keys', inside: 'piano-cover',
      pos: [px + 0.2, 0.785, pz + 0.47], size: [0.18, 0.01, 0.14], color: paper,
      text: 'june plays the left hand and i play the right. if one of us forgets her part, the song stops. we promised that is how we would know.',
      checkpoint: { pos: [-3.0, -19.5], yaw: -Math.PI / 2 },
      inspect: inspectOf(noteMesh(6), 0.3),
    });
    // Chairs in a half circle, music stands.
    for (let k = 0; k < 7; k++) {
      const a = Math.PI * (0.15 + 0.7 * (k / 6));
      const cx = -5.5 + Math.cos(a) * 2.6, cz = -21 + Math.sin(a) * 1.4;
      mb.box([cx, 0.22, cz], [0.36, 0.04, 0.36], shade(wood, 1.1));
      mb.box([cx, 0.45, cz + 0.17], [0.36, 0.46, 0.04], shade(wood, 1.1));
      mb.box([cx, 0.5, cz - 0.4], [0.02, 1.0, 0.02], metal);
      mb.box([cx, 1.0, cz - 0.4], [0.3, 0.2, 0.02], metal);
      colliders.push(footprint([cx, 0, cz], [0.38, 0, 0.38], true));
    }
    tube(mb, lights, [-5.5, 0, -22], [0.8, 0.9, 0.95], 0.6, true);
    lights.push({ pos: [px - 0.5, 1.5, pz + 0.3], color: [1, 0.7, 0.4], weight: 0.6 });
  }

  // ----- the girls' bathroom: x 2..7, z -12.5..-19.5 -----
  {
    const x0 = C.x1, x1 = 7, z0 = -12.5, z1 = -19.5;
    for (let x = x0; x < x1; x += 0.5) for (let z = z1; z < z0; z += 0.5) mb.quad([x, 0, z], [x + 0.5, 0, z], [x + 0.5, 0, z + 0.5], [x, 0, z + 0.5], ((x + z) * 2) % 2 === 0 ? tileWhite : [0.3, 0.32, 0.32]);
    mb.quad([x0, H, z1], [x1, H, z1], [x1, H, z0], [x0, H, z0], shade(tileWhite, 0.5));
    mb.quadGrid([x1, 0, z1], [x1, 0, z0], [x1, H, z0], [x1, H, z1], 7, 3, shade(tileWhite, 0.8));
    mb.quadGrid([x0, 0, z0], [x1, 0, z0], [x1, H, z0], [x0, H, z0], 5, 3, shade(tileWhite, 0.75));
    mb.quadGrid([x1, 0, z1], [x0, 0, z1], [x0, H, z1], [x1, H, z1], 5, 3, shade(tileWhite, 0.75));
    colliders.push({ min: [x1, z1], max: [x1 + 0.3, z0] }, { min: [x0, z0], max: [x1, z0 + 0.3] }, { min: [x0, z1 - 0.3], max: [x1, z1] });
    // Sinks under a long mirror on the far wall.
    for (let k = 0; k < 3; k++) {
      const z = -13.6 - k * 1.1;
      mb.box([x1 - 0.25, 0.8, z], [0.5, 0.12, 0.6], [0.8, 0.82, 0.8]);
      mb.box([x1 - 0.25, 0.4, z], [0.12, 0.7, 0.12], [0.7, 0.72, 0.7]);
      mb.box([x1 - 0.42, 0.92, z], [0.04, 0.12, 0.04], metal);
    }
    colliders.push(footprint([x1 - 0.25, 0, -14.7], [0.5, 0, 3.0], true));
    mb.box([x1 - 0.02, 1.65, -14.7], [0.02, 1.0, 3.0], [0.55, 0.62, 0.66], GLOW * 0.35); // the mirror
    items.push({
      id: 'note-mirror', kind: 'note', name: 'a note by the sink', inside: null,
      pos: [x1 - 0.32, 0.875, -14.7], size: [0.18, 0.01, 0.14], color: paper,
      text: 'in the mirror there is only one of us. i counted twice. june laughed and said it was the light. it was not the light.',
      checkpoint: { pos: [3.2, -14], yaw: Math.PI / 2 },
      inspect: inspectOf(noteMesh(5), 0.3),
    });
    // Three stalls along the back wall. The middle one is a hiding place.
    for (let k = 0; k <= 3; k++) {
      const x = 3.0 + k * 1.2;
      mb.box([x, 1.0, z1 + 0.75], [0.04, 1.9, 1.5], [0.32, 0.36, 0.42]);
      colliders.push(footprint([x, 0, z1 + 0.75], [0.08, 0, 1.5]));
    }
    for (let k = 0; k < 3; k++) {
      const x = 3.6 + k * 1.2;
      // Doors standing ajar.
      mb.boxRot([x - 0.35, 1.05, z1 + 1.6], [0.04, 1.8, 0.7], k === 1 ? 0.9 : 0.4, [0.36, 0.4, 0.46]);
      mb.box([x, 0.35, z1 + 0.35], [0.4, 0.4, 0.5], [0.8, 0.82, 0.8]);
    }
    hides.push({
      id: 'stall', label: 'hide in the stall',
      bounds: grow(boundsOf([4.8, 1.0, z1 + 1.5], [1.0, 1.9, 0.3]), 0.05),
      view: { pos: [4.75, 1.3, z1 + 0.9], yaw: Math.PI - 0.25, pitch: -0.05 },
      exit: { pos: [4.8, z1 + 2.4], yaw: Math.PI },
    });
    tube(mb, lights, [4.5, 0, -16], [0.7, 0.95, 0.8], 0.7, true);
  }

  // ----- the stair door at the end (chained; the caretaker's keys open it), and the stairs -----
  const door = new MeshBuilder();
  door.box([0, 1.15, C.zFar], [1.2, 2.3, 0.06], shade(wood, 0.8));
  door.box([0, 1.7, C.zFar + 0.035], [0.5, 0.5, 0.01], [0.14, 0.16, 0.2], SKY); // a small window
  for (let k = 0; k < 7; k++) door.boxRot([0.1 - k * 0.04, 1.05 + Math.sin(k) * 0.05, C.zFar + 0.06], [0.06, 0.03, 0.03], 0.5 * (k % 2 ? 1 : -1), metal); // the chain
  door.box([0.1, 0.95, C.zFar + 0.08], [0.1, 0.12, 0.05], brass, GLOW * 0.3); // padlock
  const dHinge = [-0.6, 1.15, C.zFar];
  parts.push({
    id: 'stair-door', kind: 'door', label: 'the stair door',
    mesh: door.build(),
    bounds: grow(boundsOf([0, 1.15, C.zFar], [1.2, 2.3, 0.2]), 0.1),
    transform: (k) => rotationAbout(dHinge, 'y', 1.6 * k),
    collider: { min: [-0.6, C.zFar - 0.1], max: [0.6, C.zFar + 0.06] },
    needs: 'keys',
    lockedText: "it's chained shut. the caretaker keeps the keys.",
    oneWay: true,
    rate: 1.2,
    openLine: 'the chain slides off. cold air comes down the stairs.',
  });
  {
    const z0 = C.zFar, z1 = C.zFar - 6, w = 1.6;
    floor(mb, -w, w, z0, z1);
    wallZ(mb, -w, z0, z1, [], 1);
    wallZ(mb, w, z0, z1, [], -1);
    wallX(mb, z1, -w, w);
    for (let i = 0; i < 9; i++) mb.box([0.75, 0.09 + i * 0.18, z0 - 3 - i * 0.32], [1.5, 0.18 + i * 0.36, 0.32], shade(floorA, 1 - i * 0.05));
    colliders.push({ min: [-w - 0.3, z1], max: [-w, z0] }, { min: [w, z1], max: [w + 0.3, z0] }, { min: [-w, z1 - 0.3], max: [w, z1] }, { min: [0, z1], max: [w, z0 - 2.85] });
    mb.box([-0.6, H - 0.05, z0 - 2], [0.2, 0.06, 0.2], [1, 0.9, 0.7], GLOW);
    lights.push({ pos: [-0.6, 2.6, z0 - 2], color: [1, 0.85, 0.6], weight: 0.8 });
  }

  return {
    id: 'school',
    title: 'the school at night',
    date: 'MAR 14 1962',
    clockStart: (21 * 60 + 12) * 60,
    mesh: mb.build(),
    extra: [],
    parts,
    items,
    hides,
    colliders,
    lights,
    start: { pos: [0.3, 2.0], yaw: 0 },
    checkpoints: { entrance: { pos: [0.3, 2.0], yaw: 0 } },
    // The caretaker walks the corridor and looks into the classroom and the music room.
    route: [[0.3, -28], [0.3, -19.5], [-2.6, -19.5], [-4.5, -19.0], [-2.6, -19.5], [0.3, -19.5],
      [0.3, -9.5], [-2.6, -9.5], [-6.5, -9.3], [-2.6, -9.5], [0.3, -9.5], [0.3, 1.5]],
    wakeAfterNotes: 2,
    june: { pos: [-0.4, -33.6], yaw: 0, glimpse: { pos: [0.3, -16], yaw: Math.PI } },
    juneLook: { coat: UNIFORM, scale: 0.88 },
    presenceLook: { coat: COAT_GREY, lamp: true },
    presenceLamp: true,
    exitPart: 'stair-door',
    exitTrigger: { pos: [-0.4, -32.4], radius: 1.6 },
    storm: true,
    flashDir: [0.9, 0.35, 0.2],
    flashScale: 0.55,
    sky: [0.08, 0.1, 0.16],
    ambient: [0.07, 0.08, 0.1],
    fog: { color: [0.02, 0.025, 0.035], near: 4, far: 22 },
    lantern: { color: [0.8, 0.92, 0.88], intensity: 0.95, range: 6 },
    endLines: [
      'june is waiting at the bottom of the stairs.',
      "she says, you're late. you're always late now.",
      "edith laughs. she can't remember why.",
    ],
    lines: {
      start: 'the bell rang an hour ago. june said she would wait by the lockers.',
      glimpse: 'june?',
      wake: 'keys jingle somewhere down the corridor. a lamp is coming.',
      caught: 'the tape skips back.',
    },
  };
}

export const SCHOOL_ITEM_IDS = ['note-desk', 'class-photo', 'note-register', 'note-piano', 'note-mirror', 'keys'];
