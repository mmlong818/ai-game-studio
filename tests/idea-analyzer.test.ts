import assert from "node:assert/strict";
import test from "node:test";
import { gameSpecSchema, generateGameSpec } from "../src/shared/contracts";
import { IdeaAnalyzer } from "../src/server/idea-analyzer";
import { OpenAISettings } from "../src/server/openai-settings";

const validKey = "sk-test_1234567890abcdef";

function llmResponse(answer: Record<string, unknown>) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const towerDefenseIdea = "做一个俯视角塔防游戏，敌人会分波进攻基地，玩家沿路修建防御塔。";

test("没有密钥时回退到关键词识别，且不发起网络请求", async () => {
  let calls = 0;
  const analyzer = new IdeaAnalyzer(new OpenAISettings(null), {
    fetchImpl: async () => {
      calls += 1;
      throw new Error("不应该发起请求");
    },
  });
  const analysis = await analyzer.analyze({ idea: "做一个经典俄罗斯方块，方块下落并消行。" });
  assert.equal(calls, 0);
  assert.equal(analysis.source, "heuristic");
  assert.equal(analysis.template, "tetris");
});

test("用户显式选择模板时跳过 LLM，直接尊重用户选择", async () => {
  let calls = 0;
  const analyzer = new IdeaAnalyzer(new OpenAISettings(validKey), {
    fetchImpl: async () => {
      calls += 1;
      throw new Error("不应该发起请求");
    },
  });
  const analysis = await analyzer.analyze({ idea: "驾驶飞船躲避敌机并完成击破目标。", template: "space-shooter" });
  assert.equal(calls, 0);
  assert.equal(analysis.source, "heuristic");
  assert.equal(analysis.template, "space-shooter");
});

test("LLM 正常返回时产出 llm 来源的结构化分析，并进入玩法合同", async () => {
  const analyzer = new IdeaAnalyzer(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.reasoning_effort, "low");
      assert.equal(body.response_format.json_schema.strict, true);
      return llmResponse({
        template: "snake",
        no_match_reason: null,
        confidence: 0.92,
        dimensions: "2d",
        three_mode: null,
        mechanics: ["贪吃蛇成长", "限时收集"],
        hard_constraints: ["蛇不能穿墙"],
        summary: "经典贪吃蛇玩法，强调限时收集与避障。",
      });
    },
  });
  const input = { idea: "小青蛇在庭院里吃果子越长越长，撞墙就输。" };
  const analysis = await analyzer.analyze(input);
  assert.equal(analysis.source, "llm");
  assert.equal(analysis.template, "snake");
  assert.equal(analysis.confidence, 0.92);
  assert.deepEqual(analysis.mechanics, ["贪吃蛇成长", "限时收集"]);

  const spec = generateGameSpec(input, analysis);
  assert.equal(spec.template, "snake");
  assert.deepEqual(spec.mechanics, ["贪吃蛇成长", "限时收集"]);
  assert.ok(spec.hardConstraints.includes("蛇不能穿墙"));
  assert.equal(spec.ideaAnalysis?.source, "llm");
});

test("LLM 判定无匹配模板时保留 null 与原因，不静默兜底", async () => {
  const analyzer = new IdeaAnalyzer(new OpenAISettings(validKey), {
    fetchImpl: async () =>
      llmResponse({
        template: null,
        no_match_reason: "塔防需要沿路径建塔与波次进攻，当前模板没有能承载它的规则体系。",
        confidence: 0.85,
        dimensions: "2d",
        three_mode: null,
        mechanics: ["塔防建造"],
        hard_constraints: [],
        summary: "俯视角塔防。",
      }),
  });
  const analysis = await analyzer.analyze({ idea: towerDefenseIdea });
  assert.equal(analysis.source, "llm");
  assert.equal(analysis.template, null);
  assert.ok(analysis.summary?.includes("塔防"));
});

test("LLM 调用失败时重试一次后回退到关键词识别并记录原因", async () => {
  let calls = 0;
  const analyzer = new IdeaAnalyzer(new OpenAISettings(validKey), {
    fetchImpl: async () => {
      calls += 1;
      return new Response("upstream error", { status: 500 });
    },
  });
  const analysis = await analyzer.analyze({ idea: "做一个经典俄罗斯方块，方块下落并消行。" });
  assert.equal(calls, 2);
  assert.equal(analysis.source, "heuristic-fallback");
  assert.equal(analysis.template, "tetris");
  assert.ok(analysis.fallbackReason?.includes("500"));
});

test("LLM 返回非法内容时回退而不是崩溃", async () => {
  const analyzer = new IdeaAnalyzer(new OpenAISettings(validKey), {
    fetchImpl: async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: "这不是 JSON" } }] }), { status: 200 }),
  });
  const analysis = await analyzer.analyze({ idea: towerDefenseIdea });
  assert.equal(analysis.source, "heuristic-fallback");
  assert.equal(analysis.template, "signal-hunt");
});

test("不含“贪吃蛇”字样的成长避障描述,关键词识别也能路由到 snake 而不是兜底", async () => {
  const analyzer = new IdeaAnalyzer(new OpenAISettings(null), {
    fetchImpl: async () => {
      throw new Error("不应该发起请求");
    },
  });
  const analysis = await analyzer.analyze({
    idea: "一条小青蛇在苏州园林的回廊里穿行，吃掉桂花糕会越变越长，撞到假山或自己的身体就失败。",
  });
  assert.equal(analysis.source, "heuristic");
  assert.equal(analysis.template, "snake");
});

test("旧版本没有 ideaAnalysis 字段的合同仍能解析", () => {
  const spec = generateGameSpec({ idea: "做一个经典俄罗斯方块，方块下落并消行。" });
  const legacy = JSON.parse(JSON.stringify(spec)) as Record<string, unknown>;
  delete legacy.ideaAnalysis;
  const parsed = gameSpecSchema.parse(legacy);
  assert.equal(parsed.ideaAnalysis, null);
});
