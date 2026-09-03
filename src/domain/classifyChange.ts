import type {
  ChangeLevel,
  ClassificationResult,
  GameTemplate,
} from "./types";

const LEVEL_LABELS: Record<ChangeLevel, string> = {
  R0: "表现改造",
  R1: "内容与调节",
  R2: "小规则扩展",
  R3: "核心重写",
};

const TERM_GROUPS: Array<{
  level: ChangeLevel;
  terms: string[];
  reason: string;
}> = [
  {
    level: "R3",
    terms: [
      "融合",
      "合在一起",
      "合成一个",
      "两个游戏",
      "结合成",
      "变成另一个游戏",
      "换个玩法",
      "改玩法",
      "完全不一样",
      "联网",
      "组队",
      "对战",
      "多人",
      "联机",
      "pvp",
      "开放世界",
      "沙盒",
      "经营",
      "建造",
      "剧情分支",
      "即时战略",
      "mmo",
      "大型团战",
      "持久世界",
      "改成塔防",
      "改成射击",
      "改成战斗",
    ],
    reason: "需求已超出当前模板，会改变主要动作、进度结构或单人范围，应转入新游戏流程。",
  },
  {
    level: "R2",
    terms: [
      "加一种",
      "加一个",
      "加个",
      "加点",
      "新加",
      "多一种",
      "会动的",
      "移动的",
      "陷阱",
      "炸弹",
      "连击",
      "加速带",
      "隐藏",
      "随机出现",
      "解锁",
      "商店",
      "升级",
      "增加",
      "新增",
      "加入",
      "新机制",
      "能力",
      "技能",
      "特殊",
      "障碍",
      "敌人",
      "boss",
      "冲刺",
      "传送",
      "冰面",
      "钥匙门",
      "道具",
      "碰撞",
      "判定范围",
    ],
    reason: "需求引入了新的可交互规则，需要限制为一种机制并补充研究和测试。",
  },
  {
    level: "R1",
    terms: [
      "多一些",
      "少一些",
      "多一点",
      "少一点",
      "更多关",
      "关数",
      "简单",
      "容易",
      "更难",
      "太难",
      "太简单",
      "快一点",
      "慢一点",
      "快一些",
      "慢一些",
      "时间",
      "长一点",
      "短一点",
      "星星",
      "几关",
      "多几关",
      "难度",
      "速度",
      "关卡",
      "数量",
      "数值",
      "节奏",
      "提示",
      "地图",
      "题库",
      "路线",
      "撤销",
      "生命",
      "分数",
      "角色大小",
      "角色尺寸",
    ],
    reason: "需求在模板已有参数和内容范围内，可以保持核心规则。",
  },
  {
    level: "R0",
    terms: [
      "画风",
      "画面",
      "颜色",
      "色调",
      "好看",
      "换皮",
      "皮肤",
      "背景",
      "外观",
      "造型",
      "卡通",
      "像素",
      "水彩",
      "手绘",
      "海底",
      "森林",
      "太空",
      "星空",
      "古风",
      "赛博",
      "糖果",
      "主角",
      "世界",
      "声音",
      "名字",
      "标题",
      "文字",
      "风格",
      "世界观",
      "角色",
      "美术",
      "图片",
      "封面",
      "配色",
      "主题",
      "音效",
      "音乐",
      "文案",
      "场景",
      "可爱",
      "q版",
    ],
    reason: "需求只影响表现与包装，不改变玩法骨架。",
  },
];

const LEVEL_ORDER: Record<ChangeLevel, number> = {
  R0: 0,
  R1: 1,
  R2: 2,
  R3: 3,
};

export const maxChangeLevel = (levels: ChangeLevel[]): ChangeLevel =>
  levels.reduce<ChangeLevel>(
    (highest, level) =>
      LEVEL_ORDER[level] > LEVEL_ORDER[highest] ? level : highest,
    "R0",
  );

export function classifyChange(
  request: string,
  template?: GameTemplate,
): ClassificationResult {
  const normalized = request.trim().toLowerCase();
  if (!normalized) {
    return {
      level: "R0",
      label: LEVEL_LABELS.R0,
      reasons: ["还没有额外自由要求，按已选择的固定建议判断。"],
      matchedTerms: [],
    };
  }

  const matches = TERM_GROUPS.map((group) => ({
    ...group,
    matches: group.terms.filter((term) => normalized.includes(term)),
  })).filter((group) => group.matches.length > 0);

  const redirectMatches = template
    ? template.redirectExamples.filter((example) =>
        normalized.includes(example.toLowerCase()),
      )
    : [];

  if (redirectMatches.length > 0) {
    return {
      level: "R3",
      label: LEVEL_LABELS.R3,
      reasons: [
        `“${redirectMatches.join("、")}”超出「${template?.name}」的改造边界。`,
        "系统会保留创意描述，但改用新游戏设计流程重新组合机制。",
      ],
      matchedTerms: redirectMatches,
    };
  }

  if (matches.length === 0) {
    return {
      level: "R2",
      label: LEVEL_LABELS.R2,
      reasons: ["系统无法确认这项要求只影响表现或数值，需要按新规则谨慎处理。"],
      matchedTerms: [],
    };
  }

  const level = maxChangeLevel(matches.map((match) => match.level));
  const selected = matches.find((match) => match.level === level)!;
  return {
    level,
    label: LEVEL_LABELS[level],
    reasons: [selected.reason],
    matchedTerms: selected.matches,
  };
}

export const getChangeLevelLabel = (level: ChangeLevel): string =>
  LEVEL_LABELS[level];

// 给外行看的说法：不出现 R0–R3 代码。
const PLAIN_LEVEL_LABELS: Record<ChangeLevel, string> = {
  R0: "只改画面和文案，玩法不变",
  R1: "调整内容和难度，玩法不变",
  R2: "加一种新机制，其余玩法不变",
  R3: "已经是一款新游戏",
};

export const describeChangeLevel = (level: ChangeLevel): string =>
  PLAIN_LEVEL_LABELS[level];
