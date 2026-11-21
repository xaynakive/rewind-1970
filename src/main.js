// Rewind 1970: boot. Cold open -> transition -> living room.

import { createRenderer } from './render/renderer.js';
import { perspective, lookAt, multiply } from './render/math.js';
import { createColdOpen } from './systems/cold-open/coldOpen.js';
import { buildLivingRoom, PALETTE } from './systems/house/livingRoom.js';
import { createLook, lookTarget } from './systems/house/look.js';
import { createHotspotLayer } from './systems/house/hotspots.js';
import { nextStrikeDelay, createStrike, flashIntensity, strikeLength } from './systems/house/lightning.js';
import { createTape } from './systems/tapes/model.js';
import { chooseSpot, occupancyOf } from './systems/tapes/placement.js';
import { hintFor } from './systems/tapes/hints.js';
import { openTapeStore } from './storage/tapeStore.js';
import { createAudio } from './audio/audio.js';
import { loadSettings, saveSettings } from './core/settings.js';
import { createTapeWriter } from './ui/tapeWriter.js';
import { createSettingsPanel } from './ui/settingsPanel.js';
import { createHint } from './ui/hint.js';
import { drawText } from './render/bitmapFont.js';

const $ = (sel) => document.querySelector(sel);
const stage = $('#stage');
const screen = $('#screen');
const bootText = $('#boot-text');

let settings = loadSettings();
const touch = matchMedia('(pointer: coarse)').matches;
const audio = createAudio();
const hint = createHint($('#hint'));
const store = await openTapeStore();
let tapes = await store.all();

// ---------- tapes ----------

function newId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function recordTape({ label, text }) {
  const id = newId();
  const spot = chooseSpot(id, occupancyOf(tapes));
  const result = createTape({ label, text }, { id, now: Date.now(), spot });
  if (!result.ok) return result;
  await store.put(result.tape); // hint only after the write succeeds
  tapes.push(result.tape);
  setTimeout(() => hint.show(hintFor(spot)), 700);
  return { ok: true };
}

const writer = createTapeWriter($('#tape-writer'), recordTape);

const panel = createSettingsPanel($('#settings'), {
  settings,
  onChange(next) {
    settings = next;
    saveSettings(settings);
    panel.update(settings);
    audio.setEnabled(settings.sound);
  },
  listTapes: async () => tapes,
  deleteAll: async () => { await store.clear(); tapes = []; },
  writeTape: () => writer.open(),
});
// When a dialog closes, the browser returns focus to the button that opened it.
// For mouse and touch users that leaves a focused button that would swallow the
// next Enter, so drop focus. Keyboard users keep the standard focus return.
let openedByPointer = false;
$('#settings-button').addEventListener('click', (e) => {
  openedByPointer = e.detail > 0;
  panel.open();
});
$('#settings').addEventListener('close', () => {
  if (openedByPointer) requestAnimationFrame(() => document.activeElement?.blur());
});

if (!store.persistent) {
  setTimeout(() => hint.show("this tape won't survive the night (storage is off in this browser)", 6000), 1500);
}

// ---------- renderer ----------

let renderer = null;
try {
  renderer = createRenderer(screen);
} catch (err) {
  console.error(err);
}
if (!renderer) {
  stage.classList.add('no-webgl');
  $('#no-webgl').hidden = false;
} else {
  start(renderer);
}

