import assert from "node:assert/strict";
import test from "node:test";
import { safeFailure } from "../src/server/build-failure.js";
import { SpriteSheetValidationError } from "../src/server/sprite-sheet.js";

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

test("浏览器整体验收超时使用独立错误码并提示资源已回收", () => {
  const error = Object.assign(new Error("真实浏览器整体验收超时。"), { name: "BrowserTimeoutError", code: "BROWSER_TIMEOUT" });
  const detail = safeFailure("browser", error);
  assert.equal(detail.code, "BROWSER_TIMEOUT");
  assert.equal(detail.category, "timeout");
  assert.equal(detail.retryable, true);
  assert.match(detail.message, /浏览器验收.*回收/);
});

test("文本 JSON 或模式解析失败归为无效响应，不冒充图片解码错误", () => {
  for (const error of [new Error("模型返回的内容不是有效的 JSON。"), Object.assign(new Error("schema mismatch"), { name: "ZodError" })]) {
    const detail = safeFailure("design", error);
    assert.equal(detail.category, "invalid-response");
    assert.equal(detail.code, "INVALID_RESPONSE");
    assert.equal(detail.message, "服务返回内容格式无效，无法继续制作。");
  }
});

test("规则审核提到真实关卡配置时仍归为验收失败，不误报服务配置", () => {
  const detail = safeFailure("code", new Error("服务器本地修复候选规则审核仍有 1 项未落实：玩法属性必须在真实关卡配置中生效。"));
  assert.equal(detail.code, "VALIDATION");
  assert.equal(detail.category, "validation");
});

test("参考编辑未完整返回目标会保留可信的资源清单", () => {
  const detail = safeFailure("asset", new Error("局部资源参考编辑未完整返回目标：需要 assets/roles/monk.png、assets/roles/demon.png，实际仅返回 assets/roles/monk.png；已停止制作并保留来源版本。"));
  assert.equal(detail.code, "ASSET_INCOMPLETE");
  assert.equal(detail.category, "validation");
  assert.equal(detail.retryable, false);
  assert.match(detail.message, /assets\/roles\/monk\.png/);
});

test("可信 Sprite Sheet 本地门禁保留具体且安全的失败原因", () => {
  const detail = safeFailure("asset", new SpriteSheetValidationError("SPRITE_FRAME_EDGE", "动画帧主体触碰了草稿格边缘，可能与相邻帧串格。"), {
    resource: { file: "assets/monk-tang.png", label: "唐僧" }, operation: "sprite-sheet-edit",
  });
  assert.deepEqual(detail, {
    stage: "asset", category: "invalid-image", code: "SPRITE_FRAME_EDGE",
    message: "动画帧主体触碰了草稿格边缘，可能与相邻帧串格。",
    nextStep: "该资源的图集合同或来源结构无效，系统不会把它标记为成功。",
    retryable: false, resource: { file: "assets/monk-tang.png", label: "唐僧" }, operation: "sprite-sheet-edit",
  });
});

test("只有已耗尽自动质量修复预算的资源才提供结构化续作入口", () => {
  const exhausted = Object.assign(new SpriteSheetValidationError("SPRITE_FRAME_SUBJECT", "第 1 帧没有可见主体。"), { autoRepairExhausted: true });
  const detail = safeFailure("asset", exhausted, { resource: { file: "assets/hero.png", label: "主角" }, operation: "sprite-sheet-edit" });
  assert.deepEqual(detail.continuation, { kind: "regenerate-resource", resourceFile: "assets/hero.png" });
  const hard = safeFailure("asset", new SpriteSheetValidationError("SPRITE_ANCHOR", "锚点无效。"), { resource: { file: "assets/hero.png", label: "主角" } });
  assert.equal(hard.continuation, undefined);
  assert.equal(safeFailure("asset", new Error("图像服务额度不足。"), { resource: { file: "assets/hero.png", label: "主角" } }).continuation, undefined);
});

test("交付阶段的平台规格校验失败不冒充服务返回无效，并点出字段", () => {
  // 复现 2026-09-14 真实构建：分析器给满 10 条硬性约束，资源步骤再追加一条交付槽位，冻结版本时被 schema 拒绝。
  const error = Object.assign(new Error("[{\"code\":\"too_big\",\"path\":[\"hardConstraints\"]}]"), { name: "ZodError", issues: [{ code: "too_big", path: ["hardConstraints"] }] });
  const detail = safeFailure("delivery", error);
  assert.equal(detail.code, "PLATFORM_SCHEMA");
  assert.equal(detail.category, "validation");
  assert.match(detail.message, /hardConstraints/);
  assert.match(detail.message, /平台缺陷/);
  assert.doesNotMatch(detail.message, /服务返回内容格式无效/);
  assert.match(detail.nextStep, /不需要重新生成图片/);
  // 其他阶段的 ZodError 仍是模型输出解析问题。
  assert.equal(safeFailure("design", error).code, "INVALID_RESPONSE");
});

test("规划阶段的用户输入校验失败如实归为输入问题，不冒充服务返回无效", () => {
  // 复现 2026-09-14：计划拆出的操作只有 10 个字，idea 最少 12 字的本地校验抛 ZodError，用户看到的却是“服务返回内容格式无效”。
  const error = Object.assign(new Error("[{\"path\":[\"idea\"]}]"), { name: "ZodError", issues: [{ code: "too_small", path: ["idea"], message: "请至少说明玩家做什么，以及怎样算完成。" }] });
  const detail = safeFailure("planning", error);
  assert.equal(detail.code, "INVALID_INPUT");
  assert.equal(detail.category, "validation");
  assert.match(detail.message, /请至少说明玩家做什么/);
  assert.match(detail.nextStep, /没有调用模型/);
  assert.doesNotMatch(detail.message, /服务返回内容格式无效/);
});

test("代码修复预算用尽归为平台未解决，不要求用户修改技术产物", () => {
  const detail = safeFailure("code", new Error("连续 6 轮生成代码均未通过产物契约验收，已达本次制作的修正上限，停止以免无限消耗：按钮被遮挡"));
  assert.equal(detail.code, "AUTO_REPAIR_EXHAUSTED");
  assert.equal(detail.category, "validation");
  assert.equal(detail.retryable, false);
  assert.match(detail.nextStep, /平台仍未解决/);
  assert.doesNotMatch(detail.nextStep, /请.*修改|重新提交/);
});

test("制作阶段共享请求预算在规则审核前耗尽仍归为自动修复耗尽", () => {
  const detail = safeFailure("review", new Error("本次构建的文字生成与审核已达到 1 次请求上限，已停止自动修复，不会继续消耗模型额度。"));
  assert.equal(detail.code, "AUTO_REPAIR_EXHAUSTED");
  assert.equal(detail.retryable, false);
  assert.match(detail.nextStep, /平台仍未解决/);
});
