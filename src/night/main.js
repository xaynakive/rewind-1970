// Rewind 1970: Haewol. Boot, the cold open, and the looping night.
// Spec: .kiro/specs/haewol

import { createRenderer } from '../render/renderer.js';
import { createAudio } from '../audio/audio.js';
import { loadSettings, saveSettings, brightnessToGamma, clampBrightness } from '../core/settings.js';
import { loadSave, storeSave, nextLoop } from './save.js';
import { buildVillage, VILLAGE_ITEM_IDS } from './village.js';
import { createNightScene } from './nightScene.js';
import { createNightHud } from './nightHud.js';

const $ = (sel) => document.querySelector(sel);
const stage = $('#stage');
const screen = $('#screen');
const intro = $('#intro');
const pauseDialog = $('#memory-pause');

let settings = loadSettings();
let save = loadSave();
const audio = createAudio();
const debug = new URLSearchParams(location.search).has('debug');

let r = null;
try { r = createRenderer(screen); } catch (err) { console.error(err); }
if (!r) {
  $('#no-webgl').hidden = false;
  intro.hidden = true;
  throw new Error('no WebGL');
}
const applyPicture = () => r.setPicture({ gamma: brightnessToGamma(settings.brightness), clear: settings.clearPicture });
applyPicture();
new ResizeObserver(([e]) => r.resize(e.contentRect.width, e.contentRect.height)).observe(stage);

// ----- settings in the pause menu -----
function bindSettings() {
  const f = (n) => pauseDialog.querySelector(`[name="${n}"]`);
  const sync = () => {
    f('clearPicture').checked = settings.clearPicture;
    f('reduceFlashing').checked = settings.reduceFlashing;
    f('sound').checked = settings.sound;
    f('brightness').value = String(settings.brightness);
    const found = save.taken.filter((id) => VILLAGE_ITEM_IDS.includes(id)).length;
    pauseDialog.querySelector('.nt-progress').textContent =
      `night ${save.loops + 1}. memories found: ${save.taken.filter((id) => id.startsWith('memory-')).length} of 7. things kept: ${found}.`;
  };
  const set = (patch) => { settings = { ...settings, ...patch }; saveSettings(settings); applyPicture(); audio.setEnabled(settings.sound); };
  f('clearPicture').addEventListener('change', (e) => set({ clearPicture: e.target.checked }));
  f('reduceFlashing').addEventListener('change', (e) => set({ reduceFlashing: e.target.checked }));
  f('sound').addEventListener('change', (e) => set({ sound: e.target.checked }));
  f('brightness').addEventListener('input', (e) => set({ brightness: clampBrightness(Number(e.target.value)) }));
  return sync;
}
const syncSettings = bindSettings();
pauseDialog.addEventListener('toggle', () => { if (pauseDialog.open) syncSettings(); });
// memoryHud opens the dialog with showModal; the toggle event isn't everywhere yet.
const origShow = pauseDialog.showModal.bind(pauseDialog);
pauseDialog.showModal = () => { syncSettings(); origShow(); };

// ----- the night -----
let night = null;
const hud = createNightHud($('#memory-hud'), { pause: pauseDialog, notes: $('#memory-notes') }, {
  onUse: () => night?.use(),
  onLight: () => night?.toggleLight(),
  onLens: (on) => night?.setLens(on),
  onResume: () => {},
  onLeave: () => night?.leave(),
  onStoryMode: (on) => { settings = { ...settings, storyMode: on }; saveSettings(settings); },
});

function startNight() {
  hud.resetLensButton();
  hud.show();
  audio.setRain(1);
  audio.tapeStart();
  night = createNightScene({
    r, audio, hud, stage,
    level: buildVillage(),
    save,
    settings: () => settings,
    onSave: (s) => { save = s; storeSave(save); },
    onRewind: ({ save: s }) => {
      save = nextLoop(s);
      storeSave(save);
      startNight();
    },
    onExit: () => {
      night = null;
      hud.hide();
      showIntro(true);
    },
  });
}

// ----- the cold open -----
const INTRO_LINES = [
  'present day. a house swallowed by a hillside, under forty years of damp and dust.',
  'on a table: a camcorder. inside it, one tape.',
  "the label is in a child's handwriting. 10·31·1970.",
  'that was years before anyone could have filmed this.',
];
let introTimers = [];
function showIntro(again = false) {
  intro.hidden = false;
  const lines = intro.querySelector('.nt-intro-lines');
  lines.replaceChildren();
  introTimers.forEach(clearTimeout);
  const play = intro.querySelector('[data-intro="play"]');
  const skip = intro.querySelector('[data-intro="skip"]');
  play.hidden = true;
  skip.hidden = !(save.introSeen || again);
  const reduce = settings.reduceFlashing;
  INTRO_LINES.forEach((t, i) => introTimers.push(setTimeout(() => {
    const p = document.createElement('p');
    p.textContent = t;
    lines.append(p);
    if (i === INTRO_LINES.length - 1) { play.hidden = false; play.focus(); }
  }, again ? 0 : (reduce ? 300 : 1400) * i + 600)));
  if (again) { play.hidden = false; play.textContent = 'press play again'; }
}
function pressPlay() {
  introTimers.forEach(clearTimeout);
  audio.start();
  audio.setEnabled(settings.sound);
  intro.hidden = true;
  save = { ...save, introSeen: true };
  storeSave(save);
  startNight();
}
intro.querySelector('[data-intro="play"]').addEventListener('click', pressPlay);
intro.querySelector('[data-intro="skip"]').addEventListener('click', pressPlay);

// Behind the cold open: a dark tape of static.
const blank = document.createElement('canvas');
blank.width = 320; blank.height = 240;
const bctx = blank.getContext('2d');
bctx.fillStyle = '#0b0a0e';
bctx.fillRect(0, 0, 320, 240);
r.uploadCanvas(blank);

let last = performance.now();
function frame(now) {
  const dt = Math.min(100, now - last);
  last = now;
  if (night) night.frame(now, dt);
  else r.present({ source: 'canvas', time: now / 1000, tracking: 0.4, bleed: 0.9, noise: 0.12, glitch: 0, fade: 1, reduce: settings.reduceFlashing });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
showIntro();

if (debug) {
  window.nightDebug = {
    night: () => night,
    save: () => save,
    reset: () => { localStorage.removeItem('rewind-1970:haewol'); location.reload(); },
  };
}
