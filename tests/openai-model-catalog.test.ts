import test from "node:test";
import assert from "node:assert/strict";
import { modelCatalog, fetchModelCatalog } from "../src/server/openai-model-catalog.js";
import { OpenAISettings } from "../src/server/openai-settings.js";
import { CoverArtGenerator } from "../src/server/image-generator.js";
import { generateGameSpec, type ProjectDetail } from "../src/shared/contracts.js";
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
  for (const text of ["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna", "gpt-6-astra"]) {
    await settings.save({ models: { text, image: "gpt-image-2" } }, fetcher);
    await settings.listModels({}, fetcher);
    assert.equal(settings.status().models.text, text);
  }
});

test("按数字版本而非字符串排序；推荐稳定完整型号，排除不兼容用途", () => {
  const result = modelCatalog(payload);
  assert.deepEqual(result.recommended, { text: "gpt-5.10", image: "gpt-image-3" });
  assert.equal(result.text.length, 4);
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
test("没有兼容图像模型时不保存虚假的推荐项", async () => {
  const settings = new OpenAISettings(null);
  await assert.rejects(settings.save({ apiKey: key }, (async () => new Response(JSON.stringify({data:[{id:"gpt-5.10",created:1}]}))) as typeof fetch), /图像模型/);
  assert.equal(settings.getApiKey(), null);
});

test("保存后真实生图请求体使用用户选择的型号", async () => {
  const settings = new OpenAISettings(null);
  await settings.save({ apiKey: key }, remote);
  let used = "";
  const png = Buffer.concat([Buffer.from([0x89,0x50,0x4e,0x47]),Buffer.alloc(900)]);
  const generator = new CoverArtGenerator(settings, { fetchImpl: async (_url, init) => {
    used = JSON.parse(String(init?.body)).model;
    return new Response(JSON.stringify({data:[{b64_json:png.toString("base64")}]}));
  }});
  const project = { id: "model-test", title: "测试游戏", spec: generateGameSpec({idea:"一个经典俄罗斯方块小游戏"}) } as ProjectDetail;
  assert.ok(await generator.generate(project));
  assert.equal(used, "gpt-image-3");
});
