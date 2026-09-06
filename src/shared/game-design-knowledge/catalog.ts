import type { GameDesignKnowledgeLibrary } from "./index.js";
import { OFFICIAL_MECHANIC_EXTENSIONS, OFFICIAL_PATTERN_EXTENSIONS } from "./official-extension.js";

const itch = { sourceUrl: "https://itch.io/games/top-rated/html5/lang-en", observedAt: "2026-09-05", signal: "ratings" as const, note: "HTML5 高评分样本覆盖解谜、节奏、叙事、模拟、卡牌和生存动作。" };
const apple = { sourceUrl: "https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/", observedAt: "2025-06-03", signal: "editorial-award" as const, note: "年度设计奖确认卡牌构筑 Roguelite 等小型高深度组合玩法。" };
const google = { sourceUrl: "https://play.google.com/store/apps/editorial?hl=en-US&id=mc_games_cmp_bestof2025_fcp", observedAt: "2025-12-01", signal: "editorial-award" as const, note: "年度选择包含易上手卡牌、短局纸牌等移动玩法。" };
const sensorTower = { sourceUrl: "https://sensortower.com/blog/state-of-mobile-gaming-2025", observedAt: "2025-03-01", signal: "revenue" as const, note: "休闲与混合休闲增长，支持简单核心玩法叠加成长与长期目标。" };

