import { describe, expect, test } from "vitest";
import { generateAssetRequirements } from "../resource-requirements";
import { evaluateResourceBindingRecipes, resolveQualifiedResourceBindingRecipes, summarizeResourceFamilyBindingQualification, type ResourceBindingContext } from ".";

function context(template: ResourceBindingContext["template"], dimensions: "2d" | "3d", threeMode: ResourceBindingContext["threeMode"] = null, mechanicIds = ["grid-slide-merge"]): ResourceBindingContext {
  const requirements = generateAssetRequirements({ id: "DESIGN-TEST", projectId: "PROJECT-TEST", mechanics: mechanicIds.map((id) => ({ id })), onboarding: [] }, { dimensions: dimensions === "3d" ? "limited-3d" : "2d", generatedAt: "2026-09-05T00:00:00.000Z" }).requirements;
  return { template, dimensions, runtimeTarget: dimensions === "3d" ? "web-3d" : "web-2d", threeMode, requirements };
}

describe("已验证资源绑定配方", () => {
  test("资源族查询区分全局推荐、限定配方可用和仍需审核", () => {
    expect(summarizeResourceFamilyBindingQualification("classic-puzzle-2d", "reviewed")).toMatchObject({
      recommendation: "qualified-recipes-only",
      recipeIds: ["breakout-classic-puzzle-slots", "merge-2048-classic-puzzle-slots", "polyomino-fit-classic-puzzle-slots"],
    });
    expect(summarizeResourceFamilyBindingQualification("clean-blue-ui-2d", "reviewed")).toMatchObject({ recommendation: "review-required", recipeIds: [] });
    expect(summarizeResourceFamilyBindingQualification("future-approved-family", "recommended")).toMatchObject({ recommendation: "global" });
  });

  test("2048 只有在模板、运行时和完整机制状态需求同时匹配时才解析", () => {
    const resolved = resolveQualifiedResourceBindingRecipes(context("merge-2048", "2d"));
    expect(resolved.map(({ recipe }) => recipe.id)).toEqual(["merge-2048-classic-puzzle-slots"]);
    expect(resolved[0]?.requirementIds).toEqual(["ASSET-MECHANIC-GRID-SLIDE-MERGE"]);
  });

  test("同一资源族不会越界套到未验证模板", () => {
    const evaluations = evaluateResourceBindingRecipes(context("snake", "2d"));
    expect(evaluations.every(({ eligible }) => !eligible)).toBe(true);
    expect(evaluations.some(({ reasons }) => reasons.includes("模板不匹配"))).toBe(true);
  });

  test("拼岛配方同时覆盖拖拽吸附与多格放置需求", () => {
    const resolved = resolveQualifiedResourceBindingRecipes(context("polyomino-fit", "2d", null, ["drag-snap-assembly", "polyomino-placement"]));
    expect(resolved.map(({ recipe }) => recipe.id)).toEqual(["polyomino-fit-classic-puzzle-slots"]);
    expect(resolved[0]?.requirementIds).toEqual(["ASSET-MECHANIC-DRAG-SNAP-ASSEMBLY", "ASSET-MECHANIC-POLYOMINO-PLACEMENT"]);
  });

  test("3D 场景配方只覆盖 collector 的环境需求，不冒充机制状态资源", () => {
    const resolved = resolveQualifiedResourceBindingRecipes(context("signal-hunt", "3d", "collector"));
    expect(resolved.map(({ recipe }) => recipe.id)).toEqual(["collector-low-poly-nature-scene"]);
    expect(resolved[0]?.requirementIds).toEqual(["ASSET-BACKGROUND"]);
    expect(resolveQualifiedResourceBindingRecipes(context("signal-hunt", "3d", "arena"))).toEqual([]);
  });
});
