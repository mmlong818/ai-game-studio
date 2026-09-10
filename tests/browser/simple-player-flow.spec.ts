import { expect, test } from "@playwright/test";
import { createDesignProfile } from "../../src/shared/contracts";

const GAME_ID = "00adee1e-4ae0-4f75-b377-bc3a6cd22ff4"; // 数织矩阵

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", route => route.request().method() === "GET" ? route.continue()
    : route.fulfill({ status: 409, json: { error: "测试写请求已拦截" } }));
  await page.route("**/api/design-preview", route => route.fulfill({ contentType: "application/x-ndjson",
    body: JSON.stringify({ type: "done", profile: createDesignProfile("merge-2048", "standard") }) + "\n" }));
  await page.goto(`/player-first?game=${GAME_ID}`);
  await expect(page.getByTitle("数织矩阵游戏画面")).toBeVisible();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("普通玩家看到所选游戏和固定改造入口，入口直达创作页的改造步骤", async ({ page }) => {
  await expect(page.getByTitle("数织矩阵游戏画面")).toBeVisible();
  const entry = page.getByRole("link", { name: /改造这个游戏/ });
  await expect(entry).toBeVisible();
  await entry.click();
  await expect(page).toHaveURL(new RegExp(`/create\\?game=${GAME_ID}`));
  await expect(page.getByRole("heading", { name: "个性化「数织矩阵」" })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(1);
  await expect(page.getByRole("button", { name: /改一个现有游戏/ })).toHaveCount(0);
});

test("手机版从游戏进入改造步骤时页面不横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("link", { name: /改造这个游戏/ }).click();
  await expect(page.getByLabel("具体想调整什么？")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
});

test("从游戏进入后圈定范围并写一句话就能得到该游戏的个性化方案", async ({ page }) => {
  await page.getByRole("link", { name: /改造这个游戏/ }).click();
  await page.getByLabel("具体想调整什么？").fill("操作反馈再明显一点");
  await page.getByRole("button", { name: /开始制作/ }).click();
  await expect(page.getByRole("heading", { name: "数织矩阵个性化方案" })).toBeVisible();
  await expect(page.getByText("操作反馈再明显一点")).toBeVisible();
  await expect(page.getByText(/R[0-3] ·/)).toHaveCount(0);
});
