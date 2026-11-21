// Selectable objects are real <button>s positioned over the 3D object each
// frame. That gives click, tap, keyboard focus and screen-reader labels
// without ray casting. Hotspots can be pressed and held (for rewinding).

import { transformPoint } from '../../render/math.js';

/**
 * @param {HTMLElement} container
 * @param {{
 *   onSelect: (id: string) => void,
 *   onPress?: (id: string) => void,
 *   onRelease?: (id: string) => void,
 * }} handlers
 */
export function createHotspotLayer(container, { onSelect, onPress, onRelease }) {
  /** @type {Map<string, {h: object, button: HTMLButtonElement, tag: HTMLElement, corners: number[][]}>} */
  const items = new Map();

  function make(h) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hotspot';
    button.dataset.id = h.id;
    const tag = document.createElement('span');
    tag.className = 'hotspot-label';
    button.append(tag);

    let pressed = false;
    const press = () => { if (!pressed) { pressed = true; onPress?.(h.id); } };
    const release = () => { if (pressed) { pressed = false; onRelease?.(h.id); } };

    button.addEventListener('click', (e) => onSelect(h.id, e));
    button.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      // Keep the pointer on this button while held, and don't start a look-drag.
      button.setPointerCapture?.(e.pointerId);
      e.stopPropagation();
      press();
    });
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', release);
    button.addEventListener('keydown', (e) => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) press();
    });
    button.addEventListener('keyup', (e) => {
      if (e.key === ' ' || e.key === 'Enter') release();
    });
    button.addEventListener('blur', release);
    button.addEventListener('contextmenu', (e) => e.preventDefault());

    container.append(button);
    return { h, button, tag, corners: [] };
  }

  return {
    /** Replaces the hotspot list. Earlier entries stack on top: list small objects first. */
    set(list) {
      const keep = new Set(list.map((h) => h.id));
      for (const [id, item] of items) {
        if (!keep.has(id)) { item.button.remove(); items.delete(id); }
      }
      list.forEach((h, i) => {
        const item = items.get(h.id) ?? make(h);
        item.h = h;
        item.corners = corners(h.min, h.max);
        item.button.setAttribute('aria-label', h.label);
        item.tag.textContent = h.tag ?? h.label;
        // Quiet hotspots (the water) show no box or label on hover; keyboard focus still shows.
        item.button.classList.toggle('quiet', Boolean(h.quiet));
        item.button.style.zIndex = String(list.length - i);
        items.set(h.id, item);
      });
    },
    setEnabled(on) {
      container.hidden = !on;
    },
    update(viewProj, width, height) {
      for (const { button, corners: cs } of items.values()) {
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        let behind = false;
        for (const c of cs) {
          const [x, y, , w] = transformPoint(viewProj, c);
          if (w <= 0.05) { behind = true; break; }
          const sx = ((x / w) * 0.5 + 0.5) * width;
          const sy = (1 - ((y / w) * 0.5 + 0.5)) * height;
          x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
          y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
        }
        const offscreen = behind || x1 < 0 || y1 < 0 || x0 > width || y0 > height;
        button.style.display = offscreen ? 'none' : '';
        if (offscreen) continue;
        button.style.transform = `translate(${x0}px, ${y0}px)`;
        button.style.width = `${x1 - x0}px`;
        button.style.height = `${y1 - y0}px`;
      }
    },
  };
}

function corners(min, max) {
  const out = [];
  for (const x of [min[0], max[0]]) for (const y of [min[1], max[1]]) for (const z of [min[2], max[2]]) out.push([x, y, z]);
  return out;
}
