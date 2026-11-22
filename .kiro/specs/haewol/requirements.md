# Requirements: Haewol, the looping night

## Introduction
A second, standalone game in this repo, from the user's design document "REWIND 1970: a tape dated October 31st, 1970". The whole game is a dream. Byeol, a girl who can't put her phone down, falls asleep at 11:58 pm with it still lit in her hand. In the dream she finds a camcorder and a tape in a ruined house. Playing the tape puts you in the village of Haewol on the night of the typhoon, 23:58 to 00:00, a night that keeps replaying. You explore the houses, collect seven memories, and choose how the night ends. Every ending but one keeps you in the dream. In the last one you stop chasing, breathe, and wake up changed: the realization is that what you chase inside the loop doesn't matter.

It lives at `haewol/index.html` and reuses the house game's renderer, audio, walking, reaching, inspect view and presence. The house game is unchanged.

Inspirations named by the user: White Day, Paranormal HK, East and Southeast Asian horror; "Minecraft meets Asian horror meets a little GTA and old Nintendo games", with a system that looks like iOS and a picture that feels like an A24 film. The village, its rite and its names are invented.

## Glossary
- **Byeol:** the dreamer, and the user. In the dream the house calls her "Sae".
- **The night:** one loop, 23:58:00 to 00:00:00 on the timecode, lasting `LOOP_MS` of real time.
- **Rewind:** the night starting again in the entry house. Caused by the Caller catching you, or by midnight.
- **The Caller:** Yeonhwa, the mother. The presence of this game.
- **Sae:** her daughter, seven. A gentle presence: wet footprints, humming, red thread.
- **Wol:** the grandmother. She speaks only through the notes in her house.
- **The camcorder:** the user's tool. Its viewfinder shows what the eye can't.
- **Memory:** one of seven objects. Keeping one plays a short VHS flashback of the real night.

## Tone (applies to everything)
1. Grief horror, never gore. Nobody is hurt on screen. Sae's drowning is never shown, only implied (the paper boat, the water, the empty courtyard).
2. No loud stings. Danger is announced by sound going quiet and a cassette rewinding.
3. The Caller is a mother, not a monster. Her words are sad, never cruel.
4. Red is the only saturated colour: lanterns, thread, the tally light, her.
5. The village, its rite and names are invented. No real tradition is copied.

## Requirements

### Requirement 1: The cold open
**User story:** As a user, I want to start in the present, so pressing play feels like a choice.
#### Acceptance criteria
1. The game SHALL open in the present day: a ruined room, a camcorder and a tape labelled in a child's handwriting, "10·31·1970".
2. WHEN the user presses play THEN the picture SHALL go to static and come back in 1970, in the entry house, with the timecode at 23:58:00.
3. A returning user SHALL be able to skip the cold open.

### Requirement 2: The loop
**User story:** As a user, I want the night to repeat but my understanding to stay, so each loop I get further.
#### Acceptance criteria
1. The night SHALL run from 23:58:00 to 00:00:00 on the timecode over `LOOP_MS` of real time (8 minutes), with the timecode slowed to match.
2. WHEN the timecode reaches 00:00:00 before the night's work is done THEN the night SHALL rewind: a reversed-picture effect with the rewind whirr (a fade with reduce flashing), then the entry house at 23:58:00.
3. WHEN the Caller catches the user THEN the night SHALL rewind the same way.
4. Memories, notes, keys, lullaby notes and choices SHALL be kept across rewinds and saved on the device. Doors and containers SHALL reset.
5. The loop count SHALL be saved. Each loop, the TV in the entry house SHALL show one more line of the tape.

### Requirement 3: The courtyard and the water
**User story:** As a user, I want a hub that gets more dangerous as the clock runs.
#### Acceptance criteria
1. The courtyard SHALL connect the entry house, Yeonhwa's house, Wol's house, the schoolroom and the path to the shrine on the hill. It SHALL have a stone well, a small shrine and strings of red lanterns.
2. The water SHALL rise with the clock, from dry stones at 23:58 to knee deep at 00:00.
3. Late in the night the courtyard SHALL only be crossable on stepping stones. The safe stones SHALL show through the camcorder.
4. WHILE the user stands in water with a light up THEN the Caller SHALL see the user from farther away.

### Requirement 4: The camcorder
**User story:** As a user, I want one tool that reveals things but costs me.
#### Acceptance criteria
1. Holding C or the right mouse button (the "lens" button on touch) SHALL raise the camcorder: a viewfinder with REC, a battery meter and the timecode.
2. Through the lens the user SHALL see things the eye can't: Sae's wet footprints, writing on walls, the safe stones.
3. The battery SHALL drain while recording and SHALL be full at the start of each loop.
4. WHILE recording THEN the red tally light SHALL be on and the Caller SHALL see the user from farther away, as with a light.
5. The user SHALL also carry a candle (L). It lights the dark and carries the same cost as recording.

