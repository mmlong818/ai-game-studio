import { gameDesignContractV1Schema } from "../game-design-contract/index.js";
import { generateAssetRequirements } from "../resource-requirements/index.js";
import { POCKET_WORKSHOP_ASSISTANCE, POCKET_WORKSHOP_LEVELS, POCKET_WORKSHOP_ONBOARDING } from "./pocket-workshop-golden.js";

const mechanicIds = ["finite-container-placement", "orthogonal-synergy", "deterministic-auto-resolution"];
export const POCKET_WORKSHOP_RESEARCH_TASK_ID = "RESEARCH-42B0FC13";

export const POCKET_WORKSHOP_DESIGN_CONTRACT = gameDesignContractV1Schema.parse({
  schemaVersion: "game-design-contract-v1",
  id: "golden-contract:pocket-workshop-v1",
  projectId: "golden:pocket-workshop",
  knowledge: {
    libraryVersion: "game-design-knowledge-v1",
    integrationStatus: "prototype-required",
    patternIds: ["container-synergy-planning"],
    capabilityIds: ["game-lifecycle", "unified-input", "score-system", "level-progression", "onboarding", "difficulty-plan", "failure-assistance", "sensory-feedback", "local-persistence", "accessible-presentation"],
    mechanicIds,
    researchTaskIds: [POCKET_WORKSHOP_RESEARCH_TASK_ID],
    evidenceUrls: ["https://playwithfurcifer.itch.io/backpack-battles", "https://playwithfurcifer.github.io/backpack-battles-presskit/", "https://play.google.com/store/apps/details?id=com.playwithfurcifer.bpb.android"],
  },
  playerPromise: "在掌心大小的维修盒中摆好零件，让邻接回路一次点亮。",
  audience: { experience: "first-time", accessibilityNeeds: ["触控目标至少 44px", "协同不能只靠颜色表示", "结算逐条解释得分来源"] },
  session: { targetMinutes: 8, restartSeconds: 3, firstMeaningfulChoiceSeconds: 20 },
  loops: {
    instant: "选择零件，旋转并放入有限格位，立即预览相邻协同。",
    tactical: "在空间占用和高价值邻接之间取舍，撤销或移动后再试机。",
    session: "完成四关一章的单维递进，并在章末证明组合掌握。",
  },
  mechanics: [
    { id: mechanicIds[0], label: "有限容器摆放", ruleIds: ["placement-inside-grid", "no-overlap", "blocked-cell"], core: true, learningStages: ["introduce", "practice", "vary"], onboardingExemption: null },
    { id: mechanicIds[1], label: "正交邻接协同", ruleIds: ["orthogonal-only", "pair-counted-once", "visible-preview"], core: true, learningStages: ["introduce", "practice", "combine"], onboardingExemption: null },
    { id: mechanicIds[2], label: "确定性自动结算", ruleIds: ["all-parts-required", "fixed-pair-values", "resolution-breakdown"], core: true, learningStages: ["introduce", "practice", "master"], onboardingExemption: null },
  ],
  onboarding: POCKET_WORKSHOP_ONBOARDING.map((step, index) => ({
    id: step.id, teachesMechanicId: mechanicIds[Math.min(index, mechanicIds.length - 1)]!, trigger: index === 0 ? "首次进入第一关" : `完成教学步骤 ${index}`,
    presentation: index === 0 ? ["short-text", "highlight"] : ["short-text", "highlight", "gesture"], safeState: "无倒计时、无资源损失，可撤销且试机失败不会消耗关卡机会", requiredAction: step.instruction, successSignal: step.requiredSignal,
    dismissal: { automatic: true, replayable: true, skippable: true }, deviceVariants: { keyboard: "方向键移动焦点，空格选择或放置，R 旋转", pointer: "点击零件，再点击格位；右键或旋转按钮旋转", touch: "点击至少 44px 的零件与格位，用独立旋转按钮操作" },
  })),
  content: { mode: "chapter-based", beats: [
    { id: "chapter-1", label: "点亮核心（1—4）", pressure: "safe", introducesMechanicIds: mechanicIds, practicesMechanicIds: [], difficulty: POCKET_WORKSHOP_LEVELS[0]!.difficulty, changeReason: "只教学三个零件和最高价值邻接，不引入形状或损坏格。", expectedSeconds: 240 },
    { id: "chapter-2", label: "读懂协同（5—8）", pressure: "normal", introducesMechanicIds: [], practicesMechanicIds: mechanicIds, difficulty: POCKET_WORKSHOP_LEVELS[4]!.difficulty, changeReason: "只增加一种零件和一条协同关系。", expectedSeconds: 300 },
    { id: "chapter-3", label: "容纳形状（9—12）", pressure: "normal", introducesMechanicIds: [], practicesMechanicIds: mechanicIds, difficulty: POCKET_WORKSHOP_LEVELS[8]!.difficulty, changeReason: "保持得分规则不变，只加入双格形状与旋转。", expectedSeconds: 360 },
    { id: "chapter-4", label: "绕开损坏格（13—16）", pressure: "high", introducesMechanicIds: [], practicesMechanicIds: mechanicIds, difficulty: POCKET_WORKSHOP_LEVELS[12]!.difficulty, changeReason: "加入固定损坏格，先给缓冲关再完成六件组合。", expectedSeconds: 420 },
    { id: "chapter-5", label: "完成整机（17—20）", pressure: "high", introducesMechanicIds: [], practicesMechanicIds: mechanicIds, difficulty: POCKET_WORKSHOP_LEVELS[16]!.difficulty, changeReason: "不增加新规则，只组合七件零件、形状与空间限制。", expectedSeconds: 480 },
  ] },
  assistance: { hiddenAdaptation: false, steps: POCKET_WORKSHOP_ASSISTANCE.map(({ afterFailures, action, message }) => ({ afterFailures, action, message, explicitToPlayer: true })) },
  acceptance: [
    { id: "accept-first-action", label: "首次玩家在安全状态完成选择与合法放置", kind: "onboarding", mechanicIds: [mechanicIds[0]], onboardingStepIds: ["inspect-part", "place-battery"], beatIds: ["chapter-1"] },
    { id: "accept-synergy", label: "每条邻接协同可预览且只结算一次", kind: "rule", mechanicIds: [mechanicIds[1]], onboardingStepIds: ["place-battery"], beatIds: ["chapter-1", "chapter-5"] },
    { id: "accept-resolution", label: "同一布局重复试机得到相同逐条结算", kind: "solvability", mechanicIds: [mechanicIds[2]], onboardingStepIds: ["resolve-machine"], beatIds: ["chapter-1", "chapter-5"] },
    { id: "accept-progression", label: "二十关每四关一章且按单一主维度递进", kind: "progression", mechanicIds, onboardingStepIds: [], beatIds: ["chapter-1", "chapter-2", "chapter-3", "chapter-4", "chapter-5"] },
    { id: "accept-assistance", label: "连续失败依次解释、高亮关系和展示一个位置", kind: "assistance", mechanicIds, onboardingStepIds: [], beatIds: ["chapter-1", "chapter-5"] },
    { id: "accept-variation", label: "双格形状、损坏格与七件整机依次引入且不改变既有规则含义", kind: "content-variation", mechanicIds, onboardingStepIds: [], beatIds: ["chapter-3", "chapter-4", "chapter-5"] },
    { id: "accept-mobile", label: "390px 触控视口无横向溢出且目标不小于 44px", kind: "viewport", mechanicIds, onboardingStepIds: [], beatIds: ["chapter-1", "chapter-5"] },
    { id: "accept-assets", label: "零件、协同、损坏格、教学与结算反馈均使用已批准资源", kind: "asset", mechanicIds, onboardingStepIds: POCKET_WORKSHOP_ONBOARDING.map(({ id }) => id), beatIds: ["chapter-1", "chapter-5"] },
  ],
});

export const POCKET_WORKSHOP_ASSET_REQUIREMENTS = generateAssetRequirements(POCKET_WORKSHOP_DESIGN_CONTRACT, { styleFamily: "warm-miniature-workshop", dimensions: "2d", generatedAt: "2026-09-05T00:00:00.000Z" });
