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
const config = {"title":"数织矩阵","template":"merge-2048","difficulty":"standard","visualStyle":"fashion","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"board","inputModes":["swipe","keyboard"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":[],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"merge-2048-01","label":"01 · 认识规则 · 成双启程","tier":1,"tierLabel":"认识规则","variant":0,"seed":2840506705,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"成双启程","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":2,"id":"merge-2048-02","label":"02 · 认识规则 · 角落锚点","tier":1,"tierLabel":"认识规则","variant":1,"seed":186071938,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"角落锚点","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":3,"id":"merge-2048-03","label":"03 · 认识规则 · 余白四格","tier":1,"tierLabel":"认识规则","variant":2,"seed":3990857203,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"余白四格","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":4,"id":"merge-2048-04","label":"04 · 认识规则 · 六十四结点","tier":1,"tierLabel":"认识规则","variant":3,"seed":1336159780,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"六十四结点","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"解锁稳定节奏"},{"number":5,"id":"merge-2048-05","label":"05 · 稳定节奏 · 双并同拍","tier":2,"tierLabel":"稳定节奏","variant":4,"seed":543991957,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"双并同拍","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":6,"id":"merge-2048-06","label":"06 · 稳定节奏 · 三段回声","tier":2,"tierLabel":"稳定节奏","variant":5,"seed":2184516294,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"三段回声","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":7,"id":"merge-2048-07","label":"07 · 稳定节奏 · 高低分流","tier":2,"tierLabel":"稳定节奏","variant":6,"seed":1694341943,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"高低分流","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":8,"id":"merge-2048-08","label":"08 · 稳定节奏 · 百二十八核","tier":2,"tierLabel":"稳定节奏","variant":7,"seed":3334604136,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"百二十八核","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"解锁加入变化"},{"number":9,"id":"merge-2048-09","label":"09 · 加入变化 · 下一块·二","tier":3,"tierLabel":"加入变化","variant":8,"seed":3096088537,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"下一块·二","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":10,"id":"merge-2048-10","label":"10 · 加入变化 · 下一块·四","tier":3,"tierLabel":"加入变化","variant":9,"seed":424871946,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"下一块·四","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":11,"id":"merge-2048-11","label":"11 · 加入变化 · 预兆转向","tier":3,"tierLabel":"加入变化","variant":10,"seed":4212912763,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"预兆转向","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":12,"id":"merge-2048-12","label":"12 · 加入变化 · 二百五十六门","tier":3,"tierLabel":"加入变化","variant":11,"seed":1574993068,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"二百五十六门","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"解锁组合压力"},{"number":13,"id":"merge-2048-13","label":"13 · 组合压力 · 密阵开局","tier":4,"tierLabel":"组合压力","variant":12,"seed":1068033309,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"密阵开局","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":14,"id":"merge-2048-14","label":"14 · 组合压力 · 一步回溯","tier":4,"tierLabel":"组合压力","variant":13,"seed":2423353166,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"一步回溯","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":15,"id":"merge-2048-15","label":"15 · 组合压力 · 限步织造","tier":4,"tierLabel":"组合压力","variant":14,"seed":1916398015,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"限步织造","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"关卡星章"},{"number":16,"id":"merge-2048-16","label":"16 · 组合压力 · 五百一十二塔","tier":4,"tierLabel":"组合压力","variant":15,"seed":3557708784,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"五百一十二塔","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"解锁最终掌握"},{"number":17,"id":"merge-2048-17","label":"17 · 最终掌握 · 千位角锚","tier":5,"tierLabel":"最终掌握","variant":16,"seed":3067534369,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"千位角锚","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"大师徽记"},{"number":18,"id":"merge-2048-18","label":"18 · 最终掌握 · 零撤销局","tier":5,"tierLabel":"最终掌握","variant":17,"seed":681526930,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"零撤销局","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"大师徽记"},{"number":19,"id":"merge-2048-19","label":"19 · 最终掌握 · 连锁三响","tier":5,"tierLabel":"最终掌握","variant":18,"seed":2305278147,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"连锁三响","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"大师徽记"},{"number":20,"id":"merge-2048-20","label":"20 · 最终掌握 · 二〇四八核心","tier":5,"tierLabel":"最终掌握","variant":19,"seed":1798064436,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"二〇四八核心","mission":"根据本关开局、下一块预告与任务条件规划滑动，在锁死前完成目标。","masteryRules":[{"id":"efficiency","label":"得分达到目标数字的 2 倍","metric":"score","comparison":"ratio-gte","referenceMetric":"target","target":2},{"id":"control","label":"完成时至少保留 4 个空格","metric":"availableCells","comparison":"gte","target":4}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:00adee1e-4ae0-4f75-b377-bc3a6cd22ff4:8e30263f-359c-4acc-b87a-55ce48a36b61","masteryStorageKey":"forge-mastery:00adee1e-4ae0-4f75-b377-bc3a6cd22ff4:8e30263f-359c-4acc-b87a-55ce48a36b61"};
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


const boardSize = 4;
const mergeMoveDuration = 168;
const mergeSpawnDuration = 138;
const mergeSessionKey = config.campaignStorageKey + ":merge-session-v2";
const mergeBlueprints = [
  { name: "成双启程", target: 64, missionType: "target", missionValue: 64, moveLimit: 0, undo: 2, opening: [[0,0,0,0],[0,2,0,0],[0,0,2,0],[0,0,0,0]] },
  { name: "角落锚点", target: 64, missionType: "corner", missionValue: 32, moveLimit: 0, undo: 2, opening: [[2,0,0,0],[0,2,0,0],[0,0,4,0],[0,0,0,0]] },
  { name: "余白四格", target: 64, missionType: "reserve", missionValue: 6, moveLimit: 0, undo: 2, opening: [[2,0,0,2],[0,4,0,0],[0,0,0,0],[0,0,0,0]] },
  { name: "六十四结点", target: 64, missionType: "target", missionValue: 64, moveLimit: 42, undo: 2, opening: [[0,0,0,0],[2,2,0,0],[0,0,4,0],[0,0,0,0]] },
  { name: "双并同拍", target: 128, missionType: "multi", missionValue: 2, moveLimit: 0, undo: 2, opening: [[2,2,0,0],[2,2,0,0],[0,0,4,0],[0,0,0,0]] },
  { name: "三段回声", target: 128, missionType: "streak", missionValue: 3, moveLimit: 0, undo: 2, opening: [[2,2,4,4],[0,0,0,0],[0,2,0,2],[0,0,0,0]] },
  { name: "高低分流", target: 128, missionType: "edge", missionValue: 32, moveLimit: 0, undo: 2, opening: [[16,8,4,2],[0,0,0,0],[2,0,2,0],[0,0,0,0]] },
  { name: "百二十八核", target: 128, missionType: "target", missionValue: 128, moveLimit: 68, undo: 2, opening: [[8,4,2,0],[4,2,0,0],[2,0,0,0],[0,0,0,0]] },
  { name: "下一块·二", target: 256, missionType: "preview-two", missionValue: 4, moveLimit: 0, undo: 2, opening: [[0,2,0,0],[0,2,0,0],[0,4,0,0],[0,0,0,0]] },
  { name: "下一块·四", target: 256, missionType: "preview-four", missionValue: 2, moveLimit: 0, undo: 2, opening: [[4,0,4,0],[0,2,0,2],[0,0,0,0],[0,0,0,0]] },
  { name: "预兆转向", target: 256, missionType: "preview", missionValue: 6, moveLimit: 0, undo: 2, opening: [[8,4,0,0],[4,2,0,0],[0,0,2,0],[0,0,0,0]] },
  { name: "二百五十六门", target: 256, missionType: "target", missionValue: 256, moveLimit: 96, undo: 2, opening: [[16,8,4,2],[8,4,2,0],[4,2,0,0],[0,0,0,0]] },
  { name: "密阵开局", target: 512, missionType: "reserve", missionValue: 5, moveLimit: 0, undo: 2, opening: [[2,4,8,16],[4,8,0,0],[2,4,0,0],[0,0,0,0]] },
  { name: "一步回溯", target: 512, missionType: "undo", missionValue: 1, moveLimit: 0, undo: 1, opening: [[2,2,4,8],[0,0,4,8],[0,0,0,0],[0,0,0,0]] },
  { name: "限步织造", target: 512, missionType: "target", missionValue: 512, moveLimit: 118, undo: 1, opening: [[32,16,8,4],[16,8,4,2],[0,0,0,0],[0,0,0,0]] },
  { name: "五百一十二塔", target: 512, missionType: "edge", missionValue: 256, moveLimit: 124, undo: 1, opening: [[64,32,16,8],[0,8,4,2],[0,0,0,0],[0,0,0,0]] },
  { name: "千位角锚", target: 1024, missionType: "corner", missionValue: 512, moveLimit: 0, undo: 1, opening: [[128,64,32,16],[64,32,16,8],[0,0,4,2],[0,0,0,0]] },
  { name: "零撤销局", target: 1024, missionType: "target", missionValue: 1024, moveLimit: 166, undo: 0, opening: [[128,64,32,16],[64,32,16,8],[32,16,8,4],[0,0,0,2]] },
  { name: "连锁三响", target: 1024, missionType: "streak", missionValue: 5, moveLimit: 0, undo: 1, opening: [[64,64,32,32],[16,16,8,8],[4,4,2,2],[0,0,0,0]] },
  { name: "二〇四八核心", target: 2048, missionType: "target", missionValue: 2048, moveLimit: 0, undo: 1, opening: [[256,128,64,32],[128,64,32,16],[64,32,16,8],[4,2,0,0]] },
];

let board2048 = [];
let mergeScore = 0;
let bestTile = 2;
let historicalBest = 0;
let mergeTarget = 64;
let mergeBlueprint = mergeBlueprints[0];
let mergeNextValue = 2;
let mergeRngState = 1;
let mergeHistory = null;
let mergeAnimation = null;
let mergeQueuedDirection = null;
let mergeLastSpawn = null;
let mergeInvalidUntil = 0;
let mergeInvalidDirection = "";
let mergeUndoCredits = 2;
let mergeMoves = 0;
let mergeMerges = 0;
let mergePeakStreak = 0;
let mergeStreak = 0;
let mergeBestMulti = 0;
let mergePreviewTwos = 0;
let mergePreviewFours = 0;
let mergeUndoUsed = 0;
let mergeEndless = false;
let mergeContinueState = null;
let mergeTutorialVisible = true;

function activeMergeBlueprint() {
  return mergeBlueprints[Math.max(0, Math.min(mergeBlueprints.length - 1, currentCampaignLevel().number - 1))];
}

function emptyBoard() {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
}

function cloneBoard(value) {
  return value.map((row) => [...row]);
}

function readHistoricalBest() {
  try { return Math.max(0, Number(safeStorage.getItem(config.campaignStorageKey + ":2048-best")) || 0); } catch { return 0; }
}

function writeHistoricalBest() {
  historicalBest = Math.max(historicalBest, mergeScore);
  try { safeStorage.setItem(config.campaignStorageKey + ":2048-best", String(historicalBest)); } catch {}
}

function seedMergeRandom() {
  mergeRngState = (currentCampaignLevel().seed ^ 0x2048cafe) >>> 0;
  if (!mergeRngState) mergeRngState = 1;
}

function mergeRandom() {
  mergeRngState = (Math.imul(1664525, mergeRngState) + 1013904223) >>> 0;
  return mergeRngState / 4294967296;
}

function chooseSpawnValue() {
  const fourChance = config.difficulty === "relaxed" ? .05 : config.difficulty === "challenging" ? .18 : .1;
  return mergeRandom() < fourChance ? 4 : 2;
}

function availableCells(value = board2048) {
  const cells = [];
  for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
    if (value[row][column] === 0) cells.push({ row, column });
  }
  return cells;
}

function spawnNumber() {
  const cells = availableCells();
  if (!cells.length) return false;
  const cell = cells[Math.floor(mergeRandom() * cells.length)];
  const value = mergeNextValue;
  board2048[cell.row][cell.column] = value;
  mergeLastSpawn = { row: cell.row, column: cell.column, value, at: performance.now() };
  if (value === 4) mergePreviewFours += 1; else mergePreviewTwos += 1;
  mergeNextValue = chooseSpawnValue();
  return true;
}

function lineCoordinates(index, direction) {
  const coordinates = [];
  for (let offset = 0; offset < boardSize; offset += 1) {
    if (direction === "left") coordinates.push({ row: index, column: offset });
    if (direction === "right") coordinates.push({ row: index, column: boardSize - 1 - offset });
    if (direction === "up") coordinates.push({ row: offset, column: index });
    if (direction === "down") coordinates.push({ row: boardSize - 1 - offset, column: index });
  }
  return coordinates;
}

function resolveMergeMove(source, direction) {
  const next = emptyBoard();
  const movements = [];
  const mergedCells = [];
  let scoreGain = 0;
  for (let lineIndex = 0; lineIndex < boardSize; lineIndex += 1) {
    const coordinates = lineCoordinates(lineIndex, direction);
    const items = coordinates.map((from) => ({ value: source[from.row][from.column], from })).filter((item) => item.value > 0);
    let itemIndex = 0;
    let destinationIndex = 0;
    while (itemIndex < items.length) {
      const first = items[itemIndex];
      const second = items[itemIndex + 1];
      const to = coordinates[destinationIndex];
      if (second && first.value === second.value) {
        const resultValue = first.value * 2;
        next[to.row][to.column] = resultValue;
        movements.push({ from: first.from, to, value: first.value, merged: true }, { from: second.from, to, value: second.value, merged: true });
        mergedCells.push({ ...to, value: resultValue });
        scoreGain += resultValue;
        itemIndex += 2;
      } else {
        next[to.row][to.column] = first.value;
        movements.push({ from: first.from, to, value: first.value, merged: false });
        itemIndex += 1;
      }
      destinationIndex += 1;
    }
  }
  return { next, movements, mergedCells, scoreGain, changed: JSON.stringify(next) !== JSON.stringify(source) };
}

function hasAvailableMove(value = board2048) {
  if (availableCells(value).length) return true;
  for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
    const current = value[row][column];
    if (row + 1 < boardSize && value[row + 1][column] === current) return true;
    if (column + 1 < boardSize && value[row][column + 1] === current) return true;
  }
  return false;
}

