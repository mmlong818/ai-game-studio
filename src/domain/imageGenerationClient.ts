import { createGeneratedAsset } from "./assets";
import type { AssetGenerationRecord, AssetRole } from "./platformTypes";
import type { AssetDeliverySpec } from "./assetDelivery";

interface ImageGenerationResponse {
  model: string;
  provider: string;
  mimeType: AssetGenerationRecord["mimeType"];
  width: number;
  height: number;
  localPath: string;
  publicUrl: string;
  processing: string[];
  error?: string;
}

export async function generateProjectImage(
  input: { role: AssetRole; label: string; prompt: string; delivery: AssetDeliverySpec },
  existing: AssetGenerationRecord[],
  signal?: AbortSignal,
): Promise<{ asset: AssetGenerationRecord; publicUrl: string }> {
  const response = await fetch("/api/image-generation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  });
  const result = (await response.json()) as ImageGenerationResponse;
  if (!response.ok || result.error) throw new Error(result.error || "AI 图片生成失败");
  const asset = await createGeneratedAsset(
    {
      ...input,
      model: result.model,
      provider: result.provider,
      mimeType: result.mimeType,
      width: result.width,
      height: result.height,
      localPath: `assets/${result.localPath.split("/").pop() ?? `${input.role}.png`}`,
      processing: result.processing,
    },
    existing,
  );
  return { asset, publicUrl: result.publicUrl };
}
