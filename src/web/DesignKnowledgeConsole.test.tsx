import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectSummary } from "../shared/contracts";
import { DesignKnowledgeConsole } from "./DesignKnowledgeConsole";
import { PreferencesProvider } from "./preferences";
import * as api from "./api";

vi.mock("./api", () => ({
  addDesignResearchSource: vi.fn(), addGameplayRadarSignal: vi.fn(), attachDesignResearchCandidate: vi.fn(), createDesignResearchChangeSet: vi.fn(), createDesignResearchEvaluation: vi.fn(), createDesignResearchResourceAcquisitionTask: vi.fn(), createDesignResearchTask: vi.fn(), decideDesignResearchTask: vi.fn(), intakeApprovedDesignResearchResources: vi.fn(), promoteDesignResearchResourceFamilies: vi.fn(), recordDesignResearchBrowserRun: vi.fn(), recordDesignResearchPlaytest: vi.fn(), recordDesignResearchProbeRun: vi.fn(), reviewDesignResearchResourceIntake: vi.fn(), reviewDesignResearchResourceWork: vi.fn(), submitDesignResearchResourceWork: vi.fn(), submitDesignResearchSynthesis: vi.fn(), startGameplayRadarResearch: vi.fn(),
  captureDesignKnowledgeReview: vi.fn(), createDesignKnowledgeChangeSet: vi.fn(), exportDesignKnowledgeChangeSet: vi.fn(),
  getDesignKnowledgeChangeSets: vi.fn(), getDesignKnowledgeInsights: vi.fn(), getDesignKnowledgeReleases: vi.fn(), getDesignKnowledgeReviews: vi.fn(), getDesignResearchTasks: vi.fn(), getGameplayRadar: vi.fn(), getMechanicAtlas: vi.fn(),
  getDesignPlaytests: vi.fn(), getProjects: vi.fn(), publishDesignKnowledgeChangeSet: vi.fn(), recordDesignKnowledgeDecision: vi.fn(),
  recordDesignPlaytest: vi.fn(), reviewDesignKnowledgeChangeSet: vi.fn(), rollbackDesignKnowledgeRelease: vi.fn(), runDesignResearchEvaluation: vi.fn(), getOpenAISettings: vi.fn(), saveOpenAIKey: vi.fn(), clearOpenAIKey: vi.fn(),
}));

const project = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "滑动合并",
  version: { id: "00000000-0000-4000-8000-000000000002", number: 1 },
} as ProjectSummary;

const report = {
  schemaVersion: "design-knowledge-review-v2",
  generatedAt: "2026-09-05T08:00:00.000Z",
  window: { from: "2026-06-05T08:00:00.000Z", to: "2026-09-05T08:00:00.000Z" },
  knowledgeBase: { schemaVersion: "game-design-knowledge-v1", updatedAt: "2026-09-05", evaluationVersion: 1, releaseId: null },
  evidenceThresholds: { minimumPlayers: 20, minimumStarts: 20 },
  privacy: { aggregateOnly: true, playerIdentifiersIncluded: false, freeTextIncluded: false },
  patterns: [{
    patternId: "sliding-merge-puzzle", label: "滑动合并解谜", currentLifecycle: "verified", evaluationVersion: 1,
    samples: { distinctPlayers: 28, versions: 2, starts: 35 }, events: { completes: 25, failures: 4, exits: 6, resourceErrors: 0 },
    metrics: { completionRate: .714, failureRate: .114, exitRate: .171, resourceErrorRate: 0, averageFps: 58, inputModes: { touch: 35 } },
    recommendation: "retain", rationale: "匿名完成、退出和技术指标未触发复核风险。",
  }],
  unassignedEvents: 0,
  limitations: ["匿名数据不能证明乐趣。"],
} as const;

