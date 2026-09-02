import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const platformNames = { darwin: "macOS", linux: "Linux", win32: "Windows" };
const failures = [];

function report(label, passed, detail, repair) {
  console.log(`${passed ? "✓" : "✗"} ${label}：${detail}`);
  if (!passed) failures.push(repair);
}

function commandResult(command, args) {
  return spawnSync(command, args, { encoding: "utf8", windowsHide: true });
}

function findBrowser() {
  const managed = chromium.executablePath();
  const configured = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  const localAppData = process.env.LOCALAPPDATA;
  const systemCandidates = process.platform === "win32"
    ? [
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
        join(process.env.ProgramFiles ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
        localAppData ? join(localAppData, "Google", "Chrome", "Application", "chrome.exe") : null,
        localAppData ? join(localAppData, "Microsoft", "Edge", "Application", "msedge.exe") : null,
      ]
    : process.platform === "darwin"
      ? [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          join(homedir(), "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome"),
          join(homedir(), "Applications", "Microsoft Edge.app", "Contents", "MacOS", "Microsoft Edge"),
        ]
      : ["/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser"];
  return [configured, managed, ...systemCandidates].filter(Boolean).find((candidate) => existsSync(candidate));
}

const architectureName = process.arch === "arm64"
  ? process.platform === "darwin" ? "Apple 芯片（ARM64）" : "ARM64"
  : process.arch === "x64" ? "Intel / AMD 64 位" : process.arch;
const platformSupported = process.platform in platformNames && ["arm64", "x64"].includes(process.arch);
report(
  "操作系统",
  platformSupported,
  `${platformNames[process.platform] ?? process.platform} · ${architectureName}`,
  "请使用 Windows、macOS 或 Linux 的 x64/ARM64 环境。",
);

if (process.platform === "darwin") {
  const macVersion = commandResult("sw_vers", ["-productVersion"]);
  const version = macVersion.status === 0 ? macVersion.stdout.trim() : "无法读取";
  const major = Number.parseInt(version.split(".")[0] ?? "0", 10);
  report("macOS 版本", major >= 14, version, "请升级到 macOS 14 Sonoma 或更高版本。");
}

const nodeMajor = Number.parseInt(process.versions.node.split(".")[0] ?? "0", 10);
report("Node.js", nodeMajor === 24, process.versions.node, "请安装 Node.js 24。");

const browser = findBrowser();
report("自动验收浏览器", Boolean(browser), browser ?? "未找到", "请运行 npm run setup:browsers。");

const compose = commandResult("docker", ["compose", "version", "--short"]);
const composeVersion = compose.status === 0 ? compose.stdout.trim() : "未找到 Docker Compose v2";
report("Docker Compose", compose.status === 0, composeVersion, "请安装并启动 Docker Desktop，确保 docker compose 可用。");

const docker = compose.status === 0 ? commandResult("docker", ["info", "--format", "{{.ServerVersion}}"]) : null;
const dockerVersion = docker?.status === 0 ? docker.stdout.trim() : "Docker 引擎未运行";
report("Docker 引擎", docker?.status === 0, dockerVersion, "请启动 Docker Desktop 后重试。");

const requiredPaths = ["assets", "fixtures", "third_party", "package-lock.json"];
const missingPaths = requiredPaths.filter((path) => !existsSync(resolve(projectRoot, path)));
report("源码与游戏资源", missingPaths.length === 0, missingPaths.length ? `缺少 ${missingPaths.join("、")}` : "完整", "请重新解压完整源码包。");

if (failures.length) {
  console.error("\n环境尚未就绪：");
  for (const failure of new Set(failures)) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("\n环境检查通过，可以运行 npm run db:up 和 npm run dev。");
