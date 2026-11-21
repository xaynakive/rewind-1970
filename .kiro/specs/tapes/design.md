# Design: Tapes

## Overview
The tapes system owns the tape data model, creation, placement in hiding spots, reading and rewinding. It does not calculate decay; it asks the decay system for a tape's decay level.

## Data model
```ts
type HidingSpotId =
  | 'under-bed' | 'mailbox' | 'pumpkin-pile' | 'grave-1' | 'grave-2'
  | 'grave-3' | 'pond' | 'wardrobe' | 'tv-cabinet' | 'attic-hatch';

interface Tape {
  id: string;            // crypto.randomUUID()
  label: string;         // ≤ 24 chars
  text: string;          // ≤ 4000 chars, never modified by decay
  createdAt: number;     // epoch ms
  lastViewedAt: number;  // epoch ms, updated only by rewind
  spot: HidingSpotId;
  found: boolean;
  rewindCount: number;   // used by endings for "most rewound tape"
}
```

## Modules
- `systems/tapes/model.js`: the `Tape` shape, `createTape(input, { id, now, spot })` with validation and label defaulting. Pure.
- `systems/tapes/placement.js`: `chooseSpot(tapeId, occupancy)`. Hash the id (FNV-1a), take the first free spot starting at `hash % SPOTS.length`, or the least occupied spot if all are full. Pure.
- `systems/tapes/hints.js`: one hint line per spot.
- `storage/tapeStore.js`: IndexedDB access. Database `rewind-1970`, object store `tapes` keyed by `id`, plus a `meta` store. Falls back to memory.
- `systems/tapes/rewind.js` (planned): a hold-to-rewind state machine: `idle → holding(progress) → complete | cancelled`.
- `ui/tapeWriter.js` and `ui/settingsPanel.js` (which holds the text-only reader): DOM overlays. Text is set with `textContent` only.

## Events
- `tape:created { tape }`, `tape:found { id }`, `tape:rewound { id }`.
- The house system listens for `tape:created` to place the tape mesh in the scene.

## Hint lines
A fixed table with one hint line per hiding spot, for example `under-bed`: "something slides across the floor upstairs", `pond`: "something splashes in the dark outside". Hints point to an area but never name the spot; a unit test checks that no hint contains its spot's name.

## Error handling
- If IndexedDB is unavailable, such as in some private browsing modes, keep tapes in memory and show a quiet notice: "this tape won't survive the night". 
- Writes are awaited before the hint is shown, so a failed write never shows a hint.

## Testing
- Unit tests: label defaulting, validation limits, `chooseSpot` determinism and the full-house fallback, rewind state machine timings.
