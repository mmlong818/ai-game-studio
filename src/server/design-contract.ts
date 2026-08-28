import { z } from "zod";
import {
  createDesignProfile,
  gameDesignProfileSchema,
  projectInputSchema,
  resolveGameTemplate,
  type GameDesignProfile,
  type GameTemplate,
  type IdeaAnalysis,
  type ProjectInput,
} from "../shared/contracts.js";
import { commonDesignMistakes, designPillars, playerMotivations } from "../shared/design-knowledge.js";
import { OPENAI_TEXT_MODEL, type OpenAISettings } from "./openai-settings.js";

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
// 设计合同是 13 字段的长结构化生成,明显慢于玩法解析;真实测量 25s 会超时。
const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 2;

// LLM 输出骨架(docs/33 第 4 节):字段与 gameDesignProfileSchema 一一对应,
// productionRisks 例外——模板基线风险是工程事实,由平台合并,LLM 只补充题材相关新风险。
const llmDesignSchema = z.object({
  genre: z.string().min(1),
  target_player: z.string().min(1),
  player_fantasy: z.string().min(1),
  session_length: z.string().min(1),
  core_loop: z.array(z.string().min(1)).min(3).max(6),
  win_condition: z.string().min(1),
  fail_condition: z.string().min(1),
  progression: z.array(z.string().min(1)).min(1).max(6),
  difficulty_curve: z.array(z.string().min(1)).min(2).max(6),
  game_feel: z.array(z.string().min(1)).min(2).max(8),
  onboarding: z.array(z.string().min(1)).min(2).max(6),
  accessibility: z.array(z.string().min(1)).min(2).max(6),
  extra_production_risks: z.array(z.string().min(1)).max(4),
});

const stringItems = (description: string) => ({ type: "array", items: { type: "string" }, description });

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "genre", "target_player", "player_fantasy", "session_length", "core_loop", "win_condition",
    "fail_condition", "progression", "difficulty_curve", "game_feel", "onboarding", "accessibility",
    "extra_production_risks",
  ],
  properties: {
    genre: { type: "string", description: "结合题材的玩法类型定位,不超过 20 字" },
    target_player: { type: "string", description: "目标玩家画像,指出主要动机(如成就感/掌控感/收集欲),不超过 60 字" },
    player_fantasy: { type: "string", description: "玩家幻想:玩家在本作里扮演什么、体验什么,用题材语言,不超过 60 字" },
    session_length: { type: "string", description: "单局时长范围,例如“3–8 分钟”" },
    core_loop: stringItems("核心循环 3–6 步,规则语义必须与模板基线一致,用题材语言重述,每步不超过 24 字"),
    win_condition: { type: "string", description: "胜利条件,规则语义与模板基线一致,用题材语言重述,不超过 50 字" },
    fail_condition: { type: "string", description: "失败条件,规则语义与模板基线一致,用题材语言重述,不超过 50 字" },
    progression: stringItems("局内推进 1–6 条:玩家在一局/一段旅程中感知到什么在变化,每条不超过 40 字"),
    difficulty_curve: stringItems("难度曲线 2–6 条:随难度档与关卡推进,哪些真实规则参数变化;逐级递增无断崖,每条不超过 50 字"),
    game_feel: stringItems("手感与反馈 2–8 条:关键操作、成功、失败的即时视听反馈,结合题材,每条不超过 40 字"),
    onboarding: stringItems("新手引导 2–6 条:先教会再加压,机制分步引入,每条不超过 40 字"),
    accessibility: stringItems("无障碍 2–6 条:触控可达、对比度、不只依赖颜色、可调难度等,每条不超过 40 字"),
    extra_production_risks: stringItems("题材或体验带来的新增制作风险,最多 4 条;模板已知工程风险不要重复,每条不超过 50 字"),
  },
} as const;

const complexityTiers = {
  relaxed: "入门(轻松档):系统描述克制,引导更充分,压力上限低;强调防挫败与舒适节奏。",
  standard: "中级(标准档):学习窗口与压力平衡,中段形成稳定挑战。",
  challenging: "专家(挑战档):策略深度与压力节奏拉满,难度曲线更陡但仍无断崖;强调技巧上限与风险回报。",
} as const;

