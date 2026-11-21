// Playing a tape: the memory shown with its damage. Words drift, colours
// bleed and static rises with decay. After a rewind it plays clean.
// The text is real DOM text, so any language, long memories, scrolling,
// zoom and screen readers all work. Spec: .kiro/specs/decay (Requirement 3)

import { driftWords } from '../systems/decay/drift.js';
import { decayStage, MAX_DECAY } from '../systems/decay/decay.js';
import { fnv1a } from '../core/hash.js';

const TRACKING = {
  clean: '',
  worn: 'TRACKING -1',
  damaged: 'TRACKING -3',
  fading: 'NO TRACKING',
};

/**
 * @param {HTMLDialogElement} dialog
 * @param {{ onClose: (info: {tapeId: string, rewound: boolean}) => void }} opts
 */
export function createPlayback(dialog, { onClose }) {
  const label = dialog.querySelector('.playback-label');
  const date = dialog.querySelector('.playback-date');
  const tracking = dialog.querySelector('.playback-tracking');
  const state = dialog.querySelector('.playback-state');
  const text = dialog.querySelector('.playback-text');
  const note = dialog.querySelector('.playback-note');
  const noise = dialog.querySelector('.playback-noise');
  const nctx = noise.getContext('2d');
  let raf = 0;
  let current = null;

  dialog.querySelector('[data-action="eject"]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    cancelAnimationFrame(raf);
    if (current) onClose(current);
    current = null;
  });

  function drawNoise(amount, t) {
    const { width: w, height: h } = noise;
    const img = nctx.createImageData(w, h);
    const band = (t * 0.00006) % 1;
    for (let y = 0; y < h; y++) {
      const inBand = Math.abs(y / h - (1 - band)) < 0.05;
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const v = Math.random() * 255;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = (inBand ? amount * 2.2 : amount) * 255 * Math.random();
      }
    }
    nctx.putImageData(img, 0, 0);
  }

  return {
    get isOpen() { return dialog.open; },

    /**
     * @param {{id:string,label:string,text:string,createdAt:number}} tape
     * @param {{ level: number, rewound: boolean, reduce: boolean }} opts
     */
    open(tape, { level, rewound, reduce }) {
      const d = rewound ? 0 : Math.max(0, Math.min(1, level / MAX_DECAY));
      const stage = rewound ? 'clean' : decayStage(level);
      current = { tapeId: tape.id, rewound };

      dialog.style.setProperty('--decay', String(d));
      dialog.classList.toggle('reduce', reduce);
      dialog.dataset.stage = stage;
      state.textContent = rewound ? 'PLAY  (rewound)' : 'PLAY';
      tracking.textContent = TRACKING[stage];
      label.textContent = tape.label;
      date.dateTime = new Date(tape.createdAt).toISOString();
      date.textContent = `recorded ${new Date(tape.createdAt).toLocaleDateString()}`;

      text.replaceChildren();
      for (const tok of driftWords(tape.text, fnv1a(tape.id), rewound ? 0 : level)) {
        if (tok.space) { text.append(tok.text); continue; }
        const span = document.createElement('span');
        span.textContent = tok.text;
        if (tok.dx || tok.dy) span.style.transform = `translate(${tok.dx.toFixed(2)}em, ${tok.dy.toFixed(2)}em)`;
        if (tok.fade) span.style.opacity = (1 - tok.fade).toFixed(2);
        text.append(span);
      }

      note.textContent = rewound
        ? 'rewound. as clear as the night you recorded it.'
        : stage === 'clean'
          ? "it's still clear. for now."
          : 'rewind it on the tv before it fades.';

      // Capped so a fully decayed tape is still partly readable (decay spec, Req. 1.3).
      const amount = 0.03 + 0.2 * d;
      if (reduce || d === 0) {
        drawNoise(d === 0 ? 0.02 : amount, 0);
      } else {
        const loop = (t) => { drawNoise(amount, t); raf = requestAnimationFrame(loop); };
        raf = requestAnimationFrame(loop);
      }

      // Focus lands on the text (autofocus), not on eject: someone still
      // holding Enter from the rewind shouldn't eject the tape instantly.
      dialog.showModal();
      text.scrollTop = 0;
    },
  };
}
