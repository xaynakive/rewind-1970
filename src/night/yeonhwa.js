// Yeonhwa's house, west of the courtyard: the front room with her shrine to
// Sae, the kitchen, Sae's room (locked), and her bedroom. She is strongest here.
// Spec: .kiro/specs/haewol (Requirement 6.2; design "Yeonhwa's house")
//
// x -24..-12, z 2..-14. The floor is raised 0.3 m above the courtyard.

import { MeshBuilder } from '../render/mesh.js';
import { translation, rotationAbout } from '../render/math.js';
import { shade, GLOW } from '../systems/house/palette.js';
import { boundsOf, grow, footprint, noteMesh, inspectOf } from '../systems/memory/market.js';
import { GLOSS, wood, darkWood, paper, ink, stone, lanternRed, wallZ, wallX, colZ, colX } from './pieces.js';

export const FLOOR = 0.3;
export const YEONHWA = { x0: -24, x1: -12, z0: 2, z1: -14 };
const H = 2.6;
const brass = [0.7, 0.52, 0.22];
const thread = [0.9, 0.12, 0.08];
const plank = shade(wood, 0.85);
/** Old, smoke-darkened paper on her walls. */
const oldPaper = shade(paper, 0.62);

// ---------- inspect objects ----------

export function cassetteMesh() {
  const mb = new MeshBuilder();
  mb.box([0, 0, 0], [0.2, 0.024, 0.128], [0.12, 0.12, 0.13], GLOSS);
  mb.box([0, 0.013, -0.02], [0.16, 0.002, 0.06], [0.86, 0.82, 0.7], GLOSS); // the label
  for (let k = 0; k < 4; k++) mb.box([-0.05 + k * 0.03, 0.015, -0.03], [0.022, 0.002, 0.004], ink, GLOSS); // her writing: sae, 10.31
  mb.box([0, 0.013, 0.03], [0.1, 0.002, 0.03], [0.05, 0.05, 0.06], GLOSS); // the window
  for (const x of [-0.036, 0.036]) {
    mb.blob([x, 0.014, 0.03], 0.012, 0.2, 8, 2, [0.55, 0.5, 0.42], GLOSS);
    mb.blob([x, 0.016, 0.03], 0.004, 0.5, 6, 2, [0.9, 0.9, 0.9], GLOSS);
  }
  return mb;
}

function ribbonMesh() {
  const mb = new MeshBuilder();
  // A crooked bow: two loops and two tails, tied by a child.
  mb.boxRot([-0.05, 0, -0.01], [0.09, 0.012, 0.045], 0.35, lanternRed, GLOSS);
  mb.boxRot([0.055, 0, 0.0], [0.1, 0.012, 0.04], -0.2, lanternRed, GLOSS);
  mb.box([0, 0.004, 0], [0.026, 0.02, 0.03], shade(lanternRed, 0.8), GLOSS);
  mb.boxRot([-0.03, 0, 0.06], [0.02, 0.01, 0.1], 0.4, shade(lanternRed, 0.9), GLOSS);
  mb.boxRot([0.03, 0, 0.07], [0.02, 0.01, 0.12], -0.25, shade(lanternRed, 0.9), GLOSS);
  // The thread she tied to it, running off.
  for (let k = 0; k < 10; k++) mb.box([0.04 + k * 0.012, 0, 0.13 + Math.sin(k) * 0.006], [0.012, 0.003, 0.003], thread, GLOSS);
  return mb;
}

function telegramMesh() {
  const mb = new MeshBuilder();
  mb.box([0, 0, 0], [0.24, 0.004, 0.15], [0.78, 0.74, 0.6], GLOSS);
  mb.box([0, 0.003, -0.05], [0.2, 0.002, 0.02], [0.3, 0.3, 0.34], GLOSS); // the printed strip
  for (let i = 0; i < 4; i++) mb.box([-0.1 + (i % 2) * 0.01 + 0.08, 0.004, -0.01 + i * 0.025], [0.16 - (i % 3) * 0.03, 0.002, 0.006], ink, GLOSS);
  mb.box([0, 0.003, 0], [0.004, 0.002, 0.15], shade([0.78, 0.74, 0.6], 0.8), GLOSS); // folded small
  return mb;
}

