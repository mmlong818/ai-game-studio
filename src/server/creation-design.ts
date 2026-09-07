import { heuristicIdeaAnalysis, ideaAnalysisSchema, projectInputSchema, type GameDesignProfile, type IdeaAnalysis, type ProjectInput } from "../shared/contracts.js";

type Dependencies = {
  analyze: (input: ProjectInput) => Promise<IdeaAnalysis>;
  generate: (input: ProjectInput, analysis: IdeaAnalysis) => Promise<GameDesignProfile | null>;
};

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
