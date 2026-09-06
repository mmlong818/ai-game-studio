import { z } from "zod";
import { MECHANIC_SEEDS } from "./mechanic-atlas-seeds.js";

const slug = z.string().regex(/^[a-z0-9][a-z0-9-]*$/);
const familySchema = z.enum(["movement", "spatial", "matching", "economy", "combat", "collection", "construction", "information", "timing", "social-simulation", "progression", "risk-reward", "physics", "stealth", "narrative", "simulation", "strategy", "survival", "multiplayer", "creation"]);
const lensCategorySchema = z.enum(["tempo", "information", "space", "resource", "recovery", "opposition"]);

export const mechanicAtlasEntrySchema = z.object({
  schemaVersion: z.literal("mechanic-atlas-entry-v2"), id: slug, kind: z.literal("independent-mechanic"),
  label: z.string().min(1).max(100), status: z.literal("reference-candidate"), provenance: z.literal("systematic-design-taxonomy"),
  family: familySchema, playerVerb: z.string().min(1), state: z.string().min(1), outcome: z.string().min(1),
  productionRule: z.string().min(1).max(500),
  acceptanceSignals: z.array(slug).min(2), tags: z.array(slug).min(2),
}).strict();

export type MechanicAtlasEntry = z.infer<typeof mechanicAtlasEntrySchema>;
type Base = Pick<MechanicAtlasEntry, "id" | "label" | "family" | "playerVerb" | "state" | "outcome">;
type Lens = { id: string; label: string; category: z.infer<typeof lensCategorySchema>; intent: string; rule: string; signal: string };

const bases: Base[] = MECHANIC_SEEDS.map(([id, label, family, playerVerb, state, outcome]) => ({ id, label, family, playerVerb, state, outcome }) as Base);

const lenses: Lens[] = [
  ["untimed-safe", "无计时安全局", "tempo", "去除实时压力，让理解和规划成为主要挑战。", "首次成功前不得引入倒计时或不可逆损失。", "safe-first-success"],
  ["countdown-pressure", "可见倒计时", "tempo", "用明确时限要求更快决策。", "倒计时必须在教学成功后出现，并提供暂停或重试。", "countdown-survived"],
  ["turn-budget", "有限回合", "tempo", "把时间压力改为可规划的动作预算。", "剩余回合始终可见，目标必须有预算内解证。", "turn-budget-solved"],
  ["simultaneous-cycle", "同步周期", "tempo", "让世界按周期推进，玩家选择介入时机。", "周期状态和下一次变化必须可预览。", "cycle-predicted"],
  ["full-information", "完全信息", "information", "公开所有关键状态，突出计算和取舍。", "影响结果的变量不得隐藏。", "outcome-previewed"],
  ["partial-information", "部分信息", "information", "保留有限未知量，形成概率判断。", "未知信息的范围和概率必须显式说明。", "uncertainty-explained"],
  ["fog-discovery", "探索揭示", "information", "通过行动逐步揭示空间或规则。", "隐藏内容不能成为无提示的必败条件。", "hidden-state-revealed"],
  ["forecast-preview", "后果预览", "information", "在确认前显示下一步主要后果。", "预览必须与实际结算使用同一规则源。", "preview-matched-resolution"],
  ["square-grid", "方格空间", "space", "把状态映射到离散格位以便计算和触控。", "格位边界、合法位置和占用必须清楚可见。", "grid-action-resolved"],
  ["parallel-lanes", "并行路线", "space", "把空间压缩成少量可读路线。", "任一压力阶段至少保留一条可识别的安全选择。", "lane-choice-resolved"],
  ["free-position", "连续空间", "space", "允许自由位置和距离形成细腻操作。", "触控必须有吸附、容差或等价按钮。", "free-position-confirmed"],
  ["node-network", "节点网络", "space", "用节点和连接表达路线或依赖。", "可达节点、锁定原因和路径代价必须可查询。", "network-route-completed"],
  ["unlimited-practice", "无限练习资源", "resource", "取消消耗，让玩家专注掌握规则。", "练习模式的状态必须与正式规则一致。", "practice-completed"],
  ["scarce-budget", "稀缺预算", "resource", "用有限资源制造优先级取舍。", "预算不足必须源于可追溯选择而非隐藏扣除。", "budget-choice-resolved"],
  ["regenerative-resource", "周期恢复", "resource", "让资源使用与等待形成节奏。", "恢复速度和上限始终可见。", "resource-regenerated"],
  ["shared-pool", "共享资源池", "resource", "让多个动作竞争同一资源。", "每次消耗必须显示对其他选择的影响。", "shared-pool-allocated"],
  ["instant-retry", "立即重试", "recovery", "失败后快速回到关键选择。", "重试不超过三秒且保留失败原因。", "retry-restored"],
  ["checkpoint-recovery", "检查点恢复", "recovery", "保留已证明掌握的阶段。", "检查点必须位于安全状态且明确显示。", "checkpoint-restored"],
  ["recoverable-mistake", "局内纠错", "recovery", "允许撤销或付出明确代价修正错误。", "纠错不能制造隐藏状态分叉。", "mistake-recovered"],
  ["escalating-help", "递进帮助", "recovery", "连续失败时逐步增加解释而非暗改难度。", "先解释原因，再给方向，最后展示一步。", "help-escalated"],
  ["static-challenge", "固定挑战", "opposition", "以可复现局面验证掌握。", "相同输入必须得到相同结果。", "fixed-challenge-replayed"],
  ["reactive-opponent", "响应型对手", "opposition", "让对手根据玩家可见行为回应。", "对手决策必须可解释且不能读取隐藏玩家意图。", "opponent-response-explained"],
  ["ghost-benchmark", "影子成绩", "opposition", "用历史轨迹或分数提供对比。", "影子不改变当前局规则或碰撞。", "ghost-compared"],
  ["self-competition", "自我挑战", "opposition", "以个人最佳或不同解法推动重玩。", "比较指标必须鼓励技巧而非重复劳动。", "personal-best-compared"],
].map(([id, label, category, intent, rule, signal]) => ({ id, label, category, intent, rule, signal })) as Lens[];

