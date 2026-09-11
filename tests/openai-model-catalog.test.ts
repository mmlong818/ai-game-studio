import test from "node:test";
import assert from "node:assert/strict";
import { modelCatalog, fetchModelCatalog, modelCatalogConnectionError } from "../src/server/openai-model-catalog.js";
import { OpenAISettings } from "../src/server/openai-settings.js";
import { CoverArtGenerator } from "../src/server/image-generator.js";
import { generateGameSpec, type ProjectDetail } from "../src/shared/contracts.js";
import sharp from "sharp";
const key = "sk-test_1234567890abcdef";
const payload = { data: ["gpt-5.9","gpt-5.10","gpt-5.10-mini","gpt-5.10-2026-09-01","gpt-image-2","gpt-image-3","gpt-5.10-audio","text-embedding-3-large"].map((id, i) => ({ id, created: 100+i })) };
const remote = (async () => new Response(JSON.stringify(payload))) as typeof fetch;

const namedPayload = { data: [
  "gpt-6-astra-2026-09-01", "gpt-6-astra", "gpt-5.6-sol",
  "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5", "gpt-image-2",
  "gpt-6-astra-audio", "gpt-5.6-cyber", "gpt-6-search-api", "gpt-6-unknown",
].map((id, i) => ({ id, created: 100 + i })) };

test("GPT-6 Astra 与 GPT-5.6 命名型号保留，最新旗舰优先且不放行专用型号", () => {
  const result = modelCatalog(namedPayload);
  assert.deepEqual(result.text.map(model => model.id), [
    "gpt-6-astra", "gpt-6-astra-2026-09-01", "gpt-5.6-sol",
    "gpt-5.6-terra", "gpt-5.6-luna", "gpt-5.5",
  ]);
  assert.equal(result.recommended.text, "gpt-6-astra");
  const withoutSix = modelCatalog({ data: namedPayload.data.filter(model => !model.id.startsWith("gpt-6")) });
  assert.equal(withoutSix.recommended.text, "gpt-5.6-sol");
});

test("直接保存推荐 GPT-6；手动选择 GPT-5.6 后再次读取列表不覆盖选择", async () => {
  const settings = new OpenAISettings(null);
  const fetcher = (async () => new Response(JSON.stringify(namedPayload))) as typeof fetch;
  assert.equal((await settings.save({ apiKey: key }, fetcher)).models.text, "gpt-6-astra");
  assert.deepEqual(settings.status().textRouting, {
    planner: "gpt-6-astra", executor: "gpt-5.6-sol", reviewer: "gpt-6-astra", mode: "split", reason: "catalog-route",
  });
  assert.equal(settings.textRequestOptions("planner").model, "gpt-6-astra");
  assert.equal(settings.textRequestOptions("executor").model, "gpt-5.6-sol");
  assert.equal(settings.textRequestOptions("reviewer").model, "gpt-6-astra");
  for (const text of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"]) {
    await settings.save({ models: { text, image: "gpt-image-2" } }, fetcher);
    await settings.listModels({}, fetcher);
    assert.equal(settings.status().models.text, text);
  }
});

test("执行模型只来自当前密钥已发现目录；目录缺失、换Key和未知规划模型均保守同模型", async () => {
  const settings = new OpenAISettings(null);
  assert.equal(settings.status().textRouting?.reason, "catalog-unavailable");
  await settings.save({ apiKey: key, models: { text: "gpt-5.6-sol", image: "gpt-image-2" } }, (async () => new Response(JSON.stringify(namedPayload))) as typeof fetch);
  assert.deepEqual(settings.textRequestOptions("executor"), { model: "gpt-5.6-terra", reasoning_effort: "low" });
  settings.set({ apiKey: `${key}changed` });
  assert.equal(settings.status().textRouting?.reason, "catalog-unavailable");
  assert.equal(settings.textRequestOptions("executor").model, "gpt-5.6-sol");

  const unknown = new OpenAISettings(null);
  await unknown.save({ apiKey: key, models: { text: "gpt-5.5", image: "gpt-image-2" } }, (async () => new Response(JSON.stringify(namedPayload))) as typeof fetch);
  assert.deepEqual(unknown.status().textRouting, {
    planner: "gpt-5.5", executor: "gpt-5.5", reviewer: "gpt-5.5", mode: "same-model", reason: "no-qualified-executor",
  });
});