describe("策划知识发布台", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    window.localStorage.setItem("forge-locale", "zh-CN");
    vi.mocked(api.getDesignKnowledgeReviews).mockResolvedValue([]);
    vi.mocked(api.getDesignPlaytests).mockResolvedValue([]);
    vi.mocked(api.getDesignKnowledgeChangeSets).mockResolvedValue([]);
    vi.mocked(api.getDesignKnowledgeReleases).mockResolvedValue([]);
    vi.mocked(api.getDesignKnowledgeInsights).mockResolvedValue({ generatedAt: report.generatedAt, trends: [], playtests: [] });
    vi.mocked(api.getDesignResearchTasks).mockResolvedValue([]);
    vi.mocked(api.getGameplayRadar).mockResolvedValue([]);
    vi.mocked(api.getMechanicAtlas).mockResolvedValue({ summary: { schemaVersion: "mechanic-atlas-summary-v2", total: 350, modifiers: 24, combinationCapacity: 8400, byFamily: {}, byModifierCategory: {}, boundary: "机制卡逐条独立计数；修饰器与组合配方单独管理，不计入机制数量。候选仍须验证。" }, localSources: { schemaVersion: "local-design-source-summary-v1", indexed: 12, bytes: 237735, byRole: {}, sourceRootHint: "D:/Admin/Desktop/game", policy: "仅保存摘要。" }, result: { schemaVersion: "mechanic-atlas-search-v1", total: 350, matched: 350, offset: 0, limit: 12, entries: [], officialPromotionRequired: true } });
    vi.mocked(api.getProjects).mockResolvedValue([project]);
    vi.mocked(api.captureDesignKnowledgeReview).mockResolvedValue({ id: "review", createdAt: report.generatedAt, report: report as never, decisions: [] });
  });
  afterEach(() => { vi.clearAllMocks(); vi.unstubAllGlobals(); });

  it("独立显示机制数量，不把组合配方算作机制", async () => {
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    expect(await screen.findByRole("heading", { name: "350 张独立机制卡" })).toBeInTheDocument();
    expect(screen.getByText("独立机制库")).toBeInTheDocument();
    expect(screen.getByText(/已索引本地资料/)).toHaveTextContent("12 份");
    expect(screen.getByText(/组合配方单独管理，不计入机制数量/)).toBeInTheDocument();
  });

  it("用四阶段证据轨道组织工作，并能直接展开结构化试玩", async () => {
    const user = userEvent.setup();
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    expect(await screen.findByRole("heading", { name: /把试玩证据变成/ })).toBeInTheDocument();
    const rail = screen.getByRole("list", { name: "知识更新流程" });
    for (const label of ["真人试玩", "季度复核", "版本变更", "知识发布"]) expect(rail).toHaveTextContent(label);
    await user.click(screen.getByRole("button", { name: /记录真人试玩/ }));
    expect(screen.getByText("结构化试玩")).toBeInTheDocument();
    expect(screen.getByText("教学清晰")).toBeInTheDocument();
    expect(screen.getByText("公平性")).toBeInTheDocument();
  });

  it("显示跨榜玩法雷达，并且过期信号只能重新进入研究", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getGameplayRadar).mockResolvedValue([{
      schemaVersion: "gameplay-radar-cluster-v1", id: "RADAR-12345678", gameTitle: "Art of Fauna", normalizedTitle: "artoffauna", state: "watching",
      signals: [{ gameTitle: "Art of Fauna", sourceTitle: "Apple Design Awards 2025", sourceUrl: "https://apple.example/awards", sourceType: "annual-award", platform: "mobile", observedAt: "2026-09-05", publishedAt: "2025-06-03", signalSummary: "重排与辅助访问组合。", playerVerbs: ["重排"], mechanicTags: ["puzzle"] }],
      researchTaskIds: [], linkedPatternId: null, createdAt: report.generatedAt, updatedAt: report.generatedAt,
      freshness: "stale", newestEvidenceAt: "2025-06-03", refreshAfter: "2026-07-28", distinctSourceCount: 1,
      match: { kind: "none", id: null, label: "未发现可靠近邻", score: 0, reason: "需要建立独立研究任务，并从外部来源验证。" },
    }]);
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    expect(await screen.findByRole("heading", { name: "先发现变化，再决定是否研究" })).toBeInTheDocument();
    expect(screen.getByText("需要更新")).toBeInTheDocument();
    expect(screen.queryByText("市场观察，不是采用结论", { exact: false })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /重新研究/ }));
    await waitFor(() => expect(api.startGameplayRadarResearch).toHaveBeenCalledWith("RADAR-12345678", true));
    expect(api.createDesignResearchChangeSet).not.toHaveBeenCalled();
  });

  it("显示聚合指标并把人工决定保持为显式操作", async () => {
    vi.mocked(api.getDesignKnowledgeReviews).mockResolvedValue([{ id: "review-1", createdAt: report.generatedAt, report: report as never, decisions: [] }]);
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    expect(await screen.findByText("滑动合并解谜")).toBeInTheDocument();
    expect(screen.getByText("71%")).toBeInTheDocument();
    expect(screen.getByText("保持当前等级")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "记录人工决定" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /发布知识版本/ })).not.toBeInTheDocument();
  });

  it("一键生成快照后重新读取后台状态", async () => {
    const user = userEvent.setup();
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    await screen.findByRole("heading", { name: /把试玩证据变成/ });
    await user.click(screen.getByRole("button", { name: /生成复核快照/ }));
    await waitFor(() => expect(api.captureDesignKnowledgeReview).toHaveBeenCalledOnce());
    expect(api.getDesignKnowledgeReviews).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("新的季度复核快照已保存。")).toBeInTheDocument();
  });

  it("显示跨周期变化和试玩细分，并通过说明理由创建恢复发布", async () => {
    const user = userEvent.setup();
    vi.mocked(api.getDesignKnowledgeInsights).mockResolvedValue({
      generatedAt: report.generatedAt,
      trends: [{ patternId: "sliding-merge-puzzle", label: "滑动合并解谜", points: [
        { reviewId: "review-1", capturedAt: "2026-06-05T08:00:00.000Z", window: report.window, completionRate: .7, exitRate: .2, starts: 20, recommendation: "retain" },
        { reviewId: "review-2", capturedAt: report.generatedAt, window: report.window, completionRate: .8, exitRate: .1, starts: 30, recommendation: "retain" },
      ] }],
      playtests: [{
        patternId: "sliding-merge-puzzle",
        overall: { sampleCount: 4, completionRate: .75, replayRate: .5, ratings: { onboardingClarity: 4, controlClarity: 4.25, perceivedDifficulty: 3, funRating: 4.5, fairnessRating: 4 }, blockers: { difficulty: 1 } },
        byTesterSegment: { novice: { sampleCount: 2, completionRate: .5, replayRate: .5, ratings: { onboardingClarity: 3.5, controlClarity: 4, perceivedDifficulty: 3.5, funRating: 4, fairnessRating: 4 }, blockers: { difficulty: 1 } } },
        byDeviceClass: {}, byInputMode: {},
      }],
    });
    const releases = [
      { id: "00000000-0000-4000-8000-000000000012", sequence: 2, kind: "change-set" as const, changeSetId: "change-2", rollbackSourceReleaseId: null, rationale: "第二版", schemaVersion: "game-design-knowledge-v1" as const, checksum: "b".repeat(64), supersedesReleaseId: "00000000-0000-4000-8000-000000000011", publishedAt: report.generatedAt },
      { id: "00000000-0000-4000-8000-000000000011", sequence: 1, kind: "change-set" as const, changeSetId: "change-1", rollbackSourceReleaseId: null, rationale: "第一版", schemaVersion: "game-design-knowledge-v1" as const, checksum: "a".repeat(64), supersedesReleaseId: null, publishedAt: "2026-06-05T08:00:00.000Z" },
    ];
    vi.mocked(api.getDesignKnowledgeReleases).mockResolvedValue(releases);
    vi.mocked(api.rollbackDesignKnowledgeRelease).mockResolvedValue({ ...releases[0]!, id: "00000000-0000-4000-8000-000000000013", sequence: 3, kind: "rollback", changeSetId: null, rollbackSourceReleaseId: releases[1]!.id });
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    expect(await screen.findByRole("heading", { name: "趋势与试玩细分" })).toBeInTheDocument();
    expect(screen.getByText("上升 10 个百分点")).toBeInTheDocument();
    expect(screen.getByText("新手")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "恢复" }));
    expect(screen.getByRole("heading", { name: /恢复到 R1/ })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "恢复理由" }), "第二版完成率下降，恢复第一版后重新组织试玩复核。");
    await user.click(screen.getByRole("button", { name: /创建恢复发布/ }));
    await waitFor(() => expect(api.rollbackDesignKnowledgeRelease).toHaveBeenCalledWith(releases[1]!.id, expect.stringContaining("完成率下降")));
  });

  it("用证据护照登记研究来源，并明确附带不可复制边界", async () => {
    const user = userEvent.setup();
    const task = {
      schemaVersion: "game-research-task-v1" as const, id: "RESEARCH-12345678", createdAt: report.generatedAt, updatedAt: report.generatedAt,
      status: "queued" as const, queryIntent: "让天气谚语切换棋盘重力", playerVerbs: [], constraints: ["2d", "touch", "短局"], candidatePatternIds: [],
      sources: [], synthesis: null, candidateDraft: null, evaluation: null, decision: null,
    };
    vi.mocked(api.getDesignResearchTasks).mockResolvedValue([task]);
    vi.mocked(api.addDesignResearchSource).mockResolvedValue({ ...task, status: "researching", sources: [] });
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    expect(await screen.findByRole("heading", { name: "先登记证据，再提炼候选" })).toBeInTheDocument();
    expect(screen.getByText("0/3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "登记来源" }));
    expect(screen.getByRole("dialog", { name: "登记外部来源" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "来源标题" }), "开发者玩法说明");
    await user.type(screen.getByRole("textbox", { name: "来源网址" }), "https://developer.example/rules");
    await user.type(screen.getByRole("textbox", { name: "可观察的玩法事实" }), "玩家选择一个有限规则，棋盘重力随后改变。");
    await user.click(screen.getByRole("button", { name: "保存来源" }));
    await waitFor(() => expect(api.addDesignResearchSource).toHaveBeenCalledWith(task.id, expect.objectContaining({
      url: "https://developer.example/rules",
      doNotCopy: ["不复制名称、角色、美术、音频、文案、代码或具体关卡。"],
    })));
  });

  it("候选先建立原型评估沙箱，不能直接进入人工采用", async () => {
    const user = userEvent.setup();
    const task = {
      schemaVersion: "game-research-task-v1" as const, id: "RESEARCH-87654321", createdAt: report.generatedAt, updatedAt: report.generatedAt,
      status: "review" as const, queryIntent: "用有限词表改变棋盘方向", playerVerbs: ["选择"], constraints: ["2d"], candidatePatternIds: [],
      sources: [], synthesis: { commonLoop: "选择方向并观察棋盘状态。", mechanicHypotheses: ["有限输入"], relationshipHypotheses: ["输入先于结算"], verificationPlan: ["固定输入验证"], rejectionRisks: ["反馈不清"] },
      candidateDraft: { kind: "mechanic" as const, artifact: { id: "direction-switch", label: "方向切换", family: "spatial" as const, playerVerb: "选择方向", state: ["direction"], inputs: ["choose"], outputs: ["direction-changed"], capabilityIds: ["game-lifecycle"], relations: [], tunableDimensions: ["cognition" as const], probeSignals: ["direction-changed"] } },
      evaluation: null, decision: null,
    };
    vi.mocked(api.getDesignResearchTasks).mockResolvedValue([task]);
    vi.mocked(api.createDesignResearchEvaluation).mockResolvedValue(task);
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    expect(await screen.findByRole("button", { name: "建立评估沙箱" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "人工采用结论" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "建立评估沙箱" }));
    await waitFor(() => expect(api.createDesignResearchEvaluation).toHaveBeenCalledWith(task.id));
  });

  it("形成机制候选时明确选择机制族，不再把所有候选归为信息机制", async () => {
    const user = userEvent.setup();
    const task = {
      schemaVersion: "game-research-task-v1" as const, id: "RESEARCH-11223344", createdAt: report.generatedAt, updatedAt: report.generatedAt,
      status: "review" as const, queryIntent: "有限预算下升级移动能力", playerVerbs: ["升级"], constraints: ["2d"], candidatePatternIds: [], sources: [],
      synthesis: { commonLoop: "选择升级并观察预算变化。", mechanicHypotheses: ["有限预算"], relationshipHypotheses: ["购买先于能力提升"], verificationPlan: ["固定预算验证"], rejectionRisks: ["反馈不清"] },
      candidateDraft: null, evaluation: null, decision: null,
    };
    vi.mocked(api.getDesignResearchTasks).mockResolvedValue([task]);
    vi.mocked(api.attachDesignResearchCandidate).mockResolvedValue(task as never);
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    await user.click(await screen.findByRole("button", { name: "形成候选" }));
    await user.selectOptions(screen.getByLabelText("机制族"), "economy");
    await user.type(screen.getByLabelText("稳定 ID"), "budget-upgrade");
    await user.type(screen.getByLabelText("中文名称"), "预算升级");
    await user.type(screen.getByLabelText("玩家动词"), "选择升级");
    await user.type(screen.getByLabelText("关键状态（逗号分隔）"), "预算,速度");
    await user.type(screen.getByLabelText("探针成功信号（逗号分隔）"), "upgrade-bought");
    await user.click(screen.getByRole("button", { name: "保存候选草案" }));
    await waitFor(() => expect(api.attachDesignResearchCandidate).toHaveBeenCalledWith(task.id, expect.objectContaining({
      kind: "mechanic",
      artifact: expect.objectContaining({ id: "budget-upgrade", family: "economy" }),
    })));
  });

  it("在研究护照中分开显示原型占位与评审、发布资源缺口", async () => {
    const user = userEvent.setup();
    const task = {
      schemaVersion: "game-research-task-v1" as const, id: "RESEARCH-44332211", createdAt: report.generatedAt, updatedAt: report.generatedAt,
      status: "review" as const, queryIntent: "配对相同符号", playerVerbs: ["翻开"], constraints: ["2d"], candidatePatternIds: [], sources: [], synthesis: null,
      candidateDraft: { kind: "mechanic" as const, artifact: { id: "symbol-match", label: "符号配对", family: "matching" as const, playerVerb: "翻开符号", state: ["open"], inputs: ["choose"], outputs: ["matched"], capabilityIds: ["game-lifecycle"], relations: [], tunableDimensions: ["cognition" as const], probeSignals: ["matched"] } },
      evaluation: {
        schemaVersion: "research-prototype-evaluation-v1", id: "EVALUATION-1", createdAt: report.generatedAt, updatedAt: report.generatedAt,
        contract: {}, requiredProbeSignals: ["matched"], probeRuns: [], browserRuns: [], playtests: [],
        resourceGapSummary: { total: 8, prototypeRequired: 0, reviewMissing: 3, publishMissing: 5, proceduralFallbacks: 2, prototypeReady: true },
        resourceAcquisitionPlan: {
          schemaVersion: "research-resource-acquisition-v1", catalogVersion: "curated-v1", generatedAt: report.generatedAt,
          summary: { total: 2, reuseExisting: 1, proceduralGenerate: 0, procure: 0, create: 1, licenseReview: 0, unresolved: 0, planningReady: true },
          decisions: [
            { requirementId: "ASSET-UI-SHELL", role: "interface", requiredFor: "publish", route: "reuse-existing", status: "review-required", selectedFamilyId: "clean-blue-ui-2d", suggestedPaths: ["start.png"], missingVariants: [], license: { status: "verified", licenseId: "CC0-1.0", sourceUrl: "https://kenney.nl/assets/ui-pack", obligations: [] }, operatorAction: "approve-binding", deliverable: "发布前交付界面资源", reason: "库内资源可复用。" },
            { requirementId: "ASSET-MECHANIC-SYMBOL-MATCH", role: "effect", requiredFor: "publish", route: "create", status: "planned", selectedFamilyId: null, suggestedPaths: [], missingVariants: ["NORMAL"], license: { status: "not-required", licenseId: "project-owned", sourceUrl: null, obligations: [] }, operatorAction: "review-created-asset", deliverable: "发布前交付机制表现资源", reason: "需要创作。" },
          ],
        },
      } as never,
      decision: null,
    };
    const preparedTask = { ...task, evaluation: { ...(task.evaluation as object), resourceAcquisitionTask: {
      schemaVersion: "research-resource-acquisition-task-v1", id: `ACQUISITION:${task.id}`, researchTaskId: task.id, evaluationId: "EVALUATION-1",
      sourcePlanGeneratedAt: report.generatedAt, createdAt: report.generatedAt, status: "prepared",
      summary: { total: 2, prototypeReady: 0, awaitingBindingApproval: 1, awaitingLicenseReview: 0, awaitingAssetReview: 1, submitted: 0, approved: 0, returned: 0 },
      safetyBoundaries: ["生成任务不等于素材已经获得、许可已经批准或绑定已经完成。"],
      items: [
        { id: "ACQUIRE:ASSET-UI-SHELL", requirementId: "ASSET-UI-SHELL", route: "reuse-existing", state: "awaiting-binding-approval", automatedPreparation: false, selectedFamilyId: "clean-blue-ui-2d", suggestedPaths: ["start.png"], missingVariants: [], license: { status: "verified", licenseId: "CC0-1.0", sourceUrl: "https://kenney.nl/assets/ui-pack", obligations: [] }, title: "确认并批准界面绑定", deliverable: "发布前交付界面资源", checklist: ["查看候选资源与玩法语义"], completionRule: "人工确认后批准。", submissions: [], reviews: [] },
        { id: "ACQUIRE:ASSET-MECHANIC", requirementId: "ASSET-MECHANIC", route: "create", state: "awaiting-asset-review", automatedPreparation: false, selectedFamilyId: null, suggestedPaths: [], missingVariants: ["NORMAL"], license: { status: "not-required", licenseId: "project-owned", sourceUrl: null, obligations: [] }, title: "创作并复核机制表现", deliverable: "发布前交付机制表现", checklist: ["制作全部状态"], completionRule: "成品和运行证据齐全。", submissions: [], reviews: [] },
      ],
    } } };
    const submittedTask = structuredClone(preparedTask) as any;
    const submittedAcquisition = submittedTask.evaluation.resourceAcquisitionTask;
    submittedAcquisition.status = "in-progress";
    submittedAcquisition.summary.submitted = 1;
    submittedAcquisition.summary.awaitingBindingApproval = 0;
    submittedAcquisition.items[0]!.state = "submitted-for-review";
    submittedAcquisition.items[0]!.submissions = [{ id: "SUBMISSION-1", submittedAt: report.generatedAt, note: "界面资源已经完成实际运行验证", evidence: [{ kind: "resource-file", reference: "_studio/resources/ui.json", note: "资源文件已经归档" }, { kind: "visual-review", reference: "_studio/reviews/ui.json", note: "视觉复核结果已经归档" }, { kind: "runtime-report", reference: "_studio/reports/ui.json", note: "运行时验收结果已经归档" }] }];
    vi.mocked(api.getDesignResearchTasks).mockResolvedValueOnce([task]).mockResolvedValueOnce([preparedTask as never]).mockResolvedValue([submittedTask as never]);
    vi.mocked(api.createDesignResearchResourceAcquisitionTask).mockResolvedValue(preparedTask as never);
    vi.mocked(api.submitDesignResearchResourceWork).mockResolvedValue(submittedTask as never);
    vi.mocked(api.reviewDesignResearchResourceWork).mockResolvedValue(submittedTask as never);
    render(<PreferencesProvider><DesignKnowledgeConsole /></PreferencesProvider>);
    const ledger = await screen.findByRole("group", { name: "研究资源缺口" });
    expect(ledger).toHaveTextContent("资源账本");
    expect(ledger).toHaveTextContent("原型可占位");
    expect(ledger).toHaveTextContent("评审前3 项");
    expect(ledger).toHaveTextContent("发布前5 项");
    expect(ledger).toHaveTextContent("复用 1");
    expect(ledger).toHaveTextContent("创作 1");
    expect(ledger).toHaveTextContent("库内候选许可已核验");
    await user.click(screen.getByText("查看 2 项具体方案"));
    expect(ledger).toHaveTextContent("界面已有可复用");
    expect(ledger).toHaveTextContent("资源族 clean-blue-ui-2d · CC0-1.0 已核验");
    expect(ledger).toHaveTextContent("取得方案不等于素材已入库");
    await user.click(screen.getByRole("button", { name: "生成资源执行任务" }));
    await waitFor(() => expect(api.createDesignResearchResourceAcquisitionTask).toHaveBeenCalledWith(task.id));
    expect(await screen.findByText(/资源执行任务：持续跟踪/)).toBeInTheDocument();
    const updatedLedger = screen.getByRole("group", { name: "研究资源缺口" });
    expect(updatedLedger).toHaveTextContent("已批准 0");
    await user.click(screen.getByText("查看 2 项执行任务"));
    await user.click(screen.getAllByRole("button", { name: "提交成果" })[0]!);
    await user.type(screen.getByLabelText("资源文件引用"), "_studio/resources/ui.json");
    await user.type(screen.getByLabelText("视觉复核引用"), "_studio/reviews/ui.json");
    await user.type(screen.getByLabelText("运行报告引用"), "_studio/reports/ui.json");
    await user.type(screen.getByLabelText("本次成果说明"), "界面资源已经完成实际运行验证");
    await user.click(screen.getByRole("button", { name: "提交独立复核" }));
    await waitFor(() => expect(api.submitDesignResearchResourceWork).toHaveBeenCalledWith(task.id, "ASSET-UI-SHELL", expect.objectContaining({ evidence: expect.arrayContaining([expect.objectContaining({ kind: "resource-file" }), expect.objectContaining({ kind: "visual-review" }), expect.objectContaining({ kind: "runtime-report" })]) })));
    await user.click(await screen.findByRole("button", { name: "退回" }));
    await user.type(screen.getByLabelText("复核理由"), "触控状态的视觉区分仍需加强");
    await user.click(screen.getByRole("button", { name: "确认退回" }));
    await waitFor(() => expect(api.reviewDesignResearchResourceWork).toHaveBeenCalledWith(task.id, "ASSET-UI-SHELL", { decision: "return", rationale: "触控状态的视觉区分仍需加强" }));
  });
});
