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
const config = {"title":"朱门华容","template":"klotski","difficulty":"standard","visualStyle":"line-art","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"board","inputModes":["drag","pointer","keyboard"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":[],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"klotski-01","label":"01 · 认识规则 · 初开朱门","tier":1,"tierLabel":"认识规则","variant":0,"seed":2154518771,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"初开朱门","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":2,"id":"klotski-02","label":"02 · 认识规则 · 双兵让道","tier":1,"tierLabel":"认识规则","variant":1,"seed":573755936,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"双兵让道","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":3,"id":"klotski-03","label":"03 · 认识规则 · 横梁移位","tier":1,"tierLabel":"认识规则","variant":2,"seed":3304737873,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"横梁移位","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":4,"id":"klotski-04","label":"04 · 认识规则 · 回廊换肩","tier":1,"tierLabel":"认识规则","variant":3,"seed":1719781254,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"回廊换肩","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"解锁稳定节奏"},{"number":5,"id":"klotski-05","label":"05 · 稳定节奏 · 侧门借位","tier":2,"tierLabel":"稳定节奏","variant":4,"seed":155795767,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"侧门借位","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":6,"id":"klotski-06","label":"06 · 稳定节奏 · 二空接力","tier":2,"tierLabel":"稳定节奏","variant":5,"seed":2870016868,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"二空接力","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":7,"id":"klotski-07","label":"07 · 稳定节奏 · 长将归边","tier":2,"tierLabel":"稳定节奏","variant":6,"seed":1306030741,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"长将归边","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":8,"id":"klotski-08","label":"08 · 稳定节奏 · 中心腾挪","tier":2,"tierLabel":"稳定节奏","variant":7,"seed":4024954058,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"中心腾挪","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"解锁加入变化"},{"number":9,"id":"klotski-09","label":"09 · 加入变化 · 折返三隙","tier":3,"tierLabel":"加入变化","variant":8,"seed":2444191355,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"折返三隙","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":10,"id":"klotski-10","label":"10 · 加入变化 · 双列换位","tier":3,"tierLabel":"加入变化","variant":9,"seed":813097384,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"双列换位","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":11,"id":"klotski-11","label":"11 · 加入变化 · 横刀解扣","tier":3,"tierLabel":"加入变化","variant":10,"seed":3527285721,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"横刀解扣","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":12,"id":"klotski-12","label":"12 · 加入变化 · 门前清障","tier":3,"tierLabel":"加入变化","variant":11,"seed":1959105806,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"门前清障","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"解锁组合压力"},{"number":13,"id":"klotski-13","label":"13 · 组合压力 · 深庭回旋","tier":4,"tierLabel":"组合压力","variant":12,"seed":378342591,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"深庭回旋","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":14,"id":"klotski-14","label":"14 · 组合压力 · 四角调兵","tier":4,"tierLabel":"组合压力","variant":13,"seed":3109324524,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"四角调兵","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":15,"id":"klotski-15","label":"15 · 组合压力 · 错层借道","tier":4,"tierLabel":"组合压力","variant":14,"seed":1528561693,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"错层借道","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"关卡星章"},{"number":16,"id":"klotski-16","label":"16 · 组合压力 · 窄门转轴","tier":4,"tierLabel":"组合压力","variant":15,"seed":4247501394,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"窄门转轴","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"解锁最终掌握"},{"number":17,"id":"klotski-17","label":"17 · 最终掌握 · 长廊逆行","tier":5,"tierLabel":"最终掌握","variant":16,"seed":2683516291,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"长廊逆行","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"大师徽记"},{"number":18,"id":"klotski-18","label":"18 · 最终掌握 · 层层设防","tier":5,"tierLabel":"最终掌握","variant":17,"seed":29011760,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"层层设防","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"大师徽记"},{"number":19,"id":"klotski-19","label":"19 · 最终掌握 · 水泄不通","tier":5,"tierLabel":"最终掌握","variant":18,"seed":2688690529,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"水泄不通","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"大师徽记"},{"number":20,"id":"klotski-20","label":"20 · 最终掌握 · 横刀立马","tier":5,"tierLabel":"最终掌握","variant":19,"seed":1107927190,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"横刀立马","mission":"规划腾挪顺序，以接近最优步数的路线打开朱门。","masteryRules":[{"id":"efficiency","label":"步数不超过最优参考的 150%","metric":"moves","comparison":"ratio-lte","referenceMetric":"optimalReference","target":1.5},{"id":"control","label":"保留完整可回放路径","metric":"replayLength","comparison":"ratio-gte","referenceMetric":"moves","target":1}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:e9da3f98-0ff5-4af3-ae47-d1ddd32c2f1c:12a6ba9c-3683-4c3b-a415-d57aa010a6f1","masteryStorageKey":"forge-mastery:e9da3f98-0ff5-4af3-ae47-d1ddd32c2f1c:12a6ba9c-3683-4c3b-a415-d57aa010a6f1"};
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


const initialPieces = [
  { id: "cao", label: "队长机器人", x: 1, y: 0, w: 2, h: 2, kind: "hero" },
  { id: "guan", label: "星星包裹", x: 1, y: 2, w: 2, h: 1, kind: "guard" },
  { id: "z1", label: "蓝色包裹", x: 0, y: 0, w: 1, h: 2, kind: "guard" },
  { id: "z2", label: "珊瑚包裹", x: 3, y: 0, w: 1, h: 2, kind: "guard" },
  { id: "z3", label: "蓝色包裹", x: 0, y: 2, w: 1, h: 2, kind: "guard" },
  { id: "z4", label: "珊瑚包裹", x: 3, y: 2, w: 1, h: 2, kind: "guard" },
  { id: "s1", label: "小熊包裹", x: 0, y: 4, w: 1, h: 1, kind: "soldier" },
  { id: "s2", label: "小猫包裹", x: 3, y: 4, w: 1, h: 1, kind: "soldier" },
  { id: "s3", label: "小熊包裹", x: 1, y: 3, w: 1, h: 1, kind: "soldier" },
  { id: "s4", label: "小猫包裹", x: 2, y: 3, w: 1, h: 1, kind: "soldier" },
];

const klotskiPieceOrder = ["z1","z2","z3","z4","guan","cao","s1","s2","s3","s4"];
const klotskiBlueprints = [
  ["初开朱门",8,[[0,0],[1,0],[2,0],[3,0],[0,3],[2,3],[0,2],[1,2],[0,4],[1,4]]],
  ["双兵让道",12,[[2,0],[3,0],[0,1],[1,1],[0,3],[2,3],[0,0],[1,0],[0,4],[1,4]]],
  ["横梁移位",16,[[2,0],[1,1],[0,3],[1,3],[2,2],[2,3],[0,0],[1,0],[3,0],[0,2]]],
  ["回廊换肩",20,[[0,0],[1,0],[2,0],[3,1],[2,4],[0,2],[3,0],[3,3],[0,4],[1,4]]],
  ["侧门借位",24,[[0,0],[1,0],[3,0],[3,2],[2,4],[1,2],[2,0],[2,1],[0,4],[1,4]]],
  ["二空接力",30,[[2,0],[3,0],[0,1],[0,3],[1,4],[1,2],[0,0],[1,1],[3,3],[3,4]]],
  ["长将归边",36,[[1,0],[3,0],[2,1],[3,2],[2,4],[0,3],[0,0],[0,1],[1,2],[2,3]]],
  ["中心腾挪",42,[[0,0],[2,0],[3,0],[1,2],[2,4],[2,2],[1,1],[0,2],[0,3],[1,4]]],
  ["折返三隙",48,[[0,0],[3,1],[2,2],[3,3],[0,4],[0,2],[1,0],[3,0],[1,1],[2,4]]],
  ["双列换位",54,[[1,0],[0,1],[2,1],[3,1],[2,4],[0,3],[0,0],[2,0],[1,2],[2,3]]],
  ["横刀解扣",60,[[2,0],[1,3],[2,3],[3,3],[1,2],[0,0],[3,0],[0,2],[3,2],[0,4]]],
  ["门前清障",66,[[2,0],[3,1],[1,3],[3,3],[1,2],[0,0],[3,0],[0,2],[0,4],[2,4]]],
  ["深庭回旋",72,[[3,1],[0,2],[1,2],[2,3],[0,4],[1,0],[0,0],[0,1],[2,2],[3,3]]],
  ["四角调兵",78,[[0,0],[2,0],[3,1],[0,3],[2,4],[1,2],[1,0],[1,1],[3,3],[1,4]]],
  ["错层借道",84,[[2,0],[3,0],[0,2],[2,3],[0,4],[0,0],[1,2],[1,3],[3,3],[3,4]]],
  ["窄门转轴",90,[[3,0],[2,1],[0,2],[3,3],[0,4],[0,0],[2,0],[1,2],[2,3],[2,4]]],
  ["长廊逆行",96,[[2,0],[1,2],[2,2],[3,2],[0,4],[0,0],[3,0],[3,1],[0,3],[2,4]]],
  ["层层设防",104,[[3,0],[3,2],[0,3],[1,3],[1,2],[0,0],[2,1],[0,2],[2,4],[3,4]]],
  ["水泄不通",112,[[1,0],[0,1],[1,2],[0,3],[2,4],[2,0],[2,2],[3,2],[3,3],[1,4]]],
  ["横刀立马",120,[[0,0],[3,1],[0,3],[2,3],[0,2],[1,0],[3,0],[1,3],[1,4],[3,4]]],
];

function activeKlotskiBlueprint() {
  return klotskiBlueprints[Math.max(0, Math.min(klotskiBlueprints.length - 1, currentCampaignLevel().number - 1))];
}

function createCampaignKlotskiPieces() {
  const blueprint = activeKlotskiBlueprint();
  return klotskiPieceOrder.map((id, index) => {
    const base = initialPieces.find((piece) => piece.id === id);
    return { ...base, x: blueprint[2][index][0], y: blueprint[2][index][1] };
  });
}
const courtyardArt = new Image();
courtyardArt.decoding = "async";
courtyardArt.src = "./assets/klotski-courtyard.png";
courtyardArt.addEventListener("load", () => drawKlotski());
let pieces = [];
let selectedId = "cao";
let moves = 0;
let moveAnimation = null;
let particles = [];
let blockedUntil = 0;
let exitOpen = false;
let winAt = 0;
let selectedAt = performance.now();
let klotskiHistory = [];
let klotskiRedo = [];
let replayPath = [];
let initialLayoutSnapshot = [];
let replaying = false;
let optimalReference = null;
let klotskiHint = null;
let klotskiHintDistance = null;

function klotskiLayout() {
  const cell = config.aspectRatio === "9:16" ? 144 : 112;
  return {
    cell,
    originX: (720 - cell * 4) / 2,
    originY: (gameSceneHeight() - cell * 5) / 2,
  };
}

function occupiedBy(piece, x, y) {
  return x >= piece.x && x < piece.x + piece.w && y >= piece.y && y < piece.y + piece.h;
}

function canMove(piece, dx, dy) {
  const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
  if (next.x < 0 || next.y < 0 || next.x + next.w > 4 || next.y + next.h > 5) return false;
  return !pieces.some((other) => other.id !== piece.id &&
    next.x < other.x + other.w && next.x + next.w > other.x && next.y < other.y + other.h && next.y + next.h > other.y);
}

function klotskiStateKey(state) {
  return state.map((piece) => [piece.kind, piece.w, piece.h, piece.x, piece.y].join(":" )).sort().join("|");
}

function klotskiStateCanMove(state, piece, dx, dy) {
  const nextX = piece.x + dx;
  const nextY = piece.y + dy;
  if (nextX < 0 || nextY < 0 || nextX + piece.w > 4 || nextY + piece.h > 5) return false;
  return !state.some((other) => other.id !== piece.id && nextX < other.x + other.w && nextX + piece.w > other.x && nextY < other.y + other.h && nextY + piece.h > other.y);
}

function solveKlotski(source = pieces) {
  const start = source.map(({ id, kind, w, h, x, y }) => ({ id, kind, w, h, x, y }));
  const startKey = klotskiStateKey(start);
  const queue = [start];
  const parents = new Map([[startKey, null]]);
  const parentMoves = new Map();
  let goalKey = null;
  for (let cursor = 0; cursor < queue.length && cursor < 26000; cursor += 1) {
    const state = queue[cursor];
    const stateKey = klotskiStateKey(state);
    const hero = state.find((piece) => piece.id === "cao");
    if (hero?.x === 1 && hero?.y === 3) { goalKey = stateKey; break; }
    for (const piece of state) for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      if (!klotskiStateCanMove(state, piece, dx, dy)) continue;
      const next = state.map((item) => item.id === piece.id ? { ...item, x: item.x + dx, y: item.y + dy } : { ...item });
      const nextKey = klotskiStateKey(next);
      if (parents.has(nextKey)) continue;
      parents.set(nextKey, stateKey);
      parentMoves.set(nextKey, { id: piece.id, dx, dy });
      queue.push(next);
    }
  }
  if (!goalKey) return null;
  let cursorKey = goalKey;
  let first = null;
  let distance = 0;
  while (parents.get(cursorKey)) {
    first = parentMoves.get(cursorKey);
    cursorKey = parents.get(cursorKey);
    distance += 1;
  }
  return { first, distance };
}

function requestKlotskiHint() {
  if (!running || moveAnimation || replaying) return;
  const solution = solveKlotski();
  klotskiHint = solution?.first ?? null;
  klotskiHintDistance = solution?.distance ?? null;
  if (!klotskiHint) { setStatus("当前状态没有可验证解法，请重开本关。"); return; }
  selectedId = klotskiHint.id;
  selectedAt = performance.now();
  const arrows = { "-1,0": "左", "1,0": "右", "0,-1": "上", "0,1": "下" };
  const piece = pieces.find((candidate) => candidate.id === klotskiHint.id);
  setStatus("提示：拖动“" + piece.label + "”向" + arrows[klotskiHint.dx + "," + klotskiHint.dy] + "一格。 ");
  spawnParticles(piece, "select", 10);
}

function pieceCenter(piece, x = piece.renderX, y = piece.renderY) {
  const { cell, originX, originY } = klotskiLayout();
  return {
    x: originX + (x + piece.w / 2) * cell,
    y: originY + (y + piece.h / 2) * cell,
  };
}

function spawnParticles(piece, type, count = 8) {
  const center = pieceCenter(piece);
  for (let index = 0; index < count; index += 1) {
    const angle = Math.PI * 2 * index / count + Math.random() * .35;
    const speed = type === "victory" ? 2.2 + Math.random() * 3.2 : .7 + Math.random() * 1.8;
    particles.push({
      x: center.x,
      y: center.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === "victory" ? 1.8 : .3),
      life: type === "victory" ? 72 + Math.random() * 32 : 34 + Math.random() * 22,
      maxLife: type === "victory" ? 104 : 56,
      size: type === "victory" ? 18 + Math.random() * 18 : 12 + Math.random() * 14,
      tone: index % 3,
    });
  }
}

