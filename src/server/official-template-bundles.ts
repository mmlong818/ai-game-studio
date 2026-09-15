import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { OFFICIAL_GAMES, officialTemplateGames } from "../shared/official-games/index.js";
import type { StudioDatabase } from "./database.js";

type Row = Record<string, unknown>;
type ArtifactFile = { path: string; bytes: number; sha256: string };
type BundleGame = {
  officialId: string;
  project: Row;
  spec: Row;
  version: Row;
  publication: Row;
  build: Row | null;
  steps: Row[];
  files: ArtifactFile[];
};
type BundleCatalog = { schemaVersion: number; games: BundleGame[] };

const jsonColumn = (database: StudioDatabase, value: unknown) =>
  database.provider === "sqlite-test" && value != null && typeof value !== "string" ? JSON.stringify(value) : value;

function safeBundleFile(root: string, path: string) {
  const resolved = resolve(root, path);
  const rootPrefix = `${resolve(root)}${process.platform === "win32" ? "\\" : "/"}`;
  if (!resolved.startsWith(rootPrefix)) throw new Error(`官方 bundle 文件越界：${path}`);
  return resolved;
}

function validateArtifact(root: string, files: ArtifactFile[]) {
  if (!files.some((file) => file.path === "index.html")) throw new Error(`${root} 缺少 index.html 清单`);
  if (!files.some((file) => file.path === "game-manifest.json")) throw new Error(`${root} 缺少 game-manifest.json 清单`);
  for (const file of files) {
    const fullPath = safeBundleFile(root, file.path);
    if (!existsSync(fullPath) || !statSync(fullPath).isFile()) throw new Error(`官方 bundle 缺少文件：${file.path}`);
    const content = readFileSync(fullPath);
    if (content.length !== file.bytes || createHash("sha256").update(content).digest("hex") !== file.sha256) {
      throw new Error(`官方 bundle 文件校验失败：${file.path}`);
    }
  }
}

function validateCatalog(catalog: BundleCatalog, bundleRoot: string) {
  if (catalog.schemaVersion !== 1) throw new Error(`不支持的官方 bundle schema：${catalog.schemaVersion}`);
  const expected = officialTemplateGames().map((game) => game.id).sort();
  const actual = catalog.games.map((game) => game.officialId).sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`官方 template bundle 必须完整覆盖 registry：expected=${expected.join(",")} actual=${actual.join(",")}`);
  }
  if (new Set(actual).size !== actual.length) throw new Error("官方 template bundle 存在重复 id");
  const stablePaths = new Set<string>();
  for (const entry of catalog.games) {
    const definition = OFFICIAL_GAMES.find((game) => game.id === entry.officialId);
    const spec = entry.spec.spec_json as Record<string, unknown>;
    if (!definition || definition.kind !== "template" || definition.serverTemplate !== spec?.template) throw new Error(`${entry.officialId} 的 template 与 registry 不一致`);
    if (entry.project.title !== definition.title || entry.project.id !== entry.spec.project_id || entry.project.id !== entry.version.project_id || entry.project.id !== entry.publication.project_id) {
      throw new Error(`${entry.officialId} 的 project/spec/version/publication 关联无效`);
    }
    if (entry.version.spec_id !== entry.spec.id || entry.publication.version_id !== entry.version.id || entry.publication.status !== "live") {
      throw new Error(`${entry.officialId} 没有有效 live 发布版本`);
    }
    const stablePath = String(entry.publication.stable_path);
    if (stablePaths.has(stablePath)) throw new Error(`官方 bundle stable path 重复：${stablePath}`);
    stablePaths.add(stablePath);
    validateArtifact(join(bundleRoot, entry.officialId, "artifact"), entry.files);
  }
}

async function findExisting(database: StudioDatabase, entry: BundleGame) {
  const exact = (await database.query<{ id: string; title: string; fixture_kind: string | null; archived_at: string | null; version_id: string | null; spec_json: unknown | null }>(
    `SELECT p.id,p.title,p.fixture_kind,p.archived_at,pub.version_id,gs.spec_json FROM projects p
     LEFT JOIN publications pub ON pub.project_id=p.id AND pub.status='live'
     LEFT JOIN versions v ON v.id=pub.version_id
     LEFT JOIN game_specs gs ON gs.id=v.spec_id
     WHERE p.id=$1`,
    [entry.project.id],
  )).rows[0];
  if (!exact) return null;
  const spec = typeof exact.spec_json === "string" ? JSON.parse(exact.spec_json) : exact.spec_json;
  if (exact.title !== entry.project.title || exact.fixture_kind || exact.archived_at || exact.version_id !== entry.version.id
    || (spec as Record<string, unknown> | null)?.template !== (entry.spec.spec_json as Record<string, unknown>)?.template) {
    throw new Error(`${entry.officialId} 的固定 bundle project id 已存在但内容或 live 发布版本不一致`);
  }
  return { id: exact.id, version_id: String(exact.version_id) };
}

