import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// 开发时自动加载 .env.local（其次 .env）：只补充未设置的变量，不覆盖已有环境变量，不打印任何值。
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const filename of [".env.local", ".env"]) {
  const file = join(projectRoot, filename);
  if (!existsSync(file)) continue;
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

const command = process.platform === "win32" ? (process.env.ComSpec ?? "cmd.exe") : "npm";
const commandArgs = (script) => process.platform === "win32"
  ? ["/d", "/s", "/c", `npm.cmd run ${script}`]
  : ["run", script];
const children = [
  spawn(command, commandArgs("dev:api"), { stdio: "inherit" }),
  spawn(command, commandArgs("dev:web"), { stdio: "inherit" }),
];

let closing = false;

function stop(exitCode = 0) {
  if (closing) return;
  closing = true;
  for (const child of children) child.kill();
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("exit", (code) => {
    if (!closing && code && code !== 0) stop(code);
  });
}

process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
