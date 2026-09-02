import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/player-first?game=00adee1e-4ae0-4f75-b377-bc3a6cd22ff4");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("普通玩家看到所选游戏和固定改造入口", async ({ page }) => {
  await expect(page.getByTitle("数织矩阵游戏画面")).toBeVisible();
  await expect(page.getByRole("button", { name: /改造这个游戏/ })).toBeVisible();
  await expect(page.getByText("14 个成熟起点")).toHaveCount(0);
  await page.getByRole("button", { name: /改造这个游戏/ }).click();
  await expect(page.getByRole("heading", { name: "哪里不满意？" })).toBeVisible();
  await page.getByRole("button", { name: "手机版按钮不要挡住画面" }).click();
  await page.getByRole("button", { name: "提交，开始改造" }).click();
  await expect(page.getByText("正在分析你的意见")).toBeVisible();
  await expect(page.getByText("需要你选一下")).toBeVisible({ timeout: 2500 });
});

test("手机版使用底部意见面板且页面不横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: /改造这个游戏/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  const box = await sheet.boundingBox();
  expect(box?.width).toBeLessThanOrEqual(390);
  expect(box?.y).toBeGreaterThan(70);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("开发过程中可以继续补充意见并保留上下文", async ({ page }) => {
  await page.getByRole("button", { name: /改造这个游戏/ }).click();
  await page.getByRole("button", { name: "操作反馈再明显一点" }).click();
  await page.getByRole("button", { name: "提交，开始改造" }).click();
  await expect(page.getByText("开发过程")).toBeVisible();
  await expect(page.getByRole("heading", { name: "这次改到什么程度？" })).toBeVisible({ timeout: 2500 });
  await page.getByRole("dialog").getByRole("button", { name: "先补充一条意见" }).click();
  await page.getByLabel("你的意见").fill("同时缩小角色碰撞范围");
  await page.getByRole("button", { name: "提交，开始改造" }).click();
  await expect(page.getByText("操作反馈再明显一点")).toBeVisible();
  await expect(page.getByText("同时缩小角色碰撞范围")).toBeVisible();
});
