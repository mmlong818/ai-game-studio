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
const config = {"title":"软糖拼岛","template":"polyomino-fit","difficulty":"standard","visualStyle":"cute","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"board","inputModes":["pointer","keyboard","touch-buttons"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":[],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"polyomino-fit-01","label":"01 · 认识规则 · 对称轮廓","tier":1,"tierLabel":"认识规则","variant":0,"seed":4044212762,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"对称轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":2,"id":"polyomino-fit-02","label":"02 · 认识规则 · 凹槽轮廓","tier":1,"tierLabel":"认识规则","variant":1,"seed":1398030537,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"凹槽轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":3,"id":"polyomino-fit-03","label":"03 · 认识规则 · 窄道轮廓","tier":1,"tierLabel":"认识规则","variant":2,"seed":3046956728,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"窄道轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":4,"id":"polyomino-fit-04","label":"04 · 认识规则 · 多岛轮廓","tier":1,"tierLabel":"认识规则","variant":3,"seed":401036655,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"多岛轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"解锁稳定节奏"},{"number":5,"id":"polyomino-fit-05","label":"05 · 稳定节奏 · 对称轮廓","tier":2,"tierLabel":"稳定节奏","variant":0,"seed":2016400350,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"对称轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":6,"id":"polyomino-fit-06","label":"06 · 稳定节奏 · 凹槽轮廓","tier":2,"tierLabel":"稳定节奏","variant":1,"seed":3665193357,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"凹槽轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":7,"id":"polyomino-fit-07","label":"07 · 稳定节奏 · 窄道轮廓","tier":2,"tierLabel":"稳定节奏","variant":2,"seed":1019142268,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"窄道轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":8,"id":"polyomino-fit-08","label":"08 · 稳定节奏 · 多岛轮廓","tier":2,"tierLabel":"稳定节奏","variant":3,"seed":2659286563,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"多岛轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"解锁加入变化"},{"number":9,"id":"polyomino-fit-09","label":"09 · 加入变化 · 对称轮廓","tier":3,"tierLabel":"加入变化","variant":0,"seed":3771331730,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"对称轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":10,"id":"polyomino-fit-10","label":"10 · 加入变化 · 凹槽轮廓","tier":3,"tierLabel":"加入变化","variant":1,"seed":1091597121,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"凹槽轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":11,"id":"polyomino-fit-11","label":"11 · 加入变化 · 窄道轮廓","tier":3,"tierLabel":"加入变化","variant":2,"seed":2740488496,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"窄道轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":12,"id":"polyomino-fit-12","label":"12 · 加入变化 · 多岛轮廓","tier":3,"tierLabel":"加入变化","variant":3,"seed":94570471,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"多岛轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"解锁组合压力"},{"number":13,"id":"polyomino-fit-13","label":"13 · 组合压力 · 对称轮廓","tier":4,"tierLabel":"组合压力","variant":0,"seed":1743494742,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"对称轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":14,"id":"polyomino-fit-14","label":"14 · 组合压力 · 凹槽轮廓","tier":4,"tierLabel":"组合压力","variant":1,"seed":3358725125,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"凹槽轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":15,"id":"polyomino-fit-15","label":"15 · 组合压力 · 窄道轮廓","tier":4,"tierLabel":"组合压力","variant":2,"seed":712676084,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"窄道轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":16,"id":"polyomino-fit-16","label":"16 · 组合压力 · 多岛轮廓","tier":4,"tierLabel":"组合压力","variant":3,"seed":2353866939,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"多岛轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"解锁最终掌握"},{"number":17,"id":"polyomino-fit-17","label":"17 · 最终掌握 · 对称轮廓","tier":5,"tierLabel":"最终掌握","variant":0,"seed":4002785130,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"对称轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"大师徽记"},{"number":18,"id":"polyomino-fit-18","label":"18 · 最终掌握 · 凹槽轮廓","tier":5,"tierLabel":"最终掌握","variant":1,"seed":1893481945,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"凹槽轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"大师徽记"},{"number":19,"id":"polyomino-fit-19","label":"19 · 最终掌握 · 窄道轮廓","tier":5,"tierLabel":"最终掌握","variant":2,"seed":3508845448,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"窄道轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"大师徽记"},{"number":20,"id":"polyomino-fit-20","label":"20 · 最终掌握 · 多岛轮廓","tier":5,"tierLabel":"最终掌握","variant":3,"seed":862925439,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"多岛轮廓","mission":"预判旋转后的轮廓关系，用有限提示完成无重叠拼合。","masteryRules":[{"id":"efficiency","label":"所有拼块一次完整吸附","metric":"placed","comparison":"ratio-gte","referenceMetric":"pieceCount","target":1},{"id":"control","label":"完成至少 4 块的复杂轮廓","metric":"pieceCount","comparison":"gte","target":4}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:2af177b7-0da4-44ee-9ffc-24dc96c821ef:69aee572-3be2-480f-b978-09a4a63a3c2c","masteryStorageKey":"forge-mastery:2af177b7-0da4-44ee-9ffc-24dc96c821ef:69aee572-3be2-480f-b978-09a4a63a3c2c"};
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


