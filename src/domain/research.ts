import { MECHANIC_LIBRARY } from "./templates";
import type {
  MechanicDefinition,
  ReferenceDossier,
  ResearchReference,
} from "./types";

const VERIFIED_AT = "2026-09-02";

const SOURCES: Record<string, ResearchReference> = {
  templates: {
    title: "GDevelop 游戏模板与示例",
    url: "https://gdevelop.io/game-example",
    sourceType: "official-product",
    verifiedAt: VERIFIED_AT,
    observedRules: [
      "成熟模板与单项能力示例分层提供",
      "从可运行起点改造能降低首次制作成本",
    ],
    doNotCopy: ["品牌", "模板代码", "商店素材", "界面识别"],
    license: null,
  },
  controls: {
    title: "MDN 网页游戏控制机制",
    url: "https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms",
    sourceType: "official-guide",
    verifiedAt: VERIFIED_AT,
    observedRules: [
      "触控与键盘鼠标需要分别设计",
      "同一个核心动作要为不同设备提供等价输入",
    ],
    doNotCopy: ["示例游戏角色", "示例图片", "示例品牌"],
    license: null,
  },
  tetris: {
    title: "Tetris 官方玩法说明",
    url: "https://play.tetris.com/about",
    sourceType: "official-rules",
    verifiedAt: VERIFIED_AT,
    observedRules: ["旋转、移动和下落拼块", "完成无空格横行后消除", "超过顶部边界时结束"],
    doNotCopy: ["Tetris 名称", "方块视觉识别", "音乐", "界面布局"],
    license: null,
  },
  merge: {
    title: "2048 原作者页面",
    url: "https://github.com/gabrielecirulli/2048/blob/master/index.html",
    sourceType: "original-repository",
    verifiedAt: VERIFIED_AT,
    observedRules: ["方向输入推动棋盘", "相同数字接触后合并", "支持重新开始"],
    doNotCopy: ["原作名称", "原作视觉", "原作文案"],
    license: "MIT（只有实际复用代码时才适用，并需保留许可）",
  },
  scratch: {
    title: "Scratch 入门指南：Starter Projects",
    url: "https://resources.scratch.mit.edu/www/guides/en/scratch-getting-started-guide.pdf",
    sourceType: "official-guide",
    verifiedAt: VERIFIED_AT,
    observedRules: ["从包含简单代码的起始项目进行改造", "创作者不必每次从空白开始"],
    doNotCopy: ["Scratch 品牌", "项目素材", "社区作品"],
    license: null,
  },
  queue: {
    title: "Overcooked 官方玩法介绍",
    url: "https://www.team17.com/games/overcooked",
    sourceType: "official-product",
    verifiedAt: VERIFIED_AT,
    observedRules: ["订单具有等待压力", "准备、加工和交付构成连续队列"],
    doNotCopy: ["品牌", "厨师角色", "关卡", "菜谱", "美术", "音乐"],
    license: null,
  },
  narrative: {
    title: "Twine 官方基础概念",
    url: "https://twinery.org/reference/en/getting-started/basic-concepts.html",
    sourceType: "official-guide",
    verifiedAt: VERIFIED_AT,
    observedRules: ["故事由段落构成", "变量和条件逻辑记录选择后果"],
    doNotCopy: ["示例故事", "文案", "界面识别", "故事格式实现"],
    license: null,
  },
  deck: {
    title: "Slay the Spire 开发商官方资料",
    url: "https://www.megacrit.com/press-kits/slay-the-spire/",
    sourceType: "official-product",
    verifiedAt: VERIFIED_AT,
    observedRules: ["构筑独特牌组", "卡牌、遗物和程序关卡形成协同"],
    doNotCopy: ["卡牌内容", "角色", "敌人", "遗物", "数值", "美术", "文案"],
    license: null,
  },
  gamepad: {
    title: "MDN Gamepad API 使用指南",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API",
    sourceType: "official-guide",
    verifiedAt: VERIFIED_AT,
    observedRules: ["每帧读取最新按键和摇杆状态", "处理连接、断开和标准映射差异"],
    doNotCopy: ["示例游戏", "示例视觉", "第三方品牌"],
    license: null,
  },
  spatial3d: {
    title: "Godot 官方 3D 路径指南",
    url: "https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_using_navigationpaths.html",
    sourceType: "official-guide",
    verifiedAt: VERIFIED_AT,
    observedRules: ["路径必须位于可导航区域", "起点和目标不连通时不能声称可达"],
    doNotCopy: ["引擎代码", "演示项目", "图标", "界面素材"],
    license: null,
  },
};

