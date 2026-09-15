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
const config = {"title":"星环突围","template":"space-shooter","difficulty":"standard","visualStyle":"color-block","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"scrolling","inputModes":["drag","keyboard","touch-buttons"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":[],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"space-shooter-01","label":"01 · 认识规则 · 校准航道","tier":1,"tierLabel":"认识规则","variant":0,"seed":2489956237,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"校准航道","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":2,"id":"space-shooter-02","label":"02 · 认识规则 · 双翼接敌","tier":1,"tierLabel":"认识规则","variant":1,"seed":909131102,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"双翼接敌","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":3,"id":"space-shooter-03","label":"03 · 认识规则 · 脉冲试炼","tier":1,"tierLabel":"认识规则","variant":2,"seed":3505955631,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"脉冲试炼","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":4,"id":"space-shooter-04","label":"04 · 认识规则 · 曙光守环","tier":1,"tierLabel":"认识规则","variant":3,"seed":1921198328,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"曙光守环","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"解锁稳定节奏"},{"number":5,"id":"space-shooter-05","label":"05 · 稳定节奏 · 碎星回廊","tier":2,"tierLabel":"稳定节奏","variant":4,"seed":491499081,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"碎星回廊","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":6,"id":"space-shooter-06","label":"06 · 稳定节奏 · 交错火网","tier":2,"tierLabel":"稳定节奏","variant":5,"seed":3205633050,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"交错火网","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":7,"id":"space-shooter-07","label":"07 · 稳定节奏 · 护盾护航","tier":2,"tierLabel":"稳定节奏","variant":6,"seed":1507499499,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"护盾护航","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":8,"id":"space-shooter-08","label":"08 · 稳定节奏 · 赤潮守环","tier":2,"tierLabel":"稳定节奏","variant":7,"seed":4226089908,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"赤潮守环","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"解锁加入变化"},{"number":9,"id":"space-shooter-09","label":"09 · 加入变化 · 彗尾追击","tier":3,"tierLabel":"加入变化","variant":8,"seed":2242742533,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"彗尾追击","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":10,"id":"space-shooter-10","label":"10 · 加入变化 · 三向炮台","tier":3,"tierLabel":"加入变化","variant":9,"seed":611585750,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"三向炮台","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":11,"id":"space-shooter-11","label":"11 · 加入变化 · 能量禁区","tier":3,"tierLabel":"加入变化","variant":10,"seed":3325883559,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"能量禁区","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":12,"id":"space-shooter-12","label":"12 · 加入变化 · 裂隙守环","tier":3,"tierLabel":"加入变化","variant":11,"seed":1623685744,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"裂隙守环","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"解锁组合压力"},{"number":13,"id":"space-shooter-13","label":"13 · 组合压力 · 磁暴穿行","tier":4,"tierLabel":"组合压力","variant":12,"seed":42984385,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"磁暴穿行","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":14,"id":"space-shooter-14","label":"14 · 组合压力 · 精英夹击","tier":4,"tierLabel":"组合压力","variant":13,"seed":2908121490,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"精英夹击","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":15,"id":"space-shooter-15","label":"15 · 组合压力 · 弹幕回廊","tier":4,"tierLabel":"组合压力","variant":14,"seed":1327427427,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"弹幕回廊","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":16,"id":"space-shooter-16","label":"16 · 组合压力 · 寂光守环","tier":4,"tierLabel":"组合压力","variant":15,"seed":3911800108,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"寂光守环","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"解锁最终掌握"},{"number":17,"id":"space-shooter-17","label":"17 · 最终掌握 · 最后补给","tier":5,"tierLabel":"最终掌握","variant":16,"seed":2347883261,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"最后补给","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":18,"id":"space-shooter-18","label":"18 · 最终掌握 · 全型编队","tier":5,"tierLabel":"最终掌握","variant":17,"seed":364396622,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"全型编队","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":19,"id":"space-shooter-19","label":"19 · 最终掌握 · 极限突围","tier":5,"tierLabel":"最终掌握","variant":18,"seed":3024143903,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"极限突围","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":20,"id":"space-shooter-20","label":"20 · 最终掌握 · 终焉守环","tier":5,"tierLabel":"最终掌握","variant":19,"seed":1443581928,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"终焉守环","mission":"完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。","masteryRules":[{"id":"efficiency","label":"击破数量达到关卡目标","metric":"kills","comparison":"ratio-gte","referenceMetric":"killTarget","target":1},{"id":"control","label":"完成时至少保留 2 点能量","metric":"lives","comparison":"gte","target":2}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:08191f9f-5323-451a-baca-dcdda4dd242e:1582f209-fce1-44ca-9442-ec0d45b1ee4e","masteryStorageKey":"forge-mastery:08191f9f-5323-451a-baca-dcdda4dd242e:1582f209-fce1-44ca-9442-ec0d45b1ee4e"};
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


const shooterWaveCount = 3;
const shooterEnemyKinds = ["scout", "weaver", "charger", "turret", "shield"];
const shooterLoadouts = {
  interceptor: { id: "interceptor", label: "逐光", follow: 21, fireDelay: 132, maxLives: 4, pulseRadius: 286, pulseDamage: 3, pulseGain: 1, eliteDamage: 1 },
  bulwark: { id: "bulwark", label: "岚盾", follow: 15, fireDelay: 188, maxLives: 5, pulseRadius: 350, pulseDamage: 2, pulseGain: 1.18, eliteDamage: 1 },
  lancer: { id: "lancer", label: "星矛", follow: 18, fireDelay: 172, maxLives: 4, pulseRadius: 264, pulseDamage: 3, pulseGain: .84, eliteDamage: 1.55 },
};

let ship;
let bullets = [];
let enemies = [];
let enemyBullets = [];
let pickups = [];
let particles = [];
let shooterLives = 4;
let shooterMaxLives = 4;
let shooterShield = 0;
let kills = 0;
let shooterScore = 0;
let shooterFrame = null;
let shooterLast = 0;
let nextEnemyAt = 0;
let nextShotAt = 0;
let shipInvulnerableUntil = 0;
let shooterStartedAt = 0;
let shooterPointerId = null;
let shooterCombo = 0;
let shooterBestCombo = 0;
let lastKillAt = 0;
let rapidFireUntil = 0;
let shooterGrazeCount = 0;
let shooterPointerMoves = 0;
let shooterHeld = { left: false, right: false, up: false, down: false };
let killTarget = 24;
let shooterInputAuditActive = false;
let shooterFrameCount = 0;
let shooterMaxFrameGapMs = 0;
let shooterLastPointerMoveAt = 0;
let shooterMaxPointerGapMs = 0;
let shooterPointerTarget = null;
let shooterPointerType = "none";
let shooterLoadout = "interceptor";
let shooterWavePlans = [];
let shooterWaveIndex = 0;
let shooterWaveSpawned = 0;
let shooterWaveDefeated = 0;
let shooterIntermissionUntil = 0;
let shooterPulseCharge = 35;
let shooterPulseEffect = null;
let shooterPulseReadyNotified = false;
let shooterBoss = null;
let shooterBossPhase = 0;
let shooterHitFlashUntil = 0;
let shooterWaveBannerUntil = 0;
let shooterWaveBannerText = "";

function shooterSceneHeight() {
  return gameSceneHeight();
}

function currentShooterLoadout() {
  return shooterLoadouts[shooterLoadout] || shooterLoadouts.interceptor;
}

function shooterDifficultyProfile() {
  if (config.difficulty === "relaxed") return { fireRate: .72, bulletSpeed: .82, spawnDelay: 1.1 };
  if (config.difficulty === "challenging") return { fireRate: 1.24, bulletSpeed: 1.17, spawnDelay: .86 };
  return { fireRate: 1, bulletSpeed: 1, spawnDelay: 1 };
}

function shooterLevelBlueprints() {
  const level = currentCampaignLevel();
  const tier = level.tier;
  const variant = level.number - 1;
  const unlocked = shooterEnemyKinds.slice(0, Math.min(shooterEnemyKinds.length, 1 + tier));
  const pick = (offset) => unlocked[(variant + offset) % unlocked.length];
  const guardian = level.number % 4 === 0;
  return [
    { label: tier === 1 ? "航道校准" : "前锋接敌", count: 6 + tier, kinds: ["scout", pick(1)] },
    { label: tier < 3 ? "双翼压制" : "混合火网", count: 7 + tier, kinds: [pick(1), pick(2), tier >= 3 ? "turret" : "weaver"] },
    guardian
      ? { label: "守环者", count: 1, kinds: ["boss"], boss: true }
      : { label: tier < 2 ? "精英封锁" : "全型编队", count: 8 + tier, kinds: [pick(2), pick(3), tier >= 2 ? "shield" : "scout"], elite: true },
  ];
}

function syncShooterLoadoutUi() {
  document.querySelectorAll("[data-shooter-loadout]").forEach((button) => {
    const selected = button.dataset.shooterLoadout === shooterLoadout;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
}

function syncShooterAbilityControl() {
  const button = document.querySelector('[data-control="pulse"]');
  if (!button) return;
  const ready = shooterPulseCharge >= 100;
  button.textContent = ready ? "脉冲就绪" : "脉冲 " + Math.round(shooterPulseCharge) + "%";
  button.disabled = !running || !ready;
  button.setAttribute("aria-label", ready ? "释放星环脉冲" : "星环脉冲充能 " + Math.round(shooterPulseCharge) + "%");
}

document.querySelectorAll("[data-shooter-loadout]").forEach((button) => button.addEventListener("click", () => {
  if (running) return;
  shooterLoadout = button.dataset.shooterLoadout || "interceptor";
  syncShooterLoadoutUi();
  playSound("ui");
}));

function shooterEnemyStats(kind) {
  const tier = currentCampaignLevel().tier;
  const speedScale = campaignScale("speedMultiplier");
  const stats = {
    scout: { width: 60, height: 52, hp: 2 + Math.floor((tier - 1) / 3), speed: 112, score: 110, delay: 720 },
    weaver: { width: 68, height: 56, hp: 3 + Math.floor(tier / 3), speed: 96, score: 150, delay: 640 },
    charger: { width: 56, height: 68, hp: 3 + Math.floor(tier / 2), speed: 210, score: 180, delay: 820 },
    turret: { width: 82, height: 68, hp: 6 + tier, speed: 58, score: 260, delay: 520 },
    shield: { width: 74, height: 66, hp: 4 + tier, speed: 78, score: 230, delay: 610, shield: 1 + Math.floor(tier / 4) },
    boss: { width: 180, height: 136, hp: 25 + tier * 9, speed: 44, score: 2500, delay: 380 },
  }[kind] || { width: 48, height: 42, hp: 2, speed: 100, score: 100, delay: 720 };
  return { ...stats, speed: stats.speed * speedScale };
}

function shooterWarningDuration(kind) {
  const learning = performance.now() - shooterStartedAt < 12000;
  if (kind === "charger") return learning ? 1250 : 920;
  if (kind === "boss") return 1500;
  return learning ? 980 : 660;
}

function spawnShooterEnemy(kind, timestamp) {
  const stats = shooterEnemyStats(kind);
  const plan = shooterWavePlans[shooterWaveIndex] || shooterWavePlans[0];
  const spacing = 600 / Math.max(1, plan.count - 1);
  const indexedX = 60 + (shooterWaveSpawned % Math.max(1, plan.count)) * spacing;
  const randomX = 54 + campaignRandom() * 612;
  const x = kind === "boss" ? 360 - stats.width / 2 : Math.max(34, Math.min(686 - stats.width, indexedX * .58 + randomX * .42));
  const warningUntil = timestamp + shooterWarningDuration(kind);
  const enemy = {
    id: "enemy-" + shooterWaveIndex + "-" + shooterWaveSpawned + "-" + Math.round(timestamp),
    kind,
    x,
    y: kind === "boss" ? -stats.height - 30 : -stats.height - 12,
    width: stats.width,
    height: stats.height,
    speed: stats.speed,
    hp: stats.hp,
    maxHp: stats.hp,
    score: stats.score,
    shield: stats.shield || 0,
    phase: campaignRandom() * Math.PI * 2,
    warningUntil,
    shotAt: warningUntil + stats.delay,
    bornAt: timestamp,
    targetY: kind === "boss" ? 138 : kind === "turret" ? 196 + campaignRandom() * 90 : 0,
    elite: Boolean(plan.elite || kind === "boss"),
    boss: kind === "boss",
  };
  enemies.push(enemy);
  if (enemy.boss) {
    shooterBoss = enemy;
    shooterBossPhase = 1;
  }
  return enemy;
}

function firePlayerBullet(timestamp) {
  if (!ship || timestamp < nextShotAt) return;
  const loadout = currentShooterLoadout();
  const rapid = timestamp < rapidFireUntil ? .62 : 1;
  const positions = loadout.id === "lancer" ? [-17, 17] : [0];
  positions.forEach((offset) => bullets.push({ x: ship.x + ship.width / 2 - 7 + offset, y: ship.y - 24, width: 14, height: 34, speed: 730, damage: loadout.id === "lancer" ? 1.05 : 1 }));
  nextShotAt = timestamp + loadout.fireDelay * rapid;
  if (shooterFrameCount % 18 === 0) playSound("move");
}

function hit(a, b, inset = 0) {
  return a.x + inset < b.x + b.width - inset && a.x + a.width - inset > b.x + inset && a.y + inset < b.y + b.height - inset && a.y + a.height - inset > b.y + inset;
}

function circleHitsShip(bullet, inset = 9) {
  const closestX = Math.max(ship.x + inset, Math.min(bullet.x, ship.x + ship.width - inset));
  const closestY = Math.max(ship.y + inset, Math.min(bullet.y, ship.y + ship.height - inset));
  return Math.hypot(bullet.x - closestX, bullet.y - closestY) <= bullet.radius;
}

function burst(x, y, color, count = 12, speed = 120) {
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + campaignRandom() * .18;
    particles.push({ x, y, vx: Math.cos(angle) * (speed * .45 + campaignRandom() * speed), vy: Math.sin(angle) * (speed * .45 + campaignRandom() * speed), life: .42 + campaignRandom() * .4, color, size: 8 + campaignRandom() * 10 });
  }
  if (particles.length > 180) particles.splice(0, particles.length - 180);
}

function addShooterPulseCharge(amount) {
  const before = shooterPulseCharge;
  shooterPulseCharge = Math.min(100, shooterPulseCharge + amount * currentShooterLoadout().pulseGain);
  if (before < 100 && shooterPulseCharge >= 100 && !shooterPulseReadyNotified) {
    shooterPulseReadyNotified = true;
    setStatus("星环脉冲已充满 · 点击右下按钮或按 Space / F 清除近身敌弹。");
    playSound("reward");
  }
  syncShooterAbilityControl();
}

function activateShooterPulse() {
  if (!running || shooterPulseCharge < 100 || !ship) return false;
  const loadout = currentShooterLoadout();
  const centerX = ship.x + ship.width / 2;
  const centerY = ship.y + ship.height / 2;
  let cleared = 0;
  enemyBullets.forEach((bullet) => {
    if (bullet.dead || Math.hypot(bullet.x - centerX, bullet.y - centerY) > loadout.pulseRadius) return;
    bullet.dead = true;
    cleared += 1;
    burst(bullet.x, bullet.y, "#7af4f2", 4, 58);
  });
  enemyBullets = enemyBullets.filter((bullet) => !bullet.dead);
  enemies.forEach((enemy) => {
    if (enemy.dead || performance.now() < enemy.warningUntil) return;
    const distance = Math.hypot(enemy.x + enemy.width / 2 - centerX, enemy.y + enemy.height / 2 - centerY);
    if (distance > loadout.pulseRadius) return;
    enemy.hp -= loadout.pulseDamage * (loadout.id === "lancer" && enemy.elite ? loadout.eliteDamage : 1);
  });
  shooterPulseCharge = 0;
  shooterPulseReadyNotified = false;
  const now = performance.now();
  shooterPulseEffect = { x: centerX, y: centerY, radius: loadout.pulseRadius, startedAt: now, until: now + 520 };
  shooterScore += cleared * 35;
  burst(centerX, centerY, "#a9ffff", 28, 210);
  playSound("reward");
  setStatus("脉冲释放 · 清除 " + cleared + " 枚近身敌弹，并冲击范围内敌机。");
  syncShooterAbilityControl();
  return true;
}

function damageShip(timestamp) {
  if (!ship || timestamp < shipInvulnerableUntil) return;
  if (shooterInputAuditActive) { shipInvulnerableUntil = timestamp + 850; return; }
  shipInvulnerableUntil = timestamp + 1050;
  shooterHitFlashUntil = timestamp + 240;
  if (shooterShield > 0) {
    shooterShield -= 1;
    burst(ship.x + ship.width / 2, ship.y + ship.height / 2, "#77f0e7", 18, 145);
    playSound("legal");
    setStatus("护盾吸收了一次命中 · 能量未损失。");
    return;
  }
  shooterLives -= 1;
  shooterCombo = 0;
  burst(ship.x + ship.width / 2, ship.y + ship.height / 2, "#ff6a5d", 24, 180);
  playSound("fail");
  if (shooterLives <= 0) {
    showResult(false, "星环失守", "你完成了 " + (shooterWaveIndex + 1) + " / " + shooterWaveCount + " 波，击破 " + kills + " 架敌机，最高连击 ×" + shooterBestCombo + "。");
    return;
  }
  setStatus((shooterLives === 1 ? "临界能量 · " : "飞船受击 · ") + "剩余 " + shooterLives + " 点能量；短暂无敌已生效。");
}

function spawnShooterPickup(enemy, timestamp) {
  if (!enemy.boss && kills % 7 !== 0 && !(enemy.elite && campaignRandom() < .3)) return;
  const type = shooterLives < shooterMaxLives && kills % 14 === 0 ? "repair" : kills % 3 === 0 ? "overdrive" : "pulse";
  pickups.push({ x: enemy.x + enemy.width / 2 - 20, y: enemy.y + enemy.height / 2 - 20, width: 40, height: 40, speed: 88, type, phase: campaignRandom() * Math.PI * 2, bornAt: timestamp });
}

function collectShooterPickup(pickup, timestamp) {
  pickup.dead = true;
  if (pickup.type === "repair") {
    shooterLives = Math.min(shooterMaxLives, shooterLives + 1);
    shipInvulnerableUntil = Math.max(shipInvulnerableUntil, timestamp + 800);
    setStatus("修复核心已回收 · 当前 " + shooterLives + " / " + shooterMaxLives + " 点能量。");
  } else if (pickup.type === "overdrive") {
    rapidFireUntil = timestamp + 6500;
    setStatus("跃迁过载已启动 · 6 秒快速射击。");
  } else {
    addShooterPulseCharge(38);
    shooterShield = Math.min(1, shooterShield + 1);
    setStatus("脉冲电池已回收 · 同时获得 1 层护盾。");
  }
  shooterScore += 300;
  playSound("reward");
  burst(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, "#ffd67a", 18, 135);
}

function aimShooterBullet(enemy, speed, angleOffset = 0, radius = 9) {
  if (!ship || enemyBullets.length >= 90) return;
  const dx = ship.x + ship.width / 2 - (enemy.x + enemy.width / 2);
  const dy = ship.y + ship.height / 2 - (enemy.y + enemy.height / 2);
  const base = Math.atan2(dy, dx) + angleOffset;
  const difficulty = shooterDifficultyProfile();
  enemyBullets.push({ x: enemy.x + enemy.width / 2, y: enemy.y + enemy.height * .72, vx: Math.cos(base) * speed * difficulty.bulletSpeed, vy: Math.sin(base) * speed * difficulty.bulletSpeed, radius, kind: enemy.kind, grazed: false, bornAt: performance.now() });
}

function fireShooterEnemy(enemy, timestamp) {
  if (enemy.dead || timestamp < enemy.warningUntil || timestamp < enemy.shotAt || enemy.y < 18) return;
  const difficulty = shooterDifficultyProfile();
  const tier = currentCampaignLevel().tier;
  if (enemy.kind === "scout") aimShooterBullet(enemy, 178 + tier * 8, 0, 8);
  if (enemy.kind === "weaver") { aimShooterBullet(enemy, 170 + tier * 7, -.16, 8); aimShooterBullet(enemy, 170 + tier * 7, .16, 8); }
  if (enemy.kind === "turret" || enemy.kind === "shield") [-.28, 0, .28].forEach((angle) => aimShooterBullet(enemy, 158 + tier * 8, angle, enemy.kind === "turret" ? 10 : 8));
  if (enemy.kind === "boss") {
    const count = shooterBossPhase === 2 ? 7 : 5;
    for (let index = 0; index < count; index += 1) aimShooterBullet(enemy, 170 + tier * 9, (index - (count - 1) / 2) * .16, shooterBossPhase === 2 ? 11 : 9);
  }
  enemy.shotAt = timestamp + shooterEnemyStats(enemy.kind).delay / difficulty.fireRate;
}

function destroyShooterEnemy(enemy, timestamp) {
  if (enemy.dead) return;
  enemy.dead = true;
  kills += 1;
  shooterWaveDefeated += 1;
  shooterCombo = timestamp - lastKillAt < 1850 ? shooterCombo + 1 : 1;
  shooterBestCombo = Math.max(shooterBestCombo, shooterCombo);
  lastKillAt = timestamp;
  const multiplier = 1 + Math.min(4, shooterCombo - 1) * .18;
  shooterScore += Math.round(enemy.score * multiplier);
  addShooterPulseCharge(enemy.boss ? 35 : enemy.elite ? 13 : 7);
  burst(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.boss ? "#ffd064" : enemy.elite ? "#ff8b69" : "#61e7df", enemy.boss ? 48 : 18, enemy.boss ? 260 : 150);
  spawnShooterPickup(enemy, timestamp);
  playSound(shooterCombo >= 4 || enemy.elite ? "reward" : "hit");
  if (enemy.boss) { shooterBoss = null; shooterBossPhase = 0; }
}

function updateShooterEnemy(enemy, seconds, timestamp) {
  if (timestamp < enemy.warningUntil) return;
  const age = (timestamp - enemy.warningUntil) / 1000;
  if (enemy.kind === "boss") {
    enemy.y += (enemy.targetY - enemy.y) * Math.min(1, seconds * 2.4);
    enemy.x += Math.sin(timestamp / 1150 + enemy.phase) * 74 * seconds;
    enemy.x = Math.max(52, Math.min(668 - enemy.width, enemy.x));
    const nextPhase = enemy.hp <= enemy.maxHp * .5 ? 2 : 1;
    if (nextPhase !== shooterBossPhase) {
      shooterBossPhase = nextPhase;
      shooterWaveBannerText = "守环者进入裂变阶段";
      shooterWaveBannerUntil = timestamp + 1500;
      playSound("warning");
    }
  } else if (enemy.kind === "turret") {
    if (enemy.y < enemy.targetY) enemy.y += enemy.speed * seconds;
    else { enemy.x += Math.sin(timestamp / 720 + enemy.phase) * 46 * seconds; if (age > 8.5) enemy.y += enemy.speed * 1.35 * seconds; }
  } else if (enemy.kind === "weaver") {
    enemy.y += enemy.speed * seconds;
    enemy.x += Math.sin(timestamp / 310 + enemy.phase) * 112 * seconds;
  } else if (enemy.kind === "charger") {
    enemy.y += enemy.speed * (age < .55 ? .42 : 1.42) * seconds;
  } else {
    enemy.y += enemy.speed * seconds;
    if (enemy.kind === "shield") enemy.x += Math.sin(timestamp / 520 + enemy.phase) * 38 * seconds;
  }
  enemy.x = Math.max(24, Math.min(696 - enemy.width, enemy.x));
  fireShooterEnemy(enemy, timestamp);
}

function shooterWaveComplete(timestamp) {
  const plan = shooterWavePlans[shooterWaveIndex];
  if (!plan || shooterWaveSpawned < plan.count || enemies.some((enemy) => !enemy.dead)) return false;
  if (shooterWaveIndex >= shooterWaveCount - 1) {
    if (!shooterInputAuditActive) showResult(true, "星环航道已打开", "你完成三波作战，击破 " + kills + " 架敌机，最高连击 ×" + shooterBestCombo + "，得分 " + shooterScore + "。");
    return true;
  }
  shooterWaveIndex += 1;
  shooterWaveSpawned = 0;
  shooterWaveDefeated = 0;
  shooterIntermissionUntil = timestamp + 1650;
  shooterWaveBannerText = "WAVE " + (shooterWaveIndex + 1) + " · " + shooterWavePlans[shooterWaveIndex].label;
  shooterWaveBannerUntil = timestamp + 2100;
  setStatus("第 " + (shooterWaveIndex + 1) + " 波即将进入 · " + shooterWavePlans[shooterWaveIndex].label + "。");
  return false;
}

function updateShooter(delta, timestamp) {
  const seconds = Math.min(.034, delta / 1000);
  const loadout = currentShooterLoadout();
  const horizontal = (shooterHeld.right ? 1 : 0) - (shooterHeld.left ? 1 : 0);
  const vertical = (shooterHeld.down ? 1 : 0) - (shooterHeld.up ? 1 : 0);
  if (shooterPointerTarget) {
    const followStrength = 1 - Math.exp(-loadout.follow * seconds);
    ship.x += (shooterPointerTarget.x - ship.x) * followStrength;
    ship.y += (shooterPointerTarget.y - ship.y) * followStrength;
  } else {
    const length = Math.hypot(horizontal, vertical) || 1;
    ship.x += horizontal / length * 360 * seconds;
    ship.y += vertical / length * 360 * seconds;
  }
  ship.x = Math.max(18, Math.min(720 - ship.width - 18, ship.x));
  ship.y = Math.max(142, Math.min(shooterSceneHeight() - ship.height - 26, ship.y));
  firePlayerBullet(timestamp);
  const plan = shooterWavePlans[shooterWaveIndex];
  if (plan && timestamp >= shooterIntermissionUntil && shooterWaveSpawned < plan.count && timestamp >= nextEnemyAt) {
    const kind = plan.kinds[shooterWaveSpawned % plan.kinds.length];
    spawnShooterEnemy(kind, timestamp);
    shooterWaveSpawned += 1;
    const baseDelay = plan.boss ? 1000 : Math.max(430, 820 - currentCampaignLevel().tier * 55);
    nextEnemyAt = timestamp + baseDelay * shooterDifficultyProfile().spawnDelay / campaignScale("densityMultiplier");
  }
  bullets.forEach((bullet) => { bullet.y -= bullet.speed * seconds; });
  enemies.forEach((enemy) => updateShooterEnemy(enemy, seconds, timestamp));
  enemyBullets.forEach((bullet) => { bullet.x += bullet.vx * seconds; bullet.y += bullet.vy * seconds; });
  pickups.forEach((pickup) => { pickup.y += pickup.speed * seconds; pickup.x += Math.sin(timestamp / 320 + pickup.phase) * 20 * seconds; });
  particles.forEach((particle) => { particle.x += particle.vx * seconds; particle.y += particle.vy * seconds; particle.vx *= .985; particle.vy *= .985; particle.life -= seconds; });
  for (const bullet of bullets) for (const enemy of enemies) {
    if (bullet.dead || enemy.dead || timestamp < enemy.warningUntil || !hit(bullet, enemy, 2)) continue;
    bullet.dead = true;
    if (enemy.shield > 0) { enemy.shield -= 1; burst(bullet.x, bullet.y, "#75d9ff", 9, 92); playSound("legal"); continue; }
    const eliteBonus = loadout.id === "lancer" && enemy.elite ? loadout.eliteDamage : 1;
    enemy.hp -= bullet.damage * eliteBonus;
    if (enemy.hp <= 0) destroyShooterEnemy(enemy, timestamp);
  }
  enemies.forEach((enemy) => {
    if (enemy.dead || timestamp < enemy.warningUntil) return;
    if (enemy.hp <= 0) { destroyShooterEnemy(enemy, timestamp); return; }
    if (hit(ship, enemy, enemy.boss ? 18 : 8)) { if (!enemy.boss) enemy.dead = true; damageShip(timestamp); }
    else if (enemy.y > shooterSceneHeight() + 36) { enemy.dead = true; shooterCombo = 0; if (timestamp - shooterStartedAt > 9000) setStatus("敌机突破航道 · 连击中断，但只有命中会损失能量。"); }
  });
  enemyBullets.forEach((bullet) => {
    if (bullet.dead) return;
    if (circleHitsShip(bullet)) { bullet.dead = true; damageShip(timestamp); return; }
    if (!bullet.grazed) {
      const centerX = ship.x + ship.width / 2;
      const centerY = ship.y + ship.height / 2;
      const distance = Math.hypot(bullet.x - centerX, bullet.y - centerY);
      if (distance > 26 && distance < 52) {
        bullet.grazed = true;
        shooterGrazeCount += 1;
        shooterCombo = Math.max(1, shooterCombo + 1);
        shooterBestCombo = Math.max(shooterBestCombo, shooterCombo);
        shooterScore += 55;
        addShooterPulseCharge(8);
        playSound("legal");
      }
    }
  });
  pickups.forEach((pickup) => { if (!pickup.dead) { if (hit(ship, pickup, 5)) collectShooterPickup(pickup, timestamp); else if (pickup.y > shooterSceneHeight() + 34) pickup.dead = true; } });
  bullets = bullets.filter((bullet) => !bullet.dead && bullet.y > -48);
  enemies = enemies.filter((enemy) => !enemy.dead);
  enemyBullets = enemyBullets.filter((bullet) => !bullet.dead && bullet.x > -40 && bullet.x < 760 && bullet.y > -50 && bullet.y < shooterSceneHeight() + 50 && timestamp - bullet.bornAt < 11000);
  pickups = pickups.filter((pickup) => !pickup.dead);
  particles = particles.filter((particle) => particle.life > 0);
  if (shooterPulseEffect && timestamp >= shooterPulseEffect.until) shooterPulseEffect = null;
  setMetric("W" + (shooterWaveIndex + 1) + "/3 · " + kills + "/" + killTarget);
  shooterWaveComplete(timestamp);
}

function drawShooterBullet(bullet) {
  const centerX = bullet.x + bullet.width / 2;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const trail = ctx.createLinearGradient(centerX, bullet.y + bullet.height + 20, centerX, bullet.y - 8);
  trail.addColorStop(0, "rgba(66,214,255,0)"); trail.addColorStop(.48, "rgba(66,214,255,.46)"); trail.addColorStop(1, "rgba(255,255,255,.98)");
  ctx.fillStyle = trail; ctx.shadowColor = "rgba(95,242,255,.98)"; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.roundRect(bullet.x - 4, bullet.y - 6, bullet.width + 8, bullet.height + 26, 9); ctx.fill(); ctx.restore();
  drawBitmapSprite(3, bullet.x - 7, bullet.y - 8, bullet.width + 14, bullet.height + 18, { fallback: "#80f6ff", padding: 2, alpha: .96 });
  ctx.save(); ctx.fillStyle = "rgba(255,255,255,.98)"; ctx.shadowColor = "#a9ffff"; ctx.shadowBlur = 9;
  ctx.beginPath(); ctx.roundRect(bullet.x + bullet.width * .31, bullet.y + 1, bullet.width * .38, bullet.height * .76, 4); ctx.fill(); ctx.restore();
}

function drawShooterEnemyBullet(bullet) {
  ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = bullet.kind === "boss" ? "#ffdb6a" : "#ff715f";
  ctx.shadowColor = bullet.kind === "boss" ? "#ff9c3e" : "#ff4258"; ctx.shadowBlur = 13; ctx.beginPath();
  if (bullet.kind === "turret" || bullet.kind === "boss") ctx.rect(bullet.x - bullet.radius * .7, bullet.y - bullet.radius * .7, bullet.radius * 1.4, bullet.radius * 1.4);
  else ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
  ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.stroke(); ctx.restore();
}

function drawShooterWarning(enemy, timestamp) {
  const pulse = .62 + Math.sin(timestamp / 85 + enemy.phase) * .22;
  const center = enemy.x + enemy.width / 2;
  ctx.save(); ctx.globalAlpha = pulse; ctx.strokeStyle = enemy.kind === "charger" || enemy.boss ? "#ff665c" : "#ffba62"; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = enemy.boss ? 4 : 3;
  ctx.setLineDash([10, 9]); ctx.beginPath(); ctx.moveTo(center, 118); ctx.lineTo(center, enemy.kind === "charger" ? shooterSceneHeight() - 180 : 184); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(center, 118); ctx.lineTo(center - 14, 92); ctx.lineTo(center + 14, 92); ctx.closePath(); ctx.fill();
  const ghostY = enemy.boss ? 184 : 148;
  ctx.globalAlpha = pulse * .42;
  ctx.beginPath(); ctx.arc(center, ghostY, Math.max(28, enemy.width * .58), 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = pulse * .72;
  drawBitmapSprite(enemy.boss || enemy.kind === "turret" || enemy.kind === "charger" ? 2 : 1, center - enemy.width * .62, ghostY - enemy.height * .52, enemy.width * 1.24, enemy.height * 1.04, { fallback: ctx.fillStyle, alpha: pulse * .72 });
  if (enemy.boss) { ctx.font = "800 18px ui-monospace, Consolas, monospace"; ctx.textAlign = "center"; ctx.fillText("GUARDIAN INBOUND", 360, 146); }
  ctx.restore();
}

function drawShooterEnemy(enemy, timestamp) {
  if (timestamp < enemy.warningUntil) { drawShooterWarning(enemy, timestamp); return; }
  const sprite = enemy.boss || enemy.kind === "turret" || enemy.kind === "charger" ? 2 : 1;
  drawBitmapSprite(sprite, enemy.x - 12, enemy.y - 12, enemy.width + 24, enemy.height + 24, { fallback: enemy.boss ? "#ff7b65" : enemy.elite ? "#ff9c68" : "#58ded7", scale: enemy.boss ? 1.1 : enemy.kind === "weaver" ? 1.12 : 1, rotation: enemy.kind === "weaver" ? Math.sin(timestamp / 330 + enemy.phase) * .08 : 0 });
  ctx.save();
  if (enemy.kind === "weaver") { ctx.strokeStyle = "rgba(95,232,225,.82)"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(enemy.x - 8, enemy.y + enemy.height * .55); ctx.lineTo(enemy.x + enemy.width / 2, enemy.y + enemy.height * .28); ctx.lineTo(enemy.x + enemy.width + 8, enemy.y + enemy.height * .55); ctx.stroke(); }
  if (enemy.kind === "turret") { ctx.strokeStyle = "#ffbd68"; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width * .52, 0, Math.PI * 2); ctx.stroke(); }
  if (enemy.shield > 0) { ctx.strokeStyle = "rgba(97,216,255,.92)"; ctx.lineWidth = 4; ctx.shadowColor = "#55d9ff"; ctx.shadowBlur = 12; ctx.beginPath(); ctx.ellipse(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.width * .62, enemy.height * .68, 0, 0, Math.PI * 2); ctx.stroke(); }
  if (!enemy.boss && enemy.hp < enemy.maxHp) { ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(enemy.x, enemy.y - 10, enemy.width, 5); ctx.fillStyle = enemy.elite ? "#ffb668" : "#68ebe3"; ctx.fillRect(enemy.x, enemy.y - 10, enemy.width * Math.max(0, enemy.hp / enemy.maxHp), 5); }
  ctx.restore();
}

function drawShooterHud(timestamp) {
  const plan = shooterWavePlans[shooterWaveIndex] || { label: "待命", count: 1 };
  const progress = plan.boss && shooterBoss ? 1 - shooterBoss.hp / shooterBoss.maxHp : Math.min(1, shooterWaveDefeated / Math.max(1, plan.count));
  ctx.save(); ctx.fillStyle = "rgba(3,17,25,.86)"; ctx.beginPath(); ctx.roundRect(18, 16, 684, 92, 18); ctx.fill(); ctx.strokeStyle = "rgba(91,224,221,.28)"; ctx.lineWidth = 2; ctx.stroke();
  ctx.font = "800 15px ui-monospace, Consolas, monospace"; ctx.textBaseline = "middle"; ctx.textAlign = "left"; ctx.fillStyle = "#b8fff9"; ctx.fillText("ENERGY", 36, 42);
  for (let life = 0; life < shooterMaxLives; life += 1) { ctx.globalAlpha = life < shooterLives ? 1 : .18; ctx.fillStyle = shooterLives === 1 && life === 0 && Math.floor(timestamp / 180) % 2 ? "#ff665c" : "#63e8df"; ctx.beginPath(); ctx.roundRect(36 + life * 24, 58, 18, 8, 4); ctx.fill(); }
  ctx.globalAlpha = 1;
  if (shooterShield > 0) { ctx.strokeStyle = "#7fdcff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(36 + shooterMaxLives * 24 + 10, 62, 8, 0, Math.PI * 2); ctx.stroke(); }
  ctx.textAlign = "center"; ctx.fillStyle = "#f3fbff"; ctx.font = "850 18px Inter, sans-serif"; ctx.fillText("WAVE " + (shooterWaveIndex + 1) + " / " + shooterWaveCount, 360, 40);
  ctx.fillStyle = "#9cb9c4"; ctx.font = "700 12px Inter, sans-serif"; ctx.fillText(plan.label, 360, 64);
  const barX = 254; const barY = 83; const barW = 212;
  ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.beginPath(); ctx.roundRect(barX, barY, barW, 7, 4); ctx.fill();
  const gradient = ctx.createLinearGradient(barX, 0, barX + barW, 0); gradient.addColorStop(0, "#55e7df"); gradient.addColorStop(1, plan.boss ? "#ff665c" : "#ffd06a"); ctx.fillStyle = gradient; ctx.beginPath(); ctx.roundRect(barX, barY, barW * progress, 7, 4); ctx.fill();
  ctx.textAlign = "right"; ctx.fillStyle = "#b8fff9"; ctx.font = "800 14px ui-monospace, Consolas, monospace"; ctx.fillText(String(shooterScore).padStart(6, "0"), 682, 39); ctx.fillStyle = shooterCombo > 1 ? "#ffd06a" : "#87aab4"; ctx.fillText("COMBO ×" + Math.max(1, shooterCombo), 682, 66); ctx.restore();
}

function drawShooterPulseControl(timestamp) {
  const x = 646; const y = shooterSceneHeight() - 94; const ready = shooterPulseCharge >= 100;
  ctx.save(); ctx.fillStyle = "rgba(3,18,25,.76)"; ctx.beginPath(); ctx.arc(x, y, 44, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = "rgba(94,226,222,.2)"; ctx.stroke();
  ctx.strokeStyle = ready ? "#b9fffa" : "#55e5dc"; ctx.shadowColor = ready ? "#7ffff7" : "transparent"; ctx.shadowBlur = ready ? 18 + Math.sin(timestamp / 120) * 4 : 0; ctx.beginPath(); ctx.arc(x, y, 44, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * shooterPulseCharge / 100); ctx.stroke(); ctx.shadowBlur = 0;
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillStyle = ready ? "#ffffff" : "#a8c7cd"; ctx.font = "800 12px Inter, sans-serif"; ctx.fillText(ready ? "脉冲" : Math.round(shooterPulseCharge) + "%", x, y - 2); ctx.font = "700 9px Inter, sans-serif"; ctx.fillText(ready ? "READY" : "CHARGE", x, y + 15); ctx.restore();
}

function drawShooter(timestamp = 0) {
  clearCanvas(); ctx.save(); ctx.translate(0, gameSceneTop()); const flash = timestamp < shooterHitFlashUntil;
  drawPlayfield(10, 6, 700, shooterSceneHeight() - 12, { radius: 30, alpha: .54 });
  const nebula = ctx.createRadialGradient(360, shooterSceneHeight() * .28, 30, 360, shooterSceneHeight() * .28, 420); nebula.addColorStop(0, "rgba(33,127,142,.18)"); nebula.addColorStop(.52, "rgba(25,60,91,.08)"); nebula.addColorStop(1, "rgba(3,11,18,0)"); ctx.fillStyle = nebula; ctx.fillRect(12, 8, 696, shooterSceneHeight() - 16);
  for (let index = 0; index < 82; index += 1) { const speed = .022 + index % 5 * .007; const y = (index * 91 + timestamp * speed) % shooterSceneHeight(); const size = index % 7 === 0 ? 3 : index % 3 === 0 ? 2 : 1; ctx.globalAlpha = .34 + (index % 4) * .13; ctx.fillStyle = index % 9 === 0 ? "#80f8ee" : "#d7f1ff"; ctx.fillRect((index * 149) % 720, y, size, size * 1.6); }
  ctx.globalAlpha = 1; bullets.forEach(drawShooterBullet); enemyBullets.forEach(drawShooterEnemyBullet); enemies.forEach((enemy) => drawShooterEnemy(enemy, timestamp));
  pickups.forEach((pickup) => { const pulse = 1 + Math.sin(timestamp / 130 + pickup.phase) * .1; drawBitmapSprite(6, pickup.x - 7, pickup.y - 7, pickup.width + 14, pickup.height + 14, { fallback: pickup.type === "repair" ? "#7dffb1" : pickup.type === "overdrive" ? "#ffd06a" : "#71e6ff", scale: pulse, rotation: timestamp / 1100 }); ctx.save(); ctx.strokeStyle = pickup.type === "repair" ? "#7dffb1" : pickup.type === "overdrive" ? "#ffd06a" : "#71e6ff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(pickup.x + pickup.width / 2, pickup.y + pickup.height / 2, 27 + Math.sin(timestamp / 100) * 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); });
  particles.forEach((particle) => { ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2)); drawBitmapSprite(5, particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size, { fallback: particle.color, circle: true, padding: 8, alpha: ctx.globalAlpha }); });
  ctx.globalAlpha = 1;
  if (ship && !(timestamp < shipInvulnerableUntil && Math.floor(timestamp / 82) % 2)) {
    if (shooterShield > 0) { ctx.strokeStyle = "rgba(100,224,255,.9)"; ctx.lineWidth = 4; ctx.shadowColor = "#58dfff"; ctx.shadowBlur = 16; ctx.beginPath(); ctx.ellipse(ship.x + ship.width / 2, ship.y + ship.height / 2, ship.width * .64, ship.height * .57, 0, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
    drawBitmapSprite(0, ship.x - 14, ship.y - 14, ship.width + 28, ship.height + 28, { fallback: "#65e6df" }); drawBitmapSprite(7, ship.x + ship.width / 2 - 14, ship.y + ship.height - 10, 28, 42, { fallback: "#ffd16a", padding: 8, alpha: .94 });
  }
  if (shooterPulseEffect) { const progress = Math.min(1, Math.max(0, (timestamp - shooterPulseEffect.startedAt) / (shooterPulseEffect.until - shooterPulseEffect.startedAt))); ctx.strokeStyle = "rgba(133,255,249," + (1 - progress) + ")"; ctx.lineWidth = 9 * (1 - progress) + 2; ctx.shadowColor = "#7ffcf5"; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(shooterPulseEffect.x, shooterPulseEffect.y, shooterPulseEffect.radius * progress, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0; }
  drawShooterHud(timestamp); drawShooterPulseControl(timestamp);
  if (timestamp < rapidFireUntil) { ctx.fillStyle = "#ffd06a"; ctx.font = "800 12px ui-monospace, Consolas, monospace"; ctx.textAlign = "left"; ctx.fillText("OVERDRIVE " + Math.max(0, Math.ceil((rapidFireUntil - timestamp) / 1000)) + "s", 28, 128); }
  if (timestamp < shooterWaveBannerUntil) { const alpha = Math.min(1, Math.max(0, (shooterWaveBannerUntil - timestamp) / 420)); ctx.fillStyle = "rgba(3,18,27," + Math.min(.78, alpha) + ")"; ctx.fillRect(0, shooterSceneHeight() * .42 - 42, 720, 84); ctx.fillStyle = "rgba(235,255,255," + alpha + ")"; ctx.font = "900 25px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText(shooterWaveBannerText, 360, shooterSceneHeight() * .42 + 7); }
  if (flash) { ctx.fillStyle = "rgba(255,83,72,.16)"; ctx.fillRect(0, 0, 720, shooterSceneHeight()); }
  ctx.restore(); finishCanvasStyle();
}

function shooterLoop(timestamp) {
  if (!running) return;
  const delta = shooterLast ? timestamp - shooterLast : 16.67;
  if (shooterLast) shooterMaxFrameGapMs = Math.max(shooterMaxFrameGapMs, delta);
  shooterFrameCount += 1; shooterLast = timestamp; updateShooter(delta, timestamp); drawShooter(timestamp);
  if (running) shooterFrame = requestAnimationFrame(shooterLoop);
}

function startGame() {
  if (shooterFrame) cancelAnimationFrame(shooterFrame);
  resetCampaignRandom();
  const loadout = currentShooterLoadout();
  shooterWavePlans = shooterLevelBlueprints();
  killTarget = shooterWavePlans.reduce((total, wave) => total + wave.count, 0);
  ship = { x: 320, y: shooterSceneHeight() - 170, width: 80, height: 104 };
  bullets = []; enemies = []; enemyBullets = []; pickups = []; particles = []; kills = 0; shooterScore = 0;
  const difficultyLives = config.difficulty === "relaxed" ? 1 : config.difficulty === "challenging" ? -1 : 0;
  shooterMaxLives = Math.max(3, loadout.maxLives + difficultyLives); shooterLives = shooterMaxLives; shooterShield = loadout.id === "bulwark" ? 1 : 0;
  shooterHeld = { left: false, right: false, up: false, down: false }; shooterLast = 0; nextEnemyAt = performance.now() + 900; nextShotAt = 0; shipInvulnerableUntil = 0; shooterStartedAt = performance.now(); shooterPointerId = null; shooterCombo = 0; shooterBestCombo = 0; lastKillAt = 0; rapidFireUntil = 0; shooterGrazeCount = 0; shooterPointerMoves = 0; shooterFrameCount = 0; shooterMaxFrameGapMs = 0; shooterLastPointerMoveAt = 0; shooterMaxPointerGapMs = 0; shooterPointerTarget = null; shooterPointerType = "none";
  shooterWaveIndex = 0; shooterWaveSpawned = 0; shooterWaveDefeated = 0; shooterIntermissionUntil = performance.now() + 650; shooterPulseCharge = loadout.id === "bulwark" ? 50 : 35; shooterPulseEffect = null; shooterPulseReadyNotified = false; shooterBoss = null; shooterBossPhase = 0; shooterHitFlashUntil = 0;
  shooterWaveBannerText = "WAVE 1 · " + shooterWavePlans[0].label; shooterWaveBannerUntil = performance.now() + 2100;
  running = true; hideOverlay(); syncShooterAbilityControl(); setMetric("W1/3 · 0/" + killTarget); setStatus(currentShooterLoadout().label + "出击 · 第 1 波 " + shooterWavePlans[0].label + "；移动规避，主武器自动射击。"); startAmbient(); shooterFrame = requestAnimationFrame(shooterLoop);
}

function handleControl(value) {
  shooterPointerTarget = null;
  if (value === "left") { shooterHeld.left = true; setTimeout(() => { shooterHeld.left = false; }, 210); }
  if (value === "right") { shooterHeld.right = true; setTimeout(() => { shooterHeld.right = false; }, 210); }
  if (value === "up") { shooterHeld.up = true; setTimeout(() => { shooterHeld.up = false; }, 210); }
  if (value === "down") { shooterHeld.down = true; setTimeout(() => { shooterHeld.down = false; }, 210); }
  if (value === "pulse" || value === "fire") activateShooterPulse();
}

function handleKey(key) {
  shooterPointerTarget = null; const lower = key.toLowerCase();
  if (key === "ArrowLeft" || lower === "a") shooterHeld.left = true;
  if (key === "ArrowRight" || lower === "d") shooterHeld.right = true;
  if (key === "ArrowUp" || lower === "w") shooterHeld.up = true;
  if (key === "ArrowDown" || lower === "s") shooterHeld.down = true;
  if (key === " " || lower === "f") activateShooterPulse();
}

window.addEventListener("keyup", (event) => { const lower = event.key.toLowerCase(); if (event.key === "ArrowLeft" || lower === "a") shooterHeld.left = false; if (event.key === "ArrowRight" || lower === "d") shooterHeld.right = false; if (event.key === "ArrowUp" || lower === "w") shooterHeld.up = false; if (event.key === "ArrowDown" || lower === "s") shooterHeld.down = false; });

function moveShipTowardPointer(event) {
  const point = eventScenePoint(event);
  shooterPointerTarget = { x: Math.max(18, Math.min(720 - ship.width - 18, point.x - ship.width / 2)), y: Math.max(142, Math.min(shooterSceneHeight() - ship.height - 26, point.y - ship.height / 2)) };
  shooterPointerType = event.pointerType || "mouse"; const now = performance.now(); if (shooterLastPointerMoveAt) shooterMaxPointerGapMs = Math.max(shooterMaxPointerGapMs, now - shooterLastPointerMoveAt); shooterLastPointerMoveAt = now; shooterPointerMoves += 1;
}

canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  if (point.x > 588 && point.y > shooterSceneHeight() - 156 && shooterPulseCharge >= 100) { activateShooterPulse(); if (event.cancelable) event.preventDefault(); return; }
  shooterPointerId = event.pointerId; shooterPointerType = event.pointerType || "mouse"; shooterLastPointerMoveAt = performance.now(); moveShipTowardPointer(event); try { canvas.setPointerCapture(event.pointerId); } catch {} if (event.cancelable) event.preventDefault();
});

canvas.addEventListener("pointermove", (event) => { if (!running) return; const mouseHover = event.pointerType === "mouse" || !event.pointerType; if (!mouseHover && event.pointerId !== shooterPointerId) return; moveShipTowardPointer(event); if (event.cancelable) event.preventDefault(); });
function releaseShooterPointer(event) { if (event.pointerId !== shooterPointerId) return; if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId); if (shooterPointerType !== "mouse") shooterPointerTarget = null; shooterPointerId = null; }
canvas.addEventListener("pointerup", releaseShooterPointer); canvas.addEventListener("pointercancel", releaseShooterPointer); canvas.addEventListener("pointerleave", (event) => { if ((event.pointerType === "mouse" || !event.pointerType) && shooterPointerId === null) shooterPointerTarget = null; });

function estimatedShooterSessionSeconds() {
  const tier = currentCampaignLevel().tier;
  const guardian = currentCampaignLevel().number % 4 === 0;
  return Math.round((92 + tier * 6 + (guardian ? 12 : 0)) / campaignScale("densityMultiplier") * 10) / 10;
}

runtimeDebugActions = {
  beginContinuousInputAudit: () => { shooterInputAuditActive = true; startGame(); },
  endContinuousInputAudit: () => { shooterInputAuditActive = false; },
  damageOnce: () => { shooterInputAuditActive = false; shipInvulnerableUntil = 0; shooterShield = 0; damageShip(performance.now()); },
  collectRepair: () => { if (shooterLives >= shooterMaxLives) shooterLives = Math.max(1, shooterLives - 1); collectShooterPickup({ type: "repair", x: ship.x, y: ship.y, width: 40, height: 40 }, performance.now()); },
  spawnThreatWave: () => { const timestamp = performance.now(); const enemy = spawnShooterEnemy("turret", timestamp - 2000); enemy.x = ship.x + ship.width / 2 - enemy.width / 2; enemy.y = Math.max(180, ship.y - 210); enemy.warningUntil = 0; for (let index = 0; index < 9; index += 1) aimShooterBullet(enemy, 120, (index - 4) * .1, 9); },
  chargePulse: () => { shooterPulseCharge = 100; shooterPulseReadyNotified = true; syncShooterAbilityControl(); },
  triggerPulse: () => activateShooterPulse(),
  previewBoss: () => { const timestamp = performance.now(); enemies = []; enemyBullets = []; shooterWaveIndex = 2; shooterWavePlans[2] = { label: "守环者", count: 1, kinds: ["boss"], boss: true }; shooterWaveSpawned = 1; shooterWaveDefeated = 0; const boss = spawnShooterEnemy("boss", timestamp - 2000); boss.warningUntil = 0; boss.y = 138; },
  damageBossHalf: () => { if (!shooterBoss) return; shooterBoss.hp = shooterBoss.maxHp * .5 - 1; shooterBossPhase = 2; },
  forceLoss: () => { shooterInputAuditActive = false; shooterLives = 1; shooterShield = 0; shipInvulnerableUntil = 0; damageShip(performance.now()); },
};

runtimeDebugState = () => ({
  level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, loadout: shooterLoadout, loadoutCount: Object.keys(shooterLoadouts).length,
  kills, killTarget, score: shooterScore, lives: shooterLives, maxLives: shooterMaxLives, shield: shooterShield,
  currentWave: shooterWaveIndex + 1, waveCount: shooterWaveCount, waveLabel: shooterWavePlans[shooterWaveIndex]?.label || "待命", waveSpawned: shooterWaveSpawned, waveDefeated: shooterWaveDefeated,
  enemyCount: enemies.length, enemyBulletCount: enemyBullets.length, enemyArchetypeCount: shooterEnemyKinds.length, enemyArchetypes: [...shooterEnemyKinds],
  bossActive: Boolean(shooterBoss && !shooterBoss.dead), bossHp: shooterBoss ? Math.max(0, Math.round(shooterBoss.hp)) : 0, bossMaxHp: shooterBoss ? shooterBoss.maxHp : 0, bossPhase: shooterBossPhase,
  pulseCharge: Math.round(shooterPulseCharge), pulseReady: shooterPulseCharge >= 100, pulseEffectActive: Boolean(shooterPulseEffect), pickupCount: pickups.length,
  grazeCount: shooterGrazeCount, combo: shooterCombo, bestCombo: shooterBestCombo, pointerMoves: shooterPointerMoves, pointerCaptured: shooterPointerId !== null, pointerType: shooterPointerType, pointerTarget: shooterPointerTarget,
  shipPosition: { x: Math.round(ship.x), y: Math.round(ship.y) }, pointerControl: "mouse-hover-touch-hold-drag", abilityControl: "space-f-touch-button",
  bulletVisual: { width: 14, height: 34, glowRadius: 20, bitmapPadding: 2, highContrastCore: true }, enemyBulletVisual: { warmSolidCore: true, shapeDistinctFromPlayer: true, minimumRadius: 8 }, hudContract: "energy-wave-score-boss",
  inputAuditActive: shooterInputAuditActive, frameCount: shooterFrameCount, maxFrameGapMs: Math.round(shooterMaxFrameGapMs * 10) / 10, maxPointerGapMs: Math.round(shooterMaxPointerGapMs * 10) / 10,
  estimatedSessionSeconds: estimatedShooterSessionSeconds(), elapsedMs: shooterStartedAt ? Math.max(0, performance.now() - shooterStartedAt) : 0,
});

syncShooterLoadoutUi();
ship = { x: 320, y: shooterSceneHeight() - 170, width: 80, height: 104 };
shooterWavePlans = shooterLevelBlueprints();
syncShooterAbilityControl();
drawShooter();


redrawGameArt = () => { drawShooter(); };
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
  const identity = {"projectId":"08191f9f-5323-451a-baca-dcdda4dd242e","versionId":"1582f209-fce1-44ca-9442-ec0d45b1ee4e"};
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