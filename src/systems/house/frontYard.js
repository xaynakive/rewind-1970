// The front yard in the storm: the house, the gate, the mailbox, three graves,
// a dead tree, the pond and a blood moon. Rain falls here.
// Area interface: see systems/house/areas.js.

import { MeshBuilder } from '../../render/mesh.js';
import { mulberry32 } from '../../core/hash.js';
import { PALETTE, shade, mix, GLOW, SKY, RAIN, UNFOGGED } from './palette.js';

const grass = [0.07, 0.09, 0.07];
const stone = [0.21, 0.2, 0.19];
const dirt = [0.17, 0.12, 0.08];
const siding = shade(PALETTE.dampWall, 1.15);
const roof = shade(PALETTE.void, 2.2);
const wood = PALETTE.rotWood;
const water = [0.02, 0.03, 0.06];
const rainColor = [0.5, 0.56, 0.66];

const FRONT = -8; // the house's front wall

/** Camera positions, also used to turn tape piles toward the viewer. */
const CAM = {
  gate: [0, 1.75, 12.5],
  graves: [-2.0, 1.5, 2.6],
  pond: [2.2, 1.5, 2.8],
  porch: [0, 1.6, -4.6],
};

const GRAVES = [
  { x: -4.3, z: -1.5, rot: 0.12 },
  { x: -3.0, z: -0.5, rot: -0.1 },
  { x: -5.5, z: -0.2, rot: 0.3 },
];
const POND = { x: 4.2, z: -1.6, rx: 1.7, rz: 1.3 };

/** rotY that turns a tape pile at `pos` so its spine faces `cam`. */
const face = (pos, cam) => Math.atan2(cam[0] - pos[0], cam[2] - pos[2]);

export function buildFrontYard() {
  const mb = new MeshBuilder();

  // Ground and the stone path to the door (1 cm up, to avoid z-fighting).
  mb.quad([-18, 0, -14], [18, 0, -14], [18, 0, 14], [-18, 0, 14], grass);
  mb.quad([-0.6, 0.01, FRONT + 0.5], [0.6, 0.01, FRONT + 0.5], [0.6, 0.01, 6.6], [-0.6, 0.01, 6.6], stone);

  buildHouseFront(mb);
  buildFence(mb);
  const mailboxSpot = buildMailbox(mb);
  const graveSpots = GRAVES.map((g, i) => buildGrave(mb, g, i));
  buildTree(mb, [-7, 0, -3.5]);
  const pondSpot = buildPond(mb);

  // Blood moon, low over the roofline. Unfogged, so it reads through the storm.
  disc(mb, [10, 15, -42], 2.4, 14, mix(PALETTE.bloodMoon, [1, 0.6, 0.5], 0.25), UNFOGGED);

  buildRain(mb, 380, 7);

  const spots = {
    mailbox: mailboxSpot,
    pond: pondSpot,
    'grave-1': graveSpots[0],
    'grave-2': graveSpots[1],
    'grave-3': graveSpots[2],
  };

  return {
    id: 'front-yard',
    outdoors: true,
    meshData: mb.build(),
    triangles: mb.triangles,
    viewpoints: [
      { id: 'yard-gate', label: 'the gate', position: CAM.gate, lookAt: [0, 1.9, FRONT],
        exits: { forward: 'yard-porch', left: 'yard-graves', right: 'yard-pond' } },
      { id: 'yard-graves', label: 'the graves', position: CAM.graves, lookAt: [-4.3, 0.35, -1.0],
        exits: { back: 'yard-gate', right: 'yard-pond' } },
      { id: 'yard-pond', label: 'the pond', position: CAM.pond, lookAt: [4.2, 0.05, -1.4],
        exits: { back: 'yard-gate', left: 'yard-graves' } },
      { id: 'yard-porch', label: 'the porch', position: CAM.porch, lookAt: [0, 1.35, FRONT],
        exits: { forward: 'hall-entry', back: 'yard-gate' } },
    ],
    spots,
    hotspots: [],
    sky: PALETTE.night,
    fogColor: [0.07, 0.085, 0.12],
    fogNear: 7,
    fogFar: 30,
    ambient: [0.14, 0.15, 0.19],
    flashDir: normalize([0.25, 1, 0.35]),
    flashScale: 1,
    lights(t) {
      const lamp = 0.85 + 0.1 * Math.sin(t * 0.017) + (Math.sin(t * 0.0031) > 0.97 ? -0.5 : 0);
      return [
        { pos: [0.9, 2.3, FRONT + 0.4], color: PALETTE.pumpkin, intensity: 1.8 * lamp, range: 8 },
        { pos: [7, 11, 2], color: [0.75, 0.4, 0.42], intensity: 1.7, range: 40 },
        { pos: [-2.5, 1.6, FRONT + 0.5], color: PALETTE.crtGlow, intensity: 0.8, range: 4 },
      ];
    },
  };
}

