import { expect, test } from "@playwright/test";

test("根网址默认进入游戏大厅，头部只保留游戏创作和我的项目", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".library-hero h1")).toBeVisible();
  await expect(page.locator('a[href="/create"]')).toBeVisible();
  await expect(page.locator('a[href="/projects"]')).toBeVisible();
  await expect(page.locator('.header-nav > a')).toHaveCount(2);
  await expect(page.locator('a[href="/player-first"]')).toHaveCount(0);
  await expect(page.locator(".remix-edge-button")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator('a[href="/create"]')).toBeVisible();
  await expect(page.locator('a[href="/projects"]')).toBeVisible();

  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "不要从空白提示词开始" })).toBeVisible();

  await page.goto("/projects");
  await expect(page.locator(".studio-home-heading h1")).toBeVisible();
});
