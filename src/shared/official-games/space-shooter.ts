import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const spaceShooter = defineOfficialGame({
  id: "space-shooter",
  title: "星环突围",
  kind: "template",
  serverTemplate: "space-shooter",
  lobbyRank: 9,
  cover: "assets/templates/packs/space-shooter/cover.png",
  referenceDoc: "docs/40-space-shooter-best-template-reference.md",
  knowledge: { patternId: "wave-shooter", mechanicIds: ["projectile-wave"], rationale: "移动射击、弹体命中和波次结算组合。" },
  seed: {
    artStyle: "lacquer",
    visualStyle: "color-block",
    idea: "做一个俯视太空射击游戏，飞船自动开火，玩家自由移动规避预警弹幕，连续突破三段封锁；首关至少两分钟，后续三至五分钟，关卡结算后选择下一关强化。",
  },
  domainTemplate: {
    id: "space-shooter",
    name: "波次射击",
    genre: "动作射击",
    pitch: "移动、射击并判断威胁优先级，在波次压力中存活。",
    coreLoop: "预判 → 连续移动射击 → 突破三段封锁 → 成果结算 → 选择下一关强化",
    coreRules: ["主炮自动射击，移动与脉冲控制保持简单", "炮台与 Boss 锁定方向后蓄力预警", "局中不插入升级选择，结算后三选一：主炮、护盾或满充脉冲，下一关及其重试有效", "首关至少120秒、后续180–300秒有效作战，教学与暂停不计时；存活敌机清理可延长", "生命与无伤阶段按本关结算；重复通关不能叠加强化"],
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
