import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ProjectCover } from "./ProjectCover";
afterEach(cleanup);
it("没有产物封面时不请求虚构的图片地址", () => {
  render(<ProjectCover src={null} alt="草稿封面" />);
  expect(document.querySelector("img")).toBeNull();
  expect(screen.getByText("封面暂不可用")).toBeVisible();
});
it("封面失败后显示占位而不是破图，新地址仍可加载", () => {
  const { rerender } = render(<ProjectCover src="/missing.png" alt="花园封面" />);
  fireEvent.error(screen.getByRole("img"));
  expect(screen.getByText("封面暂不可用")).toBeVisible();
  expect(document.querySelector("img")).toBeNull();
  rerender(<ProjectCover src="/new.png" alt="花园封面" />);
  expect(screen.getByRole("img")).toHaveAttribute("src", "/new.png");
});
