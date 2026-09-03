import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  ENGINE_BEHAVIORS, buildScenePlan, controlBarHtml, controlButtonsHtml, engineImportHeader, engineRuntimeExports, engineRuntimeFiles, engineRuntimeScript,
  manifestPerformanceProfiles, stripModuleExports, studioRenderPreset, summarizeScenePlan, toJsLiteral, validateEngineBehaviors, validateEngineRules,
  writeEngineAttribution, writeEngineSceneReport, writeEngineVendor,
} from "../src/engine/playcanvas/index";
import { createColorKit } from "../src/engine/playcanvas/runtime/color.js";
import { createGeometryKit } from "../src/engine/playcanvas/runtime/geometry.js";
import { createMaterialKit } from "../src/engine/playcanvas/runtime/materials.js";
import { createEntityKit } from "../src/engine/playcanvas/runtime/entities.js";
import { createSceneGraph } from "../src/engine/playcanvas/runtime/scene-graph.js";
import { createBehaviorRuntime, createEventBus, createGrid } from "../src/engine/playcanvas/runtime/behaviors.js";
import { createRuleBridge } from "../src/engine/playcanvas/runtime/rules.js";
import { createDebugApi } from "../src/engine/playcanvas/runtime/debug.js";
import { buildEngineDemoArtifact, loadDemoProject, validateDemoProject } from "../examples/engine-playcanvas-demo/build";
import { paperRenderPreset, popupControlButtons } from "../src/server/playcanvas-popup-runtime";

// ---- 假 PlayCanvas：只实现引擎层片段用到的最小接口，让几何 / 材质 / 实体 / 场景图 / 行为 / 规则桥能在 Node 里跑。 ----
class FakeVec3 { x: number; y: number; z: number; constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; } }
class FakeColor { r: number; g: number; b: number; a: number; constructor(r: number, g: number, b: number, a = 1) { this.r = r; this.g = g; this.b = b; this.a = a; } }
class FakeEntity {
  name: string; children: FakeEntity[] = []; parent: FakeEntity | null = null; enabled = true; userData: Record<string, unknown> = {};
  position = new FakeVec3(); euler = new FakeVec3(); scale = new FakeVec3(1, 1, 1); render: { meshInstances: Array<{ mesh: unknown; material: unknown }>; castShadows: boolean } | null = null; light: Record<string, unknown> | null = null;
  constructor(name?: string) { this.name = name ?? ""; }
  addComponent(type: string, options: Record<string, unknown>) { if (type === "render") this.render = { meshInstances: options.meshInstances as Array<{ mesh: unknown; material: unknown }>, castShadows: Boolean(options.castShadows) }; if (type === "light") this.light = options; }
  addChild(child: FakeEntity) { child.parent = this; this.children.push(child); }
  destroy() { if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1); this.children.slice().forEach((child) => child.destroy()); }
  setLocalPosition(x: number, y: number, z: number) { this.position = new FakeVec3(x, y, z); }
  getLocalPosition() { return this.position; }
  setLocalEulerAngles(x: number, y: number, z: number) { this.euler = new FakeVec3(x, y, z); }
  setLocalScale(x: number, y: number, z: number) { this.scale = new FakeVec3(x, y, z); }
  syncHierarchy() {}
  findComponents(type: string): unknown[] { const own = type === "render" && this.render ? [this.render] : []; return [...own, ...this.children.flatMap((child) => child.findComponents(type))]; }
}
class FakeMaterial {
  diffuse = { set() {} }; diffuseMapTiling = { set() {} }; destroyed = false; updates = 0; emissive: unknown; emissiveIntensity = 0; opacity = 1; blendType = 0; depthWrite = true; cull = 0; twoSidedLighting = false; diffuseVertexColor = false; vertexColorGamma = false; useMetalness = false; metalness = 0; gloss = 0; diffuseMap: unknown; opacityMap: unknown; opacityMapChannel = "";
  update() { this.updates += 1; } destroy() { this.destroyed = true; }
}
const fakePc = {
  Vec3: FakeVec3, Color: FakeColor, Entity: FakeEntity, StandardMaterial: FakeMaterial,
  Geometry: class { positions: number[] = []; normals: number[] = []; uvs: number[] = []; colors: number[] = []; indices: number[] = []; },
  Mesh: { fromGeometry: (_device: unknown, geometry: { indices: number[]; positions: number[]; colors: number[] }) => ({ geometry, indices: geometry.indices, refs: 0, primitive: [{ count: geometry.indices.length }], incRefCount() { this.refs += 1; } }) },
  MeshInstance: class { mesh: unknown; material: unknown; constructor(mesh: unknown, material: unknown) { this.mesh = mesh; this.material = material; } },
  Asset: class { name: string; resource: unknown = null; constructor(name: string) { this.name = name; } ready() {} },
  ADDRESS_REPEAT: 1, BLEND_NORMAL: 2, CULLFACE_NONE: 0, LIGHTFALLOFF_INVERSESQUARED: 1,
};
const fakeApp = { assets: { add() {}, load() {} } };

