import {
  ENGINE_HARD_GATES,
  ENGINE_SCORE_DIMENSIONS,
  type EngineAssessmentInput,
  type EngineAssessmentResult,
  type EngineHardGateId,
  type EngineScoreDimensionId,
} from "./types.js";

function assertCompleteKeys(label: string, expected: readonly string[], actual: string[]) {
  const missing = expected.filter((id) => !actual.includes(id));
  const extra = actual.filter((id) => !expected.includes(id));
  if (missing.length || extra.length) throw new Error(`${label}不完整；缺少 [${missing.join(", ")}]，多出 [${extra.join(", ")}]`);
}

export function scoreEngineAssessment(input: EngineAssessmentInput): EngineAssessmentResult {
  const dimensionIds = ENGINE_SCORE_DIMENSIONS.map(({ id }) => id);
  const gateIds = ENGINE_HARD_GATES.map(({ id }) => id);
  assertCompleteKeys("评分维度", dimensionIds, Object.keys(input.dimensions));
  assertCompleteKeys("硬门禁", gateIds, Object.keys(input.gates));
  if (!/^\d+\.\d+\.\d+(?:[-+].+)?$/.test(input.engineVersion)) throw new Error(`引擎版本必须是可冻结的完整版本：${input.engineVersion}`);
  if (Number.isNaN(Date.parse(input.evaluatedAt))) throw new Error(`评估时间无效：${input.evaluatedAt}`);

  let weightedScore = 0;
  for (const dimension of ENGINE_SCORE_DIMENSIONS) {
    const assessment = input.dimensions[dimension.id];
    if (!Number.isFinite(assessment.score) || assessment.score < 0 || assessment.score > 100) {
      throw new Error(`${dimension.id} 评分必须在 0 到 100 之间`);
    }
    if (assessment.evidence.length === 0) throw new Error(`${dimension.id} 缺少证据`);
    weightedScore += assessment.score * dimension.weight / 100;
  }
  weightedScore = Math.round(weightedScore * 10) / 10;

  const failedGateIds = gateIds.filter((id) => input.gates[id].status === "fail") as EngineHardGateId[];
  const unresolvedGateIds = gateIds.filter((id) => input.gates[id].status === "unknown") as EngineHardGateId[];
  gateIds.forEach((id) => {
    if (input.gates[id].evidence.length === 0) throw new Error(`${id} 门禁缺少证据`);
  });
  const allHardGatesPassed = failedGateIds.length === 0 && unresolvedGateIds.length === 0;
  const adoptionEligible = weightedScore >= 80 && allHardGatesPassed;
  const recommendation = failedGateIds.length > 0
    ? "reject" as const
    : unresolvedGateIds.length > 0
      ? "evaluate" as const
      : adoptionEligible
        ? "adopt" as const
        : "observe" as const;

  return { ...input, weightedScore, allHardGatesPassed, failedGateIds, unresolvedGateIds, recommendation, adoptionEligible };
}

export function emptyDimensionAssessments(score = 0) {
  return Object.fromEntries(ENGINE_SCORE_DIMENSIONS.map(({ id }) => [id, { score, evidence: ["尚未收集"] }])) as Record<EngineScoreDimensionId, { score: number; evidence: string[] }>;
}

export function unknownGateAssessments() {
  return Object.fromEntries(ENGINE_HARD_GATES.map(({ id }) => [id, { status: "unknown", evidence: ["尚未验证"] }])) as EngineAssessmentInput["gates"];
}
