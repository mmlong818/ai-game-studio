import { stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { loadCuratedResourceLibrary } from "./resource-library";

describe("正式精选资源库", () => {
  it("磁盘清单、来源记录和语义资料可以完整加载", async () => {
    const families = await loadCuratedResourceLibrary(resolve("assets/library/curated"));
    expect(families).toHaveLength(4);
    expect(families.reduce((sum, family) => sum + family.manifest.assets.length, 0)).toBe(294);
    expect(families.every(({ manifest }) => manifest.source.licenseId === "CC0-1.0")).toBe(true);
    expect(families.find(({ profile }) => profile.familyId === "classic-puzzle-2d")?.bindingQualification).toMatchObject({
      recommendation: "qualified-recipes-only",
      recipeIds: ["breakout-classic-puzzle-slots", "merge-2048-classic-puzzle-slots", "polyomino-fit-classic-puzzle-slots"],
      coveredTemplates: ["breakout", "merge-2048", "polyomino-fit"],
    });
    expect(families.find(({ profile }) => profile.familyId === "low-poly-nature-3d")?.bindingQualification).toMatchObject({
      recommendation: "qualified-recipes-only",
      recipeIds: ["collector-low-poly-nature-scene"],
      coveredRoles: ["background"],
    });
    expect(families.find(({ profile }) => profile.familyId === "clean-blue-ui-2d")?.bindingQualification.recommendation).toBe("review-required");
    for (const family of families) {
      for (const previewPath of family.profile.previewPaths) expect((await stat(join(resolve("assets/library/curated"), family.profile.familyId, previewPath))).size).toBeGreaterThan(0);
    }
  });
});
