# Design: Endings

## Selection
`systems/endings/chooseEnding.js` (pure):

```ts
type EndingId = 'still-water' | 'kept' | 'tracking' | 'static';

function chooseEnding(tapes: Tape[], now: number, pondSecretNoticed: boolean): EndingId
```
It uses `decayStage(decayLevel(tape.lastViewedAt, now))` from the decay system to count healthy tapes.

"Most rewound tape" uses the `rewindCount` field defined in the tapes design.

## Final tape content
`systems/endings/finalTape.js` builds a script: a list of timed lines and shots.
- Fragments: pick up to 5 short phrases (3–6 words) from the user's tapes, chosen with a seed from the first tape's id.
- Lines are shown with the VHS pass at a decay level set by the ending: `kept`/`still-water` 0.1, `tracking` 0.4, `static` 0.8.
- The last shot is the living-room camera placed inside the TV, looking at the sofa.

## Persistence
Seen endings are stored in IndexedDB in the `meta` store as `seenEndings: EndingId[]`.

## Testing
- Unit tests for each branch of `chooseEnding`, including boundary values at 40% and 80%.
- Unit test that fragments come only from the user's tape text.
