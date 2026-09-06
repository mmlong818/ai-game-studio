import { z } from "zod";
import type { GameProjectV3 } from "../project-schema/index.js";

const id = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const text = z.string().trim().min(1).max(240);

export const assetMediaTypeSchema = z.enum(["image", "spritesheet", "model", "animation", "material", "audio", "font"]);
export const assetRequirementSchema = z.object({
  id,
  role: z.enum(["player", "background", "obstacle", "collectible", "effect", "interface", "audio", "font", "model"]),
  mediaType: assetMediaTypeSchema,
  usage: z.object({ sceneIds: z.array(id).default([]), objectIds: z.array(id).default([]), stateIds: z.array(id).min(1), mechanicIds: z.array(id).default([]), onboardingStepIds: z.array(id).default([]) }).strict(),
  visual: z.object({ styleFamily: text, view: text.optional(), palette: z.array(z.string().trim().min(1).max(40)).default([]), transparency: z.boolean().optional() }).strict().nullable(),
  technical: z.object({ formats: z.array(z.string().trim().min(1).max(40)).min(1), maxBytes: z.number().int().positive(), dimensions: z.string().trim().min(1).max(80).optional(), lods: z.number().int().min(1).max(5).optional(), maxDurationSeconds: z.number().positive().max(600).optional() }).strict(),
  variants: z.array(id).min(1),
  semanticTags: z.array(id).min(1),
  requiredFor: z.enum(["prototype", "review", "publish"]),
  fallbackPolicy: z.enum(["procedural", "previous-version", "block-build"]),
}).strict();

export const assetBindingSchema = z.object({ requirementId: id, resourceIds: z.array(id).min(1), coveredVariants: z.array(id).min(1), status: z.enum(["draft", "reviewed", "approved"]), reviewNote: text.optional() }).strict();
export const assetRequirementBundleSchema = z.object({ schemaVersion: z.literal("asset-requirements-v1"), projectId: id, designContractId: id, generatedAt: z.string().datetime(), requirements: z.array(assetRequirementSchema).min(1), bindings: z.array(assetBindingSchema).default([]) }).strict();

export type AssetRequirement = z.infer<typeof assetRequirementSchema>;
export type AssetBinding = z.infer<typeof assetBindingSchema>;
export type AssetRequirementBundle = z.infer<typeof assetRequirementBundleSchema>;
export type AssetRequirementGap = { code: "duplicate-requirement" | "duplicate-binding" | "unknown-requirement" | "unknown-resource" | "incompatible-media" | "incompatible-role" | "missing-license" | "unapproved-binding" | "missing-variants" | "missing-binding"; severity: "error" | "warning"; requirementId: string; message: string };

const slug = (value: string) => value.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase() || "UNKNOWN";
export type AssetRequirementDesignSource = {
  id: string;
  projectId: string;
  mechanics: Array<{ id: string }>;
  onboarding: Array<{ id: string; teachesMechanicId: string; presentation: Array<"short-text" | "highlight" | "gesture" | "ghost-action" | "optional-demo" | "sound"> }>;
};

function onboardingVisualVariants(contract: AssetRequirementDesignSource) {
  return [...new Set(contract.onboarding.flatMap(({ presentation }) => presentation).filter((item) => ["highlight", "gesture", "ghost-action", "optional-demo"].includes(item)).map((item) => slug(item)))];
}

