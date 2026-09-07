import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const starDreamDuel = defineOfficialGame({
  id: "star-dream-duel",
  title: "星梦对决",
  kind: "fixture",
  fixtureKind: "star-dream-duel",
  // 星梦对决的 spec 由 generateGameSpec 落到 "signal-hunt"（平台默认服务端模板）。
  serverTemplate: "signal-hunt",
  lobbyRank: 1,
  cover: "fixtures/star-dream-duel/assets/cover.png",
  referenceDoc: "docs/50-star-dream-duel-best-template-reference.md",
  knowledge: { patternId: "turn-match3-duel", mechanicIds: ["match-combo"], rationale: "回合、对手与三消结果共同驱动资源变化。" },
  fixture: {
    metaKey: "golden_fixture_initialized",
    buildOutputs: [
      "单人限步收集、人机对战各有 20 关；另有无目标无限休闲，三种玩法独立存档。",
      "GAME_DESIGN、ART_DIRECTION、SOUND_DIRECTION 已形成。",
      "棋子、音效、PWA 图标与触控反馈已经集成。",
      "已接入棋盘规则、玩家输入、AI 回合与结算逻辑。",
      "规则、单人首关双端真实输入、恢复隔离与原有对战回归已验证；完整体验调校仍在进行。",
      "稳定玩家网址和不可变版本网址已生成。",
    ],
  },
  domainTemplate: {
    id: "turn-duel-match3",
    name: "轮换对决三消",
    genre: "对抗三消",
    pitch: "单人限步收集星光，对战与 AI 分区攻守，或在无目标、无步数限制的无限休闲中自由消除。",
    coreLoop: "选择单人或对战 → 观察目标 → 交换消除 → 收集目标或结算攻守 → 关卡成果",
    coreRules: ["单人操作整张棋盘，目标收满即胜，无效交换不扣步", "对战中玩家操作下半区，AI 操作上半区", "交换后必须形成三连，全部连消归当前行动者", "对战任一方生命归零即结束；两种模式进度独立"],
    capabilities: ["match3-board", "swap-match", "turn-order", "ai-opponent", "combo-scoring"],
    suggestions: commonSuggestions(
      "turn-duel-match3",
      "保持简单交换操作与模式隔离；单人是限步收集，对战是分区轮流攻守",
      "替换棋子主题、对手形象、起始积分和连消倍率。",
      "只加入一种特殊棋子或一种对手行为。",
    ),
    redirectExamples: ["实时对战", "联机", "开放世界", "多人"],
  },
  probeScenario: {
    actions: {
      "inspect-board": ["board-readable", "half-zones-visible"],
      "swap-outside-zone": ["zone-blocked"],
      "swap-match": ["three-in-line", "combo-scored-to-actor"],
      "end-turn": ["turn-passed-to-ai", "ai-turn-resolved"],
      "drain-opponent": ["score-drained", "session-completed"],
    },
    rejectedActions: ["swap-outside-zone"],
    completingActions: ["drain-opponent"],
  },
  runtimeDefinition: {
    actions: ["观察半区", "交换三消", "结束回合"],
    feedback: ["上下半区与棋盘已显示", "三连消除并计入当前行动者", "轮到 AI 行动并结算"],
    className: "duel",
  },
});
