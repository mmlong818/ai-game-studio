import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { OpenAISettings, OPENAI_IMAGE_MODEL, OPENAI_TEXT_MODEL } from "../src/server/openai-settings";

const validKey = "sk-test_1234567890abcdef";

test("模型设置只公开 GPT-5.6 与 GPT Image 2", () => {
  const settings = new OpenAISettings(null);
  assert.deepEqual(settings.status(), {
    provider: "openai",
    configured: false,
    source: null,
    models: { text: OPENAI_TEXT_MODEL, image: OPENAI_IMAGE_MODEL },
  });
  assert.equal(OPENAI_TEXT_MODEL, "gpt-5.6");
  assert.equal(OPENAI_IMAGE_MODEL, "gpt-image-2");
});

test("会话密钥不会出现在返回状态中，并可安全清除", () => {
  const settings = new OpenAISettings(null);
  const status = settings.set({ apiKey: validKey });
  assert.equal(status.configured, true);
  assert.equal(status.source, "session");
  assert.equal(JSON.stringify(status).includes(validKey), false);
  assert.equal(settings.getApiKey(), validKey);
  assert.deepEqual(settings.clearSessionKey(), {
    provider: "openai",
    configured: false,
    source: null,
    models: { text: "gpt-5.6", image: "gpt-image-2" },
  });
});

test("环境变量密钥可作为重启后仍生效的配置，且前端不能清除", () => {
  const environmentKey = "sk-env_1234567890abcdef";
  const settings = new OpenAISettings(environmentKey);
  settings.set({ apiKey: validKey });
  assert.equal(settings.status().source, "session");
  assert.equal(settings.clearSessionKey().source, "environment");
  assert.equal(settings.getApiKey(), environmentKey);
});

test("密钥文件是重启后仍生效的本机配置，优先于环境变量且前端不能清除", () => {
  const secretsDir = mkdtempSync(join(tmpdir(), "studio-key-"));
  const keyFilePath = join(secretsDir, "openai-api-key.txt");
  const fileKey = "sk-file_1234567890abcdef";
  writeFileSync(keyFilePath, `${fileKey}\n`, "utf8");
  const settings = new OpenAISettings("sk-env_1234567890abcdef", keyFilePath);
  assert.equal(settings.status().source, "file");
  assert.equal(settings.getApiKey(), fileKey);
  assert.equal(JSON.stringify(settings.status()).includes(fileKey), false);
  settings.set({ apiKey: validKey });
  assert.equal(settings.status().source, "session");
  assert.equal(settings.clearSessionKey().source, "file");
});

test("密钥文件缺失、为空或格式错误时不会计入配置", () => {
  const secretsDir = mkdtempSync(join(tmpdir(), "studio-key-"));
  const missing = new OpenAISettings(null, join(secretsDir, "not-created.txt"));
  assert.equal(missing.status().configured, false);
  const emptyPath = join(secretsDir, "empty.txt");
  writeFileSync(emptyPath, "\n", "utf8");
  assert.equal(new OpenAISettings(null, emptyPath).status().configured, false);
  const invalidPath = join(secretsDir, "invalid.txt");
  writeFileSync(invalidPath, "not-a-key", "utf8");
  const invalid = new OpenAISettings(null, invalidPath);
  assert.equal(invalid.status().configured, false);
  assert.equal(invalid.getApiKey(), null);
});

test("拒绝明显不完整或格式错误的密钥", () => {
  const settings = new OpenAISettings(null);
  assert.throws(() => settings.set({ apiKey: "not-a-key" }));
  assert.throws(() => settings.set({ apiKey: "sk-short" }));
});
