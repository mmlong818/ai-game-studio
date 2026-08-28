// 运行时结构参考 Phaser Examples（MIT）；上游示例资产未进入本项目。
export const platformerScript = String.raw`
const portraitPlatformer = config.aspectRatio === "9:16";
const world = { width: 720, height: portraitPlatformer ? 1280 : 720, gravity: config.difficulty === "relaxed" ? 1500 : config.difficulty === "challenging" ? 1950 : 1720 };
const platforms = portraitPlatformer ? [
  { x: 0, y: 1224, width: 720, height: 56, stage: 0, checkpoint: true },
  { x: 82, y: 1098, width: 172, height: 22, stage: 0 },
  { x: 318, y: 978, width: 142, height: 22, stage: 1, checkpoint: true },
  { x: 510, y: 854, width: 150, height: 22, stage: 1 },
  { x: 286, y: 730, width: 142, height: 22, stage: 2, moving: "horizontal", originX: 286 },
  { x: 82, y: 606, width: 156, height: 22, stage: 2, checkpoint: true },
  { x: 322, y: 482, width: 144, height: 22, stage: 2, moving: "vertical", originY: 482 },
  { x: 524, y: 358, width: 166, height: 22, stage: 3, checkpoint: true },
] : [
  { x: 0, y: 664, width: 720, height: 56, stage: 0, checkpoint: true },
  { x: 108, y: 558, width: 150, height: 22, stage: 0 },
  { x: 322, y: 484, width: 126, height: 22, stage: 1, checkpoint: true },
  { x: 505, y: 390, width: 138, height: 22, stage: 1 },
  { x: 286, y: 286, width: 132, height: 22, stage: 2, moving: "horizontal", originX: 286 },
  { x: 92, y: 196, width: 142, height: 22, stage: 2, checkpoint: true },
  { x: 532, y: 132, width: 154, height: 22, stage: 3, checkpoint: true },
];
const platformStages = ["教学起步", "节奏跳跃", "移动云台", "终点挑战"];
const platformBaseGeometry = platforms.map((platform) => ({ x: platform.x, y: platform.y, width: platform.width, originX: platform.originX, originY: platform.originY }));
const groundY = portraitPlatformer ? 1224 : 664;
const hazardY = groundY - 18;
const hazardZones = [{ x: 266, y: hazardY, width: 52 }, { x: 452, y: hazardY, width: 48 }];
const platformCoins = portraitPlatformer
  ? [{ x: 168, y: 1058 }, { x: 388, y: 938 }, { x: 580, y: 814 }, { x: 350, y: 690 }, { x: 160, y: 566 }, { x: 394, y: 442 }, { x: 610, y: 318 }]
  : [{ x: 186, y: 520 }, { x: 377, y: 445 }, { x: 574, y: 350 }, { x: 350, y: 245 }, { x: 610, y: 92 }];
const platformGoal = portraitPlatformer ? { x: 626, y: 270, width: 46, height: 92 } : { x: 626, y: 66, width: 46, height: 70 };
let player;
let coinsCollected = 0;
let platformLives = 3;
let platformFrame = null;
let platformLast = 0;
let coyoteUntil = 0;
let jumpBufferedUntil = 0;
let invulnerableUntil = 0;
let platformCameraX = portraitPlatformer ? 720 / 1.35 / 2 : 360;
let platformCameraY = 0;
let landingPulseUntil = 0;
let launchStretchUntil = 0;
let platformStage = 0;
let stageAnnounceUntil = 0;
let lastCheckpoint = { x: 86, y: groundY - 64, stage: 0 };
let safeLandingPreview = [];
let held = { left: false, right: false };
let coinTarget = config.difficulty === "relaxed" ? 3 : config.difficulty === "challenging" ? 5 : 4;
let activeHazardCount = 0;

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function resetPlayer(useCheckpoint = true) {
  const spawn = useCheckpoint ? lastCheckpoint : { x: 86, y: groundY - 64, stage: 0 };
  player = { x: spawn.x, y: spawn.y, width: 52, height: 64, vx: 0, vy: 0, grounded: false };
  platformStage = spawn.stage;
}

function landOnPlatforms(previousBottom) {
  const wasGrounded = player.grounded;
  player.grounded = false;
  for (const platform of platforms) {
    if (player.vy < 0) continue;
    const horizontal = player.x + player.width > platform.x && player.x < platform.x + platform.width;
    if (horizontal && previousBottom <= platform.y + 4 && player.y + player.height >= platform.y) {
      player.y = platform.y - player.height;
      player.vy = 0;
      player.grounded = true;
      coyoteUntil = performance.now() + 105;
      if (!wasGrounded) {
        landingPulseUntil = performance.now() + 180;
        playSound("hit");
      }
      if (platform.checkpoint && platform.stage >= lastCheckpoint.stage) {
        lastCheckpoint = { x: platform.x + Math.min(26, platform.width * .2), y: platform.y - player.height, stage: platform.stage };
      }
      if (performance.now() <= jumpBufferedUntil) {
        jumpBufferedUntil = 0;
        player.vy = config.difficulty === "challenging" ? -760 : portraitPlatformer ? -720 : -620;
        player.grounded = false;
        launchStretchUntil = performance.now() + 170;
      }
      return;
    }
  }
}

function jumpPlayer() {
  if (!running) return;
  if (!player.grounded && performance.now() > coyoteUntil) {
    jumpBufferedUntil = performance.now() + 130;
    return;
  }
  player.vy = config.difficulty === "challenging" ? -760 : portraitPlatformer ? -720 : -620;
  player.grounded = false;
  coyoteUntil = 0;
  launchStretchUntil = performance.now() + 170;
  playSound("move");
}

function hurtPlayer(reason) {
  if (performance.now() < invulnerableUntil) return;
  platformLives -= 1;
  if (platformLives <= 0) {
    showResult(false, "跃迁中断", reason + "，能量核心已经耗尽。");
    return;
  }
  invulnerableUntil = performance.now() + 900;
  resetPlayer(true);
  setStatus(reason + "。剩余 " + platformLives + " 点能量，已从“" + platformStages[lastCheckpoint.stage] + "”检查点恢复。");
  playSound("fail");
}

function updatePlatformer(delta, timestamp) {
  const seconds = Math.min(.035, delta / 1000);
  platforms.forEach((platform) => {
    const movementPressure = .82 + (currentCampaignLevel().tier - 1) * .11;
    const phase = currentCampaignLevel().variant * .72;
    if (platform.moving === "horizontal") platform.x = platform.originX + Math.sin(timestamp / 850 + phase) * 104 * movementPressure;
    if (platform.moving === "vertical") platform.y = platform.originY + Math.sin(timestamp / 920 + phase) * 54 * movementPressure;
  });
  const acceleration = player.grounded ? 2100 : 1350;
  if (held.left) player.vx -= acceleration * seconds;
  if (held.right) player.vx += acceleration * seconds;
  if (!held.left && !held.right) player.vx *= player.grounded ? .72 : .96;
  player.vx = Math.max(-265, Math.min(265, player.vx));
  player.vy += world.gravity * seconds;
  const previousBottom = player.y + player.height;
  player.x = Math.max(0, Math.min(world.width - player.width, player.x + player.vx * seconds));
  player.y += player.vy * seconds;
  landOnPlatforms(previousBottom);
  const nextStage = Math.max(0, Math.min(3, platforms.reduce((highest, platform) => player.y <= platform.y + 20 ? Math.max(highest, platform.stage) : highest, 0)));
  if (nextStage > platformStage) {
    platformStage = nextStage;
    stageAnnounceUntil = timestamp + 1100;
    setStatus("进入第 " + (platformStage + 1) + " 段 · " + platformStages[platformStage] + "。观察发光落脚预览。");
    playSound("reward");
  }
  safeLandingPreview = platforms
    .filter((platform) => platform.y < player.y + player.height - 12 && platform.y > player.y - 230 && Math.abs(platform.x + platform.width / 2 - (player.x + player.width / 2)) < 250)
    .sort((a, b) => b.y - a.y)
    .slice(0, currentCampaignLevel().tier >= 4 ? 1 : 2);
  if (portraitPlatformer) {
    const visibleWidth = canvas.width / 1.35;
    const visibleHeight = gameSceneHeight() / 1.35;
    const targetX = Math.max(visibleWidth / 2, Math.min(world.width - visibleWidth / 2, player.x + player.width / 2));
    const targetY = Math.max(0, Math.min(world.height - visibleHeight, player.y - visibleHeight * .62));
    platformCameraX += (targetX - platformCameraX) * Math.min(1, seconds * 5.5);
    platformCameraY += (targetY - platformCameraY) * Math.min(1, seconds * 4.8);
  }

  for (const hazard of hazardZones.slice(0, activeHazardCount)) {
    if (rectsOverlap(player, { x: hazard.x, y: hazard.y, width: hazard.width, height: 20 })) hurtPlayer("落入裂隙");
  }
  if (player.y > world.height + 70) hurtPlayer("跌出浮岛边界");

  platformCoins.forEach((coin) => {
    if (coin.collected) return;
    if (coin.drawX === undefined) { coin.drawX = coin.x; coin.drawY = coin.y; }
    const centerX = player.x + player.width / 2;
    const centerY = player.y + player.height / 2;
    const distance = Math.hypot(centerX - coin.drawX, centerY - coin.drawY);
    if (distance < 118) {
      const attraction = Math.min(1, seconds * (distance < 55 ? 12 : 5.5));
      coin.drawX += (centerX - coin.drawX) * attraction;
      coin.drawY += (centerY - coin.drawY) * attraction;
    }
    const hitbox = { x: coin.drawX - 15, y: coin.drawY - 15, width: 30, height: 30 };
    if (rectsOverlap(player, hitbox)) {
      coin.collected = true;
      coinsCollected += 1;
      setMetric(coinsCollected + " / " + coinTarget);
      playSound("success");
    }
  });
  const atGoal = rectsOverlap(player, platformGoal);
  if (atGoal && coinsCollected >= coinTarget) showResult(true, "信标点亮", "你收集了 " + coinsCollected + " 枚能量并抵达云脊终点。");
  else if (atGoal) setStatus("终点需要至少 " + coinTarget + " 枚能量，目前已收集 " + coinsCollected + " 枚。");
}

function drawPlatformer(timestamp = 0) {
  clearCanvas();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  if (portraitPlatformer) {
    ctx.translate(canvas.width / 2, 0);
    ctx.scale(1.35, 1.35);
    ctx.translate(-platformCameraX, -platformCameraY);
  }
  drawPlayfield(24, 18, 672, world.height - 36, { radius: 28, alpha: .48, fill: palette.surfaceSoft });
  safeLandingPreview.forEach((platform, index) => {
    ctx.save();
    ctx.globalAlpha = .42 - index * .1;
    ctx.strokeStyle = palette.highlight;
    ctx.lineWidth = 4;
    ctx.setLineDash([10, 8]);
    ctx.strokeRect(platform.x - 8, platform.y - 18, platform.width + 16, platform.height + 28);
    ctx.restore();
  });
  platforms.forEach((platform, index) => {
    drawBitmapSprite(index % 2 ? 3 : 2, platform.x, platform.y - 10, platform.width, platform.height + 20, {
      fallback: index === 0 ? palette.pieces[2] : palette.pieces[(index + 1) % palette.pieces.length],
      radius: 9,
      padding: 7,
    });
  });
  hazardZones.slice(0, activeHazardCount).forEach((hazard) => {
    ctx.fillStyle = palette.primary;
    for (let x = hazard.x; x < hazard.x + hazard.width; x += 13) {
      ctx.beginPath(); ctx.moveTo(x, groundY); ctx.lineTo(x + 6.5, hazardY); ctx.lineTo(x + 13, groundY); ctx.fill();
    }
  });
  platformCoins.forEach((coin) => {
    if (coin.collected) return;
    const pulse = 1 + Math.sin(timestamp / 180 + coin.x) * .12;
    const x = coin.drawX ?? coin.x;
    const y = coin.drawY ?? coin.y;
    drawBitmapSprite(4, x - 15 * pulse, y - 15 * pulse, 30 * pulse, 30 * pulse, { fallback: palette.secondary, circle: true, padding: 7 });
  });
  drawBitmapSprite(5, platformGoal.x - 24, platformGoal.y - 24, 88, 116, { fallback: palette.accent, padding: 7 });
  if (!(performance.now() < invulnerableUntil && Math.floor(performance.now() / 90) % 2)) {
    const landing = performance.now() < landingPulseUntil;
    const launching = performance.now() < launchStretchUntil;
    drawBitmapSprite(player.vx < 0 ? 1 : 0, player.x - 16, player.y - 16, player.width + 32, player.height + 32, {
      fallback: palette.primary,
      scaleX: landing ? 1.12 : launching ? .9 : 1,
      scaleY: landing ? .88 : launching ? 1.13 : 1,
    });
  }
  ctx.restore();
  ctx.save();
  ctx.fillStyle = "rgba(8,25,36,.76)";
  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(48, gameSceneTop() + 42, 254, 54, 18);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = palette.highlight;
  ctx.font = "700 17px Inter, sans-serif";
  ctx.fillText("0" + (platformStage + 1) + " / 04 · " + platformStages[platformStage], 68, gameSceneTop() + 75);
  if (timestamp < stageAnnounceUntil) {
    ctx.globalAlpha = Math.min(1, (stageAnnounceUntil - timestamp) / 360);
    drawBitmapSprite(8, 490, gameSceneTop() + 12, 150, 150, { fallback: palette.secondary, alpha: ctx.globalAlpha });
  }
  ctx.restore();
  finishCanvasStyle();
}

function platformLoop(timestamp) {
  if (!running) return;
  const delta = platformLast ? timestamp - platformLast : 16.67;
  platformLast = timestamp;
  updatePlatformer(delta, timestamp);
  drawPlatformer(timestamp);
  if (running) platformFrame = requestAnimationFrame(platformLoop);
}

function startGame() {
  if (platformFrame) cancelAnimationFrame(platformFrame);
  const level = currentCampaignLevel();
  const baseGravity = config.difficulty === "relaxed" ? 1500 : config.difficulty === "challenging" ? 1950 : 1720;
  world.gravity = Math.round(baseGravity * (.9 + (level.tier - 1) * .055));
  coinTarget = Math.min(platformCoins.length, Math.max(2, Math.round((config.difficulty === "relaxed" ? 3 : config.difficulty === "challenging" ? 5 : 4) * level.goalMultiplier)));
  activeHazardCount = level.tier <= 1 ? 0 : level.tier <= 3 ? 1 : 2;
  platforms.forEach((platform, index) => {
    const base = platformBaseGeometry[index];
    platform.x = base.x;
    platform.y = base.y;
    platform.originX = base.originX;
    platform.originY = base.originY;
    platform.width = Math.max(96, base.width * (1 - (level.tier - 1) * .035));
  });
  lastCheckpoint = { x: 86, y: groundY - 64, stage: 0 };
  resetPlayer(false);
  platformLives = config.difficulty === "challenging" ? 2 : 3;
  coinsCollected = 0;
  platformCoins.forEach((coin) => { coin.collected = false; coin.drawX = coin.x; coin.drawY = coin.y; });
  held = { left: false, right: false };
  jumpBufferedUntil = 0;
  platformCameraX = portraitPlatformer ? 720 / 1.35 / 2 : 360;
  platformCameraY = portraitPlatformer ? Math.max(0, groundY - gameSceneHeight() / 1.35) : 0;
  landingPulseUntil = 0;
  launchStretchUntil = 0;
  platformStage = 0;
  stageAnnounceUntil = performance.now() + 1100;
  safeLandingPreview = [];
  running = true;
  platformLast = 0;
  hideOverlay();
  setMetric("0 / " + coinTarget);
  setStatus("第 " + level.number + " 关 · " + level.ruleModifier + " · 当前为教学起步段；收集 " + coinTarget + " 枚能量后抵达信标。");
  startAmbient();
  platformFrame = requestAnimationFrame(platformLoop);
}

function handleControl(value) {
  if (value === "left") { held.left = true; setTimeout(() => { held.left = false; }, 180); }
  if (value === "right") { held.right = true; setTimeout(() => { held.right = false; }, 180); }
  if (value === "jump") jumpPlayer();
}

function handleKey(key) {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") held.left = true;
  if (key === "ArrowRight" || key.toLowerCase() === "d") held.right = true;
  if (key === "ArrowUp" || key.toLowerCase() === "w" || key === " ") jumpPlayer();
}

window.addEventListener("keyup", (event) => {
  if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") held.left = false;
  if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") held.right = false;
});

runtimeDebugState = () => ({
  level: currentCampaignLevel().number,
  tier: currentCampaignLevel().tier,
  stage: platformStage,
  stageLabel: platformStages[platformStage],
  coinsCollected,
  coinTarget,
  lives: platformLives,
  checkpointStage: lastCheckpoint.stage,
  safeLandingCount: safeLandingPreview.length,
  stageCount: platformStages.length,
  stageLabels: [...platformStages],
  camera: { x: Math.round(platformCameraX), y: Math.round(platformCameraY) },
  player: { x: Math.round(player.x), y: Math.round(player.y), width: player.width, height: player.height, grounded: player.grounded },
  playerVisibleWidthRatio: Math.round(player.width / (portraitPlatformer ? canvas.width / 1.35 : canvas.width) * 1000) / 10,
  gravity: world.gravity,
  hazardCount: activeHazardCount,
});

resetPlayer();
drawPlatformer();
`;
