import { z } from "zod";
import type { DesignIntegrationPlan, DesignIntegrationRequest } from "./integrator.js";
import { gameMechanicSchema, playPatternSchema } from "./artifact-schema.js";
import { evaluateResearchPrototype, researchPrototypeEvaluationSchema } from "./research-evaluation.js";

const id = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const text = z.string().trim().min(1).max(500);

export const referenceSourceSchema = z.object({
  id,
  title: text,
  url: z.string().url(),
  sourceType: z.enum(["official-rules", "official-product", "developer-material", "store-listing", "independent-analysis", "player-evidence"]),
  observedAt: z.string().date(),
  gameplayObservations: z.array(text).min(1),
  onboardingObservations: z.array(text).default([]),
  progressionObservations: z.array(text).default([]),
  failureRecoveryObservations: z.array(text).default([]),
  doNotCopy: z.array(text).min(1),
}).strict();

export const researchCandidateDraftSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("mechanic"), artifact: gameMechanicSchema }).strict(),
  z.object({ kind: z.literal("pattern"), artifact: playPatternSchema.refine(({ lifecycle }) => lifecycle === "candidate", "外部研究产生的新玩法必须先进入 candidate 生命周期") }).strict(),
]);

export const researchSynthesisSchema = z.object({
  commonLoop: text,
  mechanicHypotheses: z.array(text).min(1),
  relationshipHypotheses: z.array(text).min(1),
  verificationPlan: z.array(text).min(1),
  rejectionRisks: z.array(text).min(1),
}).strict();

export const gameResearchTaskSchema = z.object({
  schemaVersion: z.literal("game-research-task-v1"),
  id,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  status: z.enum(["queued", "researching", "review", "accepted", "rejected"]),
  queryIntent: text,
  playerVerbs: z.array(text),
  constraints: z.array(text),
  candidatePatternIds: z.array(id).max(3),
  sources: z.array(referenceSourceSchema),
  synthesis: researchSynthesisSchema.nullable(),
  candidateDraft: researchCandidateDraftSchema.nullable(),
  evaluation: researchPrototypeEvaluationSchema.nullable().default(null),
  decision: z.object({
    outcome: z.enum(["candidate-pattern", "candidate-mechanic", "no-adoption"]),
    rationale: text,
    decidedAt: z.string().datetime(),
  }).strict().nullable(),
}).strict();

export type GameResearchTask = z.infer<typeof gameResearchTaskSchema>;

function stableResearchId(idea: string) {
  const hash = idea.split("").reduce((value, character) => Math.imul(value ^ character.charCodeAt(0), 16_777_619) >>> 0, 2_166_136_261);
  return `RESEARCH-${hash.toString(16).toUpperCase().padStart(8, "0")}`;
}

export function createGameResearchTask(request: DesignIntegrationRequest, plan: DesignIntegrationPlan, now = new Date()): GameResearchTask {
  if (plan.status !== "research-required" || !plan.researchQuery) throw new Error("只有 research-required 策划结果可以进入外部研究队列");
  const timestamp = now.toISOString();
  return gameResearchTaskSchema.parse({
    schemaVersion: "game-research-task-v1",
    id: stableResearchId(request.idea),
    createdAt: timestamp,
    updatedAt: timestamp,
    status: "queued",
    queryIntent: request.idea,
    playerVerbs: plan.researchQuery.playerVerbs,
    constraints: plan.researchQuery.constraints,
    candidatePatternIds: plan.alternatives.map(({ patternId }) => patternId),
    sources: [], synthesis: null, candidateDraft: null, evaluation: null, decision: null,
  });
}

export function addResearchSource(task: GameResearchTask, source: z.input<typeof referenceSourceSchema>, now = new Date()): GameResearchTask {
  if (task.status !== "queued" && task.status !== "researching") throw new Error("研究进入综合评审后不能再修改来源");
  const parsedSource = referenceSourceSchema.parse(source);
  const sources = [...task.sources.filter(({ url }) => url !== parsedSource.url), parsedSource];
  return gameResearchTaskSchema.parse({ ...task, sources, status: "researching", updatedAt: now.toISOString() });
}

export function submitResearchSynthesis(task: GameResearchTask, synthesis: NonNullable<GameResearchTask["synthesis"]>, now = new Date()): GameResearchTask {
  if (task.status !== "researching") throw new Error("只有正在研究且已登记来源的任务可以提交综合拆解");
  const distinctHosts = new Set(task.sources.map(({ url }) => new URL(url).hostname));
  if (task.sources.length < 3 || distinctHosts.size < 2) throw new Error("进入评审前至少需要三个来源且覆盖两个独立站点");
  if (!task.sources.some(({ sourceType }) => sourceType === "official-rules" || sourceType === "official-product" || sourceType === "developer-material")) {
    throw new Error("进入评审前至少需要一个官方或开发者来源");
  }
  return gameResearchTaskSchema.parse({ ...task, synthesis, status: "review", updatedAt: now.toISOString() });
}

export function attachResearchCandidate(task: GameResearchTask, rawDraft: z.input<typeof researchCandidateDraftSchema>, now = new Date()): GameResearchTask {
  if (task.status !== "review" || !task.synthesis) throw new Error("研究综合进入 review 后才能形成候选草案");
  if (task.evaluation) throw new Error("原型评估开始后候选草案被冻结；需要改动时应建立新的研究任务");
  const candidateDraft = researchCandidateDraftSchema.parse(rawDraft);
  if (candidateDraft.kind === "pattern") {
    const registeredUrls = new Set(task.sources.map(({ url }) => url));
    const evidenceUrls = new Set(candidateDraft.artifact.evidence.map(({ sourceUrl }) => sourceUrl));
    if (evidenceUrls.size < 2) throw new Error("候选玩法至少要引用两个已登记的独立研究来源");
    if ([...evidenceUrls].some((url) => !registeredUrls.has(url))) throw new Error("候选玩法证据只能引用当前研究任务已登记的来源");
  }
  return gameResearchTaskSchema.parse({ ...task, candidateDraft, updatedAt: now.toISOString() });
}

export function decideResearchTask(task: GameResearchTask, outcome: "candidate-pattern" | "candidate-mechanic" | "no-adoption", rationale: string, now = new Date()): GameResearchTask {
  if (task.status !== "review" || !task.synthesis) throw new Error("研究综合进入 review 后才能做入库决定");
  if (outcome !== "no-adoption" && !task.candidateDraft) throw new Error("接受研究结论前必须先保存结构化候选草案");
  if (outcome !== "no-adoption" && (!task.evaluation || !evaluateResearchPrototype(task.evaluation).ready)) throw new Error("接受研究候选前必须通过合同、探针、资源范围、桌面与手机浏览器以及结构化试玩门禁");
  if (outcome === "candidate-pattern" && task.candidateDraft?.kind !== "pattern") throw new Error("候选玩法决定必须对应玩法草案");
  if (outcome === "candidate-mechanic" && task.candidateDraft?.kind !== "mechanic") throw new Error("候选机制决定必须对应机制草案");
  return gameResearchTaskSchema.parse({
    ...task,
    status: outcome === "no-adoption" ? "rejected" : "accepted",
    decision: { outcome, rationale, decidedAt: now.toISOString() },
    updatedAt: now.toISOString(),
  });
}