function boardHasMonotonicEdge() {
  const edges = [board2048[0], board2048[3], board2048.map((row) => row[0]), board2048.map((row) => row[3])];
  return edges.some((edge) => {
    const values = edge.filter(Boolean);
    if (values.length < 3) return false;
    const down = values.every((value, index) => index === 0 || values[index - 1] >= value);
    const up = values.every((value, index) => index === 0 || values[index - 1] <= value);
    return down || up;
  });
}

function bestTileInCorner() {
  return [board2048[0][0], board2048[0][3], board2048[3][0], board2048[3][3]].includes(bestTile);
}

function mergeMissionProgress() {
  const type = mergeBlueprint.missionType;
  if (type === "target") return bestTile;
  if (type === "corner") return bestTileInCorner() ? bestTile : 0;
  if (type === "reserve") return availableCells().length;
  if (type === "multi") return mergeBestMulti;
  if (type === "streak") return mergePeakStreak;
  if (type === "edge") return boardHasMonotonicEdge() ? Math.max(...board2048.flat()) : 0;
  if (type === "preview-two") return mergePreviewTwos;
  if (type === "preview-four") return mergePreviewFours;
  if (type === "preview") return mergePreviewTwos + mergePreviewFours;
  if (type === "undo") return mergeUndoUsed;
  return bestTile;
}

