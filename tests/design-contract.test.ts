import assert from "node:assert/strict";
import test from "node:test";
import { createDesignProfile, gameSpecSchema, generateGameSpec, type IdeaAnalysis } from "../src/shared/contracts";
import { DesignContractGenerator } from "../src/server/design-contract";
import { OpenAISettings } from "../src/server/openai-settings";

const validKey = "sk-test_1234567890abcdef";

test("模型明确的七关无失败协议进入方案，不能影响官方模板", async () => {
  const campaign = { mode: "campaign", failurePolicy: "forbidden", levelCount: 7, milestones: [1, 4, 7], difficultyKeys: ["pairCount"], rationale: "七关花朵配对，操作错误可以继续。" };
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse({ ...themedAnswer, generated_campaign: campaign }),
  });
  const generated = await generator.generate({ idea: "七关花朵配对小游戏，配对全部花朵即可获胜", template: "generated" });
  assert.deepEqual(generated?.generatedCampaign, campaign);
  const official = await generator.generate({ idea: snakeIdea, template: "snake" }, snakeAnalysis);
  assert.equal(official?.generatedCampaign, undefined);
});

test("长方案只裁剪简介，不能因 vision 上限使创建失败", () => {
  const idea = "用户确认的完整方案：玩家在花园中收集星星并躲避障碍。".repeat(30);
  const spec = generateGameSpec({ idea, template: "snake" });
  assert.equal(spec.vision.length, 280);
  assert.equal(gameSpecSchema.safeParse(spec).success, true);
});

test("流式设计逐段输出，完整校验后才返回合同", async () => {
  const chunks: string[] = [];
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      assert.equal(JSON.parse(String(init?.body)).stream, true);
      const text = JSON.stringify(themedAnswer);
      const wire = [text.slice(0, 90), text.slice(90)].map(content => "data: " + JSON.stringify({ choices: [{ delta: { content } }] }) + "\n\n").join("") + "data: [DONE]\n\n";
      const bytes = new TextEncoder().encode(wire);
      return new Response(new ReadableStream({ start(controller) {
        for (let i = 0; i < bytes.length; i += 7) controller.enqueue(bytes.slice(i, i + 7));
        controller.close();
      } }));
    },
  });
  const result = await generator.generate({ idea: snakeIdea, template: "snake" }, snakeAnalysis, [], text => chunks.push(text));
  assert.equal(chunks.length, 2);
  assert.equal(result?.genre, themedAnswer.genre);
});

test("方案预览可关闭隐式重试，错误只请求一次", async () => {
  let calls = 0;
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    maxAttempts: 1,
    fetchImpl: async () => { calls++; return new Response("temporary unavailable", { status: 503 }); },
  });
  assert.equal(await generator.generate({ idea: "一个在花园中收集星星并躲避障碍的小游戏", template: "generated" }), null);
  assert.equal(calls, 1);
});

function llmResponse(answer: Record<string, unknown>) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

const snakeIdea = "小青蛇在苏州园林里吃桂花糕越长越长，撞到假山就输。";

const snakeAnalysis: IdeaAnalysis = {
  source: "llm",
  model: "gpt-5.6",
  template: "snake",
  confidence: 0.93,
  dimensions: "2d",
  threeMode: null,
  mechanics: ["贪吃蛇成长", "路径规划"],
  hardConstraints: ["蛇不能穿墙"],
  summary: "园林题材贪吃蛇，强调成长与避障。",
  fallbackReason: null,
};

const themedAnswer = {
  genre: "园林漫步式持续移动与收集",
  target_player: "偏好舒缓节奏、由掌控感驱动的休闲玩家",
  player_fantasy: "引导一条越来越长的青蛇穿行园林回廊，收集桂花糕而不惊扰假山",
  session_length: "2–7 分钟",
  core_loop: ["预判蛇头去向", "转向收集桂花糕", "身体随之变长", "在收窄的回廊中继续腾挪"],
  win_condition: "收集当前难度要求的全部桂花糕",
  fail_condition: "撞上园墙、假山或自己的身体",
  progression: ["蛇身持续变长压缩安全空间", "难度提升同时加快移动与增加目标数量"],
  difficulty_curve: ["轻松档移动更慢、目标更少", "挑战档提速并增加目标量", "难度调整改变真实速度与目标参数"],
  game_feel: ["吃到桂花糕时有清脆声与花瓣粒子", "转向只在格点生效，操作可预期"],
  onboarding: ["开局给出直线回廊与醒目的首块桂花糕", "禁止直接反向并提前说明"],
  accessibility: ["键盘与触控四向输入等价", "桂花糕用形状和亮度区别于蛇身"],
  extra_production_risks: ["园林背景纹样不能淹没蛇身与食物的可读性"],
};

