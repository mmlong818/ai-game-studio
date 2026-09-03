/**
 * 引擎层 · 产物写入（通用部分）：vendor 引擎复制、许可归属、清单字段、场景计划文档。
 * 游戏专属的溯源文档（贴图提示词、关卡审计…）仍由各游戏自己写；这里只保证“产物自包含、引擎随 vendor/ 交付、许可可追溯”。
 */
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RenderPreset } from "./render-presets.js";
import { manifestPerformanceProfiles } from "./render-presets.js";
import type { ScenePlan } from "./scene-plan.js";
import { summarizeScenePlan } from "./scene-plan.js";
import { repositoryRoot } from "./runtime.js";

export const playcanvasPackageRoot = join(repositoryRoot, "node_modules", "playcanvas");
/** 引擎单文件 ESM 构建（官方 build/playcanvas.mjs），复制到产物 vendor/ 时改名为 .js 以匹配静态服务的 MIME 表。 */
export const playcanvasModuleSource = join(playcanvasPackageRoot, "build", "playcanvas.mjs");
export const playcanvasVendorFile = "playcanvas.module.js";
export const engineLicense = "MIT";

export function playcanvasVersion(): string {
  try { return String((JSON.parse(readFileSync(join(playcanvasPackageRoot, "package.json"), "utf8")) as { version?: string }).version ?? "unknown"); } catch { return "unknown"; }
}

export function assertEngineAvailable() {
  if (!existsSync(playcanvasModuleSource)) throw new Error("PlayCanvas 浏览器运行时缺失（node_modules/playcanvas/build/playcanvas.mjs），请先安装项目依赖。");
}

/** 复制引擎 ESM 与许可证到 <root>/vendor/。返回版本与字节数。 */
export function writeEngineVendor(root: string) {
  assertEngineAvailable();
  mkdirSync(join(root, "vendor"), { recursive: true });
  copyFileSync(playcanvasModuleSource, join(root, "vendor", playcanvasVendorFile));
  const licenseSource = join(playcanvasPackageRoot, "LICENSE");
  if (existsSync(licenseSource)) copyFileSync(licenseSource, join(root, "vendor", "PLAYCANVAS-LICENSE.md"));
  const version = playcanvasVersion();
  return { version, bytes: statSync(join(root, "vendor", playcanvasVendorFile)).size, vendorPath: `vendor/${playcanvasVendorFile}` };
}

/** 产物脚本头：从相对路径 import 引擎，不从网络加载任何代码。 */
export function engineImportHeader() {
  return `import * as pc from "./vendor/${playcanvasVendorFile}";\n`;
}

/** 在 _studio/OPEN_SOURCE_ATTRIBUTION.md 追加（或新建）“3D 引擎：PlayCanvas”一节；幂等。 */
export function writeEngineAttribution(studioRoot: string, version: string, usage = "渲染（实体 / 组件、StandardMaterial、阴影、雾、ACES、CameraFrame 后处理）；游戏规则、几何与美术均为平台自有代码") {
  mkdirSync(studioRoot, { recursive: true });
  const path = join(studioRoot, "OPEN_SOURCE_ATTRIBUTION.md");
  const section = [
    "",
    "## 3D 引擎：PlayCanvas",
    "",
    `- 项目：https://github.com/playcanvas/engine（npm \`playcanvas@${version}\`）`,
    `- 许可证：${engineLicense}（版权 PlayCanvas Ltd.），原文见 \`vendor/PLAYCANVAS-LICENSE.md\` 与平台仓库 \`third_party/playcanvas-LICENSE.md\``,
    `- 接入方式：官方单文件 ESM 构建 \`build/playcanvas.mjs\` 原样复制为 \`vendor/${playcanvasVendorFile}\`，由 \`app.js\` 以相对路径 \`import\` 引入；运行时不从 CDN 加载任何代码`,
    `- 使用范围：${usage}`,
    "- 平台引擎层：`src/engine/playcanvas/`（引导 / 几何 / 材质 / 场景图 / 行为 / 规则桥 / 输入 / 调试 / 产物），见 docs/58-engine-layer.md",
    "",
  ].join("\n");
  if (existsSync(path)) {
    const current = readFileSync(path, "utf8");
    if (!current.includes("## 3D 引擎：PlayCanvas")) appendFileSync(path, section, "utf8");
  } else writeFileSync(path, `# 开源代码归属\n\n此游戏模板没有声明为第三方开源代码移植。\n${section}`, "utf8");
  return path;
}

/** game-manifest.json 中与引擎相关的公共字段。 */
export function engineManifestFields(version: string, preset: RenderPreset) {
  return { engine: "playcanvas" as const, engineVersion: version, engineLicense, renderPreset: preset.id, performanceProfiles: manifestPerformanceProfiles(preset) };
}

/** 引擎自身的溯源记录（写进 THREE_ASSET_PROVENANCE.json 等）。 */
export function engineProvenance(root: string, version: string) {
  return { name: "PlayCanvas", version, license: engineLicense, bundle: `vendor/${playcanvasVendorFile}`, bytes: statSync(join(root, "vendor", playcanvasVendorFile)).size, layer: "src/engine/playcanvas" };
}

/** _studio/ENGINE_SCENE.json：GameProjectV3 → 实体的映射结果与跳过项，供验收与 AI 复核。 */
export function writeEngineSceneReport(studioRoot: string, plan: ScenePlan, extra: Record<string, unknown> = {}) {
  mkdirSync(studioRoot, { recursive: true });
  const path = join(studioRoot, "ENGINE_SCENE.json");
  writeFileSync(path, `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), summary: summarizeScenePlan(plan), skipped: plan.skipped, warnings: plan.warnings, entities: plan.entities.map((entity) => ({ id: entity.id, objectId: entity.objectId, role: entity.role, shape: entity.shape, position: entity.position, size: entity.size, behaviors: entity.behaviors.map((behavior) => behavior.moduleId), textures: entity.textures.map((texture) => texture.path) })), ...extra }, null, 2)}\n`, "utf8");
  return path;
}
