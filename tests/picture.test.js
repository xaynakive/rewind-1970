import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fovForAspect, MIN_V, MAX_V } from '../src/render/camera.js';
import { lowResFor, LOW_H, MAX_ASPECT, MIN_LOW_W } from '../src/render/renderer.js';
import { brightnessToGamma, clampBrightness, BRIGHTNESS_DEFAULT } from '../src/core/settings.js';

const DEG = Math.PI / 180;
const hfov = (aspect) => 2 * Math.atan(Math.tan(fovForAspect(aspect) / 2) * aspect);

test('4:3 keeps the framing the rooms were built for', () => {
  assert.ok(Math.abs(fovForAspect(4 / 3) - 58 * DEG) < 1e-9);
});

test('wide screens see more to the sides, never less than before', () => {
  assert.ok(hfov(16 / 9) > hfov(4 / 3));
  assert.ok(fovForAspect(21 / 9) >= MIN_V);
});

test('tall phone screens widen the view, but never past 90 degrees', () => {
  assert.ok(fovForAspect(390 / 844) <= MAX_V + 1e-9);
  assert.ok(fovForAspect(3 / 4) > 58 * DEG);
});

test('the picture is always the same number of lines, and its width follows the screen', () => {
  assert.deepEqual(lowResFor(1920, 1080), { w: Math.round(LOW_H * 16 / 9), h: LOW_H });
  assert.equal(lowResFor(8000, 100).w, Math.round(LOW_H * MAX_ASPECT));
});

test('tall phones get more lines, so the picture is never too narrow for the on-screen text', () => {
  const phone = lowResFor(390, 844);
  assert.ok(phone.w >= MIN_LOW_W - 1 && phone.h > LOW_H);
  assert.ok(Math.abs(phone.w / phone.h - 390 / 844) < 0.01, 'keeps the screen shape');
});

test('brightness maps to a gamma lift, brighter as it goes up', () => {
  assert.ok(brightnessToGamma(100) > brightnessToGamma(BRIGHTNESS_DEFAULT));
  assert.ok(brightnessToGamma(BRIGHTNESS_DEFAULT) > brightnessToGamma(0));
  assert.equal(brightnessToGamma(0), 1.2);
  assert.equal(clampBrightness(400), 100);
  assert.equal(clampBrightness(Number.NaN), BRIGHTNESS_DEFAULT);
});
