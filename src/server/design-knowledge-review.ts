import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "../shared/game-design-knowledge/catalog.js";
import type { GameSpec } from "../shared/contracts.js";
import type { StudioDatabase } from "./database.js";
import type { DesignKnowledgeReviewOptions } from "./design-knowledge-evidence.js";
import type { GameDesignKnowledgeLibrary } from "../shared/game-design-knowledge/index.js";

type PlayEventRow = {
  version_id: string;
  player_id: string;
  event_type: "start" | "complete" | "fail" | "exit" | "resource-error";
  input_mode: string;
  average_fps: number | string | null;
  created_at: string | Date;
  spec_json: string | GameSpec;
};

export type DesignKnowledgeReviewRecommendation = "insufficient-evidence" | "retain" | "promotion-review" | "manual-review" | "demotion-review";

export type DesignKnowledgeReviewReport = {
  schemaVersion: "design-knowledge-review-v2";
  generatedAt: string;
  window: { from: string; to: string };
  knowledgeBase: { schemaVersion: "game-design-knowledge-v1"; updatedAt: string; evaluationVersion: number; releaseId: string | null };
  evidenceThresholds: { minimumPlayers: number; minimumStarts: number };
  privacy: { aggregateOnly: true; playerIdentifiersIncluded: false; freeTextIncluded: false };
  patterns: Array<{
    patternId: string;
    label: string;
    currentLifecycle: "candidate" | "verified" | "deprecated";
    evaluationVersion: number;
    samples: { distinctPlayers: number; versions: number; starts: number };
    events: { completes: number; failures: number; exits: number; resourceErrors: number };
    metrics: { completionRate: number; failureRate: number; exitRate: number; resourceErrorRate: number; averageFps: number | null; inputModes: Record<string, number> };
    recommendation: DesignKnowledgeReviewRecommendation;
    rationale: string;
  }>;
  unassignedEvents: number;
  limitations: string[];
};

const rounded = (value: number) => Number(value.toFixed(3));

export function knowledgePatternIdForSpec(spec: GameSpec, library: GameDesignKnowledgeLibrary = GAME_DESIGN_KNOWLEDGE_LIBRARY): string | null {
  const patternId = spec.designKnowledge?.plan.selectedPatternId ?? spec.designContract?.knowledge.patternIds[0] ?? null;
  return patternId && library.patterns.some(({ id }) => id === patternId) ? patternId : null;
}

function recommendationFor(input: {
  lifecycle: "candidate" | "verified" | "deprecated";
  players: number;
  starts: number;
  minimumPlayers: number;
  minimumStarts: number;
  completionRate: number;
  failureRate: number;
  exitRate: number;
  resourceErrorRate: number;
  averageFps: number | null;
}): { recommendation: DesignKnowledgeReviewRecommendation; rationale: string } {
  if (input.players < input.minimumPlayers || input.starts < input.minimumStarts) {
    return { recommendation: "insufficient-evidence", rationale: `仅有 ${input.players} 名匿名玩家和 ${input.starts} 次开始，未达到 ${input.minimumPlayers}/${input.minimumStarts} 的复核样本门槛。` };
  }
  const technicalFailure = input.resourceErrorRate > .1 || (input.averageFps !== null && input.averageFps < 40);
  const severeAbandonment = input.completionRate < .2 && input.failureRate + input.exitRate > .7;
  if (technicalFailure || severeAbandonment) {
    return { recommendation: "demotion-review", rationale: technicalFailure ? "资源错误率或平均帧率触发技术硬风险，需人工复核并重跑浏览器证据。" : "完成率偏低且失败/退出集中，需复核教学、公平性和难度断崖。" };
  }
  if (input.lifecycle === "candidate" && input.completionRate >= .5 && input.resourceErrorRate <= .02 && (input.averageFps === null || input.averageFps >= 50)) {
    return { recommendation: "promotion-review", rationale: "匿名运行质量达到候选晋级复核条件；仍需真人试玩、规则和公平性证据，不能自动升级。" };
  }
  if (input.lifecycle === "verified" && input.completionRate >= .35 && input.exitRate <= .4) {
    return { recommendation: "retain", rationale: "匿名完成、退出和技术指标未触发复核风险，保留当前等级并等待下一周期证据。" };
  }
  return { recommendation: "manual-review", rationale: "数据没有触发硬风险，但不足以支持自动结论；需结合试玩、合同、求解器和浏览器证据判断。" };
}

