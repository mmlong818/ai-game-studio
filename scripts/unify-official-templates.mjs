import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mainUrl = process.env.MAIN_DATABASE_URL ?? "postgresql://studio@127.0.0.1:54329/ai_game_studio";
const legacyUrl = process.env.LEGACY_DATABASE_URL ?? "postgresql://studio@127.0.0.1:54329/ai_game_studio_legacy";
const apply = process.argv.includes("--apply");
const exportBundle = process.argv.includes("--export-bundle");
const deletedUserProjectIds = [
  "93620a9e-9916-4d4b-9301-e114ea1aa3a4",
  "6c230413-7c83-43b8-bb11-f0349d73e0de",
  "c2d56754-f31a-46f1-b6cd-07b0a75494e3",
];

const templates = [
  ["puzzle", "bd06891f-1021-4fbd-992d-1b9b6e5d3917"],
  ["mahjong-roguelite", "920238d1-459e-40a6-8f16-fa8599e6db67"],
  ["block-place", "4a278928-fc2b-462f-addc-7d04a1bdc9d9"],
  ["merge-2048", "00adee1e-4ae0-4f75-b377-bc3a6cd22ff4"],
  ["region-logic", "6d6f62aa-ed8c-478f-8260-c60c562c0081"],
  ["polyomino-fit", "2af177b7-0da4-44ee-9ffc-24dc96c821ef"],
  ["space-shooter", "08191f9f-5323-451a-baca-dcdda4dd242e"],
  ["snake", "8647116c-5775-4e2b-becc-9f743c99924b"],
  ["klotski", "e9da3f98-0ff5-4af3-ae47-d1ddd32c2f1c"],
  ["breakout", "d598835a-5e3d-4fa6-8297-cc61a2a965c5"],
  ["tetris", "0bd4ea6a-2125-40e0-bee1-d5baa268ef1e"],
];
const projectIds = templates.map(([, id]) => id);
const quote = (identifier) => `"${identifier.replaceAll('"', '""')}"`;

async function tableColumns(client, table) {
  const result = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",
    [table],
  );
  return result.rows.map((row) => row.column_name);
}

async function scopedRows(client, table, projectColumn = "project_id") {
  return (await client.query(`SELECT * FROM ${quote(table)} WHERE ${quote(projectColumn)} = ANY($1::text[])`, [projectIds])).rows;
}

async function tableExists(client, table) {
  return (await client.query(
    "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1",
    [table],
  )).rowCount > 0;
}

async function migrationPlan(legacy) {
  const builds = await scopedRows(legacy, "builds");
  const buildIds = builds.map((row) => row.id);
  const rows = async (table, sql, values = []) => [table, (await legacy.query(sql, values)).rows];
  return [
    await rows("projects", "SELECT * FROM projects WHERE id = ANY($1::text[])", [projectIds]),
    await rows("game_specs", "SELECT * FROM game_specs WHERE project_id = ANY($1::text[])", [projectIds]),
    await rows("versions", "SELECT * FROM versions WHERE project_id = ANY($1::text[])", [projectIds]),
    ["builds", builds],
    await rows("build_steps", "SELECT * FROM build_steps WHERE build_id = ANY($1::text[])", [buildIds]),
    ["build_checkpoint_validations", await tableExists(legacy, "build_checkpoint_validations")
      ? (await legacy.query("SELECT * FROM build_checkpoint_validations WHERE build_id = ANY($1::text[])", [buildIds])).rows
      : []],
    await rows("version_art_reviews", "SELECT * FROM version_art_reviews WHERE project_id = ANY($1::text[])", [projectIds]),
    await rows("version_demo_reviews", "SELECT * FROM version_demo_reviews WHERE project_id = ANY($1::text[])", [projectIds]),
    await rows("publications", "SELECT * FROM publications WHERE project_id = ANY($1::text[])", [projectIds]),
  ];
}

