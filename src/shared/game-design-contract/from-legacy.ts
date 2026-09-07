import type { GameSpec } from "../contracts.js";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "../game-design-knowledge/catalog.js";
import { createDesignKnowledgeShadow, type DesignKnowledgeShadow } from "../game-design-knowledge/shadow.js";
import { migrateLegacyProjectToV11 } from "../project-schema/migrate-v1.js";
import { auditGameDesignContract, gameDesignContractV1Schema, type DifficultyVector, type GameDesignContractV1 } from "./index.js";
import { merge2048DesignSample } from "./samples.js";

type LegacyContractSource = {
  projectId: string;
  title: string;
  idea: string;
  createdAt: string;
  spec: GameSpec;
  designKnowledge?: DesignKnowledgeShadow | null;
};

const zeroDifficulty: DifficultyVector = { cognition: 0, operation: 0, space: 0, resources: 0, combination: 0, punishment: 0 };
const practiceDifficulty: DifficultyVector = { cognition: 1, operation: 1, space: 1, resources: 1, combination: 0, punishment: 0 };
const masteryDifficulty: DifficultyVector = { cognition: 2, operation: 2, space: 2, resources: 2, combination: 1, punishment: 1 };

function short(value: string, fallback: string) {
  return (value.trim() || fallback).slice(0, 240);
}

function stableId(value: string, fallback: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9._:-]+/g, "-").replace(/^-+|-+$/g, "");
  return (normalized || fallback).slice(0, 100);
}

function sessionMinutes(value: string) {
  const numbers = value.match(/\d+(?:\.\d+)?/g)?.map(Number).filter(Number.isFinite) ?? [];
  if (!numbers.length) return 5;
  return Math.max(0.5, Math.min(180, numbers.reduce((sum, item) => sum + item, 0) / numbers.length));
}

function deviceHelp(spec: GameSpec, requiredAction: string) {
  const modes = new Set(spec.inputModes);
  const result: { keyboard?: string; pointer?: string; touch?: string } = {};
  if (modes.has("keyboard")) result.keyboard = short(`使用键盘完成：${requiredAction}`, "按提示按键完成操作");
  if (["pointer", "drag", "swipe"].some((mode) => modes.has(mode as GameSpec["inputModes"][number]))) result.pointer = short(`使用鼠标或指针完成：${requiredAction}`, "按提示点击或拖动");
  if (["touch-buttons", "virtual-stick", "drag", "swipe", "pointer"].some((mode) => modes.has(mode as GameSpec["inputModes"][number]))) result.touch = short(`在触屏上完成：${requiredAction}`, "按提示触摸或滑动");
  if (!Object.keys(result).length) result.pointer = short(`完成：${requiredAction}`, "按提示完成操作");
  return result;
}

