import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { createClaudeCliFetch } from "./claude-cli-text-provider";

type Script = (args: string[], stdin: string) => { stdout: string[]; exitCode?: number; delayMs?: number };

function fakeSpawn(script: Script) {
  const calls: Array<{ command: string; args: string[]; stdin: string }> = [];
  const spawnImpl = ((command: string, args: string[]) => {
    const child = new EventEmitter() as any;
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    let stdin = "";
    child.stdin.on("data", (chunk: Buffer) => { stdin += chunk.toString("utf8"); });
    child.killed = false;
    child.kill = () => { child.killed = true; setTimeout(() => child.emit("close", null), 0); };
    child.stdin.on("finish", () => {
      const plan = script(args, stdin);
      calls.push({ command, args, stdin });
      setTimeout(() => {
        if (child.killed) return;
        for (const line of plan.stdout) child.stdout.write(`${line}\n`);
        child.stdout.end();
        child.emit("close", plan.exitCode ?? 0);
      }, plan.delayMs ?? 0);
    });
    return child;
  }) as never;
  return { spawnImpl, calls };
}

const request = (body: object, signal?: AbortSignal) => ({ method: "POST", body: JSON.stringify(body), signal } as RequestInit);
const messages = [{ role: "system", content: "你是策划" }, { role: "user", content: "做一个翻牌游戏" }];
const schema = { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false };

describe("Claude CLI 文本适配器", () => {
  it("非流式请求转成 chat.completion，且以隔离参数启动 CLI", async () => {
    const { spawnImpl, calls } = fakeSpawn(() => ({ stdout: [JSON.stringify({ type: "result", is_error: false, result: '{"title":"花园翻牌"}', structured_output: { title: "花园翻牌" } })] }));
    const fetchImpl = createClaudeCliFetch({ spawnImpl, model: "opus" });
    const response = await fetchImpl("https://api.openai.com/v1/chat/completions", request({ model: "gpt-x", messages, response_format: { type: "json_schema", json_schema: { name: "t", schema } } }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.choices[0].message.content).toBe('{"title":"花园翻牌"}');
    expect(body.model).toBe("claude-cli:opus");
    const [call] = calls;
    expect(call.command).toBe("claude");
    expect(call.stdin).toBe("做一个翻牌游戏");
    expect(call.args).toEqual(expect.arrayContaining(["-p", "--output-format", "json", "--model", "opus", "--max-turns", "1", "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--setting-sources", "", "--json-schema", JSON.stringify(schema)]));
    expect(call.args).not.toContain("--bare");
    expect(call.args[call.args.indexOf("--system-prompt-file") + 1]).toMatch(/system\.txt$/);
  });

  it("流式请求以 SSE 转发 JSON 增量并以 [DONE] 结束", async () => {
    const delta = (partial_json: string) => JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "input_json_delta", partial_json } } });
    const { spawnImpl, calls } = fakeSpawn(() => ({ stdout: [
      JSON.stringify({ type: "system", subtype: "init" }),
      JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "thinking_delta", thinking: "..." } } }),
      JSON.stringify({ type: "stream_event", event: { type: "content_block_delta", delta: { type: "text_delta", text: "I'll build the game now." } } }),
      delta('{"title":'), delta('"花园翻牌"}'),
      JSON.stringify({ type: "result", is_error: false, result: '{"title":"花园翻牌"}', structured_output: { title: "花园翻牌" } }),
    ] }));
    const fetchImpl = createClaudeCliFetch({ spawnImpl });
    const response = await fetchImpl("x", request({ stream: true, messages, response_format: { type: "json_schema", json_schema: { name: "t", schema } } }));
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    const text = await response.text();
    const events = text.split("\n\n").filter(Boolean).map(line => line.replace(/^data: /, ""));
    expect(events.at(-1)).toBe("[DONE]");
    const contents = events.slice(0, -1).map(line => JSON.parse(line)).map(event => event.choices[0].delta.content ?? "");
    expect(contents.join("")).toBe('{"title":"花园翻牌"}');
    expect(JSON.parse(events.at(-2)!).choices[0].finish_reason).toBe("stop");
    expect(calls[0].args).toEqual(expect.arrayContaining(["--output-format", "stream-json", "--include-partial-messages", "--verbose"]));
  });

  it("CLI 报错时返回可判定的状态码，登录失效不触发重试", async () => {
    const { spawnImpl } = fakeSpawn(() => ({ stdout: [JSON.stringify({ type: "result", is_error: true, result: "Not logged in · Please run /login" })], exitCode: 1 }));
    const fetchImpl = createClaudeCliFetch({ spawnImpl });
    const response = await fetchImpl("x", request({ messages }));
    expect(response.status).toBe(401);
    expect(await response.text()).toContain("Not logged in");
    const { spawnImpl: failing } = fakeSpawn(() => ({ stdout: ["garbage"], exitCode: 2 }));
    const broken = await createClaudeCliFetch({ spawnImpl: failing })("x", request({ messages }));
    expect(broken.status).toBe(502);
  });

  it("流式中途出错时以 error 事件告知调用方而不是伪造完成", async () => {
    const { spawnImpl } = fakeSpawn(() => ({ stdout: [JSON.stringify({ type: "result", is_error: true, result: "rate limited" })] }));
    const response = await createClaudeCliFetch({ spawnImpl })("x", request({ stream: true, messages }));
    const text = await response.text();
    expect(text).toContain('"error"');
    expect(text).not.toContain("[DONE]");
  });

  it("中止信号会终止子进程并以 AbortError 拒绝", async () => {
    const { spawnImpl } = fakeSpawn(() => ({ stdout: [JSON.stringify({ type: "result", result: "{}" })], delayMs: 5_000 }));
    const controller = new AbortController();
    const pending = createClaudeCliFetch({ spawnImpl })("x", request({ messages }, controller.signal));
    setTimeout(() => controller.abort(), 20);
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  });

  it("命令行放不下 schema 时改由系统提示承载约束", async () => {
    const { spawnImpl, calls } = fakeSpawn(() => ({ stdout: [JSON.stringify({ type: "result", result: '{"title":"x"}' })] }));
    const huge = { ...schema, description: "x".repeat(40_000) };
    const response = await createClaudeCliFetch({ spawnImpl })("x", request({ messages, response_format: { type: "json_schema", json_schema: { name: "t", schema: huge } } }));
    expect(response.status).toBe(200);
    expect(calls[0].args).not.toContain("--json-schema");
  });
});
