// Wol's house, east of the courtyard: her study papered with notes, the herb
// room, and her back room. Her ghost won't speak; she answers in the margins.
// Spec: .kiro/specs/haewol (Requirements 6.3, 7.6; design "Wol's house")
//
// x 12..22, z 2..-10. The floor is raised 0.3 m. Her door is tied shut with
// Sae's red thread: it comes undone once you carry Sae's ribbon.

import { MeshBuilder } from '../render/mesh.js';
import { translation, rotationAbout } from '../render/math.js';
import { shade, GLOW } from '../systems/house/palette.js';
import { boundsOf, grow, footprint, noteMesh, inspectOf } from '../systems/memory/market.js';
import { GLOSS, wood, darkWood, paper, ink, stone, mulberry32, wallZ, wallX, colZ, colX } from './pieces.js';

export const WOL_FLOOR = 0.3;
export const WOL = { x0: 12, x1: 22, z0: 2, z1: -10 };
const H = 2.6;
const herbPaper = shade(paper, 0.72);
const herb = [0.2, 0.26, 0.14];
const dryHerb = [0.32, 0.28, 0.16];
const brass = [0.7, 0.52, 0.22];
const thread = [0.9, 0.12, 0.08];
const margin = [0.62, 0.86, 0.9]; // writing that only shows through the lens

// ---------- inspect objects ----------

function spectaclesMesh() {
  const mb = new MeshBuilder();
  const rim = [0.62, 0.5, 0.26];
  for (const cx of [-0.045, 0.045]) {
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      mb.boxRot([cx + Math.cos(a) * 0.032, 0, Math.sin(a) * 0.026], [0.018, 0.005, 0.005], -a + Math.PI / 2, rim, GLOSS);
    }
    mb.box([cx, -0.001, 0], [0.05, 0.002, 0.04], [0.5, 0.55, 0.58], GLOSS); // lens
  }
  mb.box([0, 0, -0.006], [0.03, 0.005, 0.005], rim, GLOSS); // bridge
  for (const s of [-1, 1]) mb.box([s * 0.08, 0, 0.05], [0.004, 0.005, 0.11], rim, GLOSS); // arms, folded open
  return mb;
}

function familyPhotoMesh() {
  const mb = new MeshBuilder();
  mb.box([0, 0, 0], [0.2, 0.004, 0.25], [0.86, 0.84, 0.78], GLOSS);
  mb.box([0, 0.003, -0.01], [0.17, 0.002, 0.2], [0.24, 0.23, 0.24], GLOSS);
  // Three people: an old woman (scratched out), a young mother, a small girl in a ribbon.
  const face = [0.68, 0.6, 0.52];
  mb.box([-0.055, 0.005, -0.05], [0.03, 0.002, 0.035], [0.06, 0.06, 0.07], GLOSS);
  for (let k = 0; k < 4; k++) mb.boxRot([-0.055, 0.007, -0.05], [0.045, 0.001, 0.002], 0.5 + k * 0.8, [0.92, 0.9, 0.86], GLOW);
  mb.box([0.0, 0.005, -0.055], [0.03, 0.002, 0.035], face, GLOSS);
  mb.box([0.05, 0.005, -0.01], [0.022, 0.002, 0.026], face, GLOSS);
  mb.box([0.05, 0.006, -0.028], [0.022, 0.002, 0.007], thread, GLOSS);
  for (const [x, z, w] of [[-0.055, 0.02, 0.05], [0, 0.015, 0.05], [0.05, 0.04, 0.035]]) mb.box([x, 0.004, z], [w, 0.002, 0.08], [0.16, 0.15, 0.17], GLOSS);
  return mb;
}

// ---------- the house ----------

/**
 * Adds Wol's house to the village's builders and lists.
 * @param {{ mb: MeshBuilder, revealed: MeshBuilder, colliders: object[], parts: object[], items: object[],
 *   hides: object[], lights: object[], readables: object[], ghosts: object[] }} v
 */
