/**
 * 纸境 · 立体书迷宫（threeMode = "popup"）的浏览器运行时 —— PlayCanvas 版。
 *
 * 这是平台接入真正 3D 引擎的第一个案例：渲染层由 PlayCanvas 2.x（MIT）驱动，规则内核仍通过 paperPopupRulesSource() 内嵌同一份代码。
 * 对外导出的函数名与签名与旧的 three-popup-runtime.ts 完全一致（writePaperPopupArtifact、readPaperPopupAssetManifest、paperPopupTextureFiles…），
 * game-artifact.ts 与测试不需要知道引擎换了。浏览器脚本分三段（引擎 / 场景 / 规则驱动）放在同名目录里，全部是模板字面量片段。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectDetail } from "../shared/contracts.js";
import { paperPopupRulesSource } from "../shared/paper-popup-rules.js";
import { createCampaignLevels } from "../shared/level-progression.js";
import { auditPopupBlueprints, popupBestTemplateBlueprints, popupChapters } from "./three-popup-blueprints.js";
import { popupEngineScript } from "./playcanvas-popup-runtime/script-engine.js";
import { popupSceneScript } from "./playcanvas-popup-runtime/script-scene.js";
import { popupGameLoopScript } from "./playcanvas-popup-runtime/script-game.js";

const moduleRoot = dirname(fileURLToPath(import.meta.url));
export const paperPopupAssetRoot = resolve(moduleRoot, "..", "..", "assets", "starter", "paper-popup");
const playcanvasPackageRoot = resolve(moduleRoot, "..", "..", "node_modules", "playcanvas");
/** 引擎单文件 ESM 构建（官方 build/playcanvas.mjs），复制到产物 vendor/ 时改名为 .js 以匹配静态服务的 MIME 表。 */
export const playcanvasModuleSource = join(playcanvasPackageRoot, "build", "playcanvas.mjs");
export const playcanvasVendorFile = "playcanvas.module.js";

export function playcanvasVersion(): string {
  try { return String((JSON.parse(readFileSync(join(playcanvasPackageRoot, "package.json"), "utf8")) as { version?: string }).version ?? "unknown"); } catch { return "unknown"; }
}

export type PaperPopupAssetManifest = {
  schemaVersion: number;
  model: string;
  entries: Array<{
    file: string;
    role: string;
    use: string;
    model: string;
    quality: string;
    requestedSize: string;
    transparentBackground: boolean;
    source: { file: string; copiedFrom?: string; bytes: number; sha256: string };
    delivered: { width: number; height: number; bytes: number; sha256: string };
    prompt: string;
    generatedAt: string;
  }>;
};

export function readPaperPopupAssetManifest(): PaperPopupAssetManifest {
  return JSON.parse(readFileSync(join(paperPopupAssetRoot, "manifest.json"), "utf8")) as PaperPopupAssetManifest;
}

/** 官方贴图包里由 gpt-image-2 生成的位图文件名（不含来源目录）。 */
export const paperPopupTextureFiles = ["cover.png", "background.png", "paper-grain.png", "decal-meadow.png", "decal-coast.png", "decal-market.png", "decal-snow.png"] as const;

