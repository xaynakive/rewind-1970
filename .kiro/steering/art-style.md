---
inclusion: always
---

# Art Style: Low-Poly PS1 Horror, Shot Like a Film

Pixel-ish, but cinematic and part real: a low-resolution PS1 picture with real-feeling light, glow and colour, played back off a worn tape.

## Rendering
- The picture fills the whole browser tab, at any size or shape. There's also a full-screen button (and the F key).
- Render the 3D scene to a low-resolution target that is always 288 lines tall (more on tall phone screens, so it's never narrower than 220 px). Its width follows the screen's shape. Upscale with nearest-neighbour filtering. Never render the scene at full screen resolution.
- Field of view: 58° vertical at 4:3 (how the rooms were framed). Wider screens keep 50° vertical and see more to the sides; tall screens widen up to 90° (`render/camera.js`).
- Vertex snapping: snap clip-space vertex positions to the low-resolution pixel grid in the vertex shader, to produce the PS1 wobble.
- Textures: maximum 64×64 for props and 128×128 for large surfaces. Use nearest filtering and no mipmaps.
- Scene pass, in order: fog → keep hue when light overexposes (scale the whole colour down, never clip one channel) → brightness (gamma lift from the player's setting) → saturation ×1.3 → ordered Bayer 4×4 dithering → 6 bits per channel.
- Fog is the main depth cue. Use linear fog that fades to the scene's fog colour. Fog colours start dark and tinted (deep blue outside), because the brightness lift raises them.
- Picture pass, after the scene: VHS damage (tracking, bleed, noise, glitch), glow around bright things (two rings of 8 taps, threshold 0.6), colour grading (a little S-curve contrast, teal shadows, warm highlights), scanlines (a dark gap at the bottom of every picture line), and a soft vignette.
- 2D sources (the boot screen and the final tape, both 320×240) are fitted inside the screen without stretching, with black around them.

## Geometry budget
- Props: 300 triangles or fewer. Room shells: 800 triangles or fewer.
- Whole visible scene: 20,000 triangles or fewer.
- Build assets procedurally from primitives where possible. Avoid smooth shading on hard-edged props.

## Palette
Use these colours as the base. New colours should be justified against this list. The brightness lift and grading make them read lighter and richer on screen than their hex values.

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
- Three point lights per area, plus ambient. Interiors are lit mostly by the pumpkins, the TV and lightning through windows.
- Lightning is a short full-scene flash (about 80–150 ms, sometimes double) followed by a delayed thunder sound.

## Accessibility
- **Visibility comes first.** The default picture leans bright, so people with low vision can see the rooms. Settings has a brightness slider (moody ↔ bright) and "clear picture", which cuts static, tracking and glitches to about a third and softens the scanlines. Both default up when the system asks for more contrast (`prefers-contrast: more`).
- On-screen text (hints, exits, buttons) is large, high contrast and has a dark halo, so it stays readable over any part of the picture.
- All flashing effects (lightning, glitch bursts) must respect the "reduce flashing" setting and `prefers-reduced-motion`. When reduced, use a slow fade no brighter than 50% instead of a flash, and never flash more than 3 times per second.
- Diegetic text must stay readable. A decayed tape can look damaged, but the text-only reader always shows the original memory text.
