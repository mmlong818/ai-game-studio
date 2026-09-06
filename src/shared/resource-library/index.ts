import { z } from "zod";
import type { AssetRequirement } from "../resource-requirements/index.js";
import { evaluateResourceLicense } from "../resource-sources/index.js";
import { resourceSourceRecordSchema } from "../resource-sources/schemas.js";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const hash = z.string().regex(/^[A-F0-9]{64}$/);
export const resourceFamilyAssetSchema = z.object({ path: z.string().min(1), bytes: z.number().int().positive(), sha256: hash }).strict();
export const curatedResourceFamilyManifestSchema = z.object({
  schemaVersion: z.literal("curated-resource-family-v1"), familyId: id, packId: id, importedAt: z.string().datetime(), source: resourceSourceRecordSchema,
  archive: z.object({ fileName: z.string().min(1), sha256: hash, downloadUrl: z.string().url() }).strict(),
  license: z.object({ entry: z.string().min(1), sha256: hash }).strict(), selectionRationale: z.string().min(1), assets: z.array(resourceFamilyAssetSchema).min(1),
}).strict();

export const researchResourceFamilyManifestSchema = z.object({
  schemaVersion: z.literal("research-resource-family-v1"), familyId: id, researchTaskId: z.string().min(1), intakeBatchId: z.string().min(1), promotedAt: z.string().datetime(),
  sources: z.array(z.object({ route: z.enum(["reuse-existing", "procedural-generate", "procure", "create"]), sourceUrl: z.string().url().nullable(), licenseId: z.string().min(1), obligations: z.array(z.string().min(1)), securityReviewId: z.string().min(1) }).strict()).min(1),
  assets: z.array(resourceFamilyAssetSchema).min(1),
}).strict();
export const resourceFamilyManifestSchema = z.union([curatedResourceFamilyManifestSchema, researchResourceFamilyManifestSchema]);

export const resourceFamilyProfileSchema = z.object({
  familyId: id, label: z.string().min(1), dimensions: z.array(z.enum(["2d", "limited-3d"])).min(1),
  roles: z.array(z.enum(["player", "background", "obstacle", "collectible", "effect", "interface", "audio", "font", "model"])).min(1),
  mediaTypes: z.array(z.enum(["image", "spritesheet", "model", "animation", "material", "audio", "font"])).min(1),
  formats: z.array(z.string().min(1)).min(1), styleTags: z.array(id).min(1), gameplayTags: z.array(id).min(1), stateTags: z.array(z.string().min(1)),
  lifecycle: z.enum(["candidate", "reviewed", "recommended"]), previewPaths: z.array(z.string()).default([]),
}).strict();

export const resourceFamilySchema = z.object({ manifest: resourceFamilyManifestSchema, profile: resourceFamilyProfileSchema }).strict().refine((value) => value.manifest.familyId === value.profile.familyId, "资源清单与资料的 familyId 不一致");
export type CuratedResourceFamilyManifest = z.infer<typeof curatedResourceFamilyManifestSchema>;
export type ResearchResourceFamilyManifest = z.infer<typeof researchResourceFamilyManifestSchema>;
export type ResourceFamilyProfile = z.infer<typeof resourceFamilyProfileSchema>;
export type ResourceFamily = z.infer<typeof resourceFamilySchema>;

export const CURATED_FAMILY_PROFILES: ResourceFamilyProfile[] = [
  { familyId: "low-poly-nature-3d", label: "低多边形自然环境", dimensions: ["limited-3d"], roles: ["background", "obstacle", "model"], mediaTypes: ["model"], formats: ["model/gltf-binary"], styleTags: ["low-poly", "nature", "warm", "modular"], gameplayTags: ["exploration", "puzzle", "runner", "environment"], stateTags: ["NORMAL"], lifecycle: "reviewed", previewPaths: ["preview/contact-sheet.png", "preview/turntable.webp"] },
  { familyId: "classic-puzzle-2d", label: "经典彩色益智部件", dimensions: ["2d"], roles: ["effect", "obstacle", "collectible", "interface"], mediaTypes: ["image", "spritesheet"], formats: ["image/png"], styleTags: ["clean", "colorful", "casual", "classic"], gameplayTags: ["puzzle", "breakout", "matching", "onboarding"], stateTags: ["NORMAL", "TARGET", "ACTIVE", "SELECTED"], lifecycle: "reviewed", previewPaths: ["preview/contact-sheet.png"] },
  { familyId: "clean-blue-ui-2d", label: "清爽蓝色通用界面", dimensions: ["2d", "limited-3d"], roles: ["interface"], mediaTypes: ["image"], formats: ["image/png"], styleTags: ["clean", "blue", "casual", "neutral"], gameplayTags: ["ui", "onboarding", "accessibility"], stateTags: ["START", "PAUSE", "RETRY", "HINT", "SETTINGS", "WIN", "LOSE", "CHECKED", "UNCHECKED"], lifecycle: "reviewed", previewPaths: ["preview/contact-sheet.png"] },
  { familyId: "neutral-interface-audio", label: "中性界面反馈音", dimensions: ["2d", "limited-3d"], roles: ["audio"], mediaTypes: ["audio"], formats: ["audio/ogg"], styleTags: ["neutral", "clean", "short", "interface"], gameplayTags: ["ui", "feedback", "accessibility"], stateTags: ["ACTION", "INVALID", "REWARD", "FAILURE", "WIN", "OPEN", "CLOSE", "SELECT"], lifecycle: "reviewed", previewPaths: ["preview/waveform.png"] },
].map((profile) => resourceFamilyProfileSchema.parse(profile));