function validMoves(piece) {
  return [
    { dx: -1, dy: 0, symbol: "←" },
    { dx: 1, dy: 0, symbol: "→" },
    { dx: 0, dy: -1, symbol: "↑" },
    { dx: 0, dy: 1, symbol: "↓" },
  ].filter((direction) => canMove(piece, direction.dx, direction.dy));
}

function snapshotKlotski() {
  return pieces.map(({ id, x, y }) => ({ id, x, y }));
}

function restoreKlotski(snapshot) {
  snapshot.forEach((saved) => {
    const piece = pieces.find((candidate) => candidate.id === saved.id);
    if (!piece) return;
    piece.x = saved.x; piece.y = saved.y; piece.renderX = saved.x; piece.renderY = saved.y;
  });
  moveAnimation = null;
  exitOpen = false;
  winAt = 0;
}

function undoKlotskiMove() {
  if (!running || moveAnimation || replaying || !klotskiHistory.length) return;
  const last = klotskiHistory.pop();
  const replayMove = replayPath.pop() ?? null;
  klotskiRedo.push({ snapshot: snapshotKlotski(), selectedId, replayMove });
  restoreKlotski(last.snapshot);
  moves = Math.max(0, moves - 1);
  selectedId = last.selectedId;
  selectedAt = performance.now();
  setMetric(String(moves));
  setStatus("已撤销一步 · 当前 " + moves + " 步 · 最优 " + optimalReference + " 步。 ");
  playSound("move");
}