async function insertBundle(database: StudioDatabase, entry: BundleGame, lobbyRank: number) {
  const p = entry.project;
  const s = entry.spec;
  const v = entry.version;
  const pub = entry.publication;
  const officialValue = database.provider === "sqlite-test" ? 1 : true;
  await database.query(
    `INSERT INTO projects (id,title,idea,slug,dimensions,status,fixture_kind,is_official,lobby_rank,created_at,archived_at)
     VALUES ($1,$2,$3,$4,$5,'published',NULL,$6,$7,$8,NULL)`,
    [p.id, p.title, p.idea, p.slug, p.dimensions, officialValue, lobbyRank, p.created_at],
  );
  await database.query("INSERT INTO game_specs (id,project_id,spec_json,created_at) VALUES ($1,$2,$3,$4)", [s.id, s.project_id, jsonColumn(database, s.spec_json), s.created_at]);
  await database.query(
    `INSERT INTO versions (id,project_id,spec_id,number,label,quality_status,quality_summary,quality_report_json,quality_checked_at,
      art_review_status,art_review_summary,art_reviewed_at,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [v.id,v.project_id,v.spec_id,v.number,v.label,v.quality_status,v.quality_summary,jsonColumn(database,v.quality_report_json),v.quality_checked_at,v.art_review_status,v.art_review_summary,v.art_reviewed_at,v.created_at],
  );
  if (entry.build) {
    const b = entry.build;
    await database.query(
      `INSERT INTO builds (id,project_id,status,runtime_target,created_at,started_at,completed_at,version_id,error_message,failure_details_json,
        revision_scope,revision_plan_json,asset_clip_id,execution_mode) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [b.id,b.project_id,b.status,b.runtime_target,b.created_at,b.started_at,b.completed_at,b.version_id,b.error_message ?? null,b.failure_details_json ?? null,b.revision_scope ?? null,b.revision_plan_json ?? null,b.asset_clip_id ?? null,b.execution_mode ?? "normal"],
    );
    for (const step of entry.steps) {
      await database.query(
        `INSERT INTO build_steps (id,build_id,sequence,kind,title,detail,status,output_text,started_at,completed_at,live_excerpt)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [step.id,step.build_id,step.sequence,step.kind,step.title,step.detail,step.status,step.output_text ?? null,step.started_at ?? null,step.completed_at ?? null,step.live_excerpt ?? null],
      );
    }
  }
  await database.query(
    "INSERT INTO publications (id,project_id,version_id,status,stable_path,version_path,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [pub.id,pub.project_id,pub.version_id,pub.status,pub.stable_path,pub.version_path,pub.published_at],
  );
}

/** Ensure every registry template has a playable, immutable local publication without model calls. */
export async function ensureOfficialTemplateBundles(database: StudioDatabase, bundleRoot: string, artifactRoot: string) {
  const catalog = JSON.parse(readFileSync(join(bundleRoot, "catalog.json"), "utf8")) as BundleCatalog;
  validateCatalog(catalog, bundleRoot);
  mkdirSync(artifactRoot, { recursive: true });
  const result: Record<string, string> = {};
  for (const entry of catalog.games) {
    const definition = OFFICIAL_GAMES.find((game) => game.id === entry.officialId)!;
    const existing = await findExisting(database, entry);
    if (!existing) await database.transaction((transaction) => insertBundle(transaction, entry, definition.lobbyRank));
    const selected = existing ?? { id: String(entry.project.id), version_id: String(entry.version.id) };
    if (selected.version_id === entry.version.id) {
      const source = join(bundleRoot, entry.officialId, "artifact");
      const target = join(artifactRoot, selected.version_id);
      if (!existsSync(target)) cpSync(source, target, { recursive: true });
      for (const file of entry.files) {
        const targetFile = safeBundleFile(target, file.path);
        if (!existsSync(targetFile) || statSync(targetFile).size !== file.bytes) throw new Error(`${entry.officialId} 的发布产物不完整：${file.path}`);
      }
    }
    await database.query(
      "INSERT INTO studio_meta (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=$2",
      [`official_template_bundle:${entry.officialId}`, selected.id],
    );
    result[entry.officialId] = selected.id;
  }
  return result;
}