async function insertMissing(main, legacy, table, rows) {
  if (!rows.length) return 0;
  const [sourceColumns, targetColumns] = await Promise.all([tableColumns(legacy, table), tableColumns(main, table)]);
  const selected = sourceColumns.filter((column) => targetColumns.includes(column));
  let inserted = 0;
  for (const row of rows) {
    const values = selected.map((column) => row[column]);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    const result = await main.query(
      `INSERT INTO ${quote(table)} (${selected.map(quote).join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values,
    );
    inserted += result.rowCount;
  }
  return inserted;
}

async function assertScope(legacy, main, plan) {
  const sourceProjects = plan[0][1];
  if (sourceProjects.length !== templates.length) throw new Error(`legacy 官方模板应为 11，实际 ${sourceProjects.length}`);
  for (const [officialId, projectId] of templates) {
    const project = sourceProjects.find((row) => row.id === projectId);
    if (!project?.is_official || project.fixture_kind || project.archived_at) throw new Error(`${officialId} 的 legacy 项目状态不符合迁移条件`);
  }
  const activeMain = await main.query("SELECT id FROM builds WHERE status IN ('queued','running') LIMIT 1");
  const activeJobs = await main.query("SELECT id FROM production_jobs WHERE status IN ('queued','creating','building','recovering') LIMIT 1");
  if (activeMain.rowCount || activeJobs.rowCount) throw new Error("主库仍有活动执行，拒绝迁移");
  const deleted = await main.query("SELECT id FROM projects WHERE id = ANY($1::text[])", [deletedUserProjectIds]);
  if (deleted.rowCount) throw new Error("三个明确删除的用户项目之一重新出现，拒绝继续");
  const collisions = await main.query(
    "SELECT id,slug FROM projects WHERE id <> ALL($1::text[]) AND slug = ANY($2::text[])",
    [projectIds, sourceProjects.map((row) => row.slug)],
  );
  if (collisions.rowCount) throw new Error(`slug 冲突：${JSON.stringify(collisions.rows)}`);
}

async function exportPortableBundle(legacy, plan) {
  const byTable = Object.fromEntries(plan);
  const bundleRoot = join(repoRoot, "official-bundles");
  const entries = [];
  await rm(bundleRoot, { recursive: true, force: true });
  await mkdir(bundleRoot, { recursive: true });
  for (const [officialId, projectId] of templates) {
    const project = byTable.projects.find((row) => row.id === projectId);
    const publication = byTable.publications.find((row) => row.project_id === projectId && row.status === "live");
    const version = byTable.versions.find((row) => row.id === publication?.version_id);
    const spec = byTable.game_specs.find((row) => row.id === version?.spec_id);
    if (!project || !publication || !version || !spec) throw new Error(`${officialId} 缺少 live publication/version/spec`);
    const build = byTable.builds
      .filter((row) => row.project_id === projectId && row.version_id === version.id && row.status === "succeeded")
      .sort((left, right) => String(right.completed_at).localeCompare(String(left.completed_at)))[0] ?? null;
    const steps = build ? byTable.build_steps.filter((row) => row.build_id === build.id).sort((a, b) => a.sequence - b.sequence) : [];
    const sourceArtifact = join(repoRoot, "data", "artifacts-v1.1", version.id);
    await stat(join(sourceArtifact, "index.html"));
    const targetArtifact = join(bundleRoot, officialId, "artifact");
    await cp(sourceArtifact, targetArtifact, {
      recursive: true,
      filter: (source) => {
        const relative = source.slice(sourceArtifact.length).replaceAll("\\", "/").replace(/^\//, "");
        return !relative.startsWith("_studio/") || relative === "_studio/runtime-inspector.js";
      },
    });
    const files = [];
    for (const relative of await readdir(targetArtifact, { recursive: true })) {
      const fullPath = join(targetArtifact, relative);
      if (!(await stat(fullPath)).isFile()) continue;
      const content = await readFile(fullPath);
      files.push({ path: relative.replaceAll("\\", "/"), bytes: content.length, sha256: createHash("sha256").update(content).digest("hex") });
    }
    files.sort((left, right) => left.path.localeCompare(right.path));
    entries.push({ officialId, project, spec, version, publication, build, steps, files });
  }
  await writeFile(join(bundleRoot, "catalog.json"), `${JSON.stringify({ schemaVersion: 1, games: entries }, null, 2)}\n`, "utf8");
  return entries;
}

const main = new Client({ connectionString: mainUrl });
const legacy = new Client({ connectionString: legacyUrl });
await Promise.all([main.connect(), legacy.connect()]);
try {
  const plan = await migrationPlan(legacy);
  await assertScope(legacy, main, plan);
  const existingByTable = {};
  for (const [table, rows] of plan) {
    if (!rows.length) { existingByTable[table] = 0; continue; }
    const ids = rows.map((row) => row.id ?? `${row.player_id}:${row.project_id}`);
    const key = rows[0].id == null ? "project_id" : "id";
    existingByTable[table] = (await main.query(`SELECT COUNT(*)::int count FROM ${quote(table)} WHERE ${quote(key)} = ANY($1::text[])`, [key === "id" ? ids : projectIds])).rows[0].count;
  }
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", source: Object.fromEntries(plan.map(([table, rows]) => [table, rows.length])), existing: existingByTable }, null, 2));
  if (exportBundle) {
    const entries = await exportPortableBundle(legacy, plan);
    console.log(JSON.stringify({ exportedBundles: entries.map((entry) => ({ officialId: entry.officialId, versionId: entry.version.id })) }, null, 2));
  }
  if (apply) {
    const inserted = {};
    await main.query("BEGIN");
    try {
      for (const [table, rows] of plan) inserted[table] = await insertMissing(main, legacy, table, rows);
      await main.query("COMMIT");
    } catch (error) {
      await main.query("ROLLBACK");
      throw error;
    }
    console.log(JSON.stringify({ inserted, total: Object.values(inserted).reduce((sum, count) => sum + count, 0) }, null, 2));
  }
} finally {
  await Promise.all([main.end(), legacy.end()]);
}
