# Requirements: Memories

## Introduction
Edith's tapes are more than text. Rewinding one of them on the TV lets the user **step inside it**: the picture pulls through the screen and the user walks, in first person, through a place Edith remembers. Things can be opened, picked up, turned over in the hand and read. Something else walks there too.

The first memory is **the night market**: a covered market hall inside a big building, stall after stall, tables outside, paper lanterns. October 30, 1970, the night before. Edith's twin sister June walks ahead and isn't herself. Edith follows her, collecting the notes she wrote to herself so she wouldn't forget. The thing following Edith is her forgetting, wearing her sister's shape.

Inspirations: walking through someone's memories, the school corridors of White Day, the night-market streets of Asian horror games, and car-showroom close-ups where an object fills the screen and catches the light.

Tone: spooky, never gore (steering: `product.md`). Nobody is hurt on screen. Being caught means the tape snaps to static and the memory starts that part again.

## Glossary
- **Memory**: a walkable level inside one of Edith's tapes.
- **Walker**: the user's body in a memory: position, facing, and collision with the level.
- **Interactable**: something the user can use: a drawer, door, lid, item, note, hiding place or exit.
- **Inspect view**: the close-up where a picked-up object fills the screen and can be turned and zoomed.
- **Presence**: the figure that follows Edith through the memory.
- **Story mode**: a setting where the presence never chases.

## Requirements

### Requirement 1: Stepping in and out
**User story:** As a user, I want to walk into one of Edith's tapes, so the house's story is something I live through, not only read.
#### Acceptance criteria
1. WHEN a house tape that has a memory has been rewound THEN its playback (right after the rewind, and whenever it is played again) SHALL offer "step inside".
2. WHEN the user steps inside THEN the system SHALL glitch through the TV into the memory (a dip to black with reduce flashing), and the on-screen clock SHALL read `OCT 30 1970` and run from `23:41`.
3. WHILE in a memory the user SHALL be able to leave at any time from the pause menu, returning to where they were in the house, with the house as it was.
4. WHEN a memory is finished THEN the system SHALL return the user to the house and remember it as finished. The memory SHALL stay enterable again.
5. Progress inside a memory (notes and items found) SHALL be kept on the device in the `meta` store, and only on the device.

### Requirement 2: Walking
**User story:** As a user, I want to walk and look around freely, with whatever input I have.
#### Acceptance criteria
1. On desktop the user SHALL walk with W/A/S/D or the arrow keys and look with the mouse (pointer lock after a click). The left and right arrow keys SHALL also turn, so the keyboard alone is enough.
2. On touch screens the user SHALL walk by dragging on the left half of the screen, look by dragging on the right half, and use on-screen buttons for "use", "light" and "notes".
3. The user SHALL NOT walk through walls, counters, tables or closed doors.
4. Holding Shift SHALL sneak: half speed, quieter.
5. Looking up and down SHALL be limited to ±70°, and head bob SHALL be off when reduce flashing is on.

### Requirement 3: Opening, collecting and reading
**User story:** As a user, I want to open everything and pick things up, like the horror games I grew up watching.
#### Acceptance criteria
1. WHEN the user looks at an interactable within reach (2.2 m) THEN the system SHALL show a large prompt naming the action ("open the drawer", "take the photo") and highlight the object.
2. The system SHALL also pick an interactable within 16° of the view centre when the centre ray misses, so low vision and touch users don't have to aim exactly.
3. Drawers, doors and lids SHALL animate open and closed, and SHALL never trap the user.
4. WHEN the user takes an item or a note THEN it SHALL open in the inspect view (Requirement 4) and then go into the inventory or the notes book.
5. The notes book SHALL list every note found, in large DOM text, readable by screen readers.
6. A locked exit SHALL name what it needs ("it's locked. june had the key.") until the user carries it.

