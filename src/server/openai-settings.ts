import { readFileSync } from "node:fs";
import { z } from "zod";
import { createHash } from "node:crypto";
import { fetchModelCatalog } from "./openai-model-catalog.js";
import type { OpenAIModelCatalog } from "../shared/contracts.js";
import type { OpenAISettingsStatus } from "../shared/contracts.js";

export const OPENAI_TEXT_MODEL = "gpt-5.6" as const;
export const OPENAI_IMAGE_MODEL = "gpt-image-2" as const;

const openAIKeyPattern = /^sk-[A-Za-z0-9_-]+$/;

const openAIKeyInputSchema = z.object({
  apiKey: z
    .string()
    .trim()
    .min(20, "请输入完整的 OpenAI API Key。")
    .max(512, "OpenAI API Key 长度不正确。")
    .regex(openAIKeyPattern, "OpenAI API Key 格式不正确。"),
});

function readKeyFile(keyFilePath: string): string | null {
  let content: string;
  try {
    content = readFileSync(keyFilePath, "utf8");
  } catch {
    return null;
  }
  const key = content.trim();
  if (!key) return null;
  if (key.length < 20 || key.length > 512 || !openAIKeyPattern.test(key)) {
    console.warn(`密钥文件内容不是有效的 OpenAI API Key，已忽略：${keyFilePath}`);
    return null;
  }
  return key;
}

export class OpenAISettings {
  private models = { text: String(OPENAI_TEXT_MODEL), image: String(OPENAI_IMAGE_MODEL) };
  private catalogCache: { fingerprint: string; expires: number; catalog: OpenAIModelCatalog } | null = null;
  private sessionKey: string | null = null;
  private readonly fileKey: string | null;
  private readonly environmentKey: string | null;

  constructor(environmentKey: string | null | undefined = process.env.OPENAI_API_KEY, keyFilePath: string | null = null) {
    this.environmentKey = environmentKey?.trim() || null;
    this.fileKey = keyFilePath ? readKeyFile(keyFilePath) : null;
  }

  status(): OpenAISettingsStatus {
    return {
      provider: "openai",
      configured: Boolean(this.sessionKey ?? this.fileKey ?? this.environmentKey),
      source: this.sessionKey ? "session" : this.fileKey ? "file" : this.environmentKey ? "environment" : null,
      models: { ...this.models },
    };
  }

  set(input: unknown): OpenAISettingsStatus {
    this.sessionKey = openAIKeyInputSchema.parse(input).apiKey;
    return this.status();
  }

  clearSessionKey(): OpenAISettingsStatus {
    this.sessionKey = null;
    this.models = { text: OPENAI_TEXT_MODEL, image: OPENAI_IMAGE_MODEL };
    this.catalogCache = null;
    return this.status();
  }

  getApiKey(): string | null {
    return this.sessionKey ?? this.fileKey ?? this.environmentKey;
  }

  async listModels(input: unknown = {}, fetcher?: typeof fetch): Promise<OpenAIModelCatalog> {
    const draft = z.object({ apiKey: z.string().optional() }).parse(input);
    const key = draft.apiKey?.trim() ? openAIKeyInputSchema.parse(draft).apiKey : this.getApiKey();
    if (!key) throw new Error("请先输入 API Key。");
    const fingerprint = createHash("sha256").update(key).digest("hex");
    if (this.catalogCache?.fingerprint === fingerprint && this.catalogCache.expires > Date.now()) return this.catalogCache.catalog;
    const catalog = await fetchModelCatalog(key, fetcher);
    this.catalogCache = { fingerprint, expires: Date.now() + 60000, catalog };
    return catalog;
  }

  async save(input: unknown, fetcher?: typeof fetch): Promise<OpenAISettingsStatus> {
    const draft = z.object({ apiKey: z.string().optional(), models: z.object({ text: z.string(), image: z.string() }).optional() }).parse(input);
    const catalog = await this.listModels(draft, fetcher);
    const selected = draft.models ?? catalog.recommended;
    if (!selected.text || !catalog.text.some(m => m.id === selected.text)) throw new Error("没有可用的文本模型，请重新获取列表。");
    if (!selected.image || !catalog.image.some(m => m.id === selected.image)) throw new Error("没有可用的图像模型，请检查账号权限。");
    // Commit only after both roles are validated; preview never changes active settings.
    if (draft.apiKey?.trim()) this.sessionKey = openAIKeyInputSchema.parse(draft).apiKey;
    this.models = { text: selected.text, image: selected.image };
    return this.status();
  }
}
