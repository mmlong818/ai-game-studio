import { describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createDesignProfile, type ProjectDetail } from "../shared/contracts";
import { prepareRenovationInput } from "./creation-design";

describe("prepareRenovationInput", () => {
  const sourceProjectId = randomUUID();
  const baseline = createDesignProfile("snake", "standard");
  const source = { id: sourceProjectId, dimensions: "2d", spec: { template: "snake", designProfile: baseline } } as ProjectDetail;

  it("uses the exact source project and constrains an over-broad confirmed plan", async () => {
    const prepared = await prepareRenovationInput({
      idea: "把蛇换成狐狸，其余都保留",
      template: "generated",
      sourceProjectId,
      revisionScope: "assets",
      confirmedDesignProfile: { ...baseline, coreLoop: baseline.coreLoop.map(step => `${step}并加入经营`), winCondition: "经营获胜" },
    }, async id => id === sourceProjectId ? source : null);
    expect(prepared.template).toBe("snake");
    expect(prepared.dimensions).toBe("2d");
    expect(prepared.confirmedDesignProfile).toEqual(baseline);
  });

  it("fails clearly when the source no longer exists", async () => {
    await expect(prepareRenovationInput({
      idea: "换成水彩风格，保留原玩法",
      template: "snake",
      sourceProjectId,
      revisionScope: "visual-style",
    }, async () => null)).rejects.toThrow(/找不到要改造的来源游戏.*没有按新游戏/);
  });

  it("does not constrain independent new-game creation", async () => {
    const input = { idea: "制作一个三分钟内完成的原创花园配对小游戏", template: "generated" as const };
    await expect(prepareRenovationInput(input, async () => null)).resolves.toMatchObject(input);
  });
});
