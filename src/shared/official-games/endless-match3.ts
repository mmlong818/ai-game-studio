import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

/**
 * 无限三消：从正常 AI 创作链路验收通过后晋升的无限三消官方仅游玩作品。
 * 来源项目与不可变版本记录在 fixtures/endless-match3/game-manifest.json。
 */
export const endlessMatch3 = defineOfficialGame({
  id: "endless-match3",
  title: "无限三消",
  kind: "fixture",
  stage: "live",
  remixable: false,
  fixtureKind: "endless-match3",
  fixture: {
    metaKey: "endless_match3_fixture_initialized",
    buildOutputs: [
      "无限三消、相邻交换、三连消除、下落补齐、连锁与无解自动洗牌规则已锁定。",
      "来源项目、验收版本、设计合同、规则审核与真实浏览器报告随固定产物归档。",
      "全部游戏画面由 Canvas 与 CSS 程序绘制，本轮没有调用图像模型生成局内素材。",
      "拖动、点选、键盘操作、得分、重新开始和移动端 9:16 布局均已接入。",
      "真实浏览器验收覆盖正常交换、消除、下落补齐、重开后再操作及禁止胜负状态。",
      "官方仅游玩作品沿用平台固定发布通道，不提供用户模板或改造入口。",
    ],
  },
  lobbyRank: 18,
  cover: "fixtures/endless-match3/assets/cover.png",
  referenceDoc: "docs/111-endless-match3-official-promotion.md",
  knowledge: {
    patternId: "match-progression",
    mechanicIds: ["match-combo"],
    rationale: "复用匹配与连锁的稳定机制；本作按确认合同移除关卡成长，只保留可无限重复的交换、消除、下落与自动洗牌循环。",
  },
  domainTemplate: {
    id: "endless-match3",
    name: "无限三消",
    genre: "休闲消除",
    pitch: "交换相邻色块形成三连，观察下落与连锁持续累积分数，无解时自动洗牌。",
    coreLoop: "找可消交换 → 交换相邻方块 → 三连消除 → 下落补齐与连锁 → 继续累积分数",
    coreRules: [
      "只能拖动或点选交换相邻方块，没有形成三连的交换会回位",
      "横向或纵向三个及以上相同方块会消除并计分，上方方块下落并补齐",
      "下落后再次成组三连会继续连锁；棋盘没有可消交换时自动洗牌",
      "游戏没有通关、失败、倒计时、生命、等级或关卡，可随时重新开始",
    ],
    capabilities: ["match3-board", "swap-match", "combo-scoring", "unified-input"],
    suggestions: commonSuggestions(
      "endless-match3",
      "相邻交换、三连消除、下落补齐、连锁、自动洗牌与无限局制保持不变",
      "只调整棋盘尺寸、方块种类或计分节奏，不加入关卡与输赢。",
      "只加入一种不打断无限循环的局内变化。",
    ),
    redirectExamples: ["带生命和倒计时的闯关", "回合制三消对战", "局外升级养成"],
  },
  probeScenario: {
    actions: {
      inspect: ["legal-swap-visible"],
      swap: ["adjacent-pieces-swapped", "match-cleared", "score-increased"],
      settle: ["pieces-fell", "board-refilled", "cascade-resolved"],
      restart: ["score-reset", "board-regenerated"],
    },
  },
  runtimeDefinition: {
    actions: ["找出能形成三连的相邻交换", "拖动或点选交换方块", "观察下落连锁后继续选择"],
    feedback: ["合法交换进入消除，非法交换回位", "消除数量、得分与连锁即时更新", "无解棋盘自动洗牌并返回可操作状态"],
    className: "endlessmatch3",
  },
});
