// GLSL ES 1.0 shaders, kept as strings so the app needs no build step.
// Steering: .kiro/steering/art-style.md

/** PS1 pass: vertex snapping, per-vertex (Gouraud) lighting, fog. */
export const sceneVertex = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute float aEmissive;

uniform mat4 uViewProj;
uniform vec2 uSnapRes;
uniform vec3 uAmbient;
uniform vec3 uLightPos[3];
uniform vec3 uLightColor[3];
uniform float uLightRange[3];
uniform vec3 uFlashDir;
uniform float uFlash;
uniform vec3 uFlashColor;
uniform vec3 uSky;
uniform vec3 uCamPos;
uniform vec2 uFog;
uniform float uTime;
uniform vec3 uRipples[8];   // (x, z, age in seconds); age < 0 = empty
uniform float uReveal;      // how much of what's beneath the water shows (0..1)
uniform vec3 uWater;        // plain water colour, shared by the water and what's beneath it

varying vec3 vColor;
varying float vFog;

float rippleHeight(vec2 xz) {
  float h = 0.0;
  for (int i = 0; i < 8; i++) {
    vec3 r = uRipples[i];
    if (r.z < 0.0 || r.z > 3.0) continue;
    float x = distance(xz, r.xy) - r.z * 0.8;
    // Wavelength ~0.7 m, wide enough for the water grid's vertices to catch.
    float env = exp(-x * x * 3.0) * exp(-r.z * 0.9) * smoothstep(0.0, 0.25, r.z);
    h += 0.04 * env * sin(x * 9.0);
  }
  return h;
}

// aEmissive codes: 0..1 lit -> self-lit, 2 sky (windows), 3 rain, 4 unfogged self-lit (moon),
// 5 water (rippled, not lit), 6 beneath the water (looks exactly like water until uReveal > 0).
void main() {
  vec3 p = aPos;
  bool rain = aEmissive > 2.5 && aEmissive < 3.5;
  bool water = aEmissive > 4.5 && aEmissive < 5.5;
  bool beneath = aEmissive > 5.5;
  float h = 0.0;
  if (rain) {
    // Each streak keeps its own phase in aNormal.x and falls through an 8 m column.
    p.y = mod(aNormal.x - uTime * 9.0, 8.0) + aPos.y;
  }
  if (water || beneath) {
    h = rippleHeight(p.xz);
    p.y += h;
  }
  vec4 clip = uViewProj * vec4(p, 1.0);
  if (clip.w > 0.0) {
    vec2 grid = uSnapRes * 0.5;
    vec2 ndc = clip.xy / clip.w;
    ndc = floor(ndc * grid + 0.5) / grid;
    clip.xy = ndc * clip.w;
  }
  gl_Position = clip;

  if (rain) {
    vColor = aColor * (0.3 + 1.2 * uFlash);
    vFog = clamp((distance(p, uCamPos) - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
    return;
  }
  if (water || beneath) {
    vec3 base = beneath ? uWater : aColor;
    // Crests catch the sky and the moon; troughs go darker.
    vec3 c = base * (1.0 + h * 20.0) + vec3(0.3, 0.2, 0.24) * max(h, 0.0) * 14.0;
    c = mix(c, uFlashColor * 0.35, uFlash * 0.5);
    if (beneath) c = mix(c, aColor, clamp(uReveal, 0.0, 1.0) * 0.9);
    vColor = c;
    vFog = clamp((distance(p, uCamPos) - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
    return;
  }
  if (aEmissive > 3.5) {
    vColor = aColor;
    vFog = 0.0;
    return;
  }
  if (aEmissive > 1.5) {
    vColor = mix(uSky, uFlashColor, uFlash);
    vFog = 0.0;
    return;
  }

  vec3 light = uAmbient;
  for (int i = 0; i < 3; i++) {
    vec3 d = uLightPos[i] - aPos;
    float dist = max(length(d), 0.0001);
    float att = clamp(1.0 - dist / uLightRange[i], 0.0, 1.0);
    light += uLightColor[i] * att * att * (0.35 + 0.65 * abs(dot(aNormal, d / dist)));
  }
  light += uFlashColor * uFlash * (0.2 + 0.6 * abs(dot(aNormal, uFlashDir)));

  vColor = mix(aColor * light, aColor, clamp(aEmissive, 0.0, 1.0));
  vFog = clamp((distance(aPos, uCamPos) - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
}
`;

/** Fog, 4x4 Bayer dithering, 5 bits per channel. */
export const sceneFragment = `
precision mediump float;
varying vec3 vColor;
varying float vFog;
uniform vec3 uFogColor;

float bayer2(vec2 a) { return mod(2.0 * a.x + 3.0 * a.y, 4.0); }
float bayer4(vec2 p) {
  vec2 a = mod(floor(p), 4.0);
  return (4.0 * bayer2(mod(a, 2.0)) + bayer2(floor(a / 2.0))) / 16.0;
}

void main() {
  vec3 col = mix(vColor, uFogColor, vFog);
  col += (bayer4(gl_FragCoord.xy) - 0.47) / 31.0;
  col = floor(clamp(col, 0.0, 1.0) * 31.0 + 0.5) / 31.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const vhsVertex = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

/** VHS pass: line jitter, rolling tracking band, glitch, colour bleed, grain, scanlines. */
export const vhsFragment = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform sampler2D uOsd;
uniform float uOsdOn;
uniform float uTime;
uniform float uTracking;
uniform float uBleed;
uniform float uNoise;
uniform float uGlitch;
uniform float uFade;
uniform float uReduce;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  float t = uReduce > 0.5 ? 0.0 : uTime;
  vec2 uv = vUv;
  float line = floor(uv.y * 240.0);

  uv.x += (hash(vec2(line, floor(t * 24.0))) - 0.5) * 0.003 * uTracking;

  float bandPos = 1.0 - fract(t * 0.045 + 0.3);
  float band = smoothstep(0.05, 0.0, abs(uv.y - bandPos)) * uTracking;
  uv.x += band * (hash(vec2(line, t)) - 0.5) * 0.03;

  float block = floor(uv.y * 18.0);
  float g = uGlitch * step(0.6, hash(vec2(block, floor(t * 16.0))));
  uv.x += g * (hash(vec2(block + 7.0, floor(t * 16.0))) - 0.5) * 0.2;

  float off = (0.0025 + 0.004 * uGlitch) * uBleed;
  vec3 col;
  col.r = texture2D(uTex, uv + vec2(off, 0.0)).r;
  col.g = texture2D(uTex, uv).g;
  col.b = texture2D(uTex, uv - vec2(off, 0.0)).b;

  // On-screen display, recorded "into" the tape so it bleeds and jitters too.
  vec4 oR = texture2D(uOsd, uv + vec2(off * 1.5, 0.0));
  vec4 oG = texture2D(uOsd, uv);
  vec4 oB = texture2D(uOsd, uv - vec2(off * 1.5, 0.0));
  col.r = mix(col.r, oR.r, oR.a * uOsdOn);
  col.g = mix(col.g, oG.g, oG.a * uOsdOn);
  col.b = mix(col.b, oB.b, oB.a * uOsdOn);

  float n = hash(floor(vUv * vec2(320.0, 240.0)) + fract(t * 7.0) * 113.0);
  col += (n - 0.5) * uNoise;
  col += band * 0.12 * hash(vec2(floor(vUv.x * 320.0), line + t));
  col *= 0.9 + 0.1 * step(0.5, fract(vUv.y * 240.0));

  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 0.9;

  gl_FragColor = vec4(col * uFade, 1.0);
}
`;
