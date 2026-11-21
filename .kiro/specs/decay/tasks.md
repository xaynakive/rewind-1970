# Tasks: Decay

- [x] 1. Decay curve and stages
  - Implement `decayLevel` and `decayStage`, with unit tests.
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1_
- [ ] 2. Seeded word drift
  - mulberry32 PRNG, `driftWords(text, seed, level)` returning layout offsets, never changed text.
  - Unit tests for determinism and the 20% limit.
  - _Requirements: 2.1, 3.2_
- [ ] 3. Decay shader for the reading view
  - `decayFragment` shader with chroma offset, tracking lines and noise; reduce-flashing support.
  - _Requirements: 3.1, 3.4_
- [ ] 4. Decay on tape meshes in the house
  - _Requirements: 3.3_
- [ ] 5. Demo time scale setting
  - _Requirements: supports the demo; no change to normal behaviour_
