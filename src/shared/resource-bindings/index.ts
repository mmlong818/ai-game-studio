import { z } from "zod";
import type { GameTemplate } from "../contracts.js";
import { assetMediaTypeSchema, type AssetRequirement } from "../resource-requirements/index.js";

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const bindingGameTemplateSchema = z.custom<GameTemplate>((value) => typeof value === "string" && value.length > 0, "资源配方模板必须是有效字符串");
const state = z.string().regex(/^[A-Z][A-Z0-9_-]*$/);
const role = z.enum(["player", "background", "obstacle", "collectible", "effect", "interface", "audio", "font", "model"]);

export const resourceBindingRecipeSchema = z.object({
  id: slug,
  familyId: slug,
  scope: z.object({
    templates: z.array(bindingGameTemplateSchema).min(1),
    dimensions: z.array(z.enum(["2d", "3d"])).min(1),
    runtimeTargets: z.array(z.enum(["web-2d", "web-3d"])).min(1),
    threeModes: z.array(z.enum(["collector", "arena"])).default([]),
  }).strict(),
  requirementSelectors: z.array(z.object({
    roles: z.array(role).min(1),
    mediaTypes: z.array(assetMediaTypeSchema).min(1),
    coveredVariants: z.array(state).min(1),
    semanticTagsAny: z.array(slug).default([]),
    derivedVariants: z.array(z.object({ variant: state, transform: z.enum(["runtime-alpha", "runtime-emissive", "runtime-layout"]) }).strict()).default([]),
  }).strict()).min(1),
  assets: z.array(z.object({
    source: z.string().min(1), target: z.string().min(1), runtimeRole: z.string().min(1), runtimeEvidence: z.string().min(1),
  }).strict()).min(1),
  qualification: z.object({
    status: z.literal("browser-verified"), verifiedAt: z.string().datetime(), evidenceIds: z.array(z.string().min(1)).min(1),
  }).strict(),
}).strict();

export type ResourceBindingRecipe = z.infer<typeof resourceBindingRecipeSchema>;

const spriteTarget = (index: number) => `assets/sprites/sprite-${String(index).padStart(2, "0")}.png`;
const normalActiveSelector = {
  roles: ["effect"] as const,
  mediaTypes: ["spritesheet"] as const,
  coveredVariants: ["NORMAL", "TARGET", "ACTIVE", "DISABLED"],
  semanticTagsAny: ["mechanic"],
  derivedVariants: [{ variant: "DISABLED", transform: "runtime-alpha" as const }],
};

