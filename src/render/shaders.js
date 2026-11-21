// GLSL ES 1.0 shaders, kept as strings so the app needs no build step.
// Steering: .kiro/steering/art-style.md

/** PS1 pass: vertex snapping, per-vertex (Gouraud) lighting, fog. */
export const sceneVertex = `
attribute vec3 aPos;
attribute vec3 aNormal;
attribute vec3 aColor;
attribute float aEmissive;

uniform mat4 uViewProj;
uniform mat4 uModel;        // per mesh: moving parts (drawers, doors, the presence). Rigid only.
uniform float uHighlight;   // per mesh: lifts the colour of something the user can use
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
uniform vec3 uSpotPos;      // the flashlight (memories): position, direction, colour (0 = off)
uniform vec3 uSpotDir;
uniform vec3 uSpotColor;
uniform vec3 uSpotShape;    // cos(inner), cos(outer), range

varying vec3 vColor;
varying float vFog;
varying vec3 vNormal;       // world normal and view vector, for the glossy material
varying vec3 vView;
varying float vGloss;

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
// 5 water (rippled, not lit), 6 beneath the water (looks exactly like water until uReveal > 0),
// 7 glossy (lit, plus a studio reflection in the fragment shader: the inspect view).
void main() {
  vec3 p = aPos;
  vGloss = 0.0;
  vNormal = aNormal;
  vView = vec3(0.0, 0.0, 1.0);
  bool rain = aEmissive > 2.5 && aEmissive < 3.5;
  bool water = aEmissive > 4.5 && aEmissive < 5.5;
  bool beneath = aEmissive > 5.5 && aEmissive < 6.5;
  bool gloss = aEmissive > 6.5;
  float h = 0.0;
  if (rain) {
    // Each streak keeps its own phase in aNormal.x and falls through an 8 m column.
    p.y = mod(aNormal.x - uTime * 9.0, 8.0) + aPos.y;
  }
  if (water || beneath) {
    h = rippleHeight(p.xz);
    p.y += h;
  }
  p = (uModel * vec4(p, 1.0)).xyz;
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
    // A streak right next to the camera would fill the screen: drop it.
    if (distance(p.xz, uCamPos.xz) < 1.6) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
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

  vec3 n = normalize(mat3(uModel) * aNormal);
  vec3 light = uAmbient;
  for (int i = 0; i < 3; i++) {
    vec3 d = uLightPos[i] - p;
    float dist = max(length(d), 0.0001);
    float att = clamp(1.0 - dist / uLightRange[i], 0.0, 1.0);
    light += uLightColor[i] * att * att * (0.35 + 0.65 * abs(dot(n, d / dist)));
  }
  light += uFlashColor * uFlash * (0.2 + 0.6 * abs(dot(n, uFlashDir)));
  // Flashlight: a soft-edged cone. Surfaces are subdivided so the vertices can catch it.
  vec3 sd = p - uSpotPos;
  float sdist = max(length(sd), 0.0001);
  float cone = smoothstep(uSpotShape.y, uSpotShape.x, dot(sd / sdist, uSpotDir));
  float satt = clamp(1.0 - sdist / max(uSpotShape.z, 0.0001), 0.0, 1.0);
  float near = 0.45 + 0.55 * smoothstep(0.3, 1.8, sdist); // no blown-out close-ups
  light += uSpotColor * cone * satt * near * (0.4 + 0.6 * abs(dot(n, sd / sdist)));

  float self = gloss ? 0.0 : clamp(aEmissive, 0.0, 1.0);
  vColor = mix(aColor * light, aColor, self) + aColor * uHighlight;
  vFog = clamp((distance(p, uCamPos) - uFog.x) / (uFog.y - uFog.x), 0.0, 1.0);
  if (gloss) {
    vGloss = 1.0;
    vNormal = n;
    vView = p - uCamPos;
  }
}
`;

/**
 * Fog, brightness (gamma lift, so dark rooms stay readable), richer colour,
 * 4x4 Bayer dithering, 6 bits per channel. Brightness is applied before the
 * colours are reduced, so lifted shadows dither instead of banding.
 */