function cleanup(root: string) { const safe = resolve(root); if (safe.startsWith(resolve(tmpdir()))) rmSync(safe, { recursive: true, force: true }); }

test("渲染预设：JS 字面量序列化保留裸键（tiltShift: true 可被静态探针读到）且可逆", () => {
  const literal = toJsLiteral(paperRenderPreset);
  assert.match(literal, /tiltShift: true/);
  assert.match(literal, /performanceProfiles: \{/);
  assert.deepEqual(new Function(`return ${literal};`)(), paperRenderPreset);
  assert.deepEqual(Object.keys(manifestPerformanceProfiles(paperRenderPreset)), ["low", "medium", "high"]);
  assert.deepEqual(manifestPerformanceProfiles(paperRenderPreset).high, { pixelRatio: 1.5, shadows: true, tiltShift: true });
  assert.equal(studioRenderPreset.id, "studio-lowpoly");
  assert.throws(() => toJsLiteral(() => 1));
});

test("几何构建器：耳切三角化、斜切盒、纸片外沿、挤出多边形、共享缓存与顶点色烤制", () => {
  const geometry = createGeometryKit(fakePc, {});
  const star = geometry.starPoints(1, 0, 5);
  assert.equal(geometry.triangulate(star).length, star.length - 2, "凹多边形三角化 n-2 个三角形");
  assert.equal(geometry.triangulate([[0, 0], [1, 0], [1, 1], [0, 1]]).length, 2);
  const box = geometry.boxMesh(1, 1, 1, 0xff0000, 0x00ff00, 0.03, null) as unknown as { indices: number[]; geometry: { colors: number[] } };
  assert.equal(box.indices.length / 3, 6 * 2 + 12 * 2 + 8, "6 面 + 12 斜切边 + 8 角");
  assert.deepEqual(box.geometry.colors.slice(0, 4), [255, 0, 0, 255], "顶点色为 sRGB 字节");
  const plain = geometry.boxMesh(1, 1, 1, 0xff0000, 0x00ff00, 0, null) as unknown as { indices: number[] };
  assert.equal(plain.indices.length / 3, 12);
  const sheet = geometry.sheetMesh([[0, 0], [1, 0], [1, 1], [0, 1]], 0.05, 0xffffff, 0x000000, 0.02) as unknown as { indices: number[] };
  assert.equal(sheet.indices.length / 3, 2 * (2 + 4 * 2) + 4 * 2, "正反面 + 外沿窄边 + 侧壁");
  const extruded = geometry.extrudeMesh([[0, 0], [1, 0], [1, 1], [0, 1]], 0.05, 0xffffff) as unknown as { indices: number[] };
  assert.equal(extruded.indices.length / 3, 2 * 2 + 4 * 2);
  assert.equal(geometry.boxMesh(1, 1, 1, 0xff0000, 0x00ff00, 0.03, null), box, "同参数命中缓存");
  assert.equal((box as unknown as { refs: number }).refs, 1, "缓存网格多加一次引用计数");
  assert.equal(geometry.meshCache.size, 4);
  for (const build of [() => geometry.coneMesh(0.5, 1, 6, 1, 2), () => geometry.cylinderMesh(0.5, 0.5, 1, 8, 1, 2), () => geometry.domeMesh(0.5, 8, 4, 1), () => geometry.icoMesh(0.5, 1), () => geometry.octahedronMesh(0.5, 1), () => geometry.torusMesh(0.5, 0.1, 6, 12, 1), () => geometry.discMesh(0.5, 8, 1), () => geometry.triangleMesh([[0, 0, 0], [1, 0, 0], [0, 1, 0]], 1), () => geometry.planeMesh(1, 1, 1)]) {
    assert.ok((build() as unknown as { indices: number[] }).indices.length >= 3);
  }
});

test("颜色与材质：色板工具、共享材质缓存、发光 / 半透明工厂、临时材质销毁", () => {
  const color = createColorKit(fakePc);
  assert.equal(color.parseHex("#ff0000"), 0xff0000);
  assert.equal(color.parseHex("bad", 0x123456), 0x123456);
  assert.equal(color.mixColor(0x000000, 0xffffff, 0.5), 0x808080);
  assert.ok(color.toHsl(color.shade(0x808080, 0.2)).l > color.toHsl(0x808080).l);
  assert.equal(color.deg(Math.PI), 180);
  const materials = createMaterialKit(fakePc, fakeApp, color, { maps: { paper: { texture: "paper-grain.png", tiling: 1.5 } } });
  const a = materials.materialFor({ map: "paper" }); const b = materials.materialFor({ map: "paper" });
  assert.equal(a, b, "同 key 复用共享材质");
  assert.ok(materials.textureAssets["paper-grain.png"], "命名贴图映射加载位图");
  const glow = materials.glowMaterial(0xffaa00, 1.2) as FakeMaterial;
  assert.equal(glow.emissiveIntensity, 1.2);
  const translucent = materials.translucentMaterial(0.4, true) as FakeMaterial;
  assert.equal(translucent.opacity, 0.4); assert.equal(translucent.depthWrite, false); assert.equal(translucent.twoSidedLighting, true);
  const unique = materials.uniqueMaterial({ tint: 0x112233, emissive: 0x112233, emissiveIntensity: 0.3 }) as FakeMaterial;
  assert.equal(materials.transientMaterials.length, 1);
  materials.disposeTransientMaterials();
  assert.equal(unique.destroyed, true); assert.equal(materials.transientMaterials.length, 0);
  assert.equal(materials.materialCache.size, 3);
});

test("场景计划：GameProjectV3 → 实体映射（x→X、y→Z、elevation→Y、形状 / 颜色 / 贴图 / 父级），非 webgl 与 interface 记入 skipped", () => {
  const project = loadDemoProject();
  const plan = buildScenePlan(project, { center: true });
  assert.equal(plan.entities.length, 34);
  assert.deepEqual(plan.skipped, [{ instanceId: "INSTANCE-HUD", objectId: "OBJECT-HUD", renderer: "dom", reason: "renderer=dom 不由 3D 引擎层渲染" }]);
  assert.deepEqual(plan.origin, { x: 2, z: 2 }, "包围盒中心吸附到格后平移到原点");
  const player = plan.entities.find((entity) => entity.id === "INSTANCE-PLAYER")!;
  assert.deepEqual(player.position, { x: -2, y: 0.3, z: 2 });
  assert.deepEqual(player.size, { x: 0.5, y: 0.7, z: 0.5 });
  assert.equal(player.color, 0xf7efdd); assert.equal(player.shape, "box");
  const star = plan.entities.find((entity) => entity.id === "INSTANCE-STAR-1")!;
  assert.equal(star.shape, "star"); assert.equal(star.emissive, 0.9);
  const plate = plan.entities.find((entity) => entity.id === "INSTANCE-PLATE")!;
  assert.deepEqual(plate.textures, [{ id: "RESOURCE-DECAL", path: "assets/decal-meadow.png", mimeType: "image/png" }]);
  assert.equal(plate.textureMode, "sticker");
  const tile = plan.entities.find((entity) => entity.id === "INSTANCE-TILE-0-0")!;
  assert.equal(tile.shape, "box"); assert.equal(tile.size.y, 0.3, "background 角色默认高度");
  assert.deepEqual(plan.entities.map((entity) => entity.layer), [...plan.entities.map((entity) => entity.layer)].sort((a, b) => a - b), "按 layer 排序");
  const summary = summarizeScenePlan(plan);
  assert.deepEqual(summary.byRole, { background: 28, player: 1, collectible: 3, helper: 1, hazard: 1 });
  assert.deepEqual(summary.behaviorModules, ["engine.beat-mover", "engine.grid-footprint", "engine.grid-walker", "engine.pickup", "engine.pressure-plate", "engine.static-decor"]);
  // 未知形状回退并告警；子实例相对父实例；父实例被跳过时挂到根。
  const custom = structuredClone(project);
  custom.scenes[0].instances.push({ id: "INSTANCE-CHILD", objectId: "OBJECT-TREE", parentInstanceId: "INSTANCE-TREE-1", position: { x: 0.5, y: 0 }, size: { width: 0.3, height: 0.3 }, anchor: { x: 0.5, y: 0.5 }, layer: 2, visible: true, overrides: { shape: "blob" } });
  custom.scenes[0].instances.push({ id: "INSTANCE-ORPHAN", objectId: "OBJECT-TREE", parentInstanceId: "INSTANCE-HUD", position: { x: 0, y: 0 }, size: { width: 0.3, height: 0.3 }, anchor: { x: 0.5, y: 0.5 }, layer: 2, visible: true, overrides: {} });
  const customPlan = buildScenePlan(custom);
  const child = customPlan.entities.find((entity) => entity.id === "INSTANCE-CHILD")!;
  assert.equal(child.parentId, "INSTANCE-TREE-1"); assert.equal(child.shape, "box", "未知形状回退为角色默认形状");
  assert.deepEqual(child.position, { x: 0.5, y: 0, z: 0 }, "子实例位置保持相对父实体，不参与居中");
  assert.equal(customPlan.entities.find((entity) => entity.id === "INSTANCE-ORPHAN")!.parentId, null);
  assert.ok(customPlan.warnings.some((warning) => warning.includes("blob")));
  assert.ok(customPlan.warnings.some((warning) => warning.includes("INSTANCE-ORPHAN")));
  assert.throws(() => buildScenePlan(project, { sceneId: "SCENE-NOPE" }));
});

test("场景图运行时：按计划建实体树、父子挂接、贴纸子实体、统计与销毁", () => {
  const color = createColorKit(fakePc);
  const geometry = createGeometryKit(fakePc, {});
  const materials = createMaterialKit(fakePc, fakeApp, color, { assetRoot: "./" });
  const entities = createEntityKit(fakePc, color);
  const project = loadDemoProject();
  project.scenes[0].instances.push({ id: "INSTANCE-CHILD", objectId: "OBJECT-TREE", parentInstanceId: "INSTANCE-TREE-1", position: { x: 0.5, y: 0 }, size: { width: 0.3, height: 0.3 }, anchor: { x: 0.5, y: 0.5 }, layer: 2, visible: false, overrides: {} });
  const plan = buildScenePlan(project, { center: true });
  const graph = createSceneGraph(fakePc, { geometry, materials, entities, color }, plan, {});
  assert.equal(graph.list.length, 35);
  assert.equal(graph.root.children.length, 34, "子实例挂在父实体下而不是根");
  const parent = graph.byId.get("INSTANCE-TREE-1") as FakeEntity;
  assert.ok(parent.children.some((child) => child.name === "INSTANCE-CHILD"));
  assert.equal((graph.byId.get("INSTANCE-CHILD") as FakeEntity).enabled, false, "visible=false → 实体禁用");
  const plate = graph.byId.get("INSTANCE-PLATE") as FakeEntity;
  assert.ok(plate.children.some((child) => child.name === "INSTANCE-PLATE:sticker"), "位图作为贴纸子实体");
  const player = graph.byId.get("INSTANCE-PLAYER") as FakeEntity;
  assert.deepEqual([player.position.x, player.position.y, player.position.z], [-2, 0.3, 2]);
  const stats = graph.stats();
  assert.equal(stats.entityCount, 35); assert.equal(stats.skippedCount, 1); assert.ok(stats.triangles > 500);
  graph.dispose();
  assert.equal(graph.root.children.length, 0);
});

test("行为运行时：注册表与服务端登记一致；占位 / 行走 / 拾取 / 压板 / 节拍障碍 / 装饰在假引擎里生效", () => {
  const color = createColorKit(fakePc);
  const geometry = createGeometryKit(fakePc, {});
  const materials = createMaterialKit(fakePc, fakeApp, color, { assetRoot: "./" });
  const entityKit = createEntityKit(fakePc, color);
  const plan = buildScenePlan(loadDemoProject(), { center: true });
  const graph = createSceneGraph(fakePc, { geometry, materials, entities: entityKit, color }, plan, {});
  const events = createEventBus();
  const grid = createGrid(1);
  const runtime = createBehaviorRuntime({ grid, events, sceneGraph: graph, reducedMotion: true, entityKit, colorKit: color, materials });
  assert.deepEqual([...runtime.registry.keys()].sort(), ENGINE_BEHAVIORS.map((behavior) => behavior.id).sort(), "浏览器注册表与服务端登记一一对应");
  runtime.attachAll(graph);
  assert.equal(runtime.attached.length, 34); assert.deepEqual(runtime.unknown, []);
  assert.equal(grid.cells().length, 25, "25 块纸台登记为可走格");
  assert.equal(grid.heightAt(-2, 2), 0.3);
  const walker = runtime.player()!;
  assert.deepEqual(walker.behavior.cell(), { x: -2, z: 2 });
  assert.equal(runtime.control("W"), false, "西侧无纸台被拒绝");
  assert.equal(runtime.control("N"), true);
  runtime.update(0.5);
  const plate = runtime.snapshot().find((item) => item.moduleId === "engine.pressure-plate")!;
  assert.equal((plate.state as { active: boolean }).active, true, "踩上压板切换为激活");
  assert.ok(events.recent().some((entry) => entry.type === "trigger"));
  runtime.control("S"); runtime.update(0.5);
  const collisions: unknown[] = [];
  events.on("collision", (payload: unknown) => collisions.push(payload));
  runtime.control("E"); runtime.update(0.5);
  assert.equal(collisions.length, 1, "走到星格触发一次拾取碰撞");
  assert.deepEqual(collisions[0], expect({ sourceId: "OBJECT-PLAYER", targetId: "OBJECT-STAR", sourceInstanceId: "INSTANCE-PLAYER", targetInstanceId: "INSTANCE-STAR-1", kind: "pickup" }));
  runtime.update(0.5);
  assert.equal(collisions.length, 1, "同一颗星只触发一次");
  assert.equal((graph.byId.get("INSTANCE-STAR-1") as FakeEntity).enabled, false);
  const waveBefore = runtime.snapshot().find((item) => item.moduleId === "engine.beat-mover")!.state as { cell: { x: number; z: number } };
  runtime.beat(); runtime.beat();
  const waveAfter = runtime.snapshot().find((item) => item.moduleId === "engine.beat-mover")!.state as { cell: { x: number; z: number }; beats: number };
  assert.equal(waveAfter.beats, 2); assert.equal(waveAfter.cell.x, waveBefore.cell.x + 2);
  const tree = graph.byId.get("INSTANCE-TREE-1") as FakeEntity;
  assert.ok(tree.euler.y !== 0, "静态装饰随种子随机朝向");
  // jump：正前方是实心格时被拒绝；越过一格空隙才算成功。
  assert.equal(runtime.control("jump"), false);
  runtime.dispose();
  assert.equal(runtime.attached.length, 0);
  function expect<T>(value: T) { return value; }
});

test("规则桥：条件 / 动作语义与 shared/rules 一致，collision → variable.add → variable.compare → state.set，并发出 forge:rule", () => {
  const project = loadDemoProject();
  assert.deepEqual(validateEngineRules(project), []);
  const events = createEventBus();
  let gameState = "playing";
  const feedback: string[] = [];
  const entity = new FakeEntity("INSTANCE-STAR-1");
  const sceneGraph = { list: [{ id: "INSTANCE-STAR-1", node: { id: "INSTANCE-STAR-1", objectId: "OBJECT-STAR" }, entity }] };
  const bridge = createRuleBridge(project, { events, sceneGraph, gameState: () => gameState, setGameState: (next: string) => { gameState = next; }, feedback: (type: string) => feedback.push(type) });
  assert.equal(bridge.ruleCount, 3); assert.deepEqual(bridge.unknownTypes, []);
  assert.deepEqual(bridge.variables, { "VARIABLE-STARS": 0, "VARIABLE-MISTAKES": 0 });
  for (let index = 0; index < 3; index += 1) events.emit("collision", { sourceId: "OBJECT-PLAYER", targetId: "OBJECT-STAR" });
  assert.equal(bridge.variables["VARIABLE-STARS"], 3);
  assert.equal(gameState, "won");
  assert.deepEqual(feedback, ["collect", "collect", "collect", "victory"]);
  assert.deepEqual(bridge.triggered, ["RULE-COLLECT-STAR", "RULE-COLLECT-STAR", "RULE-COLLECT-STAR", "RULE-ALL-STARS"]);
  events.emit("collision", { sourceId: "OBJECT-PLAYER", targetId: "OBJECT-WAVE" });
  assert.equal(bridge.variables["VARIABLE-MISTAKES"], 1);
  assert.equal(bridge.dispatch({ type: "collision", sourceId: "OBJECT-PLAYER", targetId: "OBJECT-NOPE" }).length, 0, "不相关的碰撞不触发");
  // 动作对实体生效：entity.destroy / entity.spawn / movement.apply。
  const custom = structuredClone(project);
  custom.rules = [{ id: "RULE-X", name: "x", sceneId: null, enabled: true, priority: "P0", when: [{ type: "input.received", parameters: { action: "kill" }, references: [] }], then: [{ type: "entity.destroy", parameters: {}, references: [{ kind: "instance", id: "INSTANCE-STAR-1" }] }] }, { id: "RULE-Y", name: "y", sceneId: null, enabled: true, priority: "P0", when: [{ type: "input.received", parameters: {}, references: [] }], then: [{ type: "movement.apply", parameters: { distance: 2 }, references: [{ kind: "object", id: "OBJECT-STAR" }] }] }];
  const bridge2 = createRuleBridge(custom, { events: createEventBus(), sceneGraph, gameState: () => "playing", setGameState() {} });
  bridge2.dispatch({ type: "input", action: "kill", direction: { x: 1, y: 0 } });
  assert.equal(entity.enabled, false); assert.equal(entity.position.x, 2);
  bridge.dispose();
});

test("调试骨架：通用字段 + 扩展字段合并，扩展可覆盖 getState；输入 HUD 生成与纸境 data-key 合同逐字一致", () => {
  const fakeEngine = { tier: "medium", suspended: false, reducedMotion: false, aspect: 0.5, device: { width: 390, height: 844 }, app: { root: {} }, camera: {}, sun: {}, fill: {}, cameraFrame: null, postProcessingState: () => null, suspend(value: boolean) { this.suspended = value; }, setPerformanceTier(tier: string) { this.tier = tier; return tier; } };
  const api = createDebugApi({ state: { running: false }, engine: fakeEngine, restart: () => "restarted", control: (action: string) => action === "N", setBeatMs: (value: number) => value * 2, engineHandles: () => ({ book: "book" }) }, { getState: () => ({ mode: "custom" }), extra: () => 42 });
  assert.deepEqual(Object.keys(api).sort(), ["control", "engine", "extra", "getState", "restart", "setBeatMs", "setPerformanceTier", "state", "suspend", "tickNow"]);
  assert.deepEqual(api.getState(), { mode: "custom" });
  assert.equal(api.control("N"), true); assert.equal(api.restart(), "restarted"); assert.equal(api.setBeatMs(45), 90);
  api.suspend(true); assert.equal(fakeEngine.suspended, true);
  assert.equal(api.setPerformanceTier("low"), "low");
  assert.equal(api.engine().book, "book"); assert.equal(api.engine().root, fakeEngine.app.root);
  assert.equal(api.tickNow().mode, "custom");
  assert.equal(controlBarHtml("转书与跳跃", popupControlButtons), '<div class="three-controls" aria-label="转书与跳跃"><button type="button" data-key="ccw" aria-label="向左转动书本">⟲</button><button type="button" data-key="jump" class="popup-jump" aria-label="跳跃">跃</button><button type="button" data-key="cw" aria-label="向右转动书本">⟳</button></div>');
  assert.equal(controlButtonsHtml([{ key: "a<b", label: "x", ariaLabel: 'q"' }]), '<button type="button" data-key="a&lt;b" aria-label="q&quot;">x</button>');
});

test("行为登记校验：示例工程通过；未登记 id、角色不匹配、参数类型 / 范围、主版本不兼容都被指出", () => {
  const project = loadDemoProject();
  assert.deepEqual(validateEngineBehaviors(project), []);
  assert.deepEqual(validateDemoProject(project), []);
  const broken = structuredClone(project);
  broken.objects[1].behaviors.push({ id: "B1", moduleId: "engine.nope", moduleVersion: "1.0.0", enabled: true, parameters: {} });
  broken.objects[1].behaviors.push({ id: "B2", moduleId: "engine.pickup", moduleVersion: "1.0.0", enabled: true, parameters: { spinSpeed: "fast" } });
  broken.objects[1].behaviors.push({ id: "B3", moduleId: "engine.grid-walker", moduleVersion: "2.0.0", enabled: true, parameters: { stepsPerSecond: 999, nope: 1 } });
  const errors = validateEngineBehaviors(broken);
  assert.ok(errors.some((error) => error.includes("未登记的引擎行为 engine.nope")));
  assert.ok(errors.some((error) => error.includes("不适用于角色 player")));
  assert.ok(errors.some((error) => error.includes("spinSpeed 类型应为 number")));
  assert.ok(errors.some((error) => error.includes("主版本不兼容")));
  assert.ok(errors.some((error) => error.includes("stepsPerSecond 超出范围")));
  assert.ok(errors.some((error) => error.includes("没有参数 nope")));
  // 2D 对象（renderer != webgl）的绑定不由引擎层校验。
  broken.objects[1].renderer = "canvas-2d";
  assert.deepEqual(validateEngineBehaviors(broken), []);
});

test("运行时打包：片段可单独 import、剥掉 export 后拼进产物、不含网络地址、导出的工厂函数齐全", () => {
  assert.equal(stripModuleExports("export function a() {}\nexport const b = 1;\nconst c = 2;"), "function a() {}\nconst b = 1;\nconst c = 2;");
  assert.throws(() => stripModuleExports('import x from "y";'));
  const script = engineRuntimeScript();
  assert.doesNotMatch(script, /^export /m);
  assert.doesNotMatch(script, /https?:\/\//);
  assert.doesNotMatch(script, /THREE\./);
  for (const name of ["createColorKit", "createGeometryKit", "createMaterialKit", "createEntityKit", "createEngineApp", "createSceneGraph", "createGrid", "createEventBus", "createBehaviorRuntime", "createRuleBridge", "createInputController", "createDebugApi", "installDebugApi"]) assert.match(script, new RegExp(`function ${name}\\(`));
  const exportsByFile = engineRuntimeExports();
  assert.deepEqual(Object.keys(exportsByFile), [...engineRuntimeFiles]);
  assert.deepEqual(exportsByFile["behaviors.js"], ["createGrid", "createEventBus", "createBehaviorRuntime"]);
  // 纸境探针依赖的字面量都来自引擎层片段。
  for (const literal of ["class GeoBuilder", "function boxMesh", "function sheetMesh", "new pc.Application(", 'addComponent("camera"', 'addComponent("render"', "pc.Mesh.fromGeometry(", 'type: "directional"', "ambientLight", "SHADOW_PCF5_32F", "pc.FOG_LINEAR", "pc.TONEMAP_ACES", "new pc.CameraFrame(", "dof.enabled", "SSAOTYPE_LIGHTING", "prefers-reduced-motion", "function applyPerformanceTier", 'window.addEventListener("resize"', "renderSuspended", 'window.addEventListener("keydown"', 'canvas.addEventListener("pointerdown"', 'button.addEventListener("pointerdown"']) assert.ok(script.includes(literal), literal);
  assert.equal(engineImportHeader(), 'import * as pc from "./vendor/playcanvas.module.js";\n');
});

test("产物写入：vendor 引擎与许可、归属文档幂等、场景报告；示例闭环产物自包含且通过校验", () => {
  const root = mkdtempSync(join(tmpdir(), "studio-engine-layer-"));
  try {
    const vendor = writeEngineVendor(root);
    assert.match(vendor.version, /^\d+\.\d+\.\d+$/);
    assert.ok(vendor.bytes > 1_000_000);
    assert.ok(existsSync(join(root, "vendor", "PLAYCANVAS-LICENSE.md")));
    const studio = join(root, "_studio");
    writeEngineAttribution(studio, vendor.version); writeEngineAttribution(studio, vendor.version);
    const attribution = readFileSync(join(studio, "OPEN_SOURCE_ATTRIBUTION.md"), "utf8");
    assert.equal(attribution.split("## 3D 引擎：PlayCanvas").length, 2, "重复写入不重复追加");
    assert.match(attribution, /PlayCanvas[\s\S]*MIT/);
    const plan = buildScenePlan(loadDemoProject(), { center: true });
    const reportPath = writeEngineSceneReport(studio, plan);
    const report = JSON.parse(readFileSync(reportPath, "utf8"));
    assert.equal(report.summary.entityCount, 34); assert.equal(report.skipped.length, 1);
  } finally { cleanup(root); }

  const demoRoot = mkdtempSync(join(tmpdir(), "studio-engine-demo-"));
  try {
    const build = buildEngineDemoArtifact(demoRoot);
    for (const file of build.files) assert.ok(existsSync(join(demoRoot, file)), file);
    const script = readFileSync(join(demoRoot, "app.js"), "utf8");
    assert.match(script, /^import \* as pc from "\.\/vendor\/playcanvas\.module\.js";/);
    assert.doesNotMatch(script, /https?:\/\//, "示例产物不从网络加载任何东西");
    assert.match(script, /createSceneGraph\(pc, kits, plan/);
    assert.match(script, /createRuleBridge\(project/);
    const html = readFileSync(join(demoRoot, "index.html"), "utf8");
    assert.match(html, /data-key="jump"/); assert.match(html, /id="game-canvas"/); assert.match(html, /id="start"/);
    const manifest = JSON.parse(readFileSync(join(demoRoot, "game-manifest.json"), "utf8"));
    assert.equal(manifest.engine, "playcanvas"); assert.equal(manifest.engineLicense, "MIT"); assert.equal(manifest.renderPreset, "studio-lowpoly");
    assert.equal(manifest.scene.entityCount, 34);
    assert.ok(statSync(join(demoRoot, "assets", "paper-grain.png")).size > 0);
    const project = JSON.parse(readFileSync(join(demoRoot, "_studio", "GAME_PROJECT_V3.json"), "utf8"));
    assert.equal(project.metadata.projectFormat, "game-project-v3");
  } finally { cleanup(demoRoot); }
});
