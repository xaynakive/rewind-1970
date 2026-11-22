// Rewind 1970: Haewol. Boot, the cold open, and the looping night.
// Spec: .kiro/specs/haewol

import { createRenderer } from '../render/renderer.js';
import { createAudio } from '../audio/audio.js';
import { loadSettings, saveSettings, brightnessToGamma, clampBrightness } from '../core/settings.js';
import { loadSave, storeSave, nextLoop } from './save.js';
import { nightTitle } from './loop.js';
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

// ----- the film look: grain and widescreen bars (Haewol only, so kept apart from the shared settings) -----
const VIEW_KEY = 'rewind-1970:haewol-view';
let view = { filmBars: true };
try { view = { ...view, ...JSON.parse(localStorage.getItem(VIEW_KEY) ?? '{}') }; } catch { /* keep the default */ }
const applyView = () => {
  document.body.classList.toggle('no-bars', !view.filmBars);
  document.body.classList.toggle('reduce-flashing', settings.reduceFlashing);
};
applyView();
{
  // A tile of soft grain, made once.
  const g = document.createElement('canvas');
  g.width = g.height = 160;
  const gx = g.getContext('2d');
  const img = gx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.random() * 255;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  gx.putImageData(img, 0, 0);
  $('.nt-grain').style.backgroundImage = `url(${g.toDataURL()})`;
}

// ----- settings in the pause menu -----
function bindSettings() {
  const f = (n) => pauseDialog.querySelector(`[name="${n}"]`);
  const sync = () => {
    f('filmBars').checked = view.filmBars;
    f('clearPicture').checked = settings.clearPicture;
    f('reduceFlashing').checked = settings.reduceFlashing;
    f('sound').checked = settings.sound;
    f('brightness').value = String(settings.brightness);
    const found = save.taken.filter((id) => VILLAGE_ITEM_IDS.includes(id)).length;
    pauseDialog.querySelector('.nt-progress').textContent =
      `night ${save.loops + 1}. memories found: ${save.taken.filter((id) => id.startsWith('memory-')).length} of 7. things kept: ${found}.`;
  };
  const set = (patch) => { settings = { ...settings, ...patch }; saveSettings(settings); applyPicture(); applyView(); audio.setEnabled(settings.sound); };
  f('filmBars').addEventListener('change', (e) => {
    view = { ...view, filmBars: e.target.checked };
    try { localStorage.setItem(VIEW_KEY, JSON.stringify(view)); } catch { /* still applies this session */ }
    applyView();
  });
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
  onSlot: (i) => night?.select(i),
  onDrop: () => night?.drop(),
  onThrow: () => night?.throwHeld(),
  onHum: () => night?.hum(),
  onResume: () => {},
  onLeave: () => night?.leave(),
  onStoryMode: (on) => { settings = { ...settings, storyMode: on }; saveSettings(settings); },
});

function startNight() {
  hud.resetLensButton();
  hud.show();
  if (save.loops === 0) hud.titleCard('Haewol', nightTitle(0));
  else hud.titleCard(nightTitle(save.loops));
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
// Byeol falls asleep. Everything after this is her dream.
const INTRO_LINES = [
  'byeol. 11:58 pm. the lamp is still on.',
  'your phone is warm in your hand. one more video. one more message. one more thing to keep up with.',
  'your eyes close. the screen stays lit.',
  "then you are standing in a house swallowed by a hillside. on the table, a camcorder, and a tape in a child's handwriting: 10·31·1970.",
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
  if (again) { play.hidden = false; play.textContent = 'close your eyes again'; }
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
