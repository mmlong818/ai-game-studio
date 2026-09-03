import { createServer, type Server } from "node:http";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { extname, join, normalize, relative, resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { buildEngineDemoArtifact } from "../../examples/engine-playcanvas-demo/build";

// 引擎层最小闭环：一份手写 GameProjectV3 → 引擎层生成产物 → 真实浏览器里实体数量、行为生效、规则触发全部成立。
// 与纸境测试相同：产物写到临时目录，用带生产 CSP 的静态服务提供，浏览器里跑的是最终交付的 app.js。
const mimeTypes: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".json": "application/json; charset=utf-8" };
const csp = "default-src 'self'; img-src 'self' data:; media-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'";

let root = "";
let server: Server | null = null;
let origin = "";
let expectedEntities = 0;

test.beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "studio-engine-demo-spec-"));
  const build = buildEngineDemoArtifact(root);
  expectedEntities = build.plan.entities.length;
  server = createServer((request, response) => {
    const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const file = resolve(root, normalize(pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1))));
    if (relative(root, file).startsWith("..") || !existsSync(file) || !statSync(file).isFile()) { response.writeHead(404); response.end(); return; }
    response.writeHead(200, { "Content-Type": mimeTypes[extname(file)] ?? "application/octet-stream", "Content-Security-Policy": csp });
    response.end(readFileSync(file));
  });
  await new Promise<void>((done) => server!.listen(0, "127.0.0.1", () => done()));
  origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
});

test.afterAll(async () => {
  await new Promise<void>((done) => (server ? server.close(() => done()) : done()));
  const safeRoot = resolve(root);
  if (safeRoot && safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
});

async function openGame(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try { await page.goto(`${origin}/?probe=1`, { waitUntil: "domcontentloaded" }); }
  catch (error) { if (!String(error).includes("interrupted by another navigation")) throw error; await page.goto(`${origin}/?probe=1`, { waitUntil: "domcontentloaded" }); }
  await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 15_000 });
  return errors;
}
const debugState = (page: Page) => page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
const control = (page: Page, action: string) => page.evaluate((a) => (window as any).__GAME_DEBUG__.control(a), action);

test("GameProjectV3 经引擎层生成实体树：webgl 实例逐一成为实体，dom 对象被记入 skipped", async ({ page }) => {
  const errors = await openGame(page);
  await expect(page.locator("canvas#game-canvas")).toHaveCount(1);
  const state = await debugState(page);
  expect(state.mode).toBe("engine-demo");
  expect(state.engine).toBe("playcanvas");
  expect(state.entityCount).toBe(expectedEntities);
  expect(state.entityCount).toBe(34);
  expect(state.entityIds).toContain("INSTANCE-PLAYER");
  expect(state.skipped).toEqual([expect.objectContaining({ instanceId: "INSTANCE-HUD", objectId: "OBJECT-HUD", renderer: "dom" })]);
  expect(state.stats.triangles).toBeGreaterThan(500);
  expect(state.stats.byRole).toEqual({ background: 28, player: 1, collectible: 3, helper: 1, hazard: 1 });
  expect(state.gridCells).toBe(25);
  expect(state.unknownBehaviors).toEqual([]);
  expect(state.unknownRuleTypes).toEqual([]);
  expect(state.behaviors).toHaveLength(34);
  expect(state.renderCount).toBeGreaterThan(0);
  expect(await page.locator('[data-key="jump"]').count()).toBe(1);
  expect(errors).toEqual([]);
});

test("行为生效：网格行走者按抽象动作走格、越界被拒；压板被踩后切换；节拍障碍随拍巡逻", async ({ page }) => {
  const errors = await openGame(page);
  await page.getByRole("button", { name: "翻开这一页" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-game-state", "playing");
  const start = await debugState(page);
  expect(start.player.cell).toEqual({ x: -2, z: 2 });
  // 越界：西侧没有纸台，行走者拒绝并记 blocked。
  expect(await control(page, "W")).toBe(false);
  expect((await debugState(page)).player).toEqual(expect.objectContaining({ cell: { x: -2, z: 2 }, blocked: 1 }));
  // 向北一格踩到压板：pressure-plate toggle → active，trigger 事件入总线。
  expect(await control(page, "N")).toBe(true);
  await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState().behaviors.find((b: any) => b.moduleId === "engine.pressure-plate").state.active === true, undefined, { timeout: 5_000 });
  const onPlate = await debugState(page);
  expect(onPlate.player.cell).toEqual({ x: -2, z: 1 });
  expect(onPlate.recentEvents).toContain("trigger");
  // 键盘也走同一条输入抽象。
  await page.locator("#game-canvas").focus();
  await page.keyboard.press("ArrowDown");
  await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState().player.cell.z === 2, undefined, { timeout: 3_000 });
  // 节拍障碍：加快节拍后纸浪离开起点并沿路径巡逻。
  await page.evaluate(() => (window as any).__GAME_DEBUG__.setBeatMs(60));
  await page.waitForFunction(() => { const wave = (window as any).__GAME_DEBUG__.getState().behaviors.find((b: any) => b.moduleId === "engine.beat-mover"); return wave.state.beats >= 2 && wave.state.cell.x !== -2; }, undefined, { timeout: 8_000 });
  const wave = (await debugState(page)).behaviors.find((b: any) => b.moduleId === "engine.beat-mover");
  expect(wave.state.cell.z).toBe(0);
  expect([-1, 0]).toContain(wave.state.cell.x);
  expect(errors).toEqual([]);
});

test("规则触发：拾取行为发出 collision → 规则桥累加变量并反馈 → 集齐三颗星规则把状态切到 won", async ({ page }) => {
  const errors = await openGame(page);
  await page.getByRole("button", { name: "翻开这一页" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-game-state", "playing");
  for (let step = 1; step <= 3; step += 1) {
    expect(await control(page, "E")).toBe(true);
    await page.waitForFunction((count) => (window as any).__GAME_DEBUG__.getState().variables["VARIABLE-STARS"] === count, step, { timeout: 5_000 });
  }
  const finished = await debugState(page);
  expect(finished.triggeredRuleIds.filter((id: string) => id === "RULE-COLLECT-STAR")).toHaveLength(3);
  expect(finished.triggeredRuleIds).toContain("RULE-ALL-STARS");
  expect(finished.feedback.map((entry: { type: string }) => entry.type)).toEqual(["collect", "collect", "collect", "victory"]);
  expect(finished.gameState).toBe("won");
  expect(finished.behaviors.filter((b: any) => b.moduleId === "engine.pickup").every((b: any) => b.state.collected)).toBe(true);
  await expect(page.locator("body")).toHaveAttribute("data-game-state", "won");
  await expect(page.locator("#result-card")).toBeVisible();
  await expect(page.locator("#star-count")).toHaveText("3 / 3");
  expect(errors).toEqual([]);
});
