import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const breakout = defineOfficialGame({
  id: "breakout",
  title: "漆海碎星",
  kind: "template",
  serverTemplate: "breakout",
  lobbyRank: 12,
  cover: "assets/templates/packs/breakout/cover.png",
  referenceDoc: "docs/39-breakout-best-template-reference.md",
  mechanicId: "paddle-ball",
  seed: {
    artStyle: "lacquer",
    visualStyle: "classic",
    idea: "做一个漆艺海面风格的打砖块游戏，击碎全部矿物砖获胜，支持鼠标、键盘和触控。",
  },
  domainTemplate: {
    id: "breakout",
    name: "弹球破阵",
    genre: "街机反应",
    pitch: "移动挡板改变弹球轨迹，清除精心排列的目标。",
    coreLoop: "接球 → 改变角度 → 命中 → 清场",
    coreRules: ["挡板反弹弹球", "弹球命中目标", "清除目标后结算"],
    capabilities: ["arcade-collision", "trajectory", "level-layout"],
    suggestions: commonSuggestions(
      "breakout",
      "挡板反弹、弹球碰撞和清场目标保持不变",
      "替换砖阵、章节主题、球速和挡板手感。",
      "只加入一种特殊砖或一种主动能力。",
    ),
    redirectExamples: ["自由射击", "塔防", "平台动作"],
  },
  probeScenario: {
    actions: {
      "paddle-bounce": ["paddle-reflected-ball"],
      "hit-target": ["ball-hit-target", "hit-feedback"],
      "clear-targets": ["all-targets-cleared", "session-completed"],
    },
    completingActions: ["clear-targets"],
  },
  runtimeDefinition: {
    actions: ["移动挡板", "改变角度", "击破砖阵"],
    feedback: ["挡板跟随移动", "弹球反射角改变", "目标全部清除"],
    className: "breakout",
  },
});
