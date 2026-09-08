import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import {
  generateGameSpec,
  recommendedArtStyle,
  recommendedModernVisualStyle,
  visualStyleOptions,
  type Build,
  type ProjectDetail,
  type QualityCheck,
} from "../shared/contracts.js";
import { inspectDifficultyProgressionInBrowser, inspectFailureAssistanceInBrowser, inspectGameInBrowser, inspectGeneratedGameInBrowser, inspectMergeOnboardingInBrowser, inspectNonRealtimeOnboardingInBrowser, inspectSignalHuntOnboardingInBrowser, inspectStageF3DInBrowser, inspectTemplateOnboardingInBrowser, inspectThreeOnboardingInBrowser, inspectVariationRehearsalInBrowser, type FailureAssistanceTemplate, type NonRealtimeOnboardingTemplate, type StageF3DMode, type TemplateOnboardingQualityResult, type VariationRehearsalTemplate } from "./browser-quality.js";
import { writeDesignAcceptanceReport } from "./design-acceptance.js";
import type { DesignContractGenerator } from "./design-contract.js";
import { inspectGameArtifact, writeDesignDocuments, writeGameArtifact } from "./game-artifact.js";
import { inspectGeneratedArtifact, writeGeneratedArtifact, type GameCodeGenerator, type GeneratedGame, type PreviousGeneration } from "./game-generator.js";
import { assertRasterAiArt } from "./art-policy.js";
import { coverPrompt, dynamicArtPlan, type DynamicArtEntry, type CoverArtGenerator } from "./image-generator.js";
import { getOrGenerateArtCheckpoint } from "./art-checkpoint.js";
import { applyQualifiedProjectResources, writeQualifiedResourceProvenance } from "./golden-resource-bindings.js";
import type { StudioRepository } from "./studio-repository.js";
import { writeV11BuildMetadata } from "./v11-build-metadata.js";
import { createResourcePlanningForGameSpec } from "../shared/resource-planning/index.js";
import { createGameDesignContractForLegacyProject } from "../shared/game-design-contract/from-legacy.js";
import { readGeneratedSource } from "./generated-source.js";
import { ArtifactValidationFailure, GenerationBudget } from "./generation-budget.js";
import { readReusableGeneratedArt } from "./generated-art-reuse.js";
import { blueprintSpriteFiles } from "../shared/generated-blueprint.js";
import { readReusableRuleAudit, safeContractRules, sha256, writeRuleFidelity } from "./rule-audit-checkpoint.js";

const variationRehearsalTemplates: readonly VariationRehearsalTemplate[] = ["signal-hunt", "tetris", "breakout", "snake", "space-shooter", "merge-2048", "klotski", "puzzle", "block-place", "polyomino-fit", "region-logic", "mahjong-roguelite"];
const failureAssistanceTemplates: readonly FailureAssistanceTemplate[] = ["tetris", "breakout", "snake", "space-shooter", ...variationRehearsalTemplates];
const realtimeOnboardingTemplates: readonly TemplateOnboardingQualityResult["template"][] = ["tetris", "breakout", "snake", "space-shooter"];
const nonRealtimeOnboardingTemplates: readonly NonRealtimeOnboardingTemplate[] = ["klotski", "puzzle", "block-place", "polyomino-fit", "region-logic", "mahjong-roguelite"];
import type { ResourceFamily } from "../shared/resource-library/index.js";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
/** 默认修正轮数：验收或审核没过就带原因再改，改到通过为止；6 轮仍不过视为巨大消耗，停止并交给用户决定。 */
export const DEFAULT_REPAIR_ROUNDS = 6;
/** 每一外层轮最多含 3 次安全子请求，请求预算据此推算，作为消耗硬上限。 */
const REQUESTS_PER_ROUND = 3;

export class BuildOrchestrator {
  private readonly pendingBuildIds: string[] = [];
  private readonly enqueuedBuildIds = new Set<string>();
  private activeBuildCount = 0;
  private readonly maxConcurrentBuilds: number;
  private readonly maxRepairRounds: number;

