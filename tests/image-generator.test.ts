import assert from "node:assert/strict";
import test from "node:test";
import { generateGameSpec, type ProjectDetail } from "../src/shared/contracts";
import { CoverArtGenerator, dynamicArtPlan } from "../src/server/image-generator";
import { DESIGN_MODIFIERS, MECHANIC_ATLAS } from "../src/shared/game-design-knowledge/mechanic-atlas";
import { OpenAISettings } from "../src/server/openai-settings";

const validKey = "sk-test_1234567890abcdef";

function fakeProject(aspectRatio: "16:9" | "9:16" = "16:9"): ProjectDetail {
  const spec = generateGameSpec({ idea: "小青蛇在庭院里吃果子越长越长，撞墙就输。", aspectRatio });
  return { id: "p-1", title: "青蛇庭院", spec } as unknown as ProjectDetail;
}

function pngBytes(size = 900): Buffer {
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(size)]);
}

function imageResponse(bytes: Buffer) {
  return new Response(JSON.stringify({ data: [{ b64_json: bytes.toString("base64") }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

test("没有密钥时返回 null 且不发起网络请求", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(null), {
    fetchImpl: async () => {
      calls += 1;
      throw new Error("不应该发起请求");
    },
  });
  assert.equal(await generator.generate(fakeProject()), null);
  assert.equal(calls, 0);
});

test("生成成功时返回 PNG 字节，请求携带画幅对应尺寸与无文字约束", async () => {
  let requestBody: Record<string, unknown> | null = null;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return imageResponse(pngBytes());
    },
  });
  const bytes = await generator.generate(fakeProject("9:16"));
  assert.ok(bytes && bytes.length > 500);
  assert.ok(bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])));
  assert.equal(requestBody!.model, "gpt-image-2");
  assert.equal(requestBody!.size, "1024x1536");
  assert.match(String(requestBody!.prompt), /不得出现任何文字/);
  assert.match(String(requestBody!.prompt), /青蛇/);
});

test("返回内容不是 PNG 时判为失败并返回 null", async () => {
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => imageResponse(Buffer.from("not a png at all, ".repeat(60))),
  });
  assert.equal(await generator.generate(fakeProject()), null);
});

test("动态美术:snake 并行生成局内背景与食物/障碍角色位图,角色请求透明底", async () => {
  const bodies: Array<Record<string, unknown>> = [];
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return imageResponse(pngBytes());
    },
  });
  const project = fakeProject("9:16");
  const entries = await generator.generateDynamicArt(project);
  assert.equal(entries.length, 3);
  assert.deepEqual(entries.map((entry) => entry.file).sort(), [
    "assets/background.png",
    "assets/stage-c/snake-food-v2.png",
    "assets/stage-c/snake-obstacle-v2.png",
  ]);
  const backgroundBody = bodies.find((body) => String(body.prompt).includes("场景背景图"))!;
  assert.equal(backgroundBody.background, undefined);
  const roleBodies = bodies.filter((body) => String(body.prompt).includes("角色位图"));
  assert.equal(roleBodies.length, 2);
  for (const body of roleBodies) {
    assert.equal(body.background, "transparent");
    assert.equal(body.size, "1024x1024");
  }
  for (const entry of entries) assert.ok(entry.prompt.length > 0, "提示词必须随产物归档");
});

test("动态美术:单张失败只跳过该张,其余照常返回", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as { prompt: string };
      if (body.prompt.includes("障碍物")) return new Response("boom", { status: 400 });
      return imageResponse(pngBytes());
    },
  });
  const entries = await generator.generateDynamicArt(fakeProject());
  assert.equal(entries.length, 2);
  assert.ok(!entries.some((entry) => entry.file.includes("obstacle")));
  assert.ok(calls >= 3);
});

