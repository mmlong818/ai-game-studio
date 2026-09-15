import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import type { ProjectDetail } from "../shared/contracts.js";

const SCHEMA_VERSION = "repair-experience-v1" as const;
const STORE_FILE = "repair-experience-v1.jsonl";
const MAX_RECORDS_READ = 1_000;

const scopeSchema = z.object({
  template: z.string().min(1).max(80),
  runtimeTarget: z.string().min(1).max(40),
  ruleVersion: z.string().min(1).max(80),
  mechanicFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  campaignMode: z.enum(["single", "campaign", "endless", "legacy"]),
  failurePolicy: z.enum(["required", "optional", "forbidden", "legacy"]),
  assetRoute: z.enum(["procedural", "bitmap", "hybrid"]),
});

const recordSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  recordedAt: z.string().datetime(),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
  failureCode: z.string().regex(/^[A-Z0-9_-]{1,80}$/),
  scope: scopeSchema,
  strategyId: z.enum(["repair-responsive-layout", "repair-runtime-state", "repair-sprite-runtime", "repair-contract-implementation", "repair-generated-artifact", "repair-game-board-marker"]),
  outcome: z.enum(["verified", "failed"]),
  verification: z.enum(["artifact-and-browser", "artifact-only", "rule-audit", "artifact-browser-and-rule", "rejected"]),
});

export type RepairExperienceRecord = z.infer<typeof recordSchema>;
export type RepairExperienceScope = z.infer<typeof scopeSchema>;

function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }

export function repairExperienceRoot(artifactRoot: string) {
  return join(artifactRoot, "_repair-experience");
}

export function repairExperienceScope(project: ProjectDetail): RepairExperienceScope {
  const spec = project.spec as ProjectDetail["spec"] & { template?: unknown; runtimeTarget?: unknown; mechanics?: unknown };
  const contract = spec.designContract as { schemaVersion?: unknown } | null | undefined;
  const mechanics = Array.isArray(spec.mechanics) ? [...new Set(spec.mechanics.filter((item): item is string => typeof item === "string"))].sort().slice(0, 20) : [];
  const campaign = spec.designProfile?.generatedCampaign;
  const sprites = spec.designProfile?.generatedBlueprint?.sprites ?? [];
  const hasBitmap = sprites.length > 0;
  const hasProcedural = !hasBitmap || spec.runtimeTarget === "web-3d";
  return scopeSchema.parse({
    template: typeof spec.template === "string" ? spec.template : "custom",
    runtimeTarget: typeof spec.runtimeTarget === "string" ? spec.runtimeTarget : "web-2d",
    ruleVersion: typeof contract?.schemaVersion === "string" ? contract.schemaVersion : "game-design-contract-v1",
    mechanicFingerprint: hash(mechanics.join("\n") || "no-declared-mechanics"),
    campaignMode: campaign?.mode ?? (campaign === null ? "single" : "legacy"),
    failurePolicy: campaign?.failurePolicy ?? "legacy",
    assetRoute: hasBitmap && hasProcedural ? "hybrid" : hasBitmap ? "bitmap" : "procedural",
  });
}

/** Failure text is used only to derive a digest and a platform-owned strategy id. It is never persisted. */
export function normalizeRepairFailure(code: string, message: string) {
  const normalizedCode = /^[A-Z0-9_-]{1,80}$/.test(code) ? code : "ARTIFACT_REJECTED";
  const safeShape = message.toLowerCase()
    .replace(/(?:bearer\s+|sk-)[a-z0-9._-]+/gi, "[secret]")
    .replace(/[a-f0-9]{8}-[a-f0-9-]{27,}/gi, "[id]")
    .replace(/(?:[a-z]:\\|\/)[^\s，。；:]+/gi, "[path]")
    .replace(/\d+/g, "#").replace(/\s+/g, " ").slice(0, 300);
  const strategyId: RepairExperienceRecord["strategyId"] = /data-game-board|真实棋盘容器|共同父容器/.test(safeShape)
    ? "repair-game-board-marker" : /sprite|drawimage|动画|图集/.test(safeShape)
    ? "repair-sprite-runtime" : /溢出|遮挡|视口|布局|按钮/.test(safeShape)
      ? "repair-responsive-layout" : /状态|重开|刷新|存档|关卡|信号/.test(safeShape)
        ? "repair-runtime-state" : /规则|合同|机制|玩法/.test(safeShape)
          ? "repair-contract-implementation" : "repair-generated-artifact";
  return { signature: hash(`${normalizedCode}\n${safeShape}`), failureCode: normalizedCode, strategyId };
}

