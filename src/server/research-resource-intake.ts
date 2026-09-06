import { createHash } from "node:crypto";
import { basename, extname, resolve, sep } from "node:path";
import { lstat, mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import { assetRequirementBundleSchema, type AssetRequirement } from "../shared/resource-requirements/index.js";
import { researchResourceAcquisitionTaskSchema } from "../shared/game-design-knowledge/research-resource-acquisition-task.js";
import { researchResourceIntakeBatchSchema, type ResearchResourceIntakeBatch } from "../shared/game-design-knowledge/research-resource-intake.js";

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const identityHash = (value: string) => createHash("sha256").update(value).digest("hex").toUpperCase();

function detectMime(bytes: Uint8Array, extension: string): ResearchResourceIntakeBatch["items"][number]["versions"][number]["mimeType"] | null {
  const ascii = (start: number, end: number) => Buffer.from(bytes.subarray(start, end)).toString("ascii");
  if (bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  if (ascii(0, 4) === "glTF") return "model/gltf-binary";
  if (ascii(0, 4) === "wOFF") return "font/woff";
  if (ascii(0, 4) === "wOF2") return "font/woff2";
  if (ascii(0, 4) === "OTTO") return "font/otf";
  if (bytes[0] === 0 && bytes[1] === 1 && bytes[2] === 0 && bytes[3] === 0) return "font/ttf";
  if (ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] ?? 0) >= 0xe0)) return "audio/mpeg";
  if (extension === ".svg" || extension === ".js" || extension === ".html") throw new Error("隔离导入拒绝可执行或矢量脚本资源");
  return null;
}

function previewKind(mimeType: string) {
  if (mimeType.startsWith("image/")) return "image" as const;
  if (mimeType.startsWith("audio/")) return "audio" as const;
  if (mimeType.startsWith("model/")) return "model" as const;
  return "font" as const;
}

function requirementAccepts(requirement: AssetRequirement, mimeType: string) {
  return requirement.technical.formats.includes(mimeType)
    || ((requirement.mediaType === "image" || requirement.mediaType === "spritesheet") && mimeType.startsWith("image/"));
}

async function writeImmutable(path: string, bytes: Uint8Array) {
  await mkdir(resolve(path, ".."), { recursive: true });
  try { await writeFile(path, bytes, { flag: "wx" }); }
  catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
    if (!Buffer.from(await readFile(path)).equals(Buffer.from(bytes))) throw new Error(`隔离区已有不同内容，拒绝覆盖：${path}`);
  }
}

