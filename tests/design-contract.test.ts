import assert from "node:assert/strict";
import test from "node:test";
import { createDesignProfile, gameSpecSchema, generateGameSpec, type IdeaAnalysis } from "../src/shared/contracts";
import { contractRules, DesignContractGenerator } from "../src/server/design-contract";
import { DESIGN_MODIFIERS, MECHANIC_ATLAS } from "../src/shared/game-design-knowledge/mechanic-atlas";
import { OpenAISettings } from "../src/server/openai-settings";

const validKey = "sk-test_1234567890abcdef";

test("主动取消方案立即传递给提供方且不进入重试", async () => {
  const cancellation = new AbortController();
  let calls = 0;
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      calls++;
      return new Promise((_resolve, reject) => {
        init!.signal!.addEventListener("abort", () => reject(new DOMException("取消", "AbortError")), { once: true });
        cancellation.abort();
      });
    },
  });
  await assert.rejects(generator.generate({ idea: "花园中寻找配对花朵的记忆小游戏", template: "puzzle" }, null, [], undefined, undefined, cancellation.signal), { name: "AbortError" });
  assert.equal(calls, 1);
});

test("已取消的方案不启动任何模型调用", async () => {
  let calls = 0;
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => { calls++; throw new Error("不应请求"); },
  });
  await assert.rejects(generator.generate({ idea: "花园中寻找配对花朵的记忆小游戏" }, null, [], undefined, undefined, AbortSignal.abort()), { name: "AbortError" });
  assert.equal(calls, 0);
});

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
      const body = JSON.parse(String(init?.body));
      assert.equal(body.stream, true);
      assert.equal(body.reasoning_effort, "low");
      assert.equal(body.response_format.json_schema.strict, true);
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

function scheduledSseResponse(events: Array<{ afterMs: number; line?: string }>, signal: AbortSignal | null | undefined, cleanup: { aborted: number; cancelled: number }) {
  const encoder = new TextEncoder();
  let closed = false;
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      signal?.addEventListener("abort", () => {
        cleanup.aborted += 1;
        closed = true;
        controller.error(new DOMException("aborted", "AbortError"));
      }, { once: true });
      void (async () => {
        for (const event of events) {
          await new Promise(resolve => setTimeout(resolve, event.afterMs));
          if (closed) return;
          if (event.line === undefined) { closed = true; controller.close(); return; }
          controller.enqueue(encoder.encode(`${event.line}\n\n`));
        }
      })();
    },
    cancel() { cleanup.cancelled += 1; closed = true; },
  }));
}

test("流式持续有效内容可超过旧总时限，并在完成后释放读取器", async () => {
  const text = JSON.stringify(themedAnswer);
  const pieces = Array.from({ length: 8 }, (_, index) => text.slice(index * Math.ceil(text.length / 8), (index + 1) * Math.ceil(text.length / 8)));
  const cleanup = { aborted: 0, cancelled: 0 };
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    timeoutMs: 25,
    streamIdleTimeoutMs: 25,
    maxAttempts: 1,
    fetchImpl: async (_url, init) => scheduledSseResponse([
      ...pieces.map(content => ({ afterMs: 12, line: `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}` })),
      { afterMs: 1, line: "data: [DONE]" },
      { afterMs: 0 },
    ], init?.signal, cleanup),
  });
  let validating = 0;
  const result = await generator.generate({ idea: snakeIdea }, snakeAnalysis, [], () => {}, undefined, undefined, { onValidating: () => { validating += 1; } });
  assert.equal(result?.genre, themedAnswer.genre);
  assert.equal(validating, 1);
  assert.equal(cleanup.aborted, 0);
  assert.ok(cleanup.cancelled >= 1);
});

