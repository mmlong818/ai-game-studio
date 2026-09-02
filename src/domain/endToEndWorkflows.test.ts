import { unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { buildOpenSourceBundle } from "./delivery";
import {
  applyExperienceReview,
  applyViewportEvidence,
  passingViewportObservation,
} from "./experience";
import { runGameplayAcceptance } from "./gameplayAcceptance";
import { createProbe } from "./probe";
import {
  attachBuildResult,
  createChangeSet,
  createProject,
  finalizeChangeAndPublish,
} from "./project";
import { createBuild } from "./quality";
import { createReferenceDossier } from "./research";
import { generateRuntimeFiles } from "./runtimeGenerator";
import { updateSceneNode } from "./scene";
import { INITIAL_DRAFT } from "./storage";
import { withGeneratedAssets } from "../test/projectFixtures";
import type { StudioProject } from "./platformTypes";

async function completeWorkflow(projectInput: StudioProject): Promise<StudioProject> {
  let project = createChangeSet(projectInput, "完成一轮可发布修改", ["NODE-PLAYER"]);
  const changeId = project.changeSets.at(-1)!.id;
  const runtime = generateRuntimeFiles(project.spec);
  const buildResult = await createBuild(project, runtime["app.js"], changeId);
  project = attachBuildResult(project, changeId, buildResult);

  const gameplay = runGameplayAcceptance(project, buildResult.build, createProbe(project.spec));
  project = { ...project, assertions: gameplay.assertions, evidence: [...project.evidence, ...gameplay.evidence] };
  const viewport = applyViewportEvidence(
    project,
    buildResult.build,
    project.spec.qualityTargets.requiredViewports.map(passingViewportObservation),
  );
  project = { ...project, assertions: viewport.assertions, evidence: [...project.evidence, ...viewport.evidence] };
  const experience = applyExperienceReview(project, buildResult.build, {
    reviewerRoles: ["玩法设计", "界面体验"],
    understoodWithin30Seconds: true,
    coreLoopInFirstSession: true,
    meaningfulChoice: true,
    feedbackSupportsRules: true,
    failureIsFairAndExplained: true,
    wantsToRetry: true,
    desktopComfortable: true,
    mobileComfortable: true,
    delightSignals: project.spec.intent.designPillars.slice(0, 3),
    note: "端到端测试完成核心循环",
  });
  project = { ...project, assertions: experience.assertions, evidence: [...project.evidence, ...experience.evidence] };
  return finalizeChangeAndPublish(project, changeId, buildResult.build.id);
}

describe("two complete creation paths", () => {
  it("现有游戏改造：保持 2048 核心规则并完成发布与开源包", async () => {
    let project = createProject({
      ...INITIAL_DRAFT,
      selectedSuggestionIds: ["merge-2048-world", "merge-2048-content"],
      freeRequest: "改成森林果实世界并稍微加快节奏",
      changeLevel: "R1",
    });
    project = { ...project, scene: updateSceneNode(project.scene, "NODE-PLAYER", { size: { width: 14, height: 14 } }) };
    project = await withGeneratedAssets(project);
    project = await completeWorkflow(project);

    expect(project.spec.source.templateId).toBe("merge-2048");
    expect(project.spec.rules.map((rule) => rule.label)).toEqual([
      "一次输入推动全盘",
      "同值方块每步只合并一次",
      "有效移动后生成新块",
    ]);
    expect(project.assertions.every((item) => item.status === "passed")).toBe(true);
    expect(project.publishedBuildId).toBe(project.activeBuildId);

    const build = project.builds.find((item) => item.id === project.activeBuildId)!;
    const bytes = Object.fromEntries(build.assetPaths.map((path) => [path, new Uint8Array([137, 80, 78, 71])]));
    const bundle = buildOpenSourceBundle(project, build, bytes);
    expect(Object.keys(unzipSync(bundle.bytes))).toContain("_studio/QUALITY_REPORT.json");
  });

  it("全新游戏开发：虫虫攀枝研究、八条专属规则和多设备发布全部闭环", async () => {
    const brief = "Q 版小昆虫在树干上高速爬行，四向闪避树脂，用头部收集露珠并冲刺破障";
    let project = createProject({
      ...INITIAL_DRAFT,
      creationMode: "mechanic-composition",
      templateId: null,
      selectedSuggestionIds: [],
      newGameBrief: brief,
      selectedMechanicIds: ["lane-dodge", "collect-escape"],
      changeLevel: "R3",
      referenceDossier: createReferenceDossier(brief, ["lane-dodge", "collect-escape"]),
    });
    project = await withGeneratedAssets(project);
    project = await completeWorkflow(project);

    expect(project.spec.source.templateId).toBeNull();
    expect(project.spec.source.referenceDossierId).toMatch(/^REF-/);
    expect(project.spec.rules).toHaveLength(8);
    expect(project.spec.rules.map((rule) => rule.label)).toContain("只有头部触碰露珠才会获取");
    expect(project.spec.rules.map((rule) => rule.label)).toContain("背景树皮持续向下滚动形成速度感");
    expect(project.assertions.every((item) => item.status === "passed")).toBe(true);
    expect(project.changeSets.at(-1)?.status).toBe("completed");
  });
});
