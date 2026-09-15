import { describe, expect, it } from "vitest";
import { isPreDispatchNetworkFailure, waitForTransientRetry } from "./transient-retry.js";

describe("transient provider retry", () => {
  it("只把明确的连接前错误视为安全重放", () => {
    expect(isPreDispatchNetworkFailure(Object.assign(new Error("dns"), { code: "EAI_AGAIN" }))).toBe(true);
    expect(isPreDispatchNetworkFailure(new TypeError("socket closed after dispatch"))).toBe(false);
  });

  it("退避等待尊重取消", async () => {
    const controller = new AbortController();
    const waiting = waitForTransientRetry(1, controller.signal, new Response(null, { headers: { "retry-after": "5" } }));
    controller.abort(new DOMException("stop", "AbortError"));
    await expect(waiting).rejects.toMatchObject({ name: "AbortError" });
  });
});
