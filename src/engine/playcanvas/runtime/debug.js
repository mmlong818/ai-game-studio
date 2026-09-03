// 引擎层 · 调试接口（浏览器运行时片段）：`__GAME_DEBUG__` 的通用骨架。
// core: { state, engine (createEngineApp 句柄), getState() → 游戏专属字段, restart(), control(action), setBeatMs?(value), tickNow?(), engineHandles?() }
// 通用字段：state / getState / suspend / restart / control / setPerformanceTier / setBeatMs / tickNow / engine；游戏专属字段经 extensions 注入（可覆盖通用实现）。
// 仅在 URL 带 ?probe 时挂到 window，避免正式玩家误触。

export function createDebugApi(core, extensions) {
  const engine = core.engine;
  const api = {
    state: core.state,
    getState() {
      const base = {
        ...core.state,
        engine: "playcanvas",
        performanceTier: engine.tier,
        suspended: engine.suspended,
        reducedMotion: engine.reducedMotion,
        viewport: { width: engine.device.width, height: engine.device.height, portrait: engine.aspect < 1 },
        postProcessing: engine.postProcessingState(),
      };
      return Object.assign(base, core.getState ? core.getState() : {});
    },
    suspend(value = true) { engine.suspend(value); },
    restart() { return core.restart ? core.restart() : undefined; },
    control(action) { return core.control ? core.control(action) : false; },
    setPerformanceTier(tier) { return engine.setPerformanceTier(tier); },
    setBeatMs(value) { return core.setBeatMs ? core.setBeatMs(value) : null; },
    tickNow() { if (core.tickNow) core.tickNow(); return api.getState(); },
    /** 引擎句柄（仅 ?probe）：给后续编辑器与渲染诊断用。 */
    engine() { return Object.assign({ app: engine.app, root: engine.app.root, camera: engine.camera, sun: engine.sun, fill: engine.fill, cameraFrame: engine.cameraFrame }, core.engineHandles ? core.engineHandles() : {}); },
  };
  return Object.assign(api, extensions || {});
}

export function installDebugApi(api) {
  if (new URLSearchParams(location.search).has("probe")) window.__GAME_DEBUG__ = api;
  return api;
}
