import { StrictMode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AutomaticProduction } from "./AutomaticProduction";
import { INITIAL_DRAFT } from "../domain/storage";
import * as api from "../web/api";
import { StudioApiError } from "../web/failure";
vi.mock("../web/api", () => ({ submitProduction: vi.fn(), getProductionJob: vi.fn(), watchProductionJob: vi.fn(), getProject: vi.fn(), startBuild: vi.fn(), getLatestBuild: vi.fn(), retryProduction: vi.fn(), cancelProduction: vi.fn(), getDemoReview: vi.fn(), approveDemoReview: vi.fn() }));
const build = { id: "b1", projectId: "p1", versionId: "770e8400-e29b-41d4-a716-446655440000", status: "succeeded", steps: [{ id: "s1", title: "准备资源", detail: "制作游戏图片", status: "succeeded" }] } as any;
const retryableNetworkFailure = {
  stage: "asset", category: "network", code: "IMAGE_NETWORK",
  message: "图像服务连接中断，主角资源尚未生成。", nextStep: "确认网络恢复后，可手动重新制作。",
  retryable: true, resource: { file: "assets/hero.png", label: "主角" },
} as const;

it("技术校验错误展示安全详情且不重新提交", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({ ...build, status: "failed", error: "资料不符合当前制作限制。", failureDetails: [{ stage: "validation", category: "validation", code: "BLUEPRINT_LIMIT", message: "方案字段超过当前限制。", nextStep: "缩短描述后重新分析方案。", retryable: false }] });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("规则检查 · 检查未通过");
  expect(screen.getByRole("alert")).toHaveTextContent("缩短描述后重新分析方案。");
  expect(screen.queryByRole("button", { name: "手动重新制作" })).not.toBeInTheDocument();
  expect(api.submitProduction).not.toHaveBeenCalled();
});

it("已有服务端任务通过流接收过程，不重复提交", async () => {
  history.replaceState(null, "", "/create?production=p1");
  const task = { id: "p1", status: "creating" as const, error: null };
  vi.mocked(api.getProductionJob).mockResolvedValue(task);
  vi.mocked(api.watchProductionJob).mockImplementation(async (_id, _signal, update) => {
    update({ ...task, status: "building" }, build);
  });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText("准备资源");
  expect(api.watchProductionJob).toHaveBeenCalledTimes(1);
  expect(api.submitProduction).not.toHaveBeenCalled();
});
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); history.replaceState(null, "", "/create");
  vi.mocked(api.submitProduction).mockResolvedValue({ id: "p1" } as any);
  vi.mocked(api.getProductionJob).mockResolvedValue(null);
  vi.mocked(api.getLatestBuild).mockResolvedValue(build);
  vi.mocked(api.getDemoReview).mockResolvedValue(null);
  vi.mocked(api.approveDemoReview).mockResolvedValue({ projectId: "p1", versionId: build.versionId, status: "approved", reviewedAt: "2026-09-12T00:00:00.000Z" });
});
it("确认后仅启动一次，展示过程而不是操作入口", async () => {
  render(<StrictMode><AutomaticProduction draft={INITIAL_DRAFT} confirmedPlan="确认的实时游戏方案，新手引导先教会操作。" /></StrictMode>);
  await screen.findByText("准备资源");
  expect(api.submitProduction).toHaveBeenCalledTimes(1);
  expect(api.startBuild).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "我已试玩，验收通过" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "继续完善这个游戏" })).toHaveAttribute("href", "/projects/p1");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByTitle("游戏试玩")).not.toBeInTheDocument();
});
it("已有游戏个性化把来源项目和范围传给制作任务", async () => {
  const remix = { ...INITIAL_DRAFT, creationMode: "template-remix" as const, revisionScope: "assets" as const, sourceGame: { id: "770e8400-e29b-41d4-a716-446655440000", title: "数织矩阵", coverUrl: null } };
  render(<AutomaticProduction draft={remix} confirmedPlan="保留原玩法，只把主角替换成小狐狸。" />);
  await screen.findByText("准备资源");
  expect(api.submitProduction).toHaveBeenCalledWith(expect.objectContaining({
    sourceProjectId: remix.sourceGame.id,
    revisionScope: "assets",
  }));
});

