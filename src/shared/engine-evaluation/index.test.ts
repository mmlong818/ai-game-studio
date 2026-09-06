import { describe, expect, it } from "vitest";
import { validateGameProjectV3 } from "../project-schema";
import {
  ENGINE_BENCHMARKS,
  ENGINE_BENCHMARK_FIXTURES,
  ENGINE_CANDIDATE_CATALOG,
  ENGINE_HARD_GATES,
  ENGINE_SCORE_DIMENSIONS,
  buildEngineEvaluationReport,
  buildLicenseInventory,
  buildPlayCanvasBaselineAssessment,
  emptyDimensionAssessments,
  getEngineBenchmark,
  renderEngineEvaluationMarkdown,
  scoreEngineAssessment,
  unknownGateAssessments,
} from ".";

describe("引擎候选机器清单", () => {
  it("覆盖计划内全部候选并为每个组件记录许可证据", () => {
    expect(ENGINE_CANDIDATE_CATALOG.engines.map(({ id }) => id)).toEqual([
      "playcanvas", "layaair", "gdevelop", "phaser", "babylonjs", "cocos", "godot", "microstudio",
    ]);
    const licenses = buildLicenseInventory();
    expect(licenses.length).toBeGreaterThanOrEqual(ENGINE_CANDIDATE_CATALOG.engines.length);
    expect(licenses.every((item) => item.license.length > 0 && item.sourceUrl.startsWith("https://"))).toBe(true);
    expect(licenses.find((item) => item.engineId === "layaair" && item.component === "LayaIdea")?.license).toBe("proprietary-service");
  });
});

describe("B1/B2/B3 固定基准", () => {
  it("定义互补能力并提供有效的 GameProjectV3 夹具", () => {
    expect(ENGINE_BENCHMARKS.map(({ id }) => id)).toEqual(["B1", "B2", "B3"]);
    expect(new Set(ENGINE_BENCHMARKS.map(({ kind }) => kind)).size).toBe(3);
    for (const id of ["B1", "B2", "B3"] as const) {
      const benchmark = getEngineBenchmark(id);
      expect(benchmark.definition.probeIds.length).toBeGreaterThanOrEqual(5);
      expect(validateGameProjectV3(benchmark.project).success).toBe(true);
      expect(benchmark.project.metadata.id).toBe(benchmark.definition.fixtureId);
    }
    expect(ENGINE_BENCHMARK_FIXTURES.B1.controls.touch).toBe(true);
    expect(ENGINE_BENCHMARK_FIXTURES.B2.rules.some(({ id }) => id === "RULE-B2-UNDO")).toBe(true);
    expect(ENGINE_BENCHMARK_FIXTURES.B3.objects.every(({ renderer }) => renderer === "webgl")).toBe(true);
  });
});

describe("统一评分与硬门禁", () => {
  it("权重总和为 100，PlayCanvas 基线达到采用阈值且门禁完整", () => {
    expect(ENGINE_SCORE_DIMENSIONS.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
    const result = buildPlayCanvasBaselineAssessment("2026-09-05T00:00:00.000Z");
    expect(result.weightedScore).toBe(87.7);
    expect(result.allHardGatesPassed).toBe(true);
    expect(result.adoptionEligible).toBe(true);
    expect(result.recommendation).toBe("adopt");
    expect(Object.keys(result.gates)).toHaveLength(ENGINE_HARD_GATES.length);
  });

  it("未知门禁阻止采用，失败门禁直接拒绝", () => {
    const base = {
      engineId: "candidate",
      engineVersion: "1.2.3",
      evaluatedAt: "2026-09-05T00:00:00.000Z",
      dimensions: emptyDimensionAssessments(100),
      gates: unknownGateAssessments(),
      benchmarks: [],
    };
    const unresolved = scoreEngineAssessment(base);
    expect(unresolved.weightedScore).toBe(100);
    expect(unresolved.adoptionEligible).toBe(false);
    expect(unresolved.recommendation).toBe("evaluate");
    expect(unresolved.unresolvedGateIds).toHaveLength(ENGINE_HARD_GATES.length);

    const failed = scoreEngineAssessment({
      ...base,
      gates: { ...base.gates, "offline-artifact": { status: "fail", evidence: ["产物依赖远程 CDN"] } },
    });
    expect(failed.recommendation).toBe("reject");
    expect(failed.failedGateIds).toEqual(["offline-artifact"]);
  });

  it("拒绝缺项、无证据、越界分数和无法冻结的版本", () => {
    const dimensions = emptyDimensionAssessments(80);
    dimensions["web-runtime"] = { score: 101, evidence: ["越界"] };
    expect(() => scoreEngineAssessment({ engineId: "x", engineVersion: "latest", evaluatedAt: "bad", dimensions, gates: unknownGateAssessments(), benchmarks: [] })).toThrow(/完整版本/);
    const missing = { ...emptyDimensionAssessments(80) } as Partial<typeof dimensions>;
    delete missing["agent-control"];
    expect(() => scoreEngineAssessment({ engineId: "x", engineVersion: "1.0.0", evaluatedAt: "2026-09-05T00:00:00.000Z", dimensions: missing as typeof dimensions, gates: unknownGateAssessments(), benchmarks: [] })).toThrow(/评分维度不完整/);
  });
});

describe("PlayCanvas 基线报告", () => {
  it("同时生成可审计 JSON 对象和可读 Markdown", () => {
    const report = buildEngineEvaluationReport("2026-09-05T00:00:00.000Z");
    expect(report.schemaVersion).toBe(1);
    expect(report.assessment.benchmarks.map(({ status }) => status)).toEqual(["not-run", "not-run", "pass"]);
    const markdown = renderEngineEvaluationMarkdown(report);
    expect(markdown).toContain("# PlayCanvas 引擎基线评估");
    expect(markdown).toContain("87.7/100");
    expect(markdown).toContain("B1 固定夹具已建立");
  });
});
