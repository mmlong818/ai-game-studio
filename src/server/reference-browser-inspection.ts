import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { assertPublicReferenceUrl } from "./reference-intake.js";

export type ReferenceBrowserInspection = {
  method: "public-browser";
  runtimeStatus: "visible" | "not-observed" | "blocked";
  gameplayStatus: "description-read" | "runtime-viewed" | "unknown";
  canClaimPlayable: false;
  finalUrl: string;
  title: string;
  canvasCount: number;
  iframeUrls: string[];
  directEntryUrl: string | null;
  directEntryCanvasCount: number;
  scriptUrls: string[];
  visualChanged: boolean;
  consoleErrors: string[];
  requestCount: number;
  blockedRequestCount: number;
  limitations: string[];
  screenshotPath?: string;
};

type RawObservation = Omit<ReferenceBrowserInspection, "method" | "runtimeStatus" | "gameplayStatus" | "canClaimPlayable" | "limitations"> & { pageBlocked: boolean };
export type ReferenceBrowserDriver = (url: URL, options: { timeoutMs: number; maxRequests: number; screenshotPath?: string }) => Promise<RawObservation>;

const safeUrl = (value: string) => { try { const url = new URL(value); url.search = ""; url.hash = ""; return url.toString(); } catch { return ""; } };
const digest = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

export function classifyReferenceBrowserObservation(raw: RawObservation, documented: boolean): ReferenceBrowserInspection {
  // An iframe can be a loader, consent shell, advertisement, or an empty embed.
  // Only a rendered canvas is strong enough to call the runtime itself visible.
  const surfaceVisible = raw.canvasCount > 0;
  const runtimeStatus = raw.pageBlocked ? "blocked" : surfaceVisible ? "visible" : "not-observed";
  return {
    method: "public-browser", runtimeStatus,
    gameplayStatus: documented ? runtimeStatus === "visible" ? "runtime-viewed" : "description-read" : "unknown",
    canClaimPlayable: false,
    finalUrl: raw.finalUrl, title: raw.title, canvasCount: raw.canvasCount,
    iframeUrls: raw.iframeUrls, directEntryUrl: raw.directEntryUrl, directEntryCanvasCount: raw.directEntryCanvasCount,
    scriptUrls: raw.scriptUrls, visualChanged: raw.visualChanged,
    consoleErrors: raw.consoleErrors, requestCount: raw.requestCount, blockedRequestCount: raw.blockedRequestCount,
    limitations: [
      runtimeStatus === "visible" ? "只确认公开页面或其 iframe 中出现可见运行画布。" : "没有观察到可确认的游戏运行画面；iframe 可能仍停留在加载器或空壳。",
      "未执行实际玩法操作，不能确认完整交互、胜负条件、关卡内容或游戏确实可玩。",
      "页面载入、脚本请求或画面变化不等于已经理解玩法。",
    ],
    ...(raw.screenshotPath ? { screenshotPath: raw.screenshotPath } : {}),
  };
}

