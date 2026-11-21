// The bedroom upstairs: a made bed with room underneath, a nightstand lamp,
// a wardrobe with its door hanging open, a window onto the storm.
// Area interface: see systems/house/areas.js.

import { MeshBuilder } from '../../render/mesh.js';
import { PALETTE, shade, GLOW, SKY } from './palette.js';

const W = 5, H = 2.4, Z0 = 2.5, Z1 = -3;

export function buildBedroom() {
  const mb = new MeshBuilder();
  const wall = mixWall();
  const wood = PALETTE.rotWood;

  mb.box([0, H / 2, (Z0 + Z1) / 2], [W, H, Z0 - Z1], wall, 0, ['ny', 'py']);
  mb.quad([-2.5, 0, Z1], [2.5, 0, Z1], [2.5, 0, Z0], [-2.5, 0, Z0], shade(wood, 0.9));
  mb.quad([-2.5, H, Z1], [-2.5, H, Z0], [2.5, H, Z0], [2.5, H, Z1], shade(wall, 0.6));
  mb.quad([-1.6, 0.01, -0.6], [1.0, 0.01, -0.6], [1.0, 0.01, 1.2], [-1.6, 0.01, 1.2], [0.14, 0.13, 0.18]); // rug

  // Bed against the back wall, on legs, so there's dark space underneath.
  const bx = -1.1, bz = -2.0;
  mb.box([bx, 0.3, bz], [1.6, 0.12, 2.0], wood);
  for (const [lx, lz] of [[-0.75, -0.95], [0.75, -0.95], [-0.75, 0.95], [0.75, 0.95]]) {
    mb.box([bx + lx, 0.12, bz + lz], [0.08, 0.24, 0.08], shade(wood, 0.8));
  }
  mb.box([bx, 0.72, Z1 + 0.04], [1.6, 0.95, 0.06], shade(wood, 0.9));
  mb.box([bx, 0.45, bz], [1.5, 0.18, 1.9], shade(PALETTE.tapeLabel, 0.5));
  mb.box([bx, 0.6, -2.65], [0.9, 0.1, 0.34], shade(PALETTE.tapeLabel, 0.68));
  const blanket = shade(PALETTE.bloodMoon, 0.5);
  mb.box([bx, 0.565, -1.6], [1.56, 0.05, 1.25], blanket);
  mb.box([bx, 0.44, -0.98], [1.56, 0.26, 0.03], blanket); // hangs down at the foot

  // Nightstand and lamp.
  mb.box([0.0, 0.3, -2.7], [0.45, 0.6, 0.4], shade(wood, 1.05));
  mb.box([0.0, 0.66, -2.7], [0.08, 0.12, 0.08], PALETTE.void);
  mb.box([0.0, 0.83, -2.7], [0.26, 0.22, 0.26], shade(PALETTE.pumpkin, 0.85), GLOW);

  // Wardrobe on the right, its door hanging open.
  const wz = -2.62, front = wz + 0.35;
  mb.box([1.85, 1.05, wz], [1.1, 2.1, 0.7], shade(wood, 0.75));
  mb.quad([1.86, 0.06, front + 0.01], [2.36, 0.06, front + 0.01], [2.36, 2.04, front + 0.01], [1.86, 2.04, front + 0.01], PALETTE.void, GLOW);
  mb.box([1.84, 1.05, front + 0.01], [0.02, 2.0, 0.02], shade(wood, 0.5)); // seam of the closed door
  const swing = 1.0, leaf = 0.53;
  mb.boxRot([2.4 - (leaf / 2) * Math.cos(swing), 1.05, front + (leaf / 2) * Math.sin(swing)], [leaf, 2.0, 0.03], swing, shade(wood, 0.85));

  // Window with curtains on the back wall.
  mb.quad([0.5, 1.1, Z1 + 0.01], [1.2, 1.1, Z1 + 0.01], [1.2, 2.0, Z1 + 0.01], [0.5, 2.0, Z1 + 0.01], PALETTE.night, SKY);
  const curtain = shade(PALETTE.bloodMoon, 0.35);
  mb.box([0.4, 1.45, Z1 + 0.05], [0.18, 1.3, 0.04], curtain);
  mb.box([1.3, 1.45, Z1 + 0.05], [0.18, 1.3, 0.04], curtain);

  return {
    id: 'bedroom',
    outdoors: false,
    meshData: mb.build(),
    triangles: mb.triangles,
    viewpoints: [
      { id: 'bedroom', label: 'upstairs', position: [0.3, 1.5, 1.9], lookAt: [0, 0.55, Z1],
        exits: { back: 'hall-entry' } },
    ],
    spots: {
      // Under the foot of the bed, just far enough out to see.
      'under-bed': { pos: [-0.95, 0.01, -1.12], rotY: 0.15, maxStack: 3 },
      // On the floor in front of the open wardrobe, as if they fell out.
      wardrobe: { pos: [1.7, 0.01, -1.8], rotY: -0.3, maxStack: 4 },
    },
    hotspots: [],
    sky: PALETTE.night,
    fogColor: PALETTE.void,
    fogNear: 3,
    fogFar: 9,
    ambient: [0.13, 0.12, 0.14],
    flashDir: [0, 0, 1],
    flashScale: 0.85,
    lights(t) {
      const lamp = 0.9 + 0.06 * Math.sin(t * 0.011);
      return [
        { pos: [0.0, 1.0, -2.55], color: PALETTE.pumpkin, intensity: 1.7 * lamp, range: 4 },
        { pos: [0.85, 1.6, -2.6], color: [0.35, 0.42, 0.6], intensity: 0.8, range: 4.2 },
        { pos: [1.6, 1.8, 1.8], color: [0.6, 0.55, 0.6], intensity: 0.45, range: 4 },
      ];
    },
  };
}

function mixWall() {
  return PALETTE.dampWall.map((v, i) => v * 1.05 + [0.01, 0, 0.02][i]);
}
