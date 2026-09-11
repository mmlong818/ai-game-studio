import { readFileSync } from "node:fs";
import { z } from "zod";
import { createHash } from "node:crypto";
import { fetchModelCatalog } from "./openai-model-catalog.js";
import type { OpenAIModelCatalog } from "../shared/contracts.js";
import type { OpenAISettingsStatus } from "../shared/contracts.js";

/** Platform production models are deliberately fixed; user sessions may only change the Key. */
export const OPENAI_TEXT_MODEL = "gpt-5.6-terra" as const;
export const OPENAI_IMAGE_MODEL = "gpt-image-2.5-sunburst" as const;

const LOW_REASONING_TEXT_MODELS = new Set([
  "gpt-5.2",
  "gpt-5.4",
  "gpt-5.4-mini",
  "gpt-5.5",
  "gpt-5.6",
  "gpt-5.6-sol",
  "gpt-5.6-terra",
  "gpt-5.6-luna",
  "gpt-6-astra",
]);

export function supportsLowReasoningEffort(model: string): boolean {
  return LOW_REASONING_TEXT_MODELS.has(model);
}

export type OpenAITextRequestOptions = {
  model: string;
  reasoning_effort?: "low";
};
export type TextRole = "planner" | "executor" | "reviewer";

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
  private catalogCache: { fingerprint: string; expires: number; catalog: OpenAIModelCatalog } | null = null;
  private sessionKey: string | null = null;
  private readonly fileKey: string | null;
  private readonly environmentKey: string | null;

  constructor(environmentKey: string | null | undefined = process.env.OPENAI_API_KEY, keyFilePath: string | null = null) {
    this.environmentKey = environmentKey?.trim() || null;
    this.fileKey = keyFilePath ? readKeyFile(keyFilePath) : null;
  }

  private textRouting(): NonNullable<OpenAISettingsStatus["textRouting"]> {
    return { planner: OPENAI_TEXT_MODEL, executor: OPENAI_TEXT_MODEL, reviewer: OPENAI_TEXT_MODEL, mode: "same-model", reason: "provider-fixed" };
  }

  status(): OpenAISettingsStatus {
    return {
      provider: "openai",
      configured: Boolean(this.sessionKey ?? this.fileKey ?? this.environmentKey),
      source: this.sessionKey ? "session" : this.fileKey ? "file" : this.environmentKey ? "environment" : null,
      models: { text: OPENAI_TEXT_MODEL, image: OPENAI_IMAGE_MODEL },
      textRouting: this.textRouting(),
    };
  }

  set(input: unknown): OpenAISettingsStatus {
    const nextKey = openAIKeyInputSchema.parse(input).apiKey;
    if (nextKey !== this.getApiKey()) this.catalogCache = null;
    this.sessionKey = nextKey;
    return this.status();
  }

  clearSessionKey(): OpenAISettingsStatus {
    this.sessionKey = null;
    this.catalogCache = null;
    return this.status();
  }

  getApiKey(): string | null {
    return this.sessionKey ?? this.fileKey ?? this.environmentKey;
  }

  /** Provider-aware options shared by native OpenAI text requests. */
  textRequestOptions(_role: TextRole = "planner"): OpenAITextRequestOptions {
    return { model: OPENAI_TEXT_MODEL, reasoning_effort: "low" };
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
    // Accept the retired `models` member for old clients, but never apply it.
    const draft = z.object({ apiKey: z.string().optional(), models: z.object({ text: z.string(), image: z.string() }).optional() }).parse(input);
    // The connection form saves only a Key. Model catalog data and retired client
    // selections cannot change the fixed production pair.
    void fetcher;
    if (draft.apiKey?.trim()) this.sessionKey = openAIKeyInputSchema.parse(draft).apiKey;
    return this.status();
  }
}
