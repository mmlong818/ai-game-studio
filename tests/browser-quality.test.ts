import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { chromium } from "playwright";
import { BrowserQualityTimeoutError, browserQualityAvailable, collectImageRenderingViolations, collectSpritePresentationFailures, collectSpriteSheetRuntimeFailures, collectSpriteSheetRuntimeObservations, inspectEndlessNaturalAction, inspectGameInBrowser, inspectGeneratedGameInBrowser, installImageRenderingProbe, requireBrowserExecutable } from "../src/server/browser-quality";
import type { GeneratedBlueprint } from "../src/shared/generated-blueprint";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";
import { ArtifactValidationFailure } from "../src/server/generation-budget";
import { applyDeterministicArtifactRepair } from "../src/server/deterministic-artifact-repair";

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

function writeEndlessBrowserFixture(root: string, observable: boolean) {
  const campaign = { mode: "endless", failurePolicy: "forbidden", levelCount: 0, milestones: [], difficultyKeys: [], rationale: "自由消除，没有最终胜负。" };
  writeFileSync(join(root, "game-manifest.json"), JSON.stringify({ generatedCampaign: campaign, runtimeTarget: "web-2d", levelProgression: { levelCount: 0 } }));
  writeFileSync(join(root, "index.html"), '<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="./styles.css"><body data-game-state="idle"><button id="start">开始</button><button id="restart">重开</button><div id="score" data-score>得分 0</div><div id="board" data-game-board role="grid"><button role="gridcell" data-game-action aria-label="三颗红宝石，可消除">◆ ◆ ◆</button></div><canvas id="game-canvas" width="240" height="240"></canvas><script src="./app.js"></script>');
  writeFileSync(join(root, "styles.css"), "html,body{margin:0;overflow-x:hidden}button{width:88px;height:48px}#board{width:240px;height:80px}canvas{display:block;width:240px;height:240px}");
  writeFileSync(join(root, "app.js"), `let moves=0;const action=document.querySelector('[data-game-action]'),score=document.querySelector('#score');const setState=s=>{document.body.dataset.gameState=s;dispatchEvent(new CustomEvent('game:state-change',{detail:{state:s}}))};const reset=()=>{moves=0;score.textContent='得分 0';action.dataset.boardValue='0';setState('playing')};start.onclick=reset;restart.onclick=reset;action.onclick=()=>{if(document.body.dataset.gameState!=='playing')return;moves++;${observable ? "score.textContent='得分 '+moves*10;action.dataset.boardValue=String(moves)" : "void moves"}};if(new URLSearchParams(location.search).has('probe'))window.__GAME_DEBUG__={getState:()=>({mode:'endless',counter:moves,milestone:moves,mechanicsActive:['self-report-only']}),restart:reset};`);
  return campaign;
}

