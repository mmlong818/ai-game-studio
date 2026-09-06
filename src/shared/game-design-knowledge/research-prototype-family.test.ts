import { describe, expect, it } from "vitest";
import type { GameResearchTask } from "./research-queue";
import { createResearchPrototypeScenario, resolveResearchPrototypeFamily } from "./research-prototype-family";

function task(family: string, signals = ["first", "second"]): GameResearchTask {
  return {
    schemaVersion: "game-research-task-v1", id: `RESEARCH-${family}`, createdAt: "2026-09-05T00:00:00.000Z", updatedAt: "2026-09-05T00:00:00.000Z", status: "review",
    queryIntent: "测试机制族", playerVerbs: [], constraints: [], candidatePatternIds: [], sources: [], synthesis: null, decision: null,
    candidateDraft: { kind: "mechanic", artifact: { id: `test-${family}`, label: family, family: family as never, playerVerb: "执行动作", state: ["state"], inputs: ["input"], outputs: ["output"], capabilityIds: ["game-lifecycle"], relations: [], tunableDimensions: ["operation"], probeSignals: signals } },
    evaluation: { schemaVersion: "research-prototype-evaluation-v1", id: `EVAL-${family}`, createdAt: "2026-09-05T00:00:00.000Z", updatedAt: "2026-09-05T00:00:00.000Z", contract: {} as never, requiredProbeSignals: signals, probeRuns: [], browserRuns: [], playtests: [] },
  };
}

describe("研究机制族原型", () => {
  it.each(["spatial", "matching", "movement", "economy", "combat"])("为 %s 生成可执行场景", (family) => {
    const scenario = createResearchPrototypeScenario(task(family));
    expect(resolveResearchPrototypeFamily(task(family))).toBe(family);
    expect(scenario.family).toBe(family);
    expect(scenario.controls.length).toBeGreaterThan(0);
    expect(scenario.interactionSteps.length).toBe(family === "matching" ? 4 : 2);
  });

  it("未知机制族保持通用原型，不伪装成专用机制", () => {
    expect(createResearchPrototypeScenario(task("information")).family).toBe("generic");
  });
});