async function playwrightDriver(url: URL, options: { timeoutMs: number; maxRequests: number; screenshotPath?: string }): Promise<RawObservation> {
  let browser: Browser | null = null; let context: BrowserContext | null = null; let page: Page | null = null;
  let requestCount = 0; let blockedRequestCount = 0; let pageBlocked = false;
  const scriptUrls = new Set<string>(); const consoleErrors: string[] = [];
  try {
    browser = await chromium.launch({ headless: true, args: ["--disable-extensions", "--disable-background-networking"] });
    context = await browser.newContext({ acceptDownloads: false, serviceWorkers: "block", viewport: { width: 1280, height: 800 } });
    await context.route("**/*", async route => {
      requestCount += 1;
      const request = route.request();
      if (request.resourceType() === "websocket" || requestCount > options.maxRequests) { blockedRequestCount += 1; await route.abort("blockedbyclient"); return; }
      const value = request.url();
      if (/^(?:data:|blob:|about:)/i.test(value)) { await route.continue(); return; }
      try { await assertPublicReferenceUrl(new URL(value)); }
      catch { blockedRequestCount += 1; if (request.isNavigationRequest()) pageBlocked = true; await route.abort("blockedbyclient"); return; }
      if (request.resourceType() === "script") scriptUrls.add(safeUrl(value));
      await route.continue();
    });
    page = await context.newPage();
    page.on("console", message => { if (message.type() === "error" && consoleErrors.length < 10) consoleErrors.push(message.text().slice(0, 240)); });
    page.on("pageerror", error => { if (consoleErrors.length < 10) consoleErrors.push(error.message.slice(0, 240)); });
    page.on("download", download => void download.cancel());
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    await page.waitForTimeout(Math.min(2_000, Math.max(250, options.timeoutMs / 4)));
    const first = await page.screenshot({ animations: "disabled" });
    await page.waitForTimeout(1_000);
    const second = await page.screenshot({ animations: "disabled" });
    const iframeSources = await page.locator("iframe:visible").evaluateAll(nodes => nodes.map(node => (node as HTMLIFrameElement).src).filter(Boolean));
    const iframeUrls = iframeSources.map(safeUrl).filter(Boolean).slice(0, 12);
    let canvasCount = (await Promise.all(page.frames().map(frame => frame.locator("canvas:visible").count().catch(() => 0)))).reduce((sum, count) => sum + count, 0);
    let directEntryUrl: string | null = null; let directEntryCanvasCount = 0;
    const directSource = iframeSources.find(value => /^https?:/i.test(value));
    if (canvasCount === 0 && directSource) {
      try {
        const directUrl = new URL(directSource); await assertPublicReferenceUrl(directUrl); directEntryUrl = safeUrl(directSource);
        const directPage = await context.newPage();
        await directPage.goto(directSource, { waitUntil: "domcontentloaded", timeout: Math.min(options.timeoutMs, 15_000) });
        await directPage.waitForTimeout(Math.min(4_000, Math.max(500, options.timeoutMs / 4)));
        directEntryCanvasCount = (await Promise.all(directPage.frames().map(frame => frame.locator("canvas:visible").count().catch(() => 0)))).reduce((sum, count) => sum + count, 0);
        canvasCount += directEntryCanvasCount;
        if (options.screenshotPath) await directPage.screenshot({ path: options.screenshotPath.replace(/(\.[^.]+)$/, "-direct$1"), animations: "disabled" });
        await directPage.close();
      } catch (error) { if (consoleErrors.length < 10) consoleErrors.push(`直接游戏入口未观察完成：${error instanceof Error ? error.message.slice(0, 180) : "未知错误"}`); }
    }
    if (options.screenshotPath) { mkdirSync(dirname(options.screenshotPath), { recursive: true }); writeFileSync(options.screenshotPath, second); }
    return { finalUrl: safeUrl(page.url()), title: (await page.title()).slice(0, 160), canvasCount, iframeUrls, directEntryUrl, directEntryCanvasCount, scriptUrls: [...scriptUrls].filter(Boolean).slice(0, 30), visualChanged: digest(first) !== digest(second), consoleErrors, requestCount, blockedRequestCount, pageBlocked, ...(options.screenshotPath ? { screenshotPath: options.screenshotPath } : {}) };
  } catch (error) {
    return { finalUrl: safeUrl(page?.url() ?? url.toString()), title: "", canvasCount: 0, iframeUrls: [], directEntryUrl: null, directEntryCanvasCount: 0, scriptUrls: [...scriptUrls].filter(Boolean).slice(0, 30), visualChanged: false, consoleErrors: [...consoleErrors, (error instanceof Error ? error.message : "浏览器检查失败").slice(0, 240)].slice(0, 10), requestCount, blockedRequestCount, pageBlocked: true };
  } finally { await context?.close().catch(() => {}); await browser?.close().catch(() => {}); }
}

export async function inspectReferenceInBrowser(rawUrl: string, options: { documented: boolean; timeoutMs?: number; maxRequests?: number; screenshotPath?: string; driver?: ReferenceBrowserDriver } = { documented: false }): Promise<ReferenceBrowserInspection> {
  const url = new URL(rawUrl); await assertPublicReferenceUrl(url);
  const raw = await (options.driver ?? playwrightDriver)(url, { timeoutMs: options.timeoutMs ?? 15_000, maxRequests: options.maxRequests ?? 120, ...(options.screenshotPath ? { screenshotPath: options.screenshotPath } : {}) });
  return classifyReferenceBrowserObservation(raw, options.documented);
}