test("目录网络缓存到期不会在长制作中悄悄改变已确认的执行模型", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const settings = new OpenAISettings(null);
    await settings.save({ apiKey: key }, (async () => new Response(JSON.stringify(namedPayload))) as typeof fetch);
    assert.equal(settings.textRequestOptions("executor").model, "gpt-5.6-sol");
    now += 120_000;
    assert.equal(settings.textRequestOptions("executor").model, "gpt-5.6-sol");
    assert.equal(settings.status().textRouting?.mode, "split");
  } finally {
    Date.now = originalNow;
  }
});

test("同一Key成功刷新目录后才更新角色快照", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const settings = new OpenAISettings(null);
    const initial = (async () => new Response(JSON.stringify(namedPayload))) as typeof fetch;
    await settings.save({ apiKey: key }, initial);
    assert.equal(settings.textRequestOptions("executor").model, "gpt-5.6-sol");
    now += 120_000;
    const refreshed = (async () => new Response(JSON.stringify({ data: [
      { id: "gpt-6-astra", created: 3 }, { id: "gpt-image-2", created: 1 },
    ] }))) as typeof fetch;
    await settings.listModels({}, refreshed);
    assert.equal(settings.status().textRouting?.reason, "no-qualified-executor");
    assert.equal(settings.textRequestOptions("executor").model, "gpt-6-astra");
  } finally {
    Date.now = originalNow;
  }
});

test("成功刷新确认规划模型消失后阻止新文本请求，不猜测替换模型", async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const settings = new OpenAISettings(null);
    await settings.save({ apiKey: key }, (async () => new Response(JSON.stringify(namedPayload))) as typeof fetch);
    now += 120_000;
    await settings.listModels({}, (async () => new Response(JSON.stringify({ data: [
      { id: "gpt-5.6-sol", created: 2 }, { id: "gpt-5.6-terra", created: 1 }, { id: "gpt-image-2", created: 1 },
    ] }))) as typeof fetch);
    assert.equal(settings.status().textRouting?.reason, "planner-unavailable");
    assert.throws(() => settings.textRequestOptions("planner"), /已不在此 API Key/);
    assert.throws(() => settings.textRequestOptions("executor"), /重新选择并保存/);
    assert.throws(() => settings.textRequestOptions("reviewer"), /重新选择并保存/);
  } finally {
    Date.now = originalNow;
  }
});

