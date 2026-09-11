import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./web/api", async original => {
  const actual = await original<typeof import("./web/api")>();
  const { createDesignProfile } = await import("./shared/contracts");
  return {
    ...actual,
    generateDesignPreview: vi.fn(async () => createDesignProfile("puzzle", "standard")),
    getPublishedGames: vi.fn(async () => [publishedRemixGame]),
    planProjectRevision: vi.fn(async (projectId: string, content: string) => ({
      status: "ready" as const,
      revisionPlan: { sourceProjectId: projectId, sourceVersionId: "version-1", content, operations: [{ scope: "visual-style" as const, content }] },
      candidates: [],
      recommendedTargetFiles: [],
    })),
  };
});
import App from "./App";
import { clearDesignPreviewCache } from "./domain/designPreviewCache";
import type { ProjectSummary } from "./shared/contracts";

const publishedRemixGame = {
  id: "a84e32e5-921b-4fc1-879a-bc598549f10b",
  title: "线上滑动合成",
  idea: "滑动数字方块来完成合并目标。",
  slug: "online-merge",
  dimensions: "2d",
  template: "merge-2048",
  visualStyle: "fashion",
  difficulty: "standard",
  aspectRatio: "16:9",
  sessionLength: "3 分钟",
  inputModes: ["swipe"],
  status: "published",
  fixtureKind: null,
  threeMode: null,
  isOfficial: true,
  coverUrl: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  archivedAt: null,
  version: { id: "version-1", number: 1, label: "初始版本", createdAt: "2026-09-01T00:00:00.000Z", qualityStatus: "passed", qualitySummary: null, qualityCheckedAt: null, artReviewStatus: "passed", artReviewSummary: null, artReviewedAt: null },
  publication: null,
} satisfies ProjectSummary;

async function chooseRemixOf(user: ReturnType<typeof userEvent.setup>, gameName: RegExp) {
  await user.click(screen.getByRole("button", { name: /改一个现有游戏/ }));
  await user.click(screen.getByRole("button", { name: gameName }));
}

