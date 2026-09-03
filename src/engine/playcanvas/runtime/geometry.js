// 引擎层 · 程序化网格构建器（浏览器运行时片段）。
// 所有几何都是平面着色（每个面独立顶点与法线），颜色烤进顶点色（sRGB 字节）。
// 依赖注入：pc（PlayCanvas 命名空间）与 device（GraphicsDevice）；Node 单测时可传假对象。

export function createGeometryKit(pc, device) {
  class GeoBuilder {
    constructor() { this.positions = []; this.normals = []; this.uvs = []; this.colors = []; this.indices = []; this.count = 0; }
    vertex(p, n, uv, color) {
      this.positions.push(p[0], p[1], p[2]); this.normals.push(n[0], n[1], n[2]); this.uvs.push(uv[0], uv[1]);
      this.colors.push((color >> 16) & 255, (color >> 8) & 255, color & 255, 255);
      return this.count++;
    }
    // 三角形：法线由顶点顺序决定；outward 给出时自动把法线翻到与之同向。
    tri(a, b, c, color, outward, uvs) {
      let n = cross(sub(b, a), sub(c, a));
      const len = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / len, n[1] / len, n[2] / len];
      let order = [a, b, c]; let uvo = uvs || [[a[0], a[2]], [b[0], b[2]], [c[0], c[2]]];
      if (outward && dot(n, outward) < 0) { n = [-n[0], -n[1], -n[2]]; order = [a, c, b]; uvo = [uvo[0], uvo[2], uvo[1]]; }
      const i0 = this.vertex(order[0], n, uvo[0], color); const i1 = this.vertex(order[1], n, uvo[1], color); const i2 = this.vertex(order[2], n, uvo[2], color);
      this.indices.push(i0, i1, i2);
    }
    quad(a, b, c, d, color, outward, uvs) {
      let n = cross(sub(b, a), sub(c, a));
      const len = Math.hypot(n[0], n[1], n[2]) || 1; n = [n[0] / len, n[1] / len, n[2] / len];
      let order = [a, b, c, d]; let uvo = uvs || planarUv([a, b, c, d], n);
      if (outward && dot(n, outward) < 0) { n = [-n[0], -n[1], -n[2]]; order = [a, d, c, b]; uvo = [uvo[0], uvo[3], uvo[2], uvo[1]]; }
      const i = order.map((p, k) => this.vertex(p, n, uvo[k], color));
      this.indices.push(i[0], i[1], i[2], i[0], i[2], i[3]);
    }
    polygon(points3, triangles, color, outward, uvs) {
      triangles.forEach((t) => this.tri(points3[t[0]], points3[t[1]], points3[t[2]], color, outward, uvs ? [uvs[t[0]], uvs[t[1]], uvs[t[2]]] : null));
    }
    triangleCount() { return this.indices.length / 3; }
    build() {
      const geometry = new pc.Geometry();
      geometry.positions = this.positions; geometry.normals = this.normals; geometry.uvs = this.uvs; geometry.colors = this.colors; geometry.indices = this.indices;
      return pc.Mesh.fromGeometry(device, geometry);
    }
  }
  function sub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
  function planarUv(points, n) {
    const ax = Math.abs(n[0]); const ay = Math.abs(n[1]); const az = Math.abs(n[2]);
    if (ay >= ax && ay >= az) return points.map((p) => [p[0], p[2]]);
    if (ax >= az) return points.map((p) => [p[2], p[1]]);
    return points.map((p) => [p[0], p[1]]);
  }
  // 耳切法三角化简单多边形（支持凹形：星、松树、纸浪、月牙）；失败时退化为扇形。
  function triangulate(points) {
    const n = points.length; if (n < 3) return [];
    let area = 0; for (let i = 0; i < n; i += 1) { const j = (i + 1) % n; area += points[i][0] * points[j][1] - points[j][0] * points[i][1]; }
    const idx = []; for (let i = 0; i < n; i += 1) idx.push(i); if (area < 0) idx.reverse();
    const crossZ = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const inside = (p, a, b, c) => crossZ(a, b, p) >= -1e-9 && crossZ(b, c, p) >= -1e-9 && crossZ(c, a, p) >= -1e-9;
    const out = []; let guard = 0;
    while (idx.length > 3 && guard < 5000) {
      guard += 1; let clipped = false;
      for (let i = 0; i < idx.length; i += 1) {
        const ia = idx[(i + idx.length - 1) % idx.length]; const ib = idx[i]; const ic = idx[(i + 1) % idx.length];
        const a = points[ia]; const b = points[ib]; const c = points[ic];
        if (crossZ(a, b, c) <= 1e-9) continue;
        let ok = true;
        for (let k = 0; k < idx.length; k += 1) { const q = idx[k]; if (q === ia || q === ib || q === ic) continue; if (inside(points[q], a, b, c)) { ok = false; break; } }
        if (!ok) continue;
        out.push([ia, ib, ic]); idx.splice(i, 1); clipped = true; break;
      }
      if (!clipped) { for (let i = 1; i < idx.length - 1; i += 1) out.push([idx[0], idx[i], idx[i + 1]]); return out; }
    }
    if (idx.length === 3) out.push([idx[0], idx[1], idx[2]]);
    return out;
  }
  function insetPolygon(points, rim) {
    let cx = 0; let cy = 0; points.forEach((p) => { cx += p[0]; cy += p[1]; }); cx /= points.length; cy /= points.length;
    let minR = Infinity; points.forEach((p) => { minR = Math.min(minR, Math.hypot(p[0] - cx, p[1] - cy)); });
    const r = Math.min(rim, minR * 0.35);
    return points.map((p) => { const d = Math.hypot(p[0] - cx, p[1] - cy) || 1; return [p[0] + (cx - p[0]) / d * r, p[1] + (cy - p[1]) / d * r]; });
  }
  const meshCache = new Map();
  // 缓存的网格被多个实体共用：多加一次引用计数，避免最后一个实体销毁时把网格一起销毁。
  function cachedMesh(key, build) { if (!meshCache.has(key)) { const mesh = build(); if (mesh && typeof mesh.incRefCount === "function") mesh.incRefCount(); meshCache.set(key, mesh); } return meshCache.get(key); }
  function round3(v) { return Math.round(v * 1000) / 1000; }
  // 斜切盒：6 个主面 + 12 条斜切边（edge 色）+ 8 个角三角形；bevel 为 0 时是普通盒。uvOffset 让每格纹理错开。
  function boxMesh(w, h, d, color, edgeColor, bevel, uvOffset) {
    const key = ["box", round3(w), round3(h), round3(d), color, edgeColor, round3(bevel || 0), uvOffset ? uvOffset.map(round3).join(",") : ""].join("|");
    return cachedMesh(key, () => buildBox(w, h, d, () => color, edgeColor, bevel, uvOffset).build());
  }
  // 盒子构造核心：faceColor(axis, sign) 允许按面给色（受光 / 背光面）。返回 GeoBuilder，供调用方继续追加几何。
  function buildBox(w, h, d, faceColor, edgeColor, bevel, uvOffset) {
    const g = new GeoBuilder();
    const hw = w / 2; const hh = h / 2; const hd = d / 2;
    const b = Math.min(bevel || 0, hw * 0.45, hh * 0.45, hd * 0.45);
    const off = uvOffset || [0, 0];
    const P = (sx, sy, sz, axis) => axis === "x" ? [sx * hw, sy * (hh - b), sz * (hd - b)] : axis === "y" ? [sx * (hw - b), sy * hh, sz * (hd - b)] : [sx * (hw - b), sy * (hh - b), sz * hd];
    const face = (axis, sign) => {
      const pts = axis === "x" ? [P(sign, -1, -1, "x"), P(sign, 1, -1, "x"), P(sign, 1, 1, "x"), P(sign, -1, 1, "x")]
        : axis === "y" ? [P(-1, sign, -1, "y"), P(1, sign, -1, "y"), P(1, sign, 1, "y"), P(-1, sign, 1, "y")]
        : [P(-1, -1, sign, "z"), P(1, -1, sign, "z"), P(1, 1, sign, "z"), P(-1, 1, sign, "z")];
      const outward = axis === "x" ? [sign, 0, 0] : axis === "y" ? [0, sign, 0] : [0, 0, sign];
      const uv = planarUv(pts, outward).map((t) => [t[0] + off[0], t[1] + off[1]]);
      g.quad(pts[0], pts[1], pts[2], pts[3], faceColor(axis, sign), outward, uv);
    };
    ["x", "y", "z"].forEach((axis) => { face(axis, 1); face(axis, -1); });
    if (b > 0) {
      const ec = edgeColor;
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.quad(P(sx, sy, -1, "x"), P(sx, sy, 1, "x"), P(sx, sy, 1, "y"), P(sx, sy, -1, "y"), ec, [sx, sy, 0]);
      for (const sy of [-1, 1]) for (const sz of [-1, 1]) g.quad(P(-1, sy, sz, "y"), P(1, sy, sz, "y"), P(1, sy, sz, "z"), P(-1, sy, sz, "z"), ec, [0, sy, sz]);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.quad(P(sx, -1, sz, "x"), P(sx, 1, sz, "x"), P(sx, 1, sz, "z"), P(sx, -1, sz, "z"), ec, [sx, 0, sz]);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) g.tri(P(sx, sy, sz, "x"), P(sx, sy, sz, "y"), P(sx, sy, sz, "z"), ec, [sx, sy, sz]);
    }
    return g;
  }
  // 纸片 / 挤出多边形：二维轮廓沿 z 挤出 depth，正面朝 +z；正反面外圈 rim 宽的 edge 色窄边，侧壁 edge 色。rim 为 0 时就是普通挤出体。
  function sheetMesh(points, depth, color, edgeColor, rim) {
    const key = ["sheet", points.map((p) => round3(p[0]) + "," + round3(p[1])).join(";"), round3(depth), color, edgeColor, round3(rim)].join("|");
    return cachedMesh(key, () => {
      const g = new GeoBuilder();
      const hz = depth / 2;
      const n = points.length;
      const inner = rim > 0 ? insetPolygon(points, rim) : points;
      const tris = triangulate(inner);
      for (const sign of [1, -1]) {
        const lift = (pts) => pts.map((p) => [p[0], p[1], sign * hz]);
        const out3 = lift(points); const in3 = lift(inner);
        g.polygon(in3, tris, color, [0, 0, sign], inner.map((p) => [p[0], p[1]]));
        if (rim > 0) for (let i = 0; i < n; i += 1) { const j = (i + 1) % n; g.quad(out3[i], out3[j], in3[j], in3[i], edgeColor, [0, 0, sign]); }
      }
      let cx = 0; let cy = 0; points.forEach((p) => { cx += p[0]; cy += p[1]; }); cx /= n; cy /= n;
      for (let i = 0; i < n; i += 1) {
        const j = (i + 1) % n;
        const a = [points[i][0], points[i][1], hz]; const b = [points[j][0], points[j][1], hz]; const c = [points[j][0], points[j][1], -hz]; const d = [points[i][0], points[i][1], -hz];
        g.quad(a, b, c, d, edgeColor, [(points[i][0] + points[j][0]) / 2 - cx, (points[i][1] + points[j][1]) / 2 - cy, 0]);
      }
      return g.build();
    });
  }
  function extrudeMesh(points, depth, color, sideColor) { return sheetMesh(points, depth, color, sideColor === undefined ? color : sideColor, 0); }
  // 圆锥 / 圆柱 / 半球 / 二十面体 / 八面体 / 圆环 / 圆盘 / 双面三角 / 平面：低段数平面着色。
  function coneMesh(radius, height, segments, color, edgeColor) {
    return cachedMesh(["cone", round3(radius), round3(height), segments, color, edgeColor].join("|"), () => {
      const g = new GeoBuilder(); const ring = [];
      for (let i = 0; i < segments; i += 1) { const a = i / segments * Math.PI * 2; ring.push([Math.cos(a) * radius, -height / 2, Math.sin(a) * radius]); }
      const apex = [0, height / 2, 0];
      for (let i = 0; i < segments; i += 1) { const j = (i + 1) % segments; g.tri(ring[i], ring[j], apex, color, [ring[i][0] + ring[j][0], height * 0.4, ring[i][2] + ring[j][2]]); }
      const center = [0, -height / 2, 0];
      for (let i = 0; i < segments; i += 1) { const j = (i + 1) % segments; g.tri(ring[i], ring[j], center, edgeColor === undefined ? color : edgeColor, [0, -1, 0]); }
      return g.build();
    });
  }
  function cylinderMesh(rTop, rBottom, height, segments, color, edgeColor) {
    return cachedMesh(["cyl", round3(rTop), round3(rBottom), round3(height), segments, color, edgeColor].join("|"), () => {
      const g = new GeoBuilder(); const top = []; const bottom = [];
      for (let i = 0; i < segments; i += 1) { const a = i / segments * Math.PI * 2; top.push([Math.cos(a) * rTop, height / 2, Math.sin(a) * rTop]); bottom.push([Math.cos(a) * rBottom, -height / 2, Math.sin(a) * rBottom]); }
      for (let i = 0; i < segments; i += 1) { const j = (i + 1) % segments; g.quad(bottom[i], bottom[j], top[j], top[i], color, [bottom[i][0] + bottom[j][0], 0, bottom[i][2] + bottom[j][2]]); }
      const cap = (ring, y, sign, r) => {
        const ec = edgeColor === undefined ? color : edgeColor;
        const rim = Math.min(0.03, r * 0.3); const innerRing = ring.map((p) => [p[0] * (1 - rim / Math.max(r, 1e-6)), y, p[2] * (1 - rim / Math.max(r, 1e-6))]);
        for (let i = 0; i < segments; i += 1) { const j = (i + 1) % segments; g.quad(ring[i], ring[j], innerRing[j], innerRing[i], ec, [0, sign, 0]); g.tri(innerRing[i], innerRing[j], [0, y, 0], color, [0, sign, 0]); }
      };
      if (rTop > 0) cap(top, height / 2, 1, rTop);
      cap(bottom, -height / 2, -1, rBottom);
      return g.build();
    });
  }
  function domeMesh(radius, segments, rings, color) {
    return cachedMesh(["dome", round3(radius), segments, rings, color].join("|"), () => {
      const g = new GeoBuilder();
      const point = (i, k) => { const phi = k / rings * Math.PI / 2; const a = i / segments * Math.PI * 2; return [Math.cos(a) * Math.cos(phi) * radius, Math.sin(phi) * radius, Math.sin(a) * Math.cos(phi) * radius]; };
      for (let k = 0; k < rings; k += 1) for (let i = 0; i < segments; i += 1) {
        const j = (i + 1) % segments; const a = point(i, k); const b = point(j, k); const c = point(j, k + 1); const d = point(i, k + 1);
        const outward = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2 + 0.01, (a[2] + c[2]) / 2];
        if (k === rings - 1) g.tri(a, b, [0, radius, 0], color, outward); else g.quad(a, b, c, d, color, outward);
      }
      return g.build();
    });
  }
  function icoMesh(radius, color) {
    return cachedMesh(["ico", round3(radius), color].join("|"), () => {
      const t = (1 + Math.sqrt(5)) / 2; const s = radius / Math.hypot(1, t);
      const v = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((p) => [p[0] * s, p[1] * s, p[2] * s]);
      const f = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
      const g = new GeoBuilder();
      f.forEach((tri) => { const a = v[tri[0]]; const b = v[tri[1]]; const c = v[tri[2]]; g.tri(a, b, c, color, [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]); });
      return g.build();
    });
  }
  function octahedronMesh(radius, color) {
    return cachedMesh(["octa", round3(radius), color].join("|"), () => {
      const g = new GeoBuilder(); const r = radius;
      const v = [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]];
      const f = [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 2, 5], [1, 5, 3], [1, 3, 4], [1, 4, 2]];
      f.forEach((tri) => { const a = v[tri[0]]; const b = v[tri[1]]; const c = v[tri[2]]; g.tri(a, b, c, color, [a[0] + b[0] + c[0], a[1] + b[1] + c[1], a[2] + b[2] + c[2]]); });
      return g.build();
    });
  }
  function torusMesh(radius, tube, radial, tubular, color) {
    return cachedMesh(["torus", round3(radius), round3(tube), radial, tubular, color].join("|"), () => {
      const g = new GeoBuilder();
      const point = (i, k) => { const u = i / tubular * Math.PI * 2; const v = k / radial * Math.PI * 2; return [(radius + tube * Math.cos(v)) * Math.cos(u), tube * Math.sin(v), (radius + tube * Math.cos(v)) * Math.sin(u)]; };
      for (let i = 0; i < tubular; i += 1) for (let k = 0; k < radial; k += 1) {
        const a = point(i, k); const b = point(i + 1, k); const c = point(i + 1, k + 1); const d = point(i, k + 1);
        const u = (i + 0.5) / tubular * Math.PI * 2; const center = [radius * Math.cos(u), 0, radius * Math.sin(u)];
        const mid = [(a[0] + c[0]) / 2 - center[0], (a[1] + c[1]) / 2, (a[2] + c[2]) / 2 - center[2]];
        g.quad(a, b, c, d, color, mid);
      }
      return g.build();
    });
  }
  function discMesh(radius, segments, color) {
    return cachedMesh(["disc", round3(radius), segments, color].join("|"), () => {
      const g = new GeoBuilder(); const ring = [];
      for (let i = 0; i < segments; i += 1) { const a = i / segments * Math.PI * 2; ring.push([Math.cos(a) * radius, 0, Math.sin(a) * radius]); }
      for (let i = 0; i < segments; i += 1) g.tri(ring[i], ring[(i + 1) % segments], [0, 0, 0], color, [0, 1, 0]);
      return g.build();
    });
  }
  // 双面三角纸片（旗、鸟翼）：正反各一份。
  function triangleMesh(points3, color) {
    return cachedMesh(["tri3", points3.map((p) => p.map(round3).join(",")).join(";"), color].join("|"), () => {
      const g = new GeoBuilder();
      g.tri(points3[0], points3[1], points3[2], color);
      g.tri(points3[0], points3[2], points3[1], color);
      return g.build();
    });
  }
  function planeMesh(w, d, color) {
    return cachedMesh(["plane", round3(w), round3(d), color].join("|"), () => {
      const g = new GeoBuilder(); const hw = w / 2; const hd = d / 2;
      g.quad([-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd], color, [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]]);
      return g.build();
    });
  }
  // 常用二维轮廓。
  function starPoints(radius, y, count) {
    const points = []; const total = (count || 5) * 2;
    for (let index = 0; index < total; index += 1) { const angle = (index / total) * Math.PI * 2 - Math.PI / 2; const r = index % 2 === 0 ? radius : radius * 0.5; points.push([Math.cos(angle) * r, (y || 0) + Math.sin(angle) * r]); }
    return points;
  }
  function hexPoints(radius, y) { const points = []; for (let index = 0; index < 6; index += 1) points.push([Math.cos(index / 6 * Math.PI * 2) * radius, (y || 0) + Math.sin(index / 6 * Math.PI * 2) * radius]); return points; }
  return { GeoBuilder, sub, cross, dot, planarUv, triangulate, insetPolygon, meshCache, cachedMesh, round3, buildBox, boxMesh, sheetMesh, extrudeMesh, coneMesh, cylinderMesh, domeMesh, icoMesh, octahedronMesh, torusMesh, discMesh, triangleMesh, planeMesh, starPoints, hexPoints };
}
