import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { ModelSettingsButton } from "./ModelSettingsButton";
import { getOpenAISettings, getOpenAIModels, saveOpenAIKey } from "./api";
vi.mock("./api", () => ({ getOpenAISettings: vi.fn(), getOpenAIModels: vi.fn(), saveOpenAIKey: vi.fn(), clearOpenAIKey: vi.fn() }));
vi.mock("./preferences", () => ({ usePreferences: () => ({ t: translate }) }));
const translate = (key: string) => key;
const status = {provider:"openai" as const,configured:false,source:null,models:{text:"gpt-5.6",image:"gpt-image-2"}};
const catalog = {text:[{id:"gpt-5.10",created:2},{id:"gpt-5.9",created:1}],image:[{id:"gpt-image-3",created:2}],recommended:{text:"gpt-5.10",image:"gpt-image-3"}};
beforeEach(() => {
  vi.clearAllMocks();
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); this.dispatchEvent(new Event("close")); };
  vi.mocked(getOpenAISettings).mockResolvedValue(status);
  vi.mocked(getOpenAIModels).mockResolvedValue(catalog);
  vi.mocked(saveOpenAIKey).mockResolvedValue({...status,configured:true,source:"session",models:{text:"gpt-5.9",image:"gpt-image-3"}});
});
afterEach(cleanup);
it("首先展示连接输入，模型调整默认收起且不自动保存", async () => {
  await open();
  const options = screen.getByText("模型选择与连接详情（可选）").closest("details");
  expect(options).not.toHaveAttribute("open");
  expect(screen.getByText("尚未连接，请先填写 Key")).toBeVisible();
  expect(screen.getByLabelText("models.keyLabel").compareDocumentPosition(options!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(saveOpenAIKey).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("模型选择与连接详情（可选）"));
  expect(options).toHaveAttribute("open");
});
async function open() { render(<ModelSettingsButton/>); fireEvent.click(screen.getByRole("button",{name:"models.trigger"})); await waitFor(()=>expect(screen.getByLabelText("models.keyLabel")).toBeEnabled()); }
it("输入 Key 自动查询、预选推荐项，用户调整后一起保存", async()=>{
  await open(); fireEvent.change(screen.getByLabelText("models.keyLabel"),{target:{value:"sk-test_1234567890abcdef"}});
  await waitFor(()=>expect(screen.getByLabelText("文本 / 游戏设计")).toHaveValue("gpt-5.10"));
  expect(getOpenAIModels).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText("文本 / 游戏设计"),{target:{value:"gpt-5.9"}});
  fireEvent.click(screen.getByRole("button",{name:"models.save"}));
  await waitFor(()=>expect(saveOpenAIKey).toHaveBeenCalledWith("sk-test_1234567890abcdef",{text:"gpt-5.9",image:"gpt-image-3"}));
});
it("无需等待自动查询按钮，直接保存交给后端完成默认选择", async()=>{
  await open(); fireEvent.change(screen.getByLabelText("models.keyLabel"),{target:{value:"sk-test_1234567890abcdef"}});
  fireEvent.click(screen.getByRole("button",{name:"models.save"}));
  await waitFor(()=>expect(saveOpenAIKey).toHaveBeenCalledWith("sk-test_1234567890abcdef",undefined));
});

it("换 Key 后忽略旧请求的迟到响应", async()=>{
  let finishOld!: (value: typeof catalog) => void;
  vi.mocked(getOpenAIModels).mockImplementationOnce(()=>new Promise(resolve=>{finishOld=resolve;}));
  await open();
  fireEvent.change(screen.getByLabelText("models.keyLabel"),{target:{value:"sk-first_1234567890abcdef"}});
  await waitFor(()=>expect(getOpenAIModels).toHaveBeenCalledTimes(1));
  fireEvent.change(screen.getByLabelText("models.keyLabel"),{target:{value:"sk-second_1234567890abcdef"}});
  await waitFor(()=>expect(screen.getByLabelText("文本 / 游戏设计")).toHaveValue("gpt-5.10"));
  finishOld({...catalog,text:[{id:"gpt-5.8",created:0}],recommended:{...catalog.recommended,text:"gpt-5.8"}});
  await waitFor(()=>expect(screen.getByLabelText("文本 / 游戏设计")).toHaveValue("gpt-5.10"));
});

it("只展示服务器确认的模型分工，未保存选择不预告生效", async()=>{
  const configured = {...status, configured:true, source:"session" as const, models:{text:"gpt-5.9",image:"gpt-image-3"}, textRouting:{
    planner:"gpt-5.9", executor:"gpt-5.9", reviewer:"gpt-5.9", mode:"same-model" as const, reason:"catalog-unavailable" as const,
  }};
  vi.mocked(getOpenAISettings).mockResolvedValue(configured);
  vi.mocked(saveOpenAIKey).mockResolvedValue({...configured, models:{text:"gpt-5.10",image:"gpt-image-3"}, textRouting:{
    planner:"gpt-5.10", executor:"gpt-5.9", reviewer:"gpt-5.10", mode:"split", reason:"catalog-route",
  }});
  await open();
  expect(screen.getByLabelText("当前文本模型分工")).toHaveTextContent("规划与验收：gpt-5.9；代码生成：gpt-5.9");
  expect(screen.getByLabelText("当前文本模型分工")).toHaveTextContent("尚无当前密钥的已验证模型目录，暂用同一模型");
  await waitFor(()=>expect(screen.getByLabelText("文本 / 游戏设计")).toHaveValue("gpt-5.9"));
  fireEvent.change(screen.getByLabelText("文本 / 游戏设计"),{target:{value:"gpt-5.10"}});
  expect(screen.getByLabelText("当前文本模型分工")).toHaveTextContent("规划与验收：gpt-5.9；代码生成：gpt-5.9");
  fireEvent.click(screen.getByRole("button",{name:"models.save"}));
  await waitFor(()=>expect(screen.getByLabelText("当前文本模型分工")).toHaveTextContent("规划与验收：gpt-5.10；代码生成：gpt-5.9"));
  expect(screen.getByLabelText("当前文本模型分工")).toHaveTextContent("已按模型能力分工");
});

it("刷新目录后读取服务器最新路由，并提示已选规划模型失效", async()=>{
  const initial = {...status, configured:true, source:"session" as const, models:{text:"gpt-5.9",image:"gpt-image-3"}, textRouting:{
    planner:"gpt-5.9", executor:"gpt-5.9", reviewer:"gpt-5.9", mode:"same-model" as const, reason:"catalog-unavailable" as const,
  }};
  const refreshed = {...initial, textRouting:{...initial.textRouting, reason:"planner-unavailable" as const}};
  vi.mocked(getOpenAISettings).mockResolvedValueOnce(initial).mockResolvedValue(refreshed);
  await open();
  expect(screen.getByLabelText("当前文本模型分工")).toHaveTextContent("尚无当前密钥的已验证模型目录");
  await waitFor(()=>expect(screen.getByLabelText("当前文本模型分工")).toHaveTextContent("所选规划模型已不可用，请重新选择并保存"));
  expect(getOpenAIModels).toHaveBeenCalledTimes(1);
  expect(getOpenAISettings).toHaveBeenCalledTimes(2);
});
