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
const config = {"title":"漆海碎星","template":"breakout","difficulty":"standard","visualStyle":"classic","puzzleRules":null,"imagePath":"./assets/cover.png","imageLevels":[],"breakoutLevels":[{"id":"breakout-01","label":"01 · 认识规则 · 三线浅滩","path":"./assets/cover.png","rows":5,"columns":9,"speed":4.182,"armorRate":0,"campaignLevel":1,"formationIndex":0,"pattern":"三线浅滩"},{"id":"breakout-02","label":"02 · 认识规则 · 双塔入口","path":"./assets/cover.png","rows":5,"columns":9,"speed":4.258,"armorRate":0,"campaignLevel":2,"formationIndex":1,"pattern":"双塔入口"},{"id":"breakout-03","label":"03 · 认识规则 · 折线阶梯","path":"./assets/cover.png","rows":5,"columns":9,"speed":4.335,"armorRate":0,"campaignLevel":3,"formationIndex":2,"pattern":"折线阶梯"},{"id":"breakout-04","label":"04 · 认识规则 · 潮汐缺口","path":"./assets/cover.png","rows":5,"columns":9,"speed":4.411,"armorRate":0,"campaignLevel":4,"formationIndex":3,"pattern":"潮汐缺口"},{"id":"breakout-05","label":"05 · 稳定节奏 · 珍珠菱阵","path":"./assets/level-coral-gate.png","rows":6,"columns":9,"speed":4.89,"armorRate":0.185,"campaignLevel":5,"formationIndex":4,"pattern":"珍珠菱阵"},{"id":"breakout-06","label":"06 · 稳定节奏 · 沙漏回流","path":"./assets/level-coral-gate.png","rows":6,"columns":9,"speed":4.97,"armorRate":0.185,"campaignLevel":6,"formationIndex":5,"pattern":"沙漏回流"},{"id":"breakout-07","label":"07 · 稳定节奏 · 双峰海沟","path":"./assets/level-coral-gate.png","rows":6,"columns":9,"speed":5.05,"armorRate":0.185,"campaignLevel":7,"formationIndex":6,"pattern":"双峰海沟"},{"id":"breakout-08","label":"08 · 稳定节奏 · 环形礁带","path":"./assets/level-coral-gate.png","rows":6,"columns":9,"speed":5.131,"armorRate":0.185,"campaignLevel":8,"formationIndex":7,"pattern":"环形礁带"},{"id":"breakout-09","label":"09 · 加入变化 · 海星放射","path":"./assets/level-jellyfish-tide.png","rows":8,"columns":10,"speed":5.639,"armorRate":0.33,"campaignLevel":9,"formationIndex":8,"pattern":"海星放射"},{"id":"breakout-10","label":"10 · 加入变化 · 双岛回声","path":"./assets/level-jellyfish-tide.png","rows":8,"columns":10,"speed":5.723,"armorRate":0.33,"campaignLevel":10,"formationIndex":9,"pattern":"双岛回声"},{"id":"breakout-11","label":"11 · 加入变化 · 箭头航标","path":"./assets/level-jellyfish-tide.png","rows":8,"columns":10,"speed":5.807,"armorRate":0.33,"campaignLevel":11,"formationIndex":10,"pattern":"箭头航标"},{"id":"breakout-12","label":"12 · 加入变化 · 鱼骨水道","path":"./assets/level-jellyfish-tide.png","rows":8,"columns":10,"speed":5.891,"armorRate":0.33,"campaignLevel":12,"formationIndex":11,"pattern":"鱼骨水道"},{"id":"breakout-13","label":"13 · 组合压力 · 双重波纹","path":"./assets/level-star-reef.png","rows":9,"columns":9,"speed":6.496,"armorRate":0.515,"campaignLevel":13,"formationIndex":12,"pattern":"双重波纹"},{"id":"breakout-14","label":"14 · 组合压力 · 分潮四门","path":"./assets/level-star-reef.png","rows":9,"columns":9,"speed":6.584,"armorRate":0.515,"campaignLevel":14,"formationIndex":13,"pattern":"分潮四门"},{"id":"breakout-15","label":"15 · 组合压力 · 回旋内湾","path":"./assets/level-star-reef.png","rows":9,"columns":9,"speed":6.673,"armorRate":0.515,"campaignLevel":15,"formationIndex":14,"pattern":"回旋内湾"},{"id":"breakout-16","label":"16 · 组合压力 · 珊瑚王冠","path":"./assets/level-star-reef.png","rows":9,"columns":9,"speed":6.761,"armorRate":0.515,"campaignLevel":16,"formationIndex":15,"pattern":"珊瑚王冠"},{"id":"breakout-17","label":"17 · 最终掌握 · 棋盘碎礁","path":"./assets/level-abyss-crown.png","rows":9,"columns":10,"speed":7.462,"armorRate":0.7,"campaignLevel":17,"formationIndex":16,"pattern":"棋盘碎礁"},{"id":"breakout-18","label":"18 · 最终掌握 · 心潮海湾","path":"./assets/level-abyss-crown.png","rows":9,"columns":10,"speed":7.556,"armorRate":0.7,"campaignLevel":18,"formationIndex":17,"pattern":"心潮海湾"},{"id":"breakout-19","label":"19 · 最终掌握 · 深海盾阵","path":"./assets/level-abyss-crown.png","rows":9,"columns":10,"speed":7.65,"armorRate":0.7,"campaignLevel":19,"formationIndex":18,"pattern":"深海盾阵"},{"id":"breakout-20","label":"20 · 最终掌握 · 王冠重甲","path":"./assets/level-abyss-crown.png","rows":9,"columns":10,"speed":7.744,"armorRate":0.7,"campaignLevel":20,"formationIndex":19,"pattern":"王冠重甲"}],"aspectRatio":"9:16","cameraMode":"fixed-stage","inputModes":["pointer","keyboard","touch-buttons"],"canvasWidth":720,"canvasHeight":1280,"spriteFiles":["./assets/sprites/sprite-01.png","./assets/sprites/sprite-02.png","./assets/sprites/sprite-03.png","./assets/sprites/sprite-04.png","./assets/sprites/sprite-05.png","./assets/sprites/sprite-06.png","./assets/sprites/sprite-07.png","./assets/sprites/sprite-08.png","./assets/sprites/sprite-09.png"],"stageCSpriteFiles":["./assets/stage-c/brick-pearl-intact-v2.png","./assets/stage-c/brick-pearl-cracked-v2.png","./assets/stage-c/brick-pearl-critical-v2.png","./assets/stage-c/brick-coral-intact-v2.png","./assets/stage-c/brick-coral-cracked-v2.png","./assets/stage-c/brick-coral-critical-v2.png","./assets/stage-c/brick-jellyfish-intact-v2.png","./assets/stage-c/brick-jellyfish-cracked-v2.png","./assets/stage-c/brick-jellyfish-critical-v2.png","./assets/stage-c/brick-star-intact-v2.png","./assets/stage-c/brick-star-cracked-v2.png","./assets/stage-c/brick-star-critical-v2.png","./assets/stage-c/brick-abyss-intact-v2.png","./assets/stage-c/brick-abyss-cracked-v2.png","./assets/stage-c/brick-abyss-critical-v2.png"],"campaign":{"levelCount":20,"curve":"stepped","tierSize":4,"unlockMode":"sequential","persistProgress":true},"campaignLevels":[{"number":1,"id":"breakout-01","label":"01 · 认识规则 · 三线浅滩","tier":1,"tierLabel":"认识规则","variant":0,"seed":4149047277,"goalMultiplier":0.76,"speedMultiplier":0.82,"densityMultiplier":0.78,"ruleModifier":"三线浅滩","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":2,"id":"breakout-02","label":"02 · 认识规则 · 双塔入口","tier":1,"tierLabel":"认识规则","variant":1,"seed":1427432766,"goalMultiplier":0.775,"speedMultiplier":0.835,"densityMultiplier":0.795,"ruleModifier":"双塔入口","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":3,"id":"breakout-03","label":"03 · 认识规则 · 折线阶梯","tier":1,"tierLabel":"认识规则","variant":2,"seed":3017571151,"goalMultiplier":0.79,"speedMultiplier":0.85,"densityMultiplier":0.81,"ruleModifier":"折线阶梯","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":4,"id":"breakout-04","label":"04 · 认识规则 · 潮汐缺口","tier":1,"tierLabel":"认识规则","variant":3,"seed":296218776,"goalMultiplier":0.805,"speedMultiplier":0.865,"densityMultiplier":0.825,"ruleModifier":"潮汐缺口","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"解锁稳定节奏"},{"number":5,"id":"breakout-05","label":"05 · 稳定节奏 · 珍珠菱阵","tier":2,"tierLabel":"稳定节奏","variant":4,"seed":2121233961,"goalMultiplier":0.89,"speedMultiplier":0.914,"densityMultiplier":0.894,"ruleModifier":"珍珠菱阵","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":6,"id":"breakout-06","label":"06 · 稳定节奏 · 沙漏回流","tier":2,"tierLabel":"稳定节奏","variant":5,"seed":3694578810,"goalMultiplier":0.905,"speedMultiplier":0.929,"densityMultiplier":0.909,"ruleModifier":"沙漏回流","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":7,"id":"breakout-07","label":"07 · 稳定节奏 · 双峰海沟","tier":2,"tierLabel":"稳定节奏","variant":6,"seed":989742475,"goalMultiplier":0.92,"speedMultiplier":0.944,"densityMultiplier":0.924,"ruleModifier":"双峰海沟","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":8,"id":"breakout-08","label":"08 · 稳定节奏 · 环形礁带","tier":2,"tierLabel":"稳定节奏","variant":7,"seed":2562841556,"goalMultiplier":0.935,"speedMultiplier":0.959,"densityMultiplier":0.939,"ruleModifier":"环形礁带","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"解锁加入变化"},{"number":9,"id":"breakout-09","label":"09 · 加入变化 · 海星放射","tier":3,"tierLabel":"加入变化","variant":8,"seed":3867758949,"goalMultiplier":1.02,"speedMultiplier":1.007,"densityMultiplier":1.009,"ruleModifier":"海星放射","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":10,"id":"breakout-10","label":"10 · 加入变化 · 双岛回声","tier":3,"tierLabel":"加入变化","variant":9,"seed":1196480182,"goalMultiplier":1.035,"speedMultiplier":1.022,"densityMultiplier":1.024,"ruleModifier":"双岛回声","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":11,"id":"breakout-11","label":"11 · 加入变化 · 箭头航标","tier":3,"tierLabel":"加入变化","variant":10,"seed":2769824967,"goalMultiplier":1.05,"speedMultiplier":1.037,"densityMultiplier":1.039,"ruleModifier":"箭头航标","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":12,"id":"breakout-12","label":"12 · 加入变化 · 鱼骨水道","tier":3,"tierLabel":"加入变化","variant":11,"seed":65249808,"goalMultiplier":1.065,"speedMultiplier":1.052,"densityMultiplier":1.054,"ruleModifier":"鱼骨水道","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"解锁组合压力"},{"number":13,"id":"breakout-13","label":"13 · 组合压力 · 双重波纹","tier":4,"tierLabel":"组合压力","variant":12,"seed":1638611873,"goalMultiplier":1.15,"speedMultiplier":1.101,"densityMultiplier":1.123,"ruleModifier":"双重波纹","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":14,"id":"breakout-14","label":"14 · 组合压力 · 分潮四门","tier":4,"tierLabel":"组合压力","variant":13,"seed":3463623154,"goalMultiplier":1.165,"speedMultiplier":1.116,"densityMultiplier":1.138,"ruleModifier":"分潮四门","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":15,"id":"breakout-15","label":"15 · 组合压力 · 回旋内湾","tier":4,"tierLabel":"组合压力","variant":14,"seed":742012675,"goalMultiplier":1.18,"speedMultiplier":1.131,"densityMultiplier":1.153,"ruleModifier":"回旋内湾","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"关卡星章"},{"number":16,"id":"breakout-16","label":"16 · 组合压力 · 珊瑚王冠","tier":4,"tierLabel":"组合压力","variant":15,"seed":2316143948,"goalMultiplier":1.195,"speedMultiplier":1.146,"densityMultiplier":1.168,"ruleModifier":"珊瑚王冠","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"解锁最终掌握"},{"number":17,"id":"breakout-17","label":"17 · 最终掌握 · 棋盘碎礁","tier":5,"tierLabel":"最终掌握","variant":16,"seed":3906273949,"goalMultiplier":1.28,"speedMultiplier":1.194,"densityMultiplier":1.238,"ruleModifier":"棋盘碎礁","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":18,"id":"breakout-18","label":"18 · 最终掌握 · 心潮海湾","tier":5,"tierLabel":"最终掌握","variant":17,"seed":1989974062,"goalMultiplier":1.295,"speedMultiplier":1.209,"densityMultiplier":1.253,"ruleModifier":"心潮海湾","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":19,"id":"breakout-19","label":"19 · 最终掌握 · 深海盾阵","tier":5,"tierLabel":"最终掌握","variant":18,"seed":3613662847,"goalMultiplier":1.31,"speedMultiplier":1.224,"densityMultiplier":1.268,"ruleModifier":"深海盾阵","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"大师徽记"},{"number":20,"id":"breakout-20","label":"20 · 最终掌握 · 王冠重甲","tier":5,"tierLabel":"最终掌握","variant":19,"seed":892311432,"goalMultiplier":1.325,"speedMultiplier":1.239,"densityMultiplier":1.283,"ruleModifier":"王冠重甲","mission":"控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。","masteryRules":[{"id":"efficiency","label":"形成至少 4 连续击破","metric":"clearStreak","comparison":"gte","target":4},{"id":"control","label":"连击倍率达到 ×2","metric":"combo","comparison":"gte","target":2}],"reward":"大师徽记"}],"campaignStorageKey":"forge-campaign:d598835a-5e3d-4fa6-8297-cc61a2a965c5:5195a7ad-8e8d-46bf-bee0-05cc81ef8b2e","masteryStorageKey":"forge-mastery:d598835a-5e3d-4fa6-8297-cc61a2a965c5:5195a7ad-8e8d-46bf-bee0-05cc81ef8b2e"};
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


