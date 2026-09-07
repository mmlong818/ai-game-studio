import { describe, expect, it } from "vitest";
import { readableDesign } from "./readableDesign";
import { INITIAL_DRAFT } from "./storage";

describe("面向普通玩家的设计说明", () => {
  it("拼图解释操作、实例和完成条件", () => {
    const plan = readableDesign({ ...INITIAL_DRAFT, creationMode: "mechanic-composition", newGameBrief: "植物园拼图", selectedMechanicIds: ["drag-snap-assembly"] });
    expect(plan.play).toContain("拖到对应位置");
    expect(plan.example).toContain("叶子");
    expect(plan.goal).toContain("完整画面");
  });
  it("仅改画风保留原规则，不套用新游戏目标", () => {
    const plan = readableDesign({ ...INITIAL_DRAFT, freeRequest: "换成海底画风" });
    expect(plan.preserve).toBe(true);
    expect(plan.goal).toContain("优先保留");
  });
  it("明确无目标时不强加闯关条件", () => {
    const plan = readableDesign({ ...INITIAL_DRAFT, creationMode: "mechanic-composition", newGameBrief: "只要无限合成，没有目标", selectedMechanicIds: ["grid-slide-merge"] });
    expect(plan.goal).toContain("不设置必须完成的关卡目标");
    expect(plan.goal).not.toContain("合成指定等级");
  });
});
