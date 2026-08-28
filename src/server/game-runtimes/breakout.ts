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
const bombClearThreshold = 3;
const levelInputs = Array.from(document.querySelectorAll("[data-breakout-level]"));
const progressLabels = Array.from(document.querySelectorAll("[data-breakout-progress]"));
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
      const hits = armorValue < level.armorRate * .42 ? 3 : armorValue < level.armorRate ? 2 : 1;
      bricks.push({
        x: 62 + column * (brickWidth + gap),
        y: layout.top + 118 + row * (brickHeight + rowGap),
        width: brickWidth,
        height: brickHeight,
        row,
        column,
        alive: true,
        hits,
        maxHits: hits,
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
  ctx.roundRect(68, layout.top + 22, 584, 72, 24);
  ctx.fillStyle = "rgba(4,17,43,.76)";
  ctx.fill();
  ctx.strokeStyle = "rgba(192,236,255,.42)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(223,246,255,.72)";
  ctx.font = "650 18px Inter, sans-serif";
  ctx.fillText("漆海航线 " + String(currentLevelIndex + 1).padStart(2, "0"), 94, layout.top + 48);
  ctx.fillStyle = "#fff8e8";
  ctx.font = "800 27px Inter, sans-serif";
  ctx.fillText(label, 94, layout.top + 74);
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
    alpha: .16,
  });
  const sheen = ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
  sheen.addColorStop(0, "rgba(255,255,255,.38)");
  sheen.addColorStop(.42, "rgba(255,255,255,.06)");
  sheen.addColorStop(1, "rgba(8,28,47,.18)");
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.roundRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2, radius - 1);
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
  ctx.restore();
}

function drawBombStatus(layout) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(420, layout.top + 57, 124, 30, 15);
  ctx.fillStyle = bombArmed ? "rgba(245,184,69,.96)" : "rgba(12,39,62,.76)";
  ctx.fill();
  ctx.strokeStyle = bombArmed ? "rgba(255,247,201,.92)" : "rgba(185,224,239,.28)";
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (bombArmed) drawBitmapSprite(6, 426, layout.top + 59, 25, 25, { fallback: "#fff0a8", padding: 2, scale: 1.08 });
  ctx.fillStyle = bombArmed ? "#192431" : "rgba(223,246,255,.74)";
  ctx.font = "800 14px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(bombArmed ? "爆炸就绪" : "连消 " + clearStreak + " / " + bombClearThreshold, bombArmed ? 494 : 482, layout.top + 72);
  ctx.restore();
}

function drawBreakout() {
  drawLevelBackground();
  const layout = breakoutLayout();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  drawPlayfield(42, layout.top, 636, layout.bottom - layout.top, { radius: 28, alpha: .7, fill: "rgba(7,20,49,.66)", stroke: "rgba(176,232,255,.3)" });
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
  ctx.strokeStyle = palette.textSoft;
  ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.radius + 6, 0, Math.PI * 2); ctx.stroke();
  if (breakoutCombo >= 2) {
    ctx.fillStyle = "rgba(4,17,43,.78)";
    ctx.beginPath();
    ctx.roundRect(512, layout.paddleY - 76, 142, 48, 18);
    ctx.fill();
    ctx.fillStyle = "#fff4ca";
    ctx.font = "800 21px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("COMBO ×" + breakoutCombo, 583, layout.paddleY - 45);
  }
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
    if (destroyBrick(brick, 6)) lastExplosionRemoved += 1;
  });
  impactBursts.push({ x: center.x + center.width / 2, y: center.y + center.height / 2, startedAt: performance.now(), cross: true });
  bombArmed = false;
  clearStreak = 0;
  playSound("success");
  return lastExplosionRemoved;
}

function resolveDestroyedBrick(brick) {
  const triggerBomb = bombArmed;
  destroyBrick(brick, breakoutCombo >= 4 ? 7 : 4);
  if (triggerBomb) {
    const removed = triggerCrossExplosion(brick);
    return "十字爆炸已触发 · 额外清除 " + removed + " 块相邻砖，只影响上下左右。";
  }
  if (registerClearForBomb(performance.now())) return "连续消除达成 · 爆炸道具已就绪，将在下次消除时自动触发。";
  return "";
}

function resetBall() {
  const level = currentLevel();
  const layout = breakoutLayout();
  const difficultyMultiplier = config.difficulty === "challenging" ? 1.08 : config.difficulty === "relaxed" ? .84 : 1;
  const speed = level.speed * difficultyMultiplier;
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
  overlayDetail.textContent = "已解锁下一关；二十关各有独立砖阵，难度每四关进入一个新阶段，速度和护盾会分段增强。";
  startButton.textContent = "进入下一关";
  overlay.hidden = false;
  playSound("success");
}

function handleLevelCleared() {
  if (currentLevelIndex < breakoutLevels.length - 1) {
    unlockNextCampaignLevel();
    syncCampaignUi();
    writeCampaignProgress();
    showLevelComplete();
    return;
  }
  campaignComplete = true;
  showResult(true, "五重漆海全部澄明", "你已经击散二十种砖阵，并完成深海王冠终局。");
}

function loseLife() {
  lives -= 1;
  breakoutCombo = 0;
  if (lives <= 0) {
    showResult(false, "光球沉入海面", "本关三次机会已经用完；重新开始会保留当前关卡。");
    syncLevelControls();
    return;
  }
  resetBall();
  setStatus(currentLevel().label + " · 剩余 " + lives + " 次机会，光球即将重新发射。");
  syncLevelControls();
  playSound("fail");
}

