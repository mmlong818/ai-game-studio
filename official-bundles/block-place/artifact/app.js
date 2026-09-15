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
const config = {"title":"果冻填阵","template":"block-place","difficulty":"standard","visualStyle":"color-block","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"board","inputModes":["pointer","keyboard","touch-buttons"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":[],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"block-place-01","label":"01 · 认识规则 · 基础消行","tier":1,"tierLabel":"认识规则","variant":0,"seed":3685367877,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"基础消行","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":2,"id":"block-place-02","label":"02 · 认识规则 · 长条规划","tier":1,"tierLabel":"认识规则","variant":1,"seed":2046020246,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"长条规划","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":3,"id":"block-place-03","label":"03 · 认识规则 · 转角组合","tier":1,"tierLabel":"认识规则","variant":2,"seed":2671465703,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"转角组合","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":4,"id":"block-place-04","label":"04 · 认识规则 · 高密棋盘","tier":1,"tierLabel":"认识规则","variant":3,"seed":1027661616,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"高密棋盘","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"解锁稳定节奏"},{"number":5,"id":"block-place-05","label":"05 · 稳定节奏 · 基础消行","tier":2,"tierLabel":"稳定节奏","variant":0,"seed":1384667521,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"基础消行","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":6,"id":"block-place-06","label":"06 · 稳定节奏 · 长条规划","tier":2,"tierLabel":"稳定节奏","variant":1,"seed":4040287186,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"长条规划","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":7,"id":"block-place-07","label":"07 · 稳定节奏 · 转角组合","tier":2,"tierLabel":"稳定节奏","variant":2,"seed":370764323,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"转角组合","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":8,"id":"block-place-08","label":"08 · 稳定节奏 · 高密棋盘","tier":2,"tierLabel":"稳定节奏","variant":3,"seed":3022451836,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"高密棋盘","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"解锁加入变化"},{"number":9,"id":"block-place-09","label":"09 · 加入变化 · 基础消行","tier":3,"tierLabel":"加入变化","variant":0,"seed":3396239053,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"基础消行","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":10,"id":"block-place-10","label":"10 · 加入变化 · 长条规划","tier":3,"tierLabel":"加入变化","variant":1,"seed":1807218974,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"长条规划","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":11,"id":"block-place-11","label":"11 · 加入变化 · 转角组合","tier":3,"tierLabel":"加入变化","variant":2,"seed":2315191151,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"转角组合","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":12,"id":"block-place-12","label":"12 · 加入变化 · 高密棋盘","tier":3,"tierLabel":"加入变化","variant":3,"seed":788827576,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"高密棋盘","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"解锁组合压力"},{"number":13,"id":"block-place-13","label":"13 · 组合压力 · 基础消行","tier":4,"tierLabel":"组合压力","variant":0,"seed":1296831497,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"基础消行","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":14,"id":"block-place-14","label":"14 · 组合压力 · 长条规划","tier":4,"tierLabel":"组合压力","variant":1,"seed":3801456218,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"长条规划","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":15,"id":"block-place-15","label":"15 · 组合压力 · 转角组合","tier":4,"tierLabel":"组合压力","variant":2,"seed":14489771,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"转角组合","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":16,"id":"block-place-16","label":"16 · 组合压力 · 高密棋盘","tier":4,"tierLabel":"组合压力","variant":3,"seed":2800394980,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"高密棋盘","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"解锁最终掌握"},{"number":17,"id":"block-place-17","label":"17 · 最终掌握 · 基础消行","tier":5,"tierLabel":"最终掌握","variant":0,"seed":3291622709,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"基础消行","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":18,"id":"block-place-18","label":"18 · 最终掌握 · 长条规划","tier":5,"tierLabel":"最终掌握","variant":1,"seed":1518057350,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"长条规划","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":19,"id":"block-place-19","label":"19 · 最终掌握 · 转角组合","tier":5,"tierLabel":"最终掌握","variant":2,"seed":4219679191,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"转角组合","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":20,"id":"block-place-20","label":"20 · 最终掌握 · 高密棋盘","tier":5,"tierLabel":"最终掌握","variant":3,"seed":432584736,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"高密棋盘","mission":"规划三块的放置顺序，用连续消行维持棋盘空间。","masteryRules":[{"id":"efficiency","label":"得分达到关卡目标的 125%","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":1.25},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:4a278928-fc2b-462f-addc-7d04a1bdc9d9:b641d984-0763-4b07-817f-c957ef529bc6","masteryStorageKey":"forge-mastery:4a278928-fc2b-462f-addc-7d04a1bdc9d9:b641d984-0763-4b07-817f-c957ef529bc6"};
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


const blockBoardSize = 8;
const blockBlueprints = [
  ["果冻初醒","空间感",120,2,.08,0],["双线花园","空间感",140,2,.1,1],["转角早餐","空间感",155,2,.12,2],["留白练习","空间感",170,2,.14,3],
  ["三枚约定","三块规划",190,2,.17,4],["长条码头","三块规划",210,2,.19,5],["方糖街区","三块规划",230,2,.21,6],["刷新之前","三块规划",250,2,.23,7],
  ["连击苏打","连击节奏",275,1,.27,8],["横竖同奏","连击节奏",300,1,.3,9],["果冻回声","连击节奏",325,1,.33,10],["彩虹三连","连击节奏",350,1,.36,11],
  ["窄巷开花","危机管理",380,1,.4,12],["边缘救援","危机管理",410,1,.44,13],["中央留灯","危机管理",440,1,.48,14],["最后通道","危机管理",470,1,.52,15],
  ["棱镜工坊","最终掌握",510,0,.56,16],["软糖高塔","最终掌握",550,0,.6,17],["满格庆典","最终掌握",600,0,.64,18],["果冻终章","最终掌握",660,0,.68,19],
].map((value,index)=>({number:index+1,name:value[0],chapter:value[1],target:value[2],hints:value[3],hardRate:value[4],opening:value[5]}));
const blockDifficulty = {
  relaxed: { target: 120, hardShapeRate: .08, comboGrace: 4 },
  standard: { target: 220, hardShapeRate: .24, comboGrace: 3 },
  challenging: { target: 360, hardShapeRate: .42, comboGrace: 2 },
}[config.difficulty];
let blockTarget = blockDifficulty.target;
let blockHardShapeRate = blockDifficulty.hardShapeRate;
let blockComboGrace = blockDifficulty.comboGrace;
const blockShapes = [
  [[0,0]], [[0,0],[0,1]], [[0,0],[1,0]],
  [[0,0],[0,1],[0,2]], [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[1,0]], [[0,0],[0,1],[1,1]],
  [[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[0,2],[1,1]],
  [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[1,1],[1,2]],
];
let blockBoard = [];
let blockPieces = [];
let selectedBlockPiece = 0;
let blockScore = 0;
let blockCombo = 0;
let blockDryMoves = 0;
let blockGeneration = 0;
let blockSeed = 0x4d595df4;
let blockClearEffect = null;
let blockHint = null;
let blockDragPreview = null;
let blockBatchGuaranteed = true;
let blockMode = "journey";
let blockHintsRemaining = 2;
let blockLinesCleared = 0;
let blockBestCombo = 0;
let blockBatchesCompleted = 0;
let blockOpeningSignature = "empty";
let blockDragState = null;
let blockRestored = false;
let blockModeBest = 0;
let blockDailySeed = 0;
const blockModeButtons = Array.from(document.querySelectorAll("[data-block-mode]"));
const blockBlueprint = () => blockBlueprints[Math.max(0,Math.min(19,currentCampaignLevel().number-1))];
const blockPieceStyles = [
  { plate: "#ffe2dd", outline: "#a73a30" },
  { plate: "#fff1b8", outline: "#805b00" },
  { plate: "#d9f7e9", outline: "#0b6b53" },
  { plate: "#e0ecff", outline: "#285ea8" },
  { plate: "#ffe5ca", outline: "#99480f" },
];

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createBlockBoard() {
  return Array.from({ length: blockBoardSize }, () => Array(blockBoardSize).fill(0));
}

function createBlockOpening(level) {
  const board = createBlockBoard();
  if (level.opening <= 0) return board;
  const candidates = [];
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
    if ((row + column + level.number) % 3 !== 0 || (row >= 2 && row <= 5 && column >= 2 && column <= 5)) candidates.push([row,column]);
  }
  const random = createSeededRandom((level.number * 0x9e3779b1) >>> 0);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
  }
  const fillCount = Math.min(14,Math.ceil(level.opening * .72));
  candidates.slice(0,fillCount).forEach(([row,column],index)=>{board[row][column]=index%5+1;});
  return board;
}

function blockSessionKey(){return config.campaignStorageKey+"-block-place-session-v2";}
function blockBestKey(){return config.campaignStorageKey+"-block-place-best-"+blockMode+(blockMode==="daily"?"-"+blockDailySeed:"");}
function clearBlockSession(){try{safeStorage.removeItem(blockSessionKey());}catch{}}
function readBlockModeBest(){try{return Math.max(0,Number(safeStorage.getItem(blockBestKey()))||0);}catch{return 0;}}
function updateBlockModeBest(){if(blockScore<=blockModeBest)return;blockModeBest=blockScore;try{safeStorage.setItem(blockBestKey(),String(blockModeBest));}catch{}}
function persistBlockSession(){if(blockMode!=="journey")return;try{safeStorage.setItem(blockSessionKey(),JSON.stringify({schemaVersion:2,level:currentCampaignLevel().number,board:blockBoard,pieces:blockPieces,selected:selectedBlockPiece,score:blockScore,combo:blockCombo,dryMoves:blockDryMoves,generation:blockGeneration,lines:blockLinesCleared,bestCombo:blockBestCombo,batches:blockBatchesCompleted,hints:blockHintsRemaining,updatedAt:new Date().toISOString()}));}catch{}}
function restoreBlockSession(){blockRestored=false;if(blockMode!=="journey")return;try{const saved=JSON.parse(safeStorage.getItem(blockSessionKey())||"null");const validBoard=Array.isArray(saved?.board)&&saved.board.length===blockBoardSize&&saved.board.every((row)=>Array.isArray(row)&&row.length===blockBoardSize&&row.every((cell)=>Number.isInteger(cell)&&cell>=0&&cell<=5));const validPieces=Array.isArray(saved?.pieces)&&saved.pieces.length===3&&saved.pieces.every((piece)=>Array.isArray(piece?.cells)&&piece.cells.length>0&&piece.cells.length<=5&&piece.cells.every((cell)=>Array.isArray(cell)&&cell.length===2&&cell.every((value)=>Number.isInteger(value)&&value>=0&&value<blockBoardSize))&&Number.isInteger(piece?.sprite)&&piece.sprite>=0&&piece.sprite<5&&typeof piece?.used==="boolean");if(!saved||saved.schemaVersion!==2||saved.level!==currentCampaignLevel().number||!validBoard||!validPieces)return;blockBoard=saved.board;blockPieces=saved.pieces;selectedBlockPiece=Math.max(0,Math.min(2,Number(saved.selected)||0));blockScore=Math.max(0,Number(saved.score)||0);blockCombo=Math.max(0,Number(saved.combo)||0);blockDryMoves=Math.max(0,Number(saved.dryMoves)||0);blockGeneration=Math.max(0,Number(saved.generation)||0);blockLinesCleared=Math.max(0,Number(saved.lines)||0);blockBestCombo=Math.max(0,Number(saved.bestCombo)||0);blockBatchesCompleted=Math.max(0,Number(saved.batches)||0);blockHintsRemaining=Math.max(0,Number(saved.hints)||0);blockRestored=true;}catch{}}

function generateBlockPieces() {
  blockGeneration += 1;
  const random = createSeededRandom((blockSeed + blockGeneration * 0x9e3779b1) >>> 0);
  const safeShapes = blockShapes.slice(0, 8);
  const hardShapes = blockShapes.slice(8);
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const batch = Array.from({ length: 3 }, (_, index) => {
      const pool = random() < blockHardShapeRate ? hardShapes : safeShapes;
      const cells = pool[Math.floor(random() * pool.length)];
      return { id: blockGeneration + "-" + attempt + "-" + index, cells, sprite: Math.floor(random() * 5), used: false };
    });
    if (blockBatchCanBePlaced(blockBoard, batch)) { blockBatchGuaranteed = true; return batch; }
  }
  blockBatchGuaranteed = true;
  return [
    { id: blockGeneration + "-fallback-0", cells: [[0,0]], sprite: 0, used: false },
    { id: blockGeneration + "-fallback-1", cells: [[0,0]], sprite: 1, used: false },
    { id: blockGeneration + "-fallback-2", cells: [[0,0]], sprite: 2, used: false },
  ];
}

