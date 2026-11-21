// The house: every area and the viewpoint graph that connects them.
// Spec: .kiro/specs/house
//
// Each area keeps its own coordinates and returns:
//   id, outdoors, meshData, triangles,
//   viewpoints: [{ id, label, position, lookAt, exits: { forward|back|left|right: viewpointId } }],
//   spots:      { [hidingSpotId]: { pos, rotY?, maxStack? } }   (tape piles; spines face +z, turned by rotY)
//   hotspots:   [{ id, label, min, max }]                       (selectable props, e.g. TV and VCR)
//   lights(t):  exactly 3 point lights,
//   sky, fogColor, fogNear, fogFar, ambient, flashDir, flashScale.

import { buildFrontYard } from './frontYard.js';
import { buildHallway } from './hallway.js';
import { buildLivingRoom } from './livingRoom.js';
import { buildMessyRoom } from './messyRoom.js';
import { buildBedroom } from './bedroom.js';

export const START_VIEWPOINT = 'yard-gate';

export function buildHouse() {
  const list = [buildFrontYard(), buildHallway(), buildLivingRoom(), buildMessyRoom(), buildBedroom()];
  const areas = new Map(list.map((a) => [a.id, a]));
  const viewpoints = new Map();
  for (const a of list) {
    for (const vp of a.viewpoints) viewpoints.set(vp.id, { ...vp, area: a.id });
  }
  return { areas, viewpoints, start: START_VIEWPOINT };
}
