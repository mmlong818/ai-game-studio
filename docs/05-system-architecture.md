# 系统与 AI 编排架构

## 1. 架构目标

首版架构必须优先保证：

- 任务可恢复，而不是刷新页面就丢失。
- 每次生成可追踪输入、产物、测试、耗时和成本。
- 生成代码不能读取主站数据或执行任意主机命令。
- 游戏规则可单独测试。
- 发布版本不可变。
- AI 供应商和素材供应商可替换。
- 玩法规格不绑定引擎，2D、3D 和后续引擎通过运行时适配器扩展。
- 一个权威事件流同时驱动 UI、日志、审计和恢复。

## 2. 总体结构

~~~mermaid
flowchart TB
    WEB[Web 工作台] --> API[API / 身份 / 配额]
    WEB <-->|SSE| EVENTS[构建事件流]
    API --> PROJECT[项目与版本服务]
    API --> ORCH[编排器]
    ORCH --> CAP[能力路由与适配器注册表]
    CAP --> JOBS[(任务与租约)]
    ORCH --> LEDGER[(build_event 权威账本)]
    JOBS --> SPEC[玩法规格工作器]
    JOBS --> CODE[代码工作器]
    JOBS --> ASSET[资源工作器]
    JOBS --> RUNTIME[2D / 3D / 引擎适配器]
    RUNTIME --> BUILD[隔离构建工作器]
    JOBS --> TEST[浏览器试玩工作器]
    SPEC --> MODELS[模型路由]
    CODE --> MODELS
    ASSET --> PROVIDERS[图片/音频提供方]
    BUILD --> OBJECTS[对象存储]
    TEST --> OBJECTS
    PROJECT --> DB[(PostgreSQL)]
    PROJECT --> OBJECTS
    OBJECTS --> CDN[CDN / 边缘缓存]
    CDN --> PREVIEW[独立预览来源]
    CDN --> GAMEURL[稳定游戏网址与版本网址]
    GAMEURL --> GAMEAPI[受控游戏数据 API]
    GAMEAPI --> GAMEDB[(隔离的游戏数据区)]
~~~

## 3. 首版部署形态

逻辑上分服务，物理上先保持简单：

- Web/API：一个 TypeScript Web 应用。
- Orchestrator/Worker：一个独立 Node.js 进程，可水平扩展。
- Database：PostgreSQL。
- Object Storage：S3 兼容存储。
- Delivery：CDN + 独立、无主站 Cookie 的游戏内容域名。
- Game Data API：按项目隔离的云存档和排行榜接口；静态游戏可以完全不启用。
- Build Sandbox：一次性容器；不与 Web 进程共享文件系统。
- Browser Test：Playwright 工作器。
- Event Delivery：SSE；控制命令走普通 API。

首版不引入 Kafka、多区域调度或自由多 Agent。数据库任务租约足以验证闭环；并发和规模有真实数据后再升级。

部署分为三个平面：

- **控制平面**：工作台、身份、项目、构建、版本和发布管理。
- **交付平面**：对象存储、CDN、稳定网址和不可变版本网址，负责把游戏交给玩家。
- **游戏数据平面**：云存档、排行榜、分析和后续实时房间；生成游戏只能调用项目作用域 API，不能访问平台数据库。

三者可以在首版共用一套云环境，但必须使用独立域名、权限和数据库角色，避免生成游戏碰到创作者账号与平台内部数据。

## 4. 编排状态机

~~~text
DRAFT
  → CLARIFYING
  → CONTRACT_READY
  → CLASSIFYING
  → SCAFFOLDING
  → CORE_GENERATING
  → CORE_TESTING
  → ASSET_PLANNING
  → ASSET_GENERATING
  → INTEGRATING
  → BUILDING
  → PLAYTESTING
  → REPAIRING
  → PLAYABLE
  → PUBLISHED

横向状态：
PAUSE_REQUESTED / PAUSED / CANCEL_REQUESTED / CANCELLED
FAILED_RETRYABLE / FAILED_LIMIT / FAILED_POLICY / FAILED_BUDGET
~~~

每个步骤需要：

- 稳定 step_id 和 idempotency_key。
- 明确输入产物与输出产物。
- 内容哈希。
- 最大时间、重试和成本。
- worker 租约与心跳。
- 结构化错误类型。
- 可恢复点。
- 对下游依赖的失效规则。

## 5. 单一权威事件流

参考 Funplay 的公开架构，UI、操作日志、验证和持久化不维护不同事实来源。

