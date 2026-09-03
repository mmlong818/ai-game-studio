/**
 * 引擎层 · 运行时打包。runtime/*.js 是可直接在 Node 里 import 的 ESM 片段（便于单测）；
 * 写产物时把 `export` 前缀剥掉后按固定顺序拼进 app.js，产物因此自包含（引擎随 vendor/ 交付，不走 CDN，也不需要打包器）。
 * 目录以仓库根为基准解析：src/engine/playcanvas 与 dist-server/engine/playcanvas 都在根下三层，tsc 不会复制 .js，所以始终读源目录。
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(moduleRoot, "..", "..", "..");
export const engineRuntimeRoot = join(repositoryRoot, "src", "engine", "playcanvas", "runtime");

/** 片段顺序即依赖顺序：全部是工厂函数，不在顶层执行任何东西。 */
export const engineRuntimeFiles = ["color.js", "geometry.js", "materials.js", "entities.js", "bootstrap.js", "scene-graph.js", "behaviors.js", "rules.js", "input.js", "debug.js"] as const;

export type EngineRuntimeFile = (typeof engineRuntimeFiles)[number];

export function readEngineRuntimeFile(file: EngineRuntimeFile): string {
  return readFileSync(join(engineRuntimeRoot, file), "utf8");
}

/** 剥掉 ESM 导出语法（只允许顶层 `export function|class|const|let`），保持其它文本原样。 */
export function stripModuleExports(source: string): string {
  if (/^\s*import\s/m.test(source)) throw new Error("引擎运行时片段不允许 import：依赖必须通过参数注入");
  return source.replace(/^export (function|class|const|let|async function) /gm, "$1 ");
}

export function engineRuntimeScript(files: readonly EngineRuntimeFile[] = engineRuntimeFiles): string {
  const parts = files.map((file) => `// ==== engine/playcanvas/runtime/${file} ====\n${stripModuleExports(readEngineRuntimeFile(file))}`);
  return `\n// ---- 平台游戏引擎层（PlayCanvas 底座）运行时 · 由 src/engine/playcanvas/runtime/*.js 内嵌 ----\n${parts.join("\n")}\n`;
}

/** 返回每个片段导出的工厂函数名（用于测试守卫与文档 API 一览）。 */
export function engineRuntimeExports(): Record<EngineRuntimeFile, string[]> {
  return Object.fromEntries(engineRuntimeFiles.map((file) => [file, [...readEngineRuntimeFile(file).matchAll(/^export (?:function|class|const|let|async function) ([A-Za-z0-9_$]+)/gm)].map((match) => match[1])])) as Record<EngineRuntimeFile, string[]>;
}