function redoKlotskiMove() {
  if (!running || moveAnimation || replaying || !klotskiRedo.length) return;
  const next = klotskiRedo.pop();
  klotskiHistory.push({ snapshot: snapshotKlotski(), selectedId });
  restoreKlotski(next.snapshot);
  if (next.replayMove) replayPath.push(next.replayMove);
  selectedId = next.selectedId;
  selectedAt = performance.now();
  moves += 1;
  setMetric(String(moves));
  setStatus("已重做一步 · 当前 " + moves + " 步 · 最优 " + optimalReference + " 步。 ");
  playSound("move");
}

async function replayKlotskiMoves() {
  if (!running || moveAnimation || replaying || !replayPath.length) return;
  const path = replayPath.map((move) => ({ ...move }));
  replaying = true;
  restoreKlotski(initialLayoutSnapshot);
  moves = 0;
  klotskiHistory = [];
  setMetric("0");
  setStatus("正在回放 " + path.length + " 步操作……");
  for (const move of path) {
    selectedId = move.id;
    moveSelected(move.dx, move.dy, true);
    await new Promise((resolve) => setTimeout(resolve, 245));
  }
  replayPath = path;
  replaying = false;
  setStatus("回放完成 · 可继续操作或撤销。 ");
}

function moveSelected(dx, dy, fromReplay = false, preserveRedo = false) {
  if (!running || moveAnimation) return false;
  const piece = pieces.find((candidate) => candidate.id === selectedId);
  if (!piece || !canMove(piece, dx, dy)) {
    blockedUntil = performance.now() + 280;
    if (piece) spawnParticles(piece, "blocked", 6);
    setStatus("这条方向被挡住了；发光箭头表示当前可以移动的位置。");
    playSound("fail");
    return false;
  }
  const fromX = piece.renderX;
  const fromY = piece.renderY;
  klotskiHint = null;
  klotskiHintDistance = null;
  if (!fromReplay) {
    if (!preserveRedo) klotskiRedo = [];
    klotskiHistory.push({ snapshot: snapshotKlotski(), selectedId });
    replayPath.push({ id: piece.id, dx, dy });
  } else klotskiHistory.push({ snapshot: snapshotKlotski(), selectedId });
  piece.x += dx;
  piece.y += dy;
  moveAnimation = {
    piece,
    fromX,
    fromY,
    toX: piece.x,
    toY: piece.y,
    startedAt: performance.now(),
    duration: 210,
  };
  moves += 1;
  setMetric(String(moves));
  setStatus("正在移动“" + piece.label + "”；目标是让队长机器人抵达发光出口。");
  spawnParticles(piece, "move", 5);
  playSound("move");
  return true;
}

