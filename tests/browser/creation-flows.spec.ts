import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/player-first?advanced=1");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/player-first?advanced=1");
});

test("现有游戏改造可以进入制作、编辑并撤销", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await expect(page.getByText("14 个成熟起点")).toBeVisible();
  await page.getByRole("button", { name: /换一个世界观/ }).click();
  await page.getByRole("button", { name: /生成制作规格/ }).click();
  await expect(page.getByRole("heading", { name: "滑动合成改造方案" })).toBeVisible();
  await page.getByRole("button", { name: /进入制作工作台/ }).click();
  await expect(page.getByRole("navigation", { name: "制作步骤" })).toBeVisible();
  await page.getByLabel("X 位置").fill("42");
  await expect(page.getByRole("button", { name: "撤销" })).toBeEnabled();
  await page.getByRole("button", { name: "撤销" }).click();
  await expect(page.getByLabel("X 位置")).toHaveValue("50");
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
  expect(errors).toEqual([]);
});

test("全新游戏组合有效机制后可以进入制作", async ({ page }) => {
  await page.getByRole("button", { name: /设计新游戏/ }).click();
  await page.getByLabel("一句完整的游戏描述").fill("控制一只小昆虫在树干上高速移动，收集露珠并躲开树脂，最后安全撤离");
  await page.getByRole("button", { name: /路线闪避/ }).click();
  await page.getByRole("button", { name: /收集后撤离/ }).click();
  await page.getByRole("button", { name: /生成制作规格/ }).click();
  await expect(page.getByRole("heading", { name: "新游戏机制方案" })).toBeVisible();
  await page.getByRole("button", { name: /进入制作工作台/ }).click();
  await expect(page.getByRole("heading", { name: "AI 原创新游戏" })).toBeVisible();
  await expect(page.getByText(/小昆虫在树干上高速移动/)).toBeVisible();
  await page.getByRole("button", { name: "设备预览" }).click();
  await expect(page.getByTitle("手机游戏预览")).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  expect(overflow).toBe(false);
});
