import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { cp } from "node:fs/promises";
import test from "node:test";
import { browserQualityAvailable, inspectDifficultyProgressionInBrowser, inspectFailureAssistanceInBrowser, inspectMergeOnboardingInBrowser, inspectNonRealtimeOnboardingInBrowser, inspectSignalHuntOnboardingInBrowser, inspectTemplateOnboardingInBrowser, inspectThreeOnboardingInBrowser, inspectVariationRehearsalInBrowser } from "../src/server/browser-quality";
import { openTestDatabase } from "../src/server/database";
import { writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { StudioRepository } from "../src/server/studio-repository";

test("2048 新存档通过真实方向键完成教学，并支持持久化、重看与跳过", { skip: !browserQualityAvailable(), timeout: 30_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-onboarding-"));
  try {
    const project = await repository.create({
      title: "数织入门",
      idea: "滑动数字方块，把相同数字合并并逐步达到目标。",
      template: "merge-2048",
      dimensions: "2d",
      aspectRatio: "9:16",
    });
    writeDesignDocuments(root, project);
    writeGameArtifact(root, project);
    const result = await inspectMergeOnboardingInBrowser(root);
    assert.deepEqual(result.completedStepIds, ["ONBOARD-SLIDE", "ONBOARD-MERGE"]);
    assert.deepEqual(result.acceptedSignals.map(({ signal }) => signal), ["board-slid", "equal-merged-once"]);
    assert.equal(result.ignoredWrongDirection, true);
    assert.equal(result.persistedCompletion, true);
    assert.equal(result.replayedAndSkipped, true);
    assert.equal(existsSync(join(root, "_studio", "ONBOARDING_QUALITY_REPORT.json")), true);
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("七类非实时模板由真实合法操作完成教学，并支持安全等待、持久化、重看与跳过", { skip: !browserQualityAvailable(), timeout: 100_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const roots: string[] = [];
  try {
    const templates = ["klotski", "puzzle", "block-place", "polyomino-fit", "region-logic", "mahjong-roguelite"] as const;
    for (const template of templates) {
      const root = mkdtempSync(join(tmpdir(), `studio-${template}-onboarding-`));
      roots.push(root);
      const project = await repository.create({ title: `${template} 教学`, idea: `制作一个先安全教学再进入挑战的 ${template} 小游戏。`, template, dimensions: "2d", aspectRatio: "9:16" });
      writeDesignDocuments(root, project);
      writeGameArtifact(root, project);
      const result = await inspectNonRealtimeOnboardingInBrowser(root, template);
      assert.equal(result.safeWaitingPreserved, true);
      assert.equal(result.persistedCompletion, true);
      assert.equal(result.replayedAndSkipped, true);
      assert.ok(result.acceptedSignals.length > 0);
    }
  } finally {
    await database.close();
    for (const root of roots) rmSync(resolve(root), { recursive: true, force: true });
  }
});


test("四类实时模板先安全等待，再由真实操作完成教学", { skip: !browserQualityAvailable(), timeout: 40_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const roots: string[] = [];
  try {
    for (const template of ["tetris", "breakout", "snake", "space-shooter"] as const) {
      const root = mkdtempSync(join(tmpdir(), `studio-${template}-onboarding-`));
      roots.push(root);
      const project = await repository.create({ title: `${template} 入门`, idea: `制作一个具有清晰首次教学的 ${template} 小游戏。`, template, dimensions: "2d", aspectRatio: "9:16" });
      writeDesignDocuments(root, project);
      writeGameArtifact(root, project);
      const result = await inspectTemplateOnboardingInBrowser(root, template);
      assert.equal(result.completedStepIds.length, 1);
      assert.equal(result.acceptedSignals.length, 1);
      assert.equal(result.safePressurePaused, true);
      assert.equal(result.persistedCompletion, true);
      assert.equal(result.replayedAndSkipped, true);
      assert.equal(existsSync(join(root, "_studio", "ONBOARDING_QUALITY_REPORT.json")), true);
    }
  } finally {
    await database.close();
    for (const root of roots) {
      const safeRoot = resolve(root);
      if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
    }
  }
});

test("通用信号捕获首次点击前暂停计时，真实捕获后恢复压力", { skip: !browserQualityAvailable(), timeout: 30_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const root = mkdtempSync(join(tmpdir(), "studio-signal-onboarding-"));
  try {
    const project = await repository.create({ title: "雾港入门", idea: "捕获不断移动的发光信号，在倒计时内完成目标。", template: "signal-hunt", dimensions: "2d", aspectRatio: "9:16" });
    writeDesignDocuments(root, project);
    writeGameArtifact(root, project);
    const result = await inspectSignalHuntOnboardingInBrowser(root);
    assert.deepEqual(result.acceptedSignals.map(({ signal }) => signal), ["target-collected"]);
    assert.equal(result.safeTimerPaused, true);
    assert.equal(result.timerResumedAfterLearning, true);
    assert.equal(result.persistedCompletion, true);
    assert.equal(result.replayedAndSkipped, true);
    assert.equal(existsSync(join(root, "_studio", "ONBOARDING_QUALITY_REPORT.json")), true);
  } finally {
    await database.close();
    const safeRoot = resolve(root);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});

test("十三类成熟 2D 模板在第 9 关复验首关教学过的真实核心机制", { skip: !browserQualityAvailable(), timeout: 180_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const roots: string[] = [];
  try {
    const templates = ["signal-hunt", "tetris", "breakout", "snake", "space-shooter", "merge-2048", "klotski", "puzzle", "block-place", "polyomino-fit", "region-logic", "mahjong-roguelite"] as const;
    for (const template of templates) {
      const root = mkdtempSync(join(tmpdir(), `studio-${template}-variation-`));
      roots.push(root);
      const project = await repository.create({ title: `${template} 变化复验`, idea: `制作一个会逐步改变关卡条件的 ${template} 小游戏。`, template, dimensions: "2d", aspectRatio: "9:16" });
      writeDesignDocuments(root, project);
      writeGameArtifact(root, project);
      const result = await inspectVariationRehearsalInBrowser(root, template);
      assert.equal(result.sourceLevel, 1);
      assert.equal(result.rehearsalLevel, 9);
      assert.notEqual(result.sourceModifier, result.rehearsalModifier);
      assert.ok(result.expectedSignals.every((signal) => result.observedSignals.includes(signal)));
      assert.equal(existsSync(join(root, "_studio", "VARIATION_QUALITY_REPORT.json")), true);
    }
  } finally {
    await database.close();
    for (const root of roots) {
      const safeRoot = resolve(root);
      if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
    }
  }
});

test("十三类通用与成熟 2D 模板按连续失败次数提供显式分层帮助并在成功后清零", { skip: !browserQualityAvailable(), timeout: 140_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const roots: string[] = [];
  try {
    const templates = ["signal-hunt", "tetris", "breakout", "snake", "space-shooter", "merge-2048", "klotski", "puzzle", "block-place", "polyomino-fit", "region-logic", "mahjong-roguelite"] as const;
    for (const template of templates) {
      const root = mkdtempSync(join(tmpdir(), `studio-${template}-assistance-`));
      roots.push(root);
      const project = await repository.create({ title: `${template} 失败辅助`, idea: `制作一个失败后会解释原因并逐步提供帮助的 ${template} 小游戏。`, template, dimensions: "2d", aspectRatio: "9:16" });
      writeDesignDocuments(root, project);
      writeGameArtifact(root, project);
      const result = await inspectFailureAssistanceInBrowser(root, template);
      assert.deepEqual(result.observedActions, ["explain-cause", "highlight-rule", "highlight-rule", "directional-hint"]);
      assert.equal(result.persistedFailureCount, 4);
      assert.equal(result.resetAfterWin, true);
      assert.equal(result.hiddenAdaptation, false);
      assert.equal(existsSync(join(root, "_studio", "ASSISTANCE_QUALITY_REPORT.json")), true);
    }
  } finally {
    await database.close();
    for (const root of roots) {
      const safeRoot = resolve(root);
      if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
    }
  }
});

test("十三类通用与成熟 2D 模板的 20 关倍率平滑且五阶段具有不同运行结构", { skip: !browserQualityAvailable(), timeout: 200_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const roots: string[] = [];
  try {
    const templates = ["signal-hunt", "tetris", "breakout", "snake", "space-shooter", "merge-2048", "klotski", "puzzle", "block-place", "polyomino-fit", "region-logic", "mahjong-roguelite"] as const;
    for (const template of templates) {
      const root = mkdtempSync(join(tmpdir(), `studio-${template}-difficulty-`));
      roots.push(root);
      const project = await repository.create({ title: `${template} 难度复验`, idea: `制作一个难度平滑且会逐阶段改变结构的 ${template} 小游戏。`, template, dimensions: "2d", aspectRatio: "9:16" });
      writeDesignDocuments(root, project);
      writeGameArtifact(root, project);
      const result = await inspectDifficultyProgressionInBrowser(root, template);
      assert.equal(result.levelsChecked, 20);
      assert.equal(result.beatTransitionsChecked, 2);
      assert.equal(new Set(result.tierSignatures).size, 5);
      assert.ok(result.maximumMultiplierStep <= .12);
      assert.equal(existsSync(join(root, "_studio", "DIFFICULTY_QUALITY_REPORT.json")), true);
    }
  } finally {
    await database.close();
    for (const root of roots) {
      const safeRoot = resolve(root);
      if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
    }
  }
});

test("三类 3D 模式在安全状态中完成真实玩法教学", { skip: !browserQualityAvailable(), timeout: 60_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const roots: string[] = [];
  try {
    const scenarios = [
      { mode: "collector" as const, idea: "第三人称 3D 收集闯关，经过检查点并到达出口。" },
      { mode: "arena" as const, idea: "3D 小型竞技场射击，完成三波敌人并获得升级。" },
    ];
    for (const scenario of scenarios) {
      const root = mkdtempSync(join(tmpdir(), `studio-three-${scenario.mode}-onboarding-`));
      roots.push(root);
      const project = await repository.create({ title: `3D ${scenario.mode} 入门`, idea: scenario.idea, dimensions: "3d", aspectRatio: "9:16" });
      assert.equal(project.spec.threeMode, scenario.mode);
      writeDesignDocuments(root, project);
      writeGameArtifact(root, project);
      const result = await inspectThreeOnboardingInBrowser(root, scenario.mode);
      assert.equal(result.safePressurePaused, true);
      assert.equal(result.persistedCompletion, true);
      assert.equal(result.replayedAndSkipped, true);
      assert.equal(existsSync(join(root, "_studio", "ONBOARDING_QUALITY_REPORT.json")), true);
    }
  } finally {
    await database.close();
    for (const root of roots) {
      const safeRoot = resolve(root);
      if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
    }
  }
});

test("三类 3D 模式闭合二十关递进、变化关真实动作与显式失败辅助", { skip: !browserQualityAvailable(), timeout: 150_000 }, async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const roots: string[] = [];
  try {
    const scenarios = [
      { mode: "collector" as const, idea: "第三人称 3D 收集闯关，经过检查点并到达出口。" },
      { mode: "arena" as const, idea: "3D 小型竞技场射击，完成三波敌人并获得升级。" },
    ];
    for (const scenario of scenarios) {
      const root = mkdtempSync(join(tmpdir(), `studio-three-${scenario.mode}-design-`));
      roots.push(root);
      const project = await repository.create({ title: `3D ${scenario.mode} 设计闭环`, idea: scenario.idea, dimensions: "3d", aspectRatio: "9:16" });
      assert.equal(project.spec.threeMode, scenario.mode);
      writeDesignDocuments(root, project);
      writeGameArtifact(root, project);
      const variation = await inspectVariationRehearsalInBrowser(root, scenario.mode);
      assert.equal(variation.rehearsalLevel, 9);
      assert.deepEqual(variation.observedSignals.sort(), variation.expectedSignals.sort());
      const progression = await inspectDifficultyProgressionInBrowser(root, scenario.mode);
      assert.equal(progression.levelsChecked, 20);
      assert.equal(new Set(progression.tierSignatures).size, 5);
      const assistance = await inspectFailureAssistanceInBrowser(root, scenario.mode);
      assert.equal(assistance.persistedFailureCount, 4);
      assert.equal(assistance.resetAfterWin, true);
      assert.equal(existsSync(join(root, "_studio", "VARIATION_QUALITY_REPORT.json")), true);
      assert.equal(existsSync(join(root, "_studio", "DIFFICULTY_QUALITY_REPORT.json")), true);
      assert.equal(existsSync(join(root, "_studio", "ASSISTANCE_QUALITY_REPORT.json")), true);
    }
  } finally {
    await database.close();
    for (const root of roots) {
      const safeRoot = resolve(root);
      if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
    }
  }
});
