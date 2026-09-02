import QRCode from "qrcode";
import type { StudioProject } from "./platformTypes";
import { generateRuntimeFiles } from "./runtimeGenerator";
import { runtimeAssetPaths } from "./assets";

export interface HostedPreview {
  url: string;
  expiresAt: string;
  qrDataUrl: string;
}

export async function createHostedPreview(project: StudioProject): Promise<HostedPreview> {
  const activeBuild = project.builds.find((build) => build.id === project.activeBuildId);
  if (!activeBuild || activeBuild.status !== "healthy") throw new Error("只有当前健康构建可以生成真机预览。");
  const assetPaths = runtimeAssetPaths(project);
  const files = generateRuntimeFiles(project.spec, assetPaths);
  const assets = activeBuild.assetPaths.map((targetPath) => ({
    targetPath,
    sourceName: targetPath.split("/").pop() ?? "",
  }));
  const response = await fetch("/api/previews", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files, assets }),
  });
  const result = (await response.json()) as { url?: string; expiresAt?: string; error?: string };
  if (!response.ok || !result.url || !result.expiresAt) throw new Error(result.error || "真机预览创建失败");
  return {
    url: result.url,
    expiresAt: result.expiresAt,
    qrDataUrl: await QRCode.toDataURL(result.url, { width: 240, margin: 1, errorCorrectionLevel: "M" }),
  };
}