it("多项改造只在确认制作后把完整计划、来源版本和所有角色图集传给一个任务", async () => {
  const remix = { ...INITIAL_DRAFT, creationMode: "template-remix" as const, sourceGame: { id: "770e8400-e29b-41d4-a716-446655440000", title: "数织矩阵", coverUrl: null } };
  const revisionPlan = {
    sourceProjectId: remix.sourceGame.id,
    sourceVersionId: "version-3",
    content: "全部角色改为精灵动图，同时把技能墨量消耗减半",
    operations: [
      { scope: "assets" as const, content: "全部角色改为精灵动图", targets: [
        { file: "assets/hero.png", label: "主角", animation: "sprite-sheet" as const },
        { file: "assets/foe.png", label: "对手", animation: "sprite-sheet" as const },
      ] },
      { scope: "gameplay" as const, content: "把技能墨量消耗减半" },
    ],
  };
  render(<AutomaticProduction draft={remix} confirmedPlan="用户已确认的多项改造方案" revisionPlan={revisionPlan} />);
  await screen.findByText("准备资源");
  expect(api.submitProduction).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
    sourceProjectId: remix.sourceGame.id,
    revisionPlan: expect.objectContaining({
      sourceVersionId: "version-3",
      operations: expect.arrayContaining([
        expect.objectContaining({ scope: "gameplay" }),
        expect.objectContaining({ scope: "assets", targets: expect.arrayContaining([
          expect.objectContaining({ file: "assets/hero.png", animation: "sprite-sheet" }),
          expect.objectContaining({ file: "assets/foe.png", animation: "sprite-sheet" }),
        ]) }),
      ]),
    }),
  }));
});

it("从零创建新游戏不携带已有游戏改造字段", async () => {
  const fresh = { ...INITIAL_DRAFT, creationMode: "mechanic-composition" as const, sourceGame: null, newGameBrief: "控制小船收集水晶并避开陨石", aspectRatio: "16:9" as const };
  render(<AutomaticProduction draft={fresh} confirmedPlan="控制小船收集水晶并避开陨石，收集十颗后完成。" />);
  await screen.findByText("准备资源");
  expect(api.submitProduction).toHaveBeenCalledWith(expect.objectContaining({ spriteAnimation: "auto" }));
  expect(api.submitProduction).toHaveBeenCalledWith(expect.objectContaining({ aspectRatio: "16:9" }));
  expect(api.submitProduction).toHaveBeenCalledWith(expect.not.objectContaining({ sourceProjectId: expect.anything(), revisionScope: expect.anything() }));
});
it.each(["queued", "running", "succeeded", "failed", "cancelled"])("%s 状态刷新不会发起制作；仅安全标记为可重试的失败才能重新制作", async status => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({ ...build, status, error: status === "failed" ? "模型失败" : null });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText("准备资源");
  if (status === "failed") {
    expect(await screen.findByRole("alert")).toHaveTextContent("这份历史构建记录没有保存详细原因");
    expect(screen.queryByRole("button", { name: "手动重新制作" })).not.toBeInTheDocument();
  }
  else if (status === "queued" || status === "running") expect(screen.getByRole("button", { name: "停止制作" })).toBeEnabled();
  else if (status === "succeeded") expect(screen.getByRole("button", { name: "我已试玩，验收通过" })).toBeInTheDocument();
  else expect(screen.queryByRole("button")).not.toBeInTheDocument();
  if (status === "succeeded") expect(screen.getByRole("link", { name: "继续完善这个游戏" })).toBeInTheDocument();
  else if (status === "failed") expect(screen.queryByRole("link", { name: "查看已保存的项目与问题" })).not.toBeInTheDocument();
  else expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(api.submitProduction).not.toHaveBeenCalled();
  expect(api.startBuild).not.toHaveBeenCalled();
});

