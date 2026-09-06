import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

export const puzzle = defineOfficialGame({
  id: "puzzle",
  title: "植光拼图",
  kind: "template",
  serverTemplate: "puzzle",
  lobbyRank: 2,
  lobbyCover: "assets/library/covers/puzzle-v1.webp",
  cover: "assets/templates/packs/puzzle/cover.png",
  referenceDoc: "docs/46-puzzle-best-template-reference.md",
  knowledge: { patternId: "drag-assembly-puzzle", mechanicIds: ["drag-snap-assembly"], rationale: "拖拽吸附与邻块成组是核心；按区域组织工作台、轮廓到纹理的课程和分级线索帮助玩家形成自己的拼合策略，不增加强制操作。" },
  seed: {
    artStyle: "botanical",
    visualStyle: "fashion",
    idea: "做一个植物标本室风格的经典拖拽拼图，玩家可以上传横图、竖图或方图，拼块开局排在画板外围，完成后播放庆祝声。",
  },
  domainTemplate: {
    id: "picture-puzzle",
    name: "图片拼图",
    genre: "空间拼合",
    pitch: "从四角到画面区域，先接小组再还原整幅图；自由整理与分级线索让拼合更从容。",
    coreLoop: "观察轮廓 → 组织区域 → 连接小组 → 整组归位 → 收藏成图",
    coreRules: ["拼块来源固定", "正确位置会吸附", "全部归位才完成"],
    capabilities: ["drag-snap", "spatial-validation", "progress-save"],
    suggestions: commonSuggestions(
      "picture-puzzle",
      "拖放、正确吸附和全部完成保持不变",
      "调整拼块数量、参考图强度、旋转和图片主题。",
      "只加入限时挑战或分区整理中的一项。",
    ),
    redirectExamples: ["物理战斗", "开放探索", "自由绘画"],
  },
  probeScenario: {
    actions: {
      "inspect-pieces": ["piece-source-stable"],
      "drop-correct": ["piece-snapped"],
      "place-all": ["all-pieces-placed", "session-completed"],
    },
    completingActions: ["place-all"],
  },
  runtimeDefinition: {
    actions: ["选择拼块", "拖到轮廓", "完成拼图"],
    feedback: ["拼块已拿起", "正确位置已吸附", "完整画面已还原"],
    className: "puzzle",
  },
});
