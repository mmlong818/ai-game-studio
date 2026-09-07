import assert from "node:assert/strict";
import test from "node:test";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";

test("只查询本项目最近失败或成功候选，排除当前构建并最多八项", async () => {
  const database = await openTestDatabase();
  try {
    const repository = new StudioRepository(database, "http://127.0.0.1:4312");
    const project = await repository.create({ idea: "花园翻牌游戏，配对花朵即可完成，不设倒计时", template: "generated" });
    const other = await repository.create({ idea: "另一个花园翻牌游戏，匹配所有牌完成关卡", template: "generated" });
    const ids: string[] = [];
    for (let n = 0; n < 10; n++) {
      const build = await repository.createBuild(project.id);
      ids.push(build.id);
      await database.query("UPDATE builds SET status = $2, created_at = $3 WHERE id = $1", [build.id, n % 2 ? "succeeded" : "failed", `2026-09-06T00:00:${String(n).padStart(2, "0")}.000Z`]);
    }
    const unrelated = await repository.createBuild(other.id);
    await database.query("UPDATE builds SET status = 'failed' WHERE id = $1", [unrelated.id]);
    const running = await repository.createBuild(project.id);
    await database.query("UPDATE builds SET status = 'running' WHERE id = $1", [running.id]);
    const candidates = await repository.recentReusableBuilds(project.id, ids[9]);
    assert.deepEqual(candidates.map(item => item.id), ids.slice(1, 9).reverse());
  } finally { await database.close(); }
});
