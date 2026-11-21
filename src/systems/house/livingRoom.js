// The living room: TV, VCR, sofa, pumpkins, a window onto the storm.
// Built from primitives. Steering: art-style.md (palette, budgets).

import { MeshBuilder, hexToRgb } from '../../render/mesh.js';

export const PALETTE = {
  void: hexToRgb('#07060a'),
  night: hexToRgb('#141a24'),
  dampWall: hexToRgb('#2b2a26'),
  rotWood: hexToRgb('#4a3524'),
  pumpkin: hexToRgb('#c8641e'),
  tapeLabel: hexToRgb('#d8cfb4'),
  crtGlow: hexToRgb('#7fb8a4'),
  bloodMoon: hexToRgb('#8a1c1c'),
  lightning: hexToRgb('#dfe8ff'),
};

// Supporting shades derived from the palette (darker variants only).
const shade = (c, k) => c.map((v) => v * k);
const plastic = shade(PALETTE.void, 2.6);
const rug = [0.23, 0.12, 0.13];
const stem = [0.23, 0.23, 0.12];

const W = 6, H = 2.6, D = 6;

const TV = { center: [0, 1.08, -2.55], size: [0.9, 0.7, 0.6] };
const VCR = { center: [0, 0.67, -2.45], size: [0.7, 0.12, 0.4] };
const CABINET = { center: [0, 0.3, -2.5], size: [1.4, 0.6, 0.6] };
const SHELF_BASE = 0.08; // height of the shelf floor above the ground

export function buildLivingRoom() {
  const mb = new MeshBuilder();

  // Shell: floor, ceiling, four walls. Faces point inward; lighting is two-sided.
  mb.box([0, H / 2, 0], [W, H, D], PALETTE.dampWall, 0, ['ny', 'py']);
  mb.quad([-3, 0, -3], [3, 0, -3], [3, 0, 3], [-3, 0, 3], PALETTE.rotWood);
  mb.quad([-3, H, -3], [-3, H, 3], [3, H, 3], [3, H, -3], shade(PALETTE.dampWall, 0.6));
  mb.quad([-1.4, 0.005, -1.6], [1.4, 0.005, -1.6], [1.4, 0.005, 0.8], [-1.4, 0.005, 0.8], rug);

  // TV on its cabinet, VCR between.
  buildCabinet(mb);
  mb.box(VCR.center, VCR.size, plastic);
  // Details sit 1 cm proud of their surface: closer than that z-fights in a 16-bit depth buffer.
  mb.quad([0.14, 0.655, -2.24], [0.3, 0.655, -2.24], [0.3, 0.69, -2.24], [0.14, 0.69, -2.24], PALETTE.bloodMoon, 1); // VCR clock: 00:00
  mb.quad([-0.29, 0.66, -2.24], [-0.07, 0.66, -2.24], [-0.07, 0.68, -2.24], [-0.29, 0.68, -2.24], PALETTE.void, 1); // tape slot
  mb.box(TV.center, TV.size, plastic);
  mb.quad([-0.34, 0.86, -2.24], [0.34, 0.86, -2.24], [0.34, 1.32, -2.24], [-0.34, 1.32, -2.24], PALETTE.crtGlow, 0.85);
  mb.box([-0.15, 1.5, -2.6], [0.02, 0.36, 0.02], plastic); // antenna
  mb.box([0.15, 1.5, -2.6], [0.02, 0.36, 0.02], plastic);

  // Sofa on the left, angled toward the TV by shape only.
  const sofa = shade(PALETTE.bloodMoon, 0.55);
  mb.box([-1.9, 0.22, 0.2], [0.9, 0.44, 1.8], sofa);
  mb.box([-2.3, 0.6, 0.2], [0.2, 0.75, 1.8], sofa);
  mb.box([-1.9, 0.45, -0.75], [0.9, 0.5, 0.15], sofa);
  mb.box([-1.9, 0.45, 1.15], [0.9, 0.5, 0.15], sofa);

  // Window on the right wall, looking out at the storm.
  mb.quad([2.99, 1.0, -1.6], [2.99, 2.0, -1.6], [2.99, 2.0, -0.4], [2.99, 1.0, -0.4], PALETTE.night, 2);
  const frame = shade(PALETTE.rotWood, 0.8);
  mb.box([2.97, 1.5, -1.0], [0.05, 1.04, 0.05], frame);
  mb.box([2.97, 1.5, -1.0], [0.05, 0.05, 1.24], frame);
  mb.box([2.97, 1.0, -1.0], [0.08, 0.06, 1.3], frame);
  mb.box([2.97, 2.0, -1.0], [0.08, 0.06, 1.3], frame);

  // Pumpkins in the corner.
  mb.blob([1.95, 0.19, -2.2], 0.24, 0.8, 10, 5, PALETTE.pumpkin, 0.2, 5);
  mb.box([1.95, 0.42, -2.2], [0.04, 0.08, 0.04], stem);
  mb.blob([2.4, 0.13, -1.75], 0.17, 0.78, 9, 4, PALETTE.pumpkin, 0.2, 5);
  mb.box([2.4, 0.29, -1.75], [0.03, 0.06, 0.03], stem);
  mb.blob([1.55, 0.11, -2.55], 0.14, 0.8, 8, 4, shade(PALETTE.pumpkin, 0.8), 0.1, 4);

  return {
    meshData: mb.build(),
    triangles: mb.triangles,
    viewpoint: { position: [0.3, 1.38, 1.4], lookAt: [0, 0.85, -2.5] },
    /** Hiding spots in this area (ids from systems/tapes/placement.js). Tapes rest on top. */
    spots: {
      // On the floor of the cabinet's right-hand shelf, spines facing the room.
      // maxStack: how many cassettes fit on the shelf before they'd hit the top board.
      'tv-cabinet': { pos: [0.35, SHELF_BASE + 0.01, -2.33], maxStack: 6 },
    },
    sky: PALETTE.night,
    flashDir: [1, 0, 0],
    fogColor: PALETTE.void,
    fogNear: 4,
    fogFar: 11,
    ambient: [0.12, 0.11, 0.14],
    hotspots: [
      { id: 'vcr', label: 'vcr', ...bounds(VCR, 0.05) },
      { id: 'tv', label: 'tv', ...bounds({ center: [0, 1.1, -2.55], size: [0.9, 0.62, 0.6] }, 0) },
    ],
    /** Lights at time t (ms). */
    lights(t) {
      const tvFlicker = 0.85 + 0.1 * Math.sin(t * 0.013) * Math.sin(t * 0.0071) + 0.05 * Math.sin(t * 0.09);
      const candle = 0.8 + 0.12 * Math.sin(t * 0.021) + 0.08 * Math.sin(t * 0.057 + 1.3);
      return [
        { pos: [0, 1.15, -1.7], color: PALETTE.crtGlow, intensity: 2.2 * tvFlicker, range: 6 },
        { pos: [1.9, 0.55, -1.8], color: PALETTE.pumpkin, intensity: 2.4 * candle, range: 3.4 },
        { pos: [2.5, 1.6, -1.0], color: [0.35, 0.42, 0.6], intensity: 0.9, range: 4.2 },
      ];
    },
  };
}