function smallKeyMesh() {
  const mb = new MeshBuilder();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    mb.boxRot([Math.cos(a) * 0.022, 0, Math.sin(a) * 0.022 - 0.045], [0.014, 0.007, 0.01], -a, brass, GLOSS);
  }
  mb.box([0, 0, 0.0], [0.01, 0.007, 0.07], brass, GLOSS);
  mb.box([0.01, 0, 0.028], [0.012, 0.007, 0.008], brass, GLOSS);
  for (let i = 0; i < 9; i++) mb.box([-0.012 - i * 0.011, 0.003, -0.07 - i * 0.006], [0.011, 0.003, 0.003], thread, GLOSS);
  return mb;
}

// ---------- the house ----------

/**
 * Adds Yeonhwa's house to the village's builders and lists.
 * @param {{ mb: MeshBuilder, revealed: MeshBuilder, colliders: object[], parts: object[], items: object[],
 *   hides: object[], lights: object[] }} v
 */
export function buildYeonhwa(v) {
  const { mb, revealed, colliders, parts, items, hides, lights } = v;
  const { x0, x1, z0, z1 } = YEONHWA;
  const F = FLOOR;

  // Floor (planks, 1 m cells so light lands on them), ceiling, and the step up from the courtyard.
  for (let x = x0; x < x1; x++) mb.quadGrid([x, F, z1], [x + 1, F, z1], [x + 1, F, z0], [x, F, z0], 1, z0 - z1, shade(plank, 0.9 + (x % 2) * 0.08));
  mb.quadGrid([x0, F + H, z1], [x1, F + H, z1], [x1, F + H, z0], [x0, F + H, z0], 6, 8, shade(wood, 0.35));
  mb.box([x1 + 0.25, 0.15, -5], [0.5, 0.3, 1.5], shade(stone, 1.1));

  // Outer walls (the courtyard front at x = -12 is drawn by the village), and the rooms.
  wallZ(mb, x0, z0, z1, H, [], F, oldPaper);
  wallX(mb, z0, x0, x1, H, [], F, oldPaper);
  wallX(mb, z1, x0, x1, H, [], F, oldPaper);
  wallZ(mb, -18, z0, -9, H, [[-0.6, -1.8], [-5.9, -7.1]], F, oldPaper); // front room | kitchen, Sae's room
  wallX(mb, -4, x0, -18, H, [], F, oldPaper); // kitchen | Sae's room
  wallX(mb, -9, x0, x1, H, [[-15.8, -14.6]], F, oldPaper); // front rooms | bedroom
  colZ(colliders, x0, z0, z1);
  colX(colliders, z0, x0, x1);
  colX(colliders, z1, x0, x1);
  colZ(colliders, -18, z0, -9, [[-0.6, -1.8], [-5.9, -7.1]]);
  colX(colliders, -4, x0, -18);
  colX(colliders, -9, x0, x1, [[-15.8, -14.6]]);

  // The front door: it slides back along the wall, toward the north.
  {
    const d = new MeshBuilder();
    const x = x1 + 0.02;
    d.quadGrid([x, 0, -4.4], [x, 0, -5.6], [x, 2.2, -5.6], [x, 2.2, -4.4], 2, 4, paper);
    for (const z of [-4.4, -5.0, -5.6]) d.box([x, 1.1, z], [0.06, 2.2, 0.06], darkWood);
    for (const y of [0.55, 1.1, 1.65]) d.box([x, y, -5], [0.04, 0.04, 1.2], darkWood);
    parts.push({
      id: 'yeonhwa-door', kind: 'door', label: "Yeonhwa's door",
      mesh: d.build(),
      bounds: grow(boundsOf([x1, 1.1, -5], [0.3, 2.2, 1.2]), 0.08),
      transform: (k) => translation([0, 0, -1.15 * k]),
      collider: { min: [x1 - 0.1, -5.6], max: [x1 + 0.1, -4.4] },
      rate: 2.2,
    });
  }

  // ----- the front room: her shrine to Sae -----
  {
    const S = [-15, 1.5];
    mb.box([S[0], F + 0.45, S[1]], [1.8, 0.9, 0.55], darkWood);
    mb.box([S[0], F + 0.91, S[1]], [1.9, 0.03, 0.6], shade(wood, 1.15));
    // Sae's photograph in a black frame; candles; paper boats; the cassette recorder.
    mb.box([S[0], F + 1.25, S[1] + 0.2], [0.34, 0.44, 0.03], [0.04, 0.04, 0.05]);
    mb.box([S[0], F + 1.25, S[1] + 0.18], [0.26, 0.34, 0.01], [0.62, 0.6, 0.55], GLOW * 0.2);
    mb.box([S[0], F + 1.3, S[1] + 0.17], [0.1, 0.12, 0.005], [0.5, 0.42, 0.36], GLOW * 0.2);
    mb.box([S[0], F + 1.42, S[1] + 0.17], [0.3, 0.04, 0.005], [0.06, 0.05, 0.06]); // a black ribbon across the corner
    for (const dx of [-0.7, 0.7]) {
      mb.box([S[0] + dx, F + 1.03, S[1]], [0.06, 0.2, 0.06], [0.9, 0.86, 0.78]);
      mb.box([S[0] + dx, F + 1.16, S[1]], [0.025, 0.05, 0.025], [1, 0.7, 0.35], GLOW);
    }
    for (let k = 0; k < 3; k++) {
      const bx = S[0] - 0.45 + k * 0.12, bz = S[1] - 0.15;
      mb.box([bx, F + 0.95, bz], [0.09, 0.03, 0.05], [0.8, 0.77, 0.66]);
      mb.box([bx, F + 0.98, bz], [0.02, 0.04, 0.02], [0.8, 0.77, 0.66]);
    }
    mb.box([S[0] + 0.35, F + 0.99, S[1] - 0.05], [0.36, 0.13, 0.2], [0.16, 0.16, 0.17]); // the recorder
    mb.box([S[0] + 0.35, F + 1.06, S[1] - 0.05], [0.22, 0.01, 0.1], [0.08, 0.08, 0.09]);
    mb.box([S[0] + 0.5, F + 1.0, S[1] - 0.155], [0.025, 0.025, 0.01], thread, GLOW); // its red light, still on
    for (let k = 0; k < 3; k++) mb.box([S[0] - 0.1 + k * 0.05, F + 1.0, S[1] + 0.05], [0.006, 0.18, 0.006], [0.5, 0.45, 0.36]); // incense
    colliders.push(footprint([S[0], 0, S[1]], [1.9, 0, 0.6]));
    lights.push({ pos: [S[0], F + 1.1, S[1] - 0.9], color: [1, 0.72, 0.42], weight: 2.2, intensity: 0.55, range: 5 });
    // A low table and cushions, a cup left full.
    mb.box([-15, F + 0.17, -3.5], [1.3, 0.34, 0.8], shade(wood, 1.05));
    for (const dz of [-0.7, 0.7]) mb.box([-15, F + 0.04, -3.5 + dz], [0.5, 0.08, 0.5], [0.3, 0.12, 0.12]);
    mb.box([-14.7, F + 0.38, -3.4], [0.07, 0.07, 0.07], [0.8, 0.78, 0.72]);
    colliders.push(footprint([-15, 0, -3.5], [1.3, 0, 0.8], true));
    // Through the lens: wet handprints all over the shrine, small and large.
    for (let k = 0; k < 6; k++) revealed.box([S[0] - 0.75 + k * 0.3, F + 0.5 + (k % 2) * 0.22, S[1] - 0.285], [0.08 + (k % 3) * 0.03, 0.1 + (k % 3) * 0.03, 0.004], [0.6, 0.85, 0.9], GLOW);

    items.push({
      id: 'memory-tape', kind: 'memory', name: 'the tape in the recorder',
      pos: [S[0] + 0.35, F + 1.08, S[1] - 0.05], size: [0.2, 0.03, 0.12], color: [0.2, 0.2, 0.22],
      text: "a cassette, still warm from the recorder. on the label, in yeonhwa's hand: sae. 10·31.",
      inspect: inspectOf(cassetteMesh(), 0.28),
      flashback: [
        '23:52. the courtyard is a lake. yeonhwa kneels at this shrine, soaked to the skin.',
        "the grandmother's book is open beside her, and the cassette recorder sae was given for her birthday.",
        "she rewinds it to sae's voice: mother, look! it floats!",
        'she presses record over the rain and whispers: one more time. let it come out differently.',
      ],
    });
    items.push({
      id: 'note-rite', kind: 'note', name: 'a page torn from a book',
      pos: [-15.3, F + 0.345, -3.6], size: [0.2, 0.01, 0.26], color: paper,
      text: 'to call a voice back: keep it on tape. play the night again until it comes out differently. never let the tape reach its end. (the page is torn from an old book. in the margin, in a shaking hand: do not.)',
      inspect: inspectOf(noteMesh(8), 0.3),
    });
  }

  // ----- the kitchen: x -24..-18, z 2..-4 -----
  {
    // The stove with its embers, a rice jar, shelves, a cupboard you can hide in.
    mb.box([-22.8, F + 0.4, 1.4], [1.4, 0.8, 0.8], shade(stone, 0.8));
    mb.box([-22.8, F + 0.4, 0.99], [0.4, 0.25, 0.02], [0.9, 0.35, 0.12], GLOW * 0.8);
    mb.box([-22.8, F + 0.85, 1.4], [0.6, 0.1, 0.6], [0.12, 0.12, 0.12]);
    colliders.push(footprint([-22.8, 0, 1.4], [1.4, 0, 0.8]));
    lights.push({ pos: [-22.8, F + 0.6, 0.7], color: [1, 0.5, 0.25], weight: 1.2 });
    for (let k = 0; k < 2; k++) mb.box([-20.5, F + 1.4 + k * 0.45, 1.75], [2.2, 0.04, 0.4], shade(wood, 0.9));
    for (let k = 0; k < 6; k++) mb.box([-21.4 + k * 0.32, F + 1.52 + (k % 2) * 0.45, 1.75], [0.18, 0.2, 0.18], [0.5 - (k % 3) * 0.1, 0.42, 0.34]);
    // The rice jar: its lid lifts.
    const J = [-19.0, 1.3];
    mb.blob([J[0], F + 0.35, J[1]], 0.3, 1.25, 8, 5, [0.22, 0.16, 0.12]);
    mb.blob([J[0], F + 0.68, J[1]], 0.18, 0.2, 8, 2, [0.85, 0.82, 0.74]); // rice
    colliders.push(footprint([J[0], 0, J[1]], [0.62, 0, 0.62], true));
    const lid = new MeshBuilder();
    lid.blob([J[0], F + 0.74, J[1]], 0.24, 0.25, 8, 3, [0.18, 0.13, 0.1]);
    lid.box([J[0], F + 0.8, J[1]], [0.08, 0.04, 0.08], [0.18, 0.13, 0.1]);
    const hinge = [J[0] - 0.24, F + 0.74, J[1]];
    parts.push({
      id: 'rice-jar', kind: 'lid', label: 'the rice jar',
      mesh: lid.build(),
      bounds: grow(boundsOf([J[0], F + 0.74, J[1]], [0.5, 0.16, 0.5]), 0.06),
      transform: (k) => rotationAbout(hinge, 'z', 1.6 * k),
    });
    items.push({
      id: 'key-sae', kind: 'key', name: "the key to Sae's room", inside: 'rice-jar',
      pos: [J[0], F + 0.72, J[1]], size: [0.1, 0.02, 0.06], color: brass,
      text: "a small brass key on a red thread, pushed deep in the rice. someone wanted it hidden, and didn't want to throw it away.",
      inspect: inspectOf(smallKeyMesh(), 0.2),
    });
    // The cupboard: tall, deep, with a gap between its doors.
    const C = [-23.55, -2.6];
    mb.box([C[0], F + 1.0, C[1]], [0.8, 2.0, 1.4], shade(wood, 0.75));
    mb.box([C[0] + 0.41, F + 1.0, C[1]], [0.01, 1.9, 0.02], [0.02, 0.02, 0.02]);
    colliders.push(footprint([C[0], 0, C[1]], [0.8, 0, 1.4]));
    hides.push({
      id: 'cupboard', label: 'hide in the cupboard', overlay: 'slats',
      bounds: grow(boundsOf([C[0] + 0.4, F + 1.0, C[1]], [0.1, 2.0, 1.4]), 0.06),
      // Just in front of the doors: the kitchen shows through the gap and the slats.
      view: { pos: [C[0] + 0.46, F + 1.45, C[1]], yaw: Math.PI / 2, pitch: -0.08 },
      exit: { pos: [C[0] + 1.0, C[1]], yaw: Math.PI / 2 },
    });
  }

  // ----- Sae's room: x -24..-18, z -4..-9, behind a locked door -----
  {
    const d = new MeshBuilder();
    const x = -18 + 0.02;
    d.quadGrid([x, F, -5.9], [x, F, -7.1], [x, F + 2.2, -7.1], [x, F + 2.2, -5.9], 2, 4, shade(paper, 1.05));
    for (const z of [-5.9, -6.5, -7.1]) d.box([x, F + 1.1, z], [0.06, 2.2, 0.06], darkWood);
    d.box([x + 0.04, F + 1.0, -6.0], [0.02, 0.08, 0.05], brass);
    // A child's drawings pinned to it: a boat, a sun.
    d.box([x + 0.03, F + 1.4, -6.7], [0.01, 0.2, 0.26], [0.82, 0.8, 0.72], GLOW * 0.1);
    d.box([x + 0.035, F + 1.38, -6.7], [0.005, 0.05, 0.14], [0.25, 0.3, 0.6]);
    parts.push({
      id: 'sae-door', kind: 'door', label: "Sae's door",
      mesh: d.build(),
      bounds: grow(boundsOf([-18, F + 1.1, -6.5], [0.3, 2.2, 1.2]), 0.08),
      transform: (k) => translation([0, 0, 1.15 * k]),
      collider: { min: [-18 - 0.12, -7.1], max: [-18 + 0.12, -5.9] },
      needs: 'key-sae',
      lockedText: "it's locked. a child's drawing of a boat is pinned to the door.",
      rate: 2.2,
    });
    // A futon, a low shelf of paper boats, a small wooden box with a lid.
    mb.box([-22.6, F + 0.06, -7.6], [1.0, 0.12, 2.0], [0.56, 0.54, 0.6]);
    mb.box([-22.6, F + 0.14, -8.3], [0.5, 0.1, 0.3], [0.7, 0.68, 0.7]);
    colliders.push(footprint([-22.6, 0, -7.6], [1.0, 0, 2.0], true));
    mb.box([-20.4, F + 0.3, -4.35], [1.6, 0.6, 0.4], shade(wood, 1.1));
    for (let k = 0; k < 7; k++) {
      const bx = -21.05 + k * 0.21;
      mb.box([bx, F + 0.63, -4.35], [0.13, 0.04, 0.07], [0.82, 0.79, 0.68]);
      mb.box([bx, F + 0.67, -4.35], [0.03, 0.05, 0.03], [0.82, 0.79, 0.68]);
    }
    colliders.push(footprint([-20.4, 0, -4.35], [1.6, 0, 0.4], true));
    lights.push({ pos: [-20.5, F + 1.8, -6.5], color: [0.6, 0.7, 0.95], weight: 0.6 });
    const B = [-19.0, -8.5];
    mb.box([B[0], F + 0.2, B[1]], [0.5, 0.4, 0.4], shade(wood, 1.0));
    mb.box([B[0], F + 0.12, B[1]], [0.3, 0.24, 0.3], shade(wood, 0.8));
    mb.box([B[0], F + 0.11, B[1]], [0.24, 0.04, 0.24], shade(wood, 0.4));
    colliders.push(footprint([B[0], 0, B[1]], [0.5, 0, 0.4], true));
    const boxLid = new MeshBuilder();
    boxLid.box([B[0], F + 0.42, B[1]], [0.52, 0.04, 0.42], shade(wood, 1.2));
    boxLid.box([B[0], F + 0.445, B[1]], [0.2, 0.01, 0.1], [0.82, 0.79, 0.68]); // a label: sae
    const bh = [B[0], F + 0.42, B[1] - 0.21];
    parts.push({
      id: 'sae-box', kind: 'lid', label: 'the little box',
      mesh: boxLid.build(),
      bounds: grow(boundsOf([B[0], F + 0.42, B[1]], [0.52, 0.1, 0.42]), 0.06),
      transform: (k) => rotationAbout(bh, 'x', -1.6 * k),
    });
    items.push({
      id: 'memory-ribbon', kind: 'memory', name: 'a red ribbon', inside: 'sae-box',
      pos: [B[0], F + 0.42, B[1]], size: [0.14, 0.02, 0.1], color: lanternRed,
      text: 'a red hair ribbon in a crooked bow that a child tied herself. a long red thread is knotted to it.',
      inspect: inspectOf(ribbonMesh(), 0.22),
      flashback: [
        'earlier that evening. sae will not sit still to have her hair done.',
        'she ties the red ribbon herself, crooked, and will not let anyone fix it.',
        'wol laughs from the doorway: that child will tie the whole house together one day.',
        'sae ties a thread from her ribbon to the porch post, so she can always find her way back.',
      ],
    });
    // Through the lens: the red thread runs from the box to the door and out.
    for (let k = 0; k < 10; k++) revealed.box([B[0] + 0.1 + k * 0.1, F + 0.02, B[1] + 0.25 + k * 0.2], [0.1, 0.01, 0.02], thread, GLOW);
  }

  // ----- the bedroom: x -24..-12, z -9..-14 -----
  {
    // A wardrobe to hide in, a chest of drawers, a mirror covered with a cloth.
    const W = [-23.4, -11.6];
    mb.box([W[0], F + 1.05, W[1]], [1.0, 2.1, 1.6], shade(wood, 0.7));
    mb.box([W[0] + 0.51, F + 1.05, W[1]], [0.01, 2.0, 0.02], [0.02, 0.02, 0.02]);
    colliders.push(footprint([W[0], 0, W[1]], [1.0, 0, 1.6]));
    hides.push({
      id: 'wardrobe', label: 'hide in the wardrobe', overlay: 'slats',
      bounds: grow(boundsOf([W[0] + 0.5, F + 1.05, W[1]], [0.1, 2.1, 1.6]), 0.06),
      view: { pos: [W[0] + 0.56, F + 1.5, W[1]], yaw: Math.PI / 2, pitch: -0.06 },
      exit: { pos: [W[0] + 1.2, W[1]], yaw: Math.PI / 2 },
    });
    const D = [-12.55, -12.4];
    mb.box([D[0], F + 0.5, D[1]], [0.7, 1.0, 1.2], shade(wood, 0.9));
    for (const y of [0.3, 0.85]) mb.box([D[0] - 0.355, F + y, D[1]], [0.01, 0.3, 1.1], shade(wood, 0.75));
    mb.box([D[0], F + 1.6, D[1] + 0.9], [0.1, 1.1, 0.7], [0.75, 0.73, 0.7]); // the cloth over the mirror
    colliders.push(footprint([D[0], 0, D[1]], [0.7, 0, 1.2]), footprint([D[0], 0, D[1] + 0.9], [0.2, 0, 0.7]));
    const drawer = new MeshBuilder();
    drawer.box([D[0] - 0.05, F + 0.55, D[1]], [0.6, 0.22, 1.08], shade(wood, 0.6));
    drawer.box([D[0] - 0.355, F + 0.55, D[1]], [0.02, 0.24, 1.12], shade(wood, 1.1));
    drawer.box([D[0] - 0.375, F + 0.55, D[1]], [0.03, 0.04, 0.16], brass);
    parts.push({
      id: 'chest-drawer', kind: 'drawer', label: 'the drawer',
      mesh: drawer.build(),
      bounds: grow(boundsOf([D[0] - 0.36, F + 0.55, D[1]], [0.1, 0.26, 1.12]), 0.06),
      transform: (k) => translation([-0.42 * k, 0, 0]),
    });
    items.push({
      id: 'memory-telegram', kind: 'memory', name: 'a telegram', inside: 'chest-drawer',
      pos: [D[0] - 0.05, F + 0.67, D[1]], size: [0.24, 0.01, 0.15], color: [0.78, 0.74, 0.6],
      text: 'a telegram, folded small. TYPHOON TURNING NORTH. STAY INDOORS. HOME SOON.',
      inspect: inspectOf(telegramMesh(), 0.3),
      flashback: [
        '22:40. the telegram boy runs through the rain to every house in the village.',
        'yeonhwa reads it twice and puts it away in the drawer.',
        'she kneels and holds sae by both arms: stay on the porch tonight. promise me.',
        'sae promises. she is already folding paper.',
      ],
    });
    // A futon laid out for one, and an oil lamp.
    mb.box([-19.6, F + 0.06, -13.3], [2.0, 0.12, 1.0], [0.5, 0.46, 0.5]);
    colliders.push(footprint([-19.6, 0, -13.3], [2.0, 0, 1.0], true));
    mb.box([-16.2, F + 0.15, -13.5], [0.16, 0.3, 0.16], [0.35, 0.3, 0.2]);
    mb.box([-16.2, F + 0.36, -13.5], [0.08, 0.12, 0.08], [1, 0.75, 0.4], GLOW);
    lights.push({ pos: [-16.2, F + 0.8, -13.2], color: [1, 0.72, 0.42], weight: 1.0 });
  }
}

/** Where the Caller walks while you are in her house. Every point is free to stand on. */
export const YEONHWA_ROUTE = [
  [-13.2, 0.6], [-13.2, -8.2], [-15.2, -8.2], [-15.2, -10.2], [-21.5, -11.6], [-15.2, -12.4],
  [-15.2, -8.2], [-17.0, -6.5], [-17.0, 0.6],
];

export const YEONHWA_ITEM_IDS = ['memory-tape', 'note-rite', 'key-sae', 'memory-ribbon', 'memory-telegram'];
