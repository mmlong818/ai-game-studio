import { z } from "zod";
import { gameDesignContractV1Schema, type GameDesignContractV1 } from "../game-design-contract/index.js";
import { assetRequirementBundleSchema, generateAssetRequirements } from "../resource-requirements/index.js";
import type { ResourceFamily } from "../resource-library/index.js";
import type { GameResearchTask } from "./research-queue.js";
import { POCKET_WORKSHOP_ASSET_REQUIREMENTS, POCKET_WORKSHOP_DESIGN_CONTRACT, POCKET_WORKSHOP_RESEARCH_TASK_ID } from "./pocket-workshop-contract.js";
import { createResearchResourceAcquisitionPlan, researchResourceAcquisitionPlanSchema } from "./research-resource-acquisition.js";
import { researchResourceAcquisitionTaskSchema } from "./research-resource-acquisition-task.js";
import { researchResourceIntakeBatchSchema } from "./research-resource-intake.js";

const id = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const text = z.string().trim().min(1).max(500);

export const researchProbeRunInputSchema = z.object({
  signalId: id,
  status: z.enum(["passed", "failed"]),
  observation: text,
}).strict();

export const researchBrowserRunInputSchema = z.object({
  deviceClass: z.enum(["desktop", "mobile"]),
  url: z.string().url(),
  viewport: z.string().trim().regex(/^\d{2,5}x\d{2,5}$/),
  status: z.enum(["passed", "failed"]),
  interactionCompleted: z.boolean(),
  consoleErrorCount: z.number().int().min(0).max(999),
  accessibilityViolationCount: z.number().int().min(0).max(999),
  observation: text,
}).strict();

const researchPlaytestFields = {
  testerSegment: z.enum(["novice", "casual", "experienced"]),
  taskOutcome: z.enum(["completed", "partial", "blocked", "abandoned"]),
  onboardingClarity: z.number().int().min(1).max(5),
  controlClarity: z.number().int().min(1).max(5),
  funRating: z.number().int().min(1).max(5),
  fairnessRating: z.number().int().min(1).max(5),
  wouldReplay: z.boolean(),
  blockerCode: z.enum(["none", "onboarding", "controls", "rules", "difficulty", "resource", "performance", "accessibility"]),
};
export const researchPlaytestInputSchema = z.object(researchPlaytestFields).strict().superRefine((input, context) => {
  if (input.taskOutcome === "completed" && input.blockerCode !== "none") context.addIssue({ code: "custom", path: ["blockerCode"], message: "完成试玩不能同时标记阻塞原因" });
  if (input.taskOutcome !== "completed" && input.blockerCode === "none") context.addIssue({ code: "custom", path: ["blockerCode"], message: "未完成试玩必须标记阻塞原因" });
});

const recorded = z.object({ id, recordedAt: z.string().datetime(), recordedBy: z.enum(["automatic", "manual"]).default("manual") }).strict();
export const researchResourceGapSummarySchema = z.object({
  total: z.number().int().nonnegative(),
  prototypeRequired: z.number().int().nonnegative(),
  reviewMissing: z.number().int().nonnegative(),
  publishMissing: z.number().int().nonnegative(),
  proceduralFallbacks: z.number().int().nonnegative(),
  prototypeReady: z.boolean(),
}).strict();
export const researchPrototypeEvaluationSchema = z.object({
  schemaVersion: z.literal("research-prototype-evaluation-v1"),
  id,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  contract: gameDesignContractV1Schema,
  assetRequirements: assetRequirementBundleSchema.optional(),
  resourceGapSummary: researchResourceGapSummarySchema.optional(),
  resourceAcquisitionPlan: researchResourceAcquisitionPlanSchema.optional(),
  resourceAcquisitionTask: researchResourceAcquisitionTaskSchema.optional(),
  resourceIntakeBatch: researchResourceIntakeBatchSchema.optional(),
  promotedResourceFamilyIds: z.array(z.string().min(1)).optional(),
  requiredProbeSignals: z.array(id).min(1),
  probeRuns: z.array(recorded.extend(researchProbeRunInputSchema.shape).strict()),
  browserRuns: z.array(recorded.extend(researchBrowserRunInputSchema.shape).strict()),
  playtests: z.array(recorded.extend(researchPlaytestFields).strict()),
}).strict();

