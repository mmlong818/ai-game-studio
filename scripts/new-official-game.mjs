#!/usr/bin/env node
// 官方游戏脚手架：新增一款官方游戏时只需要一个目录和一份登记文件，其余全部由登记表派生。
//
// 用法：
//   npm run game:new -- <id> --kind fixture|template|three --title "中文名"
//   例：npm run game:new -- sokoban --kind template --title "推箱迷仓"
//
// 生成物：
//   - src/shared/official-games/<id>.ts          登记文件（带 TODO），并追加进 index.ts
//   - docs/NN-<id>-best-template-reference.md    参照文档骨架
//   - fixture：fixtures/<id>/{index.html,assets/,_studio/ART_PROVENANCE.md} 目录骨架
//   - template：assets/templates/packs/<id>/ 美术包目录；three：assets/starter/<id>/ 目录
// 操作手册：docs/55-adding-an-official-game.md
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const positional = args.filter((argument) => !argument.startsWith("--"));
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return undefined;
  return args[index + 1];
};

const id = positional[0];
const kind = option("kind");
const title = option("title");
const KINDS = ["fixture", "template", "three"];

function fail(message) {
  console.error(`✖ ${message}`);
  console.error('用法：npm run game:new -- <id> --kind fixture|template|three --title "中文名"');
  process.exit(1);
}

if (!id || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(id)) fail("id 必须是 kebab-case，例如 sokoban 或 word-chain。");
if (!KINDS.includes(kind)) fail(`--kind 必须是 ${KINDS.join(" | ")} 之一。`);
if (!title || !title.trim()) fail("--title 不能为空。");

const registryDir = join(root, "src", "shared", "official-games");
const registryFile = join(registryDir, `${id}.ts`);
const indexFile = join(registryDir, "index.ts");
if (existsSync(registryFile)) fail(`登记文件已存在：${registryFile}`);
const indexSource = readFileSync(indexFile, "utf8");
if (!indexSource.includes("// @scaffold:insert")) fail("index.ts 缺少 // @scaffold:insert 标记，无法自动追加。");

const exportName = id.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
const templateId = kind === "three" ? `${id}-3d` : id;

// 大厅顺序：追加到最后一位。
const rankMatches = readdirSync(registryDir)
  .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts") && !["index.ts", "types.ts", "suggestions.ts"].includes(file))
  .map((file) => readFileSync(join(registryDir, file), "utf8").match(/lobbyRank:\s*(\d+)/)?.[1])
  .filter(Boolean)
  .map(Number);
const lobbyRank = (rankMatches.length ? Math.max(...rankMatches) : 0) + 1;

// 参照文档编号：docs/ 下最大数字前缀 + 1。
const docNumbers = readdirSync(join(root, "docs")).map((file) => file.match(/^(\d+)-/)?.[1]).filter(Boolean).map(Number);
const docNumber = String((docNumbers.length ? Math.max(...docNumbers) : 0) + 1).padStart(2, "0");
const referenceDoc = `docs/${docNumber}-${id}-best-template-reference.md`;

const cover = kind === "fixture"
  ? `fixtures/${id}/assets/cover.png`
  : kind === "template"
    ? `assets/templates/packs/${id}/cover.png`
    : `assets/starter/${id}/cover.png`;

const kindFields = kind === "fixture"
  ? `  fixtureKind: "${id}",
  // TODO：如果这款固定游戏的 spec 会落到某个服务端模板（例如 "signal-hunt"），在这里写 serverTemplate。
  fixture: {
    metaKey: "${id.replace(/-/g, "_")}_fixture_initialized",
    // TODO：六步构建输出说明（规则锁定 / 文档 / 代码 / 资源 / 测试 / 网址），写给工作台“制作记录”看。
    buildOutputs: [
      "TODO：核心规则已锁定。",
      "TODO：GAME_DESIGN、ART_DIRECTION、SOUND_DIRECTION 已形成。",
      "TODO：已接入输入、规则与结算逻辑。",
      "TODO：美术、音效与触控反馈已经集成。",
      "TODO：规则测试与页面结构检查通过。",
      "稳定玩家网址和不可变版本网址已生成。",
    ],
  },`
  : kind === "template"
    ? `  serverTemplate: "${id}",
  seed: {
    // TODO：seed 用于 npm run seed:showcases 通过 API 建示范项目。artStyle / visualStyle 必须是 contracts.ts 里的合法值。
    artStyle: "geometric",
    visualStyle: "cute",
    idea: "TODO：一句话描述这款示范游戏的玩法、目标与输入方式，需能被 inferGameTemplate 识别为 ${id}。",
  },`
    : `  threeMode: "TODO", // collector | arena | popup
  seed: {
    // TODO：seed 用于 npm run seed:showcases 创建 3D 示范项目（dimensions=3d，threeMode 由 idea 自动判定）。
    artStyle: "garden",
    visualStyle: "calm",
    idea: "TODO：一句话描述这款 3D 示范游戏，需能让 generateGameSpec 判定为上面的 threeMode。",
  },`;

