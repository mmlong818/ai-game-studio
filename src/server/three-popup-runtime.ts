import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectDetail } from "../shared/contracts.js";
import { paperPopupRulesSource } from "../shared/paper-popup-rules.js";
import { createCampaignLevels } from "../shared/level-progression.js";
import { auditPopupBlueprints, popupBestTemplateBlueprints, popupChapters } from "./three-popup-blueprints.js";

const moduleRoot = dirname(fileURLToPath(import.meta.url));
export const paperPopupAssetRoot = resolve(moduleRoot, "..", "..", "assets", "starter", "paper-popup");

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
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#f4ecd9"><title>${escapeHtml(project.title)} · 立体书迷宫</title><link rel="preload" as="image" href="./assets/cover.png"><link rel="preload" as="image" href="./assets/paper-grain.png"><link rel="preload" as="image" href="./assets/background.png"><link rel="stylesheet" href="./styles.css"><script type="module" src="./app.js"></script></head><body data-runtime="web-3d" data-three-mode="popup" data-chapter="1" data-visual-style="${project.spec.visualStyle}" data-detail-level="paper"><main class="three-shell"><canvas id="game-canvas" class="three-canvas" aria-label="可转动的立体书迷宫" tabindex="0"></canvas><button class="three-back" id="back-to-setup" type="button" aria-label="返回启动页">返回</button><div class="three-toast" id="toast" role="status" aria-live="polite"></div><div class="three-hud"><div class="three-topbar"><div class="popup-chip popup-level"><span id="campaign-hud">纸境 · 第 1 / 20 页</span><h1 id="level-title">翻开第一页</h1></div><div class="popup-chip popup-stars"><span>折纸星 · 朝向</span><strong id="star-count" aria-label="折纸星 0 / 3"><i></i><i></i><i></i><em class="popup-dial" id="orientation-dial" aria-label="书本朝向">▲</em></strong></div></div><div></div><div class="three-bottom"><div class="three-objective"><span id="status-label">怎么走</span><p id="status">点击地面走过去；转一转书，路就出现了。</p></div><div class="three-controls" aria-label="转书与跳跃"><button type="button" data-key="ccw" aria-label="向左转动书本">⟲</button><button type="button" data-key="jump" class="popup-jump" aria-label="跳跃">跃</button><button type="button" data-key="cw" aria-label="向右转动书本">⟳</button></div></div></div><section class="three-start" id="start-card"><span class="kicker">纸境 · 立体书迷宫</span><h2>${escapeHtml(project.title)}</h2><p>每一页都是一座纸做的迷宫。把整本书转 90°，折起的桥和台阶就会落下来，藏在纸洞后的折纸星也会露出来。</p><div class="popup-guide"><div><b>⟲ ⟳</b>横向滑动或 Q / E 转书</div><div><b>☝</b>点击地面或方向键行走</div><div><b>跃</b>空格或按钮越过一格空隙</div></div><label class="three-level-field"><span>翻到哪一页</span><select data-campaign-level aria-label="选择关卡">${campaignOptions}</select></label><small data-campaign-progress>第 1 / 20 页 · 晨光草甸</small><button type="button" id="start">翻开这一页</button></section><section class="three-result" id="result-card" hidden><span class="kicker" id="result-kicker">这一页读完了</span><h2 id="result-title">抵达出口</h2><div class="result-stars" id="result-stars"><i>★</i><i>★</i><i>★</i></div><p id="result-detail"></p><div class="three-result-actions"><button type="button" class="secondary-result" id="result-setup">回到目录</button><button type="button" id="restart">翻到下一页</button></div></section><div class="webgl-error" id="webgl-error" hidden>此浏览器无法启动 WebGL 2。请启用硬件加速，或换用最新版 Chrome、Edge、Safari。</div></main></body></html>`;
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
    contract: project.spec.threeContract,
    chapters: popupChapters,
    blueprints: popupBestTemplateBlueprints,
    solutions: Object.fromEntries(audit.map((report) => [report.id, report.solution?.actions ?? []])),
    beatMs: 380,
  });
  // 注意：下面的浏览器脚本刻意不使用模板字符串与 ${}，避免与本 TS 模板字面量冲突。
  return `import * as THREE from "./vendor/three.module.js";
${safeStorageShim}
const config = ${config};
const rules = ${paperPopupRulesSource()};
document.body.dataset.gameState = "idle";
document.body.dataset.cameraMode = config.cameraMode;
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

const palettes = {
  // 晨光草甸：奶油纸、鼠尾草绿、万寿菊，墨蓝只做书封与细节。
  1: { sky: 0xf6eedc, fog: 0xf6eedc, desk: 0xeadfc6, cover: 0x3a4a6c, page: 0xf3e9d2, top: [0x8fae7a, 0x86a571], side: 0xd9c39a, sideShade: 0xb99e73, edge: 0xfffaf0, accent: 0xe8b23a, accent2: 0xd97f66, tree: 0x6f8f6a, treeLight: 0x8fae82, bush: 0x9db88a, flower: [0xecb63b, 0xfff6e6, 0xd97f66], hazard: 0x8fb7b0, bird: 0xfaf3e3, decal: "decal-meadow.png", star: 0xf4b93a, sunColor: 0xfff1d2, sunIntensity: 3.4, hemiSky: 0xeef4ff, hemiGround: 0xa08a63, hemiIntensity: 0.55, exposure: 1.0, backdrop: [0x8fae7a, 0x789a68, 0xe8dcc2] },
  // 海岸灯塔：奶油、珊瑚、海泡绿、墨蓝。
  2: { sky: 0xe3edee, fog: 0xe3edee, desk: 0xdfe6e0, cover: 0x24395e, page: 0xf1e8d4, top: [0x9cc9c0, 0x90bdb4], side: 0xe3d3b3, sideShade: 0xc4b18a, edge: 0xfffdf6, accent: 0xd97d64, accent2: 0x27406a, tree: 0x7fa39a, treeLight: 0x9fbfb6, bush: 0x8fb5ad, flower: [0xd97d64, 0xfff8ee, 0xf0c46a], hazard: 0x6fa6b8, bird: 0xffffff, decal: "decal-coast.png", star: 0xf4b93a, sunColor: 0xfff6e6, sunIntensity: 3.4, hemiSky: 0xeaf7ff, hemiGround: 0x8a9c9e, hemiIntensity: 0.55, exposure: 1.0, backdrop: [0x9cc9c0, 0x6fa6b8, 0xf3ede0] },
  // 灯笼夜市：墨蓝夜空、李子紫纸台、暖琥珀灯笼把场景照亮。
  3: { sky: 0x1d2347, fog: 0x1d2347, desk: 0x23284a, cover: 0x131736, page: 0x4a4577, top: [0x8d6aa6, 0x83609b], side: 0x6a4d84, sideShade: 0x4f3a63, edge: 0xf6e6cc, accent: 0xf4a44a, accent2: 0xbd6684, tree: 0x5f3f70, treeLight: 0x7a5390, bush: 0x6a4a7c, flower: [0xf4a44a, 0xf6d38a, 0xbd6684], hazard: 0x9a6fb0, bird: 0xf2e3cf, decal: "decal-market.png", star: 0xf8c655, sunColor: 0xffcf9c, sunIntensity: 2.6, hemiSky: 0x8f92e6, hemiGround: 0x2f2440, hemiIntensity: 0.9, exposure: 1.45, backdrop: [0x5a4574, 0x6c4f86, 0x463560], lanterns: true },
  // 雪原天文台：冰白、淡蓝，单一黄铜点缀。
  4: { sky: 0xe4edf5, fog: 0xe4edf5, desk: 0xdfe7ef, cover: 0x5b7a99, page: 0xf4f8fb, top: [0xf7fafc, 0xecf2f7], side: 0xcfdde9, sideShade: 0xaec2d3, edge: 0xffffff, accent: 0xc9a45c, accent2: 0x7f9cba, tree: 0xe6eef5, treeLight: 0xf7fafc, bush: 0xdde8f0, flower: [0xc9a45c, 0xffffff, 0xbcd3e6], hazard: 0xa9c3da, bird: 0xffffff, decal: "decal-snow.png", star: 0xf4b93a, sunColor: 0xfff9ef, sunIntensity: 3.4, hemiSky: 0xf2f7ff, hemiGround: 0x8fa3b6, hemiIntensity: 0.55, exposure: 0.98, backdrop: [0xdde8f0, 0xbcd3e6, 0xf7fafc] },
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
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (error) {
  errorPanel.hidden = false;
  throw error;
}
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
const deviceMemory = Number(navigator.deviceMemory || 4);
const hardwareConcurrency = Number(navigator.hardwareConcurrency || 4);
let performanceTier = deviceMemory <= 2 || hardwareConcurrency <= 4 ? "low" : deviceMemory >= 8 && hardwareConcurrency >= 8 ? "high" : "medium";
const performanceProfiles = { low: { pixelRatio: 1, shadows: false, shadowSize: 512, tiltShift: false, decor: 0.4, particles: false }, medium: { pixelRatio: 1.25, shadows: true, shadowSize: 1024, tiltShift: false, decor: 1, particles: true }, high: { pixelRatio: 1.5, shadows: true, shadowSize: 2048, tiltShift: true, decor: 1, particles: true } };
function applyPerformanceTier(nextTier) {
  performanceTier = nextTier;
  state.performanceTier = nextTier;
  const profile = performanceProfiles[nextTier];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, profile.pixelRatio));
  renderer.shadowMap.enabled = profile.shadows;
  if (sun) { sun.castShadow = profile.shadows; sun.shadow.mapSize.set(profile.shadowSize, profile.shadowSize); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  document.body.dataset.performanceTier = nextTier;
  resize();
  // 低性能档构件数量 × 0.4（四角主构件保留）：切档时只重建构件层，不动纸台与规则。
  if (typeof rebuildDecor === "function" && blueprint) rebuildDecor();
}

const textureLoader = new THREE.TextureLoader();
function loadTexture(path, repeat) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  if (repeat) { texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(repeat, repeat); }
  return texture;
}
const paperTexture = loadTexture("./assets/paper-grain.png", 1.5);
const pageTexture = loadTexture("./assets/paper-grain.png", 3);
const deskTexture = loadTexture("./assets/background.png", 1);
const decalTextures = {};
function decalTexture(name) {
  if (!decalTextures[name]) { const texture = loadTexture("./assets/" + name); decalTextures[name] = texture; }
  return decalTextures[name];
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
// 桌面用等角三分之一俯视；竖屏更俯视一些，让整本书在窄画幅里占到更多高度。
const LANDSCAPE_DIRECTION = new THREE.Vector3(0.5, 0.82, 0.866).normalize();
const PORTRAIT_DIRECTION = new THREE.Vector3(0.5, 1.18, 0.866).normalize();
const cameraDirection = LANDSCAPE_DIRECTION.clone();
const cameraTarget = new THREE.Vector3(0, 0.6, 0);
let cameraDistance = 14;
const hemi = new THREE.HemisphereLight(palette.hemiSky, palette.hemiGround, palette.hemiIntensity);
scene.add(hemi);
let sun = new THREE.DirectionalLight(palette.sunColor, palette.sunIntensity);
sun.position.set(-6, 12, 5);
sun.castShadow = performanceProfiles[performanceTier].shadows;
sun.shadow.mapSize.set(performanceProfiles[performanceTier].shadowSize, performanceProfiles[performanceTier].shadowSize);
sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
sun.shadow.camera.left = -8; sun.shadow.camera.right = 8; sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
sun.shadow.radius = 3;
scene.add(sun);
scene.add(sun.target);
const desk = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: palette.desk, map: loadTexture("./assets/paper-grain.png", 18), roughness: 1, metalness: 0 }));
void deskTexture;
desk.rotation.x = -Math.PI / 2;
desk.position.y = -0.62;
desk.receiveShadow = true;
scene.add(desk);
const book = new THREE.Group();
scene.add(book);
const bookBase = new THREE.Group();
book.add(bookBase);
const rightPage = new THREE.Group();
book.add(rightPage);
const level = new THREE.Group();
book.add(level);
applyPerformanceTier(performanceTier);

const disposables = [];
function track(object) { disposables.push(object); return object; }
function disposeGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse((node) => { node.geometry?.dispose?.(); if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose?.()); else node.material?.dispose?.(); });
  }
}
function paperMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, map: options.map === null ? null : paperTexture, roughness: 0.96, metalness: 0, flatShading: true, emissive: options.emissive || 0x000000, emissiveIntensity: options.emissiveIntensity || 0, transparent: Boolean(options.transparent), opacity: options.opacity ?? 1, side: options.side || THREE.FrontSide });
}
function addEdges(mesh, color, opacity, thick) {
  // 纸边：EdgesGeometry 描边；thick 时再叠一层微放大的描边，形成约 2px 的浅色纸边。
  const geometry = new THREE.EdgesGeometry(mesh.geometry, 18);
  const material = new THREE.LineBasicMaterial({ color: color ?? palette.edge, transparent: true, opacity: opacity ?? 0.9 });
  const edges = new THREE.LineSegments(geometry, material);
  edges.renderOrder = 1;
  mesh.add(edges);
  if (thick) {
    const outer = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: color ?? palette.edge, transparent: true, opacity: 0.55 }));
    outer.scale.setScalar(1.02);
    outer.renderOrder = 1;
    mesh.add(outer);
  }
  return edges;
}
function offsetPaperUv(geometry, random) {
  // 每个纸面随机偏移纸纹，避免复制感。
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  const dx = random(); const dy = random();
  for (let index = 0; index < uv.count; index += 1) uv.setXY(index, uv.getX(index) + dx, uv.getY(index) + dy);
  uv.needsUpdate = true;
  return geometry;
}
function paperBox(w, h, d, color, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), Array.isArray(color) ? color : paperMaterial(color, options));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  if (!options.noEdges) addEdges(mesh, options.edgeColor, options.edgeOpacity);
  return mesh;
}
function starGeometry(radius, depth) {
  const shape = new THREE.Shape();
  for (let index = 0; index < 10; index += 1) {
    const angle = (index / 10) * Math.PI * 2 - Math.PI / 2;
    const r = index % 2 === 0 ? radius : radius * 0.46;
    if (index === 0) shape.moveTo(Math.cos(angle) * r, Math.sin(angle) * r); else shape.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
  }
  shape.closePath();
  return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
}
function seeded(seed) {
  let value = seed >>> 0;
  return () => { value = (value + 0x6d2b79f5) >>> 0; let t = value; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const cellMeshes = new Map();
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
function cellWorld(x, z, y) {
  return new THREE.Vector3(x - (gridWidth - 1) / 2, y ?? 0, z - (gridDepth - 1) / 2);
}
// 纸台高度：第一层 0.72，之后每层 0.55，让低多边形纸崖有可见的侧面。
function cellTop(x, z) { const h = rules.heightAt(blueprint, x, z); return h > 0 ? 0.72 + (h - 1) * STEP * 1.1 : 0; }
function directionAngle(direction) { return direction === "N" ? Math.PI : direction === "S" ? 0 : direction === "E" ? Math.PI / 2 : -Math.PI / 2; }

function bookMargin() { return camera.aspect < 1 ? 0.9 : 1.2; }
function buildBook() {
  disposeGroup(bookBase); disposeGroup(rightPage);
  const bookW = gridWidth + 2 * bookMargin();
  const bookD = gridDepth + 2 * bookMargin();
  const cover = paperBox(bookW + 0.5, 0.14, bookD + 0.5, palette.cover, { edgeColor: palette.edge, edgeOpacity: 0.35 });
  cover.position.y = -0.47;
  bookBase.add(cover);
  const spine = paperBox(0.26, 0.08, bookD + 0.5, palette.cover, { noEdges: true });
  spine.position.y = -0.36;
  bookBase.add(spine);
  const pageMaterial = new THREE.MeshStandardMaterial({ color: palette.page, map: pageTexture, roughness: 1, metalness: 0, flatShading: true });
  const leftPage = new THREE.Mesh(new THREE.BoxGeometry(bookW / 2, 0.3, bookD), pageMaterial);
  leftPage.position.set(-bookW / 4 - 0.05, -0.25, 0);
  leftPage.receiveShadow = true; leftPage.castShadow = true;
  addEdges(leftPage, palette.edge, 0.6);
  bookBase.add(leftPage);
  const right = new THREE.Mesh(new THREE.BoxGeometry(bookW / 2, 0.3, bookD), pageMaterial.clone());
  right.position.set(bookW / 4 + 0.05, -0.25, 0);
  right.receiveShadow = true; right.castShadow = true;
  addEdges(right, palette.edge, 0.6);
  rightPage.add(right);
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshStandardMaterial({ map: decalTexture(palette.decal), transparent: true, roughness: 1, metalness: 0, depthWrite: false }));
  decal.rotation.x = -Math.PI / 2;
  decal.rotation.z = -0.35;
  decal.position.set(bookW / 2 - 1.1, -0.095, bookD / 2 - 1.1);
  decal.receiveShadow = true;
  rightPage.add(decal);
  rightPage.position.set(0, 0, 0);
  rightPage.rotation.set(0, 0, 0);
}

function buildLevel() {
  disposeGroup(level);
  cellMeshes.clear(); linkViews.splice(0); starViews.splice(0); plateViews.splice(0); hazardViews.splice(0); flagViews.splice(0);
  exitView = null;
  const random = seeded(campaignLevelIndex * 7919 + 17);
  const decorScale = performanceProfiles[performanceTier].decor;
  for (let z = 0; z < gridDepth; z += 1) {
    for (let x = 0; x < gridWidth; x += 1) {
      const h = rules.heightAt(blueprint, x, z);
      if (!h) continue;
      const height = cellTop(x, z);
      const topColor = palette.top[(x + z) % 2];
      // 纸台主体：满格（无缝）、侧面为奶油纸，底部略深；顶面另做一张薄纸片，形成层叠。
      const side = paperMaterial(palette.side);
      const shade = paperMaterial(palette.sideShade);
      const bodyGeometry = offsetPaperUv(new THREE.BoxGeometry(1, height, 1), random);
      const mesh = new THREE.Mesh(bodyGeometry, [side, shade, paperMaterial(palette.side), shade, side, shade]);
      mesh.position.copy(cellWorld(x, z, height / 2 - 0.1));
      mesh.castShadow = true; mesh.receiveShadow = true;
      mesh.userData = { cell: { x, z } };
      addEdges(mesh, palette.edge, 0.75);
      level.add(mesh);
      cellMeshes.set(x + "," + z, mesh);
      const sheet = new THREE.Mesh(offsetPaperUv(new THREE.BoxGeometry(1.06, 0.12, 1.06), random), paperMaterial(topColor));
      sheet.position.copy(cellWorld(x, z, height - 0.1 + 0.06));
      sheet.castShadow = true; sheet.receiveShadow = true;
      sheet.userData = { cell: { x, z } };
      addEdges(sheet, palette.edge, 1, true);
      level.add(sheet);
      // 每一层高度加一条略深的纸层线，读出“很多张纸叠起来”的厚度。
      for (let layer = 1; layer < h; layer += 1) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(1.006, 0.04, 1.006), paperMaterial(new THREE.Color(palette.sideShade).multiplyScalar(0.92), { map: null }));
        stripe.position.copy(cellWorld(x, z, 0.72 + (layer - 1) * STEP * 1.1 - 0.1));
        level.add(stripe);
      }
      if (random() < 0.0 * decorScale) {
        const tuft = makeGrassTuft(random, 0.55);
        tuft.position.copy(cellWorld(x, z, height - 0.1)).add(new THREE.Vector3((random() < 0.5 ? -0.36 : 0.36), 0, (random() < 0.5 ? -0.36 : 0.36)));
        level.add(tuft);
      }
    }
  }
  decorGroup = new THREE.Group();
  level.add(decorGroup);
  buildDecor(decorSeed(), decorScale);
  blueprint.links.forEach((link) => level.add(createLinkView(link)));
  blueprint.plates.forEach((plate) => level.add(createPlateView(plate)));
  blueprint.stars.forEach((star, index) => level.add(createStarView(star, index)));
  blueprint.checkpoints.forEach((point, index) => level.add(createFlagView(point, index)));
  blueprint.hazards.forEach((hazard) => level.add(createHazardView(hazard)));
  exitView = createExitView(blueprint.exit);
  level.add(exitView);
  playerView = createPlayerView();
  level.add(playerView);
}

// ---- 章节装饰（构件层，ART-SPEC §5）：全部是程序化纸片几何，禁止位图立牌与 SVG。 ----
// 约定：每个构件由 ≥ 2 张纸片前后错位 0.05–0.1 叠成（松树 ≥ 3 层），颜色由深到浅逐层提亮 8%，每张纸片带纸边描边；
// 主构件高 1.2–2.2 格，放在网格四角与通过“四个书本朝向都不遮挡可走格 / 星”检查的环带槽位；
// 次构件高 0.3–0.7 格填满书页留白环带（每 1.5 格 ≥ 1 个）；构件基座与可走格中心的距离 ≥ 0.6 + 基座半径。
// 远端两排纸山 / 屋影放在不随书旋转的 backdropGroup 里，永远立在书后方的桌面上，因此不可能遮挡关卡。
let decorGroup = new THREE.Group();
const backdropGroup = new THREE.Group();
scene.add(backdropGroup);
let backdropTargetZ = 0;
const decorItems = [];
let decorStats = null;
let lanternLightBudget = 0;
const LAYER_OFFSET = 0.07;
const LAYER_LIFT = 0.08;
function shade(color, amount) {
  const result = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  result.getHSL(hsl);
  result.setHSL(hsl.h, hsl.s, Math.max(0, Math.min(1, hsl.l * (1 + amount))));
  return result;
}
function mixColor(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), t); }
function sheetGeometry(points, depth) {
  const shape = new THREE.Shape();
  points.forEach((point, index) => { if (index === 0) shape.moveTo(point[0], point[1]); else shape.lineTo(point[0], point[1]); });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}
// 一张纸片：多边形轮廓（单位为格）挤出 depth，正面朝 +z，带纸边描边。
function paperSheet(points, color, options = {}) {
  const material = options.emissive
    ? new THREE.MeshStandardMaterial({ color, emissive: options.emissive, emissiveIntensity: options.emissiveIntensity ?? 1, roughness: 0.9, flatShading: true })
    : paperMaterial(color, { map: null });
  const mesh = new THREE.Mesh(sheetGeometry(points, options.depth || 0.035), material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  addEdges(mesh, options.edgeColor || palette.edge, options.edgeOpacity ?? 0.75);
  return mesh;
}
// 多层剪纸：layers[0] 在最后（最深），往前每层错位 offset 并提亮 lift；cross 时再放一组转 90° 的同样纸片，让构件从书的 4 个朝向看都有体积。
function layeredCutout(layers, baseColor, options = {}) {
  const group = new THREE.Group();
  const offset = options.offset ?? LAYER_OFFSET;
  const lift = options.lift ?? LAYER_LIFT;
  const buildSet = (rotationY) => {
    const set = new THREE.Group();
    layers.forEach((layer, index) => {
      const color = layer.color !== undefined ? layer.color : shade(baseColor, lift * index);
      const sheet = paperSheet(layer.points, color, { depth: options.depth, emissive: layer.emissive, emissiveIntensity: layer.emissiveIntensity, edgeOpacity: options.edgeOpacity, edgeColor: options.edgeColor });
      sheet.position.set(layer.x || 0, layer.y || 0, (index - (layers.length - 1) / 2) * offset);
      set.add(sheet);
    });
    set.rotation.y = rotationY;
    return set;
  };
  group.add(buildSet(0));
  if (options.cross) group.add(buildSet(Math.PI / 2));
  group.userData.layers = layers.length;
  return group;
}
function blobPoints(random, radius, squash, segments, raise) {
  const points = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const r = radius * (0.84 + random() * 0.32);
    points.push([Math.cos(angle) * r, Math.max(0, Math.sin(angle) * r * squash + (raise ?? radius * squash))]);
  }
  return points;
}
function hexPoints(radius, y) {
  const points = [];
  for (let index = 0; index < 6; index += 1) points.push([Math.cos(index / 6 * Math.PI * 2) * radius, (y || 0) + Math.sin(index / 6 * Math.PI * 2) * radius]);
  return points;
}
function starPoints(radius, y, count) {
  const points = [];
  const total = (count || 5) * 2;
  for (let index = 0; index < total; index += 1) {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    const r = index % 2 === 0 ? radius : radius * 0.5;
    points.push([Math.cos(angle) * r, (y || 0) + Math.sin(angle) * r]);
  }
  return points;
}
function tag(group, data) { group.userData = Object.assign(group.userData || {}, data); return group; }

function makeGrassTuft(random, scale = 1) {
  const group = new THREE.Group();
  const blades = 3 + Math.floor(random() * 3);
  for (let index = 0; index < blades; index += 1) {
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22 + random() * 0.14, 3), paperMaterial(index % 2 ? palette.treeLight : palette.tree, { map: null }));
    blade.position.set((random() - 0.5) * 0.18, 0.12, (random() - 0.5) * 0.18);
    blade.rotation.set((random() - 0.5) * 0.5, random() * Math.PI, (random() - 0.5) * 0.5);
    blade.castShadow = true;
    group.add(blade);
  }
  group.scale.setScalar(scale);
  return tag(group, { layers: 2, radius: 0.12, base: 0.08 });
}
// 多层松：每一层树冠是一张三角纸片，自下而上越来越小、越来越亮，并向前错位 0.06；十字两组纸片保证任何朝向都有体积。
function makePaperTree(random, tiers) {
  const snow = blueprint.chapter === 4;
  const group = new THREE.Group();
  const count = tiers || 3 + Math.floor(random() * 2);
  const trunk = paperBox(0.1, 0.34, 0.1, snow ? palette.accent : 0x8a6a4f, { edgeOpacity: 0.4 });
  trunk.position.y = 0.17;
  group.add(trunk);
  const layers = [];
  for (let tier = 0; tier < count; tier += 1) {
    const width = 0.58 - tier * (0.34 / count);
    layers.push({ points: [[-width, 0], [width, 0], [-width * 0.22, 0.42], [0, 0.58], [width * 0.22, 0.42]], y: 0.22 + tier * 0.32 });
  }
  group.add(layeredCutout(layers, palette.tree, { offset: 0.06, cross: true, depth: 0.05 }));
  return tag(group, { layers: count, radius: 0.58, base: 0.08, tree: true });
}
function makeBush(random) {
  const layers = [];
  for (let index = 0; index < 3; index += 1) {
    const radius = 0.3 - index * 0.05;
    layers.push({ points: blobPoints(random, radius, 0.72, 7, radius * 0.66) });
  }
  return tag(layeredCutout(layers, palette.bush, { cross: true }), { layers: 3, radius: 0.32, base: 0.22 });
}
// 纸花簇：每朵花 = 后层叶片纸片 + 前层花瓣纸片（错位 0.06）+ 花心；朝向随机，任何角度都有花朵正对镜头。
function makeFlowerCluster(random) {
  const group = new THREE.Group();
  const count = 2 + Math.floor(random() * 2);
  for (let index = 0; index < count; index += 1) {
    const color = palette.flower[Math.floor(random() * palette.flower.length)];
    const height = 0.3 + random() * 0.14;
    const flower = new THREE.Group();
    const stem = paperBox(0.03, height, 0.03, palette.tree, { noEdges: true });
    stem.position.y = height / 2;
    flower.add(stem);
    const leaf = [[-0.16, -0.02], [0, -0.1], [0.16, -0.02], [0, 0.07]].map((p) => [p[0], p[1] + height * 0.55]);
    const head = layeredCutout([
      { points: leaf, color: shade(palette.tree, 0.06) },
      { points: starPoints(0.12, height, 5), color: shade(color, -0.06) },
      { points: hexPoints(0.045, height), color: palette.accent, emissive: palette.accent, emissiveIntensity: 0.35 },
    ], color, { offset: 0.06 });
    flower.add(head);
    flower.position.set((random() - 0.5) * 0.36, 0, (random() - 0.5) * 0.36);
    flower.rotation.y = random() * Math.PI * 2;
    group.add(flower);
  }
  group.add(makeGrassTuft(random, 0.7));
  return tag(group, { layers: 3, radius: 0.28, base: 0.18 });
}
function makeCloud(random) {
  const layers = [];
  for (let index = 0; index < 3; index += 1) {
    const radius = 0.34 - index * 0.06;
    layers.push({ points: blobPoints(random, radius, 0.5, 8, radius * 0.5), x: (index - 1) * 0.12 });
  }
  return tag(layeredCutout(layers, shade(palette.backdrop[2], -0.04), { offset: 0.08, edgeOpacity: 0.5 }), { layers: 3, radius: 0.4, base: 0 });
}
function makeSnowMound(random) {
  const radius = 0.24 + random() * 0.1;
  const layers = [
    { points: blobPoints(random, radius, 0.55, 7, radius * 0.4) },
    { points: blobPoints(random, radius * 0.8, 0.55, 7, radius * 0.3) },
  ];
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
  const group = new THREE.Group();
  const hull = layeredCutout([
    { points: [[-0.32, 0.06], [0.32, 0.06], [0.24, 0.24], [-0.24, 0.24]], color: palette.accent2 },
    { points: [[-0.27, 0.08], [0.27, 0.08], [0.2, 0.22], [-0.2, 0.22]], color: shade(palette.edge, -0.03) },
  ], palette.edge, { offset: 0.07 });
  const sail = paperSheet([[0, 0.24], [0.02, 0.66], [0.26, 0.28]], palette.accent, { edgeOpacity: 0.8 });
  sail.position.z = 0.02;
  group.add(hull, sail);
  group.rotation.y = random() * Math.PI * 2;
  return tag(group, { layers: 3, radius: 0.34, base: 0.3 });
}
function makeSeaBird(random) {
  const group = layeredCutout([
    { points: [[-0.24, 0.12], [-0.02, 0.02], [0.02, 0.02], [0.24, 0.12], [0.22, 0.17], [0.02, 0.08], [-0.02, 0.08], [-0.22, 0.17]], color: palette.bird },
    { points: [[-0.05, 0.05], [0.07, 0.03], [0.06, 0.09], [-0.04, 0.1]], color: palette.accent2 },
  ], palette.bird, { offset: 0.05, edgeColor: palette.accent2, edgeOpacity: 0.5 });
  group.rotation.y = (random() - 0.5) * 0.6;
  return tag(group, { layers: 2, radius: 0.24, base: 0 });
}
// 灯笼：后层深色纸环 + 前层自发光纸片（错位 0.06），十字两组，从任何朝向都亮。
function makeLantern(size, cross) {
  return layeredCutout([
    { points: hexPoints(size * 1.25), color: shade(palette.accent, -0.28) },
    { points: hexPoints(size), color: palette.accent, emissive: palette.accent, emissiveIntensity: 1.3 },
  ], palette.accent, { offset: 0.06, cross, edgeColor: 0xfff1d0, edgeOpacity: 0.8 });
}
function makeLanternPost(random, small) {
  const group = new THREE.Group();
  const height = small ? 0.62 : 1.5;
  const post = paperBox(0.07, height, 0.07, palette.cover, { edgeOpacity: 0.4 });
  post.position.y = height / 2;
  group.add(post);
  const arm = paperBox(0.36, 0.05, 0.05, palette.cover, { noEdges: true });
  arm.position.set(0.15, height - 0.03, 0);
  group.add(arm);
  const lantern = makeLantern(small ? 0.07 : 0.14, true);
  lantern.position.set(0.3, height - 0.18, 0);
  group.add(lantern);
  if (!small) group.userData.lanternAnchor = new THREE.Vector3(0.3, height - 0.14, 0);
  group.rotation.y = random() * Math.PI * 2;
  return tag(group, { layers: 2, radius: 0.36, base: 0.06 });
}
// 灯笼串：两根短杆之间一条纸绳，挂 4 只小灯笼。
function makeLanternGarland(random) {
  const group = new THREE.Group();
  const width = 1.0;
  for (const sideSign of [-1, 1]) {
    const post = paperBox(0.05, 0.62, 0.05, palette.cover, { edgeOpacity: 0.4 });
    post.position.set(sideSign * width / 2, 0.31, 0);
    group.add(post);
  }
  const string = paperBox(width, 0.012, 0.012, palette.edge, { noEdges: true });
  string.position.y = 0.6;
  group.add(string);
  for (let index = 0; index < 4; index += 1) {
    const lantern = makeLantern(0.055, false);
    lantern.position.set(-width / 2 + (index + 0.5) * (width / 4), 0.5 - Math.abs(index - 1.5) * 0.02, 0);
    group.add(lantern);
  }
  return tag(group, { layers: 2, radius: width / 2, base: 0.1 });
}
// 夜市屋影：纸盒屋身 + 两层屋顶纸片（上层更亮、错位 0.06）+ 琥珀窗。
function makeHouse(random) {
  const group = new THREE.Group();
  const w = 0.62; const d = 0.5; const wall = 0.78;
  const body = paperBox(w, wall, d, palette.tree, { edgeOpacity: 0.7 });
  body.position.y = wall / 2;
  group.add(body);
  const roofLower = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.3, 4), paperMaterial(palette.accent2, { map: null }));
  roofLower.rotation.y = Math.PI / 4; roofLower.position.y = wall + 0.15; roofLower.castShadow = true; addEdges(roofLower, palette.edge, 0.7);
  const roofUpper = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.3, 4), paperMaterial(shade(palette.accent2, LAYER_LIFT), { map: null }));
  roofUpper.rotation.y = Math.PI / 4; roofUpper.position.y = wall + 0.21; roofUpper.castShadow = true; addEdges(roofUpper, palette.edge, 0.7);
  const ridge = paperBox(0.06, 0.16, 0.06, palette.cover, { noEdges: true });
  ridge.position.y = wall + 0.42;
  group.add(roofLower, roofUpper, ridge);
  for (let face = 0; face < 4; face += 1) {
    for (let index = 0; index < 2; index += 1) {
      const pane = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.02), new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 1.1, flatShading: true }));
      const offset = (index - 0.5) * 0.26;
      const y = 0.26 + (random() < 0.5 ? 0.24 : 0);
      if (face === 0) pane.position.set(offset, y, d / 2 + 0.01);
      else if (face === 1) pane.position.set(-offset, y, -d / 2 - 0.01);
      else { pane.position.set(face === 2 ? w / 2 + 0.01 : -w / 2 - 0.01, y, offset); pane.rotation.y = Math.PI / 2; }
      group.add(pane);
    }
  }
  group.rotation.y = Math.floor(random() * 4) * Math.PI / 2;
  return tag(group, { layers: 2, radius: 0.45, base: 0.4 });
}
function makeMarketStall(random) {
  const group = new THREE.Group();
  const body = paperBox(0.56, 0.3, 0.44, palette.bush, { edgeOpacity: 0.7 });
  body.position.y = 0.15;
  group.add(body);
  const counter = paperBox(0.62, 0.05, 0.5, palette.cover, { edgeOpacity: 0.5 });
  counter.position.y = 0.32;
  group.add(counter);
  for (const sideSign of [-1, 1]) {
    const pole = paperBox(0.04, 0.4, 0.04, palette.cover, { noEdges: true });
    pole.position.set(sideSign * 0.26, 0.5, -0.18);
    group.add(pole);
  }
  const awning = layeredCutout([
    { points: [[-0.36, 0.02], [0.36, 0.02], [0.36, 0.14], [-0.36, 0.14]], color: palette.accent2 },
    { points: [[-0.3, 0.04], [0.3, 0.04], [0.3, 0.16], [-0.3, 0.16]], color: shade(palette.accent2, LAYER_LIFT) },
  ], palette.accent2, { offset: 0.06 });
  awning.rotation.x = -0.9;
  awning.position.set(0, 0.62, -0.02);
  group.add(awning);
  const pane = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.02), new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 1.1, flatShading: true }));
  pane.position.set(0, 0.16, 0.23);
  group.add(pane);
  const goods = layeredCutout([{ points: hexPoints(0.06, 0.06), color: palette.flower[0] }, { points: hexPoints(0.045, 0.06), color: palette.flower[1] }], palette.flower[0], { offset: 0.05 });
  goods.position.set(0.14, 0.34, 0.08);
  group.add(goods);
  group.rotation.y = random() * Math.PI * 2;
  return tag(group, { layers: 2, radius: 0.36, base: 0.32 });
}
function makeMoon() {
  const outer = []; const inner = [];
  for (let index = 0; index <= 10; index += 1) {
    const angle = -Math.PI / 2 + (index / 10) * Math.PI;
    outer.push([Math.cos(angle) * 0.34, Math.sin(angle) * 0.34]);
    inner.push([Math.cos(angle) * 0.26 - 0.12, Math.sin(angle) * 0.26]);
  }
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
  return layeredCutout([
    { points: blobPoints(random, radius, 0.5, 7, radius * 0.32) },
    { points: blobPoints(random, radius * 0.82, 0.5, 7, radius * 0.24) },
  ], color, { cross: true, offset: 0.08 });
}
// 灯塔：两层礁石纸片 + 白塔、两道珊瑚色纸环、灯室与尖顶。
function makeLighthouse(random) {
  const group = new THREE.Group();
  group.add(makeRockBase(random, 0.34, palette.sideShade));
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.25, 7), paperMaterial(palette.edge, { map: null }));
  tower.position.y = 0.72; tower.castShadow = true; addEdges(tower, palette.accent2, 0.6);
  group.add(tower);
  [0.45, 0.85].forEach((y, index) => {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.235 - index * 0.03, 0.245 - index * 0.03, 0.14, 7), paperMaterial(index ? shade(palette.accent, LAYER_LIFT) : palette.accent, { map: null }));
    band.position.y = y; addEdges(band, palette.edge, 0.7); group.add(band);
  });
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.06, 7), paperMaterial(palette.accent2, { map: null }));
  gallery.position.y = 1.36; addEdges(gallery, palette.edge, 0.7); group.add(gallery);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.22, 6), new THREE.MeshStandardMaterial({ color: palette.accent, emissive: 0xffe6a8, emissiveIntensity: 1.4, flatShading: true }));
  lamp.position.y = 1.5; group.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.24, 6), paperMaterial(palette.accent2, { map: null }));
  cap.position.y = 1.73; cap.castShadow = true; addEdges(cap, palette.edge, 0.7); group.add(cap);
  const hut = paperBox(0.32, 0.26, 0.26, palette.edge, { edgeOpacity: 0.7 });
  hut.position.set(0.34, 0.26, 0.1); group.add(hut);
  const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.16, 4), paperMaterial(palette.accent, { map: null }));
  hutRoof.rotation.y = Math.PI / 4; hutRoof.position.set(0.34, 0.47, 0.1); hutRoof.castShadow = true; addEdges(hutRoof, palette.edge, 0.7); group.add(hutRoof);
  group.rotation.y = random() * Math.PI * 2;
  return tag(group, { layers: 2, radius: 0.4, base: 0.34 });
}
// 天文台：两层雪岩纸片 + 圆鼓、半球顶、观测缝与黄铜望远镜。
function makeObservatory(random) {
  const group = new THREE.Group();
  group.add(makeRockBase(random, 0.36, palette.treeLight));
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.52, 10), paperMaterial(palette.edge, { map: null }));
  drum.position.y = 0.42; drum.castShadow = true; addEdges(drum, palette.accent2, 0.6); group.add(drum);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 10), paperMaterial(palette.accent2, { map: null }));
  ring.position.y = 0.7; addEdges(ring, palette.edge, 0.6); group.add(ring);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), paperMaterial(palette.edge, { map: null }));
  dome.position.y = 0.72; dome.castShadow = true; addEdges(dome, palette.accent2, 0.6, true); group.add(dome);
  const slit = paperBox(0.1, 0.3, 0.44, palette.accent2, { noEdges: true });
  slit.position.set(0, 0.9, 0.06); slit.rotation.z = 0.15; group.add(slit);
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 0.56, 6), paperMaterial(palette.accent, { map: null }));
  scope.position.set(0.1, 1.08, 0.12); scope.rotation.z = -0.85; scope.castShadow = true; group.add(scope);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.02), new THREE.MeshStandardMaterial({ color: palette.accent2, emissive: palette.accent, emissiveIntensity: 0.6, flatShading: true }));
  door.position.set(0, 0.28, 0.375); group.add(door);
  group.rotation.y = random() * Math.PI * 2;
  return tag(group, { layers: 2, radius: 0.42, base: 0.36 });
}
function makeTelescope(random) {
  const group = new THREE.Group();
  const mound = layeredCutout([
    { points: blobPoints(random, 0.22, 0.4, 7, 0.08) },
    { points: blobPoints(random, 0.17, 0.4, 7, 0.06) },
  ], palette.treeLight, { cross: true, edgeColor: palette.accent2, edgeOpacity: 0.4 });
  group.add(mound);
  for (let index = 0; index < 3; index += 1) {
    const leg = paperBox(0.045, 0.42, 0.045, palette.cover, { noEdges: true });
    const angle = index / 3 * Math.PI * 2;
    leg.position.set(Math.cos(angle) * 0.09, 0.21, Math.sin(angle) * 0.09);
    leg.rotation.set(Math.sin(angle) * 0.4, 0, -Math.cos(angle) * 0.4);
    group.add(leg);
  }
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.52, 6), paperMaterial(palette.accent, { map: null }));
  tube.position.set(0.08, 0.52, 0); tube.rotation.z = -0.9; tube.castShadow = true; addEdges(tube, palette.edge, 0.5);
  group.add(tube);
  group.rotation.y = random() * Math.PI * 2;
  return tag(group, { layers: 2, radius: 0.3, base: 0.2 });
}
// 远端纸山 / 屋影：两层错位纸片（前层更亮），立在书后方桌面上。
function makeBackdropPeak(random, height, color, width) {
  const peak = (w, h) => [[-w / 2, 0], [-w * 0.18, h * (0.55 + random() * 0.25)], [0, h], [w * 0.22, h * (0.5 + random() * 0.3)], [w / 2, 0]];
  return tag(layeredCutout([{ points: peak(width, height) }, { points: peak(width * 0.72, height * 0.72), x: width * 0.08 }], color, { offset: 0.09, depth: 0.05, edgeOpacity: 0.7 }), { layers: 2, radius: width / 2, base: 0 });
}
function makeBackdropHouse(random, height, color, width) {
  const house = (w, h) => [[-w / 2, 0], [w / 2, 0], [w / 2, h * 0.62], [0, h], [-w / 2, h * 0.62]];
  const group = layeredCutout([{ points: house(width, height) }, { points: house(width * 0.6, height * 0.78), x: width * 0.12 }], color, { offset: 0.09, depth: 0.05, edgeOpacity: 0.7 });
  const panes = 1 + Math.floor(random() * 3);
  for (let index = 0; index < panes; index += 1) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.15, 0.03), new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 1.2, flatShading: true }));
    pane.position.set((index - (panes - 1) / 2) * 0.22 + width * 0.12, height * (0.2 + random() * 0.3), 0.09);
    group.add(pane);
  }
  return tag(group, { layers: 2, radius: width / 2, base: 0 });
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
function measureDecor(item) {
  const box = new THREE.Box3().setFromObject(item);
  return { height: box.max.y - Math.min(0, box.min.y), radius: Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.z), Math.abs(box.max.z)) };
}
// 生成一个构件并缩放到目标高度；返回 { group, height, radius, base, layers }。
function spawnDecor(kind, random, targetHeight) {
  const entry = decorCatalog[kind];
  const group = entry.build(random);
  const natural = measureDecor(group);
  const scale = targetHeight / Math.max(0.01, natural.height);
  group.scale.setScalar(scale);
  const measured = measureDecor(group);
  return { group, kind, height: measured.height, radius: measured.radius, base: (group.userData.base ?? 0.2) * scale, layers: group.userData.layers ?? 2, tree: Boolean(group.userData.tree) };
}
function placeDecor(spawned, x, z, main) {
  spawned.group.position.copy(cellWorld(x, z, -0.1));
  decorGroup.add(spawned.group);
  decorItems.push({ kind: spawned.kind, x, z, height: spawned.height, radius: spawned.radius, base: spawned.base, layers: spawned.layers, tree: spawned.tree, main, clearance: nearestCellDistance(x, z) - spawned.base, occludes: decorOccludes(x, z, spawned.radius, spawned.height) });
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
      if (reach > margin + 0.1 && !(force && extra === 0)) continue;
      const px = point.x + out.x * depth; const pz = point.z + out.z * depth;
      if (!decorOccludes(px, pz, spawned.radius, spawned.height)) { placeDecor(spawned, px, pz, true); return true; }
      if (!fallback || height < fallback.spawned.height) fallback = { spawned, px, pz };
    }
  }
  if (force && fallback) { placeDecor(fallback.spawned, fallback.px, fallback.pz, true); return true; }
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
    if (decorCatalog[kind].align) spawned.group.rotation.y = Math.atan2(slot.out.x, slot.out.z);
    placeDecor(spawned, slot.point.x + slot.out.x * depth, slot.point.z + slot.out.z * depth, false);
  });
  // 3) 远端背景：两排纸山 / 屋影，立在书后方桌面上，不随书旋转；颜色取章节 backdrop 三档，最远一排再叠 15% sky 提亮。
  const spread = Math.max(gridWidth, gridDepth) + 2 * margin;
  const backdropCount = Math.round(4 + spread * 0.6);
  // 点光预算：夜市 5 盏灯笼杆 + 出口门 1 盏 = 6 个点光；其余章节最多 2 盏。低性能档不加点光，只靠自发光。
  let lights = 0;
  if (performanceTier !== "low") decorGroup.children.forEach((child) => {
    if (!child.userData.lanternAnchor || lanternLightBudget <= 0) return;
    lanternLightBudget -= 1; lights += 1;
    const light = new THREE.PointLight(palette.accent, 2.4, 3.8, 2);
    light.position.copy(child.userData.lanternAnchor);
    child.add(light);
    child.userData.light = light;
  });
  for (let index = 0; index < backdropCount; index += 1) {
    const rowBack = index % 2 === 0;
    const along = (index + 0.5) / backdropCount + (random() - 0.5) * 0.06;
    const tone = rowBack ? palette.backdrop[index % 4 === 0 ? 1 : 0] : palette.backdrop[2];
    const color = rowBack ? mixColor(tone, palette.sky, 0.15) : new THREE.Color(tone);
    const height = rowBack ? 1.7 + random() * 0.8 : 1.0 + random() * 0.45;
    const width = rowBack ? 1.7 + random() * 1.1 : 1.1 + random() * 0.7;
    const piece = palette.lanterns ? makeBackdropHouse(random, height, color, width * 0.7) : makeBackdropPeak(random, height, color, width);
    piece.position.set((along - 0.5) * spread, 0, rowBack ? -0.55 : 0);
    backdropGroup.add(piece);
    if (blueprint.chapter <= 2 && rowBack && random() < 0.6) {
      const cloud = makeCloud(random);
      cloud.position.set(piece.position.x + 0.5, height + 0.25 + random() * 0.3, -0.3);
      backdropGroup.add(cloud);
    }
  }
  if (blueprint.chapter === 2) {
    for (let index = 0; index < 2; index += 1) {
      const bird = makeSeaBird(random);
      bird.position.set((index - 0.5) * spread * 0.5 + (random() - 0.5) * 0.8, 2.4 + random() * 0.4, 0.2);
      backdropGroup.add(bird);
    }
  } else if (blueprint.chapter === 3) {
    const moon = makeMoon();
    moon.position.set(spread * 0.28, 2.9, -0.8);
    backdropGroup.add(moon);
    for (let index = 0; index < 5; index += 1) {
      const star = makeSkyStar(0.05);
      star.position.set((random() - 0.5) * spread, 2.3 + random() * 0.9, -0.7);
      backdropGroup.add(star);
    }
  } else if (blueprint.chapter === 4) {
    for (let index = 0; index < 9; index += 1) {
      const star = makeSkyStar(0.045 + random() * 0.03);
      star.position.set((random() - 0.5) * spread, 2.2 + random() * 1.0, -0.7);
      backdropGroup.add(star);
    }
  }
  backdropGroup.position.y = -0.62;
  backdropTargetZ = backdropZFor(model ? model.o : 0);
  backdropGroup.position.z = backdropTargetZ;
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
function createLinkView(link) {
  const group = new THREE.Group();
  const dx = Math.sign(link.to.x - link.from.x);
  const dz = Math.sign(link.to.z - link.from.z);
  const direction = dx === 1 ? "E" : dx === -1 ? "W" : dz === 1 ? "S" : "N";
  const span = Math.abs(link.to.x - link.from.x) + Math.abs(link.to.z - link.from.z);
  const fromTop = cellTop(link.from.x, link.from.z);
  const toTop = cellTop(link.to.x, link.to.z);
  // 台阶从低格折向高格；桥从 from 折向 to。
  const lowFirst = link.kind === "stair" && toTop < fromTop;
  const base = lowFirst ? link.to : link.from;
  const baseTop = lowFirst ? toTop : fromTop;
  const dir = lowFirst ? { x: -dx, z: -dz } : { x: dx, z: dz };
  const hinge = cellWorld(base.x, base.z, baseTop - 0.1).add(new THREE.Vector3(dir.x * 0.49, 0, dir.z * 0.49));
  group.position.copy(hinge);
  group.rotation.y = Math.atan2(dir.x, dir.z);
  const arm = new THREE.Group();
  group.add(arm);
  if (link.kind === "bridge") {
    const length = span - 0.98;
    const plank = paperBox(0.62, 0.07, length, palette.accent2, { edgeColor: palette.edge, edgeOpacity: 0.9 });
    plank.position.set(0, 0.035, length / 2);
    arm.add(plank);
    for (let slat = 1; slat < Math.round(length / 0.32); slat += 1) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.075, 0.02), new THREE.MeshBasicMaterial({ color: palette.edge, transparent: true, opacity: 0.7 }));
      line.position.set(0, 0.04, slat * 0.32);
      arm.add(line);
    }
    for (const sideSign of [-1, 1]) {
      const rail = paperBox(0.05, 0.22, length, palette.side, { noEdges: true });
      rail.position.set(sideSign * 0.3, 0.15, length / 2);
      arm.add(rail);
    }
  } else {
    const rise = Math.abs(toTop - fromTop);
    const steps = 4;
    for (let index = 0; index < steps; index += 1) {
      const stepHeight = rise / steps;
      const stepMesh = paperBox(0.62, stepHeight * (index + 1), 0.98 / steps, palette.side, { edgeColor: palette.edge });
      stepMesh.position.set(0, (stepHeight * (index + 1)) / 2, 0.98 / steps * (index + 0.5));
      arm.add(stepMesh);
    }
  }
  const view = { link, group, arm, open: false, fold: 1, glow: null };
  if (link.timer || link.plate || typeof link.step === "number") {
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 0.2, roughness: 0.6, flatShading: true }));
    lantern.position.set(0.42, 0.55, 0.1);
    group.add(lantern);
    view.glow = lantern;
  }
  linkViews.push(view);
  return group;
}

function createPlateView(plate) {
  const group = new THREE.Group();
  const top = cellTop(plate.at.x, plate.at.z);
  group.position.copy(cellWorld(plate.at.x, plate.at.z, top - 0.1));
  const color = plate.kind === "timer" ? palette.accent : plate.kind === "toggle" ? palette.accent2 : palette.accent;
  const pad = paperBox(0.66, 0.07, 0.66, color, { edgeColor: palette.edge, emissive: color, emissiveIntensity: 0.05 });
  pad.position.y = 0.035;
  group.add(pad);
  if (plate.kind === "order") {
    for (let index = 0; index < (plate.order || 1); index += 1) {
      const dot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.1), new THREE.MeshStandardMaterial({ color: palette.edge, roughness: 0.9, flatShading: true }));
      dot.position.set(-0.18 + index * 0.18, 0.1, 0);
      group.add(dot);
    }
  }
  if (plate.kind === "timer") {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 6, 20), new THREE.MeshStandardMaterial({ color: palette.edge, emissive: palette.accent, emissiveIntensity: 0.3, flatShading: true }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.09;
    group.add(ring);
    group.userData.ring = ring;
  }
  if (plate.kind === "toggle") {
    const knob = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 4), new THREE.MeshStandardMaterial({ color: palette.edge, flatShading: true }));
    knob.position.y = 0.15;
    group.add(knob);
    group.userData.knob = knob;
  }
  plateViews.push({ plate, group, pad });
  return group;
}

function createStarView(star, index) {
  const group = new THREE.Group();
  const top = cellTop(star.x, star.z);
  group.position.copy(cellWorld(star.x, star.z, top - 0.1));
  const pocket = new THREE.Group();
  // 纸口袋：三面墙加一个顶，开口朝向“在可见角度时正对镜头”的方向。
  const openDirection = rules.DIRECTION_ORDER[(2 - star.angles[0] + 4) % 4];
  pocket.rotation.y = directionAngle(openDirection);
  const wallMaterial = paperMaterial(palette.side);
  const back = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.86, 0.05), wallMaterial);
  back.position.set(0, 0.43, -0.44);
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.86, 0.9), wallMaterial);
  left.position.set(-0.44, 0.43, 0);
  const right = left.clone(); right.position.x = 0.44;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.06, 0.94), paperMaterial(palette.top[0]));
  roof.position.set(0, 0.88, 0);
  [back, left, right, roof].forEach((wall) => { wall.castShadow = true; wall.receiveShadow = true; addEdges(wall, palette.edge, 0.95, true); pocket.add(wall); });
  const cutout = new THREE.Mesh(new THREE.CircleGeometry(0.16, 6), new THREE.MeshBasicMaterial({ color: palette.cover, side: THREE.DoubleSide }));
  cutout.position.set(0, 0.5, -0.47);
  pocket.add(cutout);
  if (star.angles.length === 4) pocket.visible = false;
  group.add(pocket);
  const starMesh = new THREE.Mesh(starGeometry(0.3, 0.1), new THREE.MeshStandardMaterial({ color: palette.star, emissive: palette.star, emissiveIntensity: 1.1, roughness: 0.45, flatShading: true }));
  starMesh.position.set(0, 0.46, 0);
  starMesh.castShadow = true;
  addEdges(starMesh, 0xffffff, 1, true);
  // 发光边：一枚略大的半透明纸星贴在后面。
  const halo = new THREE.Mesh(starGeometry(0.38, 0.02), new THREE.MeshBasicMaterial({ color: palette.star, transparent: true, opacity: 0.32, depthWrite: false }));
  halo.position.set(0, 0, -0.04);
  starMesh.add(halo);
  const glow = new THREE.PointLight(palette.star, 0, 2.2, 2);
  glow.position.set(0, 0.6, 0.25);
  group.add(starMesh, glow);
  starViews.push({ star, index, group, starMesh, glow, pocket, collected: false, pop: 0 });
  return group;
}

function createFlagView(point, index) {
  const group = new THREE.Group();
  group.position.copy(cellWorld(point.x, point.z, cellTop(point.x, point.z) - 0.1));
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.25, 5), new THREE.MeshStandardMaterial({ color: palette.cover, roughness: 0.8, flatShading: true }));
  pole.position.set(0.3, 0.62, 0.3);
  pole.castShadow = true;
  const flagGeometry = new THREE.BufferGeometry();
  flagGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 0.56, -0.16, 0, 0, -0.36, 0], 3));
  flagGeometry.computeVertexNormals();
  const flagMaterial = new THREE.MeshStandardMaterial({ color: palette.accent2, side: THREE.DoubleSide, roughness: 0.85, flatShading: true, emissive: palette.accent2, emissiveIntensity: 0.15 });
  const flag = new THREE.Mesh(flagGeometry, flagMaterial);
  flag.position.set(0.32, 1.22, 0.3);
  flag.castShadow = true;
  addEdges(flag, palette.edge, 0.9);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 0.08, 6), paperMaterial(palette.edge, { map: null }));
  base.position.set(0.3, 0.04, 0.3);
  addEdges(base, palette.accent2, 0.6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 5, 18), new THREE.MeshStandardMaterial({ color: palette.accent2, emissive: palette.accent2, emissiveIntensity: 0.3, flatShading: true }));
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 0.04, 0);
  group.add(pole, flag, base, ring);
  flagViews.push({ index, group, flag, flagMaterial, ring, reached: false });
  return group;
}

function createExitView(point) {
  // 出口门：每章一个标志物——草甸灯笼门、海岸小灯塔、夜市灯笼串、雪原天文台圆顶。
  const group = new THREE.Group();
  group.position.copy(cellWorld(point.x, point.z, cellTop(point.x, point.z) - 0.1));
  const postMaterial = paperMaterial(palette.cover, { map: null });
  for (const sideSign of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.14), postMaterial);
    post.position.set(sideSign * 0.4, 0.65, 0);
    post.castShadow = true;
    addEdges(post, palette.edge, 0.6);
    group.add(post);
    const foot = paperBox(0.26, 0.1, 0.26, palette.side, { edgeColor: palette.edge });
    foot.position.set(sideSign * 0.4, 0.05, 0);
    group.add(foot);
  }
  const lintel = paperBox(1.24, 0.14, 0.22, palette.cover, { edgeColor: palette.edge, edgeOpacity: 0.6 });
  lintel.position.set(0, 1.34, 0);
  group.add(lintel);
  const lanterns = [];
  const hangLantern = (x, y, size) => {
    const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), new THREE.MeshStandardMaterial({ color: palette.accent, emissive: palette.accent, emissiveIntensity: 1.3, flatShading: true }));
    lantern.position.set(x, y, 0.16);
    addEdges(lantern, 0xfff3d6, 0.9);
    group.add(lantern);
    lanterns.push(lantern);
  };
  if (blueprint.chapter === 1) {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.34, 4), paperMaterial(palette.accent2, { map: null }));
    roof.rotation.y = Math.PI / 4; roof.position.set(0, 1.58, 0); roof.castShadow = true; addEdges(roof, palette.edge, 0.7, true); group.add(roof);
    hangLantern(-0.4, 1.1, 0.13); hangLantern(0.4, 1.1, 0.13);
  } else if (blueprint.chapter === 2) {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.85, 0.3, 4), paperMaterial(palette.accent, { map: null }));
    roof.rotation.y = Math.PI / 4; roof.position.set(0, 1.56, 0); roof.castShadow = true; addEdges(roof, palette.edge, 0.7, true); group.add(roof);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 1.5, 7), paperMaterial(palette.edge, { map: null }));
    tower.position.set(0.68, 0.75, -0.42); tower.castShadow = true; addEdges(tower, palette.accent2, 0.6); group.add(tower);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.22, 7), paperMaterial(palette.accent, { map: null }));
    band.position.set(0.68, 0.75, -0.42); group.add(band);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.24, 6), new THREE.MeshStandardMaterial({ color: palette.accent, emissive: 0xffe6a8, emissiveIntensity: 1.4, flatShading: true }));
    lamp.position.set(0.68, 1.62, -0.42); group.add(lamp); lanterns.push(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 6), paperMaterial(palette.accent2, { map: null }));
    cap.position.set(0.68, 1.84, -0.42); cap.castShadow = true; group.add(cap);
    hangLantern(0, 1.1, 0.12);
  } else if (blueprint.chapter === 3) {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.38, 4), paperMaterial(palette.accent2, { map: null }));
    roof.rotation.y = Math.PI / 4; roof.position.set(0, 1.62, 0); roof.castShadow = true; addEdges(roof, palette.edge, 0.7, true); group.add(roof);
    for (let index = 0; index < 5; index += 1) hangLantern(-0.5 + index * 0.25, 1.16 - Math.abs(index - 2) * 0.05, 0.1);
    const string = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.015, 0.015), paperMaterial(palette.edge, { map: null }));
    string.position.set(0, 1.25, 0.16); group.add(string);
  } else {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.24, 10), paperMaterial(palette.edge, { map: null }));
    drum.position.set(0, 1.53, 0); drum.castShadow = true; addEdges(drum, palette.accent2, 0.6); group.add(drum);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), paperMaterial(palette.edge, { map: null }));
    dome.position.set(0, 1.65, 0); dome.castShadow = true; addEdges(dome, palette.accent2, 0.6, true); group.add(dome);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.36, 0.5), paperMaterial(palette.accent2, { map: null }));
    slit.position.set(0, 1.86, 0); slit.rotation.z = 0.2; group.add(slit);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.6, 6), paperMaterial(palette.accent, { map: null }));
    scope.position.set(0.12, 2.05, 0); scope.rotation.z = -0.9; scope.castShadow = true; group.add(scope);
    hangLantern(-0.4, 1.1, 0.11); hangLantern(0.4, 1.1, 0.11);
  }
  const light = new THREE.PointLight(palette.accent, palette.lanterns ? 3 : 2, 4, 2);
  light.position.set(0, 1.15, 0.4);
  group.add(light);
  group.userData.lanterns = lanterns;
  group.userData.light = light;
  return group;
}
function createPlayerView() {
  const group = new THREE.Group();
  const puppet = new THREE.Group();
  group.add(puppet);
  const body = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), paperMaterial(0xf7efdd, { map: null }));
  body.scale.set(1, 1.15, 1);
  body.position.y = 0.24;
  body.castShadow = true;
  addEdges(body, 0xffffff, 0.5);
  const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.14, 0), paperMaterial(0xf7efdd, { map: null }));
  head.position.y = 0.55;
  head.castShadow = true;
  const hat = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.14, 6), paperMaterial(0x2f3d5c, { map: null }));
  hat.position.y = 0.7;
  hat.castShadow = true;
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.03, 8), paperMaterial(0x2f3d5c, { map: null }));
  brim.position.y = 0.63;
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.1), paperMaterial(0xd98265, { map: null }));
  backpack.position.set(0, 0.3, -0.18);
  backpack.castShadow = true;
  addEdges(backpack, 0xfff1dc, 0.7);
  const facing = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 3), new THREE.MeshBasicMaterial({ color: palette.accent, transparent: true, opacity: 0.85 }));
  facing.rotation.x = Math.PI / 2;
  facing.position.set(0, 0.02, 0.36);
  puppet.add(body, head, hat, brim, backpack, facing);
  group.userData.puppet = puppet;
  group.userData.facing = facing;
  return group;
}

function createHazardView(hazard) {
  const group = new THREE.Group();
  if (hazard.kind === "wave") {
    for (let index = -1; index <= 1; index += 1) {
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.34, 3), paperMaterial(palette.hazard, { map: null, emissive: palette.hazard, emissiveIntensity: 0.12 }));
      crest.position.set(index * 0.27, 0.17, (index % 2) * 0.08);
      crest.rotation.y = index * 0.7;
      crest.castShadow = true;
      addEdges(crest, palette.edge, 0.9);
      group.add(crest);
    }
    const foam = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.5), paperMaterial(palette.edge, { map: null }));
    foam.position.y = 0.03;
    group.add(foam);
  } else {
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 3), paperMaterial(palette.bird, { map: null }));
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    addEdges(body, palette.cover, 0.6);
    const wingGeometry = new THREE.BufferGeometry();
    wingGeometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, -0.1, 0.42, 0.06, 0.05, 0, 0, 0.16], 3));
    wingGeometry.computeVertexNormals();
    const wingMaterial = new THREE.MeshStandardMaterial({ color: palette.bird, side: THREE.DoubleSide, flatShading: true, roughness: 0.9 });
    const leftWing = new THREE.Mesh(wingGeometry, wingMaterial); leftWing.castShadow = true;
    const rightWing = new THREE.Mesh(wingGeometry, wingMaterial); rightWing.scale.x = -1; rightWing.castShadow = true;
    group.add(body, leftWing, rightWing);
    group.userData.wings = [leftWing, rightWing];
  }
  const view = { hazard, group, from: null, to: null };
  hazardViews.push(view);
  return group;
}

function hazardWorld(hazard, t) {
  const cell = rules.hazardCell(hazard, t);
  const top = rules.solid(blueprint, cell.x, cell.z) ? cellTop(cell.x, cell.z) : 0;
  return cellWorld(cell.x, cell.z, top - 0.1 + (hazard.kind === "bird" ? 0.95 : 0.02));
}

function syncHazards(immediate) {
  hazardViews.forEach((view) => {
    const target = hazardWorld(view.hazard, model.t);
    if (immediate || !view.to) { view.from = target.clone(); view.to = target.clone(); view.group.position.copy(target); }
    else { view.from = view.to; view.to = target; }
    const nextCell = rules.hazardCell(view.hazard, model.t + Math.max(1, view.hazard.every));
    const currentCell = rules.hazardCell(view.hazard, model.t);
    if (nextCell.x !== currentCell.x || nextCell.z !== currentCell.z) view.group.rotation.y = Math.atan2(nextCell.x - currentCell.x, nextCell.z - currentCell.z);
  });
}

function syncLinks() {
  linkViews.forEach((view) => { view.open = rules.linkOpen(view.link, model); });
}
function syncStars() {
  starViews.forEach((view) => {
    const visible = view.star.angles.includes(model.o);
    view.collected = model.stars[view.index];
    view.starMesh.visible = visible && !view.collected;
    view.glow.intensity = view.starMesh.visible ? 1.6 : 0;
  });
  starCount.querySelectorAll("i").forEach((dot, index) => { dot.classList.toggle("is-lit", Boolean(model.stars[index])); });
  starCount.setAttribute("aria-label", "折纸星 " + model.stars.filter(Boolean).length + " / 3");
}
function syncPlates() {
  plateViews.forEach((view) => {
    const plate = view.plate;
    let active = false;
    if (plate.kind === "toggle") active = Boolean(model.toggles[plate.id]);
    if (plate.kind === "order") active = model.progress >= (plate.order || 1);
    if (plate.kind === "timer") active = (model.timers[plate.id] || 0) > 0;
    view.pad.material.emissiveIntensity = active ? 0.55 : 0.05;
    view.pad.position.y = active ? 0.02 : 0.035;
    if (view.group.userData.knob) view.group.userData.knob.rotation.z = active ? Math.PI : 0;
    if (view.group.userData.ring) { const fraction = active ? (model.timers[plate.id] || 0) / Math.max(1, plate.duration || 6) : 1; view.group.userData.ring.scale.setScalar(0.4 + fraction * 0.6); }
  });
}
function syncFlags() {
  flagViews.forEach((view) => {
    const reached = model.checkpoint >= view.index;
    if (reached !== view.reached) { view.reached = reached; view.flagMaterial.color.setHex(reached ? palette.star : palette.accent2); view.flagMaterial.emissive.setHex(reached ? palette.star : palette.accent2); view.flagMaterial.emissiveIntensity = reached ? 0.9 : 0.15; view.ring.material.color.setHex(reached ? palette.star : palette.accent2); view.ring.material.emissive.setHex(reached ? palette.star : palette.accent2); view.ring.material.emissiveIntensity = reached ? 1 : 0.3; }
  });
}
function syncOrientation() {
  state.orientation = model.o;
  orientationDial.style.transform = "rotate(" + (model.o * 90) + "deg)";
  orientationDial.setAttribute("aria-label", "书本朝向 " + (model.o * 90) + " 度");
}

const playerAnim = { from: null, to: null, progress: 1, kind: "move", falling: false };
function playerWorld() {
  const top = cellTop(model.x, model.z);
  return cellWorld(model.x, model.z, top - 0.1);
}
function placePlayer(immediate) {
  const target = playerWorld();
  if (immediate || !playerAnim.to) { playerAnim.from = target.clone(); playerAnim.to = target.clone(); playerAnim.progress = 1; playerView.position.copy(target); }
  else { playerAnim.from = playerView.position.clone(); playerAnim.to = target; playerAnim.progress = 0; }
  playerView.userData.puppet.rotation.y = directionAngle(model.facing);
}

let rotationTarget = 0;
function syncRotation(immediate) {
  rotationTarget = -model.o * Math.PI / 2;
  backdropTargetZ = backdropZFor(model.o);
  if (immediate || reducedMotion) { book.rotation.y = rotationTarget; backdropGroup.position.z = backdropTargetZ; }
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 1400);
}

const sounds = {
  music: new Audio("./assets/music.wav"), ambient: new Audio("./assets/ambient.wav"),
  legal: new Audio("./assets/legal.wav"), illegal: new Audio("./assets/illegal.wav"), reward: new Audio("./assets/reward.wav"),
  hit: new Audio("./assets/hit.wav"), victory: new Audio("./assets/victory.wav"), defeat: new Audio("./assets/defeat.wav"), ui: new Audio("./assets/ui.wav"),
};
sounds.music.loop = true; sounds.ambient.loop = true; sounds.music.volume = 0.14; sounds.ambient.volume = 0.18;
const soundLastPlayed = new Map();
function playSound(name) {
  const sound = sounds[name];
  if (!sound) return;
  const now = performance.now();
  if (now - (soundLastPlayed.get(name) || 0) < 70) return;
  soundLastPlayed.set(name, now);
  sound.currentTime = 0;
  void sound.play().catch(() => {});
}
function startEnvironmentAudio() { if (document.hidden) return; void sounds.music.play().catch(() => {}); void sounds.ambient.play().catch(() => {}); }
function stopEnvironmentAudio() { sounds.music.pause(); sounds.ambient.pause(); }

function currentCampaignLevel() { return config.campaignLevels[campaignLevelIndex]; }
function saveCampaign() {
  try { safeStorage.setItem(config.campaignStorageKey, JSON.stringify({ schemaVersion: 2, current: campaignLevelIndex, maxUnlocked: campaignMaxUnlocked, mastery: campaignMastery })); } catch {}
}
function syncCampaignUi() {
  const levelInfo = currentCampaignLevel();
  campaignSelect.value = String(campaignLevelIndex);
  Array.from(campaignSelect.options).forEach((option, index) => { option.disabled = index > campaignMaxUnlocked; });
  campaignProgress.textContent = "第 " + levelInfo.number + " / " + config.campaignLevels.length + " 页 · " + levelInfo.tierLabel + " · " + levelInfo.ruleModifier;
  campaignHud.textContent = "第 " + levelInfo.number + " / " + config.campaignLevels.length + " 页 · " + levelInfo.tierLabel;
  levelTitle.textContent = levelInfo.ruleModifier;
  document.body.dataset.campaignCurrentLevel = String(levelInfo.number);
  let masteryCard = startCard.querySelector("[data-mastery-card]");
  if (!masteryCard) {
    masteryCard = document.createElement("section");
    masteryCard.dataset.masteryCard = "";
    masteryCard.className = "three-mastery-card";
    masteryCard.innerHTML = '<strong data-mastery-mission></strong><ul data-mastery-objectives></ul><small data-mastery-summary></small>';
    startCard.querySelector("#start")?.before(masteryCard);
  }
  const bp = config.blueprints[campaignLevelIndex];
  masteryCard.querySelector("[data-mastery-mission]").textContent = bp.intro;
  masteryCard.querySelector("[data-mastery-objectives]").replaceChildren(...levelInfo.masteryRules.map((rule) => { const item = document.createElement("li"); item.textContent = rule.label; return item; }));
  const earned = Math.max(0, Math.min(3, Number(campaignMastery[levelInfo.id]) || 0));
  const total = Object.values(campaignMastery).reduce((sum, value) => sum + Math.max(0, Math.min(3, Number(value) || 0)), 0);
  masteryCard.querySelector("[data-mastery-summary]").textContent = "本页 " + "★".repeat(earned) + "☆".repeat(3 - earned) + " · 全书折纸星 " + total + " / 60";
}
function loadCampaign() {
  try {
    const saved = JSON.parse(safeStorage.getItem(config.campaignStorageKey) || "null");
    campaignMaxUnlocked = Math.max(0, Math.min(config.campaignLevels.length - 1, Number(saved?.maxUnlocked) || 0));
    campaignLevelIndex = Math.max(0, Math.min(campaignMaxUnlocked, Number(saved?.current) || 0));
    campaignMastery = saved?.mastery && typeof saved.mastery === "object" ? saved.mastery : {};
  } catch {}
  syncCampaignUi();
}

function setGameSessionState(nextState) {
  const previousState = gameSessionState;
  gameSessionState = nextState;
  state.running = nextState === "playing";
  document.body.dataset.gameState = nextState;
  document.querySelectorAll("[data-key]").forEach((button) => { button.disabled = !state.running; });
  window.dispatchEvent(new CustomEvent("game:state-change", { detail: { previousState, state: nextState } }));
}
setGameSessionState("idle");

function togglePause() {
  if (gameSessionState === "playing") {
    setGameSessionState("paused");
    stopEnvironmentAudio();
    pauseButton.textContent = "继续";
    statusLabel.textContent = "已暂停";
    status.textContent = "书页停在这里；纸浪、纸鸟与限时门都停了。";
  } else if (gameSessionState === "paused") {
    setGameSessionState("playing");
    startEnvironmentAudio();
    previousFrame = performance.now();
    pauseButton.textContent = "暂停";
    statusLabel.textContent = "继续";
    status.textContent = "接着走。";
  }
}

let introClock = -1;
function loadLevel(index) {
  campaignLevelIndex = Math.max(0, Math.min(config.blueprints.length - 1, index));
  blueprint = config.blueprints[campaignLevelIndex];
  palette = palettes[blueprint.chapter];
  document.body.dataset.chapter = String(blueprint.chapter);
  gridWidth = rules.width(blueprint);
  gridDepth = rules.depth(blueprint);
  scene.background = new THREE.Color(palette.sky);
  scene.fog = new THREE.Fog(palette.fog, cameraDistance * 1.7, cameraDistance * 3.4);
  hemi.color.setHex(palette.hemiSky); hemi.groundColor.setHex(palette.hemiGround); hemi.intensity = palette.hemiIntensity;
  sun.color.setHex(palette.sunColor); sun.intensity = palette.sunIntensity;
  renderer.toneMappingExposure = palette.exposure || 1.08;
  desk.material.color.setHex(palette.desk);
  model = rules.createState(blueprint);
  queue.splice(0);
  buildBook();
  buildLevel();
  state.mistakes = 0; state.stars = 0; state.beats = 0; state.rotations = 0; state.blockedMoves = 0; state.finished = false; state.lastEvent = "";
  syncLinks(); syncStars(); syncPlates(); syncFlags(); syncOrientation(); syncRotation(true); syncHazards(true); placePlayer(true);
  linkViews.forEach((view) => { view.fold = view.open ? 0 : 1; view.arm.rotation.x = view.fold * -1.35; });
  fitCamera();
  introClock = reducedMotion ? -1 : 0;
  if (introClock === 0) { rightPage.rotation.z = Math.PI * 0.92; level.scale.set(1, 0.001, 1); }
}

function fitCamera() {
  cameraDirection.copy(camera.aspect < 1 ? PORTRAIT_DIRECTION : LANDSCAPE_DIRECTION);
  // 投影拟合：把关卡网格（含最高纸台）的 8 个角点都放进视锥，再按画幅留很小的边距；书页边缘允许出画。
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();
  const up = new THREE.Vector3().crossVectors(cameraDirection, right).normalize();
  const vertical = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
  const horizontal = vertical * camera.aspect;
  let maxHeight = 0.72;
  for (let z = 0; z < gridDepth; z += 1) for (let x = 0; x < gridWidth; x += 1) maxHeight = Math.max(maxHeight, cellTop(x, z));
  cameraTarget.set(0, maxHeight * 0.4, 0);
  let distance = 4;
  const portrait = camera.aspect < 1;
  // 以整本书（网格 + 书页留白）为拟合对象：竖屏书页应占画面高度 60% 以上。
  const halfW = gridWidth / 2 + bookMargin() * (portrait ? 0.75 : 1.0);
  const halfD = gridDepth / 2 + bookMargin() * (portrait ? 0.75 : 1.0);
  for (const [x, y, z] of [[-halfW, -0.45, -halfD], [halfW, -0.45, -halfD], [-halfW, -0.45, halfD], [halfW, -0.45, halfD], [-halfW, maxHeight + 0.9, -halfD], [halfW, maxHeight + 0.9, -halfD], [-halfW, maxHeight + 0.9, halfD], [halfW, maxHeight + 0.9, halfD]]) {
    const point = new THREE.Vector3(x, y, z).sub(cameraTarget);
    const rx = Math.abs(point.dot(right));
    const uy = Math.abs(point.dot(up));
    const fz = point.dot(cameraDirection);
    distance = Math.max(distance, fz + rx / horizontal, fz + uy / vertical);
  }
  cameraDistance = distance * (portrait ? 0.98 : 1.0);
  camera.position.copy(cameraTarget).addScaledVector(cameraDirection, cameraDistance);
  camera.lookAt(cameraTarget);
  if (scene.fog) { scene.fog.near = cameraDistance * 2.2; scene.fog.far = cameraDistance * 4.5; }
  const radius = Math.hypot(gridWidth, gridDepth) * 0.5 + 0.9;
  sun.position.set(-6, 12, 5).multiplyScalar(Math.max(1, radius / 6));
  const shadowExtent = radius + 1.5;
  sun.shadow.camera.left = -shadowExtent; sun.shadow.camera.right = shadowExtent; sun.shadow.camera.top = shadowExtent; sun.shadow.camera.bottom = -shadowExtent;
  sun.shadow.camera.far = radius * 6 + 20;
  sun.shadow.camera.updateProjectionMatrix();
}
function applyEvents(events, action) {
  events.forEach((event) => {
    if (event !== "wait") state.lastEvent = event;
    if (event.startsWith("blocked:")) state.blockedMoves += 1;
    if (event.startsWith("star:")) { const index = Number(event.split(":")[1]); state.stars = model.stars.filter(Boolean).length; burstConfetti(starViews[index]?.group.position); starViews[index].pop = 1; playSound("reward"); statusLabel.textContent = "折纸星"; status.textContent = "找到第 " + state.stars + " 颗折纸星。"; }
    else if (event.startsWith("checkpoint:")) { playSound("legal"); statusLabel.textContent = "检查点"; status.textContent = "旗子亮了。如果掉下去，会回到这里。"; showToast("检查点旗已点亮"); }
    else if (event === "fell") { state.mistakes += 1; playerAnim.falling = true; playSound("illegal"); statusLabel.textContent = "跳空了"; status.textContent = "只能越过一格空隙。已回到最近的旗子。"; showToast("回到检查点"); }
    else if (event === "hit") { state.mistakes += 1; playSound("hit"); statusLabel.textContent = "被碰到了"; status.textContent = "纸浪和纸鸟按节拍移动，等它们过去再走。已回到最近的旗子。"; showToast("回到检查点"); }
    else if (event.startsWith("plate:")) { playSound("ui"); statusLabel.textContent = "翻转板"; status.textContent = event.endsWith(":on") ? "木板翻开了，对应的桥接上。" : "木板翻回去了，对应的桥又折起来。"; }
    else if (event.startsWith("order:")) { playSound(event === "order:reset" ? "illegal" : "ui"); statusLabel.textContent = "顺序机关"; status.textContent = event === "order:reset" ? "顺序错了，灯全灭了。从第一盏重新点。" : "点亮第 " + event.split(":")[1] + " 盏灯。"; }
    else if (event.startsWith("timer:")) { playSound("ui"); statusLabel.textContent = "限时门"; status.textContent = "计时开始，桥只接上几拍。快走。"; }
    else if (event.startsWith("blocked:")) { queue.splice(0); statusLabel.textContent = "走不通"; status.textContent = "这条路现在没接上。试着转一转书，或者换个方向。"; }
    else if (event === "exit") { completeLevel(); }
  });
  if (action && action !== "wait" && !action.startsWith("j")) { /* 行走脚步无声，保留节拍感 */ }
}

function performRotation(direction) {
  if (!state.running || model.done) return false;
  const result = rules.step(blueprint, model, direction);
  model = result.state;
  state.rotations += 1;
  syncRotation(false); syncLinks(); syncStars(); syncOrientation();
  playSound("ui");
  applyEvents(result.events.filter((event) => !event.startsWith("rotate")), direction);
  if (!result.events.some((event) => event.startsWith("star:"))) { statusLabel.textContent = "转动书本"; status.textContent = "朝向 " + (model.o * 90) + "°。折起的桥和台阶会在对的角度落下。"; }
  return true;
}

function tick() {
  if (!state.running || model.done) return;
  const action = queue.shift() || "wait";
  if (queue.length === 0) keyboardQueue = false;
  if (action === "cw" || action === "ccw") { performRotation(action); return; }
  const result = rules.step(blueprint, model, action);
  const previous = model;
  model = result.state;
  state.beats += 1;
  if (action !== "wait") { playerAnim.kind = action.startsWith("j") ? "jump" : "move"; }
  playerAnim.falling = false;
  if (model.x !== previous.x || model.z !== previous.z || result.events.includes("fell") || result.events.includes("hit")) placePlayer(false); else placePlayer(true);
  if (result.events.includes("fell") || result.events.includes("hit")) placePlayer(true);
  syncHazards(false); syncLinks(); syncStars(); syncPlates(); syncFlags();
  applyEvents(result.events, action);
}

function enqueue(actions) {
  if (!state.running) return 0;
  for (const action of actions) {
    if (action === "cw" || action === "ccw") { flushQueueThenRotate(action); continue; }
    queue.push(action);
  }
  return queue.length;
}
function flushQueueThenRotate(direction) {
  if (queue.length === 0) performRotation(direction);
  else queue.push(direction);
}

function walkableNeighbors(cell) {
  const probeState = rules.cloneState(model);
  probeState.x = cell.x; probeState.z = cell.z;
  return rules.DIRECTION_ORDER.flatMap((direction) => {
    const target = rules.walkTarget(blueprint, probeState, direction);
    return target ? [{ direction, cell: target }] : [];
  });
}
function planPath(target) {
  const startKey = rules.cellKey({ x: model.x, z: model.z });
  const goalKey = rules.cellKey(target);
  if (startKey === goalKey) return [];
  const previous = new Map([[startKey, null]]);
  const frontier = [{ x: model.x, z: model.z }];
  let head = 0;
  while (head < frontier.length) {
    const current = frontier[head++];
    for (const next of walkableNeighbors(current)) {
      const key = rules.cellKey(next.cell);
      if (previous.has(key)) continue;
      previous.set(key, { from: current, direction: next.direction });
      if (key === goalKey) {
        const actions = [];
        let cursor = key;
        while (previous.get(cursor)) { const link = previous.get(cursor); actions.unshift(link.direction); cursor = rules.cellKey(link.from); }
        return actions;
      }
      frontier.push(next.cell);
    }
  }
  return null;
}
function moveTowards(target) {
  if (!state.running || model.done) return false;
  const path = planPath(target);
  keyboardQueue = false;
  if (path && path.length) { queue.splice(0); queue.push(...path); statusLabel.textContent = "行走"; status.textContent = path.length + " 步。纸浪和纸鸟会按节拍移动。"; return true; }
  if (path && path.length === 0) return false;
  for (const direction of rules.DIRECTION_ORDER) {
    const jump = rules.jumpTarget(blueprint, model, direction);
    if (jump.cell && !jump.falls && jump.cell.x === target.x && jump.cell.z === target.z) { queue.splice(0); queue.push("j" + direction); statusLabel.textContent = "跳跃"; status.textContent = "越过一格空隙。"; return true; }
  }
  statusLabel.textContent = "走不通";
  status.textContent = "那里现在到不了。转一转书，看看桥和台阶会不会接上。";
  showToast("转一转书试试");
  return false;
}
let keyboardQueue = false;
function moveScreen(direction) {
  if (!state.running) return;
  const gridDirection = rules.screenToGrid(direction, model.o);
  // 连按方向键会按顺序排队（最多 12 步）；点击地面的路径则会被新的按键打断。
  if (!keyboardQueue) queue.splice(0);
  if (queue.length >= 12) queue.splice(0, queue.length - 11);
  queue.push(gridDirection);
  keyboardQueue = true;
}
function jump() {
  if (!state.running) return;
  if (!keyboardQueue) queue.splice(0);
  queue.push("j" + model.facing);
  keyboardQueue = true;
}

function burstConfetti(position) {
  if (!position || reducedMotion || !performanceProfiles[performanceTier].particles) return;
  if (confetti) { level.remove(confetti.points); confetti.points.geometry.dispose(); confetti.points.material.dispose(); }
  const count = 48;
  const positions = new Float32Array(count * 3);
  const velocities = [];
  const colors = new Float32Array(count * 3);
  const paletteColors = [palette.star, palette.accent2, palette.edge, palette.top[0]].map((hex) => new THREE.Color(hex));
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = position.x; positions[index * 3 + 1] = position.y + 0.4; positions[index * 3 + 2] = position.z;
    velocities.push(new THREE.Vector3((Math.random() - 0.5) * 2.2, 1.4 + Math.random() * 1.8, (Math.random() - 0.5) * 2.2));
    const color = paletteColors[index % paletteColors.length];
    colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 0.09, vertexColors: true, transparent: true, opacity: 1, sizeAttenuation: true }));
  level.add(points);
  confetti = { points, velocities, life: 1 };
}

function completeLevel() {
  state.finished = true;
  state.stars = model.stars.filter(Boolean).length;
  burstConfetti(exitView?.position);
  showResult(true);
}

function showResult(won) {
  const finalWin = won && campaignLevelIndex === config.campaignLevels.length - 1;
  const stars = won ? Math.min(3, 1 + Number(state.stars >= 2) + Number(state.stars === 3)) : 0;
  if (won) {
    const completedLevel = currentCampaignLevel();
    campaignMastery[completedLevel.id] = Math.max(Number(campaignMastery[completedLevel.id]) || 0, stars);
  }
  setGameSessionState(won ? (finalWin ? "won" : "stage-complete") : "lost");
  state.finished = true;
  queue.splice(0);
  stopEnvironmentAudio();
  document.querySelector("#result-kicker").textContent = won ? (finalWin ? "整本书读完了" : "这一页读完了") : "这一页先合上";
  document.querySelector("#result-title").textContent = won ? (finalWin ? "20 页全部走完" : "第 " + (campaignLevelIndex + 1) + " 页 · 抵达出口") : "暂时放下";
  document.querySelectorAll("#result-stars i").forEach((dot, index) => dot.classList.toggle("is-lit", index < stars));
  document.querySelector("#result-detail").textContent = won
    ? "折纸星 " + state.stars + " / 3，转动 " + state.rotations + " 次，用了 " + state.beats + " 拍" + (state.mistakes ? "，回到旗子 " + state.mistakes + " 次。" : "，一次都没掉下去。") + (finalWin ? " 谢谢你读完这本纸做的书。" : "")
    : "进度已保存在目录里，随时可以再翻开这一页。";
  resultCard.hidden = false;
  if (won && !finalWin) {
    campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex + 1);
    campaignLevelIndex += 1;
    saveCampaign(); syncCampaignUi();
    document.querySelector("#restart").textContent = "翻到第 " + (campaignLevelIndex + 1) + " 页";
  } else if (finalWin) {
    campaignMaxUnlocked = config.campaignLevels.length - 1;
    saveCampaign();
    document.querySelector("#restart").textContent = "重读第 20 页";
  } else document.querySelector("#restart").textContent = "再翻开这一页";
  playSound(won ? "victory" : "defeat");
}

function resetGame() {
  loadLevel(campaignLevelIndex);
  setGameSessionState("playing");
  startCard.hidden = true; resultCard.hidden = true;
  statusLabel.textContent = "第 " + (campaignLevelIndex + 1) + " 页 · " + blueprint.chapterName;
  status.textContent = blueprint.intro;
  startEnvironmentAudio();
  previousFrame = performance.now();
  beatClock = 0;
}
function returnToSetup() {
  queue.splice(0);
  stopEnvironmentAudio();
  setGameSessionState("idle");
  state.finished = false;
  statusLabel.textContent = "目录";
  status.textContent = "选一页再翻开。";
  resultCard.hidden = true;
  startCard.hidden = false;
  syncCampaignUi();
}

// 移轴景深：高性能档把场景渲染到离屏目标，再按屏幕纵向距离做柔和模糊。
let tiltShift = null;
function ensureTiltShift() {
  if (tiltShift) return tiltShift;
  const target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true, type: THREE.HalfFloatType });
  const material = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: target.texture }, resolution: { value: new THREE.Vector2(1, 1) }, focus: { value: 0.52 }, band: { value: 0.22 }, strength: { value: 3.4 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader: "uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float focus; uniform float band; uniform float strength; varying vec2 vUv; void main(){ float d = abs(vUv.y - focus); float blur = smoothstep(band, band + 0.32, d) * strength; vec2 px = blur / resolution; vec4 sum = texture2D(tDiffuse, vUv) * 0.28; sum += texture2D(tDiffuse, vUv + vec2(px.x, 0.0)) * 0.12; sum += texture2D(tDiffuse, vUv - vec2(px.x, 0.0)) * 0.12; sum += texture2D(tDiffuse, vUv + vec2(0.0, px.y)) * 0.12; sum += texture2D(tDiffuse, vUv - vec2(0.0, px.y)) * 0.12; sum += texture2D(tDiffuse, vUv + px) * 0.06; sum += texture2D(tDiffuse, vUv - px) * 0.06; sum += texture2D(tDiffuse, vUv + vec2(px.x, -px.y)) * 0.06; sum += texture2D(tDiffuse, vUv + vec2(-px.x, px.y)) * 0.06; gl_FragColor = sum;\\n#include <tonemapping_fragment>\\n#include <colorspace_fragment>\\n}",
    depthTest: false, depthWrite: false,
  });
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.frustumCulled = false;
  quadScene.add(quad);
  const quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  tiltShift = { target, material, quadScene, quadCamera };
  return tiltShift;
}
function renderFrame() {
  if (performanceProfiles[performanceTier].tiltShift) {
    const pass = ensureTiltShift();
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    if (pass.target.width !== size.x || pass.target.height !== size.y) { pass.target.setSize(size.x, size.y); pass.material.uniforms.resolution.value.set(size.x, size.y); }
    renderer.setRenderTarget(pass.target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.render(pass.quadScene, pass.quadCamera);
  } else renderer.render(scene, camera);
}

let slowFrames = 0;
let time = 0;
function animate(now) {
  if (renderSuspended) return;
  const delta = Math.min(Math.max(0, now - previousFrame) / 1000, 0.05);
  previousFrame = now;
  time += delta;
  if (state.running && introClock < 0) {
    beatClock += delta * 1000;
    while (beatClock >= beatMs) { beatClock -= beatMs; tick(); if (!state.running) break; }
  }
  if (introClock >= 0) {
    introClock += delta;
    const flip = Math.min(1, introClock / 0.7);
    rightPage.rotation.z = Math.PI * 0.92 * (1 - (1 - Math.pow(1 - flip, 3)));
    const pop = Math.max(0, Math.min(1, (introClock - 0.35) / 0.55));
    level.scale.y = 0.001 + (1 - Math.pow(1 - pop, 3)) * 0.999;
    if (introClock > 1.05) { introClock = -1; rightPage.rotation.z = 0; level.scale.y = 1; }
  }
  if (!reducedMotion) {
    const turn = rotationTarget - book.rotation.y;
    book.rotation.y += turn * Math.min(1, delta * 9);
    if (Math.abs(turn) < 0.002) book.rotation.y = rotationTarget;
    // 背景纸山不随书旋转，只在书页远端随页边缘前后滑动（非正方形网格时）。
    backdropGroup.position.z += (backdropTargetZ - backdropGroup.position.z) * Math.min(1, delta * 9);
  } else backdropGroup.position.z = backdropTargetZ;
  backdropGroup.scale.y = level.scale.y;
  const beatFraction = Math.min(1, beatClock / beatMs);
  linkViews.forEach((view) => {
    const targetFold = view.open ? 0 : 1;
    view.fold += (targetFold - view.fold) * (reducedMotion ? 1 : Math.min(1, delta * 7));
    view.arm.rotation.x = view.fold * -1.35;
    if (view.glow) view.glow.material.emissiveIntensity = view.open ? 0.9 + Math.sin(time * 5) * 0.2 : 0.15;
  });
  starViews.forEach((view) => {
    view.starMesh.rotation.y = time * 1.4 + view.index;
    view.starMesh.position.y = 0.46 + (reducedMotion ? 0 : Math.sin(time * 2.2 + view.index) * 0.05);
    if (view.pop > 0) { view.pop = Math.max(0, view.pop - delta * 2.5); view.pocket.scale.setScalar(1 + (1 - view.pop) * 0.0 + view.pop * 0.12); }
  });
  flagViews.forEach((view) => { view.flag.rotation.y = reducedMotion ? 0 : Math.sin(time * 3 + view.index) * 0.16; });
  if (exitView) { exitView.userData.light.intensity = (palette.lanterns ? 3 : 2) + Math.sin(time * 2.5) * 0.4; exitView.userData.lanterns.forEach((lantern, index) => { lantern.material.emissiveIntensity = 1.2 + (reducedMotion ? 0 : Math.sin(time * 3 + index) * 0.25); }); }
  hazardViews.forEach((view) => {
    if (!view.from || !view.to) return;
    const f = reducedMotion ? 1 : beatFraction;
    view.group.position.lerpVectors(view.from, view.to, f);
    if (view.hazard.kind === "bird") { view.group.position.y += Math.sin(time * 6) * 0.04; view.group.userData.wings.forEach((wing, index) => { wing.rotation.z = (index === 0 ? 1 : -1) * Math.sin(time * 9) * 0.55; }); }
    else view.group.rotation.z = Math.sin(time * 4) * 0.08;
  });
  if (playerView && playerAnim.to) {
    if (playerAnim.progress < 1) {
      playerAnim.progress = Math.min(1, playerAnim.progress + delta * (1000 / beatMs));
      const eased = reducedMotion ? playerAnim.progress : playerAnim.progress;
      playerView.position.lerpVectors(playerAnim.from, playerAnim.to, eased);
      const arc = playerAnim.kind === "jump" ? 0.55 : 0.12;
      if (!reducedMotion) playerView.position.y += Math.sin(eased * Math.PI) * arc;
    }
    const puppet = playerView.userData.puppet;
    const bob = !reducedMotion && playerAnim.progress < 1 ? Math.sin(playerAnim.progress * Math.PI * 2) * 0.08 : 0;
    puppet.scale.set(1 - bob * 0.5, 1 + bob, 1 - bob * 0.5);
  }
  if (confetti) {
    confetti.life -= delta * 0.9;
    const positions = confetti.points.geometry.attributes.position;
    for (let index = 0; index < confetti.velocities.length; index += 1) {
      const velocity = confetti.velocities[index];
      velocity.y -= 4.5 * delta;
      positions.setXYZ(index, positions.getX(index) + velocity.x * delta, positions.getY(index) + velocity.y * delta, positions.getZ(index) + velocity.z * delta);
    }
    positions.needsUpdate = true;
    confetti.points.material.opacity = Math.max(0, confetti.life);
    if (confetti.life <= 0) { level.remove(confetti.points); confetti.points.geometry.dispose(); confetti.points.material.dispose(); confetti = null; }
  }
  renderFrame();
  state.renderCount += 1;
  slowFrames = delta > 0.026 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
  if (slowFrames > 90 && performanceTier !== "low") { applyPerformanceTier(performanceTier === "high" ? "medium" : "low"); slowFrames = 0; }
}
renderer.setAnimationLoop(animate);

function resize() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  if (blueprint) fitCamera();
}
window.addEventListener("resize", resize);
resize();

document.addEventListener("visibilitychange", () => {
  renderSuspended = document.hidden;
  state.suspended = renderSuspended;
  if (document.hidden) stopEnvironmentAudio();
  else { previousFrame = performance.now(); if (state.running) startEnvironmentAudio(); }
});

// 输入：点击地面行走 / 横向滑动转书 / 键盘。
const raycaster = new THREE.Raycaster();
const pointer = { down: false, x: 0, y: 0, moved: false, id: null };
function pickCell(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const hit = raycaster.intersectObjects(Array.from(cellMeshes.values()), false)[0];
  return hit?.object.userData.cell || null;
}
canvas.addEventListener("pointerdown", (event) => {
  if (!state.running) return;
  pointer.down = true; pointer.moved = false; pointer.x = event.clientX; pointer.y = event.clientY; pointer.id = event.pointerId;
  canvas.setPointerCapture?.(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!pointer.down || event.pointerId !== pointer.id) return;
  const dx = event.clientX - pointer.x;
  const dy = event.clientY - pointer.y;
  if (!pointer.moved && Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.2) {
    pointer.moved = true;
    performRotation(dx > 0 ? "cw" : "ccw");
  }
});
function endPointer(event) {
  if (!pointer.down || event.pointerId !== pointer.id) return;
  pointer.down = false;
  if (!pointer.moved && state.running) {
    const cell = pickCell(event.clientX, event.clientY);
    if (cell) moveTowards(cell);
  }
}
canvas.addEventListener("pointerup", endPointer);
canvas.addEventListener("pointercancel", endPointer);
window.addEventListener("keydown", (event) => {
  const handled = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyW", "KeyA", "KeyS", "KeyD", "Space", "KeyQ", "KeyE"];
  if (handled.includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  if (event.code === "KeyP") { togglePause(); return; }
  if (!state.running) return;
  if (event.code === "KeyQ") performRotation("ccw");
  else if (event.code === "KeyE") performRotation("cw");
  else if (event.code === "Space") jump();
  else if (event.code === "ArrowUp" || event.code === "KeyW") moveScreen("N");
  else if (event.code === "ArrowDown" || event.code === "KeyS") moveScreen("S");
  else if (event.code === "ArrowLeft" || event.code === "KeyA") moveScreen("W");
  else if (event.code === "ArrowRight" || event.code === "KeyD") moveScreen("E");
});
document.querySelectorAll("[data-key]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (button.disabled) return;
    button.classList.add("is-active");
    if (button.dataset.key === "cw") performRotation("cw");
    else if (button.dataset.key === "ccw") performRotation("ccw");
    else if (button.dataset.key === "jump") jump();
  });
  const release = () => button.classList.remove("is-active");
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", release);
});
document.querySelector("#start").addEventListener("click", () => resetGame());
document.querySelector("#restart").addEventListener("click", () => resetGame());
backToSetupButton.addEventListener("click", returnToSetup);
pauseButton.addEventListener("click", togglePause);
resultSetupButton.addEventListener("click", returnToSetup);
campaignSelect.addEventListener("change", () => {
  campaignLevelIndex = Math.min(campaignMaxUnlocked, Math.max(0, Number(campaignSelect.value) || 0));
  saveCampaign(); syncCampaignUi();
});
loadCampaign();
loadLevel(campaignLevelIndex);

const gameDebugApi = {
  state,
  getState() {
    const bp = blueprint;
    return {
      ...state,
      mode: "popup",
      level: campaignLevelIndex + 1,
      player: playerView ? { x: playerView.position.x, y: playerView.position.y, z: playerView.position.z } : null,
      model: model ? { x: model.x, z: model.z, o: model.o, t: model.t, checkpoint: model.checkpoint, stars: model.stars.slice(), progress: model.progress, toggles: { ...model.toggles }, timers: { ...model.timers }, mistakes: model.mistakes, done: model.done, facing: model.facing } : null,
      queueLength: queue.length,
      beatMs,
      campaign: { level: currentCampaignLevel(), maxUnlocked: campaignMaxUnlocked + 1, total: config.campaignLevels.length, mastery: { ...campaignMastery }, stars: Object.values(campaignMastery).reduce((sum, value) => sum + Number(value || 0), 0) },
      contract: config.contract,
      popup: bp ? {
        blueprintCount: config.blueprints.length,
        uniqueSignatures: new Set(config.blueprints.map((item) => JSON.stringify({ rows: item.rows, start: item.start, exit: item.exit, links: item.links, plates: item.plates, hazards: item.hazards, stars: item.stars }))).size,
        chapterCount: new Set(config.blueprints.map((item) => item.chapter)).size,
        blueprintId: bp.id, blueprintName: bp.name, chapter: bp.chapter,
        blueprint: bp,
        stars: bp.stars,
        start: bp.start,
        respawn: rules.respawnCell(bp, model),
        hiddenStarIndexes: bp.stars.flatMap((star, index) => (star.angles.includes(0) ? [] : [index])),
        visibleStarIndexes: bp.stars.flatMap((star, index) => (star.angles.includes(model.o) && !model.stars[index] ? [index] : [])),
        links: linkViews.map((view) => ({ id: view.link.id, open: view.open, fold: Number(view.fold.toFixed(3)) })),
        hazards: bp.hazards.map((hazard) => ({ id: hazard.id, cell: rules.hazardCell(hazard, model.t) })),
        rotationModel: "book-90-degree-steps",
        reachabilityModel: "grid-beat-rules",
        tiltShift: performanceProfiles[performanceTier].tiltShift,
        reducedMotion,
        decor: decorStats,
        decorItems: decorItems.map((item) => ({ kind: item.kind, x: Number(item.x.toFixed(2)), z: Number(item.z.toFixed(2)), height: Number(item.height.toFixed(2)), main: item.main, layers: item.layers, occludes: item.occludes, clearance: Number(item.clearance.toFixed(2)) })),
      } : null,
    };
  },
  enqueue(actions) { return enqueue(Array.isArray(actions) ? actions : [actions]); },
  /** 确定性回放：从本关 t=0 重开并一次性入队，保证与求解器的节拍模型一致。 */
  replay(actions, nextBeatMs) {
    resetGame();
    if (nextBeatMs) beatMs = Math.max(30, Number(nextBeatMs) || beatMs);
    introClock = -1; rightPage.rotation.z = 0; level.scale.y = 1;
    return enqueue(Array.isArray(actions) ? actions : config.solutions[blueprint.id] || []);
  },
  rotate(direction) { return performRotation(direction === "ccw" ? "ccw" : "cw"); },
  moveTo(x, z) { return moveTowards({ x: Number(x), z: Number(z) }); },
  tickNow() { tick(); return gameDebugApi.getState(); },
  setBeatMs(value) { beatMs = Math.max(30, Number(value) || config.beatMs); return beatMs; },
  solution() { return config.solutions[blueprint.id] || []; },
  jumpIntoVoid() {
    if (!state.running) return false;
    const direction = rules.DIRECTION_ORDER.find((candidate) => { const jump = rules.jumpTarget(blueprint, model, candidate); return !jump.blocked && jump.falls; });
    if (!direction) return false;
    queue.splice(0); queue.push("j" + direction); tick();
    return true;
  },
  suspend(value = true) { renderSuspended = Boolean(value); state.suspended = renderSuspended; if (!renderSuspended) previousFrame = performance.now(); },
  forceWin() { if (!blueprint) return; model.done = true; completeLevel(); },
  forceFail() { showResult(false); },
  restart: resetGame,
  setLevel(levelNumber) { campaignLevelIndex = Math.max(0, Math.min(config.blueprints.length - 1, Number(levelNumber) - 1)); campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex); syncCampaignUi(); saveCampaign(); },
  setPerformanceTier(tier) { if (performanceProfiles[tier]) applyPerformanceTier(tier); return performanceTier; },
};
if (new URLSearchParams(location.search).has("probe")) window.__GAME_DEBUG__ = gameDebugApi;
`;
}

