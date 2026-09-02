import { describe, expect, it } from "vitest";
import { buildGameSpec } from "./gameSpec";
import { createReferenceDossier } from "./research";
import { generateRuntimeFiles } from "./runtimeGenerator";
import { buildSimplePlayableRevision, createMockGeneratedImage } from "./simpleProduction";
import { INITIAL_DRAFT } from "./storage";

const mechanicIds = [
  "queue-management",
  "chapter-branch",
  "deck-combo",
  "gamepad-control",
  "spatial-puzzle-3d",
];

const draftFor = (mechanicId: string) => ({
  ...INITIAL_DRAFT,
  creationMode: "mechanic-composition" as const,
  templateId: null,
  newGameBrief: `验证 ${mechanicId} 能力`,
  selectedMechanicIds: [mechanicId],
  changeLevel: "R3" as const,
  referenceDossier: createReferenceDossier(`验证 ${mechanicId} 能力`, [mechanicId]),
});

describe("P2 单人游戏能力包", () => {
  it.each(mechanicIds)("%s 拥有独立规则、运行时和玩法探针", async (mechanicId) => {
    const result = await buildSimplePlayableRevision({
      draft: draftFor(mechanicId),
      goal: `验证 ${mechanicId}`,
      visualDirection: "清晰游戏视觉",
    }, { generateImage: createMockGeneratedImage, save: () => undefined });
    expect(result.errors).toEqual([]);
    expect(result.project.spec.source.selectedMechanicIds).toContain(mechanicId);
    expect(result.project.spec.capabilities.networkMode).toBe("single-player");
    expect(result.project.assertions.filter((item) => item.kind === "rule").every((item) => item.status === "passed")).toBe(true);
    expect(() => new Function(generateRuntimeFiles(result.project.spec)["app.js"])).not.toThrow();
  });

  it("为章节、经营、卡牌、手柄和立体谜题声明正确的平台能力", () => {
    expect(buildGameSpec(draftFor("chapter-branch")).progression.mode).toBe("chapter-based");
    expect(buildGameSpec(draftFor("queue-management")).progression.mode).toBe("round-based");
    expect(buildGameSpec(draftFor("deck-combo")).progression.mode).toBe("round-based");
    const gamepad = buildGameSpec(draftFor("gamepad-control"));
    expect(gamepad.capabilities.inputs).toContain("gamepad");
    expect(generateRuntimeFiles(gamepad)["app.js"]).toContain("getGamepads");
    const spatial = buildGameSpec(draftFor("spatial-puzzle-3d"));
    expect(spatial.capabilities.dimensions).toBe("limited-3d");
    expect(generateRuntimeFiles(spatial)["app.js"]).toContain("getContext('webgl'");
  });
});
