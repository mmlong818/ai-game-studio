import { z } from "zod";
import type { GameTemplate } from "../contracts.js";
import { resolveQualifiedResourceBindingRecipes } from "../resource-bindings/index.js";
import { rankResourceFamilies, type ResourceFamily } from "../resource-library/index.js";
import { assetRequirementSchema, generateAssetRequirements } from "../resource-requirements/index.js";

const matchSchema = z.object({ familyId: z.string().min(1), score: z.number().min(0).max(100), eligible: z.boolean(), autoBindable: z.boolean(), missingStates: z.array(z.string()), reasons: z.array(z.string()), suggestedPaths: z.array(z.string()) }).strict();
const decisionSchema = z.object({
  requirementId: z.string().min(1),
  action: z.enum(["reuse-approved", "review-reuse", "generate-missing-variants", "generate-new"]),
  selectedFamilyId: z.string().min(1).nullable(),
  selectedRecipeId: z.string().min(1).nullable().default(null),
  reason: z.string().min(1),
  candidates: z.array(matchSchema).max(3),
}).strict();

export const resourcePlanningShadowSchema = z.object({
  schemaVersion: z.literal("resource-planning-v1"), mode: z.literal("shadow"), catalogVersion: z.literal("curated-v1"),
  requirements: z.array(assetRequirementSchema).min(1), decisions: z.array(decisionSchema).min(1),
  summary: z.object({ total: z.number().int().nonnegative(), reusable: z.number().int().nonnegative(), needsReview: z.number().int().nonnegative(), needsGeneration: z.number().int().nonnegative(), blocked: z.number().int().nonnegative() }).strict(),
}).strict();
export type ResourcePlanningShadow = z.infer<typeof resourcePlanningShadowSchema>;

export type ResourcePlanningInput = {
  dimensions: "2d" | "3d";
  visualStyle: "classic" | "calm" | "fashion" | "cute" | "line-art" | "color-block";
  mechanicIds: string[];
  onboardingStepCount: number;
  template?: GameTemplate;
  runtimeTarget?: "web-2d" | "web-3d";
  threeMode?: "collector" | "arena" | null;
};

const styleTags: Record<ResourcePlanningInput["visualStyle"], string[]> = {
  classic: ["classic", "clean"], calm: ["clean", "neutral"], fashion: ["clean"], cute: ["colorful", "casual"], "line-art": ["minimal"], "color-block": ["colorful"],
};
const stableMechanics = (values: string[]) => [...new Set(values.filter((value) => /^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(value)))];

