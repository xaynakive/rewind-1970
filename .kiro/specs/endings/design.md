# Design: Endings

## Pure logic (`systems/endings/endings.js`)
```ts
type EndingId = 'still-water' | 'kept' | 'tracking' | 'static';

isUnlocked(tapes): boolean                    // ≥ 5 tapes and every one found
healthyShare(tapes, now, timeScale): number   // share at stage clean or worn
chooseEnding(tapes, now, pondSecretNoticed, timeScale): EndingId
pickFragments(tapes): string[]
buildFinalTape(tapes, ending, { formatDate }): FinalTapeScript
finaleTimeline(script): Segment[]; segmentAt(timeline, t); segmentStart(timeline, kind)
```
`chooseEnding` checks in order: still water (pond noticed and ≥ 80% healthy), kept (≥ 80%), static (< 40%), tracking. It uses the same demo time scale as decay, so demo time affects the ending too.

## The final tape's script
Built only from the user's own data on the device:
1. The date and time of the first tape (`formatDate`, injected for tests; the app uses the browser's locale in lowercase), then "you pressed record for the first time."
2. Up to 5 fragments of 3–6 words, one per tape, from tapes chosen by a seeded shuffle (seed = `fnv1a(first tape id)`), played oldest first. Trailing little words ("a", "the", "and"…) are trimmed and trailing commas dropped, so a fragment sounds cut off rather than broken.
3. `you kept coming back to "<label of the most rewound tape>".`, or "you never rewound a single one."
4. The ending's lines, by tone:
   - kept: "you kept them." / "the house will keep them too."
   - still water: "you kept them." / "you saw what was under the water." / "it was only waiting to be remembered."
   - tracking: "some of them are slipping." / "you can still catch them."
   - static: "most of them are static now." / "they're still in there." / "rewind them."

None of the lines mention 1970 or VHS (tested). The script also carries `decay` (kept and still water 0.1, tracking 0.4, static 0.8), `title` and `seed`.

## Unlocking and the tape in the VCR (`main.js`, `systems/house/livingRoom.js`)
- `rebuildTapes()` checks `isUnlocked`. When it turns true, the next playback close shows "downstairs, the vcr clicks. something slides into it."
- The tape is a separate mesh half out of the VCR's slot (`buildFinalTapeMesh`). Until `finalTapeSeen`, it is drawn only while the lightning flash is above 0.12. The first time that happens while the player stands in the living room, `finalTapeSeen` is stored in the `meta` store and the tape stays. With reduce flashing the fade still peaks at about 0.4, so the reveal still works.
- Arriving in the living room with the ending unlocked and the tape not yet seen shows: "something is in the vcr. it only shows when the sky lights up."
- The `final-tape` hotspot is listed before every other hotspot, so it sits on top of the VCR.

## Playback timeline
| Segment | Length | What happens |
|---|---|---|
| push | 1.6 s | The camera eases from where the player was looking to a close-up of the TV screen; the tape tears at the end (a fade with reduce flashing). |
| gap + line (each line) | 0.45 s + 1.7–6 s | Static, then one line on a 320×240 canvas shown through the VHS pass. |
| gap | 0.6 s | |
| pov | 5.2 s | The view from inside the TV: the sofa and the empty room, lit by the TV, with the clock frozen at `OCT 31 1970  00:00`. |
| card | 3.2 s | `TAPE END` and the ending's title. |
| return | 0.9 s | Black, then back to the living room with "the tape is back in the vcr. it still says 10-31-70." |

- Lines are drawn with the system's fonts (any language), centred and wrapped at 280 px, damaged with `driftWords` at the script's decay. VHS tracking, bleed, noise and glitch also scale with the decay. Gaps are noisier.
- While playing: exits and hotspots are off, lightning is held back, and movement keys are swallowed. Escape skips to the card.
- Each line is appended to an `aria-live` region (`#tv-text`) as it plays.
- At the end, the ending id is added to `seenEndings` in the `meta` store. The tape stays in the VCR, and playing it again re-chooses the ending.

## Testing (`tests/endings.test.js`)
Unlock rules; healthy share; every ending branch at its exact boundaries (80% and 40%); demo time; fragments come only from tape text, are 3–6 words, at most 5, deterministic, and never end on a little word; the script's first-date line, most-rewound line and tone; static is the most damaged; no mention of 1970; timeline order and contiguity; `segmentAt` edges; line duration limits.
