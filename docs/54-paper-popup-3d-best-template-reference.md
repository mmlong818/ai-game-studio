# 纸境 · 立体书迷宫（paper-popup）最佳模板：参照、边界与实现合同

更新时间：2026-09-04（渲染层已切换到 PlayCanvas，见 §9）。视觉与玩法基准见 `docs/concepts/paper-popup/README.md`（产品负责人已确认）。

## 1. 目标

平台的官方 3D 示范游戏，同时是第三种 3D 玩法模式 `threeMode = "popup"`。核心点子只有一句：**转一转，路就出现了。** 玩家把整本立体书按 90° 转动，折起的桥和台阶只在特定角度接上，藏在纸洞后的折纸星只在特定角度露出来；点击地面行走，一个跳跃键越过一格空隙；抵达出口门通关，三颗折纸星可选，失败回到检查点旗。

它不是能跑的 Demo，而是要放进游戏大厅、能代表平台水准的作品：审美（纸艺低多边形、四章色板、纸边、移轴）与玩法（20 关四章递进、每关都能被自动探针按正确角度序列走完）都要在线。

## 2. 可追溯参照

### 2.1 空间旋转谜题品类：视角决定连通性

参照对象：以“旋转视角改变路径连通性”为核心的成熟解谜品类（公开设计访谈与玩法分析多有讨论：固定等角镜头、离散角度、连通性只在特定角度成立、失败代价低、关卡短）。

采用：

- 离散 90° 转动（不是自由镜头）：`PopupState.o ∈ {0,1,2,3}`，转动不消耗节拍。
- 连通性由数据描述：`PopupLink.angles` 指定桥 / 台阶在哪些朝向接上；星星的 `angles` 指定在哪些朝向可见、可拾取。
- 每一关必须**需要**转动：求解器在禁用转动时找不到解才算合格（`requiresRotation`）。

不采用：

- 任何商业作品的角色、关卡、美术、音乐、界面识别或文字化品牌联想。
- 自由旋转镜头、无限层级几何错觉；本模板只做“整本书转动”这一种可验证的机制。

### 2.2 立体书 / 纸艺（papercraft pop-up）作为唯一视觉语言

参照对象：`docs/concepts/paper-popup/01..04` 四张概念图（gpt-image-2 生成，提示词与 sha256 已记录）。

采用：

- Three.js 程序化低多边形、`flatShading`、每块纸面 `EdgesGeometry` 浅色纸边；桥与台阶是可折叠的纸片（铰链在格边），纸浪、纸鸟、检查点旗、出口门、纸偶角色全部是程序化几何。
- 每章一套色板（晨光草甸 / 海岸灯塔 / 灯笼夜市 / 雪原天文台），同一纸艺语言：`palettes` 表驱动天空、书页、纸台顶面 / 侧面、纸边、强调色、树、障碍、印花。
- 单主光 + 半球光 + PCF 柔和阴影 + 线性雾 + ACES；高性能档启用屏幕空间移轴景深（离屏渲染 + 纵向带状模糊，末端补 `tonemapping/colorspace` 片段保持色彩一致）。
- 翻页开场（右页绕书脊翻开、关卡从纸面弹起）、角色纸偶弹跳、纸屑粒子；`prefers-reduced-motion` 时全部回退为即时状态。
- AI 图只作为贴图：封面、纸纹平铺、桌面背景、四章圆形印花贴纸（贴在书页角落的平面上）。禁止照片平铺、禁止位图立牌充当 3D 物体（静态探针断言产物中没有 `THREE.Sprite`）。

不采用：

- 概念图本身不进入交付包；交付贴图由 `scripts/generate-paper-popup-art.mjs` 单独生成并登记。

### 2.3 阶段 F 3D 底座（docs/30、51、52）

采用：性能三档与慢帧自动降档、9:16 手机舞台、后台停渲染、`_studio/THREE_ASSET_PROVENANCE.json` 资产溯源、统一 `data-game-state` 运行状态、20 关渐进合同与启动页选关、`?probe` 调试探针、Stage F 浏览器审计与批量审计脚本。

