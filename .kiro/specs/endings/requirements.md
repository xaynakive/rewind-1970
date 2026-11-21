# Requirements: Endings

## Introduction
The tapes the user finds, and how healthy they are, decide the ending. The final tape is one the user never recorded.

## Glossary
- **Healthy tape**: a tape at decay stage `clean` or `worn`.
- **Final tape**: a tape the system creates from the user's own history. It appears only at the end.

## Requirements

### Requirement 1: Unlocking the ending
#### Acceptance criteria
1. WHEN the user has at least 5 tapes and has found every tape at least once THEN the system SHALL unlock the ending.
2. WHEN the ending unlocks THEN the system SHALL place the final tape in the living room VCR. Until the user has seen it once in a lightning flash from the living room, it SHALL be visible only during lightning. After that it SHALL stay visible, so it can be selected without racing the flash (this also keeps it reachable with reduce flashing and for keyboard users).
3. WHEN the ending unlocks THEN the system SHALL tell the user with one quiet line, without naming the tape.

### Requirement 2: Choosing the ending
#### Acceptance criteria
1. The system SHALL choose one ending using these rules, checked in order:
   1. **"Found"**: the house's case is solved (see the mystery spec), and at least 40% of tapes are healthy.
   2. **"Still Water"**: the pond secret was noticed, and at least 80% of tapes are healthy.
   3. **"Kept"**: at least 80% of tapes are healthy.
   4. **"Static"**: fewer than 40% of tapes are healthy.
   5. **"Tracking"**: every other case.
2. The ending choice SHALL be a pure function of the tapes, the current time, the pond flag and the case flag.

### Requirement 3: The final tape
**User story:** As a user, I want the final tape to feel impossible: something I never recorded, but made of me.

#### Acceptance criteria
1. The final tape SHALL be labelled "10-31-70".
2. WHEN played on the TV THEN the final tape SHALL show content built only from the user's own data on the device: the date and time of their first tape, the label of their most rewound tape, and short fragments of their own words.
3. The final tape SHALL end on a view of the living room from the TV's point of view, showing the sofa where the user would sit, with the timestamp `OCT 31 1970 00:00`.
4. The final tape SHALL NOT explain the 1970 date.
5. The final tape content SHALL vary by ending, using the ending's tone: warm for "Kept", "Still Water" and "Found", uneasy for "Tracking", and broken for "Static".

### Requirement 4: After the ending
#### Acceptance criteria
1. WHEN the ending finishes THEN the system SHALL return the user to the house with all their tapes intact.
2. The system SHALL remember which endings the user has seen.
3. The final tape SHALL stay in the VCR after it ends, and playing it again SHALL choose the ending again from the current state of the house.
4. WHILE the final tape plays THEN the user SHALL be able to press Escape to skip to the end card, and each line SHALL be announced to screen readers.
