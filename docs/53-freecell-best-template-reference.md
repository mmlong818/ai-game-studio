# 《空档接龙》固定游戏合同与实现记录

> 更新日期：2026-09-03  
> 当前对象：固定独立游戏 `fixtures/freecell`（`fixture_kind = "freecell"`，稳定网址 `/play/freecell/`）  
> 目标：把经典 FreeCell 作为第 15 款官方游戏进入游戏大厅，规则、牌局、美术与测试都可追溯。

## 1. 为什么走“固定游戏”而不是模板运行时

| 方案 | 做法 | 取舍 |
| --- | --- | --- |
| 模板运行时 | 新增 `GameTemplate` 枚举、`src/server/game-runtimes/freecell.ts`、模板改造建议、模板美术包、设计合同映射、14 套模板回归 | 用户可以基于它“改造”出新项目；但要触及 `contracts.ts`、`game-artifact.ts`、`game-generator.ts`、`idea-analyzer.ts` 以及所有 `tests/game-templates.test.ts` 之类的“14 个模板”断言，改动面大且与本任务的“一款官方游戏进大厅”目标不成比例 |
| 固定游戏（采用） | 与《星梦对决》同路：自包含静态产物放在 `fixtures/freecell`，服务启动时 `StudioRepository.ensureOfficialFixtures()` 把它注册为已发布的官方项目，`/play/freecell/` 与 `/version/<id>/` 直接从 fixtures 目录提供文件 | 立即出现在大厅、可独立测试、纸牌规则模块可被 Node 单测直接导入；代价是用户暂时不能把它作为改造起点（与《星梦对决》一致） |

为了让第二个固定游戏进入平台，`studio-repository.ts` 把原先写死的 `ensureGoldenFixture()` 泛化为 `officialFixtures` 定义表 + `ensureOfficialFixture(kind)`，并保留 `ensureGoldenFixture()` 作为兼容入口。封面沿用 `coverUrl` 默认分支 `assets/cover.png`（竖版 1024×1536），大厅只对使用方形 App 图标的固定游戏保留“方形留白”。

## 2. 规则合同

- 52 张牌、8 列牌堆（前 4 列 7 张、后 4 列 6 张）、4 个空档、4 个按花色（梅花、方块、红心、黑桃）从 A 到 K 的收牌堆。
- 列内只能把“颜色相反、点数小 1”的牌叠到底牌上；空列可放任何牌。
- 一次只移动一张，但允许**超级移动**：底部连续有序牌组一次最多移动 `(空档数 + 1) × 2^(空列数)` 张；目标是空列时该空列不计入。
- 玩家每次移动后自动执行**安全收牌**：A、2 直接收；点数 r 的牌只在两种相反颜色的 r-1 都已进收牌堆后才自动收（不会收走别人还需要的底牌）。自动收牌不计步数。
- 撤销：最多 500 步历史，撤销恢复到该步之前（包含被自动收走的牌）；胜利后不能撤销。
- 重开本关：重新发同一号牌局，步数与用时归零。
- 输入：点击（选牌 → 点目标；再点同一张牌自动放置）、拖拽（Pointer Events，可拖整组）、键盘（←/→ 移动光标，↑/↓ 切换上排/牌列，空格选牌/循环选牌数量，回车放牌或自动放置，1–8 直接选列，U 撤销，H 提示，R 重开，N 下一关）。
- 提示：调用同一份求解器（40k 节点上限）给出下一步。

规则全部在 `fixtures/freecell/game-core.js`（纯 ES 模块，无 DOM 依赖），`app.js` 只负责渲染与输入，不重复实现合法性判断。

## 3. 100 关：生成与校验

- 第 n 关 = Microsoft FreeCell 第 n 号牌局。发牌算法：`seed = (seed * 214013 + 2531011) mod 2^32`，取 `(seed >> 16) & 0x7fff`，对剩余牌数取模，从 52 张牌中逐张交换取出，按“从左到右、从上到下”发到 8 列。牌编码 `card = rank * 4 + suit`，花色顺序 C、D、H、S。
- 校验一：`tests/freecell-core.test.ts` 用公开的第 1 号牌局牌面（`JD 2D 9H JC 5D 7H 7C 5H / KD KC 9S 5S AD QC KH 3H / …`）与第 617 号牌局首行锁定算法。
- 校验二：`game-core.js` 内置有界最佳优先求解器（`solve`，安全自动收牌 + 状态去重 + 启发式），单测把 1–100 号牌局全部求解（150k 节点上限，本机约 5 秒），并逐步回放解路径验证每一步 `validateMove` 合法、最终 `isWon`。这与公开记录一致：Microsoft 前 32000 局中只有 11982 号不可解，1–100 全部可解。
- 进度保存在 `localStorage["freecell.progress.v1"]`（已解锁关数、每关步数/秒数/最佳），局中状态保存在 `freecell.session.v1`，刷新可恢复；通关后解锁下一关并弹出步数与用时。

## 4. 牌背替换