export function createResourcePlanningShadow(input: ResourcePlanningInput, families: ResourceFamily[]): ResourcePlanningShadow {
  const mechanicIds = stableMechanics(input.mechanicIds);
  const resolvedMechanics = mechanicIds.length ? mechanicIds : ["SPEC-MECHANIC-01"];
  const onboarding = Array.from({ length: Math.max(1, input.onboardingStepCount) }, (_, index) => ({
    id: `SPEC-ONBOARD-${String(index + 1).padStart(2, "0")}`,
    teachesMechanicId: resolvedMechanics[index % resolvedMechanics.length]!,
    presentation: ["short-text", index === 0 ? "gesture" : "highlight"] as Array<"short-text" | "highlight" | "gesture">,
  }));
  const requirements = generateAssetRequirements({ id: "DESIGN-PENDING", projectId: "PROJECT-PENDING", mechanics: resolvedMechanics.map((id) => ({ id })), onboarding }, {
    styleFamily: input.visualStyle,
    dimensions: input.dimensions === "3d" ? "limited-3d" : "2d",
    generatedAt: "2026-09-05T00:00:00.000Z",
  }).requirements;
  const qualifiedRecipes = input.template && input.runtimeTarget
    ? resolveQualifiedResourceBindingRecipes({ template: input.template, dimensions: input.dimensions, runtimeTarget: input.runtimeTarget, threeMode: input.threeMode ?? null, requirements })
    : [];
  const recipesByRequirement = new Map<string, typeof qualifiedRecipes>();
  for (const recipe of qualifiedRecipes) {
    for (const requirementId of recipe.requirementIds) recipesByRequirement.set(requirementId, [...(recipesByRequirement.get(requirementId) ?? []), recipe]);
  }
  const decisions = requirements.map((requirement) => {
    const qualified = recipesByRequirement.get(requirement.id) ?? [];
    const selectedRecipe = qualified.length === 1 ? qualified[0]! : null;
    const candidates = rankResourceFamilies(requirement, families, { styleTags: styleTags[input.visualStyle] }).slice(0, 3).map(({ familyId, score, eligible, autoBindable, missingStates, reasons, suggestedPaths }) => selectedRecipe?.recipe.familyId === familyId
      ? { familyId, score: Math.max(90, score), eligible: true, autoBindable: true, missingStates: [], reasons: [...reasons.filter((reason) => !reason.startsWith("缺少状态：")), `已验证配方 ${selectedRecipe.recipe.id} 完整覆盖该需求`], suggestedPaths: selectedRecipe.recipe.assets.map(({ source }) => source) }
      : { familyId, score, eligible, autoBindable, missingStates, reasons, suggestedPaths });
    const best = candidates.find(({ eligible }) => eligible) ?? null;
    const action = selectedRecipe ? "reuse-approved" as const : qualified.length > 1 ? "review-reuse" as const : best?.autoBindable ? "reuse-approved" as const : best && best.missingStates.length === 0 && best.score >= 80 ? "review-reuse" as const : best && best.score >= 60 ? "generate-missing-variants" as const : "generate-new" as const;
    const reason = selectedRecipe ? `浏览器验证配方 ${selectedRecipe.recipe.id} 已完整覆盖角色、状态、格式与运行时槽位。` : qualified.length > 1 ? "多个已验证配方同时匹配，需要先解决槽位优先级。" : action === "reuse-approved" ? "已有推荐资源族完整满足需求，可自动绑定。" : action === "review-reuse" ? "已有完整候选，但资源族尚需黄金游戏验证或人工确认。" : action === "generate-missing-variants" ? `候选资源族可复用基础结构，但需补齐：${best?.missingStates.join("、") || "风格或状态"}。` : "没有达到基础兼容与许可门禁的资源族，需要生成或引入新资源。";
    return { requirementId: requirement.id, action, selectedFamilyId: selectedRecipe?.recipe.familyId ?? best?.familyId ?? null, selectedRecipeId: selectedRecipe?.recipe.id ?? null, reason, candidates };
  });
  return resourcePlanningShadowSchema.parse({ schemaVersion: "resource-planning-v1", mode: "shadow", catalogVersion: "curated-v1", requirements, decisions, summary: {
    total: decisions.length,
    reusable: decisions.filter(({ action }) => action === "reuse-approved").length,
    needsReview: decisions.filter(({ action }) => action === "review-reuse").length,
    needsGeneration: decisions.filter(({ action }) => action === "generate-new" || action === "generate-missing-variants").length,
    blocked: decisions.filter(({ candidates }) => candidates.every(({ eligible }) => !eligible)).length,
  } });
}

export function createResourcePlanningForGameSpec(spec: {
  template: GameTemplate;
  dimensions: "2d" | "3d";
  runtimeTarget: "web-2d" | "web-3d";
  threeMode: "collector" | "arena" | null;
  visualStyle: ResourcePlanningInput["visualStyle"];
  mechanics: string[];
  designProfile: { onboarding: string[] };
  designKnowledge?: { plan: { mechanicIds: string[] } } | null;
}, families: ResourceFamily[]) {
  const knowledgeMechanics = spec.designKnowledge?.plan.mechanicIds ?? [];
  const fallbackMechanics = spec.mechanics.map((_, index) => `SPEC-MECHANIC-${String(index + 1).padStart(2, "0")}`);
  return createResourcePlanningShadow({ template: spec.template, dimensions: spec.dimensions, runtimeTarget: spec.runtimeTarget, threeMode: spec.threeMode, visualStyle: spec.visualStyle, mechanicIds: knowledgeMechanics.length ? knowledgeMechanics : fallbackMechanics, onboardingStepCount: spec.designProfile.onboarding.length }, families);
}

export function resourceReplacementImpact(plan: ResourcePlanningShadow, requirementId: string) {
  const requirement = plan.requirements.find(({ id }) => id === requirementId);
  if (!requirement) throw new Error(`资源需求不存在：${requirementId}`);
  return {
    requirementId,
    mechanicIds: requirement.usage.mechanicIds,
    onboardingStepIds: requirement.usage.onboardingStepIds,
    invalidatedChecks: [...new Set(["asset", ...(requirement.role === "interface" ? ["viewport", "accessibility"] : []), ...(requirement.role === "audio" || requirement.role === "effect" ? ["game-feel"] : [])])],
    requiredActions: ["重新校验哈希与许可", "重新生成预览并人工复核", "重跑受影响的浏览器验收"],
  };
}
