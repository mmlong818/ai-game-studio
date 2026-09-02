import { randomUUID } from "node:crypto";
import type { StudioDatabase } from "./database.js";
import {
  buildSchema,
  gameSpecSchema,
  generateGameSpec,
  projectDetailSchema,
  projectInputSchema,
  projectMessageInputSchema,
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
type ProjectRow = {
  id: string;
  title: string;
  idea: string;
  slug: string;
  dimensions: "2d" | "3d";
  status: "contract_ready" | "playable" | "published";
  fixture_kind: string | null;
  is_official: boolean | number;
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
  { kind: "code", title: "生成可玩核心", detail: "写入独立 HTML、样式与游戏逻辑。" },
  { kind: "asset", title: "集成视听资源", detail: "装配可追溯的生成图像、环境音乐、音效与界面反馈。" },
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

function originWithoutSlash(origin: string) {
  return origin.endsWith("/") ? origin.slice(0, -1) : origin;
}

// 游戏产物 URL(封面、稳定网址、版本网址、预览)统一走 gameOrigin,
// 与工作台 API 的 publicOrigin 分离,让 iframe 试玩获得真实跨源隔离。
function toSummary(row: ProjectRow, gameOrigin: string): ProjectSummary {
  const origin = originWithoutSlash(gameOrigin);
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
    isOfficial: Boolean(row.is_official),
    coverUrl: row.publication_status && row.stable_path
      ? `${origin}${row.stable_path}${row.fixture_kind === "star-dream-duel" ? "icons/app-icon-512.png" : "assets/cover.png"}`
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
) {
  const now = new Date().toISOString();
  const officialValue = database.provider === "sqlite-test" ? Number(isOfficial) : isOfficial;
  const projectId = randomUUID();
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

const goldenInput: ProjectInput = {
  title: "星梦对决",
  dimensions: "2d",
  idea: "玩家与 AI 共用一个棋盘轮流三消。玩家只能操作下半区，AI 只能操作上半区，所有连消归当前行动者，任一方积分归零时结束。",
};

function acceptedGoldenSpec() {
  const spec = generateGameSpec(goldenInput);
  return gameSpecSchema.parse({
    ...spec,
    acceptanceCriteria: [
      ...spec.acceptanceCriteria,
      { id: "AC-ZONE", priority: "P0", statement: "玩家与 AI 的分区操作权限始终有效", probeType: "state", status: "passed" },
      { id: "AC-CASCADE", priority: "P0", statement: "整段连消伤害归当前行动触发者", probeType: "state", status: "passed" },
    ].map((criterion) => ({ ...criterion, status: "passed" })),
  });
}

export class StudioRepository {
  private readonly locks = new KeyedMutex();

  private readonly gameOrigin: string;

  constructor(private readonly database: StudioDatabase, private readonly publicOrigin: string, gameOrigin: string | null = null) {
    this.gameOrigin = gameOrigin ?? publicOrigin;
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
    const initialized = (await this.database.query<{ value: string }>(
      "SELECT value FROM studio_meta WHERE key = $1", ["golden_fixture_initialized"],
    )).rows[0];
    const existing = (await this.database.query<{ id: string }>(
      "SELECT id FROM projects WHERE fixture_kind = $1", ["star-dream-duel"],
    )).rows[0];
    if (initialized) return existing?.id ?? null;
    if (existing) {
      await this.ensureGoldenBuild(existing.id);
      await this.database.query(
        "INSERT INTO studio_meta (key, value) VALUES ($1, $2)",
        ["golden_fixture_initialized", "true"],
      );
      return existing.id;
    }
    const projectId = await this.locks.run(SLUG_LOCK_KEY, () => insertProject(this.database, goldenInput, acceptedGoldenSpec(), "star-dream-duel", "star-dream-duel", true));
    await this.publish(projectId);
    await this.ensureGoldenBuild(projectId);
    await this.database.query(
      "INSERT INTO studio_meta (key, value) VALUES ($1, $2)",
      ["golden_fixture_initialized", "true"],
    );
    return projectId;
  }

  async failInterruptedBuilds() {
    const interrupted = (await this.database.query<{ id: string }>(
      "SELECT id FROM builds WHERE status IN ('queued', 'running')",
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

  private async ensureGoldenBuild(projectId: string) {
    const existing = (await this.database.query<{ id: string }>(
      "SELECT id FROM builds WHERE project_id = $1 LIMIT 1", [projectId],
    )).rows[0];
    if (existing) return;
    const project = await this.get(projectId);
    if (!project) return;
    const buildId = randomUUID();
    const now = project.version.createdAt;
    const goldenOutputs = [
      "共享 8×8 棋盘、分区操作、连消归属与三局两胜已锁定。",
      "GAME_DESIGN、ART_DIRECTION、SOUND_DIRECTION 已形成。",
      "已接入棋盘规则、玩家输入、AI 回合与结算逻辑。",
      "棋子、音效、PWA 图标与触控反馈已经集成。",
      "8 项规则测试与页面结构检查通过。",
      "稳定玩家网址和不可变版本网址已生成。",
    ];
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
          [randomUUID(), buildId, sequence, step.kind, step.title, step.detail, goldenOutputs[sequence], now],
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
    return rows.map((row) => toSummary(row, this.gameOrigin))
      .filter((project) => project.status === "published" && project.publication?.status === "live")
      .sort((left, right) => (right.publication?.publishedAt ?? "").localeCompare(left.publication?.publishedAt ?? ""));
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

  async get(projectId: string): Promise<ProjectDetail | null> {
    const row = (await this.database.query<ProjectRow>(`${projectSelect} WHERE p.id = $1`, [projectId])).rows[0];
    if (!row?.spec_json) return null;
    return projectDetailSchema.parse({
      ...toSummary(row, this.gameOrigin),
      spec: typeof row.spec_json === "string" ? JSON.parse(row.spec_json) : row.spec_json,
    });
  }

  async create(rawInput: unknown, ideaAnalysis: IdeaAnalysis | null = null, designProfile: GameDesignProfile | null = null) {
    const input = projectInputSchema.parse(rawInput);
    const spec = generateGameSpec(input, ideaAnalysis, designProfile);
    // uniqueSlug() checks-then-inserts against the slug UNIQUE constraint; serialize all
    // project creation without a preferred slug through one lock so two concurrent creates
    // with the same title cannot both observe "no such slug yet" and collide.
    const projectId = await this.locks.run(SLUG_LOCK_KEY, () => insertProject(this.database, input, spec));
    const project = await this.get(projectId);
    if (!project) throw new Error("项目写入后无法读取。");
    return project;
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

  async createBuild(projectId: string) {
    // The "is there already a queued/running build" check and the INSERT that follows must be
    // atomic per project, otherwise two concurrent calls (e.g. a double click) can both see "no
    // active build" and each insert their own build row.
    return this.locks.run(`build:${projectId}`, async () => {
      const project = await this.get(projectId);
      if (!project) throw new Error("项目不存在。");
      if (project.archivedAt) throw new Error("归档项目不能开始新的构建，请先恢复项目。");
      if (project.fixtureKind) throw new Error("黄金游戏已经有完整构建记录。");
      const active = (await this.database.query<{ id: string }>(
        "SELECT id FROM builds WHERE project_id = $1 AND status IN ('queued', 'running') LIMIT 1", [projectId],
      )).rows[0];
      if (active) return this.buildById(active.id);

      const buildId = randomUUID();
      const now = new Date().toISOString();
      await this.database.transaction(async (transaction) => {
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
    await this.database.query("UPDATE builds SET status = 'running', started_at = $1 WHERE id = $2", [new Date().toISOString(), buildId]);
  }

  async markStepRunning(buildId: string, sequence: number) {
    await this.database.query(
      "UPDATE build_steps SET status = 'running', started_at = $1 WHERE build_id = $2 AND sequence = $3",
      [new Date().toISOString(), buildId, sequence],
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

  async reviewVersionArt(projectId: string, versionId: string, rawInput: unknown) {
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
      await transaction.query(
        "UPDATE versions SET art_review_status = $1, art_review_summary = $2, art_reviewed_at = $3 WHERE id = $4",
        [input.status, input.summary, reviewedAt, versionId],
      );
      await transaction.query("UPDATE game_specs SET spec_json = $1 WHERE id = $2", [JSON.stringify(reviewedSpec), version.spec_id]);
    });
    return this.listVersions(projectId);
  }

  async publish(projectId: string, requestedVersionId?: string) {
    const project = await this.get(projectId);
    if (!project) throw new Error("项目不存在。");
    if (project.archivedAt) throw new Error("归档项目不能发布，请先恢复项目。");
    if (project.status === "contract_ready") throw new Error("玩法合同已经保存，但还没有可发布的游戏构建。");
    const versionId = requestedVersionId ?? project.version.id;
    const targetVersion = (await this.database.query<{
      id: string;
      quality_status: ProjectVersion["qualityStatus"];
      art_review_status: ProjectVersion["artReviewStatus"];
    }>("SELECT id, quality_status, art_review_status FROM versions WHERE id = $1 AND project_id = $2", [versionId, projectId])).rows[0];
    if (!targetVersion) throw new Error("要发布的游戏版本不存在。");
    if (targetVersion.quality_status !== "passed") {
      throw new Error(targetVersion.quality_status === "failed"
        ? "这个版本没有通过质量验收，不能发布。"
        : "这个版本还没有完成质量验收，不能发布。");
    }
    if (targetVersion.art_review_status !== "passed") {
      throw new Error(targetVersion.art_review_status === "failed"
        ? "这个版本没有通过主美复核，不能发布。"
        : "这个版本还没有通过主美复核，不能发布。");
    }
    const now = new Date().toISOString();
    const versionPath = `/version/${versionId}/`;
    const stablePath = `/play/${project.slug}/`;
    await this.database.transaction(async (transaction) => {
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
    const userId = randomUUID();
    const assistantId = randomUUID();
    const assistantContent = `我已把这条意见归入“${messageFocus(input.content)}”。下一次启动构建时，全部对话意见会被读入并用于修订设计合同；当前 v${project.version.number} 和已发布游戏不会被自动改动。`;
    await this.database.transaction(async (transaction) => {
      await transaction.query(
        "INSERT INTO project_messages (id, project_id, role, content, created_at) VALUES ($1, $2, 'user', $3, $4)",
        [userId, projectId, input.content, now.toISOString()],
      );
      await transaction.query(
        "INSERT INTO project_messages (id, project_id, role, content, created_at) VALUES ($1, $2, 'assistant', $3, $4)",
        [assistantId, projectId, assistantContent, new Date(now.getTime() + 1).toISOString()],
      );
    });
    return this.listMessages(projectId);
  }

  async resolveGameBySlug(slug: string) {
    return (await this.database.query<{ fixture_kind: string | null; version_id: string }>(
      `SELECT p.fixture_kind, pub.version_id FROM projects p
       JOIN publications pub ON pub.project_id = p.id WHERE p.slug = $1 AND pub.status = 'live'`,
      [slug],
    )).rows[0];
  }

  async resolveGameByVersion(versionId: string) {
    return (await this.database.query<{ fixture_kind: string | null; version_id: string }>(
      `SELECT p.fixture_kind, v.id AS version_id FROM versions v
       JOIN projects p ON p.id = v.project_id WHERE v.id = $1`,
      [versionId],
    )).rows[0];
  }
}