不采用：collector 的第三人称跟随镜头与胶囊碰撞、arena 的位图敌人与弹体。popup 的碰撞是**网格可达性模型**，不是连续物理。

## 3. 数据与模型

### 3.1 关卡数据（`src/shared/paper-popup-levels.ts`）

20 关全部用数据描述，没有 20 份场景代码：

| 字段 | 含义 |
| --- | --- |
| `rows` | 高度网格：`.` 空洞，`1–9` 纸台高度；相邻高差 ≤ 1 可直接走 |
| `start / exit / checkpoints` | 起点、出口门、检查点旗（失败回到最近已点亮的旗） |
| `stars[].angles` | 三颗折纸星各自可见 / 可拾取的朝向；每关至少一颗不含 `0` |
| `links[]` | `bridge`（跨 1–2 格空洞、两端同高）/ `stair`（相邻、高差 2）；`angles`、`plate`、`step`、`closeStep`、`timer` 决定何时接上 |
| `plates[]` | `toggle` 翻转板、`order` 顺序灯、`timer` 计时板 |
| `hazards[]` | `wave` 纸浪 / `bird` 纸鸟：沿 `path` 每 `every` 拍走一格 |

四章递进（每章 5 关，新元素与前章叠加）：

1. 晨光草甸：角度桥 / 折叠台阶、一格跳跃、隐藏星。
2. 海岸灯塔：+ 按节拍移动的纸浪与纸鸟，需要等时机。
3. 灯笼夜市：+ 顺序灯与开合桥、翻转板。
4. 雪原天文台：+ 限时门（计时板触发后桥只接上 `duration - 1` 拍），综合运用。

### 3.2 旋转 / 可达性规则（`src/shared/paper-popup-rules.ts`）

单一实现，服务端求解器、领域 GameProbe、Node 测试与浏览器运行时共用（浏览器通过 `createPaperPopupRules.toString()` 内嵌同一份函数体）。

- 时间以**节拍**推进：走一格、跳一次、等待各一拍；转动 0 拍。运行时每 380ms 一拍；探针可调快节拍，模型不变。
- `linkOpen(link, state)`：角度 ∧ 翻转板 ∧ 顺序进度 ∧ 未关闭 ∧ 计时 > 0。
- `walkTarget`：相邻实心格高差 ≤ 1，或经由此时接上的链接。
- `jumpTarget`：只能越过正前方一格**空洞**；落点高度 ≤ 当前 + 1，否则跳空。
- 每拍结束：纸浪 / 纸鸟与角色同格 → 回到检查点；踩到压板结算；站在星格且朝向可见 → 拾取（站着转动也能拾取）；抵达出口 → 完成。
- `solveLevel`：起点 → 检查点 → 出口的最短动作序列（BFS，状态含位置、朝向、节拍相位、机关状态）；`solveStar`：每颗星可拾取；`validate`：结构与章节元素校验。

### 3.3 输入

- 手机：点击地面行走（BFS 规划当前朝向下可走的路径）、横向滑动转书、一个跳跃键；另配 ⟲ / ⟳ 两个转书按钮。所有按钮 ≥ 44px。
- 键盘：方向键 / WASD 按屏幕方向走（`screenToGrid` 换算朝向）、Q / E 转书、空格跳跃、P 暂停。

## 4. 验收

静态（`inspectGameArtifact`，24 项 popup 探针）：Three.js 本地运行时、程序化纸艺几何与纸边、AI 贴图只作纸纹 / 印花、光影与 ACES、高性能档移轴、翻页与 reduced-motion、旋转与可达性模型、节拍障碍与检查点恢复、两种手势加一个按钮、20 关数据校验与求解、资产溯源、AI 生图位图、禁用 SVG 等。

Node 测试（`tests/paper-popup-quality.test.ts`）：

