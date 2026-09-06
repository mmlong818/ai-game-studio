import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { summarizeResourceFamilyBindingQualification, type ResourceFamilyBindingQualification } from "../shared/resource-bindings/index.js";
import { CURATED_FAMILY_PROFILES, resourceFamilyManifestSchema, resourceFamilyProfileSchema, resourceFamilySchema, type ResourceFamily } from "../shared/resource-library/index.js";

export type QueryableResourceFamily = ResourceFamily & { bindingQualification: ResourceFamilyBindingQualification };

export async function loadCuratedResourceLibrary(root: string, options: { requireCurated?: boolean } = {}): Promise<QueryableResourceFamily[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const profiles = new Map(CURATED_FAMILY_PROFILES.map((profile) => [profile.familyId, profile]));
  const families = await Promise.all(entries.filter((entry) => entry.isDirectory()).map(async (entry) => {
    const manifest = resourceFamilyManifestSchema.parse(JSON.parse(await readFile(join(root, entry.name, "RESOURCE_FAMILY.json"), "utf8")));
    let profile = profiles.get(manifest.familyId);
    if (!profile) {
      try { profile = resourceFamilyProfileSchema.parse(JSON.parse(await readFile(join(root, entry.name, "RESOURCE_PROFILE.json"), "utf8"))); }
      catch { throw new Error(`资源族缺少语义资料：${manifest.familyId}`); }
    }
    const family = resourceFamilySchema.parse({ manifest, profile });
    return {
      ...family,
      bindingQualification: summarizeResourceFamilyBindingQualification(profile.familyId, profile.lifecycle),
    };
  }));
  const loadedIds = new Set(families.map(({ profile }) => profile.familyId));
  const missing = CURATED_FAMILY_PROFILES.filter(({ familyId }) => !loadedIds.has(familyId));
  if ((options.requireCurated ?? true) && missing.length) throw new Error(`精选资源族文件缺失：${missing.map(({ familyId }) => familyId).join("、")}`);
  return families.sort((a, b) => a.profile.familyId.localeCompare(b.profile.familyId));
}
