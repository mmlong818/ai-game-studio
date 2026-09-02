import { runtimeAssetPaths } from "./assets";
import type { StudioProject } from "./platformTypes";
import { generateRuntimeFiles } from "./runtimeGenerator";

export async function publishStableRelease(project: StudioProject): Promise<{ url: string; buildId: string }> {
  const build = project.builds.find((item) => item.id === project.publishedBuildId);
  if (!build || build.status !== "healthy") throw new Error("只有已经通过门禁的健康构建可以切换稳定网址");
  const files = generateRuntimeFiles(project.spec, runtimeAssetPaths(project));
  const assets = build.assetPaths.map((targetPath) => ({ targetPath, sourceName: targetPath.split("/").pop() ?? "" }));
  const response = await fetch("/api/releases", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: project.id, buildId: build.id, files, assets }),
  });
  const result = (await response.json()) as { url?: string; buildId?: string; error?: string };
  if (!response.ok || !result.url || result.buildId !== build.id) throw new Error(result.error || "稳定网址发布失败");
  return { url: result.url, buildId: result.buildId };
}
