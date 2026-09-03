/**
 * 引擎层最小闭环示例：一份手写的 GameProjectV3（project.json）→ 引擎层 → 可在浏览器里运行、可验收的 3D 游戏。
 * 这是“AI 输出结构化游戏描述 → 引擎层把它变成可运行游戏”的证明：本文件不含任何游戏专属渲染代码，
 * 只做 校验 → 场景计划 → 拼装产物（HTML / CSS / app.js / vendor / _studio）。
 *
 * 用法：tests/browser/engine-playcanvas-demo.spec.ts 与 tests/engine-playcanvas.test.ts 调用 buildEngineDemoArtifact(root)。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGameProjectV3, type GameProjectV3 } from "../../src/shared/project-schema/index.js";
import {
  buildScenePlan, controlBarHtml, defaultGridButtons, defaultGridKeyMap, engineImportHeader, engineManifestFields, engineRuntimeScript,
  studioRenderPreset, summarizeScenePlan, toJsLiteral, validateEngineBehaviors, validateEngineRules, writeEngineAttribution, writeEngineSceneReport, writeEngineVendor,
  type ScenePlan,
} from "../../src/engine/playcanvas/index.js";

export const demoRoot = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = join(demoRoot, "..", "..");
/** 示例资源来自官方纸境贴图包（已有 gpt-image-2 溯源），按 project.json 里的 path 复制到产物。 */
const resourceSources: Record<string, string> = {
  "assets/paper-grain.png": join(repositoryRoot, "assets", "starter", "paper-popup", "paper-grain.png"),
  "assets/decal-meadow.png": join(repositoryRoot, "assets", "starter", "paper-popup", "decal-meadow.png"),
};

export function loadDemoProject(): GameProjectV3 {
  return parseGameProjectV3(JSON.parse(readFileSync(join(demoRoot, "project.json"), "utf8")));
}

/** 进入构建前的校验：结构（zod）、引擎行为绑定、规则登记。任一失败即拒绝构建，这是 AI 生成描述的第一道门。 */
export function validateDemoProject(project: GameProjectV3) {
  return [...validateEngineBehaviors(project), ...validateEngineRules(project)];
}

const feedbackText: Record<string, string> = { collect: "拿到一颗折纸星。", victory: "三颗星集齐，这一页读完了。", hit: "被纸浪撞到了。" };

