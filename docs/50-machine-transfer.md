# 换机开发恢复说明

代码和当前开发数据分两部分保存：

- `main` 分支保存全部源码、官方模板资源、测试和文档。
- GitHub Release `development-snapshot-2026-09-02` 保存当前 PostgreSQL 数据库与全部游戏生成产物；这些运行数据体积约 500 MB，不直接写进 Git 历史。

Release 资产名：`ai-game-studio-development-snapshot-33bdb04.tar.gz`。

## macOS 恢复

```bash
git clone https://github.com/mmlong818/ai-game-studio.git
cd ai-game-studio
gh release download development-snapshot-2026-09-02 --pattern 'ai-game-studio-development-snapshot-33bdb04.tar.gz'
tar -xzf ai-game-studio-development-snapshot-33bdb04.tar.gz
mkdir -p data
mv artifacts data/artifacts
docker compose up -d postgres
docker cp ai-game-studio.dump ai-game-studio-postgres-1:/tmp/ai-game-studio.dump
docker compose exec -T postgres pg_restore -U studio -d ai_game_studio --clean --if-exists --no-owner --no-privileges /tmp/ai-game-studio.dump
npm install
npm run dev
```

快照包含 14 个项目、52 个版本、40 条构建记录、13 款在线官方游戏和 1,491 个游戏产物文件。密钥、令牌和日志不进入快照；换机后需要重新配置 AI 密钥。

1.1 之后的说明：`data/artifacts/` 是 1.0 时期的只读产物来源；服务运行时使用 `data/artifacts-v1.1/`，首次访问某个版本时会从 `data/artifacts/` 或 `fixtures/<kind>/` 复制过去并补齐 1.1 工程清单，之后按来源指纹自动刷新。恢复快照只需要还原 `data/artifacts/`，`data/artifacts-v1.1/` 会自动生成，两者都已被 Git 忽略。

