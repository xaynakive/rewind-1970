# Requirements: Decay

## Introduction
Tapes that are not rewound slowly decay. Decay is shown as VHS damage: colour bleed, static and words drifting out of place. Decay is visual only. It never deletes or changes the stored memory.

## Requirements

### Requirement 1: Decay level
**User story:** As a user, I want neglected memories to look like they are fading, so that I'm reminded to revisit them.

#### Acceptance criteria
1. The system SHALL calculate a tape's decay level as a number from 0 to 1 using only `lastViewedAt` and the current time.
2. The decay level SHALL be 0 for the first 3 days after `lastViewedAt`.
3. After that, the decay level SHALL rise smoothly and reach its maximum of 0.85 at 30 days. It SHALL never exceed 0.85, so a tape is always partly readable.
4. The system SHALL group the level into stages for gameplay and audio: `clean` (0), `worn` (up to 0.3), `damaged` (up to 0.6) and `fading` (above 0.6).
5. WHEN a tape is rewound THEN its decay level SHALL return to 0.

### Requirement 2: Decay never destroys
#### Acceptance criteria
1. The system SHALL NOT modify or delete tape text because of decay.
2. The text-only reader SHALL show the original text regardless of decay level.

### Requirement 3: Showing decay
**User story:** As a user, I want decay to look like a real damaged tape.

#### Acceptance criteria
1. WHEN a tape is read THEN the system SHALL render its text with effects scaled by its decay level: chroma offset, horizontal tracking lines, noise, and per-word drift.
2. Per-word drift SHALL move at most 20% of words at `fading`, and SHALL use a seed from the tape id so that the same tape shows the same damage each time.
3. WHEN a tape mesh is visible in the house THEN the system SHALL tint its label and add static in proportion to its decay level, so the user can see from a distance which tapes need attention.
4. WHILE the reduce-flashing setting is on THEN the system SHALL disable noise flicker and use static, non-animated damage.

### Requirement 4: Clock safety
#### Acceptance criteria
1. IF the device clock is earlier than `lastViewedAt` THEN the system SHALL treat the elapsed time as 0.
