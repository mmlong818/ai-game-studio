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
const config = {"title":"青玉长游","template":"snake","difficulty":"standard","visualStyle":"cute","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"board","inputModes":["swipe","keyboard","touch-buttons"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":["./assets/stage-c/snake-head-v2.png","./assets/stage-c/snake-body-straight-v2.png","./assets/stage-c/snake-body-corner-v2.png","./assets/stage-c/snake-tail-v2.png","./assets/stage-c/snake-food-v2.png","./assets/stage-c/snake-obstacle-v2.png","./assets/stage-c/snake-eat-v2.png","./assets/stage-c/snake-danger-v2.png","./assets/stage-c/snake-complete-v2.png"],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"snake-01","label":"01 · 认识规则 · 初游晴庭","tier":1,"tierLabel":"认识规则","variant":0,"seed":834837482,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"初游晴庭","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":2,"id":"snake-02","label":"02 · 认识规则 · 双石引路","tier":1,"tierLabel":"认识规则","variant":1,"seed":2476413241,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"双石引路","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":3,"id":"snake-03","label":"03 · 认识规则 · 四隅回身","tier":1,"tierLabel":"认识规则","variant":2,"seed":1968410440,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"四隅回身","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":4,"id":"snake-04","label":"04 · 认识规则 · 月门初转","tier":1,"tierLabel":"认识规则","variant":3,"seed":3609724063,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"月门初转","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"解锁稳定节奏"},{"number":5,"id":"snake-05","label":"05 · 稳定节奏 · 竹影双廊","tier":2,"tierLabel":"稳定节奏","variant":4,"seed":3101721134,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"竹影双廊","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":6,"id":"snake-06","label":"06 · 稳定节奏 · 曲桥借位","tier":2,"tierLabel":"稳定节奏","variant":5,"seed":448346237,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"曲桥借位","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":7,"id":"snake-07","label":"07 · 稳定节奏 · 回纹花径","tier":2,"tierLabel":"稳定节奏","variant":6,"seed":4235309452,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"回纹花径","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":8,"id":"snake-08","label":"08 · 稳定节奏 · 方池绕行","tier":2,"tierLabel":"稳定节奏","variant":7,"seed":1582182355,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"方池绕行","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"解锁加入变化"},{"number":9,"id":"snake-09","label":"09 · 加入变化 · 折廊追果","tier":3,"tierLabel":"加入变化","variant":8,"seed":537306466,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"折廊追果","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":10,"id":"snake-10","label":"10 · 加入变化 · 双门换向","tier":3,"tierLabel":"加入变化","variant":9,"seed":2178884273,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"双门换向","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":11,"id":"snake-11","label":"11 · 加入变化 · 星石列阵","tier":3,"tierLabel":"加入变化","variant":10,"seed":1670895808,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"星石列阵","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":12,"id":"snake-12","label":"12 · 加入变化 · 半月回环","tier":3,"tierLabel":"加入变化","variant":11,"seed":3312211479,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"半月回环","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"解锁组合压力"},{"number":13,"id":"snake-13","label":"13 · 组合压力 · 连廊三折","tier":4,"tierLabel":"组合压力","variant":12,"seed":2804207526,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"连廊三折","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":14,"id":"snake-14","label":"14 · 组合压力 · 漏窗穿行","tier":4,"tierLabel":"组合压力","variant":13,"seed":150816245,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"漏窗穿行","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":15,"id":"snake-15","label":"15 · 组合压力 · 镜池窄岸","tier":4,"tierLabel":"组合压力","variant":14,"seed":3937780484,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"镜池窄岸","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"关卡星章"},{"number":16,"id":"snake-16","label":"16 · 组合压力 · 叠石回廊","tier":4,"tierLabel":"组合压力","variant":15,"seed":1283619147,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"叠石回廊","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"解锁最终掌握"},{"number":17,"id":"snake-17","label":"17 · 最终掌握 · 九曲藏果","tier":5,"tierLabel":"最终掌握","variant":16,"seed":777713306,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"九曲藏果","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"大师徽记"},{"number":18,"id":"snake-18","label":"18 · 最终掌握 · 双环合流","tier":5,"tierLabel":"最终掌握","variant":17,"seed":2954062889,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"双环合流","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"大师徽记"},{"number":19,"id":"snake-19","label":"19 · 最终掌握 · 庭心风阵","tier":5,"tierLabel":"最终掌握","variant":18,"seed":300673656,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"庭心风阵","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"大师徽记"},{"number":20,"id":"snake-20","label":"20 · 最终掌握 · 青玉长游","tier":5,"tierLabel":"最终掌握","variant":19,"seed":4087374735,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"青玉长游","mission":"在身体持续增长时规划安全回路，完成本关收集目标。","masteryRules":[{"id":"efficiency","label":"收集数量达到目标","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1},{"id":"control","label":"完成时身体长度达到目标 + 3","metric":"length","comparison":"gte","target":8}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:8647116c-5775-4e2b-becc-9f743c99924b:01128351-4717-456d-a06f-41e434d2f0d0","masteryStorageKey":"forge-mastery:8647116c-5775-4e2b-becc-9f743c99924b:01128351-4717-456d-a06f-41e434d2f0d0"};
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


const difficultyProfiles = {
  relaxed: { label: "轻松", columns: 14, portraitRows: 24, landscapeRows: 14, foodTarget: 8, speed: 190, wrapWalls: true, selfCollision: false, obstacleScale: .58, description: "慢速巡游 · 基础目标 8 分 · 越界会从另一侧回来" },
  standard: { label: "标准", columns: 14, portraitRows: 24, landscapeRows: 14, foodTarget: 12, speed: 135, wrapWalls: false, selfCollision: true, obstacleScale: 1, description: "适中速度 · 基础目标 12 分 · 边界、身体与庭石都会中断巡游" },
  challenging: { label: "挑战", columns: 16, portraitRows: 28, landscapeRows: 16, foodTarget: 18, speed: 104, wrapWalls: false, selfCollision: true, obstacleScale: 1.25, description: "高速开局 · 基础目标 18 分 · 场型更密并随收集继续加速" },
};

const snakeLevelBlueprints = [
  ["初游晴庭", "开放转向", "open-pair", 0, 1, 0], ["双石引路", "开放转向", "guide-posts", 0, .99, 0],
  ["四隅回身", "开放转向", "four-corners", 1, .98, 0], ["月门初转", "开放转向", "moon-gate", 1, .97, 0],
  ["竹影双廊", "门廊判断", "bamboo-lanes", 1, .96, 4], ["曲桥借位", "门廊判断", "bent-bridge", 1, .95, 4],
  ["回纹花径", "门廊判断", "meander", 2, .94, 4], ["方池绕行", "门廊判断", "square-pond", 2, .93, 4],
  ["折廊追果", "回环规划", "zigzag", 2, .92, 4], ["双门换向", "回环规划", "double-gate", 2, .91, 4],
  ["星石列阵", "回环规划", "star-stones", 3, .9, 3], ["半月回环", "回环规划", "half-moon", 3, .89, 3],
  ["连廊三折", "窄路压力", "triple-turn", 3, .88, 3], ["漏窗穿行", "窄路压力", "window-slits", 3, .87, 3],
  ["镜池窄岸", "窄路压力", "mirror-banks", 4, .86, 3], ["叠石回廊", "窄路压力", "nested-court", 4, .85, 3],
  ["九曲藏果", "综合长游", "nine-bends", 4, .84, 3], ["双环合流", "综合长游", "twin-rings", 4, .83, 3],
  ["庭心风阵", "综合长游", "pinwheel", 5, .82, 3], ["青玉长游", "综合长游", "grand-circuit", 6, .8, 3],
].map((value, index) => ({ number: index + 1, name: value[0], chapter: value[1], pattern: value[2], targetBonus: value[3], speedScale: value[4], goldEvery: value[5] }));

let activeDifficulty = difficultyProfiles[config.difficulty] ? config.difficulty : "standard";
let difficultyProfile = difficultyProfiles[activeDifficulty];
let gridColumns = difficultyProfile.columns;
let gridRows = config.aspectRatio === "9:16" ? difficultyProfile.portraitRows : difficultyProfile.landscapeRows;
let foodTarget = difficultyProfile.foodTarget;
let snake = [];
let direction = { x: 1, y: 0 };
let snakeDirectionQueue = [];
let food = { x: 10, y: 8, kind: "normal", value: 1, expiresAt: 0 };
let score = 0;
let snakeObstacles = [];
let snakeLayoutSignature = "";
let snakeControlMode = "swipe";
let snakePaused = false;
let snakeReadyUntil = 0;
let snakeSwipe = null;
let snakeFoodProbe = null;
let snakeStats = { turns: 0, nearMisses: 0, distance: 0, bonusCount: 0, startedAt: 0, collisionReason: "" };
let snakeWasInDanger = false;
let snakeStepAccumulator = 0;
let snakeLastFrameAt = 0;
let snakeFrameInterval = 16.7;
let snakeRenderedFrames = 0;
let snakeRenderFrom = [];
let snakeRenderStartedAt = 0;
let snakeRenderDuration = 0;
let snakeEffect = null;
let collisionMarker = null;
let snakeCompletionUntil = 0;
let growthPulseUntil = 0;
let turnPulseUntil = 0;
let snakeCompletionToken = 0;
let pendingDifficulty = null;
let pendingDifficultyUntil = 0;
const snakeStaticLayer = document.createElement("canvas");
snakeStaticLayer.width = canvas.width;
snakeStaticLayer.height = canvas.height;
const snakeStaticContext = snakeStaticLayer.getContext("2d");
let snakeStaticDirty = true;
let snakeStaticAssetSignature = "";
let snakeStaticRebuilds = 0;
const snakeSpriteCache = new Map();
const difficultyButtons = [...document.querySelectorAll("[data-snake-difficulty]")];
const difficultyLabels = [...document.querySelectorAll("[data-snake-difficulty-label]")];
const difficultyNotes = [...document.querySelectorAll("[data-snake-difficulty-note]")];
const controlModeButtons = [...document.querySelectorAll("[data-snake-control-mode]")];

function currentSnakeBlueprint() { return snakeLevelBlueprints[Math.max(0, Math.min(19, currentCampaignLevel().number - 1))]; }
function snakeCellKey(x, y) { return x + ":" + y; }

function applySnakeCampaignTuning() {
  const growth = Math.floor((currentCampaignLevel().tier - 1) / 2) * 2;
  gridColumns = difficultyProfile.columns + growth;
  gridRows = (config.aspectRatio === "9:16" ? difficultyProfile.portraitRows : difficultyProfile.landscapeRows) + growth * (config.aspectRatio === "9:16" ? 2 : 1);
  foodTarget = Math.max(5, Math.round(difficultyProfile.foodTarget * currentCampaignLevel().goalMultiplier) + currentSnakeBlueprint().targetBonus);
  snakeStaticDirty = true;
}

function snakeLayout() {
  const boardWidth = config.aspectRatio === "9:16" ? 636 : 620;
  const cell = boardWidth / gridColumns;
  const boardHeight = cell * gridRows;
  return { boardWidth, boardHeight, cell, originX: (720 - boardWidth) / 2, originY: (gameSceneHeight() - boardHeight) / 2 };
}

function syncDifficultyUi() {
  difficultyButtons.forEach((button) => {
    const selected = button.dataset.snakeDifficulty === activeDifficulty;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-selected", selected);
  });
  difficultyLabels.forEach((label) => { label.textContent = difficultyProfile.label; });
  difficultyNotes.forEach((note) => { note.textContent = difficultyProfile.description; });
}

function syncSnakeControlMode() {
  document.body.dataset.snakeControlMode = snakeControlMode;
  controlModeButtons.forEach((button) => {
    const selected = button.dataset.snakeControlMode === snakeControlMode;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-selected", selected);
  });
  try { safeStorage.setItem("snake-control-mode-v1", snakeControlMode); } catch {}
}

function loadSnakeControlMode() {
  try {
    const stored = safeStorage.getItem("snake-control-mode-v1");
    if (stored === "buttons" || stored === "swipe") snakeControlMode = stored;
  } catch {}
  syncSnakeControlMode();
}

function previewSnake() {
  const y = Math.floor(gridRows / 2);
  const x = Math.floor(gridColumns * .46);
  snake = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }, { x: x - 3, y }];
  direction = { x: 1, y: 0 };
  snakeDirectionQueue = [];
  snakeRenderFrom = snake.map((part) => ({ ...part }));
  snakeRenderStartedAt = performance.now();
  snakeRenderDuration = 0;
}

