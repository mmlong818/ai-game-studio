# 造界 · AI Game Studio

面向非专业用户的 AI 网页小游戏制作平台：用户用自然语言描述想法、确认一份看得懂的游戏方案，平台自动完成玩法补全、代码与资源生成、新手帮助、难度递进、质量检查和版本交付。目标不是尽快生成一张“像游戏”的页面，而是用尽量少的操作获得完成度较高、可以真实试玩的小型游戏。

> 本仓库公开可见，但不是开源软件，也不因公开浏览而授予复制、转载、再分发、修改、二创或商业使用许可。需要内部部署或其他使用时，请先取得相应权利人的书面许可；具体范围以 [LICENSE](LICENSE) 为准。第三方依赖和资源继续适用各自的许可证。

## 已实现能力

- 从自然语言想法生成普通用户可读的设计方案，用户可以确认继续或返回修改。
- 用结构化设计合同固化核心循环、胜负、操作、教学、难度和关卡/无尽模式，避免实现阶段悄悄偏离需求。
- 复用官方游戏、玩法模板、机制图谱与资源规划；无法安全承载的类型会明确拒绝或标记为实验支持。
- 生成独立运行的 DOM、Canvas、2D 及有限场景 3D 网页小游戏，包含桌面和触控输入路径。
- 生成并绑定 AI 位图，保存资源版本和用途；生成失败时不以假占位图冒充正式资源。
- 执行静态安全扫描、规则逐项审核、真实浏览器路径、性能和多画幅检查，并在有限预算内根据失败证据修正。
- 保存项目、不可变版本、修改记录、质量证据和发布状态；支持稳定试玩地址与带本地资源的交付包。
- 游戏内修改只针对当前游戏，模板和项目相互独立。
- 官方目录统一登记 18 款游戏：7 款 fixture 与 11 款可移植 template 使用同一套大厅排序、稳定网址和初始化流程；11 款 template 的完整发布产物保存在 `official-bundles/`，启动时会在写入数据库前校验目录、文件大小与 SHA-256。
- 工作台和 7 款 fixture 的玩家可达界面支持简体中文、繁体中文、英语和日语。11 款 template 保留既有发布运行时的语言能力，目前没有承诺游戏本体的完整四语言覆盖。

AI 文本任务按职责路由：

- `planner`：分析想法并形成游戏方案；
- `executor`：生成和修复游戏代码；
- `reviewer`：检查修改意见与规则是否真正落实。

用户选择的高阶文本模型保持为 planner/reviewer。只有当前 OpenAI Key 已经成功取得的模型目录中存在明确认可的执行型号时，平台才会把 executor 分配给 Sol/Terra 等执行档；否则使用同一模型。系统不会为了分工额外探测模型、猜测“更低”型号、跨提供商发送密钥，或在长制作中因目录缓存到期而悄悄换模型。

## 当前边界

平台聚焦单人、浏览器直接运行、单局约几十秒到三十分钟的小游戏。实时多人、房间匹配、可信竞技排行榜、MMO/开放世界、大型骨骼动画、高精度载具物理、原生商店包、广告支付和真实货币经济不在当前承诺中。

自动检查可以证明合同、页面行为和技术门槛是否满足，但不能替代真人对“好不好玩”的判断。主美复核、长期趣味性、不同硬件的最终体验和生成模型的偶发偏差仍需人工验收。历史交付版本不会因平台代码更新而自动重写。

自动恢复只在已定义的有限边界内工作：明确的瞬时 429/5xx 与连接建立失败可按原请求预算重试；经过浏览器确认的单一棋盘标记可做确定性补正；跨构建复验只接受绑定源码哈希和规则审核回执的零模型检查点。额度、凭据、配置缺失、结果不确定的超时，以及真人趣味判断不会被自动绕过。实现、自动测试和尚未完成的真实模型验证分别记录在[自动修复、失败经验与无模型恢复](docs/110-automatic-repair-experience.md)中。

## 技术结构

```text
React + Vite 工作台（4311）
          │
          ▼
Node.js / TypeScript API（4312） ── PostgreSQL
          │
          ├─ 设计合同、机制与资源知识库
          ├─ planner / executor / reviewer 路由
          ├─ 构建编排、有限自动修正、质量证据
          └─ 不可变产物与发布记录
          │
          ▼
跨源游戏运行服务（4313）
```

主要目录：

- `src/components/`、`src/web/`：创作工作台与产品界面；
- `src/server/`：API、模型接入、制作编排、数据库、发布和质量门禁；
- `src/shared/`：合同、官方游戏登记、机制图谱和资源规划；
- `src/engine/`：有限 3D/PlayCanvas 引擎适配层；
- `fixtures/`：独立官方游戏与回归样本；
- `official-bundles/`：11 款官方 template 的可移植发布产物、固定元数据和逐文件校验清单；
- `tests/`：服务端、合同和历史回归；
- `docs/`：产品规范、设计原则、质量标准和交接记录。

## 本地运行

需要 Node.js `>=24 <25`、npm、Docker Desktop 与 Docker Compose。首次安装浏览器依赖时需要网络。

```powershell
git clone https://github.com/mmlong818/ai-game-studio.git
cd ai-game-studio
npm install
npm run doctor
npm run db:up
npm run dev
```

