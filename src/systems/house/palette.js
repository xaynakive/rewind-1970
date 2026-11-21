// Shared colours for every area. Steering: art-style.md (Palette).

import { hexToRgb } from '../../render/mesh.js';

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

/** Darker or lighter variant of a palette colour. Supporting shades derive from the palette. */
export const shade = (c, k) => c.map((v) => v * k);

/** Mix of two palette colours. */
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

/** Emissive codes understood by the scene shader (see render/shaders.js). */
export const LIT = 0;
export const GLOW = 1;
export const SKY = 2;
export const RAIN = 3;
export const UNFOGGED = 4;
