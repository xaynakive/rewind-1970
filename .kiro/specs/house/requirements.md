# Requirements: House

## Introduction
The house is the interface. The user moves between viewpoints in and around a dark house in a storm. There are no menus for navigating the journal; going somewhere is how the user finds tapes.

## Glossary
- **Area**: a part of the house: front yard (graves, mailbox, pond), hallway, messy room (pumpkins), bedroom, living room (TV and VCR).
- **Viewpoint**: a fixed camera position and direction inside an area that the user can move to.

## Requirements

### Requirement 1: Moving around
**User story:** As a user, I want to walk around the house, so that exploring feels physical.

#### Acceptance criteria
1. The system SHALL let the user move between connected viewpoints with a smooth camera move of 0.6 to 1.2 seconds.
2. On desktop, the system SHALL support clicking a highlighted destination, and W/A/S/D or the arrow keys to move to the viewpoint in that direction.
3. On touch devices, the system SHALL support tapping a destination, and swiping to look around within a limited angle.
4. WHILE a camera move is in progress THEN the system SHALL ignore new move input.
5. The system SHALL allow mouse or touch look within ±35° horizontally and ±20° vertically at each viewpoint.

### Requirement 2: Areas
#### Acceptance criteria
1. The system SHALL include the front yard, hallway, messy room, bedroom and living room.
2. Each hiding spot defined in the tapes spec SHALL be visible from at least one viewpoint.
3. WHEN the user enters an area THEN the system SHALL load that area's assets if needed and dispose of assets for areas more than one step away.

### Requirement 3: Storm and lightning
**User story:** As a user, I want a storm outside that reveals hidden things.

#### Acceptance criteria
1. WHILE the user is in the front yard THEN the system SHALL show rain and play rain audio. Indoors the rain SHALL be quieter and visible only through windows.
2. The system SHALL trigger lightning at random intervals between 8 and 25 seconds.
3. WHEN lightning strikes THEN the system SHALL flash the scene for 80–150 ms, sometimes twice, and play thunder after a delay of 0.5–3 seconds.
4. WHEN lightning strikes THEN the system SHALL briefly reveal "lightning-only" objects, including tapes that are not otherwise visible, for the duration of the flash.
5. WHILE reduce flashing is on THEN the system SHALL replace the flash with a fade of at most 50% brightness lasting at least 400 ms.

### Requirement 4: Things that are slightly wrong
#### Acceptance criteria
1. The system SHALL include at least three subtle changes that happen when the user is not looking, such as a chair that has turned or a door that is now open.
2. These changes SHALL never include gore and SHALL never be accompanied by a loud sound.
