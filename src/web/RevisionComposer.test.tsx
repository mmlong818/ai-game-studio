import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { RevisionComposer } from "./RevisionComposer";
import { planProjectRevision } from "./api";

vi.mock("./project-revision", () => ({ pendingRevision: () => null }));
vi.mock("./api", () => ({ planProjectRevision: vi.fn() }));

const plannedRevision = {
  status: "ready" as const,
  revisionPlan: {
    sourceProjectId: "p1",
    sourceVersionId: "v1",
    content: "全部角色改为精灵动图，同时把技能墨量消耗减半",
    operations: [
      { scope: "assets" as const, content: "全部角色改为精灵动图", targets: [
        { file: "assets/hero.png", label: "主角", animation: "sprite-sheet" as const },
        { file: "assets/foe.png", label: "对手", animation: "sprite-sheet" as const },
      ] },
      { scope: "gameplay" as const, content: "把技能墨量消耗减半" },
    ],
  },
  candidates: [
    { file: "assets/hero.png", label: "主角", kind: "role" as const, recommended: true, supportsAnimation: true },
    { file: "assets/foe.png", label: "对手", kind: "role" as const, recommended: true, supportsAnimation: true },
    { file: "assets/stage.png", label: "舞台背景", kind: "background" as const, recommended: false, supportsAnimation: false },
  ],
  recommendedTargetFiles: ["assets/hero.png", "assets/foe.png"],
};

beforeEach(() => {
  sessionStorage.clear();
  vi.mocked(planProjectRevision).mockResolvedValue(plannedRevision);
});

it("输入不会预检或提交；明确分析后默认保留全部推荐角色和多项操作", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  render(<RevisionComposer projectId="p1" disabled={false} working={false} onConfirm={onConfirm} />);
  await user.type(screen.getByRole("textbox"), plannedRevision.revisionPlan.content);
  expect(planProjectRevision).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "分析修改内容" }));
  await waitFor(() => expect(planProjectRevision).toHaveBeenCalledExactlyOnceWith("p1", plannedRevision.revisionPlan.content));
  expect(screen.getByRole("checkbox", { name: /主角/ })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /对手/ })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: /舞台背景/ })).not.toBeChecked();
  expect(screen.getByText("本次将提交 2 项修改，确认后才会制作一个新版本并使用模型用量。")).toBeInTheDocument();
  expect(onConfirm).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "确认修改，制作新版" }));
  await waitFor(() => expect(onConfirm).toHaveBeenCalledExactlyOnceWith(
    plannedRevision.revisionPlan.content,
    expect.objectContaining({
      operations: expect.arrayContaining([
        expect.objectContaining({ scope: "gameplay" }),
        expect.objectContaining({ scope: "assets", targets: expect.arrayContaining([
          expect.objectContaining({ file: "assets/hero.png", animation: "sprite-sheet" }),
          expect.objectContaining({ file: "assets/foe.png", animation: "sprite-sheet" }),
        ]) }),
      ]),
    }),
  ));
});

it("用户可以取消某一项和某个角色，且改字后不会自动重新预检或提交", async () => {
  const user = userEvent.setup();
  const onConfirm = vi.fn().mockResolvedValue(undefined);
  render(<RevisionComposer projectId="p1" disabled={false} working={false} onConfirm={onConfirm} />);
  await user.type(screen.getByRole("textbox"), plannedRevision.revisionPlan.content);
  await user.click(screen.getByRole("button", { name: "分析修改内容" }));
  await screen.findByText("已识别的修改项");
  await user.click(screen.getByRole("checkbox", { name: /玩法与数值/ }));
  await user.click(screen.getByRole("checkbox", { name: /对手/ }));
  await user.click(screen.getByRole("button", { name: "确认修改，制作新版" }));
  await waitFor(() => expect(onConfirm).toHaveBeenCalledExactlyOnceWith(
    plannedRevision.revisionPlan.content,
    expect.objectContaining({ operations: [expect.objectContaining({
      scope: "assets",
      targets: [expect.objectContaining({ file: "assets/hero.png" })],
    })] }),
  ));

  const second = vi.fn().mockResolvedValue(undefined);
  const view = render(<RevisionComposer projectId="p2" disabled={false} working={false} onConfirm={second} />);
  const input = within(view.container).getByRole("textbox");
  fireEvent.change(input, { target: { value: "先分析，再改字" } });
  await user.click(within(view.container).getByRole("button", { name: "分析修改内容" }));
  await waitFor(() => expect(planProjectRevision).toHaveBeenLastCalledWith("p2", "先分析，再改字"));
  fireEvent.change(input, { target: { value: "改完后需要再次分析" } });
  expect(within(view.container).queryByText("已识别的修改项")).not.toBeInTheDocument();
  expect(planProjectRevision).toHaveBeenCalledTimes(3);
  expect(second).not.toHaveBeenCalled();
});

it("确认尚未返回时双击只发一次，失败后保留已选计划和文字", async () => {
  const user = userEvent.setup();
  let reject!: (error: Error) => void;
  const onConfirm = vi.fn(() => new Promise<void>((_resolve, fail) => { reject = fail; }));
  render(<RevisionComposer projectId="p1" disabled={false} working={false} onConfirm={onConfirm} />);
  fireEvent.change(screen.getByRole("textbox"), { target: { value: plannedRevision.revisionPlan.content } });
  await user.click(screen.getByRole("button", { name: "分析修改内容" }));
  await screen.findByText("已识别的修改项");
  await user.dblClick(screen.getByRole("button", { name: "确认修改，制作新版" }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
  reject(new Error("lost response"));
  expect(await screen.findByRole("alert")).toHaveTextContent("lost response");
  expect(screen.getByRole("textbox")).toHaveValue(plannedRevision.revisionPlan.content);
});

it("正在制作时保留草稿但不能分析，且不同作品不共用草稿", () => {
  sessionStorage.setItem("studio-revision-draft:p1", "保留此修改草稿");
  const view = render(<RevisionComposer projectId="p1" disabled={false} working onConfirm={vi.fn()} />);
  expect(screen.getByRole("textbox")).toHaveValue("保留此修改草稿");
  expect(screen.getByRole("button", { name: "分析修改内容" })).toBeDisabled();
  view.unmount();
  render(<RevisionComposer projectId="p2" disabled={false} working={false} onConfirm={vi.fn()} />);
  expect(screen.getByRole("textbox")).toHaveValue("");
});
