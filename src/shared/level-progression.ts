import type { GameSpec, GameTemplate } from "./contracts.js";

export const minimumCampaignLevelCount = 20;
export const campaignTierSize = 4;

export type CampaignLevel = {
  number: number;
  id: string;
  label: string;
  tier: number;
  tierLabel: string;
  variant: number;
  seed: number;
  goalMultiplier: number;
  speedMultiplier: number;
  densityMultiplier: number;
  ruleModifier: string;
  mission: string;
  masteryRules: MasteryRule[];
  reward: string;
};

export type MasteryRule = {
  id: "efficiency" | "control";
  label: string;
  metric: string;
  comparison: "gte" | "lte" | "ratio-gte" | "ratio-lte";
  target: number;
  referenceMetric?: string;
};

const tierLabels = ["认识规则", "稳定节奏", "加入变化", "组合压力", "最终掌握"] as const;

const templateModifiers: Record<GameTemplate, readonly string[]> = {
  "signal-hunt": ["定点信号", "移动信号", "短时信号", "复合航线"],
  tetris: ["基础构件", "预览规划", "速度变化", "危险高度"],
  puzzle: ["横图重组", "竖图重组", "方图重组", "外围整理"],
  breakout: [
    "三线浅滩", "双塔入口", "折线阶梯", "潮汐缺口",
    "珍珠菱阵", "沙漏回流", "双峰海沟", "环形礁带",
    "海星放射", "双岛回声", "箭头航标", "鱼骨水道",
    "双重波纹", "分潮四门", "回旋内湾", "珊瑚王冠",
    "棋盘碎礁", "心潮海湾", "深海盾阵", "王冠重甲",
  ],
  klotski: ["基础开门", "横块换位", "竖块让路", "多步腾挪"],
  maze: ["短径辨向", "岔路记忆", "回环取舍", "长径冲刺"],
  snake: ["开放边界", "围墙规则", "庭石障碍", "高速长身"],
  "merge-2048": ["小目标合成", "空间保留", "连锁规划", "高阶目标"],
  platformer: ["安全起跳", "节奏落点", "移动平台", "终点连跳"],
  "space-shooter": ["单线来敌", "交错航线", "装甲编队", "密集预警"],
  "polyomino-fit": ["对称轮廓", "凹槽轮廓", "窄道轮廓", "多岛轮廓"],
  "block-place": ["基础消行", "长条规划", "转角组合", "高密棋盘"],
  "region-logic": ["对称区域", "折线区域", "窄域推理", "复合排除"],
  "mahjong-roguelite": ["开放边缘", "封锁层", "潮汐限制", "遗物组合"],
  generated: ["认识规则", "节奏提升", "复合变化", "极限挑战"],
};

type CommercialLevelDesign = {
  mission: string;
  masteryRules: [MasteryRule, MasteryRule];
};

