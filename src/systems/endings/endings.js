// Endings and the tape you never recorded. Pure: time, dates and seeds are passed in.
// Spec: .kiro/specs/endings

import { decayLevel, decayStage } from '../decay/decay.js';
import { fnv1a, mulberry32 } from '../../core/hash.js';

export const MIN_TAPES = 5;
export const FINAL_LABEL = '10-31-70';
export const MAX_FRAGMENTS = 5;

/** @typedef {'still-water' | 'kept' | 'tracking' | 'static'} EndingId */

export const ENDING_TITLES = {
  'still-water': 'still water',
  kept: 'kept',
  tracking: 'tracking',
  static: 'static',
};

/** How damaged the final tape looks for each ending (0..1). */
export const ENDING_DECAY = { 'still-water': 0.1, kept: 0.1, tracking: 0.4, static: 0.8 };

/** Closing lines. Warm, uneasy or broken; never explains the date. */
const OUTRO = {
  kept: ['you kept them.', 'the house will keep them too.'],
  'still-water': ['you kept them.', 'you saw what was under the water.', 'it was only waiting to be remembered.'],
  tracking: ['some of them are slipping.', 'you can still catch them.'],
  static: ['most of them are static now.', "they're still in there.", 'rewind them.'],
};

/** The ending unlocks once there are at least 5 tapes and every one has been found. */
export function isUnlocked(tapes) {
  return tapes.length >= MIN_TAPES && tapes.every((t) => t.found);
}

/** Share of tapes that are clean or worn (0..1). */
export function healthyShare(tapes, now, timeScale = 1) {
  if (tapes.length === 0) return 0;
  const healthy = tapes.filter((t) => {
    const s = decayStage(decayLevel(t.lastViewedAt, now, timeScale));
    return s === 'clean' || s === 'worn';
  }).length;
  return healthy / tapes.length;
}

/** @returns {EndingId} */
export function chooseEnding(tapes, now, pondNoticed, timeScale = 1) {
  const share = healthyShare(tapes, now, timeScale);
  if (pondNoticed && share >= 0.8) return 'still-water';
  if (share >= 0.8) return 'kept';
  if (share < 0.4) return 'static';
  return 'tracking';
}

const byCreation = (tapes) => [...tapes].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));

const TRAILING = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'to', 'in', 'on', 'at', 'for', 'with', 'so', 'my', 'your', 'our', 'his', 'her', 'their']);

/** A short phrase (3 to 6 words) cut from one memory, in the user's own words. */
function phraseFrom(text, rand) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const len = Math.min(words.length, 3 + Math.floor(rand() * 4));
  const start = Math.floor(rand() * (words.length - len + 1));
  const picked = words.slice(start, start + len);
  // Don't end on a little word ("...was always a"): it reads as broken, not haunted.
  while (picked.length > 3 && TRAILING.has(picked.at(-1).toLowerCase())) picked.pop();
  const phrase = picked.join(' ').replace(/[,;:\-\u2013\u2014]+$/u, '');
  return phrase || null;
}

/**
 * Up to 5 fragments from different tapes, oldest first. Seeded from the first
 * tape's id, so the same house always plays the same fragments.
 */
export function pickFragments(tapes, max = MAX_FRAGMENTS) {
  const ordered = byCreation(tapes);
  if (ordered.length === 0) return [];
  const rand = mulberry32(fnv1a(ordered[0].id));
  const idx = ordered.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, max).sort((a, b) => a - b)
    .map((i) => phraseFrom(ordered[i].text, rand))
    .filter(Boolean);
}

const defaultFormatDate = (ms) => new Date(ms)
  .toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  .toLowerCase();

/**
 * The final tape's script, built only from the user's own data on the device.
 * @param {object[]} tapes
 * @param {EndingId} ending
 * @param {{ formatDate?: (ms: number) => string }} [opts]
 */
export function buildFinalTape(tapes, ending, { formatDate = defaultFormatDate } = {}) {
  const ordered = byCreation(tapes);
  const first = ordered[0];
  let mostRewound = null;
  for (const t of ordered) {
    if ((t.rewindCount ?? 0) > (mostRewound?.rewindCount ?? 0)) mostRewound = t;
  }
  const lines = [];
  if (first) {
    lines.push(formatDate(first.createdAt), 'you pressed record for the first time.');
  }
  lines.push(...pickFragments(tapes));
  lines.push(mostRewound ? `you kept coming back to "${mostRewound.label}".` : 'you never rewound a single one.');
  lines.push(...OUTRO[ending]);
  return {
    label: FINAL_LABEL,
    ending,
    title: ENDING_TITLES[ending],
    decay: ENDING_DECAY[ending],
    seed: first ? fnv1a(first.id) : 0,
    lines,
  };
}

/** How long a line stays on screen: long enough to read, never more than 6 s. */
export const lineMs = (text) => Math.min(6000, 1700 + text.length * 55);

export const PUSH_MS = 1600;
export const GAP_MS = 450;
export const POV_MS = 5200;
export const CARD_MS = 3200;
export const RETURN_MS = 900;

/**
 * Playback timeline: the camera pushes into the TV, each line plays with a
 * short gap of static before it, then the view from inside the TV, then the
 * end card, then back to the house.
 */
export function finaleTimeline(script) {
  const segs = [{ kind: 'push', ms: PUSH_MS }];
  script.lines.forEach((text, i) => {
    segs.push({ kind: 'gap', ms: GAP_MS }, { kind: 'line', text, index: i, ms: lineMs(text) });
  });
  segs.push({ kind: 'gap', ms: 600 }, { kind: 'pov', ms: POV_MS }, { kind: 'card', ms: CARD_MS }, { kind: 'return', ms: RETURN_MS });
  let t = 0;
  return segs.map((s) => {
    const out = { ...s, start: t };
    t += s.ms;
    return out;
  });
}

export function segmentAt(timeline, t) {
  return timeline.find((s) => t >= s.start && t < s.start + s.ms) ?? null;
}

export function segmentStart(timeline, kind) {
  return timeline.find((s) => s.kind === kind)?.start ?? 0;
}
