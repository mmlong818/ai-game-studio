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
const config = {"title":"植光拼图","template":"puzzle","difficulty":"standard","visualStyle":"fashion","puzzleRules":{"pieceCount":20,"allowedPieceCounts":[6,9,12,16,20,24,30,36,42,48,50],"maxPieceCount":50,"startArrangement":"perimeter","snapTolerance":0.26,"guideOpacity":0.14},"imagePath":"./assets/cover.png","imageLevels":[{"id":"gallery-01","label":"口袋花园","path":"./assets/level-gallery-01.png"},{"id":"gallery-02","label":"雨后温室","path":"./assets/level-gallery-02.png"},{"id":"gallery-03","label":"月光池塘","path":"./assets/level-gallery-03.png"},{"id":"gallery-04","label":"果香野餐","path":"./assets/level-gallery-04.png"},{"id":"gallery-05","label":"糖果云丘","path":"./assets/level-gallery-05.png"},{"id":"gallery-06","label":"镜面花房","path":"./assets/level-gallery-06.png"},{"id":"gallery-07","label":"晨雾睡莲","path":"./assets/level-gallery-07.png"},{"id":"gallery-08","label":"莓果露营","path":"./assets/level-gallery-08.png"},{"id":"gallery-09","label":"珊瑚小径","path":"./assets/level-gallery-09.png"},{"id":"gallery-10","label":"星砂庭院","path":"./assets/level-gallery-10.png"},{"id":"gallery-11","label":"风铃草坡","path":"./assets/level-gallery-11.png"},{"id":"gallery-12","label":"汽水海岸","path":"./assets/level-gallery-12.png"},{"id":"gallery-13","label":"蒲公英站台","path":"./assets/level-gallery-13.png"},{"id":"gallery-14","label":"蜜桃溪谷","path":"./assets/level-gallery-14.png"},{"id":"gallery-15","label":"萤火果园","path":"./assets/level-gallery-15.png"},{"id":"gallery-16","label":"薄荷玻璃屋","path":"./assets/level-gallery-16.png"},{"id":"gallery-17","label":"月兔湖畔","path":"./assets/level-gallery-17.png"},{"id":"gallery-18","label":"彩纸野餐","path":"./assets/level-gallery-18.png"},{"id":"gallery-19","label":"云朵盆栽","path":"./assets/level-gallery-19.png"},{"id":"gallery-20","label":"极光花园","path":"./assets/level-gallery-20.png"}],"breakoutLevels":[],"aspectRatio":"9:16","cameraMode":"board","inputModes":["drag","pointer","keyboard"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":[],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"puzzle-01","label":"01 · 认识规则 · 横图重组","tier":1,"tierLabel":"认识规则","variant":0,"seed":1559169596,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"横图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":2,"id":"puzzle-02","label":"02 · 认识规则 · 竖图重组","tier":1,"tierLabel":"认识规则","variant":1,"seed":4273373423,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"竖图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":3,"id":"puzzle-03","label":"03 · 认识规则 · 方图重组","tier":1,"tierLabel":"认识规则","variant":2,"seed":410918558,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"方图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":4,"id":"puzzle-04","label":"04 · 认识规则 · 外围整理","tier":1,"tierLabel":"认识规则","variant":3,"seed":3120928073,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"外围整理","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"解锁稳定节奏"},{"number":5,"id":"puzzle-05","label":"05 · 稳定节奏 · 横图重组","tier":2,"tierLabel":"稳定节奏","variant":0,"seed":3586987000,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"横图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":6,"id":"puzzle-06","label":"06 · 稳定节奏 · 竖图重组","tier":2,"tierLabel":"稳定节奏","variant":1,"seed":2006231467,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"竖图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":7,"id":"puzzle-07","label":"07 · 稳定节奏 · 方图重组","tier":2,"tierLabel":"稳定节奏","variant":2,"seed":2438733914,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"方图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":8,"id":"puzzle-08","label":"08 · 稳定节奏 · 外围整理","tier":2,"tierLabel":"稳定节奏","variant":3,"seed":862174725,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"外围整理","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"解锁加入变化"},{"number":9,"id":"puzzle-09","label":"09 · 加入变化 · 横图重组","tier":3,"tierLabel":"加入变化","variant":0,"seed":1294677172,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"横图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":10,"id":"puzzle-10","label":"10 · 加入变化 · 竖图重组","tier":3,"tierLabel":"加入变化","variant":1,"seed":3975328615,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"竖图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":11,"id":"puzzle-11","label":"11 · 加入变化 · 方图重组","tier":3,"tierLabel":"加入变化","variant":2,"seed":247089430,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"方图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":12,"id":"puzzle-12","label":"12 · 加入变化 · 外围整理","tier":3,"tierLabel":"加入变化","variant":3,"seed":2822883265,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"外围整理","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"解锁组合压力"},{"number":13,"id":"puzzle-13","label":"13 · 组合压力 · 横图重组","tier":4,"tierLabel":"组合压力","variant":0,"seed":3389611632,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"横图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":14,"id":"puzzle-14","label":"14 · 组合压力 · 竖图重组","tier":4,"tierLabel":"组合压力","variant":1,"seed":1708184611,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"竖图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":15,"id":"puzzle-15","label":"15 · 组合压力 · 方图重组","tier":4,"tierLabel":"组合压力","variant":2,"seed":2274906834,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"方图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"关卡星章"},{"number":16,"id":"puzzle-16","label":"16 · 组合压力 · 外围整理","tier":4,"tierLabel":"组合压力","variant":3,"seed":565176477,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"外围整理","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"解锁最终掌握"},{"number":17,"id":"puzzle-17","label":"17 · 最终掌握 · 横图重组","tier":5,"tierLabel":"最终掌握","variant":0,"seed":1131898700,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"横图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"大师徽记"},{"number":18,"id":"puzzle-18","label":"18 · 最终掌握 · 竖图重组","tier":5,"tierLabel":"最终掌握","variant":1,"seed":3711892991,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"竖图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"大师徽记"},{"number":19,"id":"puzzle-19","label":"19 · 最终掌握 · 方图重组","tier":5,"tierLabel":"最终掌握","variant":2,"seed":2093382574,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"方图重组","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"大师徽记"},{"number":20,"id":"puzzle-20","label":"20 · 最终掌握 · 外围整理","tier":5,"tierLabel":"最终掌握","variant":3,"seed":2660102745,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"外围整理","mission":"从外围辨认图像关系，以尽量少的试放恢复整幅画面。","masteryRules":[{"id":"efficiency","label":"移动次数不超过拼块数的 160%","metric":"moves","comparison":"ratio-lte","referenceMetric":"pieceCount","target":1.6},{"id":"control","label":"错误回弹不超过 2 次","metric":"bounceCount","comparison":"lte","target":2}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:bd06891f-1021-4fbd-992d-1b9b6e5d3917:2d0c3547-a336-47dd-b770-3cb568f5066f","masteryStorageKey":"forge-mastery:bd06891f-1021-4fbd-992d-1b9b6e5d3917:2d0c3547-a336-47dd-b770-3cb568f5066f"};
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


const puzzleBlueprints = [
  ["晨叶初光","认识轮廓",6,.3,3,false,0],["风铃花窗","认识轮廓",9,.28,3,false,0],
  ["软云茶会","认识轮廓",12,.26,3,false,0],["珊瑚邮局","认识轮廓",16,.24,3,false,0],
  ["橘猫温室","组织外围",20,.22,2,false,0],["月兔电台","组织外围",24,.2,2,false,0],
  ["果冻列车","组织外围",20,.2,2,false,0],["星砂书店","组织外围",24,.18,2,false,0],
  ["雨后街角","纹理判断",30,.16,2,false,0],["莓果天台","纹理判断",30,.15,2,false,0],
  ["浮岛花园","纹理判断",36,.14,2,false,0],["海盐灯塔","纹理判断",36,.13,2,false,0],
  ["夜航市集","组合压力",42,.12,1,true,0],["玻璃森林","组合压力",42,.11,1,true,0],
  ["鲸歌车站","组合压力",48,.1,1,true,0],["糖霜剧场","组合压力",48,.09,1,true,0],
  ["彗星花房","最终掌握",50,.08,1,true,0],["银杏博物馆","最终掌握",50,.07,1,true,0],
  ["蓝调水族馆","最终掌握",50,.06,1,true,210],["植光终章","最终掌握",50,.05,1,true,180],
].map((value,index)=>({number:index+1,name:value[0],chapter:value[1],pieceCount:value[2],guideOpacity:value[3],hintUses:value[4],rotationRecommended:value[5],challengeSeconds:value[6]}));

let image = new Image();
let pieces = [];
let columns = 4;
let rows = 3;
let board = { x:110,y:260,width:500,height:750,cellWidth:100,cellHeight:75 };
let activePieceCount = config.puzzleRules ? config.puzzleRules.pieceCount : 20;
let activeLevelId = config.imageLevels?.[0]?.id || "pocket-garden";
let puzzleImageLoading = true;
let puzzleImageRequestId = 0;
let selectedGroupId = null;
let dragState = null;
let panState = null;
let groupSequence = 0;
let placedCount = 0;
let moves = 0;
let bounceCount = 0;
let connectionCount = 0;
let hintsRemaining = 3;
let hintsUsed = 0;
let hintPieceIndex = -1;
let hintUntil = 0;
let previewUntil = 0;
let previewStartedAt = 0;
let connectionPulseUntil = 0;
let completionUntil = 0;
let completionToken = 0;
let trayScale = .72;
let edgeOnly = false;
let rotationEnabled = false;
let puzzleMode = "classic";
let puzzlePaused = false;
let viewScale = 1;
let viewPan = { x:0,y:0 };
let timeLimitMs = 0;
let remainingMs = 0;
let startedAt = 0;
let lastFrameAt = 0;
let lastTimerSecond = -1;
let restoredPieces = 0;
let validation = null;
let pendingPuzzleRestart = false;

const pieceCountInputs = Array.from(document.querySelectorAll("[data-puzzle-count]"));
const levelInputs = Array.from(document.querySelectorAll("[data-puzzle-level]"));
const modeButtons = Array.from(document.querySelectorAll("[data-puzzle-mode]"));
const rotationInput = document.querySelector("[data-puzzle-rotation]");
const puzzleBlueprint = () => puzzleBlueprints[Math.max(0,Math.min(19,currentCampaignLevel().number-1))];

function syncInputs(inputs,value){inputs.forEach((input)=>{input.value=String(value);});}
function activeLevelLabel(){return config.imageLevels?.find((level)=>level.id===activeLevelId)?.label||"我的图片";}
function puzzleSessionKey(){return config.campaignStorageKey+"-puzzle-session-v2";}
function setPuzzleImageLoading(loading){puzzleImageLoading=loading;startButton.disabled=loading;startButton.setAttribute("aria-busy",String(loading));if(loading)setStatus("正在载入关卡图片，请稍候。");}
function beginPuzzleImageLoad(){puzzleImageRequestId+=1;setPuzzleImageLoading(true);return puzzleImageRequestId;}
function clearPuzzleCanvas(){ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#eee9e2";ctx.fillRect(0,0,canvas.width,canvas.height);const light=ctx.createRadialGradient(canvas.width*.5,canvas.height*.48,30,canvas.width*.5,canvas.height*.48,canvas.height*.62);light.addColorStop(0,"rgba(255,255,255,.88)");light.addColorStop(.68,"rgba(250,246,240,.64)");light.addColorStop(1,"rgba(212,202,194,.42)");ctx.fillStyle=light;ctx.fillRect(0,0,canvas.width,canvas.height);}

function gridForImage(){
  const aspect=Math.max(.25,Math.min(4,image.naturalWidth/image.naturalHeight));const candidates=[];
  for(let candidateRows=2;candidateRows<=activePieceCount;candidateRows+=1){if(activePieceCount%candidateRows!==0)continue;const candidateColumns=activePieceCount/candidateRows;if(candidateColumns<2)continue;candidates.push({rows:candidateRows,columns:candidateColumns});}
  const best=candidates.sort((left,right)=>Math.abs(Math.log((left.columns/left.rows)/aspect))-Math.abs(Math.log((right.columns/right.rows)/aspect)))[0]||{rows:4,columns:5};columns=best.columns;rows=best.rows;
}
function layoutBoard(){
  const aspect=Math.max(.25,Math.min(4,image.naturalWidth/image.naturalHeight));const maxWidth=config.aspectRatio==="9:16"?510:560;const maxHeight=config.aspectRatio==="9:16"?760:610;let width=maxWidth,height=width/aspect;if(height>maxHeight){height=maxHeight;width=height*aspect;}
  board={x:(canvas.width-width)/2,y:(canvas.height-height)/2,width,height,cellWidth:width/columns,cellHeight:height/rows};const horizontalCount=Math.max(2,Math.ceil(activePieceCount*.3));const verticalCount=Math.max(1,Math.ceil((activePieceCount-horizontalCount*2)/2));const sideScale=Math.min((board.x-10)*2/board.cellWidth,(canvas.width-board.x-board.width-10)*2/board.cellWidth);trayScale=Math.max(.42,Math.min(.88,sideScale,(canvas.width-26)/(horizontalCount*board.cellWidth*1.04),board.height/(verticalCount*board.cellHeight*1.05)));
}
function boundarySign(kind,row,column){const seed=row*31+column*17+currentCampaignLevel().seed+(kind==="horizontal"?7:13);return seed%2===0?1:-1;}
function edgesFor(row,column){return{top:row===0?0:-boundarySign("horizontal",row-1,column),right:column===columns-1?0:boundarySign("vertical",row,column),bottom:row===rows-1?0:boundarySign("horizontal",row,column),left:column===0?0:-boundarySign("vertical",row,column-1)};}
function horizontalEdge(path,startX,y,deltaX,sign,outward){if(!sign){path.lineTo(startX+deltaX,y);return;}const depth=Math.min(Math.abs(deltaX),board.cellHeight)*.21*sign*outward;path.lineTo(startX+deltaX*.34,y);path.bezierCurveTo(startX+deltaX*.34,y+depth,startX+deltaX*.66,y+depth,startX+deltaX*.66,y);path.lineTo(startX+deltaX,y);}
function verticalEdge(path,x,startY,deltaY,sign,outward){if(!sign){path.lineTo(x,startY+deltaY);return;}const depth=Math.min(Math.abs(deltaY),board.cellWidth)*.21*sign*outward;path.lineTo(x,startY+deltaY*.34);path.bezierCurveTo(x+depth,startY+deltaY*.34,x+depth,startY+deltaY*.66,x,startY+deltaY*.66);path.lineTo(x,startY+deltaY);}
function piecePath(piece){const path=new Path2D(),width=board.cellWidth,height=board.cellHeight;path.moveTo(0,0);horizontalEdge(path,0,0,width,piece.edges.top,-1);verticalEdge(path,width,0,height,piece.edges.right,1);horizontalEdge(path,width,height,-width,piece.edges.bottom,1);verticalEdge(path,0,height,-height,piece.edges.left,-1);path.closePath();return path;}
function pieceIsEdge(piece){return!piece.edges.top||!piece.edges.right||!piece.edges.bottom||!piece.edges.left;}
function groupPieces(groupId){return pieces.filter((piece)=>piece.groupId===groupId);}
function selectedPieces(){return selectedGroupId===null?[]:groupPieces(selectedGroupId);}

function perimeterSlots(){
  const count=activePieceCount,topCount=Math.max(2,Math.ceil(count*.3)),bottomCount=Math.max(2,Math.floor(count*.3)),sideTotal=count-topCount-bottomCount,leftCount=Math.ceil(sideTotal/2),rightCount=sideTotal-leftCount,halfW=board.cellWidth*trayScale/2,halfH=board.cellHeight*trayScale/2;
  const spread=(amount,start,end)=>Array.from({length:amount},(_value,index)=>amount===1?(start+end)/2:start+(end-start)*index/(amount-1));const topY=Math.max(halfH+18,board.y-halfH-22),bottomY=Math.min(canvas.height-halfH-18,board.y+board.height+halfH+22),leftX=Math.max(halfW+8,board.x-halfW-20),rightX=Math.min(canvas.width-halfW-8,board.x+board.width+halfW+20),slots=[];
  spread(topCount,halfW+12,canvas.width-halfW-12).forEach((x)=>slots.push({x,y:topY,zone:"top"}));spread(rightCount,board.y+halfH,board.y+board.height-halfH).forEach((y)=>slots.push({x:rightX,y,zone:"right"}));spread(bottomCount,canvas.width-halfW-12,halfW+12).forEach((x)=>slots.push({x,y:bottomY,zone:"bottom"}));spread(leftCount,board.y+board.height-halfH,board.y+halfH).forEach((y)=>slots.push({x:leftX,y,zone:"left"}));return slots;
}
function deterministicShuffle(values){const out=[...values];resetCampaignRandom();for(let index=out.length-1;index>0;index-=1){const swapIndex=Math.floor(campaignRandom()*(index+1));[out[index],out[swapIndex]]=[out[swapIndex],out[index]];}return out;}
function createPieces(){
  pieces=[];groupSequence=0;for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1)pieces.push({index:pieces.length,row,column,homeX:board.x+(column+.5)*board.cellWidth,homeY:board.y+(row+.5)*board.cellHeight,x:0,y:0,angle:rotationEnabled?Math.floor(campaignRandom()*4)*Math.PI/2:0,edges:edgesFor(row,column),groupId:groupSequence++,locked:false,displayScale:trayScale,bounceUntil:0});
  const slots=deterministicShuffle(perimeterSlots());pieces.forEach((piece,index)=>{const slot=slots[index];piece.x=slot.x;piece.y=slot.y;piece.zone=slot.zone;});validation=validatePuzzleGeometry();
}
function validatePuzzleGeometry(){let complementary=true;pieces.forEach((piece)=>{const right=pieces.find((candidate)=>candidate.row===piece.row&&candidate.column===piece.column+1),bottom=pieces.find((candidate)=>candidate.row===piece.row+1&&candidate.column===piece.column);if(right&&piece.edges.right!==-right.edges.left)complementary=false;if(bottom&&piece.edges.bottom!==-bottom.edges.top)complementary=false;});const outsideCount=pieces.filter((piece)=>piece.x<board.x||piece.x>board.x+board.width||piece.y<board.y||piece.y>board.y+board.height).length,centers=new Set(pieces.map((piece)=>piece.x.toFixed(2)+":"+piece.y.toFixed(2)));return{pieceProduct:columns*rows,complementary,outsideCount,uniqueCenters:centers.size};}

function worldTransform(){ctx.translate(canvas.width/2+viewPan.x,canvas.height/2+viewPan.y);ctx.scale(viewScale,viewScale);ctx.translate(-canvas.width/2,-canvas.height/2);}
function screenToWorld(point){return{x:(point.x-canvas.width/2-viewPan.x)/viewScale+canvas.width/2,y:(point.y-canvas.height/2-viewPan.y)/viewScale+canvas.height/2};}
function resetPuzzleView(){viewScale=1;viewPan={x:0,y:0};}
function setPuzzleZoom(next){viewScale=Math.max(1,Math.min(2.1,next));if(viewScale===1)viewPan={x:0,y:0};setStatus("画板缩放 "+Math.round(viewScale*100)+"%；拖动画板空白处可平移。");drawPuzzle();}
function drawTrayRails(){ctx.save();ctx.strokeStyle="rgba(104,91,82,.2)";ctx.lineWidth=2;ctx.setLineDash([8,12]);const gap=14;ctx.strokeRect(gap,Math.max(gap,board.y-board.cellHeight*trayScale-42),canvas.width-gap*2,Math.min(board.cellHeight*trayScale+32,board.y-gap*2));ctx.strokeRect(gap,board.y+board.height+10,canvas.width-gap*2,Math.max(34,canvas.height-board.y-board.height-gap-10));ctx.strokeRect(gap,board.y,Math.max(32,board.x-gap-10),board.height);ctx.strokeRect(board.x+board.width+10,board.y,Math.max(32,canvas.width-board.x-board.width-gap-10),board.height);ctx.restore();}
function drawBoardGuide(timestamp){
  drawPlayfield(board.x-14,board.y-14,board.width+28,board.height+28,{radius:22,alpha:.94,fill:"rgba(255,253,248,.96)",stroke:"rgba(95,84,75,.34)",lineWidth:3});ctx.save();ctx.beginPath();ctx.rect(board.x,board.y,board.width,board.height);ctx.clip();ctx.globalAlpha=Math.max(.035,puzzleBlueprint().guideOpacity||config.puzzleRules?.guideOpacity||.14);ctx.drawImage(image,board.x,board.y,board.width,board.height);ctx.restore();
  ctx.save();ctx.strokeStyle="rgba(95,84,75,.18)";ctx.lineWidth=1;for(let column=1;column<columns;column+=1){ctx.beginPath();ctx.moveTo(board.x+column*board.cellWidth,board.y);ctx.lineTo(board.x+column*board.cellWidth,board.y+board.height);ctx.stroke();}for(let row=1;row<rows;row+=1){ctx.beginPath();ctx.moveTo(board.x,board.y+row*board.cellHeight);ctx.lineTo(board.x+board.width,board.y+row*board.cellHeight);ctx.stroke();}ctx.restore();
  if(hintPieceIndex>=0&&timestamp<hintUntil){const piece=pieces[hintPieceIndex],pulse=.55+.25*Math.sin(timestamp/100);ctx.save();ctx.strokeStyle="rgba(236,137,105,"+pulse+")";ctx.lineWidth=6;ctx.strokeRect(piece.homeX-board.cellWidth/2,piece.homeY-board.cellHeight/2,board.cellWidth,board.cellHeight);ctx.restore();}
}
function drawPiece(piece,timestamp){
  if(edgeOnly&&!pieceIsEdge(piece)&&!piece.locked&&piece.groupId!==selectedGroupId)return;const selected=piece.groupId===selectedGroupId,scale=selected?1:piece.displayScale,bounce=piece.bounceUntil>timestamp?Math.sin((piece.bounceUntil-timestamp)*.09)*7:0;
  ctx.save();ctx.translate(piece.x+bounce,piece.y);ctx.rotate(piece.angle);ctx.scale(scale,scale);ctx.translate(-board.cellWidth/2,-board.cellHeight/2);const path=piecePath(piece);ctx.shadowColor=selected?"rgba(88,69,59,.34)":"rgba(68,54,45,.2)";ctx.shadowBlur=selected?16:7;ctx.shadowOffsetY=selected?8:4;ctx.save();ctx.clip(path);ctx.drawImage(image,-piece.column*board.cellWidth,-piece.row*board.cellHeight,board.width,board.height);if(piece.locked){ctx.fillStyle="rgba(255,255,255,.025)";ctx.fill(path);}ctx.restore();ctx.shadowColor="transparent";ctx.strokeStyle=selected?"#e46f72":piece.locked?"rgba(255,255,255,.78)":"rgba(80,69,61,.62)";ctx.lineWidth=(selected?4:2.4)/Math.max(.55,scale);ctx.stroke(path);if(timestamp<connectionPulseUntil&&selected){ctx.strokeStyle="rgba(255,211,118,.9)";ctx.lineWidth=7;ctx.globalAlpha=Math.max(0,(connectionPulseUntil-timestamp)/260);ctx.stroke(path);}ctx.restore();
}
function drawPreviewOverlay(timestamp){if(timestamp>=previewUntil)return;const remaining=previewUntil-timestamp,alpha=Math.min(1,(timestamp-previewStartedAt)/180,remaining/220)*.96;ctx.save();ctx.fillStyle="rgba(247,243,238,"+(alpha*.88)+")";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.globalAlpha=alpha;drawPlayfield(board.x-18,board.y-18,board.width+36,board.height+36,{radius:24,alpha:1,fill:"#fff",stroke:"rgba(82,71,63,.48)",lineWidth:3});ctx.drawImage(image,board.x,board.y,board.width,board.height);ctx.fillStyle="#4e443f";ctx.font="700 18px Inter,Microsoft YaHei,sans-serif";ctx.textAlign="center";ctx.fillText("完成图预览",canvas.width/2,Math.max(34,board.y-32));ctx.restore();}
function drawPauseOverlay(){if(!puzzlePaused)return;ctx.save();ctx.fillStyle="rgba(248,245,240,.86)";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#4d443f";ctx.textAlign="center";ctx.font="700 38px Inter,Microsoft YaHei,sans-serif";ctx.fillText("拼图暂停",canvas.width/2,canvas.height*.48);ctx.font="500 18px Inter,Microsoft YaHei,sans-serif";ctx.fillText("按 P、空格或继续返回",canvas.width/2,canvas.height*.53);ctx.restore();}
function drawCompletion(timestamp){if(timestamp>=completionUntil)return;const alpha=Math.max(0,Math.min(1,(completionUntil-timestamp)/220));ctx.save();ctx.globalAlpha=.95;ctx.drawImage(image,board.x,board.y,board.width,board.height);ctx.strokeStyle="rgba(255,218,128,"+alpha+")";ctx.lineWidth=10;ctx.shadowColor="#ffe0a6";ctx.shadowBlur=24;ctx.strokeRect(board.x,board.y,board.width,board.height);ctx.restore();}
function drawPuzzle(timestamp=performance.now()){clearPuzzleCanvas();if(!image.naturalWidth)return;ctx.save();worldTransform();drawTrayRails();drawBoardGuide(timestamp);pieces.filter((piece)=>piece.locked).forEach((piece)=>drawPiece(piece,timestamp));pieces.filter((piece)=>!piece.locked&&piece.groupId!==selectedGroupId).forEach((piece)=>drawPiece(piece,timestamp));selectedPieces().forEach((piece)=>drawPiece(piece,timestamp));drawPreviewOverlay(timestamp);drawPauseOverlay();drawCompletion(timestamp);ctx.restore();finishCanvasStyle();}
function drawPreview(){clearPuzzleCanvas();if(!image.naturalWidth)return;drawPlayfield(board.x-18,board.y-18,board.width+36,board.height+36,{radius:24,alpha:.96,fill:"#fff",stroke:"rgba(93,80,71,.38)",lineWidth:3});ctx.drawImage(image,board.x,board.y,board.width,board.height);finishCanvasStyle();}

function inversePiecePoint(piece,x,y,scale){const dx=(x-piece.x)/scale,dy=(y-piece.y)/scale,cos=Math.cos(-piece.angle),sin=Math.sin(-piece.angle);return{x:dx*cos-dy*sin+board.cellWidth/2,y:dx*sin+dy*cos+board.cellHeight/2};}
function findPieceAt(x,y){for(let index=pieces.length-1;index>=0;index-=1){const piece=pieces[index];if(piece.locked||(edgeOnly&&!pieceIsEdge(piece)&&piece.groupId!==selectedGroupId))continue;const scale=piece.groupId===selectedGroupId?1:piece.displayScale,point=inversePiecePoint(piece,x,y,scale);if(ctx.isPointInPath(piecePath(piece),point.x,point.y))return piece;}return null;}
function translateGroup(groupId,dx,dy){groupPieces(groupId).forEach((piece)=>{piece.x+=dx;piece.y+=dy;piece.displayScale=1;});}
function normalizeAngle(value){const full=Math.PI*2;let angle=value%full;if(angle<0)angle+=full;return Math.abs(angle-full)<.001?0:angle;}
function rotateSelectedGroup(){if(!rotationEnabled||selectedGroupId===null||puzzlePaused)return false;const group=selectedPieces();if(!group.length||group.some((piece)=>piece.locked))return false;const cx=group.reduce((sum,piece)=>sum+piece.x,0)/group.length,cy=group.reduce((sum,piece)=>sum+piece.y,0)/group.length;group.forEach((piece)=>{const dx=piece.x-cx,dy=piece.y-cy;piece.x=cx-dy;piece.y=cy+dx;piece.angle=normalizeAngle(piece.angle+Math.PI/2);});moves+=1;playSound("ui");setStatus("已旋转当前拼块组；回到正向后才能与相邻块连接。");drawPuzzle();return true;}
function neighborPieces(piece){return pieces.filter((candidate)=>Math.abs(candidate.row-piece.row)+Math.abs(candidate.column-piece.column)===1);}
function mergeGroups(sourceId,targetId){if(sourceId===targetId)return;pieces.forEach((piece)=>{if(piece.groupId===sourceId)piece.groupId=targetId;});selectedGroupId=targetId;connectionCount+=1;connectionPulseUntil=performance.now()+260;playSound("success");}
function tryConnectSelected(){if(selectedGroupId===null)return false;let connected=false,searching=true;while(searching){searching=false;const source=selectedPieces();for(const piece of source){if(Math.abs(normalizeAngle(piece.angle))>.001)continue;for(const neighbor of neighborPieces(piece)){if(neighbor.groupId===selectedGroupId||Math.abs(normalizeAngle(neighbor.angle))>.001)continue;const expectedX=piece.x+(neighbor.column-piece.column)*board.cellWidth,expectedY=piece.y+(neighbor.row-piece.row)*board.cellHeight,distance=Math.hypot(neighbor.x-expectedX,neighbor.y-expectedY),tolerance=Math.min(board.cellWidth,board.cellHeight)*.27;if(distance>tolerance)continue;translateGroup(selectedGroupId,neighbor.x-expectedX,neighbor.y-expectedY);const sourceId=selectedGroupId;mergeGroups(sourceId,neighbor.groupId);connected=true;searching=true;break;}if(searching)break;}}return connected;}
function lockGroupAtHome(){if(selectedGroupId===null)return false;const group=selectedPieces();if(!group.length||group.some((piece)=>Math.abs(normalizeAngle(piece.angle))>.001))return false;let anchor=null,distance=Infinity;group.forEach((piece)=>{const next=Math.hypot(piece.x-piece.homeX,piece.y-piece.homeY);if(next<distance){distance=next;anchor=piece;}});const tolerance=Math.min(board.cellWidth,board.cellHeight)*(config.puzzleRules?config.puzzleRules.snapTolerance:.26);if(!anchor||distance>tolerance)return false;translateGroup(selectedGroupId,anchor.homeX-anchor.x,anchor.homeY-anchor.y);if(!group.every((piece)=>Math.hypot(piece.x-piece.homeX,piece.y-piece.homeY)<1.5))return false;group.forEach((piece)=>{piece.x=piece.homeX;piece.y=piece.homeY;piece.locked=true;piece.displayScale=1;});placedCount=pieces.filter((piece)=>piece.locked).length;connectionPulseUntil=performance.now()+300;playSound("reward");persistPuzzleSession();return true;}
function completePuzzle(){completionUntil=performance.now()+1100;const token=++completionToken;setGameSessionState("stage-complete");clearPuzzleSession();drawPuzzle();window.setTimeout(()=>{if(token!==completionToken)return;const elapsed=Math.max(1,Math.round((performance.now()-startedAt)/1000));showResult(true,"画面完整重现",puzzleBlueprint().name+"完成 · "+columns+" × "+rows+" · "+moves+" 次移动 · "+connectionCount+" 次拼合 · "+bounceCount+" 次错位 · "+hintsUsed+" 次提示 · "+elapsed+" 秒。");},850);}
function releaseSelectedGroup(){if(selectedGroupId===null)return;moves+=1;const connected=tryConnectSelected(),locked=lockGroupAtHome();if(locked){setMetric(placedCount+" / "+pieces.length);setStatus("整组归位："+placedCount+" / "+pieces.length+"。相邻拼块可以先在外围拼合，再整体放回画板。");if(placedCount===pieces.length){completePuzzle();return;}}else if(connected)setStatus("拼缝已连接；当前组包含 "+selectedPieces().length+" 块，可以整体移动。");else{selectedPieces().forEach((piece)=>{piece.bounceUntil=performance.now()+230;});bounceCount+=1;playSound("illegal");setStatus("这里还没有可连接的拼缝；对照纹理、轮廓或短暂预览后再试。");}drawPuzzle();}

canvas.addEventListener("pointerdown",(event)=>{if(!running||puzzlePaused)return;const screen=eventCanvasPoint(event),world=screenToWorld(screen),hit=findPieceAt(world.x,world.y);if(hit){selectedGroupId=hit.groupId;selectedPieces().forEach((piece)=>{piece.displayScale=1;});dragState={pointerId:event.pointerId,last:world,moved:0};canvas.setPointerCapture(event.pointerId);playSound("move");drawPuzzle();return;}selectedGroupId=null;if(viewScale>1){panState={pointerId:event.pointerId,last:screen};canvas.setPointerCapture(event.pointerId);}drawPuzzle();});
canvas.addEventListener("pointermove",(event)=>{const screen=eventCanvasPoint(event);if(dragState&&dragState.pointerId===event.pointerId){const world=screenToWorld(screen),dx=world.x-dragState.last.x,dy=world.y-dragState.last.y;translateGroup(selectedGroupId,dx,dy);dragState.moved+=Math.hypot(dx,dy);dragState.last=world;drawPuzzle();return;}if(panState&&panState.pointerId===event.pointerId){viewPan.x+=screen.x-panState.last.x;viewPan.y+=screen.y-panState.last.y;panState.last=screen;drawPuzzle();}});
function releasePuzzlePointer(event){if(dragState&&dragState.pointerId===event.pointerId){const moved=dragState.moved;dragState=null;if(moved<7&&rotationEnabled)rotateSelectedGroup();else releaseSelectedGroup();}panState=null;if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);}
canvas.addEventListener("pointerup",releasePuzzlePointer);canvas.addEventListener("pointercancel",releasePuzzlePointer);canvas.addEventListener("wheel",(event)=>{if(!running||puzzlePaused)return;event.preventDefault();setPuzzleZoom(viewScale+(event.deltaY<0?.15:-.15));},{passive:false});

function arrangePuzzlePieces(){if(!running||puzzlePaused)return false;const slots=deterministicShuffle(perimeterSlots()),movable=pieces.filter((piece)=>!piece.locked&&groupPieces(piece.groupId).length===1);movable.forEach((piece,index)=>{const slot=slots[index%slots.length];piece.x=slot.x;piece.y=slot.y;piece.zone=slot.zone;piece.displayScale=trayScale;});selectedGroupId=null;resetPuzzleView();setStatus("未连接的单块已重新整理到四区外围；已连接组保留当前位置。");playSound("ui");drawPuzzle();return true;}
function toggleEdgePieces(){edgeOnly=!edgeOnly;document.querySelectorAll("[data-control=edge]").forEach((button)=>{button.textContent=edgeOnly?"显示全部":"只看边块";button.setAttribute("aria-pressed",String(edgeOnly));});selectedGroupId=null;setStatus(edgeOnly?"已隐藏内部拼块，只显示具有直边的外围块。":"已恢复显示全部拼块。");drawPuzzle();return true;}
function showPuzzlePreview(){if(!running||puzzlePaused)return false;previewStartedAt=performance.now();previewUntil=previewStartedAt+1450;playSound("ui");setStatus("完成图会短暂淡入，拼块位置与进度不会改变。");drawPuzzle();return true;}
function showPuzzleHint(){if(!running||puzzlePaused||hintsRemaining<=0)return false;const candidate=pieces.find((piece)=>!piece.locked&&(pieceIsEdge(piece)||pieces.some((other)=>other.locked&&neighborPieces(piece).includes(other))))||pieces.find((piece)=>!piece.locked);if(!candidate)return false;hintsRemaining-=1;hintsUsed+=1;hintPieceIndex=candidate.index;hintUntil=performance.now()+1400;selectedGroupId=candidate.groupId;syncPuzzleControls();playSound("ui");setStatus("提示只标出一块与目标区域，不会自动完成；还可提示 "+hintsRemaining+" 次。");drawPuzzle();return true;}
function togglePuzzlePause(){if(gameSessionState==="playing"){puzzlePaused=true;setGameSessionState("paused");stopEnvironmentAudio();setStatus("拼图已暂停；返回后由你主动继续。");}else if(gameSessionState==="paused"){puzzlePaused=false;setGameSessionState("playing");lastFrameAt=performance.now();startAmbient();setStatus(puzzleBlueprint().name+"继续。");}syncPuzzleControls();drawPuzzle();}
function syncPuzzleControls(){document.querySelectorAll("[data-control]").forEach((button)=>{if(button.dataset.control==="pause")button.disabled=!(gameSessionState==="playing"||gameSessionState==="paused");});document.querySelectorAll("[data-control=pause]").forEach((button)=>{button.textContent=puzzlePaused?"继续":"暂停";});document.querySelectorAll("[data-control=hint]").forEach((button)=>{button.textContent="提示 "+hintsRemaining;button.disabled=puzzlePaused||hintsRemaining<=0||gameSessionState!=="playing";});document.querySelectorAll("[data-control=rotate]").forEach((button)=>{button.disabled=puzzlePaused||!rotationEnabled||gameSessionState!=="playing";});}
function clearPuzzleSession(){try{safeStorage.removeItem(puzzleSessionKey());}catch{}}
function persistPuzzleSession(){if(activeLevelId==="custom")return;try{safeStorage.setItem(puzzleSessionKey(),JSON.stringify({schemaVersion:2,level:currentCampaignLevel().number,imageLevel:activeLevelId,pieceCount:activePieceCount,mode:puzzleMode,rotation:rotationEnabled,locked:pieces.filter((piece)=>piece.locked).map((piece)=>piece.index),moves,bounceCount,connectionCount,hintsRemaining,hintsUsed,updatedAt:new Date().toISOString()}));}catch{}}
function restorePuzzleSession(){restoredPieces=0;if(activeLevelId==="custom")return;try{const saved=JSON.parse(safeStorage.getItem(puzzleSessionKey())||"null");if(!saved||saved.schemaVersion!==2||saved.level!==currentCampaignLevel().number||saved.imageLevel!==activeLevelId||saved.pieceCount!==activePieceCount||saved.mode!==puzzleMode||saved.rotation!==rotationEnabled)return;const locked=new Set(saved.locked||[]);pieces.filter((piece)=>locked.has(piece.index)).forEach((piece)=>{piece.x=piece.homeX;piece.y=piece.homeY;piece.angle=0;piece.locked=true;piece.displayScale=1;piece.groupId=-1;});placedCount=pieces.filter((piece)=>piece.locked).length;restoredPieces=placedCount;moves=Number(saved.moves)||0;bounceCount=Number(saved.bounceCount)||0;connectionCount=Number(saved.connectionCount)||0;hintsRemaining=Math.max(0,Number(saved.hintsRemaining)||0);hintsUsed=Number(saved.hintsUsed)||0;}catch{}}

function startGame(){
  if(puzzleImageLoading||!image.naturalWidth||!image.naturalHeight){pendingPuzzleRestart=true;setStatus("图片仍在载入，完成后会自动开始。");return;}pendingPuzzleRestart=false;completionToken+=1;resetCampaignRandom();rotationEnabled=Boolean(rotationInput?.checked);puzzleMode=modeButtons.find((button)=>button.classList.contains("is-selected"))?.dataset.puzzleMode||"classic";gridForImage();layoutBoard();createPieces();placedCount=0;moves=0;bounceCount=0;connectionCount=0;hintsRemaining=puzzleBlueprint().hintUses;hintsUsed=0;hintPieceIndex=-1;hintUntil=0;previewUntil=0;completionUntil=0;selectedGroupId=null;dragState=null;panState=null;edgeOnly=currentCampaignLevel().number>=13;puzzlePaused=false;resetPuzzleView();timeLimitMs=puzzleMode==="timed"?Math.max(90000,(puzzleBlueprint().challengeSeconds||activePieceCount*6)*1000):0;remainingMs=timeLimitMs;startedAt=performance.now();lastFrameAt=startedAt;lastTimerSecond=-1;restorePuzzleSession();hideOverlay();setMetric(placedCount+" / "+pieces.length);setStatus("第 "+currentCampaignLevel().number+" 关 · "+puzzleBlueprint().name+" · "+pieces.length+" 块；拼块已整理在画板四周"+(restoredPieces?"，并恢复 "+restoredPieces+" 块进度":"")+"。");startAmbient();syncPuzzleControls();drawPuzzle();
}
function loadPuzzleImage(level,shouldRestart){if(!level||level.id==="custom")return;activeLevelId=level.id;syncInputs(levelInputs,activeLevelId);const requestId=beginPuzzleImageLoad(),nextImage=new Image();nextImage.addEventListener("load",()=>{if(requestId!==puzzleImageRequestId)return;image=nextImage;setPuzzleImageLoading(false);gridForImage();layoutBoard();const settled=["won","stage-complete","lost"].includes(gameSessionState),shouldResume=(shouldRestart||pendingPuzzleRestart)&&!settled;pendingPuzzleRestart=false;if(shouldResume)startGame();else if(settled)drawPuzzle();else{drawPreview();setStatus("已选择 "+level.label+" · "+activePieceCount+" 块。");}});nextImage.src=level.path;}
function applyPuzzleCampaignLevel(level){const allowed=config.puzzleRules?.allowedPieceCounts||[6,9,12,16,20,24,30,36,42,48,50];activePieceCount=allowed.includes(puzzleBlueprint().pieceCount)?puzzleBlueprint().pieceCount:allowed[Math.min(allowed.length-1,Math.floor((level.number-1)/2))];syncInputs(pieceCountInputs,activePieceCount);if(activeLevelId==="custom")return;const builtIns=config.imageLevels.filter((candidate)=>candidate.id!=="custom"),next=builtIns[(level.number-1)%builtIns.length];if(next&&next.id!==activeLevelId)loadPuzzleImage(next,false);}
onCampaignLevelChanged=applyPuzzleCampaignLevel;

pieceCountInputs.forEach((input)=>input.addEventListener("change",()=>{activePieceCount=Number(input.value);syncInputs(pieceCountInputs,activePieceCount);clearPuzzleSession();if(running)startGame();else setStatus("已选择 "+activeLevelLabel()+" · "+activePieceCount+" 块。开始后拼块会整理在画板四周。 ");}));
levelInputs.forEach((input)=>input.addEventListener("change",()=>{const next=config.imageLevels.find((level)=>level.id===input.value);if(!next||next.id==="custom")return;clearPuzzleSession();loadPuzzleImage(next,running);}));
modeButtons.forEach((button)=>button.addEventListener("click",()=>{modeButtons.forEach((candidate)=>{const selected=candidate===button;candidate.classList.toggle("is-selected",selected);candidate.setAttribute("aria-pressed",String(selected));});clearPuzzleSession();}));rotationInput?.addEventListener("change",clearPuzzleSession);

const uploadInput=document.querySelector("#puzzle-upload");
if(uploadInput)uploadInput.addEventListener("change",(event)=>{const file=event.target.files&&event.target.files[0];if(!file||!file.type.startsWith("image/")){setStatus("请选择 PNG、JPEG 或 WebP 图片。");return;}if(file.size>12*1024*1024){setStatus("图片超过 12MB，请先缩小文件后再试。");return;}const reader=new FileReader();reader.addEventListener("load",()=>{const requestId=beginPuzzleImageLoad(),nextImage=new Image();nextImage.addEventListener("load",()=>{if(requestId!==puzzleImageRequestId)return;if(nextImage.naturalWidth<200||nextImage.naturalHeight<200){setPuzzleImageLoading(false);setStatus("图片边长至少需要 200 像素，避免拼块模糊。");return;}image=nextImage;setPuzzleImageLoading(false);activeLevelId="custom";if(!config.imageLevels.some((level)=>level.id==="custom")){config.imageLevels.unshift({id:"custom",label:"我的图片",path:""});levelInputs.forEach((input)=>input.add(new Option("我的图片","custom",true,true),0));}syncInputs(levelInputs,activeLevelId);document.querySelector("#upload-name").textContent=file.name+" · "+image.naturalWidth+"×"+image.naturalHeight;clearPuzzleSession();startGame();});nextImage.src=String(reader.result);});reader.readAsDataURL(file);});

function selectNextPuzzlePiece(){const available=pieces.filter((piece)=>!piece.locked&&(!edgeOnly||pieceIsEdge(piece)));if(!available.length)return false;const current=available.findIndex((piece)=>piece.groupId===selectedGroupId),next=available[(current+1+available.length)%available.length];selectedGroupId=next.groupId;selectedPieces().forEach((piece)=>{piece.displayScale=1;});setStatus("已选择第 "+(next.index+1)+" 块；方向键移动，Enter 尝试连接或归位。");drawPuzzle();return true;}
function moveSelected(dx,dy){if(selectedGroupId===null)selectNextPuzzlePiece();if(selectedGroupId===null)return;translateGroup(selectedGroupId,dx,dy);drawPuzzle();}
function handleControl(value){if(value==="zoom-in")setPuzzleZoom(viewScale+.2);else if(value==="zoom-out")setPuzzleZoom(viewScale-.2);else if(value==="arrange")arrangePuzzlePieces();else if(value==="edge")toggleEdgePieces();else if(value==="preview")showPuzzlePreview();else if(value==="hint")showPuzzleHint();else if(value==="rotate")rotateSelectedGroup();else if(value==="pause")togglePuzzlePause();}
function handleKey(key){const normalized=key.length===1?key.toLowerCase():key;if(normalized==="p"||key===" "){togglePuzzlePause();return;}if(!running||puzzlePaused)return;if(key==="Tab"){selectNextPuzzlePiece();return;}if(normalized==="h"){showPuzzleHint();return;}if(normalized==="r"){rotateSelectedGroup();return;}if(normalized==="+"){setPuzzleZoom(viewScale+.2);return;}if(normalized==="-"){setPuzzleZoom(viewScale-.2);return;}if(normalized==="v"){showPuzzlePreview();return;}const step=Math.max(7,Math.min(board.cellWidth,board.cellHeight)*.15);if(key==="ArrowLeft")moveSelected(-step,0);if(key==="ArrowRight")moveSelected(step,0);if(key==="ArrowUp")moveSelected(0,-step);if(key==="ArrowDown")moveSelected(0,step);if(key==="Enter"&&selectedGroupId!==null)releaseSelectedGroup();}
function puzzleAnimationLoop(timestamp){if(running&&!puzzlePaused&&timeLimitMs){const delta=lastFrameAt?Math.min(100,timestamp-lastFrameAt):0;remainingMs=Math.max(0,remainingMs-delta);const second=Math.ceil(remainingMs/1000);if(second!==lastTimerSecond){lastTimerSecond=second;setMetric(placedCount+" / "+pieces.length+" · "+second+"s");}if(remainingMs<=0){showResult(false,"限时挑战结束",puzzleBlueprint().name+"还差 "+(pieces.length-placedCount)+" 块；经典模式没有倒计时，也可以减少拼块数量后重试。");syncPuzzleControls();}}lastFrameAt=timestamp;if(running||puzzlePaused||timestamp<hintUntil||timestamp<previewUntil||timestamp<connectionPulseUntil||timestamp<completionUntil)drawPuzzle(timestamp);requestAnimationFrame(puzzleAnimationLoop);}
document.addEventListener("visibilitychange",()=>{if(document.hidden&&gameSessionState==="playing")togglePuzzlePause();});

runtimeDebugActions={
  pointerProbe(){const piece=pieces.find((candidate)=>!candidate.locked);return piece?{from:{x:piece.x,y:piece.y},to:{x:piece.homeX,y:piece.homeY},canvas:{width:canvas.width,height:canvas.height}}:null;},
  selectNext:selectNextPuzzlePiece,
  placeSelectedAtHome(){if(selectedGroupId===null)selectNextPuzzlePiece();const group=selectedPieces();if(!group.length)return false;group.forEach((piece)=>{piece.angle=0;});const anchor=group[0];translateGroup(selectedGroupId,anchor.homeX-anchor.x,anchor.homeY-anchor.y);releaseSelectedGroup();return true;},
  connectPair(){const first=pieces.find((piece)=>!piece.locked),neighbor=first&&neighborPieces(first).find((piece)=>!piece.locked);if(!first||!neighbor)return false;selectedGroupId=first.groupId;first.angle=0;neighbor.angle=0;first.x=neighbor.x-(neighbor.column-first.column)*board.cellWidth;first.y=neighbor.y-(neighbor.row-first.row)*board.cellHeight;releaseSelectedGroup();return groupPieces(neighbor.groupId).length>=2;},
  arrange:arrangePuzzlePieces,hint:showPuzzleHint,preview:showPuzzlePreview,zoomIn:()=>setPuzzleZoom(1.6),pause:togglePuzzlePause,
  forceTimeout(){puzzleMode="timed";timeLimitMs=1000;remainingMs=0;lastFrameAt=performance.now();},
};
runtimeDebugState=()=>({level:currentCampaignLevel().number,levelName:puzzleBlueprint().name,chapter:puzzleBlueprint().chapter,imageLevel:activeLevelId,imageLevelCount:config.imageLevels.length,pieceCount:activePieceCount,grid:{columns,rows,product:columns*rows},placedCount,moves,bounceCount,connectionCount,groupCount:new Set(pieces.filter((piece)=>!piece.locked).map((piece)=>piece.groupId)).size,largestGroup:Math.max(0,...Array.from(new Set(pieces.map((piece)=>piece.groupId))).map((id)=>groupPieces(id).length)),boardAspect:Number((board.width/board.height).toFixed(3)),imageAspect:image.naturalWidth?Number((image.naturalWidth/image.naturalHeight).toFixed(3)):0,boardRect:{x:Math.round(board.x),y:Math.round(board.y),width:Math.round(board.width),height:Math.round(board.height)},perimeterZones:4,trayScale:Number(trayScale.toFixed(3)),outsideCount:validation?.outsideCount||0,uniqueCenters:validation?.uniqueCenters||0,complementaryEdges:Boolean(validation?.complementary),clickPlacement:true,keyboardPlacement:true,groupMovement:true,zoom:viewScale,panEnabled:viewScale>1,edgeOnly,rotationEnabled,puzzleMode,paused:puzzlePaused,hintsRemaining,hintsUsed,previewActive:performance.now()<previewUntil,snapFeedback:connectionPulseUntil>performance.now(),restoredPieces,timeRemaining:Math.ceil(remainingMs/1000),uploadAdaptive:true});

syncInputs(pieceCountInputs,activePieceCount);syncInputs(levelInputs,activeLevelId);const initialImageRequestId=beginPuzzleImageLoad();image.addEventListener("load",()=>{if(initialImageRequestId!==puzzleImageRequestId)return;setPuzzleImageLoading(false);gridForImage();layoutBoard();drawPreview();setStatus("已选择 "+activeLevelLabel()+" · "+activePieceCount+" 块。");});image.src=config.imagePath;requestAnimationFrame(puzzleAnimationLoop);


redrawGameArt = () => { drawPuzzle(); };
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
  const identity = {"projectId":"bd06891f-1021-4fbd-992d-1b9b6e5d3917","versionId":"2d0c3547-a336-47dd-b770-3cb568f5066f"};
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