const commercialLevelDesigns: Record<GameTemplate, CommercialLevelDesign> = {
  "signal-hunt": {
    mission: "在信号窗口关闭前完成捕获，并保持稳定节奏。",
    masteryRules: [
      { id: "efficiency", label: "完成时至少保留 8 秒", metric: "remaining", comparison: "gte", target: 8 },
      { id: "control", label: "完成时至少保留 15 秒", metric: "remaining", comparison: "gte", target: 15 },
    ],
  },
  tetris: {
    mission: "完成目标消行，同时为后续构件保留干净落点。",
    masteryRules: [
      { id: "efficiency", label: "得分达到目标线数 × 300", metric: "score", comparison: "ratio-gte", referenceMetric: "lineTarget", target: 300 },
      { id: "control", label: "至少取得目标线数 × 20 的硬降奖励", metric: "hardDropScore", comparison: "ratio-gte", referenceMetric: "lineTarget", target: 20 },
    ],
  },
  puzzle: {
    mission: "从外围辨认图像关系，以尽量少的试放恢复整幅画面。",
    masteryRules: [
      { id: "efficiency", label: "移动次数不超过拼块数的 160%", metric: "moves", comparison: "ratio-lte", referenceMetric: "pieceCount", target: 1.6 },
      { id: "control", label: "错误回弹不超过 2 次", metric: "bounceCount", comparison: "lte", target: 2 },
    ],
  },
  breakout: {
    mission: "控制反弹角度清除砖阵，并用连续击破积蓄爆炸机会。",
    masteryRules: [
      { id: "efficiency", label: "形成至少 4 连续击破", metric: "clearStreak", comparison: "gte", target: 4 },
      { id: "control", label: "连击倍率达到 ×2", metric: "combo", comparison: "gte", target: 2 },
    ],
  },
  klotski: {
    mission: "规划腾挪顺序，以接近最优步数的路线打开朱门。",
    masteryRules: [
      { id: "efficiency", label: "步数不超过最优参考的 150%", metric: "moves", comparison: "ratio-lte", referenceMetric: "optimalReference", target: 1.5 },
      { id: "control", label: "保留完整可回放路径", metric: "replayLength", comparison: "ratio-gte", referenceMetric: "moves", target: 1 },
    ],
  },
  maze: {
    mission: "在多条路线间判断收益，点亮灯火后找到出口。",
    masteryRules: [
      { id: "efficiency", label: "步数不超过最短路径的 135%", metric: "steps", comparison: "ratio-lte", referenceMetric: "optimalSteps", target: 1.35 },
      { id: "control", label: "点亮全部 3 个阶段灯火", metric: "checkpoints", comparison: "gte", target: 3 },
    ],
  },
  snake: {
    mission: "在身体持续增长时规划安全回路，完成本关收集目标。",
    masteryRules: [
      { id: "efficiency", label: "收集数量达到目标", metric: "score", comparison: "ratio-gte", referenceMetric: "target", target: 1 },
      { id: "control", label: "完成时身体长度达到目标 + 3", metric: "length", comparison: "gte", target: 8 },
    ],
  },
  "merge-2048": {
    mission: "维持角落秩序和空位储备，合成目标数字。",
    masteryRules: [
      { id: "efficiency", label: "得分达到目标数字的 4 倍", metric: "score", comparison: "ratio-gte", referenceMetric: "target", target: 4 },
      { id: "control", label: "完成时至少保留 3 个空格", metric: "availableCells", comparison: "gte", target: 3 },
    ],
  },
  platformer: {
    mission: "读取安全落点、收集能量并以稳定状态抵达信标。",
    masteryRules: [
      { id: "efficiency", label: "收集数量达到关卡目标", metric: "coinsCollected", comparison: "ratio-gte", referenceMetric: "coinTarget", target: 1 },
      { id: "control", label: "完成时至少保留 2 次机会", metric: "lives", comparison: "gte", target: 2 },
    ],
  },
  "space-shooter": {
    mission: "在密集航线中维持输出，并用精准移动保存能量。",
    masteryRules: [
      { id: "efficiency", label: "击破数量达到关卡目标", metric: "kills", comparison: "ratio-gte", referenceMetric: "killTarget", target: 1 },
      { id: "control", label: "完成时至少保留 2 点能量", metric: "lives", comparison: "gte", target: 2 },
    ],
  },
  "polyomino-fit": {
    mission: "预判旋转后的轮廓关系，用有限提示完成无重叠拼合。",
    masteryRules: [
      { id: "efficiency", label: "所有拼块一次完整吸附", metric: "placed", comparison: "ratio-gte", referenceMetric: "pieceCount", target: 1 },
      { id: "control", label: "完成至少 4 块的复杂轮廓", metric: "pieceCount", comparison: "gte", target: 4 },
    ],
  },
  "block-place": {
    mission: "规划三块的放置顺序，用连续消行维持棋盘空间。",
    masteryRules: [
      { id: "efficiency", label: "得分达到关卡目标的 125%", metric: "score", comparison: "ratio-gte", referenceMetric: "target", target: 1.25 },
      { id: "control", label: "连击倍率达到 ×2", metric: "combo", comparison: "gte", target: 2 },
    ],
  },
  "region-logic": {
    mission: "通过行、列、区域和相邻约束完成唯一解推理。",
    masteryRules: [
      { id: "efficiency", label: "全程不使用提示", metric: "hints", comparison: "lte", target: 0 },
      { id: "control", label: "全程零错误", metric: "errors", comparison: "lte", target: 0 },
    ],
  },
  "mahjong-roguelite": {
    mission: "管理开放边缘、潮汐资源和遗物构筑，打通三段航线。",
    masteryRules: [
      { id: "efficiency", label: "完成时至少保留 1 次洗牌", metric: "shuffles", comparison: "gte", target: 1 },
      { id: "control", label: "形成至少 2 件遗物的构筑", metric: "relicCount", comparison: "gte", target: 2 },
    ],
  },
  generated: {
    mission: "完成设计合同的主要目标，并尝试更高效的解法。",
    masteryRules: [
      { id: "efficiency", label: "完成主要目标", metric: "completed", comparison: "gte", target: 1 },
      { id: "control", label: "保留至少一项关键资源", metric: "resource", comparison: "gte", target: 1 },
    ],
  },
};

function hashTemplate(template: GameTemplate) {
  let hash = 2166136261;
  for (const character of template) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createCampaignLevels(template: GameTemplate, difficulty: GameSpec["difficulty"]): CampaignLevel[] {
  const difficultyOffset = difficulty === "relaxed" ? -0.08 : difficulty === "challenging" ? 0.1 : 0;
  const modifiers = templateModifiers[template];
  const templateSeed = hashTemplate(template);

  return Array.from({ length: minimumCampaignLevelCount }, (_, index) => {
    const number = index + 1;
    const tierIndex = Math.floor(index / campaignTierSize);
    const variant = index % modifiers.length;
    const withinTier = index % campaignTierSize;
    const tierPressure = tierIndex * 0.13;
    const localVariation = withinTier * 0.015;
    const commercialDesign = commercialLevelDesigns[template];
    return {
      number,
      id: `${template}-${String(number).padStart(2, "0")}`,
      label: `${String(number).padStart(2, "0")} · ${tierLabels[tierIndex]} · ${modifiers[variant]}`,
      tier: tierIndex + 1,
      tierLabel: tierLabels[tierIndex],
      variant,
      seed: (templateSeed ^ Math.imul(number, 0x9e3779b1)) >>> 0,
      goalMultiplier: Number(Math.max(0.62, 0.76 + difficultyOffset + tierPressure + localVariation).toFixed(3)),
      speedMultiplier: Number(Math.max(0.72, 0.82 + difficultyOffset + tierPressure * 0.72 + localVariation).toFixed(3)),
      densityMultiplier: Number(Math.max(0.68, 0.78 + difficultyOffset + tierPressure * 0.88 + localVariation).toFixed(3)),
      ruleModifier: modifiers[variant],
      mission: commercialDesign.mission,
      masteryRules: commercialDesign.masteryRules.map((rule) => ({ ...rule })),
      reward: tierIndex === 4 ? "大师徽记" : withinTier === campaignTierSize - 1 ? `解锁${tierLabels[Math.min(4, tierIndex + 1)]}` : "关卡星章",
    };
  });
}

export const defaultLevelProgression = {
  levelCount: minimumCampaignLevelCount,
  curve: "stepped" as const,
  tierSize: campaignTierSize,
  unlockMode: "sequential" as const,
  persistProgress: true,
};
