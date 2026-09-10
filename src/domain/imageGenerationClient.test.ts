import { afterEach, describe, expect, it, vi } from "vitest";
import { assetDeliveryForRole } from "./assetDelivery";
import { generateProjectImage } from "./imageGenerationClient";

describe("遗留创作入口的图片请求", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("把结构化交付合同传给本地runner并保存实际返回尺寸", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({
      model: "gpt-image-2",
      provider: "openai",
      mimeType: "image/png",
      width: 604,
      height: 512,
      localPath: "generated/player-1.png",
      publicUrl: "/generated/player-1.png",
      processing: ["delivery-contain", "transparent-trim"],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const delivery = assetDeliveryForRole("player");

    const result = await generateProjectImage({ role: "player", label: "小船", prompt: "一艘清晰的小船主体", delivery }, []);

    const request = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit).body));
    expect(request.delivery).toEqual(delivery);
    expect(result.asset.delivery).toEqual(delivery);
    expect([result.asset.width, result.asset.height]).toEqual([604, 512]);
  });
});