### Requirement 4: The inspect view
**User story:** As a user, I want to see what I pick up clearly, like a car in a showroom.
#### Acceptance criteria
1. The inspect view SHALL show the object alone, large and centred, on a dark studio backdrop, with a light that sweeps across its surfaces.
2. The user SHALL be able to turn the object (drag, or arrow keys) and zoom (wheel, pinch, or + and −).
3. The inspect view SHALL render at twice the usual resolution, with less vertex wobble, so small details are clear.
4. The object's name and its text SHALL be shown as large DOM text under it.

### Requirement 5: The presence
**User story:** As a user, I want something to be in there with me, so the memory is frightening without being violent.
#### Acceptance criteria
1. The presence SHALL appear after the user has found two notes, and SHALL patrol the memory on a fixed route.
2. WHEN the presence can see the user (within 9 m, 14 m when the flashlight is on, inside its view, with nothing in between, and the user not hidden) THEN it SHALL hunt the user. It SHALL move slower than the user walks, so walking away always works.
3. WHEN it loses sight of the user for 3 s THEN it SHALL search where it last saw them, then go back to patrolling.
4. WHEN the presence reaches the user THEN the tape SHALL snap to static (a fade with reduce flashing) and the user SHALL return to the last checkpoint. Items and notes found SHALL be kept.
5. WHILE the user is in a hiding place THEN the presence SHALL NOT see them, unless it saw them go in.
6. WHILE story mode is on THEN the presence SHALL never hunt. If it sees the user it SHALL stop, stare, and fade away.
7. The user SHALL be warned of the presence by sound (footsteps and a heartbeat that grow louder as it comes closer), not only by sight.
8. The presence SHALL never be shown in detail: a tall figure (in June's red coat in the market, a caretaker's grey coat in the school), with static where the face should be.

### Requirement 6: The night market
**User story:** As a user, I want the market to feel like a real place I'm remembering.
#### Acceptance criteria
1. The market SHALL be a covered hall with two rows of small stalls, tables and stools in the aisle, hanging paper lanterns, and a shutter at the far end.
2. It SHALL hold four of Edith's notes, the photo of the twins, and June's key, each in a different stall, behind something the user opens.
3. The back shutter SHALL open only with June's key. Behind it June stands with her back turned. WHEN the user comes close THEN the memory SHALL end with its closing lines and return to the house.
4. A checkpoint SHALL be saved at the entrance and each time something is taken.
5. Every clock in the clock stall SHALL read 00:00.

### Requirement 7: Seeing in the dark
#### Acceptance criteria
1. The user SHALL carry a flashlight, on by default, toggled with L or the "light" button.
2. Things the user can still take SHALL glint softly every few seconds. With "clear picture" on they SHALL glow steadily.
3. The brightness and clear-picture settings SHALL apply inside memories exactly as in the house.

### Requirement 8: The school at night
**User story:** As a user, I want a second memory, from the grave tape, where I learn how close the twins were and how Edith began to lose June.
#### Acceptance criteria
1. The grave tape (`house-2`) SHALL offer "step inside" once rewound, and SHALL open the school at night, March 14 1962.
2. The school SHALL be a corridor of lockers with tall windows onto a storm, opening onto the twins' classroom, a music room and the girls' bathroom, with a chained door to the stairs at the far end. Lightning SHALL show in the windows by the house's lightning rules, including reduce flashing.
3. It SHALL hold four of Edith's notes, the class photo and the caretaker's keys. Five of them SHALL be behind something the user opens (June's locker, the twins' desks, the teacher's drawer, the piano), and the note by the bathroom sink SHALL lie in the open.
4. The stair door SHALL open only with the caretaker's keys. June waits at the bottom of the stairs. WHEN the user comes close THEN the memory SHALL end with its closing lines and return to the house.
5. The presence SHALL be a caretaker in a grey coat carrying a lamp, and the lamp SHALL light the corridor around it, so the user sees it coming.
6. The user SHALL be able to hide in two lockers (looking out through the vents) and in a bathroom stall.
7. June SHALL be glimpsed once in the corridor before the end, and SHALL be gone when the user comes close.
8. A checkpoint SHALL be saved at the entrance and each time something is taken.
9. Nobody SHALL be hurt, and the words SHALL follow the house's tone rules.
