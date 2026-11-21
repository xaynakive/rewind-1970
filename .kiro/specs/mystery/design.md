# Design: Mystery

## The story
In 1970, Edith lived in the house. She recorded her memories because she was losing them. One night, October 31, she stopped rewinding, went down to the still water to remember, and didn't come back. The skeleton in the pond is hers. The house isn't evil: it's lonely, and it keeps memories so nobody has to forget alone. That's why it's asking the user for theirs.

| # | Spot (area) | Label | Revealed by | Extra line after rewinding (the next clue) |
|---|---|---|---|---|
| 1 | `house-mailbox` (front yard, at the foot of the mailbox) | for whoever lives here | always | the lightning shows you what the house keeps. |
| 2 | `house-grave` (front yard, in the grass between the graves) | the stones | lightning, then stays | watch the water when the sky lights up. |
| 3 | `house-pond` (front yard, floating) | the water | pond secret noticed | rewind something of yours. then look up, in the bedroom. |
| 4 | `house-wardrobe` (bedroom, on top of the wardrobe) | my name | one of the user's tapes rewound | the last one is up the ladder. |
| 5 | `house-attic` (hallway, on the attic ladder) | the attic | the other four found | thank you for finding me. |

## Pure logic (`systems/mystery/mystery.js`)
```ts
HOUSE_TAPES: HouseTape[]        // { id, label, text, extra, decay, spot, reveal }
QUESTIONS: Question[]            // { id, prompt, options: string[], answer: number }
emptyProgress(): Progress        // { found: [], rewound: [], lightningSeen: false, solved: false }
revealOf(tape, ctx): 'hidden' | 'flash' | 'shown'
  // ctx: { progress, pondNoticed, anyUserRewound }
allFound(progress): boolean
checkAnswers(answers): { ok: boolean }
asTape(houseTape, progress): Tape-like object for meshes and playback
```
`reveal` kinds: `always`, `lightning`, `pond`, `rewound`, `others-found`. A found tape is always `shown`.

## Wiring (`main.js`)
- Progress is loaded from and saved to the `meta` store under `mystery`.
- `rebuildTapes()` adds house tapes whose reveal is `shown` to the area's piles. House spots live in the area modules' `spots`, so `buildTapeMeshes` places them like any other pile. They're single-tape piles, so they never mix with the user's piles.
- House tape 2, while its reveal is `flash`, is built into a separate mesh drawn only when the flash is above 0.12. The first time that happens while standing at `yard-graves`, `lightningSeen` is saved and it stays.
- `levelOf` gives house tapes their fixed decay, or 0 once rewound.
- Picking up and rewinding reuse the user-tape flow; only the saving differs (meta, not the tapes store). House tapes never slide under piles.
- After rewinding, playback shows `text + extra`. Before rewinding, the playback note says "there's more at the end of this tape, under the static. rewind it."

## The case (`ui/caseFile.js`)
A dialog with three radio groups. Wrong: "something doesn't fit. listen to the tapes again." Right: solved is saved, then "the house is quiet for the first time." The TV opens it once all five are found; settings has an "answer the house" button.

| Question | Options (correct in bold) | Where the answer is |
|---|---|---|
| who is under the water? | the house / **edith** / nobody | tape 1 ("my name is edith"), tape 3 ("i went down to the water") |
| what was she losing? | **her memories** / her way home / her house | tape 4 ("i couldn't remember my own name") |
| why does the house keep the tapes? | to keep whoever lives here / **so nobody forgets alone** / it wants to be left alone | tape 5 |

## Endings
`chooseEnding(tapes, now, pondNoticed, timeScale, mysterySolved)` checks `found` first (solved and ≥ 40% healthy). Its outro: "you found her." / "she isn't in the water anymore." / "she's on a tape, where she wanted to be." Decay 0.05.

## Testing (`tests/mystery.test.js`)
Five tapes with unique ids and spots; every house spot exists in its area and is on screen from a viewpoint in that area; reveal rules for every kind; found stays shown; all-found; every correct answer's key words appear in the house tapes; wrong answers fail; tone (no gore words, no "1970"); `chooseEnding` picks `found` only when solved and ≥ 40% healthy.
