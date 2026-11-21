// Settings, plus the text-only tape reader and data controls.
// Spec: .kiro/specs/tapes (Req. 5, 6.4), steering/art-style.md (Accessibility)

/**
 * @param {HTMLDialogElement} dialog
 * @param {{
 *   settings: {reduceFlashing: boolean, sound: boolean},
 *   onChange: (s: object) => void,
 *   listTapes: () => Promise<object[]>,
 *   deleteAll: () => Promise<void>,
 *   writeTape: () => void,
 * }} opts
 */
export function createSettingsPanel(dialog, { settings, onChange, listTapes, deleteAll, writeTape }) {
  const reduce = dialog.querySelector('[name="reduceFlashing"]');
  const sound = dialog.querySelector('[name="sound"]');
  const list = dialog.querySelector('.reader-list');
  const status = dialog.querySelector('.settings-status');

  reduce.addEventListener('change', () => onChange({ ...settings, reduceFlashing: reduce.checked }));
  sound.addEventListener('change', () => onChange({ ...settings, sound: sound.checked }));

  dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-action="write"]').addEventListener('click', () => {
    dialog.close();
    writeTape();
  });

  dialog.querySelector('[data-action="export"]').addEventListener('click', async () => {
    const tapes = await listTapes();
    const blob = new Blob([JSON.stringify({ app: 'rewind-1970', version: 1, tapes }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'rewind-1970-tapes.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    status.textContent = `exported ${tapes.length} tape${tapes.length === 1 ? '' : 's'}.`;
  });

  dialog.querySelector('[data-action="delete"]').addEventListener('click', async () => {
    if (!window.confirm('Erase every tape in the house? This cannot be undone.')) return;
    await deleteAll();
    status.textContent = 'every tape has been erased.';
    await renderList();
  });

  async function renderList() {
    const tapes = await listTapes();
    list.replaceChildren();
    if (tapes.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'reader-empty';
      empty.textContent = 'no tapes yet.';
      list.append(empty);
      return;
    }
    for (const t of tapes) {
      const li = document.createElement('li');
      const head = document.createElement('p');
      head.className = 'reader-label';
      head.textContent = t.label;
      const date = document.createElement('time');
      date.dateTime = new Date(t.createdAt).toISOString();
      date.textContent = new Date(t.createdAt).toLocaleString();
      const body = document.createElement('p');
      body.className = 'reader-text';
      body.textContent = t.text; // original text: never decayed here
      li.append(head, date, body);
      list.append(li);
    }
  }

  return {
    async open() {
      reduce.checked = settings.reduceFlashing;
      sound.checked = settings.sound;
      status.textContent = '';
      await renderList();
      dialog.showModal();
    },
    update(next) { settings = next; },
    get isOpen() { return dialog.open; },
  };
}
