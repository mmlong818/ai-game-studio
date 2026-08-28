import { readFileSync } from "node:fs";
import { z } from "zod";
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
      models: {
        text: OPENAI_TEXT_MODEL,
        image: OPENAI_IMAGE_MODEL,
      },
    };
  }

  set(input: unknown): OpenAISettingsStatus {
    this.sessionKey = openAIKeyInputSchema.parse(input).apiKey;
    return this.status();
  }

  clearSessionKey(): OpenAISettingsStatus {
    this.sessionKey = null;
    return this.status();
  }

  getApiKey(): string | null {
    return this.sessionKey ?? this.fileKey ?? this.environmentKey;
  }
}