function addSnakeObstacle(target, x, y) {
  const cell = { x: Math.round(x), y: Math.round(y) };
  const start = snake[0];
  const opening = start && Math.abs(cell.y - start.y) <= 1 && cell.x >= start.x - 4 && cell.x <= start.x + 3;
  if (cell.x < 1 || cell.x >= gridColumns - 1 || cell.y < 2 || cell.y >= gridRows - 2 || opening) return;
  if (!target.some((value) => value.x === cell.x && value.y === cell.y)) target.push(cell);
}

function buildSnakeFormation() {
  const level = currentSnakeBlueprint().number;
  const chapter = Math.floor((level - 1) / 4);
  const variant = (level - 1) % 4;
  const cells = [];
  const left = 2 + variant % 2;
  const right = gridColumns - 3 - (variant > 1 ? 1 : 0);
  const top = 4 + variant;
  const bottom = gridRows - 5 - variant;
  if (chapter === 0) {
    addSnakeObstacle(cells, left, top); addSnakeObstacle(cells, right, bottom);
    if (variant > 0) { addSnakeObstacle(cells, right, top); addSnakeObstacle(cells, left, bottom); }
    if (variant > 1) { addSnakeObstacle(cells, Math.floor(gridColumns / 2), top + 2); addSnakeObstacle(cells, Math.floor(gridColumns / 2) - 2, bottom - 2); }
  } else if (chapter === 1) {
    for (let y = 3; y < gridRows - 3; y += 1) {
      if (y % (5 + variant) !== 2) addSnakeObstacle(cells, left, y);
      if (y % (6 - Math.min(variant, 2)) !== 3) addSnakeObstacle(cells, right, y);
    }
    for (let x = left; x <= right; x += 1) if (x !== Math.floor(gridColumns / 2) + variant - 1) addSnakeObstacle(cells, x, top + 3);
  } else if (chapter === 2) {
    for (let x = left; x <= right; x += 1) {
      if (x !== left + 1 + variant) addSnakeObstacle(cells, x, top);
      if (x !== right - 1 - variant) addSnakeObstacle(cells, x, bottom);
    }
    for (let y = top; y <= bottom; y += 1) {
      if (y !== top + 2 + variant) addSnakeObstacle(cells, left, y);
      if (y !== bottom - 2 - variant) addSnakeObstacle(cells, right, y);
    }
  } else if (chapter === 3) {
    const rows = [4 + variant, Math.floor(gridRows / 2) - 4 + variant, Math.floor(gridRows / 2) + 5, gridRows - 5 - variant];
    rows.forEach((y, rowIndex) => {
      const gap = 2 + (rowIndex * 3 + variant) % Math.max(3, gridColumns - 5);
      for (let x = 1; x < gridColumns - 1; x += 1) if (Math.abs(x - gap) > 1) addSnakeObstacle(cells, x, y);
    });
  } else {
    const cx = Math.floor(gridColumns / 2);
    const cy = Math.floor(gridRows / 2);
    const arm = 3 + variant;
    for (let d = 2; d <= arm; d += 1) {
      addSnakeObstacle(cells, cx + d, cy - 2); addSnakeObstacle(cells, cx + 2, cy + d);
      addSnakeObstacle(cells, cx - d, cy + 2); addSnakeObstacle(cells, cx - 2, cy - d);
    }
    for (let x = left; x <= right; x += 2) { addSnakeObstacle(cells, x, top); addSnakeObstacle(cells, right - x + left, bottom); }
  }
  return cells;
}

