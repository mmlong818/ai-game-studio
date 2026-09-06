import { z } from "zod";
import { GAME_DESIGN_KNOWLEDGE_LIBRARY } from "./catalog.js";
import type { GameDesignKnowledgeLibrary } from "./index.js";
import { knowledgeMappingForTemplate } from "./official-mapping.js";
import { rankPlayPatterns } from "./rank.js";

export type DesignIntegrationRequest = {
  idea: string;
  templateId?: string | null;
  dimensions?: "2d" | "limited-3d";
  input?: "keyboard" | "pointer" | "touch" | "gamepad";
  targetMinutes?: number;
};

export const designIntegrationPlanSchema = z.object({
  status: z.enum(["matched", "prototype-required", "research-required"]),
  confidence: z.number().min(0).max(100),
  selectedPatternId: z.string().min(1).nullable(),
  alternatives: z.array(z.object({ patternId: z.string().min(1), score: z.number().nonnegative(), matchedTags: z.array(z.string()) }).strict()).max(3),
  capabilityIds: z.array(z.string().min(1)),
  mechanicIds: z.array(z.string().min(1)),
  assumptions: z.array(z.string().min(1)),
  compositionRules: z.array(z.string().min(1)),
  knownRisks: z.array(z.string().min(1)),
  evidenceUrls: z.array(z.string().url()),
  rationale: z.array(z.string().min(1)),
  researchQuery: z.object({ playerVerbs: z.array(z.string().min(1)), constraints: z.array(z.string().min(1)) }).strict().nullable(),
}).strict();

export type DesignIntegrationPlan = z.infer<typeof designIntegrationPlanSchema>;

const tagVocabulary: Record<string, string[]> = {
  puzzle: ["解谜", "益智", "拼图", "谜题", "puzzle"], action: ["动作", "躲避", "闪避", "战斗", "射击", "跑酷"],
  score: ["积分", "高分", "排行榜", "连击"], card: ["卡牌", "扑克", "纸牌", "牌组", "deck"],
  roguelite: ["肉鸽", "roguelite", "随机成长", "每局不同"], build: ["构筑", "升级组合", "流派"],
  runner: ["跑酷", "换道", "冲刺"], survival: ["生存", "割草", "活下去"], shooter: ["射击", "子弹", "弹幕"],
  waves: ["波次", "一波波", "敌群"], match: ["三消", "匹配", "消除"], casual: ["休闲", "轻松", "简单"],
  progression: ["成长", "闯关", "升级", "解锁"], simulation: ["模拟", "经营"], management: ["经营", "排队", "管理", "分拣", "排序"],
  rhythm: ["音乐", "节奏", "拍子"], skill: ["技巧", "精准", "反应"], narrative: ["剧情", "故事", "叙事", "选择"],
  deduction: ["推理", "侦探", "线索"], logic: ["逻辑", "数独", "约束"], maze: ["迷宫", "找路", "出口"],
  spatial: ["空间", "旋转", "拼合", "立体"], solver: ["可解", "求解", "接龙", "华容道"], arcade: ["街机", "打砖块", "弹球"],
  "turn-based": ["回合", "轮流"], route: ["路线选择", "三选一", "分支路线"], "limited-3d": ["3d", "立体", "三维"],
};

function inferTags(idea: string) {
  const normalized = idea.toLowerCase();
  return Object.entries(tagVocabulary).filter(([, words]) => words.some((word) => normalized.includes(word))).map(([tag]) => tag);
}

function inferPlayerVerbs(idea: string) {
  const candidates = ["移动", "滑动", "拖动", "旋转", "射击", "收集", "躲避", "匹配", "消除", "选择", "建造", "经营", "推理", "排序", "合并", "冲刺"];
  return candidates.filter((verb) => idea.includes(verb));
}

