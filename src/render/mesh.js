// Builds flat-shaded, vertex-coloured triangle lists from primitives.
// Vertex layout: position(3) normal(3) colour(3) emissive(1) = 10 floats.
// Emissive: 0 = lit, 1 = self-lit, 2 = sky (window/lightning colour).

import { sub, cross, normalize } from './math.js';

export const FLOATS_PER_VERTEX = 10;

/** Rotates a point around the vertical axis. Positive angles turn +z toward +x. */
export function rotateY([x, y, z], a) {
  const c = Math.cos(a), s = Math.sin(a);
  return [x * c + z * s, y, -x * s + z * c];
}

export function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class MeshBuilder {
  constructor() {
    this.data = [];
    this.triangles = 0;
  }

  tri(a, b, c, color, emissive = 0) {
    const n = normalize(cross(sub(b, a), sub(c, a)));
    for (const v of [a, b, c]) this.data.push(v[0], v[1], v[2], n[0], n[1], n[2], color[0], color[1], color[2], emissive);
    this.triangles++;
    return this;
  }

  quad(a, b, c, d, color, emissive = 0) {
    this.tri(a, b, c, color, emissive);
    return this.tri(a, c, d, color, emissive);
  }

  /**
   * A quad split into nu x nv cells, so per-vertex light (a flashlight, a lantern)
   * can fall across it instead of only lighting its corners.
   */
  quadGrid(a, b, c, d, nu, nv, color, emissive = 0) {
    const at = (u, v) => [0, 1, 2].map((i) => {
      const ab = a[i] + (b[i] - a[i]) * u;
      const dc = d[i] + (c[i] - d[i]) * u;
      return ab + (dc - ab) * v;
    });
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nv; j++) {
        const u0 = i / nu, u1 = (i + 1) / nu, v0 = j / nv, v1 = (j + 1) / nv;
        this.quad(at(u0, v0), at(u1, v0), at(u1, v1), at(u0, v1), color, emissive);
      }
    }
    return this;
  }

  /** Appends another builder's triangles. */
  append(other) {
    for (const v of other.data) this.data.push(v);
    this.triangles += other.triangles;
    return this;
  }

  /** Axis-aligned box. `skip` lists faces to leave out: 'px','nx','py','ny','pz','nz'. */
  box([cx, cy, cz], [sx, sy, sz], color, emissive = 0, skip = []) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2;
    const y0 = cy - sy / 2, y1 = cy + sy / 2;
    const z0 = cz - sz / 2, z1 = cz + sz / 2;
    const faces = {
      px: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]],
      nx: [[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]],
      py: [[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]],
      ny: [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]],
      pz: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
      nz: [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]],
    };
    for (const [name, q] of Object.entries(faces)) {
      if (!skip.includes(name)) this.quad(q[0], q[1], q[2], q[3], color, emissive);
    }
    return this;
  }

  /** Box rotated by `angle` radians around the vertical axis through its centre. */
  boxRot([cx, cy, cz], [sx, sy, sz], angle, color, emissive = 0) {
    const p = (x, y, z) => {
      const [rx, , rz] = rotateY([x, 0, z], angle);
      return [cx + rx, cy + y, cz + rz];
    };
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const c = [
      p(-hx, -hy, -hz), p(hx, -hy, -hz), p(hx, hy, -hz), p(-hx, hy, -hz),
      p(-hx, -hy, hz), p(hx, -hy, hz), p(hx, hy, hz), p(-hx, hy, hz),
    ];
    const faces = [[1, 2, 6, 5], [4, 7, 3, 0], [3, 7, 6, 2], [0, 1, 5, 4], [4, 5, 6, 7], [1, 0, 3, 2]];
    for (const [a, b, d, e] of faces) this.quad(c[a], c[b], c[d], c[e], color, emissive);
    return this;
  }

  /** Low-poly ribbed sphere (pumpkins). */
  blob([cx, cy, cz], radius, scaleY, segments, rings, color, emissive = 0, ribs = 0) {
    const point = (i, j) => {
      const phi = (i / segments) * Math.PI * 2;
      const theta = (j / rings) * Math.PI;
      const rib = ribs ? 1 - 0.12 * (0.5 - 0.5 * Math.cos(phi * ribs)) : 1;
      const r = radius * rib * Math.sin(theta);
      return [cx + r * Math.cos(phi), cy + radius * scaleY * Math.cos(theta), cz + r * Math.sin(phi)];
    };
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < rings; j++) {
        const a = point(i, j), b = point(i + 1, j), c = point(i + 1, j + 1), d = point(i, j + 1);
        if (j > 0) this.tri(a, b, c, color, emissive);
        if (j < rings - 1) this.tri(a, c, d, color, emissive);
      }
    }
    return this;
  }

  build() {
    return new Float32Array(this.data);
  }
}
