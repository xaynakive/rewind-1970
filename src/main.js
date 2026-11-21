// Rewind 1970: boot and wiring.
// Cold open -> transition -> house. Tapes are recorded at the VCR, found at
// their hiding spots, and rewound on the TV.

import { createRenderer } from './render/renderer.js';
import { perspective, lookAt, multiply, pickPlaneY } from './render/math.js';
import { createPond, addRipple, rippleUniforms, revealAt, tickPond, noteLightning } from './systems/pond/pond.js';
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
import { loadSettings, saveSettings, timeScale, brightnessToGamma } from './core/settings.js';
import { fovForAspect } from './render/camera.js';
import { createTapeWriter } from './ui/tapeWriter.js';
import { createSettingsPanel } from './ui/settingsPanel.js';
import { createPlayback } from './ui/playback.js';
import { createHint } from './ui/hint.js';
import { createNavArrows } from './ui/navArrows.js';
import { createTvScreen } from './ui/tvScreen.js';
import { createCaseFile } from './ui/caseFile.js';
import {
  HOUSE_TAPES, PLAYBACK_NOTE, normalizeProgress, revealOf, allFound, asTape, withMark, isHouseId, houseTape,
} from './systems/mystery/mystery.js';
import { buildFinalTapeMesh, FINAL_TAPE_HOTSPOT, TV_SHOTS } from './systems/house/livingRoom.js';
import { easeInOut } from './systems/house/navigation.js';
import {
  isUnlocked, chooseEnding, buildFinalTape, finaleTimeline, segmentAt, segmentStart,
} from './systems/endings/endings.js';

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
const pondNoticedBefore = Boolean(await store.getMeta('pondSecretNoticed').catch(() => false));
/** Whether the final tape has been seen in the VCR (after that it stays visible), and which endings were seen. */
const finalSeenBefore = Boolean(await store.getMeta('finalTapeSeen').catch(() => false));
const seenEndingsBefore = (await store.getMeta('seenEndings').catch(() => null)) ?? [];

// ---------- the previous resident's tapes (spec: .kiro/specs/mystery) ----------

let mystery = normalizeProgress(await store.getMeta('mystery').catch(() => null));
async function saveMystery(next) {
  mystery = next;
  try { await store.setMeta('mystery', mystery); } catch { /* remembered for this visit */ }
}
const foundHouseTapes = () => HOUSE_TAPES.filter((t) => mystery.found.includes(t.id)).map((t) => asTape(t, mystery));

// ---------- tapes ----------

const tapeListeners = new Set();
const tapesChanged = () => { for (const fn of tapeListeners) fn(); };
/** House tapes have a fixed decay (0 once rewound); the user's tapes decay with time. */
const levelOf = (tape) => (tape.house ? tape.decay : decayLevel(tape.lastViewedAt, Date.now(), timeScale(settings)));
/** A user tape, or a house tape in its current state. */
const tapeById = (id) => tapes.find((t) => t.id === id) ?? (isHouseId(id) ? asTape(houseTape(id), mystery) : null);

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

/** Set by start() so solving the case can talk to the house. */
let onCaseSolved = () => {};
const caseFile = createCaseFile($('#case'), {
  async onSolved() {
    await saveMystery({ ...mystery, solved: true });
    onCaseSolved();
  },
});

const panel = createSettingsPanel($('#settings'), {
  settings,
  onChange(next) {
    const demoChanged = next.demoTime !== settings.demoTime;
    settings = next;
    saveSettings(settings);
    panel.update(settings);
    audio.setEnabled(settings.sound);
    applyPicture();
    if (demoChanged) tapesChanged();
  },
  listTapes: async () => tapes,
  listHouseTapes: () => foundHouseTapes(),
  caseAvailable: () => allFound(mystery) && !mystery.solved,
  openCase: () => caseFile.open(),
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

// Full screen, like a game: the button, or F. The picture already fills the tab.
const fullscreenButton = $('#fullscreen-button');
const canFullscreen = Boolean(document.documentElement.requestFullscreen);
fullscreenButton.hidden = !canFullscreen;
function toggleFullscreen() {
  if (!canFullscreen) return;
  if (document.fullscreenElement) document.exitFullscreen?.();
  else document.documentElement.requestFullscreen().catch(() => {});
}
fullscreenButton.addEventListener('click', (e) => {
  toggleFullscreen();
  if (e.detail > 0) fullscreenButton.blur();
});
document.addEventListener('fullscreenchange', () => {
  fullscreenButton.textContent = document.fullscreenElement ? 'exit full screen' : 'full screen';
});
window.addEventListener('keydown', (e) => {
  if ((e.key === 'f' || e.key === 'F') && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey
    && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)
    && !document.querySelector('dialog[open]')) {
    toggleFullscreen();
  }
});

function applyPicture() {
  renderer?.setPicture({ gamma: brightnessToGamma(settings.brightness), clear: settings.clearPicture });
}

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
  applyPicture();
  start(renderer);
}

