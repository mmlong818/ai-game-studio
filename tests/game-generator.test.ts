import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { generateGameSpec, getTemplateCatalog, type ProjectDetail } from "../src/shared/contracts";
import {
  GameCodeGenerator,
  describeGenerationProgress,
  inspectGeneratedArtifact,
  scanGeneratedHtml,
  stripPlatformSegments,
  writeGeneratedArtifact,
} from "../src/server/game-generator";
import { inspectRasterAiArt } from "../src/server/art-policy";
import { OpenAISettings } from "../src/server/openai-settings";
import { createGameDesignContractForLegacyProject } from "../src/shared/game-design-contract/from-legacy";
import { generatedDesignHtml } from "./generated-design-fixture";
import { GenerationBudget } from "../src/server/generation-budget";
import { DESIGN_MODIFIERS, MECHANIC_ATLAS } from "../src/shared/game-design-knowledge/mechanic-atlas";

const validKey = "sk-test_1234567890abcdef";

const contractHtml = generatedDesignHtml("shot-fired");

test("安全修正与后续玩法修复共用额度，不能叠加出第四次请求", async () => {
  let calls = 0;
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => {
      calls++;
      return llmResponse({ html: calls < 3 ? contractHtml.replace("<script>", '<script>fetch("/forbidden");') : contractHtml, design_notes: "模拟安全修复" });
    },
  });
  const budget = new GenerationBudget(3);
  const result = await generator.generate(fakeProject(), [], null, async () => {}, budget);
  assert.equal(result.rounds, 3);
  await assert.rejects(generator.generate(fakeProject(), ["再修复玩法"], { html: result.html, directions: [] }, async () => {}, budget), /达到 3 次请求上限/);
  assert.equal(calls, 3);
});

function fakeProject(): ProjectDetail {
  const baseSpec = generateGameSpec({ idea: "守夜人在灯塔上转动光束驱散一波波逼近的雾兽。", template: "generated", dimensions: "2d" });
  const designContract = createGameDesignContractForLegacyProject({ projectId: "p-gen", title: "灯塔守夜人", idea: baseSpec.vision, createdAt: "2026-09-05T00:00:00.000Z", spec: baseSpec });
  return { id: "p-gen", title: "灯塔守夜人", version: { id: "v-gen-1" }, spec: { ...baseSpec, designContract } } as unknown as ProjectDetail;
}

function llmResponse(answer: Record<string, unknown>) {
  return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(answer) } }] }), { status: 200 });
}