### Requirement 5: The Caller
**User story:** As a user, I want a presence I survive by reading her rules.
#### Acceptance criteria
1. The Caller SHALL patrol a fixed route per area, with the presence rules of the memories spec (sight, hearing, search, slower than walking).
2. WHEN she is near or starts to hunt THEN the rain SHALL go quiet and a cassette SHALL be heard rewinding.
3. She SHALL see farther when the user's candle or camcorder is on, or when the user has answered to Sae's name more often.
4. The user SHALL be able to hide (wardrobes, under desks).
5. Humming the completed lullaby SHALL make her stop and listen once per loop.
6. Story mode SHALL work as in the memories spec: she never hunts.
7. She SHALL be shown only as a figure in red with wet hair over her face.

### Requirement 6: The places
#### Acceptance criteria
1. **The entry house:** where every loop begins. A dead TV, the table where the camcorder was found. Always safe.
2. **Yeonhwa's house:** her shrine to Sae, the warm cassette recorder. Rooms open with keys. She is strongest here: inside it she always sees you as if your light were up, and she follows you in. Three memories, and two places to hide.
3. **Wol's house:** herb-dark, papered with notes that explain the rite and, in the margins, how to undo it. Its door SHALL stay tied shut until the user carries Sae's ribbon. The margins and the page that tells how to undo the rite SHALL be readable only through the lens. Her book SHALL answer each memory the user carries. One memory, and one place to hide.
4. **The schoolroom:** small desks, a chalkboard that writes back when you're not looking, Sae's things, and a corridor that is longer each time you run it.
5. **The shrine on the hill:** reachable only with enough of the truth. The endings play here.
6. **The drowned village:** optional and secret, below the still water.

### Requirement 7: Things to find
#### Acceptance criteria
1. **Seven memories.** Keeping one plays a short flashback (lines over a tinted, damaged picture).
2. **The lullaby**, a few notes at a time (a music box, humming, a scratched record).
3. **Home tapes** to play on found recorders: lore only.
4. **Offerings** (rice, a comb, a coin, a paper boat), laid at the shrine in the right order.
5. **Red thread:** Sae ties it to what matters. Through the lens it leads to the next important thing.
6. **The scratched photograph:** one face removed in every copy.

### Requirement 8: The name
#### Acceptance criteria
1. At set moments the house SHALL call the user "Sae". The user SHALL choose to answer or stay quiet.
2. Each answer SHALL be counted and saved, and SHALL make the Caller find the user faster (Requirement 5.3).

### Requirement 9: The endings
#### Acceptance criteria
1. **rewind** (default): the user answered to the name too often. The title card reads 10·31·1970 00:00 again.
2. **rest**: the lullaby whole and the offerings laid; mother and daughter meet at the shrine; it becomes 00:01, then morning.
3. **take her place**: the user stays so Sae can leave.
4. **erase**: the user burns the tape; everyone is freed and forgotten; the user wakes in the present.
5. **the true night** (secret): all seven memories, the photograph restored, the drowned village found; the night tells who untied Sae's boat.
6. Seen endings SHALL be saved.

### Requirement 10: The look, the sound, and access
#### Acceptance criteria
1. The dream is shot like a film (Requirement 11). The camcorder, flashbacks and rewinds are seen through the tape: the house game's VHS picture, a burned-in timecode, rolling tracking near danger.
2. Rain as the constant floor, cicadas that go quiet, a music-box lullaby that grows over the game, and the rewind whirr as the sound of danger.
3. Brightness, clear picture, reduce flashing, sound and story mode SHALL work as in the house game.
4. All words SHALL be DOM text, large and readable by screen readers.
5. Desktop keyboard and mouse, and touch screens, SHALL both work.

### Requirement 11: The dream, the phone and the film
**User story:** As Byeol, I want the game to feel like my own dream: my phone's system over a night that looks like a film.
#### Acceptance criteria
1. The cold open SHALL show Byeol falling asleep with her phone, then the ruined house. Its buttons SHALL read "close your eyes" (and "back to the dream" for returning players).
2. The system SHALL look like a phone: the system font, frosted glass panels, rounded buttons, switches for settings.
   - The night's clock SHALL sit in a black pill at the top (the island). A dot on it SHALL turn amber when the Caller is near and red when she hunts.
   - The name call SHALL arrive as a notification from "home", with the two choices as its buttons.
   - What the user carries SHALL show in a dock of icons with names. Icons SHALL be drawn, not taken from a font.
   - Pause SHALL be a lock screen: the date (Saturday, October 31) and the night's clock above the settings.
3. The picture SHALL look like a film: 2.39:1 black bars (on wide screens, switchable in pause), soft grain, no scanlines, plain white title cards ("Haewol / the first night", then "the second night" and on).
4. Raising the camcorder SHALL pull the bars away and switch to the tape picture with its PLAY and timecode. Lowering it SHALL return to the film.
5. All text SHALL stay large and high-contrast. Reduce flashing and reduced motion SHALL stop the grain and the animations.
6. **Planned:** breathing as an action, and a last ending where Byeol wakes at dawn and changes (tasks 6-7).