const registrySource = `import { commonSuggestions } from "./suggestions.js";
import { defineOfficialGame } from "./types.js";

// 由 npm run game:new 生成。请逐项替换 TODO；守卫测试（src/shared/official-games/registry.test.ts）会拦住缺项。
export const ${exportName} = defineOfficialGame({
  id: "${id}",
  title: "${title}",
  kind: "${kind}",
${kindFields}
  lobbyRank: ${lobbyRank},
  cover: "${cover}",
  referenceDoc: "${referenceDoc}",
  // TODO：模板改造触发 R2 研究时使用的内部机制 id（见 src/domain/templates.ts 的 MECHANIC_LIBRARY）。
  mechanicId: "grid-merge",
  domainTemplate: {
    id: "${templateId}",
    name: "TODO：玩法模板名（创作页“改一个现有游戏”里显示）",
    genre: "TODO：类型，例如 反应益智",
    pitch: "TODO：一句话卖点。",
    coreLoop: "TODO：观察 → 操作 → 反馈 → 结算",
    coreRules: ["TODO：规则一", "TODO：规则二", "TODO：规则三"],
    capabilities: ["TODO-capability"],
    suggestions: commonSuggestions(
      "${templateId}",
      "TODO：什么保持不变（核心规则）",
      "TODO：内容与节奏可以怎么换。",
      "TODO：只加入哪一种小机制。",
    ),
    redirectExamples: ["TODO：会被判定为新游戏的需求，例如 实时多人"],
  },
  // probeKind 缺省为 "golden"：用下面的 probeScenario 驱动通用探针。若写了专属探针类，改为它在 PROBE_FACTORIES 里的种类。
  probeScenario: {
    actions: {
      // TODO：动作 id → 产生的事件；rejectedActions 里的动作必须被规则拒绝；completingActions 结束本局。
      "inspect": ["TODO-readable"],
      "invalid-move": ["TODO-blocked"],
      "finish": ["TODO-goal-reached", "session-completed"],
    },
    rejectedActions: ["invalid-move"],
    completingActions: ["finish"],
  },
  runtimeDefinition: {
    actions: ["TODO：动作一", "TODO：动作二", "TODO：动作三"],
    feedback: ["TODO：反馈一", "TODO：反馈二", "TODO：反馈三"],
    className: "${exportName.toLowerCase()}",
  },
});
`;

writeFileSync(registryFile, registrySource, "utf8");

// 追加进 index.ts：import 放在 types 导入之前，条目放在 @scaffold:insert 之前。
const importLine = `import { ${exportName} } from "./${id}.js";\n`;
const withImport = indexSource.replace('import type { OfficialGameDefinition, ServerTemplatesOf } from "./types.js";', `${importLine}import type { OfficialGameDefinition, ServerTemplatesOf } from "./types.js";`);
const withEntry = withImport.replace("  // @scaffold:insert", `  ${exportName},\n  // @scaffold:insert`);
writeFileSync(indexFile, withEntry, "utf8");

// 参照文档骨架。
const today = new Date().toISOString().slice(0, 10);
writeFileSync(join(root, referenceDoc), `# 《${title}》最佳模板参照与实现合同

> 更新日期：${today}
> 登记：\`src/shared/official-games/${id}.ts\`（kind = "${kind}"，lobbyRank ${lobbyRank}）
> 操作手册：docs/55-adding-an-official-game.md

## 1. 目标与边界

TODO：一句话说明这款游戏为什么值得成为官方游戏，以及它不做什么。

## 2. 可追溯参照

| 参照 | 来源 | 日期 | 可学习边界 |
| --- | --- | --- | --- |
| 同玩法主参照 | TODO | ${today} | 只学习规则结构与节奏，不复制名称、品牌、视觉识别与素材 |
| 表现参照 | TODO | ${today} | TODO |
| 移动端或结算参照 | TODO | ${today} | TODO |

## 3. 规则合同

- TODO：核心规则逐条列出，与登记文件 domainTemplate.coreRules 保持一致。

## 4. 输入、镜头与信息层

TODO：桌面与手机各自的输入方式、镜头与画幅、HUD 信息层级。

## 5. 关卡与难度

TODO：进度模型（有限关卡 / 无尽 / 单次旅程 / 回合 / 章节）与难度曲线。

## 6. 美术与声音

TODO：题材方向、画面风格、位图清单与溯源（${kind === "fixture" ? `fixtures/${id}/_studio/ART_PROVENANCE.md` : "构建产物的 _studio/ART_PROVENANCE.md"}）。

## 7. 验收与证据

- 守卫测试：\`npx vitest run src/shared/official-games/registry.test.ts\`
- 规则验证：TODO（合法动作、非法动作、胜负、恢复、可解性、长局稳定性）
- 真实试玩：Chromium / Firefox / WebKit 各完成核心流程，手机与桌面各一次。

## 8. 进入大厅

合并后重启 API 服务：\`syncOfficialCatalog()\` 会按登记表把已发布的项目标记官方并排到第 ${lobbyRank} 位，不需要手工 SQL。
`, "utf8");

