import assert from "node:assert/strict";
import test from "node:test";
import { openTestDatabase, type StudioDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";
import type { VersionQualityReport } from "../src/shared/contracts";
const quality: VersionQualityReport = { status: "passed", summary: "测试验收", checkedAt: new Date().toISOString(), checks: [{ id: "TEST", label: "测试", status: "passed", evidence: "仅内存数据库模拟交付" }] };

async function fixture(db: StudioDatabase) {
  const repo = new StudioRepository(db, "http://localhost:4312");
  const project = await repo.create({ idea: "花园记忆翻牌小游戏，配对所有花朵即可完成关卡", template: "generated" });
  const complete = async () => {
    const build = await repo.createBuild(project.id);
    await repo.completeBuild(build.id, undefined, quality);
    await repo.reviewVersionArt(project.id, build.id, { status: "passed", summary: "测试用人工检查说明，不代表真实游戏验收。" });
    return build.id;
  };
  const oldVersion = await complete();
  await repo.publish(project.id, oldVersion);
  const newVersion = await complete();
  return { repo, project, oldVersion, newVersion };
}

for (const change of ["review", "archive"] as const) {
  test(`发布前状态变化必须重检：${change}，旧公开版本不被替换`, async () => {
    const db = await openTestDatabase();
    try {
      const { repo, project, oldVersion, newVersion } = await fixture(db);
      const interleaved: StudioDatabase = { ...db, transaction: async action => {
        // Deterministically inject a change after initial reads, before commit's transaction.
        if (change === "review") await repo.reviewVersionArt(project.id, newVersion, { status: "failed", summary: "复核发现结算按钮被遮挡，暂不允许公开。" });
        else await repo.archive(project.id);
        return db.transaction(action);
      } };
      await assert.rejects(new StudioRepository(interleaved, "http://localhost:4312").publish(project.id, newVersion), change === "review" ? /没有通过主美复核/ : /归档项目不能发布/);
      const row = (await db.query<{ version_id: string }>("SELECT version_id FROM publications WHERE project_id = $1", [project.id])).rows[0];
      assert.equal(row.version_id, oldVersion);
    } finally { await db.close(); }
  });
}

test("切换公开版本后若项目状态写入失败，事务恢复旧公开版本", async () => {
  const db = await openTestDatabase();
  try {
    const { project, oldVersion, newVersion } = await fixture(db);
    const failing: StudioDatabase = { ...db, transaction: action => db.transaction(tx => action(new Proxy(tx, {
      get(target, property) {
        if (property === "query") return (sql: string, values?: readonly unknown[]) => {
          if (sql.startsWith("UPDATE projects SET status = 'published'")) throw new Error("模拟提交失败");
          return target.query(sql, values);
        };
        return Reflect.get(target, property);
      },
    }))) };
    await assert.rejects(new StudioRepository(failing, "http://localhost:4312").publish(project.id, newVersion), /模拟提交失败/);
    const row = (await db.query<{ version_id: string }>("SELECT version_id FROM publications WHERE project_id = $1", [project.id])).rows[0];
    assert.equal(row.version_id, oldVersion);
  } finally { await db.close(); }
});
