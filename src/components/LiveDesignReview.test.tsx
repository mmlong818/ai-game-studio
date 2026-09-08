import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { LiveDesignReview } from "./LiveDesignReview";
import { INITIAL_DRAFT } from "../domain/storage";
import { createDesignProfile } from "../shared/contracts";
import { generateDesignPreview } from "../web/api";
import { clearDesignPreviewCache } from "../domain/designPreviewCache";
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
  expect(generateDesignPreview).toHaveBeenCalledWith(expect.objectContaining({ idea: draft.newGameBrief, template: "generated" }), expect.any(AbortSignal), expect.any(Function), expect.any(Function));
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

it("失败不回退固定方案，用户可以重新生成", async () => {
  vi.mocked(generateDesignPreview).mockRejectedValueOnce(new Error("实时服务不可用")).mockResolvedValue(profile);
  render(<LiveDesignReview draft={draft} onBack={vi.fn()} onConfirm={vi.fn()} />);
  expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent("实时服务不可用");
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
