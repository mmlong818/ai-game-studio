# 平台游戏引擎层（PlayCanvas 底座）

> 状态：第一版落地（2026-09-04），立体书（`threeMode = "popup"`）已改为通过引擎层搭场景；`examples/engine-playcanvas-demo/` 用一份手写 GameProjectV3 走通最小闭环。
> 底座：`playcanvas@2.21.4`（MIT，许可原文 `third_party/playcanvas-LICENSE.md`）。Cocos 4 评估结论见 docs/54 §10（许可门禁未通过，不在本层范围）。
> 关联：docs/54（纸境参照合同）、docs/55（新增官方游戏）、docs/57（GameProjectV3 / 能力模块 / 规则 / 预制件）、`docs/concepts/paper-popup/ART-SPEC.md`。

## 1. 定位与边界

引擎层服务两件事：（1）辅助官方团队制作官方 3D 游戏；（2）支撑“AI 生成游戏”——AI 输出结构化的 GameProjectV3，引擎层把它变成可运行、可验收的游戏。

边界（硬约束）：

- **2D 与 3D 互不影响**。2D 运行时（`src/server/game-runtimes/*`、`src/server/game-compiler/`）、three collector / arena 不经过这里；只有 `object.renderer === "webgl"` 的对象进入引擎层，其它 renderer 的实例被记入 `skipped` 并写进 `_studio/ENGINE_SCENE.json`。
- **产物自包含**：引擎单文件 ESM 随产物 `vendor/playcanvas.module.js` 交付，`app.js` 以相对路径 `import`；引擎层运行时片段（`runtime/*.js`）在写产物时内嵌进 `app.js`，不走 CDN、不需要打包器。
- **规则内核不被替代**：引擎层只提供“事件 → 规则触发 → 反馈”的通用桥（复用 `src/shared/rules` 的条件 / 动作登记表）。纸境仍内嵌 `paperPopupRulesSource()`，`paper-popup-rules.ts` / `paper-popup-levels.ts` 未改。
- **合同不变**：立体书对外的 DOM id、`data-key`、body 数据属性、`__GAME_DEBUG__` 字段与语义、静态探针字面量、`game-manifest.json` 已有字段全部保持；只新增了 `renderPreset` 字段与 `_studio/ENGINE_LAYER.json`。

## 2. 目录

```text
src/engine/playcanvas/
  index.ts             统一出口
  render-presets.ts    RenderPreset 类型、studioRenderPreset（默认）、toJsLiteral、manifestPerformanceProfiles
  scene-plan.ts        buildScenePlan：GameProjectV3 → ScenePlan（实体树纯数据）；summarizeScenePlan
  behaviors.ts         ENGINE_BEHAVIORS 登记表 + validateEngineBehaviors
  rules.ts             validateEngineRules（复用 shared/rules）、ENGINE_RULE_SIGNALS、支持的条件 / 动作列表
  input.ts             controlButtonsHtml / controlBarHtml（data-key 按钮）、defaultGridKeyMap / defaultGridButtons
  runtime.ts           engineRuntimeScript（读 runtime/*.js、剥 export、按依赖顺序拼接）、engineRuntimeExports
  artifact.ts          writeEngineVendor、engineImportHeader、writeEngineAttribution、engineManifestFields、engineProvenance、writeEngineSceneReport
  runtime/             浏览器片段（ESM，可在 Node 直接 import 单测；依赖全部通过参数注入）
    color.js           createColorKit(pc)
    geometry.js        createGeometryKit(pc, device)
    materials.js       createMaterialKit(pc, app, colorKit, { assetRoot, maps })
    entities.js        createEntityKit(pc, colorKit)
    bootstrap.js       createEngineApp(pc, canvas, colorKit, preset, hooks)
    scene-graph.js     createSceneGraph(pc, kits, plan, options)
    behaviors.js       createGrid / createEventBus / createBehaviorRuntime(ctx)
    rules.js           createRuleBridge(project, runtime)
    input.js           createInputController(options)
    debug.js           createDebugApi(core, extensions) / installDebugApi(api)
src/server/playcanvas-popup-runtime/       纸境专属：render-preset.ts（纸艺预设）、script-engine.ts（色板 + 装配 + 纸艺基元）、script-scene.ts（构件生成器 + 关卡→实例）、script-game.ts（规则驱动 + 动画）
examples/engine-playcanvas-demo/           最小闭环：project.json（GameProjectV3）+ build.ts
tests/engine-playcanvas.test.ts            逐模块单测（node:test）
tests/browser/engine-playcanvas-demo.spec.ts 三浏览器闭环验收
```