export function generateAssetRequirements(contract: AssetRequirementDesignSource, options: { styleFamily?: string; dimensions?: "2d" | "limited-3d"; generatedAt?: string } = {}): AssetRequirementBundle {
  const styleFamily = options.styleFamily?.trim() || "project-cohesive-default";
  const dimensions = options.dimensions ?? "2d";
  const visualType = dimensions === "limited-3d" ? "model" as const : "spritesheet" as const;
  const visualFormats = dimensions === "limited-3d" ? ["model/gltf-binary"] : ["image/webp", "image/png"];
  const visualRole = dimensions === "limited-3d" ? "model" as const : "effect" as const;
  const tutorialVariants = onboardingVisualVariants(contract);
  const requirements: AssetRequirement[] = [
    { id: "ASSET-BACKGROUND", role: "background", mediaType: dimensions === "limited-3d" ? "model" : "image", usage: { sceneIds: [], objectIds: [], stateIds: ["GAMEPLAY"], mechanicIds: [], onboardingStepIds: [] }, visual: { styleFamily, view: dimensions === "limited-3d" ? "environment" : "responsive-gameplay", palette: [], transparency: false }, technical: { formats: visualFormats, maxBytes: dimensions === "limited-3d" ? 2_500_000 : 700_000, ...(dimensions === "limited-3d" ? { lods: 2 } : { dimensions: "responsive, minimum 1920x1080 source" }) }, variants: ["GAMEPLAY"], semanticTags: ["environment", dimensions], requiredFor: "publish", fallbackPolicy: "block-build" },
    { id: "ASSET-UI-SHELL", role: "interface", mediaType: "image", usage: { sceneIds: [], objectIds: [], stateIds: ["START", "PAUSE", "RETRY", "HINT", "SETTINGS", "WIN", "LOSE"], mechanicIds: [], onboardingStepIds: [] }, visual: { styleFamily, view: "screen-space", palette: [], transparency: true }, technical: { formats: ["image/svg+xml", "image/webp", "image/png"], maxBytes: 450_000, dimensions: "responsive UI atlas or vectors" }, variants: ["START", "PAUSE", "RETRY", "HINT", "SETTINGS", "WIN", "LOSE"], semanticTags: ["ui", "game-lifecycle", "accessibility"], requiredFor: "publish", fallbackPolicy: "block-build" },
    { id: "ASSET-AUDIO-FEEDBACK", role: "audio", mediaType: "audio", usage: { sceneIds: [], objectIds: [], stateIds: ["ACTION", "INVALID", "REWARD", "FAILURE", "WIN"], mechanicIds: contract.mechanics.map(({ id: mechanicId }) => mechanicId), onboardingStepIds: [] }, visual: null, technical: { formats: ["audio/ogg", "audio/mpeg"], maxBytes: 900_000, maxDurationSeconds: 4 }, variants: ["ACTION", "INVALID", "REWARD", "FAILURE", "WIN"], semanticTags: ["audio", "feedback", "accessibility"], requiredFor: "review", fallbackPolicy: "previous-version" },
    ...contract.mechanics.map<AssetRequirement>((mechanic) => ({ id: `ASSET-MECHANIC-${slug(mechanic.id)}`, role: visualRole, mediaType: visualType, usage: { sceneIds: [], objectIds: [], stateIds: ["NORMAL", "TARGET", "ACTIVE", "DISABLED"], mechanicIds: [mechanic.id], onboardingStepIds: contract.onboarding.filter(({ teachesMechanicId }) => teachesMechanicId === mechanic.id).map(({ id: stepId }) => stepId) }, visual: { styleFamily, view: dimensions === "limited-3d" ? "game-camera-compatible" : "gameplay-facing", palette: [], transparency: true }, technical: { formats: visualFormats, maxBytes: dimensions === "limited-3d" ? 1_500_000 : 500_000, ...(dimensions === "limited-3d" ? { lods: 2 } : { dimensions: "power-of-two atlas, max 2048x2048" }) }, variants: ["NORMAL", "TARGET", "ACTIVE", "DISABLED"], semanticTags: ["mechanic", slug(mechanic.id).toLowerCase(), dimensions], requiredFor: "publish", fallbackPolicy: "block-build" })),
  ];
  if (tutorialVariants.length > 0) requirements.push({ id: "ASSET-ONBOARDING-OVERLAY", role: "interface", mediaType: "image", usage: { sceneIds: [], objectIds: [], stateIds: tutorialVariants, mechanicIds: [], onboardingStepIds: contract.onboarding.map(({ id: stepId }) => stepId) }, visual: { styleFamily, view: "screen-space-non-blocking", palette: [], transparency: true }, technical: { formats: ["image/svg+xml", "image/webp", "image/png"], maxBytes: 350_000, dimensions: "responsive overlay" }, variants: tutorialVariants, semanticTags: ["onboarding", "ui", "accessibility"], requiredFor: "review", fallbackPolicy: "procedural" });
  return assetRequirementBundleSchema.parse({ schemaVersion: "asset-requirements-v1", projectId: contract.projectId, designContractId: contract.id, generatedAt: options.generatedAt ?? new Date().toISOString(), requirements, bindings: [] });
}

