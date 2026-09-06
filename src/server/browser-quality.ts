import { createServer, type Server } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { extname, join, normalize, relative, resolve } from "node:path";
import { chromium, type Browser, type Page } from "playwright";
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

// Chromium 会拒绝一组历史协议端口。Windows 的临时端口分配偶尔会命中
// 5060/5061 等端口，导致游戏本身尚未加载就报 ERR_UNSAFE_PORT。
const browserUnsafePorts = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95,
  101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179,
  389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601,
  636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 5060, 5061, 6000, 6566,
  6665, 6666, 6667, 6668, 6669, 6697, 10080,
]);

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

export type StageCRealtimeTemplate = "space-shooter" | "snake" | "breakout";
export type StageDClassicTemplate = "tetris" | "merge-2048" | "klotski" | "puzzle" | "block-place" | "polyomino-fit";
export type StageETemplate = "region-logic" | "mahjong-roguelite";

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

export type OnboardingQualityResult = {
  completedStepIds: string[];
  acceptedSignals: Array<{ stepId: string; signal: string }>;
  ignoredWrongDirection: boolean;
  persistedCompletion: boolean;
  replayedAndSkipped: boolean;
};


export type TemplateOnboardingQualityResult = {
  template: "tetris" | "breakout" | "snake" | "space-shooter";
  completedStepIds: string[];
  acceptedSignals: Array<{ stepId: string; signal: string }>;
  safePressurePaused: boolean;
  persistedCompletion: boolean;
  replayedAndSkipped: boolean;
};

export type NonRealtimeOnboardingTemplate = "klotski" | "puzzle" | "block-place" | "polyomino-fit" | "region-logic" | "mahjong-roguelite";

export type NonRealtimeOnboardingQualityResult = {
  template: NonRealtimeOnboardingTemplate;
  completedStepIds: string[];
  acceptedSignals: Array<{ stepId: string; signal: string }>;
  safeWaitingPreserved: boolean;
  persistedCompletion: boolean;
  replayedAndSkipped: boolean;
};

export type StageF3DMode = "collector" | "arena";

export type VariationRehearsalTemplate = "signal-hunt" | "tetris" | "breakout" | "snake" | "space-shooter" | "merge-2048" | NonRealtimeOnboardingTemplate | StageF3DMode;

export type VariationRehearsalQualityResult = {
  template: VariationRehearsalTemplate;
  sourceLevel: number;
  rehearsalLevel: number;
  sourceModifier: string;
  rehearsalModifier: string;
  expectedSignals: string[];
  observedSignals: string[];
};

export type FailureAssistanceTemplate = "signal-hunt" | "tetris" | "breakout" | "snake" | "space-shooter" | VariationRehearsalTemplate;

export type FailureAssistanceQualityResult = {
  template: FailureAssistanceTemplate;
  observedActions: string[];
  persistedFailureCount: number;
  resetAfterWin: boolean;
  hiddenAdaptation: false;
};

export type DifficultyProgressionQualityResult = {
  template: FailureAssistanceTemplate;
  levelsChecked: number;
  beatTransitionsChecked: number;
  tierSignatures: string[];
  maximumMultiplierStep: number;
};

export type SignalHuntOnboardingQualityResult = {
  completedStepIds: string[];
  acceptedSignals: Array<{ stepId: string; signal: string }>;
  safeTimerPaused: boolean;
  timerResumedAfterLearning: boolean;
  persistedCompletion: boolean;
  replayedAndSkipped: boolean;
};

export type StageEQualityResult = {
  template: StageETemplate | "star-dream-duel";
  completedRuns: number;
  failedRuns: number;
  evidence: Record<string, unknown>;
};

export type StageF3DQualityResult = {
  mode: StageF3DMode;
  completedRuns: number;
  failedRuns: number;
  evidence: Record<string, unknown>;
};

export type ThreeOnboardingQualityResult = {
  mode: StageF3DMode;
  completedStepIds: string[];
  acceptedSignals: Array<{ stepId: string; signal: string }>;
  safePressurePaused: boolean;
  persistedCompletion: boolean;
  replayedAndSkipped: boolean;
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
  const managed = chromium.executablePath();
  const candidates = [
    configured,
    managed,
    ...(process.platform === "win32"
      ? [
          join(process.env.ProgramFiles ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
          join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
          join(process.env.ProgramFiles ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
          join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
          process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe") : null,
          process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Microsoft", "Edge", "Application", "msedge.exe") : null,
        ]
      : process.platform === "darwin"
        ? [
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
            "/Applications/Chromium.app/Contents/MacOS/Chromium",
            join(homedir(), "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
            join(homedir(), "Applications", "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge"),
          ]
        : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"]),
  ].filter((value): value is string => Boolean(value));
  return candidates.find((candidate) => existsSync(candidate));
}

export function requireBrowserExecutable(purpose = "自动验收") {
  const executablePath = findBrowserExecutable();
  if (executablePath) return executablePath;
  throw new Error(`没有找到可用于${purpose}的 Chromium。请在项目目录运行 npm run setup:browsers；也可以安装 Chrome/Edge，或设置 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH。`);
}

export function browserQualityAvailable() {
  return Boolean(findBrowserExecutable());
}

export function startArtifactServer(root: string) {
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
    const listen = () => server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") return reject(new Error("无法启动版本验收服务器。"));
      if (browserUnsafePorts.has(address.port)) {
        server.close(listen);
        return;
      }
      resolveServer({ server, url: `http://127.0.0.1:${address.port}/` });
    });
    listen();
  });
}

export function closeServer(server: Server) {
  return new Promise<void>((resolveClose) => server.close(() => resolveClose()));
}

// 生成物的调试探针（window.__GAME_DEBUG__）只在带 `probe` 查询参数时挂载，
// 避免真实玩家打开控制台就能一键作弊。自动验收在这里统一追加该参数。
export function probeUrl(target: string) {
  const withProbe = new URL(target);
  withProbe.searchParams.set("probe", "1");
  return withProbe.toString();
}

