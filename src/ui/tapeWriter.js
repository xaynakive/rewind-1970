// The tape writer: a label and the memory. Spec: .kiro/specs/tapes (Req. 1)

import { MAX_LABEL, MAX_TEXT } from '../systems/tapes/model.js';

const MESSAGES = {
  empty: 'the tape is blank. say something.',
  'too-long': `this tape only holds ${MAX_TEXT} characters.`,
  failed: 'the tape jammed. try again.',
};

/**
 * @param {HTMLDialogElement} dialog
 * @param {(input: {label: string, text: string}) => Promise<{ok: boolean, reason?: string}>} onRecord
 */
export function createTapeWriter(dialog, onRecord) {
  const form = dialog.querySelector('form');
  const label = form.elements.namedItem('label');
  const text = form.elements.namedItem('text');
  const error = dialog.querySelector('.writer-error');
  const count = dialog.querySelector('.writer-count');
  const submit = form.querySelector('[type="submit"]');

  label.maxLength = MAX_LABEL;
  text.maxLength = MAX_TEXT;

  const updateCount = () => { count.textContent = `${text.value.length} / ${MAX_TEXT}`; };
  text.addEventListener('input', () => { updateCount(); error.textContent = ''; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submit.disabled = true;
    try {
      const result = await onRecord({ label: label.value, text: text.value });
      if (result.ok) dialog.close('recorded');
      else error.textContent = MESSAGES[result.reason] ?? MESSAGES.failed;
    } catch {
      error.textContent = MESSAGES.failed;
    } finally {
      submit.disabled = false;
    }
  });

  dialog.querySelector('[data-action="eject"]').addEventListener('click', () => dialog.close('ejected'));

  return {
    open() {
      form.reset();
      error.textContent = '';
      updateCount();
      dialog.showModal();
      text.focus();
    },
    get isOpen() { return dialog.open; },
  };
}
