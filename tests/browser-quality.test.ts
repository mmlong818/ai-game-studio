import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { browserQualityAvailable, inspectGameInBrowser } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

test("真实浏览器验收会覆盖五档画幅、玩法状态和三阶段截图", { skip: !browserQualityAvailable() }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-browser-quality-"));
  try {
    const project = await repository.create({
      title: "浏览器验收样本",
      idea: "做一个构成主义俄罗斯方块，完成十条消行后获胜并支持触控。",
      template: "tetris",
      dimensions: "2d",
      aspectRatio: "9:16",
    });
    writeDesignDocuments(artifactRoot, project);
    writeGameArtifact(artifactRoot, project);

    const result = await inspectGameInBrowser(artifactRoot);

    assert.equal(result.checks.length, 3);
    assert.ok(result.checks.every((check) => check.status === "passed"));
    assert.equal(result.screenshotPaths.length, 7);
    assert.ok(result.screenshotPaths.every((path) => existsSync(path)));
    assert.equal(existsSync(join(artifactRoot, "_studio", "BROWSER_QUALITY_REPORT.json")), true);
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("星梦对决固定游戏接入相同的状态协议和浏览器验收", { skip: !browserQualityAvailable() }, async () => {
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-golden-quality-"));
  try {
    cpSync(resolve("fixtures", "star-dream-duel"), artifactRoot, { recursive: true });
    const result = await inspectGameInBrowser(artifactRoot);
    assert.ok(result.checks.every((check) => check.status === "passed"));
    assert.equal(result.screenshotPaths.length, 7);
  } finally {
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
