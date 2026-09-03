import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const paperPopup = defineOfficialGame({
  id: "paper-popup",
  title: "纸境 · 立体书迷宫",
  kind: "three",
  threeMode: "popup",
  lobbyRank: 15,
  cover: "assets/starter/paper-popup/cover.png",
  referenceDoc: "docs/54-paper-popup-3d-best-template-reference.md",
  mechanicId: "spatial-puzzle-3d",
  seed: {
    artStyle: "garden",
    visualStyle: "calm",
    idea: "立体书风格的 3D 旋转迷宫示范游戏：每一页都是一本翻开的纸艺立体书，玩家把整本书按 90 度转动，折起的桥和台阶才会接上，藏在纸洞后的折纸星才会露出来；点击地面行走、一个跳跃键越过一格空隙，经过检查点旗抵达出口门通关，20 关分晨光草甸、海岸灯塔、灯笼夜市、雪原天文台四章。",
  },
  domainTemplate: {
    id: "popup-rotate-3d",
    name: "立体书旋转迷宫",
    genre: "3D 空间谜题",
    pitch: "把整本立体书按 90 度转动，桥和台阶只在特定角度接上，走到出口门并寻找隐藏的折纸星。",
    coreLoop: "观察 → 转书 → 行走跳跃 → 抵达出口",
    // 必须与 src/domain/probe.ts 的 PAPER_POPUP_RULE_LABELS 完全一致：探针按这些标签判定规则。
    coreRules: ["整本书按 90° 转动", "桥与台阶只在特定角度接上", "隐藏星只在非默认角度可见", "跳空或被障碍碰到回到检查点", "抵达出口门通关"],
    capabilities: ["3d-rotation", "grid-reachability", "angle-gated-links", "checkpoint-save", "camera", "fixed-camera"],
    suggestions: commonSuggestions(
      "popup-rotate-3d",
      "90 度转动、角度门控、检查点和出口结算保持不变",
      "替换章节主题、纸艺装饰、色板与关卡布局。",
      "只加入一种机关或一种移动障碍。",
    ),
    redirectExamples: ["自由旋转镜头", "联机", "开放世界", "多人"],
  },
  // 纸境有专属状态探针（PaperPopupProbe，直接驱动真实规则内核）；probeScenario 只作为文档化的动作/事件合同。
  probeKind: "paper-popup",
  probeScenario: {
    actions: {
      "rotate-cw": ["book-rotated"],
      "cross-folded-link": ["folded-link-blocked"],
      "move-E": ["move-blocked"],
    },
    rejectedActions: ["cross-folded-link"],
  },
  runtimeDefinition: {
    actions: ["转动整本书", "行走或跳跃", "抵达出口"],
    feedback: ["书本已按 90 度转动", "桥或台阶在此角度接上", "出口门已抵达"],
    className: "popup3d",
  },
});