function canPlaceOnBlockBoard(board, piece, row, column) {
  return piece && !piece.used && piece.cells.every(([cellRow, cellColumn]) => {
    const targetRow = row + cellRow;
    const targetColumn = column + cellColumn;
    return targetRow >= 0 && targetColumn >= 0 && targetRow < blockBoardSize && targetColumn < blockBoardSize && board[targetRow][targetColumn] === 0;
  });
}

function simulateBlockPlacement(board, piece, row, column) {
  const next = board.map((line) => [...line]);
  piece.cells.forEach(([cellRow, cellColumn]) => { next[row + cellRow][column + cellColumn] = 1; });
  const clear = findLineClear(next);
  clear.cells.forEach((key) => { const [clearRow, clearColumn] = key.split(":").map(Number); next[clearRow][clearColumn] = 0; });
  return next;
}

function blockBatchCanBePlaced(board, pieces, index = 0) {
  if (index >= pieces.length) return true;
  const piece = pieces[index];
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
    if (!canPlaceOnBlockBoard(board, piece, row, column)) continue;
    if (blockBatchCanBePlaced(simulateBlockPlacement(board, piece, row, column), pieces, index + 1)) return true;
  }
  return false;
}

function canPlaceBlockPiece(piece, row, column) {
  return canPlaceOnBlockBoard(blockBoard, piece, row, column);
}

