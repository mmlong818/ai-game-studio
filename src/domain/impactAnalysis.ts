import type { AcceptanceAssertion, QualityEvidence, StudioProject } from "./platformTypes";

export interface ChangeImpact {
  assertionIds: string[];
  reasons: Record<string, string>;
}

export function analyzeChangeImpact(
  project: StudioProject,
  affectedRuleIds: string[],
  affectedNodeIds: string[],
  affectedAssetIds: string[],
): ChangeImpact {
  const nodeRules = project.scene
    .filter((node) => affectedNodeIds.includes(node.id))
    .flatMap((node) => node.ruleIds);
  const rules = new Set([...affectedRuleIds, ...nodeRules]);
  const assetChanged = affectedAssetIds.length > 0;
  const sceneChanged = affectedNodeIds.length > 0;
  const reasons: Record<string, string> = {};
  for (const assertion of project.assertions) {
    let reason = "";
    if (assertion.kind === "rule" && assertion.sourceRuleIds.some((id) => rules.has(id))) reason = "关联玩法规则发生变化";
    else if (assertion.kind === "asset" && assetChanged) reason = "资源清单发生变化";
    else if (assertion.kind === "viewport" && (assetChanged || sceneChanged)) reason = "场景或资源可能影响多设备布局";
    else if (assertion.kind === "performance" && (assetChanged || sceneChanged)) reason = "场景或资源可能影响运行性能";
    else if (assertion.kind === "accessibility" && sceneChanged) reason = "场景结构可能影响可访问操作";
    else if (assertion.kind === "game-feel" && (assetChanged || sceneChanged || rules.size > 0)) reason = "空间、反馈或核心爽点可能发生变化";
    else if (assertion.kind === "manual" && (assetChanged || sceneChanged || rules.size > 0)) reason = "可感知体验发生变化";
    if (reason) reasons[assertion.id] = reason;
  }
  return { assertionIds: Object.keys(reasons), reasons };
}

export function invalidateImpactedEvidence(
  assertions: AcceptanceAssertion[],
  evidence: QualityEvidence[],
  impact: ChangeImpact,
): { assertions: AcceptanceAssertion[]; evidence: QualityEvidence[] } {
  const impacted = new Set(impact.assertionIds);
  return {
    assertions: assertions.map((assertion) => impacted.has(assertion.id)
      ? { ...assertion, status: "stale", message: impact.reasons[assertion.id], evidenceIds: [] }
      : assertion),
    evidence: evidence.filter((item) => !impacted.has(item.assertionId)),
  };
}
