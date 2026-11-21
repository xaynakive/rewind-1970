// Two-pass renderer: the scene draws into a 320x240 target (PS1 pass),
// then the VHS pass draws a texture (scene or 2D canvas) to the screen.

import { sceneVertex, sceneFragment, vhsVertex, vhsFragment } from './shaders.js';
import { FLOATS_PER_VERTEX } from './mesh.js';

export const LOW_W = 320;
export const LOW_H = 240;

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
  ]);
  const sceneA = {
    pos: gl.getAttribLocation(sceneProg, 'aPos'),
    normal: gl.getAttribLocation(sceneProg, 'aNormal'),
    color: gl.getAttribLocation(sceneProg, 'aColor'),
    emissive: gl.getAttribLocation(sceneProg, 'aEmissive'),
  };
  const vhsU = uniforms(gl, vhsProg, ['uTex', 'uOsd', 'uOsdOn', 'uTime', 'uTracking', 'uBleed', 'uNoise', 'uGlitch', 'uFade', 'uReduce']);
  const vhsPos = gl.getAttribLocation(vhsProg, 'aPos');

  // Low-res scene target.
  const sceneTex = nearestTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, LOW_W, LOW_H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  const depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, LOW_W, LOW_H);
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, sceneTex, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const canvasTex = nearestTexture(gl);
  const osdTex = nearestTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));

  const triangle = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const meshes = new Set();

  return {
    gl,

    createMesh(data) {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const mesh = { buffer, count: data.length / FLOATS_PER_VERTEX };
      meshes.add(mesh);
      return mesh;
    },

    disposeMesh(mesh) {
      gl.deleteBuffer(mesh.buffer);
      meshes.delete(mesh);
    },

    resize(cssW, cssH) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(1, Math.round(cssW * dpr));
      const h = Math.max(1, Math.round(cssH * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    },

    /** Draws meshes into the low-res target. */
    drawScene(meshList, f) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.viewport(0, 0, LOW_W, LOW_H);
      gl.clearColor(f.fogColor[0], f.fogColor[1], f.fogColor[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.disable(gl.CULL_FACE);
      gl.useProgram(sceneProg);

      gl.uniformMatrix4fv(sceneU.uViewProj, false, f.viewProj);
      gl.uniform2f(sceneU.uSnapRes, LOW_W / 2, LOW_H / 2);
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

      const stride = FLOATS_PER_VERTEX * 4;
      for (const a of Object.values(sceneA)) gl.enableVertexAttribArray(a);
      for (const m of meshList) {
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
     * Uploads a 2D canvas: 'main' is a VHS source (the boot screen),
     * 'osd' is the transparent on-screen display drawn over the scene.
     */
    uploadCanvas(source, which = 'main') {
      gl.bindTexture(gl.TEXTURE_2D, which === 'osd' ? osdTex : canvasTex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    },

    /** VHS pass to the screen. */
    present(p) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(vhsProg);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, p.source === 'canvas' ? canvasTex : sceneTex);
      gl.uniform1i(vhsU.uTex, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, osdTex);
      gl.uniform1i(vhsU.uOsd, 1);
      gl.uniform1f(vhsU.uOsdOn, p.osd ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform1f(vhsU.uTime, p.time);
      gl.uniform1f(vhsU.uTracking, p.tracking);
      gl.uniform1f(vhsU.uBleed, p.bleed);
      gl.uniform1f(vhsU.uNoise, p.noise);
      gl.uniform1f(vhsU.uGlitch, p.glitch);
      gl.uniform1f(vhsU.uFade, p.fade);
      gl.uniform1f(vhsU.uReduce, p.reduce ? 1 : 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, triangle);
      gl.enableVertexAttribArray(vhsPos);
      gl.vertexAttribPointer(vhsPos, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.disableVertexAttribArray(vhsPos);
    },
  };
}