export const sceneFragment = `
precision mediump float;
varying vec3 vColor;
varying float vFog;
varying vec3 vNormal;
varying vec3 vView;
varying float vGloss;
uniform vec3 uFogColor;
uniform float uGamma;
uniform float uSweep;       // the inspect view's moving light, in radians

/** A dark studio around the object: a soft floor glow, a cool sky, and one bright strip light that sweeps. */
vec3 studio(vec3 r) {
  vec3 floorCol = vec3(0.05, 0.04, 0.05);
  vec3 skyCol = vec3(0.16, 0.2, 0.26);
  vec3 c = mix(floorCol, skyCol, smoothstep(-0.3, 0.7, r.y));
  float along = r.x * cos(uSweep) + r.z * sin(uSweep);
  c += vec3(1.0, 0.92, 0.82) * exp(-along * along * 30.0) * smoothstep(-0.1, 0.5, r.y) * 1.3;
  c += vec3(0.9, 0.35, 0.2) * exp(-(r.y + 0.15) * (r.y + 0.15) * 40.0) * 0.25; // warm horizon line
  return c;
}

float bayer2(vec2 a) { return mod(2.0 * a.x + 3.0 * a.y, 4.0); }
float bayer4(vec2 p) {
  vec2 a = mod(floor(p), 4.0);
  return (4.0 * bayer2(mod(a, 2.0)) + bayer2(floor(a / 2.0))) / 16.0;
}

void main() {
  vec3 base = vColor;
  if (vGloss > 0.5) {
    vec3 r = reflect(normalize(vView), normalize(vNormal));
    float fres = 0.25 + 0.75 * pow(1.0 - abs(dot(normalize(-vView), normalize(vNormal))), 3.0);
    base += studio(r) * fres;
  }
  vec3 col = max(mix(base, uFogColor, vFog), vec3(0.0));
  // Bright light can push a channel past 1. Scale the whole colour down
  // instead of clipping each channel, so lit orange stays orange (not yellow-green).
  col /= max(1.0, max(col.r, max(col.g, col.b)));
  col = pow(col, vec3(1.0 / uGamma));
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, 1.3);
  col /= max(1.0, max(col.r, max(col.g, col.b)));
  col += (bayer4(gl_FragCoord.xy) - 0.47) / 63.0;
  col = floor(clamp(col, 0.0, 1.0) * 63.0 + 0.5) / 63.0;
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

/**
 * Picture pass: VHS damage (line jitter, rolling tracking band, glitch, colour
 * bleed, grain), then the cinematic finish: glow around bright things, colour
 * grading (cool shadows, warm highlights), scanlines and a soft vignette.
 */
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
uniform vec2 uLowRes;       // low-res picture size (lines, pixels)
uniform vec2 uTexRes;       // size of the source texture
uniform float uContain;     // 1: fit a 4:3 canvas inside the screen without stretching
uniform float uScreenAspect;
uniform float uSrcAspect;
uniform float uBloom;
uniform float uScan;        // scanline strength (lower in clear-picture mode)
uniform float uGrade;       // how much colour grading to apply

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 glow(vec2 uv) {
  vec2 px = 1.0 / uTexRes;
  vec3 sum = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    float a = float(i) * 0.785398;
    vec2 d = vec2(cos(a), sin(a));
    sum += max(texture2D(uTex, uv + d * px * 2.5).rgb - 0.6, 0.0);
    sum += max(texture2D(uTex, uv + d * px * 6.0).rgb - 0.6, 0.0) * 0.6;
  }
  return sum / 8.0;
}

void main() {
  float t = uReduce > 0.5 ? 0.0 : uTime;
  vec2 uv = vUv;
  if (uContain > 0.5) {
    float s = uScreenAspect / uSrcAspect;
    if (s > 1.0) uv.x = (uv.x - 0.5) * s + 0.5;
    else uv.y = (uv.y - 0.5) / s + 0.5;
  }
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  float line = floor(uv.y * uLowRes.y);

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

  col = (col + glow(uv) * 1.1 * uBloom) * inside;

  // Colour grading: a little contrast, teal in the shadows, warmth in the light.
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 c01 = clamp(col, 0.0, 1.0);
  vec3 graded = mix(col, c01 * c01 * (3.0 - 2.0 * c01), 0.35);
  graded += vec3(-0.012, 0.012, 0.035) * (1.0 - smoothstep(0.0, 0.45, l));
  graded *= mix(vec3(1.0), vec3(1.07, 1.0, 0.9), smoothstep(0.35, 1.0, l));
  col = mix(col, graded, uGrade);

  // On-screen display, recorded "into" the tape so it bleeds and jitters too.
  // (The OSD is only shown over the scene, which always fills the screen.)
  vec4 oR = texture2D(uOsd, uv + vec2(off * 1.5, 0.0));
  vec4 oG = texture2D(uOsd, uv);
  vec4 oB = texture2D(uOsd, uv - vec2(off * 1.5, 0.0));
  col.r = mix(col.r, oR.r, oR.a * uOsdOn);
  col.g = mix(col.g, oG.g, oG.a * uOsdOn);
  col.b = mix(col.b, oB.b, oB.a * uOsdOn);

  float n = hash(floor(vUv * uLowRes) + fract(t * 7.0) * 113.0);
  col += (n - 0.5) * uNoise;
  col += band * 0.12 * hash(vec2(floor(vUv.x * uLowRes.x), line + t));

  // Scanlines: a dark gap at the bottom of every picture line.
  float row = fract(vUv.y * uLowRes.y);
  col *= 1.0 - uScan * 0.28 * smoothstep(0.55, 0.95, row);

  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 0.55;

  gl_FragColor = vec4(col * uFade, 1.0);
}
`;
