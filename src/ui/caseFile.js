// The case: three questions about what happened to her.
// Spec: .kiro/specs/mystery (Requirement 4)

import { QUESTIONS, checkAnswers } from '../systems/mystery/mystery.js';

/**
 * @param {HTMLDialogElement} dialog
 * @param {{ onSolved: () => Promise<void> | void }} opts
 */
export function createCaseFile(dialog, { onSolved }) {
  const form = dialog.querySelector('form');
  const questions = dialog.querySelector('.case-questions');
  const status = dialog.querySelector('.case-status');
  const submit = form.querySelector('[type="submit"]');
  let solved = false;

  for (const q of QUESTIONS) {
    const fs = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = q.prompt;
    fs.append(legend);
    q.options.forEach((text, i) => {
      const label = document.createElement('label');
      label.className = 'toggle';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = q.id;
      input.value = String(i);
      label.append(input, ` ${text}`);
      fs.append(label);
    });
    questions.append(fs);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (solved) return dialog.close();
    const answers = {};
    for (const q of QUESTIONS) {
      const picked = form.elements.namedItem(q.id).value;
      if (picked !== '') answers[q.id] = Number(picked);
    }
    if (Object.keys(answers).length < QUESTIONS.length) {
      status.textContent = 'answer all three.';
      return;
    }
    if (!checkAnswers(answers).ok) {
      status.textContent = "something doesn't fit. listen to her tapes again.";
      return;
    }
    solved = true;
    status.textContent = 'the static clears. the house is listening.';
    submit.textContent = 'close';
    for (const input of form.querySelectorAll('input')) input.disabled = true;
    await onSolved();
  });

  dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());

  return {
    open() {
      if (!solved) {
        status.textContent = '';
        form.reset();
      }
      dialog.showModal();
    },
    get isOpen() { return dialog.open; },
  };
}