function mergeMissionLabel() {
  const labels = {
    target: "合成目标数字", corner: "让最高数字停在角落", reserve: "移动后保留空格", multi: "一次完成多组合并",
    streak: "连续有效合并", edge: "建立单调边缘", "preview-two": "利用即将出现的 2", "preview-four": "利用即将出现的 4",
    preview: "根据下一块连续规划", undo: "使用一次回溯再完成目标",
  };
  return labels[mergeBlueprint.missionType] || "合成目标数字";
}

function mergeMissionComplete() {
  const progress = mergeMissionProgress();
  const missionMet = progress >= mergeBlueprint.missionValue;
  const foundation = mergeBlueprint.missionType === "target" ? true : bestTile >= Math.min(mergeBlueprint.target, 64);
  return missionMet && foundation;
}

function mergeSnapshot() {
  return {
    board: cloneBoard(board2048), score: mergeScore, bestTile, nextValue: mergeNextValue, rngState: mergeRngState,
    undoCredits: mergeUndoCredits, moves: mergeMoves, merges: mergeMerges, streak: mergeStreak, peakStreak: mergePeakStreak,
    bestMulti: mergeBestMulti, previewTwos: mergePreviewTwos, previewFours: mergePreviewFours, undoUsed: mergeUndoUsed,
  };
}