it("停止请求等待服务端确认、终止进度流，并丢弃迟到的完成事件", async () => {
  history.replaceState(null, "", "/create?production=p1");
  const queued = { id: "p1", status: "queued" as const, error: null, events: [] };
  let lateUpdate: ((job: any, build: any) => void) | undefined;
  let streamSignal: AbortSignal | undefined;
  vi.mocked(api.getProductionJob).mockResolvedValue(queued);
  vi.mocked(api.watchProductionJob).mockImplementation(async (_id, signal, update) => {
    streamSignal = signal;
    lateUpdate = update;
    await new Promise<void>(() => {});
  });
  let resolveCancel!: (job: any) => void;
  vi.mocked(api.cancelProduction).mockReturnValue(new Promise(resolve => { resolveCancel = resolve; }));
  const view = render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await waitFor(() => expect(api.watchProductionJob).toHaveBeenCalledTimes(1));
  const stop = await screen.findByRole("button", { name: "停止制作" });
  stop.click();
  expect(await screen.findByText("正在等待服务端确认停止。", { exact: false })).toBeInTheDocument();
  expect(stop).toBeDisabled();
  expect(api.cancelProduction).toHaveBeenCalledWith("p1");
  await waitFor(() => expect(streamSignal?.aborted).toBe(true));
  resolveCancel({ id: "p1", status: "cancelled", error: null, events: [] });
  expect(await screen.findByText(/服务商可能已开始计费/)).toBeInTheDocument();
  lateUpdate?.({ id: "p1", status: "succeeded", error: null }, { ...build, status: "succeeded" });
  expect(screen.getByText(/服务商可能已开始计费/)).toBeInTheDocument();
  view.unmount();
});

it("创建失败展示安全原因，不生成不存在项目的恢复地址", async () => {
  vi.mocked(api.submitProduction).mockRejectedValue(new StudioApiError("方案需要补充关卡目标。", [{ stage: "planning", category: "validation", code: "PLAN_REQUIRED", message: "方案需要补充关卡目标。", nextStep: "补充目标后重新生成方案，再明确确认制作。", retryable: false }]));
  render(<AutomaticProduction draft={INITIAL_DRAFT} confirmedPlan="用户确认的完整方案" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("方案需要补充关卡目标。");
  expect(screen.getByRole("alert")).toHaveTextContent("补充目标后重新生成方案");
  expect(location.search).toBe("");
  expect(api.startBuild).not.toHaveBeenCalled();
  expect(screen.queryByText(/项目已保存/)).not.toBeInTheDocument();
});

it("任务为空时核实项目，不把不存在的项目显示成已保存", async () => {
  history.replaceState(null, "", "/create?production=missing");
  vi.mocked(api.getLatestBuild).mockResolvedValue(null);
  vi.mocked(api.getProject).mockRejectedValue(new StudioApiError("找不到该项目记录。", [{ stage: "delivery", category: "validation", code: "PROJECT_NOT_FOUND", message: "找不到该项目记录。", nextStep: "返回项目列表，选择仍在保存中的作品。", retryable: false }]));
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("找不到该项目记录");
  expect(screen.queryByText(/已确认项目存在/)).not.toBeInTheDocument();
  expect(api.startBuild).not.toHaveBeenCalled();
});

it("接受响应丢失后刷新恢复同一回执，不重新付费提交", async () => {
  vi.mocked(api.submitProduction).mockRejectedValue(new Error("网络响应中断"));
  const mounted = render(<AutomaticProduction draft={INITIAL_DRAFT} confirmedPlan="用户确认的完整方案" />);
  await screen.findByRole("alert");
  const receipt = vi.mocked(api.submitProduction).mock.calls[0][0].requestId;
  expect(localStorage.getItem("studio-pending-production-v1")).toBe(receipt);
  mounted.unmount();
  vi.mocked(api.getProductionJob).mockResolvedValue({ id: receipt!, status: "building", error: null });
  vi.mocked(api.watchProductionJob).mockImplementation(async (_id, _signal, update) => update({ id: receipt!, status: "building", error: null }, build));
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText("准备资源");
  expect(api.getProductionJob).toHaveBeenLastCalledWith(receipt);
  expect(api.submitProduction).toHaveBeenCalledTimes(1);
});

it("完成后提供隔离试玩并等待用户明确验收，不自动保存通过", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({ ...build, previewUrl: "http://127.0.0.1:4313/version/p1/v1/" });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  const frame = await screen.findByTitle("游戏试玩");
  expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-same-origin");
  expect(frame).toHaveAttribute("src", "http://127.0.0.1:4313/version/p1/v1/");
  const approve = screen.getByRole("button", { name: "我已试玩，验收通过" });
  expect(api.approveDemoReview).not.toHaveBeenCalled();
  approve.click();
  await waitFor(() => expect(api.approveDemoReview).toHaveBeenCalledWith("p1", build.versionId));
  expect(await screen.findByText("试玩已验收")).toBeInTheDocument();
});

