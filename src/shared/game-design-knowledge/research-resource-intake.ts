import { z } from "zod";
import { assetBindingSchema } from "../resource-requirements/index.js";
import { quarantineEntrySchema } from "../resource-sources/schemas.js";

const id = z.string().trim().min(1).max(200).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const hash = z.string().regex(/^[A-F0-9]{64}$/);
const text = z.string().trim().min(1).max(500);

export const researchResourceSecurityReviewInputSchema = z.object({ reviewer: text, malware: z.enum(["pass", "fail"]), sensitiveContent: z.enum(["pass", "fail"]), rationale: text }).strict();
const researchResourceSecurityReviewSchema = researchResourceSecurityReviewInputSchema.extend({ id, reviewedAt: z.string().datetime() }).strict();

export const researchResourceVersionSchema = z.object({
  id,
  requirementId: id,
  resourceId: id,
  originalReference: z.string().min(1),
  quarantinedPath: z.string().min(1),
  originalFileName: z.string().min(1),
  bytes: z.number().int().positive(),
  sha256: hash,
  mimeType: z.enum(["image/png", "image/webp", "audio/ogg", "audio/mpeg", "model/gltf-binary", "font/woff", "font/woff2", "font/ttf", "font/otf"]),
  provenance: z.enum(["licensed", "project-owned", "ai-generated"]),
  license: z.string().min(1),
  preview: z.object({ kind: z.enum(["image", "audio", "model", "font"]), sourcePath: z.string().min(1), status: z.literal("available-for-review") }).strict(),
}).strict();

export const researchResourceIntakeItemSchema = z.object({
  requirementId: id,
  route: z.enum(["reuse-existing", "procedural-generate", "procure", "create"]),
  submissionId: id,
  reviewId: id,
  source: z.object({ familyId: z.string().min(1).nullable(), sourceUrl: z.string().url().nullable(), licenseId: z.string().min(1), obligations: z.array(z.string().min(1)) }).strict(),
  quarantine: z.array(quarantineEntrySchema).min(1),
  versions: z.array(researchResourceVersionSchema).min(1),
  binding: assetBindingSchema,
}).strict();

export const researchResourceIntakeBatchSchema = z.object({
  schemaVersion: z.literal("research-resource-intake-v1"),
  id,
  researchTaskId: id,
  acquisitionTaskId: id,
  createdAt: z.string().datetime(),
  status: z.enum(["awaiting-security-review", "approved", "rejected"]),
  items: z.array(researchResourceIntakeItemSchema).min(1),
  securityReviews: z.array(researchResourceSecurityReviewSchema).default([]),
  summary: z.object({ requirements: z.number().int().positive(), files: z.number().int().positive(), bytes: z.number().int().positive(), awaitingSecurityReview: z.number().int().nonnegative(), approvedBindings: z.number().int().nonnegative() }).strict(),
}).strict();

export type ResearchResourceIntakeBatch = z.infer<typeof researchResourceIntakeBatchSchema>;
export type ResearchResourceSecurityReviewInput = z.infer<typeof researchResourceSecurityReviewInputSchema>;

export function reviewResearchResourceIntakeBatch(rawBatch: unknown, rawInput: unknown, now = new Date()): ResearchResourceIntakeBatch {
  const batch = researchResourceIntakeBatchSchema.parse(rawBatch); const input = researchResourceSecurityReviewInputSchema.parse(rawInput);
  if (batch.status !== "awaiting-security-review") throw new Error("只有等待安全复核的资源批次可以提交检查结果");
  const approved = input.malware === "pass" && input.sensitiveContent === "pass";
  const items = batch.items.map((item) => ({ ...item,
    quarantine: item.quarantine.map((entry) => ({ ...entry, status: approved ? "approved" as const : "rejected" as const, checks: { ...entry.checks, malware: input.malware, sensitiveContent: input.sensitiveContent }, reasons: [...entry.reasons, input.rationale], updatedAt: now.toISOString() })),
    binding: { ...item.binding, status: approved ? "approved" as const : "reviewed" as const, reviewNote: input.rationale },
  }));
  const review = researchResourceSecurityReviewSchema.parse({ ...input, id: `SECURITY-REVIEW-${batch.securityReviews.length + 1}`, reviewedAt: now.toISOString() });
  return researchResourceIntakeBatchSchema.parse({ ...batch, status: approved ? "approved" : "rejected", items, securityReviews: [...batch.securityReviews, review], summary: { ...batch.summary, awaitingSecurityReview: 0, approvedBindings: approved ? items.length : 0 } });
}
