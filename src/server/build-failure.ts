import type { Build } from "../shared/contracts.js";
import { SpriteSheetValidationError } from "./sprite-sheet.js";

export type FailureDetail = NonNullable<Build["failureDetails"]>[number];

export class BuildFailure extends Error {
  constructor(message: string, readonly details: FailureDetail[], cause?: unknown) { super(message, cause === undefined ? undefined : { cause }); this.name = "BuildFailure"; }
}

type FailureMeta = { attempt?: number; httpStatus?: number; requestId?: string };

export function safeFailure(stage: FailureDetail["stage"], error: unknown, extra: Partial<FailureDetail> = {}): FailureDetail {
  const source = error instanceof Error ? error : new Error("未知错误");
  const exhausted = Boolean((source as Error & { autoRepairExhausted?: boolean }).autoRepairExhausted);
  const continuation = exhausted && extra.resource?.file ? { continuation: { kind: "regenerate-resource" as const, resourceFile: extra.resource.file } } : {};
  if (source instanceof SpriteSheetValidationError) {
    const modelOutput = new Set(["SPRITE_FRAME_FORMAT", "SPRITE_FRAME_SUBJECT", "SPRITE_FRAME_TRANSPARENCY", "SPRITE_SHEET_FORMAT", "SPRITE_FRAME_RESOLUTION", "SPRITE_CLIP_AREA", "SPRITE_CLIP_ASPECT"]).has(source.code);
    return {
      stage,
      category: "invalid-image",
      code: source.code,
      message: source.message,
      nextStep: modelOutput ? "系统已用完本轮资源修复次数；下一轮将继续只重新生成并检查该资源。" : "该资源的图集合同或来源结构无效，系统不会把它标记为成功。",
      retryable: false,
      ...continuation,
      ...extra,
    };
  }
  const meta = source as Error & { failureMeta?: FailureMeta };
  const message = source.message.replace(/(?:Bearer\s+|sk-)[A-Za-z0-9._-]+/gi, "[已隐藏]").slice(0, 500);
  const http = message.match(/(?:接口返回|HTTP)\s*(\d{3})/);
  const invalidImageResponse = /没有返回图像数据|不是有效的 PNG|无法完整解码/.test(message);
  // A text response can be invalid after a successful HTTP request. Keep that
  // safe explanation separate from an image decoder failure.
  const invalidTextResponse = /不是有效的 JSON|没有返回可解析的内容|未提供输出流|模型流式输出失败|输出连接中断|输出因 .*截断/.test(message)
    || source.name === "SyntaxError" || source.name === "ZodError";
  const causeCode = (value: unknown): string => value && typeof value === "object"
    ? String((value as { code?: unknown }).code ?? causeCode((value as { cause?: unknown }).cause)).toUpperCase() : "";
  const networkCode = causeCode(source);
  const browserTimeout = source.name === "BrowserTimeoutError" || networkCode === "BROWSER_TIMEOUT";
  const code = browserTimeout ? "BROWSER_TIMEOUT" : source.name === "AbortError" || /超时|没有响应/i.test(message) || networkCode === "UND_ERR_CONNECT_TIMEOUT" ? "TIMEOUT"
    : /^(?:ECONN|ENOTFOUND|EAI_AGAIN|UND_ERR_)/.test(networkCode) ? "NETWORK"
    : /权限|403/.test(message) ? "PERMISSION" : /401|Key 无效|认证/.test(message) ? "AUTHENTICATION"
      : /额度不足|insufficient_quota/i.test(message) ? "QUOTA" : /429|频繁|限流/.test(message) ? "RATE_LIMIT" : http ? `HTTP_${http[1]}`
        : /参考编辑未完整返回目标/.test(message) ? "ASSET_INCOMPLETE" : invalidImageResponse || invalidTextResponse ? "INVALID_RESPONSE" : /本地修复候选规则审核|规则审核仍有/.test(message) ? "VALIDATION" : /配置|未启用|没有配置/.test(message) ? "CONFIGURATION" : /PNG|透明|图像|图片|生图|尺寸|比例|裁切/.test(message) ? "INVALID_IMAGE"
          : /浏览器/.test(message) ? "BROWSER_VALIDATION" : /验收|探针|审核/.test(message) ? "VALIDATION" : "UNKNOWN";
  const category: FailureDetail["category"] = code === "TIMEOUT" || code === "BROWSER_TIMEOUT" ? "timeout" : code === "NETWORK" ? "network" : code === "PERMISSION" ? "permission" : code === "AUTHENTICATION" ? "authentication" : code === "QUOTA" || code === "RATE_LIMIT" ? "rate-limit" : http ? "http" : code === "INVALID_RESPONSE" ? "invalid-response" : code === "INVALID_IMAGE" ? "invalid-image" : code === "CONFIGURATION" ? "configuration" : code === "ASSET_INCOMPLETE" || code === "VALIDATION" || code === "BROWSER_VALIDATION" ? "validation" : "unknown";
  const retryable = code !== "QUOTA" && (category === "timeout" || category === "network" || category === "rate-limit" || (category === "http" && Boolean(http && Number(http[1]) >= 500)));
  const size = message.match(/(?:只有|尺寸为)\s*(\d+)×(\d+).*?(?:适配|目标)\s*(\d+)×(\d+)/);
  const safeMessage = code === "BROWSER_TIMEOUT" ? "真实浏览器验收超过总等待期限，已停止并回收浏览器资源。" : code === "TIMEOUT" ? "服务在等待期限内没有响应。" : code === "NETWORK" ? "无法连接服务。" : code === "AUTHENTICATION" ? "认证未通过。" : code === "PERMISSION" ? "当前模型或项目没有执行权限。" : code === "QUOTA" ? "服务额度不足。" : code === "RATE_LIMIT" ? "服务暂时限制了请求频率。" : code === "CONFIGURATION" ? "服务配置不完整或不兼容。" : code === "INVALID_RESPONSE" ? invalidImageResponse ? "服务未返回可解码的 PNG 图像数据。" : "服务返回内容格式无效，无法继续制作。" : code === "ASSET_INCOMPLETE" ? message : code === "INVALID_IMAGE" && /没有真实透明/.test(message) ? "返回图片缺少所需的透明背景。" : code === "INVALID_IMAGE" && size ? `返回图片尺寸 ${size[1]}×${size[2]}，无法满足目标 ${size[3]}×${size[4]}。` : code === "INVALID_IMAGE" && /比例/.test(message) ? "返回图片比例与目标不符，裁切后不足以保留要求的画面。" : code === "INVALID_IMAGE" ? "返回图片未通过本地 PNG 或尺寸校验。" : code === "VALIDATION" || code === "BROWSER_VALIDATION" ? "生成结果没有通过验收。" : http ? `服务返回 HTTP ${http[1]}。` : "构建遇到未分类错误，详细原因未安全记录。";
  const nextStep = code === "AUTHENTICATION" ? "检查当前 API Key 与服务地址后，再由你明确重新制作。" : code === "PERMISSION" ? "确认该 Key 对所选模型和项目有权限后，再由你明确重新制作。" : code === "QUOTA" ? "补充服务额度或账单后，再由你明确重新制作。" : code === "RATE_LIMIT" ? "系统会在服务恢复后重新提交。" : code === "INVALID_IMAGE" ? "系统已用完本轮资源修复次数；下一轮将继续只重新生成并检查该资源。" : code === "CONFIGURATION" ? "检查图像或文本服务配置后，再由你明确重新制作。" : retryable ? "系统会在服务或网络恢复后重新提交。" : "系统将保留失败记录并继续从安全检查点恢复。";
  return { stage, category, code, message: safeMessage, nextStep, retryable, ...continuation, ...(meta.failureMeta?.attempt ? { attempt: meta.failureMeta.attempt } : {}), ...(meta.failureMeta?.requestId && /^[A-Za-z0-9_-]{1,80}$/.test(meta.failureMeta.requestId) ? { requestId: meta.failureMeta.requestId } : {}), ...(meta.failureMeta?.httpStatus ? { httpStatus: meta.failureMeta.httpStatus } : http ? { httpStatus: Number(http[1]) } : {}), ...extra };
}
