import type { GameSpec, GameTemplate } from "./contracts.js";
import { KLOTSKI_COURSE } from "./klotski-course.js";

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
  klotski: KLOTSKI_COURSE.map(course=>course.name),
  snake: [
    "初游晴庭", "双石引路", "四隅回身", "月门初转",
    "竹影双廊", "曲桥借位", "回纹花径", "方池绕行",
    "折廊追果", "双门换向", "星石列阵", "半月回环",
    "连廊三折", "漏窗穿行", "镜池窄岸", "叠石回廊",
    "九曲藏果", "双环合流", "庭心风阵", "青玉长游",
  ],
  "merge-2048": [
    "成双启程", "角落锚点", "余白四格", "百二十八结点",
    "双并同拍", "三段回声", "高低分流", "二百五十六核",
    "下一块·二", "下一块·四", "预兆转向", "五百一十二门",
    "密阵开局", "一步回溯", "从容织造", "千位高塔",
    "千位角锚", "零撤销局", "连锁三响", "二〇四八核心",
  ],
  "space-shooter": [
    "校准航道", "双翼接敌", "脉冲试炼", "曙光守环",
    "碎星回廊", "交错火网", "护盾护航", "赤潮守环",
    "彗尾追击", "三向炮台", "能量禁区", "裂隙守环",
    "磁暴穿行", "精英夹击", "弹幕回廊", "寂光守环",
    "最后补给", "全型编队", "极限突围", "终焉守环",
  ],
  "polyomino-fit": ["对称轮廓", "凹槽轮廓", "窄道轮廓", "多岛轮廓"],
  "block-place": ["基础消行", "长条规划", "转角组合", "高密棋盘"],
  "region-logic": [
    "边界初识", "行列回声", "星距练习", "三线合一",
    "折区锁定", "窄域借位", "双线交叉", "七域归位",
    "八方巡格", "长区封锁", "回环排除", "单星星图",
    "双星启航", "两两相望", "十域配额", "双环编队",
    "反证星尘", "复合星链", "无猜巡天", "星域大师",
  ],
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
      { id: "control", label: "达成本模式技巧目标", metric: "skillGoalAchieved", comparison: "gte", target: 1 },
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
    mission: "连续完成本关主题题组，通过让路、空位接力与横梁调位打开朱门。",
    masteryRules: [
      { id: "efficiency", label: "全组步数不超过最短总步数的 150%", metric: "totalMoves", comparison: "ratio-lte", referenceMetric: "totalOptimal", target: 1.5 },
      { id: "control", label: "至少一庭未用提示独立解开", metric: "independentRooms", comparison: "gte", target: 1 },
    ],
  },
  snake: {
    mission: "分段巡游并采集不同食物，用青叶灵活转向、露珠吸取管理路线。",
    masteryRules: [
      { id: "efficiency", label: "采集枚数达到整关目标", metric: "collected", comparison: "ratio-gte", referenceMetric: "target", target: 1 },
      { id: "control", label: "本关体验全部四类食物", metric: "foodVariety", comparison: "gte", target: 4 },
    ],
  },
  "merge-2048": {
    mission: "滑动合成目标数字；技巧任务是额外挑战，不阻止通关。保留空位，必要时查看方向或回溯。",
    masteryRules: [
      { id: "efficiency", label: "完成本关加分技巧", metric: "techniqueComplete", comparison: "gte", target: 1 },
      { id: "control", label: "完成时至少保留 4 个空格", metric: "availableCells", comparison: "gte", target: 4 },
    ],
  },
  "space-shooter": {
    mission: "完成三波星环任务，在弹幕中维持输出并用脉冲保存能量。",
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
      { id: "efficiency", label: "未使用观察或展开理由", metric: "assistanceUsed", comparison: "lte", target: 0 },
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
      mission: template === "klotski" ? KLOTSKI_COURSE[index].intro + " 完成全部 " + KLOTSKI_COURSE[index].boards.length + " 庭后结算。" : commercialDesign.mission,
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
