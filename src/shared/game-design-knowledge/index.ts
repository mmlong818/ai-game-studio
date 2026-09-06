import { z } from "zod";
import { gameMechanicSchema, playPatternSchema } from "./artifact-schema.js";
export { gameMechanicSchema, mechanicRelationSchema, playPatternSchema } from "./artifact-schema.js";

const id = z.string().trim().min(1).max(120).regex(/^[a-z0-9][a-z0-9-]*$/);
const text = z.string().trim().min(1).max(500);
export const universalCapabilitySchema = z.object({
  id,
  label: text,
  category: z.enum(["lifecycle", "input", "progress", "learning", "challenge", "feedback", "recovery", "persistence", "accessibility", "presentation"]),
  description: text,
  provides: z.array(id).min(1),
  requires: z.array(id).default([]),
  acceptanceKinds: z.array(z.enum(["rule", "viewport", "accessibility", "onboarding", "progression", "assistance", "game-feel"])).min(1),
}).strict();

export const designEvaluationModelSchema = z.object({
  version: z.number().int().positive(),
  dimensions: z.array(z.object({
    id,
    label: text,
    weight: z.number().positive(),
    evidenceKinds: z.array(z.enum(["contract", "solver", "probe", "browser", "playtest", "market"])).min(1),
  }).strict()).min(1),
  minimumVerifiedScore: z.number().min(0).max(100),
  hardGates: z.array(z.object({ id, label: text }).strict()).min(1),
}).strict();

export const gameDesignKnowledgeLibrarySchema = z.object({
  schemaVersion: z.literal("game-design-knowledge-v1"),
  updatedAt: z.string().date(),
  capabilities: z.array(universalCapabilitySchema).min(1),
  mechanics: z.array(gameMechanicSchema).min(1),
  patterns: z.array(playPatternSchema).min(1),
  evaluation: designEvaluationModelSchema,
}).strict();

export type GameDesignKnowledgeLibrary = z.infer<typeof gameDesignKnowledgeLibrarySchema>;
export type KnowledgeGap = { code: string; severity: "error" | "warning"; path: string; message: string };

export function validateGameDesignKnowledgeLibrary(input: unknown, today = new Date()): { library: GameDesignKnowledgeLibrary | null; gaps: KnowledgeGap[]; valid: boolean } {
  const parsed = gameDesignKnowledgeLibrarySchema.safeParse(input);
  if (!parsed.success) return { library: null, gaps: parsed.error.issues.map((issue) => ({ code: "schema-invalid", severity: "error", path: issue.path.join("."), message: issue.message })), valid: false };
  const library = parsed.data;
  const gaps: KnowledgeGap[] = [];
  const checkDuplicates = (values: Array<{ id: string }>, path: string) => {
    const seen = new Set<string>();
    values.forEach(({ id }, index) => { if (seen.has(id)) gaps.push({ code: "duplicate-id", severity: "error", path: `${path}.${index}.id`, message: `ID 重复：${id}` }); seen.add(id); });
  };
  checkDuplicates(library.capabilities, "capabilities");
  checkDuplicates(library.mechanics, "mechanics");
  checkDuplicates(library.patterns, "patterns");
  checkDuplicates(library.evaluation.dimensions, "evaluation.dimensions");
  const capabilityIds = new Set(library.capabilities.map(({ id }) => id));
  const mechanicIds = new Set(library.mechanics.map(({ id }) => id));
  library.capabilities.forEach((capability, index) => capability.requires.forEach((required) => { if (!capabilityIds.has(required)) gaps.push({ code: "missing-capability", severity: "error", path: `capabilities.${index}.requires`, message: `通用能力 ${capability.id} 依赖不存在的能力 ${required}` }); }));
  library.mechanics.forEach((mechanic, index) => {
    mechanic.capabilityIds.forEach((capabilityId) => { if (!capabilityIds.has(capabilityId)) gaps.push({ code: "missing-capability", severity: "error", path: `mechanics.${index}.capabilityIds`, message: `机制 ${mechanic.id} 引用了不存在的能力 ${capabilityId}` }); });
    mechanic.relations.forEach(({ targetId }) => { if (!mechanicIds.has(targetId)) gaps.push({ code: "missing-mechanic", severity: "error", path: `mechanics.${index}.relations`, message: `机制 ${mechanic.id} 关联不存在的机制 ${targetId}` }); });
  });
  library.patterns.forEach((pattern, index) => {
    [...pattern.coreCapabilityIds].forEach((value) => { if (!capabilityIds.has(value)) gaps.push({ code: "missing-capability", severity: "error", path: `patterns.${index}.coreCapabilityIds`, message: `玩法 ${pattern.id} 引用了不存在的能力 ${value}` }); });
    [...pattern.coreMechanicIds, ...pattern.optionalMechanicIds].forEach((value) => { if (!mechanicIds.has(value)) gaps.push({ code: "missing-mechanic", severity: "error", path: `patterns.${index}.coreMechanicIds`, message: `玩法 ${pattern.id} 引用了不存在的机制 ${value}` }); });
    if (pattern.scope.sessionMinutes[0] > pattern.scope.sessionMinutes[1]) gaps.push({ code: "invalid-session-range", severity: "error", path: `patterns.${index}.scope.sessionMinutes`, message: `玩法 ${pattern.id} 的时长范围倒置` });
    const newest = Math.max(...pattern.evidence.map(({ observedAt }) => Date.parse(`${observedAt}T00:00:00Z`)));
    if (today.getTime() - newest > 540 * 86_400_000) gaps.push({ code: "stale-evidence", severity: "warning", path: `patterns.${index}.evidence`, message: `玩法 ${pattern.id} 超过 18 个月没有新证据` });
  });
  const totalWeight = library.evaluation.dimensions.reduce((sum, { weight }) => sum + weight, 0);
  if (Math.abs(totalWeight - 100) > 0.001) gaps.push({ code: "evaluation-weight", severity: "error", path: "evaluation.dimensions", message: `评估权重合计必须为 100，当前为 ${totalWeight}` });
  return { library, gaps, valid: !gaps.some(({ severity }) => severity === "error") };
}

export { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "./catalog.js";
export { DESIGN_MODIFIERS, MECHANIC_ATLAS, MECHANIC_ATLAS_SUMMARY, composeMechanicRecipe, mechanicAtlasEntrySchema, searchMechanicAtlas, type MechanicAtlasEntry } from "./mechanic-atlas.js";
export { LOCAL_DESIGN_SOURCES, LOCAL_DESIGN_SOURCE_SUMMARY, localDesignSourceSchema, type LocalDesignSource } from "./local-design-sources.js";
export { rankPlayPatterns } from "./rank.js";
export { buildGameplayRadarView, createGameplayRadarCluster, createRadarResearchTask, gameplayRadarClusterSchema, gameplayRadarFreshness, gameplaySignalSchema, linkGameplayRadarResearch, mergeGameplaySignal, normalizeGameplayTitle, recommendGameplayRadarMatch, type GameplayRadarCluster, type GameplayRadarFreshness, type GameplayRadarMatch, type GameplayRadarView, type GameplaySignal } from "./gameplay-radar.js";
export { integrateGameDesign, type DesignIntegrationPlan, type DesignIntegrationRequest } from "./integrator.js";
export { OFFICIAL_GAME_KNOWLEDGE_MAPPINGS, knowledgeMappingForTemplate } from "./official-mapping.js";
export { addResearchSource, attachResearchCandidate, createGameResearchTask, decideResearchTask, gameResearchTaskSchema, referenceSourceSchema, researchCandidateDraftSchema, researchSynthesisSchema, submitResearchSynthesis, type GameResearchTask } from "./research-queue.js";
export { createResearchPrototypeEvaluation, evaluateResearchPrototype, recordResearchBrowserRun, recordResearchPlaytest, recordResearchProbeRun, researchBrowserRunInputSchema, researchPlaytestInputSchema, researchProbeRunInputSchema, researchPrototypeEvaluationSchema, researchResourceGapSummarySchema, type ResearchEvaluationReadiness, type ResearchPrototypeEvaluation } from "./research-evaluation.js";
export { createResearchResourceAcquisitionPlan, researchResourceAcquisitionPlanSchema, type ResearchResourceAcquisitionPlan } from "./research-resource-acquisition.js";
export { createResearchResourceAcquisitionTask, submitResearchResourceAcquisitionWork, reviewResearchResourceAcquisitionWork, researchResourceAcquisitionTaskSchema, researchResourceAcquisitionWorkItemSchema, researchResourceEvidenceSchema, researchResourceSubmissionInputSchema, researchResourceReviewInputSchema, type ResearchResourceAcquisitionTask, type ResearchResourceSubmissionInput, type ResearchResourceReviewInput } from "./research-resource-acquisition-task.js";
export { researchResourceIntakeBatchSchema, researchResourceIntakeItemSchema, researchResourceVersionSchema, researchResourceSecurityReviewInputSchema, reviewResearchResourceIntakeBatch, type ResearchResourceIntakeBatch, type ResearchResourceSecurityReviewInput } from "./research-resource-intake.js";
export { createDesignKnowledgeShadow, designKnowledgeShadowSchema, type DesignKnowledgeShadow } from "./shadow.js";
export { PUZZLE_DESIGN_GUIDELINES, puzzleDesignGuidelineSchema, puzzleGuidelinesFor, validatePuzzleDesignGuidelines, type PuzzleDesignGuideline } from "./puzzle-guidelines.js";