- 内嵌规则源码与直接实现求解一致；转动 0 拍、等待 1 拍。
- 20 关签名唯一；每关校验为空、可解、`requiresRotation`、至少一颗隐藏星、三颗星均可拾取、主线 ≤ 60 拍；四章元素约束。
- 隐藏星默认角度不可拾取、转到指定角度即拾取。
- 官方贴图包 gpt-image-2 记录完整、交付字节与 sha256 一致；封面 1024×1536。
- popup 产物生成并通过静态探针，DYNAMIC_ART / 提供源 / 关卡审计文件齐备，产物中无 `THREE.Sprite`、无 SVG。
- 浏览器审计（`inspectStageF3DInBrowser(root, "popup")`）：390×844 与 1280×720 各真实回放首关完成一局、跳空一次回到检查点、后台停渲染；隐藏星与角度桥随转动显隐；桌面视口 20 关逐关由探针按正确角度序列干净完成。

领域层（`src/domain/probe.ts` `PaperPopupProbe` + `runPaperPopupScenario`）：折桥拒绝穿行 → 正确角度序列真实走完 → 隐藏星显现 → 跳空回检查点 → 存档恢复；20 关逐关由探针走完。

Playwright（`tests/browser/paper-popup.spec.ts`，Chromium / Firefox / WebKit）：真实 WebGL 上下文；键盘 + 滑动转书真实走完第 1 关（包含一次“转过角度后桥才接上”）；手机竖屏无横向溢出、转书与跳跃按钮可触控且 ≥ 44px。

## 5. 证据边界

- 求解器证明的是“存在一条正确角度序列”，不证明人类玩家的实际耗时；1–3 分钟以主线 ≤ 60 拍为工程约束，真人时长仍需真人试玩记录。
- 浏览器审计使用 SwiftShader 软件渲染，帧率与真实手机不同；性能三档与慢帧降档已由代码与测试覆盖，实体手机手感需人工确认。
- 本模板不宣称接入通用物理引擎；网格可达性模型是刻意选择，也是它可被完整验证的原因。

## 6. 美术打磨记录（2026-09-03，对照 docs/concepts/paper-popup）

只改渲染层、装饰、色板、镜头；规则内核与 20 关数据未动（`auditPopupBlueprints()` 结果与关卡签名不变）。

1. 纸感：纸台改为满格无缝的纸块，顶面另做一张薄纸片（不同明度同色纸），每层高度加一条略深的纸层线读出厚度；`addEdges(…, thick)` 叠两层描边形成约 2px 浅色纸边；每格 `offsetPaperUv` 随机偏移纸纹。
2. 堆料（构件层，按 docs/concepts/paper-popup/ART-SPEC.md §5 落实）：`buildDecor` 用 `layeredCutout` 把每个构件做成 ≥ 2 张前后错位 0.07 的纸片（松树 3–5 层），颜色逐层提亮 8%，每张带纸边；网格四角各一组主构件（高 1.2–2.2：多层松 / 灯塔 / 灯笼杆 / 天文台），环带每 ≤ 1.1 格一个槽位放次构件（高 0.3–0.7：纸花簇、灌木、纸浪、纸船、摊位、灯笼串、雪堆、望远镜），约三成槽位尝试再放主构件；每个主构件都要通过“书的 4 个朝向都不遮挡可走格与星”的射线检查，基座离可走格中心 ≥ 0.6 + 基座半径。远端两排纸山 / 屋影（夜市带琥珀窗）改放在不随书旋转的 `backdropGroup`，立在书后方桌面上，颜色取章节 `backdrop` 三档，最远一排再叠 15% `sky`；草甸海岸加纸云 / 海鸟，夜市加月牙与星点，雪原加星点。夜市点光 ≤ 5 盏灯笼杆 + 1 盏出口门。低档构件总量 ×0.4，四角主构件保留；实测指标见 `tests/browser/paper-popup.spec.ts` 的构件层断言。
3. 色板与光：四章 `palettes` 直接取自 03 色板主色（草甸奶油/鼠尾草/万寿菊；灯塔奶油/珊瑚/海泡绿/墨蓝；夜市墨蓝/李子紫/暖琥珀；雪原冰白/淡蓝/黄铜）；主光 3.0–3.1（夜市 2.4）、半球光 0.8–1.25、曝光 1.1–1.75 按章节校，雾推远，`PCFSoft` 阴影 radius 2；夜市用出口门、灯笼杆与屋影窗的暖琥珀发光和点光照亮。
4. 镜头：`fitCamera` 改为把网格 8 个角点投影进视锥的精确拟合，手机竖屏边距 0.12 格、桌面 0.5 格。实测手机竖屏立体书约占画面高度 45%——竖屏受横向视角限制，要到 60% 必须裁掉边缘可走格，这里选择完整可见；桌面关卡占据舞台主体。
5. 星与门：折纸星半径 0.3、发光边（半透明大星 + 白描边）与点光；检查点旗更大、更饱和并带地环，点亮时整体转为万寿菊色；出口门按章节：草甸灯笼门、海岸小灯塔、夜市灯笼串、雪原天文台圆顶与望远镜。
6. 性能与回退：三档保留，低档关阴影/移轴/粒子并减装饰，但纸边、星、旗、门与路面可读性不变；reduced-motion 仍关闭翻页、弹跳、纸屑与转动缓动。

