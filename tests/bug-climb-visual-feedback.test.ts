import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const gameScript = readFileSync(new URL("../fixtures/bug-climb/app.js", import.meta.url), "utf8");

test("虫虫攀枝的树瘤与树脂不绘制半透明底框", () => {
  assert.doesNotMatch(gameScript, /drawLaneWarning/);
  assert.doesNotMatch(gameScript, /rgba\(246,173,61,\.18\)|rgba\(255,231,126,\.14\)/);
});

test("虫虫攀枝的障碍物消失、撞碎和擦身而过不触发画面震动", () => {
  assert.doesNotMatch(gameScript, /shake=reducedMotion\?0:\.(?:68|55|2)/);
});

test("虫虫攀枝使用容易理解的惊险躲过文案", () => {
  assert.match(gameScript, /惊险躲过/);
  assert.doesNotMatch(gameScript, /贴边险避|贴着树瘤/);
});
