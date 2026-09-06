import { describe, expect, it } from "vitest";
import { createReferenceDossier, recommendMechanics } from "./research";

describe("research planning", () => {
  it("从玩家描述中优先匹配内部有效机制", () => {
    const mechanics = recommendMechanics("在三条路线中高速闪避障碍并收集露珠");

    expect(mechanics[0].id).toBe("lane-dodge");
    expect(mechanics.some((item) => item.id === "collect-charge")).toBe(true);
  });

  it("为新游戏形成至少两个去重后的真实来源", () => {
    const dossier = createReferenceDossier("滑动合成小游戏", ["grid-slide-merge"]);

    expect(dossier.references.length).toBeGreaterThanOrEqual(2);
    expect(new Set(dossier.references.map((item) => item.url)).size).toBe(
      dossier.references.length,
    );
    expect(dossier.references.every((item) => item.doNotCopy.length > 0)).toBe(
      true,
    );
  });
});
