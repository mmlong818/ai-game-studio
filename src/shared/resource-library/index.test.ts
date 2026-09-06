import { describe, expect, it } from "vitest";
import { merge2048DesignSample } from "../game-design-contract/samples";
import { generateAssetRequirements } from "../resource-requirements";
import { CURATED_FAMILY_PROFILES, rankResourceFamilies, type ResourceFamily } from ".";
import { CURATED_RESOURCE_PACKS } from "../resource-sources/curated";

const families: ResourceFamily[] = CURATED_FAMILY_PROFILES.map((profile) => {
  const pack = CURATED_RESOURCE_PACKS.find(({ familyId }) => familyId === profile.familyId)!;
  const extension = profile.formats[0]?.includes("ogg") ? ".ogg" : profile.formats[0]?.includes("gltf") ? ".glb" : ".png";
  return { profile, manifest: { schemaVersion: "curated-resource-family-v1", familyId: profile.familyId, packId: pack.id, importedAt: pack.source.acquiredAt, source: pack.source, archive: { fileName: pack.archiveFileName, sha256: pack.archiveSha256, downloadUrl: pack.downloadUrl }, license: { entry: pack.licenseEntry, sha256: pack.licenseSha256 }, selectionRationale: pack.selectionRationale, assets: [{ path: `asset${extension}`, bytes: 100, sha256: "A".repeat(64) }] } };
});
const requirements = generateAssetRequirements(merge2048DesignSample, { generatedAt: "2026-09-05T00:00:00.000Z" }).requirements;

describe("资源族语义检索", () => {
  it("按角色、风格、状态、技术和许可评分，音频需求命中音频族", () => {
    const requirement = requirements.find(({ id }) => id === "ASSET-AUDIO-FEEDBACK")!;
    const [match] = rankResourceFamilies(requirement, families);
    expect(match.familyId).toBe("neutral-interface-audio");
    expect(match.score).toBe(100);
    expect(match.breakdown).toEqual({ role: 30, style: 25, states: 20, technical: 15, license: 10 });
  });

  it("状态缺失时可以推荐但不能自动绑定", () => {
    const requirement = requirements.find(({ id }) => id.includes("MECHANIC-SLIDE"))!;
    const match = rankResourceFamilies(requirement, families).find(({ familyId }) => familyId === "classic-puzzle-2d")!;
    expect(match.eligible).toBe(true);
    expect(match.missingStates).toContain("DISABLED");
    expect(match.autoBindable).toBe(false);
  });

  it("不兼容角色或格式时总分归零", () => {
    const requirement = requirements.find(({ id }) => id === "ASSET-BACKGROUND")!;
    const audio = rankResourceFamilies(requirement, families).find(({ familyId }) => familyId === "neutral-interface-audio")!;
    expect(audio.eligible).toBe(false);
    expect(audio.score).toBe(0);
  });
});
