---
inclusion: always
---

# Art Style: Low-Poly PS1 Horror

## Rendering
- Render the 3D scene to a low-resolution target (default 320×240, scaled to fit with nearest-neighbour filtering). Never render the scene at full screen resolution.
- Vertex snapping: snap clip-space vertex positions to the low-resolution pixel grid in the vertex shader, to produce the PS1 wobble.
- Textures: maximum 64×64 for props and 128×128 for large surfaces. Use nearest filtering and no mipmaps.
- Apply ordered (Bayer 4×4) dithering and reduce colour to 5 bits per channel in the final scene pass.
- Fog is the main depth cue. Use linear fog that fades to the scene's fog colour.
- The VHS effects pass (tracking lines, colour bleed, noise) runs after the PS1 pass, on top of the upscaled image.

## Geometry budget
- Props: 300 triangles or fewer. Room shells: 800 triangles or fewer.
- Whole visible scene: 20,000 triangles or fewer.
- Build assets procedurally from primitives where possible. Avoid smooth shading on hard-edged props.

## Palette
Use these colours as the base. New colours should be justified against this list.

| Name | Hex | Use |
|---|---|---|
| void | `#07060a` | Background, deep shadow |
| night | `#141a24` | Exterior sky, fog outside |
| damp-wall | `#2b2a26` | Interior walls |
| rot-wood | `#4a3524` | Floors, furniture |
| pumpkin | `#c8641e` | Pumpkins, warm lamp light |
| tape-label | `#d8cfb4` | Tape labels, UI text |
| crt-glow | `#7fb8a4` | TV screen light |
| blood-moon | `#8a1c1c` | Moon, pond glow, ending accents |
| lightning | `#dfe8ff` | Lightning flash only |

## Lighting
- One key light per area at most, plus ambient. Interiors are lit mostly by the pumpkins, the TV and lightning through windows.
- Lightning is a short full-scene flash (about 80–150 ms, sometimes double) followed by a delayed thunder sound.

## Accessibility
- All flashing effects (lightning, glitch bursts) must respect the "reduce flashing" setting and `prefers-reduced-motion`. When reduced, use a slow fade no brighter than 50% instead of a flash, and never flash more than 3 times per second.
- Diegetic text must stay readable. A decayed tape can look damaged, but the text-only reader always shows the original memory text.
