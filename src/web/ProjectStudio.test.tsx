import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDetail } from "../shared/contracts.js";
import { merge2048DesignSample } from "../shared/game-design-contract/samples.js";
import { DesignDecisionCards, ProjectStudio } from "./ProjectStudio.js";
import { PreferencesProvider } from "./preferences.js";
import * as api from "./api.js";

vi.mock("./api.js", () => ({
  archiveProject: vi.fn(), approveDemoReview: vi.fn(), cancelBuild: vi.fn(), getArtReviewHistory: vi.fn(), getDemoReview: vi.fn(), getLatestBuild: vi.fn(), getPlayableBuild: vi.fn(), getProject: vi.fn(), getProjectMessages: vi.fn(), getProjectRevision: vi.fn(), getProjectVersions: vi.fn(), publishProject: vi.fn(), publishProjectVersion: vi.fn(), restoreProject: vi.fn(), startBuild: vi.fn(), submitProjectRevision: vi.fn(),
}));

describe("完整游戏设计确认卡", () => {
  beforeEach(() => {
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    window.localStorage.setItem("forge-locale", "zh-CN");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("用普通用户语言展示教学、递进、失败帮助和内容变化", () => {
    const project = { spec: { designContract: merge2048DesignSample } } as unknown as ProjectDetail;
    render(<PreferencesProvider><DesignDecisionCards project={project} /></PreferencesProvider>);
    expect(screen.getByRole("group", { name: "完整游戏设计摘要" })).toBeInTheDocument();
    expect(screen.getByText("玩家先学什么")).toBeInTheDocument();
    expect(screen.getByText("如何逐步变难")).toBeInTheDocument();
    expect(screen.getByText("失败后怎样帮助")).toBeInTheDocument();
    expect(screen.getByText("每阶段有什么变化")).toBeInTheDocument();
    expect(screen.getByText(/向唯一有效方向滑动/)).toBeInTheDocument();
    expect(screen.queryByText("MECHANIC-SLIDE")).not.toBeInTheDocument();
  });
});

describe("制作停止", () => {
  const project = {
    id: "project-1", title: "测试作品", createdAt: "2026-01-01T00:00:00.000Z", archivedAt: null, fixtureKind: null, status: "building",
    version: { number: 2, qualityStatus: "passed", artReviewStatus: "passed" },
    spec: { aspectRatio: "16:9", dimensions: "2d", visualStyle: "classic", controls: [], hardConstraints: [], acceptanceCriteria: [], designContract: null, designProfile: { genre: "解谜", sessionLength: "3 分钟", winCondition: "完成目标", coreLoop: [], difficultyCurve: [], generatedBlueprint: null } },
    publication: { stableUrl: "https://example.test/play" },
  } as unknown as ProjectDetail;
  const queuedBuild = {
    id: "build-1", projectId: project.id, status: "queued", runtimeTarget: "browser", createdAt: "2026-01-01T00:00:00.000Z", startedAt: null, completedAt: null, versionId: null, previewUrl: null, error: null, revisionScope: null, assetClipId: null,
    steps: [{ id: "step-1", sequence: 0, kind: "code", title: "生成代码", detail: "正在制作", status: "running", output: null, startedAt: null, completedAt: null }],
  } as any;

  beforeEach(() => {
    vi.resetAllMocks();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    window.localStorage.clear();
    vi.mocked(api.getLatestBuild).mockResolvedValue(queuedBuild);
    vi.mocked(api.getPlayableBuild).mockResolvedValue(null);
    vi.mocked(api.getProjectMessages).mockResolvedValue([]);
    vi.mocked(api.getProjectVersions).mockResolvedValue([]);
    vi.mocked(api.getDemoReview).mockResolvedValue(null);
  });

  it("停止构建时等待服务端确认，并以取消终态隔离迟到完成结果", async () => {
    let resolveCancel!: (value: any) => void;
    vi.mocked(api.cancelBuild).mockReturnValue(new Promise(resolve => { resolveCancel = resolve; }));
    render(<PreferencesProvider><ProjectStudio project={project} onProjectChange={vi.fn()} /></PreferencesProvider>);
    const stop = await screen.findByRole("button", { name: "停止制作" });
    stop.click();
    expect(await screen.findByText("正在停止这轮制作…")).toBeInTheDocument();
    expect(stop).toBeDisabled();
    expect(api.cancelBuild).toHaveBeenCalledWith(project.id, queuedBuild.id);
    resolveCancel({ ...queuedBuild, status: "cancelled", steps: [{ ...queuedBuild.steps[0], status: "cancelled" }] });
    expect(await screen.findByText(/已停止后续制作/)).toBeInTheDocument();
    expect(screen.queryByText("游戏已准备好，先玩一局吧。")).not.toBeInTheDocument();
  });

  it("恢复失败构建时明确历史详情缺失；混合可重试和不可重试原因不会提供直接重试", async () => {
    vi.mocked(api.getLatestBuild).mockResolvedValue({
      ...queuedBuild,
      status: "failed",
      error: "旧记录中的原始错误不应展示",
      failureDetails: [
        { stage: "asset", category: "network", code: "ASSET_NETWORK", message: "资源服务连接中断。", nextStep: "确认网络恢复后重新提交。", retryable: true },
        { stage: "asset", category: "authentication", code: "IMAGE_AUTH", message: "图像服务没有接受当前凭据。", nextStep: "确认模型设置后重新分析。", retryable: false, resource: { file: "assets/hero.png", label: "主角" } },
      ],
    });
    render(<PreferencesProvider><ProjectStudio project={project} onProjectChange={vi.fn()} /></PreferencesProvider>);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("资源服务连接中断");
    expect(alert).toHaveTextContent("图像服务没有接受当前凭据");
    expect(alert).toHaveTextContent("受影响资源：主角（assets/hero.png）");
    expect(screen.queryByRole("button", { name: "手动重新制作" })).not.toBeInTheDocument();
    expect(screen.queryByText("旧记录中的原始错误不应展示")).not.toBeInTheDocument();
  });

  it("旧失败记录没有详情时明确说明未记录，且不展示旧错误文本", async () => {
    vi.mocked(api.getLatestBuild).mockResolvedValue({ ...queuedBuild, status: "failed", error: "untrusted legacy provider response", failureDetails: null });
    render(<PreferencesProvider><ProjectStudio project={project} onProjectChange={vi.fn()} /></PreferencesProvider>);
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("这份历史构建记录没有保存详细原因");
    expect(alert).not.toHaveTextContent("untrusted legacy provider response");
    expect(screen.queryByRole("button", { name: "手动重新制作" })).not.toBeInTheDocument();
  });
});