const polyDifficulty = {
  relaxed: { boardBonus: 0, hintBonus: 1, rotationOffset: 0 },
  standard: { boardBonus: 0, hintBonus: 0, rotationOffset: 1 },
  challenging: { boardBonus: 1, hintBonus: -1, rotationOffset: 2 },
}[config.difficulty];

const polyChapters = ["认识轮廓", "判断旋转", "破解凹槽", "规划顺序", "综合掌握"];
const polyShapeLibrary = [
  { id: "corner-3", cells: [[0,0],[1,0],[1,1]] },
  { id: "bar-3", cells: [[0,0],[0,1],[0,2]] },
  { id: "square-4", cells: [[0,0],[0,1],[1,0],[1,1]] },
  { id: "tee-4", cells: [[0,0],[0,1],[0,2],[1,1]] },
  { id: "ell-4", cells: [[0,0],[1,0],[2,0],[2,1]] },
  { id: "zig-4", cells: [[0,0],[0,1],[1,1],[1,2]] },
  { id: "bar-4", cells: [[0,0],[0,1],[0,2],[0,3]] },
  { id: "pee-5", cells: [[0,0],[0,1],[1,0],[1,1],[2,0]] },
  { id: "you-5", cells: [[0,0],[0,2],[1,0],[1,1],[1,2]] },
  { id: "tee-5", cells: [[0,0],[0,1],[0,2],[1,1],[2,1]] },
  { id: "double-zig-5", cells: [[0,0],[1,0],[1,1],[2,1],[2,2]] },
  { id: "why-5", cells: [[0,0],[0,1],[0,2],[0,3],[1,1]] },
  { id: "ell-5", cells: [[0,0],[1,0],[2,0],[3,0],[3,1]] },
];
const polyLevelSeeds = [
  0x1571a9,0x2b04df,0x3d91b7,0x4f270d,0x5ac863,0x6c55d9,0x7e032f,0x8f9095,0x914deb,0xa2db41,
  0xb46897,0xc5f5ed,0xd78343,0xe91099,0xfaadef,0x1c3b45,0x2dc89b,0x3f55f1,0x40e347,0x52709d,
];
const polyLevelNames = [
  "柠糖小湾","双角花圃","莓果回廊","汽水拱门",
  "旋转码头","镜面软岛","风车浅滩","四向糖桥",
  "凹槽果园","窄湾拼岸","双齿灯塔","回声内港",
  "珊瑚瓶颈","两岸相望","曲折潮门","星糖锁湾",
  "八色群岛","深湾回环","双岛月桥","软糖终章",
];

let polyBoardSize = 6;
let polyPieces = [];
let polyPlacements = [];
let selectedPolyPiece = 0;
let polyHint = null;
let polyHintsRemaining = 2;
let polyMoves = 0;
let polyInvalidMoves = 0;
let polyUndoStack = [];
let polyPulse = null;
let polyDragState = null;
let polyDragPreview = null;
let polyRestored = false;
let polyBestMoves = 0;
let polyBlueprintCache = new Map();

function createPolyRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function polyCellKey(row, column) { return row + ":" + column; }

function normalizePolyCells(cells) {
  const minRow = Math.min(...cells.map((cell) => cell[0]));
  const minColumn = Math.min(...cells.map((cell) => cell[1]));
  return cells.map(([row,column]) => [row-minRow,column-minColumn]).sort((left,right)=>left[0]-right[0]||left[1]-right[1]);
}

function rotatePolyCells(cells, turns) {
  let rotated = cells.map(([row, column]) => [row, column]);
  for (let turn = 0; turn < ((turns % 4) + 4) % 4; turn += 1) rotated = normalizePolyCells(rotated.map(([row,column])=>[column,-row]));
  return normalizePolyCells(rotated);
}

function polyShapeVariants(cells) {
  const variants = [];
  const signatures = new Set();
  for (let rotation=0;rotation<4;rotation+=1) {
    const rotated=rotatePolyCells(cells,rotation);
    const signature=rotated.map((cell)=>cell.join(":")).join("|");
    if(signatures.has(signature))continue;
    signatures.add(signature);variants.push({rotation,cells:rotated});
  }
  return variants;
}

function polyPlacementCandidates(boardSize, occupied, cells, requireAdjacent) {
  const maxRow=Math.max(...cells.map((cell)=>cell[0]));
  const maxColumn=Math.max(...cells.map((cell)=>cell[1]));
  const candidates=[];
  for(let row=0;row<boardSize-maxRow;row+=1)for(let column=0;column<boardSize-maxColumn;column+=1){
    const absolute=cells.map(([cellRow,cellColumn])=>[row+cellRow,column+cellColumn]);
    if(absolute.some(([cellRow,cellColumn])=>occupied.has(polyCellKey(cellRow,cellColumn))))continue;
    let adjacency=0;
    for(const [cellRow,cellColumn] of absolute)for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]])if(occupied.has(polyCellKey(cellRow+dr,cellColumn+dc)))adjacency+=1;
    if(requireAdjacent&&adjacency===0)continue;
    const centerDistance=Math.hypot(row+maxRow/2-(boardSize-1)/2,column+maxColumn/2-(boardSize-1)/2);
    candidates.push({row,column,adjacency,centerDistance});
  }
  return candidates;
}

