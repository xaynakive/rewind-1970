---
inclusion: always
---

# Tech Stack and Code Conventions

## Stack
- Plain JavaScript ES modules. No framework, no build step, no runtime dependencies. This matches the rest of Elsewhere, and the app works fully offline.
- Raw WebGL 1 for rendering, with a two-pass pipeline in `src/render/`: the PS1 scene pass into a low-res target 288 lines tall whose width follows the screen, then the picture pass (VHS damage, glow, grading, scanlines) to the screen.
- GLSL ES 1.0 shaders are kept as strings in `src/render/shaders.js`, so they load without a build step or extra requests.
- Text drawn on the tape (boot screen, on-screen display) uses the built-in 5×7 bitmap font in `src/render/bitmapFont.js`, never system fonts. This keeps it identical on every device.
- Web Audio API for all sound, synthesized in code. No audio files.
- IndexedDB for memory storage, behind `src/storage/tapeStore.js`. No backend.

### Decision record: why raw WebGL instead of Three.js
Three.js was the first plan. The build sandbox has no access to npm or CDNs, and a PS1 renderer only needs a small part of a 3D engine (flat-coloured triangles, per-vertex lights, fog, one render target). Writing it directly kept every frame testable in a local browser, and kept the "built by hand" spirit of Elsewhere. If later systems such as the pond reflection need more, adding Three.js is still possible: the scene data is plain triangle lists.

## Code conventions
- Each game system lives in its own folder under `src/systems/` and exposes a small API. `src/main.js` wires the systems together. Add an event bus in `src/core/` only when two systems need to talk without `main.js` in between.
- Pure logic (decay, placement, lightning timing, endings) is kept free of WebGL and DOM code so it can be unit-tested in Node.
- Time and randomness are injected. Logic functions take `now` (epoch ms) and `rand` (a `() => number`), and never call `Date.now()` or `Math.random()` themselves.
- Use JSDoc types on public functions. Specs sketch data shapes in TypeScript notation for readability; the code implements them in JavaScript with JSDoc. Prefer discriminated unions (`{ kind: ... }`) for state machines.
- Name things in plain words: `decayLevel`, not `entropyFactor`.
- Selectable 3D objects are real `<button>` elements positioned over the object each frame (`systems/house/hotspots.js`), so mouse, touch, keyboard and screen readers all work.

## Performance
- Target 60 fps on a mid-range laptop and 30 fps on a mid-range phone.
- Delete WebGL buffers when an area is unloaded (`renderer.disposeMesh`).
- Audio starts only after a user gesture, which is the PLAY press in the cold open.

## Privacy and security
- No network requests that carry user content. No third-party analytics.
- Treat stored memory text as untrusted when rendering. Never insert it with `innerHTML`; use `textContent` or canvas drawing.

## Testing
- Unit tests use Node's built-in runner (`node:test`), so there is nothing to install. Run with `npm test`.
- Visual systems are checked in a browser against `art-style.md`. To run locally, serve the folder over HTTP (ES modules don't load from `file://`), for example `npm run serve` and open http://localhost:8000.
