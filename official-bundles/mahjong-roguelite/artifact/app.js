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
const config = {"title":"月港雀旅","template":"mahjong-roguelite","difficulty":"standard","visualStyle":"cute","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"board","inputModes":["pointer","keyboard","touch-buttons"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":[],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"mahjong-roguelite-01","label":"01 · 认识规则 · 开放边缘","tier":1,"tierLabel":"认识规则","variant":0,"seed":2077210163,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"开放边缘","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":2,"id":"mahjong-roguelite-02","label":"02 · 认识规则 · 封锁层","tier":1,"tierLabel":"认识规则","variant":1,"seed":3650501856,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"封锁层","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":3,"id":"mahjong-roguelite-03","label":"03 · 认识规则 · 潮汐限制","tier":1,"tierLabel":"认识规则","variant":2,"seed":1063166609,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"潮汐限制","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":4,"id":"mahjong-roguelite-04","label":"04 · 认识规则 · 遗物组合","tier":1,"tierLabel":"认识规则","variant":3,"seed":2636458310,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"遗物组合","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"解锁稳定节奏"},{"number":5,"id":"mahjong-roguelite-05","label":"05 · 稳定节奏 · 开放边缘","tier":2,"tierLabel":"稳定节奏","variant":0,"seed":4075663351,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"开放边缘","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":6,"id":"mahjong-roguelite-06","label":"06 · 稳定节奏 · 封锁层","tier":2,"tierLabel":"稳定节奏","variant":1,"seed":1353979300,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"封锁层","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":7,"id":"mahjong-roguelite-07","label":"07 · 稳定节奏 · 潮汐限制","tier":2,"tierLabel":"稳定节奏","variant":2,"seed":3061619797,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"潮汐限制","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":8,"id":"mahjong-roguelite-08","label":"08 · 稳定节奏 · 遗物组合","tier":2,"tierLabel":"稳定节奏","variant":3,"seed":339935754,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"遗物组合","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"解锁加入变化"},{"number":9,"id":"mahjong-roguelite-09","label":"09 · 加入变化 · 开放边缘","tier":3,"tierLabel":"加入变化","variant":0,"seed":1779140795,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"开放边缘","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":10,"id":"mahjong-roguelite-10","label":"10 · 加入变化 · 封锁层","tier":3,"tierLabel":"加入变化","variant":1,"seed":3419541352,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"封锁层","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":11,"id":"mahjong-roguelite-11","label":"11 · 加入变化 · 潮汐限制","tier":3,"tierLabel":"加入变化","variant":2,"seed":698021145,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"潮汐限制","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":12,"id":"mahjong-roguelite-12","label":"12 · 加入变化 · 遗物组合","tier":3,"tierLabel":"加入变化","variant":3,"seed":2405530574,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"遗物组合","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"解锁组合压力"},{"number":13,"id":"mahjong-roguelite-13","label":"13 · 组合压力 · 开放边缘","tier":4,"tierLabel":"组合压力","variant":0,"seed":3978945151,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"开放边缘","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":14,"id":"mahjong-roguelite-14","label":"14 · 组合压力 · 封锁层","tier":4,"tierLabel":"组合压力","variant":1,"seed":1123051564,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"封锁层","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":15,"id":"mahjong-roguelite-15","label":"15 · 组合压力 · 潮汐限制","tier":4,"tierLabel":"组合压力","variant":2,"seed":2696474333,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"潮汐限制","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":16,"id":"mahjong-roguelite-16","label":"16 · 组合压力 · 遗物组合","tier":4,"tierLabel":"组合压力","variant":3,"seed":110056594,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"遗物组合","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"解锁最终掌握"},{"number":17,"id":"mahjong-roguelite-17","label":"17 · 最终掌握 · 开放边缘","tier":5,"tierLabel":"最终掌握","variant":0,"seed":1683479363,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"开放边缘","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":18,"id":"mahjong-roguelite-18","label":"18 · 最终掌握 · 封锁层","tier":5,"tierLabel":"最终掌握","variant":1,"seed":4196286960,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"封锁层","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":19,"id":"mahjong-roguelite-19","label":"19 · 最终掌握 · 潮汐限制","tier":5,"tierLabel":"最终掌握","variant":2,"seed":1541851041,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"潮汐限制","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":20,"id":"mahjong-roguelite-20","label":"20 · 最终掌握 · 遗物组合","tier":5,"tierLabel":"最终掌握","variant":3,"seed":3115142742,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"遗物组合","mission":"管理开放边缘、潮汐资源和遗物构筑，打通三段航线。","masteryRules":[{"id":"efficiency","label":"完成时至少保留 1 次洗牌","metric":"shuffles","comparison":"gte","target":1},{"id":"control","label":"形成至少 2 件遗物的构筑","metric":"relicCount","comparison":"gte","target":2}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:920238d1-459e-40a6-8f16-fa8599e6db67:e26726e2-2078-4fe1-b539-126d9f2c2217","masteryStorageKey":"forge-mastery:920238d1-459e-40a6-8f16-fa8599e6db67:e26726e2-2078-4fe1-b539-126d9f2c2217"};
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


const mahjongDifficulty = {
  relaxed: { hints: 3, shuffles: 3 },
  standard: { hints: 2, shuffles: 2 },
  challenging: { hints: 1, shuffles: 1 },
}[config.difficulty];

const mahjongVariantColors = ["#ef6b55", "#168d8a", "#e1a72f", "#274b73"];
const mahjongRelics = [
  { id: "compass", name: "月汐罗盘", detail: "立即获得 2 次提示", rarity: "稀有", scope: "整段航线", sprite: 6 },
  { id: "thread", name: "琥珀丝线", detail: "每层使配对得分 +100%", rarity: "史诗", scope: "本次旅程", sprite: 7 },
  { id: "charm", name: "潮铃护符", detail: "立即获得 1 次洗牌", rarity: "稀有", scope: "整段航线", sprite: 8 },
  { id: "lantern", name: "引潮灯", detail: "提前解除本段封锁层", rarity: "史诗", scope: "当前航段", sprite: 5 },
  { id: "pearl", name: "雾港珠", detail: "立即获得 120 分", rarity: "普通", scope: "立即生效", sprite: 4 },
  { id: "anchor", name: "银湾锚", detail: "潮汐计时增加 30 秒", rarity: "稀有", scope: "潮汐航段", sprite: 3 },
  { id: "atlas", name: "群岛图", detail: "每段开始额外获得 1 次提示", rarity: "史诗", scope: "后续航段", sprite: 2 },
  { id: "mirror", name: "月镜", detail: "下一次配对得分翻倍", rarity: "稀有", scope: "一次配对", sprite: 1 },
  { id: "shell", name: "回声贝", detail: "撤销后保留连击", rarity: "普通", scope: "本次旅程", sprite: 0 },
  { id: "reef", name: "珊瑚结", detail: "配错时不清空连击", rarity: "普通", scope: "本次旅程", sprite: 8 },
  { id: "sail", name: "晨风帆", detail: "每段开局获得 60 分", rarity: "普通", scope: "后续航段", sprite: 7 },
  { id: "crown", name: "潮王冠", detail: "高风险：计时 -15 秒，得分 +150%", rarity: "传说", scope: "本次旅程", sprite: 6 },
];
const mahjongRoutes = [
  { id: "garden", name: "雾灯花园", tag: "休整", detail: "本段获得 1 次提示，牌阵保持标准规模", tileDelta: 0, scoreMultiplier: 1, timeDelta: 0, sprite: 5 },
  { id: "market", name: "珊瑚夜市", tag: "赏金", detail: "开局获得 100 分，但牌阵增加 4 张", tileDelta: 4, scoreMultiplier: 1.1, timeDelta: 0, sprite: 4 },
  { id: "archive", name: "沉月档案馆", tag: "构筑", detail: "遗物协同额外增幅，牌阵增加 4 张", tileDelta: 4, scoreMultiplier: 1.15, timeDelta: 0, sprite: 2 },
  { id: "tideway", name: "蓝潮捷径", tag: "限时", detail: "本段限时，得分提高 35%", tileDelta: 0, scoreMultiplier: 1.35, timeDelta: -15, sprite: 3 },
  { id: "elite", name: "镜礁禁航区", tag: "精英", detail: "更大的封锁牌阵与更短潮汐，胜利计入真结局", tileDelta: 8, scoreMultiplier: 1.65, timeDelta: -25, sprite: 8 },
];
const mahjongSynergies = [
  { id: "navigator", relics: ["compass", "atlas"], name: "星潮领航", detail: "每段额外获得 2 次提示" },
  { id: "moon-thread", relics: ["thread", "mirror"], name: "月镜织术", detail: "每段首次配对再乘 2 倍" },
  { id: "storm-crown", relics: ["anchor", "crown"], name: "风暴加冕", detail: "抵消王冠的计时惩罚" },
  { id: "echo-reef", relics: ["shell", "reef"], name: "回声礁群", detail: "撤销和配错都不会中断连击" },
];
const mahjongConflicts = [
  { id: "crown-charm", relics: ["crown", "charm"], name: "逆风税", detail: "每段洗牌次数 -1，得分再提高 25%" },
  { id: "lantern-atlas", relics: ["lantern", "atlas"], name: "光路重叠", detail: "封锁直接解除，但群岛图不再追加提示" },
];

let mahjongBoard = [];
let mahjongStage = 0;
let mahjongScore = 0;
let mahjongCombo = 0;
let mahjongHints = mahjongDifficulty.hints;
let mahjongShuffles = mahjongDifficulty.shuffles;
let mahjongSelectedId = null;
let mahjongHintIds = new Set();
let mahjongHistory = [];
let mahjongRelicStacks = new Map();
let mahjongAwaitingRelic = false;
let mahjongFeedback = null;
let mahjongRelicActivation = null;
let mahjongAnimationFrame = 0;
let mahjongHitAreas = [];
let mahjongNewlyFreeIds = new Set();
let mahjongKeyboardId = null;
let mahjongKeyboardNavigation = false;
let mahjongRelicChoices = [];
let mahjongRouteChoices = [];
let mahjongAwaitingRoute = false;
let mahjongCurrentRouteId = null;
let mahjongRouteHistory = [];
let mahjongEliteWins = 0;
let mahjongEnding = null;
let mahjongMatches = 0;
let mahjongSealedIds = new Set();
let mahjongMode = "campaign";
let mahjongRunSeed = 0;
let mahjongDeadline = 0;
let mahjongHiddenAt = 0;
let mahjongRestored = false;
const mahjongRunStorageKey = config.campaignStorageKey + ":mahjong-run-v2";
const mahjongBestStorageKey = config.campaignStorageKey + ":mahjong-best-v2";

function mahjongTileCountForLevel() {
  const counts = config.difficulty === "relaxed"
    ? [24, 28, 32, 36, 40]
    : config.difficulty === "challenging"
      ? [32, 40, 48, 56, 64]
      : [28, 32, 40, 48, 56];
  const route = currentMahjongRoute();
  return Math.min(72, counts[currentCampaignLevel().tier - 1] + mahjongStage * 4 + (route?.tileDelta || 0));
}

function mahjongHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

function readMahjongSetup() {
  const mode = document.querySelector("[data-mahjong-mode]");
  const seed = document.querySelector("[data-mahjong-seed]");
  mahjongMode = mode?.value || "campaign";
  const dateKey = new Date().toISOString().slice(0, 10);
  mahjongRunSeed = mahjongMode === "daily" ? mahjongHash("daily:" + dateKey) : mahjongMode === "seeded" ? mahjongHash(seed?.value.trim() || "MOON-PORT") : currentCampaignLevel().seed;
}

function currentMahjongRule() {
  const route = currentMahjongRoute();
  if (route?.id === "elite") return { id: "elite", label: "精英围猎", detail: "清空双重封锁的大型牌阵", timeLimit: Math.max(80, 145 - currentCampaignLevel().tier * 8) };
  if (route?.id === "tideway") return { id: "tideway", label: "蓝潮捷径", detail: "在潮汐归零前清空牌阵", timeLimit: Math.max(70, 135 - currentCampaignLevel().tier * 8) };
  if (mahjongStage === 1) return { id: "sealed", label: "封锁层", detail: "完成 2 对后解除封锁层", timeLimit: 0 };
  if (mahjongStage === 2) return { id: "tide", label: "限时潮汐", detail: "在潮汐归零前清空牌阵", timeLimit: Math.max(75, 165 - currentCampaignLevel().tier * 12) };
  return { id: "harbor", label: "开放长堤", detail: "从开放边缘建立连击", timeLimit: 0 };
}

function currentMahjongRoute() { return mahjongRoutes.find((route) => route.id === mahjongCurrentRouteId) || null; }
function activeMahjongSynergies() { return mahjongSynergies.filter((synergy) => synergy.relics.every((id) => mahjongRelicStacks.has(id))); }
function activeMahjongConflicts() { return mahjongConflicts.filter((conflict) => conflict.relics.every((id) => mahjongRelicStacks.has(id))); }
function mahjongHasSynergy(id) { return activeMahjongSynergies().some((synergy) => synergy.id === id); }
function mahjongHasConflict(id) { return activeMahjongConflicts().some((conflict) => conflict.id === id); }
function mahjongRelicById(id) { return mahjongRelics.find((relic) => relic.id === id) || null; }

function scheduleMahjongAnimation() {
  if (mahjongAnimationFrame) return;
  const tick = () => {
    mahjongAnimationFrame = 0;
    const now = performance.now();
    if (mahjongFeedback && now >= mahjongFeedback.until) mahjongFeedback = null;
    if (mahjongRelicActivation && now >= mahjongRelicActivation.until) mahjongRelicActivation = null;
    drawMahjongRoguelite();
    if (mahjongFeedback || mahjongRelicActivation) mahjongAnimationFrame = requestAnimationFrame(tick);
  };
  mahjongAnimationFrame = requestAnimationFrame(tick);
}

function showMahjongFeedback(type, x, y) {
  const now = performance.now();
  mahjongFeedback = { type, x, y, startedAt: now, until: now + (type === "match" ? 420 : 320) };
  scheduleMahjongAnimation();
}

function activateMahjongRelics(ids, label) {
  const visibleIds = [...new Set(ids)].filter((id) => mahjongRelicById(id));
  if (!visibleIds.length) return;
  const now = performance.now();
  mahjongRelicActivation = { ids: visibleIds, label, startedAt: now, until: now + 480 };
  scheduleMahjongAnimation();
}

function mahjongRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffleMahjongList(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function createMahjongPositions(tileCount) {
  const baseColumns = tileCount >= 56 ? 8 : tileCount >= 40 ? 7 : 5;
  const baseRows = tileCount >= 56 ? 6 : 4;
  const baseCount = Math.min(tileCount, baseColumns * baseRows);
  const positions = [];
  for (let index = 0; index < baseCount; index += 1) {
    positions.push({ id: "m-" + index, x: index % baseColumns, y: Math.floor(index / baseColumns), z: 0 });
  }
  const overlayCount = tileCount - baseCount;
  const overlayColumns = Math.min(baseColumns - 2, Math.max(2, Math.ceil(overlayCount / Math.max(1, Math.ceil(overlayCount / 8)))));
  const overlayRows = Math.ceil(overlayCount / overlayColumns);
  const startX = (baseColumns - overlayColumns) / 2;
  const startY = (baseRows - overlayRows) / 2;
  for (let index = 0; index < overlayCount; index += 1) {
    positions.push({ id: "m-" + (baseCount + index), x: startX + index % overlayColumns, y: startY + Math.floor(index / overlayColumns), z: 1 });
  }
  return positions;
}

function mahjongPositionIsFree(position, positions, removed) {
  if (removed.has(position.id)) return false;
  const alive = positions.filter((candidate) => !removed.has(candidate.id));
  const covered = alive.some((candidate) => candidate.z > position.z && Math.abs(candidate.x - position.x) < .95 && Math.abs(candidate.y - position.y) < .95);
  if (covered) return false;
  const leftBlocked = alive.some((candidate) => candidate.z === position.z && candidate.x < position.x && position.x - candidate.x <= 1.05 && Math.abs(candidate.y - position.y) < .55);
  const rightBlocked = alive.some((candidate) => candidate.z === position.z && candidate.x > position.x && candidate.x - position.x <= 1.05 && Math.abs(candidate.y - position.y) < .55);
  return !leftBlocked || !rightBlocked;
}

function buildMahjongRemovalOrder(positions, random) {
  const removed = new Set();
  const order = [];
  while (removed.size < positions.length) {
    const free = shuffleMahjongList(positions.filter((position) => mahjongPositionIsFree(position, positions, removed)), random);
    if (free.length < 2) return null;
    const first = free[0];
    const second = free.find((candidate) => candidate.id !== first.id);
    removed.add(first.id); removed.add(second.id);
    order.push([first.id, second.id]);
  }
  return order;
}

function assignMahjongPairs(positions, seed) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const random = mahjongRandom((seed + attempt * 0x9e3779b1) >>> 0);
    const order = buildMahjongRemovalOrder(positions, random);
    if (!order) continue;
    const pairOrder = shuffleMahjongList(Array.from({ length: order.length }, (_, index) => index), random);
    const byId = new Map();
    order.forEach((ids, index) => {
      const value = pairOrder[index];
      const symbol = value % 9;
      const variant = Math.floor(value / 9) % mahjongVariantColors.length;
      ids.forEach((id) => byId.set(id, { symbol, variant, pairId: "p-" + value }));
    });
    return positions.map((position) => ({ ...position, ...byId.get(position.id), deleted: false, selected: false }));
  }
  throw new Error("无法生成可解灵牌阵列");
}

function createSolvableMahjongBoard(tileCount, seed) {
  return assignMahjongPairs(createMahjongPositions(tileCount), seed);
}

function isMahjongTileFree(tile) {
  if (!tile || tile.deleted) return false;
  if (mahjongSealedIds.has(tile.id) && !mahjongRelicStacks.has("lantern")) return false;
  return mahjongPositionIsFree(tile, mahjongBoard, new Set(mahjongBoard.filter((candidate) => candidate.deleted).map((candidate) => candidate.id)));
}

function getAvailableMahjongPairs() {
  const free = mahjongBoard.filter(isMahjongTileFree);
  const pairs = [];
  for (let left = 0; left < free.length; left += 1) for (let right = left + 1; right < free.length; right += 1) {
    if (free[left].pairId === free[right].pairId) pairs.push([free[left], free[right]]);
  }
  return pairs;
}

function mahjongRemaining() { return mahjongBoard.filter((tile) => !tile.deleted).length; }
function mahjongRelicCount() { return [...mahjongRelicStacks.values()].reduce((total, count) => total + count, 0); }

function mahjongTimeRemaining() {
  return mahjongDeadline ? Math.max(0, Math.ceil((mahjongDeadline - Date.now()) / 1000)) : 0;
}

function saveMahjongRun() {
  try {
    safeStorage.setItem(mahjongRunStorageKey, JSON.stringify({
      schemaVersion: 3, level: currentCampaignLevel().number, mode: mahjongMode, seed: mahjongRunSeed,
      stage: mahjongStage, score: mahjongScore, combo: mahjongCombo, hints: mahjongHints, shuffles: mahjongShuffles,
      board: mahjongBoard, relicStacks: Object.fromEntries(mahjongRelicStacks), matches: mahjongMatches,
      sealedIds: [...mahjongSealedIds], deadline: mahjongDeadline, awaitingRelic: mahjongAwaitingRelic,
      awaitingRoute: mahjongAwaitingRoute, currentRouteId: mahjongCurrentRouteId, routeHistory: mahjongRouteHistory,
      eliteWins: mahjongEliteWins, ending: mahjongEnding, updatedAt: Date.now(),
    }));
  } catch {}
}

function clearMahjongRun() {
  try { safeStorage.removeItem(mahjongRunStorageKey); } catch {}
}

function restoreMahjongRun() {
  try {
    const saved = JSON.parse(safeStorage.getItem(mahjongRunStorageKey) || "null");
    if (!saved || ![2, 3].includes(saved.schemaVersion) || saved.level !== currentCampaignLevel().number || saved.mode !== mahjongMode || saved.seed !== mahjongRunSeed || !Array.isArray(saved.board)) return false;
    mahjongStage = Math.max(0, Math.min(2, Number(saved.stage) || 0));
    mahjongScore = Number(saved.score) || 0; mahjongCombo = Number(saved.combo) || 0;
    mahjongHints = Math.max(0, Number(saved.hints) || 0); mahjongShuffles = Math.max(0, Number(saved.shuffles) || 0);
    mahjongBoard = saved.board; mahjongRelicStacks = new Map(Object.entries(saved.relicStacks || {}).map(([key, value]) => [key, Number(value) || 0]));
    mahjongMatches = Number(saved.matches) || 0; mahjongSealedIds = new Set(saved.sealedIds || []);
    mahjongDeadline = Number(saved.deadline) || 0; mahjongAwaitingRelic = Boolean(saved.awaitingRelic);
    mahjongAwaitingRoute = Boolean(saved.awaitingRoute); mahjongCurrentRouteId = saved.currentRouteId || null;
    mahjongRouteHistory = Array.isArray(saved.routeHistory) ? saved.routeHistory : [];
    mahjongEliteWins = Number(saved.eliteWins) || 0; mahjongEnding = saved.ending || null;
    mahjongSelectedId = null; mahjongHintIds = new Set(); mahjongHistory = []; mahjongNewlyFreeIds = new Set();
    mahjongKeyboardId = mahjongBoard.find(isMahjongTileFree)?.id || null; mahjongRestored = true;
    return true;
  } catch { return false; }
}

function updateMahjongBestScore() {
  try {
    const key = mahjongMode + ":" + (mahjongMode === "daily" ? new Date().toISOString().slice(0, 10) : "all");
    const scores = JSON.parse(safeStorage.getItem(mahjongBestStorageKey) || "{}");
    scores[key] = Math.max(Number(scores[key]) || 0, mahjongScore);
    safeStorage.setItem(mahjongBestStorageKey, JSON.stringify(scores));
    return scores[key];
  } catch { return mahjongScore; }
}

function mahjongBlockReason(tile) {
  const alive = mahjongBoard.filter((candidate) => !candidate.deleted);
  const covered = alive.some((candidate) => candidate.z > tile.z && Math.abs(candidate.x - tile.x) < .95 && Math.abs(candidate.y - tile.y) < .95);
  return covered ? "这张灵牌仍被上层覆盖。" : "这张灵牌左右都被夹住，先从边缘打开通路。";
}

function snapshotMahjongState() {
  mahjongHistory.push({
    board: mahjongBoard.map((tile) => ({ ...tile, selected: false })),
    score: mahjongScore,
    combo: mahjongCombo,
    selectedId: null,
    matches: mahjongMatches,
    sealedIds: new Set(mahjongSealedIds),
  });
  if (mahjongHistory.length > 30) mahjongHistory.shift();
}

function syncMahjongControls() {
  const hintButton = document.querySelector('[data-control="hint"]');
  const shuffleButton = document.querySelector('[data-control="shuffle"]');
  const undoButton = document.querySelector('[data-control="undo"]');
  const controlsLocked = !running || mahjongAwaitingRelic || mahjongAwaitingRoute;
  if (hintButton) {
    hintButton.textContent = "提示 · " + mahjongHints;
    hintButton.disabled = controlsLocked || mahjongHints <= 0;
  }
  if (shuffleButton) {
    shuffleButton.textContent = "洗牌 · " + mahjongShuffles;
    shuffleButton.disabled = controlsLocked || mahjongShuffles <= 0;
  }
  if (undoButton) undoButton.disabled = controlsLocked || mahjongHistory.length === 0;
  if (new URLSearchParams(location.search).has("qa")) canvas.dataset.qaState = JSON.stringify(runtimeDebugState());
}

function mahjongLayout() {
  const alive = mahjongBoard.length ? mahjongBoard : createMahjongPositions(32);
  const maxX = Math.max(...alive.map((tile) => tile.x));
  const tileWidth = Math.min(148, 670 / (maxX * .96 + 1.1));
  const tileHeight = tileWidth * 1.24;
  const stepX = tileWidth * .96;
  const stepY = tileHeight * .93;
  const boardWidth = maxX * stepX + tileWidth;
  const verticalOffsets = alive.map((tile) => tile.y * stepY - tile.z * 18);
  const minOffset = Math.min(...verticalOffsets);
  const maxOffset = Math.max(...verticalOffsets);
  const boardHeight = maxOffset - minOffset + tileHeight + 22;
  const boardRegionTop = 208;
  const boardRegionBottom = Math.max(boardRegionTop, gameSceneHeight() - 92);
  const boardAndLegendHeight = boardHeight + 102;
  const centeredOffset = Math.max(0, (boardRegionBottom - boardRegionTop - boardAndLegendHeight) / 2);
  const boardTop = config.aspectRatio === "9:16" ? boardRegionTop + centeredOffset : boardRegionTop;
  return { tileWidth, tileHeight, stepX, stepY, x: (720 - boardWidth) / 2, y: boardTop - minOffset, boardTop, boardWidth, boardHeight };
}

function mahjongTileRect(tile, layout) {
  return {
    x: layout.x + tile.x * layout.stepX + tile.z * 8,
    y: layout.y + tile.y * layout.stepY - tile.z * 18,
    width: layout.tileWidth,
    height: layout.tileHeight,
  };
}

function mahjongTileVisualState(tile, selectedTile) {
  const free = isMahjongTileFree(tile);
  const selected = tile.id === mahjongSelectedId;
  const hinted = mahjongHintIds.has(tile.id);
  const matching = Boolean(selectedTile && selectedTile.id !== tile.id && selectedTile.pairId === tile.pairId && free);
  const newlyFree = mahjongNewlyFreeIds.has(tile.id);
  const keyboardFocused = mahjongKeyboardNavigation && tile.id === mahjongKeyboardId;
  const sealed = mahjongSealedIds.has(tile.id) && !mahjongRelicStacks.has("lantern");
  return { free, selected, hinted, matching, newlyFree, keyboardFocused, sealed };
}

function drawMahjongTileBody(rect, tile, free, sealed) {
  const depth = Math.max(7, Math.min(11, rect.width * .065));
  const radius = Math.max(14, rect.width * .15);
  const sideGradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  sideGradient.addColorStop(0, free ? "#e7d8b8" : "#b3aa98");
  sideGradient.addColorStop(1, sealed ? "#80695d" : free ? "#ad9d7e" : "#887f70");
  ctx.save();
  ctx.fillStyle = "rgba(12,28,34,.3)";
  ctx.shadowColor = "rgba(10,27,34,.38)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = depth * .7;
  ctx.shadowOffsetY = depth * .9;
  ctx.beginPath();
  ctx.roundRect(rect.x + depth, rect.y + depth, rect.width, rect.height, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = sideGradient;
  ctx.beginPath();
  ctx.roundRect(rect.x + depth, rect.y + depth, rect.width, rect.height, radius);
  ctx.fill();
  ctx.strokeStyle = free ? "rgba(91,76,52,.46)" : "rgba(42,48,48,.58)";
  ctx.lineWidth = Math.max(2, rect.width * .018);
  ctx.stroke();
  const faceGradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width * .82, rect.y + rect.height);
  faceGradient.addColorStop(0, sealed ? "#ead9cf" : free ? "#fffaf0" : "#ded5c5");
  faceGradient.addColorStop(.62, sealed ? "#d8bfb3" : free ? "#f5e9cc" : "#c9c0af");
  faceGradient.addColorStop(1, sealed ? "#c8aa9e" : free ? "#e7d5b2" : "#ada494");
  ctx.fillStyle = faceGradient;
  ctx.beginPath();
  ctx.roundRect(rect.x, rect.y, rect.width, rect.height, radius);
  ctx.fill();
  ctx.strokeStyle = free ? "rgba(111,88,53,.58)" : "rgba(60,63,59,.58)";
  ctx.lineWidth = Math.max(2, rect.width * .02);
  ctx.stroke();
  ctx.strokeStyle = free ? "rgba(255,255,248,.88)" : "rgba(246,241,226,.44)";
  ctx.lineWidth = Math.max(1.5, rect.width * .014);
  ctx.beginPath();
  ctx.roundRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10, Math.max(10, radius - 5));
  ctx.stroke();
  ctx.restore();
  return depth;
}

