import { afterEach, expect, it, vi } from "vitest";
import { createProject, generateDesignPreview, getLatestBuild, planProjectRevision } from "./api";
import { StudioApiError } from "./failure";

afterEach(() => vi.unstubAllGlobals());

it("新游戏未明确选择画幅时在发出网络请求前停止", async () => {
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  await expect(createProject({ idea: "制作一个收集星星并躲避障碍，集满十颗后获胜的小游戏。" })).rejects.toThrow(/必须明确选择/);
  expect(request).not.toHaveBeenCalled();
});

it("保留服务端安全失败详情，且不使用未受信任的 error 文本", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status: 429,
    text: async () => JSON.stringify({
      error: "provider payload that must never be shown",
      failure: {
        stage: "asset", category: "rate-limit", code: "IMAGE_RATE_LIMIT",
        message: "图像服务暂时限流，未开始下一张资源。",
        nextStep: "稍后手动重新制作，或先保留当前成功版本。",
        retryable: true, resource: { file: "assets/hero.png", label: "主角" }, httpStatus: 429,
      },
    }),
  }));
  try {
    await getLatestBuild("project-1");
    throw new Error("expected request to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(StudioApiError);
    const failure = error as StudioApiError;
    expect(failure.message).toBe("图像服务暂时限流，未开始下一张资源。");
    expect(failure.message).not.toContain("provider payload");
    expect(failure.failureDetails).toEqual([expect.objectContaining({ code: "IMAGE_RATE_LIMIT", resource: { file: "assets/hero.png", label: "主角" } })]);
  }
});

it("流式方案预览保留安全失败详情并丢弃未受信任错误文本", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status: 408,
    json: async () => ({
      error: "provider body that must never be shown",
      failureDetails: [{
        stage: "design", category: "timeout", code: "DESIGN_TIMEOUT",
        message: "方案生成服务响应超时。", nextStep: "确认服务恢复后，手动重新生成方案。", retryable: true,
      }],
    }),
  }));
  try {
    await generateDesignPreview({ idea: "测试用的完整游戏方案，玩家收集星星后获胜", aspectRatio: "1:1" }, new AbortController().signal, () => {});
    throw new Error("expected request to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(StudioApiError);
    const failure = error as StudioApiError;
    expect(failure.message).toBe("方案生成服务响应超时。");
    expect(failure.message).not.toContain("provider body");
    expect(failure.failureDetails).toEqual([expect.objectContaining({ code: "DESIGN_TIMEOUT", retryable: true })]);
  }
});

it.each([
  ["REFERENCE_EVIDENCE_REQUIRED", "暂未取得足够的公开玩法资料", "重新获取参考资料", true],
  ["REFERENCE_GAMEPLAY_UNVERIFIED", "尚未确认参考游戏的实际玩法", "填写你了解的玩法", false],
  ["DESIGN_PROFILE_INCOMPLETE", "参考方案整理未完成", "重新生成方案", true],
])("流式方案错误 %s 映射为可操作说明且不泄露字段路径", async (code, message, nextStep, retryable) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ type: "error", code, error: "core_loop too_small path[0] provider output" }) + "\n",
    { status: 200, headers: { "Content-Type": "application/x-ndjson" } },
  )));
  try {
    await generateDesignPreview({ idea: "我想复制这个游戏 https://example.com/game", aspectRatio: "16:9" }, new AbortController().signal, () => {});
    throw new Error("expected request to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(StudioApiError);
    const failure = error as StudioApiError;
    expect(failure.message).toContain(message);
    expect(failure.message).not.toContain("core_loop");
    expect(failure.failureDetails).toEqual([expect.objectContaining({ code, nextStep: expect.stringContaining(nextStep), retryable })]);
  }
});

it("连接不上本机制作服务时返回可解释且可手动重试的安全详情", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("browser network internals")));
  try {
    await getLatestBuild("project-1");
    throw new Error("expected request to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(StudioApiError);
    const failure = error as StudioApiError;
    expect(failure.message).toBe("无法连接本机制作服务。");
    expect(failure.message).not.toContain("browser network internals");
    expect(failure.failureDetails).toEqual([expect.objectContaining({ stage: "unknown", category: "network", retryable: true })]);
  }
});

it("资源选择预检的 409 会保留为可选择的计划，而不是通用请求失败", async () => {
  const selectionRequired = {
    status: "selection-required",
    revisionPlan: {
      sourceProjectId: "0822f4c4-51a8-4d90-bceb-009b365e2572",
      sourceVersionId: "version-current",
      content: "心卡改为精灵动图",
      operations: [],
    },
    candidates: [{
      file: "assets/tiles-v2/heart.png", label: "心卡", kind: "other",
      recommended: false, supportsAnimation: false,
    }],
    recommendedTargetFiles: [],
  };
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: false,
    status: 409,
    text: async () => JSON.stringify(selectionRequired),
  }));

  await expect(planProjectRevision(selectionRequired.revisionPlan.sourceProjectId, selectionRequired.revisionPlan.content))
    .resolves.toEqual(selectionRequired);
  expect(fetch).toHaveBeenCalledWith(
    "/api/projects/0822f4c4-51a8-4d90-bceb-009b365e2572/revisions/plan",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ content: "心卡改为精灵动图" }) }),
  );
});
