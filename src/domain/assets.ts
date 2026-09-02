import { sha256, stableId } from "./hash";
import type {
  AssetBinding,
  AssetGenerationRecord,
  AssetRole,
  SceneNode,
} from "./platformTypes";

const RASTER_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export interface GeneratedAssetInput {
  role: AssetRole;
  label: string;
  prompt: string;
  model: string;
  provider: string;
  mimeType: AssetGenerationRecord["mimeType"];
  width: number;
  height: number;
  localPath: string;
  processing?: string[];
  generatedAt?: string;
}

const isLocalAssetPath = (path: string): boolean =>
  path.startsWith("assets/") &&
  !path.includes("..") &&
  !path.includes("://") &&
  !/^[A-Za-z]:/.test(path);

export async function createGeneratedAsset(
  input: GeneratedAssetInput,
  existing: AssetGenerationRecord[] = [],
): Promise<AssetGenerationRecord> {
  if (!RASTER_MIME_TYPES.has(input.mimeType)) {
    throw new Error("游戏美术只接受 PNG、JPEG 或 WebP 位图。");
  }
  if (!isLocalAssetPath(input.localPath)) {
    throw new Error("资源必须保存到项目 assets/ 目录，不能使用远程或本机绝对路径。");
  }
  if (!input.prompt.trim()) throw new Error("AI 资源必须保留生成提示词。");
  if (input.width <= 0 || input.height <= 0) throw new Error("资源尺寸无效。");

  const version =
    Math.max(
      0,
      ...existing
        .filter((asset) => asset.role === input.role)
        .map((asset) => asset.version),
    ) + 1;
  const promptHash = await sha256(input.prompt.trim());
  const contentHash = await sha256({
    promptHash,
    model: input.model,
    provider: input.provider,
    size: [input.width, input.height],
    localPath: input.localPath,
    version,
  });

  return {
    id: stableId("ASSET", `${input.role}:${contentHash}`),
    role: input.role,
    label: input.label,
    prompt: input.prompt.trim(),
    promptHash,
    model: input.model,
    provider: input.provider,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    mimeType: input.mimeType,
    width: input.width,
    height: input.height,
    localPath: input.localPath,
    contentHash,
    version,
    status: "candidate",
    processing: input.processing ?? [],
    provenance: "ai-generated",
  };
}

export function bindAsset(
  assets: AssetGenerationRecord[],
  bindings: AssetBinding[],
  scene: SceneNode[],
  assetId: string,
  sceneNodeId: string,
): {
  assets: AssetGenerationRecord[];
  bindings: AssetBinding[];
  scene: SceneNode[];
} {
  const asset = assets.find((item) => item.id === assetId);
  const node = scene.find((item) => item.id === sceneNodeId);
  if (!asset) throw new Error("找不到要绑定的资源版本。");
  if (!node) throw new Error("找不到目标场景对象。");
  if (asset.role !== node.role) throw new Error("资源角色与场景对象不匹配。");

  const previousBinding = bindings.find((item) => item.sceneNodeId === sceneNodeId);
  const nextAssets = assets.map((item) => {
    if (item.id === assetId) return { ...item, status: "active" as const };
    if (previousBinding?.assetId === item.id) return { ...item, status: "superseded" as const };
    return item;
  });
  const nextBinding: AssetBinding = {
    id: stableId("BINDING", `${sceneNodeId}:${assetId}`),
    assetId,
    sceneNodeId,
    state: "default",
  };

  return {
    assets: nextAssets,
    bindings: [...bindings.filter((item) => item.sceneNodeId !== sceneNodeId), nextBinding],
    scene: scene.map((item) => (item.id === sceneNodeId ? { ...item, assetId } : item)),
  };
}

export function validateAssetManifest(
  assets: AssetGenerationRecord[],
  bindings: AssetBinding[],
  scene: SceneNode[],
): string[] {
  const errors: string[] = [];
  for (const node of scene.filter((item) => item.id !== "SCENE-ROOT")) {
    if (!node.assetId) errors.push(`${node.label} 尚未绑定 AI 位图`);
  }
  for (const asset of assets.filter((item) => item.status === "active")) {
    if (!RASTER_MIME_TYPES.has(asset.mimeType)) errors.push(`${asset.label} 不是允许的位图格式`);
    if (!isLocalAssetPath(asset.localPath)) errors.push(`${asset.label} 不是项目内本地资源`);
    if (asset.provenance !== "ai-generated") errors.push(`${asset.label} 缺少 AI 生成来源`);
  }
  for (const binding of bindings) {
    const asset = assets.find((item) => item.id === binding.assetId);
    const node = scene.find((item) => item.id === binding.sceneNodeId);
    if (!asset || asset.status !== "active") errors.push(`绑定 ${binding.id} 没有活动资源`);
    if (!node || node.assetId !== binding.assetId) errors.push(`绑定 ${binding.id} 与场景引用不一致`);
  }
  return Array.from(new Set(errors));
}

export const activeAssetPaths = (assets: AssetGenerationRecord[]): string[] =>
  assets.filter((asset) => asset.status === "active").map((asset) => asset.localPath).sort();

export function runtimeAssetPaths(
  project: Pick<import("./platformTypes").StudioProject, "assets" | "assetBindings" | "scene">,
  resolvePath: (localPath: string) => string = (path) => path,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const binding of project.assetBindings) {
    const asset = project.assets.find((item) => item.id === binding.assetId && item.status === "active");
    const node = project.scene.find((item) => item.id === binding.sceneNodeId);
    if (!asset || !node) continue;
    const path = resolvePath(asset.localPath);
    result[node.id] = path;
    if (!result[node.role]) result[node.role] = path;
  }
  return result;
}