const created = [registryFile, join(root, referenceDoc)];
const ensureDir = (path) => { mkdirSync(path, { recursive: true }); created.push(path); };

if (kind === "fixture") {
  const fixtureDir = join(root, "fixtures", id);
  if (existsSync(fixtureDir)) fail(`固定游戏目录已存在：${fixtureDir}`);
  ensureDir(join(fixtureDir, "assets"));
  ensureDir(join(fixtureDir, "_studio"));
  writeFileSync(join(fixtureDir, "assets", ".gitkeep"), "", "utf8");
  writeFileSync(join(fixtureDir, "index.html"), `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <title>${title}</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <!-- TODO：固定游戏自包含静态产物。规则内核放在 game-core.js（可被 Node 单测直接导入），界面放在 app.js。 -->
  <main id="app" aria-label="${title}"></main>
  <script type="module" src="./app.js"></script>
</body>
</html>
`, "utf8");
  writeFileSync(join(fixtureDir, "styles.css"), `/* TODO：${title} 样式。 */\n`, "utf8");
  writeFileSync(join(fixtureDir, "app.js"), `// TODO：${title} 界面与输入；规则请放在 game-core.js。\n`, "utf8");
  writeFileSync(join(fixtureDir, "game-core.js"), `// TODO：${title} 规则内核（纯函数，可被 tests/*.test.ts 直接导入）。\n`, "utf8");
  writeFileSync(join(fixtureDir, "_studio", "ART_PROVENANCE.md"), `# 《${title}》AI 美术溯源

生成时间：TODO  模型：gpt-image-2  接口：TODO

所有位图均由 AI 生成；切图、裁切与缩放脚本：TODO（例如 scripts/generate-${id}-art.mjs）。交付包禁用 SVG 代替游戏美术。

## 原图

| 原图 | 尺寸 | 字节 | sha256 |
| --- | --- | --- | --- |
| TODO | 1024x1536 | TODO | TODO |

## 提示词

### cover（封面，assets/cover.png，竖版 1024×1536）

\`\`\`text
TODO
\`\`\`

## 切图清单

| 文件 | 用途 | 来源原图 | 裁切区 |
| --- | --- | --- | --- |
| assets/cover.png | 大厅封面 | TODO | 整图 |
`, "utf8");
} else if (kind === "template") {
  const packDir = join(root, "assets", "templates", "packs", id);
  ensureDir(packDir);
  writeFileSync(join(packDir, ".gitkeep"), "", "utf8");
} else {
  const starterDir = join(root, "assets", "starter", id);
  ensureDir(starterDir);
  writeFileSync(join(starterDir, ".gitkeep"), "", "utf8");
}

console.log(`✔ 已登记官方游戏 ${id}（${kind}，lobbyRank ${lobbyRank}）`);
for (const path of created) console.log(`  + ${path.replace(root, "").replace(/\\/g, "/").replace(/^\//, "")}`);
console.log("\n接下来：");
console.log(`  1. 填写 src/shared/official-games/${id}.ts 里的全部 TODO，并补 ${cover} 封面与 ${referenceDoc}。`);
if (kind === "fixture") {
  console.log(`  2. 实现 fixtures/${id}/（index.html、app.js、game-core.js、styles.css、assets/），填写 _studio/ART_PROVENANCE.md。`);
  console.log(`  3. 在 src/server/official-fixtures.ts 的 fixtureSpecBuilders 里加 "${id}"：ProjectInput 与验收合同构造。`);
} else if (kind === "template") {
  console.log(`  2. 实现 src/server/game-runtimes/${id}.ts，并在 game-runtimes/index.ts 的 runtimes 表登记；补 contracts.ts 的 templateDefaults / modernVisualStyles / designBlueprints、level-progression.ts 与 templateSignals 关键词。`);
  console.log(`  3. 用 scripts/generate-template-assets.mjs 生成 assets/templates/packs/${id}/ 美术包（含 cover.png 与 asset-manifest.json）。`);
} else {
  console.log("  2. 若是新的 threeMode，需要扩展 contracts.ts 的 threeMode 枚举、three 运行时与蓝图；已有模式只需 seed.idea 能被判定。");
  console.log(`  3. 放置 assets/starter/${id}/cover.png 与场景贴图。`);
}
console.log("  4. 跑 npm run typecheck && npm test（守卫测试会逐项指出缺哪一件），再跑 npm run test:browsers。");
console.log("  5. 合并后重启服务：syncOfficialCatalog() 自动把已发布的项目排进大厅。禁止再手写映射表。");
