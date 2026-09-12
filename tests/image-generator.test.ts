import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { generateGameSpec, type ProjectDetail } from "../src/shared/contracts";
import {
  adaptGeneratedPng,
  CoverArtGenerator,
  dynamicArtPlan,
  generatedImageDelivery,
  imageOutputConstraintsForProject,
  imageRequestFingerprint,
  IMAGE_TRANSFORM_VERSION,
  readPngDimensions,
  resolveAssetRenovationTarget,
  spritePresentationContracts,
} from "../src/server/image-generator";
import { DESIGN_MODIFIERS, MECHANIC_ATLAS } from "../src/shared/game-design-knowledge/mechanic-atlas";
import { OpenAISettings } from "../src/server/openai-settings";
import { packAnimationSpriteSheet } from "../src/server/sprite-sheet";
import type { SpriteSheetAnimation } from "../src/shared/generated-blueprint";
import { runWithCancellation } from "../src/server/cancellation";
import { runWithImageRepairProgress } from "../src/server/image-repair-progress";

const validKey = "sk-test_1234567890abcdef";

function fakeProject(aspectRatio: "16:9" | "9:16" = "16:9"): ProjectDetail {
  const spec = generateGameSpec({ idea: "小青蛇在庭院里吃果子越长越长，撞墙就输。", aspectRatio });
  return { id: "p-1", title: "青蛇庭院", spec } as unknown as ProjectDetail;
}

test("构建取消会中止在途生图 HTTP，且不会作为超时重试", async () => {
  const controller = new AbortController();
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), { fetchImpl: async (_url, init) => {
    calls += 1;
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("cancelled", "AbortError")), { once: true });
    });
  } });
  const pending = runWithCancellation(controller.signal, () => generator.generate(fakeProject()));
  for (let n = 0; n < 20 && calls === 0; n++) await new Promise(resolve => setTimeout(resolve, 2));
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
  assert.equal(calls, 1);
});

test("generated 单局 demo 未声明位图时返回空计划且不调用图片 provider", async () => {
  const spec = generateGameSpec({ idea: "点击圆点得分，达到十分后结束。", template: "generated", aspectRatio: "1:1" });
  const project = { id: "demo-zero-art", title: "点击圆点", spec } as unknown as ProjectDetail;
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(null), { fetchImpl: async () => { calls++; throw new Error("不应调用"); } });
  assert.deepEqual(dynamicArtPlan(project), []);
  assert.deepEqual(await generator.generateDynamicArt(project), []);
  assert.equal(calls, 0);
});

const providerFixtures = new Map<string, Buffer>();
const transparentProviderFixtures = new Map<string, Buffer>();
for (const [size, width, height] of [
  ["1024x1024", 1024, 1024],
  ["1536x1024", 1536, 1024],
  ["1024x1536", 1024, 1536],
] as const) {
  providerFixtures.set(size, await sharp({
    create: { width, height, channels: 4, background: { r: 54, g: 138, b: 94, alpha: 1 } },
  }).png().toBuffer());
  transparentProviderFixtures.set(size, await sharp({
    create: { width, height, channels: 4, background: { r: 54, g: 138, b: 94, alpha: 0.8 } },
  }).png().toBuffer());
}

function providerPng(init?: RequestInit): Buffer {
  const body = JSON.parse(String(init?.body ?? "{}")) as { size?: string; background?: string };
  const fixtures = body.background === "transparent" ? transparentProviderFixtures : providerFixtures;
  return fixtures.get(body.size ?? "1024x1024")!;
}

function assetRenovation(project: ProjectDetail, request: string): ProjectDetail {
  project.spec.renovation = {
    sourceProjectId: "770e8400-e29b-41d4-a716-446655440000",
    revisionScope: "assets",
    request,
  };
  return project;
}

function imageResponse(bytes: Buffer) {
  return new Response(JSON.stringify({ data: [{ b64_json: bytes.toString("base64") }] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function circleFixture(width: number, height: number, radius: number): Promise<Buffer> {
  const pixels = Buffer.alloc(width * height * 4);
  const cx = width / 2;
  const cy = height / 2;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const inside = ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2) <= radius ** 2;
      pixels[offset] = 235;
      pixels[offset + 1] = inside ? 42 : 241;
      pixels[offset + 2] = inside ? 42 : 232;
      pixels[offset + 3] = inside ? 255 : 0;
    }
  }
  return sharp(pixels, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

async function redSubjectBounds(bytes: Buffer) {
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * 4;
      if (data[offset]! > 180 && data[offset + 1]! < 100 && data[offset + 2]! < 100 && data[offset + 3]! > 100) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  assert.ok(maxX >= minX && maxY >= minY, "应能从真实像素中找到红色主体");
  return { width: maxX - minX + 1, height: maxY - minY + 1, minX, minY, maxX, maxY, imageWidth: info.width, imageHeight: info.height };
}

test("没有密钥时保留配置失败详情且不发起网络请求", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(null), {
    fetchImpl: async () => {
      calls += 1;
      throw new Error("不应该发起请求");
    },
  });
  await assert.rejects(generator.generate(fakeProject()), (error: unknown) => {
    const failure = error as { message?: string; details?: Array<{ category?: string; resource?: { file?: string } }> };
    assert.match(failure.message ?? "", /图像服务未配置/);
    assert.equal(failure.details?.[0]?.category, "configuration");
    assert.equal(failure.details?.[0]?.resource?.file, "assets/cover.png");
    return true;
  });
  assert.equal(calls, 0);
});

test("生成成功时返回 PNG 字节，请求携带画幅对应尺寸与无文字约束", async () => {
  let requestBody: Record<string, unknown> | null = null;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return imageResponse(providerPng(init));
    },
  });
  const bytes = await generator.generate(fakeProject("9:16"));
  assert.ok(bytes && bytes.length > 500);
  assert.ok(bytes.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])));
  assert.equal(requestBody!.model, "gpt-image-2.5-sunburst");
  assert.equal(requestBody!.size, "1024x1536");
  assert.equal(requestBody!.quality, "high");
  assert.equal(requestBody!.output_format, "png");
  assert.match(String(requestBody!.prompt), /不得出现任何文字/);
  assert.match(String(requestBody!.prompt), /青蛇/);
  assert.deepEqual(await readPngDimensions(bytes), { width: 864, height: 1536, hasAlpha: true, hasTransparency: false });
  assert.deepEqual(generatedImageDelivery(bytes)!.delivered, { width: 864, height: 1536, fit: "cover" });
});