## 7. 已知问题（2026-09-03，来自真人试玩）

- **第 8 关无法通过**：玩家反馈纸浪/纸鸟障碍无法躲开，跳跃无效。自动探针按节拍模型能通关，说明浏览器层的输入节拍、障碍碰撞判定或跳跃与转动的时序与规则内核不一致，需要在真机上逐拍对照复现后修复。
- 处理决定：登记表中标记 `stage: "development"`，从大厅与“改一个现有游戏”摘出单独开发；修复并真人复核第 6–10 关后再改回 `live`。
- 2026-09-04 更新：浏览器层根因已定位并在 PlayCanvas 运行时里修复（见 §9.3）；规则内核的“无交换判定 + 走廊无安全格”问题未改，交回产品决策。真人复核第 6–10 关仍待进行。

## 8. 进入大厅

1. 本游戏已登记在 `src/shared/official-games/paper-popup.ts`（kind = "three"，threeMode = "popup"，lobbyRank 15）；创作侧模板 `popup-rotate-3d`、探针与运行时定义均由该登记派生。
2. 主工作区启动服务后运行 `npm run seed:showcases -- paper-popup`（可用 `PORT`/`GAME_PORT`/`STUDIO_ORIGIN` 换端口）：创建 3D 项目（自动判定 `popup`）→ 构建 → 自动验收。
3. 主美在工作台按 `_studio/ART_REVIEW.md` 真实复核后通过（本地可用 `REVIEW_ART=1` 直接记录）；再次运行脚本发布稳定网址。
4. 重启 API 服务：`syncOfficialCatalog()` 按登记表把它标记官方并排到第 15 位，不需要手工 SQL。操作手册见 `docs/55-adding-an-official-game.md`。

## 9. 引擎切换（2026-09-04）：Three.js → PlayCanvas

纸境是平台接入真正 3D 引擎的第一个案例。渲染层整体改写到 **PlayCanvas 2.21.4（MIT）**，规则内核、20 关数据、领域探针、2D 运行时与另两种 3D 模式（collector / arena，仍是 Three.js）完全不动。

### 9.1 接入方式

