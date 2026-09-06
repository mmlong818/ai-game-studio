import { describe, expect, it } from "vitest";
import { resolve } from "node:path";
import { openTestDatabase } from "./database";
import { loadCuratedResourceLibrary } from "./resource-library";
import { StudioRepository } from "./studio-repository";

const player = (suffix: number) => `player-00000000-0000-4000-8000-${String(suffix).padStart(12, "0")}`;

describe("游戏设计知识季度复核", () => {
  it("只输出玩法聚合指标，并保守给出保留或降级复核建议", async () => {
    const database = await openTestDatabase();
    const repository = new StudioRepository(database, "http://127.0.0.1:4312");
    try {
      const healthy = await repository.create({ title: "健康合并样本", idea: "滑动整个数字棋盘合并同值方块。", template: "merge-2048", dimensions: "2d" });
      const risky = await repository.create({ title: "风险落块样本", idea: "旋转并放置持续下落的拼块完成消行。", template: "tetris", dimensions: "2d" });
      for (let index = 1; index <= 3; index += 1) {
        const healthyBase = { projectId: healthy.id, versionId: healthy.version.id, playerId: player(index), inputMode: "touch" as const, viewport: "390x844", level: index };
        await repository.recordPlayEvent({ ...healthyBase, type: "start", averageFps: 58 });
        await repository.recordPlayEvent({ ...healthyBase, type: "complete", averageFps: 57 });
        const riskyBase = { projectId: risky.id, versionId: risky.version.id, playerId: player(index + 10), inputMode: "keyboard" as const, viewport: "1366x768", level: 1 };
        await repository.recordPlayEvent({ ...riskyBase, type: "start", averageFps: 32 });
        await repository.recordPlayEvent({ ...riskyBase, type: "resource-error" });
        await repository.recordPlayEvent({ ...riskyBase, type: "exit", averageFps: 31 });
      }
      const now = new Date();
      const report = await repository.designKnowledgeReview({ from: new Date(now.getTime() - 86_400_000), to: new Date(now.getTime() + 60_000), minimumPlayers: 2, minimumStarts: 2 });
      expect(report.privacy).toEqual({ aggregateOnly: true, playerIdentifiersIncluded: false, freeTextIncluded: false });
      const merge = report.patterns.find(({ patternId }) => patternId === "sliding-merge-puzzle");
      expect(merge?.samples).toEqual({ distinctPlayers: 3, versions: 1, starts: 3 });
      expect(merge?.metrics.completionRate).toBe(1);
      expect(merge?.recommendation).toBe("retain");
      const falling = report.patterns.find(({ patternId }) => patternId === "falling-block-puzzle");
      expect(falling?.metrics.resourceErrorRate).toBe(1);
      expect(falling?.recommendation).toBe("demotion-review");
      expect(JSON.stringify(report)).not.toContain("player-00000000");
      expect(report.limitations.join(" ")).toContain("不能证明乐趣");

      const defaultThreshold = await repository.designKnowledgeReview({ from: new Date(now.getTime() - 86_400_000), to: new Date(now.getTime() + 60_000) });
      expect(defaultThreshold.patterns.every(({ recommendation }) => recommendation === "insufficient-evidence")).toBe(true);
    } finally {
      await database.close();
    }
  });

  it("拒绝倒置的复核时间范围", async () => {
    const database = await openTestDatabase();
    try {
      const repository = new StudioRepository(database, "http://127.0.0.1:4312");
      await expect(repository.designKnowledgeReview({ from: new Date("2026-09-06"), to: new Date("2026-09-05") })).rejects.toThrow(/时间范围无效/);
    } finally {
      await database.close();
    }
  });

  it("保存不可变复核快照、结构化试玩和带证据的人工决定", async () => {
    const database = await openTestDatabase();
    const repository = new StudioRepository(database, "http://127.0.0.1:4312");
    try {
      const project = await repository.create({ title: "试玩复核样本", idea: "滑动数字并合并同值方块。", template: "merge-2048", dimensions: "2d" });
      const now = new Date();
      const from = new Date(now.getTime() - 86_400_000);
      const to = new Date(now.getTime() + 60_000);
      const base = { projectId: project.id, versionId: project.version.id, playerId: player(91), inputMode: "touch" as const, viewport: "390x844" };
      await repository.recordPlayEvent({ ...base, type: "start", averageFps: 58 });
      await repository.recordPlayEvent({ ...base, type: "complete", averageFps: 57 });

      const playtest = await repository.recordDesignPlaytest({
        projectId: project.id,
        versionId: project.version.id,
        testerSegment: "novice",
        deviceClass: "mobile",
        inputMode: "touch",
        taskOutcome: "completed",
        onboardingClarity: 4,
        controlClarity: 5,
        perceivedDifficulty: 3,
        funRating: 4,
        fairnessRating: 5,
        wouldReplay: true,
        completionSeconds: 86,
        hintCount: 1,
        blockerCode: "none",
      });
      expect(playtest.patternId).toBe("sliding-merge-puzzle");
      expect(JSON.stringify(playtest)).not.toContain("player-");

      const snapshot = await repository.captureDesignKnowledgeReview({ from, to, minimumPlayers: 1, minimumStarts: 1 });
      expect(snapshot.report.evidenceThresholds).toEqual({ minimumPlayers: 1, minimumStarts: 1 });
      expect(snapshot.report.patterns.find(({ patternId }) => patternId === playtest.patternId)?.samples.starts).toBe(1);
      await repository.recordPlayEvent({ ...base, type: "fail", averageFps: 55 });
      const [stored] = await repository.listDesignKnowledgeReviews();
      expect(stored?.id).toBe(snapshot.id);
      expect(stored?.report.patterns.find(({ patternId }) => patternId === playtest.patternId)?.events.failures).toBe(0);

      await expect(repository.recordDesignKnowledgeDecision(snapshot.id, {
        patternId: playtest.patternId,
        outcome: "promote",
        rationale: "运行表现稳定，准备进入晋级复核。",
        evidence: ["telemetry", "contract", "browser"],
      })).rejects.toThrow(/缺少必要证据/);

      const decision = await repository.recordDesignKnowledgeDecision(snapshot.id, {
        patternId: playtest.patternId,
        outcome: "promote",
        rationale: "运行表现稳定，真人试玩也验证了教学、操作和公平性。",
        evidence: ["telemetry", "playtest", "contract", "browser"],
      });
      expect(decision.outcome).toBe("promote");
      expect((await repository.listDesignKnowledgeReviews())[0]?.decisions).toEqual([decision]);
      expect((await repository.listDesignPlaytests())[0]).toEqual(playtest);
    } finally {
      await database.close();
    }
  });

  it("试玩未完成时必须记录结构化卡点，不接受自由文本替代", async () => {
    const database = await openTestDatabase();
    const repository = new StudioRepository(database, "http://127.0.0.1:4312");
    try {
      const project = await repository.create({ title: "卡点样本", idea: "旋转并放置持续下落的拼块，完成整行后消除得分。", template: "tetris", dimensions: "2d" });
      await expect(repository.recordDesignPlaytest({
        projectId: project.id,
        versionId: project.version.id,
        testerSegment: "casual",
        deviceClass: "desktop",
        inputMode: "keyboard",
        taskOutcome: "blocked",
        onboardingClarity: 2,
        controlClarity: 3,
        perceivedDifficulty: 5,
        funRating: 2,
        fairnessRating: 2,
        wouldReplay: false,
        hintCount: 2,
        blockerCode: "none",
        notes: "这里不应允许保存自由文本",
      })).rejects.toThrow();
    } finally {
      await database.close();
    }
  });

  it("只把已批准决定转换为不可变的待发布知识变更集", async () => {
    const database = await openTestDatabase();
    const repository = new StudioRepository(database, "http://127.0.0.1:4312");
    try {
      const project = await repository.create({
        title: "候选空间谜题",
        idea: "转动立体书改变桥梁连接，收集折纸星并抵达出口。",
        template: "generated",
        dimensions: "3d",
      });
      const now = new Date();
      const from = new Date(now.getTime() - 86_400_000);
      const to = new Date(now.getTime() + 60_000);
      const event = { projectId: project.id, versionId: project.version.id, playerId: player(92), inputMode: "touch" as const, viewport: "390x844" };
      await repository.recordPlayEvent({ ...event, type: "start", averageFps: 56 });
      await repository.recordPlayEvent({ ...event, type: "complete", averageFps: 55 });
      const playtest = await repository.recordDesignPlaytest({
        projectId: project.id,
        versionId: project.version.id,
        testerSegment: "novice",
        deviceClass: "mobile",
        inputMode: "touch",
        taskOutcome: "completed",
        onboardingClarity: 4,
        controlClarity: 4,
        perceivedDifficulty: 3,
        funRating: 4,
        fairnessRating: 4,
        wouldReplay: true,
        completionSeconds: 120,
        hintCount: 1,
        blockerCode: "none",
      });
      expect(playtest.patternId).toBe("popup-spatial-puzzle");
      const snapshot = await repository.captureDesignKnowledgeReview({ from, to, minimumPlayers: 1, minimumStarts: 1 });
      const decision = await repository.recordDesignKnowledgeDecision(snapshot.id, {
        patternId: playtest.patternId,
        outcome: "promote",
        rationale: "候选玩法已经补齐真人教学、公平性和浏览器运行证据。",
        evidence: ["telemetry", "playtest", "contract", "solver", "browser"],
      });
      const [changeSet, concurrentChangeSet] = await Promise.all([
        repository.createDesignKnowledgeChangeSet(snapshot.id),
        repository.createDesignKnowledgeChangeSet(snapshot.id),
      ]);
      expect(changeSet.status).toBe("pending");
      expect(changeSet.changes).toEqual([expect.objectContaining({
        patternId: "popup-spatial-puzzle",
        fromLifecycle: "candidate",
        toLifecycle: "verified",
        fromEvaluationVersion: 1,
        toEvaluationVersion: 2,
        decisionId: decision.id,
      })]);
      expect(concurrentChangeSet).toEqual(changeSet);
      expect(await repository.createDesignKnowledgeChangeSet(snapshot.id)).toEqual(changeSet);
      expect(await repository.listDesignKnowledgeChangeSets()).toEqual([changeSet]);
      await expect(repository.exportDesignKnowledgeChangeSet(changeSet.id)).rejects.toThrow(/审核通过/);
      const approved = await repository.reviewDesignKnowledgeChangeSet(changeSet.id, {
        decision: "approve",
        rationale: "证据链完整，批准形成新的知识库发布候选。",
      });
      expect(approved.status).toBe("approved");
      const exported = await repository.exportDesignKnowledgeChangeSet(changeSet.id);
      expect(exported.checksum).toMatch(/^[0-9a-f]{64}$/);
      expect(exported.library.patterns.find(({ id }) => id === playtest.patternId)?.lifecycle).toBe("verified");
      const [release, concurrentRelease] = await Promise.all([
        repository.publishDesignKnowledgeChangeSet(changeSet.id),
        repository.publishDesignKnowledgeChangeSet(changeSet.id),
      ]);
      expect(concurrentRelease).toEqual(release);
      expect(release.sequence).toBe(1);
      expect(release.kind).toBe("change-set");
      expect(release.supersedesReleaseId).toBeNull();
      expect(await repository.listDesignKnowledgeReleases()).toEqual([release]);
      expect((await repository.currentDesignKnowledgeLibrary()).patterns.find(({ id }) => id === playtest.patternId)?.lifecycle).toBe("verified");
      const afterRelease = await repository.create({
        title: "已验证空间谜题",
        idea: "转动立体场景改变桥梁连接，收集折纸星并抵达出口。",
        template: "generated",
        dimensions: "3d",
      });
      expect(afterRelease.spec.designKnowledge?.plan.status).toBe("matched");
      expect((await repository.listDesignKnowledgeChangeSets())[0]?.status).toBe("published");
      await expect(repository.recordDesignKnowledgeDecision(snapshot.id, {
        patternId: playtest.patternId,
        outcome: "retest",
        rationale: "形成变更集后不应再覆盖原决定。",
        evidence: ["playtest"],
      })).rejects.toThrow(/不能再修改/);

      const secondSnapshot = await repository.captureDesignKnowledgeReview({ from, to, minimumPlayers: 1, minimumStarts: 1 });
      await repository.recordDesignKnowledgeDecision(secondSnapshot.id, {
        patternId: playtest.patternId,
        outcome: "demote",
        rationale: "模拟发现新的质量风险，先降回候选状态验证恢复链路。",
        evidence: ["telemetry", "playtest", "contract", "solver", "browser"],
      });
      const secondChangeSet = await repository.createDesignKnowledgeChangeSet(secondSnapshot.id);
      await repository.reviewDesignKnowledgeChangeSet(secondChangeSet.id, {
        decision: "approve",
        rationale: "批准测试用的第二个知识版本，以验证安全恢复流程。",
      });
      const secondRelease = await repository.publishDesignKnowledgeChangeSet(secondChangeSet.id);
      expect(secondRelease.sequence).toBe(2);
      expect((await repository.currentDesignKnowledgeLibrary()).patterns.find(({ id }) => id === playtest.patternId)?.lifecycle).toBe("candidate");
      const [rollback, concurrentRollback] = await Promise.all([
        repository.rollbackDesignKnowledgeRelease({ sourceReleaseId: release.id, rationale: "第二版出现质量回归，恢复经过验证的第一版知识内容。" }),
        repository.rollbackDesignKnowledgeRelease({ sourceReleaseId: release.id, rationale: "第二版出现质量回归，恢复经过验证的第一版知识内容。" }),
      ]);
      expect(concurrentRollback).toEqual(rollback);
      expect(rollback).toEqual(expect.objectContaining({
        sequence: 3,
        kind: "rollback",
        changeSetId: null,
        rollbackSourceReleaseId: release.id,
        supersedesReleaseId: secondRelease.id,
      }));
      expect((await repository.currentDesignKnowledgeLibrary()).patterns.find(({ id }) => id === playtest.patternId)?.lifecycle).toBe("verified");
      expect((await repository.listDesignKnowledgeReleases()).map(({ sequence }) => sequence)).toEqual([3, 2, 1]);
    } finally {
      await database.close();
    }
  });

  it("按复核周期形成趋势，并按试玩经验、设备和输入方式给出匿名细分", async () => {
    const database = await openTestDatabase();
    const repository = new StudioRepository(database, "http://127.0.0.1:4312");
    try {
      const project = await repository.create({ title: "趋势样本", idea: "滑动数字并合并同值方块。", template: "merge-2048", dimensions: "2d" });
      const now = new Date();
      const from = new Date(now.getTime() - 86_400_000);
      const to = new Date(now.getTime() + 60_000);
      const event = { projectId: project.id, versionId: project.version.id, playerId: player(99), inputMode: "touch" as const, viewport: "390x844" };
      await repository.recordPlayEvent({ ...event, type: "start", averageFps: 58 });
      await repository.recordPlayEvent({ ...event, type: "complete", averageFps: 58 });
      await repository.recordDesignPlaytest({
        projectId: project.id, versionId: project.version.id, testerSegment: "novice", deviceClass: "mobile", inputMode: "touch",
        taskOutcome: "completed", onboardingClarity: 5, controlClarity: 4, perceivedDifficulty: 2, funRating: 5, fairnessRating: 4,
        wouldReplay: true, completionSeconds: 70, hintCount: 1, blockerCode: "none",
      });
      await repository.recordDesignPlaytest({
        projectId: project.id, versionId: project.version.id, testerSegment: "expert", deviceClass: "desktop", inputMode: "keyboard",
        taskOutcome: "blocked", onboardingClarity: 3, controlClarity: 4, perceivedDifficulty: 5, funRating: 2, fairnessRating: 2,
        wouldReplay: false, completionSeconds: null, hintCount: 0, blockerCode: "difficulty",
      });
      await repository.captureDesignKnowledgeReview({ from, to, minimumPlayers: 1, minimumStarts: 1 });
      await repository.captureDesignKnowledgeReview({ from, to, minimumPlayers: 1, minimumStarts: 1 });
      const insights = await repository.designKnowledgeInsights();
      const trend = insights.trends.find(({ patternId }) => patternId === "sliding-merge-puzzle");
      expect(trend?.points).toHaveLength(2);
      expect(trend?.points.every(({ completionRate }) => completionRate === 1)).toBe(true);
      const breakdown = insights.playtests.find(({ patternId }) => patternId === "sliding-merge-puzzle");
      expect(breakdown?.overall).toEqual(expect.objectContaining({ sampleCount: 2, completionRate: .5, replayRate: .5 }));
      expect(breakdown?.overall.ratings.funRating).toBe(3.5);
      expect(breakdown?.overall.blockers).toEqual({ difficulty: 1 });
      expect(breakdown?.byTesterSegment.novice?.sampleCount).toBe(1);
      expect(breakdown?.byDeviceClass.desktop?.completionRate).toBe(0);
      expect(breakdown?.byInputMode.touch?.replayRate).toBe(1);
      expect(JSON.stringify(insights)).not.toContain("player-");
    } finally {
      await database.close();
    }
  });

  it("持久化外部研究证据，并让已接受候选进入同一审核发布链路", async () => {
    const database = await openTestDatabase();
    const resourceFamilies = await loadCuratedResourceLibrary(resolve("assets/library/curated"));
    const repository = new StudioRepository(database, "http://127.0.0.1:4312", null, resourceFamilies);
    try {
      const seeded = await repository.ensureInitialDesignResearchTasks();
      expect(seeded).toHaveLength(1);
      expect(seeded[0]).toEqual(expect.objectContaining({ status: "review", candidateDraft: { kind: "pattern", artifact: expect.objectContaining({ id: "container-synergy-planning" }) }, decision: null }));
      expect(seeded[0]?.sources).toHaveLength(3);
      expect(await repository.ensureInitialDesignResearchTasks()).toHaveLength(1);
      const legacySeed = { ...seeded[0]!, candidateDraft: null };
      await database.query("UPDATE design_research_tasks SET task_json=$2 WHERE id=$1", [legacySeed.id, JSON.stringify(legacySeed)]);
      expect((await repository.ensureInitialDesignResearchTasks())[0]?.candidateDraft).toEqual(expect.objectContaining({ kind: "pattern", artifact: expect.objectContaining({ id: "container-synergy-planning" }) }));
      const input = { idea: "根据天气谚语切换棋盘重力方向，并验证新的通行规则", dimensions: "2d" as const, input: "touch" as const, targetMinutes: 5 };
      let task = await repository.createDesignResearchTask(input);
      expect(task.status).toBe("queued");
      expect(await repository.createDesignResearchTask(input)).toEqual(task);
      const source = (id: string, host: string, sourceType: "official-product" | "independent-analysis") => ({
        id, title: `来源 ${id}`, url: `https://${host}/${id}`, sourceType, observedAt: "2026-09-05",
        gameplayObservations: ["只记录核心动作、状态变化和可复现循环。"], onboardingObservations: ["记录第一次成功动作。"],
        progressionObservations: ["记录规则引入顺序。"], failureRecoveryObservations: ["记录失败解释和重试。"],
        doNotCopy: ["不复制名称、美术、音频、文案、代码或具体关卡。"],
      });
      task = await repository.addDesignResearchSource(task.id, source("rules", "developer.example", "official-product"));
      task = await repository.addDesignResearchSource(task.id, source("analysis", "analysis.example", "independent-analysis"));
      task = await repository.addDesignResearchSource(task.id, source("playtest", "analysis.example", "independent-analysis"));
      task = await repository.submitDesignResearchSynthesis(task.id, {
        commonLoop: "选择谚语、观察重力变化、规划路线并验证出口。",
        mechanicHypotheses: ["有限词表只切换预定义重力方向。"],
        relationshipHypotheses: ["重力切换必须先于路径移动结算。"],
        verificationPlan: ["固定棋盘和输入序列验证状态可复现。"],
        rejectionRisks: ["开放文本会扩大到无法穷举的规则空间。"],
      });
      task = await repository.attachDesignResearchCandidate(task.id, { kind: "mechanic", artifact: {
        id: "proverb-gravity-switch", label: "谚语重力切换", family: "spatial", playerVerb: "选择提示并切换重力方向",
        state: ["gravity-direction", "board"], inputs: ["choose-proverb"], outputs: ["gravity-changed"],
        capabilityIds: ["game-lifecycle", "onboarding", "failure-assistance"], relations: [],
        tunableDimensions: ["cognition", "space", "combination"], probeSignals: ["proverb-chosen", "gravity-changed"],
      } });
      await expect(repository.decideDesignResearchTask(task.id, { outcome: "candidate-mechanic", rationale: "缺少运行证据时必须拒绝提前进入候选库。" })).rejects.toThrow(/合同、探针/);
      task = await repository.createDesignResearchEvaluation(task.id);
      expect(await repository.createDesignResearchEvaluation(task.id)).toEqual(task);
      expect(task.evaluation?.contract.knowledge.researchTaskIds).toEqual([task.id]);
      expect(task.evaluation?.contract.audience.experience).toBe("first-time");
      expect(task.evaluation?.resourceAcquisitionPlan?.decisions.find(({ requirementId }) => requirementId === "ASSET-UI-SHELL")).toMatchObject({ route: "reuse-existing", selectedFamilyId: "clean-blue-ui-2d", license: { status: "verified", licenseId: "CC0-1.0" } });
      expect(task.evaluation?.resourceAcquisitionPlan?.decisions.find(({ requirementId }) => requirementId === "ASSET-AUDIO-FEEDBACK")).toMatchObject({ route: "reuse-existing", selectedFamilyId: "neutral-interface-audio" });
      task = await repository.createDesignResearchResourceAcquisitionTask(task.id);
      expect(task.evaluation?.resourceAcquisitionTask).toEqual(expect.objectContaining({
        schemaVersion: "research-resource-acquisition-task-v1",
        researchTaskId: task.id,
        sourcePlanGeneratedAt: task.evaluation?.resourceAcquisitionPlan?.generatedAt,
        status: "prepared",
      }));
      expect(task.evaluation?.resourceAcquisitionTask?.summary.total).toBe(task.evaluation?.resourceAcquisitionPlan?.summary.total);
      expect(task.evaluation?.resourceAcquisitionTask?.items.some(({ state }) => state === "awaiting-binding-approval")).toBe(true);
      expect(await repository.createDesignResearchResourceAcquisitionTask(task.id)).toEqual(task);
      const resourceEvidence = [
        { kind: "resource-file" as const, reference: "_studio/resources/ui-shell.json", note: "库内资源文件已经绑定" },
        { kind: "visual-review" as const, reference: "_studio/reviews/ui-shell.json", note: "视觉状态已经人工核对" },
        { kind: "runtime-report" as const, reference: "_studio/reports/ui-shell.json", note: "浏览器运行结果已经归档" },
      ];
      task = await repository.submitDesignResearchResourceAcquisitionWork(task.id, "ASSET-UI-SHELL", { note: "首轮界面资源成果已经提交", evidence: resourceEvidence });
      expect(task.evaluation?.resourceAcquisitionTask?.items.find(({ requirementId }) => requirementId === "ASSET-UI-SHELL")?.state).toBe("submitted-for-review");
      task = await repository.reviewDesignResearchResourceAcquisitionWork(task.id, "ASSET-UI-SHELL", { decision: "return", rationale: "触控状态的视觉区别仍需增强" });
      task = await repository.submitDesignResearchResourceAcquisitionWork(task.id, "ASSET-UI-SHELL", { note: "已增强触控状态并重新提交", evidence: resourceEvidence });
      task = await repository.reviewDesignResearchResourceAcquisitionWork(task.id, "ASSET-UI-SHELL", { decision: "approve", rationale: "文件、视觉与运行证据均已复核通过" });
      expect(task.evaluation?.resourceAcquisitionTask?.items.find(({ requirementId }) => requirementId === "ASSET-UI-SHELL")).toMatchObject({ state: "approved", submissions: [{ id: "SUBMISSION-1" }, { id: "SUBMISSION-2" }], reviews: [{ decision: "return" }, { decision: "approve" }] });
      for (const signalId of task.evaluation!.requiredProbeSignals) task = await repository.recordAutomaticDesignResearchProbeRun(task.id, { signalId, status: "passed", observation: "固定棋盘与输入序列重复运行，状态变化一致。" });
      for (const deviceClass of ["desktop", "mobile"] as const) task = await repository.recordAutomaticDesignResearchBrowserRun(task.id, { deviceClass, url: `https://sandbox.example/${task.id}/${deviceClass}`, viewport: deviceClass === "desktop" ? "1280x800" : "390x844", status: "passed", interactionCompleted: true, consoleErrorCount: 0, accessibilityViolationCount: 0, observation: "真实浏览器完成教学和一次核心循环，无控制台错误。" });
      for (const testerSegment of ["novice", "casual", "experienced"] as const) task = await repository.recordDesignResearchPlaytest(task.id, { testerSegment, taskOutcome: "completed", onboardingClarity: 4, controlClarity: 4, funRating: 4, fairnessRating: 4, wouldReplay: true, blockerCode: "none" });
      task = await repository.decideDesignResearchTask(task.id, { outcome: "candidate-mechanic", rationale: "结构已经收敛为有限输入和可复现状态，接受为候选机制。" });
      expect(task.status).toBe("accepted");
      const reloadedRepository = new StudioRepository(database, "http://127.0.0.1:4312");
      expect((await reloadedRepository.listDesignResearchTasks()).find(({ id }) => id === task.id)).toEqual(task);
      const [changeSet, duplicate] = await Promise.all([
        reloadedRepository.createDesignResearchChangeSet(task.id),
        reloadedRepository.createDesignResearchChangeSet(task.id),
      ]);
      expect(duplicate).toEqual(changeSet);
      expect(changeSet).toEqual(expect.objectContaining({ reviewId: null, researchTaskId: task.id, schemaVersion: "design-knowledge-change-set-v2", status: "pending" }));
      expect(changeSet.changes[0]).toEqual(expect.objectContaining({ kind: "add-mechanic" }));
      await reloadedRepository.reviewDesignKnowledgeChangeSet(changeSet.id, { decision: "approve", rationale: "来源、抽象边界和验证计划完整，批准发布候选机制。" });
      const release = await reloadedRepository.publishDesignKnowledgeChangeSet(changeSet.id);
      expect(release.sequence).toBe(1);
      expect((await reloadedRepository.currentDesignKnowledgeLibrary()).mechanics.some(({ id }) => id === "proverb-gravity-switch")).toBe(true);
    } finally {
      await database.close();
    }
  });
});
