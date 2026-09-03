import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

/**
 * 虫虫攀枝：官方原创。最初经平台实验通道生成并迭代到 v13（2026-08-31 → 09-01），
 * 2026-09-03 由官方把 v13 的不可变构建产物固化为固定游戏进入仓库，与其他官方游戏同等对待。
 */
export const bugClimb = defineOfficialGame({
  id: "bug-climb",
  title: "虫虫攀枝",
  kind: "fixture",
  fixtureKind: "bug-climb",
  lobbyRank: 15,
  cover: "fixtures/bug-climb/assets/cover.png",
  referenceDoc: "docs/56-bug-climb-best-template-reference.md",
  mechanicId: "lane-dodge",
  fixture: {
    metaKey: "bug_climb_fixture_initialized",
    buildOutputs: [
      "三条树纹路线、正交顶视图与固定镜头已锁定。",
      "树瘤、琥珀树脂、露珠与金色种子的碰撞与收集规则已落实。",
      "左右换树纹、有限上下走位，以及键盘、触控按钮和四向滑动输入均已落实。",
      "gpt-image-2 生成的瓢虫、树皮、露珠、树脂等位图与溯源记录已随产物归档。",
      "树瘤与树脂直接绘制在树干上，消失、撞碎和惊险躲过均不触发画面震动。",
      "稳定玩家网址和不可变版本网址已生成。",
    ],
  },
  domainTemplate: {
    id: "lane-climb",
    name: "多道攀爬",
    genre: "反应闪避",
    pitch: "角色在几条固定道之间切换并小幅上下走位，躲开障碍、积蓄冲刺并抵达终点。",
    coreLoop: "判断安全道 → 换道或上下走位 → 收集露珠 → 冲刺破障",
    coreRules: ["角色横向只在固定道之间切换，并可在有限范围内上下移动", "每个生成批次至少保留一条安全通路", "露珠补充冲刺能量，金色种子提供分数", "冲刺可撞碎树脂，抵达终点、体力耗尽或倒计时结束时结算"],
    capabilities: ["lane-dodge", "continuous-movement", "collect-escape", "checkpoint-save"],
    suggestions: commonSuggestions(
      "lane-climb",
      "固定道、有限上下走位、安全通路、冲刺破障和终点结算保持不变",
      "替换角色、场景、障碍与收集物，调整道数、速度、时限和阶段长度。",
      "只加入一种会移动的障碍或一种收集效果。",
    ),
    redirectExamples: ["开放世界", "联机", "经营建造", "多人"],
  },
  probeScenario: {
    actions: {
      "read-lanes": ["safe-lane-visible"],
      "move-around-obstacle": ["lane-changed", "vertical-position-changed", "obstacle-avoided"],
      "collect-dew": ["target-collected", "boost-energy-increased"],
      "boost-through-resin": ["speed-tier-changed", "resin-destroyed"],
      finish: ["distance-target-reached", "session-completed"],
    },
    completingActions: ["finish"],
  },
  runtimeDefinition: {
    actions: ["换树纹并上下走位", "吸收露珠积蓄能量", "冲刺破坏树脂并抵达终点"],
    feedback: ["安全路线和位置变化清晰", "露珠转为冲刺能量", "树脂破碎并完成阶段结算"],
    className: "laneclimb",
  },
});