test("cover 等比裁切到目标画幅，不把圆形主体压扁", async () => {
  const source = await circleFixture(600, 400, 120);
  const adapted = await adaptGeneratedPng(source, { width: 320, height: 180, fit: "cover" });
  assert.deepEqual(await readPngDimensions(adapted.bytes), { width: 320, height: 180, hasAlpha: true, hasTransparency: true });
  const subject = await redSubjectBounds(adapted.bytes);
  assert.ok(Math.abs(subject.width - subject.height) <= 2, `圆形主体应保持比例，实际 ${subject.width}×${subject.height}`);
  assert.deepEqual(adapted.metadata.providerSource, { width: 600, height: 400, hasAlpha: true, hasTransparency: true });
  assert.deepEqual(adapted.metadata.delivered, { width: 320, height: 180, fit: "cover" });
});

test("contain 等比缩小并使用透明留白，不放大或拉伸角色", async () => {
  const source = await circleFixture(400, 200, 70);
  const adapted = await adaptGeneratedPng(source, { width: 160, height: 160, fit: "contain" });
  const subject = await redSubjectBounds(adapted.bytes);
  assert.ok(Math.abs(subject.width - subject.height) <= 2, `角色主体应保持比例，实际 ${subject.width}×${subject.height}`);
  assert.ok(subject.minY >= 40 && subject.maxY < 120, "上下应保留透明补边");
  const corner = await sharp(adapted.bytes).extract({ left: 0, top: 0, width: 1, height: 1 }).ensureAlpha().raw().toBuffer();
  assert.equal(corner[3], 0, "透明补边不能被实色背景污染");
});

test("contain 按锚点放入透明安全区并记录可追溯变换", async () => {
  const source = await circleFixture(120, 80, 25);
  const adapted = await adaptGeneratedPng(source, {
    width: 200, height: 160, fit: "contain", anchor: { x: 1, y: 1 }, safeInsetRatio: 0.1,
    minSourcePixels: 40, requireAlpha: true,
  });
  const subject = await redSubjectBounds(adapted.bytes);
  assert.ok(subject.maxX < 180 && subject.maxY < 144, "主体必须完整位于声明的透明安全区内");
  assert.equal(adapted.metadata.transform?.version, IMAGE_TRANSFORM_VERSION);
  assert.deepEqual(adapted.metadata.transform?.anchor, { x: 1, y: 1 });
  assert.deepEqual(adapted.metadata.transform?.placement, { left: 60, top: 64 });
  assert.equal(adapted.metadata.transform?.sourceSha256.length, 64);
  assert.deepEqual(adapted.metadata.transform?.sourceContentBounds, { left: 35, top: 15, width: 50, height: 50 });
});

test("程序变换合同拒绝低有效像素与伪透明，且完整进入缓存指纹", async () => {
  const transparent = await circleFixture(120, 80, 10);
  await assert.rejects(adaptGeneratedPng(transparent, { width: 128, height: 128, fit: "contain", minSourcePixels: 32 }), /有效源像素.*低于最低要求/);
  await assert.rejects(adaptGeneratedPng(providerFixtures.get("1024x1024")!, { width: 128, height: 128, fit: "contain", requireAlpha: true }), /没有真实透明区域/);
  const constraint = { width: 128, height: 128, fit: "contain" as const, anchor: { x: 0.5, y: 0.9 }, safeInsetRatio: 0.08, minSourcePixels: 64, requireAlpha: true };
  const fingerprint = imageRequestFingerprint({}, { "assets/hero.png": constraint });
  assert.equal(fingerprint.transformVersion, IMAGE_TRANSFORM_VERSION);
  assert.deepEqual(fingerprint.outputs["assets/hero.png"], constraint);
  const presentation = { region: "playfield" as const, fit: "contain" as const, logicalSize: { min: 0.08, max: 0.25 }, anchor: constraint.anchor, safeInsetRatio: 0.08, minSourcePixels: 64 };
  const first = imageRequestFingerprint({}, {}, undefined, { "assets/hero.png": presentation });
  const layoutOnly = imageRequestFingerprint({}, {}, undefined, { "assets/hero.png": { ...presentation, region: "hud", logicalSize: { min: 0.12, max: 0.3 } } });
  assert.deepEqual(first, layoutOnly, "region 与逻辑显示尺寸只影响运行布局，不能使付费图片缓存失效");
});

