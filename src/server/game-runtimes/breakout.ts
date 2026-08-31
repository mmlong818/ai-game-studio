export const breakoutScript = String.raw`
let paddle;
let ball;
let bricks = [];
let cleared = 0;
let lives = 3;
let frameId = null;
let lastFrame = 0;
let serveDelay = 0;
let currentLevelIndex = 0;
let pendingNextLevel = false;
let campaignComplete = false;
let impactBursts = [];
let brickFragments = [];
let breakoutCombo = 0;
let lastBrickHitAt = 0;
let clearStreak = 0;
let lastBrickClearedAt = 0;
let bombArmed = false;
let lastExplosionRemoved = 0;
let lastExplosionCells = [];
let breakoutMode = "campaign";
let score = 0;
let bestCombo = 0;
let boardsCleared = 0;
let modeStartedAt = 0;
let focusEnergy = 100;
let focusActive = false;
let shieldCharges = 0;
let widePaddleUntil = 0;
let pierceHits = 0;
let lastPowerLabel = "";
let lastPowerAt = 0;
let physicsStepCount = 0;
let collisionProbe = null;
const bombClearThreshold = 3;
const timeAttackSeconds = 120;
const focusTimeScale = .55;
const focusScoreMultiplier = .5;
const levelInputs = Array.from(document.querySelectorAll("[data-breakout-level]"));
const progressLabels = Array.from(document.querySelectorAll("[data-breakout-progress]"));
const modeInputs = Array.from(document.querySelectorAll("[data-breakout-mode]"));
const breakoutLevels = config.breakoutLevels;
const levelImages = breakoutLevels.map((level) => {
  const image = new Image();
  image.decoding = "async";
  image.addEventListener("load", () => drawBreakout());
  image.src = level.path;
  return image;
});

function currentLevel() {
  return breakoutLevels[currentLevelIndex];
}

function breakoutChapterIndex() {
  return Math.min(4, Math.floor(currentLevelIndex / 4));
}

function breakoutModeLabel() {
  return breakoutMode === "time-attack" ? "限时" : breakoutMode === "endless" ? "无尽" : "旅程";
}

function timeAttackRemaining() {
  if (breakoutMode !== "time-attack" || !modeStartedAt) return 0;
  return Math.max(0, timeAttackSeconds - Math.floor((performance.now() - modeStartedAt) / 1000));
}

function comboIntensity() {
  return Math.min(5, Math.max(0, Math.floor((breakoutCombo - 1) / 2)));
}

function activePaddleWidth() {
  const base = paddle?.baseWidth || 118;
  return performance.now() < widePaddleUntil ? Math.min(184, base + 38) : base;
}

function activePowerLabel() {
  if (shieldCharges) return "潮盾 ×" + shieldCharges;
  if (performance.now() < widePaddleUntil) return "宽挡板";
  if (pierceHits) return "穿透 ×" + pierceHits;
  return "能力待命";
}

function updateModeButtons() {
  modeInputs.forEach((input) => {
    const selected = input.dataset.breakoutMode === breakoutMode;
    input.classList.toggle("is-selected", selected);
    input.setAttribute("aria-pressed", String(selected));
  });
}

function setBreakoutMode(nextMode) {
  if (running || !["campaign", "time-attack", "endless"].includes(nextMode)) return;
  breakoutMode = nextMode;
  pendingNextLevel = false;
  campaignComplete = false;
  if (breakoutMode === "campaign") currentLevelIndex = campaignLevelIndex;
  if (paddle) prepareLevel();
  updateModeButtons();
  const descriptions = {
    campaign: "二十关旅程：每关独立结算，逐章解锁特殊砖与更高压力。",
    "time-attack": "120 秒限时：连续清场并追求高分，聚光会减速但得分减半。",
    endless: "无尽航次：砖阵循环升级，失去全部机会后按清场数与得分结算。",
  };
  overlayTitle.textContent = breakoutModeLabel() + "模式 · " + currentLevel().label.replace(/^\d+\s*/, "");
  overlayDetail.textContent = descriptions[breakoutMode];
  startButton.textContent = "开始" + breakoutModeLabel();
  setStatus("已选择" + breakoutModeLabel() + "模式，准备开始。 ");
  drawBreakout();
}

function breakoutLayout() {
  const height = gameSceneHeight();
  return {
    top: config.aspectRatio === "9:16" ? 38 : 48,
    bottom: config.aspectRatio === "9:16" ? height - 38 : 672,
    paddleY: config.aspectRatio === "9:16" ? height - 112 : 632,
    ballY: config.aspectRatio === "9:16" ? height - 166 : 570,
  };
}

function levelHasBrick(level, row, column) {
  const centerColumn = (level.columns - 1) / 2;
  const centerRow = (level.rows - 1) / 2;
  const x = (column - centerColumn) / Math.max(1, centerColumn);
  const y = (row - centerRow) / Math.max(1, centerRow);
  const radius = Math.sqrt(x * x + y * y);
  switch (level.formationIndex) {
    case 0: return row % 2 === 0;
    case 1: return column <= 1 || column >= level.columns - 2 || row >= level.rows - 2;
    case 2: return Math.abs(row - Math.round(column * (level.rows - 1) / (level.columns - 1))) <= 1;
    case 3: return row >= 2 || Math.abs(column - centerColumn) > 1.5;
    case 4: return Math.abs(x) + Math.abs(y) <= 1.18;
    case 5: return Math.abs(x) >= Math.abs(y) * .58;
    case 6: return row >= Math.floor(Math.abs(column - centerColumn) * .52);
    case 7: return radius > .42 && radius < 1.16;
    case 8: return Math.abs(x) < .2 || Math.abs(y) < .24 || Math.abs(Math.abs(x) - Math.abs(y)) < .2;
    case 9: return Math.min(Math.hypot(x - .55, y), Math.hypot(x + .55, y)) < .56;
    case 10: return Math.abs(y) < .22 || Math.abs(y - x * .62) < .2 || (x > .58 && Math.abs(y) < .48);
    case 11: return Math.abs(y) < .2 || Math.abs(Math.abs(y) - Math.abs(x) * .58) < .18;
    case 12: {
      const wave = Math.sin(column * 1.08) * .34;
      return Math.abs(y - wave) < .25 || Math.abs(y - wave + .7) < .2;
    }
    case 13: return row === 0 || row === level.rows - 1 || column === 1 || column === level.columns - 2 || (Math.abs(column - centerColumn) < .6 && row > centerRow);
    case 14: return row === 0 || column === level.columns - 1 || (row === level.rows - 1 && column > 1) || (column === 1 && row > 1) || (row === 2 && column > 1 && column < level.columns - 2);
    case 15: {
      const peak = column === 1 || column === Math.round(centerColumn) || column === level.columns - 2;
      return row >= level.rows - 3 || (row === level.rows - 4 && column % 2 === 0) || (row <= 2 && peak);
    }
    case 16: return (row + column) % 2 === 0 || row === level.rows - 1;
    case 17: {
      const upperLobes = Math.min(Math.hypot(x - .42, y + .42), Math.hypot(x + .42, y + .42)) < .58;
      const lowerPoint = y >= -.15 && Math.abs(x) < .88 * (1 - (y + .15) / 1.35);
      return upperLobes || lowerPoint;
    }
    case 18: return row <= 1 || Math.abs(column - centerColumn) <= Math.max(.6, centerColumn * (1 - row / (level.rows + 1)));
    case 19: {
      const peak = column === 1 || column === Math.round(centerColumn) || column === level.columns - 2;
      return row >= level.rows - 3 || (row === level.rows - 4 && column % 2 === 0) || (row <= 2 && peak) || (row === 3 && Math.abs(column - centerColumn) <= 2);
    }
    default: return true;
  }
}

function breakoutBrickKind(level, row, column, armorValue) {
  const tier = breakoutChapterIndex() + 1;
  const specialValue = ((row * 43 + column * 67 + currentLevelIndex * 29) % 101) / 101;
  if (tier >= 2 && specialValue < .045) return "shield";
  if (tier >= 3 && specialValue >= .22 && specialValue < .27) return "wide";
  if (tier >= 4 && specialValue >= .48 && specialValue < .535) return "pierce";
  return armorValue < level.armorRate ? "armor" : "normal";
}

function createBricks() {
  const level = currentLevel();
  const layout = breakoutLayout();
  const fieldWidth = 596;
  const gap = level.columns === 10 ? 7 : 8;
  const brickWidth = (fieldWidth - gap * (level.columns - 1)) / level.columns;
  const brickHeight = level.rows >= 8 ? 34 : 38;
  const rowGap = level.rows >= 8 ? 7 : 8;
  bricks = [];
  for (let row = 0; row < level.rows; row += 1) {
    for (let column = 0; column < level.columns; column += 1) {
      if (!levelHasBrick(level, row, column)) continue;
      const armorValue = ((row * 17 + column * 31 + currentLevelIndex * 13) % 100) / 100;
      const kind = breakoutBrickKind(level, row, column, armorValue);
      const hits = kind === "armor" ? (armorValue < level.armorRate * .42 ? 3 : 2) : 1;
      bricks.push({
        id: currentLevelIndex + ":" + row + ":" + column,
        x: 62 + column * (brickWidth + gap),
        y: layout.top + 118 + row * (brickHeight + rowGap),
        width: brickWidth,
        height: brickHeight,
        row,
        column,
        alive: true,
        hits,
        maxHits: hits,
        kind,
        tone: (row + column + currentLevelIndex) % 4,
        hitAt: 0,
      });
    }
  }
}

function drawStageHud(layout) {
  const label = currentLevel().label.replace(/^\d+\s*/, "");
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(68, layout.top + 22, 584, 76, 20);
  ctx.fillStyle = "rgba(3,30,37,.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(192,236,255,.42)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(223,246,255,.72)";
  ctx.font = "650 18px Inter, sans-serif";
  ctx.fillText(breakoutModeLabel() + " · " + String(currentLevelIndex + 1).padStart(2, "0"), 94, layout.top + 47);
  ctx.fillStyle = "#fff8e8";
  ctx.font = "800 27px Inter, sans-serif";
  ctx.fillText(label, 94, layout.top + 75, 300);
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(223,246,255,.72)";
  ctx.font = "650 14px Inter, sans-serif";
  ctx.fillText("得分", 488, layout.top + 45);
  ctx.fillStyle = "#ece4b4";
  ctx.font = "850 23px Inter, sans-serif";
  ctx.fillText(String(score), 488, layout.top + 73, 112);
  if (breakoutMode === "time-attack") {
    ctx.fillStyle = timeAttackRemaining() <= 15 ? "#f39ba8" : "rgba(223,246,255,.78)";
    ctx.font = "750 12px ui-monospace, Consolas, monospace";
    ctx.fillText(timeAttackRemaining() + "秒", 488, layout.top + 91);
  }
  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(223,246,255,.72)";
  ctx.font = "650 18px Inter, sans-serif";
  ctx.fillText("机会", 626, layout.top + 48);
  for (let index = 0; index < 3; index += 1) {
    ctx.beginPath();
    ctx.arc(578 + index * 23, layout.top + 74, 7, 0, Math.PI * 2);
    ctx.fillStyle = index < lives ? "#fff4ca" : "rgba(218,238,248,.18)";
    ctx.fill();
  }
  ctx.restore();
}

function drawImpactBursts(timestamp) {
  impactBursts = impactBursts.filter((impact) => timestamp - impact.startedAt < (impact.cross ? 360 : 230));
  impactBursts.forEach((impact) => {
    const duration = impact.cross ? 360 : 230;
    const progress = (timestamp - impact.startedAt) / duration;
    const size = 46 + progress * 54;
    const arms = impact.cross ? [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] : [[0, 0]];
    arms.forEach(([dx, dy], index) => {
      const distance = impact.cross && index ? 16 + progress * 54 : 0;
      drawBitmapSprite(6, impact.x + dx * distance - size / 2, impact.y + dy * distance - size / 2, size, size, {
        fallback: "#fff0a8",
        padding: 8,
        scale: 1.08,
        alpha: (1 - progress) * (impact.cross && index ? .82 : 1),
        rotation: progress * .3 + index * .12,
      });
    });
  });
}

function spawnBrickFragments(brick, count) {
  for (let index = 0; index < count; index += 1) {
    brickFragments.push({
      x: brick.x + brick.width * (.25 + Math.random() * .5),
      y: brick.y + brick.height * (.25 + Math.random() * .5),
      vx: (Math.random() - .5) * 3.6,
      vy: -1.2 - Math.random() * 2.5,
      life: 1,
      rotation: Math.random() * Math.PI,
      size: 12 + Math.random() * 12,
    });
  }
}

function drawBrickFragments() {
  brickFragments.forEach((fragment) => {
    drawBitmapImage(stageCImages[breakoutChapterIndex() * 3 + 2], fragment.x - fragment.size / 2, fragment.y - fragment.size / 2, fragment.size, fragment.size * .65, {
      fallback: palette.highlight,
      alpha: fragment.life,
      rotation: fragment.rotation,
    });
  });
}

function drawLevelBackground() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#081733";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const image = levelImages[currentLevelIndex];
  if (image?.complete && image.naturalWidth) {
    ctx.save();
    ctx.globalAlpha = .52;
    drawImageCover(image, 0, 0, canvas.width, canvas.height);
    const shade = ctx.createLinearGradient(0, 0, 0, canvas.height);
    shade.addColorStop(0, "rgba(3,13,34,.48)");
    shade.addColorStop(.55, "rgba(4,13,35,.58)");
    shade.addColorStop(1, "rgba(3,8,26,.72)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function drawSimpleBrick(brick) {
  const chapterColors = [
    ["#f4d7c2", "#edbd99", "#ffe6c9", "#dca98a"],
    ["#ef8a70", "#f5a37f", "#dc705e", "#ffc09d"],
    ["#9ed8dd", "#7cc4d2", "#b9e7e3", "#6aaebe"],
    ["#e8c86e", "#d9ad58", "#f4df94", "#c99747"],
    ["#9fb8d5", "#7e9abb", "#bfd0e2", "#6d86aa"],
  ];
  const colors = chapterColors[breakoutChapterIndex()];
  const color = colors[brick.tone % colors.length];
  const kindColors = { shield: "#8adce8", wide: "#f0d080", pierce: "#f39ba8" };
  const damage = brick.maxHits - brick.hits;
  const impactScale = performance.now() - brick.hitAt < 120 ? .94 : 1;
  const radius = 8;
  ctx.save();
  ctx.translate(brick.x + brick.width / 2, brick.y + brick.height / 2);
  ctx.scale(impactScale, impactScale);
  ctx.translate(-brick.x - brick.width / 2, -brick.y - brick.height / 2);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(brick.x, brick.y, brick.width, brick.height, radius);
  ctx.fill();
  drawBitmapImage(stageCImages[breakoutChapterIndex() * 3 + Math.min(2, damage)], brick.x, brick.y, brick.width, brick.height, {
    fallback: color,
    radius,
    fit: "cover",
    alpha: .42,
  });
  const sheen = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
  sheen.addColorStop(0, "rgba(255,255,255,.38)");
  sheen.addColorStop(.42, "rgba(255,255,255,.06)");
  sheen.addColorStop(1, "rgba(8,28,47,.18)");
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.roundRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2, radius - 1);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,.18)";
  ctx.beginPath();
  ctx.roundRect(brick.x + 8, brick.y + 7, Math.max(12, brick.width - 16), Math.max(7, brick.height * .2), 5);
  ctx.fill();
  ctx.strokeStyle = damage ? "rgba(255,235,190,.92)" : "rgba(223,246,255,.52)";
  ctx.lineWidth = damage ? 2.5 : 1.5;
  ctx.beginPath();
  ctx.roundRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2, radius - 1);
  ctx.stroke();
  if (brick.maxHits > 1) {
    for (let index = 0; index < brick.maxHits; index += 1) {
      ctx.beginPath();
      ctx.arc(brick.x + brick.width - 9 - index * 9, brick.y + 8, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = index < brick.hits ? "rgba(255,250,220,.94)" : "rgba(26,50,69,.28)";
      ctx.fill();
    }
  }
  if (brick.kind !== "normal" && brick.kind !== "armor") {
    const marker = brick.kind === "shield" ? "◇" : brick.kind === "wide" ? "↔" : "✦";
    ctx.beginPath();
    ctx.arc(brick.x + 12, brick.y + brick.height / 2, 8, 0, Math.PI * 2);
    ctx.fillStyle = kindColors[brick.kind];
    ctx.fill();
    ctx.fillStyle = "#07172b";
    ctx.font = "900 11px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(marker, brick.x + 12, brick.y + brick.height / 2 + .5);
  }
  ctx.restore();
}

function drawBombStatus(layout) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(68, layout.paddleY - 82, 584, 48, 18);
  ctx.fillStyle = "rgba(3,30,37,.88)";
  ctx.fill();
  ctx.strokeStyle = bombArmed ? "rgba(236,228,180,.92)" : "rgba(185,224,239,.28)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(223,246,255,.68)";
  ctx.font = "700 12px Inter, sans-serif";
  ctx.fillText("聚光", 88, layout.paddleY - 58);
  ctx.fillStyle = "rgba(223,246,255,.18)";
  ctx.fillRect(128, layout.paddleY - 64, 126, 12);
  ctx.fillStyle = focusActive ? "#8adce8" : "rgba(138,220,232,.72)";
  ctx.fillRect(128, layout.paddleY - 64, 126 * focusEnergy / 100, 12);
  ctx.fillStyle = "rgba(223,246,255,.8)";
  ctx.font = "750 12px ui-monospace, Consolas, monospace";
  ctx.fillText(Math.round(focusEnergy) + "%", 262, layout.paddleY - 58);
  if (bombArmed) drawBitmapSprite(6, 316, layout.paddleY - 72, 28, 28, { fallback: "#ece4b4", padding: 2, scale: 1.08 });
  ctx.fillStyle = bombArmed ? "#ece4b4" : "rgba(223,246,255,.68)";
  ctx.font = "800 13px Inter, sans-serif";
  ctx.fillText(bombArmed ? "爆炸就绪" : "连消 " + clearStreak + "/" + bombClearThreshold, 348, layout.paddleY - 58);
  const powerText = activePowerLabel();
  ctx.textAlign = "right";
  ctx.fillStyle = shieldCharges || pierceHits || performance.now() < widePaddleUntil ? "#f5d38a" : "rgba(223,246,255,.62)";
  ctx.fillText(powerText + (breakoutCombo >= 2 ? " · 连击 ×" + breakoutCombo : ""), 632, layout.paddleY - 58);
  ctx.restore();
}

function drawBreakout() {
  drawLevelBackground();
  const layout = breakoutLayout();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  drawPlayfield(42, layout.top, 636, layout.bottom - layout.top, { radius: 28, alpha: .82, fill: "rgba(7,20,49,.76)", stroke: "rgba(176,232,255,.46)" });
  drawStageHud(layout);
  drawBombStatus(layout);
  bricks.forEach((brick) => {
    if (!brick.alive) return;
    drawSimpleBrick(brick);
  });
  drawImpactBursts(performance.now());
  drawBrickFragments();
  drawBitmapSprite(4, paddle.x, paddle.y - 10, paddle.width, paddle.height + 20, { fallback: palette.highlight, radius: 14, padding: 8, scale: 1.12 });
  drawBitmapSprite(5, ball.x - ball.radius - 4, ball.y - ball.radius - 4, (ball.radius + 4) * 2, (ball.radius + 4) * 2, { fallback: palette.primary, circle: true, padding: 5, scale: 1.15 });
  ctx.strokeStyle = "rgba(235,253,255,.9)";
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 6, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  finishCanvasStyle();
}

function hitBrick(brick) {
  return brick.alive && ball.x + ball.radius > brick.x && ball.x - ball.radius < brick.x + brick.width &&
    ball.y + ball.radius > brick.y && ball.y - ball.radius < brick.y + brick.height;
}

function destroyBrick(brick, fragmentCount = 4) {
  if (!brick.alive) return false;
  brick.alive = false;
  spawnBrickFragments(brick, fragmentCount);
  cleared += 1;
  return true;
}

function grantBrickPower(brick) {
  if (!brick || !["shield", "wide", "pierce"].includes(brick.kind)) return "";
  if (brick.kind === "shield") shieldCharges = Math.min(2, shieldCharges + 1);
  if (brick.kind === "wide") widePaddleUntil = Math.max(widePaddleUntil, performance.now()) + 10_000;
  if (brick.kind === "pierce") pierceHits = Math.min(8, pierceHits + 4);
  lastPowerLabel = brick.kind === "shield" ? "潮盾已充能" : brick.kind === "wide" ? "挡板扩展 10 秒" : "穿透强化 4 次";
  lastPowerAt = performance.now();
  playSound("reward");
  return lastPowerLabel;
}

function scoreDestroyedBrick(brick, factor = 1) {
  const base = brick.kind === "armor" ? 75 : ["shield", "wide", "pierce"].includes(brick.kind) ? 90 : 50;
  const comboMultiplier = 1 + Math.min(9, Math.max(0, breakoutCombo - 1)) * .12;
  const focusMultiplier = focusActive ? focusScoreMultiplier : 1;
  const earned = Math.max(1, Math.round(base * comboMultiplier * focusMultiplier * factor));
  score += earned;
  focusEnergy = Math.min(100, focusEnergy + 6);
  return earned;
}

function registerClearForBomb(timestamp) {
  clearStreak = timestamp - lastBrickClearedAt < 1800 ? clearStreak + 1 : 1;
  lastBrickClearedAt = timestamp;
  if (clearStreak < bombClearThreshold || bombArmed) return false;
  bombArmed = true;
  clearStreak = 0;
  playSound("reward");
  return true;
}

function crossNeighbors(center) {
  return bricks.filter((candidate) => candidate.alive && (
    (candidate.row === center.row && Math.abs(candidate.column - center.column) === 1) ||
    (candidate.column === center.column && Math.abs(candidate.row - center.row) === 1)
  ));
}

function triggerCrossExplosion(center) {
  const neighbors = crossNeighbors(center);
  lastExplosionCells = neighbors.map((brick) => brick.row + ":" + brick.column);
  lastExplosionRemoved = 0;
  neighbors.forEach((brick) => {
    if (!destroyBrick(brick, 6)) return;
    lastExplosionRemoved += 1;
    scoreDestroyedBrick(brick, .65);
    grantBrickPower(brick);
  });
  impactBursts.push({ x: center.x + center.width / 2, y: center.y + center.height / 2, startedAt: performance.now(), cross: true });
  bombArmed = false;
  clearStreak = 0;
  playSound("success");
  return lastExplosionRemoved;
}

function resolveDestroyedBrick(brick) {
  const triggerBomb = bombArmed;
  if (!destroyBrick(brick, breakoutCombo >= 4 ? 7 : 4)) return "";
  const earned = scoreDestroyedBrick(brick);
  const powerMessage = grantBrickPower(brick);
  if (triggerBomb) {
    const removed = triggerCrossExplosion(brick);
    return "十字爆炸 · 额外清除 " + removed + " 块 · +" + earned + " 分" + (powerMessage ? " · " + powerMessage : "");
  }
  if (registerClearForBomb(performance.now())) return "连续消除达成 · 爆炸已就绪 · +" + earned + " 分" + (powerMessage ? " · " + powerMessage : "");
  return "+" + earned + " 分" + (powerMessage ? " · " + powerMessage : "");
}

function resetBall() {
  const level = currentLevel();
  const layout = breakoutLayout();
  const difficultyMultiplier = config.difficulty === "challenging" ? 1.08 : config.difficulty === "relaxed" ? .84 : 1;
  const endlessPressure = breakoutMode === "endless" ? Math.min(1.32, 1 + boardsCleared * .025) : 1;
  const speed = level.speed * difficultyMultiplier * endlessPressure;
  ball = { x: paddle.x + paddle.width / 2, y: layout.ballY, vx: speed * .72, vy: -speed, radius: 14 };
  serveDelay = 900;
}

function syncLevelControls() {
  levelInputs.forEach((input) => { input.value = String(currentLevelIndex); });
  const level = currentLevel();
  progressLabels.forEach((label) => {
    label.textContent = "第 " + (currentLevelIndex + 1) + " / " + breakoutLevels.length + " 关 · " + level.label.replace(/^\d+\s*/, "") + " · " + lives + " 次机会";
  });
}

function showLevelComplete() {
  setGameSessionState("stage-complete");
  sounds.ambient.pause();
  pendingNextLevel = true;
  overlayTitle.textContent = currentLevel().label.replace(/^\d+\s*/, "") + " 已澄明";
  overlayDetail.textContent = "本关得分 " + score + "，最高连击 ×" + bestCombo + "。已解锁下一关；每四关进入新章节并加入新的特殊砖。";
  startButton.textContent = "进入下一关";
  overlay.hidden = false;
  playSound("success");
}

function handleLevelCleared() {
  boardsCleared += 1;
  score += 250 + Math.min(750, bestCombo * 25);
  if (breakoutMode !== "campaign") {
    currentLevelIndex = (currentLevelIndex + 1) % breakoutLevels.length;
    prepareLevel({ preserveRun: true });
    setMetric(cleared + " / " + bricks.length);
    setStatus(breakoutModeLabel() + "连续清场 " + boardsCleared + " 次 · 得分 " + score + " · 下一砖阵已展开。 ");
    return;
  }
  if (currentLevelIndex < breakoutLevels.length - 1) {
    unlockNextCampaignLevel();
    syncCampaignUi();
    writeCampaignProgress();
    showLevelComplete();
    return;
  }
  campaignComplete = true;
  showResult(true, "五重漆海全部澄明", "你已经击散二十种砖阵，以 " + score + " 分完成深海王冠终局，最高连击 ×" + bestCombo + "。 ");
}

function loseLife() {
  lives -= 1;
  breakoutCombo = 0;
  focusActive = false;
  if (lives <= 0) {
    if (breakoutMode === "campaign") showResult(false, "光球沉入海面", "本关三次机会已经用完；本局得分 " + score + "，最高连击 ×" + bestCombo + "。 ");
    else showTerminalResult(false, "航次在漆海中止", "连续清场 " + boardsCleared + " 次，获得 " + score + " 分，最高连击 ×" + bestCombo + "。 ");
    syncLevelControls();
    return;
  }
  resetBall();
  setStatus(currentLevel().label + " · 剩余 " + lives + " 次机会，光球即将重新发射。");
  syncLevelControls();
  playSound("fail");
}

function syncActivePaddleWidth() {
  const nextWidth = activePaddleWidth();
  if (Math.abs(paddle.width - nextWidth) < .1) return;
  const center = paddle.x + paddle.width / 2;
  paddle.width = nextWidth;
  paddle.x = Math.max(48, Math.min(672 - paddle.width, center - paddle.width / 2));
}

function updateFocus(delta) {
  if (!focusActive) return;
  focusEnergy = Math.max(0, focusEnergy - delta * .024);
  if (focusEnergy > 0) return;
  focusActive = false;
  setStatus("聚光能量耗尽，时间流速已经恢复。 ");
}

function updateBrickFragments(scale) {
  brickFragments.forEach((fragment) => {
    fragment.x += fragment.vx * scale;
    fragment.y += fragment.vy * scale;
    fragment.vy += .11 * scale;
    fragment.rotation += .06 * scale;
    fragment.life -= .035 * scale;
  });
  brickFragments = brickFragments.filter((fragment) => fragment.life > 0);
}

function resolvePaddleBounce(previousY) {
  const crossedPaddle = previousY + ball.radius <= paddle.y + 3 && ball.y + ball.radius >= paddle.y;
  if (ball.vy <= 0 || !crossedPaddle || ball.x < paddle.x - ball.radius || ball.x > paddle.x + paddle.width + ball.radius) return false;
  const offset = Math.max(-1, Math.min(1, (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2)));
  const endlessLimit = breakoutMode === "endless" ? 1 + Math.min(.28, boardsCleared * .02) : 1;
  const speed = Math.min(currentLevel().speed * 1.78 * endlessLimit, Math.hypot(ball.vx, ball.vy) * 1.022);
  ball.vx = Math.sin(offset * 1.02) * speed;
  ball.vy = -Math.max(speed * .62, Math.abs(Math.cos(offset * 1.02) * speed));
  const normalized = Math.hypot(ball.vx, ball.vy) || 1;
  ball.vx = ball.vx / normalized * speed;
  ball.vy = ball.vy / normalized * speed;
  ball.y = paddle.y - ball.radius - 1;
  playSound("move");
  return true;
}

function reflectBallFromBrick(brick, previousX, previousY) {
  const fromAbove = previousY + ball.radius <= brick.y;
  const fromBelow = previousY - ball.radius >= brick.y + brick.height;
  const fromLeft = previousX + ball.radius <= brick.x;
  const fromRight = previousX - ball.radius >= brick.x + brick.width;
  if (fromAbove) { ball.y = brick.y - ball.radius; ball.vy = -Math.abs(ball.vy); return "vertical"; }
  if (fromBelow) { ball.y = brick.y + brick.height + ball.radius; ball.vy = Math.abs(ball.vy); return "vertical"; }
  if (fromLeft) { ball.x = brick.x - ball.radius; ball.vx = -Math.abs(ball.vx); return "horizontal"; }
  if (fromRight) { ball.x = brick.x + brick.width + ball.radius; ball.vx = Math.abs(ball.vx); return "horizontal"; }
  const overlapX = Math.min(ball.x + ball.radius - brick.x, brick.x + brick.width - (ball.x - ball.radius));
  const overlapY = Math.min(ball.y + ball.radius - brick.y, brick.y + brick.height - (ball.y - ball.radius));
  if (overlapX < overlapY) { ball.vx *= -1; return "horizontal"; }
  ball.vy *= -1;
  return "vertical";
}

function accelerateBallAfterBrick() {
  const currentSpeed = Math.hypot(ball.vx, ball.vy);
  const speedLimit = currentLevel().speed * 1.82;
  if (currentSpeed >= speedLimit) return;
  const multiplier = Math.min(1.018, speedLimit / Math.max(.1, currentSpeed));
  ball.vx *= multiplier;
  ball.vy *= multiplier;
}

function resolveBrickContact(brick, previousX, previousY) {
  const now = performance.now();
  const piercing = pierceHits > 0;
  impactBursts.push({ x: ball.x, y: ball.y, startedAt: now });
  brick.hitAt = now;
  breakoutCombo = now - lastBrickHitAt < 1450 ? breakoutCombo + 1 : 1;
  bestCombo = Math.max(bestCombo, breakoutCombo);
  lastBrickHitAt = now;
  if (piercing) { pierceHits -= 1; brick.hits = 0; } else { brick.hits -= 1; reflectBallFromBrick(brick, previousX, previousY); }
  accelerateBallAfterBrick();
  if (sounds.ambient) sounds.ambient.volume = Math.min(.3, .16 + comboIntensity() * .025);
  if (brick.hits <= 0) {
    const effectMessage = resolveDestroyedBrick(brick);
    setMetric(cleared + " / " + bricks.length);
    setStatus((piercing ? "穿透命中 · " : "") + effectMessage + (breakoutCombo >= 3 ? " · 连击 ×" + breakoutCombo : ""));
  } else {
    spawnBrickFragments(brick, 2);
    setStatus(currentLevel().label + " · 重甲受损 " + (brick.maxHits - brick.hits) + " / " + brick.maxHits + "。 ");
  }
  playSound("move");
  if (cleared === bricks.length) { handleLevelCleared(); return true; }
  return false;
}

function advanceBallPhysics(scale, layout) {
  const distance = Math.hypot(ball.vx, ball.vy) * scale;
  const steps = Math.max(1, Math.ceil(distance / Math.max(5, ball.radius * .55)));
  physicsStepCount = steps;
  const hitIds = new Set();
  for (let step = 0; step < steps; step += 1) {
    const previousX = ball.x;
    const previousY = ball.y;
    ball.x += ball.vx * scale / steps;
    ball.y += ball.vy * scale / steps;
    if (ball.x - ball.radius < 48) { ball.x = 48 + ball.radius; ball.vx = Math.abs(ball.vx); }
    if (ball.x + ball.radius > 672) { ball.x = 672 - ball.radius; ball.vx = -Math.abs(ball.vx); }
    if (ball.y - ball.radius < layout.top + 10) { ball.y = layout.top + 10 + ball.radius; ball.vy = Math.abs(ball.vy); }
    if (resolvePaddleBounce(previousY)) continue;
    const brick = bricks.find((candidate) => !hitIds.has(candidate.id) && hitBrick(candidate));
    if (brick) {
      hitIds.add(brick.id);
      if (resolveBrickContact(brick, previousX, previousY)) return;
    }
    if (ball.y - ball.radius <= layout.bottom + 24) continue;
    if (shieldCharges > 0) {
      shieldCharges -= 1;
      lastPowerLabel = "潮盾拦截失球";
      lastPowerAt = performance.now();
      resetBall();
      setStatus("潮盾已拦截一次失球，光球重新发射。 ");
      playSound("reward");
    } else loseLife();
    return;
  }
}

function updateBreakout(delta) {
  const layout = breakoutLayout();
  if (breakoutMode === "time-attack" && modeStartedAt && timeAttackRemaining() <= 0) {
    focusActive = false;
    showTerminalResult(true, "限时航次结算", "120 秒内清场 " + boardsCleared + " 次，获得 " + score + " 分，最高连击 ×" + bestCombo + "。 ");
    return;
  }
  updateFocus(delta);
  syncActivePaddleWidth();
  const timeScale = focusActive ? focusTimeScale : 1;
  const scale = Math.min(2, delta / 16.67) * timeScale;
  updateBrickFragments(scale);
  if (serveDelay > 0) {
    serveDelay = Math.max(0, serveDelay - delta);
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - 28;
    return;
  }
  advanceBallPhysics(scale, layout);
}

function loop(timestamp) {
  if (!running) return;
  const delta = lastFrame ? timestamp - lastFrame : 16.67;
  lastFrame = timestamp;
  updateBreakout(delta);
  drawBreakout();
  if (running) frameId = requestAnimationFrame(loop);
}

function movePaddle(direction) {
  if (!running) return;
  paddle.x = Math.max(48, Math.min(672 - paddle.width, paddle.x + direction * 38));
  drawBreakout();
}

function toggleFocus() {
  if (!running) return;
  if (!focusActive && focusEnergy <= 0) {
    setStatus("聚光能量不足；击碎砖块可以补充能量。 ");
    return;
  }
  focusActive = !focusActive;
  setStatus(focusActive ? "聚光已开启：时间流速降低，期间得分减半。 " : "聚光已关闭：恢复正常流速与得分。 ");
  playSound("move");
}

canvas.addEventListener("pointermove", (event) => {
  if (!running) return;
  const { x } = eventScenePoint(event);
  paddle.x = Math.max(48, Math.min(672 - paddle.width, x - paddle.width / 2));
});

function prepareLevel(options = {}) {
  const preserveRun = options.preserveRun === true;
  const paddleBase = config.difficulty === "relaxed" ? 150 : config.difficulty === "challenging" ? 88 : 118;
  const levelPenalty = breakoutChapterIndex() * 6;
  const layout = breakoutLayout();
  const baseWidth = paddleBase - levelPenalty;
  paddle = { x: 360 - baseWidth / 2, y: layout.paddleY, width: baseWidth, baseWidth, height: 18 };
  cleared = 0;
  if (!preserveRun) {
    lives = 3;
    score = 0;
    bestCombo = 0;
    boardsCleared = 0;
    focusEnergy = 100;
    shieldCharges = 0;
    widePaddleUntil = 0;
    pierceHits = 0;
    lastPowerLabel = "";
    lastPowerAt = 0;
  }
  impactBursts = [];
  brickFragments = [];
  breakoutCombo = 0;
  focusActive = false;
  lastBrickHitAt = 0;
  clearStreak = 0;
  lastBrickClearedAt = 0;
  bombArmed = false;
  lastExplosionRemoved = 0;
  lastExplosionCells = [];
  createBricks();
  resetBall();
  syncLevelControls();
}

function startGame() {
  if (frameId) cancelAnimationFrame(frameId);
  if (breakoutMode === "campaign" && campaignComplete) {
    currentLevelIndex = 0;
    campaignComplete = false;
    setCampaignLevel(0, { allowLocked: true });
  } else if (breakoutMode === "campaign" && pendingNextLevel) {
    currentLevelIndex = Math.min(breakoutLevels.length - 1, currentLevelIndex + 1);
    setCampaignLevel(currentLevelIndex, { allowLocked: true, unlock: true });
  }
  pendingNextLevel = false;
  prepareLevel();
  modeStartedAt = performance.now();
  running = true;
  lastFrame = 0;
  hideOverlay();
  setMetric("0 / " + bricks.length);
  setStatus(breakoutModeLabel() + "模式 · 清除 " + bricks.length + " 块砖；连消三块可获得十字爆炸，F 键或聚光按钮可减速。 ");
  startAmbient();
  frameId = requestAnimationFrame(loop);
}

function selectLevel(index) {
  currentLevelIndex = Math.max(0, Math.min(breakoutLevels.length - 1, index));
  pendingNextLevel = false;
  campaignComplete = false;
  if (running) {
    startGame();
    return;
  }
  prepareLevel();
  overlayTitle.textContent = currentLevel().label.replace(/^\d+\s*/, "");
  overlayDetail.textContent = "每关使用不同砖阵；章节会逐步加入潮盾、宽挡板与穿透特殊砖，连消三块可获得十字爆炸。";
  startButton.textContent = "开始" + breakoutModeLabel();
  setMetric("0 / " + bricks.length);
  setStatus("已选择 " + currentLevel().label + "，准备开始。");
  drawBreakout();
}

levelInputs.forEach((input) => input.addEventListener("change", () => selectLevel(Number(input.value))));
modeInputs.forEach((input) => input.addEventListener("click", () => setBreakoutMode(input.dataset.breakoutMode)));

onCampaignLevelChanged = () => {
  currentLevelIndex = campaignLevelIndex;
  pendingNextLevel = false;
  campaignComplete = false;
  if (paddle) prepareLevel();
  if (!running && paddle) drawBreakout();
};

runtimeDebugActions = {
  setCampaignMode: () => setBreakoutMode("campaign"),
  setTimeAttackMode: () => setBreakoutMode("time-attack"),
  setEndlessMode: () => setBreakoutMode("endless"),
  toggleFocus: () => toggleFocus(),
  grantSpecialPowers: () => {
    shieldCharges = 1;
    widePaddleUntil = performance.now() + 10_000;
    pierceHits = 4;
    lastPowerLabel = "验收能力组";
    lastPowerAt = performance.now();
    drawBreakout();
  },
  simulateSideCollision: () => {
    const target = bricks.find((brick) => brick.alive);
    if (!target) return;
    ball.x = target.x - ball.radius + 1;
    ball.y = target.y + target.height / 2;
    ball.vx = Math.abs(ball.vx || currentLevel().speed);
    const beforeVx = ball.vx;
    const axis = reflectBallFromBrick(target, target.x - ball.radius - 2, ball.y);
    collisionProbe = { axis, beforeVx, afterVx: ball.vx, finite: Number.isFinite(ball.x) && Number.isFinite(ball.y) };
    drawBreakout();
  },
  completeCurrentStage: () => {
    bricks.forEach((brick) => { brick.alive = false; });
    cleared = bricks.length;
    handleLevelCleared();
  },
  earnBomb: () => {
    bombArmed = false;
    clearStreak = bombClearThreshold - 1;
    lastBrickClearedAt = performance.now();
    registerClearForBomb(performance.now());
    drawBreakout();
  },
  triggerArmedBomb: () => {
    const center = bricks.find((brick) => brick.alive && crossNeighbors(brick).length > 0);
    if (!center) return;
    bombArmed = true;
    resolveDestroyedBrick(center);
    setMetric(cleared + " / " + bricks.length);
    drawBreakout();
  },
};

runtimeDebugState = () => ({
  level: currentLevelIndex + 1,
  levelId: currentLevel().id,
  chapter: breakoutChapterIndex() + 1,
  pattern: currentLevel().pattern,
  formationIndex: currentLevel().formationIndex,
  layoutSignature: bricks.map((brick) => brick.row + ":" + brick.column).join("|"),
  damageAssetStart: breakoutChapterIndex() * 3,
  cleared,
  brickCount: bricks.length,
  armoredBricks: bricks.filter((brick) => brick.alive && brick.maxHits > 1).length,
  damagedBricks: bricks.filter((brick) => brick.alive && brick.hits < brick.maxHits).length,
  combo: breakoutCombo,
  bestCombo,
  score,
  mode: breakoutMode,
  modeLabel: breakoutModeLabel(),
  boardsCleared,
  timeRemaining: timeAttackRemaining(),
  focusEnergy: Math.round(focusEnergy * 10) / 10,
  focusActive,
  focusTimeScale,
  focusScoreMultiplier,
  shieldCharges,
  wideActive: performance.now() < widePaddleUntil,
  pierceHits,
  activePowerLabel: activePowerLabel(),
  lastPowerLabel,
  lastPowerAt,
  specialBrickCounts: Object.fromEntries(["shield", "wide", "pierce"].map((kind) => [kind, bricks.filter((brick) => brick.kind === kind).length])),
  physicsStepCount,
  collisionSystem: "substep-face-normal",
  collisionProbe,
  ballFinite: Number.isFinite(ball.x) && Number.isFinite(ball.y) && Number.isFinite(ball.vx) && Number.isFinite(ball.vy),
  clearStreak,
  bombArmed,
  lastExplosionRemoved,
  lastExplosionCells,
  lives,
  paddleX: Math.round(paddle.x),
  fragmentCount: brickFragments.length,
  pendingNextLevel,
});

function handleControl(value) {
  if (value === "left") movePaddle(-1);
  if (value === "right") movePaddle(1);
  if (value === "focus") toggleFocus();
}

function handleKey(key) {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") movePaddle(-1);
  if (key === "ArrowRight" || key.toLowerCase() === "d") movePaddle(1);
  if (key.toLowerCase() === "f") toggleFocus();
}

updateModeButtons();
prepareLevel();
drawBreakout();
`;