test("流式首段有效内容超时；空协议事件不会续期", async () => {
  const firstCleanup = { aborted: 0, cancelled: 0 };
  const first = new DesignContractGenerator(new OpenAISettings(validKey), {
    timeoutMs: 20, maxAttempts: 1,
    fetchImpl: async (_url, init) => scheduledSseResponse([], init?.signal, firstCleanup),
  });
  let validating = 0;
  assert.equal(await first.generate({ idea: snakeIdea }, snakeAnalysis, [], () => {}, undefined, undefined, { onValidating: () => { validating += 1; } }), null);
  assert.equal(firstCleanup.aborted, 1);
  assert.equal(validating, 0);

  const heartbeatCleanup = { aborted: 0, cancelled: 0 };
  const heartbeat = new DesignContractGenerator(new OpenAISettings(validKey), {
    timeoutMs: 20, maxAttempts: 1,
    fetchImpl: async (_url, init) => scheduledSseResponse([
      { afterMs: 5, line: `data: ${JSON.stringify({ choices: [{ delta: {} }] })}` },
    ], init?.signal, heartbeatCleanup),
  });
  assert.equal(await heartbeat.generate({ idea: snakeIdea }, snakeAnalysis, [], () => {}), null);
  assert.equal(heartbeatCleanup.aborted, 1);
});

test("流式在有效内容停止后按空闲超时中止", async () => {
  const cleanup = { aborted: 0, cancelled: 0 };
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    timeoutMs: 20, streamIdleTimeoutMs: 20, maxAttempts: 1,
    fetchImpl: async (_url, init) => scheduledSseResponse([
      { afterMs: 5, line: `data: ${JSON.stringify({ choices: [{ delta: { content: "{" } }] })}` },
    ], init?.signal, cleanup),
  });
  assert.equal(await generator.generate({ idea: snakeIdea }, snakeAnalysis, [], () => {}), null);
  assert.equal(cleanup.aborted, 1);
});

test("流式收到 DONE 但以 length/content_filter 结束时拒绝截断方案", async () => {
  for (const finishReason of ["length", "content_filter"]) {
    const cleanup = { aborted: 0, cancelled: 0 };
    const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
      timeoutMs: 50, maxAttempts: 1,
      fetchImpl: async (_url, init) => scheduledSseResponse([
        { afterMs: 1, line: `data: ${JSON.stringify({ choices: [{ delta: { content: JSON.stringify(themedAnswer) }, finish_reason: finishReason }] })}` },
        { afterMs: 1, line: "data: [DONE]" },
        { afterMs: 0 },
      ], init?.signal, cleanup),
    });
    assert.equal(await generator.generate({ idea: snakeIdea }, snakeAnalysis, [], () => {}), null);
  }
});

