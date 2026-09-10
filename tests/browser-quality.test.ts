import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { browserQualityAvailable, collectImageRenderingViolations, collectSpriteSheetRuntimeFailures, inspectGameInBrowser, installImageRenderingProbe, requireBrowserExecutable } from "../src/server/browser-quality";
import type { GeneratedBlueprint } from "../src/shared/generated-blueprint";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

test("真实浏览器验收会覆盖五档画幅、玩法状态和三阶段截图", { skip: !browserQualityAvailable() }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-browser-quality-"));
  try {
    const project = await repository.create({
      title: "浏览器验收样本",
      idea: "做一个构成主义俄罗斯方块，完成十条消行后获胜并支持触控。",
      template: "tetris",
      dimensions: "2d",
      aspectRatio: "9:16",
    });
    writeDesignDocuments(artifactRoot, project);
    writeGameArtifact(artifactRoot, project);

    const result = await inspectGameInBrowser(artifactRoot);

    assert.equal(result.checks.length, 3);
    assert.ok(result.checks.every((check) => check.status === "passed"));
    assert.equal(result.screenshotPaths.length, 7);
    assert.ok(result.screenshotPaths.every((path) => existsSync(path)));
    assert.equal(existsSync(join(artifactRoot, "_studio", "BROWSER_QUALITY_REPORT.json")), true);
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("星梦对决固定游戏接入相同的状态协议和浏览器验收", { skip: !browserQualityAvailable() }, async () => {
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-golden-quality-"));
  try {
    await cp(resolve("fixtures", "star-dream-duel"), artifactRoot, { recursive: true });
    const result = await inspectGameInBrowser(artifactRoot);
    assert.ok(result.checks.every((check) => check.status === "passed"));
    assert.equal(result.screenshotPaths.length, 7);
  } finally {
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("图像渲染探针拒绝拉伸并接受 contain、裁切图集与 DPR 等比显示", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("图像比例测试"), headless: true });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  try {
    await installImageRenderingProbe(page);
    await page.goto(`data:text/html,${encodeURIComponent(`<!doctype html><canvas id="game" width="200" height="100" style="width:200px;height:100px"></canvas><script>const source=document.createElement('canvas');source.width=100;source.height=50;document.querySelector('#game').getContext('2d').drawImage(source,0,0,100,100)</script>`)}`);
    const stretched = await collectImageRenderingViolations(page);
    assert.ok(stretched.some(({ kind }) => kind === "canvas-draw"), JSON.stringify(stretched));

    await page.goto(`data:text/html,${encodeURIComponent(`<!doctype html><canvas id="game" width="400" height="200" style="width:200px;height:100px"></canvas><script>const source=document.createElement('canvas');source.width=400;source.height=200;const context=document.querySelector('#game').getContext('2d');context.drawImage(source,0,0,200,100);context.drawImage(source,0,0,100,100,0,0,50,50)</script>`)}`);
    const proportional = await collectImageRenderingViolations(page);
    assert.deepEqual(proportional.filter(({ kind }) => kind !== "text-clip"), []);

    await page.goto(`data:text/html,${encodeURIComponent(`<!doctype html><canvas id="game" width="128" height="64"></canvas><script>const sheet=document.createElement('canvas');sheet.width=256;sheet.height=64;sheet.src='/assets/hero.png';const context=document.querySelector('#game').getContext('2d');context.drawImage(sheet,0,0,64,64,0,0,64,64);context.drawImage(sheet,64,0,64,64,64,0,64,64)</script>`)}`);
    const blueprint = { sprites: [{ file: "assets/hero.png", role: "主角", animation: { frameWidth: 64, frameHeight: 64, columns: 4, rows: 1, frameCount: 4, anchor: { x: 32, y: 56 }, clips: [{ id: "idle", startFrame: 0, frameCount: 4, fps: 6, loop: true }] } }] } as unknown as GeneratedBlueprint;
    assert.deepEqual(await collectSpriteSheetRuntimeFailures(page, blueprint), []);
  } finally {
    await page.close();
    await browser.close();
  }
});
