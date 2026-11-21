// Player settings, kept in localStorage. Only settings: never memory text.

const KEY = 'rewind-1970:settings';

/** Demo mode: one minute of real time counts as one day of decay. */
export const DEMO_TIME_SCALE = 1440;

export function loadSettings() {
  const prefersReduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const defaults = { reduceFlashing: prefersReduced, sound: true, demoTime: false };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const out = { ...defaults };
    for (const k of Object.keys(defaults)) {
      if (typeof saved[k] === 'boolean') out[k] = saved[k];
    }
    return out;
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

export function timeScale(settings) {
  return settings.demoTime ? DEMO_TIME_SCALE : 1;
}
