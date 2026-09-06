import { commonSuggestions, OFFICIAL_GAMES, type GameplayTemplateBundle } from "../shared/official-games";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "../shared/game-design-knowledge/catalog";
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
    knowledge: { patternId: "third-person-collection", mechanicIds: ["spatial-navigation"], rationale: "三维移动、收集、检查点与出口构成已验证探索循环。" },
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
    knowledge: { patternId: "wave-shooter", mechanicIds: ["projectile-wave"], rationale: "走位、主动射击、敌人波次与强化构成竞技场循环。" },
  },
];

/** 全部玩法模板捆绑：官方游戏登记表在前（按登记顺序），补充模板在后。 */
export const GAMEPLAY_TEMPLATE_BUNDLES: GameplayTemplateBundle[] = [
  ...OFFICIAL_GAMES.map((game): GameplayTemplateBundle => ({
    domainTemplate: game.domainTemplate,
    probeKind: game.probeKind,
    probeScenario: game.probeScenario,
    runtimeDefinition: game.runtimeDefinition,
    knowledge: game.knowledge,
    threeMode: game.threeMode,
    development: (game.stage ?? "live") !== "live",
    remixable: game.remixable,
  })),
  ...SUPPLEMENTARY_GAMEPLAY_TEMPLATES,
];

export const getGameplayBundle = (templateId: string | null | undefined): GameplayTemplateBundle | undefined =>
  GAMEPLAY_TEMPLATE_BUNDLES.find((bundle) => bundle.domainTemplate.id === templateId);

/** 创作页可选的玩法模板：开发中的登记不在其中；其探针与运行时定义仍由捆绑表提供以便持续测试。 */
export const GAME_TEMPLATES: GameTemplate[] = GAMEPLAY_TEMPLATE_BUNDLES.filter((bundle) => !bundle.development && bundle.remixable !== false).map((bundle) => bundle.domainTemplate);

/** 玩法模板 id → 创作侧运行时定义（动作、反馈、样式类名）。 */
export const TEMPLATE_RUNTIME_DEFINITIONS: Record<string, GameplayTemplateBundle["runtimeDefinition"]> = Object.fromEntries(
  GAMEPLAY_TEMPLATE_BUNDLES.map((bundle) => [bundle.domainTemplate.id, bundle.runtimeDefinition]),
);

