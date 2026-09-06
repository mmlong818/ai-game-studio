import { describe, expect, it } from "vitest";
import { OFFICIAL_GAMES } from "../official-games";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "./catalog";
import { integrateGameDesign } from "./integrator";
import { OFFICIAL_GAME_KNOWLEDGE_MAPPINGS } from "./official-mapping";

describe("官方游戏知识映射", () => {
  it("登记表中的全部官方游戏都有有效玩法和机制映射", () => {
    expect(OFFICIAL_GAME_KNOWLEDGE_MAPPINGS).toHaveLength(OFFICIAL_GAMES.length);
    expect(new Set(OFFICIAL_GAME_KNOWLEDGE_MAPPINGS.map(({ officialGameId }) => officialGameId)).size).toBe(OFFICIAL_GAMES.length);
    const patternIds = new Set(GAME_DESIGN_KNOWLEDGE_LIBRARY.patterns.map(({ id }) => id));
    const mechanicIds = new Set(GAME_DESIGN_KNOWLEDGE_LIBRARY.mechanics.map(({ id }) => id));
    for (const mapping of OFFICIAL_GAME_KNOWLEDGE_MAPPINGS) {
      expect(patternIds.has(mapping.patternId), mapping.officialGameId).toBe(true);
      expect(mapping.mechanicIds.every((id) => mechanicIds.has(id)), mapping.officialGameId).toBe(true);
    }
  });

});

describe("策划整合器", () => {
  it("显式模板直接使用官方映射并给出完整依据", () => {
    const plan = integrateGameDesign({ idea: "把数字棋盘换成玉石主题", templateId: "merge-2048" });
    expect(plan.status).toBe("matched");
    expect(plan.selectedPatternId).toBe("sliding-merge-puzzle");
    expect(plan.mechanicIds).toEqual(expect.arrayContaining(["grid-slide-merge"]));
    expect(plan.confidence).toBe(100);
  });

  it("通用信号捕获模板也有已验证映射，不再落入无依据兜底", () => {
    const plan = integrateGameDesign({ idea: "捕获不断移动的发光信号", templateId: "signal-hunt" });
    expect(plan.status).toBe("matched");
    expect(plan.selectedPatternId).toBe("timed-target-hunt");
    expect(plan.mechanicIds).toContain("target-acquisition");
    expect(plan.confidence).toBe(100);
  });

  it("从一句话中检索卡牌肉鸽构筑，而不是从零生成规则", () => {
    const plan = integrateGameDesign({ idea: "做一个手机上玩的短局卡牌肉鸽，每局通过牌组构筑形成不同流派" });
    expect(plan.status).toBe("matched");
    expect(plan.selectedPatternId).toBe("deckbuilding-roguelite");
    expect(plan.rationale.join(" ")).toContain("card");
    expect(plan.evidenceUrls.length).toBeGreaterThan(0);
  });

  it("库内没有可识别玩法时生成外部研究任务", () => {
    const plan = integrateGameDesign({ idea: "让梦境根据玩家说话的隐喻实时重写物理定律" });
    expect(plan.status).toBe("research-required");
    expect(plan.selectedPatternId).toBeNull();
    expect(plan.researchQuery).not.toBeNull();
  });

  it("已知玩法超出验证时长时要求原型，不直接宣称可靠", () => {
    const plan = integrateGameDesign({ idea: "做一个三消休闲游戏", targetMinutes: 90 });
    expect(plan.selectedPatternId).toBe("match-progression");
    expect(plan.status).toBe("prototype-required");
  });
});
