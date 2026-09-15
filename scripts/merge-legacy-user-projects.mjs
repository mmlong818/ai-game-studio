import pg from "pg";

const { Client } = pg;
const apply = process.argv.includes("--apply");
const mainUrl = process.env.MAIN_DATABASE_URL ?? "postgresql://studio@127.0.0.1:54329/ai_game_studio";
const legacyUrl = process.env.LEGACY_DATABASE_URL ?? "postgresql://studio@127.0.0.1:54329/ai_game_studio_legacy";

const main = new Client({ connectionString: mainUrl });
const legacy = new Client({ connectionString: legacyUrl });
const activeProductionStatuses = new Set(["queued", "creating", "building", "recovering"]);

const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

async function columns(client, table) {
  const result = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
    [table],
  );
  return result.rows.map((row) => row.column_name);
}

async function insertRows(table, rows) {
  if (!rows.length) return 0;
  const [sourceColumns, targetColumns] = await Promise.all([columns(legacy, table), columns(main, table)]);
  const selected = sourceColumns.filter((column) => targetColumns.includes(column));
  if (!selected.length) throw new Error(`表 ${table} 没有可迁移的共同列。`);
  let inserted = 0;
  for (const original of rows) {
    const row = { ...original };
    if (table === "production_jobs" && activeProductionStatuses.has(row.status)) {
      const originalStatus = row.status;
      row.status = "failed";
      row.error = `旧库合并时将历史 ${originalStatus} 状态归档为失败；没有恢复或重放模型请求。`;
      if (targetColumns.includes("failure_details_json")) row.failure_details_json = JSON.stringify([{
        stage: "unknown",
        category: "unknown",
        code: "LEGACY_IMPORT_INTERRUPTED",
        message: row.error,
        nextStep: "该记录仅供历史追溯；如需继续，请由用户从项目页明确发起新的制作。",
        retryable: false,
      }]);
    }
    const values = selected.map((column) => row[column]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    await main.query(
      `INSERT INTO ${quote(table)} (${selected.map(quote).join(", ")}) VALUES (${placeholders})`,
      values,
    );
    inserted += 1;
  }
  return inserted;
}

async function sourceRows(table, where, values) {
  return (await legacy.query(`SELECT * FROM ${quote(table)} WHERE ${where}`, values)).rows;
}

await Promise.all([main.connect(), legacy.connect()]);
try {
  const active = await main.query("SELECT COUNT(*)::int AS count FROM builds WHERE status IN ('queued', 'running')");
  const activeProduction = await main.query("SELECT COUNT(*)::int AS count FROM production_jobs WHERE status IN ('queued', 'creating', 'building', 'recovering')");
  if (active.rows[0].count || activeProduction.rows[0].count) throw new Error("主库仍有活动制作，拒绝合并。");

  const candidates = (await legacy.query("SELECT id FROM projects WHERE is_official = FALSE ORDER BY id")).rows.map((row) => row.id);
  const existing = candidates.length
    ? new Set((await main.query("SELECT id FROM projects WHERE id = ANY($1::text[])", [candidates])).rows.map((row) => row.id))
    : new Set();
  const projectIds = candidates.filter((id) => !existing.has(id));
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", projectIds, alreadyPresent: candidates.filter((id) => existing.has(id)) }));
  if (!projectIds.length) {
    console.log(JSON.stringify({ inserted: {}, total: 0 }));
    process.exitCode = 0;
  } else {
    const buildIds = (await legacy.query("SELECT id FROM builds WHERE project_id = ANY($1::text[])", [projectIds])).rows.map((row) => row.id);
    const jobIds = (await legacy.query("SELECT id FROM production_jobs WHERE id = ANY($1::text[])", [projectIds])).rows.map((row) => row.id);
    const plan = [
      ["projects", await sourceRows("projects", "id = ANY($1::text[])", [projectIds])],
      ["game_specs", await sourceRows("game_specs", "project_id = ANY($1::text[])", [projectIds])],
      ["versions", await sourceRows("versions", "project_id = ANY($1::text[])", [projectIds])],
      ["builds", await sourceRows("builds", "project_id = ANY($1::text[])", [projectIds])],
      ["build_steps", buildIds.length ? await sourceRows("build_steps", "build_id = ANY($1::text[])", [buildIds]) : []],
      ["project_messages", await sourceRows("project_messages", "project_id = ANY($1::text[])", [projectIds])],
      ["publications", await sourceRows("publications", "project_id = ANY($1::text[])", [projectIds])],
      ["play_events", await sourceRows("play_events", "project_id = ANY($1::text[])", [projectIds])],
      ["player_progress", await sourceRows("player_progress", "project_id = ANY($1::text[])", [projectIds])],
      ["design_playtests", await sourceRows("design_playtests", "project_id = ANY($1::text[])", [projectIds])],
      ["version_art_reviews", await sourceRows("version_art_reviews", "project_id = ANY($1::text[])", [projectIds])],
      ["version_demo_reviews", await sourceRows("version_demo_reviews", "project_id = ANY($1::text[])", [projectIds])],
      ["production_jobs", jobIds.length ? await sourceRows("production_jobs", "id = ANY($1::text[])", [jobIds]) : []],
      ["production_job_events", jobIds.length ? await sourceRows("production_job_events", "job_id = ANY($1::text[])", [jobIds]) : []],
    ];

    await main.query("BEGIN");
    const inserted = {};
    try {
      for (const [table, rows] of plan) inserted[table] = await insertRows(table, rows);
      if (apply) await main.query("COMMIT");
      else await main.query("ROLLBACK");
    } catch (error) {
      await main.query("ROLLBACK");
      throw error;
    }
    console.log(JSON.stringify({ inserted, total: Object.values(inserted).reduce((sum, count) => sum + count, 0) }));
  }
} finally {
  await Promise.allSettled([main.end(), legacy.end()]);
}
