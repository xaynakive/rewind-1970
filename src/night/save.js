// What is kept across rewinds, as stored on the device. Pure, apart from load/store.
// Spec: .kiro/specs/haewol (Requirement 2.4, design "Saved state")

export const SAVE_KEY = 'rewind-1970:haewol';

export function emptySave() {
  return { loops: 0, taken: [], lullaby: 0, answered: 0, refused: 0, calls: [], seenEndings: [], introSeen: false };
}

const count = (v) => (Number.isInteger(v) && v >= 0 ? v : 0);
const strings = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string'))] : []);

/** Anything read back from storage becomes a well-formed save. */
export function normalizeSave(raw) {
  const s = emptySave();
  if (!raw || typeof raw !== 'object') return s;
  return {
    loops: count(raw.loops),
    taken: strings(raw.taken),
    lullaby: Math.min(count(raw.lullaby), 7),
    answered: count(raw.answered),
    refused: count(raw.refused),
    calls: strings(raw.calls),
    seenEndings: strings(raw.seenEndings),
    introSeen: raw.introSeen === true,
  };
}

export const withTaken = (s, id) => (s.taken.includes(id) ? s : { ...s, taken: [...s.taken, id] });
export const nextLoop = (s) => ({ ...s, loops: s.loops + 1, calls: [] });

/** The name was called (`call`: an id like "loop3-0"); `answered` is the user's choice. */
export function withNameChoice(s, call, answered) {
  if (s.calls.includes(call)) return s;
  return {
    ...s,
    calls: [...s.calls, call],
    answered: s.answered + (answered ? 1 : 0),
    refused: s.refused + (answered ? 0 : 1),
  };
}

/** Answering twice or more makes her find you faster (Requirement 8.2). */
export const nameDrawsHer = (s) => s.answered >= 2;

export function loadSave(storage = globalThis.localStorage) {
  try { return normalizeSave(JSON.parse(storage.getItem(SAVE_KEY) ?? 'null')); } catch { return emptySave(); }
}
export function storeSave(s, storage = globalThis.localStorage) {
  try { storage.setItem(SAVE_KEY, JSON.stringify(s)); } catch { /* this visit only */ }
}

/** The lullaby is heard in pieces; keep the most heard. */
export function withLullaby(s, pieces) {
  return { ...s, lullaby: Math.max(s.lullaby, Math.min(7, Math.floor(pieces))) };
}
