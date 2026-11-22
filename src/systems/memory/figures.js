// People in memories: June, and the thing that wears her shape (or someone else's).
// Built at the origin facing -z; memoryScene places them with a model matrix.

import { MeshBuilder } from '../../render/mesh.js';
import { PALETTE, shade, mix, GLOW } from '../house/palette.js';

export const COAT_RED = mix(PALETTE.bloodMoon, PALETTE.rotWood, 0.25);
/** The caretaker's long grey coat (the school). */
export const COAT_GREY = [0.2, 0.2, 0.22];
/** A school uniform: navy pinafore. */
export const UNIFORM = [0.1, 0.12, 0.24];

/**
 * The figure. `face`: 'hair' (seen from behind, or a face hidden by hair), 'static'
 * (static where the face should be: the presence) or 'veil' (long wet hair hanging
 * over the face: Haewol's Caller). `coat`: its colour.
 */
export function buildFigure({ face = 'hair', coat = COAT_RED, lamp = false } = {}) {
  const coatRed = coat;
  const mb = new MeshBuilder();
  mb.box([-0.11, 0.42, 0], [0.12, 0.84, 0.14], [0.08, 0.07, 0.08]);
  mb.box([0.11, 0.42, 0], [0.12, 0.84, 0.14], [0.08, 0.07, 0.08]);
  // A long red coat, wider at the hem.
  mb.box([0, 0.95, 0], [0.5, 0.5, 0.32], coatRed);
  mb.box([0, 1.4, 0], [0.44, 0.5, 0.28], coatRed);
  mb.box([-0.29, 1.25, 0], [0.11, 0.7, 0.13], shade(coatRed, 0.85));
  mb.box([0.29, 1.25, 0], [0.11, 0.7, 0.13], shade(coatRed, 0.85));
  // Belt, buttons and collar, so the coat reads as a coat even in a strong light.
  mb.box([0, 1.18, 0], [0.46, 0.06, 0.3], shade(coatRed, 0.35));
  for (const y of [1.0, 1.32, 1.5]) mb.box([0, y, -0.15], [0.04, 0.04, 0.02], shade(coatRed, 0.3));
  mb.box([0, 1.62, 0], [0.4, 0.08, 0.3], shade(coatRed, 0.7));
  mb.box([0, 0.72, 0], [0.5, 0.04, 0.32], shade(coatRed, 0.6)); // hem
  mb.box([0, 1.7, 0], [0.12, 0.1, 0.12], [0.6, 0.5, 0.44]);
  // Head: dark hair all round. The presence has static where the face should be.
  mb.blob([0, 1.88, 0], 0.15, 1.15, 8, 5, [0.05, 0.04, 0.05]);
  mb.box([0, 1.72, 0.1], [0.3, 0.4, 0.06], [0.05, 0.04, 0.05]); // hair down the back
  if (lamp) {
    // A hand lamp, held low: you see its light coming before you see who holds it.
    mb.box([0.33, 0.95, -0.12], [0.02, 0.2, 0.02], [0.1, 0.1, 0.1]);
    mb.box([0.33, 0.8, -0.12], [0.12, 0.14, 0.12], [1, 0.85, 0.55], GLOW);
  }
  if (face === 'static') mb.box([0, 1.87, -0.13], [0.2, 0.24, 0.04], [0.75, 0.78, 0.8], GLOW);
  if (face === 'veil') {
    // Long wet hair hanging over the face, past the collar, and over the neck.
    const hair = [0.03, 0.025, 0.03];
    for (let k = 0; k < 5; k++) mb.box([-0.1 + k * 0.05, 1.62 - (k % 2) * 0.06, -0.15], [0.055, 0.62 + (k % 2) * 0.1, 0.03], shade(hair, 1 + (k % 3) * 0.3));
    mb.box([0, 1.7, 0], [0.16, 0.12, 0.16], hair);
  }
  return mb.build();
}

