// 游戏设计知识库(机器可用层)。人类可读的完整提炼见 docs/33-game-design-knowledge.md,两边必须同步修订。
export { GAME_DESIGN_PRINCIPLES, gameDesignPrinciplesPrompt } from './game-presentation-policy.js';

export const designPillars = [
  { id: "clear-goal", rule: "每一关、每一局的目标必须一句话可理解" },
  { id: "meaningful-choice", rule: "玩家的决定要产生可感知的后果,避免只有一种可行打法" },
  { id: "progressive-complexity", rule: "机制分步引入,信息最小碎片化,先教会再加压" },
  { id: "difficulty-curve", rule: "难度逐级递增无断崖,同档内允许题面/路线/阵型变化而非全部数值上涨" },
  { id: "instant-feedback", rule: "关键操作、成功、失败都有可区分的视听反馈" },
  { id: "risk-reward", rule: "用可失去的进度制造张力,用冒险奖励制造兴奋,不滥用惩罚" },
  { id: "replayability", rule: "随机种子、多解法、可选挑战、分数追逐至少占其一" },
  { id: "visual-clarity", rule: "玩家/棋盘/目标是第一视觉层级,美术不得牺牲规则可读性" },
  { id: "theme-coherence", rule: "题材、机制、美术、声音互相印证,不做皮肤换色" },
  { id: "accessibility", rule: "触控目标、对比度、色盲可辨、可调难度是设计要求而非附加项" },
] as const;

export const mechanicVocabulary = {
  进程: ["关卡推进", "经验成长", "任务与挑战", "里程碑成就", "解锁内容", "逆转机会"],
  规则: ["回合制", "倒计时", "连击连消", "组合技", "冷却", "资源管理", "建设放置", "区域控制", "生命系统", "风险回报抉择", "随机机遇", "隐藏信息"],
  反馈: ["得分", "进度展示", "即时视听反馈", "奖励节奏", "高光奖励时刻"],
  认知: ["解谜推理", "空间推理", "模式识别", "路径规划", "记忆", "反应时间", "策略规划"],
} as const;

export const playerMotivations = ["成就感", "发现探索欲", "掌控感", "收集欲", "紧迫感", "幸运感", "自我表现"] as const;

export const commonDesignMistakes = [
  "一次引入过多机制压垮新手",
  "规则指示不清导致试错式游玩",
  "难度突刺或断崖",
  "只有单一主导策略",
  "反馈缺失让操作显得无意义",
  "视觉杂乱淹没交互主体",
  "忽视无障碍与触控可达性",
] as const;

export function mechanicVocabularyLines(): string[] {
  return Object.entries(mechanicVocabulary).map(([category, tags]) => `${category}:${tags.join("、")}`);
}