function validatePolyBlueprint(blueprint) {
  const target=new Set();
  let area=0;
  for(const piece of blueprint.pieces){
    const cells=rotatePolyCells(piece.cells,piece.solution[2]);
    const local=new Set(cells.map((cell)=>cell.join(":")));
    if(local.size!==cells.length)return false;
    for(const [cellRow,cellColumn] of cells){
      const row=piece.solution[0]+cellRow,column=piece.solution[1]+cellColumn,key=polyCellKey(row,column);
      if(row<0||column<0||row>=blueprint.boardSize||column>=blueprint.boardSize||target.has(key))return false;
      target.add(key);area+=1;
    }
  }
  return area===target.size&&target.size>=15&&blueprint.pieces.length>=4;
}

function compilePolyBlueprint(levelNumber) {
  if(polyBlueprintCache.has(levelNumber))return structuredClone(polyBlueprintCache.get(levelNumber));
  const level=config.campaignLevels[Math.max(0,Math.min(19,levelNumber-1))];
  const tier=level.tier;
  const pieceCount=3+tier;
  const boardSize=Math.min(8,5+Math.ceil(tier/2)+polyDifficulty.boardBonus);
  for(let attempt=0;attempt<96;attempt+=1){
    const random=createPolyRandom((polyLevelSeeds[levelNumber-1]+attempt*0x9e3779b1)>>>0);
    const occupied=new Set();
    const pieces=[];
    let failed=false;
    for(let index=0;index<pieceCount;index+=1){
      const maxShapeIndex=Math.min(polyShapeLibrary.length,4+tier*2);
      const shape=polyShapeLibrary[(Math.floor(random()*maxShapeIndex)+levelNumber+index)%maxShapeIndex];
      const variants=polyShapeVariants(shape.cells);
      const variant=variants[Math.floor(random()*variants.length)];
      const candidates=polyPlacementCandidates(boardSize,occupied,variant.cells,index>0);
      if(!candidates.length){failed=true;break;}
      candidates.forEach((candidate)=>{candidate.rank=candidate.adjacency+random()*.7-candidate.centerDistance*.14;});
      candidates.sort((left,right)=>right.rank-left.rank);
      const chosen=candidates[Math.floor(random()*Math.min(7,candidates.length))];
      for(const [cellRow,cellColumn] of variant.cells)occupied.add(polyCellKey(chosen.row+cellRow,chosen.column+cellColumn));
      const initialRotation=(variant.rotation+1+Math.floor(random()*3)+polyDifficulty.rotationOffset)%4;
      pieces.push({id:"piece-"+(index+1),shapeId:shape.id,cells:shape.cells.map((cell)=>[...cell]),solution:[chosen.row,chosen.column,variant.rotation],rotation:initialRotation,sprite:(levelNumber+index*2)%6});
    }
    if(failed)continue;
    const rows=[...occupied].map((key)=>Number(key.split(":")[0]));
    const columns=[...occupied].map((key)=>Number(key.split(":")[1]));
    const width=Math.max(...columns)-Math.min(...columns)+1;
    const height=Math.max(...rows)-Math.min(...rows)+1;
    const blueprint={number:levelNumber,name:polyLevelNames[levelNumber-1],chapter:polyChapters[tier-1],boardSize,pieces,area:occupied.size,width,height,hints:Math.max(0,3-Math.ceil(tier/2)+polyDifficulty.hintBonus),seed:polyLevelSeeds[levelNumber-1]};
    if(width>=4&&height>=4&&validatePolyBlueprint(blueprint)){polyBlueprintCache.set(levelNumber,blueprint);return structuredClone(blueprint);}
  }
  throw new Error("无法生成可解的软糖拼岛关卡 "+levelNumber);
}

function currentPolyBlueprint(){return compilePolyBlueprint(currentCampaignLevel().number);}
function polySessionKey(){return config.campaignStorageKey+"-polyomino-session-v3";}
function polyBestKey(){return config.campaignStorageKey+"-polyomino-best-"+currentCampaignLevel().number;}
function clearPolySession(){try{safeStorage.removeItem(polySessionKey());}catch{}}
function readPolyBest(){try{return Math.max(0,Number(safeStorage.getItem(polyBestKey()))||0);}catch{return 0;}}

function persistPolySession(){
  try{safeStorage.setItem(polySessionKey(),JSON.stringify({schemaVersion:3,level:currentCampaignLevel().number,pieces:polyPieces.map((piece)=>({id:piece.id,rotation:piece.rotation})),placements:polyPlacements,moves:polyMoves,invalid:polyInvalidMoves,hints:polyHintsRemaining,selected:selectedPolyPiece,updatedAt:new Date().toISOString()}));}catch{}
}