- 依赖：`package.json` 精确版本 `playcanvas@2.21.4`；许可证原文登记在 `third_party/playcanvas-LICENSE.md`，产物内再附一份 `vendor/PLAYCANVAS-LICENSE.md`，并在 `_studio/OPEN_SOURCE_ATTRIBUTION.md` 追加“3D 引擎：PlayCanvas”一节。
- 打包：官方单文件 ESM 构建 `node_modules/playcanvas/build/playcanvas.mjs`（约 3.5 MB，未压缩）原样复制为产物 `vendor/playcanvas.module.js`（改 `.js` 后缀是为了匹配静态服务与浏览器测试服务器只认 `.js` 的 MIME 表）；`app.js` 用 `import * as pc from "./vendor/playcanvas.module.js"` 引入，运行时不从 CDN 加载任何代码（静态探针与 Node 测试都断言产物脚本里没有 `http(s)://`）。
- 入口：`src/server/playcanvas-popup-runtime.ts` 承载新运行时，浏览器脚本按“引擎 / 场景 / 规则驱动”分三段放在同名目录；旧的 `src/server/three-popup-runtime.ts` 只做 `export *` 转发，`writePaperPopupArtifact`、`readPaperPopupAssetManifest`、`paperPopupTextureFiles` 等导出名与签名不变。`game-artifact.ts` 只改了 popup 分支的一处：静态探针从内联列表改为调用 `inspectPaperPopupArtifact()`（探针名保持，新增“开源引擎归属”）。
- 产物清单：`game-manifest.json` 的 `engine: "playcanvas"`、`engineVersion`、`engineLicense: "MIT"`；`_studio/THREE_ASSET_PROVENANCE.json`（文件名保留）记录 `engine.bundle` 与字节数。

### 9.2 运行时结构

- 实体 / 组件：`camera`、`sun`（方向光）、`fill`（补光）、`desk`、`book → book-base / right-page / level`、`backdrop` 都是实体；`level` 下再分 `cells`、`decor`、`links`、`plates`、`stars`、`flags`、`hazards`、`exit`、`player` 子实体，每个纸台、构件、星、门、旗、纸偶都是独立实体（`?probe` 下 `__GAME_DEBUG__.engine()` 暴露这些句柄，供后续编辑器使用）。
- 网格与材质：所有几何仍是程序化低多边形（`GeoBuilder` → `pc.Mesh.fromGeometry`），每个面独立顶点与法线（平面着色）；颜色全部烤成 sRGB 顶点色（`vertexColorGamma`），因此全场只有少量共享 `StandardMaterial`（纸纹 / 无纹 / 书页 / 桌面 / 发光 / 半透明），需要逐帧变化的部件（灯笼脉动、压板亮度、旗子点亮、星）才有独立材质。网格按参数缓存复用。
- 纸边：不再用线段描边。盒子沿 12 条边做宽 0.03 的几何斜切并烤成 `edge` 色，纸片正反面留 0.022 宽的 `edge` 色内圈、侧壁整块 `edge` 色（像真纸的切口）；纸台顶纸仍是 1.06 × 0.12、每层一条层线，构件层 §5 的密度、层次、尺寸、章节专属、四朝向遮挡检查全部保留，实测值仍由 `getState().popup.decor` 暴露并被浏览器测试断言。
- 光与后处理：方向光 + 天空色环境光 + 弱补光近似半球光，PCF5 32F 柔影（高档 2048 阴影贴图；PCSS 在软件渲染与部分移动 GPU 上会静默失效，故不用），线性雾、ACES、按章曝光。中 / 高档用 `pc.CameraFrame`：MSAA ×4、SSAO（纸层接触阴影）、暗角（四角约 −12%）；高档再开 bloom（星与灯笼）和以书页为焦平面的景深（读出移轴的上下虚化）。低档不建 CameraFrame，直接在相机上做 ACES。
- 性能三档：软件渲染（SwiftShader / llvmpipe）直接 low；其余从 medium 起跑，连续 90 帧 < 12 ms 才升 high，连续慢帧逐级降档；后台 / 探针挂起时既不推进节拍也不渲染（`renderCount` 不增长）。
- 镜头：仍以整本书拟合；竖屏方向向量改为 `(0.5, 1.82, 0.866)` 归一化并只保证网格 + 0.08 格留白进入画幅，实测竖屏书页占画面高度 0.55–0.60（`getState().bookScreenHeightFraction`），桌面 0.72–0.75。
- 对外合同：DOM 结构、`data-*` 属性、`__GAME_DEBUG__` 的字段与语义与 Three 版一致，新增 `engine`、`beatFraction`、`bookScreenHeightFraction`、`popup.hazards[].next`、`popup.postProcessing`、`control()`、`engine()`。

