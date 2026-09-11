import { existsSync } from "node:fs";
import type { DatabaseSync } from "node:sqlite";
import type { StudioDatabase } from "./database.js";

type Row = Record<string, string | number | null>;

type TableCopy = {
  name: string;
  columns: string[];
};

// Column and table list mirrors the schema in database.ts (both the postgresSchema and
// sqliteSchema definitions). Keep this in sync whenever a column or table is added there,
// otherwise a legacy sqlite file migrates silently without that data.
const tables: TableCopy[] = [
  { name: "projects", columns: ["id", "title", "idea", "slug", "dimensions", "status", "fixture_kind", "is_official", "created_at", "archived_at"] },
  { name: "studio_meta", columns: ["key", "value"] },
  { name: "game_specs", columns: ["id", "project_id", "spec_json", "created_at"] },
  {
    name: "versions",
    columns: [
      "id", "project_id", "spec_id", "number", "label",
      "quality_status", "quality_summary", "quality_report_json", "quality_checked_at",
      "art_review_status", "art_review_summary", "art_reviewed_at",
      "created_at",
    ],
  },
  { name: "publications", columns: ["id", "project_id", "version_id", "status", "stable_path", "version_path", "published_at"] },
  { name: "builds", columns: ["id", "project_id", "status", "runtime_target", "created_at", "started_at", "completed_at", "version_id", "error_message", "failure_details_json", "revision_scope", "revision_plan_json", "asset_clip_id"] },
  { name: "build_steps", columns: ["id", "build_id", "sequence", "kind", "title", "detail", "status", "output_text", "started_at", "completed_at"] },
  { name: "project_messages", columns: ["id", "project_id", "role", "content", "created_at"] },
  { name: "play_events", columns: ["id", "project_id", "version_id", "player_id", "event_type", "input_mode", "viewport", "level_number", "best_score", "average_fps", "created_at"] },
  { name: "player_progress", columns: ["player_id", "project_id", "version_id", "status", "current_level", "best_score", "input_mode", "viewport", "average_fps", "resource_error_count", "last_played_at", "completed_at", "updated_at"] },
  { name: "design_knowledge_reviews", columns: ["id", "schema_version", "window_from", "window_to", "minimum_players", "minimum_starts", "report_json", "created_at"] },
  { name: "design_knowledge_decisions", columns: ["id", "review_id", "pattern_id", "outcome", "rationale", "evidence_json", "decided_at"] },
  { name: "design_research_tasks", columns: ["id", "schema_version", "task_json", "status", "created_at", "updated_at"] },
  { name: "design_gameplay_radar_clusters", columns: ["id", "schema_version", "normalized_title", "cluster_json", "state", "created_at", "updated_at"] },
  { name: "design_knowledge_change_sets", columns: ["id", "review_id", "research_task_id", "schema_version", "base_schema_version", "base_updated_at", "base_evaluation_version", "base_release_id", "changes_json", "status", "review_rationale", "reviewed_at", "created_at", "resolved_at"] },
  { name: "design_knowledge_releases", columns: ["id", "sequence", "release_kind", "change_set_id", "rollback_source_release_id", "rationale", "schema_version", "library_json", "checksum", "supersedes_release_id", "published_at"] },
  { name: "design_playtests", columns: ["id", "project_id", "version_id", "pattern_id", "tester_segment", "device_class", "input_mode", "task_outcome", "onboarding_clarity", "control_clarity", "perceived_difficulty", "fun_rating", "fairness_rating", "would_replay", "completion_seconds", "hint_count", "blocker_code", "created_at"] },
];

type TableSummary =
  | { name: string; status: "skipped-missing-table" }
  | { name: string; status: "skipped-no-columns" }
  | { name: string; status: "copied"; rowCount: number; missingColumns: string[] };

function tableExistsIn(legacy: DatabaseSync, name: string): boolean {
  return !!legacy.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?").get(name);
}

function availableColumns(legacy: DatabaseSync, table: string): Set<string> {
  const rows = legacy.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((row) => row.name));
}

function logMigrationSummary(summaries: TableSummary[]) {
  console.log("[sqlite-migration] legacy import summary:");
  for (const summary of summaries) {
    if (summary.status === "skipped-missing-table") {
      console.log(`  - ${summary.name}: skipped (table not found in legacy database)`);
      continue;
    }
    if (summary.status === "skipped-no-columns") {
      console.log(`  - ${summary.name}: skipped (no matching columns found in legacy database)`);
      continue;
    }
    const note = summary.missingColumns.length > 0
      ? ` (missing in legacy, using schema defaults: ${summary.missingColumns.join(", ")})`
      : "";
    console.log(`  - ${summary.name}: copied ${summary.rowCount} row(s)${note}`);
  }
}

/**
 * Imports a legacy sqlite database file into `database` (used once, at startup, when the target
 * database is empty). Tables or columns that don't exist yet in the legacy file (older schema
 * versions, e.g. a file predating quality_status/art_review_status or predating studio_meta /
 * project_messages / play_events / player_progress) are skipped rather than crashing the import;
 * missing columns simply fall back to the target schema's own defaults (e.g. 'legacy' status).
 */
export async function importLegacySqliteIfEmpty(database: StudioDatabase, filename: string) {
  if (!existsSync(filename)) return 0;
  const currentCount = (await database.query<{ count: string | number }>("SELECT COUNT(*) AS count FROM projects")).rows[0]?.count ?? 0;
  if (Number(currentCount) > 0) return 0;

  const { DatabaseSync } = await import("node:sqlite");
  const legacy = new DatabaseSync(filename, { readOnly: true });
  try {
    if (!tableExistsIn(legacy, "projects")) return 0;
    const projectsAvailable = availableColumns(legacy, "projects");
    const projectsColumns = tables[0]!.columns.filter((column) => projectsAvailable.has(column));
    if (projectsColumns.length === 0) return 0;
    const projectRows = legacy.prepare(`SELECT ${projectsColumns.join(", ")} FROM projects`).all() as Row[];
    if (projectRows.length === 0) return 0;

    const summaries: TableSummary[] = [];

    await database.transaction(async (transaction) => {
      for (const table of tables) {
        if (!tableExistsIn(legacy, table.name)) {
          summaries.push({ name: table.name, status: "skipped-missing-table" });
          continue;
        }
        const available = table.name === "projects" ? projectsAvailable : availableColumns(legacy, table.name);
        const usableColumns = table.columns.filter((column) => available.has(column));
        const missingColumns = table.columns.filter((column) => !available.has(column));
        if (usableColumns.length === 0) {
          summaries.push({ name: table.name, status: "skipped-no-columns" });
          continue;
        }
        const rows = table.name === "projects"
          ? projectRows
          : (legacy.prepare(`SELECT ${usableColumns.join(", ")} FROM ${table.name}`).all() as Row[]);

        if (rows.length > 0) {
          const placeholders = usableColumns.map((_, index) => `$${index + 1}`).join(", ");
          const sql = `INSERT INTO ${table.name} (${usableColumns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
          for (const row of rows) {
            await transaction.query(sql, usableColumns.map((column) => row[column]));
          }
        }
        summaries.push({ name: table.name, status: "copied", rowCount: rows.length, missingColumns });
      }
    });

    logMigrationSummary(summaries);
    return projectRows.length;
  } finally {
    legacy.close();
  }
}
