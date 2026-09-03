# 新增一款官方游戏：操作手册

> 更新日期：2026-09-03
> 登记表：`src/shared/official-games/`　守卫测试：`src/shared/official-games/registry.test.ts`、`tests/official-catalog.test.ts`

官方游戏（进游戏大厅的平台游戏）只有一个真相来源：**登记表** `src/shared/official-games/<id>.ts`。
GAME_TEMPLATES、GOLDEN_SCENARIOS、创作侧运行时定义、TEMPLATE_MECHANIC_MAP、服务端模板枚举 `gameTemplateSchema`、
`SERVER_TEMPLATE_TO_DOMAIN` / `FIXTURE_TEMPLATE_TO_DOMAIN` / `THREE_MODE_TO_DOMAIN` / `DOMAIN_TEMPLATE_ART`、`officialFixtures`、
seed 清单和大厅顺序全部由它派生。**不允许再在这些地方手写条目**；守卫测试会在两处不一致时失败。

## 五步

### 1. 跑脚手架

```bash
npm run game:new -- <id> --kind fixture|template|three --title "中文名"
```

- `fixture`：自包含静态游戏，放在 `fixtures/<id>/`，服务启动时直接注册发布（如星梦对决、空档接龙）。
- `template`：有服务端运行时 `src/server/game-runtimes/<id>.ts` 与美术包 `assets/templates/packs/<id>/`，用户可以基于它改造（如折光堆叠）。
- `three`：3D 游戏，按 `threeMode`（collector / arena / popup）走 three 运行时（如纸境 · 立体书迷宫）。

脚手架生成登记文件（带 TODO）并追加进 `index.ts`、参照文档骨架 `docs/NN-<id>-best-template-reference.md`、
固定型的 `fixtures/<id>/` 骨架与 `_studio/ART_PROVENANCE.md` 模板、模板型 / 3D 型的美术目录。`lobbyRank` 默认追加到最后一位。

### 2. 填登记与美术溯源

逐项替换登记文件里的 TODO。字段一览：

| 字段 | 含义 | 必填 |
| --- | --- | --- |
| `id` / `title` / `kind` | 登记 id（也是目录名）、大厅中文名、落地方式 | 全部 |
| `serverTemplate` | 服务端 `GameTemplate` 枚举值；枚举由此派生 | template 必填；fixture 可选（spec 所落模板） |
| `fixtureKind` + `fixture{metaKey,buildOutputs}` | fixtures 目录名、启动注册的初始化标记与六步构建输出 | fixture |
| `threeMode` | 3D 模式 | three |
| `lobbyRank` | 大厅顺序，1 起连续唯一 | 全部 |
| `cover` | 封面路径：`fixtures/<kind>/assets/cover.png`、`assets/templates/packs/<t>/cover.png`、`assets/starter/<id>/cover.png` | 全部 |
| `referenceDoc` | 参照文档路径 | 全部 |
| `domainTemplate` | 创作页玩法模板（id、name、genre、pitch、coreLoop、coreRules、capabilities、suggestions=commonSuggestions(...)、redirectExamples） | 全部 |
| `probeKind` / `probeScenario` | 探针种类（缺省 golden，用 probeScenario 驱动通用探针；专属探针写 merge-grid / tile-roguelite / collect-escape-3d / paper-popup）与动作→事件合同 | 全部 |
| `runtimeDefinition` | 创作侧运行时三步动作、三条反馈与样式类名 | 全部 |
| `mechanicId` | R2 研究用的内部机制 id（MECHANIC_LIBRARY） | 全部 |
| `seed{idea,artStyle,visualStyle}` | `npm run seed:showcases` 建示范项目用；标题取 `title` | template / three |

美术：所有位图必须是可追溯的 AI 位图。固定型填 `fixtures/<id>/_studio/ART_PROVENANCE.md`；模板型用 `scripts/generate-template-assets.mjs` 产出美术包与 `asset-manifest.json`。封面文件必须真实存在，守卫测试会检查。

### 3. 实现运行时或固定游戏

- fixture：实现 `fixtures/<id>/`（规则内核 `game-core.js` 可被 `tests/*.test.ts` 直接导入），并在 `src/server/official-fixtures.ts` 的 `fixtureSpecBuilders` 加上 ProjectInput 与验收合同构造。
- template：实现 `src/server/game-runtimes/<id>.ts` 并登记到 `game-runtimes/index.ts` 的 `runtimes`（类型由枚举派生，漏了会编译失败）；补 `contracts.ts` 的 `templateDefaults` / `modernVisualStyles` / `designBlueprints`、`templateSignals` 关键词与 `level-progression.ts`。
- three：已有模式只需 seed.idea 能被 `generateGameSpec` 判定；新模式要扩展 `threeMode` 枚举、three 运行时与蓝图。
- 专属探针（若需要）：在 `src/domain/probe.ts` 新增探针类并登记到 `PROBE_FACTORIES`，登记文件 `probeKind` 指向它。

### 4. 跑守卫测试与三浏览器

```bash
npm run typecheck && npm test        # vitest（含 registry.test.ts）+ legacy（含 official-catalog.test.ts）
npm run build
npm run test:browsers                # Chromium 必过，Firefox / WebKit 顺带
```

守卫测试逐项指出缺哪一件：id 唯一、lobbyRank 连续唯一且与锁定序列一致（改大厅顺序需产品负责人确认后同步更新 `LOCKED_LOBBY_ORDER`）、kind 与字段组合、封面与参照文档文件存在、探针可创建、运行时定义与机制 id 存在、服务端枚举与模板目录标题与登记一致、固定游戏有 spec 构造、启动同步幂等。

### 5. 合并后重启服务自动进大厅

服务启动时 `ensureOfficialFixtures()` 注册固定游戏，随后 `syncOfficialCatalog()` 按登记表把**已发布且匹配**的项目标记 `is_official` 并写入 `lobby_rank`：
fixture 按 `fixture_kind`，template 按 `title + spec.template`，three 按 `title + 3d + threeMode`。未登记的项目（例如 AI 原创转官方的“虫虫攀枝”）一律不动；重复执行幂等。
模板型 / 3D 型示范项目用 `npm run seed:showcases -- <id>` 通过 API 建好并发布后，重启服务即可出现在登记的位置，不再需要手工 SQL。

## 不允许的做法

- 在 `templates.ts`、`probe.ts`、`runtimeGenerator.ts`、`App.tsx`、`templateResolution.ts`、`contracts.ts` 枚举、`studio-repository.ts` 或 seed 脚本里手写某款官方游戏的条目。
- 用 SQL 直接改 `is_official` / `lobby_rank` 来调整登记表内游戏的位置——改登记文件里的 `lobbyRank`。
- 登记了却不实现：守卫测试与类型检查会拦住。
