// One night in Haewol: 23:58 to 00:00. Input, walking, opening, the inspect
// view, the water, the camcorder, the Caller, the name, flashbacks, drawing.
// Started as a copy of systems/memory/memoryScene.js (see design.md).
// Spec: .kiro/specs/haewol

import { perspective, lookAt, multiply, translation, rotationX, rotationY, scaling } from '../render/math.js';
import { fovForAspect } from '../render/camera.js';
import { drawText } from '../render/bitmapFont.js';
import { step, look, forwardOf, rightOf, segmentClear, EYE_HEIGHT } from '../systems/memory/walker.js';
import { pick, REACH } from '../systems/memory/reach.js';
import { createPresence, tickPresence, wake, sees } from '../systems/memory/presence.js';
import { buildItemMesh } from '../systems/memory/market.js';
import { buildFigure } from '../systems/memory/figures.js';
import { createStrike, flashIntensity, strikeLength, nextStrikeDelay } from '../systems/house/lightning.js';
import { LOOP_MS, clockAt, isMidnight, waterAt, wakeAt, nameCallsDue, timecode, START_SEC } from './loop.js';
import { createLens, setRecording, tickLens } from './lens.js';
import { withTaken, withNameChoice, nameDrawsHer } from './save.js';

const MOUSE_SENS = 0.0024;
const TOUCH_LOOK = 0.006;
const STICK_RANGE = 60;
const ENTER_MS = 1400;
const REWIND_MS = 2400;
const FLASH_LINE_MS = 3600;
const WATER_SPEED = 0.62; // of walking speed, off the stones
const NEAR_WARN = 8;

/**
 * @param {{ r: object, audio: object, hud: object, stage: HTMLElement, level: object,
 *   save: object, settings: () => object, onSave: (s: object) => void,
 *   onRewind: (info: { reason: 'caught' | 'midnight', save: object }) => void, onExit: () => void }} opts
 */