export function integrateGameDesign(request: DesignIntegrationRequest, library: GameDesignKnowledgeLibrary = GAME_DESIGN_KNOWLEDGE_LIBRARY): DesignIntegrationPlan {
  const exact = knowledgeMappingForTemplate(request.templateId);
  const inferredDimensions = request.dimensions ?? (/3d|三维|立体/i.test(request.idea) ? "limited-3d" : "2d");
  const inferredInput = request.input ?? "touch";
  const tags = inferTags(request.idea);
  const ranked = rankPlayPatterns(library, { tags, dimensions: inferredDimensions, input: inferredInput });
  const candidates = ranked.map(({ pattern, score }) => ({ pattern, score, matchedTags: pattern.tags.filter((tag) => tags.includes(tag)) }));
  const selected = exact ? library.patterns.find(({ id }) => id === exact.patternId) ?? null : candidates.find(({ matchedTags }) => matchedTags.length > 0)?.pattern ?? null;
  const selectedRank = selected ? candidates.find(({ pattern }) => pattern.id === selected.id) : null;
  const exactRationale = exact ? [exact.rationale, `来源于已登记官方模板 ${exact.templateId} 的反向映射。`] : [];
  if (!selected) {
    return {
      status: "research-required", confidence: 0, selectedPatternId: null,
      alternatives: candidates.slice(0, 3).map(({ pattern, score, matchedTags }) => ({ patternId: pattern.id, score, matchedTags })),
      capabilityIds: ["game-lifecycle", "unified-input", "onboarding", "difficulty-plan", "failure-assistance"], mechanicIds: [],
      assumptions: [`默认目标为${inferredDimensions === "2d" ? "2D" : "有限3D"}单人网页游戏`, `默认主要输入为${inferredInput}`],
      compositionRules: [], knownRisks: ["知识库没有足够接近的已验证玩法，直接生成会扩大不可验证范围。"], evidenceUrls: [],
      rationale: ["没有找到包含用户关键玩法标签的模式。"],
      researchQuery: { playerVerbs: inferPlayerVerbs(request.idea), constraints: [inferredDimensions, inferredInput, request.targetMinutes ? `约${request.targetMinutes}分钟` : "短局"] },
    };
  }
  const explicitMechanics = exact?.mechanicIds ?? selected.coreMechanicIds;
  const confidence = exact ? 100 : Math.min(95, 40 + (selectedRank?.matchedTags.length ?? 0) * 15 + Math.min(20, selected.evidence.length * 5));
  const outsideSession = request.targetMinutes !== undefined && (request.targetMinutes < selected.scope.sessionMinutes[0] || request.targetMinutes > selected.scope.sessionMinutes[1]);
  return {
    status: selected.lifecycle === "verified" && !outsideSession ? "matched" : "prototype-required",
    confidence,
    selectedPatternId: selected.id,
    alternatives: candidates.filter(({ pattern }) => pattern.id !== selected.id).slice(0, 3).map(({ pattern, score, matchedTags }) => ({ patternId: pattern.id, score, matchedTags })),
    capabilityIds: [...new Set(["game-lifecycle", "unified-input", "onboarding", "difficulty-plan", "failure-assistance", ...selected.coreCapabilityIds])],
    mechanicIds: [...new Set([...explicitMechanics, ...selected.optionalMechanicIds])],
    assumptions: [`默认目标为${inferredDimensions === "2d" ? "2D" : "有限3D"}单人网页游戏`, `默认主要输入为${inferredInput}`, ...(outsideSession ? ["目标时长超出该玩法已验证区间，需要单独原型验证"] : [])],
    compositionRules: selected.compositionRules,
    knownRisks: selected.knownRisks,
    evidenceUrls: [...new Set(selected.evidence.map(({ sourceUrl }) => sourceUrl))],
    rationale: [...exactRationale, `匹配玩法：${selected.label}。`, ...(selectedRank?.matchedTags.length ? [`命中标签：${selectedRank.matchedTags.join("、")}。`] : [])],
    researchQuery: null,
  };
}
