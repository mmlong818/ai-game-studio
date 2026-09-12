import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import { once } from "node:events";
import { serveDesignPreview } from "../src/server/design-preview-http";
import { DesignContractGenerator, ReferenceGameplayUnverifiedError } from "../src/server/design-contract";
import { OpenAISettings } from "../src/server/openai-settings";
import { createDesignProfile, type ProjectInput } from "../src/shared/contracts";

async function withServer(generator: Pick<DesignContractGenerator, "generate">, run: (url: string) => Promise<void>, input: ProjectInput = { idea: "花园中寻找成对花朵的记忆小游戏", template: "puzzle" }) {
  const errors: unknown[] = [];
  const server = createServer((request, response) => {
    void serveDesignPreview(request, response, input, generator)
      .catch(error => { errors.push(error); response.destroy(); });
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try { await run(`http://127.0.0.1:${(server.address() as { port: number }).port}`); }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); }
  assert.deepEqual(errors, []);
}

test("客户端误标原创时参考意图仍使用取证约束而非自由创作方向", async () => {
  let direction = "";
  await withServer({ generate: async (_input, _analysis, directions) => { direction = directions.join("\n"); return createDesignProfile("generated", "standard"); } }, async url => {
    const response = await fetch(url, { method: "POST" });
    assert.equal(response.status, 200);
  }, { idea: "忠实复刻 https://example.com/game", template: "generated", creationMode: "original-demo" });
  assert.match(direction, /未知项保持未知/);
  assert.doesNotMatch(direction, /灵感仅是输入|合理且操作简单的建议/);
});

test("未试玩参考以结构化能力报告结束且不返回方案", async () => {
  const inspection = { method: "public-browser" as const, runtimeStatus: "not-observed" as const, gameplayStatus: "description-read" as const, canClaimPlayable: false as const, finalUrl: "https://example.com/game", title: "Example", canvasCount: 0, iframeUrls: [], scriptUrls: [], visualChanged: false, consoleErrors: [], requestCount: 1, blockedRequestCount: 0, limitations: ["未执行实际玩法操作，不能确认完整交互。"] };
  await withServer({ generate: async () => { throw new ReferenceGameplayUnverifiedError("请描述玩法并明确同意转为原创单局。", inspection); } }, async url => {
    const response = await fetch(url, { method: "POST", headers: { Accept: "application/x-ndjson" } });
    const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
    const failure = events.at(-1);
    assert.equal(failure.code, "REFERENCE_GAMEPLAY_UNVERIFIED");
    assert.equal(failure.referenceInspection.canClaimPlayable, false);
    assert.equal(events.some(event => event.type === "done"), false);
  }, { idea: "复制这个游戏 https://example.com/game", template: "generated", creationMode: "reference-replica" });
});

test("真实HTTP断连穿过设计生成器中止提供方，不重试", { timeout: 5000 }, async () => {
  let calls = 0;
  let notify!: () => void;
  const aborted = new Promise<void>(resolve => { notify = resolve; });
  const generator = new DesignContractGenerator(new OpenAISettings("sk-test_1234567890abcdef"), {
    fetchImpl: async (_url, init) => {
      calls++;
      return new Promise((_resolve, reject) => {
        init!.signal!.addEventListener("abort", () => { notify(); reject(new DOMException("cancelled", "AbortError")); }, { once: true });
      });
    },
  });
  await withServer(generator, async url => {
    const client = new AbortController();
    const response = await fetch(url, { method: "POST", headers: { Accept: "application/x-ndjson" }, signal: client.signal });
    assert.equal(response.status, 200);
    client.abort();
    await aborted;
  });
  assert.equal(calls, 1);
});

for (const streaming of [false, true]) test(`正常HTTP完成不触发模型取消：stream=${streaming}`, async () => {
  let signal: AbortSignal | undefined;
  const profile = createDesignProfile("puzzle", "standard");
  await withServer({ generate: async (_input, _analysis, _directions, delta, _reset, received) => {
    signal = received;
    delta?.('{"genre":"花园拼图"}');
    return profile;
  } }, async url => {
    const response = await fetch(url, { method: "POST", headers: { Accept: streaming ? "application/x-ndjson" : "application/json" } });
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, streaming ? /"type":"done"/ : /"source":"llm"/);
  });
  assert.equal(signal?.aborted, false);
});

test("流式响应按真实边界报告提交、接收和检查阶段", async () => {
  const profile = createDesignProfile("puzzle", "standard");
  await withServer({ generate: async (_input, _analysis, _directions, delta, _reset, _signal, callbacks) => {
    delta?.('{"genre":"花园拼图"}');
    callbacks?.onValidating?.();
    return profile;
  } }, async url => {
    const response = await fetch(url, { method: "POST", headers: { Accept: "application/x-ndjson" } });
    const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
    assert.deepEqual(events.filter(event => event.type === "status").map(event => event.phase), ["submitted", "receiving", "checking"]);
    assert.ok(events.findIndex(event => event.phase === "receiving") < events.findIndex(event => event.type === "delta"));
    assert.ok(events.findIndex(event => event.phase === "checking") < events.findIndex(event => event.type === "done"));
    assert.ok(events.every(event => event.message === undefined));
  });
});

test("reset 回到等待阶段，下一段真实内容再次进入接收；失败前不伪报检查", async () => {
  await withServer({ generate: async (_input, _analysis, _directions, delta, reset) => {
    delta?.("旧片段");
    reset?.();
    delta?.("新片段");
    return null;
  } }, async url => {
    const response = await fetch(url, { method: "POST", headers: { Accept: "application/x-ndjson" } });
    const events = (await response.text()).trim().split("\n").map(line => JSON.parse(line));
    assert.deepEqual(events.map(event => event.type === "status" ? `status:${event.phase}` : event.type), [
      "status:submitted", "status:receiving", "delta", "reset", "status:submitted", "status:receiving", "delta", "error",
    ]);
    assert.equal(events.some(event => event.phase === "checking"), false);
  });
});
