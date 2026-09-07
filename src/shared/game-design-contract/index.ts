import { z } from "zod";
import type { GameProjectV3 } from "../project-schema/index.js";

const id = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const shortText = z.string().trim().min(1).max(240);
const difficultyValue = z.number().int().min(0).max(5);

export const difficultyVectorSchema = z.object({
  cognition: difficultyValue,
  operation: difficultyValue,
  space: difficultyValue,
  resources: difficultyValue,
  combination: difficultyValue,
  punishment: difficultyValue,
}).strict();

const mechanicSchema = z.object({
  id,
  label: shortText,
  ruleIds: z.array(id).min(1),
  core: z.boolean().default(true),
  learningStages: z.array(z.enum(["introduce", "practice", "vary", "combine", "master"])).min(1),
  onboardingExemption: shortText.nullable().default(null),
}).strict();

const onboardingStepSchema = z.object({
  id,
  teachesMechanicId: id,
  trigger: shortText,
  presentation: z.array(z.enum(["short-text", "highlight", "gesture", "ghost-action", "optional-demo", "sound"])).min(1),
  safeState: shortText,
  requiredAction: shortText,
  successSignal: id,
  dismissal: z.object({ automatic: z.boolean(), replayable: z.boolean(), skippable: z.boolean() }).strict(),
  deviceVariants: z.object({ keyboard: shortText.optional(), pointer: shortText.optional(), touch: shortText.optional() }).strict(),
}).strict();

const contentBeatSchema = z.object({
  id,
  label: shortText,
  pressure: z.enum(["safe", "normal", "high"]),
  introducesMechanicIds: z.array(id).default([]),
  practicesMechanicIds: z.array(id).default([]),
  difficulty: difficultyVectorSchema,
  changeReason: shortText,
  expectedSeconds: z.number().int().positive().max(3600),
}).strict();

const assistanceStepSchema = z.object({
  afterFailures: z.number().int().min(1).max(20),
  action: z.enum(["explain-cause", "highlight-rule", "directional-hint", "show-step", "checkpoint", "lower-one-dimension"]),
  message: shortText,
  explicitToPlayer: z.boolean(),
}).strict();

const designAcceptanceSchema = z.object({
  id,
  label: shortText,
  kind: z.enum(["onboarding", "progression", "solvability", "assistance", "content-variation", "rule", "viewport", "asset", "accessibility", "game-feel", "no-failure", "endless-sampled"]),
  mechanicIds: z.array(id).default([]),
  onboardingStepIds: z.array(id).default([]),
  beatIds: z.array(id).default([]),
}).strict();

export const gameDesignContractV1Schema = z.object({
  schemaVersion: z.literal("game-design-contract-v1"),
  id,
  projectId: id,
  knowledge: z.object({
    libraryVersion: z.literal("game-design-knowledge-v1"),
    integrationStatus: z.enum(["matched", "prototype-required", "research-required"]),
    patternIds: z.array(id),
    capabilityIds: z.array(id).min(1),
    mechanicIds: z.array(id),
    researchTaskIds: z.array(id).default([]),
    evidenceUrls: z.array(z.string().url()).default([]),
  }).strict(),
  playerPromise: shortText,
  audience: z.object({ experience: z.enum(["first-time", "casual", "experienced"]), accessibilityNeeds: z.array(shortText).default([]) }).strict(),
  session: z.object({ targetMinutes: z.number().positive().max(180), restartSeconds: z.number().nonnegative().max(60), firstMeaningfulChoiceSeconds: z.number().positive().max(120) }).strict(),
  loops: z.object({ instant: shortText, tactical: shortText, session: shortText, longTerm: shortText.optional() }).strict(),
  mechanics: z.array(mechanicSchema).min(1),
  onboarding: z.array(onboardingStepSchema).default([]),
  content: z.object({ mode: z.enum(["finite-campaign", "endless", "run-based", "round-based", "chapter-based", "sandbox"]), beats: z.array(contentBeatSchema).min(1) }).strict(),
  failurePolicy: z.enum(["required", "forbidden"]).optional(),
  assistance: z.object({ hiddenAdaptation: z.literal(false), steps: z.array(assistanceStepSchema) }).strict(),
  acceptance: z.array(designAcceptanceSchema).min(1),
}).strict();

