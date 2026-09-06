# 开发文档导航

更新时间：2026-09-06。

本文是开发文档的唯一导航入口。文档分为“当前规范、操作手册、实施计划、游戏合同、历史证据”五类。发生冲突时，优先级依次为：代码与测试、当前规范、操作手册、实施计划、历史证据。

## 当前规范

- [产品定义与边界](00-product-definition-v2.md)：目标用户、最小操作原则和能力边界。
- [游戏规格与规则合同](01-game-spec-v2.md)：项目、规则、动作、进度与证据的数据合同。
- [质量、证据与交付](02-quality-and-delivery-v2.md)：自动检查、真人试玩和发布门禁。
- [模板改造与同类研究](04-template-remix-and-reference-research.md)：R0–R3 分流和外部研究边界。
- [开发完成审计](07-implementation-status.md)：当前能力与仍需外部凭证的项目。
- [游戏设计知识系统](63-game-design-knowledge-system.md)：独立机制、玩法模式、研究与晋升规则。
- [游戏设计原则](33-game-design-knowledge.md)：含赛车与铁路沙盒复盘的 11 条原则、适用范围和审核问题，已接入设计与生成提示。

## 操作手册与工程说明

- [新增官方游戏](55-adding-an-official-game.md)
- [平台游戏引擎层](58-engine-layer.md)
- [换机与开发恢复](50-machine-transfer.md)
- [托管、数据库与独立网址](07-hosting-and-delivery.md)

## 当前实施计划

- [全部官方游戏新版改造](67-official-game-renovation.md)：16 款游戏的独立改造目标、平台接入与逐款验收。
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