function restoreMergeSnapshot(state) {
  board2048 = cloneBoard(state.board); mergeScore = state.score; bestTile = state.bestTile; mergeNextValue = state.nextValue;
  mergeRngState = state.rngState; mergeUndoCredits = state.undoCredits; mergeMoves = state.moves; mergeMerges = state.merges;
  mergeStreak = state.streak; mergePeakStreak = state.peakStreak; mergeBestMulti = state.bestMulti;
  mergePreviewTwos = state.previewTwos; mergePreviewFours = state.previewFours; mergeUndoUsed = state.undoUsed;
}

function saveMergeSession() {
  if (!running || mergeEndless) return;
  try { safeStorage.setItem(mergeSessionKey, JSON.stringify({ schema: 2, level: currentCampaignLevel().number, snapshot: mergeSnapshot() })); } catch {}
}

function restoreMergeSession() {
  try {
    const saved = JSON.parse(safeStorage.getItem(mergeSessionKey) || "null");
    if (saved?.schema !== 2 || saved.level !== currentCampaignLevel().number || !Array.isArray(saved.snapshot?.board)) return false;
    restoreMergeSnapshot(saved.snapshot);
    return true;
  } catch { return false; }
}

function clearMergeSession() {
  try { safeStorage.removeItem(mergeSessionKey); } catch {}
}