function buildSystemPrompt(template: GameTemplate, baseline: GameDesignProfile, difficulty: keyof typeof complexityTiers): string {
  const baselineJson = JSON.stringify({
    genre: baseline.genre,
    coreLoop: baseline.coreLoop,
    winCondition: baseline.winCondition,
    failCondition: baseline.failCondition,
    progression: baseline.progression,
    knownProductionRisks: baseline.productionRisks,
  });
  // 实验通道(generated)没有模板规则可依:合同本身就是后续代码生成的唯一规则依据,
  // 必须自由但克制地定义完整规则,而不是重述占位基线。
  const ruleSection = template === "generated"
    ? [
        "平台事实:该创意没有任何成熟模板能承载,将走无模板实验通道——你的设计合同会被直接交给玩法程序员模型生成独有代码,因此它是规则的唯一依据。",
        "规则边界:为这句创意设计一套完整、自洽、单人单页浏览器游戏可实现的规则;规模必须克制(无网络、无服务端、无实时多人、一局 2–8 分钟);core_loop、win_condition、fail_condition 必须具体到可以直接照着写代码,不允许写“达成约定条件”这类空话。",
        `复杂度档位:${complexityTiers[difficulty]}`,
      ]
    : [
        "平台事实:游戏运行时由既有玩法模板代码实现,并固定采用二十关阶梯难度合同。你的职责是把模板规则用用户的题材专业地重述、深化并主题化,不是发明模板未实现的玩法系统。",
        `本次玩法模板:${template}。模板规则基线(JSON):${baselineJson}`,
        "规则边界:core_loop、win_condition、fail_condition 的规则语义必须与基线等价——应当用用户题材的语言重新表述,但不得改变规则结构、目标类型或失败判定;不得引入基线之外的新机制、新资源系统或新模式。",
        `复杂度档位:${complexityTiers[difficulty]} 复杂度只体现在文案的策略深度、引导密度与压力描述上,不新增系统。`,
      ];
  return [
    "你是一个游戏创作平台的首席游戏设计师,为用户的创意产出专业的游戏设计合同。",
    ...ruleSection,
    "设计支柱(合同必须体现):",
    ...designPillars.map((pillar) => `- ${pillar.rule}`),
    "常见设计错误(必须避免):",
    ...commonDesignMistakes.map((mistake) => `- ${mistake}`),
    `目标玩家画像应指明主要动机,动机词表:${playerMotivations.join("、")}。`,
    "智能默认值:用户描述缺少主题、受众或参考时,由玩法描述与模板推断合理默认,不要向用户提问。",
    "一致性检查:输出前自查所有字段在题材、机制与美术暗示上互相印证,不做皮肤换色式的表面包装;发现冲突以规则基线为准。",
    "输出要求:全部使用中文;严格遵守各字段的条数与字数限制;不输出模板 id、JSON 之外的任何说明。",
  ].join("\n");
}

function buildUserPrompt(idea: string, analysis: IdeaAnalysis | null, directions: string[]): string {
  const lines = [`玩法描述:${idea}`];
  if (analysis?.summary) lines.push(`玩法解析概括:${analysis.summary}`);
  if (analysis?.mechanics.length) lines.push(`已识别机制:${analysis.mechanics.join("、")}`);
  if (analysis?.hardConstraints.length) lines.push(`用户硬性约束(设计合同必须尊重):${analysis.hardConstraints.map((item) => `“${item}”`).join("、")}`);
  if (directions.length) {
    lines.push("创作者在制作对话中提出的修改意见(按时间顺序,越靠后优先级越高,设计合同必须落实;与规则基线冲突时在基线内尽量满足):");
    lines.push(...directions.map((item, index) => `${index + 1}. ${item}`));
  }
  return lines.join("\n");
}

export interface DirectionVerdict {
  direction: string;
  addressed: boolean;
  evidence: string;
}

const auditAnswerSchema = z.object({
  verdicts: z.array(z.object({
    direction: z.string().min(1),
    addressed: z.boolean(),
    evidence: z.string().min(1),
  })),
});

const auditJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdicts"],
  properties: {
    verdicts: {
      type: "array",
      description: "对每条创作意见的落实判定,与输入意见一一对应、顺序一致",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["direction", "addressed", "evidence"],
        properties: {
          direction: { type: "string", description: "原意见文本,保持原样" },
          addressed: { type: "boolean", description: "设计合同是否切实落实了这条意见" },
          evidence: { type: "string", description: "落实时:指出体现在合同哪个字段的哪条内容;未落实时:说明原因(如与模板规则基线冲突),不超过 60 字" },
        },
      },
    },
  },
} as const;

