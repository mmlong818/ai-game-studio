import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

vi.mock("./web/api", () => ({
  getProject: async (id: string) => ({
    id,
    title: id === "game-b" ? "青玉长游" : "数织矩阵",
    idea: id === "game-b" ? "青玉花园贪吃蛇" : "数字合成游戏",
    template: id === "game-b" ? "snake" : "merge-2048",
    version: { number: 3 },
    publication: {
      stableUrl: `http://127.0.0.1:4313/play/${id}/`,
      versionUrl: `http://127.0.0.1:4313/version/${id}/`,
      versionNumber: 3,
    },
  }),
}));

vi.mock("./domain/simpleRelease", () => ({
  verifySimplePlayableRevision: async (project: unknown) => ({ project, errors: [] }),
  publishSimplePlayableRevision: async (project: unknown) => ({ project, url: "http://127.0.0.1/play/test/index.html" }),
}));

describe("player-first creation flow", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/player-first?game=game-a");
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

  it("游戏边缘的改造入口直达创作页，并预选当前游戏", async () => {
    render(<App />);
    expect(await screen.findByTitle("数织矩阵游戏画面")).toBeInTheDocument();
    const entry = screen.getByRole("link", { name: /改造这个游戏/ });
    expect(entry).toHaveAttribute("href", "/create?game=game-a");
    // 游戏内不再有独立的意见面板：修改统一走创作页的“改一个现有游戏”步骤。
    expect(screen.queryByRole("heading", { name: "哪里不满意？" })).not.toBeInTheDocument();
  });

  it("没有选择游戏时不再展示固定示例", async () => {
    window.history.replaceState({}, "", "/player-first");
    render(<App />);
    expect(screen.getByRole("heading", { name: "先选一个要改造的游戏" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "去游戏大厅选择" })).toHaveAttribute("href", "/games");
    expect(screen.queryByTitle(/游戏画面/)).not.toBeInTheDocument();
  });
});