test("cover 的焦点锚点确定裁切位置并显式记录不可逆区域", async () => {
  const source = await circleFixture(600, 400, 60);
  const left = await adaptGeneratedPng(source, { width: 320, height: 180, fit: "cover", anchor: { x: 0, y: 0.5 } });
  const right = await adaptGeneratedPng(source, { width: 320, height: 180, fit: "cover", anchor: { x: 1, y: 0.5 } });
  assert.deepEqual(left.metadata.transform?.crop, { left: 0, top: 17, width: 320, height: 180 });
  assert.deepEqual(right.metadata.transform?.crop, { left: 0, top: 17, width: 320, height: 180 });
  // This source overflows vertically after cover scaling; top/bottom anchors must select different pixels.
  const top = await adaptGeneratedPng(source, { width: 320, height: 180, fit: "cover", anchor: { x: 0.5, y: 0 } });
  const bottom = await adaptGeneratedPng(source, { width: 320, height: 180, fit: "cover", anchor: { x: 0.5, y: 1 } });
  assert.equal(top.metadata.transform?.crop?.top, 0);
  assert.equal(bottom.metadata.transform?.crop?.top, 33);
  assert.notDeepEqual(top.bytes, bottom.bytes);
});

test("cover 对分辨率不足或比例极端的源图明确拒绝，不伪造目标尺寸", async () => {
  await assert.rejects(
    adaptGeneratedPng(await circleFixture(200, 200, 60), { width: 400, height: 200, fit: "cover" }),
    /不足以无损适配/,
  );
  await assert.rejects(
    adaptGeneratedPng(await circleFixture(1024, 1536, 180), { width: 640, height: 360, fit: "cover" }),
    /只能保留较短轴 38% 的画面.*最低要求 65%/,
  );
});

test("透明角色接口拒绝实际不透明的 PNG，不能把 alpha 通道当成已抠图", async () => {
  const opaquePng = providerFixtures.get("1024x1024")!;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => imageResponse(opaquePng),
  });
  await assert.rejects(generator.generateDynamicArt(assetRenovation(fakeProject(), "只替换食物"), ["assets/stage-c/snake-food-v2.png"], {}, {
    "assets/stage-c/snake-food-v2.png": transparentProviderFixtures.get("1024x1024")!,
  }), /未生成|未完整/);
});

test("返回内容不是 PNG 时保留安全失败原因", async () => {
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => imageResponse(Buffer.from("not a png at all, ".repeat(60))),
  });
  await assert.rejects(generator.generate(fakeProject()), /未生成可用图片/);
});

test("动态美术:snake 并行生成局内背景与食物/障碍角色位图,角色请求透明底", async () => {
  const bodies: Array<Record<string, unknown>> = [];
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return imageResponse(providerPng(init));
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
  const roleBodies = bodies.filter((body) => String(body.prompt).includes("角色或道具位图"));
  assert.equal(roleBodies.length, 2);
  for (const body of roleBodies) {
    assert.equal(body.background, "transparent");
    assert.equal(body.size, "1024x1024");
  }
  for (const entry of entries) assert.ok(entry.prompt.length > 0, "提示词必须随产物归档");
});

test("部分资源替换只接受唯一明确槽位，封面和背景不会互相连带", () => {
  assert.deepEqual(resolveAssetRenovationTarget(assetRenovation(fakeProject(), "只替换背景图，保留其他素材")), {
    kind: "single",
    files: ["assets/background.png"],
    label: "局内背景",
  });
  assert.throws(
    () => resolveAssetRenovationTarget(assetRenovation(fakeProject(), "把封面和背景都换掉")),
    /一次只能替换一个资源目标.*游戏封面、局内背景/,
  );
  assert.throws(
    () => resolveAssetRenovationTarget(assetRenovation(fakeProject(), "把素材做得可爱一点")),
    /没有识别出要替换的具体资源.*游戏封面.*局内背景/,
  );
});

test("部分资源替换只调用目标图片，其他动态资源不重新生成", async () => {
  const prompts: string[] = [];
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      const form = init?.body as FormData;
      prompts.push(String(form.get("prompt")));
      return imageResponse(providerFixtures.get(String(form.get("size")))!);
    },
  });
  const project = assetRenovation(fakeProject(), "只替换背景图，保留其他素材");
  const target = resolveAssetRenovationTarget(project);
  const source = providerFixtures.get("1536x1024")!;
  const entries = await generator.generateDynamicArt(project, target.files, {}, { "assets/background.png": source });
  assert.deepEqual(entries.map(({ file }) => file), ["assets/background.png"]);
  assert.equal(prompts.length, 1, "食物与障碍物必须直接复用来源资源，不能产生图片调用");
});

