import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  generateGameSpec,
  recommendedArtStyle,
  recommendedModernVisualStyle,
  visualStyleOptions,
  type Build,
  type ProjectDetail,
  type QualityCheck,
  type RenovationScope,
  type RevisionPlan,
} from "../shared/contracts.js";
import { renovationScopeInstruction, renovationSourceForBuild } from "../shared/renovation-scope.js";
import { inspectDifficultyProgressionInBrowser, inspectFailureAssistanceInBrowser, inspectGameInBrowser, inspectGeneratedGameInBrowser, inspectMergeOnboardingInBrowser, inspectNonRealtimeOnboardingInBrowser, inspectSignalHuntOnboardingInBrowser, inspectStageF3DInBrowser, inspectTemplateOnboardingInBrowser, inspectThreeOnboardingInBrowser, inspectVariationRehearsalInBrowser, type FailureAssistanceTemplate, type NonRealtimeOnboardingTemplate, type StageF3DMode, type TemplateOnboardingQualityResult, type VariationRehearsalTemplate } from "./browser-quality.js";
import { writeDesignAcceptanceReport } from "./design-acceptance.js";
import type { DesignContractGenerator } from "./design-contract.js";
import { inspectGameArtifact, writeDesignDocuments, writeGameArtifact } from "./game-artifact.js";
import { inspectGeneratedArtifact, stripPlatformSegments, stripTutorialContract, writeGeneratedArtifact, type GameCodeGenerator, type GeneratedGame, type PreviousGeneration } from "./game-generator.js";
import { assertRasterAiArt } from "./art-policy.js";
import { coverPrompt, dynamicArtPlan, generatedImageDelivery, imageOutputConstraintsForProject, imageRequestFingerprint, readPngDimensions, resolveAssetRenovationTarget, spritePresentationContracts, type DynamicArtEntry, type CoverArtGenerator, type ImageDeliveryMetadata, type ImageOutputConstraint, type ImageRepairAction, type ImageRequestFingerprint } from "./image-generator.js";
import type { SpriteSheetWarning } from "./sprite-sheet.js";
import { getOrGenerateArtCheckpoint } from "./art-checkpoint.js";
import { runWithImageRepairProgress } from "./image-repair-progress.js";
import { applyQualifiedProjectResources, writeQualifiedResourceProvenance } from "./golden-resource-bindings.js";
import type { StudioRepository } from "./studio-repository.js";
import { writeV11BuildMetadata } from "./v11-build-metadata.js";
import { createResourcePlanningForGameSpec } from "../shared/resource-planning/index.js";
import { createGameDesignContractForLegacyProject } from "../shared/game-design-contract/from-legacy.js";
import { readGeneratedSource } from "./generated-source.js";
import { ArtifactValidationFailure, GenerationBudget } from "./generation-budget.js";
import { readReusableGeneratedArt } from "./generated-art-reuse.js";
import { blueprintSpriteFiles, spriteSheetAnimationSchema, type SpriteSheetAnimation } from "../shared/generated-blueprint.js";
import { readReusableRuleAudit, safeContractRules, sha256, writeRuleFidelity } from "./rule-audit-checkpoint.js";
import { runWithCancellation, throwIfCancellationRequested } from "./cancellation.js";
import { BuildFailure, safeFailure } from "./build-failure.js";
import { inspectLocalRepairCandidate } from "./local-repair-candidate.js";

// 官方模板游戏保留新手教学、变化关复验与分层失败帮助的浏览器验收；生成游戏不走这些门禁。
const realtimeOnboardingTemplates: readonly TemplateOnboardingQualityResult["template"][] = ["tetris", "breakout", "snake", "space-shooter"];
const nonRealtimeOnboardingTemplates: readonly NonRealtimeOnboardingTemplate[] = ["klotski", "puzzle", "block-place", "polyomino-fit", "region-logic", "mahjong-roguelite"];
const variationRehearsalTemplates: readonly VariationRehearsalTemplate[] = ["signal-hunt", "tetris", "breakout", "snake", "space-shooter", "merge-2048", "klotski", "puzzle", "block-place", "polyomino-fit", "region-logic", "mahjong-roguelite"];
const failureAssistanceTemplates: readonly FailureAssistanceTemplate[] = ["tetris", "breakout", "snake", "space-shooter", ...variationRehearsalTemplates];

function deliveredRuleAuditSource(root: string, generatedFallback: string) {
  const indexPath = join(root, "index.html");
  const stylesPath = join(root, "styles.css");
  const appPath = join(root, "app.js");
  if (![indexPath, stylesPath, appPath].every(existsSync)) return generatedFallback;
  return [
    "/* 平台交付事实：index.html 先加载 app.js；app.js 中 forge-platform 段由平台在游戏代码前安装 safeStorage 与 __FORGE_SPRITES__，不是缺失依赖。以下是浏览器实际执行的交付文件。 */",
    `<!-- index.html -->\n${readFileSync(indexPath, "utf8")}`,
    `/* styles.css */\n${readFileSync(stylesPath, "utf8")}`,
    `/* app.js */\n${readFileSync(appPath, "utf8")}`,
  ].join("\n\n");
}

const defaultRoleAnimation = (): SpriteSheetAnimation => spriteSheetAnimationSchema.parse({
  frameWidth: 128,
  frameHeight: 128,
  columns: 4,
  rows: 4,
  frameCount: 16,
  anchor: { x: 64, y: 120 },
  clips: [
    { id: "idle", startFrame: 0, frameCount: 4, fps: 6, loop: true },
    { id: "run", startFrame: 4, frameCount: 4, fps: 10, loop: true },
    { id: "hit", startFrame: 8, frameCount: 4, fps: 8, loop: false },
    { id: "effect", startFrame: 12, frameCount: 4, fps: 8, loop: false },
  ],
});

export function applyRevisionPlanAnimationUpgrades(project: ProjectDetail, revisionPlan: RevisionPlan | null) {
  const targets = revisionPlan?.operations.filter((operation) => operation.scope === "assets").flatMap((operation) => operation.targets.filter((target) => target.animation === "sprite-sheet")) ?? [];
  const sprites = project.spec.designProfile.generatedBlueprint?.sprites;
  if (!targets.length) return new Set<string>();
  if (!sprites) throw new Error("当前游戏运行时没有可升级的角色动画槽位，请重新选择资源。");
  const files = new Set<string>();
  for (const target of targets) {
    const sprite = sprites.find((entry) => entry.file === target.file);
    if (!sprite) throw new Error(`“${target.label}”没有可升级的角色动画槽位，请重新选择。`);
    if (!sprite.animation) sprite.animation = defaultRoleAnimation();
    files.add(sprite.file);
  }
  return files;
}

// A plan is assembled from independently selectable operations.  Treat each operation's
// scope as the authority at execution time: older clients (and hand-built API requests)
// can still contain the original multi-part sentence in every operation.
const operationScopePatterns = {
  gameplay: /墨量|能量|消耗|数值|速度|难度|伤害|生命|得分|分数|规则|玩法|关卡|碰撞|操作|冷却|生成间隔/,
  assets: /角色|人物|唐僧|妖精|小妖|厉妖|封面|背景|图片|图标|素材|精灵|动画|动图|sprite/i,
  "visual-style": /美术风格|画风|视觉风格|配色|材质|绘本|水彩|像素风|卡通风/,
} as const;

function selectedOperationContent(scope: RevisionPlan["operations"][number]["scope"], content: string) {
  const clauses = content.split(/[，,。；;\n]|同时|并且/).map(clause => clause.trim()).filter(Boolean);
  const selected = clauses.filter(clause => operationScopePatterns[scope].test(clause));
  return selected.join("，") || content.trim();
}

export function revisionPlanInstructions(revisionPlan: RevisionPlan) {
  return revisionPlan.operations.map((operation) => renovationScopeInstruction(operation.scope, selectedOperationContent(operation.scope, operation.content)));
}

export function selectedRevisionRequest(revisionPlan: RevisionPlan) {
  return revisionPlan.operations.map((operation) => selectedOperationContent(operation.scope, operation.content)).join("；");
}
import type { ResourceFamily } from "../shared/resource-library/index.js";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
/** 默认修正轮数：验收或审核没过就带原因再改，改到通过为止；6 轮仍不过视为巨大消耗，停止并交给用户决定。 */
export const DEFAULT_REPAIR_ROUNDS = 6;
/** 每一外层轮最多含 3 次安全子请求，请求预算据此推算，作为消耗硬上限。 */
const REQUESTS_PER_ROUND = 3;

export async function sourceImageOutputConstraints(root: string, files: readonly string[]) {
  const outputs: Record<string, ImageOutputConstraint> = {};
  for (const file of files) {
    const sourceFile = join(root, file);
    if (!existsSync(sourceFile)) throw new Error(`来源游戏缺少待替换图片 ${file}，已停止部分资源替换。`);
    const sourceSize = await readPngDimensions(readFileSync(sourceFile));
    outputs[file] = { width: sourceSize.width, height: sourceSize.height, fit: file === "assets/cover.png" || file === "assets/background.png" ? "cover" : "contain" };
  }
  return outputs;
}

export async function sourceImageReferences(root: string, files: readonly string[]) {
  const references: Record<string, Buffer> = {};
  for (const file of files) {
    const sourceFile = join(root, file);
    if (!existsSync(sourceFile)) throw new Error(`来源游戏缺少待替换图片 ${file}，已停止参考编辑。`);
    const bytes = readFileSync(sourceFile);
    await readPngDimensions(bytes);
    references[file] = bytes;
  }
  return references;
}

