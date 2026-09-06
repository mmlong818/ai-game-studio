import { z } from "zod";
import { gameMechanicSchema, playPatternSchema } from "../shared/game-design-knowledge/index.js";
import { referenceSourceSchema, researchCandidateDraftSchema, researchSynthesisSchema, type GameResearchTask } from "../shared/game-design-knowledge/research-queue.js";
import { researchBrowserRunInputSchema, researchPlaytestInputSchema, researchProbeRunInputSchema } from "../shared/game-design-knowledge/research-evaluation.js";
import { researchResourceReviewInputSchema, researchResourceSubmissionInputSchema } from "../shared/game-design-knowledge/research-resource-acquisition-task.js";
import { researchResourceSecurityReviewInputSchema } from "../shared/game-design-knowledge/research-resource-intake.js";

export const designKnowledgeReviewOptionsSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  minimumPlayers: z.number().int().min(1).max(100_000).optional(),
  minimumStarts: z.number().int().min(1).max(100_000).optional(),
}).strict();

export const designKnowledgeDecisionInputSchema = z.object({
  patternId: z.string().min(1).max(120),
  outcome: z.enum(["retain", "promote", "demote", "retest"]),
  rationale: z.string().trim().min(8).max(1_000),
  evidence: z.array(z.enum(["telemetry", "playtest", "contract", "solver", "browser"]))
    .min(1)
    .max(5)
    .transform((items) => [...new Set(items)]),
}).strict();

export const designPlaytestInputSchema = z.object({
  projectId: z.string().uuid(),
  versionId: z.string().uuid(),
  testerSegment: z.enum(["novice", "casual", "experienced", "expert"]),
  deviceClass: z.enum(["desktop", "mobile", "tablet"]),
  inputMode: z.enum(["keyboard", "pointer", "touch", "gamepad"]),
  taskOutcome: z.enum(["completed", "partial", "blocked", "abandoned"]),
  onboardingClarity: z.number().int().min(1).max(5),
  controlClarity: z.number().int().min(1).max(5),
  perceivedDifficulty: z.number().int().min(1).max(5),
  funRating: z.number().int().min(1).max(5),
  fairnessRating: z.number().int().min(1).max(5),
  wouldReplay: z.boolean(),
  completionSeconds: z.number().int().min(1).max(86_400).nullable().optional(),
  hintCount: z.number().int().min(0).max(999).default(0),
  blockerCode: z.enum(["none", "onboarding", "controls", "rules", "difficulty", "resource", "performance", "accessibility"]),
}).strict().superRefine((input, context) => {
  if (input.taskOutcome === "completed" && input.blockerCode !== "none") {
    context.addIssue({ code: "custom", path: ["blockerCode"], message: "完成任务的试玩记录不能同时标记阻塞原因。" });
  }
  if (input.taskOutcome !== "completed" && input.blockerCode === "none") {
    context.addIssue({ code: "custom", path: ["blockerCode"], message: "未完成任务时必须选择具体阻塞原因。" });
  }
});

export const designKnowledgeChangeSetReviewInputSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  rationale: z.string().trim().min(8).max(1_000),
}).strict();

export const designKnowledgeRollbackInputSchema = z.object({
  sourceReleaseId: z.string().uuid(),
  rationale: z.string().trim().min(8).max(1_000),
}).strict();

export const designResearchCreateInputSchema = z.object({
  idea: z.string().trim().min(3).max(500),
  dimensions: z.enum(["2d", "limited-3d"]).optional(),
  input: z.enum(["keyboard", "pointer", "touch", "gamepad"]).optional(),
  targetMinutes: z.number().positive().max(240).optional(),
}).strict();
export const designResearchSourceInputSchema = referenceSourceSchema;
export const designResearchSynthesisInputSchema = researchSynthesisSchema;
export const designResearchCandidateInputSchema = researchCandidateDraftSchema;
export const designResearchProbeRunInputSchema = researchProbeRunInputSchema;
export const designResearchBrowserRunInputSchema = researchBrowserRunInputSchema;
export const designResearchPlaytestInputSchema = researchPlaytestInputSchema;
export const designResearchDecisionInputSchema = z.object({
  outcome: z.enum(["candidate-pattern", "candidate-mechanic", "no-adoption"]),
  rationale: z.string().trim().min(8).max(500),
}).strict();
export const designResearchResourceSubmissionInputSchema = researchResourceSubmissionInputSchema;
export const designResearchResourceReviewInputSchema = researchResourceReviewInputSchema;
export const designResearchResourceSecurityReviewInputSchema = researchResourceSecurityReviewInputSchema;