function blockPlacementCount(piece) {
  let count = 0;
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) if (canPlaceBlockPiece(piece, row, column)) count += 1;
  return count;
}

function findLineClear(board) {
  const rows = [];
  const columns = [];
  for (let row = 0; row < blockBoardSize; row += 1) if (board[row].every(Boolean)) rows.push(row);
  for (let column = 0; column < blockBoardSize; column += 1) if (board.every((row) => row[column])) columns.push(column);
  const cells = new Set();
  rows.forEach((row) => { for (let column = 0; column < blockBoardSize; column += 1) cells.add(row + ":" + column); });
  columns.forEach((column) => { for (let row = 0; row < blockBoardSize; row += 1) cells.add(row + ":" + column); });
  return { rows, columns, cells };
}

function hasAnyPlacement() {
  return blockPieces.some((piece) => {
    if (!piece || piece.used) return false;
    for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
      if (canPlaceBlockPiece(piece, row, column)) return true;
    }
    return false;
  });
}

function blockFirstPlacement(piece) {
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
    if (canPlaceBlockPiece(piece, row, column)) return { row, column };
  }
  return null;
}

function placeBlockPiece(row, column) {
  const piece = blockPieces[selectedBlockPiece];
  if (!canPlaceBlockPiece(piece, row, column)) {
    blockClearEffect = { invalid: true, until: performance.now() + 190 };
    playSound("fail"); drawBlockPlace();
    return false;
  }
  for (const [cellRow, cellColumn] of piece.cells) blockBoard[row + cellRow][column + cellColumn] = piece.sprite + 1;
  piece.used = true;
  const clear = findLineClear(blockBoard);
  const lineCount = clear.rows.length + clear.columns.length;
  if (lineCount > 0) {
    blockCombo += 1;
    blockLinesCleared += lineCount;
    blockBestCombo = Math.max(blockBestCombo, blockCombo);
    blockDryMoves = 0;
    const earned = piece.cells.length + lineCount * 12 * blockCombo;
    blockScore += earned;
    blockClearEffect = { cells: clear.cells, earned, combo: blockCombo, until: performance.now() + 360 };
    for (const key of clear.cells) {
      const [clearRow, clearColumn] = key.split(":").map(Number);
      blockBoard[clearRow][clearColumn] = 0;
    }
  } else {
    blockScore += piece.cells.length;
    blockDryMoves += 1;
    if (blockDryMoves >= blockComboGrace) blockCombo = 0;
    blockClearEffect = null;
  }
  updateBlockModeBest();
  blockHint = null;
  playSound("move");
  if (blockPieces.every((candidate) => candidate.used)) { blockBatchesCompleted += 1; blockPieces = generateBlockPieces(); }
  const next = blockPieces.findIndex((candidate) => !candidate.used);
  if (next >= 0) selectedBlockPiece = next;
  setMetric(blockMode === "endless" ? blockScore + " · 最佳 " + blockModeBest : blockScore + " / " + blockTarget);
  if (blockMode !== "endless" && blockScore >= blockTarget) {
    clearBlockSession();
    drawBlockPlace();
    showResult(true, "果冻阵列完成", "你以 " + blockScore + " 分维持了棋盘空间，最高连击为 ×" + Math.max(1, blockCombo) + "。 ");
    return true;
  }
  if (!hasAnyPlacement()) {
    clearBlockSession();
    drawBlockPlace();
    showResult(false, "棋盘没有空间了", "本局得到 " + blockScore + " 分；下一局优先保留中央与长条通道。 ");
    return true;
  }
  const placementCounts = blockPieces.filter((candidate) => !candidate.used).map(blockPlacementCount);
  const danger = placementCounts.length && Math.min(...placementCounts) <= 2;
  persistBlockSession();
  setStatus(lineCount ? "消除 " + lineCount + " 条 · 连击 ×" + blockCombo + " · +" + blockClearEffect.earned : danger ? "危险：有候选只剩 " + Math.min(...placementCounts) + " 个落点，优先腾出长条通道。 " : "放置完成；继续为三个候选保留共同落点。 ");
  drawBlockPlace();
  return true;
}