export interface RuleVerdict {
  rule: string;
  implemented: boolean;
  evidence: string;
}

const ruleAuditAnswerSchema = z.object({
  verdicts: z.array(z.object({
    rule: z.string().min(1),
    implemented: z.boolean(),
    evidence: z.string().min(1),
  })),
});

const ruleAuditJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["verdicts"],
  properties: {
    verdicts: {
      type: "array",
      description: "对每条规则的实现判定,与输入规则一一对应、顺序一致",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["rule", "implemented", "evidence"],
        properties: {
          rule: { type: "string", description: "原规则文本,保持原样" },
          implemented: { type: "boolean", description: "代码是否切实实现了这条规则" },
          evidence: { type: "string", description: "已实现:指出对应的函数/变量/逻辑;未实现:说明缺什么或行为差异,不超过 80 字" },
        },
      },
    },
  },
} as const;

/** 从设计合同提取需要逐条对照代码的规则清单(核心循环各步 + 胜负条件)。 */
export function contractRules(profile: GameDesignProfile): string[] {
  return [
    ...profile.coreLoop.map((step, index) => `核心循环第 ${index + 1} 步:${step}`),
    `胜利条件:${profile.winCondition}`,
    `失败条件:${profile.failCondition}`,
  ];
}

interface DesignContractOptions {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  timeoutMs?: number;
}

export class DesignContractGenerator {
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(private readonly settings: OpenAISettings, options: DesignContractOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  }

  /**
   * 返回 LLM 定制的设计合同;没有密钥或调用失败时返回 null,调用方回退到模板静态设计。
   * directions 传入创作者在制作对话中的历史修改意见(时间顺序),用于重建时修订设计合同。
   */
  async generate(rawInput: ProjectInput, analysis: IdeaAnalysis | null = null, directions: string[] = []): Promise<GameDesignProfile | null> {
    const input = projectInputSchema.parse(rawInput);
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;
    const template = resolveGameTemplate(input, analysis);
    const baseline = createDesignProfile(template, input.difficulty);
    try {
      return await this.requestDesign(input.idea, template, baseline, input.difficulty, analysis, directions.slice(-10), apiKey);
    } catch (error) {
      const reason = error instanceof Error ? error.message : "LLM 设计合同生成失败。";
      console.warn(`设计合同 LLM 生成失败，已回退到模板静态设计：${reason}`);
      return null;
    }
  }

