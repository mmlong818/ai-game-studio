import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { LiveDesignReview } from "./LiveDesignReview";
import { INITIAL_DRAFT } from "../domain/storage";
import { createDesignProfile } from "../shared/contracts";
import { generateDesignPreview } from "../web/api";
import { clearDesignPreviewCache } from "../domain/designPreviewCache";
import { StudioApiError } from "../web/failure";
vi.mock("../web/api", () => ({ generateDesignPreview: vi.fn() }));
const draft = { ...INITIAL_DRAFT, creationMode: "mechanic-composition" as const, newGameBrief: "太空里驾驶小船收集水晶并躲避陨石" };
const profile = { ...createDesignProfile("puzzle", "standard"), playerFantasy: "驾驶小船穿越水晶星带" };
beforeEach(() => { vi.resetAllMocks(); clearDesignPreviewCache(); });
it("显示模型结果并提交同一方案，修改描述立即禁用旧方案", async () => {
  vi.mocked(generateDesignPreview).mockResolvedValue(profile);
  const confirm = vi.fn();
  const view = render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={confirm} />);
  expect(screen.getByRole("button", { name: "确认方案，开始制作" })).toBeDisabled();
  await screen.findByText(profile.playerFantasy, {}, { timeout: 3000 });
  expect(screen.getByText(/会产生额外模型用量/)).toBeInTheDocument();
  expect(screen.getByText("查看完整玩法、教学与制作要求").closest("details")).not.toHaveAttribute("open");
  await userEvent.click(screen.getByRole("button", { name: "确认方案，开始制作" }));
  expect(confirm.mock.calls[0][0]).toContain(profile.playerFantasy);
  expect(confirm.mock.calls[0][1]).toEqual(profile);
  expect(confirm.mock.calls[0][2]).toBe(draft.newGameBrief);
  // 第四个参数是预览被服务端撤回时清空半截文本的回调。
  expect(generateDesignPreview).toHaveBeenCalledWith(expect.objectContaining({ idea: draft.newGameBrief, template: "generated", spriteAnimation: "auto" }), expect.any(AbortSignal), expect.any(Function), expect.any(Function), expect.any(Function));
  view.rerender(<LiveDesignReview draft={{ ...draft, newGameBrief: "在水下探索珊瑚城，收集珍珠并躲避鲨鱼" }} onBack={vi.fn()} onConfirm={confirm} />);
  expect(screen.getByRole("button", { name: "确认方案，开始制作" })).toBeDisabled();
  expect(screen.queryByText(profile.playerFantasy)).not.toBeInTheDocument();
});
it("确认前直接展示真实关数和无失败规则，并原样提交", async () => {
  const planned = { ...profile, generatedCampaign: { mode: "campaign" as const, failurePolicy: "forbidden" as const, levelCount: 7, milestones: [1, 4, 7], difficultyKeys: ["pairCount"], rationale: "逐步增加花朵配对数量。" } };
  vi.mocked(generateDesignPreview).mockResolvedValue(planned);
  const confirm = vi.fn();
  render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={confirm} />);
  const summary = await screen.findByText(/共 7 关；不会失败/);
  expect(summary.closest("details")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "确认方案，开始制作" }));
  expect(confirm.mock.calls[0][1]).toEqual(planned);
  expect(confirm.mock.calls[0][0]).toContain("共 7 关；不会失败");
});

it("输入复刻 URL 时先按参考获取送审，不依赖预先存在的 dossier", async () => {
  const referenceProfile = { ...profile, creationMode: "reference-replica" as const };
  vi.mocked(generateDesignPreview).mockResolvedValue(referenceProfile);
  const referenced = { ...draft, newGameBrief: "复制 https://www.crazygames.com/game/arrow-escape-puzzle", referenceDossier: null };
  render(<LiveDesignReview draft={referenced} onBack={vi.fn()} onConfirm={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "参考游戏机制提炼" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "新游戏机制方案" })).not.toBeInTheDocument();
  expect(await screen.findByText(/只制作有证据支持的核心机制 demo/)).toBeInTheDocument();
  expect(screen.queryByText(/这轮先制作一局完整 demo/)).not.toBeInTheDocument();
  expect(generateDesignPreview).toHaveBeenCalledWith(expect.objectContaining({ creationMode: "reference-replica" }), expect.any(AbortSignal), expect.any(Function), expect.any(Function), expect.any(Function));
});

