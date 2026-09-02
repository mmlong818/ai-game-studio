import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("creation workbench", () => {
  beforeEach(() => window.history.replaceState({}, "", "/create"));
  it("从固定建议形成可检查的模板改造规格", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /换一个世界观/ }));
    const createButton = screen.getByRole("button", { name: /生成制作规格/ });
    expect(createButton).toBeEnabled();

    await user.click(createButton);
    expect(
      screen.getByRole("heading", { name: "滑动合成改造方案" }),
    ).toBeInTheDocument();
    expect(screen.getByText("规则规格已形成")).toBeInTheDocument();
  });

  it("发现核心越界时不允许继续套用旧模板", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText("还有其他要求"),
      "我想改成多人联机开放世界",
    );

    expect(screen.getAllByText("核心重写").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /转为新游戏设计/ }),
    ).toBeEnabled();
  });

  it("转入新游戏后生成机制方案而不是旧模板改造方案", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByLabelText("还有其他要求"),
      "改成多人联机开放世界",
    );
    await user.click(screen.getByRole("button", { name: /转为新游戏设计/ }));
    await user.click(screen.getByRole("button", { name: /生成制作规格/ }));

    expect(
      screen.getByRole("heading", { name: "新游戏机制方案" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("滑动合成改造方案")).not.toBeInTheDocument();
  });

  it("从规格进入包含场景、AI资源、设备预览和质量证据的制作工作台", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /换一个世界观/ }));
    await user.click(screen.getByRole("button", { name: /生成制作规格/ }));
    await user.click(screen.getByRole("button", { name: /进入制作工作台/ }));

    expect(screen.getByRole("heading", { name: "滑动合成改造" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "制作步骤" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "场景画面" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 资源" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "设备预览" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "质量证据" })).toBeInTheDocument();
  });
});
