import { describe, expect, it } from "vitest";
import {
  applyExperienceReview,
  applyViewportEvidence,
  passingViewportObservation,
  validateViewportObservation,
} from "./experience";
import { createBuild } from "./quality";
import { createProject } from "./project";
import { INITIAL_DRAFT } from "./storage";
import { recordQualityEvent, summarizeQualityEvents } from "./telemetry";
import { withGeneratedAssets } from "../test/projectFixtures";

describe("experience and quality data", () => {
  it("发现手机控件遮挡、触控目标过小和帧率问题", () => {
    const observation = {
      ...passingViewportObservation("360x640"),
      controlsObscurePlayfield: true,
      minimumTouchTargetPx: 32,
      averageFps: 42,
    };
    const errors = validateViewportObservation(observation);

    expect(errors.some((item) => item.includes("遮挡"))).toBe(true);
    expect(errors.some((item) => item.includes("44px"))).toBe(true);
    expect(errors.some((item) => item.includes("50 FPS"))).toBe(true);
  });

  it("五个参考视口全部通过后形成当前构建证据", async () => {
    const project = await withGeneratedAssets(createProject({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] }));
    const buildResult = await createBuild(project, "runtime");
    const result = applyViewportEvidence(
      { ...project, assertions: buildResult.assertions },
      buildResult.build,
      project.spec.qualityTargets.requiredViewports.map(passingViewportObservation),
    );

    expect(result.errors).toEqual([]);
    expect(result.assertions.find((item) => item.kind === "viewport")?.status).toBe("passed");
    expect(result.evidence[0].buildId).toBe(buildResult.build.id);
  });

  it("人工体验门禁要求爽点、公平失败与手机舒适度", async () => {
    const project = await withGeneratedAssets(createProject({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] }));
    const buildResult = await createBuild(project, "runtime");
    const result = applyExperienceReview(project, buildResult.build, {
      reviewerRoles: ["玩法设计", "界面体验"],
      understoodWithin30Seconds: true,
      coreLoopInFirstSession: true,
      meaningfulChoice: true,
      feedbackSupportsRules: true,
      failureIsFairAndExplained: false,
      wantsToRetry: false,
      desktopComfortable: true,
      mobileComfortable: false,
      delightSignals: [],
      note: "失败后不知道为什么",
    });

    expect(result.errors.length).toBeGreaterThanOrEqual(3);
    expect(result.assertions.find((item) => item.kind === "manual")?.status).toBe("failed");
  });

  it("匿名质量数据拒绝自由文本失败原因并生成聚合", () => {
    let project = createProject({ ...INITIAL_DRAFT, selectedSuggestionIds: ["merge-2048-world"] });
    project = { ...project, activeBuildId: "BUILD-1" };
    expect(() =>
      recordQualityEvent(project, {
        event: "failed",
        viewport: "390x844",
        input: "touch",
        reasonCode: "用户邮箱 user@example.com",
      }),
    ).toThrow(/自由文本/);

    project = recordQualityEvent(project, { event: "session-start", viewport: "390x844", input: "touch" });
    project = recordQualityEvent(project, {
      event: "failed",
      viewport: "390x844",
      input: "touch",
      reasonCode: "collision-resin",
    });
    expect(summarizeQualityEvents(project).failureReasons).toEqual({ "collision-resin": 1 });
  });
});
