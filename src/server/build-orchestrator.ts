import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  generateGameSpec,
  recommendedArtStyle,
  recommendedModernVisualStyle,
  visualStyleOptions,
  type Build,
  type ProjectDetail,
  type QualityCheck,
} from "../shared/contracts.js";
import { inspectGameInBrowser, inspectGeneratedGameInBrowser } from "./browser-quality.js";
import type { DesignContractGenerator } from "./design-contract.js";
import { inspectGameArtifact, writeDesignDocuments, writeGameArtifact } from "./game-artifact.js";
import { inspectGeneratedArtifact, stripPlatformSegments, writeGeneratedArtifact, type GameCodeGenerator, type PreviousGeneration } from "./game-generator.js";
import type { CoverArtGenerator } from "./image-generator.js";
import type { StudioRepository } from "./studio-repository.js";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export class BuildOrchestrator {
  private readonly pendingBuildIds: string[] = [];
  private readonly enqueuedBuildIds = new Set<string>();
  private activeBuildCount = 0;
  private readonly maxConcurrentBuilds: number;

  constructor(
    private readonly repository: StudioRepository,
    private readonly artifactRoot: string,
    private readonly options: {
      browserAudit?: boolean;
      designContracts?: DesignContractGenerator;
      coverArt?: CoverArtGenerator;
      codeGenerator?: GameCodeGenerator;
      maxConcurrentBuilds?: number;
    } = {},
  ) {
    this.maxConcurrentBuilds = Math.max(1, options.maxConcurrentBuilds ?? 2);
  }

  async start(projectId: string): Promise<Build> {
    const build = await this.repository.createBuild(projectId);
    if (build.status === "queued" && !this.enqueuedBuildIds.has(build.id)) {
      this.enqueuedBuildIds.add(build.id);
      this.pendingBuildIds.push(build.id);
      setTimeout(() => void this.drainQueue(), 20);
    }
    return build;
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
    try {
      await this.repository.markBuildRunning(buildId);
      const build = await this.repository.buildById(buildId);
      const storedProject = await this.repository.get(build.projectId);
      if (!storedProject) throw new Error("项目不存在。");
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
        if (project.spec.template === "generated") {
          const experimental = await this.generateExperimentalGame(project, root, directions);
          const modeNote = experimental.iterated
            ? `基于上一版代码迭代修改（${directions.length} 条对话意见）`
            : "全新生成";
          const auditNote = experimental.audit
            ? `；规则审计 ${experimental.audit.filter((verdict) => verdict.implemented).length}/${experimental.audit.length} 条经代码核对已实现，逐条判定见 RULE_FIDELITY.json`
            : "；规则审计本次不可用，未逐条核对（如实记录）";
          const runtimeNote = project.spec.runtimeTarget === "web-3d" ? "基于本地 three.js 模块的 3D " : "";
          return `页面公开：实验通道——已由 gpt-5.6 按设计合同${modeNote}独有${runtimeNote}单文件代码（${experimental.generation.rounds} 轮生成，安全扫描通过，禁网络/禁外链/禁存储偷渡）${auditNote}。实现说明与哈希归档于 GENERATED_CODE.json。`;
        }
        writeGameArtifact(root, project);
        const source = project.spec.templateSource;
        const runtime = project.spec.runtimeTarget === "web-3d"
          ? "已写入 Three.js WebGL 2 场景、第三人称移动、碰撞、收集目标、出口结算与移动端方向控制"
          : `已按 ${project.spec.template} 模板写入独立玩法逻辑、移动端控制`;
        return `页面公开：${runtime}、资源清单与视听资产。${source ? `代码来源：${source.sourceName} / ${source.license} / ${source.integrationMode}；没有复制上游视听资产。` : ""}`;
      });
      sequence += 1;
      await this.step(buildId, sequence, async () => {
        const style = visualStyleOptions.find((option) => option.id === project.spec.visualStyle)!;
        let coverNote = "";
        if (this.options.coverArt) {
          const skipCover = project.spec.template === "puzzle" && Boolean(project.spec.customImageDataUrl);
          // 封面与动态美术(局内背景+角色位图)全部并行生成,墙钟时间等于最慢一张。
          const [cover, dynamicArt] = await Promise.all([
            skipCover ? Promise.resolve(null) : this.options.coverArt.generate(project),
            this.options.coverArt.generateDynamicArt(project),
          ]);
          if (cover) {
            writeFileSync(join(root, "assets", "cover.png"), cover);
            coverNote = "主视觉封面已由 gpt-image-2 按本作创意实时生成并替换模板预设；";
          } else if (!skipCover) {
            coverNote = "生图模型不可用或生成失败，本版保留模板预设主视觉；";
          }
          for (const entry of dynamicArt) {
            const target = join(root, entry.file);
            mkdirSync(dirname(target), { recursive: true });
            writeFileSync(target, entry.bytes);
          }
          if (dynamicArt.length > 0) {
            const provenanceRoot = join(root, "_studio");
            mkdirSync(provenanceRoot, { recursive: true });
            writeFileSync(join(provenanceRoot, "DYNAMIC_ART.json"), JSON.stringify({
              schemaVersion: 1,
              model: "gpt-image-2",
              generatedAt: new Date().toISOString(),
              entries: dynamicArt.map((entry) => ({ file: entry.file, role: entry.role, bytes: entry.bytes.length, prompt: entry.prompt })),
            }, null, 2), "utf8");
            coverNote += `${dynamicArt.map((entry) => entry.role).join("、")}已按本作题材动态生成并替换模板预设，提示词归档于 DYNAMIC_ART.json；`;
          }
        }
        return `页面公开：${coverNote}${style.label}视觉系统已应用到页面编排、组件造型、字体层级、${style.detailLabel}、画布细节和反馈动效；采用${style.layout}，不是单纯换配色。${project.spec.artStyle} 主视觉与 4 个程序化 WAV 已集成，来源和哈希已写入清单。${project.spec.template === "puzzle" ? `拼图支持创作时图片和试玩时图片替换；默认 ${project.spec.puzzleRules?.pieceCount} 块、上限 50 块，开局外围排布。` : ""}`;
      });
      sequence += 1;
      await this.step(buildId, sequence, () => {
        passedProbes = project.spec.template === "generated" ? inspectGeneratedArtifact(root) : inspectGameArtifact(root);
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
          const generatedResult = await inspectGeneratedGameInBrowser(root);
          qualityChecks.push(...generatedResult.checks);
          return `页面公开：真实浏览器已按运行时契约验证生成代码——idle→开始→playing→won→重开→lost 完整状态环、3 档画幅布局与错误监听；保存 ${generatedResult.screenshotPaths.length} 张验收截图。实验性作品：通过自动验收，但玩法深度仍以真人试玩为准。`;
        }
        const browserResult = await inspectGameInBrowser(root);
        qualityChecks.push(...browserResult.checks);
        return `页面公开：真实浏览器已检查 5 档画幅、开局、合法动作、结算分支、资源错误与控制台；保存 ${browserResult.screenshotPaths.length} 张验收截图。成功构建将冻结为不可变版本，发布前不会覆盖稳定玩家网址。`;
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
  private async generateExperimentalGame(project: ProjectDetail, root: string, directions: string[]) {
    const generator = this.options.codeGenerator;
    if (!generator) throw new Error("实验通道未启用：服务端没有配置玩法代码生成器。");
    const previousIndexPath = join(this.artifactRoot, project.version.id, "index.html");
    const previous: PreviousGeneration | null = existsSync(previousIndexPath)
      ? { html: stripPlatformSegments(readFileSync(previousIndexPath, "utf8")), directions }
      : null;
    let feedback: string[] = [];
    let generation = await generator.generate(project, feedback, previous);
    writeGeneratedArtifact(root, project, generation);
    if (this.options.browserAudit === false) return { generation, audit: null, iterated: previous !== null };
    for (let round = 1; ; round += 1) {
      try {
        await inspectGeneratedGameInBrowser(root);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        if (round >= 2) throw new Error(`生成代码两轮均未通过浏览器契约验收：${reason}`);
        generation = await generator.generate(project, [reason], previous);
        writeGeneratedArtifact(root, project, generation);
        continue;
      }
      const audit = this.options.designContracts
        ? await this.options.designContracts.auditRuleFidelity(project.spec.designProfile, generation.html)
        : null;
      const missing = audit?.filter((verdict) => !verdict.implemented) ?? [];
      if (missing.length > 0 && round < 2) {
        feedback = missing.map((verdict) => `规则审计判定未实现:${verdict.rule}——${verdict.evidence}`);
        generation = await generator.generate(project, feedback, previous);
        writeGeneratedArtifact(root, project, generation);
        continue;
      }
      if (audit) {
        writeFileSync(join(root, "_studio", "RULE_FIDELITY.json"), JSON.stringify({
          schemaVersion: 1,
          checkedAt: new Date().toISOString(),
          implemented: audit.filter((verdict) => verdict.implemented).length,
          total: audit.length,
          verdicts: audit,
        }, null, 2), "utf8");
      }
      return { generation, audit, iterated: previous !== null };
    }
  }

  private async normalizeProject(project: ProjectDetail, directions: string[] = []): Promise<ProjectDetail> {
    const migrateAesthetic = project.spec.presentationVersion < 4;
    // 有创作对话意见且 LLM 可用时,重建前基于意见修订设计合同(对话式重建);
    // 否则:LLM 定制的设计合同是创建时的用户可见承诺,重建规范化时必须原样保留,
    // 模板静态设计则重新生成,以便老项目吃到蓝图修订。
    const revisedDesign = directions.length > 0 && this.options.designContracts
      ? await this.options.designContracts.generate(
          { idea: project.idea, template: project.spec.template, difficulty: project.spec.difficulty },
          project.spec.ideaAnalysis ?? null,
          directions,
        )
      : null;
    const preservedDesign = project.spec.designSource === "llm" ? project.spec.designProfile : null;
    return {
      ...project,
      spec: generateGameSpec({
        title: project.title,
        idea: project.idea,
        dimensions: project.dimensions,
        template: project.spec.template,
        artStyle: migrateAesthetic ? recommendedArtStyle(project.spec.template) : project.spec.artStyle,
        visualStyle: migrateAesthetic ? recommendedModernVisualStyle(project.spec.template) : project.spec.visualStyle,
        difficulty: project.spec.difficulty,
        aspectRatio: project.spec.presentationVersion < 2 ? "9:16" : project.spec.aspectRatio,
        cameraMode: project.spec.presentationVersion < 5 ? "auto" : project.spec.cameraMode,
        inputModes: project.spec.presentationVersion < 5 ? undefined : project.spec.inputModes,
        puzzlePieceCount: project.spec.puzzleRules?.pieceCount,
        customImageDataUrl: project.spec.customImageDataUrl ?? undefined,
      }, project.spec.ideaAnalysis ?? null, revisedDesign ?? preservedDesign),
    };
  }
}
