import { describe, expect, it } from "vitest";
import { runPaperPopupScenario } from "./gameplayAcceptance";
import { PAPER_POPUP_RULE_LABELS, PaperPopupProbe } from "./probe";
import { popupBestTemplateBlueprints } from "../shared/paper-popup-levels";

describe("纸境 · 立体书迷宫 GameProbe", () => {
  it("专属探针驱动真实规则：折桥拒绝穿行、转动后接上、隐藏星显现、跳空回检查点、抵达出口", () => {
    const probe = new PaperPopupProbe();
    const result = runPaperPopupScenario(probe);
    expect(result.errors).toEqual([]);
    expect(result.passedLabels).toEqual([...PAPER_POPUP_RULE_LABELS]);
    expect(result.log).toContain("angle-link-connected");
    expect(result.log).toContain("exit-reached");
  });

  it("每一关都能由探针按正确角度序列走完，且至少转动一次", () => {
    popupBestTemplateBlueprints.forEach((_, index) => {
      const probe = new PaperPopupProbe(index);
      probe.performAction("start");
      const solution = probe.solution();
      expect(solution.length, `p${index + 1}`).toBeGreaterThan(0);
      for (const action of solution) expect(probe.performAction(action).accepted, `p${index + 1} ${action}`).toBe(true);
      const state = probe.snapshot();
      expect(state.result, `p${index + 1}`).toBe("completed");
      expect(Number(state.resources.rotations), `p${index + 1}`).toBeGreaterThanOrEqual(1);
      expect(Number(state.resources.mistakes), `p${index + 1}`).toBe(0);
    });
  });

  it("不提供强制胜负动作，非法动作被拒绝", () => {
    const probe = new PaperPopupProbe();
    expect(probe.listActions()).toEqual(["start"]);
    probe.performAction("start");
    expect(probe.listActions()).not.toContain("forceWin");
    expect(probe.performAction("__illegal__").accepted).toBe(false);
  });
});
