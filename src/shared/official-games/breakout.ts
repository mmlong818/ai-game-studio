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
  knowledge: { patternId: "ricochet-breakout", mechanicIds: ["paddle-trajectory"], rationale: "挡板位置改变反弹轨迹；落点与同源回球预告让控角可读，少量剩余砖时自动提供收尾导航。五章按控角、潮盾、宽板、穿透和组合顺序学习，不增加操作按钮。" },
  seed: {
    artStyle: "lacquer",
    visualStyle: "classic",
    idea: "做一个漆艺海面风格的打砖块游戏，击碎全部矿物砖获胜，支持鼠标、键盘和触控。",
  },
  domainTemplate: {
    id: "breakout",
    name: "弹球破阵",
    genre: "街机反应",
    pitch: "沿着回球预告轻松控角，借潮盾、宽板和穿透逐章击破砖阵。",
    coreLoop: "接球 → 改变角度 → 命中 → 清场",
    coreRules: ["挡板左右击球位置决定反弹方向，预告与碰撞共用规则", "五章逐步学习控角、潮盾、宽板、穿透与能力组合", "只剩三块时提供收尾导航，不自动代打", "清除目标后结算，记录成功回球与控角命中"],
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
