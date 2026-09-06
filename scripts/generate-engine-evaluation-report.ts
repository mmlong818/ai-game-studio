import { buildEngineEvaluationReport, renderEngineEvaluationMarkdown } from "../src/shared/engine-evaluation/index.js";

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

const format = argument("format") ?? "markdown";
const evaluatedAt = argument("evaluated-at") ?? new Date().toISOString();
if (format !== "markdown" && format !== "json") {
  throw new Error("--format 仅支持 markdown 或 json");
}

const report = buildEngineEvaluationReport(evaluatedAt);
const output = format === "json"
  ? `${JSON.stringify(report, null, 2)}\n`
  : renderEngineEvaluationMarkdown(report);
process.stdout.write(output);

