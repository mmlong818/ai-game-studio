import { describe, expect, it } from "vitest";
import { PUZZLE_DESIGN_GUIDELINES, puzzleGuidelinesFor, validatePuzzleDesignGuidelines } from "./puzzle-guidelines";

describe("益智游戏设计规则", () => {
  it("规则结构有效且 ID 唯一", () => {
    expect(validatePuzzleDesignGuidelines().success).toBe(true);
    expect(new Set(PUZZLE_DESIGN_GUIDELINES.map(({ id }) => id)).size).toBe(PUZZLE_DESIGN_GUIDELINES.length);
  });

  it("默认要求包含教学、递进提示、公平随机与试玩闭环", () => {
    const ids = puzzleGuidelinesFor(["onboarding", "assistance", "procedural", "evaluation"]).map(({ id }) => id);
    expect(ids).toEqual(expect.arrayContaining(["one-new-concept", "progressive-hint-ladder", "fair-randomness", "diverse-playtest-loop"]));
  });

  it("社交与运营系统明确不是默认完成度要求", () => {
    expect(PUZZLE_DESIGN_GUIDELINES.find(({ id }) => id === "no-forced-social-systems")?.disposition).toBe("rejected-default");
  });
});
