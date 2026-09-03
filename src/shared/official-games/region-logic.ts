import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const regionLogic = defineOfficialGame({
  id: "region-logic",
  title: "星灵巡格",
  kind: "template",
  serverTemplate: "region-logic",
  lobbyRank: 6,
  cover: "assets/templates/packs/region-logic/cover.png",
  referenceDoc: "docs/49-region-logic-best-template-reference.md",
  mechanicId: "constraint-deduction",
  seed: {
    artStyle: "garden",
    visualStyle: "cute",
    idea: "做一个星灵区域逻辑游戏，每行、每列和每个区域各放一个星灵，并且星灵不能相邻。",
  },
  domainTemplate: {
    id: "region-logic",
    name: "区域逻辑",
    genre: "逻辑推理",
    pitch: "根据行列、区域和相邻限制逐步排除，得到唯一解。",
    coreLoop: "读取线索 → 排除 → 标记 → 验证",
    coreRules: ["约束信息完整", "题目逻辑可解", "错误能够被解释"],
    capabilities: ["constraint-solver", "hint-explanation", "unique-solution"],
    suggestions: commonSuggestions(
      "region-logic",
      "行列区域约束、逻辑可解和提示解释保持不变",
      "替换符号、版面、题库难度和提示表达。",
      "只加入一种额外逻辑约束。",
    ),
    redirectExamples: ["随机猜测", "实时操作", "战斗"],
  },
  probeScenario: {
    actions: {
      "inspect-clues": ["constraints-complete"],
      solve: ["solver-found-solution"],
      "make-error": ["error-explained", "session-completed"],
    },
    completingActions: ["make-error"],
  },
  runtimeDefinition: {
    actions: ["读取线索", "排除候选", "验证答案"],
    feedback: ["行列与区域约束已读取", "矛盾候选已排除", "唯一解验证完成"],
    className: "logic",
  },
});
