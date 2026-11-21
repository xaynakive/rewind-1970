---
inclusion: always
---

# Project Structure

```
rewind-1970/
├── .kiro/
│   ├── steering/        # product, art style, tech, structure rules
│   ├── specs/           # one folder per system: requirements, design, tasks
│   └── hooks/           # agent hooks that keep code consistent with specs (planned)
├── index.html           # stage, dialogs (tape writer, settings)
├── style.css
├── package.json         # scripts only: test, serve. No dependencies.
├── src/
│   ├── main.js          # boot and wiring: cold open -> house, tapes, settings
│   ├── core/            # settings (and later: shared state, event bus)
│   ├── render/          # renderer, shaders, mesh builder, matrix math, bitmap font
│   ├── systems/
│   │   ├── cold-open/
│   │   ├── house/       # areas, look controls, hotspots, lightning
│   │   ├── tapes/       # tape model, placement, hints
│   │   ├── decay/       # decay curve and stages
│   │   ├── pond/        # (planned)
│   │   └── endings/     # (planned)
│   ├── storage/         # IndexedDB access
│   ├── audio/           # Web Audio synth: hiss, rain, thunder, tape motor
│   └── ui/              # DOM overlays: tape writer, settings + text-only reader, hints
├── tests/               # node:test unit tests for pure logic
└── docs/
    └── writeup.md       # hackathon write-up (planned)
```

- One spec folder in `.kiro/specs/` per folder in `src/systems/`.
- When code changes a behaviour described in a spec, update the spec in the same change, and tick the task in `tasks.md`.
