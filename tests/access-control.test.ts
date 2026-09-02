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

  const wrong = control.check(fakeRequest("POST", { authorization: "Bearer wrong" }), "/api/projects");
  assert.equal(wrong.allowed, false);

  assert.deepEqual(control.check(fakeRequest("POST", { authorization: "Bearer secret-token" }), "/api/projects"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET"), "/api/health"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("POST"), "/api/play-events"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET"), "/api/play-activity/player-00000000-0000-0000-0000-000000000000"), { allowed: true });
});

test("非 API 路径(游戏产物)不受鉴权影响", () => {
  const control = new AccessControl("secret-token");
  assert.deepEqual(control.check(fakeRequest("GET"), "/play/some-game/"), { allowed: true });
  assert.deepEqual(control.check(fakeRequest("GET"), "/version/abc/"), { allowed: true });
});