function completeMove(animation) {
  animation.piece.renderX = animation.toX;
  animation.piece.renderY = animation.toY;
  moveAnimation = null;
  selectedAt = performance.now();
  if (animation.piece.id === "cao" && animation.piece.x === 1 && animation.piece.y === 3) {
    exitOpen = true;
    winAt = performance.now() + 780;
    spawnParticles(animation.piece, "victory", 30);
    setStatus("朱门已经开启，队长机器人正在穿过出口……");
  } else {
    setStatus("已移动“" + animation.piece.label + "”；继续利用发光方向提示腾出出口。");
  }
}

function updateKlotskiEffects(timestamp) {
  if (moveAnimation) {
    const progress = Math.min(1, (timestamp - moveAnimation.startedAt) / moveAnimation.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    moveAnimation.piece.renderX = moveAnimation.fromX + (moveAnimation.toX - moveAnimation.fromX) * eased;
    moveAnimation.piece.renderY = moveAnimation.fromY + (moveAnimation.toY - moveAnimation.fromY) * eased;
    if (progress >= 1) completeMove(moveAnimation);
  }
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += .035;
    particle.life -= 1;
  });
  particles = particles.filter((particle) => particle.life > 0);
  if (winAt && timestamp >= winAt) {
    winAt = 0;
    showResult(true, "朱门流光开启", "队长机器人穿过了发光门庭，共移动 " + moves + " 步。");
  }
}

