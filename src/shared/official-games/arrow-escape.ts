import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

/**
 * 箭头逃脱：玩家新建通道产出的第一款官方游戏（2026-09-14 产品决定，置于大厅第一位）。
 * 交付物来自项目 98d0a327-d3ca-4fed-a027-ab320f6b99f1，验收记录见 fixtures/arrow-escape/_studio/。
 */
export const arrowEscape = defineOfficialGame({
  id: "arrow-escape",
  title: "箭头逃脱",
  kind: "fixture",
  stage: "live",
  remixable: false,
  fixtureKind: "arrow-escape",
  fixture: {
    metaKey: "arrow_escape_fixture_initialized",
    buildOutputs: [
      "射线判定、阻挡扣心（同一箭头连点不重复扣）、4 心与倒计时中断、清空即过关的规则已锁定。",
      "GAME_DESIGN、GAME_DESIGN_CONTRACT、RULE_FIDELITY 与关卡难度报告随产物归档。",
      "确定性种子生成器、20 关关卡表、沿自身折线滑出的射出动画与缩放平移已接入。",
      "抽象细线箭头、点阵棋盘、Web Audio 音阶与震动反馈已经集成。",
      "真实浏览器 6 项门禁、规则审核 8/8、20 关剥离可解性探针与真实点击自动通关通过。",
      "官方仅游玩作品沿用平台发布通道，不提供用户模板或改造入口。",
    ],
  },
  lobbyRank: 1,
  cover: "fixtures/arrow-escape/assets/cover.png",
  referenceDoc: "docs/108-arrow-escape-best-template-reference.md",
  knowledge: {
    patternId: "choice-deduction",
    mechanicIds: ["choice-consequence"],
    rationale: "每次点击都是一次选择：读出箭头前方通道是否畅通、先放哪一条才能为别的箭头腾出路，选错立即扣心；整局是对阻挡关系的推理与顺序规划，没有随机性，属于选择与后果驱动的推理解谜。",
  },
  domainTemplate: {
    id: "arrow-escape",
    name: "箭头滑出解谜",
    genre: "逻辑解谜",
    pitch: "点一支箭头，前方通道畅通它就沿自己的折线滑出棋盘；把满盘互相阻挡的箭头一支支清空。",
    coreLoop: "读通道 → 点击箭头 → 滑出或被挡 → 新通路出现 → 清空全盘",
    coreRules: [
      "点击箭头时沿其朝向逐格检查到棋盘边缘，全空才滑出并清空所占格子",
      "被挡的箭头原地不动、变深色并扣 1 颗心；同一支箭头连续被挡不重复扣心",
      "全部箭头离场即过关；4 颗心扣光或第 2 关起倒计时归零即中断，可从开局快照重试",
      "每关盘面由固定种子生成并经剥离验证可解，时限 = 向上取整到 5 的倍数(max(4×箭头数, 120)) 秒",
    ],
    capabilities: ["deterministic-rules", "solvable", "unified-input", "local-persistence"],
    suggestions: commonSuggestions(
      "arrow-escape",
      "射线判定、阻挡扣心、清空过关与确定性可解生成保持不变",
      "替换配色、点阵与 HUD 的主题表现，或调整前 20 关的尺寸表。",
      "只加入一种局部机制，例如某几格的单向门。",
    ),
    redirectExamples: ["实时多人对抗", "箭头可以移动或旋转", "带敌人与战斗的动作玩法"],
  },
  probeScenario: {
    actions: {
      inspect: ["ray-readable"],
      "fire-clear": ["arrow-escaped", "cells-freed"],
      "fire-blocked": ["arrow-blocked", "heart-lost"],
      finish: ["board-cleared", "session-completed"],
    },
    rejectedActions: ["fire-blocked"],
    completingActions: ["finish"],
  },
  runtimeDefinition: {
    actions: ["读出箭头前方通道是否全空", "点击通道畅通的箭头让它滑出", "利用腾出的格子继续清空全盘"],
    feedback: ["滑出：整条箭头沿自身折线过弯飞出并播放上行音阶", "被挡：箭头红闪变深色、扣 1 颗心并震动", "清空：连胜 +1、彩纸与过关浮层"],
    className: "arrowescape",
  },
});
