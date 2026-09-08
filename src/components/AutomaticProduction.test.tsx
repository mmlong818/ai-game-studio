import { StrictMode } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { AutomaticProduction } from "./AutomaticProduction";
import { INITIAL_DRAFT } from "../domain/storage";
import * as api from "../web/api";
vi.mock("../web/api", () => ({ submitProduction: vi.fn(), getProductionJob: vi.fn(), watchProductionJob: vi.fn(), getProject: vi.fn(), startBuild: vi.fn(), getLatestBuild: vi.fn(), retryProduction: vi.fn() }));
const build = { id: "b1", status: "succeeded", steps: [{ id: "s1", title: "准备资源", detail: "制作游戏图片", status: "succeeded" }] } as any;

it("技术校验错误默认说人话，保留详情且不重新提交", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({ ...build, status: "failed", error: '[{"code":"too_big","path":["vision"]}]' });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("制作资料未通过检查");
  expect(screen.getByText("查看问题详情").closest("details")).not.toHaveAttribute("open");
  expect(api.submitProduction).not.toHaveBeenCalled();
});

it("已有服务端任务通过流接收过程，不重复提交", async () => {
  history.replaceState(null, "", "/create?production=p1");
  const task = { id: "p1", status: "creating" as const, error: null };
  vi.mocked(api.getProductionJob).mockResolvedValue(task);
  vi.mocked(api.watchProductionJob).mockImplementation(async (_id, _signal, update) => {
    update({ ...task, status: "building" }, build);
  });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText("准备资源");
  expect(api.watchProductionJob).toHaveBeenCalledTimes(1);
  expect(api.submitProduction).not.toHaveBeenCalled();
});
beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear(); history.replaceState(null, "", "/create");
  vi.mocked(api.submitProduction).mockResolvedValue({ id: "p1" } as any);
  vi.mocked(api.getProductionJob).mockResolvedValue(null);
  vi.mocked(api.getLatestBuild).mockResolvedValue(build);
});
it("确认后仅启动一次，展示过程而不是操作入口", async () => {
  render(<StrictMode><AutomaticProduction draft={INITIAL_DRAFT} confirmedPlan="确认的实时游戏方案，新手引导先教会操作。" /></StrictMode>);
  await screen.findByText("准备资源");
  expect(api.submitProduction).toHaveBeenCalledTimes(1);
  expect(api.startBuild).not.toHaveBeenCalled();
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "继续完善这个游戏" })).toHaveAttribute("href", "/projects/p1");
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  expect(screen.queryByTitle("游戏试玩")).not.toBeInTheDocument();
});
it.each(["queued", "running", "succeeded", "failed"])("%s 状态刷新不会发起制作；只有失败后才出现明确的重新制作按钮", async status => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({ ...build, status, error: status === "failed" ? "模型失败" : null });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText("准备资源");
  if (status === "failed") expect(screen.getByRole("button", { name: "重新制作这个游戏" })).toBeEnabled();
  else expect(screen.queryByRole("button")).not.toBeInTheDocument();
  if (status === "succeeded") expect(screen.getByRole("link", { name: "继续完善这个游戏" })).toBeInTheDocument();
  else if (status === "failed") expect(screen.getByRole("link", { name: "查看已保存的项目与问题" })).toHaveAttribute("href", "/projects/p1");
  else expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(api.submitProduction).not.toHaveBeenCalled();
  expect(api.startBuild).not.toHaveBeenCalled();
});

it("创建失败保留真实错误，不生成不存在项目的恢复地址", async () => {
  vi.mocked(api.submitProduction).mockRejectedValue(new Error("方案校验未通过"));
  render(<AutomaticProduction draft={INITIAL_DRAFT} confirmedPlan="用户确认的完整方案" />);
  expect(await screen.findByRole("alert")).toHaveTextContent("方案校验未通过");
  expect(location.search).toBe("");
  expect(api.startBuild).not.toHaveBeenCalled();
  expect(screen.queryByText(/项目已保存/)).not.toBeInTheDocument();
});

it("任务为空时核实项目，不把不存在的项目显示成已保存", async () => {
  history.replaceState(null, "", "/create?production=missing");
  vi.mocked(api.getLatestBuild).mockResolvedValue(null);
  vi.mocked(api.getProject).mockRejectedValue(new Error("项目不存在。"));
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("项目不存在");
  expect(screen.queryByText(/已确认项目存在/)).not.toBeInTheDocument();
  expect(api.startBuild).not.toHaveBeenCalled();
});