const MECHANIC_RUNTIME_METADATA: Record<string, Pick<MechanicDefinition, "capabilityIds" | "keywords">> = {
  'endpoint-track-assembly': { capabilityIds: ['spatial-validation', 'unified-input', 'checkpoint-save'], keywords: ['铁路', '轨道', '接续', '搭建', '沙盒'] },
  'path-bound-vehicle': { capabilityIds: ['continuous-movement', 'checkpoint-save'], keywords: ['火车', '路径运行', '折返', '闭环'] },
  'continuous-kart-steering': { capabilityIds: ['continuous-movement', 'unified-input'], keywords: ['赛车', '卡丁车', '连续转向', '驾驶', '弯道'] },
  'circuit-lap-progress': { capabilityIds: ['continuous-movement', 'checkpoint-save'], keywords: ['赛道', '圈数', '圈速', '冲线', '计时赛'] },
  'energy-speed-burst': { capabilityIds: ['pickup', 'risk-reward'], keywords: ['冲刺', '蓄能', '加速', '超车'] },
  "lane-dodge": { capabilityIds: ["continuous-movement", "seeded-spawning", "safe-lane"], keywords: ["闪避", "躲", "竞速", "跑酷", "路线", "障碍", "速度"] },
  "trail-growth": { capabilityIds: ["continuous-movement", "body-trail", "pickup"], keywords: ["贪吃蛇", "持续移动", "转向", "增长", "自撞", "生存"] },
  "falling-blocks": { capabilityIds: ["grid-simulation", "piece-rotation", "line-clear"], keywords: ["俄罗斯方块", "落块", "旋转", "暂存", "消行", "堆叠"] },
  "grid-slide-merge": { capabilityIds: ["grid-slide", "merge-equal", "move-availability"], keywords: ["合成", "数字", "滑动", "棋盘", "方块", "升级"] },
  "polyomino-placement": { capabilityIds: ["shape-fit", "line-clear", "move-availability"], keywords: ["方块填阵", "拖放", "候选拼块", "消行", "空间管理"] },
  "match-combo": { capabilityIds: ["match3-board", "swap-match", "turn-order", "ai-opponent", "combo-scoring"], keywords: ["三消", "交换", "连消", "回合", "对抗", "AI"] },
  "projectile-wave": { capabilityIds: ["projectile-hit", "enemy-wave", "invulnerability-window"], keywords: ["射击", "子弹", "弹幕", "敌人", "战斗", "Boss"] },
  "paddle-trajectory": { capabilityIds: ["arcade-collision", "trajectory", "level-layout"], keywords: ["打砖块", "弹球", "挡板", "反弹", "轨迹", "清场"] },
  "grid-navigation": { capabilityIds: ["grid-path", "reachability", "checkpoint-save"], keywords: ["迷宫", "探索", "路径", "出口", "钥匙", "地形"] },
  "sliding-block": { capabilityIds: ["grid-occupancy", "legal-move", "solver"], keywords: ["华容道", "滑块", "移块", "占格", "出口", "求解"] },
  "route-relic-synergy": { capabilityIds: ["route-choice", "seeded-run", "checkpoint-save"], keywords: ["肉鸽", "路线", "选择", "构筑", "遗物", "旅程"] },
  "collect-charge": { capabilityIds: ["pickup", "risk-reward", "exit-unlock"], keywords: ["收集", "撤离", "出口", "宝物", "逃离", "探索"] },
  "drag-snap-assembly": { capabilityIds: ["drag-snap", "spatial-validation", "touch-input"], keywords: ["拖动", "拼图", "摆放", "整理", "拼合", "吸附"] },
  "constraint-deduction": { capabilityIds: ["constraint-solver", "unique-solution", "hint-explanation"], keywords: ["推理", "逻辑", "数独", "谜题", "唯一解", "排除"] },
  "tableau-solitaire": { capabilityIds: ["card-tableau", "free-cells", "supermove", "foundation-build", "seeded-deal"], keywords: ["空当接龙", "空档接龙", "纸牌", "超级移动", "收牌堆", "牌局"] },
  "sort-and-serve": { capabilityIds: ["queue-scheduling", "order-deadline", "capacity-upgrade", "round-progression"], keywords: ["经营", "店铺", "订单", "排队", "制作", "顾客", "时间管理"] },
  "choice-consequence": { capabilityIds: ["chapter-state", "branch-choice", "consequence-flag", "checkpoint-save"], keywords: ["剧情", "故事", "对话", "章节", "分支", "结局", "选择"] },
  "deck-synergy": { capabilityIds: ["seeded-deck", "card-cost", "combo-resolution", "turn-progression"], keywords: ["卡牌", "卡组", "抽牌", "费用", "连携", "协同", "回合"] },
  "gamepad-equivalent-control": { capabilityIds: ["gamepad-input", "input-remap", "keyboard-fallback"], keywords: ["手柄", "摇杆", "控制器", "按键映射"] },
  "spatial-rotation-path": { capabilityIds: ["character-controller", "camera", "3d-spatial-reasoning", "reachability", "checkpoint-save"], keywords: ["3d", "立体", "空间", "机关", "透视", "相机", "空间谜题"] },
};

/**
 * 高级创作器的机制列表由统一知识库派生；这里只保留旧创作运行时所需的能力标签与检索词，
 * 不再复制机制 id、名称或规则说明。
 */
export const MECHANIC_LIBRARY: MechanicDefinition[] = GAME_DESIGN_KNOWLEDGE_LIBRARY.mechanics
  .filter(({ id }) => Boolean(MECHANIC_RUNTIME_METADATA[id]))
  .map((mechanic) => ({
    id: mechanic.id,
    name: mechanic.label,
    description: mechanic.playerVerb,
    ...MECHANIC_RUNTIME_METADATA[mechanic.id],
  }));

/** 按 id 查玩法模板：覆盖开发中的登记（它们不在创作页列表里，但探针、规格与测试仍要能找到）。 */
export const getTemplate = (id: string | null): GameTemplate | undefined =>
  GAMEPLAY_TEMPLATE_BUNDLES.find((bundle) => bundle.domainTemplate.id === id)?.domainTemplate;
