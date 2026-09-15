const safeStorage = (() => {
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
})();
const config = {"title":"折光堆叠","template":"tetris","difficulty":"standard","visualStyle":"color-block","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"board","inputModes":["swipe","keyboard","touch-buttons"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":[],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"tetris-01","label":"01 · 认识规则 · 基础构件","tier":1,"tierLabel":"认识规则","variant":0,"seed":3058575065,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"基础构件","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":2,"id":"tetris-02","label":"02 · 认识规则 · 预览规划","tier":1,"tierLabel":"认识规则","variant":1,"seed":337095690,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"预览规划","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":3,"id":"tetris-03","label":"03 · 认识规则 · 速度变化","tier":1,"tierLabel":"认识规则","variant":2,"seed":4074713723,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"速度变化","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":4,"id":"tetris-04","label":"04 · 认识规则 · 危险高度","tier":1,"tierLabel":"认识规则","variant":3,"seed":1352972716,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"危险高度","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"解锁稳定节奏"},{"number":5,"id":"tetris-05","label":"05 · 稳定节奏 · 基础构件","tier":2,"tierLabel":"稳定节奏","variant":0,"seed":1064058653,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"基础构件","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":6,"id":"tetris-06","label":"06 · 稳定节奏 · 预览规划","tier":2,"tierLabel":"稳定节奏","variant":1,"seed":2637530446,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"预览规划","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":7,"id":"tetris-07","label":"07 · 稳定节奏 · 速度变化","tier":2,"tierLabel":"稳定节奏","variant":2,"seed":2080181439,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"速度变化","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":8,"id":"tetris-08","label":"08 · 稳定节奏 · 危险高度","tier":2,"tierLabel":"稳定节奏","variant":3,"seed":3653407456,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"危险高度","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"解锁加入变化"},{"number":9,"id":"tetris-09","label":"09 · 加入变化 · 基础构件","tier":3,"tierLabel":"加入变化","variant":0,"seed":2810845265,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"基础构件","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":10,"id":"tetris-10","label":"10 · 加入变化 · 预览规划","tier":3,"tierLabel":"加入变化","variant":1,"seed":106143618,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"预览规划","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":11,"id":"tetris-11","label":"11 · 加入变化 · 速度变化","tier":3,"tierLabel":"加入变化","variant":2,"seed":3827000819,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"速度变化","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":12,"id":"tetris-12","label":"12 · 加入变化 · 危险高度","tier":3,"tierLabel":"加入变化","variant":3,"seed":1122036516,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"危险高度","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"解锁组合压力"},{"number":13,"id":"tetris-13","label":"13 · 组合压力 · 基础构件","tier":4,"tierLabel":"组合压力","variant":0,"seed":547910293,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"基础构件","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":14,"id":"tetris-14","label":"14 · 组合压力 · 预览规划","tier":4,"tierLabel":"组合压力","variant":1,"seed":2406611142,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"预览规划","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":15,"id":"tetris-15","label":"15 · 组合压力 · 速度变化","tier":4,"tierLabel":"组合压力","variant":2,"seed":1832484407,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"速度变化","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"关卡星章"},{"number":16,"id":"tetris-16","label":"16 · 组合压力 · 危险高度","tier":4,"tierLabel":"组合压力","variant":3,"seed":3406742648,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"危险高度","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"解锁最终掌握"},{"number":17,"id":"tetris-17","label":"17 · 最终掌握 · 基础构件","tier":5,"tierLabel":"最终掌握","variant":0,"seed":2849393577,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"基础构件","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"大师徽记"},{"number":18,"id":"tetris-18","label":"18 · 最终掌握 · 预览规划","tier":5,"tierLabel":"最终掌握","variant":1,"seed":933220634,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"预览规划","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"大师徽记"},{"number":19,"id":"tetris-19","label":"19 · 最终掌握 · 速度变化","tier":5,"tierLabel":"最终掌握","variant":2,"seed":2523354955,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"速度变化","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"大师徽记"},{"number":20,"id":"tetris-20","label":"20 · 最终掌握 · 危险高度","tier":5,"tierLabel":"最终掌握","variant":3,"seed":1949097660,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"危险高度","mission":"完成目标消行，同时为后续构件保留干净落点。","masteryRules":[{"id":"efficiency","label":"得分达到目标线数 × 300","metric":"score","comparison":"ratio-gte","referenceMetric":"lineTarget","target":300},{"id":"control","label":"至少取得目标线数 × 20 的硬降奖励","metric":"hardDropScore","comparison":"ratio-gte","referenceMetric":"lineTarget","target":20}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:0bd4ea6a-2125-40e0-bee1-d5baa268ef1e:01de8ef0-db83-4a4d-a905-769b3657c095","masteryStorageKey":"forge-mastery:0bd4ea6a-2125-40e0-bee1-d5baa268ef1e:01de8ef0-db83-4a4d-a905-769b3657c095"};
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


const columns = 10;
const rows = 20;
const board = Array.from({ length: rows }, () => Array(columns).fill(0));
const pieceNames = ["I", "O", "T", "J", "L", "S", "Z"];
const rotationStates = [
  [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
  ],
  [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
  ],
  [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
  ],
  [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ],
  [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ],
];
const shapes = rotationStates.map((states) => states[0]);
const jlstzKickTests = {
  "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};
const iKickTests = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};
const blockColors = palette.pieces;
const tetrisCellGeometry = Object.freeze({
  inset: 2,
  radiusRatio: .15,
  textureScale: 1.46,
  outlineWidth: 2.5,
  axisAlignedCells: true,
  protrusion: 0,
});
let piece;
let nextPieceIndex = 0;
let pieceQueue = [];
let heldPieceIndex = null;
let holdUsed = false;
let lines = 0;
let score = 0;
let hardDropScore = 0;
let softDropScore = 0;
let combo = -1;
let backToBack = false;
let lastClearLabel = "";
let lastClearPoints = 0;
let lastActionWasRotation = false;
let clearedRows = [];
let clearFlashUntil = 0;
let tetrisMode = "standard";
let modeTimeLimit = 0;
let modeStartedAt = 0;
let tickId = null;
let lockTimerId = null;
let lockResetCount = 0;
let pieceSerial = 0;
let lineTarget = 6;
let fallInterval = 570;
const lockDelayMs = 500;
const maxLockResets = 15;

function collides(candidate, offsetX = piece.x, offsetY = piece.y) {
  return candidate.some((row, y) => row.some((value, x) => value && (
    offsetX + x < 0 || offsetX + x >= columns || offsetY + y >= rows ||
    (offsetY + y >= 0 && board[offsetY + y][offsetX + x])
  )));
}

function randomPieceIndex() {
  fillPieceQueue();
  const index = pieceQueue.shift();
  fillPieceQueue();
  return index;
}

function createSevenBag() {
  const bag = pieceNames.map((_, index) => index);
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(campaignRandom() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }
  return bag;
}

function fillPieceQueue() {
  while (pieceQueue.length < 7) pieceQueue.push(...createSevenBag());
}

function clearLockTimer() {
  if (lockTimerId) clearTimeout(lockTimerId);
  lockTimerId = null;
}

function scheduleLock() {
  if (lockTimerId || !running) return;
  const serial = piece.serial;
  lockTimerId = setTimeout(() => {
    lockTimerId = null;
    if (!running || piece.serial !== serial || !collides(piece.shape, piece.x, piece.y + 1)) return;
    mergePiece();
    drawTetris();
  }, lockDelayMs);
}

function refreshLockDelay() {
  if (!collides(piece.shape, piece.x, piece.y + 1)) {
    clearLockTimer();
    return;
  }
  if (lockResetCount >= maxLockResets) return;
  lockResetCount += 1;
  clearLockTimer();
  scheduleLock();
}

function spawnPiece(forcedIndex = null) {
  clearLockTimer();
  const shapeIndex = forcedIndex === null ? randomPieceIndex() : forcedIndex;
  fillPieceQueue();
  nextPieceIndex = pieceQueue[0];
  piece = { shapeIndex, rotation: 0, shape: rotationStates[shapeIndex][0].map((row) => [...row]), x: 3, y: 0, color: shapeIndex + 1, serial: ++pieceSerial };
  holdUsed = false;
  lockResetCount = 0;
  lastActionWasRotation = false;
  if (collides(piece.shape)) {
    if (tetrisMode === "zen") {
      board.splice(0, 4);
      while (board.length < rows) board.push(Array(columns).fill(0));
      setStatus("禅模式已柔和整理顶部空间，继续保持节奏。 ");
    } else showResult(false, "堆叠触顶", "光块已经抵达天际线，重新整理节奏再试一次。");
  }
}

function tSpinDetected() {
  if (piece.shapeIndex !== 2 || !lastActionWasRotation) return false;
  const pivotX = piece.x + 1;
  const pivotY = piece.y + 1;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const occupied = corners.filter(([dx, dy]) => {
    const x = pivotX + dx;
    const y = pivotY + dy;
    return x < 0 || x >= columns || y >= rows || (y >= 0 && board[y][x]);
  }).length;
  return occupied >= 3;
}

function scoreLineClear(cleared, tSpin, perfectClear) {
  const level = Math.max(1, currentCampaignLevel().tier);
  const lineBase = [0, 100, 300, 500, 800][cleared] || 0;
  const tSpinBase = [400, 800, 1200, 1600][cleared] || 0;
  const difficult = cleared === 4 || (tSpin && cleared > 0);
  const wasBackToBack = backToBack;
  combo = cleared > 0 ? combo + 1 : -1;
  let points = (tSpin ? tSpinBase : lineBase) * level;
  if (difficult && wasBackToBack) points = Math.round(points * 1.5);
  if (cleared > 0 && combo > 0) points += 50 * combo * level;
  if (perfectClear && cleared > 0) points += ([0, 800, 1200, 1800, 2000][cleared] || 0) * level;
  if (difficult) backToBack = true;
  else if (cleared > 0) backToBack = false;
  if (cleared > 0 || tSpin) {
    const clearNames = ["", "单消", "双消", "三消", "四线消除"];
    lastClearLabel = (tSpin ? "T 旋 · " : "") + clearNames[cleared] + (wasBackToBack && difficult ? " · 背靠背" : "") + (combo > 0 ? " · 连消 ×" + (combo + 1) : "") + (perfectClear ? " · 全清" : "");
    lastClearPoints = points;
  } else {
    lastClearLabel = "";
    lastClearPoints = 0;
  }
  return points;
}

function mergePiece() {
  clearLockTimer();
  const tSpin = tSpinDetected();
  piece.shape.forEach((row, y) => row.forEach((value, x) => {
    if (value && piece.y + y >= 0) board[piece.y + y][piece.x + x] = piece.color;
  }));
  navigator.vibrate?.(12);
  const completedRows = [];
  for (let y = rows - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) completedRows.push(y);
  }
  completedRows.forEach((rowIndex) => board.splice(rowIndex, 1));
  for (let index = 0; index < completedRows.length; index += 1) board.unshift(Array(columns).fill(0));
  const cleared = completedRows.length;
  const perfectClear = cleared > 0 && board.every((row) => row.every((value) => !value));
  score += scoreLineClear(cleared, tSpin, perfectClear);
  if (cleared) {
    clearedRows = completedRows;
    clearFlashUntil = performance.now() + 320;
    lines += cleared;
    setMetric(lines + " / " + lineTarget);
    playSound("success");
    if (lines >= lineTarget) {
      showResult(true, "天际线完成", "你用 " + lines + " 条消行建立了稳定结构。");
      return;
    }
  }
  spawnPiece();
}

function stepDown() {
  if (!running) return;
  if (tetrisMode === "timed" && performance.now() - modeStartedAt >= modeTimeLimit * 1000) {
    showResult(false, "限时结束", "本局完成 " + lines + " 条消行、得到 " + score + " 分。 ");
    return;
  }
  if (!collides(piece.shape, piece.x, piece.y + 1)) {
    piece.y += 1;
    lastActionWasRotation = false;
    clearLockTimer();
  } else scheduleLock();
  drawTetris();
}

function softDrop() {
  if (!running) return;
  if (!collides(piece.shape, piece.x, piece.y + 1)) {
    piece.y += 1;
    softDropScore += 1;
    score += 1;
    lastActionWasRotation = false;
    clearLockTimer();
  } else scheduleLock();
  drawTetris();
}

function movePiece(direction) {
  if (!running) return;
  if (!collides(piece.shape, piece.x + direction, piece.y)) {
    piece.x += direction;
    lastActionWasRotation = false;
    refreshLockDelay();
    playSound("move");
  }
  drawTetris();
}

function rotatePiece() {
  if (!running) return;
  const from = piece.rotation;
  const to = (from + 1) % 4;
  const rotated = rotationStates[piece.shapeIndex][to];
  const table = piece.shapeIndex === 0 ? iKickTests : piece.shapeIndex === 1 ? { [from + ">" + to]: [[0, 0]] } : jlstzKickTests;
  const tests = table[from + ">" + to] || [[0, 0]];
  const kick = tests.find(([dx, dy]) => !collides(rotated, piece.x + dx, piece.y + dy));
  if (kick) {
    piece.rotation = to;
    piece.shape = rotated.map((row) => [...row]);
    piece.x += kick[0];
    piece.y += kick[1];
    lastActionWasRotation = true;
    refreshLockDelay();
    playSound("move");
  }
  drawTetris();
}

function hardDrop() {
  if (!running) return;
  let distance = 0;
  while (!collides(piece.shape, piece.x, piece.y + 1)) { piece.y += 1; distance += 1; }
  if (distance > 0) lastActionWasRotation = false;
  hardDropScore += distance * 2;
  score += distance * 2;
  mergePiece();
  drawTetris();
}

function holdPiece() {
  if (!running || holdUsed) return;
  const currentIndex = piece.color - 1;
  const replacement = heldPieceIndex;
  heldPieceIndex = currentIndex;
  if (replacement === null) spawnPiece();
  else spawnPiece(replacement);
  holdUsed = true;
  playSound("move");
  drawTetris();
}

function connectedEdges(shape, x, y) {
  return {
    top: Boolean(shape[y - 1]?.[x]),
    right: Boolean(shape[y]?.[x + 1]),
    bottom: Boolean(shape[y + 1]?.[x]),
    left: Boolean(shape[y]?.[x - 1]),
  };
}

function boardEdges(x, y, colorIndex) {
  return {
    top: board[y - 1]?.[x] === colorIndex,
    right: board[y]?.[x + 1] === colorIndex,
    bottom: board[y + 1]?.[x] === colorIndex,
    left: board[y]?.[x - 1] === colorIndex,
  };
}

function drawBlock(x, y, colorIndex, size, originX, originY, _edges, options = {}) {
  const px = Math.round(originX + x * size);
  const py = Math.round(originY + y * size);
  const color = blockColors[colorIndex - 1] || palette.primary;
  const alpha = options.ghost ? .24 : 1;
  const inset = Math.min(tetrisCellGeometry.inset, size * .14);
  const blockX = px + inset;
  const blockY = py + inset;
  const blockSize = size - inset * 2;
  const radius = Math.max(2, Math.round(blockSize * tetrisCellGeometry.radiusRatio));
  ctx.save();
  ctx.globalAlpha = alpha;
  if (!options.ghost) {
    ctx.shadowColor = "rgba(14,8,22,.46)";
    ctx.shadowBlur = Math.max(4, size * .12);
    ctx.shadowOffsetY = Math.max(2, size * .05);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(blockX, blockY, blockSize, blockSize, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (!options.ghost) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(blockX, blockY, blockSize, blockSize, radius);
    ctx.clip();
    drawBitmapSprite((colorIndex - 1) % 7, blockX, blockY, blockSize, blockSize, {
      fallback: color,
      fit: "cover",
      scale: tetrisCellGeometry.textureScale,
    });
    const shine = ctx.createLinearGradient(blockX, blockY, blockX + blockSize, blockY + blockSize);
    shine.addColorStop(0, "rgba(255,255,255,.18)");
    shine.addColorStop(.42, "rgba(255,255,255,.02)");
    shine.addColorStop(1, "rgba(40,20,50,.12)");
    ctx.fillStyle = shine;
    ctx.fillRect(blockX, blockY, blockSize, blockSize);
    ctx.restore();
  }
  ctx.strokeStyle = options.ghost ? "rgba(255,202,222,.66)" : "rgba(255,255,255,.9)";
  ctx.lineWidth = options.ghost ? 3 : tetrisCellGeometry.outlineWidth;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.roundRect(blockX, blockY, blockSize, blockSize, radius);
  ctx.stroke();
  ctx.restore();
}

function drawShape(shape, offsetX, offsetY, colorIndex, size, originX, originY, options = {}) {
  shape.forEach((row, y) => row.forEach((value, x) => {
    if (!value || offsetY + y < 0) return;
    drawBlock(offsetX + x, offsetY + y, colorIndex, size, originX, originY, connectedEdges(shape, x, y), options);
  }));
}

function drawMiniPiece(shapeIndex, x, y, label = "", options = {}) {
  const shape = shapes[shapeIndex];
  const miniCell = options.cell || 20;
  const slotWidth = options.width || 124;
  const slotHeight = options.height || 78;
  const cells = [];
  shape.forEach((row, rowIndex) => row.forEach((value, columnIndex) => { if (value) cells.push([columnIndex, rowIndex]); }));
  const minX = Math.min(...cells.map(([column]) => column));
  const maxX = Math.max(...cells.map(([column]) => column));
  const minY = Math.min(...cells.map(([, row]) => row));
  const maxY = Math.max(...cells.map(([, row]) => row));
  const labelHeight = label ? 25 : 0;
  const shapeWidth = (maxX - minX + 1) * miniCell;
  const shapeHeight = (maxY - minY + 1) * miniCell;
  const shapeX = x + (slotWidth - shapeWidth) / 2 - minX * miniCell;
  const shapeY = y + labelHeight + (slotHeight - labelHeight - shapeHeight) / 2 - minY * miniCell;
  ctx.save();
  if (label) {
    ctx.fillStyle = palette.textSoft; ctx.font = "700 16px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + slotWidth / 2, y + 17);
  }
  shape.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    if (!value) return;
    drawBlock(columnIndex, rowIndex, shapeIndex + 1, miniCell, shapeX, shapeY, connectedEdges(shape, columnIndex, rowIndex));
  }));
  ctx.restore();
}

