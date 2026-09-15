import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ModelSettingsButton } from "./ModelSettingsButton";
import { getOpenAISettings, saveOpenAIKey } from "./api";
import { PreferencesProvider } from "./preferences";

vi.mock("./api", () => ({ getOpenAISettings: vi.fn(), saveOpenAIKey: vi.fn(), clearOpenAIKey: vi.fn() }));

const fixedModels = { text: "gpt-5.6-terra", image: "gpt-image-2.5-sunburst" };
const status = { provider: "openai" as const, configured: false, source: null, models: fixedModels };

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem("forge-locale", "zh-CN");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
  vi.mocked(getOpenAISettings).mockResolvedValue(status);
  vi.mocked(saveOpenAIKey).mockResolvedValue({ ...status, configured: true, source: "session", models: fixedModels });
});
afterEach(cleanup);

async function open() {
  render(<PreferencesProvider><ModelSettingsButton /></PreferencesProvider>);
  fireEvent.click(screen.getByRole("button", { name: "模型" }));
  await waitFor(() => expect(screen.getByLabelText("OpenAI API Key")).toBeEnabled());
}

it("模型详情只读展示固定的 Terra 与 Sunburst，不提供选择控件", async () => {
  await open();
  const details = screen.getByText("模型选择与连接详情").closest("details");
  expect(details).not.toHaveAttribute("open");
  fireEvent.click(screen.getByText("模型选择与连接详情"));
  expect(screen.getByText("文本模型：gpt-5.6-terra")).toBeVisible();
  expect(screen.getByText("图像模型：gpt-image-2.5-sunburst")).toBeVisible();
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "重新获取" })).not.toBeInTheDocument();
  expect(screen.queryByText(/规划与验收：|代码生成：|Claude CLI|当前文本提供方固定使用同一模型/)).not.toBeInTheDocument();
});

it("没有图片 Key 时不会宣称所有游戏都无法制作", async () => {
  await open();
  expect(screen.getByText(/只有确认方案采用位图时才需要图片 Key/)).toBeVisible();
  expect(screen.getByText("尚未配置文字提供方；位图路线也未配置 OpenAI 图片 Key")).toBeVisible();
  expect(screen.queryByText(/所有游戏必须|无法构建游戏/)).not.toBeInTheDocument();
});

it("本地文字 provider 已选中但未验证 CLI 时不宣称可用或已授权", async () => {
  vi.mocked(getOpenAISettings).mockResolvedValue({ ...status, textProvider: { kind: "claude-cli", model: "opus" } });
  await open();
  expect(screen.getByText("文字请求已配置为 Claude CLI（首次调用时验证）；位图路线尚未配置 OpenAI 图片 Key")).toBeVisible();
  fireEvent.click(screen.getByText("模型选择与连接详情"));
  expect(screen.getByText("文本模型：Claude CLI（opus）")).toBeVisible();
  expect(screen.queryByText("文本模型：gpt-5.6-terra")).not.toBeInTheDocument();
});

it("本地文字提供方与环境图片 Key 同时配置时分别显示两种能力", async () => {
  vi.mocked(getOpenAISettings).mockResolvedValue({ ...status, configured: true, source: "environment", models: { ...fixedModels, text: "claude-cli:opus" }, textProvider: { kind: "claude-cli", model: "opus" } });
  await open();
  expect(screen.getByText("文字请求已配置为 Claude CLI（首次调用时验证）；OpenAI 图片 Key 已配置（环境变量）")).toBeVisible();
  expect(screen.queryByText(/尚未配置文字提供方/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("模型选择与连接详情"));
  expect(screen.getByText("文本模型：Claude CLI（opus）")).toBeVisible();
  expect(screen.queryByText("文本模型：gpt-5.6-terra")).not.toBeInTheDocument();
});

it("只有 OpenAI 图片 Key 时不会暗示 Claude CLI 已配置或授权", async () => {
  vi.mocked(getOpenAISettings).mockResolvedValue({ ...status, configured: true, source: "environment" });
  await open();
  expect(screen.getByText("OpenAI 文字与图片 Key 已配置（环境变量；首次制作时验证连接）")).toBeVisible();
  expect(screen.queryByText(/Claude CLI/)).not.toBeInTheDocument();
});

it("保存只提交 Key，旧浏览器模型偏好不会随请求传给服务端", async () => {
  await open();
  fireEvent.change(screen.getByLabelText("OpenAI API Key"), { target: { value: "sk-test_1234567890abcdef" } });
  fireEvent.submit(screen.getByLabelText("OpenAI API Key").closest("form")!);
  await waitFor(() => expect(saveOpenAIKey).toHaveBeenCalledExactlyOnceWith("sk-test_1234567890abcdef"));
  expect(await screen.findByRole("status")).toHaveTextContent("OpenAI 图片 Key 已保存；文字模型使用 gpt-5.6-terra，位图路线使用 gpt-image-2.5-sunburst");
});

it("即使旧服务状态报告其他模型，页面仍只声明固定生产模型", async () => {
  vi.mocked(getOpenAISettings).mockResolvedValue({ ...status, configured: true, source: "session", models: { text: "gpt-5.10", image: "gpt-image-3" } });
  await open();
  fireEvent.click(screen.getByText("模型选择与连接详情"));
  expect(screen.getByText("文本模型：gpt-5.6-terra")).toBeInTheDocument();
  expect(screen.getByText("图像模型：gpt-image-2.5-sunburst")).toBeInTheDocument();
  expect(screen.queryByText("gpt-5.10")).not.toBeInTheDocument();
});
