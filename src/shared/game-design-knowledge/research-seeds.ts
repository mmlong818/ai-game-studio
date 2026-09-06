import { addResearchSource, attachResearchCandidate, createGameResearchTask, submitResearchSynthesis, type GameResearchTask } from "./research-queue.js";
import { integrateGameDesign } from "./integrator.js";
import type { GameDesignKnowledgeLibrary } from "./index.js";

const observed = new Date("2026-09-05T00:00:00.000Z");
const doNotCopy = ["不复制游戏名称、角色、美术、音频、文案、代码、数值表、物品配方或具体关卡。"];

export function initialDesignResearchTasks(library: GameDesignKnowledgeLibrary): GameResearchTask[] {
  const request = {
    idea: "把不同形状的工具放进有限容器，位置邻接与组合关系决定自动结算效果",
    dimensions: "2d" as const,
    input: "pointer" as const,
    targetMinutes: 10,
  };
  let task = createGameResearchTask(request, integrateGameDesign(request, library), observed);
  task = addResearchSource(task, {
    id: "developer-demo",
    title: "开发者公开试玩页",
    url: "https://playwithfurcifer.itch.io/backpack-battles",
    sourceType: "official-product",
    observedAt: "2026-09-05",
    gameplayObservations: ["玩家购买不同稀有度物品，在有限容器中组织位置形成构筑，再进入自动结算。"],
    onboardingObservations: ["公开页未提供足以验证首次教学顺序的结构化说明，仍需独立试玩。"],
    progressionObservations: ["物品稀有度和组合构筑提供成长方向，但不能据此证明难度递进公平。"],
    failureRecoveryObservations: ["公开页没有充分说明失败解释与恢复动作。"],
    doNotCopy,
  }, observed);
  task = addResearchSource(task, {
    id: "developer-press-kit",
    title: "开发者玩法说明",
    url: "https://playwithfurcifer.github.io/backpack-battles-presskit/",
    sourceType: "developer-material",
    observedAt: "2026-09-05",
    gameplayObservations: ["物品形状、大小、价格和稀有度共同限制摆放；相邻与合成关系形成协同，再用自动战斗验证构筑。"],
    onboardingObservations: ["无回合计时器降低摆放学习压力，可作为安全规划阶段的设计信号。"],
    progressionObservations: ["职业差异与物品协同扩展构筑空间，但内容规模不适合直接复制到小型网页游戏。"],
    failureRecoveryObservations: ["可观察对手构筑并调整下一轮选择，属于间接反馈，不等同于完整失败帮助。"],
    doNotCopy,
  }, observed);
  task = addResearchSource(task, {
    id: "mobile-store",
    title: "移动端官方商店页",
    url: "https://play.google.com/store/apps/details?id=com.playwithfurcifer.bpb.android",
    sourceType: "store-listing",
    observedAt: "2026-09-05",
    gameplayObservations: ["移动版仍以选择、摆放、合成和无计时自动结算为核心循环。"],
    onboardingObservations: ["商店页提供新手指南入口，但不足以证明玩家无需外部说明即可学会。"],
    progressionObservations: ["排名与休闲模式是外围结构，不应作为单机网页版本的必要组成。"],
    failureRecoveryObservations: ["公开用户反馈提示小屏触控误选、物品遮挡和组合信息可读性是高风险项。"],
    doNotCopy,
  }, observed);
  task = submitResearchSynthesis(task, {
    commonLoop: "在安全规划阶段购买或取得对象，利用有限空间、形状和邻接关系组织协同，再通过短暂自动结算观察结果并调整下一轮。",
    mechanicHypotheses: ["有限空间不是纯容量限制，而是把位置关系转化为构筑选择。", "自动结算把操作负担移到可验证的规划阶段。"],
    relationshipHypotheses: ["空间摆放先于协同计算，协同计算先于自动结算。", "对象说明必须同时展示占用格、影响格和触发条件。"],
    verificationPlan: ["先制作少量固定形状与邻接规则的离线单人原型。", "用固定种子验证同一布局产生同一结算。", "在 390px 触控视口验证旋转、拖放、说明和撤销。"],
    rejectionRisks: ["物品与配方数量可能造成内容爆炸。", "小屏拖放、遮挡和误触可能破坏最小操作目标。", "自动结算若不可回放，会让失败原因无法解释。"],
  }, observed);
  task = attachResearchCandidate(task, {
    kind: "pattern",
    artifact: {
      id: "container-synergy-planning",
      label: "有限容器协同规划",
      summary: "在无时间压力的有限格位中安排不同形状对象，以可预览的邻接关系形成协同，再用确定性结算验证布局。",
      scope: { dimensions: ["2d"], sessionMinutes: [3, 12], inputs: ["pointer", "touch", "keyboard"] },
      tags: ["puzzle", "spatial", "synergy", "short-session"],
      coreCapabilityIds: ["game-lifecycle", "unified-input", "score-system", "level-progression", "onboarding", "difficulty-plan", "failure-assistance", "sensory-feedback", "local-persistence", "accessible-presentation"],
      coreMechanicIds: ["finite-container-placement", "orthogonal-synergy", "deterministic-auto-resolution"],
      optionalMechanicIds: [],
      compositionRules: ["先完成无损摆放教学，再逐步加入协同、双格形状和损坏格；结算必须逐条解释且同一对对象只计算一次。"],
      knownRisks: ["对象数量可能造成内容爆炸；小屏误触和自动结算不可解释会破坏最小操作目标。"],
      evidence: task.sources.map(({ url, observedAt }) => ({ sourceUrl: url, observedAt, signal: "design-analysis" as const, note: "只提炼有限空间、邻接协同与自动验证的抽象结构，不复制具体表现、数值或内容。" })),
      lifecycle: "candidate",
      evaluationVersion: 1,
    },
  }, observed);
  return [task];
}