function landingY() {
  let y = piece.y;
  while (!collides(piece.shape, piece.x, y + 1)) y += 1;
  return y;
}

function drawTetris() {
  clearCanvas();
  const size = config.aspectRatio === "9:16" ? 50 : 29;
  const originX = (canvas.width - columns * size) / 2;
  const originY = config.aspectRatio === "9:16" ? 168 : (canvas.height - rows * size) / 2;
  if (config.aspectRatio === "9:16") {
    drawPlayfield(18, 26, 132, 118, { radius: 22, alpha: .76 });
    if (heldPieceIndex === null) {
      ctx.fillStyle = palette.textSoft; ctx.font = "700 16px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText("暂存", 84, 52); ctx.font = "800 25px Inter, sans-serif"; ctx.fillText("—", 84, 103);
    } else drawMiniPiece(heldPieceIndex, 22, 37, "暂存", { width: 124, height: 96, cell: 18 });
    drawPlayfield(160, 26, 398, 118, { radius: 22, alpha: .76 });
    ctx.fillStyle = palette.textSoft; ctx.font = "750 15px Inter, sans-serif"; ctx.textAlign = "left";
    ctx.fillText((tetrisMode === "standard" ? "旅程" : tetrisMode === "timed" ? "限时" : "禅模式") + " · 接下来 5 枚", 178, 49);
    pieceQueue.slice(0, 5).forEach((shapeIndex, index) => drawMiniPiece(shapeIndex, 169 + index * 76, 57, "", { width: 72, height: 60, cell: 12 }));
    if (lastClearLabel) {
      ctx.fillStyle = palette.highlight; ctx.font = "800 13px Inter, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(lastClearLabel + "  +" + lastClearPoints, 359, 135, 365);
    }
    drawPlayfield(568, 26, 134, 118, { radius: 22, alpha: .76 });
    const timeText = tetrisMode === "timed" ? " · " + Math.max(0, Math.ceil(modeTimeLimit - (performance.now() - modeStartedAt) / 1000)) + "秒" : "";
    ctx.textAlign = "center"; ctx.fillStyle = palette.textSoft; ctx.font = "700 13px Inter, sans-serif"; ctx.fillText("得分", 635, 48);
    ctx.fillStyle = palette.text; ctx.font = "850 21px Inter, sans-serif"; ctx.fillText(String(score), 635, 72, 118);
    ctx.fillStyle = palette.textSoft; ctx.font = "700 13px Inter, sans-serif"; ctx.fillText(lines + "/" + lineTarget + " 行 · Lv." + currentCampaignLevel().tier, 635, 99);
    ctx.fillStyle = backToBack ? palette.highlight : palette.textSoft; ctx.font = "750 12px Inter, sans-serif";
    ctx.fillText((combo > 0 ? "连消 ×" + (combo + 1) : "连消待续") + timeText, 635, 125, 120);
  }
  ctx.save();
  ctx.globalAlpha = .96;
  ctx.fillStyle = "rgba(29,25,38,.96)";
  ctx.strokeStyle = "rgba(255,157,188,.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(originX - 14, originY - 14, columns * size + 28, rows * size + 28, 22);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,238,246,.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= columns; x += 1) {
    ctx.beginPath(); ctx.moveTo(originX + x * size, originY); ctx.lineTo(originX + x * size, originY + rows * size); ctx.stroke();
  }
  for (let y = 0; y <= rows; y += 1) {
    ctx.beginPath(); ctx.moveTo(originX, originY + y * size); ctx.lineTo(originX + columns * size, originY + y * size); ctx.stroke();
  }
  board.forEach((row, y) => row.forEach((value, x) => {
    if (value) drawBlock(x, y, value, size, originX, originY, boardEdges(x, y, value));
  }));
  const dangerRow = board.findIndex((row) => row.some(Boolean));
  if (dangerRow >= 0 && dangerRow <= 4) {
    ctx.save(); ctx.fillStyle = "rgba(238,77,55,.16)"; ctx.fillRect(originX, originY, columns * size, size * 5); ctx.restore();
  }
  if (piece) {
    const ghostY = landingY();
    if (ghostY !== piece.y) drawShape(piece.shape, piece.x, ghostY, piece.color, size, originX, originY, { ghost: true });
    drawShape(piece.shape, piece.x, piece.y, piece.color, size, originX, originY);
  }
  if (clearFlashUntil > performance.now()) {
    ctx.save(); ctx.globalAlpha = (clearFlashUntil - performance.now()) / 320; ctx.fillStyle = palette.highlight;
    clearedRows.forEach((row) => ctx.fillRect(originX, originY + row * size, columns * size, size));
    ctx.restore(); requestAnimationFrame(drawTetris);
  }
  finishCanvasStyle();
}

