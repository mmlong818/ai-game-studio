import { createServer, type Server } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, relative, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import type { QualityCheck } from "../shared/contracts.js";
import { gameContentSecurityPolicy } from "./static-files.js";

const viewports = [
  { name: "phone-small", width: 320, height: 568 },
  { name: "phone-standard", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop-wide", width: 1280, height: 720 },
  { name: "desktop-large", width: 1440, height: 900 },
] as const;

const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".wav": "audio/wav",
};

export type BrowserQualityResult = {
  checks: QualityCheck[];
  screenshotPaths: string[];
};

export type CampaignQualityResult = {
  initialLevel: number;
  unlockedAfterFirstWin: number;
  restoredUnlockedLevel: number;
  masteryStarsAfterFirstWin: number;
  restoredMasteryStars: number;
  tierOneRuntime: unknown;
  tierFiveRuntime: unknown;
  finalState: string;
};

export type StageCRealtimeTemplate = "space-shooter" | "platformer" | "snake" | "breakout";
export type StageDClassicTemplate = "tetris" | "merge-2048" | "klotski" | "puzzle" | "block-place" | "polyomino-fit";
export type StageETemplate = "region-logic" | "maze" | "mahjong-roguelite";

export type StageCQualityResult = {
  template: StageCRealtimeTemplate;
  checks: string[];
  evidence: Record<string, unknown>;
};

export type StageDQualityResult = {
  template: StageDClassicTemplate;
  checks: string[];
  evidence: Record<string, unknown>;
};

export type StageEQualityResult = {
  template: StageETemplate | "star-dream-duel";
  completedRuns: number;
  failedRuns: number;
  evidence: Record<string, unknown>;
};

export type StageF3DQualityResult = {
  mode: "collector" | "arena";
  completedRuns: number;
  failedRuns: number;
  evidence: Record<string, unknown>;
};

export type ShooterLongRunResult = {
  durationMs: number;
  pointerMoves: number;
  maxPointerGapMs: number;
  frameCount: number;
  maxFrameGapMs: number;
  finalState: string;
};

function findBrowserExecutable() {
  const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const candidates = [
    configured,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((value): value is string => Boolean(value));
  return candidates.find((candidate) => existsSync(candidate));
}

export function browserQualityAvailable() {
  return Boolean(findBrowserExecutable());
}

function startArtifactServer(root: string) {
  const safeRoot = resolve(root);
  const server = createServer((request, response) => {
    const rawPath = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
    const requested = rawPath === "/" ? "index.html" : decodeURIComponent(rawPath.slice(1));
    const filePath = resolve(safeRoot, normalize(requested));
    if (relative(safeRoot, filePath).startsWith("..") || !existsSync(filePath) || !statSync(filePath).isFile()) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    // 验收服务器必须发与生产交付源相同的 CSP,否则"内联脚本被生产 CSP 拦截"这类缺陷会在验收期漏网。
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      ...(process.env.FORGE_AUDIT_NO_CSP === "1" ? {} : { "Content-Security-Policy": gameContentSecurityPolicy() }),
    });
    response.end(readFileSync(filePath));
  });
  return new Promise<{ server: Server; url: string }>((resolveServer, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("无法启动版本验收服务器。"));
      resolveServer({ server, url: `http://127.0.0.1:${address.port}/` });
    });
  });
}

function closeServer(server: Server) {
  return new Promise<void>((resolveClose) => server.close(() => resolveClose()));
}

// 生成物的调试探针（window.__GAME_DEBUG__）只在带 `probe` 查询参数时挂载，
// 避免真实玩家打开控制台就能一键作弊。自动验收在这里统一追加该参数。
function probeUrl(target: string) {
  const withProbe = new URL(target);
  withProbe.searchParams.set("probe", "1");
  return withProbe.toString();
}