function restorePolySession(){
  polyRestored=false;
  try{
    const saved=JSON.parse(safeStorage.getItem(polySessionKey())||"null");
    if(!saved||saved.schemaVersion!==3||saved.level!==currentCampaignLevel().number||!Array.isArray(saved.pieces)||!Array.isArray(saved.placements))return;
    const rotations=new Map(saved.pieces.map((piece)=>[piece.id,Number(piece.rotation)]));
    if(polyPieces.some((piece)=>!rotations.has(piece.id)))return;
    const candidatePlacements=[];
    for(const placement of saved.placements){
      const piece=polyPieces.find((entry)=>entry.id===placement.id);
      if(!piece||candidatePlacements.some((entry)=>entry.id===piece.id))return;
      const originalPlacements=polyPlacements;polyPlacements=candidatePlacements;
      const valid=canPlacePolyPiece(piece,Number(placement.row),Number(placement.column),Number(placement.rotation));
      polyPlacements=originalPlacements;
      if(!valid)return;
      candidatePlacements.push({id:piece.id,row:Number(placement.row),column:Number(placement.column),rotation:Number(placement.rotation)});
    }
    polyPieces.forEach((piece)=>{piece.rotation=((rotations.get(piece.id)%4)+4)%4;});
    polyPlacements=candidatePlacements;
    polyMoves=Math.max(0,Number(saved.moves)||0);polyInvalidMoves=Math.max(0,Number(saved.invalid)||0);polyHintsRemaining=Math.max(0,Number(saved.hints)||0);selectedPolyPiece=Math.max(0,Math.min(polyPieces.length-1,Number(saved.selected)||0));polyRestored=true;
  }catch{}
}

function polyTargetCells() {
  const target = new Set();
  for (const piece of polyPieces) {
    const [row, column, rotation] = piece.solution;
    for (const [cellRow, cellColumn] of rotatePolyCells(piece.cells, rotation)) target.add(polyCellKey(row + cellRow, column + cellColumn));
  }
  return target;
}

function polyOccupiedCells(ignoreId = null) {
  const occupied = new Set();
  for (const placement of polyPlacements) {
    if (placement.id === ignoreId) continue;
    const piece = polyPieces.find((item) => item.id === placement.id);
    for (const [cellRow, cellColumn] of rotatePolyCells(piece.cells, placement.rotation)) occupied.add(polyCellKey(placement.row + cellRow, placement.column + cellColumn));
  }
  return occupied;
}

function canPlacePolyPiece(piece, row, column, rotation = piece.rotation) {
  if(!piece||polyPlacements.some((placement)=>placement.id===piece.id)||!Number.isInteger(row)||!Number.isInteger(column))return false;
  const target = polyTargetCells();
  const occupied = polyOccupiedCells(piece.id);
  return rotatePolyCells(piece.cells, rotation).every(([cellRow, cellColumn]) => {
    const boardRow = row + cellRow, boardColumn = column + cellColumn, key = polyCellKey(boardRow, boardColumn);
    return boardRow >= 0 && boardColumn >= 0 && boardRow < polyBoardSize && boardColumn < polyBoardSize && target.has(key) && !occupied.has(key);
  });
}

function findNearestLegalPlacement(piece, targetRow, targetColumn) {
  if(!piece)return null;
  const cells=rotatePolyCells(piece.cells,piece.rotation),candidates=[];
  for(const [grabRow,grabColumn] of cells){
    const row=targetRow-grabRow,column=targetColumn-grabColumn;
    if(canPlacePolyPiece(piece,row,column))candidates.push({row,column,distance:Math.hypot(grabRow,grabColumn)});
  }
  return candidates.sort((left,right)=>left.distance-right.distance)[0]||null;
}

function selectNextPolyPiece(){const next=polyPieces.findIndex((piece)=>!polyPlacements.some((placement)=>placement.id===piece.id));if(next>=0)selectedPolyPiece=next;}

function placePolyPiece(piece,row,column,rotation=piece.rotation){
  if(!canPlacePolyPiece(piece,row,column,rotation)){
    polyInvalidMoves+=1;polyPulse={kind:"invalid",until:performance.now()+260};playSound("fail");setStatus("这里无法完整容纳该拼块；拼块已回到候选区。");drawPolyomino();return false;
  }
  polyUndoStack.push({placements:structuredClone(polyPlacements),rotations:polyPieces.map((entry)=>entry.rotation),moves:polyMoves});
  polyPlacements.push({id:piece.id,row,column,rotation});polyMoves+=1;polyHint=null;polyPulse={kind:"snap",id:piece.id,until:performance.now()+300};playSound("move");selectNextPolyPiece();
  if(polyPlacements.length === polyPieces.length){
    clearPolySession();
    if(!polyBestMoves||polyMoves<polyBestMoves){polyBestMoves=polyMoves;try{safeStorage.setItem(polyBestKey(),String(polyBestMoves));}catch{}}
    drawPolyomino();showResult(true,"软糖岛完整了","全部 "+polyTargetCells().size+" 格已覆盖；使用 "+polyMoves+" 次操作、提示 "+(currentPolyBlueprint().hints-polyHintsRemaining)+" 次。最佳 "+polyBestMoves+" 步。");return true;
  }
  persistPolySession();updatePolyStatus();drawPolyomino();return true;
}

