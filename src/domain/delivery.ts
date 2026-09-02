import { strToU8, zipSync } from "fflate";
import { canonicalJson } from "./hash";
import { generateRuntimeFiles } from "./runtimeGenerator";
import type { BuildManifest, StudioProject } from "./platformTypes";

const FORBIDDEN_TEXT = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /Bearer\s+[A-Za-z0-9._-]+/i,
  /[A-Za-z]:\\Users\\/,
  /https?:\/\/[^\s"']+\.(?:png|jpe?g|webp)/i,
];

export interface OpenSourceBundle {
  filename: string;
  bytes: Uint8Array;
  files: string[];
}

export function validateDeliveryText(files: Record<string, string>): string[] {
  const errors: string[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (path.toLowerCase().endsWith(".svg")) errors.push(`${path} 使用了禁止的 SVG`);
    if (FORBIDDEN_TEXT.some((pattern) => pattern.test(content))) {
      errors.push(`${path} 含有密钥、本机路径或远程图片地址`);
    }
  }
  return errors;
}

export function buildOpenSourceBundle(
  project: StudioProject,
  build: BuildManifest,
  assetBytes: Record<string, Uint8Array>,
): OpenSourceBundle {
  if (build.status !== "healthy") throw new Error("只有健康构建可以导出。");
  if (build.id !== project.activeBuildId) throw new Error("只能导出当前活动构建。");
  const missingAssets = build.assetPaths.filter((path) => !assetBytes[path]);
  if (missingAssets.length > 0) throw new Error(`交付包缺少资源：${missingAssets.join("、")}`);

  const assetPathsByRole = Object.fromEntries(
    project.assets
      .filter((asset) => asset.status === "active")
      .map((asset) => [asset.role, asset.localPath]),
  );
  const runtime = generateRuntimeFiles(project.spec, assetPathsByRole);
  const textFiles: Record<string, string> = {
    ...runtime,
    "game-manifest.json": JSON.stringify(
      {
        buildId: build.id,
        entryFile: build.entryFile,
        specHash: build.specHash,
        codeHash: build.codeHash,
        assetManifestHash: build.assetManifestHash,
        assets: build.assetPaths,
      },
      null,
      2,
    ),
    "_studio/GAME_SPEC.json": JSON.stringify(project.spec, null, 2),
    "_studio/RULES.json": JSON.stringify(project.spec.rules, null, 2),
    "_studio/REFERENCE_DOSSIER.json": JSON.stringify(project.referenceDossier, null, 2),
    "_studio/ACCEPTANCE_PLAN.json": JSON.stringify(project.assertions, null, 2),
    "_studio/QUALITY_REPORT.json": JSON.stringify(
      { build, assertions: project.assertions, evidence: project.evidence },
      null,
      2,
    ),
    "_studio/ASSET_PROVENANCE.json": JSON.stringify(project.assets, null, 2),
    "_studio/ART_REVIEW.md": "# 美术复核\n\n核心美术使用可追溯 AI 位图；正式发布前需要人工确认风格、锚点、碰撞与封面一致性。\n",
  };
  const deliveryErrors = validateDeliveryText(textFiles);
  if (deliveryErrors.length > 0) throw new Error(deliveryErrors.join("；"));
  const zipEntries: Record<string, Uint8Array> = Object.fromEntries([
    ...Object.entries(textFiles).map(([path, content]) => [path, strToU8(content)]),
    ...Object.entries(assetBytes),
  ]);
  const bytes = zipSync(zipEntries, { level: 6 });
  return {
    filename: `${project.id}-${build.id}.zip`,
    bytes,
    files: Object.keys(zipEntries).sort(),
  };
}

export function deliveryFingerprint(project: StudioProject, build: BuildManifest): string {
  return canonicalJson({
    projectId: project.id,
    buildId: build.id,
    specHash: build.specHash,
    codeHash: build.codeHash,
    assetManifestHash: build.assetManifestHash,
  });
}