test("动态美术:没有密钥时返回空数组且不发请求", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(null), {
    fetchImpl: async () => {
      calls += 1;
      throw new Error("不应该发起请求");
    },
  });
  assert.deepEqual(await generator.generateDynamicArt(fakeProject()), []);
  assert.equal(calls, 0);
});

function fakeMergeProject(): ProjectDetail {
  const spec = generateGameSpec({ idea: "在观星台滑动收拢星尘,聚合成更亮星辰直到满月。", template: "merge-2048" });
  return { id: "p-2048", title: "星尘合成", spec } as unknown as ProjectDetail;
}

test("成套块面:2048 六张块面共享风格锚点整套生成,并与背景一起返回", async () => {
  const prompts: string[] = [];
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      prompts.push(String((JSON.parse(String(init?.body)) as { prompt: string }).prompt));
      return imageResponse(pngBytes());
    },
  });
  const entries = await generator.generateDynamicArt(fakeMergeProject());
  const tileEntries = entries.filter((entry) => entry.file.startsWith("assets/sprites/sprite-0"));
  assert.equal(tileEntries.length, 6);
  assert.deepEqual(tileEntries.map((entry) => entry.file).sort(), [
    "assets/sprites/sprite-02.png", "assets/sprites/sprite-03.png", "assets/sprites/sprite-04.png",
    "assets/sprites/sprite-05.png", "assets/sprites/sprite-06.png", "assets/sprites/sprite-07.png",
  ]);
  assert.ok(entries.some((entry) => entry.file === "assets/background.png"));
  const tilePrompts = prompts.filter((prompt) => prompt.includes("成套一致性"));
  assert.equal(tilePrompts.length, 6);
  for (const prompt of tilePrompts) assert.match(prompt, /不能出现数字或文字/);
});

test("成套块面:任何一张失败则整套弃用,背景等单张不受影响", async () => {
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      const prompt = String((JSON.parse(String(init?.body)) as { prompt: string }).prompt);
      if (prompt.includes("第 4 级")) return new Response("boom", { status: 400 });
      return imageResponse(pngBytes());
    },
  });
  const entries = await generator.generateDynamicArt(fakeMergeProject());
  assert.ok(entries.every((entry) => !entry.file.startsWith("assets/sprites/sprite-0")), "整套块面应当弃用");
  assert.ok(entries.some((entry) => entry.file === "assets/background.png"), "背景不应受整套弃用影响");
});

test("接口持续 5xx 时重试一次后返回 null", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => {
      calls += 1;
      return new Response("upstream error", { status: 500 });
    },
  });
  assert.equal(await generator.generate(fakeProject()), null);
  assert.equal(calls, 2);
});

test("生成式游戏的局内主体进入图片计划，与背景同批生成并共享风格锚点", () => {
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
  const spec = generateGameSpec({ idea: "海边捡贝壳装满竹篮，五关数量递增，不会失败。", template: "generated" });
  const project = { id: "p-shell", title: "海边贝壳收集", spec: { ...spec, designProfile: { ...spec.designProfile, generatedBlueprint: blueprint } } } as unknown as ProjectDetail;
  const plan = dynamicArtPlan(project);
  assert.deepEqual(plan.map(({ file }) => file), ["assets/background.png", "assets/shell-scallop.png", "assets/basket.png"]);
  const scallop = plan.find(({ file }) => file === "assets/shell-scallop.png")!;
  assert.match(scallop.prompt, /放射纹清晰/);
  assert.match(scallop.prompt, /同一款游戏的一套局内主体位图之一，共 2 张/, "同批主体必须共享风格锚点");
  assert.match(scallop.prompt, /完全透明背景/);
  // 没有蓝图的项目保持原有模板计划，不新增图片开销。
  const templatePlan = dynamicArtPlan(fakeProject()).map(({ file }) => file);
  assert.ok(templatePlan.includes("assets/background.png"));
  assert.ok(!templatePlan.some(file => file === "assets/basket.png" || file === "assets/shell-scallop.png"));
});
