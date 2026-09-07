import assert from "node:assert/strict";
import test from "node:test";
import { randomUUID } from "node:crypto";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";

test("creation recovery: duplicate request IDs reuse project and reject changed idea", async () => {
  const database = await openTestDatabase();
  try {
    const repository = new StudioRepository(database, "http://127.0.0.1:4313");
    const input = { requestId: randomUUID(), idea: "一个植物园拖拽拼图游戏，将图片放到正确位置完成关卡", template: "puzzle" };
    const [a, b] = await Promise.all([repository.create(input), repository.create(input)]);
    assert.equal(a.id, input.requestId); assert.equal(b.id, a.id);
    await assert.rejects(repository.create({ ...input, idea: "另一个完全不同的水果合成游戏，通过滑动合成水果" }), /不一致/);
    assert.equal(await repository.latestPlayableBuild(a.id), null);
    const message = { clientMessageId: randomUUID(), content: "第一关增加收集物，保持操作简单" };
    await Promise.all([repository.addMessage(a.id, message), repository.addMessage(a.id, message)]);
    const messages = await repository.listMessages(a.id);
    assert.equal(messages.filter(item => item.role === "user").length, 1);
    assert.equal(messages.filter(item => item.role === "assistant").length, 1);
    await assert.rejects(repository.addMessage(a.id, { ...message, content: "改成完全不同的意见" }), /意见标识/);
    const build = await repository.createBuild(a.id);
    assert.equal((await repository.latestBuild(a.id))?.id, build.id);
    assert.equal(await repository.latestPlayableBuild(a.id), null);
  } finally { await database.close(); }
});