function startGame() {
  resetCampaignRandom();
  const baseTarget = config.difficulty === "relaxed" ? 4 : config.difficulty === "challenging" ? 8 : 6;
  const baseInterval = config.difficulty === "relaxed" ? 820 : config.difficulty === "challenging" ? 460 : 620;
  lineTarget = Math.max(3, Math.round(baseTarget * campaignScale("goalMultiplier")));
  fallInterval = Math.max(210, Math.round(baseInterval / campaignScale("speedMultiplier")));
  if (tetrisMode === "timed") {
    lineTarget = Math.max(3, lineTarget - 1);
    fallInterval = Math.max(190, Math.round(fallInterval * .86));
    modeTimeLimit = config.difficulty === "relaxed" ? 110 : config.difficulty === "challenging" ? 70 : 90;
  } else if (tetrisMode === "zen") {
    lineTarget += 2;
    fallInterval = Math.round(fallInterval * 1.12);
    modeTimeLimit = 0;
  } else modeTimeLimit = 0;
  modeStartedAt = performance.now();
  board.forEach((row) => row.fill(0));
  lines = 0;
  score = 0;
  hardDropScore = 0;
  softDropScore = 0;
  combo = -1;
  backToBack = false;
  lastClearLabel = "";
  lastClearPoints = 0;
  pieceQueue = [];
  heldPieceIndex = null;
  holdUsed = false;
  running = true;
  hideOverlay();
  setMetric("0 / " + lineTarget);
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + currentCampaignLevel().ruleModifier + "；完成 " + lineTarget + " 条消行。");
  spawnPiece();
  if (tickId) clearInterval(tickId);
  tickId = setInterval(stepDown, fallInterval);
  startAmbient();
  drawTetris();
}