test("按数字版本而非字符串排序；推荐稳定完整型号，排除不兼容用途", () => {
  const result = modelCatalog(payload);
  assert.deepEqual(result.recommended, { text: "gpt-5.10", image: "gpt-image-3" });
  assert.equal(result.text.length, 4);
});
test("目录精确保留 GPT Image 2.5 Sunburst/Flare 及官方快照", async () => {
  const imageIds = [
    "gpt-image-2.5-sunburst",
    "gpt-image-2.5-sunburst-2026-09-08",
    "gpt-image-2.5-flare",
    "gpt-image-2.5-flare-2026-09-08",
  ];
  const catalog = modelCatalog({ data: [
    { id: "gpt-5.10", created: 1 },
    ...imageIds.map((id, index) => ({ id, created: 10 + index })),
    { id: "gpt-image-2.5-sunburn", created: 99 },
    { id: "gpt-image-2.5-flare-preview", created: 99 },
  ] });
  assert.deepEqual(new Set(catalog.image.map(({ id }) => id)), new Set(imageIds));

  const settings = new OpenAISettings(null);
  const fetcher = (async () => new Response(JSON.stringify({ data: [
    { id: "gpt-5.10", created: 1 },
    ...imageIds.map((id, index) => ({ id, created: 10 + index })),
  ] }))) as typeof fetch;
  await settings.save({ apiKey: key, models: { text: "gpt-5.10", image: "gpt-image-2.5-sunburst" } }, fetcher);
  assert.equal(settings.status().models.image, "gpt-image-2.5-sunburst");
});
test("预览不保存 Key；直接保存自动选择最新，之后可调整并保存", async () => {
  const settings = new OpenAISettings(null);
  await settings.listModels({ apiKey: key }, remote);
  assert.equal(settings.getApiKey(), null);
  const saved = await settings.save({ apiKey: key }, remote);
  assert.deepEqual(saved.models, { text: "gpt-5.10", image: "gpt-image-3" });
  assert.equal(JSON.stringify(saved).includes(key), false);
  await settings.save({ models: { text: "gpt-5.9", image: "gpt-image-2" } }, remote);
  assert.equal(settings.status().models.text, "gpt-5.9");
  await assert.rejects(settings.save({ models: { text: "gpt-nope", image: "gpt-image-2" } }, remote));
  assert.equal(settings.status().models.text, "gpt-5.9");
});
test("换 Key 重新验证；失败不污染原配置，不泄露远端错误正文", async () => {
  const settings = new OpenAISettings(null);
  await settings.save({ apiKey: key }, remote);
  const bad = (async () => new Response(key, { status: 401 })) as typeof fetch;
  await assert.rejects(settings.save({ apiKey: key+"other" }, bad), /API Key 无效/);
  assert.equal(settings.getApiKey(), key);
  await assert.rejects(fetchModelCatalog(key, (async () => { throw new Error(key); }) as typeof fetch), /检查网络/);
});
test("模型目录把连接失败与 Key 的 HTTP 鉴权失败分开说明", async () => {
  assert.match(modelCatalogConnectionError({ cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }).message, /连接模型服务超时.*尚未送达/);
  assert.match(modelCatalogConnectionError({ cause: { code: "ENOTFOUND" } }).message, /域名解析失败.*尚未送达/);
  assert.match(modelCatalogConnectionError({ cause: { code: "ECONNREFUSED" } }).message, /连接被拒绝.*尚未送达/);
  assert.match(modelCatalogConnectionError({ cause: { code: "CERT_HAS_EXPIRED" } }).message, /安全连接校验失败.*尚未送达/);
  assert.doesNotMatch(modelCatalogConnectionError({ name: "AbortError" }).message, /尚未送达/);
  assert.match(modelCatalogConnectionError({ name: "AbortError" }).message, /未能确认 API Key 是否有效/);
  assert.doesNotMatch(modelCatalogConnectionError({ cause: { code: "ETIMEDOUT" } }).message, /尚未送达/);
  assert.match(modelCatalogConnectionError({ cause: { code: "ETIMEDOUT" } }).message, /未能确认 API Key 是否有效/);
  assert.doesNotMatch(modelCatalogConnectionError({ cause: { code: "UND_ERR_SOCKET" } }).message, /尚未送达/);
  assert.match(modelCatalogConnectionError({ cause: { code: "UND_ERR_SOCKET" } }).message, /未能确认 API Key 是否有效/);
  assert.match(modelCatalogConnectionError(new Error("private upstream detail")).message, /尚未完成远端验证/);
  await assert.rejects(fetchModelCatalog(key, (async () => new Response("private", { status: 401 })) as typeof fetch), /API Key 无效/);
  await assert.rejects(fetchModelCatalog(key, (async () => new Response("private", { status: 403 })) as typeof fetch), /无权读取模型列表/);
});
test("没有兼容图像模型时不保存虚假的推荐项", async () => {
  const settings = new OpenAISettings(null);
  await assert.rejects(settings.save({ apiKey: key }, (async () => new Response(JSON.stringify({data:[{id:"gpt-5.10",created:1}]}))) as typeof fetch), /图像模型/);
  assert.equal(settings.getApiKey(), null);
});

test("保存后真实生图请求体使用用户选择的型号", async () => {
  const settings = new OpenAISettings(null);
  await settings.save({ apiKey: key }, remote);
  let used = "";
  const png = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#3f7f68" } }).png().toBuffer();
  const generator = new CoverArtGenerator(settings, { fetchImpl: async (_url, init) => {
    used = JSON.parse(String(init?.body)).model;
    return new Response(JSON.stringify({data:[{b64_json:png.toString("base64")}]}));
  }});
  const project = { id: "model-test", title: "测试游戏", spec: generateGameSpec({ idea: "一个经典俄罗斯方块小游戏", aspectRatio: "16:9" }) } as ProjectDetail;
  assert.ok(await generator.generate(project));
  assert.equal(used, "gpt-image-3");
});
