import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addResearchSource, attachResearchCandidate, createGameResearchTask, submitResearchSynthesis } from "../shared/game-design-knowledge/research-queue";
import { integrateGameDesign } from "../shared/game-design-knowledge/integrator";
import { createResearchPrototypeEvaluation } from "../shared/game-design-knowledge/research-evaluation";
import { browserQualityAvailable } from "./browser-quality";
import { generateResearchPrototype, inspectResearchPrototype, ResearchPrototypeService } from "./research-prototype";

function taskFixture(family: "spatial" | "matching" | "movement" | "economy" | "combat" = "spatial") {
  const request = { idea: "让有限格子中的相邻符号依次触发状态变化" };
  let task = createGameResearchTask(request, integrateGameDesign(request), new Date("2026-09-05T00:00:00Z"));
  const source = (id: string, host: string, sourceType: "official-product" | "independent-analysis") => ({ id, title: id, url: `https://${host}/${id}`, sourceType, observedAt: "2026-09-05", gameplayObservations: ["记录动作和状态变化。"], onboardingObservations: [], progressionObservations: [], failureRecoveryObservations: [], doNotCopy: ["不复制表现内容。"] });
  task = addResearchSource(task, source("rules", "developer.example", "official-product"));
  task = addResearchSource(task, source("analysis", "analysis.example", "independent-analysis"));
  task = addResearchSource(task, source("play", "analysis.example", "independent-analysis"));
  task = submitResearchSynthesis(task, { commonLoop: "选择符号并观察相邻状态。", mechanicHypotheses: ["有限输入改变状态。"], relationshipHypotheses: ["输入先于结算。"], verificationPlan: ["重复输入验证确定性。"], rejectionRisks: ["状态反馈可能不清晰。"] });
  task = attachResearchCandidate(task, { kind: "mechanic", artifact: { id: `${family}-research-mechanic`, label: `<${family} 研究机制>`, family, playerVerb: "完成一次合法核心动作", state: ["game-state", "progress"], inputs: ["player-action"], outputs: ["state-changed"], capabilityIds: ["game-lifecycle", "onboarding"], relations: [], tunableDimensions: ["cognition", "space"], probeSignals: ["first-signal", "second-signal"] } });
  return { ...task, evaluation: createResearchPrototypeEvaluation(task) };
}