let paddle;
let ball;
let bricks = [];
let cleared = 0;
let lives = 3;
let frameId = null;
let lastFrame = 0;
let serveDelay = 0;
let currentLevelIndex = 0;
let pendingNextLevel = false;
let campaignComplete = false;
let impactBursts = [];
let brickFragments = [];
let breakoutCombo = 0;
let lastBrickHitAt = 0;
let clearStreak = 0;
let lastBrickClearedAt = 0;
let bombArmed = false;
let lastExplosionRemoved = 0;
let lastExplosionCells = [];
let breakoutMode = "campaign";
let score = 0;
let bestCombo = 0;
let boardsCleared = 0;
let modeStartedAt = 0;
let focusEnergy = 100;
let focusActive = false;
let shieldCharges = 0;
let widePaddleUntil = 0;
let pierceHits = 0;
let lastPowerLabel = "";
let lastPowerAt = 0;
let physicsStepCount = 0;
let collisionProbe = null;
const bombClearThreshold = 3;
const timeAttackSeconds = 120;
const focusTimeScale = .55;
const focusScoreMultiplier = .5;
const levelInputs = Array.from(document.querySelectorAll("[data-breakout-level]"));
const progressLabels = Array.from(document.querySelectorAll("[data-breakout-progress]"));
const modeInputs = Array.from(document.querySelectorAll("[data-breakout-mode]"));
const breakoutLevels = config.breakoutLevels;
const levelImages = breakoutLevels.map((level) => {
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", () => drawBreakout());
  image.src = level.path;
  return image;
});

