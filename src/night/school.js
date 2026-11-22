// The schoolroom, north of the courtyard and dug into the hill: Sae's class,
// a chalkboard that writes back when you aren't looking, a corridor that is
// longer every time you run it, and the music room at its end.
// Spec: .kiro/specs/haewol (Requirement 6.4; design "The schoolroom")
//
// Classroom x -11..-1, z -16.3..-23. Corridor x -3..-1.4, z -23..-47.
// Music room x -6..1, z -47..-53. Floor at 0.

import { MeshBuilder } from '../render/mesh.js';
import { translation, rotationAbout } from '../render/math.js';
import { shade, GLOW } from '../systems/house/palette.js';
import { boundsOf, grow, footprint, noteMesh, inspectOf } from '../systems/memory/market.js';
import { GLOSS, wood, darkWood, paper, ink, mulberry32, wallZ, wallX, colZ, colX } from './pieces.js';

export const CLASS = { x0: -11, x1: -1, z0: -16.3, z1: -23 };
export const CORRIDOR = { x0: -3, x1: -1.4, z0: -23, z1: -47 };
export const MUSIC = { x0: -6, x1: 1, z0: -47, z1: -53 };
/** The corridor repeats every PERIOD metres. Running past LOOP_AT puts you PERIOD back. */
export const PERIOD = 6;
export const LOOP_AT = -35;
const H = 2.7;
const schoolWall = [0.5, 0.5, 0.44];
const boardGreen = [0.1, 0.2, 0.16];
const chalk = [0.86, 0.88, 0.84];
const thread = [0.9, 0.12, 0.08];

/** What the chalkboard says. The first line is there at 23:58; it writes the rest while you look away. */
export const BOARD_LINES = [
  '10-31. typhoon. classes end early. go straight home.',
  'sae, wipe the board please.',
  'who untied the boat',
  'it was not the wind',
  "don't answer when she calls you sae",
  'i only wanted to meet the bus',
  'you can stop running now',
];

/** Chalk "handwriting": strokes along a line, one mesh per line so lines can appear one at a time. */
function chalkLine(text, x0, y, z, rand) {
  const mb = new MeshBuilder();
  let x = x0;
  for (const ch of text) {
    if (ch === ' ') { x += 0.05; continue; }
    const hgt = 0.035 + rand() * 0.035;
    mb.boxRot([x, y + hgt / 2 - 0.02 + (rand() - 0.5) * 0.008, z], [0.008, hgt, 0.004], (rand() - 0.5) * 0.9, chalk, GLOW * 0.25);
    if (rand() < 0.55) mb.boxRot([x + 0.012, y - 0.004, z], [0.026, 0.007, 0.004], (rand() - 0.5) * 0.6, chalk, GLOW * 0.25);
    x += 0.046 + rand() * 0.012;
  }
  return mb.build();
}

function drawingMesh() {
  const mb = new MeshBuilder();
  mb.box([0, 0, 0], [0.28, 0.003, 0.2], [0.9, 0.88, 0.8], GLOSS);
  // Crayon people: a woman, an old woman, a small girl in a red ribbon, and far off a bus with a man in it.
  const crayon = (x, z, w, d, c) => mb.box([x, 0.003, z], [w, 0.002, d], c, GLOSS);
  crayon(-0.09, 0.01, 0.03, 0.07, [0.7, 0.2, 0.2]);
  crayon(-0.09, -0.04, 0.025, 0.025, [0.85, 0.7, 0.55]);
  crayon(-0.04, 0.012, 0.03, 0.07, [0.35, 0.35, 0.5]);
  crayon(-0.04, -0.04, 0.025, 0.025, [0.85, 0.7, 0.55]);
  crayon(0.0, 0.025, 0.02, 0.045, [0.4, 0.6, 0.8]);
  crayon(0.0, -0.01, 0.018, 0.018, [0.85, 0.7, 0.55]);
  crayon(0.0, -0.021, 0.02, 0.006, thread);
  crayon(0.085, -0.02, 0.07, 0.035, [0.9, 0.7, 0.2]);
  crayon(0.085, -0.025, 0.014, 0.012, [0.85, 0.7, 0.55]);
  crayon(0.0, 0.075, 0.24, 0.006, [0.3, 0.45, 0.75]); // the water, a blue line
  crayon(0.01, 0.06, 0.03, 0.012, [0.95, 0.95, 0.92]); // a little white boat on it
  return mb;
}