test("部分资源替换使用本地来源 PNG 的 multipart edits，显式质量且不混用 JSON 字段", async () => {
  const source = providerFixtures.get("1536x1024")!;
  let observedUrl = "";
  let observedInit: RequestInit | undefined;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (url, init) => {
      observedUrl = String(url);
      observedInit = init;
      return imageResponse(providerFixtures.get("1536x1024")!);
    },
  });
  const project = assetRenovation(fakeProject(), "只替换背景图，保留棋盘和其他素材");
  const entries = await generator.generateDynamicArt(project, ["assets/background.png"], {
    "assets/background.png": { width: 640, height: 360, fit: "cover" },
  }, { "assets/background.png": source });
  assert.equal(entries.length, 1);
  assert.equal(observedUrl, "https://api.openai.com/v1/images/edits");
  assert.ok(observedInit?.body instanceof FormData);
  assert.equal(new Headers(observedInit?.headers).has("content-type"), false, "multipart boundary 必须由 fetch 设置");
  const form = observedInit!.body as FormData;
  assert.equal(form.get("model"), "gpt-image-2.5-sunburst");
  assert.equal(form.get("quality"), "high");
  assert.equal(form.get("size"), "1536x1024");
  assert.equal(form.get("output_format"), "png");
  assert.equal(form.get("background"), null);
  assert.equal(form.get("images"), null, "multipart edits 不得混入另一种 JSON reference 字段");
  const uploaded = form.get("image");
  assert.ok(uploaded instanceof Blob);
  assert.deepEqual(Buffer.from(await uploaded.arrayBuffer()), source);
  assert.match(String(form.get("prompt")), /参考图 1（来源素材）/);
  assert.match(String(form.get("prompt")), /只改变:只替换背景图/);
  assert.match(String(form.get("prompt")), /必须保持:/);
});

test("部分资源替换缺少来源或 edits 失败时不退回 generations 重画", async () => {
  const project = assetRenovation(fakeProject(), "只替换背景图");
  let calls = 0;
  const urls: string[] = [];
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (url) => { calls += 1; urls.push(String(url)); return new Response("edit rejected", { status: 400 }); },
  });
  await assert.rejects(generator.generateDynamicArt(project, ["assets/background.png"]), /缺少已校验的来源图片.*不会退回无参考重画/);
  assert.equal(calls, 0);
  await assert.rejects(generator.generateDynamicArt(project, ["assets/background.png"], {}, {
    "assets/background.png": providerFixtures.get("1536x1024")!,
  }), /未生成|未完整/);
  assert.deepEqual(urls, ["https://api.openai.com/v1/images/edits"]);
});

test("部分角色替换按来源槽位尺寸交付，并保留透明底和主体比例", async () => {
  const providerRole = await circleFixture(1024, 1024, 330);
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => imageResponse(providerRole),
  });
  const project = assetRenovation(fakeProject(), "只替换食物，保留其他素材");
  const target = resolveAssetRenovationTarget(project);
  const file = target.files[0]!;
  const entries = await generator.generateDynamicArt(project, target.files, {
    [file]: { width: 160, height: 80, fit: "contain" },
  }, { [file]: await circleFixture(160, 80, 26) });
  assert.equal(entries.length, 1);
  assert.deepEqual(await readPngDimensions(entries[0]!.bytes), { width: 160, height: 80, hasAlpha: true, hasTransparency: true });
  assert.deepEqual(entries[0]!.image!.delivered, { width: 160, height: 80, fit: "contain" });
  const subject = await redSubjectBounds(entries[0]!.bytes);
  assert.ok(Math.abs(subject.width - subject.height) <= 2, `局部替换不能把角色压成椭圆，实际 ${subject.width}×${subject.height}`);
  assert.ok(subject.minX > 30 && subject.maxX < 130, "宽槽位两侧应使用透明留白");
});

test("动态美术:单张失败保留安全失败原因", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as { prompt: string };
      if (body.prompt.includes("障碍物")) return new Response("boom", { status: 400 });
      return imageResponse(providerPng(init));
    },
  });
  await assert.rejects(generator.generateDynamicArt(fakeProject()), /未生成|未完整/);
  assert.ok(calls >= 3);
});

test("动态美术:没有密钥时保留每个必需资源的配置失败且不发请求", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(null), {
    fetchImpl: async () => {
      calls += 1;
      throw new Error("不应该发起请求");
    },
  });
  await assert.rejects(generator.generateDynamicArt(fakeProject()), (error: unknown) => {
    const failure = error as { details?: Array<{ category?: string; resource?: { file?: string } }> };
    assert.ok((failure.details?.length ?? 0) >= 2);
    assert.ok(failure.details?.every((detail) => detail.category === "configuration"));
    assert.ok(failure.details?.some((detail) => detail.resource?.file === "assets/background.png"));
    return true;
  });
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
      return imageResponse(providerPng(init));
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

test("成套块面:失败保留安全失败原因", async () => {
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      const prompt = String((JSON.parse(String(init?.body)) as { prompt: string }).prompt);
      if (prompt.includes("第 4 级")) return new Response("boom", { status: 400 });
      return imageResponse(providerPng(init));
    },
  });
  await assert.rejects(generator.generateDynamicArt(fakeMergeProject()), /未生成|未完整/);
});

test("并行资源组失败时汇总每个已启动的必需资源原因", async () => {
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      const prompt = String((JSON.parse(String(init?.body)) as { prompt: string }).prompt);
      if (prompt.includes("场景背景图") || prompt.includes("第 4 级")) return new Response("failed", { status: 400 });
      return imageResponse(providerPng(init));
    },
  });
  await assert.rejects(generator.generateDynamicArt(fakeMergeProject()), (error: unknown) => {
    const failure = error as { details?: Array<{ category?: string; resource?: { file?: string } }> };
    assert.equal(failure.details?.length, 2);
    assert.ok(failure.details?.every((detail) => detail.category === "http"));
    assert.deepEqual(failure.details?.map((detail) => detail.resource?.file).sort(), [
      "assets/background.png", "assets/sprites/sprite-05.png",
    ]);
    return true;
  });
});

