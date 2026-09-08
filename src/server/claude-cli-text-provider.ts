import { spawn as nodeSpawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * 把平台内部的 OpenAI chat-completions 请求转发给本机 Claude Code CLI（`claude -p`），
 * 使用登录账号的订阅额度，不需要 Anthropic API Key。
 *
 * 返回的是 `typeof fetch`，各生成器无需改动：非流式返回 chat.completion JSON，
 * 流式返回 `text/event-stream`，逐段转发结构化输出的 JSON 增量并以 `[DONE]` 结束。
 * 每次请求都是独立的一轮、不开工具、不加载 MCP 与用户设置、不落会话文件。
 */
export type ClaudeCliTextProviderOptions = {
  executable?: string;
  model?: string;
  spawnImpl?: typeof nodeSpawn;
  /** Windows 单条命令行上限约 32K 字符；超过时 schema 改由系统提示承载。 */
  maxCommandLineChars?: number;
};

type ChatRequest = {
  model?: string;
  stream?: boolean;
  messages: Array<{ role: string; content: string }>;
  response_format?: { type: string; json_schema?: { name?: string; schema?: unknown } };
};

type CliResultEvent = { type: "result"; is_error?: boolean; result?: unknown; structured_output?: unknown; subtype?: string; errors?: unknown };

export const DEFAULT_CLAUDE_CLI_MODEL = "opus";
const DEFAULT_MAX_COMMAND_LINE_CHARS = 28_000;
/** 结构化输出允许的轮数：首轮作答 + 两次按 CLI 校验错误重写。 */
export const STRUCTURED_OUTPUT_MAX_TURNS = 3;

/** CLI 结果事件的可读错误：result 不是字符串时（如 error_max_turns）用 errors/subtype 说明，不再只剩“返回错误”。 */
function cliErrorMessage(event: CliResultEvent): string {
  if (typeof event.result === "string" && event.result.trim()) return event.result;
  const details = Array.isArray(event.errors) ? event.errors.filter((item): item is string => typeof item === "string").join("；") : "";
  return `Claude CLI 返回错误${event.subtype ? `（${event.subtype}）` : ""}${details ? `：${details}` : "。"}`;
}

export function claudeCliTextModelLabel(model: string) {
  return `claude-cli:${model}`;
}

function encodeSse(payload: unknown) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

function chatCompletion(model: string, content: string) {
  return {
    id: `claude-cli-${Date.now()}`,
    object: "chat.completion",
    model,
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
  };
}

function resultText(event: CliResultEvent): string | null {
  if (event.structured_output !== undefined && event.structured_output !== null) return JSON.stringify(event.structured_output);
  return typeof event.result === "string" && event.result.trim() ? event.result : null;
}

function errorStatus(message: string) {
  // 登录失效等不可重试的错误用 4xx；其余按暂时性错误交给调用方的有限重试。
  return /not logged in|login|unauthorized|invalid api key/i.test(message) ? 401 : 502;
}

export function createClaudeCliFetch(options: ClaudeCliTextProviderOptions = {}): typeof fetch {
  const executable = options.executable ?? "claude";
  const model = options.model ?? DEFAULT_CLAUDE_CLI_MODEL;
  const spawnImpl = options.spawnImpl ?? nodeSpawn;
  const maxCommandLineChars = options.maxCommandLineChars ?? DEFAULT_MAX_COMMAND_LINE_CHARS;

  return async function claudeCliFetch(_input: string | URL | Request, init?: RequestInit): Promise<Response> {
    if (init?.signal?.aborted) throw abortError();
    let request: ChatRequest;
    try {
      request = JSON.parse(String(init?.body ?? "{}")) as ChatRequest;
      if (!Array.isArray(request.messages)) throw new Error("missing messages");
    } catch {
      return new Response("Claude CLI 适配器只接受 chat-completions 形式的 JSON 请求。", { status: 400 });
    }
    const system = request.messages.filter(message => message.role === "system").map(message => message.content).join("\n\n");
    const user = request.messages.filter(message => message.role !== "system").map(message => message.role === "user" ? message.content : `${message.role}:\n${message.content}`).join("\n\n");
    const schema = request.response_format?.type === "json_schema" ? request.response_format.json_schema?.schema : undefined;
    const schemaJson = schema === undefined ? null : JSON.stringify(schema);
    const stream = request.stream === true;

    const scratch = mkdtempSync(join(tmpdir(), "claude-cli-text-"));
    const systemPromptFile = join(scratch, "system.txt");
    // 结构化输出由 CLI 内置的 StructuredOutput 工具承载：模型把答案写进工具参数，CLI 按 schema 校验，
    // 不合格时把错误作为工具结果返回让模型重写。这个纠错至少要再给一轮，否则一次格式失误就成 error_max_turns。
    const maxTurns = schema === undefined ? "1" : String(STRUCTURED_OUTPUT_MAX_TURNS);
    const args = ["-p", "--output-format", stream ? "stream-json" : "json", ...(stream ? ["--include-partial-messages", "--verbose"] : []),
      "--model", model, "--max-turns", maxTurns, "--tools", "", "--strict-mcp-config", "--no-session-persistence", "--setting-sources", "",
      "--system-prompt-file", systemPromptFile];
    let systemPrompt = system;
    const baseLength = args.join(" ").length + executable.length;
    if (schemaJson && baseLength + schemaJson.length + 16 <= maxCommandLineChars) {
      args.push("--json-schema", schemaJson);
    } else if (schemaJson) {
      // 命令行放不下 schema 时退回“提示词约束”，输出仍由调用方按 zod 校验。
      systemPrompt = `${system}\n\n只输出一个符合下列 JSON Schema 的 JSON 对象，不要输出任何其他文字：\n${schemaJson}`;
    }
    if (schemaJson) systemPrompt = `${systemPrompt}\n\n直接给出最终结构化结果，不要先输出计划、说明或过程文字。`;
    writeFileSync(systemPromptFile, systemPrompt || "你是游戏创作平台的服务端模型。", "utf8");

    const cleanup = () => rmSync(scratch, { recursive: true, force: true });
    let child: ChildProcess;
    try {
      child = spawnImpl(executable, args, { stdio: ["pipe", "pipe", "pipe"], shell: false, windowsHide: true });
    } catch (error) {
      cleanup();
      return new Response(`无法启动 Claude CLI：${error instanceof Error ? error.message : String(error)}`, { status: 503 });
    }
    child.stdin?.end(user, "utf8");
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");

    const label = claudeCliTextModelLabel(model);
    let stderr = "";
    child.stderr?.on("data", chunk => { stderr = `${stderr}${chunk}`.slice(-2000); });
    const onAbort = () => { child.kill(); };
    init?.signal?.addEventListener("abort", onAbort, { once: true });
    const finish = () => { init?.signal?.removeEventListener("abort", onAbort); cleanup(); };

    if (!stream) {
      return new Promise<Response>((resolve, reject) => {
        let stdout = "";
        child.stdout?.on("data", chunk => { stdout += chunk; });
        child.on("error", error => { finish(); resolve(new Response(`无法启动 Claude CLI：${error.message}`, { status: 503 })); });
        child.on("close", code => {
          finish();
          if (init?.signal?.aborted) { reject(abortError()); return; }
          const event = parseLastResult(stdout);
          if (!event) { resolve(new Response(`Claude CLI 未返回结果（退出码 ${code}）。${stderr.trim().slice(-300)}`, { status: 502 })); return; }
          if (event.is_error) { const message = cliErrorMessage(event); resolve(new Response(message, { status: errorStatus(message) })); return; }
          const content = resultText(event);
          if (!content) { resolve(new Response("Claude CLI 没有返回可解析的内容。", { status: 502 })); return; }
          resolve(new Response(JSON.stringify(chatCompletion(label, content)), { status: 200, headers: { "content-type": "application/json" } }));
        });
      });
    }

    // 流式：把 StructuredOutput 工具输入的 JSON 增量当作 content 增量转发。
    const encoder = new TextEncoder();
    let streamed = "";
    let closed = false;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        let pending = "";
        const send = (payload: unknown) => { if (!closed) controller.enqueue(encoder.encode(encodeSse(payload))); };
        const end = () => { if (!closed) { closed = true; controller.close(); } };
        const fail = (message: string) => { send({ error: { message } }); end(); };
        const handleLine = (line: string) => {
          let event: any;
          try { event = JSON.parse(line); } catch { return; }
          if (event?.type === "stream_event" && event.event?.type === "content_block_delta") {
            const delta = event.event.delta;
            // 要求结构化输出时只转发 StructuredOutput 的 JSON 增量；模型在调用工具前写的说明文字不是答案，不能混进内容。
            const text = delta?.type === "input_json_delta" ? delta.partial_json : delta?.type === "text_delta" && !schemaJson ? delta.text : null;
            if (typeof text === "string" && text) { streamed += text; send({ choices: [{ index: 0, delta: { content: text } }] }); }
            return;
          }
          // CLI 拒绝了一次结构化输出（schema 不符）并让模型重写：之前转发的增量作废，通知调用方清空重新累积。
          if (event?.type === "user" && Array.isArray(event.message?.content) && event.message.content.some((item: any) => item?.type === "tool_result" && item.is_error)) {
            if (streamed) { streamed = ""; send({ reset: true, choices: [{ index: 0, delta: {} }] }); }
            return;
          }
          if (event?.type === "result") {
            const result = event as CliResultEvent;
            if (result.is_error) { fail(cliErrorMessage(result)); return; }
            const content = resultText(result);
            // CLI 校验通过的最终结构化结果是唯一权威；已转发增量与之语义不同时整体替换，避免半截输出混进答案。
            // 只是空白或键序差异不算不同，否则每次成功都会让调用方无故清空重来。
            if (content && !sameJson(streamed, content)) { if (streamed) send({ reset: true, choices: [{ index: 0, delta: {} }] }); streamed = content; send({ choices: [{ index: 0, delta: { content } }] }); }
            if (!streamed) { fail("Claude CLI 没有返回可解析的内容。"); return; }
            send({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] });
            if (!closed) controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            end();
          }
        };
        child.stdout?.on("data", (chunk: string) => {
          pending += chunk;
          let index: number;
          while ((index = pending.indexOf("\n")) >= 0) { const line = pending.slice(0, index).trim(); pending = pending.slice(index + 1); if (line) handleLine(line); }
        });
        child.on("error", error => { finish(); fail(`无法启动 Claude CLI：${error.message}`); });
        child.on("close", code => {
          finish();
          if (pending.trim()) handleLine(pending.trim());
          if (!closed) fail(init?.signal?.aborted ? "请求已中止。" : `Claude CLI 输出在完成前结束（退出码 ${code}）。${stderr.trim().slice(-300)}`);
        });
      },
      cancel() { closed = true; child.kill(); finish(); },
    });
    return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
  };
}

function sameJson(left: string, right: string): boolean {
  if (left === right) return true;
  try { return JSON.stringify(JSON.parse(left)) === JSON.stringify(JSON.parse(right)); } catch { return false; }
}

function parseLastResult(stdout: string): CliResultEvent | null {
  const lines = stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const event = JSON.parse(lines[index]);
      if (event?.type === "result") return event as CliResultEvent;
    } catch { /* keep looking */ }
  }
  try {
    const whole = JSON.parse(stdout);
    if (whole?.type === "result") return whole as CliResultEvent;
  } catch { /* not a single JSON document */ }
  return null;
}

function abortError() {
  const error = new Error("请求已中止。");
  error.name = "AbortError";
  return error;
}