function updateMergeStatus(message) {
  setMetric(bestTile + " / " + (mergeEndless ? "∞" : mergeTarget));
  setStatus(message || ("分数 " + mergeScore + " · " + availableCells().length + " 空位 · 下一块 " + mergeNextValue));
}

function undoMergeMove() {
  if (!running || mergeAnimation || !mergeHistory || mergeUndoCredits <= 0) {
    if (running && mergeUndoCredits <= 0) setStatus("本关没有可用回溯。 ");
    return;
  }
  const creditsAfterUndo = mergeUndoCredits - 1;
  restoreMergeSnapshot(mergeHistory);
  mergeUndoCredits = creditsAfterUndo;
  mergeUndoUsed += 1;
  mergeHistory = null;
  mergeLastSpawn = null;
  playSound("move");
  updateMergeStatus("已回溯一步 · 剩余 " + mergeUndoCredits + " 次");
  saveMergeSession();
  drawMergeBoard();
}

function handleMergeVictory() {
  if (mergeEndless || !mergeMissionComplete()) return false;
  clearMergeSession();
  writeHistoricalBest();
  const detail = mergeBlueprint.name + "完成 · " + mergeMoves + " 步 · " + mergeScore + " 分。";
  const finalLevel = currentCampaignLevel().number === mergeBlueprints.length;
  if (finalLevel) {
    mergeContinueState = mergeSnapshot();
    startButton.dataset.mergeContinue = "1";
  }
  showResult(true, "矩阵稳定", detail);
  if (finalLevel) startButton.textContent = "继续无尽";
  return true;
}

function finishMergeMove(animation) {
  if (mergeAnimation !== animation) return;
  mergeAnimation = null;
  spawnNumber();
  writeHistoricalBest();
  saveMergeSession();
  if (handleMergeVictory()) return;
  if (mergeBlueprint.moveLimit && mergeMoves >= mergeBlueprint.moveLimit) {
    clearMergeSession();
    showResult(false, "步数耗尽", "最高数字 " + bestTile + " · 任务进度 " + mergeMissionProgress() + " / " + mergeBlueprint.missionValue);
    return;
  }
  if (!hasAvailableMove()) {
    clearMergeSession();
    showResult(false, "矩阵锁死", "棋盘没有可移动方向；最高数字为 " + bestTile + "。 ");
    return;
  }
  updateMergeStatus();
  const queued = mergeQueuedDirection;
  mergeQueuedDirection = null;
  drawMergeBoard();
  if (queued) moveBoard(queued);
}

function moveBoard(direction) {
  if (!running) return;
  if (mergeAnimation) { mergeQueuedDirection = direction; return; }
  const before = mergeSnapshot();
  const result = resolveMergeMove(board2048, direction);
  if (!result.changed) {
    mergeInvalidDirection = direction;
    mergeInvalidUntil = performance.now() + 150;
    playSound("fail");
    drawMergeBoard();
    return;
  }
  mergeTutorialVisible = false;
  mergeHistory = before;
  board2048 = result.next;
  mergeScore += result.scoreGain;
  mergeMoves += 1;
  mergeMerges += result.mergedCells.length;
  mergeBestMulti = Math.max(mergeBestMulti, result.mergedCells.length);
  mergeStreak = result.mergedCells.length ? mergeStreak + 1 : 0;
  mergePeakStreak = Math.max(mergePeakStreak, mergeStreak);
  bestTile = Math.max(bestTile, ...board2048.flat());
  mergeAnimation = { ...result, before: before.board, startedAt: performance.now() };
  playSound(result.mergedCells.length ? "collect" : "move");
  drawMergeBoard();
}

function mergeLayout() {
  const portrait = config.aspectRatio === "9:16";
  const frameSize = portrait ? 660 : 596;
  const sceneHeight = gameSceneHeight();
  return { portrait, frameSize, originX: (720 - frameSize) / 2, originY: portrait ? 294 : (sceneHeight - frameSize) / 2, sceneHeight };
}

function tileColor(value) {
  const level = value ? Math.round(Math.log2(value)) : 0;
  return value ? palette.pieces[(level - 1) % palette.pieces.length] : palette.surfaceSoft;
}