export function animatedRenovationSpec(project: ProjectDetail, target: { files: string[]; clipId?: import("../shared/generated-blueprint.js").SpriteAnimationClipId }, generatedSource: string) {
  if (!target.clipId) return null;
  const animated = project.spec.designProfile.generatedBlueprint?.sprites.filter(sprite => target.files.includes(sprite.file) && sprite.animation?.clips.some(clip => clip.id === target.clipId)) ?? [];
  if (animated.length !== 1) throw new Error(`来源游戏没有为目标资源声明 ${target.clipId} 动画动作，已停止替换；不会把静态图片直接换成 Sprite Sheet。`);
  if (!generatedSource.includes("__FORGE_SPRITES__.create") || !generatedSource.includes(".draw(")) throw new Error("来源游戏尚未接入 Sprite Sheet 播放器，已停止动作替换；不会重写玩法代码或显示整张网格。");
  return animated[0];
}

export async function generateAnimationClipReplacement(generator: Pick<CoverArtGenerator, "generateAnimationSpriteSheet">, project: ProjectDetail, spec: NonNullable<ReturnType<typeof animatedRenovationSpec>>, sourceSheet: Buffer, clipId: import("../shared/generated-blueprint.js").SpriteAnimationClipId) {
  return generator.generateAnimationSpriteSheet(project, spec as Parameters<CoverArtGenerator["generateAnimationSpriteSheet"]>[1], { sourceSheet, clipId });
}

export async function assertSourceSpriteSheetProvenance(sourceRoot: string, file: string, expected: SpriteSheetAnimation) {
  const provenancePath = join(sourceRoot, "_studio", "DYNAMIC_ART.json");
  if (!existsSync(provenancePath)) throw new Error("来源游戏缺少 Sprite Sheet 溯源记录，已停止动作替换。");
  let provenance: { entries?: Array<{ file?: string; image?: ImageDeliveryMetadata }> };
  try { provenance = JSON.parse(readFileSync(provenancePath, "utf8")); }
  catch { throw new Error("来源游戏的 Sprite Sheet 溯源记录不可读取，已停止动作替换。"); }
  const matches = provenance.entries?.filter(entry => entry.file === file) ?? [];
  const image = matches.length === 1 ? matches[0].image : undefined;
  const parsed = spriteSheetAnimationSchema.safeParse(image?.spriteSheet);
  if (image?.delivered?.fit !== "sprite-sheet" || !parsed.success || JSON.stringify(parsed.data) !== JSON.stringify(expected)) {
    throw new Error("来源资源没有与动画蓝图一致的 Sprite Sheet 溯源，已停止动作替换；不会把普通图片或未知图集当作动画资源。");
  }
  const sourcePath = join(sourceRoot, file);
  if (!existsSync(sourcePath)) throw new Error(`来源游戏缺少 Sprite Sheet 文件 ${file}，已停止动作替换。`);
  const actual = await readPngDimensions(readFileSync(sourcePath));
  if (actual.width !== expected.frameWidth * expected.columns || actual.height !== expected.frameHeight * expected.rows
    || image.delivered.width !== actual.width || image.delivered.height !== actual.height) {
    throw new Error("来源 Sprite Sheet 的实际尺寸与动画蓝图或溯源记录不一致，已停止动作替换。");
  }
}

export class BuildOrchestrator {
  private readonly pendingBuildIds: string[] = [];
  private readonly enqueuedBuildIds = new Set<string>();
  private activeBuildCount = 0;
  private readonly cancellations = new Map<string, AbortController>();
  private readonly maxConcurrentBuilds: number;
  private readonly maxRepairRounds: number;

  constructor(
    private readonly repository: StudioRepository,
    private readonly artifactRoot: string,
    private readonly options: {
      browserAudit?: boolean;
      designContracts?: DesignContractGenerator;
      coverArt?: Pick<CoverArtGenerator, "generate" | "generateDynamicArt"> & Partial<Pick<CoverArtGenerator, "generateAnimationSpriteSheet">> & { readonly model?: string };
      codeGenerator?: GameCodeGenerator;
      maxConcurrentBuilds?: number;
      resourceFamilies?: ResourceFamily[];
      /** 一次制作里允许的代码生成轮数（首轮 + 针对验收/审核问题的修正轮）。质量问题在上限内自动修正；网络阻断、远端故障不受此数控制，立即停止。 */
      maxRepairRounds?: number;
    } = {},
  ) {
    this.maxConcurrentBuilds = Math.max(1, options.maxConcurrentBuilds ?? 2);
    this.maxRepairRounds = Math.max(1, options.maxRepairRounds ?? DEFAULT_REPAIR_ROUNDS);
  }

  async start(projectId: string, revision?: { requestId: string; revisionScope?: RenovationScope; revisionPlan?: RevisionPlan; assetTarget?: { clipId: import("../shared/generated-blueprint.js").SpriteAnimationClipId }; content: string }, signal?: AbortSignal): Promise<Build> {
    const build = revision ? await this.repository.createBuild(projectId, revision) : await this.repository.createBuild(projectId);
    if (build.status === "queued") {
      this.enqueue(build.id);
      if (signal) {
        if (signal.aborted) await this.cancel(build.id);
        else signal.addEventListener("abort", () => void this.cancel(build.id), { once: true });
      }
    }
    return build;
  }

  async cancel(buildId: string): Promise<Build> {
    const build = await this.repository.cancelBuild(buildId);
    if (build.status === "cancelled") this.cancellations.get(buildId)?.abort(new DOMException("用户已停止制作。", "AbortError"));
    return build;
  }

  async resumeQueuedBuilds() {
    // Called only after acquiring runtime ownership and failing uncertain runs.
    const ids = await this.repository.queuedBuildIds();
    ids.forEach(id => this.enqueue(id));
    return ids.length;
  }

  private enqueue(id: string) {
    if (!this.enqueuedBuildIds.has(id)) {
      this.enqueuedBuildIds.add(id);
      this.pendingBuildIds.push(id);
      if (!this.cancellations.has(id)) this.cancellations.set(id, new AbortController());
      setTimeout(() => void this.drainQueue(), 20);
    }
  }

  // 构建是重资源操作(真实浏览器验收),必须限制并发,其余任务排队等待空位。
  private drainQueue() {
    while (this.activeBuildCount < this.maxConcurrentBuilds && this.pendingBuildIds.length > 0) {
      const buildId = this.pendingBuildIds.shift()!;
      const cancellation = this.cancellations.get(buildId) ?? new AbortController();
      this.cancellations.set(buildId, cancellation);
      this.enqueuedBuildIds.delete(buildId);
      this.activeBuildCount += 1;
      void runWithCancellation(cancellation.signal, () => runWithImageRepairProgress(async progress => {
        try {
          await this.repository.reportStepProgress(buildId, 2, `正在自动修复“${progress.resource.label}”（${progress.attempt}/${progress.maxAttempts}）：${progress.message}`);
        } catch {
          throwIfCancellationRequested();
          // Progress text is best effort. A transient write failure must not
          // discard a paid image result or consume another generation attempt.
        }
      }, () => this.run(buildId, cancellation.signal))).finally(() => {
        this.activeBuildCount -= 1;
        this.cancellations.delete(buildId);
        this.drainQueue();
      });
    }
  }

  private async step(buildId: string, sequence: number, action: () => string | Promise<string>) {
    throwIfCancellationRequested();
    if (!await this.repository.markStepRunning(buildId, sequence)) throw new DOMException("构建已停止。", "AbortError");
    await wait(260);
    throwIfCancellationRequested();
    const output = await action();
    throwIfCancellationRequested();
    if (!await this.repository.completeStep(buildId, sequence, output)) throw new DOMException("构建已停止。", "AbortError");
  }