### 9.3 第 8 关（潮汐走廊）根因与修复

在旧运行时上用 Playwright 真实按键逐拍复现（逐拍 queue / model.t / 纸浪格 / 纸偶位置的记录附在本次交付报告里）：

1. **规则内核层面（未改，交回）**：碰撞只在拍末比对“障碍的新格子 == 玩家的新格子”，没有交换 / 擦身判定；第 8 关 `w1` 每拍在 1 格宽的走廊 `(1..3,5)` 上来回，走廊里没有任何一格能安全站立，求解器给出的唯一过法是“纸浪迎面来时正面走进它”（t=3→4：玩家 1→2、纸浪 2→1 交换格子）。真人不会这么做，也没有任何画面暗示可以这样做。
2. **跳跃语义**：`jumpTarget` 只允许越过“空洞格”，走廊是实心格，所以对着纸浪按跳跃得到 `blocked:E` 并清空队列——即“跳跃无效”。这是内核设计，不是 bug。
3. **浏览器层（已修）**：
   - 输入延后一拍：旧运行时把按键排进队列、等下一个 380 ms 节拍边界才交给规则，实测按下到结算 300–400 ms，首次按键还要等 1 s 翻页开场；玩家按键时看到的纸浪位置与结算时的位置差半拍到一拍。**修复**：队列为空时的直接输入当场推进一拍（纸浪同步走一步、节拍时钟归零），空闲时纸浪仍按 380 ms 自行移动，连按仍按序排队。
   - 看不见判定用的格子：碰撞比对的是障碍“下一拍”的格子，而画面只画了当前格。**修复**：每个障碍多一个落点标记（纸浪 = 泡沫环、纸鸟 = 影子）落在 `hazardCell(t + 1)`，`getState().popup.hazards[].next` 同步暴露。
   - 点击地面盲走：BFS 路径完全忽略障碍，点检查点就直接撞进纸浪。**修复**：有障碍的关卡用规则内核自带的 `rules.search`（含等待动作）规划安全路径，找不到再退回原 BFS。
   - 被撞时纸偶瞬移回旗、纸浪却还在一格之外：**修复**：先把纸偶走到出事的格子（跳空则落到空洞上方并下沉），一拍后再回旗；与障碍交换格子时纸偶做一个小跳，把“越过纸浪”读出来。
   - 新增浏览器测试：只用键盘，每拍看落点标记决定“迈步 / 等一拍”，三浏览器都能无失误穿过走廊、点亮检查点、转到 270° 过桥。

真人在 380 ms 节拍下仍需要在一拍内读标记并按键；若试玩仍觉得紧，建议把 `config.beatMs`（运行时配置，不是内核）调到 440–480，或在关卡数据里给走廊留一格安全位——这两项都是产品决策，本次未改。

### 9.4 美术对照概念图（诚实评价）

- 与 01 / 03 概念图相比，PlayCanvas 版的纸台、层线、斜切纸边、多层剪纸构件与四章色板都成立，夜市章（点光 + 自发光窗）最接近概念；SSAO 让纸片“压”在纸面上，比 Three 版的线段描边更像真纸。
- 差距：概念图的纸台是不规则多面体“纸崖”，我们仍是规整方格；概念图的移轴虚化更强、桌面暗角更明显；雪原章整体偏白、层次弱于概念图；纸偶仍是几何体拼装。这些属于美术打磨，不影响验收硬指标。

### 9.5 检查

`npm run typecheck`、`npm test`、`npm run build`、`npm run test:browsers`（Chromium / Firefox / WebKit）、`npx tsx --test tests/paper-popup-quality.test.ts`（含 Stage F：手机与桌面各完成一局、跳空回检查点、后台停渲染、20 关探针逐关通关）与 `npm run audit:stage-f -- popup=<root>` 均通过；2D 与 collector / arena 的测试与断言未改。

