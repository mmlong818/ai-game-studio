import { copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { visualStyleOptions, type ProjectDetail } from "../shared/contracts.js";
import { createCampaignLevels } from "../shared/level-progression.js";
import type { DirectionVerdict } from "./design-contract.js";
import { getRuntimeDefinition } from "./game-runtimes/index.js";

const moduleRoot = dirname(fileURLToPath(import.meta.url));
const signalAssetRoot = resolve(moduleRoot, "..", "..", "assets", "starter", "signal-studio");
const templateAssetRoot = resolve(moduleRoot, "..", "..", "assets", "templates", "packs");
const threeModuleSource = resolve(moduleRoot, "..", "..", "node_modules", "three", "build", "three.module.js");
const threeCoreSource = resolve(moduleRoot, "..", "..", "node_modules", "three", "build", "three.core.js");
const puzzleBuiltInLevels = [
  "口袋花园", "雨后温室", "月光池塘", "果香野餐", "糖果云丘",
  "镜面花房", "晨雾睡莲", "莓果露营", "珊瑚小径", "星砂庭院",
  "风铃草坡", "汽水海岸", "蒲公英站台", "蜜桃溪谷", "萤火果园",
  "薄荷玻璃屋", "月兔湖畔", "彩纸野餐", "云朵盆栽", "极光花园",
].map((label, index) => ({ id: `gallery-${String(index + 1).padStart(2, "0")}`, label, path: `./assets/level-gallery-${String(index + 1).padStart(2, "0")}.png` }));
const puzzleLevelAssets = puzzleBuiltInLevels.map((level) => level.path.replace("./assets/", ""));
const breakoutLevelAssets = ["level-coral-gate.png", "level-jellyfish-tide.png", "level-star-reef.png", "level-abyss-crown.png"] as const;
const klotskiEffectAssets = ["klotski-courtyard.png"] as const;

function safeJson(value: unknown) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export const safeStorageShim = `const safeStorage = (() => {
  const memory = new Map();
  return {
    getItem(key) {
      try { const value = localStorage.getItem(key); if (value !== null) return value; } catch {}
      return memory.has(key) ? memory.get(key) : null;
    },
    setItem(key, value) {
      const stringValue = String(value);
      try { localStorage.setItem(key, stringValue); } catch { memory.set(key, stringValue); }
    },
    removeItem(key) {
      try { localStorage.removeItem(key); } catch { memory.delete(key); }
    },
  };
})();`;

export function playTelemetryScript(projectId: string, versionId: string) {
  const identity = safeJson({ projectId, versionId });
  return `
;(() => {
  if (!/^\\/(play|version)\\//.test(location.pathname)) return;
  const identity = ${identity};
  let playerId = "";
  try {
    playerId = safeStorage.getItem("forge-player-id") || "";
    if (!/^player-[0-9a-f-]{36}$/i.test(playerId)) {
      playerId = "player-" + crypto.randomUUID();
      safeStorage.setItem("forge-player-id", playerId);
    }
  } catch { playerId = "player-" + crypto.randomUUID(); }
  let inputMode = "unknown";
  let active = false;
  let terminal = false;
  let frameCount = 0;
  let frameStartedAt = performance.now();
  const frame = () => { frameCount += 1; requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
  addEventListener("keydown", () => { inputMode = "keyboard"; }, { passive: true });
  addEventListener("pointerdown", (event) => { inputMode = event.pointerType === "touch" ? "touch" : "pointer"; }, { passive: true });
  function snapshot() {
    const debug = window.__GAME_DEBUG__;
    const state = typeof debug?.getState === "function" ? debug.getState() : debug?.state || {};
    return {
      level: Number(state?.campaign?.level?.number || state?.level || 1),
      bestScore: Number(state?.bestScore || state?.score || state?.collected || 0),
      averageFps: Math.min(240, frameCount * 1000 / Math.max(1, performance.now() - frameStartedAt)),
    };
  }
  function send(type) {
    const payload = snapshot();
    fetch("/api/play-events", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...identity, playerId, type, inputMode, viewport: innerWidth + "x" + innerHeight, ...payload }) }).catch(() => {});
  }
  addEventListener("game:state-change", (event) => {
    const next = event.detail?.state;
    if (next === "playing" && !active) { active = true; terminal = false; frameCount = 0; frameStartedAt = performance.now(); send("start"); }
    if (next === "won" || next === "stage-complete") { terminal = true; send("complete"); }
    if (next === "lost") { terminal = true; send("fail"); }
  });
  addEventListener("error", (event) => {
    if (event.target instanceof HTMLImageElement || event.target instanceof HTMLAudioElement) send("resource-error");
  }, true);
  addEventListener("pagehide", () => { if (active && !terminal) send("exit"); });
})();`;
}

function gameTelemetryScript(project: ProjectDetail) {
  return playTelemetryScript(project.id, project.version.id);
}

function visualStyleDirection(project: ProjectDetail) {
  return visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
}

function canvasDimensions(project: ProjectDetail) {
  const dimensions = {
    "16:9": { width: 960, height: 540 },
    "4:3": { width: 800, height: 600 },
    "1:1": { width: 720, height: 720 },
    "9:16": { width: 720, height: 1280 },
  } as const;
  return dimensions[project.spec.aspectRatio];
}

function markdownList(items: readonly string[], empty = "- 无") {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : empty;
}

function copySignalAssetPack(root: string) {
  const targetRoot = join(root, "assets");
  mkdirSync(join(targetRoot, "prompts"), { recursive: true });
  const manifestPath = join(signalAssetRoot, "asset-manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { assets?: Array<{ filename?: string }> };
  const assetFiles = [...new Set(["asset-manifest.json", ...(manifest.assets ?? []).flatMap((asset) => asset.filename ? [asset.filename] : [])])];
  for (const filename of assetFiles) {
    const source = join(signalAssetRoot, filename);
    if (!existsSync(source)) throw new Error(`视听资源缺失：${filename}`);
    mkdirSync(dirname(join(targetRoot, filename)), { recursive: true });
    copyFileSync(source, join(targetRoot, filename));
  }
  for (const filename of ["cover.txt", "arena-background.txt", "gameplay-atlas.txt"]) {
    copyFileSync(join(signalAssetRoot, "prompts", filename), join(targetRoot, "prompts", filename));
  }
}

function copyTemplateAssetPack(root: string, project: ProjectDetail) {
  const sourceRoot = join(templateAssetRoot, project.spec.template);
  const targetRoot = join(root, "assets");
  mkdirSync(targetRoot, { recursive: true });
  const manifestPath = join(sourceRoot, "asset-manifest.json");
  if (!existsSync(manifestPath)) throw new Error(`模板资源清单缺失：${project.spec.template}`);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { assets?: Array<{ filename?: string }> };
  const assetFiles = [...new Set(["asset-manifest.json", ...(manifest.assets ?? []).flatMap((asset) => asset.filename ? [asset.filename] : [])])];
  for (const filename of assetFiles) {
    const source = join(sourceRoot, filename);
    if (!existsSync(source)) throw new Error(`模板资源缺失：${project.spec.template}/${filename}`);
    mkdirSync(dirname(join(targetRoot, filename)), { recursive: true });
    copyFileSync(source, join(targetRoot, filename));
  }
  if (project.spec.template === "puzzle") {
    for (const filename of puzzleLevelAssets) {
      const source = join(sourceRoot, filename);
      if (!existsSync(source)) throw new Error(`拼图关卡资源缺失：${filename}`);
      copyFileSync(source, join(targetRoot, filename));
    }
    copyFileSync(resolve(templateAssetRoot, "..", "prompts", "puzzle-levels.jsonl"), join(targetRoot, "puzzle-levels.jsonl"));
  }
  if (project.spec.template === "breakout") {
    for (const filename of breakoutLevelAssets) {
      const source = join(sourceRoot, filename);
      if (!existsSync(source)) throw new Error(`打砖块关卡资源缺失：${filename}`);
      copyFileSync(source, join(targetRoot, filename));
    }
    copyFileSync(resolve(templateAssetRoot, "..", "prompts", "breakout-levels.jsonl"), join(targetRoot, "breakout-levels.jsonl"));
  }
  if (project.spec.template === "klotski") {
    for (const filename of klotskiEffectAssets) {
      const source = join(sourceRoot, filename);
      if (!existsSync(source)) throw new Error(`华容道场景资源缺失：${filename}`);
      copyFileSync(source, join(targetRoot, filename));
    }
    copyFileSync(resolve(templateAssetRoot, "..", "prompts", "klotski-effects.jsonl"), join(targetRoot, "klotski-effects.jsonl"));
  }
  const prompt = join(sourceRoot, "prompt.txt");
  if (existsSync(prompt)) copyFileSync(prompt, join(targetRoot, "prompt.txt"));
  const atlasPrompt = join(sourceRoot, "gameplay-atlas.txt");
  if (existsSync(atlasPrompt)) copyFileSync(atlasPrompt, join(targetRoot, "gameplay-atlas.txt"));
  if (project.spec.template === "puzzle" && project.spec.customImageDataUrl) {
    const encoded = project.spec.customImageDataUrl.replace(/^data:image\/jpeg;base64,/, "");
    writeFileSync(join(targetRoot, "custom-puzzle.jpg"), Buffer.from(encoded, "base64"));
  }
}

export function writeDesignDocuments(
  root: string,
  project: ProjectDetail,
  directions: string[] = [],
  directionAudit: DirectionVerdict[] | null = null,
) {
  const studioRoot = join(root, "_studio");
  mkdirSync(studioRoot, { recursive: true });
  const constraints = project.spec.hardConstraints.length
    ? project.spec.hardConstraints.map((item) => `- ${item}`).join("\n")
    : "- 当前输入没有额外硬约束。";
  const directionLines = directions.map((item, index) => {
    const verdict = directionAudit?.[index];
    if (!verdict) return `${index + 1}. ${item}`;
    return `${index + 1}. ${item}\n   - ${verdict.addressed ? "✅ 已落实" : "⚠️ 未落实"}：${verdict.evidence}`;
  });
  const directionSection = directions.length
    ? `\n## 创作对话修订依据\n\n本版本设计合同参考了创作者在制作对话中的 ${directions.length} 条意见（按时间顺序${directionAudit ? "，并经模型逐条审计落实情况" : ""}）：\n\n${directionLines.join("\n")}\n`
    : "";
  const design = project.spec.designProfile;
  const commercialLevels = createCampaignLevels(project.spec.template, project.spec.difficulty);
  const masteryTable = commercialLevels.map((level) => `| ${level.number} | ${level.tierLabel} | ${level.ruleModifier} | ${level.masteryRules.map((rule) => rule.label).join("；")} | ${level.reward} |`).join("\n");
  const source = project.spec.templateSource;
  const visualStyle = visualStyleDirection(project);
  const sourceSection = source
    ? `## 开源模板来源与改造边界\n\n- 上游：${source.sourceName}\n- 仓库：${source.sourceUrl}\n- 许可证：${source.license}（${source.licenseUrl}）\n- 接入方式：${source.integrationMode === "code-port" ? "代码结构移植并适配本平台运行时" : "架构模式适配"}\n- 引入部分：${source.importedElements.join("、")}\n- 资产边界：${source.assetPolicy}\n- 核验日期：${source.verifiedAt}`
    : "## 模板来源\n\n当前玩法使用平台原创运行时，没有声明为第三方开源代码移植。";
  writeFileSync(
    join(studioRoot, "GAME_DESIGN.md"),
    `# ${project.title} · 专业游戏设计文档\n\n## 产品定位\n\n- 类型：${design.genre}\n- 目标玩家：${design.targetPlayer}\n- 单局时长：${design.sessionLength}\n- 玩家幻想：${design.playerFantasy}\n- 设计来源：${project.spec.designSource === "llm" ? "AI 依据创意定制的设计合同" : "玩法模板预设设计"}\n\n## 核心承诺\n\n${project.spec.vision}\n\n## 核心循环\n\n${design.coreLoop.map((item, index) => `${index + 1}. ${item}`).join("\n")}\n\n## 胜负条件\n\n- 胜利：${design.winCondition}\n- 失败：${design.failCondition}\n\n## 机制与成长\n\n### 主要机制\n\n${markdownList(project.spec.mechanics)}\n\n### 局内推进\n\n${markdownList(design.progression)}\n\n## 难度曲线\n\n${markdownList(design.difficultyCurve)}\n\n## 商业级关卡合同\n\n每关包含一个必须完成的主要任务和两个可选技巧目标。通关获得 1 枚基础星章，完成效率与控制目标各增加 1 枚；历史最佳评价只升不降。星章用于证明掌握程度和提供复玩目标，不出售数值优势。\n\n| 关卡 | 阶段 | 规则变化 | 技巧目标 | 奖励 |\n| ---: | --- | --- | --- | --- |\n${masteryTable}\n\n## 手感与反馈\n\n${markdownList(design.gameFeel)}\n\n## 新手引导\n\n${markdownList(design.onboarding)}\n\n## 无障碍与输入\n\n${markdownList(design.accessibility)}\n\n## 制作风险\n\n${markdownList(design.productionRisks, "- 当前模板没有额外已知风险。")}
\n## 硬约束\n\n${constraints}\n${directionSection}\n${sourceSection}\n\n## 验收清单\n\n${project.spec.acceptanceCriteria.map((criterion) => `- [ ] ${criterion.id} · ${criterion.priority} · ${criterion.statement}`).join("\n")}\n`,
    "utf8",
  );
  writeFileSync(
    join(studioRoot, "ART_DIRECTION.md"),
    project.spec.template === "signal-hunt"
      ? `# 美术方向\n\n画面风格：${visualStyle.label}\n视觉描述：${visualStyle.description}\n页面编排：${visualStyle.layout}\n组件语言：${visualStyle.elements}\n细节密度：${visualStyle.detailLabel}\n\n港口夜景的页面结构、组件造型、装饰密度、场景调色和交互反馈必须统一服从该风格，禁止只替换颜色。封面、场景背景与游戏内图集均由 gpt-image-2 生成；信号目标使用位图精灵，3D 地面、遗迹、玩家和收集物使用位图纹理。最终提示词随资产一同归档；画面不含文字、Logo 或水印。\n`
      : `# 美术方向\n\n模板：${project.spec.template}\n题材方向：${project.spec.artStyle}\n画面风格：${visualStyle.label}\n视觉描述：${visualStyle.description}\n页面编排：${visualStyle.layout}\n组件语言：${visualStyle.elements}\n细节密度：${visualStyle.detailLabel}\n难度：${project.spec.difficulty}\n\n页面结构、组件造型、装饰密度、游戏画布、按钮反馈与主视觉必须使用同一画面风格，禁止只替换颜色。gpt-image-2 生成的源图集在交付前被拆分为九项带透明安全区的角色位图；背景另做降噪衍生，玩家、棋子、障碍、交互物、规则标记与反馈特效按角色记录用途、尺寸、裁切区、主体占比、提示词、来源和版本。运行时只加载独立角色位图，不再让通用图集承担所有元素。提示词、模型、文件哈希和程序化音频来源随版本归档。${source ? "上游项目的图像和声音没有复制到本交付，避免代码许可证与媒体版权混用。" : ""}\n`,
    "utf8",
  );
  writeFileSync(
    join(studioRoot, "SOUND_DIRECTION.md"),
    "# 声音方向\n\n交付包含音乐、环境、玩法反馈和 UI 四条音轨。合法、非法、奖励、受击、胜利、失败与 UI 操作均为独立 WAV；高频操作带播放冷却，页面切出或游戏结束时音乐与环境声暂停。音频采用本地程序化合成并记录哈希，不冒充 AI 音乐；所有播放均由首次用户操作触发。\n",
    "utf8",
  );
  writeFileSync(
    join(studioRoot, "ART_REVIEW.md"),
    `# ${project.title} · 主美验收闸门

## 审核目标

发布前必须在真实 ${project.spec.aspectRatio} 游戏页面中，以最终位图、最终画布缩放和最终交互状态验收；仅有封面图或高分辨率图集不算通过。

## 硬性检查

- [ ] 宣传图与局内角色、方块、道具使用同一材质语言、轮廓语言和细节密度。
- [ ] 核心玩法对象是第一视觉焦点；背景不得淹没棋盘、角色、球、挡板或目标。
- [ ] 每个主要位图在实际游戏尺寸下仍有可辨认纹样，不退化成纯色块、细线或模糊亮斑。
- [ ] 棋子和牌面在分配格内光学居中；主体占据可用面积约 82%–94%，没有无意义的大圈空白。
- [ ] 横向、纵向和方形资产分别按目标比例裁切，禁止把同一方图粗暴拉伸成细长药丸。
- [ ] 选中、命中、受阻、成功和失败反馈均能在 240ms 内被看见，并且不遮挡核心操作。
- [ ] 手机竖屏必须检查顶部出生区、中部操作区和底部控制区，不允许关键对象被裁切或压缩。
- [ ] 最终页面需通过并排截图复核：封面承诺、开局画面、操作中画面三者质量不能明显降级。

## 自动检查边界

构建探针只能确认位图、画幅、输入和反馈代码已经接入；审美质量仍必须通过真实页面截图和实际试玩确认。
`,
    "utf8",
  );
  writeFileSync(
    join(studioRoot, "OPEN_SOURCE_ATTRIBUTION.md"),
    source
      ? `# 开源代码归属\n\n本游戏的“${project.spec.template}”模板以 ${source.sourceName} 为上游参考。\n\n- 项目：${source.sourceUrl}\n- 许可证：${source.license}\n- 许可证原文：${source.licenseUrl}\n- 接入方式：${source.integrationMode}\n- 移植范围：${source.importedElements.join("、")}\n- 资产说明：${source.assetPolicy}\n\n本平台新增的界面、画面、音频、玩法参数和交付代码不改变上游版权归属。\n`
      : "# 开源代码归属\n\n此游戏模板没有声明为第三方开源代码移植。\n",
    "utf8",
  );
}

function gameScript(project: ProjectDetail) {
  const config = safeJson({
    title: project.title,
    vision: project.spec.vision,
    visualStyle: project.spec.visualStyle,
    cameraMode: project.spec.cameraMode,
    inputModes: project.spec.inputModes,
    goal: 8,
    duration: 30,
    campaign: project.spec.levelProgression,
    campaignLevels: createCampaignLevels(project.spec.template, project.spec.difficulty),
    campaignStorageKey: `forge-campaign:${project.id}:${project.version.id}`,
  });
  return `${safeStorageShim}
const config = ${config};
document.body.dataset.gameState = "idle";
document.body.dataset.cameraMode = config.cameraMode;
const arena = document.querySelector("#arena");
const target = document.querySelector("#target");
const scoreValue = document.querySelector("#score-value");
const goalValue = document.querySelector("#goal-value");
const timerValue = document.querySelector("#timer-value");
const status = document.querySelector("#status");
const restartButton = document.querySelector("#restart");
const backToSetupButton = document.querySelector("#back-to-setup");
const startButton = document.querySelector("#start");
const startCard = document.querySelector("#start-card");
const soundToggle = document.querySelector("#sound-toggle");
const campaignSelect = document.querySelector("[data-campaign-level]");
const campaignProgress = document.querySelector("[data-campaign-progress]");
const sounds = {
  music: new Audio("./assets/music.wav"), ambient: new Audio("./assets/ambient.wav"),
  legal: new Audio("./assets/legal.wav"), illegal: new Audio("./assets/illegal.wav"), reward: new Audio("./assets/reward.wav"),
  hit: new Audio("./assets/hit.wav"), victory: new Audio("./assets/victory.wav"), defeat: new Audio("./assets/defeat.wav"), ui: new Audio("./assets/ui.wav"),
};
const soundAliases = { collect: "reward", warning: "illegal" };
sounds.music.loop = true;
sounds.ambient.loop = true;
sounds.music.volume = 0.16;
sounds.ambient.volume = 0.22;
Object.values(sounds).forEach((audio) => { audio.preload = "auto"; });
const soundLastPlayed = new Map();
let score = 0;
let remaining = config.duration;
let running = false;
let gameSessionState = "idle";
let soundEnabled = true;
let timerId = null;
let campaignLevelIndex = 0;
let campaignMaxUnlocked = 0;
let currentGoal = config.goal;
let currentDuration = config.duration;
let campaignMastery = {};

function currentCampaignLevel() { return config.campaignLevels[campaignLevelIndex]; }
function syncCampaignUi() {
  const level = currentCampaignLevel();
  campaignSelect.value = String(campaignLevelIndex);
  Array.from(campaignSelect.options).forEach((option, index) => { option.disabled = index > campaignMaxUnlocked; });
  campaignProgress.textContent = "第 " + level.number + " / " + config.campaignLevels.length + " 关 · " + level.tierLabel + " · " + level.ruleModifier;
  document.body.dataset.campaignCurrentLevel = String(level.number);
  let masteryCard = startCard.querySelector("[data-mastery-card]");
  if (!masteryCard) {
    masteryCard = document.createElement("section");
    masteryCard.dataset.masteryCard = "";
    masteryCard.className = "signal-mastery-card";
    masteryCard.innerHTML = '<strong data-mastery-mission></strong><ul data-mastery-objectives></ul><small data-mastery-summary></small>';
    startCard.querySelector(".signal-setup-actions")?.before(masteryCard);
  }
  masteryCard.querySelector("[data-mastery-mission]").textContent = level.mission;
  masteryCard.querySelector("[data-mastery-objectives]").replaceChildren(...level.masteryRules.map((rule) => {
    const item = document.createElement("li"); item.textContent = rule.label; return item;
  }));
  const earned = Math.max(0, Math.min(3, Number(campaignMastery[level.id]) || 0));
  const total = Object.values(campaignMastery).reduce((sum, value) => sum + Math.max(0, Math.min(3, Number(value) || 0)), 0);
  masteryCard.querySelector("[data-mastery-summary]").textContent = "本关 " + "★".repeat(earned) + "☆".repeat(3 - earned) + " · 总星章 " + total + " / 60";
}
function saveCampaign() {
  try { safeStorage.setItem(config.campaignStorageKey, JSON.stringify({ schemaVersion: 2, current: campaignLevelIndex, maxUnlocked: campaignMaxUnlocked, mastery: campaignMastery })); } catch {}
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
function applyCampaignLevel() {
  const level = currentCampaignLevel();
  currentGoal = Math.max(5, Math.round(config.goal * level.goalMultiplier));
  currentDuration = Math.max(20, Math.round(config.duration / (.88 + (level.tier - 1) * .035)));
  goalValue.textContent = String(currentGoal).padStart(2, "0");
  timerValue.textContent = String(currentDuration);
  startCard.querySelector(".card-index").textContent = "MISSION / " + String(level.number).padStart(2, "0") + " OF 20";
  startCard.querySelector("h2").textContent = level.tierLabel + " · " + level.ruleModifier;
  startCard.querySelector("p").textContent = "在 " + currentDuration + " 秒内捕获 " + currentGoal + " 个移动信号。难度按每四关一档逐步提升。";
}

function setGameSessionState(nextState) {
  const previousState = gameSessionState;
  gameSessionState = nextState;
  running = nextState === "playing";
  document.body.dataset.gameState = nextState;
  window.dispatchEvent(new CustomEvent("game:state-change", { detail: { previousState, state: nextState } }));
}

function tone(frequency, duration = 0.08) {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext || !soundEnabled) return;
  const context = new AudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.05, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + duration);
}

function playClip(name, fallbackFrequency) {
  if (!soundEnabled) return;
  const resolvedName = soundAliases[name] || name;
  const clip = sounds[resolvedName];
  const now = performance.now();
  if (now - (soundLastPlayed.get(resolvedName) || 0) < 70) return;
  soundLastPlayed.set(resolvedName, now);
  clip.currentTime = 0;
  void clip.play().catch(() => tone(fallbackFrequency));
}

function setAmbient(active) {
  if (active && soundEnabled) {
    void sounds.music.play().catch(() => {});
    void sounds.ambient.play().catch(() => {});
  } else {
    sounds.music.pause();
    sounds.ambient.pause();
  }
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  soundToggle.textContent = soundEnabled ? "声音开启" : "声音关闭";
  setAmbient(running);
}

function moveTarget() {
  const index = score + remaining + currentCampaignLevel().variant * 11;
  target.style.left = 9 + ((index * (37 + currentCampaignLevel().tier)) % 78) + "%";
  target.style.top = 12 + ((index * (53 + currentCampaignLevel().variant)) % 66) + "%";
}

function finish(won) {
  const finalWin = won && campaignLevelIndex === config.campaignLevels.length - 1;
  if (won) {
    const completedLevel = currentCampaignLevel();
    const stars = 1 + completedLevel.masteryRules.filter((rule) => remaining >= rule.target).length;
    campaignMastery[completedLevel.id] = Math.max(Number(campaignMastery[completedLevel.id]) || 0, stars);
  }
  setGameSessionState(won ? (finalWin ? "won" : "stage-complete") : "lost");
  if (timerId) window.clearInterval(timerId);
  timerId = null;
  target.disabled = true;
  target.hidden = true;
  status.textContent = won ? (finalWin ? "20 关信号链路全部完成。" : "第 " + (campaignLevelIndex + 1) + " 关信号链路已完成。") : "第 " + (campaignLevelIndex + 1) + " 关信号窗口关闭，可重试本关。";
  arena.dataset.state = won ? (finalWin ? "won" : "stage-complete") : "lost";
  setAmbient(false);
  playClip(won ? "victory" : "defeat", won ? 720 : 180);
  if (won && !finalWin) {
    campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex + 1);
    campaignLevelIndex += 1;
    saveCampaign();
    syncCampaignUi();
    applyCampaignLevel();
    startButton.textContent = "进入第 " + (campaignLevelIndex + 1) + " 关";
  } else if (finalWin) {
    campaignMaxUnlocked = config.campaignLevels.length - 1;
    saveCampaign();
    startButton.textContent = "重玩第 20 关";
  } else startButton.textContent = "重试本关";
  startCard.hidden = false;
}

function collect() {
  if (!running) return;
  score += 1;
  scoreValue.textContent = String(score).padStart(2, "0");
  playClip("collect", 320 + score * 34);
  if (score >= currentGoal) {
    finish(true);
    return;
  }
  status.textContent = "已捕获 " + score + " / " + currentGoal + " 个信号";
  moveTarget();
}

function start() {
  if (timerId) window.clearInterval(timerId);
  score = 0;
  applyCampaignLevel();
  remaining = currentDuration;
  setGameSessionState("playing");
  arena.dataset.state = "running";
  scoreValue.textContent = "00";
  timerValue.textContent = String(remaining);
  status.textContent = "第 " + (campaignLevelIndex + 1) + " 关搜索中：捕获 " + currentGoal + " 个橙红信号。";
  target.disabled = false;
  target.hidden = false;
  startCard.hidden = true;
  setAmbient(true);
  moveTarget();
  timerId = window.setInterval(() => {
    remaining -= 1;
    timerValue.textContent = String(remaining);
    if (remaining === 10) playClip("warning", 174);
    if (remaining <= 0) finish(false);
  }, 1000);
}

function returnToSetup() {
  if (timerId) window.clearInterval(timerId);
  timerId = null;
  setGameSessionState("idle");
  target.disabled = true;
  target.hidden = true;
  arena.dataset.state = "idle";
  setAmbient(false);
  status.textContent = "已返回启动页，可调整关卡与声音后重新开始。";
  startButton.textContent = "重新进入雾港";
  startCard.hidden = false;
}

target.addEventListener("click", collect);
restartButton.addEventListener("click", start);
backToSetupButton.addEventListener("click", returnToSetup);
startButton.addEventListener("click", start);
soundToggle.addEventListener("click", toggleSound);
campaignSelect.addEventListener("change", () => {
  campaignLevelIndex = Math.min(campaignMaxUnlocked, Math.max(0, Number(campaignSelect.value) || 0));
  saveCampaign(); syncCampaignUi(); applyCampaignLevel();
});
document.addEventListener("visibilitychange", () => setAmbient(running && !document.hidden));
loadCampaign();
applyCampaignLevel();
const gameDebugApi = {
  getState: () => ({ score, remaining, running, soundEnabled, state: arena.dataset.state, campaign: { level: currentCampaignLevel(), maxUnlocked: campaignMaxUnlocked + 1, total: config.campaignLevels.length, mastery: { ...campaignMastery }, stars: Object.values(campaignMastery).reduce((sum, value) => sum + Number(value || 0), 0) }, goal: currentGoal }),
  collect,
  forceWin: () => finish(true),
  restart: start,
  setLevel: (level) => { campaignLevelIndex = Math.max(0, Math.min(19, Number(level) - 1)); campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex); syncCampaignUi(); applyCampaignLevel(); saveCampaign(); },
};
if (new URLSearchParams(location.search).has("probe")) window.__GAME_DEBUG__ = gameDebugApi;
`;
}

const gameStyles = `:root{font-family:Inter,"Microsoft YaHei",sans-serif;color:#f1eee7;background:#0e1313;color-scheme:dark}*{box-sizing:border-box;touch-action:manipulation}body{margin:0;min-height:100vh;background:#0e1313}.game-shell{width:min(1180px,100%);min-height:100vh;margin:auto;padding:clamp(18px,3.5vw,46px);display:grid;grid-template-rows:auto 1fr auto;gap:18px}.game-header{display:flex;align-items:end;justify-content:space-between;gap:24px}.title-lockup{display:flex;align-items:end;gap:18px}.chapter{padding-bottom:5px;color:#e7673f;font:600 11px/1 ui-monospace,Consolas,monospace;letter-spacing:.12em}.chapter::before{content:"01";display:block;margin-bottom:8px;color:#f1eee7;font-size:26px;letter-spacing:-.05em}h1{margin:0;font-size:clamp(32px,6vw,70px);font-weight:620;line-height:.92;letter-spacing:-.055em}.kicker{display:block;margin-bottom:9px;color:#d97859;font:600 10px/1 ui-monospace,Consolas,monospace;letter-spacing:.12em;text-transform:uppercase}.vision{max-width:430px;margin:0;color:#a9b1ad;font-size:13px;line-height:1.6}.arena{position:relative;min-height:480px;overflow:hidden;border:1px solid #414b48;background:#17201f url("./assets/arena-background.png") center/cover no-repeat;box-shadow:0 22px 60px #050a0a88}.arena::before{position:absolute;z-index:1;inset:0;background:linear-gradient(180deg,#0c151533 0%,#07100f55 55%,#050908aa 100%),radial-gradient(circle at 50% 48%,transparent 0 28%,#07100f88 100%);content:"";pointer-events:none}.arena::after{position:absolute;z-index:1;inset:14px;border:1px solid #dbe7df26;content:"";pointer-events:none}.target{position:absolute;z-index:4;width:clamp(60px,7vw,82px);aspect-ratio:1;border:1px solid #ffb195;border-radius:50%;transform:translate(-50%,-50%);cursor:pointer;background-color:#e85f34;background-image:url("./assets/gameplay-atlas.png");background-position:0 0;background-size:300% 300%;background-repeat:no-repeat;box-shadow:0 0 0 9px #ee684038,0 0 40px #ff70489c;transition:left .2s ease,top .2s ease,transform .12s ease,box-shadow .12s ease}.target::before,.target::after{position:absolute;inset:-18px;border:1px solid #ff8b634f;border-radius:50%;content:""}.target::after{inset:-31px;border-color:#ff8b6326}.target:hover,.target:focus-visible{outline:2px solid #f1eee7;outline-offset:7px;transform:translate(-50%,-50%) scale(1.08);box-shadow:0 0 0 10px #ee684044,0 0 55px #ff7048bb}.start-card{position:absolute;z-index:5;left:50%;top:50%;width:min(390px,calc(100% - 36px));padding:28px;transform:translate(-50%,-50%);border:1px solid #8a938e;background:#101817eb;box-shadow:0 26px 70px #020606aa;backdrop-filter:blur(8px)}.start-card .card-index{display:block;margin-bottom:38px;color:#d97859;font:600 10px/1 ui-monospace,Consolas,monospace;letter-spacing:.14em}.start-card h2{margin:0;font-size:31px;letter-spacing:-.035em}.start-card p{margin:10px 0 22px;color:#b7c0bc;font-size:13px;line-height:1.6}.primary,.secondary{min-height:44px;border:1px solid #e86840;padding:0 18px;font:600 12px/1 Inter,"Microsoft YaHei",sans-serif;letter-spacing:.02em;cursor:pointer}.primary{width:100%;background:#e86840;color:#111815}.primary:hover{background:#f07952}.primary:focus-visible,.secondary:focus-visible{outline:2px solid #f1eee7;outline-offset:3px}.secondary{background:#121817;color:#e9e5dc;border-color:#59635f}.secondary:hover{border-color:#8d9893;background:#1b2422}.controls{display:grid;grid-template-columns:auto minmax(180px,1fr) auto;align-items:center;gap:18px}.hud{display:flex;gap:7px}.metric{min-width:105px;padding:10px 13px;border:1px solid #36403d;background:#141b1a}.metric>span{display:block;margin-bottom:4px;color:#84908b;font:600 9px/1 ui-monospace,Consolas,monospace;letter-spacing:.1em;text-transform:uppercase}.metric strong{font:500 23px/1 ui-monospace,Consolas,monospace}.metric strong span{display:inline}.status{margin:0;color:#b9c1bd;font-size:12px;letter-spacing:.01em}.control-actions{display:flex;gap:7px}.arena[data-state=won]{border-color:#61bd8b}.arena[data-state=won]::before{background:linear-gradient(#0c171344,#0a1d1588)}.arena[data-state=lost]{border-color:#bb685d}[hidden]{display:none!important}@media(max-width:720px){.game-header{align-items:start;flex-direction:column}.title-lockup{align-items:start}.chapter{display:none}.vision{display:none}.arena{min-height:58vh;background-position:50% center}.game-shell{padding:16px}.controls{grid-template-columns:1fr;gap:10px}.status{grid-row:1}.hud{width:100%}.metric{flex:1}.control-actions{display:grid;grid-template-columns:1fr 1fr}.secondary{width:100%}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}`;

const stageBSignalStyles = `.target{background-image:url("./assets/sprites/sprite-01.png");background-size:contain;background-position:center}.signal-level-field{display:grid;gap:6px;margin:0 0 7px}.signal-level-field>span{color:#9faeaa;font-size:10px}.signal-level-field select{width:100%;min-height:44px;border:1px solid #59635f;padding:0 34px 0 11px;background:#121817;color:#e9e5dc;font:600 12px/1 Inter,"Microsoft YaHei",sans-serif}.signal-level-field select:disabled{opacity:.7}.start-card [data-campaign-progress]{display:block;margin:0 0 14px;color:#9faeaa;font-size:10px;line-height:1.4}`;

const signalMasteryStyles = `.signal-mastery-card{display:grid;gap:6px;margin:0 0 12px;padding:11px 12px;border:1px solid rgba(232,104,64,.48);background:rgba(232,104,64,.07);text-align:left}.signal-mastery-card strong{color:#f1eee7;font-size:12px;line-height:1.4}.signal-mastery-card ul{display:grid;gap:3px;margin:0;padding-left:17px;color:#aeb9b4;font-size:10px;line-height:1.35}.signal-mastery-card li::marker{color:#e86840}.signal-mastery-card small{color:#e99879;font-size:10px;font-weight:700;line-height:1.35}`;

const signalMobilePlayFlowStyles = `.signal-setup-actions{display:grid;grid-template-columns:1fr;gap:7px;margin:8px 0}.signal-setup-actions .secondary{width:100%}
@media(max-width:720px){body{display:grid;width:100%;height:100svh;min-height:100svh;overflow:hidden;place-items:center;background:#0e1313 url("./assets/arena-background.png") center/cover no-repeat}.game-shell{position:relative;width:min(100vw,56.25svh);height:min(100svh,177.7778vw);min-height:0;padding:0;gap:0;grid-template-rows:1fr}.game-header{display:none}.arena{width:100%;height:100%;min-height:0;border:0}.start-card{top:50%;width:calc(100% - 24px);max-height:calc(100% - 24px);padding:18px;overflow:auto;overscroll-behavior:contain}.start-card .card-index{margin-bottom:18px}.start-card p{margin-bottom:14px}.controls{position:absolute;z-index:7;inset:0;display:block;pointer-events:none}.hud{position:absolute;top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));display:flex;width:auto;pointer-events:none}.metric{min-width:74px;padding:7px 9px;background:rgba(20,27,26,.86);backdrop-filter:blur(12px)}.metric strong{font-size:17px}.status{position:absolute;right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));left:max(8px,env(safe-area-inset-left));padding:8px 10px;background:rgba(20,27,26,.86);font-size:11px;line-height:1.35;backdrop-filter:blur(12px)}.control-actions{position:absolute;z-index:2;top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left));display:flex;gap:5px;pointer-events:auto}.control-actions .secondary{width:auto;min-width:44px;min-height:44px;padding:0 9px;background:rgba(18,24,23,.88);backdrop-filter:blur(12px)}body:not([data-game-state=playing]) .controls{display:none}}
@media(max-width:360px){.start-card{width:calc(100% - 14px);padding:14px}.start-card h2{font-size:25px}.start-card p{font-size:11px}.metric{min-width:66px;padding-inline:6px}.control-actions .secondary{padding-inline:7px;font-size:11px}}`;

function gameHtml(project: ProjectDetail) {
  const style = visualStyleDirection(project);
  const campaignLevels = createCampaignLevels(project.spec.template, project.spec.difficulty);
  const campaignOptions = campaignLevels.map((level, index) => `<option value="${index}"${index > 0 ? " disabled" : ""}>${escapeHtml(level.label)}</option>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0e1313"><title>${escapeHtml(project.title)}</title><link rel="preload" as="image" href="./assets/arena-background.png"><link rel="preload" as="image" href="./assets/gameplay-atlas.png"><link rel="stylesheet" href="./styles.css"><script src="./app.js" defer></script></head><body data-visual-style="${project.spec.visualStyle}" data-detail-level="${style.detailLevel}"><main class="game-shell"><header class="game-header"><div class="title-lockup"><span class="chapter">SIGNAL<br>SEARCH</span><div><span class="kicker">造界 · 雾港行动</span><h1>${escapeHtml(project.title)}</h1><span class="style-mode">${style.label} · ${style.detailLabel} · ${style.layout}</span></div></div><p class="vision">${escapeHtml(project.spec.vision)}</p></header><section class="arena" id="arena" data-state="idle" aria-label="雾港信号搜寻区"><div class="start-card" id="start-card"><span class="card-index">MISSION / 01 OF 20</span><h2>重建信号链路</h2><p>在 30 秒内捕获移动信号，难度按每四关一档逐步提升。</p><label class="signal-level-field"><span>渐进关卡</span><select data-campaign-level aria-label="选择渐进关卡">${campaignOptions}</select></label><small data-campaign-progress>第 1 / 20 关 · 认识规则</small><div class="signal-setup-actions"><button class="secondary" id="sound-toggle" type="button" aria-pressed="true">声音开启</button></div><button class="primary" id="start" type="button">进入雾港</button></div><button class="target" id="target" type="button" aria-label="捕获发光信号" hidden></button></section><footer class="controls"><div class="hud"><div class="metric"><span>已捕获</span><strong><span id="score-value">00</span> / <span id="goal-value">08</span></strong></div><div class="metric"><span>剩余时间</span><strong><span id="timer-value">30</span>s</strong></div></div><p class="status" id="status" aria-live="polite">等待进入搜寻区。</p><div class="control-actions"><button class="secondary" id="back-to-setup" type="button" aria-label="返回启动设置">返回</button><button class="secondary" id="restart" type="button">重开</button></div></footer></main></body></html>`;
}

const templateStyles = `:root{font-family:Inter,"Microsoft YaHei",sans-serif;color:#f2eee4;background:#101615;color-scheme:dark;--accent:#df6842;--accent-soft:#e3bd68;--surface:#111a18;--line:#53605b}*{box-sizing:border-box;touch-action:manipulation}body{margin:0;min-height:100vh;background:#0c1211 url("./assets/cover.png") center/cover fixed no-repeat}body::before{position:fixed;inset:0;background:rgba(6,12,11,.86);content:"";pointer-events:none}body[data-template=puzzle]{--accent:#a75d48;--accent-soft:#d1bd76}body[data-template=breakout]{--accent:#d96039;--accent-soft:#d8b35b}body[data-template=klotski]{--accent:#a84632;--accent-soft:#d7c197}body[data-template=maze]{--accent:#c69545;--accent-soft:#a9bd82}body[data-template=snake]{--accent:#d95c37;--accent-soft:#8eb69a}.template-shell{position:relative;z-index:1;width:min(1240px,100%);min-height:100vh;margin:auto;padding:clamp(18px,3vw,42px);display:grid;grid-template-rows:auto 1fr;gap:20px}.template-header{display:flex;align-items:end;justify-content:space-between;gap:28px}.template-header h1{margin:7px 0 0;font-size:clamp(36px,6vw,74px);font-weight:620;line-height:.9;letter-spacing:-.055em}.eyebrow{color:var(--accent);font:650 10px/1 ui-monospace,Consolas,monospace;letter-spacing:.13em}.template-header p{max-width:440px;margin:0;color:#abb6b0;font-size:13px;line-height:1.6}.template-workspace{display:grid;grid-template-columns:minmax(0,1fr) 310px;gap:14px;min-height:0}.canvas-frame{position:relative;display:grid;min-height:640px;place-items:center;overflow:hidden;border:1px solid #56635e;background:url("./assets/cover.png") center/cover no-repeat;box-shadow:0 28px 80px #020807aa}.canvas-frame::before{position:absolute;inset:0;background:rgba(6,14,13,.6);content:""}.game-canvas{position:relative;z-index:1;display:block;width:min(100%,720px);height:auto;max-height:78vh;aspect-ratio:1;border:1px solid rgba(224,232,222,.22);background:rgba(7,15,14,.48)}.game-overlay{position:absolute;z-index:3;left:50%;top:50%;width:min(390px,calc(100% - 34px));padding:27px;transform:translate(-50%,-50%);border:1px solid #87918b;background:rgba(12,20,18,.94);box-shadow:0 26px 70px #020606aa;backdrop-filter:blur(10px)}.game-overlay[hidden]{display:none}.game-overlay span{color:var(--accent);font:650 9px/1 ui-monospace,Consolas,monospace;letter-spacing:.13em}.game-overlay h2{margin:34px 0 9px;font-size:31px;letter-spacing:-.035em}.game-overlay p{margin:0 0 22px;color:#b9c2bd;font-size:13px;line-height:1.6}.primary,.secondary,.control-button,.upload-button{min-height:44px;border:1px solid var(--line);background:#131c1a;color:#f2eee4;font:650 12px/1 Inter,"Microsoft YaHei",sans-serif;letter-spacing:.02em;cursor:pointer}.primary{width:100%;border-color:var(--accent);background:var(--accent);color:#101615}.primary:hover{filter:brightness(1.08)}.primary:focus-visible,.secondary:focus-visible,.control-button:focus-visible,.upload-button:focus-within{outline:2px solid #f2eee4;outline-offset:3px}.game-panel{display:flex;min-width:0;flex-direction:column;gap:10px}.panel-block{padding:16px;border:1px solid #3e4945;background:rgba(15,23,21,.9)}.metric-label{display:block;color:#7f8e87;font:650 9px/1 ui-monospace,Consolas,monospace;letter-spacing:.11em;text-transform:uppercase}.metric-value{display:block;margin-top:8px;color:var(--accent-soft);font:500 34px/1 ui-monospace,Consolas,monospace}.status{margin:0;color:#c0c8c4;font-size:12px;line-height:1.55}.objective{margin:7px 0 0;color:#9eaaa4;font-size:11px;line-height:1.55}.touch-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.control-button{min-height:50px}.control-button:hover,.secondary:hover{border-color:#84918b;background:#1a2522}.upload-button{display:flex;align-items:center;justify-content:center;padding:0 12px;border-color:var(--accent);color:var(--accent-soft);text-align:center}.upload-button input{position:absolute;width:1px;height:1px;overflow:hidden;opacity:0}.upload-name{display:block;margin-top:8px;overflow:hidden;color:#8f9b95;font-size:10px;text-overflow:ellipsis;white-space:nowrap}.panel-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:auto}.secondary{padding:0 10px}.proof-note{color:#77847e;font:600 9px/1.5 ui-monospace,Consolas,monospace;letter-spacing:.06em}@media(max-width:860px){.template-header{align-items:start;flex-direction:column}.template-header p{display:none}.template-workspace{grid-template-columns:1fr}.canvas-frame{min-height:auto}.game-canvas{max-height:none}.game-panel{display:grid;grid-template-columns:1fr 1fr}.panel-block:first-child{grid-column:1/-1}.panel-actions{margin-top:0}.proof-note{grid-column:1/-1}}@media(max-width:520px){.template-shell{padding:14px;gap:14px}.template-header h1{font-size:42px}.canvas-frame{aspect-ratio:1}.game-overlay{padding:23px}.game-overlay h2{margin-top:26px;font-size:27px}.game-panel{grid-template-columns:1fr}.panel-block:first-child,.proof-note{grid-column:auto}.touch-controls{grid-template-columns:repeat(4,1fr)}.control-button{min-width:0;padding:0 6px}.panel-actions{position:sticky;bottom:8px}}@media(prefers-reduced-motion:reduce){*{transition:none!important}}`;

const visualStyleVariables = `body[data-visual-style="classic"]{--theme-bg:#101720;--theme-text:#f0e6cf;--theme-muted:#ada78f;--theme-panel:rgba(16,23,32,.95);--theme-line:#8b8069;--theme-accent:#b14943;--theme-on-accent:#fff5d9;--theme-soft:#d4b66e;--theme-backdrop:rgba(7,12,17,.86);--theme-font:Georgia,"Songti SC",serif;--theme-radius:4px;--theme-shadow:0 22px 60px rgba(2,7,12,.58);--theme-gap:14px;--theme-panel-padding:18px}body[data-visual-style="calm"]{--theme-bg:#1c2729;--theme-text:#dce2dd;--theme-muted:#98a8a4;--theme-panel:rgba(25,36,38,.94);--theme-line:#526665;--theme-accent:#769d97;--theme-on-accent:#101719;--theme-soft:#a7aea1;--theme-backdrop:rgba(22,32,34,.88);--theme-font:Inter,"Microsoft YaHei",sans-serif;--theme-radius:12px;--theme-shadow:0 18px 48px rgba(8,16,18,.36);--theme-gap:22px;--theme-panel-padding:20px}body[data-visual-style="fashion"]{--theme-bg:#120f24;--theme-text:#f8f2e9;--theme-muted:#b5abc9;--theme-panel:rgba(24,18,45,.95);--theme-line:#6d5a91;--theme-accent:#ff5f6d;--theme-on-accent:#170e24;--theme-soft:#67e8d2;--theme-backdrop:rgba(14,10,30,.82);--theme-font:Arial,"Microsoft YaHei",sans-serif;--theme-radius:2px;--theme-shadow:10px 12px 0 rgba(103,232,210,.2);--theme-gap:12px;--theme-panel-padding:18px}body[data-visual-style="cute"]{--theme-bg:#fff4f6;--theme-text:#66546b;--theme-muted:#8f7c93;--theme-panel:rgba(255,250,250,.96);--theme-line:#e8bdc9;--theme-accent:#ee8da7;--theme-on-accent:#4c3c52;--theme-soft:#69bfb2;--theme-backdrop:rgba(255,239,242,.8);--theme-font:"Microsoft YaHei",sans-serif;--theme-radius:24px;--theme-shadow:0 18px 48px rgba(127,83,103,.17);--theme-gap:16px;--theme-panel-padding:20px}body[data-visual-style="line-art"]{--theme-bg:#faf8f1;--theme-text:#202020;--theme-muted:#66635d;--theme-panel:rgba(255,253,247,.98);--theme-line:#202020;--theme-accent:#202020;--theme-on-accent:#faf8f1;--theme-soft:#77736c;--theme-backdrop:rgba(250,248,241,.91);--theme-font:Georgia,"Songti SC",serif;--theme-radius:2px;--theme-shadow:3px 3px 0 #202020;--theme-gap:18px;--theme-panel-padding:16px}body[data-visual-style="color-block"]{--theme-bg:#f6e946;--theme-text:#171717;--theme-muted:#3e3b22;--theme-panel:#fffdf2;--theme-line:#171717;--theme-accent:#ee4d37;--theme-on-accent:#fffdf2;--theme-soft:#2f65d9;--theme-backdrop:rgba(246,233,70,.58);--theme-font:Arial Black,"Microsoft YaHei",sans-serif;--theme-radius:4px;--theme-shadow:5px 5px 0 #171717;--theme-gap:16px;--theme-panel-padding:16px}body[data-visual-style="cute"],body[data-visual-style="line-art"],body[data-visual-style="color-block"]{color-scheme:light}`;

const colorBlockClarityStyles = `body[data-visual-style="color-block"]{--theme-bg:#f3efe4;--theme-text:#171717;--theme-muted:#575044;--theme-panel:#fffdf2;--theme-line:#29251f;--theme-accent:#d94732;--theme-on-accent:#fffdf2;--theme-soft:#2f65d9;--theme-backdrop:rgba(243,239,228,.82);--theme-shadow:5px 5px 0 #29251f}`;

const templateVisualStyles = `${visualStyleVariables}
${colorBlockClarityStyles}
body[data-visual-style]{color:var(--theme-text);background-color:var(--theme-bg);--accent:var(--theme-accent);--accent-soft:var(--theme-soft);--line:var(--theme-line)}
body[data-visual-style]::before{background:var(--theme-backdrop)}
body[data-visual-style] .template-shell{gap:var(--theme-gap)}
body[data-visual-style] .template-header h1,body[data-visual-style] .game-overlay h2{font-family:var(--theme-font);text-wrap:balance}
body[data-visual-style] .template-header p,body[data-visual-style] .game-overlay p,body[data-visual-style] .status,body[data-visual-style] .objective,body[data-visual-style] .rule-note,body[data-visual-style] .upload-name,body[data-visual-style] .proof-note{color:var(--theme-muted)}
body[data-visual-style] .template-workspace{gap:var(--theme-gap)}
body[data-visual-style] .canvas-frame{border-color:var(--theme-line);border-radius:var(--theme-radius);box-shadow:var(--theme-shadow)}
body[data-visual-style] .canvas-frame::before{background:var(--theme-backdrop)}
body[data-visual-style] .game-canvas{border-color:var(--theme-line)}
body[data-visual-style] .game-overlay,body[data-visual-style] .panel-block,body[data-visual-style] .source-proof{padding:var(--theme-panel-padding);border-color:var(--theme-line);border-radius:var(--theme-radius);background:var(--theme-panel)}
body[data-visual-style] .game-overlay{box-shadow:var(--theme-shadow)}
body[data-visual-style] .primary,body[data-visual-style] .secondary,body[data-visual-style] .control-button,body[data-visual-style] .upload-button{border-color:var(--theme-line);border-radius:calc(var(--theme-radius) * .72);background:var(--theme-panel);color:var(--theme-text);transition:transform 120ms ease,background-color 160ms ease,border-color 160ms ease}
body[data-visual-style] .primary{border-color:var(--theme-accent);background:var(--theme-accent);color:var(--theme-on-accent)}
body[data-visual-style] button:active{transform:scale(.97)}
body[data-visual-style] .metric-value{color:var(--theme-soft);font-variant-numeric:tabular-nums}
body[data-visual-style] .metric-label,body[data-visual-style] .eyebrow,body[data-visual-style] .style-mode{color:var(--theme-accent)}
.style-mode{display:block;margin-top:8px;font:650 9px/1.4 ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase}
.style-ornament{position:fixed;z-index:0;inset:0;overflow:hidden;pointer-events:none}
.style-ornament i{position:absolute;display:block;border:1px solid var(--theme-line);opacity:.52}

body[data-visual-style="classic"] .template-shell{width:min(1190px,100%)}
body[data-visual-style="classic"] .template-header{align-items:center;padding:14px 0 18px;border-top:1px solid var(--theme-line);border-bottom:3px double var(--theme-line);text-align:center}
body[data-visual-style="classic"] .template-header>div{flex:1}
body[data-visual-style="classic"] .template-header h1{font-weight:500;letter-spacing:-.025em}
body[data-visual-style="classic"] .template-header p{max-width:360px;text-align:left}
body[data-visual-style="classic"] .canvas-frame::after{position:absolute;z-index:2;inset:14px;border:3px double color-mix(in srgb,var(--theme-line) 65%,transparent);content:"";pointer-events:none}
body[data-visual-style="classic"] .panel-block,body[data-visual-style="classic"] .source-proof{outline:1px solid color-mix(in srgb,var(--theme-line) 35%,transparent);outline-offset:-6px}
body[data-visual-style="classic"] .style-ornament i{width:10px;height:10px;transform:rotate(45deg);background:var(--theme-soft)}
body[data-visual-style="classic"] .style-ornament i:nth-child(1){top:34px;left:4vw}body[data-visual-style="classic"] .style-ornament i:nth-child(2){top:34px;right:4vw}body[data-visual-style="classic"] .style-ornament i:nth-child(3){bottom:34px;left:4vw}body[data-visual-style="classic"] .style-ornament i:nth-child(4){bottom:34px;right:4vw}

body[data-visual-style="calm"] .template-shell{width:min(1160px,100%);padding:clamp(24px,4vw,58px)}
body[data-visual-style="calm"] .template-header{align-items:start;padding-left:20px;border-left:2px solid var(--theme-accent)}
body[data-visual-style="calm"] .template-header h1{max-width:720px;font-weight:500;letter-spacing:-.035em}
body[data-visual-style="calm"] .template-workspace{grid-template-columns:minmax(0,1fr) 292px}
body[data-visual-style="calm"] .game-panel{gap:16px}
body[data-visual-style="calm"] .canvas-frame::after{position:absolute;z-index:2;inset:24px;border:1px solid color-mix(in srgb,var(--theme-line) 38%,transparent);border-radius:8px;content:"";pointer-events:none}
body[data-visual-style="calm"] .style-ornament i{width:160px;height:160px;border-radius:50%;opacity:.12}body[data-visual-style="calm"] .style-ornament i:nth-child(1){top:-70px;right:8vw}body[data-visual-style="calm"] .style-ornament i:nth-child(2){bottom:-100px;left:5vw}body[data-visual-style="calm"] .style-ornament i:nth-child(n+3){display:none}

body[data-visual-style="fashion"] .template-header{display:grid;grid-template-columns:minmax(0,1fr) minmax(240px,.55fr);align-items:end;padding:0 18px 14px 0;border-bottom:1px solid var(--theme-soft)}
body[data-visual-style="fashion"] .template-header h1{text-transform:uppercase;font-style:italic;letter-spacing:-.07em}
body[data-visual-style="fashion"] .template-header>div{position:relative}
body[data-visual-style="fashion"] .template-header>div::before{position:absolute;top:-14px;left:-18px;width:58px;height:7px;background:var(--theme-accent);content:"";transform:skewX(-24deg)}
body[data-visual-style="fashion"] .canvas-frame{clip-path:polygon(0 0,96% 0,100% 6%,100% 100%,4% 100%,0 94%)}
body[data-visual-style="fashion"] .game-panel{transform:translateY(34px)}
body[data-visual-style="fashion"] .panel-block,body[data-visual-style="fashion"] .source-proof{clip-path:polygon(0 0,95% 0,100% 16px,100% 100%,0 100%)}
body[data-visual-style="fashion"] .game-overlay{border-left:7px solid var(--theme-accent);transform:translate(-50%,-50%) skewY(-1deg)}
body[data-visual-style="fashion"] .game-overlay>*{transform:skewY(1deg)}
body[data-visual-style="fashion"] .style-ornament i{width:190px;height:18px;border:0;background:var(--theme-accent);transform:skewX(-25deg) rotate(-12deg)}body[data-visual-style="fashion"] .style-ornament i:nth-child(1){top:8%;right:-70px}body[data-visual-style="fashion"] .style-ornament i:nth-child(2){bottom:10%;left:-90px;background:var(--theme-soft)}body[data-visual-style="fashion"] .style-ornament i:nth-child(3){top:36%;left:-110px;width:240px;height:2px;background:var(--theme-text)}body[data-visual-style="fashion"] .style-ornament i:nth-child(4){bottom:24%;right:-100px;width:260px;height:2px;background:var(--theme-soft)}

body[data-visual-style="cute"] .template-header{align-items:center;padding:14px 20px;border:1px solid var(--theme-line);border-radius:28px;background:var(--theme-panel);box-shadow:0 10px 30px rgba(127,83,103,.12)}
body[data-visual-style="cute"] .template-header h1{font-weight:750;letter-spacing:-.04em}
body[data-visual-style="cute"] .canvas-frame{border-width:3px;border-radius:34px}
body[data-visual-style="cute"] .game-canvas{border-radius:24px}
body[data-visual-style="cute"] .game-panel{gap:14px}
body[data-visual-style="cute"] .primary,body[data-visual-style="cute"] .secondary,body[data-visual-style="cute"] .control-button,body[data-visual-style="cute"] .upload-button{border-radius:999px}
body[data-visual-style="cute"] .control-button:hover{transform:translateY(-2px) rotate(-1deg)}
body[data-visual-style="cute"] .style-ornament i{border:0;border-radius:50%;background:var(--theme-accent);opacity:.2}body[data-visual-style="cute"] .style-ornament i:nth-child(1){top:6%;left:3%;width:34px;height:34px}body[data-visual-style="cute"] .style-ornament i:nth-child(2){top:13%;left:7%;width:12px;height:12px;background:var(--theme-soft)}body[data-visual-style="cute"] .style-ornament i:nth-child(3){bottom:8%;right:4%;width:54px;height:54px}body[data-visual-style="cute"] .style-ornament i:nth-child(4){bottom:17%;right:9%;width:18px;height:18px;background:var(--theme-soft)}body[data-visual-style="cute"] .style-ornament i:nth-child(5){top:42%;right:2%;width:9px;height:9px}body[data-visual-style="cute"] .style-ornament i:nth-child(6){bottom:34%;left:2%;width:16px;height:16px;background:var(--theme-soft)}

body[data-visual-style="line-art"]{background-image:repeating-linear-gradient(0deg,transparent 0 31px,rgba(32,32,32,.055) 31px 32px)}
body[data-visual-style="line-art"]::before{display:none}
body[data-visual-style="line-art"] .template-header{align-items:start;border-bottom:2px solid var(--theme-line)}
body[data-visual-style="line-art"] .template-header h1{font-weight:500;letter-spacing:-.025em}
body[data-visual-style="line-art"] .canvas-frame{background:#f8f5ec;border-width:2px}
body[data-visual-style="line-art"] .canvas-frame::before{background:rgba(250,248,241,.72)}
body[data-visual-style="line-art"] .game-overlay,body[data-visual-style="line-art"] .panel-block,body[data-visual-style="line-art"] .source-proof{border-width:2px;box-shadow:4px 4px 0 var(--theme-line)}
body[data-visual-style="line-art"] .primary,body[data-visual-style="line-art"] .secondary,body[data-visual-style="line-art"] .control-button{border-width:2px;box-shadow:2px 2px 0 var(--theme-line)}
body[data-visual-style="line-art"] .style-ornament i{width:86px;height:1px;border:0;background:var(--theme-line);opacity:.2;transform:rotate(-18deg)}body[data-visual-style="line-art"] .style-ornament i:nth-child(1){top:12%;right:2%}body[data-visual-style="line-art"] .style-ornament i:nth-child(2){top:14%;right:1%}body[data-visual-style="line-art"] .style-ornament i:nth-child(3){bottom:8%;left:2%}body[data-visual-style="line-art"] .style-ornament i:nth-child(n+4){display:none}

body[data-visual-style="color-block"] .template-shell{width:min(1300px,100%)}
body[data-visual-style="color-block"] .template-header{align-items:center;padding:14px 18px;border:2px solid var(--theme-line);background:var(--theme-panel);box-shadow:4px 4px 0 var(--theme-line)}
body[data-visual-style="color-block"] .template-header h1{text-transform:uppercase;font-size:clamp(36px,6vw,68px);font-weight:900;letter-spacing:-.055em}
body[data-visual-style="color-block"] .canvas-frame,body[data-visual-style="color-block"] .game-overlay,body[data-visual-style="color-block"] .panel-block,body[data-visual-style="color-block"] .source-proof,body[data-visual-style="color-block"] .primary,body[data-visual-style="color-block"] .secondary,body[data-visual-style="color-block"] .control-button{border-width:2px}
body[data-visual-style="color-block"] .game-panel .panel-block:nth-child(even){transform:translateX(4px);background:var(--theme-soft);color:var(--theme-on-accent)}
body[data-visual-style="color-block"] .primary{box-shadow:3px 3px 0 var(--theme-line)}
body[data-visual-style="color-block"] .style-ornament i{border:3px solid var(--theme-line);background:var(--theme-accent);opacity:1}body[data-visual-style="color-block"] .style-ornament i:nth-child(1){top:5%;left:1%;width:32px;height:90px}body[data-visual-style="color-block"] .style-ornament i:nth-child(2){top:18%;right:1%;width:52px;height:52px;background:var(--theme-soft)}body[data-visual-style="color-block"] .style-ornament i:nth-child(3){bottom:6%;left:2%;width:90px;height:28px;background:var(--theme-panel)}body[data-visual-style="color-block"] .style-ornament i:nth-child(4){bottom:4%;right:2%;width:26px;height:74px}

@media(max-width:860px){body[data-visual-style="fashion"] .game-panel,body[data-visual-style="color-block"] .game-panel .panel-block:nth-child(even){transform:none}body[data-visual-style] .template-header{display:flex;align-items:start;flex-direction:column;text-align:left}body[data-visual-style="classic"] .template-header>div{width:100%}body[data-visual-style="classic"] .template-header p{text-align:left}}
@media(prefers-reduced-motion:reduce){body[data-visual-style] *{transition:none!important}}`;

const signalVisualStyles = `${visualStyleVariables}
${colorBlockClarityStyles}
body[data-visual-style]{color:var(--theme-text);background:var(--theme-bg)}body[data-visual-style] h1,body[data-visual-style] .start-card h2{font-family:var(--theme-font)}body[data-visual-style] .vision,body[data-visual-style] .status,body[data-visual-style] .start-card p,body[data-visual-style] .metric>span{color:var(--theme-muted)}body[data-visual-style] .arena{border-color:var(--theme-line);border-radius:var(--theme-radius);box-shadow:var(--theme-shadow)}body[data-visual-style] .start-card,body[data-visual-style] .metric,body[data-visual-style] .secondary{padding:var(--theme-panel-padding);border-color:var(--theme-line);border-radius:var(--theme-radius);background:var(--theme-panel);color:var(--theme-text)}body[data-visual-style] .primary{border-color:var(--theme-accent);border-radius:calc(var(--theme-radius) * .72);background:var(--theme-accent);color:var(--theme-on-accent)}body[data-visual-style] .chapter,body[data-visual-style] .kicker,body[data-visual-style] .start-card .card-index,body[data-visual-style] .style-mode{color:var(--theme-accent)}body[data-visual-style] .style-mode{display:block;margin-top:8px;font:650 9px/1.4 ui-monospace,Consolas,monospace;letter-spacing:.08em;text-transform:uppercase}body[data-visual-style] .target{border-color:var(--theme-text);background-color:var(--theme-accent);box-shadow:0 0 0 9px color-mix(in srgb,var(--theme-accent) 25%,transparent),0 0 42px var(--theme-accent)}body[data-visual-style="classic"] .game-header{padding-bottom:14px;border-bottom:3px double var(--theme-line)}body[data-visual-style="calm"] .game-shell{gap:28px;padding:clamp(24px,4vw,58px)}body[data-visual-style="fashion"] .game-header{transform:skewY(-1deg)}body[data-visual-style="fashion"] h1{text-transform:uppercase;font-style:italic}body[data-visual-style="fashion"] .start-card{border-left:7px solid var(--theme-accent)}body[data-visual-style="cute"] .primary,body[data-visual-style="cute"] .secondary{border-radius:999px}body[data-visual-style="cute"] .arena{border-width:3px;border-radius:34px}body[data-visual-style="line-art"]{background-image:repeating-linear-gradient(0deg,transparent 0 31px,rgba(32,32,32,.055) 31px 32px)}body[data-visual-style="line-art"] .arena::before{background:rgba(250,248,241,.62)}body[data-visual-style="line-art"] .start-card,body[data-visual-style="line-art"] .metric{border-width:2px;box-shadow:4px 4px 0 var(--theme-line)}body[data-visual-style="color-block"] .arena,body[data-visual-style="color-block"] .start-card,body[data-visual-style="color-block"] .metric,body[data-visual-style="color-block"] .primary,body[data-visual-style="color-block"] .secondary{border-width:3px}body[data-visual-style="color-block"] .game-header{padding:14px;border:3px solid var(--theme-line);background:var(--theme-panel);box-shadow:7px 7px 0 var(--theme-line)}`;

function signalAspectStyles(project: ProjectDetail) {
  if (project.spec.aspectRatio !== "9:16") return "";
  return `@media(max-width:720px){body{display:grid;min-height:100svh;place-items:start center}.game-shell{width:min(100vw,56.25svh,540px);height:auto;min-height:0;aspect-ratio:9/16;padding:max(10px,env(safe-area-inset-top)) 10px max(10px,env(safe-area-inset-bottom));gap:8px;grid-template-rows:auto minmax(0,1fr) auto}.game-header{align-items:flex-start}.title-lockup{align-items:flex-start}.chapter,.vision{display:none}h1{font-size:clamp(28px,8vw,42px)}.kicker{margin-bottom:5px}.style-mode{margin-top:4px!important}.arena{min-height:0;background-position:52% center}.arena::before{background:linear-gradient(180deg,rgba(6,12,14,.12),rgba(6,10,12,.42)),radial-gradient(circle at 50% 42%,transparent 0 24%,rgba(5,9,10,.54) 76%)}.target{width:clamp(82px,20vw,108px);box-shadow:0 0 0 12px color-mix(in srgb,var(--theme-accent) 28%,transparent),0 0 68px var(--theme-accent)}.start-card{top:43%;width:calc(100% - 38px);padding:22px}.start-card .card-index{margin-bottom:25px}.controls{grid-template-columns:1fr auto;gap:7px}.hud{grid-column:1}.status{grid-column:1/-1;grid-row:2}.control-actions{grid-column:2;grid-row:1;display:flex}.metric{min-width:0;flex:1;padding:8px 10px}.metric strong{font-size:19px}.secondary{min-width:44px;min-height:44px;padding:0 10px}}@media(max-width:420px){.game-shell{padding:max(7px,env(safe-area-inset-top)) 7px max(7px,env(safe-area-inset-bottom));gap:6px}.controls{gap:5px}.status{font-size:11px}.secondary{font-size:0}.secondary::first-letter{font-size:13px}.start-card{width:calc(100% - 24px);padding:19px}.start-card h2{font-size:27px}}`;
}

function templateScript(project: ProjectDetail) {
  const runtime = getRuntimeDefinition(project.spec.template);
  if (!runtime) throw new Error("模板运行时不存在。");
  const canvasSize = canvasDimensions(project);
  const campaignLevels = createCampaignLevels(project.spec.template, project.spec.difficulty);
  const builtInPuzzleLevels = puzzleBuiltInLevels;
  const puzzleLevels = project.spec.customImageDataUrl
    ? [{ id: "custom", label: "我的图片", path: "./assets/custom-puzzle.jpg" }, ...builtInPuzzleLevels]
    : builtInPuzzleLevels;
  const breakoutBaseLevels = [
    { id: "pearl-shoal", label: "01 珍珠浅湾", path: "./assets/cover.png", rows: 5, columns: 9, speed: 5.1, armorRate: 0 },
    { id: "coral-gate", label: "02 珊瑚回廊", path: "./assets/level-coral-gate.png", rows: 6, columns: 9, speed: 5.35, armorRate: .14 },
    { id: "jellyfish-tide", label: "03 水母潮汐", path: "./assets/level-jellyfish-tide.png", rows: 7, columns: 10, speed: 5.6, armorRate: .24 },
    { id: "star-reef", label: "04 星环礁", path: "./assets/level-star-reef.png", rows: 8, columns: 9, speed: 5.9, armorRate: .38 },
    { id: "abyss-crown", label: "05 深海王冠", path: "./assets/level-abyss-crown.png", rows: 8, columns: 10, speed: 6.25, armorRate: .52 },
  ];
  const breakoutLevels = campaignLevels.map((campaignLevel) => {
    const base = breakoutBaseLevels[campaignLevel.tier - 1];
    return {
      ...base,
      id: campaignLevel.id,
      label: campaignLevel.label,
      campaignLevel: campaignLevel.number,
      formationIndex: campaignLevel.number - 1,
      pattern: campaignLevel.ruleModifier,
      speed: Number((base.speed * campaignLevel.speedMultiplier).toFixed(3)),
      armorRate: Number(Math.min(.72, base.armorRate + (campaignLevel.tier - 1) * .045).toFixed(3)),
      rows: Math.min(9, base.rows + Math.floor((campaignLevel.tier - 1) / 2)),
    };
  });
  const config = safeJson({
    title: project.title,
    template: project.spec.template,
    difficulty: project.spec.difficulty,
    visualStyle: project.spec.visualStyle,
    puzzleRules: project.spec.puzzleRules,
    imagePath: project.spec.customImageDataUrl ? "./assets/custom-puzzle.jpg" : "./assets/cover.png",
    imageLevels: project.spec.template === "puzzle" ? puzzleLevels : [],
    breakoutLevels: project.spec.template === "breakout" ? breakoutLevels : [],
    aspectRatio: project.spec.aspectRatio,
    cameraMode: project.spec.cameraMode,
    inputModes: project.spec.inputModes,
    canvasWidth: canvasSize.width,
    canvasHeight: canvasSize.height,
    spriteFiles: Array.from({ length: 9 }, (_, index) => `./assets/sprites/sprite-${String(index + 1).padStart(2, "0")}.png`),
    stageCSpriteFiles: project.spec.template === "snake"
      ? ["snake-head", "snake-body-straight", "snake-body-corner", "snake-tail", "snake-food", "snake-obstacle", "snake-eat", "snake-danger", "snake-complete"].map((name) => `./assets/stage-c/${name}-v2.png`)
      : project.spec.template === "breakout"
        ? ["pearl", "coral", "jellyfish", "star", "abyss"].flatMap((level) => ["intact", "cracked", "critical"].map((state) => `./assets/stage-c/brick-${level}-${state}-v2.png`))
        : [],
    campaign: project.spec.levelProgression,
    campaignLevels,
    campaignStorageKey: `forge-campaign:${project.id}:${project.version.id}`,
    masteryStorageKey: `forge-mastery:${project.id}:${project.version.id}`,
  });
  return `${safeStorageShim}
const config = ${config};
document.body.dataset.gameState = "idle";
document.body.dataset.cameraMode = config.cameraMode;
const visualPalettes = {
  classic: {
    surface: "rgba(12,18,24,.9)", surfaceSoft: "rgba(227,211,170,.12)", grid: "rgba(227,211,170,.22)",
    primary: "#9e3f3c", secondary: "#d4b66e", accent: "#718399", highlight: "#fff2cf",
    text: "#f0e6cf", textSoft: "rgba(240,230,207,.76)", outline: "rgba(10,16,21,.62)",
    pieces: ["#a94742", "#d2b260", "#657f98", "#7d977b", "#c77852", "#9b7894", "#d8cfb9"]
  },
  calm: {
    surface: "rgba(24,35,37,.92)", surfaceSoft: "rgba(151,180,173,.12)", grid: "rgba(182,202,196,.17)",
    primary: "#769d97", secondary: "#a7aea1", accent: "#667b7d", highlight: "#e5e8df",
    text: "#dce2dd", textSoft: "rgba(220,226,221,.72)", outline: "rgba(18,27,29,.64)",
    pieces: ["#769d97", "#a7aea1", "#789092", "#91a58e", "#b28e7d", "#818b9a", "#c4c8bc"]
  },
  fashion: {
    surface: "rgba(20,15,39,.94)", surfaceSoft: "rgba(103,232,210,.14)", grid: "rgba(247,241,232,.18)",
    primary: "#ff5f6d", secondary: "#67e8d2", accent: "#2474e5", highlight: "#fff4e8",
    text: "#f8f2e9", textSoft: "rgba(248,242,233,.78)", outline: "rgba(10,7,24,.72)",
    pieces: ["#ff5f6d", "#67e8d2", "#2474e5", "#ffd166", "#ff8cc8", "#41a6e8", "#f8f2e9"]
  },
  cute: {
    surface: "rgba(255,246,247,.96)", surfaceSoft: "rgba(244,163,182,.2)", grid: "rgba(102,84,107,.13)",
    primary: "#ee8da7", secondary: "#8fd8cc", accent: "#bea6ed", highlight: "#fffdf9",
    text: "#66546b", textSoft: "rgba(102,84,107,.68)", outline: "rgba(102,84,107,.25)",
    pieces: ["#f49db4", "#94ded2", "#bba7ee", "#ffd07d", "#87bdeb", "#f4b28d", "#fff6d6"]
  },
  "line-art": {
    surface: "rgba(255,253,247,.97)", surfaceSoft: "rgba(32,32,32,.06)", grid: "rgba(32,32,32,.18)",
    primary: "#202020", secondary: "#707070", accent: "#b7b7b2", highlight: "#ffffff",
    text: "#202020", textSoft: "rgba(32,32,32,.72)", outline: "rgba(32,32,32,.72)",
    pieces: ["#202020", "#faf8f1", "#696969", "#d7d5ce", "#3f3f3f", "#b4b2ac", "#ffffff"]
  },
  "color-block": {
    surface: "rgba(18,22,23,.96)", surfaceSoft: "rgba(255,253,242,.1)", grid: "rgba(255,253,242,.16)",
    primary: "#ff654d", secondary: "#4f80f4", accent: "#27b883", highlight: "#fff4ca",
    text: "#fff8e8", textSoft: "rgba(255,248,232,.74)", outline: "rgba(3,7,8,.82)",
    pieces: ["#ff654d", "#4f80f4", "#27b883", "#f5d94e", "#f58bb4", "#ff9a38", "#fff4ca"]
  }
};
const palette = visualPalettes[config.visualStyle] || visualPalettes.classic;
const visualStyleProfiles = {
  classic: { motif: "ornate", detailDensity: 8, lineWidth: 2, corner: 2 },
  calm: { motif: "quiet", detailDensity: 2, lineWidth: 1, corner: 12 },
  fashion: { motif: "editorial", detailDensity: 7, lineWidth: 3, corner: 0 },
  cute: { motif: "playful", detailDensity: 10, lineWidth: 3, corner: 24 },
  "line-art": { motif: "sketch", detailDensity: 3, lineWidth: 2, corner: 0 },
  "color-block": { motif: "graphic", detailDensity: 5, lineWidth: 5, corner: 0 },
};
const styleProfile = visualStyleProfiles[config.visualStyle] || visualStyleProfiles.classic;
const canvas = document.querySelector("#game-canvas");
canvas.width = config.canvasWidth;
canvas.height = config.canvasHeight;
const ctx = canvas.getContext("2d");
const overlay = document.querySelector("#game-overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayDetail = document.querySelector("#overlay-detail");
const startButton = document.querySelector("#start");
const restartButton = document.querySelector("#restart");
const backToSetupButton = document.querySelector("#back-to-setup");
const soundToggle = document.querySelector("#sound-toggle");
const metricValue = document.querySelector("#metric-value");
const status = document.querySelector("#status");
const campaignSelect = document.querySelector("[data-campaign-level]");
const campaignProgressNodes = Array.from(document.querySelectorAll("[data-campaign-progress]"));
const masteryMissionNodes = Array.from(document.querySelectorAll("[data-mastery-mission]"));
const masteryObjectiveNodes = Array.from(document.querySelectorAll("[data-mastery-objectives]"));
const masterySummaryNodes = Array.from(document.querySelectorAll("[data-mastery-summary]"));
const sounds = {
  music: new Audio("./assets/music.wav"), ambient: new Audio("./assets/ambient.wav"),
  legal: new Audio("./assets/legal.wav"), illegal: new Audio("./assets/illegal.wav"), reward: new Audio("./assets/reward.wav"),
  hit: new Audio("./assets/hit.wav"), victory: new Audio("./assets/victory.wav"), defeat: new Audio("./assets/defeat.wav"), ui: new Audio("./assets/ui.wav")
};
const soundAliases = { move: "legal", success: "victory", fail: "defeat", collect: "reward", warning: "illegal" };
const backgroundArt = new Image();
const spriteImages = config.spriteFiles.map((path) => { const image = new Image(); image.decoding = "async"; image.src = path; return image; });
const stageCImages = (config.stageCSpriteFiles || []).map((path) => { const image = new Image(); image.decoding = "async"; image.src = path; return image; });
const bitmapSourceRects = new WeakMap();
let backgroundArtReady = false;
let redrawGameArt = () => {};
backgroundArt.decoding = "async";
backgroundArt.addEventListener("load", () => { backgroundArtReady = true; redrawGameArt(); });
spriteImages.forEach((image) => image.addEventListener("load", () => { cacheBitmapSourceRect(image); redrawGameArt(); }));
stageCImages.forEach((image) => image.addEventListener("load", () => { cacheBitmapSourceRect(image); redrawGameArt(); }));
backgroundArt.src = "./assets/background.png";
sounds.music.loop = true;
sounds.ambient.loop = true;
sounds.music.volume = .16;
sounds.ambient.volume = .22;
sounds.legal.volume = .5;
sounds.illegal.volume = .48;
sounds.reward.volume = .55;
sounds.hit.volume = .42;
sounds.victory.volume = .66;
sounds.defeat.volume = .56;
sounds.ui.volume = .42;
Object.values(sounds).forEach((audio) => { audio.preload = "auto"; });
const soundLastPlayed = new Map();
let running = false;
let gameSessionState = "idle";
let soundEnabled = true;
let runtimeDebugState = () => ({});
let runtimeDebugActions = {};
let campaignLevelIndex = 0;
let campaignMaxUnlocked = 0;
let campaignRandomState = 1;
let campaignMastery = {};

function readCampaignProgress() {
  if (!config.campaign?.persistProgress) return;
  try {
    const saved = JSON.parse(safeStorage.getItem(config.campaignStorageKey) || "null");
    if (!saved || typeof saved !== "object") return;
    campaignMaxUnlocked = Math.max(0, Math.min(config.campaignLevels.length - 1, Number(saved.maxUnlocked) || 0));
    campaignLevelIndex = Math.max(0, Math.min(campaignMaxUnlocked, Number(saved.current) || 0));
    campaignMastery = saved.mastery && typeof saved.mastery === "object" ? saved.mastery : {};
  } catch {}
}

function writeCampaignProgress() {
  if (!config.campaign?.persistProgress) return;
  try {
    safeStorage.setItem(config.campaignStorageKey, JSON.stringify({
      schemaVersion: 1,
      current: campaignLevelIndex,
      maxUnlocked: campaignMaxUnlocked,
      mastery: campaignMastery,
      updatedAt: new Date().toISOString(),
    }));
  } catch {}
}

function currentCampaignLevel() {
  return config.campaignLevels[campaignLevelIndex] || config.campaignLevels[0];
}

function masteryMetric(state, path) {
  return String(path || "").split(".").reduce((value, key) => value?.[key], state);
}

function masteryRulePassed(rule, state) {
  const value = Number(masteryMetric(state, rule.metric));
  if (!Number.isFinite(value)) return false;
  if (rule.comparison === "gte") return value >= Number(rule.target);
  if (rule.comparison === "lte") return value <= Number(rule.target);
  const reference = Number(masteryMetric(state, rule.referenceMetric));
  if (!Number.isFinite(reference) || reference <= 0) return false;
  const ratio = value / reference;
  return rule.comparison === "ratio-gte" ? ratio >= Number(rule.target) : ratio <= Number(rule.target);
}

function campaignStarTotal() {
  return Object.values(campaignMastery).reduce((total, value) => total + Math.max(0, Math.min(3, Number(value) || 0)), 0);
}

function evaluateCampaignMastery(won) {
  const level = currentCampaignLevel();
  const state = runtimeDebugState?.() || {};
  const checks = (level.masteryRules || []).map((rule) => ({ ...rule, passed: won && masteryRulePassed(rule, state) }));
  const stars = won ? 1 + checks.filter((check) => check.passed).length : 0;
  if (won) {
    campaignMastery[level.id] = Math.max(Number(campaignMastery[level.id]) || 0, stars);
    writeCampaignProgress();
  }
  return { stars, checks, total: campaignStarTotal() };
}

function syncMasteryUi() {
  const level = currentCampaignLevel();
  const earned = Math.max(0, Math.min(3, Number(campaignMastery[level.id]) || 0));
  masteryMissionNodes.forEach((node) => { node.textContent = level.mission; });
  masteryObjectiveNodes.forEach((node) => {
    node.replaceChildren(...(level.masteryRules || []).map((rule) => {
      const item = document.createElement("li");
      item.textContent = rule.label;
      return item;
    }));
  });
  masterySummaryNodes.forEach((node) => {
    node.textContent = "本关 " + "★".repeat(earned) + "☆".repeat(3 - earned) + " · 总星章 " + campaignStarTotal() + " / " + (config.campaignLevels.length * 3) + " · 奖励 " + level.reward;
  });
}

function campaignScale(key, fallback = 1) {
  const value = Number(currentCampaignLevel()?.[key]);
  return Number.isFinite(value) ? value : fallback;
}

function resetCampaignRandom() {
  campaignRandomState = (currentCampaignLevel()?.seed || 1) >>> 0;
}

function campaignRandom() {
  campaignRandomState = (Math.imul(campaignRandomState, 1664525) + 1013904223) >>> 0;
  return campaignRandomState / 4294967296;
}

function syncCampaignUi() {
  const level = currentCampaignLevel();
  document.body.dataset.campaignCurrentLevel = String(level.number);
  document.body.dataset.campaignTier = String(level.tier);
  if (campaignSelect) {
    campaignSelect.value = String(campaignLevelIndex);
    Array.from(campaignSelect.options).forEach((option, index) => { option.disabled = index > campaignMaxUnlocked; });
  }
  campaignProgressNodes.forEach((node) => { node.textContent = "第 " + level.number + " / " + config.campaignLevels.length + " 关 · " + level.tierLabel + " · " + level.ruleModifier; });
  syncMasteryUi();
}

function setCampaignLevel(index, options = {}) {
  const requested = Math.max(0, Math.min(config.campaignLevels.length - 1, Number(index) || 0));
  campaignLevelIndex = options.allowLocked ? requested : Math.min(requested, campaignMaxUnlocked);
  if (options.unlock) campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex);
  syncCampaignUi();
  resetCampaignRandom();
  writeCampaignProgress();
  if (typeof onCampaignLevelChanged === "function") onCampaignLevelChanged(currentCampaignLevel());
}

function unlockNextCampaignLevel() {
  const nextIndex = Math.min(config.campaignLevels.length - 1, campaignLevelIndex + 1);
  campaignMaxUnlocked = Math.max(campaignMaxUnlocked, nextIndex);
  return nextIndex;
}

function setGameSessionState(nextState) {
  const allowed = ["idle", "playing", "paused", "stage-complete", "won", "lost", "restarting"];
  if (!allowed.includes(nextState)) throw new Error("未知游戏状态：" + nextState);
  const previousState = gameSessionState;
  gameSessionState = nextState;
  running = nextState === "playing";
  document.body.dataset.gameState = nextState;
  setGameplayControlsEnabled(running);
  if (campaignSelect) campaignSelect.disabled = running;
  window.dispatchEvent(new CustomEvent("game:state-change", { detail: { previousState, state: nextState } }));
}

function drawImageCover(image, x, y, width, height) {
  const sourceRatio = image.naturalWidth / image.naturalHeight;
  const targetRatio = width / height;
  let sourceWidth = image.naturalWidth;
  let sourceHeight = image.naturalHeight;
  let sourceX = 0;
  let sourceY = 0;
  if (sourceRatio > targetRatio) {
    sourceWidth = image.naturalHeight * targetRatio;
    sourceX = (image.naturalWidth - sourceWidth) / 2;
  } else {
    sourceHeight = image.naturalWidth / targetRatio;
    sourceY = (image.naturalHeight - sourceHeight) / 2;
  }
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!backgroundArtReady) return;
  ctx.save();
  const backgroundStrength = config.template === "platformer" ? .72
    : config.visualStyle === "line-art" ? .18
    : config.visualStyle === "cute" ? .24
    : config.visualStyle === "color-block" ? .18
    : config.visualStyle === "calm" ? .3
    : .36;
  ctx.globalAlpha = backgroundStrength;
  drawImageCover(backgroundArt, 0, 0, canvas.width, canvas.height);
  ctx.globalAlpha = 1;
  ctx.fillStyle = config.template === "platformer" ? "rgba(5,15,20,.18)"
    : config.visualStyle === "cute" ? "rgba(255,250,248,.58)"
    : config.visualStyle === "line-art" ? "rgba(250,248,241,.68)"
    : config.visualStyle === "color-block" ? "rgba(8,12,14,.66)"
    : config.visualStyle === "calm" ? "rgba(6,12,14,.42)"
    : "rgba(5,10,12,.46)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const focalLight = ctx.createRadialGradient(canvas.width * .5, canvas.height * .48, 18, canvas.width * .5, canvas.height * .48, canvas.width * .7);
  focalLight.addColorStop(0, "rgba(255,255,255,.12)");
  focalLight.addColorStop(.58, "rgba(255,255,255,.025)");
  focalLight.addColorStop(1, config.template === "platformer" ? "rgba(0,0,0,.16)" : "rgba(0,0,0,.34)");
  ctx.fillStyle = focalLight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function gameSceneTop() {
  return config.aspectRatio === "9:16" ? 0 : Math.max(0, (canvas.height - 720) / 2);
}

function gameSceneHeight() {
  return config.aspectRatio === "9:16" ? canvas.height : Math.min(720, canvas.height);
}

function eventCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width / rect.width,
    y: (event.clientY - rect.top) * canvas.height / rect.height,
  };
}

function eventScenePoint(event) {
  const point = eventCanvasPoint(event);
  return { x: point.x, y: point.y - gameSceneTop() };
}

function cacheBitmapSourceRect(image) {
  if (!image?.naturalWidth || !image.naturalHeight) return;
  const fallback = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  try {
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const sampleScale = Math.min(1, 256 / longestSide);
    const sampleWidth = Math.max(1, Math.round(image.naturalWidth * sampleScale));
    const sampleHeight = Math.max(1, Math.round(image.naturalHeight * sampleScale));
    const sample = document.createElement("canvas");
    sample.width = sampleWidth;
    sample.height = sampleHeight;
    const sampleContext = sample.getContext("2d", { willReadFrequently: true });
    if (!sampleContext) { bitmapSourceRects.set(image, fallback); return; }
    sampleContext.drawImage(image, 0, 0, sampleWidth, sampleHeight);
    const pixels = sampleContext.getImageData(0, 0, sampleWidth, sampleHeight).data;
    let minX = sampleWidth;
    let minY = sampleHeight;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < sampleHeight; y += 1) {
      for (let x = 0; x < sampleWidth; x += 1) {
        if (pixels[(y * sampleWidth + x) * 4 + 3] < 12) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) { bitmapSourceRects.set(image, fallback); return; }
    const scaleX = image.naturalWidth / sampleWidth;
    const scaleY = image.naturalHeight / sampleHeight;
    const guardX = Math.max(1, Math.round(scaleX * 2));
    const guardY = Math.max(1, Math.round(scaleY * 2));
    const sourceX = Math.max(0, Math.floor(minX * scaleX) - guardX);
    const sourceY = Math.max(0, Math.floor(minY * scaleY) - guardY);
    const sourceRight = Math.min(image.naturalWidth, Math.ceil((maxX + 1) * scaleX) + guardX);
    const sourceBottom = Math.min(image.naturalHeight, Math.ceil((maxY + 1) * scaleY) + guardY);
    bitmapSourceRects.set(image, { x: sourceX, y: sourceY, width: sourceRight - sourceX, height: sourceBottom - sourceY });
  } catch {
    bitmapSourceRects.set(image, fallback);
  }
}

function drawBitmapImage(sprite, x, y, width, height, options = {}) {
  const fallback = options.fallback || palette.primary;
  if (!sprite?.complete || !sprite.naturalWidth) {
    ctx.fillStyle = fallback;
    ctx.fillRect(x, y, width, height);
    return;
  }
  if (!bitmapSourceRects.has(sprite)) cacheBitmapSourceRect(sprite);
  const detectedSource = bitmapSourceRects.get(sprite) || { x: 0, y: 0, width: sprite.naturalWidth, height: sprite.naturalHeight };
  const requestedSource = options.sourceRect;
  const source = requestedSource
    ? {
        x: Math.max(0, Math.min(sprite.naturalWidth - 1, requestedSource.x * sprite.naturalWidth)),
        y: Math.max(0, Math.min(sprite.naturalHeight - 1, requestedSource.y * sprite.naturalHeight)),
        width: Math.max(1, Math.min(sprite.naturalWidth, requestedSource.width * sprite.naturalWidth)),
        height: Math.max(1, Math.min(sprite.naturalHeight, requestedSource.height * sprite.naturalHeight)),
      }
    : detectedSource;
  const padding = Math.max(0, Math.min(Number(options.padding) || 0, Math.min(width, height) * .45));
  const targetWidth = Math.max(1, width - padding * 2);
  const targetHeight = Math.max(1, height - padding * 2);
  const fitScale = options.fit === "cover"
    ? Math.max(targetWidth / source.width, targetHeight / source.height)
    : Math.min(targetWidth / source.width, targetHeight / source.height);
  const drawWidth = source.width * fitScale * (options.scaleX ?? options.scale ?? 1);
  const drawHeight = source.height * fitScale * (options.scaleY ?? options.scale ?? 1);
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.translate(x + width / 2, y + height / 2);
  if (options.rotation) ctx.rotate(options.rotation);
  if (options.mirrorX) ctx.scale(-1, 1);
  if (options.circle) {
    ctx.beginPath();
    ctx.arc(0, 0, Math.min(width, height) / 2, 0, Math.PI * 2);
    ctx.clip();
  } else if (options.radius) {
    ctx.beginPath();
    ctx.roundRect(-width / 2, -height / 2, width, height, options.radius);
    ctx.clip();
  }
  ctx.drawImage(
    sprite,
    source.x,
    source.y,
    source.width,
    source.height,
    -drawWidth / 2,
    -drawHeight / 2,
    drawWidth,
    drawHeight,
  );
  ctx.restore();
}

function drawBitmapSprite(index, x, y, width, height, options = {}) {
  drawBitmapImage(spriteImages[index], x, y, width, height, options);
}

function drawPlayfield(x, y, width, height, options = {}) {
  const radius = options.radius ?? 18;
  ctx.save();
  ctx.globalAlpha = options.alpha ?? .88;
  ctx.fillStyle = options.fill || palette.surface;
  ctx.strokeStyle = options.stroke || palette.outline;
  ctx.lineWidth = options.lineWidth || 3;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
  ctx.stroke();
  ctx.globalAlpha = .08;
  ctx.fillStyle = palette.highlight;
  ctx.beginPath();
  ctx.roundRect(x + 10, y + 10, width - 20, Math.max(10, height * .16), Math.max(6, radius - 8));
  ctx.fill();
  ctx.restore();
}
function finishCanvasStyle() {
  const width = canvas.width;
  const height = canvas.height;
  const inset = 18;
  ctx.save();
  ctx.globalAlpha = config.visualStyle === "calm" ? .18
    : config.visualStyle === "cute" ? .32
    : config.visualStyle === "line-art" ? .28
    : config.visualStyle === "color-block" ? .5
    : .48;
  ctx.strokeStyle = palette.textSoft;
  ctx.fillStyle = palette.accent;
  ctx.lineWidth = styleProfile.lineWidth;
  if (styleProfile.motif === "ornate") {
    ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
    ctx.strokeRect(inset + 7, inset + 7, width - (inset + 7) * 2, height - (inset + 7) * 2);
    for (let index = 0; index < styleProfile.detailDensity; index += 1) {
      const x = 68 + index * 83;
      ctx.save(); ctx.translate(x, index % 2 ? height - 25 : 25); ctx.rotate(Math.PI / 4); ctx.fillRect(-3, -3, 6, 6); ctx.restore();
    }
  } else if (styleProfile.motif === "quiet") {
    ctx.beginPath(); ctx.arc(54, 54, 31, Math.PI, Math.PI * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(width - 54, height - 54, 31, 0, Math.PI * .5); ctx.stroke();
  } else if (styleProfile.motif === "editorial") {
    for (let index = 0; index < styleProfile.detailDensity; index += 1) {
      const offset = index * 11;
      ctx.beginPath(); ctx.moveTo(width - 156 + offset, 18); ctx.lineTo(width - 36 + offset, 18); ctx.lineTo(width - 74 + offset, 54); ctx.stroke();
    }
    ctx.fillRect(18, height - 34, 116, 10);
    ctx.fillStyle = palette.secondary; ctx.fillRect(142, height - 34, 42, 10);
  } else if (styleProfile.motif === "playful") {
    for (let index = 0; index < styleProfile.detailDensity; index += 1) {
      const radius = 3 + index % 4;
      const x = index < 5 ? 24 + index * 18 : width - 24 - (index - 5) * 18;
      const y = index < 5 ? 28 + (index % 2) * 12 : height - 28 - (index % 2) * 12;
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); index % 3 ? ctx.stroke() : ctx.fill();
    }
  } else if (styleProfile.motif === "sketch") {
    for (let index = 0; index < styleProfile.detailDensity; index += 1) {
      ctx.beginPath(); ctx.moveTo(20 + index * 8, height - 18); ctx.lineTo(66 + index * 8, height - 64); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(width - 98, 22); ctx.quadraticCurveTo(width - 48, 13, width - 18, 44); ctx.stroke();
  } else {
    ctx.globalAlpha = .9;
    ctx.fillRect(0, 0, 22, 92);
    ctx.fillStyle = palette.secondary; ctx.fillRect(width - 54, 0, 54, 22);
    ctx.fillStyle = palette.primary; ctx.fillRect(width - 22, height - 112, 22, 112);
    ctx.strokeStyle = palette.outline; ctx.strokeRect(inset, inset, width - inset * 2, height - inset * 2);
  }
  ctx.restore();
}
function setMetric(value) { metricValue.textContent = value; }
function setStatus(value) { status.textContent = value; }
function setGameplayControlsEnabled(enabled) {
  document.querySelectorAll("[data-control]").forEach((button) => { button.disabled = !enabled; });
}
function playSound(name) {
  if (!soundEnabled) return;
  const resolvedName = soundAliases[name] || name;
  const audio = sounds[resolvedName];
  if (!audio) return;
  const now = performance.now();
  const cooldown = resolvedName === "hit" || resolvedName === "legal" ? 55 : 90;
  if (now - (soundLastPlayed.get(resolvedName) || 0) < cooldown) return;
  soundLastPlayed.set(resolvedName, now);
  audio.currentTime = 0;
  void audio.play().catch(() => {});
}
function startAmbient() {
  if (!soundEnabled || document.hidden) return;
  void sounds.music.play().catch(() => {});
  void sounds.ambient.play().catch(() => {});
}
function stopEnvironmentAudio() {
  sounds.music.pause();
  sounds.ambient.pause();
}
function hideOverlay() {
  overlay.hidden = true;
  startButton.textContent = "开始游戏";
  restartButton.textContent = "重新开始";
  setGameSessionState("playing");
  canvas.focus({ preventScroll: true });
}
function returnToSetup() {
  stopEnvironmentAudio();
  running = false;
  setGameSessionState("idle");
  overlayTitle.textContent = "调整本局设置";
  overlayDetail.textContent = "本局已暂停。确认关卡、模式与难度后重新开始。";
  startButton.textContent = "重新开始";
  restartButton.textContent = "重开";
  overlay.hidden = false;
}
function showTerminalResult(won, title, detail) {
  running = false;
  setGameSessionState(won ? "won" : "lost");
  stopEnvironmentAudio();
  overlayTitle.textContent = title;
  overlayDetail.textContent = detail;
  startButton.textContent = "再来一局";
  overlay.hidden = false;
  playSound(won ? "success" : "fail");
}

function showResult(won, title, detail) {
  const mastery = evaluateCampaignMastery(won);
  const masteryDetail = won
    ? " 本关评价 " + "★".repeat(mastery.stars) + "☆".repeat(3 - mastery.stars) + "；" + mastery.checks.map((check) => (check.passed ? "已达成：" : "待挑战：") + check.label).join("；") + "。"
    : " 本关尚未获得星章；重新开始不会降低既有最佳评价。";
  if (!won) {
    showTerminalResult(false, title, detail + masteryDetail + " 当前为第 " + currentCampaignLevel().number + " 关，可从本关重新开始。");
    return;
  }
  const completed = currentCampaignLevel();
  if (completed.number >= config.campaignLevels.length) {
    campaignMaxUnlocked = config.campaignLevels.length - 1;
    writeCampaignProgress();
    showTerminalResult(true, "20 关全部完成 · " + title, detail + masteryDetail + " 你已经完成整套渐进关卡，共获得 " + mastery.total + " / " + (config.campaignLevels.length * 3) + " 枚星章。");
    return;
  }
  const nextIndex = unlockNextCampaignLevel();
  const nextLevel = config.campaignLevels[nextIndex];
  setCampaignLevel(nextIndex, { unlock: true });
  setGameSessionState("stage-complete");
  stopEnvironmentAudio();
  overlayTitle.textContent = "第 " + completed.number + " 关完成 · " + title;
  overlayDetail.textContent = detail + masteryDetail + " 下一关：" + nextLevel.tierLabel + " · " + nextLevel.ruleModifier + "。";
  startButton.textContent = "进入第 " + nextLevel.number + " 关";
  overlay.hidden = false;
  playSound("success");
}

function onCampaignLevelChanged() {}

${runtime.script}

redrawGameArt = () => { ${runtime.redrawFunction}(); };
if (backgroundArt.complete && backgroundArt.naturalWidth) backgroundArtReady = true;
redrawGameArt();

let restartArmedAt = 0;
let restartResetTimer = 0;
startButton.addEventListener("click", startGame);
backToSetupButton?.addEventListener("click", returnToSetup);
campaignSelect?.addEventListener("change", () => setCampaignLevel(Number(campaignSelect.value)));
restartButton.addEventListener("click", () => {
  if (gameSessionState !== "playing") { setGameSessionState("restarting"); startGame(); return; }
  const now = Date.now();
  if (now - restartArmedAt < 2500) {
    restartArmedAt = 0;
    clearTimeout(restartResetTimer);
    restartButton.textContent = "重新开始";
    startGame();
    return;
  }
  restartArmedAt = now;
  restartButton.textContent = "再次点击重开";
  setStatus("再次点击“重新开始”即可放弃当前进度。 ");
  clearTimeout(restartResetTimer);
  restartResetTimer = window.setTimeout(() => {
    restartArmedAt = 0;
    restartButton.textContent = "重新开始";
  }, 2500);
});
soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  soundToggle.textContent = soundEnabled ? "声音开启" : "声音关闭";
  soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  if (!soundEnabled) stopEnvironmentAudio();
  else { playSound("ui"); if (running) startAmbient(); }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopEnvironmentAudio();
  else if (running) startAmbient();
});
document.querySelectorAll("[data-control]").forEach((button) => button.addEventListener("click", () => {
  const value = button.dataset.control;
  if (gameSessionState === "playing" || (gameSessionState === "paused" && value === "pause")) handleControl(value);
}));
window.addEventListener("keydown", (event) => {
  if (["INPUT", "SELECT", "TEXTAREA", "BUTTON", "SUMMARY", "A"].includes(event.target?.tagName)) return;
  const snakePauseKey = config.template === "snake" && gameSessionState === "paused" && (event.key.toLowerCase() === "p" || event.key === " ");
  if (gameSessionState !== "playing" && !snakePauseKey) return;
  if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", " "].includes(event.key)) event.preventDefault();
  handleKey(event.key);
});
readCampaignProgress();
syncCampaignUi();
resetCampaignRandom();
onCampaignLevelChanged(currentCampaignLevel());
const gameDebugApi = {
  start: startGame,
  restart: startGame,
  control: handleControl,
  forceWin: () => showResult(true, "验收胜利", "浏览器质量探针已触发胜利分支。"),
  setLevel: (level) => setCampaignLevel(Number(level) - 1, { allowLocked: true, unlock: true }),
  unlockAllLevels: () => { campaignMaxUnlocked = config.campaignLevels.length - 1; syncCampaignUi(); writeCampaignProgress(); },
  getState: () => ({
    running,
    metric: metricValue.textContent,
    status: status.textContent,
    campaign: { level: currentCampaignLevel(), index: campaignLevelIndex, maxUnlocked: campaignMaxUnlocked + 1, total: config.campaignLevels.length, mastery: { ...campaignMastery }, stars: campaignStarTotal() },
    runtime: runtimeDebugState(),
  }),
  ...runtimeDebugActions,
};
if (new URLSearchParams(location.search).has("probe")) window.__GAME_DEBUG__ = gameDebugApi;
`;
}

const touchSafeTemplateStyles = `${templateStyles}${templateVisualStyles}.game-canvas{touch-action:none}.control-button:disabled{cursor:not-allowed;opacity:.42;transform:none}.game-help{border:1px solid var(--theme-line);border-radius:var(--theme-radius);background:var(--theme-panel);overflow:hidden}.game-help summary{position:relative;display:flex;min-height:44px;align-items:center;padding:0 38px 0 13px;color:var(--theme-text);font-size:12px;font-weight:700;letter-spacing:.02em;cursor:pointer;list-style:none}.game-help summary::-webkit-details-marker{display:none}.game-help summary::after{position:absolute;right:14px;content:"＋";color:var(--theme-accent);font-size:17px}.game-help[open] summary::after{content:"−"}.game-help-content{display:grid;gap:8px;padding:0 8px 8px}.game-help .panel-block,.game-help .source-proof{background:color-mix(in srgb,var(--theme-panel) 82%,transparent)}.puzzle-setup{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,.75fr);gap:8px;margin:14px 0 16px}.puzzle-field{display:grid;gap:6px;min-width:0}.puzzle-field>span{color:var(--theme-muted);font-size:11px;line-height:1.2;letter-spacing:.015em}.puzzle-field select{width:100%;min-height:44px;border:1px solid var(--theme-line);border-radius:calc(var(--theme-radius)*.55);padding:0 32px 0 11px;background:var(--theme-panel);color:var(--theme-text);font:600 12px/1 Inter,"Microsoft YaHei",sans-serif;letter-spacing:.015em}.puzzle-panel .puzzle-setup{margin:11px 0 0}.breakout-setup{display:grid;gap:6px;margin:14px 0 16px}.breakout-panel .breakout-setup{margin:10px 0 0}.breakout-field{display:grid;gap:6px}.breakout-field>span{color:var(--theme-muted);font-size:11px}.breakout-field select{width:100%;min-height:44px;border:1px solid var(--theme-line);border-radius:calc(var(--theme-radius)*.55);padding:0 34px 0 11px;background:var(--theme-panel);color:var(--theme-text);font:600 12px/1 Inter,"Microsoft YaHei",sans-serif}.breakout-progress{color:var(--theme-muted);font-size:10px;line-height:1.5}.maze-pad{grid-template-columns:repeat(3,minmax(52px,1fr));grid-template-rows:repeat(2,52px);gap:6px}.maze-pad [data-control=up]{grid-column:2;grid-row:1}.maze-pad [data-control=left]{grid-column:1;grid-row:2}.maze-pad [data-control=down]{grid-column:2;grid-row:2}.maze-pad [data-control=right]{grid-column:3;grid-row:2}.maze-pad .control-button{min-height:52px;font-size:17px}.rule-note{display:block;margin-top:9px;color:#7f8e87;font-size:10px;line-height:1.5}.source-proof{display:grid;gap:5px;padding:12px;border:1px solid var(--theme-line);border-radius:var(--theme-radius);background:var(--theme-panel);color:var(--theme-muted);font-size:10px;line-height:1.45}.source-proof strong{color:var(--theme-text);font-size:11px}.source-proof a{color:var(--theme-accent);text-underline-offset:3px}body[data-template=puzzle]{background-color:#f5f0e7;background-image:none}body[data-template=puzzle]::before{background:linear-gradient(180deg,rgba(255,253,249,.82),rgba(242,234,223,.9))}body[data-template=puzzle] .style-ornament{display:none}body[data-template=puzzle] .canvas-frame{background:#ebe4da;box-shadow:0 18px 46px rgba(87,69,62,.13)}body[data-template=puzzle] .canvas-frame::before{background:rgba(255,252,247,.42)}body[data-template=puzzle] .game-overlay h2{margin-top:20px;font-size:28px}body[data-template=puzzle] .game-overlay p{margin-bottom:0}body[data-template=puzzle] .game-overlay .primary{margin-top:2px}body[data-template=breakout] .game-overlay h2{margin-top:20px}body[data-template=breakout] .game-overlay p{margin-bottom:0}@media(max-width:520px){.puzzle-setup{gap:6px}.puzzle-field>span,.breakout-field>span{font-size:10px}.puzzle-field select,.breakout-field select{min-height:42px;padding-left:9px;font-size:11px}.maze-pad{grid-template-columns:repeat(3,minmax(48px,1fr));grid-template-rows:repeat(2,48px)}.maze-pad .control-button{min-height:48px}}`;

const campaignTemplateStyles = `.campaign-setup{display:grid;gap:6px;margin:14px 0 12px}.campaign-field{display:grid;gap:6px}.campaign-field>span{color:var(--theme-muted);font-size:11px}.campaign-field select,.campaign-field input[type=text]{width:100%;min-height:44px;border:1px solid var(--theme-line);border-radius:calc(var(--theme-radius)*.55);padding:0 34px 0 11px;background:var(--theme-panel);color:var(--theme-text);font:650 12px/1 Inter,"Microsoft YaHei",sans-serif}.campaign-field select:disabled{cursor:not-allowed;opacity:.72}.campaign-progress{display:block;margin-top:7px;color:var(--theme-muted);font-size:10px;line-height:1.45}.mastery-card{display:grid;gap:7px;margin:10px 0 14px;padding:13px 14px;border:1px solid color-mix(in srgb,var(--theme-accent) 44%,var(--theme-line));border-radius:calc(var(--theme-radius)*.7);background:color-mix(in srgb,var(--theme-accent) 7%,var(--theme-panel));text-align:left}.mastery-kicker{color:var(--theme-accent)!important;font:750 9px/1.2 ui-monospace,Consolas,monospace!important;letter-spacing:.09em;text-transform:uppercase}.mastery-card strong,.mastery-panel strong{color:var(--theme-text);font-size:12px;line-height:1.45}.mastery-card ul,.mastery-panel ul{display:grid;gap:4px;margin:0;padding-left:17px;color:var(--theme-muted);font-size:11px;line-height:1.35}.mastery-card li::marker,.mastery-panel li::marker{color:var(--theme-accent)}.mastery-card small,.mastery-panel small{color:var(--theme-accent);font-size:10px;font-weight:700;line-height:1.35;letter-spacing:.015em}.mastery-panel{display:grid;gap:7px}.setup-option{display:flex;min-height:44px;align-items:center;gap:9px;color:var(--theme-text);font-size:12px}.setup-option input{width:20px;height:20px;accent-color:var(--theme-accent)}.secondary-setup{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:-2px 0 10px}@media(max-width:520px){.campaign-setup{margin:10px 0 9px}.campaign-field>span{font-size:10px}.campaign-field select,.campaign-field input[type=text]{min-height:42px;padding-left:9px;font-size:11px}.mastery-card{gap:5px;margin:7px 0 9px;padding:10px 11px}.mastery-card strong{font-size:11px}.mastery-card ul{font-size:10px}.secondary-setup{gap:6px;margin-bottom:8px}}`;

const snakeEnhancementStyles = `body[data-template=snake]{--theme-accent:#ed725d;--theme-secondary:#50aa85;--theme-line:rgba(54,118,94,.28);--theme-panel:rgba(250,255,251,.9);--theme-text:#183d32;--theme-muted:#58766d;background-color:#e8f1e8}body[data-template=snake]::before{background:linear-gradient(180deg,rgba(237,247,239,.44),rgba(225,237,228,.68))}body[data-template=snake] .canvas-frame{background-position:center 72%;box-shadow:0 24px 70px rgba(28,76,58,.18)}body[data-template=snake] .canvas-frame::before{background:linear-gradient(180deg,rgba(236,247,238,.08),rgba(213,232,219,.28))}body[data-template=snake] .game-overlay{border-color:rgba(57,120,96,.24);background:rgba(251,255,252,.94);box-shadow:0 26px 70px rgba(39,83,66,.2)}body[data-template=snake] .game-overlay h2{margin-top:18px;font-size:29px}body[data-template=snake] .game-overlay p{margin-bottom:0}.snake-setup{display:grid;gap:8px;margin:14px 0}.snake-difficulty{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.snake-difficulty button{display:grid;min-width:0;min-height:54px;align-content:center;gap:4px;border:1px solid var(--theme-line);border-radius:calc(var(--theme-radius)*.72);padding:7px 5px;background:rgba(255,255,255,.54);color:var(--theme-text);font:600 11px/1 Inter,"Microsoft YaHei",sans-serif;cursor:pointer;transition:border-color 140ms ease,background-color 140ms ease,transform 90ms ease}.snake-difficulty button strong{font-size:12px;letter-spacing:.02em}.snake-difficulty button span{overflow:hidden;color:var(--theme-muted);font-size:9px;line-height:1.15;text-overflow:ellipsis;white-space:nowrap}.snake-difficulty button:hover{border-color:color-mix(in srgb,var(--theme-accent) 60%,var(--theme-line));background:rgba(255,255,255,.82)}.snake-difficulty button:active{transform:scale(.98)}.snake-difficulty button:focus-visible{outline:2px solid var(--theme-accent);outline-offset:2px}.snake-difficulty button.is-selected,.snake-difficulty button[aria-pressed=true]{border-color:var(--theme-accent);background:color-mix(in srgb,var(--theme-accent) 13%,white);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--theme-accent) 28%,transparent)}.snake-difficulty button.is-selected strong{color:#b9483d}.snake-difficulty-note{min-height:28px;margin:0;color:var(--theme-muted);font-size:10px;line-height:1.4}.snake-panel .snake-setup{margin:10px 0 0}.snake-panel{padding:13px}.game-overlay [data-snake-difficulty-label]{font:inherit;color:inherit}.game-overlay .snake-setup+.primary{margin-top:2px}@media(max-width:720px){body[data-template=snake] .snake-panel{grid-column:1/-1;grid-row:3}body[data-template=snake] .game-help{grid-row:4}.snake-panel{padding:9px 10px}.snake-panel .snake-difficulty-note{display:none}.snake-panel .snake-setup{margin-top:7px}.snake-difficulty button{min-height:46px;padding:5px 3px}.snake-difficulty button span{font-size:8px}}@media(max-width:420px){body[data-template=snake] .game-overlay{top:41%;padding:16px}.snake-setup{margin:10px 0}.snake-difficulty{gap:4px}.snake-difficulty button{min-height:44px}.snake-difficulty-note{font-size:9px}.game-overlay .snake-difficulty button span{display:none}}`;

const snakeControlModeStyles = `.snake-control-choice{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}.snake-control-choice button{min-height:44px;border:1px solid var(--theme-line);border-radius:calc(var(--theme-radius)*.65);background:rgba(255,255,255,.56);color:var(--theme-text);font:700 11px/1 Inter,"Microsoft YaHei",sans-serif;cursor:pointer}.snake-control-choice button.is-selected,.snake-control-choice button[aria-pressed=true]{border-color:var(--theme-accent);background:color-mix(in srgb,var(--theme-accent) 13%,white);color:#a53d32;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--theme-accent) 28%,transparent)}.snake-control-choice button:focus-visible{outline:2px solid var(--theme-accent);outline-offset:2px}body[data-template=snake] .game-canvas{touch-action:none}@media(max-width:720px){body[data-template=snake][data-game-state=playing] .game-status{width:118px}body[data-template=snake][data-snake-control-mode=swipe][data-game-state=playing] .game-controls{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));left:auto;width:58px;height:58px;padding:0;background:transparent;backdrop-filter:none}body[data-template=snake][data-snake-control-mode=swipe][data-game-state=playing] .touch-controls{display:block;width:58px;height:58px}body[data-template=snake][data-snake-control-mode=swipe][data-game-state=playing] [data-control=up],body[data-template=snake][data-snake-control-mode=swipe][data-game-state=playing] [data-control=right],body[data-template=snake][data-snake-control-mode=swipe][data-game-state=playing] [data-control=down],body[data-template=snake][data-snake-control-mode=swipe][data-game-state=playing] [data-control=left]{display:none}body[data-template=snake][data-snake-control-mode=swipe][data-game-state=playing] [data-control=pause]{width:58px;height:58px;min-height:58px;border:1px solid rgba(54,118,94,.35);border-radius:50%;background:rgba(250,255,251,.9);color:#214b3d;box-shadow:0 8px 24px rgba(28,76,58,.2);font-size:11px;font-weight:800;backdrop-filter:blur(10px)}body[data-template=snake][data-snake-control-mode=buttons][data-game-state=playing] .touch-controls{grid-template-columns:repeat(5,minmax(44px,1fr))}body[data-template=snake][data-game-state=paused] .game-panel{position:absolute;z-index:6;inset:0;display:block;pointer-events:none}body[data-template=snake][data-game-state=paused] .game-controls{position:absolute;right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));left:auto;width:68px;padding:0;border:0;background:transparent;pointer-events:auto}body[data-template=snake][data-game-state=paused] .game-controls>*:not(.touch-controls),body[data-template=snake][data-game-state=paused] .touch-controls>*:not([data-control=pause]){display:none}body[data-template=snake][data-game-state=paused] [data-control=pause]{display:block;width:68px;height:48px;min-height:48px;border-radius:999px;background:rgba(250,255,251,.96);color:#214b3d;font-weight:800}}`;

const mahjongEnhancementStyles = `body[data-template=mahjong-roguelite]{--theme-line:rgba(139,91,113,.34);--theme-panel:rgba(255,250,248,.94);--theme-muted:#765f7b;background-color:#f9e9ec;background-position:center 42%}body[data-template=mahjong-roguelite]::before{background:linear-gradient(180deg,rgba(255,244,246,.22),rgba(247,226,231,.42))}body[data-template=mahjong-roguelite] .canvas-frame{background-position:center 42%;box-shadow:0 24px 68px rgba(99,57,78,.2)}body[data-template=mahjong-roguelite] .canvas-frame::before{background:linear-gradient(180deg,rgba(255,246,247,.04),rgba(75,44,58,.12))}body[data-template=mahjong-roguelite] .game-canvas{border-color:rgba(111,71,91,.28);box-shadow:0 18px 46px rgba(69,40,55,.18)}body[data-template=mahjong-roguelite] .game-overlay{border-color:rgba(139,91,113,.36);background:rgba(255,250,248,.97);box-shadow:0 26px 70px rgba(91,48,69,.24)}body[data-template=mahjong-roguelite] .game-overlay h2{margin-top:20px;font-size:29px;line-height:1.22}body[data-template=mahjong-roguelite] .game-overlay p{margin-bottom:18px;color:#765f7b}body[data-template=mahjong-roguelite] .panel-block,body[data-template=mahjong-roguelite] .game-help{box-shadow:0 10px 28px rgba(103,62,81,.1)}body[data-template=mahjong-roguelite] .control-button:disabled{cursor:not-allowed;opacity:.42;transform:none}body[data-template=mahjong-roguelite] .game-canvas:focus-visible{outline:3px solid var(--theme-accent);outline-offset:3px}@media(min-width:861px){body[data-template=mahjong-roguelite] .template-shell{height:100vh;min-height:0;padding:12px}body[data-template=mahjong-roguelite] .template-workspace{min-height:0}body[data-template=mahjong-roguelite] .canvas-frame{height:calc(100vh - 24px);min-height:0;padding:8px}body[data-template=mahjong-roguelite] .game-canvas{width:min(100%,calc((100vh - 40px)*9/16));max-height:calc(100vh - 40px)}}@media(max-width:720px){body[data-template=mahjong-roguelite] .game-panel{gap:5px;padding:6px max(6px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(6px,env(safe-area-inset-left))}body[data-template=mahjong-roguelite] .game-status{min-height:62px;padding:7px 9px;background:rgba(255,250,248,.97)}body[data-template=mahjong-roguelite] .metric-value{margin-top:3px;font-size:22px}body[data-template=mahjong-roguelite] .status{font-size:10px;line-height:1.35}body[data-template=mahjong-roguelite] .game-controls{min-height:56px;padding:6px;background:rgba(255,250,248,.97)}body[data-template=mahjong-roguelite] .game-controls>.metric-label{display:none}body[data-template=mahjong-roguelite] .control-button{min-height:44px;font-size:11px}body[data-template=mahjong-roguelite] .panel-actions{align-items:stretch}body[data-template=mahjong-roguelite] .panel-actions .secondary{min-height:62px}}`;

const klotskiEnhancementStyles = `body[data-template=klotski] .game-canvas{touch-action:none}@media(max-width:720px){body[data-template=klotski][data-game-state=playing] .game-controls{right:max(12px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));left:max(12px,env(safe-area-inset-left));padding:0;border:0;background:transparent;box-shadow:none;backdrop-filter:none}body[data-template=klotski][data-game-state=playing] .touch-controls{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}body[data-template=klotski][data-game-state=playing] [data-control=up],body[data-template=klotski][data-game-state=playing] [data-control=left],body[data-template=klotski][data-game-state=playing] [data-control=down],body[data-template=klotski][data-game-state=playing] [data-control=right]{display:none}body[data-template=klotski][data-game-state=playing] [data-control=undo],body[data-template=klotski][data-game-state=playing] [data-control=redo],body[data-template=klotski][data-game-state=playing] [data-control=hint],body[data-template=klotski][data-game-state=playing] [data-control=replay]{min-height:46px;border:1px solid rgba(139,74,81,.25);border-radius:999px;background:rgba(255,248,246,.9);color:#66343a;box-shadow:0 7px 20px rgba(73,37,45,.16);font-size:11px;font-weight:800}}`;

const merge2048EnhancementStyles = `body[data-template=merge-2048]{--theme-accent:#e65d43;--theme-soft:#2f9c8f;--theme-line:rgba(39,83,78,.28);--theme-panel:rgba(250,248,242,.94);--theme-text:#172b29;--theme-muted:#58706c;background-color:#e8efe9}body[data-template=merge-2048] .canvas-frame{background-position:center 58%;box-shadow:0 24px 68px rgba(24,56,52,.2)}body[data-template=merge-2048] .canvas-frame::before{background:linear-gradient(180deg,rgba(238,246,241,.06),rgba(35,67,61,.18))}body[data-template=merge-2048] .game-canvas{border-color:rgba(34,73,68,.25);box-shadow:0 18px 48px rgba(22,51,47,.2)}body[data-template=merge-2048] .game-canvas:focus-visible{outline:3px solid #e65d43;outline-offset:3px}body[data-template=merge-2048] .control-button{border-color:rgba(39,83,78,.32)}@media(max-width:720px){body[data-template=merge-2048][data-game-state=playing] .game-status{display:none}body[data-template=merge-2048][data-game-state=playing] .panel-actions .secondary{border:1px solid rgba(39,83,78,.28);border-radius:999px;background:rgba(250,248,242,.88);color:#21433f;box-shadow:0 7px 22px rgba(24,56,52,.18);font-size:11px;font-weight:800}body[data-template=merge-2048][data-game-state=playing] .game-controls{right:max(12px,env(safe-area-inset-right));bottom:max(12px,env(safe-area-inset-bottom));left:auto;width:58px;height:58px;padding:0;border:0;background:transparent;box-shadow:none;backdrop-filter:none}body[data-template=merge-2048][data-game-state=playing] .touch-controls{display:block;width:58px;height:58px}body[data-template=merge-2048][data-game-state=playing] [data-control=up],body[data-template=merge-2048][data-game-state=playing] [data-control=left],body[data-template=merge-2048][data-game-state=playing] [data-control=down],body[data-template=merge-2048][data-game-state=playing] [data-control=right]{display:none}body[data-template=merge-2048][data-game-state=playing] [data-control=undo]{width:58px;height:58px;min-height:58px;border:2px solid rgba(230,93,67,.58);border-radius:50%;padding:0;background:rgba(250,248,242,.88);color:#6f2b20;box-shadow:0 8px 26px rgba(24,56,52,.22);font-size:11px;font-weight:800;backdrop-filter:blur(10px)}}`;

const stageBTemplateStyles = `.canvas-frame{background-image:url("./assets/background.png")}`;
const stageCRealtimeStyles = `body[data-template=space-shooter]{--theme-bg:#07151d;--theme-text:#edfaff;--theme-muted:#9bbcc5;--theme-panel:rgba(7,25,34,.9);--theme-line:rgba(86,218,226,.34);--theme-accent:#ff6959;--theme-on-accent:#fff;--theme-soft:#58e5dc;--theme-backdrop:rgba(3,12,18,.68);--theme-shadow:0 22px 58px rgba(1,10,16,.42)}body[data-template=space-shooter] .canvas-frame,body[data-template=space-shooter] .game-canvas{border-width:1px;box-shadow:none}body[data-template=space-shooter] .panel-block,body[data-template=space-shooter] .game-help,body[data-template=space-shooter] .control-button,body[data-template=space-shooter] .secondary{border-width:1px;box-shadow:none}body[data-template=space-shooter] .game-panel .panel-block:nth-child(even){transform:none;background:var(--theme-panel);color:var(--theme-text)}.shooter-loadout-setup{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:11px 0 13px}.shooter-loadout-setup button{display:grid;min-width:0;min-height:58px;align-content:center;gap:4px;border:1px solid var(--theme-line);border-radius:10px;padding:8px 5px;background:rgba(9,32,42,.72);color:var(--theme-text);font:700 11px/1.15 Inter,"Microsoft YaHei",sans-serif;cursor:pointer}.shooter-loadout-setup button span{overflow:hidden;color:var(--theme-muted);font-size:9px;font-weight:600;text-overflow:ellipsis;white-space:nowrap}.shooter-loadout-setup button.is-selected,.shooter-loadout-setup button[aria-pressed=true]{border-color:var(--theme-soft);background:rgba(40,174,176,.16);box-shadow:inset 0 0 0 1px rgba(88,229,220,.22)}.shooter-loadout-setup button:focus-visible{outline:2px solid var(--theme-soft);outline-offset:2px}body[data-template=space-shooter] [data-control=pulse]{border-color:rgba(88,229,220,.55);color:#dffffd}body[data-template=space-shooter] [data-control=pulse]:not(:disabled){background:rgba(18,106,113,.78)}@media(max-width:720px){body[data-template=space-shooter][data-game-state=playing] .game-controls{right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));left:auto;width:74px;height:74px;padding:0;border:0;background:transparent;backdrop-filter:none}body[data-template=space-shooter][data-game-state=playing] .touch-controls{display:block}body[data-template=space-shooter][data-game-state=playing] [data-control=pulse]{width:74px;height:74px;min-height:74px;border:2px solid rgba(88,229,220,.72);border-radius:50%;padding:0 5px;background:rgba(5,30,38,.78);box-shadow:0 0 0 5px rgba(88,229,220,.08),0 0 24px rgba(88,229,220,.24);font-size:10px;line-height:1.15;backdrop-filter:blur(8px)}.shooter-loadout-setup{margin-block:8px}.shooter-loadout-setup button{min-height:52px;padding:6px 4px}}`;

const platformerEnhancementStyles = `body[data-template=platformer]{--theme-panel:rgba(7,25,35,.88);--theme-line:rgba(111,226,240,.32);--theme-text:#effcff;--theme-muted:#a7c5cc;--theme-accent:#65e2ea;--theme-on-accent:#06232b}body[data-template=platformer] .game-canvas{box-shadow:0 22px 64px rgba(2,18,28,.34)}body[data-template=platformer] .control-button{border-color:rgba(111,226,240,.42);background:rgba(7,28,39,.88);color:#effcff}body[data-template=platformer] .control-button:focus-visible{outline:3px solid #f4ce6a;outline-offset:3px}@media(max-width:720px){body[data-template=platformer][data-game-state=playing] .game-controls{right:max(12px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom));left:max(12px,env(safe-area-inset-left));height:78px;padding:0;border:0;background:transparent;backdrop-filter:none;pointer-events:none}body[data-template=platformer][data-game-state=playing] .touch-controls{position:relative;display:block;width:100%;height:78px}body[data-template=platformer][data-game-state=playing] .control-button{position:absolute;bottom:0;width:58px;height:58px;min-height:58px;border:2px solid rgba(111,226,240,.58);border-radius:50%;padding:0;background:rgba(5,29,40,.78);box-shadow:0 0 0 5px rgba(101,226,234,.08),0 8px 26px rgba(2,18,28,.3);font-size:12px;pointer-events:auto;touch-action:none;backdrop-filter:blur(8px)}body[data-template=platformer][data-game-state=playing] [data-control=left]{left:0}body[data-template=platformer][data-game-state=playing] [data-control=right]{left:66px}body[data-template=platformer][data-game-state=playing] [data-control=jump]{right:0;width:76px;height:76px;min-height:76px;border-color:rgba(244,206,106,.82);background:rgba(92,66,18,.82);color:#fff8dc;font-size:14px;font-weight:800}body[data-template=platformer][data-game-state=playing] .game-status{width:126px;background:rgba(7,25,35,.78);color:#effcff}}`;
const stageDTemplateStyles = `.tetris-setup,.breakout-mode-setup{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin:10px 0 14px}.tetris-setup button,.breakout-mode-setup button{min-height:44px;border:1px solid var(--theme-line);border-radius:calc(var(--theme-radius)*.6);background:var(--theme-panel);color:var(--theme-text);font:700 11px/1 Inter,"Microsoft YaHei",sans-serif;cursor:pointer}.tetris-setup button.is-selected,.tetris-setup button[aria-pressed=true],.breakout-mode-setup button.is-selected,.breakout-mode-setup button[aria-pressed=true]{border-color:var(--theme-accent);background:color-mix(in srgb,var(--theme-accent) 16%,var(--theme-panel));color:var(--theme-accent)}.tetris-setup button:focus-visible,.breakout-mode-setup button:focus-visible{outline:2px solid var(--theme-accent);outline-offset:2px}`;

const mobilePlayFlowStyles = `.setup-actions{display:grid;grid-template-columns:1fr;gap:7px;margin-top:8px}.setup-actions .secondary{width:100%;min-height:44px}.game-overlay .setup-upload{margin:9px 0 0;padding:0;border:0;background:transparent}.game-overlay .setup-upload .upload-name{text-align:center}.return-to-setup{min-height:44px}
@media(max-width:720px){body{display:grid;width:100%;height:100svh;min-height:100svh;overflow:hidden;place-items:center;background-attachment:scroll}body[data-visual-style] .template-shell{width:100vw;height:100svh;min-height:0;padding:0;gap:0;grid-template-rows:1fr}body[data-visual-style] .template-workspace{position:relative;display:block;width:100%;height:100%;min-height:0}body[data-visual-style] .canvas-frame{display:grid;width:100%;height:100%;min-height:0;padding:0;border:0;border-radius:0;place-items:center;line-height:0}body[data-visual-style] .game-canvas{display:block;width:min(100vw,56.25svh);height:auto;max-height:100svh;margin:0;border-radius:0;aspect-ratio:9/16}body[data-visual-style] .game-overlay{top:50%;width:min(390px,calc(100% - 24px));max-height:calc(100svh - 24px);padding:18px;overflow:auto;line-height:normal;overscroll-behavior:contain}body[data-visual-style] .game-overlay h2{margin-top:18px;font-size:clamp(25px,7vw,31px)}body[data-visual-style] .game-overlay p{font-size:12px}body[data-visual-style] .game-panel{display:none}body[data-game-state=playing][data-visual-style] .game-panel{position:absolute;z-index:6;inset:0;display:block;width:100%;height:100%;padding:0;background:transparent;pointer-events:none}body[data-game-state=playing] .game-panel>*{pointer-events:auto}body[data-game-state=playing] .game-status{position:absolute;top:max(8px,env(safe-area-inset-top));right:max(8px,env(safe-area-inset-right));left:auto;width:140px;min-height:44px;padding:7px 10px;border:0;background:color-mix(in srgb,var(--theme-panel) 88%,transparent);box-shadow:none;backdrop-filter:blur(12px)}body[data-game-state=playing] .game-status .metric-label,body[data-game-state=playing] .game-status .objective,body[data-game-state=playing] .game-status .campaign-progress,body[data-game-state=playing] .game-status .status{display:none}body[data-game-state=playing] .metric-value{display:block;margin:0;font-size:18px;line-height:30px;text-align:center}body[data-game-state=playing] .game-controls{position:absolute;right:max(8px,env(safe-area-inset-right));bottom:max(8px,env(safe-area-inset-bottom));left:max(8px,env(safe-area-inset-left));padding:6px;border:0;background:color-mix(in srgb,var(--theme-panel) 86%,transparent);box-shadow:none;backdrop-filter:blur(12px)}body[data-game-state=playing] .game-controls>.metric-label{display:none}body[data-game-state=playing] .touch-controls{grid-template-columns:repeat(4,minmax(44px,1fr));gap:5px}body[data-game-state=playing] .touch-controls.maze-pad{width:min(100%,220px);margin-left:auto;grid-template-columns:repeat(3,minmax(44px,1fr));grid-template-rows:repeat(2,44px)}body[data-game-state=playing] .control-button{min-height:44px}body[data-game-state=playing] .game-help,body[data-game-state=playing] .proof-note{display:none}body[data-game-state=playing] .panel-actions{position:absolute;z-index:2;top:max(8px,env(safe-area-inset-top));right:auto;bottom:auto;left:max(8px,env(safe-area-inset-left));display:flex;height:44px;align-items:flex-start;gap:5px;margin:0;pointer-events:auto}body[data-game-state=playing] .panel-actions .secondary{width:auto;min-width:44px;height:44px;min-height:44px;max-height:44px;padding:0 9px;background:color-mix(in srgb,var(--theme-panel) 88%,transparent);backdrop-filter:blur(12px)}body[data-game-state=playing] #sound-toggle{display:none}.proof-note{display:none}}
@media(max-width:360px){body[data-game-state=playing] .game-status{width:116px;padding-inline:7px}body[data-game-state=playing] .panel-actions .secondary{padding-inline:7px;font-size:11px}.game-overlay{width:calc(100% - 16px)!important;padding:14px!important}.campaign-setup,.puzzle-setup,.snake-setup{margin-block:8px}.game-overlay p{margin-bottom:10px!important}.game-overlay>.primary{position:sticky;z-index:3;bottom:0;width:100%;min-height:46px;box-shadow:0 -10px 24px color-mix(in srgb,var(--theme-panel) 82%,transparent)}}
@media(prefers-reduced-motion:reduce){.game-panel,.game-overlay{scroll-behavior:auto}}`;

function gameAspectStyles(project: ProjectDetail) {
  const { width, height } = canvasDimensions(project);
  const portraitShell = project.spec.aspectRatio === "9:16"
    ? `body[data-visual-style] .template-header{display:none}.template-shell{grid-template-rows:1fr}`
    : "";
  const portrait = project.spec.aspectRatio === "9:16"
    ? `@media(max-width:720px){body{min-height:100svh;overflow-x:hidden;--mobile-ui-reserve:202px}body[data-template=puzzle],body[data-template=mahjong-roguelite]{--mobile-ui-reserve:190px}body[data-template=tetris],body[data-template=maze]{--mobile-ui-reserve:248px}body[data-template=snake]{--mobile-ui-reserve:286px}body[data-visual-style] .template-shell{width:100%;min-height:100svh;height:auto;padding:0;gap:0;grid-template-rows:auto}
body[data-visual-style] .template-header{display:none}
body[data-visual-style] .template-workspace{position:relative;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:auto auto;min-height:0;gap:0}body[data-visual-style] .canvas-frame{display:block;width:100%;height:auto;min-height:0;padding:0;border-radius:0;aspect-ratio:auto;line-height:0}body[data-visual-style] .game-canvas{display:block;width:min(100%,calc((100svh - var(--mobile-ui-reserve))*9/16));height:auto;max-height:none;margin-inline:auto;border-radius:0;aspect-ratio:9/16}
.game-overlay{top:43%;width:calc(100% - 32px);padding:20px;line-height:normal}.game-overlay h2{margin-top:20px;font-size:27px}.game-overlay p{font-size:12px}
body[data-visual-style] .game-panel{position:static;z-index:auto;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:stretch;gap:7px;padding:8px max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));background:var(--theme-bg);pointer-events:auto}.game-panel>*{pointer-events:auto}.game-status{grid-column:1;padding:9px 11px}.game-status .objective{display:none}.metric-label{font-size:10px}.metric-value{display:inline-block;margin:5px 10px 0 0;font-size:24px}.status{display:inline;font-size:12px;line-height:1.4}.game-help{grid-column:1/-1;grid-row:3}.game-help-content .panel-block{padding:11px 12px}.game-controls{grid-column:1/-1;grid-row:2;padding:8px}.touch-controls{grid-template-columns:repeat(4,minmax(44px,1fr))}.touch-controls.maze-pad{grid-template-columns:repeat(3,minmax(44px,1fr));grid-template-rows:repeat(2,44px)}.touch-controls.maze-pad .control-button{min-height:44px}.control-button{min-height:44px}.panel-actions{position:static;grid-column:2;grid-row:1;display:flex;gap:6px;margin:0}.panel-actions .secondary{min-width:44px;min-height:44px;padding:0 9px}.proof-note{display:none}
}@media(max-width:420px){body[data-visual-style] .template-shell{padding:0;gap:0}body[data-visual-style] .template-workspace{gap:0}body[data-visual-style] .game-panel{gap:6px}.game-status{padding:8px 9px}.status{font-size:11px}.game-overlay{width:calc(100% - 22px);padding:17px}.game-overlay p{font-size:11px}.upload-button{font-size:10px}}@media(min-width:721px) and (max-width:860px){body[data-visual-style] .template-shell{width:100%;min-height:100svh;padding:18px}body[data-visual-style] .template-workspace{grid-template-columns:minmax(0,1fr) 286px;grid-template-rows:auto;align-items:start;gap:12px}.canvas-frame{min-height:0;padding:0}.game-canvas{width:min(100%,var(--game-viewport-width))}.game-panel{display:flex;flex-direction:column;gap:10px}.game-panel>.panel-block:first-child,.game-help,.proof-note{grid-column:auto}}`
    : "";
  const viewportWidth = `${Number((78 * width / height).toFixed(4))}vh`;
  return `:root{--game-aspect:${width}/${height};--game-width:${width}px;--game-viewport-width:${viewportWidth}}${portraitShell}.canvas-frame{min-height:min(640px,78vh);padding:12px;aspect-ratio:auto}.game-canvas{display:block;width:min(100%,var(--game-width),var(--game-viewport-width));height:auto;max-height:none;aspect-ratio:var(--game-aspect)}@media(max-width:860px){.canvas-frame{min-height:0;padding:8px}}${portrait}`;
}

function templateHtml(project: ProjectDetail) {
  const runtime = getRuntimeDefinition(project.spec.template);
  if (!runtime) throw new Error("模板运行时不存在。");
  const style = visualStyleDirection(project);
  const canvasSize = canvasDimensions(project);
  const controlsInitiallyDisabled = " disabled";
  const controls = runtime.controls.map((control) => `<button class="control-button" type="button" data-control="${control.value}" aria-label="${control.ariaLabel}"${controlsInitiallyDisabled}>${control.label}</button>`).join("");
  const controlsClass = project.spec.template === "maze" ? "touch-controls maze-pad" : "touch-controls";
  const campaignLevels = createCampaignLevels(project.spec.template, project.spec.difficulty);
  const campaignAttribute = project.spec.template === "breakout" ? " data-breakout-level" : "";
  const campaignSetup = `<div class="campaign-setup"><label class="campaign-field"><span>渐进关卡</span><select data-campaign-level${campaignAttribute} aria-label="选择渐进关卡">${campaignLevels.map((level, index) => `<option value="${index}"${index > 0 ? " disabled" : ""}>${escapeHtml(level.label)}</option>`).join("")}</select></label><span class="campaign-progress" data-campaign-progress>第 1 / ${campaignLevels.length} 关 · ${escapeHtml(campaignLevels[0].tierLabel)} · ${escapeHtml(campaignLevels[0].ruleModifier)}</span></div>`;
  const masterySetup = `<section class="mastery-card" aria-label="本关任务与技巧目标"><span class="mastery-kicker">MISSION CONTRACT / 本关合同</span><strong data-mastery-mission>${escapeHtml(campaignLevels[0].mission)}</strong><ul data-mastery-objectives>${campaignLevels[0].masteryRules.map((rule) => `<li>${escapeHtml(rule.label)}</li>`).join("")}</ul><small data-mastery-summary>本关 ☆☆☆ · 总星章 0 / ${campaignLevels.length * 3} · 奖励 ${escapeHtml(campaignLevels[0].reward)}</small></section>`;
  const puzzleLevelOptions = [
    ...(project.spec.customImageDataUrl ? [{ id: "custom", label: "我的图片" }] : []),
    ...puzzleBuiltInLevels,
  ];
  const puzzleSetup = project.spec.template === "puzzle" && project.spec.puzzleRules
    ? `<div class="puzzle-setup"><label class="puzzle-field"><span>图案关卡</span><select data-puzzle-level aria-label="选择拼图图案">${puzzleLevelOptions.map((level, index) => `<option value="${level.id}"${index === 0 ? " selected" : ""}>${level.label}</option>`).join("")}</select></label><label class="puzzle-field"><span>拼图数量</span><select data-puzzle-count aria-label="选择拼图数量">${project.spec.puzzleRules.allowedPieceCounts.map((count) => `<option value="${count}"${count === project.spec.puzzleRules?.pieceCount ? " selected" : ""}>${count} 块</option>`).join("")}</select></label></div>`
    : "";
  const puzzleRuleNote = project.spec.template === "puzzle"
    ? `<span class="rule-note">${project.spec.difficulty === "relaxed" ? "轻松：吸附范围较大，参考底图更清晰。" : project.spec.difficulty === "challenging" ? "挑战：吸附范围更小，参考底图更淡。" : "标准：适中吸附范围和参考底图。"}开始后拼图会排布在画板外围，数量上限 50 块。</span>`
    : "";
  const snakeDifficultyOptions = [
    { id: "relaxed", label: "轻松", short: "慢速 · 基础 8 分", detail: "慢速巡游 · 基础目标 8 分 · 越界会从另一侧回来" },
    { id: "standard", label: "标准", short: "适中 · 基础 12 分", detail: "适中速度 · 基础目标 12 分 · 每关按场型调整" },
    { id: "challenging", label: "挑战", short: "加速 · 基础 18 分", detail: "高速开局 · 基础目标 18 分 · 场型更密并随收集加速" },
  ];
  const activeSnakeDifficulty = snakeDifficultyOptions.find((option) => option.id === project.spec.difficulty) ?? snakeDifficultyOptions[1];
  const snakeSetup = project.spec.template === "snake"
    ? `<div class="snake-setup"><div class="snake-difficulty" role="group" aria-label="选择青玉长游难度">${snakeDifficultyOptions.map((option) => `<button type="button" data-snake-difficulty="${option.id}" aria-pressed="${option.id === activeSnakeDifficulty.id}" class="${option.id === activeSnakeDifficulty.id ? "is-selected" : ""}"><strong>${option.label}</strong><span>${option.short}</span></button>`).join("")}</div><p class="snake-difficulty-note" data-snake-difficulty-note>${activeSnakeDifficulty.detail}</p><div class="snake-control-choice" role="group" aria-label="选择手机控制方式"><button type="button" data-snake-control-mode="swipe" class="is-selected" aria-pressed="true">滑动庭园</button><button type="button" data-snake-control-mode="buttons" aria-pressed="false">屏幕四键</button></div></div>`
    : "";
  const tetrisSetup = project.spec.template === "tetris"
    ? `<div class="tetris-setup" role="group" aria-label="选择下落消行模式"><button type="button" data-tetris-mode="standard" class="is-selected" aria-pressed="true">旅程关卡</button><button type="button" data-tetris-mode="timed" aria-pressed="false">限时挑战</button><button type="button" data-tetris-mode="zen" aria-pressed="false">禅意练习</button></div>`
    : "";
  const breakoutModeSetup = project.spec.template === "breakout"
    ? `<div class="breakout-mode-setup" role="group" aria-label="选择碎星航次模式"><button type="button" data-breakout-mode="campaign" class="is-selected" aria-pressed="true">旅程关卡</button><button type="button" data-breakout-mode="time-attack" aria-pressed="false">120 秒限时</button><button type="button" data-breakout-mode="endless" aria-pressed="false">无尽航次</button></div>`
    : "";
  const shooterLoadoutSetup = project.spec.template === "space-shooter"
    ? `<div class="shooter-loadout-setup" aria-label="选择星环战机"><button type="button" data-shooter-loadout="interceptor" class="is-selected" aria-pressed="true"><strong>逐光</strong><span>高速追随 · 快速射击</span></button><button type="button" data-shooter-loadout="bulwark" aria-pressed="false"><strong>岚盾</strong><span>额外能量 · 大范围脉冲</span></button><button type="button" data-shooter-loadout="lancer" aria-pressed="false"><strong>星矛</strong><span>双列聚焦 · 精英增伤</span></button></div>`
    : "";
  const mazeSetup = project.spec.template === "maze"
    ? `<label class="setup-option"><input type="checkbox" data-maze-shortest>最短路径挑战（到达后对照最优步数）</label>`
    : "";
  const mahjongSetup = project.spec.template === "mahjong-roguelite"
    ? `<div class="secondary-setup"><label class="campaign-field"><span>旅程类型</span><select data-mahjong-mode aria-label="选择月港旅程类型"><option value="campaign">普通旅程</option><option value="daily">每日局</option><option value="seeded">种子局</option></select></label><label class="campaign-field"><span>种子</span><input type="text" data-mahjong-seed maxlength="24" value="MOON-PORT" aria-label="输入种子局种子" disabled></label></div>`
    : "";
  const upload = project.spec.template === "puzzle"
    ? `<div class="setup-upload"><label class="upload-button">上传自己的拼图图片<input id="puzzle-upload" type="file" accept="image/png,image/jpeg,image/webp"></label><span class="upload-name" id="upload-name">${project.spec.customImageDataUrl ? "已使用创作时上传的图片" : "也可以替换为自己的图片"}</span></div>`
    : "";
  const breakoutSettings = "";
  const sourceProof = project.spec.templateSource
    ? `<div class="source-proof"><strong>OPEN-SOURCE TEMPLATE · ${project.spec.templateSource.license}</strong><span>玩法结构来自 ${escapeHtml(project.spec.templateSource.sourceName)}；视听资产为本平台独立制作。</span><a href="${project.spec.templateSource.sourceUrl}" target="_blank" rel="noreferrer">查看上游与许可证</a></div>`
    : "";
  const editionLabel = project.spec.template === "snake"
    ? `PLAYABLE EDITION / <b data-snake-difficulty-label>${activeSnakeDifficulty.label}</b>`
    : `PLAYABLE EDITION / ${project.spec.difficulty.toUpperCase()}`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#101615"><title>${escapeHtml(project.title)}</title><link rel="preload" as="image" href="./assets/cover.png"><link rel="preload" as="image" href="./assets/gameplay-atlas.png"><link rel="stylesheet" href="./styles.css"><script src="./app.js" defer></script></head><body data-template="${project.spec.template}" data-visual-style="${project.spec.visualStyle}" data-detail-level="${style.detailLevel}"><div class="style-ornament" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></div><main class="template-shell"><header class="template-header"><div><span class="eyebrow">${runtime.eyebrow}</span><h1>${escapeHtml(project.title)}</h1><span class="style-mode">${style.label} · ${style.detailLabel} · ${style.layout}</span></div><p>${escapeHtml(project.spec.vision)}</p></header><div class="template-workspace"><section class="canvas-frame" aria-label="${runtime.label}可玩区域"><canvas class="game-canvas" id="game-canvas" width="${canvasSize.width}" height="${canvasSize.height}" tabindex="0" aria-describedby="status"></canvas><div class="game-overlay" id="game-overlay"><span>${editionLabel}</span><h2 id="overlay-title">${runtime.intro}</h2><p id="overlay-detail">${runtime.objective}</p>${campaignSetup}${masterySetup}${tetrisSetup}${breakoutModeSetup}${shooterLoadoutSetup}${puzzleSetup}${puzzleRuleNote}${snakeSetup}${mazeSetup}${mahjongSetup}${upload}<div class="setup-actions"><button class="secondary" id="sound-toggle" type="button" aria-pressed="true">声音开启</button></div><button class="primary" id="start" type="button">开始游戏</button></div></section><aside class="game-panel"><div class="panel-block game-status"><span class="metric-label">${runtime.primaryMetric}</span><strong class="metric-value" id="metric-value">—</strong><p class="status" id="status" aria-live="polite">准备开始。</p><p class="objective">${runtime.objective}</p><span class="campaign-progress" data-campaign-progress>第 1 / ${campaignLevels.length} 关</span></div>${breakoutSettings}${controls ? `<div class="panel-block game-controls"><span class="metric-label">${project.spec.template === "maze" ? "滑动迷宫或使用方向键" : "触控与键盘"}</span><div class="${controlsClass}">${controls}</div></div>` : ""}<details class="game-help"><summary>任务与玩法</summary><div class="game-help-content"><div class="panel-block"><span class="metric-label">本局目标</span><p class="objective">${runtime.objective}</p></div><div class="panel-block mastery-panel"><strong data-mastery-mission>${escapeHtml(campaignLevels[0].mission)}</strong><ul data-mastery-objectives>${campaignLevels[0].masteryRules.map((rule) => `<li>${escapeHtml(rule.label)}</li>`).join("")}</ul><small data-mastery-summary>本关 ☆☆☆ · 总星章 0 / ${campaignLevels.length * 3}</small></div>${sourceProof}</div></details><div class="panel-actions"><button class="secondary return-to-setup" id="back-to-setup" type="button" aria-label="返回启动设置">返回</button><button class="secondary" id="restart" type="button">重开</button></div><p class="proof-note">COMMERCIAL GAMEPLAY CONTRACT · 20 LEVELS · 3-STAR MASTERY · KEYBOARD + TOUCH</p></aside></div></main></body></html>`;
}

function writeTemplateArtifact(root: string, project: ProjectDetail) {
  const runtime = getRuntimeDefinition(project.spec.template);
  if (!runtime) throw new Error("模板运行时不存在。");
  copyTemplateAssetPack(root, project);
  const html = templateHtml(project).replace(
    '<link rel="preload" as="image" href="./assets/gameplay-atlas.png">',
    '<link rel="preload" as="image" href="./assets/background.png"><link rel="preload" as="image" href="./assets/sprites/sprite-01.png"><link rel="preload" as="image" href="./assets/sprites/sprite-02.png">',
  );
  writeFileSync(join(root, "index.html"), html, "utf8");
  writeFileSync(join(root, "styles.css"), `${touchSafeTemplateStyles}${campaignTemplateStyles}${stageBTemplateStyles}${stageCRealtimeStyles}${platformerEnhancementStyles}${stageDTemplateStyles}${gameAspectStyles(project)}${snakeEnhancementStyles}${mahjongEnhancementStyles}${mobilePlayFlowStyles}${klotskiEnhancementStyles}${merge2048EnhancementStyles}${snakeControlModeStyles}`, "utf8");
  writeFileSync(join(root, "app.js"), `${templateScript(project)}${gameTelemetryScript(project)}`, "utf8");
  writeFileSync(join(root, "game-manifest.json"), JSON.stringify({
    title: project.title,
    template: project.spec.template,
    runtimeTarget: project.spec.runtimeTarget,
    difficulty: project.spec.difficulty,
    visualStyle: project.spec.visualStyle,
    aspectRatio: project.spec.aspectRatio,
    cameraMode: project.spec.cameraMode,
    inputModes: project.spec.inputModes,
    designProfile: project.spec.designProfile,
    levelProgression: project.spec.levelProgression,
    templateSource: project.spec.templateSource,
    generatedAt: new Date().toISOString(),
    assetManifest: "./assets/asset-manifest.json",
    artPipeline: {
      renderer: "role-split-bitmaps",
      sourceAtlas: "./assets/gameplay-atlas.png",
      gameplayBackground: "./assets/background.png",
      sprites: Array.from({ length: 9 }, (_, index) => `./assets/sprites/sprite-${String(index + 1).padStart(2, "0")}.png`),
      cover: "./assets/cover.png",
      ...(project.spec.template === "mahjong-roguelite" ? {
        assetCompositionVersion: 2,
        tileBodySource: "canvas-single-layer",
        spriteContent: "transparent-motif-only",
      } : {}),
    },
    userCustomization: project.spec.template === "puzzle"
      ? ["runtime-image-upload", "creation-image-upload"]
      : project.spec.template === "snake"
        ? ["runtime-difficulty-selection"]
        : [],
    puzzleRules: project.spec.puzzleRules,
  }, null, 2), "utf8");
}

const threeGameStyles = `
:root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,sans-serif;background:#080b0e;color:#eef4ed}
*{box-sizing:border-box}body{margin:0;min-height:100vh;overflow:hidden;background:#080b0e}.three-shell{position:relative;width:100vw;height:100svh;isolation:isolate}.three-canvas{display:block;width:100%;height:100%;touch-action:none}.three-hud{position:absolute;inset:0;pointer-events:none;display:grid;grid-template-rows:auto 1fr auto;padding:clamp(14px,2vw,28px);gap:16px}.three-topbar{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.three-brand,.three-metrics,.three-objective,.three-controls,.three-result{pointer-events:auto;background:color-mix(in srgb,var(--surface,#10191a) 88%,transparent);border:1px solid var(--line,#415153);backdrop-filter:blur(18px);box-shadow:0 18px 54px #0008}.three-brand{max-width:min(560px,70vw);padding:16px 20px}.three-brand span,.metric span,.three-objective span{display:block;color:var(--accent,#d6b968);font-size:10px;font-weight:800;letter-spacing:.18em;text-transform:uppercase}.three-brand h1{font-family:Georgia,serif;font-weight:500;font-size:clamp(22px,3vw,42px);line-height:1;margin:8px 0 0}.three-metrics{display:flex}.metric{min-width:104px;padding:12px 16px;border-left:1px solid var(--line,#415153)}.metric:first-child{border-left:0}.metric strong{display:block;margin-top:5px;font-size:24px;font-variant-numeric:tabular-nums}.three-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.three-objective{max-width:480px;padding:15px 18px}.three-objective p{margin:7px 0 0;line-height:1.45;color:#d7dfda}.three-controls{display:grid;grid-template-columns:repeat(3,50px);grid-template-rows:repeat(2,50px);gap:6px;padding:10px;border-radius:20px}.three-controls button{pointer-events:auto;border:1px solid var(--line,#536468);background:#0d1618cc;color:#fff;border-radius:13px;font:700 18px inherit;touch-action:none}.three-controls button:active,.three-controls button.is-active{background:var(--accent,#d6b968);color:#07100f;transform:translateY(1px)}.three-controls [data-key=up]{grid-column:2}.three-controls [data-key=left]{grid-row:2;grid-column:1}.three-controls [data-key=down]{grid-row:2;grid-column:2}.three-controls [data-key=right]{grid-row:2;grid-column:3}.three-start,.three-result{position:absolute;inset:50% auto auto 50%;transform:translate(-50%,-50%);width:min(520px,calc(100vw - 32px));padding:clamp(24px,5vw,48px);text-align:center;pointer-events:auto}.three-start{background:#0b1111ed;border:1px solid var(--line,#4b5c5c);box-shadow:0 40px 100px #000c}.three-start .kicker,.three-result .kicker{color:var(--accent,#d6b968);font-size:11px;font-weight:800;letter-spacing:.2em}.three-start h2,.three-result h2{font:500 clamp(34px,7vw,64px)/.95 Georgia,serif;margin:14px 0}.three-start p,.three-result p{color:#c2ceca;line-height:1.65;margin:0 auto 24px;max-width:40ch}.three-start button,.three-result button{border:0;background:var(--accent,#d6b968);color:#07100f;padding:14px 25px;font-weight:900;letter-spacing:.08em;cursor:pointer}.three-result[hidden],.three-start[hidden]{display:none}.webgl-error{position:absolute;inset:0;display:grid;place-items:center;padding:32px;text-align:center;background:#090d0f;color:#fff;z-index:20}.webgl-error[hidden]{display:none}
body[data-visual-style=classic]{--surface:#111a19;--line:#9c824c;--accent:#e0c174}.three-brand,.three-objective{border-radius:2px}body[data-visual-style=classic] .three-brand{outline:1px solid #9c824c55;outline-offset:5px}
body[data-visual-style=calm]{--surface:#17201e;--line:#475b55;--accent:#b9d2c2}.three-brand,.three-objective{border-radius:12px}body[data-visual-style=calm] .three-hud{padding:clamp(20px,4vw,54px)}
body[data-visual-style=fashion]{--surface:#121214;--line:#756151;--accent:#ffb472}body[data-visual-style=fashion] .three-brand,body[data-visual-style=fashion] .three-objective{border-radius:0;clip-path:polygon(0 0,96% 0,100% 18%,100% 100%,0 100%)}body[data-visual-style=fashion] .three-brand h1{font-family:Arial Black,sans-serif;letter-spacing:-.055em;text-transform:uppercase}
body[data-visual-style=cute]{--surface:#33293b;--line:#876f93;--accent:#ffd07d}body[data-visual-style=cute] .three-brand,body[data-visual-style=cute] .three-objective,body[data-visual-style=cute] .three-start{border-radius:28px}body[data-visual-style=cute] .three-brand h1{font-family:ui-rounded,system-ui;font-weight:850}
body[data-visual-style=line-art]{--surface:#f0ecdf;--line:#252b28;--accent:#bf573f;color:#1d2421}body[data-visual-style=line-art] .three-brand,body[data-visual-style=line-art] .three-metrics,body[data-visual-style=line-art] .three-objective{color:#1d2421;box-shadow:none;backdrop-filter:none;border:2px solid #1d2421;border-radius:0}body[data-visual-style=line-art] .three-objective p{color:#303733}
body[data-visual-style=color-block]{--surface:#142132;--line:#05090e;--accent:#ffd84e}body[data-visual-style=color-block] .three-brand,body[data-visual-style=color-block] .three-objective,body[data-visual-style=color-block] .three-metrics{border:3px solid #05090e;border-radius:0;box-shadow:7px 7px 0 #05090e}body[data-visual-style=color-block] .three-brand h1{font-family:Arial Black,sans-serif}
@media(max-width:720px){body{display:grid;min-height:100svh;overflow:auto;place-items:start center}.three-shell{width:min(100vw,56.25svh);height:auto;min-height:0;aspect-ratio:9/16}.three-hud{padding:max(8px,env(safe-area-inset-top)) 8px max(8px,env(safe-area-inset-bottom));gap:8px}.three-topbar{align-items:stretch}.three-brand{padding:10px 12px;max-width:none;flex:1}.three-brand span{font-size:8px}.three-brand h1{margin-top:5px;font-size:20px}.three-metrics{display:block}.metric{min-width:76px;padding:6px 8px;border-left:0;border-bottom:1px solid var(--line)}.metric:last-child{border-bottom:0}.metric span{font-size:8px}.metric strong{font-size:16px}.three-bottom{align-items:flex-end;gap:6px}.three-objective{max-width:calc(100% - 142px);padding:8px 10px}.three-objective span{font-size:8px}.three-objective p{display:-webkit-box;margin-top:4px;overflow:hidden;font-size:10px;line-height:1.35;-webkit-box-orient:vertical;-webkit-line-clamp:2}.three-controls{grid-template-columns:repeat(3,40px);grid-template-rows:repeat(2,40px);padding:6px;gap:3px}.three-start,.three-result{width:calc(100% - 24px);padding:22px}.three-start h2,.three-result h2{font-size:38px}.three-start p,.three-result p{font-size:12px}}
`;

const threeCampaignStyles = `.three-level-field{display:grid;gap:6px;margin:0 auto 9px;text-align:left}.three-level-field span,.three-start [data-campaign-progress]{display:block;color:#aebdb7;font-size:10px;line-height:1.4}.three-level-field select{width:100%;min-height:44px;border:1px solid var(--line,#4b5c5c);padding:0 34px 0 11px;background:#0b1111;color:#eef4ed;font:650 12px/1 Inter,sans-serif}.three-start [data-campaign-progress]{margin-bottom:16px;text-align:left}`;

const threeMasteryStyles = `.three-mastery-card{display:grid;gap:6px;margin:0 0 16px;padding:12px 14px;border:1px solid color-mix(in srgb,var(--accent,#d6b968) 48%,var(--line,#415153));background:color-mix(in srgb,var(--accent,#d6b968) 8%,#0b1111);text-align:left}.three-mastery-card strong{color:#eef4ed;font-size:12px;line-height:1.4}.three-mastery-card ul{display:grid;gap:3px;margin:0;padding-left:17px;color:#aebdb7;font-size:10px;line-height:1.35}.three-mastery-card li::marker{color:var(--accent,#d6b968)}.three-mastery-card small{color:var(--accent,#d6b968);font-size:10px;font-weight:800;line-height:1.35}`;

const threeMobilePlayFlowStyles = `.three-back{position:absolute;z-index:9;top:max(12px,env(safe-area-inset-top));left:max(12px,env(safe-area-inset-left));display:none;min-width:44px;min-height:44px;border:1px solid var(--line,#415153);background:color-mix(in srgb,var(--surface,#10191a) 88%,transparent);color:#eef4ed;font:700 12px/1 Inter,sans-serif;letter-spacing:.02em;cursor:pointer;backdrop-filter:blur(14px)}body[data-game-state=playing] .three-back{display:block}.three-back:focus-visible,.three-result button:focus-visible{outline:2px solid var(--accent,#d6b968);outline-offset:3px}.three-result-actions{display:grid;grid-template-columns:1fr 1fr;gap:7px}.three-result-actions button{width:100%;min-height:44px}.three-result-actions .secondary-result{border:1px solid var(--line,#415153);background:transparent;color:#eef4ed}
@media(max-width:720px){body{display:grid;width:100%;height:100svh;min-height:100svh;overflow:hidden;place-items:center}.three-shell{width:min(100vw,56.25svh);height:min(100svh,177.7778vw);min-height:0;aspect-ratio:9/16}.three-start,.three-result{max-height:calc(100% - 24px);overflow:auto;overscroll-behavior:contain}.three-hud{padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left))}body[data-game-state=playing] .three-topbar{padding-left:52px}body[data-game-state=playing] .three-objective{max-width:calc(100% - 130px)}.three-controls button{min-width:44px;min-height:44px}.three-back{top:max(8px,env(safe-area-inset-top));left:max(8px,env(safe-area-inset-left))}}
@media(max-width:360px){.three-start,.three-result{width:calc(100% - 14px);padding:16px}.three-start h2,.three-result h2{font-size:34px}.three-start p,.three-result p{font-size:11px}.three-brand h1{font-size:17px}.three-metrics .metric:first-child{display:none}.three-result-actions{grid-template-columns:1fr}}`;

function threeGameHtml(project: ProjectDetail) {
  const style = visualStyleDirection(project);
  const arenaMode = project.spec.threeMode === "arena";
  const campaignLevels = createCampaignLevels(project.spec.template, project.spec.difficulty);
  const campaignOptions = campaignLevels.map((level, index) => `<option value="${index}"${index > 0 ? " disabled" : ""}>${escapeHtml(level.label)}</option>`).join("");
  return `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#080b0e"><title>${escapeHtml(project.title)} · Web 3D</title><link rel="preload" as="image" href="./assets/cover.png"><link rel="preload" as="image" href="./assets/gameplay-atlas.png"><link rel="stylesheet" href="./styles.css"><script type="module" src="./app.js"></script></head><body data-runtime="web-3d" data-three-mode="${arenaMode ? "arena" : "collector"}" data-visual-style="${project.spec.visualStyle}" data-detail-level="${style.detailLevel}"><main class="three-shell"><canvas id="game-canvas" class="three-canvas" aria-label="${arenaMode ? "可战斗的 3D 小型竞技场" : "可探索的 3D 收集遗迹"}"></canvas><button class="three-back" id="back-to-setup" type="button" aria-label="返回启动设置">返回</button><div class="three-hud"><div class="three-topbar"><div class="three-brand"><span id="campaign-hud">WEB 3D · 20 LEVEL CAMPAIGN</span><h1>${escapeHtml(project.title)}</h1></div><div class="three-metrics"><div class="metric"><span>${arenaMode ? "生命 / 波次" : "遗迹碎片"}</span><strong id="fragment-count">${arenaMode ? "100 · 1/3" : "0 / "}<span id="fragment-target">${arenaMode ? "" : "5"}</span></strong></div><div class="metric"><span>剩余时间</span><strong id="time-left">—</strong></div></div></div><div></div><div class="three-bottom"><div class="three-objective"><span id="status-label">任务目标</span><p id="status">${arenaMode ? "移动、瞄准并击退三波敌人。" : "收集遗迹碎片，经过检查点并开启出口。"}</p></div><div class="three-controls" aria-label="移动控制"><button type="button" data-key="up" aria-label="向前">↑</button><button type="button" data-key="left" aria-label="向左">←</button><button type="button" data-key="down" aria-label="向后">↓</button><button type="button" data-key="right" aria-label="向右">→</button><button type="button" data-key="action" aria-label="${arenaMode ? "攻击" : "跳跃"}">${arenaMode ? "击" : "跃"}</button></div></div></div><section class="three-start" id="start-card"><span class="kicker">${style.label} · ${style.detailLabel}</span><h2>${arenaMode ? "进入潮光竞技场" : "进入遗迹"}</h2><p>${escapeHtml(project.spec.vision)} ${arenaMode ? "移动时自动瞄准最近敌人，按空格或“击”攻击。" : "使用 WASD 或屏幕按钮移动，按空格或“跃”跳过低障碍。"}</p><label class="three-level-field"><span>渐进关卡</span><select data-campaign-level aria-label="选择 3D 渐进关卡">${campaignOptions}</select></label><small data-campaign-progress>第 1 / 20 关 · 认识规则</small><button type="button" id="start">${arenaMode ? "开始迎战" : "开始探索"}</button></section><section class="three-result" id="result-card" hidden><span class="kicker" id="result-kicker">${arenaMode ? "竞技记录" : "探索记录"}</span><h2 id="result-title">任务完成</h2><p id="result-detail"></p><div class="three-result-actions"><button type="button" class="secondary-result" id="result-setup">返回设置</button><button type="button" id="restart">${arenaMode ? "再次迎战" : "再次探索"}</button></div></section><div class="webgl-error" id="webgl-error" hidden>此浏览器无法启动 WebGL 2。请启用硬件加速，或换用最新版 Chrome、Edge、Safari。</div></main></body></html>`;
}

function threeGameScript(project: ProjectDetail) {
  const duration = project.spec.difficulty === "relaxed" ? 150 : project.spec.difficulty === "challenging" ? 75 : 105;
  const config = safeJson({
    title: project.title,
    visualStyle: project.spec.visualStyle,
    difficulty: project.spec.difficulty,
    cameraMode: project.spec.cameraMode,
    inputModes: project.spec.inputModes,
    duration,
    campaign: project.spec.levelProgression,
    campaignLevels: createCampaignLevels(project.spec.template, project.spec.difficulty),
    campaignStorageKey: `forge-campaign:${project.id}:${project.version.id}`,
    mode: project.spec.threeMode ?? "collector",
    contract: project.spec.threeContract,
  });
  return `import * as THREE from "./vendor/three.module.js";
${safeStorageShim}
const config = ${config};
document.body.dataset.gameState = "idle";
document.body.dataset.cameraMode = config.cameraMode;
const canvas = document.querySelector("#game-canvas");
const startCard = document.querySelector("#start-card");
const resultCard = document.querySelector("#result-card");
const backToSetupButton = document.querySelector("#back-to-setup");
const resultSetupButton = document.querySelector("#result-setup");
const pauseButton = document.createElement("button");
pauseButton.type = "button";
pauseButton.className = "three-back three-pause";
pauseButton.textContent = "暂停";
pauseButton.setAttribute("aria-label", "暂停游戏");
pauseButton.style.left = "max(64px, calc(env(safe-area-inset-left) + 64px))";
document.querySelector(".three-shell").appendChild(pauseButton);
const fragmentCount = document.querySelector("#fragment-count");
const fragmentTarget = document.querySelector("#fragment-target");
const timeLeft = document.querySelector("#time-left");
const status = document.querySelector("#status");
const statusLabel = document.querySelector("#status-label");
const errorPanel = document.querySelector("#webgl-error");
const campaignSelect = document.querySelector("[data-campaign-level]");
const campaignProgress = document.querySelector("[data-campaign-progress]");
const campaignHud = document.querySelector("#campaign-hud");
const styleProfiles = {
  classic: { sky: 0x101918, fog: 0x101918, ground: 0x25302c, stone: 0x6e7569, accent: 0xe0c174, detail: 22, wireframe: false, shape: "column" },
  calm: { sky: 0x182320, fog: 0x182320, ground: 0x34443e, stone: 0x74837a, accent: 0xb9d2c2, detail: 10, wireframe: false, shape: "slab" },
  fashion: { sky: 0x100f13, fog: 0x100f13, ground: 0x29252b, stone: 0x7b6962, accent: 0xffb472, detail: 28, wireframe: false, shape: "blade" },
  cute: { sky: 0x302638, fog: 0x302638, ground: 0x55445e, stone: 0x9b86a2, accent: 0xffd07d, detail: 18, wireframe: false, shape: "round" },
  "line-art": { sky: 0xe4dfd2, fog: 0xe4dfd2, ground: 0xcac4b7, stone: 0xece8dd, accent: 0xbf573f, detail: 8, wireframe: true, shape: "line" },
  "color-block": { sky: 0x17243a, fog: 0x17243a, ground: 0x31516e, stone: 0xf06b4f, accent: 0xffd84e, detail: 16, wireframe: false, shape: "block" }
};
const style = styleProfiles[config.visualStyle] || styleProfiles.fashion;
const textureLoader = new THREE.TextureLoader();
function loadTiledTexture(path, repeatX = 1, repeatY = 1) {
  const texture = textureLoader.load(path);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}
function loadSpriteTexture(index) {
  const texture = textureLoader.load("./assets/sprites/sprite-" + String(index + 1).padStart(2, "0") + ".png");
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
const groundTexture = loadTiledTexture("./assets/cover.png", 3, 3);
const ruinTexture = loadTiledTexture("./assets/arena-background.png", 1.5, 2.5);
const fragmentTexture = loadSpriteTexture(1);
const playerTexture = loadSpriteTexture(2);
const gateTexture = loadSpriteTexture(3);
const environmentTexture = textureLoader.load("./assets/arena-background.png");
environmentTexture.colorSpace = THREE.SRGBColorSpace;
const state = { running: false, finished: false, collected: 0, remaining: config.duration, lastTime: 0, mode: config.mode, checkpoint: false, wave: 1, health: 100, upgrade: 0, renderCount: 0, performanceTier: "medium", suspended: false };
let campaignLevelIndex = 0;
let campaignMaxUnlocked = 0;
let campaignMastery = {};
let requiredFragments = 4;
let activeDuration = config.duration;
function currentCampaignLevel() { return config.campaignLevels[campaignLevelIndex]; }
function saveCampaign() {
  try { safeStorage.setItem(config.campaignStorageKey, JSON.stringify({ schemaVersion: 2, current: campaignLevelIndex, maxUnlocked: campaignMaxUnlocked, mastery: campaignMastery })); } catch {}
}
function syncCampaignUi() {
  const level = currentCampaignLevel();
  campaignSelect.value = String(campaignLevelIndex);
  Array.from(campaignSelect.options).forEach((option, index) => { option.disabled = index > campaignMaxUnlocked; });
  campaignProgress.textContent = "第 " + level.number + " / " + config.campaignLevels.length + " 关 · " + level.tierLabel + " · " + level.ruleModifier;
  campaignHud.textContent = "WEB 3D · LEVEL " + String(level.number).padStart(2, "0") + " / " + config.campaignLevels.length;
  document.body.dataset.campaignCurrentLevel = String(level.number);
  let masteryCard = startCard.querySelector("[data-mastery-card]");
  if (!masteryCard) {
    masteryCard = document.createElement("section");
    masteryCard.dataset.masteryCard = "";
    masteryCard.className = "three-mastery-card";
    masteryCard.innerHTML = '<strong data-mastery-mission></strong><ul data-mastery-objectives></ul><small data-mastery-summary></small>';
    startCard.querySelector("#start")?.before(masteryCard);
  }
  masteryCard.querySelector("[data-mastery-mission]").textContent = level.mission;
  masteryCard.querySelector("[data-mastery-objectives]").replaceChildren(...level.masteryRules.map((rule) => {
    const item = document.createElement("li"); item.textContent = rule.label; return item;
  }));
  const earned = Math.max(0, Math.min(3, Number(campaignMastery[level.id]) || 0));
  const total = Object.values(campaignMastery).reduce((sum, value) => sum + Math.max(0, Math.min(3, Number(value) || 0)), 0);
  masteryCard.querySelector("[data-mastery-summary]").textContent = "本关 " + "★".repeat(earned) + "☆".repeat(3 - earned) + " · 总星章 " + total + " / 60";
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
function applyCampaignLevel() {
  const level = currentCampaignLevel();
  requiredFragments = Math.min(8, 3 + level.tier);
  activeDuration = Math.max(52, Math.round(config.duration / (.9 + (level.tier - 1) * .055)));
  fragmentTarget.textContent = String(requiredFragments);
}
let gameSessionState = "idle";
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
    status.textContent = "场景渲染保留，计时与敌人均已停止。";
  } else if (gameSessionState === "paused") {
    setGameSessionState("playing");
    startEnvironmentAudio();
    previousFrame = performance.now();
    pauseButton.textContent = "暂停";
    statusLabel.textContent = config.mode === "arena" ? "竞技继续" : "探索继续";
  }
}
const keys = new Set();
const obstacles = [];
const fragments = [];
const enemies = [];
let jumpVelocity = 0;
let attackCooldown = 0;
let damageCooldown = 0;
let renderSuspended = document.hidden;
let previousFrame = performance.now();
let renderer;

try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
} catch (error) {
  errorPanel.hidden = false;
  throw error;
}
const deviceMemory = Number(navigator.deviceMemory || 4);
const hardwareConcurrency = Number(navigator.hardwareConcurrency || 4);
let performanceTier = deviceMemory <= 2 || hardwareConcurrency <= 4 ? "low" : deviceMemory >= 8 && hardwareConcurrency >= 8 ? "high" : "medium";
const performanceProfiles = { low: { pixelRatio: 1, shadows: false, detailScale: .45 }, medium: { pixelRatio: 1.25, shadows: true, detailScale: .72 }, high: { pixelRatio: 1.5, shadows: true, detailScale: 1 } };
function applyPerformanceTier(nextTier) {
  performanceTier = nextTier;
  state.performanceTier = nextTier;
  const profile = performanceProfiles[nextTier];
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, profile.pixelRatio));
  renderer.shadowMap.enabled = profile.shadows;
  document.body.dataset.performanceTier = nextTier;
}
applyPerformanceTier(performanceTier);
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = config.visualStyle === "line-art" ? 1.3 : 1.42;

const scene = new THREE.Scene();
scene.background = environmentTexture;
scene.fog = new THREE.Fog(style.fog, 27, 72);
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 120);
camera.position.set(0, 7, 10);

scene.add(new THREE.HemisphereLight(0xe8fff6, 0x3a2c20, 2.8));
const sun = new THREE.DirectionalLight(0xffe3b0, 4.4);
sun.position.set(-10, 16, 8);
sun.castShadow = performanceProfiles[performanceTier].shadows;
sun.shadow.mapSize.set(performanceTier === "high" ? 1024 : 512, performanceTier === "high" ? 1024 : 512);
sun.shadow.camera.left = -26; sun.shadow.camera.right = 26; sun.shadow.camera.top = 26; sun.shadow.camera.bottom = -26;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(52, 52, 24, 24),
  new THREE.MeshStandardMaterial({ color: style.ground, map: groundTexture, roughness: 0.92, metalness: 0.05, wireframe: style.wireframe })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
world.add(ground);
const grid = new THREE.GridHelper(52, config.visualStyle === "color-block" ? 13 : 26, style.accent, 0x52605a);
grid.material.opacity = config.visualStyle === "line-art" ? 0.35 : 0.12;
grid.material.transparent = true;
world.add(grid);

function ruinGeometry(index) {
  if (style.shape === "round") return new THREE.CapsuleGeometry(0.65, 1.8 + index % 3, 5, 10);
  if (style.shape === "blade") return new THREE.ConeGeometry(0.9, 4 + index % 3, 4);
  if (style.shape === "block") return new THREE.BoxGeometry(1.7, 2.4 + index % 3, 1.7);
  if (style.shape === "slab") return new THREE.BoxGeometry(2.4, 1.1 + index % 2, 1.1);
  return new THREE.CylinderGeometry(0.65, 0.8, 3 + index % 3, style.shape === "line" ? 6 : 12);
}

function addRuin(x, z, index) {
  const height = 2 + index % 3;
  const material = new THREE.MeshStandardMaterial({ color: style.stone, map: ruinTexture, roughness: 0.78, metalness: 0.12, wireframe: style.wireframe });
  const ruin = new THREE.Mesh(ruinGeometry(index), material);
  ruin.position.set(x, height * 0.52, z);
  ruin.rotation.y = index * 0.71;
  ruin.castShadow = true;
  ruin.receiveShadow = true;
  world.add(ruin);
  obstacles.push({ x, z, radius: style.shape === "slab" ? 1.7 : 1.15 });
}

const ruinPositions = [[-8,-8],[0,-8],[8,-8],[-8,0],[8,0],[-8,8],[0,8],[8,8],[-14,-4],[14,4],[4,14],[-4,-14]];
ruinPositions.forEach((position, index) => addRuin(position[0], position[1], index));
for (let index = 0; index < Math.ceil(style.detail * performanceProfiles[performanceTier].detailScale); index += 1) {
  const angle = index * 2.399;
  const radius = 11 + (index % 5) * 2.2;
  const shard = new THREE.Mesh(
    new THREE.TetrahedronGeometry(0.18 + (index % 3) * 0.09),
    new THREE.MeshStandardMaterial({ color: index % 4 === 0 ? style.accent : style.stone, map: ruinTexture, roughness: 0.7, wireframe: style.wireframe })
  );
  shard.position.set(Math.cos(angle) * radius, 0.22, Math.sin(angle) * radius);
  shard.rotation.set(angle, angle * 0.3, 0);
  world.add(shard);
}

const player = new THREE.Group();
const playerSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: playerTexture, color: 0xffffff, transparent: true, alphaTest: 0.08, depthWrite: false }));
playerSprite.position.y = 1.35;
playerSprite.scale.set(3.15, 3.15, 1);
player.add(playerSprite);
const playerLight = new THREE.PointLight(style.accent, 6, 6, 2);
playerLight.position.y = 1.4;
player.add(playerLight);
scene.add(player);

function createFragments() {
  const positions = [[-15,-13],[14,-12],[15,13],[-15,13],[0,3],[-10,5],[11,7],[2,-11]];
  positions.forEach((position, index) => {
    const material = new THREE.SpriteMaterial({ map: fragmentTexture, color: 0xffffff, transparent: true, alphaTest: 0.08, depthWrite: false });
    const mesh = new THREE.Sprite(material);
    mesh.position.set(position[0], 1, position[1]);
    mesh.scale.set(1.65, 1.65, 1);
    mesh.userData.baseY = 1;
    mesh.userData.index = index;
    scene.add(mesh);
    fragments.push(mesh);
  });
}
createFragments();

const exit = new THREE.Group();
const gateMaterial = new THREE.MeshStandardMaterial({ color: style.stone, map: gateTexture, emissive: 0x000000, roughness: 0.45, wireframe: style.wireframe });
const leftGate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5, 0.8), gateMaterial);
const rightGate = leftGate.clone();
leftGate.position.set(-1.8, 2.5, 0); rightGate.position.set(1.8, 2.5, 0);
const topGate = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.8, 0.8), gateMaterial);
topGate.position.set(0, 5, 0);
const gateEmblem = new THREE.Sprite(new THREE.SpriteMaterial({ map: gateTexture, color: 0xc3aaa0, transparent: true, alphaTest: 0.08, depthWrite: false }));
gateEmblem.position.set(0, 2.65, 0.25);
gateEmblem.scale.set(3.2, 3.2, 1);
const gateLight = new THREE.PointLight(style.accent, 0, 11, 2);
gateLight.position.set(0, 2.5, 1);
exit.add(leftGate, rightGate, topGate, gateEmblem, gateLight);
exit.position.set(0, 0, -21);
scene.add(exit);

const checkpoint = new THREE.Group();
const checkpointRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.25, .13, 10, 32),
  new THREE.MeshStandardMaterial({ color: style.accent, emissive: style.accent, emissiveIntensity: .7, roughness: .35 })
);
checkpointRing.rotation.x = Math.PI / 2;
checkpointRing.position.y = .18;
const checkpointBeacon = new THREE.PointLight(style.accent, 5, 7, 2);
checkpointBeacon.position.y = 1.2;
checkpoint.add(checkpointRing, checkpointBeacon);
checkpoint.position.set(0, 0, 1);
checkpoint.visible = config.mode === "collector";
scene.add(checkpoint);

function clearEnemies() {
  enemies.splice(0).forEach((enemy) => scene.remove(enemy));
}
function spawnWave(wave) {
  clearEnemies();
  const count = 2 + wave + currentCampaignLevel().tier;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + wave * .37;
    const enemy = new THREE.Group();
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: loadSpriteTexture(4 + index % 4), color: 0xffffff, transparent: true, alphaTest: .08, depthWrite: false }));
    sprite.position.y = 1.25;
    sprite.scale.set(2.5, 2.5, 1);
    const halo = new THREE.Mesh(new THREE.RingGeometry(.65, .82, 24), new THREE.MeshBasicMaterial({ color: wave === 3 ? 0xff6d62 : style.accent, transparent: true, opacity: .7, side: THREE.DoubleSide }));
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = .08;
    enemy.add(sprite, halo);
    enemy.position.set(Math.cos(angle) * (12 + index % 3), 0, Math.sin(angle) * (12 + index % 3));
    enemy.userData.health = 1 + Math.floor((wave + currentCampaignLevel().tier - 1) / 3);
    enemy.userData.speed = 1.3 + wave * .28 + currentCampaignLevel().tier * .08;
    enemy.userData.phase = index;
    scene.add(enemy);
    enemies.push(enemy);
  }
  statusLabel.textContent = "第 " + wave + " / 3 波";
  status.textContent = "自动瞄准最近敌人，按空格或攻击键释放潮光脉冲。";
  fragmentCount.textContent = state.health + " · " + wave + "/3";
}

const sounds = {
  music: new Audio("./assets/music.wav"), ambient: new Audio("./assets/ambient.wav"),
  legal: new Audio("./assets/legal.wav"), illegal: new Audio("./assets/illegal.wav"), reward: new Audio("./assets/reward.wav"),
  hit: new Audio("./assets/hit.wav"), victory: new Audio("./assets/victory.wav"), defeat: new Audio("./assets/defeat.wav"), ui: new Audio("./assets/ui.wav")
};
sounds.music.loop = true;
sounds.ambient.loop = true;
sounds.music.volume = 0.16;
sounds.ambient.volume = 0.22;
const soundAliases = { collect: "reward", warning: "illegal" };
const soundLastPlayed = new Map();
function playSound(name) {
  const resolvedName = soundAliases[name] || name;
  const sound = sounds[resolvedName];
  if (!sound) return;
  const now = performance.now();
  if (now - (soundLastPlayed.get(resolvedName) || 0) < 70) return;
  soundLastPlayed.set(resolvedName, now);
  sound.currentTime = 0;
  void sound.play().catch(() => {});
}
function startEnvironmentAudio() {
  if (document.hidden) return;
  void sounds.music.play().catch(() => {});
  void sounds.ambient.play().catch(() => {});
}
function stopEnvironmentAudio() { sounds.music.pause(); sounds.ambient.pause(); }

function resetGame() {
  applyCampaignLevel();
  setGameSessionState("playing"); state.finished = false; state.collected = 0; state.remaining = activeDuration; state.checkpoint = false; state.wave = 1; state.health = 100; state.upgrade = 0;
  player.position.set(0, 0, 18);
  jumpVelocity = 0; attackCooldown = 0; damageCooldown = 0;
  checkpointRing.material.emissiveIntensity = .7;
  checkpointBeacon.intensity = 5;
  fragments.forEach((fragment, index) => { fragment.visible = config.mode === "collector" && index < requiredFragments; });
  if (config.mode === "arena") spawnWave(1); else clearEnemies();
  gateMaterial.emissive.setHex(0x000000);
  gateEmblem.material.color.setHex(0xc3aaa0);
  gateLight.intensity = 0;
  if (config.mode === "collector") fragmentCount.firstChild.textContent = "0 / ";
  else fragmentCount.textContent = "100 · 1/3";
  timeLeft.textContent = String(activeDuration);
  statusLabel.textContent = "任务目标";
  status.textContent = config.mode === "arena"
    ? "第 " + currentCampaignLevel().number + " 关 · " + currentCampaignLevel().ruleModifier + "；完成三波敌人并选择升级。"
    : "第 " + currentCampaignLevel().number + " 关 · " + currentCampaignLevel().ruleModifier + "；收集 " + requiredFragments + " 枚碎片、经过检查点后抵达出口。";
  startCard.hidden = true; resultCard.hidden = true;
  startEnvironmentAudio();
  previousFrame = performance.now();
}

function returnToSetup() {
  keys.clear();
  stopEnvironmentAudio();
  setGameSessionState("idle");
  state.finished = false;
  statusLabel.textContent = "启动设置";
  status.textContent = config.mode === "arena" ? "已返回启动页，可选择关卡后重新迎战。" : "已返回启动页，可选择关卡后重新进入遗迹。";
  resultCard.hidden = true;
  startCard.hidden = false;
}

function blocked(nextX, nextZ) {
  if (Math.abs(nextX) > 24 || Math.abs(nextZ) > 24) return true;
  const pressure = (currentCampaignLevel().tier - 1) * .07;
  return obstacles.some((obstacle) => Math.hypot(nextX - obstacle.x, nextZ - obstacle.z) < obstacle.radius + 0.55 + pressure);
}

function updatePlayer(delta) {
  if (!state.running) return;
  if (config.mode === "collector") {
    jumpVelocity -= 18 * delta;
    player.position.y = Math.max(0, player.position.y + jumpVelocity * delta);
    if (player.position.y === 0 && jumpVelocity < 0) jumpVelocity = 0;
  }
  let x = 0; let z = 0;
  if (keys.has("ArrowUp") || keys.has("KeyW")) z -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) z += 1;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) x -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) x += 1;
  if (!x && !z) return;
  const length = Math.hypot(x, z);
  x /= length; z /= length;
  const speed = (config.difficulty === "challenging" ? 8.2 : 7.2) * delta;
  const nextX = player.position.x + x * speed;
  const nextZ = player.position.z + z * speed;
  if (!blocked(nextX, player.position.z)) player.position.x = nextX;
  if (!blocked(player.position.x, nextZ)) player.position.z = nextZ;
  playerSprite.material.rotation = Math.atan2(x, -z) * 0.08;
}

function triggerAction() {
  if (!state.running) return;
  if (config.mode === "collector") {
    if (player.position.y <= .01) { jumpVelocity = 7.6; playSound("ui"); }
    return;
  }
  if (attackCooldown > 0) return;
  attackCooldown = Math.max(.28, .62 - state.upgrade * .08);
  const living = enemies.filter((enemy) => enemy.visible);
  living.sort((a, b) => player.position.distanceTo(a.position) - player.position.distanceTo(b.position));
  const target = living[0];
  if (!target || player.position.distanceTo(target.position) > 7 + state.upgrade * .7) { playSound("warning"); return; }
  target.userData.health -= 1 + Math.floor(state.upgrade / 2);
  target.scale.setScalar(1.18);
  playSound("hit");
  if (target.userData.health <= 0) target.visible = false;
}

function applyArenaUpgrade() {
  state.upgrade += 1;
  state.health = Math.min(100, state.health + 18);
  statusLabel.textContent = "潮印升级";
  status.textContent = state.upgrade % 2 ? "脉冲射程提升，生命恢复 18。" : "脉冲威力提升，生命恢复 18。";
  playSound("reward");
}

function updateArena(delta, time) {
  if (!state.running || config.mode !== "arena") return;
  attackCooldown = Math.max(0, attackCooldown - delta);
  damageCooldown = Math.max(0, damageCooldown - delta);
  const living = enemies.filter((enemy) => enemy.visible);
  for (const enemy of living) {
    const direction = player.position.clone().sub(enemy.position);
    direction.y = 0;
    const distance = direction.length();
    if (distance > 1.15) enemy.position.addScaledVector(direction.normalize(), enemy.userData.speed * delta);
    enemy.children[1].rotation.z = time * .001 + enemy.userData.phase;
    enemy.scale.lerp(new THREE.Vector3(1, 1, 1), Math.min(1, delta * 8));
    if (distance < 1.45 && damageCooldown <= 0) {
      state.health = Math.max(0, state.health - Math.max(7, 13 - state.upgrade * 2));
      damageCooldown = .8;
      fragmentCount.textContent = state.health + " · " + state.wave + "/3";
      playSound("illegal");
      if (state.health <= 0) { showResult(false); return; }
    }
  }
  if (living.length === 0) {
    if (state.wave >= 3) { showResult(true); return; }
    applyArenaUpgrade();
    state.wave += 1;
    spawnWave(state.wave);
  }
}

function collectFragments(time) {
  if (!state.running || config.mode !== "collector") return;
  checkpointRing.rotation.z = time * .0008;
  if (!state.checkpoint && player.position.distanceTo(checkpoint.position) < 1.8) {
    state.checkpoint = true;
    checkpointRing.material.emissiveIntensity = 2.2;
    checkpointBeacon.intensity = 10;
    statusLabel.textContent = "检查点已记录";
    status.textContent = "继续收集碎片，出口会在任务条件全部满足后开启。";
    playSound("reward");
  }
  fragments.forEach((fragment) => {
    if (!fragment.visible) return;
    fragment.rotation.y = time * 0.0014;
    fragment.position.y = fragment.userData.baseY + Math.sin(time * 0.003 + fragment.userData.index) * 0.22;
    if (player.position.distanceTo(fragment.position) < 1.35) {
      fragment.visible = false;
      state.collected += 1;
      fragmentCount.firstChild.textContent = state.collected + " / ";
      playSound("collect");
      if (state.collected === requiredFragments && state.checkpoint) {
        gateMaterial.emissive.setHex(style.accent);
        gateMaterial.emissiveIntensity = 1.25;
        gateEmblem.material.color.setHex(0xffffff);
        gateLight.intensity = 12;
        statusLabel.textContent = "出口已开启";
        status.textContent = "检查点与碎片条件均已完成，前往北侧发光遗迹门。";
      }
    }
  });
}

function showResult(won) {
  const finalWin = won && campaignLevelIndex === config.campaignLevels.length - 1;
  let masteryText = "";
  if (won) {
    const completedLevel = currentCampaignLevel();
    const stars = 1 + completedLevel.masteryRules.filter((rule) => state.remaining >= rule.target).length;
    campaignMastery[completedLevel.id] = Math.max(Number(campaignMastery[completedLevel.id]) || 0, stars);
    masteryText = " 本关评价 " + "★".repeat(stars) + "☆".repeat(3 - stars) + "。";
  }
  setGameSessionState(won ? (finalWin ? "won" : "stage-complete") : "lost"); state.finished = true;
  stopEnvironmentAudio();
  document.querySelector("#result-kicker").textContent = config.mode === "arena" ? (won ? "竞技场净空" : "潮光熄灭") : (won ? "遗迹已响应" : "探索中止");
  document.querySelector("#result-title").textContent = won ? (finalWin ? "20 关全部完成" : "第 " + (campaignLevelIndex + 1) + " 关完成") : (state.health <= 0 ? "战斗失败" : "时间耗尽");
  document.querySelector("#result-detail").textContent = won
    ? (config.mode === "arena" ? "你完成了三波作战，并让潮印升级持续生效。" : "你收集了全部碎片、经过检查点并抵达出口。") + masteryText
    : (config.mode === "arena" ? "已抵达第 " + state.wave + " 波，保留走位空间后再试一次。" : "已收集 " + state.collected + " / " + requiredFragments + " 枚碎片。重新规划路线再试一次。");
  resultCard.hidden = false;
  if (won && !finalWin) {
    campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex + 1);
    campaignLevelIndex += 1;
    saveCampaign(); syncCampaignUi(); applyCampaignLevel();
    document.querySelector("#restart").textContent = "进入第 " + (campaignLevelIndex + 1) + " 关";
  } else if (finalWin) {
    campaignMaxUnlocked = config.campaignLevels.length - 1;
    saveCampaign();
    document.querySelector("#restart").textContent = "重玩第 20 关";
  } else document.querySelector("#restart").textContent = "重试本关";
  if (won) playSound("victory"); else playSound("defeat");
}

document.addEventListener("visibilitychange", () => {
  renderSuspended = document.hidden;
  state.suspended = renderSuspended;
  if (document.hidden) stopEnvironmentAudio();
  else {
    previousFrame = performance.now();
    if (state.running) startEnvironmentAudio();
  }
});

function updateCamera(delta) {
  const distance = Number(config.contract?.cameraDistance) || (config.mode === "arena" ? 10 : 8);
  const target = new THREE.Vector3(player.position.x, config.mode === "arena" ? 7.2 : 5.6, player.position.z + distance);
  camera.position.lerp(target, Math.min(1, delta * 4.5));
  camera.lookAt(player.position.x, 1.35, player.position.z - 3.6);
}

function updateTimer(delta) {
  if (!state.running) return;
  state.remaining = Math.max(0, state.remaining - delta);
  timeLeft.textContent = String(Math.ceil(state.remaining));
  if (state.remaining <= 0) showResult(false);
  if (config.mode === "collector" && state.checkpoint && state.collected === requiredFragments && player.position.distanceTo(exit.position) < 3.4) showResult(true);
}

let slowFrames = 0;
function animate(time) {
  if (renderSuspended) return;
  const delta = Math.min(Math.max(0, time - previousFrame) / 1000, 0.05);
  previousFrame = time;
  updatePlayer(delta);
  collectFragments(time);
  updateArena(delta, time);
  updateTimer(delta);
  updateCamera(delta);
  renderer.render(scene, camera);
  state.renderCount += 1;
  slowFrames = delta > .026 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
  if (slowFrames > 90 && performanceTier !== "low") {
    applyPerformanceTier(performanceTier === "high" ? "medium" : "low");
    slowFrames = 0;
  }
}
renderer.setAnimationLoop(animate);

function resize() {
  const width = canvas.clientWidth || window.innerWidth;
  const height = canvas.clientHeight || window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

window.addEventListener("keydown", (event) => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","Space"].includes(event.code)) event.preventDefault();
  if (event.code === "Space" && !event.repeat) triggerAction();
  if (event.code === "KeyP" && !event.repeat) togglePause();
  keys.add(event.code);
});
window.addEventListener("keyup", (event) => keys.delete(event.code));
const touchMap = { up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" };
document.querySelectorAll("[data-key]").forEach((button) => {
  const code = touchMap[button.dataset.key];
  const release = () => { if (code) keys.delete(code); button.classList.remove("is-active"); };
  button.addEventListener("pointerdown", (event) => { event.preventDefault(); if (button.dataset.key === "action") triggerAction(); else keys.add(code); button.classList.add("is-active"); button.setPointerCapture(event.pointerId); });
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
});
document.querySelector("#start").addEventListener("click", resetGame);
document.querySelector("#restart").addEventListener("click", resetGame);
backToSetupButton.addEventListener("click", returnToSetup);
pauseButton.addEventListener("click", togglePause);
resultSetupButton.addEventListener("click", returnToSetup);
campaignSelect.addEventListener("change", () => {
  campaignLevelIndex = Math.min(campaignMaxUnlocked, Math.max(0, Number(campaignSelect.value) || 0));
  saveCampaign(); syncCampaignUi(); applyCampaignLevel();
});
loadCampaign();
applyCampaignLevel();

const gameDebugApi = {
  state,
  getState() { return { ...state, campaign: { level: currentCampaignLevel(), maxUnlocked: campaignMaxUnlocked + 1, total: config.campaignLevels.length, mastery: { ...campaignMastery }, stars: Object.values(campaignMastery).reduce((sum, value) => sum + Number(value || 0), 0) }, requiredFragments, enemyCount: enemies.filter((enemy) => enemy.visible).length, contract: config.contract }; },
  collectAll() { fragments.forEach((fragment) => { fragment.visible = false; }); state.collected = requiredFragments; fragmentCount.firstChild.textContent = requiredFragments + " / "; gateMaterial.emissive.setHex(style.accent); gateEmblem.material.color.setHex(0xffffff); gateLight.intensity = 12; },
  moveToExit() { player.position.copy(exit.position); },
  reachCheckpoint() { state.checkpoint = true; checkpointRing.material.emissiveIntensity = 2.2; },
  clearWave() { enemies.forEach((enemy) => { enemy.visible = false; }); },
  attack: triggerAction,
  forceDamage(amount = 20) { state.health = Math.max(0, state.health - Number(amount)); fragmentCount.textContent = state.health + " · " + state.wave + "/3"; if (state.health <= 0) showResult(false); },
  forceFail() { showResult(false); },
  suspend(value = true) { renderSuspended = Boolean(value); state.suspended = renderSuspended; if (!renderSuspended) previousFrame = performance.now(); },
  forceWin() { showResult(true); },
  restart: resetGame,
  setLevel(level) { campaignLevelIndex = Math.max(0, Math.min(19, Number(level) - 1)); campaignMaxUnlocked = Math.max(campaignMaxUnlocked, campaignLevelIndex); syncCampaignUi(); applyCampaignLevel(); saveCampaign(); }
};
if (new URLSearchParams(location.search).has("probe")) window.__GAME_DEBUG__ = gameDebugApi;
`;
}

function writeThreeArtifact(root: string, project: ProjectDetail) {
  if (!existsSync(threeModuleSource) || !existsSync(threeCoreSource)) throw new Error("Three.js 浏览器运行时缺失，请先安装项目依赖。");
  copySignalAssetPack(root);
  mkdirSync(join(root, "vendor"), { recursive: true });
  copyFileSync(threeModuleSource, join(root, "vendor", "three.module.js"));
  copyFileSync(threeCoreSource, join(root, "vendor", "three.core.js"));
  const html = threeGameHtml(project).replace(
    '<link rel="preload" as="image" href="./assets/gameplay-atlas.png">',
    '<link rel="preload" as="image" href="./assets/sprites/sprite-02.png"><link rel="preload" as="image" href="./assets/sprites/sprite-03.png"><link rel="preload" as="image" href="./assets/sprites/sprite-04.png">',
  );
  writeFileSync(join(root, "index.html"), html, "utf8");
  writeFileSync(join(root, "styles.css"), `${threeGameStyles}${threeCampaignStyles}${threeMasteryStyles}${threeMobilePlayFlowStyles}\n.three-controls [data-key=action]{grid-row:1;grid-column:3;background:color-mix(in srgb,var(--accent,#d6b968) 24%,#0d1618)}body[data-game-state=paused] .three-back{display:block}.three-pause{left:max(64px,calc(env(safe-area-inset-left) + 64px))!important}\n@media(max-width:720px){.three-controls{grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px)}body[data-game-state=playing] .three-objective,body[data-game-state=paused] .three-objective{max-width:calc(100% - 148px)}body[data-game-state=playing] .three-brand,body[data-game-state=paused] .three-brand{display:none}body[data-game-state=playing] .three-topbar,body[data-game-state=paused] .three-topbar{justify-content:flex-end;padding-left:0}}`, "utf8");
  writeFileSync(join(root, "app.js"), `${threeGameScript(project)}${gameTelemetryScript(project)}`, "utf8");
  const provenanceRoot = join(root, "_studio");
  mkdirSync(provenanceRoot, { recursive: true });
  const trackedAssets = ["cover.png", "arena-background.png", "music.wav", "ambient.wav", "hit.wav", "reward.wav", "victory.wav", "defeat.wav", "sprites/sprite-03.png", "sprites/sprite-05.png"];
  writeFileSync(join(provenanceRoot, "THREE_ASSET_PROVENANCE.json"), JSON.stringify({
    schemaVersion: 1,
    runtime: "three.js 0.185.1",
    mode: project.spec.threeMode ?? "collector",
    contract: project.spec.threeContract,
    models: [
      { id: "player-billboard", format: "bitmap-plane", use: "player-avatar", approximateTriangles: 2 },
      { id: "ruin-kit", format: "procedural-three-geometry", use: "collision-landmarks", approximateTriangles: 960 },
      { id: "gate-or-arena-kit", format: "procedural-three-geometry", use: project.spec.threeMode === "arena" ? "wave-arena" : "checkpoint-and-exit", approximateTriangles: 420 },
    ],
    glbAssets: [],
    note: "本版本未伪造 GLB 来源；角色、敌人和环境使用明确登记的位图平面与 Three.js 程序化网格。",
    files: trackedAssets.map((filename) => ({ filename: `assets/${filename}`, bytes: statSync(join(root, "assets", filename)).size, use: filename.includes(".wav") ? "audio" : filename.includes("sprite") ? "role-bitmap" : "environment-texture" })),
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
    assetPack: "signal-studio",
    assetManifest: "./assets/asset-manifest.json",
    artPipeline: { renderer: "threejs-role-bitmaps", sprites: "./assets/sprites/", cover: "./assets/cover.png", environment: "./assets/arena-background.png" },
    threeMode: project.spec.threeMode ?? "collector",
    threeContract: project.spec.threeContract,
    performanceProfiles: { low: { pixelRatio: 1, shadows: false }, medium: { pixelRatio: 1.25, shadows: true }, high: { pixelRatio: 1.5, shadows: true } },
    assetProvenance: "./_studio/THREE_ASSET_PROVENANCE.json",
  }, null, 2), "utf8");
}

export function writeGameArtifact(root: string, project: ProjectDetail) {
  mkdirSync(root, { recursive: true });
  if (project.spec.runtimeTarget === "web-3d") {
    writeThreeArtifact(root, project);
    return;
  }
  if (project.spec.template !== "signal-hunt") {
    writeTemplateArtifact(root, project);
    return;
  }
  copySignalAssetPack(root);
  const html = gameHtml(project).replace(
    '<link rel="preload" as="image" href="./assets/gameplay-atlas.png">',
    '<link rel="preload" as="image" href="./assets/sprites/sprite-01.png">',
  );
  writeFileSync(join(root, "index.html"), html, "utf8");
  writeFileSync(join(root, "styles.css"), `${gameStyles}${signalVisualStyles}${stageBSignalStyles}${signalMasteryStyles}${signalAspectStyles(project)}${signalMobilePlayFlowStyles}`, "utf8");
  writeFileSync(join(root, "app.js"), `${gameScript(project)}${gameTelemetryScript(project)}`, "utf8");
  writeFileSync(
    join(root, "game-manifest.json"),
    JSON.stringify({
      title: project.title,
      template: "signal-hunt",
      runtimeTarget: project.spec.runtimeTarget,
      visualStyle: project.spec.visualStyle,
      aspectRatio: project.spec.aspectRatio,
      cameraMode: project.spec.cameraMode,
      inputModes: project.spec.inputModes,
      levelProgression: project.spec.levelProgression,
      generatedAt: new Date().toISOString(),
      assetPack: "signal-studio",
      assetManifest: "./assets/asset-manifest.json",
      artPipeline: { renderer: "css-role-bitmap", sprite: "./assets/sprites/sprite-01.png", environment: "./assets/arena-background.png" },
      assetCount: 7,
    }, null, 2),
    "utf8",
  );
}

function inspectAssets(root: string) {
  const assetRoot = join(root, "assets");
  const manifest = JSON.parse(readFileSync(join(assetRoot, "asset-manifest.json"), "utf8")) as {
    schemaVersion?: number;
    trackSystem?: { music?: string; ambient?: string; gameplay?: string[]; ui?: string };
    assets?: Array<{ filename?: string; role?: string; targetSize?: string; safeCrop?: string; subjectRatio?: string; transparentBackground?: boolean }>;
  };
  const requiredRoles = ["cover", "gameplay-background", "music-track", "ambient-track", "ui-sfx", "legal-sfx", "illegal-sfx", "reward-sfx", "hit-sfx", "victory-sfx", "defeat-sfx"];
  const spriteAssets = manifest.assets?.filter((candidate) => candidate.role?.startsWith("sprite-")) ?? [];
  const tracksComplete = Boolean(manifest.trackSystem?.music && manifest.trackSystem?.ambient && manifest.trackSystem?.ui && manifest.trackSystem?.gameplay?.length === 6);
  const requiredFilesComplete = requiredRoles.every((role) => {
    const asset = manifest.assets?.find((candidate) => candidate.role === role);
    if (!asset?.filename) return false;
    const filename = join(assetRoot, asset.filename);
    return existsSync(filename) && statSync(filename).size > 500;
  });
  const spritesComplete = spriteAssets.length === 9 && spriteAssets.every((asset) => {
    const filename = asset.filename ? join(assetRoot, asset.filename) : "";
    return Boolean(filename)
      && existsSync(filename)
      && statSync(filename).size > 1_000
      && asset.transparentBackground === true
      && Boolean(asset.targetSize && asset.safeCrop && asset.subjectRatio);
  });
  return manifest.schemaVersion === 3 && tracksComplete && requiredFilesComplete && spritesComplete;
}

export function inspectGameArtifact(root: string) {
  const html = readFileSync(join(root, "index.html"), "utf8");
  const script = readFileSync(join(root, "app.js"), "utf8");
  const styles = readFileSync(join(root, "styles.css"), "utf8");
  const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")) as {
    template?: ProjectDetail["spec"]["template"];
    visualStyle?: ProjectDetail["spec"]["visualStyle"];
    runtimeTarget?: ProjectDetail["spec"]["runtimeTarget"];
    aspectRatio?: ProjectDetail["spec"]["aspectRatio"];
    cameraMode?: ProjectDetail["spec"]["cameraMode"];
    inputModes?: ProjectDetail["spec"]["inputModes"];
    levelProgression?: ProjectDetail["spec"]["levelProgression"];
  };
  if (manifest.runtimeTarget === "web-3d") {
    const vendor = join(root, "vendor", "three.module.js");
    const vendorCore = join(root, "vendor", "three.core.js");
    const probes = [
      ["WebGL 2 首次加载", html.includes('id="game-canvas"') && html.includes('type="module"') && html.includes('id="start"')],
      ["Three.js 本地运行时", existsSync(vendor) && existsSync(vendorCore) && statSync(vendor).size > 100_000 && statSync(vendorCore).size > 100_000 && script.includes('from "./vendor/three.module.js"')],
      ["真实 3D 场景", script.includes("new THREE.WebGLRenderer") && script.includes("new THREE.PerspectiveCamera") && script.includes("new THREE.Scene")],
      ["角色拆分位图材质", script.includes("new THREE.TextureLoader") && script.includes("function loadSpriteTexture(index)") && script.includes("map: groundTexture") && script.includes("map: ruinTexture")],
      ["位图角色与收集物", script.includes("new THREE.SpriteMaterial") && script.includes("playerSprite") && script.includes("fragmentTexture") && script.includes("gateEmblem")],
      ["第三人称移动", script.includes("function updatePlayer(delta)") && script.includes("function updateCamera(delta)")],
      ["碰撞与边界", script.includes("function blocked(nextX, nextZ)") && script.includes("obstacles.some")],
      ["收集核心循环", script.includes("function collectFragments(time)") && script.includes("state.collected += 1")],
      ["胜负与重开", script.includes("showResult(true)") && script.includes("showResult(false)") && script.includes('"#restart"')],
      ["键盘与触控", script.includes('window.addEventListener("keydown"') && html.includes('data-key="up"') && script.includes('button.addEventListener("pointerdown"')],
      ["响应式与性能", styles.includes("@media(max-width:720px)") && script.includes("performanceProfiles") && script.includes("applyPerformanceTier") && script.includes('window.addEventListener("resize"')],
      ["目标画幅合同", Boolean(manifest.aspectRatio) && styles.includes("width:100vw") && styles.includes("height:100svh")],
      ["镜头与输入合同", Boolean(manifest.cameraMode) && Boolean(manifest.inputModes?.length) && script.includes("config.cameraMode")],
      ["统一运行状态", script.includes("function setGameSessionState(nextState)") && script.includes('document.body.dataset.gameState = nextState')],
      ["二十关渐进合同", Number(manifest.levelProgression?.levelCount) >= 20 && html.includes("data-campaign-level") && script.includes("config.campaignLevels")],
      ["真实视听资产", inspectAssets(root)],
      ["视觉风格合同", Boolean(manifest.visualStyle) && html.includes(`data-visual-style="${manifest.visualStyle}"`) && script.includes("const styleProfiles") && script.includes("style.detail")],
      ["专业设计文档", existsSync(join(root, "_studio", "GAME_DESIGN.md"))
        && existsSync(join(root, "_studio", "ART_REVIEW.md"))
        && readFileSync(join(root, "_studio", "GAME_DESIGN.md"), "utf8").includes("## 核心循环")
        && readFileSync(join(root, "_studio", "ART_REVIEW.md"), "utf8").includes("主体占据可用面积约 82%–94%")],
    ] as const;
    const failed = probes.filter(([, passed]) => !passed);
    if (failed.length) throw new Error(`3D 试玩探针失败：${failed.map(([name]) => name).join("、")}`);
    return probes.map(([name]) => name);
  }
  new Script(script, { filename: "app.js" });
  const runtime = getRuntimeDefinition(manifest.template ?? "signal-hunt");
  if (runtime) {
    const probes = [
      ["首次加载", html.includes('id="start"') && html.includes('id="game-canvas"')],
      ["主要输入", script.includes("handleControl") && script.includes('addEventListener("click"')],
      ["模板核心规则", runtime.probeTokens.every((token) => script.includes(token))],
      ["完成条件", script.includes("showResult(true") && (script.includes("showResult(false") || ["puzzle", "klotski", "maze", "polyomino-fit"].includes(runtime.id))],
      ["重新开始", script.includes('restartButton.addEventListener("click", () => {') && script.includes('restartButton.textContent = "再次点击重开"')],
      ["响应式结构", styles.includes("@media(max-width:520px)")],
      ["目标画幅合同", Boolean(manifest.aspectRatio) && styles.includes("--game-aspect:") && script.includes("config.canvasWidth") && script.includes("config.canvasHeight")],
      ["镜头与输入合同", Boolean(manifest.cameraMode) && Boolean(manifest.inputModes?.length) && script.includes("config.cameraMode")],
      ["统一运行状态", script.includes("function setGameSessionState(nextState)") && script.includes('document.body.dataset.gameState = nextState')],
      ["二十关渐进合同", Number(manifest.levelProgression?.levelCount) >= 20 && html.includes("data-campaign-level") && script.includes("campaignScale")],
      ["真实视听资产", inspectAssets(root)],
      ["角色拆分位图美术", script.includes("function drawBitmapSprite") && script.includes("const spriteImages = config.spriteFiles.map") && script.includes('backgroundArt.src = "./assets/background.png"')],
      ["个性化能力", runtime.id !== "puzzle" || html.includes('id="puzzle-upload"')],
      ["视觉风格合同", Boolean(manifest.visualStyle)
        && html.includes(`data-visual-style="${manifest.visualStyle}"`)
        && html.includes("data-detail-level=")
        && html.includes('class="style-ornament"')
        && styles.includes(`data-visual-style="${manifest.visualStyle}"`)
        && script.includes("const visualStyleProfiles")
        && script.includes("function finishCanvasStyle()")
        && runtime.script.includes("finishCanvasStyle();")],
      ["专业设计文档", existsSync(join(root, "_studio", "GAME_DESIGN.md"))
        && existsSync(join(root, "_studio", "ART_REVIEW.md"))
        && readFileSync(join(root, "_studio", "GAME_DESIGN.md"), "utf8").includes("## 核心循环")
        && readFileSync(join(root, "_studio", "ART_REVIEW.md"), "utf8").includes("主体占据可用面积约 82%–94%")],
    ] as const;
    const failed = probes.filter(([, passed]) => !passed);
    if (failed.length) throw new Error(`试玩探针失败：${failed.map(([name]) => name).join("、")}`);
    return probes.map(([name]) => name);
  }
  const probes = [
    ["首次加载", html.includes('id="start"') && html.includes('src="./app.js"')],
    ["主要输入", html.includes('id="target"') && script.includes('addEventListener("click"')],
    ["核心循环", script.includes("function collect()") && script.includes("score += 1")],
    ["完成条件", script.includes("score >= currentGoal") && script.includes("finish(true)")],
    ["重新开始", script.includes("function start()") && script.includes("restartButton")],
    ["响应式结构", styles.includes("@media(max-width:720px)")],
    ["目标画幅合同", Boolean(manifest.aspectRatio)],
    ["镜头与输入合同", Boolean(manifest.cameraMode) && Boolean(manifest.inputModes?.length) && script.includes("config.cameraMode")],
    ["统一运行状态", script.includes("function setGameSessionState(nextState)") && script.includes('document.body.dataset.gameState = nextState')],
    ["二十关渐进合同", Number(manifest.levelProgression?.levelCount) >= 20 && html.includes("data-campaign-level") && script.includes("config.campaignLevels")],
    ["真实视听资产", inspectAssets(root)],
    ["角色拆分位图美术", html.includes('href="./assets/sprites/sprite-01.png"') && styles.includes('background-image:url("./assets/sprites/sprite-01.png")')],
    ["视觉风格合同", Boolean(manifest.visualStyle) && html.includes(`data-visual-style="${manifest.visualStyle}"`) && styles.includes(`data-visual-style="${manifest.visualStyle}"`) && script.includes('visualStyle')],
    ["专业设计文档", existsSync(join(root, "_studio", "GAME_DESIGN.md"))
      && existsSync(join(root, "_studio", "ART_REVIEW.md"))
      && readFileSync(join(root, "_studio", "GAME_DESIGN.md"), "utf8").includes("## 核心循环")
      && readFileSync(join(root, "_studio", "ART_REVIEW.md"), "utf8").includes("主体占据可用面积约 82%–94%")],
  ] as const;
  const failed = probes.filter(([, passed]) => !passed);
  if (failed.length) throw new Error(`试玩探针失败：${failed.map(([name]) => name).join("、")}`);
  return probes.map(([name]) => name);
}