function updatePolyStatus(){
  setMetric(polyPlacements.length+" / "+polyPieces.length+" · "+polyMoves+" 步");
  setStatus((polyRestored?"已恢复 · ":"")+currentPolyBlueprint().name+" · 还剩 "+(polyPieces.length-polyPlacements.length)+" 块 · 提示 "+polyHintsRemaining+"。先处理紧角与凹槽。");
}

function polyLayout(){const boardSize=Math.min(620,gameSceneHeight()*.54);return{boardSize,cell:boardSize/polyBoardSize,x:(720-boardSize)/2,y:164};}

function polyTrayLayout(boardLayout=polyLayout()){
  const columns=polyPieces.length>=7?4:polyPieces.length>=5?3:polyPieces.length;
  const rows=Math.ceil(polyPieces.length/columns),gap=8,slotWidth=Math.floor((660-gap*(columns-1))/columns),slotHeight=rows>1?124:154;
  const width=slotWidth*columns+gap*(columns-1),height=slotHeight*rows,y=Math.min(gameSceneHeight()-height-22,boardLayout.y+boardLayout.boardSize+46);
  return{x:(720-width)/2,y,width,height,columns,rows,gap,slotWidth,slotHeight};
}

function polyTrayPieceAt(point,layout=polyLayout()){
  const tray=polyTrayLayout(layout);
  if(point.x<tray.x||point.x>tray.x+tray.width||point.y<tray.y||point.y>tray.y+tray.height)return-1;
  for(let index=0;index<polyPieces.length;index+=1){const column=index%tray.columns,row=Math.floor(index/tray.columns),x=tray.x+column*(tray.slotWidth+tray.gap),y=tray.y+row*tray.slotHeight;if(point.x>=x&&point.x<=x+tray.slotWidth&&point.y>=y&&point.y<=y+tray.slotHeight)return index;}
  return-1;
}

function drawPolyPiece(piece,index,x,y,cell,alpha=1){
  ctx.save();ctx.globalAlpha=alpha;
  for(const [row,column] of rotatePolyCells(piece.cells,piece.rotation))drawBitmapSprite(piece.sprite,x+column*cell,y+row*cell,cell,cell,{fallback:palette.pieces[index%palette.pieces.length],radius:Math.max(8,cell*.22),scale:1.14,alpha});
  ctx.restore();
}