export const GAME_DESIGN_KNOWLEDGE_LIBRARY: GameDesignKnowledgeLibrary = {
  schemaVersion: "game-design-knowledge-v1",
  updatedAt: "2026-09-05",
  capabilities: [
    { id: "game-lifecycle", label: "游戏生命周期", category: "lifecycle", description: "开始、运行、暂停、结算、重试与错误恢复。", provides: ["game-state", "restart"], requires: [], acceptanceKinds: ["rule"] },
    { id: "unified-input", label: "统一输入", category: "input", description: "把键盘、指针、触控和手柄映射为游戏动作。", provides: ["player-action"], requires: ["game-lifecycle"], acceptanceKinds: ["rule", "viewport", "accessibility"] },
    { id: "score-system", label: "积分与评价", category: "progress", description: "分数、连击、星级、最佳记录和清晰的计分原因。", provides: ["score", "rating"], requires: ["game-lifecycle"], acceptanceKinds: ["rule", "progression"] },
    { id: "level-progression", label: "等级与进度", category: "progress", description: "关卡、阶段、章节、无尽档位、解锁和掌握证明。", provides: ["level", "unlock", "mastery"], requires: ["game-lifecycle"], acceptanceKinds: ["progression"] },
    { id: "onboarding", label: "可执行新手帮助", category: "learning", description: "在安全状态中要求玩家真实完成动作，再逐步撤去提示。", provides: ["tutorial-step", "learning-proof"], requires: ["unified-input"], acceptanceKinds: ["onboarding", "accessibility"] },
    { id: "difficulty-plan", label: "难度递进", category: "challenge", description: "分别管理认知、操作、空间、资源、组合和惩罚维度。", provides: ["difficulty-vector"], requires: ["level-progression"], acceptanceKinds: ["progression"] },
    { id: "failure-assistance", label: "失败解释与辅助", category: "recovery", description: "解释原因、递进提示、检查点和显式单维降难。", provides: ["failure-reason", "hint", "assist"], requires: ["game-lifecycle"], acceptanceKinds: ["assistance"] },
    { id: "sensory-feedback", label: "视听触觉反馈", category: "feedback", description: "动作、合法性、奖励、危险和结算都有可区分反馈。", provides: ["feedback-event"], requires: ["game-lifecycle"], acceptanceKinds: ["game-feel", "accessibility"] },
    { id: "local-persistence", label: "本地存档", category: "persistence", description: "保存设置、最佳成绩、解锁、教程完成和检查点。", provides: ["save-state"], requires: ["game-lifecycle"], acceptanceKinds: ["rule"] },
    { id: "accessible-presentation", label: "可访问呈现", category: "accessibility", description: "不只依赖颜色或声音，保证字号、对比度和触控目标。", provides: ["accessible-output"], requires: ["sensory-feedback"], acceptanceKinds: ["accessibility", "viewport"] },
  ],
  mechanics: [
    ...OFFICIAL_MECHANIC_EXTENSIONS,
    { id: "lane-dodge", label: "固定路线闪避", family: "movement", playerVerb: "换道并避开障碍", state: ["lane", "speed", "hazard"], inputs: ["move-left", "move-right"], outputs: ["avoided", "collided"], capabilityIds: ["unified-input", "difficulty-plan", "sensory-feedback"], relations: [{ targetId: "collect-charge", kind: "complements", reason: "收集目标让安全路线选择具有风险收益。" }], tunableDimensions: ["operation", "space", "combination"], probeSignals: ["lane-changed", "obstacle-avoided"] },
    { id: "collect-charge", label: "收集并积蓄能力", family: "collection", playerVerb: "收集资源并选择释放时机", state: ["charge", "target"], inputs: ["collect", "activate"], outputs: ["charge-gained", "ability-used"], capabilityIds: ["score-system", "sensory-feedback"], relations: [{ targetId: "lane-dodge", kind: "balance-coupled", reason: "奖励路线不能破坏安全通路。" }], tunableDimensions: ["resources", "operation"], probeSignals: ["target-collected", "charge-increased"] },
    { id: "grid-slide-merge", label: "网格滑动合并", family: "matching", playerVerb: "推动全盘并合并同值单位", state: ["grid", "tile-value", "empty-cell"], inputs: ["slide-direction"], outputs: ["grid-moved", "tile-merged", "tile-spawned"], capabilityIds: ["score-system", "difficulty-plan", "failure-assistance"], relations: [], tunableDimensions: ["cognition", "space", "resources"], probeSignals: ["board-slid", "equal-merged-once"] },
    { id: "match-combo", label: "匹配与连锁", family: "matching", playerVerb: "交换或选择元素形成匹配", state: ["board", "combo", "objective"], inputs: ["select", "swap"], outputs: ["matched", "combo-resolved"], capabilityIds: ["score-system", "level-progression", "sensory-feedback"], relations: [{ targetId: "resource-upgrade", kind: "enables", reason: "局外升级可由匹配产出驱动。" }], tunableDimensions: ["cognition", "combination", "resources"], probeSignals: ["match-resolved", "combo-increased"] },
    { id: "survive-auto-attack", label: "移动生存与自动攻击", family: "combat", playerVerb: "走位躲避并选择升级", state: ["health", "enemies", "experience", "build"], inputs: ["move", "choose-upgrade"], outputs: ["damage", "experience-gained", "upgrade-applied"], capabilityIds: ["difficulty-plan", "level-progression", "failure-assistance"], relations: [{ targetId: "resource-upgrade", kind: "requires", reason: "局内构筑提供生存玩法的策略层。" }], tunableDimensions: ["operation", "space", "combination", "punishment"], probeSignals: ["enemy-defeated", "upgrade-chosen"] },
    { id: "resource-upgrade", label: "资源换升级", family: "economy", playerVerb: "分配有限资源强化能力", state: ["currency", "upgrade-options", "build"], inputs: ["choose-upgrade"], outputs: ["resource-spent", "stat-changed"], capabilityIds: ["level-progression", "local-persistence"], relations: [{ targetId: "survive-auto-attack", kind: "enables", reason: "提供可验证的构筑差异。" }], tunableDimensions: ["cognition", "resources", "combination"], probeSignals: ["upgrade-chosen", "resource-spent"] },
    { id: "deck-synergy", label: "牌组构筑与协同", family: "risk-reward", playerVerb: "选择牌或效果形成组合", state: ["deck", "hand", "energy", "synergy"], inputs: ["play-card", "choose-reward"], outputs: ["effect-resolved", "deck-changed"], capabilityIds: ["score-system", "level-progression", "failure-assistance"], relations: [{ targetId: "resource-upgrade", kind: "substitutes", reason: "卡牌本身可承担升级选择，无需重复经济层。" }], tunableDimensions: ["cognition", "resources", "combination"], probeSignals: ["card-played", "synergy-triggered"] },
    { id: "sort-and-serve", label: "分类、排序与交付", family: "economy", playerVerb: "识别对象并放入正确流程", state: ["queue", "category", "deadline"], inputs: ["select", "place"], outputs: ["sorted", "served", "mistake"], capabilityIds: ["score-system", "difficulty-plan", "failure-assistance"], relations: [], tunableDimensions: ["cognition", "operation", "resources"], probeSignals: ["item-sorted", "order-served"] },
    { id: "rhythm-timing", label: "节奏时机", family: "timing", playerVerb: "在节拍窗口执行动作", state: ["beat", "window", "streak"], inputs: ["timed-action"], outputs: ["timing-grade", "streak-changed"], capabilityIds: ["score-system", "sensory-feedback", "accessible-presentation"], relations: [], tunableDimensions: ["operation", "combination"], probeSignals: ["beat-hit", "timing-graded"] },
    { id: "choice-consequence", label: "选择与后果", family: "information", playerVerb: "读取信息并作出改变后续状态的选择", state: ["facts", "relationships", "branch"], inputs: ["choose"], outputs: ["state-changed", "branch-entered"], capabilityIds: ["level-progression", "local-persistence", "accessible-presentation"], relations: [], tunableDimensions: ["cognition", "resources", "punishment"], probeSignals: ["choice-made", "consequence-observed"] },
  ],
  patterns: [
    ...OFFICIAL_PATTERN_EXTENSIONS,
    { id: "sliding-merge-puzzle", label: "滑动合并解谜", summary: "用全盘方向输入管理空间并追求合并目标。", scope: { dimensions: ["2d"], sessionMinutes: [2, 10], inputs: ["keyboard", "touch"] }, tags: ["puzzle", "short-session", "score"], coreCapabilityIds: ["game-lifecycle", "score-system", "onboarding", "difficulty-plan"], coreMechanicIds: ["grid-slide-merge"], optionalMechanicIds: [], compositionRules: ["先教学有效滑动与一次一并，再增加空间压力。"], knownRisks: ["仅提高目标数字会造成内容重复。"], evidence: [itch], lifecycle: "verified", evaluationVersion: 1 },
    { id: "lane-collection-runner", label: "路线闪避收集", summary: "在有限路线中读障碍、收集资源并选择爆发时机。", scope: { dimensions: ["2d", "limited-3d"], sessionMinutes: [2, 8], inputs: ["keyboard", "touch"] }, tags: ["action", "runner", "short-session"], coreCapabilityIds: ["game-lifecycle", "unified-input", "difficulty-plan", "onboarding"], coreMechanicIds: ["lane-dodge"], optionalMechanicIds: ["collect-charge"], compositionRules: ["任何生成批次都必须保留可读的安全路线。"], knownRisks: ["速度、密度和惩罚同时上涨会形成不可解释断崖。"], evidence: [itch, sensorTower], lifecycle: "verified", evaluationVersion: 1 },
    { id: "survivor-build", label: "生存割草构筑", summary: "以移动闪避为低门槛动作，用升级选择形成局内构筑。", scope: { dimensions: ["2d", "limited-3d"], sessionMinutes: [5, 20], inputs: ["keyboard", "touch", "gamepad"] }, tags: ["action", "roguelite", "build"], coreCapabilityIds: ["game-lifecycle", "difficulty-plan", "failure-assistance", "level-progression"], coreMechanicIds: ["survive-auto-attack", "resource-upgrade"], optionalMechanicIds: ["collect-charge"], compositionRules: ["操作压力与升级决策交替，不在战斗峰值弹出复杂选择。"], knownRisks: ["对象数量与特效会快速突破网页性能预算。"], evidence: [itch, sensorTower], lifecycle: "verified", evaluationVersion: 1 },
    { id: "deckbuilding-roguelite", label: "卡牌构筑 Roguelite", summary: "用清晰规则的牌或骰子组合形成高复玩协同。", scope: { dimensions: ["2d"], sessionMinutes: [5, 30], inputs: ["pointer", "touch"] }, tags: ["card", "roguelite", "strategy", "build"], coreCapabilityIds: ["game-lifecycle", "onboarding", "level-progression", "failure-assistance"], coreMechanicIds: ["deck-synergy"], optionalMechanicIds: ["resource-upgrade"], compositionRules: ["每张牌的效果、触发顺序和协同必须可预览、可重放。"], knownRisks: ["内容量和组合爆炸会降低可验证性。"], evidence: [apple, google, itch], lifecycle: "verified", evaluationVersion: 1 },
    { id: "match-progression", label: "匹配消除成长", summary: "易理解的匹配核心叠加任务、关卡或轻量成长。", scope: { dimensions: ["2d"], sessionMinutes: [2, 8], inputs: ["pointer", "touch"] }, tags: ["puzzle", "casual", "progression"], coreCapabilityIds: ["score-system", "level-progression", "difficulty-plan", "onboarding"], coreMechanicIds: ["match-combo"], optionalMechanicIds: ["resource-upgrade"], compositionRules: ["每一阶段至少变化目标、空间或机制之一，不能只改步数。"], knownRisks: ["外围成长可能掩盖核心关卡重复。"], evidence: [sensorTower, google], lifecycle: "verified", evaluationVersion: 1 },
    { id: "sorting-management", label: "排序与轻经营", summary: "把识别、摆放、排队和时间管理组合成短局流程优化。", scope: { dimensions: ["2d", "limited-3d"], sessionMinutes: [3, 12], inputs: ["pointer", "touch"] }, tags: ["simulation", "management", "casual"], coreCapabilityIds: ["score-system", "difficulty-plan", "failure-assistance"], coreMechanicIds: ["sort-and-serve"], optionalMechanicIds: ["resource-upgrade"], compositionRules: ["先教学单一分类，再逐步加入队列与截止时间。"], knownRisks: ["UI 信息密度会压垮手机视口。"], evidence: [itch, sensorTower], lifecycle: "verified", evaluationVersion: 1 },
    { id: "rhythm-score-chase", label: "节奏评分挑战", summary: "以时机窗口、连击和歌曲段落构成短局掌握曲线。", scope: { dimensions: ["2d"], sessionMinutes: [2, 6], inputs: ["keyboard", "touch", "gamepad"] }, tags: ["rhythm", "score", "skill"], coreCapabilityIds: ["score-system", "sensory-feedback", "accessible-presentation", "onboarding"], coreMechanicIds: ["rhythm-timing"], optionalMechanicIds: [], compositionRules: ["视觉节拍与音频节拍必须共享同一时间源并提供校准。"], knownRisks: ["音频延迟与无障碍替代提示需要真机验证。"], evidence: [itch], lifecycle: "verified", evaluationVersion: 1 },
    { id: "choice-deduction", label: "选择叙事与推理", summary: "通过有限信息、选择和可观察后果构成短篇叙事或推理。", scope: { dimensions: ["2d"], sessionMinutes: [5, 30], inputs: ["pointer", "touch", "keyboard"] }, tags: ["narrative", "deduction", "puzzle"], coreCapabilityIds: ["game-lifecycle", "level-progression", "local-persistence", "accessible-presentation"], coreMechanicIds: ["choice-consequence"], optionalMechanicIds: [], compositionRules: ["关键推理必须有可追溯事实，不能依赖作者未展示的信息。"], knownRisks: ["文本和分支内容成本高，自动验收需结合可达性求解。"], evidence: [itch], lifecycle: "verified", evaluationVersion: 1 },
  ],
  evaluation: {
    version: 1,
    dimensions: [
      { id: "goal-clarity", label: "目标与反馈清晰", weight: 12, evidenceKinds: ["contract", "probe", "playtest"] },
      { id: "onboarding", label: "首次游玩可学会", weight: 14, evidenceKinds: ["probe", "browser", "playtest"] },
      { id: "core-loop", label: "核心循环成立", weight: 16, evidenceKinds: ["contract", "probe", "playtest"] },
      { id: "meaningful-choice", label: "存在有意义选择", weight: 12, evidenceKinds: ["contract", "playtest"] },
      { id: "progression", label: "难度和内容递进", weight: 14, evidenceKinds: ["contract", "solver", "probe"] },
      { id: "fairness", label: "公平、可解与可恢复", weight: 12, evidenceKinds: ["solver", "probe", "playtest"] },
      { id: "production-fit", label: "适合当前平台可靠生成", weight: 12, evidenceKinds: ["contract", "browser"] },
      { id: "evidence-freshness", label: "玩法依据新鲜且可信", weight: 8, evidenceKinds: ["market"] },
    ],
    minimumVerifiedScore: 80,
    hardGates: [
      { id: "learnable", label: "新玩家无需外部说明可完成首次核心动作" },
      { id: "solvable", label: "关键路径可达、可解或公平生成" },
      { id: "deterministic-rules", label: "同输入和种子下规则结果可复现" },
      { id: "platform-scope", label: "单人网页范围和性能预算可满足" },
      { id: "complete-assets", label: "关键状态、反馈和资源槽位完整" },
    ],
  },
};