export type DesignKnowledgeReviewOptions = z.infer<typeof designKnowledgeReviewOptionsSchema>;
export type DesignKnowledgeDecisionInput = z.infer<typeof designKnowledgeDecisionInputSchema>;
export type DesignPlaytestInput = z.infer<typeof designPlaytestInputSchema>;
export type DesignKnowledgeChangeSetReviewInput = z.infer<typeof designKnowledgeChangeSetReviewInputSchema>;
export type DesignKnowledgeRollbackInput = z.infer<typeof designKnowledgeRollbackInputSchema>;
export type DesignResearchCreateInput = z.infer<typeof designResearchCreateInputSchema>;
export type DesignResearchSourceInput = z.infer<typeof designResearchSourceInputSchema>;
export type DesignResearchSynthesisInput = z.infer<typeof designResearchSynthesisInputSchema>;
export type DesignResearchCandidateInput = z.infer<typeof designResearchCandidateInputSchema>;
export type DesignResearchProbeRunInput = z.infer<typeof designResearchProbeRunInputSchema>;
export type DesignResearchBrowserRunInput = z.infer<typeof designResearchBrowserRunInputSchema>;
export type DesignResearchPlaytestInput = z.infer<typeof designResearchPlaytestInputSchema>;
export type DesignResearchDecisionInput = z.infer<typeof designResearchDecisionInputSchema>;
export type DesignResearchResourceSubmissionInput = z.infer<typeof designResearchResourceSubmissionInputSchema>;
export type DesignResearchResourceReviewInput = z.infer<typeof designResearchResourceReviewInputSchema>;
export type DesignResearchResourceSecurityReviewInput = z.infer<typeof designResearchResourceSecurityReviewInputSchema>;
export type { GameResearchTask };

export type DesignKnowledgeDecision = DesignKnowledgeDecisionInput & {
  id: string;
  reviewId: string;
  decidedAt: string;
};

export type DesignPlaytest = DesignPlaytestInput & {
  id: string;
  patternId: string;
  createdAt: string;
};

export type DesignKnowledgeChangeSet = {
  id: string;
  reviewId: string | null;
  researchTaskId: string | null;
  schemaVersion: "design-knowledge-change-set-v1" | "design-knowledge-change-set-v2";
  base: { schemaVersion: "game-design-knowledge-v1"; updatedAt: string; evaluationVersion: number; releaseId: string | null };
  changes: Array<{
    patternId: string;
    fromLifecycle: "candidate" | "verified" | "deprecated";
    toLifecycle: "candidate" | "verified" | "deprecated";
    fromEvaluationVersion: number;
    toEvaluationVersion: number;
    decisionId: string;
    rationale: string;
    evidence: DesignKnowledgeDecision["evidence"];
  } | { kind: "add-mechanic"; mechanic: z.infer<typeof gameMechanicSchema> }
    | { kind: "add-pattern"; pattern: z.infer<typeof playPatternSchema> }>;
  status: "pending" | "approved" | "rejected" | "published";
  reviewRationale: string | null;
  reviewedAt: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

export type DesignKnowledgeRelease = {
  id: string;
  sequence: number;
  kind: "change-set" | "rollback";
  changeSetId: string | null;
  rollbackSourceReleaseId: string | null;
  rationale: string | null;
  schemaVersion: "game-design-knowledge-v1";
  checksum: string;
  supersedesReleaseId: string | null;
  publishedAt: string;
};

export type DesignKnowledgeInsightSummary = {
  sampleCount: number;
  completionRate: number;
  replayRate: number;
  ratings: {
    onboardingClarity: number;
    controlClarity: number;
    perceivedDifficulty: number;
    funRating: number;
    fairnessRating: number;
  };
  blockers: Record<string, number>;
};

export type DesignKnowledgeInsights = {
  generatedAt: string;
  trends: Array<{
    patternId: string;
    label: string;
    points: Array<{
      reviewId: string;
      capturedAt: string;
      window: { from: string; to: string };
      completionRate: number;
      exitRate: number;
      starts: number;
      recommendation: string;
    }>;
  }>;
  playtests: Array<{
    patternId: string;
    overall: DesignKnowledgeInsightSummary;
    byTesterSegment: Record<string, DesignKnowledgeInsightSummary>;
    byDeviceClass: Record<string, DesignKnowledgeInsightSummary>;
    byInputMode: Record<string, DesignKnowledgeInsightSummary>;
  }>;
};
