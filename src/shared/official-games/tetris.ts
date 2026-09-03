import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const tetris = defineOfficialGame({
  id: "tetris",
  title: "折光堆叠",
  kind: "template",
  serverTemplate: "tetris",
  lobbyRank: 13,
  cover: "assets/templates/packs/tetris/cover.png",
  referenceDoc: "docs/38-tetris-best-template-reference.md",
  mechanicId: "falling-blocks",
  seed: {
    artStyle: "geometric",
    visualStyle: "color-block",
    idea: "做一个构成主义风格的俄罗斯方块，完成 10 条消行获胜，支持键盘和触控。",
  },
  domainTemplate: {
    id: "falling-blocks",
    name: "落块消行",
    genre: "反应益智",
    pitch: "旋转和移动下落拼块，用完整横行换取生存空间。",
    coreLoop: "观察 → 旋转移动 → 落下 → 消行",
    coreRules: ["拼块持续下落", "完整横行才会消除", "堆到顶部时本局结束"],
    capabilities: ["grid-simulation", "piece-rotation", "line-clear"],
    suggestions: commonSuggestions(
      "falling-blocks",
      "下落、旋转、整行消除和触顶失败保持不变",
      "调整速度档、任务目标、砖块材质和关卡节奏。",
      "只加入垃圾行、限时任务或一种特殊目标中的一项。",
    ),
    redirectExamples: ["自由建造", "角色战斗", "资源经营"],
  },
  probeScenario: {
    actions: {
      tick: ["piece-fell"],
      "complete-row": ["full-row-detected", "row-cleared"],
      "stack-to-top": ["top-reached", "session-failed"],
    },
    completingActions: ["stack-to-top"],
  },
  runtimeDefinition: {
    actions: ["旋转拼块", "移动落点", "快速落下"],
    feedback: ["拼块已旋转", "落点已调整", "完整横行消除"],
    className: "falling",
  },
});
