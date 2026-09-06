import { describe, expect, test } from "vitest";
import { merge2048DesignSample } from "../game-design-contract/samples";
import { createOnboardingRuntimePlan, initialOnboardingRuntimeSnapshot, reduceOnboardingRuntime, restoreOnboardingRuntimeSnapshot } from ".";

describe("可执行新手教学状态机", () => {
  const plan = createOnboardingRuntimePlan(merge2048DesignSample)!;

  test("只有当前步骤的真实成功信号才能推进", () => {
    let state = reduceOnboardingRuntime(plan, initialOnboardingRuntimeSnapshot(), { type: "start" });
    expect(state).toMatchObject({ status: "active", activeStepId: "ONBOARD-SLIDE" });
    state = reduceOnboardingRuntime(plan, state, { type: "signal", signal: "equal-merged-once" });
    expect(state.activeStepId).toBe("ONBOARD-SLIDE");
    state = reduceOnboardingRuntime(plan, state, { type: "signal", signal: "board-slid" });
    expect(state).toMatchObject({ status: "active", activeStepId: "ONBOARD-MERGE", completedStepIds: ["ONBOARD-SLIDE"] });
    state = reduceOnboardingRuntime(plan, state, { type: "signal", signal: "equal-merged-once" });
    expect(state).toMatchObject({ status: "completed", activeStepId: null, completedStepIds: ["ONBOARD-SLIDE", "ONBOARD-MERGE"] });
    expect(state.acceptedSignals).toEqual([
      { stepId: "ONBOARD-SLIDE", signal: "board-slid" },
      { stepId: "ONBOARD-MERGE", signal: "equal-merged-once" },
    ]);
  });

  test("跳过会明确记录，重看会从第一步重新开始", () => {
    const active = reduceOnboardingRuntime(plan, initialOnboardingRuntimeSnapshot(), { type: "start" });
    const skipped = reduceOnboardingRuntime(plan, active, { type: "skip" });
    expect(skipped).toMatchObject({ status: "skipped", activeStepId: null, skippedStepIds: ["ONBOARD-SLIDE", "ONBOARD-MERGE"] });
    expect(reduceOnboardingRuntime(plan, skipped, { type: "replay" })).toMatchObject({ status: "active", activeStepId: "ONBOARD-SLIDE", skippedStepIds: [] });
  });

  test("恢复时过滤未知步骤且不会伪造完成信号", () => {
    expect(restoreOnboardingRuntimeSnapshot(plan, { completedStepIds: ["ONBOARD-SLIDE", "UNKNOWN"], acceptedSignals: [{ stepId: "UNKNOWN", signal: "fake" }] })).toEqual({
      ...initialOnboardingRuntimeSnapshot(),
      completedStepIds: ["ONBOARD-SLIDE"],
    });
  });

});
