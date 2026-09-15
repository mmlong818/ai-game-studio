import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { PreferencesProvider, PreferenceControls } from "../web/preferences";
import { AspectRatioChoice } from "./AspectRatioChoice";

it("updates creation copy immediately in every supported locale", async () => {
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  localStorage.setItem("forge-locale", "zh-CN");
  render(<PreferencesProvider><PreferenceControls /><AspectRatioChoice value={null} onChange={() => undefined} /></PreferencesProvider>);
  const language = screen.getByLabelText("语言");
  expect(screen.getByText("选择游戏画幅")).toBeInTheDocument();
  await userEvent.selectOptions(language, "zh-TW");
  expect(screen.getByText("選擇遊戲畫幅")).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("語言"), "en");
  expect(screen.getByText("Choose the game aspect ratio")).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Language"), "ja");
  expect(screen.getByText("ゲーム画面の比率を選択")).toBeInTheDocument();
});
