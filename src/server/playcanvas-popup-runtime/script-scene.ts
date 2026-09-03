// 纸境 · 立体书迷宫 PlayCanvas 运行时 —— 第 2 段：场景实体（书、纸台、构件层、链接、星、旗、门、玩家、障碍）。
// 注意：本段是浏览器脚本的模板字面量片段，内部不能出现 ${ 与反斜杠转义。
export const popupSceneScript = `
// ---- 场景骨架：相机、主光、补光、桌面、书（书底 / 右页 / 关卡层）、远景。每类对象都是独立实体，便于后续编辑器操作。 ----
const cameraEntity = new pc.Entity("camera");
cameraEntity.addComponent("camera", { fov: 32, nearClip: 0.1, farClip: 200, clearColor: pcColor(palette.sky), toneMapping: pc.TONEMAP_ACES });
app.root.addChild(cameraEntity);
// 桌面用等角三分之一俯视；竖屏更俯视一些，让整本书在窄画幅里占到更多高度。
const LANDSCAPE_DIRECTION = new pc.Vec3(0.5, 0.82, 0.866).normalize();
const PORTRAIT_DIRECTION = new pc.Vec3(0.5, 1.82, 0.866).normalize();
const cameraDirection = LANDSCAPE_DIRECTION.clone();
const cameraTarget = new pc.Vec3(0, 0.6, 0);
let cameraDistance = 14;
let cameraAspect = 1;
const sun = new pc.Entity("sun");
sun.addComponent("light", { type: "directional", color: pcColor(palette.sunColor), intensity: palette.sunIntensity, castShadows: true, shadowResolution: 1024, shadowType: pc.SHADOW_PCF5_32F, shadowBias: 0.12, normalOffsetBias: 0.04, shadowDistance: 60, numCascades: 1, shadowUpdateMode: pc.SHADOWUPDATE_REALTIME, penumbraSize: 6, shadowSamples: 12, shadowBlockerSamples: 8 });
app.root.addChild(sun);
// 半球光的近似：天空色环境光 + 一盏从背面低角度打来的弱补光（不投影）。
const fill = new pc.Entity("fill");
fill.addComponent("light", { type: "directional", color: pcColor(palette.hemiSky), intensity: palette.hemiIntensity * 0.3, castShadows: false });
fill.setPosition(6, 5, -7); fill.lookAt(0, 0, 0); fill.rotateLocal(90, 0, 0);
app.root.addChild(fill);
const desk = meshEntity(planeMesh(90, 90, palette.desk), deskMat, { cast: false });
desk.setLocalPosition(0, -0.62, 0);
app.root.addChild(desk);
const book = new pc.Entity("book"); app.root.addChild(book);
const bookBase = new pc.Entity("book-base"); book.addChild(bookBase);
const rightPage = new pc.Entity("right-page"); book.addChild(rightPage);
const level = new pc.Entity("level"); book.addChild(level);
const backdropGroup = new pc.Entity("backdrop"); app.root.addChild(backdropGroup);

let cameraFrame = null;
function applyPostProcessing(profile) {
  if (!profile.post) {
    if (cameraFrame) { cameraFrame.destroy(); cameraFrame = null; }
    cameraEntity.camera.toneMapping = pc.TONEMAP_ACES;
    return;
  }
  if (!cameraFrame) cameraFrame = new pc.CameraFrame(app, cameraEntity.camera);
  const frame = cameraFrame;
  frame.rendering.samples = profile.samples;
  frame.rendering.toneMapping = pc.TONEMAP_ACES;
  frame.rendering.sharpness = 0;
  // SSAO：纸层之间的接触阴影，让顶纸、层线与构件“压”在纸面上。
  frame.ssao.type = profile.ssao ? pc.SSAOTYPE_LIGHTING : pc.SSAOTYPE_NONE;
  frame.ssao.intensity = 0.55; frame.ssao.radius = 5; frame.ssao.samples = 12; frame.ssao.power = 3; frame.ssao.minAngle = 12; frame.ssao.blurEnabled = true;
  // bloom 只给星与灯笼一点光晕。
  frame.bloom.intensity = profile.bloom ? 0.012 : 0; frame.bloom.blurLevel = 14;
  // 屏幕空间暗角：四角约 -12% 亮度（ART-SPEC §4）。
  frame.vignette.intensity = 0.16; frame.vignette.inner = 0.55; frame.vignette.outer = 1.25; frame.vignette.curvature = 0.55; frame.vignette.color = new pc.Color(0, 0, 0);
  // 高档：以书页为焦平面的景深，读出移轴摄影的“上下虚化”。
  frame.dof.enabled = Boolean(profile.tiltShift); frame.dof.nearBlur = true; frame.dof.focusDistance = cameraDistance; frame.dof.focusRange = cameraDistance * 0.62; frame.dof.blurRadius = 3.2; frame.dof.blurRings = 3; frame.dof.blurRingPoints = 3; frame.dof.highQuality = false;
  frame.taa.enabled = false;
  frame.update();
}
function applyPerformanceTier(nextTier) {
  performanceTier = nextTier;
  state.performanceTier = nextTier;
  const profile = performanceProfiles[nextTier];
  device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, profile.pixelRatio);
  sun.light.castShadows = profile.shadows;
  sun.light.shadowResolution = profile.shadowSize;
  sun.light.shadowType = profile.shadowType === "pcss" ? pc.SHADOW_PCSS_32F : profile.shadowType === "pcf5" ? pc.SHADOW_PCF5_32F : pc.SHADOW_PCF1_32F;
  applyPostProcessing(profile);
  document.body.dataset.performanceTier = nextTier;
  resize();
  // 低性能档构件数量 × 0.4（四角主构件保留）：切档时只重建构件层，不动纸台与规则。
  if (typeof rebuildDecor === "function" && blueprint) rebuildDecor();
}

const cellEntities = new Map();
const cellBoxes = [];
const linkViews = [];
const starViews = [];
const plateViews = [];
const hazardViews = [];
const flagViews = [];
let exitView = null;
let playerView = null;
let confetti = null;
let gridWidth = 0;
let gridDepth = 0;
function cellWorld(x, z, y) { return new pc.Vec3(x - (gridWidth - 1) / 2, y || 0, z - (gridDepth - 1) / 2); }
// 纸台高度：第一层 0.72，之后每层 0.55，让低多边形纸崖有可见的侧面。
function cellTop(x, z) { const h = rules.heightAt(blueprint, x, z); return h > 0 ? 0.72 + (h - 1) * STEP * 1.1 : 0; }
function directionAngle(direction) { return direction === "N" ? Math.PI : direction === "S" ? 0 : direction === "E" ? Math.PI / 2 : -Math.PI / 2; }
function bookMargin() { return cameraAspect < 1 ? 0.9 : 1.2; }
function place(entity, position) { entity.setLocalPosition(position.x, position.y, position.z); return entity; }

function buildBook() {
  disposeGroup(bookBase); disposeGroup(rightPage);
  const bookW = gridWidth + 2 * bookMargin();
  const bookD = gridDepth + 2 * bookMargin();
  const cover = paperBox(bookW + 0.5, 0.14, bookD + 0.5, palette.cover, { edgeColor: palette.edge, edgeOpacity: 0.35 });
  cover.setLocalPosition(0, -0.47, 0);
  bookBase.addChild(cover);
  const spine = paperBox(0.26, 0.08, bookD + 0.5, palette.cover, { noEdges: true });
  spine.setLocalPosition(0, -0.36, 0);
  bookBase.addChild(spine);
  // 书页厚 0.3：侧面用略深的纸色读出“很多页叠着”，顶面外沿留纸边。
  const leftPage = meshEntity(boxMesh(bookW / 2, 0.3, bookD, palette.page, mixColor(palette.page, palette.edge, 0.6), BEVEL, null), pageMat);
  leftPage.setLocalPosition(-bookW / 4 - 0.05, -0.25, 0);
  bookBase.addChild(leftPage);
  const right = meshEntity(boxMesh(bookW / 2, 0.3, bookD, palette.page, mixColor(palette.page, palette.edge, 0.6), BEVEL, [0.37, 0.61]), pageMat);
  right.setLocalPosition(bookW / 4 + 0.05, -0.25, 0);
  rightPage.addChild(right);
  // 书页右下角一枚章节圆形印花贴纸（唯一使用位图的地方）。
  const decal = meshEntity(planeMesh(1.5, 1.5, 0xffffff), materialFor({ map: null, decal: palette.decal }), { cast: false, receive: true });
  decal.setLocalPosition(bookW / 2 - 1.1, -0.095, bookD / 2 - 1.1);
  decal.setLocalEulerAngles(0, deg(-0.35), 0);
  rightPage.addChild(decal);
  rightPage.setLocalPosition(0, 0, 0);
  rightPage.setLocalEulerAngles(0, 0, 0);
}

function buildLevel() {
  disposeGroup(level);
  levelMaterials.splice(0).forEach((material) => material.destroy());
  cellEntities.clear(); cellBoxes.splice(0); linkViews.splice(0); starViews.splice(0); plateViews.splice(0); hazardViews.splice(0); flagViews.splice(0);
  exitView = null; confetti = null;
  const random = seeded(campaignLevelIndex * 7919 + 17);
  const decorScale = performanceProfiles[performanceTier].decor;
  const cells = new pc.Entity("cells"); level.addChild(cells);
  for (let z = 0; z < gridDepth; z += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const h = rules.heightAt(blueprint, x, z);
      if (!h) continue;
      const height = cellTop(x, z);
      const topColor = palette.top[(x + z) % 2];
      // 纸台主体：满格（无缝）盒，侧面受光面 side、背光面 sideShade（顶点色分面）；顶面另做一张 1.06×0.12 的薄纸片，形成层叠。
      const body = meshEntity(cellBodyMesh(height, x, z, random), paperMat);
      place(body, cellWorld(x, z, height / 2 - 0.1));
      cells.addChild(body);
      cellEntities.set(x + "," + z, body);
      cellBoxes.push({ x, z, min: cellWorld(x, z, -0.1), max: cellWorld(x, z, height - 0.1 + 0.12) });
      const sheet = paperBox(1.06, 0.12, 1.06, topColor, { edgeColor: palette.edge, edgeOpacity: 1, uvOffset: [random(), random()] });
      place(sheet, cellWorld(x, z, height - 0.1 + 0.06));
      cells.addChild(sheet);
      // 每一层高度加一条略深的纸层线，读出“很多张纸叠起来”的厚度。
      for (let layer = 1; layer < h; layer += 1) {
        const stripe = paperBox(1.006, 0.04, 1.006, shade(palette.sideShade, -0.08), { noEdges: true, map: null, cast: false });
        place(stripe, cellWorld(x, z, 0.72 + (layer - 1) * STEP * 1.1 - 0.1));
        cells.addChild(stripe);
      }
    }
  }
  decorGroup = new pc.Entity("decor");
  level.addChild(decorGroup);
  buildDecor(decorSeed(), decorScale);
  const linksGroup = new pc.Entity("links"); level.addChild(linksGroup);
  blueprint.links.forEach((link) => linksGroup.addChild(createLinkView(link)));
  const platesGroup = new pc.Entity("plates"); level.addChild(platesGroup);
  blueprint.plates.forEach((plate) => platesGroup.addChild(createPlateView(plate)));
  const starsGroup = new pc.Entity("stars"); level.addChild(starsGroup);
  blueprint.stars.forEach((star, index) => starsGroup.addChild(createStarView(star, index)));
  const flagsGroup = new pc.Entity("flags"); level.addChild(flagsGroup);
  blueprint.checkpoints.forEach((point, index) => flagsGroup.addChild(createFlagView(point, index)));
  const hazardsGroup = new pc.Entity("hazards"); level.addChild(hazardsGroup);
  blueprint.hazards.forEach((hazard) => hazardsGroup.addChild(createHazardView(hazard)));
  exitView = createExitView(blueprint.exit);
  level.addChild(exitView);
  playerView = createPlayerView();
  level.addChild(playerView);
}
// 纸台主体盒：受光面（+x/+z）side、背光面（-x/-z）sideShade，明度差 ≥ 18%；斜切边 edge 色；纸纹 UV 随机偏移。
function cellBodyMesh(height, x, z, random) {
  const key = ["cell", round3(height), x, z, palette.side].join("|");
  return cachedMesh(key, () => {
    const g = new GeoBuilder(); const hw = 0.5; const hh = height / 2; const b = BEVEL; const off = [random(), random()];
    const edge = mixColor(palette.side, palette.edge, 0.75);
    const P = (sx, sy, sz, axis) => axis === "x" ? [sx * hw, sy * (hh - b), sz * (hw - b)] : axis === "y" ? [sx * (hw - b), sy * hh, sz * (hw - b)] : [sx * (hw - b), sy * (hh - b), sz * hw];
    const faceColor = (axis, sign) => axis === "y" ? palette.side : (axis === "x" ? sign > 0 : sign > 0) ? palette.side : palette.sideShade;
    const face = (axis, sign) => {
      const pts = axis === "x" ? [P(sign, -1, -1, "x"), P(sign, 1, -1, "x"), P(sign, 1, 1, "x"), P(sign, -1, 1, "x")] : axis === "y" ? [P(-1, sign, -1, "y"), P(1, sign, -1, "y"), P(1, sign, 1, "y"), P(-1, sign, 1, "y")] : [P(-1, -1, sign, "z"), P(1, -1, sign, "z"), P(1, 1, sign, "z"), P(-1, 1, sign, "z")];
      const outward = axis === "x" ? [sign, 0, 0] : axis === "y" ? [0, sign, 0] : [0, 0, sign];
      g.quad(pts[0], pts[1], pts[2], pts[3], faceColor(axis, sign), outward, planarUv(pts, outward).map((t) => [t[0] + off[0], t[1] + off[1]]));
    };
    ["x", "y", "z"].forEach((axis) => { face(axis, 1); face(axis, -1); });
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.quad(P(sx, sy, -1, "x"), P(sx, sy, 1, "x"), P(sx, sy, 1, "y"), P(sx, sy, -1, "y"), edge, [sx, sy, 0]);
    for (const sy of [-1, 1]) for (const sz of [-1, 1]) g.quad(P(-1, sy, sz, "y"), P(1, sy, sz, "y"), P(1, sy, sz, "z"), P(-1, sy, sz, "z"), edge, [0, sy, sz]);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.quad(P(sx, -1, sz, "x"), P(sx, 1, sz, "x"), P(sx, 1, sz, "z"), P(sx, -1, sz, "z"), edge, [sx, 0, sz]);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) g.tri(P(sx, sy, sz, "x"), P(sx, sy, sz, "y"), P(sx, sy, sz, "z"), edge, [sx, sy, sz]);
    return g.build();
  });
}

// ---- 章节装饰（构件层，ART-SPEC §5）：全部是程序化纸片几何，禁止位图立牌与 SVG。 ----
// 约定：每个构件由 ≥ 2 张纸片前后错位 0.05–0.1 叠成（松树 ≥ 3 层），颜色由深到浅逐层提亮 8%，每张纸片带纸边；
// 主构件高 1.2–2.2 格，放在网格四角与通过“四个书本朝向都不遮挡可走格 / 星”检查的环带槽位；
// 次构件高 0.3–0.7 格填满书页留白环带（每 1.5 格 ≥ 1 个）；构件基座与可走格中心的距离 ≥ 0.6 + 基座半径。
// 远端两排纸山 / 屋影放在不随书旋转的 backdropGroup 里，永远立在书后方的桌面上，因此不可能遮挡关卡。
let decorGroup = new pc.Entity("decor");
let backdropTargetZ = 0;
const decorItems = [];
let decorStats = null;
let lanternLightBudget = 0;
const LAYER_OFFSET = 0.07;
const LAYER_LIFT = 0.08;
// 多层剪纸：layers[0] 在最后（最深），往前每层错位 offset 并提亮 lift；cross 时再放一组转 90° 的同样纸片，让构件从书的 4 个朝向看都有体积。
function layeredCutout(layers, baseColor, options) {
  const o = options || {};
  const root = group();
  const offset = o.offset === undefined ? LAYER_OFFSET : o.offset;
  const lift = o.lift === undefined ? LAYER_LIFT : o.lift;
  const buildSet = (rotationY) => {
    const set = group();
    layers.forEach((layer, index) => {
      const color = layer.color !== undefined ? layer.color : shade(baseColor, lift * index);
      const sheet = paperSheet(layer.points, color, { depth: o.depth, emissive: layer.emissive, emissiveIntensity: layer.emissiveIntensity, edgeOpacity: o.edgeOpacity, edgeColor: o.edgeColor });
      sheet.setLocalPosition(layer.x || 0, layer.y || 0, (index - (layers.length - 1) / 2) * offset);
      set.addChild(sheet);
    });
    set.setLocalEulerAngles(0, deg(rotationY), 0);
    return set;
  };
  root.addChild(buildSet(0));
  if (o.cross) root.addChild(buildSet(Math.PI / 2));
  root.userData = { layers: layers.length };
  return root;
}
function blobPoints(random, radius, squash, segments, raise) {
  const points = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const r = radius * (0.84 + random() * 0.32);
    points.push([Math.cos(angle) * r, Math.max(0, Math.sin(angle) * r * squash + (raise === undefined ? radius * squash : raise))]);
  }
  return points;
}
function hexPoints(radius, y) { const points = []; for (let index = 0; index < 6; index += 1) points.push([Math.cos(index / 6 * Math.PI * 2) * radius, (y || 0) + Math.sin(index / 6 * Math.PI * 2) * radius]); return points; }
function starPoints(radius, y, count) {
  const points = []; const total = (count || 5) * 2;
  for (let index = 0; index < total; index += 1) { const angle = (index / total) * Math.PI * 2 - Math.PI / 2; const r = index % 2 === 0 ? radius : radius * 0.5; points.push([Math.cos(angle) * r, (y || 0) + Math.sin(angle) * r]); }
  return points;
}
function tag(entity, data) { entity.userData = Object.assign(entity.userData || {}, data); return entity; }
function glowBox(w, h, d, color, emissive, intensity) {
  return meshEntity(boxMesh(w, h, d, color, color, 0, null), materialFor({ map: null, emissive, emissiveIntensity: intensity }));
}
function shapeEntity(mesh, color, options) {
  const o = options || {};
  const material = o.emissive ? materialFor({ map: null, emissive: o.emissive, emissiveIntensity: o.emissiveIntensity || 1 }) : plainMat;
  return meshEntity(mesh, material, { cast: o.cast });
}
function makeGrassTuft(random, scale) {
  const root = group();
  const blades = 3 + Math.floor(random() * 3);
  for (let index = 0; index < blades; index += 1) {
    const blade = shapeEntity(coneMesh(0.06, 0.22 + random() * 0.14, 3, index % 2 ? palette.treeLight : palette.tree), 0);
    blade.setLocalPosition((random() - 0.5) * 0.18, 0.12, (random() - 0.5) * 0.18);
    setRot(blade, (random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
    root.addChild(blade);
  }
  setScale(root, scale || 1);
  return tag(root, { layers: 2, radius: 0.12, base: 0.08 });
}
// 多层松：每一层树冠是一张三角纸片，自下而上越来越小、越来越亮，并向前错位 0.06；十字两组纸片保证任何朝向都有体积。
function makePaperTree(random, tiers) {
  const snow = blueprint.chapter === 4;
  const root = group();
  const count = tiers || 3 + Math.floor(random() * 2);
  const trunk = paperBox(0.1, 0.34, 0.1, snow ? palette.accent : 0x8a6a4f, { edgeOpacity: 0.4, map: null });
  trunk.setLocalPosition(0, 0.17, 0);
  root.addChild(trunk);
  const layers = [];
  for (let tier = 0; tier < count; tier += 1) {
    const width = 0.58 - tier * (0.34 / count);
    layers.push({ points: [[-width, 0], [width, 0], [-width * 0.22, 0.42], [0, 0.58], [width * 0.22, 0.42]], y: 0.22 + tier * 0.32 });
  }
  root.addChild(layeredCutout(layers, palette.tree, { offset: 0.06, cross: true, depth: 0.05 }));
  return tag(root, { layers: count, radius: 0.58, base: 0.08, tree: true });
}
function makeBush(random) {
  const layers = [];
  for (let index = 0; index < 3; index += 1) { const radius = 0.3 - index * 0.05; layers.push({ points: blobPoints(random, radius, 0.72, 7, radius * 0.66) }); }
  return tag(layeredCutout(layers, palette.bush, { cross: true }), { layers: 3, radius: 0.32, base: 0.22 });
}
// 纸花簇：每朵花 = 后层叶片纸片 + 前层花瓣纸片（错位 0.06）+ 花心；朝向随机，任何角度都有花朵正对镜头。
function makeFlowerCluster(random) {
  const root = group();
  const count = 2 + Math.floor(random() * 2);
  for (let index = 0; index < count; index += 1) {
    const color = palette.flower[Math.floor(random() * palette.flower.length)];
    const height = 0.3 + random() * 0.14;
    const flower = group();
    const stem = paperBox(0.03, height, 0.03, palette.tree, { noEdges: true, map: null });
    stem.setLocalPosition(0, height / 2, 0);
    flower.addChild(stem);
    const leaf = [[-0.16, -0.02], [0, -0.1], [0.16, -0.02], [0, 0.07]].map((p) => [p[0], p[1] + height * 0.55]);
    const head = layeredCutout([
      { points: leaf, color: shade(palette.tree, 0.06) },
      { points: starPoints(0.12, height, 5), color: shade(color, -0.06) },
      { points: hexPoints(0.045, height), color: palette.accent, emissive: palette.accent, emissiveIntensity: 0.35 },
    ], color, { offset: 0.06 });
    flower.addChild(head);
    flower.setLocalPosition((random() - 0.5) * 0.36, 0, (random() - 0.5) * 0.36);
    setRot(flower, 0, random() * Math.PI * 2, 0);
    root.addChild(flower);
  }
  root.addChild(makeGrassTuft(random, 0.7));
  return tag(root, { layers: 3, radius: 0.28, base: 0.18 });
}
function makeCloud(random) {
  const layers = [];
  for (let index = 0; index < 3; index += 1) { const radius = 0.34 - index * 0.06; layers.push({ points: blobPoints(random, radius, 0.5, 8, radius * 0.5), x: (index - 1) * 0.12 }); }
  return tag(layeredCutout(layers, shade(palette.backdrop[2], -0.04), { offset: 0.08, edgeOpacity: 0.5 }), { layers: 3, radius: 0.4, base: 0 });
}
function makeSnowMound(random) {
  const radius = 0.24 + random() * 0.1;
  const layers = [{ points: blobPoints(random, radius, 0.55, 7, radius * 0.4) }, { points: blobPoints(random, radius * 0.8, 0.55, 7, radius * 0.3) }];
  return tag(layeredCutout(layers, palette.treeLight, { cross: true, edgeColor: palette.accent2, edgeOpacity: 0.4 }), { layers: 2, radius: radius * 1.1, base: radius * 0.8 });
}
// 纸浪：三层错位的波形纸片，后层墨蓝、中层海沫绿、前层最亮。
function makeWaveStrip(random, length) {
  const crests = Math.max(2, Math.round(length / 0.4));
  const wave = (height, dip) => {
    const points = [[-length / 2, 0]];
    for (let index = 0; index <= crests; index += 1) {
      const x = -length / 2 + (index / crests) * length;
      if (index > 0) points.push([x - length / crests / 2, height + (random() - 0.5) * 0.06]);
      points.push([x, dip]);
    }
    points.push([length / 2, 0]);
    return points;
  };
  const layers = [
    { points: wave(0.42, 0.16), color: palette.accent2 },
    { points: wave(0.34, 0.12), color: palette.hazard },
    { points: wave(0.26, 0.09), color: shade(palette.hazard, 0.18) },
  ];
  return tag(layeredCutout(layers, palette.hazard, { offset: 0.08 }), { layers: 3, radius: length / 2, base: 0.12 });
}
function makePaperBoat(random) {
  const root = group();
  const hull = layeredCutout([
    { points: [[-0.32, 0.06], [0.32, 0.06], [0.24, 0.24], [-0.24, 0.24]], color: palette.accent2 },
    { points: [[-0.27, 0.08], [0.27, 0.08], [0.2, 0.22], [-0.2, 0.22]], color: shade(palette.edge, -0.03) },
  ], palette.edge, { offset: 0.07 });
  const sail = paperSheet([[0, 0.24], [0.02, 0.66], [0.26, 0.28]], palette.accent, { edgeOpacity: 0.8 });
  sail.setLocalPosition(0, 0, 0.02);
  root.addChild(hull); root.addChild(sail);
  setRot(root, 0, random() * Math.PI * 2, 0);
  return tag(root, { layers: 3, radius: 0.34, base: 0.3 });
}
function makeSeaBird(random) {
  const root = layeredCutout([
    { points: [[-0.24, 0.12], [-0.02, 0.02], [0.02, 0.02], [0.24, 0.12], [0.22, 0.17], [0.02, 0.08], [-0.02, 0.08], [-0.22, 0.17]], color: palette.bird },
    { points: [[-0.05, 0.05], [0.07, 0.03], [0.06, 0.09], [-0.04, 0.1]], color: palette.accent2 },
  ], palette.bird, { offset: 0.05, edgeColor: palette.accent2, edgeOpacity: 0.5 });
  setRot(root, 0, (random() - 0.5) * 0.6, 0);
  return tag(root, { layers: 2, radius: 0.24, base: 0 });
}
// 灯笼：后层深色纸环 + 前层自发光纸片（错位 0.06），十字两组，从任何朝向都亮。
function makeLantern(size, cross) {
  return layeredCutout([
    { points: hexPoints(size * 1.25), color: shade(palette.accent, -0.28) },
    { points: hexPoints(size), color: palette.accent, emissive: palette.accent, emissiveIntensity: 1.3 },
  ], palette.accent, { offset: 0.06, cross, edgeColor: 0xfff1d0, edgeOpacity: 0.8 });
}
function makeLanternPost(random, small) {
  const root = group();
  const height = small ? 0.62 : 1.5;
  const post = paperBox(0.07, height, 0.07, palette.cover, { edgeOpacity: 0.4, map: null });
  post.setLocalPosition(0, height / 2, 0);
  root.addChild(post);
  const arm = paperBox(0.36, 0.05, 0.05, palette.cover, { noEdges: true, map: null });
  arm.setLocalPosition(0.15, height - 0.03, 0);
  root.addChild(arm);
  const lantern = makeLantern(small ? 0.07 : 0.14, true);
  lantern.setLocalPosition(0.3, height - 0.18, 0);
  root.addChild(lantern);
  tag(root, { layers: 2, radius: 0.36, base: 0.06 });
  if (!small) root.userData.lanternAnchor = new pc.Vec3(0.3, height - 0.14, 0);
  setRot(root, 0, random() * Math.PI * 2, 0);
  return root;
}
// 灯笼串：两根短杆之间一条纸绳，挂 4 只小灯笼。
function makeLanternGarland(random) {
  const root = group();
  const width = 1.0;
  for (const sideSign of [-1, 1]) { const post = paperBox(0.05, 0.62, 0.05, palette.cover, { edgeOpacity: 0.4, map: null }); post.setLocalPosition(sideSign * width / 2, 0.31, 0); root.addChild(post); }
  const string = paperBox(width, 0.012, 0.012, palette.edge, { noEdges: true, map: null });
  string.setLocalPosition(0, 0.6, 0);
  root.addChild(string);
  for (let index = 0; index < 4; index += 1) { const lantern = makeLantern(0.055, false); lantern.setLocalPosition(-width / 2 + (index + 0.5) * (width / 4), 0.5 - Math.abs(index - 1.5) * 0.02, 0); root.addChild(lantern); }
  return tag(root, { layers: 2, radius: width / 2, base: 0.1 });
}
// 夜市屋影：纸盒屋身 + 两层屋顶纸片（上层更亮、错位 0.06）+ 琥珀窗。
function makeHouse(random) {
  const root = group();
  const w = 0.62; const d = 0.5; const wall = 0.78;
  const body = paperBox(w, wall, d, palette.tree, { edgeOpacity: 0.7 });
  body.setLocalPosition(0, wall / 2, 0);
  root.addChild(body);
  const roofLower = shapeEntity(coneMesh(0.56, 0.3, 4, palette.accent2, edgeTint(palette.accent2, palette.edge, 0.7)), 0);
  setRot(roofLower, 0, Math.PI / 4, 0); roofLower.setLocalPosition(0, wall + 0.15, 0);
  const roofUpper = shapeEntity(coneMesh(0.42, 0.3, 4, shade(palette.accent2, LAYER_LIFT), edgeTint(palette.accent2, palette.edge, 0.7)), 0);
  setRot(roofUpper, 0, Math.PI / 4, 0); roofUpper.setLocalPosition(0, wall + 0.21, 0);
  const ridge = paperBox(0.06, 0.16, 0.06, palette.cover, { noEdges: true, map: null });
  ridge.setLocalPosition(0, wall + 0.42, 0);
  root.addChild(roofLower); root.addChild(roofUpper); root.addChild(ridge);
  for (let face = 0; face < 4; face += 1) {
    for (let index = 0; index < 2; index += 1) {
      const pane = glowBox(0.12, 0.15, 0.02, palette.accent, palette.accent, 1.1);
      const offset = (index - 0.5) * 0.26;
      const y = 0.26 + (random() < 0.5 ? 0.24 : 0);
      if (face === 0) pane.setLocalPosition(offset, y, d / 2 + 0.01);
      else if (face === 1) pane.setLocalPosition(-offset, y, -d / 2 - 0.01);
      else { pane.setLocalPosition(face === 2 ? w / 2 + 0.01 : -w / 2 - 0.01, y, offset); setRot(pane, 0, Math.PI / 2, 0); }
      root.addChild(pane);
    }
  }
  setRot(root, 0, Math.floor(random() * 4) * Math.PI / 2, 0);
  return tag(root, { layers: 2, radius: 0.45, base: 0.4 });
}
function makeMarketStall(random) {
  const root = group();
  const body = paperBox(0.56, 0.3, 0.44, palette.bush, { edgeOpacity: 0.7 });
  body.setLocalPosition(0, 0.15, 0); root.addChild(body);
  const counter = paperBox(0.62, 0.05, 0.5, palette.cover, { edgeOpacity: 0.5 });
  counter.setLocalPosition(0, 0.32, 0); root.addChild(counter);
  for (const sideSign of [-1, 1]) { const pole = paperBox(0.04, 0.4, 0.04, palette.cover, { noEdges: true, map: null }); pole.setLocalPosition(sideSign * 0.26, 0.5, -0.18); root.addChild(pole); }
  const awning = layeredCutout([
    { points: [[-0.36, 0.02], [0.36, 0.02], [0.36, 0.14], [-0.36, 0.14]], color: palette.accent2 },
    { points: [[-0.3, 0.04], [0.3, 0.04], [0.3, 0.16], [-0.3, 0.16]], color: shade(palette.accent2, LAYER_LIFT) },
  ], palette.accent2, { offset: 0.06 });
  setRot(awning, -0.9, 0, 0); awning.setLocalPosition(0, 0.62, -0.02); root.addChild(awning);
  const pane = glowBox(0.2, 0.12, 0.02, palette.accent, palette.accent, 1.1);
  pane.setLocalPosition(0, 0.16, 0.23); root.addChild(pane);
  const goods = layeredCutout([{ points: hexPoints(0.06, 0.06), color: palette.flower[0] }, { points: hexPoints(0.045, 0.06), color: palette.flower[1] }], palette.flower[0], { offset: 0.05 });
  goods.setLocalPosition(0.14, 0.34, 0.08); root.addChild(goods);
  setRot(root, 0, random() * Math.PI * 2, 0);
  return tag(root, { layers: 2, radius: 0.36, base: 0.32 });
}
function makeMoon() {
  const outer = []; const inner = [];
  for (let index = 0; index <= 10; index += 1) { const angle = -Math.PI / 2 + (index / 10) * Math.PI; outer.push([Math.cos(angle) * 0.34, Math.sin(angle) * 0.34]); inner.push([Math.cos(angle) * 0.26 - 0.12, Math.sin(angle) * 0.26]); }
  const crescent = outer.concat(inner.reverse());
  return tag(layeredCutout([
    { points: crescent.map((p) => [p[0] * 1.18, p[1] * 1.18]), color: shade(palette.flower[1], -0.2) },
    { points: crescent, color: palette.flower[1], emissive: palette.flower[1], emissiveIntensity: 0.9 },
  ], palette.flower[1], { offset: 0.06, edgeColor: 0xfff1d0, edgeOpacity: 0.6 }), { layers: 2, radius: 0.4, base: 0 });
}
function makeSkyStar(size) {
  return tag(layeredCutout([
    { points: hexPoints(size * 1.7), color: shade(palette.accent2, 0.25) },
    { points: starPoints(size, 0, 5), color: 0xffffff, emissive: 0xfff6d8, emissiveIntensity: 0.9 },
  ], 0xffffff, { offset: 0.05, edgeOpacity: 0.4 }), { layers: 2, radius: size * 1.7, base: 0 });
}
function makeRockBase(random, radius, color) {
  return layeredCutout([{ points: blobPoints(random, radius, 0.5, 7, radius * 0.32) }, { points: blobPoints(random, radius * 0.82, 0.5, 7, radius * 0.24) }], color, { cross: true, offset: 0.08 });
}
// 灯塔：两层礁石纸片 + 白塔、两道珊瑚色纸环、灯室与尖顶。
function makeLighthouse(random) {
  const root = group();
  root.addChild(makeRockBase(random, 0.34, palette.sideShade));
  const tower = shapeEntity(cylinderMesh(0.15, 0.22, 1.25, 7, palette.edge, edgeTint(palette.edge, palette.accent2, 0.6)), 0);
  tower.setLocalPosition(0, 0.72, 0); root.addChild(tower);
  [0.45, 0.85].forEach((y, index) => {
    const band = shapeEntity(cylinderMesh(0.235 - index * 0.03, 0.245 - index * 0.03, 0.14, 7, index ? shade(palette.accent, LAYER_LIFT) : palette.accent, edgeTint(palette.accent, palette.edge, 0.7)), 0);
    band.setLocalPosition(0, y, 0); root.addChild(band);
  });
  const gallery = shapeEntity(cylinderMesh(0.24, 0.2, 0.06, 7, palette.accent2, edgeTint(palette.accent2, palette.edge, 0.7)), 0);
  gallery.setLocalPosition(0, 1.36, 0); root.addChild(gallery);
  const lamp = shapeEntity(cylinderMesh(0.12, 0.13, 0.22, 6, palette.accent, palette.accent), 0, { emissive: 0xffe6a8, emissiveIntensity: 1.4 });
  lamp.setLocalPosition(0, 1.5, 0); root.addChild(lamp);
  const cap = shapeEntity(coneMesh(0.18, 0.24, 6, palette.accent2, edgeTint(palette.accent2, palette.edge, 0.7)), 0);
  cap.setLocalPosition(0, 1.73, 0); root.addChild(cap);
  const hut = paperBox(0.32, 0.26, 0.26, palette.edge, { edgeOpacity: 0.7 });
  hut.setLocalPosition(0.34, 0.26, 0.1); root.addChild(hut);
  const hutRoof = shapeEntity(coneMesh(0.26, 0.16, 4, palette.accent, edgeTint(palette.accent, palette.edge, 0.7)), 0);
  setRot(hutRoof, 0, Math.PI / 4, 0); hutRoof.setLocalPosition(0.34, 0.47, 0.1); root.addChild(hutRoof);
  setRot(root, 0, random() * Math.PI * 2, 0);
  return tag(root, { layers: 2, radius: 0.4, base: 0.34 });
}
// 天文台：两层雪岩纸片 + 圆鼓、半球顶、观测缝与黄铜望远镜。
function makeObservatory(random) {
  const root = group();
  root.addChild(makeRockBase(random, 0.36, palette.treeLight));
  const drum = shapeEntity(cylinderMesh(0.36, 0.38, 0.52, 10, palette.edge, edgeTint(palette.edge, palette.accent2, 0.6)), 0);
  drum.setLocalPosition(0, 0.42, 0); root.addChild(drum);
  const ring = shapeEntity(cylinderMesh(0.4, 0.4, 0.06, 10, palette.accent2, edgeTint(palette.accent2, palette.edge, 0.6)), 0);
  ring.setLocalPosition(0, 0.7, 0); root.addChild(ring);
  const dome = shapeEntity(domeMesh(0.36, 10, 6, palette.edge), 0);
  dome.setLocalPosition(0, 0.72, 0); root.addChild(dome);
  const slit = paperBox(0.1, 0.3, 0.44, palette.accent2, { noEdges: true, map: null });
  slit.setLocalPosition(0, 0.9, 0.06); setRot(slit, 0, 0, 0.15); root.addChild(slit);
  const scope = shapeEntity(cylinderMesh(0.045, 0.065, 0.56, 6, palette.accent, palette.accent), 0);
  scope.setLocalPosition(0.1, 1.08, 0.12); setRot(scope, 0, 0, -0.85); root.addChild(scope);
  const door = glowBox(0.14, 0.22, 0.02, palette.accent2, palette.accent, 0.6);
  door.setLocalPosition(0, 0.28, 0.375); root.addChild(door);
  setRot(root, 0, random() * Math.PI * 2, 0);
  return tag(root, { layers: 2, radius: 0.42, base: 0.36 });
}
function makeTelescope(random) {
  const root = group();
  const mound = layeredCutout([{ points: blobPoints(random, 0.22, 0.4, 7, 0.08) }, { points: blobPoints(random, 0.17, 0.4, 7, 0.06) }], palette.treeLight, { cross: true, edgeColor: palette.accent2, edgeOpacity: 0.4 });
  root.addChild(mound);
  for (let index = 0; index < 3; index += 1) {
    const leg = paperBox(0.045, 0.42, 0.045, palette.cover, { noEdges: true, map: null });
    const angle = index / 3 * Math.PI * 2;
    leg.setLocalPosition(Math.cos(angle) * 0.09, 0.21, Math.sin(angle) * 0.09);
    setRot(leg, Math.sin(angle) * 0.4, 0, -Math.cos(angle) * 0.4);
    root.addChild(leg);
  }
  const tube = shapeEntity(cylinderMesh(0.055, 0.08, 0.52, 6, palette.accent, edgeTint(palette.accent, palette.edge, 0.5)), 0);
  tube.setLocalPosition(0.08, 0.52, 0); setRot(tube, 0, 0, -0.9); root.addChild(tube);
  setRot(root, 0, random() * Math.PI * 2, 0);
  return tag(root, { layers: 2, radius: 0.3, base: 0.2 });
}
// 远端纸山 / 屋影：两层错位纸片（前层更亮），立在书后方桌面上。
function makeBackdropPeak(random, height, color, width) {
  const peak = (w, h) => [[-w / 2, 0], [-w * 0.18, h * (0.55 + random() * 0.25)], [0, h], [w * 0.22, h * (0.5 + random() * 0.3)], [w / 2, 0]];
  return tag(layeredCutout([{ points: peak(width, height) }, { points: peak(width * 0.72, height * 0.72), x: width * 0.08 }], color, { offset: 0.09, depth: 0.05, edgeOpacity: 0.7 }), { layers: 2, radius: width / 2, base: 0 });
}
function makeBackdropHouse(random, height, color, width) {
  const house = (w, h) => [[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.62], [0, h], [-w / 2, h * 0.62]];
  const root = layeredCutout([{ points: house(width, height) }, { points: house(width * 0.6, height * 0.78), x: width * 0.12 }], color, { offset: 0.09, depth: 0.05, edgeOpacity: 0.7 });
  const panes = 1 + Math.floor(random() * 3);
  for (let index = 0; index < panes; index += 1) {
    const pane = glowBox(0.11, 0.15, 0.03, palette.accent, palette.accent, 1.2);
    pane.setLocalPosition((index - (panes - 1) / 2) * 0.22 + width * 0.12, height * (0.2 + random() * 0.3), 0.09);
    root.addChild(pane);
  }
  return tag(root, { layers: 2, radius: width / 2, base: 0 });
}

// 构件目录：main 为主构件（高 1.2–2.2），secondary 为次构件（高 0.3–0.7）；height 为目标高度区间。
const decorCatalog = {
  pine5: { build: (random) => makePaperTree(random, 5), height: [1.9, 2.2] },
  pine4: { build: (random) => makePaperTree(random, 4), height: [1.5, 1.8] },
  pineSmall: { build: (random) => makePaperTree(random, 3), height: [0.5, 0.7] },
  lighthouse: { build: makeLighthouse, height: [2.0, 2.2] },
  observatory: { build: makeObservatory, height: [1.5, 1.8] },
  lantern: { build: (random) => makeLanternPost(random, false), height: [1.5, 1.7] },
  lanternSmall: { build: (random) => makeLanternPost(random, true), height: [0.55, 0.7] },
  house: { build: makeHouse, height: [1.3, 1.6] },
  bush: { build: makeBush, height: [0.35, 0.55] },
  flower: { build: makeFlowerCluster, height: [0.35, 0.5] },
  grass: { build: (random) => makeGrassTuft(random, 1), height: [0.3, 0.38] },
  mound: { build: makeSnowMound, height: [0.3, 0.42] },
  wave: { build: (random) => makeWaveStrip(random, 0.9), height: [0.36, 0.46], align: true },
  boat: { build: makePaperBoat, height: [0.5, 0.66] },
  stall: { build: makeMarketStall, height: [0.62, 0.7] },
  garland: { build: makeLanternGarland, height: [0.6, 0.7], align: true },
  telescope: { build: makeTelescope, height: [0.55, 0.7] },
};
const chapterDecorKinds = {
  1: { corners: ["pine5", "pine4", "pine5", "pine4"], extraMain: ["pine4", "pine5"], secondary: ["flower", "bush", "pineSmall", "flower", "grass", "bush"] },
  2: { corners: ["lighthouse", "pine4", "pine5", "pine4"], extraMain: ["pine4"], secondary: ["wave", "boat", "bush", "wave", "pineSmall", "flower"] },
  3: { corners: ["lantern", "lantern", "lantern", "lantern"], extraMain: ["house", "house", "lantern"], secondary: ["stall", "garland", "lanternSmall", "bush", "stall"] },
  4: { corners: ["observatory", "pine4", "pine5", "pine4"], extraMain: ["pine4", "pine5"], secondary: ["mound", "pineSmall", "telescope", "mound", "pineSmall"] },
};
const OCCLUSION_DIRECTION = LANDSCAPE_DIRECTION;
// 遮挡检查：书有 4 个朝向，把相机方向转到关卡局部坐标，从每个可走格顶面（中心 + 四角）与每颗星沿视线射出，
// 若射线穿过构件的包围圆柱（半径 radius，高 0..height，都在书页平面 y=-0.1 之上），即判定遮挡。桌面版视角更平，是最坏情况。
function decorOccludes(x, z, radius, height) {
  const samples = [];
  for (let cz = 0; cz < gridDepth; cz += 1) for (let cx = 0; cx < gridWidth; cx += 1) {
    if (!rules.solid(blueprint, cx, cz)) continue;
    const top = cellTop(cx, cz) - 0.1 + 0.02;
    samples.push([cx, top, cz], [cx - 0.45, top, cz - 0.45], [cx + 0.45, top, cz - 0.45], [cx - 0.45, top, cz + 0.45], [cx + 0.45, top, cz + 0.45]);
  }
  blueprint.stars.forEach((star) => { const top = cellTop(star.x, star.z) - 0.1; samples.push([star.x, top + 0.2, star.z], [star.x, top + 0.5, star.z], [star.x, top + 0.8, star.z]); });
  const yBase = -0.1; const yTop = -0.1 + height;
  for (let o = 0; o < 4; o += 1) {
    const angle = o * Math.PI / 2;
    const dx = OCCLUSION_DIRECTION.x * Math.cos(angle) + OCCLUSION_DIRECTION.z * Math.sin(angle);
    const dz = -OCCLUSION_DIRECTION.x * Math.sin(angle) + OCCLUSION_DIRECTION.z * Math.cos(angle);
    const dy = OCCLUSION_DIRECTION.y;
    for (const [sx, sy, sz] of samples) {
      const t1 = (yTop - sy) / dy;
      if (t1 <= 0) continue;
      const t0 = Math.max(0, (yBase - sy) / dy);
      const closest = Math.max(t0, Math.min(t1, -((sx - x) * dx + (sz - z) * dz) / (dx * dx + dz * dz)));
      const px = sx + closest * dx - x; const pz = sz + closest * dz - z;
      if (Math.hypot(px, pz) <= radius) return true;
    }
  }
  return false;
}
function nearestCellDistance(x, z) {
  let best = Infinity;
  for (let cz = 0; cz < gridDepth; cz += 1) for (let cx = 0; cx < gridWidth; cx += 1) if (rules.solid(blueprint, cx, cz)) best = Math.min(best, Math.hypot(cx - x, cz - z));
  return best;
}
// 用引擎的网格实例包围盒测量构件（未挂到场景时以自身为根）。
function measureDecor(item) {
  item.syncHierarchy();
  let minX = Infinity; let minY = Infinity; let minZ = Infinity; let maxX = -Infinity; let maxY = -Infinity; let maxZ = -Infinity;
  item.findComponents("render").forEach((render) => render.meshInstances.forEach((instance) => {
    const aabb = instance.aabb; const lo = aabb.getMin(); const hi = aabb.getMax();
    minX = Math.min(minX, lo.x); minY = Math.min(minY, lo.y); minZ = Math.min(minZ, lo.z); maxX = Math.max(maxX, hi.x); maxY = Math.max(maxY, hi.y); maxZ = Math.max(maxZ, hi.z);
  }));
  if (!Number.isFinite(minX)) return { height: 0.01, radius: 0.01 };
  return { height: maxY - Math.min(0, minY), radius: Math.max(Math.abs(minX), Math.abs(maxX), Math.abs(minZ), Math.abs(maxZ)) };
}
// 生成一个构件并缩放到目标高度；返回 { entity, height, radius, base, layers }。
function spawnDecor(kind, random, targetHeight) {
  const entry = decorCatalog[kind];
  const entity = entry.build(random);
  const natural = measureDecor(entity);
  const scale = targetHeight / Math.max(0.01, natural.height);
  setScale(entity, scale);
  const measured = measureDecor(entity);
  return { entity, kind, height: measured.height, radius: measured.radius, base: (entity.userData.base === undefined ? 0.2 : entity.userData.base) * scale, layers: entity.userData.layers || 2, tree: Boolean(entity.userData.tree) };
}
function placeDecor(spawned, x, z, main) {
  place(spawned.entity, cellWorld(x, z, -0.1));
  decorGroup.addChild(spawned.entity);
  decorItems.push({ kind: spawned.kind, x, z, height: spawned.height, radius: spawned.radius, base: spawned.base, layers: spawned.layers, tree: spawned.tree, main, entity: spawned.entity, clearance: nearestCellDistance(x, z) - spawned.base, occludes: decorOccludes(x, z, spawned.radius, spawned.height) });
}
// 主构件：从目标高度往下试到 1.2，再往书页外侧挪，直到四个朝向都不遮挡；四角主构件即使检查失败也保留（并计入统计）。
// point 是网格边界上的落点，out 是指向书页外侧的单位向量；基座离网格边至少 0.12 + 基座半径，保证与可走格中心距离 ≥ 0.6。
function tryPlaceMain(kind, random, point, out, baseDepth, margin, force) {
  const entry = decorCatalog[kind];
  const preferred = entry.height[0] + random() * (entry.height[1] - entry.height[0]);
  const heights = [];
  for (let h = preferred; h > 1.2 + 1e-6; h -= 0.2) heights.push(h);
  heights.push(1.2);
  let fallback = null;
  for (const extra of [0, 0.15, 0.3]) {
    for (const height of heights) {
      const spawned = spawnDecor(kind, random, height);
      const depth = Math.max(baseDepth, 0.12 + spawned.base) + extra;
      const reach = Math.max(Math.abs(out.x), Math.abs(out.z)) * depth + Math.min(spawned.base, 0.3);
      if (reach > margin + 0.1 && !(force && extra === 0)) { spawned.entity.destroy(); continue; }
      const px = point.x + out.x * depth; const pz = point.z + out.z * depth;
      if (!decorOccludes(px, pz, spawned.radius, spawned.height)) { if (fallback) fallback.spawned.entity.destroy(); placeDecor(spawned, px, pz, true); return true; }
      if (!fallback || height < fallback.spawned.height) { if (fallback) fallback.spawned.entity.destroy(); fallback = { spawned, px, pz }; } else spawned.entity.destroy();
    }
  }
  if (force && fallback) { placeDecor(fallback.spawned, fallback.px, fallback.pz, true); return true; }
  if (fallback) fallback.spawned.entity.destroy();
  return false;
}
function decorSeed() { return seeded(campaignLevelIndex * 104729 + 31); }
function rebuildDecor() { if (blueprint) buildDecor(decorSeed(), performanceProfiles[performanceTier].decor); }
function buildDecor(random, decorScale) {
  disposeGroup(decorGroup); disposeGroup(backdropGroup);
  decorItems.splice(0);
  lanternLightBudget = palette.lanterns ? 5 : 2;
  const margin = bookMargin();
  const kinds = chapterDecorKinds[blueprint.chapter];
  // 1) 网格四角各一组主构件：基座放在留白对角线上，离网格角约 0.62 格（竖屏留白 0.9 也放得下）。
  const cornerDepth = Math.min(margin - 0.2, 0.62) * 1.414;
  const corners = [
    { point: { x: -0.5, z: -0.5 }, out: { x: -0.707, z: -0.707 } },
    { point: { x: gridWidth - 0.5, z: -0.5 }, out: { x: 0.707, z: -0.707 } },
    { point: { x: gridWidth - 0.5, z: gridDepth - 0.5 }, out: { x: 0.707, z: 0.707 } },
    { point: { x: -0.5, z: gridDepth - 0.5 }, out: { x: -0.707, z: 0.707 } },
  ];
  corners.forEach((corner, index) => {
    // 先放本角指定的主构件；若四个朝向都放不下，换同章更细的主构件再试；仍不行才强制保留原构件并计入 occluding。
    const candidates = [kinds.corners[index]].concat(kinds.corners, kinds.extraMain).filter((kind, at, list) => list.indexOf(kind) === at);
    if (candidates.some((kind) => tryPlaceMain(kind, random, corner.point, corner.out, cornerDepth, margin, false))) return;
    tryPlaceMain(kinds.corners[index], random, corner.point, corner.out, cornerDepth, margin, true);
  });
  // 2) 环带槽位：沿网格四边每 ≤ 1.1 格一个槽（加 ±0.1 抖动仍 ≤ 1.5 格），低性能档按 decorScale 均匀抽稀，四角不受影响。
  const slots = [];
  const sides = [
    { length: gridWidth, at: (t) => ({ x: t, z: -0.5 }), out: { x: 0, z: -1 } },
    { length: gridDepth, at: (t) => ({ x: gridWidth - 0.5, z: t }), out: { x: 1, z: 0 } },
    { length: gridWidth, at: (t) => ({ x: gridWidth - 1 - t, z: gridDepth - 0.5 }), out: { x: 0, z: 1 } },
    { length: gridDepth, at: (t) => ({ x: -0.5, z: gridDepth - 1 - t }), out: { x: -1, z: 0 } },
  ];
  sides.forEach((side) => {
    const count = Math.ceil(side.length / 1.1);
    for (let index = 0; index < count; index += 1) {
      const along = -0.5 + (index + 0.5) * (side.length / count) + (random() - 0.5) * 0.2;
      slots.push({ point: side.at(Math.max(-0.3, Math.min(side.length - 0.7, along))), out: side.out });
    }
  });
  // 抽稀比例按“总数 × decorScale”折算：四角 4 组必留，其余槽位按 (总数 × decorScale − 4) / 槽位数 均匀保留。
  const keep = Math.max(0, Math.min(1, (decorScale * (slots.length + 4) - 4) / Math.max(1, slots.length)));
  slots.forEach((slot, index) => {
    if (keep < 1 && index > 0 && Math.floor(index * keep) === Math.floor((index - 1) * keep)) return;
    // 约三成槽位先尝试主构件（只有四个朝向都不遮挡才落位），否则放次构件。
    if (random() < 0.3 && tryPlaceMain(kinds.extraMain[Math.floor(random() * kinds.extraMain.length)], random, slot.point, slot.out, 0.45, margin, false)) return;
    const kind = kinds.secondary[Math.floor(random() * kinds.secondary.length)];
    const range = decorCatalog[kind].height;
    const spawned = spawnDecor(kind, random, range[0] + random() * (range[1] - range[0]));
    const minDepth = Math.max(0.35, 0.12 + spawned.base);
    const maxDepth = Math.max(minDepth, margin - 0.1 - Math.min(spawned.base, 0.25));
    const depth = minDepth + random() * (maxDepth - minDepth);
    if (decorCatalog[kind].align) setRot(spawned.entity, 0, Math.atan2(slot.out.x, slot.out.z), 0);
    placeDecor(spawned, slot.point.x + slot.out.x * depth, slot.point.z + slot.out.z * depth, false);
  });
  // 3) 远端背景：两排纸山 / 屋影，立在书后方桌面上，不随书旋转；颜色取章节 backdrop 三档，最远一排再叠 15% sky 提亮。
  const spread = Math.max(gridWidth, gridDepth) + 2 * margin;
  const backdropCount = Math.round(4 + spread * 0.6);
  // 点光预算：夜市 5 盏灯笼杆 + 出口门 1 盏 = 6 个点光；其余章节最多 2 盏。低性能档不加点光，只靠自发光。
  let lights = 0;
  if (performanceTier !== "low") decorItems.forEach((item) => {
    const anchor = item.entity.userData && item.entity.userData.lanternAnchor;
    if (!anchor || lanternLightBudget <= 0) return;
    lanternLightBudget -= 1; lights += 1;
    const light = new pc.Entity("lantern-light");
    light.addComponent("light", { type: "omni", color: pcColor(palette.accent), intensity: 1.6, range: 3.8, falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED, castShadows: false });
    light.setLocalPosition(anchor.x, anchor.y, anchor.z);
    item.entity.addChild(light);
    item.entity.userData.light = light;
  });
  for (let index = 0; index < backdropCount; index += 1) {
    const rowBack = index % 2 === 0;
    const along = (index + 0.5) / backdropCount + (random() - 0.5) * 0.06;
    const tone = rowBack ? palette.backdrop[index % 4 === 0 ? 1 : 0] : palette.backdrop[2];
    const color = rowBack ? mixColor(tone, palette.sky, 0.15) : tone;
    const height = rowBack ? 1.7 + random() * 0.8 : 1.0 + random() * 0.45;
    const width = rowBack ? 1.7 + random() * 1.1 : 1.1 + random() * 0.7;
    const piece = palette.lanterns ? makeBackdropHouse(random, height, color, width * 0.7) : makeBackdropPeak(random, height, color, width);
    piece.setLocalPosition((along - 0.5) * spread, 0, rowBack ? -0.55 : 0);
    backdropGroup.addChild(piece);
    if (blueprint.chapter <= 2 && rowBack && random() < 0.6) {
      const cloud = makeCloud(random);
      cloud.setLocalPosition((along - 0.5) * spread + 0.5, height + 0.25 + random() * 0.3, -0.3);
      backdropGroup.addChild(cloud);
    }
  }
  if (blueprint.chapter === 2) {
    for (let index = 0; index < 2; index += 1) { const bird = makeSeaBird(random); bird.setLocalPosition((index - 0.5) * spread * 0.5 + (random() - 0.5) * 0.8, 2.4 + random() * 0.4, 0.2); backdropGroup.addChild(bird); }
  } else if (blueprint.chapter === 3) {
    const moon = makeMoon(); moon.setLocalPosition(spread * 0.28, 2.9, -0.8); backdropGroup.addChild(moon);
    for (let index = 0; index < 5; index += 1) { const star = makeSkyStar(0.05); star.setLocalPosition((random() - 0.5) * spread, 2.3 + random() * 0.9, -0.7); backdropGroup.addChild(star); }
  } else if (blueprint.chapter === 4) {
    for (let index = 0; index < 9; index += 1) { const star = makeSkyStar(0.045 + random() * 0.03); star.setLocalPosition((random() - 0.5) * spread, 2.2 + random() * 1.0, -0.7); backdropGroup.addChild(star); }
  }
  backdropTargetZ = backdropZFor(model ? model.o : 0);
  backdropGroup.setLocalPosition(0, -0.62, backdropTargetZ);
  // 4) 统计（供浏览器测试与美术验收）：环带间距按网格边界矩形的周长参数计算。
  const perimeter = 2 * (gridWidth + gridDepth);
  const params = decorItems.map((item) => {
    const left = -0.5 - item.x; const right = item.x - (gridWidth - 0.5); const top = -0.5 - item.z; const bottom = item.z - (gridDepth - 0.5);
    const cx = Math.max(-0.5, Math.min(gridWidth - 0.5, item.x)); const cz = Math.max(-0.5, Math.min(gridDepth - 0.5, item.z));
    const best = Math.max(left, right, top, bottom);
    if (best === top && top >= Math.max(left, right)) return cx + 0.5;
    if (best === right && right >= Math.max(top, bottom)) return gridWidth + cz + 0.5;
    if (best === bottom && bottom >= Math.max(left, right)) return gridWidth + gridDepth + (gridWidth - 0.5 - cx);
    return 2 * gridWidth + gridDepth + (gridDepth - 0.5 - cz);
  }).sort((a, b) => a - b);
  let maxGap = params.length ? perimeter - params[params.length - 1] + params[0] : perimeter;
  for (let index = 1; index < params.length; index += 1) maxGap = Math.max(maxGap, params[index] - params[index - 1]);
  const mains = decorItems.filter((item) => item.main);
  const secondaries = decorItems.filter((item) => !item.main);
  const round = (value) => Number(value.toFixed(3));
  decorStats = {
    tier: performanceTier, decorScale, count: decorItems.length, mainCount: mains.length, cornerMains: Math.min(4, mains.length),
    perimeter: round(perimeter), maxGap: round(maxGap), slotCount: slots.length,
    minClearance: round(Math.min(...decorItems.map((item) => item.clearance))),
    occluding: decorItems.filter((item) => item.occludes).length,
    minLayers: Math.min(...decorItems.map((item) => item.layers)),
    minTreeLayers: decorItems.some((item) => item.tree) ? Math.min(...decorItems.filter((item) => item.tree).map((item) => item.layers)) : null,
    mainHeight: mains.length ? [round(Math.min(...mains.map((item) => item.height))), round(Math.max(...mains.map((item) => item.height)))] : null,
    secondaryHeight: secondaries.length ? [round(Math.min(...secondaries.map((item) => item.height))), round(Math.max(...secondaries.map((item) => item.height)))] : null,
    lights, backdropCount, layerOffset: LAYER_OFFSET, layerLift: LAYER_LIFT,
    kinds: decorItems.reduce((acc, item) => { acc[item.kind] = (acc[item.kind] || 0) + 1; return acc; }, {}),
  };
}
function backdropZFor(orientation) {
  const halfDepth = (orientation % 2 === 0 ? gridDepth : gridWidth) / 2;
  return -(halfDepth + bookMargin() + 0.25 + 0.4);
}

// ---- 关卡对象：桥 / 台阶、压板、折纸星、检查点旗、出口门、纸偶、障碍。 ----
function createLinkView(link) {
  const root = new pc.Entity("link-" + link.id);
  const dx = Math.sign(link.to.x - link.from.x);
  const dz = Math.sign(link.to.z - link.from.z);
  const span = Math.abs(link.to.x - link.from.x) + Math.abs(link.to.z - link.from.z);
  const fromTop = cellTop(link.from.x, link.from.z);
  const toTop = cellTop(link.to.x, link.to.z);
  // 台阶从低格折向高格；桥从 from 折向 to。
  const lowFirst = link.kind === "stair" && toTop < fromTop;
  const base = lowFirst ? link.to : link.from;
  const baseTop = lowFirst ? toTop : fromTop;
  const dir = lowFirst ? { x: -dx, z: -dz } : { x: dx, z: dz };
  const hinge = cellWorld(base.x, base.z, baseTop - 0.1).add(new pc.Vec3(dir.x * 0.49, 0, dir.z * 0.49));
  place(root, hinge);
  setRot(root, 0, Math.atan2(dir.x, dir.z), 0);
  const arm = new pc.Entity("arm");
  root.addChild(arm);
  if (link.kind === "bridge") {
    const length = span - 0.98;
    const plank = paperBox(0.62, 0.07, length, palette.accent2, { edgeColor: palette.edge, edgeOpacity: 0.9 });
    plank.setLocalPosition(0, 0.035, length / 2);
    arm.addChild(plank);
    for (let slat = 1; slat < Math.round(length / 0.32); slat += 1) {
      const line = paperBox(0.62, 0.075, 0.02, mixColor(palette.accent2, palette.edge, 0.7), { noEdges: true, map: null, cast: false });
      line.setLocalPosition(0, 0.04, slat * 0.32);
      arm.addChild(line);
    }
    for (const sideSign of [-1, 1]) { const rail = paperBox(0.05, 0.22, length, palette.side, { noEdges: true }); rail.setLocalPosition(sideSign * 0.3, 0.15, length / 2); arm.addChild(rail); }
  } else {
    const rise = Math.abs(toTop - fromTop);
    const steps = 4;
    for (let index = 0; index < steps; index += 1) {
      const stepHeight = rise / steps;
      const stepMesh = paperBox(0.62, stepHeight * (index + 1), 0.98 / steps, palette.side, { edgeColor: palette.edge });
      stepMesh.setLocalPosition(0, (stepHeight * (index + 1)) / 2, 0.98 / steps * (index + 0.5));
      arm.addChild(stepMesh);
    }
  }
  const view = { link, root, arm, open: false, fold: 1, glow: null };
  if (link.timer || link.plate || typeof link.step === "number") {
    const material = uniqueMaterial({ emissive: palette.accent, emissiveIntensity: 0.2 });
    const lantern = meshEntity(octahedronMesh(0.11, palette.accent), material);
    lantern.setLocalPosition(0.42, 0.55, 0.1);
    root.addChild(lantern);
    view.glow = material;
  }
  linkViews.push(view);
  return root;
}

function createPlateView(plate) {
  const root = new pc.Entity("plate-" + plate.id);
  const top = cellTop(plate.at.x, plate.at.z);
  place(root, cellWorld(plate.at.x, plate.at.z, top - 0.1));
  const color = plate.kind === "timer" ? palette.accent : plate.kind === "toggle" ? palette.accent2 : palette.accent;
  const pad = paperBox(0.66, 0.07, 0.66, color, { edgeColor: palette.edge, emissive: color, emissiveIntensity: 0.05, unique: true });
  pad.setLocalPosition(0, 0.035, 0);
  root.addChild(pad);
  const view = { plate, root, pad, padMaterial: meshMaterial(pad), knob: null, ring: null };
  if (plate.kind === "order") {
    for (let index = 0; index < (plate.order || 1); index += 1) { const dot = paperBox(0.1, 0.06, 0.1, palette.edge, { noEdges: true, map: null }); dot.setLocalPosition(-0.18 + index * 0.18, 0.1, 0); root.addChild(dot); }
  }
  if (plate.kind === "timer") {
    const ring = meshEntity(torusMesh(0.24, 0.035, 6, 20, palette.edge), materialFor({ map: null, emissive: palette.accent, emissiveIntensity: 0.3 }));
    ring.setLocalPosition(0, 0.09, 0);
    root.addChild(ring);
    view.ring = ring;
  }
  if (plate.kind === "toggle") {
    const knob = shapeEntity(coneMesh(0.12, 0.16, 4, palette.edge), 0);
    knob.setLocalPosition(0, 0.15, 0);
    root.addChild(knob);
    view.knob = knob;
  }
  plateViews.push(view);
  return root;
}

function starGeometry(radius, depth, color, edgeColor) { return sheetMesh(starPoints(radius, 0, 5), depth, color, edgeColor, 0.03); }
function createStarView(star, index) {
  const root = new pc.Entity("star-" + index);
  const top = cellTop(star.x, star.z);
  place(root, cellWorld(star.x, star.z, top - 0.1));
  const pocket = new pc.Entity("pocket");
  // 纸口袋：三面墙加一个顶，开口朝向“在可见角度时正对镜头”的方向。
  const openDirection = rules.DIRECTION_ORDER[(2 - star.angles[0] + 4) % 4];
  setRot(pocket, 0, directionAngle(openDirection), 0);
  const back = paperBox(0.9, 0.86, 0.05, palette.side, { edgeColor: palette.edge, edgeOpacity: 0.95 }); back.setLocalPosition(0, 0.43, -0.44);
  const left = paperBox(0.05, 0.86, 0.9, palette.side, { edgeColor: palette.edge, edgeOpacity: 0.95 }); left.setLocalPosition(-0.44, 0.43, 0);
  const right = paperBox(0.05, 0.86, 0.9, palette.side, { edgeColor: palette.edge, edgeOpacity: 0.95 }); right.setLocalPosition(0.44, 0.43, 0);
  const roof = paperBox(0.94, 0.06, 0.94, palette.top[0], { edgeColor: palette.edge, edgeOpacity: 0.95 }); roof.setLocalPosition(0, 0.88, 0);
  [back, left, right, roof].forEach((wall) => pocket.addChild(wall));
  const cutout = meshEntity(sheetMesh(hexPoints(0.16), 0.01, palette.cover, palette.cover, 0), materialFor({ map: null, doubleSide: true }), { cast: false });
  cutout.setLocalPosition(0, 0.5, -0.47);
  pocket.addChild(cutout);
  if (star.angles.length === 4) pocket.enabled = false;
  root.addChild(pocket);
  const starMaterial = uniqueMaterial({ emissive: palette.star, emissiveIntensity: 1.1 });
  const starMesh = meshEntity(starGeometry(0.3, 0.1, palette.star, 0xffffff), starMaterial);
  starMesh.setLocalPosition(0, 0.46, 0);
  // 发光边：一枚略大的半透明纸星贴在后面。
  const halo = meshEntity(sheetMesh(starPoints(0.38, 0, 5), 0.02, palette.star, palette.star, 0), materialFor({ map: null, opacity: 0.32 }), { cast: false, receive: false });
  halo.setLocalPosition(0, 0, -0.04);
  starMesh.addChild(halo);
  const glow = new pc.Entity("star-light");
  glow.addComponent("light", { type: "omni", color: pcColor(palette.star), intensity: 0, range: 2.2, falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED, castShadows: false });
  glow.setLocalPosition(0, 0.6, 0.25);
  root.addChild(starMesh); root.addChild(glow);
  starViews.push({ star, index, root, starMesh, glow, pocket, collected: false, pop: 0 });
  return root;
}

function createFlagView(point, index) {
  const root = new pc.Entity("flag-" + index);
  place(root, cellWorld(point.x, point.z, cellTop(point.x, point.z) - 0.1));
  const pole = shapeEntity(cylinderMesh(0.03, 0.035, 1.25, 5, palette.cover, palette.cover), 0);
  pole.setLocalPosition(0.3, 0.62, 0.3);
  const flagMaterial = uniqueMaterial({ tint: palette.accent2, emissive: palette.accent2, emissiveIntensity: 0.15, doubleSide: true });
  const flag = meshEntity(triangleMesh([[0, 0, 0], [0.56, -0.16, 0], [0, -0.36, 0]], 0xffffff), flagMaterial);
  flag.setLocalPosition(0.32, 1.22, 0.3);
  const base = shapeEntity(cylinderMesh(0.14, 0.17, 0.08, 6, palette.edge, edgeTint(palette.edge, palette.accent2, 0.6)), 0);
  base.setLocalPosition(0.3, 0.04, 0.3);
  const ringMaterial = uniqueMaterial({ tint: palette.accent2, emissive: palette.accent2, emissiveIntensity: 0.3 });
  const ring = meshEntity(torusMesh(0.3, 0.025, 5, 18, 0xffffff), ringMaterial);
  ring.setLocalPosition(0, 0.04, 0);
  root.addChild(pole); root.addChild(flag); root.addChild(base); root.addChild(ring);
  flagViews.push({ index, root, flag, flagMaterial, ringMaterial, reached: false });
  return root;
}

function createExitView(point) {
  // 出口门：每章一个标志物——草甸灯笼门、海岸小灯塔、夜市灯笼串、雪原天文台圆顶。
  const root = new pc.Entity("exit");
  place(root, cellWorld(point.x, point.z, cellTop(point.x, point.z) - 0.1));
  for (const sideSign of [-1, 1]) {
    const post = paperBox(0.14, 1.3, 0.14, palette.cover, { edgeOpacity: 0.6, map: null });
    post.setLocalPosition(sideSign * 0.4, 0.65, 0);
    root.addChild(post);
    const foot = paperBox(0.26, 0.1, 0.26, palette.side, { edgeColor: palette.edge });
    foot.setLocalPosition(sideSign * 0.4, 0.05, 0);
    root.addChild(foot);
  }
  const lintel = paperBox(1.24, 0.14, 0.22, palette.cover, { edgeColor: palette.edge, edgeOpacity: 0.6 });
  lintel.setLocalPosition(0, 1.34, 0);
  root.addChild(lintel);
  const lanternMaterial = uniqueMaterial({ emissive: palette.accent, emissiveIntensity: 1.3 });
  const hangLantern = (x, y, size) => { const lantern = meshEntity(octahedronMesh(size, palette.accent), lanternMaterial); lantern.setLocalPosition(x, y, 0.16); root.addChild(lantern); };
  const roofCone = (radius, height, color) => { const roof = shapeEntity(coneMesh(radius, height, 4, color, edgeTint(color, palette.edge, 0.7)), 0); setRot(roof, 0, Math.PI / 4, 0); return roof; };
  if (blueprint.chapter === 1) {
    const roof = roofCone(0.9, 0.34, palette.accent2); roof.setLocalPosition(0, 1.58, 0); root.addChild(roof);
    hangLantern(-0.4, 1.1, 0.13); hangLantern(0.4, 1.1, 0.13);
  } else if (blueprint.chapter === 2) {
    const roof = roofCone(0.85, 0.3, palette.accent); roof.setLocalPosition(0, 1.56, 0); root.addChild(roof);
    const tower = shapeEntity(cylinderMesh(0.16, 0.22, 1.5, 7, palette.edge, edgeTint(palette.edge, palette.accent2, 0.6)), 0); tower.setLocalPosition(0.68, 0.75, -0.42); root.addChild(tower);
    const band = shapeEntity(cylinderMesh(0.19, 0.19, 0.22, 7, palette.accent, palette.accent), 0); band.setLocalPosition(0.68, 0.75, -0.42); root.addChild(band);
    const lamp = meshEntity(cylinderMesh(0.12, 0.14, 0.24, 6, palette.accent, palette.accent), lanternMaterial); lamp.setLocalPosition(0.68, 1.62, -0.42); root.addChild(lamp);
    const cap = shapeEntity(coneMesh(0.2, 0.2, 6, palette.accent2, palette.accent2), 0); cap.setLocalPosition(0.68, 1.84, -0.42); root.addChild(cap);
    hangLantern(0, 1.1, 0.12);
  } else if (blueprint.chapter === 3) {
    const roof = roofCone(0.95, 0.38, palette.accent2); roof.setLocalPosition(0, 1.62, 0); root.addChild(roof);
    for (let index = 0; index < 5; index += 1) hangLantern(-0.5 + index * 0.25, 1.16 - Math.abs(index - 2) * 0.05, 0.1);
    const string = paperBox(1.2, 0.015, 0.015, palette.edge, { noEdges: true, map: null }); string.setLocalPosition(0, 1.25, 0.16); root.addChild(string);
  } else {
    const drum = shapeEntity(cylinderMesh(0.42, 0.42, 0.24, 10, palette.edge, edgeTint(palette.edge, palette.accent2, 0.6)), 0); drum.setLocalPosition(0, 1.53, 0); root.addChild(drum);
    const dome = shapeEntity(domeMesh(0.42, 10, 6, palette.edge), 0); dome.setLocalPosition(0, 1.65, 0); root.addChild(dome);
    const slit = paperBox(0.1, 0.36, 0.5, palette.accent2, { noEdges: true, map: null }); slit.setLocalPosition(0, 1.86, 0); setRot(slit, 0, 0, 0.2); root.addChild(slit);
    const scope = shapeEntity(cylinderMesh(0.05, 0.07, 0.6, 6, palette.accent, palette.accent), 0); scope.setLocalPosition(0.12, 2.05, 0); setRot(scope, 0, 0, -0.9); root.addChild(scope);
    hangLantern(-0.4, 1.1, 0.11); hangLantern(0.4, 1.1, 0.11);
  }
  const light = new pc.Entity("exit-light");
  light.addComponent("light", { type: "omni", color: pcColor(palette.accent), intensity: palette.lanterns ? 2.2 : 1.4, range: 4, falloffMode: pc.LIGHTFALLOFF_INVERSESQUARED, castShadows: false });
  light.setLocalPosition(0, 1.15, 0.4);
  root.addChild(light);
  root.userData = { lanternMaterial, light };
  return root;
}
function createPlayerView() {
  const root = new pc.Entity("player");
  const puppet = new pc.Entity("puppet");
  root.addChild(puppet);
  const body = shapeEntity(icoMesh(0.2, 0xf7efdd), 0); body.setLocalScale(1, 1.15, 1); body.setLocalPosition(0, 0.24, 0);
  const head = shapeEntity(icoMesh(0.14, 0xf7efdd), 0); head.setLocalPosition(0, 0.55, 0);
  const hat = shapeEntity(coneMesh(0.2, 0.14, 6, 0x2f3d5c, 0x2f3d5c), 0); hat.setLocalPosition(0, 0.7, 0);
  const brim = shapeEntity(cylinderMesh(0.25, 0.25, 0.03, 8, 0x2f3d5c, 0x2f3d5c), 0); brim.setLocalPosition(0, 0.63, 0);
  const backpack = paperBox(0.16, 0.2, 0.1, 0xd98265, { edgeColor: 0xfff1dc, edgeOpacity: 0.7, map: null }); backpack.setLocalPosition(0, 0.3, -0.18);
  const facing = meshEntity(coneMesh(0.07, 0.14, 3, palette.accent, palette.accent), materialFor({ map: null, opacity: 0.85 }), { cast: false, receive: false });
  setRot(facing, Math.PI / 2, 0, 0); facing.setLocalPosition(0, 0.02, 0.36);
  [body, head, hat, brim, backpack, facing].forEach((part) => puppet.addChild(part));
  root.userData = { puppet, facing };
  return root;
}

function createHazardView(hazard) {
  const root = new pc.Entity("hazard-" + hazard.id);
  const marker = new pc.Entity("hazard-next");
  if (hazard.kind === "wave") {
    // 纸浪：三片错位的浪头（后片墨蓝、中片海沫、前片最亮）+ 一层泡沫纸；比旧版大一圈，让“会撞人的东西”在手机上也读得出来。
    const tones = [palette.accent2, palette.hazard, shade(palette.hazard, 0.18)];
    for (let index = -1; index <= 1; index += 1) {
      const crest = meshEntity(coneMesh(0.26, 0.46 - Math.abs(index) * 0.08, 3, tones[index + 1], edgeTint(tones[index + 1], palette.edge, 0.9)), materialFor({ map: null, emissive: tones[index + 1], emissiveIntensity: 0.1 }));
      crest.setLocalPosition(index * 0.3, 0.2, (index % 2) * 0.1 - 0.05);
      setRot(crest, 0, index * 0.7, 0);
      root.addChild(crest);
    }
    const foam = paperBox(0.96, 0.07, 0.62, palette.edge, { edgeColor: palette.hazard, edgeOpacity: 0.6, map: null });
    foam.setLocalPosition(0, 0.035, 0);
    root.addChild(foam);
    // 下一拍落点提示：纸浪要涌到的格子上先铺一圈泡沫环。
    const ring = meshEntity(torusMesh(0.38, 0.035, 4, 16, palette.accent2), materialFor({ map: null, emissive: palette.accent2, emissiveIntensity: 0.9, opacity: 0.85 }), { cast: false, receive: false });
    marker.addChild(ring);
  } else {
    const body = shapeEntity(coneMesh(0.16, 0.42, 3, palette.bird, edgeTint(palette.bird, palette.cover, 0.6)), 0);
    setRot(body, Math.PI / 2, 0, 0);
    const leftWing = meshEntity(triangleMesh([[0, 0, -0.1], [0.42, 0.06, 0.05], [0, 0, 0.16]], palette.bird), plainMat);
    const rightWing = meshEntity(triangleMesh([[0, 0, -0.1], [0.42, 0.06, 0.05], [0, 0, 0.16]], palette.bird), plainMat); rightWing.setLocalScale(-1, 1, 1);
    root.addChild(body); root.addChild(leftWing); root.addChild(rightWing);
    root.userData = { wings: [leftWing, rightWing] };
    // 下一拍落点提示：纸鸟的影子先落到它要飞去的格子。
    const shadow = meshEntity(discMesh(0.32, 10, palette.cover), materialFor({ map: null, opacity: 0.45 }), { cast: false, receive: false });
    marker.addChild(shadow);
  }
  level.addChild(marker);
  const view = { hazard, root, marker, from: null, to: null, prevCell: null, cell: null, next: null };
  hazardViews.push(view);
  return root;
}
`;
