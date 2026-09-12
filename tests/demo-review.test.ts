import assert from "node:assert/strict";
import test from "node:test";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";
import { requestsMajorExpansion } from "../src/server/demo-review";

test("扩展门只识别明确扩关和系统请求，不拦截修错与复刻反馈", () => {
  assert.equal(requestsMajorExpansion("增加五个关卡并让难度递进"), true);
  assert.equal(requestsMajorExpansion("加入等级系统"), true);
  assert.equal(requestsMajorExpansion("修正角色碰撞错误，补齐参考图里的按钮"), false);
  assert.equal(requestsMajorExpansion("背景颜色和参考图不一致，请修正"), false);
});

test("试玩完成不会自动验收，用户明确通过后只绑定当前版本", async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  try {
    const project = await repository.create({
      idea: "控制小船收集十颗水晶并躲避障碍后完成本局",
      template: "generated", dimensions: "2d", aspectRatio: "16:9",
      creationMode: "original-demo",
    });
    assert.equal(await repository.getDemoReview(project.id, project.version.id), null);
    const review = await repository.approveDemoReview(project.id, project.version.id);
    assert.equal(review.status, "approved");
    assert.deepEqual(await repository.getDemoReview(project.id, project.version.id), review);
    await assert.rejects(repository.approveDemoReview(project.id, "770e8400-e29b-41d4-a716-446655440000"), /只能验收当前试玩版本/);
  } finally {
    await database.close();
  }
});
