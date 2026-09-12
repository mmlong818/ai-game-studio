# 开发文档导航

更新时间：2026-09-11。

最新接手进展：[Codex 接手记录](102-codex-takeover.md)。

本文是开发文档的唯一导航入口。文档分为“当前规范、操作手册、实施计划、游戏合同、历史证据”五类。发生冲突时，优先级依次为：代码与测试、当前规范、操作手册、实施计划、历史证据。

## 当前规范

- [产品定义与边界](00-product-definition-v2.md)：目标用户、最小操作原则和能力边界。
- [游戏规格与规则合同](01-game-spec-v2.md)：项目、规则、动作、进度与证据的数据合同。
- [质量、证据与交付](02-quality-and-delivery-v2.md)：自动检查、真人试玩和发布门禁。
- [模板改造与同类研究](04-template-remix-and-reference-research.md)：R0–R3 分流和外部研究边界。
- [开发完成审计](07-implementation-status.md)：当前能力与仍需外部凭证的项目。
- [游戏设计知识系统](63-game-design-knowledge-system.md)：独立机制、玩法模式、研究与晋升规则。
- [游戏设计原则](33-game-design-knowledge.md)：含赛车与铁路沙盒复盘的 11 条原则、适用范围和审核问题，已接入设计与生成提示。
- [生成式游戏验收能力](generated-game-acceptance-capabilities.md)：验收服从确认方案的两层合同、`required | forbidden | not-applicable` 语义与迁移边界。
- [生成游戏失败台账与复盘](106-generated-game-failure-ledger.md)：记录重复失败签名、执行／标准／流程分类、修复证据与真实闭环状态；改质量门禁或重试前先查。
- [制作安全与审核权限](92-production-safety-and-review.md)：修改生成的费用边界、图片检查点复用、`STUDIO_REVIEW_TOKEN` 正式审核与发布事务复核。

## 操作手册与工程说明

- [新增官方游戏](55-adding-an-official-game.md)
- [平台游戏引擎层](58-engine-layer.md)
- [换机与开发恢复](50-machine-transfer.md)
- [托管、数据库与独立网址](07-hosting-and-delivery.md)
- [知识蓝图、图先行与玩法深度](96-knowledge-blueprint-and-art-first.md)：生成游戏必须从机制图谱选机制、写清取舍，并在代码之前先生成局内美术位图。
- [文本模型接入本机 Claude Code CLI](94-claude-cli-text-provider.md)：`STUDIO_TEXT_PROVIDER=claude-cli` 时策划、审核与代码生成走 CLI 订阅额度，图片仍用 OpenAI。
- [本机后台服务](local-background-services.md)：Windows 下以隐藏 Node 进程启动 4311/4312/4313，重启前核对活动制作任务。
- [边玩边改接口迁入 API 服务](107-player-first-hosting-api.md)：`/api/image-generation`、`/api/previews`、`/api/releases` 从 vite 开发中间件迁入 `src/server`，修复正式部署 404。
- [PostgreSQL 发布并发验证](87-postgres-publication-concurrency.md)：`npm run test:publication-postgres` 的隔离真实数据库测试。

## 当前实施计划

- [全部官方游戏新版改造](67-official-game-renovation.md)：全部官方游戏的独立改造目标、平台接入与逐款验收；数量以登记表为准，文内 16 款为 2026-09-05 立项时的范围。
- [引擎评估与采用](59-engine-evaluation-and-adoption-plan.md)
- [资源供给与资产库](60-resource-supply-and-library-design.md)
- [游戏设计完整性](61-game-design-completeness-plan.md)
- [下一阶段开发计划](62-next-development-program.md)
- [掌心工坊黄金合同](66-pocket-workshop-golden-plan.md)

计划描述的是目标和未完成事项，不是已实现能力；实际状态以代码、测试和[开发完成审计](07-implementation-status.md)为准。

## 官方游戏合同

- [牧野小火车：铁路玩具沙盒](72-meadow-railway-reference.md)：独立开发中的轨道搭建原型，参考真实网站交互，不进入正式大厅。

- [椰风海岛视频参考复刻与验收](71-island-kart-video-remake.md)：独立开发中的卡丁车竞速，可玩首版，尚未替换任何现有官方游戏。

`38`–`56` 中以 `best-template-reference` 命名的文件记录各官方游戏的规则、参照边界和验收要求。官方登记表 `src/shared/official-games/` 才是游戏状态、知识映射和大厅可见性的唯一数据源；合同中的旧版本号和阶段性现状只作历史解释。

## 研究与历史证据

以下内容保留用于追溯，不代表当前产品状态：

- `76`–`92`：2026-09-06 至 09-07 的创作区与整体产品改造记录。`76` 创作入口与状态真实性、`77`–`80` 核心流程／作品空间／设置／大厅四阶段、`81` 私有作品封面交付、`82`–`84` 审核证据与历史、`85` 低高度窗口、`86` 发布事务、`88` 有限关卡与无失败验收、`89` 制作执行权数据库边界、`90` 无限玩法与安全恢复、`91` 真实创作链路修复记录、`93` 规则审核回执复用、`95` 海边贝壳收集真实创作第二轮、`96` 知识蓝图与图先行、`97` 图先行链路首次真实制作与三处修复、`98` Claude CLI 结构化输出的纠错轮与错误透出、`99` 制作进度的流式展示、`100` 质量问题自动修到交付、`101` 2026-09-08 交接记录。其中标注“尚未完成”的事项以 [开发完成审计](07-implementation-status.md) 为准。
- `00-product-vision.md`、`01-landscape-research.md`、`02-product-and-workflow.md`、`03-match3-golden-path.md`、`04-experience-design.md`、`05-m0-implementation-reference-lock.md`、`05-system-architecture.md`、`06-delivery-plan.md`：早期愿景、研究和架构过程。
- `10`–`16`、`18`–`32`：第三方接入评审、真实使用审计和阶段完成证据。
- `33`–`37`、`OPEN_SOURCE_GAME_TEMPLATE_RESEARCH.md`：设计方法与来源研究。
- PNG、JSON 联系表和审计结果：对应阶段的不可变证据附件，不是规范文档。

历史文档中的本机网址、游戏版本号、测试数量、“首版”“当前”等表述只对记录日期有效，不应复制到新计划或当前状态说明。

## 维护规则

官方游戏删除范围与兼容处理见 [74-retired-official-games.md](74-retired-official-games.md)。

3D 性能适配与验收方法见 [73-3d-adaptive-quality.md](73-3d-adaptive-quality.md)；其中限速测试不等价于真实低端 GPU 达标。

1. 当前状态只写入本导航、根目录 `README.md` 和 `07-implementation-status.md`。
2. 机制数量由 `MECHANIC_ATLAS_SUMMARY` 计算，禁止在多个计划中手工维护不同数字。
3. 官方游戏数量和状态由 `src/shared/official-games/` 派生，禁止文档自行宣布上线。
4. 中途进度被完成报告取代后删除；具有研究、许可、测试或决策证据的记录归入历史证据。
5. 临时环境状态（当前是否配置密钥、服务是否启动、本机端口）不写成长期事实。
6. 生成链路、质量门禁或重试修复必须更新 [失败台账](106-generated-game-failure-ledger.md)，并分别记录实现、自动测试、真实构建和未闭环状态；未提交工作树不得写成已发布。
