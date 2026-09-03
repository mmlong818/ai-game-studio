/**
 * 平台游戏引擎层 · PlayCanvas 底座（2.21.4，MIT）。
 *
 * 服务端（本目录 *.ts）：渲染预设、GameProjectV3 → ScenePlan 映射、行为注册表、规则桥校验、HUD 生成、产物写入、运行时打包。
 * 浏览器（runtime/*.js）：createColorKit / createGeometryKit / createMaterialKit / createEntityKit / createEngineApp /
 *   createSceneGraph / createGrid / createEventBus / createBehaviorRuntime / createRuleBridge / createInputController / createDebugApi。
 * 立体书（threeMode="popup"）是第一个消费者；2D 运行时不经过这里。详见 docs/58-engine-layer.md。
 */
export * from "./render-presets.js";
export * from "./scene-plan.js";
export * from "./behaviors.js";
export * from "./rules.js";
export * from "./input.js";
export * from "./runtime.js";
export * from "./artifact.js";
