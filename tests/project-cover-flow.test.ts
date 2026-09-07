import assert from "node:assert/strict";
import test from "node:test";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";
import type { VersionQualityReport } from "../src/shared/contracts";

const quality: VersionQualityReport = {
  status: "passed", summary: "封面关联流程测试，不运行模型。", checkedAt: new Date().toISOString(),
  checks: [{ id: "TEST", label: "模拟产物验收", status: "passed", evidence: "仅验证数据库交付流程" }],
};
test("封面随验收版本交付而非随发布交付，失败修改保留旧封面", async () => {
  const database = await openTestDatabase();
  try {
    const repo = new StudioRepository(database, "http://localhost:4312", "http://localhost:4313/");
    const draft = await repo.create({ idea: "花园记忆翻牌，配对花朵完成关卡", template: "generated" });
    assert.equal(draft.coverUrl, null);
    const first = await repo.createBuild(draft.id);
    assert.equal((await repo.get(draft.id))?.coverUrl, null);
    const delivered = await repo.completeBuild(first.id, undefined, quality);
    const firstCover = `http://localhost:4313/version/${first.id}/assets/cover.png`;
    assert.equal(delivered.coverUrl, firstCover);
    assert.equal(delivered.publication, null);
    assert.equal((await repo.list())[0].coverUrl, firstCover);
    const failed = await repo.createBuild(draft.id);
    assert.equal((await repo.get(draft.id))?.coverUrl, firstCover);
    await repo.failBuild(failed.id, 0, "模拟修改失败");
    assert.equal((await repo.list())[0].coverUrl, firstCover);
    const next = await repo.createBuild(draft.id);
    const revised = await repo.completeBuild(next.id, undefined, quality);
    assert.equal(revised.coverUrl, `http://localhost:4313/version/${next.id}/assets/cover.png`);
    assert.equal((await repo.getVersion(draft.id, first.id))?.coverUrl, firstCover);
    assert.equal((await repo.getVersion(draft.id, draft.version.id))?.coverUrl, null);
    assert.equal(revised.publication, null);
  } finally { await database.close(); }
});
