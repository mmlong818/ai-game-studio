import { afterEach, expect, it, vi } from "vitest";
import { generateDesignPreview, getLatestBuild } from "./api";
import { INITIAL_DRAFT } from "../domain/storage";
import { StudioApiError } from "./failure";

afterEach(() => vi.unstubAllGlobals());

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
    await generateDesignPreview({ ...INITIAL_DRAFT, idea: "测试用的方案" }, new AbortController().signal, () => {});
    throw new Error("expected request to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(StudioApiError);
    const failure = error as StudioApiError;
    expect(failure.message).toBe("方案生成服务响应超时。");
    expect(failure.message).not.toContain("provider body");
    expect(failure.failureDetails).toEqual([expect.objectContaining({ code: "DESIGN_TIMEOUT", retryable: true })]);
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
