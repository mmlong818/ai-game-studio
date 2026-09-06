import { ENGINE_BENCHMARKS } from "./benchmarks.js";
import { getEngineCandidate } from "./catalog.js";
import { scoreEngineAssessment } from "./score.js";
import { ENGINE_HARD_GATES, ENGINE_SCORE_DIMENSIONS, type EngineAssessmentInput, type EngineAssessmentResult } from "./types.js";

const BASELINE_DIMENSIONS: EngineAssessmentInput["dimensions"] = {
  "project-mapping": { score: 86, evidence: ["scene-plan.ts 将 GameProjectV3 场景、实例、资源与稳定 ID 映射为场景计划"] },
  "deterministic-build": { score: 90, evidence: ["PlayCanvas 依赖锁定为 2.21.4；产物生成和 Node 测试可无界面执行"] },
  "web-runtime": { score: 88, evidence: ["现有 PlayCanvas 示例覆盖浏览器运行时、性能档和响应式画布"] },
  "agent-control": { score: 92, evidence: ["场景、行为、规则、资源、构建与探针均由文本工程和代码控制"] },
  "publishing-increment": { score: 70, evidence: ["当前可靠覆盖 Web/PWA；国内小游戏发布仍需候选 PoC"] },
  "asset-package": { score: 90, evidence: ["vendor 与资源写入本地产物，测试阻止运行时网络地址"] },
  "openness-exit": { score: 96, evidence: ["PlayCanvas Engine 为 MIT npm 依赖，发布物不依赖 PlayCanvas 云编辑器"] },
  "maintenance-ecosystem": { score: 88, evidence: ["精确版本、上游仓库和本地许可归属均已记录"] },
};

const PASS_GATES: EngineAssessmentInput["gates"] = {
  "no-required-uncontrolled-cloud": { status: "pass", evidence: ["当前构建直接使用 npm 引擎包与本地资源"] },
  "version-lock": { status: "pass", evidence: ["package.json 锁定 playcanvas 2.21.4"] },
  "offline-artifact": { status: "pass", evidence: ["引擎示例测试验证产物不含 http/https 运行时地址"] },
  "declared-runtime-content": { status: "pass", evidence: ["产物包含 PlayCanvas MIT 许可和开放源代码归属"] },
  "diagnostic-traceability": { status: "pass", evidence: ["ScenePlan、行为和规则桥保留 GameProjectV3 对象/实例/行为/规则 ID"] },
  "quality-gates-compatible": { status: "pass", evidence: ["引擎层纳入 Node、Vitest 与浏览器测试"] },
  "non-professional-default": { status: "pass", evidence: ["引擎选择和构建细节不进入普通用户创作流程"] },
};

export function buildPlayCanvasBaselineAssessment(evaluatedAt: string): EngineAssessmentResult {
  return scoreEngineAssessment({
    engineId: "playcanvas",
    engineVersion: "2.21.4",
    evaluatedAt,
    dimensions: BASELINE_DIMENSIONS,
    gates: PASS_GATES,
    benchmarks: [
      { benchmarkId: "B1", status: "not-run", evidence: ["B1 固定夹具已建立；PlayCanvas 专项运行探针尚未执行"] },
      { benchmarkId: "B2", status: "not-run", evidence: ["B2 固定夹具已建立；PlayCanvas 专项运行探针尚未执行"] },
      { benchmarkId: "B3", status: "pass", evidence: ["现有 engine-playcanvas-demo 覆盖 GameProjectV3 → ScenePlan、实体、行为、规则和离线产物"] },
    ],
  });
}

export function buildEngineEvaluationReport(evaluatedAt: string) {
  const candidate = getEngineCandidate("playcanvas");
  const assessment = buildPlayCanvasBaselineAssessment(evaluatedAt);
  return {
    schemaVersion: 1 as const,
    evaluatedAt,
    policy: {
      adoptionThreshold: 80,
      requiresAllHardGates: true,
      scoreDimensions: ENGINE_SCORE_DIMENSIONS,
      hardGates: ENGINE_HARD_GATES,
    },
    candidate,
    benchmarks: ENGINE_BENCHMARKS,
    assessment,
    limitations: [
      "本报告冻结的是仓库可验证基线，不替代真实手机帧率、内存和三浏览器数据采集。",
      "B1/B2 尚未在 PlayCanvas 上执行，因为当前 PlayCanvas 引擎层定位为 3D 基线。",
      "LayaAir、GDevelop 等候选仍需在隔离 PoC 中提交同格式证据后才可比较。",
    ],
  };
}

export function renderEngineEvaluationMarkdown(report: ReturnType<typeof buildEngineEvaluationReport>) {
  const lines = [
    "# PlayCanvas 引擎基线评估",
    "",
    `- 评估时间：${report.evaluatedAt}`,
    `- 引擎版本：${report.assessment.engineVersion}`,
    `- 加权得分：${report.assessment.weightedScore}/100`,
    `- 硬门禁：${report.assessment.allHardGatesPassed ? "全部通过" : "未通过"}`,
    `- 建议：${report.assessment.recommendation}`,
    "",
    "## 评分",
    "",
    "| 维度 | 权重 | 得分 | 证据 |",
    "| --- | ---: | ---: | --- |",
  ];
  for (const dimension of ENGINE_SCORE_DIMENSIONS) {
    const item = report.assessment.dimensions[dimension.id];
    lines.push(`| ${dimension.label} | ${dimension.weight} | ${item.score} | ${item.evidence.join("；")} |`);
  }
  lines.push("", "## 固定基准", "", "| 基准 | 状态 | 证据 |", "| --- | --- | --- |");
  report.assessment.benchmarks.forEach((benchmark) => lines.push(`| ${benchmark.benchmarkId} | ${benchmark.status} | ${benchmark.evidence.join("；")} |`));
  lines.push("", "## 限制", "", ...report.limitations.map((item) => `- ${item}`), "");
  return lines.join("\n");
}
