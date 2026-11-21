// Exit arrows at the edges of the screen, one per way out of the current
// viewpoint, labelled with where it leads. Keys: W/A/S/D or the arrow keys.
// Spec: .kiro/specs/house (Requirement 1)

const ORDER = ['forward', 'left', 'right', 'back'];

/**
 * @param {HTMLElement} container
 * @param {(direction: string) => void} onGo
 */
export function createNavArrows(container, onGo) {
  const buttons = new Map();
  for (const dir of ORDER) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `nav-arrow nav-${dir}`;
    b.dataset.dir = dir;
    const arrow = document.createElement('span');
    arrow.className = 'nav-shape';
    arrow.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'nav-label';
    b.append(arrow, label);
    b.addEventListener('click', () => onGo(dir));
    b.addEventListener('pointerdown', (e) => e.stopPropagation()); // don't start a look-drag
    container.append(b);
    buttons.set(dir, { b, label });
  }

  return {
    /** @param {Record<string, string>} exits direction -> place name (missing = no exit) */
    show(exits) {
      container.hidden = false;
      for (const [dir, { b, label }] of buttons) {
        const place = exits[dir];
        b.hidden = !place;
        if (place) {
          label.textContent = place;
          b.setAttribute('aria-label', `go to ${place}`);
        }
      }
    },
    hide() {
      container.hidden = true;
    },
  };
}