function safeJson(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export function createPopupCampaignLevels(project: ProjectDetail) {
  const baseLevels = createCampaignLevels(project.spec.template, project.spec.difficulty);
  return popupBestTemplateBlueprints.map((blueprint, index) => ({
    ...baseLevels[index],
    label: `${String(index + 1).padStart(2, "0")} · ${blueprint.chapterName} · ${blueprint.name}`,
    tierLabel: blueprint.chapterName,
    ruleModifier: blueprint.name,
    mission: "转动书本让路接上，经过检查点旗，抵达出口门；三颗折纸星可选。",
    masteryRules: [
      { id: "popup-stars", label: "找到至少 2 颗折纸星", target: 2 },
      { id: "popup-all", label: "集齐 3 颗折纸星", target: 3 },
    ],
  }));
}

export const popupGameStyles = `
:root{color-scheme:light;font-family:"Noto Serif SC","Songti SC","STSong",Georgia,"Times New Roman",serif;--paper:#f4ecd9;--paper-2:#ebe1c9;--ink:#2b3550;--ink-soft:#5b6478;--line:#d8cbb0;--accent:#e2a93a;--accent-2:#d98265;--sage:#9fb08a;--shadow:0 18px 44px rgba(63,48,20,.16);background:var(--paper);color:var(--ink)}
*{box-sizing:border-box}body{margin:0;min-height:100vh;overflow:hidden;background:var(--paper);color:var(--ink)}
.popup-chip,.three-objective,.three-start,.three-result,.three-controls button{color:var(--ink)}
body[data-chapter="2"]{--paper:#e9eeea;--paper-2:#dbe4e2;--line:#c4d3cf;--accent:#d9836a;--sage:#b9d3cf}
body[data-chapter="3"]{--paper:#23273f;--paper-2:#2e3352;--ink:#f3e8d2;--ink-soft:#c7bda8;--line:#4a4f72;--accent:#f0a34a;--accent-2:#b56a8c;--shadow:0 18px 44px rgba(0,0,0,.42);color-scheme:dark}
body[data-chapter="4"]{--paper:#eef3f7;--paper-2:#dfe8f0;--line:#c5d4e2;--accent:#c9a45c;--accent-2:#6d88a8;--sage:#dbe6ee}
.three-shell{position:relative;width:100vw;height:100svh;isolation:isolate;background:var(--paper)}
.three-canvas{display:block;width:100%;height:100%;touch-action:none;cursor:pointer;outline:none}
.three-hud{position:absolute;inset:0;pointer-events:none;display:grid;grid-template-rows:auto 1fr auto;padding:clamp(12px,2vw,26px);gap:12px}
.three-topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}
body[data-game-state=playing] .three-topbar,body[data-game-state=paused] .three-topbar{padding-left:128px}
.popup-chip span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.popup-chip,.three-objective,.three-controls button,.three-start,.three-result,.three-back{pointer-events:auto;background:color-mix(in srgb,var(--paper) 90%,#fff 10%);border:1px solid var(--line);box-shadow:var(--shadow);border-radius:14px}
.popup-chip{padding:10px 14px;min-width:0}
.popup-chip span,.three-objective span{display:block;color:var(--ink-soft);font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.popup-chip h1{margin:4px 0 0;font-size:clamp(17px,2.2vw,26px);font-weight:600;line-height:1.1;letter-spacing:.02em}
.popup-stars{display:grid;gap:6px;justify-items:end;text-align:right}
.popup-stars strong{display:flex;gap:6px;font-size:20px;line-height:1;color:var(--accent);letter-spacing:.05em}
.popup-stars i{display:inline-block;width:20px;height:20px;background:currentColor;clip-path:polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%);opacity:.28}
.popup-stars i.is-lit{opacity:1;filter:drop-shadow(0 2px 4px rgba(226,169,58,.5))}
.popup-dial{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--paper-2);color:var(--ink);font-size:14px;transition:transform .35s cubic-bezier(.2,.8,.2,1)}
.three-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:14px}
.three-objective{max-width:440px;padding:12px 16px}
.three-objective p{margin:5px 0 0;line-height:1.45;font-size:13px;color:var(--ink)}
.three-controls{display:flex;gap:10px;padding:0;background:none;border:0;box-shadow:none}
.three-controls button{min-width:56px;min-height:56px;padding:0 14px;color:var(--ink);font:600 20px/1 inherit;cursor:pointer;touch-action:none;transition:transform .12s ease,background .12s ease}
.three-controls button:active,.three-controls button.is-active{transform:translateY(2px);background:var(--paper-2)}
.three-controls button:disabled{opacity:.45;cursor:default}
.three-controls .popup-jump{background:var(--accent);color:#2b2410;border-color:transparent;min-width:72px;font-size:18px;letter-spacing:.08em}
.three-back{position:absolute;z-index:9;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));display:none;min-width:44px;min-height:44px;padding:0 14px;color:var(--ink);font:600 13px/1 inherit;cursor:pointer}
body[data-game-state=playing] .three-back,body[data-game-state=paused] .three-back{display:block}
.three-pause{left:max(66px,calc(env(safe-area-inset-left) + 66px))!important}
.three-start,.three-result{position:absolute;inset:50% auto auto 50%;transform:translate(-50%,-50%);width:min(500px,calc(100vw - 32px));padding:clamp(22px,4vw,40px);text-align:center;pointer-events:auto;border-radius:22px}
.three-start .kicker,.three-result .kicker{color:var(--accent);font-size:11px;font-weight:800;letter-spacing:.22em}
.three-start h2,.three-result h2{font:600 clamp(30px,6vw,54px)/1 inherit;margin:12px 0 10px;letter-spacing:.04em}
.three-start p,.three-result p{color:var(--ink-soft);line-height:1.65;margin:0 auto 20px;max-width:40ch;font-size:14px}
.three-start button,.three-result button{border:0;background:var(--ink);color:var(--paper);padding:14px 26px;min-height:48px;font:700 15px/1 inherit;letter-spacing:.1em;cursor:pointer;border-radius:12px}
.three-result[hidden],.three-start[hidden]{display:none}
.three-level-field{display:grid;gap:6px;margin:0 auto 10px;text-align:left}.three-level-field span,.three-start [data-campaign-progress]{display:block;color:var(--ink-soft);font-size:11px;line-height:1.4}
.three-level-field select{width:100%;min-height:44px;border:1px solid var(--line);border-radius:10px;padding:0 34px 0 12px;background:var(--paper-2);color:var(--ink);font:600 13px/1 inherit}
.three-start [data-campaign-progress]{margin-bottom:14px;text-align:left}
.three-mastery-card{display:grid;gap:6px;margin:0 0 14px;padding:12px 14px;border:1px dashed var(--line);border-radius:12px;background:var(--paper-2);text-align:left}
.three-mastery-card strong{font-size:12px;line-height:1.45}.three-mastery-card ul{display:grid;gap:3px;margin:0;padding-left:17px;color:var(--ink-soft);font-size:11px;line-height:1.35}.three-mastery-card li::marker{color:var(--accent)}.three-mastery-card small{color:var(--accent);font-size:11px;font-weight:800}
.popup-guide{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 16px}
.popup-guide div{padding:10px 8px;border-radius:12px;background:var(--paper-2);font-size:11px;line-height:1.4;color:var(--ink-soft)}.popup-guide b{display:block;font-size:18px;color:var(--ink);margin-bottom:4px}
.three-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.three-result-actions button{width:100%;min-height:48px}.three-result-actions .secondary-result{border:1px solid var(--line);background:transparent;color:var(--ink)}
.result-stars{display:flex;justify-content:center;gap:10px;margin:0 0 14px;font-size:30px;color:var(--accent)}.result-stars i{opacity:.25}.result-stars i.is-lit{opacity:1}
.webgl-error{position:absolute;inset:0;display:grid;place-items:center;padding:32px;text-align:center;background:var(--paper);color:var(--ink);z-index:20}.webgl-error[hidden]{display:none}
body:is([data-game-state=idle],[data-game-state=stage-complete],[data-game-state=won],[data-game-state=lost]) .three-bottom,body:is([data-game-state=idle],[data-game-state=stage-complete],[data-game-state=won],[data-game-state=lost]) .three-topbar{visibility:hidden}
.three-toast{position:absolute;left:50%;top:14%;transform:translate(-50%,0);padding:8px 14px;border-radius:999px;background:var(--ink);color:var(--paper);font-size:13px;letter-spacing:.06em;opacity:0;transition:opacity .25s ease,transform .25s ease;pointer-events:none;z-index:8}
.three-toast.is-visible{opacity:1;transform:translate(-50%,-6px)}
@media(prefers-reduced-motion:reduce){.popup-dial,.three-controls button,.three-toast{transition:none}}
@media(max-width:720px){body{display:grid;width:100%;height:100svh;min-height:100svh;overflow:hidden;place-items:center}.three-shell{width:min(100vw,56.25svh);height:min(100svh,177.7778vw);min-height:0;aspect-ratio:9/16}.three-start,.three-result{max-height:calc(100% - 24px);overflow:auto;overscroll-behavior:contain;width:calc(100% - 24px);padding:20px}.three-hud{padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));gap:8px}body[data-game-state=playing] .three-topbar,body[data-game-state=paused] .three-topbar{padding-left:124px;align-items:stretch}.popup-chip{padding:8px 10px}.popup-chip h1{font-size:14px}.popup-chip span{font-size:8px}.popup-stars strong{font-size:16px}.popup-stars i{width:16px;height:16px}.three-objective{max-width:calc(100% - 196px);padding:8px 10px}.three-objective span{font-size:8px}.three-objective p{display:-webkit-box;margin-top:3px;overflow:hidden;font-size:11px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:3}.three-controls{gap:8px}.three-controls button{min-width:52px;min-height:52px;padding:0 10px;font-size:18px}.three-controls .popup-jump{min-width:60px}.three-start h2,.three-result h2{font-size:34px}.three-start p,.three-result p{font-size:12px}.popup-guide{gap:6px}.popup-guide div{padding:8px 6px;font-size:10px}.three-back{top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left))}}
@media(max-width:360px){.three-start,.three-result{width:calc(100% - 14px);padding:16px}.three-start h2,.three-result h2{font-size:30px}.three-result-actions{grid-template-columns:1fr}.popup-guide{grid-template-columns:1fr 1fr 1fr}}
`;

export function popupGameHtml(project: ProjectDetail) {
  const campaignLevels = createPopupCampaignLevels(project);
  const campaignOptions = campaignLevels.map((level, index) => `<option value="${index}"${index > 0 ? " disabled" : ""}>${escapeHtml(level.label)}</option>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f4ecd9"><title>${escapeHtml(project.title)} · 立体书迷宫</title><link rel="modulepreload" href="./vendor/${playcanvasVendorFile}"><link rel="stylesheet" href="./styles.css"><script type="module" src="./app.js"></script></head><body data-runtime="web-3d" data-three-mode="popup" data-chapter="1" data-visual-style="${project.spec.visualStyle}" data-detail-level="paper"><main class="three-shell"><canvas id="game-canvas" class="three-canvas" aria-label="可转动的立体书迷宫" tabindex="0"></canvas><button class="three-back" id="back-to-setup" type="button" aria-label="返回启动页">返回</button><div class="three-toast" id="toast" role="status" aria-live="polite"></div><div class="three-hud"><div class="three-topbar"><div class="popup-chip popup-level"><span id="campaign-hud">纸境 · 第 1 / 20 页</span><h1 id="level-title">翻开第一页</h1></div><div class="popup-chip popup-stars"><span>折纸星 · 朝向</span><strong id="star-count" aria-label="折纸星 0 / 3"><i></i><i></i><i></i><em class="popup-dial" id="orientation-dial" aria-label="书本朝向">▲</em></strong></div></div><div></div><div class="three-bottom"><div class="three-objective"><span id="status-label">怎么走</span><p id="status">点击地面走过去；转一转书，路就出现了。</p></div><div class="three-controls" aria-label="转书与跳跃"><button type="button" data-key="ccw" aria-label="向左转动书本">⟲</button><button type="button" data-key="jump" class="popup-jump" aria-label="跳跃">跃</button><button type="button" data-key="cw" aria-label="向右转动书本">⟳</button></div></div></div><section class="three-start" id="start-card"><span class="kicker">纸境 · 立体书迷宫</span><h2>${escapeHtml(project.title)}</h2><p>每一页都是一座纸做的迷宫。把整本书转 90°，折起的桥和台阶就会落下来，藏在纸洞后的折纸星也会露出来。</p><div class="popup-guide"><div><b>⟲ ⟳</b>横向滑动或 Q / E 转书</div><div><b>☝</b>点击地面或方向键行走</div><div><b>跃</b>空格或按钮越过一格空隙</div></div><label class="three-level-field"><span>翻到哪一页</span><select data-campaign-level aria-label="选择关卡">${campaignOptions}</select></label><small data-campaign-progress>第 1 / 20 页 · 晨光草甸</small><button type="button" id="start">翻开这一页</button></section><section class="three-result" id="result-card" hidden><span class="kicker" id="result-kicker">这一页读完了</span><h2 id="result-title">抵达出口</h2><div class="result-stars" id="result-stars"><i>★</i><i>★</i><i>★</i></div><p id="result-detail"></p><div class="three-result-actions"><button type="button" class="secondary-result" id="result-setup">回到目录</button><button type="button" id="restart">翻到下一页</button></div></section><div class="webgl-error" id="webgl-error" hidden>此浏览器无法启动 WebGL 2。请启用硬件加速，或换用最新版 Chrome、Edge、Safari。</div></main></body></html>`;
}

export function popupGameScript(project: ProjectDetail, safeStorageShim = "") {
  const audit = auditPopupBlueprints();
  const config = safeJson({
    title: project.title,
    visualStyle: project.spec.visualStyle,
    difficulty: project.spec.difficulty,
    cameraMode: project.spec.cameraMode,
    inputModes: project.spec.inputModes,
    campaign: project.spec.levelProgression,
    campaignLevels: createPopupCampaignLevels(project),
    campaignStorageKey: `forge-campaign:${project.id}:${project.version.id}`,
    mode: "popup",
    engine: "playcanvas",
    engineVersion: playcanvasVersion(),
    contract: project.spec.threeContract,
    chapters: popupChapters,
    blueprints: popupBestTemplateBlueprints,
    solutions: Object.fromEntries(audit.map((report) => [report.id, report.solution?.actions ?? []])),
    beatMs: 380,
  });
  // 注意：下面的浏览器脚本刻意不使用模板字符串与 ${}，避免与本 TS 模板字面量冲突。
  const header = `import * as pc from "./vendor/${playcanvasVendorFile}";
${safeStorageShim}
const config = ${config};
const rules = ${paperPopupRulesSource()};
document.body.dataset.gameState = "idle";
document.body.dataset.cameraMode = config.cameraMode;
document.body.dataset.engine = "playcanvas";
const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.querySelector("#game-canvas");
const startCard = document.querySelector("#start-card");
const resultCard = document.querySelector("#result-card");
const backToSetupButton = document.querySelector("#back-to-setup");
const resultSetupButton = document.querySelector("#result-setup");
const status = document.querySelector("#status");
const statusLabel = document.querySelector("#status-label");
const toast = document.querySelector("#toast");
const starCount = document.querySelector("#star-count");
const orientationDial = document.querySelector("#orientation-dial");
const levelTitle = document.querySelector("#level-title");
const campaignHud = document.querySelector("#campaign-hud");
const campaignSelect = document.querySelector("[data-campaign-level]");
const campaignProgress = document.querySelector("[data-campaign-progress]");
const errorPanel = document.querySelector("#webgl-error");
const pauseButton = document.createElement("button");
pauseButton.type = "button";
pauseButton.className = "three-back three-pause";
pauseButton.textContent = "暂停";
pauseButton.setAttribute("aria-label", "暂停游戏");
document.querySelector(".three-shell").appendChild(pauseButton);
`;
  return `${header}${popupEngineScript}${popupSceneScript}${popupGameLoopScript}`;
}

export type PopupArtifactHelpers = {
  copySignalAssetPack: (root: string) => void;
  /** 保留字段以维持调用签名；PlayCanvas 运行时不再使用 Three.js 源文件。 */
  threeModuleSource: string;
  threeCoreSource: string;
  safeStorageShim: string;
  telemetryScript: string;
};

export function copyPaperPopupAssetPack(root: string) {
  const targetRoot = join(root, "assets");
  mkdirSync(targetRoot, { recursive: true });
  for (const filename of paperPopupTextureFiles) {
    const source = join(paperPopupAssetRoot, filename);
    if (!existsSync(source)) throw new Error(`纸艺贴图缺失：${filename}`);
    copyFileSync(source, join(targetRoot, filename));
  }
}

/** 产物静态探针（原先内联在 game-artifact.ts 的 popup 分支里；换引擎后与运行时放在一起维护）。 */
export function inspectPaperPopupArtifact(root: string, input: { html: string; script: string; styles: string; manifest: { aspectRatio?: unknown; cameraMode?: unknown; inputModes?: unknown[]; levelProgression?: { levelCount?: unknown } }; aiFailures: string[]; svgFailures: string[]; assetsOk: boolean }) {
  const { html, script, styles, manifest, aiFailures, svgFailures, assetsOk } = input;
  const vendor = join(root, "vendor", playcanvasVendorFile);
  const levelAuditPath = join(root, "_studio", "PAPER_POPUP_LEVELS.json");
  const levelAudit = existsSync(levelAuditPath) ? JSON.parse(readFileSync(levelAuditPath, "utf8")) as { levels?: Array<{ issues: string[]; requiresRotation: boolean; hiddenStarIndexes: number[]; starsCollectible: boolean[]; solution: unknown }> } : null;
  const probes = [
    ["WebGL 2 首次加载", html.includes('id="game-canvas"') && html.includes('type="module"') && html.includes('id="start"')],
    ["PlayCanvas 本地运行时", existsSync(vendor) && statSync(vendor).size > 1_000_000 && script.includes(`from "./vendor/${playcanvasVendorFile}"`) && !script.includes("from \"./vendor/three")],
    ["真实 3D 场景", script.includes("new pc.Application(") && script.includes('addComponent("camera"') && script.includes('addComponent("render"') && script.includes("pc.Mesh.fromGeometry(")],
    ["程序化纸艺几何与纸边", script.includes("class GeoBuilder") && script.includes("function boxMesh") && script.includes("function sheetMesh") && script.includes("const BEVEL = ") && script.includes("function starGeometry") && !script.includes("new THREE.Sprite(") && !script.includes("EdgesGeometry")],
    ["AI 贴图只作纸纹与印花", script.includes('"paper-grain.png"') && script.includes('"./assets/background.png"') && script.includes("decalTexture(") && ["paper-grain.png", "decal-meadow.png", "decal-coast.png", "decal-market.png", "decal-snow.png"].every((file) => existsSync(join(root, "assets", file)))],
    ["单主光半球光柔影雾与 ACES", script.includes('type: "directional"') && script.includes("ambientLight") && script.includes("SHADOW_PCF5_32F") && script.includes("pc.FOG_LINEAR") && script.includes("pc.TONEMAP_ACES")],
    ["高性能档移轴景深", script.includes("tiltShift: true") && script.includes("new pc.CameraFrame(") && script.includes("dof.enabled") && script.includes("SSAOTYPE_LIGHTING")],
    ["翻页开场与 reduced-motion 回退", script.includes("prefers-reduced-motion") && script.includes("rightPage.setLocalEulerAngles") && script.includes("function burstConfetti")],
    ["旋转与可达性模型", script.includes("function createPaperPopupRules()") && script.includes("function performRotation") && script.includes("function planPath") && script.includes("rules.step(")],
    ["节拍障碍与检查点恢复", script.includes("function tick()") && script.includes("syncHazards") && script.includes('"fell"') && script.includes('"hit"') && script.includes("checkpoint:") && script.includes("function planSafePath")],
    ["两种手势加一个按钮", html.includes('data-key="cw"') && html.includes('data-key="ccw"') && html.includes('data-key="jump"') && script.includes("performRotation(dx > 0") && script.includes("function pickCell")],
    ["胜负与重开", script.includes("showResult(true)") && script.includes("showResult(false)") && script.includes('"#restart"')],
    ["键盘与触控", script.includes('window.addEventListener("keydown"') && script.includes('canvas.addEventListener("pointerdown"') && script.includes('button.addEventListener("pointerdown"')],
    ["响应式与性能", styles.includes("@media(max-width:720px)") && script.includes("performanceProfiles") && script.includes("function applyPerformanceTier") && script.includes('window.addEventListener("resize"') && script.includes("renderSuspended")],
    ["目标画幅合同", Boolean(manifest.aspectRatio) && styles.includes("width:100vw") && styles.includes("height:100svh") && styles.includes("aspect-ratio:9/16")],
    ["镜头与输入合同", Boolean(manifest.cameraMode) && Boolean(manifest.inputModes?.length) && script.includes("config.cameraMode")],
    ["统一运行状态", script.includes("function setGameSessionState(nextState)") && script.includes("document.body.dataset.gameState = nextState") && script.includes("function togglePause")],
    ["二十关渐进合同", Number(manifest.levelProgression?.levelCount) >= 20 && html.includes("data-campaign-level") && script.includes("config.campaignLevels")],
    ["二十关数据校验与求解", Boolean(levelAudit?.levels) && levelAudit!.levels!.length === 20 && levelAudit!.levels!.every((level) => level.issues.length === 0 && level.requiresRotation && level.hiddenStarIndexes.length > 0 && level.starsCollectible.every(Boolean) && level.solution)],
    ["真实视听资产", assetsOk],
    ["资产溯源", existsSync(join(root, "_studio", "THREE_ASSET_PROVENANCE.json")) && existsSync(join(root, "_studio", "PAPER_POPUP_ASSET_PROMPTS.md"))],
    ["开源引擎归属", existsSync(join(root, "_studio", "OPEN_SOURCE_ATTRIBUTION.md")) && readFileSync(join(root, "_studio", "OPEN_SOURCE_ATTRIBUTION.md"), "utf8").includes("PlayCanvas")],
    ["专业设计文档", existsSync(join(root, "_studio", "GAME_DESIGN.md"))
      && existsSync(join(root, "_studio", "ART_REVIEW.md"))
      && readFileSync(join(root, "_studio", "GAME_DESIGN.md"), "utf8").includes("## 核心循环")
      && readFileSync(join(root, "_studio", "ART_REVIEW.md"), "utf8").includes("主体占据可用面积约 82%–94%")],
    ["AI 生图位图", aiFailures.length === 0],
    ["禁用 SVG", svgFailures.length === 0],
  ] as const;
  const failed = probes.filter(([, passed]) => !passed);
  if (failed.length) throw new Error(`3D 立体书探针失败：${failed.map(([name]) => name).join("、")}`);
  return probes.map(([name]) => name);
}

function writeEngineAttribution(studioRoot: string, version: string) {
  const path = join(studioRoot, "OPEN_SOURCE_ATTRIBUTION.md");
  const section = [
    "",
    "## 3D 引擎：PlayCanvas",
    "",
    `- 项目：https://github.com/playcanvas/engine（npm \`playcanvas@${version}\`）`,
    "- 许可证：MIT（版权 PlayCanvas Ltd.），原文见 `vendor/PLAYCANVAS-LICENSE.md` 与平台仓库 `third_party/playcanvas-LICENSE.md`",
    `- 接入方式：官方单文件 ESM 构建 \`build/playcanvas.mjs\` 原样复制为 \`vendor/${playcanvasVendorFile}\`，由 \`app.js\` 以相对路径 \`import\` 引入；运行时不从 CDN 加载任何代码`,
    "- 使用范围：渲染（实体 / 组件、StandardMaterial、阴影、雾、ACES、CameraFrame 后处理）；关卡规则、几何与美术均为平台自有代码",
    "",
  ].join("\n");
  if (existsSync(path)) {
    const current = readFileSync(path, "utf8");
    if (!current.includes("## 3D 引擎：PlayCanvas")) appendFileSync(path, section, "utf8");
  } else writeFileSync(path, `# 开源代码归属\n\n此游戏模板没有声明为第三方开源代码移植。\n${section}`, "utf8");
}

export function writePaperPopupArtifact(root: string, project: ProjectDetail, helpers: PopupArtifactHelpers) {
  if (!existsSync(playcanvasModuleSource)) throw new Error("PlayCanvas 浏览器运行时缺失（node_modules/playcanvas/build/playcanvas.mjs），请先安装项目依赖。");
  const version = playcanvasVersion();
  helpers.copySignalAssetPack(root);
  copyPaperPopupAssetPack(root);
  mkdirSync(join(root, "vendor"), { recursive: true });
  copyFileSync(playcanvasModuleSource, join(root, "vendor", playcanvasVendorFile));
  const licenseSource = join(playcanvasPackageRoot, "LICENSE");
  if (existsSync(licenseSource)) copyFileSync(licenseSource, join(root, "vendor", "PLAYCANVAS-LICENSE.md"));
  writeFileSync(join(root, "index.html"), popupGameHtml(project), "utf8");
  writeFileSync(join(root, "styles.css"), popupGameStyles, "utf8");
  writeFileSync(join(root, "app.js"), `${popupGameScript(project, helpers.safeStorageShim)}${helpers.telemetryScript}`, "utf8");
  const provenanceRoot = join(root, "_studio");
  mkdirSync(provenanceRoot, { recursive: true });
  writeEngineAttribution(provenanceRoot, version);
  const manifest = readPaperPopupAssetManifest();
  const audit = auditPopupBlueprints();
  // 官方贴图包是策划确认过的固定资产：直接写入 AI 生图溯源，构建时不再重新生成封面与背景。
  writeFileSync(join(provenanceRoot, "DYNAMIC_ART.json"), JSON.stringify({
    schemaVersion: 2,
    model: "gpt-image-2",
    generatedAt: manifest.entries.map((entry) => entry.generatedAt).sort().at(-1) ?? new Date().toISOString(),
    source: "assets/starter/paper-popup/manifest.json",
    entries: paperPopupTextureFiles.map((filename) => {
      const entry = manifest.entries.find((candidate) => candidate.file === filename);
      if (!entry) throw new Error(`纸艺贴图缺少生成记录：${filename}`);
      return { file: `assets/${filename}`, role: entry.role, bytes: statSync(join(root, "assets", filename)).size, sha256: entry.delivered.sha256, prompt: entry.prompt };
    }),
  }, null, 2), "utf8");
  writeFileSync(join(provenanceRoot, "PAPER_POPUP_ASSET_PROMPTS.md"), [
    "# 纸境 · 立体书迷宫 贴图生成记录",
    "",
    `- 模型：\`${manifest.model}\``,
    "- 生成脚本：`scripts/generate-paper-popup-art.mjs`（gpt-image-2 生图接口，与 `src/server/image-generator.ts` 同一接口；交付图由无头 Chromium 画布缩放）",
    "- 用途：所有 AI 图只作为封面或贴图（纸纹、桌面背景、章节印花）；关卡几何全部为 PlayCanvas 程序化低多边形网格。",
    "",
    ...manifest.entries.flatMap((entry) => [
      `## ${entry.file} · ${entry.role}`,
      "",
      `- 用途：${entry.use}；请求尺寸 ${entry.requestedSize}；交付 ${entry.delivered.width}×${entry.delivered.height}（${entry.delivered.bytes} 字节）`,
      `- 源图 sha256：\`${entry.source.sha256}\``,
      `- 交付 sha256：\`${entry.delivered.sha256}\``,
      `- 提示词：${entry.prompt}`,
      "",
    ]),
  ].join("\n"), "utf8");
  writeFileSync(join(provenanceRoot, "PAPER_POPUP_LEVELS.json"), JSON.stringify({
    schemaVersion: 1,
    checkedAt: new Date().toISOString(),
    chapters: popupChapters,
    levels: audit.map((report) => ({ id: report.id, issues: report.issues, requiresRotation: report.requiresRotation, hiddenStarIndexes: report.hiddenStarIndexes, starsCollectible: report.starsCollectible, solution: report.solution })),
  }, null, 2), "utf8");
  const trackedAssets = [...paperPopupTextureFiles, "music.wav", "ambient.wav", "legal.wav", "illegal.wav", "reward.wav", "hit.wav", "victory.wav", "defeat.wav", "ui.wav"];
  writeFileSync(join(provenanceRoot, "THREE_ASSET_PROVENANCE.json"), JSON.stringify({
    schemaVersion: 2,
    runtime: `playcanvas ${version}`,
    engine: { name: "PlayCanvas", version, license: "MIT", bundle: `vendor/${playcanvasVendorFile}`, bytes: statSync(join(root, "vendor", playcanvasVendorFile)).size },
    mode: "popup",
    contract: project.spec.threeContract,
    assetGeneration: { model: "gpt-image-2", promptRecord: "_studio/PAPER_POPUP_ASSET_PROMPTS.md", manifest: "assets/starter/paper-popup/manifest.json", deliveredTextures: paperPopupTextureFiles },
    renderPipeline: { shading: "flat-shaded procedural low-poly, colors baked as sRGB vertex colors on shared StandardMaterials", paperEdges: "geometric chamfer strips on boxes and inset rims on sheets, edge color baked per vertex", lighting: "directional sun + sky fill + ambient + PCF5/PCSS shadows + linear fog + ACES", postProcessing: "CameraFrame: MSAA x4, SSAO contact shadows (medium/high), bloom + depth-of-field tilt-shift (high only), vignette", reducedMotion: "page flip, bounce, confetti and rotation easing disabled" },
    models: [
      { id: "paper-cells", format: "procedural-playcanvas-mesh", use: "grid-terrain", approximateTriangles: 60 * 81 },
      { id: "paper-links", format: "procedural-playcanvas-mesh", use: "folding-bridges-and-stairs", approximateTriangles: 240 },
      { id: "origami-star", format: "procedural-playcanvas-mesh", use: "collectible", approximateTriangles: 80 },
      { id: "paper-puppet", format: "procedural-playcanvas-mesh", use: "player-avatar", approximateTriangles: 160 },
      { id: "paper-hazards", format: "procedural-playcanvas-mesh", use: "wave-and-bird-hazards", approximateTriangles: 60 },
    ],
    glbAssets: [],
    note: "没有位图立牌充当 3D 物体；AI 位图只作为封面、纸纹、桌面与章节印花贴图，来源与哈希见 manifest。",
    files: trackedAssets.map((filename) => ({ filename: `assets/${filename}`, bytes: statSync(join(root, "assets", filename)).size, use: filename.endsWith(".wav") ? "audio" : filename === "cover.png" ? "cover" : "texture", sha256: manifest.entries.find((entry) => entry.file === filename)?.delivered.sha256 ?? null })),
  }, null, 2), "utf8");
  writeFileSync(join(root, "game-manifest.json"), JSON.stringify({
    title: project.title,
    template: project.spec.template,
    runtimeTarget: "web-3d",
    perspective: "third-person",
    engine: "playcanvas",
    engineVersion: version,
    engineLicense: "MIT",
    difficulty: project.spec.difficulty,
    visualStyle: project.spec.visualStyle,
    aspectRatio: project.spec.aspectRatio,
    cameraMode: project.spec.cameraMode,
    inputModes: project.spec.inputModes,
    levelProgression: project.spec.levelProgression,
    generatedAt: new Date().toISOString(),
    assetPack: "signal-studio+paper-popup",
    assetManifest: "./assets/asset-manifest.json",
    artPipeline: { renderer: "playcanvas-procedural-papercraft", cover: "./assets/cover.png", textures: paperPopupTextureFiles.map((file) => `./assets/${file}`), environment: "./assets/background.png" },
    threeMode: "popup",
    threeContract: project.spec.threeContract,
    performanceProfiles: { low: { pixelRatio: 1, shadows: false, tiltShift: false }, medium: { pixelRatio: 1.25, shadows: true, tiltShift: false }, high: { pixelRatio: 1.5, shadows: true, tiltShift: true } },
    assetProvenance: "./_studio/THREE_ASSET_PROVENANCE.json",
    levelAudit: "./_studio/PAPER_POPUP_LEVELS.json",
  }, null, 2), "utf8");
}