/** Cabinet with two open shelves facing the room. Tapes hide in the right one. */
function buildCabinet(mb) {
  const [cx, cy, cz] = CABINET.center;
  const [sx, sy, sz] = CABINET.size;
  const x0 = cx - sx / 2, x1 = cx + sx / 2;
  const y0 = cy - sy / 2, y1 = cy + sy / 2;
  const z0 = cz - sz / 2, z1 = cz + sz / 2;
  const t = 0.04; // board thickness
  const wood = PALETTE.rotWood;
  const inside = shade(PALETTE.rotWood, 0.35);

  mb.box([cx, y1 - t / 2, cz], [sx, t, sz], wood);                  // top
  mb.box([cx, y0 + SHELF_BASE / 2, cz], [sx, SHELF_BASE, sz], wood); // plinth / shelf floor
  mb.box([x0 + t / 2, cy, cz], [t, sy, sz], wood);                  // left side
  mb.box([x1 - t / 2, cy, cz], [t, sy, sz], wood);                  // right side
  mb.box([cx, cy, cz], [t, sy, sz], wood);                          // divider
  mb.box([cx, cy, z0 + t / 2], [sx, sy, t], inside);                // back panel
  // Darker inner floor and underside of the top, so the shelves read as hollow.
  // (1 cm offsets: anything closer z-fights in the 16-bit depth buffer.)
  const fy = y0 + SHELF_BASE + 0.01;
  const ty = y1 - t - 0.01;
  mb.quad([x0 + t, fy, z0 + t], [x1 - t, fy, z0 + t], [x1 - t, fy, z1], [x0 + t, fy, z1], inside);
  mb.quad([x0 + t, ty, z0 + t], [x1 - t, ty, z0 + t], [x1 - t, ty, z1], [x0 + t, ty, z1], shade(inside, 0.6));
}

function bounds({ center, size }, pad) {
  return {
    min: center.map((c, i) => c - size[i] / 2 - pad),
    max: center.map((c, i) => c + size[i] / 2 + pad),
  };
}
