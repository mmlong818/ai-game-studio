import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { inspectGameArtifact, writeDesignDocuments, writeGameArtifact } from "../src/server/game-artifact";
import { openTestDatabase } from "../src/server/database";
import { regionLogicLevels } from "../src/server/game-runtimes/region-logic-levels.generated";
import { StudioRepository } from "../src/server/studio-repository";
import type { GameTemplate, VisualStyle } from "../src/shared/contracts";

const examples: Array<[GameTemplate, VisualStyle, string, string]> = [
  ["tetris", "color-block", "折光堆叠", "做一个构成主义俄罗斯方块，完成十条消行后获胜并支持触控。"],
  ["puzzle", "fashion", "植光拼图", "做一个植物标本图片拼图，玩家可以上传自己的图片再完成还原。"],
  ["breakout", "classic", "漆海碎星", "做一个漆艺海面打砖块游戏，清除全部砖块后显示胜利。"],
  ["klotski", "line-art", "朱门华容", "做一个东方木艺华容道，移动曹操从底部中央离开。"],
  ["maze", "calm", "苔径迷庭", "做一个每局自动生成路线的苔石迷宫，从左上走到右下出口。"],
  ["snake", "cute", "青玉长游", "做一个青玉花园贪吃蛇，收集十二枚朱果之后完成挑战。"],
  ["merge-2048", "fashion", "数织矩阵", "做一个时尚数字合成游戏，合并出目标数字后获胜。"],
  ["platformer", "calm", "云脊跃迁", "做一个浮岛平台跳跃游戏，收集能量后抵达终点信标。"],
  ["space-shooter", "color-block", "星环突围", "做一个太空射击游戏，规避敌机并完成目标击破数。"],
  ["polyomino-fit", "cute", "软糖拼岛", "做一个软萌多格拼块游戏，旋转拼块并完整填满目标轮廓。"],
  ["block-place", "color-block", "果冻填阵", "做一个果冻方块填阵游戏，放置三组候选并完成横竖消行。"],
  ["region-logic", "cute", "星灵巡格", "做一个区域独占逻辑游戏，每行每列和每个区域各放一颗星。"],
  ["mahjong-roguelite", "cute", "月港雀旅", "做一个肉鸽麻将接龙，配对自由牌清空层叠牌阵并选择遗物。"],
];

