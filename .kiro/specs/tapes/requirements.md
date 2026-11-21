# Requirements: Tapes

## Introduction
Each memory the user writes is stored as a VHS tape. Tapes are hidden at places in and around the house. The user finds a tape to read it, and rewinds it on the living-room TV to restore it from decay.

## Glossary
- **Tape**: one stored memory, with its text, label, timestamps and hiding spot.
- **Hiding spot**: a named place in the house where a tape can rest, such as under the bed or in the mailbox.
- **Found**: a tape the user has picked up at its hiding spot at least once since it was last hidden.

## Requirements

### Requirement 1: Record a memory
**User story:** As a user, I want to write a memory and have it become a tape, so that journaling feels like part of the house.

#### Acceptance criteria
1. WHEN the user interacts with the VCR in the living room THEN the system SHALL open the tape writer.
2. WHEN the user submits the tape writer with non-empty text THEN the system SHALL create a tape with a unique id, the text, a label of at most 24 characters, and `createdAt` and `lastViewedAt` set to the current time.
3. IF the user leaves the label empty THEN the system SHALL use the first 24 characters of the memory text as the label.
4. IF the memory text is empty or only whitespace THEN the system SHALL NOT create a tape and SHALL keep the writer open.
5. The system SHALL limit memory text to 4,000 characters.

### Requirement 2: Hide the tape
**User story:** As a user, I want my new tape to be hidden somewhere in the house, so that I have to explore to find my memories.

#### Acceptance criteria
1. WHEN a tape is created THEN the system SHALL assign it a hiding spot from the list of spots that do not already hold a tape.
2. IF every hiding spot holds a tape THEN the system SHALL stack the new tape at the spot holding the fewest tapes.
3. The system SHALL choose the hiding spot with a deterministic function of the tape id, so that the same tape always goes to the same spot after reload.
4. WHEN the tape is hidden THEN the system SHALL show a short diegetic hint, for example "you hear something fall upstairs", and SHALL NOT state the exact spot.
5. WHEN a hiding spot holds more than one tape THEN the system SHALL show them as a pile, and selecting the pile SHALL pick up the top tape.
6. WHEN the user picks up a tape while already holding another THEN the system SHALL slide the held tape under its own pile, so the user can reach every tape in a pile by picking repeatedly.

### Requirement 3: Find and read a tape
**User story:** As a user, I want to find tapes and read them.

#### Acceptance criteria
1. WHEN the user's view is at a hiding spot that holds a tape THEN the system SHALL show the tape as an object the user can select.
2. WHEN the user selects a tape THEN the system SHALL mark it found and show its label and its text rendered with its current decay level.
3. WHEN a tape is read THEN the system SHALL NOT change `lastViewedAt`. Only rewinding restores a tape.
4. WHEN the user closes a tape they picked up THEN the system SHALL keep it in the user's hands (shown on the on-screen display) until it is rewound or swapped. A held tape is not saved: reloading the app puts it back in its pile.

### Requirement 4: Rewind a tape
**User story:** As a user, I want to rewind a tape on the TV, so that I can restore a memory that is fading.

#### Acceptance criteria
1. WHEN the user is carrying a found tape and interacts with the TV THEN the system SHALL start a rewind.
2. WHILE the user holds the rewind control THEN the system SHALL play the rewind effect and the tape whirr sound, for a total of 2 seconds of holding.
3. IF the user releases the control before 2 seconds THEN the system SHALL cancel the rewind and leave the tape unchanged.
4. WHEN the rewind completes THEN the system SHALL set the tape's `lastViewedAt` to the current time, add 1 to its `rewindCount`, play the memory on the TV with no decay, and return the tape to its hiding spot.

### Requirement 5: Text-only access
**User story:** As a user who cannot or does not want to use the 3D house, I want to read and write tapes in plain text.

#### Acceptance criteria
1. The system SHALL provide a text-only reader, reachable from the settings, that lists every tape with its label, creation date and original text.
2. The text-only reader SHALL show the original text with no decay effects.
3. The text-only reader SHALL allow creating a tape with the same rules as Requirement 1.

### Requirement 6: Storage and privacy
#### Acceptance criteria
1. The system SHALL store tapes in IndexedDB on the device only.
2. The system SHALL NOT send tape content over the network.
3. WHEN the app loads THEN the system SHALL restore all tapes with their hiding spots and timestamps.
4. The system SHALL let the user export all tapes as a JSON file and delete all tapes after a confirmation.
