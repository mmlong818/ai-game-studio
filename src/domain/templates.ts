import { commonSuggestions, OFFICIAL_GAMES, type GameplayTemplateBundle } from "../shared/official-games";
import type { GameTemplate, MechanicDefinition } from "./types";

/**
 * 没有进入大厅、但创作页仍然提供的玩法模板（3D 黄金模板与多道攀爬）。
 * 它们和官方游戏共用同一种捆绑结构；一旦其中某款正式成为官方游戏，
 * 就把整条捆绑搬进 src/shared/official-games/<id>.ts，并从这里删除。
 */
const SUPPLEMENTARY_GAMEPLAY_TEMPLATES: GameplayTemplateBundle[] = [
  {
    domainTemplate: {
      id: "collect-escape-3d",
      name: "立体收集撤离",
      genre: "3D 探索",
      pitch: "在清晰空间中移动和收集，避开危险后抵达出口。",
      coreLoop: "探索 → 收集 → 规避 → 撤离",
      coreRules: ["角色和相机可控", "碰撞边界清楚", "收集目标后可以抵达出口"],
      capabilities: ["character-controller", "camera", "collect-escape", "checkpoint-save"],
      suggestions: commonSuggestions(
        "collect-escape-3d",
        "角色移动、相机、碰撞、收集和出口保持不变",
        "替换世界、角色、收集物、危险物和路线。",
        "只加入一种移动能力或一种动态危险。",
      ),
      redirectExamples: ["开放世界", "载具群", "复杂骨骼战斗"],
    },
    probeKind: "collect-escape-3d",
    threeMode: "collector",
    probeScenario: {
      actions: {
        "move-forward": ["character-moved"],
        "rotate-camera": ["camera-rotated"],
        "cross-wall": [],
        collect: ["target-collected", "exit-unlocked"],
        "enter-exit": ["exit-reached"],
      },
      rejectedActions: ["cross-wall"],
      completingActions: ["enter-exit"],
    },
    runtimeDefinition: {
      actions: ["探索空间", "收集目标", "进入出口"],
      feedback: ["相机与角色已移动", "出口已经解锁", "成功撤离"],
      className: "collect3d",
    },
    mechanicId: "collect-escape",
  },
  {
    domainTemplate: {
      id: "arena-3d",
      name: "立体竞技场",
      genre: "3D 动作",
      pitch: "在有限场地里走位和攻击，识别敌人行为并完成波次。",
      coreLoop: "识别威胁 → 走位 → 攻击 → 波次强化",
      coreRules: ["移动和攻击可响应", "命中判定稳定", "敌人波次能够结算"],
      capabilities: ["character-controller", "melee-hit", "enemy-ai", "enemy-wave"],
      suggestions: commonSuggestions(
        "arena-3d",
        "移动、攻击、命中、敌人 AI 和波次保持不变",
        "替换场景、武器表现、敌人包和强化选项。",
        "只加入一种武器或一种敌人行为。",
      ),
      redirectExamples: ["联机竞技", "大型团战", "持久世界"],
    },
    threeMode: "arena",
    probeScenario: {
      actions: {
        "move-and-attack": ["movement-responsive", "attack-responsive"],
        "hit-enemy": ["stable-hit", "hit-feedback"],
        "finish-wave": ["enemy-wave-settled", "session-completed"],
      },
      completingActions: ["finish-wave"],
    },
    runtimeDefinition: {
      actions: ["走位闪避", "攻击命中", "完成波次"],
      feedback: ["移动响应正常", "命中反馈确认", "竞技场波次结算"],
      className: "arena",
    },
    mechanicId: "projectile-combat",
  },
];

/** 全部玩法模板捆绑：官方游戏登记表在前（按登记顺序），补充模板在后。 */
export const GAMEPLAY_TEMPLATE_BUNDLES: GameplayTemplateBundle[] = [
  ...OFFICIAL_GAMES.map((game): GameplayTemplateBundle => ({
    domainTemplate: game.domainTemplate,
    probeKind: game.probeKind,
    probeScenario: game.probeScenario,
    runtimeDefinition: game.runtimeDefinition,
    mechanicId: game.mechanicId,
    threeMode: game.threeMode,
    development: (game.stage ?? "live") !== "live",
  })),
  ...SUPPLEMENTARY_GAMEPLAY_TEMPLATES,
];

export const getGameplayBundle = (templateId: string | null | undefined): GameplayTemplateBundle | undefined =>
  GAMEPLAY_TEMPLATE_BUNDLES.find((bundle) => bundle.domainTemplate.id === templateId);

/** 创作页可选的玩法模板：开发中的登记不在其中；其探针与运行时定义仍由捆绑表提供以便持续测试。 */
export const GAME_TEMPLATES: GameTemplate[] = GAMEPLAY_TEMPLATE_BUNDLES.filter((bundle) => !bundle.development).map((bundle) => bundle.domainTemplate);

/** 模板改造需要研究同类机制时，用这张表找到对应的内部机制（MECHANIC_LIBRARY 中的 id）。 */
export const TEMPLATE_MECHANIC_MAP: Record<string, string> = Object.fromEntries(
  GAMEPLAY_TEMPLATE_BUNDLES.map((bundle) => [bundle.domainTemplate.id, bundle.mechanicId]),
);

