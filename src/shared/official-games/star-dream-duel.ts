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
  mechanicId: "grid-merge",
  fixture: {
    metaKey: "golden_fixture_initialized",
    buildOutputs: [
      "共享 8×8 棋盘、分区操作、连消归属与三局两胜已锁定。",
      "GAME_DESIGN、ART_DIRECTION、SOUND_DIRECTION 已形成。",
      "已接入棋盘规则、玩家输入、AI 回合与结算逻辑。",
      "棋子、音效、PWA 图标与触控反馈已经集成。",
      "8 项规则测试与页面结构检查通过。",
      "稳定玩家网址和不可变版本网址已生成。",
    ],
  },
  domainTemplate: {
    id: "turn-duel-match3",
    name: "轮换对决三消",
    genre: "对抗三消",
    pitch: "和 AI 共用一个棋盘轮流三消，用连消抢分，把对手的积分耗尽。",
    coreLoop: "观察棋盘 → 交换消除 → 连消计分 → 轮到对手",
    coreRules: ["玩家只能操作下半区，AI 只能操作上半区", "交换后必须形成三连", "全部连消归当前行动者", "任一方积分归零即结束"],
    capabilities: ["match3-board", "swap-match", "turn-order", "ai-opponent", "combo-scoring"],
    suggestions: commonSuggestions(
      "turn-duel-match3",
      "共用棋盘、半区限制、轮流行动和连消归属保持不变",
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
