import assert from "node:assert/strict";
import test from "node:test";
import { gameSpecSchema, generateGameSpec, projectInputSchema, visualStyleOptions, type GameTemplate } from "../src/shared/contracts";
import { campaignTierSize, createCampaignLevels, minimumCampaignLevelCount } from "../src/shared/level-progression";

test("玩法合同能够从中文描述识别 3D、视角、机制和硬约束", () => {
  const spec = generateGameSpec({
    title: "遗迹撤离",
    dimensions: "auto",
    idea: "做一个第三人称 3D 遗迹探索游戏。玩家必须在倒计时内收集 5 枚碎片，不能攻击石像，收集完成后出口才会打开。",
  });

  assert.equal(spec.dimensions, "3d");
  assert.equal(spec.runtimeTarget, "web-3d");
  assert.equal(spec.perspective, "third-person");
  assert.ok(spec.mechanics.includes("探索与收集"));
  assert.equal(spec.mechanics.includes("战斗"), false);
  assert.ok(spec.hardConstraints.some((item) => item.includes("必须")));
  assert.ok(spec.acceptanceCriteria.some((item) => item.id === "AC-3D-PERF"));
});

test("玩法合同拒绝过短的模糊输入", () => {
  const result = projectInputSchema.safeParse({ idea: "做个游戏", dimensions: "auto" });
  assert.equal(result.success, false);
});

test("六种画面风格都会写入正式合同，默认新项目使用软萌风格", () => {
  const idea = "做一个可以移动角色、收集五枚星星并抵达终点的小游戏。";
  const styles = ["classic", "calm", "fashion", "cute", "line-art", "color-block"] as const;

  assert.equal(generateGameSpec({ idea }).visualStyle, "cute");
  for (const visualStyle of styles) {
    const spec = generateGameSpec({ idea, visualStyle });
    assert.equal(spec.visualStyle, visualStyle);
    assert.ok(spec.hardConstraints[0]?.includes("视觉风格"));
    assert.ok(spec.acceptanceCriteria.some((criterion) => criterion.id === "AC-STYLE" && criterion.statement.includes("不能只换配色")));
  }
  assert.equal(new Set(visualStyleOptions.map((option) => option.layout)).size, styles.length);
  assert.equal(new Set(visualStyleOptions.map((option) => option.detailLevel)).size, styles.length);
  assert.equal(projectInputSchema.safeParse({ idea, visualStyle: "retro" }).success, false);
});

test("未指定类型的 2D 描述进入 Web 2D 运行时", () => {
  const spec = generateGameSpec({
    dimensions: "auto",
    idea: "做一个俯视角塔防游戏，玩家需要布置三种防御塔并守住五轮敌人。",
  });

  assert.equal(spec.dimensions, "2d");
  assert.equal(spec.runtimeTarget, "web-2d");
  assert.equal(spec.perspective, "top-down");
});

test("十三类常见小游戏都能从一句中文描述进入正确生成器", () => {
  const cases: Array<[GameTemplate, string]> = [
    ["tetris", "做一个构成主义俄罗斯方块，完成十条消行后获胜并可以重新开始。"],
    ["puzzle", "做一个植物标本图片拼图，玩家可以上传自己的照片并完成还原。"],
    ["breakout", "做一个漆艺海面打砖块游戏，清除全部砖块后显示胜利画面。"],
    ["klotski", "做一个东方木艺华容道，移动曹操从底部中央离开棋盘。"],
    ["maze", "做一个每局自动生成路线的苔石迷宫，从左上走到右下出口。"],
    ["snake", "做一个青玉花园贪吃蛇，收集十二枚朱果之后完成挑战。"],
    ["merge-2048", "做一个数字合成 2048 游戏，滑动方块并合并到目标数字。"],
    ["platformer", "做一个横版平台跳跃游戏，收集能量并跳到终点信标。"],
    ["space-shooter", "做一个太空射击游戏，驾驶飞船清除三轮敌机。"],
    ["polyomino-fit", "做一个软糖岛多格拼块游戏，旋转拼块并完整填满目标轮廓。"],
    ["block-place", "做一个果冻方块填阵游戏，从三块中选择并通过横竖消行得分。"],
    ["region-logic", "做一个星灵巡格区域独占游戏，每行每列只放一颗星。"],
    ["mahjong-roguelite", "做一个肉鸽麻将接龙，配对自由牌并在航段之间选择遗物。"],
  ];

  for (const [template, idea] of cases) {
    const spec = generateGameSpec({ idea, dimensions: "auto" });
    assert.equal(spec.template, template);
    assert.equal(spec.dimensions, "2d");
    assert.notEqual(spec.artStyle, "auto");
  }
});

test("所有内置玩法采用二十关、每四关一档的渐进难度合同", () => {
  const templates: GameTemplate[] = [
    "signal-hunt",
    "tetris",
    "puzzle",
    "breakout",
    "klotski",
    "maze",
    "snake",
    "merge-2048",
    "platformer",
    "space-shooter",
    "polyomino-fit",
    "block-place",
    "region-logic",
    "mahjong-roguelite",
  ];

  assert.equal(minimumCampaignLevelCount, 20);
  assert.equal(campaignTierSize, 4);

  for (const template of templates) {
    const spec = generateGameSpec({
      idea: "做一个具有明确目标、失败条件和重新开始功能的完整小游戏。",
      template,
    });
    const levels = createCampaignLevels(template, spec.difficulty);

    assert.deepEqual(spec.levelProgression, {
      levelCount: 20,
      curve: "stepped",
      tierSize: 4,
      unlockMode: "sequential",
      persistProgress: true,
    });
    assert.equal(levels.length, 20);
    assert.equal(new Set(levels.map((level) => level.id)).size, 20);
    assert.deepEqual(levels.map((level) => level.tier), [
      1, 1, 1, 1,
      2, 2, 2, 2,
      3, 3, 3, 3,
      4, 4, 4, 4,
      5, 5, 5, 5,
    ]);
    for (const levelNumber of [5, 9, 13, 17]) {
      const previousTier = levels[levelNumber - 2];
      const nextTier = levels[levelNumber - 1];
      assert.ok(nextTier.goalMultiplier > previousTier.goalMultiplier);
      assert.ok(nextTier.speedMultiplier > previousTier.speedMultiplier);
      assert.ok(nextTier.densityMultiplier > previousTier.densityMultiplier);
    }
  }
});

