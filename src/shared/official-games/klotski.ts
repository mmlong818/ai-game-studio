import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const klotski = defineOfficialGame({
  id: "klotski",
  title: "朱门华容",
  kind: "template",
  serverTemplate: "klotski",
  lobbyRank: 11,
  cover: "assets/templates/packs/klotski/cover.png",
  referenceDoc: "docs/43-klotski-best-template-reference.md",
  knowledge: { patternId: "sliding-block-escape", mechanicIds: ["sliding-block"], rationale: "合法移块与可解出口是核心约束。" },
  seed: {
    artStyle: "ink",
    visualStyle: "line-art",
    idea: "做一个东方庭院中的机器人华容道，拖动包裹给队长让路，每关连续完成主题题组；先观察再提示一步，通庭点亮印记，整关结算真实进步。",
  },
  domainTemplate: {
    id: "sliding-block",
    name: "移块脱困",
    genre: "空间推理",
    pitch: "在有限格位中合法腾挪，让目标块抵达出口。",
    coreLoop: "认识本关技巧 → 入门练习 → 变式腾挪 → 综合脱困 → 整组结算与个人改善",
    coreRules: ["方块占格固定，移动不能重叠", "目标块必须到达出口", "提示解释本步让路效果，搜索预算不足不等于无解", "按关卡保存合法操作路径与撤销重做，明确重开清当前局；旧回放不影响新局"],
    capabilities: ["grid-occupancy", "legal-move", "solver"],
    suggestions: commonSuggestions(
      "sliding-block",
      "固定占格、合法腾挪和目标到出口保持不变",
      "替换题库、步数挑战、提示方式和人物包装。",
      "只加入锁块或单向格中的一项。",
    ),
    redirectExamples: ["自由拖放", "实时追逐", "战斗"],
  },
  probeScenario: {
    actions: {
      "inspect-grid": ["occupancy-fixed"],
      "invalid-overlap": ["overlap-blocked"],
      "move-target-exit": ["target-reached-exit", "session-completed"],
    },
    rejectedActions: ["invalid-overlap"],
    completingActions: ["move-target-exit"],
  },
  runtimeDefinition: {
    actions: ["选择方块", "合法腾挪", "推出目标"],
    feedback: ["目标块已选择", "空位已经腾出", "目标块抵达出口"],
    className: "sliding",
  },
});