  private async run(buildId: string, signal: AbortSignal) {
    let sequence = 0;
    let passedProbes: string[] = [];
    let qualityChecks: QualityCheck[] = [];
    // 图片先于代码生成；结果留给代码步骤写入溯源并在模板资源之后回写。
    let artResult: {
      cover: Buffer | null;
      dynamicArt: DynamicArtEntry[];
      coverImage?: ImageDeliveryMetadata;
      reusedArt: ReturnType<typeof readReusableGeneratedArt>;
      imageReceipts: Array<{ group: string; cacheHit: boolean; generatedAt: string; request: ImageRequestFingerprint }>;
    } | null = null;
    let assetSourceBuildId: string | null = null;
    try {
      // A second process may have queued the same receipt. Only the database
      // claim winner may call models or write artifacts; losers do not fail it.
      if (!await this.repository.markBuildRunning(buildId)) return;
      const build = await this.repository.buildById(buildId);
      const storedProject = await this.repository.get(build.projectId);
      if (!storedProject) throw new Error("项目不存在。");
      if (storedProject.archivedAt) throw new Error("项目已归档，未继续制作或调用模型；恢复项目后可明确启动新任务。");
      const userMessages = (await this.repository.listMessages(build.projectId)).filter((message) => message.role === "user");
      const revisionPlan = build.revisionPlan ?? storedProject.spec.renovation?.revisionPlan ?? null;
      const planScopes = new Set(revisionPlan?.operations.map((operation) => operation.scope) ?? []);
      const hasAssetOperation = planScopes.has("assets");
      const hasGameplayOperation = planScopes.has("gameplay");
      const hasVisualOperation = planScopes.has("visual-style");
      const plannedAssetTargets = revisionPlan?.operations.filter((operation) => operation.scope === "assets").flatMap((operation) => operation.targets) ?? [];
      let animationUpgradeFiles = new Set<string>();
      const revisionMessage = build.revisionScope || revisionPlan ? userMessages.find((message) => message.id === build.id) : null;
      const revisionRequest = revisionMessage?.content ?? storedProject.spec.renovation?.request ?? null;
      const revisionScope = build.revisionScope ?? (hasGameplayOperation ? "gameplay" : hasAssetOperation ? "assets" : hasVisualOperation ? "visual-style" : storedProject.spec.renovation?.revisionScope ?? null);
      const directions = revisionPlan
        ? revisionPlanInstructions(revisionPlan)
        : revisionScope && revisionRequest
          ? [renovationScopeInstruction(revisionScope, revisionRequest)]
        : userMessages.map((message) => message.content);
      const effectiveRevisionRequest = revisionPlan ? selectedRevisionRequest(revisionPlan) : revisionRequest;
      // A new renovation already carries a locally constrained confirmed profile.
      // Only a /revisions request asks the planner to revise the current contract again.
      const project = await this.normalizeProject(storedProject, build.revisionScope || build.revisionPlan ? directions : [], revisionScope, effectiveRevisionRequest);
      if (revisionScope && effectiveRevisionRequest && (storedProject.spec.renovation || revisionPlan)) project.spec.renovation = {
        sourceProjectId: renovationSourceForBuild(storedProject.spec.renovation?.sourceProjectId ?? storedProject.id, storedProject.id, Boolean(build.revisionScope || build.revisionPlan)),
        revisionScope,
        request: effectiveRevisionRequest,
        revisionPlan: revisionPlan ?? null,
        assetTarget: null,
      };
      animationUpgradeFiles = applyRevisionPlanAnimationUpgrades(project, revisionPlan);
      const root = join(this.artifactRoot, build.id);

      await this.step(buildId, sequence, () => this.analyze(project, directions));
      sequence += 1;
      await this.step(buildId, sequence, async () => {
        // 逐条审计修订后的合同是否落实了创作意见;审计不可用时文档只列意见。
        const directionAudit = directions.length > 0 && this.options.designContracts
          ? await this.options.designContracts.auditDirections(project.spec.designProfile, directions)
          : null;
        writeDesignDocuments(root, project, directions, directionAudit);
        const addressed = directionAudit?.filter((verdict) => verdict.addressed).length ?? 0;
        const auditNote = directions.length
          ? directionAudit
            ? `；${directions.length} 条创作对话意见已纳入修订，其中 ${addressed} 条经审计确认落实，逐条判定见 GAME_DESIGN.md`
            : `；${directions.length} 条创作对话意见已纳入设计合同修订依据`
          : "";
        return `页面公开：写入专业 GAME_DESIGN.md、ART_DIRECTION.md、ART_REVIEW.md、SOUND_DIRECTION.md 与 OPEN_SOURCE_ATTRIBUTION.md${auditNote}；主美闸门会检查宣传图一致性、实际尺寸清晰度、居中、占格率与手机画幅。`;
      });
      sequence += 1;
      await this.step(buildId, sequence, async () => {
        const resourcePlan = project.spec.resourcePlanning;
        if (resourcePlan) {
          const provenanceRoot = join(root, "_studio");
          mkdirSync(provenanceRoot, { recursive: true });
          writeFileSync(join(provenanceRoot, "RESOURCE_PLAN.json"), JSON.stringify(resourcePlan, null, 2), "utf8");
        }
        const declaredArtPlan = dynamicArtPlan(project);
        const zeroImageRoute = project.spec.template === "generated" && declaredArtPlan.length === 0 && !plannedAssetTargets.length;
        if (zeroImageRoute) {
          artResult = { cover: null, dynamicArt: [], reusedArt: null, imageReceipts: [] };
          return "页面公开：当前确认方案未声明必须交付的位图，本次不调用图像模型；代码可用 CSS、Canvas 或内联 SVG 绘制玩法与界面。";
        }
        if (!this.options.coverArt) throw new Error("确认方案声明了位图资源，但图像服务未配置。请先配置 OpenAI API Key。");
        const resolvedAssetTarget = plannedAssetTargets.length
          ? { kind: plannedAssetTargets.length === 1 ? "single" as const : "set" as const, files: plannedAssetTargets.map((target) => target.file), label: plannedAssetTargets.map((target) => target.label).join("、") }
          : project.spec.renovation?.revisionScope === "assets" ? resolveAssetRenovationTarget(project) : null;
        const assetTarget = resolvedAssetTarget && build.assetClipId ? { ...resolvedAssetTarget, clipId: build.assetClipId } : resolvedAssetTarget;
        if (assetTarget && project.spec.renovation) {
          project.spec.renovation.assetTarget = assetTarget;
          assetSourceBuildId = await this.reuseSourceRuntime(project, root);
          if (!assetSourceBuildId) throw new Error("来源游戏的可玩资源不可用，已停止部分资源替换；没有重新生成整套资源。");
          if (assetTarget.clipId) {
            const sourceApp = existsSync(join(root, "app.js")) ? stripPlatformSegments(readFileSync(join(root, "app.js"), "utf8")) : "";
            const animatedSpec = animatedRenovationSpec(project, assetTarget, sourceApp)!;
            await assertSourceSpriteSheetProvenance(join(this.artifactRoot, assetSourceBuildId), animatedSpec.file, animatedSpec.animation!);
          } else {
            const animatedTargets = project.spec.designProfile.generatedBlueprint?.sprites.filter(sprite => assetTarget.files.includes(sprite.file) && sprite.animation && !animationUpgradeFiles.has(sprite.file)) ?? [];
            for (const animatedTarget of animatedTargets) {
              await assertSourceSpriteSheetProvenance(join(this.artifactRoot, assetSourceBuildId), animatedTarget.file, animatedTarget.animation!);
            }
          }
        }
        let reusedArt: ReturnType<typeof readReusableGeneratedArt> = null;
        if (project.spec.template === "generated" && !assetTarget) {
          const reusableProjectIds = [...new Set([project.id, project.spec.renovation?.sourceProjectId].filter(Boolean))] as string[];
          for (const reusableProjectId of reusableProjectIds) {
            for (const candidate of await this.repository.recentReusableBuilds(reusableProjectId, buildId)) {
              const prior = await this.repository.buildById(candidate.id);
              reusedArt = readReusableGeneratedArt(project, this.options.coverArt.model ?? "gpt-image-2", { root: join(this.artifactRoot, candidate.id), projectId: prior.projectId, buildId: prior.id, status: prior.status });
              if (reusedArt) break;
            }
            if (reusedArt) break;
          }
        }
        await this.repository.reportStepProgress(buildId, sequence, reusedArt ? "图像要求未变，正在复用同项目已核验的封面与背景，不重复生图" : "正在并行生成封面与局内美术，完成后核查来源与实际接入");
        const imageReceipts: Array<{ group: string; cacheHit: boolean; generatedAt: string; request: ImageRequestFingerprint }> = [];
        const plannedOutputs = imageOutputConstraintsForProject(project);
        const plannedPresentations = spritePresentationContracts(project);
        const requestForPlan = (plan: Array<Omit<DynamicArtEntry, "bytes">>, sources: Readonly<Record<string, Buffer>> = {}, clipId?: import("../shared/generated-blueprint.js").SpriteAnimationClipId, outputs: Readonly<Record<string, ImageOutputConstraint>> = plannedOutputs) => {
          const files = new Set(plan.map(entry => entry.file));
          return imageRequestFingerprint(sources,
            Object.fromEntries(Object.entries(outputs).filter(([file]) => files.has(file))), clipId,
            Object.fromEntries(Object.entries(plannedPresentations).filter(([file]) => files.has(file))));
        };
        const generateGroup = async (group: "cover" | "dynamic", plan: Array<Omit<DynamicArtEntry, "bytes">>, generate: () => Promise<DynamicArtEntry[]>, request: ImageRequestFingerprint = requestForPlan(plan)) => {
          if (project.spec.template !== "generated") return generate();
          const receipt = await getOrGenerateArtCheckpoint(join(this.artifactRoot, "_image-checkpoints", project.id), {
            projectId: project.id, model: this.options.coverArt!.model ?? "gpt-image-2", runtimeTarget: project.spec.runtimeTarget,
            aspectRatio: project.spec.aspectRatio, group, plan, request,
          }, generate);
          imageReceipts.push({ group, cacheHit: receipt.cacheHit, generatedAt: receipt.generatedAt, request });
          await this.repository.reportStepProgress(buildId, sequence, `${group === "cover" ? "封面" : "局内图片"}${receipt.cacheHit ? "已恢复已保存的生成结果，无需再次生图" : receipt.entries.length ? "已生成并保存" : "未返回完整图片"}；正在汇总资源并检查接入`).catch(() => {});
          return receipt.entries;
        };
        const coverPlan = { file: "assets/cover.png", role: "封面", prompt: coverPrompt(project) };
        const targetFiles = new Set(assetTarget?.files ?? []);
        const targetDynamicPlan = dynamicArtPlan(project).filter(entry => targetFiles.has(entry.file));
        const targetOutputs = assetTarget ? await sourceImageOutputConstraints(root, assetTarget.files) : {};
        for (const [file, presentation] of Object.entries(plannedPresentations)) if (targetOutputs[file]) targetOutputs[file] = {
          ...targetOutputs[file], fit: "contain", anchor: presentation.anchor, safeInsetRatio: presentation.safeInsetRatio,
          minSourcePixels: presentation.minSourcePixels, requireAlpha: true,
        };
        const targetReferences = assetTarget ? await sourceImageReferences(root, assetTarget.files) : {};
        let coverImage: ImageDeliveryMetadata | undefined;
        // Only identical, verified assets may be reused. Missing assets never become placeholders.
        const [cover, dynamicArt] = reusedArt
          ? [reusedArt.cover, reusedArt.dynamicArt]
          : assetTarget
            ? await Promise.all([
                targetFiles.has("assets/cover.png")
                  ? generateGroup("cover", [coverPlan], async () => {
                      const bytes = await this.options.coverArt!.generate(project, targetOutputs["assets/cover.png"], targetReferences["assets/cover.png"]);
                      return bytes ? [{ ...coverPlan, bytes, image: generatedImageDelivery(bytes) ?? undefined }] : [];
                    }, requestForPlan([coverPlan], { "assets/cover.png": targetReferences["assets/cover.png"]! }, undefined, targetOutputs)).then(entries => { coverImage = entries[0]?.image; return entries[0]?.bytes ?? null; })
                  : Promise.resolve(existsSync(join(root, "assets", "cover.png")) ? readFileSync(join(root, "assets", "cover.png")) : null),
                targetDynamicPlan.length
                  ? assetTarget.clipId
                      ? (async () => {
                        if (!this.options.coverArt!.generateAnimationSpriteSheet) throw new Error("当前图像服务未启用 Sprite Sheet 动作替换。");
                        const sourceApp = stripPlatformSegments(readFileSync(join(root, "app.js"), "utf8"));
                        const spec = animatedRenovationSpec(project, assetTarget, sourceApp)!;
                        const clipId = assetTarget.clipId!;
                        const generated = await generateAnimationClipReplacement({ generateAnimationSpriteSheet: this.options.coverArt!.generateAnimationSpriteSheet }, project, spec, readFileSync(join(root, spec.file)), clipId);
                        if (!generated) throw new Error(`动画动作 ${clipId} 生成或逐帧校验失败，已停止替换并保留来源版本。`);
                        return [generated];
                      })()
                    : generateGroup("dynamic", targetDynamicPlan, () => this.options.coverArt!.generateDynamicArt(project, assetTarget.files, targetOutputs, targetReferences), requestForPlan(targetDynamicPlan, targetReferences, assetTarget.clipId, targetOutputs)).then(entries => {
                        const expected = targetDynamicPlan.map(({ file }) => file);
                        const actual = entries.map(({ file }) => file);
                        if (entries.length !== targetDynamicPlan.length || actual.some((file, index) => file !== expected[index])) {
                          throw new Error(`局部资源参考编辑未完整返回目标：需要 ${expected.join("、")}，实际 ${actual.join("、") || "无"}；已停止制作并保留来源版本。`);
                        }
                        return entries;
                      })
                  : Promise.resolve([]),
              ])
            : await Promise.all([
                generateGroup("cover", [coverPlan], async () => {
                  const bytes = await this.options.coverArt!.generate(project, plannedOutputs["assets/cover.png"]);
                  return bytes ? [{ ...coverPlan, bytes, image: generatedImageDelivery(bytes) ?? undefined }] : [];
                }).then(entries => { coverImage = entries[0]?.image; return entries[0]?.bytes ?? null; }),
                generateGroup("dynamic", dynamicArtPlan(project), () => this.options.coverArt!.generateDynamicArt(project, undefined, plannedOutputs)),
              ]);
        if (!cover) throw new Error("AI 封面生成失败，构建已中断；不会使用占位图替代。");
        const background = dynamicArt.find((entry) => entry.role === "局内背景" && entry.file === "assets/background.png");
        if (!background && !existsSync(join(root, "assets", "background.png"))) throw new Error("AI 局内背景生成失败，构建已中断；不会使用程序图或 SVG 替代。");
        // 确认方案声明的局内主体必须全部真实生成；缺图不能用程序化图形或占位图顶替。
        const plannedSprites = blueprintSpriteFiles(project.spec.template === "generated" ? project.spec.designProfile.generatedBlueprint : null);
        const missingSprites = plannedSprites.filter(file => !dynamicArt.some(entry => entry.file === file) && !existsSync(join(root, file)));
        if (missingSprites.length) throw new Error(`确认方案要求的局内主体位图未全部生成（${missingSprites.join("、")}），构建已中断；不会用程序化图形或占位图替代。`);
        mkdirSync(join(root, "assets"), { recursive: true });
        writeFileSync(join(root, "assets", "cover.png"), cover);
        for (const entry of dynamicArt) {
          const target = join(root, entry.file);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, entry.bytes);
        }
        const animatedFiles = new Set(project.spec.designProfile.generatedBlueprint?.sprites.filter(sprite => sprite.animation).map(sprite => sprite.file) ?? []);
        const deliveredSlots = [{ file: "assets/cover.png", role: "封面", fit: "cover" as const }, ...dynamicArtPlan(project).map(entry => ({ file: entry.file, role: entry.role, fit: entry.file === "assets/background.png" ? "cover" as const : animatedFiles.has(entry.file) ? "sprite-sheet" as const : "contain" as const }))];
        const deliveredLayout: string[] = [];
        for (const slot of deliveredSlots) {
          const file = join(root, slot.file);
          if (!existsSync(file)) continue;
          try {
            const size = await readPngDimensions(readFileSync(file));
            deliveredLayout.push(`${slot.file}(${slot.role},${size.width}×${size.height},${slot.fit})`);
          } catch {
            // Legacy test doubles and old artifacts may only satisfy the historical PNG signature gate.
            // Image generation itself validates and normalizes every new provider response before this point.
          }
        }
        if (deliveredLayout.length) project.spec.hardConstraints = [...project.spec.hardConstraints, `实际图片交付槽位:${deliveredLayout.join("；")}。代码必须按各槽位角色和 fit 等比显示，以运行时 naturalWidth/naturalHeight 为准。`];
        artResult = { cover, dynamicArt, ...(coverImage ? { coverImage } : {}), reusedArt, imageReceipts };
        const planningSummary = resourcePlan ? `生成前已检索 ${resourcePlan.decisions.length} 个资源需求：${resourcePlan.summary.needsReview} 个候选待复核，${resourcePlan.summary.needsGeneration} 个需生成或补状态。` : "旧项目没有资源规划记录。";
        const warningEntries = dynamicArt.filter(entry => entry.image?.warnings?.length);
        const repairedEntries = [{ file: "assets/cover.png", role: "封面", image: coverImage }, ...dynamicArt].filter(entry => entry.image?.repairs?.length);
        const repairSummary = repairedEntries.length
          ? ` 系统已自动修复：${repairedEntries.map(entry => `${entry.role}（${entry.file}）${entry.image!.repairs!.map((repair: ImageRepairAction) => repair.code).join("、")}`).join("；")}；每项只重新生成对应资源，未重复生成已通过资源。`
          : "";
        const warningSummary = warningEntries.length
          ? ` 美术提醒：${warningEntries.map(entry => `${entry.role}（${entry.file}）${entry.image!.warnings!.map((warning: SpriteSheetWarning) => `第 ${warning.frame} 帧${warning.sides.join("/")}侧贴近草稿边界`).join("、")}`).join("；")}；不影响图集运行合同，系统已记录供后续试玩验收。`
          : "";
        return `页面公开：${reusedArt ? "图像要求未变，已复用同项目核验过的位图，本次未再次生图；" : ""}封面、局内背景${plannedSprites.length ? `与 ${plannedSprites.length} 张局内主体位图（${plannedSprites.join("、")}）` : ""}均由 ${this.options.coverArt.model ?? 'gpt-image-2'} 在代码生成之前完成并落盘；${planningSummary}后续代码只能加载并绘制这些位图，不得程序化自绘主体。${repairSummary}${warningSummary}`;
      });
      sequence += 1;
      await this.step(buildId, sequence, async () => {
        const art = artResult;
        if (!art) throw new Error("资源步骤没有完成，未继续生成代码。");
        const appliedAssetTarget = project.spec.renovation?.assetTarget ?? null;
        const codeSummary = await (async (): Promise<string> => {
          if (appliedAssetTarget && !hasGameplayOperation && !hasVisualOperation && animationUpgradeFiles.size === 0) {
            const sourceRuntimeBuildId = await this.reuseSourceRuntime(project, root);
            if (!sourceRuntimeBuildId) throw new Error("来源游戏的可玩运行时不可用，已停止部分资源替换；没有重新生成代码。");
            return `页面公开：完整复用来源构建 ${sourceRuntimeBuildId} 的 HTML、CSS、脚本与未点名资源；仅覆盖“${appliedAssetTarget.label}”，本次未调用代码生成模型。`;
          }
          if (project.spec.template === "generated") {
            const experimental = await this.generateExperimentalGame(project, root, directions, (detail, excerpt) =>
              this.repository.reportStepProgress(buildId, sequence, detail, excerpt ?? null).catch(error => {
                // Reporting trouble must never be mistaken for defective code and trigger paid regeneration.
                console.warn(`构建 ${buildId} 进度写入暂时失败：`, error);
              }));
            const modeNote = experimental.iterated
              ? `基于上一版代码迭代修改（${directions.length} 条对话意见）`
              : "全新生成";
            const auditNote = experimental.audit
              ? `；规则审计 ${experimental.audit.filter((verdict) => verdict.implemented).length}/${experimental.audit.length} 条经代码核对已实现${experimental.auditReusedFrom ? `（代码与规则未变，复用构建 ${experimental.auditReusedFrom} 的审核结果，本次未调用审核模型）` : ""}，逐条判定见 RULE_FIDELITY.json`
              : "；规则审计本次不可用，未逐条核对（如实记录）";
            const runtimeNote = project.spec.runtimeTarget === "web-3d" ? "基于本地 three.js 模块的 3D " : "";
            return `页面公开：实验通道——已由 ${experimental.generation.model ?? '所选文本模型'} 按设计合同${modeNote}独有${runtimeNote}单文件代码（${experimental.generation.rounds} 轮生成，安全扫描通过，禁网络/禁外链/禁存储偷渡）；开始后直接进入完整玩法，不注入新手教学${auditNote}。实现说明与哈希归档于 GENERATED_CODE.json。`;
          }
          const sourceRuntimeBuildId = project.spec.renovation?.revisionScope === "visual-style"
            ? await this.reuseSourceRuntime(project, root)
            : null;
          if (!sourceRuntimeBuildId) {
            if (project.spec.renovation && project.spec.renovation.revisionScope !== "gameplay") {
              throw new Error("来源游戏的可玩运行时不可用，已停止局部改造；没有退回默认模板重新制作。");
            }
            writeGameArtifact(root, project);
          }
          const source = project.spec.templateSource;
          const runtime = project.spec.runtimeTarget === "web-3d"
            ? "已写入 Three.js WebGL 2 场景、第三人称移动、碰撞、收集目标、出口结算与移动端方向控制"
            : `已按 ${project.spec.template} 模板写入独立玩法逻辑、移动端控制`;
          return `页面公开：${sourceRuntimeBuildId ? `复用来源构建 ${sourceRuntimeBuildId} 的既有运行时，只应用本次资源或风格改造` : runtime}、资源清单与视听资产。${source ? `代码来源：${source.sourceName} / ${source.license} / ${source.integrationMode}；没有复制上游视听资产。` : ""}`;
        })();
        // 模板资源可能与 AI 位图同名：先写代码产物，再回写 AI 位图，保证最终游戏用的是 AI 美术。
        mkdirSync(join(root, "assets"), { recursive: true });
        if (art.cover) writeFileSync(join(root, "assets", "cover.png"), art.cover);
        for (const entry of art.dynamicArt) {
          const target = join(root, entry.file);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, entry.bytes);
        }
        const style = visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
        // 黄金模板在 AI 位图落盘后覆盖已核验的运行时槽位，确保最终游戏实际使用精选资源。
        // 被覆盖的槽位必须从 AI 清单剔除，避免错误声明素材来源。
        const curatedResources = appliedAssetTarget ? null : applyQualifiedProjectResources(root, project);
        const curatedTargets = new Set(curatedResources?.assets.map(({ target }) => target.replaceAll("\\", "/").toLowerCase()) ?? []);
        if (appliedAssetTarget) {
          if (art.cover && appliedAssetTarget.files.includes("assets/cover.png")) writeFileSync(join(root, "assets", "cover.png"), art.cover);
          for (const entry of art.dynamicArt) {
            const target = join(root, entry.file);
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, entry.bytes);
            curatedTargets.delete(entry.file.replaceAll("\\", "/").toLowerCase());
          }
        }
        const writtenDynamicArt = art.dynamicArt.filter(({ file }) => !curatedTargets.has(file.replaceAll("\\", "/").toLowerCase()));
        const provenanceRoot = join(root, "_studio");
        mkdirSync(provenanceRoot, { recursive: true });
        if (art.imageReceipts.length) writeFileSync(join(provenanceRoot, "IMAGE_GENERATION_RECEIPTS.json"), JSON.stringify(art.imageReceipts, null, 2), "utf8");
        const entries = [
          ...(art.cover ? [{ file: "assets/cover.png", role: "封面", bytes: art.cover.length, prompt: coverPrompt(project), ...(art.coverImage ? { image: art.coverImage } : {}) }] : []),
          ...writtenDynamicArt.map((entry) => ({ file: entry.file, role: entry.role, bytes: entry.bytes.length, prompt: entry.prompt, ...(entry.image ? { image: entry.image } : {}) })),
        ];
        let assetRenovationProvenance: string | null = null;
        if (appliedAssetTarget) {
          if (!assetSourceBuildId) throw new Error("部分资源替换缺少来源构建记录，已停止写入产物溯源。");
          const sourceProvenancePath = join(this.artifactRoot, assetSourceBuildId, "_studio", "DYNAMIC_ART.json");
          if (!existsSync(sourceProvenancePath)) throw new Error("来源游戏缺少图片溯源记录，已停止部分资源替换；没有虚构未替换资源的来源。");
          const sourceProvenance = JSON.parse(readFileSync(sourceProvenancePath, "utf8")) as { entries?: Array<{ file: string; role: string; bytes: number; prompt: string }>; [key: string]: unknown };
          if (!Array.isArray(sourceProvenance.entries)) throw new Error("来源游戏的图片溯源记录不可用，已停止部分资源替换。");
          const targetFiles = new Set(appliedAssetTarget.files);
          const replacements = entries.filter(entry => targetFiles.has(entry.file));
          const mergedEntries = [...sourceProvenance.entries.filter(entry => !targetFiles.has(entry.file)), ...replacements];
          assetRenovationProvenance = JSON.stringify({
            ...sourceProvenance,
            model: this.options.coverArt?.model ?? sourceProvenance.model,
            generatedAt: new Date().toISOString(),
            entries: mergedEntries,
            renovation: { sourceBuildId: assetSourceBuildId, target: appliedAssetTarget },
          }, null, 2);
        }
        writeFileSync(join(provenanceRoot, "DYNAMIC_ART.json"), assetRenovationProvenance ?? (art.reusedArt ? art.reusedArt.provenanceJson : JSON.stringify({
          schemaVersion: 2,
          model: this.options.coverArt?.model ?? "gpt-image-2",
          generatedAt: art.imageReceipts.length ? art.imageReceipts.map(item => item.generatedAt).sort().at(-1) : new Date().toISOString(),
          entries,
        }, null, 2)), "utf8");
        const artWarnings = entries.flatMap(entry => entry.image?.warnings?.map(warning => ({ file: entry.file, role: entry.role, warning })) ?? []);
        if (artWarnings.length) {
          const reviewPath = join(provenanceRoot, "ART_REVIEW.md");
          const review = existsSync(reviewPath) ? readFileSync(reviewPath, "utf8").trimEnd() : "# 美术复核";
          writeFileSync(reviewPath, `${review}\n\n## 需要试玩检查的资源\n\n${artWarnings.map(({ file, role, warning }) => `- ${role}（${file}）：${warning.message}`).join("\n")}\n\n这些提醒不阻断当前交付。若后续自动试玩发现边界确实影响观感，系统应只重新生成对应资源。\n`, "utf8");
        }
        if (art.reusedArt) writeFileSync(join(provenanceRoot, "ART_REUSE.json"), JSON.stringify({ sourceBuildId: art.reusedArt.sourceBuildId, reusedAt: new Date().toISOString(), reason: "同项目模型、提示词、运行时和画幅一致；文件完整性复验通过；本次未调用生图模型" }, null, 2), "utf8");
        if (assetRenovationProvenance && assetSourceBuildId) writeFileSync(join(provenanceRoot, "ART_REUSE.json"), JSON.stringify({ sourceBuildId: assetSourceBuildId, reusedAt: new Date().toISOString(), reason: "部分资源替换仅生成目标槽位；其余图片及逐项溯源继承来源构建" }, null, 2), "utf8");
        if (curatedResources) writeQualifiedResourceProvenance(root, curatedResources);
        // A dynamic slot may be fulfilled by generated art, a verified source copy, or
        // a qualified curated binding. Check completeness only after all three sources
        // have been applied so a partial provider response cannot publish a missing slot.
        const missingPlannedArt = dynamicArtPlan(project)
          .map(({ file }) => file)
          .filter(file => !existsSync(join(root, file)));
        if (missingPlannedArt.length) throw new Error(`确认方案要求的局内素材未全部交付（${missingPlannedArt.join("、")}），构建已中断；不会以缺图状态发布。`);
        const visualSource = ["index.html", "styles.css", "app.js"]
          .map((file) => readFileSync(join(root, file), "utf8"))
          .join("\n");
        if (dynamicArtPlan(project).length > 0) assertRasterAiArt(root, visualSource);
        const v11Project = writeV11BuildMetadata(root, project, { directions, previousRoot: join(this.artifactRoot, project.version.id) });
        const curatedFamilies = curatedResources ? [...new Set(curatedResources.bindings.map(({ familyId }) => familyId))].join("、") : "";
        const curatedSummary = curatedResources ? `；${curatedResources.assets.length} 个运行时槽位使用 ${curatedFamilies} 精选资源，许可、哈希、需求与配方证据已归档` : "";
        return `${codeSummary}${curatedSummary}；已按确认资源清单检查实际交付。${style.label}视觉系统已应用到页面编排、组件造型、字体层级、${style.detailLabel}、画布细节和反馈动效。1.1 工程清单已冻结（${v11Project.objects.length} 个对象、${v11Project.rules.length} 条规则）。`;
      });
      sequence += 1;
      await this.step(buildId, sequence, () => {
        passedProbes = project.spec.template === "generated" ? inspectGeneratedArtifact(root, { requireAiArt: dynamicArtPlan(project).length > 0, expectedCampaign: project.spec.designProfile.generatedCampaign ?? null, expectedBlueprint: project.spec.designProfile.generatedBlueprint ?? null }) : inspectGameArtifact(root);
        qualityChecks = passedProbes.map((label, index) => ({
          id: `STATIC-${String(index + 1).padStart(2, "0")}`,
          label,
          status: "passed" as const,
          evidence: "构建产物静态与脚本探针通过。",
        }));
        return `页面公开：${passedProbes.length}/${passedProbes.length} 静态探针通过（${passedProbes.join("、")}）。`;
      });
      sequence += 1;
      await this.step(buildId, sequence, async () => {
        if (this.options.browserAudit === false) {
          return "页面公开：测试环境跳过浏览器验收；成功构建将冻结为不可变版本。";
        }
        if (project.spec.template === "generated") {
          const generatedResult = await inspectGeneratedGameInBrowser(root, { expectedCampaign: project.spec.designProfile.generatedCampaign ?? null, expectedBlueprint: project.spec.designProfile.generatedBlueprint ?? null });
          qualityChecks.push(...generatedResult.checks);
          if (project.spec.designContract) qualityChecks.push(writeDesignAcceptanceReport(root, project.spec.designContract, qualityChecks, { tutorialRequired: false }));
          return `页面公开：真实浏览器已按运行时契约验证生成代码——关卡递进、开始、胜负与重开、3 档画幅布局与错误监听均通过；保存 ${generatedResult.screenshotPaths.length} 张验收截图。实验性作品：通过自动验收，但玩法深度仍以真人试玩为准。`;
        }
        const browserResult = await inspectGameInBrowser(root);
        qualityChecks.push(...browserResult.checks);
        if (project.spec.runtimeTarget === "web-3d") {
          const mode = (project.spec.threeMode ?? "collector") as StageF3DMode;
          const onboarding = await inspectThreeOnboardingInBrowser(root, mode);
          qualityChecks.push({ id: `ONBOARDING-3D-${mode.toUpperCase()}`, label: "3D 首次操作前冻结压力并由真实操作完成教学", status: "passed", evidence: `真实信号 ${onboarding.acceptedSignals.map(({ signal }) => signal).join(" → ")}；安全等待、刷新恢复、重看和跳过均通过。` });
          const variation = await inspectVariationRehearsalInBrowser(root, mode);
          qualityChecks.push({ id: "CONTENT-VARIATION-REHEARSAL", label: "3D 教学机制在变化关卡中仍由真实玩法成立", status: "passed", evidence: `第 ${variation.sourceLevel} 关“${variation.sourceModifier}”→第 ${variation.rehearsalLevel} 关“${variation.rehearsalModifier}”；真实复现 ${variation.expectedSignals.join(" → ")}。` });
          const difficulty = await inspectDifficultyProgressionInBrowser(root, mode);
          qualityChecks.push({ id: "PROGRESSION-RUNTIME", label: "3D 二十关倍率平滑且阶段具有真实结构变化", status: "passed", evidence: `已采样 ${difficulty.levelsChecked} 关、核对 ${difficulty.beatTransitionsChecked} 个合同阶段转换；最大相邻倍率步长 ${difficulty.maximumMultiplierStep}。` });
          const assistance = await inspectFailureAssistanceInBrowser(root, mode);
          qualityChecks.push({ id: "ASSISTANCE-RUNTIME", label: "3D 连续失败提供显式分层帮助且成功后清零", status: "passed", evidence: `第 1–4 次失败实际呈现 ${assistance.observedActions.join(" → ")}；刷新后保留并在成功后清零，未启用暗中调难度。` });
          const deep = await inspectStageF3DInBrowser(root, mode);
          qualityChecks.push({ id: `STAGE-F-3D-${mode.toUpperCase()}`, label: "3D 手机与桌面深层玩法验收", status: "passed", evidence: `${mode} 完成 ${deep.completedRuns} 次真实通关、${deep.failedRuns} 次失败分支，并核对模式专属几何、输入、性能与关卡证据。` });
          if (project.spec.designContract) qualityChecks.push(writeDesignAcceptanceReport(root, project.spec.designContract, qualityChecks));
          return `页面公开：3D ${mode} 已通过安全教学、20 关结构、变化关真实动作、连续失败帮助、手机与桌面深层试玩，并逐条闭合设计合同；保存 ${browserResult.screenshotPaths.length} 张通用验收截图及模式专属证据。`;
        }
        let onboardingSummary = "";
        let variationSummary = "";
        let assistanceSummary = "";
        let difficultySummary = "";
        if (project.spec.template === "merge-2048") {
          const onboarding = await inspectMergeOnboardingInBrowser(root);
          qualityChecks.push({
            id: "ONBOARDING-MERGE-2048",
            label: "新存档真实完成滑动与合并教学",
            status: "passed",
            evidence: `错误方向未推进；真实信号 ${onboarding.acceptedSignals.map(({ signal }) => signal).join(" → ")}；刷新恢复、重看和跳过均通过。`,
          });
          onboardingSummary = "新存档教学同时通过真实动作、错误动作拒绝、持久化、重看与跳过门禁；";
        }
        if (project.spec.template === "signal-hunt") {
          const onboarding = await inspectSignalHuntOnboardingInBrowser(root);
          qualityChecks.push({
            id: "ONBOARDING-SIGNAL-HUNT",
            label: "首次捕获前安全等待并由真实点击恢复压力",
            status: "passed",
            evidence: `真实信号 ${onboarding.acceptedSignals.map(({ signal }) => signal).join(" → ")}；倒计时教学期暂停、完成后恢复，刷新恢复、重看和跳过均通过。`,
          });
          onboardingSummary = "通用信号捕获已通过安全等待、真实点击、压力恢复、持久化、重看与跳过门禁；";
        }
        if (realtimeOnboardingTemplates.includes(project.spec.template as TemplateOnboardingQualityResult["template"])) {
          const onboarding = await inspectTemplateOnboardingInBrowser(root, project.spec.template as TemplateOnboardingQualityResult["template"]);
          qualityChecks.push({
            id: `ONBOARDING-${project.spec.template.toUpperCase()}`,
            label: "首次操作前冻结自动压力并由真实操作完成教学",
            status: "passed",
            evidence: `真实信号 ${onboarding.acceptedSignals.map(({ signal }) => signal).join(" → ")}；安全等待、刷新恢复、重看和跳过均通过。`,
          });
          onboardingSummary = "实时模板已通过安全等待、真实操作、持久化、重看与跳过教学门禁；";
        }
        if (nonRealtimeOnboardingTemplates.includes(project.spec.template as NonRealtimeOnboardingTemplate)) {
          const onboarding = await inspectNonRealtimeOnboardingInBrowser(root, project.spec.template as NonRealtimeOnboardingTemplate);
          qualityChecks.push({
            id: `ONBOARDING-${project.spec.template.toUpperCase()}`,
            label: "无操作压力下由真实合法动作完成教学",
            status: "passed",
            evidence: `真实信号 ${onboarding.acceptedSignals.map(({ signal }) => signal).join(" → ")}；安全等待、刷新恢复、重看和跳过均通过。`,
          });
          onboardingSummary = "非实时模板已通过安全等待、真实合法操作、持久化、重看与跳过教学门禁；";
        }
        if (variationRehearsalTemplates.includes(project.spec.template as VariationRehearsalTemplate)) {
          const variation = await inspectVariationRehearsalInBrowser(root, project.spec.template as VariationRehearsalTemplate);
          qualityChecks.push({
            id: "CONTENT-VARIATION-REHEARSAL",
            label: "教学机制在变化关卡中仍由真实玩法成立",
            status: "passed",
            evidence: `第 ${variation.sourceLevel} 关“${variation.sourceModifier}”→第 ${variation.rehearsalLevel} 关“${variation.rehearsalModifier}”；真实复现 ${variation.expectedSignals.join(" → ")}。`,
          });
          variationSummary = `首关教学机制已在规则与压力变化后的第 ${variation.rehearsalLevel} 关通过真实动作复验；`;
        }
        if (failureAssistanceTemplates.includes(project.spec.template as FailureAssistanceTemplate)) {
          const difficulty = await inspectDifficultyProgressionInBrowser(root, project.spec.template as FailureAssistanceTemplate);
          qualityChecks.push({
            id: "PROGRESSION-RUNTIME",
            label: "二十关倍率平滑且五阶段具有真实结构变化",
            status: "passed",
            evidence: `已采样 ${difficulty.levelsChecked} 关、核对 ${difficulty.beatTransitionsChecked} 个合同阶段转换；最大相邻倍率步长 ${difficulty.maximumMultiplierStep}，五个阶段运行时签名均不同。`,
          });
          difficultySummary = "二十关倍率平滑且五阶段结构变化已通过；";
          const assistance = await inspectFailureAssistanceInBrowser(root, project.spec.template as FailureAssistanceTemplate);
          qualityChecks.push({
            id: "ASSISTANCE-RUNTIME",
            label: "连续失败提供显式分层帮助且成功后清零",
            status: "passed",
            evidence: `第 1–4 次失败实际呈现 ${assistance.observedActions.join(" → ")}；刷新后保留第 ${assistance.persistedFailureCount} 次状态，成功后清零；未启用暗中调难度。`,
          });
          assistanceSummary = "连续失败的原因解释、规则突出、方向提示、刷新恢复和成功清零均已通过；";
        }
        if (project.spec.designContract && failureAssistanceTemplates.includes(project.spec.template as FailureAssistanceTemplate)) {
          qualityChecks.push(writeDesignAcceptanceReport(root, project.spec.designContract, qualityChecks));
        }
        return `页面公开：真实浏览器已检查 5 档画幅、开局、合法动作、结算分支、资源错误与控制台；${onboardingSummary}${variationSummary}${difficultySummary}${assistanceSummary}保存 ${browserResult.screenshotPaths.length} 张验收截图。成功构建将冻结为不可变版本，发布前不会覆盖稳定玩家网址。`;
      });
      const checkedAt = new Date().toISOString();
      signal.throwIfAborted();
      await this.repository.completeBuild(buildId, project.spec, {
        status: "passed",
        summary: `${qualityChecks.length}/${qualityChecks.length} 项自动验收通过，可以进入主美复核。`,
        checkedAt,
        checks: qualityChecks,
      });
    } catch (error) {
      if (signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        await this.repository.cancelBuild(buildId).catch(() => {});
      } else {
        console.error(`构建 ${buildId} 失败：`, error);
        const stage = (['planning', 'design', 'asset', 'code', 'validation', 'browser'][Math.min(sequence, 5)] ?? 'unknown') as Parameters<typeof safeFailure>[0];
        const details = error instanceof BuildFailure ? error.details : [safeFailure(stage, error)];
        const message = error instanceof BuildFailure ? error.message : details[0]!.message;
        await this.repository.failBuild(buildId, Math.min(sequence, 5), message, details);
      }
    }
  }

  private analyze(project: ProjectDetail, directions: string[] = []) {
    const mechanics = project.spec.mechanics.join("、");
    const visualStyle = visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
    const puzzleRules = project.spec.puzzleRules
      ? `；拼图规则：默认 ${project.spec.puzzleRules.pieceCount} 块、上限 ${project.spec.puzzleRules.maxPieceCount} 块、${project.spec.puzzleRules.startArrangement} 开局、吸附系数 ${project.spec.puzzleRules.snapTolerance}、底图透明度 ${project.spec.puzzleRules.guideOpacity}`
      : "";
    const source = project.spec.templateSource
      ? `；开源模板：${project.spec.templateSource.sourceName} / ${project.spec.templateSource.license} / ${project.spec.templateSource.integrationMode}`
      : "";
    const directionNote = directions.length ? `；已读取 ${directions.length} 条创作对话意见用于本次合同修订` : "";
    return `页面公开：${project.spec.template} / ${project.spec.difficulty} / ${visualStyle.label}风格 / ${project.spec.runtimeTarget} / ${project.spec.perspective} / 目标画幅 ${project.spec.aspectRatio} / 镜头 ${project.spec.cameraMode} / 输入 ${project.spec.inputModes.join("、")} / ${mechanics}；${project.spec.acceptanceCriteria.length} 条验收标准已排队${puzzleRules}${source}${directionNote}。`;
  }

  private async reuseSourceRuntime(project: ProjectDetail, root: string): Promise<string | null> {
    const sourceProjectId = project.spec.renovation?.sourceProjectId;
    if (!sourceProjectId) return null;
    const preferredBuildId = project.spec.renovation?.revisionPlan?.sourceVersionId;
    const recent = await this.repository.recentReusableBuilds(sourceProjectId, basename(root));
    const candidates = [...(preferredBuildId ? [{ id: preferredBuildId }] : []), ...recent.filter((candidate) => candidate.id !== preferredBuildId)];
    for (const candidate of candidates) {
      const sourceRoot = join(this.artifactRoot, candidate.id);
      const indexPath = join(sourceRoot, "index.html");
      if (!existsSync(indexPath)) continue;
      for (const filename of ["index.html", "styles.css", "app.js", "game-manifest.json"]) {
        const sourcePath = join(sourceRoot, filename);
        if (!existsSync(sourcePath)) continue;
        const content = readFileSync(sourcePath, "utf8");
        if (/(?:src|href)\s*=\s*["']\/(?:play|version)\/|url\(\s*["']?\/(?:play|version)\//i.test(content)) return null;
        writeFileSync(join(root, filename), content, "utf8");
      }
      const sourceAssets = join(sourceRoot, "assets");
      if (existsSync(sourceAssets)) cpSync(sourceAssets, join(root, "assets"), { recursive: true });
      return candidate.id;
    }
    return null;
  }

  /**
   * 实验通道:生成/迭代代码→写产物→真实浏览器契约验收→规则正确性审计。
   * 上一版产物存在时走迭代模式(带旧代码与意见,增量修改);
   * 契约失败或规则未实现都会把原因喂回模型再生成一轮;两轮后契约仍失败则构建失败,
   * 规则仍有未实现的如实记录到 RULE_FIDELITY.json,不静默美化。
   */
  private async generateExperimentalGame(project: ProjectDetail, root: string, directions: string[], report: (detail: string, excerpt?: string | null) => Promise<void> = async () => {}) {
    const generator = this.options.codeGenerator;
    if (!generator) throw new Error("实验通道未启用：服务端没有配置玩法代码生成器。");
    let previous: PreviousGeneration | null = null;
    let reusable: GeneratedGame | null = null;
    let reusableSourceBuildId: string | null = null;
    let localRepair = false;
    const reusableCandidates: Array<{ generation: GeneratedGame; buildId: string }> = [];
    const reusableProjectIds = [...new Set([project.id, project.spec.renovation?.sourceProjectId].filter(Boolean))] as string[];
    const preferredBuildId = project.spec.renovation?.revisionPlan?.sourceVersionId;
    const recentCandidates = (await Promise.all(reusableProjectIds.map(projectId => this.repository.recentReusableBuilds(projectId, basename(root))))).flat();
    const candidates = [...(preferredBuildId ? [{ id: preferredBuildId }] : []), ...recentCandidates.filter((candidate) => candidate.id !== preferredBuildId)];
    for (const candidate of candidates) {
      const html = readGeneratedSource(join(this.artifactRoot, candidate.id));
      if (!html) continue;
      const priorBuild = await this.repository.buildById(candidate.id);
      previous ??= { html, directions: [...directions, ...(priorBuild.error ? [`上一版验收问题：${priorBuild.error}`] : []), "保留已实现玩法；以本次确认方案为准修正，并删除旧版教学覆盖层、教学进度与教学钩子。"] };
      if (directions.length === 0 && project.spec.designContract) {
        try {
          const previousContract = JSON.parse(readFileSync(join(this.artifactRoot, candidate.id, "_studio", "GAME_DESIGN_CONTRACT.json"), "utf8"));
          const metadata = JSON.parse(readFileSync(join(this.artifactRoot, candidate.id, "_studio", "GENERATED_CODE.json"), "utf8"));
          if (JSON.stringify(stripTutorialContract(previousContract)) === JSON.stringify(stripTutorialContract(project.spec.designContract))) {
            reusableCandidates.push({
              generation: { html, designNotes: `复用构建 ${candidate.id} 的代码并重新验收。${typeof metadata.designNotes === "string" ? metadata.designNotes : ""}`, rounds: Number.isInteger(metadata.rounds) ? metadata.rounds : 1, ...(typeof metadata.model === "string" ? { model: metadata.model } : {}) },
              buildId: candidate.id,
            });
          }
        } catch { /* Missing or obsolete metadata requires normal targeted generation. */ }
      }
    }
    const registeredRepair = directions.length === 0 && !project.spec.renovation
      ? inspectLocalRepairCandidate(join(dirname(this.artifactRoot), "local-repair-candidates"), project)
      : { status: "absent" as const };
    if (registeredRepair.status === "invalid") throw new Error(`服务器本地修复候选登记无效，已停止且不会回退代码生成模型：${registeredRepair.reason}`);
    if (registeredRepair.status === "ready") {
      reusable = { html: registeredRepair.html, designNotes: `服务器登记的本地修复候选 ${registeredRepair.descriptor.registeredAt}；仍需完整验收。`, rounds: 0, model: "local-repair" };
      localRepair = true;
      await report("已读取与当前项目及合同哈希匹配的服务器本地修复候选；只验收，不调用代码生成模型");
    } else {
      const firstReusable = reusableCandidates.shift();
      if (firstReusable) ({ generation: reusable, buildId: reusableSourceBuildId } = firstReusable);
    }
    if (previous) await report("已恢复上一版完整游戏代码，将针对已发现问题修正，不从头制作");
    if (!previous) {
      const html = readGeneratedSource(join(this.artifactRoot, project.version.id));
      if (html) previous = { html, directions };
    }
    let feedback: string[] = [];
    const initialReport = (detail: string, excerpt?: string | null) => report(`${previous ? "第 1 次制作 · 沿用已有版本修改" : "第 1 次制作 · 初次生成"}：${detail}`, excerpt);
    const repairReport = (round: number) => (detail: string, excerpt?: string | null) => report(`第 ${round} 次制作 · 针对验收问题修正：${detail}`, excerpt);
    const maxRounds = this.maxRepairRounds;
    const requestBudget = new GenerationBudget(maxRounds * REQUESTS_PER_ROUND);
    const recordAttempt = (round: number, phase: string, reasons: string[]) => {
      if (!existsSync(root)) return;
      mkdirSync(join(root, "_studio"), { recursive: true });
      appendFileSync(join(root, "_studio", "GENERATION_ATTEMPTS.jsonl"), JSON.stringify({
        recordedAt: new Date().toISOString(), round, phase, reasons,
      }) + "\n", "utf8");
    };
    if (reusable) await report("确认方案未变，先重新验收已有代码；通过则不再调用代码生成模型");
    let generation = reusable ?? await generator.generate(project, feedback, previous, initialReport, requestBudget);
    writeGeneratedArtifact(root, project, generation);
    for (let round = 1; ; round += 1) {
      try {
        // 代码阶段只检查结构、运行时与 AI 背景接入声明；真实位图和溯源在下一资产阶段落盘后统一验收。
        await report(`第 ${round} 次制作：正在检查生成产物与运行契约`);
        inspectGeneratedArtifact(root, { requireAiArt: false, expectedCampaign: project.spec.designProfile.generatedCampaign ?? null, expectedBlueprint: project.spec.designProfile.generatedBlueprint ?? null });
        if (this.options.browserAudit !== false) {
          await report(`第 ${round} 次制作：正在真实浏览器中检查操作、关卡与结算`);
          await inspectGeneratedGameInBrowser(root, {
            expectedCampaign: project.spec.designProfile.generatedCampaign ?? null,
            expectedBlueprint: project.spec.designProfile.generatedBlueprint ?? null,
            onProgress: message => report(`第 ${round} 次制作：${message}`),
          });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        recordAttempt(round, error instanceof ArtifactValidationFailure ? "artifact-rejected" : "infrastructure-error", [reason]);
        if (!(error instanceof ArtifactValidationFailure)) throw new Error(`验收服务未能完成检查，已停止自动付费修复：${reason}`);
        if (localRepair) throw new Error(`服务器本地修复候选未通过现行产物或浏览器验收，已停止且未调用代码生成模型：${reason}`);
        const nextReusable = reusableCandidates.shift();
        if (nextReusable) {
          const rejectedBuildId = reusableSourceBuildId;
          generation = nextReusable.generation;
          reusable = nextReusable.generation;
          reusableSourceBuildId = nextReusable.buildId;
          await report(`候选 ${rejectedBuildId ?? "上一版"} 未通过现行验收，改验同项目候选 ${nextReusable.buildId}，不调用代码生成模型`);
          writeGeneratedArtifact(root, project, generation);
          round -= 1;
          continue;
        }
        // 质量问题不是停下的理由：带着验收原因继续修，直到通过或达到本次制作的消耗上限。
        if (round >= maxRounds) throw new Error(`连续 ${round} 轮生成代码均未通过产物契约验收，已达本次制作的修正上限，停止以免无限消耗：${reason}`);
        await report(`第 ${round} 次验收发现问题，正在进行第 ${round + 1} 次针对性修复（最多 ${maxRounds} 次）`);
        generation = await generator.generate(project, [reason], { html: generation.html, directions: [...directions, reason] }, repairReport(round + 1), requestBudget);
        writeGeneratedArtifact(root, project, generation);
        continue;
      }
      if (this.options.browserAudit === false) return { generation, audit: null, iterated: previous !== null };
      const ruleCount = safeContractRules(project.spec.designProfile)?.length;
      await report(`第 ${round} 次制作：正在逐条核对${ruleCount ? ` ${ruleCount} 条` : ""}方案规则是否在代码中实现（模型审核，通常需要 1–3 分钟）`);
      // 复用代码且规则清单未变时，同一份源码的已通过审核回执可以复用；审核模型只在代码或规则变化时付费调用。
      const rules = this.options.designContracts ? safeContractRules(project.spec.designProfile) : null;
      const auditSource = deliveredRuleAuditSource(root, generation.html);
      const reusedAudit = reusable && round === 1 && reusableSourceBuildId && rules && generation.html === reusable.html
        ? readReusableRuleAudit(join(this.artifactRoot, reusableSourceBuildId), { rules, sourceSha256: sha256(auditSource) })
        : null;
      const reusedAuditFrom = reusedAudit ? reusableSourceBuildId : null;
      if (reusedAudit) await report(`代码与规则清单均与构建 ${reusedAuditFrom} 一致，复用其已通过的逐条规则审核，本次不调用审核模型`);
      const audit = reusedAudit ?? (this.options.designContracts
        ? await this.options.designContracts.auditRuleFidelity(project.spec.designProfile, auditSource)
        : null);
      const missing = audit?.filter((verdict) => !verdict.implemented) ?? [];
      recordAttempt(round, reusedAudit ? "rule-audit-reused" : audit ? "rule-audit" : "rule-audit-unavailable", reusedAudit ? [`复用构建 ${reusedAuditFrom} 的规则审核`] : missing.map(verdict => `${verdict.rule}：${verdict.evidence}`));
      if (this.options.designContracts && (!audit || !audit.length)) throw new Error("规则审核未返回完整结果，已保留代码并停止后续生图及交付；不会因审核服务故障自动重新生成代码。");
      if (localRepair && missing.length) throw new Error(`服务器本地修复候选规则审核仍有 ${missing.length} 项未落实，已停止且未调用代码生成模型：${missing.map(item => item.rule).join("；")}`);
      if (missing.length > 0 && round < maxRounds) {
        feedback = missing.map((verdict) => `规则审计判定未实现:${verdict.rule}——${verdict.evidence}`);
        await report(`规则审核发现 ${missing.length} 项待修复，正在进行第 ${round + 1} 次针对性修复（最多 ${maxRounds} 次）`);
        generation = await generator.generate(project, feedback, { html: generation.html, directions: [...directions, ...feedback] }, repairReport(round + 1), requestBudget);
        writeGeneratedArtifact(root, project, generation);
        continue;
      }
      if (audit) {
        // 记录被审核源码的可复原哈希；后续同项目复用同一份代码时可据此复用通过的审核，不能复用未通过或不完整的审核。
        writeRuleFidelity(root, { verdicts: audit, sourceSha256: sha256(auditSource), ...(reusedAuditFrom ? { reusedFromBuildId: reusedAuditFrom } : {}) });
      }
      if (missing.length) throw new Error(`${round} 轮修正后规则审核仍有 ${missing.length} 项未落实，已达本次制作的修正上限，停止后续生图及交付：${missing.map(item => item.rule).join("；")}`);
      return { generation, audit, iterated: previous !== null, auditReusedFrom: reusedAuditFrom };
    }
  }

  private async normalizeProject(project: ProjectDetail, directions: string[] = [], revisionScope: RenovationScope | null = null, revisionRequest: string | null = null): Promise<ProjectDetail> {
    const migrateAesthetic = project.spec.presentationVersion < 4;
    // 有创作对话意见且 LLM 可用时,重建前基于意见修订设计合同(对话式重建);
    // 否则:LLM 定制的设计合同是创建时的用户可见承诺,重建规范化时必须原样保留,
    // 模板静态设计则重新生成,以便老项目吃到蓝图修订。
    const revisedDesign = directions.length > 0 && this.options.designContracts
      ? await this.options.designContracts.generate(
          {
            idea: revisionRequest ?? project.idea,
            template: project.spec.template,
            difficulty: project.spec.difficulty,
            confirmedDesignProfile: project.spec.designProfile,
            ...(revisionScope ? { revisionScope, sourceProjectId: project.id } : {}),
          },
          project.spec.ideaAnalysis ?? null,
          directions,
        )
      : null;
    if (directions.length && this.options.designContracts && !revisedDesign) throw new Error("修改方案未能完成，原版本保持不变；本次没有继续生成代码或图片。");
    const preservedDesign = project.spec.designSource === "llm" ? project.spec.designProfile : null;
    const baseSpec = generateGameSpec({
        title: project.title,
        idea: project.idea,
        dimensions: project.dimensions,
        template: project.spec.template,
        artStyle: migrateAesthetic ? recommendedArtStyle(project.spec.template) : project.spec.artStyle,
        visualStyle: migrateAesthetic ? recommendedModernVisualStyle(project.spec.template) : project.spec.visualStyle,
        difficulty: project.spec.difficulty,
        aspectRatio: project.spec.presentationVersion < 2 ? "9:16" : project.spec.aspectRatio,
        cameraMode: project.spec.presentationVersion < 5 ? "auto" : project.spec.cameraMode,
        inputModes: project.spec.template === "merge-2048" || project.spec.template === "klotski" || project.spec.presentationVersion < 5 ? undefined : project.spec.inputModes,
        puzzlePieceCount: project.spec.puzzleRules?.pieceCount,
        customImageDataUrl: project.spec.customImageDataUrl ?? undefined,
        spriteAnimation: project.spec.spriteAnimation,
      }, project.spec.ideaAnalysis ?? null, revisedDesign ?? preservedDesign, project.spec.designKnowledge ?? null);
    const resourcePlanning = this.options.resourceFamilies ? createResourcePlanningForGameSpec(baseSpec, this.options.resourceFamilies) : project.spec.resourcePlanning ?? null;
    const normalizedSpec = {
      ...baseSpec,
      resourcePlanning,
      renovation: revisionScope && revisionRequest
        ? { sourceProjectId: project.id, revisionScope, request: revisionRequest, revisionPlan: project.spec.renovation?.revisionPlan ?? null, assetTarget: null }
        : project.spec.renovation,
    };
    const designContract = createGameDesignContractForLegacyProject({
      projectId: project.id,
      title: project.title,
      idea: project.idea,
      createdAt: project.createdAt,
      spec: normalizedSpec,
      designKnowledge: normalizedSpec.designKnowledge,
    });
    return {
      ...project,
      spec: { ...normalizedSpec, designContract },
    };
  }
}