function drawPolyomino(){
  clearCanvas();ctx.save();ctx.fillStyle="rgba(252,247,242,.94)";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.translate(0,gameSceneTop());
  const layout=polyLayout(),target=polyTargetCells(),occupied=polyOccupiedCells();
  if(running){ctx.textAlign="center";ctx.fillStyle="#40343f";ctx.font="800 30px Inter,sans-serif";ctx.fillText(currentPolyBlueprint().name+" · "+polyPlacements.length+"/"+polyPieces.length+" 块",360,76);ctx.fillStyle="#776875";ctx.font="600 18px Inter,sans-serif";ctx.fillText(currentPolyBlueprint().chapter+" · "+polyMoves+" 步 · 提示 "+polyHintsRemaining,360,111);}
  ctx.save();ctx.fillStyle="#3a3540";ctx.shadowColor="rgba(72,44,72,.16)";ctx.shadowBlur=22;ctx.shadowOffsetY=10;ctx.beginPath();ctx.roundRect(layout.x-15,layout.y-15,layout.boardSize+30,layout.boardSize+30,34);ctx.fill();ctx.restore();
  for(let row=0;row<polyBoardSize;row+=1)for(let column=0;column<polyBoardSize;column+=1){
    const key=polyCellKey(row,column);if(!target.has(key))continue;const x=layout.x+column*layout.cell,y=layout.y+row*layout.cell;
    if(!occupied.has(key)){ctx.fillStyle="#625a68";ctx.strokeStyle="rgba(255,243,228,.52)";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(x+3,y+3,layout.cell-6,layout.cell-6,Math.min(14,layout.cell*.22));ctx.fill();ctx.stroke();ctx.fillStyle="rgba(255,255,255,.08)";ctx.beginPath();ctx.roundRect(x+9,y+9,layout.cell-18,Math.max(8,layout.cell*.18),7);ctx.fill();}
    if(polyHint?.cells?.has(key)){ctx.fillStyle="rgba(255,211,95,.4)";ctx.fillRect(x+5,y+5,layout.cell-10,layout.cell-10);}
  }
  for(const placement of polyPlacements){const index=polyPieces.findIndex((piece)=>piece.id===placement.id),piece=polyPieces[index],cells=rotatePolyCells(piece.cells,placement.rotation);for(const [row,column] of cells)drawBitmapSprite(piece.sprite,layout.x+(placement.column+column)*layout.cell+2,layout.y+(placement.row+row)*layout.cell+2,layout.cell-4,layout.cell-4,{fallback:palette.pieces[index%palette.pieces.length],radius:14,scale:1.16});}
  if(polyDragPreview){const piece=polyPieces[selectedPolyPiece],cells=rotatePolyCells(piece.cells,piece.rotation);for(const [row,column] of cells){const x=layout.x+(polyDragPreview.column+column)*layout.cell,y=layout.y+(polyDragPreview.row+row)*layout.cell;ctx.fillStyle=polyDragPreview.valid?"rgba(116,228,186,.42)":"rgba(238,77,55,.35)";ctx.fillRect(x+4,y+4,layout.cell-8,layout.cell-8);}}
  const tray=polyTrayLayout(layout);
  ctx.save();ctx.fillStyle="rgba(255,252,248,.93)";ctx.strokeStyle="rgba(122,90,119,.2)";ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(tray.x-12,tray.y-12,tray.width+24,tray.height+24,28);ctx.fill();ctx.stroke();ctx.restore();
  polyPieces.forEach((piece,index)=>{
    const used=polyPlacements.some((placement)=>placement.id===piece.id),column=index%tray.columns,row=Math.floor(index/tray.columns),x=tray.x+column*(tray.slotWidth+tray.gap),y=tray.y+row*tray.slotHeight,selected=index===selectedPolyPiece&&!used;
    ctx.save();ctx.fillStyle=selected?"rgba(255,235,194,.72)":"rgba(255,255,255,.48)";ctx.strokeStyle=selected?"#9a5f8e":"rgba(110,83,108,.18)";ctx.lineWidth=selected?3:1;ctx.shadowColor=selected?"rgba(198,106,176,.2)":"transparent";ctx.shadowBlur=selected?18:0;ctx.beginPath();ctx.roundRect(x,y,tray.slotWidth,tray.slotHeight-8,20);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle=selected?"#7d416f":"#756c74";ctx.beginPath();ctx.arc(x+18,y+18,10,0,Math.PI*2);ctx.fill();ctx.fillStyle="#fff";ctx.font="800 14px Inter,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(String(index+1),x+18,y+18);ctx.restore();
    const cells=rotatePolyCells(piece.cells,piece.rotation),maxColumn=Math.max(...cells.map((cell)=>cell[1]))+1,maxRow=Math.max(...cells.map((cell)=>cell[0]))+1,mini=Math.min(48,(tray.slotWidth-24)/maxColumn,(tray.slotHeight-38)/maxRow),pieceX=x+(tray.slotWidth-maxColumn*mini)/2,pieceY=y+20+(tray.slotHeight-28-maxRow*mini)/2;
    if(!used)drawPolyPiece(piece,index,pieceX,pieceY,mini);else{ctx.fillStyle="rgba(82,69,79,.58)";ctx.font="700 14px Inter,sans-serif";ctx.textAlign="center";ctx.fillText("已吸附",x+tray.slotWidth/2,y+tray.slotHeight/2);}
  });
  if(polyPulse&&performance.now()<polyPulse.until&&polyPulse.kind==="invalid"){ctx.fillStyle="rgba(238,77,55,.12)";ctx.fillRect(layout.x,layout.y,layout.boardSize,layout.boardSize);}
  ctx.restore();if(config.visualStyle!=="cute")finishCanvasStyle();
}

function rotateSelectedPolyPiece(){const piece=polyPieces[selectedPolyPiece];if(!piece||polyPlacements.some((placement)=>placement.id===piece.id))return false;piece.rotation=(piece.rotation+1)%4;polyMoves+=1;polyHint=null;playSound("move");persistPolySession();updatePolyStatus();drawPolyomino();return true;}

function hintPolyPiece(){
  if(polyHintsRemaining<=0){setStatus("本关提示已用完；优先寻找只容得下一种拼块的紧角。");return false;}
  const index=polyPieces.findIndex((piece)=>!polyPlacements.some((placement)=>placement.id===piece.id));if(index<0)return false;
  selectedPolyPiece=index;const piece=polyPieces[index],solutionCells=rotatePolyCells(piece.cells,piece.solution[2]).map(([row,column])=>polyCellKey(piece.solution[0]+row,piece.solution[1]+column));
  const stage=polyHintsRemaining===currentPolyBlueprint().hints?"region":"anchor";polyHint={pieceId:piece.id,stage,cells:new Set(stage==="region"?solutionCells:[solutionCells[0]])};polyHintsRemaining-=1;persistPolySession();setStatus(stage==="region"?"已标出一块软糖对应的区域，但方向仍由你判断。":"已标出该拼块的一个锚点，不会自动旋转或代放。");drawPolyomino();return true;
}

function undoPolyPiece(){
  const snapshot=polyUndoStack.pop();
  if(snapshot){polyPlacements=snapshot.placements;polyPieces.forEach((piece,index)=>{piece.rotation=snapshot.rotations[index];});polyMoves=snapshot.moves;selectNextPolyPiece();}
  else{const removed=polyPlacements.pop();if(!removed)return false;selectedPolyPiece=polyPieces.findIndex((piece)=>piece.id===removed.id);polyMoves+=1;}
  polyHint=null;persistPolySession();setStatus("已撤销上一块；方向与候选状态已恢复。");updatePolyStatus();drawPolyomino();return true;
}

