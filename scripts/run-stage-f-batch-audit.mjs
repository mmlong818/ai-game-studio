import { resolve } from "node:path";
import { inspectStageF3DInBrowser } from "../dist-server/server/browser-quality.js";

const entries = process.argv.slice(2).map((entry) => {
  const separator = entry.indexOf("=");
  if (separator < 1) throw new Error(`参数格式应为 collector|arena=artifact-root：${entry}`);
  return [entry.slice(0, separator), resolve(entry.slice(separator + 1))];
});

if (!entries.length) throw new Error("至少提供一个 3D 模式与生成物目录。");

for (const [mode, root] of entries) {
  if (mode !== "collector" && mode !== "arena") throw new Error(`未知 3D 模式：${mode}`);
  const result = await inspectStageF3DInBrowser(root, mode);
  console.log(JSON.stringify({ root, ...result }, null, 2));
}
