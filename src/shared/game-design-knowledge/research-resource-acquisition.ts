import { z } from "zod";
import { rankResourceFamilies, type ResourceFamily } from "../resource-library/index.js";
import { assetRequirementBundleSchema, type AssetRequirement } from "../resource-requirements/index.js";

const acquisitionRouteSchema = z.enum(["reuse-existing", "procedural-generate", "procure", "create"]);
const acquisitionDecisionSchema = z.object({
  requirementId: z.string().min(1),
  role: z.enum(["player", "background", "obstacle", "collectible", "effect", "interface", "audio", "font", "model"]),
  requiredFor: z.enum(["prototype", "review", "publish"]),
  route: acquisitionRouteSchema,
  status: z.enum(["ready", "review-required", "planned", "blocked"]),
  selectedFamilyId: z.string().min(1).nullable(),
  suggestedPaths: z.array(z.string().min(1)).max(12),
  missingVariants: z.array(z.string().min(1)),
  license: z.object({
    status: z.enum(["verified", "pending", "not-required"]),
    licenseId: z.string().min(1).nullable(),
    sourceUrl: z.string().url().nullable(),
    obligations: z.array(z.string().min(1)),
  }).strict(),
  operatorAction: z.enum(["none", "approve-binding", "review-purchase-terms", "review-created-asset"]),
  deliverable: z.string().min(1),
  reason: z.string().min(1),
}).strict();

export const researchResourceAcquisitionPlanSchema = z.object({
  schemaVersion: z.literal("research-resource-acquisition-v1"),
  catalogVersion: z.literal("curated-v1"),
  generatedAt: z.string().datetime(),
  decisions: z.array(acquisitionDecisionSchema).min(1),
  summary: z.object({
    total: z.number().int().nonnegative(),
    reuseExisting: z.number().int().nonnegative(),
    proceduralGenerate: z.number().int().nonnegative(),
    procure: z.number().int().nonnegative(),
    create: z.number().int().nonnegative(),
    licenseReview: z.number().int().nonnegative(),
    unresolved: z.number().int().nonnegative(),
    planningReady: z.boolean(),
  }).strict(),
}).strict();

export type ResearchResourceAcquisitionPlan = z.infer<typeof researchResourceAcquisitionPlanSchema>;

const deliverableFor = (requirement: AssetRequirement) => {
  const stage = requirement.requiredFor === "prototype" ? "原型" : requirement.requiredFor === "review" ? "评审" : "发布";
  return `${stage}前交付 ${requirement.variants.join("、")} 状态的${requirement.role}资源`;
};

export function createResearchResourceAcquisitionPlan(
  bundleInput: unknown,
  families: ResourceFamily[],
  generatedAt = new Date().toISOString(),
): ResearchResourceAcquisitionPlan {
  const bundle = assetRequirementBundleSchema.parse(bundleInput);
  const decisions = bundle.requirements.map((requirement) => {
    const candidates = rankResourceFamilies(requirement, families, { styleTags: ["neutral"], openSourcePackage: true });
    const best = candidates.find(({ eligible }) => eligible) ?? null;
    const complete = best && best.missingStates.length === 0 && best.suggestedPaths.length > 0 && best.score >= 75;
    if (complete) {
      const family = families.find(({ profile }) => profile.familyId === best.familyId)!;
      const manifest = family.manifest;
      const source = manifest.schemaVersion === "curated-resource-family-v1" ? manifest.source : null;
      const researchSource = manifest.schemaVersion === "research-resource-family-v1" ? manifest.sources[0]! : null;
      return acquisitionDecisionSchema.parse({
        requirementId: requirement.id, role: requirement.role, requiredFor: requirement.requiredFor,
        route: "reuse-existing", status: "review-required", selectedFamilyId: best.familyId,
        suggestedPaths: best.suggestedPaths, missingVariants: [],
        license: source ? { status: "verified", licenseId: source.licenseId, sourceUrl: source.sourceUrl, obligations: source.attributionText ? [source.attributionText] : [] } : { status: "verified", licenseId: researchSource!.licenseId, sourceUrl: researchSource!.sourceUrl, obligations: manifest.schemaVersion === "research-resource-family-v1" ? manifest.sources.flatMap(({ obligations }) => obligations) : [] },
        operatorAction: "approve-binding", deliverable: deliverableFor(requirement),
        reason: `${family.profile.label}已通过角色、格式和许可门禁；绑定前仍需确认具体资源与玩法语义一致。`,
      });
    }
    if (requirement.fallbackPolicy === "procedural") return acquisitionDecisionSchema.parse({
      requirementId: requirement.id, role: requirement.role, requiredFor: requirement.requiredFor,
      route: "procedural-generate", status: "ready", selectedFamilyId: null, suggestedPaths: [], missingVariants: requirement.variants,
      license: { status: "not-required", licenseId: null, sourceUrl: null, obligations: [] },
      operatorAction: "none", deliverable: deliverableFor(requirement),
      reason: "该需求允许程序化占位，可由原型运行时按合同生成，不需要外部素材。",
    });
    if ((requirement.role === "audio" || requirement.role === "font") && !best) return acquisitionDecisionSchema.parse({
      requirementId: requirement.id, role: requirement.role, requiredFor: requirement.requiredFor,
      route: "procure", status: "planned", selectedFamilyId: null, suggestedPaths: [], missingVariants: requirement.variants,
      license: { status: "pending", licenseId: null, sourceUrl: null, obligations: [] },
      operatorAction: "review-purchase-terms", deliverable: deliverableFor(requirement),
      reason: "精选库没有兼容资源，需从允许商业使用和源包再分发的来源取得，并在入库前复核许可。",
    });
    return acquisitionDecisionSchema.parse({
      requirementId: requirement.id, role: requirement.role, requiredFor: requirement.requiredFor,
      route: "create", status: "planned", selectedFamilyId: best?.familyId ?? null,
      suggestedPaths: best?.suggestedPaths ?? [], missingVariants: best?.missingStates.length ? best.missingStates : requirement.variants,
      license: { status: "not-required", licenseId: "project-owned", sourceUrl: null, obligations: [] },
      operatorAction: "review-created-asset", deliverable: deliverableFor(requirement),
      reason: best ? `可参考 ${best.familyId} 的基础结构，但仍需创作缺失状态并统一风格。` : "精选库没有通过角色、格式和许可门禁的候选，需要由平台生成或自行创作。",
    });
  });
  const count = (route: z.infer<typeof acquisitionRouteSchema>) => decisions.filter((decision) => decision.route === route).length;
  const unresolved = decisions.filter(({ status }) => status === "blocked").length;
  return researchResourceAcquisitionPlanSchema.parse({
    schemaVersion: "research-resource-acquisition-v1", catalogVersion: "curated-v1", generatedAt, decisions,
    summary: {
      total: decisions.length,
      reuseExisting: count("reuse-existing"), proceduralGenerate: count("procedural-generate"), procure: count("procure"), create: count("create"),
      licenseReview: decisions.filter(({ license }) => license.status === "pending").length,
      unresolved,
      planningReady: decisions.length === bundle.requirements.length && unresolved === 0,
    },
  });
}
