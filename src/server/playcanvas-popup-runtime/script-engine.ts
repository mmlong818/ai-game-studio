// 纸境 · 立体书迷宫 PlayCanvas 运行时 —— 第 1 段：纸境专属的色板、状态、引擎层装配（引导 / 几何 / 材质 / 实体工具）与纸艺构件基元。
// 通用能力全部来自平台引擎层（src/engine/playcanvas/runtime/*.js，已内嵌在本脚本前面）；本段只剩纸境自己的东西。
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
let cameraAspect = 1;

// ---- 引擎层装配：颜色工具 → 引导（应用 / 相机 / 主光补光 / 后处理 / 性能三档 / 后台停渲染） → 几何 → 材质 → 实体工具。 ----
const colorKit = createColorKit(pc);
const { rgb, hexOf, pcColor, toHsl, fromHsl, shade, mixColor, deg } = colorKit;
const engine = createEngineApp(pc, canvas, colorKit, renderPreset, {
  onError() { errorPanel.hidden = false; },
  // 低性能档构件数量 × 0.4（四角主构件保留）：切档时只重建构件层，不动纸台与规则。
  onTierChange(tier) { state.performanceTier = tier; if (typeof rebuildDecor === "function" && blueprint) rebuildDecor(); },
  onResize(view) { cameraAspect = view.aspect; if (blueprint) fitCamera(); },
  onSuspend(value) { state.suspended = value; if (!value) previousFrame = performance.now(); },
  onVisibility(hidden) { if (hidden) stopEnvironmentAudio(); else if (state.running) startEnvironmentAudio(); },
});
const { app, device, performanceProfiles } = engine;
const cameraEntity = engine.camera;
const sun = engine.sun;
const fill = engine.fill;
const geometry = createGeometryKit(pc, device);
const { GeoBuilder, sub, cross, dot, planarUv, triangulate, insetPolygon, meshCache, cachedMesh, round3, boxMesh, sheetMesh, coneMesh, cylinderMesh, domeMesh, icoMesh, octahedronMesh, torusMesh, discMesh, triangleMesh, planeMesh, starPoints, hexPoints } = geometry;
// ---- 贴图：AI 位图只作纸纹、桌面与章节印花。 ----
const materials = createMaterialKit(pc, app, colorKit, { assetRoot: "./assets/", maps: { paper: { texture: "paper-grain.png", tiling: 1.5 }, page: { texture: "paper-grain.png", tiling: 3 }, desk: { texture: "paper-grain.png", tiling: 18 } } });
const { textureAsset, attachTexture, materialCache, materialFor, uniqueMaterial } = materials;
function decalTexture(name) { return textureAsset(name); }
void decalTexture("paper-grain.png");
// 局内背景位图按 ART-SPEC §4 只作低对比参考图预载，桌面本体是纯色纸纹（不铺照片）。
const backgroundAsset = new pc.Asset("background", "texture", { url: "./assets/background.png" }, { srgb: true });
app.assets.add(backgroundAsset); app.assets.load(backgroundAsset);
const entityKit = createEntityKit(pc, colorKit);
const { group, meshEntity, setPos, setRot, setScale, place, disposeGroup, meshMaterial, tag, seeded, measureBounds } = entityKit;

// ---- 共享材质：颜色全部烤进顶点色，因此全场只需少量共享材质；发光与动画部件另建独立材质。 ----
const paperMat = materialFor({ map: "paper" });
const plainMat = materialFor({ map: null });
const pageMat = materialFor({ map: "page" });
const deskMat = materialFor({ map: "desk" });
const glowMat = materialFor({ map: null, emissive: 0xffffff, emissiveIntensity: 1.1 });
void glowMat;

// ---- 纸艺构件基元：纸边不用线段描边，盒子沿 12 条边斜切（宽 BEVEL）烤成 edge 色；纸片正反面外沿留 edge 色窄边，侧壁整块 edge 色。 ----
const BEVEL = 0.03;
const SHEET_RIM = 0.022;
function edgeTint(base, edgeColor, opacity) { return mixColor(base, edgeColor === undefined ? palette.edge : edgeColor, opacity === undefined ? 0.75 : opacity); }
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
