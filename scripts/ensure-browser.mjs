import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

if (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1") {
  console.log("已按 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 跳过 Chromium 安装。");
  process.exit(0);
}

const executablePath = chromium.executablePath();
if (existsSync(executablePath)) {
  console.log(`自动验收 Chromium 已就绪：${executablePath}`);
  process.exit(0);
}

const cliPath = join(process.cwd(), "node_modules", "playwright", "cli.js");
if (!existsSync(cliPath)) {
  console.error("Playwright CLI 不存在，无法安装自动验收浏览器。请重新运行 npm ci。");
  process.exit(1);
}

console.log("未发现 Playwright 托管的 Chromium，正在安装自动验收浏览器……");
const result = spawnSync(process.execPath, [cliPath, "install", "chromium"], { stdio: "inherit" });
if (result.error || result.status !== 0 || !existsSync(chromium.executablePath())) {
  console.error("Chromium 安装失败。请检查网络后运行 npm run setup:browsers，或设置 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH。");
  process.exit(result.status || 1);
}

console.log(`自动验收 Chromium 安装完成：${chromium.executablePath()}`);
