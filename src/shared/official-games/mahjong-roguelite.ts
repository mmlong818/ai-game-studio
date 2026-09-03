import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const mahjongRoguelite = defineOfficialGame({
  id: "mahjong-roguelite",
  title: "月港雀旅",
  kind: "template",
  serverTemplate: "mahjong-roguelite",
  lobbyRank: 3,
  cover: "assets/templates/packs/mahjong-roguelite/cover.png",
  referenceDoc: "docs/36-mahjong-hierarchy-reference.md",
  mechanicId: "route-choice",
  seed: {
    artStyle: "playful",
    visualStyle: "cute",
    idea: "做一个软萌月港风格的肉鸽麻将接龙，配对两张自由牌清空层叠牌阵，并在航段之间选择遗物。",
  },
  domainTemplate: {
    id: "tile-roguelite",
    name: "牌阵旅程",
    genre: "消除构筑",
    pitch: "在可解牌阵和路线选择之间积累协同，完成一次短旅程。",
    coreLoop: "配对消除 → 路线选择 → 获得遗物 → 继续挑战",
    coreRules: ["只有自由牌可以配对", "牌阵必须可解", "路线和遗物会影响本局"],
    capabilities: ["free-tile", "seeded-layout", "route-choice", "relic-synergy"],
    suggestions: commonSuggestions(
      "tile-roguelite",
      "自由牌、成对消除、牌阵可解和路线遗物保持不变",
      "替换牌面世界观、路线事件、遗物和关卡结构。",
      "只加入一类事件或一组遗物协同。",
    ),
    redirectExamples: ["传统麻将对局", "实时战斗", "开放经营"],
  },
  // 牌阵旅程有专属状态探针（TileRogueliteProbe），probeScenario 只作为文档化的动作/事件合同。
  probeKind: "tile-roguelite",
  probeScenario: {
    actions: {
      "match-free-pair": ["free-pair-removed"],
      "match-blocked-pair": [],
      "choose-risk-route": ["route-choice-applied"],
      "take-relic": ["relic-synergy-applied"],
      "save-checkpoint": ["checkpoint-saved"],
      finish: ["run-completed"],
    },
    rejectedActions: ["match-blocked-pair"],
    completingActions: ["finish"],
  },
  runtimeDefinition: {
    actions: ["配对自由牌", "选择路线", "获取遗物"],
    feedback: ["自由牌已消除", "风险路线已生效", "遗物协同加入本局"],
    className: "tiles",
  },
});
