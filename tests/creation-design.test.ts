import assert from "node:assert/strict";
import test from "node:test";
import { createDesignProfile, generateGameSpec, heuristicIdeaAnalysis, projectInputSchema } from "../src/shared/contracts";
import { resolveCreationDesign } from "../src/server/creation-design";
import { createGameDesignContractForLegacyProject } from "../src/shared/game-design-contract/from-legacy";
import { createOnboardingRuntimePlan } from "../src/shared/onboarding-runtime";

const idea = "在太空驾驶小船收集水晶，避开陨石，完成三分钟探索";
const profile = { ...createDesignProfile("generated", "standard"), playerFantasy: "驾驶唯一的小船穿越水晶星带", onboarding: ["拖动小船躲开第一颗陨石", "收集一颗水晶后开始正式探索"] };
const mustNotCall = async (): Promise<never> => { throw new Error("不应重复调用模型"); };

test("确认的结构化方案原样复用，新游戏不匹配固定模板、不调用模型", async () => {
  const events: string[] = [];
  const result = await resolveCreationDesign({ idea, confirmedDesignProfile: profile }, { analyze: mustNotCall, generate: mustNotCall }, async title => { events.push(title); });
  assert.deepEqual(result.designProfile, profile);
  assert.equal(result.input.idea, idea);
  assert.equal(result.input.template, "generated");
  const spec = generateGameSpec(result.input, result.analysis, result.designProfile);
  // 生成游戏进入规格时剥离教学文本并显式记录未确认关卡方案；其余字段原样复用。
  assert.deepEqual(spec.designProfile, { ...profile, generatedCampaign: null, onboarding: [] });
  assert.equal(spec.designSource, "llm");
  assert.equal(spec.template, "generated");
  assert.match(events[0], /复用/);
});

test("模板改造保持用户选择的模板，同时仍原样复用确认方案", async () => {
  const result = await resolveCreationDesign({ idea, template: "puzzle", confirmedDesignProfile: profile }, { analyze: mustNotCall, generate: mustNotCall });
  assert.equal(result.input.template, "puzzle");
  assert.deepEqual(result.designProfile, profile);
});

test("确认的 3D 新游戏保留维度，不降级固定 3D 收集模板", async () => {
  const result = await resolveCreationDesign({ idea: "第三人称 3D 太空赛车，驾驶飞船完成三圈比赛", confirmedDesignProfile: profile }, { analyze: mustNotCall, generate: mustNotCall });
  const spec = generateGameSpec(result.input, result.analysis, result.designProfile);
  assert.equal(spec.template, "generated");
  assert.equal(spec.dimensions, "3d");
});

test("非法确认方案拒绝，不丢弃后悄悄重做", () => {
  assert.equal(projectInputSchema.safeParse({ idea, confirmedDesignProfile: { coreLoop: [] } }).success, false);
});

test("没有确认方案的旧接口若模型策划失败，不能用静态模板替代", async () => {
  await assert.rejects(resolveCreationDesign({ idea, template: "puzzle" }, {
    analyze: async input => heuristicIdeaAnalysis(input), generate: async () => null,
  }), /不会使用固定方案替代/);
});

test("花园翻牌真实动作进入分析，不使用待细化或词库模板动作，且生成游戏不再产生教学计划", async () => {
  const garden = {
    ...profile,
    coreLoop: ["点击一张花朵牌并记住图案", "再翻开另一张牌比较图案", "相同图案配对保留，不同图案翻回"],
    onboarding: ["点击高亮的花朵牌，观察翻出的图案", "点击另一张相同花朵牌，完成第一次配对"],
    failCondition: "没有失败，不设倒计时，配错后可以继续翻牌",
    winCondition: "配对所有花朵牌后过关",
    progression: ["第一关6对花朵牌", "后续逐步增加到12对花朵牌"],
  };
  const result = await resolveCreationDesign({ idea: "做一个温暖的花园记忆翻牌游戏，不设倒计时，也没有失败", confirmedDesignProfile: garden }, { analyze: mustNotCall, generate: mustNotCall });
  assert.deepEqual(result.analysis.mechanics, garden.coreLoop);
  assert.ok(result.analysis.hardConstraints.some(rule => rule.includes("没有失败，不设倒计时")));
  const spec = generateGameSpec(result.input, result.analysis, result.designProfile);
  const contract = createGameDesignContractForLegacyProject({ projectId: "garden-memory", title: "花园记忆", idea: result.input.idea, createdAt: "2026-09-06T00:00:00.000Z", spec });
  assert.equal(createOnboardingRuntimePlan(contract), null);
  assert.deepEqual(contract.onboarding, []);
  assert.doesNotMatch(JSON.stringify({ analysis: result.analysis, contract }), /待细化|主要操作待/);
  const legacySpec = { ...spec, mechanics: ["核心循环待细化"], ideaAnalysis: { ...result.analysis, mechanics: ["核心循环待细化"] } };
  const rebuilt = createGameDesignContractForLegacyProject({ projectId: "garden-legacy", title: "已有花园记忆", idea: result.input.idea, createdAt: "2026-09-06T00:00:00.000Z", spec: legacySpec });
  assert.equal(createOnboardingRuntimePlan(rebuilt), null);
});