describe("creation workbench", () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    clearDesignPreviewCache();
    vi.clearAllMocks();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/create");
  });

  it("进入页直接描述想法，改造入口保留且不要求先选模式", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "把想法，变成好玩的。" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /改一个现有游戏/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /提交，生成方案/ })).toBeDisabled();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "可以改造的游戏" })).not.toBeInTheDocument();
  });

  it("改游戏：选图标后只剩一个输入框，一句话就能形成改造规格", async () => {
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /滑动合成/);
    expect(screen.getByRole("heading", { name: /个性化「.*滑动合成」/ })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /换一个世界观/ })).not.toBeInTheDocument();

    const start = screen.getByRole("button", { name: "分析修改内容" });
    expect(start).toBeDisabled();
    await user.type(screen.getByLabelText("这次想怎么改？"), "换成海底世界的画风");
    expect(screen.getByText("可以直接开始。")).toBeInTheDocument();
    expect(start).toBeEnabled();

    await user.click(start);
    await user.click(screen.getByRole("button", { name: /确认改造需求，生成方案/ }));
    expect(screen.getByRole("heading", { name: /滑动合成个性化方案/ })).toBeInTheDocument();
    expect(screen.getByText("实时 AI 策划")).toBeInTheDocument();
    expect(screen.queryByText(/R[0-3]/)).not.toBeInTheDocument();
  });

  it("改动已经变成新游戏时，只提供按新游戏继续", async () => {
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /滑动合成/);
    await user.type(screen.getByLabelText("这次想怎么改？"), "我想改成多人联机开放世界");

    expect(screen.getByText("这已经是一款新游戏了")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^开始制作/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /按新游戏继续/ }));

    expect(screen.getByRole("heading", { name: "你想做一个什么游戏？" })).toBeInTheDocument();
    expect(screen.getByLabelText("说说你想做的游戏")).toHaveValue("以「线上滑动合成」为灵感，我想改成多人联机开放世界");
    await user.click(screen.getByRole("button", { name: /提交，生成方案/ }));
    expect(screen.getByRole("heading", { name: "新游戏机制方案" })).toBeInTheDocument();
    expect(screen.queryByText("滑动合成个性化方案")).not.toBeInTheDocument();
  });

  it("新游戏：只需要一段描述，机制由系统推断", async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /路线闪避/ })).not.toBeInTheDocument();

    await user.type(
      screen.getByRole("textbox", { name: "你想做一个什么游戏？" }),
      "控制一只小昆虫在树干上高速移动，收集露珠并躲开树脂，最后安全撤离",
    );
    await user.click(screen.getByRole("button", { name: /提交，生成方案/ }));
    expect(screen.getByRole("heading", { name: "新游戏机制方案" })).toBeInTheDocument();
    expect(await screen.findByText("方案草案 · 待制作验证", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.queryByText("通过")).not.toBeInTheDocument();
  });

  it("新游戏可选择静态资源，并在方案阶段透传动画偏好", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("radio", { name: /这次使用静态图片/ }));
    expect(screen.queryByLabelText("Sprite Sheet 播放预览")).not.toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "你想做一个什么游戏？" }), "在雨林里驾驶小船收集萤火虫，避开漩涡后抵达营地");
    await user.click(screen.getByRole("button", { name: /提交，生成方案/ }));
    expect(await screen.findByText("方案草案 · 待制作验证", {}, { timeout: 3000 })).toBeInTheDocument();
    const { generateDesignPreview } = await import("./web/api");
    expect(vi.mocked(generateDesignPreview)).toHaveBeenCalledWith(expect.objectContaining({ spriteAnimation: "none" }), expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });

  it("灵感不会静默覆盖用户描述，确认后可一步进入方案", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole("textbox");
    await user.type(input, "保留我的想法");
    await user.click(screen.getByRole("button", { name: /午后拼图/ }));
    expect(input).toHaveValue("保留我的想法");
    await user.click(screen.getByRole("button", { name: "保留原文" }));
    expect(input).toHaveValue("保留我的想法");
    await user.click(screen.getByRole("button", { name: /午后拼图/ }));
    await user.click(screen.getByRole("button", { name: "替换描述" }));
    await user.click(screen.getByRole("button", { name: /提交，生成方案/ }));
    expect(screen.getByRole("heading", { name: "新游戏机制方案" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回修改" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain("植物园");
  });

  it("输入、输入法确认和资源选择等待后仍停留在草稿，只有明确点击才查看方案", async () => {
    const user = userEvent.setup();
    render(<App />);
    const input = screen.getByRole("textbox");
    fireEvent.compositionStart(input);
    await user.type(input, "一个轻松的水果合成游戏，合成后获得积分，关卡逐步变难");
    fireEvent.compositionEnd(input);
    await user.click(screen.getByRole("radio", { name: /这次使用静态图片/ }));
    await new Promise(resolve => setTimeout(resolve, 1700));
    expect(screen.getByRole("textbox")).toHaveValue("一个轻松的水果合成游戏，合成后获得积分，关卡逐步变难");
    expect(screen.queryByRole("heading", { name: "新游戏机制方案" })).not.toBeInTheDocument();
    const { generateDesignPreview } = await import("./web/api");
    expect(vi.mocked(generateDesignPreview)).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /提交，生成方案/ }));
    await waitFor(() => expect(vi.mocked(generateDesignPreview)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(generateDesignPreview)).toHaveBeenCalledWith(expect.objectContaining({ idea: "一个轻松的水果合成游戏，合成后获得积分，关卡逐步变难", spriteAnimation: "none" }), expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });

  it("改造输入等待后不预检或请求；两次明确点击才带来源和最终计划生成方案", async () => {
    const { generateDesignPreview, getPublishedGames, planProjectRevision } = await import("./web/api");
    vi.mocked(getPublishedGames).mockResolvedValueOnce([publishedRemixGame]);
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /线上滑动合成/);
    await user.type(screen.getByLabelText("这次想怎么改？"), "把界面改成温暖的水彩绘本，保留滑动合并操作");
    await new Promise(resolve => setTimeout(resolve, 1700));

    expect(screen.getByRole("heading", { name: "个性化「线上滑动合成」" })).toBeInTheDocument();
    expect(screen.getByLabelText("这次想怎么改？")).toHaveValue("把界面改成温暖的水彩绘本，保留滑动合并操作");
    expect(screen.queryByRole("heading", { name: "线上滑动合成个性化方案" })).not.toBeInTheDocument();
    expect(vi.mocked(generateDesignPreview)).not.toHaveBeenCalled();
    expect(vi.mocked(planProjectRevision)).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "分析修改内容" }));
    await waitFor(() => expect(vi.mocked(planProjectRevision)).toHaveBeenCalledExactlyOnceWith(publishedRemixGame.id, "把界面改成温暖的水彩绘本，保留滑动合并操作"));
    expect(vi.mocked(generateDesignPreview)).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /确认改造需求，生成方案/ }));
    await waitFor(() => expect(vi.mocked(generateDesignPreview)).toHaveBeenCalledTimes(1));
    expect(vi.mocked(generateDesignPreview)).toHaveBeenCalledWith(expect.objectContaining({
      sourceProjectId: publishedRemixGame.id,
      revisionPlan: expect.objectContaining({ sourceProjectId: publishedRemixGame.id, operations: [expect.objectContaining({ scope: "visual-style" })] }),
      idea: expect.stringContaining("把界面改成温暖的水彩绘本，保留滑动合并操作"),
    }), expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });

  it("方案生成期间隐藏改造表单，返回编辑后仍须再次明确提交", async () => {
    const { generateDesignPreview, getPublishedGames } = await import("./web/api");
    vi.mocked(getPublishedGames).mockResolvedValueOnce([publishedRemixGame]);
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /线上滑动合成/);
    const request = screen.getByLabelText("这次想怎么改？");
    await user.type(request, "把界面改成水彩绘本，保留滑动合并操作");
    await user.click(screen.getByRole("button", { name: "分析修改内容" }));
    await user.click(screen.getByRole("button", { name: /确认改造需求，生成方案/ }));
    await waitFor(() => expect(vi.mocked(generateDesignPreview)).toHaveBeenCalledTimes(1));

    expect(screen.queryByLabelText("这次想怎么改？")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "分析修改内容" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "返回修改" }));
    const revisedRequest = screen.getByLabelText("这次想怎么改？");
    expect(revisedRequest).toHaveValue("把界面改成水彩绘本，保留滑动合并操作");
    await user.clear(revisedRequest);
    await user.type(revisedRequest, "只替换角色图片，保留原有的滑动合并操作");
    await new Promise(resolve => setTimeout(resolve, 1700));
    expect(vi.mocked(generateDesignPreview)).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "分析修改内容" }));
    await user.click(screen.getByRole("button", { name: /确认改造需求，生成方案/ }));
    await waitFor(() => expect(vi.mocked(generateDesignPreview)).toHaveBeenCalledTimes(2));
    expect(vi.mocked(generateDesignPreview)).toHaveBeenLastCalledWith(expect.objectContaining({
      sourceProjectId: publishedRemixGame.id,
      revisionPlan: expect.objectContaining({ sourceProjectId: publishedRemixGame.id }),
      idea: expect.stringContaining("只替换角色图片，保留原有的滑动合并操作"),
    }), expect.anything(), expect.anything(), expect.anything(), expect.anything());
  });

  it("显式提交将方案标题滚入视口，返回修改后再次提交也能定位且不重新生成", async () => {
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole("textbox"), "一个轻松的水果合成游戏，合成后获得积分，关卡逐步变难");
    await user.click(screen.getByRole("button", { name: /提交，生成方案/ }));
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "auto" }));
    expect(scroll.mock.contexts[0]).toBe(screen.getByRole("region", { name: "游戏方案" }));
    await user.click(screen.getByRole("button", { name: "返回修改" }));
    await user.click(screen.getByRole("button", { name: /提交，生成方案/ }));
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
    await screen.findByText("方案草案 · 待制作验证");
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it("从规格进入包含场景、AI资源、设备预览和质量证据的制作工作台", async () => {
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /滑动合成/);
    await user.type(screen.getByLabelText("这次想怎么改？"), "换成海底世界的画风");
    await user.click(screen.getByRole("button", { name: "分析修改内容" }));
    await user.click(screen.getByRole("button", { name: /确认改造需求，生成方案/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "确认方案，开始制作" })).toBeEnabled(), { timeout: 3000 });
    await user.click(screen.getByRole("button", { name: "确认方案，开始制作" }));

    // 制作页是左游戏位、右进度面板的工作台：面板里有"当前进展"摘要与制作进度区域。
    expect(screen.getByText("当前进展")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "自动制作进度" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "游戏预览" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "AI 资源" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "设备预览" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "质量证据" })).not.toBeInTheDocument();
  });
});