## 3. API 一览

### 3.1 浏览器运行时（`runtime/*.js`，写产物时内嵌）

| 工厂 | 返回 | 说明 |
| --- | --- | --- |
| `createColorKit(pc)` | `rgb / hexOf / pcColor / toHsl / fromHsl / shade / mixColor / deg / parseHex` | 色板用 sRGB 十六进制；顶点色写 sRGB 字节 |
| `createEngineApp(pc, canvas, colorKit, preset, hooks)` | `app, device, camera, sun, fill, reducedMotion, performanceProfiles, tier, profile, cameraFrame, aspect, suspended, renderCount, applyPerformanceTier, setPerformanceTier, trackFrame, applyEnvironment, setFog, setFocus, placeSun, resize, onUpdate, suspend, start, postProcessingState` | 应用 / 画布分辨率 / 相机 / 方向光 + 补光 + 环境光 / 雾与曝光 / PCF5 阴影 / CameraFrame（MSAA、SSAO、bloom、暗角、景深）/ 性能三档与自动降档（慢帧降、高配快帧升）/ 后台停渲染 / reduced-motion。hooks：`onError, onTierChange, onResize, onSuspend, onVisibility` |
| `createGeometryKit(pc, device)` | `GeoBuilder, triangulate, insetPolygon, planarUv, meshCache, cachedMesh, buildBox, boxMesh（斜切边）, sheetMesh（纸片 / 外沿）, extrudeMesh, cone / cylinder / dome / ico / octahedron / torus / disc / triangle / plane, starPoints, hexPoints` | 全部平面着色、顶点色烤制、共享网格缓存（带引用计数） |
| `createMaterialKit(pc, app, colorKit, options)` | `textureAsset, attachTexture, materialCache, materialFor, uniqueMaterial, disposeTransientMaterials, glowMaterial, translucentMaterial, transientMaterials` | 共享材质缓存（key 为选项 JSON）、命名贴图映射、贴纸（alpha）、发光 / 半透明工厂 |
| `createEntityKit(pc, colorKit)` | `group, meshEntity, setPos, setRot（弧度）, setScale, place, disposeGroup, meshMaterial, tag, seeded, measureBounds, pointLight` | 实体工具与确定性随机 |
| `createSceneGraph(pc, kits, plan, options)` | `root, byId, list, skipped, dispose, stats` | 按 ScenePlan 建实体树：形状网格 + 贴纸子实体 + 父子挂接 |
| `createGrid(cellSize)` / `createEventBus()` | 网格登记 / 事件总线（`on / emit / recent`） | 行为与规则桥共用 |
| `createBehaviorRuntime(ctx)` | `registry, register, attachAll, update, beat, control, dispose, snapshot, player, unknown` | 行为注册表（id → 工厂）；内建 6 个行为见 §5 |
| `createRuleBridge(project, runtime)` | `dispatch, variables, triggered, feedback, unknownTypes, dispose` | 订阅 `collision / input / timer`，条件 / 动作与 `shared/rules` 同语义，触发后派发 `forge:rule` |
| `createInputController(options)` | `buttons, setButtonsEnabled, dispose` | 键盘（忽略 repeat、`always` 键）/ `[data-key]` 按钮（is-active）/ 横向滑动 / 点击 → 抽象动作 |
| `createDebugApi(core, extensions)` / `installDebugApi(api)` | `state, getState, suspend, restart, control, setPerformanceTier, setBeatMs, tickNow, engine` + 扩展 | `__GAME_DEBUG__` 通用骨架，仅 `?probe` 时挂到 window；游戏专属字段经 extensions 注入 |

### 3.2 服务端（Node）

