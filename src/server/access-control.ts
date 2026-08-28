import type { IncomingMessage } from "node:http";

export interface RateRule {
  limit: number;
  windowMs: number;
}

/** 内存滑动窗口限流。按 key(客户端 IP + 桶名)记录时间戳,超限拒绝。 */
export class RateLimiter {
  private readonly hits = new Map<string, number[]>();

  constructor(private readonly now: () => number = Date.now) {}

  allow(key: string, rule: RateRule): boolean {
    const at = this.now();
    if (this.hits.size > 10_000) this.prune(at);
    const recent = (this.hits.get(key) ?? []).filter((stamp) => at - stamp < rule.windowMs);
    if (recent.length >= rule.limit) {
      this.hits.set(key, recent);
      return false;
    }
    recent.push(at);
    this.hits.set(key, recent);
    return true;
  }

  private prune(at: number) {
    for (const [key, stamps] of this.hits) {
      const recent = stamps.filter((stamp) => at - stamp < 600_000);
      if (recent.length === 0) this.hits.delete(key);
      else this.hits.set(key, recent);
    }
  }
}

// 创建项目会触发 LLM 调用,构建会占用真实浏览器,都必须收紧;
// 试玩遥测来自玩家页面,给宽松额度;其余 API 给常规额度。
const apiRateRules: Array<{ match: (method: string, pathname: string) => boolean; bucket: string; rule: RateRule }> = [
  { match: (m, p) => m === "POST" && p === "/api/projects", bucket: "create-project", rule: { limit: 5, windowMs: 60_000 } },
  { match: (m, p) => m === "POST" && /^\/api\/projects\/[^/]+\/build$/.test(p), bucket: "start-build", rule: { limit: 10, windowMs: 60_000 } },
  { match: (m, p) => m === "POST" && /^\/api\/projects\/[^/]+\/messages$/.test(p), bucket: "send-message", rule: { limit: 20, windowMs: 60_000 } },
  { match: (m, p) => m === "POST" && p === "/api/play-events", bucket: "play-events", rule: { limit: 120, windowMs: 60_000 } },
  { match: (_, p) => p.startsWith("/api/"), bucket: "api-general", rule: { limit: 240, windowMs: 60_000 } },
];

export function clientKeyOf(request: IncomingMessage): string {
  return request.socket.remoteAddress ?? "unknown";
}

export type AccessDecision = { allowed: true } | { allowed: false; status: 401 | 429; error: string };

/**
 * API 访问控制:可选的 Bearer Token 鉴权(设置 STUDIO_ACCESS_TOKEN 后启用)+ 按 IP 限流。
 * 玩家侧端点(健康检查、试玩遥测)始终免鉴权,只受限流约束。
 */
export class AccessControl {
  constructor(
    private readonly accessToken: string | null = null,
    private readonly limiter: RateLimiter = new RateLimiter(),
  ) {}

  check(request: IncomingMessage, pathname: string): AccessDecision {
    const method = request.method ?? "GET";
    const matched = apiRateRules.find((entry) => entry.match(method, pathname));
    if (matched) {
      const key = `${clientKeyOf(request)}:${matched.bucket}`;
      if (!this.limiter.allow(key, matched.rule)) {
        return { allowed: false, status: 429, error: "请求过于频繁，请稍后再试。" };
      }
    }
    if (this.accessToken && pathname.startsWith("/api/") && !this.isPublicEndpoint(method, pathname)) {
      const header = request.headers.authorization ?? "";
      if (header !== `Bearer ${this.accessToken}`) {
        return { allowed: false, status: 401, error: "该服务已开启访问令牌，请在请求头携带有效的 Authorization Bearer 令牌。" };
      }
    }
    return { allowed: true };
  }

  private isPublicEndpoint(method: string, pathname: string): boolean {
    if (method === "GET" && pathname === "/api/health") return true;
    if (method === "POST" && pathname === "/api/play-events") return true;
    if (method === "GET" && /^\/api\/play-activity\//.test(pathname)) return true;
    return false;
  }
}
