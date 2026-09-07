import { expect, test } from "@playwright/test";
import { createDesignProfile } from "../../src/shared/contracts";

test.beforeEach(async ({ page }) => {
  // Never let regression tests reach paid API mutations.
  await page.route("**/api/**", route => route.request().method() === "GET"
    ? route.continue() : route.fulfill({ status: 409, json: { error: "测试写请求已拦截" } }));
  await page.goto("/create");
  await expect(page.getByRole("textbox", { name: "你想做一个什么游戏？" })).toBeVisible();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("实时方案返回不改动时复用，确认前不创建任务", async ({ page }) => {
  let previews = 0; let writes = 0;
  const profile = { ...createDesignProfile("puzzle", "standard"), playerFantasy: "在温暖花园中寻找成对花朵" };
  await page.route("**/api/design-preview", route => {
    previews++;
    return route.fulfill({ contentType: "application/x-ndjson", body: JSON.stringify({ type: "done", profile }) + "\n" });
  });
  page.on("request", request => { if (request.method() === "POST" && request.url().includes("/production-jobs")) writes++; });
  await expect(page.getByRole("heading", { name: "把想法，变成好玩的。" })).toBeVisible();
  await page.getByRole("textbox", { name: "你想做一个什么游戏？" }).fill("制作一个温暖花园的记忆翻牌游戏，找到全部配对即可过关，没有失败。");
  await page.getByRole("button", { name: /看看游戏方案/ }).click();
  await expect(page.getByText(profile.playerFantasy, { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "确认方案，开始制作" })).toBeEnabled();
  await page.getByRole("button", { name: "返回修改", exact: true }).click();
  await page.getByRole("button", { name: /看看游戏方案/ }).click();
  await expect(page.getByText(profile.playerFantasy, { exact: true })).toBeVisible();
  expect(previews).toBe(1); expect(writes).toBe(0);
});

test("确认一次进入服务端制作，刷新不重复提交且保留框架", async ({ page }) => {
  let submissions = 0; let taskId = "";
  const profile = createDesignProfile("puzzle", "standard");
  await page.route("**/api/design-preview", route => route.fulfill({ contentType: "application/x-ndjson", body: JSON.stringify({ type: "done", profile }) + "\n" }));
  await page.route("**/api/production-jobs**", route => {
    const request = route.request();
    if (request.method() === "POST") {
      submissions++; taskId = request.postDataJSON().requestId;
      return route.fulfill({ status: 202, json: { job: { id: taskId, status: "creating", error: null } } });
    }
    const job = taskId ? { id: taskId, status: "creating", error: null, events: [{ title: "正在检查玩法组合", createdAt: new Date().toISOString() }] } : null;
    return request.url().endsWith("/stream")
      ? route.fulfill({ contentType: "application/x-ndjson", body: JSON.stringify({ job, build: null }) + "\n" })
      : route.fulfill({ json: { job } });
  });
  await page.getByRole("textbox", { name: "你想做一个什么游戏？" }).fill("一个温暖植物园主题拼图，拖动拼块完成画面后庆祝，再进入下一关。");
  await page.getByRole("button", { name: /看看游戏方案/ }).click();
  await page.getByRole("button", { name: "确认方案，开始制作" }).click();
  await expect(page).toHaveURL(/production=/);
  await expect(page.getByRole("region", { name: "自动制作进度" })).toBeVisible();
  await expect(page.locator('header nav a[href="/"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /另建|重新制作/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("region", { name: "自动制作进度" })).toBeVisible();
  expect(submissions).toBe(1);
});

test("手机输入与现有游戏入口均不横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
  await expect(page.getByRole("textbox", { name: "你想做一个什么游戏？" })).toBeVisible();
  await noOverflow();
  await page.getByRole("button", { name: /改一个现有游戏/ }).click();
  await expect(page.getByRole("list", { name: "可以改造的游戏" })).toBeVisible();
  await page.getByRole("button", { name: /数织矩阵/ }).click();
  await expect(page.getByLabel("你想怎么改？")).toBeVisible();
  await noOverflow();
});
