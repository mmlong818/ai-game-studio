import { expect, test } from "@playwright/test";

test("根网址保留原首页，边玩边改先选择具体游戏", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".studio-home-heading h1")).toBeVisible();
  await expect(page.locator('a[href="/games"]').first()).toBeVisible();
  await expect(page.locator('a[href="/player-first"]')).toBeVisible();
  await expect(page.locator(".remix-edge-button")).toHaveCount(0);

  await page.goto("/player-first");
  await expect(page.getByRole("heading", { name: "先选一个要改造的游戏" })).toBeVisible();
  await expect(page.locator(".remix-edge-button")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "去游戏大厅选择" })).toHaveAttribute("href", "/games");
});