export type PopupArtifactHelpers = {
  copySignalAssetPack: (root: string) => void;
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

export function writePaperPopupArtifact(root: string, project: ProjectDetail, helpers: PopupArtifactHelpers) {
  helpers.copySignalAssetPack(root);
  copyPaperPopupAssetPack(root);
  mkdirSync(join(root, "vendor"), { recursive: true });
  copyFileSync(helpers.threeModuleSource, join(root, "vendor", "three.module.js"));
  copyFileSync(helpers.threeCoreSource, join(root, "vendor", "three.core.js"));
  writeFileSync(join(root, "index.html"), popupGameHtml(project), "utf8");
  writeFileSync(join(root, "styles.css"), popupGameStyles, "utf8");
  writeFileSync(join(root, "app.js"), `${popupGameScript(project).replace('const config =', `${helpers.safeStorageShim}\nconst config =`)}${helpers.telemetryScript}`, "utf8");
  const provenanceRoot = join(root, "_studio");
  mkdirSync(provenanceRoot, { recursive: true });
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
    "- 用途：所有 AI 图只作为封面或贴图（纸纹、桌面背景、章节印花）；关卡几何全部为 Three.js 程序化低多边形。",
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
    schemaVersion: 1,
    runtime: "three.js 0.185.1",
    mode: "popup",
    contract: project.spec.threeContract,
    assetGeneration: { model: "gpt-image-2", promptRecord: "_studio/PAPER_POPUP_ASSET_PROMPTS.md", manifest: "assets/starter/paper-popup/manifest.json", deliveredTextures: paperPopupTextureFiles },
    renderPipeline: { shading: "flat-shaded procedural low-poly", paperEdges: "EdgesGeometry line overlays", lighting: "directional sun + hemisphere + PCF soft shadows + linear fog + ACES", tiltShift: "high tier only, screen-space vertical band blur", reducedMotion: "page flip, bounce, confetti and rotation easing disabled" },
    models: [
      { id: "paper-cells", format: "procedural-three-geometry", use: "grid-terrain", approximateTriangles: 12 * 81 },
      { id: "paper-links", format: "procedural-three-geometry", use: "folding-bridges-and-stairs", approximateTriangles: 120 },
      { id: "origami-star", format: "procedural-three-geometry", use: "collectible", approximateTriangles: 60 },
      { id: "paper-puppet", format: "procedural-three-geometry", use: "player-avatar", approximateTriangles: 140 },
      { id: "paper-hazards", format: "procedural-three-geometry", use: "wave-and-bird-hazards", approximateTriangles: 40 },
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
    engine: "three.js",
    engineVersion: "0.185.1",
    difficulty: project.spec.difficulty,
    visualStyle: project.spec.visualStyle,
    aspectRatio: project.spec.aspectRatio,
    cameraMode: project.spec.cameraMode,
    inputModes: project.spec.inputModes,
    levelProgression: project.spec.levelProgression,
    generatedAt: new Date().toISOString(),
    assetPack: "signal-studio+paper-popup",
    assetManifest: "./assets/asset-manifest.json",
    artPipeline: { renderer: "threejs-procedural-papercraft", cover: "./assets/cover.png", textures: paperPopupTextureFiles.map((file) => `./assets/${file}`), environment: "./assets/background.png" },
    threeMode: "popup",
    threeContract: project.spec.threeContract,
    performanceProfiles: { low: { pixelRatio: 1, shadows: false, tiltShift: false }, medium: { pixelRatio: 1.25, shadows: true, tiltShift: false }, high: { pixelRatio: 1.5, shadows: true, tiltShift: true } },
    assetProvenance: "./_studio/THREE_ASSET_PROVENANCE.json",
    levelAudit: "./_studio/PAPER_POPUP_LEVELS.json",
  }, null, 2), "utf8");
}
