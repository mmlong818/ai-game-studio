import { describe, expect, it } from "vitest";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "./catalog";
import { rankPlayPatterns, validateGameDesignKnowledgeLibrary } from ".";

describe("游戏设计知识库", () => {
  it("通用能力、机制关系、玩法模式和评估模型引用完整", () => {
    const result = validateGameDesignKnowledgeLibrary(GAME_DESIGN_KNOWLEDGE_LIBRARY, new Date("2026-09-05T00:00:00Z"));
    expect(result.valid).toBe(true);
    expect(result.gaps).toEqual([]);
    expect(result.library?.evaluation.dimensions.reduce((sum, item) => sum + item.weight, 0)).toBe(100);
  });

  it("根据用户意图优先找到可复用玩法，而不是直接生成未知规则", () => {
    const [first] = rankPlayPatterns(GAME_DESIGN_KNOWLEDGE_LIBRARY, { tags: ["card", "roguelite", "build"], dimensions: "2d", input: "touch" });
    expect(first.pattern.id).toBe("deckbuilding-roguelite");
  });

  it("拒绝悬空机制关系和错误评估权重，并提示过期证据", () => {
    const broken = structuredClone(GAME_DESIGN_KNOWLEDGE_LIBRARY);
    const mechanicWithRelation = broken.mechanics.find(({ relations }) => relations.length > 0);
    expect(mechanicWithRelation).toBeDefined();
    mechanicWithRelation!.relations[0].targetId = "missing-mechanic";
    broken.evaluation.dimensions[0].weight += 1;
    broken.patterns[0].evidence = broken.patterns[0].evidence.map((item) => ({ ...item, observedAt: "2023-01-01" }));
    const result = validateGameDesignKnowledgeLibrary(broken, new Date("2026-09-05T00:00:00Z"));
    expect(result.valid).toBe(false);
    expect(result.gaps.map(({ code }) => code)).toEqual(expect.arrayContaining(["missing-mechanic", "evaluation-weight", "stale-evidence"]));
  });
});