function createSnakeObstacles() {
  const requested = buildSnakeFormation();
  const count = Math.max(0, Math.ceil(requested.length * difficultyProfile.obstacleScale));
  snakeObstacles = activeDifficulty === "relaxed" ? requested.filter((_, index) => index % 2 === 0).slice(0, count) : requested.slice(0, count);
  if (activeDifficulty === "challenging") {
    const desired = Math.max(requested.length + 1, count);
    for (let index = 0; snakeObstacles.length < desired && index < requested.length * 4; index += 1) {
      const source = requested[index % requested.length];
      const rowShift = Math.floor(index / Math.max(1, requested.length)) + 1;
      addSnakeObstacle(snakeObstacles, gridColumns - 1 - source.x, source.y + (index % 2 ? rowShift : -rowShift));
    }
  }
  snakeLayoutSignature = currentSnakeBlueprint().pattern + ":" + snakeObstacles.map((cell) => snakeCellKey(cell.x, cell.y)).sort().join("|");
  snakeStaticDirty = true;
}

function reachableSnakeCells() {
  const head = snake[0];
  if (!head) return new Map();
  const blocked = new Set([...snakeObstacles.map((cell) => snakeCellKey(cell.x, cell.y)), ...snake.slice(1).map((cell) => snakeCellKey(cell.x, cell.y))]);
  const distances = new Map([[snakeCellKey(head.x, head.y), 0]]);
  const queue = [{ ...head }];
  while (queue.length) {
    const current = queue.shift();
    const distance = distances.get(snakeCellKey(current.x, current.y));
    [[0,-1],[1,0],[0,1],[-1,0]].forEach((offset) => {
      let x = current.x + offset[0]; let y = current.y + offset[1];
      if (difficultyProfile.wrapWalls) { x = (x + gridColumns) % gridColumns; y = (y + gridRows) % gridRows; }
      const key = snakeCellKey(x, y);
      if (x < 0 || y < 0 || x >= gridColumns || y >= gridRows || blocked.has(key) || distances.has(key)) return;
      distances.set(key, distance + 1); queue.push({ x, y });
    });
  }
  return distances;
}

