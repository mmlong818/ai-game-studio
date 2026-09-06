import { describe, expect, it } from "vitest";
import { integrateGameDesign } from "./integrator";
import { addResearchSource, attachResearchCandidate, createGameResearchTask, decideResearchTask, submitResearchSynthesis } from "./research-queue";
import { createResearchPrototypeEvaluation, evaluateResearchPrototype, recordResearchBrowserRun, recordResearchPlaytest, recordResearchProbeRun } from "./research-evaluation";
import { createDesignKnowledgeShadow } from "./shadow";

const unknownRequest = { idea: "让梦境根据玩家说出的隐喻实时重写物理定律" };
const source = (id: string, host: string, sourceType: "official-product" | "independent-analysis" = "independent-analysis") => ({
  id,
  title: `参考 ${id}`,
  url: `https://${host}/${id}`,
  sourceType,
  observedAt: "2026-09-05",
  gameplayObservations: ["记录玩家动词、状态变化与核心循环。"],
  onboardingObservations: ["记录第一次成功动作前的教学。"],
  progressionObservations: ["记录新机制引入与组合顺序。"],
  failureRecoveryObservations: ["记录失败解释与重试方式。"],
  doNotCopy: ["名称、角色、美术、音频、文案、代码和具体关卡。"],
});

describe("外部游戏研究队列", () => {
  it("库外创意进入稳定研究任务，不能把普通匹配误送入队列", () => {
    const unknownPlan = integrateGameDesign(unknownRequest);
    const task = createGameResearchTask(unknownRequest, unknownPlan, new Date("2026-09-05T00:00:00Z"));
    expect(task.status).toBe("queued");
    expect(task.id).toMatch(/^RESEARCH-/);
    expect(() => createGameResearchTask({ idea: "卡牌肉鸽构筑" }, integrateGameDesign({ idea: "卡牌肉鸽构筑" }))).toThrow(/research-required/);
  });

  it("至少三个来源、两个站点和一个官方来源后才能进入评审", () => {
    let task = createGameResearchTask(unknownRequest, integrateGameDesign(unknownRequest), new Date("2026-09-05T00:00:00Z"));
    task = addResearchSource(task, source("one", "official.example", "official-product"));
    task = addResearchSource(task, source("two", "analysis.example"));
    const synthesis = { commonLoop: "观察隐喻、选择解释并验证世界规则变化。", mechanicHypotheses: ["语言选择改变可通行规则。"], relationshipHypotheses: ["选择结果与空间路径平衡耦合。"], verificationPlan: ["固定输入集验证相同隐喻产生可复现规则。"], rejectionRisks: ["开放语言输入可能无法穷举验证。"] };
    expect(() => submitResearchSynthesis(task, synthesis)).toThrow(/三个来源/);
    task = addResearchSource(task, source("three", "analysis.example"));
    task = submitResearchSynthesis(task, synthesis, new Date("2026-09-06T00:00:00Z"));
    expect(task.status).toBe("review");
    expect(() => decideResearchTask(task, "candidate-mechanic", "先以受限词表制作可复现原型。")).toThrow(/结构化候选草案/);
    task = attachResearchCandidate(task, { kind: "mechanic", artifact: {
      id: "metaphor-rule-switch", label: "隐喻规则切换", family: "information", playerVerb: "选择隐喻并观察规则变化",
      state: ["metaphor", "world-rule"], inputs: ["choose-metaphor"], outputs: ["rule-changed"],
      capabilityIds: ["game-lifecycle", "onboarding", "failure-assistance"], relations: [],
      tunableDimensions: ["cognition", "combination"], probeSignals: ["metaphor-chosen", "rule-changed"],
    } });
    expect(() => decideResearchTask(task, "candidate-mechanic", "尚未取得原型运行证据，不得提前接受。" )).toThrow(/合同、探针/);
    let evaluation = createResearchPrototypeEvaluation(task);
    expect(evaluation.assetRequirements?.requirements.some(({ usage }) => usage.mechanicIds.includes("metaphor-rule-switch"))).toBe(true);
    expect(evaluation.resourceGapSummary).toEqual(expect.objectContaining({ prototypeReady: true, reviewMissing: expect.any(Number), publishMissing: expect.any(Number) }));
    expect(evaluation.resourceAcquisitionPlan).toEqual(expect.objectContaining({ summary: expect.objectContaining({ planningReady: true, total: evaluation.assetRequirements?.requirements.length }) }));
    const { resourceAcquisitionPlan: _omittedPlan, ...legacyEvaluation } = evaluation;
    const enriched = createResearchPrototypeEvaluation({ ...task, evaluation: legacyEvaluation }, new Date("2026-09-05T12:00:00.000Z"));
    expect(enriched.resourceAcquisitionPlan?.summary.planningReady).toBe(true);
    expect(enriched.contract).toEqual(evaluation.contract);
    for (const signalId of evaluation.requiredProbeSignals) evaluation = recordResearchProbeRun(evaluation, { signalId, status: "passed", observation: "固定输入重复运行得到相同状态变化。" }, new Date(), "automatic");
    for (const deviceClass of ["desktop", "mobile"] as const) evaluation = recordResearchBrowserRun(evaluation, { deviceClass, url: `https://sandbox.example/${deviceClass}`, viewport: deviceClass === "desktop" ? "1280x800" : "390x844", status: "passed", interactionCompleted: true, consoleErrorCount: 0, accessibilityViolationCount: 0, observation: "真实浏览器完成核心循环且没有错误。" }, new Date(), "automatic");
    for (const testerSegment of ["novice", "casual", "experienced"] as const) evaluation = recordResearchPlaytest(evaluation, { testerSegment, taskOutcome: "completed", onboardingClarity: 4, controlClarity: 4, funRating: 4, fairnessRating: 4, wouldReplay: true, blockerCode: "none" });
    task = { ...task, evaluation };
    expect(evaluateResearchPrototype(evaluation)).toEqual(expect.objectContaining({ ready: true, resources: true, probes: true, browser: true, playtest: true }));
    expect(decideResearchTask(task, "candidate-mechanic", "先以受限词表制作可复现原型。", new Date("2026-09-07T00:00:00Z")).status).toBe("accepted");
  });
});

describe("影子策划评估", () => {
  it("显式服务端模板映射到知识玩法，但不返回生产路由指令", () => {
    const shadow = createDesignKnowledgeShadow({ idea: "经典落块消行游戏", template: "tetris", dimensions: "2d", inputModes: ["keyboard", "touch-buttons"] });
    expect(shadow.plan.selectedPatternId).toBe("falling-block-puzzle");
    expect(shadow.plan.status).toBe("matched");
    expect(shadow.agreement).toBe("exact");
    expect(shadow).not.toHaveProperty("template");
  });

  it("同一服务端通道会按保留的 3D 模式选择收集或竞技场知识", () => {
    const collector = createDesignKnowledgeShadow({ idea: "第三人称收集遗迹", template: "signal-hunt", dimensions: "3d", threeMode: "collector", inputModes: ["keyboard"] });
    const arena = createDesignKnowledgeShadow({ idea: "第三人称竞技场射击", template: "signal-hunt", dimensions: "3d", threeMode: "arena", inputModes: ["keyboard"] });
    expect(collector.plan.selectedPatternId).toBe("third-person-collection");
    expect(arena.plan.selectedPatternId).toBe("wave-shooter");
    expect([collector.agreement, arena.agreement]).toEqual(["exact", "exact"]);
  });
});
