import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { openTestDatabase } from "../src/server/database";
import { ProductionJobs } from "../src/server/production-jobs";
import { projectInputSchema } from "../src/shared/contracts";

test("新制作任务在排队和模型调用前拒绝缺失或自动画幅", async () => {
  const db = await openTestDatabase();
  let calls = 0;
  const jobs = new ProductionJobs(db, async () => { calls += 1; });
  try {
    await jobs.initialize();
    const idea = "制作一个收集星星并躲避障碍，集满十颗后获胜的小游戏。";
    await assert.rejects(jobs.submit({ idea }), /必须明确选择/);
    await assert.rejects(jobs.submit({ idea, aspectRatio: "auto" }), /必须明确选择/);
    assert.equal(calls, 0);
  } finally { await db.close(); }
});

test("创建阶段最多并发两个任务，其余保持排队", async () => {
  const db = await openTestDatabase();
  let active = 0;
  let maximum = 0;
  const release: (() => void)[] = [];
  const jobs = new ProductionJobs(db, async () => {
    active++; maximum = Math.max(maximum, active);
    await new Promise<void>(resolve => release.push(resolve));
    active--;
  });
  try {
    await jobs.initialize();
    const receipts = [];
    for (let n = 0; n < 3; n++) receipts.push(await jobs.submit({ idea: "一个花园记忆翻牌游戏，配对全部花朵即可获胜", requestId: randomUUID(), aspectRatio: "9:16" }));
    for (let n = 0; n < 100 && release.length < 2; n++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(release.length, 2);
    assert.equal((await jobs.get(receipts[2].id))?.status, "queued");
    release[0]();
    for (let n = 0; n < 100 && release.length < 3; n++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(release.length, 3);
    assert.equal(maximum, 2);
    release[1](); release[2]();
    for (let n = 0; n < 100 && (await jobs.get(receipts[2].id))?.status !== "building"; n++) await new Promise(resolve => setTimeout(resolve, 5));
  } finally { release.forEach(done => done()); await db.close(); }
});

test("服务端先持久化接收记录，重复提交不重复执行，失败可重新读取", async () => {
  const db = await openTestDatabase();
  let calls = 0;
  const jobs = new ProductionJobs(db, async (_input, report) => { calls++; await report("正在细化游戏方案"); throw new Error("策划生成未成功"); });
  try {
    await jobs.initialize();
    const input = { requestId: randomUUID(), idea: "一个在花园中收集星星并躲避障碍的游戏", aspectRatio: "16:9" as const };
    const first = await jobs.submit(input);
    assert.equal(first.status, "queued");
    await jobs.submit(input);
    for (let n = 0; n < 100 && (await jobs.get(first.id))?.status !== "failed"; n++) await new Promise(done => setTimeout(done, 5));
    assert.equal(calls, 1);
    const restored = new ProductionJobs(db, async () => {});
    const failed = await restored.get(first.id);
    assert.equal(failed?.error, "构建遇到未分类错误，详细原因未安全记录。");
    assert.deepEqual(failed?.failureDetails?.map(({ stage, category, code, retryable }) => ({ stage, category, code, retryable })), [
      { stage: "planning", category: "unknown", code: "UNKNOWN", retryable: false },
    ]);
    assert.equal((await restored.get(first.id))?.events?.[0].title, "正在细化游戏方案");
    await jobs.submit(input);
    assert.equal(calls, 1);
    await assert.rejects(jobs.submit({ ...input, idea: "另一款完全不同的水果合成小游戏" }), /另一份方案/);
  } finally { await db.close(); }
});

test("重启只恢复尚未执行的排队回执，不重试结果未知的创建调用", async () => {
  const db = await openTestDatabase();
  const called: string[] = [];
  try {
    await new ProductionJobs(db, async () => {}).initialize();
    const queued = projectInputSchema.parse({ requestId: randomUUID(), idea: "自由收集花朵，没有失败和最终目标", aspectRatio: "1:1" });
    const uncertain = projectInputSchema.parse({ ...queued, requestId: randomUUID() });
    for (const [input, status] of [[queued, "queued"], [uncertain, "creating"]] as const) {
      await db.query("INSERT INTO production_jobs (id, input_json, status) VALUES ($1, $2, $3)", [input.requestId, JSON.stringify(input), status]);
    }
    const restored = new ProductionJobs(db, async input => { called.push(input.requestId!); });
    await restored.initialize();
    for (let n = 0; n < 100 && (await restored.get(queued.requestId!))?.status !== "building"; n++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.deepEqual(called, [queued.requestId]);
    assert.equal((await restored.get(uncertain.requestId!))?.status, "failed");
    await restored.submit(queued);
    await restored.submit(uncertain);
    assert.deepEqual(called, [queued.requestId]);
  } finally { await db.close(); }
});

test("无法校验的排队输入失败退出，不调用制作服务", async () => {
  const db = await openTestDatabase();
  try {
    const jobs = new ProductionJobs(db, async () => { throw new Error("不应调用"); });
    await jobs.initialize();
    const id = randomUUID();
    await db.query("INSERT INTO production_jobs (id, input_json, status) VALUES ($1, $2, 'queued')", [id, "invalid"]);
    await jobs.initialize();
    assert.equal((await jobs.get(id))?.error, "排队方案无法恢复，未启动模型调用。");
  } finally { await db.close(); }
});

test("创建阶段失败后可用同一份已确认方案重新制作，不重新策划；已生成项目的任务拒绝", async () => {
  const db = await openTestDatabase();
  let attempts = 0;
  const jobs = new ProductionJobs(db, async () => { attempts++; if (attempts === 1) throw new Error("设计合同不完整：ID 重复：3"); });
  try {
    await jobs.initialize();
    const confirmedDesignProfile = {
      genre: "休闲点击", targetPlayer: "所有人", playerFantasy: "海边拾贝", sessionLength: "5 分钟",
      coreLoop: ["看篮子还差几枚", "点击浮现的贝壳", "装满后进入下一片海滩"], winCondition: "五关装满篮子", failCondition: "不会失败",
      progression: ["五关数量递增"], difficultyCurve: ["前两关只加数量", "第三关加入浪"], gameFeel: ["贝壳飞入篮子", "海鸥庆祝"],
      onboarding: ["点一枚贝壳", "看篮子计数"], accessibility: ["大按钮", "无倒计时"], productionRisks: [],
    };
    const idea = "海边贝壳收集，点击贝壳装满篮子";
    const first = await jobs.submit({ idea, requestId: randomUUID(), confirmedDesignProfile, aspectRatio: "9:16" });
    for (let n = 0; n < 100 && (await jobs.get(first.id))?.status !== "failed"; n++) await new Promise(done => setTimeout(done, 5));
    assert.equal((await jobs.get(first.id))?.status, "failed");
    await assert.rejects(jobs.resubmitFailed(first.id, async () => true), /已生成项目/);
    const retried = await jobs.resubmitFailed(first.id, async () => false);
    assert.notEqual(retried.id, first.id);
    for (let n = 0; n < 100 && (await jobs.get(retried.id))?.status !== "building"; n++) await new Promise(done => setTimeout(done, 5));
    assert.equal((await jobs.get(retried.id))?.status, "building");
    assert.equal(attempts, 2);
    assert.equal((await jobs.get(first.id))?.status, "failed");
    await assert.rejects(jobs.resubmitFailed(retried.id, async () => false), /只有已失败/);
    await assert.rejects(jobs.resubmitFailed(randomUUID(), async () => false), /找不到/);
    const plain = await jobs.submit({ idea: "没有确认方案的旧式提交：玩家点星星，集满十颗算完成", requestId: randomUUID(), aspectRatio: "16:9" });
    for (let n = 0; n < 100 && (await jobs.get(plain.id))?.status !== "building"; n++) await new Promise(done => setTimeout(done, 5));
  } finally { await db.close(); }
});

test("取消可先于同 requestId 的创建提交，迟到提交不会启动孤儿任务", async () => {
  const db = await openTestDatabase();
  let calls = 0;
  const jobs = new ProductionJobs(db, async () => { calls += 1; });
  const id = randomUUID();
  try {
    await jobs.initialize();
    assert.equal((await jobs.cancel(id)).status, "cancelled");
    assert.equal((await jobs.submit({ requestId: id, idea: "在森林中寻找四枚发光种子的轻松小游戏", aspectRatio: "9:16" })).status, "cancelled");
    await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(calls, 0);
  } finally { await db.close(); }
});

test("创建中取消会触发 AbortSignal，且取消后不进入下一阶段", async () => {
  const db = await openTestDatabase();
  let laterProviderCalls = 0;
  let entered!: () => void;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const jobs = new ProductionJobs(db, async (_input, _report, signal) => {
    entered();
    await new Promise<void>((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason), { once: true }));
    laterProviderCalls += 1;
  });
  try {
    await jobs.initialize();
    const receipt = await jobs.submit({ requestId: randomUUID(), idea: "经营一间夜间萤火虫花园并收集光点", aspectRatio: "1:1" });
    await started;
    assert.equal((await jobs.cancel(receipt.id)).status, "cancelled");
    for (let n = 0; n < 50 && (await jobs.get(receipt.id))?.status !== "cancelled"; n++) await new Promise(resolve => setTimeout(resolve, 2));
    assert.equal((await jobs.get(receipt.id))?.status, "cancelled");
    assert.equal(laterProviderCalls, 0);
  } finally { await db.close(); }
});

test("删除只接受终态任务，并只删除指定任务及其事件", async () => {
  const db = await openTestDatabase();
  const jobs = new ProductionJobs(db, async () => {});
  const activeId = randomUUID(), targetId = randomUUID(), otherId = randomUUID();
  try {
    await jobs.initialize();
    for (const [id, status] of [[activeId, "queued"], [targetId, "failed"], [otherId, "failed"]] as const) {
      await db.query("INSERT INTO production_jobs (id, input_json, status) VALUES ($1, $2, $3)", [id, JSON.stringify({ requestId: id }), status]);
      await db.query("INSERT INTO production_job_events (id, job_id, title, created_at) VALUES ($1, $2, $3, $4)", [randomUUID(), id, `event-${id}`, new Date().toISOString()]);
    }
    await assert.rejects(jobs.deleteTerminal(activeId), /仍在运行/);
    assert.ok(await jobs.get(activeId));
    assert.deepEqual(await jobs.deleteTerminal(targetId), { deleted: true });
    assert.equal(await jobs.get(targetId), null);
    assert.ok(await jobs.get(otherId));
    assert.equal((await db.query("SELECT id FROM production_job_events WHERE job_id = $1", [targetId])).rowCount, 0);
    assert.equal((await db.query("SELECT id FROM production_job_events WHERE job_id = $1", [otherId])).rowCount, 1);
  } finally { await db.close(); }
});
