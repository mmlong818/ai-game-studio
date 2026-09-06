import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, resolve, sep } from "node:path";

interface AiArtEntry {
  file?: unknown;
  role?: unknown;
  bytes?: unknown;
  prompt?: unknown;
}

interface AiArtManifest {
  schemaVersion?: unknown;
  model?: unknown;
  generatedAt?: unknown;
  entries?: unknown;
}

const rasterExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function hasValidRasterSignature(file: string, extension: string) {
  const header = readFileSync(file).subarray(0, 12);
  if (extension === ".png") return header.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (extension === ".jpg" || extension === ".jpeg") return header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
  if (extension === ".webp") return header.subarray(0, 4).toString("ascii") === "RIFF" && header.subarray(8, 12).toString("ascii") === "WEBP";
  return false;
}

function listFiles(root: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...listFiles(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function isInside(root: string, target: string) {
  const normalizedRoot = `${resolve(root)}${sep}`.toLowerCase();
  return resolve(target).toLowerCase().startsWith(normalizedRoot);
}

export function inspectRasterAiArt(root: string, source = ""): string[] {
  const failures: string[] = [];
  const svgFiles = listFiles(root).filter((file) => extname(file).toLowerCase() === ".svg");
  if (svgFiles.length > 0 || /<svg\b|image\/svg\+xml|\.svg(?:[?#"')\s]|$)/i.test(source)) {
    failures.push("游戏产物不得包含或引用 SVG");
  }
  if (!source.includes("./assets/background.png")) {
    failures.push("游戏代码未实际加载 AI 局内背景 ./assets/background.png");
  }

  const manifestPath = resolve(root, "_studio", "DYNAMIC_ART.json");
  if (!existsSync(manifestPath)) {
    failures.push("缺少 AI 生图溯源 _studio/DYNAMIC_ART.json");
    return failures;
  }

  let manifest: AiArtManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as AiArtManifest;
  } catch {
    failures.push("AI 生图溯源文件无法解析");
    return failures;
  }
  if (manifest.schemaVersion !== 2) failures.push("AI 生图溯源版本必须为 2");
  if (typeof manifest.model !== "string" || !/^gpt-image-\d+(?:\.\d+)*(?:-mini)?(?:-\d{4}-\d{2}-\d{2})?$/.test(manifest.model)) failures.push("AI 生图必须记录实际使用的 GPT Image 模型");
  if (typeof manifest.generatedAt !== "string" || Number.isNaN(Date.parse(manifest.generatedAt))) failures.push("AI 生图时间未完整归档");
  if (!Array.isArray(manifest.entries)) {
    failures.push("AI 生图溯源缺少资产条目");
    return failures;
  }

  const entries = manifest.entries as AiArtEntry[];
  const normalizedEntries = entries.map((entry) => ({
    ...entry,
    normalizedFile: typeof entry.file === "string" ? entry.file.replaceAll("\\", "/").toLowerCase() : "",
  }));
  if (!normalizedEntries.some((entry) => entry.role === "封面" && entry.normalizedFile === "assets/cover.png")) {
    failures.push("缺少 AI 生成的封面位图 assets/cover.png");
  }
  if (!normalizedEntries.some((entry) => entry.role === "局内背景" && entry.normalizedFile === "assets/background.png")) {
    failures.push("缺少 AI 生成的局内背景位图 assets/background.png");
  }

  for (const entry of entries) {
    const relativePath = typeof entry.file === "string" ? entry.file : "";
    const assetPath = resolve(root, relativePath);
    if (!relativePath || !isInside(root, assetPath)) {
      failures.push("AI 生图资产路径无效");
      continue;
    }
    const extension = extname(assetPath).toLowerCase();
    if (!rasterExtensions.has(extension)) failures.push(`AI 生图资产不是允许的位图:${relativePath}`);
    if (!existsSync(assetPath) || statSync(assetPath).size < 500) {
      failures.push(`AI 生图资产缺失或为空:${relativePath}`);
    } else {
      const actualBytes = statSync(assetPath).size;
      if (entry.bytes !== actualBytes) failures.push(`AI 生图资产字节记录不一致:${relativePath}`);
      if (!hasValidRasterSignature(assetPath, extension)) failures.push(`AI 生图资产内容不是有效位图:${relativePath}`);
    }
    if (typeof entry.prompt !== "string" || entry.prompt.trim().length < 20) failures.push(`AI 生图提示词未完整归档:${relativePath}`);
  }
  return [...new Set(failures)];
}

export function assertRasterAiArt(root: string, source = "") {
  const failures = inspectRasterAiArt(root, source);
  if (failures.length > 0) throw new Error(`AI 位图美术门禁未通过:${failures.join(";")}`);
}
