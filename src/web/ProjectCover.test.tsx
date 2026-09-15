import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ProjectCover } from "./ProjectCover";
import { PreferencesProvider } from "./preferences";
afterEach(cleanup);
beforeEach(() => vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))));
it("没有产物封面时不请求虚构的图片地址", () => {
  localStorage.setItem("forge-locale", "zh-CN");
  render(<PreferencesProvider><ProjectCover src={null} alt="草稿封面" /></PreferencesProvider>);
  expect(document.querySelector("img")).toBeNull();
  expect(screen.getByText("封面暂不可用")).toBeVisible();
});
it("封面失败后显示占位而不是破图，新地址仍可加载", () => {
  localStorage.setItem("forge-locale", "zh-CN");
  const { rerender } = render(<PreferencesProvider><ProjectCover src="/missing.png" alt="花园封面" /></PreferencesProvider>);
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText("封面暂不可用")).toBeVisible();
  expect(document.querySelector("img")).toBeNull();
  rerender(<PreferencesProvider><ProjectCover src="/new.png" alt="花园封面" /></PreferencesProvider>);
  expect(screen.getByRole("img")).toHaveAttribute("src", "/new.png");
});
