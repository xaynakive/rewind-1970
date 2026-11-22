// Loose things you can pick up, carry in the hotbar, drop, stack and throw.
// Pure except for building meshes. Props reset every night, like everything else
// in the dream that isn't a memory.
// Spec: .kiro/specs/haewol (Requirement 12; design "Carrying")

import { MeshBuilder } from '../render/mesh.js';

export const HOTBAR_SIZE = 9;
export const GRAVITY = 9.8;
export const THROW_SPEED = 7;
export const BOUNDS = { min: [-25, -54], max: [23, 13] };
const PAD = 0.06; // how close a prop's centre may come to a wall

/** What each kind looks like, how big it is (w, h, d; bottom at y = 0), and what it sounds like. */
export const PROP_KINDS = {
  cup: { name: 'a teacup', size: [0.08, 0.09, 0.08], color: [0.86, 0.84, 0.78], sound: 'ceramic' },
  bowl: { name: 'a rice bowl', size: [0.16, 0.07, 0.16], color: [0.78, 0.74, 0.64], sound: 'ceramic' },
  book: { name: 'an old book', size: [0.17, 0.05, 0.23], color: [0.42, 0.16, 0.12], sound: 'wood' },
  stone: { name: 'a river stone', size: [0.14, 0.09, 0.12], color: [0.46, 0.46, 0.44], sound: 'stone' },
  bucket: { name: 'a wooden bucket', size: [0.28, 0.3, 0.28], color: [0.44, 0.3, 0.18], sound: 'wood' },
  lantern: { name: 'a fallen lantern', size: [0.22, 0.3, 0.22], color: [0.62, 0.1, 0.07], sound: 'cloth' },
  herbs: { name: 'a bundle of herbs', size: [0.12, 0.08, 0.24], color: [0.3, 0.34, 0.18], sound: 'cloth' },
  cushion: { name: 'a floor cushion', size: [0.46, 0.09, 0.46], color: [0.36, 0.14, 0.13], sound: 'cloth' },
  chalk: { name: 'a stick of chalk', size: [0.07, 0.014, 0.014], color: [0.92, 0.92, 0.88], sound: 'stone' },
  block: { name: 'a wooden block', size: [0.1, 0.1, 0.1], color: [0.7, 0.52, 0.3], sound: 'wood' },
};

/** Flat tops you can set things on: { min:[x,z], max:[x,z], y }. */
export const SURFACES = [
  { id: 'entry-table', min: [-2.25, 8.1], max: [-1.35, 8.7], y: 0.235 },
  { id: 'tv-cabinet', min: [-0.6, 11.4], max: [0.6, 11.9], y: 0.6 },
  { id: 'quilt', min: [1.65, 10.8], max: [2.75, 11.6], y: 0.24 },
  { id: 'yeonhwa-table', min: [-15.65, -3.9], max: [-14.35, -3.1], y: 0.64 },
  { id: 'wol-desk', min: [14.27, 1.08], max: [15.73, 1.82], y: 0.745 },
  { id: 'herb-table', min: [19.2, -1.9], max: [20.8, -1.1], y: 1.11 },
  { id: 'teacher-desk', min: [-8.92, -22.62], max: [-7.88, -22.08], y: 0.75 },
  { id: 'organ', min: [-3.7, -52.75], max: [-2.3, -52.25], y: 1.1 },
];

/** Where things lie at 23:58. y is worked out by `settle`. */
export const PROP_PLACES = [
  { kind: 'cup', at: [-1.6, 8.35] },
  { kind: 'block', at: [-2.05, 8.5] },
  { kind: 'block', at: [-1.95, 8.25] },
  { kind: 'block', at: [-2.1, 8.25] },
  { kind: 'book', at: [2.0, 11.1] },
  { kind: 'cushion', at: [-1.2, 10.6] },
  { kind: 'stone', at: [1.6, -3.4] },
  { kind: 'stone', at: [-1.4, -6.9] },
  { kind: 'stone', at: [4.2, -1.2] },
  { kind: 'bucket', at: [1.9, -6.1] },
  { kind: 'lantern', at: [5.6, -9.6] },
  { kind: 'bowl', at: [6.6, -11.6] },
  { kind: 'cup', at: [-15.3, -3.6] },
  { kind: 'bowl', at: [-14.8, -3.3] },
  { kind: 'book', at: [-16.5, -11.0] },
  { kind: 'cup', at: [15.5, 1.6] },
  { kind: 'herbs', at: [19.6, -1.3] },
  { kind: 'book', at: [13.4, -1.0] },
  { kind: 'stone', at: [16.0, -7.0] },
  { kind: 'chalk', at: [-8.7, -22.3] },
  { kind: 'chalk', at: [-4.6, -22.6] },
  { kind: 'book', at: [-4.3, -19.0] },
  { kind: 'block', at: [-9.6, -22.4] },
  { kind: 'block', at: [-9.75, -22.55] },
  { kind: 'cushion', at: [-0.8, -52.2] },
  { kind: 'bowl', at: [-3.5, -52.45] },
];

