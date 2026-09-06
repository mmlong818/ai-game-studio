import type { GameDesignContractV1 } from "./index.js";

const assistance: GameDesignContractV1["assistance"] = {
  hiddenAdaptation: false,
  steps: [
    { afterFailures: 1, action: "explain-cause", message: "说明本次失败的直接原因和可改变的动作。", explicitToPlayer: true },
    { afterFailures: 2, action: "highlight-rule", message: "突出与失败原因对应的规则或危险。", explicitToPlayer: true },
    { afterFailures: 4, action: "directional-hint", message: "提供一个方向性建议，不自动完成操作。", explicitToPlayer: true },
  ],
};

export const merge2048DesignSample: GameDesignContractV1 = {
  schemaVersion: "game-design-contract-v1", id: "DESIGN-MERGE-2048", projectId: "merge-2048",
  knowledge: { libraryVersion: "game-design-knowledge-v1", integrationStatus: "matched", patternIds: ["sliding-merge-puzzle"], capabilityIds: ["game-lifecycle", "onboarding", "difficulty-plan", "failure-assistance"], mechanicIds: ["grid-slide-merge"], researchTaskIds: [], evidenceUrls: ["https://github.com/mmlong818/ai-game-studio"] },
  playerPromise: "用一次全盘滑动制造连锁合并，在棋盘被填满前达到目标数字。",
  audience: { experience: "first-time", accessibilityNeeds: ["键盘与触控等价", "不只依赖颜色区分数字"] },
  session: { targetMinutes: 4, restartSeconds: 2, firstMeaningfulChoiceSeconds: 8 },
  loops: { instant: "观察可合并方向并滑动", tactical: "保留大数角落与空格", session: "达到目标数字或棋盘无可用移动", longTerm: "提高目标并减少撤销依赖" },
  mechanics: [
    { id: "MECHANIC-SLIDE", label: "全盘滑动", ruleIds: ["RULE-SLIDE"], core: true, learningStages: ["introduce", "practice", "vary", "combine"], onboardingExemption: null },
    { id: "MECHANIC-MERGE", label: "同值每步只合并一次", ruleIds: ["RULE-MERGE"], core: true, learningStages: ["introduce", "practice", "vary", "combine", "master"], onboardingExemption: null },
  ],
  onboarding: [
    { id: "ONBOARD-SLIDE", teachesMechanicId: "MECHANIC-SLIDE", trigger: "首次进入空闲棋盘", presentation: ["short-text", "gesture"], safeState: "只放置两个可合并方块且不生成干扰块", requiredAction: "向唯一有效方向滑动", successSignal: "board-slid", dismissal: { automatic: true, replayable: true, skippable: true }, deviceVariants: { keyboard: "按方向键滑动", touch: "在棋盘上向提示方向滑动" } },
    { id: "ONBOARD-MERGE", teachesMechanicId: "MECHANIC-MERGE", trigger: "首次滑动完成", presentation: ["highlight", "short-text"], safeState: "保持合并目标清晰且不计失败", requiredAction: "让两个同值方块相撞合并", successSignal: "equal-merged-once", dismissal: { automatic: true, replayable: true, skippable: true }, deviceVariants: { keyboard: "再次按提示方向键", touch: "再次向提示方向滑动" } },
  ],
  content: { mode: "endless", beats: [
    { id: "BEAT-SAFE", label: "安全理解", pressure: "safe", introducesMechanicIds: ["MECHANIC-SLIDE", "MECHANIC-MERGE"], practicesMechanicIds: [], difficulty: { cognition: 0, operation: 0, space: 0, resources: 0, combination: 0, punishment: 0 }, changeReason: "先证明玩家会滑动和合并", expectedSeconds: 30 },
    { id: "BEAT-PLAN", label: "空间规划", pressure: "normal", introducesMechanicIds: [], practicesMechanicIds: ["MECHANIC-SLIDE", "MECHANIC-MERGE"], difficulty: { cognition: 1, operation: 0, space: 1, resources: 0, combination: 1, punishment: 0 }, changeReason: "增加方块数量，要求保留空位", expectedSeconds: 120 },
    { id: "BEAT-MASTERY", label: "合并掌握", pressure: "high", introducesMechanicIds: [], practicesMechanicIds: ["MECHANIC-MERGE"], difficulty: { cognition: 2, operation: 0, space: 2, resources: 1, combination: 2, punishment: 1 }, changeReason: "后段压缩空间但保留撤销", expectedSeconds: 120 },
  ] },
  assistance,
  acceptance: [
    { id: "ACCEPT-ONBOARD", label: "新存档真实完成滑动与合并教学", kind: "onboarding", mechanicIds: ["MECHANIC-SLIDE", "MECHANIC-MERGE"], onboardingStepIds: ["ONBOARD-SLIDE", "ONBOARD-MERGE"], beatIds: ["BEAT-SAFE"] },
    { id: "ACCEPT-PROGRESS", label: "从安全理解进入空间规划", kind: "progression", mechanicIds: ["MECHANIC-MERGE"], onboardingStepIds: [], beatIds: ["BEAT-SAFE", "BEAT-PLAN"] },
    { id: "ACCEPT-HELP", label: "连续失败得到对应原因和提示", kind: "assistance", mechanicIds: [], onboardingStepIds: [], beatIds: [] },
    { id: "ACCEPT-VARIATION", label: "阶段包含结构和决策变化", kind: "content-variation", mechanicIds: ["MECHANIC-SLIDE"], onboardingStepIds: [], beatIds: ["BEAT-PLAN", "BEAT-MASTERY"] },
  ],
};
