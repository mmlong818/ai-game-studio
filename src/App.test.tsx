import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("./web/api", async original => {
  const actual = await original<typeof import("./web/api")>();
  const { createDesignProfile } = await import("./shared/contracts");
  return { ...actual, generateDesignPreview: vi.fn(async () => createDesignProfile("puzzle", "standard")) };
});
import App from "./App";
import { clearDesignPreviewCache } from "./domain/designPreviewCache";

async function chooseRemixOf(user: ReturnType<typeof userEvent.setup>, gameName: RegExp) {
  await user.click(screen.getByRole("button", { name: /改一个现有游戏/ }));
  await user.click(screen.getByRole("button", { name: gameName }));
}

describe("creation workbench", () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    clearDesignPreviewCache();
    window.localStorage.clear();
    window.history.replaceState({}, "", "/create");
  });

  it("进入页直接描述想法，改造入口保留且不要求先选模式", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "把想法，变成好玩的。" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /改一个现有游戏/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /看看游戏方案/ })).toBeDisabled();
    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "可以改造的游戏" })).not.toBeInTheDocument();
  });

  it("改游戏：选图标后只剩一个输入框，一句话就能形成改造规格", async () => {
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /滑动合成/);
    expect(screen.getByRole("heading", { name: "个性化「滑动合成」" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /改一个玩点/ })).toBeChecked();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /换一个世界观/ })).not.toBeInTheDocument();

    const start = screen.getByRole("button", { name: /开始制作/ });
    expect(start).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /改变美术风格/ }));
    await user.type(screen.getByLabelText("具体想调整什么？"), "换成海底世界的画风");
    expect(screen.getByText("可以直接开始。")).toBeInTheDocument();
    expect(start).toBeEnabled();

    await user.click(start);
    expect(screen.getByRole("heading", { name: "滑动合成个性化方案" })).toBeInTheDocument();
    expect(screen.getByText("实时 AI 策划")).toBeInTheDocument();
    expect(screen.queryByText(/R[0-3]/)).not.toBeInTheDocument();
  });

  it("改动已经变成新游戏时，只提供按新游戏继续", async () => {
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /滑动合成/);
    await user.type(screen.getByLabelText("具体想调整什么？"), "我想改成多人联机开放世界");

    expect(screen.getByText("这已经是一款新游戏了")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^开始制作/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /按新游戏继续/ }));

    expect(screen.getByRole("heading", { name: "你想做一个什么游戏？" })).toBeInTheDocument();
    expect(screen.getByLabelText("说说你想做的游戏")).toHaveValue("以「滑动合成」为灵感，我想改成多人联机开放世界");
    await user.click(screen.getByRole("button", { name: /开始制作/ }));
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
    await user.click(screen.getByRole("button", { name: /看看游戏方案/ }));
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
    await user.click(screen.getByRole("button", { name: /看看游戏方案/ }));
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
    await user.click(screen.getByRole("button", { name: /看看游戏方案/ }));
    expect(screen.getByRole("heading", { name: "新游戏机制方案" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "返回修改" }));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain("植物园");
  });

  it("输入停顿后自动展示方案，不提供下载，返回后保留原文", async () => {
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole("textbox"), "一个轻松的水果合成游戏，合成后获得积分，关卡逐步变难");
    await waitFor(() => expect(screen.getByRole("heading", { name: "新游戏机制方案" })).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.queryByRole("button", { name: /下载/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "确认方案，开始制作" })).toBeInTheDocument();
    expect(scroll).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "返回修改" }));
    expect(screen.getByRole("textbox")).toHaveValue("一个轻松的水果合成游戏，合成后获得积分，关卡逐步变难");
    await new Promise(resolve => setTimeout(resolve, 1700));
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("显式查看方案将标题滚入视口，再次点击也能定位且不重新生成", async () => {
    const scroll = vi.mocked(Element.prototype.scrollIntoView);
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByRole("textbox"), "一个轻松的水果合成游戏，合成后获得积分，关卡逐步变难");
    await user.click(screen.getByRole("button", { name: /看看游戏方案/ }));
    await waitFor(() => expect(scroll).toHaveBeenCalledWith({ block: "start", behavior: "auto" }));
    expect(scroll.mock.contexts[0]).toBe(screen.getByRole("region", { name: "游戏方案" }));
    await user.click(screen.getByRole("button", { name: /看看游戏方案/ }));
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
    await screen.findByText("方案草案 · 待制作验证");
    expect(scroll).toHaveBeenCalledTimes(2);
  });

  it("从规格进入包含场景、AI资源、设备预览和质量证据的制作工作台", async () => {
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /滑动合成/);
    await user.click(screen.getByRole("radio", { name: /改变美术风格/ }));
    await user.type(screen.getByLabelText("具体想调整什么？"), "换成海底世界的画风");
    await user.click(screen.getByRole("button", { name: /开始制作/ }));
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
