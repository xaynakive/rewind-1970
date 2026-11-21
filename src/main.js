// Rewind 1970: boot and wiring.
// Cold open -> transition -> house. Tapes are recorded at the VCR, found at
// their hiding spots, and rewound on the TV.

import { createRenderer } from './render/renderer.js';
import { perspective, lookAt, multiply } from './render/math.js';
import { drawText } from './render/bitmapFont.js';
import { createColdOpen } from './systems/cold-open/coldOpen.js';
import { buildHouse } from './systems/house/areas.js';
import { PALETTE } from './systems/house/palette.js';
import { createAreaLoader } from './systems/house/areaLoader.js';
import { startMove, cameraAt, directionForKey } from './systems/house/navigation.js';
import { createLook, lookTarget } from './systems/house/look.js';
import { createHotspotLayer } from './systems/house/hotspots.js';
import { nextStrikeDelay, createStrike, flashIntensity, strikeLength } from './systems/house/lightning.js';
import { createTape } from './systems/tapes/model.js';
import { chooseSpot, occupancyOf } from './systems/tapes/placement.js';
import { hintFor } from './systems/tapes/hints.js';
import { buildTapeMeshes, slideUnder } from './systems/tapes/tapeMeshes.js';
import { idle, startRewind, tickRewind, releaseRewind, rewindProgress, applyRewind, REWIND_MS } from './systems/tapes/rewind.js';
import { decayLevel, MAX_DECAY } from './systems/decay/decay.js';
import { openTapeStore } from './storage/tapeStore.js';
import { createAudio } from './audio/audio.js';
import { loadSettings, saveSettings, timeScale } from './core/settings.js';
import { createTapeWriter } from './ui/tapeWriter.js';
import { createSettingsPanel } from './ui/settingsPanel.js';
import { createPlayback } from './ui/playback.js';
import { createHint } from './ui/hint.js';
import { createNavArrows } from './ui/navArrows.js';

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

const tapeListeners = new Set();
const tapesChanged = () => { for (const fn of tapeListeners) fn(); };
const levelOf = (tape) => decayLevel(tape.lastViewedAt, Date.now(), timeScale(settings));

async function saveTape(next) {
  await store.put(next);
  tapes = tapes.map((t) => (t.id === next.id ? next : t));
}

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
  tapes = [...tapes, result.tape];
  tapesChanged();
  setTimeout(() => hint.show(hintFor(spot)), 700);
  return { ok: true };
}

const writer = createTapeWriter($('#tape-writer'), recordTape);