export const MECHANIC_ATLAS: MechanicAtlasEntry[] = bases.map((base) => mechanicAtlasEntrySchema.parse({
  schemaVersion: "mechanic-atlas-entry-v2", kind: "independent-mechanic", ...base,
  status: "reference-candidate", provenance: "systematic-design-taxonomy",
  productionRule: `玩家通过“${base.playerVerb}”改变“${base.state}”，并以“${base.outcome}”作为可观察结果。`,
  acceptanceSignals: [`${base.id}-attempted`, `${base.id}-resolved`], tags: [base.family, base.id],
}));

export const DESIGN_MODIFIERS = lenses.map(({ id, label, category, intent, rule, signal }) => ({ id, label, category, intent, rule, acceptanceSignal: signal }));

export function composeMechanicRecipe(mechanicId: string, modifierId: string) {
  const mechanic = MECHANIC_ATLAS.find(({ id }) => id === mechanicId);
  const modifier = DESIGN_MODIFIERS.find(({ id }) => id === modifierId);
  if (!mechanic || !modifier) return null;
  return { schemaVersion: "mechanic-combination-recipe-v1" as const, mechanicId, modifierId, label: `${mechanic.label} · ${modifier.label}`, designIntent: `${mechanic.playerVerb}；${modifier.intent}`, productionRule: `${mechanic.productionRule}${modifier.rule}`, acceptanceSignals: [...mechanic.acceptanceSignals, modifier.acceptanceSignal], countedAsIndependentMechanic: false };
}

export function searchMechanicAtlas(input: { query?: string; family?: Base["family"]; offset?: number; limit?: number } = {}) {
  const query = input.query?.trim().toLocaleLowerCase();
  const filtered = MECHANIC_ATLAS.filter((entry) => (!input.family || entry.family === input.family) && (!query || `${entry.label} ${entry.playerVerb} ${entry.state} ${entry.outcome} ${entry.tags.join(" ")}`.toLocaleLowerCase().includes(query)));
  const requestedOffset = Number.isFinite(input.offset) ? input.offset! : 0;
  const requestedLimit = Number.isFinite(input.limit) ? input.limit! : 30;
  const offset = Math.max(0, Math.floor(requestedOffset)); const limit = Math.min(100, Math.max(1, Math.floor(requestedLimit)));
  return { schemaVersion: "mechanic-atlas-search-v1" as const, total: MECHANIC_ATLAS.length, matched: filtered.length, offset, limit, entries: filtered.slice(offset, offset + limit), officialPromotionRequired: true };
}

export const MECHANIC_ATLAS_SUMMARY = {
  schemaVersion: "mechanic-atlas-summary-v2" as const, total: MECHANIC_ATLAS.length, modifiers: DESIGN_MODIFIERS.length, combinationCapacity: MECHANIC_ATLAS.length * DESIGN_MODIFIERS.length,
  byFamily: Object.fromEntries(familySchema.options.map((family) => [family, MECHANIC_ATLAS.filter((entry) => entry.family === family).length])),
  byModifierCategory: Object.fromEntries(lensCategorySchema.options.map((category) => [category, DESIGN_MODIFIERS.filter((entry) => entry.category === category).length])),
  boundary: "机制卡逐条独立计数；修饰器与组合配方单独管理，不计入机制数量。候选仍须经过原型、双端浏览器和真人试玩门禁。",
};

