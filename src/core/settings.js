// Player settings, kept in localStorage. Only settings: never memory text.

const KEY = 'rewind-1970:settings';

export function loadSettings() {
  const prefersReduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const defaults = { reduceFlashing: prefersReduced, sound: true };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return {
      reduceFlashing: typeof saved.reduceFlashing === 'boolean' ? saved.reduceFlashing : defaults.reduceFlashing,
      sound: typeof saved.sound === 'boolean' ? saved.sound : defaults.sound,
    };
  } catch {
    return defaults;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Storage may be blocked; settings then last for this visit only.
  }
}