function drawCourtyard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4e4cd";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (courtyardArt.complete && courtyardArt.naturalWidth) {
    ctx.save();
    drawImageCover(courtyardArt, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,248,236,.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function drawExit(originX, originY, cell, timestamp) {
  const pulse = .5 + Math.sin(timestamp / 230) * .22;
  const exitX = originX + cell;
  const exitY = originY + cell * 5 - 24;
  ctx.save();
  const glow = ctx.createRadialGradient(exitX + cell, exitY + 14, 12, exitX + cell, exitY + 14, cell * 1.3);
  glow.addColorStop(0, exitOpen ? "rgba(255,244,172,.95)" : "rgba(255,115,103," + pulse + ")");
  glow.addColorStop(1, "rgba(255,115,103,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(exitX - cell * .5, exitY - cell * .6, cell * 3, cell * 1.4);
  drawBitmapSprite(7, exitX, exitY - 2, cell * 2, 44, { fallback: palette.secondary, radius: 14, padding: 8, alpha: exitOpen ? 1 : .9 });
  ctx.restore();
}

function drawMoveGuides(piece, originX, originY, cell, timestamp) {
  if (!running || moveAnimation || exitOpen) return;
  const guideStrength = currentCampaignLevel().tier >= 4 ? .46 : currentCampaignLevel().tier >= 3 ? .58 : .68;
  const pulse = guideStrength + Math.sin(timestamp / 180) * .16;
  ctx.save();
  ctx.font = "700 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  validMoves(piece).forEach((direction) => {
    const x = originX + (piece.x + piece.w / 2 + direction.dx * (piece.w / 2 + .22)) * cell;
    const y = originY + (piece.y + piece.h / 2 + direction.dy * (piece.h / 2 + .22)) * cell;
    ctx.beginPath();
    ctx.arc(x, y, 19 + pulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,228,128," + pulse + ")";
    ctx.fill();
    ctx.fillStyle = "#5d3b3e";
    ctx.fillText(direction.symbol, x, y + 1);
  });
  ctx.restore();
}