// ---------- the hotbar ----------

export function emptyHotbar() {
  return { slots: Array(HOTBAR_SIZE).fill(null), selected: 0 };
}
/** Puts `id` in the selected slot if it's free, else the first free slot. Null if every slot is full. */
export function addToHotbar(h, id) {
  const slot = h.slots[h.selected] === null ? h.selected : h.slots.indexOf(null);
  if (slot < 0) return null;
  const slots = h.slots.slice();
  slots[slot] = id;
  return { slots, selected: slot };
}
export function selectSlot(h, i) {
  const n = Math.max(0, Math.min(HOTBAR_SIZE - 1, Math.floor(i)));
  return { ...h, selected: n };
}
export function cycleSlot(h, dir) {
  return { ...h, selected: (h.selected + (dir > 0 ? 1 : -1) + HOTBAR_SIZE) % HOTBAR_SIZE };
}
/** Takes what's in the selected slot out of the hotbar. */
export function takeSelected(h) {
  const id = h.slots[h.selected];
  if (id === null) return { hotbar: h, id: null };
  const slots = h.slots.slice();
  slots[h.selected] = null;
  return { hotbar: { ...h, slots }, id };
}

// ---------- the world ----------

const inRect = (x, z, r, pad = 0) => x > r.min[0] - pad && x < r.max[0] + pad && z > r.min[1] - pad && z < r.max[1] + pad;

/**
 * @typedef {{ id: string, kind: string, size: number[], pos: number[], vel: number[], yaw: number,
 *   resting: boolean, held: boolean, floating: boolean }} Prop
 * @typedef {{ groundAt: (x: number, z: number) => { y: number, sunken?: boolean }, colliders: object[],
 *   surfaces: object[], waterY: number }} World
 */

export function createProps(places = PROP_PLACES) {
  return places.map((p, i) => ({
    id: `prop-${i}`, kind: p.kind, size: PROP_KINDS[p.kind].size,
    pos: [p.at[0], 5, p.at[1]], vel: [0, 0, 0], yaw: ((i * 2.399) % 6.283) - 3.14,
    resting: false, held: false, floating: false,
  }));
}

/** The height something of footprint `self` would rest at, at (x, z), counting only what is below `fromY`. */
export function supportAt(x, z, self, props, world, fromY = self.pos[1]) {
  const below = (top) => top <= fromY + 0.05;
  const g = world.groundAt(x, z);
  let y = g.y;
  let floating = false;
  if (g.sunken && world.waterY > y) { y = world.waterY; floating = true; }
  for (const s of world.surfaces) if (inRect(x, z, s) && s.y > y && below(s.y)) { y = s.y; floating = false; }
  for (const p of props) {
    if (p === self || p.held || !p.resting) continue;
    const hx = (p.size[0] + self.size[0]) * 0.35, hz = (p.size[2] + self.size[2]) * 0.35;
    if (Math.abs(p.pos[0] - x) < hx && Math.abs(p.pos[2] - z) < hz) {
      const top = p.pos[1] + p.size[1];
      if (top > y && below(top)) { y = top; floating = false; }
    }
  }
  return { y, floating };
}

/** Walls are as tall as the sky; furniture only stops what's below its top. */
export function blockedAt(x, z, y, world) {
  if (x < BOUNDS.min[0] || x > BOUNDS.max[0] || z < BOUNDS.min[1] || z > BOUNDS.max[1]) return true;
  for (const s of world.surfaces) if (inRect(x, z, s, PAD) && y >= s.y - 0.02) return false;
  return world.colliders.some((b) => inRect(x, z, b, PAD));
}

/** Puts every prop down where it lies, lowest first so stacks build up. */
export function settle(props, world) {
  for (const p of props) { p.resting = false; }
  const order = props.slice().sort((a, b) => a.pos[1] - b.pos[1]);
  for (const p of order) {
    const s = supportAt(p.pos[0], p.pos[2], p, props, world, 99);
    p.pos[1] = s.y; p.floating = s.floating; p.vel = [0, 0, 0]; p.resting = true;
  }
  return props;
}

/**
 * Moves one prop for `dt` seconds. Returns a landing event when it hits something
 * hard enough to be heard: { pos, loud, water }.
 */
