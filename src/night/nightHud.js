// The memory HUD, plus what this game adds: the camcorder's viewfinder and
// battery, the name choice, and flashbacks. All DOM text.
// Spec: .kiro/specs/haewol (Requirements 4.1, 8.1, 7.1, 10.4)

import { createMemoryHud } from '../ui/memoryHud.js';

/**
 * @param {HTMLElement} root  #memory-hud
 * @param {{ pause: HTMLDialogElement, notes: HTMLDialogElement }} dialogs
 * @param {object} handlers  memoryHud handlers, plus onLens(on)
 */
export function createNightHud(root, dialogs, handlers) {
  const base = createMemoryHud(root, dialogs, handlers);
  const $ = (sel) => root.querySelector(sel);
  const finder = $('.nt-finder');
  const battery = $('.nt-battery-level');
  const batteryText = $('.nt-battery-text');
  const choice = $('.nt-choice');
  const choiceText = $('.nt-choice-text');
  const choiceButtons = $('.nt-choice-buttons');
  const flash = $('.nt-flashback');
  const flashLine = $('.nt-flashback-line');
  const lensBtn = $('[data-mem="lens"]');
  const help = $('.mem-help');

  let lensHeld = false;
  if (lensBtn) {
    // On touch, the lens button toggles (holding a button while dragging to look is hard).
    lensBtn.addEventListener('click', (e) => { e.stopPropagation(); lensHeld = !lensHeld; handlers.onLens(lensHeld); });
  }

  let asking = null;

  return {
    ...base,
    get dialogOpen() { return base.dialogOpen; },
    get isTouch() { return base.isTouch; },
    get asking() { return asking !== null; },

    show() {
      base.show();
      help.textContent = base.isTouch
        ? 'drag on the left to walk, on the right to look. tap use when something is named. lens raises the camcorder.'
        : 'click to look around. W A S D or arrows to walk, E to use, hold C or the right mouse button for the camcorder, L for the candle, shift to sneak, tab for notes, esc to pause.';
    },

    /** The viewfinder: REC, the battery, a frame. `level` 0..100. */
    setLens(on, level) {
      finder.hidden = !on;
      root.classList.toggle('recording', on);
      const pct = Math.round(level);
      battery.style.width = `${pct}%`;
      battery.classList.toggle('low', pct < 20);
      const t = `battery ${pct}%`;
      if (batteryText.textContent !== t) batteryText.textContent = t;
    },
    resetLensButton() { lensHeld = false; },

    /** A question with buttons. Resolves with the chosen option's index. */
    ask(text, options) {
      choiceText.textContent = text;
      choiceButtons.replaceChildren();
      choice.hidden = false;
      root.classList.add('choosing');
      return new Promise((resolve) => {
        asking = resolve;
        options.forEach((label, i) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = label;
          b.addEventListener('click', (e) => {
            e.stopPropagation();
            choice.hidden = true;
            root.classList.remove('choosing');
            asking = null;
            resolve(i);
          });
          choiceButtons.append(b);
        });
        requestAnimationFrame(() => choiceButtons.querySelector('button')?.focus());
      });
    },

    /** A flashback line over the damaged picture; null ends it. */
    setFlashback(text) {
      flash.hidden = text === null;
      root.classList.toggle('flashback', text !== null);
      if (text !== null && flashLine.textContent !== text) flashLine.textContent = text;
    },
  };
}
