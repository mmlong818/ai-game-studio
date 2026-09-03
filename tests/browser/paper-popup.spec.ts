import { createServer, type Server } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, normalize, relative, resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { openTestDatabase } from "../../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../../src/server/game-artifact";
import { StudioRepository } from "../../src/server/studio-repository";

// 纸境 · 立体书迷宫（threeMode = popup）的真实浏览器验收：
// 产物由服务端生成器写入临时目录，再用与生产相同的 CSP 静态服务提供，浏览器里跑的是最终交付的 app.js。
const mimeTypes: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".wav": "audio/wav", ".json": "application/json; charset=utf-8" };
const csp = "default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'";

let root = "";
let server: Server | null = null;
let origin = "";

test.beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "studio-paper-popup-spec-"));
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  try {
    const project = await repository.create({ title: "纸境 · 立体书迷宫", idea: "立体书风格的 3D 旋转迷宫：把整本书转 90 度，桥和台阶才接得上，走到出口门通关。", dimensions: "3d", aspectRatio: "9:16" });
    expect(project.spec.threeMode).toBe("popup");
    writeDesignDocuments(root, project);
    writeGameArtifact(root, project);
  } finally {
    await database.close();
  }
  server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const file = resolve(root, normalize(pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1))));
    if (relative(root, file).startsWith("..") || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { "Content-Type": mimeTypes[extname(file)] ?? "application/octet-stream", "Content-Security-Policy": csp });
    response.end(readFileSync(file));
  });
  await new Promise<void>((done) => server!.listen(0, "127.0.0.1", () => done()));
  const address = server.address() as { port: number };
  origin = `http://127.0.0.1:${address.port}`;
});

test.afterAll(async () => {
  await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
  const safeRoot = resolve(root);
  if (safeRoot && safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
});

async function openGame(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/?probe=1`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 15_000 });
  return errors;
}

const debugState = (page: Page) => page.evaluate(() => (window as any).__GAME_DEBUG__.getState());

test("纸境 3D 产物在真实 WebGL 上下文中启动", async ({ page }) => {
  const errors = await openGame(page);
  await expect(page.locator("canvas#game-canvas")).toHaveCount(1);
  const webgl = await page.locator("canvas#game-canvas").evaluate((canvas) => {
    const context = (canvas as HTMLCanvasElement).getContext("webgl2") ?? (canvas as HTMLCanvasElement).getContext("webgl");
    return Boolean(context);
  });
  expect(webgl).toBe(true);
  const state = await debugState(page);
  expect(state.mode).toBe("popup");
  expect(state.popup.blueprintCount).toBe(20);
  expect(state.popup.chapterCount).toBe(4);
  expect(state.renderCount).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});

test("用键盘、转书键与滑动真实走完第 1 关：断桥只有转过角度后才接上", async ({ page }) => {
  const errors = await openGame(page);
  await page.getByRole("button", { name: "翻开这一页" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-game-state", "playing");
  await page.evaluate(() => (window as any).__GAME_DEBUG__.setBeatMs(90));
  const before = await debugState(page);
  const bridge = before.popup.links.find((link: { id: string }) => link.id === "b1");
  expect(bridge.open).toBe(false);
  expect(before.popup.visibleStarIndexes).not.toContain(before.popup.hiddenStarIndexes[0]);

  // 第 1 关求解序列：N N N N E E E cw E N（网格方向）。书未转动时屏幕方向与网格方向一致。
  const pressWalk = async (keys: string[]) => {
    for (const key of keys) {
      await page.keyboard.press(key);
      // 每一步都在下一拍被规则消费后再按下一键（软件渲染的浏览器节拍会更慢）。
      await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState().queueLength === 0, undefined, { timeout: 8_000 });
    }
  };
  await pressWalk(["ArrowUp", "ArrowUp", "ArrowUp", "ArrowUp"]);
  await pressWalk(["ArrowRight", "ArrowRight", "ArrowRight"]);
  await page.waitForFunction(() => { const model = (window as any).__GAME_DEBUG__.getState().model; return model.x === 3 && model.z === 1 && model.checkpoint === 0; }, undefined, { timeout: 8_000 });
  // 试图直接走过折起的桥：规则拒绝，人物停在原地。
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(320);
  const blocked = await debugState(page);
  expect(blocked.model.x).toBe(3);
  expect(blocked.blockedMoves).toBeGreaterThanOrEqual(1);
  expect(blocked.lastEvent).toBe("blocked:E");
  // 横向滑动把书顺时针转 90°，桥落下。
  const box = (await page.locator("#game-canvas").boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5, { steps: 6 });
  await page.mouse.up();
  const rotated = await debugState(page);
  expect(rotated.model.o).toBe(1);
  expect(rotated.popup.links.find((link: { id: string }) => link.id === "b1").open).toBe(true);
  // 书转了 90°：网格向东现在是屏幕向下，网格向北是屏幕向右。
  await pressWalk(["ArrowDown"]);
  await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState().model.x === 6, undefined, { timeout: 8_000 });
  await pressWalk(["ArrowRight"]);
  await page.waitForFunction(() => ["stage-complete", "won"].includes(document.body.dataset.gameState ?? ""), undefined, { timeout: 8_000 });
  const finished = await debugState(page);
  expect(finished.model.done).toBe(true);
  expect(finished.rotations).toBeGreaterThanOrEqual(1);
  await expect(page.locator("#result-title")).toContainText("抵达出口");
  expect(errors).toEqual([]);
});

test.describe("手机竖屏", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });

  test("手机竖屏无横向溢出，转书与跳跃按钮可触控且不小于 44px", async ({ page }) => {
  const errors = await openGame(page);
  await page.getByRole("button", { name: "翻开这一页" }).tap();
  await expect(page.locator("body")).toHaveAttribute("data-game-state", "playing");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  const shell = (await page.locator(".three-shell").boundingBox())!;
  expect(shell.width).toBeGreaterThanOrEqual(380);
  expect(shell.height).toBeGreaterThanOrEqual(600);
  for (const key of ["cw", "ccw", "jump"]) {
    const box = (await page.locator(`[data-key="${key}"]`).boundingBox())!;
    expect(box.width, key).toBeGreaterThanOrEqual(44);
    expect(box.height, key).toBeGreaterThanOrEqual(44);
  }
  const back = (await page.locator("#back-to-setup").boundingBox())!;
  expect(back.height).toBeGreaterThanOrEqual(44);
  await page.locator('[data-key="cw"]').tap();
  expect((await debugState(page)).model.o).toBe(1);
  await page.locator('[data-key="ccw"]').tap();
  expect((await debugState(page)).model.o).toBe(0);
  // 起点正前方是实心格，跳跃被规则拒绝并记录为 blocked：证明跳跃键真实进入了规则内核。
  await page.locator('[data-key="jump"]').tap();
  await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState().blockedMoves >= 1, undefined, { timeout: 3_000 });
  expect((await debugState(page)).lastEvent).toBe("blocked:N");
  expect(await page.locator(".three-start select").isVisible()).toBe(false);
  expect(errors).toEqual([]);
  });
});