it("接受响应丢失后刷新恢复同一回执，不重新付费提交", async () => {
  vi.mocked(api.submitProduction).mockRejectedValue(new Error("网络响应中断"));
  const mounted = render(<AutomaticProduction draft={INITIAL_DRAFT} confirmedPlan="用户确认的完整方案" />);
  await screen.findByRole("alert");
  const receipt = vi.mocked(api.submitProduction).mock.calls[0][0].requestId;
  expect(localStorage.getItem("studio-pending-production-v1")).toBe(receipt);
  mounted.unmount();
  vi.mocked(api.getProductionJob).mockResolvedValue({ id: receipt!, status: "building", error: null });
  vi.mocked(api.watchProductionJob).mockImplementation(async (_id, _signal, update) => update({ id: receipt!, status: "building", error: null }, build));
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText("准备资源");
  expect(api.getProductionJob).toHaveBeenLastCalledWith(receipt);
  expect(api.submitProduction).toHaveBeenCalledTimes(1);
});

it("完成后直接提供隔离试玩，不添加再次制作入口", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({ ...build, previewUrl: "http://127.0.0.1:4313/version/p1/v1/" });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  const frame = await screen.findByTitle("游戏试玩");
  expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-same-origin");
  expect(frame).toHaveAttribute("src", "http://127.0.0.1:4313/version/p1/v1/");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("不嵌入工作台同源或脚本地址", async () => {
  history.replaceState(null, "", "/create?production=p1");
  vi.mocked(api.getLatestBuild).mockResolvedValue({ ...build, previewUrl: location.origin + "/version/p1/v1/" });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText("准备资源");
  expect(screen.queryByTitle("游戏试玩")).not.toBeInTheDocument();
});

it("创建阶段失败后提供同方案重试，成功后切换到新任务且不重新策划", async () => {
  history.replaceState(null, "", "/create?production=p1");
  const failed = { id: "p1", status: "failed" as const, error: "普通项目设计合同不完整：ID 重复：3", events: [] };
  vi.mocked(api.getProductionJob).mockImplementation(async id => id === "p1" ? failed : { id: "p2", status: "queued" as const, error: null, events: [] });
  vi.mocked(api.watchProductionJob).mockImplementation(async (id, _signal, update) => { if (id === "p2") update({ id: "p2", status: "creating", error: null }, null); });
  vi.mocked(api.retryProduction).mockResolvedValue({ id: "p2", status: "queued", error: null });
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  const button = await screen.findByRole("button", { name: "用同一方案重新制作" });
  expect(screen.queryByText(/查看已保存的项目/)).not.toBeInTheDocument();
  button.click();
  await screen.findByText(/服务端已接收|正在提交|等待开始处理/);
  expect(api.retryProduction).toHaveBeenCalledWith("p1");
  expect(api.submitProduction).not.toHaveBeenCalled();
  expect(new URLSearchParams(location.search).get("production")).toBe("p2");
});

it("构建失败（项目已存在）不重新创建项目，而是在同一项目上重新制作，且只在用户点击后开始", async () => {
  history.replaceState(null, "", "/create?production=p1");
  const queued = { ...build, id: "b2", status: "queued", error: null, projectId: "p1", steps: [{ ...build.steps[0], status: "pending" }] };
  // 点击前读到的是失败记录；点击后服务端返回新排队的构建，后续轮询也读到它。
  vi.mocked(api.getLatestBuild).mockResolvedValueOnce({ ...build, status: "failed", error: "浏览器验收未通过", projectId: "p1" }).mockResolvedValue(queued);
  vi.mocked(api.startBuild).mockResolvedValue(queued);
  render(<AutomaticProduction draft={INITIAL_DRAFT} />);
  await screen.findByText(/查看已保存的项目/);
  expect(screen.queryByRole("button", { name: "用同一方案重新制作" })).not.toBeInTheDocument();
  expect(api.startBuild).not.toHaveBeenCalled();
  screen.getByRole("button", { name: "重新制作这个游戏" }).click();
  await screen.findAllByText(/正在排队制作|正在等待服务端响应|服务端正在处理/);
  expect(api.startBuild).toHaveBeenCalledTimes(1);
  expect(api.startBuild).toHaveBeenCalledWith("p1");
  expect(api.submitProduction).not.toHaveBeenCalled();
  expect(screen.queryByRole("button", { name: "重新制作这个游戏" })).not.toBeInTheDocument();
});
