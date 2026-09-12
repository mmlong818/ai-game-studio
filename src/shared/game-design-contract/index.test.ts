import { describe, expect, it } from "vitest";
import { PLATFORM_RELEASE, PROJECT_FORMAT_VERSION } from "../platform-version";
import { parseGameProjectV3 } from "../project-schema";
import { auditGameDesignContract, serializeGameDesignContractV1 } from ".";
import { merge2048DesignSample } from "./samples";

function projectFor(sample: typeof merge2048DesignSample) {
  const ruleIds = [...new Set(sample.mechanics.flatMap(({ ruleIds }) => ruleIds))];
  return parseGameProjectV3({
    metadata: { id: sample.projectId, title: sample.projectId, platformRelease: PLATFORM_RELEASE, projectFormat: PROJECT_FORMAT_VERSION, createdAt: "2026-09-05T00:00:00.000Z", updatedAt: "2026-09-05T00:00:00.000Z" },
    startSceneId: "SCENE-GAME", scenes: [{ id: "SCENE-GAME", name: "游戏", instances: [] }], objects: [],
    rules: ruleIds.map((ruleId) => ({ id: ruleId, name: ruleId, sceneId: "SCENE-GAME", enabled: true, priority: "P0", when: [{ type: "game.signal", parameters: {}, references: [] }], then: [{ type: "game.effect", parameters: {}, references: [] }] })),
    variables: [], resources: [], controls: { keyboard: true, pointer: true, touch: true, gamepad: false }, presentation: { aspectRatio: "16:9", targetFps: 60, responsive: true }, acceptance: [],
  });
}

describe("GameDesignContractV1", () => {
  it.each([merge2048DesignSample])("保留的黄金样板通过完整性和引用检查", (sample) => {
    const result = auditGameDesignContract(projectFor(sample), sample);
    expect(result.gaps).toEqual([]);
    expect(result.complete).toBe(true);
    expect(JSON.parse(serializeGameDesignContractV1(sample))).toEqual(sample);
  });

  it("发现悬空规则、难度突刺和旧合同中的悬空教学引用", () => {
    const broken = structuredClone(merge2048DesignSample);
    broken.mechanics[0].ruleIds = ["RULE-MISSING"];
    broken.onboarding = broken.onboarding.filter(({ teachesMechanicId }) => teachesMechanicId !== "MECHANIC-SLIDE");
    broken.content.beats[1].difficulty = { cognition: 4, operation: 4, space: 4, resources: 0, combination: 1, punishment: 0 };
    broken.acceptance = broken.acceptance.filter(({ kind }) => kind !== "assistance");
    const result = auditGameDesignContract(projectFor(merge2048DesignSample), broken);
    expect(result.complete).toBe(false);
    expect(result.gaps.map(({ code }) => code)).toEqual(expect.arrayContaining(["missing-rule", "multi-dimension-spike", "acceptance-missing-step"]));
  });

  it("分层失败教学不再是合同要求，仍拒绝首次高压引入机制", () => {
    const broken = structuredClone(merge2048DesignSample);
    broken.assistance.steps[0].action = "directional-hint";
    broken.content.beats[1].pressure = "high";
    broken.content.beats[1].introducesMechanicIds = ["MECHANIC-SLIDE"];
    broken.content.beats[0].introducesMechanicIds = [];
    const result = auditGameDesignContract(projectFor(merge2048DesignSample), broken);
    expect(result.gaps.map(({ code }) => code)).toEqual(expect.arrayContaining(["high-pressure-first-use"]));
    expect(result.gaps.map(({ code }) => code)).not.toContain("missing-failure-cause");
  });

  it("设计合同必须保留知识玩法依据，库外设计必须绑定研究任务", () => {
    const missingPattern = structuredClone(merge2048DesignSample);
    missingPattern.knowledge.patternIds = [];
    expect(auditGameDesignContract(projectFor(merge2048DesignSample), missingPattern).gaps.map(({ code }) => code)).toContain("missing-knowledge-pattern");
    const external = structuredClone(merge2048DesignSample);
    external.knowledge.integrationStatus = "research-required";
    external.knowledge.patternIds = [];
    external.knowledge.researchTaskIds = [];
    expect(auditGameDesignContract(projectFor(merge2048DesignSample), external).gaps.map(({ code }) => code)).toContain("missing-research-task");
  });
});