function blockLayout() {
  const size = Math.min(620, gameSceneHeight() * .54);
  return { size, cell: size / blockBoardSize, x: (720 - size) / 2, y: 190 };
}

function blockTrayLayout(boardLayout = blockLayout()) {
  const slotWidth = 192;
  const slotHeight = 156;
  const gap = 12;
  const width = slotWidth * 3 + gap * 2;
  const y = Math.min(gameSceneHeight() - 196, boardLayout.y + boardLayout.size + 76);
  return { x: (720 - width) / 2, y, width, slotWidth, slotHeight, gap };
}

function blockTrayPieceAt(point, boardLayout = blockLayout()) {
  const tray = blockTrayLayout(boardLayout);
  if (point.y < tray.y || point.y > tray.y + tray.slotHeight || point.x < tray.x || point.x > tray.x + tray.width) return -1;
  for (let index = 0; index < 3; index += 1) {
    const x = tray.x + index * (tray.slotWidth + tray.gap);
    if (point.x >= x && point.x <= x + tray.slotWidth) return index;
  }
  return -1;
}

function drawBlockCell(sprite, x, y, size, options = {}) {
  const style = blockPieceStyles[sprite % blockPieceStyles.length];
  const inset = options.compact ? 1.5 : 2.5;
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.fillStyle = style.plate;
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = options.compact ? 2 : 3;
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, options.compact ? 8 : 11);
  ctx.fill(); ctx.stroke();
  ctx.restore();
  drawBitmapSprite(sprite, x + 3, y + 3, size - 6, size - 6, { fallback: style.outline, radius: options.compact ? 7 : 10, scale: 1.06, alpha: options.alpha ?? 1 });
}

