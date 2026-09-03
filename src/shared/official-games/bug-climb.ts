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
      "键盘、触控按钮与四向滑动输入均可完成一局。",
      "gpt-image-2 生成的瓢虫、树皮、露珠、树脂等位图与溯源记录已随产物归档。",
      "浏览器质量报告（桌面与手机）随产物保留。",
      "稳定玩家网址和不可变版本网址已生成。",
    ],
  },
  domainTemplate: {
    id: "lane-climb",
    name: "多道攀爬",
    genre: "反应闪避",
    pitch: "角色在几条固定道之间切换，躲开障碍、收集奖励并冲向终点。",
    coreLoop: "换道 → 躲避 → 收集 → 冲向终点",
    coreRules: ["角色只在固定几条道之间切换", "每个生成批次至少保留一条安全通路", "收集物提供分数与加速", "抵达终点或耗尽生命结束"],
    capabilities: ["lane-dodge", "continuous-movement", "collect-escape", "checkpoint-save"],
    suggestions: commonSuggestions(
      "lane-climb",
      "固定道、换道操作、安全通路和终点结算保持不变",
      "替换角色、场景、障碍与收集物，调整道数、速度和长度。",
      "只加入一种会移动的障碍或一种收集效果。",
    ),
    redirectExamples: ["开放世界", "联机", "经营建造", "多人"],
  },
  probeScenario: {
    actions: {
      "read-lanes": ["safe-lane-visible"],
      "switch-lane": ["lane-changed", "obstacle-avoided"],
      collect: ["target-collected", "speed-tier-changed"],
      finish: ["distance-target-reached", "session-completed"],
    },
    completingActions: ["finish"],
  },
  runtimeDefinition: {
    actions: ["切换车道", "躲避障碍", "收集冲刺"],
    feedback: ["车道已切换", "安全通路保持可见", "收集物触发加速并抵达终点"],
    className: "laneclimb",
  },
});
