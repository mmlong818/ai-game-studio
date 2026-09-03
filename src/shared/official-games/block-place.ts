import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const blockPlace = defineOfficialGame({
  id: "block-place",
  title: "果冻填阵",
  kind: "template",
  serverTemplate: "block-place",
  lobbyRank: 4,
  cover: "assets/templates/packs/block-place/cover.png",
  referenceDoc: "docs/47-block-place-best-template-reference.md",
  mechanicId: "grid-merge",
  seed: {
    artStyle: "geometric",
    visualStyle: "color-block",
    idea: "做一个果冻材质的方块填阵游戏，从三块中选择并放进 8×8 棋盘，通过横竖消行达到目标分数。",
  },
  domainTemplate: {
    id: "block-placement",
    name: "方块填阵",
    genre: "放置消除",
    pitch: "从三个拼块中选择并放置，用横竖消除维持空间。",
    coreLoop: "三选一 → 放置 → 横竖消除 → 补充",
    coreRules: ["每轮提供三块", "拼块必须合法放置", "横列或竖列填满后消除"],
    capabilities: ["shape-fit", "line-clear", "move-availability"],
    suggestions: commonSuggestions(
      "block-placement",
      "三选拼块、合法放置、横竖消行和无解结束保持不变",
      "替换材质、棋盘主题、连击反馈和旅程节奏。",
      "只加入一种特殊块。",
    ),
    redirectExamples: ["下落方块", "实时对战", "经营"],
  },
  probeScenario: {
    actions: {
      "deal-three": ["three-pieces-offered"],
      "place-legal": ["legal-placement"],
      "complete-line": ["row-or-column-full", "line-cleared", "session-completed"],
    },
    completingActions: ["complete-line"],
  },
  runtimeDefinition: {
    actions: ["三选一", "放置拼块", "完成消行"],
    feedback: ["已选中拼块", "合法放置", "横列或竖列已消除"],
    className: "placement",
  },
});
