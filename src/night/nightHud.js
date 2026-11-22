// The memory HUD, plus what this game adds. The system looks like a phone (it is
// Byeol's, and she fell asleep holding it): the island with the night's clock,
// notifications for the name, a dock for what you carry, a lock screen for
// pause. Over it, film title cards. All DOM text.
// Spec: .kiro/specs/haewol (Requirements 4.1, 7.1, 8.1, 10.4, 11; design "The look")

import { createMemoryHud } from '../ui/memoryHud.js';
import { clockShort } from './loop.js';


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
  const choiceFrom = $('.nt-choice-from');
  const choiceText = $('.nt-choice-text');
  const choiceButtons = $('.nt-choice-buttons');
  const flash = $('.nt-flashback');
  const flashLine = $('.nt-flashback-line');
  const lensBtn = $('[data-mem="lens"]');
  const help = $('.mem-help');
  const inventory = $('.mem-inventory');
  const island = $('.nt-island');
  const islandTime = $('.nt-island-time');
  const islandBattery = $('.nt-island-battery');
  const card = $('.nt-card');
  const cardTitle = $('.nt-card-title');
  const cardSub = $('.nt-card-sub');
  const lockTime = dialogs.pause.querySelector('.nt-lock-time');
  const hotbarEl = $('.nt-hotbar');
  const hotbarName = $('.nt-hotbar-name');
  const dropBtn = $('[data-mem="drop"]');
  const throwBtn = $('[data-mem="throw"]');
  const tapBtn = (b, fn) => b?.addEventListener('click', (e) => { e.stopPropagation(); fn(); });
  tapBtn(dropBtn, () => handlers.onDrop?.());
  tapBtn(throwBtn, () => handlers.onThrow?.());
  tapBtn($('[data-mem="hum"]'), () => handlers.onHum?.());
  let nameTimer = 0;
  let lastHeld = null;
  let keptCount = 0, heldCount = 0;
  const syncDock = () => root.classList.toggle('dock-empty', keptCount === 0 && heldCount === 0);

  let lensHeld = false;
  if (lensBtn) {
    // On touch, the lens button toggles (holding a button while dragging to look is hard).
    lensBtn.addEventListener('click', (e) => { e.stopPropagation(); lensHeld = !lensHeld; handlers.onLens(lensHeld); });
  }

  let asking = null;
  let clockText = '';
  let threat = -1;
  let cardTimer = 0;

  return {
    ...base,
    get dialogOpen() { return base.dialogOpen; },
    get isTouch() { return base.isTouch; },
    get asking() { return asking !== null; },

    show() {
      base.show();
      help.textContent = base.isTouch
        ? 'drag on the left to walk, on the right to look. tap use when something is named. lens raises the camcorder. hum sings what you know of her song.'
        : 'click to look around. W A S D to walk, E to use or pick up, 1-9 or the wheel to choose, Q to drop, F to throw, H to hum. hold C or the right mouse button for the camcorder, L for the candle, shift to sneak, tab for notes, esc to pause.';
    },

    /** The viewfinder: REC, the battery, a frame. `level` 0..100. */
    setLens(on, level) {
      finder.hidden = !on;
      root.classList.toggle('recording', on);
      island.classList.toggle('rec', on);
      document.body.classList.toggle('nt-rec', on);
      const pct = Math.round(level);
      battery.style.width = `${pct}%`;
      battery.classList.toggle('low', pct < 20);
      const t = `battery ${pct}%`;
      if (batteryText.textContent !== t) batteryText.textContent = t;
      const it = on ? `${pct}%` : '';
      if (islandBattery.textContent !== it) islandBattery.textContent = it;
    },
    resetLensButton() { lensHeld = false; },

    /** The night's clock, on the island and the lock screen. */
    setClock(sec) {
      const t = clockShort(sec);
      if (t === clockText) return;
      clockText = t;
      islandTime.textContent = t;
      if (lockTime) lockTime.textContent = t;
    },

    /** 0 nothing, 1 she is near, 2 she is hunting you: a red dot on the island, like a phone's mic light. */
    setThreat(level) {
      if (level === threat) return;
      threat = level;
      island.classList.toggle('near', level === 1);
      island.classList.toggle('hunt', level === 2);
    },

    /** What you carry, as a dock of icons. Accepts names or { name, kind }. */
    setInventory(list) {
      inventory.replaceChildren(...list.map((x) => {
        const { name, kind } = typeof x === 'string' ? { name: x, kind: '' } : x;
        const li = document.createElement('li');
        const icon = document.createElement('span');
        icon.className = `nt-dock-icon ${kind}`;
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'nt-dock-label';
        label.textContent = name;
        li.append(icon, label);
        return li;
      }));
      keptCount = list.length;
      syncDock();
    },

    /** The hotbar: nine slots of loose things, `selected` is the one in your hand. */
    setHotbar(slots, selected) {
      heldCount = slots.filter(Boolean).length;
      root.classList.toggle('has-hotbar', heldCount > 0);
      hotbarEl.replaceChildren(...slots.map((s, i) => {
        const li = document.createElement('li');
        li.className = `nt-slot${s ? ` ${s.kind}` : ' empty'}${i === selected ? ' sel' : ''}`;
        const n = document.createElement('span');
        n.className = 'nt-slot-n';
        n.textContent = String(i + 1);
        n.setAttribute('aria-hidden', 'true');
        const label = document.createElement('span');
        label.className = 'sr-only';
        label.textContent = s ? `${i + 1}: ${s.name}${i === selected ? ', in your hand' : ''}` : `${i + 1}: empty`;
        li.append(n, label);
        li.addEventListener('click', (e) => { e.stopPropagation(); handlers.onSlot?.(i); });
        return li;
      }));
      const inHand = slots[selected];
      if (dropBtn) { dropBtn.hidden = !inHand; throwBtn.hidden = !inHand; }
      const nm = inHand ? inHand.name : '';
      if (nm !== lastHeld) {
        lastHeld = nm;
        hotbarName.textContent = nm;
        hotbarName.classList.toggle('visible', nm !== '');
        clearTimeout(nameTimer);
        nameTimer = setTimeout(() => hotbarName.classList.remove('visible'), 1800);
      }
      syncDock();
    },

    showCaption(...a) { root.classList.add('inspecting'); base.showCaption(...a); },
    hideCaption() { root.classList.remove('inspecting'); base.hideCaption(); },

    /** A film title card: white words on black, fading in and out. */
    titleCard(title, sub = '', ms = 4200) {
      cardTitle.textContent = title;
      cardSub.textContent = sub;
      card.hidden = false;
      card.classList.remove('out');
      // restart the fade
      void card.offsetWidth;
      card.classList.add('in');
      clearTimeout(cardTimer);
      cardTimer = setTimeout(() => {
        card.classList.add('out');
        cardTimer = setTimeout(() => { card.hidden = true; card.classList.remove('in', 'out'); }, 1400);
      }, ms);
    },

    /** A notification with buttons. Resolves with the chosen option's index. */
    ask(text, options, { from = 'haewol' } = {}) {
      choiceFrom.textContent = from;
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
