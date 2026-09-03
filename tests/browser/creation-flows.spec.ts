import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/create");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/create");
});

test("现有游戏改造：选图标、写一句话，即可进入制作、编辑并撤销", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  await expect(page.getByRole("heading", { name: "今天想做什么？" })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("button", { name: /改一个现有游戏/ }).click();
  await expect(page.getByRole("list", { name: "可以改造的游戏" })).toBeVisible();
  await page.getByRole("button", { name: /数织矩阵/ }).click();
  await expect(page.getByRole("heading", { name: "想怎么改「数织矩阵」？" })).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(1);
  await page.getByLabel("你想怎么改？").fill("换成海底世界的画风");
  await page.getByRole("button", { name: /开始制作/ }).click();
  await expect(page.getByRole("heading", { name: "数织矩阵改造方案" })).toBeVisible();
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

test("全新游戏：只写一段描述就可以进入制作", async ({ page }) => {
  await page.getByRole("button", { name: /做一个新游戏/ }).click();
  await expect(page.getByRole("textbox")).toHaveCount(1);
  await page.getByLabel("说说你想做的游戏").fill("控制一只小昆虫在树干上高速移动，收集露珠并躲开树脂，最后安全撤离");
  await expect(page.getByText(/会用这些已经验证过的玩法来搭/)).toBeVisible();
  await page.getByRole("button", { name: /开始制作/ }).click();
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

test("创作页在手机尺寸上每一步都不横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const noOverflow = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)).toBe(false);
  await noOverflow();
  await page.getByRole("button", { name: /改一个现有游戏/ }).click();
  await expect(page.getByRole("list", { name: "可以改造的游戏" })).toBeVisible();
  await noOverflow();
  await page.getByRole("button", { name: /数织矩阵/ }).click();
  await expect(page.getByLabel("你想怎么改？")).toBeVisible();
  await noOverflow();
});
