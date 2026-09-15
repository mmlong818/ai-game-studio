import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Build, ProjectDetail } from "../shared/contracts.js";
import { inspectLocalRepairCandidate } from "./local-repair-candidate.js";
import { readReusableRuleAudit, safeContractRules, sha256 } from "./rule-audit-checkpoint.js";
import { stripTutorialContract } from "./tutorial-contract.js";

const deliveredSourcePrefix = "/* 平台交付事实：index.html 先加载 app.js；app.js 中 forge-platform 段由平台在游戏代码前安装 safeStorage 与 __FORGE_SPRITES__，不是缺失依赖。以下是浏览器实际执行的交付文件。 */";

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function auditedSource(root: string) {
  const indexPath = join(root, "index.html");
  const stylesPath = join(root, "styles.css");
  const appPath = join(root, "app.js");
  if (![indexPath, stylesPath, appPath].every(existsSync)) return null;
  // runtime-inspector is injected by the platform after rule audit. It is not
  // generated game code and must be removed to reconstruct the audited bytes.
  const index = readFileSync(indexPath, "utf8").replace('<script src="_studio/runtime-inspector.js"></script>', "");
  return [
    deliveredSourcePrefix,
    `<!-- index.html -->\n${index}`,
    `/* styles.css */\n${readFileSync(stylesPath, "utf8")}`,
    `/* app.js */\n${readFileSync(appPath, "utf8")}`,
  ].join("\n\n");
}

/**
 * A cross-build automatic continuation is allowed only when the next build can
 * reuse code, art and rule audit without dispatching another model request.
 * Ambiguous/provider failures and newly registered repair candidates remain a
 * user decision because they may consume a fresh request budget.
 */
export type ZeroModelRecoveryCheckpoint = { sourceBuildId: string; sourceSha256: string };

export function zeroModelRecoveryCheckpoint(artifactRoot: string, project: ProjectDetail, build: Build): ZeroModelRecoveryCheckpoint | null {
  if (build.status !== "failed" || build.revisionPlan || build.revisionScope) return null;
  const details = build.failureDetails;
  if (!details?.length || !details.every(detail =>
    detail.category === "validation"
    && ["PLATFORM_SCHEMA", "BROWSER_VALIDATION", "VALIDATION"].includes(detail.code)
    && !detail.retryable)) return null;
  const root = join(artifactRoot, build.id);
  try {
    if (inspectLocalRepairCandidate(join(dirname(artifactRoot), "local-repair-candidates"), project).status !== "absent") return null;
    const dynamicArt = readJson(join(root, "_studio", "DYNAMIC_ART.json")) as { entries?: unknown[] };
    const v11 = readJson(join(root, "_studio", "V11_BUILD.json")) as { resourceCount?: number };
    if (!Array.isArray(dynamicArt.entries) || dynamicArt.entries.length !== 0 || v11.resourceCount !== 0) return null;
    const storedContract = readJson(join(root, "_studio", "GAME_DESIGN_CONTRACT.json"));
    if (JSON.stringify(stripTutorialContract(storedContract)) !== JSON.stringify(stripTutorialContract(project.spec.designContract))) return null;
    const source = auditedSource(root);
    const rules = safeContractRules(project.spec.designProfile);
    if (!source || !rules) return null;
    const sourceSha256 = sha256(source);
    return readReusableRuleAudit(root, { rules, sourceSha256 }) ? { sourceBuildId: build.id, sourceSha256 } : null;
  } catch {
    return null;
  }
}
