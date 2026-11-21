# How Rewind 1970 was built with Kiro

Rewind 1970 is a haunted journal: every memory you write becomes a VHS tape hidden in a PS1-style house, neglected tapes decay, and you rewind them on the TV to bring them back. Under it runs a mystery about the woman who lived there before you. It was built entirely in **Kiro Web**, in the browser, over about a month of sessions.

## The setup: Kiro Web and a sandbox with no npm

The whole project lives in a Kiro Web sandbox. That sandbox can reach GitHub but not npm or any CDN, which shaped the biggest technical decision. The first plan was TypeScript, Vite and Three.js. When `npm install` failed, Kiro and I looked at what a PS1 renderer actually needs (flat-coloured triangles, per-vertex light, fog, one low-res render target, one post-processing pass) and decided to write it in raw WebGL 1 with no dependencies at all. That decision is recorded in `.kiro/steering/tech.md`, and it's why the game is plain ES modules that run straight from GitHub Pages with no build step.

## Steering: the rules every change follows

Four steering files in `.kiro/steering/` are included in every session:

- **`product.md`**: the tone. "Suggestion over shock", spooky but never gore, a memory is never deleted by decay, memories never leave the device, and the 1970 date is never explained.
- **`art-style.md`**: the look. Vertex wobble, a 288-line picture whose width follows the screen, dithering, a 9-colour palette, triangle budgets, flashing limits for photosensitive players, and the cinematic picture pass (glow, grading, scanlines).
- **`tech.md`**: the stack and conventions. Pure logic is kept free of DOM and WebGL so it can be tested in Node, time and randomness are injected, and 3D objects you can select are real `<button>`s so keyboards and screen readers work.
- **`structure.md`**: where things go, and the rule that keeps specs honest: when code changes a behaviour a spec describes, the spec changes in the same commit.

Steering kept rules like these in place across sessions without repeating them: the skeleton is only ever *glimpsed*, and text from a memory goes through `textContent`, never `innerHTML`.

## Specs: one per system

Every system has a spec in `.kiro/specs/`: **cold-open, tapes, decay, house, pond, endings, mystery and memories**. Each spec has three parts:

- **`requirements.md`**: user stories and numbered acceptance criteria ("WHEN the user has at least 5 tapes and has found every tape THEN the system SHALL unlock the ending").
- **`design.md`**: data shapes, function signatures, numbers and exact text the player sees.
- **`tasks.md`**: the implementation plan, ticked off as code lands.

The workflow for each milestone was the same: write or update the spec with Kiro, agree on it, then implement task by task. Specs earned their keep when systems met. The endings spec needed the decay curve, the pond's "secret noticed" flag and later the mystery's "case solved" flag, and because each of those was already written down as a pure function with exact thresholds, wiring them together was mostly a matter of reading the specs.

When I asked for a mystery layer late in the project, Kiro first compared three ways to do it (a separate game, a second entry, or weaving it into the journal) against the judging criteria, and recommended weaving it in. The mystery spec then pinned down exactly when each of the five house tapes appears, so the story can't be broken by playing out of order.

## The biggest spec: walking inside a memory

Late in the month I described what I loved about the horror games I grew up watching: walking through someone's memories, the school corridors of White Day, night-market streets, opening everything, and the way a car-racing game's showroom lets you see a car so clearly it has reflections. Kiro turned that into the **memories** spec: a first-person level inside one of Edith's tapes, with drawers, lids and doors that open, items you can turn over in a close-up, a figure that follows you, and hiding places.

Writing it as a spec first mattered here more than anywhere. The presence has exact rules (it sees 9 m, 14 m if your flashlight is on; it moves at 1.9 m/s and you walk at 2.4, so walking away always works; it searches for 4 s after losing you), and because they are pure functions with tests, "story mode never catches you" is a property test, not a promise. The tone rules in steering kept it on the right side of the line: nobody is hurt, being caught is just the tape skipping back, and there are no loud stings.

It also needed new renderer features: moving parts (a per-mesh model matrix), a flashlight cone, a glossy "showroom" material that reflects a small studio with a sweeping light, and a double-resolution close-up. All of it stayed in plain WebGL 1 with no dependencies.

## Vibe sessions for the feel

Specs covered behaviour. The feel was done conversationally. The biggest example: I'm partly blind, and after milestone 4 all I could see was a black screen and an orange moon. I told Kiro that and asked for it to be full screen, colourful and cinematic. That became a rewrite of the picture pipeline: a full-tab picture, a brightness slider and a "clear picture" mode, hue-preserving overexposure so bright things stay coloured, and new rules in `art-style.md` so later rooms followed them too.

## Checking in a real browser: the Playwright power

Kiro used the **Playwright power** to play the game in a real browser after every milestone. The sandbox browser can't reach a local server, so Kiro served the repo by intercepting requests with Playwright's routing and fulfilling them from disk. It walked through the house, held the TV button to rewind, seeded IndexedDB to jump to late-game states, and took screenshots.

Those checks caught real problems that unit tests couldn't. For example, while testing the mystery, one of Edith's tapes rendered as a few pixels by a distant tree (moved closer, between the graves), the case dialog's buttons fell below the fold on short screens (made compact, buttons pinned), and clicking the TV while carrying her last tape started a rewind instead of opening the case (the hint now says what to do).

## Tests: unit tests and property-based tests

`npm test` runs Node's built-in test runner with nothing to install. Unit tests check acceptance criteria directly: the exact boundaries where an ending changes, that the boot screen ends on the impossible date, that a hiding spot is visible from its viewpoint.

`tests/properties.test.js` adds **property-based tests** for the rules that must hold for every input. A small seeded helper (`tests/helpers/property.js`) generates hundreds of cases per rule:

- decay never goes below 0 or above 0.85, never decreases while a tape is left alone, and is zero right after viewing (even if the clock goes backwards)
- word drift never changes the text of a memory, moves at most 1 word in 5, and damage only accumulates
- the boot screen fits 320 px for any number of tapes and only uses glyphs the bitmap font has
- a new tape never stacks while an empty hiding spot is left
- stored mystery progress is always read back well-formed, and exactly one set of answers solves the case

## Hooks

Three agent hooks in `.kiro/hooks/` keep the work honest:

- **`test-on-save`**: runs the tests whenever the agent saves a JavaScript file.
- **`spec-sync`**: when a system's code changes, asks the agent to update the matching spec and tick its task, and to check the tone rules.
- **`check-before-done`**: before the agent ends a turn, every module must parse and every test must pass. If not, the agent keeps working.

## GitHub

Kiro worked through `git` and the GitHub REST API from the sandbox. Every milestone was a branch and a pull request with a written description, which I reviewed and merged. The game deploys from `main` to GitHub Pages. The project is MIT licensed.

## What I'd tell someone starting out

- Write the tone down. A steering file that says "suggestion over shock" did more for the atmosphere than any single effect.
- Make the agent prove it in a browser. Screenshots caught things no test would.
- Let specs own the numbers. Every threshold the endings depend on is in one place, and changing one means changing the spec first.
