import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ProjectDetail } from "../shared/contracts.js";
import { merge2048DesignSample } from "../shared/game-design-contract/samples.js";
import { DesignDecisionCards } from "./ProjectStudio.js";
import { PreferencesProvider } from "./preferences.js";

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
