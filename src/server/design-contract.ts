import { z } from "zod";
import { generatedCampaignSchema } from "../shared/generated-campaign.js";
import { blueprintPlanningPrompt, blueprintRules, generatedBlueprintSchema } from "../shared/generated-blueprint.js";
import { streamLines } from "../shared/stream-lines.js";
import { gameDesignPrinciplesPrompt } from "../shared/game-presentation-policy.js";
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
import { type OpenAISettings } from "./openai-settings.js";

const DEFAULT_ENDPOINT = "https://api.openai.com/v1/chat/completions";
// 设计合同是 13 字段的长结构化生成,明显慢于玩法解析;真实测量 25s 会超时。
const DEFAULT_TIMEOUT_MS = 90_000;
const MAX_ATTEMPTS = 2;

// LLM 输出骨架(docs/33 第 4 节):字段与 gameDesignProfileSchema 一一对应,
// productionRisks 例外——模板基线风险是工程事实,由平台合并,LLM 只补充题材相关新风险。
const llmBlueprintSchema = z.object({
  mechanic_ids: z.array(z.string()),
  modifier_ids: z.array(z.string()),
  core_decision: z.string(),
  tension: z.string(),
  mastery_signal: z.string(),
  sprites: z.array(z.object({ file: z.string(), role: z.string(), hint: z.string() })),
});

const llmDesignSchema = z.object({
  generated_campaign: generatedCampaignSchema.nullable().optional(),
  generated_blueprint: llmBlueprintSchema.nullable().optional(),
  genre: z.string().min(1),
  target_player: z.string().min(1),
  player_fantasy: z.string().min(1),
  session_length: z.string().min(1),
  // 进入口只校验下限；上限由 parseDesign 按方案合同截断，多给的条目不会让整个方案作废。
  core_loop: z.array(z.string().min(1)).min(3).max(12),
  win_condition: z.string().min(1),
  fail_condition: z.string().min(1),
  progression: z.array(z.string().min(1)).min(1).max(12),
  difficulty_curve: z.array(z.string().min(1)).min(2).max(12),
  game_feel: z.array(z.string().min(1)).min(2).max(16),
  onboarding: z.array(z.string().min(1)).min(2).max(12),
  accessibility: z.array(z.string().min(1)).min(2).max(12),
  extra_production_risks: z.array(z.string().min(1)).max(8),
});

const stringItems = (description: string) => ({ type: "array", items: { type: "string" }, description });

const responseJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "genre", "target_player", "player_fantasy", "session_length", "core_loop", "win_condition",
    "fail_condition", "progression", "difficulty_curve", "game_feel", "onboarding", "accessibility",
    "extra_production_risks", "generated_campaign", "generated_blueprint",
  ],
  properties: {
    generated_campaign: {
      anyOf: [{ type: "null" }, {
        type: "object", additionalProperties: false,
        required: ["mode", "levelCount", "milestones", "difficultyKeys", "rationale", "failurePolicy"],
        properties: {
          mode: { type: "string", enum: ["campaign", "endless"], description: "有限闯关或无目标无限玩法；无限玩法总关数0、milestones空数组，不得强加胜利目标。" },
          failurePolicy: { type: "string", enum: ["required", "forbidden"], description: "有失败条件为required，无失败玩法为forbidden。必须与fail_condition一致，不得为了验收给无失败玩法增加失败。" },
          levelCount: { type: "integer", minimum: 0, maximum: 60 },
          milestones: { type: "array", maxItems: 20, items: { type: "integer", minimum: 1, maximum: 60 } },
          difficultyKeys: { type: "array", maxItems: 6, items: { type: "string", pattern: "^[a-z][a-zA-Z0-9]{0,39}$" }, description: "最多 6 个，小写英文开头的驼峰标识，如 basketSlots、tideInterval。" },
          rationale: { type: "string" },
        },
      }],
      description: "无模板游戏填写，官方模板填null。按玩家需求选择闯关或无限，不默认20关。有限关卡的milestones从1开始递增；无限为0关、milestones为空。difficultyKeys为真实递增参数的英文标识，无限可为空；不得虚构速度或密度。rationale解释安排，面向普通玩家书写：只用中文与具体数字，不出现字段名、英文参数名或“forbidden/required”这类取值；并在progression/difficulty_curve用普通人能懂的中文表达同一方案。",
    },
    generated_blueprint: {
      anyOf: [{ type: "null" }, {
        type: "object", additionalProperties: false,
        required: ["mechanic_ids", "modifier_ids", "core_decision", "tension", "mastery_signal", "sprites"],
        properties: {
          mechanic_ids: { type: "array", items: { type: "string" }, description: "1–3 个知识库机制 id，只能取自候选清单。" },
          modifier_ids: { type: "array", items: { type: "string" }, description: "1–2 个设计修饰器 id，只能取自候选清单。" },
          core_decision: { type: "string", description: "玩家每次操作前的真实取舍，不同选择导致不同结果，不超过 80 字。" },
          tension: { type: "string", description: "取舍为什么有意义；无失败玩法也必须有张力，不超过 80 字。" },
          mastery_signal: { type: "string", description: "技巧更好的玩家在同一关里的可观察差别，不超过 80 字。" },
          sprites: {
            type: "array",
            description: "2–5 个玩家直接看到或操作的局内主体，代码生成前会先生成为透明底位图。",
            items: {
              type: "object", additionalProperties: false, required: ["file", "role", "hint"],
              properties: {
                file: { type: "string", description: "形如 assets/shell-scallop.png 的小写短横线文件名，不含封面与背景。" },
                role: { type: "string", description: "中文短名，不超过 12 字。" },
                hint: { type: "string", description: "外形、材质与辨识特征，不超过 60 字。" },
              },
            },
          },
        },
      }],
      description: "无模板生成游戏必填，官方模板填 null。机制与修饰器只能取自候选清单；玩法必须有真实取舍，纯点选不可接受。",
    },
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
    gameDesignPrinciplesPrompt(),
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

function buildUserPrompt(idea: string, analysis: IdeaAnalysis | null, directions: string[], currentProfile?: GameDesignProfile): string {
  const lines = [`玩法描述:${idea}`];
  if (analysis?.summary) lines.push(`玩法解析概括:${analysis.summary}`);
  if (analysis?.mechanics.length) lines.push(`已识别机制:${analysis.mechanics.join("、")}`);
  if (analysis?.hardConstraints.length) lines.push(`用户硬性约束(设计合同必须尊重):${analysis.hardConstraints.map((item) => `“${item}”`).join("、")}`);
  if (directions.length) {
    if (currentProfile) lines.push(`当前已确认并实现的方案：${JSON.stringify(currentProfile)}。在此基础上只修改用户明确要求的部分；未涉及的关数、模式、失败条件、节奏、计分和资源方向保持不变。`);
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
    ...(profile.generatedCampaign ? [
      profile.generatedCampaign.mode === "endless" ? "无限玩法没有最终胜利、强制通关或关卡选择；按确认规则持续供给可玩的内容。" : `关卡总数严格为${profile.generatedCampaign.levelCount}，结构变化关为${profile.generatedCampaign.milestones.join("/")}，不得增减。`,
      `难度维度${profile.generatedCampaign.difficultyKeys.join("、")}必须实际影响规则，不得只伪造探针返回值。依据：${profile.generatedCampaign.rationale}`,
    ] : []),
    ...blueprintRules(profile.generatedBlueprint),
  ];
}

interface DesignContractOptions {
  fetchImpl?: typeof fetch;
  endpoint?: string;
  /** Streaming waits this long for its first content delta. Defaults to timeoutMs. */
  streamFirstContentTimeoutMs?: number;
  /** Streaming waits this long between later content deltas. Defaults to timeoutMs. */
  streamIdleTimeoutMs?: number;
  timeoutMs?: number;
  maxAttempts?: number;
}

export class DesignContractGenerator {
  private readonly maxAttempts: number;
  private readonly fetchImpl: typeof fetch;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly streamFirstContentTimeoutMs: number;
  private readonly streamIdleTimeoutMs: number;

  constructor(private readonly settings: OpenAISettings, options: DesignContractOptions = {}) {
    this.maxAttempts = options.maxAttempts ?? MAX_ATTEMPTS;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.streamFirstContentTimeoutMs = options.streamFirstContentTimeoutMs ?? this.timeoutMs;
    this.streamIdleTimeoutMs = options.streamIdleTimeoutMs ?? this.timeoutMs;
  }

  /**
   * 返回 LLM 定制的设计合同;没有密钥或调用失败时返回 null,调用方回退到模板静态设计。
   * directions 传入创作者在制作对话中的历史修改意见(时间顺序),用于重建时修订设计合同。
   */
  async generate(rawInput: ProjectInput, analysis: IdeaAnalysis | null = null, directions: string[] = [], onDelta?: (text: string) => void, onReset?: () => void, signal?: AbortSignal, callbacks: { onValidating?: () => void } = {}): Promise<GameDesignProfile | null> {
    signal?.throwIfAborted();
    const input = projectInputSchema.parse(rawInput);
    const apiKey = this.settings.getApiKey();
    if (!apiKey) return null;
    const template = resolveGameTemplate(input, analysis);
    const baseline = input.confirmedDesignProfile ?? createDesignProfile(template, input.difficulty);
    try {
      return await this.requestDesign(input.idea, template, baseline, input.difficulty, analysis, directions.slice(-10), apiKey, onDelta, onReset, signal, callbacks.onValidating);
    } catch (error) {
      signal?.throwIfAborted();
      const reason = error instanceof Error ? error.message : "LLM 设计合同生成失败。";
      console.warn(`设计合同 LLM 生成失败，未返回可确认的方案：${reason}`);
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
      const content = await this.requestContent(messages, "direction_audit", auditJsonSchema, apiKey, undefined, undefined, undefined, "reviewer");
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
   * 没有密钥、缺少逐条结果或调用失败返回 null，由生产编排阻止未审计交付。
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
      const content = await this.requestContent(messages, "rule_fidelity", ruleAuditJsonSchema, apiKey, undefined, undefined, undefined, "reviewer");
      const parsed = ruleAuditAnswerSchema.parse(JSON.parse(content));
      if (parsed.verdicts.length !== rules.length) throw new Error(`规则审核不完整：要求${rules.length}条，实际${parsed.verdicts.length}条。`);
      return parsed.verdicts.slice(0, rules.length).map((verdict, index) => ({
        rule: rules[index] ?? verdict.rule,
        implemented: verdict.implemented,
        evidence: verdict.evidence.trim().slice(0, 160),
      }));
    } catch (error) {
      const reason = error instanceof Error ? error.message : "规则审计失败。";
      console.warn(`生成代码规则审计失败，制作流程必须停止后续生图及交付：${reason}`);
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
    onDelta?: (text: string) => void,
    onReset?: () => void,
    signal?: AbortSignal,
    onValidating?: () => void,
  ): Promise<GameDesignProfile> {
    const messages = [
      { role: "system", content: buildSystemPrompt(template, baseline, difficulty) },
      { role: "user", content: [
        buildUserPrompt(idea, analysis, directions, directions.length ? baseline : undefined),
        ...(template === "generated" ? [blueprintPlanningPrompt(idea)] : []),
      ].join("\n") },
    ];
    const content = await this.requestContent(messages, "design_contract", responseJsonSchema, apiKey, onDelta, onReset, signal, "planner");
    // This marks a real boundary: the provider has delivered a complete response,
    // but the local contract schema has not yet accepted it. Failures before this
    // point (including cancellation and timeouts) must never look like validation.
    onValidating?.();
    return this.parseDesign(content, baseline, template);
  }

  private async requestContent(
    messages: Array<{ role: string; content: string }>,
    schemaName: string,
    jsonSchema: unknown,
    apiKey: string,
    onDelta?: (text: string) => void,
    onReset?: () => void,
    signal?: AbortSignal,
    role: import("./openai-settings.js").TextRole = "planner",
  ): Promise<string> {
    let lastError: unknown = null;
    const attempts = onDelta ? 1 : this.maxAttempts;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      signal?.throwIfAborted();
      const controller = new AbortController();
      const streaming = Boolean(onDelta);
      let timeoutKind: "response" | "first-content" | "idle" = streaming ? "first-content" : "response";
      let timer: ReturnType<typeof setTimeout> | null = null;
      const armTimeout = (milliseconds: number) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => controller.abort(), milliseconds);
      };
      // A stream has no fixed total deadline: a complex, valid structured answer can
      // take longer than timeoutMs while still making visible progress. Before the
      // first meaningful delta and between later deltas it remains bounded instead.
      armTimeout(streaming ? this.streamFirstContentTimeoutMs : this.timeoutMs);
      try {
        const response = await this.fetchImpl(this.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          signal: signal ? AbortSignal.any([controller.signal, signal]) : controller.signal,
          body: JSON.stringify({
            ...this.settings.textRequestOptions(role),
            messages,
            ...(onDelta ? { stream: true } : {}),
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
          if (retryable && attempt < attempts) {
            lastError = error;
            continue;
          }
          throw error;
        }
        if (onDelta) {
          if (!response.body) throw new Error("模型未提供输出流。");
          let text = "", complete = false, finishReason: string | null = null;
          for await (const line of streamLines(response.body)) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") { complete = true; break; }
            const event = JSON.parse(data);
            if (event.error) throw new Error(`模型流式输出失败：${typeof event.error?.message === "string" ? event.error.message : "未说明原因"}`);
            // 提供方撤回了此前的增量（例如结构化输出被校验拒绝后重写），从头累积。
            if (event.reset) { text = ""; onReset?.(); continue; }
            const delta = event.choices?.[0]?.delta;
            const candidateFinishReason = event.choices?.[0]?.finish_reason;
            if (typeof candidateFinishReason === "string") finishReason = candidateFinishReason;
            if (delta?.refusal) throw new Error("模型拒绝了该请求。");
            if (typeof delta?.content === "string") {
              text += delta.content;
              // Empty deltas and protocol heartbeats do not prove the model is
              // progressing, so only visible content extends the idle deadline.
              if (delta.content.length > 0) {
                timeoutKind = "idle";
                armTimeout(this.streamIdleTimeoutMs);
              }
              onDelta(delta.content);
            }
          }
          if (!complete) throw new Error("模型输出连接中断，方案尚未完成。");
          if (finishReason && finishReason !== "stop") throw new Error(`模型流式输出因 ${finishReason} 截断，方案不能使用。`);
          signal?.throwIfAborted();
          return text;
        }
        const body = (await response.json()) as { choices?: Array<{ message?: { content?: string | null; refusal?: string | null }; finish_reason?: string | null }> };
        const message = body.choices?.[0]?.message;
        const finishReason = body.choices?.[0]?.finish_reason;
        if (message?.refusal) throw new Error(`模型拒绝了该请求：${message.refusal.slice(0, 120)}`);
        if (finishReason && finishReason !== "stop") throw new Error(`模型输出因 ${finishReason} 截断，方案不能使用。`);
        if (!message?.content) throw new Error("模型没有返回可解析的内容。");
        signal?.throwIfAborted();
        return message.content;
      } catch (error) {
        signal?.throwIfAborted();
        if (controller.signal.aborted) {
          lastError = new Error(timeoutKind === "idle"
            ? `模型流式输出连续 ${this.streamIdleTimeoutMs}ms 未产生有效内容。`
            : timeoutKind === "first-content"
              ? `模型流式输出在 ${this.streamFirstContentTimeoutMs}ms 内未收到首段有效内容。`
              : `模型接口在 ${this.timeoutMs}ms 内没有响应。`);
          if (attempt < attempts) continue;
          throw lastError;
        }
        if (attempt < attempts && error instanceof TypeError) {
          lastError = error;
          continue;
        }
        throw error;
      } finally {
        if (timer) clearTimeout(timer);
      }
    }
    throw lastError instanceof Error ? lastError : new Error("模型接口调用失败。");
  }

  private parseDesign(content: string, baseline: GameDesignProfile, template: GameTemplate): GameDesignProfile {
    let raw: unknown;
    try {
      raw = JSON.parse(content);
    } catch {
      throw new Error("模型返回的内容不是有效的 JSON。");
    }
    const answer = llmDesignSchema.parse(raw);
    const clip = (value: string, max: number) => value.trim().slice(0, max);
    // 模型偶尔多给一两条（例如 7 条无障碍说明）；超出合同上限的条目直接截去，而不是让整个修改方案作废。
    const clipList = (values: string[], max: number, maxItems = 6) => values.map((item) => clip(item, max)).filter((item) => item.length > 0).slice(0, maxItems);
    // 基线风险是模板代码的工程事实,永远保留;LLM 只能追加题材相关的新风险。
    const extraRisks = clipList(answer.extra_production_risks, 80, 4).filter((risk) => !baseline.productionRisks.includes(risk));
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
      gameFeel: clipList(answer.game_feel, 80, 8),
      onboarding: clipList(answer.onboarding, 80),
      accessibility: clipList(answer.accessibility, 80),
      productionRisks: [...baseline.productionRisks, ...extraRisks].slice(0, 6),
      ...(template === "generated" && answer.generated_campaign ? { generatedCampaign: answer.generated_campaign } : {}),
      // 蓝图只对无模板生成游戏有效；机制与修饰器 id 由 schema 对照知识库校验，选错即整份方案作废。
      ...(template === "generated" && answer.generated_blueprint ? {
        generatedBlueprint: generatedBlueprintSchema.parse({
          mechanicIds: answer.generated_blueprint.mechanic_ids,
          modifierIds: answer.generated_blueprint.modifier_ids,
          coreDecision: answer.generated_blueprint.core_decision,
          tension: answer.generated_blueprint.tension,
          masterySignal: answer.generated_blueprint.mastery_signal,
          sprites: answer.generated_blueprint.sprites.slice(0, 5),
        }),
      } : {}),
    });
  }
}