export const QUALIFIED_RESOURCE_BINDING_RECIPES: ResourceBindingRecipe[] = [
  {
    id: "merge-2048-classic-puzzle-slots", familyId: "classic-puzzle-2d",
    scope: { templates: ["merge-2048"], dimensions: ["2d"], runtimeTargets: ["web-2d"], threeModes: [] },
    requirementSelectors: [normalActiveSelector],
    assets: [
      { source: "PNG/Default/element_grey_square_glossy.png", target: spriteTarget(1), runtimeRole: "空格底纹", runtimeEvidence: "drawMergeTile(0) 使用 sprite index 0" },
      { source: "PNG/Default/element_blue_square_glossy.png", target: spriteTarget(2), runtimeRole: "2/128/8192 方块", runtimeEvidence: "drawMergeTile 按 log2(value) 映射 sprite index 1" },
      { source: "PNG/Default/element_green_square_glossy.png", target: spriteTarget(3), runtimeRole: "4/256/16384 方块", runtimeEvidence: "drawMergeTile 按 log2(value) 映射 sprite index 2" },
      { source: "PNG/Default/element_purple_cube_glossy.png", target: spriteTarget(4), runtimeRole: "8/512/32768 方块", runtimeEvidence: "drawMergeTile 按 log2(value) 映射 sprite index 3" },
      { source: "PNG/Default/element_red_square_glossy.png", target: spriteTarget(5), runtimeRole: "16/1024 方块", runtimeEvidence: "drawMergeTile 按 log2(value) 映射 sprite index 4" },
      { source: "PNG/Default/element_yellow_square_glossy.png", target: spriteTarget(6), runtimeRole: "32/2048 方块", runtimeEvidence: "drawMergeTile 按 log2(value) 映射 sprite index 5" },
      { source: "PNG/Default/element_blue_polygon_glossy.png", target: spriteTarget(7), runtimeRole: "64/4096 方块", runtimeEvidence: "drawMergeTile 按 log2(value) 映射 sprite index 6" },
    ],
    qualification: { status: "browser-verified", verifiedAt: "2026-09-05T00:00:00.000Z", evidenceIds: ["golden-resource-browser:merge-2048", "stage-d:merge-2048"] },
  },
  {
    id: "breakout-classic-puzzle-slots", familyId: "classic-puzzle-2d",
    scope: { templates: ["breakout"], dimensions: ["2d"], runtimeTargets: ["web-2d"], threeModes: [] },
    requirementSelectors: [normalActiveSelector],
    assets: [
      { source: "PNG/Default/paddleBlu.png", target: spriteTarget(5), runtimeRole: "玩家挡板", runtimeEvidence: "drawBreakout 使用 drawBitmapSprite(4)" },
      { source: "PNG/Default/ballBlue.png", target: spriteTarget(6), runtimeRole: "弹球", runtimeEvidence: "drawBreakout 使用 drawBitmapSprite(5)" },
      { source: "PNG/Default/particleCartoonStar.png", target: spriteTarget(7), runtimeRole: "命中和爆炸反馈", runtimeEvidence: "drawImpactBursts 与聚光状态使用 drawBitmapSprite(6)" },
    ],
    qualification: { status: "browser-verified", verifiedAt: "2026-09-05T00:00:00.000Z", evidenceIds: ["golden-resource-browser:breakout", "stage-c:breakout"] },
  },
  {
    id: "polyomino-fit-classic-puzzle-slots", familyId: "classic-puzzle-2d",
    scope: { templates: ["polyomino-fit"], dimensions: ["2d"], runtimeTargets: ["web-2d"], threeModes: [] },
    requirementSelectors: [normalActiveSelector],
    assets: [
      { source: "PNG/Default/element_blue_square_glossy.png", target: spriteTarget(1), runtimeRole: "蓝色软糖拼块", runtimeEvidence: "polyomino piece.sprite 0 使用 drawBitmapSprite(0)" },
      { source: "PNG/Default/element_green_square_glossy.png", target: spriteTarget(2), runtimeRole: "绿色软糖拼块", runtimeEvidence: "polyomino piece.sprite 1 使用 drawBitmapSprite(1)" },
      { source: "PNG/Default/element_grey_square_glossy.png", target: spriteTarget(3), runtimeRole: "白色软糖拼块", runtimeEvidence: "polyomino piece.sprite 2 使用 drawBitmapSprite(2)" },
      { source: "PNG/Default/element_red_square_glossy.png", target: spriteTarget(4), runtimeRole: "红色软糖拼块", runtimeEvidence: "polyomino piece.sprite 3 使用 drawBitmapSprite(3)" },
      { source: "PNG/Default/element_yellow_square_glossy.png", target: spriteTarget(5), runtimeRole: "黄色软糖拼块", runtimeEvidence: "polyomino piece.sprite 4 使用 drawBitmapSprite(4)" },
      { source: "PNG/Default/element_purple_polygon_glossy.png", target: spriteTarget(6), runtimeRole: "紫色软糖拼块", runtimeEvidence: "polyomino piece.sprite 5 使用 drawBitmapSprite(5)" },
    ],
    qualification: { status: "browser-verified", verifiedAt: "2026-09-05T00:00:00.000Z", evidenceIds: ["minimal-creation-golden:polyomino-fit", "stage-d:polyomino-fit"] },
  },
  {
    id: "collector-low-poly-nature-scene", familyId: "low-poly-nature-3d",
    scope: { templates: ["signal-hunt"], dimensions: ["3d"], runtimeTargets: ["web-3d"], threeModes: ["collector"] },
    requirementSelectors: [{ roles: ["background"], mediaTypes: ["model"], coveredVariants: ["GAMEPLAY"], semanticTagsAny: ["environment"], derivedVariants: [{ variant: "GAMEPLAY", transform: "runtime-layout" }] }],
    assets: [
      { source: "Models/GLTF format/bridge_stone.glb", target: "assets/models/curated/bridge_stone.glb", runtimeRole: "遗迹石桥", runtimeEvidence: "GLTFLoader 加载后加入 collectorCuratedLayer 并按包围盒归一化" },
      { source: "Models/GLTF format/cactus_short.glb", target: "assets/models/curated/cactus_short.glb", runtimeRole: "路线地标", runtimeEvidence: "GLTFLoader 加载后加入 collectorCuratedLayer 并启用投射阴影" },
      { source: "Models/GLTF format/campfire_stones.glb", target: "assets/models/curated/campfire_stones.glb", runtimeRole: "营地地标", runtimeEvidence: "GLTFLoader 加载后加入 collectorCuratedLayer 并启用接收阴影" },
    ],
    qualification: { status: "browser-verified", verifiedAt: "2026-09-05T00:00:00.000Z", evidenceIds: ["stage-f:collector:phone", "stage-f:collector:desktop"] },
  },
].map((recipe) => resourceBindingRecipeSchema.parse(recipe));

