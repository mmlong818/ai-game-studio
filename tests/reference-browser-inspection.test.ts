import test from "node:test";
import assert from "node:assert/strict";
import { classifyReferenceBrowserObservation, inspectReferenceInBrowser } from "../src/server/reference-browser-inspection";

const raw = { finalUrl: "https://example.com/game", title: "Example", canvasCount: 1, iframeUrls: [], directEntryUrl: null, directEntryCanvasCount: 0, scriptUrls: ["https://example.com/game.js"], visualChanged: true, consoleErrors: [], requestCount: 4, blockedRequestCount: 0, pageBlocked: false };

test("运行画面与文字规则只能证明runtime-viewed，不能冒充实际试玩", () => {
  const result = classifyReferenceBrowserObservation(raw, true);
  assert.equal(result.runtimeStatus, "visible");
  assert.equal(result.gameplayStatus, "runtime-viewed");
  assert.equal(result.canClaimPlayable, false);
  assert.match(result.limitations.join(" "), /未执行实际玩法操作/);
});

test("页面载入但没有canvas或iframe时保持unknown", () => {
  const result = classifyReferenceBrowserObservation({ ...raw, canvasCount: 0, visualChanged: false }, true);
  assert.equal(result.runtimeStatus, "not-observed");
  assert.equal(result.gameplayStatus, "description-read");
});

test("只有iframe加载壳不能冒充运行画面", () => {
  const result = classifyReferenceBrowserObservation({ ...raw, canvasCount: 0, iframeUrls: ["https://example.com/embed"] }, true);
  assert.equal(result.runtimeStatus, "not-observed");
  assert.equal(result.canClaimPlayable, false);
  assert.match(result.limitations[0]!, /加载器或空壳/);
});

test("浏览器入口在driver前拒绝私网URL", async () => {
  let calls = 0;
  await assert.rejects(inspectReferenceInBrowser("http://127.0.0.1/private", { documented: true, driver: async () => { calls += 1; return raw; } }), /私有网络/);
  assert.equal(calls, 0);
});
