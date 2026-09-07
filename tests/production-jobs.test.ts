import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { openTestDatabase } from "../src/server/database";
import { ProductionJobs } from "../src/server/production-jobs";
import { projectInputSchema } from "../src/shared/contracts";

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
    for (let n = 0; n < 3; n++) receipts.push(await jobs.submit({ idea: "一个花园记忆翻牌游戏，配对全部花朵即可获胜", requestId: randomUUID() }));
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
    const input = { requestId: randomUUID(), idea: "一个在花园中收集星星并躲避障碍的游戏" };
    const first = await jobs.submit(input);
    assert.equal(first.status, "queued");
    await jobs.submit(input);
    for (let n = 0; n < 100 && (await jobs.get(first.id))?.status !== "failed"; n++) await new Promise(done => setTimeout(done, 5));
    assert.equal(calls, 1);
    const restored = new ProductionJobs(db, async () => {});
    assert.equal((await restored.get(first.id))?.error, "策划生成未成功");
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
    const queued = projectInputSchema.parse({ requestId: randomUUID(), idea: "自由收集花朵，没有失败和最终目标" });
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
