import { z } from "zod";

/**
 * 参考游戏机制档案：从公开网页游戏的客户端行为中提炼出的规则层事实。
 * 只记录规则、数值、公式与结构规律，不含任何原代码片段、标识符、资源文件名或地址；
 * 复刻实现使用它作为依据，而不是复用对方的代码或资源。
 */
const text = z.string().trim().max(6000);
const items = z.array(z.string().trim().min(1).max(800)).max(24);

export const referenceMechanicsSchema = z.object({
  title: z.string().trim().min(1).max(120),
  controls: items,
  entities: items,
  coreRule: text.min(1),
  blockingRule: text,
  winCondition: text,
  loseCondition: text,
  timer: text,
  lives: text,
  levels: text,
  levelStructure: text,
  scoring: text,
  board: text,
  uiLayout: text,
  feedback: items,
  unknowns: items,
}).strict();

export type ReferenceMechanics = z.infer<typeof referenceMechanicsSchema>;

/** 交给文本模型的输出合同（snake_case 是模型侧字段名，服务端再转成 camelCase）。 */
export const referenceMechanicsJsonSchema = {
  type: "object", additionalProperties: false,
  required: ["title", "controls", "entities", "core_rule", "blocking_rule", "win_condition", "lose_condition", "timer", "lives", "levels", "level_structure", "scoring", "board", "ui_layout", "feedback", "unknowns"],
  properties: {
    title: { type: "string", description: "游戏名称" },
    controls: { type: "array", items: { type: "string" }, description: "每种输入方式如何触发动作，含判定阈值" },
    entities: { type: "array", items: { type: "string" }, description: "棋盘/场景上的对象类型及其属性与状态" },
    core_rule: { type: "string", description: "一次操作后逐步发生什么" },
    blocking_rule: { type: "string", description: "何时操作无效或被阻挡、阻挡后的后果；没有则写 无" },
    win_condition: { type: "string", description: "胜利判定；读不出写 未知" },
    lose_condition: { type: "string", description: "失败/中断判定；读不出写 未知" },
    timer: { type: "string", description: "是否计时、时长如何确定、超时后果；没有则写 无" },
    lives: { type: "string", description: "生命/机会的数量与扣减、恢复规则；没有则写 无" },
    levels: { type: "string", description: "关卡总数或生成方式（数据表 / 程序生成 / 参数公式）" },
    level_structure: { type: "string", description: "关卡随进度如何变化：尺寸、数量、难度参数的公式或表；程序化生成写清每个阶段与参数" },
    scoring: { type: "string", description: "计分、连胜、评价等量化规则；没有则写 无" },
    board: { type: "string", description: "场景几何：尺寸范围、格子/对象几何、缩放平移规则" },
    ui_layout: { type: "string", description: "HUD 元素、位置与状态显示，不含美术细节" },
    feedback: { type: "array", items: { type: "string" }, description: "动画/音效/震动等反馈发生的时机与含义" },
    unknowns: { type: "array", items: { type: "string" }, description: "确实读不出的内容" },
  },
} as const;

const snakeSchema = z.object({
  title: z.string(), controls: z.array(z.string()), entities: z.array(z.string()), core_rule: z.string(), blocking_rule: z.string(),
  win_condition: z.string(), lose_condition: z.string(), timer: z.string(), lives: z.string(), levels: z.string(), level_structure: z.string(),
  scoring: z.string(), board: z.string(), ui_layout: z.string(), feedback: z.array(z.string()), unknowns: z.array(z.string()),
});

const clipItems = (values: string[], max = 24, maxChars = 800) => values.map(value => value.trim().slice(0, maxChars)).filter(Boolean).slice(0, max);

/** 把模型输出（snake_case）规范成机制档案；超长字段截断而不是让整份档案作废。 */
export function parseReferenceMechanics(raw: unknown): ReferenceMechanics {
  const answer = snakeSchema.parse(raw);
  const clip = (value: string) => value.trim().slice(0, 6000);
  return referenceMechanicsSchema.parse({
    title: answer.title.trim().slice(0, 120) || "参考游戏",
    controls: clipItems(answer.controls), entities: clipItems(answer.entities),
    coreRule: clip(answer.core_rule) || "未知", blockingRule: clip(answer.blocking_rule), winCondition: clip(answer.win_condition), loseCondition: clip(answer.lose_condition),
    timer: clip(answer.timer), lives: clip(answer.lives), levels: clip(answer.levels), levelStructure: clip(answer.level_structure),
    scoring: clip(answer.scoring), board: clip(answer.board), uiLayout: clip(answer.ui_layout),
    feedback: clipItems(answer.feedback), unknowns: clipItems(answer.unknowns),
  });
}

export const isUnknownRuleText = (value: string) => /^\s*(?:未知|不明|不确定|unknown|n\/a)\s*[。.]?\s*$/i.test(value);

/** 策划与代码生成共用的档案文本：规则事实按字段列出，明确它是依据而非可复用代码。 */
export function referenceMechanicsPrompt(dossier: ReferenceMechanics): string {
  const list = (values: string[]) => values.length ? values.map(item => `  - ${item}`).join("\n") : "  - 无";
  return [
    `参考机制档案：《${dossier.title}》（从公开客户端行为分析得到的规则事实；不含也不得照搬任何原代码、标识符、美术或音频资源）`,
    `操作方式：\n${list(dossier.controls)}`,
    `对象与状态：\n${list(dossier.entities)}`,
    `核心规则：${dossier.coreRule}`,
    `阻挡/无效操作：${dossier.blockingRule || "无"}`,
    `胜利条件：${dossier.winCondition || "未知"}`,
    `失败条件：${dossier.loseCondition || "未知"}`,
    `计时：${dossier.timer || "无"}`,
    `生命：${dossier.lives || "无"}`,
    `关卡：${dossier.levels || "未知"}`,
    `关卡结构与生成规律：${dossier.levelStructure || "未知"}`,
    `计分：${dossier.scoring || "无"}`,
    `场景几何：${dossier.board || "未知"}`,
    `界面布局：${dossier.uiLayout || "未知"}`,
    `反馈时机：\n${list(dossier.feedback)}`,
    `档案中确实未知的项（只有这些允许写“未知”）：\n${list(dossier.unknowns)}`,
  ].join("\n");
}
