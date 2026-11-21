// Player settings, kept in localStorage. Only settings: never memory text.

const KEY = 'rewind-1970:settings';

/** Demo mode: one minute of real time counts as one day of decay. */
export const DEMO_TIME_SCALE = 1440;

/** Brightness slider: 0 (moody) .. 100 (bright). The default leans bright. */
export const BRIGHTNESS_DEFAULT = 60;

export function loadSettings() {
  const prefersReduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const prefersContrast = globalThis.matchMedia?.('(prefers-contrast: more)').matches ?? false;
  const defaults = {
    reduceFlashing: prefersReduced,
    sound: true,
    demoTime: false,
    clearPicture: prefersContrast,
    brightness: prefersContrast ? 85 : BRIGHTNESS_DEFAULT,
    // Memories: the presence never chases (spec: memories, Requirement 5.6).
    storyMode: false,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    const out = { ...defaults };
    for (const k of Object.keys(defaults)) {
      if (typeof saved[k] === typeof defaults[k]) out[k] = saved[k];
    }
    out.brightness = clampBrightness(out.brightness);
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

export function clampBrightness(b) {
  return Number.isFinite(b) ? Math.min(100, Math.max(0, Math.round(b))) : BRIGHTNESS_DEFAULT;
}

/** Brightness 0..100 -> display gamma 1.2 (moody) .. 2.6 (shadows lifted a lot). */
export function brightnessToGamma(b) {
  return 1.2 + (clampBrightness(b) / 100) * 1.4;
}