test("成套块面目标会解析为完整原子组，选择其中一张会在图片调用前拒绝", async () => {
  const project = assetRenovation(fakeMergeProject(), "只替换数字块块面，保留背景和玩法");
  const target = resolveAssetRenovationTarget(project);
  assert.equal(target.kind, "set");
  assert.equal(target.files.length, 6);
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => { calls += 1; return imageResponse(providerPng(init)); },
  });
  await assert.rejects(generator.generateDynamicArt(project, [target.files[0]!]), /成套块面必须整套替换/);
  assert.equal(calls, 0);
});

test("接口持续 5xx 与质量修复共享每资源三次总请求预算", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => {
      calls += 1;
      return new Response("upstream error", { status: 500 });
    },
  });
  await assert.rejects(generator.generate(fakeProject()), /未生成可用图片/);
  assert.equal(calls, 3);
});

test("透明主体本地校验失败后只重生该资源并携带具体安全反馈", async () => {
  let calls = 0;
  const prompts: string[] = [];
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      calls += 1;
      const body = JSON.parse(String(init?.body)) as { prompt: string; size: string };
      prompts.push(body.prompt);
      return imageResponse(calls === 1 ? providerFixtures.get(body.size)! : transparentProviderFixtures.get(body.size)!);
    },
  });
  const progress: Array<{ label: string; attempt: number; maxAttempts: number; code: string }> = [];
  const bytes = await runWithImageRepairProgress(event => { progress.push({ label: event.resource.label, attempt: event.attempt, maxAttempts: event.maxAttempts, code: event.code }); },
    () => generator.generateRoleBitmap(fakeProject(), { file: "assets/hero.png", role: "主角", hint: "青色小蛇" }));
  assert.ok(bytes);
  assert.equal(calls, 2);
  assert.match(prompts[1]!, /INVALID_ALPHA/);
  assert.match(prompts[1]!, /必须保持：用户要求的角色身份、辨识特征、玩法用途、美术风格、目标画幅与尺寸意图/);
  assert.deepEqual(generatedImageDelivery(bytes!)?.repairs?.map(({ code }) => code), ["INVALID_ALPHA"]);
  assert.deepEqual(progress, [{ label: "主角", attempt: 2, maxAttempts: 3, code: "INVALID_ALPHA" }]);
});

test("认证错误不进入自动资源修复或网络重试", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async () => { calls += 1; return new Response("unauthorized", { status: 401 }); },
  });
  await assert.rejects(generator.generate(fakeProject()), /未生成可用图片/);
  assert.equal(calls, 1);
});

test("质量失败与随后网络失败仍共用三次预算，第三次成功后停止", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), { fetchImpl: async (_url, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as { size: string };
    if (calls === 1) return imageResponse(providerFixtures.get(body.size)!);
    if (calls === 2) return new Response("temporary", { status: 500 });
    return imageResponse(transparentProviderFixtures.get(body.size)!);
  } });
  const bytes = await generator.generateRoleBitmap(fakeProject(), { file: "assets/hero.png", role: "主角", hint: "青色小蛇" });
  assert.ok(bytes);
  assert.equal(calls, 3);
  assert.deepEqual(generatedImageDelivery(bytes!)?.repairs?.map(({ code }) => code), ["INVALID_ALPHA"]);
});

test("质量失败用尽三次后保持硬失败，不发起第四次请求", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), { fetchImpl: async (_url, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as { size: string };
    return imageResponse(providerFixtures.get(body.size)!);
  } });
  await assert.rejects(generator.generateRoleBitmap(fakeProject(), { file: "assets/hero.png", role: "主角", hint: "青色小蛇" }), (error: unknown) => {
    const detail = (error as { details?: Array<{ category?: string; retryable?: boolean; nextStep?: string; continuation?: { kind?: string; resourceFile?: string } }> }).details?.[0];
    assert.equal(detail?.category, "invalid-image");
    assert.equal(detail?.retryable, false);
    assert.match(detail?.nextStep ?? "", /系统已用完本轮资源修复次数/);
    assert.deepEqual(detail?.continuation, { kind: "regenerate-resource", resourceFile: "assets/hero.png" });
    return true;
  });
  assert.equal(calls, 3);
});

test("非关键修复进度写入失败不丢弃随后通过的付费资源结果", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), { fetchImpl: async (_url, init) => {
    calls += 1;
    const body = JSON.parse(String(init?.body)) as { size: string };
    return imageResponse(calls === 1 ? providerFixtures.get(body.size)! : transparentProviderFixtures.get(body.size)!);
  } });
  const bytes = await runWithImageRepairProgress(() => { throw new Error("progress database unavailable"); },
    () => generator.generateRoleBitmap(fakeProject(), { file: "assets/hero.png", role: "主角", hint: "青色小蛇" }));
  assert.ok(bytes);
  assert.equal(calls, 2);
});

test("额度不足只请求一次且不进入自动修复", async () => {
  let calls = 0;
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), { fetchImpl: async () => {
    calls += 1;
    return new Response('{"error":{"code":"insufficient_quota"}}', { status: 429 });
  } });
  await assert.rejects(generator.generate(fakeProject()), /未生成可用图片/);
  assert.equal(calls, 1);
});

