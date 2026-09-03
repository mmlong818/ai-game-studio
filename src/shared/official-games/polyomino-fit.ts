import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const polyominoFit = defineOfficialGame({
  id: "polyomino-fit",
  title: "软糖拼岛",
  kind: "template",
  serverTemplate: "polyomino-fit",
  lobbyRank: 7,
  cover: "assets/templates/packs/polyomino-fit/cover.png",
  referenceDoc: "docs/48-polyomino-fit-best-template-reference.md",
  mechanicId: "drag-snap",
  seed: {
    artStyle: "botanical",
    visualStyle: "cute",
    idea: "做一个软萌软糖岛屿拼块游戏，旋转并安放不同拼块，完整填满目标轮廓。",
  },
  domainTemplate: {
    id: "polyomino",
    name: "轮廓拼块",
    genre: "空间拼合",
    pitch: "旋转多格拼块，在没有重叠的前提下覆盖目标轮廓。",
    coreLoop: "观察 → 旋转 → 试放 → 覆盖",
    coreRules: ["拼块可以旋转", "放置不能重叠", "必须覆盖目标轮廓"],
    capabilities: ["piece-rotation", "shape-fit", "coverage-check"],
    suggestions: commonSuggestions(
      "polyomino",
      "旋转、合法放置、无重叠和覆盖目标保持不变",
      "替换轮廓主题、拼块包、提示和评价目标。",
      "只加入限时挑战或固定块。",
    ),
    redirectExamples: ["自由绘制", "物理堆叠", "战斗"],
  },
  probeScenario: {
    actions: {
      "rotate-piece": ["piece-rotated"],
      "invalid-overlap": ["overlap-blocked"],
      "cover-outline": ["outline-covered", "session-completed"],
    },
    rejectedActions: ["invalid-overlap"],
    completingActions: ["cover-outline"],
  },
  runtimeDefinition: {
    actions: ["旋转拼块", "试放轮廓", "完成覆盖"],
    feedback: ["拼块已旋转", "合法位置已锁定", "目标轮廓完全覆盖"],
    className: "polyomino",
  },
});