function drawMahjongMotif(symbol, rect) {
  const size = rect.width * .72;
  const x = rect.x + (rect.width - size) / 2;
  const y = rect.y + (rect.height - size) / 2 + rect.height * .018;
  drawBitmapSprite(symbol, x, y, size, size, { fallback: "#d6a554", scale: 1 });
}

function mahjongPrimaryCue(state) {
  if (state.selected) return "selected";
  if (state.matching) return "matching";
  if (state.hinted) return "hinted";
  if (state.newlyFree) return "newly-free";
  return "none";
}

function drawMahjongSelectionCue(rect) {
  const radius = Math.max(11, rect.width * .12);
  const railWidth = rect.width * .4;
  ctx.save();
  ctx.fillStyle = "rgba(20,111,120,.13)";
  ctx.beginPath();
  ctx.roundRect(rect.x + 7, rect.y + 7, rect.width - 14, rect.height - 14, radius);
  ctx.fill();
  ctx.shadowColor = "rgba(20,111,120,.36)";
  ctx.shadowBlur = 8;
  ctx.strokeStyle = "#146f78";
  ctx.lineWidth = Math.max(5, rect.width * .052);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(rect.x + (rect.width - railWidth) / 2, rect.y + rect.height * .81);
  ctx.lineTo(rect.x + (rect.width + railWidth) / 2, rect.y + rect.height * .81);
  ctx.stroke();
  ctx.restore();
}