function buildHouseFront(mb) {
  const z = FRONT + 0.01; // details sit 1 cm proud of the wall
  mb.box([0, 2.5, FRONT - 3], [9, 5, 6], siding);
  // Gable roof with a little overhang, and the triangle of wall under it.
  mb.quad([-4.8, 5, FRONT + 0.3], [0, 7, FRONT + 0.3], [0, 7, FRONT - 6.3], [-4.8, 5, FRONT - 6.3], roof);
  mb.quad([0, 7, FRONT + 0.3], [4.8, 5, FRONT + 0.3], [4.8, 5, FRONT - 6.3], [0, 7, FRONT - 6.3], roof);
  mb.tri([-4.5, 5, FRONT], [4.5, 5, FRONT], [0, 6.85, FRONT], siding);

  // Door, frame, step and lamp.
  mb.quad([-0.55, 0.2, z], [0.55, 0.2, z], [0.55, 2.3, z], [-0.55, 2.3, z], shade(wood, 0.55));
  mb.box([-0.62, 1.25, FRONT + 0.03], [0.08, 2.2, 0.06], wood);
  mb.box([0.62, 1.25, FRONT + 0.03], [0.08, 2.2, 0.06], wood);
  mb.box([0, 2.38, FRONT + 0.03], [1.32, 0.1, 0.06], wood);
  mb.box([0.35, 1.2, FRONT + 0.05], [0.06, 0.06, 0.04], PALETTE.pumpkin, GLOW); // knob catches the lamp
  mb.box([0, 0.1, FRONT + 0.5], [2.4, 0.2, 1.0], stone);
  mb.box([0.9, 2.3, FRONT + 0.06], [0.14, 0.2, 0.1], PALETTE.pumpkin, GLOW);

  // Windows. Living room (left) glows CRT green; the messy room (right) glows
  // pumpkin; upstairs is dark and only shows the lightning.
  window(mb, -3.4, -1.6, 1.0, 2.2, z, shade(PALETTE.crtGlow, 0.7), GLOW);
  window(mb, 1.6, 3.4, 1.0, 2.2, z, shade(PALETTE.pumpkin, 0.55), GLOW);
  window(mb, -3.2, -1.8, 3.2, 4.3, z, PALETTE.night, SKY);
  window(mb, 1.8, 3.2, 3.2, 4.3, z, PALETTE.night, SKY);
  mb.quad([-0.35, 5.6, z], [0.35, 5.6, z], [0.35, 6.2, z], [-0.35, 6.2, z], PALETTE.night, SKY); // attic
}

function window(mb, x0, x1, y0, y1, z, color, emissive) {
  mb.quad([x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], color, emissive);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const f = shade(PALETTE.rotWood, 0.8);
  mb.box([cx, cy, z + 0.03], [0.05, y1 - y0, 0.04], f);
  mb.box([cx, cy, z + 0.03], [x1 - x0, 0.05, 0.04], f);
  mb.box([cx, y0 - 0.04, z + 0.05], [x1 - x0 + 0.2, 0.07, 0.1], f);
}

function buildFence(mb) {
  const z = 6.6;
  const post = shade(wood, 0.7);
  for (let x = -9; x <= 9.01; x += 1.2) {
    if (Math.abs(x) < 1) continue;
    mb.box([x, 0.5, z], [0.09, 1.0, 0.09], post);
  }
  for (const side of [-1, 1]) {
    const cx = side * 5.05;
    mb.box([cx, 0.4, z], [8.1, 0.06, 0.04], post);
    mb.box([cx, 0.82, z], [8.1, 0.06, 0.04], post);
  }
  // Gate posts, and the gate itself left hanging open.
  mb.box([-0.85, 0.65, z], [0.14, 1.3, 0.14], post);
  mb.box([0.85, 0.65, z], [0.14, 1.3, 0.14], post);
  // Hinged on the right post, swung in toward the yard.
  const swing = 1.15;
  mb.boxRot([0.85 - 0.37 * Math.cos(swing), 0.55, z - 0.37 * Math.sin(swing)], [0.74, 0.8, 0.04], -swing, post);
}

