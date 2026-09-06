import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { describe, expect, it } from "vitest";
import { POCKET_WORKSHOP_LEVELS } from "../shared/game-design-knowledge/pocket-workshop-golden.js";
import { browserQualityAvailable, closeServer, requireBrowserExecutable, startArtifactServer } from "./browser-quality.js";
import { generatePocketWorkshopPrototype, inspectPocketWorkshopPrototype } from "./pocket-workshop-prototype.js";

describe("掌心工坊候选原型", () => {
  it("归档设计、资源、二十关与非正式状态，且没有内联脚本", () => {
    const root = mkdtempSync(join(tmpdir(), "pocket-workshop-"));
    try {
      expect(generatePocketWorkshopPrototype(root).levelCount).toBe(20);
      expect(existsSync(join(root, "_studio", "GAME_DESIGN_CONTRACT.json"))).toBe(true);
      expect(existsSync(join(root, "_studio", "ASSET_REQUIREMENTS.json"))).toBe(true);
      expect(JSON.parse(readFileSync(join(root, "_studio", "PROTOTYPE_STATUS.json"), "utf8"))).toMatchObject({ official: false, status: "prototype-required" });
      expect(readFileSync(join(root, "index.html"), "utf8")).not.toContain("<script>");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it.runIf(browserQualityAvailable()).each([{ width: 1280, height: 800 }, { width: 390, height: 844 }])("$width×$height 可见控件完成教学与确定性试机", async ({ width, height }) => {
    const root = mkdtempSync(join(tmpdir(), "pocket-workshop-browser-"));
    generatePocketWorkshopPrototype(root);
    const { server, url } = await startArtifactServer(root);
    const browser = await chromium.launch({ executablePath: requireBrowserExecutable("掌心工坊验收"), headless: true });
    try {
      const page = await browser.newPage({ viewport: { width, height } }); const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message)); page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
      await page.goto(url, { waitUntil: "domcontentloaded" });
      await page.locator("#skip-help").click();
      await expect(page.locator("#guide").isHidden()).resolves.toBe(true);
      await page.locator("#replay-help").click();
      await expect(page.locator("#guide").isVisible()).resolves.toBe(true);
      const solveVisibleLevel = async (level: (typeof POCKET_WORKSHOP_LEVELS)[number]) => {
        for (const placement of level.solution) {
          await page.locator(`[data-part="${placement.partId}"]`).click();
          for (let turn = 0; turn < placement.rotation; turn += 1) await page.locator("#rotate").click();
          await page.locator(`[data-row="${placement.row}"][data-column="${placement.column}"]`).click();
        }
        await page.locator("#resolve").click();
        expect(await page.locator("#result-title").textContent()).toBe("回路点亮");
      };
      const level = POCKET_WORKSHOP_LEVELS[0]!;
      await solveVisibleLevel(level);
      const first = await page.evaluate(() => (window as any).__POCKET_WORKSHOP__.getState().resolution);
      await page.locator("#resolve").click();
      const second = await page.evaluate(() => (window as any).__POCKET_WORKSHOP__.getState().resolution);
      expect(second).toEqual(first);
      await page.evaluate(() => localStorage.setItem("pocket-unlocked", "9"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator('[aria-label^="第 9关"]').click();
      await solveVisibleLevel(POCKET_WORKSHOP_LEVELS[8]!);
      expect((await page.evaluate(() => (window as any).__POCKET_WORKSHOP__.getState().resolution)).won).toBe(true);
      const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: [...document.querySelectorAll("button:not(:disabled)")].filter(button => (button as HTMLElement).offsetParent !== null).filter(button => { const box = button.getBoundingClientRect(); return box.width < 44 || box.height < 44; }).length, guideStored: localStorage.getItem("pocket-guide"), unlocked: localStorage.getItem("pocket-unlocked") }));
      expect(layout).toMatchObject({ overflow: 0, small: 0, guideStored: "3", unlocked: "10" }); expect(errors).toEqual([]);
    } finally { await browser.close(); await closeServer(server); rmSync(root, { recursive: true, force: true }); }
  }, 30_000);

  it.runIf(browserQualityAvailable())("专用自动验收同时产生五项探针、双端证据和截图", async () => {
    const root = mkdtempSync(join(tmpdir(), "pocket-workshop-inspection-"));
    try {
      generatePocketWorkshopPrototype(root);
      const signals = ["part-inspected", "synergy-previewed", "resolution-explained", "multi-cell-rotated", "failure-help-escalated"];
      const result = await inspectPocketWorkshopPrototype(root, signals, "http://127.0.0.1:4313/research-prototype/golden/");
      expect(result.probeRuns).toEqual(signals.map((signalId) => expect.objectContaining({ signalId, status: "passed" })));
      expect(result.browserRuns).toEqual([
        expect.objectContaining({ deviceClass: "desktop", status: "passed", interactionCompleted: true, consoleErrorCount: 0, accessibilityViolationCount: 0 }),
        expect.objectContaining({ deviceClass: "mobile", status: "passed", interactionCompleted: true, consoleErrorCount: 0, accessibilityViolationCount: 0 }),
      ]);
      expect(result.screenshots).toHaveLength(2);
      expect(existsSync(join(root, "_studio", "AUTOMATIC_EVALUATION.json"))).toBe(true);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 30_000);
});