function drawBlockPlace() {
  clearCanvas();
  ctx.save();
  ctx.fillStyle = "rgba(249,246,239,.94)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.restore();
  ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = blockLayout();
  if (running) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#40372f";
    ctx.font = "800 32px Inter, sans-serif";
    ctx.fillText((blockMode === "endless" ? "无尽 " : "") + "得分 " + blockScore + "   连击 ×" + blockCombo, 360, 98);
    ctx.fillStyle = "#786a5f";
    ctx.font = "600 20px Inter, sans-serif";
    ctx.fillText(blockBlueprint().name + " · 消除 " + blockLinesCleared + " 线 · 三块用完才刷新", 360, 137);
  }
  ctx.save();
  ctx.shadowColor = "rgba(34,47,45,.18)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#263532";
  ctx.beginPath(); ctx.roundRect(layout.x - 16, layout.y - 16, layout.size + 32, layout.size + 32, 34); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(19,33,31,.78)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
    const x = layout.x + column * layout.cell;
    const y = layout.y + row * layout.cell;
    const value = blockBoard[row][column];
    if (value) drawBlockCell((value - 1) % 5, x + 3, y + 3, layout.cell - 6, { compact: true });
    else {
      ctx.fillStyle = "#36433f";
      ctx.strokeStyle = "rgba(220,238,230,.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x + 5, y + 5, layout.cell - 10, layout.cell - 10, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(11,24,22,.24)";
      ctx.beginPath(); ctx.roundRect(x + 9, y + 9, layout.cell - 18, layout.cell - 18, 9); ctx.fill();
    }
    if (blockHint && blockHint.cells.has(row + ":" + column)) {
      ctx.fillStyle = "rgba(255,255,255,.34)"; ctx.fillRect(x + 6, y + 6, layout.cell - 12, layout.cell - 12);
    }
    if (blockDragPreview && blockDragPreview.cells.has(row + ":" + column)) {
      ctx.fillStyle = blockDragPreview.valid ? "rgba(133,232,190,.46)" : "rgba(238,77,55,.38)"; ctx.fillRect(x + 4, y + 4, layout.cell - 8, layout.cell - 8);
    }
  }
  const tray = blockTrayLayout(layout);
  ctx.save();
  ctx.fillStyle = "rgba(246,243,232,.96)";
  ctx.strokeStyle = "rgba(175,160,126,.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(tray.x - 16, tray.y - 18, tray.width + 32, tray.slotHeight + 36, 32);
  ctx.fill(); ctx.stroke();
  ctx.restore();
  blockPieces.forEach((piece, index) => {
    const slotX = tray.x + index * (tray.slotWidth + tray.gap);
    const selected = index === selectedBlockPiece && !piece.used;
    ctx.save();
    ctx.fillStyle = selected ? "rgba(255,236,184,.46)" : "rgba(255,255,255,.24)";
    ctx.strokeStyle = selected ? "rgba(128,91,0,.72)" : "rgba(126,111,88,.16)";
    ctx.lineWidth = selected ? 3 : 1;
    ctx.shadowColor = selected ? "rgba(255,190,76,.3)" : "transparent";
    ctx.shadowBlur = selected ? 18 : 0;
    ctx.beginPath();
    ctx.roundRect(slotX, tray.y, tray.slotWidth, tray.slotHeight, 24);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = selected ? "#6f4e12" : "#766d61";
    ctx.beginPath(); ctx.arc(slotX + 21, tray.y + 21, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fffdf7";
    ctx.font = "800 17px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), slotX + 21, tray.y + 21);
    ctx.restore();
    const pieceAlpha = piece.used ? 0 : 1;
    const width = Math.max(...piece.cells.map((cell) => cell[1])) + 1;
    const height = Math.max(...piece.cells.map((cell) => cell[0])) + 1;
    const mini = Math.min(56, 160 / width, 108 / height);
    const pieceX = slotX + (tray.slotWidth - width * mini) / 2;
    const pieceY = tray.y + 32 + (tray.slotHeight - 36 - height * mini) / 2;
    for (const [row, column] of piece.cells) drawBlockCell(piece.sprite, pieceX + column * mini, pieceY + row * mini, mini, { compact: false, alpha: pieceAlpha });
    if (piece.used) {
      ctx.fillStyle = "rgba(93,82,71,.56)";
      ctx.font = "700 15px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("已放置", slotX + tray.slotWidth / 2, tray.y + tray.slotHeight / 2 + 10);
      ctx.textBaseline = "alphabetic";
    }
  });
  if (blockClearEffect && performance.now() < blockClearEffect.until) {
    const sprite = blockClearEffect.invalid ? 7 : blockClearEffect.combo > 1 ? 6 : 5;
    drawBitmapSprite(sprite, 260, layout.y + layout.size * .42, 200, 200, { fallback: blockClearEffect.invalid ? palette.primary : palette.highlight, alpha: .74, scale: 1.12 });
  }
  ctx.restore();
  if (config.visualStyle !== "color-block") finishCanvasStyle();
}

