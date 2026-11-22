---
inclusion: always
---

# Project Structure

```
rewind-1970/
├── .kiro/
│   ├── steering/        # product, art style, tech, structure rules
│   ├── specs/           # one folder per system: requirements, design, tasks
│   └── hooks/           # agent hooks: tests on save, spec sync, checks before the agent stops
├── index.html           # stage, dialogs (tape writer, settings, playback, case, memory pause and notes)
├── style.css
├── haewol/             # the second game, Haewol: index.html and haewol.css (spec: .kiro/specs/haewol)
├── package.json         # scripts only: test, serve. No dependencies.
├── LICENSE              # MIT
├── src/
│   ├── main.js          # boot and wiring: cold open -> house, moving, tapes, rewind, settings
│   ├── core/            # settings, hashing / seeded random
│   ├── night/           # Haewol: boot, the loop clock, the save, the lens, the village and one module per place (houses, school), loose props, the lullaby, the running night, its HUD
│   ├── render/          # renderer, shaders, mesh builder, matrix math, bitmap font
│   ├── systems/
│   │   ├── cold-open/
│   │   ├── house/       # areas.js + one module per area, palette, navigation graph and moves,
│   │   │                #   area loader, look controls, hotspots, lightning
│   │   ├── tapes/       # tape model, placement, hints, cassette meshes and piles, rewind
│   │   ├── decay/       # decay curve and stages, word drift
│   │   ├── pond/        # ripples, glimpses of the skeleton, noticing the secret
│   │   ├── endings/     # unlock, choosing the ending, the final tape's script and timeline
│   │   ├── mystery/     # the previous resident's tapes, when they appear, the case
│   │   └── memory/      # walking inside her tapes: walker, reach, presence, progress, figures, the levels (market.js, school.js), the running scene
│   ├── storage/         # IndexedDB access
│   ├── audio/           # Web Audio synth: hiss, rain, thunder, tape motor, rewind whirr
│   └── ui/              # DOM overlays: tape writer, playback, settings + text-only reader,
│                        #   exit arrows, hints, the case dialog, the memory HUD
├── tests/               # node:test unit tests for pure logic, property tests, helpers/
└── docs/
    └── writeup.md       # hackathon write-up: how Kiro was used
```

- One spec folder in `.kiro/specs/` per folder in `src/systems/`, plus `haewol/` for `src/night/`.
- When code changes a behaviour described in a spec, update the spec in the same change, and tick the task in `tasks.md`.