export type ResourceFamilyMatch = {
  familyId: string; score: number; eligible: boolean; autoBindable: boolean;
  breakdown: { role: number; style: number; states: number; technical: number; license: number };
  missingStates: string[]; reasons: string[]; suggestedPaths: string[];
};

const tokens = (value: string) => value.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
function suggestAssets(requirement: AssetRequirement, family: ResourceFamily) {
  const wanted = new Set([...requirement.semanticTags, ...requirement.variants].flatMap(tokens));
  const scored = family.manifest.assets.map((asset) => ({ asset, score: tokens(asset.path).filter((token) => wanted.has(token)).length }));
  return scored.sort((a, b) => b.score - a.score || a.asset.path.localeCompare(b.asset.path)).slice(0, Math.min(12, Math.max(requirement.variants.length, 1))).map(({ asset }) => asset.path);
}

export function rankResourceFamilies(requirement: AssetRequirement, families: ResourceFamily[], options: { styleTags?: string[]; openSourcePackage?: boolean } = {}): ResourceFamilyMatch[] {
  return families.map((family) => {
    const profile = family.profile;
    const reasons: string[] = [];
    const role = profile.roles.includes(requirement.role) && profile.mediaTypes.includes(requirement.mediaType) ? 30 : 0;
    if (!role) reasons.push("玩法角色或媒体类型不匹配");
    const desiredStyles = options.styleTags?.length ? options.styleTags : requirement.visual && requirement.visual.styleFamily !== "project-cohesive-default" ? tokens(requirement.visual.styleFamily) : [];
    const styleHits = desiredStyles.filter((tag) => profile.styleTags.includes(tag)).length;
    const style = desiredStyles.length === 0 ? 25 : Math.round(25 * styleHits / desiredStyles.length);
    if (style < 25) reasons.push("风格族只部分匹配");
    const missingStates = requirement.variants.filter((state) => !profile.stateTags.includes(state));
    const states = Math.round(20 * (requirement.variants.length - missingStates.length) / requirement.variants.length);
    if (missingStates.length) reasons.push(`缺少状态：${missingStates.join("、")}`);
    const formatMatch = requirement.technical.formats.some((format) => profile.formats.includes(format));
    const technical = formatMatch ? 15 : 0;
    if (!technical) reasons.push("没有满足需求的交付格式");
    const licenseDecision = family.manifest.schemaVersion === "curated-resource-family-v1" ? evaluateResourceLicense(family.manifest.source, { commercial: true, modified: true, openSourcePackage: options.openSourcePackage ?? true }) : null;
    const license = family.manifest.schemaVersion === "research-resource-family-v1" || licenseDecision?.decision === "auto-approve" ? 10 : 0;
    if (!license && licenseDecision) reasons.push(...licenseDecision.reasons, `许可处理为 ${licenseDecision.decision}`);
    const eligible = role > 0 && technical > 0 && license > 0;
    const score = eligible ? role + style + states + technical + license : 0;
    return { familyId: profile.familyId, score, eligible, autoBindable: eligible && score >= 90 && missingStates.length === 0 && profile.lifecycle === "recommended", breakdown: { role, style, states, technical, license }, missingStates, reasons, suggestedPaths: eligible ? suggestAssets(requirement, family) : [] };
  }).sort((a, b) => b.score - a.score || a.familyId.localeCompare(b.familyId));
}