function hintBlockPlacement() {
  if(blockHintsRemaining<=0){setStatus("本关提示已经用完；观察能同时保留三枚候选落点的位置。");return false;}
  for (let index = 0; index < blockPieces.length; index += 1) {
    const placement = blockFirstPlacement(blockPieces[index]);
    if (!placement) continue;
    selectedBlockPiece = index;
    const cells = new Set(blockPieces[index].cells.map(([row, column]) => (placement.row + row) + ":" + (placement.column + column)));
    blockHint = { ...placement, cells };
    blockHintsRemaining-=1;document.querySelectorAll("[data-control=hint]").forEach((button)=>{button.textContent="提示 "+blockHintsRemaining;button.disabled=blockHintsRemaining<=0;});
    setStatus("已高亮一个安全落点；仍可自行选择更高分的位置，还可提示 "+blockHintsRemaining+" 次。 "); drawBlockPlace(); return true;
  }
  return false;
}

function startGame() {
  const level = currentCampaignLevel();
  const blueprint = blockBlueprint();
  blockMode = blockModeButtons.find((button)=>button.classList.contains("is-selected"))?.dataset.blockMode||"journey";
  blockTarget = Math.max(80, Math.round(blueprint.target * (blockDifficulty.target / 220)));
  blockHardShapeRate = Math.min(.72, Math.max(blueprint.hardRate,blockDifficulty.hardShapeRate + (level.tier - 1) * .055));
  blockComboGrace = Math.max(1, blockDifficulty.comboGrace - Math.floor((level.tier - 1) / 2));
  blockBoard = createBlockOpening(blueprint);
  blockOpeningSignature = blockBoard.map((row)=>row.map((cell)=>cell?1:0).join("")).join("/");
  blockScore = 0; blockCombo = 0; blockDryMoves = 0; blockGeneration = 0; blockLinesCleared=0; blockBestCombo=0; blockBatchesCompleted=0; blockHintsRemaining=blueprint.hints; blockRestored=false;
  blockDailySeed = blockMode==="daily"?Number(new Date().toISOString().slice(0,10).replaceAll("-","")):0;
  blockSeed = blockDailySeed||level.seed;
  blockModeBest = readBlockModeBest();
  blockPieces = blockMode==="journey" && level.tier <= 2 ? [
    { id: "opening-a", cells: [[0,0],[0,1],[0,2]], sprite: 0, used: false },
    { id: "opening-b", cells: [[0,0],[0,1],[0,2]], sprite: 1, used: false },
    { id: "opening-c", cells: [[0,0],[0,1]], sprite: 2, used: false },
  ] : generateBlockPieces();
  selectedBlockPiece = 0; blockClearEffect = null; blockHint = null; blockDragPreview = null; blockDragState = null; blockBatchGuaranteed = true;
  restoreBlockSession();
  running = true; hideOverlay(); startAmbient();
  document.querySelectorAll("[data-control=hint]").forEach((button)=>{button.textContent="提示 "+blockHintsRemaining;button.disabled=blockHintsRemaining<=0;});
  setMetric(blockMode === "endless" ? blockScore + " · 最佳 " + blockModeBest : blockScore + " / " + blockTarget);
  setStatus((blockRestored?"已恢复 · ":"")+"第 " + level.number + " 关 · " + blueprint.name + " · " + blueprint.chapter + (blockMode==="endless"?"；保持空间并刷新个人最佳。":"；达到 " + blockTarget + " 分完成。"));
  drawBlockPlace();
}

