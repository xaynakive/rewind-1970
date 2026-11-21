// The messy room: a heap of pumpkins, boxes nobody unpacked, papers on the
// floor, and a chair facing the wall. Area interface: see systems/house/areas.js.

import { MeshBuilder, rotateY } from '../../render/mesh.js';
import { mulberry32 } from '../../core/hash.js';
import { PALETTE, shade, GLOW, SKY } from './palette.js';

const W = 5, H = 2.5, D = 5;
const cardboard = [0.36, 0.27, 0.17];
const stem = [0.23, 0.23, 0.12];

const PUMPKINS = [
  [-0.9, 0.23, -1.8, 0.27, 0.25], [-0.35, 0.19, -1.95, 0.22, 0.15], [-1.3, 0.16, -1.35, 0.18, 0],
  [-0.65, 0.53, -1.85, 0.2, 0.3], [-0.05, 0.14, -1.55, 0.15, 0], [-1.05, 0.55, -1.6, 0.16, 0],
  [-1.5, 0.14, -2.05, 0.15, 0.2], [-0.5, 0.82, -1.9, 0.13, 0],
];

export function buildMessyRoom() {
  const mb = new MeshBuilder();
  const wall = shade(PALETTE.dampWall, 0.95);

  mb.box([0, H / 2, 0], [W, H, D], wall, 0, ['ny', 'py']);
  mb.quad([-2.5, 0, -2.5], [2.5, 0, -2.5], [2.5, 0, 2.5], [-2.5, 0, 2.5], shade(PALETTE.rotWood, 0.8));
  mb.quad([-2.5, H, -2.5], [-2.5, H, 2.5], [2.5, H, 2.5], [2.5, H, -2.5], shade(wall, 0.6));

  // The pumpkin pile. Some have faces cut into them, and glow.
  for (const [x, y, z, r, glow] of PUMPKINS) {
    mb.blob([x, y, z], r, 0.78, 9, 4, PALETTE.pumpkin, glow, 5);
    mb.box([x, y + r * 0.8, z], [0.035, 0.07, 0.035], stem);
  }

  // Boxes stacked against the right wall.
  mb.box([1.5, 0.27, -1.9], [0.75, 0.54, 0.6], cardboard);
  mb.boxRot([1.45, 0.75, -1.95], [0.55, 0.42, 0.5], 0.22, shade(cardboard, 0.9));
  mb.boxRot([1.95, 0.21, -0.85], [0.5, 0.42, 0.5], -0.35, shade(cardboard, 1.05));

  // A chair, turned to face the corner.
  chair(mb, [1.0, 0, 0.2], Math.PI * 0.8);

  // Papers scattered on the floor (1 cm up).
  const rand = mulberry32(31);
  for (let i = 0; i < 9; i++) {
    const c = [-1.6 + rand() * 3, 0.01, -0.9 + rand() * 2];
    const a = rand() * Math.PI;
    const q = [[-0.1, 0, -0.14], [0.1, 0, -0.14], [0.1, 0, 0.14], [-0.1, 0, 0.14]].map((p) => {
      const r = rotateY(p, a);
      return [c[0] + r[0], c[1], c[2] + r[2]];
    });
    mb.quad(q[0], q[1], q[2], q[3], shade(PALETTE.tapeLabel, 0.5 + rand() * 0.2));
  }

  // Window onto the storm, left wall.
  const wx = -2.49;
  mb.quad([wx, 1.0, 0.6], [wx, 2.0, 0.6], [wx, 2.0, -0.6], [wx, 1.0, -0.6], PALETTE.night, SKY);
  const f = shade(PALETTE.rotWood, 0.8);
  mb.box([wx + 0.02, 1.5, 0], [0.05, 1.04, 0.05], f);
  mb.box([wx + 0.02, 1.5, 0], [0.05, 0.05, 1.24], f);
  mb.box([wx + 0.04, 0.98, 0], [0.09, 0.06, 1.3], f);

  return {
    id: 'messy-room',
    outdoors: false,
    meshData: mb.build(),
    triangles: mb.triangles,
    viewpoints: [
      { id: 'messy-room', label: 'the messy room', position: [0.4, 1.5, 1.9], lookAt: [-0.4, 0.45, -2.5],
        exits: { back: 'hall-entry' } },
    ],
    spots: {
      // In front of the pile, as if one rolled off.
      'pumpkin-pile': { pos: [-0.35, 0.01, -1.05], rotY: 0.15, maxStack: 4 },
    },
    hotspots: [],
    sky: PALETTE.night,
    fogColor: PALETTE.void,
    fogNear: 3,
    fogFar: 9,
    ambient: [0.14, 0.12, 0.13],
    flashDir: [1, 0, 0],
    flashScale: 0.85,
    lights(t) {
      const candle = 0.8 + 0.12 * Math.sin(t * 0.019) + 0.1 * Math.sin(t * 0.061 + 2);
      return [
        { pos: [-0.6, 0.8, -1.1], color: PALETTE.pumpkin, intensity: 2.6 * candle, range: 4.6 },
        { pos: [-2.2, 1.5, 0], color: [0.35, 0.42, 0.6], intensity: 1.0, range: 4.5 },
        { pos: [2.2, 1.4, 1.6], color: [0.95, 0.78, 0.55], intensity: 0.9, range: 4.2 },
      ];
    },
  };
}

function chair(mb, [x, , z], a) {
  const wood = shade(PALETTE.rotWood, 1.1);
  const at = (p) => { const r = rotateY(p, a); return [x + r[0], r[1], z + r[2]]; };
  mb.boxRot(at([0, 0.45, 0]), [0.44, 0.05, 0.44], a, wood);
  mb.boxRot(at([0, 0.78, -0.2]), [0.44, 0.6, 0.04], a, wood);
  for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) {
    mb.boxRot(at([lx, 0.22, lz]), [0.04, 0.44, 0.04], a, wood);
  }
}