it("原创描述保持 original-demo，不因内部玩法资料误判为参考复刻", async () => {
  vi.mocked(generateDesignPreview).mockResolvedValue(profile);
  const original = { ...draft, referenceDossier: { references: [{ title: "内部玩法资料", url: "internal://mechanic" }] } } as any;
  render(<LiveDesignReview draft={original} onBack={vi.fn()} onConfirm={vi.fn()} />);
  expect(screen.getByRole("heading", { name: "新游戏机制方案" })).toBeInTheDocument();
  await screen.findByText(profile.playerFantasy);
  expect(generateDesignPreview).toHaveBeenCalledWith(expect.objectContaining({ creationMode: "original-demo" }), expect.any(AbortSignal), expect.any(Function), expect.any(Function), expect.any(Function));
});

it("参考资料不足时只在用户明确同意后按玩法描述请求原创单局", async () => {
  const missing = new StudioApiError("暂未取得足够的公开玩法资料。", [{
    stage: "design", category: "validation", code: "REFERENCE_GAMEPLAY_UNVERIFIED",
    message: "尚未确认参考游戏的实际玩法。", nextStep: "请描述玩法后明确选择是否改为原创单局。", retryable: false,
  }], { method: "public-browser", gameplayStatus: "runtime-viewed", runtimeStatus: "visible", canClaimPlayable: false, limitations: ["尚未执行实际玩法操作，不能确认胜负流程。"] });
  const originalProfile = { ...profile, creationMode: "original-demo" as const };
  vi.mocked(generateDesignPreview).mockRejectedValueOnce(missing).mockResolvedValueOnce(originalProfile);
  const referenced = { ...draft, newGameBrief: "复制 https://example.com/reference-game", referenceDossier: null };
  const confirm = vi.fn();
  render(<LiveDesignReview draft={referenced} onBack={vi.fn()} onConfirm={confirm} />);
  expect(await screen.findByRole("heading", { name: "尚未确认实际玩法" }, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.queryByText("本次未能完成")).not.toBeInTheDocument();
  expect(screen.queryByText(/返回内容无效/)).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "重新生成方案" })).not.toBeInTheDocument();
  expect(await screen.findByLabelText("你了解到的玩法", {}, { timeout: 3000 })).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("你了解到的玩法"), "https://example.com/only-link");
  expect(screen.getByRole("button", { name: "按我的描述制作单局 demo" })).toBeDisabled();
  await userEvent.clear(screen.getByLabelText("你了解到的玩法"));
  const description = "点击气球得分";
  await userEvent.type(screen.getByLabelText("你了解到的玩法"), description);
  expect(generateDesignPreview).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: "按我的描述制作单局 demo" }));
  await screen.findByText(originalProfile.playerFantasy);
  expect(generateDesignPreview).toHaveBeenLastCalledWith(expect.objectContaining({
    creationMode: "original-demo",
    idea: referenced.newGameBrief,
    referenceFallback: { decision: "user-approved-original-demo", gameplayDescription: description },
  }), expect.any(AbortSignal), expect.any(Function), expect.any(Function), expect.any(Function));
  await userEvent.click(screen.getByRole("button", { name: "确认方案，开始制作" }));
  expect(confirm.mock.calls[0][3]).toEqual({ decision: "user-approved-original-demo", gameplayDescription: description });
});

