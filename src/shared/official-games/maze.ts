import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const maze = defineOfficialGame({
  id: "maze",
  title: "苔径迷庭",
  kind: "template",
  serverTemplate: "maze",
  lobbyRank: 10,
  cover: "assets/templates/packs/maze/cover.png",
  referenceDoc: "docs/45-maze-best-template-reference.md",
  mechanicId: "grid-path",
  seed: {
    artStyle: "garden",
    visualStyle: "calm",
    idea: "做一个苔石庭院迷宫，每局自动生成路线，从左上走到右下的金色灯火。",
  },
  domainTemplate: {
    id: "maze",
    name: "迷宫探索",
    genre: "路径解谜",
    pitch: "理解空间和阻挡规则，从入口找到可达出口。",
    coreLoop: "探索 → 记忆 → 绕路 → 抵达",
    coreRules: ["墙体不可穿越", "入口与出口连通", "抵达出口后完成"],
    capabilities: ["grid-path", "reachability", "fog-of-war"],
    suggestions: commonSuggestions(
      "maze",
      "连通路径、墙体阻挡和抵达出口保持不变",
      "替换地图包、迷雾强度、检查点和世界观。",
      "只加入钥匙门、冰面或一种地形规则。",
    ),
    redirectExamples: ["开放世界", "生存建造", "多人竞速"],
  },
  probeScenario: {
    actions: {
      "invalid-cross-wall": ["wall-blocked"],
      "inspect-route": ["entry-exit-connected"],
      "follow-route-exit": ["exit-reached", "session-completed"],
    },
    rejectedActions: ["invalid-cross-wall"],
    completingActions: ["follow-route-exit"],
  },
  runtimeDefinition: {
    actions: ["探索岔路", "绕开墙体", "抵达出口"],
    feedback: ["已记录新路线", "墙体阻挡有效", "成功走出迷宫"],
    className: "maze",
  },
});