describe("研究原型自动执行器", () => {
  it("生成没有内联脚本且会转义研究文本的隔离原型", () => {
    const root = mkdtempSync(join(tmpdir(), "research-prototype-"));
    try {
      generateResearchPrototype(root, taskFixture());
      const html = readFileSync(join(root, "index.html"), "utf8");
      expect(html).toContain("&lt;spatial 研究机制&gt;");
      expect(html).toContain('<script src="./app.js"></script>');
      expect(html).toContain('<script src="./family.js"></script>');
      expect(html).not.toContain("<script>");
      expect(existsSync(join(root, "_studio", "GAME_DESIGN_CONTRACT.json"))).toBe(true);
    expect(existsSync(join(root, "_studio", "ASSET_REQUIREMENTS.json"))).toBe(true);
    expect(existsSync(join(root, "_studio", "RESOURCE_GAPS.json"))).toBe(true);
    expect(existsSync(join(root, "_studio", "RESOURCE_ACQUISITION_PLAN.json"))).toBe(true);
      expect(JSON.parse(readFileSync(join(root, "_studio", "PROTOTYPE_PROFILE.json"), "utf8"))).toEqual(expect.objectContaining({ family: "spatial", interactionSteps: ["cell-5", "cell-2"] }));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("资源执行任务会随重新生成的隔离原型归档", () => {
    const root = mkdtempSync(join(tmpdir(), "research-acquisition-task-"));
    try {
      const task = taskFixture();
      task.evaluation!.resourceAcquisitionTask = {
        schemaVersion: "research-resource-acquisition-task-v1", id: `ACQUISITION:${task.id}`, researchTaskId: task.id, evaluationId: task.evaluation!.id,
        sourcePlanGeneratedAt: task.evaluation!.resourceAcquisitionPlan!.generatedAt, createdAt: "2026-09-05T01:00:00.000Z", status: "prepared",
        items: [{ id: "ACQUIRE:ASSET-UI-SHELL", requirementId: "ASSET-UI-SHELL", route: "reuse-existing", state: "awaiting-binding-approval", automatedPreparation: false, selectedFamilyId: "clean-blue-ui-2d", suggestedPaths: ["start.png"], missingVariants: [], license: { status: "verified", licenseId: "CC0-1.0", sourceUrl: "https://example.com/ui", obligations: [] }, title: "批准界面绑定", deliverable: "交付界面", checklist: ["确认玩法语义"], completionRule: "人工确认后批准。" }],
        summary: { total: 1, prototypeReady: 0, awaitingBindingApproval: 1, awaitingLicenseReview: 0, awaitingAssetReview: 0 },
        safetyBoundaries: ["任务不等于素材已获得。"],
      };
      generateResearchPrototype(root, task);
      expect(JSON.parse(readFileSync(join(root, "_studio", "RESOURCE_ACQUISITION_TASK.json"), "utf8"))).toEqual(expect.objectContaining({ researchTaskId: task.id, status: "prepared" }));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it.runIf(browserQualityAvailable()).each(["spatial", "matching", "movement", "economy", "combat"] as const)("%s 原型在桌面和手机通过可见控件完成规则链", async (family) => {
    const root = mkdtempSync(join(tmpdir(), `research-prototype-${family}-`));
    try {
      const task = taskFixture(family);
      generateResearchPrototype(root, task);
      const result = await inspectResearchPrototype(root, task.evaluation!.requiredProbeSignals, "http://127.0.0.1:4313/research-prototype/test/");
      expect(result.probeRuns.every(({ status }) => status === "passed")).toBe(true);
      expect(result.browserRuns).toEqual(expect.arrayContaining([
        expect.objectContaining({ deviceClass: "desktop", status: "passed", interactionCompleted: true, consoleErrorCount: 0, accessibilityViolationCount: 0 }),
        expect.objectContaining({ deviceClass: "mobile", status: "passed", interactionCompleted: true, consoleErrorCount: 0, accessibilityViolationCount: 0 }),
      ]));
      expect(result.screenshots).toHaveLength(2);
    } finally { rmSync(root, { recursive: true, force: true }); }
  }, 30_000);

  it("并发运行同一任务时复用一次执行并把自动证据回填护照", async () => {
    const root = mkdtempSync(join(tmpdir(), "research-prototype-service-"));
    let task = taskFixture(); let inspections = 0; let preparations = 0;
    const repository = {
      getDesignResearchTask: async () => task,
      createDesignResearchEvaluation: async () => { preparations += 1; return task; },
      recordAutomaticDesignResearchProbeRun: async (_id: string, input: any) => { task = { ...task, evaluation: { ...task.evaluation!, probeRuns: [...task.evaluation!.probeRuns, { ...input, id: `P-${task.evaluation!.probeRuns.length}`, recordedAt: new Date().toISOString(), recordedBy: "automatic" }] } }; return task; },
      recordAutomaticDesignResearchBrowserRun: async (_id: string, input: any) => { task = { ...task, evaluation: { ...task.evaluation!, browserRuns: [...task.evaluation!.browserRuns, { ...input, id: `B-${task.evaluation!.browserRuns.length}`, recordedAt: new Date().toISOString(), recordedBy: "automatic" }] } }; return task; },
    };
    const inspect = async (_root: string, signals: string[], url: string) => { inspections += 1; await Promise.resolve(); return { probeRuns: signals.map((signalId) => ({ signalId, status: "passed" as const, observation: "自动探针通过。" })), browserRuns: (["desktop", "mobile"] as const).map((deviceClass) => ({ deviceClass, url, viewport: deviceClass === "desktop" ? "1280x800" : "390x844", status: "passed" as const, interactionCompleted: true, consoleErrorCount: 0, accessibilityViolationCount: 0, observation: "自动浏览器通过。" })), screenshots: [] } };
    try {
      const service = new ResearchPrototypeService(repository, root, "http://127.0.0.1:4313", inspect);
      const [first, second] = await Promise.all([service.run(task.id), service.run(task.id)]);
      expect(second).toEqual(first); expect(inspections).toBe(1); expect(preparations).toBe(1);
      expect(first.playUrl).toMatch(/^http:\/\/127\.0\.0\.1:4313\/research-prototype\/[0-9a-f-]{36}\/$/);
      expect(first.task.evaluation?.probeRuns.every(({ recordedBy }) => recordedBy === "automatic")).toBe(true);
      expect(first.task.evaluation?.browserRuns).toHaveLength(2);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});
