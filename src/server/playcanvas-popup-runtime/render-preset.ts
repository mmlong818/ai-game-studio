/**
 * 纸境 · 立体书迷宫的渲染预设（纸艺）。数值来自 docs/concepts/paper-popup/ART-SPEC.md §1/§3/§4：
 * 等角三分之一俯视、单主光 + 半球近似补光、PCF5 柔影、线性雾、ACES；后处理为 MSAA×4 + SSAO 接触阴影 + 轻 bloom + 暗角 + 高档移轴景深。
 * 章节色板（天空 / 雾 / 环境光 / 曝光 / 主光）在运行时按关卡用 engine.applyEnvironment 覆盖，预设只给第 1 章的起始值。
 */
import { defaultPerformanceProfiles, type RenderPreset } from "../../engine/playcanvas/render-presets.js";

export const paperRenderPreset: RenderPreset = {
  id: "papercraft-popup",
  name: "纸艺立体书",
  camera: { fov: 32, near: 0.1, far: 200, distance: 14 },
  environment: { sky: 0xf6eedc, fog: 0xf6eedc, ambient: 0x8f8a80, exposure: 1.0, fogNear: 2.2, fogFar: 4.5 },
  sun: { color: 0xfff1d2, intensity: 1.55, position: [-6, 12, 5], shadowBias: 0.12, normalOffsetBias: 0.04, shadowDistance: 60, penumbraSize: 6, shadowSamples: 12, shadowBlockerSamples: 8 },
  fill: { color: 0xeef4ff, intensity: 0.165, position: [6, 5, -7] },
  post: {
    sharpness: 0,
    // SSAO：纸层之间的接触阴影，让顶纸、层线与构件“压”在纸面上。
    ssao: { intensity: 0.55, radius: 5, samples: 12, power: 3, minAngle: 12, blur: true },
    // bloom 只给星与灯笼一点光晕。
    bloom: { intensity: 0.012, blurLevel: 14 },
    // 屏幕空间暗角：四角约 -12% 亮度（ART-SPEC §4）。
    vignette: { intensity: 0.16, inner: 0.55, outer: 1.25, curvature: 0.55 },
    // 高档：以书页为焦平面的景深，读出移轴摄影的“上下虚化”。
    dof: { nearBlur: true, rangeFactor: 0.62, blurRadius: 3.2, blurRings: 3, blurRingPoints: 3, highQuality: false },
  },
  // 三档：低档无阴影、无后处理、构件 ×0.4；中档 PCF5 柔影 + MSAA + SSAO；高档 2048 阴影贴图再加 bloom 与景深式移轴。
  performanceProfiles: defaultPerformanceProfiles,
};
