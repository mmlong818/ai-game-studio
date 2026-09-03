/**
 * 引擎层 · 渲染预设。bootstrap 运行时的全部数值（相机、主光 / 补光、环境、后处理、性能三档）都由预设提供；
 * 纸艺（纸境）只是其中一套预设，见 src/server/playcanvas-popup-runtime/render-preset.ts。
 * 预设以 JS 字面量（非 JSON）内嵌进产物脚本，保证 `tiltShift: true` 这类键名在脚本里可被静态探针读到。
 */

export type PerformanceProfile = {
  pixelRatio: number;
  shadows: boolean;
  shadowSize: number;
  shadowType: "pcf1" | "pcf5" | "pcss";
  post: boolean;
  samples: number;
  ssao: boolean;
  bloom: boolean;
  tiltShift: boolean;
  /** 装饰密度倍率（游戏自行解释）。 */
  decor: number;
  particles: boolean;
};

export type RenderPreset = {
  id: string;
  name: string;
  graphicsDevice?: Record<string, unknown>;
  camera: { fov: number; near: number; far: number; distance: number };
  environment: { sky: number; fog: number; ambient: number; exposure: number; fogNear: number; fogFar: number };
  sun: { color: number; intensity: number; position: [number, number, number]; shadowBias: number; normalOffsetBias: number; shadowDistance: number; penumbraSize: number; shadowSamples: number; shadowBlockerSamples: number };
  fill: { color: number; intensity: number; position: [number, number, number] };
  post: {
    sharpness: number;
    ssao: { intensity: number; radius: number; samples: number; power: number; minAngle: number; blur: boolean };
    bloom: { intensity: number; blurLevel: number };
    vignette: { intensity: number; inner: number; outer: number; curvature: number };
    dof: { nearBlur: boolean; rangeFactor: number; blurRadius: number; blurRings: number; blurRingPoints: number; highQuality: boolean };
  };
  performanceProfiles: Record<"low" | "medium" | "high", PerformanceProfile>;
};

export const defaultPerformanceProfiles: RenderPreset["performanceProfiles"] = {
  low: { pixelRatio: 1, shadows: false, shadowSize: 512, shadowType: "pcf1", post: false, samples: 1, ssao: false, bloom: false, tiltShift: false, decor: 0.4, particles: false },
  medium: { pixelRatio: 1.25, shadows: true, shadowSize: 1024, shadowType: "pcf5", post: true, samples: 4, ssao: true, bloom: false, tiltShift: false, decor: 1, particles: true },
  high: { pixelRatio: 1.5, shadows: true, shadowSize: 2048, shadowType: "pcf5", post: true, samples: 4, ssao: true, bloom: true, tiltShift: true, decor: 1, particles: true },
};

/** 干净的低多边形摄影棚：中性暖白、柔影、轻暗角，作为非纸艺游戏与示例的默认预设。 */
export const studioRenderPreset: RenderPreset = {
  id: "studio-lowpoly",
  name: "低多边形摄影棚",
  camera: { fov: 34, near: 0.1, far: 200, distance: 12 },
  environment: { sky: 0xe9eef3, fog: 0xe9eef3, ambient: 0x8b8f96, exposure: 1.0, fogNear: 2.2, fogFar: 4.5 },
  sun: { color: 0xfff3dd, intensity: 1.5, position: [-6, 12, 5], shadowBias: 0.12, normalOffsetBias: 0.04, shadowDistance: 60, penumbraSize: 6, shadowSamples: 12, shadowBlockerSamples: 8 },
  fill: { color: 0xdbe7ff, intensity: 0.18, position: [6, 5, -7] },
  post: {
    sharpness: 0,
    ssao: { intensity: 0.5, radius: 5, samples: 12, power: 3, minAngle: 12, blur: true },
    bloom: { intensity: 0.01, blurLevel: 14 },
    vignette: { intensity: 0.12, inner: 0.55, outer: 1.25, curvature: 0.55 },
    dof: { nearBlur: true, rangeFactor: 0.62, blurRadius: 3, blurRings: 3, blurRingPoints: 3, highQuality: false },
  },
  performanceProfiles: defaultPerformanceProfiles,
};

/** 把纯数据对象序列化成 JS 字面量（键不加引号）。只接受 JSON 可表达的值。 */
export function toJsLiteral(value: unknown, indent = ""): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return JSON.stringify(value).replaceAll("<", "\\u003c");
  if (Array.isArray(value)) return `[${value.map((item) => toJsLiteral(item, indent)).join(", ")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, v]) => v !== undefined);
    const inner = indent + "  ";
    return `{\n${entries.map(([key, v]) => `${inner}${/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : JSON.stringify(key)}: ${toJsLiteral(v, inner)}`).join(",\n")}\n${indent}}`;
  }
  throw new Error(`无法序列化为 JS 字面量：${typeof value}`);
}

/** game-manifest.json 里对外公开的性能档摘要（与历史合同一致，只暴露三个字段）。 */
export function manifestPerformanceProfiles(preset: RenderPreset) {
  return Object.fromEntries((["low", "medium", "high"] as const).map((tier) => {
    const profile = preset.performanceProfiles[tier];
    return [tier, { pixelRatio: profile.pixelRatio, shadows: profile.shadows, tiltShift: profile.tiltShift }];
  })) as Record<"low" | "medium" | "high", { pixelRatio: number; shadows: boolean; tiltShift: boolean }>;
}
