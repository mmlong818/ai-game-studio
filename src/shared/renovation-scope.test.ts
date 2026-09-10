import { describe, expect, it } from "vitest";
import { createDesignProfile, projectInputSchema } from "./contracts";
import { constrainRenovationProfile, renovationScopeInstruction, renovationSourceForBuild } from "./renovation-scope";

describe("renovation scope", () => {
  const baseline = createDesignProfile("snake", "standard");
  const broadCandidate = {
    ...baseline,
    coreLoop: baseline.coreLoop.map((step, index) => `${step}-重做-${index}`),
    winCondition: "改成经营获胜",
    failCondition: "取消原失败",
    progression: ["开放世界成长"],
  };

  it.each(["assets", "visual-style"] as const)("%s scope restores the complete gameplay contract", scope => {
    expect(constrainRenovationProfile(broadCandidate, baseline, scope)).toEqual(baseline);
  });

  it("gameplay scope changes at most one loop point and freezes outcome/progression", () => {
    const constrained = constrainRenovationProfile(broadCandidate, baseline, "gameplay");
    expect(constrained.coreLoop.filter((step, index) => step !== baseline.coreLoop[index])).toHaveLength(1);
    expect(constrained.winCondition).toBe(baseline.winCondition);
    expect(constrained.failCondition).toBe(baseline.failCondition);
    expect(constrained.progression).toEqual(baseline.progression);
  });

  it("requires source and scope together while leaving new-game input unchanged", () => {
    expect(projectInputSchema.safeParse({ idea: "制作一个三分钟内完成的花园配对小游戏", template: "generated" }).success).toBe(true);
    expect(projectInputSchema.safeParse({ idea: "只换狐狸图片，玩法不变", template: "snake", revisionScope: "assets" }).success).toBe(false);
    expect(renovationScopeInstruction("assets", "把兔子换成狐狸")).toMatch(/未点名的资源.*保持不变/);
  });

  it("keeps the selected source for the first build and uses the current project for later revisions", () => {
    expect(renovationSourceForBuild("selected-source", "new-project", false)).toBe("selected-source");
    expect(renovationSourceForBuild("selected-source", "new-project", true)).toBe("new-project");
  });
});
