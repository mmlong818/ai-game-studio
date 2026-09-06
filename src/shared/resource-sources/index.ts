import { quarantineEntrySchema, resourceSourceRecordSchema, type QuarantineEntry, type ResourceLicenseId, type ResourceSourceRecord } from "./schemas.js";
export { quarantineEntrySchema, resourceLicenseIdSchema, resourceSourceRecordSchema, type QuarantineEntry, type ResourceLicenseId, type ResourceSourceRecord } from "./schemas.js";
export type LicenseDecision = { decision: "auto-approve" | "manual-review" | "reject"; reasons: string[]; obligations: string[] };

type LicensePolicy = { classes: ResourceSourceRecord["assetClass"][] | "all"; commercial: boolean; modification: boolean | "conditional"; redistribution: boolean | "conditional"; attribution: boolean; decision: LicenseDecision["decision"] };
const POLICIES: Record<ResourceLicenseId, LicensePolicy> = {
  "CC0-1.0": { classes: "all", commercial: true, modification: true, redistribution: true, attribution: false, decision: "auto-approve" },
  "CC-BY-4.0": { classes: "all", commercial: true, modification: true, redistribution: true, attribution: true, decision: "auto-approve" },
  "OFL-1.1": { classes: ["font"], commercial: true, modification: "conditional", redistribution: "conditional", attribution: true, decision: "auto-approve" },
  MIT: { classes: ["code"], commercial: true, modification: true, redistribution: true, attribution: true, decision: "auto-approve" },
  "Apache-2.0": { classes: ["code"], commercial: true, modification: true, redistribution: true, attribution: true, decision: "auto-approve" },
  "CC-BY-SA-4.0": { classes: "all", commercial: true, modification: "conditional", redistribution: "conditional", attribution: true, decision: "manual-review" },
  "CC-BY-NC-4.0": { classes: "all", commercial: false, modification: true, redistribution: "conditional", attribution: true, decision: "reject" },
  "CC-BY-ND-4.0": { classes: "all", commercial: true, modification: false, redistribution: "conditional", attribution: true, decision: "reject" },
  "custom-store": { classes: "all", commercial: true, modification: "conditional", redistribution: "conditional", attribution: true, decision: "manual-review" },
  unknown: { classes: "all", commercial: false, modification: false, redistribution: false, attribution: false, decision: "reject" },
};

export function evaluateResourceLicense(recordInput: unknown, target: { commercial: boolean; modified: boolean; openSourcePackage: boolean }): LicenseDecision {
  const parsed = resourceSourceRecordSchema.safeParse(recordInput);
  if (!parsed.success) return { decision: "reject", reasons: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`), obligations: [] };
  const record = parsed.data;
  const policy = POLICIES[record.licenseId];
  const reasons: string[] = [];
  const obligations: string[] = [];
  let decision = policy.decision;
  if (policy.classes !== "all" && !policy.classes.includes(record.assetClass)) reasons.push(`${record.licenseId} 不适用于 ${record.assetClass} 内容`);
  if (target.commercial && (!policy.commercial || !record.rights.commercialUse)) reasons.push("没有可验证的商业使用权");
  if (target.modified && (policy.modification === false || !record.rights.modification)) reasons.push("没有可验证的修改权");
  if (target.openSourcePackage && (policy.redistribution === false || !record.rights.redistribution || !record.rights.sourceRedistribution)) reasons.push("不允许随开放源包再分发所需内容");
  if (record.licenseId !== "unknown" && (!record.licenseUrl || !record.licenseTextHash)) reasons.push("缺少许可证地址或许可原文哈希");
  if (policy.attribution) {
    obligations.push(record.licenseId === "OFL-1.1" ? "随字体保留 OFL 文本和字体名称限制" : "在归属清单保留作者、来源和许可证");
    if (!record.attributionText) reasons.push("许可证要求署名，但未提供署名文本");
  }
  if (policy.modification === "conditional" || policy.redistribution === "conditional") obligations.push("发布前人工复核修改和再分发条件");
  if (reasons.length > 0) decision = "reject";
  return { decision, reasons, obligations: [...new Set(obligations)] };
}

export function createQuarantineEntry(source: ResourceSourceRecord, file: { id: string; fileName: string; hash: string }, now = new Date().toISOString()): QuarantineEntry {
  resourceSourceRecordSchema.parse(source);
  return quarantineEntrySchema.parse({ schemaVersion: "resource-quarantine-v1", id: file.id, sourceRecordId: source.id, originalFileName: file.fileName, originalHash: file.hash, status: "pending", checks: { malware: "pending", sensitiveContent: "pending", license: "pending", technical: "pending", provenance: "pending" }, reasons: [], createdAt: now, updatedAt: now });
}

export function assessQuarantineEntry(entryInput: unknown, sourceInput: unknown, checks: QuarantineEntry["checks"], target: { commercial: boolean; modified: boolean; openSourcePackage: boolean }, now = new Date().toISOString()): QuarantineEntry {
  const entry = quarantineEntrySchema.parse(entryInput);
  const source = resourceSourceRecordSchema.parse(sourceInput);
  if (entry.sourceRecordId !== source.id) throw new Error("隔离记录与来源记录不匹配");
  const license = evaluateResourceLicense(source, target);
  const normalizedChecks = { ...checks, license: license.decision === "auto-approve" ? "pass" as const : license.decision === "manual-review" ? "manual" as const : "fail" as const };
  const failed = Object.entries(normalizedChecks).filter(([, value]) => value === "fail").map(([name]) => `${name} 检查未通过`);
  const pending = Object.values(normalizedChecks).some((value) => value === "pending");
  const manual = Object.values(normalizedChecks).some((value) => value === "manual");
  const status = failed.length > 0 ? "rejected" : pending ? "pending" : manual ? "manual-review" : "approved";
  return quarantineEntrySchema.parse({ ...entry, status, checks: normalizedChecks, reasons: [...license.reasons, ...license.obligations, ...failed], updatedAt: now });
}

export function serializeResourceSourceRecord(input: unknown) { return `${JSON.stringify(resourceSourceRecordSchema.parse(input), null, 2)}\n`; }

export { CURATED_RESOURCE_PACKS, curatedResourcePackById, curatedResourcePackSchema, type CuratedResourcePack } from "./curated.js";