function start(r) {
  const house = buildHouse();
  const loader = createAreaLoader(r, house);
  // Projection follows the screen's shape (see fovForAspect).
  let projIndoors = perspective(fovForAspect(4 / 3), 4 / 3, 0.1, 20);
  let projOutdoors = perspective(fovForAspect(4 / 3), 4 / 3, 0.15, 70);
  function setAspect(aspect) {
    const fov = fovForAspect(aspect);
    projIndoors = perspective(fov, aspect, 0.1, 20);
    projOutdoors = perspective(fov, aspect, 0.15, 70);
  }
  const look = createLook(stage);

  /** Where the player stands, and the move in progress (if any). */
  let view = house.viewpoints.get(house.start);
  let move = null;
  /** Area whose geometry is on screen. Changes mid-move on a cut. */
  let shownArea = view.area;
  let lastLookAt = null;
  let lastViewProj = null;
  const visited = new Set();
  const areaOf = (id) => house.areas.get(id);

  // ----- the pond -----

  const pondInfo = areaOf('front-yard').pond;
  const pond = createPond({ skeleton: pondInfo.skeleton });
  pond.noticed = pondNoticedBefore;
  /** 0 = tapes resting on the bottom, 1 = floating at the surface. Resets on leaving the yard. */
  let pondRise = 0;
  const watchingPond = () => view.id === pondInfo.viewpoint && !move && !anyDialogOpen();

  function ripple(x, z) {
    addRipple(pond, x, z, performance.now(), Math.random);
    audio.plop();
  }

  /** Touching the water: a ripple where you touched (or the middle, from the keyboard). */
  function touchWater(e) {
    let [x, z] = pondInfo.center;
    if (e?.detail > 0 && lastViewProj) {
      const rect = stage.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = 1 - ((e.clientY - rect.top) / rect.height) * 2;
      const hit = pickPlaneY(lastViewProj, ndcX, ndcY, pondInfo.waterY);
      const [cx, cz] = pondInfo.center, [rx, rz] = pondInfo.radii;
      if (hit && ((hit[0] - cx) / rx) ** 2 + ((hit[2] - cz) / rz) ** 2 <= 1) [x, z] = [hit[0], hit[2]];
    }
    ripple(x, z);
  }

  async function secretNoticed() {
    pond.noticed = true;
    rebuildTapes(); // her tape in the water can surface now
    try { await store.setMeta('pondSecretNoticed', true); } catch { /* remembered for this visit */ }
    setTimeout(() => hint.show('you look away. when you look back, the water is just water.', 5000), 1200);
  }

  const easeOut = (t) => 1 - (1 - t) ** 3;
  /** The area's hiding spots, with pond tapes lowered under the water until they float up. */
  function spotsOf(area) {
    if (area.id !== 'front-yard' || !area.spots.pond) return area.spots;
    const p = area.spots.pond;
    return { ...area.spots, pond: { ...p, pos: [p.pos[0], p.pos[1] - 0.35 * (1 - easeOut(pondRise)), p.pos[2]] } };
  }
  const pondTapesWaiting = () => shownArea === 'front-yard' && pondRise < 1 && tapes.some((t) => t.spot === 'pond' && t.id !== carrying);

  // ----- the final tape -----

  const finalTapeMesh = r.createMesh(buildFinalTapeMesh());
  let finalSeen = finalSeenBefore;
  const seenEndings = new Set(seenEndingsBefore);
  let wasUnlocked = isUnlocked(tapes);
  let unlockHintPending = false;
  /** The final tape playing: { start, script, timeline, from, announced } or null. */
  let finale = null;
  const tvScreen = createTvScreen();
  const tvText = $('#tv-text');

  function startFinale() {
    if (finale || busy || rewind.kind !== 'idle' || move) return;
    const ending = chooseEnding(tapes, Date.now(), pond.noticed, timeScale(settings), mystery.solved);
    const script = buildFinalTape(tapes, ending);
    finale = {
      start: performance.now(),
      script,
      timeline: finaleTimeline(script),
      from: { position: view.position, lookAt: lastLookAt ?? view.lookAt },
      announced: -1,
    };
    hotspotLayer.setEnabled(false);
    nav.hide();
    hint.hide();
    tvText.replaceChildren();
    audio.tapeStart();
  }

  /** Escape skips to the end card. */
  function skipFinale() {
    if (!finale) return;
    const t = performance.now() - finale.start;
    const card = segmentStart(finale.timeline, 'card');
    if (t < card) finale.start = performance.now() - card;
  }

  async function endFinale() {
    const { ending } = finale.script;
    finale = null;
    seenEndings.add(ending);
    try { await store.setMeta('seenEndings', [...seenEndings]); } catch { /* remembered for this visit */ }
    arrive(view);
    nextStrikeAt = performance.now() + 4000;
    setTimeout(() => hint.show('the tape is back in the vcr. it still says 10-31-70.', 5000), 700);
  }

  /** Id of the tape in the player's hands, or null. Not saved: a reload puts it back. */
  let carrying = null;
  let rewind = idle();
  let stopWhirr = () => {};
  let busy = false;
  let suppressTvUntil = 0;

  // ----- tapes in the room -----

  let tapeMesh = null;
  let houseFlashMesh = null;
  let lastTapeBuild = 0;

  // ----- the house's tapes -----

  const houseCtx = () => ({
    progress: mystery,
    pondNoticed: pond.noticed,
    anyUserRewound: tapes.some((t) => (t.rewindCount ?? 0) > 0),
  });
  /** What the house whispers when one of its tapes appears somewhere you aren't looking. */
  const REVEAL_HINTS = {
    'house-4': 'upstairs, something settles on top of something tall.',
    'house-5': 'a rung creaks on the attic ladder.',
  };
  let revealedBefore = new Set(HOUSE_TAPES.filter((t) => revealOf(t, houseCtx()) === 'shown').map((t) => t.id));
  let revealHintPending = null;
  let caseHintPending = false;
  function noteNewReveals(ctx) {
    const now = new Set(HOUSE_TAPES.filter((t) => revealOf(t, ctx) === 'shown').map((t) => t.id));
    for (const id of now) if (!revealedBefore.has(id) && REVEAL_HINTS[id]) revealHintPending = REVEAL_HINTS[id];
    revealedBefore = now;
  }
  /** One pending line from the house, shown when the player is free to read it. Returns true if shown. */
  function showPendingHouseHint() {
    if (caseHintPending) {
      caseHintPending = false;
      hint.show("that's all of her tapes. the tv is waiting for an answer. press it once you've rewound this one.", 5500);
      return true;
    }
    if (revealHintPending) {
      hint.show(revealHintPending, 5000);
      revealHintPending = null;
      return true;
    }
    return false;
  }
  onCaseSolved = () => {
    hint.show(isUnlocked(tapes)
      ? 'the house is quiet for the first time. play the tape in the vcr.'
      : 'the house is quiet for the first time.', 6000);
    rebuildTapes();
  };
  /** Tape piles and selectable props for the area on screen. */
  function rebuildTapes() {
    const area = areaOf(shownArea);
    const ctx = houseCtx();
    const houseShown = HOUSE_TAPES.filter((t) => t.id !== carrying && revealOf(t, ctx) === 'shown').map((t) => asTape(t, mystery));
    const houseFlash = HOUSE_TAPES.filter((t) => t.id !== carrying && revealOf(t, ctx) === 'flash').map((t) => asTape(t, mystery));
    const visible = [...tapes.filter((t) => t.id !== carrying), ...houseShown];
    const built = buildTapeMeshes(visible, spotsOf(area), levelOf);
    if (tapeMesh) r.disposeMesh(tapeMesh);
    tapeMesh = built.meshData ? r.createMesh(built.meshData) : null;
    // House tapes that only show while lightning lights them: their own mesh, nothing to click yet.
    const flashBuilt = buildTapeMeshes(houseFlash, area.spots, levelOf);
    if (houseFlashMesh) r.disposeMesh(houseFlashMesh);
    houseFlashMesh = flashBuilt.meshData ? r.createMesh(flashBuilt.meshData) : null;
    noteNewReveals(ctx);
    // A tape still under the water can't be picked up yet.
    const reachable = built.hotspots.filter((h) => h.spot !== 'pond' || pondRise >= 1);
    // The final tape sits over the VCR, so it's listed first (on top).
    const unlocked = isUnlocked(tapes);
    const final = shownArea === 'living-room' && unlocked && finalSeen ? [FINAL_TAPE_HOTSPOT] : [];
    hotspotLayer.set([...final, ...reachable, ...area.hotspots]);
    lastTapeBuild = performance.now();
    if (unlocked && !wasUnlocked) unlockHintPending = true;
    wasUnlocked = unlocked;
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
    if (mode.kind !== 'house' || move || finale || busy || rewind.kind !== 'idle' || anyDialogOpen()) return;
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
    if (areaId !== 'front-yard') pondRise = 0; // pond tapes sink again while you're away
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
    if (vp.id === 'living-room' && isUnlocked(tapes) && !finalSeen) {
      setTimeout(() => { if (view === vp && !move && !anyDialogOpen()) hint.show('something is in the vcr. it only shows when the sky lights up.', 5000); }, 900);
    }
  }

  function showUnlockHint() {
    unlockHintPending = false;
    hint.show(view.area === 'living-room'
      ? 'the vcr clicks. something slides into it.'
      : 'downstairs, the vcr clicks. something slides into it.', 5000);
  }

  window.addEventListener('keydown', (e) => {
    if (anyDialogOpen() || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const dir = directionForKey(e.key);
    if (finale) {
      if (e.key === 'Escape') skipFinale();
      if (dir || e.key === ' ' || e.key === 'Enter') e.preventDefault();
      return;
    }
    if (dir && mode.kind === 'house') {
      e.preventDefault();
      go(dir);
    }
  });
  tapeListeners.add(rebuildTapes);

  async function findTape(id) {
    const tape = tapeById(id);
    if (!tape || busy) return;
    hint.hide();
    const previous = carrying ? tapeById(carrying) : null;
    carrying = id;
    try {
      // Swapping: the tape you were holding slides under its pile. (House tapes lie alone.)
      if (previous && previous.id !== id && !previous.house) {
        await saveTape(slideUnder(previous, tapes.filter((t) => t.spot === previous.spot)));
      }
      if (tape.house && !tape.found) {
        await saveMystery(withMark(mystery, 'found', id));
        if (allFound(mystery) && !mystery.solved) caseHintPending = true;
      } else if (!tape.house && !tape.found) {
        await saveTape({ ...tape, found: true });
      }
    } catch { /* still playable; it is saved next time */ }
    const shown = tapeById(id) ?? tape;
    rebuildTapes();
    if (previous && previous.id !== id) hint.show(previous.house ? 'you set the other tape back down.' : 'you slide the other tape under its pile.');
    playback.open(shown, {
      level: levelOf(shown),
      rewound: false,
      reduce: settings.reduceFlashing,
      note: shown.house && !shown.rewound ? PLAYBACK_NOTE : undefined,
    });
  }

  async function finishRewind(tapeId) {
    stopWhirr();
    rewind = idle();
    suppressTvUntil = performance.now() + 600;
    const tape = tapeById(tapeId);
    if (!tape) return;
    busy = true;
    let restored;
    try {
      if (tape.house) {
        // Rewinding her tape clears the static off the last line: the next clue.
        await saveMystery(withMark(mystery, 'rewound', tapeId));
        restored = tapeById(tapeId);
      } else {
        restored = applyRewind(tape, Date.now());
        await saveTape(restored);
      }
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
      if (unlockHintPending) showUnlockHint();
      else if (showPendingHouseHint()) { /* the house had something to say */ }
      else if (rewound) hint.show('the tape slips back to where you found it.');
      else if (carrying === tapeId) hint.show('you take the tape with you. the tv is waiting.');
    },
  });

  const hotspotLayer = createHotspotLayer($('#hotspots'), {
    onSelect(id, e) {
      if (id.startsWith('tape:')) return findTape(id.slice(5));
      if (id === 'pond-water') return touchWater(e);
      if (id === 'final-tape') return startFinale();
      if (id === 'vcr') return writer.open();
      if (id === 'tv') {
        if (carrying || performance.now() < suppressTvUntil) return; // handled by press/release
        if (allFound(mystery) && !mystery.solved) return caseFile.open();
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
    setAspect(size.w / Math.max(1, size.h));
    // The on-screen display matches the picture's size, so its text stays crisp and in the corners.
    const lr = r.lowRes;
    if (osdCanvas.width !== lr.w || osdCanvas.height !== lr.h) {
      osdCanvas.width = lr.w;
      osdCanvas.height = lr.h;
      osdKey = '';
    }
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

  const anyDialogOpen = () => writer.isOpen || panel.isOpen || playback.isOpen || caseFile.isOpen;

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
  /** `frozen`: the final tape's view from inside the TV, where the clock never moves. */
  function updateOsd(since, progress, frozen = false) {
    const time = frozen ? 'OCT 31 1970  00:00' : `OCT 31 1970  ${clock(since)}`;
    const rewinding = rewind.kind === 'holding';
    const steps = Math.floor(progress * 10);
    const holding = carrying && !frozen;
    const key = `${time}|${rewinding}|${steps}|${holding ? 1 : 0}`;
    if (key === osdKey) return;
    osdKey = key;
    const W = osdCanvas.width, H = osdCanvas.height;
    // Narrow (phone) pictures: a smaller clock, lifted above the corner buttons.
    const narrow = W < 300;
    const clockScale = narrow ? 1 : 2;
    const clockY = H - 28 - (narrow ? Math.ceil((60 * H) / Math.max(1, size.h)) : 0);
    osdCtx.clearRect(0, 0, W, H);
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
    if (holding) drawText(osdCtx, '\u25A0 TAPE', W - 16 - 72, 14, 2);
    drawText(osdCtx, time, 16, clockY, clockScale);
    r.uploadCanvas(osdCanvas, 'osd');
  }

  function enterHouse(now) {
    mode = { kind: 'house', since: now };
    showArea(view.area);
    arrive(view);
    nextStrikeAt = now + 3500; // the first strike comes early, to set the mood
  }

  // ----- drawing -----

  /** Draws the area on screen from `eye` toward `target`. Returns the view-projection matrix. */
  function drawRoom(now, time, eye, target, flash, { ripples = null, reveal = 0, showFinal = false, tvOn = false, showHouseFlash = false } = {}) {
    const area = areaOf(shownArea);
    const proj = area.outdoors ? projOutdoors : projIndoors;
    const viewProj = multiply(proj, lookAt(eye, target));
    const meshes = [loader.mesh(shownArea)];
    if (tapeMesh) meshes.push(tapeMesh);
    if (showFinal) meshes.push(finalTapeMesh);
    if (showHouseFlash && houseFlashMesh) meshes.push(houseFlashMesh);
    r.drawScene(meshes, {
      viewProj,
      camPos: eye,
      time,
      ripples,
      reveal,
      water: pondInfo.water,
      ambient: area.ambient,
      // While the final tape plays, the TV (the living room's first light) floods the room.
      lights: tvOn ? area.lights(now).map((l, i) => (i === 0 ? { ...l, intensity: l.intensity * 2.4, range: l.range * 1.4 } : l)) : area.lights(now),
      flash,
      flashDir: area.flashDir,
      flashColor: PALETTE.lightning,
      sky: area.sky,
      fogColor: area.fogColor,
      fogNear: area.fogNear,
      fogFar: area.fogFar,
    });
    return viewProj;
  }

  const lerp3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  /** One frame of the final tape. */
  function finaleFrame(now, time, reduce, since) {
    // The frame's timestamp can be a few ms older than the click that started the tape.
    const t = Math.max(0, now - finale.start);
    const seg = segmentAt(finale.timeline, t);
    if (!seg) return endFinale();
    const local = t - seg.start;
    const { script } = finale;
    const d = script.decay;

    if (seg.kind === 'push' || seg.kind === 'pov') {
      let eye, target, fade = 1, glitch = 0;
      if (seg.kind === 'push') {
        const k = easeInOut(Math.min(1, local / seg.ms));
        eye = lerp3(finale.from.position, TV_SHOTS.close.position, k);
        target = lerp3(finale.from.lookAt, TV_SHOTS.close.lookAt, k);
        glitch = reduce ? 0 : Math.max(0, (k - 0.6) / 0.4);
        fade = Math.min(1, (seg.ms - local) / 250);
      } else {
        eye = TV_SHOTS.pov.position;
        target = TV_SHOTS.pov.lookAt;
        fade = Math.min(1, local / 600, (seg.ms - local) / 800);
      }
      drawRoom(now, time, eye, target, 0, { showFinal: true, tvOn: seg.kind === 'pov' });
      updateOsd(since, 0, seg.kind === 'pov');
      r.present({
        source: 'scene', osd: true, time, reduce, fade: Math.max(0, fade),
        tracking: 0.3 + 0.7 * d, bleed: 0.8 + 0.8 * d, noise: 0.07 + 0.1 * d, glitch,
      });
      return;
    }

    if (seg.kind === 'line' && seg.index > finale.announced) {
      finale.announced = seg.index;
      const p = document.createElement('p');
      p.textContent = seg.text;
      tvText.append(p);
    }
    if (seg.kind === 'card' && finale.announced < script.lines.length) {
      finale.announced = script.lines.length;
      const p = document.createElement('p');
      p.textContent = `tape end. ${script.title}.`;
      tvText.append(p);
    }
    tvScreen.draw(seg, local, script);
    r.uploadCanvas(tvScreen.canvas);
    const gap = seg.kind === 'gap';
    r.present({
      source: 'canvas', time, reduce,
      fade: seg.kind === 'return' ? 0 : 1,
      tracking: 0.3 + 0.7 * d,
      bleed: 0.8 + 0.8 * d,
      noise: (gap ? 0.16 : 0.07) + 0.12 * d,
      glitch: reduce ? 0 : 0.25 * d + (gap ? 0.15 : 0),
    });
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

      if (finale) {
        finaleFrame(now, time, reduce, since);
        requestAnimationFrame(frame);
        return;
      }

      // Lightning
      if (now >= nextStrikeAt) {
        strike = createStrike(Math.random, reduce);
        strikeAt = now;
        audio.thunder(strike.thunderDelay);
        nextStrikeAt = now + strikeLength(strike) + nextStrikeDelay(Math.random);
        // Lightning lights up what's under the water, for anyone looking at it.
        if (shownArea === 'front-yard' && noteLightning(pond, watchingPond())) secretNoticed();
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
      const flash = strike ? flashIntensity(strike, now - strikeAt) * area.flashScale : 0;

      // The final tape: until it has been seen once, it only shows in a lightning flash.
      const finalHere = shownArea === 'living-room' && wasUnlocked;
      if (finalHere && !finalSeen && flash > 0.12 && view.id === 'living-room' && !move) {
        finalSeen = true;
        store.setMeta('finalTapeSeen', true).catch(() => {});
        rebuildTapes();
      }
      const showFinal = finalHere && (finalSeen || flash > 0.12);

      // Her tape by the graves: seen once in a lightning flash from the graves, then it stays.
      if (houseFlashMesh && !mystery.lightningSeen && flash > 0.12 && view.id === 'yard-graves' && !move) {
        saveMystery({ ...mystery, lightningSeen: true }).then(() => {
          rebuildTapes();
          hint.show('there. between the stones.', 4000);
        });
      }

      // The pond: tapes float up while you watch, ripples spread, and sometimes the skeleton shows.
      let ripples = null, reveal = 0;
      if (shownArea === 'front-yard') {
        if (watchingPond() && pondTapesWaiting()) {
          pondRise = Math.min(1, pondRise + dt / 2500);
          rebuildTapes();
          if (pondRise >= 1) {
            const p = area.spots.pond.pos;
            ripple(p[0], p[2]);
            hint.show('something rises to the surface.');
          }
        }
        if (tickPond(pond, now, watchingPond())) secretNoticed();
        ripples = rippleUniforms(pond, now);
        reveal = revealAt(pond, now, flash);
      }

      const viewProj = drawRoom(now, time, eye, target, flash, { ripples, reveal, showFinal, showHouseFlash: flash > 0.12 });
      lastViewProj = viewProj;

      // The tape you're holding makes the whole picture worse, the way a bad tape would.
      const held = carrying ? tapeById(carrying) : null;
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
  'yard-gate': (t) => {
    if (!mystery.found.includes('house-1')) return 'the mailbox flag is up. someone left you something.';
    return t.length === 0
      ? 'the porch light is on. somewhere inside, a vcr is waiting.'
      : 'the house kept your tapes. some of them may be fading.';
  },
  'hall-entry': () => 'the house is quieter than the storm.',
  'living-room': (t) => (t.length === 0 ? 'the vcr blinks 00:00. it wants a tape.' : null),
  'yard-pond': () => 'the water is very still.',
};

function clock(ms) {
  const s = Math.floor(ms / 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}
