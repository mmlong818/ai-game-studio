import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { browserQualityAvailable, inspectStageF3DInBrowser } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

const scenarios = [
  { mode: "collector" as const, signal: "player-moved", title: "潮汐遗迹", idea: "第三人称 3D 收集闯关，玩家跳过障碍、取得碎片、经过检查点并到达出口。" },
  { mode: "arena" as const, signal: "shot-fired", title: "潮光竞技场", idea: "3D 小型竞技场战斗，移动自动瞄准敌人，完成三波敌人并获得升级。" },
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
      assert.deepEqual(manifest.onboardingPlan.steps.map(({ successSignal }: { successSignal: string }) => successSignal), [scenario.signal]);
      assert.deepEqual(Object.keys(manifest.performanceProfiles), ["low", "medium", "high"]);
      assert.ok(manifest.threeContract.cameraDistance >= 8);
      assert.equal(existsSync(join(artifactRoot, "_studio", "THREE_ASSET_PROVENANCE.json")), true);
      assert.match(script, /function applyPerformanceTier/);
      assert.match(script, /renderSuspended/);
      assert.match(script, /function togglePause/);
      assert.match(script, /function signalOnboarding/);
      assert.match(script, new RegExp(`signalOnboarding\\(\"${scenario.signal}\"\\)`));
      if (scenario.mode === "collector") {
        assert.match(script, /jumpVelocity/);
        assert.match(script, /state\.checkpoint/);
        assert.match(script, /uniqueSignatures/);
        assert.match(script, /function recoverCollector/);
        assert.match(script, /function restoreCollectorSession/);
        assert.match(script, /function updateCollectorCourse/);
        assert.match(script, /movingHazardCount/);
        assert.match(script, /optionalCollectibles: true/);
        const curated = JSON.parse(readFileSync(join(artifactRoot, "_studio", "CURATED_RESOURCES.json"), "utf8"));
        assert.equal(curated.schemaVersion, "curated-resource-bindings-v2");
        assert.equal(curated.bindings[0].familyId, "low-poly-nature-3d");
        assert.deepEqual(curated.bindings[0].requirementIds, ["ASSET-BACKGROUND"]);
        assert.equal(curated.assets.length, 3);
        assert.ok(curated.assets.every((asset: { target: string }) => existsSync(join(artifactRoot, asset.target))));
        assert.equal(JSON.parse(readFileSync(join(artifactRoot, "_studio", "THREE_ASSET_PROVENANCE.json"), "utf8")).glbAssets.length, 3);
      } else {
        assert.match(script, /function spawnWave/);
        assert.match(script, /function chooseArenaUpgrade/);
        assert.match(script, /function updateProjectiles/);
        assert.match(script, /visible-travel-hit/);
        assert.match(script, /arenaBlueprints/);
        assert.match(script, /hasEliteWave/);
        for (const filename of ["arena-player.png", "arena-enemy-chaser.png", "arena-enemy-runner.png", "arena-enemy-tank.png", "arena-enemy-ranged.png"]) {
          const assetPath = join(artifactRoot, "assets", filename);
          assert.equal(existsSync(assetPath), true);
          assert.ok(statSync(assetPath).size > 80_000);
        }
        assert.equal(existsSync(join(artifactRoot, "_studio", "ARENA_ASSET_PROMPTS.md")), true);
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
      if (scenario.mode === "arena") {
        assert.equal(result.evidence.arenaProjectileVerified, true);
        assert.equal(result.evidence.arenaUpgradeVerified, true);
      } else if (scenario.mode === "collector") {
        assert.equal(result.evidence.collectorCuratedModelsVerified, true);
      }
    }
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