it("不嵌入工作台同源或脚本地址", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({ ...build, previewUrl: location.origin + "/version/p1/v1/" });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText("准备资源");
  expect(screen.queryByTitle("游戏试玩")).not.toBeInTheDocument();
});

it("创建阶段失败且原因允许重试时，只在用户点击后继续同方案制作", async () => {
  history.replaceState(null, "", "/create?production=p1");
  const failed = { id: "p1", status: "failed" as const, error: retryableNetworkFailure.message, failureDetails: [retryableNetworkFailure], events: [] };
  vi.mocked(api.getProductionJob).mockImplementation(async id => id === "p1" ? failed : { id: "p2", status: "queued" as const, error: null, events: [] });
  vi.mocked(api.getLatestBuild).mockResolvedValue(null);
  vi.mocked(api.watchProductionJob).mockImplementation(async (id, _signal, update) => { if (id === "p2") update({ id: "p2", status: "creating", error: null }, null); });
  vi.mocked(api.retryProduction).mockResolvedValue({ id: "p2", status: "queued", error: null });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  const button = await screen.findByRole("button", { name: "继续让系统制作" });
  expect(screen.queryByText(/查看已保存的项目/)).not.toBeInTheDocument();
  button.click();
  await screen.findAllByText(/服务端已接收|正在提交|等待开始处理/);
  expect(api.retryProduction).toHaveBeenCalledWith("p1");
  expect(api.submitProduction).not.toHaveBeenCalled();
  expect(new URLSearchParams(location.search).get("production")).toBe("p2");
});

it("终态任务读取失败构建，隐藏图片合同细节并保留历史 edge 安全续修", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getProductionJob).mockResolvedValue({ id: "p1", status: "failed", error: null, failureDetails: null, events: [{ title: "正在启动资源生成与游戏构建", createdAt: "2026-09-11T00:00:00.000Z" }] });
  vi.mocked(api.getLatestBuild).mockResolvedValue({
    ...build,
    status: "failed",
    error: "部分必需局内资源未生成，已停止制作并保留来源版本。",
    failureDetails: [{ stage: "asset", category: "invalid-image", code: "SPRITE_FRAME_EDGE", message: "第 2 帧主体触碰草稿格边缘。", nextStep: "调整动画帧留白后，再由你明确重新制作。", retryable: false }],
    projectId: "p1",
  });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("无需自行修改资源");
  expect(alert).not.toHaveTextContent("第 2 帧");
  expect(alert).not.toHaveTextContent("留白");
  expect(alert).not.toHaveTextContent("SPRITE_FRAME_EDGE");
  expect(screen.getByRole("link", { name: "查看已保存的项目" })).toHaveAttribute("href", "/projects/p1");
  const retry = screen.getByRole("button", { name: "继续让系统生成并检查" });
  expect(screen.getByText(/只有你点击后/)).toBeInTheDocument();
  expect(api.startBuild).not.toHaveBeenCalled();
  retry.click();
  await waitFor(() => expect(api.startBuild).toHaveBeenCalledWith("p1"));
  expect(api.retryProduction).not.toHaveBeenCalled();
});

it("旧任务已取消时以同项目的新运行构建为准并保留停止入口", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getProductionJob).mockResolvedValue({ id: "p1", status: "cancelled", error: null, events: [] });
  vi.mocked(api.getLatestBuild).mockResolvedValue({ ...build, status: "running", projectId: "p1" });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  expect(await screen.findByRole("button", { name: "停止制作" })).toBeEnabled();
  expect(screen.queryByText(/本轮制作已停止|已停止后续制作/)).not.toBeInTheDocument();
  expect(screen.getByText(/制作在服务端继续/)).toBeInTheDocument();
});

