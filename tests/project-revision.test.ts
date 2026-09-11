import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";
import { BuildOrchestrator } from "../src/server/build-orchestrator";

test("修改确认原子保存意见和任务，重复与终态回放不新建", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "制作一个轻松的花园记忆配对小游戏", template: "generated" });
    const revision = { requestId: randomUUID(), revisionScope: "gameplay" as const, content: "第一关轻松一点，配对增加花瓣动画" };
    const results = await Promise.all([repo.createBuild(project.id, revision), repo.createBuild(project.id, revision)]);
    assert.equal(results[0].id, revision.requestId);
    assert.equal(results[1].id, revision.requestId);
    assert.equal((await repo.listMessages(project.id)).filter(m => m.role === "user").length, 1);
    assert.equal((await repo.revisionBuild(project.id, revision.requestId))?.id, revision.requestId);
    await assert.rejects(repo.createBuild(project.id, { ...revision, content: "完全不同的修改意见" }), /其他内容/);
    await assert.rejects(repo.createBuild(project.id, { ...revision, revisionScope: "assets" }), /其他内容或范围/);
    await assert.rejects(repo.createBuild(project.id, { requestId: randomUUID(), revisionScope: "gameplay", content: "同时启动另一条意见" }), /仍在制作/);
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
    await assert.rejects(repo.createBuild(project.id, { requestId, revisionScope: "gameplay", content: "增加成功反馈" }), /写入失败/);
    assert.equal((await repo.listMessages(project.id)).length, 0);
    assert.equal(await repo.revisionBuild(project.id, requestId), null);
  } finally { await db.close(); }
});

test("多操作计划与来源版本作为同一构建回执持久化", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "制作一个轻松的花园记忆配对小游戏", template: "generated" });
    const content = "第一关配对次数减半，同时改成水彩画风";
    const revisionPlan = {
      sourceProjectId: project.id,
      sourceVersionId: project.version.id,
      content,
      operations: [
        { scope: "gameplay" as const, content },
        { scope: "visual-style" as const, content },
      ],
    };
    const revision = { requestId: randomUUID(), content, revisionPlan };
    const created = await repo.createBuild(project.id, revision);
    assert.deepEqual(created.revisionPlan, revisionPlan);
    assert.equal(created.revisionScope, null);
    assert.deepEqual((await repo.buildById(created.id)).revisionPlan, revisionPlan);
    assert.equal((await repo.createBuild(project.id, revision)).id, created.id);
    await assert.rejects(repo.createBuild(project.id, { ...revision, revisionPlan: { ...revisionPlan, operations: revisionPlan.operations.slice(0, 1) } }), /其他内容或范围/);
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

test("构建取消是幂等终态，迟到完成不能创建版本或覆盖已有成功版本", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "制作一个带四季变化的花园收集小游戏", template: "generated" });
    const baseline = await repo.createBuild(project.id);
    await repo.markBuildRunning(baseline.id);
    const passing = {
      status: "passed" as const, summary: "所有检查通过", checkedAt: new Date().toISOString(),
      checks: [{ id: "TEST", label: "测试", status: "passed" as const, evidence: "通过" }],
    };
    await repo.completeBuild(baseline.id, undefined, passing);
    const baselineVersionCount = (await repo.listVersions(project.id)).length;
    const build = await repo.createBuild(project.id);
    assert.equal(await repo.markBuildRunning(build.id), true);
    assert.equal((await repo.cancelBuild(build.id)).status, "cancelled");
    assert.equal((await repo.cancelBuild(build.id)).status, "cancelled");
    await assert.rejects(repo.completeBuild(build.id, undefined, passing), /已停止或已进入终态/);
    assert.equal((await repo.buildById(build.id)).status, "cancelled");
    assert.equal((await repo.listVersions(project.id)).length, baselineVersionCount, "取消版本没有写入，保留此前成功版本");
    assert.equal((await repo.get(project.id))?.version.id, baseline.id);
  } finally { await db.close(); }
});

test("创建到构建交接时 signal 已取消，新落库构建立即取消且不会被执行", async () => {
  const db = await openTestDatabase();
  const artifactRoot = mkdtempSync(join(tmpdir(), "cancel-handoff-"));
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "制作一个森林中寻找发光蘑菇的小游戏", template: "generated" });
    const orchestrator = new BuildOrchestrator(repo, artifactRoot, { coverArt: { generate: async () => { throw new Error("取消后不应生图"); }, generateDynamicArt: async () => { throw new Error("取消后不应生图"); } } });
    const build = await orchestrator.start(project.id, undefined, AbortSignal.abort());
    assert.equal((await repo.buildById(build.id)).status, "cancelled");
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal((await repo.buildById(build.id)).status, "cancelled");
  } finally { rmSync(artifactRoot, { recursive: true, force: true }); await db.close(); }
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