function tileFontSize(value, size) {
  const digits = String(value).length;
  return Math.round(size * (digits <= 2 ? .42 : digits === 3 ? .35 : digits === 4 ? .29 : .24));
}

function drawTileNumber(value, x, y, size, alpha = 1) {
  if (!value) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.font = "850 " + tileFontSize(value, size) + "px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.strokeStyle = "rgba(255,252,242,.94)";
  ctx.lineWidth = Math.max(4, size * .045);
  ctx.strokeText(String(value), x + size / 2, y + size / 2 + 2);
  ctx.fillStyle = value >= 256 ? "#fffaf0" : "#28231f";
  ctx.fillText(String(value), x + size / 2, y + size / 2 + 2);
  ctx.restore();
}

function drawMergeTile(value, x, y, size, options = {}) {
  const level = value ? Math.round(Math.log2(value)) : 0;
  const sprite = value ? 1 + ((level - 1) % 6) : 0;
  const scale = options.scale || 1;
  const actual = size * scale;
  const dx = x + (size - actual) / 2;
  const dy = y + (size - actual) / 2;
  const alpha = options.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = value ? tileColor(value) : "rgba(22,36,43,.94)";
  ctx.strokeStyle = value ? "rgba(255,255,255,.7)" : "rgba(152,190,196,.28)";
  ctx.lineWidth = value ? 3 : 2;
  ctx.shadowColor = value ? "rgba(2,9,13,.48)" : "transparent";
  ctx.shadowBlur = value ? 14 : 0;
  ctx.shadowOffsetY = value ? 6 : 0;
  ctx.beginPath(); ctx.roundRect(dx, dy, actual, actual, 22); ctx.fill(); ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = value ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.035)";
  ctx.beginPath(); ctx.roundRect(dx + 7, dy + 7, actual - 14, Math.max(12, actual * .24), 14); ctx.fill();
  ctx.restore();
  drawBitmapSprite(sprite, dx + 3, dy + 3, actual - 6, actual - 6, { fallback: tileColor(value), radius: 19, padding: 0, scale: 1.08, alpha: alpha * (value ? .72 : .2) });
  if (value) drawTileNumber(value, dx, dy, actual, options.alpha ?? 1);
}

function drawMergeHud(layout) {
  if (!layout.portrait) return;
  const cards = [
    { x: 34, width: 206, label: "本关目标", value: mergeEndless ? "无尽" : mergeTarget },
    { x: 254, width: 206, label: "下一块", value: mergeNextValue },
    { x: 474, width: 212, label: "剩余步数", value: mergeBlueprint.moveLimit ? Math.max(0, mergeBlueprint.moveLimit - mergeMoves) : "∞" },
  ];
  cards.forEach((card, index) => {
    drawPlayfield(card.x, 86, card.width, 142, { radius: 24, alpha: .88 });
    ctx.textAlign = "center";
    ctx.fillStyle = palette.textSoft;
    ctx.font = "650 20px Inter, sans-serif";
    ctx.fillText(card.label, card.x + card.width / 2, 126);
    ctx.fillStyle = palette.text;
    ctx.font = "850 " + (index === 1 ? 48 : 42) + "px ui-monospace, SFMono-Regular, monospace";
    ctx.fillText(String(card.value), card.x + card.width / 2, 190);
  });
}

function drawMergeMission(layout) {
  if (!layout.portrait) return;
  drawPlayfield(42, 1000, 636, 132, { radius: 28, alpha: .84 });
  ctx.textAlign = "left";
  ctx.fillStyle = palette.textSoft;
  ctx.font = "650 20px Inter, sans-serif";
  ctx.fillText("第 " + currentCampaignLevel().number + " 关 · " + mergeBlueprint.name, 72, 1039);
  ctx.fillStyle = palette.text;
  ctx.font = "760 25px Inter, sans-serif";
  ctx.fillText(mergeMissionLabel(), 72, 1080);
  ctx.textAlign = "right";
  ctx.fillStyle = mergeMissionComplete() ? palette.highlight : palette.textSoft;
  ctx.font = "800 22px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(mergeMissionProgress() + " / " + mergeBlueprint.missionValue, 648, 1080);
  ctx.textAlign = "left";
  ctx.fillStyle = palette.textSoft;
  ctx.font = "560 18px Inter, sans-serif";
  ctx.fillText("分数 " + mergeScore + " · 空位 " + availableCells().length + " · 回溯 " + mergeUndoCredits, 72, 1111);
  if (mergeTutorialVisible) {
    drawPlayfield(126, 1160, 468, 64, { radius: 32, alpha: .9 });
    ctx.textAlign = "center";
    ctx.fillStyle = palette.text;
    ctx.font = "700 21px Inter, sans-serif";
    ctx.fillText("在棋盘上滑动 · 相同数字只合并一次", 360, 1201);
  }
}