- 入口：顶部牌背缩略图或工具栏“牌背”按钮 → 对话框内“选择图片”（`<input type="file" accept="image/*">`）。
- 处理：图片在浏览器内用 `Image` 解码 → 以“覆盖”比例填满 5:7 画布，可用滑块缩放/平移取景 → 导出 500×700 JPEG（质量 0.86，约 60–150KB）data URL。
- 存储：`localStorage["freecell.cardBack.v1"]`；启动时读取并写入 CSS 变量 `--card-back`，用于发牌动画中的牌背、顶部牌背缩略图与通关面板。`body[data-card-back]` 标记 `custom/default`。
- “恢复默认牌背”删除该键并回到 `assets/card-back.png`。整个流程没有任何网络请求（单测断言 `app.js` 不含 `fetch(`/`XMLHttpRequest`）。

## 5. AI 美术与溯源

脚本：`scripts/generate-freecell-art.mjs`（`NODE_USE_ENV_PROXY=1 node scripts/generate-freecell-art.mjs [--env-file <path>] [--force]`）。密钥来自环境变量或 `.env.local`，只用于请求，不写入任何产物。

| 原图（`assets/templates/freecell-source/`） | 尺寸 | 用途 | 切分结果（`fixtures/freecell/assets/`） |
| --- | --- | --- | --- |
| `cover-source.png` | 1024×1536 | 大厅封面 | `cover.png`（1024×1536） |
| `card-back-source.png` | 1024×1536 | 默认牌背 | `card-back.png`（居中裁切 5:7 → 500×700） |
| `suit-atlas-source.png` | 1024×1024 透明 | 2×2 花色图集 | `suits/{spade,heart,diamond,club}.png`（256×256） |
| `court-atlas-source.png` | 1536×1024 透明 | 4×3 人头图集（J/Q/K × 黑桃/红心/方块/梅花） | `courts/{jack,queen,king}-{suit}.png`（320×320） |
| `background-source.png` | 1024×1536 | 局内桌面 | `background.png`（512×768） |

- 模型 `gpt-image-2`，接口 `https://api.openai.com/v1/images/generations`，与 `src/server/image-generator.ts` 相同；切图、裁切、缩放由 Playwright Chromium 的 canvas 完成（本机没有 PIL）。
- 每张原图与切图的 prompt、字节数、sha256 记录在 `fixtures/freecell/_studio/ART_PROVENANCE.md`；`_studio/DYNAMIC_ART.json` 采用平台 `schemaVersion: 2` 溯源格式（封面 + 局内背景 + 全部切图）。
- 牌面 = 白底 + 程序叠加的点数文字 + AI 花色切图；J/Q/K 中央为 AI 人头切图。44px 宽的牌在 390×844 手机上点数与花色可辨（角标横排，避免被下一张牌遮住）。
- 交付包无任何 SVG（单测扫描文件与源码）。

## 6. 测试与证据

- `tests/freecell-core.test.ts`（Node）：发牌算法、叠放/收牌合法性、超级移动上限、安全自动收牌、100 关可解、自动放置优先级、纯位图与溯源门禁。
- `tests/browser/freecell.spec.ts`（Playwright）：Chromium 真实点击通关第 1 关（含撤销、8 次超级移动、进度解锁到第 2 关）；390×844 手机竖屏无横向溢出、44px 工具按钮、拖拽移动+撤销；键盘选牌/放牌/撤销；更换牌背 → 刷新仍生效 → 恢复默认。
- `tests/studio-repository.test.ts`：固定游戏注册幂等、官方标记、稳定网址、封面地址、大厅列表同时包含两款固定游戏。

## 7. 如何让它出现在游戏大厅

固定游戏不经过 `scripts/seed-showcase-games.ts` 的 API 建项目流程，而是在 API 服务启动时自动注册（登记见 `src/shared/official-games/freecell.ts`，操作手册见 `docs/55-adding-an-official-game.md`）：

1. 合并本分支后重启 API 服务（`npm run dev` 或 `npm start`）。`StudioRepository.ensureOfficialFixtures()` 会在数据库中插入 `fixture_kind = "freecell"` 的官方项目、版本、发布记录和构建记录，并写入 `studio_meta.freecell_fixture_initialized`。
2. `GET /api/health` 的 `officialFixtureIds.freecell` 返回项目 ID；`GET /api/games` 中出现《空档接龙》，稳定网址 `/play/freecell/`。
3. `npm run seed:showcases` 结束时会检查大厅是否包含两款固定游戏并给出提示。
4. 若管理员删除过该项目（归档后永久删除），`freecell_fixture_initialized` 已存在，服务不会再自动重建，与《星梦对决》行为一致。

## 8. 未完成与需人工确认

- 真人双视角复核（玩法设计 + 界面体验）与实体手机扫码试玩仍是发布凭证，本文件只提供自动证据。
- 人头牌是 AI 图集切分，个别人物在 320px 以下会失去细节，主美可决定是否重新生成更简洁的构图。
- 目前不支持把《空档接龙》作为“改造起点”，若产品需要该能力应另立模板运行时任务。
