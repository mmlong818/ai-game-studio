import assert from "node:assert/strict";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { browserQualityAvailable, inspectCampaignInBrowser } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";
import type { GameTemplate } from "../src/shared/contracts";

const campaigns: Array<[GameTemplate, string]> = [
  ["signal-hunt", "做一个在雾港中捕获移动信号并在倒计时结束前完成目标的小游戏。"],
  ["tetris", "做一个构成主义俄罗斯方块，完成消行目标后获胜。"],
  ["puzzle", "做一个植物标本图片拼图，拖拽拼块还原图案。"],
  ["breakout", "做一个漆艺海面打砖块游戏，清除全部砖块后获胜。"],
  ["klotski", "做一个东方木艺华容道，移动主将从出口离开。"],
  ["maze", "做一个每局自动生成路线的苔石迷宫，从入口抵达出口。"],
  ["snake", "做一个青玉花园贪吃蛇，收集果实并避开障碍。"],
  ["merge-2048", "做一个数字合成游戏，滑动方块并合并到目标数字。"],
  ["space-shooter", "做一个太空射击游戏，规避敌机并完成击破目标。"],
  ["polyomino-fit", "做一个多格拼块游戏，旋转拼块并填满目标轮廓。"],
  ["block-place", "做一个方块填阵游戏，放置候选块并完成横竖消行。"],
  ["region-logic", "做一个区域独占逻辑游戏，每行每列和每个区域各放一颗星。"],
  ["mahjong-roguelite", "做一个肉鸽麻将接龙，配对自由牌并在航段之间选择遗物。"],
];

test("全部 2D 模板与通用玩法真实通过二十关解锁、持久化、分档增压和终局验收", { skip: !browserQualityAvailable(), timeout: 120_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-campaigns-"));
  try {
    for (const [template, idea] of campaigns) {
      const project = await repository.create({ title: `二十关验收-${template}`, idea, template, dimensions: "2d", aspectRatio: "9:16" });
      const artifactRoot = join(root, template);
      writeDesignDocuments(artifactRoot, project);
      writeGameArtifact(artifactRoot, project);
      const result = await inspectCampaignInBrowser(artifactRoot);
      assert.equal(result.initialLevel, 1);
      assert.ok(result.unlockedAfterFirstWin >= 2);
      assert.ok(result.restoredUnlockedLevel >= 2);
      assert.notDeepEqual(result.tierOneRuntime, result.tierFiveRuntime);
      assert.equal(result.finalState, "won");
      assert.equal(existsSync(join(artifactRoot, "_studio", "CAMPAIGN_QUALITY_REPORT.json")), true);
    }
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("3D 游戏真实通过二十关解锁、持久化、分档增压和终局验收", { skip: !browserQualityAvailable(), timeout: 30_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-campaign-3d-"));
  try {
    const project = await repository.create({
      title: "二十关验收-3D",
      idea: "做一个第三人称 3D 遗迹探索游戏，在倒计时内收集碎片并抵达出口。",
      dimensions: "3d",
      aspectRatio: "9:16",
    });
    writeDesignDocuments(root, project);
    writeGameArtifact(root, project);
    const result = await inspectCampaignInBrowser(root);
    assert.equal(result.initialLevel, 1);
    assert.ok(result.restoredUnlockedLevel >= 2);
    assert.notDeepEqual(result.tierOneRuntime, result.tierFiveRuntime);
    assert.equal(result.finalState, "won");
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("星梦对决固定游戏同样真实通过二十关合同", { skip: !browserQualityAvailable(), timeout: 30_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "studio-campaign-golden-"));
  try {
    cpSync(resolve("fixtures", "star-dream-duel"), root, { recursive: true });
    const result = await inspectCampaignInBrowser(root);
    assert.equal(result.initialLevel, 1);
    assert.ok(result.restoredUnlockedLevel >= 2);
    assert.notDeepEqual(result.tierOneRuntime, result.tierFiveRuntime);
    assert.equal(result.finalState, "won");
  } finally {
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