test("开源模板写入来源边界，所有新项目都有专业设计骨架", () => {
  const sourceBacked = generateGameSpec({
    idea: "做一个数字合成 2048 游戏，滑动相同数字直到达到目标。",
  });
  const original = generateGameSpec({
    idea: "做一个庭院贪吃蛇，收集果实并避开自己的身体。",
  });

  assert.equal(sourceBacked.template, "merge-2048");
  assert.equal(sourceBacked.templateSource?.license, "MIT");
  assert.equal(sourceBacked.templateSource?.integrationMode, "code-port");
  assert.ok(sourceBacked.designProfile.coreLoop.length >= 3);
  assert.match(sourceBacked.designProfile.winCondition, /合成/);
  assert.equal(original.templateSource, null);
  assert.ok(original.designProfile.gameFeel.length >= 2);
  assert.ok(original.acceptanceCriteria.some((criterion) => criterion.id === "AC-PACING"));
});

test("拼图合同保留经过边界校验的项目图片，其他玩法不会误带图片", () => {
  const image = "data:image/jpeg;base64,/9j/2Q==";
  const puzzle = generateGameSpec({
    idea: "做一个可以上传家庭照片并重新拼好的图片拼图游戏。",
    template: "puzzle",
    customImageDataUrl: image,
  });
  const maze = generateGameSpec({
    idea: "做一个每局生成路线并找到出口的庭院迷宫游戏。",
    template: "maze",
    customImageDataUrl: image,
  });

  assert.equal(puzzle.customImageDataUrl, image);
  assert.equal(maze.customImageDataUrl, null);
  assert.equal(puzzle.puzzleRules?.pieceCount, 20);
  assert.equal(puzzle.puzzleRules?.maxPieceCount, 50);
  assert.equal(puzzle.puzzleRules?.startArrangement, "perimeter");
});

test("拼图难度控制默认块数、吸附范围和底图提示，玩家选择可覆盖块数但不能超过 50", () => {
  const idea = "做一个可以上传照片、自由拖拽拼块并自动吸附的经典图片拼图。";
  const relaxed = generateGameSpec({ idea, template: "puzzle", difficulty: "relaxed" });
  const challenging = generateGameSpec({ idea, template: "puzzle", difficulty: "challenging" });
  const custom = generateGameSpec({ idea, template: "puzzle", difficulty: "challenging", puzzlePieceCount: 50 });
  const invalid = projectInputSchema.safeParse({ idea, template: "puzzle", puzzlePieceCount: 51 });

  assert.equal(relaxed.puzzleRules?.pieceCount, 9);
  assert.equal(challenging.puzzleRules?.pieceCount, 42);
  assert.equal(custom.puzzleRules?.pieceCount, 50);
  assert.ok((relaxed.puzzleRules?.snapTolerance ?? 0) > (challenging.puzzleRules?.snapTolerance ?? 1));
  assert.ok((relaxed.puzzleRules?.guideOpacity ?? 0) > (challenging.puzzleRules?.guideOpacity ?? 1));
  assert.ok(custom.hardConstraints.some((item) => item.includes("画板外围")));
  assert.equal(invalid.success, false);
});

test("玩法合同默认采用手机竖屏比例，并允许创作者明确覆盖", () => {
  const platformer = generateGameSpec({ idea: "做一个横版平台跳跃游戏，收集能量并抵达远端信标。", template: "platformer" });
  const shooter = generateGameSpec({ idea: "做一个竖屏太空射击游戏，躲避敌机并完成目标击破数。", template: "space-shooter" });
  const puzzle = generateGameSpec({ idea: "做一个拖拽图片拼图，完成全部拼块后播放庆祝声。", template: "puzzle", aspectRatio: "4:3" });
  const invalid = projectInputSchema.safeParse({ idea: "做一个横版平台跳跃游戏，收集能量并抵达远端信标。", aspectRatio: "3:2" });

  assert.equal(platformer.aspectRatio, "9:16");
  assert.equal(shooter.aspectRatio, "9:16");
  assert.equal(puzzle.aspectRatio, "4:3");
  assert.equal(platformer.presentationVersion, 5);
  assert.equal(platformer.cameraMode, "follow-player");
  assert.deepEqual(platformer.inputModes, ["keyboard", "touch-buttons"]);
  assert.equal(shooter.cameraMode, "scrolling");
  assert.deepEqual(shooter.inputModes, ["drag", "keyboard", "touch-buttons"]);
  const { presentationVersion: _presentationVersion, ...legacySpec } = platformer;
  assert.equal(gameSpecSchema.parse(legacySpec).presentationVersion, 1);
  assert.ok(platformer.acceptanceCriteria.some((criterion) => criterion.id === "AC-ASPECT"));
  assert.ok(platformer.acceptanceCriteria.some((criterion) => criterion.id === "AC-FOCAL"));
  assert.ok(platformer.acceptanceCriteria.some((criterion) => criterion.id === "AC-CAMERA"));
  assert.ok(platformer.acceptanceCriteria.some((criterion) => criterion.id === "AC-STATE"));
  assert.equal(invalid.success, false);
});
