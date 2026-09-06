import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

test("阶段 G 匿名游玩事件会写入版本化玩家进度且不保存私人内容", async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  try {
    const project = await repository.create({ title: "回访验证", idea: "手机竖屏收集游戏，完成关卡后可继续挑战。", dimensions: "2d" });
    const playerId = "player-11111111-1111-4111-8111-111111111111";
    const base = { projectId: project.id, versionId: project.version.id, playerId, inputMode: "touch" as const, viewport: "390x844" };
    await repository.recordPlayEvent({ ...base, type: "start", level: 2, bestScore: 120, averageFps: 58 });
    await repository.recordPlayEvent({ ...base, type: "resource-error", level: 2 });
    await repository.recordPlayEvent({ ...base, type: "complete", level: 3, bestScore: 260, averageFps: 57 });
    const activities = await repository.playActivities(playerId);
    assert.equal(activities.length, 1);
    assert.equal(activities[0]?.status, "completed");
    assert.equal(activities[0]?.currentLevel, 3);
    assert.equal(activities[0]?.bestScore, 260);
    assert.equal(activities[0]?.resourceErrorCount, 1);
    assert.ok(activities[0]?.completedAt);
    const eventColumns = (await database.query<{ content_count: number }>("SELECT COUNT(*) AS content_count FROM play_events")).rows[0];
    assert.equal(Number(eventColumns?.content_count), 3);
  } finally {
    await database.close();
  }
});

test("阶段 G 生成物只在正式播放网址发送匿名质量事件", async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-stage-g-artifact-"));
  try {
    const project = await repository.create({ title: "匿名事件验证", idea: "完成 20 关的触控迷宫。", template: dimensions: "2d" });
    writeDesignDocuments(root, project);
    writeGameArtifact(root, project);
    const script = readFileSync(join(root, "app.js"), "utf8");
    assert.match(script, /forge-player-id/);
    assert.match(script, /\/api\/play-events/);
    assert.match(script, /\^\\\/\(play\|version\)\\\//);
    assert.doesNotMatch(script, /apiKey|prompt|customImageDataUrl/);
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