function pieceSprite(piece) {
  if (piece.kind === "hero") return 0;
  if (piece.kind === "guard") return piece.w > piece.h ? 3 : (Number(piece.id.slice(-1)) % 2 ? 1 : 2);
  return piece.id.charCodeAt(piece.id.length - 1) % 2 ? 4 : 5;
}

function pieceScale(piece) {
  if (piece.kind === "hero") return .94;
  if (piece.kind === "soldier") return .92;
  if (piece.w > piece.h) return .94;
  return .96;
}

function pieceSourceRect(piece) {
  const sprite = pieceSprite(piece);
  if (sprite === 3) return { x: .08, y: .3, width: .84, height: .66 };
  if (sprite === 4 || sprite === 5) return { x: .17, y: .32, width: .66, height: .64 };
  return null;
}

function pieceFrameTone(piece) {
  if (piece.kind === "hero") return { fill: "#fff3d5", stroke: "#8f3d43" };
  const sprite = pieceSprite(piece);
  if (sprite === 1) return { fill: "#e5f5ff", stroke: "#2d759c" };
  if (sprite === 2) return { fill: "#fff0e9", stroke: "#b65751" };
  if (sprite === 3) return { fill: "#fff7d7", stroke: "#a96f1e" };
  if (sprite === 4) return { fill: "#f3eaff", stroke: "#765b91" };
  return { fill: "#fff0e8", stroke: "#a85e55" };
}

function drawBoardGrid(originX, originY, cell) {
  ctx.save();
  ctx.strokeStyle = "rgba(105,55,58,.24)";
  ctx.lineWidth = 2;
  for (let column = 0; column <= 4; column += 1) {
    ctx.beginPath();
    ctx.moveTo(originX + column * cell, originY);
    ctx.lineTo(originX + column * cell, originY + cell * 5);
    ctx.stroke();
  }
  for (let row = 0; row <= 5; row += 1) {
    ctx.beginPath();
    ctx.moveTo(originX, originY + row * cell);
    ctx.lineTo(originX + cell * 4, originY + row * cell);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPiece(piece, originX, originY, cell, timestamp) {
  const inset = 5;
  let x = originX + piece.renderX * cell + inset;
  let y = originY + piece.renderY * cell + inset;
  const width = piece.w * cell - inset * 2;
  const height = piece.h * cell - inset * 2;
  const selected = piece.id === selectedId;
  const frame = pieceFrameTone(piece);
  if (selected && !moveAnimation) y -= Math.sin((timestamp - selectedAt) / 170) * 2.5;
  if (selected && timestamp < blockedUntil) x += Math.sin((blockedUntil - timestamp) * .16) * 8;
  ctx.save();
  ctx.fillStyle = "rgba(53,27,35,.26)";
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 8, width, height, 18);
  ctx.fill();
  if (selected) {
    const glow = ctx.createRadialGradient(x + width / 2, y + height / 2, 12, x + width / 2, y + height / 2, Math.max(width, height) * .72);
    glow.addColorStop(0, "rgba(255,239,158,.5)");
    glow.addColorStop(1, "rgba(255,193,92,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 18, y - 18, width + 36, height + 36);
  }
  ctx.fillStyle = frame.fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(20, styleProfile.corner || 14));
  ctx.fill();
  drawBitmapSprite(pieceSprite(piece), x, y, width, height, {
    fallback: frame.fill,
    radius: Math.min(20, styleProfile.corner || 14),
    padding: 7,
    scale: pieceScale(piece),
    sourceRect: pieceSourceRect(piece),
  });
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, width - 4, height - 4, Math.min(18, styleProfile.corner || 12));
  ctx.strokeStyle = selected ? "#ffbf38" : "rgba(82,45,49,.92)";
  ctx.lineWidth = selected ? 8 : 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 8, width - 16, height - 16, Math.min(14, styleProfile.corner || 10));
  ctx.strokeStyle = selected ? "rgba(255,255,232,.96)" : frame.stroke;
  ctx.lineWidth = selected ? 2 : 3;
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    const alpha = Math.min(1, particle.life / Math.max(1, particle.maxLife * .45));
    const sprite = particle.tone === 0 ? 8 : particle.tone === 1 ? 6 : 7;
    drawBitmapSprite(sprite, particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size, {
      fallback: particle.tone === 0 ? "#fff0c4" : particle.tone === 1 ? "#ff8d7c" : "#8de0d0",
      circle: true,
      padding: 12,
      alpha,
      rotation: particle.x * .01,
    });
  });
}

