import { heuristicIdeaAnalysis, ideaAnalysisSchema, projectInputSchema, type GameDesignProfile, type IdeaAnalysis, type ProjectDetail, type ProjectInput } from "../shared/contracts.js";
import { constrainRenovationProfile } from "../shared/renovation-scope.js";
import { validateRevisionPlan } from "./revision-planner.js";

type Dependencies = {
  analyze: (input: ProjectInput) => Promise<IdeaAnalysis>;
  generate: (input: ProjectInput, analysis: IdeaAnalysis) => Promise<GameDesignProfile | null>;
};

export async function prepareRenovationInput(rawInput: ProjectInput, findProject: (id: string) => Promise<ProjectDetail | null>) {
  const input = projectInputSchema.parse(rawInput);
  if (!input.sourceProjectId) return input;
  const revision = Boolean(input.revisionScope || input.revisionPlan);
  const referenceReplica = input.creationMode === "reference-replica";
  if (!revision && !referenceReplica) return input;
  const source = await findProject(input.sourceProjectId);
  if (!source) throw new Error("找不到要改造的来源游戏，已停止制作；没有按新游戏继续生成。");
  if (!revision) {
    return projectInputSchema.parse({
      ...input,
      // The source repository is authoritative. A client-supplied profile must
      // never manufacture "observed" reference facts for a source project.
      confirmedDesignProfile: source.spec.designProfile,
    });
  }
  const revisionPlan = input.revisionPlan ? validateRevisionPlan(source, input.revisionPlan, input.revisionPlan.content) : null;
  const revisionScope = input.revisionScope
    ?? (revisionPlan!.operations.some((operation) => operation.scope === "gameplay")
      ? "gameplay"
      : revisionPlan!.operations.some((operation) => operation.scope === "assets") ? "assets" : "visual-style");
  return projectInputSchema.parse({
    ...input,
    revisionScope,
    ...(revisionPlan ? { revisionPlan } : {}),
    template: source.spec.template,
    dimensions: source.dimensions,
    artStyle: source.spec.artStyle,
    visualStyle: source.spec.visualStyle,
    difficulty: source.spec.difficulty,
    aspectRatio: source.spec.aspectRatio,
    cameraMode: source.spec.cameraMode,
    inputModes: source.spec.inputModes,
    puzzlePieceCount: source.spec.puzzleRules?.pieceCount,
    customImageDataUrl: source.spec.customImageDataUrl ?? undefined,
    confirmedDesignProfile: input.confirmedDesignProfile
      ? constrainRenovationProfile(input.confirmedDesignProfile, source.spec.designProfile, revisionScope)
      : source.spec.designProfile,
  });
}

/** Confirmed profiles are production contracts, not prompts to rewrite again. */
export async function resolveCreationDesign(rawInput: ProjectInput, dependencies: Dependencies, report: (title: string) => Promise<void> = async () => {}) {
  const parsed = projectInputSchema.parse(rawInput);
  if (parsed.confirmedDesignProfile) {
    const input = { ...parsed, template: parsed.template === "auto" ? "generated" as const : parsed.template };
    const profile = parsed.confirmedDesignProfile;
    // Local dimensional inference is allowed; keyword mechanics must not override
    // the actual actions the user has already reviewed and confirmed.
    const analysis = ideaAnalysisSchema.parse({
      ...heuristicIdeaAnalysis(input),
      mechanics: profile.coreLoop.map(action => action.trim().slice(0, 40)).filter(Boolean),
      summary: profile.playerFantasy.trim().slice(0, 280),
      hardConstraints: [
        `结束条件：${profile.winCondition}`,
        `失败规则：${profile.failCondition}`,
        `单局节奏：${profile.sessionLength}`,
        ...profile.progression,
        ...profile.difficultyCurve,
        ...profile.accessibility,
      ].map(rule => rule.trim().slice(0, 120)).filter(Boolean).slice(0, 10),
    });
    await report("已读取并复用你确认的游戏方案，无需再次生成策划");
    return { input, analysis, designProfile: profile };
  }
  await report("正在解析玩法与操作要求");
  const analysis = await dependencies.analyze(parsed);
  const experimental = analysis.source === "llm" && analysis.template === null;
  const input = experimental
    ? { ...parsed, template: "generated" as const, dimensions: analysis.dimensions ?? "2d" as const }
    : parsed;
  await report("正在细化游戏方案与关卡规则");
  const designProfile = await dependencies.generate(input, analysis);
  if (!designProfile) throw new Error("游戏策划未能完成，已停止制作；不会使用固定方案替代。请检查模型设置后再试。");
  return { input, analysis, designProfile };
}