/** 玩法模板 id → 创作侧运行时定义（动作、反馈、样式类名）。 */
export const TEMPLATE_RUNTIME_DEFINITIONS: Record<string, GameplayTemplateBundle["runtimeDefinition"]> = Object.fromEntries(
  GAMEPLAY_TEMPLATE_BUNDLES.map((bundle) => [bundle.domainTemplate.id, bundle.runtimeDefinition]),
);

export const MECHANIC_LIBRARY: MechanicDefinition[] = [
  {
    id: "lane-dodge",
    name: "路线闪避",
    description: "在少量清晰路线之间快速移动，预判并避开障碍。",
    capabilityIds: ["continuous-movement", "seeded-spawning", "safe-lane"],
    keywords: ["闪避", "躲", "竞速", "跑酷", "路线", "障碍", "速度"],
  },
  {
    id: "grid-merge",
    name: "全盘滑动合成",
    description: "一次输入改变整个棋盘，通过合并管理有限空间。",
    capabilityIds: ["grid-slide", "merge-equal", "move-availability"],
    keywords: ["合成", "数字", "滑动", "棋盘", "方块", "升级"],
  },
  {
    id: "projectile-combat",
    name: "弹体命中",
    description: "移动、发射和命中构成即时反馈明确的动作循环。",
    capabilityIds: ["projectile-hit", "enemy-wave", "invulnerability-window"],
    keywords: ["射击", "子弹", "弹幕", "敌人", "战斗", "Boss"],
  },
  {
    id: "grid-path",
    name: "路径与可达性",
    description: "用墙体、地形和门构成可以验证的空间路线。",
    capabilityIds: ["grid-path", "reachability", "checkpoint-save"],
    keywords: ["迷宫", "探索", "路径", "出口", "钥匙", "地形"],
  },
  {
    id: "route-choice",
    name: "路线三选一",
    description: "让玩家在一次旅程中反复选择风险、奖励和构筑方向。",
    capabilityIds: ["route-choice", "seeded-run", "checkpoint-save"],
    keywords: ["肉鸽", "路线", "选择", "构筑", "遗物", "旅程"],
  },
  {
    id: "collect-escape",
    name: "收集后撤离",
    description: "收集目标会增加收益与风险，完成条件是安全抵达出口。",
    capabilityIds: ["pickup", "risk-reward", "exit-unlock"],
    keywords: ["收集", "撤离", "出口", "宝物", "逃离", "探索"],
  },
  {
    id: "drag-snap",
    name: "拖放吸附",
    description: "直接拖动物体，在合法位置提供清楚的吸附和纠错反馈。",
    capabilityIds: ["drag-snap", "spatial-validation", "touch-input"],
    keywords: ["拖动", "拼图", "摆放", "整理", "拼合", "吸附"],
  },
  {
    id: "constraint-deduction",
    name: "约束推理",
    description: "通过完整线索逐步排除，并能解释提示和错误原因。",
    capabilityIds: ["constraint-solver", "unique-solution", "hint-explanation"],
    keywords: ["推理", "逻辑", "数独", "谜题", "唯一解", "排除"],
  },
  {
    id: "queue-management",
    name: "队列经营",
    description: "在有限时间与容量内安排订单队列，让等待、加工和交付形成可预测的经营循环。",
    capabilityIds: ["queue-scheduling", "order-deadline", "capacity-upgrade", "round-progression"],
    keywords: ["经营", "店铺", "订单", "排队", "制作", "顾客", "时间管理"],
  },
  {
    id: "chapter-branch",
    name: "章节选择",
    description: "通过短篇章节、有限选择和状态标记产生可回看、可恢复的分支结果。",
    capabilityIds: ["chapter-state", "branch-choice", "consequence-flag", "checkpoint-save"],
    keywords: ["剧情", "故事", "对话", "章节", "分支", "结局", "选择"],
  },
  {
    id: "deck-combo",
    name: "卡组协同",
    description: "抽取、消耗和组合卡牌形成资源取舍，并以可复现牌库验证协同效果。",
    capabilityIds: ["seeded-deck", "card-cost", "combo-resolution", "turn-progression"],
    keywords: ["卡牌", "卡组", "抽牌", "费用", "连携", "协同", "回合"],
  },
  {
    id: "gamepad-control",
    name: "手柄操作",
    description: "为单人核心动作增加手柄等价输入、焦点反馈和断开后的键盘回退。",
    capabilityIds: ["gamepad-input", "input-remap", "keyboard-fallback"],
    keywords: ["手柄", "摇杆", "控制器", "按键映射"],
  },
  {
    id: "spatial-puzzle-3d",
    name: "立体空间谜题",
    description: "在有限 3D 场景中观察空间关系、操作机关并验证可达路径与相机可读性。",
    capabilityIds: ["character-controller", "camera", "3d-spatial-reasoning", "reachability", "checkpoint-save"],
    keywords: ["3d", "立体", "空间", "机关", "透视", "相机", "空间谜题"],
  },
];

/** 按 id 查玩法模板：覆盖开发中的登记（它们不在创作页列表里，但探针、规格与测试仍要能找到）。 */
export const getTemplate = (id: string | null): GameTemplate | undefined =>
  GAMEPLAY_TEMPLATE_BUNDLES.find((bundle) => bundle.domainTemplate.id === id)?.domainTemplate;