| 函数 | 说明 |
| --- | --- |
| `buildScenePlan(project, { sceneId?, cellSize?, center? })` | GameProjectV3 → ScenePlan；`summarizeScenePlan(plan)` 给验收摘要 |
| `validateEngineBehaviors(project)` / `validateEngineRules(project)` | 进入构建前的静态校验（未登记 id、主版本、角色、参数类型 / 范围；未登记条件 / 动作） |
| `toJsLiteral(value)` | 预设 / 配置以 JS 字面量内嵌（键不加引号），静态探针可读到 `tiltShift: true` |
| `engineRuntimeScript()` | 内嵌全部运行时片段；`engineRuntimeExports()` 列出各片段导出 |
| `writeEngineVendor(root)` / `engineImportHeader()` / `writeEngineAttribution(studioRoot, version, usage?)` / `engineManifestFields(version, preset)` / `engineProvenance(root, version)` / `writeEngineSceneReport(studioRoot, plan, extra?)` | 产物通用部分：vendor 引擎与许可证、脚本头、开源归属节（幂等）、清单字段、溯源、`_studio/ENGINE_SCENE.json` |
| `controlBarHtml(ariaLabel, buttons, className?)` / `controlButtonsHtml(buttons)` | HUD `data-key` 按钮（属性顺序固定：`type, data-key, [class], aria-label`） |

## 4. GameProjectV3 → 实体 / 组件的映射规则

| GameProjectV3 | 引擎层 | 备注 |
| --- | --- | --- |
| `scenes[startSceneId]` | `createSceneGraph` 的根实体 `scene:<id>` | `options.sceneId` 可选其它场景 |
| `instance.position.x / .y` | 世界 X / 世界 Z（俯视平面，乘 `cellSize`） | 子实例（`parentInstanceId`）的位置是相对父实体的局部坐标 |
| `instance.overrides.elevation` | 世界 Y（底面高度，缺省 0） | |
| `instance.size.width / .height` | X / Z 方向尺寸 | |
| `instance.overrides.height` | Y 方向尺寸 | 缺省按角色：player 0.8、hazard 0.5、collectible 0.4、background 0.3、effect 0.02 |
| `instance.overrides.shape` | `box | sheet | cone | cylinder | sphere | star | plane` | 缺省按角色：player/background/helper box、hazard cone、collectible star、effect plane；未知形状回退并告警 |
| `instance.overrides.color / emissive / opacity / yaw / textureMode / textureTiling` | 顶点色 / 自发光材质 / 半透明材质 / 绕 Y 角度 / `sticker`（缺省）或 `wrap` / 平铺 | 颜色 `"#rrggbb"`；缺省按角色色板 `rolePalette` |
| `instance.layer` | 实体创建顺序（升序） | |
| `instance.visible` | `entity.enabled` | |
| `object.renderer !== "webgl"` | 记入 `plan.skipped`（原因：renderer） | dom / canvas-2d 对象由 2D 侧或 HUD 负责 |
| `object.role === "interface"` | 记入 `plan.skipped`（原因：HUD 层） | |
| `object.resourceIds` 中的位图 | `textures[]` → 顶面贴纸子实体（`<id>:sticker`）或包裹贴图 | 非位图资源忽略；AI 位图只作贴图，不充当 3D 物体 |
| `object.behaviors[]`（enabled） | `createBehaviorRuntime.attachAll` 按 `moduleId` 查注册表挂到实体 | 未登记 id 记入 `unknown`，不抛错 |
| `rules[]` | `createRuleBridge` | 条件 / 动作见 §6 |
| `variables[]` | 规则桥的 `variables` 初值 | |
| `acceptance[]` | 由构建管线读取，引擎层不解释 | 见 §8 |

居中：`center: true` 时把顶层实例包围盒中心吸附到格后平移到原点（格心保持整数世界坐标）。

## 5. 行为注册表

服务端登记（`ENGINE_BEHAVIORS`）与浏览器注册表（`createBehaviorRuntime().registry`）一一对应，`tests/engine-playcanvas.test.ts` 守卫。参数经 `validateEngineBehaviors` 校验类型与范围。