test("无限玩法以真实业务控件观察核心变化，并在重开后再次操作", { skip: !browserQualityAvailable() }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-endless-natural-"));
  try {
    const campaign = writeEndlessBrowserFixture(root, true);
    const result = await inspectGeneratedGameInBrowser(root, { expectedCampaign: campaign, totalTimeoutMs: 25_000 });
    const endless = result.checks.find(check => check.id === "ENDLESS-SAMPLED");
    const noFailure = result.checks.find(check => check.id === "NO-FAILURE-SAMPLED");
    assert.equal(endless?.status, "passed");
    assert.equal(noFailure?.status, "passed");
    assert.match(endless?.evidence ?? "", /重开前:玩家可见得分/);
    assert.match(endless?.evidence ?? "", /重开后:玩家可见得分/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("禁止失败的无限玩法一旦进入 lost 会把 no-failure 证据标为失败", { skip: !browserQualityAvailable() }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-endless-forbidden-loss-"));
  try {
    const campaign = writeEndlessBrowserFixture(root, true);
    writeFileSync(join(root, "app.js"), `${readFileSync(join(root, "app.js"), "utf8")}\naction.onclick=()=>setState('lost');\n`);
    await assert.rejects(inspectGeneratedGameInBrowser(root, { expectedCampaign: campaign, totalTimeoutMs: 25_000 }), /禁止的lost状态/);
    const report = JSON.parse(readFileSync(join(root, "_studio", "BROWSER_QUALITY_REPORT.json"), "utf8"));
    const noFailure = report.checks.find((check: { id: string }) => check.id === "NO-FAILURE-SAMPLED");
    assert.equal(noFailure?.status, "failed");
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("无限玩法不能只靠counter、milestone或mechanicsActive自报通过", { skip: !browserQualityAvailable() }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-endless-self-report-"));
  try {
    const campaign = writeEndlessBrowserFixture(root, false);
    await assert.rejects(inspectGeneratedGameInBrowser(root, { expectedCampaign: campaign, totalTimeoutMs: 25_000 }), /真实点击、拖拽或键盘操作没有产生稳定可见.*调试counter\/milestone/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("无限玩法无需分数，真实棋盘变化和重开后再操作也可验收", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("无限棋盘变化测试"), headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent('<body data-game-state="playing"><div id="board" data-game-board role="grid"><button role="gridcell" data-game-action data-value="0">移动宝石</button></div><button id="restart">重开</button><script>let move=0;const tile=document.querySelector("[data-game-action]");tile.onclick=()=>tile.dataset.value=String(++move);restart.onclick=()=>{move=0;tile.dataset.value="0"}</script>');
    assert.equal(await inspectEndlessNaturalAction(page), "棋盘DOM");
    await page.locator("#restart").click();
    assert.equal(await inspectEndlessNaturalAction(page), "棋盘DOM");
  } finally {
    await page.close();
    await browser.close();
  }
});

test("无限玩法等待启动后异步出现的真实棋盘动作", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("无限异步动作测试"), headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent('<body data-game-state="playing"><div data-game-board role="grid" data-value="0"></div><script>setTimeout(()=>{const action=document.createElement("button");action.dataset.gameAction="click";action.textContent="交换宝石";action.onclick=()=>action.parentElement.dataset.value="1";document.querySelector("[data-game-board]").append(action)},120)</script>');
    assert.equal(await inspectEndlessNaturalAction(page), "棋盘DOM");
  } finally {
    await page.close();
    await browser.close();
  }
});

test("无限玩法等待真实连锁变化结束后再确认稳定", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("无限连锁稳定测试"), headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent('<body data-game-state="playing"><div data-game-board role="grid"><button data-game-action="click">合法交换</button></div><div id="score" data-score>0</div><script>document.querySelector("button").onclick=()=>{setTimeout(()=>score.textContent="30",150);setTimeout(()=>score.textContent="90",600)}</script>');
    assert.equal(await inspectEndlessNaturalAction(page), "玩家可见得分");
    assert.equal(await page.locator("#score").textContent(), "90");
  } finally {
    await page.close();
    await browser.close();
  }
});

test("无限玩法有界等待后仍无动作标记时拒绝", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("无限无动作反例"), headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent('<body data-game-state="playing"><div data-game-board role="grid">棋盘</div>');
    await assert.rejects(inspectEndlessNaturalAction(page), /没有标记当前可执行的真实玩法控件 data-game-action/);
  } finally {
    await page.close();
    await browser.close();
  }
});

test("无限玩法按声明执行真实拖拽与键盘动作", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("无限声明动作测试"), headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent('<body data-game-state="playing"><div data-game-board role="grid"><button role="gridcell" data-game-action="drag" data-game-drag="right" data-position="0">可拖动宝石</button></div><script>const tile=document.querySelector("[data-game-action]");document.addEventListener("pointerup",()=>tile.dataset.position="1")</script>');
    assert.equal(await inspectEndlessNaturalAction(page), "棋盘DOM");
    await page.setContent('<body data-game-state="playing"><div data-game-board role="grid"><button role="gridcell" data-game-action="key:ArrowRight" data-position="0">键盘棋子</button></div><script>var keyTile=document.querySelector("[data-game-action]");keyTile.addEventListener("keydown",event=>{if(event.key==="ArrowRight")keyTile.dataset.position="1"})</script>');
    assert.equal(await inspectEndlessNaturalAction(page), "棋盘DOM");
  } finally {
    await page.close();
    await browser.close();
  }
});

test("动态操作覆盖层与Canvas的唯一共同容器可给出精确修复建议，补标后真实动作通过", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("无限棋盘根诊断测试"), headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    const source = '<body data-game-state="playing"><div id="stage" data-board-value="0"><canvas id="game-canvas" width="180" height="180"></canvas><div id="hint-layer"></div></div><script>var action=document.createElement("button");action.dataset.gameAction="click";action.textContent="交换相邻宝石";action.onclick=()=>stage.dataset.boardValue="1";document.querySelector("#hint-layer").append(action)</script>';
    await page.setContent(source);
    let repairHint: ArtifactValidationFailure["repairHint"] = undefined;
    await assert.rejects(inspectEndlessNaturalAction(page), error => {
      assert.match((error as Error).message, /都不在真实棋盘容器内/);
      assert.match((error as Error).message, /没有执行任何有效玩法操作/);
      assert.match((error as Error).message, /共同父容器.*data-game-board/);
      assert.doesNotMatch((error as Error).message, /操作没有产生/);
      assert.ok(error instanceof ArtifactValidationFailure);
      repairHint = error.repairHint;
      assert.deepEqual(repairHint, { kind: "add-game-board-marker", elementId: "stage", elementTag: "div" });
      return true;
    });
    assert.equal(await page.locator("#stage").getAttribute("data-board-value"), "0", "棋盘根外的标记不得被执行后假通过");
    const repaired = applyDeterministicArtifactRepair(source, repairHint);
    assert.ok(repaired);
    await page.setContent(repaired.html);
    assert.equal(await inspectEndlessNaturalAction(page), "棋盘DOM");
  } finally {
    await page.close();
    await browser.close();
  }
});

