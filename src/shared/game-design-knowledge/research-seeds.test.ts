import { describe, expect, it } from "vitest";
import { createResearchPrototypeEvaluation } from "./research-evaluation.js";
import { POCKET_WORKSHOP_DESIGN_CONTRACT, POCKET_WORKSHOP_RESEARCH_TASK_ID } from "./pocket-workshop-contract.js";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "./catalog.js";
import { initialDesignResearchTasks } from "./research-seeds.js";

describe("掌心工坊研究种子", () => {
  it("直接形成有三方证据的结构化候选，不要求运营人员重复录入", () => {
    const task = initialDesignResearchTasks(GAME_DESIGN_KNOWLEDGE_LIBRARY)[0]!;
    expect(task).toMatchObject({ id: POCKET_WORKSHOP_RESEARCH_TASK_ID, status: "review", decision: null, candidateDraft: { kind: "pattern", artifact: { id: "container-synergy-planning", lifecycle: "candidate" } } });
    expect(task.sources).toHaveLength(3);
    expect(new Set(task.candidateDraft?.kind === "pattern" ? task.candidateDraft.artifact.evidence.map(({ sourceUrl }) => new URL(sourceUrl).hostname) : [])).toEqual(new Set(["playwithfurcifer.itch.io", "playwithfurcifer.github.io", "play.google.com"]));
  });

  it("评估沙箱使用黄金合同、资源需求和专用信号，而不是通用占位合同", () => {
    const task = initialDesignResearchTasks(GAME_DESIGN_KNOWLEDGE_LIBRARY)[0]!;
    const evaluation = createResearchPrototypeEvaluation(task, new Date("2026-09-05T01:00:00.000Z"));
    expect(evaluation.contract).toEqual(POCKET_WORKSHOP_DESIGN_CONTRACT);
    expect(evaluation.requiredProbeSignals).toEqual(["part-inspected", "synergy-previewed", "resolution-explained", "multi-cell-rotated", "failure-help-escalated"]);
    expect(evaluation.assetRequirements?.requirements).toEqual(expect.arrayContaining([expect.objectContaining({ id: "ASSET-MECHANIC-FINITE-CONTAINER-PLACEMENT" })]));
    expect(evaluation.resourceGapSummary?.prototypeReady).toBe(true);
  });
});
