import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const spaceShooter = defineOfficialGame({
  id: "space-shooter",
  title: "星环突围",
  kind: "template",
  serverTemplate: "space-shooter",
  lobbyRank: 8,
  cover: "assets/templates/packs/space-shooter/cover.png",
  referenceDoc: "docs/40-space-shooter-best-template-reference.md",
  mechanicId: "projectile-combat",
  seed: {
    artStyle: "lacquer",
    visualStyle: "color-block",
    idea: "做一个俯视太空射击游戏，飞船自动开火，玩家左右规避敌机并完成目标击破数。",
  },
  domainTemplate: {
    id: "space-shooter",
    name: "波次射击",
    genre: "动作射击",
    pitch: "移动、射击并判断威胁优先级，在波次压力中存活。",
    coreLoop: "预判 → 移动射击 → 命中 → 波次结算",
    coreRules: ["玩家可移动和射击", "命中产生明确反馈", "生命与波次能够结算"],
    capabilities: ["projectile-hit", "enemy-wave", "invulnerability-window"],
    suggestions: commonSuggestions(
      "space-shooter",
      "移动、弹体、命中、波次和生命保持不变",
      "替换敌人包、弹幕节奏、Boss 主题和机体表现。",
      "只加入一种主动能力或一种敌人行为。",
    ),
    redirectExamples: ["经营基地", "开放星图", "实时多人"],
  },
  probeScenario: {
    actions: {
      "move-and-shoot": ["player-moved", "projectile-fired"],
      "hit-enemy": ["stable-hit", "hit-feedback"],
      "finish-wave": ["life-accounted", "wave-settled", "session-completed"],
    },
    completingActions: ["finish-wave"],
  },
  runtimeDefinition: {
    actions: ["移动闪避", "发射弹体", "结算波次"],
    feedback: ["已避开威胁", "命中反馈确认", "本波敌人已清除"],
    className: "shooter",
  },
});
