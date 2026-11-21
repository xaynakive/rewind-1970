// Selectable objects are real <button>s positioned over the 3D object each
// frame. That gives click, tap, keyboard focus and screen-reader labels
// without ray casting.

import { transformPoint } from '../../render/math.js';

export function createHotspotLayer(container, hotspots, onSelect) {
  const items = hotspots.map((h, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hotspot';
    button.dataset.id = h.id;
    button.setAttribute('aria-label', h.label);
    // Earlier hotspots stack on top, so list small objects before large ones.
    button.style.zIndex = String(hotspots.length - i);
    const tag = document.createElement('span');
    tag.className = 'hotspot-label';
    tag.textContent = h.label;
    button.append(tag);
    button.addEventListener('click', () => onSelect(h.id));
    container.append(button);
    return { h, button, corners: corners(h.min, h.max) };
  });

  return {
    setEnabled(on) {
      container.hidden = !on;
    },
    update(viewProj, width, height) {
      for (const { button, corners: cs } of items) {
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
