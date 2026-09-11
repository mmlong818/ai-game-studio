import { beforeEach, expect, it, vi } from "vitest";
import { confirmProjectRevision, pendingRevision, recoverPendingRevision } from "./project-revision";
import { getProjectRevision, submitProjectRevision } from "./api";
import type { Build } from "../shared/contracts";
vi.mock("./api", () => ({ getProjectRevision: vi.fn(), submitProjectRevision: vi.fn() }));
beforeEach(() => { vi.resetAllMocks(); localStorage.clear(); vi.mocked(getProjectRevision).mockResolvedValue(null); });
it("先持久化请求，再提交一次原子修改", async () => {
  vi.mocked(submitProjectRevision).mockImplementation(async (id, input) => {
    expect(pendingRevision(id)).toEqual(input);
    return { id: input.requestId, status: "queued" } as Build;
  });
  const build = await confirmProjectRevision("p1", "增加配对反馈", "gameplay");
  expect(build.status).toBe("queued");
  expect(pendingRevision("p1")).toBeNull();
  expect(submitProjectRevision).toHaveBeenCalledTimes(1);
});
it("多项计划一次确认只提交一个持久请求，并保留来源版本与全部资源目标", async () => {
  const plan = {
    sourceProjectId: "p1",
    sourceVersionId: "v3",
    content: "全部角色改为精灵动图，同时把技能墨量消耗减半",
    operations: [
      { scope: "assets" as const, content: "全部角色改为精灵动图", targets: [
        { file: "assets/hero.png", label: "主角", animation: "sprite-sheet" as const },
        { file: "assets/foe.png", label: "对手", animation: "sprite-sheet" as const },
      ] },
      { scope: "gameplay" as const, content: "把技能墨量消耗减半" },
    ],
  };
  vi.mocked(submitProjectRevision).mockImplementation(async (id, input) => {
    expect(id).toBe("p1");
    expect(pendingRevision(id)).toEqual(input);
    return { id: input.requestId, status: "queued" } as Build;
  });
  await confirmProjectRevision("p1", plan.content, plan);
  expect(submitProjectRevision).toHaveBeenCalledExactlyOnceWith("p1", expect.objectContaining({
    content: plan.content,
    revisionPlan: expect.objectContaining({ sourceVersionId: "v3", operations: expect.arrayContaining([
      expect.objectContaining({ scope: "gameplay" }),
      expect.objectContaining({ scope: "assets", targets: expect.arrayContaining([
        expect.objectContaining({ file: "assets/hero.png", animation: "sprite-sheet" }),
        expect.objectContaining({ file: "assets/foe.png", animation: "sprite-sheet" }),
      ]) }),
    ]) }),
  }));
});
it("响应丢失后只读恢复同一任务，不重复提交", async () => {
  vi.mocked(submitProjectRevision).mockRejectedValue(new Error("response lost"));
  await expect(confirmProjectRevision("p1", "增加配对反馈", "gameplay")).rejects.toThrow();
  const receipt = pendingRevision("p1")!;
  vi.mocked(getProjectRevision).mockResolvedValue({ id: receipt.requestId, status: "running" } as Build);
  expect((await recoverPendingRevision("p1"))?.id).toBe(receipt.requestId);
  expect(submitProjectRevision).toHaveBeenCalledTimes(1);
});
it("服务端尚无回执时不自动提交，明确再次确认复用原编号", async () => {
  vi.mocked(submitProjectRevision).mockRejectedValue(new Error("lost"));
  await expect(confirmProjectRevision("p1", "增加配对反馈", "visual-style")).rejects.toThrow();
  const receipt = pendingRevision("p1")!;
  expect(await recoverPendingRevision("p1")).toBeNull();
  expect(submitProjectRevision).toHaveBeenCalledTimes(1);
  await expect(confirmProjectRevision("p1", "增加配对反馈", "visual-style")).rejects.toThrow();
  expect(vi.mocked(submitProjectRevision).mock.calls[1][1].requestId).toBe(receipt.requestId);
  await expect(confirmProjectRevision("p1", "另一种修改请求", "visual-style")).rejects.toThrow(/上次修改/);
  expect(submitProjectRevision).toHaveBeenCalledTimes(2);
});
it("待确认请求的范围也不可被改写", async () => {
  vi.mocked(submitProjectRevision).mockRejectedValue(new Error("lost"));
  await expect(confirmProjectRevision("p1", "只替换主角图片", "assets")).rejects.toThrow();
  await expect(confirmProjectRevision("p1", "只替换主角图片", "gameplay")).rejects.toThrow(/上次修改/);
  expect(submitProjectRevision).toHaveBeenCalledTimes(1);
});