function drawMahjongMatchingCue(rect) {
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height * .81;
  const dotRadius = Math.max(4, rect.width * .045);
  const gap = dotRadius * 1.75;
  ctx.save();
  const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, rect.width * .42);
  glow.addColorStop(0, "rgba(230,164,44,.2)");
  glow.addColorStop(1, "rgba(230,164,44,0)");
  ctx.fillStyle = glow;
  ctx.beginPath(); ctx.ellipse(centerX, centerY - rect.height * .26, rect.width * .43, rect.height * .34, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(230,164,44,.96)";
  ctx.lineWidth = Math.max(3, rect.width * .03);
  ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(centerX - gap + dotRadius, centerY); ctx.lineTo(centerX + gap - dotRadius, centerY); ctx.stroke();
  ctx.fillStyle = "#e6a42c";
  ctx.beginPath(); ctx.arc(centerX - gap, centerY, dotRadius, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(centerX + gap, centerY, dotRadius, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawMahjongHintCue(rect) {
  const x = rect.x + Math.max(16, rect.width * .17);
  const y = rect.y + Math.max(19, rect.height * .17);
  const radius = Math.max(7, rect.width * .075);
  ctx.save();
  ctx.shadowColor = "rgba(230,164,44,.62)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "rgba(255,246,205,.96)";
  ctx.strokeStyle = "#d99222";
  ctx.lineWidth = Math.max(2, rect.width * .022);
  ctx.beginPath();
  for (let index = 0; index < 8; index += 1) {
    const angle = -Math.PI / 2 + index * Math.PI / 4;
    const distance = index % 2 === 0 ? radius : radius * .4;
    const px = x + Math.cos(angle) * distance;
    const py = y + Math.sin(angle) * distance;
    if (index === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawMahjongNewlyFreeCue(rect) {
  const centerX = rect.x + rect.width / 2;
  const y = rect.y + rect.height * .81;
  const half = rect.width * .19;
  ctx.save();
  ctx.strokeStyle = "rgba(47,154,141,.86)";
  ctx.lineWidth = Math.max(3, rect.width * .032);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(centerX - half, y);
  ctx.quadraticCurveTo(centerX - half * .5, y - 7, centerX, y);
  ctx.quadraticCurveTo(centerX + half * .5, y + 7, centerX + half, y);
  ctx.stroke();
  ctx.restore();
}

function drawMahjongKeyboardCue(rect) {
  ctx.save();
  ctx.strokeStyle = "rgba(11,96,112,.9)";
  ctx.lineWidth = Math.max(3, rect.width * .03);
  ctx.setLineDash([6, 7]);
  ctx.beginPath();
  ctx.roundRect(rect.x + 7, rect.y + 7, rect.width - 14, rect.height - 14, Math.max(11, rect.width * .12));
  ctx.stroke();
  ctx.restore();
}

function drawMahjongTileCues(rect, state) {
  const primary = mahjongPrimaryCue(state);
  if (primary === "selected") drawMahjongSelectionCue(rect);
  if (primary === "matching") drawMahjongMatchingCue(rect);
  if (primary === "hinted") drawMahjongHintCue(rect);
  if (primary === "newly-free") drawMahjongNewlyFreeCue(rect);
  if (state.keyboardFocused && primary !== "selected") drawMahjongKeyboardCue(rect);
}

function drawMahjongRelicDock(now) {
  const persistentEntries = [...mahjongRelicStacks.entries()]
    .map(([id, stacks]) => ({ relic: mahjongRelicById(id), stacks }))
    .filter((entry) => entry.relic);
  const activatedOnlyEntries = (mahjongRelicActivation?.ids || [])
    .filter((id) => !mahjongRelicStacks.has(id))
    .map((id) => ({ relic: mahjongRelicById(id), stacks: 0 }))
    .filter((entry) => entry.relic);
  const entries = [...persistentEntries, ...activatedOnlyEntries].slice(0, 3);
  const activeIds = new Set(mahjongRelicActivation?.ids || []);
  const dockY = entries.length ? 128 : 132;
  const dockHeight = entries.length ? 64 : 44;
  drawPlayfield(80, dockY, 560, dockHeight, { radius: 20, alpha: .9 });
  ctx.textAlign = "left";
  ctx.fillStyle = palette.text;
  if (!entries.length) {
    ctx.font = "800 15px Inter, sans-serif";
    ctx.fillText("旅途遗物", 100, 159);
    ctx.fillStyle = palette.textSoft;
    ctx.font = "650 14px Inter, sans-serif";
    ctx.fillText("首段完成后选择；获得后持续显示效果", 210, 159);
    return;
  }
  ctx.font = "800 15px Inter, sans-serif";
  ctx.fillText("旅途遗物", 96, 153);
  ctx.fillStyle = palette.textSoft;
  ctx.font = "650 12px Inter, sans-serif";
  ctx.fillText(entries.length + " 件已选", 96, 174);
  const gap = 10;
  const availableWidth = 446;
  const chipWidth = Math.min(214, (availableWidth - gap * (entries.length - 1)) / entries.length);
  entries.forEach(({ relic, stacks }, index) => {
    const x = 184 + index * (chipWidth + gap);
    const active = activeIds.has(relic.id) && mahjongRelicActivation && now < mahjongRelicActivation.until;
    const progress = active ? Math.min(1, Math.max(0, (now - mahjongRelicActivation.startedAt) / (mahjongRelicActivation.until - mahjongRelicActivation.startedAt))) : 0;
    ctx.save();
    ctx.fillStyle = active ? "rgba(255,247,218," + (.66 + (1 - progress) * .18) + ")" : "rgba(255,250,236,.56)";
    ctx.strokeStyle = "rgba(74,105,108,.28)";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, 135, chipWidth, 50, 16); ctx.fill(); ctx.stroke();
    if (active) {
      const pulse = 22 + progress * 10;
      ctx.strokeStyle = "rgba(230,164,44," + (.78 * (1 - progress)) + ")";
      ctx.lineWidth = 4 - progress * 2;
      ctx.beginPath(); ctx.arc(x + 27, 160, pulse, 0, Math.PI * 2); ctx.stroke();
    }
    drawBitmapSprite(relic.sprite, x + 6, 139, 42, 42, { fallback: palette.highlight, scale: 1 });
    if (stacks > 1) {
      ctx.fillStyle = "#146f78"; ctx.beginPath(); ctx.arc(x + 45, 141, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fffaf0"; ctx.font = "800 12px Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(String(stacks), x + 45, 141); ctx.textBaseline = "alphabetic";
    }
    ctx.textAlign = "left";
    ctx.fillStyle = palette.text; ctx.font = "800 15px Inter, sans-serif";
    ctx.fillText(relic.name, x + 54, 155, chipWidth - 62);
    ctx.fillStyle = active ? "#a66515" : palette.textSoft; ctx.font = "650 12px Inter, sans-serif";
    const detail = active ? mahjongRelicActivation.label : relic.detail;
    ctx.fillText(detail.length > 12 ? detail.slice(0, 12) + "…" : detail, x + 54, 175, chipWidth - 62);
    ctx.restore();
  });
}

function drawMahjongFeedback(now) {
  if (!mahjongFeedback || now >= mahjongFeedback.until) return;
  const progress = Math.min(1, Math.max(0, (now - mahjongFeedback.startedAt) / (mahjongFeedback.until - mahjongFeedback.startedAt)));
  const alpha = 1 - progress;
  ctx.save();
  ctx.translate(mahjongFeedback.x, mahjongFeedback.y);
  if (mahjongFeedback.type === "match") {
    ctx.strokeStyle = "rgba(230,164,44," + (.9 * alpha) + ")";
    ctx.lineWidth = 5 - progress * 2;
    ctx.beginPath(); ctx.arc(0, 0, 18 + progress * 54, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = "rgba(47,154,141," + (.72 * alpha) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, 8 + progress * 34, 0, Math.PI * 2); ctx.stroke();
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4;
      const radius = 22 + progress * 48;
      const size = 5 * alpha + 2;
      ctx.fillStyle = index % 2 ? "rgba(47,154,141," + alpha + ")" : "rgba(230,164,44," + alpha + ")";
      ctx.beginPath(); ctx.arc(Math.cos(angle) * radius, Math.sin(angle) * radius, size, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    ctx.strokeStyle = "rgba(213,91,72," + (.9 * alpha) + ")";
    ctx.lineWidth = 5 - progress * 2;
    ctx.lineCap = "round";
    [-1, 0, 1].forEach((direction) => {
      const x = direction * (12 + progress * 8);
      ctx.beginPath();
      ctx.moveTo(x - direction * 2, 18 + progress * 5);
      ctx.lineTo(x + direction * 4, 30 + progress * 12);
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawMahjongRelicChoice() {
  ctx.fillStyle = "rgba(13,28,37,.84)";
  ctx.fillRect(0, 230, 720, Math.min(830, gameSceneHeight() - 270));
  ctx.textAlign = "center"; ctx.fillStyle = "#fffaf0";
  ctx.font = "800 34px Inter, sans-serif"; ctx.fillText("选择一件旅途遗物", 360, 276);
  ctx.font = "600 19px Inter, sans-serif"; ctx.fillStyle = "rgba(255,250,240,.78)";
  ctx.fillText("它会陪你进入下一段月港航线", 360, 314);
  mahjongRelicChoices.forEach((relic, index) => {
    const x = 42 + index * 226;
    const y = 350;
    ctx.fillStyle = "rgba(255,250,236,.94)";
    ctx.beginPath(); ctx.roundRect(x, y, 184, 310, 28); ctx.fill();
    drawBitmapSprite(relic.sprite, x + 34, y + 28, 116, 116, { fallback: palette.highlight, scale: 1.12 });
    ctx.fillStyle = "#20343c"; ctx.font = "800 22px Inter, sans-serif"; ctx.fillText(relic.name, x + 92, y + 184);
    ctx.fillStyle = relic.rarity === "传说" ? "#b45b31" : relic.rarity === "史诗" ? "#775a9c" : "#52727a";
    ctx.font = "800 14px Inter, sans-serif"; ctx.fillText(relic.rarity + " · 已有 " + (mahjongRelicStacks.get(relic.id) || 0) + " 层", x + 92, y + 208);
    ctx.fillStyle = "#54676c"; ctx.font = "600 15px Inter, sans-serif";
    const lines = relic.detail.length > 12 ? [relic.detail.slice(0, 12), relic.detail.slice(12, 24)] : [relic.detail];
    lines.forEach((line, lineIndex) => ctx.fillText(line, x + 92, y + 238 + lineIndex * 22));
    ctx.fillStyle = "#718287"; ctx.font = "600 12px Inter, sans-serif"; ctx.fillText(relic.scope, x + 92, y + 295);
  });
}

function drawMahjongRouteChoice() {
  ctx.fillStyle = "rgba(13,28,37,.88)";
  ctx.fillRect(0, 230, 720, Math.min(830, gameSceneHeight() - 270));
  ctx.textAlign = "center"; ctx.fillStyle = "#fffaf0";
  ctx.font = "800 34px Inter, sans-serif"; ctx.fillText("选择下一段航线", 360, 276);
  ctx.font = "600 20px Inter, sans-serif"; ctx.fillStyle = "rgba(255,250,240,.78)";
  ctx.fillText("路线改变牌阵、风险与得分，也决定最终归航结局", 360, 312);
  mahjongRouteChoices.forEach((route, index) => {
    const x = 42 + index * 226; const y = 324;
    const elite = route.id === "elite";
    ctx.fillStyle = elite ? "rgba(43,26,31,.97)" : "rgba(255,250,236,.96)";
    ctx.beginPath(); ctx.roundRect(x, y, 184, 346, 28); ctx.fill();
    ctx.strokeStyle = elite ? "#ef9a5d" : "rgba(22,141,138,.46)"; ctx.lineWidth = elite ? 5 : 2;
    ctx.beginPath(); ctx.roundRect(x + 2, y + 2, 180, 342, 26); ctx.stroke();
    drawBitmapSprite(route.sprite, x + 34, y + 24, 116, 116, { fallback: elite ? "#ef9a5d" : palette.highlight, scale: 1.1 });
    ctx.fillStyle = elite ? "#ffd3ad" : "#20343c"; ctx.font = "800 22px Inter, sans-serif";
    ctx.fillText(route.name, x + 92, y + 174);
    ctx.fillStyle = elite ? "#ef9a5d" : "#168d8a"; ctx.font = "800 17px Inter, sans-serif";
    ctx.fillText(route.tag + " · ×" + route.scoreMultiplier.toFixed(2), x + 92, y + 204);
    ctx.fillStyle = elite ? "rgba(255,244,228,.82)" : "#54676c"; ctx.font = "650 18px Inter, sans-serif";
    const lines = [route.detail.slice(0, 8), route.detail.slice(8, 16), route.detail.slice(16, 24)].filter(Boolean);
    lines.forEach((line, lineIndex) => ctx.fillText(line, x + 92, y + 238 + lineIndex * 27));
    ctx.fillStyle = elite ? "#fff2df" : "#718287"; ctx.font = "700 16px Inter, sans-serif";
    ctx.fillText("按 " + (index + 1) + " 选择", x + 92, y + 318);
  });
}

function drawMahjongRoguelite() {
  clearCanvas();
  ctx.save(); ctx.translate(0, gameSceneTop());
  const now = performance.now();
  const layout = mahjongLayout();
  const freeCount = mahjongBoard.filter(isMahjongTileFree).length;
  const pairCount = getAvailableMahjongPairs().length;
  const selectedTile = mahjongBoard.find((tile) => tile.id === mahjongSelectedId) || null;
  drawPlayfield(72, 28, 576, 92, { radius: 26, alpha: .88 });
  ctx.fillStyle = palette.text;
  ctx.font = "800 24px Inter, sans-serif";
  const rule = currentMahjongRule();
  const route = currentMahjongRoute();
  ctx.textAlign = "left";
  ctx.fillText("航段 " + (mahjongStage + 1) + " / 3", 96, 66);
  ctx.textAlign = "center";
  ctx.fillText(route?.name || "待选航线", 360, 66, 260);
  ctx.textAlign = "right";
  ctx.fillText("剩余 " + mahjongRemaining(), 624, 66);
  ctx.fillStyle = palette.textSoft; ctx.font = "700 16px Inter, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("可配对 " + pairCount + "   ·   得分 " + Math.round(mahjongScore) + "   ·   连击 ×" + Math.max(1, mahjongCombo), 96, 101);
  ctx.textAlign = "right";
  ctx.fillStyle = mahjongDeadline ? "#a66515" : palette.textSoft;
  ctx.fillText(mahjongDeadline ? "潮汐 " + mahjongTimeRemaining() + " 秒" : rule.label, 624, 101);
  drawPlayfield(layout.x - 24, layout.boardTop - 12, layout.boardWidth + 48, layout.boardHeight + 42, { radius: 36, alpha: .9 });
  mahjongHitAreas = [];
  const drawOrder = [...mahjongBoard].filter((tile) => !tile.deleted).sort((left, right) => left.z - right.z || left.y - right.y || left.x - right.x);
  drawOrder.forEach((tile) => {
    const rect = mahjongTileRect(tile, layout);
    const { free, selected, hinted, matching, newlyFree, keyboardFocused, sealed } = mahjongTileVisualState(tile, selectedTile);
    ctx.save();
    const tileDepth = drawMahjongTileBody(rect, tile, free, sealed);
    ctx.globalAlpha = free ? 1 : .76;
    ctx.filter = free ? "none" : "saturate(.5) brightness(.84)";
    drawMahjongMotif(tile.symbol, rect);
    ctx.filter = "none";
    if (!free) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = sealed ? "rgba(92,46,42,.44)" : "rgba(31,45,49,.29)";
      ctx.beginPath(); ctx.roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, Math.max(12, rect.width * .14)); ctx.fill();
      ctx.strokeStyle = sealed ? "rgba(119,55,49,.86)" : "rgba(44,56,59,.5)";
      ctx.lineWidth = Math.max(2, rect.width * .024);
      ctx.beginPath(); ctx.moveTo(rect.x + rect.width * .18, rect.y + rect.height * .86); ctx.lineTo(rect.x + rect.width * .82, rect.y + rect.height * .86); ctx.stroke();
    }
    ctx.globalAlpha = free ? .98 : .7;
    ctx.fillStyle = mahjongVariantColors[tile.variant];
    const markerX = rect.x + rect.width * .79;
    const markerY = rect.y + rect.height * .18;
    const markerRadius = Math.max(9, rect.width * .095);
    ctx.beginPath(); ctx.arc(markerX, markerY, markerRadius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,250,240,.94)"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#fffaf0"; ctx.font = "800 " + Math.max(14, rect.width * .14) + "px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(tile.variant + 1), markerX, markerY + .5);
    ctx.textBaseline = "alphabetic";
    if (free) drawMahjongTileCues(rect, { selected, hinted, matching, newlyFree, keyboardFocused });
    ctx.restore();
    mahjongHitAreas.push({ tile, rect: { ...rect }, depth: tileDepth });
  });
  drawMahjongFeedback(now);
  drawMahjongRelicDock(now);
  if (mahjongAwaitingRelic) drawMahjongRelicChoice();
  if (mahjongAwaitingRoute) drawMahjongRouteChoice();
  ctx.restore(); finishCanvasStyle();
  syncMahjongControls();
}

function chooseMahjongRelic(index) {
  const relic = mahjongRelicChoices[index];
  if (!relic) return;
  mahjongRelicStacks.set(relic.id, (mahjongRelicStacks.get(relic.id) || 0) + 1);
  if (relic.id === "compass") mahjongHints += 2;
  if (relic.id === "charm") mahjongShuffles += 1;
  if (relic.id === "pearl") mahjongScore += 120;
  if (relic.id === "anchor" && mahjongDeadline) mahjongDeadline += 30_000;
  if (relic.id === "sail") mahjongScore += 60;
  activateMahjongRelics([relic.id], relic.detail);
  mahjongAwaitingRelic = false;
  mahjongStage = Math.min(2, mahjongStage + 1);
  presentMahjongRouteChoices();
}

function pickMahjongRelicChoices() {
  const random = mahjongRandom((mahjongRunSeed ^ (mahjongStage + 1) * 0x9e3779b1) >>> 0);
  mahjongRelicChoices = shuffleMahjongList(mahjongRelics, random).slice(0, 3);
}

function pickMahjongRouteChoices() {
  const random = mahjongRandom((mahjongRunSeed ^ (mahjongStage + 11) * 0x85ebca6b) >>> 0);
  const normalRoutes = shuffleMahjongList(mahjongRoutes.filter((route) => route.id !== "elite"), random).slice(0, 3);
  if (mahjongStage >= 1) normalRoutes[2] = mahjongRoutes.find((route) => route.id === "elite");
  mahjongRouteChoices = normalRoutes;
}

function presentMahjongRouteChoices() {
  mahjongCurrentRouteId = null; mahjongAwaitingRoute = true; mahjongDeadline = 0;
  pickMahjongRouteChoices(); setGameSessionState("stage-complete");
  setMetric("选择航线");
  setStatus("选择第 " + (mahjongStage + 1) + " 航段：稳健补给、收益路线或精英挑战会改变本段规则。 ");
  saveMahjongRun(); drawMahjongRoguelite();
}

function chooseMahjongRoute(index) {
  const route = mahjongRouteChoices[index];
  if (!route) return;
  mahjongCurrentRouteId = route.id; mahjongAwaitingRoute = false;
  mahjongRouteHistory.push({ stage: mahjongStage + 1, id: route.id, name: route.name, tag: route.tag });
  if (route.id === "garden") mahjongHints += 1;
  if (route.id === "market") mahjongScore += 100;
  setGameSessionState("playing"); saveMahjongRun(); startMahjongStage();
}

function mahjongEndingForRun() {
  const synergies = activeMahjongSynergies();
  if (mahjongEliteWins >= 2 && synergies.length >= 1) return { id: "moon-crown", name: "潮冠归航", detail: "你穿越两处禁航区，并让遗物形成完整协同。" };
  if (synergies.length >= 2) return { id: "lantern-fleet", name: "万灯领航", detail: "两组遗物协同让整支月港船队找到了新航线。" };
  if (mahjongScore >= 1800) return { id: "treasure-route", name: "星砂富航", detail: "你以高额赏金刷新了月港商会的航行纪录。" };
  return { id: "safe-return", name: "平潮归航", detail: "你稳妥完成三段航程，新的路线已经解锁。" };
}

function startMahjongStage() {
  const tileCount = mahjongTileCountForLevel();
  mahjongBoard = createSolvableMahjongBoard(tileCount, (mahjongRunSeed ^ tileCount ^ mahjongStage * 0x9e3779b1) >>> 0);
  mahjongSealedIds = new Set(); mahjongMatches = 0;
  const initialPairs = getAvailableMahjongPairs();
  if (["sealed", "elite"].includes(currentMahjongRule().id) && initialPairs.length > 1 && !mahjongRelicStacks.has("lantern")) {
    initialPairs[1].forEach((tile) => mahjongSealedIds.add(tile.id));
    if (currentMahjongRule().id === "elite" && initialPairs.length > 2) initialPairs[2].forEach((tile) => mahjongSealedIds.add(tile.id));
  }
  const openingPair = getAvailableMahjongPairs()[0] || [];
  const rule = currentMahjongRule();
  const route = currentMahjongRoute();
  const stageRelicIds = [];
  const stageRelicNotices = [];
  const crownPenalty = mahjongRelicStacks.has("crown") && !mahjongHasSynergy("storm-crown") ? 15 : 0;
  mahjongDeadline = rule.timeLimit ? Date.now() + Math.max(45, rule.timeLimit + (route?.timeDelta || 0) - crownPenalty) * 1000 : 0;
  if (mahjongRelicStacks.has("lantern") && ["sealed", "elite"].includes(rule.id)) { stageRelicIds.push("lantern"); stageRelicNotices.push("封锁已解除"); }
  if (mahjongRelicStacks.has("anchor") && mahjongDeadline) { mahjongDeadline += 30_000; stageRelicIds.push("anchor"); stageRelicNotices.push("潮汐 +30秒"); }
  if (mahjongRelicStacks.has("atlas") && !mahjongHasConflict("lantern-atlas")) { mahjongHints += 1; stageRelicIds.push("atlas"); stageRelicNotices.push("提示 +1"); }
  if (mahjongHasSynergy("navigator")) { mahjongHints += 2; stageRelicIds.push("compass", "atlas"); stageRelicNotices.push("星潮领航 +2提示"); }
  if (mahjongHasConflict("crown-charm")) { mahjongShuffles = Math.max(0, mahjongShuffles - 1); stageRelicIds.push("crown", "charm"); stageRelicNotices.push("逆风税 -1洗牌"); }
  if (mahjongRelicStacks.has("sail")) { mahjongScore += 60; stageRelicIds.push("sail"); stageRelicNotices.push("开局 +60分"); }
  if (crownPenalty) { stageRelicIds.push("crown"); stageRelicNotices.push("潮汐 -15秒"); }
  mahjongSelectedId = null;
  mahjongHintIds = new Set(openingPair.map((tile) => tile.id));
  mahjongHistory = []; mahjongCombo = 0; mahjongFeedback = null; mahjongNewlyFreeIds = new Set();
  mahjongKeyboardId = openingPair[0]?.id || mahjongBoard.find(isMahjongTileFree)?.id || null;
  setMetric(mahjongRemaining() + " 张");
  const buildNotice = activeMahjongSynergies().length ? " · 已激活 " + activeMahjongSynergies().map((item) => item.name).join("、") : "";
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + route.name + " · " + rule.label + "：" + rule.detail + buildNotice + "。已点亮第一对自由牌。 ");
  saveMahjongRun();
  if (stageRelicIds.length) activateMahjongRelics(stageRelicIds, stageRelicNotices.join(" · "));
  drawMahjongRoguelite();
}

function resolveMahjongStageClear() {
  playSound("success");
  if (currentMahjongRoute()?.id === "elite") mahjongEliteWins += 1;
  if (mahjongStage >= 2) {
    mahjongEnding = mahjongEndingForRun();
    const best = updateMahjongBestScore();
    clearMahjongRun();
    drawMahjongRoguelite();
    showResult(true, mahjongEnding.name, mahjongEnding.detail + " 你以 " + Math.round(mahjongScore) + " 分带回 " + mahjongRelicCount() + " 件遗物，完成 " + mahjongEliteWins + " 次精英挑战；当前模式最佳分 " + Math.round(best) + "。 ");
    syncMahjongControls();
    return;
  }
  mahjongAwaitingRelic = true;
  pickMahjongRelicChoices();
  setGameSessionState("stage-complete");
  setMetric("航段完成");
  setStatus("选择一件遗物，再进入下一段航线。 ");
  saveMahjongRun();
  drawMahjongRoguelite();
}

function checkMahjongContinuity() {
  if (mahjongRemaining() === 0) { resolveMahjongStageClear(); return; }
  const pairs = getAvailableMahjongPairs();
  if (pairs.length) return;
  if (mahjongShuffles > 0) {
    setStatus("当前没有可用对子；使用洗牌重建一条可解路线。 ");
    return;
  }
  drawMahjongRoguelite();
  showResult(false, "航线被封住了", "牌面没有可用对子且洗牌已用完；下一次优先打开上层与长边。 ");
  syncMahjongControls();
}

function selectMahjongTile(tile) {
  if (!isMahjongTileFree(tile)) {
    const blockedRect = mahjongTileRect(tile, mahjongLayout());
    showMahjongFeedback("blocked", blockedRect.x + blockedRect.width / 2, blockedRect.y + blockedRect.height / 2);
    setStatus(mahjongBlockReason(tile)); playSound("fail"); drawMahjongRoguelite(); return;
  }
  mahjongHintIds = new Set();
  if (!mahjongSelectedId) {
    mahjongSelectedId = tile.id; tile.selected = true; playSound("move");
    setStatus("已选中一张自由牌；再找一张图案与角标都相同的牌。 "); drawMahjongRoguelite(); return;
  }
  const first = mahjongBoard.find((candidate) => candidate.id === mahjongSelectedId);
  if (first.id === tile.id) {
    first.selected = false; mahjongSelectedId = null; playSound("move"); drawMahjongRoguelite(); return;
  }
  if (first.pairId !== tile.pairId) {
    first.selected = false; tile.selected = true; mahjongSelectedId = tile.id;
    if (!mahjongRelicStacks.has("reef")) mahjongCombo = 0;
    else activateMahjongRelics(["reef"], "配错仍保留连击");
    setStatus("这两张不是同一对；已保留第二张继续寻找。 "); playSound("fail"); drawMahjongRoguelite(); return;
  }
  const freeBeforeMatch = new Set(mahjongBoard.filter(isMahjongTileFree).map((candidate) => candidate.id));
  snapshotMahjongState();
  first.deleted = true; first.selected = false; tile.deleted = true;
  mahjongSelectedId = null; mahjongCombo += 1;
  mahjongKeyboardId = null;
  mahjongNewlyFreeIds = new Set(mahjongBoard.filter(isMahjongTileFree).map((candidate) => candidate.id).filter((id) => !freeBeforeMatch.has(id)));
  const routeMultiplier = currentMahjongRoute()?.scoreMultiplier || 1;
  const matchRelicIds = [];
  if ((mahjongRelicStacks.get("thread") || 0) > 0) matchRelicIds.push("thread");
  if ((mahjongRelicStacks.get("crown") || 0) > 0) matchRelicIds.push("crown");
  let multiplier = (1 + (mahjongRelicStacks.get("thread") || 0) + (mahjongRelicStacks.get("crown") || 0) * 1.5) * routeMultiplier;
  if (mahjongHasConflict("crown-charm")) { multiplier *= 1.25; matchRelicIds.push("charm"); }
  if (currentMahjongRoute()?.id === "archive" && activeMahjongSynergies().length) multiplier *= 1 + activeMahjongSynergies().length * .25;
  if (mahjongHasSynergy("moon-thread") && mahjongMatches === 0) { multiplier *= 2; matchRelicIds.push("thread", "mirror"); }
  if ((mahjongRelicStacks.get("mirror") || 0) > 0) {
    multiplier *= 2;
    matchRelicIds.push("mirror");
    const remainingMirrors = (mahjongRelicStacks.get("mirror") || 0) - 1;
    if (remainingMirrors > 0) mahjongRelicStacks.set("mirror", remainingMirrors); else mahjongRelicStacks.delete("mirror");
  }
  const earned = Math.round((10 + mahjongCombo * 3) * multiplier);
  mahjongScore += earned;
  mahjongMatches += 1;
  if (mahjongMatches >= 2 && mahjongSealedIds.size) {
    mahjongSealedIds = new Set();
    mahjongNewlyFreeIds = new Set(mahjongBoard.filter(isMahjongTileFree).map((candidate) => candidate.id));
    setStatus("封锁层已经解除；新开放的牌正在发光。 ");
  }
  const rect = mahjongTileRect(tile, mahjongLayout());
  showMahjongFeedback("match", rect.x + rect.width / 2, rect.y + rect.height / 2);
  if (matchRelicIds.length) activateMahjongRelics(matchRelicIds, "本次配对 +" + earned + "分");
  setMetric(mahjongRemaining() + " 张");
  setStatus("配对成功 · 连击 ×" + mahjongCombo + " · +" + earned + " 分");
  saveMahjongRun(); playSound("move"); drawMahjongRoguelite(); checkMahjongContinuity();
}

function hintMahjongPair() {
  if (mahjongHints <= 0) { setStatus("本次旅程的提示已经用完。 "); return; }
  const pair = getAvailableMahjongPairs()[0];
  if (!pair) { checkMahjongContinuity(); return; }
  mahjongHints -= 1;
  mahjongHintIds = new Set(pair.map((tile) => tile.id));
  setStatus("一对可消除灵牌已经点亮；提示不会替你移除。 "); saveMahjongRun(); drawMahjongRoguelite();
}

function reshuffleMahjongBoard() {
  if (mahjongShuffles <= 0) { setStatus("本次旅程的洗牌已经用完。 "); return; }
  const active = mahjongBoard.filter((tile) => !tile.deleted).map((tile) => ({ id: tile.id, x: tile.x, y: tile.y, z: tile.z }));
  if (!active.length) return;
  snapshotMahjongState();
  const reassigned = assignMahjongPairs(active, (currentCampaignLevel().seed ^ active.length ^ mahjongScore) >>> 0);
  const replacement = new Map(reassigned.map((tile) => [tile.id, tile]));
  mahjongBoard = mahjongBoard.map((tile) => tile.deleted ? tile : replacement.get(tile.id));
  mahjongShuffles -= 1; mahjongSelectedId = null; mahjongHintIds = new Set(); mahjongCombo = 0; mahjongNewlyFreeIds = new Set();
  mahjongKeyboardId = mahjongBoard.find(isMahjongTileFree)?.id || null;
  setStatus("牌面已重排，并重新验证存在完整消除顺序。 "); saveMahjongRun(); playSound("move"); drawMahjongRoguelite();
}

function undoMahjongPair() {
  const state = mahjongHistory.pop();
  if (!state) { setStatus("目前没有可以撤销的配对。 "); return; }
  mahjongBoard = state.board; mahjongScore = state.score; mahjongCombo = mahjongRelicStacks.has("shell") ? mahjongCombo : state.combo; mahjongSelectedId = state.selectedId;
  mahjongMatches = state.matches; mahjongSealedIds = state.sealedIds;
  mahjongHintIds = new Set(); mahjongNewlyFreeIds = new Set();
  mahjongKeyboardId = mahjongBoard.find(isMahjongTileFree)?.id || null;
  if (mahjongRelicStacks.has("shell")) activateMahjongRelics(["shell"], "撤销仍保留连击");
  setMetric(mahjongRemaining() + " 张"); setStatus("已撤销上一对。 "); saveMahjongRun(); drawMahjongRoguelite();
}

function moveMahjongKeyboardCursor(direction) {
  const freeTiles = mahjongBoard.filter(isMahjongTileFree).sort((left, right) => left.y - right.y || left.x - right.x);
  if (!freeTiles.length) return;
  mahjongKeyboardNavigation = true;
  const currentIndex = Math.max(0, freeTiles.findIndex((tile) => tile.id === mahjongKeyboardId));
  const nextIndex = (currentIndex + direction + freeTiles.length) % freeTiles.length;
  mahjongKeyboardId = freeTiles[nextIndex].id;
  setStatus("键盘焦点已移动到一张自由牌；按回车或空格选择。 ");
  drawMahjongRoguelite();
}

function startGame() {
  readMahjongSetup();
  if (restoreMahjongRun()) {
    running = true; hideOverlay(); startAmbient();
    if (mahjongAwaitingRelic) { pickMahjongRelicChoices(); setGameSessionState("stage-complete"); }
    if (mahjongAwaitingRoute) { pickMahjongRouteChoices(); setGameSessionState("stage-complete"); }
    setMetric(mahjongAwaitingRoute ? "选择航线" : mahjongRemaining() + " 张");
    setStatus("已恢复上次月港旅程 · 航段 " + (mahjongStage + 1) + " / 3 · " + (mahjongAwaitingRoute ? "等待选择航线" : "剩余 " + mahjongRemaining() + " 张") + "。 ");
    drawMahjongRoguelite(); canvas.focus({ preventScroll: true }); return;
  }
  mahjongStage = 0; mahjongScore = 0; mahjongCombo = 0;
  const resourcePenalty = Math.floor((currentCampaignLevel().tier - 1) / 2);
  mahjongHints = Math.max(0, mahjongDifficulty.hints - resourcePenalty);
  mahjongShuffles = Math.max(1, mahjongDifficulty.shuffles - resourcePenalty);
  mahjongRelicStacks = new Map(); mahjongAwaitingRelic = false;
  mahjongAwaitingRoute = false; mahjongCurrentRouteId = null; mahjongRouteHistory = []; mahjongEliteWins = 0; mahjongEnding = null;
  mahjongRestored = false;
  running = true; hideOverlay(); startAmbient(); presentMahjongRouteChoices();
  canvas.focus({ preventScroll: true });
}

function handleControl(value) {
  if (!running || mahjongAwaitingRelic || mahjongAwaitingRoute) return;
  if (value === "hint") hintMahjongPair();
  if (value === "shuffle") reshuffleMahjongBoard();
  if (value === "undo") undoMahjongPair();
}

function handleKey(key) {
  if (!running && !mahjongAwaitingRelic && !mahjongAwaitingRoute) return;
  if (mahjongAwaitingRelic && ["1", "2", "3"].includes(key)) { chooseMahjongRelic(Number(key) - 1); return; }
  if (mahjongAwaitingRoute && ["1", "2", "3"].includes(key)) { chooseMahjongRoute(Number(key) - 1); return; }
  if (mahjongAwaitingRelic) return;
  if (mahjongAwaitingRoute) return;
  if (key.toLowerCase() === "h") hintMahjongPair();
  if (key.toLowerCase() === "s") reshuffleMahjongBoard();
  if (key.toLowerCase() === "z") undoMahjongPair();
  if (["ArrowLeft", "ArrowUp"].includes(key)) moveMahjongKeyboardCursor(-1);
  if (["ArrowRight", "ArrowDown"].includes(key)) moveMahjongKeyboardCursor(1);
  if (["Enter", " "].includes(key)) {
    const tile = mahjongBoard.find((candidate) => candidate.id === mahjongKeyboardId);
    if (tile) selectMahjongTile(tile);
  }
}

window.addEventListener("keydown", (event) => {
  if (gameSessionState !== "stage-complete" || (!mahjongAwaitingRelic && !mahjongAwaitingRoute)) return;
  if (!["1", "2", "3"].includes(event.key)) return;
  event.preventDefault(); handleKey(event.key);
});

canvas.addEventListener("pointerup", (event) => {
  if (!running && !mahjongAwaitingRelic && !mahjongAwaitingRoute) return;
  mahjongKeyboardNavigation = false;
  const point = eventScenePoint(event);
  if (mahjongAwaitingRelic) {
    if (point.y >= 350 && point.y <= 660) chooseMahjongRelic(Math.max(0, Math.min(2, Math.floor((point.x - 42) / 226))));
    return;
  }
  if (mahjongAwaitingRoute) {
    if (point.y >= 324 && point.y <= 670) chooseMahjongRoute(Math.max(0, Math.min(2, Math.floor((point.x - 42) / 226))));
    return;
  }
  const hit = [...mahjongHitAreas].reverse().find(({ rect }) => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height);
  if (hit) { mahjongKeyboardId = hit.tile.id; selectMahjongTile(hit.tile); }
});

canvas.addEventListener("focus", () => {
  if (!running || mahjongAwaitingRelic) return;
  if (!mahjongKeyboardId) mahjongKeyboardId = mahjongBoard.find(isMahjongTileFree)?.id || null;
  if (mahjongKeyboardNavigation) drawMahjongRoguelite();
});

const mahjongModeSelect = document.querySelector("[data-mahjong-mode]");
const mahjongSeedInput = document.querySelector("[data-mahjong-seed]");
mahjongModeSelect?.addEventListener("change", () => {
  mahjongSeedInput.disabled = mahjongModeSelect.value !== "seeded";
  if (mahjongModeSelect.value === "seeded") mahjongSeedInput.focus();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) { mahjongHiddenAt = Date.now(); saveMahjongRun(); return; }
  if (mahjongHiddenAt && mahjongDeadline) mahjongDeadline += Date.now() - mahjongHiddenAt;
  mahjongHiddenAt = 0; saveMahjongRun();
});

setInterval(() => {
  if (!running || gameSessionState !== "playing" || !mahjongDeadline) return;
  if (mahjongTimeRemaining() <= 0) {
    clearMahjongRun(); drawMahjongRoguelite(); showResult(false, "潮汐淹没了航线", "第三航段计时归零；优先消除能打开更多边缘的对子。 "); return;
  }
  drawMahjongRoguelite();
}, 1000);

runtimeDebugActions = {
  selectFirstFree: () => {
    if (mahjongAwaitingRoute) chooseMahjongRoute(0);
    const pair = getAvailableMahjongPairs()[0];
    if (pair?.[0]) selectMahjongTile(pair[0]);
  },
  completeMahjongStage: () => { if (mahjongAwaitingRoute) chooseMahjongRoute(0); mahjongBoard.forEach((tile) => { tile.deleted = true; }); mahjongSelectedId = null; drawMahjongRoguelite(); resolveMahjongStageClear(); },
  chooseFirstRelic: () => { if (mahjongAwaitingRelic) chooseMahjongRelic(0); },
  chooseFirstRoute: () => { if (mahjongAwaitingRoute) chooseMahjongRoute(0); },
  chooseEliteRoute: () => { if (mahjongAwaitingRoute) { const index = mahjongRouteChoices.findIndex((route) => route.id === "elite"); if (index >= 0) chooseMahjongRoute(index); } },
  failMahjong: () => { clearMahjongRun(); showResult(false, "航线被封住了", "牌面没有可用对子且洗牌已用完。 "); },
};
runtimeDebugState = () => ({
  level: currentCampaignLevel().number,
  tier: currentCampaignLevel().tier,
  stage: mahjongStage,
  remaining: mahjongRemaining(),
  score: mahjongScore,
  hints: mahjongHints,
  shuffles: mahjongShuffles,
  selectedId: mahjongSelectedId,
  keyboardId: mahjongKeyboardId,
  relicCount: mahjongRelicCount(),
  relicStacks: Object.fromEntries(mahjongRelicStacks),
  awaitingRelic: mahjongAwaitingRelic,
  awaitingRoute: mahjongAwaitingRoute,
  mode: mahjongMode,
  runSeed: mahjongRunSeed,
  rule: currentMahjongRule().id,
  matches: mahjongMatches,
  sealedCount: mahjongSealedIds.size,
  timeRemaining: mahjongTimeRemaining(),
  restored: mahjongRestored,
  relicPoolSize: mahjongRelics.length,
  routePoolSize: mahjongRoutes.length,
  currentRoute: currentMahjongRoute() ? { id: currentMahjongRoute().id, name: currentMahjongRoute().name, tag: currentMahjongRoute().tag } : null,
  routeChoices: mahjongRouteChoices.map((route) => ({ id: route.id, name: route.name, tag: route.tag, tileDelta: route.tileDelta, scoreMultiplier: route.scoreMultiplier })),
  routeHistory: mahjongRouteHistory,
  activeSynergies: activeMahjongSynergies().map((item) => ({ id: item.id, name: item.name, detail: item.detail })),
  activeConflicts: activeMahjongConflicts().map((item) => ({ id: item.id, name: item.name, detail: item.detail })),
  eliteWins: mahjongEliteWins,
  ending: mahjongEnding,
  relicChoices: mahjongRelicChoices.map((relic) => ({ id: relic.id, rarity: relic.rarity, scope: relic.scope, stacks: mahjongRelicStacks.get(relic.id) || 0 })),
  availablePairs: getAvailableMahjongPairs().map((pair) => pair.map((tile) => tile.id)),
  freeCount: mahjongBoard.filter(isMahjongTileFree).length,
  blockedCount: mahjongBoard.filter((tile) => !tile.deleted && !isMahjongTileFree(tile)).length,
  compatibleFreeCount: mahjongSelectedId ? mahjongBoard.filter((tile) => tile.id !== mahjongSelectedId && isMahjongTileFree(tile) && tile.pairId === mahjongBoard.find((candidate) => candidate.id === mahjongSelectedId)?.pairId).length : 0,
  boardLayout: mahjongLayout(),
  boardAreaVersion: 2,
  hudDensityVersion: 2,
  emptyRelicDockHeight: 44,
  inBoardLegend: false,
  resourceCountersPlacement: "external-controls",
  boardPlacement: "available-height-centered",
  tileScalePolicy: "preserve-ratio-and-spacing",
  visualCueVersion: 4,
  layerCueVersion: 1,
  assetCompositionVersion: 2,
  feedbackVersion: 3,
  cuePrecedence: "selected-matching-hinted-newly-free",
  persistentRelicDock: true,
  activeRelicEffect: mahjongRelicActivation ? { ids: mahjongRelicActivation.ids, label: mahjongRelicActivation.label } : null,
  tileBodySource: "canvas-single-layer",
  spriteContent: "transparent-motif-only",
  selectionChangesGeometry: false,
  keyboardNavigation: mahjongKeyboardNavigation,
  hitAreas: mahjongHitAreas.map(({ tile, rect, depth }) => ({ id: tile.id, pairId: tile.pairId, z: tile.z, free: isMahjongTileFree(tile), depth, rect })),
});

mahjongBoard = createSolvableMahjongBoard(mahjongTileCountForLevel(), 0x4d4a5254);
drawMahjongRoguelite();


redrawGameArt = () => { drawMahjongRoguelite(); };
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
  const identity = {"projectId":"920238d1-459e-40a6-8f16-fa8599e6db67","versionId":"e26726e2-2078-4fe1-b539-126d9f2c2217"};
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