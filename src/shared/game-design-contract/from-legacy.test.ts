import { describe, expect, it } from "vitest";
import { createDesignProfile, gameDesignProfileSchema, generateGameSpec } from "../contracts.js";
import { createGameDesignContractForLegacyProject } from "./from-legacy.js";
import { DESIGN_MODIFIERS, MECHANIC_ATLAS } from "../game-design-knowledge/mechanic-atlas.js";

const createdAt = "2026-09-05T00:00:00.000Z";

describe("普通项目完整设计合同编排", () => {
  it.each(["campaign", "endless"])("%s无失败方案不再生成矛盾的失败帮助合同", (mode) => {
    const profile = gameDesignProfileSchema.parse({ ...createDesignProfile("generated", "standard"), generatedCampaign: {
      mode, failurePolicy: "forbidden", levelCount: mode === "endless" ? 0 : 7,
      milestones: mode === "endless" ? [] : [1, 4, 7], difficultyKeys: mode === "endless" ? [] : ["pairCount"], rationale: "按照确认方案进行自由翻牌。",
    } });
    const spec = generateGameSpec({ idea: "花园翻牌，没有失败和时间压力", template: "generated" }, null, profile);
    const contract = createGameDesignContractForLegacyProject({ projectId: "project-no-failure", title: spec.title, idea: spec.vision, createdAt, spec });
    expect(contract.failurePolicy).toBe("forbidden");
    expect(contract.assistance.steps).toEqual([]);
    expect(contract.acceptance.some(item => item.kind === "no-failure")).toBe(true);
    expect(contract.acceptance.some(item => item.kind === "assistance")).toBe(false);
    expect(contract.content.mode).toBe(mode === "endless" ? "endless" : "finite-campaign");
    expect(contract.acceptance.some(item => item.kind === "progression")).toBe(mode !== "endless");
  });
  it("中文教学标签只剩数字时不会撞成重复机制 ID", () => {
    const profile = gameDesignProfileSchema.parse({ ...createDesignProfile("generated", "standard"),
      onboarding: ["先点击 3 枚贝壳放进篮子", "再抓住 3 枚会被浪带走的金贝", "看篮子装满后的庆祝"],
      generatedCampaign: { mode: "campaign", failurePolicy: "forbidden", levelCount: 5, milestones: [1, 2, 3, 4, 5], difficultyKeys: ["shellQuota"], rationale: "用户要求五关递增，无失败。" },
    });
    const spec = generateGameSpec({ idea: "海边贝壳收集，点击贝壳装满篮子", template: "generated" }, null, profile);
    const contract = createGameDesignContractForLegacyProject({ projectId: "project-shells", title: spec.title, idea: spec.vision, createdAt, spec });
    const ids = contract.mechanics.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every(id => /[a-z]/.test(id))).toBe(true);
    expect(contract.onboarding.map(({ teachesMechanicId }) => teachesMechanicId)).toEqual(ids);
  });
  it("把成熟模板编排为包含教学、递进、辅助和验收的可校验合同", () => {
    const spec = generateGameSpec({ idea: "滑动数字方块合并到目标数字。", template: "merge-2048", dimensions: "2d" });
    const contract = createGameDesignContractForLegacyProject({ projectId: "project-merge", title: spec.title, idea: spec.vision, createdAt, spec });
    expect(contract.projectId).toBe("project-merge");
    expect(contract.knowledge.patternIds).toEqual(["sliding-merge-puzzle"]);
    expect(contract.onboarding.length).toBeGreaterThan(0);
    expect(contract.content.beats.map(({ pressure }) => pressure)).toEqual(["safe", "normal", "high"]);
    expect(contract.assistance.hiddenAdaptation).toBe(false);
    expect(new Set(contract.acceptance.map(({ kind }) => kind))).toEqual(new Set(["onboarding", "progression", "assistance", "content-variation"]));
  });

  it("库外实验玩法明确保留研究任务，而不伪装成已经匹配", () => {
    const idea = "玩家编织云团改变磁极，让漂浮岛屿产生新的路径。";
    const spec = generateGameSpec({ idea, template: "generated", dimensions: "2d" });
    const contract = createGameDesignContractForLegacyProject({ projectId: "project-unknown", title: spec.title, idea, createdAt, spec });
    expect(contract.knowledge.integrationStatus).toBe("research-required");
    expect(contract.knowledge.patternIds).toEqual([]);
    expect(contract.knowledge.researchTaskIds).toEqual(["RESEARCH-project-unknown"]);
  });

  it("三种 3D 模式生成与真实运行时一致的教学信号", () => {
    const cases = [
      { id: "collector", idea: "第三人称 3D 收集闯关，经过检查点并到达出口。", signals: ["player-moved"] },
      { id: "arena", idea: "3D 小型竞技场射击，完成三波敌人并获得升级。", signals: ["shot-fired"] },
    ] as const;
    for (const item of cases) {
      const spec = generateGameSpec({ idea: item.idea, template: "signal-hunt", dimensions: "3d" });
      expect(spec.threeMode).toBe(item.id);
      const contract = createGameDesignContractForLegacyProject({ projectId: `project-${item.id}`, title: spec.title, idea: item.idea, createdAt, spec });
      expect(contract.onboarding.map(({ successSignal }) => successSignal)).toEqual(item.signals);
      expect(contract.knowledge.integrationStatus).not.toBe("research-required");
    }
  });

  it("有知识蓝图时合同采用图谱真实机制，不再落到位置回退 ID", () => {
    const mechanic = MECHANIC_ATLAS[0];
    const profile = gameDesignProfileSchema.parse({
      ...createDesignProfile("generated", "standard"),
      onboarding: ["先点击 3 枚贝壳放进篮子", "再抓住 3 枚会被浪带走的金贝"],
      generatedCampaign: { mode: "campaign", failurePolicy: "forbidden", levelCount: 5, milestones: [1, 3, 5], difficultyKeys: ["shellQuota"], rationale: "五关递增，无失败。" },
      generatedBlueprint: {
        mechanicIds: [mechanic.id],
        modifierIds: [DESIGN_MODIFIERS[0].id],
        coreDecision: "每次只能带走一枚贝壳，先救临浪的还是先凑同色。",
        tension: "篮子格位有限，顺序错了稀有贝壳会被浪带走。",
        masterySignal: "熟练玩家先清临浪区再凑色，用更少步数装满。",
        sprites: [
          { file: "assets/shell-scallop.png", role: "大扇贝", hint: "粉橙扇形贝壳，放射纹清晰" },
          { file: "assets/basket.png", role: "竹篮", hint: "浅色编织竹篮，正面开口" },
        ],
      },
    });
    const spec = generateGameSpec({ idea: "海边捡贝壳装满竹篮，五关递增，不会失败。", template: "generated" }, null, profile);
    const contract = createGameDesignContractForLegacyProject({ projectId: "project-blueprint", title: spec.title, idea: spec.vision, createdAt, spec });
    expect(contract.mechanics.map(({ id }) => id)).toEqual([mechanic.id]);
    expect(contract.mechanics[0].label).toBe(mechanic.label);
    expect(contract.mechanics.some(({ id }) => id.startsWith("core-mechanic-"))).toBe(false);
    expect(contract.onboarding[0].teachesMechanicId).toBe(mechanic.id);
  });
});
