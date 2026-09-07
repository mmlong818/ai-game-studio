import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { Build, ProjectDetail } from "../shared/contracts";
import { PrivateGamePreview } from "./PrivateGamePreview";
import { PreviewPane } from "./ProjectStudio";
import { PreferencesProvider } from "./preferences";
import { getPlayableBuild } from "./api";
vi.mock("./api", () => ({ getPlayableBuild: vi.fn() }));
vi.mock("./SiteHeader", () => ({ SiteHeader: () => <header>应用导航</header> }));
const project = { id: "p1", title: "花园", spec: { aspectRatio: "9:16" }, publication: null } as unknown as ProjectDetail;
const success = { id: "b1", status: "succeeded", previewUrl: "http://127.0.0.1:4313/version/b1/" } as Build;
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.setItem("forge-locale", "zh-CN");
  vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
  vi.mocked(getPlayableBuild).mockResolvedValue(success);
});
it("未发布游戏只读取成功版本即可试玩", async () => {
  render(<PrivateGamePreview project={project} />);
  expect(await screen.findByTitle("花园试玩")).toHaveAttribute("src", success.previewUrl);
  expect(getPlayableBuild).toHaveBeenCalledWith("p1");
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});
it("没有成功版本不伪造试玩或启动制作", async () => {
  vi.mocked(getPlayableBuild).mockResolvedValue(null);
  render(<PrivateGamePreview project={project} />);
  expect(await screen.findByText(/还没有通过检查/)).toBeInTheDocument();
  expect(screen.queryByTitle("花园试玩")).not.toBeInTheDocument();
});
it("新版运行与失败仍保留旧成功版，成功后才切换", async () => {
  const view = render(<PreferencesProvider><PreviewPane project={project} build={{ id: "b2", status: "running" } as Build} /></PreferencesProvider>);
  const frame = await screen.findByTitle("花园试玩预览");
  expect(frame).toHaveAttribute("src", success.previewUrl);
  view.rerender(<PreferencesProvider><PreviewPane project={project} build={{ id: "b2", status: "failed" } as Build} /></PreferencesProvider>);
  expect(screen.getByText(/新版未完成/)).toBeInTheDocument();
  expect(frame).toHaveAttribute("src", success.previewUrl);
  view.rerender(<PreferencesProvider><PreviewPane project={project} build={{ ...success, id: "b2", previewUrl: "http://127.0.0.1:4313/version/b2/" }} /></PreferencesProvider>);
  await waitFor(() => expect(screen.getByTitle("花园试玩预览")).toHaveAttribute("src", "http://127.0.0.1:4313/version/b2/"));
});
