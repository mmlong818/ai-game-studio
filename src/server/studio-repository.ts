import { createHash, randomUUID } from "node:crypto";
import { OFFICIAL_GAMES, type OfficialGameDefinition } from "../shared/official-games/index.js";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "../shared/game-design-knowledge/catalog.js";
import { validateGameDesignKnowledgeLibrary, type GameDesignKnowledgeLibrary } from "../shared/game-design-knowledge/index.js";
import { createDesignKnowledgeShadow, type DesignKnowledgeShadow } from "../shared/game-design-knowledge/shadow.js";
import { integrateGameDesign } from "../shared/game-design-knowledge/integrator.js";
import { addResearchSource, attachResearchCandidate, createGameResearchTask, decideResearchTask, gameResearchTaskSchema, submitResearchSynthesis, type GameResearchTask } from "../shared/game-design-knowledge/research-queue.js";
import { createResearchPrototypeEvaluation, recordResearchBrowserRun, recordResearchPlaytest, recordResearchProbeRun } from "../shared/game-design-knowledge/research-evaluation.js";
import { createResearchResourceAcquisitionTask, reviewResearchResourceAcquisitionWork, submitResearchResourceAcquisitionWork } from "../shared/game-design-knowledge/research-resource-acquisition-task.js";
import { researchResourceIntakeBatchSchema, reviewResearchResourceIntakeBatch } from "../shared/game-design-knowledge/research-resource-intake.js";
import { initialDesignResearchTasks } from "../shared/game-design-knowledge/research-seeds.js";
import { buildGameplayRadarView, createGameplayRadarCluster, createRadarResearchTask, gameplayRadarClusterSchema, gameplayRadarResearchInputSchema, gameplaySignalSchema, linkGameplayRadarResearch, mergeGameplaySignal, normalizeGameplayTitle, type GameplayRadarCluster } from "../shared/game-design-knowledge/gameplay-radar.js";
import { INITIAL_GAMEPLAY_RADAR_SIGNALS } from "../shared/game-design-knowledge/gameplay-radar-seeds.js";
import { createGameDesignContractForLegacyProject } from "../shared/game-design-contract/from-legacy.js";
import type { ResourcePlanningShadow } from "../shared/resource-planning/index.js";
import { resourceFamilySchema, type ResourceFamily } from "../shared/resource-library/index.js";
import type { StudioDatabase } from "./database.js";
import { buildDesignKnowledgeReview, knowledgePatternIdForSpec, type DesignKnowledgeReviewReport } from "./design-knowledge-review.js";
import {
  designKnowledgeDecisionInputSchema,
  designKnowledgeChangeSetReviewInputSchema,
  designKnowledgeRollbackInputSchema,
  designResearchCandidateInputSchema,
  designResearchBrowserRunInputSchema,
  designResearchCreateInputSchema,
  designResearchDecisionInputSchema,
  designResearchPlaytestInputSchema,
  designResearchProbeRunInputSchema,
  designResearchSourceInputSchema,
  designResearchSynthesisInputSchema,
  designKnowledgeReviewOptionsSchema,
  designPlaytestInputSchema,
  type DesignKnowledgeDecision,
  type DesignKnowledgeChangeSet,
  type DesignKnowledgeRelease,
  type DesignKnowledgeInsights,
  type DesignKnowledgeInsightSummary,
  type DesignPlaytest,
} from "./design-knowledge-evidence.js";
import { officialFixtures } from "./official-fixtures.js";
import {
  buildSchema,
  gameSpecSchema,
  generateGameSpec,
  projectDetailSchema,
  projectInputSchema,
  projectMessageInputSchema,
  projectRevisionInputSchema,
  projectMessageSchema,
  playActivitySchema,
  playEventInputSchema,
  projectSummarySchema,
  projectVersionSchema,
  versionArtReviewInputSchema,
  versionQualityReportSchema,
  type Build,
  type GameSpec,
  type GameDesignProfile,
  type IdeaAnalysis,
  type ProjectDetail,
  type ProjectInput,
  type ProjectMessage,
  type ProjectSummary,
  type ProjectVersion,
  type PlayActivity,
  type VersionQualityReport,
} from "../shared/contracts.js";

/**
 * Serializes async work per key inside this single Node process. The production database is
 * PostgreSQL and the test database is node:sqlite in-memory (no SELECT ... FOR UPDATE support),
 * so check-then-act sequences (SELECT MAX(number) then INSERT, SELECT-then-INSERT for slugs, etc.)
 * are made race-free by chaining callers for the same key rather than relying on row locks.
 */
class KeyedMutex {
  private readonly tails = new Map<string, Promise<void>>();

  run<T>(key: string, action: () => Promise<T>): Promise<T> {
    const previous = this.tails.get(key) ?? Promise.resolve();
    const result = previous.then(action, action);
    const tracked = result.then(() => undefined, () => undefined);
    this.tails.set(key, tracked);
    tracked.finally(() => {
      if (this.tails.get(key) === tracked) this.tails.delete(key);
    });
    return result;
  }
}

const SLUG_LOCK_KEY = "slug";

type DateValue = string | Date;
type DesignReviewRow = {
  id: string;
  schema_version: string;
  window_from: DateValue;
  window_to: DateValue;
  minimum_players: number | string;
  minimum_starts: number | string;
  report_json: string | DesignKnowledgeReviewReport;
  created_at: DateValue;
};
type DesignDecisionRow = {
  id: string;
  review_id: string;
  pattern_id: string;
  outcome: DesignKnowledgeDecision["outcome"];
  rationale: string;
  evidence_json: string | DesignKnowledgeDecision["evidence"];
  decided_at: DateValue;
};
type DesignPlaytestRow = {
  id: string;
  project_id: string;
  version_id: string;
  pattern_id: string;
  tester_segment: DesignPlaytest["testerSegment"];
  device_class: DesignPlaytest["deviceClass"];
  input_mode: DesignPlaytest["inputMode"];
  task_outcome: DesignPlaytest["taskOutcome"];
  onboarding_clarity: number | string;
  control_clarity: number | string;
  perceived_difficulty: number | string;
  fun_rating: number | string;
  fairness_rating: number | string;
  would_replay: boolean | number;
  completion_seconds: number | string | null;
  hint_count: number | string;
  blocker_code: DesignPlaytest["blockerCode"];
  created_at: DateValue;
};
type DesignChangeSetRow = {
  id: string;
  review_id: string | null;
  research_task_id: string | null;
  schema_version: DesignKnowledgeChangeSet["schemaVersion"];
  base_schema_version: DesignKnowledgeChangeSet["base"]["schemaVersion"];
  base_updated_at: string;
  base_evaluation_version: number | string;
  base_release_id: string | null;
  changes_json: string | DesignKnowledgeChangeSet["changes"];
  status: DesignKnowledgeChangeSet["status"];
  review_rationale: string | null;
  reviewed_at: DateValue | null;
  created_at: DateValue;
  resolved_at: DateValue | null;
};
type DesignResearchRow = {
  id: string;
  schema_version: GameResearchTask["schemaVersion"];
  task_json: string | GameResearchTask;
  status: GameResearchTask["status"];
  created_at: DateValue;
  updated_at: DateValue;
};
type GameplayRadarRow = {
  id: string;
  schema_version: GameplayRadarCluster["schemaVersion"];
  normalized_title: string;
  cluster_json: string | GameplayRadarCluster;
  state: GameplayRadarCluster["state"];
  created_at: DateValue;
  updated_at: DateValue;
};
type DesignKnowledgeReleaseRow = {
  id: string;
  sequence: number | string;
  release_kind: DesignKnowledgeRelease["kind"];
  change_set_id: string | null;
  rollback_source_release_id: string | null;
  rationale: string | null;
  schema_version: DesignKnowledgeRelease["schemaVersion"];
  library_json: string | GameDesignKnowledgeLibrary;
  checksum: string;
  supersedes_release_id: string | null;
  published_at: DateValue;
};
type ProjectRow = {
  id: string;
  title: string;
  idea: string;
  slug: string;
  dimensions: "2d" | "3d";
  status: "contract_ready" | "playable" | "published";
  fixture_kind: string | null;
  is_official: boolean | number;
  lobby_rank: number | null;
  created_at: DateValue;
  archived_at: DateValue | null;
  version_id: string;
  version_number: number;
  version_label: string;
  version_created_at: DateValue;
  quality_status: ProjectVersion["qualityStatus"];
  quality_summary: string | null;
  quality_checked_at: DateValue | null;
  art_review_status: ProjectVersion["artReviewStatus"];
  art_review_summary: string | null;
  art_reviewed_at: DateValue | null;
  spec_json?: string | GameSpec;
  publication_status: "live" | "offline" | null;
  stable_path: string | null;
  version_path: string | null;
  published_at: DateValue | null;
  published_version_id: string | null;
  published_version_number: number | null;
};

type BuildRow = {
  id: string;
  project_id: string;
  status: Build["status"];
  runtime_target: "web-2d" | "web-3d";
  created_at: DateValue;
  started_at: DateValue | null;
  completed_at: DateValue | null;
  version_id: string | null;
  error_message: string | null;
};

type BuildStepRow = {
  id: string;
  sequence: number;
  kind: Build["steps"][number]["kind"];
  title: string;
  detail: string;
  status: Build["steps"][number]["status"];
  output_text: string | null;
  started_at: DateValue | null;
  completed_at: DateValue | null;
};

type ProjectMessageRow = {
  id: string;
  project_id: string;
  role: ProjectMessage["role"];
  content: string;
  created_at: DateValue;
};

type PlayActivityRow = {
  project_id: string;
  version_id: string;
  status: PlayActivity["status"];
  current_level: number;
  best_score: number;
  input_mode: PlayActivity["inputMode"];
  viewport: string;
  average_fps: number | null;
  resource_error_count: number;
  last_played_at: DateValue;
  completed_at: DateValue | null;
};

const buildPlan = [
  { kind: "analyze", title: "解析玩法合同", detail: "确认核心循环、硬约束与目标运行时。" },
  { kind: "document", title: "写入制作文档", detail: "生成玩法、美术与声音方向，作为后续步骤的公开依据。" },
  // 图片先于代码：代码生成时局内主体位图已经存在，游戏只需绘制这些位图。
  { kind: "asset", title: "生成视听资源", detail: "先生成可追溯的封面、局内背景与局内主体位图。" },
  { kind: "code", title: "生成可玩核心", detail: "写入独立 HTML、样式与游戏逻辑，并接入已生成的位图。" },
  { kind: "test", title: "执行试玩探针", detail: "检查加载、输入、核心循环、结束、重开与脚本错误。" },
  { kind: "delivery", title: "打包不可变版本", detail: "冻结通过检查的文件并生成版本网址。" },
] as const;

const projectSelect = `
  SELECT p.*, v.id AS version_id, v.number AS version_number, v.label AS version_label,
    v.created_at AS version_created_at, v.quality_status, v.quality_summary, v.quality_checked_at,
    v.art_review_status, v.art_review_summary, v.art_reviewed_at,
    gs.spec_json, pub.status AS publication_status, pub.stable_path, pub.version_path, pub.published_at,
    pub.version_id AS published_version_id,
    pv.number AS published_version_number
  FROM projects p
  JOIN versions v ON v.project_id = p.id
    AND v.number = (SELECT MAX(v2.number) FROM versions v2 WHERE v2.project_id = p.id)
  JOIN game_specs gs ON gs.id = v.spec_id
  LEFT JOIN publications pub ON pub.project_id = p.id
  LEFT JOIN versions pv ON pv.id = pub.version_id
`;

function iso(value: DateValue | null) {
  if (value === null) return null;
  return value instanceof Date ? value.toISOString() : value;
}

function toDesignKnowledgeDecision(row: DesignDecisionRow): DesignKnowledgeDecision {
  return {
    id: row.id,
    reviewId: row.review_id,
    patternId: row.pattern_id,
    outcome: row.outcome,
    rationale: row.rationale,
    evidence: typeof row.evidence_json === "string" ? JSON.parse(row.evidence_json) : row.evidence_json,
    decidedAt: iso(row.decided_at)!,
  };
}

function toDesignPlaytest(row: DesignPlaytestRow): DesignPlaytest {
  return {
    id: row.id,
    projectId: row.project_id,
    versionId: row.version_id,
    patternId: row.pattern_id,
    testerSegment: row.tester_segment,
    deviceClass: row.device_class,
    inputMode: row.input_mode,
    taskOutcome: row.task_outcome,
    onboardingClarity: Number(row.onboarding_clarity),
    controlClarity: Number(row.control_clarity),
    perceivedDifficulty: Number(row.perceived_difficulty),
    funRating: Number(row.fun_rating),
    fairnessRating: Number(row.fairness_rating),
    wouldReplay: Boolean(row.would_replay),
    completionSeconds: row.completion_seconds === null ? null : Number(row.completion_seconds),
    hintCount: Number(row.hint_count),
    blockerCode: row.blocker_code,
    createdAt: iso(row.created_at)!,
  };
}