function drawKlotski(timestamp = performance.now()) {
  drawCourtyard();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const { cell, originX, originY } = klotskiLayout();
  drawPlayfield(originX - 22, originY - 22, cell * 4 + 44, cell * 5 + 44, {
    radius: 34,
    alpha: .72,
    fill: "rgba(255,247,230,.76)",
    stroke: "rgba(185,78,71,.62)",
    lineWidth: 5,
  });
  drawBoardGrid(originX, originY, cell);
  drawExit(originX, originY, cell, timestamp);
  const selectedPiece = pieces.find((piece) => piece.id === selectedId);
  if (selectedPiece) drawMoveGuides(selectedPiece, originX, originY, cell, timestamp);
  pieces.forEach((piece) => drawPiece(piece, originX, originY, cell, timestamp));
  drawParticles();
  ctx.restore();
  finishCanvasStyle();
}

function animationLoop(timestamp) {
  updateKlotskiEffects(timestamp);
  drawKlotski(timestamp);
  requestAnimationFrame(animationLoop);
}

let klotskiDrag = null;
let suppressKlotskiClick = false;
canvas.addEventListener("pointerdown", (event) => {
  if (!running || moveAnimation || replaying) return;
  const { x: px, y: py } = eventScenePoint(event);
  const { cell, originX, originY } = klotskiLayout();
  const gridX = Math.floor((px - originX) / cell);
  const gridY = Math.floor((py - originY) / cell);
  const piece = pieces.find((candidate) => occupiedBy(candidate, gridX, gridY));
  if (!piece) return;
  selectedId = piece.id;
  selectedAt = performance.now();
  klotskiDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture?.(event.pointerId);
});

canvas.addEventListener("pointerup", async (event) => {
  if (!klotskiDrag || klotskiDrag.id !== event.pointerId) return;
  const drag = klotskiDrag;
  klotskiDrag = null;
  canvas.releasePointerCapture?.(event.pointerId);
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / Math.max(1, rect.width);
  const deltaX = (event.clientX - drag.x) * scale;
  const deltaY = (event.clientY - drag.y) * scale;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
  const horizontal = Math.abs(deltaX) >= Math.abs(deltaY);
  const dx = horizontal ? Math.sign(deltaX) : 0;
  const dy = horizontal ? 0 : Math.sign(deltaY);
  const distance = horizontal ? Math.abs(deltaX) : Math.abs(deltaY);
  const steps = Math.max(1, Math.min(4, Math.round(distance / klotskiLayout().cell)));
  suppressKlotskiClick = true;
  for (let index = 0; index < steps; index += 1) {
    if (!moveSelected(dx, dy, false, index > 0)) break;
    await new Promise((resolve) => setTimeout(resolve, 220));
  }
  setTimeout(() => { suppressKlotskiClick = false; }, 0);
});
canvas.addEventListener("pointercancel", () => { klotskiDrag = null; });
canvas.addEventListener("lostpointercapture", () => { klotskiDrag = null; });

canvas.addEventListener("click", (event) => {
  if (suppressKlotskiClick) return;
  if (moveAnimation) return;
  const { x: px, y: py } = eventScenePoint(event);
  const { cell, originX, originY } = klotskiLayout();
  const gridX = Math.floor((px - originX) / cell);
  const gridY = Math.floor((py - originY) / cell);
  const piece = pieces.find((candidate) => occupiedBy(candidate, gridX, gridY));
  if (piece) {
    selectedId = piece.id;
    selectedAt = performance.now();
    spawnParticles(piece, "select", 5);
    setStatus("已选择“" + piece.label + "”；发光箭头显示当前可以移动的方向。");
  }
});

