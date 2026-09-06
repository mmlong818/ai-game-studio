import { access, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { zipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { CuratedResourcePack } from "../shared/resource-sources/curated";
import { importCuratedResourceArchive, inspectCuratedResourceArchive } from "./resource-intake";

const hash = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex").toUpperCase();
async function fixture(entries: Record<string, Uint8Array>) {
  const archive = zipSync(entries);
  const root = await mkdtemp(join(tmpdir(), "resource-intake-"));
  const path = join(root, "pack.zip");
  await writeFile(path, archive);
  const license = entries["License.txt"];
  const pack: CuratedResourcePack = { id: "fixture-pack", label: "Fixture", familyId: "fixture-family", source: { schemaVersion: "resource-source-v1", id: "SOURCE-FIXTURE", sourceUrl: "https://example.com/pack", author: "Fixture", acquiredAt: "2026-09-05T00:00:00.000Z", assetClass: "image", licenseId: "CC0-1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/", licenseTextHash: hash(license), attributionText: null, rights: { commercialUse: true, modification: true, redistribution: true, sourceRedistribution: true }, provenanceNote: "测试来源", reviewedBy: "test", reviewedAt: "2026-09-05T00:00:00.000Z" }, downloadUrl: "https://example.com/pack.zip", archiveFileName: "pack.zip", archiveSha256: hash(archive), licenseEntry: "License.txt", licenseSha256: hash(license), selector: { exactPaths: [], prefixes: ["PNG/"], extensions: [".png"] }, expectedMinimumSelected: 1, maxArchiveBytes: 10000, maxExpandedBytes: 10000, maxEntryBytes: 5000, observedAt: "2026-09-05", selectionRationale: "测试" };
  return { path, pack };
}

describe("精选资源包隔离扫描", () => {
  it("只放行清单选择的格式和路径", async () => {
    const { path, pack } = await fixture({ "License.txt": new TextEncoder().encode("CC0"), "PNG/button.png": new Uint8Array([1, 2]), "Vector/button.svg": new Uint8Array([3]), "unsafe.swf": new Uint8Array([4]) });
    const report = await inspectCuratedResourceArchive(pack, path);
    expect(report.status).toBe("approved-for-normalization");
    expect(report.selected.map(({ path: name }) => name)).toEqual(["PNG/button.png"]);
    expect(report.excludedEntries).toBe(2);
  });

  it("固定哈希变化时拒绝导入", async () => {
    const { path, pack } = await fixture({ "License.txt": new TextEncoder().encode("CC0"), "PNG/button.png": new Uint8Array([1]) });
    await expect(inspectCuratedResourceArchive({ ...pack, archiveSha256: "A".repeat(64) }, path)).rejects.toThrow("哈希不匹配");
  });

  it("缺少许可文件时拒绝导入", async () => {
    const { path, pack } = await fixture({ "License.txt": new TextEncoder().encode("CC0"), "PNG/button.png": new Uint8Array([1]) });
    await expect(inspectCuratedResourceArchive({ ...pack, licenseEntry: "Missing.txt" as "License.txt" }, path)).rejects.toThrow("缺少许可文件");
  });

  it("只把精选文件、许可与来源清单写入资源族，重复导入保持幂等", async () => {
    const { path, pack } = await fixture({ "License.txt": new TextEncoder().encode("CC0"), "PNG/button.png": new Uint8Array([1, 2]), "Vector/button.svg": new Uint8Array([3]) });
    const target = await mkdtemp(join(tmpdir(), "resource-library-"));
    const first = await importCuratedResourceArchive(pack, path, target);
    const second = await importCuratedResourceArchive(pack, path, target);
    expect(first.manifest.assets).toHaveLength(1);
    expect(second.familyRoot).toBe(first.familyRoot);
    expect(JSON.parse(await readFile(join(first.familyRoot, "RESOURCE_FAMILY.json"), "utf8")).source.licenseId).toBe("CC0-1.0");
    await expect(access(join(first.familyRoot, "Vector/button.svg"))).rejects.toThrow();
  });
});