it("参考资料不足也进入中性协商，不显示返回内容错误", async () => {
  vi.mocked(generateDesignPreview).mockRejectedValue(new StudioApiError("参考资料不足。", [{
    stage: "design", category: "invalid-response", code: "REFERENCE_EVIDENCE_REQUIRED",
    message: "参考资料不足。", nextStep: "请描述玩法后明确选择。", retryable: true,
  }]));
  render(<LiveDesignReview draft={{ ...draft, newGameBrief: "复制 https://example.com/game", referenceDossier: null }} onBack={vi.fn()} onConfirm={vi.fn()} />);
  expect(await screen.findByRole("heading", { name: "参考资料不足" }, { timeout: 3000 })).toBeInTheDocument();
  expect(screen.getByText("已读取：没有取得足够的公开玩法资料")).toBeInTheDocument();
  expect(screen.getByLabelText("你了解到的玩法")).toBeInTheDocument();
  expect(screen.queryByText("本次未能完成")).not.toBeInTheDocument();
  expect(screen.queryByText(/返回内容无效/)).not.toBeInTheDocument();
});

it("参考方案分开说明已读取、已查看与尚未验证的能力边界", async () => {
  vi.mocked(generateDesignPreview).mockResolvedValue({
    ...profile,
    creationMode: "reference-replica",
    referenceInspection: {
      method: "public-browser", gameplayStatus: "runtime-viewed", runtimeStatus: "visible", canClaimPlayable: false,
      limitations: ["尚未执行实际玩法操作，不能确认完整交互、胜负或关卡结构。"],
    },
    referenceEvidence: [{ status: "observed", basis: "gameplay-text", claim: "公开规则说明", source: "https://example.com/game" }],
  });
  render(<LiveDesignReview draft={{ ...draft, newGameBrief: "复制 https://example.com/game", referenceDossier: null }} onBack={vi.fn()} onConfirm={vi.fn()} />);
  expect(await screen.findByText(/已读取：公开页面中的规则说明/)).toBeInTheDocument();
  expect(screen.getByText(/已查看：游戏运行页面/)).toBeInTheDocument();
  expect(screen.getByText(/尚未确认：实际操作、胜负流程和完整关卡结构/)).toBeInTheDocument();
});

it("已有游戏方案明确限制在所选范围并保留原玩法操作", async () => {
  vi.mocked(generateDesignPreview).mockResolvedValue(profile);
  const remix = {
    ...INITIAL_DRAFT,
    creationMode: "template-remix" as const,
    revisionScope: "visual-style" as const,
    templateId: "merge-2048",
    sourceGame: { id: "770e8400-e29b-41d4-a716-446655440000", title: "滑动合成", coverUrl: null },
    freeRequest: "整体改成水彩绘本风格",
  };
  render(<LiveDesignReview draft={remix} onBack={vi.fn()} onConfirm={vi.fn()} />);
  await screen.findByText(profile.playerFantasy);
  expect(generateDesignPreview).toHaveBeenCalledWith(
    expect.objectContaining({
      idea: expect.stringMatching(/改造范围：美术风格[\s\S]*不改变玩法、操作、信息层级或布局[\s\S]*水彩绘本风格/),
      revisionScope: "visual-style",
      sourceProjectId: "770e8400-e29b-41d4-a716-446655440000",
    }),
    expect.any(AbortSignal), expect.any(Function), expect.any(Function), expect.any(Function),
  );
});

it("失败不回退固定方案，显示安全原因后用户可以重新生成", async () => {
  vi.mocked(generateDesignPreview).mockRejectedValueOnce(new StudioApiError("方案服务连接超时。", [{ stage: "design", category: "timeout", code: "DESIGN_TIMEOUT", message: "方案服务连接超时。", nextStep: "确认服务恢复后，手动重新生成方案。", retryable: true }])).mockResolvedValue(profile);
  render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={vi.fn()} />);
  expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent("方案服务连接超时");
  expect(screen.getByRole("alert")).toHaveTextContent("确认服务恢复后，手动重新生成方案");
  expect(screen.getByRole("button", { name: "确认方案，开始制作" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "重新生成方案" }));
  await waitFor(() => expect(screen.getByRole("button", { name: "确认方案，开始制作" })).toBeEnabled(), { timeout: 3000 });
  expect(generateDesignPreview).toHaveBeenCalledTimes(2);
});

