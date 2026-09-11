import assert from "node:assert/strict";
import test from "node:test";
import { safeFailure } from "../src/server/build-failure.js";

test("安全失败分类不会回显密钥或远端正文", () => {
  const cases: Array<[Error, string, boolean]> = [
    [new Error("模型接口返回 401。 Bearer sk-secret-value"), "AUTHENTICATION", false],
    [new Error("模型接口返回 403。"), "PERMISSION", false],
    [new Error("文本模型额度不足，未自动重试。"), "QUOTA", false],
    [new Error("模型接口返回 429。"), "RATE_LIMIT", true],
    [Object.assign(new Error("fetch failed"), { cause: { code: "ENOTFOUND" } }), "NETWORK", true],
    [new TypeError("程序参数错误"), "UNKNOWN", false],
    [new Error("生图接口没有返回图像数据。"), "INVALID_RESPONSE", false],
    [new Error("生图结果没有真实透明区域。"), "INVALID_IMAGE", false],
    [new Error("生图结果只有 320×180，不足以无损适配 640×360。"), "INVALID_IMAGE", false],
  ];
  for (const [error, code, retryable] of cases) {
    const detail = safeFailure("asset", error);
    assert.equal(detail.code, code);
    assert.equal(detail.retryable, retryable);
    assert.doesNotMatch(detail.message, /secret|Bearer|sk-/i);
  }
});

test("超时可从递归原因识别，并保留受限请求元数据", () => {
  const error = Object.assign(new Error("request failed"), { cause: { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }, failureMeta: { attempt: 2, httpStatus: 504, requestId: "req_safe-1" } });
  const detail = safeFailure("asset", error);
  assert.equal(detail.code, "TIMEOUT"); assert.equal(detail.retryable, true); assert.equal(detail.attempt, 2); assert.equal(detail.httpStatus, 504); assert.equal(detail.requestId, "req_safe-1");
});

test("文本 JSON 或模式解析失败归为无效响应，不冒充图片解码错误", () => {
  for (const error of [new Error("模型返回的内容不是有效的 JSON。"), Object.assign(new Error("schema mismatch"), { name: "ZodError" })]) {
    const detail = safeFailure("design", error);
    assert.equal(detail.category, "invalid-response");
    assert.equal(detail.code, "INVALID_RESPONSE");
    assert.equal(detail.message, "服务返回内容格式无效，无法继续制作。");
  }
});

test("参考编辑未完整返回目标会保留可信的资源清单", () => {
  const detail = safeFailure("asset", new Error("局部资源参考编辑未完整返回目标：需要 assets/roles/monk.png、assets/roles/demon.png，实际仅返回 assets/roles/monk.png；已停止制作并保留来源版本。"));
  assert.equal(detail.code, "ASSET_INCOMPLETE");
  assert.equal(detail.category, "validation");
  assert.equal(detail.retryable, false);
  assert.match(detail.message, /assets\/roles\/monk\.png/);
});