function resetPieces() {
  resetCampaignRandom();
  pieces = createCampaignKlotskiPieces().map((piece) => ({ ...piece, renderX: piece.x, renderY: piece.y }));
  optimalReference = activeKlotskiBlueprint()[1];
  selectedId = "cao";
  moves = 0;
  moveAnimation = null;
  particles = [];
  blockedUntil = 0;
  exitOpen = false;
  winAt = 0;
  selectedAt = performance.now();
  klotskiHistory = [];
  klotskiRedo = [];
  replayPath = [];
  replaying = false;
  klotskiHint = null;
  klotskiHintDistance = null;
  initialLayoutSnapshot = snapshotKlotski();
}

function startGame() {
  resetPieces();
  running = true;
  hideOverlay();
  setMetric("0");
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + activeKlotskiBlueprint()[0] + " · 最优 " + optimalReference + " 步；拖动棋子让队长机器人抵达出口。");
  startAmbient();
}

function handleControl(value) {
  const vectors = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  if (vectors[value]) moveSelected(vectors[value][0], vectors[value][1]);
  if (value === "undo") undoKlotskiMove();
  if (value === "redo") redoKlotskiMove();
  if (value === "hint") requestKlotskiHint();
  if (value === "replay") replayKlotskiMoves();
}

function handleKey(key) {
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", z: "undo", Z: "undo", y: "redo", Y: "redo", h: "hint", H: "hint", r: "replay", R: "replay" };
  if (map[key]) handleControl(map[key]);
}

resetPieces();
runtimeDebugState = () => {
  const layout = klotskiLayout();
  const dragEntry = pieces.map((piece) => ({ piece, move: validMoves(piece)[0] })).find((entry) => entry.move);
  const dragProbe = dragEntry ? {
    id: dragEntry.piece.id,
    from: { x: layout.originX + (dragEntry.piece.x + dragEntry.piece.w / 2) * layout.cell, y: layout.originY + (dragEntry.piece.y + dragEntry.piece.h / 2) * layout.cell },
    to: { x: layout.originX + (dragEntry.piece.x + dragEntry.piece.w / 2 + dragEntry.move.dx) * layout.cell, y: layout.originY + (dragEntry.piece.y + dragEntry.piece.h / 2 + dragEntry.move.dy) * layout.cell },
  } : null;
  const hintedPiece = klotskiHint ? pieces.find((piece) => piece.id === klotskiHint.id) : null;
  return { level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, blueprintName: activeKlotskiBlueprint()[0], layoutCount: klotskiBlueprints.length, uniqueBlueprints: new Set(klotskiBlueprints.map((item) => JSON.stringify(item[2]))).size, moves, canUndo: klotskiHistory.length > 0, canRedo: klotskiRedo.length > 0, replayLength: replayPath.length, replaying, optimalReference, optimalExact: Number.isInteger(optimalReference), transitionMs: 210, directDrag: true, dragProbe, canvasSize: { width: canvas.width, height: canvas.height }, hint: klotskiHint, hintDistance: klotskiHintDistance, hintLegal: Boolean(hintedPiece && klotskiStateCanMove(pieces, hintedPiece, klotskiHint.dx, klotskiHint.dy)), boardWidthRatio: Number(((layout.cell * 4 + 44) / 720 * 100).toFixed(1)), identityUsesShapeAndBitmap: true, pieceGap: 10, pieceOutlineWidth: 6, incompleteArtIsCropped: true, pieceState: pieces.map(({ id, x, y }) => ({ id, x, y })) };
};
runtimeDebugActions = {
  undo: undoKlotskiMove,
  redo: redoKlotskiMove,
  hint: requestKlotskiHint,
  replay: replayKlotskiMoves,
  legalMove() {
    const movable = pieces.map((piece) => ({ piece, moves: validMoves(piece) })).find((entry) => entry.moves.length);
    if (!movable) return false;
    selectedId = movable.piece.id;
    moveSelected(movable.moves[0].dx, movable.moves[0].dy);
    return true;
  },
};
requestAnimationFrame(animationLoop);


redrawGameArt = () => { drawKlotski(); };
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
  const identity = {"projectId":"e9da3f98-0ff5-4af3-ae47-d1ddd32c2f1c","versionId":"12a6ba9c-3683-4c3b-a415-d57aa010a6f1"};
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