import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, posix, resolve, sep } from "node:path";
import { unzipSync, type UnzipFileInfo } from "fflate";
import type { CuratedResourcePack } from "../shared/resource-sources/curated.js";

export type CuratedArchiveInspection = {
  packId: string;
  archiveSha256: string;
  licenseSha256: string;
  selected: Array<{ path: string; bytes: number }>;
  selectedBytes: number;
  excludedEntries: number;
  status: "approved-for-normalization";
};

const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
const safeArchivePath = (name: string) => {
  const normalized = name.replace(/\\/g, "/");
  return normalized.length > 0 && normalized === posix.normalize(normalized) && !normalized.startsWith("/") && !normalized.includes("\0") && !normalized.split("/").includes("..");
};
const isSelected = (pack: CuratedResourcePack, name: string) => {
  const extension = extname(name).toLowerCase();
  return pack.selector.extensions.includes(extension) && (pack.selector.exactPaths.includes(name) || pack.selector.prefixes.some((prefix) => name.startsWith(prefix)));
};

async function loadCuratedResourceArchive(pack: CuratedResourcePack, archivePath: string) {
  const archive = await readFile(archivePath);
  if (archive.byteLength > pack.maxArchiveBytes) throw new Error(`资源包超过压缩体积预算：${archive.byteLength} > ${pack.maxArchiveBytes}`);
  const archiveHash = sha256(archive);
  if (archiveHash !== pack.archiveSha256) throw new Error(`资源包哈希不匹配：${archiveHash}`);
  let expandedBytes = 0;
  let totalEntries = 0;
  let selectedEntries = 0;
  const filter = (file: UnzipFileInfo) => {
    totalEntries += 1;
    if (!safeArchivePath(file.name)) throw new Error(`资源包包含不安全路径：${file.name}`);
    if (file.originalSize > pack.maxEntryBytes) throw new Error(`资源文件超过单文件预算：${file.name}`);
    expandedBytes += file.originalSize;
    if (expandedBytes > pack.maxExpandedBytes) throw new Error(`资源包超过展开体积预算：${expandedBytes}`);
    const selected = file.name === pack.licenseEntry || isSelected(pack, file.name);
    if (selected && file.name !== pack.licenseEntry) selectedEntries += 1;
    return selected;
  };
  const extracted = unzipSync(new Uint8Array(archive), { filter });
  const license = extracted[pack.licenseEntry];
  if (!license) throw new Error(`资源包缺少许可文件：${pack.licenseEntry}`);
  const licenseHash = sha256(license);
  if (licenseHash !== pack.licenseSha256) throw new Error(`许可原文哈希不匹配：${licenseHash}`);
  const selected = Object.entries(extracted).filter(([name]) => name !== pack.licenseEntry).map(([path, bytes]) => ({ path, bytes: bytes.byteLength }));
  if (selected.length !== selectedEntries || selected.length < pack.expectedMinimumSelected) throw new Error(`精选文件不足：${selected.length} < ${pack.expectedMinimumSelected}`);
  const report: CuratedArchiveInspection = { packId: pack.id, archiveSha256: archiveHash, licenseSha256: licenseHash, selected, selectedBytes: selected.reduce((sum, item) => sum + item.bytes, 0), excludedEntries: totalEntries - selected.length - 1, status: "approved-for-normalization" };
  return { report, extracted, license };
}

export async function inspectCuratedResourceArchive(pack: CuratedResourcePack, archivePath: string): Promise<CuratedArchiveInspection> {
  return (await loadCuratedResourceArchive(pack, archivePath)).report;
}

async function writeImmutable(path: string, bytes: Uint8Array | string) {
  try {
    await writeFile(path, bytes, { flag: "wx" });
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "EEXIST") throw error;
    const existing = await readFile(path);
    const expected = typeof bytes === "string" ? Buffer.from(bytes) : Buffer.from(bytes);
    if (!existing.equals(expected)) throw new Error(`资源库已有不同内容，拒绝覆盖：${path}`);
  }
}

export async function importCuratedResourceArchive(pack: CuratedResourcePack, archivePath: string, libraryRoot: string) {
  const { report, extracted, license } = await loadCuratedResourceArchive(pack, archivePath);
  const familyRoot = resolve(libraryRoot, pack.familyId);
  await mkdir(familyRoot, { recursive: true });
  const inventory = [];
  for (const item of report.selected) {
    const bytes = extracted[item.path];
    if (!bytes) throw new Error(`扫描后精选文件丢失：${item.path}`);
    const target = resolve(familyRoot, item.path);
    if (!target.startsWith(`${familyRoot}${sep}`)) throw new Error(`资源路径越出资源族目录：${item.path}`);
    await mkdir(dirname(target), { recursive: true });
    await writeImmutable(target, bytes);
    inventory.push({ path: item.path, bytes: bytes.byteLength, sha256: sha256(bytes) });
  }
  await writeImmutable(resolve(familyRoot, "LICENSE.txt"), license);
  const manifest = {
    schemaVersion: "curated-resource-family-v1",
    familyId: pack.familyId,
    packId: pack.id,
    importedAt: pack.source.acquiredAt,
    source: pack.source,
    archive: { fileName: pack.archiveFileName, sha256: report.archiveSha256, downloadUrl: pack.downloadUrl },
    license: { entry: pack.licenseEntry, sha256: report.licenseSha256 },
    selectionRationale: pack.selectionRationale,
    assets: inventory,
  };
  await writeImmutable(resolve(familyRoot, "RESOURCE_FAMILY.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return { familyRoot, manifest, report };
}
