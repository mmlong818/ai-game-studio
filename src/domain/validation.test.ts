import { describe, expect, it } from "vitest";
import { createReferenceDossier } from "./research";
import { INITIAL_DRAFT } from "./storage";
import { validateDraft } from "./validation";

describe("validateDraft", () => {
  it("不允许没有改造内容的模板方案进入下一步", () => {
    const result = validateDraft(INITIAL_DRAFT);

    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("固定建议");
  });

  it("R3 模板要求必须转入新游戏流程", () => {
    const result = validateDraft({
      ...INITIAL_DRAFT,
      freeRequest: "改成多人开放世界",
      changeLevel: "R3",
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((item) => item.includes("新游戏"))).toBe(true);
  });

  it("完整的新游戏研究方案可以通过", () => {
    const brief = "玩家在三条路线中高速闪避障碍并收集露珠";
    const result = validateDraft({
      ...INITIAL_DRAFT,
      creationMode: "mechanic-composition",
      newGameBrief: brief,
      selectedMechanicIds: ["lane-dodge", "collect-escape"],
      changeLevel: "R3",
      referenceDossier: createReferenceDossier(brief, [
        "lane-dodge",
        "collect-escape",
      ]),
    });

    expect(result.valid).toBe(true);
  });
});