export async function inspectMergeOnboardingInBrowser(root: string): Promise<OnboardingQualityResult> {
  const executablePath = requireBrowserExecutable("2048 新手教学验收");
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
    await page.locator("#start").click();
    const initial = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    if (initial.onboarding.activeStepId !== "ONBOARD-SLIDE" || initial.runtime.tutorialMode !== "slide") throw new Error("首局没有进入安全滑动教学。 ");

    await page.keyboard.press("ArrowLeft");
    const afterWrongDirection = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    const ignoredWrongDirection = afterWrongDirection.onboarding.activeStepId === "ONBOARD-SLIDE"
      && afterWrongDirection.onboarding.completedStepIds.length === 0
      && afterWrongDirection.runtime.tutorialMode === "slide";
    if (!ignoredWrongDirection) throw new Error("错误方向被错误地计为教学成功。 ");

    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getOnboarding().activeStepId === "ONBOARD-MERGE", undefined, { timeout: 2_000 });
    const afterSlide = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    if (afterSlide.runtime.tutorialMode !== "merge" || afterSlide.onboarding.acceptedSignals[0]?.signal !== "board-slid") throw new Error("真实滑动没有产生 board-slid 成功信号。 ");

    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getOnboarding().status === "completed", undefined, { timeout: 2_000 });
    const completed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    if (completed.acceptedSignals[1]?.signal !== "equal-merged-once") throw new Error("真实合并没有产生 equal-merged-once 成功信号。 ");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    const restored = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const persistedCompletion = restored.status === "completed" && restored.completedStepIds.length === 2;
    if (!persistedCompletion) throw new Error("刷新后没有恢复已完成教学状态。 ");

    // The coach is available inside the game; the setup remains unobstructed.
    await page.locator("#start").click();
    await page.getByRole("button", { name: "重看" }).click();
    const replayed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    await page.getByRole("button", { name: "跳过教学" }).click();
    const skipped = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const replayedAndSkipped = replayed.status === "active" && replayed.activeStepId === "ONBOARD-SLIDE" && skipped.status === "skipped" && skipped.skippedStepIds.length === 2;
    if (!replayedAndSkipped) throw new Error("重看或明确跳过教学不可用。 ");
    if (runtimeErrors.length) throw new Error(`新手教学浏览器错误：${runtimeErrors.join(" | ")}`);

    const result = {
      completedStepIds: completed.completedStepIds,
      acceptedSignals: completed.acceptedSignals,
      ignoredWrongDirection,
      persistedCompletion,
      replayedAndSkipped,
    };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "ONBOARDING_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectTemplateOnboardingInBrowser(
  root: string,
  template: TemplateOnboardingQualityResult["template"],
): Promise<TemplateOnboardingQualityResult> {
  const expected = {
    tetris: { key: "ArrowUp", signal: "piece-rotated" },
    breakout: { key: "ArrowLeft", signal: "paddle-moved" },
    snake: { key: "ArrowUp", signal: "direction-changed" },
    "space-shooter": { key: "ArrowLeft", signal: "shot-fired" },
  }[template];
  const executablePath = requireBrowserExecutable(`${template} 新手教学验收`);
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
    await page.locator("#start").click();
    const beforeSafeAttempt = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    await page.waitForTimeout(1_600);
    const afterSafeAttempt = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    const safePressurePaused = template === "tetris"
      ? afterSafeAttempt.runtime.currentPiece?.y === beforeSafeAttempt.runtime.currentPiece?.y
      : template === "breakout"
        ? afterSafeAttempt.runtime.physicsStepCount === beforeSafeAttempt.runtime.physicsStepCount
        : template === "snake"
          ? afterSafeAttempt.runtime.stats.distance === beforeSafeAttempt.runtime.stats.distance
          : afterSafeAttempt.runtime.enemyCount === 0 && afterSafeAttempt.runtime.waveSpawned === 0 && afterSafeAttempt.runtime.lives === beforeSafeAttempt.runtime.lives;
    if (!safePressurePaused) throw new Error(`${template} 在首次教学操作前仍然推进了危险或自动压力。`);
    if (template === "space-shooter") {
      await page.keyboard.down(expected.key);
      await page.waitForTimeout(140);
      await page.keyboard.up(expected.key);
    } else await page.keyboard.press(expected.key);
    await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getOnboarding().status === "completed", undefined, { timeout: 2_000 });
    const completed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    if (completed.acceptedSignals[0]?.signal !== expected.signal) throw new Error(`${template} 的真实操作没有产生 ${expected.signal} 教学信号。`);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    const restored = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const persistedCompletion = restored.status === "completed" && restored.completedStepIds.length === 1;
    if (!persistedCompletion) throw new Error(`${template} 刷新后没有恢复教学完成状态。`);
    await page.getByRole("button", { name: "重看" }).click();
    const replayed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    await page.getByRole("button", { name: "跳过教学" }).click();
    const skipped = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const replayedAndSkipped = replayed.status === "active" && skipped.status === "skipped" && skipped.skippedStepIds.length === 1;
    if (!replayedAndSkipped) throw new Error(`${template} 的重看或跳过教学不可用。`);
    if (runtimeErrors.length) throw new Error(`${template} 新手教学浏览器错误：${runtimeErrors.join(" | ")}`);

    const result = { template, completedStepIds: completed.completedStepIds, acceptedSignals: completed.acceptedSignals, safePressurePaused, persistedCompletion, replayedAndSkipped };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "ONBOARDING_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectNonRealtimeOnboardingInBrowser(
  root: string,
  template: NonRealtimeOnboardingTemplate,
): Promise<NonRealtimeOnboardingQualityResult> {
  const executablePath = requireBrowserExecutable(`${template} 新手教学验收`);
  const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")) as { onboardingPlan?: { steps?: Array<{ id: string; successSignal: string }> } };
  const expectedSteps = manifest.onboardingPlan?.steps ?? [];
  if (!expectedSteps.length) throw new Error(`${template} 缺少可执行的新手教学计划。`);
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`); });
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    await page.locator("#start:visible, #setup-start:visible").first().click();
    await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getOnboarding().status === "active", undefined, { timeout: 2_000 });
    await page.waitForTimeout(650);
    const waiting = await page.evaluate(() => ({ gameState: document.body.dataset.gameState, onboarding: (window as any).__GAME_DEBUG__.getOnboarding(), choosingRoute: Boolean((window as any).__GAME_DEBUG__.getState().runtime?.awaitingRoute) }));
    const safeWaitingPreserved = (["playing", "stage-complete"].includes(waiting.gameState ?? "") || template === "mahjong-roguelite" && waiting.gameState === "paused" && waiting.choosingRoute) && waiting.onboarding.status === "active" && waiting.onboarding.completedStepIds.length === 0;
    if (!safeWaitingPreserved) throw new Error(`${template} 在玩家首次操作前没有保持安全等待。`);

    const action = {
      klotski: "legalMove",
      puzzle: "dragFirstPiece",
      "block-place": "legalAction",
      "polyomino-fit": "legalAction",
      "region-logic": "cycleFirstCell",
      "mahjong-roguelite": "matchFirstFreePair",
    }[template];
    for (let attempt = 0; attempt < expectedSteps.length; attempt += 1) {
      const acted = await page.evaluate((name) => (window as any).__GAME_DEBUG__?.[name]?.(), action);
      if (acted === false) throw new Error(`${template} 没有可用于完成教学的真实合法操作。`);
      const status = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding().status);
      if (status === "completed") break;
    }
    await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getOnboarding().status === "completed", undefined, { timeout: 3_000 });
    const completed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const expectedSignals = expectedSteps.map(({ successSignal }) => successSignal);
    const actualSignals = completed.acceptedSignals.map(({ signal }: { signal: string }) => signal);
    if (JSON.stringify(actualSignals) !== JSON.stringify(expectedSignals)) throw new Error(`${template} 教学信号顺序不符：期望 ${expectedSignals.join(" → ")}，实际 ${actualSignals.join(" → ") || "无"}。`);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    const restored = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const persistedCompletion = restored.status === "completed" && restored.completedStepIds.length === expectedSteps.length;
    if (!persistedCompletion) throw new Error(`${template} 刷新后没有恢复教学完成状态。`);
    // 华容的教学入口属于局内，开始页不显示悬浮教练以免遮住开始按钮。
    if (template === "klotski") {
      await page.locator("#start:visible, #setup-start:visible").first().click();
      await page.waitForFunction(() => document.body.dataset.gameState === "playing");
    }
    await page.getByRole("button", { name: "重看" }).click();
    const replayed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    await page.getByRole("button", { name: "跳过教学" }).click();
    const skipped = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const replayedAndSkipped = replayed.status === "active" && skipped.status === "skipped" && skipped.skippedStepIds.length === expectedSteps.length;
    if (!replayedAndSkipped) throw new Error(`${template} 的重看或明确跳过教学不可用。`);
    if (runtimeErrors.length) throw new Error(`${template} 新手教学浏览器错误：${runtimeErrors.join(" | ")}`);
    const result = { template, completedStepIds: completed.completedStepIds, acceptedSignals: completed.acceptedSignals, safeWaitingPreserved, persistedCompletion, replayedAndSkipped };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "ONBOARDING_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectVariationRehearsalInBrowser(root: string, template: VariationRehearsalTemplate): Promise<VariationRehearsalQualityResult> {
  const executablePath = requireBrowserExecutable(`${template} 变化情境复验`);
  const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")) as { onboardingPlan?: { steps?: Array<{ successSignal?: string }> } };
  const expectedSignals = manifest.onboardingPlan?.steps?.flatMap(({ successSignal }) => successSignal ? [successSignal] : []) ?? [];
  if (!expectedSignals.length) throw new Error(`${template} 缺少可用于变化复验的教学信号。`);
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`); });
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    await page.locator("#start:visible, #setup-start:visible").first().click();
    await page.evaluate(() => {
      const debug = (window as any).__GAME_DEBUG__;
      debug.skipOnboarding?.();
      (window as any).__variationSignals = [];
      addEventListener("forge:mechanic-signal", (event: any) => (window as any).__variationSignals.push(event.detail?.signal));
    });
    const source = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    await page.evaluate(() => {
      const debug = (window as any).__GAME_DEBUG__;
      debug.setLevel(9); debug.restart(); debug.skipOnboarding?.();
    });
    await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getState()?.campaign?.level?.number === 9, undefined, { timeout: 3_000 });
    const rehearsal = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());

    if (template === "collector") {
      await page.keyboard.down("ArrowUp");
      await page.waitForTimeout(220);
      await page.keyboard.up("ArrowUp");
    } else if (template === "arena") {
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.prepareArenaShot?.(); debug.attack?.(); });
    } else if (template === "tetris") {
      await page.keyboard.press("ArrowUp");
    } else if (template === "breakout") {
      await page.keyboard.press("ArrowLeft");
    } else if (template === "snake") {
      await page.keyboard.press("ArrowUp");
    } else if (template === "space-shooter") {
      await page.keyboard.down("ArrowLeft");
      // 主武器自动射击；首帧可能在按键前已经发射，因此跨过一个完整射击间隔。
      await page.waitForTimeout(900);
      await page.keyboard.up("ArrowLeft");
    } else if (template === "signal-hunt") {
      await page.evaluate(() => (window as any).__GAME_DEBUG__.collect());
    } else if (template === "puzzle") {
      const dragged = await page.evaluate(() => (window as any).__GAME_DEBUG__.dragFirstPiece?.());
      if (!dragged) throw new Error("拼图变化复验没有可拖动拼块。");
    } else if (template === "merge-2048") {
      await page.evaluate(() => (window as any).__GAME_DEBUG__.prepareMerge());
      await page.evaluate(() => (window as any).__GAME_DEBUG__.control("left"));
      await page.evaluate(() => (window as any).__GAME_DEBUG__.finishAnimation());
    } else {
      const action = {
        klotski: "legalMove",
        "block-place": "legalAction",
        "polyomino-fit": "legalAction",
        "region-logic": "cycleFirstCell",
        "mahjong-roguelite": "matchFirstFreePair",
      }[template];
      await page.evaluate((name) => (window as any).__GAME_DEBUG__?.[name]?.(), action);
    }
    try {
      await page.waitForFunction((signals) => signals.every((signal: string) => (window as any).__variationSignals.includes(signal)), expectedSignals, { timeout: 4_000 });
    } catch {
      const observed = await page.evaluate(() => (window as any).__variationSignals ?? []);
      throw new Error(`${template} 第 9 关没有复现全部教学信号；期望 ${expectedSignals.join("、")}，实际 ${observed.join("、") || "无"}。`);
    }
    const observedSignals = await page.evaluate(() => [...new Set((window as any).__variationSignals)] as string[]);
    const summarizeLevel = (level: any) => `${String(level?.tierLabel ?? "未知阶段")} · ${String(level?.ruleModifier ?? "未知规则")} · 目标×${String(level?.goalMultiplier ?? "?")} · 密度×${String(level?.densityMultiplier ?? "?")}`;
    const variationSignature = (level: any) => JSON.stringify({ tier: level?.tier, variant: level?.variant, goalMultiplier: level?.goalMultiplier, speedMultiplier: level?.speedMultiplier, densityMultiplier: level?.densityMultiplier, ruleModifier: level?.ruleModifier });
    const sourceModifier = summarizeLevel(source?.campaign?.level);
    const rehearsalModifier = summarizeLevel(rehearsal?.campaign?.level);
    if (source?.campaign?.level?.number !== 1 || rehearsal?.campaign?.level?.number !== 9 || variationSignature(source?.campaign?.level) === variationSignature(rehearsal?.campaign?.level)) {
      throw new Error(`${template} 没有从首关切换到规则变化后的第 9 关：${sourceModifier} → ${rehearsalModifier}。`);
    }
    if (runtimeErrors.length) throw new Error(`${template} 变化情境复验浏览器错误：${runtimeErrors.join(" | ")}`);
    const result = { template, sourceLevel: 1, rehearsalLevel: 9, sourceModifier, rehearsalModifier, expectedSignals, observedSignals };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "VARIATION_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectFailureAssistanceInBrowser(root: string, template: FailureAssistanceTemplate): Promise<FailureAssistanceQualityResult> {
  const executablePath = requireBrowserExecutable(`${template} 失败辅助验收`);
  const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")) as { assistancePlan?: { hiddenAdaptation?: boolean; steps?: Array<{ afterFailures: number; action: string; message: string; explicitToPlayer: boolean }> } };
  const plan = manifest.assistancePlan;
  if (!plan?.steps?.length || plan.hiddenAdaptation !== false) throw new Error(`${template} 缺少显式失败辅助计划，或仍允许暗中调难度。`);
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`); });
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__?.forceLose), undefined, { timeout: 8_000 });
    await page.locator("#start:visible").click();
    await page.evaluate(() => (window as any).__GAME_DEBUG__.skipOnboarding?.());
    const observedActions: string[] = [];
    for (let failureCount = 1; failureCount <= 4; failureCount += 1) {
      const cause = `验收失败原因 ${failureCount}`;
      await page.evaluate((value) => (window as any).__GAME_DEBUG__.forceLose(value), cause);
      await page.waitForFunction(() => document.body.dataset.gameState === "lost", undefined, { timeout: 2_000 });
      const expected = [...plan.steps].filter(({ afterFailures }) => afterFailures <= failureCount).at(-1)!;
      const evidence = await page.evaluate(() => {
        const card = document.querySelector<HTMLElement>("#failure-assistance");
        return {
          state: (window as any).__GAME_DEBUG__.getAssistance(),
          visible: Boolean(card && !card.hidden && card.getBoundingClientRect().height > 0),
          action: card?.dataset.action,
          message: document.querySelector("#failure-assistance-message")?.textContent ?? "",
          meta: document.querySelector("#failure-assistance-meta")?.textContent ?? "",
        };
      });
      if (!evidence.visible || evidence.state.active?.failureCount !== failureCount || evidence.action !== expected.action || evidence.state.active?.explicitToPlayer !== true) {
        throw new Error(`${template} 第 ${failureCount} 次失败没有显式执行 ${expected.action}：${JSON.stringify(evidence)}。`);
      }
      if (!evidence.message.includes(cause) || !evidence.message.includes(expected.message) || !evidence.meta.includes(`连续失败 ${failureCount} 次`)) {
        throw new Error(`${template} 第 ${failureCount} 次失败帮助没有同时说明真实原因、合同建议和连续次数。`);
      }
      observedActions.push(String(evidence.action));
      if (failureCount < 4) {
        await page.locator("#start:visible, #restart:visible").first().click();
        await page.evaluate(() => {
          const debug = (window as any).__GAME_DEBUG__;
          if (debug?.getState?.()?.runtime?.awaitingRoute) debug.chooseFirstRoute?.();
        });
        await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 3_000 })
          .catch(async () => { throw new Error(`${template} 第 ${failureCount} 次失败后点击“再来一局”没有恢复 playing，当前为 ${await page.locator("body").getAttribute("data-game-state")}。`); });
      }
    }
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__?.getAssistance), undefined, { timeout: 8_000 });
    const restored = await page.evaluate(() => ({ state: (window as any).__GAME_DEBUG__.getAssistance(), visible: !document.querySelector<HTMLElement>("#failure-assistance")?.hidden }));
    if (restored.state.active?.failureCount !== 4 || !restored.visible) throw new Error(`${template} 刷新后没有恢复第 4 次失败帮助。`);
    await page.locator("#start:visible").click();
    await page.evaluate(() => (window as any).__GAME_DEBUG__.forceWin());
    const reset = await page.evaluate(() => (window as any).__GAME_DEBUG__.getAssistance());
    const resetAfterWin = reset.active === null && Object.keys(reset.consecutiveFailuresByLevel ?? {}).length === 0;
    if (!resetAfterWin) throw new Error(`${template} 成功后没有清除连续失败计数。`);
    if (runtimeErrors.length) throw new Error(`${template} 失败辅助浏览器错误：${runtimeErrors.join(" | ")}`);
    const result: FailureAssistanceQualityResult = { template, observedActions, persistedFailureCount: 4, resetAfterWin, hiddenAdaptation: false };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "ASSISTANCE_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

function runtimeDifficultySignature(template: FailureAssistanceTemplate, runtime: any) {
  const signatures: Record<FailureAssistanceTemplate, unknown> = {
    "signal-hunt": { tier: runtime.tier, goal: runtime.goal, duration: runtime.duration, targetStepX: runtime.targetStepX, targetStepY: runtime.targetStepY },
    tetris: { tier: runtime.tier, target: runtime.lineTarget, fall: runtime.fallInterval, lock: runtime.lockDelayMs },
    breakout: { chapter: runtime.chapter, pattern: runtime.pattern, formation: runtime.formationIndex, bricks: runtime.brickCount, armor: runtime.armoredBricks, special: runtime.specialBrickCounts },
    snake: { tier: runtime.tier, name: runtime.levelName, layout: runtime.layoutSignature, target: runtime.target, obstacles: runtime.obstacleCount, step: runtime.stepDelay },
    "space-shooter": { tier: runtime.tier, target: runtime.killTarget, waves: runtime.waveCount, archetypes: runtime.enemyArchetypeCount, lives: runtime.maxLives },
    "merge-2048": { name: runtime.blueprintName, target: runtime.target, mission: runtime.missionType, missionValue: runtime.missionValue, moveLimit: runtime.moveLimit, undo: runtime.undoCredits },
    klotski: { tier: runtime.tier, name: runtime.blueprintName, optimal: runtime.optimalReference, pieces: runtime.pieceState },
    puzzle: { chapter: runtime.chapter, name: runtime.levelName, pieces: runtime.pieceCount, grid: runtime.grid, edgeOnly: runtime.edgeOnly, hints: runtime.hintsRemaining },
    "block-place": { tier: runtime.tier, chapter: runtime.chapter, name: runtime.levelName, target: runtime.target, hardShapeRate: runtime.hardShapeRate, opening: runtime.openingSignature },
    "polyomino-fit": { tier: runtime.tier, chapter: runtime.chapter, name: runtime.levelName, targetCells: runtime.targetCellCount, board: runtime.boardSize, pieces: runtime.pieceCount, contour: runtime.contourSignature },
    "region-logic": { chapter: runtime.chapter, name: runtime.name, size: runtime.size, stars: runtime.starsPerUnit, logic: runtime.logicTraceSteps, contradictions: runtime.contradictionSteps, layout: runtime.layoutSignature },
    "mahjong-roguelite": { tier: runtime.tier, rule: runtime.rule, remaining: runtime.remaining, sealed: runtime.sealedCount, routePool: runtime.routePoolSize },
    collector: { tier: runtime.tier, checkpoints: runtime.checkpointTarget, obstacles: runtime.obstacleCount, hazards: runtime.hazardCount, movingHazards: runtime.movingHazardCount, duration: runtime.duration },
    arena: { tier: runtime.tier, enemyTypes: runtime.enemyTypes, obstacles: runtime.obstacleCount, waveEnemies: runtime.waveEnemyCount, duration: runtime.duration },
  };
  return JSON.stringify(signatures[template]);
}

export async function inspectDifficultyProgressionInBrowser(root: string, template: FailureAssistanceTemplate): Promise<DifficultyProgressionQualityResult> {
  const executablePath = requireBrowserExecutable(`${template} 难度递进验收`);
  const contract = JSON.parse(readFileSync(join(root, "_studio", "GAME_DESIGN_CONTRACT.json"), "utf8")) as { content?: { beats?: Array<{ difficulty?: Record<string, number> }> } };
  const beats = contract.content?.beats ?? [];
  const dimensions = ["cognition", "operation", "space", "resources", "combination", "punishment"];
  for (let index = 1; index < beats.length; index += 1) {
    const jumped = dimensions.filter((dimension) => Number(beats[index].difficulty?.[dimension]) - Number(beats[index - 1].difficulty?.[dimension]) > 1);
    if (jumped.length > 1) throw new Error(`${template} 设计合同在阶段 ${index + 1} 同时突升 ${jumped.join("、")}。`);
  }
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("Failed to load resource")) runtimeErrors.push(`console: ${message.text()}`); });
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__?.setLevel), undefined, { timeout: 8_000 });
    await page.locator("#start:visible").click();
    await page.evaluate(() => (window as any).__GAME_DEBUG__.skipOnboarding?.());
    const levels: Array<{ campaign: any; runtime: any }> = [];
    for (let level = 1; level <= 20; level += 1) {
      await page.evaluate((value) => {
        const debug = (window as any).__GAME_DEBUG__;
        debug.setLevel(value); debug.restart();
        if (debug.getState?.()?.runtime?.awaitingRoute) debug.chooseFirstRoute?.();
      }, level);
      await page.waitForFunction((value) => {
        const state = (window as any).__GAME_DEBUG__?.getState?.();
        return state?.campaign?.level?.number === value && (state?.runtime?.level == null || state.runtime.level === value);
      }, level, { timeout: 5_000 });
      levels.push(await page.evaluate(() => {
        const state = (window as any).__GAME_DEBUG__.getState();
        return { campaign: state.campaign.level, runtime: state.runtime };
      }));
    }
    let maximumMultiplierStep = 0;
    for (let index = 1; index < levels.length; index += 1) {
      for (const key of ["goalMultiplier", "speedMultiplier", "densityMultiplier"] as const) {
        const step = Number((Number(levels[index].campaign[key]) - Number(levels[index - 1].campaign[key])).toFixed(3));
        maximumMultiplierStep = Math.max(maximumMultiplierStep, step);
        if (step < 0 || step > .12) throw new Error(`${template} 第 ${index}→${index + 1} 关的 ${key} 变化 ${step} 超出平滑范围。`);
      }
    }
    const tierSignatures = [1, 5, 9, 13, 17].map((level) => runtimeDifficultySignature(template, levels[level - 1].runtime));
    if (new Set(tierSignatures).size !== tierSignatures.length) throw new Error(`${template} 五个难度阶段没有形成五种不同的运行时结构。`);
    if (runtimeErrors.length) throw new Error(`${template} 难度递进浏览器错误：${runtimeErrors.join(" | ")}`);
    const result: DifficultyProgressionQualityResult = { template, levelsChecked: levels.length, beatTransitionsChecked: Math.max(0, beats.length - 1), tierSignatures, maximumMultiplierStep };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "DIFFICULTY_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectSignalHuntOnboardingInBrowser(root: string): Promise<SignalHuntOnboardingQualityResult> {
  const executablePath = requireBrowserExecutable("信号捕获新手教学验收");
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
    await page.locator("#start").click();
    const initial = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    await page.waitForTimeout(1_150);
    const beforeLearning = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    const safeTimerPaused = beforeLearning.remaining === initial.remaining && beforeLearning.onboarding.status === "active";
    if (!safeTimerPaused) throw new Error("首次捕获前倒计时没有暂停，玩家未获得安全尝试。 ");

    await page.locator("#target").click();
    await page.waitForFunction(() => (window as any).__GAME_DEBUG__.getOnboarding().status === "completed", undefined, { timeout: 2_000 });
    const completed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    if (completed.acceptedSignals[0]?.signal !== "target-collected") throw new Error("真实点击目标没有产生 target-collected 教学信号。 ");
    await page.waitForTimeout(1_150);
    const afterLearning = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    const timerResumedAfterLearning = afterLearning.remaining < beforeLearning.remaining;
    if (!timerResumedAfterLearning) throw new Error("完成首次捕获后倒计时没有恢复。 ");

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => Boolean((window as Window & { __GAME_DEBUG__?: unknown }).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    const restored = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const persistedCompletion = restored.status === "completed" && restored.completedStepIds.length === 1;
    if (!persistedCompletion) throw new Error("信号捕获教学完成状态没有在刷新后恢复。 ");
    await page.getByRole("button", { name: "重看" }).click();
    const replayed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    await page.getByRole("button", { name: "跳过教学" }).click();
    const skipped = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const replayedAndSkipped = replayed.status === "active" && skipped.status === "skipped" && skipped.skippedStepIds.length === 1;
    if (!replayedAndSkipped) throw new Error("信号捕获教学的重看或跳过不可用。 ");
    if (runtimeErrors.length) throw new Error(`信号捕获教学浏览器错误：${runtimeErrors.join(" | ")}`);

    const result = { completedStepIds: completed.completedStepIds, acceptedSignals: completed.acceptedSignals, safeTimerPaused, timerResumedAfterLearning, persistedCompletion, replayedAndSkipped };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "ONBOARDING_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), game: "signal-hunt", ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
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

async function dismissFirstVisitHelp(page: Page) {
  // Exercise the intentional first-visit modal through its public close button.
  const help = page.locator('#game-help-dialog[open] #game-help-close');
  if (await help.isVisible()) await help.click();
}

async function runInteractionProbe(page: Page) {
  await dismissFirstVisitHelp(page);
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

export async function inspectCampaignInBrowser(
  root: string,
  options: { initialSelection?: "sequential" | "all" } = {},
): Promise<CampaignQualityResult> {
  const executablePath = requireBrowserExecutable();
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
    const expectedInitialValues = options.initialSelection === "all"
      ? Array.from({ length: 20 }, (_, index) => index)
      : [0];
    if (initial.enabledValues.join(",") !== expectedInitialValues.join(",")) throw new Error(`初始可选关卡范围错误：${initial.enabledValues.join(",")}。`);
    if (initial.state?.campaign?.total !== 20 || initial.state?.campaign?.level?.number !== 1) throw new Error("运行时没有从第 1 / 20 关开始。 ");

    await dismissFirstVisitHelp(page);

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
  const executablePath = requireBrowserExecutable("阶段 E 验收");
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
    if (template === "mahjong-roguelite") await page.locator("[data-mahjong-mode]").selectOption("daily");
    await page.locator("#start").click();
    let routeOffer: any = null;
    if (template === "mahjong-roguelite") {
      await page.waitForFunction(() => document.body.dataset.gameState === "paused" && (window as any).__GAME_DEBUG__.getState().runtime.awaitingRoute, undefined, { timeout: 4_000 });
      routeOffer = await stageEDebugState(page);
      if (!routeOffer?.runtime?.awaitingRoute || routeOffer.runtime.routeChoices.length !== 3) throw new Error("月港雀旅开局没有提供三选一路线。 ");
      await stageEDebugAction(page, "chooseFirstRoute");
    }
    await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 4_000 });
    const initial = await stageEDebugState(page);
    let restored: any = null;
    let advanced: any = null;
    let selectedCue: any = null;
    let regionSurvey: any[] | null = null;
    let regionInteraction: any = null;
    if (template === "region-logic") {
      regionSurvey = [];
      mkdirSync(join(root, "_studio", "quality"), { recursive: true });
      await stageEDebugAction(page, "unlockAllLevels");
      for (let level = 1; level <= 20; level += 1) {
        const state = await page.evaluate((number) => {
          const debug = (window as any).__GAME_DEBUG__;
          debug.setLevel(number);
          debug.restart();
          return debug.getState().runtime;
        }, level);
        regionSurvey.push(state);
        if ([13, 20].includes(level)) await page.screenshot({ path: join(root, "_studio", "quality", `region-level-${String(level).padStart(2, "0")}.png`), fullPage: true });
      }
      if (regionSurvey.length !== 20 || new Set(regionSurvey.map((state) => state.layoutSignature)).size !== 20) throw new Error("星灵巡格没有形成 20 个不同布局。 ");
      const invalidRegionLevels = regionSurvey.filter((state) => state.uniqueSolutions !== 1 || !state.regionsConnected || !state.logicSolvable);
      if (invalidRegionLevels.length) throw new Error(`星灵巡格存在非唯一解、区域不连通或没有推理轨迹的关卡：${JSON.stringify(invalidRegionLevels.map((state) => ({ level: state.level, uniqueSolutions: state.uniqueSolutions, regionsConnected: state.regionsConnected, logicSolvable: state.logicSolvable })))}`);
      if (regionSurvey.slice(0, 12).some((state) => state.starsPerUnit !== 1) || regionSurvey.slice(12).some((state) => state.size !== 10 || state.starsPerUnit !== 2 || state.targetStars !== 20)) throw new Error("星灵巡格的一星到双星章节进程不符合设计合同。 ");
      await page.evaluate(() => {
        const debug = (window as any).__GAME_DEBUG__;
        debug.setLevel(1);
        debug.restart();
      });
      await stageEDebugAction(page, "probeDirectConflict");
      const directConflict = await stageEDebugState(page);
      if (directConflict?.runtime?.lastConflictType !== "direct-rule" || directConflict.runtime.errors !== 1) throw new Error("星灵巡格没有在格内拒绝直接相邻冲突。 ");
      await stageEDebugAction(page, "undoRegion");
      await stageEDebugAction(page, "cycleFirstCell");
      const cycled = await stageEDebugState(page);
      await stageEDebugAction(page, "undoRegion");
      const undone = await stageEDebugState(page);
      await stageEDebugAction(page, "redoRegion");
      const redone = await stageEDebugState(page);
      const hintsBefore = redone.runtime.hints;
      await page.locator('[data-control="hint"]').click();
      const observed = await stageEDebugState(page);
      if (observed.runtime.hints !== hintsBefore || observed.runtime.hintStage !== "observe") throw new Error("星灵巡格首次观察应免费。");
      await page.locator('[data-control="hint"]').click();
      const hinted = await stageEDebugState(page);
      if (cycled.runtime.stars !== 1 || undone.runtime.stars !== 0 || redone.runtime.stars !== 1 || redone.runtime.futureDepth !== 0) throw new Error("星灵巡格的循环输入、撤销或重做没有形成可恢复历史。 ");
      if (hinted.runtime.hints !== hintsBefore - 1 || !hinted.runtime.hintRule || hinted.runtime.hintUsesSolution !== false || hinted.runtime.stars !== redone.runtime.stars) throw new Error("星灵巡格的提示没有只解释一步推理。 ");
      const regionSessionEntries = await page.evaluate(() => Object.keys(localStorage).filter((key) => key.startsWith("forge-region-v3:")).map((key) => ({ key, value: localStorage.getItem(key) })));
      if (!regionSessionEntries.length) throw new Error("星灵巡格执行落子后没有写入浏览器断点。 ");
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.locator("#start").click();
      restored = await stageEDebugState(page);
      if (restored?.runtime?.restored || restored.runtime.stars !== 0) throw new Error(`星灵巡格重新打开后没有从空棋盘开始：${JSON.stringify({ restored: restored?.runtime, campaign: restored?.campaign?.level?.number, regionSessionEntries })}`);
      advanced = await page.evaluate(() => {
        const debug = (window as any).__GAME_DEBUG__;
        debug.setLevel(20);
        debug.restart();
        return debug.getState();
      });
      if (advanced?.runtime?.size !== 10 || advanced.runtime.starsPerUnit !== 2 || advanced.runtime.targetStars !== 20 || advanced.runtime.uniqueSolutions !== 1) throw new Error("星灵巡格最终章没有形成 10×10 双星唯一解。 ");
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(1); debug.restart(); });
      regionInteraction = { directConflict: directConflict.runtime, cycled: cycled.runtime, undone: undone.runtime, redone: redone.runtime, hinted: hinted.runtime };
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
    const completeAction = template === "region-logic" ? "solveRegion" : "completeMahjongStage";
    const failAction = template === "region-logic" ? "failRegion" : "failMahjong";
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
    if (template === "region-logic" && (initial?.runtime?.catalogSize !== 20 || initial.runtime.campaignSignatureCount !== 20 || initial.runtime.uniqueSolutions !== 1 || !initial.runtime.regionsConnected || initial.runtime.hintUsesSolution !== false)) throw new Error(`星灵巡格首关合同不完整：${JSON.stringify(initial.runtime)}`);
    if (template === "region-logic" && (initial.runtime.size !== 6 || initial.runtime.starsPerUnit !== 1 || initial.runtime.boardAreaVersion < 2)) throw new Error("星灵巡格首关没有形成 6×6 一星大棋盘。 ");
    if (template === "region-logic" && (advanced?.runtime?.size !== 10 || advanced.runtime.starsPerUnit !== 2 || advanced.runtime.targetStars !== 20 || advanced.runtime.logicTraceSteps <= initial.runtime.logicTraceSteps)) throw new Error("星灵巡格后期关没有形成更长的 10×10 双星推理链。 ");
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
    const result: StageEQualityResult = { template, completedRuns: 3, failedRuns: 2, evidence: { routeOffer: routeOffer?.runtime ?? null, initial: initial?.runtime, regionSurvey, regionInteraction, selectedCue: selectedCue?.runtime ?? null, advanced: advanced?.runtime ?? null, restored: restored?.runtime ?? null, completed: completedState?.runtime ?? null } };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "STAGE_E_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectStarDreamStageEInBrowser(root: string): Promise<StageEQualityResult> {
  const executablePath = requireBrowserExecutable("星梦对决阶段 E 验收");
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
    if (await page.locator('#game-help-dialog').isVisible()) await page.locator('#game-help-close').click();
    await page.locator('button[data-game-mode="duel"]').click();
    if (await page.locator('#game-help-dialog').isVisible()) await page.locator('#game-help-close').click();
    await page.locator("#ai-difficulty").selectOption("challenging");
    await page.locator("#start, #setup-start").click();
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
    if (initial?.runtime?.tacticalRuleVersion !== 3 || initial.runtime.campaignSignatureCount !== 20 || initial.runtime.chapterCount !== 5) {
      throw new Error(`星梦对决没有形成 20 个独立任务和五章战术合同：${JSON.stringify(initial?.runtime)}。`);
    }
    if (initial.runtime.aiLookahead !== 2 || initial.runtime.aiFairness !== "same-board-same-zone-same-resources" || initial.runtime.aiZoneReadable !== true) {
      throw new Error("星梦对决挑战 AI 没有两层回应评估，或 AI 半区仍不可读取。 ");
    }
    if (Object.keys(initial.runtime.tileRoles ?? {}).length !== 6) throw new Error("星梦对决六类棋子仍没有独立战术职责。 ");
    const overflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
    if (overflow > 1) throw new Error(`星梦对决 1280×720 仍纵向溢出 ${overflow}px。`);
    const qualityRoot = join(root, "_studio", "quality");
    mkdirSync(qualityRoot, { recursive: true });
    await page.screenshot({ path: join(qualityRoot, "star-dream-duel-desktop.png"), fullPage: true });
    await page.evaluate(() => {
      const debug = (window as any).__GAME_DEBUG__;
      debug.setLevel(5);
      debug.restart();
      debug.chargeSkills();
      debug.useBloom();
      debug.useVeil();
    });
    const skillState = await stageEDebugState(page);
    if (skillState.runtime.playerEnergy.bloom !== 2 || skillState.runtime.playerEnergy.veil !== 2 || skillState.runtime.playerShield !== 20) {
      throw new Error(`星梦对决技能没有正确消耗能量并产生持续状态：${JSON.stringify(skillState.runtime)}。`);
    }
    await page.screenshot({ path: join(qualityRoot, "star-dream-duel-skills.png"), fullPage: true });
    await page.evaluate(async () => {
      const debug = (window as any).__GAME_DEBUG__;
      debug.setLevel(9);
      debug.restart();
      debug.primeFourMatch();
      await debug.triggerPrimedFour();
    });
    const specialState = await stageEDebugState(page);
    if (specialState.runtime.specialCount < 1 || !specialState.runtime.specialTypes.includes("row") || specialState.phase !== "player") {
      throw new Error(`星梦对决四连没有生成持续星轨并保留行动权：${JSON.stringify(specialState)}。`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(qualityRoot, "star-dream-duel-special-phone.png"), fullPage: true });
    await page.evaluate(() => {
      const debug = (window as any).__GAME_DEBUG__;
      debug.setLevel(20);
      debug.restart();
    });
    const finalLevelState = await stageEDebugState(page);
    if (!finalLevelState.runtime.allowSkills || !finalLevelState.runtime.allowShapes || finalLevelState.runtime.blockerCount !== 6 || !finalLevelState.runtime.blockerLayoutSignature) {
      throw new Error(`星梦对决终章没有同时启用技能、特殊构形和独立障碍布局：${JSON.stringify(finalLevelState.runtime)}。`);
    }
    const mobileOverflow = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
    if (mobileOverflow > 1) throw new Error(`星梦对决 390×844 仍纵向溢出 ${mobileOverflow}px。`);
    await page.screenshot({ path: join(qualityRoot, "star-dream-duel-final-phone.png"), fullPage: true });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('button[data-game-mode="duel"]').click();
    await page.locator("#ai-difficulty").selectOption("challenging");
    await page.locator("#start, #setup-start").click();
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
    const result: StageEQualityResult = { template: "star-dream-duel", completedRuns: 3, failedRuns: 2, evidence: { initial: initial?.runtime, skills: skillState?.runtime, special: specialState?.runtime, finalLevel: finalLevelState?.runtime, restored: restored?.runtime, overflow, mobileOverflow, tileArt } };
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

async function stageCDebugActionAndState(page: Page, action: string) {
  return page.evaluate((actionName) => {
    const debug = (window as Window & { __GAME_DEBUG__?: Record<string, (() => unknown) | undefined> }).__GAME_DEBUG__;
    debug?.[actionName]?.();
    return debug?.getState?.();
  }, action) as Promise<any>;
}

export async function inspectStageDClassicInBrowser(root: string, template: StageDClassicTemplate): Promise<StageDQualityResult> {
  const executablePath = requireBrowserExecutable("阶段 D 验收");
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
      await page.keyboard.press("ArrowUp");
      const taught = await stageCDebugState(page);
      if (taught.runtime.currentPiece?.rotation !== 0 || taught.runtime.landing?.clearRows?.length !== 1) throw new Error("旋转教学后没有恢复可直接完成的首课。 ");
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
      await page.waitForTimeout(40);
      const moving = await stageCDebugState(page);
      const merged = await stageCDebugActionAndState(page, "finishAnimation");
      await stageCDebugAction(page, "undo");
      const undone = await stageCDebugState(page);
      await stageCDebugAction(page, "prepareDoubleMerge");
      await page.keyboard.press("ArrowLeft");
      await page.waitForTimeout(40);
      const doubleMerged = await stageCDebugActionAndState(page, "finishAnimation");
      await stageCDebugAction(page, "prepareDanger");
      const danger = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(17); debug.restart(); });
      const tierFive = await stageCDebugState(page);
      if (tierOne.runtime.blueprintCount !== 20 || tierOne.runtime.uniqueBlueprintNames !== 20) throw new Error("2048 二十关开局蓝图不唯一。 ");
      if (moving.runtime.animation?.duration !== 168) throw new Error(`2048 连续位移动画时长合同不完整：${JSON.stringify(moving.runtime.animation ?? null)}。 `);
      if (merged.runtime.score !== 4 || !merged.runtime.canUndo || !merged.runtime.spawnAnimated) throw new Error("2048 合并、生成动画或撤销快照不完整：" + JSON.stringify({ score: merged.runtime.score, canUndo: merged.runtime.canUndo, spawnAnimated: merged.runtime.spawnAnimated, board: merged.runtime.board, animation: merged.runtime.animation }) + "。 ");
      if (undone.runtime.score !== 0 || undone.runtime.undoCredits !== 1 || undone.runtime.canUndo) throw new Error("2048 限次回溯没有恢复完整状态。 ");
      if (doubleMerged.runtime.score !== 8 || doubleMerged.runtime.board?.[3]?.[0] !== 4 || doubleMerged.runtime.board?.[3]?.[1] !== 4) throw new Error("2048 的 2、2、2、2 没有按一次一并规则得到 4、4。 ");
      if (!danger.runtime.danger) throw new Error("2048 临近锁死时没有危险状态。 ");
      if (!(tierFive.runtime.target > tierOne.runtime.target)) throw new Error("2048 高阶关卡目标没有提升。 ");
      if (!tierOne.runtime.directSwipe || tierOne.runtime.spawnDistribution !== "90/10") throw new Error("2048 直接滑动或标准生成概率合同不完整。 ");
      checks.push("二十个独立关卡", "一次一并规则", "168ms 位移动画", "下一块预告", "限次回溯", "直接滑动", "标准 90/10 生成", "危险状态与递进目标");
      evidence.tierOne = tierOne.runtime; evidence.moving = moving.runtime; evidence.merged = merged.runtime; evidence.undone = undone.runtime; evidence.doubleMerged = doubleMerged.runtime; evidence.danger = danger.runtime; evidence.tierFive = tierFive.runtime;
    }

    if (template === "klotski") {
      const initial = await stageCDebugState(page);
      const canvasBox = await page.locator("#game-canvas").boundingBox();
      if (!canvasBox || !initial.runtime.dragProbe) throw new Error("华容道棋盘没有提供可执行的直接拖动目标。 ");
      const scaleX = canvasBox.width / initial.runtime.canvasSize.width;
      const scaleY = canvasBox.height / initial.runtime.canvasSize.height;
      await page.mouse.move(canvasBox.x + initial.runtime.dragProbe.from.x * scaleX, canvasBox.y + initial.runtime.dragProbe.from.y * scaleY);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + initial.runtime.dragProbe.to.x * scaleX, canvasBox.y + initial.runtime.dragProbe.to.y * scaleY, { steps: 6 });
      await page.mouse.up();
      await page.waitForTimeout(340);
      const dragged = await stageCDebugState(page);
      await stageCDebugAction(page, "undo");
      await stageCDebugAction(page, "hint");
      const hinted = await stageCDebugState(page);
      await stageCDebugAction(page, "legalMove");
      await page.waitForTimeout(340);
      const moved = await stageCDebugState(page);
      await stageCDebugAction(page, "undo");
      const undone = await stageCDebugState(page);
      await stageCDebugAction(page, "redo");
      const redone = await stageCDebugState(page);
      await stageCDebugAction(page, "undo");
      await stageCDebugAction(page, "legalMove");
      await page.waitForTimeout(340);
      await stageCDebugAction(page, "legalMove");
      await page.waitForTimeout(340);
      const beforeReplay = await stageCDebugState(page);
      await stageCDebugAction(page, "replay");
      const replayed = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(20); debug.restart(); });
      await stageCDebugAction(page, "hint");
      const finalLevel = await stageCDebugState(page);
      if (initial.runtime.layoutCount !== 23 || initial.runtime.uniqueBlueprints !== 23 || initial.runtime.boardWidthRatio < 82 || initial.runtime.boardWidthRatio > 90) throw new Error("华容道独立布局数或棋盘占比不达标。 ");
      if (initial.runtime.transitionMs < 160 || initial.runtime.transitionMs > 220 || !initial.runtime.identityUsesShapeAndBitmap) throw new Error("华容道过渡或棋子识别方式不达标。 ");
      if (initial.runtime.pieceGap < 8 || initial.runtime.pieceOutlineWidth < 2 || initial.runtime.selectedOutlineWidth < 4 || !initial.runtime.incompleteArtIsCropped) throw new Error("华容道棋子边界或残缺素材裁切不达标。 ");
      if (!initial.runtime.optimalExact || initial.runtime.optimalReference !== 6 || initial.runtime.courseRooms !== 4 || finalLevel.runtime.courseRooms !== 3 || finalLevel.runtime.totalOptimal < initial.runtime.totalOptimal) throw new Error("华容题组没有呈现已验证的入门题和递进综合内容。 ");
      if (!initial.runtime.directDrag) throw new Error("华容道没有启用棋盘直接拖动。 ");
      if (dragged.runtime.moves !== 1 || !dragged.runtime.canUndo) throw new Error("华容道真实指针拖动没有完成一步移动。 ");
      if (!hinted.runtime.hint?.id || Math.abs(hinted.runtime.hint.dx) + Math.abs(hinted.runtime.hint.dy) !== 1 || !hinted.runtime.hintLegal || hinted.runtime.hintDistance !== initial.runtime.optimalReference) throw new Error("华容道首庭没有给出可执行的最短路径下一步。 ");
      if (!finalLevel.runtime.hintLegal || finalLevel.runtime.hintDistance !== finalLevel.runtime.optimalReference) throw new Error("华容道末关首庭没有给出与当前题面相符的最短路径。 ");
      if (moved.runtime.moves !== 1 || !moved.runtime.canUndo || undone.runtime.moves !== 0) throw new Error("华容道移动与撤销不可用。 ");
      if (!undone.runtime.canRedo || redone.runtime.moves !== 1 || redone.runtime.canRedo) throw new Error("华容道重做没有恢复移动状态。 ");
      if (beforeReplay.runtime.replayLength < 2 || replayed.runtime.replaying || replayed.runtime.moves !== beforeReplay.runtime.replayLength) throw new Error("华容道操作回放没有完整复现。 ");
      checks.push("23 个基础布局", "主题题组与精确单庭步数", "棋盘直接拖动", "82%–90% 棋盘占比", "形状与位图双重识别", "清晰棋子边界与完整素材裁切", "160–220ms 移动", "撤销、重做与回放");
      evidence.initial = initial.runtime; evidence.dragged = dragged.runtime; evidence.hinted = hinted.runtime; evidence.moved = moved.runtime; evidence.undone = undone.runtime; evidence.redone = redone.runtime; evidence.replayed = replayed.runtime; evidence.finalLevel = finalLevel.runtime;
    }

    if (template === "puzzle") {
      const tierOne = await stageCDebugState(page);
      const pointerProbe = await stageCDebugAction(page, "pointerProbe") as { from: { x: number; y: number }; to: { x: number; y: number }; canvas: { width: number; height: number } } | null;
      const puzzleCanvas = await page.locator("#game-canvas").boundingBox();
      if (!pointerProbe || !puzzleCanvas) throw new Error("拼图没有提供可执行的真实拖动目标。 ");
      const puzzleScaleX = puzzleCanvas.width / pointerProbe.canvas.width;
      const puzzleScaleY = puzzleCanvas.height / pointerProbe.canvas.height;
      await page.mouse.move(puzzleCanvas.x + pointerProbe.from.x * puzzleScaleX, puzzleCanvas.y + pointerProbe.from.y * puzzleScaleY);
      await page.mouse.down();
      await page.mouse.move(puzzleCanvas.x + pointerProbe.to.x * puzzleScaleX, puzzleCanvas.y + pointerProbe.to.y * puzzleScaleY, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(80);
      const dragged = await stageCDebugState(page);
      await stageCDebugAction(page, "selectNext");
      await page.keyboard.press("ArrowRight");
      await stageCDebugAction(page, "placeSelectedAtHome");
      const placed = await stageCDebugState(page);
      await stageCDebugAction(page, "connectPair");
      const connected = await stageCDebugState(page);
      await page.locator('[data-control="hint"]').click();
      const observed = await stageCDebugState(page);
      if (observed.runtime.hintsRemaining !== connected.runtime.hintsRemaining || observed.runtime.workshop?.hintStage !== "reason") throw new Error("拼图首次线索应免费解释。");
      await page.locator('[data-control="hint"]').click();
      const hinted = await stageCDebugState(page);
      await stageCDebugAction(page, "zoomIn");
      const zoomed = await stageCDebugState(page);
      await stageCDebugAction(page, "pause");
      const paused = await stageCDebugState(page);
      await stageCDebugAction(page, "pause");
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(20); debug.restart(); });
      await page.waitForTimeout(150);
      const tierFive = await stageCDebugState(page);
      await page.locator("#puzzle-upload").setInputFiles(join(root, "assets", "level-gallery-02.png"));
      await page.waitForFunction(() => (window as any).__GAME_DEBUG__?.getState?.()?.runtime?.imageLevel === "custom", undefined, { timeout: 4_000 });
      const uploaded = await stageCDebugState(page);
      if (tierOne.runtime.imageLevelCount < 20 || tierOne.runtime.perimeterZones !== 4) throw new Error("拼图没有 20 个内置图案或四区外围托盘。 ");
      if (tierOne.runtime.imageLevel === tierFive.runtime.imageLevel) throw new Error("拼图首关与末关复用了同一张图片。 ");
      if (Math.abs(tierOne.runtime.boardAspect - tierOne.runtime.imageAspect) > .02) throw new Error("拼图画板没有适配图像比例。 ");
      if (dragged.runtime.placedCount !== 1 || !tierOne.runtime.clickPlacement || !tierOne.runtime.keyboardPlacement || placed.runtime.placedCount !== 2) throw new Error(`拼图真实拖动、键盘或吸附不可用：${JSON.stringify({ dragged: dragged.runtime, placed: placed.runtime })}。`);
      if (!tierOne.runtime.complementaryEdges || tierOne.runtime.grid.product !== tierOne.runtime.pieceCount || tierOne.runtime.outsideCount !== tierOne.runtime.pieceCount || tierOne.runtime.uniqueCenters !== tierOne.runtime.pieceCount) throw new Error(`拼图几何、互补接口或无重叠外围排布不达标：${JSON.stringify(tierOne.runtime)}。`);
      if (!connected.runtime.groupMovement || connected.runtime.largestGroup < 2 || connected.runtime.connectionCount < 1) throw new Error("相邻拼块没有形成可整体移动的连接组。 ");
      if (!(hinted.runtime.hintsRemaining < connected.runtime.hintsRemaining) || zoomed.runtime.zoom <= 1 || !zoomed.runtime.panEnabled || !paused.runtime.paused) throw new Error("提示、缩放平移或暂停不可用。 ");
      if (!(tierFive.runtime.pieceCount > tierOne.runtime.pieceCount) || tierFive.runtime.pieceCount !== 50 || tierFive.runtime.outsideCount !== 50 || tierFive.runtime.uniqueCenters !== 50 || tierFive.runtime.trayScale < .42) throw new Error(`拼图末关没有形成 50 块可选择的四区外围布局：${JSON.stringify(tierFive.runtime)}。`);
      if (!tierFive.runtime.uploadAdaptive || uploaded.runtime.imageLevel !== "custom" || Math.abs(uploaded.runtime.boardAspect - uploaded.runtime.imageAspect) > .02) throw new Error(`拼图没有真实载入并适配用户上传图片：${JSON.stringify(uploaded.runtime)}。`);
      checks.push("20 个不重复内置位图关卡", "6–50 块五章渐进", "真实指针拖动与键盘归位", "图像与上传比例自适应", "四区外围无重叠整理", "互补拼缝与成组移动", "缩放平移、筛边、预览、提示和暂停", "经典与限时模式");
      evidence.tierOne = tierOne.runtime; evidence.dragged = dragged.runtime; evidence.placed = placed.runtime; evidence.connected = connected.runtime; evidence.hinted = hinted.runtime; evidence.zoomed = zoomed.runtime; evidence.paused = paused.runtime; evidence.tierFive = tierFive.runtime; evidence.uploaded = uploaded.runtime;
    }

    if (template === "block-place") {
      const levelNames = new Set<string>();
      const openingSignatures = new Set<string>();
      const chapters = new Set<string>();
      let firstLevel: any = null;
      let finalLevel: any = null;
      for (let level = 1; level <= 20; level += 1) {
        const state = await page.evaluate((targetLevel) => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(targetLevel); debug.restart(); return debug.getState(); }, level);
        levelNames.add(state.runtime.levelName);
        openingSignatures.add(state.runtime.openingSignature);
        chapters.add(state.runtime.chapter);
        if (level === 1) firstLevel = state.runtime;
        if (level === 20) finalLevel = state.runtime;
      }
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(1); debug.restart(); });
      const tierOne = await stageCDebugState(page);
      const batchSurvey = await stageCDebugAction(page, "surveyBatches") as { count: number; valid: number };
      for (let index = 0; index < 4; index += 1) {
        await stageCDebugAction(page, "regenerate");
        const state = await stageCDebugState(page);
        if (!state.runtime.batchGuaranteed) throw new Error("果冻填阵生成了不可连续放完的候选批次。 ");
      }
      const pointerProbe = await stageCDebugAction(page, "pointerProbe") as { from: { x: number; y: number }; to: { x: number; y: number }; canvas: { width: number; height: number } } | null;
      const blockCanvas = await page.locator("#game-canvas").boundingBox();
      if (!pointerProbe || !blockCanvas) throw new Error("果冻填阵没有提供可执行的真实拖动目标。 ");
      const blockScaleX = blockCanvas.width / pointerProbe.canvas.width;
      const blockScaleY = blockCanvas.height / pointerProbe.canvas.height;
      await page.mouse.move(blockCanvas.x + pointerProbe.from.x * blockScaleX, blockCanvas.y + pointerProbe.from.y * blockScaleY);
      await page.mouse.down();
      await page.mouse.move(blockCanvas.x + pointerProbe.to.x * blockScaleX, blockCanvas.y + pointerProbe.to.y * blockScaleY, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(80);
      const dragged = await stageCDebugState(page);
      await stageCDebugAction(page, "hint");
      const hinted = await stageCDebugState(page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 8_000 });
      await page.locator("#start:visible").click();
      const restored = await stageCDebugState(page);
      await stageCDebugAction(page, "clearSession");
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setEndlessMode(); debug.restart(); });
      const endless = await stageCDebugState(page);
      await stageCDebugAction(page, "legalAction");
      const endlessScored = await stageCDebugState(page);
      await page.evaluate(() => { (window as any).__GAME_DEBUG__.restart(); });
      const endlessRestarted = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setDailyMode(); debug.restart(); });
      const daily = await stageCDebugState(page);
      await page.evaluate(() => { (window as any).__GAME_DEBUG__.restart(); });
      const dailyRestarted = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setJourneyMode(); debug.restart(); });
      await stageCDebugAction(page, "prepareDanger");
      const danger = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(20); debug.restart(); });
      const tierFive = await stageCDebugState(page);
      if (!tierOne.runtime.batchGuaranteed || !danger.runtime.danger) throw new Error("果冻填阵缺少可解批次保证或危险预警。 ");
      if (tierOne.runtime.blueprintCount !== 20 || levelNames.size !== 20 || chapters.size !== 5 || openingSignatures.size < 18) throw new Error(`果冻填阵二十关蓝图或开局变化不足：${JSON.stringify({ levelNames: levelNames.size, chapters: chapters.size, openingSignatures: openingSignatures.size })}。`);
      if (!(finalLevel.target > firstLevel.target) || !(finalLevel.hardShapeRate > firstLevel.hardShapeRate) || finalLevel.hintsRemaining >= firstLevel.hintsRemaining) throw new Error("果冻填阵没有形成目标、复杂构件和提示资源的五章渐进。 ");
      if (!batchSurvey || batchSurvey.count !== 100 || batchSurvey.valid !== 100) throw new Error(`果冻填阵百批候选可连续落完验证失败：${JSON.stringify(batchSurvey)}。`);
      if (dragged.runtime.piecesRemaining !== 2 || dragged.runtime.score <= 0 || !restored.runtime.restored || restored.runtime.score !== dragged.runtime.score) throw new Error(`果冻填阵真实拖动或中断续玩不可用：${JSON.stringify({ dragged: dragged.runtime, restored: restored.runtime })}。`);
      if (!(hinted.runtime.hintsRemaining < dragged.runtime.hintsRemaining)) throw new Error("果冻填阵提示次数没有消耗。 ");
      if (endless.runtime.mode !== "endless" || daily.runtime.mode !== "daily") throw new Error("果冻填阵旅程、每日与无尽模式没有共用运行时切换。 ");
      if (endlessScored.runtime.bestScore <= 0 || endlessRestarted.runtime.bestScore !== endlessScored.runtime.bestScore) throw new Error("果冻填阵无尽模式个人最佳没有跨局保留。 ");
      if (daily.runtime.dailySeed <= 0 || dailyRestarted.runtime.dailySeed !== daily.runtime.dailySeed || dailyRestarted.runtime.candidateSignature !== daily.runtime.candidateSignature) throw new Error("果冻填阵每日模式同日局面不可复现。 ");
      if (tierOne.runtime.candidateUi.style !== "floating-pedestals" || tierOne.runtime.candidateUi.slotWidth < 190 || tierOne.runtime.candidateUi.selectedOutlineWidth < 2 || !tierOne.runtime.candidateUi.selectedHalo || !tierOne.runtime.candidateUi.numberedSlots) throw new Error("果冻填阵候选底座缺少清晰的悬浮层级。 ");
      if (tierOne.runtime.candidateUi.greenContrast < 4.5 || tierOne.runtime.candidateUi.greenPlate !== "#d9f7e9" || tierOne.runtime.candidateUi.greenOutline !== "#0b6b53") throw new Error("果冻填阵绿色拼块对比度不足。 ");
      if (!(tierFive.runtime.hardShapeRate > tierOne.runtime.hardShapeRate)) throw new Error("果冻填阵高阶关卡没有提高复杂构件比例。 ");
      checks.push("20 个五章渐进局面", "旅程、每日与无尽模式", "无尽最佳与每日同日复现", "真实指针拖动与抬升预览", "中断续玩", "百批可连续落完候选", "悬浮候选底座与高对比选中态", "绿色拼块 4.5:1 以上对比", "连击、消除与危险预警");
      evidence.tierOne = tierOne.runtime; evidence.dragged = dragged.runtime; evidence.hinted = hinted.runtime; evidence.restored = restored.runtime; evidence.endless = endless.runtime; evidence.endlessScored = endlessScored.runtime; evidence.endlessRestarted = endlessRestarted.runtime; evidence.daily = daily.runtime; evidence.dailyRestarted = dailyRestarted.runtime; evidence.danger = danger.runtime; evidence.tierFive = tierFive.runtime; evidence.progression = { levelNames: levelNames.size, chapters: chapters.size, openingSignatures: openingSignatures.size }; evidence.batchSurvey = batchSurvey;
    }

    if (template === "polyomino-fit") {
      const signatures: string[] = [];
      const pieceSignatures: string[] = [];
      const chapters = new Set<string>();
      let firstLevel: any = null;
      let finalLevel: any = null;
      for (let level = 1; level <= 20; level += 1) {
        const state = await page.evaluate((targetLevel) => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(targetLevel); debug.restart(); return debug.getState(); }, level);
        signatures.push(state.runtime.contourSignature);
        pieceSignatures.push(state.runtime.pieceSignature);
        chapters.add(state.runtime.chapter);
        if (level === 1) firstLevel = state.runtime;
        if (level === 20) finalLevel = state.runtime;
      }
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(1); debug.restart(); });
      const initial = await stageCDebugState(page);
      const levelSurvey = await stageCDebugAction(page, "surveyLevels") as { count: number; valid: number; uniqueTargets: number; uniquePieceSets: number; minArea: number; maxArea: number; minPieces: number; maxPieces: number };
      const canvasBox = await page.locator("#game-canvas").boundingBox();
      if (!canvasBox) throw new Error("软糖拼岛画布不可见。 ");
      const trayPoint = initial.runtime.trayFirstCenterCanvas;
      const canvasSize = initial.runtime.canvasSize;
      await page.mouse.click(
        canvasBox.x + trayPoint.x / canvasSize.width * canvasBox.width,
        canvasBox.y + trayPoint.y / canvasSize.height * canvasBox.height,
      );
      const clickedRotation = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.selectPiece(1); });
      const selectedOther = await stageCDebugState(page);
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.selectPiece(1); });
      const reselectedOther = await stageCDebugState(page);
      await page.evaluate(() => { (window as any).__GAME_DEBUG__.restart(); });
      const pointerProbe = await stageCDebugAction(page, "pointerProbe") as { from: { x: number; y: number }; to: { x: number; y: number }; invalidTo: { x: number; y: number }; canvas: { width: number; height: number } } | null;
      if (!pointerProbe) throw new Error("软糖拼岛没有提供真实拖动探针。 ");
      const scaleX = canvasBox.width / pointerProbe.canvas.width;
      const scaleY = canvasBox.height / pointerProbe.canvas.height;
      const drag = async (to: { x: number; y: number }) => {
        await page.mouse.move(canvasBox.x + pointerProbe.from.x * scaleX, canvasBox.y + pointerProbe.from.y * scaleY);
        await page.mouse.down();
        await page.mouse.move(canvasBox.x + to.x * scaleX, canvasBox.y + to.y * scaleY, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(80);
      };
      await drag(pointerProbe.invalidTo);
      const invalidDrag = await stageCDebugState(page);
      const validProbe = await stageCDebugAction(page, "pointerProbe") as typeof pointerProbe;
      if (!validProbe) throw new Error("软糖拼岛非法回弹后无法继续拖动。 ");
      await page.mouse.move(canvasBox.x + validProbe.from.x * scaleX, canvasBox.y + validProbe.from.y * scaleY);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + validProbe.to.x * scaleX, canvasBox.y + validProbe.to.y * scaleY, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(80);
      const placed = await stageCDebugState(page);
      const beforeHintRotation = placed.runtime.selectedRotation;
      await stageCDebugAction(page, "hint");
      const regionHint = await stageCDebugState(page);
      await stageCDebugAction(page, "hint");
      const anchorHint = await stageCDebugState(page);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 8_000 });
      await page.locator("#start:visible").click();
      const restored = await stageCDebugState(page);
      await stageCDebugAction(page, "undo");
      const undone = await stageCDebugState(page);
      await page.evaluate(() => { (window as any).__GAME_DEBUG__.restart(); });
      const reset = await stageCDebugState(page);
      if (new Set(signatures).size !== 20 || new Set(pieceSignatures).size !== 20 || chapters.size !== 5) throw new Error("软糖拼岛没有形成 20 个独立轮廓、拼块组合与五章结构。 ");
      if (!levelSurvey || levelSurvey.count !== 20 || levelSurvey.valid !== 20 || levelSurvey.uniqueTargets !== 20 || levelSurvey.uniquePieceSets !== 20) throw new Error(`软糖拼岛原创关卡编译或已知解验证失败：${JSON.stringify(levelSurvey)}。`);
      if (initial.runtime.pieceCount < 4 || initial.runtime.targetCellCount < 15) throw new Error("软糖拼岛首关上方轮廓仍然过于简单。 ");
      if (initial.runtime.tray.slotWidth < 150 || initial.runtime.tray.cellSize < 38) throw new Error("软糖拼岛下方拼块卡槽或拼块显示尺寸不足。 ");
      if (!clickedRotation.runtime.clickToRotate || clickedRotation.runtime.selectedRotation !== (initial.runtime.selectedRotation + 1) % 4) throw new Error("点击下方拼块没有直接旋转。 ");
      if (selectedOther.runtime.rotationSignature !== reselectedOther.runtime.rotationSignature) throw new Error("软糖拼岛选择其他拼块时发生了意外旋转。 ");
      if (invalidDrag.runtime.placed !== 0 || invalidDrag.runtime.invalidMoves < 1 || placed.runtime.placed !== 1) throw new Error("软糖拼岛非法回弹或真实拖动吸附没有按合同工作。 ");
      if (regionHint.runtime.hintStage !== "region" || anchorHint.runtime.hintStage !== "anchor" || anchorHint.runtime.selectedRotation !== beforeHintRotation) throw new Error("软糖拼岛分层提示自动改变了方向或没有递进。 ");
      if (!restored.runtime.restored || restored.runtime.placed !== 1 || undone.runtime.placed !== 0 || reset.runtime.placed !== 0) throw new Error("软糖拼岛中断续玩、撤销或重置发生状态分叉。 ");
      if (!(finalLevel.targetCellCount > firstLevel.targetCellCount) || !(finalLevel.pieceCount > firstLevel.pieceCount) || levelSurvey.minPieces !== 4 || levelSurvey.maxPieces !== 8) throw new Error("软糖拼岛五章没有形成面积与拼块数量递进。 ");
      checks.push("20 个原创可解轮廓", "五章四至八块递进", "下方大尺寸拼块卡槽", "点击同块旋转而选择不旋转", "真实拖动与手指抬升", "非法放置回弹", "区域到锚点的分层提示", "提示不自动旋转", "中断续玩、撤销与重置");
      evidence.levelSurvey = levelSurvey; evidence.initial = initial.runtime; evidence.clickedRotation = clickedRotation.runtime; evidence.selectedOther = selectedOther.runtime; evidence.invalidDrag = invalidDrag.runtime; evidence.placed = placed.runtime; evidence.regionHint = regionHint.runtime; evidence.anchorHint = anchorHint.runtime; evidence.restored = restored.runtime; evidence.undone = undone.runtime; evidence.reset = reset.runtime;
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
  const executablePath = requireBrowserExecutable("阶段 C 验收");
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
    // 新手教学由独立浏览器用例验证。阶段 C 深度玩法验收先明确跳过，
    // 避免安全暂停把聚光、弹幕、碰撞等后续系统误判为失效。
    await page.evaluate(() => {
      const debug = (window as any).__GAME_DEBUG__;
      debug.restart();
      debug.replayOnboarding();
      debug.skipOnboarding();
    });

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
      if (pointerStart.runtime.waveCount !== 3 || pointerStart.runtime.currentWave !== 1) throw new Error("射击任务没有从三波结构的第一波开始。 ");
      if (pointerStart.runtime.enemyArchetypeCount < 5 || pointerStart.runtime.loadoutCount !== 3) throw new Error("射击模板的敌机类型或可选机体不足。 ");
      if (pointerStart.runtime.hudContract !== "energy-wave-score-boss" || pointerStart.runtime.abilityControl !== "space-f-touch-button") throw new Error("射击模板缺少战斗 HUD 或主动能力输入合同。 ");
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
      if (!heldState.runtime.enemyBulletVisual?.warmSolidCore || !heldState.runtime.enemyBulletVisual?.shapeDistinctFromPlayer) throw new Error("敌弹没有与玩家弹形成多重视觉区分。 ");
      const expectedShooterSeconds = heldState.runtime.level === 1 ? 120 : 180 + Math.floor((heldState.runtime.level - 2) / 4) * 30;
      if (heldState.runtime.estimatedSessionSeconds !== expectedShooterSeconds) throw new Error(`关卡有效作战基准应为 ${expectedShooterSeconds} 秒，实际为 ${heldState.runtime.estimatedSessionSeconds} 秒。`);
      await stageCDebugAction(page, "spawnThreatWave");
      const threatenedState = await stageCDebugState(page);
      if (threatenedState.runtime.enemyBulletCount < 5) throw new Error("敌机攻击没有形成可验证的弹幕压力。 ");
      await stageCDebugAction(page, "chargePulse");
      const chargedState = await stageCDebugState(page);
      if (!chargedState.runtime.pulseReady || chargedState.runtime.pulseCharge !== 100) throw new Error("脉冲能力无法充满。 ");
      await stageCDebugAction(page, "triggerPulse");
      const pulsedState = await stageCDebugState(page);
      if (pulsedState.runtime.pulseCharge !== 0 || !pulsedState.runtime.pulseEffectActive || pulsedState.runtime.enemyBulletCount >= threatenedState.runtime.enemyBulletCount) throw new Error("脉冲没有消耗能量、产生效果并清除敌弹。 ");
      await stageCDebugAction(page, "previewBoss");
      const bossState = await stageCDebugState(page);
      if (!bossState.runtime.bossActive || bossState.runtime.bossHp <= 0 || bossState.runtime.currentWave !== 3) throw new Error("守关 Boss 分支不可达。 ");
      await stageCDebugAction(page, "damageBossHalf");
      const bossPhaseState = await stageCDebugState(page);
      if (bossPhaseState.runtime.bossPhase !== 2 || bossPhaseState.runtime.bossHp >= bossPhaseState.runtime.bossMaxHp * .5) throw new Error("Boss 半血后没有进入第二阶段。 ");
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
      checks.push("三阶段连续作战", "五类敌机", "三种机体", "高对比双向弹体", "桌面鼠标悬停跟随", "手机按住拖动", "连续指针捕获", "主动脉冲清弹", "分阶段守关 Boss", "首关120秒、后续180–300秒基准", "受击与无敌", "修复掉落", "失败、胜利与重开");
      evidence.session = heldState.runtime;
      evidence.threat = threatenedState.runtime;
      evidence.pulse = pulsedState.runtime;
      evidence.boss = bossPhaseState.runtime;
      evidence.hoverPosition = hoverState.runtime.shipPosition;
      evidence.touchHeldPosition = touchHeldState.runtime.shipPosition;
      evidence.touchReleased = !touchReleasedState.runtime.pointerCaptured;
      evidence.damagedLives = damagedState.runtime.lives;
      evidence.repairedLives = repairedState.runtime.lives;
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
      const levels: any[] = [];
      for (let level = 1; level <= 20; level += 1) {
        levels.push(await page.evaluate((selectedLevel) => {
          const debug = (window as any).__GAME_DEBUG__;
          debug.setLevel(selectedLevel);
          debug.restart();
          return debug.getState().runtime;
        }, level));
      }
      if (new Set(levels.map((state) => state.levelName)).size !== 20 || new Set(levels.map((state) => state.layoutSignature)).size !== 20) throw new Error("青玉长游二十关没有形成独立名称与固定场型。 ");
      if (levels.some(state => state.foods.length !== state.foragePlan.population || state.foods.length < state.foragePlan.quota * state.foragePlan.phases)) throw new Error("青玉长游固定食物不足以支持整关采集目标。");
      if (new Set(levels.filter((_, index) => index % 4 === 0).map((state) => state.chapter)).size !== 5) throw new Error("青玉长游没有形成五个章节。 ");
      await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(1); debug.restart(); });
      await stageCDebugAction(page, "aimDiagonal");
      await page.waitForFunction(() => { const state = (window as any).__GAME_DEBUG__.getState().runtime; return state.direction.x > .2 && state.direction.y < -.2 && state.renderedFrames >= 8; });
      const turned = await stageCDebugState(page);
      if (turned.runtime.motionVersion !== 2 || turned.runtime.grid.columns < 42 || turned.runtime.grid.rows < 48) throw new Error("连续转向或大地图未启用。");
      await stageCDebugAction(page, "sampleReachableFood");
      const foodProbe = await stageCDebugState(page);
      if (foodProbe.runtime.foodProbe?.count !== 100 || !foodProbe.runtime.foodProbe?.valid) throw new Error("连续 100 次食物生成出现了不可达或占位错误。 ");
      await stageCDebugAction(page, "restart");
      await stageCDebugAction(page, "setSwipeMode");
      const swipeStart = await stageCDebugState(page);
      const box = await page.locator("#game-canvas").boundingBox();
      if (!box) throw new Error("未找到青玉长游画布。 ");
      await page.mouse.move(box.x + box.width * .55, box.y + box.height * .55);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .55, box.y + box.height * .38, { steps: 4 });
      await page.mouse.up();
      const swipeQueued = await stageCDebugState(page);
      if (!(swipeQueued.runtime.targetHeading < 0)) throw new Error("真实画布指向没有提交向上转向。 ");
      await stageCDebugAction(page, "pause");
      const pausedHead = (await stageCDebugState(page)).runtime.head;
      await page.waitForTimeout(Math.ceil(swipeStart.runtime.stepDelay * 1.4));
      const paused = await stageCDebugState(page);
      if (!paused.runtime.paused || paused.runtime.head.x !== pausedHead.x || paused.runtime.head.y !== pausedHead.y) throw new Error("暂停期间蛇仍在移动。 ");
      await page.keyboard.press("p");
      const resumed = await stageCDebugState(page);
      if (resumed.runtime.paused) throw new Error("键盘 P 没有恢复游戏。 ");
      if (turned.runtime.rendering !== "requestAnimationFrame-continuous" || turned.runtime.estimatedFps < 45 || turned.runtime.renderedFrames < 8) throw new Error(`青玉长游没有保持连续移动或稳定刷新：${JSON.stringify(turned.runtime)}。`);
      await stageCDebugAction(page, "previewCompletion");
      const completion = await stageCDebugState(page);
      if (!completion.runtime.completionActive) throw new Error("目标完成演出没有进入可见时段。 ");
      checks.push("九类独立位图资源", "20 个固定场型与五章", "三档多维难度", "连续角度转向与大地图", "真实画布指向", "100 次可达食物", "暂停与恢复", "连续移动与稳定刷新", "进食、危险与完成演出");
      evidence.profiles = profiles;
      evidence.turned = turned.runtime;
      evidence.levels = levels.map((state) => ({ level: state.level, name: state.levelName, chapter: state.chapter, pattern: state.pattern, signature: state.layoutSignature }));
      evidence.foodProbe = foodProbe.runtime.foodProbe;
      evidence.swipe = { targetHeading: swipeQueued.runtime.targetHeading };
      evidence.pause = paused.runtime;
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
  const executablePath = requireBrowserExecutable("十分钟持续输入验收");
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


export async function inspectThreeOnboardingInBrowser(root: string, mode: StageF3DMode): Promise<ThreeOnboardingQualityResult> {
  const executablePath = requireBrowserExecutable(`3D ${mode} 新手教学验收`);
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ executablePath, headless: true, args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(probeUrl(url), { waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    await page.locator("#start").click();
    const initial = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    await page.waitForTimeout(1_100);
    const waiting = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    const safePressurePaused = waiting.remaining === initial.remaining
        && waiting.health === initial.health
        && (mode === "collector" ? waiting.mistakes === initial.mistakes : waiting.projectileHits === initial.projectileHits);
    if (!safePressurePaused || waiting.onboarding?.status !== "active") throw new Error(`3D ${mode} 教学前仍在推进计时或危险。`);

    if (mode === "collector") {
      await page.keyboard.down("ArrowUp");
      await page.waitForTimeout(180);
      await page.keyboard.up("ArrowUp");
    } else if (mode === "arena") await page.keyboard.press("Space");
    else {
      await page.evaluate(() => {
        const debug = (window as any).__GAME_DEBUG__;
        for (const action of debug.solution()) {
          if (debug.getOnboarding().acceptedSignals.some(({ signal }: { signal: string }) => signal === "cell-entered")) break;
          if (action === "cw" || action === "ccw") debug.rotate(action);
          else { debug.enqueue([action]); debug.tickNow(); }
        }
        debug.rotate("cw");
      });
    }
    await page.waitForTimeout(260);
    const afterAction = await page.evaluate(() => (window as any).__GAME_DEBUG__.getState());
    const completed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    if (completed.status !== "completed") throw new Error(`3D ${mode} 教学操作后未完成：${JSON.stringify({ onboarding: completed, player: afterAction.player, shotsFired: afterAction.shotsFired, enemyCount: afterAction.enemyCount })}`);
    const expectedSignals = mode === "collector" ? ["player-moved"] : mode === "arena" ? ["shot-fired"] : ["cell-entered", "world-rotated"];
    if (JSON.stringify(completed.acceptedSignals.map(({ signal }: { signal: string }) => signal)) !== JSON.stringify(expectedSignals)) throw new Error(`3D ${mode} 的真实操作没有依次产生 ${expectedSignals.join("、")}。`);

    await page.reload({ waitUntil: "domcontentloaded", timeout: 8_000 });
    await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 8_000 });
    const restored = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const persistedCompletion = restored.status === "completed" && restored.completedStepIds.length === expectedSignals.length;
    if (!persistedCompletion) throw new Error(`3D ${mode} 教学完成状态未恢复。`);
    await page.getByRole("button", { name: "重看" }).click();
    const replayed = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    await page.getByRole("button", { name: "跳过教学" }).click();
    const skipped = await page.evaluate(() => (window as any).__GAME_DEBUG__.getOnboarding());
    const replayedAndSkipped = replayed.status === "active" && skipped.status === "skipped" && skipped.skippedStepIds.length === expectedSignals.length;
    if (!replayedAndSkipped) throw new Error(`3D ${mode} 的重看或跳过不可用。`);
    if (errors.length) throw new Error(`3D ${mode} 教学浏览器错误：${errors.join(" | ")}`);
    const result = { mode, completedStepIds: completed.completedStepIds, acceptedSignals: completed.acceptedSignals, safePressurePaused, persistedCompletion, replayedAndSkipped };
    mkdirSync(join(root, "_studio"), { recursive: true });
    writeFileSync(join(root, "_studio", "ONBOARDING_QUALITY_REPORT.json"), `${JSON.stringify({ checkedAt: new Date().toISOString(), ...result }, null, 2)}\n`, "utf8");
    return result;
  } finally {
    await browser?.close();
    await closeServer(server);
  }
}

export async function inspectStageF3DInBrowser(root: string, expectedMode: StageF3DMode): Promise<StageF3DQualityResult> {
  const executablePath = requireBrowserExecutable("3D 真检");
  const { server, url } = await startArtifactServer(root);
  let browser: Browser | null = null;
  let completedRuns = 0;
  let failedRuns = 0;
  const viewportsChecked: string[] = [];
  let performanceTier = "";
  let hiddenRenderPaused = false;
  let collectorCuratedModelsVerified = false;
  let arenaProjectileVerified = false;
  let arenaUpgradeVerified = false;
  mkdirSync(join(root, "_studio"), { recursive: true });
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
        await page.evaluate(() => {
          const debug = (window as any).__GAME_DEBUG__;
          debug.replayOnboarding?.();
          debug.skipOnboarding?.();
        });
        const initial = await page.evaluate(() => {
          const debug = (window as Window & { __GAME_DEBUG__?: { getState: () => Record<string, unknown> } }).__GAME_DEBUG__;
          const shell = document.querySelector(".three-shell")?.getBoundingClientRect();
          return { state: debug?.getState(), shell: shell ? { width: shell.width, height: shell.height } : null };
        });
        if (initial.state?.mode !== expectedMode) throw new Error(`预期 ${expectedMode}，实际 ${String(initial.state?.mode)}`);
        if (!initial.shell || initial.shell.width < 300 || initial.shell.height < 560) throw new Error("3D 主体未充分利用画幅");
        await page.screenshot({ path: join(root, "_studio", `stage-f-${expectedMode}-${viewport.name}-playing.png`), fullPage: true });
        performanceTier = String(initial.state?.performanceTier ?? "");
        if (expectedMode === "collector") {
          const collector = initial.state?.collector as Record<string, unknown> | undefined;
          if (collector?.blueprintCount !== 20 || collector.uniqueSignatures !== 20 || collector.chapterCount !== 5 || collector.optionalCollectibles !== true) {
            throw new Error(`3D 收集模板没有形成 20 个唯一蓝图、五章和可选收集分层：${JSON.stringify(collector)}`);
          }
          await page.waitForFunction(() => {
            const models = (window as any).__GAME_DEBUG__?.getState?.()?.collector?.curatedModels;
            return Boolean(models && models.loaded + models.failed.length >= models.requested);
          }, undefined, { timeout: 8_000 });
          const curatedModels = await page.evaluate(() => (window as any).__GAME_DEBUG__?.getState?.()?.collector?.curatedModels);
          if (curatedModels?.requested !== 3 || curatedModels.loaded !== 3 || curatedModels.failed.length !== 0 || curatedModels.meshCount < 3 || curatedModels.visibleObjects !== 3) {
            throw new Error(`3D 收集模板没有把三个精选 GLB 解析为可见场景对象：${JSON.stringify(curatedModels)}`);
          }
          collectorCuratedModelsVerified = true;
          const jumpProbe = await page.evaluate(() => (window as any).__GAME_DEBUG__?.prepareJumpObstacle?.());
          if (!jumpProbe?.obstacle) throw new Error("3D 收集模板没有可执行的低障碍跳跃探针");
          await page.keyboard.down("ArrowUp");
          await page.keyboard.press("Space");
          await page.waitForTimeout(560);
          await page.keyboard.up("ArrowUp");
          const jumped = await page.evaluate(() => (window as any).__GAME_DEBUG__?.getState?.());
          const clearedZ = Number(jumped?.player?.z) < Number(jumpProbe.obstacle.z) - 0.2 && Number(jumped?.player?.y) > Number(jumpProbe.obstacle.height);
          if (!clearedZ) throw new Error(`3D 收集模板的跳跃仍不能越过低障碍：${JSON.stringify({ jumpProbe, player: jumped?.player })}`);
          await page.evaluate(() => {
            const debug = (window as any).__GAME_DEBUG__;
            debug?.setLevel?.(3);
            debug?.restart?.();
            debug?.reachCheckpoint?.();
            debug?.triggerHazardRecovery?.();
          });
          const recovered = await page.evaluate(() => (window as any).__GAME_DEBUG__?.getState?.());
          if (recovered?.mistakes !== 1 || Math.hypot(Number(recovered?.player?.x) - Number(recovered?.collector?.respawn?.x), Number(recovered?.player?.z) - Number(recovered?.collector?.respawn?.z)) > 0.1) {
            throw new Error(`3D 收集模板没有从最近检查点一致恢复：${JSON.stringify(recovered)}`);
          }
          await page.evaluate(() => (window as any).__GAME_DEBUG__?.persistSession?.());
          await page.reload({ waitUntil: "domcontentloaded", timeout: 8_000 });
          await page.waitForFunction(() => Boolean((window as any).__GAME_DEBUG__), undefined, { timeout: 8_000 });
          await page.locator("#start").click();
          const restored = await page.evaluate(() => (window as any).__GAME_DEBUG__?.getState?.());
          if (restored?.restoredSession !== true || restored?.checkpointsReached !== recovered?.checkpointsReached || restored?.mistakes !== recovered?.mistakes) {
            throw new Error(`3D 收集模板刷新后没有恢复本关进度：${JSON.stringify({ recovered, restored })}`);
          }
          await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug?.setLevel?.(20); debug?.restart?.(); });
          const finalCollector = await page.evaluate(() => (window as any).__GAME_DEBUG__?.getState?.());
          if (finalCollector?.collector?.checkpointTarget !== 2 || finalCollector?.collector?.obstacleCount < 3 || finalCollector?.collector?.hazardCount < 3 || finalCollector?.collector?.movingHazardCount < 2 || finalCollector?.collector?.sessionRestore !== true) {
            throw new Error(`3D 收集模板终章没有形成双检查点与组合压力：${JSON.stringify(finalCollector?.collector)}`);
          }
          await page.screenshot({ path: join(root, "_studio", `stage-f-${expectedMode}-${viewport.name}-final-level.png`), fullPage: true });
        } else {
          const arena = initial.state?.arena as Record<string, unknown> | undefined;
          if (arena?.blueprintCount !== 20 || arena.uniqueSignatures !== 20 || arena.chapterCount !== 5 || arena.projectileModel !== "visible-travel-hit") {
            throw new Error(`3D 竞技场没有形成 20 个唯一蓝图、五章与可见弹体模型：${JSON.stringify(arena)}`);
          }
          const shotStart = await page.evaluate(() => {
            const debug = (window as any).__GAME_DEBUG__;
            const prepared = debug?.prepareArenaShot?.();
            debug?.attack?.();
            return { prepared, state: debug?.getState?.() };
          });
          if (!shotStart?.prepared || shotStart.state?.arena?.playerProjectileCount !== 1 || shotStart.state?.projectileHits !== shotStart.prepared.projectileHits) {
            throw new Error(`3D 竞技场攻击没有先生成可见弹体：${JSON.stringify(shotStart)}`);
          }
          await page.waitForFunction((hits) => (window as any).__GAME_DEBUG__?.getState?.().projectileHits > hits, shotStart.prepared.projectileHits, { timeout: 2_000 });
          const shotEnd = await page.evaluate(() => (window as any).__GAME_DEBUG__?.getState?.());
          if (shotEnd.renderCount <= shotStart.prepared.renderCount + 1) throw new Error("3D 竞技场弹体未经过可见飞行帧就结算命中。");
          arenaProjectileVerified = true;
          await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug?.setLevel?.(20); debug?.restart?.(); });
          const finalArena = await page.evaluate(() => (window as any).__GAME_DEBUG__?.getState?.());
          if (finalArena?.arena?.obstacleCount < 5 || finalArena?.arena?.enemyTypes?.length !== 4 || finalArena?.arena?.hasEliteWave !== true) {
            throw new Error(`3D 竞技场终章没有形成四类敌人、复杂掩体和精英波：${JSON.stringify(finalArena?.arena)}`);
          }
          await page.screenshot({ path: join(root, "_studio", `stage-f-${expectedMode}-${viewport.name}-final-level.png`), fullPage: true });
        }
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
          for (let wave = 1; wave <= 3; wave += 1) {
            await page.evaluate(() => (window as Window & { __GAME_DEBUG__?: { clearWave: () => void } }).__GAME_DEBUG__?.clearWave());
            if (wave < 3) {
              await page.waitForFunction(() => document.body.dataset.gameState === "upgrade", undefined, { timeout: 2_000 });
              const upgrade = await page.evaluate(() => {
                const debug = (window as any).__GAME_DEBUG__;
                return { before: debug?.getState?.(), optionCount: document.querySelectorAll("[data-upgrade-index]").length, build: document.querySelector("#arena-build")?.textContent };
              });
              if (!upgrade.before?.arena?.pendingUpgrade || upgrade.optionCount !== 3) throw new Error(`3D 竞技场波次间没有三个强化选择：${JSON.stringify(upgrade)}`);
              await page.evaluate(() => (window as any).__GAME_DEBUG__?.chooseUpgrade?.(0));
              await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 2_000 });
              const selected = await page.evaluate(() => ({ state: (window as any).__GAME_DEBUG__?.getState?.(), build: document.querySelector("#arena-build")?.textContent }));
              if (selected.state?.upgradeChoices !== wave || !selected.build || selected.build.includes("尚未选择")) throw new Error(`3D 竞技场强化没有持续展示或生效：${JSON.stringify(selected)}`);
              arenaUpgradeVerified = true;
            }
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
  const result: StageF3DQualityResult = { mode: expectedMode, completedRuns, failedRuns, evidence: { viewportsChecked, performanceTier, hiddenRenderPaused, ...(expectedMode === "collector" ? { collectorCuratedModelsVerified } : {}), ...(expectedMode === "arena" ? { arenaProjectileVerified, arenaUpgradeVerified } : {}) } };
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
  const executablePath = requireBrowserExecutable();
  const qualityRoot = join(root, "_studio", "quality");
  mkdirSync(qualityRoot, { recursive: true });
  const screenshotPaths: string[] = [];
  const failures: string[] = [];
  const evidence: string[] = [];
  let progressionReport: Record<string, unknown> | null = null;
  let variationReport: Record<string, unknown> | null = null;
  let assistanceReport: Record<string, unknown> | null = null;
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
          const onboardingWaiting = await page.evaluate(() => {
            const onboarding = (window as any).__FORGE_ONBOARDING__;
            const debug = (window as any).__GAME_DEBUG__;
            return { onboarding: onboarding?.getState?.(), plan: onboarding?.plan, game: debug?.getState?.(), visible: Boolean(document.querySelector(".forge-onboarding:not([hidden])")) };
          });
          await page.waitForTimeout(600);
          const pressureAfterWait = await page.evaluate(() => (window as any).__GAME_DEBUG__?.getState?.()?.pressureClock);
          if (onboardingWaiting.onboarding?.status !== "active" || !onboardingWaiting.visible || !Array.isArray(onboardingWaiting.plan?.steps)) {
            failures.push("开始后没有进入可见的合同教学状态。");
          }
          if (!Number.isFinite(onboardingWaiting.game?.pressureClock) || pressureAfterWait !== onboardingWaiting.game?.pressureClock) {
            failures.push(`教学等待期自动压力仍在推进：${String(onboardingWaiting.game?.pressureClock)} → ${String(pressureAfterWait)}。`);
          }
          await takeScreenshot(page, join(qualityRoot, `${viewport.name}-playing.png`), screenshotPaths);
          const hooks = await page.evaluate(() => {
            const debug = (window as any).__GAME_DEBUG__;
            return { hasState: Boolean(debug?.getState), hasWin: Boolean(debug?.forceWin), hasLose: Boolean(debug?.forceLose), hasOnboardingProbe: Boolean(debug?.performOnboardingStep) };
          });
          if (!hooks.hasState || !hooks.hasWin || !hooks.hasLose || !hooks.hasOnboardingProbe) {
            failures.push("probe 模式缺少 __GAME_DEBUG__ 的 getState/forceWin/forceLose/performOnboardingStep 钩子。");
          } else {
            const stepCount = onboardingWaiting.plan?.steps?.length ?? 0;
            for (let index = 0; index < stepCount; index += 1) {
              await page.evaluate(() => (window as any).__GAME_DEBUG__.performOnboardingStep());
              await page.waitForFunction((completed) => (window as any).__FORGE_ONBOARDING__?.getState?.()?.completedStepIds?.length > completed, index, { timeout: 3_000 })
                .catch(() => failures.push(`第 ${index + 1} 个教学探针没有通过正常玩法处理器完成。`));
            }
            const completedOnboarding = await page.evaluate(() => {
              const api = (window as any).__FORGE_ONBOARDING__;
              return { state: api.getState(), expectedSignals: api.plan.steps.map((step: any) => step.successSignal) };
            });
            const actualSignals = completedOnboarding.state?.acceptedSignals?.map(({ signal }: { signal: string }) => signal) ?? [];
            if (completedOnboarding.state?.status !== "completed" || JSON.stringify(actualSignals) !== JSON.stringify(completedOnboarding.expectedSignals)) {
              failures.push(`教学没有按合同信号顺序完成：${JSON.stringify({ expected: completedOnboarding.expectedSignals, actual: actualSignals })}。`);
            }
            await page.reload({ waitUntil: "domcontentloaded", timeout: 10_000 });
            await page.waitForFunction(() => Boolean((window as any).__FORGE_ONBOARDING__ && (window as any).__GAME_DEBUG__), undefined, { timeout: 5_000 });
            const restoredOnboarding = await page.evaluate(() => (window as any).__FORGE_ONBOARDING__.getState());
            if (restoredOnboarding.status !== "completed" || restoredOnboarding.completedStepIds.length !== stepCount) failures.push("教学完成状态刷新后没有恢复。");
            const replaySkip = await page.evaluate(() => {
              const api = (window as any).__FORGE_ONBOARDING__;
              api.replay(); const replayed = api.getState(); api.skip(); const skipped = api.getState();
              return { replayed, skipped };
            });
            if (replaySkip.replayed.status !== "active" || replaySkip.skipped.status !== "skipped" || replaySkip.skipped.skippedStepIds.length !== stepCount) failures.push("教学重看或跳过不可用。");
            await page.locator("#start").click({ timeout: 3_000 });
            await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 5_000 });
            const levelStates: Array<{ level: number; difficulty: Record<string, number>; contentVariant: string; runtimeSignature: string; mechanicsActive: string[] }> = [];
            for (let level = 1; level <= 20; level += 1) {
              const state = await page.evaluate((targetLevel) => {
                const debug = (window as any).__GAME_DEBUG__;
                debug.setLevel(targetLevel); debug.restart();
                return { ...debug.getState(), __gameState: document.body.dataset.gameState };
              }, level);
              if (state?.level !== level || state?.__gameState !== "playing") failures.push(`第 ${level} 关没有通过 setLevel/restart 真实进入 playing。`);
              const difficulty = state?.difficulty;
              if (![difficulty?.goalMultiplier, difficulty?.speedMultiplier, difficulty?.densityMultiplier].every(Number.isFinite)) failures.push(`第 ${level} 关缺少可验证的三维难度倍率。`);
              if (!state?.contentVariant || !state?.runtimeSignature || !Array.isArray(state?.mechanicsActive) || state.mechanicsActive.length === 0) failures.push(`第 ${level} 关缺少结构变化证据。`);
              levelStates.push({ level, difficulty, contentVariant: state?.contentVariant, runtimeSignature: state?.runtimeSignature, mechanicsActive: state?.mechanicsActive });
            }
            let maximumMultiplierStep = 0;
            for (let index = 1; index < levelStates.length; index += 1) {
              for (const key of ["goalMultiplier", "speedMultiplier", "densityMultiplier"] as const) {
                const step = Number((Number(levelStates[index].difficulty?.[key]) - Number(levelStates[index - 1].difficulty?.[key])).toFixed(3));
                maximumMultiplierStep = Math.max(maximumMultiplierStep, step);
                if (step < 0 || step > .12) failures.push(`第 ${index}→${index + 1} 关 ${key} 变化 ${step} 超出平滑范围。`);
              }
            }
            const milestoneStates = [1, 5, 9, 13, 17].map((level) => levelStates[level - 1]);
            if (new Set(milestoneStates.map(({ contentVariant }) => contentVariant)).size !== 5 || new Set(milestoneStates.map(({ runtimeSignature }) => runtimeSignature)).size !== 5) failures.push("第 1/5/9/13/17 关没有形成五种不同的规则与运行结构。");
            progressionReport = { checkedAt: new Date().toISOString(), levelsChecked: levelStates.length, maximumMultiplierStep, milestones: milestoneStates };

            const expectedVariationSignals = onboardingWaiting.plan.steps.map((step: any) => step.successSignal);
            await page.evaluate(`window.__forgeObservedSignals=[];window.__forgeSignalListener=function(event){window.__forgeObservedSignals.push(event.detail&&event.detail.signal)};addEventListener("forge:mechanic-signal",window.__forgeSignalListener);`);
            await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(9); debug.restart(); });
            for (let index = 0; index < expectedVariationSignals.length; index += 1) {
              await page.evaluate(() => (window as any).__GAME_DEBUG__.performOnboardingStep());
              await page.waitForTimeout(30);
            }
            const variation = await page.evaluate(() => {
              const forgeWindow = window as any;
              removeEventListener("forge:mechanic-signal", forgeWindow.__forgeSignalListener);
              return { state: forgeWindow.__GAME_DEBUG__.getState(), observed: [...forgeWindow.__forgeObservedSignals] };
            });
            if (!expectedVariationSignals.every((signal: string) => variation.observed.includes(signal)) || variation.state?.level !== 9) failures.push(`第 9 关没有通过正常玩法处理器复演全部教学机制：${JSON.stringify({ expected: expectedVariationSignals, observed: variation.observed })}。`);
            variationReport = { checkedAt: new Date().toISOString(), sourceLevel: 1, rehearsalLevel: 9, expectedSignals: expectedVariationSignals, observedSignals: variation.observed, contentVariant: variation.state?.contentVariant, runtimeSignature: variation.state?.runtimeSignature };

            const assistanceActions: string[] = [];
            await page.evaluate(() => { const debug = (window as any).__GAME_DEBUG__; debug.setLevel(1); debug.restart(); });
            for (let failureCount = 1; failureCount <= 4; failureCount += 1) {
              const cause = `生成玩法验收失败原因 ${failureCount}`;
              await page.evaluate((value) => (window as any).__GAME_DEBUG__.forceLose(value), cause);
              await page.waitForFunction(() => document.body.dataset.gameState === "lost" && Boolean((window as any).__FORGE_DESIGN__?.getAssistance?.()?.active), undefined, { timeout: 3_000 });
              const shown = await page.evaluate(() => ({ assistance: (window as any).__FORGE_DESIGN__.getAssistance(), visible: Boolean(document.querySelector<HTMLElement>(".forge-assistance:not([hidden])")?.getBoundingClientRect().height), message: document.querySelector("[data-forge-assistance-message]")?.textContent ?? "" }));
              const expected = [...(await page.evaluate(() => (window as any).__FORGE_DESIGN__.assistancePlan.steps))].filter((step: any) => step.afterFailures <= failureCount).at(-1) as any;
              if (shown.assistance.active?.failureCount !== failureCount || shown.assistance.active?.action !== expected.action || !shown.visible || !shown.message.includes(cause) || !shown.message.includes(expected.message)) failures.push(`第 ${failureCount} 次失败没有显式呈现真实原因和 ${expected.action} 合同帮助。`);
              assistanceActions.push(String(shown.assistance.active?.action));
              if (failureCount < 4) await page.evaluate(() => (window as any).__GAME_DEBUG__.restart());
            }
            await page.reload({ waitUntil: "domcontentloaded", timeout: 10_000 });
            await page.waitForFunction(() => Boolean((window as any).__FORGE_DESIGN__ && (window as any).__GAME_DEBUG__), undefined, { timeout: 5_000 });
            const restoredAssistance = await page.evaluate(() => (window as any).__FORGE_DESIGN__.getAssistance());
            if (restoredAssistance.active?.failureCount !== 4) failures.push("刷新后没有恢复第 4 次失败帮助。");
            await page.locator("#start").click({ timeout: 3_000 });
            await page.evaluate(() => (window as any).__GAME_DEBUG__.forceWin());
            await page.waitForTimeout(30);
            const resetAssistance = await page.evaluate(() => (window as any).__FORGE_DESIGN__.getAssistance());
            if (resetAssistance.active !== null || Object.keys(resetAssistance.consecutiveFailuresByLevel ?? {}).length !== 0) failures.push("成功后没有清除连续失败帮助状态。");
            assistanceReport = { checkedAt: new Date().toISOString(), observedActions: assistanceActions, persistedFailureCount: restoredAssistance.active?.failureCount, resetAfterWin: resetAssistance.active === null, hiddenAdaptation: false };
            await page.locator("#restart").click({ timeout: 3_000 });
            if (await page.locator("body").getAttribute("data-game-state") === "idle") await page.locator("#start").click({ timeout: 3_000 });
            await page.waitForFunction(() => document.body.dataset.gameState === "playing", undefined, { timeout: 5_000 });
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
          evidence.push("390×844 已验证教学安全等待→真实动作逐步完成→刷新恢复→重看/跳过，以及 idle→playing→won→重开→lost 完整状态环。");
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
    { id: "GEN-BROWSER-ONBOARDING", label: "生成游戏合同教学（安全状态、真实信号、恢复、重看与跳过）", status: failures.length ? "failed" : "passed", evidence: "已核对 pressureClock 停止、逐步动作探针、合同信号顺序与持久化状态。" },
    { id: "PROGRESSION-RUNTIME", label: "生成游戏二十关倍率平滑且五阶段结构不同", status: failures.length ? "failed" : "passed", evidence: "已逐关调用 setLevel/restart，并比较三维倍率、阶段规则与运行结构签名。" },
    { id: "CONTENT-VARIATION-REHEARSAL", label: "生成游戏在第 9 关复演全部教学机制", status: failures.length ? "failed" : "passed", evidence: "第 9 关通过正常玩法处理器重新产生全部合同教学信号。" },
    { id: "ASSISTANCE-RUNTIME", label: "生成游戏连续失败显式分层帮助且成功清零", status: failures.length ? "failed" : "passed", evidence: "已验证第 1–4 次真实失败原因、合同帮助、刷新恢复与成功清零。" },
  ];
  if (progressionReport) writeFileSync(join(root, "_studio", "DIFFICULTY_QUALITY_REPORT.json"), `${JSON.stringify(progressionReport, null, 2)}\n`, "utf8");
  if (variationReport) writeFileSync(join(root, "_studio", "VARIATION_QUALITY_REPORT.json"), `${JSON.stringify(variationReport, null, 2)}\n`, "utf8");
  if (assistanceReport) writeFileSync(join(root, "_studio", "ASSISTANCE_QUALITY_REPORT.json"), `${JSON.stringify(assistanceReport, null, 2)}\n`, "utf8");
  const report = { checkedAt: new Date().toISOString(), executablePath, experimental: true, checks, failures, screenshots: screenshotPaths.map((path) => relative(root, path).replaceAll("\\", "/")) };
  writeFileSync(join(root, "_studio", "BROWSER_QUALITY_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (failures.length) throw new Error(`生成游戏浏览器验收失败：${failures.join(" ")}`);
  return { checks, screenshotPaths };
}

export async function inspectGameInBrowser(root: string): Promise<BrowserQualityResult> {
  const executablePath = requireBrowserExecutable();
  const qualityRoot = join(root, "_studio", "quality");
  mkdirSync(qualityRoot, { recursive: true });
  const screenshotPaths: string[] = [];
  const failures: string[] = [];
  const evidence: string[] = [];
  const curatedManifestPath = join(root, "_studio", "CURATED_RESOURCES.json");
  const curatedSpriteSlots = existsSync(curatedManifestPath)
    ? ((JSON.parse(readFileSync(curatedManifestPath, "utf8")) as { assets?: Array<{ target?: string }> }).assets ?? [])
        .flatMap(({ target }) => {
          const match = target?.replaceAll("\\", "/").match(/^assets\/sprites\/sprite-(\d+)\.png$/i);
          return match ? [Number(match[1])] : [];
        })
    : [];
  const curatedModelCount = existsSync(curatedManifestPath)
    ? ((JSON.parse(readFileSync(curatedManifestPath, "utf8")) as { assets?: Array<{ target?: string }> }).assets ?? [])
        .filter(({ target }) => target?.toLowerCase().endsWith(".glb")).length
    : 0;
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
          if (curatedModelCount > 0) {
            await page.waitForFunction((expected) => {
              const debug = (window as Window & { __GAME_DEBUG__?: { getState?: () => any } }).__GAME_DEBUG__;
              const models = debug?.getState?.()?.collector?.curatedModels;
              return Boolean(models && models.loaded + models.failed.length >= expected);
            }, curatedModelCount, { timeout: 8_000 });
            const models = await page.evaluate(() => {
              const debug = (window as Window & { __GAME_DEBUG__?: { getState?: () => any } }).__GAME_DEBUG__;
              return debug?.getState?.()?.collector?.curatedModels ?? null;
            }) as { requested: number; loaded: number; failed: unknown[]; meshCount: number; visibleObjects: number } | null;
            if (!models || models.requested !== curatedModelCount || models.loaded !== curatedModelCount || models.failed.length > 0 || models.meshCount < curatedModelCount || models.visibleObjects !== curatedModelCount) {
              failures.push(`精选 GLB 没有全部加载为可见场景对象：${JSON.stringify(models)}。`);
            }
            evidence.push(`精选 GLB ${models?.loaded ?? 0}/${curatedModelCount} 已解析，形成 ${models?.meshCount ?? 0} 个网格和 ${models?.visibleObjects ?? 0} 个可见场景对象。`);
          }
          if (curatedSpriteSlots.length > 0) {
            await page.waitForFunction((slots) => {
              const debug = (window as Window & { __GAME_DEBUG__?: { getState?: () => any } }).__GAME_DEBUG__;
              const sprites = debug?.getState?.()?.assets?.sprites ?? [];
              return slots.every((slot) => sprites.find((sprite: { slot?: number }) => sprite.slot === slot)?.loaded);
            }, curatedSpriteSlots, { timeout: 8_000 });
            const curatedRuntime = await page.evaluate((slots) => {
              const debug = (window as Window & { __GAME_DEBUG__?: { getState?: () => any } }).__GAME_DEBUG__;
              const sprites = debug?.getState?.()?.assets?.sprites ?? [];
              return sprites.filter((sprite: { slot?: number }) => slots.includes(sprite.slot ?? -1));
            }, curatedSpriteSlots) as Array<{ slot: number; path: string; loaded: boolean; width: number; height: number; drawCount: number }>;
            if (curatedRuntime.length !== curatedSpriteSlots.length || curatedRuntime.some((sprite) => !sprite.loaded || sprite.width <= 0 || sprite.height <= 0)) {
              failures.push(`精选精灵没有全部完成浏览器解码：${JSON.stringify(curatedRuntime)}。`);
            }
            if (!curatedRuntime.some((sprite) => sprite.drawCount > 0)) failures.push("精选精灵虽已下载，但画布没有调用任何绑定槽位。 ");
            evidence.push(`精选精灵槽位 ${curatedSpriteSlots.join("、")} 已全部解码，其中 ${curatedRuntime.filter((sprite) => sprite.drawCount > 0).map((sprite) => sprite.slot).join("、") || "无"} 已进入画布绘制。`);
          }
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
