// Tape data model and validation. Pure: no DOM, no storage.
// Spec: .kiro/specs/tapes (Requirement 1)

export const MAX_TEXT = 4000;
export const MAX_LABEL = 24;

/**
 * @typedef {Object} Tape
 * @property {string} id
 * @property {string} label
 * @property {string} text
 * @property {number} createdAt
 * @property {number} lastViewedAt
 * @property {string} spot
 * @property {boolean} found
 * @property {number} rewindCount
 */

/**
 * @param {{ text: string, label?: string }} input
 * @param {{ id: string, now: number, spot: string }} ctx
 * @returns {{ ok: true, tape: Tape } | { ok: false, reason: 'empty' | 'too-long' }}
 */
export function createTape(input, ctx) {
  const text = String(input.text ?? '');
  if (text.trim() === '') return { ok: false, reason: 'empty' };
  if (text.length > MAX_TEXT) return { ok: false, reason: 'too-long' };

  return {
    ok: true,
    tape: {
      id: ctx.id,
      label: defaultLabel(input.label, text),
      text,
      createdAt: ctx.now,
      lastViewedAt: ctx.now,
      spot: ctx.spot,
      found: false,
      rewindCount: 0,
    },
  };
}

export function defaultLabel(label, text) {
  const own = String(label ?? '').trim();
  const source = own !== '' ? own : text.trim().replace(/\s+/g, ' ');
  return source.slice(0, MAX_LABEL);
}