function handleControl(value) { if (value === "hint") hintBlockPlacement(); }
function handleKey(key) {
  if (["1","2","3"].includes(key)) { selectedBlockPiece = Number(key) - 1; drawBlockPlace(); }
  if (key.toLowerCase() === "h") hintBlockPlacement();
}

blockModeButtons.forEach((button)=>button.addEventListener("click",()=>{blockModeButtons.forEach((candidate)=>{const selected=candidate===button;candidate.classList.toggle("is-selected",selected);candidate.setAttribute("aria-pressed",String(selected));});clearBlockSession();}));

canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  const layout = blockLayout();
  const pieceIndex = blockTrayPieceAt(point, layout);
  if (pieceIndex >= 0) {
    selectedBlockPiece = pieceIndex;
    blockDragState = { pointerId:event.pointerId, liftCells:event.pointerType==="touch"?2:1 };
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    drawBlockPlace();
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!running || !canvas.hasPointerCapture(event.pointerId)) return;
  const point = eventScenePoint(event);
  const layout = blockLayout();
  const row = Math.floor((point.y - layout.y) / layout.cell) - (blockDragState?.liftCells||0);
  const column = Math.floor((point.x - layout.x) / layout.cell);
  const piece = blockPieces[selectedBlockPiece];
  const cells = new Set(piece.cells.map(([cellRow, cellColumn]) => (row + cellRow) + ":" + (column + cellColumn)));
  blockDragPreview = { row, column, cells, valid: canPlaceBlockPiece(piece, row, column) };
  drawBlockPlace();
});

canvas.addEventListener("pointerup", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  const layout = blockLayout();
  if (point.y >= layout.y && point.y <= layout.y + layout.size && point.x >= layout.x && point.x <= layout.x + layout.size) {
    placeBlockPiece(Math.floor((point.y - layout.y) / layout.cell) - (blockDragState?.liftCells||0), Math.floor((point.x - layout.x) / layout.cell));
    blockDragPreview = null;
    blockDragState = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    return;
  }
  const pieceIndex = blockTrayPieceAt(point, layout);
  if (pieceIndex >= 0) {
    selectedBlockPiece = pieceIndex;
    blockDragState = null;
    drawBlockPlace();
  }
  blockDragPreview = null;
  blockDragState = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});