async function collectLayout(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const start = document.querySelector<HTMLElement>("#start, #setup-start");
    const surface = document.querySelector<HTMLElement>("#game-canvas, #arena, .game, #board");
    const rect = surface?.getBoundingClientRect();
    const startRect = start?.getBoundingClientRect();
    const controls = [...document.querySelectorAll<HTMLElement>("button, [role=button]")]
      .filter((element) => {
        if (element.closest("[inert]")) return false;
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return box.width > 0 && box.height > 0 && style.visibility !== "hidden" && style.display !== "none";
      });
    const undersized = controls
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.width < 44 || box.height < 44;
      })
      .map((element) => `${element.id || element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName}`)
      .slice(0, 5);
    const overflowElements = [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        return box.right > root.clientWidth + 1 || box.left < -1;
      })
      .map((element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : element.classList.length ? `.${[...element.classList].join(".")}` : ""}`)
      .slice(0, 8);
    return {
      overflow: root.scrollWidth - root.clientWidth,
      overflowElements,
      surfaceVisible: Boolean(rect && rect.width >= 120 && rect.height >= 120),
      surfaceRect: rect ? { width: Math.round(rect.width), height: Math.round(rect.height) } : null,
      startVisible: Boolean(startRect && startRect.width >= 44 && startRect.height >= 44 && startRect.top >= 0 && startRect.bottom <= innerHeight),
      undersized,
      disabledGameplayControls: [...document.querySelectorAll<HTMLButtonElement>("[data-control], [data-key]")]
        .every((button) => button.disabled),
    };
  });
}

async function takeScreenshot(page: Page, target: string, screenshotPaths: string[]) {
  await page.screenshot({ path: target, fullPage: true });
  screenshotPaths.push(target);
}

async function runInteractionProbe(page: Page) {
  const initialState = await page.locator("body").getAttribute("data-game-state");
  const illegalState = await page.evaluate(() => {
    const body = document.body;
    const before = body.dataset.gameState ?? null;
    const target = document.querySelector<HTMLElement>("[data-control], [data-key], #target, #game-canvas, #board .tile");
    target?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 91, clientX: 1, clientY: 1 }));
    target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return { before, after: body.dataset.gameState ?? null };
  });
  if (illegalState.before !== illegalState.after) {
    throw new Error(`开局前非法输入改变了状态：${illegalState.before ?? "空"} → ${illegalState.after ?? "空"}。`);
  }
  if (initialState !== "playing") await page.locator("#start:visible, #setup-start:visible").first().click();
  await page.waitForTimeout(120);
  await page.evaluate(() => {
    const debug = (window as Window & { __GAME_DEBUG__?: { getState?: () => any; chooseFirstRoute?: () => void } }).__GAME_DEBUG__;
    if (debug?.getState?.()?.runtime?.awaitingRoute) debug.chooseFirstRoute?.();
  });
  await page.waitForTimeout(120);
  const playingState = await page.locator("body").getAttribute("data-game-state");
  if (playingState !== "playing") throw new Error(`点击开始后状态不是 playing，而是 ${playingState ?? "空"}。`);

  const usedDebugAction = await page.evaluate(async () => {
    const debug = (window as Window & { __GAME_DEBUG__?: { legalAction?: () => void | Promise<void> } }).__GAME_DEBUG__;
    if (!debug?.legalAction) return false;
    await debug.legalAction();
    return true;
  });
  const target = page.locator("#target:visible");
  const control = page.locator("[data-control]:not([disabled]):visible, [data-key]:not([disabled]):visible").first();
  if (usedDebugAction) await page.waitForTimeout(120);
  else if (await target.count()) await target.click();
  else if (await control.count()) await control.click();
  else await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(90);

  const actionState = await page.locator("body").getAttribute("data-game-state");
  if (actionState !== "playing") throw new Error(`执行合法动作后状态异常：${actionState ?? "空"}。`);
}

async function inspectMobilePlayFlow(page: Page) {
  const playing = await page.evaluate(() => {
    const surface = document.querySelector<HTMLElement>("#game-canvas, #arena, .game, #board");
    const rect = surface?.getBoundingClientRect();
    const back = document.querySelector<HTMLElement>("#back-to-setup");
    const backRect = back?.getBoundingClientRect();
    const backStyle = back ? getComputedStyle(back) : null;
    const maximumPortraitHeight = Math.min(innerHeight, innerWidth * 16 / 9);
    const visibleSetupControls = [...document.querySelectorAll<HTMLElement>(".game-overlay select, .game-overlay input, .game-overlay [data-tetris-mode], .game-overlay [data-snake-difficulty], .start-card select, .start-card input, .three-start select, .three-start input, #sound-toggle")]
      .filter((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      });
    return {
      surfaceHeight: Math.round(rect?.height ?? 0),
      maximumPortraitHeight: Math.round(maximumPortraitHeight),
      surfaceUtilization: rect ? rect.height / Math.max(1, maximumPortraitHeight) : 0,
      verticalOverflow: document.documentElement.scrollHeight - innerHeight,
      settingsVisible: visibleSetupControls.length > 0,
      backVisible: Boolean(backRect && backRect.width >= 44 && backRect.height >= 44 && backStyle?.display !== "none" && backStyle?.visibility !== "hidden"),
    };
  });
  await page.locator("#back-to-setup:visible").click();
  await page.waitForFunction(() => document.body.dataset.gameState === "idle", undefined, { timeout: 2_000 });
  const setup = await page.evaluate(() => {
    const start = document.querySelector<HTMLElement>("#start, #setup-start");
    const rect = start?.getBoundingClientRect();
    const settings = [...document.querySelectorAll<HTMLElement>(".game-overlay select, .game-overlay input, .game-overlay [data-tetris-mode], .game-overlay [data-snake-difficulty], .start-card select, .start-card input, .three-start select, .three-start input, #sound-toggle")];
    return {
      startVisible: Boolean(rect && rect.width >= 44 && rect.height >= 44),
      settingsVisible: settings.some((element) => {
        const box = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
      }),
    };
  });
  await page.locator("#start:visible, #setup-start:visible").first().click();
  await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 2_000 });
  return { playing, setup };
}

export async function inspectCampaignInBrowser(root: string): Promise<CampaignQualityResult> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error("没有找到可用于自动验收的 Chrome 或 Edge。可设置 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH。 ");
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400 && new URL(response.url()).pathname !== "/favicon.ico") runtimeErrors.push(`HTTP ${response.status()}: ${response.url()}`);
    });

    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    const initial = await page.evaluate(() => {
      const debug = (window as Window & { __GAME_DEBUG__?: { getState?: () => any } }).__GAME_DEBUG__;
      const campaignSelectors = [...document.querySelectorAll<HTMLSelectElement>("select[data-campaign-level]")];
      const options = [...document.querySelectorAll<HTMLOptionElement>("select[data-campaign-level] option")];
      return {
        title: document.title,
        selectorCount: campaignSelectors.length,
        selectorOptionCounts: campaignSelectors.map((select) => select.options.length),
        optionCount: options.length,
        enabledValues: options.filter((option) => !option.disabled).map((option) => Number(option.value)),
        hasMasteryContract: Boolean(document.querySelector("[data-mastery-mission]")),
        state: debug?.getState?.(),
      };
    });
    if (initial.optionCount !== 20) throw new Error(`${initial.title} 的关卡选择器不是 20 关：检测到 ${initial.selectorCount} 个选择器，选项数 ${initial.selectorOptionCounts.join("+")}。`);
    if (initial.enabledValues.length !== 1 || initial.enabledValues[0] !== 0) throw new Error(`初始解锁范围错误：${initial.enabledValues.join(",")}。`);
    if (initial.state?.campaign?.total !== 20 || initial.state?.campaign?.level?.number !== 1) throw new Error("运行时没有从第 1 / 20 关开始。 ");

    await page.locator("#start:visible, #setup-start:visible").first().click();
    await page.evaluate(() => {
      const debug = (window as Window & { __GAME_DEBUG__?: { getState?: () => any; chooseFirstRoute?: () => void } }).__GAME_DEBUG__;
      if (debug?.getState?.()?.runtime?.awaitingRoute) debug.chooseFirstRoute?.();
    });
    await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 4_000 });
    await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { forceWin?: () => void } }).__GAME_DEBUG__?.forceWin?.());
    await page.waitForFunction(() => document.body.dataset.gameState === "stage-complete", undefined, { timeout: 4_000 });
    const afterFirstWin = await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { getState?: () => any } }).__GAME_DEBUG__?.getState?.());
    if (afterFirstWin?.campaign?.level?.number !== 2 || afterFirstWin?.campaign?.maxUnlocked < 2) throw new Error("首关胜利后没有解锁并切换到第 2 关。 ");
    if (initial.hasMasteryContract && (afterFirstWin?.campaign?.stars < 1 || Object.keys(afterFirstWin?.campaign?.mastery ?? {}).length < 1)) throw new Error("首关胜利后没有记录商业级星章评价。 ");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    const restored = await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { getState?: () => any } }).__GAME_DEBUG__?.getState?.());
    if (restored?.campaign?.maxUnlocked < 2) throw new Error("刷新页面后，第 2 关解锁进度没有保留。 ");
    if (initial.hasMasteryContract && (restored?.campaign?.stars < 1 || Object.keys(restored?.campaign?.mastery ?? {}).length < 1)) throw new Error("刷新页面后，星章最佳评价没有保留。 ");

    const tierRuntime = await page.evaluate(() => {
      const debug = (window as Window & { __GAME_DEBUG__?: { setLevel?: (level: number) => void; restart?: () => void; getState?: () => any } }).__GAME_DEBUG__;
      debug?.setLevel?.(1);
      debug?.restart?.();
      if (debug?.getState?.()?.runtime?.awaitingRoute) (debug as typeof debug & { chooseFirstRoute?: () => void }).chooseFirstRoute?.();
      const tierOne = debug?.getState?.();
      debug?.setLevel?.(17);
      debug?.restart?.();
      if (debug?.getState?.()?.runtime?.awaitingRoute) (debug as typeof debug & { chooseFirstRoute?: () => void }).chooseFirstRoute?.();
      const tierFive = debug?.getState?.();
      return { tierOne, tierFive };
    });
    const tierOneRuntime = tierRuntime.tierOne?.runtime ?? { goal: tierRuntime.tierOne?.goal, requiredFragments: tierRuntime.tierOne?.requiredFragments };
    const tierFiveRuntime = tierRuntime.tierFive?.runtime ?? { goal: tierRuntime.tierFive?.goal, requiredFragments: tierRuntime.tierFive?.requiredFragments };
    if (JSON.stringify(tierOneRuntime) === JSON.stringify(tierFiveRuntime)) throw new Error("第 1 档与第 5 档运行参数完全相同，没有形成渐进难度。 ");

    await page.evaluate(() => {
      const debug = (window as Window & { __GAME_DEBUG__?: { setLevel?: (level: number) => void; restart?: () => void; forceWin?: () => void } }).__GAME_DEBUG__;
      debug?.setLevel?.(20);
      debug?.restart?.();
      debug?.forceWin?.();
    });
    await page.waitForFunction(() => document.body.dataset.gameState === "won", undefined, { timeout: 4_000 });
    const finalState = await page.locator("body").getAttribute("data-game-state");
    if (runtimeErrors.length) throw new Error(`二十关浏览器验收出现错误：${runtimeErrors.join(" | ")}`);

    const result = {
      initialLevel: initial.state.campaign.level.number,
      unlockedAfterFirstWin: afterFirstWin.campaign.maxUnlocked,
      restoredUnlockedLevel: restored.campaign.maxUnlocked,
      masteryStarsAfterFirstWin: Number(afterFirstWin.campaign.stars) || 0,
      restoredMasteryStars: Number(restored.campaign.stars) || 0,
      tierOneRuntime,
      tierFiveRuntime,
      finalState: finalState ?? "",
    };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "CAMPAIGN_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

async function stageEDebugState(page: Page) {
  return page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { getState?: () => any } }).__GAME_DEBUG__?.getState?.());
}

async function stageEDebugAction(page: Page, action: string) {
  return page.evaluate((name) => {
    const debug = (window as Window & { __GAME_DEBUG__?: Record<string, (() => unknown) | undefined> }).__GAME_DEBUG__;
    return debug?.[name]?.();
  }, action);
}

export async function inspectStageEInBrowser(root: string, template: StageETemplate): Promise<StageEQualityResult> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error("没有找到可用于阶段 E 验收的 Chrome 或 Edge。 ");
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  const runtimeErrors: string[] = [];
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(message.text()); });
    page.on("response", (response) => {
      const pathname = new URL(response.url()).pathname;
      if (response.status() >= 400 && pathname !== "/favicon.ico") runtimeErrors.push(`HTTP ${response.status()}: ${pathname}`);
    });
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    if (template === "maze") await page.locator("[data-maze-shortest]").check();
    if (template === "mahjong-roguelite") await page.locator("[data-mahjong-mode]").selectOption("daily");
    await page.locator("#start").click();
    let routeOffer: any = null;
    if (template === "mahjong-roguelite") {
      await page.waitForFunction(() => document.body.dataset.gameState === "stage-complete", undefined, { timeout: 4_000 });
      routeOffer = await stageEDebugState(page);
      if (!routeOffer?.runtime?.awaitingRoute || routeOffer.runtime.routeChoices.length !== 3) throw new Error("月港雀旅开局没有提供三选一路线。 ");
      await stageEDebugAction(page, "chooseFirstRoute");
    }
    await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 4_000 });
    const initial = await stageEDebugState(page);
    let restored: any = null;
    let advanced: any = null;
    let selectedCue: any = null;
    if (template === "region-logic") {
      await stageEDebugAction(page, "probeDeadEnd");
      const reasoningConflict = await stageEDebugState(page);
      if (reasoningConflict?.runtime?.lastConflictType !== "dead-end" || reasoningConflict.runtime.errors !== 1) throw new Error("星灵巡格没有识别会让剩余棋盘无解的错误落子。 ");
      advanced = await page.evaluate(() => {
        const debug = (window as any).__GAME_DEBUG__;
        debug.setLevel(17);
        debug.restart();
        return debug.getState();
      });
      await page.evaluate(() => {
        const debug = (window as any).__GAME_DEBUG__;
        debug.setLevel(1);
        debug.restart();
      });
    }
    if (template === "mahjong-roguelite") {
      await stageEDebugAction(page, "selectFirstFree");
      selectedCue = await stageEDebugState(page);
      await stageEDebugAction(page, "selectFirstFree");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("[data-mahjong-mode]").selectOption("daily");
      await page.locator("#start").click();
      restored = await stageEDebugState(page);
      if (!restored?.runtime?.restored) throw new Error("月港雀旅刷新后没有恢复长局。 ");
    }
    const completeAction = template === "region-logic" ? "solveRegion" : template === "maze" ? "solveMaze" : "completeMahjongStage";
    const failAction = template === "region-logic" ? "failRegion" : template === "maze" ? "failMazeChallenge" : "failMahjong";
    for (let run = 0; run < 3; run += 1) {
      if (template === "mahjong-roguelite") {
        for (let stage = 0; stage < 3; stage += 1) {
          await stageEDebugAction(page, completeAction);
          await page.waitForTimeout(40);
          if (stage < 2) {
            const state = await stageEDebugState(page);
            if (!state?.runtime?.awaitingRelic || state.runtime.relicChoices.length !== 3) throw new Error("月港雀旅航段结算没有提供三选一遗物。 ");
            await stageEDebugAction(page, "chooseFirstRelic");
            const routeState = await stageEDebugState(page);
            if (!routeState?.runtime?.awaitingRoute || routeState.runtime.routeChoices.length !== 3) throw new Error("月港雀旅遗物结算后没有进入路线选择。 ");
            await stageEDebugAction(page, routeState.runtime.routeChoices.some((route: { id: string }) => route.id === "elite") ? "chooseEliteRoute" : "chooseFirstRoute");
          }
        }
      } else {
        await stageEDebugAction(page, completeAction);
      }
      await page.waitForTimeout(60);
      if (run < 2) await stageEDebugAction(page, "restart");
    }
    let completedState = await stageEDebugState(page);
    for (let run = 0; run < 2; run += 1) {
      await stageEDebugAction(page, "restart");
      await stageEDebugAction(page, failAction);
      await page.waitForTimeout(40);
      if (await page.locator("body").getAttribute("data-game-state") !== "lost") throw new Error(`${template} 的失败分支没有进入 lost。`);
    }
    if (template === "region-logic" && initial?.runtime?.uniqueSolutions !== 1) throw new Error("星灵巡格题面没有唯一解。 ");
    if (template === "region-logic" && (initial.runtime.size < 6 || initial.runtime.fixedStars !== 0 || initial.runtime.hints > 2)) throw new Error(`星灵巡格标准首关仍然给出过多答案或使用过小棋盘：${JSON.stringify(initial.runtime)}`);
    if (template === "region-logic" && (initial.runtime.searchNodes < initial.runtime.complexityTarget.minSearchNodes || initial.runtime.branchPoints < initial.runtime.complexityTarget.minBranchPoints)) throw new Error("星灵巡格首关推理链仍然过短。 ");
    if (template === "region-logic" && (advanced?.runtime?.size < 8 || advanced.runtime.hints !== 0 || advanced.runtime.directAnswerEnabled)) throw new Error("星灵巡格后期关没有形成 8×8、零提示的进阶难度。 ");
    if (template === "region-logic" && (advanced.runtime.searchNodes < advanced.runtime.complexityTarget.minSearchNodes || advanced.runtime.branchPoints < advanced.runtime.complexityTarget.minBranchPoints)) throw new Error("星灵巡格后期关推理复杂度不足。 ");
    if (template === "maze" && (!initial?.runtime?.challenge || initial.runtime.optimalSteps < 1)) throw new Error("苔径迷庭最短径挑战没有生效。 ");
    if (template === "maze" && (initial.runtime.loopCount < 5 || initial.runtime.junctionCount < 3 || initial.runtime.alternativeSegments < 3 || !initial.runtime.hasMultipleRoutes)) throw new Error("苔径迷庭仍然只有单一路线，没有形成环路与有效岔口。 ");
    if (template === "mahjong-roguelite" && (initial?.runtime?.relicPoolSize ?? 0) < 12) throw new Error("月港雀旅遗物池不足 12 件。 ");
    if (template === "mahjong-roguelite" && (routeOffer?.runtime?.routePoolSize ?? 0) < 5) throw new Error("月港雀旅路线池不足 5 条。 ");
    if (template === "mahjong-roguelite" && (initial?.runtime?.visualCueVersion ?? 0) < 3) throw new Error("月港雀旅没有用固定几何区分自由牌、被压牌、选中牌和配对目标。 ");
    if (template === "mahjong-roguelite" && ((initial?.runtime?.layerCueVersion ?? 0) < 1 || initial?.runtime?.selectionChangesGeometry !== false)) throw new Error("月港雀旅没有把牌堆层级与选中反馈分离。 ");
    if (template === "mahjong-roguelite" && ((initial?.runtime?.assetCompositionVersion ?? 0) < 2 || initial?.runtime?.tileBodySource !== "canvas-single-layer" || initial?.runtime?.spriteContent !== "transparent-motif-only")) throw new Error("月港雀旅仍把牌坯烘焙在图案位图中，存在双重厚度风险。 ");
    if (template === "mahjong-roguelite" && (initial?.runtime?.boardLayout?.boardWidth ?? 0) < 600) throw new Error("月港雀旅牌桌仍未充分利用手机横向空间。 ");
    if (template === "mahjong-roguelite" && ((initial?.runtime?.freeCount ?? 0) < 2 || (initial?.runtime?.blockedCount ?? 0) < 1)) throw new Error("月港雀旅开局没有同时呈现可选牌与被压牌。 ");
    if (template === "mahjong-roguelite" && (!selectedCue?.runtime?.selectedId || (selectedCue.runtime.compatibleFreeCount ?? 0) < 1)) throw new Error("月港雀旅选牌后没有形成可辨认的配对目标。 ");
    if (template === "mahjong-roguelite") {
      const selectedId = selectedCue?.runtime?.selectedId;
      const beforeRect = initial?.runtime?.hitAreas?.find((area: { id: string }) => area.id === selectedId)?.rect;
      const afterRect = selectedCue?.runtime?.hitAreas?.find((area: { id: string }) => area.id === selectedId)?.rect;
      if (!beforeRect || !afterRect || JSON.stringify(beforeRect) !== JSON.stringify(afterRect)) throw new Error(`月港雀旅点击选牌后改变了牌的位置或尺寸：${JSON.stringify({ beforeRect, afterRect })}`);
    }
    if (template === "mahjong-roguelite" && ((completedState?.runtime?.routeHistory?.length ?? 0) < 3 || !completedState?.runtime?.ending)) throw new Error("月港雀旅完成长局后没有路线历史或差异化结局。 ");
    if (runtimeErrors.length) throw new Error(`阶段 E 浏览器错误：${runtimeErrors.join(" | ")}`);
    const result: StageEQualityResult = { template, completedRuns: 3, failedRuns: 2, evidence: { routeOffer: routeOffer?.runtime ?? null, initial: initial?.runtime, selectedCue: selectedCue?.runtime ?? null, advanced: advanced?.runtime ?? null, restored: restored?.runtime ?? null, completed: completedState?.runtime ?? null } };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "STAGE_E_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectStarDreamStageEInBrowser(root: string): Promise<StageEQualityResult> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error("没有找到可用于星梦对决阶段 E 验收的 Chrome 或 Edge。 ");
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  const runtimeErrors: string[] = [];
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    page.on("response", (response) => {
      const pathname = new URL(response.url()).pathname;
      if (response.status() >= 400 && pathname !== "/favicon.ico") runtimeErrors.push(`HTTP ${response.status()}: ${pathname}`);
    });
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    await page.locator("#ai-difficulty").selectOption("challenging");
    await page.locator("#setup-start").click();
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll<HTMLImageElement>(".tile__face img")];
      return images.length === 64 && images.every((image) => image.complete && image.naturalWidth === 512 && image.naturalHeight === 512);
    }, undefined, { timeout: 8_000 });
    const tileArt = await page.evaluate(() => {
      const images = [...document.querySelectorAll<HTMLImageElement>(".tile__face img")];
      return {
        count: images.length,
        uniqueSources: new Set(images.map((image) => new URL(image.src).pathname)).size,
        minimumDisplaySize: Math.min(...images.map((image) => Math.min(image.getBoundingClientRect().width, image.getBoundingClientRect().height))),
      };
    });
    if (tileArt.uniqueSources !== 6 || tileArt.minimumDisplaySize < 36) throw new Error(`星梦对决位图卡面数量或显示尺寸不达标：${JSON.stringify(tileArt)}。`);
    const initial = await stageEDebugState(page);
    const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
    if (overflow > 1) throw new Error(`星梦对决 1280×720 仍纵向溢出 ${overflow}px。`);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator("#ai-difficulty").selectOption("challenging");
    await page.locator("#setup-start").click();
    const restored = await stageEDebugState(page);
    if (!restored?.runtime?.recoverable) throw new Error("星梦对决刷新后没有恢复对局断点。 ");
    for (let run = 0; run < 3; run += 1) {
      await stageEDebugAction(page, "forceWin");
      if (run < 2) await stageEDebugAction(page, "restart");
    }
    for (let run = 0; run < 2; run += 1) {
      await stageEDebugAction(page, "restart");
      await stageEDebugAction(page, "forceLose");
      if (await page.locator("body").getAttribute("data-game-state") !== "lost") throw new Error("星梦对决失败分支没有进入 lost。 ");
    }
    if (runtimeErrors.length) throw new Error(`星梦对决浏览器错误：${runtimeErrors.join(" | ")}`);
    const result: StageEQualityResult = { template: "star-dream-duel", completedRuns: 3, failedRuns: 2, evidence: { initial: initial?.runtime, restored: restored?.runtime, overflow, tileArt } };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "STAGE_E_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

async function stageCDebugState(page: Page) {
  return page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { getState?: () => any } }).__GAME_DEBUG__?.getState?.());
}

async function stageCDebugAction(page: Page, action: string) {
  return page.evaluate((actionName) => {
    const debug = (window as Window & { __GAME_DEBUG__?: Record<string, (() => unknown) | undefined> }).__GAME_DEBUG__;
    return debug?.[actionName]?.();
  }, action);
}

export async function inspectStageDClassicInBrowser(root: string, template: StageDClassicTemplate): Promise<StageDQualityResult> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error("没有找到可用于阶段 D 验收的 Chrome 或 Edge。 ");
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  const checks: string[] = [];
  const evidence: Record<string, unknown> = {};
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`); });
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    await page.locator("#start:visible").click();
    await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 4_000 });

    if (template === "tetris") {
      const tierOne = await stageCDebugState(page);
      await stageCDebugAction(page, "softDrop");
      const softDropped = await stageCDebugState(page);
      await stageCDebugAction(page, "prepareWallKick");
      const wallKicked = await stageCDebugState(page);
      await stageCDebugAction(page, "setTimedMode");
      const timed = await stageCDebugState(page);
      await stageCDebugAction(page, "setZenMode");
      const zen = await stageCDebugState(page);
      await stageCDebugAction(page, "setStandardMode");
      await stageCDebugAction(page, "hold");
      const held = await stageCDebugState(page);
      await page.keyboard.press("Space");
      const dropped = await stageCDebugState(page);
      await stageCDebugAction(page, "clearLinePreview");
      const feedback = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(17); debug.restart(); });
      const tierFive = await stageCDebugState(page);
      if (held.runtime.heldPieceIndex === null || !held.runtime.holdUsed) throw new Error("俄罗斯方块暂存没有生效。 ");
      if (softDropped.runtime.softDropScore !== 1 || softDropped.runtime.score < 1) throw new Error("俄罗斯方块软降没有逐格计分。 ");
      if (wallKicked.runtime.currentPiece?.rotation !== 2 || wallKicked.runtime.currentPiece?.x !== 0) throw new Error("俄罗斯方块 SRS 贴墙旋转没有生效。 ");
      if (dropped.runtime.hardDropScore <= 0) throw new Error("硬降没有计分。 ");
      if (feedback.runtime.clearFeedbackMs <= 0) throw new Error("消行反馈不可见。 ");
      if (!(tierFive.runtime.fallInterval < tierOne.runtime.fallInterval)) throw new Error("高阶关卡下落速度没有收紧。 ");
      if (!tierOne.runtime.gestureSupport) throw new Error("移动端手势没有启用。 ");
      if (!tierOne.runtime.sevenBagRandomizer || tierOne.runtime.nextQueue?.length !== 5 || new Set(tierOne.runtime.nextQueue).size !== 5) throw new Error("俄罗斯方块七袋随机或五枚预览不完整。 ");
      if (tierOne.runtime.rotationSystem !== "SRS-clockwise" || tierOne.runtime.lockDelayMs !== 500 || tierOne.runtime.maxLockResets !== 15) throw new Error("俄罗斯方块现代旋转或落地延迟合同不完整。 ");
      if (!tierOne.runtime.cellGeometry?.axisAlignedCells || tierOne.runtime.cellGeometry?.protrusion !== 0) throw new Error("俄罗斯方块外轮廓没有被约束到整数格。 ");
      if (timed.runtime.mode !== "timed" || timed.runtime.modeTimeLimit <= 0 || zen.runtime.mode !== "zen" || new Set(tierOne.runtime.modes).size !== 3) throw new Error("标准、限时与禅模式没有共用运行时切换。 ");
      checks.push("七袋随机与五枚预览", "暂存与 SRS 贴墙旋转", "500ms 落地延迟", "等级、软降与硬降计分", "消行反馈与危险高度", "触控手势", "标准、限时、禅模式", "五档速度渐进", "整数格外轮廓");
      evidence.tierOne = tierOne.runtime; evidence.softDropped = softDropped.runtime; evidence.wallKicked = wallKicked.runtime; evidence.timed = timed.runtime; evidence.zen = zen.runtime; evidence.held = held.runtime; evidence.dropped = dropped.runtime; evidence.tierFive = tierFive.runtime;
    }

    if (template === "merge-2048") {
      const tierOne = await stageCDebugState(page);
      await stageCDebugAction(page, "prepareMerge");
      await page.keyboard.press("ArrowLeft");
      const merged = await stageCDebugState(page);
      await stageCDebugAction(page, "undo");
      const undone = await stageCDebugState(page);
      await stageCDebugAction(page, "prepareDanger");
      const danger = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(17); debug.restart(); });
      const tierFive = await stageCDebugState(page);
      if (merged.runtime.score !== 4 || !merged.runtime.canUndo || !merged.runtime.spawnAnimated) throw new Error("2048 合并、生成动画或撤销快照不完整。 ");
      if (undone.runtime.score !== 0 || undone.runtime.canUndo) throw new Error("2048 撤销没有恢复上一步。 ");
      if (!danger.runtime.danger) throw new Error("2048 临近锁死时没有危险状态。 ");
      if (!(tierFive.runtime.target > tierOne.runtime.target)) throw new Error("2048 高阶关卡目标没有提升。 ");
      checks.push("数字层级", "生成与合并动画", "一步撤销", "历史最佳", "危险提示与分档目标");
      evidence.tierOne = tierOne.runtime; evidence.merged = merged.runtime; evidence.undone = undone.runtime; evidence.danger = danger.runtime; evidence.tierFive = tierFive.runtime;
    }

    if (template === "klotski") {
      const initial = await stageCDebugState(page);
      await stageCDebugAction(page, "legalMove");
      await page.waitForTimeout(340);
      const moved = await stageCDebugState(page);
      await stageCDebugAction(page, "undo");
      const undone = await stageCDebugState(page);
      await stageCDebugAction(page, "legalMove");
      await page.waitForTimeout(340);
      await stageCDebugAction(page, "legalMove");
      await page.waitForTimeout(340);
      const beforeReplay = await stageCDebugState(page);
      await stageCDebugAction(page, "replay");
      const replayed = await stageCDebugState(page);
      if (initial.runtime.layoutCount < 20 || initial.runtime.boardWidthRatio < 82 || initial.runtime.boardWidthRatio > 90) throw new Error("华容道布局数或棋盘占比不达标。 ");
      if (initial.runtime.transitionMs < 160 || initial.runtime.transitionMs > 220 || !initial.runtime.identityUsesShapeAndBitmap) throw new Error("华容道过渡或棋子识别方式不达标。 ");
      if (initial.runtime.pieceGap < 8 || initial.runtime.pieceOutlineWidth < 4 || !initial.runtime.incompleteArtIsCropped) throw new Error("华容道棋子边界或残缺素材裁切不达标。 ");
      if (!initial.runtime.optimalExact || initial.runtime.optimalReference < 1) throw new Error("华容道没有计算当前牌局的精确最优步参考。 ");
      if (moved.runtime.moves !== 1 || !moved.runtime.canUndo || undone.runtime.moves !== 0) throw new Error("华容道移动与撤销不可用。 ");
      if (beforeReplay.runtime.replayLength < 2 || replayed.runtime.replaying || replayed.runtime.moves !== beforeReplay.runtime.replayLength) throw new Error("华容道操作回放没有完整复现。 ");
      checks.push("20 个牌局", "82%–90% 棋盘占比", "形状与位图双重识别", "清晰棋子边界与完整素材裁切", "160–220ms 移动", "撤销、参考步数与回放");
      evidence.initial = initial.runtime; evidence.moved = moved.runtime; evidence.undone = undone.runtime; evidence.replayed = replayed.runtime;
    }

    if (template === "puzzle") {
      const tierOne = await stageCDebugState(page);
      await stageCDebugAction(page, "selectNext");
      await page.keyboard.press("ArrowRight");
      await stageCDebugAction(page, "placeSelectedAtHome");
      const placed = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(20); debug.restart(); });
      await page.waitForTimeout(150);
      const tierFive = await stageCDebugState(page);
      if (tierOne.runtime.imageLevelCount < 20 || tierOne.runtime.perimeterZones !== 4) throw new Error("拼图没有 20 个内置图案或四区外围托盘。 ");
      if (tierOne.runtime.imageLevel === tierFive.runtime.imageLevel) throw new Error("拼图首关与末关复用了同一张图片。 ");
      if (Math.abs(tierOne.runtime.boardAspect - tierOne.runtime.imageAspect) > .02) throw new Error("拼图画板没有适配图像比例。 ");
      if (!tierOne.runtime.clickPlacement || !tierOne.runtime.keyboardPlacement || placed.runtime.placedCount !== 1 || !placed.runtime.snapFeedback) throw new Error("拼图点击、键盘或吸附反馈不可用。 ");
      if (!(tierFive.runtime.pieceCount > tierOne.runtime.pieceCount) || tierFive.runtime.pieceCount > 50) throw new Error("拼图关卡块数没有在 50 上限内渐进。 ");
      checks.push("20 个不重复内置位图关卡", "4–50 块渐进", "图像比例自适应", "外围四区托盘", "点击、拖动、键盘与吸附反馈");
      evidence.tierOne = tierOne.runtime; evidence.placed = placed.runtime; evidence.tierFive = tierFive.runtime;
    }

    if (template === "block-place") {
      const tierOne = await stageCDebugState(page);
      for (let index = 0; index < 4; index += 1) {
        await stageCDebugAction(page, "regenerate");
        const state = await stageCDebugState(page);
        if (!state.runtime.batchGuaranteed) throw new Error("果冻填阵生成了不可连续放完的候选批次。 ");
      }
      await stageCDebugAction(page, "hint");
      await stageCDebugAction(page, "prepareDanger");
      const danger = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(17); debug.restart(); });
      const tierFive = await stageCDebugState(page);
      if (!tierOne.runtime.batchGuaranteed || !danger.runtime.danger) throw new Error("果冻填阵缺少可解批次保证或危险预警。 ");
      if (tierOne.runtime.candidateUi.style !== "flat-light-dock" || tierOne.runtime.candidateUi.slotWidth < 190 || tierOne.runtime.candidateUi.selectedOutlineWidth < 4 || !tierOne.runtime.candidateUi.numberedSlots) throw new Error("果冻填阵候选框缺少清晰的扁平卡槽层级。 ");
      if (tierOne.runtime.candidateUi.greenContrast < 4.5 || tierOne.runtime.candidateUi.greenPlate !== "#d9f7e9" || tierOne.runtime.candidateUi.greenOutline !== "#0b6b53") throw new Error("果冻填阵绿色拼块对比度不足。 ");
      if (!(tierFive.runtime.hardShapeRate > tierOne.runtime.hardShapeRate)) throw new Error("果冻填阵高阶关卡没有提高复杂构件比例。 ");
      checks.push("浅色扁平候选底座", "编号与高对比选中态", "绿色拼块 4.5:1 以上对比", "整块候选位图", "拖动落点预览", "可解候选批次", "连击与消除反馈", "无落点危险预警");
      evidence.tierOne = tierOne.runtime; evidence.danger = danger.runtime; evidence.tierFive = tierFive.runtime;
    }

    if (template === "polyomino-fit") {
      const signatures: string[] = [];
      for (let level = 1; level <= 20; level += 1) {
        const state = await page.evaluate((targetLevel) => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(targetLevel); debug.restart(); return debug.getState(); }, level);
        signatures.push(state.runtime.contourSignature);
      }
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(1); debug.restart(); });
      const initial = await stageCDebugState(page);
      const canvasBox = await page.locator("#game-canvas").boundingBox();
      if (!canvasBox) throw new Error("软糖拼岛画布不可见。 ");
      const trayPoint = initial.runtime.trayFirstCenterCanvas;
      const canvasSize = initial.runtime.canvasSize;
      await page.mouse.click(
        canvasBox.x + trayPoint.x / canvasSize.width * canvasBox.width,
        canvasBox.y + trayPoint.y / canvasSize.height * canvasBox.height,
      );
      const clickedRotation = await stageCDebugState(page);
      await stageCDebugAction(page, "rotate");
      const rotated = await stageCDebugState(page);
      await stageCDebugAction(page, "hint");
      const hinted = await stageCDebugState(page);
      await stageCDebugAction(page, "placeSolutionPiece");
      const placed = await stageCDebugState(page);
      if (new Set(signatures).size !== 20) throw new Error("软糖拼岛没有形成 20 个不同轮廓。 ");
      if (initial.runtime.pieceCount < 4 || initial.runtime.targetCellCount < 15) throw new Error("软糖拼岛首关上方轮廓仍然过于简单。 ");
      if (initial.runtime.tray.slotWidth < 150 || initial.runtime.tray.cellSize < 38) throw new Error("软糖拼岛下方拼块卡槽或拼块显示尺寸不足。 ");
      if (!clickedRotation.runtime.clickToRotate || clickedRotation.runtime.selectedRotation !== (initial.runtime.selectedRotation + 1) % 4) throw new Error("点击下方拼块没有直接旋转。 ");
      if (rotated.runtime.selectedRotation !== hinted.runtime.selectedRotation || !hinted.runtime.hintAnchorOnly) throw new Error("软糖拼岛提示自动改变了玩家旋转方向。 ");
      if (placed.runtime.placed !== 1) throw new Error("软糖拼岛合法吸附没有完成。 ");
      checks.push("20 个不同轮廓", "首关四块十五格复杂轮廓", "下方大尺寸拼块卡槽", "点击拼块直接旋转", "提示仅区域与锚点", "提示不自动旋转", "旋转、撤销与吸附", "完成解锁链路");
      evidence.uniqueContours = new Set(signatures).size; evidence.initial = initial.runtime; evidence.clickedRotation = clickedRotation.runtime; evidence.rotated = rotated.runtime; evidence.hinted = hinted.runtime; evidence.placed = placed.runtime;
    }

    if (runtimeErrors.length) throw new Error(`阶段 D 浏览器错误：${runtimeErrors.join(" | ")}`);
    const result = { template, checks, evidence };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "STAGE_D_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectStageCRealtimeInBrowser(root: string, template: StageCRealtimeTemplate): Promise<StageCQualityResult> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error("没有找到可用于阶段 C 验收的 Chrome 或 Edge。 ");
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  const checks: string[] = [];
  const evidence: Record<string, unknown> = {};
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`); });
    page.on("response", (response) => { if (response.status() >= 400 && new URL(response.url()).pathname !== "/favicon.ico") runtimeErrors.push(`HTTP ${response.status()}: ${response.url()}`); });
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 8_000 });

    if (template === "space-shooter") {
      await page.evaluate(() => {
        const debug = (window as any).__GAME_DEBUG__;
        debug.setLevel(1);
        debug.restart();
      });
      await page.waitForTimeout(160);
      const canvas = page.locator("#game-canvas");
      const box = await canvas.boundingBox();
      if (!box) throw new Error("射击游戏画布不可见。 ");
      const pointerStart = await stageCDebugState(page);
      await page.mouse.move(box.x + box.width * .72, box.y + box.height * .61);
      await page.waitForTimeout(180);
      const hoverState = await stageCDebugState(page);
      if (hoverState.runtime.shipPosition.x === pointerStart.runtime.shipPosition.x || hoverState.runtime.shipPosition.y === pointerStart.runtime.shipPosition.y) {
        throw new Error("桌面鼠标悬停没有同时改变飞船横纵位置。 ");
      }
      await page.mouse.move(box.x + box.width * .5, box.y + box.height * .78);
      await page.mouse.down();
      for (let index = 0; index < 12; index += 1) {
        await page.mouse.move(box.x + box.width * (.18 + (index % 2) * .64), box.y + box.height * (.7 + (index % 3) * .04), { steps: 3 });
      }
      const heldState = await stageCDebugState(page);
      await page.mouse.up();
      if (!heldState?.runtime?.pointerCaptured || heldState.runtime.pointerMoves < 12) throw new Error("持续拖动没有保持指针捕获。 ");
      await canvas.dispatchEvent("pointerdown", { pointerId: 77, pointerType: "touch", isPrimary: true, clientX: box.x + box.width * .35, clientY: box.y + box.height * .73 });
      await canvas.dispatchEvent("pointermove", { pointerId: 77, pointerType: "touch", isPrimary: true, clientX: box.x + box.width * .64, clientY: box.y + box.height * .58 });
      await page.waitForTimeout(180);
      const touchHeldState = await stageCDebugState(page);
      if (!touchHeldState.runtime.pointerCaptured || touchHeldState.runtime.pointerType !== "touch" || touchHeldState.runtime.shipPosition.y === heldState.runtime.shipPosition.y) {
        throw new Error("手机按住拖动没有持续更新飞船位置。 ");
      }
      await canvas.dispatchEvent("pointerup", { pointerId: 77, pointerType: "touch", isPrimary: true, clientX: box.x + box.width * .64, clientY: box.y + box.height * .58 });
      const touchReleasedState = await stageCDebugState(page);
      if (touchReleasedState.runtime.pointerCaptured || touchReleasedState.runtime.pointerTarget !== null) throw new Error("手机松手后没有结束拖动。 ");
      if (heldState.runtime.bulletVisual.width < 10 || heldState.runtime.bulletVisual.height < 28 || !heldState.runtime.bulletVisual.highContrastCore) {
        throw new Error("玩家弹体的尺寸或高对比核心不足。 ");
      }
      if (heldState.runtime.estimatedSessionSeconds < 90 || heldState.runtime.estimatedSessionSeconds > 150) throw new Error(`标准局估算时长不在 90–150 秒：${heldState.runtime.estimatedSessionSeconds} 秒。`);
      const livesBefore = heldState.runtime.lives;
      await stageCDebugAction(page, "damageOnce");
      const damagedState = await stageCDebugState(page);
      if (damagedState.runtime.lives !== livesBefore - 1) throw new Error("受击分支没有扣除一点能量。 ");
      await stageCDebugAction(page, "collectRepair");
      const repairedState = await stageCDebugState(page);
      if (repairedState.runtime.lives !== livesBefore) throw new Error("修复掉落没有恢复能量。 ");
      await stageCDebugAction(page, "forceLoss");
      if (await page.locator("body").getAttribute("data-game-state") !== "lost") throw new Error("失败分支不可达。 ");
      await stageCDebugAction(page, "restart");
      if (await page.locator("body").getAttribute("data-game-state") !== "playing") throw new Error("失败后重开没有恢复 playing。 ");
      await stageCDebugAction(page, "forceWin");
      if (await page.locator("body").getAttribute("data-game-state") !== "stage-complete") throw new Error("胜利分支没有进入关卡完成状态。 ");
      checks.push("高对比弹体", "桌面鼠标悬停跟随", "手机按住拖动", "连续指针捕获", "90–150 秒标准局", "受击与无敌", "修复掉落", "失败、胜利与重开");
      evidence.session = heldState.runtime;
      evidence.hoverPosition = hoverState.runtime.shipPosition;
      evidence.touchHeldPosition = touchHeldState.runtime.shipPosition;
      evidence.touchReleased = !touchReleasedState.runtime.pointerCaptured;
      evidence.damagedLives = damagedState.runtime.lives;
      evidence.repairedLives = repairedState.runtime.lives;
    }

    if (template === "platformer") {
      await stageCDebugAction(page, "restart");
      await page.waitForTimeout(240);
      const tierOne = await stageCDebugState(page);
      if (tierOne.runtime.stageCount !== 4 || tierOne.runtime.stageLabels.length !== 4) throw new Error("平台关卡没有四个明确段落。 ");
      if (tierOne.runtime.playerVisibleWidthRatio < 7 || tierOne.runtime.playerVisibleWidthRatio > 10) throw new Error(`角色显示宽度占比不在 7%–10%：${tierOne.runtime.playerVisibleWidthRatio}%。`);
      if (tierOne.runtime.safeLandingCount < 1) throw new Error("9:16 开局没有安全落脚预览。 ");
      const touchStartX = tierOne.runtime.player.x;
      await page.locator('[data-control="right"]:visible').first().click();
      await page.waitForTimeout(220);
      const touchState = await stageCDebugState(page);
      await stageCDebugAction(page, "restart");
      await page.waitForTimeout(80);
      const keyboardStart = await stageCDebugState(page);
      await page.keyboard.down("ArrowRight");
      await page.waitForTimeout(180);
      await page.keyboard.up("ArrowRight");
      await page.waitForTimeout(40);
      const keyboardState = await stageCDebugState(page);
      const touchDelta = touchState.runtime.player.x - touchStartX;
      const keyboardDelta = keyboardState.runtime.player.x - keyboardStart.runtime.player.x;
      if (touchDelta <= 0 || keyboardDelta <= 0) throw new Error("触控或键盘向右移动没有产生一致方向的结果。 ");
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(17); debug.restart(); });
      await page.waitForTimeout(240);
      const tierFive = await stageCDebugState(page);
      if (tierFive.runtime.safeLandingCount > tierOne.runtime.safeLandingCount) throw new Error("高阶关卡的安全预览没有收紧。 ");
      checks.push("四段关卡", "纵向跟随镜头", "7%–10% 角色占比", "安全落脚预览", "触控与键盘同向一致");
      evidence.tierOne = tierOne.runtime;
      evidence.tierFive = tierFive.runtime;
      evidence.inputDeltas = { touch: touchDelta, keyboard: keyboardDelta };
    }

    if (template === "snake") {
      const profiles: Record<string, unknown> = {};
      for (const difficulty of ["relaxed", "standard", "challenging"]) {
        await page.locator(`[data-snake-difficulty="${difficulty}"]:visible`).first().click();
        profiles[difficulty] = (await stageCDebugState(page)).runtime;
      }
      const relaxed = profiles.relaxed as any;
      const standard = profiles.standard as any;
      const challenging = profiles.challenging as any;
      if (!(relaxed.stepDelay > standard.stepDelay && standard.stepDelay > challenging.stepDelay)) throw new Error("三档难度的速度层级不正确。 ");
      if (relaxed.wrapWalls !== true || standard.wrapWalls !== false || challenging.obstacleCount <= standard.obstacleCount) throw new Error("三档难度没有同时改变边界与障碍密度。 ");
      if (new Set(standard.assetRoles).size !== 9 || !standard.assetRoles.includes("body-corner")) throw new Error("蛇身方向资产角色不完整。 ");
      await page.locator('[data-snake-difficulty="standard"]:visible').first().click();
      await stageCDebugAction(page, "restart");
      const keyboardStart = await stageCDebugState(page);
      const turnDelay = Math.ceil(keyboardStart.runtime.stepDelay * 1.35);
      await page.keyboard.press("ArrowUp");
      await page.waitForTimeout(turnDelay);
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(turnDelay);
      const turned = await stageCDebugState(page);
      if (turned.runtime.direction.x !== -1 || turned.runtime.direction.y !== 0) throw new Error(`四向控制没有形成连续转向：${JSON.stringify(turned.runtime)}。`);
      if (turned.runtime.rendering !== "requestAnimationFrame-interpolation" || turned.runtime.staticLayerCached !== true || turned.runtime.estimatedFps < 45 || turned.runtime.renderedFrames < 8) throw new Error(`青玉长游没有保持逐帧插值或稳定刷新：${JSON.stringify(turned.runtime)}。`);
      await stageCDebugAction(page, "previewCompletion");
      const completion = await stageCDebugState(page);
      if (!completion.runtime.completionActive) throw new Error("目标完成演出没有进入可见时段。 ");
      checks.push("头身转角尾九类位图", "三档多维难度", "逐帧插值与稳定刷新", "四向连续转向", "碰撞原因", "进食、危险与完成演出");
      evidence.profiles = profiles;
      evidence.turned = turned.runtime;
    }

    if (template === "breakout") {
      const formations: any[] = [];
      for (let level = 1; level <= 20; level += 1) {
        const state = await page.evaluate((selectedLevel) => {
          const debug = (window as any).__GAME_DEBUG__;
          debug.setLevel(selectedLevel);
          debug.restart();
          return debug.getState();
        }, level);
        formations.push(state.runtime);
      }
      const chapters = formations.filter((_, index) => index % 4 === 0);
      if (new Set(chapters.map((state) => state.chapter)).size !== 5) throw new Error("20 关没有形成五个四关章节。 ");
      if (new Set(formations.map((state) => state.pattern)).size !== 20) throw new Error("二十关没有使用二十种不同砖阵。 ");
      if (new Set(formations.map((state) => state.layoutSignature)).size !== 20) throw new Error("二十关生成了重复的砖块形状。 ");
      if (chapters.some((state, index) => state.damageAssetStart !== index * 3)) throw new Error("五章三档受损位图映射错误。 ");
      if (!formations.slice(4).some((state) => state.specialBrickCounts.shield > 0)) throw new Error("第二章后没有生成潮盾特殊砖。 ");
      if (!formations.slice(8).some((state) => state.specialBrickCounts.wide > 0)) throw new Error("第三章后没有生成宽挡板特殊砖。 ");
      if (!formations.slice(12).some((state) => state.specialBrickCounts.pierce > 0)) throw new Error("第四章后没有生成穿透特殊砖。 ");
      await page.locator("#back-to-setup").click();
      await stageCDebugAction(page, "setTimeAttackMode");
      await page.locator("#start").click();
      await stageCDebugAction(page, "toggleFocus");
      await page.waitForTimeout(120);
      await stageCDebugAction(page, "grantSpecialPowers");
      await stageCDebugAction(page, "simulateSideCollision");
      const activeSystems = await stageCDebugState(page);
      if (activeSystems.runtime.mode !== "time-attack" || !activeSystems.runtime.focusActive || activeSystems.runtime.focusEnergy >= 100) throw new Error("限时模式或聚光减速没有真实生效。 ");
      if (activeSystems.runtime.focusTimeScale !== .55 || activeSystems.runtime.focusScoreMultiplier !== .5) throw new Error("聚光没有同时体现减速与得分代价。 ");
      if (!activeSystems.runtime.shieldCharges || !activeSystems.runtime.wideActive || activeSystems.runtime.pierceHits < 1) throw new Error("三类特殊能力没有进入运行状态。 ");
      if (activeSystems.runtime.collisionSystem !== "substep-face-normal" || activeSystems.runtime.collisionProbe?.axis !== "horizontal" || activeSystems.runtime.collisionProbe?.afterVx >= 0 || !activeSystems.runtime.collisionProbe?.finite) throw new Error("砖块侧面碰撞没有按面法线反射或产生了非有限坐标。 ");
      await page.locator("#back-to-setup").click();
      await stageCDebugAction(page, "setEndlessMode");
      const endlessSetup = await stageCDebugState(page);
      if (endlessSetup.runtime.mode !== "endless") throw new Error("无尽模式没有被选择。 ");
      await stageCDebugAction(page, "setCampaignMode");
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(1); debug.restart(); });
      await stageCDebugAction(page, "earnBomb");
      const armed = await stageCDebugState(page);
      if (!armed.runtime.bombArmed) throw new Error("连续消除没有获得爆炸道具。 ");
      await stageCDebugAction(page, "triggerArmedBomb");
      const exploded = await stageCDebugState(page);
      if (exploded.runtime.bombArmed || exploded.runtime.lastExplosionRemoved < 1 || exploded.runtime.lastExplosionRemoved > 4) throw new Error("十字爆炸没有按上下左右四格自动触发。 ");
      const beforeComplete = await stageCDebugState(page);
      await stageCDebugAction(page, "completeCurrentStage");
      if (await page.locator("body").getAttribute("data-game-state") !== "stage-complete") throw new Error("清场后没有进入 stage-complete。 ");
      const controlsLocked = await page.locator("[data-control]").evaluateAll((controls) => controls.every((control) => (control as HTMLButtonElement).disabled));
      await page.evaluate(() => (window as any).__GAME_DEBUG__.control("right"));
      const afterComplete = await stageCDebugState(page);
      if (!controlsLocked || afterComplete.runtime.paddleX !== beforeComplete.runtime.paddleX) throw new Error("关卡完成期间输入没有正确锁定。 ");
      checks.push("20 关五章", "二十种不同砖阵", "三类特殊砖与能力", "旅程/限时/无尽三模式", "聚光风险收益", "面法线分步碰撞", "连消奖励与十字爆炸", "碎片反馈", "清场输入锁定");
      evidence.chapters = chapters;
      evidence.formations = formations.map((state) => ({ level: state.level, pattern: state.pattern, brickCount: state.brickCount, layoutSignature: state.layoutSignature }));
      evidence.bomb = { armed: armed.runtime, exploded: exploded.runtime };
      evidence.activeSystems = activeSystems.runtime;
      evidence.endlessSetup = endlessSetup.runtime;
      evidence.controlsLocked = controlsLocked;
    }

    if (runtimeErrors.length) throw new Error(`阶段 C 浏览器错误：${runtimeErrors.join(" | ")}`);
    const result = { template, checks, evidence };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "STAGE_C_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectShooterContinuousInput(
  root: string,
  durationMs = 600_000,
  onProgress?: (elapsedMs: number, state: unknown) => void,
): Promise<ShooterLongRunResult> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error("没有找到可用于十分钟持续输入验收的 Chrome 或 Edge。 ");
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`); });
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    await stageCDebugAction(page, "beginContinuousInputAudit");
    const box = await page.locator("#game-canvas").boundingBox();
    if (!box) throw new Error("射击游戏画布不可见。 ");
    await page.mouse.move(box.x + box.width * .5, box.y + box.height * .78);
    await page.mouse.down();
    const startedAt = Date.now();
    let lastProgressAt = startedAt;
    let movement = 0;
    while (Date.now() - startedAt < durationMs) {
      const phase = movement % 4;
      const x = box.x + box.width * (phase < 2 ? .2 + phase * .6 : .8 - (phase - 2) * .6);
      const y = box.y + box.height * (.7 + (movement % 3) * .04);
      await page.mouse.move(x, y, { steps: 2 });
      movement += 1;
      await page.waitForTimeout(220);
      if (movement % 20 === 0) {
        const state = await stageCDebugState(page);
        if (!state?.runtime?.pointerCaptured || !state.runtime.inputAuditActive || await page.locator("body").getAttribute("data-game-state") !== "playing") {
          throw new Error(`持续输入在 ${Date.now() - startedAt}ms 时中断。`);
        }
        if (Date.now() - lastProgressAt >= 60_000) {
          lastProgressAt = Date.now();
          onProgress?.(lastProgressAt - startedAt, state);
        }
      }
    }
    const heldState = await stageCDebugState(page);
    await page.mouse.up();
    await stageCDebugAction(page, "endContinuousInputAudit");
    if (runtimeErrors.length) throw new Error(`十分钟持续输入出现浏览器错误：${runtimeErrors.join(" | ")}`);
    if (heldState.runtime.pointerMoves < Math.floor(durationMs / 350)) throw new Error(`持续拖动事件不足：${heldState.runtime.pointerMoves}。`);
    if (heldState.runtime.maxPointerGapMs > 1_500) throw new Error(`拖动事件最大间隔 ${heldState.runtime.maxPointerGapMs}ms，超过 1500ms。`);
    const result = {
      durationMs: Date.now() - startedAt,
      pointerMoves: heldState.runtime.pointerMoves,
      maxPointerGapMs: heldState.runtime.maxPointerGapMs,
      frameCount: heldState.runtime.frameCount,
      maxFrameGapMs: heldState.runtime.maxFrameGapMs,
      finalState: await page.locator("body").getAttribute("data-game-state") ?? "",
    };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "SHOOTER_LONG_RUN_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectStageF3DInBrowser(root: string, expectedMode: "collector" | "arena"): Promise<StageF3DQualityResult> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error("没有找到可用于 3D 真检的 Chrome 或 Edge。");
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  let completedRuns = 0;
  let failedRuns = 0;
  const viewportsChecked: string[] = [];
  let performanceTier = "";
  let hiddenRenderPaused = false;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    for (const viewport of [{ name: "phone", width: 390, height: 844 }, { name: "desktop", width: 1280, height: 720 }]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
        await page.locator("#start").click();
        await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
        const initial = await page.evaluate(() => {
          const debug = (window as Window & { __GAME_DEBUG__?: { getState: () => Record<string, unknown> } }).__GAME_DEBUG__;
          const shell = document.querySelector(".three-shell")?.getBoundingClientRect();
          return { state: debug?.getState(), shell: shell ? { width: shell.width, height: shell.height } : null };
        });
        if (initial.state?.mode !== expectedMode) throw new Error(`预期 ${expectedMode}，实际 ${String(initial.state?.mode)}`);
        if (!initial.shell || initial.shell.width < 300 || initial.shell.height < 560) throw new Error("3D 主体未充分利用画幅");
        performanceTier = String(initial.state?.performanceTier ?? "");
        await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { suspend: (value: boolean) => void } }).__GAME_DEBUG__?.suspend(true));
        const beforeSuspend = await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { getState: () => { renderCount: number } } }).__GAME_DEBUG__?.getState().renderCount ?? -1);
        await page.waitForTimeout(140);
        const afterSuspend = await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { getState: () => { renderCount: number } } }).__GAME_DEBUG__?.getState().renderCount ?? -1);
        hiddenRenderPaused = afterSuspend === beforeSuspend;
        await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { suspend: (value: boolean) => void } }).__GAME_DEBUG__?.suspend(false));

        if (expectedMode === "collector") {
          await page.evaluate(() => {
            const debug = (window as Window & { __GAME_DEBUG__?: { reachCheckpoint: () => void; collectAll: () => void; moveToExit: () => void } }).__GAME_DEBUG__;
            debug?.reachCheckpoint(); debug?.collectAll(); debug?.moveToExit();
          });
        } else {
          for (let wave = 0; wave < 3; wave += 1) {
            await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { clearWave: () => void } }).__GAME_DEBUG__?.clearWave());
            await page.waitForTimeout(90);
          }
        }
        await page.waitForFunction(() => ["stage-complete", "won"].includes(document.body.dataset.gameState ?? ""), undefined, { timeout: 4_000 });
        completedRuns += 1;
        await page.evaluate(() => {
          const debug = (window as Window & { __GAME_DEBUG__?: { restart: () => void; forceFail: () => void } }).__GAME_DEBUG__;
          debug?.restart(); debug?.forceFail();
        });
        await page.waitForFunction(() => document.body.dataset.gameState === "lost", undefined, { timeout: 2_000 });
        failedRuns += 1;
        viewportsChecked.push(`${viewport.width}x${viewport.height}`);
        if (errors.length) throw new Error(errors.join(" | "));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser?.close();
    await closeServer(server);
  }
  if (!hiddenRenderPaused) throw new Error("3D 后台停渲染探针失败");
  const result: StageF3DQualityResult = { mode: expectedMode, completedRuns, failedRuns, evidence: { viewportsChecked, performanceTier, hiddenRenderPaused } };
  mkdirSync(join(root, "_studio"), { recursive: true });
  writeFileSync(join(root, "_studio", "STAGE_F_3D_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
  return result;
}

// 控件点击失败时的遮挡诊断:直接告诉修复轮"谁盖住了按钮",避免模型盲猜层叠关系。
async function clickObstructionDiagnosis(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const element = document.querySelector<HTMLElement>(sel);
    if (!element) return "元素不存在";
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return `元素被隐藏(display=${style.display}, visibility=${style.visibility})`;
    if (rect.width === 0 || rect.height === 0) return "元素尺寸为 0";
    const atPoint = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    if (atPoint && atPoint !== element && !element.contains(atPoint) && !atPoint.contains(element)) {
      const covering = `${atPoint.tagName.toLowerCase()}${atPoint.id ? `#${atPoint.id}` : ""}${atPoint.classList.length ? `.${[...atPoint.classList].join(".")}` : ""}`;
      return `按钮中心被 ${covering}(z-index=${getComputedStyle(atPoint).zIndex})遮挡——注意层叠上下文:按钮自身 z-index=${style.zIndex} 只在其父级上下文内生效,请把按钮移到遮罩层之上或提升遮罩内层级`;
    }
    return `元素可见(z-index=${style.zIndex})但点击未生效`;
  }, selector);
}