test("没有密钥时返回 null 且不发起网络请求", async () => {
  let calls = 0;
  const generator = new DesignContractGenerator(new OpenAISettings(null), {
    fetchImpl: async () => {
      calls += 1;
      throw new Error("不应该发起请求");
    },
  });
  const profile = await generator.generate({ idea: snakeIdea }, snakeAnalysis);
  assert.equal(calls, 0);
  assert.equal(profile, null);
});

test("LLM 正常返回时产出题材化设计合同，并保留模板工程风险", async () => {
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse(themedAnswer),
  });
  const profile = await generator.generate({ idea: snakeIdea }, snakeAnalysis);
  assert.ok(profile);
  assert.equal(profile.genre, "园林漫步式持续移动与收集");
  assert.ok(profile.playerFantasy.includes("青蛇"));
  const baseline = createDesignProfile("snake", "standard");
  for (const risk of baseline.productionRisks) {
    assert.ok(profile.productionRisks.includes(risk), `模板工程风险必须保留：${risk}`);
  }
  assert.ok(profile.productionRisks.some((risk) => risk.includes("园林背景")));
});

test("LLM 设计合同进入 spec 后 designSource 标记为 llm，重建可据此保留", async () => {
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse(themedAnswer),
  });
  const profile = await generator.generate({ idea: snakeIdea }, snakeAnalysis);
  const spec = generateGameSpec({ idea: snakeIdea }, snakeAnalysis, profile);
  assert.equal(spec.template, "snake");
  assert.equal(spec.designSource, "llm");
  assert.equal(spec.designProfile.genre, "园林漫步式持续移动与收集");

  const rebuilt = generateGameSpec({ idea: snakeIdea }, snakeAnalysis, spec.designSource === "llm" ? spec.designProfile : null);
  assert.deepEqual(rebuilt.designProfile, spec.designProfile);
});

test("没有 LLM 设计时 spec 使用模板静态设计并标记 template", () => {
  const spec = generateGameSpec({ idea: snakeIdea }, snakeAnalysis, null);
  assert.equal(spec.designSource, "template");
  assert.deepEqual(spec.designProfile, createDesignProfile("snake", "standard"));
});

test("接口持续失败时重试一次后返回 null 回退模板设计", async () => {
  let calls = 0;
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => {
      calls += 1;
      return new Response("upstream error", { status: 500 });
    },
  });
  const profile = await generator.generate({ idea: snakeIdea }, snakeAnalysis);
  assert.equal(calls, 2);
  assert.equal(profile, null);
});

test("LLM 返回非法内容或缺字段时回退而不是崩溃", async () => {
  const invalidJson = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: "不是 JSON" } }] }), { status: 200 }),
  });
  assert.equal(await invalidJson.generate({ idea: snakeIdea }, snakeAnalysis), null);

  const missingFields = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse({ ...themedAnswer, core_loop: ["只有一步"] }),
  });
  assert.equal(await missingFields.generate({ idea: snakeIdea }, snakeAnalysis), null);
});

test("对话式重建:创作意见按时间顺序进入提示词,产出的修订合同可用", async () => {
  let userPrompt = "";
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      userPrompt = body.messages.find((message) => message.role === "user")?.content ?? "";
      return llmResponse(themedAnswer);
    },
  });
  const directions = ["把桂花糕换成莲子", "整体节奏再慢一点"];
  const profile = await generator.generate({ idea: snakeIdea }, snakeAnalysis, directions);
  assert.ok(profile);
  assert.match(userPrompt, /修改意见/);
  assert.match(userPrompt, /1\. 把桂花糕换成莲子/);
  assert.match(userPrompt, /2\. 整体节奏再慢一点/);
  const spec = generateGameSpec({ idea: snakeIdea }, snakeAnalysis, profile);
  assert.equal(spec.designSource, "llm");
});