function handleControl(value) {
  if (value === "left") movePiece(-1);
  if (value === "right") movePiece(1);
  if (value === "down") softDrop();
  if (value === "rotate") rotatePiece();
  if (value === "hold") holdPiece();
  if (value === "drop") hardDrop();
}

function handleKey(key) {
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down", ArrowUp: "rotate", " ": "drop", c: "hold", C: "hold" };
  if (map[key]) handleControl(map[key]);
}

let tetrisSwipeStart = null;
canvas.addEventListener("pointerdown", (event) => { tetrisSwipeStart = { x: event.clientX, y: event.clientY, at: performance.now() }; });
canvas.addEventListener("pointerup", (event) => {
  if (!tetrisSwipeStart || !running) return;
  const dx = event.clientX - tetrisSwipeStart.x;
  const dy = event.clientY - tetrisSwipeStart.y;
  const elapsed = performance.now() - tetrisSwipeStart.at;
  tetrisSwipeStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { rotatePiece(); return; }
  if (Math.abs(dx) > Math.abs(dy)) movePiece(dx > 0 ? 1 : -1);
  else if (dy > 0 && (Math.abs(dy) > 70 || elapsed < 220)) hardDrop();
  else if (dy > 0) softDrop();
});
function setTetrisMode(mode) {
  tetrisMode = ["standard", "timed", "zen"].includes(mode) ? mode : "standard";
  document.querySelectorAll("[data-tetris-mode]").forEach((candidate) => {
    const selected = candidate.dataset.tetrisMode === tetrisMode;
    candidate.classList.toggle("is-selected", selected);
    candidate.setAttribute("aria-pressed", String(selected));
  });
  if (running) startGame();
}
document.querySelectorAll("[data-tetris-mode]").forEach((button) => button.addEventListener("click", () => setTetrisMode(button.dataset.tetrisMode)));
runtimeDebugState = () => {
  const dangerRow = board.findIndex((row) => row.some(Boolean));
  return { level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, mode: tetrisMode, modes: ["standard", "timed", "zen"], modeTimeLimit, lineTarget, lines, fallInterval, score, hardDropScore, softDropScore, combo, backToBack, lastClearLabel, lastClearPoints, nextPieceIndex, nextQueue: pieceQueue.slice(0, 5), heldPieceIndex, holdUsed, currentPiece: piece ? { shapeIndex: piece.shapeIndex, rotation: piece.rotation, x: piece.x, y: piece.y } : null, dangerHeight: dangerRow >= 0 && dangerRow <= 4, clearFeedbackMs: Math.max(0, clearFlashUntil - performance.now()), gestureSupport: true, sevenBagRandomizer: true, rotationSystem: "SRS-clockwise", lockDelayMs, maxLockResets, cellGeometry: { ...tetrisCellGeometry } };
};
runtimeDebugActions = {
  legalAction: hardDrop,
  softDrop: softDrop,
  hold: holdPiece,
  prepareWallKick() {
    board.forEach((row) => row.fill(0));
    clearLockTimer();
    piece = { shapeIndex: 0, rotation: 1, shape: rotationStates[0][1].map((row) => [...row]), x: -2, y: 4, color: 1, serial: ++pieceSerial };
    rotatePiece();
  },
  setStandardMode() { setTetrisMode("standard"); },
  setTimedMode() { setTetrisMode("timed"); },
  setZenMode() { setTetrisMode("zen"); },
  clearLinePreview() { clearedRows = [17, 18, 19]; clearFlashUntil = performance.now() + 320; drawTetris(); },
};
drawTetris();


redrawGameArt = () => { drawTetris(); };
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
  const runtimePauseKey = ["snake", "maze", "puzzle"].includes(config.template) && gameSessionState === "paused" && (event.key.toLowerCase() === "p" || event.key === " ");
  if (gameSessionState !== "playing" && !runtimePauseKey) return;
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

;(() => {
  if (!/^\/(play|version)\//.test(location.pathname)) return;
  const identity = {"projectId":"0bd4ea6a-2125-40e0-bee1-d5baa268ef1e","versionId":"01de8ef0-db83-4a4d-a905-769b3657c095"};
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
})();