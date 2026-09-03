import { chromium } from "playwright";

const apiOrigin = process.env.STUDIO_API_ORIGIN || "http://127.0.0.1:4312";
const failures = [];
const results = [];

function fail(game, viewport, message) {
  failures.push(`${game}（${viewport}）：${message}`);
}

const healthResponse = await fetch(`${apiOrigin}/api/health`);
if (!healthResponse.ok) throw new Error(`平台接口不可用：HTTP ${healthResponse.status}`);
const health = await healthResponse.json();
if (health.platform?.version !== "1.1.0" || health.platform?.projectFormat !== "game-project-v3") {
  throw new Error("运行中的服务不是 1.1 / GameProjectV3");
}

const gamesResponse = await fetch(`${apiOrigin}/api/games`);
if (!gamesResponse.ok) throw new Error(`游戏目录不可用：HTTP ${gamesResponse.status}`);
const games = (await gamesResponse.json()).games.filter((game) => game.isOfficial && game.publication?.versionUrl);
if (!games.length) throw new Error("没有可验收的官方已发布游戏");

const browser = await chromium.launch({ headless: true });
try {
  for (const game of games) {
    for (const viewport of [
      { name: "桌面端", width: 1366, height: 768, isMobile: false, hasTouch: false },
      { name: "手机版", width: 390, height: 844, isMobile: true, hasTouch: true },
    ]) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        isMobile: viewport.isMobile,
        hasTouch: viewport.hasTouch,
      });
      const page = await context.newPage();
      const runtimeErrors = [];
      page.on("pageerror", (error) => runtimeErrors.push(error.message));
      try {
        const response = await page.goto(game.publication.versionUrl, { waitUntil: "domcontentloaded", timeout: 20_000 });
        if (!response?.ok()) {
          fail(game.title, viewport.name, `页面返回 HTTP ${response?.status() ?? "未知"}`);
          continue;
        }
        await page.waitForFunction(() => Boolean(window.__FORGE_INSPECTOR__), null, { timeout: 8_000 });
        await page.waitForTimeout(1_200);
        const report = await page.evaluate(() => ({
          inspector: window.__FORGE_INSPECTOR__.snapshot(),
          version: window.__FORGE_INSPECTOR__.version,
          hasStartControl: Boolean(document.querySelector("#start, #restart")),
          horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        }));
        if (report.version !== "1.1.0") fail(game.title, viewport.name, `运行探针版本错误：${report.version}`);
        if (!report.inspector.frozen) fail(game.title, viewport.name, "已发布版本仍允许热更新");
        if (report.inspector.resourceErrors.length) fail(game.title, viewport.name, `资源加载失败 ${report.inspector.resourceErrors.length} 项`);
        if (!report.hasStartControl) fail(game.title, viewport.name, "缺少 #start 或 #restart 控件");
        if (report.horizontalOverflow) fail(game.title, viewport.name, "页面存在横向溢出");
        if (runtimeErrors.length) fail(game.title, viewport.name, `脚本异常：${runtimeErrors.join("；")}`);
        results.push({ game: game.title, viewport: viewport.name, fps: report.inspector.fps, objects: report.inspector.activeObjectCount });
      } catch (error) {
        fail(game.title, viewport.name, error instanceof Error ? error.message : String(error));
      } finally {
        await context.close();
      }
    }

    const metadataResponse = await fetch(new URL("_studio/V11_BUILD.json", game.publication.versionUrl));
    const projectResponse = await fetch(new URL("_studio/GAME_PROJECT_V3.json", game.publication.versionUrl));
    const changesResponse = await fetch(new URL("_studio/CHANGESET_V11.json", game.publication.versionUrl));
    if (!metadataResponse.ok || !projectResponse.ok || !changesResponse.ok) {
      fail(game.title, "工程文件", "缺少冻结清单、GameProjectV3 或结构化变更记录");
      continue;
    }
    const metadata = await metadataResponse.json();
    const project = await projectResponse.json();
    if (!metadata.frozenByDefault) fail(game.title, "工程文件", "构建清单未冻结");
    if (project.metadata?.projectFormat !== "game-project-v3") fail(game.title, "工程文件", "工程格式不是 GameProjectV3");
  }
} finally {
  await browser.close();
}

console.log(`已验证 ${games.length} 个官方游戏、${results.length} 个桌面/手机运行场景。`);
if (failures.length) {
  console.error(failures.map((failure) => `- ${failure}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("全部官方游戏的 1.1 工程、运行探针、资源、启动控件、冻结状态与小屏宽度检查通过。");
}