打开 `http://127.0.0.1:4311/`。开发模式同时启动 Vite 工作台和 API；PostgreSQL 默认映射到 `54329`，API 默认使用 `4312`，生成游戏由独立的 `4313` 端口提供。停止数据库使用 `npm run db:down`。

若 Windows 的 Hyper-V/Winnat 占用了 `4311–4313`，可以改用未占用端口运行构建后的工作台：

```powershell
npm run build
$env:PORT=5312
$env:GAME_PORT=5313
node --env-file-if-exists=.env.local --use-env-proxy --import tsx src/server/index.ts
```

此时访问 `http://127.0.0.1:5312/`。不要在不了解影响时修改系统保留端口。

需要用容器运行完整应用时，先在部署环境设置公网来源、访问令牌和模型密钥等变量，再启动 `app` profile：

```powershell
docker compose --profile app up -d --build
```

Compose 会启动工作台/API、独立游戏来源和 PostgreSQL，并把宿主机端口限制在 `127.0.0.1`。生产环境还需要反向代理、TLS、访问控制和备份；保存数据库的环境不要执行 `docker compose down -v`。数据库切换与恢复边界见 [Docker PostgreSQL 切换记录](docs/112-docker-postgres-switch.md)。

## AI 配置

复制示例配置，密钥只写入不会提交的 `.env.local`：

```powershell
Copy-Item .env.example .env.local
```

原生 OpenAI 文本与图片：

```dotenv
OPENAI_API_KEY=sk-...
```

机器通过 `HTTP_PROXY`/`HTTPS_PROXY` 访问网络时还需设置 `NODE_USE_ENV_PROXY=1`。

文本也可改走本机已登录的 Claude Code CLI；图片仍需要 OpenAI Key：

```dotenv
STUDIO_TEXT_PROVIDER=claude-cli
STUDIO_CLAUDE_MODEL=opus
# STUDIO_CLAUDE_CLI=claude
```

当前支持 OpenAI API 和本机 Claude CLI 文本适配。智谱 GLM 尚未启用：OpenAI-compatible endpoint 不代表 strict JSON schema、思考参数与流结束语义完全相同，不能只替换 Base URL 和 Key；后续接入必须使用独立 provider 配置、请求适配和兼容性测试。

## 成本、隐私与安全

- 方案、代码、审核和图片生成可能产生第三方模型费用；自动修正有次数上限，但不是固定金额保证。
- API Key 只供服务端调用，不应写入浏览器代码、项目描述、日志、截图或交付包。不要提交 `.env.local`。
- 用户创意、确认方案、生成代码及审核输入会发送给所选提供商；部署者应自行核对其数据政策与合规要求。
- 项目、版本和制作记录保存在 PostgreSQL，资源与不可变产物保存在服务端数据目录；生产部署需自行配置备份、访问令牌、TLS 和最小权限。
- 生成游戏在独立端口/域名运行并经过 CSP、网络、脚本和资源门禁，但生成代码仍应视为不受信任内容，不要取消隔离后直接部署。
- 请求超时不会自动重复提交费用未知的整项制作；失败记录和旧版本会保留用于诊断。

## 验证

```powershell
npm run typecheck
npm test
npm run build
```

完整浏览器矩阵需要 Playwright 浏览器：

```powershell
npm run setup:browsers
npm run test:browsers
```

`npm run check` 会依次执行类型检查、平台与历史测试、生产构建和浏览器测试，耗时更长。PostgreSQL 发布集成测试使用独立入口 `npm run test:publication-postgres`。

## 文档

- [文档导航](docs/README.md)
- [产品定义与支持边界](docs/00-product-definition-v2.md)
- [游戏规格与规则合同](docs/01-game-spec-v2.md)
- [质量、证据与交付](docs/02-quality-and-delivery-v2.md)
- [引擎评估](docs/59-engine-evaluation-and-adoption-plan.md)
- [资源供给](docs/60-resource-supply-and-library-design.md)
- [游戏设计完整性](docs/61-game-design-completeness-plan.md)
- [游戏设计知识系统](docs/63-game-design-knowledge-system.md)
- [当前可靠性记录](docs/102-codex-takeover.md)
- [自动修复、失败经验与无模型恢复](docs/110-automatic-repair-experience.md)
- [Docker PostgreSQL 切换记录](docs/112-docker-postgres-switch.md)
- [Legacy 用户项目合并记录](docs/113-legacy-user-project-merge.md)
- [18 款官方游戏统一入库报告](docs/114-official-catalog-unification.md)

## 版权与许可

本仓库采用所有权保留的[限制性许可](LICENSE)，不是开源许可证。对于相应权利人有权许可的项目原创代码、文档、原创设计和原创资源，未经事先书面许可，不得复制、转载、再分发、修改、二创、制作衍生作品或商业使用。公开访问和浏览代码本身不授予这些权限；指定同事或组织的内部使用与部署可由相应权利人另行书面授权。

依赖、字体、图片、音频、示例资源及其他第三方材料不因本项目许可证而重新授权，仍分别受原许可证和来源条款约束，主要清单见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。平台许可证不会自动替用户生成的游戏作品设定许可证，也不替代对生成内容、输入材料和所用资源的权利核查；这些内容还受模型服务条款和适用法律影响。新条款适用于包含它的仓库版本和后续沿用版本，不撤回他人已经从合法历史版本取得的权利；若某部分材料的权利人未授予项目再许可权，不能仅凭根许可证重新授权该部分。