function nextSnakeFoodKind() {
  const every = currentSnakeBlueprint().goldEvery;
  return every && score >= 2 && score % every === every - 1 ? "golden" : "normal";
}

function placeFood(requestedKind = nextSnakeFoodKind()) {
  const distances = reachableSnakeCells();
  const occupied = new Set(snake.map((cell) => snakeCellKey(cell.x, cell.y)));
  const minimumDistance = Math.max(4, Math.floor(gridRows * .15));
  let candidates = [...distances.entries()].filter(([key, distance]) => distance >= minimumDistance && !occupied.has(key));
  if (!candidates.length) candidates = [...distances.entries()].filter(([key, distance]) => distance >= 2 && !occupied.has(key));
  const selected = candidates[Math.floor(campaignRandom() * candidates.length)];
  if (!selected) return false;
  const [x, y] = selected[0].split(":").map(Number);
  const kind = requestedKind === "golden" ? "golden" : "normal";
  food = { x, y, kind, value: kind === "golden" ? 2 : 1, expiresAt: kind === "golden" ? performance.now() + Math.max(3200, 6400 - currentCampaignLevel().tier * 420) : 0 };
  snakeStaticDirty = true;
  return true;
}

function applyDifficulty(value, restartIfRunning = false) {
  if (!difficultyProfiles[value]) return;
  const wasPlaying = gameSessionState === "playing" || gameSessionState === "paused";
  activeDifficulty = value; difficultyProfile = difficultyProfiles[value]; applySnakeCampaignTuning(); syncDifficultyUi();
  if (wasPlaying && restartIfRunning) { startGame(); return; }
  previewSnake(); createSnakeObstacles(); placeFood("normal"); drawSnake(); setMetric("—");
  setStatus("已选择" + difficultyProfile.label + "难度。" + difficultyProfile.description + "。");
  overlayTitle.textContent = difficultyProfile.label + "难度已就绪";
  overlayDetail.textContent = currentSnakeBlueprint().name + " · " + currentSnakeBlueprint().chapter + "。改变方向收集朱果。";
  startButton.textContent = "开始" + difficultyProfile.label + "巡游";
}

function snakeBodySprite(index) {
  const part = snake[index];
  if (index === 0) return { spriteIndex: 0, rotation: Math.atan2(direction.y, direction.x), scale: 1.12 };
  const previous = snake[index - 1];
  if (index === snake.length - 1) return { spriteIndex: 3, rotation: Math.atan2(previous.y - part.y, previous.x - part.x), scale: 1.02 };
  const next = snake[index + 1];
  const directions = [{ x: previous.x - part.x, y: previous.y - part.y }, { x: next.x - part.x, y: next.y - part.y }];
  const has = (x, y) => directions.some((value) => value.x === x && value.y === y);
  const corner = directions[0].x !== directions[1].x && directions[0].y !== directions[1].y;
  if (!corner) return { spriteIndex: 1, rotation: directions[0].x === 0 ? Math.PI / 2 : 0, scale: .98 };
  const rotation = has(0,-1) && has(1,0) ? 0 : has(1,0) && has(0,1) ? Math.PI/2 : has(0,1) && has(-1,0) ? Math.PI : -Math.PI/2;
  return { spriteIndex: 2, rotation, scale: 1.06 };
}

