import { buildGameSpec } from "./gameSpec";
import { stableId } from "./hash";
import { createAcceptanceAssertions } from "./quality";
import { canPublish } from "./quality";
import { createScene } from "./scene";
import { analyzeChangeImpact, invalidateImpactedEvidence } from "./impactAnalysis";
import type { StudioProject } from "./platformTypes";
import type { StudioDraft } from "./types";

export function createProject(draft: StudioDraft): StudioProject {
  const spec = buildGameSpec(draft);
  return {
    id: spec.projectId,
    name: spec.intent.title,
    spec,
    referenceDossier: draft.referenceDossier,
    assets: [],
    assetBindings: [],
    scene: createScene(spec),
    assertions: createAcceptanceAssertions(spec.projectId, spec.rules.map((rule) => rule.id)),
    evidence: [],
    builds: [],
    changeSets: [],
    qualityEvents: [],
    activeBuildId: null,
    publishedBuildId: null,
  };
}

export function createChangeSet(
  project: StudioProject,
  goal: string,
  affectedNodeIds: string[],
  affectedAssetIds: string[] = [],
): StudioProject {
  const affectedRuleIds = project.scene
    .filter((node) => affectedNodeIds.includes(node.id))
    .flatMap((node) => node.ruleIds);
  const id = stableId(
    "CHANGE",
    `${project.id}:${goal}:${affectedNodeIds.join(",")}:${project.changeSets.length + 1}`,
  );
  const impact = analyzeChangeImpact(project, affectedRuleIds, affectedNodeIds, affectedAssetIds);
  const invalidated = invalidateImpactedEvidence(project.assertions, project.evidence, impact);
  const beforeScreenshotEvidenceIds = project.evidence
    .filter((item) => item.kind === "screenshot" && item.buildId === project.activeBuildId)
    .map((item) => item.id);
  return {
    ...project,
    assertions: invalidated.assertions,
    evidence: invalidated.evidence,
    changeSets: [
      ...project.changeSets,
      {
        id,
        goal,
        createdAt: new Date().toISOString(),
        status: "draft",
        affectedRuleIds: Array.from(new Set(affectedRuleIds)),
        affectedNodeIds,
        affectedAssetIds,
        targetViewports: project.spec.qualityTargets.requiredViewports,
        previousBuildId: project.activeBuildId,
        nextBuildId: null,
        rollbackBuildId: project.activeBuildId,
        failureReasons: [],
        beforeScreenshotEvidenceIds,
        afterScreenshotEvidenceIds: [],
        beforeSnapshot: {
          assets: project.assets,
          assetBindings: project.assetBindings,
          scene: project.scene,
          assertions: project.assertions,
          evidence: project.evidence,
        },
      },
    ],
  };
}

export function attachChangeScreenshotEvidence(project: StudioProject, changeSetId: string, buildId: string): StudioProject {
  const screenshotIds = project.evidence
    .filter((item) => item.kind === "screenshot" && item.buildId === buildId)
    .map((item) => item.id);
  return {
    ...project,
    changeSets: project.changeSets.map((change) => change.id === changeSetId
      ? { ...change, afterScreenshotEvidenceIds: screenshotIds }
      : change),
  };
}

export function attachBuildResult(
  project: StudioProject,
  changeSetId: string | null,
  result: Awaited<ReturnType<typeof import("./quality").createBuild>>,
): StudioProject {
  const changePassed =
    result.build.status === "healthy" &&
    result.assertions.every((item) => item.status === "passed" || item.status === "manual-review");
  const replacedEvidenceAssertionIds = new Set(result.evidence.map((item) => item.assertionId));
  return {
    ...project,
    builds: [...project.builds, result.build],
    assertions: result.assertions,
    evidence: [
      ...project.evidence.filter((item) => !replacedEvidenceAssertionIds.has(item.assertionId)),
      ...result.evidence,
    ],
    activeBuildId: result.build.status === "healthy" ? result.build.id : project.activeBuildId,
    changeSets: project.changeSets.map((change) =>
      change.id === changeSetId
        ? {
            ...change,
            status: changePassed ? "manual-review" : "failed",
            nextBuildId: result.build.id,
            failureReasons: result.build.errors,
          }
        : change,
    ),
  };
}

export function confirmManualReview(project: StudioProject, changeSetId: string): StudioProject {
  const change = project.changeSets.find((item) => item.id === changeSetId);
  if (!change || change.status !== "manual-review") {
    throw new Error("当前变更还没有进入人工复核阶段。");
  }
  return {
    ...project,
    assertions: project.assertions.map((assertion) =>
      assertion.kind === "manual"
        ? { ...assertion, status: "passed", message: "真人试玩确认核心体验" }
        : assertion,
    ),
    changeSets: project.changeSets.map((item) =>
      item.id === changeSetId ? { ...item, status: "completed" } : item,
    ),
  };
}

export function rollbackChange(project: StudioProject, changeSetId: string): StudioProject {
  const change = project.changeSets.find((item) => item.id === changeSetId);
  if (!change) throw new Error("找不到要回滚的变更。");
  return {
    ...project,
    assets: change.beforeSnapshot.assets,
    assetBindings: change.beforeSnapshot.assetBindings,
    scene: change.beforeSnapshot.scene,
    assertions: change.beforeSnapshot.assertions,
    evidence: change.beforeSnapshot.evidence,
    activeBuildId: change.rollbackBuildId,
    changeSets: project.changeSets.map((item) =>
      item.id === changeSetId ? { ...item, status: "rolled-back" } : item,
    ),
  };
}

export function finalizeChangeAndPublish(
  project: StudioProject,
  changeSetId: string,
  buildId: string,
): StudioProject {
  const decision = canPublish(project, buildId);
  if (!decision.allowed) throw new Error(`发布门禁未通过：${decision.reasons.join("；")}`);
  const change = project.changeSets.find((item) => item.id === changeSetId);
  if (!change || change.nextBuildId !== buildId) throw new Error("变更集与构建不匹配。");
  return {
    ...project,
    activeBuildId: buildId,
    publishedBuildId: buildId,
    changeSets: project.changeSets.map((item) =>
      item.id === changeSetId ? { ...item, status: "completed" } : item,
    ),
  };
}