function escapeHtml(value: string) { return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;"); }

export function demoHtml(project: GameProjectV3) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>${escapeHtml(project.metadata.title)}</title><link rel="modulepreload" href="./vendor/playcanvas.module.js"><link rel="stylesheet" href="./styles.css"><script type="module" src="./app.js"></script></head><body data-runtime="web-3d" data-engine="playcanvas" data-game-state="idle"><main class="engine-shell"><canvas id="game-canvas" class="engine-canvas" aria-label="${escapeHtml(project.scenes[0].name)}" tabindex="0"></canvas><div class="engine-hud"><div class="engine-chip"><span>引擎层示例</span><h1 id="level-title">${escapeHtml(project.metadata.title)}</h1></div><div class="engine-chip engine-vars"><span>折纸星</span><strong id="star-count">0 / 3</strong></div><div></div><div class="engine-bottom"><div class="engine-objective"><span id="status-label">怎么玩</span><p id="status">方向键或按钮走格子，踩过三颗折纸星。</p></div>${controlBarHtml("方向与跳跃", defaultGridButtons, "engine-controls")}</div></div><section class="engine-card" id="start-card"><span class="kicker">GameProjectV3 → 引擎层</span><h2>${escapeHtml(project.metadata.title)}</h2><p>这一页由一份结构化工程描述生成：${project.objects.length} 个对象、${project.scenes[0].instances.length} 个实例、${project.rules.length} 条规则、${project.resources.length} 份资源。</p><button type="button" id="start">翻开这一页</button></section><section class="engine-card" id="result-card" hidden><span class="kicker">规则触发</span><h2 id="result-title">三颗星集齐</h2><p id="result-detail"></p><button type="button" id="restart">再来一次</button></section><div class="webgl-error" id="webgl-error" hidden>此浏览器无法启动 WebGL 2。</div></main></body></html>`;
}

export const demoStyles = `
:root{color-scheme:light;font-family:"Noto Serif SC","Songti SC",Georgia,serif;--paper:#f4ecd9;--paper-2:#ebe1c9;--ink:#2b3550;--ink-soft:#5b6478;--line:#d8cbb0;--accent:#e2a93a;background:var(--paper);color:var(--ink)}
*{box-sizing:border-box}body{margin:0;min-height:100vh;overflow:hidden;background:var(--paper);color:var(--ink)}
.engine-shell{position:relative;width:100vw;height:100svh;background:var(--paper)}
.engine-canvas{display:block;width:100%;height:100%;touch-action:none;outline:none}
.engine-hud{position:absolute;inset:0;pointer-events:none;display:grid;grid-template-rows:auto auto 1fr auto;padding:clamp(12px,2vw,26px);gap:12px}
.engine-chip,.engine-objective,.engine-controls button,.engine-card{pointer-events:auto;background:color-mix(in srgb,var(--paper) 90%,#fff 10%);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 44px rgba(63,48,20,.16)}
.engine-chip{padding:10px 14px;justify-self:start}.engine-vars{justify-self:end}
.engine-chip span,.engine-objective span{display:block;color:var(--ink-soft);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.engine-chip h1{margin:4px 0 0;font-size:clamp(16px,2vw,24px);font-weight:600}.engine-chip strong{display:block;margin-top:4px;font-size:20px;color:var(--accent)}
.engine-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:14px}
.engine-objective{max-width:420px;padding:12px 16px}.engine-objective p{margin:5px 0 0;font-size:13px;line-height:1.45}
.engine-controls{display:flex;gap:8px}.engine-controls button{min-width:52px;min-height:52px;padding:0 12px;color:var(--ink);font:600 20px/1 inherit;cursor:pointer;touch-action:none}
.engine-controls button:disabled{opacity:.45;cursor:default}.engine-controls .engine-jump{background:var(--accent);color:#2b2410;border-color:transparent;font-size:18px}
.engine-card{position:absolute;inset:50% auto auto 50%;transform:translate(-50%,-50%);width:min(480px,calc(100vw - 32px));padding:clamp(22px,4vw,40px);text-align:center;border-radius:22px}
.engine-card .kicker{color:var(--accent);font-size:11px;font-weight:800;letter-spacing:.22em}.engine-card h2{font:600 clamp(28px,5vw,48px)/1 inherit;margin:12px 0 10px}
.engine-card p{color:var(--ink-soft);line-height:1.65;margin:0 auto 20px;max-width:40ch;font-size:14px}
.engine-card button{border:0;background:var(--ink);color:var(--paper);padding:14px 26px;min-height:48px;font:700 15px/1 inherit;letter-spacing:.1em;cursor:pointer;border-radius:12px}
.engine-card[hidden]{display:none}
body:is([data-game-state=idle],[data-game-state=won]) .engine-bottom{visibility:hidden}
.webgl-error{position:absolute;inset:0;display:grid;place-items:center;padding:32px;text-align:center;background:var(--paper);z-index:20}.webgl-error[hidden]{display:none}
@media(max-width:720px){.engine-shell{width:min(100vw,56.25svh);height:min(100svh,177.7778vw);aspect-ratio:9/16;margin:0 auto}.engine-controls button{min-width:46px;min-height:46px}}
`;

/** 示例的浏览器胶水脚本：只做“装配引擎层 + 状态机 + HUD”，没有任何几何 / 材质 / 行为的专属实现。 */
export function demoGlueScript(project: GameProjectV3, plan: ScenePlan) {
  const config = toJsLiteral({ beatMs: 500, keyMap: defaultGridKeyMap, feedbackText, title: project.metadata.title });
  return `
const project = ${JSON.stringify(project).replaceAll("<", "\\u003c")};
const plan = ${JSON.stringify(plan).replaceAll("<", "\\u003c")};
const renderPreset = ${toJsLiteral(studioRenderPreset)};
const demoConfig = ${config};
${engineRuntimeScript()}
// ---- 装配：颜色 → 引导 → 几何 / 材质 / 实体 → 场景图 → 网格 / 事件 / 行为 → 规则桥 → 输入 → 调试。 ----
const canvas = document.querySelector("#game-canvas");
const statusNode = document.querySelector("#status");
const statusLabel = document.querySelector("#status-label");
const starCount = document.querySelector("#star-count");
const startCard = document.querySelector("#start-card");
const resultCard = document.querySelector("#result-card");
const errorPanel = document.querySelector("#webgl-error");
const state = { running: false, gameState: "idle", beats: 0, renderCount: 0 };
let beatMs = demoConfig.beatMs;
let beatClock = 0;
const colorKit = createColorKit(pc);
const engine = createEngineApp(pc, canvas, colorKit, renderPreset, { onError() { errorPanel.hidden = false; }, onResize() { fitCamera(); } });
const geometry = createGeometryKit(pc, engine.device);
const materials = createMaterialKit(pc, engine.app, colorKit, { assetRoot: "./" });
const entityKit = createEntityKit(pc, colorKit);
const kits = { geometry, materials, entities: entityKit, color: colorKit };
const events = createEventBus();
const grid = createGrid(plan.cellSize);
const ground = entityKit.meshEntity(geometry.planeMesh(80, 80, 0xeadfc6), materials.materialFor({ map: null }), { cast: false, name: "ground" });
ground.setLocalPosition(0, -0.01, 0);
engine.app.root.addChild(ground);
let sceneGraph = null; let behaviors = null; let ruleBridge = null;
function setGameState(next) {
  state.gameState = next; state.running = next === "playing";
  document.body.dataset.gameState = next;
  input.setButtonsEnabled(state.running);
  if (next === "won") { resultCard.hidden = false; document.querySelector("#result-detail").textContent = "折纸星 " + ruleBridge.variables["VARIABLE-STARS"] + " / 3，用了 " + state.beats + " 拍，失误 " + ruleBridge.variables["VARIABLE-MISTAKES"] + " 次。"; }
}
function buildScene() {
  if (sceneGraph) { behaviors.dispose(); ruleBridge.dispose(); sceneGraph.dispose(); sceneGraph.root.destroy(); grid.clear(); }
  sceneGraph = createSceneGraph(pc, kits, plan, { edgeColor: 0xfffaf0 });
  engine.app.root.addChild(sceneGraph.root);
  behaviors = createBehaviorRuntime({ grid, events, sceneGraph, reducedMotion: engine.reducedMotion, entityKit, colorKit, materials });
  behaviors.attachAll(sceneGraph);
  ruleBridge = createRuleBridge(project, {
    events, sceneGraph,
    gameState: () => state.gameState,
    setGameState,
    feedback(type) { statusLabel.textContent = type; statusNode.textContent = demoConfig.feedbackText[type] || type; starCount.textContent = ruleBridge.variables["VARIABLE-STARS"] + " / 3"; },
  });
  starCount.textContent = "0 / 3";
}
// 相机：等角三分之一俯视，按场景计划的包围盒取景；竖屏拉远一些。
const cameraDirection = new pc.Vec3(0.5, 0.82, 0.866).normalize();
function fitCamera() {
  const bounds = plan.bounds || { min: { x: -3, z: -3 }, max: { x: 3, z: 3 } };
  const extent = Math.max(bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z);
  const distance = extent * (engine.aspect < 1 ? 1.9 : 1.3) + 4;
  const target = new pc.Vec3(0, 0.3, 0);
  engine.camera.setPosition(new pc.Vec3().copy(target).add(new pc.Vec3().copy(cameraDirection).mulScalar(distance)));
  engine.camera.lookAt(target);
  engine.setFocus(distance);
  engine.placeSun(extent);
}
function control(action) {
  if (action === "pause") { setGameState(state.gameState === "playing" ? "paused" : state.gameState === "paused" ? "playing" : state.gameState); return true; }
  if (!state.running) return false;
  const moved = behaviors.control(action);
  events.emit("input", { action, moved });
  return moved;
}
const input = createInputController({ canvas, enabled: () => state.running, keyMap: demoConfig.keyMap, buttons: document.querySelectorAll("[data-key]"), onAction: control });
function resetGame() {
  buildScene();
  state.beats = 0; beatClock = 0;
  startCard.hidden = true; resultCard.hidden = true;
  statusLabel.textContent = "开始"; statusNode.textContent = "方向键或按钮走格子，踩过三颗折纸星。";
  setGameState("playing");
}
engine.onUpdate((dt) => {
  state.renderCount += 1;
  if (!behaviors) return;
  if (state.running) {
    beatClock += dt * 1000;
    while (beatClock >= beatMs) { beatClock -= beatMs; behaviors.beat(); state.beats += 1; }
  }
  behaviors.update(dt);
  engine.trackFrame(dt, state.running);
});
document.querySelector("#start").addEventListener("click", resetGame);
document.querySelector("#restart").addEventListener("click", resetGame);
engine.applyPerformanceTier(engine.tier);
buildScene();
fitCamera();
engine.app.start();
const gameDebugApi = createDebugApi({
  state, engine, restart: resetGame, control,
  setBeatMs(value) { beatMs = Math.max(30, Number(value) || demoConfig.beatMs); return beatMs; },
  tickNow() { behaviors.beat(); state.beats += 1; behaviors.update(0.5); },
  engineHandles() { return { sceneRoot: sceneGraph.root, grid, materialCache: materials.materialCache, meshCache: geometry.meshCache }; },
}, {
  getState() {
    const walker = behaviors.player();
    return {
      ...state,
      mode: "engine-demo",
      engine: "playcanvas",
      performanceTier: engine.tier,
      title: demoConfig.title,
      beatMs,
      entityCount: sceneGraph.list.length,
      entityIds: sceneGraph.list.map((item) => item.id),
      skipped: sceneGraph.skipped,
      stats: sceneGraph.stats(),
      gridCells: grid.cells().length,
      behaviors: behaviors.snapshot(),
      unknownBehaviors: behaviors.unknown,
      variables: Object.assign({}, ruleBridge.variables),
      triggeredRuleIds: ruleBridge.triggered.slice(),
      feedback: ruleBridge.feedback.slice(),
      unknownRuleTypes: ruleBridge.unknownTypes,
      player: walker ? walker.behavior.state() : null,
      recentEvents: events.recent(12).map((entry) => entry.type),
      viewport: { width: engine.device.width, height: engine.device.height, portrait: engine.aspect < 1 },
      postProcessing: engine.postProcessingState(),
    };
  },
});
installDebugApi(gameDebugApi);
`;
}

export type EngineDemoBuild = { project: GameProjectV3; plan: ScenePlan; engineVersion: string; files: string[] };

export function buildEngineDemoArtifact(root: string): EngineDemoBuild {
  const project = loadDemoProject();
  const errors = validateDemoProject(project);
  if (errors.length) throw new Error(`示例工程校验失败：${errors.join("；")}`);
  const plan = buildScenePlan(project, { center: true });
  mkdirSync(join(root, "assets"), { recursive: true });
  for (const resource of project.resources) {
    const source = resourceSources[resource.path];
    if (!source || !existsSync(source)) throw new Error(`示例资源缺失：${resource.path}`);
    copyFileSync(source, join(root, resource.path));
  }
  const { version } = writeEngineVendor(root);
  writeFileSync(join(root, "index.html"), demoHtml(project), "utf8");
  writeFileSync(join(root, "styles.css"), demoStyles, "utf8");
  writeFileSync(join(root, "app.js"), `${engineImportHeader()}${demoGlueScript(project, plan)}`, "utf8");
  const studioRoot = join(root, "_studio");
  mkdirSync(studioRoot, { recursive: true });
  writeFileSync(join(studioRoot, "GAME_PROJECT_V3.json"), `${JSON.stringify(project, null, 2)}\n`, "utf8");
  writeEngineAttribution(studioRoot, version, "渲染与场景图（实体 / 组件、StandardMaterial、阴影、雾、ACES、CameraFrame 后处理）；行为、规则桥、几何与美术均为平台引擎层代码");
  writeEngineSceneReport(studioRoot, plan, { validation: { behaviorErrors: [], ruleErrors: [] } });
  writeFileSync(join(root, "game-manifest.json"), JSON.stringify({
    title: project.metadata.title,
    template: "engine-playcanvas-demo",
    runtimeTarget: "web-3d",
    perspective: "third-person",
    ...engineManifestFields(version, studioRenderPreset),
    aspectRatio: project.presentation.aspectRatio,
    inputModes: ["keyboard", "touch"],
    generatedAt: new Date().toISOString(),
    projectFormat: project.metadata.projectFormat,
    scene: summarizeScenePlan(plan),
    engineScene: "./_studio/ENGINE_SCENE.json",
  }, null, 2), "utf8");
  return { project, plan, engineVersion: version, files: ["index.html", "styles.css", "app.js", "game-manifest.json", "vendor/playcanvas.module.js", "_studio/GAME_PROJECT_V3.json", "_studio/ENGINE_SCENE.json", "_studio/OPEN_SOURCE_ATTRIBUTION.md"] };
}
