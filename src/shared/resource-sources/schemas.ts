import { z } from "zod";

const id = z.string().trim().min(1).max(160).regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const text = z.string().trim().min(1).max(500);
const hash = z.string().trim().regex(/^[a-fA-F0-9]{8,128}$/);

export const resourceLicenseIdSchema = z.enum(["CC0-1.0", "CC-BY-4.0", "OFL-1.1", "MIT", "Apache-2.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "CC-BY-ND-4.0", "custom-store", "unknown"]);
export const resourceSourceRecordSchema = z.object({
  schemaVersion: z.literal("resource-source-v1"), id,
  sourceUrl: z.string().url().refine((value) => value.startsWith("https://"), "来源必须使用 HTTPS"), author: text,
  acquiredAt: z.string().datetime(), assetClass: z.enum(["image", "model", "animation", "material", "audio", "font", "code"]),
  licenseId: resourceLicenseIdSchema, licenseUrl: z.string().url().nullable(), licenseTextHash: hash.nullable(), attributionText: text.nullable(),
  rights: z.object({ commercialUse: z.boolean(), modification: z.boolean(), redistribution: z.boolean(), sourceRedistribution: z.boolean() }).strict(),
  provenanceNote: text, reviewedBy: text.nullable(), reviewedAt: z.string().datetime().nullable(),
}).strict();

export const quarantineEntrySchema = z.object({
  schemaVersion: z.literal("resource-quarantine-v1"), id, sourceRecordId: id,
  originalFileName: z.string().trim().min(1).max(240).refine((value) => !value.includes("/") && !value.includes("\\") && value !== "." && value !== "..", "必须是单一安全文件名"),
  originalHash: hash, status: z.enum(["pending", "rejected", "manual-review", "approved"]),
  checks: z.object({ malware: z.enum(["pending", "pass", "fail"]), sensitiveContent: z.enum(["pending", "pass", "fail"]), license: z.enum(["pending", "pass", "fail", "manual"]), technical: z.enum(["pending", "pass", "fail"]), provenance: z.enum(["pending", "pass", "fail"]) }).strict(),
  reasons: z.array(text), createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
}).strict();

export type ResourceLicenseId = z.infer<typeof resourceLicenseIdSchema>;
export type ResourceSourceRecord = z.infer<typeof resourceSourceRecordSchema>;
export type QuarantineEntry = z.infer<typeof quarantineEntrySchema>;
