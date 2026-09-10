import { describe, expect, it } from "vitest";
import { assertAssetDeliveryMatchesRole, assetDeliveryForRole, assetDeliverySpecSchema } from "./assetDelivery";

describe("素材交付合同", () => {
  it("背景使用cover，主体使用透明contain", () => {
    expect(assetDeliveryForRole("background")).toMatchObject({ fit: "cover", background: "opaque", purpose: "environment" });
    expect(assetDeliveryForRole("player")).toMatchObject({ fit: "contain", background: "transparent", purpose: "subject" });
    expect(assetDeliveryForRole("interface")).toMatchObject({ fit: "contain", background: "transparent", purpose: "interface" });
  });

  it("拒绝客户端把背景声明成主体contain", () => {
    const invalid = assetDeliverySpecSchema.parse({ fit: "contain", background: "transparent", purpose: "subject", safeArea: "完整显示" });
    expect(() => assertAssetDeliveryMatchesRole("background", invalid)).toThrow(/交付规格/);
  });
});
