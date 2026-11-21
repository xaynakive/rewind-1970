# Requirements: Mystery ("whose house is this?")

## Introduction
Someone lived in the house before the user. In 1970 she left five tapes of her own, hidden where only the house's tricks reveal them: the mailbox, the graves by lightning, the pond once its secret is noticed, the top of the wardrobe once the user has rewound a memory, and the attic ladder once the other four are found. Each tape is worn. Rewinding it on the TV reveals one more line at the end, which points to the next tape. With all five found, the user answers three questions about what happened. Answering correctly unlocks a fifth ending, "found".

The mystery exists to make journaling stick: the user is drawn back into the house, and to the TV, again and again. It must never compete with the user's own tapes.

## Glossary
- **House tape**: one of the five tapes the previous resident left. Fixed content, never written by the user.
- **Case**: the three questions asked once all five house tapes are found.

## Requirements

### Requirement 1: The house's tapes
1. The system SHALL include exactly five house tapes, each with a label, a text, an extra line revealed only after rewinding, a fixed decay level, and its own hiding spot that is not one of the user's ten spots.
2. House tapes SHALL NOT count toward the user's tapes for unlocking the ending, choosing the ending, the boot line, export, or "erase all tapes".
3. House tapes SHALL follow the tone rules: spooky, never gore. They SHALL NOT explain the 1970 date.

### Requirement 2: Revealing them
1. House tape 1 (the mailbox) SHALL be visible from the start.
2. House tape 2 (the graves) SHALL be visible only during lightning until the user has seen it once from the graves viewpoint. After that it SHALL stay visible.
3. House tape 3 (the pond) SHALL appear only after the pond's secret has been noticed.
4. House tape 4 (the wardrobe) SHALL appear only after the user has rewound at least one of their own tapes.
5. House tape 5 (the attic ladder) SHALL appear only after the other four have been found.
6. Once found, a house tape SHALL stay visible.

### Requirement 3: Playing and rewinding them
1. WHEN the user selects a house tape THEN the system SHALL mark it found, play it with its fixed decay, and say that something more is hidden under the static.
2. House tapes SHALL be carried and rewound on the TV exactly like the user's tapes.
3. WHEN a house tape is rewound THEN the system SHALL play it clean, with its extra line, and remember that it was rewound.
4. Each extra line except the last SHALL point toward the next house tape.

### Requirement 4: The case
1. WHEN all five house tapes have been found THEN the system SHALL say so with one quiet line, and selecting the TV (while not carrying a tape) SHALL open the case.
2. The case SHALL ask three multiple-choice questions. Every correct answer SHALL be supported by the house tapes' text.
3. IF any answer is wrong THEN the system SHALL say that something doesn't fit, without saying which, and let the user try again with no penalty.
4. WHEN all answers are right THEN the system SHALL remember the case as solved.
5. The case SHALL also be reachable from settings, so it can be solved without the 3D house.

### Requirement 5: The fifth ending
1. The ending SHALL be "found" WHEN the case is solved and at least 40% of the user's tapes are healthy. This check comes before all other endings.
2. The "found" final tape SHALL close with lines about the previous resident, warm in tone.

### Requirement 6: Text-only access and storage
1. The settings reader SHALL list found house tapes with their text, and their extra line once rewound.
2. Mystery progress (found, rewound, seen by lightning, solved) SHALL be stored on the device in the `meta` store, never sent anywhere.
