import { describe, expect, it } from "vitest";
import { CURATED_FAMILY_PROFILES, type ResourceFamily } from "../resource-library";
import { generateAssetRequirements } from "../resource-requirements";
import { CURATED_RESOURCE_PACKS } from "../resource-sources/curated";
import { createResearchResourceAcquisitionPlan } from "./research-resource-acquisition";

const families: ResourceFamily[] = CURATED_FAMILY_PROFILES.map((profile) => {
  const pack = CURATED_RESOURCE_PACKS.find(({ familyId }) => familyId === profile.familyId)!;
  const extension = profile.formats[0]?.includes("ogg") ? ".ogg" : profile.formats[0]?.includes("gltf") ? ".glb" : ".png";
  return { profile, manifest: { schemaVersion: "curated-resource-family-v1", familyId: profile.familyId, packId: pack.id, importedAt: pack.source.acquiredAt, source: pack.source, archive: { fileName: pack.archiveFileName, sha256: pack.archiveSha256, downloadUrl: pack.downloadUrl }, license: { entry: pack.licenseEntry, sha256: pack.licenseSha256 }, selectionRationale: pack.selectionRationale, assets: requirementPaths(profile.familyId, extension) } };
});

function requirementPaths(familyId: string, extension: string) {
  const states = familyId === "clean-blue-ui-2d" ? ["start", "pause", "retry", "hint", "settings", "win", "lose"] : familyId === "neutral-interface-audio" ? ["action", "invalid", "reward", "failure", "win"] : ["normal", "target", "active"];
  return states.map((state, index) => ({ path: `${state}${extension}`, bytes: 100 + index, sha256: String(index + 1).repeat(64) }));
}

const requirements = generateAssetRequirements({
  id: "CONTRACT-RESOURCE-PLAN", projectId: "PROJECT-RESOURCE-PLAN", mechanics: [{ id: "matching-pair" }],
  onboarding: [{ id: "ONBOARD-01", teachesMechanicId: "matching-pair", presentation: ["highlight"] }],
}, { styleFamily: "research-neutral", generatedAt: "2026-09-05T00:00:00.000Z" });

describe("研究资源取得计划", () => {
  it("对每项需求给出复用、程序生成、采购或创作路线，并保留许可证据", () => {
    const plan = createResearchResourceAcquisitionPlan(requirements, families, "2026-09-05T00:00:00.000Z");
    expect(plan.summary.total).toBe(requirements.requirements.length);
    expect(plan.summary.planningReady).toBe(true);
    expect(plan.decisions.every(({ route }) => ["reuse-existing", "procedural-generate", "procure", "create"].includes(route))).toBe(true);
    expect(plan.decisions.find(({ requirementId }) => requirementId === "ASSET-UI-SHELL")).toMatchObject({ route: "reuse-existing", selectedFamilyId: "clean-blue-ui-2d", license: { status: "verified", licenseId: "CC0-1.0" } });
    expect(plan.decisions.find(({ requirementId }) => requirementId === "ASSET-AUDIO-FEEDBACK")).toMatchObject({ route: "reuse-existing", selectedFamilyId: "neutral-interface-audio", license: { status: "verified" } });
    expect(plan.decisions.find(({ requirementId }) => requirementId === "ASSET-ONBOARDING-OVERLAY")).toMatchObject({ route: "procedural-generate", operatorAction: "none" });
    expect(plan.decisions.find(({ requirementId }) => requirementId.includes("MECHANIC"))).toMatchObject({ route: "create", operatorAction: "review-created-asset" });
  });

  it("精选库为空时仍形成完整计划，音频走采购并要求许可复核", () => {
    const plan = createResearchResourceAcquisitionPlan(requirements, [], "2026-09-05T00:00:00.000Z");
    expect(plan.summary.planningReady).toBe(true);
    expect(plan.summary.licenseReview).toBe(1);
    expect(plan.decisions.find(({ requirementId }) => requirementId === "ASSET-AUDIO-FEEDBACK")).toMatchObject({ route: "procure", license: { status: "pending" }, operatorAction: "review-purchase-terms" });
  });
});
