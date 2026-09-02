import { describe, expect, it } from "vitest";
import { classifyChange, maxChangeLevel } from "./classifyChange";
import { getTemplate } from "./templates";

describe("classifyChange", () => {
  it("把换世界观识别为表现改造", () => {
    const result = classifyChange("改成 Q 版昆虫世界观和新的音效");

    expect(result.level).toBe("R0");
    expect(result.matchedTerms).toContain("世界观");
  });

  it("把新增单一障碍识别为小规则扩展", () => {
    const result = classifyChange("加入一种会左右移动的障碍");

    expect(result.level).toBe("R2");
  });

  it("结合模板边界把开放世界转为核心重写", () => {
    const result = classifyChange(
      "希望能做成开放世界",
      getTemplate("merge-2048"),
    );

    expect(result.level).toBe("R3");
    expect(result.reasons[0]).toContain("超出");
  });

  it("混合要求按最高风险级别处理", () => {
    const result = classifyChange("换一个可爱风格，并增加 Boss 和多人联机");

    expect(result.level).toBe("R3");
    expect(maxChangeLevel(["R0", "R2", "R1"])).toBe("R2");
  });
});
