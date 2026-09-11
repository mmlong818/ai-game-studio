import type { Build } from "../shared/contracts";

export type FailureDetail = NonNullable<Build["failureDetails"]>[number];

export class StudioApiError extends Error {
  readonly failureDetails: FailureDetail[];

  constructor(message: string, failureDetails: FailureDetail[] = []) {
    super(message);
    this.name = "StudioApiError";
    this.failureDetails = failureDetails;
  }
}

function isFailureDetail(value: unknown): value is FailureDetail {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return typeof item.stage === "string" && typeof item.category === "string" && typeof item.code === "string"
    && typeof item.message === "string" && typeof item.nextStep === "string" && typeof item.retryable === "boolean";
}

export function failureDetailsFrom(value: unknown): FailureDetail[] {
  if (value instanceof StudioApiError) return value.failureDetails;
  if (value && typeof value === "object" && "failureDetails" in value) {
    const details = (value as { failureDetails?: unknown }).failureDetails;
    return Array.isArray(details) ? details.filter(isFailureDetail) : [];
  }
  return [];
}

export function failureMessage(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (value instanceof StudioApiError && value.message.trim()) return value.message;
  return fallback;
}

export function apiFailureFallback(status: number) {
  if (status === 401) return "本机制作服务未接受当前访问凭据。请联系工作区管理员确认访问权限。";
  if (status === 403) return "当前账户没有执行这项操作的权限。请确认项目权限后再试。";
  if (status === 408 || status === 504) return "本机制作服务响应超时。制作没有自动重试，请在服务恢复后手动重试。";
  if (status === 429) return "请求过于频繁或模型服务暂时限流。请稍后手动重试。";
  if (status >= 500) return "本机制作服务暂时不可用。当前请求没有自动重试，请稍后手动重试。";
  return "请求没有被接受。请检查当前填写内容后再试。";
}