function toDesignKnowledgeChangeSet(row: DesignChangeSetRow): DesignKnowledgeChangeSet {
  return {
    id: row.id,
    reviewId: row.review_id,
    researchTaskId: row.research_task_id,
    schemaVersion: row.schema_version,
    base: {
      schemaVersion: row.base_schema_version,
      updatedAt: row.base_updated_at,
      evaluationVersion: Number(row.base_evaluation_version),
      releaseId: row.base_release_id,
    },
    changes: typeof row.changes_json === "string" ? JSON.parse(row.changes_json) : row.changes_json,
    status: row.status,
    reviewRationale: row.review_rationale,
    reviewedAt: iso(row.reviewed_at),
    createdAt: iso(row.created_at)!,
    resolvedAt: iso(row.resolved_at),
  };
}

function toDesignResearchTask(row: DesignResearchRow): GameResearchTask {
  return gameResearchTaskSchema.parse(typeof row.task_json === "string" ? JSON.parse(row.task_json) : row.task_json);
}

function toGameplayRadarCluster(row: GameplayRadarRow): GameplayRadarCluster {
  return gameplayRadarClusterSchema.parse(typeof row.cluster_json === "string" ? JSON.parse(row.cluster_json) : row.cluster_json);
}

function toDesignKnowledgeRelease(row: DesignKnowledgeReleaseRow): DesignKnowledgeRelease {
  return {
    id: row.id,
    sequence: Number(row.sequence),
    kind: row.release_kind,
    changeSetId: row.change_set_id,
    rollbackSourceReleaseId: row.rollback_source_release_id,
    rationale: row.rationale,
    schemaVersion: row.schema_version,
    checksum: row.checksum,
    supersedesReleaseId: row.supersedes_release_id,
    publishedAt: iso(row.published_at)!,
  };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function knowledgeChecksum(library: GameDesignKnowledgeLibrary) {
  return createHash("sha256").update(canonicalJson(library)).digest("hex");
}

function playtestInsightSummary(items: DesignPlaytest[]): DesignKnowledgeInsightSummary {
  const average = (key: "onboardingClarity" | "controlClarity" | "perceivedDifficulty" | "funRating" | "fairnessRating") => (
    items.length ? Number((items.reduce((sum, item) => sum + item[key], 0) / items.length).toFixed(2)) : 0
  );
  const blockers: Record<string, number> = {};
  for (const item of items) {
    if (item.blockerCode !== "none") blockers[item.blockerCode] = (blockers[item.blockerCode] ?? 0) + 1;
  }
  return {
    sampleCount: items.length,
    completionRate: items.length ? Number((items.filter(({ taskOutcome }) => taskOutcome === "completed").length / items.length).toFixed(3)) : 0,
    replayRate: items.length ? Number((items.filter(({ wouldReplay }) => wouldReplay).length / items.length).toFixed(3)) : 0,
    ratings: {
      onboardingClarity: average("onboardingClarity"),
      controlClarity: average("controlClarity"),
      perceivedDifficulty: average("perceivedDifficulty"),
      funRating: average("funRating"),
      fairnessRating: average("fairnessRating"),
    },
    blockers,
  };
}

function groupedPlaytestInsights(items: DesignPlaytest[], key: "testerSegment" | "deviceClass" | "inputMode") {
  const groups = new Map<string, DesignPlaytest[]>();
  for (const item of items) groups.set(item[key], [...(groups.get(item[key]) ?? []), item]);
  return Object.fromEntries([...groups.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([name, group]) => [name, playtestInsightSummary(group)]));
}

function transitionedLifecycle(
  lifecycle: "candidate" | "verified" | "deprecated",
  outcome: "promote" | "demote",
) {
  if (outcome === "promote") {
    if (lifecycle === "candidate") return "verified" as const;
    if (lifecycle === "deprecated") return "candidate" as const;
    throw new Error("该玩法已经是已验证状态，不能再次晋级。");
  }
  if (lifecycle === "verified") return "candidate" as const;
  if (lifecycle === "candidate") return "deprecated" as const;
  throw new Error("该玩法已经是停用状态，不能再次降级。");
}

function applyDesignKnowledgeChangeSet(library: GameDesignKnowledgeLibrary, activeReleaseId: string | null, changeSet: DesignKnowledgeChangeSet) {
  if (library.schemaVersion !== changeSet.base.schemaVersion
    || library.updatedAt !== changeSet.base.updatedAt
    || library.evaluation.version !== changeSet.base.evaluationVersion
    || activeReleaseId !== changeSet.base.releaseId) {
    throw new Error("待发布变更集的基础知识版本已过期，请重新生成复核快照。");
  }
  const lifecycleChanges = changeSet.changes.filter((change): change is Extract<DesignKnowledgeChangeSet["changes"][number], { patternId: string }> => "patternId" in change);
  const addedMechanics = changeSet.changes.filter((change): change is Extract<DesignKnowledgeChangeSet["changes"][number], { kind: "add-mechanic" }> => "kind" in change && change.kind === "add-mechanic");
  const addedPatterns = changeSet.changes.filter((change): change is Extract<DesignKnowledgeChangeSet["changes"][number], { kind: "add-pattern" }> => "kind" in change && change.kind === "add-pattern");
  const byPattern = new Map(lifecycleChanges.map((change) => [change.patternId, change]));
  const patterns = library.patterns.map((pattern) => {
    const change = byPattern.get(pattern.id);
    if (!change) return pattern;
    if (pattern.lifecycle !== change.fromLifecycle || pattern.evaluationVersion !== change.fromEvaluationVersion) {
      throw new Error(`玩法 ${pattern.id} 的当前状态与待发布变更不一致。`);
    }
    return { ...pattern, lifecycle: change.toLifecycle, evaluationVersion: change.toEvaluationVersion };
  });
  if (byPattern.size !== lifecycleChanges.length || [...byPattern.keys()].some((patternId) => !library.patterns.some(({ id }) => id === patternId))) {
    throw new Error("待发布变更集包含知识库中不存在的玩法。");
  }
  if (addedMechanics.some(({ mechanic }) => library.mechanics.some(({ id }) => id === mechanic.id))
    || addedPatterns.some(({ pattern }) => library.patterns.some(({ id }) => id === pattern.id))) {
    throw new Error("待发布研究候选与当前知识库 ID 冲突，请重新评审候选命名。");
  }
  const updatedAt = (changeSet.reviewedAt ?? changeSet.createdAt).slice(0, 10);
  const candidate = {
    ...library,
    updatedAt,
    mechanics: [...library.mechanics, ...addedMechanics.map(({ mechanic }) => mechanic)],
    patterns: [...patterns, ...addedPatterns.map(({ pattern }) => pattern)],
  };
  const validated = validateGameDesignKnowledgeLibrary(candidate);
  if (!validated.valid || !validated.library) {
    const errors = validated.gaps.filter(({ severity }) => severity === "error").map(({ message }) => message).join("；");
    throw new Error(`待发布知识版本未通过完整性校验：${errors}`);
  }
  return validated.library;
}

function originWithoutSlash(origin: string) {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

// 游戏产物 URL(封面、稳定网址、版本网址、预览)统一走 gameOrigin,
// 与工作台 API 的 publicOrigin 分离,让 iframe 试玩获得真实跨源隔离。
function toSummary(row: ProjectRow, gameOrigin: string): ProjectSummary {
  const origin = originWithoutSlash(gameOrigin);
  const lobbyCover = row.is_official ? OFFICIAL_GAMES.find(game => matchesOfficialGame(row, game))?.lobbyCover : undefined;
  const spec = typeof row.spec_json === "string" ? JSON.parse(row.spec_json) as GameSpec : row.spec_json;
  return projectSummarySchema.parse({
    id: row.id,
    title: row.title,
    idea: row.idea,
    slug: row.slug,
    dimensions: row.dimensions,
    template: spec?.template ?? "signal-hunt",
    visualStyle: spec?.visualStyle ?? "cute",
    difficulty: spec?.difficulty ?? "standard",
    aspectRatio: spec?.aspectRatio ?? "9:16",
    sessionLength: spec?.designProfile.sessionLength ?? "2–5 分钟",
    inputModes: spec?.inputModes ?? ["keyboard", "touch"],
    status: row.status,
    fixtureKind: row.fixture_kind,
    threeMode: spec?.threeMode ?? null,
    isOfficial: Boolean(row.is_official),
    coverUrl: lobbyCover ? `${origin}/media/official-cover/${lobbyCover.split('/').pop()}` : row.publication_status && row.stable_path
      ? `${origin}${row.stable_path}assets/cover.png`
      // A verified private build is already an artifact, not a publication.
      // Never invent a template cover or require publishing just to see its art.
      : row.quality_status === "passed"
        ? `${origin}/version/${row.version_id}/assets/cover.png`
        : null,
    createdAt: iso(row.created_at),
    archivedAt: iso(row.archived_at),
    version: {
      id: row.version_id,
      number: row.version_number,
      label: row.version_label,
      createdAt: iso(row.version_created_at),
      qualityStatus: row.quality_status,
      qualitySummary: row.quality_summary,
      qualityCheckedAt: iso(row.quality_checked_at),
      artReviewStatus: row.art_review_status,
      artReviewSummary: row.art_review_summary,
      artReviewedAt: iso(row.art_reviewed_at),
    },
    publication: row.publication_status && row.stable_path && row.version_path && row.published_at
      ? {
          status: row.publication_status,
          stableUrl: `${origin}${row.stable_path}`,
          versionUrl: `${origin}${row.version_path}`,
          versionId: row.published_version_id,
          versionNumber: row.published_version_number,
          publishedAt: iso(row.published_at),
        }
      : null,
  });
}

function toBuild(row: BuildRow, steps: BuildStepRow[], gameOrigin: string): Build {
  const origin = originWithoutSlash(gameOrigin);
  return buildSchema.parse({
    id: row.id,
    projectId: row.project_id,
    status: row.status,
    runtimeTarget: row.runtime_target,
    createdAt: iso(row.created_at),
    startedAt: iso(row.started_at),
    completedAt: iso(row.completed_at),
    versionId: row.version_id,
    previewUrl: row.version_id ? `${origin}/version/${row.version_id}/` : null,
    error: row.error_message,
    steps: steps.map((step) => ({
      id: step.id,
      sequence: step.sequence,
      kind: step.kind,
      title: step.title,
      detail: step.detail,
      status: step.status,
      output: step.output_text,
      startedAt: iso(step.started_at),
      completedAt: iso(step.completed_at),
    })),
  });
}

function slugBase(title: string) {
  const ascii = title.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 42);
  return ascii || `game-${randomUUID().slice(0, 8)}`;
}

function messageFocus(content: string) {
  if (/难度|太难|太简单|节奏|时间|数值/.test(content)) return "难度与节奏";
  if (/画面|风格|颜色|美术|UI|界面/.test(content)) return "美术与界面";
  if (/声音|音乐|音效/.test(content)) return "声音反馈";
  if (/操作|手感|键盘|触控|移动/.test(content)) return "操作与手感";
  if (/规则|胜利|失败|得分|玩法/.test(content)) return "玩法规则";
  return "下一版需求";
}

function toProjectMessage(row: ProjectMessageRow) {
  return projectMessageSchema.parse({
    id: row.id,
    projectId: row.project_id,
    role: row.role,
    content: row.content,
    createdAt: iso(row.created_at),
  });
}

async function uniqueSlug(database: StudioDatabase, title: string) {
  const base = slugBase(title);
  let candidate = base;
  let suffix = 2;
  while ((await database.query("SELECT 1 FROM projects WHERE slug = $1", [candidate])).rowCount > 0) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

async function insertProject(
  database: StudioDatabase,
  input: ProjectInput,
  spec: GameSpec,
  fixtureKind: string | null = null,
  preferredSlug?: string,
  isOfficial = false,
  preferredProjectId?: string,
) {
  const now = new Date().toISOString();
  const officialValue = database.provider === "sqlite-test" ? Number(isOfficial) : isOfficial;
  const projectId = preferredProjectId ?? randomUUID();
  const specId = randomUUID();
  const versionId = randomUUID();
  const slug = preferredSlug ?? await uniqueSlug(database, spec.title);
  await database.transaction(async (transaction) => {
    await transaction.query(
      `INSERT INTO projects (id, title, idea, slug, dimensions, status, fixture_kind, is_official, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [projectId, spec.title, input.idea, slug, spec.dimensions, fixtureKind ? "playable" : "contract_ready", fixtureKind, officialValue, now],
    );
    await transaction.query(
      "INSERT INTO game_specs (id, project_id, spec_json, created_at) VALUES ($1, $2, $3, $4)",
      [specId, projectId, JSON.stringify(spec), now],
    );
    await transaction.query(
      `INSERT INTO versions (id, project_id, spec_id, number, label, quality_status, quality_summary, quality_checked_at,
         art_review_status, art_review_summary, art_reviewed_at, created_at)
       VALUES ($1, $2, $3, 1, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [versionId, projectId, specId, fixtureKind ? "黄金版本" : "初始玩法合同", fixtureKind ? "passed" : "pending", fixtureKind ? "内置黄金游戏已通过固定验收。" : null, fixtureKind ? now : null, fixtureKind ? "passed" : "pending", fixtureKind ? "内置黄金游戏已通过主美基线复核。" : null, fixtureKind ? now : null, now],
    );
  });
  return projectId;
}

/** 一条已发布项目是否就是登记表里的这款官方游戏。 */
function matchesOfficialGame(row: ProjectRow, game: OfficialGameDefinition) {
  if (game.kind === "fixture") return row.fixture_kind === game.fixtureKind;
  if (row.fixture_kind) return false;
  const spec = typeof row.spec_json === "string" ? JSON.parse(row.spec_json) as GameSpec : row.spec_json;
  if (row.title !== game.title) return false;
  if (game.kind === "template") return spec?.template === game.serverTemplate;
  return spec?.dimensions === "3d" && spec?.threeMode === game.threeMode;
}

export class StudioRepository {
  private readonly locks = new KeyedMutex();

  private readonly gameOrigin: string;

  constructor(private readonly database: StudioDatabase, private readonly publicOrigin: string, gameOrigin: string | null = null, private readonly resourceFamilies: ResourceFamily[] = []) {
    this.gameOrigin = gameOrigin ?? publicOrigin;
  }

  private async updateDesignResearchTask(taskId: string, transform: (task: GameResearchTask) => GameResearchTask) {
    return this.locks.run(`design-research:${taskId}`, async () => {
      const row = (await this.database.query<DesignResearchRow>(
        "SELECT * FROM design_research_tasks WHERE id = $1", [taskId],
      )).rows[0];
      if (!row) throw new Error("外部玩法研究任务不存在。");
      const task = transform(toDesignResearchTask(row));
      await this.database.query(
        "UPDATE design_research_tasks SET task_json = $1, status = $2, updated_at = $3 WHERE id = $4",
        [JSON.stringify(task), task.status, task.updatedAt, task.id],
      );
      return task;
    });
  }

  async reconcilePublishedStatuses() {
    await this.database.query(
      `UPDATE projects SET status = 'published'
       WHERE EXISTS (SELECT 1 FROM publications WHERE publications.project_id = projects.id AND publications.status = 'live')`,
    );
  }

  async initializeCatalogScopes() {
    const migrationKey = "official_catalog_scope_initialized";
    const initialized = (await this.database.query<{ value: string }>(
      "SELECT value FROM studio_meta WHERE key = $1", [migrationKey],
    )).rows[0];
    if (initialized) return;
    await this.database.transaction(async (transaction) => {
      await transaction.query(
        `UPDATE projects SET is_official = TRUE
         WHERE EXISTS (SELECT 1 FROM publications WHERE publications.project_id = projects.id AND publications.status = 'live')`,
      );
      await transaction.query(
        "INSERT INTO studio_meta (key, value) VALUES ($1, $2)", [migrationKey, "true"],
      );
    });
  }

  async ensureGoldenFixture() {
    return this.ensureOfficialFixture("star-dream-duel");
  }

  async ensureFreecellFixture() {
    return this.ensureOfficialFixture("freecell");
  }

  /** 注册全部内置固定游戏，返回 kind → projectId（已被删除的返回 null）。 */
  async ensureOfficialFixtures() {
    const result: Record<string, string | null> = {};
    for (const definition of officialFixtures) result[definition.kind] = await this.ensureOfficialFixture(definition.kind);
    return result;
  }

  /**
   * 按官方游戏登记表同步大厅：已发布（有 live 发布记录）且属于登记表的项目标记 is_official 并写入 lobby_rank；
   * 未登记的项目（例如由 AI 原创转官方的“虫虫攀枝”）一律不动。
   * 幂等：已经一致的行不会再写；重复调用结果相同。返回 登记 id → 匹配到的 projectId（没匹配到为 null）。
   */
  async syncOfficialCatalog() {
    const rows = (await this.database.query<ProjectRow>(
      `${projectSelect} WHERE p.archived_at IS NULL AND pub.status = 'live' ORDER BY p.created_at ASC`,
    )).rows;
    const officialValue = this.database.provider === "sqlite-test" ? 1 : true;
    const claimed = new Set<string>();
    const result: Record<string, string | null> = {};
    for (const game of OFFICIAL_GAMES) {
      const match = rows.find((row) => !claimed.has(row.id) && matchesOfficialGame(row, game));
      result[game.id] = match?.id ?? null;
      if (!match) continue;
      claimed.add(match.id);
      if ((game.stage ?? "live") !== "live") {
        // 开发中的登记：从官方目录摘下，但保留项目与发布记录，便于单独开发与回归。
        if (!match.is_official && match.lobby_rank === null) continue;
        await this.database.query(
          "UPDATE projects SET is_official = $1, lobby_rank = NULL WHERE id = $2",
          [this.database.provider === "sqlite-test" ? 0 : false, match.id],
        );
        continue;
      }
      if (Boolean(match.is_official) && match.lobby_rank === game.lobbyRank) continue;
      await this.database.query(
        "UPDATE projects SET is_official = $1, lobby_rank = $2 WHERE id = $3",
        [officialValue, game.lobbyRank, match.id],
      );
    }
    return result;
  }

  private async ensureOfficialFixture(kind: string) {
    const definition = officialFixtures.find((candidate) => candidate.kind === kind);
    if (!definition) throw new Error(`未知的固定游戏：${kind}`);
    const initialized = (await this.database.query<{ value: string }>(
      "SELECT value FROM studio_meta WHERE key = $1", [definition.metaKey],
    )).rows[0];
    const existing = (await this.database.query<{ id: string }>(
      "SELECT id FROM projects WHERE fixture_kind = $1", [definition.kind],
    )).rows[0];
    if (initialized) return existing?.id ?? null;
    if (existing) {
      await this.ensureFixtureBuild(existing.id, definition.buildOutputs);
      await this.database.query(
        "INSERT INTO studio_meta (key, value) VALUES ($1, $2)",
        [definition.metaKey, "true"],
      );
      return existing.id;
    }
    const projectId = await this.locks.run(SLUG_LOCK_KEY, () => insertProject(this.database, definition.input, definition.spec(), definition.kind, definition.kind, true));
    await this.publish(projectId);
    await this.ensureFixtureBuild(projectId, definition.buildOutputs);
    await this.database.query(
      "INSERT INTO studio_meta (key, value) VALUES ($1, $2)",
      [definition.metaKey, "true"],
    );
    return projectId;
  }

  async failInterruptedBuilds() {
    const interrupted = (await this.database.query<{ id: string }>(
      "SELECT id FROM builds WHERE status = 'running'",
    )).rows;
    if (interrupted.length === 0) return;
    const message = "服务重启中断了本次构建；已保留既有成功版本，可以重新构建。";
    const now = new Date().toISOString();
    await this.database.transaction(async (transaction) => {
      for (const { id } of interrupted) {
        await transaction.query(
          "UPDATE build_steps SET status = 'failed', output_text = $1, completed_at = $2 WHERE build_id = $3 AND status = 'running'",
          [message, now, id],
        );
        await transaction.query(
          "UPDATE builds SET status = 'failed', error_message = $1, completed_at = $2 WHERE id = $3",
          [message, now, id],
        );
      }
    });
  }

  async queuedBuildIds(): Promise<string[]> {
    return (await this.database.query<{ id: string }>("SELECT id FROM builds WHERE status = 'queued' ORDER BY created_at, id")).rows.map(row => row.id);
  }

  private async ensureFixtureBuild(projectId: string, outputs: string[]) {
    const existing = (await this.database.query<{ id: string }>(
      "SELECT id FROM builds WHERE project_id = $1 LIMIT 1", [projectId],
    )).rows[0];
    if (existing) return;
    const project = await this.get(projectId);
    if (!project) return;
    const buildId = randomUUID();
    const now = project.version.createdAt;
    await this.database.transaction(async (transaction) => {
      await transaction.query(
        `INSERT INTO builds (id, project_id, status, runtime_target, created_at, started_at, completed_at, version_id, error_message)
         VALUES ($1, $2, 'succeeded', $3, $4, $4, $4, $5, NULL)`,
        [buildId, projectId, project.spec.runtimeTarget, now, project.version.id],
      );
      for (const [sequence, step] of buildPlan.entries()) {
        await transaction.query(
          `INSERT INTO build_steps (id, build_id, sequence, kind, title, detail, status, output_text, started_at, completed_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'succeeded', $7, $8, $8)`,
          [randomUUID(), buildId, sequence, step.kind, step.title, step.detail, outputs[sequence] ?? "已完成。", now],
        );
      }
    });
  }

  async list(options: { archived?: boolean } = {}): Promise<ProjectSummary[]> {
    const archiveFilter = options.archived ? "p.archived_at IS NOT NULL" : "p.archived_at IS NULL";
    const rows = (await this.database.query<ProjectRow>(`${projectSelect} WHERE ${archiveFilter} AND p.is_official = FALSE ORDER BY COALESCE(p.archived_at, p.created_at) DESC`)).rows;
    return rows.map((row) => toSummary(row, this.gameOrigin));
  }

  async archive(projectId: string) {
    const project = await this.get(projectId);
    if (!project) throw new Error("项目不存在。");
    if (!project.archivedAt) {
      await this.database.query("UPDATE projects SET archived_at = $1 WHERE id = $2", [new Date().toISOString(), projectId]);
    }
    const archived = await this.get(projectId);
    if (!archived) throw new Error("项目归档后无法读取。");
    return archived;
  }

  async restore(projectId: string) {
    const project = await this.get(projectId);
    if (!project) throw new Error("项目不存在。");
    if (project.archivedAt) await this.database.query("UPDATE projects SET archived_at = NULL WHERE id = $1", [projectId]);
    const restored = await this.get(projectId);
    if (!restored) throw new Error("项目恢复后无法读取。");
    return restored;
  }

  async archivedDeletionPlan(projectId: string) {
    const project = await this.get(projectId);
    if (!project) throw new Error("项目不存在。");
    if (!project.archivedAt) throw new Error("项目必须先归档，才能永久删除。");
    const activeBuild = (await this.database.query<{ id: string }>(
      "SELECT id FROM builds WHERE project_id = $1 AND status IN ('queued', 'running') LIMIT 1", [projectId],
    )).rows[0];
    if (activeBuild) throw new Error("项目仍有构建正在进行，请等待构建结束后再永久删除。");
    const buildIds = (await this.database.query<{ id: string }>(
      "SELECT id FROM builds WHERE project_id = $1", [projectId],
    )).rows.map((row) => row.id);
    return { project, buildIds };
  }

  async deleteArchived(projectId: string) {
    await this.archivedDeletionPlan(projectId);
    const result = await this.database.query("DELETE FROM projects WHERE id = $1 AND archived_at IS NOT NULL", [projectId]);
    if (result.rowCount !== 1) throw new Error("项目删除失败，请刷新后重试。");
  }

  async publishedGames() {
    const rows = (await this.database.query<ProjectRow>(
      `${projectSelect} WHERE p.archived_at IS NULL AND p.is_official = TRUE ORDER BY p.created_at DESC`,
    )).rows;
    // 大厅顺序：人工设置的 lobby_rank 优先（小者在前），未设置的按发布时间倒序排在其后。
    const rankOf = new Map(rows.map((row) => [row.id, row.lobby_rank ?? Number.POSITIVE_INFINITY]));
    return rows.map((row) => toSummary(row, this.gameOrigin))
      .filter((project) => project.status === "published" && project.publication?.status === "live")
      .sort((left, right) => {
        const rankDelta = (rankOf.get(left.id) ?? Number.POSITIVE_INFINITY) - (rankOf.get(right.id) ?? Number.POSITIVE_INFINITY);
        if (rankDelta !== 0) return rankDelta;
        return (right.publication?.publishedAt ?? "").localeCompare(left.publication?.publishedAt ?? "");
      });
  }

  async recordPlayEvent(rawInput: unknown) {
    const event = playEventInputSchema.parse(rawInput);
    const version = (await this.database.query<{ id: string }>(
      "SELECT id FROM versions WHERE id = $1 AND project_id = $2",
      [event.versionId, event.projectId],
    )).rows[0];
    if (!version) throw new Error("游戏版本不存在。");
    const now = new Date().toISOString();
    await this.database.transaction(async (transaction) => {
      await transaction.query(
        `INSERT INTO play_events
          (id, project_id, version_id, player_id, event_type, input_mode, viewport, level_number, best_score, average_fps, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [randomUUID(), event.projectId, event.versionId, event.playerId, event.type, event.inputMode, event.viewport, event.level ?? null, event.bestScore ?? null, event.averageFps ?? null, now],
      );
      const status = event.type === "complete" ? "completed" : event.type === "fail" ? "failed" : event.type === "exit" ? "exited" : "started";
      await transaction.query(
        `INSERT INTO player_progress
          (player_id, project_id, version_id, status, current_level, best_score, input_mode, viewport, average_fps, resource_error_count, last_played_at, completed_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$11)
         ON CONFLICT (player_id, project_id) DO UPDATE SET
          version_id = EXCLUDED.version_id,
          status = CASE WHEN $13 = 'resource-error' THEN player_progress.status ELSE EXCLUDED.status END,
          current_level = CASE WHEN EXCLUDED.current_level > player_progress.current_level THEN EXCLUDED.current_level ELSE player_progress.current_level END,
          best_score = CASE WHEN EXCLUDED.best_score > player_progress.best_score THEN EXCLUDED.best_score ELSE player_progress.best_score END,
          input_mode = EXCLUDED.input_mode,
          viewport = EXCLUDED.viewport,
          average_fps = COALESCE(EXCLUDED.average_fps, player_progress.average_fps),
          resource_error_count = player_progress.resource_error_count + EXCLUDED.resource_error_count,
          last_played_at = EXCLUDED.last_played_at,
          completed_at = COALESCE(EXCLUDED.completed_at, player_progress.completed_at),
          updated_at = EXCLUDED.updated_at`,
        [event.playerId, event.projectId, event.versionId, status, event.level ?? 1, event.bestScore ?? 0, event.inputMode, event.viewport, event.averageFps ?? null, event.type === "resource-error" ? 1 : 0, now, event.type === "complete" ? now : null, event.type],
      );
    });
    return { accepted: true };
  }

  async playActivities(playerId: string): Promise<PlayActivity[]> {
    if (!/^player-[0-9a-f-]{36}$/i.test(playerId)) throw new Error("玩家标识格式无效。");
    const rows = (await this.database.query<PlayActivityRow>(
      "SELECT * FROM player_progress WHERE player_id = $1 ORDER BY last_played_at DESC",
      [playerId],
    )).rows;
    return rows.map((row) => playActivitySchema.parse({
      projectId: row.project_id,
      versionId: row.version_id,
      status: row.status,
      currentLevel: Number(row.current_level),
      bestScore: Number(row.best_score),
      inputMode: row.input_mode,
      viewport: row.viewport,
      averageFps: row.average_fps === null ? null : Number(row.average_fps),
      resourceErrorCount: Number(row.resource_error_count),
      lastPlayedAt: iso(row.last_played_at),
      completedAt: iso(row.completed_at),
    }));
  }

  async currentDesignKnowledgeState(): Promise<{ library: GameDesignKnowledgeLibrary; releaseId: string | null }> {
    const row = (await this.database.query<DesignKnowledgeReleaseRow>(
      "SELECT * FROM design_knowledge_releases ORDER BY sequence DESC LIMIT 1",
    )).rows[0];
    if (!row) return { library: GAME_DESIGN_KNOWLEDGE_LIBRARY, releaseId: null };
    const raw = typeof row.library_json === "string" ? JSON.parse(row.library_json) : row.library_json;
    const validated = validateGameDesignKnowledgeLibrary(raw);
    if (!validated.valid || !validated.library) throw new Error("已发布的游戏设计知识版本没有通过完整性校验。");
    if (knowledgeChecksum(validated.library) !== row.checksum) throw new Error("已发布的游戏设计知识版本校验和不一致。");
    return { library: validated.library, releaseId: row.id };
  }

  async currentDesignKnowledgeLibrary(): Promise<GameDesignKnowledgeLibrary> {
    return (await this.currentDesignKnowledgeState()).library;
  }

  async createDesignResearchTask(rawInput: unknown) {
    const input = designResearchCreateInputSchema.parse(rawInput);
    const current = await this.currentDesignKnowledgeLibrary();
    const task = createGameResearchTask(input, integrateGameDesign(input, current));
    return this.locks.run(`design-research:${task.id}`, async () => {
      const existing = (await this.database.query<DesignResearchRow>(
        "SELECT * FROM design_research_tasks WHERE id = $1", [task.id],
      )).rows[0];
      if (existing) return toDesignResearchTask(existing);
      await this.database.query(
        `INSERT INTO design_research_tasks (id, schema_version, task_json, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [task.id, task.schemaVersion, JSON.stringify(task), task.status, task.createdAt, task.updatedAt],
      );
      return task;
    });
  }

  async listDesignResearchTasks() {
    return (await this.database.query<DesignResearchRow>(
      "SELECT * FROM design_research_tasks ORDER BY updated_at DESC, id LIMIT 100",
    )).rows.map(toDesignResearchTask);
  }

  async getDesignResearchTask(taskId: string) {
    const row = (await this.database.query<DesignResearchRow>(
      "SELECT * FROM design_research_tasks WHERE id = $1", [taskId],
    )).rows[0];
    return row ? toDesignResearchTask(row) : null;
  }

  async ensureInitialDesignResearchTasks() {
    const library = await this.currentDesignKnowledgeLibrary();
    for (const task of initialDesignResearchTasks(library)) {
      const existing = (await this.database.query<DesignResearchRow>(
        "SELECT * FROM design_research_tasks WHERE id = $1", [task.id],
      )).rows[0];
      if (existing) {
        const stored = toDesignResearchTask(existing);
        if (stored.status === "review" && stored.synthesis && !stored.candidateDraft && !stored.evaluation && !stored.decision && task.candidateDraft) {
          const updatedAt = new Date().toISOString();
          const upgraded = gameResearchTaskSchema.parse({ ...stored, candidateDraft: task.candidateDraft, updatedAt });
          await this.database.query(
            "UPDATE design_research_tasks SET task_json=$2, status=$3, updated_at=$4 WHERE id=$1",
            [task.id, JSON.stringify(upgraded), upgraded.status, updatedAt],
          );
        }
        continue;
      }
      await this.database.query(
        `INSERT INTO design_research_tasks (id, schema_version, task_json, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [task.id, task.schemaVersion, JSON.stringify(task), task.status, task.createdAt, task.updatedAt],
      );
    }
    return this.listDesignResearchTasks();
  }

  private async saveGameplayRadarCluster(cluster: GameplayRadarCluster) {
    await this.database.query(
      `INSERT INTO design_gameplay_radar_clusters (id, schema_version, normalized_title, cluster_json, state, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(id) DO UPDATE SET cluster_json=$4, state=$5, updated_at=$7`,
      [cluster.id, cluster.schemaVersion, cluster.normalizedTitle, JSON.stringify(cluster), cluster.state, cluster.createdAt, cluster.updatedAt],
    );
    return cluster;
  }

  async ingestGameplayRadarSignal(rawInput: unknown, now = new Date()) {
    const signal = gameplaySignalSchema.parse(rawInput);
    const normalizedTitle = normalizeGameplayTitle(signal.gameTitle);
    return this.locks.run(`gameplay-radar:${normalizedTitle}`, async () => {
      const row = (await this.database.query<GameplayRadarRow>(
        "SELECT * FROM design_gameplay_radar_clusters WHERE normalized_title = $1", [normalizedTitle],
      )).rows[0];
      const cluster = row ? mergeGameplaySignal(toGameplayRadarCluster(row), signal, now) : createGameplayRadarCluster(signal, now);
      return this.saveGameplayRadarCluster(cluster);
    });
  }

  async ensureInitialGameplayRadarSignals() {
    for (const signal of INITIAL_GAMEPLAY_RADAR_SIGNALS) await this.ingestGameplayRadarSignal(signal);
    return this.listGameplayRadar();
  }

  async listGameplayRadar(now = new Date()) {
    const [rows, tasks, library] = await Promise.all([
      this.database.query<GameplayRadarRow>("SELECT * FROM design_gameplay_radar_clusters ORDER BY updated_at DESC, id LIMIT 100"),
      this.listDesignResearchTasks(),
      this.currentDesignKnowledgeLibrary(),
    ]);
    return rows.rows.map(toGameplayRadarCluster).map((cluster) => buildGameplayRadarView(cluster, tasks, library, now));
  }

  async startGameplayRadarResearch(clusterId: string, rawInput: unknown, now = new Date()) {
    const input = gameplayRadarResearchInputSchema.parse(rawInput);
    return this.locks.run(`gameplay-radar-research:${clusterId}`, async () => {
      const row = (await this.database.query<GameplayRadarRow>(
        "SELECT * FROM design_gameplay_radar_clusters WHERE id = $1", [clusterId],
      )).rows[0];
      if (!row) throw new Error("玩法雷达观察项不存在。");
      const cluster = toGameplayRadarCluster(row);
      const [tasks, library] = await Promise.all([this.listDesignResearchTasks(), this.currentDesignKnowledgeLibrary()]);
      const view = buildGameplayRadarView(cluster, tasks, library, now);
      const matchedTask = !input.refresh && view.match.kind === "research-task"
        ? tasks.find(({ id }) => id === view.match.id) ?? null
        : null;
      let task = matchedTask ?? createRadarResearchTask(cluster, view.match, now);
      if (!matchedTask) {
        await this.database.query(
          `INSERT INTO design_research_tasks (id, schema_version, task_json, status, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,
          [task.id, task.schemaVersion, JSON.stringify(task), task.status, task.createdAt, task.updatedAt],
        );
        const persisted = (await this.database.query<DesignResearchRow>(
          "SELECT * FROM design_research_tasks WHERE id = $1", [task.id],
        )).rows[0];
        if (persisted) task = toDesignResearchTask(persisted);
      }
      const linked = linkGameplayRadarResearch(cluster, task.id, view.match.kind === "knowledge-pattern" ? view.match.id : null, now);
      await this.saveGameplayRadarCluster(linked);
      const freshTasks = matchedTask ? tasks : [...tasks, task];
      return {
        action: matchedTask ? "linked-existing" as const : "created" as const,
        task,
        cluster: buildGameplayRadarView(linked, freshTasks, library, now),
      };
    });
  }

  async addDesignResearchSource(taskId: string, rawInput: unknown) {
    const input = designResearchSourceInputSchema.parse(rawInput);
    return this.updateDesignResearchTask(taskId, (task) => addResearchSource(task, input));
  }

  async submitDesignResearchSynthesis(taskId: string, rawInput: unknown) {
    const input = designResearchSynthesisInputSchema.parse(rawInput);
    return this.updateDesignResearchTask(taskId, (task) => submitResearchSynthesis(task, input));
  }

  async attachDesignResearchCandidate(taskId: string, rawInput: unknown) {
    const input = designResearchCandidateInputSchema.parse(rawInput);
    return this.updateDesignResearchTask(taskId, (task) => attachResearchCandidate(task, input));
  }

  async createDesignResearchEvaluation(taskId: string) {
    return this.updateDesignResearchTask(taskId, (task) => {
      const evaluation = createResearchPrototypeEvaluation(task, new Date(), this.resourceFamilies);
      return evaluation === task.evaluation ? task : { ...task, evaluation, updatedAt: new Date().toISOString() };
    });
  }

  async createDesignResearchResourceAcquisitionTask(taskId: string) {
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation?.resourceAcquisitionPlan || task.decision) {
        throw new Error("只有待评审且已有取得计划的研究沙箱可以生成资源执行任务");
      }
      if (task.evaluation.resourceAcquisitionTask) return task;
      const createdAt = new Date();
      const resourceAcquisitionTask = createResearchResourceAcquisitionTask(task.id, task.evaluation.id, task.evaluation.resourceAcquisitionPlan, createdAt);
      return gameResearchTaskSchema.parse({
        ...task,
        evaluation: { ...task.evaluation, resourceAcquisitionTask, updatedAt: createdAt.toISOString() },
        updatedAt: createdAt.toISOString(),
      });
    });
  }

  async submitDesignResearchResourceAcquisitionWork(taskId: string, requirementId: string, rawInput: unknown) {
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation?.resourceAcquisitionTask || task.decision) throw new Error("只有待评审且已生成资源执行任务的研究沙箱可以提交成果");
      const updatedAt = new Date();
      const resourceAcquisitionTask = submitResearchResourceAcquisitionWork(task.evaluation.resourceAcquisitionTask, requirementId, rawInput as never, updatedAt);
      return gameResearchTaskSchema.parse({ ...task, evaluation: { ...task.evaluation, resourceAcquisitionTask, updatedAt: updatedAt.toISOString() }, updatedAt: updatedAt.toISOString() });
    });
  }

  async reviewDesignResearchResourceAcquisitionWork(taskId: string, requirementId: string, rawInput: unknown) {
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation?.resourceAcquisitionTask || task.decision) throw new Error("只有待评审且已生成资源执行任务的研究沙箱可以复核成果");
      const updatedAt = new Date();
      const resourceAcquisitionTask = reviewResearchResourceAcquisitionWork(task.evaluation.resourceAcquisitionTask, requirementId, rawInput as never, updatedAt);
      return gameResearchTaskSchema.parse({ ...task, evaluation: { ...task.evaluation, resourceAcquisitionTask, updatedAt: updatedAt.toISOString() }, updatedAt: updatedAt.toISOString() });
    });
  }

  async recordDesignResearchResourceIntake(taskId: string, rawBatch: unknown) {
    const batch = researchResourceIntakeBatchSchema.parse(rawBatch);
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation?.resourceAcquisitionTask || task.decision) throw new Error("只有待评审且资源成果全部批准的研究沙箱可以记录隔离入库");
      if (batch.researchTaskId !== task.id || batch.acquisitionTaskId !== task.evaluation.resourceAcquisitionTask.id) throw new Error("资源入库批次与研究任务不匹配");
      if (task.evaluation.resourceAcquisitionTask.status !== "completed") throw new Error("资源执行任务尚未全部批准");
      if (task.evaluation.resourceIntakeBatch) return task;
      const updatedAt = new Date().toISOString();
      return gameResearchTaskSchema.parse({ ...task, evaluation: { ...task.evaluation, resourceIntakeBatch: batch, updatedAt }, updatedAt });
    });
  }

  async reviewDesignResearchResourceIntake(taskId: string, rawInput: unknown) {
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation?.resourceIntakeBatch || task.decision) throw new Error("只有待评审且已隔离入库的研究资源可以安全复核");
      const updatedAt = new Date();
      const resourceIntakeBatch = reviewResearchResourceIntakeBatch(task.evaluation.resourceIntakeBatch, rawInput, updatedAt);
      return gameResearchTaskSchema.parse({ ...task, evaluation: { ...task.evaluation, resourceIntakeBatch, assetRequirements: { ...task.evaluation.assetRequirements!, bindings: resourceIntakeBatch.items.map(({ binding }) => binding) }, updatedAt: updatedAt.toISOString() }, updatedAt: updatedAt.toISOString() });
    });
  }

  async recordDesignResearchResourcePromotion(taskId: string, rawFamilies: unknown[]) {
    const families = rawFamilies.map((family) => resourceFamilySchema.parse(family));
    const task = await this.updateDesignResearchTask(taskId, (current) => {
      const batch = current.evaluation?.resourceIntakeBatch;
      if (current.status !== "review" || !batch || batch.status !== "approved" || current.decision) throw new Error("只有安全复核通过的研究资源可以晋升资源族");
      if (families.length !== batch.items.length || families.some(({ manifest }) => manifest.schemaVersion !== "research-resource-family-v1" || manifest.researchTaskId !== current.id || manifest.intakeBatchId !== batch.id)) throw new Error("晋升资源族与研究入库批次不匹配");
      const ids = families.map(({ profile }) => profile.familyId);
      if ((current.evaluation!.promotedResourceFamilyIds ?? []).length > 0) return current;
      const updatedAt = new Date().toISOString();
      return gameResearchTaskSchema.parse({ ...current, evaluation: { ...current.evaluation!, promotedResourceFamilyIds: ids, updatedAt }, updatedAt });
    });
    for (const family of families) if (!this.resourceFamilies.some(({ profile }) => profile.familyId === family.profile.familyId)) this.resourceFamilies.push(family);
    return task;
  }

  async recordDesignResearchProbeRun(taskId: string, rawInput: unknown) {
    const input = designResearchProbeRunInputSchema.parse(rawInput);
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation || task.decision) throw new Error("只有待评审的研究沙箱可以记录探针结果");
      const evaluation = recordResearchProbeRun(task.evaluation, input);
      return { ...task, evaluation, updatedAt: evaluation.updatedAt };
    });
  }

  async recordAutomaticDesignResearchProbeRun(taskId: string, rawInput: unknown) {
    const input = designResearchProbeRunInputSchema.parse(rawInput);
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation || task.decision) throw new Error("只有待评审的研究沙箱可以记录自动探针结果");
      const evaluation = recordResearchProbeRun(task.evaluation, input, new Date(), "automatic");
      return { ...task, evaluation, updatedAt: evaluation.updatedAt };
    });
  }

  async recordDesignResearchBrowserRun(taskId: string, rawInput: unknown) {
    const input = designResearchBrowserRunInputSchema.parse(rawInput);
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation || task.decision) throw new Error("只有待评审的研究沙箱可以记录浏览器结果");
      const evaluation = recordResearchBrowserRun(task.evaluation, input);
      return { ...task, evaluation, updatedAt: evaluation.updatedAt };
    });
  }

  async recordAutomaticDesignResearchBrowserRun(taskId: string, rawInput: unknown) {
    const input = designResearchBrowserRunInputSchema.parse(rawInput);
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation || task.decision) throw new Error("只有待评审的研究沙箱可以记录自动浏览器结果");
      const evaluation = recordResearchBrowserRun(task.evaluation, input, new Date(), "automatic");
      return { ...task, evaluation, updatedAt: evaluation.updatedAt };
    });
  }

  async recordDesignResearchPlaytest(taskId: string, rawInput: unknown) {
    const input = designResearchPlaytestInputSchema.parse(rawInput);
    return this.updateDesignResearchTask(taskId, (task) => {
      if (task.status !== "review" || !task.evaluation || task.decision) throw new Error("只有待评审的研究沙箱可以记录试玩结果");
      const evaluation = recordResearchPlaytest(task.evaluation, input);
      return { ...task, evaluation, updatedAt: evaluation.updatedAt };
    });
  }

  async decideDesignResearchTask(taskId: string, rawInput: unknown) {
    const input = designResearchDecisionInputSchema.parse(rawInput);
    return this.updateDesignResearchTask(taskId, (task) => decideResearchTask(task, input.outcome, input.rationale));
  }

  async createDesignResearchChangeSet(taskId: string) {
    return this.locks.run(`design-research:${taskId}`, async () => {
      const existing = (await this.database.query<DesignChangeSetRow>(
        "SELECT * FROM design_knowledge_change_sets WHERE research_task_id = $1", [taskId],
      )).rows[0];
      if (existing) return toDesignKnowledgeChangeSet(existing);
      const row = (await this.database.query<DesignResearchRow>(
        "SELECT * FROM design_research_tasks WHERE id = $1", [taskId],
      )).rows[0];
      if (!row) throw new Error("外部玩法研究任务不存在。");
      const task = toDesignResearchTask(row);
      if (task.status !== "accepted" || !task.decision || !task.candidateDraft) throw new Error("只有已接受且具有结构化候选草案的研究任务才能生成知识变更。");
      const current = await this.currentDesignKnowledgeState();
      const changes: DesignKnowledgeChangeSet["changes"] = task.candidateDraft.kind === "mechanic"
        ? [{ kind: "add-mechanic", mechanic: task.candidateDraft.artifact }]
        : [{ kind: "add-pattern", pattern: task.candidateDraft.artifact }];
      const id = randomUUID();
      const createdAt = new Date().toISOString();
      const changeSet: DesignKnowledgeChangeSet = {
        id,
        reviewId: null,
        researchTaskId: task.id,
        schemaVersion: "design-knowledge-change-set-v2",
        base: { schemaVersion: current.library.schemaVersion, updatedAt: current.library.updatedAt, evaluationVersion: current.library.evaluation.version, releaseId: current.releaseId },
        changes,
        status: "pending",
        reviewRationale: null,
        reviewedAt: null,
        createdAt,
        resolvedAt: null,
      };
      applyDesignKnowledgeChangeSet(current.library, current.releaseId, changeSet);
      await this.database.query(
        `INSERT INTO design_knowledge_change_sets
          (id, review_id, research_task_id, schema_version, base_schema_version, base_updated_at, base_evaluation_version, base_release_id,
           changes_json, status, review_rationale, reviewed_at, created_at, resolved_at)
         VALUES ($1,NULL,$2,$3,$4,$5,$6,$7,$8,'pending',NULL,NULL,$9,NULL)`,
        [id, task.id, changeSet.schemaVersion, changeSet.base.schemaVersion, changeSet.base.updatedAt,
          changeSet.base.evaluationVersion, changeSet.base.releaseId, JSON.stringify(changes), createdAt],
      );
      return changeSet;
    });
  }

  async listDesignKnowledgeReleases() {
    return (await this.database.query<DesignKnowledgeReleaseRow>(
      "SELECT * FROM design_knowledge_releases ORDER BY sequence DESC LIMIT 100",
    )).rows.map(toDesignKnowledgeRelease);
  }

  async designKnowledgeInsights(): Promise<DesignKnowledgeInsights> {
    const reviews = await this.listDesignKnowledgeReviews();
    const playtests = await this.listDesignPlaytests();
    const trends = new Map<string, DesignKnowledgeInsights["trends"][number]>();
    for (const review of [...reviews].reverse()) {
      for (const pattern of review.report.patterns) {
        const trend = trends.get(pattern.patternId) ?? { patternId: pattern.patternId, label: pattern.label, points: [] };
        trend.label = pattern.label;
        trend.points.push({
          reviewId: review.id,
          capturedAt: review.createdAt,
          window: review.report.window,
          completionRate: pattern.metrics.completionRate,
          exitRate: pattern.metrics.exitRate,
          starts: pattern.samples.starts,
          recommendation: pattern.recommendation,
        });
        trends.set(pattern.patternId, trend);
      }
    }
    const byPattern = new Map<string, DesignPlaytest[]>();
    for (const playtest of playtests) byPattern.set(playtest.patternId, [...(byPattern.get(playtest.patternId) ?? []), playtest]);
    return {
      generatedAt: new Date().toISOString(),
      trends: [...trends.values()].sort((left, right) => left.patternId.localeCompare(right.patternId)),
      playtests: [...byPattern.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([patternId, items]) => ({
        patternId,
        overall: playtestInsightSummary(items),
        byTesterSegment: groupedPlaytestInsights(items, "testerSegment"),
        byDeviceClass: groupedPlaytestInsights(items, "deviceClass"),
        byInputMode: groupedPlaytestInsights(items, "inputMode"),
      })),
    };
  }

  async designKnowledgeReview(rawOptions: unknown = {}) {
    const active = await this.currentDesignKnowledgeState();
    return buildDesignKnowledgeReview(this.database, designKnowledgeReviewOptionsSchema.parse(rawOptions), active.library, active.releaseId);
  }

  async captureDesignKnowledgeReview(rawOptions: unknown = {}) {
    const report = await this.designKnowledgeReview(rawOptions);
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await this.database.query(
      `INSERT INTO design_knowledge_reviews
        (id, schema_version, window_from, window_to, minimum_players, minimum_starts, report_json, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, report.schemaVersion, report.window.from, report.window.to, report.evidenceThresholds.minimumPlayers, report.evidenceThresholds.minimumStarts, JSON.stringify(report), createdAt],
    );
    return { id, createdAt, report, decisions: [] as DesignKnowledgeDecision[] };
  }

  async listDesignKnowledgeReviews() {
    const reviews = (await this.database.query<DesignReviewRow>(
      "SELECT * FROM design_knowledge_reviews ORDER BY created_at DESC LIMIT 100",
    )).rows;
    const decisions = (await this.database.query<DesignDecisionRow>(
      "SELECT * FROM design_knowledge_decisions ORDER BY decided_at, id",
    )).rows.map(toDesignKnowledgeDecision);
    return reviews.map((row) => ({
      id: row.id,
      createdAt: iso(row.created_at)!,
      report: typeof row.report_json === "string" ? JSON.parse(row.report_json) as DesignKnowledgeReviewReport : row.report_json,
      decisions: decisions.filter(({ reviewId }) => reviewId === row.id),
    }));
  }

  async recordDesignKnowledgeDecision(reviewId: string, rawInput: unknown) {
    const input = designKnowledgeDecisionInputSchema.parse(rawInput);
    return this.locks.run(`design-review:${reviewId}`, async () => {
    const review = (await this.database.query<DesignReviewRow>(
      "SELECT * FROM design_knowledge_reviews WHERE id = $1", [reviewId],
    )).rows[0];
    if (!review) throw new Error("玩法复核快照不存在。");
    const frozen = (await this.database.query<{ id: string }>(
      "SELECT id FROM design_knowledge_change_sets WHERE review_id = $1", [reviewId],
    )).rows[0];
    if (frozen) throw new Error("该复核已经形成版本化变更集，人工决定不能再修改。");
    const report = typeof review.report_json === "string" ? JSON.parse(review.report_json) as DesignKnowledgeReviewReport : review.report_json;
    if (!report.patterns.some(({ patternId }) => patternId === input.patternId)) throw new Error("该玩法不在这份复核快照中。");
    if (input.outcome === "promote" || input.outcome === "demote") {
      const required = ["telemetry", "playtest", "contract", "browser"] as const;
      const missing = required.filter((evidence) => !input.evidence.includes(evidence));
      if (missing.length) throw new Error(`晋级或降级决定缺少必要证据：${missing.join("、")}。`);
      const playtestCount = Number((await this.database.query<{ count: number | string }>(
        `SELECT COUNT(*) AS count FROM design_playtests
         WHERE pattern_id = $1 AND created_at >= $2 AND created_at < $3`,
        [input.patternId, report.window.from, report.window.to],
      )).rows[0]?.count ?? 0);
      if (playtestCount < 1) throw new Error("晋级或降级前必须在本复核周期内保存至少一条结构化真人试玩记录。");
    }
    const id = randomUUID();
    const decidedAt = new Date().toISOString();
    await this.database.query(
      `INSERT INTO design_knowledge_decisions
        (id, review_id, pattern_id, outcome, rationale, evidence_json, decided_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(review_id, pattern_id) DO UPDATE SET
        outcome = EXCLUDED.outcome, rationale = EXCLUDED.rationale,
        evidence_json = EXCLUDED.evidence_json, decided_at = EXCLUDED.decided_at`,
      [id, reviewId, input.patternId, input.outcome, input.rationale, JSON.stringify(input.evidence), decidedAt],
    );
    const stored = (await this.database.query<DesignDecisionRow>(
      "SELECT * FROM design_knowledge_decisions WHERE review_id = $1 AND pattern_id = $2",
      [reviewId, input.patternId],
    )).rows[0];
    if (!stored) throw new Error("玩法复核决定保存失败。");
    return toDesignKnowledgeDecision(stored);
    });
  }

  async createDesignKnowledgeChangeSet(reviewId: string) {
    return this.locks.run(`design-review:${reviewId}`, async () => {
    const existing = (await this.database.query<DesignChangeSetRow>(
      "SELECT * FROM design_knowledge_change_sets WHERE review_id = $1", [reviewId],
    )).rows[0];
    if (existing) return toDesignKnowledgeChangeSet(existing);
    const review = (await this.database.query<DesignReviewRow>(
      "SELECT * FROM design_knowledge_reviews WHERE id = $1", [reviewId],
    )).rows[0];
    if (!review) throw new Error("玩法复核快照不存在。");
    const report = typeof review.report_json === "string" ? JSON.parse(review.report_json) as DesignKnowledgeReviewReport : review.report_json;
    if (!report.knowledgeBase || !("releaseId" in report.knowledgeBase)) {
      throw new Error("这份玩法复核快照版本过旧，请基于当前知识版本重新复核。");
    }
    const decisions = (await this.database.query<DesignDecisionRow>(
      `SELECT * FROM design_knowledge_decisions
       WHERE review_id = $1 AND outcome IN ('promote', 'demote') ORDER BY pattern_id`,
      [reviewId],
    )).rows.map(toDesignKnowledgeDecision);
    if (!decisions.length) throw new Error("这份复核没有已批准的晋级或降级决定，不能生成知识变更集。");
    const current = await this.currentDesignKnowledgeState();
    const currentLibrary = current.library;
    if (current.releaseId !== report.knowledgeBase.releaseId) {
      throw new Error("玩法复核所依据的知识发布版本已变化，请重新复核。");
    }
    const changes: DesignKnowledgeChangeSet["changes"] = decisions.map((decision) => {
      const reviewed = report.patterns.find(({ patternId }) => patternId === decision.patternId);
      const current = currentLibrary.patterns.find(({ id }) => id === decision.patternId);
      if (!reviewed || !current) throw new Error(`玩法 ${decision.patternId} 已不在当前知识库中，请重新复核。`);
      if (current.lifecycle !== reviewed.currentLifecycle || current.evaluationVersion !== reviewed.evaluationVersion) {
        throw new Error(`玩法 ${decision.patternId} 在复核后已经变化，请基于新版本重新复核。`);
      }
      return {
        patternId: decision.patternId,
        fromLifecycle: reviewed.currentLifecycle,
        toLifecycle: transitionedLifecycle(reviewed.currentLifecycle, decision.outcome as "promote" | "demote"),
        fromEvaluationVersion: reviewed.evaluationVersion,
        toEvaluationVersion: reviewed.evaluationVersion + 1,
        decisionId: decision.id,
        rationale: decision.rationale,
        evidence: decision.evidence,
      };
    });
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await this.database.query(
      `INSERT INTO design_knowledge_change_sets
        (id, review_id, research_task_id, schema_version, base_schema_version, base_updated_at, base_evaluation_version, base_release_id,
         changes_json, status, review_rationale, reviewed_at, created_at, resolved_at)
       VALUES ($1,$2,NULL,$3,$4,$5,$6,$7,$8,'pending',NULL,NULL,$9,NULL)`,
      [id, reviewId, "design-knowledge-change-set-v1", report.knowledgeBase.schemaVersion,
        report.knowledgeBase.updatedAt, report.knowledgeBase.evaluationVersion, report.knowledgeBase.releaseId,
        JSON.stringify(changes), createdAt],
    );
    const stored = (await this.database.query<DesignChangeSetRow>(
      "SELECT * FROM design_knowledge_change_sets WHERE id = $1", [id],
    )).rows[0];
    if (!stored) throw new Error("版本化知识变更集保存失败。");
    return toDesignKnowledgeChangeSet(stored);
    });
  }

  async listDesignKnowledgeChangeSets() {
    return (await this.database.query<DesignChangeSetRow>(
      "SELECT * FROM design_knowledge_change_sets ORDER BY created_at DESC LIMIT 100",
    )).rows.map(toDesignKnowledgeChangeSet);
  }

  async reviewDesignKnowledgeChangeSet(changeSetId: string, rawInput: unknown) {
    const input = designKnowledgeChangeSetReviewInputSchema.parse(rawInput);
    return this.locks.run(`design-change-set:${changeSetId}`, async () => {
      const row = (await this.database.query<DesignChangeSetRow>(
        "SELECT * FROM design_knowledge_change_sets WHERE id = $1", [changeSetId],
      )).rows[0];
      if (!row) throw new Error("版本化知识变更集不存在。");
      if (row.status !== "pending") throw new Error("只有待审核的知识变更集可以做出审核决定。");
      const reviewedAt = new Date().toISOString();
      const status = input.decision === "approve" ? "approved" : "rejected";
      await this.database.query(
        `UPDATE design_knowledge_change_sets
         SET status = $1, review_rationale = $2, reviewed_at = $3, resolved_at = $4
         WHERE id = $5 AND status = 'pending'`,
        [status, input.rationale, reviewedAt, status === "rejected" ? reviewedAt : null, changeSetId],
      );
      const stored = (await this.database.query<DesignChangeSetRow>(
        "SELECT * FROM design_knowledge_change_sets WHERE id = $1", [changeSetId],
      )).rows[0];
      if (!stored) throw new Error("知识变更集审核结果保存失败。");
      return toDesignKnowledgeChangeSet(stored);
    });
  }

  async exportDesignKnowledgeChangeSet(changeSetId: string) {
    const row = (await this.database.query<DesignChangeSetRow>(
      "SELECT * FROM design_knowledge_change_sets WHERE id = $1", [changeSetId],
    )).rows[0];
    if (!row) throw new Error("版本化知识变更集不存在。");
    const changeSet = toDesignKnowledgeChangeSet(row);
    if (changeSet.status !== "approved" && changeSet.status !== "published") {
      throw new Error("知识变更集必须审核通过后才能导出。");
    }
    let library: GameDesignKnowledgeLibrary;
    if (changeSet.status === "published") {
      const release = (await this.database.query<DesignKnowledgeReleaseRow>(
        "SELECT * FROM design_knowledge_releases WHERE change_set_id = $1", [changeSetId],
      )).rows[0];
      if (!release) throw new Error("已发布的知识变更集缺少对应发布版本。");
      const raw = typeof release.library_json === "string" ? JSON.parse(release.library_json) : release.library_json;
      const validated = validateGameDesignKnowledgeLibrary(raw);
      if (!validated.valid || !validated.library || knowledgeChecksum(validated.library) !== release.checksum) {
        throw new Error("已发布知识版本的导出完整性校验失败。");
      }
      library = validated.library;
    } else {
      const active = await this.currentDesignKnowledgeState();
      library = applyDesignKnowledgeChangeSet(active.library, active.releaseId, changeSet);
    }
    return {
      schemaVersion: "design-knowledge-release-candidate-v1" as const,
      changeSet,
      library,
      checksum: knowledgeChecksum(library),
    };
  }

  async publishDesignKnowledgeChangeSet(changeSetId: string) {
    return this.locks.run("design-knowledge-release", async () => {
      const existing = (await this.database.query<DesignKnowledgeReleaseRow>(
        "SELECT * FROM design_knowledge_releases WHERE change_set_id = $1", [changeSetId],
      )).rows[0];
      if (existing) return toDesignKnowledgeRelease(existing);
      const exported = await this.exportDesignKnowledgeChangeSet(changeSetId);
      if (exported.changeSet.status !== "approved") throw new Error("只有审核通过且尚未发布的知识变更集可以发布。");
      const latest = (await this.database.query<DesignKnowledgeReleaseRow>(
        "SELECT * FROM design_knowledge_releases ORDER BY sequence DESC LIMIT 1",
      )).rows[0];
      const id = randomUUID();
      const sequence = latest ? Number(latest.sequence) + 1 : 1;
      const publishedAt = new Date().toISOString();
      await this.database.transaction(async (transaction) => {
        const claimed = await transaction.query(
          `UPDATE design_knowledge_change_sets
           SET status = 'published', resolved_at = $1 WHERE id = $2 AND status = 'approved'`,
          [publishedAt, changeSetId],
        );
        if (claimed.rowCount !== 1) throw new Error("知识变更集的审核状态已变化，请刷新后重试。");
        await transaction.query(
          `INSERT INTO design_knowledge_releases
            (id, sequence, release_kind, change_set_id, rollback_source_release_id, rationale,
             schema_version, library_json, checksum, supersedes_release_id, published_at)
           VALUES ($1,$2,'change-set',$3,NULL,$4,$5,$6,$7,$8,$9)`,
          [id, sequence, changeSetId, exported.changeSet.reviewRationale, exported.library.schemaVersion, JSON.stringify(exported.library), exported.checksum, latest?.id ?? null, publishedAt],
        );
      });
      return {
        id,
        sequence,
        kind: "change-set",
        changeSetId,
        rollbackSourceReleaseId: null,
        rationale: exported.changeSet.reviewRationale,
        schemaVersion: exported.library.schemaVersion,
        checksum: exported.checksum,
        supersedesReleaseId: latest?.id ?? null,
        publishedAt,
      } satisfies DesignKnowledgeRelease;
    });
  }

  async rollbackDesignKnowledgeRelease(rawInput: unknown) {
    const input = designKnowledgeRollbackInputSchema.parse(rawInput);
    return this.locks.run("design-knowledge-release", async () => {
      const latest = (await this.database.query<DesignKnowledgeReleaseRow>(
        "SELECT * FROM design_knowledge_releases ORDER BY sequence DESC LIMIT 1",
      )).rows[0];
      if (!latest) throw new Error("当前还没有可回滚的知识发布版本。");
      if (latest.id === input.sourceReleaseId) throw new Error("所选知识版本已经是当前生效版本。");
      const source = (await this.database.query<DesignKnowledgeReleaseRow>(
        "SELECT * FROM design_knowledge_releases WHERE id = $1", [input.sourceReleaseId],
      )).rows[0];
      if (!source) throw new Error("要恢复的历史知识版本不存在。");
      if (latest.release_kind === "rollback" && latest.rollback_source_release_id === source.id) {
        return toDesignKnowledgeRelease(latest);
      }
      const raw = typeof source.library_json === "string" ? JSON.parse(source.library_json) : source.library_json;
      const validated = validateGameDesignKnowledgeLibrary(raw);
      if (!validated.valid || !validated.library || knowledgeChecksum(validated.library) !== source.checksum) {
        throw new Error("历史知识版本未通过完整性校验，不能恢复。");
      }
      if (latest.checksum === source.checksum) throw new Error("所选知识内容已经在当前版本生效。");
      const id = randomUUID();
      const sequence = Number(latest.sequence) + 1;
      const publishedAt = new Date().toISOString();
      await this.database.query(
        `INSERT INTO design_knowledge_releases
          (id, sequence, release_kind, change_set_id, rollback_source_release_id, rationale,
           schema_version, library_json, checksum, supersedes_release_id, published_at)
         VALUES ($1,$2,'rollback',NULL,$3,$4,$5,$6,$7,$8,$9)`,
        [id, sequence, source.id, input.rationale, validated.library.schemaVersion, JSON.stringify(validated.library), source.checksum, latest.id, publishedAt],
      );
      return {
        id,
        sequence,
        kind: "rollback",
        changeSetId: null,
        rollbackSourceReleaseId: source.id,
        rationale: input.rationale,
        schemaVersion: validated.library.schemaVersion,
        checksum: source.checksum,
        supersedesReleaseId: latest.id,
        publishedAt,
      } satisfies DesignKnowledgeRelease;
    });
  }

  async recordDesignPlaytest(rawInput: unknown) {
    const input = designPlaytestInputSchema.parse(rawInput);
    const version = (await this.database.query<{ spec_json: string | GameSpec }>(
      `SELECT gs.spec_json FROM versions v JOIN game_specs gs ON gs.id = v.spec_id
       WHERE v.id = $1 AND v.project_id = $2`,
      [input.versionId, input.projectId],
    )).rows[0];
    if (!version) throw new Error("游戏版本不存在。");
    const spec = typeof version.spec_json === "string" ? JSON.parse(version.spec_json) as GameSpec : version.spec_json;
    const patternId = knowledgePatternIdForSpec(spec, await this.currentDesignKnowledgeLibrary());
    if (!patternId) throw new Error("该版本尚未关联稳定的玩法知识，不能进入结构化复核。");
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await this.database.query(
      `INSERT INTO design_playtests
        (id, project_id, version_id, pattern_id, tester_segment, device_class, input_mode, task_outcome,
         onboarding_clarity, control_clarity, perceived_difficulty, fun_rating, fairness_rating,
         would_replay, completion_seconds, hint_count, blocker_code, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [id, input.projectId, input.versionId, patternId, input.testerSegment, input.deviceClass, input.inputMode, input.taskOutcome,
        input.onboardingClarity, input.controlClarity, input.perceivedDifficulty, input.funRating, input.fairnessRating,
        this.database.provider === "sqlite-test" ? (input.wouldReplay ? 1 : 0) : input.wouldReplay,
        input.completionSeconds ?? null, input.hintCount, input.blockerCode, createdAt],
    );
    return { id, patternId, createdAt, ...input } satisfies DesignPlaytest;
  }

  async listDesignPlaytests() {
    return (await this.database.query<DesignPlaytestRow>(
      "SELECT * FROM design_playtests ORDER BY created_at DESC LIMIT 500",
    )).rows.map(toDesignPlaytest);
  }

  async get(projectId: string): Promise<ProjectDetail | null> {
    const row = (await this.database.query<ProjectRow>(`${projectSelect} WHERE p.id = $1`, [projectId])).rows[0];
    if (!row?.spec_json) return null;
    return projectDetailSchema.parse({
      ...toSummary(row, this.gameOrigin),
      spec: typeof row.spec_json === "string" ? JSON.parse(row.spec_json) : row.spec_json,
    });
  }

  async create(rawInput: unknown, ideaAnalysis: IdeaAnalysis | null = null, designProfile: GameDesignProfile | null = null, designKnowledge: DesignKnowledgeShadow | null = null, resourcePlanning: ResourcePlanningShadow | null = null) {
    const input = projectInputSchema.parse(rawInput);
    const projectId = input.requestId ?? randomUUID();
    const createdAt = new Date().toISOString();
    const preliminarySpec = designKnowledge ? null : generateGameSpec(input, ideaAnalysis, designProfile, null, resourcePlanning);
    const resolvedKnowledge = designKnowledge ?? createDesignKnowledgeShadow({
      ...input,
      template: preliminarySpec!.template,
      dimensions: preliminarySpec!.dimensions,
      inputModes: preliminarySpec!.inputModes,
      threeMode: preliminarySpec!.threeMode,
    }, ideaAnalysis, await this.currentDesignKnowledgeLibrary());
    const baseSpec = generateGameSpec(input, ideaAnalysis, designProfile, resolvedKnowledge, resourcePlanning);
    const designContract = createGameDesignContractForLegacyProject({
      projectId,
      title: baseSpec.title,
      idea: input.idea,
      createdAt,
      spec: baseSpec,
      designKnowledge: resolvedKnowledge,
    });
    const spec = gameSpecSchema.parse({ ...baseSpec, designContract });
    // uniqueSlug() checks-then-inserts against the slug UNIQUE constraint; serialize all
    // project creation without a preferred slug through one lock so two concurrent creates
    // with the same title cannot both observe "no such slug yet" and collide.
    await this.locks.run(SLUG_LOCK_KEY, async () => {
      const existing = await this.get(projectId);
      if (existing) {
        if (existing.idea !== input.idea) throw new Error("创建请求与已有项目不一致。");
        return;
      }
      await insertProject(this.database, input, spec, null, undefined, false, projectId);
    });
    const project = await this.get(projectId);
    if (!project) throw new Error("项目写入后无法读取。");
    return project;
  }

  async latestPlayableBuild(projectId: string) {
    const row = (await this.database.query<{ id: string }>(
      "SELECT id FROM builds WHERE project_id = $1 AND status = 'succeeded' AND version_id IS NOT NULL ORDER BY created_at DESC LIMIT 1", [projectId],
    )).rows[0];
    return row ? this.buildById(row.id) : null;
  }

  async recentReusableBuilds(projectId: string, excludeBuildId: string): Promise<Array<{ id: string }>> {
    return (await this.database.query<{ id: string }>(
      "SELECT id FROM builds WHERE project_id = $1 AND id <> $2 AND status IN ('failed', 'succeeded') ORDER BY created_at DESC, id DESC LIMIT 8",
      [projectId, excludeBuildId],
    )).rows;
  }

  async latestBuild(projectId: string) {
    const row = (await this.database.query<BuildRow>(
      "SELECT * FROM builds WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1", [projectId],
    )).rows[0];
    if (!row) return null;
    const steps = (await this.database.query<BuildStepRow>(
      "SELECT * FROM build_steps WHERE build_id = $1 ORDER BY sequence", [row.id],
    )).rows;
    return toBuild(row, steps, this.gameOrigin);
  }

  async revisionBuild(projectId: string, requestId: string) {
    const row = (await this.database.query<{ id: string }>(
      "SELECT b.id FROM builds b JOIN project_messages m ON m.id = b.id AND m.project_id = b.project_id WHERE b.id = $1 AND b.project_id = $2 AND m.role = 'user'", [requestId, projectId],
    )).rows[0];
    return row ? this.buildById(row.id) : null;
  }

  async createBuild(projectId: string, revision?: { requestId: string; content: string }) {
    const confirmed = revision ? projectRevisionInputSchema.parse(revision) : null;
    // The "is there already a queued/running build" check and the INSERT that follows must be
    // atomic per project, otherwise two concurrent calls (e.g. a double click) can both see "no
    // active build" and each insert their own build row.
    return this.locks.run(`build:${projectId}`, async () => {
      const project = await this.get(projectId);
      if (!project) throw new Error("项目不存在。");
      const buildId = await this.database.transaction(async transaction => {
      const lockedProject = (await transaction.query<{ archived_at: string | null; fixture_kind: string | null }>(
        `SELECT archived_at, fixture_kind FROM projects WHERE id = $1${transaction.provider === "postgresql" ? " FOR UPDATE" : ""}`, [projectId],
      )).rows[0];
      if (!lockedProject) throw new Error("项目不存在。");
      if (confirmed) {
        const existing = (await transaction.query<{ project_id: string; content: string }>(
          "SELECT b.project_id, m.content FROM builds b LEFT JOIN project_messages m ON m.id = b.id WHERE b.id = $1", [confirmed.requestId],
        )).rows[0];
        if (existing) {
          if (existing.project_id !== projectId || existing.content !== confirmed.content) throw new Error("修改请求编号已用于其他内容，不能重复使用。");
          return confirmed.requestId;
        }
      }
      if (lockedProject.archived_at) throw new Error("归档项目不能开始新的构建，请先恢复项目。");
      if (lockedProject.fixture_kind) throw new Error("黄金游戏已经有完整构建记录。");
      const active = (await transaction.query<{ id: string }>(
        "SELECT id FROM builds WHERE project_id = $1 AND status IN ('queued', 'running') LIMIT 1", [projectId],
      )).rows[0];
      if (active) {
        if (confirmed) throw new Error("当前游戏仍在制作，请等本次任务结束后再确认修改。");
        return active.id;
      }

      const buildId = confirmed?.requestId ?? randomUUID();
      const now = new Date().toISOString();
        // The direction and build receipt are one transaction: neither can exist
        // without the other. Repeating this receipt never creates another build.
        if (confirmed) await transaction.query(
          "INSERT INTO project_messages (id, project_id, role, content, created_at) VALUES ($1, $2, 'user', $3, $4)",
          [buildId, projectId, confirmed.content, now],
        );
        await transaction.query(
          `INSERT INTO builds (id, project_id, status, runtime_target, created_at, started_at, completed_at, version_id, error_message)
           VALUES ($1, $2, 'queued', $3, $4, NULL, NULL, NULL, NULL)`,
          [buildId, projectId, project.spec.runtimeTarget, now],
        );
        for (const [sequence, step] of buildPlan.entries()) {
          await transaction.query(
            `INSERT INTO build_steps (id, build_id, sequence, kind, title, detail, status)
             VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
            [randomUUID(), buildId, sequence, step.kind, step.title, step.detail],
          );
        }
        return buildId;
      });
      return this.buildById(buildId);
    });
  }

  async buildById(buildId: string) {
    const row = (await this.database.query<BuildRow>("SELECT * FROM builds WHERE id = $1", [buildId])).rows[0];
    if (!row) throw new Error("构建任务不存在。");
    const steps = (await this.database.query<BuildStepRow>(
      "SELECT * FROM build_steps WHERE build_id = $1 ORDER BY sequence", [buildId],
    )).rows;
    return toBuild(row, steps, this.gameOrigin);
  }

  async markBuildRunning(buildId: string) {
    const claimed = await this.database.query("UPDATE builds SET status = 'running', started_at = $1 WHERE id = $2 AND status = 'queued'", [new Date().toISOString(), buildId]);
    return claimed.rowCount === 1;
  }

  async markStepRunning(buildId: string, sequence: number) {
    await this.database.query(
      "UPDATE build_steps SET status = 'running', started_at = $1 WHERE build_id = $2 AND sequence = $3",
      [new Date().toISOString(), buildId, sequence],
    );
  }

  async reportStepProgress(buildId: string, sequence: number, detail: string) {
    await this.database.query(
      "UPDATE build_steps SET detail = $1 WHERE build_id = $2 AND sequence = $3 AND status = 'running'",
      [detail, buildId, sequence],
    );
  }

  async completeStep(buildId: string, sequence: number, output: string) {
    await this.database.query(
      "UPDATE build_steps SET status = 'succeeded', output_text = $1, completed_at = $2 WHERE build_id = $3 AND sequence = $4",
      [output, new Date().toISOString(), buildId, sequence],
    );
  }

  async failBuild(buildId: string, sequence: number, message: string) {
    const now = new Date().toISOString();
    await this.database.transaction(async (transaction) => {
      await transaction.query(
        "UPDATE build_steps SET status = 'failed', output_text = $1, completed_at = $2 WHERE build_id = $3 AND sequence = $4",
        [message, now, buildId, sequence],
      );
      await transaction.query(
        "UPDATE builds SET status = 'failed', error_message = $1, completed_at = $2 WHERE id = $3",
        [message, now, buildId],
      );
    });
  }

  async completeBuild(buildId: string, specOverride: GameSpec | undefined, rawQualityReport: VersionQualityReport) {
    const qualityReport = versionQualityReportSchema.parse(rawQualityReport);
    if (qualityReport.status !== "passed") throw new Error("自动验收未通过，不能生成可发布版本。");
    const build = await this.buildById(buildId);
    // "SELECT MAX(number)" followed by an INSERT into versions must be atomic per project,
    // otherwise two builds finishing around the same time can both compute the same next
    // version number and collide on the UNIQUE(project_id, number) constraint. Shares the
    // "version:<projectId>" key with createFixtureVersion so the two never race each other either.
    return this.locks.run(`version:${build.projectId}`, async () => {
      const project = await this.get(build.projectId);
      if (!project) throw new Error("项目不存在。");
      const latest = (await this.database.query<{ value: number | null }>(
        "SELECT MAX(number) AS value FROM versions WHERE project_id = $1", [project.id],
      )).rows[0]?.value ?? 0;
      const nextNumber = Number(latest) + 1;
      const specId = randomUUID();
      const now = new Date().toISOString();
      const sourceSpec = specOverride ?? project.spec;
      const verifiedSpec = gameSpecSchema.parse({
        ...sourceSpec,
        acceptanceCriteria: sourceSpec.acceptanceCriteria.map((criterion) => ({
          ...criterion,
          status: criterion.probeType === "visual" ? "pending" : "passed",
        })),
      });
      await this.database.transaction(async (transaction) => {
        await transaction.query(
          "INSERT INTO game_specs (id, project_id, spec_json, created_at) VALUES ($1, $2, $3, $4)",
          [specId, project.id, JSON.stringify(verifiedSpec), now],
        );
        await transaction.query(
          `INSERT INTO versions (id, project_id, spec_id, number, label, quality_status, quality_summary, quality_report_json, quality_checked_at,
             art_review_status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'passed', $6, $7, $8, 'pending', $8)`,
          [buildId, project.id, specId, nextNumber, `可玩构建 v${nextNumber}`, qualityReport.summary, JSON.stringify(qualityReport), qualityReport.checkedAt],
        );
        await transaction.query(
          "UPDATE projects SET status = CASE WHEN EXISTS (SELECT 1 FROM publications WHERE project_id = $1 AND status = 'live') THEN 'published' ELSE 'playable' END WHERE id = $1",
          [project.id],
        );
        await transaction.query(
          "UPDATE builds SET status = 'succeeded', version_id = $1, error_message = NULL, completed_at = $2 WHERE id = $1",
          [buildId, now],
        );
      });
      const completed = await this.get(project.id);
      if (!completed) throw new Error("构建完成后无法读取项目。");
      return completed;
    });
  }

  async createFixtureVersion(projectId: string, versionId: string, rawQualityReport: VersionQualityReport) {
    const qualityReport = versionQualityReportSchema.parse(rawQualityReport);
    if (qualityReport.status !== "passed") throw new Error("固定游戏自动验收未通过，不能生成新版本。");
    // Same "version:<projectId>" lock as completeBuild: the MAX(number)-then-INSERT sequence
    // below needs to be atomic per project, and must also serialize against completeBuild.
    return this.locks.run(`version:${projectId}`, async () => {
      const project = await this.get(projectId);
      if (!project?.fixtureKind) throw new Error("只有固定游戏可以使用固定版本导入。");
      const existing = await this.database.query("SELECT 1 FROM versions WHERE id = $1", [versionId]);
      if (existing.rowCount) throw new Error("固定游戏版本标识已经存在。");
      const nextNumber = Number((await this.database.query<{ value: number | null }>(
        "SELECT MAX(number) AS value FROM versions WHERE project_id = $1", [projectId],
      )).rows[0]?.value ?? 0) + 1;
      const specId = randomUUID();
      const now = new Date().toISOString();
      const verifiedSpec = gameSpecSchema.parse({
        ...project.spec,
        presentationVersion: Math.max(project.spec.presentationVersion, 5),
        acceptanceCriteria: project.spec.acceptanceCriteria.map((criterion) => ({
          ...criterion,
          status: criterion.probeType === "visual" ? "pending" : "passed",
        })),
      });
      await this.database.transaction(async (transaction) => {
        await transaction.query(
          "INSERT INTO game_specs (id, project_id, spec_json, created_at) VALUES ($1, $2, $3, $4)",
          [specId, projectId, JSON.stringify(verifiedSpec), now],
        );
        await transaction.query(
          `INSERT INTO versions (id, project_id, spec_id, number, label, quality_status, quality_summary, quality_report_json, quality_checked_at,
             art_review_status, created_at)
           VALUES ($1, $2, $3, $4, $5, 'passed', $6, $7, $8, 'pending', $9)`,
          [versionId, projectId, specId, nextNumber, `固定游戏兼容版本 v${nextNumber}`, qualityReport.summary, JSON.stringify(qualityReport), qualityReport.checkedAt, now],
        );
        await transaction.query(
          "UPDATE projects SET status = CASE WHEN EXISTS (SELECT 1 FROM publications WHERE project_id = $1 AND status = 'live') THEN 'published' ELSE 'playable' END WHERE id = $1",
          [projectId],
        );
      });
      const created = await this.get(projectId);
      if (!created) throw new Error("固定游戏版本创建后无法读取项目。");
      return created;
    });
  }

  async listVersions(projectId: string): Promise<ProjectVersion[]> {
    const project = await this.get(projectId);
    if (!project) throw new Error("项目不存在。");
    const rows = (await this.database.query<{
      id: string;
      number: number;
      label: string;
      created_at: DateValue;
      quality_status: ProjectVersion["qualityStatus"];
      quality_summary: string | null;
      quality_checked_at: DateValue | null;
      art_review_status: ProjectVersion["artReviewStatus"];
      art_review_summary: string | null;
      art_reviewed_at: DateValue | null;
      published_version_id: string | null;
    }>(
      `SELECT v.id, v.number, v.label, v.created_at, v.quality_status, v.quality_summary, v.quality_checked_at,
         v.art_review_status, v.art_review_summary, v.art_reviewed_at,
         pub.version_id AS published_version_id
       FROM versions v LEFT JOIN publications pub ON pub.project_id = v.project_id
       WHERE v.project_id = $1 ORDER BY v.number DESC`,
      [projectId],
    )).rows;
    return rows.map((row) => projectVersionSchema.parse({
      id: row.id,
      number: Number(row.number),
      label: row.label,
      createdAt: iso(row.created_at),
      qualityStatus: row.quality_status,
      qualitySummary: row.quality_summary,
      qualityCheckedAt: iso(row.quality_checked_at),
      artReviewStatus: row.art_review_status,
      artReviewSummary: row.art_review_summary,
      artReviewedAt: iso(row.art_reviewed_at),
      isPublished: row.published_version_id === row.id,
    }));
  }

  async listVersionArtReviews(projectId: string, versionId: string) {
    const version = await this.database.query("SELECT id FROM versions WHERE project_id = $1 AND id = $2", [projectId, versionId]);
    if (!version.rowCount) throw new Error("要查询审核记录的版本不存在。");
    const rows = (await this.database.query<{
      id: string; sequence: number; previous_status: string; status: string; summary: string; reviewed_at: DateValue; reviewer_id: string | null;
    }>("SELECT id, sequence, previous_status, status, summary, reviewed_at, reviewer_id FROM version_art_reviews WHERE project_id = $1 AND version_id = $2 ORDER BY sequence DESC", [projectId, versionId])).rows;
    return rows.map(row => ({ id: row.id, projectId, versionId, sequence: row.sequence, previousStatus: row.previous_status, status: row.status, summary: row.summary, reviewedAt: iso(row.reviewed_at), reviewerId: row.reviewer_id, source: row.reviewer_id ? "operator-credential" as const : "manual-unverified" as const }));
  }

  async reviewVersionArt(projectId: string, versionId: string, rawInput: unknown, reviewer?: { id: string }) {
    const project = await this.get(projectId);
    if (!project) throw new Error("项目不存在。");
    if (project.archivedAt) throw new Error("归档项目不能验收，请先恢复项目。");
    const input = versionArtReviewInputSchema.parse(rawInput);
    const version = (await this.database.query<{
      quality_status: ProjectVersion["qualityStatus"];
      spec_id: string;
      spec_json: string | GameSpec;
    }>(
      `SELECT v.quality_status, v.spec_id, gs.spec_json FROM versions v
       JOIN game_specs gs ON gs.id = v.spec_id WHERE v.id = $1 AND v.project_id = $2`,
      [versionId, projectId],
    )).rows[0];
    if (!version) throw new Error("要验收的游戏版本不存在。");
    if (version.quality_status !== "passed") throw new Error("自动验收通过后才能进行主美复核。");
    const reviewedAt = new Date().toISOString();
    const storedSpec = typeof version.spec_json === "string" ? JSON.parse(version.spec_json) as GameSpec : version.spec_json;
    const reviewedSpec = gameSpecSchema.parse({
      ...storedSpec,
      acceptanceCriteria: storedSpec.acceptanceCriteria.map((criterion) => (
        criterion.probeType === "visual" ? { ...criterion, status: input.status } : criterion
      )),
    });
    await this.database.transaction(async (transaction) => {
      // Serialize reviewers on this version in PostgreSQL. SQLite test transactions
      // already serialize writes. Evidence and the current verdict must commit together.
      await transaction.query(`SELECT id FROM versions WHERE id = $1${transaction.provider === "postgresql" ? " FOR UPDATE" : ""}`, [versionId]);
      await transaction.query(
        `INSERT INTO version_art_reviews (id, project_id, version_id, sequence, previous_status, status, summary, reviewed_at, reviewer_id)
         SELECT $1, $2, v.id, (SELECT COALESCE(MAX(r.sequence), 0) + 1 FROM version_art_reviews r WHERE r.version_id = v.id), v.art_review_status, $3, $4, $5, $7
         FROM versions v WHERE v.id = $6 AND v.project_id = $2`,
        [randomUUID(), projectId, input.status, input.summary, reviewedAt, versionId, reviewer?.id ?? null],
      );
      await transaction.query(
        "UPDATE versions SET art_review_status = $1, art_review_summary = $2, art_reviewed_at = $3 WHERE id = $4",
        [input.status, input.summary, reviewedAt, versionId],
      );
      await transaction.query("UPDATE game_specs SET spec_json = $1 WHERE id = $2", [JSON.stringify(reviewedSpec), version.spec_id]);
    });
    return this.listVersions(projectId);
  }

  async publish(projectId: string, requestedVersionId?: string, requireVerifiedReviewer = false) {
    const project = await this.get(projectId);
    if (!project) throw new Error("项目不存在。");
    if (project.archivedAt) throw new Error("归档项目不能发布，请先恢复项目。");
    if (project.status === "contract_ready") throw new Error("玩法合同已经保存，但还没有可发布的游戏构建。");
    const versionId = requestedVersionId ?? project.version.id;
    const now = new Date().toISOString();
    const versionPath = `/version/${versionId}/`;
    const stablePath = `/play/${project.slug}/`;
    await this.database.transaction(async (transaction) => {
      // Re-check under database locks, not from the earlier UI/project snapshot.
      // Project first serializes publication switches and archive; version lock
      // is shared with manual review so a stale verdict cannot authorize a switch.
      const lock = transaction.provider === "postgresql" ? " FOR UPDATE" : "";
      const current = (await transaction.query<{ archived_at: DateValue | null; status: string }>(
        `SELECT archived_at, status FROM projects WHERE id = $1${lock}`, [projectId],
      )).rows[0];
      if (!current) throw new Error("项目不存在。");
      if (current.archived_at) throw new Error("归档项目不能发布，请先恢复项目。");
      if (current.status === "contract_ready") throw new Error("玩法合同已经保存，但还没有可发布的游戏构建。");
      const targetVersion = (await transaction.query<{
        id: string; quality_status: ProjectVersion["qualityStatus"]; art_review_status: ProjectVersion["artReviewStatus"];
      }>(`SELECT id, quality_status, art_review_status FROM versions WHERE id = $1 AND project_id = $2${lock}`, [versionId, projectId])).rows[0];
      if (!targetVersion) throw new Error("要发布的游戏版本不存在。");
      if (targetVersion.quality_status !== "passed") throw new Error(targetVersion.quality_status === "failed"
        ? "这个版本没有通过质量验收，不能发布。" : "这个版本还没有完成质量验收，不能发布。");
      if (targetVersion.art_review_status !== "passed") throw new Error(targetVersion.art_review_status === "failed"
        ? "这个版本没有通过主美复核，不能发布。" : "这个版本还没有通过主美复核，不能发布。");
      if (requireVerifiedReviewer) {
        const review = (await transaction.query<{ status: string; reviewer_id: string | null }>(
          "SELECT status, reviewer_id FROM version_art_reviews WHERE version_id = $1 AND project_id = $2 ORDER BY sequence DESC LIMIT 1", [versionId, projectId],
        )).rows[0];
        if (!review?.reviewer_id || review.status !== "passed") throw new Error("正式发布需要平台审核凭据确认的最新通过记录，历史未验证记录不能替代。私下试玩不受影响。");
      }
      await transaction.query(
        `INSERT INTO publications (id, project_id, version_id, status, stable_path, version_path, published_at)
         VALUES ($1, $2, $3, 'live', $4, $5, $6)
         ON CONFLICT(project_id) DO UPDATE SET version_id = EXCLUDED.version_id, status = 'live',
           version_path = EXCLUDED.version_path, published_at = EXCLUDED.published_at`,
        [randomUUID(), projectId, versionId, stablePath, versionPath, now],
      );
      await transaction.query("UPDATE projects SET status = 'published' WHERE id = $1", [projectId]);
    });
    const published = await this.get(projectId);
    if (!published) throw new Error("发布后无法读取项目。");
    return published;
  }

  async listMessages(projectId: string) {
    const project = await this.get(projectId);
    if (!project) throw new Error("项目不存在。");
    const rows = (await this.database.query<ProjectMessageRow>(
      "SELECT * FROM project_messages WHERE project_id = $1 ORDER BY created_at, id",
      [projectId],
    )).rows;
    return rows.map(toProjectMessage);
  }

  async addMessage(projectId: string, rawInput: unknown) {
    const project = await this.get(projectId);
    if (!project) throw new Error("项目不存在。");
    if (project.archivedAt) throw new Error("归档项目不能修改，请先恢复项目。");
    const input = projectMessageInputSchema.parse(rawInput);
    const now = new Date();
    const userId = input.clientMessageId ?? randomUUID();
    const assistantId = randomUUID();
    const assistantContent = `我已把这条意见归入“${messageFocus(input.content)}”。下一次启动构建时，全部对话意见会被读入并用于修订设计合同；当前 v${project.version.number} 和已发布游戏不会被自动改动。`;
    await this.locks.run(`message:${userId}`, () => this.database.transaction(async (transaction) => {
      const inserted = await transaction.query(
        "INSERT INTO project_messages (id, project_id, role, content, created_at) VALUES ($1, $2, 'user', $3, $4) ON CONFLICT(id) DO NOTHING",
        [userId, projectId, input.content, now.toISOString()],
      );
      if (!inserted.rowCount) {
        const existing = (await transaction.query<{ project_id: string; role: string; content: string }>(
          "SELECT project_id, role, content FROM project_messages WHERE id = $1", [userId],
        )).rows[0];
        if (!existing || existing.project_id !== projectId || existing.role !== "user" || existing.content !== input.content) {
          throw new Error("意见标识已被其他内容使用，请刷新后重新提交。");
        }
        return;
      }
      await transaction.query(
        "INSERT INTO project_messages (id, project_id, role, content, created_at) VALUES ($1, $2, 'assistant', $3, $4)",
        [assistantId, projectId, assistantContent, new Date(now.getTime() + 1).toISOString()],
      );
    }));
    return this.listMessages(projectId);
  }

  async resolveGameBySlug(slug: string) {
    return (await this.database.query<{ project_id: string; fixture_kind: string | null; version_id: string }>(
      `SELECT p.id AS project_id, p.fixture_kind, pub.version_id FROM projects p
       JOIN publications pub ON pub.project_id = p.id WHERE p.slug = $1 AND pub.status = 'live'`,
      [slug],
    )).rows[0];
  }

  async resolveGameByVersion(versionId: string) {
    return (await this.database.query<{ project_id: string; fixture_kind: string | null; version_id: string }>(
      `SELECT p.id AS project_id, p.fixture_kind, v.id AS version_id FROM versions v
       JOIN projects p ON p.id = v.project_id WHERE v.id = $1`,
      [versionId],
    )).rows[0];
  }

  async getVersion(projectId: string, versionId: string): Promise<ProjectDetail | null> {
    const rows = (await this.database.query<ProjectRow>(`
      SELECT p.*, v.id AS version_id, v.number AS version_number, v.label AS version_label,
        v.created_at AS version_created_at, v.quality_status, v.quality_summary, v.quality_checked_at,
        v.art_review_status, v.art_review_summary, v.art_reviewed_at,
        gs.spec_json, pub.status AS publication_status, pub.stable_path, pub.version_path, pub.published_at,
        pub.version_id AS published_version_id, pv.number AS published_version_number
      FROM projects p
      JOIN versions v ON v.project_id = p.id AND v.id = $2
      JOIN game_specs gs ON gs.id = v.spec_id
      LEFT JOIN publications pub ON pub.project_id = p.id
      LEFT JOIN versions pv ON pv.id = pub.version_id
      WHERE p.id = $1`, [projectId, versionId])).rows;
    const row = rows[0];
    if (!row?.spec_json) return null;
    return projectDetailSchema.parse({
      ...toSummary(row, this.gameOrigin),
      spec: typeof row.spec_json === "string" ? JSON.parse(row.spec_json) : row.spec_json,
    });
  }
}