  /**
   * 逐条判定修订后的设计合同是否落实了创作意见;没有密钥或调用失败时返回 null,
   * 调用方在文档中只列意见不给判定。判定结果写入 GAME_DESIGN.md 的修订依据章节。
   */
  async auditDirections(profile: GameDesignProfile, directions: string[]): Promise<DirectionVerdict[] | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey || directions.length === 0) return null;
    const messages = [
      {
        role: "system",
        content: [
          "你是游戏创作平台的设计合同审计员。给你一份最终设计合同(JSON)和创作者的修改意见列表,",
          "逐条判断合同是否切实落实了每条意见:落实的指出体现在哪个字段的哪条内容;",
          "未落实的说明原因(例如与模板规则基线冲突、意见指向运行时代码而非设计合同)。",
          "判定必须依据合同文本本身,不得臆测;verdicts 与输入意见一一对应、顺序一致。",
        ].join(""),
      },
      {
        role: "user",
        content: `设计合同:${JSON.stringify(profile)}\n修改意见(按时间顺序):\n${directions.map((item, index) => `${index + 1}. ${item}`).join("\n")}`,
      },
    ];
    try {
      const content = await this.requestContent(messages, "direction_audit", auditJsonSchema, apiKey);
      const parsed = auditAnswerSchema.parse(JSON.parse(content));
      return parsed.verdicts.slice(0, directions.length).map((verdict, index) => ({
        direction: directions[index] ?? verdict.direction,
        addressed: verdict.addressed,
        evidence: verdict.evidence.trim().slice(0, 120),
      }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "意见落实审计失败。";
      console.warn(`创作意见落实审计失败，文档将只列意见不给判定：${reason}`);
      return null;
    }
  }

  /**
   * 规则正确性审计:拿设计合同的规则清单与生成代码,逐条判定是否实现。
   * 没有密钥或调用失败返回 null(记录"审计不可用",不拦截构建)。
   */
  async auditRuleFidelity(profile: GameDesignProfile, gameCode: string): Promise<RuleVerdict[] | null> {
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;
    const rules = contractRules(profile);
    const messages = [
      {
        role: "system",
        content: [
          "你是游戏创作平台的代码审计员。给你一份设计合同的规则清单和一个单文件 HTML 游戏的完整代码,",
          "逐条判断代码是否切实实现了每条规则:已实现的指出对应的函数、变量或逻辑;",
          "未实现或行为不符的说明缺什么。判定必须依据代码本身,不得臆测;",
          "verdicts 与输入规则一一对应、顺序一致。宁可判未实现,不可给含糊的通过。",
        ].join(""),
      },
      {
        role: "user",
        content: `规则清单:\n${rules.map((rule, index) => `${index + 1}. ${rule}`).join("\n")}\n\n游戏代码:\n${gameCode}`,
      },
    ];
    try {
      const content = await this.requestContent(messages, "rule_fidelity", ruleAuditJsonSchema, apiKey);
      const parsed = ruleAuditAnswerSchema.parse(JSON.parse(content));
      return parsed.verdicts.slice(0, rules.length).map((verdict, index) => ({
        rule: rules[index] ?? verdict.rule,
        implemented: verdict.implemented,
        evidence: verdict.evidence.trim().slice(0, 160),
      }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "规则审计失败。";
      console.warn(`生成代码规则审计失败，本版只记录审计不可用：${reason}`);
      return null;
    }
  }

  private async requestDesign(
    idea: string,
    template: GameTemplate,
    baseline: GameDesignProfile,
    difficulty: keyof typeof complexityTiers,
    analysis: IdeaAnalysis | null,
    directions: string[],
    apiKey: string,
  ): Promise<GameDesignProfile> {
    const messages = [
      { role: "system", content: buildSystemPrompt(template, baseline, difficulty) },
      { role: "user", content: buildUserPrompt(idea, analysis, directions) },
    ];
    const content = await this.requestContent(messages, "design_contract", responseJsonSchema, apiKey);
    return this.parseDesign(content, baseline);
  }

  private async requestContent(
    messages: Array<{ role: string; content: string }>,
    schemaName: string,
    jsonSchema: unknown,
    apiKey: string,
  ): Promise<string> {
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
            messages,
            response_format: {
              type: "json_schema",
              json_schema: { name: schemaName, strict: true, schema: jsonSchema },
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
        const body = (await response.json()) as { choices?: Array<{ message?: { content?: string | null; refusal?: string | null } }> };
        const message = body.choices?.[0]?.message;
        if (message?.refusal) throw new Error(`模型拒绝了该请求：${message.refusal.slice(0, 120)}`);
        if (!message?.content) throw new Error("模型没有返回可解析的内容。");
        return message.content;
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

  private parseDesign(content: string, baseline: GameDesignProfile): GameDesignProfile {
    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      throw new Error("模型返回的内容不是有效的 JSON。");
    }
    const answer = llmDesignSchema.parse(raw);
    const clip = (value: string, max: number) => value.trim().slice(0, max);
    const clipList = (values: string[], max: number) => values.map((item) => clip(item, max)).filter((item) => item.length > 0);
    // 基线风险是模板代码的工程事实,永远保留;LLM 只能追加题材相关的新风险。
    const extraRisks = clipList(answer.extra_production_risks, 80).filter((risk) => !baseline.productionRisks.includes(risk));
    return gameDesignProfileSchema.parse({
      genre: clip(answer.genre, 40),
      targetPlayer: clip(answer.target_player, 120),
      playerFantasy: clip(answer.player_fantasy, 120),
      sessionLength: clip(answer.session_length, 40),
      coreLoop: clipList(answer.core_loop, 60),
      winCondition: clip(answer.win_condition, 100),
      failCondition: clip(answer.fail_condition, 100),
      progression: clipList(answer.progression, 80),
      difficultyCurve: clipList(answer.difficulty_curve, 100),
      gameFeel: clipList(answer.game_feel, 80),
      onboarding: clipList(answer.onboarding, 80),
      accessibility: clipList(answer.accessibility, 80),
      productionRisks: [...baseline.productionRisks, ...extraRisks].slice(0, 6),
    });
  }
}
