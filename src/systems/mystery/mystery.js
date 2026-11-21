// "Whose house is this?" The previous resident's five tapes, how each is
// revealed, and the case. Pure: no DOM, no storage. Spec: .kiro/specs/mystery

/** The day she stopped: the house tapes' recording date. Midday UTC, so it reads Oct 31 in every timezone. */
export const HOUSE_DATE = Date.UTC(1970, 9, 31, 12, 0);

export const HOUSE_TAPES = [
  {
    id: 'house-1',
    spot: 'house-mailbox',
    memory: 'market', // rewinding it lets you step inside (spec: memories)
    label: 'for whoever lives here',
    reveal: 'always',
    decay: 0.55,
    text: "if you're hearing this, you live here now. my name is edith. i'm leaving these where the house can find them. it keeps things. it kept me.",
    extra: 'the lightning shows you what the house keeps.',
  },
  {
    id: 'house-2',
    spot: 'house-grave',
    memory: 'school',
    label: 'the stones',
    reveal: 'lightning',
    decay: 0.65,
    text: "the stones in the yard aren't for people. they're for the things we forget. the house buries a little more of me every night.",
    extra: 'watch the water when the sky lights up.',
  },
  {
    id: 'house-3',
    spot: 'house-pond',
    label: 'the water',
    reveal: 'pond',
    decay: 0.75,
    text: 'i went down to the water to remember. it was so still. everything i had lost was right there, under the surface. it looked like it was waiting for me.',
    extra: 'rewind something of yours. then look up, in the bedroom.',
  },
  {
    id: 'house-4',
    spot: 'house-wardrobe',
    label: 'my name',
    reveal: 'rewound',
    decay: 0.8,
    text: "i stopped rewinding. one night i couldn't remember my own name, so i wrote it on every tape. the clock stopped at midnight. so did i.",
    extra: 'the last one is up the ladder.',
  },
  {
    id: 'house-5',
    spot: 'house-attic',
    label: 'the attic',
    reveal: 'others-found',
    decay: 0.6,
    text: "the house isn't haunted. it's lonely. it remembers so nobody has to forget alone. keep your tapes clean. don't let them go quiet like mine.",
    extra: 'thank you for finding me.',
  },
];

export const QUESTIONS = [
  { id: 'who', prompt: 'who is under the water?', options: ['the house', 'edith', 'nobody'], answer: 1 },
  { id: 'lost', prompt: 'what was she losing?', options: ['her memories', 'her way home', 'her house'], answer: 0 },
  { id: 'why', prompt: 'why does the house keep the tapes?', options: ['to keep whoever lives here', 'so nobody forgets alone', 'it wants to be left alone'], answer: 1 },
];

export const PLAYBACK_NOTE = "there's more at the end of this tape, under the static. rewind it.";

export function emptyProgress() {
  return { found: [], rewound: [], lightningSeen: false, solved: false };
}

/** Accepts whatever was stored and returns a well-formed progress object. */
export function normalizeProgress(raw) {
  const p = emptyProgress();
  if (!raw || typeof raw !== 'object') return p;
  const ids = new Set(HOUSE_TAPES.map((t) => t.id));
  const list = (v) => (Array.isArray(v) ? [...new Set(v.filter((id) => ids.has(id)))] : []);
  return { found: list(raw.found), rewound: list(raw.rewound), lightningSeen: raw.lightningSeen === true, solved: raw.solved === true };
}

export const isHouseId = (id) => HOUSE_TAPES.some((t) => t.id === id);
export const houseTape = (id) => HOUSE_TAPES.find((t) => t.id === id) ?? null;

/**
 * @param {{ reveal: string, id: string }} tape
 * @param {{ progress: object, pondNoticed: boolean, anyUserRewound: boolean }} ctx
 * @returns {'hidden' | 'flash' | 'shown'}
 */
export function revealOf(tape, { progress, pondNoticed, anyUserRewound }) {
  if (progress.found.includes(tape.id)) return 'shown';
  switch (tape.reveal) {
    case 'always': return 'shown';
    case 'lightning': return progress.lightningSeen ? 'shown' : 'flash';
    case 'pond': return pondNoticed ? 'shown' : 'hidden';
    case 'rewound': return anyUserRewound ? 'shown' : 'hidden';
    case 'others-found':
      return HOUSE_TAPES.every((t) => t.id === tape.id || progress.found.includes(t.id)) ? 'shown' : 'hidden';
    default: return 'hidden';
  }
}

export function allFound(progress) {
  return HOUSE_TAPES.every((t) => progress.found.includes(t.id));
}

/** @param {Record<string, number>} answers question id -> chosen option index */
export function checkAnswers(answers) {
  return { ok: QUESTIONS.every((q) => answers?.[q.id] === q.answer) };
}

/** A house tape shaped like a user tape, for meshes, playback and the reader. */
export function asTape(tape, progress) {
  const rewound = progress.rewound.includes(tape.id);
  return {
    id: tape.id,
    house: true,
    label: tape.label,
    text: rewound ? `${tape.text}\n\n${tape.extra}` : tape.text,
    createdAt: HOUSE_DATE,
    lastViewedAt: HOUSE_DATE,
    stackedAt: HOUSE_DATE,
    spot: tape.spot,
    found: progress.found.includes(tape.id),
    rewound,
    memory: tape.memory ?? null,
    decay: rewound ? 0 : tape.decay,
    rewindCount: 0,
  };
}

/** Returns new progress with `id` added to `key` ('found' or 'rewound'). */
export function withMark(progress, key, id) {
  return progress[key].includes(id) ? progress : { ...progress, [key]: [...progress[key], id] };
}
