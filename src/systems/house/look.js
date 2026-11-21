// Limited look-around at a viewpoint. Spec: .kiro/specs/house (Requirement 1.5)
// Mouse: the view follows the pointer. Touch: drag to look.

const DEG = Math.PI / 180;
export const MAX_YAW = 35 * DEG;
export const MAX_PITCH = 20 * DEG;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createLook(element) {
  const target = { yaw: 0, pitch: 0 };
  const current = { yaw: 0, pitch: 0 };
  let drag = null;

  element.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') {
      const r = element.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      // Small dead zone in the middle, so the view rests when you read.
      target.yaw = clamp(deadZone(nx) * MAX_YAW, -MAX_YAW, MAX_YAW);
      target.pitch = clamp(-deadZone(ny) * MAX_PITCH, -MAX_PITCH, MAX_PITCH);
    } else if (drag && e.pointerId === drag.id) {
      const r = element.getBoundingClientRect();
      // Drag moves the world under your finger.
      target.yaw = clamp(drag.yaw - ((e.clientX - drag.x) / r.width) * MAX_YAW * 2, -MAX_YAW, MAX_YAW);
      target.pitch = clamp(drag.pitch + ((e.clientY - drag.y) / r.height) * MAX_PITCH * 2, -MAX_PITCH, MAX_PITCH);
    }
  });
  element.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') drag = { id: e.pointerId, x: e.clientX, y: e.clientY, ...target };
  });
  const end = (e) => { if (drag && e.pointerId === drag.id) drag = null; };
  element.addEventListener('pointerup', end);
  element.addEventListener('pointercancel', end);

  return {
    /** Back to looking straight ahead (after arriving at a new viewpoint). */
    reset() {
      target.yaw = target.pitch = current.yaw = current.pitch = 0;
      drag = null;
    },
    /** Eases toward the target. Returns the current offsets in radians. */
    update(dt, reducedMotion) {
      const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 0.004);
      current.yaw += (target.yaw - current.yaw) * k;
      current.pitch += (target.pitch - current.pitch) * k;
      return current;
    },
  };
}

function deadZone(v) {
  const z = 0.15;
  return Math.abs(v) < z ? 0 : Math.sign(v) * (Math.abs(v) - z) / (1 - z);
}

/** Camera target point for a viewpoint plus yaw/pitch offsets. */
export function lookTarget(position, lookAt, yaw, pitch) {
  const dx = lookAt[0] - position[0];
  const dy = lookAt[1] - position[1];
  const dz = lookAt[2] - position[2];
  const len = Math.hypot(dx, dy, dz);
  const baseYaw = Math.atan2(dx, -dz);
  const basePitch = Math.asin(dy / len);
  const y = baseYaw + yaw;
  const p = clamp(basePitch + pitch, -1.4, 1.4);
  return [
    position[0] + Math.cos(p) * Math.sin(y),
    position[1] + Math.sin(p),
    position[2] - Math.cos(p) * Math.cos(y),
  ];
}
