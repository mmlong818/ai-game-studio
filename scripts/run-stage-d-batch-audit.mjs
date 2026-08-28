import { resolve } from "node:path";
import { inspectStageDClassicInBrowser } from "../dist-server/server/browser-quality.js";

const entries = process.argv.slice(2).map((entry) => {
  const separator = entry.indexOf("=");
  if (separator < 1) throw new Error(`参数格式应为 template=artifact-root：${entry}`);
  return [entry.slice(0, separator), resolve(entry.slice(separator + 1))];
});

if (!entries.length) throw new Error("至少提供一个 template=artifact-root。 ");

for (const [template, root] of entries) {
  const result = await inspectStageDClassicInBrowser(root, template);
  console.log(JSON.stringify({ template, root, checks: result.checks }, null, 2));
}