/** Mailbox on a post by the gate, its front open. Returns its hiding spot. */
function buildMailbox(mb) {
  const [x, y, z] = [1.6, 1.15, 7.0];
  const body = shade(PALETTE.bloodMoon, 0.6);
  mb.box([x, 0.55, z], [0.08, 1.1, 0.08], shade(wood, 0.7));
  mb.box([x, y, z], [0.34, 0.26, 0.5], body, 0, ['pz']); // open front
  mb.quad([x - 0.16, y - 0.12, z - 0.24], [x + 0.16, y - 0.12, z - 0.24], [x + 0.16, y + 0.12, z - 0.24], [x - 0.16, y + 0.12, z - 0.24], PALETTE.void, GLOW);
  mb.box([x + 0.19, y + 0.17, z - 0.08], [0.02, 0.22, 0.07], PALETTE.bloodMoon); // the flag is up
  mb.box([x, y - 0.17, z + 0.33], [0.32, 0.02, 0.16], body); // lid hanging open
  // Inside, spine out. Not turned: the box is too narrow.
  return { pos: [x, y - 0.13 + 0.01, z + 0.12], rotY: 0, maxStack: 2 };
}

/** One grave: headstone and mound. Returns the hiding spot on the mound. */
function buildGrave(mb, { x, z, rot }) {
  mb.boxRot([x, 0.45, z], [0.62, 0.9, 0.16], rot, stone);
  mb.boxRot([x, 0.94, z], [0.44, 0.1, 0.16], rot, stone);
  const along = (d) => [x + Math.sin(rot) * d, 0, z + Math.cos(rot) * d];
  const m = along(0.8);
  mb.boxRot([m[0], 0.06, m[2]], [0.72, 0.12, 1.3], rot, dirt);
  const s = along(0.42);
  const pos = [s[0], 0.13, s[2]];
  return { pos, rotY: face(pos, CAM.graves), maxStack: 3 };
}

function buildTree(mb, [x, , z]) {
  const bark = shade(PALETTE.void, 3);
  mb.box([x, 1.6, z], [0.3, 3.2, 0.3], bark);
  mb.boxRot([x + 0.5, 2.7, z], [1.1, 0.09, 0.09], 0.35, bark);
  mb.boxRot([x - 0.4, 2.3, z + 0.1], [0.9, 0.08, 0.08], -0.5, bark);
  mb.boxRot([x + 0.2, 3.1, z - 0.1], [0.8, 0.07, 0.07], 1.4, bark);
}

/** The pond: still, dark water with the moon in it. Returns the bank spot. */
function buildPond(mb) {
  const { x, z, rx, rz } = POND;
  const seg = 14;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    mb.tri([x, 0.03, z], [x + Math.cos(a1) * rx, 0.03, z + Math.sin(a1) * rz], [x + Math.cos(a0) * rx, 0.03, z + Math.sin(a0) * rz], water, 0.9);
    const am = (a0 + a1) / 2;
    mb.boxRot([x + Math.cos(am) * (rx + 0.12), 0.07, z + Math.sin(am) * (rz + 0.12)], [0.36, 0.14, 0.22], -am, stone);
  }
  // The moon's reflection, 1 cm above the water.
  disc(mb, [x + 0.35, 0.04, z - 0.45], 0.28, 10, shade(PALETTE.bloodMoon, 0.9), GLOW, true);
  const pos = [x - 0.6, 0.01, z + rz + 0.45];
  return { pos, rotY: face(pos, CAM.pond), maxStack: 3 };
}

/** Flat disc: upright (facing +z) or lying flat. */
function disc(mb, [cx, cy, cz], r, seg, color, emissive, flat = false) {
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
    const p = (a) => (flat
      ? [cx + Math.cos(a) * r, cy, cz + Math.sin(a) * r * 0.6]
      : [cx + Math.cos(a) * r, cy + Math.sin(a) * r, cz]);
    mb.tri([cx, cy, cz], p(a0), p(a1), color, emissive);
  }
}

/**
 * Rain streaks. Each streak stores its fall phase in the normal's x, and the
 * scene shader moves it down through an 8 m column (emissive code RAIN).
 */
function buildRain(mb, count, seed) {
  const rand = mulberry32(seed);
  for (let i = 0; i < count; i++) {
    const x = -11 + rand() * 22;
    const z = -9 + rand() * 18;
    // Keep streaks at least 2.5 m from every viewpoint, so none fills the screen.
    if (Object.values(CAM).some((c) => Math.hypot(c[0] - x, c[2] - z) < 2.5)) continue;
    const len = 0.35 + rand() * 0.3;
    const phase = rand() * 8;
    const w = 0.018;
    const a = [x - w, 0, z], b = [x + w, 0, z], c = [x + w + 0.06, len, z], d = [x - w + 0.06, len, z];
    for (const v of [a, b, c, a, c, d]) {
      mb.data.push(v[0], v[1], v[2], phase, 0, 0, rainColor[0], rainColor[1], rainColor[2], RAIN);
    }
    mb.triangles += 2;
  }
}

function normalize(v) {
  const l = Math.hypot(v[0], v[1], v[2]);
  return v.map((c) => c / l);
}
