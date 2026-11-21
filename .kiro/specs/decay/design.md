# Design: Decay

## Decay curve
`systems/decay/decay.js` (pure). The implemented version also takes an optional `timeScale` for demo mode:

```ts
const GRACE_DAYS = 3;
const FULL_DAYS = 30;
const MAX_DECAY = 0.85;

export function decayLevel(lastViewedAt: number, now: number): number {
  const days = Math.max(0, now - lastViewedAt) / 86_400_000;
  if (days <= GRACE_DAYS) return 0;
  const t = Math.min(1, (days - GRACE_DAYS) / (FULL_DAYS - GRACE_DAYS));
  const eased = t * t * (3 - 2 * t); // smoothstep
  return eased * MAX_DECAY;
}

export type DecayStage = 'clean' | 'worn' | 'damaged' | 'fading';
export function decayStage(level: number): DecayStage { /* thresholds from requirements */ }
```

## Demo mode
For the hackathon demo, a settings flag `demoTimeScale` (default 1) multiplies elapsed time, so that one minute can stand in for one day. It is off in normal play.

## Rendering decay
- **Reading view**: tape text is drawn to a canvas texture, then shown on a quad with a `decayFragment` shader in `render/shaders.js`. Uniforms: `uDecay`, `uTime`, `uSeed`, `uReduceFlashing`.
  - Chroma offset: sample R and B with a horizontal offset of `uDecay * 4px`.
  - Tracking lines: bands whose height and count grow with `uDecay`.
  - Noise: hash-based grain, frozen in time when `uReduceFlashing` is 1.
- **Word drift** is done before rasterising the text: a seeded PRNG (mulberry32 seeded from the tape id) picks words and offsets them by up to 1 line and a few characters. This keeps the effect deterministic and the text in storage untouched.
- **Tape meshes** in the house use a label material with `uDecay` for tint and static.

## Testing
- Unit tests for `decayLevel` at 0, 3, 3.5, 16.5, 30 and 90 days; clock going backwards; and `decayStage` boundaries.
- Unit test that the word-drift function is deterministic per seed and moves no more than 20% of words.
