// 引擎层 · 引导（浏览器运行时片段）：应用 / 画布 / 相机 / 主光与补光 / 环境光 / 雾与曝光 / 阴影 / 后处理 /
// 性能三档与自动降档 / 后台停渲染 / reduced-motion。所有数值来自渲染预设 preset（见 render-presets.ts），纸艺只是其中一套。
// hooks：{ onError, onTierChange(tier, profile), onResize({ width, height, aspect }), onVisibility(hidden), onSuspend(value) }

export function createEngineApp(pc, canvas, colorKit, preset, hooks) {
  const h = hooks || {};
  const reducedMotion = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let app;
  try {
    app = new pc.Application(canvas, { graphicsDeviceOptions: Object.assign({ antialias: true, alpha: false, depth: true, stencil: false, powerPreference: "high-performance", preferWebGl2: true }, preset.graphicsDevice || {}) });
  } catch (error) {
    if (h.onError) h.onError(error);
    throw error;
  }
  const device = app.graphicsDevice;
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.autoRender = false;
  app.scene.exposure = preset.environment.exposure === undefined ? 1 : preset.environment.exposure;
  app.scene.ambientLight = colorKit.pcColor(preset.environment.ambient);

  // ---- 相机 ----
  const camera = new pc.Entity("camera");
  camera.addComponent("camera", { fov: preset.camera.fov, nearClip: preset.camera.near, farClip: preset.camera.far, clearColor: colorKit.pcColor(preset.environment.sky), toneMapping: pc.TONEMAP_ACES });
  app.root.addChild(camera);
  let focusDistance = preset.camera.distance;

  // ---- 主光（投影）与补光（不投影，半球光的近似） ----
  const sunPreset = preset.sun;
  const sun = new pc.Entity("sun");
  sun.addComponent("light", { type: "directional", color: colorKit.pcColor(sunPreset.color), intensity: sunPreset.intensity, castShadows: true, shadowResolution: 1024, shadowType: pc.SHADOW_PCF5_32F, shadowBias: sunPreset.shadowBias, normalOffsetBias: sunPreset.normalOffsetBias, shadowDistance: sunPreset.shadowDistance, numCascades: 1, shadowUpdateMode: pc.SHADOWUPDATE_REALTIME, penumbraSize: sunPreset.penumbraSize, shadowSamples: sunPreset.shadowSamples, shadowBlockerSamples: sunPreset.shadowBlockerSamples });
  app.root.addChild(sun);
  const fillPreset = preset.fill;
  const fill = new pc.Entity("fill");
  fill.addComponent("light", { type: "directional", color: colorKit.pcColor(fillPreset.color), intensity: fillPreset.intensity, castShadows: false });
  fill.setPosition(fillPreset.position[0], fillPreset.position[1], fillPreset.position[2]); fill.lookAt(0, 0, 0); fill.rotateLocal(90, 0, 0);
  app.root.addChild(fill);
  function placeSun(radius) {
    const p = sunPreset.position;
    sun.setPosition(new pc.Vec3(p[0], p[1], p[2]).mulScalar(Math.max(1, (radius || 6) / 6))); sun.lookAt(0, 0, 0); sun.rotateLocal(90, 0, 0);
  }
  placeSun(6);

  // ---- 性能三档：起步档位由设备启发式决定；连续快帧升档（仅高配设备）、连续慢帧降档。软件渲染直接 low。 ----
  const deviceMemory = Number(navigator.deviceMemory || 4);
  const hardwareConcurrency = Number(navigator.hardwareConcurrency || 4);
  function softwareRenderer() {
    try { const gl = device.gl; const info = gl && gl.getExtension("WEBGL_debug_renderer_info"); const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ""; return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name); } catch { return false; }
  }
  const heuristicTier = softwareRenderer() || deviceMemory <= 2 || hardwareConcurrency <= 4 ? "low" : deviceMemory >= 8 && hardwareConcurrency >= 8 ? "high" : "medium";
  let performanceTier = heuristicTier === "low" ? "low" : "medium";
  let tierPromotionAllowed = heuristicTier === "high";
  const performanceProfiles = preset.performanceProfiles;

  // ---- 后处理（CameraFrame）：MSAA、SSAO 接触阴影、bloom、暗角、景深；参数来自 preset.post。 ----
  let cameraFrame = null;
  function applyPostProcessing(profile) {
    if (!profile.post) {
      if (cameraFrame) { cameraFrame.destroy(); cameraFrame = null; }
      camera.camera.toneMapping = pc.TONEMAP_ACES;
      return;
    }
    if (!cameraFrame) cameraFrame = new pc.CameraFrame(app, camera.camera);
    const frame = cameraFrame; const post = preset.post;
    frame.rendering.samples = profile.samples;
    frame.rendering.toneMapping = pc.TONEMAP_ACES;
    frame.rendering.sharpness = post.sharpness || 0;
    frame.ssao.type = profile.ssao ? pc.SSAOTYPE_LIGHTING : pc.SSAOTYPE_NONE;
    frame.ssao.intensity = post.ssao.intensity; frame.ssao.radius = post.ssao.radius; frame.ssao.samples = post.ssao.samples; frame.ssao.power = post.ssao.power; frame.ssao.minAngle = post.ssao.minAngle; frame.ssao.blurEnabled = post.ssao.blur;
    frame.bloom.intensity = profile.bloom ? post.bloom.intensity : 0; frame.bloom.blurLevel = post.bloom.blurLevel;
    frame.vignette.intensity = post.vignette.intensity; frame.vignette.inner = post.vignette.inner; frame.vignette.outer = post.vignette.outer; frame.vignette.curvature = post.vignette.curvature; frame.vignette.color = new pc.Color(0, 0, 0);
    frame.dof.enabled = Boolean(profile.tiltShift); frame.dof.nearBlur = post.dof.nearBlur; frame.dof.focusDistance = focusDistance; frame.dof.focusRange = focusDistance * post.dof.rangeFactor; frame.dof.blurRadius = post.dof.blurRadius; frame.dof.blurRings = post.dof.blurRings; frame.dof.blurRingPoints = post.dof.blurRingPoints; frame.dof.highQuality = Boolean(post.dof.highQuality);
    frame.taa.enabled = false;
    frame.update();
  }
  function applyPerformanceTier(nextTier) {
    performanceTier = nextTier;
    const profile = performanceProfiles[nextTier];
    device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, profile.pixelRatio);
    sun.light.castShadows = profile.shadows;
    sun.light.shadowResolution = profile.shadowSize;
    sun.light.shadowType = profile.shadowType === "pcss" ? pc.SHADOW_PCSS_32F : profile.shadowType === "pcf5" ? pc.SHADOW_PCF5_32F : pc.SHADOW_PCF1_32F;
    applyPostProcessing(profile);
    document.body.dataset.performanceTier = nextTier;
    resize();
    if (h.onTierChange) h.onTierChange(nextTier, profile);
  }
  function setPerformanceTier(tier) { if (performanceProfiles[tier]) { tierPromotionAllowed = false; applyPerformanceTier(tier); } return performanceTier; }
  // 帧预算：慢帧（> 26ms）连续 90 帧降一档；高配设备在中档连续 90 帧快帧（< 12ms）且游戏运行中时升到高档。
  let slowFrames = 0; let fastFrames = 0;
  function trackFrame(delta, running) {
    slowFrames = delta > 0.026 ? slowFrames + 1 : Math.max(0, slowFrames - 2);
    if (slowFrames > 90 && performanceTier !== "low") { applyPerformanceTier(performanceTier === "high" ? "medium" : "low"); slowFrames = 0; tierPromotionAllowed = false; return; }
    fastFrames = delta < 0.012 ? fastFrames + 1 : 0;
    if (tierPromotionAllowed && performanceTier === "medium" && fastFrames > 90 && running) { tierPromotionAllowed = false; applyPerformanceTier("high"); }
  }

  // ---- 环境：天空 / 雾 / 环境光 / 曝光 / 主光补光颜色强度，可按章节色板整体切换。 ----
  function applyEnvironment(env) {
    if (env.sky !== undefined) camera.camera.clearColor = colorKit.pcColor(env.sky);
    app.scene.fog.type = pc.FOG_LINEAR;
    if (env.fog !== undefined) app.scene.fog.color = colorKit.pcColor(env.fog);
    if (env.ambient !== undefined) app.scene.ambientLight = colorKit.pcColor(env.ambient);
    if (env.exposure !== undefined) app.scene.exposure = env.exposure;
    if (env.sunColor !== undefined) sun.light.color = colorKit.pcColor(env.sunColor);
    if (env.sunIntensity !== undefined) sun.light.intensity = env.sunIntensity;
    if (env.fillColor !== undefined) fill.light.color = colorKit.pcColor(env.fillColor);
    if (env.fillIntensity !== undefined) fill.light.intensity = env.fillIntensity;
  }
  function setFog(start, end) { app.scene.fog.start = start; app.scene.fog.end = end; }
  // 焦平面：景深以此为中心；顺带按预设比例设置雾的起止。
  function setFocus(distance) {
    focusDistance = distance;
    setFog(distance * preset.environment.fogNear, distance * preset.environment.fogFar);
    if (cameraFrame) { cameraFrame.dof.focusDistance = distance; cameraFrame.dof.focusRange = distance * preset.post.dof.rangeFactor; cameraFrame.update(); }
  }

  // ---- 画布分辨率与后台停渲染 ----
  let aspect = 1;
  function resize() {
    const width = Math.max(1, canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, canvas.clientHeight || window.innerHeight);
    app.setCanvasResolution(pc.RESOLUTION_FIXED, width, height);
    aspect = width / Math.max(1, height);
    if (h.onResize) h.onResize({ width, height, aspect });
  }
  window.addEventListener("resize", resize);
  let renderSuspended = document.hidden;
  let renderCount = 0;
  const updateCallbacks = [];
  function onUpdate(callback) { updateCallbacks.push(callback); }
  // 渲染节奏由引擎层控制：后台 / 探针挂起时既不推进逻辑也不渲染（renderCount 不再增长）。
  app.on("update", (dt) => {
    if (renderSuspended) return;
    updateCallbacks.forEach((callback) => callback(dt));
    app.renderNextFrame = true;
    renderCount += 1;
  });
  function suspend(value) {
    renderSuspended = value === undefined ? true : Boolean(value);
    if (h.onSuspend) h.onSuspend(renderSuspended);
  }
  document.addEventListener("visibilitychange", () => {
    renderSuspended = document.hidden;
    if (h.onSuspend) h.onSuspend(renderSuspended);
    if (h.onVisibility) h.onVisibility(document.hidden);
  });

  return {
    app, device, camera, sun, fill, reducedMotion, performanceProfiles, heuristicTier,
    get tier() { return performanceTier; },
    get profile() { return performanceProfiles[performanceTier]; },
    get cameraFrame() { return cameraFrame; },
    get aspect() { return aspect; },
    get suspended() { return renderSuspended; },
    get renderCount() { return renderCount; },
    get focusDistance() { return focusDistance; },
    applyPerformanceTier, setPerformanceTier, trackFrame, applyPostProcessing, applyEnvironment, setFog, setFocus, placeSun, resize, onUpdate, suspend,
    start() { applyPerformanceTier(performanceTier); resize(); app.start(); },
    postProcessingState() { return cameraFrame ? { ssao: cameraFrame.ssao.type, bloom: cameraFrame.bloom.intensity, dof: cameraFrame.dof.enabled, samples: cameraFrame.rendering.samples } : null; },
  };
}
