import { z } from "zod";
import {
  gameTemplateSchema,
  getTemplateCatalog,
  heuristicIdeaAnalysis,
  ideaAnalysisSchema,
  projectInputSchema,
  type IdeaAnalysis,
  type ProjectInput,
} from "../shared/contracts.js";
import { mechanicVocabularyLines } from "../shared/design-knowledge.js";
import { OPENAI_TEXT_MODEL, type OpenAISettings } from "./openai-settings.js";

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const DEFAULT_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;

// "generated" 是无模板生成通道,不参与匹配判定——匹配不上就该返回 null。
const templateIds = gameTemplateSchema.options.filter((id) => id !== "generated") as [string, ...string[]];

const llmAnswerSchema = z.object({
  template: z.enum(templateIds).nullable(),
  no_match_reason: z.string().nullable(),
  confidence: z.number(),
  dimensions: z.enum(["2d", "3d"]),
  three_mode: z.enum(["collector", "arena", "popup"]).nullable(),
  mechanics: z.array(z.string()),
  hard_constraints: z.array(z.string()),
  summary: z.string(),
});

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["template", "no_match_reason", "confidence", "dimensions", "three_mode", "mechanics", "hard_constraints", "summary"],
  properties: {
    template: { anyOf: [{ type: "string", enum: [...templateIds] }, { type: "null" }], description: "最匹配的玩法模板 id；没有任何模板能承载该玩法时返回 null" },
    no_match_reason: { anyOf: [{ type: "string" }, { type: "null" }], description: "template 为 null 时,用一句话向用户解释缺少哪种玩法能力" },
    confidence: { type: "number", description: "模板判定置信度,0 到 1" },
    dimensions: { type: "string", enum: ["2d", "3d"], description: "描述要求 3D 场景时为 3d,否则为 2d" },
    three_mode: { anyOf: [{ type: "string", enum: ["collector", "arena", "popup"] }, { type: "null" }], description: "仅 3d 时填写:有战斗/敌人/波次为 arena,立体书/纸艺/转动整本书看路的旋转迷宫为 popup,其余收集探索为 collector;2d 时为 null" },
    mechanics: { type: "array", items: { type: "string" }, description: "描述中真实要求的玩法机制标签,每条不超过 20 字,最多 12 条;用户明确排除的机制不得出现" },
    hard_constraints: { type: "array", items: { type: "string" }, description: "用户提出的硬性约束(必须/不能/只能……),保留原意,每条不超过 60 字,最多 10 条" },
    summary: { type: "string", description: "对玩法诉求的一句话中文概括,不超过 120 字" },
  },
} as const;

function buildSystemPrompt(): string {
  const catalog = getTemplateCatalog()
    .map((entry) => `- ${entry.id}:${entry.genre}。玩家幻想:${entry.fantasy}。核心循环:${entry.coreLoop}`)
    .join("\n");
  return [
    "你是一个游戏创作平台的玩法分析器。用户会用中文描述想做的游戏,你要把描述解析成结构化的玩法判定。",
    "平台当前只支持以下玩法模板(id:类型与核心循环):",
    catalog,
    "判定规则:",
    "1. 只有当描述的核心玩法确实能由某个模板的规则体系承载时才选择它;题材、皮肤、角色不影响判定,规则结构才影响判定。",
    "2. 如果所有模板都无法承载核心玩法(例如塔防、卡牌对战、经营模拟、体育竞技、剧情文字冒险),template 必须返回 null,并在 no_match_reason 里说明缺少哪种玩法能力。宁可返回 null,也不要牵强匹配。",
    "3. 严格尊重否定表达:用户说“不能/不要/无法/禁止”某机制时,该机制不得出现在 mechanics 里,也不得据其判定 three_mode 或模板。",
    "4. hard_constraints 只收录用户明确提出的硬性要求,保留用户原意,不要自行发明。",
    "5. 描述明确要求 3D、第一人称或第三人称场景时 dimensions 为 3d,否则为 2d。",
    "6. mechanics 使用专业机制词汇,优先从下面的词表中选取贴合项,词表不覆盖时再用不超过 20 字的自拟专业标签:",
    ...mechanicVocabularyLines().map((line) => `   - ${line}`),
  ].join("\n");
}

interface IdeaAnalyzerOptions {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
}

export class IdeaAnalyzer {
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(private readonly settings: OpenAISettings, options: IdeaAnalyzerOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  async analyze(rawInput: ProjectInput): Promise<IdeaAnalysis> {
    const input = projectInputSchema.parse(rawInput);
    if (input.template !== "auto") return heuristicIdeaAnalysis(input);
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return heuristicIdeaAnalysis(input);
    try {
      return await this.requestAnalysis(input.idea, apiKey);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "LLM 玩法解析失败。";
      console.warn(`玩法合同 LLM 解析失败，已回退到关键词识别：${reason}`);
      return heuristicIdeaAnalysis(input, reason);
    }
  }

  private async requestAnalysis(idea: string, apiKey: string): Promise<IdeaAnalysis> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: OPENAI_TEXT_MODEL,
            messages: [
              { role: "system", content: buildSystemPrompt() },
              { role: "user", content: `玩法描述：${idea}` },
            ],
            response_format: {
              type: "json_schema",
              json_schema: { name: "idea_analysis", strict: true, schema: responseJsonSchema },
            },
          }),
        });
        if (!response.ok) {
          const retryable = response.status === 429 || response.status >= 500;
          const detail = (await response.text().catch(() => "")).slice(0, 200);
          const error = new Error(`模型接口返回 ${response.status}。${detail}`);
          if (retryable && attempt < MAX_ATTEMPTS) {
            lastError = error;
            continue;
          }
          throw error;
        }
        return this.parseAnswer(await response.json());
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          lastError = new Error(`模型接口在 ${this.timeoutMs}ms 内没有响应。`);
          if (attempt < MAX_ATTEMPTS) continue;
          throw lastError;
        }
        if (attempt < MAX_ATTEMPTS && error instanceof TypeError) {
          lastError = error;
          continue;
        }
        throw error;
      } finally {
        clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("模型接口调用失败。");
  }

  private parseAnswer(payload: unknown): IdeaAnalysis {
    const body = payload as { choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }> };
    const message = body.choices?.[0]?.message;
    if (message?.refusal) throw new Error(`模型拒绝了该请求：${message.refusal.slice(0, 120)}`);
    if (!message?.content) throw new Error("模型没有返回可解析的内容。");
    let raw: unknown;
    try {
      raw = JSON.parse(message.content);
    } catch {
      throw new Error("模型返回的内容不是有效的 JSON。");
    }
    const answer = llmAnswerSchema.parse(raw);
    const clip = (value: string, max: number) => value.trim().slice(0, max);
    return ideaAnalysisSchema.parse({
      source: "llm",
      model: OPENAI_TEXT_MODEL,
      template: answer.template,
      confidence: Math.min(1, Math.max(0, answer.confidence)),
      dimensions: answer.dimensions,
      threeMode: answer.dimensions === "3d" ? answer.three_mode : null,
      mechanics: answer.mechanics.map((item) => clip(item, 40)).filter((item) => item.length > 0).slice(0, 12),
      hardConstraints: answer.hard_constraints.map((item) => clip(item, 120)).filter((item) => item.length > 0).slice(0, 10),
      summary: clip(answer.template === null ? answer.no_match_reason ?? answer.summary : answer.summary, 280) || null,
    });
  }
}