export type ResourceBindingContext = {
  template: GameTemplate;
  dimensions: "2d" | "3d";
  runtimeTarget: "web-2d" | "web-3d";
  threeMode: "collector" | "arena" | null;
  requirements: AssetRequirement[];
};

export type ResourceBindingRecipeEvaluation = {
  recipe: ResourceBindingRecipe;
  eligible: boolean;
  requirementIds: string[];
  reasons: string[];
};

function selectorMatches(requirement: AssetRequirement, selector: ResourceBindingRecipe["requirementSelectors"][number]) {
  return selector.roles.includes(requirement.role)
    && selector.mediaTypes.includes(requirement.mediaType)
    && requirement.variants.every((variant) => selector.coveredVariants.includes(variant))
    && (selector.semanticTagsAny.length === 0 || selector.semanticTagsAny.some((tag) => requirement.semanticTags.includes(tag)));
}

export function evaluateResourceBindingRecipes(
  context: ResourceBindingContext,
  recipes: ResourceBindingRecipe[] = QUALIFIED_RESOURCE_BINDING_RECIPES,
): ResourceBindingRecipeEvaluation[] {
  return recipes.map((recipe) => {
    const reasons: string[] = [];
    if (!recipe.scope.templates.includes(context.template)) reasons.push("模板不匹配");
    if (!recipe.scope.dimensions.includes(context.dimensions)) reasons.push("维度不匹配");
    if (!recipe.scope.runtimeTargets.includes(context.runtimeTarget)) reasons.push("运行时不匹配");
    if (recipe.scope.threeModes.length > 0 && (!context.threeMode || !recipe.scope.threeModes.includes(context.threeMode))) reasons.push("3D 模式不匹配");
    const matched = recipe.requirementSelectors.map((selector) => context.requirements.filter((requirement) => selectorMatches(requirement, selector)));
    matched.forEach((requirements, index) => { if (requirements.length === 0) reasons.push(`需求选择器 ${index + 1} 没有完整覆盖的需求`); });
    return { recipe, eligible: reasons.length === 0, requirementIds: [...new Set(matched.flat().map(({ id }) => id))], reasons };
  });
}

export function resolveQualifiedResourceBindingRecipes(context: ResourceBindingContext, recipes?: ResourceBindingRecipe[]) {
  return evaluateResourceBindingRecipes(context, recipes).filter(({ eligible }) => eligible);
}

export type ResourceFamilyBindingQualification = {
  recommendation: "global" | "qualified-recipes-only" | "review-required";
  recipeIds: string[];
  coveredTemplates: GameTemplate[];
  coveredRoles: AssetRequirement["role"][];
  evidenceIds: string[];
};

export function summarizeResourceFamilyBindingQualification(
  familyId: string,
  lifecycle: "candidate" | "reviewed" | "recommended",
  recipes: ResourceBindingRecipe[] = QUALIFIED_RESOURCE_BINDING_RECIPES,
): ResourceFamilyBindingQualification {
  const matched = recipes.filter((recipe) => recipe.familyId === familyId);
  return {
    recommendation: lifecycle === "recommended" ? "global" : matched.length > 0 ? "qualified-recipes-only" : "review-required",
    recipeIds: [...new Set(matched.map(({ id }) => id))].sort(),
    coveredTemplates: [...new Set(matched.flatMap(({ scope }) => scope.templates))].sort(),
    coveredRoles: [...new Set(matched.flatMap(({ requirementSelectors }) => requirementSelectors.flatMap(({ roles }) => roles)))].sort(),
    evidenceIds: [...new Set(matched.flatMap(({ qualification }) => qualification.evidenceIds))].sort(),
  };
}