| id | 角色 | 参数 | 事件 | 说明 |
| --- | --- | --- | --- | --- |
| `engine.grid-footprint` | background / helper | `height` | — | 吸附到格心，按实例尺寸取整登记可走格与顶面高度 |
| `engine.static-decor` | background / effect / helper | `randomYaw`, `castShadows` | — | 不参与碰撞与网格；按实例 id 种子随机朝向 |
| `engine.pickup` | collectible | `spinSpeed`, `bob` | `collision(kind=pickup)` | 旋转浮动；玩家同格时触发一次并隐藏 |
| `engine.pressure-plate` | helper / hazard / background | `mode: toggle | hold` | `trigger` | 玩家踩上切换 / 按住激活，改自发光 |
| `engine.beat-mover` | hazard | `path[[dx,dz]...]`, `every` | `collision(kind=hazard)` | 每 `every` 拍沿路径走一步，一拍插值；与玩家同格即碰撞 |
| `engine.grid-walker` | player | `stepsPerSecond` | `moved`, `blocked` | 抽象动作 N/E/S/W 走一格（目标格必须可走），`jump` 越过一格空隙 |

**尚未覆盖**（对照 docs/57 §4.2 的八类能力与纸境已有玩法）：角度门 / 折桥（依赖朝向的可达性）、检查点与重生、限时门与顺序机关（需要计时器信号与顺序状态）、相机跟随 / 自由移动（非网格）、生成 / 对象池、生命 / 计分 HUD 绑定、屏幕震动 / 粒子反馈、本地存档。这些目前仍是纸境专属实现（`script-scene.ts` / `script-game.ts` 与规则内核）或 2D 能力模块（`src/shared/mechanics`）。

## 6. 规则桥

- 信号：`collision`（行为发出，带对象 id 与实例 id）、`input`（输入控制器 / 游戏转发 `{ action, direction? }`）、`timer`（游戏循环按需 `{ id, elapsedMs }`）。
- 条件：`state.is`、`input.received`、`collision.overlap`（引用 ≥ 2 时要求双方都在其中）、`timer.elapsed`、`variable.compare`。
- 动作：`state.set`、`variable.set / add`、`entity.destroy / spawn`（按 instance / object 引用作用于实体）、`movement.apply`（`direction.y` 映射到世界 Z）、`feedback.emit`（回调 + 记录）。
- 触发后：`window.dispatchEvent(new CustomEvent("forge:rule"))`（与 1.1 运行时观测器一致）+ 总线 `rule` 事件；`triggered / feedback` 供 `__GAME_DEBUG__` 与验收读取。
- 纸境：规则内核未换；本轮只把其事件流保留在原路径，规则桥由示例验证。

## 7. 官方团队用引擎层做新 3D 官方游戏（最少步骤）

1. 按 docs/55 跑脚手架并登记：`npm run game:new -- <id> --kind three --title "中文名"`，`threeMode` 选新模式或复用 `popup`；填 `cover / referenceDoc / domainTemplate / probeKind / seed`。
2. 写渲染预设：复制 `src/server/playcanvas-popup-runtime/render-preset.ts` 或直接用 `studioRenderPreset`，只改色板 / 光 / 后处理数值。
3. 写场景装配脚本（模板字面量片段，参照 `script-engine.ts` 前 60 行）：`createColorKit → createEngineApp → createGeometryKit / createMaterialKit / createEntityKit`；若关卡能用 GameProjectV3 描述，则 `buildScenePlan` + `createSceneGraph` + `createBehaviorRuntime` + `createRuleBridge`，否则像纸境一样自写“关卡 → 实例”映射，但几何 / 材质 / 光 / 输入 / 调试仍走引擎层。
4. 写产物：`writeEngineVendor(root)`、`engineImportHeader() + engineRuntimeScript() + 你的片段`、`writeEngineAttribution`、`engineManifestFields`、`writeEngineSceneReport`；`__GAME_DEBUG__` 用 `createDebugApi(core, extensions)` 扩展专属字段。
5. 验收：静态探针（沿用 `inspectPaperPopupArtifact` 的写法，列出你的字面量合同）、`tests/browser/<id>.spec.ts`（参照 `engine-playcanvas-demo.spec.ts`）、Stage F 审计（`inspectStageF3DInBrowser` 新增模式分支）、三浏览器。
6. 守卫测试 + 三浏览器通过后合并；重启服务按登记表进大厅。

## 8. AI 生成游戏如何对接

输出什么：一份完整 GameProjectV3（`src/shared/project-schema`），3D 对象 `renderer: "webgl"`，行为只用 §5 登记的 id 与参数，规则只用 §6 的条件 / 动作，资源为工程内相对路径的 AI 位图（带 `contentHash` 与 `provenance`），`acceptance` 列出要验的规则 / 行为。`examples/engine-playcanvas-demo/project.json` 是可直接复制的样例。