function nextSnakeCell() { const next = snakeDirectionQueue[0] || direction; return { x: snake[0].x + next.x, y: snake[0].y + next.y }; }
function snakeDangerNearHead() {
  if (!snake[0]) return false;
  const next = nextSnakeCell();
  return (!difficultyProfile.wrapWalls && (next.x < 0 || next.y < 0 || next.x >= gridColumns || next.y >= gridRows))
    || snakeObstacles.some((cell) => cell.x === next.x && cell.y === next.y)
    || (difficultyProfile.selfCollision && snake.slice(1, -1).some((cell) => cell.x === next.x && cell.y === next.y));
}

function drawGardenBoard(layout) {
  const { originX, originY, boardWidth, boardHeight, cell } = layout;
  drawPlayfield(originX - 12, originY - 12, boardWidth + 24, boardHeight + 24, { radius: 32, alpha: .99, fill: "rgba(237,248,240,.99)", stroke: "rgba(27,91,70,.9)", lineWidth: 6 });
  ctx.save(); ctx.beginPath(); ctx.roundRect(originX, originY, boardWidth, boardHeight, 24); ctx.clip();
  for (let row = 0; row < gridRows; row += 1) for (let column = 0; column < gridColumns; column += 1) {
    if ((row + column) % 2 === 0) { ctx.fillStyle = "rgba(74,132,104,.055)"; ctx.fillRect(originX + column * cell, originY + row * cell, cell, cell); }
  }
  ctx.strokeStyle = "rgba(45,104,82,.2)"; ctx.lineWidth = 1.35;
  for (let index = 0; index <= gridColumns; index += 1) { ctx.beginPath(); ctx.moveTo(originX + index * cell, originY); ctx.lineTo(originX + index * cell, originY + boardHeight); ctx.stroke(); }
  for (let index = 0; index <= gridRows; index += 1) { ctx.beginPath(); ctx.moveTo(originX, originY + index * cell); ctx.lineTo(originX + boardWidth, originY + index * cell); ctx.stroke(); }
  ctx.restore();
}

function renderedSnakeParts(timestamp) {
  if (!snakeRenderDuration) return snake;
  const progress = Math.max(0, Math.min(1, (timestamp - snakeRenderStartedAt) / snakeRenderDuration));
  const eased = 1 - Math.pow(1 - progress, 3);
  return snake.map((part, index) => {
    const from = snakeRenderFrom[index] || part;
    if (Math.abs(part.x - from.x) > 1 || Math.abs(part.y - from.y) > 1) return part;
    return { x: from.x + (part.x - from.x) * eased, y: from.y + (part.y - from.y) * eased };
  });
}

