# Legacy 用户项目合并记录（2026-09-15）

## 范围

切换 Docker 前的便携 PostgreSQL 最终归档已经完整恢复为当前 `ai_game_studio`，恢复时项目 ID 与 8/12/9 等计数完全一致，因此本次没有重复导入便携库。合并源是同一 Docker 集群中的只读来源数据库 `ai_game_studio_legacy`。

本次只选择 legacy 中当前主库没有的两个非官方项目：

- `6c230413-7c83-43b8-bb11-f0349d73e0de`，“把 3×3 箭头方块解谜做成 3D …”，最新版本 `532e7f1f-4c70-41e5-bac5-3a61a84a3689`。
- `c2d56754-f31a-46f1-b6cd-07b0a75494e3`，“改造数织矩阵：每关开局多给一次撤销机…”，最新版本 `90b497ed-9987-45b7-921d-d28e2e256bba`。

17 个 legacy 官方项目没有导入，以当前官方登记及稳定路径为准。它们关联的 10 条旧活动 production 记录也没有导入，只保留在隔离 legacy 库中，应用不会连接或重放。项目无关的设计研究全局表、平台元数据和任何模型设置均未迁移或修改。

## 事务结果

迁移脚本是 `scripts/merge-legacy-user-projects.mjs`。默认执行真实插入演练并回滚，只有 `--apply` 才提交；每次开始前拒绝主库存在活动构建或 production。第一次 dry run 在单个事务中通过全部外键和唯一约束后回滚；apply 提交 510 行；第二次 dry run 找不到新候选，新增为 0，验证幂等。

| 表 | 新增行数 |
| --- | ---: |
| projects | 2 |
| game_specs | 25 |
| versions | 25 |
| builds | 30 |
| build_steps | 180 |
| project_messages | 25 |
| play_events | 170 |
| player_progress | 41 |
| version_demo_reviews | 2 |
| production_jobs | 2 |
| production_job_events | 8 |
| 其他项目相关表 | 0 |

两个被导入 production 回执在源库中已经分别是 `failed` 和 `succeeded`，原状态保留，没有伪造成成功，也没有进入恢复队列。合并后主库有 10 个项目、42 个构建、34 个版本、178 条游玩事件和 3 条 production 回执；活动构建与活动 production 都是 0，官方无限三消仍只有一条。

25 个版本记录中有 23 个对应产物目录；全部 23 个成功构建产物都存在。缺少目录的 2 个版本不是成功构建，未补造文件。两个项目 API 状态均为 `playable`，最新版本入口返回 HTTP 200，并已用浏览器实际载入项目试玩 iframe且错误列表为空。

## 备份与回退

合并备份目录：`.tmp/legacy-merge-20260915-194024/`。

- `main-before-merge.dump`：合并前主库。
- `legacy-before-merge.dump`：合并源库。
- `main-after-merge.dump`：合并后主库，`pg_restore --list` 共 129 项。
- `SHA256SUMS.txt`：备份与 SQL 文件校验值。
- `ROLLBACK_IMPORTED_PROJECTS.sql`：只针对本批两个项目的即时回退脚本。

执行回退前必须停止 API 写入并人工确认没有人继续编辑这两个项目。回退脚本会检查本批每张依赖表的精确行数，并拒绝存在活动制作或后来新增的依赖；只有所有计数仍与合并时完全一致才会删除这两个项目及其本批依赖。该脚本已在由合并后备份恢复的临时数据库中实际执行，项目数从 10 回到 8，临时验证库随后删除。若项目已经产生后续数据，应恢复备份到隔离数据库并人工挑选，不能运行即时回退脚本。
