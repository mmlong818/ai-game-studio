import { describe, expect, it } from "vitest";
import { DESIGN_MODIFIERS, MECHANIC_ATLAS, MECHANIC_ATLAS_SUMMARY, composeMechanicRecipe, mechanicAtlasEntrySchema, searchMechanicAtlas } from "./mechanic-atlas.js";

describe("独立机制设计图谱", () => {
  it("每张卡只记录一个机制，不用组合结果虚增数量", () => {
    expect(MECHANIC_ATLAS_SUMMARY).toMatchObject({ total: 353, modifiers: 24, combinationCapacity: 8472 });
    expect(MECHANIC_ATLAS).toHaveLength(353);
    expect(DESIGN_MODIFIERS).toHaveLength(24);
    expect(new Set(MECHANIC_ATLAS.map(({ id }) => id)).size).toBe(353);
    expect(new Set(MECHANIC_ATLAS.map(({ label }) => label)).size).toBe(353);
    expect(new Set(MECHANIC_ATLAS.map(({ playerVerb, state, outcome }) => `${playerVerb}|${state}|${outcome}`)).size).toBe(353);
    expect(MECHANIC_ATLAS.every((entry) => mechanicAtlasEntrySchema.safeParse(entry).success)).toBe(true);
    expect(MECHANIC_ATLAS.every(({ kind }) => kind === "independent-mechanic")).toBe(true);
  });

  it("组合只生成不计数的配方", () => {
    expect(composeMechanicRecipe("rotate-object", "instant-retry")).toMatchObject({ mechanicId: "rotate-object", modifierId: "instant-retry", countedAsIndependentMechanic: false });
    expect(composeMechanicRecipe("missing", "instant-retry")).toBeNull();
    expect(MECHANIC_ATLAS_SUMMARY.boundary).toMatch(/独立计数|不计入/);
  });

  it("支持中文搜索、机制族筛选和安全分页", () => {
    const rotationResults = searchMechanicAtlas({ query: "旋转", limit: 200 });
    expect(rotationResults).toMatchObject({ total: 353, matched: 3, limit: 100, officialPromotionRequired: true });
    expect(new Set(rotationResults.entries.map(({ id }) => id)).size).toBe(3);
    const combat = searchMechanicAtlas({ family: "combat", limit: 10 });
    expect(combat.matched).toBe(MECHANIC_ATLAS_SUMMARY.byFamily.combat);
    expect(combat.entries.every(({ family }) => family === "combat")).toBe(true);
    expect(searchMechanicAtlas({ offset: Number.NaN, limit: Number.POSITIVE_INFINITY })).toMatchObject({ offset: 0, limit: 30 });
  });
});
