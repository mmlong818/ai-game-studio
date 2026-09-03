import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

async function chooseRemixOf(user: ReturnType<typeof userEvent.setup>, gameName: RegExp) {
  await user.click(screen.getByRole("button", { name: /改一个现有游戏/ }));
  await user.click(screen.getByRole("button", { name: gameName }));
}

describe("creation workbench", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/create");
  });

  it("进入页只问做什么，选择后才出现对应步骤", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: "今天想做什么？" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /改一个现有游戏/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /做一个新游戏/ })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "可以改造的游戏" })).not.toBeInTheDocument();
  });

  it("改游戏：选图标后只剩一个输入框，一句话就能形成改造规格", async () => {
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /滑动合成/);
    expect(screen.getByRole("heading", { name: "想怎么改「滑动合成」？" })).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /换一个世界观/ })).not.toBeInTheDocument();

    const start = screen.getByRole("button", { name: /开始制作/ });
    expect(start).toBeDisabled();
    await user.type(screen.getByLabelText("你想怎么改？"), "换成海底世界的画风");
    expect(screen.getByText("可以直接开始。")).toBeInTheDocument();
    expect(start).toBeEnabled();

    await user.click(start);
    expect(screen.getByRole("heading", { name: "滑动合成改造方案" })).toBeInTheDocument();
    expect(screen.getByText("方案已形成")).toBeInTheDocument();
    expect(screen.queryByText(/R[0-3]/)).not.toBeInTheDocument();
  });

  it("改动已经变成新游戏时，只提供按新游戏继续", async () => {
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /滑动合成/);
    await user.type(screen.getByLabelText("你想怎么改？"), "我想改成多人联机开放世界");

    expect(screen.getByText("这已经是一款新游戏了")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^开始制作/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /按新游戏继续/ }));

    expect(screen.getByRole("heading", { name: "你想做一个什么游戏？" })).toBeInTheDocument();
    expect(screen.getByLabelText("说说你想做的游戏")).toHaveValue("以「滑动合成」为灵感，我想改成多人联机开放世界");
    await user.click(screen.getByRole("button", { name: /开始制作/ }));
    expect(screen.getByRole("heading", { name: "新游戏机制方案" })).toBeInTheDocument();
    expect(screen.queryByText("滑动合成改造方案")).not.toBeInTheDocument();
  });

  it("新游戏：只需要一段描述，机制由系统推断", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /做一个新游戏/ }));
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /路线闪避/ })).not.toBeInTheDocument();

    await user.type(
      screen.getByLabelText("说说你想做的游戏"),
      "控制一只小昆虫在树干上高速移动，收集露珠并躲开树脂，最后安全撤离",
    );
    expect(screen.getByText(/会用这些已经验证过的玩法来搭/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /开始制作/ }));
    expect(screen.getByRole("heading", { name: "新游戏机制方案" })).toBeInTheDocument();
  });

  it("从规格进入包含场景、AI资源、设备预览和质量证据的制作工作台", async () => {
    const user = userEvent.setup();
    render(<App />);

    await chooseRemixOf(user, /滑动合成/);
    await user.type(screen.getByLabelText("你想怎么改？"), "换成海底世界的画风");
    await user.click(screen.getByRole("button", { name: /开始制作/ }));
    await user.click(screen.getByRole("button", { name: /进入制作工作台/ }));

    expect(screen.getByRole("heading", { name: "滑动合成改造" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "制作步骤" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "场景画面" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 资源" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设备预览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "质量证据" })).toBeInTheDocument();
  });
});
