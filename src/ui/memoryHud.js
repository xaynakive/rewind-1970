// What sits over the picture inside a memory: the aim dot, the prompt, story
// lines, the inspect caption, the inventory, touch controls, the pause menu and
// the notes book. All DOM text: large, any language, readable by screen readers.
// Spec: .kiro/specs/memories (Requirements 2.2, 3.1, 3.5, 4.4)

/**
 * @param {HTMLElement} root  #memory-hud
 * @param {{ pause: HTMLDialogElement, notes: HTMLDialogElement }} dialogs
 * @param {{ onUse: () => void, onLight: () => void, onResume: () => void, onLeave: () => void,
 *   onStoryMode: (on: boolean) => void }} handlers
 */
export function createMemoryHud(root, dialogs, handlers) {
  const $ = (sel) => root.querySelector(sel);
  const prompt = $('.mem-prompt');
  const line = $('.mem-line');
  const caption = $('.mem-caption');
  const captionName = caption.querySelector('.mem-caption-name');
  const captionText = caption.querySelector('.mem-caption-text');
  const captionHelp = caption.querySelector('.mem-caption-help');
  const inventory = $('.mem-inventory');
  const help = $('.mem-help');
  const touch = $('.mem-touch');
  const crosshair = $('.mem-crosshair');
  const notesList = dialogs.notes.querySelector('.mem-notes-list');
  const storyToggle = dialogs.pause.querySelector('[name="memStory"]');

  let lineTimer = 0;
  let helpTimer = 0;
  const isTouch = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
  /** @type {{ name: string, text: string }[]} */
  let notes = [];

  const tap = (sel, fn) => root.querySelector(sel)?.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  tap('[data-mem="use"]', () => handlers.onUse());
  tap('[data-mem="light"]', () => handlers.onLight());
  tap('[data-mem="notes"]', () => openNotes());
  tap('[data-mem="pause"]', () => openPause());
  dialogs.pause.querySelector('[data-action="resume"]').addEventListener('click', () => dialogs.pause.close());
  dialogs.pause.querySelector('[data-action="notes"]').addEventListener('click', () => { dialogs.pause.close(); openNotes(); });
  dialogs.pause.querySelector('[data-action="leave"]').addEventListener('click', () => { dialogs.pause.close(); handlers.onLeave(); });
  dialogs.pause.addEventListener('close', () => handlers.onResume());
  dialogs.notes.querySelector('[data-action="close"]').addEventListener('click', () => dialogs.notes.close());
  dialogs.notes.addEventListener('close', () => handlers.onResume());
  storyToggle.addEventListener('change', () => handlers.onStoryMode(storyToggle.checked));

  function openPause(storyMode) {
    if (typeof storyMode === 'boolean') storyToggle.checked = storyMode;
    if (!dialogs.pause.open) dialogs.pause.showModal();
  }

  function openNotes() {
    notesList.replaceChildren();
    if (notes.length === 0) {
      const li = document.createElement('li');
      li.className = 'reader-empty';
      li.textContent = 'no notes yet. she hid them where she would have to look.';
      notesList.append(li);
    }
    for (const n of notes) {
      const li = document.createElement('li');
      const h = document.createElement('h3');
      h.textContent = n.name;
      const p = document.createElement('p');
      p.className = 'reader-text';
      p.textContent = n.text;
      li.append(h, p);
      notesList.append(li);
    }
    if (!dialogs.notes.open) dialogs.notes.showModal();
  }

  return {
    get isTouch() { return isTouch; },
    get dialogOpen() { return dialogs.pause.open || dialogs.notes.open; },

    show() {
      root.hidden = false;
      touch.hidden = !isTouch;
      help.textContent = isTouch
        ? 'drag on the left to walk, on the right to look. tap use when something is named.'
        : 'click to look around. W A S D or arrows to walk, E to use, L for the light, shift to sneak, tab for notes, esc to pause.';
      help.classList.add('visible');
      clearTimeout(helpTimer);
      helpTimer = setTimeout(() => help.classList.remove('visible'), 9000);
    },
    hide() {
      root.hidden = true;
      clearTimeout(helpTimer);
      help.classList.remove('visible');
      if (dialogs.pause.open) dialogs.pause.close();
      if (dialogs.notes.open) dialogs.notes.close();
    },

    /** The action for what's in front of you, or nothing. */
    setPrompt(text) {
      const t = text ?? '';
      if (prompt.textContent !== t) prompt.textContent = t;
      prompt.classList.toggle('visible', t !== '');
      crosshair.classList.toggle('active', t !== '');
    },

    /** A story line in the middle of the screen, read out by screen readers. */
    say(text, ms = 4500) {
      line.textContent = text;
      line.classList.add('visible');
      clearTimeout(lineTimer);
      if (ms > 0) lineTimer = setTimeout(() => line.classList.remove('visible'), ms);
    },
    clearLine() {
      clearTimeout(lineTimer);
      line.classList.remove('visible');
    },

    showCaption(name, text, keep) {
      captionName.textContent = name;
      captionText.textContent = text;
      captionHelp.textContent = isTouch
        ? `drag to turn it. pinch to zoom. tap ${keep} to keep it.`
        : `drag or arrow keys to turn it. scroll or + − to zoom. E to ${keep}.`;
      caption.hidden = false;
      clearTimeout(lineTimer);
      line.classList.remove('visible');
      help.classList.remove('visible');
      crosshair.hidden = true;
      inventory.hidden = true;
      prompt.classList.remove('visible');
    },
    hideCaption() {
      caption.hidden = true;
      crosshair.hidden = false;
      inventory.hidden = false;
    },

    setHiding(on) {
      root.classList.toggle('hiding', on);
    },

    setInventory(names) {
      inventory.replaceChildren(...names.map((n) => {
        const li = document.createElement('li');
        li.textContent = n;
        return li;
      }));
    },
    setNotes(list) { notes = list; },

    openPause,
    openNotes,
  };
}
