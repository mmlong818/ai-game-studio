import { describe, expect, it } from "vitest";
import { createResearchResourceAcquisitionTask, reviewResearchResourceAcquisitionWork, submitResearchResourceAcquisitionWork } from "./research-resource-acquisition-task";

const decision = (requirementId: string, route: "reuse-existing" | "procedural-generate" | "procure" | "create") => ({
  requirementId, role: route === "procure" ? "audio" as const : "effect" as const, requiredFor: "publish" as const, route,
  status: route === "reuse-existing" ? "review-required" as const : route === "procedural-generate" ? "ready" as const : "planned" as const,
  selectedFamilyId: route === "reuse-existing" ? "classic-puzzle-2d" : null,
  suggestedPaths: route === "reuse-existing" ? ["piece.png"] : [], missingVariants: route === "create" ? ["ACTIVE"] : [],
  license: route === "reuse-existing" ? { status: "verified" as const, licenseId: "CC0-1.0", sourceUrl: "https://example.com/pack", obligations: [] } : route === "procure" ? { status: "pending" as const, licenseId: null, sourceUrl: null, obligations: [] } : { status: "not-required" as const, licenseId: "project-owned", sourceUrl: null, obligations: [] },
  operatorAction: route === "reuse-existing" ? "approve-binding" as const : route === "procure" ? "review-purchase-terms" as const : route === "create" ? "review-created-asset" as const : "none" as const,
  deliverable: `交付 ${requirementId}`, reason: "测试取得路线。",
});

describe("研究资源一键执行任务", () => {
  const plan = {
    schemaVersion: "research-resource-acquisition-v1" as const, catalogVersion: "curated-v1" as const, generatedAt: "2026-09-05T00:00:00.000Z",
    decisions: [decision("ASSET-REUSE", "reuse-existing"), decision("ASSET-PROCEDURAL", "procedural-generate"), decision("ASSET-PROCURE", "procure"), decision("ASSET-CREATE", "create")],
    summary: { total: 4, reuseExisting: 1, proceduralGenerate: 1, procure: 1, create: 1, licenseReview: 1, unresolved: 0, planningReady: true },
  };
  const evidenceFor = (route: "reuse-existing" | "procedural-generate" | "procure" | "create") => {
    const kinds = route === "procedural-generate" ? ["generator-config", "resource-file", "visual-review", "runtime-report"] as const : route === "procure" ? ["resource-file", "license-record", "visual-review", "runtime-report"] as const : ["resource-file", "visual-review", "runtime-report"] as const;
    return kinds.map((kind) => ({ kind, reference: `_studio/${route}/${kind}.json`, note: `${kind} 已完成并归档` }));
  };

  it("把四条取得路线转换为不可越权的可执行工作项", () => {
    const task = createResearchResourceAcquisitionTask("RESEARCH-1", "EVAL-1", plan, new Date("2026-09-05T01:00:00Z"));
    expect(task.summary).toEqual({ total: 4, prototypeReady: 1, awaitingBindingApproval: 1, awaitingLicenseReview: 1, awaitingAssetReview: 1, submitted: 0, approved: 0, returned: 0 });
    expect(task.items.find(({ route }) => route === "procedural-generate")).toMatchObject({ state: "prototype-ready", automatedPreparation: true });
    expect(task.items.find(({ route }) => route === "reuse-existing")).toMatchObject({ state: "awaiting-binding-approval", automatedPreparation: false, license: { status: "verified" } });
    expect(task.items.find(({ route }) => route === "procure")?.checklist.join(" ")).toMatch(/许可正文/);
    expect(task.safetyBoundaries.join(" ")).toMatch(/不会自动购买/);
  });

  it("缺少必要证据或引用越界时拒绝提交", () => {
    const task = createResearchResourceAcquisitionTask("RESEARCH-1", "EVAL-1", plan);
    expect(() => submitResearchResourceAcquisitionWork(task, "ASSET-REUSE", { note: "尝试提交但证据不足", evidence: [{ kind: "resource-file", reference: "asset.png", note: "已有文件记录" }] })).toThrow(/缺少必需证据/);
    expect(() => submitResearchResourceAcquisitionWork(task, "ASSET-REUSE", { note: "尝试提交不安全引用", evidence: [{ kind: "resource-file", reference: "../asset.png", note: "已有文件记录" }, ...evidenceFor("reuse-existing").slice(1)] })).toThrow(/安全的相对路径/);
  });

  it("支持退回、修正重提和批准，并保留不可变历史", () => {
    let task = createResearchResourceAcquisitionTask("RESEARCH-1", "EVAL-1", plan);
    task = submitResearchResourceAcquisitionWork(task, "ASSET-REUSE", { note: "首轮资源成果已经准备", evidence: evidenceFor("reuse-existing") }, new Date("2026-09-05T02:00:00Z"));
    expect(task.items[0]).toMatchObject({ state: "submitted-for-review", submissions: [{ id: "SUBMISSION-1" }] });
    task = reviewResearchResourceAcquisitionWork(task, "ASSET-REUSE", { decision: "return", rationale: "视觉状态区分仍然不够明显" });
    task = submitResearchResourceAcquisitionWork(task, "ASSET-REUSE", { note: "已经修正状态区分并重新提交", evidence: evidenceFor("reuse-existing") });
    task = reviewResearchResourceAcquisitionWork(task, "ASSET-REUSE", { decision: "approve", rationale: "文件、视觉和运行时证据均已通过" });
    expect(task.items[0]).toMatchObject({ state: "approved" });
    expect(task.items[0]?.submissions).toHaveLength(2);
    expect(task.items[0]?.reviews).toHaveLength(2);
  });

  it("采购必须核验许可，全部批准后任务才完成", () => {
    let task = createResearchResourceAcquisitionTask("RESEARCH-1", "EVAL-1", plan);
    expect(() => submitResearchResourceAcquisitionWork(task, "ASSET-PROCURE", { note: "采购成果等待提交复核", evidence: evidenceFor("procure") })).toThrow(/已核验许可/);
    for (const item of task.items) {
      const verifiedLicense = item.route === "procure" ? { licenseId: "CC-BY-4.0", sourceUrl: "https://example.com/license", obligations: ["署名"] } : undefined;
      task = submitResearchResourceAcquisitionWork(task, item.requirementId, { note: "资源成果与验收证据均已归档", evidence: evidenceFor(item.route), verifiedLicense });
      task = reviewResearchResourceAcquisitionWork(task, item.requirementId, { decision: "approve", rationale: "全部必要证据已经独立检查通过" });
    }
    expect(task.status).toBe("completed");
    expect(task.summary).toMatchObject({ approved: 4, submitted: 0, returned: 0 });
    expect(task.items.find(({ route }) => route === "procure")?.license).toMatchObject({ status: "verified", licenseId: "CC-BY-4.0" });
  });
});