function mediaCompatible(mediaType: AssetRequirement["mediaType"], mimeType: string) {
  if (mediaType === "audio") return mimeType.startsWith("audio/");
  if (["image", "spritesheet"].includes(mediaType)) return mimeType.startsWith("image/");
  if (["model", "animation"].includes(mediaType)) return mimeType.includes("gltf") || mimeType.includes("model");
  if (mediaType === "font") return mimeType.startsWith("font/") || mimeType.includes("woff");
  return true;
}

export function auditAssetRequirementBundle(project: GameProjectV3, input: unknown) {
  const parsed = assetRequirementBundleSchema.safeParse(input);
  if (!parsed.success) return { bundle: null, gaps: parsed.error.issues.map((issue) => ({ code: "missing-binding" as const, severity: "error" as const, requirementId: issue.path.join("."), message: issue.message })), publishReady: false };
  const bundle = parsed.data;
  const gaps: AssetRequirementGap[] = [];
  const requirementById = new Map(bundle.requirements.map((requirement) => [requirement.id, requirement]));
  const resourceById = new Map(project.resources.map((resource) => [resource.id, resource]));
  const requirementCounts = new Map<string, number>();
  const bindingCounts = new Map<string, number>();
  bundle.requirements.forEach(({ id: requirementId }) => requirementCounts.set(requirementId, (requirementCounts.get(requirementId) ?? 0) + 1));
  bundle.bindings.forEach(({ requirementId }) => bindingCounts.set(requirementId, (bindingCounts.get(requirementId) ?? 0) + 1));
  requirementCounts.forEach((count, requirementId) => { if (count > 1) gaps.push({ code: "duplicate-requirement", severity: "error", requirementId, message: `资源需求 ID 重复：${requirementId}` }); });
  bindingCounts.forEach((count, requirementId) => { if (count > 1) gaps.push({ code: "duplicate-binding", severity: "error", requirementId, message: `资源需求存在多个绑定记录：${requirementId}` }); });
  bundle.bindings.forEach((binding) => {
    const requirement = requirementById.get(binding.requirementId);
    if (!requirement) { gaps.push({ code: "unknown-requirement", severity: "error", requirementId: binding.requirementId, message: "绑定引用了不存在的资源需求" }); return; }
    if (binding.status !== "approved") gaps.push({ code: "unapproved-binding", severity: requirement.requiredFor === "publish" ? "error" : "warning", requirementId: requirement.id, message: `绑定状态为 ${binding.status}，尚未批准` });
    const missingVariants = requirement.variants.filter((variant) => !binding.coveredVariants.includes(variant));
    if (missingVariants.length > 0) gaps.push({ code: "missing-variants", severity: requirement.requiredFor === "publish" ? "error" : "warning", requirementId: requirement.id, message: `缺少状态变体：${missingVariants.join("、")}` });
    binding.resourceIds.forEach((resourceId) => {
      const resource = resourceById.get(resourceId);
      if (!resource) { gaps.push({ code: "unknown-resource", severity: "error", requirementId: requirement.id, message: `绑定资源不存在：${resourceId}` }); return; }
      if (!mediaCompatible(requirement.mediaType, resource.mimeType)) gaps.push({ code: "incompatible-media", severity: "error", requirementId: requirement.id, message: `${resourceId} 的媒体类型 ${resource.mimeType} 与 ${requirement.mediaType} 不兼容` });
      if (resource.role !== requirement.role && !(requirement.mediaType === "spritesheet" && resource.role === "effect")) gaps.push({ code: "incompatible-role", severity: "error", requirementId: requirement.id, message: `${resourceId} 的角色 ${resource.role} 与需求 ${requirement.role} 不一致` });
      if (!resource.license.trim()) gaps.push({ code: "missing-license", severity: "error", requirementId: requirement.id, message: `${resourceId} 缺少许可信息` });
    });
  });
  bundle.requirements.forEach((requirement) => {
    if (bindingCounts.has(requirement.id)) return;
    const mayFallback = requirement.requiredFor === "prototype" && requirement.fallbackPolicy === "procedural";
    gaps.push({ code: "missing-binding", severity: mayFallback ? "warning" : "error", requirementId: requirement.id, message: mayFallback ? "原型阶段暂用程序化占位" : `缺少 ${requirement.requiredFor} 阶段所需资源绑定` });
  });
  return { bundle, gaps, publishReady: !gaps.some(({ severity }) => severity === "error") };
}

export function serializeAssetRequirementBundle(input: unknown) { return `${JSON.stringify(assetRequirementBundleSchema.parse(input), null, 2)}\n`; }
