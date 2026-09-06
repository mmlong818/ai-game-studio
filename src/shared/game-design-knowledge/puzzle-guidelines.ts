import { z } from "zod";

const id = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);

export const puzzleDesignGuidelineSchema = z.object({
  id,
  category: z.enum(["goal", "curriculum", "difficulty", "assistance", "feedback", "input", "scoring", "replay", "accessibility", "validation", "scope"]),
  disposition: z.enum(["required", "recommended", "optional", "rejected-default"]),
  rule: z.string().min(1),
  rationale: z.string().min(1),
  acceptance: z.string().min(1),
  verificationKinds: z.array(z.enum(["contract", "solver", "probe", "browser", "playtest"])).min(1),
  tags: z.array(id).min(1),
}).strict();

export type PuzzleDesignGuideline = z.infer<typeof puzzleDesignGuidelineSchema>;

/**
 * 对《益智游戏.md》的规范化提炼。原文只作为检查清单来源，
 * 不作为流行度、市场表现或具体玩法有效性的证据。
 */
export const PUZZLE_DESIGN_GUIDELINES: PuzzleDesignGuideline[] = [
  { id: "observable-goal", category: "goal", disposition: "required", rule: "目标、合法动作和完成状态必须在游戏内可观察。", rationale: "玩家不应依赖外部说明猜测规则。", acceptance: "首次进入后可指出目标，并通过一次合法动作获得对应反馈。", verificationKinds: ["contract", "probe", "playtest"], tags: ["puzzle", "universal"] },
  { id: "one-new-concept", category: "curriculum", disposition: "required", rule: "每个教学阶段最多引入一个需要主动学习的新概念。", rationale: "把理解失败定位到单一变化，避免一次堆叠多个机制。", acceptance: "阶段合同明确新增概念，前置概念均已在安全环境完成。", verificationKinds: ["contract", "probe"], tags: ["puzzle", "onboarding"] },
  { id: "safe-before-pressure", category: "curriculum", disposition: "required", rule: "新机制先在无时间或低惩罚环境中练习，再加入压力。", rationale: "先证明理解，再评估操作或资源管理。", acceptance: "每个核心机制至少有一次无复合压力的成功机会。", verificationKinds: ["contract", "probe", "playtest"], tags: ["puzzle", "onboarding"] },
  { id: "challenge-relief-pacing", category: "difficulty", disposition: "recommended", rule: "挑战峰值之间安排巩固或缓冲阶段。", rationale: "持续升压会造成疲劳，也难以判断玩家是否真正掌握。", acceptance: "关卡序列能标注教学、巩固、考核和缓冲节拍。", verificationKinds: ["contract", "playtest"], tags: ["puzzle", "progression"] },
  { id: "single-axis-difficulty", category: "difficulty", disposition: "required", rule: "相邻阶段默认只提升一个主要难度维度。", rationale: "避免认知、操作、空间、资源和惩罚同时上涨形成断崖。", acceptance: "难度向量差异可解释；多维提升必须有试玩证据。", verificationKinds: ["contract", "solver", "playtest"], tags: ["puzzle", "progression"] },
  { id: "progressive-hint-ladder", category: "assistance", disposition: "required", rule: "提示按目标提醒、局部线索、动作建议逐级增加，不默认直接揭示答案。", rationale: "辅助应恢复学习过程，而不是替玩家完成。", acceptance: "至少两级提示可重看，失败原因与下一步建议可区分。", verificationKinds: ["contract", "probe", "playtest"], tags: ["puzzle", "assistance"] },
  { id: "non-shaming-assistance", category: "assistance", disposition: "required", rule: "使用提示、重试或降难不得以羞辱性文案或默认冷却阻止玩家。", rationale: "平台面向非专业用户，帮助功能首先服务于完成体验。", acceptance: "所有辅助路径可立即使用，代价如存在必须由设计目标证明。", verificationKinds: ["contract", "browser", "playtest"], tags: ["puzzle", "accessibility"] },
  { id: "immediate-action-feedback", category: "feedback", disposition: "required", rule: "输入、非法动作、状态变化、奖励和失败都有即时且可区分的反馈。", rationale: "反馈把操作与规则结果连接起来。", acceptance: "关键状态变化均产生探针事件，非法动作说明原因。", verificationKinds: ["probe", "browser", "playtest"], tags: ["puzzle", "universal"] },
  { id: "equivalent-inputs", category: "input", disposition: "required", rule: "承诺支持的键盘、指针和触控方式映射到等价游戏动作。", rationale: "设备差异不应改变规则可用性。", acceptance: "每种声明输入均能完成核心循环，触控目标满足尺寸要求。", verificationKinds: ["probe", "browser"], tags: ["puzzle", "accessibility"] },
  { id: "transparent-scoring", category: "scoring", disposition: "recommended", rule: "若有计分，必须显示分数来源、结算摘要和个人最佳。", rationale: "分数只有在玩家理解如何改进时才形成掌握目标。", acceptance: "同一事件的计分可复现，结算能解释主要加减分。", verificationKinds: ["contract", "probe", "playtest"], tags: ["puzzle", "score"] },
  { id: "structural-replay", category: "replay", disposition: "recommended", rule: "复玩变化应改变目标、空间、信息、资源或机制组合，而非只换皮或放大数值。", rationale: "结构变化才能产生新的判断。", acceptance: "复玩方案至少改变一个可验证的决策结构。", verificationKinds: ["contract", "solver", "playtest"], tags: ["puzzle", "replay"] },
  { id: "fair-randomness", category: "validation", disposition: "required", rule: "随机内容必须可复现，并证明不会生成无解或不可读状态。", rationale: "随机性应增加变化，不应把失败原因交给运气。", acceptance: "同种子同结果；生成器有求解或安全路径检查。", verificationKinds: ["solver", "probe"], tags: ["puzzle", "procedural"] },
  { id: "redundant-cues", category: "accessibility", disposition: "required", rule: "关键信息不只依赖颜色、声音或瞬时动画中的一种。", rationale: "保证不同感知条件下仍能理解和完成。", acceptance: "目标、危险、合法性和结果至少有两种互补线索。", verificationKinds: ["contract", "browser", "playtest"], tags: ["puzzle", "accessibility"] },
  { id: "diverse-playtest-loop", category: "validation", disposition: "required", rule: "记录不同经验玩家的行为数据、口述理解、问题、改动和复测结果。", rationale: "作者理解不能代替首次玩家的真实学习过程。", acceptance: "每轮试玩有版本、样本、任务、指标、观察、改动和复测结论。", verificationKinds: ["playtest"], tags: ["puzzle", "evaluation"] },
  { id: "optional-fiction-layer", category: "scope", disposition: "optional", rule: "叙事、世界和角色仅在强化玩法理解或动机时加入。", rationale: "它们不是每个益智游戏的完成度硬指标。", acceptance: "能指出其服务的玩法目标和资源成本，否则不生成。", verificationKinds: ["contract", "playtest"], tags: ["puzzle", "narrative"] },
  { id: "no-forced-social-systems", category: "scope", disposition: "rejected-default", rule: "排行榜、社交、UGC 和赛季活动不得作为默认完成度组件。", rationale: "这些系统扩大运营、合规和内容审核范围，不符合当前单人网页与最小操作目标。", acceptance: "只有用户明确要求且平台范围评估通过时才进入合同。", verificationKinds: ["contract"], tags: ["puzzle", "platform-scope"] },
];

export function puzzleGuidelinesFor(tags: string[]): PuzzleDesignGuideline[] {
  const requested = new Set(["puzzle", "universal", ...tags]);
  return PUZZLE_DESIGN_GUIDELINES.filter((guideline) => guideline.tags.some((tag) => requested.has(tag)));
}

export function validatePuzzleDesignGuidelines(input: unknown = PUZZLE_DESIGN_GUIDELINES) {
  return z.array(puzzleDesignGuidelineSchema).min(1).safeParse(input);
}
