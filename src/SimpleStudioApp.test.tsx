import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./domain/simpleRelease", () => ({
  verifySimplePlayableRevision: async (project: unknown) => ({ project, errors: [] }),
  publishSimplePlayableRevision: async (project: unknown) => ({ project, url: "http://127.0.0.1/play/test/index.html" }),
}));

describe("player-first creation flow", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
      const input = JSON.parse(String(init?.body ?? "{}")) as { role?: string };
      return new Response(JSON.stringify({
        model: "test-image-model",
        provider: "test",
        mimeType: "image/png",
        width: 1024,
        height: 1024,
        localPath: `generated/${input.role ?? "asset"}.png`,
        publicUrl: `/generated/${input.role ?? "asset"}.png`,
        processing: ["test-fixture"],
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("玩家可以从游戏边缘用一句话提交改造意见", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByTitle("果林合成游戏画面")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /改造这个游戏/ }));
    expect(screen.getByRole("heading", { name: "哪里不满意？" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "画面更可爱，角色更有辨识度" }));
    await user.click(screen.getByRole("button", { name: "提交，开始改造" }));
    expect(screen.getByText("开发过程")).toBeInTheDocument();
    expect(screen.getByText("意见已收到。我正在判断它影响画面、操作还是玩法，并检查手机版表现。")).toBeInTheDocument();
    expect(screen.getByText("正在分析你的意见")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { name: "你更喜欢哪种画面？" })).toBeInTheDocument(), { timeout: 2000 });
    await user.click(screen.getByRole("button", { name: /绘本森林/ }));
    await waitFor(() => expect(screen.getByText("新版本已经做好")).toBeInTheDocument(), { timeout: 5000 });
  });

  it("新游戏也使用需求、制作、试玩和发布的同一条路径", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "做一个新游戏" }));
    await user.click(screen.getByRole("button", { name: "小昆虫在树干上收集露珠并躲避障碍" }));
    await user.click(screen.getByRole("button", { name: "提交，开始改造" }));
    await waitFor(() => expect(screen.getByText("需要你选一下")).toBeInTheDocument(), { timeout: 2000 });
    await user.click(screen.getByRole("button", { name: /小幅调整/ }));
    await waitFor(() => expect(screen.getByRole("button", { name: "试玩新版本" })).toBeInTheDocument(), { timeout: 5000 });
    await user.click(screen.getByRole("button", { name: "试玩新版本" }));
    await user.click(screen.getByRole("button", { name: "试玩满意，发布版本" }));
    expect(screen.getByText("这个版本已发布")).toBeInTheDocument();
  });

  it("开发过程中可以打断并补充意见，历史记录不会丢失", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /改造这个游戏/ }));
    await user.click(screen.getByRole("button", { name: "操作反馈再明显一点" }));
    await user.click(screen.getByRole("button", { name: "提交，开始改造" }));
    await user.click(screen.getByRole("button", { name: "补充意见" }));
    await user.type(screen.getByLabelText("你的意见"), "同时缩小角色碰撞范围");
    await user.click(screen.getByRole("button", { name: "提交，开始改造" }));
    expect(screen.getByText("操作反馈再明显一点")).toBeInTheDocument();
    expect(screen.getByText("同时缩小角色碰撞范围")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("分析完成。我保留了当前版本，并整理出少量适合这次改造的方向。")).toBeInTheDocument(), { timeout: 2000 });
  });
});