const mechanicSource = (mechanicId: string): ResearchReference => {
  if (mechanicId === "grid-merge") return SOURCES.merge;
  if (mechanicId === "lane-dodge" || mechanicId === "projectile-combat") {
    return SOURCES.controls;
  }
  if (mechanicId === "constraint-deduction") return SOURCES.scratch;
  if (mechanicId === "queue-management") return SOURCES.queue;
  if (mechanicId === "chapter-branch") return SOURCES.narrative;
  if (mechanicId === "deck-combo") return SOURCES.deck;
  if (mechanicId === "gamepad-control") return SOURCES.gamepad;
  if (mechanicId === "spatial-puzzle-3d") return SOURCES.spatial3d;
  return SOURCES.templates;
};

export function recommendMechanics(brief: string): MechanicDefinition[] {
  const normalized = brief.toLowerCase();
  const scored = MECHANIC_LIBRARY.map((mechanic, index) => ({
    mechanic,
    index,
    score: mechanic.keywords.reduce(
      (total, keyword) => total + (normalized.includes(keyword.toLowerCase()) ? 1 : 0),
      0,
    ),
  })).sort((a, b) => b.score - a.score || a.index - b.index);

  const matched = scored.filter((entry) => entry.score > 0).slice(0, 3);
  return (matched.length > 0 ? matched : scored.slice(0, 3)).map(
    (entry) => entry.mechanic,
  );
}

export function createReferenceDossier(
  queryIntent: string,
  selectedMechanicIds: string[],
): ReferenceDossier {
  const mechanics = selectedMechanicIds
    .map((id) => MECHANIC_LIBRARY.find((mechanic) => mechanic.id === id))
    .filter((mechanic): mechanic is MechanicDefinition => Boolean(mechanic));

  const sourceCandidates = [
    ...mechanics.map((mechanic) => mechanicSource(mechanic.id)),
    SOURCES.controls,
    SOURCES.templates,
  ];
  const references = Array.from(
    new Map(sourceCandidates.map((source) => [source.url, source])).values(),
  ).slice(0, 4);

  const dossierSeed = `${queryIntent}-${selectedMechanicIds.join("-")}`
    .split("")
    .reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 7)
    .toString(16)
    .toUpperCase();

  return {
    id: `REF-${dossierSeed.padStart(8, "0")}`,
    queryIntent: queryIntent.trim(),
    internalCandidates: mechanics.flatMap((mechanic) => mechanic.capabilityIds),
    references,
    adopted: mechanics.map(
      (mechanic) => `采用「${mechanic.name}」的核心动作，并复用已有能力检查器。`,
    ),
    adapted: [
      "控制方式将分别为触控与键盘设计，不把桌面按钮直接缩小到手机。",
      "最终世界观、角色、美术和声音全部重新生成，不沿用参考作品识别。",
    ],
    rejected: ["不加入实时多人、开放世界或无法由当前验收器证明的系统。"],
    compatibilityRisks:
      mechanics.length > 2
        ? ["同时选择超过两种主要机制，可能造成操作和节奏冲突。"]
        : ["需要用可玩原型确认两种机制在目标单局时长内都能反复出现。"],
  };
}

export const getResearchSourceCount = (): number =>
  new Set(Object.values(SOURCES).map((source) => source.url)).size;
