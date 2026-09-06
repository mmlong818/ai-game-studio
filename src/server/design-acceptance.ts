import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { QualityCheck } from "../shared/contracts.js";
import type { GameDesignContractV1 } from "../shared/game-design-contract/index.js";

const evidenceIds = {
  onboarding: (id: string) => id.startsWith("ONBOARDING-") || id === "GEN-BROWSER-ONBOARDING",
  progression: (id: string) => id === "PROGRESSION-RUNTIME",
  assistance: (id: string) => id === "ASSISTANCE-RUNTIME",
  "content-variation": (id: string) => id === "CONTENT-VARIATION-REHEARSAL",
  solvability: (id: string) => id === "SOLVABILITY-RUNTIME",
  rule: (id: string) => id === "GEN-BROWSER-CONTRACT" || id === "BROWSER-INTERACTION",
  viewport: (id: string) => id === "BROWSER-VIEWPORTS" || id === "GEN-BROWSER-LAYOUT",
  asset: (id: string) => id === "BROWSER-ASSETS",
  accessibility: (id: string) => id === "BROWSER-VIEWPORTS" || id === "BROWSER-INTERACTION",
  // Input correctness alone cannot demonstrate readable feedback or enjoyable feel.
  "game-feel": (id: string) => id === "GAME-FEEL-REVIEW",
} satisfies Record<GameDesignContractV1["acceptance"][number]["kind"], (id: string) => boolean>;

export type DesignAcceptanceReport = {
  schemaVersion: "design-acceptance-report-v1";
  contractId: string;
  checkedAt: string;
  passed: boolean;
  criteria: Array<{
    id: string;
    label: string;
    kind: GameDesignContractV1["acceptance"][number]["kind"];
    passed: boolean;
    evidenceCheckIds: string[];
  }>;
};

export function writeDesignAcceptanceReport(root: string, contract: GameDesignContractV1, checks: QualityCheck[]): QualityCheck {
  const criteria = contract.acceptance.map((criterion) => {
    const evidence = checks.filter((check) => evidenceIds[criterion.kind](check.id));
    return {
      id: criterion.id,
      label: criterion.label,
      kind: criterion.kind,
      passed: evidence.length > 0 && evidence.every(({ status }) => status === "passed"),
      evidenceCheckIds: evidence.map(({ id }) => id),
    };
  });
  const report: DesignAcceptanceReport = {
    schemaVersion: "design-acceptance-report-v1",
    contractId: contract.id,
    checkedAt: new Date().toISOString(),
    passed: criteria.every(({ passed }) => passed),
    criteria,
  };
  mkdirSync(join(root, "_studio"), { recursive: true });
  writeFileSync(join(root, "_studio", "DESIGN_ACCEPTANCE_REPORT.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!report.passed) {
    const missing = criteria.filter(({ passed }) => !passed).map(({ label, kind }) => `${label}（${kind}）`).join("、");
    throw new Error(`设计合同运行时验收未闭环：${missing}。`);
  }
  return {
    id: "DESIGN-ACCEPTANCE",
    label: "设计合同全部承诺均有真实运行时证据",
    status: "passed",
    evidence: `${criteria.length}/${criteria.length} 条合同验收通过；逐项绑定真实运行时质量证据。`,
  };
}