test("确认关卡计划同时进入生成指令与交付清单", async () => {
  const project = fakeProject();
  project.spec.designProfile.generatedCampaign = { levelCount: 7, milestones: [1, 4, 7], difficultyKeys: ["pairCount"], rationale: "按七关配对数量递进。" };
  const settings = new OpenAISettings(null);
  await settings.save({ apiKey: validKey }, (async () => new Response(JSON.stringify({ data: [
    { id: "gpt-6-astra", created: 3 }, { id: "gpt-5.6-sol", created: 2 }, { id: "gpt-image-2", created: 1 },
  ] }))) as typeof fetch);
  const generator = new GameCodeGenerator(settings, {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.reasoning_effort, "low");
      assert.equal(body.model, "gpt-5.6-sol");
      assert.equal(body.response_format.json_schema.strict, true);
      const prompt = body.messages[0].content;
      assert.match(prompt, /7 个可选择关卡/);
      assert.doesNotMatch(prompt, /必须是 20 关|必须实现 20|setLevel\(1\.\.20\)|第 9 关/);
      return llmResponse({ html: contractHtml, design_notes: "合同传递测试" });
    },
  });
  const generation = await generator.generate(project);
  const root = mkdtempSync(join(tmpdir(), "confirmed-campaign-"));
  try {
    writeGeneratedArtifact(root, project, generation);
    const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8"));
    assert.equal(manifest.levelProgression.levelCount, 7);
    assert.deepEqual(manifest.generatedCampaign, project.spec.designProfile.generatedCampaign);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

function streamedAnswer(content: string, done = true) {
  const chunks = Array.from({ length: Math.ceil(content.length / 40) }, (_, index) =>
    `data: ${JSON.stringify({ choices: [{ delta: { content: content.slice(index * 40, index * 40 + 40) } }] })}\n\n`);
  return new Response(chunks.join("") + (done ? "data: [DONE]\n\n" : ""), { headers: { "Content-Type": "text/event-stream" } });
}

function timedStreamedAnswer(content: string, delays: number[], signal?: AbortSignal, includeDone = true) {
  const pieces = delays.map((_, index) => content.slice(Math.floor(index * content.length / delays.length), Math.floor((index + 1) * content.length / delays.length)));
  const encoder = new TextEncoder();
  const timers: ReturnType<typeof setTimeout>[] = [];
  return new Response(new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const abort = () => {
        if (closed) return;
        closed = true;
        timers.forEach(clearTimeout);
        controller.error(new DOMException("Aborted", "AbortError"));
      };
      signal?.addEventListener("abort", abort, { once: true });
      delays.forEach((delay, index) => timers.push(setTimeout(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: pieces[index] } }] })}\n\n`));
        if (index === delays.length - 1 && includeDone) {
          closed = true;
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      }, delay)));
    },
  }), { headers: { "Content-Type": "text/event-stream" } });
}

test("代码流式输出节流报告数量，不向进度泄露代码", async () => {
  const reports: string[] = [];
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      assert.equal(JSON.parse(String(init?.body)).stream, true);
      return streamedAnswer(JSON.stringify({ html: contractHtml, design_notes: "流式验收" }));
    },
  });
  const result = await generator.generate(fakeProject(), [], null, async detail => { reports.push(detail); });
  assert.equal(result.html, contractHtml);
  assert.ok(reports.some(detail => detail.includes("已收到")));
  assert.ok(reports.length < 10, "大量分片不应产生同量数据库写入");
  assert.ok(reports.every(detail => !detail.includes("<script")));
});

test("代码流中断不接受半份代码且不重新付费调用", async () => {
  let calls = 0;
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => { calls++; return streamedAnswer(JSON.stringify({ html: contractHtml, design_notes: "完整JSON但流未结束" }), false); },
  });
  await assert.rejects(() => generator.generate(fakeProject()), /输出流中断/);
  assert.equal(calls, 1);
});

test("代码流持续返回有效内容时可以超过初始等待时限", async () => {
  const content = JSON.stringify({ html: contractHtml, design_notes: "长流持续输出" });
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    timeoutMs: 25,
    fetchImpl: async (_url, init) => timedStreamedAnswer(content, [15, 30, 45, 60], init?.signal ?? undefined),
  });
  const generated = await generator.generate(fakeProject());
  assert.equal(generated.html, contractHtml);
  assert.equal(generated.designNotes, "长流持续输出");
});

test("代码流返回首段后停顿超过空闲时限会中止", async () => {
  let calls = 0;
  const content = JSON.stringify({ html: contractHtml, design_notes: "停流" });
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    timeoutMs: 20,
    streamIdleTimeoutMs: 20,
    fetchImpl: async (_url, init) => {
      calls++;
      return timedStreamedAnswer(content, [0, 80], init?.signal ?? undefined);
    },
  });
  await assert.rejects(() => generator.generate(fakeProject()), /代码流连续 20ms 没有返回有效内容/);
  assert.equal(calls, 1, "空闲超时不得自动重复付费请求");
});

test("代码流没有首段有效内容时保留初始等待超时与请求预算", async () => {
  let calls = 0;
  const budget = new GenerationBudget(1);
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    timeoutMs: 20,
    fetchImpl: async (_url, init) => {
      calls++;
      return timedStreamedAnswer("", [80], init?.signal ?? undefined);
    },
  });
  await assert.rejects(() => generator.generate(fakeProject(), [], null, async () => {}, budget), /20ms 内没有返回首段有效内容/);
  await assert.rejects(() => generator.generate(fakeProject(), [], null, async () => {}, budget), /达到 1 次请求上限/);
  assert.equal(calls, 1);
});

test("网络结果未知不自动发起第二次付费请求", async () => {
  let calls = 0;
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => { calls++; throw new TypeError("connection reset"); },
  });
  await assert.rejects(() => generator.generate(fakeProject()), /connection reset/);
  assert.equal(calls, 1);
});

function writeAiArtProvenance(root: string) {
  mkdirSync(join(root, "assets"), { recursive: true });
  mkdirSync(join(root, "_studio"), { recursive: true });
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(600)]);
  writeFileSync(join(root, "assets", "cover.png"), png);
  writeFileSync(join(root, "assets", "background.png"), png);
  writeFileSync(join(root, "_studio", "DYNAMIC_ART.json"), JSON.stringify({
    schemaVersion: 2,
    model: "gpt-image-2",
    generatedAt: "2026-08-31T00:00:00.000Z",
    entries: [
      { file: "assets/cover.png", role: "封面", bytes: png.length, prompt: "为测试游戏生成一张不含文字的主视觉封面位图。" },
      { file: "assets/background.png", role: "局内背景", bytes: png.length, prompt: "为测试游戏生成一张不含文字的局内场景背景位图。" },
    ],
  }));
}

test("安全扫描:拦截网络、外链、存储偷渡与 SVG", () => {
  assert.deepEqual(scanGeneratedHtml(contractHtml), []);
  assert.ok(scanGeneratedHtml(`<script>fetch("/x")</script>`).some((item) => item.includes("fetch")));
  assert.ok(scanGeneratedHtml(`<script src="https://cdn.example.com/x.js"></script>`).length > 0);
  assert.ok(scanGeneratedHtml(`<script>localStorage.setItem("a","b")</script>`).some((item) => item.includes("localStorage")));
  assert.ok(scanGeneratedHtml(`<script>new Function("alert(1)")</script>`).some((item) => item.includes("Function")));
  assert.ok(scanGeneratedHtml(`<img src="https://evil.example.com/x.png">`).some((item) => item.includes("外部地址")));
  assert.ok(scanGeneratedHtml(`<svg xmlns="http://www.w3.org/2000/svg"></svg>`).some((item) => item.includes("SVG")));
});

test("没有密钥时生成器直接抛错,不静默兜底", async () => {
  const generator = new GameCodeGenerator(new OpenAISettings(null), {
    fetchImpl: async () => {
      throw new Error("不应该发起请求");
    },
  });
  await assert.rejects(() => generator.generate(fakeProject()), /密钥/);
});

test("首轮违规时带违规原因重试,第二轮合规则返回 rounds=2", async () => {
  const prompts: string[] = [];
  let calls = 0;
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      prompts.push(body.messages.find((message) => message.role === "user")?.content ?? "");
      if (calls === 1) return llmResponse({ html: `${contractHtml}<script>fetch("/steal")</script>`, design_notes: "v1" });
      return llmResponse({ html: contractHtml, design_notes: "v2" });
    },
  });
  const generated = await generator.generate(fakeProject());
  assert.equal(generated.rounds, 2);
  assert.match(prompts[1] ?? "", /安全扫描违规/);
  assert.match(prompts[1] ?? "", /上一版代码\(修改基础\)/);
  assert.ok(prompts[1]?.includes(`${contractHtml}<script>fetch("/steal")</script>`), "安全修正必须使用刚失败的代码而非重头制作");
});

test("连续三轮违规后抛错,构建应当失败", async () => {
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => llmResponse({ html: `${contractHtml}<script>fetch("/steal")</script>`, design_notes: "bad" }),
  });
  await assert.rejects(() => generator.generate(fakeProject()), /安全扫描/);
});

test("迭代模式:带上一版代码与意见,系统提示声明增量修改;无意见时要求保持实现", async () => {
  const captured: Array<{ system: string; user: string }> = [];
  const generator = new GameCodeGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { messages: Array<{ role: string; content: string }> };
      captured.push({
        system: body.messages.find((message) => message.role === "system")?.content ?? "",
        user: body.messages.find((message) => message.role === "user")?.content ?? "",
      });
      return llmResponse({ html: contractHtml, design_notes: "迭代" });
    },
  });
  const previousHtml = "<!DOCTYPE html><html><body><!-- 上一版实现标记 old-impl --></body></html>";
  await generator.generate(fakeProject(), [], { html: previousHtml, directions: ["橘猫价格降到 60"] });
  assert.match(captured[0]!.system, /迭代模式/);
  assert.match(captured[0]!.user, /old-impl/);
  assert.match(captured[0]!.user, /橘猫价格降到 60/);

  await generator.generate(fakeProject(), [], { html: previousHtml, directions: [] });
  assert.match(captured[1]!.user, /小幅校准/);

  await generator.generate(fakeProject());
  assert.ok(!captured[2]!.system.includes("迭代模式"), "无上一版时不应进入迭代模式");
  assert.match(captured[2]!.system, /可执行教学计划/);
  assert.match(captured[2]!.system, /shot-fired/);
  assert.match(captured[2]!.system, /performOnboardingStep/);
});

test("产物写入+静态探针:拆分为外链三件套(生产 CSP 禁内联),注入遥测与存档垫片", () => {
  const root = mkdtempSync(join(tmpdir(), "forge-gen-"));
  try {
    writeGeneratedArtifact(root, fakeProject(), { html: contractHtml, designNotes: "测试实现", rounds: 1 });
    const preArtLabels = inspectGeneratedArtifact(root, { requireAiArt: false });
    assert.ok(preArtLabels.includes("AI 背景接入"), "代码阶段应检查背景接入，但不应提前要求尚未生成的位图溯源");
    assert.throws(() => inspectGeneratedArtifact(root), /缺少 AI 生图溯源/, "最终验收仍必须要求真实 AI 位图溯源");
    writeAiArtProvenance(root);
    const labels = inspectGeneratedArtifact(root);
    assert.ok(labels.includes("外链交付结构"));
    assert.ok(labels.includes("运行时状态机"));
    assert.ok(labels.includes("安全扫描"));
    assert.ok(labels.includes("试玩遥测注入"));
    assert.ok(labels.includes("教学计划归档"));
    assert.ok(labels.includes("教学接口与信号声明"));
    assert.ok(labels.includes("教学安全压力"));
    assert.ok(labels.includes("确认关卡设计协议"));
    assert.ok(labels.includes("显式失败辅助协议"));
    const written = readFileSync(join(root, "index.html"), "utf8");
    assert.ok(!/<script(?![^>]*\bsrc)[^>]*>[\s\S]*?<\/script>/i.test(written), "index.html 不得残留内联脚本");
    assert.ok(!written.includes("<style"), "index.html 不得残留内联样式块");
    assert.ok(written.includes('<link rel="stylesheet" href="./styles.css">'));
    assert.ok(written.includes('<script src="./app.js"></script>'));
    const appScript = readFileSync(join(root, "app.js"), "utf8");
    assert.ok(appScript.includes("/api/play-events"), "遥测脚本必须注入 app.js");
    assert.ok(appScript.includes("window.__FORGE_ONBOARDING__"), "教学平台运行时必须注入 app.js");
    assert.ok(appScript.includes("forgeVisibleGameDialog"), "平台教学必须识别游戏已有的可见教学对话框");
    assert.ok(appScript.includes("forgeSyncOnboardingVisibility"), "平台教学必须随对话框与游戏终态协调可见性");
    assert.ok(appScript.includes('forgeOnboardingHost.inert = hidden'), "隐藏教学不能留下可聚焦控件");
    assert.ok(appScript.includes("window.__FORGE_DESIGN__"), "失败辅助平台运行时必须注入 app.js");
    assert.ok(appScript.indexOf("const safeStorage") < appScript.indexOf("setState"), "存档垫片必须先于游戏脚本定义");
    const stripped = stripPlatformSegments(appScript);
    assert.ok(!stripped.includes("/api/play-events"), "剥离后不应残留平台脚本");
    assert.match(readFileSync(join(root, "styles.css"), "utf8"), /min-width:\s*88px/, "样式必须落入 styles.css");
    assert.match(readFileSync(join(root, "styles.css"), "utf8"), /data-game-state="won"[\s\S]*\.forge-onboarding/, "生成游戏结算终态必须隐藏平台教学 dock");
    const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")) as { experimental: boolean; template: string; levelProgression: { levelCount: number }; onboardingPlan: { steps: Array<{ successSignal: string }> }; assistancePlan: { hiddenAdaptation: boolean } };
    assert.equal(manifest.experimental, true);
    assert.equal(manifest.template, "generated");
    assert.equal(manifest.levelProgression.levelCount, 20);
    assert.equal(manifest.assistancePlan.hiddenAdaptation, false);
    assert.deepEqual(manifest.onboardingPlan.steps.map(({ successSignal }) => successSignal), ["shot-fired"]);
    assert.deepEqual(JSON.parse(readFileSync(join(root, "_studio", "ONBOARDING_PLAN.json"), "utf8")), manifest.onboardingPlan);
    assert.deepEqual(JSON.parse(readFileSync(join(root, "_studio", "ASSISTANCE_PLAN.json"), "utf8")), manifest.assistancePlan);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("自由生成静态门禁拒绝伪造、漏接或未安全暂停的教学", () => {
  const wrongSignalRoot = mkdtempSync(join(tmpdir(), "forge-gen-wrong-onboarding-"));
  const unsafeRoot = mkdtempSync(join(tmpdir(), "forge-gen-unsafe-onboarding-"));
  try {
    writeGeneratedArtifact(wrongSignalRoot, fakeProject(), { html: contractHtml.replaceAll("shot-fired", "made-up-signal"), designNotes: "错误信号", rounds: 1 });
    writeAiArtProvenance(wrongSignalRoot);
    assert.throws(() => inspectGeneratedArtifact(wrongSignalRoot), /合同信号声明.*shot-fired/);

    writeGeneratedArtifact(unsafeRoot, fakeProject(), { html: contractHtml.replace("!window.__FORGE_ONBOARDING__.isActive()", "true"), designNotes: "未暂停压力", rounds: 1 });
    writeAiArtProvenance(unsafeRoot);
    assert.throws(() => inspectGeneratedArtifact(unsafeRoot), /未冻结教学期自动压力/);
  } finally {
    rmSync(wrongSignalRoot, { recursive: true, force: true });
    rmSync(unsafeRoot, { recursive: true, force: true });
  }
});

test("静态教学接线接受真实花园翻牌的const别名、压力包装函数和探针方法简写", () => {
  const root = mkdtempSync(join(tmpdir(), "forge-gen-onboarding-alias-"));
  const aliased = contractHtml
    .replace('<script>', '<script>const onboarding=window.__FORGE_ONBOARDING__||null; function isOnboardingActive(){return !!(onboarding&&onboarding.isActive&&onboarding.isActive());}')
    .replaceAll('window.__FORGE_ONBOARDING__.signal(', 'onboarding.signal(')
    .replace('!window.__FORGE_ONBOARDING__.isActive()', '!isOnboardingActive()')
    .replace('performOnboardingStep:()=>fireShot()', 'performOnboardingStep(){fireShot()}');
  try {
    writeGeneratedArtifact(root, fakeProject(), { html: aliased, designNotes: "真实失败案例简化回归", rounds: 1 });
    assert.ok(inspectGeneratedArtifact(root, { requireAiArt: false }).includes("教学接口与信号声明"));
    writeGeneratedArtifact(root, fakeProject(), { html: aliased.replace('onboarding.isActive()', 'false'), designNotes: "缺少实际压力检查", rounds: 1 });
    assert.throws(() => inspectGeneratedArtifact(root, { requireAiArt: false }), /未冻结教学期自动压力/);
    writeGeneratedArtifact(root, fakeProject(), { html: aliased.replace('window.__FORGE_ONBOARDING__||null', '{signal(){},isActive(){return false}}'), designNotes: "同名伪造对象", rounds: 1 });
    assert.throws(() => inspectGeneratedArtifact(root, { requireAiArt: false }), /平台教学 signal 接口接线/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("真实制作的空值安全getter与var别名不触发付费修复误报", () => {
  const root = mkdtempSync(join(tmpdir(), "forge-gen-getter-"));
  const html = contractHtml.replace('<script>', '<script>function getOnboarding(){return window.__FORGE_ONBOARDING__||null} var o=getOnboarding();')
    .replaceAll('window.__FORGE_ONBOARDING__.signal(', 'o.signal(')
    .replaceAll('window.__FORGE_ONBOARDING__.isActive()', 'o.isActive()');
  try {
    writeGeneratedArtifact(root, fakeProject(), { html, designNotes: "真实样本回归", rounds: 1 });
    assert.ok(inspectGeneratedArtifact(root, { requireAiArt: false }).includes("教学接口与信号声明"));
    writeGeneratedArtifact(root, fakeProject(), { html: html.replace('return window.__FORGE_ONBOARDING__||null', 'return {}'), designNotes: "伪接口", rounds: 1 });
    assert.throws(() => inspectGeneratedArtifact(root, { requireAiArt: false }), /平台教学 signal 接口接线/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("教学静态预检允许参数化signal helper，完全缺少平台调用仍拒绝", () => {
  const root = mkdtempSync(join(tmpdir(), "forge-gen-signal-wrapper-"));
  const wrapped = contractHtml.replace('<script>', '<script>const onboarding=window.__FORGE_ONBOARDING__||null;const tutorialSignals=["shot-fired"];function emitSignal(name){onboarding.signal(name)}')
    .replace('window.__FORGE_ONBOARDING__.signal("shot-fired")', 'emitSignal(tutorialSignals[0])');
  try {
    writeGeneratedArtifact(root, fakeProject(), { html: wrapped, designNotes: "参数化信号", rounds: 1 });
    assert.ok(inspectGeneratedArtifact(root, { requireAiArt: false }).includes("教学接口与信号声明"));
    writeGeneratedArtifact(root, fakeProject(), { html: wrapped.replace('onboarding.signal(name)', 'void name'), designNotes: "缺少调用", rounds: 1 });
    assert.throws(() => inspectGeneratedArtifact(root, { requireAiArt: false }), /平台教学 signal 接口接线/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("仅2D记忆翻牌产物声明自然配对检查", () => {
  const root = mkdtempSync(join(tmpdir(), "forge-gen-memory-capability-"));
  try {
    const project = fakeProject();
    project.spec.designProfile.genre = "花园休闲记忆配对";
    writeGeneratedArtifact(root, project, { html: contractHtml, designNotes: "记忆配对", rounds: 1 });
    assert.deepEqual(JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")).naturalInteractionChecks, ["memory-match"]);
    project.spec.designProfile.genre = "灯塔射击";
    writeGeneratedArtifact(root, project, { html: contractHtml, designNotes: "射击", rounds: 1 });
    assert.deepEqual(JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")).naturalInteractionChecks, []);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("AI 位图门禁要求游戏实际加载背景，并拒绝产物中的 SVG", () => {
  const root = mkdtempSync(join(tmpdir(), "studio-ai-art-policy-"));
  try {
    writeAiArtProvenance(root);
    assert.deepEqual(inspectRasterAiArt(root, 'background-image:url("./assets/background.png")'), []);
    assert.ok(inspectRasterAiArt(root, "const canvas = document.querySelector('canvas')").some((item) => item.includes("实际加载")));
    writeFileSync(join(root, "assets", "forbidden.svg"), '<svg xmlns="http://www.w3.org/2000/svg"></svg>');
    assert.ok(inspectRasterAiArt(root, 'background-image:url("./assets/background.png")').some((item) => item.includes("SVG")));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("静态探针接受运行时生成的开始控件，但拒绝只有查询语句而没有控件声明", () => {
  const dynamicStartHtml = contractHtml
    .replace('<button id="start">开始</button>', '<div id="start-slot"></div>')
    .replace(
      'let state="idle"',
      `document.querySelector("#start-slot").innerHTML = '<button id="start">开始</button>';
