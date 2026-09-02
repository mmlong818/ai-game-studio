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
    created_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ
  );

  ALTER TABLE projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
  ALTER TABLE projects ADD COLUMN IF NOT EXISTS is_official BOOLEAN NOT NULL DEFAULT FALSE;

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
`;

const sqliteSchema = `
  PRAGMA foreign_keys = ON;

  CREATE TABLE projects (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, idea TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
    dimensions TEXT NOT NULL, status TEXT NOT NULL, fixture_kind TEXT, is_official INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
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
    sequence INTEGER NOT NULL, kind TEXT NOT NULL, title TEXT NOT NULL, detail TEXT NOT NULL,
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