it("返回后未修改描述，保留同一个模型方案且不再次请求", async () => {
  vi.mocked(generateDesignPreview).mockResolvedValue(profile);
  const first = render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={vi.fn()} />);
  await screen.findByText(profile.playerFantasy);
  first.unmount();
  render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={vi.fn()} />);
  await screen.findByText(profile.playerFantasy);
  expect(generateDesignPreview).toHaveBeenCalledTimes(1);
  await userEvent.click(screen.getByRole("button", { name: "重新生成方案" }));
  await waitFor(() => expect(generateDesignPreview).toHaveBeenCalledTimes(2));
});

it("生成过程中返回再进入，复用未完成的请求", async () => {
  let resolve!: (value: typeof profile) => void;
  vi.mocked(generateDesignPreview).mockReturnValue(new Promise(done => { resolve = done; }));
  const first = render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={vi.fn()} />);
  await waitFor(() => expect(generateDesignPreview).toHaveBeenCalledTimes(1));
  first.unmount();
  render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={vi.fn()} />);
  resolve(profile);
  await screen.findByText(profile.playerFantasy);
  expect(generateDesignPreview).toHaveBeenCalledTimes(1);
});

it("停止方案请求会中止真实流，并忽略停止后的迟到结果", async () => {
  let resolve!: (value: typeof profile) => void;
  let signal: AbortSignal | undefined;
  vi.mocked(generateDesignPreview).mockImplementation((_input, nextSignal) => new Promise(done => {
    signal = nextSignal;
    resolve = done;
  }));
  render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={vi.fn()} />);
  await waitFor(() => expect(generateDesignPreview).toHaveBeenCalledTimes(1));
  const stop = await screen.findByRole("button", { name: "停止生成方案" });
  await userEvent.click(stop);
  await waitFor(() => expect(signal?.aborted).toBe(true));
  expect(await screen.findByText(/已停止方案生成/)).toBeInTheDocument();
  resolve(profile);
  await new Promise(resolveNext => window.setTimeout(resolveNext, 0));
  expect(screen.queryByText(profile.playerFantasy)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "确认方案，开始制作" })).toBeDisabled();
});

it("首段方案到达前显示真实等待时长，并随流式阶段更新诚实状态", async () => {
  vi.useFakeTimers();
  let finish!: (value: typeof profile) => void;
  let report!: (phase: "submitted" | "receiving" | "checking") => void;
  vi.mocked(generateDesignPreview).mockImplementation((_input, _signal, onDelta, _onReset, onStatus) => new Promise(done => {
    finish = done;
    report = onStatus!;
    onStatus?.("submitted");
    window.setTimeout(() => onStatus?.("receiving"), 1500);
    window.setTimeout(() => onDelta?.('{"genre":"太空收集"}'), 1600);
  }));
  render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={vi.fn()} />);
  await vi.advanceTimersByTimeAsync(250);
  expect(screen.getByRole("status", { name: "" })).toHaveTextContent("请求已提交");
  await vi.advanceTimersByTimeAsync(1500);
  expect(screen.getByText("正在接收方案内容。")).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(250);
  expect(screen.getByText(/本次方案已等待 0 分 1 秒/)).toBeInTheDocument();
  await act(async () => report("checking"));
  expect(screen.getByText("正在检查方案。")).toBeInTheDocument();
  expect(screen.getByLabelText("正在生成的方案")).toHaveTextContent("太空收集");
  finish(profile);
  await vi.runAllTimersAsync();
  vi.useRealTimers();
});