// 无模板生成游戏的通用验收:不懂具体玩法规则,只验证平台运行时契约——
// 状态机、开始/重开控件、probe 门禁的胜负探针、布局与浏览器错误。
export async function inspectGeneratedGameInBrowser(root: string): Promise<BrowserQualityResult> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error("没有找到可用于自动验收的 Chrome 或 Edge。可设置 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH。 ");
  const qualityRoot = join(root, "_studio", "quality");
  mkdirSync(qualityRoot, { recursive: true });
  const screenshotPaths: string[] = [];
  const failures: string[] = [];
  const evidence: string[] = [];
  const generatedViewports = [
    { name: "phone-small", width: 360, height: 640 },
    { name: "phone-standard", width: 390, height: 844 },
    { name: "desktop-wide", width: 1366, height: 900 },
  ];
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    for (const viewport of generatedViewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      try {
        await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 10_000 });
        await page.waitForTimeout(400);
        const initialState = await page.locator("body").getAttribute("data-game-state");
        if (initialState !== "idle") failures.push(`${viewport.name} 初始状态不是 idle，而是 ${initialState ?? "空"}。`);
        const layout = await page.evaluate(() => {
          const root = document.documentElement;
          const start = document.querySelector<HTMLElement>("#start");
          const startRect = start?.getBoundingClientRect();
          return {
            overflow: root.scrollWidth - root.clientWidth,
            startVisible: Boolean(startRect && startRect.width >= 44 && startRect.height >= 44 && startRect.top >= 0 && startRect.bottom <= innerHeight),
          };
        });
        if (layout.overflow > 1) failures.push(`${viewport.name} 横向溢出 ${layout.overflow}px。`);
        if (!layout.startVisible) failures.push(`${viewport.name} 开始按钮 #start 不在首屏或小于 44px。`);
        await takeScreenshot(page, join(qualityRoot, `${viewport.name}-idle.png`), screenshotPaths);
        if (viewport.name === "phone-standard") {
          await page.locator("#start").click({ timeout: 3_000 });
          await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 5_000 });
          await page.waitForTimeout(600);
          await takeScreenshot(page, join(qualityRoot, `${viewport.name}-playing.png`), screenshotPaths);
          const hooks = await page.evaluate(() => {
            const debug = (window as Window & { __GAME_DEBUG__?: { getState?: () => unknown; forceWin?: () => void; forceLose?: () => void } }).__GAME_DEBUG__;
            return { hasState: Boolean(debug?.getState), hasWin: Boolean(debug?.forceWin), hasLose: Boolean(debug?.forceLose) };
          });
          if (!hooks.hasState || !hooks.hasWin || !hooks.hasLose) {
            failures.push("probe 模式缺少 __GAME_DEBUG__ 的 getState/forceWin/forceLose 钩子。");
          } else {
            await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { forceWin?: () => void } }).__GAME_DEBUG__?.forceWin?.());
            await page.waitForFunction(() => document.body.dataset.gameState === "won", undefined, { timeout: 3_000 })
              .catch(() => failures.push("forceWin 后状态没有进入 won。"));
            await takeScreenshot(page, join(qualityRoot, `${viewport.name}-result.png`), screenshotPaths);
            await page.locator("#restart").click({ timeout: 3_000 })
              .catch(async () => failures.push(`结算后 #restart 无法点击:${await clickObstructionDiagnosis(page, "#restart")}。`));
            await page.waitForFunction(() => ["idle", "playing"].includes(document.body.dataset.gameState ?? ""), undefined, { timeout: 3_000 })
              .catch(() => failures.push("重开后状态没有回到 idle/playing。"));
            const stateAfterRestart = await page.locator("body").getAttribute("data-game-state");
            if (stateAfterRestart === "idle") {
              await page.locator("#start").click({ timeout: 3_000 })
                .catch(async () => failures.push(`重开回到 idle 后 #start 无法点击:${await clickObstructionDiagnosis(page, "#start")}。`));
              await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 5_000 })
                .catch(() => failures.push("重开后无法再次进入 playing。"));
            }
            await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { forceLose?: () => void } }).__GAME_DEBUG__?.forceLose?.());
            await page.waitForFunction(() => document.body.dataset.gameState === "lost", undefined, { timeout: 3_000 })
              .catch(() => failures.push("forceLose 后状态没有进入 lost。"));
          }
          evidence.push("390×844 已验证 idle→开始→playing→won→重开→再开局→lost 完整状态环。");
        }
        if (runtimeErrors.length) failures.push(`${viewport.name} 浏览器错误：${runtimeErrors.join(" | ")}`);
        evidence.push(`${viewport.width}×${viewport.height}: 无横向溢出，首屏可开局。`);
      } catch (error) {
        failures.push(`${viewport.name} 验收中断：${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser?.close();
    await closeServer(server);
  }
  const checks: QualityCheck[] = [
    { id: "GEN-BROWSER-CONTRACT", label: "生成游戏运行时契约（状态机、开始、胜负、重开）", status: failures.length ? "failed" : "passed", evidence: evidence.join(" ") },
    { id: "GEN-BROWSER-LAYOUT", label: "三档画幅布局与触控可达", status: failures.length ? "failed" : "passed", evidence: "360/390/1366 宽度均无横向溢出且可开局。" },
    { id: "GEN-BROWSER-ERRORS", label: "浏览器错误监听", status: failures.length ? "failed" : "passed", evidence: "已监听控制台错误与未处理异常。" },
  ];
  const report = { checkedAt: new Date().toISOString(), executablePath, experimental: true, checks, failures, screenshots: screenshotPaths.map((path) => relative(root, path).replaceAll("\\", "/")) };
  writeFileSync(join(root, "_studio", "BROWSER_QUALITY_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (failures.length) throw new Error(`生成游戏浏览器验收失败：${failures.join(" ")}`);
  return { checks, screenshotPaths };
}

export async function inspectGameInBrowser(root: string): Promise<BrowserQualityResult> {
  const executablePath = findBrowserExecutable();
  if (!executablePath) throw new Error("没有找到可用于自动验收的 Chrome 或 Edge。可设置 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH。 ");
  const qualityRoot = join(root, "_studio", "quality");
  mkdirSync(qualityRoot, { recursive: true });
  const screenshotPaths: string[] = [];
  const failures: string[] = [];
  const evidence: string[] = [];
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({
      executablePath,
      headless: true,
      args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"],
    });
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const runtimeErrors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`);
      });
      page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
      page.on("requestfailed", (request) => runtimeErrors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ""}`));
      page.on("response", (response) => {
        const pathname = new URL(response.url()).pathname;
        if (response.status() >= 400 && pathname !== "/favicon.ico") runtimeErrors.push(`HTTP ${response.status()}: ${response.url()}`);
      });
      try {
        await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
        await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0), undefined, { timeout: 8_000 });
        const layout = await collectLayout(page);
        if (layout.overflow > 1) failures.push(`${viewport.name} 横向溢出 ${layout.overflow}px（${layout.overflowElements.join("、") || "未定位元素"}）。`);
        if (!layout.surfaceVisible) failures.push(`${viewport.name} 游戏主体不可见或过小。`);
        if (!layout.startVisible) failures.push(`${viewport.name} 开始按钮不在首屏或小于 44px。`);
        if (viewport.width <= 390 && layout.undersized.length) failures.push(`${viewport.name} 触控目标小于 44px：${layout.undersized.join("、")}。`);
        if (!layout.disabledGameplayControls) failures.push(`${viewport.name} 开局前仍可使用玩法控制。`);
        evidence.push(`${viewport.width}×${viewport.height}: 主体 ${layout.surfaceRect?.width ?? 0}×${layout.surfaceRect?.height ?? 0}，无横向溢出，首屏可开局。`);
        await takeScreenshot(page, join(qualityRoot, `${viewport.name}-idle.png`), screenshotPaths);
        if (viewport.name === "phone-standard") {
          await runInteractionProbe(page);
          const mobileFlow = await inspectMobilePlayFlow(page);
          if (mobileFlow.playing.surfaceUtilization < .94) failures.push(`手机游玩主体只占可用 9:16 高度的 ${Math.round(mobileFlow.playing.surfaceUtilization * 100)}%。`);
          if (mobileFlow.playing.verticalOverflow > 1) failures.push(`手机游玩状态纵向溢出 ${mobileFlow.playing.verticalOverflow}px。`);
          if (mobileFlow.playing.settingsVisible) failures.push("手机游玩状态仍显示关卡、难度、图片或声音设置。 ");
          if (!mobileFlow.playing.backVisible) failures.push("手机游玩状态缺少至少 44px 的返回启动页按钮。 ");
          if (!mobileFlow.setup.startVisible || !mobileFlow.setup.settingsVisible) failures.push("返回后没有恢复可操作的启动设置页。 ");
          evidence.push(`手机游玩主体 ${mobileFlow.playing.surfaceHeight}/${mobileFlow.playing.maximumPortraitHeight}px，设置仅在启动页显示，可返回后重新开始。`);
          await takeScreenshot(page, join(qualityRoot, `${viewport.name}-playing.png`), screenshotPaths);
          const result = await page.evaluate(() => {
            const debug = (window as Window & { __GAME_DEBUG__?: { forceWin?: () => void; restart?: () => void; setLevel?: (level: number) => void } }).__GAME_DEBUG__;
            debug?.forceWin?.();
            return { hasForceWin: Boolean(debug?.forceWin), hasCampaign: Boolean(debug?.setLevel) };
          });
          if (!result.hasForceWin) failures.push("版本没有公开内部胜利分支探针。 ");
          await page.waitForTimeout(90);
          let resultState = await page.locator("body").getAttribute("data-game-state");
          if (result.hasCampaign) {
            if (resultState !== "stage-complete") failures.push(`首关胜利后状态不是 stage-complete，而是 ${resultState ?? "空"}。`);
            await page.evaluate(() => {
              const debug = (window as Window & { __GAME_DEBUG__?: { forceWin?: () => void; restart?: () => void; setLevel?: (level: number) => void } }).__GAME_DEBUG__;
              debug?.setLevel?.(20);
              debug?.restart?.();
              debug?.forceWin?.();
            });
            await page.waitForTimeout(90);
            resultState = await page.locator("body").getAttribute("data-game-state");
          }
          if (resultState !== "won") failures.push(`最终关胜利状态不是 won，而是 ${resultState ?? "空"}。`);
          await takeScreenshot(page, join(qualityRoot, `${viewport.name}-result.png`), screenshotPaths);
          const restarted = await page.evaluate(() => {
            const debug = (window as Window & { __GAME_DEBUG__?: { restart?: () => void; getState?: () => any; chooseFirstRoute?: () => void } }).__GAME_DEBUG__;
            debug?.restart?.();
            if (debug?.getState?.()?.runtime?.awaitingRoute) debug.chooseFirstRoute?.();
            return Boolean(debug?.restart);
          });
          await page.waitForTimeout(90);
          const restartedState = await page.locator("body").getAttribute("data-game-state");
          if (!restarted || restartedState !== "playing") failures.push(`重开探针没有恢复 playing 状态，而是 ${restartedState ?? "空"}。`);
        }
        if (runtimeErrors.length) failures.push(`${viewport.name} 浏览器错误：${runtimeErrors.join(" | ")}`);
      } catch (error) {
        failures.push(`${viewport.name} 验收中断：${error instanceof Error ? error.message : String(error)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser?.close();
    await closeServer(server);
  }

  const checks: QualityCheck[] = [
    { id: "BROWSER-VIEWPORTS", label: "五档真实浏览器画幅", status: failures.length ? "failed" : "passed", evidence: evidence.join(" ") },
    { id: "BROWSER-INTERACTION", label: "非法输入、开始、合法动作、胜利与重开", status: failures.length ? "failed" : "passed", evidence: "390×844 已验证开局前非法输入无效，执行开始、合法动作、胜利结算并重开。" },
    { id: "BROWSER-ASSETS", label: "浏览器错误与资源完整性", status: failures.length ? "failed" : "passed", evidence: "已监听控制台、未处理异常、请求失败、HTTP 4xx/5xx 和图片解码。" },
  ];
  const report = { checkedAt: new Date().toISOString(), executablePath, viewports, checks, failures, screenshots: screenshotPaths.map((path) => relative(root, path).replaceAll("\\", "/")) };
  writeFileSync(join(root, "_studio", "BROWSER_QUALITY_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (failures.length) throw new Error(`真实浏览器验收失败：${failures.join(" ")}`);
  return { checks, screenshotPaths };
}
