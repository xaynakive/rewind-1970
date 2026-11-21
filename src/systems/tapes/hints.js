// Diegetic hints shown after a tape is hidden. They suggest a direction
// but never name the exact spot. Spec: .kiro/specs/tapes (Requirement 2.4)

export const HINTS = {
  'under-bed': 'something slides across the floor upstairs',
  wardrobe: 'a door creaks open upstairs. then shut.',
  'attic-hatch': 'something rolls across the ceiling',
  mailbox: 'outside, metal clanks shut',
  'grave-1': 'the ground outside feels disturbed',
  'grave-2': 'the ground outside feels disturbed',
  'grave-3': 'the ground outside feels disturbed',
  pond: 'something splashes in the dark outside',
  'pumpkin-pile': 'something round rolls over in the other room',
  'tv-cabinet': 'something settles in this room',
};

export function hintFor(spotId) {
  return HINTS[spotId] ?? 'the house shifts';
}
