import { spawn } from "node:child_process";

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
