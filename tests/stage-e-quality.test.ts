import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { cp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import {
  browserQualityAvailable,
  inspectStageEInBrowser,
  inspectStarDreamStageEInBrowser,
  type StageETemplate,
} from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

const templates: Array<[StageETemplate, string]> = [
  ["region-logic", "做一个星灵区域逻辑游戏，每行、每列和每个区域各放一个星灵。"],
  ["maze", "做一个苔石庭院迷宫，支持连续滑动、岔路标记与最短路径挑战。"],
  ["mahjong-roguelite", "做一个三航段肉鸽麻将接龙，带封锁层、潮汐与遗物组合。"],
];

test("阶段 E 逻辑、迷宫和长局模板具备计划要求的运行时能力", async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-stage-e-source-"));
  try {
    for (const [template, idea] of templates) {
      const project = await repository.create({ title: `阶段E-${template}`, idea, template, dimensions: "2d", aspectRatio: "9:16", difficulty: "standard" });
      const artifactRoot = join(root, template);
      writeDesignDocuments(artifactRoot, project);
      writeGameArtifact(artifactRoot, project);
      const html = readFileSync(join(artifactRoot, "index.html"), "utf8");
      const script = readFileSync(join(artifactRoot, "app.js"), "utf8");
      if (template === "region-logic") {
        assert.match(html, /data-control="cycle"/);
        assert.match(html, /data-control="redo"/);
        assert.match(html, /data-control="hint"/);
        assert.match(script, /regionLevelCatalog/);
        assert.match(script, /uniqueSolutions/);
        assert.match(script, /countRegionCompletions/);
        assert.match(script, /nextRegionDeduction/);
        assert.doesNotMatch(script, /function restoreRegionSession/);
        assert.match(script, /safeStorage\.removeItem\(regionSessionKey\(\)\)/);
        assert.match(script, /restartCurrentGame = \(\) =>/);
        assert.match(script, /hintUsesSolution: false/);
        assert.match(script, /regionErrors/);
      }
      if (template === "maze") {
        assert.match(html, /data-maze-shortest/);
        assert.match(html, /data-maze-control-mode="swipe"/);
        assert.match(script, /solveMazeShortestPath/);
        assert.match(script, /lanternKeys=new Set/);
        assert.match(script, /starKeys=new Set/);
        assert.match(script, /function missionOptimalSteps/);
        assert.match(script, /setInterval\(\(\)=>handleControl/);
      }
      if (template === "mahjong-roguelite") {
        assert.match(html, /data-mahjong-mode/);
        assert.match(html, /data-mahjong-seed/);
        assert.match(script, /mahjongRelics = \[/);
        assert.match(script, /mahjongRoutes = \[/);
        assert.match(script, /mahjongSynergies = \[/);
        assert.match(script, /mahjongConflicts = \[/);
        assert.match(script, /mahjong-run-v2/);
        assert.match(script, /限时潮汐/);
        assert.match(script, /relicPoolSize/);
        assert.match(script, /mahjongTileVisualState/);
        assert.match(script, /boardLayout/);
        assert.match(script, /boardAreaVersion: 2/);
        assert.match(script, /hudDensityVersion: 2/);
        assert.match(script, /emptyRelicDockHeight: 44/);
        assert.match(script, /inBoardLegend: false/);
        assert.match(script, /resourceCountersPlacement: "external-controls"/);
        assert.match(script, /boardPlacement: "available-height-centered"/);
        assert.match(script, /tileScalePolicy: "preserve-ratio-and-spacing"/);
        assert.match(script, /visualCueVersion: 4/);
        assert.match(script, /layerCueVersion: 1/);
        assert.match(script, /assetCompositionVersion: 2/);
        assert.match(script, /tileBodySource: "canvas-single-layer"/);
        assert.match(script, /spriteContent: "transparent-motif-only"/);
        assert.match(script, /selectionChangesGeometry: false/);
        assert.match(script, /mahjongKeyboardNavigation = false/);
        assert.match(script, /function drawMahjongTileBody/);
        assert.match(script, /function mahjongPrimaryCue/);
        assert.match(script, /function drawMahjongTileCues/);
        assert.match(script, /function drawMahjongSelectionCue/);
        assert.match(script, /function drawMahjongMatchingCue/);
        assert.match(script, /function drawMahjongHintCue/);
        assert.doesNotMatch(script, /function drawMahjongCornerMarks/);
        assert.match(script, /function drawMahjongRelicDock/);
        assert.match(script, /function drawMahjongFeedback/);
        assert.match(script, /activateMahjongRelics/);
        assert.doesNotMatch(script, /drawBitmapSprite\(mahjongFlash\.sprite/);
        assert.doesNotMatch(script, /scale: selected \? 1\.09/);
        assert.doesNotMatch(script, /rect\.y - \(selected \? 7/);
        assert.match(script, /mahjongEndingForRun/);
        assert.match(script, /chooseEliteRoute/);
      }
    }
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("阶段 E 三款模板各真实完成三局并触发两次失败", { skip: !browserQualityAvailable(), timeout: 90_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-stage-e-browser-"));
  try {
    for (const [template, idea] of templates) {
      const project = await repository.create({ title: `阶段E真检-${template}`, idea, template, dimensions: "2d", aspectRatio: "9:16", difficulty: "standard" });
      const artifactRoot = join(root, template);
      writeDesignDocuments(artifactRoot, project);
      writeGameArtifact(artifactRoot, project);
      const result = await inspectStageEInBrowser(artifactRoot, template);
      assert.equal(result.completedRuns, 3);
      assert.equal(result.failedRuns, 2);
    }
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("星梦对决真实完成三局、两次失败、恢复与 720p 首屏验收", { skip: !browserQualityAvailable(), timeout: 45_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-stage-e-star-dream-"));
  try {
    await cp(resolve("fixtures", "star-dream-duel"), root, { recursive: true });
    const result = await inspectStarDreamStageEInBrowser(root);
    assert.equal(result.completedRuns, 3);
    assert.equal(result.failedRuns, 2);
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
