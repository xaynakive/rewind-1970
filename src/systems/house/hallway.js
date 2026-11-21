// The hallway: the front door behind you, the living room to the left, the
// messy room to the right, stairs up ahead, and an attic hatch hanging open.
// Area interface: see systems/house/areas.js.

import { MeshBuilder } from '../../render/mesh.js';
import { PALETTE, shade, GLOW, SKY } from './palette.js';

const W = 2.2, H = 2.6, UPPER = 5.2;
const Z0 = 2.2, Z1 = -7;
const STAIRS_FROM = -4;
const wall = shade(PALETTE.dampWall, 1.05);
const wood = PALETTE.rotWood;
const frame = shade(PALETTE.rotWood, 0.8);

export function buildHallway() {
  const mb = new MeshBuilder();
  const x0 = -W / 2, x1 = W / 2;

  // Walls run up to the upper landing; the ceiling stops where the stairs begin.
  mb.box([0, UPPER / 2, (Z0 + Z1) / 2], [W, UPPER, Z0 - Z1], wall, 0, ['ny', 'py']);
  mb.quad([x0, 0, Z1], [x1, 0, Z1], [x1, 0, Z0], [x0, 0, Z0], wood);
  mb.quad([x0, H, STAIRS_FROM], [x0, H, Z0], [x1, H, Z0], [x1, H, STAIRS_FROM], shade(wall, 0.6));
  mb.quad([x0, UPPER, Z1], [x0, UPPER, STAIRS_FROM], [x1, UPPER, STAIRS_FROM], [x1, UPPER, Z1], shade(wall, 0.4));
  mb.quad([x0 + 0.3, 0.01, 1.6], [x1 - 0.3, 0.01, 1.6], [x1 - 0.3, 0.01, -3.6], [x0 + 0.3, 0.01, -3.6], [0.2, 0.09, 0.1]); // runner

  // Doorways: living room on the left, messy room on the right.
  doorway(mb, x0 + 0.01, -1.6, -0.6, +1, shade(PALETTE.crtGlow, 0.18));
  doorway(mb, x1 - 0.01, -3.4, -2.4, -1, shade(PALETTE.pumpkin, 0.12));
  // The messy room's door, hinged at the far edge and left ajar into the hall.
  // Its length runs along local z; turning by -0.9 swings the free end toward -x.
  const swing = -0.9, leaf = 0.84;
  mb.boxRot([x1 + (leaf / 2) * Math.sin(swing), 1.02, -3.4 + (leaf / 2) * Math.cos(swing)], [0.04, 2.0, leaf], swing, shade(wood, 0.7));

  // Stairs up, and a window on the upper landing.
  const steps = 8, rise = 0.32, run = (STAIRS_FROM - Z1) / steps;
  for (let i = 0; i < steps; i++) {
    const h = (i + 1) * rise;
    mb.box([0, h / 2, STAIRS_FROM - (i + 0.5) * run], [W - 0.02, h, run], shade(wood, 0.85 - i * 0.04));
  }
  mb.quad([-0.45, 3.4, Z1 + 0.01], [0.45, 3.4, Z1 + 0.01], [0.45, 4.4, Z1 + 0.01], [-0.45, 4.4, Z1 + 0.01], PALETTE.night, SKY);
  mb.box([x0 + 0.05, 1.0, -5.5], [0.06, 0.06, 3.2], frame); // handrail

  // Attic hatch open in the ceiling, with its ladder pulled down.
  mb.quad([-0.4, H - 0.01, -2.4], [0.4, H - 0.01, -2.4], [0.4, H - 0.01, -1.6], [-0.4, H - 0.01, -1.6], PALETTE.void, GLOW);
  for (const x of [-0.26, 0.26]) mb.box([x, 1.8, -2.25], [0.05, 1.6, 0.05], frame);
  for (let y = 1.15; y < 2.6; y += 0.32) mb.box([0, y, -2.25], [0.5, 0.04, 0.05], frame);
  mb.box([0.32, 2.2, -1.65], [0.01, 0.8, 0.01], PALETTE.tapeLabel); // the pull cord
  // A crate under the ladder, as if someone stood on it to reach the hatch.
  mb.boxRot([0.45, 0.24, -2.65], [0.5, 0.48, 0.42], -0.12, [0.33, 0.25, 0.16]);

  // A portrait with nobody in it, and a bare bulb.
  mb.box([x0 + 0.02, 1.6, -2.7], [0.03, 0.56, 0.44], frame);
  mb.quad([x0 + 0.04, 1.36, -2.52], [x0 + 0.04, 1.84, -2.52], [x0 + 0.04, 1.84, -2.88], [x0 + 0.04, 1.36, -2.88], [0.16, 0.14, 0.12]);
  mb.box([0, 2.5, -0.9], [0.01, 0.2, 0.01], PALETTE.void);
  mb.box([0, 2.37, -0.9], [0.07, 0.09, 0.07], PALETTE.tapeLabel, GLOW);

  return {
    id: 'hallway',
    outdoors: false,
    meshData: mb.build(),
    triangles: mb.triangles,
    viewpoints: [
      { id: 'hall-entry', label: 'the hallway', position: [0, 1.55, 1.5], lookAt: [0, 0.95, Z1],
        exits: { back: 'yard-porch', left: 'living-room', right: 'messy-room', forward: 'bedroom' } },
    ],
    spots: {
      // On the crate under the ladder, as if brought down from the attic.
      'attic-hatch': { pos: [0.45, 0.49, -2.62], rotY: -0.12, maxStack: 3 },
      // The previous resident's last tape, on the top rung of the attic ladder.
      'house-attic': { pos: [0, 2.45, -2.25], rotY: 0, maxStack: 1 },
    },
    hotspots: [],
    sky: PALETTE.night,
    fogColor: PALETTE.void,
    fogNear: 3,
    fogFar: 11,
    ambient: [0.14, 0.13, 0.14],
    flashDir: [0, -0.4, 1],
    flashScale: 0.45,
    lights(t) {
      const bulb = 0.9 + 0.08 * Math.sin(t * 0.05) + (Math.sin(t * 0.0023 + 1) > 0.985 ? -0.6 : 0);
      return [
        { pos: [0, 2.25, -0.9], color: [0.95, 0.78, 0.55], intensity: 2.1 * bulb, range: 7.5 },
        { pos: [-1.5, 1.1, -1.1], color: PALETTE.crtGlow, intensity: 1.0, range: 3.2 },
        { pos: [0, 3.9, -6.2], color: [0.35, 0.42, 0.6], intensity: 1.3, range: 5.5 },
      ];
    },
  };
}

/** Dark doorway in a side wall at x, with a frame. `side` is the direction into the hall. */
function doorway(mb, x, z0, z1, side, spill) {
  mb.quad([x, 0.01, z0], [x, 2.1, z0], [x, 2.1, z1], [x, 0.01, z1], spill, GLOW);
  const fx = x + side * 0.02;
  mb.box([fx, 1.05, z0], [0.05, 2.1, 0.08], frame);
  mb.box([fx, 1.05, z1], [0.05, 2.1, 0.08], frame);
  mb.box([fx, 2.12, (z0 + z1) / 2], [0.05, 0.08, z1 - z0 + 0.08], frame);
}
