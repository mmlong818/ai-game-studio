import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const merge2048 = defineOfficialGame({
  id: "merge-2048",
  title: "数织矩阵",
  kind: "template",
  serverTemplate: "merge-2048",
  lobbyRank: 6,
  cover: "assets/templates/packs/merge-2048/cover.png",
  referenceDoc: "docs/42-merge-2048-best-template-reference.md",
  knowledge: { patternId: "sliding-merge-puzzle", mechanicIds: ["grid-slide-merge"], rationale: "全盘滑动、同值合并与空间管理组合。" },
  seed: {
    artStyle: "geometric",
    visualStyle: "fashion",
    idea: "做一个数字织造主题的 2048 游戏，提供关卡闯关与自由无尽；连续里程碑反馈不打断滑动，方向预览解释真实合并收益，整关结算展示成长。",
  },
  domainTemplate: {
    id: "merge-2048",
    name: "滑动合成",
    genre: "数字策略",
    pitch: "每次推动整个棋盘，在有限空间里规划合并顺序。",
    coreLoop: "判断 → 全盘滑动 → 合并 → 应对新块",
    coreRules: ["一次输入推动全盘", "同值方块每步只合并一次", "有效移动后生成新块"],
    capabilities: ["grid-slide", "merge-equal", "undo-limited"],
    suggestions: commonSuggestions(
      "merge-2048",
      "全盘滑动、同值一次一并和移动后生成保持不变",
      "替换数字符号、目标、棋盘规模、难度和撤销次数。",
      "只加入一种特殊格或一种任务限制。",
    ),
    redirectExamples: ["单块拖动", "战斗棋盘", "复杂经济"],
  },
  // 2048 有专属状态探针（MergeGridProbe），probeScenario 只作为文档化的动作/事件合同。
  probeKind: "merge-grid",
  probeScenario: {
    actions: {
      "slide-left": ["board-slid", "equal-merged-once", "tile-spawned-after-valid-move"],
      "slide-right": ["invalid-move-preserved-state"],
    },
    rejectedActions: ["slide-right"],
  },
  runtimeDefinition: {
    actions: ["全盘滑动", "合并同值", "应对新块"],
    feedback: ["棋盘已整体滑动", "同值方块合并一次", "有效移动后生成新块"],
    className: "merge",
  },
});
