import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { LOCAL_DESIGN_SOURCES } from "../src/shared/game-design-knowledge/local-design-sources.js";

const sourceRoot = path.resolve(process.argv[2] ?? "D:/Admin/Desktop/game");
const failures: string[] = [];

for (const source of LOCAL_DESIGN_SOURCES) {
  const absolutePath = path.resolve(sourceRoot, source.relativePath);
  if (absolutePath !== sourceRoot && !absolutePath.startsWith(`${sourceRoot}${path.sep}`)) {
    failures.push(`${source.relativePath}: 路径超出资料目录`);
    continue;
  }
  try {
    const fileStat = await stat(absolutePath);
    const bytes = await readFile(absolutePath);
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (!fileStat.isFile()) failures.push(`${source.relativePath}: 不是文件`);
    if (fileStat.size !== source.bytes) failures.push(`${source.relativePath}: 大小已变化（${source.bytes} → ${fileStat.size}）`);
    if (sha256 !== source.sha256) failures.push(`${source.relativePath}: 内容指纹已变化`);
  } catch (error) {
    failures.push(`${source.relativePath}: 无法读取（${error instanceof Error ? error.message : "未知错误"}）`);
  }
}

if (failures.length) {
  console.error(`本地设计资料校验失败：${failures.length} 项`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`本地设计资料校验通过：${LOCAL_DESIGN_SOURCES.length} 份文件，摘要与内容指纹一致。`);
}
