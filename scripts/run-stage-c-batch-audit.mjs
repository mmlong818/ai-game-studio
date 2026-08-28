import { resolve } from "node:path";
import { inspectStageCRealtimeInBrowser } from "../dist-server/server/browser-quality.js";

if (!process.argv.slice(2).length) {
  throw new Error("请传入 template=artifact-root，例如 space-shooter=data/artifacts/xxx。 ");
}

for (const item of process.argv.slice(2)) {
  const separator = item.indexOf("=");
  if (separator < 1) throw new Error(`无法识别验收参数：${item}`);
  const template = item.slice(0, separator);
  const root = resolve(item.slice(separator + 1));
  const result = await inspectStageCRealtimeInBrowser(root, template);
  console.log(`${template}：${result.checks.join("、")}`);
}
