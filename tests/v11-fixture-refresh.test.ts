import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openTestDatabase } from "../src/server/database";
import { StudioRepository } from "../src/server/studio-repository";
import { ensureV11FixtureArtifact, sourceFingerprint } from "../src/server/v11-build-metadata";

function writeSource(root: string, appJs: string) {
  mkdirSync(join(root, "assets"), { recursive: true });
  writeFileSync(join(root, "index.html"), '<!doctype html><html><body><button id="start">开始</button><script src="./app.js"></script></body></html>', "utf8");
  writeFileSync(join(root, "app.js"), appJs, "utf8");
  writeFileSync(join(root, "assets", "cover.png"), Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]));
}

test("固定游戏源目录改动后，1.1 版本副本会按来源指纹重新复制并重建清单", async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const temp = mkdtempSync(join(tmpdir(), "v11-fixture-refresh-"));
  try {
    const fixtures = await repository.ensureOfficialFixtures();
    const project = await repository.get(fixtures.freecell!);
    assert.ok(project);
    const source = join(temp, "source");
    const target = join(temp, "artifact", project.version.id);
    writeSource(source, "console.log('v1');");

    const first = ensureV11FixtureArtifact(source, target, project);
    assert.equal(first, target);
    assert.equal(readFileSync(join(target, "app.js"), "utf8"), "console.log('v1');");
    const manifest = JSON.parse(readFileSync(join(target, "_studio", "V11_BUILD.json"), "utf8")) as { sourceFingerprint?: string };
    assert.equal(manifest.sourceFingerprint, sourceFingerprint(source), "清单要记录来源指纹");
    assert.ok(readFileSync(join(target, "index.html"), "utf8").includes("_studio/runtime-inspector.js"), "副本要注入运行时检查脚本");

    // 来源未变：再次访问不重新复制（保留副本里额外写入的文件）。
    writeFileSync(join(target, "_studio", "MARKER.txt"), "keep", "utf8");
    ensureV11FixtureArtifact(source, target, project);
    assert.ok(existsSync(join(target, "_studio", "MARKER.txt")), "来源未变时不得重建副本");

    // 开发者改了源目录：指纹变化，副本被重新复制，清单更新。
    writeFileSync(join(source, "app.js"), "console.log('v2');", "utf8");
    const future = new Date(Date.now() + 5_000);
    utimesSync(join(source, "app.js"), future, future);
    // 指纹有 2 秒缓存，直接清掉缓存影响：等待超过 TTL。
    await new Promise((resolve) => setTimeout(resolve, 2_100));
    ensureV11FixtureArtifact(source, target, project);
    assert.equal(readFileSync(join(target, "app.js"), "utf8"), "console.log('v2');", "来源改动后副本必须更新");
    assert.equal(existsSync(join(target, "_studio", "MARKER.txt")), false, "重建后旧副本不残留");
    const refreshed = JSON.parse(readFileSync(join(target, "_studio", "V11_BUILD.json"), "utf8")) as { sourceFingerprint?: string };
    assert.equal(refreshed.sourceFingerprint, sourceFingerprint(source));
    assert.notEqual(refreshed.sourceFingerprint, manifest.sourceFingerprint);
  } finally {
    await database.close();
    rmSync(temp, { recursive: true, force: true });
  }
});
