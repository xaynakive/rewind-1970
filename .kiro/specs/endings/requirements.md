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
2. WHEN the ending unlocks THEN the system SHALL place the final tape in the living room VCR. It SHALL be visible only during lightning until the user picks it up.

### Requirement 2: Choosing the ending
#### Acceptance criteria
1. The system SHALL choose one ending using these rules, checked in order:
   1. **"Still Water"**: the pond secret was noticed, and at least 80% of tapes are healthy.
   2. **"Kept"**: at least 80% of tapes are healthy.
   3. **"Static"**: fewer than 40% of tapes are healthy.
   4. **"Tracking"**: every other case.
2. The ending choice SHALL be a pure function of the tapes, the current time and the pond flag.

### Requirement 3: The final tape
**User story:** As a user, I want the final tape to feel impossible: something I never recorded, but made of me.

#### Acceptance criteria
1. The final tape SHALL be labelled "10-31-70".
2. WHEN played on the TV THEN the final tape SHALL show content built only from the user's own data on the device: the date and time of their first tape, the label of their most rewound tape, and short fragments of their own words.
3. The final tape SHALL end on a view of the living room from the TV's point of view, showing the sofa where the user would sit, with the timestamp `OCT 31 1970 00:00`.
4. The final tape SHALL NOT explain the 1970 date.
5. The final tape content SHALL vary by ending, using the ending's tone: warm for "Kept" and "Still Water", uneasy for "Tracking", and broken for "Static".

### Requirement 4: After the ending
#### Acceptance criteria
1. WHEN the ending finishes THEN the system SHALL return the user to the house with all their tapes intact.
2. The system SHALL remember which endings the user has seen.