  constructor(
    private readonly repository: StudioRepository,
    private readonly artifactRoot: string,
    private readonly options: {
      browserAudit?: boolean;
      designContracts?: DesignContractGenerator;
      coverArt?: Pick<CoverArtGenerator, "generate" | "generateDynamicArt"> & { readonly model?: string };
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

  async start(projectId: string, revision?: { requestId: string; content: string }): Promise<Build> {
    const build = revision ? await this.repository.createBuild(projectId, revision) : await this.repository.createBuild(projectId);
    if (build.status === "queued") this.enqueue(build.id);
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
      setTimeout(() => void this.drainQueue(), 20);
    }
  }

  // 构建是重资源操作(真实浏览器验收),必须限制并发,其余任务排队等待空位。
  private drainQueue() {
    while (this.activeBuildCount < this.maxConcurrentBuilds && this.pendingBuildIds.length > 0) {
      const buildId = this.pendingBuildIds.shift()!;
      this.enqueuedBuildIds.delete(buildId);
      this.activeBuildCount += 1;
      void this.run(buildId).finally(() => {
        this.activeBuildCount -= 1;
        this.drainQueue();
      });
    }
  }

  private async step(buildId: string, sequence: number, action: () => string | Promise<string>) {
    await this.repository.markStepRunning(buildId, sequence);
    await wait(260);
    const output = await action();
    await this.repository.completeStep(buildId, sequence, output);
  }

  private async run(buildId: string) {
    let sequence = 0;
    let passedProbes: string[] = [];
    let qualityChecks: QualityCheck[] = [];
    // 图片先于代码生成；结果留给代码步骤写入溯源并在模板资源之后回写。
    let artResult: {
      cover: Buffer;
      dynamicArt: DynamicArtEntry[];
      reusedArt: ReturnType<typeof readReusableGeneratedArt>;
      imageReceipts: Array<{ group: string; cacheHit: boolean; generatedAt: string }>;
    } | null = null;
    try {
      // A second process may have queued the same receipt. Only the database
      // claim winner may call models or write artifacts; losers do not fail it.
      if (!await this.repository.markBuildRunning(buildId)) return;
      const build = await this.repository.buildById(buildId);
      const storedProject = await this.repository.get(build.projectId);
      if (!storedProject) throw new Error("项目不存在。");
      if (storedProject.archivedAt) throw new Error("项目已归档，未继续制作或调用模型；恢复项目后可明确启动新任务。");
      const directions = (await this.repository.listMessages(build.projectId))
        .filter((message) => message.role === "user")
        .map((message) => message.content);
      const project = await this.normalizeProject(storedProject, directions);
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
        if (!this.options.coverArt) throw new Error("AI 生图服务未配置，构建已中断。请先配置 OpenAI API Key。");
        let reusedArt: ReturnType<typeof readReusableGeneratedArt> = null;
        if (project.spec.template === "generated") {
          for (const candidate of await this.repository.recentReusableBuilds(project.id, buildId)) {
            const prior = await this.repository.buildById(candidate.id);
            reusedArt = readReusableGeneratedArt(project, this.options.coverArt.model ?? "gpt-image-2", { root: join(this.artifactRoot, candidate.id), projectId: prior.projectId, buildId: prior.id, status: prior.status });
            if (reusedArt) break;
          }
        }
        await this.repository.reportStepProgress(buildId, sequence, reusedArt ? "图像要求未变，正在复用同项目已核验的封面与背景，不重复生图" : "正在并行生成封面与局内美术，完成后核查来源与实际接入");
        const imageReceipts: Array<{ group: string; cacheHit: boolean; generatedAt: string }> = [];
        const generateGroup = async (group: "cover" | "dynamic", plan: Array<Omit<DynamicArtEntry, "bytes">>, generate: () => Promise<DynamicArtEntry[]>) => {
          if (project.spec.template !== "generated") return generate();
          const receipt = await getOrGenerateArtCheckpoint(join(this.artifactRoot, "_image-checkpoints", project.id), {
            projectId: project.id, model: this.options.coverArt!.model ?? "gpt-image-2", runtimeTarget: project.spec.runtimeTarget,
            aspectRatio: project.spec.aspectRatio, group, plan,
          }, generate);
          imageReceipts.push({ group, cacheHit: receipt.cacheHit, generatedAt: receipt.generatedAt });
          await this.repository.reportStepProgress(buildId, sequence, `${group === "cover" ? "封面" : "局内图片"}${receipt.cacheHit ? "已恢复已保存的生成结果，无需再次生图" : receipt.entries.length ? "已生成并保存" : "未返回完整图片"}；正在汇总资源并检查接入`).catch(() => {});
          return receipt.entries;
        };
        const coverPlan = { file: "assets/cover.png", role: "封面", prompt: coverPrompt(project) };
        // Only identical, verified assets may be reused. Missing assets never become placeholders.
        const [cover, dynamicArt] = reusedArt ? [reusedArt.cover, reusedArt.dynamicArt] : await Promise.all([
          generateGroup("cover", [coverPlan], async () => {
            const bytes = await this.options.coverArt!.generate(project);
            return bytes ? [{ ...coverPlan, bytes }] : [];
          }).then(entries => entries[0]?.bytes ?? null),
          generateGroup("dynamic", dynamicArtPlan(project), () => this.options.coverArt!.generateDynamicArt(project)),
        ]);
        if (!cover) throw new Error("AI 封面生成失败，构建已中断；不会使用占位图替代。");
        const background = dynamicArt.find((entry) => entry.role === "局内背景" && entry.file === "assets/background.png");
        if (!background) throw new Error("AI 局内背景生成失败，构建已中断；不会使用程序图或 SVG 替代。");
        // 确认方案声明的局内主体必须全部真实生成；缺图不能用程序化图形或占位图顶替。
        const plannedSprites = blueprintSpriteFiles(project.spec.template === "generated" ? project.spec.designProfile.generatedBlueprint : null);
        const missingSprites = plannedSprites.filter(file => !dynamicArt.some(entry => entry.file === file));
        if (missingSprites.length) throw new Error(`确认方案要求的局内主体位图未全部生成（${missingSprites.join("、")}），构建已中断；不会用程序化图形或占位图替代。`);
        mkdirSync(join(root, "assets"), { recursive: true });
        writeFileSync(join(root, "assets", "cover.png"), cover);
        for (const entry of dynamicArt) {
          const target = join(root, entry.file);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, entry.bytes);
        }
        artResult = { cover, dynamicArt, reusedArt, imageReceipts };
        const planningSummary = resourcePlan ? `生成前已检索 ${resourcePlan.decisions.length} 个资源需求：${resourcePlan.summary.needsReview} 个候选待复核，${resourcePlan.summary.needsGeneration} 个需生成或补状态。` : "旧项目没有资源规划记录。";
        return `页面公开：${reusedArt ? "图像要求未变，已复用同项目核验过的位图，本次未再次生图；" : ""}封面、局内背景${plannedSprites.length ? `与 ${plannedSprites.length} 张局内主体位图（${plannedSprites.join("、")}）` : ""}均由 ${this.options.coverArt.model ?? 'gpt-image-2'} 在代码生成之前完成并落盘；${planningSummary}后续代码只能加载并绘制这些位图，不得程序化自绘主体。`;
      });
      sequence += 1;
      await this.step(buildId, sequence, async () => {
        const art = artResult;
        if (!art) throw new Error("资源步骤没有完成，未继续生成代码。");
        const codeSummary = await (async (): Promise<string> => {
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
            return `页面公开：实验通道——已由 ${experimental.generation.model ?? '所选文本模型'} 按设计合同${modeNote}独有${runtimeNote}单文件代码（${experimental.generation.rounds} 轮生成，安全扫描通过，禁网络/禁外链/禁存储偷渡）；新手教学逐项接入真实玩法动作，教学期自动压力暂停${auditNote}。实现说明与哈希归档于 GENERATED_CODE.json。`;
          }
          writeGameArtifact(root, project);
          const source = project.spec.templateSource;
          const runtime = project.spec.runtimeTarget === "web-3d"
            ? "已写入 Three.js WebGL 2 场景、第三人称移动、碰撞、收集目标、出口结算与移动端方向控制"
            : `已按 ${project.spec.template} 模板写入独立玩法逻辑、移动端控制`;
          return `页面公开：${runtime}、资源清单与视听资产。${source ? `代码来源：${source.sourceName} / ${source.license} / ${source.integrationMode}；没有复制上游视听资产。` : ""}`;
        })();
        // 模板资源可能与 AI 位图同名：先写代码产物，再回写 AI 位图，保证最终游戏用的是 AI 美术。
        mkdirSync(join(root, "assets"), { recursive: true });
        writeFileSync(join(root, "assets", "cover.png"), art.cover);
        for (const entry of art.dynamicArt) {
          const target = join(root, entry.file);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, entry.bytes);
        }
        const style = visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
        // 黄金模板在 AI 位图落盘后覆盖已核验的运行时槽位，确保最终游戏实际使用精选资源。
        // 被覆盖的槽位必须从 AI 清单剔除，避免错误声明素材来源。
        const curatedResources = applyQualifiedProjectResources(root, project);
        const curatedTargets = new Set(curatedResources?.assets.map(({ target }) => target.replaceAll("\\", "/").toLowerCase()) ?? []);
        const writtenDynamicArt = art.dynamicArt.filter(({ file }) => !curatedTargets.has(file.replaceAll("\\", "/").toLowerCase()));
        const provenanceRoot = join(root, "_studio");
        mkdirSync(provenanceRoot, { recursive: true });
        if (art.imageReceipts.length) writeFileSync(join(provenanceRoot, "IMAGE_GENERATION_RECEIPTS.json"), JSON.stringify(art.imageReceipts, null, 2), "utf8");
        const entries = [
          { file: "assets/cover.png", role: "封面", bytes: art.cover.length, prompt: coverPrompt(project) },
          ...writtenDynamicArt.map((entry) => ({ file: entry.file, role: entry.role, bytes: entry.bytes.length, prompt: entry.prompt })),
        ];
        writeFileSync(join(provenanceRoot, "DYNAMIC_ART.json"), art.reusedArt ? art.reusedArt.provenanceJson : JSON.stringify({
          schemaVersion: 2,
          model: this.options.coverArt?.model ?? "gpt-image-2",
          generatedAt: art.imageReceipts.length ? art.imageReceipts.map(item => item.generatedAt).sort().at(-1) : new Date().toISOString(),
          entries,
        }, null, 2), "utf8");
        if (art.reusedArt) writeFileSync(join(provenanceRoot, "ART_REUSE.json"), JSON.stringify({ sourceBuildId: art.reusedArt.sourceBuildId, reusedAt: new Date().toISOString(), reason: "同项目模型、提示词、运行时和画幅一致；文件完整性复验通过；本次未调用生图模型" }, null, 2), "utf8");
        if (curatedResources) writeQualifiedResourceProvenance(root, curatedResources);
        const visualSource = ["index.html", "styles.css", "app.js"]
          .map((file) => readFileSync(join(root, file), "utf8"))
          .join("\n");
        assertRasterAiArt(root, visualSource);
        const v11Project = writeV11BuildMetadata(root, project, { directions, previousRoot: join(this.artifactRoot, project.version.id) });
        const curatedFamilies = curatedResources ? [...new Set(curatedResources.bindings.map(({ familyId }) => familyId))].join("、") : "";
        const curatedSummary = curatedResources ? `；${curatedResources.assets.length} 个运行时槽位使用 ${curatedFamilies} 精选资源，许可、哈希、需求与配方证据已归档` : "";
        return `${codeSummary}${curatedSummary}；SVG 禁用门禁通过。${style.label}视觉系统已应用到页面编排、组件造型、字体层级、${style.detailLabel}、画布细节和反馈动效。1.1 工程清单已冻结（${v11Project.objects.length} 个对象、${v11Project.rules.length} 条规则）。`;
      });
      sequence += 1;
      await this.step(buildId, sequence, () => {
        passedProbes = project.spec.template === "generated" ? inspectGeneratedArtifact(root, { expectedCampaign: project.spec.designProfile.generatedCampaign ?? null, expectedBlueprint: project.spec.designProfile.generatedBlueprint ?? null }) : inspectGameArtifact(root);
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
          const generatedResult = await inspectGeneratedGameInBrowser(root, { expectedCampaign: project.spec.designProfile.generatedCampaign ?? null });
          qualityChecks.push(...generatedResult.checks);
          if (project.spec.designContract) qualityChecks.push(writeDesignAcceptanceReport(root, project.spec.designContract, qualityChecks));
          return `页面公开：真实浏览器已按运行时契约验证生成代码——教学安全等待、20 关平滑递进、第 9 关真实机制复演、连续失败显式帮助、完成状态恢复、重看和跳过均通过，同时验证 idle→开始→playing→won→重开→lost 完整状态环、3 档画幅布局与错误监听；保存 ${generatedResult.screenshotPaths.length} 张验收截图。实验性作品：通过自动验收，但玩法深度仍以真人试玩为准。`;
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
      await this.repository.completeBuild(buildId, project.spec, {
        status: "passed",
        summary: `${qualityChecks.length}/${qualityChecks.length} 项自动验收通过，可以进入主美复核。`,
        checkedAt,
        checks: qualityChecks,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "构建任务失败。";
      console.error(`构建 ${buildId} 失败：`, error);
      await this.repository.failBuild(buildId, Math.min(sequence, 5), message);
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
    const candidates = await this.repository.recentReusableBuilds(project.id, basename(root));
    for (const candidate of candidates) {
      const html = readGeneratedSource(join(this.artifactRoot, candidate.id));
      if (!html) continue;
      const priorBuild = await this.repository.buildById(candidate.id);
      previous = { html, directions: [...directions, ...(priorBuild.error ? [`上一版验收问题：${priorBuild.error}`] : []), "保留已实现玩法；以本次确认方案与教学合同为准修正，不保留旧占位教学。"] };
      if (directions.length === 0 && project.spec.designContract) {
        try {
          const previousContract = JSON.parse(readFileSync(join(this.artifactRoot, candidate.id, "_studio", "GAME_DESIGN_CONTRACT.json"), "utf8"));
          const metadata = JSON.parse(readFileSync(join(this.artifactRoot, candidate.id, "_studio", "GENERATED_CODE.json"), "utf8"));
          if (JSON.stringify(previousContract) === JSON.stringify(project.spec.designContract)) {
            reusable = { html, designNotes: `复用构建 ${candidate.id} 的代码并重新验收。${typeof metadata.designNotes === "string" ? metadata.designNotes : ""}`, rounds: Number.isInteger(metadata.rounds) ? metadata.rounds : 1, ...(typeof metadata.model === "string" ? { model: metadata.model } : {}) };
            reusableSourceBuildId = candidate.id;
          }
        } catch { /* Missing or obsolete metadata requires normal targeted generation. */ }
      }
      await report("已恢复上一版完整游戏代码，将针对已发现问题修正，不从头制作");
      break;
    }
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
          await report(`第 ${round} 次制作：正在真实浏览器中检查操作、教学、关卡与结算`);
          await inspectGeneratedGameInBrowser(root, {
            expectedCampaign: project.spec.designProfile.generatedCampaign ?? null,
            onProgress: message => report(`第 ${round} 次制作：${message}`),
          });
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        recordAttempt(round, error instanceof ArtifactValidationFailure ? "artifact-rejected" : "infrastructure-error", [reason]);
        if (!(error instanceof ArtifactValidationFailure)) throw new Error(`验收服务未能完成检查，已停止自动付费修复：${reason}`);
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
      const reusedAudit = reusable && round === 1 && reusableSourceBuildId && rules && generation.html === reusable.html
        ? readReusableRuleAudit(join(this.artifactRoot, reusableSourceBuildId), { rules, sourceSha256: sha256(generation.html) })
        : null;
      const reusedAuditFrom = reusedAudit ? reusableSourceBuildId : null;
      if (reusedAudit) await report(`代码与规则清单均与构建 ${reusedAuditFrom} 一致，复用其已通过的逐条规则审核，本次不调用审核模型`);
      const audit = reusedAudit ?? (this.options.designContracts
        ? await this.options.designContracts.auditRuleFidelity(project.spec.designProfile, generation.html)
        : null);
      const missing = audit?.filter((verdict) => !verdict.implemented) ?? [];
      recordAttempt(round, reusedAudit ? "rule-audit-reused" : audit ? "rule-audit" : "rule-audit-unavailable", reusedAudit ? [`复用构建 ${reusedAuditFrom} 的规则审核`] : missing.map(verdict => `${verdict.rule}：${verdict.evidence}`));
      if (this.options.designContracts && (!audit || !audit.length)) throw new Error("规则审核未返回完整结果，已保留代码并停止后续生图及交付；不会因审核服务故障自动重新生成代码。");
      if (missing.length > 0 && round < maxRounds) {
        feedback = missing.map((verdict) => `规则审计判定未实现:${verdict.rule}——${verdict.evidence}`);
        await report(`规则审核发现 ${missing.length} 项待修复，正在进行第 ${round + 1} 次针对性修复（最多 ${maxRounds} 次）`);
        generation = await generator.generate(project, feedback, { html: generation.html, directions: [...directions, ...feedback] }, repairReport(round + 1), requestBudget);
        writeGeneratedArtifact(root, project, generation);
        continue;
      }
      if (audit) {
        // 记录被审核源码的可复原哈希；后续同项目复用同一份代码时可据此复用通过的审核，不能复用未通过或不完整的审核。
        const reconstructed = existsSync(root) ? readGeneratedSource(root) : null;
        writeRuleFidelity(root, { verdicts: audit, ...(reconstructed ? { sourceSha256: sha256(reconstructed) } : {}), ...(reusedAuditFrom ? { reusedFromBuildId: reusedAuditFrom } : {}) });
      }
      if (missing.length) throw new Error(`${round} 轮修正后规则审核仍有 ${missing.length} 项未落实，已达本次制作的修正上限，停止后续生图及交付：${missing.map(item => item.rule).join("；")}`);
      return { generation, audit, iterated: previous !== null, auditReusedFrom: reusedAuditFrom };
    }
  }

  private async normalizeProject(project: ProjectDetail, directions: string[] = []): Promise<ProjectDetail> {
    const migrateAesthetic = project.spec.presentationVersion < 4;
    // 有创作对话意见且 LLM 可用时,重建前基于意见修订设计合同(对话式重建);
    // 否则:LLM 定制的设计合同是创建时的用户可见承诺,重建规范化时必须原样保留,
    // 模板静态设计则重新生成,以便老项目吃到蓝图修订。
    const revisedDesign = directions.length > 0 && this.options.designContracts
      ? await this.options.designContracts.generate(
          { idea: project.idea, template: project.spec.template, difficulty: project.spec.difficulty, confirmedDesignProfile: project.spec.designProfile },
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
      }, project.spec.ideaAnalysis ?? null, revisedDesign ?? preservedDesign, project.spec.designKnowledge ?? null);
    const resourcePlanning = this.options.resourceFamilies ? createResourcePlanningForGameSpec(baseSpec, this.options.resourceFamilies) : project.spec.resourcePlanning ?? null;
    const normalizedSpec = { ...baseSpec, resourcePlanning };
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
