import { bindAsset, createGeneratedAsset, runtimeAssetPaths } from "./assets";
import { createProbe } from "./probe";
import { attachBuildResult, createChangeSet, createProject } from "./project";
import { saveProject } from "./projectStorage";
import { createBuild } from "./quality";
import { runGameplayAcceptance } from "./gameplayAcceptance";
import { generateRuntimeFiles } from "./runtimeGenerator";
import type { AssetGenerationRecord, AssetRole, StudioProject } from "./platformTypes";
import type { StudioDraft } from "./types";
import { assetDeliveryForRole, type AssetDeliverySpec } from "./assetDelivery";

export type SimpleProductionStage = "preparing" | "assets" | "building" | "probing" | "ready" | "failed";

export interface SimpleProductionProgress {
  stage: SimpleProductionStage;
  message: string;
}

interface GeneratedImage {
  asset: AssetGenerationRecord;
  publicUrl: string;
}

export interface SimpleProductionDependencies {
  generateImage: (
    input: { role: AssetRole; label: string; prompt: string; delivery: AssetDeliverySpec },
    existing: AssetGenerationRecord[],
    signal?: AbortSignal,
  ) => Promise<GeneratedImage>;
  save?: (project: StudioProject) => void;
}

export interface SimpleProductionInput {
  draft: StudioDraft;
  goal: string;
  visualDirection: string;
  existingProject?: StudioProject | null;
  signal?: AbortSignal;
  onProgress?: (progress: SimpleProductionProgress) => void;
}

const roleLabels: Record<AssetRole, string> = {
  player: "玩家角色",
  background: "游戏背景",
  obstacle: "障碍物",
  collectible: "收集物",
  effect: "反馈特效",
  interface: "游戏界面",
};

const progress = (input: SimpleProductionInput, stage: SimpleProductionStage, message: string) =>
  input.onProgress?.({ stage, message });

const abortIfNeeded = (signal?: AbortSignal) => {
  if (signal?.aborted) throw new DOMException("制作已中断", "AbortError");
};

export const promptForSimpleAsset = (project: StudioProject, role: AssetRole, goal: string, visualDirection: string, delivery = assetDeliveryForRole(role)): string => [
  `${project.name}的${roleLabels[role]}`,
  `用途：${delivery.purpose}；显示适配：${delivery.fit}；背景交付：${delivery.background}`,
  `安全区：${delivery.safeArea}`,
  `玩家体验：${project.spec.intent.vision}`,
  `本轮意见：${goal}`,
  visualDirection ? `视觉方向：${visualDirection}` : "保持清楚、易读的游戏视觉",
  role === "background" ? "只生成环境层，不含主角、棋盘、HUD、按钮或说明文字" : "只生成一个点名主体，不增加其他角色、道具或界面元素",
  "沿用本项目既定玩法和固定运行时层级；图片只承担上述素材槽位，不设计新玩法或新界面",
  "用于单人网页小游戏，轮廓明确，手机小屏也能快速辨认，不含文字、标志、水印或 SVG",
].join("；");

const mergeGameplayResult = (
  project: StudioProject,
  changeSetId: string,
  gameplay: ReturnType<typeof runGameplayAcceptance>,
): StudioProject => {
  const replacedAssertionIds = new Set(gameplay.evidence.map((item) => item.assertionId));
  return {
    ...project,
    assertions: gameplay.assertions,
    evidence: [
      ...project.evidence.filter((item) => !replacedAssertionIds.has(item.assertionId)),
      ...gameplay.evidence,
    ],
    changeSets: project.changeSets.map((change) => change.id === changeSetId ? {
      ...change,
      status: gameplay.errors.length === 0 ? "manual-review" as const : "failed" as const,
      failureReasons: gameplay.errors,
    } : change),
  };
};

export async function buildSimplePlayableRevision(
  input: SimpleProductionInput,
  dependencies: SimpleProductionDependencies,
): Promise<{ project: StudioProject; errors: string[] }> {
  abortIfNeeded(input.signal);
  progress(input, "preparing", "正在建立本轮变更，并锁定不能破坏的核心规则。");
  const freshProject = createProject(input.draft);
  const baseProject = input.existingProject ? {
    ...input.existingProject,
    name: freshProject.name,
    spec: { ...freshProject.spec, projectId: input.existingProject.id },
  } : freshProject;
  const targetNodes = baseProject.scene.filter((node) => node.id !== "SCENE-ROOT");
  const roles = Array.from(new Set(targetNodes.map((node) => node.role)));
  let assets = baseProject.assets;
  let assetBindings = baseProject.assetBindings;
  let scene = baseProject.scene;
  const generatedAssetIds: string[] = [];

  progress(input, "assets", `正在准备 ${roles.length} 类 AI 位图，并绑定到实际游戏对象。`);
  for (const role of roles) {
    abortIfNeeded(input.signal);
    const nodes = targetNodes.filter((node) => node.role === role);
    const delivery = assetDeliveryForRole(role);
    const generated = await dependencies.generateImage({
      role,
      label: roleLabels[role],
      prompt: promptForSimpleAsset(baseProject, role, input.goal, input.visualDirection, delivery),
      delivery,
    }, assets, input.signal);
    generatedAssetIds.push(generated.asset.id);
    assets = [...assets, generated.asset];
    for (const node of nodes) {
      const bound = bindAsset(assets, assetBindings, scene, generated.asset.id, node.id);
      assets = bound.assets;
      assetBindings = bound.bindings;
      scene = bound.scene;
    }
  }

  abortIfNeeded(input.signal);
  const nodeIds = targetNodes.map((node) => node.id);
  let project = createChangeSet(baseProject, input.goal, nodeIds, generatedAssetIds);
  project = { ...project, assets, assetBindings, scene };
  const changeSetId = project.changeSets.at(-1)!.id;
  progress(input, "building", "AI 位图已经进入项目，正在生成不可变试玩构建。");
  const runtime = generateRuntimeFiles(project.spec, runtimeAssetPaths(project));
  const buildResult = await createBuild(project, runtime["app.js"], changeSetId);
  project = attachBuildResult(project, changeSetId, buildResult);
  if (buildResult.build.status !== "healthy") {
    const errors = buildResult.build.errors;
    progress(input, "failed", `构建未通过：${errors.join("；")}`);
    (dependencies.save ?? saveProject)(project);
    return { project, errors };
  }

  abortIfNeeded(input.signal);
  progress(input, "probing", "构建已经打开，正在执行真实玩法动作和核心规则探针。");
  const gameplay = runGameplayAcceptance(project, buildResult.build, createProbe(project.spec));
  project = mergeGameplayResult(project, changeSetId, gameplay);
  (dependencies.save ?? saveProject)(project);
  if (gameplay.errors.length > 0) {
    progress(input, "failed", `玩法验收未通过：${gameplay.errors.join("；")}`);
    return { project, errors: gameplay.errors };
  }
  progress(input, "ready", "玩法规则已经通过，新版本可以进入真实浏览器试玩。");
  return { project, errors: [] };
}

export async function createMockGeneratedImage(
  input: { role: AssetRole; label: string; prompt: string; delivery: AssetDeliverySpec },
  existing: AssetGenerationRecord[],
): Promise<GeneratedImage> {
  const asset = await createGeneratedAsset({
    ...input,
    model: "test-image-model",
    provider: "test",
    mimeType: "image/png",
    width: 1024,
    height: 1024,
    localPath: `assets/${input.role}.png`,
    processing: ["test-fixture"],
  }, existing);
  return { asset, publicUrl: `/generated/${input.role}.png` };
}