function drawMergeBoard() {
  clearCanvas();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const layout = mergeLayout();
  drawMergeHud(layout);
  const gap = layout.portrait ? 12 : 11;
  const inset = 14;
  const cell = (layout.frameSize - inset * 2 - gap * 3) / boardSize;
  let boardOffsetX = 0;
  const now = performance.now();
  if (mergeInvalidUntil > now) {
    const amount = Math.sin((1 - (mergeInvalidUntil - now) / 150) * Math.PI) * 8;
    boardOffsetX = mergeInvalidDirection === "left" ? -amount : mergeInvalidDirection === "right" ? amount : 0;
  }
  ctx.save();
  ctx.translate(boardOffsetX, 0);
  ctx.beginPath();
  ctx.roundRect(layout.originX, layout.originY, layout.frameSize, layout.frameSize, 34);
  ctx.fillStyle = "rgba(15,23,30,.94)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,252,241,.7)";
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
    const x = layout.originX + inset + column * (cell + gap);
    const y = layout.originY + inset + row * (cell + gap);
    drawMergeTile(0, x, y, cell);
  }
  if (mergeAnimation) {
    const progress = Math.max(0, Math.min(1, (now - mergeAnimation.startedAt) / mergeMoveDuration));
    const eased = 1 - Math.pow(1 - progress, 3);
    mergeAnimation.movements.forEach((movement) => {
      const fromX = layout.originX + inset + movement.from.column * (cell + gap);
      const fromY = layout.originY + inset + movement.from.row * (cell + gap);
      const toX = layout.originX + inset + movement.to.column * (cell + gap);
      const toY = layout.originY + inset + movement.to.row * (cell + gap);
      drawMergeTile(movement.value, fromX + (toX - fromX) * eased, fromY + (toY - fromY) * eased, cell, { alpha: movement.merged ? .92 : 1 });
    });
    if (progress >= 1) finishMergeMove(mergeAnimation);
  } else {
    for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
      const value = board2048[row][column];
      if (!value) continue;
      const x = layout.originX + inset + column * (cell + gap);
      const y = layout.originY + inset + row * (cell + gap);
      let scale = 1;
      if (mergeLastSpawn?.row === row && mergeLastSpawn?.column === column && now - mergeLastSpawn.at < mergeSpawnDuration) {
        const progress = Math.max(0, Math.min(1, (now - mergeLastSpawn.at) / mergeSpawnDuration));
        scale = .72 + .28 * (1 - Math.pow(1 - progress, 3));
      }
      drawMergeTile(value, x, y, cell, { scale });
    }
  }
  ctx.restore();
  drawMergeMission(layout);
  ctx.restore();
  finishCanvasStyle();
  if (mergeAnimation || mergeInvalidUntil > now || (mergeLastSpawn && now - mergeLastSpawn.at < mergeSpawnDuration)) requestAnimationFrame(drawMergeBoard);
}

function setupOpening() {
  board2048 = cloneBoard(mergeBlueprint.opening);
  bestTile = Math.max(2, ...board2048.flat());
  mergeNextValue = chooseSpawnValue();
}

function resetMergeStats() {
  mergeScore = 0; mergeHistory = null; mergeAnimation = null; mergeQueuedDirection = null; mergeLastSpawn = null;
  mergeUndoCredits = mergeBlueprint.undo; mergeMoves = 0; mergeMerges = 0; mergePeakStreak = 0; mergeStreak = 0;
  mergeBestMulti = 0; mergePreviewTwos = 0; mergePreviewFours = 0; mergeUndoUsed = 0; mergeTutorialVisible = true;
}

function startGame() {
  mergeBlueprint = activeMergeBlueprint();
  mergeTarget = mergeBlueprint.target;
  historicalBest = readHistoricalBest();
  if (startButton.dataset.mergeContinue === "1" && mergeContinueState) {
    restoreMergeSnapshot(mergeContinueState);
    mergeEndless = true;
    mergeHistory = null;
    mergeContinueState = null;
    delete startButton.dataset.mergeContinue;
    startButton.textContent = "开始游戏";
  } else {
    mergeEndless = false;
    seedMergeRandom();
    resetMergeStats();
    if (!restoreMergeSession()) setupOpening();
  }
  running = true;
  hideOverlay();
  updateMergeStatus("第 " + currentCampaignLevel().number + " 关 · " + mergeBlueprint.name + " · 下一块 " + mergeNextValue);
  startAmbient();
  drawMergeBoard();
}

