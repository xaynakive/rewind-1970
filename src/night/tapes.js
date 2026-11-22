// Home tapes: cassettes from before the night, and the little player in the
// entry house that plays them. Lore, and one piece of the lullaby.
// Spec: .kiro/specs/haewol (Requirements 7.2, 7.3; design "Making and calming")

import { MeshBuilder } from '../render/mesh.js';
import { GLOW } from '../systems/house/palette.js';
import { boundsOf, grow, footprint, inspectOf } from '../systems/memory/market.js';
import { cassetteMesh, FLOOR as YEONHWA_FLOOR } from './yeonhwa.js';

const tapeGrey = [0.2, 0.2, 0.22];

/** The tapes, in the order the player plays them. */
export const TAPES = [
  {
    id: 'tape-birthday', name: 'a home tape: sae, seven',
    pos: [-14.6, 0.655, -3.7],
    text: "a cassette. on the label, in a child's big letters: SAE 7. MY BIRTHDAY.",
    lines: [
      'a room full of people. someone claps out of time. yeonhwa: all at once, sae, blow!',
      "sae, very close to the microphone: is it on? hello. it's me. i'm seven.",
      "a man's voice, far from the microphone: i'll be home for the next one. i promise.",
    ],
  },
  {
    id: 'tape-class', name: 'a home tape: the class song',
    pos: [-7.98, 0.765, -22.52],
    text: 'a cassette from the teacher\'s desk. the label says: class 2, autumn song.',
    lines: [
      'a classroom singing, every child at a different speed.',
      'the teacher: louder at the back, please. sae, you know this one.',
      'one small voice keeps singing after all the others have stopped.',
    ],
  },
  {
    id: 'tape-hum', name: 'a home tape: for appa', inside: 'chest-drawer',
    pos: [-12.6, YEONHWA_FLOOR + 0.67, -12.08],
    text: 'a cassette at the back of the drawer. the label: FOR APPA. DO NOT TAPE OVER.',
    lines: [
      'rain on a roof. a child is humming, close to the microphone, to keep herself brave.',
      "sae, whispering: appa says if you hum it, the storm can't hear you.",
    ],
    music: 3,
  },
];
export const TAPE_IDS = TAPES.map((t) => t.id);

/** @param {{ mb: object, colliders: object[], items: object[], readables: object[] }} v */
export function buildTapes({ mb, colliders, items, readables }) {
  for (const t of TAPES) {
    items.push({
      id: t.id, kind: 'tape', name: t.name, inside: t.inside,
      pos: t.pos, size: [0.1, 0.014, 0.064], color: tapeGrey,
      text: `${t.text} (play it on the little player in the entry house.)`,
      inspect: inspectOf(cassetteMesh(), 0.28),
    });
  }
  // The player: a small radio-cassette on the floor by the west wall of the entry house.
  const P = [-2.7, 11.4];
  mb.box([P[0], 0.1, P[1]], [0.16, 0.2, 0.36], [0.16, 0.15, 0.15]);
  for (const dz of [-0.1, 0.1]) mb.box([P[0] + 0.081, 0.1, P[1] + dz], [0.004, 0.11, 0.11], [0.06, 0.06, 0.06]);
  mb.box([P[0] + 0.081, 0.17, P[1]], [0.004, 0.03, 0.06], [0.7, 0.66, 0.56]);
  mb.box([P[0] + 0.06, 0.205, P[1] + 0.12], [0.02, 0.01, 0.02], [1, 0.25, 0.15], GLOW * 0.6);
  colliders.push(footprint([P[0], 0, P[1]], [0.16, 0, 0.36], true));
  readables.push({
    id: 'cassette-player', label: 'play your home tapes', player: true,
    bounds: grow(boundsOf([P[0], 0.1, P[1]], [0.16, 0.2, 0.36]), 0.1),
    tapes: TAPES,
    empty: 'a little radio-cassette player, the kind that runs on batteries. you have no tapes for it yet.',
  });
}
