# Design: Decay

## Decay curve
`systems/decay/decay.js` (pure). The implemented version also takes an optional `timeScale` for demo mode:

```ts
const GRACE_DAYS = 3;
const FULL_DAYS = 30;
const MAX_DECAY = 0.85;

export function decayLevel(lastViewedAt: number, now: number, timeScale = 1): number {
  const days = Math.max(0, now - lastViewedAt) * timeScale / 86_400_000;
  if (days <= GRACE_DAYS) return 0;
  const t = Math.min(1, (days - GRACE_DAYS) / (FULL_DAYS - GRACE_DAYS));
  const eased = t * t * (3 - 2 * t); // smoothstep
  return eased * MAX_DECAY;
}

export type DecayStage = 'clean' | 'worn' | 'damaged' | 'fading';
export function decayStage(level: number): DecayStage { /* thresholds from requirements */ }
```

## Demo mode
Settings has a "demo time" toggle (`settings.demoTime`). When it is on, `timeScale(settings)` returns 1440, so one real minute counts as one day: a new tape starts to wear after 3 minutes and is fully faded after 30. It is off by default. Tape meshes refresh every 5 s in demo mode and every 60 s otherwise.

## Word drift
`systems/decay/drift.js` (pure): `driftWords(text, seed, level)` returns one entry per word or whitespace token, with layout offsets `dx`, `dy` (em) and `fade` (0..1). Joining the tokens gives back the exact original text.
- The seed is `fnv1a(tape.id)`, so the same tape shows the same damage every time.
- The words that drift come from one seeded shuffle per tape. As decay grows, more words join, and words that already drift keep drifting. Damage only accumulates; it never jumps around between visits.
- Offsets come from a second seeded stream with one draw per word, so they don't change when the number of drifting words changes.
- At most `floor(words × 0.2)` words drift, reached at `MAX_DECAY`.

## Rendering decay

### Reading view (`ui/playback.js`)
**Decision:** the reading view is real DOM text with CSS effects and a noise canvas on top, not text rasterised into a WebGL texture.
- Why: memories can be up to 4,000 characters in any language. DOM text wraps, scrolls, zooms, uses the system's fonts for every script, and stays readable by screen readers. A 320×240 texture could do none of that well.
- The WebGL VHS pass still runs behind the dialog, and it gets worse while you are holding a decayed tape (`tracking`, `bleed` and `noise` rise with the held tape's decay).

Effects, all scaled by `--decay` (decay level ÷ `MAX_DECAY`):
- Colour bleed: red and cyan `text-shadow` offsets up to 2.5 px.
- Softness: `blur` up to 0.35 px, and the text colour drifts toward a faded brown.
- Word drift: each drifting word is an inline-block `<span>` with `transform: translate(dx, dy)` and reduced opacity.
- Tracking jitter: at `damaged` and `fading`, a stepped `translateX`/`skewX` animation. Turned off with reduce flashing or `prefers-reduced-motion`.
- Static: a 160×120 canvas of grain plus a rolling bright band, blended over the dialog. Its strength is capped at 0.23 so a fully decayed tape stays partly readable. With reduce flashing it is drawn once and does not animate.
- The OSD line shows the tape's condition: `TRACKING -1` (worn), `TRACKING -3` (damaged), `NO TRACKING` (fading).

### Tape meshes (`systems/tapes/tapeMeshes.js`)
- Cassettes lie on their hiding spot with the spine label facing the room. They are chunkier than real tapes (0.27 × 0.06 × 0.16 m) so the spine reads at 320×240.
- `labelColor(level)` turns the spine label from cream to yellowed brown, then bleeds it toward blood-moon red at the end. You can see from across the room which tapes need you.
- Animated static on the meshes is not done yet; the tint is.

## Testing
- `decayLevel` at 0, 3, 3.5, 16.5, 30 and 90 days; the clock going backwards; demo time scale; `decayStage` boundaries.
- `driftWords`: tokens rejoin to the original text; no drift at 0; exactly `floor(words × 0.2)` at max; deterministic per seed; damage accumulates; whitespace never moves.
- `labelColor`: yellows, then reddens.