let state="idle"`,
    );
  const dynamicRoot = mkdtempSync(join(tmpdir(), "forge-gen-dynamic-control-"));
  const missingRoot = mkdtempSync(join(tmpdir(), "forge-gen-missing-control-"));
  try {
    writeGeneratedArtifact(dynamicRoot, fakeProject(), { html: dynamicStartHtml, designNotes: "动态开始按钮", rounds: 1 });
    writeAiArtProvenance(dynamicRoot);
    assert.ok(inspectGeneratedArtifact(dynamicRoot).includes("开始与重开控件"));

    const missingStartHtml = contractHtml.replace('<button id="start">开始</button>', '<div id="start-slot"></div>');
    writeGeneratedArtifact(missingRoot, fakeProject(), { html: missingStartHtml, designNotes: "缺少开始按钮", rounds: 1 });
    writeAiArtProvenance(missingRoot);
    assert.throws(() => inspectGeneratedArtifact(missingRoot), /缺少可在运行时生成的 #start/);
  } finally {
    rmSync(dynamicRoot, { recursive: true, force: true });
    rmSync(missingRoot, { recursive: true, force: true });
  }
});

const contract3dHtml = contractHtml
  .replace("<script>", `<script type="module">\nimport * as THREE from "./vendor/three.module.js";\nvoid THREE;`)
  .replaceAll("shot-fired", "mechanic-1-completed")
  .replace("safeStorage.setItem", "// three scene omitted\nsafeStorage.setItem");

function fake3dProject(): ProjectDetail {
  const baseSpec = generateGameSpec({ idea: "第三人称在悬浮岛间驾驶热气球收集星火,撞上风暴云失败。", template: "generated", dimensions: "3d" });
  const designContract = createGameDesignContractForLegacyProject({ projectId: "p-gen3d", title: "热气球星火", idea: baseSpec.vision, createdAt: "2026-09-05T00:00:00.000Z", spec: baseSpec });
  return { id: "p-gen3d", title: "热气球星火", version: { id: "v-gen3d-1" }, spec: { ...baseSpec, designContract } } as unknown as ProjectDetail;
}

test("3D 扫描白名单:只放行本地 three 模块 import,其余 import 与 2D 模块脚本仍被拦", () => {
  assert.deepEqual(scanGeneratedHtml(contract3dHtml, { allowThreeModule: true }), []);
  assert.ok(scanGeneratedHtml(contract3dHtml).some((item) => item.includes("模块脚本") || item.includes("import")), "2D 通道必须拦模块脚本");
  const foreignImport = contract3dHtml.replace("./vendor/three.module.js", "https://esm.sh/three");
  assert.ok(scanGeneratedHtml(foreignImport, { allowThreeModule: true }).some((item) => item.includes("import 只允许本地 three")), "非白名单 import 必须拦");
  const dynamicImport = `${contract3dHtml}<script type="module">import("./x.js")</script>`;
  assert.ok(scanGeneratedHtml(dynamicImport, { allowThreeModule: true }).some((item) => item.includes("动态 import")));
});

test("3D 产物:module 外链、vendor three 落盘、语法校验剥 import 后通过", () => {
  const root = mkdtempSync(join(tmpdir(), "forge-gen3d-"));
  try {
    const project = fake3dProject();
    assert.equal(project.spec.runtimeTarget, "web-3d");
    assert.equal(project.spec.threeContract, null, "generated 3D 不应套模板 threeContract");
    writeGeneratedArtifact(root, project, { html: contract3dHtml, designNotes: "3D 测试", rounds: 1 });
    writeAiArtProvenance(root);
    const labels = inspectGeneratedArtifact(root);
    assert.ok(labels.includes("本地 3D 引擎"));
    assert.ok(labels.includes("安全扫描"));
    const written = readFileSync(join(root, "index.html"), "utf8");
    assert.ok(written.includes('<script type="module" src="./app.js"></script>'));
    const appScript = readFileSync(join(root, "app.js"), "utf8");
    assert.ok(appScript.includes('import * as THREE from "./vendor/three.module.js"'));
    const manifest = JSON.parse(readFileSync(join(root, "game-manifest.json"), "utf8")) as { runtimeTarget: string; engine?: string };
    assert.equal(manifest.runtimeTarget, "web-3d");
    assert.equal(manifest.engine, "three.js");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("generated 不进入模板目录,不参与匹配", () => {
  assert.ok(getTemplateCatalog().every((entry) => String(entry.id) !== "generated"));
  const spec = generateGameSpec({ idea: "守夜人在灯塔上转动光束驱散雾兽。", template: "generated", dimensions: "2d" });
  assert.equal(spec.template, "generated");
  assert.equal(spec.runtimeTarget, "web-2d");
});

test("局内主体位图先于代码生成后，代码必须真的加载它们，否则静态验收拒收", () => {
  const root = mkdtempSync(join(tmpdir(), "forge-blueprint-"));
  try {
    const blueprint = {
      mechanicIds: [MECHANIC_ATLAS[0].id],
      modifierIds: [DESIGN_MODIFIERS[0].id],
      coreDecision: "每次只能带走一枚贝壳，先救临浪的还是先凑同色。",
      tension: "篮子格位有限，顺序错了稀有贝壳会被浪带走。",
      masterySignal: "熟练玩家先清临浪区再凑色，用更少步数装满。",
      sprites: [
        { file: "assets/shell-scallop.png", role: "大扇贝", hint: "粉橙扇形贝壳，放射纹清晰" },
        { file: "assets/basket.png", role: "竹篮", hint: "浅色编织竹篮，正面开口" },
      ],
    };
    writeGeneratedArtifact(root, fakeProject(), { html: contractHtml, designNotes: "未接入位图", rounds: 1 });
    assert.throws(
      () => inspectGeneratedArtifact(root, { requireAiArt: false, expectedBlueprint: blueprint }),
      /局内主体位图|assets\/shell-scallop\.png/,
      "代码没有加载已生成的局内主体位图时必须拒收",
    );
    const withSprites = contractHtml.replace(
      "</body>",
      '<script>const forgeSprites = ["./assets/shell-scallop.png", "./assets/basket.png"].map(src => { const image = new Image(); image.src = src; return image; });</script></body>',
    );
    writeGeneratedArtifact(root, fakeProject(), { html: withSprites, designNotes: "已接入位图", rounds: 1 });
    const labels = inspectGeneratedArtifact(root, { requireAiArt: false, expectedBlueprint: blueprint });
    assert.ok(labels.includes("局内主体位图接入"));
    // 没有蓝图的旧项目不新增这项要求。
    assert.ok(!inspectGeneratedArtifact(root, { requireAiArt: false }).includes("局内主体位图接入"));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("流式进展片段：解码 JSON 转义并说明当前写到哪一部分", () => {
  // 模型流式返回的是 JSON 字符串内部的转义文本：换行是 \n 两个字符，引号带反斜杠。
  const streaming = '{"html":"<!DOCTYPE html>\\n<html>\\n<head>\\n<style>\\n.panel{color:\\"#fff\\"}\\n';
  const progress = describeGenerationProgress(streaming);
  assert.equal(progress.phase, "正在写界面样式");
  assert.ok(progress.excerpt.includes('.panel{color:"#fff"}'), "片段必须是解码后的代码，不是转义文本");
  assert.ok(!progress.excerpt.includes("\\n"), "不能残留转义换行");
  assert.ok(progress.excerpt.includes("\n<style>\n"), "转义换行必须解码成真实换行");
  const scripting = streaming + '</style></head><body><canvas id=\\"game-canvas\\"></canvas>\\n<script>\\nconst basket = [];\\nfunction tide() {';
  assert.equal(describeGenerationProgress(scripting).phase, "正在写游戏逻辑");
  assert.ok(describeGenerationProgress(scripting).excerpt.endsWith("function tide() {"));
  assert.equal(describeGenerationProgress(scripting + '</script></body></html>","design_notes":"篮格').phase, "正在写实现说明");
  assert.ok(describeGenerationProgress("x".repeat(2000)).excerpt.length <= 260, "片段长度受限");
});
