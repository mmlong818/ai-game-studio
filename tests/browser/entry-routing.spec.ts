import { expect, test } from "@playwright/test";

test("根网址恢复原造界首页，新流程只在独立入口出现", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".studio-home-heading h1")).toBeVisible();
  await expect(page.locator('a[href="/games"]').first()).toBeVisible();
  await expect(page.locator('a[href="/player-first"]')).toBeVisible();
  await expect(page.locator(".remix-edge-button")).toHaveCount(0);

  await page.goto("/player-first");
  await expect(page.locator(".remix-edge-button")).toBeVisible();
  await expect(page.getByRole("button", { name: "做一个新游戏" })).toBeVisible();
});
