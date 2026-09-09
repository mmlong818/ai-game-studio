import { readFileSync } from "node:fs";
import { z } from "zod";
import { createHash } from "node:crypto";
import { fetchModelCatalog } from "./openai-model-catalog.js";
import type { OpenAIModelCatalog } from "../shared/contracts.js";
import type { OpenAISettingsStatus } from "../shared/contracts.js";

export const OPENAI_TEXT_MODEL = "gpt-5.6" as const;
export const OPENAI_IMAGE_MODEL = "gpt-image-2" as const;

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
  private models = { text: String(OPENAI_TEXT_MODEL), image: String(OPENAI_IMAGE_MODEL) };
  private catalogCache: { fingerprint: string; expires: number; catalog: OpenAIModelCatalog } | null = null;
  private sessionKey: string | null = null;
  private readonly fileKey: string | null;
  private readonly environmentKey: string | null;

  constructor(environmentKey: string | null | undefined = process.env.OPENAI_API_KEY, keyFilePath: string | null = null) {
    this.environmentKey = environmentKey?.trim() || null;
    this.fileKey = keyFilePath ? readKeyFile(keyFilePath) : null;
  }

  private textProvider: { kind: "claude-cli"; model: string } | null = null;

  /** 文本调用改走本机 Claude CLI；文本模型选择被固定，图片模型与 Key 逻辑不变。 */
  useClaudeCliText(model: string) {
    this.textProvider = { kind: "claude-cli", model };
    this.catalogCache = null;
  }

  private textRouting(): NonNullable<OpenAISettingsStatus["textRouting"]> {
    const planner = this.textProvider ? `claude-cli:${this.textProvider.model}` : this.models.text;
    if (this.textProvider) return { planner, executor: planner, reviewer: planner, mode: "same-model", reason: "provider-fixed" };
    const key = this.getApiKey();
    const fingerprint = key ? createHash("sha256").update(key).digest("hex") : null;
    // `expires` only controls when /models may be refreshed. The successfully
    // discovered role snapshot must stay stable throughout a long production;
    // it is invalidated by a key/provider change or replaced by a successful refresh.
    if (!fingerprint || this.catalogCache?.fingerprint !== fingerprint) {
      return { planner, executor: planner, reviewer: planner, mode: "same-model", reason: "catalog-unavailable" };
    }
    const available = new Set(this.catalogCache.catalog.text.map(model => model.id));
    if (!available.has(planner)) {
      return { planner, executor: planner, reviewer: planner, mode: "same-model", reason: "planner-unavailable" };
    }
    const candidates = planner === "gpt-6-astra"
      ? ["gpt-5.6-sol", "gpt-5.6", "gpt-5.6-terra"]
      : planner === "gpt-5.6" || planner === "gpt-5.6-sol"
        ? ["gpt-5.6-terra"]
        : [];
    const executor = candidates.find(model => available.has(model));
    if (!executor) return { planner, executor: planner, reviewer: planner, mode: "same-model", reason: "no-qualified-executor" };
    return { planner, executor, reviewer: planner, mode: "split", reason: "catalog-route" };
  }

  status(): OpenAISettingsStatus {
    return {
      provider: "openai",
      configured: Boolean(this.sessionKey ?? this.fileKey ?? this.environmentKey),
      source: this.sessionKey ? "session" : this.fileKey ? "file" : this.environmentKey ? "environment" : null,
      models: { ...this.models, ...(this.textProvider ? { text: `claude-cli:${this.textProvider.model}` } : {}) },
      ...(this.textProvider ? { textProvider: { ...this.textProvider } } : {}),
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
    this.models = { text: OPENAI_TEXT_MODEL, image: OPENAI_IMAGE_MODEL };
    this.catalogCache = null;
    return this.status();
  }

  getApiKey(): string | null {
    return this.sessionKey ?? this.fileKey ?? this.environmentKey;
  }

  /** Provider-aware options shared by native OpenAI text requests. */
  textRequestOptions(role: TextRole = "planner"): OpenAITextRequestOptions {
    const routing = this.textRouting();
    if (routing.reason === "planner-unavailable") {
      throw new Error(`当前已选文本模型 ${routing.planner} 已不在此 API Key 的最新模型目录中，请重新选择并保存模型。`);
    }
    const model = routing[role];
    if (this.textProvider) return { model };
    return supportsLowReasoningEffort(model) ? { model, reasoning_effort: "low" } : { model };
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
    if (!this.textProvider && (!selected.text || !catalog.text.some(m => m.id === selected.text))) throw new Error("没有可用的文本模型，请重新获取列表。");
    if (!selected.image || !catalog.image.some(m => m.id === selected.image)) throw new Error("没有可用的图像模型，请检查账号权限。");
    // Commit only after both roles are validated; preview never changes active settings.
    if (draft.apiKey?.trim()) this.sessionKey = openAIKeyInputSchema.parse(draft).apiKey;
    this.models = { text: this.textProvider ? this.models.text : selected.text ?? this.models.text, image: selected.image };
    return this.status();
  }
}
