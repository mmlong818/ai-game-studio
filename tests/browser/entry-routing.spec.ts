import { expect, test } from "@playwright/test";

test("根网址默认进入游戏大厅，头部提供游戏大厅、游戏创作、我的项目三个入口", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".library-hero h1")).toBeVisible();
  await expect(page.locator('.header-nav > a[href="/"]')).toBeVisible();
  await expect(page.locator('.header-nav > a[href="/create"]')).toBeVisible();
  await expect(page.locator('.header-nav > a[href="/projects"]')).toBeVisible();
  await expect(page.locator('.header-nav > a')).toHaveCount(3);
  await expect(page.locator('a[href="/player-first"]')).toHaveCount(0);
  await expect(page.locator(".remix-edge-button")).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator('.header-nav > a[href="/"]')).toBeVisible();
  await expect(page.locator('.header-nav > a[href="/create"]')).toBeVisible();
  await expect(page.locator('.header-nav > a[href="/projects"]')).toBeVisible();

  await page.goto("/create");
  await expect(page.getByRole("heading", { name: "把想法，变成好玩的。" })).toBeVisible();

  await page.goto("/projects");
  await expect(page.locator(".projects-heading h2")).toBeVisible();
});