export async function materializeApprovedResearchResources(rawTask: unknown, rawRequirements: unknown, sourceRoot: string, quarantineRoot: string, now = new Date()): Promise<ResearchResourceIntakeBatch> {
  const task = researchResourceAcquisitionTaskSchema.parse(rawTask);
  const requirements = assetRequirementBundleSchema.parse(rawRequirements);
  if (task.status !== "completed" || task.items.some(({ state }) => state !== "approved")) throw new Error("全部资源工作项独立批准后才能进入隔离导入");
  const requirementById = new Map(requirements.requirements.map((requirement) => [requirement.id, requirement]));
  const realSourceRoot = await realpath(sourceRoot);
  await mkdir(quarantineRoot, { recursive: true });
  const items: ResearchResourceIntakeBatch["items"] = [];
  for (const item of task.items) {
    const requirement = requirementById.get(item.requirementId);
    if (!requirement) throw new Error(`资源成果没有对应需求：${item.requirementId}`);
    const submission = item.submissions.at(-1); const review = item.reviews.at(-1);
    if (!submission || !review || review.decision !== "approve" || review.submissionId !== submission.id) throw new Error(`资源成果的最终提交没有对应批准：${item.requirementId}`);
    const references = submission.evidence.filter(({ kind }) => kind === "resource-file").map(({ reference }) => reference);
    if (!references.length) throw new Error(`资源成果没有实际文件：${item.requirementId}`);
    const inspected: Array<{ reference: string; actualPath: string; bytes: Uint8Array; mimeType: NonNullable<ReturnType<typeof detectMime>>; digest: string }> = [];
    let totalBytes = 0;
    for (const reference of references) {
      const sourcePath = resolve(realSourceRoot, reference);
      const actualPath = await realpath(sourcePath);
      if (actualPath !== realSourceRoot && !actualPath.startsWith(`${realSourceRoot}${sep}`)) throw new Error(`资源文件越出证据目录：${reference}`);
      if (!(await lstat(actualPath)).isFile()) throw new Error(`资源证据不是文件：${reference}`);
      const bytes = await readFile(actualPath); totalBytes += bytes.byteLength;
      const mimeType = detectMime(bytes, extname(actualPath).toLowerCase());
      if (!mimeType) throw new Error(`无法确认资源文件类型：${reference}`);
      if (!requirementAccepts(requirement, mimeType)) throw new Error(`资源文件类型 ${mimeType} 不满足 ${item.requirementId}`);
      inspected.push({ reference, actualPath, bytes, mimeType, digest: sha256(bytes) });
    }
    if (totalBytes > requirement.technical.maxBytes) throw new Error(`资源文件总大小超过 ${item.requirementId} 的预算：${totalBytes} > ${requirement.technical.maxBytes}`);
    const versions = []; const quarantine = [];
    const itemKey = identityHash(`${task.researchTaskId}:${item.requirementId}`).slice(0, 24);
    for (const file of inspected) {
      const resourceId = `RESOURCE:${itemKey}:${file.digest.slice(0, 12)}`;
      const relativeTarget = `${identityHash(task.researchTaskId).slice(0, 24)}/${itemKey}/${file.digest}${extname(file.actualPath).toLowerCase()}`;
      await writeImmutable(resolve(quarantineRoot, relativeTarget), file.bytes);
      const provenance = item.route === "procedural-generate" ? "ai-generated" as const : item.route === "create" ? "project-owned" as const : "licensed" as const;
      const license = item.license.licenseId ?? (provenance === "project-owned" ? "project-owned" : provenance === "ai-generated" ? "project-owned" : "unknown");
      const quarantineId = `QUARANTINE:${itemKey}:${file.digest.slice(0, 12)}`;
      quarantine.push({ schemaVersion: "resource-quarantine-v1" as const, id: quarantineId, sourceRecordId: `SOURCE:${itemKey}`, originalFileName: basename(file.actualPath), originalHash: file.digest, status: "manual-review" as const, checks: { malware: "pending" as const, sensitiveContent: "pending" as const, license: "pass" as const, technical: "pass" as const, provenance: "pass" as const }, reasons: ["文件哈希、格式、体积、来源与许可记录已检查；仍需恶意内容和敏感内容复核。"], createdAt: now.toISOString(), updatedAt: now.toISOString() });
      versions.push({ id: `VERSION:${itemKey}:${file.digest.slice(0, 12)}`, requirementId: item.requirementId, resourceId, originalReference: file.reference, quarantinedPath: relativeTarget, originalFileName: basename(file.actualPath), bytes: file.bytes.byteLength, sha256: file.digest, mimeType: file.mimeType, provenance, license, preview: { kind: previewKind(file.mimeType), sourcePath: relativeTarget, status: "available-for-review" as const } });
    }
    items.push({ requirementId: item.requirementId, route: item.route, submissionId: submission.id, reviewId: review.id, source: { familyId: item.selectedFamilyId, sourceUrl: item.license.sourceUrl, licenseId: item.license.licenseId ?? "project-owned", obligations: item.license.obligations }, quarantine, versions, binding: { requirementId: item.requirementId, resourceIds: versions.map(({ resourceId }) => resourceId), coveredVariants: requirement.variants, status: "reviewed", reviewNote: "策划成果已批准；隔离区安全检查完成后才能升级为 approved。" } });
  }
  const files = items.reduce((sum, item) => sum + item.versions.length, 0); const bytes = items.reduce((sum, item) => sum + item.versions.reduce((inner, version) => inner + version.bytes, 0), 0);
  return researchResourceIntakeBatchSchema.parse({ schemaVersion: "research-resource-intake-v1", id: `INTAKE:${identityHash(task.researchTaskId).slice(0, 24)}`, researchTaskId: task.researchTaskId, acquisitionTaskId: task.id, createdAt: now.toISOString(), status: "awaiting-security-review", items, securityReviews: [], summary: { requirements: items.length, files, bytes, awaitingSecurityReview: files, approvedBindings: 0 } });
}