function startGame(){
  if(running)clearPolySession();
  const blueprint=currentPolyBlueprint();polyBoardSize=blueprint.boardSize;polyPieces=blueprint.pieces;polyPlacements=[];selectedPolyPiece=0;polyHint=null;polyHintsRemaining=blueprint.hints;polyMoves=0;polyInvalidMoves=0;polyUndoStack=[];polyPulse=null;polyDragState=null;polyDragPreview=null;polyRestored=false;polyBestMoves=readPolyBest();restorePolySession();running=true;hideOverlay();startAmbient();updatePolyStatus();drawPolyomino();
}

function handleControl(value){if(value==="rotate")rotateSelectedPolyPiece();if(value==="hint")hintPolyPiece();if(value==="undo")undoPolyPiece();}
function handleKey(key){if(key.toLowerCase()==="r")rotateSelectedPolyPiece();if(key.toLowerCase()==="h")hintPolyPiece();if(key.toLowerCase()==="z")undoPolyPiece();if("12345678".includes(key)){const index=Number(key)-1;if(index<polyPieces.length&&!polyPlacements.some((placement)=>placement.id===polyPieces[index].id)){selectedPolyPiece=index;drawPolyomino();}}}

canvas.addEventListener("pointerdown",(event)=>{
  if(!running)return;const point=eventScenePoint(event),layout=polyLayout(),pieceIndex=polyTrayPieceAt(point,layout);
  if(pieceIndex<0||polyPlacements.some((placement)=>placement.id===polyPieces[pieceIndex].id))return;
  const wasSelected=selectedPolyPiece===pieceIndex;selectedPolyPiece=pieceIndex;polyDragState={pointerId:event.pointerId,startX:point.x,startY:point.y,moved:false,wasSelected,liftCells:event.pointerType==="touch"?2:1};try{canvas.setPointerCapture(event.pointerId);}catch{}drawPolyomino();
});

canvas.addEventListener("pointermove",(event)=>{
  if(!running||!polyDragState||polyDragState.pointerId!==event.pointerId)return;const point=eventScenePoint(event),layout=polyLayout();if(Math.hypot(point.x-polyDragState.startX,point.y-polyDragState.startY)>8)polyDragState.moved=true;
  if(!polyDragState.moved)return;const targetRow=Math.floor((point.y-layout.y)/layout.cell)-polyDragState.liftCells,targetColumn=Math.floor((point.x-layout.x)/layout.cell),piece=polyPieces[selectedPolyPiece],placement=findNearestLegalPlacement(piece,targetRow,targetColumn);polyDragPreview=placement?{...placement,valid:true}:{row:targetRow,column:targetColumn,valid:false};drawPolyomino();
});

function finishPolyPointer(event){
  if(!running)return;const point=eventScenePoint(event),layout=polyLayout();
  if(polyDragState?.pointerId===event.pointerId){
    if(polyDragState.moved){const piece=polyPieces[selectedPolyPiece];if(polyDragPreview?.valid)placePolyPiece(piece,polyDragPreview.row,polyDragPreview.column);else{polyInvalidMoves+=1;polyPulse={kind:"invalid",until:performance.now()+260};playSound("fail");setStatus("未对准完整轮廓，拼块已回弹。");}}
    else if(polyDragState.wasSelected)rotateSelectedPolyPiece();
    polyDragPreview=null;polyDragState=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);drawPolyomino();return;
  }
  if(point.y>=layout.y&&point.y<=layout.y+layout.boardSize&&point.x>=layout.x&&point.x<=layout.x+layout.boardSize){const piece=polyPieces[selectedPolyPiece],placement=findNearestLegalPlacement(piece,Math.floor((point.y-layout.y)/layout.cell),Math.floor((point.x-layout.x)/layout.cell));if(placement)placePolyPiece(piece,placement.row,placement.column);else{polyInvalidMoves+=1;polyPulse={kind:"invalid",until:performance.now()+260};playSound("fail");drawPolyomino();}}
}
canvas.addEventListener("pointerup",finishPolyPointer);
canvas.addEventListener("pointercancel",(event)=>{polyDragPreview=null;polyDragState=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);drawPolyomino();});

function initializePolyPreview(){const blueprint=currentPolyBlueprint();polyBoardSize=blueprint.boardSize;polyPieces=blueprint.pieces;polyPlacements=[];selectedPolyPiece=0;polyHintsRemaining=blueprint.hints;}
initializePolyPreview();
onCampaignLevelChanged=()=>{if(!running){initializePolyPreview();drawPolyomino();}};