~~~ts
type BuildEvent = {
  id: string;
  buildId: string;
  sequence: number;
  phase: BuildPhase;
  action: string;
  visibility: "public" | "technical" | "internal";
  status: "queued" | "running" | "passed" | "failed" | "skipped";
  summary: string;
  inputDigest?: string;
  artifactIds: string[];
  testRunIds: string[];
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  startedAt: string;
  endedAt?: string;
  cost?: {
    unit: "credit";
    amount: number;
  };
};
~~~

规则：

- sequence 在单个 build 内严格递增。
- public 摘要可直接投影到用户时间线。
- technical 详情需要用户展开。
- internal 内容不得包含秘密提示词、令牌或未过滤环境变量。
- 前端断线后用 Last-Event-ID 继续，不从头伪造进度。

## 6. 项目结构

每个生成项目采用固定边界：

~~~text
project/
├─ game-spec.json
├─ acceptance.yaml
├─ asset-manifest.json
├─ runtime-manifest.json
├─ src/
│  ├─ core/              纯规则、状态机、随机数
│  ├─ game/              实体、场景与玩法实现
│  ├─ runtime/           由适配器提供的平台桥
│  ├─ ui/                HUD 与菜单
│  └─ main.ts
├─ public/
│  └─ assets/
├─ tests/
│  ├─ core/
│  └─ scenarios/
└─ generated-meta.json
~~~

AI 只能在允许的目录和文件类型中修改。package.json、构建脚本和运行时桥由平台控制，除非进入经过审查的升级流程。

## 7. 游戏运行时

所有运行时必须实现统一生命周期和测试桥。平台通用层提供：

- 启动、暂停、恢复、重开和销毁。
- 画布或视口、缩放、安全区和 DPR。
- 鼠标、键盘、触控的统一动作映射。
- 音频解锁、音量和静音。
- 稳定随机数与测试种子。
- 存档、排行榜和截图消息桥。
- 性能采样和错误捕获。

生成游戏实现：

~~~ts
interface GeneratedGameModule {
  create(config: GeneratedGameConfig): GeneratedGameInstance;
}

interface GeneratedGameInstance {
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  restart(seed?: number): Promise<void>;
  destroy(): void;
  getDebugState(): SerializableGameState;
  dispatchTestAction(action: TestAction): Promise<TestActionResult>;
}

interface RuntimeAdapter {
  id: string;
  capabilities(): RuntimeCapabilityManifest;
  scaffold(spec: GameSpec): Promise<ProjectSnapshot>;
  validateProject(snapshot: ProjectSnapshot): Promise<ValidationResult>;
  build(snapshot: ProjectSnapshot): Promise<BuildArtifact>;
  createTestDriver(artifact: BuildArtifact): Promise<GameTestDriver>;
  package(artifact: BuildArtifact, target: DeliveryTarget): Promise<PackageArtifact>;
}
~~~

调试接口是只读状态和受控动作，不允许任意执行表达式。公开版本默认关闭外部访问，只允许平台测试来源通过短期令牌连接。

适配器注册表按能力选择运行时。首批顺序为 `web-2d-phaser`、`web-3d`，再根据真实需求接入 Godot 等工程适配器。每个适配器独立维护依赖白名单、资产格式、构建镜像、测试驱动和性能预算；项目、版本、事件和证据系统不随引擎复制。

## 8. AI 角色与工具

首版使用一个确定性编排器和四种角色化任务，不让四个 Agent 自由聊天。

### 规格设计

输入：

- 用户原话。
- 既有玩法合同。
- 支持的玩法骨架。

输出：

- 硬约束、歧义、推荐项。
- game-spec.json。
- acceptance.yaml。
- 非目标和变化合同。

### 游戏程序

工具：

- 列出、读取、写入和补丁修改受限文件。
- 加载对应玩法技能。
- 运行静态检查和规则测试。
- 读取失败摘要。

禁止：

- 任意网络请求。
- 任意安装依赖。
- 读取其他项目。
- 直接控制发布。

### 资源导演

输出：

- 资源清单。
- 风格锚点。
- 每个资源的提示摘要、尺寸、透明度、帧数和用途。
- 资源依赖关系和许可证元数据。

### 验收员

工具：

- 运行规则测试。
- 启动隔离预览。
- Playwright 输入、截图、几何和控制台检查。
- 读取 getDebugState。
- 生成失败报告。

验收员不能自行把失败标为通过；只有探针结果更新 acceptance 状态。

## 9. 技能目录

参考 GameSmith 和 OpenGame，系统提示只包含技能索引，完整技能按需加载。

