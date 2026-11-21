// Running a memory: input, walking, opening things, the inspect view, the
// presence, sound levels and drawing. The level comes from a builder such as
// market.js; the rules come from walker.js, reach.js and presence.js.
// Spec: .kiro/specs/memories

import { perspective, lookAt, multiply, translation, rotationX, rotationY } from '../../render/math.js';
import { fovForAspect } from '../../render/camera.js';
import { drawText } from '../../render/bitmapFont.js';
import { step, look, forwardOf, rightOf, segmentClear, EYE_HEIGHT } from './walker.js';
import { pick, REACH } from './reach.js';
import { createPresence, tickPresence, wake, resetAfterCatch, sees } from './presence.js';
import { withEntry, countTaken } from './progress.js';
import { buildItemMesh } from './market.js';
import { buildFigure } from './figures.js';
import { createStrike, flashIntensity, strikeLength, nextStrikeDelay } from '../house/lightning.js';
import { scaling } from '../../render/math.js';

const MOUSE_SENS = 0.0024;
const TOUCH_LOOK = 0.006;
const STICK_RANGE = 60; // px of drag for full speed
const CAUGHT_MS = 1400;
const ENTER_MS = 1100;
const LINE_MS = 3600;

/**
 * @param {{
 *   r: object, audio: object, hud: object, stage: HTMLElement,
 *   level: object, progress: import('./progress.js').MemoryProgress,
 *   settings: () => { reduceFlashing: boolean, clearPicture: boolean, storyMode: boolean },
 *   onSave: (p: object) => void,
 *   onExit: (info: { finished: boolean }) => void,
 * }} opts
 */
