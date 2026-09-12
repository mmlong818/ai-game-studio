import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { BrowserQualityTimeoutError, browserQualityAvailable, collectImageRenderingViolations, collectSpritePresentationFailures, collectSpriteSheetRuntimeFailures, collectSpriteSheetRuntimeObservations, inspectGameInBrowser, inspectGeneratedGameInBrowser, installImageRenderingProbe, requireBrowserExecutable } from "../src/server/browser-quality";
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

test("生成游戏整体验收超时会写明确失败并清理挂起浏览器", { skip: !browserQualityAvailable() }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-generated-timeout-"));
  try {
    writeFileSync(join(root, "game-manifest.json"), JSON.stringify({ generatedCampaign: null, runtimeTarget: "web-2d", levelProgression: { levelCount: 1 } }));
    writeFileSync(join(root, "index.html"), '<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="./styles.css"><body data-game-state="idle"><button id="start">开始</button><button id="restart">重开</button><canvas id="game-canvas" width="240" height="240"></canvas><script src="./app.js"></script>');
    writeFileSync(join(root, "styles.css"), "button{width:88px;height:48px}");
    writeFileSync(join(root, "app.js"), 'const setState=s=>{document.body.dataset.gameState=s;dispatchEvent(new CustomEvent("game:state-change",{detail:{state:s}}))};start.onclick=()=>{while(true){}};restart.onclick=()=>setState("playing");if(new URLSearchParams(location.search).has("probe"))window.__GAME_DEBUG__={getState:()=>({state:document.body.dataset.gameState,mechanicsActive:["demo"]}),restart:()=>setState("playing"),forceWin:()=>setState("won"),forceLose:()=>setState("lost")};');
    const started = Date.now();
    await assert.rejects(inspectGeneratedGameInBrowser(root, { expectedCampaign: null, totalTimeoutMs: 700 }), (error: unknown) => error instanceof BrowserQualityTimeoutError && error.code === "BROWSER_TIMEOUT" && /整体验收超时/.test(error.message));
    assert.ok(Date.now() - started < 5_000, "挂起页面必须被浏览器关闭打断");
    const report = JSON.parse(readFileSync(join(root, "_studio", "BROWSER_QUALITY_REPORT.json"), "utf8"));
    assert.equal(report.timedOut, true);
    assert.match(report.failures.join(" "), /总时限/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("单局demo浏览器验收不要求多关递进探针", { skip: !browserQualityAvailable() }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-single-demo-"));
  try {
    writeFileSync(join(root, "game-manifest.json"), JSON.stringify({ generatedCampaign: null, runtimeTarget: "web-2d", levelProgression: { levelCount: 1 } }));
    writeFileSync(join(root, "index.html"), '<!doctype html><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="./styles.css"><body data-game-state="idle"><button id="start">开始</button><button id="restart">重开</button><canvas id="game-canvas" width="240" height="240"></canvas><script src="./app.js"></script>');
    writeFileSync(join(root, "styles.css"), "html,body{margin:0;overflow-x:hidden}button{width:88px;height:48px}canvas{display:block;width:240px;height:240px}");
    writeFileSync(join(root, "app.js"), 'const setState=s=>{document.body.dataset.gameState=s;dispatchEvent(new CustomEvent("game:state-change",{detail:{state:s}}))};start.onclick=()=>setState("playing");restart.onclick=()=>setState("playing");if(new URLSearchParams(location.search).has("probe"))window.__GAME_DEBUG__={getState:()=>({state:document.body.dataset.gameState}),restart:()=>setState("playing"),forceWin:()=>setState("won"),forceLose:()=>setState("lost")};');
    const result = await inspectGeneratedGameInBrowser(root, { expectedCampaign: null, totalTimeoutMs: 15_000 });
    const progression = result.checks.find(check => check.id === "PROGRESSION-RUNTIME");
    assert.equal(progression?.status, "passed");
    assert.match(progression?.label ?? "", /单局 demo/);
  } finally { rmSync(root, { recursive: true, force: true }); }
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

    await page.goto(`data:text/html,${encodeURIComponent("<!doctype html><canvas></canvas>")}`);
    assert.match((await collectSpriteSheetRuntimeFailures(page, blueprint, { files: ["assets/hero.png"] }))[0] ?? "", /没有通过九参数/,
      "常态动画在 playing 采样期完全不绘制仍是硬失败");
    const notObserved = await collectSpriteSheetRuntimeObservations(page, blueprint, { files: ["assets/hero.png"], missing: "not-observed" });
    assert.deepEqual(notObserved.failures, [], "事件型动画在事件未发生时不应被当作时钟故障");
    assert.match(notObserved.notObserved[0] ?? "", /事件未触发，未验证/, "未触发必须写入报告而不能伪装成已通过");

    const effectBlueprint = { sprites: [{ file: "assets/spark.png", role: "火花", animation: { frameWidth: 32, frameHeight: 32, columns: 4, rows: 1, frameCount: 4, anchor: { x: 16, y: 16 }, clips: [{ id: "effect", startFrame: 0, frameCount: 4, fps: 12, loop: false }] } }] } as unknown as GeneratedBlueprint;
    await page.goto(`data:text/html,${encodeURIComponent(`<!doctype html><canvas id="game"></canvas><script>const sheet=document.createElement('canvas');sheet.width=128;sheet.height=32;sheet.src='/assets/spark.png';document.querySelector('#game').getContext('2d').drawImage(sheet,0,0,32,32,0,0,32,32)</script>`)}`);
    assert.match((await collectSpriteSheetRuntimeFailures(page, effectBlueprint, { files: ["assets/spark.png"], missing: "not-observed" }))[0] ?? "", /只绘制了单帧/,
      "事件已经发生并被观察时仍须证明帧推进");

    const presentationBlueprint = { sprites: [{ file: "assets/hero.png", role: "主角", presentation: { region: "playfield", fit: "contain", logicalSize: { min: .05, max: .2 }, anchor: { x: .5, y: .5 }, safeInsetRatio: .08, minSourcePixels: 128 } }] } as unknown as GeneratedBlueprint;
    await page.evaluate(() => { const canvas = document.querySelector("canvas")!; const context = canvas.getContext("2d")!; const sheet = document.createElement("canvas"); sheet.width = 256; sheet.height = 64; (sheet as any).src = "/assets/hero.png"; context.drawImage(sheet, 0, 0, 64, 64, 0, 0, 64, 64); context.drawImage(sheet, 64, 0, 64, 64, 0, 0, 64, 64); context.drawImage(sheet, 128, 0, 64, 64, 0, 0, 64, 64); });
    assert.ok((await collectSpritePresentationFailures(page, presentationBlueprint)).some(failure => failure.includes("超过合同上限")));
  } finally {
    await page.close();
    await browser.close();
  }
});