export function createNightScene({ r, audio, hud, stage, level, save: saved, settings, onSave, onRewind, onExit }) {
  // ----- meshes -----
  const meshes = [];
  const mk = (data) => { const m = r.createMesh(data); meshes.push(m); return m; };
  const staticMesh = mk(level.mesh);
  const revealedMesh = mk(level.revealed);
  const rainMesh = mk(level.rain);
  const waterGl = mk(level.water);
  const partById = new Map(level.parts.map((p) => [p.id, { ...p, gl: mk(p.mesh), open: 0, target: 0 }]));
  const itemById = new Map(level.items.map((it) => [it.id, { ...it, gl: mk(buildItemMesh(it)), inspectGl: mk(it.inspect.mesh) }]));
  const callerMesh = mk(buildFigure(level.callerLook));
  const saeMesh = mk(buildFigure(level.saeLook));

  // ----- state -----
  let save = saved;
  const loopNo = save.loops;
  let walker = { pos: [...level.start.pos], yaw: level.start.yaw, pitch: 0 };
  let caller = createPresence(level.route);
  let lens = createLens();
  let candle = true;
  let nightMs = 0; // time into the night; stops while paused, inspecting, choosing or remembering
  let mode = { kind: 'enter', start: performance.now() };
  let target = null;
  let walkedSinceStep = 0;
  let callerWalked = 0;
  let bob = 0;
  let eyeY = EYE_HEIGHT;
  let saeSeen = false; // shown once a night, through the lens
  let warnedAt = -1e9;
  let quietUntil = 0;
  let strike = null, strikeAt = 0, nextStrikeAt = performance.now() + 7000;
  const ripples = [];
  let rippleAt = 0;

  // ----- input -----
  const keys = new Set();
  let lookDx = 0, lookDy = 0;
  let stick = null, lookTouch = null, drag = null;
  let rightHeld = false;
  const isLocked = () => document.pointerLockElement === stage;
  const paused = () => hud.dialogOpen || hud.asking || document.querySelector('dialog[open]:not(#memory-pause):not(#memory-notes)') !== null;

  const HANDLED = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight',
    'KeyE', 'Enter', 'Space', 'KeyL', 'KeyC', 'Tab', 'Escape', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'];
  function onKeyDown(e) {
    if (paused()) return;
    const k = e.code;
    if (!HANDLED.includes(k)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    keys.add(k);
    if (e.repeat) return;
    if (k === 'KeyE' || k === 'Enter' || k === 'Space') use();
    else if (k === 'KeyL') toggleCandle();
    else if (k === 'Tab') { releaseLock(); hud.openNotes(); }
    else if (k === 'Escape') {
      if (mode.kind === 'inspect') closeInspect();
      else if (mode.kind === 'hidden') comeOut();
      else openPause();
    }
  }
  function onKeyUp(e) { keys.delete(e.code); }

  let ownUnlock = false;
  function openPause() { releaseLock(); hud.openPause(settings().storyMode); }
  function releaseLock() { if (isLocked()) { ownUnlock = true; document.exitPointerLock?.(); } }
  function onLockChange() {
    if (!isLocked() && !ownUnlock && (mode.kind === 'walk' || mode.kind === 'hidden') && !paused()) openPause();
    ownUnlock = false;
  }
  function onPointerDown(e) {
    if (paused() || e.target.closest?.('button')) return;
    if (e.pointerType === 'touch') {
      const rect = stage.getBoundingClientRect();
      if (mode.kind !== 'inspect' && e.clientX - rect.left < rect.width / 2 && !stick) stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
      else if (!lookTouch) lookTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
      return;
    }
    if (e.button === 2) { rightHeld = true; return; }
    if (e.button !== 0) return;
    if (isLocked()) { use(); return; }
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
  }
  function onPointerMove(e) {
    if (e.pointerType === 'touch') {
      if (stick && e.pointerId === stick.id) { stick.x = e.clientX; stick.y = e.clientY; }
      if (lookTouch && e.pointerId === lookTouch.id) {
        lookDx += (e.clientX - lookTouch.x) * TOUCH_LOOK;
        lookDy -= (e.clientY - lookTouch.y) * TOUCH_LOOK;
        lookTouch.x = e.clientX; lookTouch.y = e.clientY;
      }
      return;
    }
    if (isLocked()) { lookDx += e.movementX * MOUSE_SENS; lookDy -= e.movementY * MOUSE_SENS; return; }
    if (drag) {
      lookDx += (e.clientX - drag.x) * MOUSE_SENS * 1.6;
      lookDy -= (e.clientY - drag.y) * MOUSE_SENS * 1.6;
      drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
      drag.x = e.clientX; drag.y = e.clientY;
    }
  }
  function onPointerUp(e) {
    if (e.pointerType === 'touch') {
      if (stick && e.pointerId === stick.id) stick = null;
      if (lookTouch && e.pointerId === lookTouch.id) lookTouch = null;
      return;
    }
    if (e.button === 2) { rightHeld = false; return; }
    if (!drag) return;
    const click = drag.moved < 6;
    drag = null;
    if (!click || paused()) return;
    if (mode.kind === 'walk' && !hud.isTouch && stage.requestPointerLock) {
      try { stage.requestPointerLock(); } catch { /* drag to look instead */ }
    }
    if (target || mode.kind === 'inspect' || mode.kind === 'hidden') use();
  }
  const onContextMenu = (e) => e.preventDefault();
  function onWheel(e) {
    if (mode.kind !== 'inspect') return;
    e.preventDefault();
    mode.zoom = clampZoom(mode.zoom * (e.deltaY < 0 ? 1.1 : 0.9));
  }
  const clampZoom = (z) => Math.max(0.6, Math.min(2.6, z));

  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  stage.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);
  stage.addEventListener('wheel', onWheel, { passive: false });
  stage.addEventListener('contextmenu', onContextMenu);
  document.addEventListener('pointerlockchange', onLockChange);
  stage.style.touchAction = 'none';

  // ----- actions -----
  const has = (id) => save.taken.includes(id);
  let touchLens = false;

  function toggleCandle() {
    candle = !candle;
    audio.knock({ freq: 1400, q: 3, gain: 0.04, length: 0.05 });
  }

  function use() {
    if (mode.kind === 'inspect') return closeInspect();
    if (mode.kind === 'hidden') return comeOut();
    if (mode.kind !== 'walk' || !target) return;
    const part = partById.get(target);
    if (part) {
      if (part.needs && !has(part.needs)) { hud.say(part.lockedText, 4000); audio.knock({ freq: 600, q: 5, gain: 0.07, length: 0.12 }); return; }
      part.target = part.target > 0.5 ? 0 : 1;
      audio.furniture(part.kind);
      return;
    }
    const item = itemById.get(target);
    if (item) return openInspect(item);
    const hide = level.hides.find((h) => h.id === target);
    if (hide) return goHide(hide);
    const rd = level.readables.find((x) => x.id === target);
    if (rd) {
      // One more line of the tape each loop.
      const n = Math.min(rd.lines.length, loopNo + 1);
      hud.say(rd.lines.slice(0, n).join(' '), 4500 + n * 1600);
      audio.staticBurst(0.4);
    }
  }

  function openInspect(item) {
    releaseLock();
    mode = { kind: 'inspect', item: item.id, yaw: 0.3, pitch: 1.15, zoom: 1, start: performance.now() };
    hud.showCaption(item.name, item.text, item.kind === 'note' ? 'keep the note' : 'keep it');
    r.setDetail(2);
    audio.knock({ freq: 2400, q: 1, gain: 0.04, length: 0.12, rate: 0.8 });
  }
  function closeInspect() {
    const item = itemById.get(mode.item);
    hud.hideCaption();
    r.setDetail(1);
    save = withTaken(save, item.id);
    onSave(save);
    refreshInventory();
    if (item.kind === 'memory' && item.flashback?.length) {
      mode = { kind: 'flashback', lines: item.flashback, start: performance.now(), shown: -1 };
      audio.whirr && stopLater(audio.whirr(900), 900);
      return;
    }
    mode = { kind: 'walk' };
  }

  function goHide(hide) {
    const seen = caller.kind === 'hunt' && sees(caller, playerInfo(false), canSee, performance.now());
    mode = { kind: 'hidden', hide, seen, yaw: 0, pitch: 0 };
    hud.setHiding(true, hide.overlay);
    hud.setPrompt('come out');
    audio.knock({ freq: 300, q: 0.7, gain: 0.05, length: 0.3, rate: 0.5 });
  }
  function comeOut() {
    const { hide } = mode;
    walker = { pos: [...hide.exit.pos], yaw: hide.exit.yaw, pitch: 0 };
    mode = { kind: 'walk' };
    hud.setHiding(false);
  }

  function refreshInventory() {
    const kept = level.items.filter((i) => has(i.id));
    hud.setInventory(kept.filter((i) => i.kind !== 'note').map((i) => i.name));
    hud.setNotes(kept.filter((i) => i.kind !== 'key').map((i) => ({ name: i.name, text: i.kind === 'memory' ? `${i.text} ${i.flashback.join(' ')}` : i.text })));
  }
  refreshInventory();

  // ----- the name -----
  function callName(i) {
    const id = `loop${loopNo}-${i}`;
    if (save.calls.includes(id)) return;
    releaseLock();
    audio.setRain(0.3);
    hud.ask(level.nameCalls[i % level.nameCalls.length], ['answer', 'stay quiet']).then((choice) => {
      save = withNameChoice(save, id, choice === 0);
      onSave(save);
      audio.setRain(1);
      hud.say(choice === 0 ? 'you hear yourself say: yes, mother. it sounds like someone else.' : 'you hold your breath. the voice waits, then moves on.', 4200);
    });
  }

  // ----- world queries -----
  function activeColliders() {
    const out = level.colliders.slice();
    for (const p of partById.values()) if (p.collider && p.open < 0.7) out.push(p.collider);
    return out;
  }
  let colliders = activeColliders();
  const canSee = (a, b) => segmentClear(a, b, colliders);
  const inSafe = (p) => p[0] > level.safe.min[0] && p[0] < level.safe.max[0] && p[1] > level.safe.min[1] && p[1] < level.safe.max[1];

  function playerInfo(moving, inWater = false) {
    const hidden = mode.kind === 'hidden' || inSafe(walker.pos);
    const lit = (candle || lens.recording) && mode.kind !== 'hidden';
    return {
      pos: walker.pos,
      hidden,
      seenHiding: mode.kind === 'hidden' && mode.seen,
      // Light, the tally light, or a name she has heard you answer to: she sees you from farther.
      light: lit || nameDrawsHer(save),
      loud: (moving && !keys.has('ShiftLeft') && !keys.has('ShiftRight')) || (moving && inWater),
    };
  }

  function itemBounds(it) {
    const pad = 0.08;
    return { min: it.pos.map((v, i) => v - it.size[i] / 2 - pad), max: it.pos.map((v, i) => v + it.size[i] / 2 + pad) };
  }
  function targets() {
    const out = [];
    for (const p of partById.values()) out.push({ id: p.id, ...p.bounds });
    for (const h of level.hides) out.push({ id: h.id, ...h.bounds });
    for (const x of level.readables) out.push({ id: x.id, ...x.bounds });
    return out;
  }
  const itemTargets = () => [...itemById.values()].filter((it) => !has(it.id)).map((it) => ({ id: it.id, ...itemBounds(it) }));
  function promptFor(id) {
    if (!id) return null;
    const p = partById.get(id);
    if (p) return `${p.target > 0.5 ? 'close' : 'open'} ${p.label}`;
    const it = itemById.get(id);
    if (it) return `take ${it.name}`;
    return level.hides.find((h) => h.id === id)?.label ?? level.readables.find((x) => x.id === id)?.label ?? null;
  }

  // ----- on-screen display -----
  const osd = document.createElement('canvas');
  const octx = osd.getContext('2d');
  let osdKey = '';
  function drawOsd(sec, hideClock, label = 'PLAY \u25B6') {
    const lr = r.lowRes;
    const div = mode.kind === 'inspect' ? 2 : 1;
    const W = Math.round(lr.w / div), H = Math.round(lr.h / div);
    const time = `${level.date}  ${timecode(sec)}`;
    const key = `${W}x${H}|${time}|${hideClock}|${label}`;
    if (key === osdKey) return;
    osdKey = key;
    osd.width = W; osd.height = H;
    octx.clearRect(0, 0, W, H);
    octx.fillStyle = '#d8cfb4';
    const narrow = W < 300;
    drawText(octx, label, 16, 14, narrow ? 1 : 2);
    if (!hideClock) drawText(octx, time, 16, H - 28, narrow ? 1 : 2);
    r.uploadCanvas(osd, 'osd');
  }

  function lightsNear(p, now) {
    const awake = caller.kind !== 'dormant';
    return level.lights.map((l, i) => ({ l, i, score: Math.hypot(l.pos[0] - p[0], l.pos[2] - p[2]) / (l.weight ?? 1) }))
      .sort((a, b) => a.score - b.score).slice(0, 3)
      .map(({ l, i }) => {
        let k = 0.9 + 0.1 * Math.sin(now * 0.003 + i * 1.7);
        if (awake && Math.hypot(caller.pos[0] - l.pos[0], caller.pos[1] - l.pos[2]) < 6) k *= 0.35 + 0.65 * (Math.sin(now * 0.05 + i * 9) > 0.2 ? 1 : 0.3);
        return { pos: l.pos, color: l.color, intensity: level.lantern.intensity * k, range: level.lantern.range };
      });
  }

  const stopLater = (stop, ms) => setTimeout(stop, ms);
  function warn(now, line) {
    if (now - warnedAt < 9000) return;
    warnedAt = now;
    // The rain goes quiet and a cassette rewinds: she is close.
    stopLater(audio.whirr(1800), 1800);
    audio.setRain(0.3);
    quietUntil = now + 3200;
    if (line) hud.say(line, 3500);
  }

  function startRewind(reason, now) {
    if (mode.kind === 'rewind') return;
    releaseLock();
    mode = { kind: 'rewind', reason, start: now, fromSec: clockAt(nightMs) };
    hud.setHiding(false);
    hud.setPrompt(null);
    hud.setLens(false, lens.battery);
    hud.say(reason === 'caught' ? level.lines.caught : level.lines.midnight, REWIND_MS);
    stopLater(audio.whirr(REWIND_MS), REWIND_MS);
    audio.staticBurst(settings().reduceFlashing ? 0.4 : 1.2);
  }

  // ----- per frame -----
  function frame(now, dt) {
    const s = settings();
    const reduce = s.reduceFlashing;
    const sec = Math.min(0.1, dt / 1000);
    const frozen = paused() || mode.kind === 'inspect' || mode.kind === 'flashback' || mode.kind === 'rewind' || mode.kind === 'enter';

    // Look
    if (mode.kind === 'walk' || mode.kind === 'enter' || mode.kind === 'hidden') {
      let turn = 0;
      if (keys.has('ArrowLeft')) turn -= 1;
      if (keys.has('ArrowRight')) turn += 1;
      if (mode.kind === 'hidden') {
        mode.yaw = Math.max(-0.6, Math.min(0.6, mode.yaw + lookDx + turn * 1.6 * sec));
        mode.pitch = Math.max(-0.35, Math.min(0.35, mode.pitch + lookDy));
      } else walker = look(walker, lookDx + turn * 2.2 * sec, lookDy);
    } else if (mode.kind === 'inspect') {
      let ky = 0, kp = 0;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) ky -= 1;
      if (keys.has('ArrowRight') || keys.has('KeyD')) ky += 1;
      if (keys.has('ArrowUp') || keys.has('KeyW')) kp -= 1;
      if (keys.has('ArrowDown') || keys.has('KeyS')) kp += 1;
      if (keys.has('Equal') || keys.has('NumpadAdd')) mode.zoom = clampZoom(mode.zoom * (1 + sec));
      if (keys.has('Minus') || keys.has('NumpadSubtract')) mode.zoom = clampZoom(mode.zoom * (1 - sec));
      mode.yaw += lookDx * 1.6 + ky * 2 * sec;
      mode.pitch = Math.max(-0.4, Math.min(2.6, mode.pitch - lookDy * 1.6 + kp * 2 * sec));
    }
    lookDx = 0; lookDy = 0;

    // The clock
    if (!frozen) nightMs += dt;
    if (mode.kind === 'walk' || mode.kind === 'hidden') {
      if (isMidnight(nightMs)) startRewind('midnight', now);
      for (const i of nameCallsDue(nightMs)) if (!save.calls.includes(`loop${loopNo}-${i}`) && !hud.asking && mode.kind === 'walk') callName(i);
    }
    const waterY = waterAt(nightMs);

    // The lens
    const wantLens = (keys.has('KeyC') || rightHeld || touchLens) && (mode.kind === 'walk' || mode.kind === 'hidden');
    lens = setRecording(lens, wantLens);
    if (!frozen) lens = tickLens(lens, sec);
    hud.setLens(lens.recording, lens.battery);

    // Walk
    let moved = 0;
    const ground = level.groundAt(walker.pos[0], walker.pos[1]);
    const inWater = ground.sunken && waterY > ground.y + 0.02;
    if (mode.kind === 'walk' && !frozen) {
      let f = 0, st = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyA')) st -= 1;
      if (keys.has('KeyD')) st += 1;
      if (stick) {
        st += Math.max(-1, Math.min(1, (stick.x - stick.x0) / STICK_RANGE));
        f -= Math.max(-1, Math.min(1, (stick.y - stick.y0) / STICK_RANGE));
      }
      const k = inWater ? WATER_SPEED : 1;
      const sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const w = step(walker, { forward: f * k, strafe: st * k, sneak }, sec, colliders);
      moved = w.moved;
      walker = { pos: w.pos, yaw: w.yaw, pitch: walker.pitch };
      walkedSinceStep += moved;
      if (walkedSinceStep > (sneak ? 0.45 : 0.62)) {
        walkedSinceStep = 0;
        if (inWater) { audio.plop(); ripples.push({ x: walker.pos[0], z: walker.pos[1], t: now }); } else audio.footstep(sneak);
      }
      bob = reduce ? 0 : bob + moved * 6;
    }
    // Step up onto stones and down into the courtyard smoothly.
    eyeY += (EYE_HEIGHT + level.groundAt(walker.pos[0], walker.pos[1]).y - eyeY) * Math.min(1, sec * 10);

    // Moving parts
    for (const p of partById.values()) {
      const rate = p.rate ?? 2.6;
      if (p.open !== p.target) {
        const d = Math.sign(p.target - p.open) * rate * sec;
        p.open = Math.abs(p.target - p.open) <= Math.abs(d) ? p.target : p.open + d;
      }
    }
    colliders = activeColliders();
    if (mode.kind === 'walk') walker = { ...walker, pos: step(walker, { forward: 0, strafe: 0 }, 0, colliders).pos };

    // The Caller
    if (caller.kind === 'dormant' && nightMs >= wakeAt(loopNo) && mode.kind === 'walk') {
      caller = wake(caller, level.route, now);
      warn(now, level.lines.wake);
    }
    if (!frozen && (mode.kind === 'walk' || mode.kind === 'hidden')) {
      const before = caller.pos;
      const res = tickPresence(caller, { dt: sec, now, route: level.route, colliders, player: playerInfo(moved > 0, inWater), canSee, story: s.storyMode });
      caller = res.state;
      callerWalked += Math.hypot(caller.pos[0] - before[0], caller.pos[1] - before[1]);
      for (const ev of res.events) {
        if (ev === 'spotted') { warnedAt = -1e9; warn(now, null); }
        if (ev === 'caught') startRewind('caught', now);
      }
    }
    const pdist = Math.hypot(caller.pos[0] - walker.pos[0], caller.pos[1] - walker.pos[1]);
    const callerShown = caller.kind !== 'dormant' && caller.kind !== 'gone';
    if (callerShown && pdist < NEAR_WARN && mode.kind === 'walk') warn(now, level.lines.near);
    if (quietUntil && now > quietUntil) { quietUntil = 0; audio.setRain(inSafe(walker.pos) ? 0.45 : 1); }
    if (callerWalked > 0.75) { callerWalked = 0; if (callerShown) audio.presenceStep(Math.max(0, 1 - pdist / 16)); }

    // Rewind: the picture runs backward, then a new night.
    if (mode.kind === 'rewind' && now - mode.start > REWIND_MS) {
      finish(() => onRewind({ reason: mode.reason, save }));
      return;
    }

    // Flashback
    if (mode.kind === 'flashback') {
      const i = Math.floor((now - mode.start) / FLASH_LINE_MS);
      if (i !== mode.shown) {
        mode.shown = i;
        hud.setFlashback(i < mode.lines.length ? mode.lines[i] : null);
        if (i >= mode.lines.length) { mode = { kind: 'walk' }; hud.say('the tape skips. you are back in the rain.', 3500); }
      }
    }

    // Sae, once a night, through the lens
    const sp = level.sae.pos;
    const saeDist = Math.hypot(sp[0] - walker.pos[0], sp[1] - walker.pos[1]);
    if (lens.recording && !saeSeen && saeDist < 14) {
      const fw = forwardOf(walker.yaw);
      const toward = ((sp[0] - walker.pos[0]) * fw[0] + (sp[1] - walker.pos[1]) * fw[2]) / Math.max(0.01, saeDist);
      if (toward > 0.85) { saeSeen = 'showing'; hud.say(level.lines.sae, 4500); }
    }
    if (saeSeen === 'showing' && saeDist < 3) saeSeen = 'gone';

    // Sound
    const hunting = caller.kind === 'hunt';
    const heart = callerShown ? Math.max(0, 1 - pdist / (hunting ? 14 : 9)) * (hunting ? 1 : 0.7) : 0;
    audio.setMemoryLevels({ heartbeat: frozen ? 0 : heart, murmur: 0, radio: 0 });

    // ----- draw -----
    const time = now / 1000;
    const lr = r.lowRes;
    const aspect = lr.w / lr.h;
    let clockSec = clockAt(nightMs);
    if (mode.kind === 'rewind') clockSec = START_SEC + (mode.fromSec - START_SEC) * Math.max(0, 1 - (now - mode.start) / REWIND_MS);

    if (mode.kind === 'inspect') {
      drawInspect(now, time, aspect);
      drawOsd(clockSec, true);
      r.present({ source: 'scene', osd: true, time, tracking: 0.06, bleed: 0.4, noise: 0.03, glitch: 0, fade: Math.min(1, (now - mode.start) / 250), reduce, bloom: 1.3 });
      hud.setPrompt(null);
      return;
    }

    let eye, dir;
    if (mode.kind === 'hidden') {
      const v = mode.hide.view;
      eye = v.pos;
      dir = forwardOf(v.yaw + mode.yaw, v.pitch + mode.pitch);
    } else {
      eye = [walker.pos[0], eyeY + (reduce ? 0 : Math.sin(bob) * 0.035), walker.pos[1]];
      dir = forwardOf(walker.yaw, walker.pitch);
    }

    if (mode.kind === 'walk') {
      target = pick(eye, dir, itemTargets(), { reach: REACH }) ?? pick(eye, dir, targets(), { reach: REACH });
      hud.setPrompt(promptFor(target));
    } else if (mode.kind !== 'hidden') { target = null; hud.setPrompt(null); }

    const proj = perspective(fovForAspect(aspect), aspect, 0.05, 60);
    const viewProj = multiply(proj, lookAt(eye, [eye[0] + dir[0], eye[1] + dir[1], eye[2] + dir[2]]));

    waterGl.model = translation([0, waterY, 0]);
    const list = [staticMesh, rainMesh, waterGl];
    if (lens.recording) list.push(revealedMesh);
    const glintBase = s.clearPicture ? 0.3 : 0;
    for (const p of partById.values()) { p.gl.model = p.transform(p.open); p.gl.highlight = target === p.id ? 0.2 : 0; list.push(p.gl); }
    let idx = 0;
    for (const it of itemById.values()) {
      if (has(it.id)) continue;
      const glint = Math.max(0, Math.sin(time * 1.6 + idx * 1.9)) ** 12 * 0.9;
      it.gl.highlight = target === it.id ? 0.6 : Math.max(glintBase, glint);
      list.push(it.gl);
      idx++;
    }
    if (callerShown) {
      callerMesh.model = multiply(translation([caller.pos[0], level.groundAt(caller.pos[0], caller.pos[1]).y, caller.pos[1]]), rotationY(-caller.facing));
      const flicker = caller.kind === 'stare' ? Math.max(0, 1 - (now - caller.since) / 2500) : 1;
      callerMesh.highlight = Math.random() * 0.15 * flicker;
      callerMesh.hidden = flicker < 0.15 && Math.random() < 0.5;
      list.push(callerMesh);
    }
    if (lens.recording && saeSeen === 'showing') {
      saeMesh.model = multiply(translation([sp[0], level.groundAt(sp[0], sp[1]).y, sp[1]]), multiply(rotationY(-level.sae.yaw), scaling(level.sae.scale)));
      saeMesh.highlight = 0.04;
      list.push(saeMesh);
    }

    // Candle in the hand: warm, short, wide.
    const rt = rightOf(walker.yaw);
    const spot = candle && mode.kind !== 'hidden' ? {
      pos: [eye[0] + rt[0] * 0.22, eye[1] - 0.35, eye[2] + rt[2] * 0.22], dir,
      color: [1, 0.78, 0.5], intensity: 1.1, inner: 0.5, outer: 1.1, range: 9,
    } : null;

    let flash = 0;
    if (!frozen && now >= nextStrikeAt) {
      strike = createStrike(Math.random, reduce);
      strikeAt = now;
      audio.thunder(strike.thunderDelay);
      nextStrikeAt = now + strikeLength(strike) + nextStrikeDelay(Math.random);
    }
    if (strike) flash = flashIntensity(strike, now - strikeAt) * level.flashScale * (inSafe(walker.pos) ? 0.4 : 1);

    // Ripples: footsteps in the water and rain near you.
    if (now - rippleAt > 180 && waterY > -0.24) {
      rippleAt = now;
      ripples.push({ x: walker.pos[0] + (Math.random() - 0.5) * 8, z: walker.pos[1] + (Math.random() - 0.5) * 8, t: now });
    }
    while (ripples.length > 8) ripples.shift();
    const rip = [];
    for (let i = 0; i < 8; i++) {
      const rp = ripples[i];
      rip.push(rp ? rp.x : 0, rp ? rp.z : 0, rp ? (now - rp.t) / 1000 : -1);
    }

    r.drawScene(list, {
      viewProj, camPos: eye, time,
      ambient: s.clearPicture ? level.ambient.map((a) => a * 1.7) : level.ambient,
      lights: lightsNear(eye, now),
      flash, flashDir: level.flashDir, flashColor: [0.85, 0.9, 1],
      sky: level.sky,
      fogColor: level.fog.color, fogNear: level.fog.near, fogFar: level.fog.far,
      spot, ripples: rip,
    });

    // Picture
    let glitch = 0, fade = 1, tracking = 0.16, noise = 0.055, bleed = 0.7;
    if (mode.kind === 'enter') {
      const e = (now - mode.start) / ENTER_MS;
      if (e >= 1) { mode = { kind: 'walk' }; hud.say(loopNo === 0 ? level.lines.start : level.lines.again, 5000); }
      fade = Math.min(1, e * 1.3);
      if (!reduce) glitch = Math.max(0, 1 - e);
    }
    if (callerShown) {
      const near = Math.max(0, 1 - pdist / 9);
      tracking += 0.55 * near;
      noise += 0.05 * near;
      if (!reduce && hunting) glitch = Math.max(glitch, 0.08 * near);
    }
    if (mode.kind === 'flashback') { tracking = 0.7; noise = 0.12; bleed = 1.2; }
    if (mode.kind === 'rewind') {
      const e = (now - mode.start) / REWIND_MS;
      if (reduce) fade = Math.max(0, 1 - e * 1.2);
      else { glitch = 0.6 + 0.4 * Math.sin(now * 0.03); tracking = 1; noise = 0.3; fade = Math.max(0, 1 - Math.max(0, e - 0.7) * 3.3); }
    }
    drawOsd(clockSec, mode.kind === 'hidden', mode.kind === 'rewind' ? '\u25C0\u25C0 REW' : 'PLAY \u25B6');
    r.present({ source: 'scene', osd: true, time, tracking, bleed, noise, glitch, fade, reduce });
  }

  function drawInspect(now, time, aspect) {
    const it = itemById.get(mode.item);
    const size = it.inspect.size;
    const d = (size * 1.9) / mode.zoom;
    const eye = [0, -size * 0.2, d];
    const viewProj = multiply(perspective(0.75, aspect, 0.01, 10), lookAt(eye, [0, -size * 0.2, 0]));
    const b = Math.sin((now - mode.start) * 0.0012) * size * 0.02;
    it.inspectGl.model = multiply(translation([0, b, 0]), multiply(rotationX(mode.pitch), rotationY(mode.yaw)));
    it.inspectGl.highlight = 0;
    r.drawScene([it.inspectGl], {
      viewProj, camPos: eye, time,
      ambient: [0.32, 0.3, 0.32],
      lights: [
        { pos: [size * 2.5, size * 3, size * 3], color: [1, 0.92, 0.8], intensity: 1.1, range: size * 12 },
        { pos: [-size * 3, size * 0.5, size * 1.5], color: [0.5, 0.6, 0.9], intensity: 0.6, range: size * 10 },
        { pos: [0, -size * 2, -size * 3], color: [0.9, 0.4, 0.3], intensity: 0.5, range: size * 10 },
      ],
      flash: 0, flashDir: [0, 1, 0], flashColor: [1, 1, 1], sky: [0, 0, 0],
      fogColor: [0.025, 0.022, 0.03], fogNear: 100, fogFar: 200,
      sweep: time * 0.8,
    });
  }

  let done = false;
  function finish(then) {
    if (done) return;
    done = true;
    dispose();
    then();
  }
  function dispose() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    stage.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    stage.removeEventListener('wheel', onWheel);
    stage.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('pointerlockchange', onLockChange);
    stage.style.touchAction = '';
    releaseLock();
    hud.setLens(false, 100);
    hud.setFlashback(null);
    hud.setHiding(false);
    hud.setPrompt(null);
    r.setDetail(1);
    audio.setMemoryLevels({ heartbeat: 0, murmur: 0, radio: 0 });
    hud.hideCaption();
    for (const m of meshes) r.disposeMesh(m);
  }

  return {
    frame,
    use,
    toggleLight: toggleCandle,
    setLens(on) { touchLens = on; },
    leave() { finish(onExit); },
    /** For the browser check (?debug). */
    debug: () => ({ walker, caller, mode: mode.kind, target, nightMs, waterY: waterAt(nightMs), lens, save, candle }),
    teleport(pos, yaw = walker.yaw, pitch = 0) { walker = { pos: [...pos], yaw, pitch }; },
    skipTo(ms) { nightMs = ms; },
  };
}