test("并行资源中只重新生成失败项，已通过资源不重复计费", async () => {
  const calls = new Map<string, number>();
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), { fetchImpl: async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { prompt: string; size: string; background?: string };
    const resource = body.prompt.includes("位图:食物") ? "food" : body.prompt.includes("位图:障碍物") ? "obstacle" : "background";
    calls.set(resource, (calls.get(resource) ?? 0) + 1);
    if (resource === "food" && calls.get(resource) === 1) return imageResponse(providerFixtures.get(body.size)!);
    return imageResponse((body.background === "transparent" ? transparentProviderFixtures : providerFixtures).get(body.size)!);
  } });
  const entries = await generator.generateDynamicArt(fakeProject());
  assert.equal(entries.length, 3);
  assert.deepEqual(Object.fromEntries(calls), { background: 1, food: 2, obstacle: 1 });
});

test("生成式游戏的局内主体进入图片计划，与背景同批生成并共享风格锚点", () => {
  const blueprint = {
    mechanicIds: [MECHANIC_ATLAS[0].id],
    modifierIds: [DESIGN_MODIFIERS[0].id],
    coreDecision: "每次只能带走一枚贝壳，先救临浪的还是先凑同色。",
    tension: "篮子格位有限，顺序错了稀有贝壳会被浪带走。",
    masterySignal: "熟练玩家先清临浪区再凑色，用更少步数装满。",
    sprites: [
      { file: "assets/shell-scallop.png", role: "大扇贝", hint: "粉橙扇形贝壳，放射纹清晰", presentation: { region: "playfield", fit: "contain", logicalSize: { min: 0.08, max: 0.22 }, anchor: { x: 0.25, y: 0.75 }, safeInsetRatio: 0.12, minSourcePixels: 96 } },
      { file: "assets/basket.png", role: "竹篮", hint: "浅色编织竹篮，正面开口", presentation: { region: "hud", fit: "contain", logicalSize: { min: 0.1, max: 0.25 }, anchor: { x: 0.5, y: 0.5 }, safeInsetRatio: 0.08, minSourcePixels: 128 } },
    ],
  };
  const spec = generateGameSpec({ idea: "海边捡贝壳装满竹篮，五关数量递增，不会失败。", template: "generated" });
  const project = { id: "p-shell", title: "海边贝壳收集", spec: { ...spec, designProfile: { ...spec.designProfile, generatedBlueprint: blueprint } } } as unknown as ProjectDetail;
  const plan = dynamicArtPlan(project);
  assert.deepEqual(plan.map(({ file }) => file), ["assets/shell-scallop.png", "assets/basket.png"]);
  const scallop = plan.find(({ file }) => file === "assets/shell-scallop.png")!;
  assert.match(scallop.prompt, /放射纹清晰/);
  assert.match(scallop.prompt, /同一款游戏的一套局内主体位图之一，共 2 张/, "同批主体必须共享风格锚点");
  assert.match(scallop.prompt, /完全透明背景/);
  // 非 generated 模板仍保留既有图片计划。
  const templatePlan = dynamicArtPlan(fakeProject()).map(({ file }) => file);
  assert.ok(templatePlan.includes("assets/background.png"));
});

test("生成式游戏的局内主体真的会被生成，产物与计划逐项一致", async () => {
  const scallopPresentation = { region: "playfield" as const, fit: "contain" as const, logicalSize: { min: 0.08, max: 0.22 }, anchor: { x: 0.25, y: 0.75 }, safeInsetRatio: 0.12, minSourcePixels: 96 };
  const blueprint = {
    mechanicIds: [MECHANIC_ATLAS[0].id],
    modifierIds: [DESIGN_MODIFIERS[0].id],
    coreDecision: "每次只能带走一枚贝壳，先救临浪的还是先凑同色。",
    tension: "篮子格位有限，顺序错了稀有贝壳会被浪带走。",
    masterySignal: "熟练玩家先清临浪区再凑色，用更少步数装满。",
    sprites: [
      { file: "assets/shell-scallop.png", role: "大扇贝", hint: "粉橙扇形贝壳，放射纹清晰", presentation: scallopPresentation },
      { file: "assets/basket.png", role: "竹篮", hint: "浅色编织竹篮，正面开口", presentation: { region: "hud" as const, fit: "contain" as const, logicalSize: { min: 0.1, max: 0.25 }, anchor: { x: 0.5, y: 0.5 }, safeInsetRatio: 0.08, minSourcePixels: 128 } },
    ],
  };
  const spec = generateGameSpec({ idea: "海边捡贝壳装满竹篮，五关数量递增，不会失败。", template: "generated" });
  const project = { id: "p-shell", title: "海边贝壳收集", spec: { ...spec, designProfile: { ...spec.designProfile, generatedBlueprint: blueprint } } } as unknown as ProjectDetail;
  const prompts: string[] = [];
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      prompts.push(String((JSON.parse(String(init?.body)) as { prompt: string }).prompt));
      return imageResponse(providerPng(init));
    },
  });
  const entries = await generator.generateDynamicArt(project);
  const plan = dynamicArtPlan(project);
  // 图像检查点按下标比对计划与产物：文件、角色、提示词、顺序都必须一致。
  assert.deepEqual(entries.map(({ file, role, prompt }) => ({ file, role, prompt })), plan);
  assert.equal(prompts.length, plan.length, "蓝图声明的每张局内主体都要真的调用生图接口");
  assert.ok(prompts.some(prompt => /大扇贝/.test(prompt) && /完全透明背景/.test(prompt)));
  const scallop = entries.find(entry => entry.file === "assets/shell-scallop.png")!;
  assert.deepEqual(scallop.image?.presentation, blueprint.sprites[0]!.presentation);
  assert.deepEqual(scallop.image?.transform?.anchor, { x: 0.25, y: 0.75 });
  assert.equal(scallop.image?.transform?.safeInsetRatio, 0.12);
  assert.equal(scallop.image?.transform?.minSourcePixels, 96);
  assert.equal(scallop.image?.transform?.requireAlpha, true);
  const pipelineOutputs = imageOutputConstraintsForProject(project);
  assert.deepEqual(pipelineOutputs["assets/shell-scallop.png"], { width: 1024, height: 1024, fit: "contain", requireAlpha: true, anchor: { x: 0.25, y: 0.75 }, safeInsetRatio: 0.12, minSourcePixels: 96 });
  const pipelineFingerprint = imageRequestFingerprint({}, pipelineOutputs, undefined, spritePresentationContracts(project));
  assert.deepEqual(pipelineFingerprint.presentations["assets/shell-scallop.png"], { fit: "contain", anchor: { x: 0.25, y: 0.75 }, safeInsetRatio: 0.12, minSourcePixels: 96 });
});

