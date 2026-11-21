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
 *   listHouseTapes?: () => object[],
 *   caseAvailable?: () => boolean,
 *   openCase?: () => void,
 * }} opts
 */
export function createSettingsPanel(dialog, {
  settings, onChange, listTapes, deleteAll, writeTape,
  listHouseTapes = () => [], caseAvailable = () => false, openCase = () => {},
}) {
  const reduce = dialog.querySelector('[name="reduceFlashing"]');
  const sound = dialog.querySelector('[name="sound"]');
  const demo = dialog.querySelector('[name="demoTime"]');
  const brightness = dialog.querySelector('[name="brightness"]');
  const clear = dialog.querySelector('[name="clearPicture"]');
  const story = dialog.querySelector('[name="storyMode"]');
  const list = dialog.querySelector('.reader-list');
  const houseList = dialog.querySelector('.house-list');
  const houseHeading = dialog.querySelector('.house-heading');
  const caseButton = dialog.querySelector('[data-action="case"]');
  const status = dialog.querySelector('.settings-status');

  // Live while dragging, so you can see the room brighten behind the panel.
  brightness.addEventListener('input', () => onChange({ ...settings, brightness: Number(brightness.value) }));
  clear.addEventListener('change', () => onChange({ ...settings, clearPicture: clear.checked }));
  reduce.addEventListener('change', () => onChange({ ...settings, reduceFlashing: reduce.checked }));
  sound.addEventListener('change', () => onChange({ ...settings, sound: sound.checked }));
  demo.addEventListener('change', () => onChange({ ...settings, demoTime: demo.checked }));
  story.addEventListener('change', () => onChange({ ...settings, storyMode: story.checked }));

  dialog.querySelector('[data-action="close"]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-action="write"]').addEventListener('click', () => {
    dialog.close();
    writeTape();
  });

  caseButton.addEventListener('click', () => {
    dialog.close();
    openCase();
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

  function tapeItem(t) {
    const li = document.createElement('li');
    const head = document.createElement('p');
    head.className = 'reader-label';
    head.textContent = t.label;
    const date = document.createElement('time');
    date.dateTime = new Date(t.createdAt).toISOString();
    date.textContent = t.house ? new Date(t.createdAt).toLocaleDateString() : new Date(t.createdAt).toLocaleString();
    const body = document.createElement('p');
    body.className = 'reader-text';
    body.textContent = t.text; // original text: never decayed here
    li.append(head, date, body);
    return li;
  }

  function renderHouse() {
    const found = listHouseTapes();
    houseHeading.hidden = houseList.hidden = found.length === 0;
    houseList.replaceChildren(...found.map(tapeItem));
    caseButton.hidden = !caseAvailable();
  }

  async function renderList() {
    renderHouse();
    const tapes = await listTapes();
    list.replaceChildren();
    if (tapes.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'reader-empty';
      empty.textContent = 'no tapes yet.';
      list.append(empty);
      return;
    }
    for (const t of tapes) list.append(tapeItem(t));
  }

  return {
    async open() {
      reduce.checked = settings.reduceFlashing;
      sound.checked = settings.sound;
      demo.checked = settings.demoTime;
      story.checked = settings.storyMode;
      brightness.value = String(settings.brightness);
      clear.checked = settings.clearPicture;
      status.textContent = '';
      await renderList();
      dialog.showModal();
    },
    update(next) { settings = next; },
    get isOpen() { return dialog.open; },
  };
}