export type GameDesignContractV1 = z.infer<typeof gameDesignContractV1Schema>;
export type DifficultyVector = z.infer<typeof difficultyVectorSchema>;
export type DesignGap = { code: string; severity: "error" | "warning"; path: string; message: string };

const dimensions = ["cognition", "operation", "space", "resources", "combination", "punishment"] as const;

function duplicateGaps(values: Array<{ id: string }>, path: string): DesignGap[] {
  const seen = new Set<string>();
  return values.flatMap((value, index) => {
    if (seen.has(value.id)) return [{ code: "duplicate-id", severity: "error" as const, path: `${path}.${index}.id`, message: `ID 重复：${value.id}` }];
    seen.add(value.id);
    return [];
  });
}

export function auditGameDesignContract(project: GameProjectV3, input: unknown): { contract: GameDesignContractV1 | null; gaps: DesignGap[]; complete: boolean } {
  const parsed = gameDesignContractV1Schema.safeParse(input);
  if (!parsed.success) {
    const gaps = parsed.error.issues.map((issue) => ({ code: "schema-invalid", severity: "error" as const, path: issue.path.join("."), message: issue.message }));
    return { contract: null, gaps, complete: false };
  }
  const contract = parsed.data;
  const gaps: DesignGap[] = [];
  const mechanicIds = new Set(contract.mechanics.map(({ id }) => id));
  const ruleIds = new Set(project.rules.map(({ id }) => id));
  const stepIds = new Set(contract.onboarding.map(({ id }) => id));
  const beatIds = new Set(contract.content.beats.map(({ id }) => id));
  if (contract.knowledge.integrationStatus !== "research-required" && contract.knowledge.patternIds.length === 0) gaps.push({ code: "missing-knowledge-pattern", severity: "error", path: "knowledge.patternIds", message: "已匹配或待原型设计必须引用至少一个知识库玩法" });
  if (contract.knowledge.integrationStatus === "research-required" && contract.knowledge.researchTaskIds.length === 0) gaps.push({ code: "missing-research-task", severity: "error", path: "knowledge.researchTaskIds", message: "库外设计必须绑定外部研究任务" });
  if (contract.projectId !== project.metadata.id) gaps.push({ code: "project-mismatch", severity: "error", path: "projectId", message: `设计合同属于 ${contract.projectId}，当前工程为 ${project.metadata.id}` });
  gaps.push(...duplicateGaps(contract.mechanics, "mechanics"), ...duplicateGaps(contract.onboarding, "onboarding"), ...duplicateGaps(contract.content.beats, "content.beats"), ...duplicateGaps(contract.acceptance, "acceptance"));

  contract.mechanics.forEach((mechanic, index) => {
    mechanic.ruleIds.forEach((ruleId) => { if (!ruleIds.has(ruleId)) gaps.push({ code: "missing-rule", severity: "error", path: `mechanics.${index}.ruleIds`, message: `机制 ${mechanic.id} 引用了不存在的规则 ${ruleId}` }); });
    const hasTeaching = contract.onboarding.some(({ teachesMechanicId }) => teachesMechanicId === mechanic.id);
    if (mechanic.core && !hasTeaching && !mechanic.onboardingExemption) gaps.push({ code: "core-mechanic-not-taught", severity: "error", path: `mechanics.${index}`, message: `核心机制 ${mechanic.label} 没有新手教学或豁免理由` });
    if (mechanic.core && !mechanic.learningStages.includes("introduce")) gaps.push({ code: "missing-introduction", severity: "error", path: `mechanics.${index}.learningStages`, message: `核心机制 ${mechanic.label} 缺少 introduce 阶段` });
  });
  contract.onboarding.forEach((step, index) => {
    if (!mechanicIds.has(step.teachesMechanicId)) gaps.push({ code: "missing-mechanic", severity: "error", path: `onboarding.${index}.teachesMechanicId`, message: `教学步骤引用了不存在的机制 ${step.teachesMechanicId}` });
    if (Object.keys(step.deviceVariants).length === 0) gaps.push({ code: "missing-device-help", severity: "error", path: `onboarding.${index}.deviceVariants`, message: `教学步骤 ${step.id} 没有设备操作说明` });
  });
  contract.content.beats.forEach((beat, index) => {
    [...beat.introducesMechanicIds, ...beat.practicesMechanicIds].forEach((mechanicId) => { if (!mechanicIds.has(mechanicId)) gaps.push({ code: "missing-mechanic", severity: "error", path: `content.beats.${index}`, message: `内容阶段引用了不存在的机制 ${mechanicId}` }); });
    if (beat.pressure === "high") beat.introducesMechanicIds.forEach((mechanicId) => {
      const safeEarlier = contract.content.beats.slice(0, index).some((earlier) => earlier.pressure === "safe" && [...earlier.introducesMechanicIds, ...earlier.practicesMechanicIds].includes(mechanicId));
      if (!safeEarlier) gaps.push({ code: "high-pressure-first-use", severity: "error", path: `content.beats.${index}`, message: `机制 ${mechanicId} 首次高压使用前没有安全成功阶段` });
    });
    if (index > 0) {
      const previous = contract.content.beats[index - 1];
      const jumps = dimensions.filter((dimension) => beat.difficulty[dimension] - previous.difficulty[dimension] > 1);
      if (jumps.length > 1) gaps.push({ code: "multi-dimension-spike", severity: "error", path: `content.beats.${index}.difficulty`, message: `相邻阶段同时突升多个难度维度：${jumps.join("、")}` });
    }
  });
  const failureThresholds = contract.assistance.steps.map(({ afterFailures }) => afterFailures);
  if (new Set(failureThresholds).size !== failureThresholds.length || failureThresholds.some((value, index) => index > 0 && value <= failureThresholds[index - 1])) gaps.push({ code: "assistance-order", severity: "error", path: "assistance.steps", message: "失败辅助必须按连续失败次数严格递增" });
  if (contract.failurePolicy === "forbidden") {
    if (contract.assistance.steps.length) gaps.push({ code: "unexpected-failure-assistance", severity: "error", path: "assistance.steps", message: "无失败方案不能包含失败后触发的帮助" });
  } else if (contract.assistance.steps[0]?.action !== "explain-cause") gaps.push({ code: "missing-failure-cause", severity: "error", path: "assistance.steps.0", message: "首次失败应先解释原因" });

  contract.acceptance.forEach((acceptance, index) => {
    acceptance.mechanicIds.forEach((value) => { if (!mechanicIds.has(value)) gaps.push({ code: "acceptance-missing-mechanic", severity: "error", path: `acceptance.${index}.mechanicIds`, message: `验收引用了不存在的机制 ${value}` }); });
    acceptance.onboardingStepIds.forEach((value) => { if (!stepIds.has(value)) gaps.push({ code: "acceptance-missing-step", severity: "error", path: `acceptance.${index}.onboardingStepIds`, message: `验收引用了不存在的教学步骤 ${value}` }); });
    acceptance.beatIds.forEach((value) => { if (!beatIds.has(value)) gaps.push({ code: "acceptance-missing-beat", severity: "error", path: `acceptance.${index}.beatIds`, message: `验收引用了不存在的内容阶段 ${value}` }); });
  });
  const acceptanceKinds = new Set(contract.acceptance.map(({ kind }) => kind));
  const requiredKinds: GameDesignContractV1["acceptance"][number]["kind"][] = ["onboarding", contract.failurePolicy === "forbidden" ? "no-failure" : "assistance", ...(contract.content.mode === "endless" && contract.failurePolicy !== undefined ? ["endless-sampled" as const] : ["progression" as const, "content-variation" as const])];
  requiredKinds.forEach((kind) => { if (!acceptanceKinds.has(kind)) gaps.push({ code: "missing-acceptance-kind", severity: "error", path: "acceptance", message: `缺少 ${kind} 设计验收` }); });
  return { contract, gaps, complete: !gaps.some(({ severity }) => severity === "error") };
}

export function serializeGameDesignContractV1(input: unknown): string {
  return `${JSON.stringify(gameDesignContractV1Schema.parse(input), null, 2)}\n`;
}