function start(r) {
  const room = buildLivingRoom();
  const roomMesh = r.createMesh(room.meshData);
  const proj = perspective((58 * Math.PI) / 180, 4 / 3, 0.1, 20);
  const look = createLook(stage);
  const hotspotLayer = createHotspotLayer($('#hotspots'), room.hotspots, (id) => {
    if (id === 'vcr') writer.open();
    if (id === 'tv') {
      const n = tapes.length;
      hint.show(n === 0
        ? 'no signal. the vcr is waiting for a tape.'
        : `the screen hums. ${n} tape${n === 1 ? ' is' : 's are'} somewhere in the house.`);
    }
  });
  hotspotLayer.setEnabled(false);

  let size = { w: 1, h: 1 };
  new ResizeObserver(([entry]) => {
    size = { w: entry.contentRect.width, h: entry.contentRect.height };
    r.resize(size.w, size.h);
  }).observe(stage);

  const coldOpen = createColdOpen({
    tapesFound: tapes.filter((t) => t.found).length,
    touch,
    onLine: (line) => {
      const p = document.createElement('p');
      p.textContent = line;
      bootText.append(p);
    },
  });

  /** @type {{kind:'cold-open'} | {kind:'transition', start:number} | {kind:'house', since:number}} */
  let mode = { kind: 'cold-open' };
  let strike = null;
  let strikeAt = 0;
  let nextStrikeAt = Infinity;
  let last = performance.now();

  function press() {
    if (mode.kind !== 'cold-open' || writer.isOpen || panel.isOpen) return;
    const now = performance.now();
    if (coldOpen.press(now) === 'play') {
      audio.start();
      audio.setEnabled(settings.sound);
      audio.tapeStart();
      mode = { kind: 'transition', start: now };
    }
  }
  window.addEventListener('keydown', (e) => {
    if (writer.isOpen || panel.isOpen) return;
    if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) {
      if (mode.kind === 'cold-open') e.preventDefault();
      press();
    }
  });
  stage.addEventListener('pointerdown', (e) => {
    if (mode.kind === 'cold-open' && e.button === 0) press();
  });

  // Camcorder-style on-screen display, redrawn only when the clock changes.
  const osdCanvas = document.createElement('canvas');
  osdCanvas.width = 320;
  osdCanvas.height = 240;
  const osdCtx = osdCanvas.getContext('2d');
  let osdText = '';
  function updateOsd(since) {
    const text = `OCT 31 1970  ${clock(since)}`;
    if (text === osdText) return;
    osdText = text;
    osdCtx.clearRect(0, 0, 320, 240);
    osdCtx.fillStyle = '#d8cfb4';
    drawText(osdCtx, 'PLAY \u25B6', 16, 14, 2);
    drawText(osdCtx, text, 16, 212, 2);
    r.uploadCanvas(osdCanvas, 'osd');
  }

  function enterHouse(now) {
    mode = { kind: 'house', since: now };
    hotspotLayer.setEnabled(true);
    nextStrikeAt = now + 3500; // the first strike comes early, to set the mood
  }

  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    const time = now / 1000;
    const reduce = settings.reduceFlashing;

    if (mode.kind === 'transition') {
      const outMs = reduce ? 600 : 700;
      if (now - mode.start >= outMs) enterHouse(mode.start + outMs);
    }

    if (mode.kind === 'cold-open' || mode.kind === 'transition') {
      coldOpen.update(now);
      coldOpen.draw(now);
      r.uploadCanvas(coldOpen.canvas);
      let glitch = 0;
      let fade = 1;
      if (mode.kind === 'transition') {
        const e = now - mode.start;
        if (reduce) fade = Math.max(0, 1 - e / 600);
        else {
          glitch = 1;
          fade = e > 550 ? Math.max(0, 1 - (e - 550) / 150) : 1;
        }
      }
      r.present({ source: 'canvas', time, tracking: 0.6, bleed: 1, noise: 0.09, glitch, fade, reduce });
    } else {
      const since = now - mode.since;

      // Lightning
      if (now >= nextStrikeAt) {
        strike = createStrike(Math.random, reduce);
        strikeAt = now;
        audio.thunder(strike.thunderDelay);
        nextStrikeAt = now + strikeLength(strike) + nextStrikeDelay(Math.random);
      }
      const flash = strike ? flashIntensity(strike, now - strikeAt) * 0.9 : 0;

      // Camera
      const off = look.update(dt, reduce);
      const eye = room.viewpoint.position;
      const target = lookTarget(eye, room.viewpoint.lookAt, off.yaw, off.pitch);
      const viewProj = multiply(proj, lookAt(eye, target));

      r.drawScene([roomMesh], {
        viewProj,
        camPos: eye,
        ambient: room.ambient,
        lights: room.lights(now),
        flash,
        flashDir: room.flashDir,
        flashColor: PALETTE.lightning,
        sky: room.sky,
        fogColor: room.fogColor,
        fogNear: room.fogNear,
        fogFar: room.fogFar,
      });

      const fadeIn = Math.min(1, since / (reduce ? 1400 : 1200));
      const glitch = reduce ? 0 : Math.max(0, 0.8 * (1 - since / 500));
      updateOsd(since);
      r.present({ source: 'scene', osd: true, time, tracking: 0.22, bleed: 0.7, noise: 0.06, glitch, fade: fadeIn, reduce });
      hotspotLayer.update(viewProj, size.w, size.h);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function clock(ms) {
  const s = Math.floor(ms / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
