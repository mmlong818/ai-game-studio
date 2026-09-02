// 实验转正候选包导出:把一个 generated 项目的代码、设计合同、审计与验收证据
// 打包到 output/promotion-candidates/<slug>/,供开发者按核对清单沉淀为正式模板。
// 用法: node scripts/export-promotion-candidate.mjs <projectId> [--api http://127.0.0.1:4312]
import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const projectId = process.argv[2];
if (!projectId) {
  console.error("用法: node scripts/export-promotion-candidate.mjs <projectId> [--api <origin>]");
  process.exit(1);
}
const apiFlag = process.argv.indexOf("--api");
const api = apiFlag > -1 ? process.argv[apiFlag + 1] : "http://127.0.0.1:4312";

const detailResponse = await fetch(`${api}/api/projects/${encodeURIComponent(projectId)}`);
const detailPayload = await detailResponse.json();
if (!detailResponse.ok) {
  console.error(`读取项目失败:${detailPayload.error ?? detailResponse.status}`);
  process.exit(1);
}
const project = detailPayload.project;
if (project.spec.template !== "generated") {
  console.error(`该项目不是实验通道作品(template=${project.spec.template}),无需转正导出。`);
  process.exit(1);
}

const artifactRoot = resolve(process.cwd(), "data", "artifacts", project.version.id);
if (!existsSync(join(artifactRoot, "index.html"))) {
  console.error(`没有找到最新版本产物:${artifactRoot}。请先完成一次成功构建。`);
  process.exit(1);
}

const target = resolve(process.cwd(), "output", "promotion-candidates", project.slug);
mkdirSync(target, { recursive: true });

const copies = [
  ["index.html", "index.html"],
  ["game-manifest.json", "game-manifest.json"],
  ["_studio/GENERATED_CODE.json", "GENERATED_CODE.json"],
  ["_studio/RULE_FIDELITY.json", "RULE_FIDELITY.json"],
  ["_studio/GAME_DESIGN.md", "GAME_DESIGN.md"],
  ["_studio/BROWSER_QUALITY_REPORT.json", "BROWSER_QUALITY_REPORT.json"],
];
const copied = [];
for (const [from, to] of copies) {
  const source = join(artifactRoot, from);
  if (existsSync(source)) {
    cpSync(source, join(target, to));
    copied.push(to);
  }
}
const qualityDir = join(artifactRoot, "_studio", "quality");
if (existsSync(qualityDir)) {
  mkdirSync(join(target, "screenshots"), { recursive: true });
  for (const file of readdirSync(qualityDir)) cpSync(join(qualityDir, file), join(target, "screenshots", file));
  copied.push("screenshots/");
}

writeFileSync(join(target, "design-contract.json"), JSON.stringify({
  projectId: project.id,
  title: project.title,
  idea: project.idea,
  versionId: project.version.id,
  versionNumber: project.version.number,
  designProfile: project.spec.designProfile,
  ideaAnalysis: project.spec.ideaAnalysis,
  hardConstraints: project.spec.hardConstraints,
  aspectRatio: project.spec.aspectRatio,
  inputModes: project.spec.inputModes,
  exportedAt: new Date().toISOString(),
}, null, 2), "utf8");

writeFileSync(join(target, "PROMOTION_CHECKLIST.md"), `# ${project.title} · 实验转正核对清单

来源:实验通道项目 ${project.id}(v${project.version.number}),导出于 ${new Date().toISOString()}。

转正为正式模板前必须完成:

- [ ] 通读 index.html,把一次性实现重构为 src/server/game-runtimes/ 下的参数化运行时(接受 campaignLevels/difficulty/visualStyle)。
- [ ] 设计 20 关阶梯难度合同(level-progression.ts 增加 modifiers),替换生成代码内置的关卡表。
- [ ] 制作正式资产包 assets/templates/packs/<id>/(封面、背景、9 张角色位图、音轨,asset-manifest.json 带哈希)。
- [ ] 编写模板专属探针 probeTokens 与浏览器验收分支,替换通用契约验收。
- [ ] contracts.ts:gameTemplateSchema/templateDefaults/designBlueprints/templateSignals 等 Record 全部补条目,并把玩法加入 getTemplateCatalog。
- [ ] 新增 tests/ 用例并跑通 npm run check。
- [ ] RULE_FIDELITY 与 BROWSER_QUALITY 报告中的已知缺口逐条确认已修复或记录。

已导出文件:${copied.join("、")}。
`, "utf8");

console.log(`转正候选包已导出:${target}`);
console.log(`包含:${copied.join("、")}、design-contract.json、PROMOTION_CHECKLIST.md`);
