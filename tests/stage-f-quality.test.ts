import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { browserQualityAvailable, inspectStageF3DInBrowser } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

const scenarios = [
  { mode: "collector" as const, title: "潮汐遗迹", idea: "第三人称 3D 收集闯关，玩家跳过障碍、取得碎片、经过检查点并到达出口。" },
  { mode: "arena" as const, title: "潮光竞技场", idea: "3D 小型竞技场战斗，移动自动瞄准敌人，完成三波敌人并获得升级。" },
];

async function createArtifacts(root: string) {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  try {
    for (const scenario of scenarios) {
      const project = await repository.create({ title: scenario.title, idea: scenario.idea, dimensions: "3d", aspectRatio: "9:16" });
      assert.equal(project.spec.threeMode, scenario.mode);
      assert.ok(project.spec.threeContract);
      const artifactRoot = join(root, scenario.mode);
      writeDesignDocuments(artifactRoot, project);
      writeGameArtifact(artifactRoot, project);
    }
  } finally {
    await database.close();
  }
}

test("阶段 F 两类 3D 黄金模板含完整合同、性能分级和资产来源", async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-stage-f-source-"));
  try {
    await createArtifacts(root);
    for (const scenario of scenarios) {
      const artifactRoot = join(root, scenario.mode);
      const manifest = JSON.parse(readFileSync(join(artifactRoot, "game-manifest.json"), "utf8"));
      const script = readFileSync(join(artifactRoot, "app.js"), "utf8");
      assert.equal(manifest.threeMode, scenario.mode);
      assert.deepEqual(Object.keys(manifest.performanceProfiles), ["low", "medium", "high"]);
      assert.ok(manifest.threeContract.cameraDistance >= 8);
      assert.equal(existsSync(join(artifactRoot, "_studio", "THREE_ASSET_PROVENANCE.json")), true);
      assert.match(script, /function applyPerformanceTier/);
      assert.match(script, /renderSuspended/);
      assert.match(script, /function togglePause/);
      if (scenario.mode === "collector") {
        assert.match(script, /jumpVelocity/);
        assert.match(script, /state\.checkpoint/);
      } else {
        assert.match(script, /function spawnWave/);
        assert.match(script, /function applyArenaUpgrade/);
      }
    }
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("阶段 F 两类 3D 模板在手机和桌面各完成一局并触发失败", { skip: !browserQualityAvailable(), timeout: 60_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-stage-f-browser-"));
  try {
    await createArtifacts(root);
    for (const scenario of scenarios) {
      const result = await inspectStageF3DInBrowser(join(root, scenario.mode), scenario.mode);
      assert.equal(result.completedRuns, 2);
      assert.equal(result.failedRuns, 2);
      assert.equal(result.evidence.hiddenRenderPaused, true);
    }
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
