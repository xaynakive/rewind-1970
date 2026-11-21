# Tasks: Decay

- [x] 1. Decay curve and stages
  - Implement `decayLevel` and `decayStage`, with unit tests.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1_
- [x] 2. Seeded word drift
  - `driftWords(text, seed, level)` returning layout offsets, never changed text.
  - Unit tests for determinism, accumulation and the 20% limit.
  - _Requirements: 2.1, 3.2_
- [x] 3. Decay effects for the reading view
  - DOM text with colour bleed, blur, word drift and tracking jitter, plus a static canvas; reduce-flashing support. (See the design for why this is DOM, not a WebGL texture.)
  - _Requirements: 3.1, 3.4_
- [ ] 4. Decay on tape meshes in the house
  - [x] Spine label tint by decay level.
  - [ ] Animated static on the label.
  - _Requirements: 3.3_
- [x] 5. Demo time setting
  - Settings toggle: one minute counts as one day.
  - _Requirements: supports the demo; no change to normal behaviour_