const panel = createSettingsPanel($('#settings'), {
  settings,
  onChange(next) {
    const demoChanged = next.demoTime !== settings.demoTime;
    settings = next;
    saveSettings(settings);
    panel.update(settings);
    audio.setEnabled(settings.sound);
    if (demoChanged) tapesChanged();
  },
  listTapes: async () => tapes,
  deleteAll: async () => { await store.clear(); tapes = []; tapesChanged(); },
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
  const house = buildHouse();
  const loader = createAreaLoader(r, house);
  const FOV = (58 * Math.PI) / 180;
  const projIndoors = perspective(FOV, 4 / 3, 0.1, 20);
  const projOutdoors = perspective(FOV, 4 / 3, 0.15, 70);
  const look = createLook(stage);

  /** Where the player stands, and the move in progress (if any). */
  let view = house.viewpoints.get(house.start);
  let move = null;
  /** Area whose geometry is on screen. Changes mid-move on a cut. */
  let shownArea = view.area;
  let lastLookAt = null;
  const visited = new Set();
  const areaOf = (id) => house.areas.get(id);

  /** Id of the tape in the player's hands, or null. Not saved: a reload puts it back. */
  let carrying = null;
  let rewind = idle();
  let stopWhirr = () => {};
  let busy = false;
  let suppressTvUntil = 0;

  // ----- tapes in the room -----

  let tapeMesh = null;
  let lastTapeBuild = 0;
  /** Tape piles and selectable props for the area on screen. */
  function rebuildTapes() {
    const area = areaOf(shownArea);
    const visible = tapes.filter((t) => t.id !== carrying);
    const built = buildTapeMeshes(visible, area.spots, levelOf);
    if (tapeMesh) r.disposeMesh(tapeMesh);
    tapeMesh = built.meshData ? r.createMesh(built.meshData) : null;
    hotspotLayer.set([...built.hotspots, ...area.hotspots]);
    lastTapeBuild = performance.now();
  }

  // ----- moving around -----

  const nav = createNavArrows($('#nav'), (dir) => go(dir));
  nav.hide();

  function exitsOf(vp) {
    const out = {};
    for (const [dir, id] of Object.entries(vp.exits)) out[dir] = house.viewpoints.get(id).label;
    return out;
  }

  function go(dir) {
    if (mode.kind !== 'house' || move || busy || rewind.kind !== 'idle' || anyDialogOpen()) return;
    const targetId = view.exits[dir];
    if (!targetId) return;
    // Start from where the player is actually looking, so the camera doesn't snap.
    move = startMove({ ...view, lookAt: lastLookAt ?? view.lookAt }, house.viewpoints.get(targetId), performance.now());
    nav.hide();
    hotspotLayer.setEnabled(false); // input is locked while moving (house spec, Req. 1.4)
    hint.hide();
  }

  /** Called when the camera switches to a new area (on arrival, or mid-cut). */
  function showArea(areaId) {
    shownArea = areaId;
    loader.enter(areaId);
    audio.setRain(areaOf(areaId).outdoors ? 1 : 0.3);
    rebuildTapes();
  }

  function arrive(vp) {
    view = vp;
    move = null;
    look.reset();
    nav.show(exitsOf(vp));
    hotspotLayer.setEnabled(true);
    if (!visited.has(vp.id)) {
      visited.add(vp.id);
      const text = FIRST_VISIT[vp.id]?.(tapes);
      if (text) setTimeout(() => { if (view === vp && !move && !anyDialogOpen()) hint.show(text); }, 600);
    }
  }

  window.addEventListener('keydown', (e) => {
    if (anyDialogOpen() || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const dir = directionForKey(e.key);
    if (dir && mode.kind === 'house') {
      e.preventDefault();
      go(dir);
    }
  });
  tapeListeners.add(rebuildTapes);

  async function findTape(id) {
    const tape = tapes.find((t) => t.id === id);
    if (!tape || busy) return;
    hint.hide();
    const previous = carrying ? tapes.find((t) => t.id === carrying) : null;
    carrying = id;
    try {
      // Swapping: the tape you were holding slides under its pile.
      if (previous && previous.id !== id) {
        await saveTape(slideUnder(previous, tapes.filter((t) => t.spot === previous.spot)));
      }
      if (!tape.found) await saveTape({ ...tape, found: true });
    } catch { /* still playable; it is saved next time */ }
    const shown = tapes.find((t) => t.id === id) ?? tape;
    rebuildTapes();
    if (previous && previous.id !== id) hint.show('you slide the other tape under its pile.');
    playback.open(shown, { level: levelOf(shown), rewound: false, reduce: settings.reduceFlashing });
  }

  async function finishRewind(tapeId) {
    stopWhirr();
    rewind = idle();
    suppressTvUntil = performance.now() + 600;
    const tape = tapes.find((t) => t.id === tapeId);
    if (!tape) return;
    busy = true;
    const restored = applyRewind(tape, Date.now());
    try {
      await saveTape(restored);
    } catch {
      busy = false;
      hint.show('the tape jammed. try again.');
      return;
    }
    busy = false;
    carrying = null; // the tape goes back to its hiding spot
    audio.tapeStart();
    rebuildTapes();
    playback.open(restored, { level: 0, rewound: true, reduce: settings.reduceFlashing });
  }

  const playback = createPlayback($('#playback'), {
    onClose({ tapeId, rewound }) {
      if (rewound) hint.show('the tape slips back to where you found it.');
      else if (carrying === tapeId) hint.show('you take the tape with you. the tv is waiting.');
    },
  });

  const hotspotLayer = createHotspotLayer($('#hotspots'), {
    onSelect(id) {
      if (id.startsWith('tape:')) return findTape(id.slice(5));
      if (id === 'vcr') return writer.open();
      if (id === 'tv') {
        if (carrying || performance.now() < suppressTvUntil) return; // handled by press/release
        const n = tapes.length;
        hint.show(n === 0
          ? 'no signal. the vcr is waiting for a tape.'
          : `the screen hums. ${n} tape${n === 1 ? ' is' : 's are'} somewhere in the house.`);
      }
    },
    onPress(id) {
      if (id !== 'tv' || !carrying || busy || rewind.kind !== 'idle') return;
      rewind = startRewind(carrying, performance.now());
      stopWhirr = audio.whirr(REWIND_MS);
      hint.hide();
    },
    onRelease(id) {
      if (id !== 'tv' || rewind.kind !== 'holding') return;
      rewind = releaseRewind(rewind, performance.now());
      if (rewind.kind === 'complete') return finishRewind(rewind.tapeId);
      stopWhirr();
      rewind = idle();
      suppressTvUntil = performance.now() + 400;
      hint.show('keep holding to rewind.');
    },
  });
  hotspotLayer.setEnabled(false);
  rebuildTapes();

  let size = { w: 1, h: 1 };
  new ResizeObserver(([entry]) => {
    size = { w: entry.contentRect.width, h: entry.contentRect.height };
    r.resize(size.w, size.h);
  }).observe(stage);

  // ----- cold open -----

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

  const anyDialogOpen = () => writer.isOpen || panel.isOpen || playback.isOpen;

  function press() {
    if (mode.kind !== 'cold-open' || anyDialogOpen()) return;
    const now = performance.now();
    if (coldOpen.press(now) === 'play') {
      audio.start();
      audio.setEnabled(settings.sound);
      audio.tapeStart();
      mode = { kind: 'transition', start: now };
    }
  }
  window.addEventListener('keydown', (e) => {
    if (anyDialogOpen()) return;
    if ((e.key === 'Enter' || e.key === ' ') && !(e.target instanceof HTMLButtonElement)) {
      if (mode.kind === 'cold-open') e.preventDefault();
      press();
    }
  });
  stage.addEventListener('pointerdown', (e) => {
    if (mode.kind === 'cold-open' && e.button === 0) press();
  });

  // ----- on-screen display -----

  const osdCanvas = document.createElement('canvas');
  osdCanvas.width = 320;
  osdCanvas.height = 240;
  const osdCtx = osdCanvas.getContext('2d');
  let osdKey = '';
  function updateOsd(since, progress) {
    const time = `OCT 31 1970  ${clock(since)}`;
    const rewinding = rewind.kind === 'holding';
    const steps = Math.floor(progress * 10);
    const key = `${time}|${rewinding}|${steps}|${carrying ? 1 : 0}`;
    if (key === osdKey) return;
    osdKey = key;
    osdCtx.clearRect(0, 0, 320, 240);
    osdCtx.fillStyle = '#d8cfb4';
    if (rewinding) {
      drawText(osdCtx, '\u25C0\u25C0 REW', 16, 14, 2);
      for (let i = 0; i < 10; i++) {
        if (i < steps) osdCtx.fillRect(16 + i * 9, 34, 7, 5);
        else osdCtx.fillRect(16 + i * 9, 38, 7, 1);
      }
    } else {
      drawText(osdCtx, 'PLAY \u25B6', 16, 14, 2);
    }
    if (carrying) drawText(osdCtx, '\u25A0 TAPE', 320 - 16 - 72, 14, 2);
    drawText(osdCtx, time, 16, 212, 2);
    r.uploadCanvas(osdCanvas, 'osd');
  }

  function enterHouse(now) {
    mode = { kind: 'house', since: now };
    showArea(view.area);
    arrive(view);
    nextStrikeAt = now + 3500; // the first strike comes early, to set the mood
  }

  // ----- frame -----

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

      // Rewind
      if (rewind.kind === 'holding') {
        rewind = tickRewind(rewind, now);
        if (rewind.kind === 'complete') finishRewind(rewind.tapeId);
      }
      const progress = rewindProgress(rewind, now);
      const rewinding = rewind.kind === 'holding';

      // Decay tint changes slowly: refresh tape meshes now and then.
      if (now - lastTapeBuild > (settings.demoTime ? 5000 : 60000)) rebuildTapes();

      // Lightning
      if (now >= nextStrikeAt) {
        strike = createStrike(Math.random, reduce);
        strikeAt = now;
        audio.thunder(strike.thunderDelay);
        nextStrikeAt = now + strikeLength(strike) + nextStrikeDelay(Math.random);
      }
      // Camera: following a move, or standing at a viewpoint and looking around.
      let eye, target;
      let moveGlitch = 0;
      if (move) {
        const cam = cameraAt(move, now);
        if (cam.area !== shownArea) showArea(cam.area);
        eye = cam.position;
        target = cam.lookAt;
        moveGlitch = cam.glitch;
        if (cam.done) arrive(move.to);
      } else {
        const off = look.update(dt, reduce);
        eye = view.position;
        target = lookTarget(eye, view.lookAt, off.yaw, off.pitch);
        // lookTarget returns a point 1 m away; keep the viewpoint's distance for smooth moves.
        const d = Math.hypot(...view.lookAt.map((v, i) => v - eye[i]));
        lastLookAt = target.map((v, i) => eye[i] + (v - eye[i]) * d);
      }
      const area = areaOf(shownArea);
      const proj = area.outdoors ? projOutdoors : projIndoors;
      const viewProj = multiply(proj, lookAt(eye, target));
      const flash = strike ? flashIntensity(strike, now - strikeAt) * area.flashScale : 0;

      const meshes = [loader.mesh(shownArea)];
      if (tapeMesh) meshes.push(tapeMesh);
      r.drawScene(meshes, {
        viewProj,
        camPos: eye,
        time,
        ambient: area.ambient,
        lights: area.lights(now),
        flash,
        flashDir: area.flashDir,
        flashColor: PALETTE.lightning,
        sky: area.sky,
        fogColor: area.fogColor,
        fogNear: area.fogNear,
        fogFar: area.fogFar,
      });

      // The tape you're holding makes the whole picture worse, the way a bad tape would.
      const held = carrying ? tapes.find((t) => t.id === carrying) : null;
      const heldDecay = held ? levelOf(held) / MAX_DECAY : 0;

      const fadeIn = Math.min(1, since / (reduce ? 1400 : 1200));
      let glitch = reduce ? 0 : Math.max(0, 0.8 * (1 - since / 500));
      let tracking = 0.22 + 0.35 * heldDecay;
      let bleed = 0.7 + 0.5 * heldDecay;
      let noise = 0.06 + 0.04 * heldDecay;
      if (rewinding) {
        tracking = 1;
        bleed = 1.4;
        noise = 0.12;
        if (!reduce) glitch = Math.max(glitch, 0.12 + 0.3 * progress);
      }
      // Cutting between areas: the tape skips. With reduce flashing it's a dip to black instead.
      let fade = fadeIn;
      if (moveGlitch > 0) {
        if (reduce) fade *= 1 - 0.85 * moveGlitch;
        else {
          glitch = Math.max(glitch, 0.9 * moveGlitch);
          tracking = Math.max(tracking, moveGlitch);
        }
      }
      updateOsd(since, progress);
      r.present({ source: 'scene', osd: true, time, tracking, bleed, noise, glitch, fade, reduce });
      hotspotLayer.update(viewProj, size.w, size.h);
    }

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/** Quiet lines the first time you reach a viewpoint in a session. */
const FIRST_VISIT = {
  'yard-gate': (t) => (t.length === 0
    ? 'the porch light is on. somewhere inside, a vcr is waiting.'
    : 'the house kept your tapes. some of them may be fading.'),
  'hall-entry': () => 'the house is quieter than the storm.',
  'living-room': (t) => (t.length === 0 ? 'the vcr blinks 00:00. it wants a tape.' : null),
  'yard-pond': () => 'the water is very still.',
};

function clock(ms) {
  const s = Math.floor(ms / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
