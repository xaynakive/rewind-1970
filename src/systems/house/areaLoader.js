// Keeps the current area and its neighbours on the GPU, and frees the rest.
// Spec: .kiro/specs/house (Requirement 2.3)

import { neighbourAreas } from './navigation.js';

export function createAreaLoader(renderer, house) {
  const loaded = new Map(); // areaId -> mesh

  function load(id) {
    if (!loaded.has(id)) loaded.set(id, renderer.createMesh(house.areas.get(id).meshData));
    return loaded.get(id);
  }

  return {
    /** Call when the player arrives in an area. */
    enter(areaId) {
      const want = new Set([areaId, ...neighbourAreas(house.viewpoints, areaId)]);
      for (const [id, mesh] of loaded) {
        if (!want.has(id)) { renderer.disposeMesh(mesh); loaded.delete(id); }
      }
      for (const id of want) load(id);
    },
    mesh: load,
    get loaded() { return [...loaded.keys()]; },
  };
}
