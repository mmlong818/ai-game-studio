import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { Pool } from "pg";
import { openDatabase, type StudioDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";
import { acquireRuntimeOwnership } from "../src/server/runtime-ownership";
import type { VersionQualityReport } from "../src/shared/contracts";

// Explicit integration entry point, outside *.test.ts: never uses public tables.
test("PostgreSQL 独立连接：发布复核锁、制作回执去重与执行权抢占", { timeout: 30000 }, async () => {
  const base = new URL(process.env.DATABASE_URL ?? "postgresql://studio@127.0.0.1:54329/ai_game_studio");
  if (!["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("集成测试仅允许本机数据库。");
  const schema = `test_publication_${randomUUID().replaceAll("-", "")}`;
  assert.match(schema, /^test_publication_[a-f0-9]{32}$/);
  const admin = new Pool({ connectionString: base.toString(), connectionTimeoutMillis: 3000 });
  const databases: StudioDatabase[] = [];
  let created = false;
  let release = () => {};
  let reviewTask: Promise<unknown> | undefined;
  let publishTask: Promise<unknown> | undefined;
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    created = true;
    const connect = async (name: string) => {
      const url = new URL(base);
      url.searchParams.set("options", `-c search_path=${schema} -c statement_timeout=10000 -c lock_timeout=8000`);
      url.searchParams.set("application_name", `${schema}_${name}`);
      const db = await openDatabase(url.toString());
      databases.push(db);
      assert.equal((await db.query<{ current_schema: string }>("SELECT current_schema()")).rows[0].current_schema, schema);
      return db;
    };
    const first = await connect("review");
    const second = await connect("publish");
    const leaseUrl = new URL(base);
    leaseUrl.searchParams.set("options", `-c search_path=${schema}`);
    let leaseLosses = 0;
    const owner = await acquireRuntimeOwnership(leaseUrl.toString(), () => { leaseLosses++; });
    try {
      await assert.rejects(acquireRuntimeOwnership(leaseUrl.toString(), () => { leaseLosses++; }), /已有游戏制作服务/);
    } finally { await owner.release(); }
    const successor = await acquireRuntimeOwnership(leaseUrl.toString(), () => { leaseLosses++; });
    await successor.release();
    await successor.release();
    assert.equal(leaseLosses, 0, "正常释放或拒绝第二实例不应触发失权回调");
    const repo = new StudioRepository(first, "http://localhost:4312");
    const publisher = new StudioRepository(second, "http://localhost:4312");
    const project = await repo.create({ idea: "花园记忆翻牌小游戏，配对所有花朵即可完成关卡", template: "generated" });
    const quality: VersionQualityReport = { status: "passed", summary: "隔离集成测试", checkedAt: new Date().toISOString(), checks: [{ id: "TEST", label: "测试", status: "passed", evidence: "仅验证数据库，不生成游戏" }] };
    const complete = async () => {
      const build = await repo.createBuild(project.id);
      await repo.completeBuild(build.id, undefined, quality);
      await repo.reviewVersionArt(project.id, build.id, { status: "passed", summary: "隔离测试使用的模拟审核结论。" });
      return build.id;
    };
    const oldVersion = await complete();
    await repo.publish(project.id, oldVersion);
    const newVersion = await complete();
    let locked!: () => void;
    const lockReached = new Promise<void>(resolve => { locked = resolve; });
    const gate = new Promise<void>(resolve => { release = resolve; });
    const held: StudioDatabase = { ...first, transaction: action => first.transaction(tx => action(new Proxy(tx, {
      get(target, property) {
        if (property === "query") return async (sql: string, values?: readonly unknown[]) => {
          const result = await target.query(sql, values);
          if (sql.startsWith("UPDATE versions SET art_review_status")) { locked(); await gate; }
          return result;
        };
        return Reflect.get(target, property);
      },
    }))) };
    reviewTask = new StudioRepository(held, "http://localhost:4312").reviewVersionArt(project.id, newVersion, { status: "failed", summary: "复核发现布局遮挡，不允许公开此版本。" });
    await Promise.race([lockReached, reviewTask.then(() => { throw new Error("未观察到审核锁"); })]);
    const outcome = publisher.publish(project.id, newVersion).then(() => ({ ok: true, error: "" }), error => ({ ok: false, error: String(error.message) }));
    publishTask = outcome;
    let blocked = false;
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      const rows = await admin.query("SELECT waiting.pid FROM pg_stat_activity waiting JOIN pg_stat_activity holder ON holder.pid = ANY(pg_blocking_pids(waiting.pid)) WHERE waiting.application_name = $1 AND holder.application_name = $2", [`${schema}_publish`, `${schema}_review`]);
      if (rows.rowCount) { blocked = true; break; }
      await new Promise(resolve => setTimeout(resolve, 40));
    }
    assert.equal(blocked, true, "必须观察到真正的数据库锁等待");
    release();
    await reviewTask;
    const result = await outcome;
    assert.equal(result.ok, false);
    assert.match(result.error, /没有通过主美复核/);
    assert.equal((await publisher.get(project.id))?.publication?.versionId, oldVersion);
    const history = await repo.listVersionArtReviews(project.id, newVersion);
    assert.deepEqual(history.map(row => [row.sequence, row.status]), [[2, "failed"], [1, "passed"]]);

    const revision = { requestId: randomUUID(), revisionScope: "gameplay" as const, content: "增加花朵配对成功后的轻柔反馈" };
    const simultaneous = await Promise.all([repo.createBuild(project.id, revision), publisher.createBuild(project.id, revision)]);
    assert.deepEqual(simultaneous.map(build => build.id), [revision.requestId, revision.requestId]);
    assert.equal((await repo.listMessages(project.id)).filter(message => message.role === "user").length, 1);
    await assert.rejects(publisher.createBuild(project.id, { requestId: randomUUID(), revisionScope: "gameplay", content: "同时提出另一条修改意见" }), /仍在制作/);
    const claims = await Promise.all([repo.markBuildRunning(revision.requestId), publisher.markBuildRunning(revision.requestId)]);
    assert.deepEqual(claims.sort(), [false, true], "同一回执只允许一个连接获得执行权");
    await first.query("UPDATE builds SET status = 'failed' WHERE id = $1", [revision.requestId]);
    assert.equal(await publisher.markBuildRunning(revision.requestId), false, "终态任务不能被重新领取");
    const another = await Promise.all([repo.createBuild(project.id), publisher.createBuild(project.id)]);
    assert.equal(another[0].id, another[1].id, "没有显式请求ID的重复启动也只能创建一条活动任务");
  } finally {
    release();
    await Promise.allSettled([reviewTask, publishTask].filter(Boolean));
    await Promise.all(databases.map(db => db.close()));
    // Only this run's validated, newly created schema is eligible for cleanup.
    try {
      if (created) {
        await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
        const remaining = await admin.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema]);
        assert.equal(remaining.rowCount, 0, "本轮临时 schema 必须清理完成");
      }
    }
    finally { await admin.end(); }
  }
});
