// 纸境 · 立体书迷宫 PlayCanvas 运行时 —— 第 1 段：引擎启动、色板、几何构造器、材质。
// 注意：本段是浏览器脚本的模板字面量片段，内部不能出现 ${ 与反斜杠转义。
export const popupEngineScript = `
const palettes = {
  // 晨光草甸：奶油纸、鼠尾草绿、万寿菊，墨蓝只做书封与细节。
  1: { sky: 0xf6eedc, fog: 0xf6eedc, desk: 0xeadfc6, cover: 0x3a4a6c, page: 0xf3e9d2, top: [0x8fae7a, 0x86a571], side: 0xd9c39a, sideShade: 0xb99e73, edge: 0xfffaf0, accent: 0xe8b23a, accent2: 0xd97f66, tree: 0x6f8f6a, treeLight: 0x8fae82, bush: 0x9db88a, flower: [0xecb63b, 0xfff6e6, 0xd97f66], hazard: 0x8fb7b0, bird: 0xfaf3e3, decal: "decal-meadow.png", star: 0xf4b93a, sunColor: 0xfff1d2, sunIntensity: 1.55, hemiSky: 0xeef4ff, hemiGround: 0xa08a63, hemiIntensity: 0.55, exposure: 1.0, backdrop: [0x8fae7a, 0x789a68, 0xe8dcc2] },
  // 海岸灯塔：奶油、珊瑚、海泡绿、墨蓝。
  2: { sky: 0xe3edee, fog: 0xe3edee, desk: 0xdfe6e0, cover: 0x24395e, page: 0xf1e8d4, top: [0x9cc9c0, 0x90bdb4], side: 0xe3d3b3, sideShade: 0xc4b18a, edge: 0xfffdf6, accent: 0xd97d64, accent2: 0x27406a, tree: 0x7fa39a, treeLight: 0x9fbfb6, bush: 0x8fb5ad, flower: [0xd97d64, 0xfff8ee, 0xf0c46a], hazard: 0x6fa6b8, bird: 0xffffff, decal: "decal-coast.png", star: 0xf4b93a, sunColor: 0xfff6e6, sunIntensity: 1.55, hemiSky: 0xeaf7ff, hemiGround: 0x8a9c9e, hemiIntensity: 0.55, exposure: 1.0, backdrop: [0x9cc9c0, 0x6fa6b8, 0xf3ede0] },
  // 灯笼夜市：墨蓝夜空、李子紫纸台、暖琥珀灯笼把场景照亮。
  3: { sky: 0x1d2347, fog: 0x1d2347, desk: 0x23284a, cover: 0x131736, page: 0x4a4577, top: [0x8d6aa6, 0x83609b], side: 0x6a4d84, sideShade: 0x4f3a63, edge: 0xf6e6cc, accent: 0xf4a44a, accent2: 0xbd6684, tree: 0x5f3f70, treeLight: 0x7a5390, bush: 0x6a4a7c, flower: [0xf4a44a, 0xf6d38a, 0xbd6684], hazard: 0x9a6fb0, bird: 0xf2e3cf, decal: "decal-market.png", star: 0xf8c655, sunColor: 0xffcf9c, sunIntensity: 1.2, hemiSky: 0x8f92e6, hemiGround: 0x2f2440, hemiIntensity: 0.9, exposure: 1.45, backdrop: [0x5a4574, 0x6c4f86, 0x463560], lanterns: true },
  // 雪原天文台：冰白、淡蓝，单一黄铜点缀。
  4: { sky: 0xe4edf5, fog: 0xe4edf5, desk: 0xdfe7ef, cover: 0x5b7a99, page: 0xf4f8fb, top: [0xf7fafc, 0xecf2f7], side: 0xcfdde9, sideShade: 0xaec2d3, edge: 0xffffff, accent: 0xc9a45c, accent2: 0x7f9cba, tree: 0xe6eef5, treeLight: 0xf7fafc, bush: 0xdde8f0, flower: [0xc9a45c, 0xffffff, 0xbcd3e6], hazard: 0xa9c3da, bird: 0xffffff, decal: "decal-snow.png", star: 0xf4b93a, sunColor: 0xfff9ef, sunIntensity: 1.55, hemiSky: 0xf2f7ff, hemiGround: 0x8fa3b6, hemiIntensity: 0.55, exposure: 0.98, backdrop: [0xdde8f0, 0xbcd3e6, 0xf7fafc] },
};
const STEP = 0.5;
const state = { running: false, finished: false, renderCount: 0, performanceTier: "medium", suspended: false, mistakes: 0, stars: 0, orientation: 0, beats: 0, rotations: 0, blockedMoves: 0, lastEvent: "", restoredSession: false };
let campaignLevelIndex = 0;
let campaignMaxUnlocked = 0;
let campaignMastery = {};
let gameSessionState = "idle";
let beatMs = config.beatMs;
let beatClock = 0;
let model = null;
let blueprint = null;
let palette = palettes[1];
const queue = [];
let previousFrame = performance.now();
let renderSuspended = document.hidden;

// ---- 颜色工具：色板用 sRGB 十六进制；顶点色直接写 sRGB 字节（材质 vertexColorGamma 解码），灯光与清屏色交给引擎转线性。 ----
function rgb(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; }
function hexOf(r, g, b) { const c = (v) => Math.max(0, Math.min(255, Math.round(v * 255))); return (c(r) << 16) | (c(g) << 8) | c(b); }
function pcColor(hex, alpha) { const c = rgb(hex); return new pc.Color(c[0], c[1], c[2], alpha === undefined ? 1 : alpha); }
function toHsl(hex) {
  const c = rgb(hex); const max = Math.max(c[0], c[1], c[2]); const min = Math.min(c[0], c[1], c[2]);
  const l = (max + min) / 2; let h = 0; let s = 0;
  if (max !== min) {
    const d = max - min; s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === c[0]) h = (c[1] - c[2]) / d + (c[1] < c[2] ? 6 : 0); else if (max === c[1]) h = (c[2] - c[0]) / d + 2; else h = (c[0] - c[1]) / d + 4;
    h /= 6;
  }
  return { h, s, l };
}
function fromHsl(h, s, l) {
  const hue = (p, q, t) => { if (t < 0) t += 1; if (t > 1) t -= 1; if (t < 1 / 6) return p + (q - p) * 6 * t; if (t < 1 / 2) return q; if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6; return p; };
  if (s === 0) return hexOf(l, l, l);
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s; const p = 2 * l - q;
  return hexOf(hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3));
}
function shade(hex, amount) { const c = toHsl(hex); return fromHsl(c.h, c.s, Math.max(0, Math.min(1, c.l * (1 + amount)))); }
function mixColor(a, b, t) { const x = rgb(a); const y = rgb(b); return hexOf(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t); }
function deg(rad) { return rad * 180 / Math.PI; }

// ---- 引擎启动：PlayCanvas Application（WebGL2 优先），手动控制画布分辨率与渲染节奏。 ----
let app;
try {
  app = new pc.Application(canvas, { graphicsDeviceOptions: { antialias: true, alpha: false, depth: true, stencil: false, powerPreference: "high-performance", preferWebGl2: true } });
} catch (error) {
  errorPanel.hidden = false;
  throw error;
}
const device = app.graphicsDevice;
app.setCanvasFillMode(pc.FILLMODE_NONE);
app.autoRender = false;
app.scene.exposure = 1.0;
app.scene.ambientLight = pcColor(0x8f8a80);
const deviceMemory = Number(navigator.deviceMemory || 4);
const hardwareConcurrency = Number(navigator.hardwareConcurrency || 4);
// 起步档位：弱机直接 low，其余先用 medium 起跑；连续 90 帧都很快（< 12ms）再升到 high，连续慢帧则逐级降档。
// 软件渲染（SwiftShader / llvmpipe / Microsoft Basic Render）直接落到 low：MSAA、SSAO 与景深在 CPU 上没有意义。
function softwareRenderer() {
  try { const gl = device.gl; const info = gl && gl.getExtension("WEBGL_debug_renderer_info"); const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ""; return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name); } catch { return false; }
}
const heuristicTier = softwareRenderer() || deviceMemory <= 2 || hardwareConcurrency <= 4 ? "low" : deviceMemory >= 8 && hardwareConcurrency >= 8 ? "high" : "medium";
let performanceTier = heuristicTier === "low" ? "low" : "medium";
let tierPromotionAllowed = heuristicTier === "high";
// 三档：低档无阴影、无后处理、构件 ×0.4；中档 PCF5 柔影 + MSAA + SSAO 接触阴影；高档 2048 阴影贴图再加 bloom 与景深式移轴。
// （PCSS 在软件渲染 / 部分移动 GPU 上会静默失效，这里统一用 PCF5_32F。）
const performanceProfiles = {
  low: { pixelRatio: 1, shadows: false, shadowSize: 512, shadowType: "pcf1", post: false, samples: 1, ssao: false, bloom: false, tiltShift: false, decor: 0.4, particles: false },
  medium: { pixelRatio: 1.25, shadows: true, shadowSize: 1024, shadowType: "pcf5", post: true, samples: 4, ssao: true, bloom: false, tiltShift: false, decor: 1, particles: true },
  high: { pixelRatio: 1.5, shadows: true, shadowSize: 2048, shadowType: "pcf5", post: true, samples: 4, ssao: true, bloom: true, tiltShift: true, decor: 1, particles: true },
};

// ---- 贴图：AI 位图只作纸纹、桌面与章节印花。 ----
const textureAssets = {};
function textureAsset(name) {
  if (!textureAssets[name]) {
    const asset = new pc.Asset(name, "texture", { url: "./assets/" + name }, { srgb: true, mipmaps: true, anisotropy: 4 });
    asset.ready(() => { const texture = asset.resource; texture.addressU = pc.ADDRESS_REPEAT; texture.addressV = pc.ADDRESS_REPEAT; texture.anisotropy = 4; });
    app.assets.add(asset);
    app.assets.load(asset);
    textureAssets[name] = asset;
  }
  return textureAssets[name];
}
function attachTexture(material, name, tiling, asOpacity) {
  const asset = textureAsset(name);
  const apply = () => { material.diffuseMap = asset.resource; material.diffuseMapTiling.set(tiling, tiling); if (asOpacity) { material.opacityMap = asset.resource; material.opacityMapChannel = "a"; } material.update(); };
  if (asset.resource) apply(); else asset.ready(apply);
  return material;
}
function decalTexture(name) { return textureAsset(name); }
void decalTexture("paper-grain.png");
// 局内背景位图按 ART-SPEC §4 只作低对比参考图预载，桌面本体是纯色纸纹（不铺照片）。
const backgroundAsset = new pc.Asset("background", "texture", { url: "./assets/background.png" }, { srgb: true });
app.assets.add(backgroundAsset); app.assets.load(backgroundAsset);

// ---- 材质：颜色全部烤进顶点色，因此全场只需少量共享材质；发光与动画部件另建独立材质。 ----
const materialCache = new Map();
const levelMaterials = [];
function baseMaterial() {
  const material = new pc.StandardMaterial();
  material.diffuse.set(1, 1, 1);
  material.diffuseVertexColor = true;
  material.vertexColorGamma = true;
  material.useMetalness = true;
  material.metalness = 0;
  material.gloss = 0.22;
  return material;
}
// key: { map: "paper" | "page" | "desk" | null, emissive: hex | null, emissiveIntensity, opacity, doubleSide, decal }
function materialFor(options) {
  const key = JSON.stringify(options);
  if (materialCache.has(key)) return materialCache.get(key);
  const material = baseMaterial();
  if (options.map === "paper") attachTexture(material, "paper-grain.png", 1.5);
  else if (options.map === "page") attachTexture(material, "paper-grain.png", 3);
  else if (options.map === "desk") attachTexture(material, "paper-grain.png", 18);
  if (options.decal) { material.diffuseVertexColor = false; attachTexture(material, options.decal, 1, true); material.blendType = pc.BLEND_NORMAL; material.depthWrite = false; material.opacity = 1; }
  if (options.emissive) { material.emissive = pcColor(options.emissive); material.emissiveIntensity = options.emissiveIntensity || 1; }
  if (options.opacity !== undefined && options.opacity < 1) { material.opacity = options.opacity; material.blendType = pc.BLEND_NORMAL; material.depthWrite = false; }
  if (options.doubleSide) { material.cull = pc.CULLFACE_NONE; material.twoSidedLighting = true; }
  material.update();
  materialCache.set(key, material);
  return material;
}
// 关卡内需要逐帧改动的材质（灯笼脉动、旗子点亮、压板亮度）：不进缓存，重建关卡时销毁。
function uniqueMaterial(options) {
  const material = baseMaterial();
  if (options.map === "paper") attachTexture(material, "paper-grain.png", 1.5);
  if (options.tint !== undefined) { material.diffuseVertexColor = false; material.diffuse = pcColor(options.tint); }
  if (options.emissive !== undefined) { material.emissive = pcColor(options.emissive); material.emissiveIntensity = options.emissiveIntensity || 1; }
  if (options.opacity !== undefined && options.opacity < 1) { material.opacity = options.opacity; material.blendType = pc.BLEND_NORMAL; material.depthWrite = false; }
  if (options.doubleSide) { material.cull = pc.CULLFACE_NONE; material.twoSidedLighting = true; }
  material.update();
  levelMaterials.push(material);
  return material;
}
const paperMat = materialFor({ map: "paper" });
const plainMat = materialFor({ map: null });
const pageMat = materialFor({ map: "page" });
const deskMat = materialFor({ map: "desk" });
const glowMat = materialFor({ map: null, emissive: 0xffffff, emissiveIntensity: 1.1 });
void glowMat;

// ---- 几何构造器：所有纸艺几何都是程序化的、平面着色（每个面独立顶点与法线）。 ----
// 纸边不再用线段描边：盒子沿 12 条边做斜切（宽 BEVEL）并把斜切面烤成 edge 色；纸片正反面外沿留一圈 edge 色的窄边，侧壁整块 edge 色（像真纸的切口）。
const BEVEL = 0.03;
const SHEET_RIM = 0.022;
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
function cachedMesh(key, build) { if (!meshCache.has(key)) { const mesh = build(); mesh.incRefCount(); meshCache.set(key, mesh); } return meshCache.get(key); }
function round3(v) { return Math.round(v * 1000) / 1000; }
// 斜切盒：6 个主面 + 12 条斜切边（edge 色）+ 8 个角三角形；bevel 为 0 时是普通盒。uvOffset 让每格纸纹错开。
function boxMesh(w, h, d, color, edgeColor, bevel, uvOffset) {
  const key = ["box", round3(w), round3(h), round3(d), color, edgeColor, round3(bevel || 0), uvOffset ? uvOffset.map(round3).join(",") : ""].join("|");
  return cachedMesh(key, () => {
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
      g.quad(pts[0], pts[1], pts[2], pts[3], color, outward, uv);
    };
    ["x", "y", "z"].forEach((axis) => { face(axis, 1); face(axis, -1); });
    if (b > 0) {
      const ec = edgeColor;
      // 平行 z 的 4 条边（x/y 面之间）
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.quad(P(sx, sy, -1, "x"), P(sx, sy, 1, "x"), P(sx, sy, 1, "y"), P(sx, sy, -1, "y"), ec, [sx, sy, 0]);
      // 平行 x 的 4 条边（y/z 面之间）
      for (const sy of [-1, 1]) for (const sz of [-1, 1]) g.quad(P(-1, sy, sz, "y"), P(1, sy, sz, "y"), P(1, sy, sz, "z"), P(-1, sy, sz, "z"), ec, [0, sy, sz]);
      // 平行 y 的 4 条边（x/z 面之间）
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.quad(P(sx, -1, sz, "x"), P(sx, 1, sz, "x"), P(sx, 1, sz, "z"), P(sx, -1, sz, "z"), ec, [sx, 0, sz]);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) g.tri(P(sx, sy, sz, "x"), P(sx, sy, sz, "y"), P(sx, sy, sz, "z"), ec, [sx, sy, sz]);
    }
    return g.build();
  });
}
// 纸片：二维轮廓沿 z 挤出 depth，正面朝 +z；正反面外圈 rim 宽的 edge 色窄边，侧壁 edge 色。
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
    for (let i = 0; i < n; i += 1) {
      const j = (i + 1) % n;
      const a = [points[i][0], points[i][1], hz]; const b = [points[j][0], points[j][1], hz]; const c = [points[j][0], points[j][1], -hz]; const d = [points[i][0], points[i][1], -hz];
      let cx = 0; let cy = 0; points.forEach((p) => { cx += p[0]; cy += p[1]; }); cx /= n; cy /= n;
      g.quad(a, b, c, d, edgeColor, [(points[i][0] + points[j][0]) / 2 - cx, (points[i][1] + points[j][1]) / 2 - cy, 0]);
    }
    return g.build();
  });
}
// 圆锥 / 圆柱 / 半球 / 二十面体 / 圆环 / 圆盘：低段数平面着色，圆柱端面留 edge 色外圈。
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
// 八面体（灯笼）：6 个顶点 8 个面。
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

// ---- 实体工具 ----
function group() { return new pc.Entity(); }
function meshEntity(mesh, material, options) {
  const entity = new pc.Entity();
  entity.addComponent("render", { meshInstances: [new pc.MeshInstance(mesh, material)], castShadows: !options || options.cast !== false, receiveShadows: !options || options.receive !== false });
  return entity;
}
function setPos(entity, x, y, z) { entity.setLocalPosition(x, y, z); return entity; }
function setRot(entity, rx, ry, rz) { entity.setLocalEulerAngles(deg(rx || 0), deg(ry || 0), deg(rz || 0)); return entity; }
function setScale(entity, s) { entity.setLocalScale(s, s, s); return entity; }
function disposeGroup(entity) { while (entity.children.length) entity.children[entity.children.length - 1].destroy(); }
function meshMaterial(entity) { return entity.render.meshInstances[0].material; }
function edgeTint(base, edgeColor, opacity) { return mixColor(base, edgeColor === undefined ? palette.edge : edgeColor, opacity === undefined ? 0.75 : opacity); }
function seeded(seed) {
  let value = seed >>> 0;
  return () => { value = (value + 0x6d2b79f5) >>> 0; let t = value; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// 纸盒：options { edgeColor, edgeOpacity, noEdges, map: null, emissive, emissiveIntensity, transparent, opacity, uvOffset, unique }
function paperBox(w, h, d, color, options) {
  const o = options || {};
  const edge = edgeTint(color, o.edgeColor, o.edgeOpacity);
  const mesh = boxMesh(w, h, d, color, edge, o.noEdges ? 0 : BEVEL, o.uvOffset);
  const material = o.unique ? uniqueMaterial({ map: o.map === null ? null : "paper", emissive: o.emissive, emissiveIntensity: o.emissiveIntensity }) : materialFor({ map: o.map === null ? null : "paper", emissive: o.emissive || null, emissiveIntensity: o.emissiveIntensity || 0, opacity: o.transparent ? (o.opacity === undefined ? 1 : o.opacity) : 1 });
  return meshEntity(mesh, material, { cast: o.cast, receive: o.receive });
}
// 纸片：多边形轮廓（单位为格）挤出 depth，正面朝 +z。options { depth, edgeColor, edgeOpacity, emissive, emissiveIntensity }
function paperSheet(points, color, options) {
  const o = options || {};
  const edge = edgeTint(color, o.edgeColor, o.edgeOpacity === undefined ? 0.75 : o.edgeOpacity);
  const mesh = sheetMesh(points, o.depth || 0.035, color, edge, o.rim === undefined ? SHEET_RIM : o.rim);
  const material = o.emissive ? materialFor({ map: null, emissive: o.emissive, emissiveIntensity: o.emissiveIntensity === undefined ? 1 : o.emissiveIntensity }) : plainMat;
  return meshEntity(mesh, material);
}
`;
