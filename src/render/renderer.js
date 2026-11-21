// Two-pass renderer: the scene draws into a low-resolution target (the PS1
// pass), then the picture pass (VHS damage, glow, grading, scanlines) draws a
// texture, the scene or a 2D canvas, to the full screen.
//
// The low-res target is always LOW_H lines tall; its width follows the
// screen's shape, so the picture fills the whole tab at any size.

import { sceneVertex, sceneFragment, vhsVertex, vhsFragment } from './shaders.js';
import { FLOATS_PER_VERTEX } from './mesh.js';

export const LOW_H = 288;
export const MAX_ASPECT = 2.4;
export const MIN_LOW_W = 220;
/** Shape of the 2D canvases (boot screen, final tape): 320x240. They're fitted, never stretched. */
export const CANVAS_ASPECT = 4 / 3;

/** Low-res target size for a screen of w x h CSS pixels. */
export function lowResFor(w, h) {
  const aspect = Math.min(MAX_ASPECT, Math.max(0.4, w / Math.max(1, h)));
  // Tall phone screens get more lines, so the picture is never narrower than MIN_LOW_W.
  const lines = Math.max(LOW_H, Math.round(MIN_LOW_W / aspect));
  return { w: Math.round(lines * aspect), h: lines };
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(`shader compile failed: ${gl.getShaderInfoLog(s)}`);
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`program link failed: ${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

function uniforms(gl, p, names) {
  const out = {};
  for (const n of names) out[n] = gl.getUniformLocation(p, n);
  return out;
}

function nearestTexture(gl) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

/** @returns {ReturnType<typeof build> | null} null if WebGL is unavailable */
export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false });
  if (!gl) return null;
  return build(gl, canvas);
}

function build(gl, canvas) {
  const sceneProg = program(gl, sceneVertex, sceneFragment);
  const vhsProg = program(gl, vhsVertex, vhsFragment);

  const sceneU = uniforms(gl, sceneProg, [
    'uViewProj', 'uSnapRes', 'uAmbient', 'uLightPos', 'uLightColor', 'uLightRange',
    'uFlashDir', 'uFlash', 'uFlashColor', 'uSky', 'uCamPos', 'uFog', 'uFogColor', 'uTime',
    'uRipples', 'uReveal', 'uWater', 'uGamma',
    'uModel', 'uHighlight', 'uSpotPos', 'uSpotDir', 'uSpotColor', 'uSpotShape', 'uSweep',
  ]);
  const IDENTITY = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const noRipples = new Float32Array(24).fill(-1);
  const sceneA = {
    pos: gl.getAttribLocation(sceneProg, 'aPos'),
    normal: gl.getAttribLocation(sceneProg, 'aNormal'),
    color: gl.getAttribLocation(sceneProg, 'aColor'),
    emissive: gl.getAttribLocation(sceneProg, 'aEmissive'),
  };
  const vhsU = uniforms(gl, vhsProg, [
    'uTex', 'uOsd', 'uOsdOn', 'uTime', 'uTracking', 'uBleed', 'uNoise', 'uGlitch', 'uFade', 'uReduce',
    'uLowRes', 'uTexRes', 'uContain', 'uScreenAspect', 'uSrcAspect', 'uBloom', 'uScan', 'uGrade',
  ]);
  const vhsPos = gl.getAttribLocation(vhsProg, 'aPos');

  // Low-res scene target, resized with the screen.
  const sceneTex = nearestTexture(gl);
  const depth = gl.createRenderbuffer();
  const fbo = gl.createFramebuffer();
  let low = { w: 0, h: 0 };
  function setLowRes(w, h) {
    if (w === low.w && h === low.h) return;
    low = { w, h };
    gl.bindTexture(gl.TEXTURE_2D, sceneTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  setLowRes(Math.round(LOW_H * CANVAS_ASPECT), LOW_H);

  const canvasTex = nearestTexture(gl);
  const osdTex = nearestTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
  let canvasSize = [320, 240];

  const triangle = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  /** Picture settings: gamma lifts the shadows; `clear` turns the film damage down for low vision. */
  let picture = { gamma: 1.7, clear: false };
  /** Extra resolution for the scene pass (the inspect view uses 2). */
  let detail = 1;
  let stageSize = null;
  function fitLowRes() {
    if (!stageSize) return;
    const lr = lowResFor(stageSize.w, stageSize.h);
    setLowRes(lr.w * detail, lr.h * detail);
  }

  return {
    gl,
    get lowRes() { return { ...low }; },

    setPicture(next) {
      picture = { ...picture, ...next };
    },

    /** Scene-pass resolution multiplier: 1 normally, 2 for close-ups. */
    setDetail(k) {
      if (k === detail) return;
      detail = k;
      fitLowRes();
    },

    createMesh(data) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      return { buffer, count: data.length / FLOATS_PER_VERTEX };
    },

    disposeMesh(mesh) {
      gl.deleteBuffer(mesh.buffer);
    },

    /** Fits the screen canvas and the low-res target to a w x h CSS-pixel stage. */
    resize(cssW, cssH) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      stageSize = { w: cssW, h: cssH };
      fitLowRes();
    },

    /** Draws meshes into the low-res target. */
    drawScene(meshList, f) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, low.w, low.h);
      const fog = f.fogColor.map((c) => c ** (1 / picture.gamma));
      gl.clearColor(fog[0], fog[1], fog[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(sceneProg);

      gl.uniformMatrix4fv(sceneU.uViewProj, false, f.viewProj);
      gl.uniform2f(sceneU.uSnapRes, low.w / 2, low.h / 2);
      gl.uniform3fv(sceneU.uAmbient, f.ambient);
      gl.uniform3fv(sceneU.uLightPos, f.lights.flatMap((l) => l.pos));
      gl.uniform3fv(sceneU.uLightColor, f.lights.flatMap((l) => l.color.map((c) => c * l.intensity)));
      gl.uniform1fv(sceneU.uLightRange, f.lights.map((l) => l.range));
      gl.uniform3fv(sceneU.uFlashDir, f.flashDir);
      gl.uniform1f(sceneU.uFlash, f.flash);
      gl.uniform3fv(sceneU.uFlashColor, f.flashColor);
      gl.uniform3fv(sceneU.uSky, f.sky);
      gl.uniform3fv(sceneU.uCamPos, f.camPos);
      gl.uniform2f(sceneU.uFog, f.fogNear, f.fogFar);
      gl.uniform3fv(sceneU.uFogColor, f.fogColor);
      gl.uniform1f(sceneU.uTime, (f.time ?? 0) % 10000);
      gl.uniform3fv(sceneU.uRipples, f.ripples ?? noRipples);
      gl.uniform1f(sceneU.uReveal, f.reveal ?? 0);
      gl.uniform3fv(sceneU.uWater, f.water ?? [0, 0, 0]);
      gl.uniform1f(sceneU.uGamma, picture.gamma);
      const spot = f.spot;
      gl.uniform3fv(sceneU.uSpotPos, spot ? spot.pos : [0, 0, 0]);
      gl.uniform3fv(sceneU.uSpotDir, spot ? spot.dir : [0, 0, -1]);
      gl.uniform3fv(sceneU.uSpotColor, spot ? spot.color.map((c) => c * spot.intensity) : [0, 0, 0]);
      gl.uniform3f(sceneU.uSpotShape, spot ? Math.cos(spot.inner) : 1, spot ? Math.cos(spot.outer) : 1, spot ? spot.range : 1);
      gl.uniform1f(sceneU.uSweep, f.sweep ?? 0);

      const stride = FLOATS_PER_VERTEX * 4;
      for (const a of Object.values(sceneA)) gl.enableVertexAttribArray(a);
      for (const m of meshList) {
        if (m.hidden) continue;
        gl.uniformMatrix4fv(sceneU.uModel, false, m.model ?? IDENTITY);
        gl.uniform1f(sceneU.uHighlight, m.highlight ?? 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.buffer);
        gl.vertexAttribPointer(sceneA.pos, 3, gl.FLOAT, false, stride, 0);
        gl.vertexAttribPointer(sceneA.normal, 3, gl.FLOAT, false, stride, 12);
        gl.vertexAttribPointer(sceneA.color, 3, gl.FLOAT, false, stride, 24);
        gl.vertexAttribPointer(sceneA.emissive, 1, gl.FLOAT, false, stride, 36);
        gl.drawArrays(gl.TRIANGLES, 0, m.count);
      }
      for (const a of Object.values(sceneA)) gl.disableVertexAttribArray(a);
    },

    /**
     * Uploads a 2D canvas: 'main' is a picture source (boot screen, final tape),
     * 'osd' is the transparent on-screen display drawn over the scene.
     */
    uploadCanvas(source, which = 'main') {
      gl.bindTexture(gl.TEXTURE_2D, which === 'osd' ? osdTex : canvasTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      if (which === 'main') canvasSize = [source.width, source.height];
    },

    /** Picture pass to the screen. */
    present(p) {
      // Clear picture: much less damage, softer scanlines, still the same mood.
      const k = picture.clear ? 0.3 : 1;
      const fromCanvas = p.source === 'canvas';
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(vhsProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, fromCanvas ? canvasTex : sceneTex);
      gl.uniform1i(vhsU.uTex, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, osdTex);
      gl.uniform1i(vhsU.uOsd, 1);
      gl.uniform1f(vhsU.uOsdOn, p.osd ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1f(vhsU.uTime, p.time);
      gl.uniform1f(vhsU.uTracking, p.tracking * k);
      gl.uniform1f(vhsU.uBleed, p.bleed * (picture.clear ? 0.5 : 1));
      gl.uniform1f(vhsU.uNoise, p.noise * k);
      gl.uniform1f(vhsU.uGlitch, p.glitch * (picture.clear ? 0.5 : 1));
      gl.uniform1f(vhsU.uFade, p.fade);
      gl.uniform1f(vhsU.uReduce, p.reduce ? 1 : 0);
      gl.uniform2f(vhsU.uLowRes, low.w, low.h);
      gl.uniform2f(vhsU.uTexRes, ...(fromCanvas ? canvasSize : [low.w, low.h]));
      gl.uniform1f(vhsU.uContain, fromCanvas ? 1 : 0);
      gl.uniform1f(vhsU.uScreenAspect, canvas.width / canvas.height);
      gl.uniform1f(vhsU.uSrcAspect, canvasSize[0] / canvasSize[1]);
      gl.uniform1f(vhsU.uBloom, p.bloom ?? 1);
      gl.uniform1f(vhsU.uScan, picture.clear ? 0.35 : 1);
      gl.uniform1f(vhsU.uGrade, fromCanvas ? 0.4 : 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.enableVertexAttribArray(vhsPos);
      gl.vertexAttribPointer(vhsPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(vhsPos);
    },
  };
}
