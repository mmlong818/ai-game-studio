import type { IncomingMessage, ServerResponse } from "node:http";
import { ZodError } from "zod";

const maxBodyBytes = 256 * 1024;

export function sendJson(response: ServerResponse, status: number, body: unknown) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

export function sendError(response: ServerResponse, error: unknown) {
  if (error instanceof ZodError) {
    sendJson(response, 400, {
      error: "输入内容没有通过校验。",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  const message = error instanceof Error ? error.message : "服务器无法完成请求。";
  const status = message.includes("不存在") ? 404
    : /还没有可发布|必须先归档|构建正在进行|归档项目不能|缺少必要证据|必须在本复核周期|不能再修改|重新复核|不能生成知识变更集|不能再次晋级|不能再次降级|只有待审核|只有待评审|必须审核通过|基础知识版本已过期|审核状态已变化/.test(message) ? 409
      : 500;
  sendJson(response, status, { error: message });
}

export async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBodyBytes) throw new Error("请求内容不能超过 256 KB。");
    chunks.push(buffer);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("请求内容不是有效的 JSON。");
  }
}