首批技能：

- game-design-brief
- grid-logic
- match3-rules
- top-down-action
- 3d-scene-composition
- first-person-controller
- third-person-controller
- 3d-camera-and-collision
- 3d-asset-budget
- navigation-and-enemy-ai
- mobile-input
- game-feel
- hud-and-menus
- procedural-audio
- asset-direction
- performance
- browser-playtest
- shipping-complete

技能内容包括：

- 适用条件。
- 不变量。
- 推荐骨架。
- 常见失败。
- 必须运行的验收。
- 修复后需要回归的范围。

技能不能包含真实 API 密钥或把第三方受限内容复制进来。

## 10. 依赖失效

每个产物记录输入哈希。修改后只使真正依赖它的下游失效。

示例：

| 修改 | 失效 | 保留 |
|---|---|---|
| 基础伤害 5 → 8 | 规则构建、计分测试、完整试玩、发布包 | 图片、字体、音乐 |
| 星梦主题 → 深海主题 | 图片、资源引用、视觉截图、发布包 | 核心规则单元测试 |
| 玩家操作改为单指拖动 | 输入适配、移动端测试、教程 | AI、计分、背景音乐 |
| 单个运行时适配器升级 | 使用该适配器的构建和浏览器测试 | 原始合同、源资源和其他适配器版本 |

## 11. 测试体系

### 层 1：写入前

- JSON/YAML Schema。
- TypeScript 解析和类型检查。
- 导入导出图。
- 未定义标识符。
- 文件和资源引用。
- 禁止 API 和依赖。

### 层 2：纯规则

- 种子固定。
- 状态转换。
- 胜负和计分。
- 边界、无解和重开。
- 修改前后不变量。

### 层 3：结构

- 必要界面和操作入口。
- 运行时合同实现。
- 资源清单完整。
- PWA/发布清单。

### 层 4：真实浏览器

- Chromium 为每次构建最低门槛。
- 发布前补 Firefox 和 WebKit。
- 桌面、手机竖屏、手机横屏。
- DPR=1、2、3。
- 点击、键盘、触控和拖动。
- 画布存在、可操作状态、控制台错误。
- 帧率、长任务和内存趋势。
- 胜负、结算和重开完整路径。

### 层 5：视觉

- 关键画面截图。
- 遮挡、溢出和安全区几何断言。
- 可选视觉模型只做辅助评价，不能替代确定性规则。

### 3D 附加验收

- 场景、相机、角色控制和碰撞能完成真实操作路径。
- GLB/glTF、纹理、材质和动画引用完整。
- 首屏下载体积、多边形、纹理和灯光数量不超过适配器预算。
- 桌面和目标移动设备记录帧率、长任务、显存/内存趋势和降级结果。
- 遮挡、穿模、跌出世界、相机眩晕和重生点进入确定性或几何检查。

## 12. 沙箱和预览安全

- 生成与构建在一次性沙箱运行。
- 工作区只有项目快照和只读运行时依赖。
- 默认关闭外网；资产下载通过平台代理。
- CPU、内存、磁盘、进程、构建时长和输出大小有限额。
- 依赖使用白名单和锁文件。
- 预览使用独立域名和 sandbox iframe。
- 已发布游戏使用不携带主站认证 Cookie 的独立内容域名。
- 不给 allow-same-origin，存档和排行榜通过严格的 postMessage 协议。
- CSP 禁止任意脚本、连接和顶层导航。
- 消息验证 origin、schema、项目和版本。
- 发布包再次扫描秘密、外链、动态代码执行和超大资源。
- 主站 Cookie、Local Storage、令牌和内部 API 对生成游戏不可见。

生产可比较 E2B 和自托管一次性容器；选择依据是隔离证明、冷启动、网络策略、成本和数据驻留，不只看接入速度。

## 13. 数据模型

| 实体 | 用途 |
|---|---|
| project | 所有者、标题、隐私、当前分支 |
| branch | 父版本和当前草稿 |
| game_spec | 玩法合同及版本 |
| acceptance_criterion | 验收定义、探针、状态 |
| build | 状态、预算、模型配置、输入版本 |
| build_step | 可恢复步骤、租约、输入输出哈希 |
| build_event | 权威事件账本 |
| artifact | 文件、图片、音频、构建包和来源 |
| asset_relation | 风格锚点和派生关系 |
| test_run | 环境、动作、断言、截图和日志 |
| version | 不可变项目快照和父版本 |
| deployment | 构建包向预览或生产环境的部署记录、健康状态和日志 |
| publication | 稳定玩家网址当前指向的不可变版本 |
| game_domain | 系统域名或自定义域名、验证状态、证书状态 |
| player_identity | 游戏作用域的匿名或已登录玩家标识，不复用内部账号令牌 |
| save_slot | 项目、玩家、版本兼容号和带配额的存档数据 |
| leaderboard_entry | 项目、赛季、榜单、玩家和服务端校验后的成绩 |
| game_event | 项目作用域的脱敏玩法事件和错误 |