function currentLevel() {
  return breakoutLevels[currentLevelIndex];
}

function breakoutChapterIndex() {
  return Math.min(4, Math.floor(currentLevelIndex / 4));
}

function breakoutModeLabel() {
  return breakoutMode === "time-attack" ? "限时" : breakoutMode === "endless" ? "无尽" : "旅程";
}

function timeAttackRemaining() {
  if (breakoutMode !== "time-attack" || !modeStartedAt) return 0;
  return Math.max(0, timeAttackSeconds - Math.floor((performance.now() - modeStartedAt) / 1000));
}

function comboIntensity() {
  return Math.min(5, Math.max(0, Math.floor((breakoutCombo - 1) / 2)));
}

function activePaddleWidth() {
  const base = paddle?.baseWidth || 118;
  return performance.now() < widePaddleUntil ? Math.min(184, base + 38) : base;
}

function activePowerLabel() {
  if (shieldCharges) return "潮盾 ×" + shieldCharges;
  if (performance.now() < widePaddleUntil) return "宽挡板";
  if (pierceHits) return "穿透 ×" + pierceHits;
  return "能力待命";
}

function updateModeButtons() {
  modeInputs.forEach((input) => {
    const selected = input.dataset.breakoutMode === breakoutMode;
    input.classList.toggle("is-selected", selected);
    input.setAttribute("aria-pressed", String(selected));
  });
}

function setBreakoutMode(nextMode) {
  if (running || !["campaign", "time-attack", "endless"].includes(nextMode)) return;
  breakoutMode = nextMode;
  pendingNextLevel = false;
  campaignComplete = false;
  if (breakoutMode === "campaign") currentLevelIndex = campaignLevelIndex;
  if (paddle) prepareLevel();
  updateModeButtons();
  const descriptions = {
    campaign: "二十关旅程：每关独立结算，逐章解锁特殊砖与更高压力。",
    "time-attack": "120 秒限时：连续清场并追求高分，聚光会减速但得分减半。",
    endless: "无尽航次：砖阵循环升级，失去全部机会后按清场数与得分结算。",
  };
  overlayTitle.textContent = breakoutModeLabel() + "模式 · " + currentLevel().label.replace(/^\d+\s*/, "");
  overlayDetail.textContent = descriptions[breakoutMode];
  startButton.textContent = "开始" + breakoutModeLabel();
  setStatus("已选择" + breakoutModeLabel() + "模式，准备开始。 ");
  drawBreakout();
}

function breakoutLayout() {
  const height = gameSceneHeight();
  return {
    top: config.aspectRatio === "9:16" ? 38 : 48,
    bottom: config.aspectRatio === "9:16" ? height - 38 : 672,
    paddleY: config.aspectRatio === "9:16" ? height - 112 : 632,
    ballY: config.aspectRatio === "9:16" ? height - 166 : 570,
  };
}

function levelHasBrick(level, row, column) {
  const centerColumn = (level.columns - 1) / 2;
  const centerRow = (level.rows - 1) / 2;
  const x = (column - centerColumn) / Math.max(1, centerColumn);
  const y = (row - centerRow) / Math.max(1, centerRow);
  const radius = Math.sqrt(x * x + y * y);
  switch (level.formationIndex) {
    case 0: return row % 2 === 0;
    case 1: return column <= 1 || column >= level.columns - 2 || row >= level.rows - 2;
    case 2: return Math.abs(row - Math.round(column * (level.rows - 1) / (level.columns - 1))) <= 1;
    case 3: return row >= 2 || Math.abs(column - centerColumn) > 1.5;
    case 4: return Math.abs(x) + Math.abs(y) <= 1.18;
    case 5: return Math.abs(x) >= Math.abs(y) * .58;
    case 6: return row >= Math.floor(Math.abs(column - centerColumn) * .52);
    case 7: return radius > .42 && radius < 1.16;
    case 8: return Math.abs(x) < .2 || Math.abs(y) < .24 || Math.abs(Math.abs(x) - Math.abs(y)) < .2;
    case 9: return Math.min(Math.hypot(x - .55, y), Math.hypot(x + .55, y)) < .56;
    case 10: return Math.abs(y) < .22 || Math.abs(y - x * .62) < .2 || (x > .58 && Math.abs(y) < .48);
    case 11: return Math.abs(y) < .2 || Math.abs(Math.abs(y) - Math.abs(x) * .58) < .18;
    case 12: {
      const wave = Math.sin(column * 1.08) * .34;
      return Math.abs(y - wave) < .25 || Math.abs(y - wave + .7) < .2;
    }
    case 13: return row === 0 || row === level.rows - 1 || column === 1 || column === level.columns - 2 || (Math.abs(column - centerColumn) < .6 && row > centerRow);
    case 14: return row === 0 || column === level.columns - 1 || (row === level.rows - 1 && column > 1) || (column === 1 && row > 1) || (row === 2 && column > 1 && column < level.columns - 2);
    case 15: {
      const peak = column === 1 || column === Math.round(centerColumn) || column === level.columns - 2;
      return row >= level.rows - 3 || (row === level.rows - 4 && column % 2 === 0) || (row <= 2 && peak);
    }
    case 16: return (row + column) % 2 === 0 || row === level.rows - 1;
    case 17: {
      const upperLobes = Math.min(Math.hypot(x - .42, y + .42), Math.hypot(x + .42, y + .42)) < .58;
      const lowerPoint = y >= -.15 && Math.abs(x) < .88 * (1 - (y + .15) / 1.35);
      return upperLobes || lowerPoint;
    }
    case 18: return row <= 1 || Math.abs(column - centerColumn) <= Math.max(.6, centerColumn * (1 - row / (level.rows + 1)));
    case 19: {
      const peak = column === 1 || column === Math.round(centerColumn) || column === level.columns - 2;
      return row >= level.rows - 3 || (row === level.rows - 4 && column % 2 === 0) || (row <= 2 && peak) || (row === 3 && Math.abs(column - centerColumn) <= 2);
    }
    default: return true;
  }
}

