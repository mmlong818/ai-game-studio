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