export type ResearchPrototypeEvaluation = z.infer<typeof researchPrototypeEvaluationSchema>;
export type ResearchEvaluationReadiness = {
  contract: boolean;
  resources: boolean;
  probes: boolean;
  browser: boolean;
  playtest: boolean;
  ready: boolean;
  reasons: string[];
};

function runId(prefix: string, size: number) {
  return `${prefix}-${String(size + 1).padStart(3, "0")}`;
}

function prototypeContract(task: GameResearchTask): GameDesignContractV1 {
  if (!task.candidateDraft) throw new Error("形成候选草案后才能建立原型评估沙箱");
  const draft = task.candidateDraft;
  const mechanicIds = draft.kind === "mechanic" ? [draft.artifact.id] : draft.artifact.coreMechanicIds;
  const capabilityIds = draft.kind === "mechanic" ? draft.artifact.capabilityIds : draft.artifact.coreCapabilityIds;
  const evidenceUrls = [...new Set(task.sources.map(({ url }) => url))];
  const primaryId = mechanicIds[0]!;
  const contract: GameDesignContractV1 = {
    schemaVersion: "game-design-contract-v1",
    id: `research-contract:${task.id}`,
    projectId: `research-sandbox:${task.id}`,
    knowledge: {
      libraryVersion: "game-design-knowledge-v1",
      integrationStatus: "prototype-required",
      patternIds: [draft.kind === "pattern" ? draft.artifact.id : `research-prototype:${draft.artifact.id}`],
      capabilityIds,
      mechanicIds,
      researchTaskIds: [task.id],
      evidenceUrls,
    },
    playerPromise: task.queryIntent,
    audience: { experience: "first-time", accessibilityNeeds: ["核心状态不能只依赖颜色或声音表达"] },
    session: { targetMinutes: draft.kind === "pattern" ? Math.min(draft.artifact.scope.sessionMinutes[1], 30) : 8, restartSeconds: 5, firstMeaningfulChoiceSeconds: 20 },
    loops: {
      instant: draft.kind === "mechanic" ? draft.artifact.playerVerb : task.synthesis?.commonLoop ?? task.queryIntent,
      tactical: "观察状态变化，调整下一次选择并验证规则因果。",
      session: "完成安全教学、普通组合和一次可解释结算。",
    },
    mechanics: mechanicIds.map((mechanicId) => ({ id: mechanicId, label: mechanicId === primaryId && draft.kind === "mechanic" ? draft.artifact.label : mechanicId, ruleIds: [`prototype-rule:${mechanicId}`], core: true, learningStages: ["introduce", "practice", "vary"], onboardingExemption: null })),
    onboarding: mechanicIds.map((mechanicId, index) => ({
      id: `teach:${mechanicId}`,
      teachesMechanicId: mechanicId,
      trigger: index === 0 ? "首次进入原型" : `完成前一机制后进入 ${mechanicId}`,
      presentation: ["short-text", "highlight", "gesture"],
      safeState: "无计时、无资源损失且允许撤销的安全状态",
      requiredAction: `完成一次 ${mechanicId} 的合法核心动作`,
      successSignal: `learned:${mechanicId}`,
      dismissal: { automatic: true, replayable: true, skippable: true },
      deviceVariants: { keyboard: "使用清晰标注的等价按键", pointer: "点击或拖动高亮目标", touch: "点击或拖动至少 44px 的目标" },
    })),
    content: { mode: "round-based", beats: [
      { id: "safe-introduction", label: "安全认识规则", pressure: "safe", introducesMechanicIds: mechanicIds, practicesMechanicIds: [], difficulty: { cognition: 1, operation: 1, space: 1, resources: 0, combination: 0, punishment: 0 }, changeReason: "先证明理解，再增加压力。", expectedSeconds: 90 },
      { id: "combined-proof", label: "组合验证", pressure: "normal", introducesMechanicIds: [], practicesMechanicIds: mechanicIds, difficulty: { cognition: 2, operation: 1, space: 2, resources: 1, combination: 1, punishment: 1 }, changeReason: "只在安全成功后加入组合与轻度失败代价。", expectedSeconds: 240 },
    ] },
    assistance: { hiddenAdaptation: false, steps: [
      { afterFailures: 1, action: "explain-cause", message: "说明这次结果由哪条规则导致。", explicitToPlayer: true },
      { afterFailures: 2, action: "highlight-rule", message: "高亮下一次可以验证的规则位置。", explicitToPlayer: true },
    ] },
    acceptance: [
      { id: "accept-onboarding", label: "新手可独立完成首次合法动作", kind: "onboarding", mechanicIds, onboardingStepIds: mechanicIds.map((value) => `teach:${value}`), beatIds: ["safe-introduction"] },
      { id: "accept-progression", label: "难度只在安全成功后递进", kind: "progression", mechanicIds, onboardingStepIds: [], beatIds: ["safe-introduction", "combined-proof"] },
      { id: "accept-assistance", label: "失败原因和下一步帮助可观察", kind: "assistance", mechanicIds, onboardingStepIds: [], beatIds: ["combined-proof"] },
      { id: "accept-variation", label: "普通阶段产生可解释的状态变化", kind: "content-variation", mechanicIds, onboardingStepIds: [], beatIds: ["combined-proof"] },
    ],
  };
  return gameDesignContractV1Schema.parse(contract);
}