test("意见落实审计:逐条返回判定并保留原意见文本;失败时返回 null", async () => {
  const auditAnswer = {
    verdicts: [
      { direction: "把桂花糕换成莲子", addressed: true, evidence: "coreLoop 第 2 步与 winCondition 均改为收集莲子" },
      { direction: "加入实时联机对战", addressed: false, evidence: "与模板规则基线冲突,平台当前不支持实时多人" },
    ],
  };
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse(auditAnswer),
  });
  const profile = createDesignProfile("snake", "standard");
  const verdicts = await generator.auditDirections(profile, ["把桂花糕换成莲子", "加入实时联机对战"]);
  assert.ok(verdicts);
  assert.equal(verdicts.length, 2);
  assert.equal(verdicts[0]?.addressed, true);
  assert.equal(verdicts[1]?.addressed, false);
  assert.match(verdicts[1]?.evidence ?? "", /基线冲突/);

  const failing = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => new Response("boom", { status: 400 }),
  });
  assert.equal(await failing.auditDirections(profile, ["任意意见"]), null);

  const noKey = new DesignContractGenerator(new OpenAISettings(null), {
    fetchImpl: async () => {
      throw new Error("不应该发起请求");
    },
  });
  assert.equal(await noKey.auditDirections(profile, ["任意意见"]), null);
});

test("规则正确性审计:规则清单=核心循环+胜负,逐条判定并保留原文;失败返回 null", async () => {
  const profile = createDesignProfile("snake", "standard");
  const ruleCount = profile.coreLoop.length + 2;
  const auditAnswer = {
    verdicts: [
      ...profile.coreLoop.map((step, index) => ({ rule: `核心循环第 ${index + 1} 步:${step}`, implemented: true, evidence: `snakeStep 函数第 ${index + 1} 段实现` })),
      { rule: `胜利条件:${profile.winCondition}`, implemented: true, evidence: "score >= foodTarget 分支" },
      { rule: `失败条件:${profile.failCondition}`, implemented: false, evidence: "撞自身判定缺失,只有边界碰撞" },
    ],
  };
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse(auditAnswer),
  });
  const verdicts = await generator.auditRuleFidelity(profile, "<html>...code...</html>");
  assert.ok(verdicts);
  assert.equal(verdicts.length, ruleCount);
  assert.equal(verdicts.at(-1)?.implemented, false);
  assert.match(verdicts.at(-1)?.evidence ?? "", /撞自身/);

  const failing = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => new Response("boom", { status: 400 }),
  });
  assert.equal(await failing.auditRuleFidelity(profile, "<html></html>"), null);

  const noKey = new DesignContractGenerator(new OpenAISettings(null), {
    fetchImpl: async () => {
      throw new Error("不应该发起请求");
    },
  });
  assert.equal(await noKey.auditRuleFidelity(profile, "<html></html>"), null);
});

test("旧版本没有 designSource 字段的合同仍能解析并视为模板设计", () => {
  const spec = generateGameSpec({ idea: "做一个经典俄罗斯方块，方块下落并消行。" });
  const legacy = JSON.parse(JSON.stringify(spec)) as Record<string, unknown>;
  delete legacy.designSource;
  const parsed = gameSpecSchema.parse(legacy);
  assert.equal(parsed.designSource, "template");
});

test("规则审计少报或多报结果都不能作为完整验收", async () => {
  const profile = createDesignProfile("snake", "standard");
  for (const count of [1, profile.coreLoop.length + 3]) {
    const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
      fetchImpl: async () => llmResponse({ verdicts: Array.from({ length: count }, () => ({
        rule: "测试规则", implemented: true, evidence: "测试代码已实现",
      })) }),
    });
    assert.equal(await generator.auditRuleFidelity(profile, "<html></html>"), null);
  }
});

test("修改提示包含已确认方案，不能只根据最初想法重做", async () => {
  const confirmed = { ...createDesignProfile("snake", "standard"), winCondition: "收集七枚独有的蓝色莲子" };
  let prompt = "";
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      prompt = String(init?.body);
      return llmResponse(themedAnswer);
    },
  });
  assert.ok(await generator.generate({ idea: snakeIdea, template: "snake", confirmedDesignProfile: confirmed }, snakeAnalysis, ["只修改背景为傍晚"]));
  assert.match(prompt, /收集七枚独有的蓝色莲子/);
  assert.match(prompt, /只修改背景为傍晚/);
});
