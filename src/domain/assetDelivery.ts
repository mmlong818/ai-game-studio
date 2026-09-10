import { z } from "zod";
import type { AssetRole } from "./platformTypes";

export const assetDeliverySpecSchema = z.object({
  fit: z.enum(["cover", "contain"]),
  background: z.enum(["opaque", "transparent"]),
  purpose: z.enum(["environment", "subject", "interface"]),
  safeArea: z.string().min(1).max(240),
});

export type AssetDeliverySpec = z.infer<typeof assetDeliverySpecSchema>;

const subjectRoles = new Set<AssetRole>(["player", "obstacle", "collectible", "effect"]);

export function assetDeliveryForRole(role: AssetRole): AssetDeliverySpec {
  if (role === "background") {
    return {
      fit: "cover",
      background: "opaque",
      purpose: "environment",
      safeArea: "中央玩法区保持低细节和足够对比；四周允许等比裁切，不承载文字、按钮或关键主体",
    };
  }
  if (role === "interface") {
    return {
      fit: "contain",
      background: "transparent",
      purpose: "interface",
      safeArea: "完整保留控件轮廓和透明边缘，缩小后仍可辨认；图片内不烘焙任何文字",
    };
  }
  if (subjectRoles.has(role)) {
    return {
      fit: "contain",
      background: "transparent",
      purpose: "subject",
      safeArea: "单一主体完整入画，四周保留透明呼吸空间，不裁切轮廓、动作或反馈边缘",
    };
  }
  throw new Error(`不支持的资源角色：${String(role)}`);
}

export function assertAssetDeliveryMatchesRole(role: AssetRole, delivery: AssetDeliverySpec): void {
  const expected = assetDeliveryForRole(role);
  if (delivery.fit !== expected.fit || delivery.background !== expected.background || delivery.purpose !== expected.purpose) {
    throw new Error(`资源交付规格与 ${role} 槽位不一致`);
  }
}
