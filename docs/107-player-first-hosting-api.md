# 边玩边改接口迁入 API 服务

更新时间：2026-09-12。本文记录一次结构修复，不是新能力声明。

## 问题

`/player-first` 页面（大厅“开始玩”跳转的边玩边改界面）依赖三个接口：

| 接口 | 用途 | 调用方 |
| --- | --- | --- |
| `POST /api/image-generation` | 单张素材生图 | `src/domain/imageGenerationClient.ts` |
| `POST /api/previews` | 真机预览临时托管 | `src/domain/previewHosting.ts` |
| `POST /api/releases` | 稳定网址发布 | `src/domain/releaseHosting.ts` |

修复前这三个接口只以 vite 开发中间件形式写在 `vite.config.ts` 里，`src/server/` 没有任何实现。本机开发经 4311 访问时 vite 接住了请求，所以问题一直没暴露；正式部署只有 API 进程自托管 `dist-web`，这三个请求全部落到 `接口不存在。` 的 404。生图实现还依赖 Codex 私有 Python 脚本（`~/.codex/skills/.system/imagegen/`）做绿幕抠图，与 API 侧已有的 OpenAI 透明底生图并存两套逻辑。

## 修复

- 新增 `src/server/player-first-hosting.ts`，由 `src/server/index.ts` 在 `handleApi` 最前面挂载，两个 HTTP 服务（工作台 4312、游戏源 4313）都提供对应静态托管：
  - `GET /play/<projectId>/<file>`：稳定发布，仅在数据库游戏槽位未命中时兜底，落盘目录仍为 `.studio-data/releases`，同一构建 ID 文件不可变。
  - `GET /__preview/<token>/<file>`：内存预览，默认 30 分钟到期后 410，带 `X-Robots-Tag: noindex`。
  - `GET /generated/<file>.png`：生图落盘目录 `public/generated`。
- 生图改走 `CoverArtGenerator.generateAsset`，与制作流水线共用同一套提供方重试、透明校验与尺寸适配；透明主体由提供方直接输出透明底，服务端只做透明裁切与按角色上限缩小（上限沿用 `scripts/process_game_asset.py`），不再依赖 Python。
- `vite.config.ts` 删除三个中间件和相关依赖，只保留 `/api`、`/media`、`/generated` 代理，开发态与部署态走同一份实现。
- 发布与预览网址使用 `PUBLIC_GAME_ORIGIN`（本机为 `http://127.0.0.1:4313`），与其它生成游戏一样落在跨源隔离的游戏源。

## 证据边界

- 自动测试：`tests/player-first-hosting.test.ts`（node --test，真实 HTTP + 临时目录 + 本地假图片提供方，无付费调用）。
- 未做：真实部署机上的端到端验证；`/player-first` 页面在 4313 网址下的真机预览扫码流程尚未用真机重跑。