export async function buildDesignKnowledgeReview(
  database: StudioDatabase,
  options: DesignKnowledgeReviewOptions = {},
  library: GameDesignKnowledgeLibrary = GAME_DESIGN_KNOWLEDGE_LIBRARY,
  releaseId: string | null = null,
): Promise<DesignKnowledgeReviewReport> {
  const to = options.to ?? new Date();
  const from = options.from ?? new Date(to.getTime() - 90 * 86_400_000);
  const minimumPlayers = options.minimumPlayers ?? 20;
  const minimumStarts = options.minimumStarts ?? 20;
  if (from >= to) throw new Error("玩法复核时间范围无效：开始时间必须早于结束时间。");
  const rows = (await database.query<PlayEventRow>(
    `SELECT pe.version_id, pe.player_id, pe.event_type, pe.input_mode, pe.average_fps, pe.created_at, gs.spec_json
     FROM play_events pe
     JOIN versions v ON v.id = pe.version_id
     JOIN game_specs gs ON gs.id = v.spec_id
     WHERE pe.created_at >= $1 AND pe.created_at < $2
     ORDER BY pe.created_at`,
    [from.toISOString(), to.toISOString()],
  )).rows;
  const grouped = new Map<string, { players: Set<string>; versions: Set<string>; starts: number; completes: number; failures: number; exits: number; resourceErrors: number; fps: number[]; inputModes: Record<string, number> }>();
  let unassignedEvents = 0;
  for (const row of rows) {
    const spec = typeof row.spec_json === "string" ? JSON.parse(row.spec_json) as GameSpec : row.spec_json;
    const patternId = knowledgePatternIdForSpec(spec, library);
    if (!patternId) { unassignedEvents += 1; continue; }
    const bucket = grouped.get(patternId) ?? { players: new Set<string>(), versions: new Set<string>(), starts: 0, completes: 0, failures: 0, exits: 0, resourceErrors: 0, fps: [], inputModes: {} };
    bucket.players.add(row.player_id); bucket.versions.add(row.version_id);
    if (row.event_type === "start") bucket.starts += 1;
    if (row.event_type === "complete") bucket.completes += 1;
    if (row.event_type === "fail") bucket.failures += 1;
    if (row.event_type === "exit") bucket.exits += 1;
    if (row.event_type === "resource-error") bucket.resourceErrors += 1;
    const fps = row.average_fps === null ? null : Number(row.average_fps);
    if (fps !== null && Number.isFinite(fps)) bucket.fps.push(fps);
    bucket.inputModes[row.input_mode] = (bucket.inputModes[row.input_mode] ?? 0) + 1;
    grouped.set(patternId, bucket);
  }
  const patterns = [...grouped.entries()].map(([patternId, bucket]) => {
    const pattern = library.patterns.find(({ id }) => id === patternId)!;
    const denominator = Math.max(1, bucket.starts);
    const metrics = {
      completionRate: rounded(Math.min(1, bucket.completes / denominator)),
      failureRate: rounded(Math.min(1, bucket.failures / denominator)),
      exitRate: rounded(Math.min(1, bucket.exits / denominator)),
      resourceErrorRate: rounded(Math.min(1, bucket.resourceErrors / denominator)),
      averageFps: bucket.fps.length ? rounded(bucket.fps.reduce((sum, value) => sum + value, 0) / bucket.fps.length) : null,
      inputModes: Object.fromEntries(Object.entries(bucket.inputModes).sort(([left], [right]) => left.localeCompare(right))),
    };
    const decision = recommendationFor({ lifecycle: pattern.lifecycle, players: bucket.players.size, starts: bucket.starts, minimumPlayers, minimumStarts, ...metrics });
    return { patternId, label: pattern.label, currentLifecycle: pattern.lifecycle, evaluationVersion: pattern.evaluationVersion, samples: { distinctPlayers: bucket.players.size, versions: bucket.versions.size, starts: bucket.starts }, events: { completes: bucket.completes, failures: bucket.failures, exits: bucket.exits, resourceErrors: bucket.resourceErrors }, metrics, ...decision };
  }).sort((left, right) => left.patternId.localeCompare(right.patternId));
  return {
    schemaVersion: "design-knowledge-review-v2",
    generatedAt: to.toISOString(),
    window: { from: from.toISOString(), to: to.toISOString() },
    knowledgeBase: { schemaVersion: library.schemaVersion, updatedAt: library.updatedAt, evaluationVersion: library.evaluation.version, releaseId },
    evidenceThresholds: { minimumPlayers, minimumStarts },
    privacy: { aggregateOnly: true, playerIdentifiersIncluded: false, freeTextIncluded: false },
    patterns,
    unassignedEvents,
    limitations: ["匿名完成率不能证明乐趣、公平性或教学理解。", "任何晋级或降级建议都必须结合合同、求解器、浏览器和真人试玩证据后人工决定。"],
  };
}