export function createGameDesignContractForLegacyProject(source: LegacyContractSource): GameDesignContractV1 {
  const knowledge = source.designKnowledge ?? createDesignKnowledgeShadow({
    idea: source.idea,
    template: source.spec.template,
    dimensions: source.spec.dimensions,
    inputModes: source.spec.inputModes,
    threeMode: source.spec.threeMode,
  }, { template: source.spec.template, dimensions: source.spec.dimensions, threeMode: source.spec.threeMode });
  if (source.spec.template === "merge-2048") {
    const contract = gameDesignContractV1Schema.parse({
      ...merge2048DesignSample,
      id: `DESIGN-${source.projectId}`,
      projectId: source.projectId,
      mechanics: merge2048DesignSample.mechanics.map((mechanic) => ({ ...mechanic, ruleIds: ["RULE-03"] })),
      knowledge: { ...merge2048DesignSample.knowledge, evidenceUrls: knowledge.plan.evidenceUrls },
    });
    const migrated = migrateLegacyProjectToV11({ id: source.projectId, title: source.title, createdAt: source.createdAt, spec: source.spec });
    const audit = auditGameDesignContract(migrated, contract);
    if (!audit.complete) throw new Error(`普通项目设计合同不完整：${audit.gaps.map(({ message }) => message).join("；")}`);
    return contract;
  }
  const selectedPattern = knowledge.plan.selectedPatternId
    ? GAME_DESIGN_KNOWLEDGE_LIBRARY.patterns.find(({ id }) => id === knowledge.plan.selectedPatternId) ?? null
    : null;
  const plannedMechanicIds = source.spec.template === "mahjong-roguelite"
    ? ["match-combo", ...knowledge.plan.mechanicIds]
    : knowledge.plan.mechanicIds;
  const authoredGenerated = source.spec.template === "generated" && source.spec.designSource === "llm";
  const campaign = source.spec.template === "generated" ? source.spec.designProfile.generatedCampaign : undefined;
  const noFailure = campaign?.failurePolicy === "forbidden";
  const endless = campaign?.mode === "endless";
  const catalogMechanics = [...new Set(authoredGenerated ? [] : plannedMechanicIds)]
    .map((id) => GAME_DESIGN_KNOWLEDGE_LIBRARY.mechanics.find((item) => item.id === id))
    .filter((item): item is (typeof GAME_DESIGN_KNOWLEDGE_LIBRARY.mechanics)[number] => Boolean(item));
  const fallbackLabels = authoredGenerated ? source.spec.designProfile.onboarding : source.spec.mechanics.slice(0, 2);
  const fallbackMechanics = fallbackLabels.map((label, index) => ({
    id: stableId(label, `core-mechanic-${index + 1}`),
    label,
    playerVerb: label,
    probeSignals: [`mechanic-${index + 1}-completed`],
  }));
  const mechanicSources = catalogMechanics.length ? catalogMechanics : fallbackMechanics;
  const coreMechanicIds = new Set(source.spec.template === "mahjong-roguelite"
    ? ["match-combo"]
    : source.spec.template === "polyomino-fit"
      ? ["polyomino-placement"]
      : !authoredGenerated && selectedPattern ? selectedPattern.coreMechanicIds : mechanicSources.map(({ id }) => id));
  const mechanics = mechanicSources.map((mechanic) => ({
    id: mechanic.id,
    label: short(mechanic.label, "核心操作"),
    ruleIds: ["RULE-03"],
    core: coreMechanicIds.has(mechanic.id),
    learningStages: ["introduce", "practice", "vary", "combine"] as Array<"introduce" | "practice" | "vary" | "combine">,
    onboardingExemption: null,
  }));
  const mechanicDetails = new Map((catalogMechanics.length ? catalogMechanics : mechanics.map((mechanic, index) => ({
    ...mechanic,
    playerVerb: mechanic.label,
    probeSignals: [`mechanic-${index + 1}-completed`],
  }))).map((mechanic) => [mechanic.id, mechanic]));
  const onboarding = mechanics.filter(({ core }) => core).map((mechanic, index) => {
    const detail = mechanicDetails.get(mechanic.id)!;
    const requiredAction = source.spec.template === "klotski" && mechanic.id === "sliding-block"
      ? "拖动包裹到空位，给队长让路。"
      : source.spec.template === "block-place" && mechanic.id === "polyomino-placement"
      ? "拖一块果冻到空位；也可先选块，再点击空位。"
      : source.spec.template === "mahjong-roguelite"
      ? "点两张同图同标的亮牌。上方无遮挡、左右一边空，才能配对。"
      : short(detail.playerVerb, mechanic.label);
    return {
      id: `ONBOARD-${String(index + 1).padStart(2, "0")}`,
      teachesMechanicId: mechanic.id,
      trigger: index === 0 ? "首次进入可操作状态" : `完成上一项教学后，首次需要${mechanic.label}`,
      presentation: ["short-text", "highlight"] as Array<"short-text" | "highlight">,
      safeState: short(source.spec.designProfile.onboarding[index] ?? source.spec.designProfile.onboarding.at(-1) ?? "暂停额外压力，只保留当前教学目标", "只保留当前教学目标"),
      requiredAction,
      successSignal: stableId(detail.probeSignals[0] ?? `mechanic-${index + 1}-completed`, `mechanic-${index + 1}-completed`),
      dismissal: { automatic: true, replayable: true, skippable: true },
      deviceVariants: deviceHelp(source.spec, requiredAction),
    };
  });
  const mechanicIds = mechanics.map(({ id }) => id);
  const totalSeconds = Math.max(90, Math.round(sessionMinutes(source.spec.designProfile.sessionLength) * 60));
  const contract = gameDesignContractV1Schema.parse({
    schemaVersion: "game-design-contract-v1",
    id: `DESIGN-${source.projectId}`,
    projectId: source.projectId,
    knowledge: {
      libraryVersion: "game-design-knowledge-v1",
      integrationStatus: knowledge.plan.status,
      patternIds: knowledge.plan.selectedPatternId ? [knowledge.plan.selectedPatternId] : [],
      capabilityIds: knowledge.plan.capabilityIds.length ? knowledge.plan.capabilityIds : ["game-lifecycle", "unified-input", "onboarding", "difficulty-plan", "failure-assistance"],
      mechanicIds,
      researchTaskIds: knowledge.plan.status === "research-required" ? [`RESEARCH-${source.projectId}`] : [],
      evidenceUrls: knowledge.plan.evidenceUrls,
    },
    playerPromise: short(source.spec.designProfile.playerFantasy, source.idea),
    audience: { experience: "first-time", accessibilityNeeds: source.spec.designProfile.accessibility.map((item) => short(item, "提供等价操作方式")) },
    session: { targetMinutes: sessionMinutes(source.spec.designProfile.sessionLength), restartSeconds: 2, firstMeaningfulChoiceSeconds: 8 },
    loops: {
      instant: short(source.spec.designProfile.coreLoop[0], "观察并执行主要操作"),
      tactical: short(source.spec.designProfile.coreLoop[1], "读取反馈并调整下一步"),
      session: short(`${source.spec.designProfile.winCondition}；失败条件：${source.spec.designProfile.failCondition}`, "完成本局目标"),
      longTerm: short(source.spec.designProfile.progression.join("；"), "逐步掌握更复杂的变化"),
    },
    mechanics,
    onboarding,
    ...(campaign ? { failurePolicy: campaign.failurePolicy } : {}),
    content: { mode: endless ? "endless" : "finite-campaign", beats: [
      { id: "BEAT-SAFE", label: "安全理解", pressure: "safe", introducesMechanicIds: mechanicIds, practicesMechanicIds: [], difficulty: zeroDifficulty, changeReason: "先让玩家在无惩罚环境中完成全部核心动作", expectedSeconds: Math.min(60, Math.round(totalSeconds * 0.15)) },
      { id: "BEAT-PRACTICE", label: "独立练习", pressure: "normal", introducesMechanicIds: [], practicesMechanicIds: mechanicIds, difficulty: practiceDifficulty, changeReason: short(source.spec.designProfile.difficultyCurve[0], "逐步加入决策压力"), expectedSeconds: Math.max(45, Math.round(totalSeconds * 0.35)) },
      { id: "BEAT-COMBINE", label: "组合掌握", pressure: "high", introducesMechanicIds: [], practicesMechanicIds: mechanicIds, difficulty: masteryDifficulty, changeReason: short(source.spec.designProfile.difficultyCurve.at(-1) ?? "组合已学机制形成后段挑战", "组合已学机制形成后段挑战"), expectedSeconds: Math.max(60, Math.round(totalSeconds * 0.5)) },
    ] },
    assistance: { hiddenAdaptation: false, steps: noFailure ? [] : [
      { afterFailures: 1, action: "explain-cause", message: short(`说明失败原因：${source.spec.designProfile.failCondition}`, "说明本次失败的直接原因"), explicitToPlayer: true },
      { afterFailures: 2, action: "highlight-rule", message: "突出与失败直接相关的规则和可改变动作。", explicitToPlayer: true },
      { afterFailures: 4, action: "directional-hint", message: "给出一个方向性建议，不替玩家自动完成。", explicitToPlayer: true },
    ] },
    acceptance: [
      { id: "ACCEPT-ONBOARD", label: "新存档可真实完成全部核心动作教学", kind: "onboarding", mechanicIds, onboardingStepIds: onboarding.map(({ id }) => id), beatIds: ["BEAT-SAFE"] },
      ...(endless ? [{ id: "ACCEPT-ENDLESS", label: "无限模式重开正常且抽样期间没有通关终点（不证明长期内容供给）", kind: "endless-sampled", mechanicIds, onboardingStepIds: [], beatIds: [] }] : [
        { id: "ACCEPT-PROGRESSION", label: "难度从安全理解逐步进入组合挑战", kind: "progression", mechanicIds, onboardingStepIds: [], beatIds: ["BEAT-SAFE", "BEAT-PRACTICE", "BEAT-COMBINE"] },
        { id: "ACCEPT-VARIATION", label: "后续阶段改变决策结构而非只提高数值", kind: "content-variation", mechanicIds, onboardingStepIds: [], beatIds: ["BEAT-PRACTICE", "BEAT-COMBINE"] },
      ]),
      { id: "ACCEPT-ASSISTANCE", label: noFailure ? "已测操作未进入失败状态（抽样检查）" : "失败后解释原因并逐级提供显式帮助", kind: noFailure ? "no-failure" : "assistance", mechanicIds: [], onboardingStepIds: [], beatIds: [] },
    ],
  });
  const migrated = migrateLegacyProjectToV11({ id: source.projectId, title: source.title, createdAt: source.createdAt, spec: source.spec });
  const audit = auditGameDesignContract(migrated, contract);
  if (!audit.complete) throw new Error(`普通项目设计合同不完整：${audit.gaps.map(({ message }) => message).join("；")}`);
  return contract;
}
