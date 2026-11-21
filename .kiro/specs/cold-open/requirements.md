# Requirements: Cold Open

## Introduction
The app opens like a found tape: a black screen, old boot-up text, VHS tracking lines and a timestamp of October 31, 1970, 00:00. That date is before VHS existed, which is the first chill. Pressing enter "plays" the tape.

## Requirements

### Requirement 1: Boot screen
#### Acceptance criteria
1. WHEN the app loads THEN the system SHALL show a black screen with the VHS pass active: tracking lines, slight colour bleed and noise.
2. The system SHALL type out boot lines one at a time in a blocky monospace font, ending with `OCT 31 1970  00:00`.
3. WHEN the boot lines finish THEN the system SHALL show a blinking `▶ PLAY` prompt with the hint "press enter" on desktop or "tap" on touch devices.
4. WHEN the user presses Enter, Space or taps THEN the system SHALL start audio, play a short tape-start sound and glitch, and move to the front yard.
5. IF the user presses Enter before the boot lines finish THEN the system SHALL show all lines immediately instead of starting.

### Requirement 2: Returning users
#### Acceptance criteria
1. WHEN a user with saved tapes opens the app THEN the system SHALL show the same cold open, with one extra boot line showing the number of tapes found, for example `TAPES FOUND: 004`.

### Requirement 3: Accessibility
#### Acceptance criteria
1. WHILE reduce flashing is on THEN the glitch on play SHALL be replaced by a fade.
2. The boot text SHALL be available to screen readers through an `aria-live` region.