it("成功 warning 只给用户可懂的可选系统入口，不暴露帧合同或自动提交", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getProductionJob).mockResolvedValue({ id: "p1", status: "succeeded", error: null, events: [] });
  vi.mocked(api.getLatestBuild).mockResolvedValue({
    ...build,
    status: "succeeded",
    projectId: "p1",
    steps: [{ ...build.steps[0], status: "succeeded", output: "美术提醒：撞击火花（assets/collision-spark.png）第 3 帧 bottom 侧贴近草稿边界；不影响图集运行合同，建议试玩检查并在项目内只重生对应资源。" }],
  });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  const note = await screen.findByRole("note");
  expect(note).toHaveTextContent("撞击火花");
  expect(note).toHaveTextContent("无需自行修改资源");
  expect(note).not.toHaveTextContent("assets/collision-spark.png");
  expect(note).not.toHaveTextContent("第 3 帧");
  expect(note).not.toHaveTextContent("bottom");
  expect(note).not.toHaveTextContent("运行合同");
  expect(note).toHaveTextContent("由你明确提交才会调用图像模型");
  expect(screen.getByRole("link", { name: "让系统再次生成并检查" })).toHaveAttribute("href", "/projects/p1");
  expect(api.startBuild).not.toHaveBeenCalled();
});

it("构建失败（项目已存在）且可重试时不重新创建项目，而是在同一项目上重新制作，且只在用户点击后开始", async () => {
  history.replaceState(null, "", "/create?production=p1");
  const queued = { ...build, id: "b2", status: "queued", error: null, projectId: "p1", steps: [{ ...build.steps[0], status: "pending" }] };
  // 点击前读到的是失败记录；点击后服务端返回新排队的构建，后续轮询也读到它。
  vi.mocked(api.getLatestBuild).mockResolvedValueOnce({ ...build, status: "failed", error: retryableNetworkFailure.message, failureDetails: [retryableNetworkFailure], projectId: "p1" }).mockResolvedValue(queued);
  vi.mocked(api.startBuild).mockResolvedValue(queued);
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText(/查看已保存的项目/);
  expect(screen.queryByRole("button", { name: "用同一方案重新制作" })).not.toBeInTheDocument();
  expect(api.startBuild).not.toHaveBeenCalled();
  screen.getByRole("button", { name: "继续让系统制作" }).click();
  await screen.findAllByText(/正在排队制作|正在等待服务端响应|服务端正在处理/);
  expect(api.startBuild).toHaveBeenCalledTimes(1);
  expect(api.startBuild).toHaveBeenCalledWith("p1");
  expect(api.submitProduction).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "继续让系统制作" })).not.toBeInTheDocument();
});

it("浏览器代码验收失败可由用户在同一项目继续，沿用已确认方案且旧失败任务不会覆盖新构建", async () => {
  history.replaceState(null, "", "/create?production=p1");
  const failure = { stage: "code", category: "validation", code: "BROWSER_VALIDATION", message: "生成结果没有通过验收。", nextStep: "系统可沿用已确认方案修复代码后重新验收。", retryable: false } as const;
  const failedBuild = { ...build, id: "b-old", status: "failed", error: failure.message, failureDetails: [failure], projectId: "p1" } as any;
  const queuedBuild = { ...build, id: "b-new", status: "queued", error: null, failureDetails: null, projectId: "p1", steps: [{ ...build.steps[0], status: "pending" }] } as any;
  vi.mocked(api.getProductionJob).mockResolvedValue({ id: "p1", status: "failed", error: failure.message, failureDetails: [failure], events: [] });
  vi.mocked(api.getLatestBuild).mockResolvedValueOnce(failedBuild).mockResolvedValue(queuedBuild);
  vi.mocked(api.startBuild).mockResolvedValue(queuedBuild);
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("代码制作 · 浏览器检查未通过");
  expect(alert).toHaveTextContent("无需自行修改代码");
  const button = await screen.findByRole("button", { name: "继续让系统制作" });
  expect(screen.getByText(/同一项目中沿用已确认方案继续制作/)).toBeInTheDocument();
  expect(screen.getByText(/可能要求重新生成资源并使用模型用量/)).toBeInTheDocument();
  expect(api.startBuild).not.toHaveBeenCalled();
  button.click();
  await waitFor(() => expect(api.startBuild).toHaveBeenCalledExactlyOnceWith("p1"));
  expect(api.submitProduction).not.toHaveBeenCalled();
  expect((await screen.findAllByText(/正在排队制作|正在等待服务端响应|服务端正在处理/)).length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: "继续让系统制作" })).not.toBeInTheDocument();
});

