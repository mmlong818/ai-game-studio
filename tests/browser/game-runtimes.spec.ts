import { expect, test } from "@playwright/test";
import { buildGameSpec } from "../../src/domain/gameSpec";
import { generateRuntimeFiles } from "../../src/domain/runtimeGenerator";
import { INITIAL_DRAFT } from "../../src/domain/storage";

const pixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X2NDWQAAAABJRU5ErkJggg==";

const openRuntime = async (page: import("@playwright/test").Page, files: ReturnType<typeof generateRuntimeFiles>) => {
  const html = files["index.html"]
    .replace('<link rel="stylesheet" href="./styles.css" />', `<style>${files["styles.css"]}</style>`)
    .replace('<script type="module" src="./app.js"></script>', `<script>${files["app.js"]}</script>`);
  await page.setContent(html, { waitUntil: "load" });
};

const p2Spec = (mechanicId: string) => buildGameSpec({
  ...INITIAL_DRAFT,
  creationMode: "mechanic-composition",
  templateId: null,
  newGameBrief: `测试 ${mechanicId} 的完整玩法循环`,
  selectedMechanicIds: [mechanicId],
});

test("现有 2048 改造在真实浏览器完成一次合并", async ({ page }) => {
  const spec = buildGameSpec({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] });
  await openRuntime(page, generateRuntimeFiles(spec, { background: pixel, collectible: pixel }));
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#status")).toHaveText("合并成功");
  await expect(page.locator(".cell")).toHaveCount(16);
});

test("全新虫虫游戏在手机尺寸使用分层角色与四向操作", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const spec = buildGameSpec({
    ...INITIAL_DRAFT,
    creationMode: "mechanic-composition",
    templateId: null,
    newGameBrief: "控制昆虫高速爬树，收集露珠并躲开树脂后撤离",
    selectedMechanicIds: ["lane-dodge", "collect-escape"],
  });
  await openRuntime(page, generateRuntimeFiles(spec, {
    "NODE-BACKGROUND": pixel, "NODE-PLAYER": pixel, "NODE-HEAD": pixel,
    "NODE-LEGS": pixel, "NODE-TARGET": pixel, "NODE-OBSTACLE": pixel,
  }));
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.keyboard.press("ArrowUp");
  await expect(page.locator(".bug-head")).toHaveCount(1);
  await expect(page.locator(".bug-legs")).toHaveCount(1);
  await expect(page.locator("#status")).toHaveText("游戏中");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)).toBe(false);
});

test("有限 3D 模板能够创建真实 WebGL 上下文", async ({ page }) => {
  const spec = buildGameSpec({ ...INITIAL_DRAFT, templateId: "arena-3d", selectedSuggestionIds: ["arena-3d-world"] });
  await openRuntime(page, generateRuntimeFiles(spec, { background: pixel, player: pixel, collectible: pixel }));
  await expect(page.locator("canvas.webgl-layer")).toHaveCount(1);
  expect(await page.locator("canvas.webgl-layer").evaluate((canvas) => Boolean((canvas as HTMLCanvasElement).getContext("webgl")))).toBe(true);
});

test("经营玩法需要安排订单并完成三次真实交付", async ({ page }) => {
  await openRuntime(page, generateRuntimeFiles(p2Spec("queue-management"), { background: pixel, collectible: pixel }));
  await page.getByRole("button", { name: "开始游戏" }).click();
  for (let index = 0; index < 3; index += 1) {
    await page.getByRole("button", { name: "制作", exact: true }).click();
    await page.getByRole("button", { name: "交付", exact: true }).click();
  }
  await expect(page.locator("#status")).toHaveText("全部订单准时交付");
  await expect(page.locator(".p2-head")).toContainText("已交付 3/3");
});

test("叙事玩法的选择会改变状态并抵达分支结局", async ({ page }) => {
  await openRuntime(page, generateRuntimeFiles(p2Spec("chapter-branch"), { background: pixel }));
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.keyboard.press("1");
  await page.keyboard.press("1");
  await expect(page.locator("#status")).toHaveText("章节结果已保存");
  await expect(page.locator(".story-card")).toContainText("同行者结局");
});

test("卡牌玩法具有能量、连携、敌人回合和胜利结算", async ({ page }) => {
  await openRuntime(page, generateRuntimeFiles(p2Spec("deck-combo"), { background: pixel, obstacle: pixel }));
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.keyboard.press("1");
  await page.keyboard.press("2");
  await page.keyboard.press("1");
  await page.getByRole("button", { name: "结束回合" }).click();
  await page.keyboard.press("1");
  await page.keyboard.press("2");
  await expect(page.locator("#status")).toHaveText("连携成功，击败巨兽");
  await expect(page.locator(".enemy")).toContainText("♥ 0");
});

test("手柄等价输入玩法在没有手柄时仍可键盘和触控完成", async ({ page }) => {
  await openRuntime(page, generateRuntimeFiles(p2Spec("gamepad-control"), { background: pixel, player: pixel, collectible: pixel, obstacle: pixel }));
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#status")).toHaveText("冲刺完成");
  await expect(page.locator("#pad-state")).toContainText("键盘 / 触控");
});

test("空间解谜使用 WebGL 场景、旋转观察和有顺序的机关", async ({ page }) => {
  await openRuntime(page, generateRuntimeFiles(p2Spec("spatial-puzzle-3d"), { background: pixel }));
  await expect(page.locator("canvas")).toHaveCount(1);
  expect(await page.locator("canvas").evaluate((canvas) => Boolean((canvas as HTMLCanvasElement).getContext("webgl")))).toBe(true);
  await page.getByRole("button", { name: "开始游戏" }).click();
  await page.keyboard.press("E");
  await page.keyboard.press("2");
  await page.keyboard.press("1");
  await page.keyboard.press("3");
  await expect(page.locator("#status")).toHaveText("空间通路开启，抵达目标");
});

test("五类扩展玩法在手机竖屏都无横向溢出且主操作可触控", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const mechanicId of ["queue-management", "chapter-branch", "deck-combo", "gamepad-control", "spatial-puzzle-3d"]) {
    await page.goto("about:blank");
    await openRuntime(page, generateRuntimeFiles(p2Spec(mechanicId), { background: pixel, player: pixel, collectible: pixel, obstacle: pixel }));
    await page.getByRole("button", { name: "开始游戏" }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), mechanicId).toBe(true);
    expect(await page.locator("#game button").first().evaluate((button) => button.getBoundingClientRect().height), mechanicId).toBeGreaterThanOrEqual(44);
  }
});