function updateBreakout(delta) {
  const layout = breakoutLayout();
  if (serveDelay > 0) {
    serveDelay = Math.max(0, serveDelay - delta);
    ball.x = paddle.x + paddle.width / 2;
    ball.y = paddle.y - 28;
    return;
  }
  const scale = Math.min(2, delta / 16.67);
  brickFragments.forEach((fragment) => {
    fragment.x += fragment.vx * scale;
    fragment.y += fragment.vy * scale;
    fragment.vy += .11 * scale;
    fragment.rotation += .06 * scale;
    fragment.life -= .035 * scale;
  });
  brickFragments = brickFragments.filter((fragment) => fragment.life > 0);
  ball.x += ball.vx * scale;
  ball.y += ball.vy * scale;
  if (ball.x < 56 || ball.x > 664) {
    ball.vx *= -1;
    ball.x = Math.max(56, Math.min(664, ball.x));
  }
  if (ball.y < layout.top + 14) ball.vy = Math.abs(ball.vy);
  if (ball.vy > 0 && ball.y + ball.radius >= paddle.y && ball.y < paddle.y + paddle.height && ball.x >= paddle.x && ball.x <= paddle.x + paddle.width) {
    const offset = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const speed = Math.min(currentLevel().speed * 1.72, Math.hypot(ball.vx, ball.vy) * 1.018);
    ball.vx = Math.sin(offset * 1.05) * speed;
    ball.vy = -Math.max(speed * .58, Math.cos(offset * 1.05) * speed);
    ball.y = paddle.y - ball.radius - 1;
    playSound("move");
  }
  const brick = bricks.find(hitBrick);
  if (brick) {
    impactBursts.push({ x: ball.x, y: ball.y, startedAt: performance.now() });
    brick.hits -= 1;
    brick.hitAt = performance.now();
    breakoutCombo = performance.now() - lastBrickHitAt < 1450 ? breakoutCombo + 1 : 1;
    lastBrickHitAt = performance.now();
    ball.vy *= -1;
    const currentSpeed = Math.hypot(ball.vx, ball.vy);
    const speedLimit = currentLevel().speed * 1.78;
    if (currentSpeed < speedLimit) {
      const multiplier = Math.min(1.018, speedLimit / Math.max(.1, currentSpeed));
      ball.vx *= multiplier;
      ball.vy *= multiplier;
    }
    if (brick.hits <= 0) {
      const effectMessage = resolveDestroyedBrick(brick);
      setMetric(cleared + " / " + bricks.length);
      if (effectMessage) setStatus(effectMessage);
      else if (breakoutCombo >= 3) setStatus("连续击碎 ×" + breakoutCombo + " · 再保持连消即可获得爆炸道具。");
    } else {
      spawnBrickFragments(brick, 2);
      setStatus(currentLevel().label + " · 护盾受损 " + (brick.maxHits - brick.hits) + " / " + brick.maxHits + "，裂纹状态已显现。");
    }
    playSound("move");
    if (cleared === bricks.length) handleLevelCleared();
  }
  if (ball.y - ball.radius > layout.bottom + 24) loseLife();
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

canvas.addEventListener("pointermove", (event) => {
  if (!running) return;
  const { x } = eventScenePoint(event);
  paddle.x = Math.max(48, Math.min(672 - paddle.width, x - paddle.width / 2));
});

function prepareLevel() {
  const paddleBase = config.difficulty === "relaxed" ? 150 : config.difficulty === "challenging" ? 88 : 118;
  const levelPenalty = breakoutChapterIndex() * 6;
  const layout = breakoutLayout();
  paddle = { x: 360 - (paddleBase - levelPenalty) / 2, y: layout.paddleY, width: paddleBase - levelPenalty, height: 18 };
  cleared = 0;
  lives = 3;
  impactBursts = [];
  brickFragments = [];
  breakoutCombo = 0;
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
  if (campaignComplete) {
    currentLevelIndex = 0;
    campaignComplete = false;
    setCampaignLevel(0, { allowLocked: true });
  } else if (pendingNextLevel) {
    currentLevelIndex = Math.min(breakoutLevels.length - 1, currentLevelIndex + 1);
    setCampaignLevel(currentLevelIndex, { allowLocked: true, unlock: true });
  }
  pendingNextLevel = false;
  prepareLevel();
  running = true;
  lastFrame = 0;
  hideOverlay();
  setMetric("0 / " + bricks.length);
  setStatus(currentLevel().label + " · 清除 " + bricks.length + " 块砖；连续消除三块可获得一次十字爆炸。");
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
  overlayDetail.textContent = "每关使用不同砖阵；球速与护盾比例会随关卡提升，连续消除三块可获得十字爆炸。";
  startButton.textContent = "开始本关";
  setMetric("0 / " + bricks.length);
  setStatus("已选择 " + currentLevel().label + "，准备开始。");
  drawBreakout();
}

levelInputs.forEach((input) => input.addEventListener("change", () => selectLevel(Number(input.value))));

onCampaignLevelChanged = () => {
  currentLevelIndex = campaignLevelIndex;
  pendingNextLevel = false;
  campaignComplete = false;
  if (paddle) prepareLevel();
  if (!running && paddle) drawBreakout();
};

runtimeDebugActions = {
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
}

function handleKey(key) {
  if (key === "ArrowLeft" || key.toLowerCase() === "a") movePaddle(-1);
  if (key === "ArrowRight" || key.toLowerCase() === "d") movePaddle(1);
}

prepareLevel();
drawBreakout();
`;