it("运行中明确说明同轮自动检查与有限修复，且只显示服务端步骤", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({
    ...build,
    status: "running",
    projectId: "p1",
    steps: [{ ...build.steps[0], status: "running", detail: "正在自动修复“主角”（2/3）：SPRITE_FRAME_SUBJECT bbox left 未通过图集合同" }],
  });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  expect((await screen.findAllByText("正在自动修复“主角”（2/3）：系统正在重新生成并检查这项图片")).length).toBeGreaterThan(0);
  expect(screen.getByText(/同一轮制作内自动检查生成结果/)).toBeInTheDocument();
  expect(screen.getByText(/仅显示服务端返回的阶段和步骤/)).toBeInTheDocument();
  expect(screen.queryByText(/SPRITE_FRAME_SUBJECT|bbox|left|图集合同/i)).not.toBeInTheDocument();
});

it("图片自动处理耗尽后保持失败，只按服务端续修契约开放显式入口", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({
    ...build,
    status: "failed",
    projectId: "p1",
    error: "资源检查未通过",
    steps: [{ ...build.steps[0], kind: "asset", status: "failed", detail: "第 2 帧 left 边界 bbox 不符合图集合同。", output: "assets/hero.png SPRITE_FRAME_TRANSPARENCY" }],
    failureDetails: [{
      stage: "asset", category: "invalid-image", code: "SPRITE_FRAME_SUBJECT",
      message: "主体检查未通过。", nextStep: "系统已用完本轮资源修复次数；下一轮将继续只重新生成并检查该资源。", retryable: false,
      resource: { file: "assets/hero.png", label: "主角" },
      operation: "sprite-sheet-edit",
      continuation: { kind: "regenerate-resource", resourceFile: "assets/hero.png" },
    }],
  });
  vi.mocked(api.startBuild).mockResolvedValue({ ...build, status: "queued", projectId: "p1" });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  expect((await screen.findAllByText("本次制作未完成")).length).toBeGreaterThan(0);
  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("本轮自动处理次数用尽");
  expect(screen.queryByText(/bbox|left|SPRITE_FRAME_SUBJECT|assets\/hero\.png|图集合同/i)).not.toBeInTheDocument();
  const continueButton = screen.getByRole("button", { name: "继续让系统生成并检查" });
  expect(api.startBuild).not.toHaveBeenCalled();
  continueButton.click();
  await waitFor(() => expect(api.startBuild).toHaveBeenCalledWith("p1"));
});

it.each([
  { category: "authentication", code: "MODEL_KEY_MISSING", message: "模型密钥未配置。", nextStep: "请联系管理员配置密钥。" },
  { category: "permission", code: "MODEL_PERMISSION", message: "当前账户没有模型权限。", nextStep: "请联系管理员开通权限。" },
  { category: "rate-limit", code: "MODEL_QUOTA", message: "模型额度已用尽。", nextStep: "请补充额度后再试。" },
] as const)("$code 原因按服务端展示且不开放制作入口", async detail => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getProductionJob).mockResolvedValue({
    id: "p1", status: "failed", error: detail.message, events: [],
    failureDetails: [{ stage: "asset", retryable: true, ...detail }],
  });
  vi.mocked(api.getLatestBuild).mockResolvedValue(null);
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(detail.message);
  expect(alert).toHaveTextContent(detail.nextStep);
  expect(screen.queryByRole("button", { name: /继续让系统/ })).not.toBeInTheDocument();
  expect(api.retryProduction).not.toHaveBeenCalled();
});

it("修订构建不通过通用 startBuild 丢失原 build 意图", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({
    ...build,
    status: "failed",
    projectId: "p1",
    revisionScope: "assets",
    failureDetails: [retryableNetworkFailure],
  });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  expect(await screen.findByRole("alert")).toHaveTextContent(retryableNetworkFailure.message);
  expect(screen.queryByRole("button", { name: /继续让系统/ })).not.toBeInTheDocument();
  expect(api.startBuild).not.toHaveBeenCalled();
});

it("完成态只在真实步骤明示自动调整时确认系统已调整", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({
    ...build,
    status: "succeeded",
    projectId: "p1",
    steps: [{ ...build.steps[0], output: "主角资源自动修复后已通过检查。" }],
  });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  expect(await screen.findByText(/系统已在本轮完成自动调整并再次检查/)).toBeInTheDocument();
});