export function buildWol(v) {
  const { mb, revealed, colliders, parts, items, hides, lights, readables, ghosts } = v;
  const { x0, x1, z0, z1 } = WOL;
  const F = WOL_FLOOR;
  const rand = mulberry32(1946);

  for (let x = x0; x < x1; x++) mb.quadGrid([x, F, z1], [x + 1, F, z1], [x + 1, F, z0], [x, F, z0], 1, z0 - z1, shade(wood, 0.7 + (x % 2) * 0.06));
  mb.quadGrid([x0, F + H, z1], [x1, F + H, z1], [x1, F + H, z0], [x0, F + H, z0], 5, 6, shade(wood, 0.32));
  mb.box([x0 - 0.25, 0.15, -3], [0.5, 0.3, 1.5], shade(stone, 1.1)); // the step up

  wallZ(mb, x1, z0, z1, H, [], F, herbPaper);
  wallX(mb, z0, x0, x1, H, [], F, herbPaper);
  wallX(mb, z1, x0, x1, H, [], F, herbPaper);
  wallZ(mb, 18, z0, -5, H, [[-1.0, -2.2]], F, herbPaper); // study | herb room
  wallX(mb, -5, x0, x1, H, [[14.6, 15.8]], F, herbPaper); // front rooms | back room
  colZ(colliders, x1, z0, z1);
  colX(colliders, z0, x0, x1);
  colX(colliders, z1, x0, x1);
  colZ(colliders, 18, z0, -5, [[-1.0, -2.2]]);
  colX(colliders, -5, x0, x1, [[14.6, 15.8]]);

  // The door, tied shut with red thread. Sae tied it; her ribbon's thread undoes it.
  {
    const d = new MeshBuilder();
    const x = x0 - 0.02;
    d.quadGrid([x, 0, -2.4], [x, 0, -3.6], [x, 2.2, -3.6], [x, 2.2, -2.4], 2, 4, herbPaper);
    for (const z of [-2.4, -3.0, -3.6]) d.box([x, 1.1, z], [0.06, 2.2, 0.06], darkWood);
    for (const y of [0.55, 1.1, 1.65]) d.box([x, y, -3], [0.04, 0.04, 1.2], darkWood);
    for (let k = 0; k < 8; k++) d.boxRot([x - 0.04, 1.0 + Math.sin(k * 1.7) * 0.12, -2.55 - k * 0.11], [0.01, 0.015, 0.14], 0.6 * (k % 2 ? 1 : -1), thread);
    parts.push({
      id: 'wol-door', kind: 'door', label: "Wol's door",
      mesh: d.build(),
      bounds: grow(boundsOf([x0, 1.1, -3], [0.3, 2.2, 1.2]), 0.08),
      transform: (k) => translation([0, 0, 1.15 * k]),
      collider: { min: [x0 - 0.1, -3.6], max: [x0 + 0.1, -2.4] },
      needs: 'memory-ribbon',
      lockedText: 'herbs hang from the eaves. the door is tied shut with red thread, knotted the way a child would.',
      openLine: "the thread on sae's ribbon is the same thread. the knot comes undone in your hand.",
      rate: 2.2,
    });
  }

  // ----- the study: x 12..18, z 2..-5. Every wall is papered with her notes. -----
  {
    const pin = (pos, size, normalAxis) => {
      mb.box(pos, size, shade(paper, 0.95 + rand() * 0.25), GLOW * 0.08);
      // Through the lens: her answers in the margins.
      const m = [...pos];
      m[normalAxis] += normalAxis === 0 ? 0.006 : -0.006;
      const s = [...size];
      if (normalAxis === 0) { m[2] += size[2] * 0.62; s[2] = 0.03; } else { m[0] += size[0] * 0.62; s[0] = 0.03; }
      s[1] *= 0.8;
      revealed.box(m, s, margin, GLOW);
    };
    for (let i = 0; i < 26; i++) {
      const x = x0 + 0.35 + rand() * 5.2, y = F + 0.9 + rand() * 1.4;
      pin([x, y, z0 - 0.03], [0.18 + rand() * 0.1, 0.22 + rand() * 0.1, 0.005], 2);
    }
    for (let i = 0; i < 22; i++) {
      let z = z0 - 0.3 - rand() * 6.4;
      if (z < -2.2 && z > -3.8) z -= 1.7;
      if (z < -4.7) continue;
      pin([x0 + 0.05, F + 0.9 + rand() * 1.4, z], [0.005, 0.22 + rand() * 0.1, 0.18 + rand() * 0.1], 0);
    }
    for (let i = 0; i < 14; i++) {
      let x = x0 + 0.35 + rand() * 5.2;
      if (x > 14.4 && x < 16) x += 1.7;
      pin([x, F + 0.9 + rand() * 1.4, -5 + 0.03], [0.18 + rand() * 0.1, 0.22 + rand() * 0.1, 0.005], 2);
    }

    // Her writing desk against the south wall: the book on a stand, a brush, an inkstone, a lamp.
    const D = [15.0, 1.45];
    mb.box([D[0], F + 0.2, D[1]], [1.4, 0.4, 0.7], shade(wood, 1.0));
    mb.box([D[0], F + 0.41, D[1]], [1.46, 0.03, 0.74], shade(wood, 1.2));
    mb.box([D[0] - 0.1, F + 0.48, D[1] + 0.05], [0.5, 0.1, 0.36], darkWood); // the stand
    mb.boxRot([D[0] - 0.1, F + 0.56, D[1] - 0.02], [0.56, 0.02, 0.38], 0, [0.72, 0.66, 0.52]); // the book, open
    mb.box([D[0] - 0.1, F + 0.575, D[1] - 0.02], [0.01, 0.01, 0.36], shade(paper, 0.6));
    mb.box([D[0] + 0.45, F + 0.44, D[1]], [0.16, 0.03, 0.22], [0.08, 0.08, 0.09]); // inkstone
    mb.box([D[0] + 0.45, F + 0.47, D[1] - 0.18], [0.01, 0.01, 0.18], darkWood); // brush
    mb.box([D[0] - 0.6, F + 0.5, D[1] + 0.15], [0.1, 0.16, 0.1], [0.9, 0.72, 0.4], GLOW * 0.7); // lamp
    lights.push({ pos: [D[0] - 0.6, F + 0.8, D[1] - 0.3], color: [1, 0.74, 0.45], weight: 1.6, intensity: 0.7, range: 5 });
    mb.box([D[0], F + 0.04, D[1] - 0.75], [0.5, 0.08, 0.5], [0.24, 0.2, 0.14]); // her cushion
    colliders.push(footprint([D[0], 0, D[1]], [1.46, 0, 0.74], true));
    readables.push({
      id: 'wol-book', label: 'read the margins of her book',
      bounds: grow(boundsOf([D[0] - 0.1, F + 0.56, D[1] - 0.02], [0.6, 0.12, 0.4]), 0.08),
      intro: 'her book of rites. every margin is full of her writing.',
      fallback: 'one line is underlined twice: i should have closed it. (bring her what you find. she answers in the margins.)',
      answers: {
        'memory-boat': 'beside a drawing of a paper boat: someone untied it from the post. it was not the wind. (the rest is scratched out.)',
        'memory-tape': 'next to the rite: she has played it more times than this book has pages.',
        'memory-ribbon': 'a red thread is pressed between the pages. that child will tie the whole house together.',
        'memory-telegram': 'home soon, it said. the bus over the pass never came.',
        'photo-scratched': 'i took my own face out of every picture. i could not take it out of what i did.',
        'memory-spectacles': 'i left them on the page. i knew what she would do.',
        'memory-drawing': 'beside a child\'s drawing, pressed flat: she asked me to wait with her for the bus. i said it was too wet. i said tomorrow.',
      },
    });
    // The desk drawer: it slides out toward the room.
    const dr = new MeshBuilder();
    dr.box([D[0] + 0.3, F + 0.25, D[1] - 0.05], [0.5, 0.14, 0.56], shade(wood, 0.6));
    dr.box([D[0] + 0.3, F + 0.25, D[1] - 0.355], [0.52, 0.16, 0.02], shade(wood, 1.2));
    dr.box([D[0] + 0.3, F + 0.25, D[1] - 0.375], [0.1, 0.03, 0.02], brass);
    parts.push({
      id: 'wol-drawer', kind: 'drawer', label: 'her desk drawer',
      mesh: dr.build(),
      bounds: grow(boundsOf([D[0] + 0.3, F + 0.25, D[1] - 0.36], [0.54, 0.18, 0.1]), 0.06),
      transform: (k) => translation([0, 0, -0.4 * k]),
    });
    items.push({
      id: 'memory-spectacles', kind: 'memory', name: 'her spectacles', inside: 'wol-drawer',
      pos: [D[0] + 0.3, F + 0.33, D[1] - 0.05], size: [0.16, 0.02, 0.1], color: brass,
      text: 'an old pair of spectacles, folded open, the lenses smudged with ink.',
      inspect: inspectOf(spectaclesMesh(), 0.2),
      flashback: [
        '23:46. wol sits at this desk with the old book open, her spectacles on the page.',
        "yeonhwa comes in from the rain without knocking. she doesn't say anything. she doesn't have to.",
        'wol could close the book. instead she takes off her spectacles, leaves them on the page, and goes to make tea.',
        'when she comes back, the book is gone, and so is her daughter.',
      ],
    });
    items.push({
      id: 'note-rite-copy', kind: 'note', name: 'the rite, in her hand',
      pos: [D[0] + 0.45, F + 0.43, D[1] + 0.2], size: [0.2, 0.01, 0.14], color: paper,
      text: 'the rite, copied out by wol: one voice. one recorder. one night, kept. the one who keeps it must not leave the night, or the night leaves with them.',
      inspect: inspectOf(noteMesh(7), 0.3),
    });
    // Through the lens: Wol herself, at her desk, writing. She doesn't look up.
    ghosts.push({
      id: 'wol', pos: [D[0], D[1] - 0.75], yaw: Math.PI, scale: 0.82, y: F,
      look: { face: 'hair', coat: [0.42, 0.4, 0.38] },
      line: "through the lens, an old woman stands bent over the desk, writing. she doesn't look up.",
    });
  }

  // ----- the herb room: x 18..22, z 2..-5 -----
  {
    for (let i = 0; i < 18; i++) {
      const hx = 18.5 + (i % 6) * 0.6, hz = 1.4 - Math.floor(i / 6) * 2.2;
      mb.box([hx, F + H - 0.35, hz], [0.01, 0.5, 0.01], ink);
      mb.blob([hx, F + H - 0.7, hz], 0.12, 1.8, 6, 3, i % 3 ? dryHerb : herb);
    }
    const T = [20.0, -1.5];
    mb.box([T[0], F + 0.78, T[1]], [1.6, 0.06, 0.8], shade(wood, 1.05));
    for (const dx of [-0.72, 0.72]) for (const dz of [-0.32, 0.32]) mb.box([T[0] + dx, F + 0.38, T[1] + dz], [0.06, 0.76, 0.06], darkWood);
    mb.blob([T[0] - 0.3, F + 0.88, T[1]], 0.1, 0.6, 8, 3, shade(stone, 1.2)); // mortar
    for (let k = 0; k < 5; k++) mb.box([T[0] + 0.1 + k * 0.12, F + 0.83, T[1] + (k % 2) * 0.1], [0.08, 0.04, 0.2], k % 2 ? herb : dryHerb);
    // A cloth hangs to the floor from the table: room to crouch under it.
    mb.box([T[0], F + 0.42, T[1] + 0.41], [1.6, 0.74, 0.01], [0.3, 0.28, 0.24]);
    colliders.push(footprint([T[0], 0, T[1]], [1.6, 0, 0.8]));
    hides.push({
      id: 'herb-table', label: 'crouch under the herb table', low: true,
      bounds: grow(boundsOf([T[0], F + 0.4, T[1]], [1.6, 0.8, 0.8]), 0.05),
      view: { pos: [T[0] - 0.55, F + 0.45, T[1]], yaw: -Math.PI / 2, pitch: 0.02 },
      exit: { pos: [18.6, -2.4], yaw: -Math.PI / 2 },
    });
    lights.push({ pos: [20, F + 1.9, -3], color: [0.75, 0.85, 0.6], weight: 0.6, intensity: 0.6 });
  }

  // ----- the back room: x 12..22, z -5..-10 -----
  {
    mb.box([20.5, F + 0.06, -8.5], [1.0, 0.12, 2.0], [0.42, 0.4, 0.36]);
    colliders.push(footprint([20.5, 0, -8.5], [1.0, 0, 2.0], true));
    // A small altar with incense, and a note pinned above it that only the lens can read.
    mb.box([17, F + 0.3, -9.6], [0.9, 0.6, 0.5], darkWood);
    for (let k = 0; k < 3; k++) mb.box([16.85 + k * 0.15, F + 0.7, -9.55], [0.006, 0.2, 0.006], [0.5, 0.45, 0.36]);
    mb.box([17.3, F + 0.66, -9.5], [0.06, 0.12, 0.06], [0.9, 0.86, 0.78]);
    mb.box([17.3, F + 0.74, -9.5], [0.02, 0.04, 0.02], [1, 0.7, 0.35], GLOW);
    colliders.push(footprint([17, 0, -9.6], [0.9, 0, 0.5]));
    lights.push({ pos: [17.3, F + 1.0, -9.0], color: [1, 0.7, 0.4], weight: 1.0, intensity: 0.6 });
    mb.box([17, F + 1.45, -9.95], [0.22, 0.28, 0.01], shade(paper, 0.7)); // looks blank
    items.push({
      id: 'note-undo', kind: 'note', name: 'the blank page', revealed: true,
      pos: [17, F + 1.45, -9.92], size: [0.22, 0.28, 0.02], color: margin,
      text: 'to the eye the page is blank. through the lens, in her shaking hand: what is called back must be let go where it was called. sing her the song she knew. lay down what she was given, in the order she was given it. then let the tape reach its end.',
      inspect: inspectOf(noteMesh(9), 0.3),
    });
    // The chest: its lid lifts. The family photograph, with one face scratched away.
    const C = [13.0, -9.3];
    mb.box([C[0], F + 0.28, C[1]], [1.0, 0.56, 0.6], shade(wood, 0.85));
    mb.box([C[0], F + 0.53, C[1]], [0.9, 0.02, 0.5], shade(wood, 0.4));
    colliders.push(footprint([C[0], 0, C[1]], [1.0, 0, 0.6], true));
    const lid = new MeshBuilder();
    lid.box([C[0], F + 0.58, C[1]], [1.04, 0.05, 0.64], shade(wood, 1.15));
    lid.box([C[0], F + 0.6, C[1] + 0.32], [0.08, 0.06, 0.02], brass);
    const hinge = [C[0], F + 0.58, C[1] - 0.32];
    parts.push({
      id: 'wol-chest', kind: 'lid', label: 'her chest',
      mesh: lid.build(),
      bounds: grow(boundsOf([C[0], F + 0.58, C[1]], [1.04, 0.12, 0.64]), 0.06),
      transform: (k) => rotationAbout(hinge, 'x', -1.6 * k),
    });
    items.push({
      id: 'photo-scratched', kind: 'photo', name: 'the family photograph', inside: 'wol-chest',
      pos: [C[0], F + 0.55, C[1]], size: [0.2, 0.01, 0.25], color: [0.86, 0.84, 0.78],
      text: "an old woman, a young mother, and a small girl in a crooked ribbon. one face is scratched away so hard the paper is thin: the old woman's. the scratches are neat and patient, like someone did it to herself.",
      inspect: inspectOf(familyPhotoMesh(), 0.3),
    });
  }
}

/** Where the Caller walks while you are in Wol's house. */
export const WOL_ROUTE = [
  [13.0, 0.8], [13.0, -4.0], [15.2, -4.0], [15.2, -7.0], [19.0, -7.0], [15.2, -7.0], [15.2, -4.0],
  [17.2, -1.6], [18.7, -1.6], [17.2, -1.6],
];

export const WOL_ITEM_IDS = ['memory-spectacles', 'note-rite-copy', 'note-undo', 'photo-scratched'];