/**
 * Adds the schoolroom to the village's builders and lists.
 * @param {{ mb: MeshBuilder, revealed: MeshBuilder, colliders: object[], parts: object[], items: object[],
 *   hides: object[], lights: object[], readables: object[], boards: object[] }} v
 */
export function buildSchool(v) {
  const { mb, revealed, colliders, parts, items, hides, lights, readables, boards } = v;
  const rand = mulberry32(1031);

  // ----- the classroom -----
  {
    const { x0, x1, z0, z1 } = CLASS;
    for (let x = x0; x < x1; x++) mb.quadGrid([x, 0.001, z1], [x + 1, 0.001, z1], [x + 1, 0.001, z0], [x, 0.001, z0], 1, 7, shade(wood, 0.62 + (x % 2) * 0.06));
    mb.quadGrid([x0, H, z1], [x1, H, z1], [x1, H, z0], [x0, H, z0], 5, 4, shade(schoolWall, 0.5));
    wallZ(mb, x0, z0, z1, H, [], 0, schoolWall);
    wallZ(mb, x1, z0, z1, H, [], 0, schoolWall);
    wallX(mb, z1, x0, x1, H, [[-3, -1.4]], 0, schoolWall);
    wallX(mb, z0 - 0.02, x0, x1, H, [[-5.6, -4.4]], 0, schoolWall);
    colZ(colliders, x0, z0, z1);
    colZ(colliders, x1, z0, z1);
    colX(colliders, z1, x0, x1, [[-3, -1.4]]);

    // The chalkboard, and the teacher's desk in front of it.
    const B = { x0: -8.1, x1: -4.1, y0: 0.95, y1: 2.15, z: z1 + 0.1 };
    mb.box([(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, B.z], [B.x1 - B.x0, B.y1 - B.y0, 0.03], boardGreen);
    mb.box([(B.x0 + B.x1) / 2, B.y0 - 0.03, B.z + 0.04], [B.x1 - B.x0, 0.03, 0.08], darkWood); // the ledge
    mb.box([-5.0, B.y0 + 0.005, B.z + 0.05], [0.08, 0.015, 0.015], chalk);
    const meshes = BOARD_LINES.map((t, i) => chalkLine(t, B.x0 + 0.15, B.y1 - 0.14 - i * 0.15, B.z + 0.02, rand));
    boards.push({
      id: 'chalkboard', label: 'read the chalkboard', area: 'school',
      center: [(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, B.z],
      bounds: grow(boundsOf([(B.x0 + B.x1) / 2, (B.y0 + B.y1) / 2, B.z], [B.x1 - B.x0, B.y1 - B.y0, 0.1]), 0.05),
      lines: BOARD_LINES, meshes,
      intro: 'chalk, in a child\'s round letters:',
    });
    // Through the lens: her name, small, all around the edges of the board.
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const onTop = i % 2 === 0;
      const x = B.x0 + 0.1 + t * (B.x1 - B.x0 - 0.2);
      revealed.box([x, onTop ? B.y1 - 0.04 : B.y0 + 0.05, B.z + 0.025], [0.07, 0.02, 0.004], [0.62, 0.86, 0.9], GLOW);
    }
    lights.push({ pos: [-6.1, H - 0.3, -21.5], color: [0.8, 0.88, 0.95], weight: 1.4, intensity: 0.55, range: 6 });
    mb.box([-6.1, H - 0.06, -21.5], [0.8, 0.06, 0.16], [0.9, 0.92, 0.88], GLOW * 0.6);
    lights.push({ pos: [-6.1, H - 0.3, -18.0], color: [0.8, 0.88, 0.95], weight: 1.0, intensity: 0.45, range: 6 });
    mb.box([-6.1, H - 0.06, -18.0], [0.8, 0.06, 0.16], [0.9, 0.92, 0.88], GLOW * 0.4);

    const T = [-8.4, -22.35];
    mb.box([T[0], 0.36, T[1]], [1.0, 0.72, 0.5], shade(wood, 0.9));
    mb.box([T[0], 0.735, T[1]], [1.04, 0.03, 0.54], shade(wood, 1.15));
    colliders.push(footprint([T[0], 0, T[1]], [1.0, 0, 0.5]));
    items.push({
      id: 'note-attendance', kind: 'note', name: 'the class register',
      pos: [T[0] + 0.3, 0.76, T[1] + 0.05], size: [0.22, 0.02, 0.16], color: [0.5, 0.42, 0.32],
      text: 'the class register for november 1970. one name is written in every day, and every day has the same small mark beside it: absent. the teacher never crossed her out.',
      inspect: inspectOf(noteMesh(8), 0.3),
    });

    // Small desks in three rows, facing the board. Sae's is in the middle.
    const desk = (x, z, sae) => {
      mb.box([x, 0.27, z], [0.6, 0.54, 0.45], shade(wood, sae ? 0.95 : 0.8));
      mb.box([x, 0.555, z], [0.64, 0.03, 0.48], shade(wood, 1.1));
      // the chair behind it
      mb.box([x, 0.18, z + 0.4], [0.32, 0.03, 0.3], darkWood);
      for (const dx of [-0.13, 0.13]) for (const dz of [0.28, 0.52]) mb.box([x + dx, 0.09, z + dz], [0.03, 0.18, 0.03], darkWood);
      mb.box([x, 0.4, z + 0.54], [0.32, 0.3, 0.03], darkWood);
      colliders.push(footprint([x, 0, z], [0.6, 0, 0.45]));
      colliders.push(footprint([x, 0, z + 0.4], [0.32, 0, 0.3]));
    };
    const SAE = [-7.0, -19.7];
    for (const x of [-8.4, -7.0, -5.6]) for (const z of [-18.5, -19.7, -20.9]) if (x !== SAE[0] || z !== SAE[1]) desk(x, z, false);
    desk(SAE[0], SAE[1], true);
    // Her red ribbon's thread, tied around the chair back; her name scratched in the corner.
    for (let k = 0; k < 6; k++) mb.boxRot([SAE[0] - 0.1 + k * 0.04, 0.45 + (k % 2) * 0.03, SAE[1] + 0.56], [0.03, 0.01, 0.01], k * 0.7, thread);
    mb.box([SAE[0] + 0.2, 0.572, SAE[1] + 0.15], [0.1, 0.003, 0.03], ink);
    // Through the lens: small wet handprints on her desk.
    for (const [dx, dz] of [[-0.15, 0.05], [0.12, -0.08]]) revealed.box([SAE[0] + dx, 0.58, SAE[1] + dz], [0.07, 0.003, 0.08], [0.6, 0.85, 0.9], GLOW);
    const lid = new MeshBuilder();
    lid.box([SAE[0], 0.585, SAE[1]], [0.58, 0.025, 0.4], shade(wood, 1.25));
    const hinge = [SAE[0], 0.585, SAE[1] - 0.2];
    parts.push({
      id: 'sae-desk', kind: 'lid', label: "sae's desk",
      mesh: lid.build(),
      bounds: grow(boundsOf([SAE[0], 0.58, SAE[1]], [0.6, 0.06, 0.45]), 0.06),
      transform: (k) => rotationAbout(hinge, 'x', -1.4 * k),
    });
    items.push({
      id: 'memory-drawing', kind: 'memory', name: "sae's drawing", inside: 'sae-desk',
      pos: [SAE[0], 0.548, SAE[1]], size: [0.28, 0.01, 0.2], color: [0.9, 0.88, 0.8],
      text: 'a crayon drawing: a mother, a grandmother, a girl with a red ribbon, and far away a yellow bus with a man in it. a blue line of water, and a little white boat. underneath: appa comes home tonight.',
      inspect: inspectOf(drawingMesh(), 0.34),
      flashback: [
        '16:10, the same day. the radio says the typhoon has turned north. the teacher sends everyone home early.',
        'sae stays at her desk to finish her drawing. her mother, her grandmother, herself, and her father on the bus.',
        'she writes underneath, very carefully: appa comes home tonight.',
        'on the way out she takes one clean sheet from the teacher\'s desk. for a boat, she says. to meet the bus.',
      ],
    });

    // The cleaning cupboard on the west wall: a place to hide.
    const C = [-10.62, -19.6];
    mb.box([C[0], 0.95, C[1]], [0.6, 1.9, 0.9], shade(wood, 0.75));
    for (let k = 0; k < 6; k++) mb.box([C[0] + 0.305, 1.2 + k * 0.08, C[1]], [0.01, 0.025, 0.7], [0.05, 0.05, 0.05]);
    colliders.push(footprint([C[0], 0, C[1]], [0.6, 0, 0.9]));
    hides.push({
      id: 'school-cupboard', label: 'hide in the cleaning cupboard', overlay: 'slats',
      bounds: grow(boundsOf([C[0], 0.95, C[1]], [0.6, 1.9, 0.9]), 0.05),
      view: { pos: [C[0] + 0.42, 1.45, C[1]], yaw: Math.PI / 2, pitch: -0.05 },
      exit: { pos: [-9.8, C[1]], yaw: Math.PI / 2 },
    });
  }

  // The door from the courtyard: someone wrote on it, too small to read without her spectacles.
  {
    const d = new MeshBuilder();
    const z = CLASS.z0 + 0.3;
    d.box([-5, 1.1, z], [1.2, 2.2, 0.06], shade(wood, 0.7));
    d.box([-5, 1.4, z + 0.035], [0.84, 1.1, 0.01], shade(paper, 0.6));
    for (let i = 0; i < 4; i++) d.box([-5.25 + i * 0.16, 0.06, z + 0.3], [0.1, 0.06, 0.18], [0.6, 0.62, 0.7]); // small shoes outside
    parts.push({
      id: 'school-door', kind: 'door', label: 'the schoolroom door',
      mesh: d.build(),
      bounds: grow(boundsOf([-5, 1.1, z], [1.2, 2.2, 0.1]), 0.1),
      transform: (k) => translation([-1.15 * k, 0, 0]),
      collider: { min: [-5.6, z - 0.1], max: [-4.4, z + 0.1] },
      needs: 'memory-spectacles',
      lockedText: 'small shoes are lined up outside. the door is stuck, and someone has written on it in letters too small to read.',
      openLine: "with wol's spectacles you can read it: sae's class. please wait here for your mothers. the door gives.",
      rate: 2.2,
    });
  }

  // ----- the corridor: the same six metres, over and over -----
  {
    const { x0, x1, z0, z1 } = CORRIDOR;
    mb.quadGrid([x0, 0.001, z1], [x1, 0.001, z1], [x1, 0.001, z0], [x0, 0.001, z0], 2, 24, shade(wood, 0.55));
    mb.quadGrid([x0, H, z1], [x1, H, z1], [x1, H, z0], [x0, H, z0], 2, 24, shade(schoolWall, 0.45));
    wallZ(mb, x0, z0, z1, H, [], 0, schoolWall);
    wallZ(mb, x1, z0, z1, H, [], 0, schoolWall);
    colZ(colliders, x0, z0, z1);
    colZ(colliders, x1, z0, z1);
    for (let z = z0 - 3; z > z1; z -= PERIOD) {
      // A lamp, a dark window on the right, a closed classroom door on the left: identical every PERIOD.
      mb.box([-2.2, H - 0.05, z], [0.18, 0.08, 0.18], [0.95, 0.9, 0.75], GLOW * 0.7);
      lights.push({ pos: [-2.2, H - 0.25, z], color: [1, 0.86, 0.62], weight: 1.2, intensity: 0.5, range: 4.5 });
      mb.box([x1 - 0.05, 1.5, z], [0.02, 0.8, 1.1], [0.04, 0.05, 0.07]);
      mb.box([x0 + 0.05, 1.05, z - 3], [0.03, 2.05, 0.95], shade(wood, 0.65));
      mb.box([x0 + 0.07, 2.25, z - 3], [0.02, 0.14, 0.4], shade(paper, 0.9));
    }
  }

  // ----- the music room -----
  {
    const { x0, x1, z0, z1 } = MUSIC;
    for (let x = x0; x < x1; x++) mb.quadGrid([x, 0.001, z1], [x + 1, 0.001, z1], [x + 1, 0.001, z0], [x, 0.001, z0], 1, 6, shade(wood, 0.66 + (x % 2) * 0.05));
    mb.quadGrid([x0, H, z1], [x1, H, z1], [x1, H, z0], [x0, H, z0], 4, 4, shade(schoolWall, 0.45));
    wallZ(mb, x0, z0, z1, H, [], 0, schoolWall);
    wallZ(mb, x1, z0, z1, H, [], 0, schoolWall);
    wallX(mb, z0, x0, x1, H, [[-3, -1.4]], 0, schoolWall);
    wallX(mb, z1, x0, x1, H, [], 0, schoolWall);
    colZ(colliders, x0, z0, z1);
    colZ(colliders, x1, z0, z1);
    colX(colliders, z0, x0, x1, [[-3, -1.4]]);
    colX(colliders, z1, x0, x1);

    // A pump organ against the back wall, the songbook open on it.
    const O = [-3.0, -52.5];
    mb.box([O[0], 0.55, O[1]], [1.4, 1.1, 0.5], shade(darkWood, 1.2));
    mb.box([O[0], 0.82, O[1] + 0.26], [1.2, 0.03, 0.12], [0.85, 0.82, 0.74]);
    for (let k = 0; k < 14; k++) mb.box([O[0] - 0.56 + k * 0.08, 0.84, O[1] + 0.3], [0.03, 0.015, 0.06], [0.08, 0.07, 0.07]);
    colliders.push(footprint([O[0], 0, O[1]], [1.4, 0, 0.5]));
    items.push({
      id: 'note-songbook', kind: 'note', name: "the class songbook",
      pos: [O[0] + 0.3, 1.13, O[1] + 0.12], size: [0.3, 0.02, 0.2], color: [0.86, 0.8, 0.66],
      text: "the class songbook, open at a page with no words, only notes. in the margin, the teacher's pencil: sae hums this when she is frightened. hum it back to her and she calms down.",
      inspect: inspectOf(noteMesh(6), 0.32),
    });

    // A tin music box on a stool in the middle of the room.
    const M = [-2.2, -50.0];
    mb.box([M[0], 0.25, M[1]], [0.36, 0.5, 0.36], darkWood);
    mb.box([M[0], 0.56, M[1]], [0.18, 0.1, 0.13], [0.62, 0.5, 0.3], GLOSS);
    mb.box([M[0], 0.64, M[1]], [0.02, 0.06, 0.02], [0.85, 0.8, 0.76]); // the little dancer
    colliders.push(footprint([M[0], 0, M[1]], [0.36, 0, 0.36]));
    readables.push({
      id: 'music-box', label: 'wind the music box',
      bounds: grow(boundsOf([M[0], 0.58, M[1]], [0.2, 0.14, 0.15]), 0.1),
      music: 1,
      lines: ['a tin music box with a dancer whose paint has worn away. you wind it. it plays a few notes and stops, as if it forgot the rest.'],
    });
    lights.push({ pos: [M[0], H - 0.3, M[1]], color: [1, 0.8, 0.55], weight: 1.4, intensity: 0.55, range: 5 });
    mb.box([M[0], H - 0.06, M[1]], [0.2, 0.06, 0.2], [1, 0.9, 0.7], GLOW * 0.6);

    // The stage curtain in the corner: room to stand behind it.
    const K = [-5.8, -49.6];
    for (let k = 0; k < 7; k++) mb.box([K[0], 1.2, K[1] - 0.6 + k * 0.2], [0.06 + (k % 2) * 0.04, 2.4, 0.2], [0.36, 0.08, 0.08]);
    colliders.push({ min: [K[0] - 0.2, K[1] - 0.7], max: [K[0] + 0.12, K[1] + 0.7] });
    hides.push({
      id: 'curtain', label: 'stand behind the curtain',
      bounds: grow(boundsOf([K[0], 1.2, K[1]], [0.2, 2.4, 1.4]), 0.08),
      view: { pos: [K[0] + 0.25, 1.45, K[1] + 0.2], yaw: Math.PI / 2 + 0.3, pitch: -0.05 },
      exit: { pos: [-5.0, K[1]], yaw: Math.PI / 2 },
    });
  }
}

/** Where the Caller walks while you are in the classroom or the corridor. */
export const SCHOOL_ROUTE = [[-4.6, -17.2], [-4.4, -21.6], [-9.8, -21.6], [-9.8, -17.2]];
/** And in the music room. */
export const MUSIC_ROUTE = [[-5.0, -48.0], [0.0, -48.0], [0.0, -51.6], [-5.0, -51.6]];

export const SCHOOL_ITEM_IDS = ['memory-drawing', 'note-attendance', 'note-songbook'];

export const CORRIDOR_LINES = [
  'the lamp ahead looks just like the one you passed.',
  'the same door. the same lamp. the corridor is longer than it was.',
  "a child's voice, from everywhere at once: no running in the halls.",
];
export const CORRIDOR_PASS = 'you walk slowly, the way you were told to. the corridor finally ends.';
