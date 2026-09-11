import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { modelCatalog, fetchModelCatalog, modelCatalogConnectionError } from "../src/server/openai-model-catalog.js";
import { OPENAI_IMAGE_MODEL, OPENAI_TEXT_MODEL, OpenAISettings } from "../src/server/openai-settings.js";
import { CoverArtGenerator } from "../src/server/image-generator.js";
import { generateGameSpec, type ProjectDetail } from "../src/shared/contracts.js";

const key = "sk-test_1234567890abcdef";
const fixedCatalog = { data: [
  "gpt-6-astra", "gpt-5.6-terra", "gpt-5.6-sol", "gpt-image-3", "gpt-image-2.5-sunburst",
].map((id, created) => ({ id, created })) };

 test("目录仍正确识别 Terra、Sunburst 和合法快照", () => {
  const catalog = modelCatalog({ data: [
    { id: "gpt-5.6-terra", created: 1 },
    { id: "gpt-image-2.5-sunburst", created: 2 },
    { id: "gpt-image-2.5-sunburst-2026-09-08", created: 3 },
    { id: "gpt-image-2.5-sunburn", created: 4 },
  ] });
  assert.deepEqual(catalog.text.map(model => model.id), ["gpt-5.6-terra"]);
  assert.deepEqual(catalog.image.map(model => model.id), ["gpt-image-2.5-sunburst", "gpt-image-2.5-sunburst-2026-09-08"]);
});

test("保存旧模型偏好不会改写固定的生产请求模型", async () => {
  const settings = new OpenAISettings(null);
  await settings.save({ apiKey: key, models: { text: "gpt-6-astra", image: "gpt-image-3" } });
  assert.deepEqual(settings.status().models, { text: OPENAI_TEXT_MODEL, image: OPENAI_IMAGE_MODEL });
  for (const role of ["planner", "executor", "reviewer"] as const) {
    assert.deepEqual(settings.textRequestOptions(role), { model: "gpt-5.6-terra", reasoning_effort: "low" });
  }
  await settings.listModels({}, (async () => new Response(JSON.stringify(fixedCatalog))) as typeof fetch);
  assert.deepEqual(settings.status().models, { text: "gpt-5.6-terra", image: "gpt-image-2.5-sunburst" });
});

test("目录刷新与旧 session 选择都不会改变固定模型", async () => {
  const settings = new OpenAISettings(null);
  settings.set({ apiKey: key });
  await settings.listModels({}, (async () => new Response(JSON.stringify({ data: [{ id: "gpt-5.10", created: 1 }, { id: "gpt-image-3", created: 1 }] }))) as typeof fetch);
  await settings.save({ models: { text: "gpt-5.10", image: "gpt-image-3" } });
  assert.equal(settings.status().models.text, "gpt-5.6-terra");
  assert.equal(settings.status().models.image, "gpt-image-2.5-sunburst");
});

test("模型目录连接错误仍分开说明网络和鉴权", async () => {
  assert.match(modelCatalogConnectionError({ cause: { code: "UND_ERR_CONNECT_TIMEOUT" } }).message, /连接模型服务超时/);
  assert.match(modelCatalogConnectionError({ cause: { code: "ENOTFOUND" } }).message, /域名解析失败/);
  await assert.rejects(fetchModelCatalog(key, (async () => new Response("private", { status: 401 })) as typeof fetch), /API Key 无效/);
});

test("图片请求使用固定的 Sunburst 模型，而非旧客户端选择", async () => {
  const settings = new OpenAISettings(null);
  await settings.save({ apiKey: key, models: { text: "gpt-5.10", image: "gpt-image-3" } });
  let used = "";
  const png = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: "#3f7f68" } }).png().toBuffer();
  const generator = new CoverArtGenerator(settings, { fetchImpl: async (_url, init) => {
    used = JSON.parse(String(init?.body)).model;
    return new Response(JSON.stringify({ data: [{ b64_json: png.toString("base64") }] }));
  }});
  const project = { id: "model-test", title: "测试游戏", spec: generateGameSpec({ idea: "一个经典俄罗斯方块小游戏", aspectRatio: "16:9" }) } as ProjectDetail;
  assert.ok(await generator.generate(project));
  assert.equal(used, "gpt-image-2.5-sunburst");
});