export function createMemoryScene({ r, audio, hud, stage, level, progress: saved, settings, onSave, onExit }) {
  // ----- meshes -----
  const meshes = [];
  const mk = (data) => { const m = r.createMesh(data); meshes.push(m); return m; };
  const staticMesh = mk(level.mesh);
  const extraMeshes = level.extra.map(mk);
  const partById = new Map(level.parts.map((p) => [p.id, { ...p, gl: mk(p.mesh), open: 0, target: 0 }]));
  const itemById = new Map(level.items.map((it) => [it.id, { ...it, gl: mk(buildItemMesh(it)), inspectGl: mk(it.inspect.mesh) }]));
  const presenceMesh = mk(buildFigure({ face: 'static', ...(level.presenceLook ?? {}) }));
  const juneMesh = mk(buildFigure({ face: 'hair', ...(level.juneLook ?? {}) }));
  const juneScale = level.juneLook?.scale ?? 1;

  // ----- state -----
  let progress = { ...saved, opened: [] };
  if (progress.done) progress = { ...progress, taken: [], checkpoint: 'entrance' }; // replaying a finished memory
  const checkpointOf = (id) => (id && itemById.get(id)?.checkpoint) || level.checkpoints.entrance;
  const startAt = checkpointOf(progress.checkpoint);
  let walker = { pos: [...startAt.pos], yaw: startAt.yaw, pitch: 0 };
  let presence = createPresence(level.route);
  if (countTaken(progress, level.items.filter((i) => i.kind === 'note').map((i) => i.id)) >= level.wakeAfterNotes) {
    presence = resetAfterCatch(wake(presence, level.route, 0), level.route, walker.pos, performance.now());
  }
  for (const id of progress.taken) {
    // Containers whose things were taken stay open, so the room shows what you did.
    const c = itemById.get(id)?.inside ?? itemById.get(id)?.needsOpen;
    if (c && partById.has(c)) { const p = partById.get(c); p.open = p.target = 1; }
  }

  /** @type {{kind:'enter',start:number} | {kind:'walk'} | {kind:'inspect',item:string,yaw:number,pitch:number,zoom:number,start:number}
   *   | {kind:'hidden',hide:object,seen:boolean,yaw:number} | {kind:'caught',start:number} | {kind:'ending',start:number,shown:number} } */
  let mode = { kind: 'enter', start: performance.now() };
  let light = true;
  let target = null; // id of what the user is looking at
  let walkedSinceStep = 0;
  let presenceWalked = 0;
  // June, glimpsed ahead at the start (if the level has a glimpse).
  let glimpse = level.june.glimpse ? { shown: false, gone: false, since: 0 } : { shown: true, gone: true, since: 0 };
  // A storm outside the windows (if the level has one): the house's lightning rules.
  let strike = null, strikeAt = 0, nextStrikeAt = performance.now() + 6000;
  let bob = 0;
  let enteredAt = performance.now();

  // ----- input -----
  const keys = new Set();
  let lookDx = 0, lookDy = 0;
  let stick = null; // { id, x0, y0, x, y }
  let lookTouch = null; // { id, x, y }
  let drag = null; // mouse drag look without pointer lock
  let pinch = null;

  const isLocked = () => document.pointerLockElement === stage;
  const paused = () => hud.dialogOpen || document.querySelector('dialog[open]:not(#memory-pause):not(#memory-notes)') !== null;

  function onKeyDown(e) {
    if (paused()) return;
    const k = e.code;
    const handled = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight',
      'KeyE', 'Enter', 'Space', 'KeyL', 'Tab', 'Escape', 'Equal', 'Minus', 'NumpadAdd', 'NumpadSubtract'];
    if (!handled.includes(k)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    keys.add(k);
    if (e.repeat) return;
    if (k === 'KeyE' || k === 'Enter' || k === 'Space') use();
    else if (k === 'KeyL') toggleLight();
    else if (k === 'Tab') { releaseLock(); hud.openNotes(); }
    else if (k === 'Escape') {
      if (mode.kind === 'inspect') closeInspect();
      else if (mode.kind === 'hidden') comeOut();
      else openPause();
    }
  }
  function onKeyUp(e) { keys.delete(e.code); }

  function openPause() {
    releaseLock();
    hud.openPause(settings().storyMode);
  }
  function releaseLock() {
    if (isLocked()) { ownUnlock = true; document.exitPointerLock?.(); }
  }
  let ownUnlock = false;
  function onLockChange() {
    if (!isLocked() && !ownUnlock && (mode.kind === 'walk' || mode.kind === 'hidden') && !paused()) openPause();
    ownUnlock = false;
  }

  function onMouseMove(e) {
    if (isLocked()) { lookDx += e.movementX * MOUSE_SENS; lookDy -= e.movementY * MOUSE_SENS; return; }
    if (drag && e.pointerType === 'mouse') {
      lookDx += (e.clientX - drag.x) * MOUSE_SENS * 1.6;
      lookDy -= (e.clientY - drag.y) * MOUSE_SENS * 1.6;
      drag.moved += Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y);
      drag.x = e.clientX; drag.y = e.clientY;
    }
  }

  function onPointerDown(e) {
    if (paused() || e.target.closest?.('button')) return;
    if (e.pointerType === 'touch') {
      const rect = stage.getBoundingClientRect();
      if (pinch === null && lookTouch && mode.kind === 'inspect') pinch = { a: lookTouch, b: { id: e.pointerId, x: e.clientX, y: e.clientY }, d: 0 };
      if (mode.kind !== 'inspect' && e.clientX - rect.left < rect.width / 2 && !stick) {
        stick = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
      } else if (!lookTouch) {
        lookTouch = { id: e.pointerId, x: e.clientX, y: e.clientY };
      }
      return;
    }
    if (e.button !== 0) return;
    if (isLocked()) { use(); return; }
    drag = { x: e.clientX, y: e.clientY, moved: 0 };
  }
  function onPointerMove(e) {
    if (e.pointerType !== 'touch') return onMouseMove(e);
    if (stick && e.pointerId === stick.id) { stick.x = e.clientX; stick.y = e.clientY; }
    if (lookTouch && e.pointerId === lookTouch.id) {
      lookDx += (e.clientX - lookTouch.x) * TOUCH_LOOK;
      lookDy -= (e.clientY - lookTouch.y) * TOUCH_LOOK;
      lookTouch.x = e.clientX; lookTouch.y = e.clientY;
    }
    if (pinch) {
      if (e.pointerId === pinch.b.id) { pinch.b.x = e.clientX; pinch.b.y = e.clientY; }
      const d = Math.hypot(lookTouch.x - pinch.b.x, lookTouch.y - pinch.b.y);
      if (pinch.d && mode.kind === 'inspect') mode.zoom = clampZoom(mode.zoom * (d / pinch.d));
      pinch.d = d;
    }
  }
  function onPointerUp(e) {
    if (e.pointerType === 'touch') {
      if (stick && e.pointerId === stick.id) stick = null;
      if (lookTouch && e.pointerId === lookTouch.id) lookTouch = null;
      if (pinch && (e.pointerId === pinch.b.id || !lookTouch)) pinch = null;
      return;
    }
    if (!drag) return;
    const click = drag.moved < 6;
    drag = null;
    if (!click || paused()) return;
    // A plain click: capture the mouse for looking (desktop), or use what's named.
    if (mode.kind === 'walk' && !hud.isTouch && stage.requestPointerLock) {
      try { stage.requestPointerLock(); } catch { /* not allowed here: drag to look instead */ }
    }
    if (target || mode.kind === 'inspect' || mode.kind === 'hidden') use();
  }
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
  document.addEventListener('pointerlockchange', onLockChange);
  stage.style.touchAction = 'none';

  // ----- actions -----

  const has = (id) => progress.taken.includes(id);
  const containerOf = (it) => it.inside ?? it.needsOpen ?? null;
  const itemAvailable = (it) => {
    if (has(it.id)) return false;
    const c = containerOf(it);
    return !c || (partById.get(c)?.open ?? 0) > 0.75;
  };

  function toggleLight() {
    light = !light;
    audio.knock({ freq: 1800, q: 4, gain: 0.04, length: 0.03 });
  }

  function use() {
    if (mode.kind === 'inspect') return closeInspect();
    if (mode.kind === 'hidden') return comeOut();
    if (mode.kind !== 'walk' || !target) return;
    const part = partById.get(target);
    if (part) {
      if (part.needs && !has(part.needs)) { hud.say(part.lockedText, 3500); audio.knock({ freq: 600, q: 5, gain: 0.07, length: 0.12 }); return; }
      if (part.oneWay && part.target === 1) return;
      part.target = part.target > 0.5 ? 0 : 1;
      audio.furniture(part.kind);
      if (part.openLine && part.target === 1) hud.say(part.openLine, 4000);
      return;
    }
    const item = itemById.get(target);
    if (item) return openInspect(item);
    const hide = level.hides.find((h) => h.id === target);
    if (hide) return goHide(hide);
  }

  function openInspect(item) {
    releaseLock();
    mode = { kind: 'inspect', item: item.id, yaw: 0.3, pitch: item.kind === 'key' ? 1.2 : 1.15, zoom: 1, start: performance.now() };
    hud.showCaption(item.name, item.text, item.kind === 'note' ? 'keep the note' : 'keep it');
    r.setDetail(2);
    audio.knock({ freq: 2400, q: 1, gain: 0.04, length: 0.12, rate: 0.8 }); // paper, metal
  }

  function closeInspect() {
    const item = itemById.get(mode.item);
    mode = { kind: 'walk' };
    hud.hideCaption();
    r.setDetail(1);
    progress = withEntry(progress, 'taken', item.id);
    progress = { ...progress, checkpoint: item.id };
    onSave(progress);
    refreshInventory();
    const notes = level.items.filter((i) => i.kind === 'note').map((i) => i.id);
    if (presence.kind === 'dormant' && countTaken(progress, notes) >= level.wakeAfterNotes) {
      presence = wake(presence, level.route, performance.now());
      hud.say(level.lines.wake, 5000);
      audio.staticBurst(0.5);
    }
  }

  function goHide(hide) {
    const seen = presence.kind === 'hunt' && sees(presence, playerInfo(false), canSee, performance.now());
    mode = { kind: 'hidden', hide, seen, yaw: 0, pitch: 0 };
    hud.setHiding(true, hide.overlay);
    hud.setPrompt(hide.low ? 'come out from under the table' : 'come out');
    audio.knock({ freq: 300, q: 0.7, gain: 0.05, length: 0.3, rate: 0.5 });
  }
  function comeOut() {
    const { hide } = mode;
    walker = { pos: [...hide.exit.pos], yaw: hide.exit.yaw, pitch: 0 };
    mode = { kind: 'walk' };
    hud.setHiding(false);
  }

  function refreshInventory() {
    hud.setInventory(level.items.filter((i) => i.kind !== 'note' && has(i.id)).map((i) => i.name));
    hud.setNotes(level.items.filter((i) => i.kind === 'note' && has(i.id)).map((i) => ({ name: i.name, text: i.text })));
  }
  refreshInventory();

  // ----- world queries -----

  function activeColliders() {
    const out = level.colliders.slice();
    for (const p of partById.values()) if (p.collider && p.open < 0.7) out.push(p.collider);
    return out;
  }
  let colliders = activeColliders();
  const canSee = (a, b) => segmentClear(a, b, colliders);

  function playerInfo(moving) {
    const hidden = mode.kind === 'hidden';
    return {
      pos: walker.pos,
      hidden,
      seenHiding: hidden && mode.seen,
      light: light && !hidden,
      loud: moving && !keys.has('ShiftLeft') && !keys.has('ShiftRight'),
    };
  }

  /** Model matrix of a part at its current openness. */
  const partModel = (p) => p.transform(p.open);

  function itemBounds(it) {
    let c = it.pos;
    const cont = it.inside ? partById.get(it.inside) : null;
    if (cont && cont.kind === 'drawer') {
      const m = partModel(cont);
      c = [c[0] + m[12], c[1] + m[13], c[2] + m[14]];
    }
    const pad = 0.08;
    return { min: c.map((v, i) => v - it.size[i] / 2 - pad), max: c.map((v, i) => v + it.size[i] / 2 + pad) };
  }

  /** Things you can take come first, so an open box never hides what's inside it. */
  function itemTargets() {
    const out = [];
    for (const it of itemById.values()) if (itemAvailable(it)) out.push({ id: it.id, ...itemBounds(it) });
    return out;
  }
  function targets() {
    const out = [];
    for (const p of partById.values()) {
      if (p.oneWay && p.target === 1) continue;
      out.push({ id: p.id, ...p.bounds });
    }
    for (const h of level.hides) out.push({ id: h.id, ...h.bounds });
    return out;
  }

  function promptFor(id) {
    if (!id) return null;
    const p = partById.get(id);
    if (p) return `${p.target > 0.5 ? 'close' : 'open'} ${p.label}`;
    const it = itemById.get(id);
    if (it) return `take ${it.name}`;
    return level.hides.find((h) => h.id === id)?.label ?? null;
  }

  // ----- the on-screen display -----

  const osd = document.createElement('canvas');
  const octx = osd.getContext('2d');
  let osdKey = '';
  function drawOsd(clockSec, hideClock) {
    const lr = r.lowRes;
    const W = Math.round(lr.w / (mode.kind === 'inspect' ? 2 : 1)), H = Math.round(lr.h / (mode.kind === 'inspect' ? 2 : 1));
    const s = Math.floor(clockSec);
    const pad = (n) => String(n).padStart(2, '0');
    const time = `${level.date}  ${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
    const key = `${W}x${H}|${time}|${light}|${hideClock}`;
    if (key === osdKey) return;
    osdKey = key;
    osd.width = W; osd.height = H;
    octx.clearRect(0, 0, W, H);
    octx.fillStyle = '#d8cfb4';
    const narrow = W < 300;
    drawText(octx, 'PLAY \u25B6', 16, 14, narrow ? 1 : 2);
    if (!hideClock) drawText(octx, time, 16, H - 28, narrow ? 1 : 2);
    r.uploadCanvas(osd, 'osd');
  }

  // ----- per frame -----

  function lightsNear(p, now) {
    const awake = presence.kind !== 'dormant';
    const scored = level.lights.map((l, i) => {
      const d = Math.hypot(l.pos[0] - p[0], l.pos[2] - p[2]);
      return { l, i, score: d / (l.weight ?? 1) };
    }).sort((a, b) => a.score - b.score).slice(0, 3);
    return scored.map(({ l, i }) => {
      let k = 0.92 + 0.08 * Math.sin(now * 0.004 + i * 1.7);
      if (awake) {
        // Near the presence, lanterns stutter and dim.
        const near = Math.hypot(presence.pos[0] - l.pos[0], presence.pos[1] - l.pos[2]);
        if (near < 6) k *= 0.35 + 0.65 * (Math.sin(now * 0.05 + i * 9) > 0.2 ? 1 : 0.3);
      }
      return { pos: l.pos, color: l.color, intensity: level.lantern.intensity * k, range: level.lantern.range };
    });
  }

  function frame(now, dt) {
    const s = settings();
    const reduce = s.reduceFlashing;
    const sec = dt / 1000;
    const frozen = paused() || mode.kind === 'inspect';

    // Look
    if (mode.kind === 'walk' || mode.kind === 'enter' || mode.kind === 'hidden') {
      let turn = 0;
      if (keys.has('ArrowLeft')) turn -= 1;
      if (keys.has('ArrowRight')) turn += 1;
      if (mode.kind === 'hidden') {
        mode.yaw = Math.max(-0.6, Math.min(0.6, mode.yaw + lookDx + turn * 1.6 * sec));
        mode.pitch = Math.max(-0.35, Math.min(0.35, mode.pitch + lookDy));
      } else {
        walker = look(walker, lookDx + turn * 2.2 * sec, lookDy);
      }
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

    // Walk
    let moved = 0;
    if (mode.kind === 'walk' && !frozen) {
      let f = 0, st = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyA')) st -= 1;
      if (keys.has('KeyD')) st += 1;
      if (stick) {
        const dx = (stick.x - stick.x0) / STICK_RANGE, dy = (stick.y - stick.y0) / STICK_RANGE;
        st += Math.max(-1, Math.min(1, dx));
        f -= Math.max(-1, Math.min(1, dy));
      }
      const sneak = keys.has('ShiftLeft') || keys.has('ShiftRight');
      const w = step(walker, { forward: f, strafe: st, sneak }, sec, colliders);
      moved = w.moved;
      walker = { pos: w.pos, yaw: w.yaw, pitch: walker.pitch };
      walkedSinceStep += moved;
      if (walkedSinceStep > (sneak ? 0.45 : 0.62)) { walkedSinceStep = 0; audio.footstep(sneak); }
      bob = reduce ? 0 : bob + moved * 6;
    }

    // Moving parts
    for (const p of partById.values()) {
      const rate = p.rate ?? (p.kind === 'shutter' ? 0.55 : 2.6);
      if (p.open !== p.target) {
        const d = Math.sign(p.target - p.open) * rate * sec;
        p.open = Math.abs(p.target - p.open) <= Math.abs(d) ? p.target : p.open + d;
      }
    }
    colliders = activeColliders();
    // Never trap the user inside something that closed on them.
    if (mode.kind === 'walk') walker = { ...walker, pos: step(walker, { forward: 0, strafe: 0 }, 0, colliders).pos };

    // June, glimpsed ahead at the start.
    if (!glimpse.shown && now - enteredAt > 2200 && mode.kind === 'walk') {
      glimpse = { ...glimpse, shown: true, since: now };
      hud.say(level.lines.glimpse, 3500);
    }
    const gp = level.june.glimpse?.pos;
    if (glimpse.shown && !glimpse.gone && (Math.hypot(walker.pos[0] - gp[0], walker.pos[1] - gp[1]) < 7 || now - glimpse.since > 12000)) {
      glimpse = { ...glimpse, gone: true };
    }

    // The presence
    if (!frozen && (mode.kind === 'walk' || mode.kind === 'hidden')) {
      const before = presence.pos;
      const res = tickPresence(presence, {
        dt: sec, now, route: level.route, colliders, player: playerInfo(moved > 0), canSee, story: s.storyMode,
      });
      presence = res.state;
      presenceWalked += Math.hypot(presence.pos[0] - before[0], presence.pos[1] - before[1]);
      for (const ev of res.events) {
        if (ev === 'spotted') audio.knock({ freq: 90, q: 1, gain: 0.09, length: 0.8, rate: 0.4 }); // a low breath, not a sting
        if (ev === 'caught') {
          mode = { kind: 'caught', start: now };
          releaseLock();
          audio.staticBurst(1.4);
        }
      }
    }
    const pdist = Math.hypot(presence.pos[0] - walker.pos[0], presence.pos[1] - walker.pos[1]);
    const presenceShown = presence.kind !== 'dormant' && presence.kind !== 'gone';
    if (presenceWalked > 0.75) {
      presenceWalked = 0;
      if (presenceShown) audio.presenceStep(Math.max(0, 1 - pdist / 16));
    }

    // Caught: static, then back to the checkpoint.
    if (mode.kind === 'caught' && now - mode.start > CAUGHT_MS) {
      const cp = checkpointOf(progress.checkpoint);
      walker = { pos: [...cp.pos], yaw: cp.yaw, pitch: 0 };
      presence = resetAfterCatch(presence, level.route, walker.pos, now);
      mode = { kind: 'walk' };
      hud.setHiding(false);
      hud.say(level.lines.caught, 3000);
    }

    // The end: past the last door, close to June.
    const exitPart = partById.get(level.exitPart);
    if (mode.kind === 'walk' && exitPart && exitPart.open > 0.95) {
      const t = level.exitTrigger;
      if (Math.hypot(walker.pos[0] - t.pos[0], walker.pos[1] - t.pos[1]) < t.radius) {
        mode = { kind: 'ending', start: now, shown: -1 };
        releaseLock();
        hud.setPrompt(null);
      }
    }
    if (mode.kind === 'ending') {
      const i = Math.floor((now - mode.start) / LINE_MS);
      if (i !== mode.shown && i < level.endLines.length) { mode.shown = i; hud.say(level.endLines[i], LINE_MS - 300); }
      if (i === level.endLines.length && mode.shown !== 99) { mode.shown = 99; audio.staticBurst(1.6); }
      if (now - mode.start > LINE_MS * level.endLines.length + 1700) {
        finish(true);
        return;
      }
    }

    // Sound levels
    const radio = level.lights.find((l) => l.radio);
    const radioLevel = radio ? Math.max(0, 1 - Math.hypot(radio.pos[0] - walker.pos[0], radio.pos[2] - walker.pos[1]) / 7) : 0;
    const hunting = presence.kind === 'hunt';
    const heart = presenceShown ? Math.max(0, 1 - pdist / (hunting ? 14 : 9)) * (hunting ? 1 : 0.7) : 0;
    audio.setMemoryLevels({ heartbeat: frozen ? 0 : heart, murmur: presence.kind === 'dormant' ? 1 : 0.3, radio: radioLevel });

    // ----- draw -----
    const time = now / 1000;
    const lr = r.lowRes;
    const aspect = lr.w / lr.h;

    if (mode.kind === 'inspect') {
      drawInspect(now, time, aspect);
      drawOsd(level.clockStart + (now - enteredAt) / 1000, true);
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
      const by = reduce ? 0 : Math.sin(bob) * 0.035;
      eye = [walker.pos[0], EYE_HEIGHT + by, walker.pos[1]];
      dir = forwardOf(walker.yaw, walker.pitch);
      if (mode.kind === 'ending') {
        // Turn gently toward June.
        const j = level.june.pos;
        const want = Math.atan2(j[0] - walker.pos[0], -(j[1] - walker.pos[1]));
        walker = { ...walker, yaw: walker.yaw + (want - walker.yaw) * Math.min(1, sec * 2), pitch: walker.pitch * (1 - Math.min(1, sec * 2)) };
        dir = forwardOf(walker.yaw, walker.pitch);
      }
    }

    // What's in reach
    if (mode.kind === 'walk') {
      target = pick(eye, dir, itemTargets(), { reach: REACH }) ?? pick(eye, dir, targets(), { reach: REACH });
      hud.setPrompt(promptFor(target));
    } else if (mode.kind !== 'hidden') {
      target = null;
      hud.setPrompt(null);
    }

    const fov = fovForAspect(aspect);
    const proj = perspective(fov, aspect, 0.05, 45);
    const viewProj = multiply(proj, lookAt(eye, [eye[0] + dir[0], eye[1] + dir[1], eye[2] + dir[2]]));

    const list = [staticMesh, ...extraMeshes];
    const glintBase = s.clearPicture ? 0.3 : 0;
    let idx = 0;
    for (const p of partById.values()) {
      p.gl.model = partModel(p);
      const holdsSomething = level.items.some((it) => containerOf(it) === p.id && !has(it.id));
      p.gl.highlight = target === p.id ? 0.2 : holdsSomething ? glintBase * 0.6 : 0;
      list.push(p.gl);
    }
    for (const it of itemById.values()) {
      if (has(it.id)) continue;
      const cont = it.inside ? partById.get(it.inside) : null;
      it.gl.model = cont && cont.kind === 'drawer' ? partModel(cont) : undefined;
      const glint = Math.max(0, Math.sin(time * 1.6 + idx * 1.9)) ** 12 * 0.9;
      it.gl.highlight = target === it.id ? 0.6 : Math.max(glintBase, glint);
      list.push(it.gl);
      idx++;
    }
    if (presenceShown) {
      presenceMesh.model = multiply(translation([presence.pos[0], 0, presence.pos[1]]), rotationY(-presence.facing));
      const flicker = presence.kind === 'stare' ? Math.max(0, 1 - (now - presence.since) / 2500) : 1;
      presenceMesh.highlight = (Math.random() * 0.25) * flicker;
      presenceMesh.hidden = flicker < 0.15 && Math.random() < 0.5;
      list.push(presenceMesh);
    }
    const juneAt = glimpse.shown && !glimpse.gone ? level.june.glimpse.pos : level.june.pos;
    juneMesh.model = multiply(translation([juneAt[0], 0, juneAt[1]]), multiply(rotationY(-(glimpse.gone ? level.june.yaw : (level.june.glimpse?.yaw ?? 0))), scaling(juneScale)));
    juneMesh.highlight = 0;
    if (glimpse.gone || glimpse.shown) list.push(juneMesh);

    const rt = rightOf(walker.yaw);
    const spot = light && mode.kind !== 'hidden' ? {
      pos: [eye[0] + rt[0] * 0.18, eye[1] - 0.2, eye[2] + rt[2] * 0.18],
      dir,
      color: [1, 0.94, 0.82],
      intensity: 1.25,
      inner: 0.24,
      outer: 0.46,
      range: 15,
    } : null;

    // Lightning through the windows.
    let flash = 0;
    if (level.storm) {
      if (now >= nextStrikeAt && !frozen) {
        strike = createStrike(Math.random, reduce);
        strikeAt = now;
        audio.thunder(strike.thunderDelay);
        nextStrikeAt = now + strikeLength(strike) + nextStrikeDelay(Math.random);
      }
      flash = strike ? flashIntensity(strike, now - strikeAt) * (level.flashScale ?? 0.6) : 0;
    }
    let lights = lightsNear(eye, now);
    if (level.presenceLamp && presenceShown) {
      // Its lamp is always one of the lights, so you see it coming down the corridor.
      const lamp = { pos: [presence.pos[0] + 0.3, 0.85, presence.pos[1]], color: [1, 0.8, 0.5], intensity: 1.3, range: 7 };
      lights = [lamp, ...lights.slice(0, 2)];
    }

    r.drawScene(list, {
      viewProj,
      camPos: eye,
      time,
      ambient: s.clearPicture ? level.ambient.map((a) => a * 1.6) : level.ambient,
      lights,
      flash,
      flashDir: level.flashDir ?? [0, 1, 0],
      flashColor: [0.85, 0.9, 1],
      sky: level.sky ?? [0.1, 0.1, 0.14],
      fogColor: level.fog.color,
      fogNear: level.fog.near,
      fogFar: level.fog.far,
      spot,
    });

    // Picture
    let glitch = 0, fade = 1, tracking = 0.16, noise = 0.055, bleed = 0.7;
    if (mode.kind === 'enter') {
      const e = (now - mode.start) / ENTER_MS;
      if (e >= 1) { mode = { kind: 'walk' }; enteredAt = now; hud.say(level.lines.start, 4500); }
      fade = Math.min(1, e * 1.4);
      if (!reduce) glitch = Math.max(0, 1 - e);
    }
    if (presenceShown) {
      const near = Math.max(0, 1 - pdist / 8);
      tracking += 0.5 * near;
      noise += 0.05 * near;
      if (!reduce) glitch = Math.max(glitch, presence.kind === 'hunt' ? 0.08 * near : 0);
    }
    if (mode.kind === 'caught') {
      const e = (now - mode.start) / CAUGHT_MS;
      if (reduce) fade = Math.max(0, 1 - e * 1.5);
      else { glitch = 1; noise = 0.4; tracking = 1; }
    }
    if (mode.kind === 'ending') {
      const total = LINE_MS * level.endLines.length;
      const e = (now - mode.start - total) / 1700;
      if (e > 0) { if (reduce) fade = Math.max(0, 1 - e); else { glitch = Math.min(1, e * 2); noise = 0.3; fade = Math.max(0, 1 - e); } }
    }
    drawOsd(level.clockStart + (now - enteredAt) / 1000, mode.kind === 'hidden');
    r.present({ source: 'scene', osd: true, time, tracking, bleed, noise, glitch, fade, reduce });
  }

  function drawInspect(now, time, aspect) {
    const it = itemById.get(mode.item);
    const size = it.inspect.size;
    const d = (size * 1.9) / mode.zoom;
    const eye = [0, -size * 0.2, d];
    const proj = perspective(0.75, aspect, 0.01, 10);
    // Aim a little low, so the object sits above its caption.
    const viewProj = multiply(proj, lookAt([0, -size * 0.2, d], [0, -size * 0.2, 0]));
    const bob = Math.sin((now - mode.start) * 0.0012) * size * 0.02;
    it.inspectGl.model = multiply(translation([0, bob, 0]), multiply(rotationX(mode.pitch), rotationY(mode.yaw)));
    it.inspectGl.highlight = 0;
    r.drawScene([it.inspectGl], {
      viewProj,
      camPos: eye,
      time,
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
  function finish(finished) {
    if (done) return;
    done = true;
    if (finished) { progress = { ...progress, done: true }; onSave(progress); }
    dispose();
    onExit({ finished });
  }

  function dispose() {
    window.removeEventListener('keydown', onKeyDown, true);
    window.removeEventListener('keyup', onKeyUp, true);
    stage.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    stage.removeEventListener('wheel', onWheel);
    document.removeEventListener('pointerlockchange', onLockChange);
    stage.style.touchAction = '';
    releaseLock();
    r.setDetail(1);
    audio.setMemoryLevels({ heartbeat: 0, murmur: 0, radio: 0 });
    hud.setHiding(false);
    hud.hideCaption();
    hud.hide();
    for (const m of meshes) r.disposeMesh(m);
  }

  hud.show();

  return {
    frame,
    use,
    toggleLight,
    leave: () => finish(false),
    get mode() { return mode.kind; },
    /** For tests in the browser: where things are. */
    debug: () => ({ walker, presence, mode: mode.kind, target, progress, light }),
    teleport(pos, yaw = walker.yaw, pitch = walker.pitch) { walker = { pos: [...pos], yaw, pitch }; },
  };
}