function handleControl(value) {
  if (["up", "right", "down", "left"].includes(value)) moveBoard(value);
  if (value === "undo") undoMergeMove();
}

function handleKey(key) {
  const map = { ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left", w: "up", d: "right", s: "down", a: "left", z: "undo", Z: "undo" };
  if (map[key]) handleControl(map[key]);
}

let mergeSwipeStart = null;
canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  mergeSwipeStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture?.(event.pointerId);
});
canvas.addEventListener("pointerup", (event) => {
  if (!mergeSwipeStart || mergeSwipeStart.id !== event.pointerId) return;
  const dx = event.clientX - mergeSwipeStart.x;
  const dy = event.clientY - mergeSwipeStart.y;
  mergeSwipeStart = null;
  canvas.releasePointerCapture?.(event.pointerId);
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  handleControl(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
});
canvas.addEventListener("pointercancel", () => { mergeSwipeStart = null; });
canvas.addEventListener("lostpointercapture", () => { mergeSwipeStart = null; });

restartButton.addEventListener("click", () => {
  if (restartButton.textContent === "再次点击重开") clearMergeSession();
});

onCampaignLevelChanged = () => {
  mergeBlueprint = activeMergeBlueprint();
  mergeTarget = mergeBlueprint.target;
  clearMergeSession();
  if (!running) drawMergeBoard();
};

runtimeDebugState = () => ({
  level: currentCampaignLevel().number, blueprintName: mergeBlueprint.name, blueprintCount: mergeBlueprints.length,
  uniqueBlueprintNames: new Set(mergeBlueprints.map((item) => item.name)).size, target: mergeTarget, board: cloneBoard(board2048),
  bestTile, score: mergeScore, historicalBest, availableCells: availableCells().length, danger: availableCells().length <= 2,
  nextValue: mergeNextValue, canUndo: Boolean(mergeHistory) && mergeUndoCredits > 0, undoCredits: mergeUndoCredits,
  moves: mergeMoves, merges: mergeMerges, missionType: mergeBlueprint.missionType, missionProgress: mergeMissionProgress(),
  missionValue: mergeBlueprint.missionValue, missionComplete: mergeMissionComplete(), moveLimit: mergeBlueprint.moveLimit,
  animation: mergeAnimation ? { duration: mergeMoveDuration, queued: mergeQueuedDirection } : null,
  spawnAnimated: Boolean(mergeLastSpawn && performance.now() - mergeLastSpawn.at < mergeSpawnDuration), directSwipe: true,
  spawnDistribution: config.difficulty === "relaxed" ? "95/5" : config.difficulty === "challenging" ? "82/18" : "90/10",
  rngState: mergeRngState, endless: mergeEndless,
});

runtimeDebugActions = {
  undo: undoMergeMove,
  finishAnimation() {
    if (mergeAnimation) finishMergeMove(mergeAnimation);
    if (mergeLastSpawn) mergeLastSpawn.at = performance.now();
    drawMergeBoard();
  },
  prepareMerge() {
    board2048 = emptyBoard(); board2048[3][0] = 2; board2048[3][1] = 2; mergeScore = 0; bestTile = 2;
    mergeHistory = null; mergeAnimation = null; mergeNextValue = 2; drawMergeBoard();
  },
  prepareDoubleMerge() {
    board2048 = emptyBoard(); board2048[3] = [2,2,2,2]; mergeScore = 0; bestTile = 2;
    mergeHistory = null; mergeAnimation = null; mergeNextValue = 2; drawMergeBoard();
  },
  prepareDanger() {
    board2048 = [[2,4,8,16],[4,8,16,32],[8,16,32,64],[16,32,0,0]]; bestTile = 64;
    mergeHistory = null; mergeAnimation = null; drawMergeBoard();
  },
  prepareNoop() {
    board2048 = [[2,4,8,16],[0,0,0,0],[0,0,0,0],[0,0,0,0]]; bestTile = 16;
    mergeHistory = null; mergeAnimation = null; drawMergeBoard();
  },
};

mergeBlueprint = activeMergeBlueprint();
seedMergeRandom();
setupOpening();
drawMergeBoard();


redrawGameArt = () => { drawMergeBoard(); };
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
  const identity = {"projectId":"00adee1e-4ae0-4f75-b377-bc3a6cd22ff4","versionId":"8e30263f-359c-4acc-b87a-55ce48a36b61"};
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