走哪些校验（任一失败即拒绝构建）：

1. `parseGameProjectV3`：结构、稳定 id、引用完整（对象 / 实例 / 资源 / 规则引用）。
2. `validateEngineBehaviors`：未登记行为、主版本、角色适用、参数类型 / 范围。
3. `validateEngineRules`：未登记条件 / 动作。
4. `buildScenePlan`：`skipped` 与 `warnings` 写进 `_studio/ENGINE_SCENE.json`；未渲染的对象必须是 dom / interface，否则视为描述错误。
5. 资源门禁：位图存在、哈希一致、无 SVG、无外部地址（沿用 1.1 资源清单规则）。

如何进入构建 / 验收 / 发布：`examples/engine-playcanvas-demo/build.ts` 就是构建函数的形态——`校验 → buildScenePlan → 拼装 index.html / styles.css / app.js → writeEngineVendor / 归属 / 场景报告 / game-manifest.json`。接入 `game-artifact.ts` 时把它放在 3D 分支（`runtimeTarget === "web-3d"` 且工程为 GameProjectV3）下，产物再走既有链路：`inspectGameArtifact` 静态探针（新增 “引擎层场景报告存在、skipped 只含 dom/interface、行为 / 规则校验为空” 三条）、`inspectStageF3DInBrowser`（读 `__GAME_DEBUG__.getState()` 的 `entityCount / behaviors / triggeredRuleIds / variables`，与 `acceptance` 对照）、发布与 ZIP 导出不变。

## 9. 验收（本轮）

- `tests/engine-playcanvas.test.ts`：预设序列化可逆；几何三角计数（斜切盒 44、纸片外沿、挤出）、缓存与引用计数、顶点色字节；材质缓存 / 发光 / 半透明 / 临时材质销毁；场景计划映射、跳过、居中、未知形状、父子；场景图实体树与贴纸；行为注册表一致性与六个行为在假引擎中的效果；规则桥语义；调试骨架键集合；HUD 按钮与纸境合同逐字一致；运行时打包无网络地址且纸境探针字面量齐全；vendor / 归属幂等 / 场景报告 / 示例产物自包含。
- `tests/browser/engine-playcanvas-demo.spec.ts`（Chromium / Firefox / WebKit）：34 个实体 + 1 个 skipped（dom HUD）、25 个可走格、行走 / 越界拒绝 / 压板切换 / 键盘同一路径 / 节拍障碍巡逻、三次拾取 → `RULE-COLLECT-STAR` ×3 → `RULE-ALL-STARS` → `data-game-state=won`。
- 纸境：`tests/paper-popup-quality.test.ts`、`tests/browser/paper-popup.spec.ts`、Stage F popup 审计不改断言全部通过；docs/54 三张截图重出。

## 10. 未覆盖项与后续计划

- 行为：§5 列出的角度门 / 检查点 / 计时器 / 顺序机关 / 相机跟随 / 生成回收 / 反馈 / 存档尚未通用化；纸境的这些能力仍在专属代码里。下一步先把“检查点与重生”“计时器信号”做成通用行为与信号，再把纸境的角度门抽成 `engine.angle-gate`。
- 规则桥只支持 `shared/rules` 现有 5 条件 7 动作；`entity.spawn` 只是重新启用已有实例，不创建新实体。
- 场景图形状只有 7 种基元 + 贴纸；复合构件（纸境的多层剪纸树、灯塔等）仍是游戏专属生成器，后续可登记为“预制形状”供 GameProjectV3 引用。
- `game-artifact.ts` 尚未接入“GameProjectV3 3D 工程 → 引擎层构建”的正式分支（本轮只在示例 build.ts 里证明形态）；`inspectGameArtifact` / `inspectStageF3DInBrowser` 也还没有引擎层示例的通用模式。
- 引擎层运行时片段没有类型声明（`.d.ts`），编辑器提示靠 JSDoc；服务端 API 有完整 TS 类型。
- 运行时片段从仓库源目录读取（`src/engine/playcanvas/runtime/*.js`），`dist-server` 部署需带上源目录（与 `assets/`、`node_modules/playcanvas` 一样是仓库内相对路径）。
