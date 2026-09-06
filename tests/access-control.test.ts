import assert from "node:assert/strict";
import test from "node:test";
import type { IncomingMessage } from "node:http";
import { AccessControl, RateLimiter } from "../src/server/access-control";

function fakeRequest(method: string, options: { ip?: string; authorization?: string } = {}): IncomingMessage {
  return {
    method,
    headers: options.authorization ? { authorization: options.authorization } : {},
    socket: { remoteAddress: options.ip ?? "203.0.113.7" },
  } as unknown as IncomingMessage;
}

test("限流器在窗口内超限拒绝，窗口滑过后恢复", () => {
  let now = 0;
  const limiter = new RateLimiter(() => now);
  const rule = { limit: 3, windowMs: 60_000 };
  assert.equal(limiter.allow("ip:create", rule), true);
  assert.equal(limiter.allow("ip:create", rule), true);
  assert.equal(limiter.allow("ip:create", rule), true);
  assert.equal(limiter.allow("ip:create", rule), false);
  now = 61_000;
  assert.equal(limiter.allow("ip:create", rule), true);
});

test("不同客户端与不同桶互不影响", () => {
  let now = 0;
  const limiter = new RateLimiter(() => now);
  const rule = { limit: 1, windowMs: 60_000 };
  assert.equal(limiter.allow("a:create", rule), true);
  assert.equal(limiter.allow("a:create", rule), false);
  assert.equal(limiter.allow("b:create", rule), true);
  assert.equal(limiter.allow("a:build", rule), true);
});

test("创建项目限流：同一 IP 每分钟最多 5 次，第 6 次返回 429", () => {
  let now = 0;
  const control = new AccessControl(null, new RateLimiter(() => now));
  for (let index = 0; index < 5; index += 1) {
    assert.deepEqual(control.check(fakeRequest("POST"), "/api/projects"), { allowed: true });
  }
  const denied = control.check(fakeRequest("POST"), "/api/projects");
  assert.equal(denied.allowed, false);
  if (!denied.allowed) assert.equal(denied.status, 429);
});

test("未配置令牌时不做鉴权", () => {
  const control = new AccessControl(null);
  assert.deepEqual(control.check(fakeRequest("POST"), "/api/projects"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET"), "/api/projects"), { allowed: true });
});

test("配置令牌后 API 需要 Bearer 令牌，玩家侧端点保持公开", () => {
  const control = new AccessControl("secret-token");
  const denied = control.check(fakeRequest("GET"), "/api/projects");
  assert.equal(denied.allowed, false);
  if (!denied.allowed) assert.equal(denied.status, 401);
  const reviewDenied = control.check(fakeRequest("GET"), "/api/design-knowledge/review");
  assert.equal(reviewDenied.allowed, false, "玩法复核聚合属于内部设计数据，不能作为玩家公开端点");
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/reviews").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/playtests").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/reviews/review-id/change-set").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/change-sets/change-id/review").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/change-sets/change-id/publish").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/releases/rollback").allowed, false);
  assert.equal(control.check(fakeRequest("GET"), "/api/design-knowledge/insights").allowed, false);
  assert.equal(control.check(fakeRequest("GET"), "/api/design-knowledge/radar").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/radar/RADAR-123/research").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research/task-id/change-set").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research/task-id/evaluation/browser").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research/task-id/evaluation/run").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research/task-id/evaluation/acquisition").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research/task-id/evaluation/acquisition/ASSET-UI/submit").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research/task-id/evaluation/acquisition/ASSET-UI/review").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research/task-id/evaluation/resource-intake").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research/task-id/evaluation/resource-intake/review").allowed, false);
  assert.equal(control.check(fakeRequest("POST"), "/api/design-knowledge/research/task-id/evaluation/resource-promotion").allowed, false);

  const wrong = control.check(fakeRequest("POST", { authorization: "Bearer wrong" }), "/api/projects");
  assert.equal(wrong.allowed, false);

  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/projects"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET", { authorization: "Bearer secret-token" }), "/api/design-knowledge/review"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/design-knowledge/reviews"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/design-knowledge/playtests"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET", { authorization: "Bearer secret-token" }), "/api/design-knowledge/change-sets"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET", { authorization: "Bearer secret-token" }), "/api/design-knowledge/releases"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/design-knowledge/releases/rollback"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET", { authorization: "Bearer secret-token" }), "/api/design-knowledge/insights"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET", { authorization: "Bearer secret-token" }), "/api/design-knowledge/radar"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET", { authorization: "Bearer secret-token" }), "/api/design-knowledge/research"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/design-knowledge/research/task-id/evaluation/acquisition"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/design-knowledge/research/task-id/evaluation/acquisition/ASSET-UI/submit"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/design-knowledge/research/task-id/evaluation/acquisition/ASSET-UI/review"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/design-knowledge/research/task-id/evaluation/resource-intake"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/design-knowledge/research/task-id/evaluation/resource-intake/review"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/design-knowledge/research/task-id/evaluation/resource-promotion"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET"), "/api/health"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST"), "/api/play-events"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET"), "/api/play-activity/player-00000000-0000-0000-0000-000000000000"), { allowed: true });
});

test("非 API 路径(游戏产物)不受鉴权影响", () => {
  const control = new AccessControl("secret-token");
  assert.deepEqual(control.check(fakeRequest("GET"), "/play/some-game/"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET"), "/version/abc/"), { allowed: true });
});