## 10. 引擎评估（2026-09-04）：Cocos 4 门禁未通过，迁移停止

产品侧提出把纸境的浏览器运行时从 PlayCanvas 迁到 **Cocos 4**（https://github.com/cocos/cocos4，`v4.0.0` = `6722aac6`，`cocos-creator@4.0.0-alpha.32`，MIT），并以此建立平台的"游戏引擎层"。按约定先做三条门禁，任一不过即停止。完整证据在 `third_party/cocos4/BUILD.md`，复现脚本 `scripts/build-cocos-engine.mjs`，门禁空白页在 `third_party/cocos4/gate/`（引擎产物本身**未**入库）。

| 门禁 | 结果 | 证据 |
| --- | --- | --- |
| 1. 从源码构建出可 `<script type="module">` 相对引入的单文件 ESM | **通过** | ccbuild `moduleFormat: 'esm'` + 裁剪 `base / gfx-webgl2 / 3d / legacy-pipeline`，14–17 s；esbuild 压缩后 0.96 MB，gzip 269 KB，brotli 217 KB（未压缩 1.88 MB / gzip 354 KB） |
| 2. 空白页：Director / Scene、相机、方向光 + 阴影、程序化 Mesh、后处理（SSAO 或 bloom）、WebGL2 截图 | **通过（带前提）** | `third_party/cocos4/gate/gate-render.png`：5 个自建顶点缓冲 Mesh、固定区域阴影贴图、RenderTexture + 全屏四边形做 SSAO 接触阴影 + 软 bloom + 暗角。前提：引擎**没有可用的内建着色器**（`.effect` 需编辑器内的离线 effect-compiler，不在仓库、npm 无包），所有材质与后处理着色器都是手写 EffectAsset |
| 3. 许可与第三方依赖核对；体积 ≤ 6 MB / gzip ≤ 1.5 MB | 体积**通过**；许可**不通过** | Web 产物必然内含 `@cocos/engine-pal@1.0.4`（屏幕适配 / 输入 / 节拍 / 系统信息 / wasm 加载），该包 `"license": "UNLICENSED"`，README 明示"UNLICENSED — Cocos 内部使用"，dist 为混淆产物、无公开源码仓库（`cocos/engine-pal` 404），cocos4 issue 亦无澄清 |

决定：**不迁移，不提交引擎产物，不改任何运行时 / 合同 / 测试；PlayCanvas 版仍是纸境的正式实现（§9）。** 这不是工程量问题——把 PAL 换成自写实现或 3.8 版 MIT 源码、再自行维护全部着色器，等于维护一个 Cocos 4 分叉，超出"直接迁移"的范围，也正是约定里禁止的"打补丁式硬塞"。

顺带记下对日后有用的事实（详见 BUILD.md §3.1）：ccbuild 默认 ES5 降级会触发 Babel 循环闭包 bug 需指定现代 `targets`；Node 24.20 下 ccbuild 的 terser 压缩崩溃需改 esbuild；`createMesh` 默认不算包围盒会让模型被阴影裁剪剔除；引擎在 `import` 时会给 `#GameCanvas` 自动包两层容器，会改动页面 DOM。

关于"引擎层"（`src/engine/**`、`docs/58`）：本轮未建。它的价值不取决于具体引擎，建议改以 PlayCanvas（已在产物中、MIT、有官方 ESM 与完整材质 / 后处理）为底座抽出：引擎引导（相机 / 光照 / 后处理 / 性能三档 / 后台停渲染 / reduced-motion）、程序化网格与材质预设、`GameProjectV3 → 实体 / 组件` 映射与 behavior 注册、输入抽象、`__GAME_DEBUG__` 通用实现——这些在 `playcanvas-popup-runtime/{script-engine,script-scene,script-game}.ts` 里已有雏形，Cocos 4 门禁通过与否都不影响这条路。
