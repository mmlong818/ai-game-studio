export const snakeScript = String.raw`
const difficultyProfiles = {
  relaxed: {
    label: "轻松", columns: 14, portraitRows: 24, landscapeRows: 14, foodTarget: 8, speed: 190,
    wrapWalls: true, selfCollision: false,
    description: "慢速巡游 · 8 枚朱果 · 越界会从另一侧回来",
  },
  standard: {
    label: "标准", columns: 14, portraitRows: 24, landscapeRows: 14, foodTarget: 12, speed: 135,
    wrapWalls: false, selfCollision: true,
    description: "适中速度 · 12 枚朱果 · 边界与身体都会中断巡游",
  },
  challenging: {
    label: "挑战", columns: 16, portraitRows: 28, landscapeRows: 16, foodTarget: 18, speed: 104,
    wrapWalls: false, selfCollision: true,
    description: "高速开局 · 18 枚朱果 · 收集后还会继续加速",
  },
};

let activeDifficulty = difficultyProfiles[config.difficulty] ? config.difficulty : "standard";
let difficultyProfile = difficultyProfiles[activeDifficulty];
let gridColumns = difficultyProfile.columns;
let gridRows = config.aspectRatio === "9:16" ? difficultyProfile.portraitRows : difficultyProfile.landscapeRows;
let foodTarget = difficultyProfile.foodTarget;
let snake = [];
let direction = { x: 1, y: 0 };
let nextDirection = { x: 1, y: 0 };
let food = { x: 10, y: 8 };
let score = 0;
let snakeStepAccumulator = 0;
let snakeLastFrameAt = 0;
let snakeFrameInterval = 16.7;
let snakeRenderedFrames = 0;
let snakeRenderFrom = [];
let snakeRenderStartedAt = 0;
let snakeRenderDuration = 0;
const snakeStaticLayer = document.createElement("canvas");
snakeStaticLayer.width = canvas.width;
snakeStaticLayer.height = canvas.height;
const snakeStaticContext = snakeStaticLayer.getContext("2d");
let snakeStaticDirty = true;
let snakeStaticAssetSignature = "";
let snakeStaticRebuilds = 0;
const snakeSpriteCache = new Map();
let snakeObstacles = [];
let pendingDifficulty = null;
let pendingDifficultyUntil = 0;
let snakeEffect = null;
let collisionMarker = null;
let snakeCompletionUntil = 0;
let growthPulseUntil = 0;
let snakeCompletionToken = 0;
const difficultyButtons = [...document.querySelectorAll("[data-snake-difficulty]")];
const difficultyLabels = [...document.querySelectorAll("[data-snake-difficulty-label]")];
const difficultyNotes = [...document.querySelectorAll("[data-snake-difficulty-note]")];

function applySnakeCampaignTuning() {
  const level = currentCampaignLevel();
  const boardGrowth = Math.floor((level.tier - 1) / 2) * 2;
  gridColumns = difficultyProfile.columns + boardGrowth;
  gridRows = (config.aspectRatio === "9:16" ? difficultyProfile.portraitRows : difficultyProfile.landscapeRows) + boardGrowth * (config.aspectRatio === "9:16" ? 2 : 1);
  foodTarget = Math.max(5, Math.round(difficultyProfile.foodTarget * level.goalMultiplier));
  snakeStaticDirty = true;
}

function snakeLayout() {
  const boardWidth = config.aspectRatio === "9:16" ? 624 : 620;
  const cell = boardWidth / gridColumns;
  const boardHeight = cell * gridRows;
  return { boardWidth, boardHeight, cell, originX: (720 - boardWidth) / 2, originY: (gameSceneHeight() - boardHeight) / 2 };
}

function syncDifficultyUi() {
  difficultyButtons.forEach((button) => {
    const selected = button.dataset.snakeDifficulty === activeDifficulty;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-selected", selected);
  });
  difficultyLabels.forEach((label) => { label.textContent = difficultyProfile.label; });
  difficultyNotes.forEach((note) => { note.textContent = difficultyProfile.description; });
}

function previewSnake() {
  const startY = Math.floor(gridRows / 2);
  const startX = Math.floor(gridColumns * .46);
  snake = [
    { x: startX, y: startY }, { x: startX - 1, y: startY },
    { x: startX - 2, y: startY }, { x: startX - 3, y: startY },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };
  snakeRenderFrom = snake.map((part) => ({ ...part }));
  snakeRenderStartedAt = performance.now();
  snakeRenderDuration = 0;
}

function applyDifficulty(value, restartIfRunning = false) {
  if (!difficultyProfiles[value]) return;
  const wasRunning = running;
  activeDifficulty = value;
  difficultyProfile = difficultyProfiles[value];
  applySnakeCampaignTuning();
  syncDifficultyUi();
  if (wasRunning && restartIfRunning) {
    startGame();
    return;
  }
  previewSnake();
  createSnakeObstacles();
  placeFood();
  drawSnake();
  setMetric("—");
  setStatus("已选择" + difficultyProfile.label + "难度。" + difficultyProfile.description + "。");
  overlayTitle.textContent = difficultyProfile.label + "难度已就绪";
  overlayDetail.textContent = difficultyProfile.description + "。改变方向收集朱果。";
  startButton.textContent = "开始" + difficultyProfile.label + "巡游";
}

function placeFood() {
  const free = [];
  for (let y = 0; y < gridRows; y += 1) for (let x = 0; x < gridColumns; x += 1) {
    if (!snake.some((part) => part.x === x && part.y === y) && !snakeObstacles.some((part) => part.x === x && part.y === y)) free.push({ x, y });
  }
  food = free[Math.floor(campaignRandom() * free.length)] || food;
  snakeStaticDirty = true;
}

function createSnakeObstacles() {
  const baseCount = activeDifficulty === "challenging" ? 7 : activeDifficulty === "standard" ? 2 : 0;
  const count = baseCount + Math.max(0, currentCampaignLevel().tier - 2) * 2 + (currentCampaignLevel().variant % 2);
  snakeObstacles = [];
  for (let index = 0; index < count; index += 1) {
    const candidate = { x: 2 + (index * 5) % (gridColumns - 4), y: 3 + (index * 7) % (gridRows - 6) };
    if (!snake.some((part) => part.x === candidate.x && part.y === candidate.y)) snakeObstacles.push(candidate);
  }
  snakeStaticDirty = true;
}

function snakeBodySprite(index) {
  const part = snake[index];
  if (index === 0) return { spriteIndex: 0, rotation: Math.atan2(direction.y, direction.x), scale: 1.12 };
  const previous = snake[index - 1];
  if (index === snake.length - 1) {
    return { spriteIndex: 3, rotation: Math.atan2(previous.y - part.y, previous.x - part.x), scale: 1.02 };
  }
  const next = snake[index + 1];
  const toPrevious = { x: previous.x - part.x, y: previous.y - part.y };
  const toNext = { x: next.x - part.x, y: next.y - part.y };
  const corner = toPrevious.x !== toNext.x && toPrevious.y !== toNext.y;
  if (!corner) return { spriteIndex: 1, rotation: toPrevious.x === 0 ? Math.PI / 2 : 0, scale: .98 };
  const directions = [toPrevious, toNext];
  const has = (x, y) => directions.some((value) => value.x === x && value.y === y);
  const rotation = has(0, -1) && has(1, 0) ? 0
    : has(1, 0) && has(0, 1) ? Math.PI / 2
      : has(0, 1) && has(-1, 0) ? Math.PI
        : -Math.PI / 2;
  return { spriteIndex: 2, rotation, scale: 1.06 };
}

function snakeDangerNearHead() {
  const head = snake[0];
  if (!head) return false;
  const wallDistance = Math.min(head.x, head.y, gridColumns - 1 - head.x, gridRows - 1 - head.y);
  if (!difficultyProfile.wrapWalls && wallDistance <= 1) return true;
  return snakeObstacles.some((obstacle) => Math.abs(obstacle.x - head.x) + Math.abs(obstacle.y - head.y) <= 2);
}

function drawGardenBoard(layout) {
  const { originX, originY, boardWidth, boardHeight, cell } = layout;
  drawPlayfield(originX - 12, originY - 12, boardWidth + 24, boardHeight + 24, {
    radius: 32, alpha: .98,
    fill: config.visualStyle === "cute" ? "rgba(250,255,252,.98)" : palette.surface,
    stroke: "rgba(38,106,83,.78)", lineWidth: 5,
  });
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(originX, originY, boardWidth, boardHeight, 24);
  ctx.clip();
  for (let y = 0; y < gridRows; y += 1) {
    for (let x = 0; x < gridColumns; x += 1) {
      if ((x * 5 + y * 3) % 17 !== 0) continue;
      ctx.fillStyle = (x + y) % 2 ? "rgba(111,182,136,.035)" : "rgba(255,145,112,.025)";
      ctx.beginPath();
      ctx.arc(originX + (x + .5) * cell, originY + (y + .5) * cell, cell * .38, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = "rgba(70,118,101,.1)";
  ctx.lineWidth = 1.2;
  for (let index = 0; index <= gridColumns; index += 2) {
    ctx.beginPath(); ctx.moveTo(originX + index * cell, originY); ctx.lineTo(originX + index * cell, originY + boardHeight); ctx.stroke();
  }
  for (let index = 0; index <= gridRows; index += 2) {
    ctx.beginPath(); ctx.moveTo(originX, originY + index * cell); ctx.lineTo(originX + boardWidth, originY + index * cell); ctx.stroke();
  }
  ctx.restore();
}

function renderedSnakeParts(timestamp) {
  if (!snakeRenderDuration) return snake;
  const progress = Math.max(0, Math.min(1, (timestamp - snakeRenderStartedAt) / snakeRenderDuration));
  const eased = 1 - Math.pow(1 - progress, 3);
  return snake.map((part, index) => {
    const from = snakeRenderFrom[index] || part;
    const wrapJump = Math.abs(part.x - from.x) > 1 || Math.abs(part.y - from.y) > 1;
    if (wrapJump) return part;
    return { x: from.x + (part.x - from.x) * eased, y: from.y + (part.y - from.y) * eased };
  });
}

function snakeAssetSignature() {
  return [backgroundArtReady, backgroundArt.naturalWidth, stageCImages[4]?.naturalWidth || 0, stageCImages[5]?.naturalWidth || 0].join(":");
}

function cachedSnakeSprite(index) {
  const image = stageCImages[index];
  if (!image?.complete || !image.naturalWidth) return null;
  const cached = snakeSpriteCache.get(index);
  if (cached?.sourceWidth === image.naturalWidth && cached?.sourceHeight === image.naturalHeight) return cached.canvas;
  if (!bitmapSourceRects.has(image)) cacheBitmapSourceRect(image);
  const source = bitmapSourceRects.get(image) || { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  const longest = Math.max(source.width, source.height);
  const scale = Math.min(1, 192 / longest);
  const sprite = document.createElement("canvas");
  sprite.width = Math.max(1, Math.round(source.width * scale));
  sprite.height = Math.max(1, Math.round(source.height * scale));
  const spriteContext = sprite.getContext("2d");
  spriteContext.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, sprite.width, sprite.height);
  snakeSpriteCache.set(index, { canvas: sprite, sourceWidth: image.naturalWidth, sourceHeight: image.naturalHeight });
  return sprite;
}

function drawCachedSnakeSprite(index, x, y, width, height, options = {}) {
  const sprite = cachedSnakeSprite(index);
  if (!sprite) {
    ctx.fillStyle = options.fallback || palette.primary;
    ctx.fillRect(x, y, width, height);
    return;
  }
  const padding = Math.max(0, Math.min(Number(options.padding) || 0, Math.min(width, height) * .45));
  const fitScale = Math.min((width - padding * 2) / sprite.width, (height - padding * 2) / sprite.height);
  const drawWidth = sprite.width * fitScale;
  const drawHeight = sprite.height * fitScale;
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.translate(x + width / 2, y + height / 2);
  if (options.rotation) ctx.rotate(options.rotation);
  ctx.drawImage(sprite, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

function rebuildSnakeStaticLayer() {
  clearCanvas();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const layout = snakeLayout();
  const { originX, originY, cell } = layout;
  drawGardenBoard(layout);
  snakeObstacles.forEach((obstacle) => {
    const size = cell * 1.28;
    drawBitmapImage(stageCImages[5], originX + (obstacle.x + .5) * cell - size / 2, originY + (obstacle.y + .5) * cell - size / 2, size, size, { fallback: palette.accent, alpha: .94 });
  });
  const foodSize = cell * 1.82;
  const foodX = originX + (food.x + .5) * cell;
  const foodY = originY + (food.y + .5) * cell;
  ctx.save();
  ctx.fillStyle = "rgba(255,103,78,.3)";
  ctx.beginPath(); ctx.arc(foodX, foodY, cell * .78, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  drawBitmapImage(stageCImages[4], foodX - foodSize / 2, foodY - foodSize / 2, foodSize, foodSize, { fallback: palette.primary, padding: 8 });
  ctx.restore();
  finishCanvasStyle();
  snakeStaticContext.clearRect(0, 0, snakeStaticLayer.width, snakeStaticLayer.height);
  snakeStaticContext.drawImage(canvas, 0, 0);
  snakeStaticDirty = false;
  snakeStaticRebuilds += 1;
}

function drawSnake(timestamp = performance.now()) {
  const assetSignature = snakeAssetSignature();
  if (assetSignature !== snakeStaticAssetSignature) {
    snakeStaticAssetSignature = assetSignature;
    snakeStaticDirty = true;
  }
  if (snakeStaticDirty) rebuildSnakeStaticLayer();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(snakeStaticLayer, 0, 0);
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const layout = snakeLayout();
  const { originX, originY, boardHeight, cell } = layout;
  const renderParts = renderedSnakeParts(timestamp);

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(42,142,102,.96)";
  ctx.lineWidth = cell * .58;
  ctx.beginPath();
  renderParts.forEach((part, index) => {
    const x = originX + (part.x + .5) * cell;
    const y = originY + (part.y + .5) * cell;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();

  renderParts.slice().reverse().forEach((part, reversedIndex) => {
    const index = renderParts.length - 1 - reversedIndex;
    const isHead = index === 0;
    const isTail = index === snake.length - 1;
    const appearance = snakeBodySprite(index);
    const scale = (isHead ? 2 : isTail ? 1.58 : 1.5) * appearance.scale * (timestamp < growthPulseUntil && index < 2 ? 1.08 : 1);
    const size = cell * scale;
    const x = originX + (part.x + .5) * cell - size / 2;
    const y = originY + (part.y + .5) * cell - size / 2;
    drawCachedSnakeSprite(appearance.spriteIndex, x, y, size, size, {
      fallback: isHead ? palette.highlight : palette.pieces[index % palette.pieces.length],
      rotation: appearance.rotation, padding: isHead ? 6 : 4,
    });
  });
  if (snakeDangerNearHead() || collisionMarker) {
    const marker = collisionMarker || snake[0];
    const size = cell * 2.35;
    drawBitmapImage(stageCImages[7], originX + (marker.x + .5) * cell - size / 2, originY + (marker.y + .5) * cell - size / 2, size, size, {
      fallback: palette.primary,
      alpha: collisionMarker ? .94 : .48,
      scale: 1 + Math.sin(timestamp / 110) * .07,
    });
  }
  if (snakeEffect && timestamp < snakeEffect.until) {
    const size = cell * 2.8;
    drawBitmapImage(stageCImages[6], originX + (snakeEffect.x + .5) * cell - size / 2, originY + (snakeEffect.y + .5) * cell - size / 2, size, size, {
      fallback: palette.highlight,
      alpha: Math.max(0, (snakeEffect.until - timestamp) / 420),
    });
  }
  if (timestamp < snakeCompletionUntil) {
    drawBitmapImage(stageCImages[8], 170, originY + boardHeight * .32, 380, 380, { fallback: palette.highlight, alpha: .96 });
  }
  ctx.restore();
}

function currentStepDelay() {
  const baseDelay = difficultyProfile.speed / campaignScale("speedMultiplier");
  return activeDifficulty === "challenging" ? Math.max(55, baseDelay - score * 2.5) : Math.max(72, baseDelay);
}

function restartSnakeClock(timestamp = performance.now()) {
  snakeStepAccumulator = 0;
  snakeLastFrameAt = timestamp;
}

function snakeStep(timestamp = performance.now()) {
  if (!running) return;
  const previousSnake = snake.map((part) => ({ ...part }));
  direction = nextDirection;
  let head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y };
  const crossedWall = head.x < 0 || head.y < 0 || head.x >= gridColumns || head.y >= gridRows;
  if (crossedWall && difficultyProfile.wrapWalls) {
    head = { x: (head.x + gridColumns) % gridColumns, y: (head.y + gridRows) % gridRows };
  }
  const hitWall = crossedWall && !difficultyProfile.wrapWalls;
  const hitSelf = difficultyProfile.selfCollision && snake.some((part) => part.x === head.x && part.y === head.y);
  const hitObstacle = snakeObstacles.some((part) => part.x === head.x && part.y === head.y);
  if (hitWall || hitSelf || hitObstacle) {
    playSound("fail");
    const reason = hitWall ? "撞到边界" : hitSelf ? "撞到自己的身体" : "撞到庭院障碍";
    collisionMarker = head;
    drawSnake();
    showResult(false, "巡游中断", reason + "（第 " + (head.y + 1) + " 行，第 " + (head.x + 1) + " 列）。小龙在" + difficultyProfile.label + "难度收集了 " + score + " 枚朱果。");
    return;
  }
  snake.unshift(head);
  snakeRenderFrom = previousSnake;
  snakeRenderStartedAt = timestamp;
  snakeRenderDuration = Math.min(180, Math.max(72, currentStepDelay() * .94));
  if (head.x === food.x && head.y === food.y) {
    score += 1;
    snakeEffect = { x: head.x, y: head.y, until: performance.now() + 420 };
    growthPulseUntil = performance.now() + 240;
    setMetric(score + " / " + foodTarget);
    playSound("success");
    if (score >= foodTarget) {
      snakeCompletionUntil = performance.now() + 1600;
      const completionToken = ++snakeCompletionToken;
      running = false;
      setGameSessionState("stage-complete");
      drawSnake(timestamp);
      window.setTimeout(() => {
        if (completionToken !== snakeCompletionToken) return;
        showResult(true, "青玉巡游完成", "你在" + difficultyProfile.label + "难度帮助小龙收集了 " + score + " 枚朱果。");
      }, 760);
      return;
    }
    placeFood();
  } else {
    snake.pop();
  }
}

function snakeAnimationLoop(timestamp) {
  const rawDelta = snakeLastFrameAt ? timestamp - snakeLastFrameAt : 16.7;
  const delta = Math.max(0, Math.min(80, rawDelta));
  snakeLastFrameAt = timestamp;
  snakeFrameInterval = snakeFrameInterval * .9 + Math.min(50, Math.max(4, rawDelta)) * .1;
  if (running) {
    snakeStepAccumulator += delta;
    const delay = currentStepDelay();
    if (snakeStepAccumulator >= delay) {
      snakeStepAccumulator = Math.min(snakeStepAccumulator - delay, delay);
      snakeStep(timestamp);
    }
  }
  const transitionActive = timestamp < snakeRenderStartedAt + snakeRenderDuration;
  const effectActive = timestamp < growthPulseUntil || timestamp < snakeCompletionUntil || Boolean(snakeEffect && timestamp < snakeEffect.until);
  if (running || transitionActive || effectActive || collisionMarker) {
    drawSnake(timestamp);
    snakeRenderedFrames += 1;
  }
  requestAnimationFrame(snakeAnimationLoop);
}

function turn(dx, dy) {
  if (!running || (dx === -direction.x && dy === -direction.y)) return;
  nextDirection = { x: dx, y: dy };
}

function startGame() {
  snakeCompletionToken += 1;
  resetCampaignRandom();
  applySnakeCampaignTuning();
  previewSnake();
  score = 0;
  snakeEffect = null;
  collisionMarker = null;
  snakeCompletionUntil = 0;
  growthPulseUntil = 0;
  createSnakeObstacles();
  placeFood();
  running = true;
  hideOverlay();
  setMetric("0 / " + foodTarget);
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + currentCampaignLevel().ruleModifier + " · " + difficultyProfile.label + "难度；收集 " + foodTarget + " 枚朱果。");
  startAmbient();
  restartSnakeClock();
  drawSnake();
}

function handleControl(value) {
  const directions = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] };
  if (directions[value]) turn(directions[value][0], directions[value][1]);
}

function handleKey(key) {
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  const map = { ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left", w: "up", d: "right", s: "down", a: "left" };
  if (map[normalized]) handleControl(map[normalized]);
}

difficultyButtons.forEach((button) => button.addEventListener("click", () => {
  const value = button.dataset.snakeDifficulty;
  if (!running) { applyDifficulty(value, false); return; }
  const now = performance.now();
  if (pendingDifficulty !== value || now > pendingDifficultyUntil) {
    pendingDifficulty = value;
    pendingDifficultyUntil = now + 2500;
    setStatus("再次点击“" + difficultyProfiles[value].label + "”确认切换；当前巡游会重新开始。");
    return;
  }
  pendingDifficulty = null;
  applyDifficulty(value, true);
}));
onCampaignLevelChanged = () => {
  applySnakeCampaignTuning();
  if (!running) {
    resetCampaignRandom();
    previewSnake();
    createSnakeObstacles();
    placeFood();
    drawSnake();
  }
};
runtimeDebugActions = {
  previewCompletion: () => {
    snakeCompletionUntil = performance.now() + 1600;
    drawSnake();
  },
};
runtimeDebugState = () => ({
  level: currentCampaignLevel().number,
  tier: currentCampaignLevel().tier,
  difficulty: activeDifficulty,
  score,
  target: foodTarget,
  length: snake.length,
  obstacleCount: snakeObstacles.length,
  grid: { columns: gridColumns, rows: gridRows },
  stepDelay: Math.round(currentStepDelay()),
  rendering: "requestAnimationFrame-interpolation",
  staticLayerCached: true,
  staticLayerRebuilds: snakeStaticRebuilds,
  interpolationMs: Math.round(snakeRenderDuration),
  estimatedFps: Math.round(1000 / Math.max(1, snakeFrameInterval)),
  renderedFrames: snakeRenderedFrames,
  interpolationActive: performance.now() < snakeRenderStartedAt + snakeRenderDuration,
  wrapWalls: difficultyProfile.wrapWalls,
  selfCollision: difficultyProfile.selfCollision,
  assetRoles: ["head", "body-straight", "body-corner", "tail", "food", "obstacle", "eat", "danger", "complete"],
  head: snake[0],
  direction,
  dangerNearHead: snakeDangerNearHead(),
  completionActive: performance.now() < snakeCompletionUntil,
  collision: collisionMarker,
});
syncDifficultyUi();
previewSnake();
createSnakeObstacles();
placeFood();
drawSnake();
requestAnimationFrame(snakeAnimationLoop);
`;
