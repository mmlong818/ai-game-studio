import { activeAssetPaths, validateAssetManifest } from "./assets";
import { sha256, stableId } from "./hash";
import { validateGameSpec } from "./gameSpec";
import { validateScene } from "./scene";
import { validateGameFeel } from "./gameFeel";
import type {
  AcceptanceAssertion,
  BuildManifest,
  QualityEvidence,
  StudioProject,
} from "./platformTypes";

export const CHECKER_VERSION = "studio-quality-1";

export function createAcceptanceAssertions(projectId: string, ruleIds: string[]): AcceptanceAssertion[] {
  const ruleAssertions = ruleIds.map((ruleId) => ({
    id: stableId("AC", `${projectId}:${ruleId}`),
    sourceRuleIds: [ruleId],
    label: `验证规则 ${ruleId}`,
    priority: "P0" as const,
    kind: "rule" as const,
    status: "pending" as const,
    message: "等待真实玩法动作验证",
    evidenceIds: [],
  }));
  return [
    ...ruleAssertions,
    {
      id: stableId("AC", `${projectId}:assets`),
      sourceRuleIds: [],
      label: "AI 位图来源和本地资源完整",
      priority: "P0",
      kind: "asset",
      status: "pending",
      message: "等待资源绑定",
      evidenceIds: [],
    },
    {
      id: stableId("AC", `${projectId}:viewports`),
      sourceRuleIds: [],
      label: "桌面与手机视口可完成核心操作",
      priority: "P1",
      kind: "viewport",
      status: "pending",
      message: "等待多视口预览",
      evidenceIds: [],
    },
    {
      id: stableId("AC", `${projectId}:manual`),
      sourceRuleIds: [],
      label: "核心爽点人工复核",
      priority: "P1",
      kind: "manual",
      status: "manual-review",
      message: "自动检查不能代替真人体验",
      evidenceIds: [],
    },
    {
      id: stableId("AC", `${projectId}:performance`),
      sourceRuleIds: [],
      label: "参考设备达到帧率和长任务预算",
      priority: "P1",
      kind: "performance",
      status: "pending",
      message: "等待真实浏览器性能采样",
      evidenceIds: [],
    },
    {
      id: stableId("AC", `${projectId}:game-feel`),
      sourceRuleIds: ruleIds,
      label: "核心爽点与操作空间保持成立",
      priority: "P0",
      kind: "game-feel",
      status: "pending",
      message: "等待空间、反馈和速度层次检查",
      evidenceIds: [],
    },
    {
      id: stableId("AC", `${projectId}:accessibility`),
      sourceRuleIds: [],
      label: "键盘、减少动态、静音和失焦暂停可用",
      priority: "P1",
      kind: "accessibility",
      status: "pending",
      message: "等待真实浏览器可访问性检查",
      evidenceIds: [],
    },
  ];
}

export async function createBuild(
  project: StudioProject,
  codeSnapshot: string,
  changeSetId: string | null = null,
): Promise<{ build: BuildManifest; assertions: AcceptanceAssertion[]; evidence: QualityEvidence[] }> {
  const specErrors = validateGameSpec(project.spec);
  const assetErrors = validateAssetManifest(project.assets, project.assetBindings, project.scene);
  const sceneErrors = validateScene(project.scene);
  const gameFeelErrors = validateGameFeel(project.spec, project.scene);
  const errors = [...specErrors, ...assetErrors, ...sceneErrors, ...gameFeelErrors];
  const [specHash, codeHash, assetManifestHash] = await Promise.all([
    sha256(project.spec),
    sha256(codeSnapshot),
    sha256(project.assets.filter((asset) => asset.status === "active")),
  ]);
  const buildId = stableId(
    "BUILD",
    `${project.id}:${specHash}:${codeHash}:${assetManifestHash}:${changeSetId ?? "base"}`,
  );
  const createdAt = new Date().toISOString();
  const build: BuildManifest = {
    id: buildId,
    projectId: project.id,
    changeSetId,
    createdAt,
    status: errors.length === 0 ? "healthy" : "failed",
    specHash,
    codeHash,
    assetManifestHash,
    checkerVersion: CHECKER_VERSION,
    entryFile: "index.html",
    assetPaths: activeAssetPaths(project.assets),
    viewports: project.spec.qualityTargets.requiredViewports,
    errors,
  };

  const evidence: QualityEvidence[] = [];
  const assertions = project.assertions.map((assertion) => {
    if (changeSetId && assertion.status === "passed") return assertion;
    if (assertion.kind === "manual") return assertion;
    if (assertion.kind === "rule") {
      return {
        ...assertion,
        status: "pending" as const,
        message: "静态构建通过，等待 GameProbe 执行真实玩法动作",
        evidenceIds: [],
      };
    }
    if (["viewport", "performance", "accessibility"].includes(assertion.kind) && errors.length === 0) {
      return { ...assertion, status: "pending" as const, message: "静态构建通过，等待真实浏览器检查", evidenceIds: [] };
    }
    const failed =
      assertion.kind === "asset"
        ? assetErrors.length > 0
        : assertion.kind === "game-feel"
          ? gameFeelErrors.length > 0
        : specErrors.length > 0 || sceneErrors.length > 0;
    const evidenceId = stableId("EVIDENCE", `${buildId}:${assertion.id}`);
    evidence.push({
      id: evidenceId,
      assertionId: assertion.id,
      buildId,
      kind: assertion.kind === "viewport" ? "screenshot" : "event-log",
      capturedAt: createdAt,
      value: failed ? (assertion.kind === "game-feel" ? gameFeelErrors : errors).join("；") : "检查通过",
      specHash,
      codeHash,
      assetManifestHash,
    });
    return {
      ...assertion,
      status: failed ? ("failed" as const) : ("passed" as const),
      message: failed ? errors.join("；") : "当前构建检查通过",
      evidenceIds: [evidenceId],
    };
  });
  return { build, assertions, evidence };
}

export function evidenceMatchesBuild(evidence: QualityEvidence, build: BuildManifest): boolean {
  return (
    evidence.buildId === build.id &&
    evidence.specHash === build.specHash &&
    evidence.codeHash === build.codeHash &&
    evidence.assetManifestHash === build.assetManifestHash
  );
}

export function canPublish(project: StudioProject, buildId: string): { allowed: boolean; reasons: string[] } {
  const build = project.builds.find((item) => item.id === buildId);
  if (!build || build.status !== "healthy") return { allowed: false, reasons: ["构建不存在或不健康"] };
  const blockers = project.assertions.filter(
    (item) => (item.priority === "P0" || item.priority === "P1") && item.status !== "passed",
  );
  return {
    allowed: blockers.length === 0,
    reasons: blockers.map((item) => `${item.label}：${item.message}`),
  };
}
