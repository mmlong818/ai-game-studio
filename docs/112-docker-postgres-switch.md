# Docker PostgreSQL 切换记录（2026-09-15）

## 最终状态

- 正式服务数据库：Docker Compose 服务 `postgres`，镜像 `postgres:18.6-alpine3.23`，宿主机仅监听 `127.0.0.1:54329`。
- 正式持久卷：`ai-game-studio_studio-postgres-data-current-v1`。`docker-compose.yml` 使用显式卷名；当前机器会复用已恢复的数据卷，新机器首次 `docker compose up` 会自动创建空卷。不要对保存数据的环境执行 `docker compose down -v`。
- 主数据库：`ai_game_studio`，由切换前便携 PostgreSQL 的最终一致归档恢复。
- 旧 Docker 数据库：完整恢复为同一集群中不被应用连接的 `ai_game_studio_legacy`，原卷 `ai-game-studio_studio-postgres-data` 也继续保留且没有运行容器挂载。
- 原便携数据目录 `.tmp/pg18-live-data` 保留，进程已正常停止，可作为即时回退来源。

## 备份与核验

备份目录：`.tmp/docker-switch-20260915-162125/`。

- `portable-ai_game_studio-final-consistent.dump`：API 停止且确认无其他数据库客户端后生成的最终主库归档；`pg_restore --list` 共 129 项。
- `portable-ai_game_studio-pre-switch.dump`：停机前预备归档。
- `portable-globals.sql`：便携实例角色定义备份。
- `docker-old-ai_game_studio.dump`：旧 Docker 卷数据库归档；`pg_restore --list` 可读。
- `docker-old-globals.sql`：旧 Docker 实例角色定义备份。
- `portable-schema.sql` 与 `docker-old-schema.sql`：两边切换前的 schema-only 证据。

最终主库恢复前后均为 8 个项目、12 个构建、9 个版本、7 个发布记录和 1 条 production 回执；活动构建与活动 production 均为 0。来源项目 `93620a9e-9916-4d4b-9301-e114ea1aa3a4`、版本 `58151dd2-9217-4526-b2a0-79540ee0109a`、项目 `d0c266e7-ec15-467e-bac0-42221346e4e1` 与官方无限三消项目 `01114a7e-2041-4753-b07b-67ef7d256bef` 均已核对。

旧库有 19 个项目、60 个构建、66 个版本，其中 2 个非官方项目仅存在于旧库；两库项目 ID 没有交集，schema 文本也存在差异，官方发布路径会冲突，因此未做不安全的逐行合并。旧库的 10 条历史活动 production 状态原样保存在 `ai_game_studio_legacy`，应用连接串不指向该库，不会恢复或重放它们。

## 回退

需要回到便携实例时，先停止 API 写入，再执行 `docker compose stop postgres`；确认 54329 已释放后，用仓库内 PostgreSQL 18.6 的 `pg_ctl` 启动 `.tmp/pg18-live-data`，最后恢复无 watch API。不要同时启动便携实例与 Compose PostgreSQL，因为两者都使用 54329。

若需要恢复旧 Docker 数据，优先从 `docker-old-ai_game_studio.dump` 恢复到新的隔离数据库并核对；不要覆盖 `ai_game_studio`，也不要删除原卷。旧库两个非官方项目后续应采用按项目依赖闭包导入，并先解决 schema 与发布路径冲突。