test("根容器、多Canvas或已有另一棋盘时不提供自动补标建议", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("无限棋盘根修复反例"), headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const cases = [
    '<body data-game-state="playing"><canvas width="180" height="180"></canvas><button data-game-action>交换宝石</button></body>',
    '<body data-game-state="playing"><div id="stage"><canvas width="180" height="180"></canvas><canvas width="180" height="180"></canvas><button data-game-action>交换宝石</button></div></body>',
    '<body data-game-state="playing"><div id="other" data-game-board>另一棋盘</div><div id="stage"><canvas width="180" height="180"></canvas><button data-game-action>交换宝石</button></div></body>',
  ];
  try {
    for (const source of cases) {
      await page.setContent(source);
      await assert.rejects(inspectEndlessNaturalAction(page), error => {
        assert.ok(error instanceof ArtifactValidationFailure);
        assert.equal(error.repairHint, undefined);
        return true;
      });
    }
  } finally {
    await page.close();
    await browser.close();
  }
});

test("WebGL无分数玩法以稳定浏览器渲染画面证明拖拽有效", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("无限WebGL动作测试"), headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent('<style>canvas{width:180px;height:180px}</style><body data-game-state="playing"><canvas id="game-canvas" data-game-action="drag" data-game-drag="right" width="180" height="180"></canvas><script>const canvas=document.querySelector("canvas"),gl=canvas.getContext("webgl");gl.clearColor(1,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT);canvas.addEventListener("pointermove",event=>{if(event.buttons){gl.clearColor(0,0,1,1);gl.clear(gl.COLOR_BUFFER_BIT)}})</script>');
    assert.equal(await inspectEndlessNaturalAction(page), "浏览器渲染画面");
  } finally {
    await page.close();
    await browser.close();
  }
});

test("DOM与WebGL拖拽无业务变化时不能靠动作或焦点样式通过", { skip: !browserQualityAvailable() }, async () => {
  const browser = await chromium.launch({ executablePath: requireBrowserExecutable("无限空拖拽反例"), headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  try {
    await page.setContent('<body data-game-state="playing"><div data-game-board role="grid"><button role="gridcell" data-game-action="drag" data-game-drag="right" data-position="0">没有移动的宝石</button></div>');
    await assert.rejects(inspectEndlessNaturalAction(page), /没有产生稳定可见/);
    await page.setContent('<style>canvas{width:180px;height:180px}canvas:focus{filter:hue-rotate(120deg);outline:12px solid lime}</style><body data-game-state="playing"><canvas tabindex="0" id="game-canvas" data-game-action="drag" width="180" height="180"></canvas><script>var noOpCanvas=document.querySelector("canvas"),noOpGl=noOpCanvas.getContext("webgl");noOpGl.clearColor(1,0,0,1);noOpGl.clear(noOpGl.COLOR_BUFFER_BIT)</script>');
    await assert.rejects(inspectEndlessNaturalAction(page), /没有产生稳定可见/);
    await page.setContent('<style>canvas{width:180px;height:180px}</style><body data-game-state="playing"><canvas id="game-canvas" data-game-action="click" width="180" height="180"></canvas><script>const animated=document.querySelector("canvas"),ctx=animated.getContext("2d");let frame=0;(function loop(){ctx.fillStyle=`hsl(${frame++%360} 80% 50%)`;ctx.fillRect(0,0,180,180);requestAnimationFrame(loop)})()</script>');
    await assert.rejects(inspectEndlessNaturalAction(page), /没有产生稳定可见/);
  } finally {
    await page.close();
    await browser.close();
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

    // 3D 贴图烘焙：位图只画到未挂载的离屏画布（占满 90%），不是玩法区显示尺寸，不得判超限。
    const textureBlueprint = { sprites: [{ file: "assets/block.png", role: "方块贴图", presentation: { region: "playfield", fit: "contain", logicalSize: { min: .08, max: .16 }, anchor: { x: .5, y: .5 }, safeInsetRatio: .06, minSourcePixels: 256 } }] } as unknown as GeneratedBlueprint;
    await page.evaluate(() => { const offscreen = document.createElement("canvas"); offscreen.width = 256; offscreen.height = 256; const context = offscreen.getContext("2d")!; const image = document.createElement("canvas"); image.width = 256; image.height = 256; (image as any).src = "/assets/block.png"; for (let index = 0; index < 4; index += 1) context.drawImage(image, 13, 13, 230, 230); });
    assert.deepEqual(await collectSpritePresentationFailures(page, textureBlueprint), []);
  } finally {
    await page.close();
    await browser.close();
  }
});
