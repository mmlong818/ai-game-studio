import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const snake = defineOfficialGame({
  id: "snake",
  title: "青玉长游",
  kind: "template",
  serverTemplate: "snake",
  lobbyRank: 9,
  cover: "assets/templates/packs/snake/cover.png",
  referenceDoc: "docs/44-snake-best-template-reference.md",
  mechanicId: "trail-survival",
  seed: {
    artStyle: "jade",
    visualStyle: "cute",
    idea: "做一个青玉花园贪吃蛇，收集 12 枚朱果获胜，支持键盘和触控。",
  },
  domainTemplate: {
    id: "snake",
    name: "蜿蜒收集",
    genre: "生存反应",
    pitch: "持续前进并规划转向，用不断增长的身体制造压力。",
    coreLoop: "转向 → 收集 → 增长 → 避免自撞",
    coreRules: ["角色持续移动", "不能立即反向", "收集后增长且自撞失败"],
    capabilities: ["continuous-movement", "body-trail", "pickup"],
    suggestions: commonSuggestions(
      "snake",
      "持续移动、转向限制、增长和自撞失败保持不变",
      "替换生物、食物、场型、速度曲线和阶段目标。",
      "只加入金色食物或一种障碍规则。",
    ),
    redirectExamples: ["射击战斗", "经营养成", "自由停走"],
  },
  probeScenario: {
    actions: {
      tick: ["continuous-step"],
      "invalid-reverse": ["reverse-blocked"],
      "eat-and-self-collide": ["food-collected", "body-grew", "self-collision", "session-failed"],
    },
    rejectedActions: ["invalid-reverse"],
    completingActions: ["eat-and-self-collide"],
  },
  runtimeDefinition: {
    actions: ["改变方向", "收集食物", "延长身体"],
    feedback: ["转向有效", "收集成功", "身体增长，空间压力上升"],
    className: "snake",
  },
});