function breakoutBrickKind(level, row, column, armorValue) {
  const tier = breakoutChapterIndex() + 1;
  const specialValue = ((row * 43 + column * 67 + currentLevelIndex * 29) % 101) / 101;
  if (tier >= 2 && specialValue < .045) return "shield";
  if (tier >= 3 && specialValue >= .22 && specialValue < .27) return "wide";
  if (tier >= 4 && specialValue >= .48 && specialValue < .535) return "pierce";
  return armorValue < level.armorRate ? "armor" : "normal";
}

function createBricks() {
  const level = currentLevel();
  const layout = breakoutLayout();
  const fieldWidth = 596;
  const gap = level.columns === 10 ? 7 : 8;
  const brickWidth = (fieldWidth - gap * (level.columns - 1)) / level.columns;
  const brickHeight = level.rows >= 8 ? 34 : 38;
  const rowGap = level.rows >= 8 ? 7 : 8;
  bricks = [];
  for (let row = 0; row < level.rows; row += 1) {
    for (let column = 0; column < level.columns; column += 1) {
      if (!levelHasBrick(level, row, column)) continue;
      const armorValue = ((row * 17 + column * 31 + currentLevelIndex * 13) % 100) / 100;
      const kind = breakoutBrickKind(level, row, column, armorValue);
      const hits = kind === "armor" ? (armorValue < level.armorRate * .42 ? 3 : 2) : 1;
      bricks.push({
        id: currentLevelIndex + ":" + row + ":" + column,
        x: 62 + column * (brickWidth + gap),
        y: layout.top + 118 + row * (brickHeight + rowGap),
        width: brickWidth,
        height: brickHeight,
        row,
        column,
        alive: true,
        hits,
        maxHits: hits,
        kind,
        tone: (row + column + currentLevelIndex) % 4,
        hitAt: 0,
      });
    }
  }
}

function drawStageHud(layout) {
  const label = currentLevel().label.replace(/^\d+\s*/, "");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(68, layout.top + 22, 584, 76, 20);
  ctx.fillStyle = "rgba(3,30,37,.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(192,236,255,.42)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(223,246,255,.72)";
  ctx.font = "650 18px Inter, sans-serif";
  ctx.fillText(breakoutModeLabel() + " · " + String(currentLevelIndex + 1).padStart(2, "0"), 94, layout.top + 47);
  ctx.fillStyle = "#fff8e8";
  ctx.font = "800 27px Inter, sans-serif";
  ctx.fillText(label, 94, layout.top + 75, 300);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(223,246,255,.72)";
  ctx.font = "650 14px Inter, sans-serif";
  ctx.fillText("得分", 488, layout.top + 45);
  ctx.fillStyle = "#ece4b4";
  ctx.font = "850 23px Inter, sans-serif";
  ctx.fillText(String(score), 488, layout.top + 73, 112);
  if (breakoutMode === "time-attack") {
    ctx.fillStyle = timeAttackRemaining() <= 15 ? "#f39ba8" : "rgba(223,246,255,.78)";
    ctx.font = "750 12px ui-monospace, Consolas, monospace";
    ctx.fillText(timeAttackRemaining() + "秒", 488, layout.top + 91);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(223,246,255,.72)";
  ctx.font = "650 18px Inter, sans-serif";
  ctx.fillText("机会", 626, layout.top + 48);
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath();
    ctx.arc(578 + index * 23, layout.top + 74, 7, 0, Math.PI * 2);
    ctx.fillStyle = index < lives ? "#fff4ca" : "rgba(218,238,248,.18)";
    ctx.fill();
  }
  ctx.restore();
}

function drawImpactBursts(timestamp) {
  impactBursts = impactBursts.filter((impact) => timestamp - impact.startedAt < (impact.cross ? 360 : 230));
  impactBursts.forEach((impact) => {
    const duration = impact.cross ? 360 : 230;
    const progress = (timestamp - impact.startedAt) / duration;
    const size = 46 + progress * 54;
    const arms = impact.cross ? [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] : [[0, 0]];
    arms.forEach(([dx, dy], index) => {
      const distance = impact.cross && index ? 16 + progress * 54 : 0;
      drawBitmapSprite(6, impact.x + dx * distance - size / 2, impact.y + dy * distance - size / 2, size, size, {
        fallback: "#fff0a8",
        padding: 8,
        scale: 1.08,
        alpha: (1 - progress) * (impact.cross && index ? .82 : 1),
        rotation: progress * .3 + index * .12,
      });
    });
  });
}

function spawnBrickFragments(brick, count) {
  for (let index = 0; index < count; index += 1) {
    brickFragments.push({
      x: brick.x + brick.width * (.25 + Math.random() * .5),
      y: brick.y + brick.height * (.25 + Math.random() * .5),
      vx: (Math.random() - .5) * 3.6,
      vy: -1.2 - Math.random() * 2.5,
      life: 1,
      rotation: Math.random() * Math.PI,
      size: 12 + Math.random() * 12,
    });
  }
}

function drawBrickFragments() {
  brickFragments.forEach((fragment) => {
    drawBitmapImage(stageCImages[breakoutChapterIndex() * 3 + 2], fragment.x - fragment.size / 2, fragment.y - fragment.size / 2, fragment.size, fragment.size * .65, {
      fallback: palette.highlight,
      alpha: fragment.life,
      rotation: fragment.rotation,
    });
  });
}

function drawLevelBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#081733";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const image = levelImages[currentLevelIndex];
  if (image?.complete && image.naturalWidth) {
    ctx.save();
    ctx.globalAlpha = .52;
    drawImageCover(image, 0, 0, canvas.width, canvas.height);
    const shade = ctx.createLinearGradient(0, 0, 0, canvas.height);
    shade.addColorStop(0, "rgba(3,13,34,.48)");
    shade.addColorStop(.55, "rgba(4,13,35,.58)");
    shade.addColorStop(1, "rgba(3,8,26,.72)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function drawSimpleBrick(brick) {
  const chapterColors = [
    ["#f4d7c2", "#edbd99", "#ffe6c9", "#dca98a"],
    ["#ef8a70", "#f5a37f", "#dc705e", "#ffc09d"],
    ["#9ed8dd", "#7cc4d2", "#b9e7e3", "#6aaebe"],
    ["#e8c86e", "#d9ad58", "#f4df94", "#c99747"],
    ["#9fb8d5", "#7e9abb", "#bfd0e2", "#6d86aa"],
  ];
  const colors = chapterColors[breakoutChapterIndex()];
  const color = colors[brick.tone % colors.length];
  const kindColors = { shield: "#8adce8", wide: "#f0d080", pierce: "#f39ba8" };
  const damage = brick.maxHits - brick.hits;
  const impactScale = performance.now() - brick.hitAt < 120 ? .94 : 1;
  const radius = 8;
  ctx.save();
  ctx.translate(brick.x + brick.width / 2, brick.y + brick.height / 2);
  ctx.scale(impactScale, impactScale);
  ctx.translate(-brick.x - brick.width / 2, -brick.y - brick.height / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(brick.x, brick.y, brick.width, brick.height, radius);
  ctx.fill();
  drawBitmapImage(stageCImages[breakoutChapterIndex() * 3 + Math.min(2, damage)], brick.x, brick.y, brick.width, brick.height, {
    fallback: color,
    radius,
    fit: "cover",
    alpha: .42,
  });
  const sheen = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
  sheen.addColorStop(0, "rgba(255,255,255,.38)");
  sheen.addColorStop(.42, "rgba(255,255,255,.06)");
  sheen.addColorStop(1, "rgba(8,28,47,.18)");
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.roundRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2, radius - 1);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.beginPath();
  ctx.roundRect(brick.x + 8, brick.y + 7, Math.max(12, brick.width - 16), Math.max(7, brick.height * .2), 5);
  ctx.fill();
  ctx.strokeStyle = damage ? "rgba(255,235,190,.92)" : "rgba(223,246,255,.52)";
  ctx.lineWidth = damage ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.roundRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2, radius - 1);
  ctx.stroke();
  if (brick.maxHits > 1) {
    for (let index = 0; index < brick.maxHits; index += 1) {
      ctx.beginPath();
      ctx.arc(brick.x + brick.width - 9 - index * 9, brick.y + 8, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = index < brick.hits ? "rgba(255,250,220,.94)" : "rgba(26,50,69,.28)";
      ctx.fill();
    }
  }
  if (brick.kind !== "normal" && brick.kind !== "armor") {
    const marker = brick.kind === "shield" ? "◇" : brick.kind === "wide" ? "↔" : "✦";
    ctx.beginPath();
    ctx.arc(brick.x + 12, brick.y + brick.height / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = kindColors[brick.kind];
    ctx.fill();
    ctx.fillStyle = "#07172b";
    ctx.font = "900 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(marker, brick.x + 12, brick.y + brick.height / 2 + .5);
  }
  ctx.restore();
}

function drawBombStatus(layout) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(68, layout.paddleY - 82, 584, 48, 18);
  ctx.fillStyle = "rgba(3,30,37,.88)";
  ctx.fill();
  ctx.strokeStyle = bombArmed ? "rgba(236,228,180,.92)" : "rgba(185,224,239,.28)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(223,246,255,.68)";
  ctx.font = "700 12px Inter, sans-serif";
  ctx.fillText("聚光", 88, layout.paddleY - 58);
  ctx.fillStyle = "rgba(223,246,255,.18)";
  ctx.fillRect(128, layout.paddleY - 64, 126, 12);
  ctx.fillStyle = focusActive ? "#8adce8" : "rgba(138,220,232,.72)";
  ctx.fillRect(128, layout.paddleY - 64, 126 * focusEnergy / 100, 12);
  ctx.fillStyle = "rgba(223,246,255,.8)";
  ctx.font = "750 12px ui-monospace, Consolas, monospace";
  ctx.fillText(Math.round(focusEnergy) + "%", 262, layout.paddleY - 58);
  if (bombArmed) drawBitmapSprite(6, 316, layout.paddleY - 72, 28, 28, { fallback: "#ece4b4", padding: 2, scale: 1.08 });
  ctx.fillStyle = bombArmed ? "#ece4b4" : "rgba(223,246,255,.68)";
  ctx.font = "800 13px Inter, sans-serif";
  ctx.fillText(bombArmed ? "爆炸就绪" : "连消 " + clearStreak + "/" + bombClearThreshold, 348, layout.paddleY - 58);
  const powerText = activePowerLabel();
  ctx.textAlign = "right";
  ctx.fillStyle = shieldCharges || pierceHits || performance.now() < widePaddleUntil ? "#f5d38a" : "rgba(223,246,255,.62)";
  ctx.fillText(powerText + (breakoutCombo >= 2 ? " · 连击 ×" + breakoutCombo : ""), 632, layout.paddleY - 58);
  ctx.restore();
}

function drawBreakout() {
  drawLevelBackground();
  const layout = breakoutLayout();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  drawPlayfield(42, layout.top, 636, layout.bottom - layout.top, { radius: 28, alpha: .82, fill: "rgba(7,20,49,.76)", stroke: "rgba(176,232,255,.46)" });
  drawStageHud(layout);
  drawBombStatus(layout);
  bricks.forEach((brick) => {
    if (!brick.alive) return;
    drawSimpleBrick(brick);
  });
  drawImpactBursts(performance.now());
  drawBrickFragments();
  drawBitmapSprite(4, paddle.x, paddle.y - 10, paddle.width, paddle.height + 20, { fallback: palette.highlight, radius: 14, padding: 8, scale: 1.12 });
  drawBitmapSprite(5, ball.x - ball.radius - 4, ball.y - ball.radius - 4, (ball.radius + 4) * 2, (ball.radius + 4) * 2, { fallback: palette.primary, circle: true, padding: 5, scale: 1.15 });
  ctx.strokeStyle = "rgba(235,253,255,.9)";
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  finishCanvasStyle();
}

function hitBrick(brick) {
  return brick.alive && ball.x + ball.radius > brick.x && ball.x - ball.radius < brick.x + brick.width &&
    ball.y + ball.radius > brick.y && ball.y - ball.radius < brick.y + brick.height;
}

function destroyBrick(brick, fragmentCount = 4) {
  if (!brick.alive) return false;
  brick.alive = false;
  spawnBrickFragments(brick, fragmentCount);
  cleared += 1;
  return true;
}

function grantBrickPower(brick) {
  if (!brick || !["shield", "wide", "pierce"].includes(brick.kind)) return "";
  if (brick.kind === "shield") shieldCharges = Math.min(2, shieldCharges + 1);
  if (brick.kind === "wide") widePaddleUntil = Math.max(widePaddleUntil, performance.now()) + 10_000;
  if (brick.kind === "pierce") pierceHits = Math.min(8, pierceHits + 4);
  lastPowerLabel = brick.kind === "shield" ? "潮盾已充能" : brick.kind === "wide" ? "挡板扩展 10 秒" : "穿透强化 4 次";
  lastPowerAt = performance.now();
  playSound("reward");
  return lastPowerLabel;
}

function scoreDestroyedBrick(brick, factor = 1) {
  const base = brick.kind === "armor" ? 75 : ["shield", "wide", "pierce"].includes(brick.kind) ? 90 : 50;
  const comboMultiplier = 1 + Math.min(9, Math.max(0, breakoutCombo - 1)) * .12;
  const focusMultiplier = focusActive ? focusScoreMultiplier : 1;
  const earned = Math.max(1, Math.round(base * comboMultiplier * focusMultiplier * factor));
  score += earned;
  focusEnergy = Math.min(100, focusEnergy + 6);
  return earned;
}

function registerClearForBomb(timestamp) {
  clearStreak = timestamp - lastBrickClearedAt < 1800 ? clearStreak + 1 : 1;
  lastBrickClearedAt = timestamp;
  if (clearStreak < bombClearThreshold || bombArmed) return false;
  bombArmed = true;
  clearStreak = 0;
  playSound("reward");
  return true;
}

function crossNeighbors(center) {
  return bricks.filter((candidate) => candidate.alive && (
    (candidate.row === center.row && Math.abs(candidate.column - center.column) === 1) ||
    (candidate.column === center.column && Math.abs(candidate.row - center.row) === 1)
  ));
}

function triggerCrossExplosion(center) {
  const neighbors = crossNeighbors(center);
  lastExplosionCells = neighbors.map((brick) => brick.row + ":" + brick.column);
  lastExplosionRemoved = 0;
  neighbors.forEach((brick) => {
    if (!destroyBrick(brick, 6)) return;
    lastExplosionRemoved += 1;
    scoreDestroyedBrick(brick, .65);
    grantBrickPower(brick);
  });
  impactBursts.push({ x: center.x + center.width / 2, y: center.y + center.height / 2, startedAt: performance.now(), cross: true });
  bombArmed = false;
  clearStreak = 0;
  playSound("success");
  return lastExplosionRemoved;
}

function resolveDestroyedBrick(brick) {
  const triggerBomb = bombArmed;
  if (!destroyBrick(brick, breakoutCombo >= 4 ? 7 : 4)) return "";
  const earned = scoreDestroyedBrick(brick);
  const powerMessage = grantBrickPower(brick);
  if (triggerBomb) {
    const removed = triggerCrossExplosion(brick);
    return "十字爆炸 · 额外清除 " + removed + " 块 · +" + earned + " 分" + (powerMessage ? " · " + powerMessage : "");
  }
  if (registerClearForBomb(performance.now())) return "连续消除达成 · 爆炸已就绪 · +" + earned + " 分" + (powerMessage ? " · " + powerMessage : "");
  return "+" + earned + " 分" + (powerMessage ? " · " + powerMessage : "");
}

function resetBall() {
  const level = currentLevel();
  const layout = breakoutLayout();
  const difficultyMultiplier = config.difficulty === "challenging" ? 1.08 : config.difficulty === "relaxed" ? .84 : 1;
  const endlessPressure = breakoutMode === "endless" ? Math.min(1.32, 1 + boardsCleared * .025) : 1;
  const speed = level.speed * difficultyMultiplier * endlessPressure;
  ball = { x: paddle.x + paddle.width / 2, y: layout.ballY, vx: speed * .72, vy: -speed, radius: 14 };
  serveDelay = 900;
}

function syncLevelControls() {
  levelInputs.forEach((input) => { input.value = String(currentLevelIndex); });
  const level = currentLevel();
  progressLabels.forEach((label) => {
    label.textContent = "第 " + (currentLevelIndex + 1) + " / " + breakoutLevels.length + " 关 · " + level.label.replace(/^\d+\s*/, "") + " · " + lives + " 次机会";
  });
}

function showLevelComplete() {
  setGameSessionState("stage-complete");
  sounds.ambient.pause();
  pendingNextLevel = true;
  overlayTitle.textContent = currentLevel().label.replace(/^\d+\s*/, "") + " 已澄明";
  overlayDetail.textContent = "本关得分 " + score + "，最高连击 ×" + bestCombo + "。已解锁下一关；每四关进入新章节并加入新的特殊砖。";
  startButton.textContent = "进入下一关";
  overlay.hidden = false;
  playSound("success");
}

function handleLevelCleared() {
  boardsCleared += 1;
  score += 250 + Math.min(750, bestCombo * 25);
  if (breakoutMode !== "campaign") {
    currentLevelIndex = (currentLevelIndex + 1) % breakoutLevels.length;
    prepareLevel({ preserveRun: true });
    setMetric(cleared + " / " + bricks.length);
    setStatus(breakoutModeLabel() + "连续清场 " + boardsCleared + " 次 · 得分 " + score + " · 下一砖阵已展开。 ");
    return;
  }
  if (currentLevelIndex < breakoutLevels.length - 1) {
    unlockNextCampaignLevel();
    syncCampaignUi();
    writeCampaignProgress();
    showLevelComplete();
    return;
  }
  campaignComplete = true;
  showResult(true, "五重漆海全部澄明", "你已经击散二十种砖阵，以 " + score + " 分完成深海王冠终局，最高连击 ×" + bestCombo + "。 ");
}

function loseLife() {
  lives -= 1;
  breakoutCombo = 0;
  focusActive = false;
  if (lives <= 0) {
    if (breakoutMode === "campaign") showResult(false, "光球沉入海面", "本关三次机会已经用完；本局得分 " + score + "，最高连击 ×" + bestCombo + "。 ");
    else showTerminalResult(false, "航次在漆海中止", "连续清场 " + boardsCleared + " 次，获得 " + score + " 分，最高连击 ×" + bestCombo + "。 ");
    syncLevelControls();
    return;
  }
  resetBall();
  setStatus(currentLevel().label + " · 剩余 " + lives + " 次机会，光球即将重新发射。");
  syncLevelControls();
  playSound("fail");
}

function syncActivePaddleWidth() {
  const nextWidth = activePaddleWidth();
  if (Math.abs(paddle.width - nextWidth) < .1) return;
  const center = paddle.x + paddle.width / 2;
  paddle.width = nextWidth;
  paddle.x = Math.max(48, Math.min(672 - paddle.width, center - paddle.width / 2));
}

function updateFocus(delta) {
  if (!focusActive) return;
  focusEnergy = Math.max(0, focusEnergy - delta * .024);
  if (focusEnergy > 0) return;
  focusActive = false;
  setStatus("聚光能量耗尽，时间流速已经恢复。 ");
}

function updateBrickFragments(scale) {
  brickFragments.forEach((fragment) => {
    fragment.x += fragment.vx * scale;
    fragment.y += fragment.vy * scale;
    fragment.vy += .11 * scale;
    fragment.rotation += .06 * scale;
    fragment.life -= .035 * scale;
  });
  brickFragments = brickFragments.filter((fragment) => fragment.life > 0);
}

function resolvePaddleBounce(previousY) {
  const crossedPaddle = previousY + ball.radius <= paddle.y + 3 && ball.y + ball.radius >= paddle.y;
  if (ball.vy <= 0 || !crossedPaddle || ball.x < paddle.x - ball.radius || ball.x > paddle.x + paddle.width + ball.radius) return false;
  const offset = Math.max(-1, Math.min(1, (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2)));
  const endlessLimit = breakoutMode === "endless" ? 1 + Math.min(.28, boardsCleared * .02) : 1;
  const speed = Math.min(currentLevel().speed * 1.78 * endlessLimit, Math.hypot(ball.vx, ball.vy) * 1.022);
  ball.vx = Math.sin(offset * 1.02) * speed;
  ball.vy = -Math.max(speed * .62, Math.abs(Math.cos(offset * 1.02) * speed));
  const normalized = Math.hypot(ball.vx, ball.vy) || 1;
  ball.vx = ball.vx / normalized * speed;
  ball.vy = ball.vy / normalized * speed;
  ball.y = paddle.y - ball.radius - 1;
  playSound("move");
  return true;
}

function reflectBallFromBrick(brick, previousX, previousY) {
  const fromAbove = previousY + ball.radius <= brick.y;
  const fromBelow = previousY - ball.radius >= brick.y + brick.height;
  const fromLeft = previousX + ball.radius <= brick.x;
  const fromRight = previousX - ball.radius >= brick.x + brick.width;
  if (fromAbove) { ball.y = brick.y - ball.radius; ball.vy = -Math.abs(ball.vy); return "vertical"; }
  if (fromBelow) { ball.y = brick.y + brick.height + ball.radius; ball.vy = Math.abs(ball.vy); return "vertical"; }
  if (fromLeft) { ball.x = brick.x - ball.radius; ball.vx = -Math.abs(ball.vx); return "horizontal"; }
  if (fromRight) { ball.x = brick.x + brick.width + ball.radius; ball.vx = Math.abs(ball.vx); return "horizontal"; }
  const overlapX = Math.min(ball.x + ball.radius - brick.x, brick.x + brick.width - (ball.x - ball.radius));
  const overlapY = Math.min(ball.y + ball.radius - brick.y, brick.y + brick.height - (ball.y - ball.radius));
  if (overlapX < overlapY) { ball.vx *= -1; return "horizontal"; }
  ball.vy *= -1;
  return "vertical";
}

function accelerateBallAfterBrick() {
  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  const speedLimit = currentLevel().speed * 1.82;
  if (currentSpeed >= speedLimit) return;
  const multiplier = Math.min(1.018, speedLimit / Math.max(.1, currentSpeed));
  ball.vx *= multiplier;
  ball.vy *= multiplier;
}

function resolveBrickContact(brick, previousX, previousY) {
  const now = performance.now();
  const piercing = pierceHits > 0;
  impactBursts.push({ x: ball.x, y: ball.y, startedAt: now });
  brick.hitAt = now;
  breakoutCombo = now - lastBrickHitAt < 1450 ? breakoutCombo + 1 : 1;
  bestCombo = Math.max(bestCombo, breakoutCombo);
  lastBrickHitAt = now;
  if (piercing) { pierceHits -= 1; brick.hits = 0; } else { brick.hits -= 1; reflectBallFromBrick(brick, previousX, previousY); }
  accelerateBallAfterBrick();
  if (sounds.ambient) sounds.ambient.volume = Math.min(.3, .16 + comboIntensity() * .025);
  if (brick.hits <= 0) {
    const effectMessage = resolveDestroyedBrick(brick);
    setMetric(cleared + " / " + bricks.length);
    setStatus((piercing ? "穿透命中 · " : "") + effectMessage + (breakoutCombo >= 3 ? " · 连击 ×" + breakoutCombo : ""));
  } else {
    spawnBrickFragments(brick, 2);
    setStatus(currentLevel().label + " · 重甲受损 " + (brick.maxHits - brick.hits) + " / " + brick.maxHits + "。 ");
  }
  playSound("move");
  if (cleared === bricks.length) { handleLevelCleared(); return true; }
  return false;
}

function advanceBallPhysics(scale, layout) {
  const distance = Math.hypot(ball.vx, ball.vy) * scale;
  const steps = Math.max(1, Math.ceil(distance / Math.max(5, ball.radius * .55)));
  physicsStepCount = steps;
  const hitIds = new Set();
  for (let step = 0; step < steps; step += 1) {
    const previousX = ball.x;
    const previousY = ball.y;
    ball.x += ball.vx * scale / steps;
    ball.y += ball.vy * scale / steps;
    if (ball.x - ball.radius < 48) { ball.x = 48 + ball.radius; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.radius > 672) { ball.x = 672 - ball.radius; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - ball.radius < layout.top + 10) { ball.y = layout.top + 10 + ball.radius; ball.vy = Math.abs(ball.vy); }
    if (resolvePaddleBounce(previousY)) continue;
    const brick = bricks.find((candidate) => !hitIds.has(candidate.id) && hitBrick(candidate));
    if (brick) {
      hitIds.add(brick.id);
      if (resolveBrickContact(brick, previousX, previousY)) return;
    }
    if (ball.y - ball.radius <= layout.bottom + 24) continue;
    if (shieldCharges > 0) {
      shieldCharges -= 1;
      lastPowerLabel = "潮盾拦截失球";
      lastPowerAt = performance.now();
      resetBall();
      setStatus("潮盾已拦截一次失球，光球重新发射。 ");
      playSound("reward");
    } else loseLife();
    return;
  }
}

function updateBreakout(delta) {
  const layout = breakoutLayout();
  if (breakoutMode === "time-attack" && modeStartedAt && timeAttackRemaining() <= 0) {
    focusActive = false;
    showTerminalResult(true, "限时航次结算", "120 秒内清场 " + boardsCleared + " 次，获得 " + score + " 分，最高连击 ×" + bestCombo + "。 ");
    return;
  }
  updateFocus(delta);
  syncActivePaddleWidth();
  const timeScale = focusActive ? focusTimeScale : 1;
  const scale = Math.min(2, delta / 16.67) * timeScale;
  updateBrickFragments(scale);
  if (serveDelay > 0) {
    serveDelay = Math.max(0, serveDelay - delta);
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - 28;
    return;
  }
  advanceBallPhysics(scale, layout);
}

function loop(timestamp) {
  if (!running) return;
  const delta = lastFrame ? timestamp - lastFrame : 16.67;
  lastFrame = timestamp;
  updateBreakout(delta);
  drawBreakout();
  if (running) frameId = requestAnimationFrame(loop);
}

function movePaddle(direction) {
  if (!running) return;
  paddle.x = Math.max(48, Math.min(672 - paddle.width, paddle.x + direction * 38));
  drawBreakout();
}

function toggleFocus() {
  if (!running) return;
  if (!focusActive && focusEnergy <= 0) {
    setStatus("聚光能量不足；击碎砖块可以补充能量。 ");
    return;
  }
  focusActive = !focusActive;
  setStatus(focusActive ? "聚光已开启：时间流速降低，期间得分减半。 " : "聚光已关闭：恢复正常流速与得分。 ");
  playSound("move");
}

canvas.addEventListener("pointermove", (event) => {
  if (!running) return;
  const { x } = eventScenePoint(event);
  paddle.x = Math.max(48, Math.min(672 - paddle.width, x - paddle.width / 2));
});

function prepareLevel(options = {}) {
  const preserveRun = options.preserveRun === true;
  const paddleBase = config.difficulty === "relaxed" ? 150 : config.difficulty === "challenging" ? 88 : 118;
  const levelPenalty = breakoutChapterIndex() * 6;
  const layout = breakoutLayout();
  const baseWidth = paddleBase - levelPenalty;
  paddle = { x: 360 - baseWidth / 2, y: layout.paddleY, width: baseWidth, baseWidth, height: 18 };
  cleared = 0;
  if (!preserveRun) {
    lives = 3;
    score = 0;
    bestCombo = 0;
    boardsCleared = 0;
    focusEnergy = 100;
    shieldCharges = 0;
    widePaddleUntil = 0;
    pierceHits = 0;
    lastPowerLabel = "";
    lastPowerAt = 0;
  }
  impactBursts = [];
  brickFragments = [];
  breakoutCombo = 0;
  focusActive = false;
  lastBrickHitAt = 0;
  clearStreak = 0;
  lastBrickClearedAt = 0;
  bombArmed = false;
  lastExplosionRemoved = 0;
  lastExplosionCells = [];
  createBricks();
  resetBall();
  syncLevelControls();
}

function startGame() {
  if (frameId) cancelAnimationFrame(frameId);
  if (breakoutMode === "campaign" && campaignComplete) {
    currentLevelIndex = 0;
    campaignComplete = false;
    setCampaignLevel(0, { allowLocked: true });
  } else if (breakoutMode === "campaign" && pendingNextLevel) {
    currentLevelIndex = Math.min(breakoutLevels.length - 1, currentLevelIndex + 1);
    setCampaignLevel(currentLevelIndex, { allowLocked: true, unlock: true });
  }
  pendingNextLevel = false;
  prepareLevel();
  modeStartedAt = performance.now();
  running = true;
  lastFrame = 0;
  hideOverlay();
  setMetric("0 / " + bricks.length);
  setStatus(breakoutModeLabel() + "模式 · 清除 " + bricks.length + " 块砖；连消三块可获得十字爆炸，F 键或聚光按钮可减速。 ");
  startAmbient();
  frameId = requestAnimationFrame(loop);
}

function selectLevel(index) {
  currentLevelIndex = Math.max(0, Math.min(breakoutLevels.length - 1, index));
  pendingNextLevel = false;
  campaignComplete = false;
  if (running) {
    startGame();
    return;
  }
  prepareLevel();
  overlayTitle.textContent = currentLevel().label.replace(/^\d+\s*/, "");
  overlayDetail.textContent = "每关使用不同砖阵；章节会逐步加入潮盾、宽挡板与穿透特殊砖，连消三块可获得十字爆炸。";
  startButton.textContent = "开始" + breakoutModeLabel();
  setMetric("0 / " + bricks.length);
  setStatus("已选择 " + currentLevel().label + "，准备开始。");
  drawBreakout();
}

levelInputs.forEach((input) => input.addEventListener("change", () => selectLevel(Number(input.value))));
modeInputs.forEach((input) => input.addEventListener("click", () => setBreakoutMode(input.dataset.breakoutMode)));

onCampaignLevelChanged = () => {
  currentLevelIndex = campaignLevelIndex;
  pendingNextLevel = false;
  campaignComplete = false;
  if (paddle) prepareLevel();
  if (!running && paddle) drawBreakout();
};

runtimeDebugActions = {
  setCampaignMode: () => setBreakoutMode("campaign"),
  setTimeAttackMode: () => setBreakoutMode("time-attack"),
  setEndlessMode: () => setBreakoutMode("endless"),
  toggleFocus: () => toggleFocus(),
  grantSpecialPowers: () => {
    shieldCharges = 1;
    widePaddleUntil = performance.now() + 10_000;
    pierceHits = 4;
    lastPowerLabel = "验收能力组";
    lastPowerAt = performance.now();
    drawBreakout();
  },
  simulateSideCollision: () => {
    const target = bricks.find((brick) => brick.alive);
    if (!target) return;
    ball.x = target.x - ball.radius + 1;
    ball.y = target.y + target.height / 2;
    ball.vx = Math.abs(ball.vx || currentLevel().speed);
    const beforeVx = ball.vx;
    const axis = reflectBallFromBrick(target, target.x - ball.radius - 2, ball.y);
    collisionProbe = { axis, beforeVx, afterVx: ball.vx, finite: Number.isFinite(ball.x) && Number.isFinite(ball.y) };
    drawBreakout();
  },
  completeCurrentStage: () => {
    bricks.forEach((brick) => { brick.alive = false; });
    cleared = bricks.length;
    handleLevelCleared();
  },
  earnBomb: () => {
    bombArmed = false;
    clearStreak = bombClearThreshold - 1;
    lastBrickClearedAt = performance.now();
    registerClearForBomb(performance.now());
    drawBreakout();
  },
  triggerArmedBomb: () => {
    const center = bricks.find((brick) => brick.alive && crossNeighbors(brick).length > 0);
    if (!center) return;
    bombArmed = true;
    resolveDestroyedBrick(center);
    setMetric(cleared + " / " + bricks.length);
    drawBreakout();
  },
};

runtimeDebugState = () => ({
  level: currentLevelIndex + 1,
  levelId: currentLevel().id,
  chapter: breakoutChapterIndex() + 1,
  pattern: currentLevel().pattern,
  formationIndex: currentLevel().formationIndex,
  layoutSignature: bricks.map((brick) => brick.row + ":" + brick.column).join("|"),
  damageAssetStart: breakoutChapterIndex() * 3,
  cleared,
  brickCount: bricks.length,
  armoredBricks: bricks.filter((brick) => brick.alive && brick.maxHits > 1).length,
  damagedBricks: bricks.filter((brick) => brick.alive && brick.hits < brick.maxHits).length,
  combo: breakoutCombo,
  bestCombo,
  score,
  mode: breakoutMode,
  modeLabel: breakoutModeLabel(),
  boardsCleared,
  timeRemaining: timeAttackRemaining(),
  focusEnergy: Math.round(focusEnergy * 10) / 10,
  focusActive,
  focusTimeScale,
  focusScoreMultiplier,
  shieldCharges,
  wideActive: performance.now() < widePaddleUntil,
  pierceHits,
  activePowerLabel: activePowerLabel(),
  lastPowerLabel,
  lastPowerAt,
  specialBrickCounts: Object.fromEntries(["shield", "wide", "pierce"].map((kind) => [kind, bricks.filter((brick) => brick.kind === kind).length])),
  physicsStepCount,
  collisionSystem: "substep-face-normal",
  collisionProbe,
  ballFinite: Number.isFinite(ball.x) && Number.isFinite(ball.y) && Number.isFinite(ball.vx) && Number.isFinite(ball.vy),
  clearStreak,
  bombArmed,
  lastExplosionRemoved,
  lastExplosionCells,
  lives,
  paddleX: Math.round(paddle.x),
  fragmentCount: brickFragments.length,
  pendingNextLevel,
});

function handleControl(value) {
  if (value === "left") movePaddle(-1);
  if (value === "right") movePaddle(1);
  if (value === "focus") toggleFocus();
}

function handleKey(key) {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") movePaddle(-1);
  if (key === "ArrowRight" || key.toLowerCase() === "d") movePaddle(1);
  if (key.toLowerCase() === "f") toggleFocus();
}

updateModeButtons();
prepareLevel();
drawBreakout();


redrawGameArt = () => { drawBreakout(); };
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
  const identity = {"projectId":"d598835a-5e3d-4fa6-8297-cc61a2a965c5","versionId":"5195a7ad-8e8d-46bf-bee0-05cc81ef8b2e"};
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