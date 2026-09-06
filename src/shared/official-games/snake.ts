import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const snake = defineOfficialGame({
  id: "snake",
  title: "青玉长游",
  kind: "template",
  serverTemplate: "snake",
  lobbyRank: 10,
  cover: "assets/templates/packs/snake/cover.png",
  referenceDoc: "docs/44-snake-best-template-reference.md",
  knowledge: { patternId: "trail-survival", mechanicIds: ["trail-growth"], rationale: "连续转向配合固定资源地图；所有食物增长身体，额外效果分别是积分、转向灵活度和采集半径。超额采集保留，无限玩法吃空整批才刷新。独立机制与组合关系见改造文档。" },
  seed: {
    artStyle: "jade",
    visualStyle: "cute",
    idea: "做一个青玉庭园自由转向采集游戏，首关至少两分钟，后续三到五分钟的分段巡游，四类食物各有作用，并提供无目标的无限玩法。",
  },
  domainTemplate: {
    id: "snake",
    name: "蜿蜒收集",
    genre: "生存反应",
    pitch: "持续前进并规划转向，用不断增长的身体制造压力。",
    coreLoop: "自由转向 → 选择食物 → 管理身体与吸取增益 → 完成分段采集或无限巡游",
    coreRules: ["角色持续移动，连续转弯而非立即反向", "每段至少巡游三十秒并扣除采集配额，超额保留，全局至少两类", "每枚食物增长一节，金果加分，青叶灵活转向，露珠扩大吸取范围", "关卡开局铺满后不补充，无限玩法整批吃完后刷新，没有胜利终点"],
    capabilities: ["continuous-movement", "body-trail", "pickup"],
    suggestions: commonSuggestions(
      "snake",
      "持续移动、转向限制、增长和自撞失败保持不变",
      "替换生物、食物、场型、速度曲线和阶段目标。",
      "保持单一转向操作，通过食物取舍与场型增加玩法。",
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
