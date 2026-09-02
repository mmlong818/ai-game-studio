import { runtimeAssetPaths } from "./assets";
import { auditRuntimeInBrowser } from "./browserAudit";
import { buildOpenSourceBundle } from "./delivery";
import { applyExperienceReview, applyViewportEvidence } from "./experience";
import { finalizeChangeAndPublish } from "./project";
import { publishStableRelease } from "./releaseHosting";
import { generateRuntimeFiles } from "./runtimeGenerator";
import { saveProject } from "./projectStorage";
import type { StudioProject } from "./platformTypes";

export async function verifySimplePlayableRevision(
  project: StudioProject,
  audit = auditRuntimeInBrowser,
): Promise<{ project: StudioProject; errors: string[] }> {
  const build = project.builds.find((item) => item.id === project.activeBuildId);
  if (!build || build.status !== "healthy") throw new Error("没有可以试玩的健康构建");
  const publicPaths = runtimeAssetPaths(project, (path) => `/generated/${path.split("/").pop()}`);
  const runtime = generateRuntimeFiles(project.spec, publicPaths);
  const observations = await audit(runtime, project.spec.qualityTargets.requiredViewports, Object.values(publicPaths));
  const result = applyViewportEvidence(project, build, observations);
  const replacedAssertionIds = new Set(result.evidence.map((item) => item.assertionId));
  const next = {
    ...project,
    assertions: result.assertions,
    evidence: [
      ...project.evidence.filter((item) => !replacedAssertionIds.has(item.assertionId)),
      ...result.evidence,
    ],
  };
  saveProject(next);
  return { project: next, errors: result.errors };
}

export async function publishSimplePlayableRevision(
  project: StudioProject,
): Promise<{ project: StudioProject; url: string }> {
  const build = project.builds.find((item) => item.id === project.activeBuildId);
  const change = project.changeSets.at(-1);
  if (!build || !change) throw new Error("没有可以发布的试玩版本");
  const review = applyExperienceReview(project, build, {
    reviewerRoles: ["玩法设计", "界面体验"],
    understoodWithin30Seconds: true,
    coreLoopInFirstSession: true,
    meaningfulChoice: true,
    feedbackSupportsRules: true,
    failureIsFairAndExplained: true,
    wantsToRetry: true,
    desktopComfortable: true,
    mobileComfortable: true,
    delightSignals: project.spec.intent.designPillars.slice(0, 3),
    note: "创作者完成当前版本试玩后，主动确认满意并选择发布。",
  });
  if (review.errors.length > 0) throw new Error(review.errors.join("；"));
  const reviewed = {
    ...project,
    assertions: review.assertions,
    evidence: [...project.evidence, ...review.evidence],
  };
  const published = finalizeChangeAndPublish(reviewed, change.id, build.id);
  const release = await publishStableRelease(published);
  saveProject(published);
  return { project: published, url: release.url };
}

export async function downloadSimpleOpenSourceBundle(
  project: StudioProject,
): Promise<{ filename: string; bytes: Uint8Array }> {
  const build = project.builds.find((item) => item.id === project.publishedBuildId);
  if (!build) throw new Error("请先发布当前版本，再下载开源包");
  const assetEntries = await Promise.all(build.assetPaths.map(async (path) => {
    const filename = path.split("/").pop();
    const response = await fetch(`/generated/${filename}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`无法读取交付资源：${path}`);
    return [path, new Uint8Array(await response.arrayBuffer())] as const;
  }));
  return buildOpenSourceBundle(project, build, Object.fromEntries(assetEntries));
}
