import assert from "node:assert/strict";
import test from "node:test";
import { openTestDatabase, type StudioDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";
import type { VersionQualityReport } from "../src/shared/contracts";
const quality: VersionQualityReport = { status: "passed", summary: "测试验收", checkedAt: new Date().toISOString(), checks: [{ id: "TEST", label: "测试", status: "passed", evidence: "内存数据库流程测试" }] };

test("正式发布要求最新审核由服务端验证凭据，输入不能自报身份", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "花园翻牌小游戏，匹配花朵完成目标", template: "generated" });
    const build = await repo.createBuild(project.id); await repo.markBuildRunning(build.id); await repo.completeBuild(build.id, undefined, quality);
    const input = { status: "passed", summary: "在手机和桌面完成实际画面检查。", reviewerId: "forged" };
    await repo.reviewVersionArt(project.id, build.id, input);
    await assert.rejects(repo.publish(project.id, build.id, true), /审核凭据/);
    await repo.reviewVersionArt(project.id, build.id, input, { id: "configured-reviewer" });
    const history = await repo.listVersionArtReviews(project.id, build.id);
    assert.equal(history[0].source, "operator-credential"); assert.equal(history[1].source, "manual-unverified");
    assert.equal(history[0].reviewerId, "configured-reviewer");
    assert.equal((await repo.publish(project.id, build.id, true)).publication?.status, "live");
    await repo.reviewVersionArt(project.id, build.id, input);
    await assert.rejects(repo.publish(project.id, build.id, true), /审核凭据/);
  } finally { await db.close(); }
});

test("复核追加完整历史，绑定版本，失败结论阻止发布", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "花园记忆翻牌小游戏，配对所有花朵即可完成关卡", template: "generated" });
    const build = await repo.createBuild(project.id);
    await repo.markBuildRunning(build.id);
    await repo.completeBuild(build.id, undefined, quality);
    assert.deepEqual(await repo.listVersionArtReviews(project.id, build.id), []);
    await repo.reviewVersionArt(project.id, build.id, { status: "failed", summary: "手机画面结算按钮被文字遮挡。" });
    await assert.rejects(repo.publish(project.id, build.id), /没有通过主美复核/);
    await repo.reviewVersionArt(project.id, build.id, { status: "passed", summary: "复查手机与桌面画幅，结算按钮均可见。" });
    const history = await repo.listVersionArtReviews(project.id, build.id);
    assert.deepEqual(history.map(r => [r.sequence, r.previousStatus, r.status]), [[2, "failed", "passed"], [1, "pending", "failed"]]);
    assert.equal(history[1].summary, "手机画面结算按钮被文字遮挡。");
    assert.equal(history[0].source, "manual-unverified");
    assert.equal((await repo.get(project.id))?.publication, null);
    await assert.rejects(repo.listVersionArtReviews("another-project", build.id), /不存在/);
    assert.deepEqual(await repo.listVersionArtReviews(project.id, project.version.id), []);
  } finally { await db.close(); }
});

test("审核状态更新失败时新增历史一并回滚", async () => {
  const db = await openTestDatabase();
  try {
    const repo = new StudioRepository(db, "http://localhost:4312");
    const project = await repo.create({ idea: "花园记忆翻牌小游戏，配对所有花朵即可完成关卡", template: "generated" });
    const build = await repo.createBuild(project.id);
    await repo.markBuildRunning(build.id);
    await repo.completeBuild(build.id, undefined, quality);
    const failing: StudioDatabase = { ...db, transaction: action => db.transaction(tx => action(new Proxy(tx, {
      get(target, property) {
        if (property === "query") return (sql: string, values?: readonly unknown[]) => {
          if (sql.startsWith("UPDATE versions SET art_review_status")) throw new Error("模拟状态写入失败");
          return target.query(sql, values);
        };
        return Reflect.get(target, property);
      },
    }))) };
    await assert.rejects(new StudioRepository(failing, "http://localhost:4312").reviewVersionArt(project.id, build.id, { status: "passed", summary: "检查了主体清晰度与各画幅布局。" }), /模拟状态写入失败/);
    assert.deepEqual(await repo.listVersionArtReviews(project.id, build.id), []);
    assert.equal((await repo.get(project.id))?.version.artReviewStatus, "pending");
  } finally { await db.close(); }
});
