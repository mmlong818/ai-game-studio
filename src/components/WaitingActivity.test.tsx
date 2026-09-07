import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { WaitingActivity } from "./WaitingActivity";
afterEach(() => vi.useRealTimers());
it("恢复页面以服务端开始时间计时，不把已运行任务重置为零", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T06:05:00Z"));
  const view = render(<WaitingActivity label="正在生成代码" startedAt="2026-09-06T06:02:00Z" />);
  expect(screen.getByText("本次制作已用 3 分 0 秒")).toBeInTheDocument();
  view.unmount();
  render(<WaitingActivity label="正在生成代码" startedAt="2026-09-06T06:02:00Z" />);
  expect(screen.getByText("本次制作已用 3 分 0 秒")).toBeInTheDocument();
});
it("显示真实页面等待时间，卸载后清理计时器，不伪造完成比例", () => {
  vi.useFakeTimers();
  const view = render(<WaitingActivity label="正在生成方案" />);
  expect(screen.getByRole("status")).toHaveTextContent("正在生成方案");
  act(() => vi.advanceTimersByTime(62000));
  expect(screen.getByText("本次页面等待 1 分 2 秒")).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  view.unmount();
  expect(vi.getTimerCount()).toBe(0);
});
