import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";

test("修改确认原子保存意见和任务，重复与终态回放不新建", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "制作一个轻松的花园记忆配对小游戏", template: "generated" });
    const revision = { requestId: randomUUID(), content: "第一关轻松一点，配对增加花瓣动画" };
    const results = await Promise.all([repo.createBuild(project.id, revision), repo.createBuild(project.id, revision)]);
    assert.equal(results[0].id, revision.requestId);
    assert.equal(results[1].id, revision.requestId);
    assert.equal((await repo.listMessages(project.id)).filter(m => m.role === "user").length, 1);
    assert.equal((await repo.revisionBuild(project.id, revision.requestId))?.id, revision.requestId);
    await assert.rejects(repo.createBuild(project.id, { ...revision, content: "完全不同的修改意见" }), /其他内容/);
    await assert.rejects(repo.createBuild(project.id, { requestId: randomUUID(), content: "同时启动另一条意见" }), /仍在制作/);
    assert.equal((await repo.listMessages(project.id)).filter(m => m.role === "user").length, 1);
    await db.query("UPDATE builds SET status = 'failed' WHERE id = $1", [revision.requestId]);
    assert.equal((await repo.createBuild(project.id, revision)).status, "failed");
    const other = await repo.create({ idea: "另一个简单的花园记忆配对小游戏", template: "generated" });
    assert.equal(await repo.revisionBuild(other.id, revision.requestId), null);
    await assert.rejects(repo.createBuild(other.id, revision), /其他内容/);
  } finally { await db.close(); }
});

test("构建记录写入失败时修改意见一并回滚", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "制作一个轻松的花园记忆配对小游戏", template: "generated" });
    const transaction = db.transaction.bind(db);
    db.transaction = callback => transaction(tx => callback(new Proxy(tx, { get(target, prop) {
      if (prop === "query") return (sql: string, values: unknown[]) => {
        if (sql.includes("INSERT INTO builds")) throw new Error("模拟任务写入失败");
        return target.query(sql, values);
      };
      return Reflect.get(target, prop);
    } })));
    const requestId = randomUUID();
    await assert.rejects(repo.createBuild(project.id, { requestId, content: "增加成功反馈" }), /写入失败/);
    assert.equal((await repo.listMessages(project.id)).length, 0);
    assert.equal(await repo.revisionBuild(project.id, requestId), null);
  } finally { await db.close(); }
});

test("只有首次领取排队任务成功，重复或终态领取不重新执行", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "制作一个轻松的花园记忆配对小游戏", template: "generated" });
    const build = await repo.createBuild(project.id);
    assert.equal(await repo.markBuildRunning(build.id), true);
    assert.equal(await repo.markBuildRunning(build.id), false);
    await db.query("UPDATE builds SET status = 'failed' WHERE id = $1", [build.id]);
    assert.equal(await repo.markBuildRunning(build.id), false);
    assert.equal((await repo.buildById(build.id)).status, "failed");
  } finally { await db.close(); }
});

test("中断恢复保留未开始的构建回执，只将运行中任务标为失败", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const queuedProject = await repo.create({ idea: "制作一个轻松的花园记忆配对小游戏", template: "generated" });
    const runningProject = await repo.create({ idea: "制作另一个轻松的森林记忆配对小游戏", template: "generated" });
    const queued = await repo.createBuild(queuedProject.id);
    const running = await repo.createBuild(runningProject.id);
    await repo.markBuildRunning(running.id);
    await repo.failInterruptedBuilds();
    assert.equal((await repo.buildById(queued.id)).status, "queued");
    assert.equal((await repo.buildById(running.id)).status, "failed");
    assert.deepEqual(await repo.queuedBuildIds(), [queued.id]);
  } finally { await db.close(); }
});
