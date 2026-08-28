import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { openTestDatabase, type StudioDatabase } from "../src/server/database";
import { importLegacySqliteIfEmpty } from "../src/server/sqlite-migration";

async function withTempDir<T>(prefix: string, action: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  try {
    return await action(dir);
  } finally {
    const safeRoot = resolve(dir);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
}

async function withCapturedLogs<T>(action: () => Promise<T>): Promise<{ result: T; logs: string[] }> {
  const logs: string[] = [];
  const originalLog = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map((value) => String(value)).join(" "));
  };
  try {
    const result = await action();
    return { result, logs };
  } finally {
    console.log = originalLog;
  }
}

test("旧库缺少验收状态列与四张新表时，迁移不会崩溃并回落到 schema 默认值", async () => {
  await withTempDir("legacy-old-", async (dir) => {
    const legacyPath = join(dir, "legacy.sqlite");
    const { DatabaseSync } = await import("node:sqlite");
    const legacy = new DatabaseSync(legacyPath);
    // Pre-quality-gate, pre-archive shape: no archived_at on projects, no quality/art-review
    // columns on versions, and none of the four newer tables exist at all.
    legacy.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, idea TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
        dimensions TEXT NOT NULL, status TEXT NOT NULL, fixture_kind TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE game_specs (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, spec_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE versions (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, spec_id TEXT NOT NULL, number INTEGER NOT NULL,
        label TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE builds (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL, runtime_target TEXT NOT NULL,
        created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT, version_id TEXT, error_message TEXT
      );
      CREATE TABLE build_steps (
        id TEXT PRIMARY KEY, build_id TEXT NOT NULL, sequence INTEGER NOT NULL, kind TEXT NOT NULL,
        title TEXT NOT NULL, detail TEXT NOT NULL, status TEXT NOT NULL, output_text TEXT,
        started_at TEXT, completed_at TEXT
      );
      CREATE TABLE publications (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, version_id TEXT NOT NULL, status TEXT NOT NULL,
        stable_path TEXT NOT NULL, version_path TEXT NOT NULL, published_at TEXT NOT NULL
      );
    `);
    legacy.prepare(
      "INSERT INTO projects (id, title, idea, slug, dimensions, status, fixture_kind, created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).run("proj-1", "旧游戏", "旧想法描述", "old-game", "2d", "playable", null, "2024-01-01T00:00:00.000Z");
    legacy.prepare("INSERT INTO game_specs (id, project_id, spec_json, created_at) VALUES (?,?,?,?)")
      .run("spec-1", "proj-1", JSON.stringify({ title: "旧游戏" }), "2024-01-01T00:00:00.000Z");
    legacy.prepare("INSERT INTO versions (id, project_id, spec_id, number, label, created_at) VALUES (?,?,?,?,?,?)")
      .run("ver-1", "proj-1", "spec-1", 1, "初始版本", "2024-01-01T00:00:00.000Z");
    legacy.close();

    const database: StudioDatabase = await openTestDatabase();
    try {
      const { result: imported, logs } = await withCapturedLogs(() => importLegacySqliteIfEmpty(database, legacyPath));

      assert.equal(imported, 1);

      const version = (await database.query<{ quality_status: string; art_review_status: string }>(
        "SELECT quality_status, art_review_status FROM versions WHERE id = $1", ["ver-1"],
      )).rows[0];
      assert.equal(version?.quality_status, "legacy");
      assert.equal(version?.art_review_status, "legacy");

      const project = (await database.query<{ archived_at: string | null }>(
        "SELECT archived_at FROM projects WHERE id = $1", ["proj-1"],
      )).rows[0];
      assert.equal(project?.archived_at, null);

      assert.equal((await database.query("SELECT * FROM studio_meta")).rowCount, 0);
      assert.equal((await database.query("SELECT * FROM project_messages")).rowCount, 0);
      assert.equal((await database.query("SELECT * FROM play_events")).rowCount, 0);
      assert.equal((await database.query("SELECT * FROM player_progress")).rowCount, 0);

      const summary = logs.join("\n");
      assert.match(summary, /studio_meta: skipped \(table not found/);
      assert.match(summary, /project_messages: skipped \(table not found/);
      assert.match(summary, /play_events: skipped \(table not found/);
      assert.match(summary, /player_progress: skipped \(table not found/);
      assert.match(summary, /versions: copied 1 row\(s\) \(missing in legacy, using schema defaults:.*quality_status/);
    } finally {
      await database.close();
    }
  });
});

test("旧库包含验收状态列与四张新表时，迁移会完整搬运数据并打印非静默摘要", async () => {
  await withTempDir("legacy-full-", async (dir) => {
    const legacyPath = join(dir, "legacy-full.sqlite");
    const { DatabaseSync } = await import("node:sqlite");
    const legacy = new DatabaseSync(legacyPath);
    legacy.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, idea TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
        dimensions TEXT NOT NULL, status TEXT NOT NULL, fixture_kind TEXT, created_at TEXT NOT NULL,
        archived_at TEXT
      );
      CREATE TABLE studio_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE game_specs (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, spec_json TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE versions (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, spec_id TEXT NOT NULL, number INTEGER NOT NULL,
        label TEXT NOT NULL, quality_status TEXT NOT NULL DEFAULT 'legacy', quality_summary TEXT,
        quality_report_json TEXT, quality_checked_at TEXT, art_review_status TEXT NOT NULL DEFAULT 'legacy',
        art_review_summary TEXT, art_reviewed_at TEXT, created_at TEXT NOT NULL
      );
      CREATE TABLE publications (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, version_id TEXT NOT NULL, status TEXT NOT NULL,
        stable_path TEXT NOT NULL, version_path TEXT NOT NULL, published_at TEXT NOT NULL
      );
      CREATE TABLE builds (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, status TEXT NOT NULL, runtime_target TEXT NOT NULL,
        created_at TEXT NOT NULL, started_at TEXT, completed_at TEXT, version_id TEXT, error_message TEXT
      );
      CREATE TABLE build_steps (
        id TEXT PRIMARY KEY, build_id TEXT NOT NULL, sequence INTEGER NOT NULL, kind TEXT NOT NULL,
        title TEXT NOT NULL, detail TEXT NOT NULL, status TEXT NOT NULL, output_text TEXT,
        started_at TEXT, completed_at TEXT
      );
      CREATE TABLE project_messages (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE play_events (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL, version_id TEXT NOT NULL, player_id TEXT NOT NULL,
        event_type TEXT NOT NULL, input_mode TEXT NOT NULL, viewport TEXT NOT NULL, level_number INTEGER,
        best_score REAL, average_fps REAL, created_at TEXT NOT NULL
      );
      CREATE TABLE player_progress (
        player_id TEXT NOT NULL, project_id TEXT NOT NULL, version_id TEXT NOT NULL, status TEXT NOT NULL,
        current_level INTEGER NOT NULL DEFAULT 1, best_score REAL NOT NULL DEFAULT 0, input_mode TEXT NOT NULL,
        viewport TEXT NOT NULL, average_fps REAL, resource_error_count INTEGER NOT NULL DEFAULT 0,
        last_played_at TEXT NOT NULL, completed_at TEXT, updated_at TEXT NOT NULL,
        PRIMARY KEY (player_id, project_id)
      );
    `);

    legacy.prepare(
      "INSERT INTO projects (id, title, idea, slug, dimensions, status, fixture_kind, created_at, archived_at) VALUES (?,?,?,?,?,?,?,?,?)",
    ).run("proj-1", "完整游戏", "完整想法描述", "full-game", "2d", "published", null, "2024-01-01T00:00:00.000Z", null);
    legacy.prepare("INSERT INTO studio_meta (key, value) VALUES (?, ?)").run("golden_fixture_initialized", "true");
    legacy.prepare("INSERT INTO game_specs (id, project_id, spec_json, created_at) VALUES (?,?,?,?)")
      .run("spec-1", "proj-1", JSON.stringify({ title: "完整游戏" }), "2024-01-01T00:00:00.000Z");
    legacy.prepare(
      `INSERT INTO versions (id, project_id, spec_id, number, label, quality_status, quality_summary,
         quality_report_json, quality_checked_at, art_review_status, art_review_summary, art_reviewed_at, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      "ver-1", "proj-1", "spec-1", 1, "初始版本", "passed", "已通过自动验收",
      JSON.stringify({ status: "passed" }), "2024-01-01T00:00:00.000Z", "passed", "已通过主美复核",
      "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z",
    );
    legacy.prepare("INSERT INTO project_messages (id, project_id, role, content, created_at) VALUES (?,?,?,?,?)")
      .run("msg-1", "proj-1", "user", "旧对话内容", "2024-01-01T00:00:00.000Z");
    legacy.prepare(
      `INSERT INTO play_events (id, project_id, version_id, player_id, event_type, input_mode, viewport,
         level_number, best_score, average_fps, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    ).run("event-1", "proj-1", "ver-1", "player-1", "complete", "keyboard", "390x844", 3, 120, 59.5, "2024-01-01T00:00:00.000Z");
    legacy.prepare(
      `INSERT INTO player_progress (player_id, project_id, version_id, status, current_level, best_score,
         input_mode, viewport, average_fps, resource_error_count, last_played_at, completed_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run("player-1", "proj-1", "ver-1", "completed", 3, 120, "keyboard", "390x844", 59.5, 0, "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z", "2024-01-01T00:00:00.000Z");
    legacy.close();

    const database: StudioDatabase = await openTestDatabase();
    try {
      const { result: imported, logs } = await withCapturedLogs(() => importLegacySqliteIfEmpty(database, legacyPath));

      assert.equal(imported, 1);

      const version = (await database.query<{ quality_status: string; art_review_status: string; quality_summary: string }>(
        "SELECT quality_status, art_review_status, quality_summary FROM versions WHERE id = $1", ["ver-1"],
      )).rows[0];
      assert.equal(version?.quality_status, "passed");
      assert.equal(version?.art_review_status, "passed");
      assert.equal(version?.quality_summary, "已通过自动验收");

      const meta = (await database.query<{ value: string }>(
        "SELECT value FROM studio_meta WHERE key = $1", ["golden_fixture_initialized"],
      )).rows[0];
      assert.equal(meta?.value, "true");

      assert.equal((await database.query("SELECT * FROM project_messages WHERE project_id = $1", ["proj-1"])).rowCount, 1);
      assert.equal((await database.query("SELECT * FROM play_events WHERE project_id = $1", ["proj-1"])).rowCount, 1);
      assert.equal((await database.query("SELECT * FROM player_progress WHERE project_id = $1", ["proj-1"])).rowCount, 1);

      const summary = logs.join("\n");
      assert.match(summary, /studio_meta: copied 1 row\(s\)/);
      assert.match(summary, /project_messages: copied 1 row\(s\)/);
      assert.match(summary, /play_events: copied 1 row\(s\)/);
      assert.match(summary, /player_progress: copied 1 row\(s\)/);
      assert.match(summary, /versions: copied 1 row\(s\)(?! \(missing)/);
    } finally {
      await database.close();
    }
  });
});

test("目标库已存在数据时，导入函数不会重复搬运旧库", async () => {
  await withTempDir("legacy-noop-", async (dir) => {
    const legacyPath = join(dir, "legacy.sqlite");
    const { DatabaseSync } = await import("node:sqlite");
    const legacy = new DatabaseSync(legacyPath);
    legacy.exec(`
      CREATE TABLE projects (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, idea TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
        dimensions TEXT NOT NULL, status TEXT NOT NULL, fixture_kind TEXT, created_at TEXT NOT NULL
      );
    `);
    legacy.prepare(
      "INSERT INTO projects (id, title, idea, slug, dimensions, status, fixture_kind, created_at) VALUES (?,?,?,?,?,?,?,?)",
    ).run("proj-1", "旧游戏", "旧想法描述", "old-game", "2d", "playable", null, "2024-01-01T00:00:00.000Z");
    legacy.close();

    const database: StudioDatabase = await openTestDatabase();
    try {
      await database.query(
        "INSERT INTO projects (id, title, idea, slug, dimensions, status, fixture_kind, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)",
        ["existing", "已存在项目", "已存在想法", "existing-game", "2d", "playable", null, "2024-06-01T00:00:00.000Z"],
      );
      const imported = await importLegacySqliteIfEmpty(database, legacyPath);
      assert.equal(imported, 0);
      assert.equal((await database.query("SELECT * FROM projects")).rowCount, 1);
    } finally {
      await database.close();
    }
  });
});
