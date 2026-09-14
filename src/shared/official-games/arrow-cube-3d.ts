import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

/**
 * 箭头魔方：玩家新建通道产出的第二款官方游戏（2026-09-14 产品决定，置于大厅第二位）。
 * 交付物来自项目 6c230413-7c83-43b8-bb11-f0349d73e0de 的 100 关版本，验收记录见 fixtures/arrow-cube-3d/_studio/。
 */
export const arrowCube3d = defineOfficialGame({
  id: "arrow-cube-3d",
  title: "箭头魔方",
  kind: "fixture",
  stage: "live",
  remixable: false,
  fixtureKind: "arrow-cube-3d",
  fixture: {
    metaKey: "arrow_cube_3d_fixture_initialized",
    buildOutputs: [
      "三维轴向滑出、被挡停靠占位、全清过关、卡死判负的规则已锁定。",
      "GAME_DESIGN、GAME_DESIGN_CONTRACT、RULE_FIDELITY 与关卡难度报告随产物归档。",
      "100 关战役（4→120 块、5×5×5 以内）由关号种子逐块放置构造保证有解，附可见性与无三连同向约束。",
      "自发光纯色方块、环带贴箭、可旋转并可回正的等轴测镜头已接入，全部程序绘制。",
      "真实浏览器 6 项门禁、规则审核 13/13、探针逐关核对 100 关可解性与三连约束通过。",
      "官方仅游玩作品沿用平台发布通道，不提供用户模板或改造入口。",
    ],
  },
  lobbyRank: 2,
  cover: "fixtures/arrow-cube-3d/assets/cover.png",
  referenceDoc: "docs/109-arrow-cube-3d-best-template-reference.md",
  knowledge: {
    patternId: "choice-deduction",
    mechanicIds: ["choice-consequence"],
    rationale: "每次推出都是一次选择：读出方块箭头前方在三维空间里是否畅通、先推哪一块才不会把别的块堵死；推错会让方块停在半路成为新障碍，整局是对阻挡关系与顺序的推理。",
  },
  domainTemplate: {
    id: "arrow-cube-3d",
    name: "三维箭头滑出解谜",
    genre: "逻辑解谜",
    pitch: "点一块方块，它沿自己的箭头在三维空间里滑出立方体；把逐关变大的立方体一块块清空。",
    coreLoop: "旋转观察 → 选中方块 → 推出或被挡停靠 → 通路变化 → 清空进入下一关",
    coreRules: [
      "点击或选中方块后沿箭头逐格检查到包围盒外，全空才滑出并消失；被挡则贴着障碍停下并占住新位置",
      "全部方块滑出即过关，进入下一关；剩余方块全部无法移动即卡死判负，可重开本关",
      "100 关按关号派生种子并用逐块放置构造保证有解，方块数逐关严格递增",
      "任何直线上不得出现 3 个紧挨着的同向方块；每块在轮到被推出时至少有一个朝镜头的面可见",
    ],
    capabilities: ["deterministic-rules", "solvable", "unified-input", "local-persistence"],
    suggestions: commonSuggestions(
      "arrow-cube-3d",
      "三维射线判定、停靠占位、清空过关与确定性可解生成保持不变",
      "替换配色与 HUD 主题，或调整关卡表的包围盒与块数。",
      "只加入一种局部机制，例如某几格的单向门。",
    ),
    redirectExamples: ["实时多人对抗", "方块可以旋转或改变箭头", "带敌人与战斗的动作玩法"],
  },
  probeScenario: {
    actions: {
      inspect: ["ray-readable"],
      "fire-clear": ["block-escaped", "cells-freed"],
      "fire-blocked": ["block-stopped", "cell-occupied"],
      finish: ["board-cleared", "level-advanced"],
    },
    rejectedActions: ["fire-blocked"],
    completingActions: ["finish"],
  },
  runtimeDefinition: {
    actions: ["旋转视角读出方块箭头前方是否畅通", "选中通路畅通的方块推出", "利用腾出的格子继续清空全盘"],
    feedback: ["滑出：方块沿轴向加速飞出并消失", "被挡：方块贴着障碍停下并占位", "清空：进入下一关并显示关号与块数"],
    className: "arrowcube3d",
  },
});