blockBoard = createBlockBoard();
blockPieces = [
  { id: "preview-a", cells: [[0,0],[0,1],[0,2]], sprite: 0, used: false },
  { id: "preview-b", cells: [[0,0],[1,0],[1,1]], sprite: 1, used: false },
  { id: "preview-c", cells: [[0,0],[0,1]], sprite: 2, used: false },
];
runtimeDebugState = () => {
  const remaining = blockPieces.filter((piece) => !piece.used);
  const placementCounts = remaining.map(blockPlacementCount);
  const tray = blockTrayLayout();
  return { level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, levelName:blockBlueprint().name, chapter:blockBlueprint().chapter, blueprintCount:blockBlueprints.length, uniqueBlueprintNames:new Set(blockBlueprints.map((entry)=>entry.name)).size, target: blockTarget, score: blockScore, combo:blockCombo, bestCombo:blockBestCombo, bestScore:blockModeBest, dailySeed:blockDailySeed, candidateSignature:blockPieces.map((piece)=>piece.cells.map((cell)=>cell.join(":" )).join("|")+"@"+piece.sprite).join("/"), linesCleared:blockLinesCleared, batchesCompleted:blockBatchesCompleted, hintsRemaining:blockHintsRemaining, mode:blockMode, hardShapeRate:blockHardShapeRate, openingSignature:blockOpeningSignature, piecesRemaining:remaining.length, batchGuaranteed:blockBatchGuaranteed && blockBatchCanBePlaced(blockBoard,remaining), placementCounts, danger:placementCounts.length > 0 && Math.min(...placementCounts) <= 2, dragPreview:blockDragPreview, dragLiftCells:blockDragState?.liftCells||0, restored:blockRestored, candidateUi:{ style: "floating-pedestals", slotWidth:tray.slotWidth, slotHeight:tray.slotHeight, selectedOutlineWidth:3, selectedHalo:true, greenPlate:blockPieceStyles[2].plate, greenOutline:blockPieceStyles[2].outline, greenContrast: 5.68, numberedSlots:true } };
};
runtimeDebugActions = {
  pointerProbe(){const piece=blockPieces.find((candidate)=>!candidate.used),placement=piece&&blockFirstPlacement(piece),layout=blockLayout(),tray=blockTrayLayout(layout),index=blockPieces.indexOf(piece);if(!piece||!placement||index<0)return null;return{from:{x:tray.x+index*(tray.slotWidth+tray.gap)+tray.slotWidth/2,y:gameSceneTop()+tray.y+tray.slotHeight/2},to:{x:layout.x+(placement.column+.5)*layout.cell,y:gameSceneTop()+layout.y+(placement.row+1.5)*layout.cell},canvas:{width:canvas.width,height:canvas.height}};},
  legalAction() {
    const placement = blockFirstPlacement(blockPieces[selectedBlockPiece]);
    return placement ? placeBlockPiece(placement.row, placement.column) : false;
  },
  regenerate() { blockPieces = generateBlockPieces(); selectedBlockPiece = 0; drawBlockPlace(); },
  surveyBatches(){let valid=0;for(let index=0;index<100;index+=1){const batch=generateBlockPieces();if(blockBatchCanBePlaced(blockBoard,batch))valid+=1;}return{count:100,valid};},
  setJourneyMode(){blockMode="journey";blockModeButtons.forEach((button)=>{const selected=button.dataset.blockMode==="journey";button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected));});},
  setEndlessMode(){blockMode="endless";blockModeButtons.forEach((button)=>{const selected=button.dataset.blockMode==="endless";button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected));});},
  setDailyMode(){blockMode="daily";blockModeButtons.forEach((button)=>{const selected=button.dataset.blockMode==="daily";button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected));});},
  clearSession: clearBlockSession,
  hint: hintBlockPlacement,
  prepareDanger() {
    blockBoard = Array.from({ length: blockBoardSize }, (_, row) => Array.from({ length: blockBoardSize }, (_, column) => (row === 7 && column >= 6 ? 0 : 1)));
    blockPieces = [
      { id: "danger-a", cells: [[0,0]], sprite: 0, used: false },
      { id: "danger-b", cells: [[0,0]], sprite: 1, used: true },
      { id: "danger-c", cells: [[0,0]], sprite: 2, used: true },
    ];
    selectedBlockPiece = 0; drawBlockPlace();
  },
};
drawBlockPlace();


redrawGameArt = () => { drawBlockPlace(); };
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
  const identity = {"projectId":"4a278928-fc2b-462f-addc-7d04a1bdc9d9","versionId":"b641d984-0763-4b07-817f-c957ef529bc6"};
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