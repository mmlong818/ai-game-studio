import { createHash } from "node:crypto";
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { contractRules, type RuleVerdict } from "./design-contract.js";
import type { GameDesignProfile } from "../shared/contracts.js";

/**
 * RULE_FIDELITY.json v2 绑定“被审核的可复原源码哈希 + 逐条规则清单”。
 * 只有同项目候选构建的源码逐字节一致、规则清单逐条一致且全部判定已实现时，
 * 后续重新验收同一份代码才复用该结果，不再向审核模型付费。
 * 这是本地审核回执，不是美术审核，也不证明代码可玩；浏览器验收仍照常执行。
 */
export const RULE_FIDELITY_SCHEMA_VERSION = 2;
const MAX_REPORT_BYTES = 2 * 1024 * 1024;

export const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");

export function safeContractRules(profile: GameDesignProfile | null | undefined): string[] | null {
  try {
    const rules = profile ? contractRules(profile) : null;
    return Array.isArray(rules) && rules.length > 0 && rules.every(rule => typeof rule === "string") ? rules : null;
  } catch {
    return null;
  }
}

export type RuleFidelityReport = {
  schemaVersion: typeof RULE_FIDELITY_SCHEMA_VERSION;
  checkedAt: string;
  implemented: number;
  total: number;
  verdicts: RuleVerdict[];
  /** sha256 of the reconstructed generated source (readGeneratedSource) that was audited; absent when not reconstructible. */
  sourceSha256?: string;
  /** Set when the verdicts were carried over from another build of the same project instead of a fresh audit. */
  reusedFromBuildId?: string;
};

export function writeRuleFidelity(root: string, report: Omit<RuleFidelityReport, "schemaVersion" | "checkedAt" | "implemented" | "total"> & { checkedAt?: string }) {
  mkdirSync(join(root, "_studio"), { recursive: true });
  const payload: RuleFidelityReport = {
    schemaVersion: RULE_FIDELITY_SCHEMA_VERSION,
    checkedAt: report.checkedAt ?? new Date().toISOString(),
    implemented: report.verdicts.filter(verdict => verdict.implemented).length,
    total: report.verdicts.length,
    verdicts: report.verdicts,
    ...(report.sourceSha256 ? { sourceSha256: report.sourceSha256 } : {}),
    ...(report.reusedFromBuildId ? { reusedFromBuildId: report.reusedFromBuildId } : {}),
  };
  writeFileSync(join(root, "_studio", "RULE_FIDELITY.json"), JSON.stringify(payload, null, 2), "utf8");
  return payload;
}

/** A passing audit of byte-identical source under an identical rule list. Anything else returns null. */
export function readReusableRuleAudit(candidateRoot: string, expected: { rules: string[]; sourceSha256: string }): RuleVerdict[] | null {
  try {
    const path = join(candidateRoot, "_studio", "RULE_FIDELITY.json");
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > MAX_REPORT_BYTES) return null;
    const saved = JSON.parse(readFileSync(path, "utf8")) as Partial<RuleFidelityReport>;
    if (saved.schemaVersion !== RULE_FIDELITY_SCHEMA_VERSION) return null;
    if (typeof saved.sourceSha256 !== "string" || saved.sourceSha256 !== expected.sourceSha256) return null;
    if (typeof saved.checkedAt !== "string" || !Number.isFinite(Date.parse(saved.checkedAt))) return null;
    if (!Array.isArray(saved.verdicts) || saved.verdicts.length !== expected.rules.length || expected.rules.length === 0) return null;
    if (saved.total !== expected.rules.length || saved.implemented !== expected.rules.length) return null;
    const verdicts: RuleVerdict[] = [];
    for (const [index, verdict] of saved.verdicts.entries()) {
      if (!verdict || typeof verdict !== "object") return null;
      if (verdict.rule !== expected.rules[index] || verdict.implemented !== true || typeof verdict.evidence !== "string") return null;
      verdicts.push({ rule: verdict.rule, implemented: true, evidence: verdict.evidence });
    }
    return verdicts;
  } catch {
    return null;
  }
}
