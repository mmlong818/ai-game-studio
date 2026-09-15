import assert from "node:assert/strict";
import { copyFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { openTestDatabase } from "../src/server/database";
import { officialTemplateGames, officialLobbyOrder } from "../src/shared/official-games";
import { ensureOfficialTemplateBundles } from "../src/server/official-template-bundles";
import { StudioRepository } from "../src/server/studio-repository";

test("空数据库由 registry 对应的 fixture + template bundle 完整初始化 18 款且重复执行幂等", async () => {
  const database = await openTestDatabase();
  const artifactRoot = await mkdtemp(join(tmpdir(), "official-template-bundles-"));
  const bundleRoot = resolve("official-bundles");
  const repository = new StudioRepository(database, "http://127.0.0.1:4312", "http://127.0.0.1:4313");
  try {
    await repository.ensureOfficialFixtures();
    const firstTemplates = await ensureOfficialTemplateBundles(database, bundleRoot, artifactRoot);
    const firstCatalog = await repository.syncOfficialCatalog();
    assert.deepEqual(Object.keys(firstTemplates).sort(), officialTemplateGames().map((game) => game.id).sort());
    assert.equal(Object.values(firstCatalog).filter(Boolean).length, 18);
    assert.equal((await repository.publishedGames()).length, 18);
    assert.deepEqual((await repository.publishedGames()).map((game) => game.title), officialLobbyOrder().map((game) => game.title));

    const before = (await database.query<{ projects: number; publications: number; versions: number }>(
      "SELECT (SELECT count(*) FROM projects) projects, (SELECT count(*) FROM publications) publications, (SELECT count(*) FROM versions) versions",
    )).rows[0];
    const secondTemplates = await ensureOfficialTemplateBundles(database, bundleRoot, artifactRoot);
    const secondCatalog = await repository.syncOfficialCatalog();
    const after = (await database.query<{ projects: number; publications: number; versions: number }>(
      "SELECT (SELECT count(*) FROM projects) projects, (SELECT count(*) FROM publications) publications, (SELECT count(*) FROM versions) versions",
    )).rows[0];
    assert.deepEqual(secondTemplates, firstTemplates);
    assert.deepEqual(secondCatalog, firstCatalog);
    assert.deepEqual(after, before);
  } finally {
    await database.close();
    await rm(artifactRoot, { recursive: true, force: true });
  }
});

test("bundle 缺少发布资源时初始化明确失败，不会静默留下不完整官方目录", async () => {
  const database = await openTestDatabase();
  const emptyBundleRoot = await mkdtemp(join(tmpdir(), "missing-official-bundle-"));
  const artifactRoot = await mkdtemp(join(tmpdir(), "missing-official-artifact-"));
  try {
    await copyFile(resolve("official-bundles/catalog.json"), join(emptyBundleRoot, "catalog.json"));
    await assert.rejects(
      ensureOfficialTemplateBundles(database, emptyBundleRoot, artifactRoot),
      /官方 bundle 缺少文件/,
    );
    assert.equal((await database.query<{ count: number }>("SELECT count(*) count FROM projects")).rows[0].count, 0);
  } finally {
    await database.close();
    await Promise.all([
      rm(emptyBundleRoot, { recursive: true, force: true }),
      rm(artifactRoot, { recursive: true, force: true }),
    ]);
  }
});

test("同名同模板的用户 live 项目不会替代固定 bundle 官方身份", async () => {
  const database = await openTestDatabase();
  const artifactRoot = await mkdtemp(join(tmpdir(), "official-identity-boundary-"));
  const repository = new StudioRepository(database, "http://127.0.0.1:4312", "http://127.0.0.1:4313");
  try {
    const userProject = await repository.create({ title: "植光拼图", dimensions: "2d", template: "puzzle", idea: "用户独立创建的同名拼图，拖动全部拼块归位即完成。" });
    await database.query("UPDATE projects SET status='published',created_at=$2 WHERE id=$1", [userProject.id, "2026-01-01T00:00:00.000Z"]);
    await database.query(
      "INSERT INTO publications (id,project_id,version_id,status,stable_path,version_path,published_at) VALUES ($1,$2,$3,'live',$4,$5,$6)",
      ["user-same-template-publication", userProject.id, userProject.version.id, "/play/user-same-template/", `/version/${userProject.version.id}/`, "2026-08-01T00:00:00.000Z"],
    );
    const templateIds = await ensureOfficialTemplateBundles(database, resolve("official-bundles"), artifactRoot);
    const synced = await repository.syncOfficialCatalog();
    assert.equal(synced.puzzle, templateIds.puzzle);
    assert.notEqual(synced.puzzle, userProject.id);
    const identities = (await database.query<{ id: string; is_official: number | boolean }>(
      "SELECT id,is_official FROM projects WHERE id IN ($1,$2) ORDER BY id",
      [userProject.id, templateIds.puzzle],
    )).rows;
    assert.equal(Boolean(identities.find((row) => row.id === userProject.id)?.is_official), false);
    assert.equal(Boolean(identities.find((row) => row.id === templateIds.puzzle)?.is_official), true);
  } finally {
    await database.close();
    await rm(artifactRoot, { recursive: true, force: true });
  }
});