test("十三类艺术化游戏都会产出可解析脚本、角色拆分位图、四轨声音和专业设计探针", async () => {
  const database = await openTestDatabase();
  const repository = new StudioRepository(database, "http://127.0.0.1:4312");
  const artifactRoot = mkdtempSync(join(tmpdir(), "studio-templates-"));
  try {
    for (const [template, visualStyle, title, idea] of examples) {
      const project = await repository.create({ title, idea, template, visualStyle, dimensions: "2d" });
      const output = join(artifactRoot, template);
      writeDesignDocuments(output, project);
      writeGameArtifact(output, project);
      const probes = inspectGameArtifact(output);
      const manifest = JSON.parse(readFileSync(join(output, "game-manifest.json"), "utf8")) as {
        template: string;
        visualStyle: string;
        cameraMode: string;
        inputModes: string[];
      };

      assert.equal(manifest.template, template);
      assert.equal(manifest.visualStyle, visualStyle);
      assert.notEqual(manifest.cameraMode, "auto");
      assert.ok(manifest.inputModes.length > 0);
      assert.equal(probes.length, 15);
      assert.equal(existsSync(join(output, "assets", "cover.png")), true);
      assert.equal(existsSync(join(output, "assets", "gameplay-atlas.png")), true);
      assert.equal(existsSync(join(output, "assets", "background.png")), true);
      assert.equal(existsSync(join(output, "assets", "sprites", "sprite-01.png")), true);
      assert.equal(existsSync(join(output, "assets", "ambient.wav")), true);
      assert.equal(existsSync(join(output, "assets", "music.wav")), true);
      assert.equal(existsSync(join(output, "assets", "legal.wav")), true);
      assert.equal(existsSync(join(output, "assets", "illegal.wav")), true);
      assert.equal(existsSync(join(output, "assets", "ui.wav")), true);
      const assetManifest = JSON.parse(readFileSync(join(output, "assets", "asset-manifest.json"), "utf8")) as { schemaVersion: number; assets: Array<{ role: string }>; trackSystem?: { gameplay?: string[] } };
      assert.equal(assetManifest.schemaVersion, 3);
      assert.equal(assetManifest.assets.filter((asset) => asset.role.startsWith("sprite-")).length, 9);
      assert.equal(assetManifest.trackSystem?.gameplay?.length, 6);
      assert.equal(existsSync(join(output, "_studio", "ART_DIRECTION.md")), true);
      assert.equal(existsSync(join(output, "_studio", "ART_REVIEW.md")), true);
      assert.equal(existsSync(join(output, "_studio", "OPEN_SOURCE_ATTRIBUTION.md")), true);
      assert.match(readFileSync(join(output, "_studio", "GAME_DESIGN.md"), "utf8"), /## 核心循环/);
      assert.match(readFileSync(join(output, "_studio", "ART_REVIEW.md"), "utf8"), /主体占据可用面积约 82%–94%/);
      assert.match(readFileSync(join(output, "index.html"), "utf8"), /COMMERCIAL GAMEPLAY CONTRACT/);
      assert.match(readFileSync(join(output, "index.html"), "utf8"), /3-STAR MASTERY/);
      assert.match(readFileSync(join(output, "index.html"), "utf8"), /data-mastery-mission/);
      assert.match(readFileSync(join(output, "index.html"), "utf8"), new RegExp(`data-visual-style="${visualStyle}"`));
      assert.match(readFileSync(join(output, "index.html"), "utf8"), /data-detail-level=/);
      assert.match(readFileSync(join(output, "index.html"), "utf8"), /class="style-ornament"/);
      assert.match(readFileSync(join(output, "index.html"), "utf8"), /viewport-fit=cover/);
      assert.match(readFileSync(join(output, "index.html"), "utf8"), /<details class="game-help">/);
      if (template !== "puzzle") assert.match(readFileSync(join(output, "index.html"), "utf8"), /data-control="[^"]+"[^>]+disabled/);
      const styles = readFileSync(join(output, "styles.css"), "utf8");
      assert.match(styles, /--game-viewport-width:43\.875vh/);
      assert.match(styles, /\.template-header\{display:none\}\.template-shell\{grid-template-rows:1fr\}/);
      assert.match(styles, /\.template-header\{display:none\}/);
      assert.match(styles, /body\[data-visual-style\] \.game-canvas\{display:block;width:min\(100vw,56\.25svh\)/);
      assert.match(styles, /body\[data-game-state=playing\]\[data-visual-style\] \.game-panel\{position:absolute/);
      assert.match(styles, /body\[data-game-state=playing\] #sound-toggle\{display:none\}/);
      assert.match(readFileSync(join(output, "index.html"), "utf8"), /id="back-to-setup"[^>]+aria-label="返回启动设置"/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /const visualStyleProfiles =/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /function finishCanvasStyle\(\)/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /function drawBitmapSprite\(/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /const requestedSource = options\.sourceRect/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /function cacheBitmapSourceRect\(image\)/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /const fitScale = options\.fit === "cover"/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /Math\.min\(targetWidth \/ source\.width, targetHeight \/ source\.height\)/);
      assert.doesNotMatch(readFileSync(join(output, "app.js"), "utf8"), /-drawWidth \/ 2,[\s\S]{0,80}sprite\.naturalWidth/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /options\.scaleX \?\? options\.scale \?\? 1/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /options\.scaleY \?\? options\.scale \?\? 1/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /function gameSceneHeight\(\)/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /function setGameplayControlsEnabled\(enabled\)/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /function setGameSessionState\(nextState\)/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /function evaluateCampaignMastery\(won\)/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /function returnToSetup\(\)/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /game:state-change/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /再次点击“重新开始”即可放弃当前进度/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /spriteImages = config\.spriteFiles/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /soundAliases/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /visibilitychange/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /localStorage/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /stage-complete/);
      assert.match(readFileSync(join(output, "app.js"), "utf8"), /finishCanvasStyle\(\);/);
      if (template === "puzzle") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        assert.match(script, /new Path2D\(\)/);
        assert.match(script, /addEventListener\("pointerdown"/);
        assert.match(script, /image\.naturalWidth \/ image\.naturalHeight/);
        assert.match(script, /config\.puzzleRules\?config\.puzzleRules\.snapTolerance:\.26/);
        assert.match(script, /这里还没有可连接的拼缝/);
        assert.match(script, /function perimeterSlots\(\)/);
        assert.match(script, /function tryConnectSelected\(\)/);
        assert.match(script, /function setPuzzleZoom\(next\)/);
        assert.match(script, /function persistPuzzleSession\(\)/);
        assert.match(script, /function beginPuzzleImageLoad\(\)/);
        assert.match(script, /requestId!==puzzleImageRequestId/);
        assert.match(script, /builtIns\[\(level\.number-1\)%builtIns\.length\]/);
        const html = readFileSync(join(output, "index.html"), "utf8");
        assert.match(html, /data-puzzle-count/);
        assert.match(html, /data-puzzle-level/);
        assert.match(html, /data-puzzle-mode="classic"/);
        assert.match(html, /data-puzzle-mode="timed"/);
        assert.match(html, /data-puzzle-rotation/);
        assert.match(html, /50 块/);
        assert.match(html, /画板四周/);
        const galleryFiles = Array.from({ length: 20 }, (_, index) => `level-gallery-${String(index + 1).padStart(2, "0")}.png`);
        const galleryHashes = new Set(galleryFiles.map((filename) => {
          const content = readFileSync(join(output, "assets", filename));
          return createHash("sha256").update(content).digest("hex");
        }));
        assert.equal(galleryHashes.size, 20);
        assert.equal(existsSync(join(output, "assets", "puzzle-levels.jsonl")), true);
        assert.equal(readFileSync(join(output, "assets", "puzzle-levels.jsonl"), "utf8").trim().split(/\r?\n/).length, 20);
      }
      if (template === "breakout") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        const html = readFileSync(join(output, "index.html"), "utf8");
        assert.match(html, /data-breakout-level/);
        assert.match(html, /data-breakout-mode="campaign"/);
        assert.match(html, /data-breakout-mode="time-attack"/);
        assert.match(html, /data-breakout-mode="endless"/);
        assert.match(html, /20 · 最终掌握 · 王冠重甲/);
        assert.match(html, /连续消除三块会获得炸弹/);
        assert.match(script, /function levelHasBrick\(level, row, column\)/);
        assert.match(script, /function showLevelComplete\(\)/);
        assert.match(script, /function showLevelComplete\(\)[\s\S]*setGameSessionState\("stage-complete"\)/);
        assert.match(script, /level-abyss-crown\.png/);
        assert.match(script, /function drawStageHud\(/);
        assert.match(script, /function drawImpactBursts\(/);
        assert.match(script, /impactBursts\.push/);
        assert.match(script, /function drawSimpleBrick\(/);
        assert.match(script, /function registerClearForBomb\(/);
        assert.match(script, /function triggerCrossExplosion\(/);
        assert.match(script, /Math\.abs\(candidate\.column - center\.column\) === 1/);
        assert.match(script, /Math\.abs\(candidate\.row - center\.row\) === 1/);
        assert.match(script, /bombClearThreshold = 3/);
        assert.match(script, /focusTimeScale = \.55/);
        assert.match(script, /focusScoreMultiplier = \.5/);
        assert.match(script, /function setBreakoutMode\(nextMode\)/);
        assert.match(script, /function grantBrickPower\(brick\)/);
        assert.match(script, /function advanceBallPhysics\(scale, layout\)/);
        assert.match(script, /collisionSystem: "substep-face-normal"/);
        assert.match(script, /kind === "shield"/);
        assert.match(script, /kind === "wide"/);
        assert.match(script, /kind === "pierce"/);
        assert.match(script, /"formationIndex":19/);
        assert.match(script, /const brickHeight = level\.rows >= 8 \? 34 : 38/);
        assert.equal(existsSync(join(output, "assets", "breakout-levels.jsonl")), true);
        assert.equal(existsSync(join(output, "assets", "level-coral-gate.png")), true);
        assert.equal(existsSync(join(output, "assets", "level-jellyfish-tide.png")), true);
        assert.equal(existsSync(join(output, "assets", "level-star-reef.png")), true);
        assert.equal(existsSync(join(output, "assets", "level-abyss-crown.png")), true);
      }
      if (template === "klotski") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        assert.match(script, /function animationLoop\(timestamp\)/);
        assert.match(script, /function drawMoveGuides\(/);
        assert.match(script, /function spawnParticles\(/);
        assert.match(script, /klotski-courtyard\.png/);
        assert.match(script, /function pieceScale\(/);
        assert.match(script, /scale: pieceScale\(piece\)/);
        assert.match(script, /function pieceSourceRect\(piece\)/);
        assert.match(script, /sourceRect: pieceSourceRect\(piece\)/);
        assert.match(script, /function drawBoardGrid\(originX, originY, cell\)/);
        assert.match(script, /const klotskiBlueprints =/);
        assert.match(script, /function solveKlotski\(/);
        assert.match(script, /hintDistance: klotskiHintDistance/);
        assert.match(script, /canvas\.addEventListener\("pointerdown"/);
        assert.match(script, /dragProbe/);
        assert.match(script, /function redoKlotskiMove\(/);
        assert.match(script, /pieceOutlineWidth: 6/);
        assert.match(script, /incompleteArtIsCropped: true/);
        assert.match(script, /Number\(piece\.id\.slice\(-1\)\) % 2/);
        assert.equal(existsSync(join(output, "assets", "klotski-courtyard.png")), true);
        assert.equal(existsSync(join(output, "assets", "klotski-effects.jsonl")), true);
      }
      if (template === "tetris") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        assert.match(script, /\? 50 : 29/);
        assert.match(script, /y: 0, color: shapeIndex \+ 1/);
        assert.match(script, /const shape = shapes\[shapeIndex\]/);
        assert.match(script, /const miniCell = options\.cell \|\| 20/);
        assert.match(script, /const tetrisCellGeometry = Object\.freeze/);
        assert.match(script, /function createSevenBag\(/);
        assert.match(script, /pieceQueue\.slice\(0, 5\)/);
        assert.match(script, /const jlstzKickTests =/);
        assert.match(script, /const iKickTests =/);
        assert.match(script, /rotationSystem: "SRS-clockwise"/);
        assert.match(script, /const lockDelayMs = 500/);
        assert.match(script, /const maxLockResets = 15/);
        assert.match(script, /function scoreLineClear\(/);
        assert.match(script, /50 \* combo \* level/);
        assert.match(script, /softDropScore \+= 1/);
        assert.match(script, /axisAlignedCells: true/);
        assert.match(script, /protrusion: 0/);
        assert.match(script, /fit: "cover"/);
        assert.match(script, /scale: tetrisCellGeometry\.textureScale/);
        assert.match(script, /ctx\.roundRect\(blockX, blockY, blockSize, blockSize, radius\)/);
        assert.doesNotMatch(script, /function drawJoin\(/);
        assert.match(script, /config\.aspectRatio === "9:16" \? 168/);
        assert.doesNotMatch(script, /const width = shape\[0\]\.length \* size/);
        assert.doesNotMatch(script, /if \(edges\.right\) ctx\.fillRect/);
      }
      if (template === "maze") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        const html = readFileSync(join(output, "index.html"), "utf8");
        const styles = readFileSync(join(output, "styles.css"), "utf8");
        assert.match(script, /const mazeBlueprints = \[/);
        assert.match(script, /"苔庭归星","暮钟综合","grand-maze"/);
        assert.match(script, /function braidMaze\(\)/);
        assert.match(script, /function mazeAlternativeSegments\(/);
        assert.match(script, /function prepareObjectives\(\)/);
        assert.match(script, /hasMultipleRoutes:mazeAlternativeSegments\(mazeShortestPath\)>0/);
        assert.match(script, /function showHint\(\)/);
        assert.match(script, /hintPath=path\.slice\(1,5\)/);
        assert.match(script, /fogRadius:blueprint\(\)\.fogRadius/);
        assert.match(script, /iceCount:iceKeys\.size/);
        assert.match(script, /keyCount:starKeys\.size/);
        assert.match(script, /function gestureDirection\(/);
        assert.match(script, /pointerup/);
        assert.match(script, />=18/);
        assert.match(script, /holdRepeat/);
        assert.match(html, /touch-controls maze-pad/);
        assert.match(html, /data-maze-control-mode="swipe"/);
        assert.match(html, /竞径星章/);
        assert.match(styles, /data-maze-control-mode=swipe/);
      }
      if (template === "snake") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        const html = readFileSync(join(output, "index.html"), "utf8");
        const styles = readFileSync(join(output, "styles.css"), "utf8");
        assert.match(script, /const difficultyProfiles =/);
        assert.match(script, /const snakeLevelBlueprints = \[/);
        assert.match(script, /wrapWalls: true/);
        assert.match(script, /const baseDelay = difficultyProfile\.speed \/ campaignScale\("speedMultiplier"\)/);
        assert.match(script, /Math\.max\(55, tuned - score \* 2\.5\)/);
        assert.match(script, /function drawGardenBoard\(/);
        assert.match(script, /function buildSnakeFormation\(/);
        assert.match(script, /function createSnakeObstacles\(/);
        assert.match(script, /function reachableSnakeCells\(/);
        assert.match(script, /function queueSnakeTurn\(/);
        assert.match(script, /snakeDirectionQueue\.length >= 2/);
        assert.match(script, /Math\.max\(Math\.abs\(dx\), Math\.abs\(dy\)\) < 18/);
        assert.match(script, /snakeReadyUntil = performance\.now\(\) \+ 900/);
        assert.match(script, /document\.addEventListener\("visibilitychange"/);
        assert.match(script, /function renderedSnakeParts\(timestamp\)/);
        assert.match(script, /function rebuildSnakeStaticLayer\(\)/);
        assert.match(script, /staticLayerCached: true/);
        assert.match(script, /function snakeAnimationLoop\(timestamp\)/);
        assert.match(script, /requestAnimationFrame-interpolation/);
        assert.doesNotMatch(script, /setInterval\(snakeStep/);
        assert.match(script, /pendingDifficultyUntil/);
        assert.match(script, /撞到庭院障碍/);
        assert.match(html, /data-snake-difficulty="relaxed"/);
        assert.match(html, /data-snake-difficulty="standard"/);
        assert.match(html, /data-snake-difficulty="challenging"/);
        assert.match(html, /data-snake-control-mode="swipe"/);
        assert.match(html, /data-snake-control-mode="buttons"/);
        assert.match(html, /data-control="pause"/);
        assert.doesNotMatch(html, /data-control="undo"/);
        assert.match(styles, /data-snake-control-mode=swipe/);
      }
      if (template === "merge-2048") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        const styles = readFileSync(join(output, "styles.css"), "utf8");
        assert.match(script, /function drawTileNumber\(/);
        assert.match(script, /ui-monospace, SFMono-Regular/);
        assert.match(script, /const mergeBlueprints = \[/);
        assert.match(script, /function resolveMergeMove\(source, direction\)/);
        assert.match(script, /const mergeMoveDuration = 168/);
        assert.match(script, /merge-session-v2/);
        assert.match(script, /prepareDoubleMerge/);
        assert.match(script, /directSwipe: true/);
        assert.match(script, /spawnDistribution/);
        assert.match(script, /ctx\.roundRect\(layout\.originX/);
        assert.match(styles, /body\[data-template=merge-2048\]\[data-game-state=playing\] \[data-control=up\]/);
        assert.doesNotMatch(script, /mergeFlashUntil/);
      }
      if (template === "platformer") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        assert.match(script, /height: portraitPlatformer \? 1280 : 720/);
        assert.match(script, /const platformerLevelBlueprints = \[/);
        assert.match(script, /function buildPlatformerLevel\(levelNumber\)/);
        assert.match(script, /"bounce","crumble","phase","wind","dash","key-gate","patrol"/);
        assert.match(script, /function performDash\(\)/);
        assert.match(script, /jumpBufferedUntil/);
        assert.match(script, /variableHeight: true/);
        assert.match(script, /simultaneous-hold-and-jump/);
        assert.match(script, /platformCameraY/);
        assert.match(script, /dead-zone-look-ahead/);
        assert.match(script, /recoveryMs: 430/);
      }
      if (template === "space-shooter") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        const html = readFileSync(join(output, "index.html"), "utf8");
        assert.match(script, /function shooterSceneHeight\(\)/);
        assert.match(script, /const shooterWaveCount = 3/);
        assert.match(script, /const shooterEnemyKinds = \["scout", "weaver", "charger", "turret", "shield"\]/);
        assert.match(script, /function shooterLevelBlueprints\(\)/);
        assert.match(script, /function spawnShooterEnemy\(kind, timestamp\)/);
        assert.match(script, /function fireShooterEnemy\(enemy, timestamp\)/);
        assert.match(script, /function activateShooterPulse\(\)/);
        assert.match(script, /function drawShooterHud\(timestamp\)/);
        assert.match(script, /bossPhase: shooterBossPhase/);
        assert.match(script, /enemyBulletVisual: \{ warmSolidCore: true, shapeDistinctFromPlayer: true/);
        assert.match(script, /warningUntil/);
        assert.match(script, /setPointerCapture/);
        assert.match(script, /shooterCombo/);
        assert.match(script, /function drawShooterBullet\(bullet\)/);
        assert.match(script, /function moveShipTowardPointer\(event\)/);
        assert.match(script, /mouse-hover-touch-hold-drag/);
        assert.match(script, /highContrastCore: true/);
        assert.match(script, /space-f-touch-button/);
        assert.match(script, /energy-wave-score-boss/);
        assert.match(html, /data-shooter-loadout="interceptor"/);
        assert.match(html, /data-shooter-loadout="bulwark"/);
        assert.match(html, /data-shooter-loadout="lancer"/);
        assert.match(html, /data-control="pulse"/);
      }
      if (template === "polyomino-fit") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        assert.match(script, /function canPlacePolyPiece/);
        assert.match(script, /function findNearestLegalPlacement/);
        assert.match(script, /polyPlacements\.length === polyPieces\.length/);
        assert.match(script, /function polyTrayLayout\(/);
        assert.match(script, /clickToRotate: true/);
        assert.match(script, /targetCellCount: polyTargetCells\(\)\.size/);
      }
      if (template === "block-place") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        const html = readFileSync(join(output, "index.html"), "utf8");
        assert.match(script, /function canPlaceBlockPiece/);
        assert.match(script, /function findLineClear/);
        assert.match(script, /function hasAnyPlacement/);
        assert.match(script, /function blockTrayLayout\(/);
        assert.match(script, /function drawBlockCell\(/);
        assert.match(script, /const blockBlueprints = \[/);
        assert.match(script, /function createBlockOpening\(/);
        assert.match(script, /function restoreBlockSession\(/);
        assert.match(script, /style: "floating-pedestals"/);
        assert.match(script, /greenContrast: 5\.68/);
        assert.match(html, /data-block-mode="journey"/);
        assert.match(html, /data-block-mode="daily"/);
        assert.match(html, /data-block-mode="endless"/);
      }
      if (template === "region-logic") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        assert.equal(regionLogicLevels.length, 20);
        assert.equal(new Set(regionLogicLevels.map((level) => level.regions.flat().join(""))).size, 20);
        assert.equal(regionLogicLevels.filter((level) => level.starsPerUnit === 2).length, 8);
        assert.equal(new Set(regionLogicLevels.filter((level) => level.starsPerUnit === 2).map((level) => JSON.stringify(level.solution))).size, 8);
        assert.ok(regionLogicLevels.every((level) => level.difficulty.steps > 0));
        assert.match(script, /const regionLevelCatalog/);
        assert.match(script, /function solveRegionPuzzle/);
        assert.match(script, /function countRegionSolutions/);
        assert.match(script, /function countRegionCompletions/);
        assert.match(script, /function recomputeAutoMarks/);
        assert.match(script, /function nextRegionDeduction/);
        assert.match(script, /function restoreRegionSession/);
        assert.match(script, /function redoRegionMove/);
        assert.match(script, /hintUsesSolution: false/);
        assert.match(script, /probeDeadEnd/);
      }
      if (template === "mahjong-roguelite") {
        const script = readFileSync(join(output, "app.js"), "utf8");
        const html = readFileSync(join(output, "index.html"), "utf8");
        const styles = readFileSync(join(output, "styles.css"), "utf8");
        const manifest = JSON.parse(readFileSync(join(output, "game-manifest.json"), "utf8")) as { artPipeline?: { assetCompositionVersion?: number; tileBodySource?: string; spriteContent?: string } };
        assert.match(script, /function isMahjongTileFree/);
        assert.match(script, /function getAvailableMahjongPairs/);
        assert.match(script, /function createSolvableMahjongBoard/);
        assert.match(script, /function chooseMahjongRelic/);
        assert.match(script, /function syncMahjongControls/);
        assert.match(script, /function mahjongTileVisualState/);
        assert.match(script, /function drawMahjongMotif/);
        assert.match(script, /function mahjongPrimaryCue/);
        assert.match(script, /function drawMahjongTileCues/);
        assert.match(script, /function drawMahjongRelicDock/);
        assert.match(script, /function drawMahjongFeedback/);
        assert.match(script, /const minOffset = Math\.min\(\.\.\.verticalOffsets\)/);
        assert.match(script, /y: boardTop - minOffset/);
        assert.match(script, /boardAreaVersion: 2/);
        assert.match(script, /hudDensityVersion: 2/);
        assert.match(script, /emptyRelicDockHeight: 44/);
        assert.match(script, /inBoardLegend: false/);
        assert.match(script, /resourceCountersPlacement: "external-controls"/);
        assert.match(script, /boardPlacement: "available-height-centered"/);
        assert.match(script, /tileScalePolicy: "preserve-ratio-and-spacing"/);
        assert.match(script, /persistentRelicDock: true/);
        assert.match(script, /feedbackVersion: 3/);
        assert.match(script, /cuePrecedence: "selected-matching-hinted-newly-free"/);
        assert.doesNotMatch(script, /function drawMahjongCornerMarks/);
        assert.doesNotMatch(script, /drawBitmapSprite\(mahjongFlash\.sprite/);
        assert.match(script, /function moveMahjongKeyboardCursor/);
        assert.doesNotMatch(script, /亮面为自由牌/);
        assert.match(script, /visualCueVersion: 4/);
        assert.match(script, /selectionChangesGeometry: false/);
        assert.match(script, /assetCompositionVersion: 2/);
        assert.match(script, /spriteContent: "transparent-motif-only"/);
        assert.match(script, /再找一张图案与角标都相同的牌/);
        assert.match(script, /first\.pairId !== tile\.pairId/);
        assert.match(script, /mahjongRelicStacks/);
        assert.match(script, /runtimeDebugState = \(\) =>/);
        assert.match(script, /mahjongRemaining\(\) === 0/);
        assert.match(html, /id="game-canvas"[^>]+tabindex="0"[^>]+aria-describedby="status"/);
        assert.match(styles, /body\[data-template=mahjong-roguelite\] \.canvas-frame::before/);
        assert.match(styles, /body\[data-template=mahjong-roguelite\] \.canvas-frame\{height:calc\(100vh - 24px\)/);
        assert.match(styles, /calc\(\(100vh - 40px\)\*9\/16\)/);
        assert.equal(manifest.artPipeline?.assetCompositionVersion, 2);
        assert.equal(manifest.artPipeline?.tileBodySource, "canvas-single-layer");
        assert.equal(manifest.artPipeline?.spriteContent, "transparent-motif-only");
      }
      if (["merge-2048", "platformer", "space-shooter", "polyomino-fit", "block-place", "region-logic", "mahjong-roguelite"].includes(template)) {
        const source = project.spec.templateSource;
        assert.equal(source?.license, "MIT");
        assert.match(readFileSync(join(output, "index.html"), "utf8"), /OPEN-SOURCE TEMPLATE/);
        assert.match(readFileSync(join(output, "_studio", "OPEN_SOURCE_ATTRIBUTION.md"), "utf8"), /MIT/);
        const sourceManifest = JSON.parse(readFileSync(join(output, "game-manifest.json"), "utf8")) as { templateSource?: { license?: string } };
        assert.equal(sourceManifest.templateSource?.license, "MIT");
      }
    }
  } finally {
    await database.close();
    const safeRoot = resolve(artifactRoot);
    if (safeRoot.startsWith(resolve(tmpdir()))) rmSync(safeRoot, { recursive: true, force: true });
  }
});
