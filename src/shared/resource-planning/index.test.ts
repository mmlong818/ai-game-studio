import { describe, expect, it } from "vitest";
import { CURATED_FAMILY_PROFILES, type ResourceFamily } from "../resource-library";
import { CURATED_RESOURCE_PACKS } from "../resource-sources/curated";
import { createResourcePlanningShadow, resourceReplacementImpact } from ".";

const families: ResourceFamily[] = CURATED_FAMILY_PROFILES.map((profile) => {
  const pack = CURATED_RESOURCE_PACKS.find(({ familyId }) => familyId === profile.familyId)!;
  const extension = profile.formats[0]?.includes("ogg") ? ".ogg" : profile.formats[0]?.includes("gltf") ? ".glb" : ".png";
  return { profile, manifest: { schemaVersion: "curated-resource-family-v1", familyId: profile.familyId, packId: pack.id, importedAt: pack.source.acquiredAt, source: pack.source, archive: { fileName: pack.archiveFileName, sha256: pack.archiveSha256, downloadUrl: pack.downloadUrl }, license: { entry: pack.licenseEntry, sha256: pack.licenseSha256 }, selectionRationale: pack.selectionRationale, assets: [{ path: `asset${extension}`, bytes: 100, sha256: "A".repeat(64) }] } };
});

describe("默认创作资源规划", () => {
  it("先检索资源族，再明确复用审查、补生成和新生成决策", () => {
    const plan = createResourcePlanningShadow({ dimensions: "2d", visualStyle: "classic", mechanicIds: ["grid-slide-merge"], onboardingStepCount: 2 }, families);
    expect(plan.summary.total).toBe(plan.requirements.length);
    expect(plan.decisions.find(({ requirementId }) => requirementId === "ASSET-UI-SHELL")?.selectedFamilyId).toBe("clean-blue-ui-2d");
    expect(plan.decisions.some(({ action }) => action === "generate-missing-variants")).toBe(true);
    expect(plan.decisions.every(({ candidates }) => candidates.length <= 3)).toBe(true);
  });

  it("已复核但未经过黄金游戏的资源不会自动绑定", () => {
    const plan = createResourcePlanningShadow({ dimensions: "2d", visualStyle: "calm", mechanicIds: ["grid-slide-merge"], onboardingStepCount: 1 }, families);
    expect(plan.summary.reusable).toBe(0);
    expect(plan.decisions.every(({ action }) => action !== "reuse-approved")).toBe(true);
  });

  it("浏览器验证配方只把它完整覆盖的具体需求标记为自动复用", () => {
    const plan = createResourcePlanningShadow({ template: "merge-2048", dimensions: "2d", runtimeTarget: "web-2d", threeMode: null, visualStyle: "cute", mechanicIds: ["grid-slide-merge"], onboardingStepCount: 1 }, families);
    const mechanic = plan.decisions.find(({ requirementId }) => requirementId === "ASSET-MECHANIC-GRID-SLIDE-MERGE");
    expect(mechanic).toMatchObject({ action: "reuse-approved", selectedFamilyId: "classic-puzzle-2d", selectedRecipeId: "merge-2048-classic-puzzle-slots" });
    expect(mechanic?.candidates.find(({ familyId }) => familyId === "classic-puzzle-2d")).toMatchObject({ autoBindable: true, missingStates: [] });
    expect(plan.decisions.find(({ requirementId }) => requirementId === "ASSET-UI-SHELL")?.action).not.toBe("reuse-approved");
  });

  it("3D 收集配方只批准环境需求，机制模型仍需补齐状态", () => {
    const plan = createResourcePlanningShadow({ template: "signal-hunt", dimensions: "3d", runtimeTarget: "web-3d", threeMode: "collector", visualStyle: "classic", mechanicIds: ["collect-charge"], onboardingStepCount: 1 }, families);
    expect(plan.decisions.find(({ requirementId }) => requirementId === "ASSET-BACKGROUND")).toMatchObject({ action: "reuse-approved", selectedRecipeId: "collector-low-poly-nature-scene" });
    expect(plan.decisions.find(({ requirementId }) => requirementId === "ASSET-MECHANIC-COLLECT-CHARGE")?.action).not.toBe("reuse-approved");
  });

  it("拼岛的两个相互配合机制共用同一套已验证拼块资源", () => {
    const plan = createResourcePlanningShadow({ template: "polyomino-fit", dimensions: "2d", runtimeTarget: "web-2d", threeMode: null, visualStyle: "cute", mechanicIds: ["drag-snap-assembly", "polyomino-placement"], onboardingStepCount: 2 }, families);
    const mechanics = plan.decisions.filter(({ requirementId }) => requirementId.startsWith("ASSET-MECHANIC-"));
    expect(mechanics).toHaveLength(2);
    expect(mechanics.every(({ action, selectedFamilyId, selectedRecipeId }) => action === "reuse-approved" && selectedFamilyId === "classic-puzzle-2d" && selectedRecipeId === "polyomino-fit-classic-puzzle-slots")).toBe(true);
  });

  it("替换资源会列出设计引用和必须失效的验收", () => {
    const plan = createResourcePlanningShadow({ dimensions: "2d", visualStyle: "cute", mechanicIds: ["grid-slide-merge"], onboardingStepCount: 1 }, families);
    const impact = resourceReplacementImpact(plan, "ASSET-ONBOARDING-OVERLAY");
    expect(impact.onboardingStepIds.length).toBeGreaterThan(0);
    expect(impact.invalidatedChecks).toEqual(expect.arrayContaining(["asset", "viewport", "accessibility"]));
  });
});