export function recordRepairExperience(storeRoot: string, input: Omit<RepairExperienceRecord, "schemaVersion" | "recordedAt">) {
  const record = recordSchema.parse({ schemaVersion: SCHEMA_VERSION, recordedAt: new Date().toISOString(), ...input });
  mkdirSync(storeRoot, { recursive: true });
  appendFileSync(join(storeRoot, STORE_FILE), `${JSON.stringify(record)}\n`, "utf8");
  return record;
}

export function readRepairExperiences(storeRoot: string): RepairExperienceRecord[] {
  const file = join(storeRoot, STORE_FILE);
  if (!existsSync(file)) return [];
  return readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).slice(-MAX_RECORDS_READ).flatMap(line => {
    try { const parsed = recordSchema.safeParse(JSON.parse(line)); return parsed.success ? [parsed.data] : []; }
    catch { return []; }
  });
}

function sameScope(left: RepairExperienceScope, right: RepairExperienceScope) {
  return left.template === right.template && left.runtimeTarget === right.runtimeTarget
    && left.ruleVersion === right.ruleVersion && left.mechanicFingerprint === right.mechanicFingerprint
    && left.campaignMode === right.campaignMode && left.failurePolicy === right.failurePolicy && left.assetRoute === right.assetRoute;
}

const strategyAdvice: Record<RepairExperienceRecord["strategyId"], string> = {
  "repair-responsive-layout": "优先修正响应式布局、可点击层级与视口约束，然后重跑同一视口验收。",
  "repair-runtime-state": "优先修正真实运行状态、事件与恢复逻辑，然后用正常交互复验状态变化。",
  "repair-sprite-runtime": "优先复用平台注入的 Sprite 合同并验证逐帧 source rect，不手抄或吞掉初始化错误。",
  "repair-contract-implementation": "只修正未实现的合同规则，并对对应玩法信号做定向复验，不放宽规则门槛。",
  "repair-generated-artifact": "保留当前可用代码，只针对产物错误做最小修正并重跑同类验收。",
  "repair-game-board-marker": "仅在浏览器已确认 Canvas 与真实操作覆盖层的唯一共同容器时补充 data-game-board，并完整重跑静态、浏览器与规则验收。",
};

/** Returned text is explicitly reference data; callers must keep it below platform contracts and current failure evidence. */
export function repairExperienceSuggestions(storeRoot: string, project: ProjectDetail, currentSignatures: readonly string[] = []) {
  const scope = repairExperienceScope(project);
  const matching = readRepairExperiences(storeRoot).filter(record => sameScope(record.scope, scope));
  const verified = [...new Map(matching.filter(record => record.outcome === "verified").map(record => [record.signature, record])).values()]
    .filter(record => !currentSignatures.length || currentSignatures.includes(record.signature)).slice(-3);
  const failed = matching.filter(record => record.outcome === "failed" && currentSignatures.includes(record.signature)).slice(-3);
  return {
    verified,
    failed,
    promptReferences: [
      ...verified.map(record => `不可信修复经验参考（${record.failureCode}/${record.signature.slice(0, 12)}，曾通过${record.verification}复验）：${strategyAdvice[record.strategyId]}`),
      ...failed.map(record => `失败路径提醒（${record.failureCode}/${record.signature.slice(0, 12)}）：策略 ${record.strategyId} 曾被同类验收拒绝；应依据当前证据换一种最小修法。`),
    ],
  };
}