function requiredSignals(task: GameResearchTask) {
  if (!task.candidateDraft) return [];
  return task.candidateDraft.kind === "mechanic"
    ? task.candidateDraft.artifact.probeSignals
    : task.synthesis?.verificationPlan.map((_, index) => `research-verification-${index + 1}`) ?? ["research-core-loop"];
}

export function createResearchPrototypeEvaluation(task: GameResearchTask, now = new Date(), resourceFamilies: ResourceFamily[] = []): ResearchPrototypeEvaluation {
  if (task.status !== "review" || !task.candidateDraft || task.decision) throw new Error("待评审且已有候选草案的研究才能建立原型评估沙箱");
  const timestamp = now.toISOString();
  if (task.evaluation) {
    if (task.evaluation.resourceAcquisitionPlan || !task.evaluation.assetRequirements) return task.evaluation;
    return researchPrototypeEvaluationSchema.parse({
      ...task.evaluation,
      updatedAt: timestamp,
      resourceAcquisitionPlan: createResearchResourceAcquisitionPlan(task.evaluation.assetRequirements, resourceFamilies, timestamp),
    });
  }
  const pocketWorkshop = task.id === POCKET_WORKSHOP_RESEARCH_TASK_ID && task.candidateDraft.artifact.id === "container-synergy-planning";
  const contract = pocketWorkshop ? POCKET_WORKSHOP_DESIGN_CONTRACT : prototypeContract(task);
  const dimensions = task.candidateDraft.kind === "pattern" && task.candidateDraft.artifact.scope.dimensions.includes("limited-3d") ? "limited-3d" : "2d";
  const assetRequirements = pocketWorkshop ? POCKET_WORKSHOP_ASSET_REQUIREMENTS : generateAssetRequirements(contract, { styleFamily: "research-neutral", dimensions, generatedAt: timestamp });
  const resourceGapSummary = {
    total: assetRequirements.requirements.length,
    prototypeRequired: assetRequirements.requirements.filter(({ requiredFor }) => requiredFor === "prototype").length,
    reviewMissing: assetRequirements.requirements.filter(({ requiredFor }) => requiredFor === "review").length,
    publishMissing: assetRequirements.requirements.filter(({ requiredFor }) => requiredFor === "publish").length,
    proceduralFallbacks: assetRequirements.requirements.filter(({ fallbackPolicy }) => fallbackPolicy === "procedural").length,
    prototypeReady: assetRequirements.requirements.filter(({ requiredFor }) => requiredFor === "prototype").every(({ fallbackPolicy }) => fallbackPolicy === "procedural"),
  };
  const resourceAcquisitionPlan = createResearchResourceAcquisitionPlan(assetRequirements, resourceFamilies, timestamp);
  return researchPrototypeEvaluationSchema.parse({
    schemaVersion: "research-prototype-evaluation-v1",
    id: `EVAL-${task.id}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    contract,
    assetRequirements,
    resourceGapSummary,
    resourceAcquisitionPlan,
    promotedResourceFamilyIds: [],
    requiredProbeSignals: pocketWorkshop ? ["part-inspected", "synergy-previewed", "resolution-explained", "multi-cell-rotated", "failure-help-escalated"] : [...new Set(requiredSignals(task))],
    probeRuns: [], browserRuns: [], playtests: [],
  });
}

export function evaluateResearchPrototype(evaluation: ResearchPrototypeEvaluation): ResearchEvaluationReadiness {
  const resources = (!evaluation.resourceGapSummary || evaluation.resourceGapSummary.prototypeReady)
    && (!evaluation.resourceAcquisitionPlan || evaluation.resourceAcquisitionPlan.summary.planningReady);
  const latestProbe = new Map(evaluation.probeRuns.filter(({ recordedBy }) => recordedBy === "automatic").map((run) => [run.signalId, run]));
  const probes = evaluation.requiredProbeSignals.every((signal) => latestProbe.get(signal)?.status === "passed" && latestProbe.get(signal)?.recordedBy === "automatic");
  const latestBrowser = new Map(evaluation.browserRuns.filter(({ recordedBy }) => recordedBy === "automatic").map((run) => [run.deviceClass, run]));
  const browser = (["desktop", "mobile"] as const).every((device) => {
    const run = latestBrowser.get(device);
    return run?.status === "passed" && run.recordedBy === "automatic" && run.interactionCompleted && run.consoleErrorCount === 0 && run.accessibilityViolationCount === 0;
  });
  const ratings = evaluation.playtests;
  const average = (key: "onboardingClarity" | "controlClarity" | "funRating" | "fairnessRating") => ratings.reduce((sum, item) => sum + item[key], 0) / Math.max(ratings.length, 1);
  const playtest = ratings.length >= 3
    && ratings.some(({ testerSegment }) => testerSegment === "novice")
    && ratings.filter(({ taskOutcome }) => taskOutcome === "completed").length >= 2
    && (["onboardingClarity", "controlClarity", "funRating", "fairnessRating"] as const).every((key) => average(key) >= 3);
  const reasons = [
    ...(!probes ? ["全部必需探针尚未通过"] : []),
    ...(!browser ? ["桌面与手机真实浏览器均需通过交互、控制台和无障碍检查"] : []),
    ...(!playtest ? ["至少需要三次试玩（含新手、至少两次完成，核心评分均值不低于 3）"] : []),
    ...(!resources ? ["原型阶段必需资源尚未获得可用占位或绑定"] : []),
  ];
  return { contract: true, resources, probes, browser, playtest, ready: resources && probes && browser && playtest, reasons };
}

export function recordResearchProbeRun(evaluation: ResearchPrototypeEvaluation, raw: z.input<typeof researchProbeRunInputSchema>, now = new Date(), recordedBy: "automatic" | "manual" = "manual") {
  const input = researchProbeRunInputSchema.parse(raw);
  if (!evaluation.requiredProbeSignals.includes(input.signalId)) throw new Error("只能记录当前评估合同声明的必需探针");
  return researchPrototypeEvaluationSchema.parse({ ...evaluation, updatedAt: now.toISOString(), probeRuns: [...evaluation.probeRuns, { ...input, id: runId("PROBE", evaluation.probeRuns.length), recordedAt: now.toISOString(), recordedBy }] });
}

export function recordResearchBrowserRun(evaluation: ResearchPrototypeEvaluation, raw: z.input<typeof researchBrowserRunInputSchema>, now = new Date(), recordedBy: "automatic" | "manual" = "manual") {
  const input = researchBrowserRunInputSchema.parse(raw);
  return researchPrototypeEvaluationSchema.parse({ ...evaluation, updatedAt: now.toISOString(), browserRuns: [...evaluation.browserRuns, { ...input, id: runId("BROWSER", evaluation.browserRuns.length), recordedAt: now.toISOString(), recordedBy }] });
}

export function recordResearchPlaytest(evaluation: ResearchPrototypeEvaluation, raw: z.input<typeof researchPlaytestInputSchema>, now = new Date()) {
  const input = researchPlaytestInputSchema.parse(raw);
  return researchPrototypeEvaluationSchema.parse({ ...evaluation, updatedAt: now.toISOString(), playtests: [...evaluation.playtests, { ...input, id: runId("PLAYTEST", evaluation.playtests.length), recordedAt: now.toISOString(), recordedBy: "manual" }] });
}