平台控制数据与游戏运行数据至少使用不同 schema、数据库角色和访问 API；规模扩大后可拆为独立数据库集群。构建产物、图片、音频和 3D 模型存对象存储，不塞入 PostgreSQL。

## 14. 网址与发布模型

生产部署使用两类域名：

- 主站域名：工作台和 API，只承载创作者身份与平台控制。
- 游戏内容域名：只承载预览和玩家游戏，不设置主站认证 Cookie。

逻辑网址约定：

~~~text
https://studio.product.example/projects/{projectId}    创作者工作台
https://api.product.example                            平台控制 API
https://game-api.product-games.example                 游戏数据 API
https://{buildId}.preview.product-games.example        短期构建预览
https://{versionId}.version.product-games.example      不可变版本
https://{slug}.play.product-games.example              稳定玩家网址
https://creator-owned.example                          后续自定义域名
~~~

真实品牌域名在部署阶段确定；这里定义的是职责和隔离关系。通配 DNS 与证书负责系统分配的网址，自定义域名必须完成所有权验证、自动证书签发和冲突检查。

发布是一次原子操作：扫描构建包 → 上传对象存储 → 创建不可变版本部署 → CDN 预热与健康检查 → 更新稳定网址指针。任何一步失败，稳定玩家网址继续指向上一个健康版本。回滚只切换指针，不重新生成游戏。

## 15. API 草案

~~~text
POST   /api/projects
POST   /api/projects/:id/brief
PUT    /api/projects/:id/contract
POST   /api/projects/:id/builds
GET    /api/builds/:id
GET    /api/builds/:id/events
POST   /api/builds/:id/pause
POST   /api/builds/:id/resume
POST   /api/builds/:id/cancel
POST   /api/builds/:id/messages?mode=queue|interrupt
GET    /api/projects/:id/versions
POST   /api/projects/:id/versions/:versionId/restore
POST   /api/projects/:id/publications
GET    /api/projects/:id/deployments
POST   /api/projects/:id/publications/:publicationId/promote
POST   /api/projects/:id/publications/:publicationId/rollback
GET    /api/projects/:id/domains
POST   /api/projects/:id/domains
GET    /api/projects/:id/tests
GET    /api/artifacts/:id

GET    /game-api/v1/me
GET    /game-api/v1/saves/:slot
PUT    /game-api/v1/saves/:slot
GET    /game-api/v1/leaderboards/:board
POST   /game-api/v1/leaderboards/:board/scores
~~~

控制命令必须检查当前状态并返回可解释冲突，例如“构建已经进入发布快照阶段，不能再立即纠偏；已加入下一版本队列”。

游戏数据 API 使用短期、项目作用域令牌和服务端配额。成绩不能仅凭客户端声明进入可信榜单；需要规则签名、回放或服务端验证策略，无法验证的榜单必须标为休闲榜。

## 16. 模型与供应商边界

首版不在产品协议中硬编码具体模型 ID。

抽象为：

- planner：需求和合同。
- coder：代码和修复。
- fast-worker：摘要、分类和低风险转换。
- image：图片与精灵。
- audio：音效与音乐。
- vision-reviewer：可选视觉检查。

每次构建记录供应商、模型配置摘要、成本和结果，但密钥只在服务端秘密存储。接入具体模型前必须查本机 E:\CC\ai-models.md，并在模型表过期或需要修改模型 ID 时按官方文档复核。

## 17. 可观测性

必须回答：

- 哪一步最慢、最贵、失败最多？
- 哪类玩法和哪些提示最容易失败？
- 自动修复是否真正提高通过率？
- 哪个模型或骨架在相同验收集上更可靠？
- 用户在哪一步离开？

核心指标：

- time_to_contract。
- time_to_first_playable。
- build_success_rate。
- first_pass_acceptance_rate。
- regression_rate。
- repair_success_rate。
- cost_per_playable_version。
- publish_rate。

所有指标以项目和版本为粒度，不保存不必要的敏感提示内容。
