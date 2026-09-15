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
const config = {"title":"星灵巡格","template":"region-logic","difficulty":"standard","visualStyle":"cute","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"board","inputModes":["pointer","keyboard","touch-buttons"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":[],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"region-logic-01","label":"01 · 认识规则 · 边界初识","tier":1,"tierLabel":"认识规则","variant":0,"seed":4242590263,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"边界初识","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":2,"id":"region-logic-02","label":"02 · 认识规则 · 行列回声","tier":1,"tierLabel":"认识规则","variant":1,"seed":1589199076,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"行列回声","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":3,"id":"region-logic-03","label":"03 · 认识规则 · 星距练习","tier":1,"tierLabel":"认识规则","variant":2,"seed":3094470293,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"星距练习","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":4,"id":"region-logic-04","label":"04 · 认识规则 · 三线合一","tier":1,"tierLabel":"认识规则","variant":3,"seed":436884802,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"三线合一","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"解锁稳定节奏"},{"number":5,"id":"region-logic-05","label":"05 · 稳定节奏 · 折区锁定","tier":2,"tierLabel":"稳定节奏","variant":4,"seed":1975702515,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"折区锁定","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":6,"id":"region-logic-06","label":"06 · 稳定节奏 · 窄域借位","tier":2,"tierLabel":"稳定节奏","variant":5,"seed":3617286560,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"窄域借位","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":7,"id":"region-logic-07","label":"07 · 稳定节奏 · 双线交叉","tier":2,"tierLabel":"稳定节奏","variant":6,"seed":827580497,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"双线交叉","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":8,"id":"region-logic-08","label":"08 · 稳定节奏 · 七域归位","tier":2,"tierLabel":"稳定节奏","variant":7,"seed":2473360910,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"七域归位","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"解锁加入变化"},{"number":9,"id":"region-logic-09","label":"09 · 加入变化 · 八方巡格","tier":3,"tierLabel":"加入变化","variant":8,"seed":3978622143,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"八方巡格","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":10,"id":"region-logic-10","label":"10 · 加入变化 · 长区封锁","tier":3,"tierLabel":"加入变化","variant":9,"seed":1291678572,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"长区封锁","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":11,"id":"region-logic-11","label":"11 · 加入变化 · 回环排除","tier":3,"tierLabel":"加入变化","variant":10,"seed":2931132701,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"回环排除","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":12,"id":"region-logic-12","label":"12 · 加入变化 · 单星星图","tier":3,"tierLabel":"加入变化","variant":11,"seed":139331530,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"单星星图","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"解锁组合压力"},{"number":13,"id":"region-logic-13","label":"13 · 组合压力 · 双星启航","tier":4,"tierLabel":"组合压力","variant":12,"seed":1778818683,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"双星启航","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":14,"id":"region-logic-14","label":"14 · 组合压力 · 两两相望","tier":4,"tierLabel":"组合压力","variant":13,"seed":3319731240,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"两两相望","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":15,"id":"region-logic-15","label":"15 · 组合压力 · 十域配额","tier":4,"tierLabel":"组合压力","variant":14,"seed":664244953,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"十域配额","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"关卡星章"},{"number":16,"id":"region-logic-16","label":"16 · 组合压力 · 双环编队","tier":4,"tierLabel":"组合压力","variant":15,"seed":2174757014,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"双环编队","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"解锁最终掌握"},{"number":17,"id":"region-logic-17","label":"17 · 最终掌握 · 反证星尘","tier":5,"tierLabel":"最终掌握","variant":16,"seed":3816335175,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"反证星尘","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"大师徽记"},{"number":18,"id":"region-logic-18","label":"18 · 最终掌握 · 复合星链","tier":5,"tierLabel":"最终掌握","variant":17,"seed":2100379124,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"复合星链","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"大师徽记"},{"number":19,"id":"region-logic-19","label":"19 · 最终掌握 · 无猜巡天","tier":5,"tierLabel":"最终掌握","variant":18,"seed":3704208293,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"无猜巡天","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"大师徽记"},{"number":20,"id":"region-logic-20","label":"20 · 最终掌握 · 星域大师","tier":5,"tierLabel":"最终掌握","variant":19,"seed":1048719954,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"星域大师","mission":"通过行、列、区域和相邻约束完成唯一解推理。","masteryRules":[{"id":"efficiency","label":"全程不使用提示","metric":"hints","comparison":"lte","target":0},{"id":"control","label":"全程零错误","metric":"errors","comparison":"lte","target":0}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:6d6f62aa-ed8c-478f-8260-c60c562c0081:640b21a4-c634-4928-b7f5-bc751a2f0e36","masteryStorageKey":"forge-mastery:6d6f62aa-ed8c-478f-8260-c60c562c0081:640b21a4-c634-4928-b7f5-bc751a2f0e36"};
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


const regionLevelCatalog = [{"number":1,"chapter":1,"name":"边界初识","seed":1841901755,"size":6,"starsPerUnit":1,"regions":[[3,3,0,0,0,0],[3,1,1,0,0,0],[3,3,2,2,0,0],[3,2,2,0,0,0],[3,2,2,2,4,0],[3,3,5,2,0,0]],"solution":[[0,5],[1,1],[2,3],[3,0],[4,4],[5,2]],"difficulty":{"steps":6,"directSteps":6,"contradictionSteps":0,"ruleSequence":["quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":2,"chapter":1,"name":"行列回声","seed":695870749,"size":6,"starsPerUnit":1,"regions":[[1,1,1,1,1,0],[1,2,2,2,3,3],[2,2,2,2,3,3],[2,2,2,3,3,3],[2,4,5,5,5,5],[4,4,5,5,5,5]],"solution":[[0,5],[1,0],[2,2],[3,4],[4,1],[5,3]],"difficulty":{"steps":8,"directSteps":6,"contradictionSteps":2,"ruleSequence":["quota-fill","quota-fill","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":3,"chapter":1,"name":"星距练习","seed":3482368616,"size":6,"starsPerUnit":1,"regions":[[2,1,1,1,0,0],[2,2,2,1,4,4],[2,2,3,3,4,4],[2,2,3,3,4,4],[2,5,5,4,4,4],[5,5,5,5,4,4]],"solution":[[0,5],[1,3],[2,0],[3,2],[4,4],[5,1]],"difficulty":{"steps":10,"directSteps":6,"contradictionSteps":4,"ruleSequence":["contradiction","contradiction","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":4,"chapter":1,"name":"三线合一","seed":2332143306,"size":6,"starsPerUnit":1,"regions":[[0,0,0,0,3,2],[1,1,1,0,3,2],[3,3,3,3,3,2],[3,3,3,3,3,3],[3,3,3,3,4,4],[5,3,4,4,4,4]],"solution":[[0,3],[1,1],[2,5],[3,2],[4,4],[5,0]],"difficulty":{"steps":10,"directSteps":6,"contradictionSteps":4,"ruleSequence":["quota-fill","contradiction","contradiction","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":5,"chapter":2,"name":"折区锁定","seed":2686193233,"size":7,"starsPerUnit":1,"regions":[[1,1,0,0,2,2,2],[1,1,0,2,2,2,2],[1,0,0,5,2,2,2],[3,0,0,5,2,2,2],[3,5,4,5,2,2,6],[5,5,5,5,5,6,6],[5,5,5,5,6,6,6]],"solution":[[0,3],[1,1],[2,5],[3,0],[4,2],[5,4],[6,6]],"difficulty":{"steps":7,"directSteps":7,"contradictionSteps":0,"ruleSequence":["quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":6,"chapter":2,"name":"窄域借位","seed":3840612863,"size":7,"starsPerUnit":1,"regions":[[3,3,3,3,1,1,0],[3,3,1,1,1,1,1],[2,3,1,1,4,1,1],[2,3,3,4,4,1,4],[2,2,2,5,4,4,4],[2,2,5,5,4,4,4],[2,6,5,5,5,5,5]],"solution":[[0,6],[1,4],[2,0],[3,2],[4,5],[5,3],[6,1]],"difficulty":{"steps":8,"directSteps":7,"contradictionSteps":1,"ruleSequence":["quota-fill","quota-fill","contradiction","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":7,"chapter":2,"name":"双线交叉","seed":1186112428,"size":7,"starsPerUnit":1,"regions":[[0,0,0,0,0,0,1],[0,0,0,1,1,1,1],[2,0,0,1,4,1,1],[3,3,3,1,4,1,1],[5,5,3,1,4,4,1],[5,5,3,1,4,4,1],[5,5,3,6,4,4,4]],"solution":[[0,4],[1,6],[2,0],[3,2],[4,5],[5,1],[6,3]],"difficulty":{"steps":11,"directSteps":7,"contradictionSteps":4,"ruleSequence":["quota-fill","quota-fill","contradiction","contradiction","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":8,"chapter":2,"name":"七域归位","seed":35885070,"size":7,"starsPerUnit":1,"regions":[[1,2,2,2,2,0,3],[1,2,2,3,3,3,3],[2,2,2,2,3,3,3],[2,2,3,3,3,3,3],[2,2,3,3,3,4,4],[5,5,3,4,4,4,4],[5,5,5,6,6,4,4]],"solution":[[0,5],[1,0],[2,2],[3,4],[4,6],[5,1],[6,3]],"difficulty":{"steps":11,"directSteps":7,"contradictionSteps":4,"ruleSequence":["quota-fill","quota-fill","contradiction","contradiction","contradiction","quota-fill","contradiction","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":9,"chapter":3,"name":"八方巡格","seed":3730080992,"size":8,"starsPerUnit":1,"regions":[[1,1,1,1,1,3,0,3],[2,2,1,1,3,3,3,3],[2,2,3,3,3,3,3,3],[2,3,3,7,7,3,3,3],[2,6,3,7,7,3,3,4],[5,6,7,7,7,7,4,4],[6,6,6,7,7,7,4,4],[7,7,7,7,7,7,7,7]],"solution":[[0,6],[1,3],[2,1],[3,5],[4,7],[5,0],[6,2],[7,4]],"difficulty":{"steps":8,"directSteps":8,"contradictionSteps":0,"ruleSequence":["quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":10,"chapter":3,"name":"长区封锁","seed":2139947827,"size":8,"starsPerUnit":1,"regions":[[0,0,0,1,1,1,1,1],[0,2,0,1,1,1,1,1],[7,2,0,1,1,1,1,1],[7,3,3,3,3,3,5,5],[7,7,4,3,7,5,5,5],[7,7,7,7,7,7,7,5],[7,7,7,7,7,6,7,5],[7,7,7,7,7,7,7,7]],"solution":[[0,0],[1,6],[2,1],[3,4],[4,2],[5,7],[6,5],[7,3]],"difficulty":{"steps":11,"directSteps":8,"contradictionSteps":3,"ruleSequence":["quota-fill","quota-fill","quota-fill","quota-fill","contradiction","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":11,"chapter":3,"name":"回环排除","seed":2646997314,"size":8,"starsPerUnit":1,"regions":[[3,2,2,2,2,0,0,0],[3,3,2,2,2,2,0,1],[3,3,2,2,2,2,0,4],[3,3,3,0,0,0,0,4],[3,5,3,3,4,0,4,4],[5,5,5,4,4,0,4,4],[6,5,5,5,4,4,4,4],[6,6,4,4,4,4,7,7]],"solution":[[0,5],[1,7],[2,3],[3,1],[4,4],[5,2],[6,0],[7,6]],"difficulty":{"steps":15,"directSteps":8,"contradictionSteps":7,"ruleSequence":["quota-fill","quota-fill","quota-fill","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":12,"chapter":3,"name":"单星星图","seed":993949589,"size":8,"starsPerUnit":1,"regions":[[6,6,6,6,1,1,1,0],[6,6,2,6,6,1,1,1],[6,6,2,2,2,1,3,3],[6,6,2,2,2,1,3,3],[6,4,4,5,5,1,3,3],[6,6,5,5,5,5,5,3],[6,6,5,5,5,5,5,3],[6,6,5,5,7,7,7,3]],"solution":[[0,7],[1,5],[2,2],[3,6],[4,1],[5,3],[6,0],[7,4]],"difficulty":{"steps":16,"directSteps":8,"contradictionSteps":8,"ruleSequence":["quota-fill","contradiction","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":13,"chapter":4,"name":"双星启航","seed":1312902571,"size":10,"starsPerUnit":2,"regions":[[4,4,4,4,4,4,9,9,9,9],[4,4,4,4,4,4,4,9,9,9],[8,8,8,4,6,6,4,6,9,9],[8,8,8,8,8,6,6,6,9,9],[3,3,3,8,6,6,6,1,9,9],[3,3,3,2,2,1,1,1,1,1],[0,0,2,2,2,1,1,5,1,1],[0,0,0,0,2,5,5,5,5,5],[0,0,0,2,2,7,7,7,5,7],[0,0,0,2,2,7,7,7,7,7]],"solution":[[0,2],[0,6],[1,4],[1,9],[2,1],[2,7],[3,3],[3,5],[4,0],[4,7],[5,2],[5,9],[6,0],[6,4],[7,6],[7,8],[8,1],[8,3],[9,5],[9,8]],"difficulty":{"steps":27,"directSteps":11,"contradictionSteps":16,"ruleSequence":["contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","quota-fill","contradiction","quota-fill","quota-fill","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":14,"chapter":4,"name":"两两相望","seed":350741126,"size":10,"starsPerUnit":2,"regions":[[9,9,9,9,4,4,4,4,4,4],[9,9,9,4,4,4,4,4,4,4],[9,9,6,6,6,6,4,8,8,8],[9,9,6,6,6,8,8,8,8,8],[9,9,1,1,6,8,8,3,3,3],[1,1,1,1,1,2,3,3,3,3],[1,1,1,1,1,2,2,0,0,0],[5,5,5,5,5,2,2,0,0,0],[7,5,7,7,7,2,2,0,0,0],[7,7,7,7,7,2,2,0,0,0]],"solution":[[0,3],[0,7],[1,0],[1,5],[2,2],[2,8],[3,4],[3,6],[4,2],[4,9],[5,0],[5,7],[6,5],[6,9],[7,1],[7,3],[8,6],[8,8],[9,1],[9,4]],"difficulty":{"steps":28,"directSteps":10,"contradictionSteps":18,"ruleSequence":["contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","contradiction","quota-fill","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":15,"chapter":4,"name":"十域配额","seed":4138689655,"size":10,"starsPerUnit":2,"regions":[[4,4,8,8,3,3,0,0,0,0],[4,4,8,8,3,3,0,0,0,0],[4,4,8,8,3,3,0,0,0,0],[4,4,4,8,8,2,2,2,2,2],[4,4,6,8,6,2,2,2,7,2],[4,4,6,6,6,1,1,5,7,7],[9,4,6,6,1,1,1,5,5,7],[9,9,6,6,1,1,1,5,7,7],[9,9,9,9,9,1,1,5,7,7],[9,9,9,9,9,1,1,1,7,7]],"solution":[[0,4],[0,6],[1,2],[1,8],[2,0],[2,5],[3,3],[3,8],[4,1],[4,6],[5,3],[5,9],[6,0],[6,7],[7,2],[7,4],[8,7],[8,9],[9,1],[9,5]],"difficulty":{"steps":31,"directSteps":12,"contradictionSteps":19,"ruleSequence":["contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","quota-fill","quota-fill","quota-fill","contradiction","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":16,"chapter":4,"name":"双环编队","seed":4021931002,"size":10,"starsPerUnit":2,"regions":[[0,0,0,0,3,3,8,8,4,4],[0,0,0,0,3,3,8,8,4,4],[0,0,0,0,3,3,8,8,8,4],[2,2,2,0,2,8,8,4,4,4],[2,7,2,2,2,8,8,4,4,4],[7,7,5,1,1,6,6,4,4,4],[7,7,5,1,1,1,6,6,4,9],[7,7,5,1,1,1,6,6,9,9],[7,7,5,1,1,9,9,9,9,9],[7,7,5,1,1,9,9,9,9,9]],"solution":[[0,3],[0,5],[1,1],[1,7],[2,4],[2,9],[3,1],[3,6],[4,3],[4,8],[5,0],[5,6],[6,2],[6,9],[7,5],[7,7],[8,0],[8,2],[9,4],[9,8]],"difficulty":{"steps":32,"directSteps":13,"contradictionSteps":19,"ruleSequence":["contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","contradiction","quota-fill","contradiction","quota-fill","contradiction","quota-fill","quota-fill","quota-fill","contradiction","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":17,"chapter":5,"name":"反证星尘","seed":3490240280,"size":10,"starsPerUnit":2,"regions":[[7,7,7,7,7,2,2,0,0,0],[7,7,7,7,7,2,2,2,0,0],[5,5,5,5,1,2,2,0,0,0],[1,1,1,1,1,2,2,0,0,0],[1,1,1,1,1,2,2,3,3,3],[9,9,1,6,2,2,8,3,3,3],[9,9,6,6,6,8,8,8,8,8],[9,9,6,6,6,6,4,8,8,8],[9,9,9,4,4,4,4,4,4,4],[9,9,9,9,4,4,4,4,4,4]],"solution":[[0,1],[0,4],[1,6],[1,8],[2,1],[2,3],[3,5],[3,9],[4,0],[4,7],[5,2],[5,9],[6,4],[6,6],[7,2],[7,8],[8,0],[8,5],[9,3],[9,7]],"difficulty":{"steps":33,"directSteps":13,"contradictionSteps":20,"ruleSequence":["contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","quota-fill","quota-fill","contradiction","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}},{"number":18,"chapter":5,"name":"复合星链","seed":233980429,"size":10,"starsPerUnit":2,"regions":[[9,9,9,9,9,1,1,7,7,7],[9,9,9,9,9,1,1,5,7,7],[9,9,6,6,1,1,1,5,7,7],[9,4,6,1,1,1,1,5,7,7],[4,4,6,6,2,1,1,5,7,7],[4,4,6,8,2,1,2,2,2,2],[4,4,4,8,2,2,2,2,2,2],[4,4,4,8,3,3,0,2,0,0],[4,4,8,8,8,3,0,0,0,0],[4,4,8,8,3,3,0,0,0,0]],"solution":[[0,1],[0,5],[1,7],[1,9],[2,2],[2,4],[3,0],[3,7],[4,3],[4,9],[5,1],[5,6],[6,3],[6,8],[7,0],[7,5],[8,2],[8,8],[9,4],[9,6]],"difficulty":{"steps":33,"directSteps":12,"contradictionSteps":21,"ruleSequence":["contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","quota-fill","contradiction","contradiction","quota-fill","contradiction","quota-fill","contradiction","quota-fill","contradiction","quota-fill","quota-fill","quota-fill"]}},{"number":19,"chapter":5,"name":"无猜巡天","seed":2999998665,"size":10,"starsPerUnit":2,"regions":[[7,5,5,1,1,9,9,9,9,9],[7,7,5,1,1,9,9,9,9,9],[7,7,5,1,1,1,6,6,9,9],[7,7,5,1,1,1,6,6,4,9],[7,7,5,1,1,6,6,6,4,4],[2,2,2,2,2,8,8,6,4,4],[2,2,2,2,3,8,8,6,4,4],[0,0,0,0,3,3,8,8,4,4],[0,0,0,0,3,3,8,8,4,4],[0,0,0,0,0,3,8,8,4,4]],"solution":[[0,4],[0,8],[1,0],[1,2],[2,5],[2,7],[3,2],[3,9],[4,0],[4,6],[5,3],[5,8],[6,1],[6,6],[7,4],[7,9],[8,1],[8,7],[9,3],[9,5]],"difficulty":{"steps":35,"directSteps":13,"contradictionSteps":22,"ruleSequence":["contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","contradiction","contradiction","quota-fill","quota-fill","contradiction","contradiction","quota-fill","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","quota-fill","contradiction","quota-fill","contradiction","quota-fill","quota-fill","quota-fill"]}},{"number":20,"chapter":5,"name":"星域大师","seed":4084806245,"size":10,"starsPerUnit":2,"regions":[[0,0,0,2,2,7,7,7,7,7],[0,0,0,2,2,7,7,7,7,7],[0,0,0,2,2,5,5,5,5,5],[0,0,0,2,2,1,1,1,1,1],[3,3,3,2,2,1,1,1,1,1],[3,3,3,8,8,6,1,1,9,9],[8,8,8,8,8,6,6,6,9,9],[8,8,8,4,6,6,6,6,9,9],[4,4,4,4,4,4,4,9,9,9],[4,4,4,4,4,4,9,9,9,9]],"solution":[[0,5],[0,8],[1,1],[1,3],[2,6],[2,8],[3,0],[3,4],[4,2],[4,9],[5,0],[5,7],[6,3],[6,5],[7,1],[7,7],[8,4],[8,9],[9,2],[9,6]],"difficulty":{"steps":38,"directSteps":14,"contradictionSteps":24,"ruleSequence":["contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","quota-fill","contradiction","quota-fill","contradiction","contradiction","quota-fill","quota-fill","contradiction","contradiction","contradiction","quota-fill","contradiction","contradiction","contradiction","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill","quota-fill"]}}];
const regionDifficulty = {
  relaxed: { hints: 4 },
  standard: { hints: 3 },
  challenging: { hints: 2 },
}[config.difficulty];
const regionSessionSchemaVersion = 3;
const regionColors = ["#f7dca5", "#bfe5d5", "#f3c4cb", "#c9d8ee", "#d9cbea", "#b9dfe4", "#efc8aa", "#cbdcaf", "#ead6a4", "#c8cedf"];
const regionRuleLabels = { "quota-fill": "配额填满", "unit-complete": "单位已满", "line-lock": "行列锁定", contradiction: "反证排除", conflict: "路径矛盾" };

let regionPuzzle = regionLevelCatalog[0];
let placedRegionStars = new Set();
let manualRegionMarks = new Set();
let autoRegionMarks = new Set();
let regionHistory = [];
let regionFuture = [];
let regionToolMode = "cycle";
let regionHints = regionDifficulty.hints;
let regionHintsUsed = 0;
let regionErrors = 0;
let regionMoves = 0;
let regionStartedAt = 0;
let regionElapsedBeforeRestore = 0;
let regionRestored = false;
let regionFocus = { row: 0, column: 0 };
let regionFlash = null;
let regionHint = null;
let regionLastConflictType = "none";
let regionLastAction = "none";
let regionUniqueSolutions = 0;

function regionKey(row, column) { return row + ":" + column; }
function currentRegionPuzzle() { return regionLevelCatalog[Math.max(0, Math.min(regionLevelCatalog.length - 1, currentCampaignLevel().number - 1))]; }
function regionTargetStars() { return regionPuzzle.size * regionPuzzle.starsPerUnit; }

const regionComboCache = new Map();
function regionRowCombos(size, starsPerUnit) {
  const cacheKey = size + ":" + starsPerUnit;
  if (regionComboCache.has(cacheKey)) return regionComboCache.get(cacheKey);
  const result = [];
  function visit(start, chosen) {
    if (chosen.length === starsPerUnit) { result.push([...chosen]); return; }
    for (let column = start; column < size; column += 1) {
      if (chosen.length && column <= chosen[chosen.length - 1] + 1) continue;
      chosen.push(column); visit(column + 2, chosen); chosen.pop();
    }
  }
  visit(0, []); regionComboCache.set(cacheKey, result); return result;
}

function solveRegionPuzzle(requiredStars = new Set(), forbiddenMarks = new Set(), limit = 2) {
  const size = regionPuzzle.size;
  const starsPerUnit = regionPuzzle.starsPerUnit;
  const solutions = [];
  const columnCounts = Array(size).fill(0);
  const regionCounts = Array(size).fill(0);
  const rows = [];
  const requiredRows = Array.from({ length: size }, () => []);
  for (const key of requiredStars) {
    const parts = key.split(":").map(Number);
    if (parts[0] < 0 || parts[1] < 0 || parts[0] >= size || parts[1] >= size) return [];
    requiredRows[parts[0]].push(parts[1]);
  }
  function search(row) {
    if (solutions.length >= limit) return;
    if (row === size) {
      if (columnCounts.every((count) => count === starsPerUnit) && regionCounts.every((count) => count === starsPerUnit)) solutions.push(rows.flatMap((columns, rowIndex) => columns.map((column) => [rowIndex, column])));
      return;
    }
    for (const columns of regionRowCombos(size, starsPerUnit)) {
      if (requiredRows[row].some((column) => !columns.includes(column))) continue;
      if (columns.some((column) => forbiddenMarks.has(regionKey(row, column)))) continue;
      if (columns.some((column) => columnCounts[column] >= starsPerUnit || regionCounts[regionPuzzle.regions[row][column]] >= starsPerUnit)) continue;
      if (row > 0 && columns.some((column) => rows[row - 1].some((previous) => Math.abs(column - previous) <= 1))) continue;
      rows[row] = columns;
      columns.forEach((column) => { columnCounts[column] += 1; regionCounts[regionPuzzle.regions[row][column]] += 1; });
      search(row + 1);
      columns.forEach((column) => { columnCounts[column] -= 1; regionCounts[regionPuzzle.regions[row][column]] -= 1; });
    }
  }
  search(0); return solutions;
}

function countRegionSolutions(limit = 2) { return solveRegionPuzzle(new Set(), new Set(), limit).length; }
function countRegionCompletions(stars = placedRegionStars, marks = new Set([...manualRegionMarks, ...autoRegionMarks]), limit = 1) { return solveRegionPuzzle(stars, marks, limit).length; }

function regionCellsForUnit(kind, id) {
  const cells = [];
  for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
    if ((kind === "row" && row === id) || (kind === "column" && column === id) || (kind === "region" && regionPuzzle.regions[row][column] === id)) cells.push([row, column]);
  }
  return cells;
}
function regionStarsInUnit(kind, id) { return regionCellsForUnit(kind, id).filter(([row, column]) => placedRegionStars.has(regionKey(row, column))).length; }
function regionCandidateCells(kind, id) {
  return regionCellsForUnit(kind, id).filter(([row, column]) => {
    const key = regionKey(row, column);
    return !placedRegionStars.has(key) && !manualRegionMarks.has(key) && !autoRegionMarks.has(key);
  });
}

function allRegionsConnected() {
  for (let id = 0; id < regionPuzzle.size; id += 1) {
    const cells = regionCellsForUnit("region", id);
    if (!cells.length) return false;
    const available = new Set(cells.map(([row, column]) => regionKey(row, column)));
    const seen = new Set([regionKey(cells[0][0], cells[0][1])]);
    const queue = [cells[0]];
    for (let index = 0; index < queue.length; index += 1) {
      const [row, column] = queue[index];
      for (const [rowDelta, columnDelta] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const next = [row + rowDelta, column + columnDelta];
        const key = regionKey(next[0], next[1]);
        if (available.has(key) && !seen.has(key)) { seen.add(key); queue.push(next); }
      }
    }
    if (seen.size !== cells.length) return false;
  }
  return true;
}

function recomputeAutoMarks() {
  autoRegionMarks = new Set();
  for (const key of placedRegionStars) {
    const [row, column] = key.split(":").map(Number);
    const regionId = regionPuzzle.regions[row][column];
    for (let index = 0; index < regionPuzzle.size; index += 1) { autoRegionMarks.add(regionKey(row, index)); autoRegionMarks.add(regionKey(index, column)); }
    for (let targetRow = 0; targetRow < regionPuzzle.size; targetRow += 1) for (let targetColumn = 0; targetColumn < regionPuzzle.size; targetColumn += 1) {
      if (regionPuzzle.regions[targetRow][targetColumn] === regionId || (Math.abs(targetRow - row) <= 1 && Math.abs(targetColumn - column) <= 1)) autoRegionMarks.add(regionKey(targetRow, targetColumn));
    }
  }
  for (const key of placedRegionStars) autoRegionMarks.delete(key);
  for (const key of manualRegionMarks) autoRegionMarks.delete(key);
}

function regionElapsedSeconds() { return Math.max(0, Math.round(regionElapsedBeforeRestore + (running && regionStartedAt ? (performance.now() - regionStartedAt) / 1000 : 0))); }
function regionSnapshot() { return { stars: [...placedRegionStars], marks: [...manualRegionMarks], moves: regionMoves, errors: regionErrors, hints: regionHints, hintsUsed: regionHintsUsed, elapsed: regionElapsedSeconds() }; }
function restoreRegionSnapshot(snapshot) {
  placedRegionStars = new Set(snapshot.stars); manualRegionMarks = new Set(snapshot.marks);
  regionMoves = snapshot.moves; regionErrors = snapshot.errors; regionHints = snapshot.hints; regionHintsUsed = snapshot.hintsUsed;
  regionElapsedBeforeRestore = snapshot.elapsed; regionStartedAt = performance.now(); recomputeAutoMarks();
}
function regionSessionKey() { return "forge-region-v3:" + config.campaignStorageKey + ":" + currentCampaignLevel().number; }
function persistRegionSession() {
  if (!running) return;
  try { safeStorage.setItem(regionSessionKey(), JSON.stringify({ schemaVersion: regionSessionSchemaVersion, level: currentCampaignLevel().number, signature: regionPuzzle.regions.flat().join(""), ...regionSnapshot(), history: regionHistory.slice(-40), future: regionFuture.slice(-40), updatedAt: new Date().toISOString() })); } catch {}
}
function validRegionKeys(values) {
  return Array.isArray(values) && values.every((value) => {
    const parts = String(value).split(":").map(Number);
    return parts.length === 2 && parts.every(Number.isInteger) && parts[0] >= 0 && parts[1] >= 0 && parts[0] < regionPuzzle.size && parts[1] < regionPuzzle.size;
  });
}
function validRegionStarSet(stars) {
  const rowCounts = Array(regionPuzzle.size).fill(0);
  const columnCounts = Array(regionPuzzle.size).fill(0);
  const regionCounts = Array(regionPuzzle.size).fill(0);
  const coordinates = [...stars].map((key) => key.split(":").map(Number));
  for (const [row, column] of coordinates) {
    rowCounts[row] += 1; columnCounts[column] += 1; regionCounts[regionPuzzle.regions[row][column]] += 1;
  }
  if ([...rowCounts, ...columnCounts, ...regionCounts].some((count) => count > regionPuzzle.starsPerUnit)) return false;
  return coordinates.every(([row, column], index) => coordinates.slice(index + 1).every(([otherRow, otherColumn]) => Math.abs(row - otherRow) > 1 || Math.abs(column - otherColumn) > 1));
}
function restoreRegionSession() {
  regionRestored = false;
  try {
    const saved = JSON.parse(safeStorage.getItem(regionSessionKey()) || "null");
    if (!saved || saved.schemaVersion !== regionSessionSchemaVersion || saved.level !== currentCampaignLevel().number || saved.signature !== regionPuzzle.regions.flat().join("")) return;
    if (!validRegionKeys(saved.stars) || !validRegionKeys(saved.marks) || saved.stars.some((key) => saved.marks.includes(key))) return;
    const candidateStars = new Set(saved.stars); const candidateMarks = new Set(saved.marks);
    if (candidateStars.size >= regionTargetStars() || !validRegionStarSet(candidateStars)) return;
    placedRegionStars = candidateStars; manualRegionMarks = candidateMarks;
    regionMoves = Math.max(0, Number(saved.moves) || 0); regionErrors = Math.max(0, Number(saved.errors) || 0);
    regionHints = Math.max(0, Number(saved.hints) || 0); regionHintsUsed = Math.max(0, Number(saved.hintsUsed) || 0);
    regionElapsedBeforeRestore = Math.max(0, Number(saved.elapsed) || 0);
    regionHistory = Array.isArray(saved.history) ? saved.history.filter((entry) => validRegionKeys(entry?.stars) && validRegionKeys(entry?.marks)).slice(-40) : [];
    regionFuture = Array.isArray(saved.future) ? saved.future.filter((entry) => validRegionKeys(entry?.stars) && validRegionKeys(entry?.marks)).slice(-40) : [];
    recomputeAutoMarks(); regionRestored = true;
  } catch {}
}
function pushRegionHistory() { regionHistory.push(regionSnapshot()); if (regionHistory.length > 40) regionHistory.shift(); regionFuture = []; }

function directRegionConflict(row, column) {
  const regionId = regionPuzzle.regions[row][column];
  if (regionStarsInUnit("row", row) >= regionPuzzle.starsPerUnit) return "这一行的星数已经满足";
  if (regionStarsInUnit("column", column) >= regionPuzzle.starsPerUnit) return "这一列的星数已经满足";
  if (regionStarsInUnit("region", regionId) >= regionPuzzle.starsPerUnit) return "这个色区的星数已经满足";
  for (const key of placedRegionStars) {
    const [starRow, starColumn] = key.split(":").map(Number);
    if (Math.abs(starRow - row) <= 1 && Math.abs(starColumn - column) <= 1) return "星星不能横向、纵向或对角相邻";
  }
  return "";
}

function regionLayout() {
  const boardSize = Math.min(660, gameSceneHeight() * .62);
  return { boardSize, cell: boardSize / regionPuzzle.size, x: (720 - boardSize) / 2, y: 196 };
}
function drawRegionCompletionTicks(layout) {
  for (let index = 0; index < regionPuzzle.size; index += 1) {
    ctx.fillStyle = regionStarsInUnit("row", index) === regionPuzzle.starsPerUnit ? "#2f9b7f" : "rgba(72,62,78,.14)";
    ctx.fillRect(layout.x - 12, layout.y + index * layout.cell + 5, 5, layout.cell - 10);
    ctx.fillStyle = regionStarsInUnit("column", index) === regionPuzzle.starsPerUnit ? "#2f9b7f" : "rgba(72,62,78,.14)";
    ctx.fillRect(layout.x + index * layout.cell + 5, layout.y - 12, layout.cell - 10, 5);
  }
}

function drawRegionLogic() {
  clearCanvas(); ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = regionLayout(); const target = regionTargetStars();
  drawPlayfield(42, 52, 636, 118, { radius: 25, alpha: .97, fill: "rgba(255,252,249,.95)", stroke: "rgba(83,67,89,.18)", lineWidth: 2 });
  ctx.textAlign = "left"; ctx.fillStyle = "#4d3e52"; ctx.font = "800 29px Inter, sans-serif"; ctx.fillText(regionPuzzle.name, 70, 101);
  ctx.fillStyle = "rgba(77,62,82,.72)"; ctx.font = "650 18px Inter, sans-serif"; ctx.fillText(regionPuzzle.size + "×" + regionPuzzle.size + " · 每行 / 列 / 区 " + regionPuzzle.starsPerUnit + " 星", 70, 137);
  ctx.textAlign = "right"; ctx.fillStyle = "#239783"; ctx.font = "800 31px ui-monospace, Consolas, monospace"; ctx.fillText(placedRegionStars.size + " / " + target, 650, 111);
  ctx.fillStyle = "rgba(77,62,82,.64)"; ctx.font = "650 16px Inter, sans-serif"; ctx.fillText("提示 " + regionHints + " · " + regionElapsedSeconds() + "秒", 650, 141);
  drawPlayfield(layout.x - 20, layout.y - 20, layout.boardSize + 40, layout.boardSize + 40, { radius: 30, alpha: .96, fill: "rgba(255,252,249,.92)", stroke: "rgba(74,64,80,.22)", lineWidth: 2 });
  drawRegionCompletionTicks(layout);
  for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
    const x = layout.x + column * layout.cell; const y = layout.y + row * layout.cell; const key = regionKey(row, column); const regionId = regionPuzzle.regions[row][column];
    ctx.fillStyle = regionColors[regionId % regionColors.length]; ctx.globalAlpha = .78; ctx.fillRect(x, y, layout.cell, layout.cell); ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(55,51,61,.11)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, layout.cell, layout.cell);
    ctx.strokeStyle = "rgba(45,42,50,.78)"; ctx.lineWidth = regionPuzzle.size >= 10 ? 3 : 4;
    if (row === 0 || regionPuzzle.regions[row - 1][column] !== regionId) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + layout.cell, y); ctx.stroke(); }
    if (column === 0 || regionPuzzle.regions[row][column - 1] !== regionId) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + layout.cell); ctx.stroke(); }
    if (row === regionPuzzle.size - 1 || regionPuzzle.regions[row + 1][column] !== regionId) { ctx.beginPath(); ctx.moveTo(x, y + layout.cell); ctx.lineTo(x + layout.cell, y + layout.cell); ctx.stroke(); }
    if (column === regionPuzzle.size - 1 || regionPuzzle.regions[row][column + 1] !== regionId) { ctx.beginPath(); ctx.moveTo(x + layout.cell, y); ctx.lineTo(x + layout.cell, y + layout.cell); ctx.stroke(); }
    if (autoRegionMarks.has(key)) { ctx.fillStyle = "rgba(63,65,73,.3)"; ctx.beginPath(); ctx.arc(x + layout.cell / 2, y + layout.cell / 2, Math.max(2.5, layout.cell * .047), 0, Math.PI * 2); ctx.fill(); }
    if (manualRegionMarks.has(key)) drawBitmapSprite(5, x + layout.cell * .3, y + layout.cell * .3, layout.cell * .4, layout.cell * .4, { fallback: "#685d70", alpha: .9, scale: 1.02 });
    if (placedRegionStars.has(key)) drawBitmapSprite(regionId % 5, x + layout.cell * .1, y + layout.cell * .1, layout.cell * .8, layout.cell * .8, { fallback: "#f1ac42", scale: 1.09 });
    if (regionFocus.row === row && regionFocus.column === column) { ctx.strokeStyle = "rgba(214,151,51,.95)"; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y + 4, layout.cell - 8, layout.cell - 8); }
  }
  const now = performance.now();
  const activeCue = regionHint && now < regionHint.until ? regionHint : regionFlash && now < regionFlash.until ? regionFlash : null;
  if (activeCue) for (const [row, column] of activeCue.cells) {
    const x = layout.x + column * layout.cell; const y = layout.y + row * layout.cell;
    ctx.save(); ctx.strokeStyle = activeCue.type === "error" ? "#df5d62" : "#d39a30"; ctx.lineWidth = 6; ctx.shadowColor = activeCue.type === "error" ? "rgba(223,93,98,.45)" : "rgba(211,154,48,.45)"; ctx.shadowBlur = 15;
    ctx.strokeRect(x + 5, y + 5, layout.cell - 10, layout.cell - 10);
    if (activeCue.type === "error") { ctx.beginPath(); ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + layout.cell - 12, y + layout.cell - 12); ctx.stroke(); }
    ctx.restore();
  }
  const noteY = layout.y + layout.boardSize + 48;
  ctx.textAlign = "center"; ctx.fillStyle = "#4d3e52"; ctx.font = "750 21px Inter, sans-serif";
  ctx.fillText(regionHint && now < regionHint.until ? regionRuleLabels[regionHint.rule] : regionToolMode === "cycle" ? "点按循环：星星 → 排除 → 清空" : regionToolMode === "star" ? "当前工具：放置星星" : "当前工具：标记排除", 360, noteY);
  ctx.fillStyle = "rgba(77,62,82,.68)"; ctx.font = "560 17px Inter, sans-serif";
  const detail = regionHint && now < regionHint.until ? regionHint.text : regionPuzzle.starsPerUnit === 2 ? "双星关：每个单位都必须恰好放置两颗星" : "星星不能横向、纵向或对角相邻";
  ctx.fillText(detail, 360, noteY + 34); ctx.restore(); finishCanvasStyle();
}

function syncRegionControls() {
  document.body.dataset.regionTool = regionToolMode;
  document.querySelectorAll("[data-control=cycle],[data-control=star],[data-control=mark]").forEach((button) => {
    const active = button.dataset.control === regionToolMode; button.classList.toggle("is-selected", active); button.setAttribute("aria-pressed", String(active));
  });
  const undo = document.querySelector("[data-control=undo]"); const redo = document.querySelector("[data-control=redo]"); const hint = document.querySelector("[data-control=hint]");
  if (undo) undo.disabled = !running || !regionHistory.length;
  if (redo) redo.disabled = !running || !regionFuture.length;
  if (hint) { hint.disabled = !running || regionHints <= 0; hint.textContent = "推理 " + regionHints; }
}
function refreshRegionUi(message) { setMetric(placedRegionStars.size + " / " + regionTargetStars()); if (message) setStatus(message); syncRegionControls(); drawRegionLogic(); }
function setRegionCue(type, cells, duration = 1300) { regionFlash = { type, cells, until: performance.now() + duration }; drawRegionLogic(); setTimeout(() => drawRegionLogic(), duration + 20); }

function checkRegionCompletion() {
  if (placedRegionStars.size !== regionTargetStars() || countRegionCompletions(placedRegionStars, new Set([...manualRegionMarks, ...autoRegionMarks]), 1) !== 1) return false;
  const elapsed = regionElapsedSeconds(); running = false;
  try { safeStorage.removeItem(regionSessionKey()); } catch {}
  drawRegionLogic(); playSound("win");
  showResult(true, "星域成立", regionPuzzle.name + " · " + regionPuzzle.size + "×" + regionPuzzle.size + " · " + elapsed + " 秒 · 提示 " + regionHintsUsed + " 次 · 错误 " + regionErrors + " 次。 ");
  return true;
}

function placeRegionStar(row, column) {
  const key = regionKey(row, column);
  if (placedRegionStars.has(key)) {
    pushRegionHistory(); placedRegionStars.delete(key); regionMoves += 1; recomputeAutoMarks(); persistRegionSession(); refreshRegionUi("已移除星星；相关格重新开放。 "); return true;
  }
  const conflict = directRegionConflict(row, column);
  if (conflict) {
    regionErrors += 1; regionLastConflictType = "direct-rule"; regionLastAction = "rejected-star"; playSound("fail"); setStatus(conflict + "。 "); setRegionCue("error", [[row, column]], 900); return false;
  }
  pushRegionHistory(); placedRegionStars.add(key); manualRegionMarks.delete(key); regionMoves += 1; regionLastAction = "star"; recomputeAutoMarks(); playSound("move"); persistRegionSession();
  if (!checkRegionCompletion()) refreshRegionUi("星星已放置；直接确定的排除格已自动标记。 "); return true;
}
function toggleRegionMark(row, column) {
  const key = regionKey(row, column); if (placedRegionStars.has(key)) return false;
  pushRegionHistory(); if (manualRegionMarks.has(key)) manualRegionMarks.delete(key); else manualRegionMarks.add(key);
  regionMoves += 1; regionLastAction = manualRegionMarks.has(key) ? "mark" : "clear-mark"; recomputeAutoMarks(); playSound("ui"); persistRegionSession();
  refreshRegionUi(manualRegionMarks.has(key) ? "已标记为排除格。 " : "已清除手动排除。 "); return true;
}
function cycleRegionCell(row, column) {
  const key = regionKey(row, column);
  if (placedRegionStars.has(key)) {
    pushRegionHistory(); placedRegionStars.delete(key); manualRegionMarks.add(key); regionMoves += 1; regionLastAction = "star-to-mark"; recomputeAutoMarks(); playSound("ui"); persistRegionSession(); refreshRegionUi("星星已改为手动排除。 "); return true;
  }
  if (manualRegionMarks.has(key)) return toggleRegionMark(row, column);
  return placeRegionStar(row, column);
}
function actOnRegionCell(row, column) { regionFocus = { row, column }; return regionToolMode === "star" ? placeRegionStar(row, column) : regionToolMode === "mark" ? toggleRegionMark(row, column) : cycleRegionCell(row, column); }

function undoRegionMove() {
  const snapshot = regionHistory.pop(); if (!snapshot) return false;
  regionFuture.push(regionSnapshot()); restoreRegionSnapshot(snapshot); regionLastAction = "undo"; playSound("ui"); persistRegionSession(); refreshRegionUi("已撤销上一步。 "); return true;
}
function redoRegionMove() {
  const snapshot = regionFuture.pop(); if (!snapshot) return false;
  regionHistory.push(regionSnapshot()); restoreRegionSnapshot(snapshot); regionLastAction = "redo"; playSound("ui"); persistRegionSession(); refreshRegionUi("已恢复下一步。 "); return true;
}

function nextRegionDeduction() {
  const combinedMarks = new Set([...manualRegionMarks, ...autoRegionMarks]);
  if (solveRegionPuzzle(placedRegionStars, combinedMarks, 1).length === 0) {
    const lastStar = [...placedRegionStars].at(-1); const cells = lastStar ? [lastStar.split(":").map(Number)] : [];
    return { rule: "conflict", action: "undo", cells, text: "当前落子使剩余题面无解；请撤销最近一次星星。" };
  }
  for (const kind of ["row", "column", "region"]) for (let id = 0; id < regionPuzzle.size; id += 1) {
    const remaining = regionPuzzle.starsPerUnit - regionStarsInUnit(kind, id); const candidates = regionCandidateCells(kind, id);
    if (remaining > 0 && candidates.length === remaining) {
      const unit = kind === "row" ? "这一行" : kind === "column" ? "这一列" : "这个色区";
      return { rule: "quota-fill", action: "star", cells: candidates, text: unit + "剩余候选数等于缺少星数。" };
    }
  }
  for (let regionId = 0; regionId < regionPuzzle.size; regionId += 1) {
    const candidates = regionCandidateCells("region", regionId); if (candidates.length < 2) continue;
    const rows = new Set(candidates.map(([row]) => row)); const columns = new Set(candidates.map(([, column]) => column));
    if (rows.size === 1) {
      const row = [...rows][0]; const outside = regionCandidateCells("row", row).filter(([candidateRow, candidateColumn]) => regionPuzzle.regions[candidateRow][candidateColumn] !== regionId);
      if (outside.length) return { rule: "line-lock", action: "mark", cells: outside, text: "该色区的候选都在同一行，行内区外格可排除。" };
    }
    if (columns.size === 1) {
      const column = [...columns][0]; const outside = regionCandidateCells("column", column).filter(([candidateRow, candidateColumn]) => regionPuzzle.regions[candidateRow][candidateColumn] !== regionId);
      if (outside.length) return { rule: "line-lock", action: "mark", cells: outside, text: "该色区的候选都在同一列，列内区外格可排除。" };
    }
  }
  for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
    const key = regionKey(row, column); if (placedRegionStars.has(key) || manualRegionMarks.has(key) || autoRegionMarks.has(key)) continue;
    const assumed = new Set(placedRegionStars); assumed.add(key);
    if (solveRegionPuzzle(assumed, combinedMarks, 1).length === 0) return { rule: "contradiction", action: "mark", cells: [[row, column]], text: "假设这里放星会使题面无解，因此可排除。" };
  }
  return null;
}
function requestRegionHint() {
  if (regionHints <= 0) { setStatus("本关推理提示已用完；撤销不会返还提示。 "); return false; }
  const deduction = nextRegionDeduction(); if (!deduction) { setStatus("当前没有可执行提示；请检查手动标记。 "); return false; }
  regionHints -= 1; regionHintsUsed += 1;
  regionHint = { ...deduction, type: deduction.rule === "conflict" ? "error" : "hint", until: performance.now() + 2600 };
  regionLastConflictType = deduction.rule === "conflict" ? "logical-dead-end" : regionLastConflictType; regionLastAction = "hint-" + deduction.rule;
  playSound("ui"); persistRegionSession(); refreshRegionUi(regionRuleLabels[deduction.rule] + "：" + deduction.text + " 提示只解释一步，不会替你落子。 "); setTimeout(() => drawRegionLogic(), 2620); return true;
}

function initializeRegionPuzzle() {
  regionPuzzle = currentRegionPuzzle(); placedRegionStars = new Set(); manualRegionMarks = new Set(); autoRegionMarks = new Set(); regionHistory = []; regionFuture = [];
  regionHints = Math.max(1, regionDifficulty.hints - Math.floor((regionPuzzle.chapter - 1) / 2)); regionHintsUsed = 0; regionErrors = 0; regionMoves = 0;
  regionElapsedBeforeRestore = 0; regionRestored = false; regionFocus = { row: 0, column: 0 }; regionFlash = null; regionHint = null; regionLastConflictType = "none"; regionLastAction = "none";
  regionUniqueSolutions = countRegionSolutions(2); recomputeAutoMarks();
}
function startGame() {
  initializeRegionPuzzle(); restoreRegionSession(); running = true; regionStartedAt = performance.now(); hideOverlay(); startAmbient();
  canvas.setAttribute("aria-label", "星灵巡格 " + regionPuzzle.size + " 乘 " + regionPuzzle.size + " 棋盘，每行每列每区 " + regionPuzzle.starsPerUnit + " 颗星");
  refreshRegionUi((regionRestored ? "已恢复进度 · " : "") + "第 " + currentCampaignLevel().number + " 关 · " + regionPuzzle.name + " · 严格唯一解 · " + regionPuzzle.size + "×" + regionPuzzle.size + " · 每单位 " + regionPuzzle.starsPerUnit + " 星。 ");
}
function handleControl(value) {
  if (["cycle", "star", "mark"].includes(value)) { regionToolMode = value; refreshRegionUi(value === "cycle" ? "单击依次切换星星、排除和清空。 " : value === "star" ? "已切换为星星工具。 " : "已切换为排除工具。 "); return true; }
  if (value === "undo") return undoRegionMove(); if (value === "redo") return redoRegionMove(); if (value === "hint") return requestRegionHint(); return false;
}
function handleKey(key) {
  if (key === "ArrowUp") regionFocus.row = Math.max(0, regionFocus.row - 1);
  else if (key === "ArrowDown") regionFocus.row = Math.min(regionPuzzle.size - 1, regionFocus.row + 1);
  else if (key === "ArrowLeft") regionFocus.column = Math.max(0, regionFocus.column - 1);
  else if (key === "ArrowRight") regionFocus.column = Math.min(regionPuzzle.size - 1, regionFocus.column + 1);
  else if (key === " " || key === "Enter") return actOnRegionCell(regionFocus.row, regionFocus.column);
  else if (key.toLowerCase() === "s") return placeRegionStar(regionFocus.row, regionFocus.column);
  else if (key.toLowerCase() === "x") return toggleRegionMark(regionFocus.row, regionFocus.column);
  else if (key.toLowerCase() === "z") return undoRegionMove();
  else if (key.toLowerCase() === "y") return redoRegionMove();
  else if (key.toLowerCase() === "h") return requestRegionHint();
  else return false;
  drawRegionLogic(); return true;
}

canvas.addEventListener("pointerup", (event) => {
  if (!running) return; const point = eventScenePoint(event); const layout = regionLayout();
  if (point.y < layout.y || point.y >= layout.y + layout.boardSize || point.x < layout.x || point.x >= layout.x + layout.boardSize) return;
  actOnRegionCell(Math.floor((point.y - layout.y) / layout.cell), Math.floor((point.x - layout.x) / layout.cell));
});

initializeRegionPuzzle();
onCampaignLevelChanged = () => { if (!running) { initializeRegionPuzzle(); drawRegionLogic(); } };
runtimeDebugActions = {
  cycleFirstCell: () => actOnRegionCell(0, 0),
  undoRegion: () => undoRegionMove(),
  redoRegion: () => redoRegionMove(),
  hintRegion: () => requestRegionHint(),
  probeDirectConflict: () => {
    const first = regionPuzzle.solution[0]; placeRegionStar(first[0], first[1]);
    const adjacentColumn = first[1] + 1 < regionPuzzle.size ? first[1] + 1 : first[1] - 1;
    if (adjacentColumn >= 0) { placeRegionStar(first[0], adjacentColumn); return true; }
    return false;
  },
  probeDeadEnd: () => {
    const solutionKeys = new Set(regionPuzzle.solution.map(([row, column]) => regionKey(row, column)));
    for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
      const key = regionKey(row, column); if (solutionKeys.has(key) || directRegionConflict(row, column)) continue;
      const assumed = new Set(placedRegionStars); assumed.add(key);
      if (solveRegionPuzzle(assumed, new Set([...manualRegionMarks, ...autoRegionMarks]), 1).length === 0) { placeRegionStar(row, column); requestRegionHint(); return true; }
    }
    return false;
  },
  solveRegion: () => { placedRegionStars = new Set(regionPuzzle.solution.map(([row, column]) => regionKey(row, column))); manualRegionMarks = new Set(); recomputeAutoMarks(); drawRegionLogic(); checkRegionCompletion(); },
  failRegion: () => { running = false; showResult(false, "推理中断", "调试失败分支已验证；标准游戏不会因错误次数耗尽而强制结束。 "); },
};
runtimeDebugState = () => ({
  level: currentCampaignLevel().number, chapter: regionPuzzle.chapter, name: regionPuzzle.name, size: regionPuzzle.size, starsPerUnit: regionPuzzle.starsPerUnit,
  targetStars: regionTargetStars(), stars: placedRegionStars.size, manualMarks: manualRegionMarks.size, autoMarks: autoRegionMarks.size,
  hints: regionHints, hintsUsed: regionHintsUsed, errors: regionErrors, moves: regionMoves, uniqueSolutions: regionUniqueSolutions, regionsConnected: allRegionsConnected(),
  layoutSignature: regionPuzzle.regions.flat().join(""), campaignSignatureCount: new Set(regionLevelCatalog.map((level) => level.regions.flat().join(""))).size,
  catalogSize: regionLevelCatalog.length, logicTraceSteps: regionPuzzle.difficulty.steps, contradictionSteps: regionPuzzle.difficulty.contradictionSteps,
  logicSolvable: regionPuzzle.difficulty.steps > 0, hintRule: regionHint?.rule || null, hintAction: regionHint?.action || null, hintUsesSolution: false,
  lastConflictType: regionLastConflictType, lastAction: regionLastAction, historyDepth: regionHistory.length, futureDepth: regionFuture.length,
  sessionSchemaVersion: regionSessionSchemaVersion, restored: regionRestored, toolMode: regionToolMode, boardAreaVersion: 2,
});
drawRegionLogic();


redrawGameArt = () => { drawRegionLogic(); };
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
  const identity = {"projectId":"6d6f62aa-ed8c-478f-8260-c60c562c0081","versionId":"640b21a4-c634-4928-b7f5-bc751a2f0e36"};
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