test("外部取消流式生成会立即退出且不重试", async () => {
  const cancellation = new AbortController();
  const cleanup = { aborted: 0, cancelled: 0 };
  let calls = 0;
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    timeoutMs: 100, maxAttempts: 2,
    fetchImpl: async (_url, init) => {
      calls += 1;
      const response = scheduledSseResponse([{ afterMs: 5, line: `data: ${JSON.stringify({ choices: [{ delta: { content: "{" } }] })}` }], init?.signal, cleanup);
      setTimeout(() => cancellation.abort(), 12);
      return response;
    },
  });
  await assert.rejects(generator.generate({ idea: snakeIdea }, snakeAnalysis, [], () => {}, undefined, cancellation.signal), { name: "AbortError" });
  assert.equal(calls, 1);
  assert.equal(cleanup.aborted, 1);
});

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
  const routedSettings = new OpenAISettings(null);
  await routedSettings.save({ apiKey: validKey }, (async () => new Response(JSON.stringify({ data: [
    { id: "gpt-6-astra", created: 3 }, { id: "gpt-5.6-sol", created: 2 }, { id: "gpt-image-2", created: 1 },
  ] }))) as typeof fetch);
  const generator = new DesignContractGenerator(routedSettings, {
    fetchImpl: async (_url, init) => {
      assert.equal(JSON.parse(String(init?.body)).model, "gpt-6-astra");
      return llmResponse(auditAnswer);
    },
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
  const routedSettings = new OpenAISettings(null);
  await routedSettings.save({ apiKey: validKey }, (async () => new Response(JSON.stringify({ data: [
    { id: "gpt-6-astra", created: 3 }, { id: "gpt-5.6-sol", created: 2 }, { id: "gpt-image-2", created: 1 },
  ] }))) as typeof fetch);
  const generator = new DesignContractGenerator(routedSettings, {
    fetchImpl: async (_url, init) => {
      assert.equal(JSON.parse(String(init?.body)).model, "gpt-6-astra");
      return llmResponse(auditAnswer);
    },
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

test("模型多给的条目按合同上限截断，而不是让整个方案作废", async () => {
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse({ ...themedAnswer, accessibility: ["大按钮", "高对比", "不靠颜色", "可调速度", "无倒计时", "键盘可玩", "屏幕阅读提示", "第八条多余"], game_feel: Array.from({ length: 10 }, (_, index) => `手感 ${index + 1}`) }),
  });
  const profile = await generator.generate({ idea: snakeIdea }, snakeAnalysis);
  assert.ok(profile);
  assert.equal(profile.accessibility.length, 6);
  assert.equal(profile.gameFeel.length, 8);
  assert.equal(profile.accessibility[0], "大按钮");
});

test("生成游戏必须从知识库选机制并写清取舍；库外机制让整份方案作废", async () => {
  const blueprint = {
    mechanic_ids: [MECHANIC_ATLAS[0].id],
    modifier_ids: [DESIGN_MODIFIERS[0].id],
    core_decision: "每次只能带走一枚贝壳，先救临浪的还是先凑同色。",
    tension: "篮子格位有限，顺序错了稀有贝壳会被浪带走。",
    mastery_signal: "熟练玩家先清临浪区再凑色，用更少步数装满。",
    sprites: [
      { file: "assets/shell-scallop.png", role: "大扇贝", hint: "粉橙扇形贝壳，放射纹清晰" },
      { file: "assets/basket.png", role: "竹篮", hint: "浅色编织竹篮，正面开口" },
    ],
  };
  const prompts: string[] = [];
  const generator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      prompts.push(String(JSON.parse(String(init?.body)).messages.at(-1).content));
      return llmResponse({ ...themedAnswer, generated_blueprint: blueprint });
    },
  });
  const profile = await generator.generate({ idea: "海边捡贝壳装满竹篮，五关数量递增，不会失败。", template: "generated" }, null);
  assert.ok(profile?.generatedBlueprint, "生成游戏的方案必须带上知识蓝图");
  assert.deepEqual(profile.generatedBlueprint.mechanicIds, [MECHANIC_ATLAS[0].id]);
  assert.equal(profile.generatedBlueprint.sprites.length, 2);
  assert.match(prompts[0], /mechanic_ids 只能从这些 id 中选/, "策划提示必须给出知识库候选菜单");
  assert.match(prompts[0], /纯点选玩法不可接受/);
  assert.ok(contractRules(profile).some(rule => rule.startsWith("玩家取舍:")), "取舍与位图要求必须逐条进入规则审核");

  const offLibrary = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse({ ...themedAnswer, generated_blueprint: { ...blueprint, mechanic_ids: ["click-anything"] } }),
  });
  assert.equal(await offLibrary.generate({ idea: "海边捡贝壳装满竹篮，五关数量递增，不会失败。", template: "generated" }, null), null);

  // 官方模板不接收蓝图，避免与模板运行时冲突。
  const templateGenerator = new DesignContractGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse({ ...themedAnswer, generated_blueprint: blueprint }),
  });
  const templateProfile = await templateGenerator.generate({ idea: snakeIdea, template: "snake" }, snakeAnalysis);
  assert.equal(templateProfile?.generatedBlueprint, undefined);
});
