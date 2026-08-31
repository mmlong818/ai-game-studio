import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function findSystemBrowser() {
  const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const localAppData = process.env.LOCALAPPDATA;
  const candidates = process.platform === "win32"
    ? [
        configured,
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
        join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
        join(process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
        localAppData ? join(localAppData, "Google", "Chrome", "Application", "chrome.exe") : null,
        localAppData ? join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe") : null,
      ]
    : process.platform === "darwin"
      ? [
          configured,
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          join(homedir(), "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
          join(homedir(), "Applications", "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge"),
        ]
      : [configured, "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return candidates.filter(Boolean).find((candidate) => existsSync(candidate));
}

if (process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD === "1") {
  console.log("已按 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 跳过 Chromium 安装。");
  process.exit(0);
}

const executablePath = chromium.executablePath();
if (existsSync(executablePath)) {
  console.log(`自动验收 Chromium 已就绪（${process.platform}/${process.arch}）：${executablePath}`);
  process.exit(0);
}

const cliPath = join(projectRoot, "node_modules", "playwright", "cli.js");
if (!existsSync(cliPath)) {
  console.error("Playwright CLI 不存在，无法安装自动验收浏览器。请重新运行 npm ci。");
  process.exit(1);
}

console.log(`未发现 ${process.platform}/${process.arch} 对应的 Chromium，正在安装自动验收浏览器……`);
const result = spawnSync(process.execPath, [cliPath, "install", "chromium"], { cwd: projectRoot, stdio: "inherit" });
if (result.error || result.status !== 0 || !existsSync(chromium.executablePath())) {
  const systemBrowser = findSystemBrowser();
  if (systemBrowser) {
    console.warn(`Playwright 托管浏览器安装失败，将使用系统浏览器：${systemBrowser}`);
    process.exit(0);
  }
  console.error("Chromium 安装失败。请检查网络后运行 npm run setup:browsers，或设置 PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH。");
  process.exit(result.status || 1);
}

console.log(`自动验收 Chromium 安装完成（${process.platform}/${process.arch}）：${chromium.executablePath()}`);