export function stepProp(p, dt, props, world) {
  if (p.held) return null;
  if (p.resting) {
    // Something under it was taken away: it falls.
    const s = supportAt(p.pos[0], p.pos[2], p, props, world);
    if (s.y < p.pos[1] - 0.01) p.resting = false;
    else { if (p.floating) p.pos[1] = s.y; return null; }
  }
  const fromY = p.pos[1];
  p.vel[1] -= GRAVITY * dt;
  const nx = p.pos[0] + p.vel[0] * dt;
  if (blockedAt(nx, p.pos[2], p.pos[1], world)) p.vel[0] *= -0.35; else p.pos[0] = nx;
  const nz = p.pos[2] + p.vel[2] * dt;
  if (blockedAt(p.pos[0], nz, p.pos[1], world)) p.vel[2] *= -0.35; else p.pos[2] = nz;
  p.pos[1] += p.vel[1] * dt;
  p.yaw += Math.hypot(p.vel[0], p.vel[2]) * dt * 2;
  const s = supportAt(p.pos[0], p.pos[2], p, props, world, fromY);
  if (p.pos[1] > s.y) return null;
  const impact = Math.abs(p.vel[1]) + Math.hypot(p.vel[0], p.vel[2]) * 0.4;
  p.pos[1] = s.y;
  p.floating = s.floating;
  if (s.floating) { p.vel = [0, 0, 0]; p.resting = true; return { pos: [...p.pos], loud: impact, water: true }; }
  if (Math.abs(p.vel[1]) > 2.2) {
    p.vel = [p.vel[0] * 0.5, -p.vel[1] * 0.3, p.vel[2] * 0.5];
  } else {
    p.vel = [0, 0, 0];
    p.resting = true;
  }
  return impact > 0.8 ? { pos: [...p.pos], loud: impact, water: false } : null;
}

/** How far away the Caller hears a landing. */
export function hearingRange(ev) {
  return Math.min(16, 3 + ev.loud * 1.6) * (ev.water ? 1.2 : 1);
}

/** Sets `p` moving from `from` along `dir` (unit, with pitch). */
export function launch(p, from, dir, speed = THROW_SPEED) {
  p.held = false;
  p.resting = false;
  p.pos = [...from];
  p.vel = [dir[0] * speed, dir[1] * speed + 1.5, dir[2] * speed];
  return p;
}

// ---------- meshes ----------

/** A prop's mesh, centred on x/z with its bottom at y = 0. */
export function buildPropMesh(kind) {
  const k = PROP_KINDS[kind];
  const [w, h, d] = k.size;
  const c = k.color;
  const dark = c.map((v) => v * 0.55);
  const mb = new MeshBuilder();
  switch (kind) {
    case 'cup':
      mb.box([0, h / 2, 0], [w, h, d], c);
      mb.box([0, h - 0.004, 0], [w * 0.8, 0.008, d * 0.8], [0.3, 0.22, 0.14]);
      mb.box([0, h * 0.55, 0], [w * 1.03, 0.012, d * 1.03], [0.35, 0.42, 0.55]);
      break;
    case 'bowl':
      mb.box([0, h * 0.3, 0], [w * 0.6, h * 0.6, d * 0.6], c);
      mb.box([0, h * 0.75, 0], [w, h * 0.5, d], c);
      mb.box([0, h - 0.004, 0], [w * 0.86, 0.008, d * 0.86], dark);
      break;
    case 'book':
      mb.box([0, h / 2, 0], [w, h, d], c);
      mb.box([0.006, h / 2, 0], [w - 0.008, h * 0.8, d - 0.012], [0.86, 0.82, 0.7]);
      break;
    case 'stone':
      mb.blob([0, h / 2, 0], w / 2, (h / w) * 1.1, 7, 3, c);
      break;
    case 'bucket':
      mb.box([0, h / 2, 0], [w, h, d], c);
      mb.box([0, h - 0.004, 0], [w * 0.84, 0.008, d * 0.84], dark);
      for (const y of [0.06, h - 0.06]) mb.box([0, y, 0], [w * 1.04, 0.025, d * 1.04], [0.22, 0.2, 0.18]);
      mb.box([0, h + 0.08, 0], [w * 0.9, 0.02, 0.02], [0.22, 0.2, 0.18]);
      break;
    case 'lantern':
      mb.box([0, h / 2, 0], [w, h * 0.8, d], c);
      for (const y of [0.02, h - 0.02]) mb.box([0, y, 0], [w * 0.8, 0.04, d * 0.8], [0.12, 0.1, 0.09]);
      for (let i = 0; i < 3; i++) mb.box([0, h * (0.3 + i * 0.2), 0], [w * 1.02, 0.01, d * 1.02], dark);
      break;
    case 'herbs':
      mb.blob([0, h / 2, 0], d / 2, (h / d) * 1.2, 6, 3, c);
      mb.box([0, h / 2, d * 0.42], [0.03, 0.03, 0.06], [0.7, 0.2, 0.12]);
      break;
    case 'cushion':
      mb.box([0, h / 2, 0], [w, h, d], c);
      mb.box([0, h, 0], [w * 0.7, 0.01, d * 0.7], dark);
      break;
    default:
      mb.box([0, h / 2, 0], [w, h, d], c);
      mb.box([0, h + 0.001, 0], [w * 0.5, 0.002, d * 0.5], dark);
  }
  return mb.build();
}