runtimeDebugState=()=>{
  const tray=polyTrayLayout(),piece=polyPieces[selectedPolyPiece]||polyPieces[0],cells=piece?rotatePolyCells(piece.cells,piece.rotation):[[0,0]],maxColumn=Math.max(...cells.map((cell)=>cell[1]))+1,maxRow=Math.max(...cells.map((cell)=>cell[0]))+1,cellSize=Math.min(48,(tray.slotWidth-24)/maxColumn,(tray.slotHeight-38)/maxRow),targets=[...polyTargetCells()].sort();
  const selectedColumn=selectedPolyPiece%tray.columns,selectedRow=Math.floor(selectedPolyPiece/tray.columns);
  return{level:currentCampaignLevel().number,tier:currentCampaignLevel().tier,levelName:currentPolyBlueprint().name,chapter:currentPolyBlueprint().chapter,contourCount:20,contourSignature:targets.join("|"),pieceSignature:polyPieces.map((entry)=>entry.shapeId+"@"+entry.solution.join(":" )).join("/"),rotationSignature:polyPieces.map((entry)=>entry.rotation).join("|"),targetCellCount: polyTargetCells().size,boardSize:polyBoardSize,pieceCount:polyPieces.length,placed:polyPlacements.length,moves:polyMoves,invalidMoves:polyInvalidMoves,bestMoves:polyBestMoves,hintsRemaining:polyHintsRemaining,selectedPiece:selectedPolyPiece,selectedRotation:piece?.rotation||0,hintAnchorOnly:polyHint?.stage==="anchor",hintStage:polyHint?.stage||null,clickToRotate: true,dragPreview:polyDragPreview,dragLiftCells:polyDragState?.liftCells||0,restored:polyRestored,validBlueprint:validatePolyBlueprint(currentPolyBlueprint()),tray:{columns:tray.columns,rows:tray.rows,slotWidth:Math.round(tray.slotWidth),slotHeight:tray.slotHeight,cellSize:Math.round(cellSize)},trayFirstCenterCanvas:{x:tray.x+tray.slotWidth/2,y:gameSceneTop()+tray.y+tray.slotHeight/2},selectedTrayCenterCanvas:{x:tray.x+selectedColumn*(tray.slotWidth+tray.gap)+tray.slotWidth/2,y:gameSceneTop()+tray.y+selectedRow*tray.slotHeight+tray.slotHeight/2},canvasSize:{width:canvas.width,height:canvas.height}};
};

runtimeDebugActions={
  legalAction(){const piece=polyPieces[selectedPolyPiece];if(!piece)return false;piece.rotation=piece.solution[2];return placePolyPiece(piece,piece.solution[0],piece.solution[1]);},
  pointerProbe(){const index=polyPieces.findIndex((piece)=>!polyPlacements.some((placement)=>placement.id===piece.id));if(index<0)return null;selectedPolyPiece=index;const piece=polyPieces[index],layout=polyLayout(),tray=polyTrayLayout(layout),column=index%tray.columns,row=Math.floor(index/tray.columns);piece.rotation=piece.solution[2];return{from:{x:tray.x+column*(tray.slotWidth+tray.gap)+tray.slotWidth/2,y:gameSceneTop()+tray.y+row*tray.slotHeight+tray.slotHeight/2},to:{x:layout.x+(piece.solution[1]+.5)*layout.cell,y:gameSceneTop()+layout.y+(piece.solution[0]+1.5)*layout.cell},invalidTo:{x:layout.x-24,y:gameSceneTop()+layout.y-24},canvas:{width:canvas.width,height:canvas.height}};},
  hint:hintPolyPiece,rotate:rotateSelectedPolyPiece,undo:undoPolyPiece,clearSession:clearPolySession,
  selectPiece(index){if(index>=0&&index<polyPieces.length&&!polyPlacements.some((placement)=>placement.id===polyPieces[index].id)){selectedPolyPiece=index;drawPolyomino();return true;}return false;},
  placeSolutionPiece(){const piece=polyPieces[selectedPolyPiece];if(!piece)return false;piece.rotation=piece.solution[2];return placePolyPiece(piece,piece.solution[0],piece.solution[1]);},
  surveyLevels(){const targets=new Set(),pieces=new Set();let valid=0,minArea=99,maxArea=0,minPieces=99,maxPieces=0;for(let level=1;level<=20;level+=1){const blueprint=compilePolyBlueprint(level),target=[];for(const piece of blueprint.pieces)for(const [row,column] of rotatePolyCells(piece.cells,piece.solution[2]))target.push(polyCellKey(piece.solution[0]+row,piece.solution[1]+column));targets.add(target.sort().join("|"));pieces.add(blueprint.pieces.map((piece)=>piece.shapeId+"@"+piece.solution.join(":" )).join("/"));if(validatePolyBlueprint(blueprint))valid+=1;minArea=Math.min(minArea,blueprint.area);maxArea=Math.max(maxArea,blueprint.area);minPieces=Math.min(minPieces,blueprint.pieces.length);maxPieces=Math.max(maxPieces,blueprint.pieces.length);}return{count:20,valid,uniqueTargets:targets.size,uniquePieceSets:pieces.size,minArea,maxArea,minPieces,maxPieces};},
};
drawPolyomino();


redrawGameArt = () => { drawPolyomino(); };
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
  const identity = {"projectId":"2af177b7-0da4-44ee-9ffc-24dc96c821ef","versionId":"69aee572-3be2-480f-b978-09a4a63a3c2c"};
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