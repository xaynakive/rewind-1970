# Design: Cold Open

## State machine
`src/systems/cold-open/coldOpen.js`

```js
/** @type {{kind:'booting', line, chars, nextAt} | {kind:'ready', since} | {kind:'playing', startedAt}} */
```
`main.js` adds a `transition` mode around it: a 700 ms glitch (or a 600 ms fade with reduce flashing), then the house fades in over 1.2 s.

## Rendering
- The boot text is drawn to a 320×240 canvas, uploaded as a texture, and shown through the shared VHS pass (`vhsFragment` in `src/render/shaders.js`), so it gets the same tracking band, colour bleed and grain as the house.
- Text uses the 5×7 bitmap font at 2× scale. System fonts are not used, because they differ between devices and many have no monospace face.
- VHS uniforms: `uTime`, `uTracking`, `uBleed`, `uNoise`, `uGlitch`, `uFade`, `uReduce`, plus `uOsd`/`uOsdOn` for the on-screen display in the house.

## Boot lines
Values line up at column 14 using dot leaders, and every line fits within 320 px at 2× scale (checked by `tests/coldOpen.test.js`).
```
VIDEO CASSETTE RECORDER
TRACKING .... AUTO
HEAD CLEAN .. OK
TAPE ........ UNLABELLED
TAPES FOUND: 004        (returning users with found tapes only)

OCT 31 1970  00:00
```
Characters type at 26 ms each. Lines pause 380–900 ms.

## Audio
PLAY is the first user gesture, so the Web Audio context is created here. The tape-start sound is a synthesized click and motor whine. Rain and tape hiss loops start at the same time.

## After PLAY
The house opens at the `yard-gate` viewpoint in the front yard, in the rain. On a first visit with no tapes, a hint points inside: "the porch light is on. somewhere inside, a vcr is waiting."
