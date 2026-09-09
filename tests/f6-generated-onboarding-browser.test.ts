import assert from "node:assert/strict";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { generateGameSpec, type ProjectDetail } from "../src/shared/contracts.js";
import { createGameDesignContractForLegacyProject } from "../src/shared/game-design-contract/from-legacy.js";
import { writeGeneratedArtifact } from "../src/server/game-generator.js";
import { browserQualityAvailable, closeServer, requireBrowserExecutable, startArtifactServer } from "../src/server/browser-quality.js";
import { generatedDesignHtml } from "./generated-design-fixture.js";

function fixtureProject() {
  const baseSpec = generateGameSpec({ idea: "守夜人在灯塔上转动光束驱散雾兽。", template: "generated", dimensions: "2d" });
  const designContract = createGameDesignContractForLegacyProject({ projectId: "f6-safe", title: "F6 安全教学夹具", idea: baseSpec.vision, createdAt: "2026-09-09T00:00:00.000Z", spec: baseSpec });
  return { id: "f6-safe", title: "F6 安全教学夹具", version: { id: "v1" }, spec: { ...baseSpec, designContract } } as unknown as ProjectDetail;
}

test("F6 生成游戏只显示一个教学表面，终态隐藏且重开重看恢复", { timeout: 90_000, skip: !browserQualityAvailable() }, async () => {
  const evidenceRoot = mkdtempSync(join(tmpdir(), "forge-f6-onboarding-"));
  let server: Awaited<ReturnType<typeof startArtifactServer>> | undefined;
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    const html = generatedDesignHtml("mechanic-1-completed")
      .replace("<canvas id=\"game-canvas\"></canvas>", '<canvas id="game-canvas"></canvas><dialog id="tutorial-dialog" aria-modal="true" data-tutorial-dialog><h2>Safe fixture tutorial</h2><button id="close-tutorial" type="button">Close tutorial</button></dialog>')
      .replace('document.querySelector("#start").addEventListener("click",()=>{applyLevel(currentLevel);setState("playing");});', 'document.querySelector("#start").addEventListener("click",()=>{applyLevel(currentLevel);setState("playing");document.querySelector("#tutorial-dialog").showModal();document.querySelector("#close-tutorial").focus();});document.querySelector("#close-tutorial").addEventListener("click",()=>document.querySelector("#tutorial-dialog").close());');
    writeGeneratedArtifact(evidenceRoot, fixtureProject(), { html, designNotes: "本地安全教学浮层夹具", rounds: 1 });
    server = await startArtifactServer(evidenceRoot);
    browser = await chromium.launch({ executablePath: requireBrowserExecutable("F6 生成游戏教学浮层验收") });
    for (const viewport of [{ name: "phone", width: 390, height: 844 }, { name: "desktop", width: 1280, height: 844 }]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.name === "phone" });
      const page = await context.newPage();
      try {
        await page.goto(server.url + "?probe=1");
        await page.locator("#start").click();
        const dialog = page.getByRole("dialog");
        const dock = page.locator(".forge-onboarding");
        await dialog.waitFor({ state: "visible" });
        await page.waitForFunction(() => (document.querySelector(".forge-onboarding") as HTMLElement)?.hidden === true);
        assert.equal(await dock.getAttribute("aria-hidden"), "true");
        assert.equal(await dock.evaluate((node: HTMLElement) => node.inert), true);
        assert.equal(await page.evaluate(() => document.activeElement?.closest(".forge-onboarding") !== null), false);
        await page.screenshot({ path: `${evidenceRoot}/${viewport.name}-dialog-only.png`, fullPage: true });

        await dialog.getByRole("button", { name: "Close tutorial" }).press("Enter");
        await dock.waitFor({ state: "visible" });
        assert.equal(await dock.getAttribute("aria-hidden"), null);
        await page.screenshot({ path: `${evidenceRoot}/${viewport.name}-dock-restored.png`, fullPage: true });

        await page.evaluate(() => (window as any).__GAME_DEBUG__.forceWin());
        await page.waitForFunction(() => (document.querySelector(".forge-onboarding") as HTMLElement)?.hidden === true);
        assert.equal(await dock.getAttribute("aria-hidden"), "true");
        await page.screenshot({ path: `${evidenceRoot}/${viewport.name}-won-hidden.png`, fullPage: true });

        await page.evaluate(() => (window as any).__GAME_DEBUG__.restart());
        await dock.waitFor({ state: "visible" });
        await page.evaluate(() => {
          document.body.dataset.gameState = "stage-complete";
          dispatchEvent(new CustomEvent("game:state-change", { detail: { state: "stage-complete" } }));
        });
        await page.waitForFunction(() => (document.querySelector(".forge-onboarding") as HTMLElement)?.hidden === true);
        assert.equal(await dock.getAttribute("aria-hidden"), "true");
        await page.evaluate(() => {
          document.body.dataset.gameState = "playing";
          dispatchEvent(new CustomEvent("game:state-change", { detail: { state: "playing" } }));
        });
        await dock.waitFor({ state: "visible" });
        const completion = await page.evaluate(() => {
          const before = (window as any).__FORGE_ONBOARDING__.getState();
          (window as any).__GAME_DEBUG__.performOnboardingStep();
          return { before, after: (window as any).__FORGE_ONBOARDING__.getState() };
        });
        assert.equal(completion.after.status, "completed", `正常教学动作必须先完成平台状态：${JSON.stringify(completion)}`);
        await page.reload();
        await page.locator("#start").click();
        await page.getByRole("dialog").waitFor({ state: "visible" });
        await page.waitForFunction(() => (document.querySelector(".forge-onboarding") as HTMLElement)?.hidden === true);
        await page.getByRole("button", { name: "Close tutorial" }).click();
        await page.locator(".forge-onboarding").waitFor({ state: "visible" });
        assert.equal(await page.evaluate(() => (window as any).__FORGE_ONBOARDING__.getState().status), "completed", "刷新后保留完成状态，但自带教学 dialog 出现时仍不能显示第二层 dock");
        await page.getByRole("button", { name: "重看" }).click();
        assert.equal(await page.evaluate(() => (window as any).__FORGE_ONBOARDING__.getState().status), "active");
        assert.equal(await dock.isVisible(), true);
        await page.evaluate(() => (window as any).__GAME_DEBUG__.forceLose("安全夹具失败"));
        await page.waitForFunction(() => (document.querySelector(".forge-onboarding") as HTMLElement)?.hidden === true);
        assert.equal(await page.locator(".forge-assistance").isVisible(), true, "终态只隐藏教学 dock，不能删除失败帮助");
      } finally { await context.close(); }
    }
  } finally {
    try {
      if (browser) await browser.close();
      if (server) await closeServer(server.server);
    } finally {
      const resolvedRoot = realpathSync(evidenceRoot);
      const resolvedTemp = realpathSync(tmpdir());
      const relativeToTemp = relative(resolvedTemp, resolvedRoot);
      assert.ok(relativeToTemp && !relativeToTemp.startsWith("..") && !relativeToTemp.includes(":"), "只清理本测试在系统临时目录创建的唯一根目录");
      rmSync(resolvedRoot, { recursive: true, force: true });
    }
  }
});
