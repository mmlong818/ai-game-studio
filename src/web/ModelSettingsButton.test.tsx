import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ModelSettingsButton } from "./ModelSettingsButton";
import { getOpenAISettings, saveOpenAIKey } from "./api";

vi.mock("./api", () => ({ getOpenAISettings: vi.fn(), saveOpenAIKey: vi.fn(), clearOpenAIKey: vi.fn() }));
vi.mock("./preferences", () => ({ usePreferences: () => ({ t: (key: string) => key }) }));

const fixedModels = { text: "gpt-5.6-terra", image: "gpt-image-2.5-sunburst" };
const status = { provider: "openai" as const, configured: false, source: null, models: fixedModels };

beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
  vi.mocked(getOpenAISettings).mockResolvedValue(status);
  vi.mocked(saveOpenAIKey).mockResolvedValue({ ...status, configured: true, source: "session", models: fixedModels });
});
afterEach(cleanup);

async function open() {
  render(<ModelSettingsButton />);
  fireEvent.click(screen.getByRole("button", { name: "models.trigger" }));
  await waitFor(() => expect(screen.getByLabelText("models.keyLabel")).toBeEnabled());
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

it("保存只提交 Key，旧浏览器模型偏好不会随请求传给服务端", async () => {
  await open();
  fireEvent.change(screen.getByLabelText("models.keyLabel"), { target: { value: "sk-test_1234567890abcdef" } });
  fireEvent.submit(screen.getByLabelText("models.keyLabel").closest("form")!);
  await waitFor(() => expect(saveOpenAIKey).toHaveBeenCalledExactlyOnceWith("sk-test_1234567890abcdef"));
  expect(await screen.findByRole("status")).toHaveTextContent("密钥已保存；首次制作时固定使用 gpt-5.6-terra 和 gpt-image-2.5-sunburst");
});

it("即使旧服务状态报告其他模型，页面仍只声明固定生产模型", async () => {
  vi.mocked(getOpenAISettings).mockResolvedValue({ ...status, configured: true, source: "session", models: { text: "gpt-5.10", image: "gpt-image-3" } });
  await open();
  fireEvent.click(screen.getByText("模型选择与连接详情"));
  expect(screen.getByText("文本模型：gpt-5.6-terra")).toBeInTheDocument();
  expect(screen.getByText("图像模型：gpt-image-2.5-sunburst")).toBeInTheDocument();
  expect(screen.queryByText("gpt-5.10")).not.toBeInTheDocument();
});
