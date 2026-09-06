import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import type { ProjectDetail } from "../shared/contracts.js";
import { resolveQualifiedResourceBindingRecipes, type ResourceBindingContext, type ResourceBindingRecipe } from "../shared/resource-bindings/index.js";
import { curatedResourceFamilyManifestSchema } from "../shared/resource-library/index.js";
import { createResourcePlanningForGameSpec } from "../shared/resource-planning/index.js";

type AppliedAsset = ResourceBindingRecipe["assets"][number] & {
  recipeId: string;
  familyId: string;
  bytes: number;
  sha256: string;
};

export type AppliedQualifiedResources = {
  schemaVersion: "curated-resource-bindings-v2";
  template: ProjectDetail["spec"]["template"];
  mode: ProjectDetail["spec"]["threeMode"];
  bindings: Array<{
    recipeId: string;
    familyId: string;
    requirementIds: string[];
    source: {
      sourceUrl: string;
      author: string;
      licenseId: string;
      licenseUrl: string | null;
      attributionText: string | null;
    };
    qualification: ResourceBindingRecipe["qualification"];
    assets: AppliedAsset[];
  }>;
  assets: AppliedAsset[];
};

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex").toUpperCase();
}

function assertInside(root: string, target: string) {
  const normalizedRoot = `${resolve(root)}${sep}`.toLowerCase();
  if (!resolve(target).toLowerCase().startsWith(normalizedRoot)) throw new Error(`精选资源路径越界：${target}`);
}

function bindingContext(project: ProjectDetail): ResourceBindingContext {
  const requirements = project.spec.resourcePlanning?.requirements
    ?? createResourcePlanningForGameSpec(project.spec, []).requirements;
  return {
    template: project.spec.template,
    dimensions: project.dimensions,
    runtimeTarget: project.spec.runtimeTarget,
    threeMode: project.spec.threeMode,
    requirements,
  };
}

export function applyQualifiedProjectResources(
  artifactRoot: string,
  project: ProjectDetail,
  libraryRoot = resolve("assets/library/curated"),
): AppliedQualifiedResources | null {
  const resolved = resolveQualifiedResourceBindingRecipes(bindingContext(project));
  if (resolved.length === 0) return null;
  const targetOwners = new Map<string, string>();
  const bindings = resolved.map(({ recipe, requirementIds }) => {
    const familyRoot = resolve(libraryRoot, recipe.familyId);
    const manifestPath = join(familyRoot, "RESOURCE_FAMILY.json");
    if (!existsSync(manifestPath)) throw new Error(`已验证配方的资源族缺失：${recipe.familyId}`);
    const manifest = curatedResourceFamilyManifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf8")));
    const manifestAssets = new Map(manifest.assets.map((asset) => [asset.path.replaceAll("\\", "/"), asset]));
    const assets = recipe.assets.map((asset): AppliedAsset => {
      const source = resolve(familyRoot, asset.source);
      const target = resolve(artifactRoot, asset.target);
      assertInside(familyRoot, source);
      assertInside(artifactRoot, target);
      const normalizedTarget = asset.target.replaceAll("\\", "/").toLowerCase();
      const existingOwner = targetOwners.get(normalizedTarget);
      if (existingOwner) throw new Error(`精选资源目标槽位冲突：${asset.target} 同时属于 ${existingOwner} 与 ${recipe.id}`);
      targetOwners.set(normalizedTarget, recipe.id);
      const declared = manifestAssets.get(asset.source);
      if (!declared) throw new Error(`已验证配方资源未登记：${recipe.familyId}/${asset.source}`);
      const bytes = readFileSync(source);
      const actualHash = sha256(bytes);
      if (bytes.length !== declared.bytes || actualHash !== declared.sha256) {
        throw new Error(`已验证配方资源完整性校验失败：${recipe.familyId}/${asset.source}`);
      }
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(source, target);
      return { ...asset, recipeId: recipe.id, familyId: recipe.familyId, bytes: bytes.length, sha256: actualHash };
    });
    return {
      recipeId: recipe.id,
      familyId: recipe.familyId,
      requirementIds,
      source: {
        sourceUrl: manifest.source.sourceUrl,
        author: manifest.source.author,
        licenseId: manifest.source.licenseId,
        licenseUrl: manifest.source.licenseUrl,
        attributionText: manifest.source.attributionText,
      },
      qualification: recipe.qualification,
      assets,
    };
  });
  return {
    schemaVersion: "curated-resource-bindings-v2",
    template: project.spec.template,
    mode: project.spec.threeMode,
    bindings,
    assets: bindings.flatMap(({ assets }) => assets),
  };
}

export function writeQualifiedResourceProvenance(artifactRoot: string, report: AppliedQualifiedResources) {
  const studioRoot = join(artifactRoot, "_studio");
  mkdirSync(studioRoot, { recursive: true });
  writeFileSync(join(studioRoot, "CURATED_RESOURCES.json"), JSON.stringify(report, null, 2), "utf8");
}