test("动画主体使用单次整sheet草稿并逐格打包，归档真实网格元数据", async () => {
  const animation: SpriteSheetAnimation = {
    frameWidth: 64, frameHeight: 64, columns: 4, rows: 1, frameCount: 4, anchor: { x: 32, y: 58 },
    clips: [{ id: "idle", startFrame: 0, frameCount: 4, fps: 6, loop: true }],
  };
  const providerDraft = await packAnimationSpriteSheet(await Promise.all(Array.from({ length: 4 }, () => circleFixture(160, 120, 36))), animation);
  const blueprint = {
    mechanicIds: [MECHANIC_ATLAS[0].id], modifierIds: [DESIGN_MODIFIERS[0].id],
    coreDecision: "每次只能带走一枚贝壳，需要判断先救临浪的还是先凑同色。",
    tension: "篮子格位有限，顺序错误时稀有贝壳会被海浪带走。",
    masterySignal: "熟练玩家先清临浪区再凑色，并用更少步骤装满竹篮。",
    sprites: [
      { file: "assets/runner.png", role: "奔跑者", hint: "同一个蓝色机械角色，侧面视角轮廓清楚", presentation: { region: "playfield", fit: "contain", logicalSize: { min: 0.12, max: 0.28 }, anchor: { x: 0.5, y: 0.9 }, safeInsetRatio: 0.08, minSourcePixels: 48 }, animation },
      { file: "assets/basket.png", role: "竹篮", hint: "浅色编织竹篮，正面开口清楚" },
    ],
  };
  const base = generateGameSpec({ idea: "机械角色在海边收集贝壳。", template: "generated" });
  const project = { id: "p-animated", title: "海岸奔跑", spec: { ...base, designProfile: { ...base.designProfile, generatedBlueprint: blueprint } } } as unknown as ProjectDetail;
  const spec = blueprint.sprites[0]!;
  let calls = 0;
  let body: Record<string, unknown> = {};
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (_url, init) => {
      calls += 1;
      body = JSON.parse(String(init?.body));
      return imageResponse(providerDraft.bytes);
    },
  });
  const entry = await generator.generateAnimationSpriteSheet(project, spec);
  assert.ok(entry);
  assert.equal(calls, 1, "四帧动画必须来自一次统一草稿，不能独立多次生成后冒充一致");
  assert.equal(body.background, "transparent");
  assert.match(String(body.prompt), /严格 4 列 × 1 行/);
  assert.match(String(body.prompt), /不能保证达到手工动画的一致性/);
  assert.deepEqual(await readPngDimensions(entry.bytes), { width: 256, height: 64, hasAlpha: true, hasTransparency: true });
  assert.equal(entry.image!.delivered.fit, "sprite-sheet");
  assert.deepEqual(entry.image!.spriteSheet, animation);
  assert.equal(entry.image!.providerFrames!.length, 4);
  assert.deepEqual(entry.image!.presentation, spec.presentation, "动画显示合同必须进入归档，但不能对整张 sheet 做 contain 或破坏网格");
  assert.equal(entry.image!.transform, undefined);

  // A legacy role starts as one transparent PNG. Its upgrade must submit that
  // exact source as a reference and then split the returned draft into cells;
  // it must never assume the source is already a packed sheet.
  const staticReference = await circleFixture(160, 160, 38);
  let staticEditUrl = "";
  let staticEditForm: FormData | null = null;
  project.spec.renovation = { sourceProjectId: "p-source", revisionScope: "assets", request: "让奔跑者成为精灵动图", assetTarget: { kind: "single", files: [spec.file], label: spec.role } };
  const staticUpgradeGenerator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (url, init) => {
      staticEditUrl = String(url);
      staticEditForm = init?.body as FormData;
      return imageResponse(providerDraft.bytes);
    },
  });
  const staticUpgrade = await staticUpgradeGenerator.generateAnimationSpriteSheet(project, spec, { sourceSheet: staticReference });
  assert.ok(staticUpgrade);
  assert.equal(staticEditUrl, "https://api.openai.com/v1/images/edits");
  assert.ok(staticEditForm instanceof FormData);
  assert.equal(staticEditForm!.get("model"), "gpt-image-2.5-sunburst");
  assert.equal(staticEditForm!.get("quality"), "high");
  assert.equal(staticEditForm!.get("size"), "1536x1024");
  assert.equal(staticEditForm!.get("background"), "transparent");
  assert.deepEqual(Buffer.from(await (staticEditForm!.get("image") as Blob).arrayBuffer()), staticReference);
  assert.deepEqual(await readPngDimensions(staticUpgrade.bytes), { width: 256, height: 64, hasAlpha: true, hasTransparency: true });

  project.spec.renovation = { sourceProjectId: "p-source", revisionScope: "assets", request: "只替换奔跑者整套人物美术", assetTarget: { kind: "single", files: [spec.file], label: spec.role } };
  let wholeEditUrl = "";
  let wholeEditForm: FormData | null = null;
  const wholeEditGenerator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (url, init) => {
      wholeEditUrl = String(url);
      wholeEditForm = init?.body as FormData;
      return imageResponse(providerDraft.bytes);
    },
  });
  const wholeReplacement = await wholeEditGenerator.generateAnimationSpriteSheet(project, spec, { sourceSheet: entry.bytes });
  assert.ok(wholeReplacement);
  assert.equal(wholeEditUrl, "https://api.openai.com/v1/images/edits");
  assert.ok(wholeEditForm instanceof FormData);
  assert.equal(wholeEditForm!.get("quality"), "high");
  assert.equal(wholeEditForm!.get("background"), "transparent");
  assert.deepEqual(Buffer.from(await (wholeEditForm!.get("image") as Blob).arrayBuffer()), entry.bytes, "整套人物换皮也必须用来源 sheet 作参考");
  assert.deepEqual(await readPngDimensions(wholeReplacement.bytes), { width: 256, height: 64, hasAlpha: true, hasTransparency: true });
  assert.equal(wholeReplacement.image!.delivered.fit, "sprite-sheet");
  assert.deepEqual(wholeReplacement.image!.spriteSheet, animation);

  project.spec.renovation = { sourceProjectId: "p-source", revisionScope: "assets", request: "只替换待机动作", assetTarget: { kind: "single", files: [spec.file], label: spec.role, clipId: "idle" } };
  let editUrl = "";
  let editForm: FormData | null = null;
  const editGenerator = new CoverArtGenerator(new OpenAISettings(validKey), {
    fetchImpl: async (url, init) => {
      editUrl = String(url);
      editForm = init?.body as FormData;
      return imageResponse(providerDraft.bytes);
    },
  });
  const replacement = await editGenerator.generateAnimationSpriteSheet(project, spec, { sourceSheet: entry.bytes, clipId: "idle" });
  assert.ok(replacement);
  assert.equal(editUrl, "https://api.openai.com/v1/images/edits");
  assert.ok(editForm instanceof FormData);
  assert.equal(editForm!.get("quality"), "high");
  assert.equal(editForm!.get("background"), "transparent");
  assert.deepEqual(Buffer.from(await (editForm!.get("image") as Blob).arrayBuffer()), entry.bytes, "动作替换必须用已验证来源 sheet 作参考");
  assert.match(String(editForm!.get("prompt")), /只改变:/);
});