function cachedSnakeSprite(index) {
  const image = stageCImages[index];
  if (!image?.complete || !image.naturalWidth) return null;
  const cached = snakeSpriteCache.get(index);
  if (cached?.width === image.naturalWidth && cached?.height === image.naturalHeight) return cached.canvas;
  if (!bitmapSourceRects.has(image)) cacheBitmapSourceRect(image);
  const source = bitmapSourceRects.get(image) || { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  const scale = Math.min(1, 192 / Math.max(source.width, source.height));
  const sprite = document.createElement("canvas"); sprite.width = Math.max(1, Math.round(source.width * scale)); sprite.height = Math.max(1, Math.round(source.height * scale));
  sprite.getContext("2d").drawImage(image, source.x, source.y, source.width, source.height, 0, 0, sprite.width, sprite.height);
  snakeSpriteCache.set(index, { canvas: sprite, width: image.naturalWidth, height: image.naturalHeight }); return sprite;
}

function drawCachedSnakeSprite(index, x, y, width, height, options = {}) {
  const sprite = cachedSnakeSprite(index);
  if (!sprite) { ctx.fillStyle = options.fallback || palette.primary; ctx.fillRect(x, y, width, height); return; }
  const padding = Math.max(0, Number(options.padding) || 0); const fit = Math.min((width - padding * 2) / sprite.width, (height - padding * 2) / sprite.height);
  ctx.save(); ctx.translate(x + width / 2, y + height / 2); if (options.rotation) ctx.rotate(options.rotation); ctx.drawImage(sprite, -sprite.width * fit / 2, -sprite.height * fit / 2, sprite.width * fit, sprite.height * fit); ctx.restore();
}

function rebuildSnakeStaticLayer() {
  clearCanvas(); ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = snakeLayout(); const { originX, originY, cell } = layout; drawGardenBoard(layout);
  snakeObstacles.forEach((obstacle) => { const size = cell * 1.46; drawBitmapImage(stageCImages[5], originX + (obstacle.x + .5) * cell - size / 2, originY + (obstacle.y + .5) * cell - size / 2, size, size, { fallback: palette.accent, alpha: 1 }); });
  const x = originX + (food.x + .5) * cell; const y = originY + (food.y + .5) * cell; const golden = food.kind === "golden";
  const glow = ctx.createRadialGradient(x, y, cell * .15, x, y, cell * (golden ? 1.15 : .78)); glow.addColorStop(0, golden ? "rgba(255,235,121,.78)" : "rgba(255,103,78,.32)"); glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, cell * (golden ? 1.15 : .78), 0, Math.PI * 2); ctx.fill();
  const size = cell * (golden ? 2.16 : 1.94); drawBitmapImage(stageCImages[4], x - size / 2, y - size / 2, size, size, { fallback: palette.primary, padding: 2 });
  if (golden) { ctx.strokeStyle = "rgba(212,157,35,.9)"; ctx.lineWidth = Math.max(3, cell * .11); ctx.beginPath(); ctx.arc(x, y, cell * .82, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore(); finishCanvasStyle(); snakeStaticContext.clearRect(0, 0, snakeStaticLayer.width, snakeStaticLayer.height); snakeStaticContext.drawImage(canvas, 0, 0); snakeStaticDirty = false; snakeStaticRebuilds += 1;
}

function drawSnake(timestamp = performance.now()) {
  const signature = [backgroundArtReady, backgroundArt.naturalWidth, stageCImages[4]?.naturalWidth || 0, stageCImages[5]?.naturalWidth || 0].join(":");
  if (signature !== snakeStaticAssetSignature) { snakeStaticAssetSignature = signature; snakeStaticDirty = true; }
  if (snakeStaticDirty) rebuildSnakeStaticLayer();
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(snakeStaticLayer, 0, 0); ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = snakeLayout(); const { originX, originY, boardHeight, cell } = layout; const parts = renderedSnakeParts(timestamp);
  ctx.strokeStyle = "rgba(20,72,54,.42)"; ctx.lineWidth = cell * .78; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
  parts.forEach((part, index) => { const x = originX + (part.x + .5) * cell; const y = originY + (part.y + .5) * cell; if (!index) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  ctx.strokeStyle = "rgba(38,154,108,.98)"; ctx.lineWidth = cell * .56; ctx.beginPath();
  parts.forEach((part, index) => { const x = originX + (part.x + .5) * cell; const y = originY + (part.y + .5) * cell; if (!index) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  parts.slice().reverse().forEach((part, reverseIndex) => {
    const index = parts.length - 1 - reverseIndex; const look = snakeBodySprite(index); const head = index === 0; const tail = index === snake.length - 1;
    const scale = (head ? 2.18 : tail ? 1.72 : 1.66) * look.scale * (timestamp < turnPulseUntil && head ? 1.09 : 1) * (timestamp < growthPulseUntil && index < 2 ? 1.08 : 1); const size = cell * scale;
    drawCachedSnakeSprite(look.spriteIndex, originX + (part.x + .5) * cell - size / 2, originY + (part.y + .5) * cell - size / 2, size, size, { fallback: head ? palette.highlight : palette.primary, rotation: look.rotation, padding: head ? 3 : 2 });
  });
  if (snakeDangerNearHead() || collisionMarker) { const marker = collisionMarker || snake[0]; const size = cell * 2.35; drawBitmapImage(stageCImages[7], originX + (marker.x + .5) * cell - size / 2, originY + (marker.y + .5) * cell - size / 2, size, size, { fallback: palette.primary, alpha: collisionMarker ? .94 : .48 }); }
  if (snakeEffect && timestamp < snakeEffect.until) { const size = cell * 2.8; drawBitmapImage(stageCImages[6], originX + (snakeEffect.x + .5) * cell - size / 2, originY + (snakeEffect.y + .5) * cell - size / 2, size, size, { fallback: palette.highlight, alpha: Math.max(0, (snakeEffect.until - timestamp) / 420) }); }
  if (snakePaused) { ctx.fillStyle = "rgba(246,252,247,.8)"; ctx.fillRect(originX, originY, layout.boardWidth, boardHeight); ctx.fillStyle = "#214b3d"; ctx.textAlign = "center"; ctx.font = "700 38px Inter, Microsoft YaHei, sans-serif"; ctx.fillText("巡游暂停", 360, originY + boardHeight * .48); ctx.font = "500 19px Inter, Microsoft YaHei, sans-serif"; ctx.fillText("按 P、空格或继续返回庭园", 360, originY + boardHeight * .53); }
  if (timestamp < snakeCompletionUntil) drawBitmapImage(stageCImages[8], 170, originY + boardHeight * .32, 380, 380, { fallback: palette.highlight, alpha: .96 });
  ctx.restore();
}

function currentStepDelay() { const baseDelay = difficultyProfile.speed / campaignScale("speedMultiplier"); const tuned = baseDelay * currentSnakeBlueprint().speedScale; return activeDifficulty === "challenging" ? Math.max(55, tuned - score * 2.5) : Math.max(72, tuned); }
function restartSnakeClock(timestamp = performance.now()) { snakeStepAccumulator = 0; snakeLastFrameAt = timestamp; }

function snakeStep(timestamp = performance.now()) {
  if (!running || snakePaused || timestamp < snakeReadyUntil) return;
  const previous = snake.map((part) => ({ ...part })); const queued = snakeDirectionQueue.shift(); if (queued) { direction = queued; snakeStats.turns += 1; }
  let head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y }; const crossed = head.x < 0 || head.y < 0 || head.x >= gridColumns || head.y >= gridRows;
  if (crossed && difficultyProfile.wrapWalls) head = { x: (head.x + gridColumns) % gridColumns, y: (head.y + gridRows) % gridRows };
  const eats = head.x === food.x && head.y === food.y;
  const reason = crossed && !difficultyProfile.wrapWalls ? "撞到边界" : snakeObstacles.some((part) => part.x === head.x && part.y === head.y) ? "撞到庭院障碍" : difficultyProfile.selfCollision && (eats ? snake : snake.slice(0,-1)).some((part) => part.x === head.x && part.y === head.y) ? "撞到自己的身体" : "";
  if (reason) { snakeStats.collisionReason = reason; collisionMarker = head; drawSnake(); const seconds = Math.max(1, Math.round((performance.now() - snakeStats.startedAt) / 1000)); showResult(false, "巡游中断", reason + "。本局 " + score + " 分，最长 " + snake.length + " 节，转向 " + snakeStats.turns + " 次，用时 " + seconds + " 秒。"); return; }
  snake.unshift(head); snakeStats.distance += 1; snakeRenderFrom = previous; snakeRenderStartedAt = timestamp; snakeRenderDuration = Math.min(180, Math.max(72, currentStepDelay() * .94));
  if (eats) {
    score += food.value; if (food.kind === "golden") snakeStats.bonusCount += 1; snakeEffect = { x: head.x, y: head.y, until: performance.now() + 420 }; growthPulseUntil = performance.now() + 240; setMetric(score + " / " + foodTarget); playSound("success");
    if (score >= foodTarget) { snakeCompletionUntil = performance.now() + 1600; const token = ++snakeCompletionToken; running = false; setGameSessionState("stage-complete"); drawSnake(timestamp); window.setTimeout(() => { if (token !== snakeCompletionToken) return; const seconds = Math.max(1, Math.round((performance.now() - snakeStats.startedAt) / 1000)); showResult(true, "青玉巡游完成", currentSnakeBlueprint().name + "完成：" + score + " 分，长度 " + snake.length + "，金果 " + snakeStats.bonusCount + "，转向 " + snakeStats.turns + "，险情 " + snakeStats.nearMisses + "，用时 " + seconds + " 秒。"); }, 760); return; }
    placeFood();
  } else snake.pop();
  const danger = snakeDangerNearHead(); if (danger && !snakeWasInDanger) snakeStats.nearMisses += 1; snakeWasInDanger = danger;
}

function snakeAnimationLoop(timestamp) {
  const rawDelta = snakeLastFrameAt ? timestamp - snakeLastFrameAt : 16.7; const delta = Math.max(0, Math.min(80, rawDelta)); snakeLastFrameAt = timestamp; snakeFrameInterval = snakeFrameInterval * .9 + Math.min(50, Math.max(4, rawDelta)) * .1;
  if (running && !snakePaused) {
    if (food.kind === "golden" && timestamp >= food.expiresAt) { placeFood("normal"); setStatus("金果光芒消散，新的朱果已在可达庭径出现。"); }
    if (timestamp >= snakeReadyUntil) { snakeStepAccumulator += delta; const delay = currentStepDelay(); if (snakeStepAccumulator >= delay) { snakeStepAccumulator = Math.min(snakeStepAccumulator - delay, delay); snakeStep(timestamp); } }
  }
  const active = running || snakePaused || timestamp < snakeRenderStartedAt + snakeRenderDuration || timestamp < growthPulseUntil || timestamp < turnPulseUntil || timestamp < snakeCompletionUntil || Boolean(snakeEffect && timestamp < snakeEffect.until) || collisionMarker;
  if (active) { drawSnake(timestamp); snakeRenderedFrames += 1; }
  requestAnimationFrame(snakeAnimationLoop);
}

function queueSnakeTurn(dx, dy) {
  if (!running || snakePaused || snakeDirectionQueue.length >= 2) return false;
  const previous = snakeDirectionQueue[snakeDirectionQueue.length - 1] || direction;
  if ((dx === previous.x && dy === previous.y) || (dx === -previous.x && dy === -previous.y)) return false;
  snakeDirectionQueue.push({ x: dx, y: dy }); turnPulseUntil = performance.now() + 120; playSound("ui"); return true;
}

function syncPauseControl() {
  document.querySelectorAll("[data-control=pause]").forEach((button) => { button.textContent = snakePaused ? "继续" : "暂停"; button.setAttribute("aria-label", snakePaused ? "继续游戏" : "暂停游戏"); button.disabled = !(gameSessionState === "playing" || gameSessionState === "paused"); });
}

function toggleSnakePause() {
  if (gameSessionState === "playing") { snakePaused = true; setGameSessionState("paused"); stopEnvironmentAudio(); setStatus("巡游已暂停；返回页面后由你主动继续。"); }
  else if (gameSessionState === "paused") { snakePaused = false; setGameSessionState("playing"); restartSnakeClock(); startAmbient(); setStatus(currentSnakeBlueprint().name + "继续 · " + (snakeControlMode === "swipe" ? "在庭园上滑动转向" : "使用四键转向") + "。"); }
  syncPauseControl(); drawSnake();
}

function startGame() {
  snakeCompletionToken += 1; resetCampaignRandom(); applySnakeCampaignTuning(); previewSnake(); score = 0; snakeEffect = null; collisionMarker = null; snakeCompletionUntil = 0; growthPulseUntil = 0; turnPulseUntil = 0; snakePaused = false;
  snakeStats = { turns: 0, nearMisses: 0, distance: 0, bonusCount: 0, startedAt: performance.now(), collisionReason: "" }; snakeWasInDanger = false; createSnakeObstacles(); placeFood("normal"); running = true; hideOverlay(); snakeReadyUntil = performance.now() + 900;
  setMetric("0 / " + foodTarget); setStatus("第 " + currentCampaignLevel().number + " 关 · " + currentSnakeBlueprint().name + " · " + currentSnakeBlueprint().chapter + "；" + (snakeControlMode === "swipe" ? "滑动庭园转向" : "使用四键转向") + "。"); startAmbient(); restartSnakeClock(); syncPauseControl(); drawSnake();
}

function handleControl(value) { const map = { up:[0,-1], right:[1,0], down:[0,1], left:[-1,0] }; if (value === "pause") { toggleSnakePause(); return; } if (map[value]) queueSnakeTurn(map[value][0], map[value][1]); }
function handleKey(key) { const normalized = key.length === 1 ? key.toLowerCase() : key; if (normalized === "p" || key === " ") { toggleSnakePause(); return; } const map = { ArrowUp:"up", ArrowRight:"right", ArrowDown:"down", ArrowLeft:"left", w:"up", d:"right", s:"down", a:"left" }; if (map[normalized]) handleControl(map[normalized]); }

canvas.addEventListener("pointerdown", (event) => { if (!running || snakePaused || snakeControlMode !== "swipe") return; snakeSwipe = { pointerId:event.pointerId, x:event.clientX, y:event.clientY }; canvas.setPointerCapture?.(event.pointerId); });
canvas.addEventListener("pointerup", (event) => { if (!snakeSwipe || snakeSwipe.pointerId !== event.pointerId) return; const dx = event.clientX - snakeSwipe.x; const dy = event.clientY - snakeSwipe.y; snakeSwipe = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return; if (Math.abs(dx) > Math.abs(dy)) queueSnakeTurn(dx > 0 ? 1 : -1, 0); else queueSnakeTurn(0, dy > 0 ? 1 : -1); });
canvas.addEventListener("pointercancel", () => { snakeSwipe = null; });

difficultyButtons.forEach((button) => button.addEventListener("click", () => { const value = button.dataset.snakeDifficulty; if (!running && !snakePaused) { applyDifficulty(value, false); return; } const now = performance.now(); if (pendingDifficulty !== value || now > pendingDifficultyUntil) { pendingDifficulty = value; pendingDifficultyUntil = now + 2500; setStatus("再次点击“" + difficultyProfiles[value].label + "”确认切换；当前巡游会重新开始。"); return; } pendingDifficulty = null; applyDifficulty(value, true); }));
controlModeButtons.forEach((button) => button.addEventListener("click", () => { const value = button.dataset.snakeControlMode; if (value !== "swipe" && value !== "buttons") return; snakeControlMode = value; syncSnakeControlMode(); }));
document.addEventListener("visibilitychange", () => { if (document.hidden && gameSessionState === "playing") toggleSnakePause(); });

onCampaignLevelChanged = () => { applySnakeCampaignTuning(); if (!running && !snakePaused) { resetCampaignRandom(); previewSnake(); createSnakeObstacles(); placeFood("normal"); drawSnake(); } };
runtimeDebugActions = {
  legalAction: () => { queueSnakeTurn(0,-1); },
  previewCompletion: () => { snakeCompletionUntil = performance.now() + 1600; drawSnake(); },
  queueTurnSequence: () => { previewSnake(); running = true; snakePaused = false; snakeReadyUntil = 0; queueSnakeTurn(0,-1); queueSnakeTurn(-1,0); snakeStep(performance.now()); snakeStep(performance.now() + currentStepDelay()); },
  sampleReachableFood: () => { let valid = true; for (let index = 0; index < 100; index += 1) { placeFood(index % 7 === 0 ? "golden" : "normal"); valid = valid && reachableSnakeCells().has(snakeCellKey(food.x, food.y)) && !snake.some((cell) => cell.x === food.x && cell.y === food.y) && !snakeObstacles.some((cell) => cell.x === food.x && cell.y === food.y); } snakeFoodProbe = { count:100, valid }; },
  pause: () => toggleSnakePause(), setSwipeMode: () => { snakeControlMode = "swipe"; syncSnakeControlMode(); }, setButtonMode: () => { snakeControlMode = "buttons"; syncSnakeControlMode(); },
};
runtimeDebugState = () => ({
  level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, levelName: currentSnakeBlueprint().name, chapter: currentSnakeBlueprint().chapter, pattern: currentSnakeBlueprint().pattern, layoutSignature: snakeLayoutSignature,
  difficulty: activeDifficulty, score, target: foodTarget, length: snake.length, obstacleCount: snakeObstacles.length, grid: { columns:gridColumns, rows:gridRows }, stepDelay: Math.round(currentStepDelay()), rendering: "requestAnimationFrame-interpolation",
  staticLayerCached: true, staticLayerRebuilds: snakeStaticRebuilds, interpolationMs: Math.round(snakeRenderDuration), estimatedFps: Math.round(1000 / Math.max(1, snakeFrameInterval)), renderedFrames: snakeRenderedFrames,
  wrapWalls: difficultyProfile.wrapWalls, selfCollision: difficultyProfile.selfCollision, assetRoles: ["head","body-straight","body-corner","tail","food","obstacle","eat","danger","complete"], head: snake[0], direction: { ...direction }, directionQueue: snakeDirectionQueue.map((value) => ({ ...value })),
  dangerNearHead: snakeDangerNearHead(), completionActive: performance.now() < snakeCompletionUntil, collision: collisionMarker, paused: snakePaused, controlMode: snakeControlMode, readyGraceActive: performance.now() < snakeReadyUntil,
  food: { ...food, reachable: reachableSnakeCells().has(snakeCellKey(food.x, food.y)) }, foodProbe: snakeFoodProbe, stats: { ...snakeStats },
});

loadSnakeControlMode(); syncDifficultyUi(); previewSnake(); createSnakeObstacles(); placeFood("normal"); drawSnake(); requestAnimationFrame(snakeAnimationLoop);


redrawGameArt = () => { drawSnake(); };
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
  const identity = {"projectId":"8647116c-5775-4e2b-becc-9f743c99924b","versionId":"01128351-4717-456d-a06f-41e434d2f0d0"};
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