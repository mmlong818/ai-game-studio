import assert from "node:assert/strict";
import test from "node:test";
import { generatedCampaignSchema, generatedCampaignPrompt, resolveGeneratedCampaign, verifyGeneratedCampaign } from "../src/shared/generated-campaign";
import { createDesignProfile, gameDesignProfileSchema, generateGameSpec, gameSpecSchema } from "../src/shared/contracts";

const seven = { levelCount: 7, milestones: [1, 4, 7], difficultyKeys: ["pairCount"], rationale: "七关依次增加配对数量，三处改变布局。" };

test("确认的七关与真实难度维度不被固定二十关替代", () => {
  const profile = gameDesignProfileSchema.parse({ ...createDesignProfile("generated", "standard"), generatedCampaign: seven });
  const plan = resolveGeneratedCampaign(profile.generatedCampaign);
  assert.equal(plan.levelCount, 7);
  assert.equal(plan.legacy, false);
  assert.deepEqual(plan.difficultyKeys, ["pairCount"]);
  const prompt = generatedCampaignPrompt(plan);
  assert.match(prompt, /7 个可选择关卡/);
  assert.doesNotMatch(prompt, /20|speedMultiplier|densityMultiplier|0\.12/);
  const spec = generateGameSpec({ idea: "七关花朵配对小游戏，配对全部花朵即可完成", template: "generated" }, null, profile);
  assert.equal(spec.levelProgression.levelCount, 7);
  assert.equal(gameSpecSchema.safeParse({ ...spec, levelProgression: { ...spec.levelProgression, levelCount: 20 } }).success, false);
  assert.equal(gameSpecSchema.safeParse({ ...spec, template: "snake" }).success, false);
});

test("旧版本没有声明时保留原严格验收，不推测免检", () => {
  const plan = resolveGeneratedCampaign();
  assert.equal(plan.legacy, true);
  assert.equal(plan.levelCount, 20);
  assert.deepEqual(plan.milestones, [1, 5, 9, 13, 17]);
});

test("非法关卡声明不得悄悄回退旧规则", () => {
  for (const change of [{ levelCount: 0 }, { milestones: [1, 8] }, { milestones: [1, 4, 4] }, { milestones: [2] }, { difficultyKeys: ["pairCount", "pairCount"] }, { difficultyKeys: [] }]) {
    assert.throws(() => resolveGeneratedCampaign({ ...seven, ...change }));
  }
});

test("单关游戏合法，不强迫第九关复演或五次结构变化", () => {
  assert.equal(generatedCampaignSchema.parse({ ...seven, levelCount: 1, milestones: [1] }).levelCount, 1);
});

test("服务端确认方案是信任源，产物不能自报少关数或删除声明免检", () => {
  assert.throws(() => verifyGeneratedCampaign({ ...seven, levelCount: 1, milestones: [1] }, seven), /不一致/);
  assert.throws(() => verifyGeneratedCampaign(undefined, seven), /不一致/);
  assert.throws(() => verifyGeneratedCampaign(seven, null), /不一致/);
  assert.deepEqual(verifyGeneratedCampaign(seven, seven), resolveGeneratedCampaign(seven));
});

test("无限玩法不声明有限关卡，不强迫胜利或虚构难度维度", () => {
  const plan = { mode: "endless", failurePolicy: "forbidden", levelCount: 0, milestones: [], difficultyKeys: [], rationale: "自由收集，没有最终目标。" };
  assert.equal(resolveGeneratedCampaign(plan).mode, "endless");
  assert.match(generatedCampaignPrompt(plan), /不实现setLevel或forceWin/);
  assert.throws(() => resolveGeneratedCampaign({ ...plan, levelCount: 20 }));
  assert.throws(() => resolveGeneratedCampaign({ ...plan, milestones: [1] }));
  const profile = gameDesignProfileSchema.parse({ ...createDesignProfile("generated", "standard"), generatedCampaign: plan });
  assert.equal(generateGameSpec({ idea: "自由收集花朵，没有失败和最终目标", template: "generated" }, null, profile).levelProgression.levelCount, 0);
});