test("动画草稿透明度失败后自动定向重生，且不把失败结果写成成功", async () => {
  const animation: SpriteSheetAnimation = {
    frameWidth: 64, frameHeight: 64, columns: 4, rows: 1, frameCount: 4, anchor: { x: 32, y: 58 },
    clips: [{ id: "idle", startFrame: 0, frameCount: 4, fps: 6, loop: true }],
  };
  const validDraft = await packAnimationSpriteSheet(await Promise.all(Array.from({ length: 4 }, () => circleFixture(160, 120, 36))), animation);
  const opaqueDraft = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 1 } } }).png().toBuffer();
  const base = generateGameSpec({ idea: "机械角色在海边收集贝壳。", template: "generated" });
  const project = { id: "p-repair-animation", title: "自动修复动画", spec: base } as unknown as ProjectDetail;
  const spec = { file: "assets/runner.png", role: "奔跑者", hint: "同一个蓝色机械角色", animation };
  const prompts: string[] = [];
  const generator = new CoverArtGenerator(new OpenAISettings(validKey), { fetchImpl: async (_url, init) => {
    const body = JSON.parse(String(init?.body)) as { prompt: string };
    prompts.push(body.prompt);
    return imageResponse(prompts.length === 1 ? opaqueDraft : validDraft.bytes);
  } });
  const entry = await generator.generateAnimationSpriteSheet(project, spec);
  assert.ok(entry);
  assert.equal(prompts.length, 2);
  assert.match(prompts[1]!, /INVALID_ALPHA/);
  assert.deepEqual(entry.image?.repairs?.map(({ code }) => code), ["INVALID_ALPHA"]);
  assert.deepEqual(await readPngDimensions(entry.bytes), { width: 256, height: 64, hasAlpha: true, hasTransparency: true });
});
