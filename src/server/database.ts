import { Pool, type PoolClient, type QueryResultRow } from "pg";

export type QueryResult<Row> = {
  rows: Row[];
  rowCount: number;
};

export type StudioDatabase = {
  readonly provider: "postgresql" | "sqlite-test";
  query<Row extends QueryResultRow = QueryResultRow>(sql: string, values?: readonly unknown[]): Promise<QueryResult<Row>>;
  transaction<Result>(action: (database: StudioDatabase) => Promise<Result>): Promise<Result>;
  close(): Promise<void>;
};

const postgresSchema = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    idea TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    dimensions TEXT NOT NULL CHECK (dimensions IN ('2d', '3d')),
    status TEXT NOT NULL CHECK (status IN ('contract_ready', 'playable', 'published')),
    fixture_kind TEXT,
    is_official BOOLEAN NOT NULL DEFAULT FALSE,
    lobby_rank INTEGER,
    created_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ
  );

  ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS lobby_rank INTEGER;

  CREATE TABLE IF NOT EXISTS studio_meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS game_specs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    spec_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  );

  CREATE TABLE IF NOT EXISTS versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    spec_id TEXT NOT NULL REFERENCES game_specs(id),
    number INTEGER NOT NULL,
    label TEXT NOT NULL,
    quality_status TEXT NOT NULL DEFAULT 'legacy' CHECK (quality_status IN ('legacy', 'pending', 'passed', 'failed')),
    quality_summary TEXT,
    quality_report_json JSONB,
    quality_checked_at TIMESTAMPTZ,
    art_review_status TEXT NOT NULL DEFAULT 'legacy' CHECK (art_review_status IN ('legacy', 'pending', 'passed', 'failed')),
    art_review_summary TEXT,
    art_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    UNIQUE(project_id, number)
  );

  ALTER TABLE versions ADD COLUMN IF NOT EXISTS quality_status TEXT NOT NULL DEFAULT 'legacy';
  ALTER TABLE versions ADD COLUMN IF NOT EXISTS quality_summary TEXT;
  ALTER TABLE versions ADD COLUMN IF NOT EXISTS quality_report_json JSONB;
  ALTER TABLE versions ADD COLUMN IF NOT EXISTS quality_checked_at TIMESTAMPTZ;
  ALTER TABLE versions ADD COLUMN IF NOT EXISTS art_review_status TEXT NOT NULL DEFAULT 'legacy';
  ALTER TABLE versions ADD COLUMN IF NOT EXISTS art_review_summary TEXT;
  ALTER TABLE versions ADD COLUMN IF NOT EXISTS art_reviewed_at TIMESTAMPTZ;

  CREATE TABLE IF NOT EXISTS version_art_reviews (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    previous_status TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed')),
    summary TEXT NOT NULL,
    reviewed_at TIMESTAMPTZ NOT NULL,
    UNIQUE(version_id, sequence)
  );

  ALTER TABLE version_art_reviews ADD COLUMN IF NOT EXISTS reviewer_id TEXT;

  CREATE TABLE IF NOT EXISTS publications (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id),
    status TEXT NOT NULL CHECK (status IN ('live', 'offline')),
    stable_path TEXT NOT NULL UNIQUE,
    version_path TEXT NOT NULL UNIQUE,
    published_at TIMESTAMPTZ NOT NULL
  );

  CREATE TABLE IF NOT EXISTS builds (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
    runtime_target TEXT NOT NULL CHECK (runtime_target IN ('web-2d', 'web-3d')),
    created_at TIMESTAMPTZ NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    version_id TEXT,
    error_message TEXT
  );

  CREATE TABLE IF NOT EXISTS build_steps (
    id TEXT PRIMARY KEY,
    build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('analyze', 'document', 'code', 'asset', 'test', 'delivery')),
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'failed')),
    output_text TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    UNIQUE(build_id, sequence)
  );

  -- 运行中的步骤可附带一段正在生成的内容片段，让制作页能流式展示进展。
  ALTER TABLE build_steps ADD COLUMN IF NOT EXISTS live_excerpt TEXT;

  CREATE TABLE IF NOT EXISTS project_messages (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  );

  CREATE INDEX IF NOT EXISTS project_messages_project_time
    ON project_messages(project_id, created_at);

  CREATE TABLE IF NOT EXISTS play_events (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('start', 'complete', 'fail', 'exit', 'resource-error')),
    input_mode TEXT NOT NULL,
    viewport TEXT NOT NULL,
    level_number INTEGER,
    best_score DOUBLE PRECISION,
    average_fps DOUBLE PRECISION,
    created_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS play_events_project_time ON play_events(project_id, created_at);

  CREATE TABLE IF NOT EXISTS player_progress (
    player_id TEXT NOT NULL,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'exited')),
    current_level INTEGER NOT NULL DEFAULT 1,
    best_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    input_mode TEXT NOT NULL,
    viewport TEXT NOT NULL,
    average_fps DOUBLE PRECISION,
    resource_error_count INTEGER NOT NULL DEFAULT 0,
    last_played_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (player_id, project_id)
  );

  CREATE TABLE IF NOT EXISTS design_knowledge_reviews (
    id TEXT PRIMARY KEY,
    schema_version TEXT NOT NULL,
    window_from TIMESTAMPTZ NOT NULL,
    window_to TIMESTAMPTZ NOT NULL,
    minimum_players INTEGER NOT NULL,
    minimum_starts INTEGER NOT NULL,
    report_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS design_knowledge_reviews_created_at
    ON design_knowledge_reviews(created_at DESC);

  CREATE TABLE IF NOT EXISTS design_knowledge_decisions (
    id TEXT PRIMARY KEY,
    review_id TEXT NOT NULL REFERENCES design_knowledge_reviews(id) ON DELETE CASCADE,
    pattern_id TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('retain', 'promote', 'demote', 'retest')),
    rationale TEXT NOT NULL,
    evidence_json JSONB NOT NULL,
    decided_at TIMESTAMPTZ NOT NULL,
    UNIQUE(review_id, pattern_id)
  );

  CREATE TABLE IF NOT EXISTS design_research_tasks (
    id TEXT PRIMARY KEY,
    schema_version TEXT NOT NULL,
    task_json JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('queued', 'researching', 'review', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS design_research_tasks_updated_at ON design_research_tasks(updated_at DESC);

  CREATE TABLE IF NOT EXISTS design_gameplay_radar_clusters (
    id TEXT PRIMARY KEY,
    schema_version TEXT NOT NULL,
    normalized_title TEXT NOT NULL UNIQUE,
    cluster_json JSONB NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('watching', 'researching', 'linked', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS design_gameplay_radar_updated_at ON design_gameplay_radar_clusters(updated_at DESC);

  CREATE TABLE IF NOT EXISTS design_knowledge_change_sets (
    id TEXT PRIMARY KEY,
    review_id TEXT UNIQUE REFERENCES design_knowledge_reviews(id) ON DELETE CASCADE,
    research_task_id TEXT UNIQUE REFERENCES design_research_tasks(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL,
    base_schema_version TEXT NOT NULL,
    base_updated_at TEXT NOT NULL,
    base_evaluation_version INTEGER NOT NULL,
    base_release_id TEXT,
    changes_json JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'published')),
    review_rationale TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    resolved_at TIMESTAMPTZ
  );
  ALTER TABLE design_knowledge_change_sets ADD COLUMN IF NOT EXISTS review_rationale TEXT;
  ALTER TABLE design_knowledge_change_sets ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
  ALTER TABLE design_knowledge_change_sets ADD COLUMN IF NOT EXISTS base_release_id TEXT;
  ALTER TABLE design_knowledge_change_sets ALTER COLUMN review_id DROP NOT NULL;
  ALTER TABLE design_knowledge_change_sets ADD COLUMN IF NOT EXISTS research_task_id TEXT REFERENCES design_research_tasks(id) ON DELETE CASCADE;
  ALTER TABLE design_knowledge_change_sets DROP CONSTRAINT IF EXISTS design_knowledge_change_sets_origin_check;
  ALTER TABLE design_knowledge_change_sets ADD CONSTRAINT design_knowledge_change_sets_origin_check
    CHECK ((review_id IS NOT NULL) <> (research_task_id IS NOT NULL));
  ALTER TABLE design_knowledge_change_sets DROP CONSTRAINT IF EXISTS design_knowledge_change_sets_status_check;
  ALTER TABLE design_knowledge_change_sets ADD CONSTRAINT design_knowledge_change_sets_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'published'));

  CREATE TABLE IF NOT EXISTS design_knowledge_releases (
    id TEXT PRIMARY KEY,
    sequence INTEGER NOT NULL UNIQUE,
    release_kind TEXT NOT NULL DEFAULT 'change-set' CHECK (release_kind IN ('change-set', 'rollback')),
    change_set_id TEXT UNIQUE REFERENCES design_knowledge_change_sets(id),
    rollback_source_release_id TEXT REFERENCES design_knowledge_releases(id),
    rationale TEXT,
    schema_version TEXT NOT NULL,
    library_json JSONB NOT NULL,
    checksum TEXT NOT NULL,
    supersedes_release_id TEXT REFERENCES design_knowledge_releases(id),
    published_at TIMESTAMPTZ NOT NULL
  );
  ALTER TABLE design_knowledge_releases ALTER COLUMN change_set_id DROP NOT NULL;
  ALTER TABLE design_knowledge_releases ADD COLUMN IF NOT EXISTS release_kind TEXT NOT NULL DEFAULT 'change-set';
  ALTER TABLE design_knowledge_releases ADD COLUMN IF NOT EXISTS rollback_source_release_id TEXT REFERENCES design_knowledge_releases(id);
  ALTER TABLE design_knowledge_releases ADD COLUMN IF NOT EXISTS rationale TEXT;
  ALTER TABLE design_knowledge_releases DROP CONSTRAINT IF EXISTS design_knowledge_releases_release_kind_check;
  ALTER TABLE design_knowledge_releases ADD CONSTRAINT design_knowledge_releases_release_kind_check
    CHECK (release_kind IN ('change-set', 'rollback'));

  CREATE TABLE IF NOT EXISTS design_playtests (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    pattern_id TEXT NOT NULL,
    tester_segment TEXT NOT NULL CHECK (tester_segment IN ('novice', 'casual', 'experienced', 'expert')),
    device_class TEXT NOT NULL CHECK (device_class IN ('desktop', 'mobile', 'tablet')),
    input_mode TEXT NOT NULL CHECK (input_mode IN ('keyboard', 'pointer', 'touch', 'gamepad')),
    task_outcome TEXT NOT NULL CHECK (task_outcome IN ('completed', 'partial', 'blocked', 'abandoned')),
    onboarding_clarity INTEGER NOT NULL CHECK (onboarding_clarity BETWEEN 1 AND 5),
    control_clarity INTEGER NOT NULL CHECK (control_clarity BETWEEN 1 AND 5),
    perceived_difficulty INTEGER NOT NULL CHECK (perceived_difficulty BETWEEN 1 AND 5),
    fun_rating INTEGER NOT NULL CHECK (fun_rating BETWEEN 1 AND 5),
    fairness_rating INTEGER NOT NULL CHECK (fairness_rating BETWEEN 1 AND 5),
    would_replay BOOLEAN NOT NULL,
    completion_seconds INTEGER,
    hint_count INTEGER NOT NULL DEFAULT 0,
    blocker_code TEXT NOT NULL CHECK (blocker_code IN ('none', 'onboarding', 'controls', 'rules', 'difficulty', 'resource', 'performance', 'accessibility')),
    created_at TIMESTAMPTZ NOT NULL
  );
  CREATE INDEX IF NOT EXISTS design_playtests_pattern_time
    ON design_playtests(pattern_id, created_at DESC);
`;

const sqliteSchema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE projects (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, idea TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    dimensions TEXT NOT NULL, status TEXT NOT NULL, fixture_kind TEXT, is_official INTEGER NOT NULL DEFAULT 0, lobby_rank INTEGER, created_at TEXT NOT NULL,
    archived_at TEXT
  );
  CREATE TABLE studio_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE game_specs (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    spec_json TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE versions (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    spec_id TEXT NOT NULL REFERENCES game_specs(id), number INTEGER NOT NULL, label TEXT NOT NULL,
    quality_status TEXT NOT NULL DEFAULT 'legacy', quality_summary TEXT, quality_report_json TEXT,
    quality_checked_at TEXT, art_review_status TEXT NOT NULL DEFAULT 'legacy', art_review_summary TEXT,
    art_reviewed_at TEXT, created_at TEXT NOT NULL, UNIQUE(project_id, number)
  );
  CREATE TABLE version_art_reviews (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL, previous_status TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('passed', 'failed')),
    summary TEXT NOT NULL, reviewed_at TEXT NOT NULL, reviewer_id TEXT,
    UNIQUE(version_id, sequence)
  );
  CREATE TABLE publications (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id), status TEXT NOT NULL, stable_path TEXT NOT NULL UNIQUE,
    version_path TEXT NOT NULL UNIQUE, published_at TEXT NOT NULL
  );
  CREATE TABLE builds (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL, runtime_target TEXT NOT NULL, created_at TEXT NOT NULL, started_at TEXT,
    completed_at TEXT, version_id TEXT, error_message TEXT
  );
  CREATE TABLE build_steps (
    id TEXT PRIMARY KEY, build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    sequence INTEGER NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL, live_excerpt TEXT,
    status TEXT NOT NULL, output_text TEXT, started_at TEXT, completed_at TEXT,
    UNIQUE(build_id, sequence)
  );
  CREATE TABLE project_messages (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE play_events (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE, player_id TEXT NOT NULL,
    event_type TEXT NOT NULL, input_mode TEXT NOT NULL, viewport TEXT NOT NULL, level_number INTEGER,
    best_score REAL, average_fps REAL, created_at TEXT NOT NULL
  );
  CREATE TABLE player_progress (
    player_id TEXT NOT NULL, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE, status TEXT NOT NULL,
    current_level INTEGER NOT NULL DEFAULT 1, best_score REAL NOT NULL DEFAULT 0,
    input_mode TEXT NOT NULL, viewport TEXT NOT NULL, average_fps REAL,
    resource_error_count INTEGER NOT NULL DEFAULT 0, last_played_at TEXT NOT NULL,
    completed_at TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (player_id, project_id)
  );
  CREATE TABLE design_knowledge_reviews (
    id TEXT PRIMARY KEY, schema_version TEXT NOT NULL, window_from TEXT NOT NULL,
    window_to TEXT NOT NULL, minimum_players INTEGER NOT NULL, minimum_starts INTEGER NOT NULL,
    report_json TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE design_knowledge_decisions (
    id TEXT PRIMARY KEY, review_id TEXT NOT NULL REFERENCES design_knowledge_reviews(id) ON DELETE CASCADE,
    pattern_id TEXT NOT NULL, outcome TEXT NOT NULL, rationale TEXT NOT NULL,
    evidence_json TEXT NOT NULL, decided_at TEXT NOT NULL, UNIQUE(review_id, pattern_id)
  );
  CREATE TABLE design_research_tasks (
    id TEXT PRIMARY KEY, schema_version TEXT NOT NULL, task_json TEXT NOT NULL, status TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE design_gameplay_radar_clusters (
    id TEXT PRIMARY KEY, schema_version TEXT NOT NULL, normalized_title TEXT NOT NULL UNIQUE,
    cluster_json TEXT NOT NULL, state TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE design_knowledge_change_sets (
    id TEXT PRIMARY KEY, review_id TEXT UNIQUE REFERENCES design_knowledge_reviews(id) ON DELETE CASCADE,
    research_task_id TEXT UNIQUE REFERENCES design_research_tasks(id) ON DELETE CASCADE,
    schema_version TEXT NOT NULL, base_schema_version TEXT NOT NULL, base_updated_at TEXT NOT NULL,
    base_evaluation_version INTEGER NOT NULL, base_release_id TEXT,
    changes_json TEXT NOT NULL, status TEXT NOT NULL, review_rationale TEXT, reviewed_at TEXT,
    created_at TEXT NOT NULL, resolved_at TEXT,
    CHECK ((review_id IS NOT NULL) != (research_task_id IS NOT NULL))
  );
  CREATE TABLE design_knowledge_releases (
    id TEXT PRIMARY KEY, sequence INTEGER NOT NULL UNIQUE,
    release_kind TEXT NOT NULL DEFAULT 'change-set',
    change_set_id TEXT UNIQUE REFERENCES design_knowledge_change_sets(id),
    rollback_source_release_id TEXT REFERENCES design_knowledge_releases(id), rationale TEXT,
    schema_version TEXT NOT NULL, library_json TEXT NOT NULL, checksum TEXT NOT NULL,
    supersedes_release_id TEXT REFERENCES design_knowledge_releases(id), published_at TEXT NOT NULL
  );
  CREATE TABLE design_playtests (
    id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES versions(id) ON DELETE CASCADE, pattern_id TEXT NOT NULL,
    tester_segment TEXT NOT NULL, device_class TEXT NOT NULL, input_mode TEXT NOT NULL,
    task_outcome TEXT NOT NULL, onboarding_clarity INTEGER NOT NULL, control_clarity INTEGER NOT NULL,
    perceived_difficulty INTEGER NOT NULL, fun_rating INTEGER NOT NULL, fairness_rating INTEGER NOT NULL,
    would_replay INTEGER NOT NULL, completion_seconds INTEGER, hint_count INTEGER NOT NULL DEFAULT 0,
    blocker_code TEXT NOT NULL, created_at TEXT NOT NULL
  );
`;

function postgresClient(client: PoolClient): StudioDatabase {
  return {
    provider: "postgresql",
    async query<Row extends QueryResultRow>(sql: string, values: readonly unknown[] = []) {
      const result = await client.query<Row>(sql, [...values]);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    },
    async transaction<Result>(action: (database: StudioDatabase) => Promise<Result>) {
      return action(postgresClient(client));
    },
    async close() {},
  };
}

export async function openDatabase(connectionString: string): Promise<StudioDatabase> {
  const pool = new Pool({ connectionString, connectionTimeoutMillis: 5_000, max: 10 });
  await pool.query(postgresSchema);
  return {
    provider: "postgresql",
    async query<Row extends QueryResultRow>(sql: string, values: readonly unknown[] = []) {
      const result = await pool.query<Row>(sql, [...values]);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    },
    async transaction<Result>(action: (database: StudioDatabase) => Promise<Result>) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await action(postgresClient(client));
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async close() {
      await pool.end();
    },
  };
}

function sqliteQuery(sql: string, values: readonly unknown[]) {
  const expanded: unknown[] = [];
  const statement = sql.replace(/\$(\d+)/g, (_match, rawIndex: string) => {
    expanded.push(values[Number(rawIndex) - 1]);
    return "?";
  });
  return { statement, values: expanded };
}

export async function openTestDatabase(): Promise<StudioDatabase> {
  const { DatabaseSync } = await import("node:sqlite");
  const database = new DatabaseSync(":memory:");
  database.exec(sqliteSchema);

  const adapter: StudioDatabase = {
    provider: "sqlite-test",
    async query<Row extends QueryResultRow>(sql: string, values: readonly unknown[] = []) {
      const normalized = sqliteQuery(sql, values);
      const statement = database.prepare(normalized.statement);
      const isRead = /^\s*(SELECT|WITH|PRAGMA)\b/i.test(sql);
      const sqliteValues = normalized.values as readonly (string | number | bigint | Uint8Array | null)[];
      if (isRead) {
        const rows = statement.all(...sqliteValues) as unknown as Row[];
        return { rows, rowCount: rows.length };
      }
      const result = statement.run(...sqliteValues);
      return { rows: [], rowCount: Number(result.changes) };
    },
    async transaction<Result>(action: (transaction: StudioDatabase) => Promise<Result>) {
      database.exec("BEGIN IMMEDIATE");
      try {
        const result = await action(adapter);
        database.exec("COMMIT");
        return result;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },
    async close() {
      database.close();
    },
  };
  return adapter;
}
