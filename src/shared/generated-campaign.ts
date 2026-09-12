import { z } from "zod";

/** Confirmed planning data, never inferred from the generated game's debug API. */
export const generatedCampaignSchema = z.object({
  mode: z.enum(["campaign", "endless"]).default("campaign"),
  failurePolicy: z.enum(["required", "forbidden"]).default("required"),
  levelCount: z.number().int().min(0).max(60),
  milestones: z.array(z.number().int().min(1).max(60)).max(20),
  difficultyKeys: z.array(z.string().regex(/^[a-z][a-zA-Z0-9]{0,39}$/)).max(6),
  rationale: z.string().trim().min(1).max(400),
}).superRefine((plan, ctx) => {
  if (plan.mode === "endless") {
    if (plan.levelCount !== 0 || plan.milestones.length) ctx.addIssue({ code: "custom", message: "无限玩法没有关卡，总关数必须为0且结构变化关为空。" });
  } else if (plan.levelCount < 1 || (plan.levelCount > 1 && !plan.difficultyKeys.length) || plan.milestones[0] !== 1 || plan.milestones.some((level, index) => level > plan.levelCount || (index > 0 && level <= plan.milestones[index - 1]))) {
    ctx.addIssue({ code: "custom", message: "结构变化关必须从第1关开始，严格递增且不超过总关数。", path: ["milestones"] });
  }
  if (new Set(plan.difficultyKeys).size !== plan.difficultyKeys.length) ctx.addIssue({ code: "custom", message: "难度维度不能重复。", path: ["difficultyKeys"] });
});

export type GeneratedCampaign = z.infer<typeof generatedCampaignSchema>;

export function resolveGeneratedCampaign(value?: unknown) {
  if (value === null) return { mode: "campaign" as const, failurePolicy: "required" as const, levelCount: 1, milestones: [1], difficultyKeys: [], rationale: "单局 demo；没有关卡递进。", legacy: false };
  if (value !== undefined) return { ...generatedCampaignSchema.parse(value), legacy: false };
  return { mode: "campaign" as const, failurePolicy: "required" as const, levelCount: 20, milestones: [1, 5, 9, 13, 17], difficultyKeys: ["goalMultiplier", "speedMultiplier", "densityMultiplier"], rationale: "旧生成版本兼容规则", legacy: true };
}

export function verifyGeneratedCampaign(actual: unknown, expected?: unknown) {
  const plan = resolveGeneratedCampaign(actual);
  if (expected !== undefined && JSON.stringify(plan) !== JSON.stringify(resolveGeneratedCampaign(expected))) {
    throw new Error("产物关卡协议与服务端确认方案不一致，不能使用产物声明降低验收要求。");
  }
  return plan;
}

export function fixedCampaignDifficultyKeys(value: unknown, confirmedRules: readonly string[] = []): string[] {
  const plan = resolveGeneratedCampaign(value);
  const confirmed = confirmedRules.join("；");
  return plan.difficultyKeys.filter(key => key === "mistakeLimit" && /(?:3次撞击|3枚警示灯|容错.{0,8}(?:固定|标准模式为)3次)/.test(confirmed));
}

export function generatedCampaignPrompt(value?: unknown, options: { confirmedRules?: readonly string[] } = {}): string {
  const plan = resolveGeneratedCampaign(value);
  if (plan.mode === "endless") return `无限玩法，没有关卡、胜利目标或最终通关；不提供关卡选择器，不实现setLevel或forceWin，不得达到分数或时间阈值后自动胜利。probe 的getState返回mode:"endless"及真实state/score，restart重新开始一局。收集物或挑战按确认方案持续供给；不得靠修改探针数据伪装无限。${plan.rationale}`;
  const fixedKeys = fixedCampaignDifficultyKeys(plan, options.confirmedRules);
  const dynamicKeys = plan.difficultyKeys.filter(key => !fixedKeys.includes(key));
  return `必须实现 ${plan.levelCount} 个可选择关卡；setLevel(1..${plan.levelCount})/restart 必须重建真实关卡，越界参数钳制到合法首末关。getState 返回 level、difficulty（数值维度：${plan.difficultyKeys.join("、")}）、contentVariant、runtimeSignature、mechanicsActive。${dynamicKeys.length ? `动态维度 ${dynamicKeys.join("、")} 代表真实规则参数${plan.legacy ? "，逐关不下降，相邻增幅不超过0.12" : "，按设计依据逐关朝同一方向单调变化（递增或递减均可，例如配额递增、半径或间隔递减），同一维度不得忽升忽降；不得捏造未采用的速度或密度倍率"}。` : ""}${fixedKeys.length ? `确认方案已把 ${fixedKeys.join("、")} 定为固定规则；必须保持该固定值，不得为了制造难度变化而擅改。` : ""}结构变化里程碑 ${plan.milestones.join("/")} 是必须出现新阶段或新变体的关卡，不表示其他关的普通数值只能在这些关变化；里程碑必须有不同的 contentVariant 和 runtimeSignature。设计依据：${plan.rationale}。`;
}
