export const snakeScript = String.raw`
const difficultyProfiles = {
  relaxed: { label: "轻松", columns: 14, portraitRows: 24, landscapeRows: 14, foodTarget: 8, speed: 190, wrapWalls: true, selfCollision: false, obstacleScale: .58, description: "慢速巡游 · 基础目标 8 分 · 越界会从另一侧回来" },
  standard: { label: "标准", columns: 14, portraitRows: 24, landscapeRows: 14, foodTarget: 12, speed: 135, wrapWalls: false, selfCollision: true, obstacleScale: 1, description: "适中速度 · 基础目标 12 分 · 边界、身体与庭石都会中断巡游" },
  challenging: { label: "挑战", columns: 16, portraitRows: 28, landscapeRows: 16, foodTarget: 18, speed: 104, wrapWalls: false, selfCollision: true, obstacleScale: 1.25, description: "高速开局 · 基础目标 18 分 · 场型更密并随收集继续加速" },
};

const snakeLevelBlueprints = [
  ["初游晴庭", "开放转向", "open-pair", 0, 1, 0], ["双石引路", "开放转向", "guide-posts", 0, .99, 0],
  ["四隅回身", "开放转向", "four-corners", 1, .98, 0], ["月门初转", "开放转向", "moon-gate", 1, .97, 0],
  ["竹影双廊", "门廊判断", "bamboo-lanes", 1, .96, 4], ["曲桥借位", "门廊判断", "bent-bridge", 1, .95, 4],
  ["回纹花径", "门廊判断", "meander", 2, .94, 4], ["方池绕行", "门廊判断", "square-pond", 2, .93, 4],
  ["折廊追果", "回环规划", "zigzag", 2, .92, 4], ["双门换向", "回环规划", "double-gate", 2, .91, 4],
  ["星石列阵", "回环规划", "star-stones", 3, .9, 3], ["半月回环", "回环规划", "half-moon", 3, .89, 3],
  ["连廊三折", "窄路压力", "triple-turn", 3, .88, 3], ["漏窗穿行", "窄路压力", "window-slits", 3, .87, 3],
  ["镜池窄岸", "窄路压力", "mirror-banks", 4, .86, 3], ["叠石回廊", "窄路压力", "nested-court", 4, .85, 3],
  ["九曲藏果", "综合长游", "nine-bends", 4, .84, 3], ["双环合流", "综合长游", "twin-rings", 4, .83, 3],
  ["庭心风阵", "综合长游", "pinwheel", 5, .82, 3], ["青玉长游", "综合长游", "grand-circuit", 6, .8, 3],
].map((value, index) => ({ number: index + 1, name: value[0], chapter: value[1], pattern: value[2], targetBonus: value[3], speedScale: value[4], goldEvery: value[5] }));

let activeDifficulty = difficultyProfiles[config.difficulty] ? config.difficulty : "standard";
let difficultyProfile = difficultyProfiles[activeDifficulty];
let gridColumns = difficultyProfile.columns;
let gridRows = config.aspectRatio === "9:16" ? difficultyProfile.portraitRows : difficultyProfile.landscapeRows;
let foodTarget = difficultyProfile.foodTarget;
let snake = [];
let direction = { x: 1, y: 0 };
let snakeDirectionQueue = [];
let food = { x: 10, y: 8, kind: "normal", value: 1, expiresAt: 0 };
let score = 0;
let snakeObstacles = [];
let snakeLayoutSignature = "";
let snakeControlMode = "swipe";
let snakePaused = false;
let snakeReadyUntil = 0;
let snakeSwipe = null;
let snakeFoodProbe = null;
let snakeStats = { turns: 0, nearMisses: 0, distance: 0, bonusCount: 0, startedAt: 0, collisionReason: "" };
let snakeWasInDanger = false;
let snakeStepAccumulator = 0;
let snakeLastFrameAt = 0;
let snakeFrameInterval = 16.7;
let snakeRenderedFrames = 0;
let snakeRenderFrom = [];
let snakeRenderStartedAt = 0;
let snakeRenderDuration = 0;
let snakeEffect = null;
let collisionMarker = null;
let snakeCompletionUntil = 0;
let growthPulseUntil = 0;
let turnPulseUntil = 0;
let snakeCompletionToken = 0;
let pendingDifficulty = null;
let pendingDifficultyUntil = 0;
const snakeStaticLayer = document.createElement("canvas");
snakeStaticLayer.width = canvas.width;
snakeStaticLayer.height = canvas.height;
const snakeStaticContext = snakeStaticLayer.getContext("2d");
let snakeStaticDirty = true;
let snakeStaticAssetSignature = "";
let snakeStaticRebuilds = 0;
const snakeSpriteCache = new Map();
const difficultyButtons = [...document.querySelectorAll("[data-snake-difficulty]")];
const difficultyLabels = [...document.querySelectorAll("[data-snake-difficulty-label]")];
const difficultyNotes = [...document.querySelectorAll("[data-snake-difficulty-note]")];
const controlModeButtons = [...document.querySelectorAll("[data-snake-control-mode]")];

function currentSnakeBlueprint() { return snakeLevelBlueprints[Math.max(0, Math.min(19, currentCampaignLevel().number - 1))]; }
function snakeCellKey(x, y) { return x + ":" + y; }

function applySnakeCampaignTuning() {
  const growth = Math.floor((currentCampaignLevel().tier - 1) / 2) * 2;
  gridColumns = difficultyProfile.columns + growth;
  gridRows = (config.aspectRatio === "9:16" ? difficultyProfile.portraitRows : difficultyProfile.landscapeRows) + growth * (config.aspectRatio === "9:16" ? 2 : 1);
  foodTarget = Math.max(5, Math.round(difficultyProfile.foodTarget * currentCampaignLevel().goalMultiplier) + currentSnakeBlueprint().targetBonus);
  snakeStaticDirty = true;
}

function snakeLayout() {
  const boardWidth = config.aspectRatio === "9:16" ? 636 : 620;
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

function syncSnakeControlMode() {
  document.body.dataset.snakeControlMode = snakeControlMode;
  controlModeButtons.forEach((button) => {
    const selected = button.dataset.snakeControlMode === snakeControlMode;
    button.setAttribute("aria-pressed", String(selected));
    button.classList.toggle("is-selected", selected);
  });
  try { safeStorage.setItem("snake-control-mode-v1", snakeControlMode); } catch {}
}

function loadSnakeControlMode() {
  try {
    const stored = safeStorage.getItem("snake-control-mode-v1");
    if (stored === "buttons" || stored === "swipe") snakeControlMode = stored;
  } catch {}
  syncSnakeControlMode();
}

function previewSnake() {
  const y = Math.floor(gridRows / 2);
  const x = Math.floor(gridColumns * .46);
  snake = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }, { x: x - 3, y }];
  direction = { x: 1, y: 0 };
  snakeDirectionQueue = [];
  snakeRenderFrom = snake.map((part) => ({ ...part }));
  snakeRenderStartedAt = performance.now();
  snakeRenderDuration = 0;
}

function addSnakeObstacle(target, x, y) {
  const cell = { x: Math.round(x), y: Math.round(y) };
  const start = snake[0];
  const opening = start && Math.abs(cell.y - start.y) <= 1 && cell.x >= start.x - 4 && cell.x <= start.x + 3;
  if (cell.x < 1 || cell.x >= gridColumns - 1 || cell.y < 2 || cell.y >= gridRows - 2 || opening) return;
  if (!target.some((value) => value.x === cell.x && value.y === cell.y)) target.push(cell);
}

function buildSnakeFormation() {
  const level = currentSnakeBlueprint().number;
  const chapter = Math.floor((level - 1) / 4);
  const variant = (level - 1) % 4;
  const cells = [];
  const left = 2 + variant % 2;
  const right = gridColumns - 3 - (variant > 1 ? 1 : 0);
  const top = 4 + variant;
  const bottom = gridRows - 5 - variant;
  if (chapter === 0) {
    addSnakeObstacle(cells, left, top); addSnakeObstacle(cells, right, bottom);
    if (variant > 0) { addSnakeObstacle(cells, right, top); addSnakeObstacle(cells, left, bottom); }
    if (variant > 1) { addSnakeObstacle(cells, Math.floor(gridColumns / 2), top + 2); addSnakeObstacle(cells, Math.floor(gridColumns / 2) - 2, bottom - 2); }
  } else if (chapter === 1) {
    for (let y = 3; y < gridRows - 3; y += 1) {
      if (y % (5 + variant) !== 2) addSnakeObstacle(cells, left, y);
      if (y % (6 - Math.min(variant, 2)) !== 3) addSnakeObstacle(cells, right, y);
    }
    for (let x = left; x <= right; x += 1) if (x !== Math.floor(gridColumns / 2) + variant - 1) addSnakeObstacle(cells, x, top + 3);
  } else if (chapter === 2) {
    for (let x = left; x <= right; x += 1) {
      if (x !== left + 1 + variant) addSnakeObstacle(cells, x, top);
      if (x !== right - 1 - variant) addSnakeObstacle(cells, x, bottom);
    }
    for (let y = top; y <= bottom; y += 1) {
      if (y !== top + 2 + variant) addSnakeObstacle(cells, left, y);
      if (y !== bottom - 2 - variant) addSnakeObstacle(cells, right, y);
    }
  } else if (chapter === 3) {
    const rows = [4 + variant, Math.floor(gridRows / 2) - 4 + variant, Math.floor(gridRows / 2) + 5, gridRows - 5 - variant];
    rows.forEach((y, rowIndex) => {
      const gap = 2 + (rowIndex * 3 + variant) % Math.max(3, gridColumns - 5);
      for (let x = 1; x < gridColumns - 1; x += 1) if (Math.abs(x - gap) > 1) addSnakeObstacle(cells, x, y);
    });
  } else {
    const cx = Math.floor(gridColumns / 2);
    const cy = Math.floor(gridRows / 2);
    const arm = 3 + variant;
    for (let d = 2; d <= arm; d += 1) {
      addSnakeObstacle(cells, cx + d, cy - 2); addSnakeObstacle(cells, cx + 2, cy + d);
      addSnakeObstacle(cells, cx - d, cy + 2); addSnakeObstacle(cells, cx - 2, cy - d);
    }
    for (let x = left; x <= right; x += 2) { addSnakeObstacle(cells, x, top); addSnakeObstacle(cells, right - x + left, bottom); }
  }
  return cells;
}

function createSnakeObstacles() {
  const requested = buildSnakeFormation();
  const count = Math.max(0, Math.ceil(requested.length * difficultyProfile.obstacleScale));
  snakeObstacles = activeDifficulty === "relaxed" ? requested.filter((_, index) => index % 2 === 0).slice(0, count) : requested.slice(0, count);
  if (activeDifficulty === "challenging") {
    const desired = Math.max(requested.length + 1, count);
    for (let index = 0; snakeObstacles.length < desired && index < requested.length * 4; index += 1) {
      const source = requested[index % requested.length];
      const rowShift = Math.floor(index / Math.max(1, requested.length)) + 1;
      addSnakeObstacle(snakeObstacles, gridColumns - 1 - source.x, source.y + (index % 2 ? rowShift : -rowShift));
    }
  }
  snakeLayoutSignature = currentSnakeBlueprint().pattern + ":" + snakeObstacles.map((cell) => snakeCellKey(cell.x, cell.y)).sort().join("|");
  snakeStaticDirty = true;
}

function reachableSnakeCells() {
  const head = snake[0];
  if (!head) return new Map();
  const blocked = new Set([...snakeObstacles.map((cell) => snakeCellKey(cell.x, cell.y)), ...snake.slice(1).map((cell) => snakeCellKey(cell.x, cell.y))]);
  const distances = new Map([[snakeCellKey(head.x, head.y), 0]]);
  const queue = [{ ...head }];
  while (queue.length) {
    const current = queue.shift();
    const distance = distances.get(snakeCellKey(current.x, current.y));
    [[0,-1],[1,0],[0,1],[-1,0]].forEach((offset) => {
      let x = current.x + offset[0]; let y = current.y + offset[1];
      if (difficultyProfile.wrapWalls) { x = (x + gridColumns) % gridColumns; y = (y + gridRows) % gridRows; }
      const key = snakeCellKey(x, y);
      if (x < 0 || y < 0 || x >= gridColumns || y >= gridRows || blocked.has(key) || distances.has(key)) return;
      distances.set(key, distance + 1); queue.push({ x, y });
    });
  }
  return distances;
}

function nextSnakeFoodKind() {
  const every = currentSnakeBlueprint().goldEvery;
  return every && score >= 2 && score % every === every - 1 ? "golden" : "normal";
}

function placeFood(requestedKind = nextSnakeFoodKind()) {
  const distances = reachableSnakeCells();
  const occupied = new Set(snake.map((cell) => snakeCellKey(cell.x, cell.y)));
  const minimumDistance = Math.max(4, Math.floor(gridRows * .15));
  let candidates = [...distances.entries()].filter(([key, distance]) => distance >= minimumDistance && !occupied.has(key));
  if (!candidates.length) candidates = [...distances.entries()].filter(([key, distance]) => distance >= 2 && !occupied.has(key));
  const selected = candidates[Math.floor(campaignRandom() * candidates.length)];
  if (!selected) return false;
  const [x, y] = selected[0].split(":").map(Number);
  const kind = requestedKind === "golden" ? "golden" : "normal";
  food = { x, y, kind, value: kind === "golden" ? 2 : 1, expiresAt: kind === "golden" ? performance.now() + Math.max(3200, 6400 - currentCampaignLevel().tier * 420) : 0 };
  snakeStaticDirty = true;
  return true;
}

function applyDifficulty(value, restartIfRunning = false) {
  if (!difficultyProfiles[value]) return;
  const wasPlaying = gameSessionState === "playing" || gameSessionState === "paused";
  activeDifficulty = value; difficultyProfile = difficultyProfiles[value]; applySnakeCampaignTuning(); syncDifficultyUi();
  if (wasPlaying && restartIfRunning) { startGame(); return; }
  previewSnake(); createSnakeObstacles(); placeFood("normal"); drawSnake(); setMetric("—");
  setStatus("已选择" + difficultyProfile.label + "难度。" + difficultyProfile.description + "。");
  overlayTitle.textContent = difficultyProfile.label + "难度已就绪";
  overlayDetail.textContent = currentSnakeBlueprint().name + " · " + currentSnakeBlueprint().chapter + "。改变方向收集朱果。";
  startButton.textContent = "开始" + difficultyProfile.label + "巡游";
}

function snakeBodySprite(index) {
  const part = snake[index];
  if (index === 0) return { spriteIndex: 0, rotation: Math.atan2(direction.y, direction.x), scale: 1.12 };
  const previous = snake[index - 1];
  if (index === snake.length - 1) return { spriteIndex: 3, rotation: Math.atan2(previous.y - part.y, previous.x - part.x), scale: 1.02 };
  const next = snake[index + 1];
  const directions = [{ x: previous.x - part.x, y: previous.y - part.y }, { x: next.x - part.x, y: next.y - part.y }];
  const has = (x, y) => directions.some((value) => value.x === x && value.y === y);
  const corner = directions[0].x !== directions[1].x && directions[0].y !== directions[1].y;
  if (!corner) return { spriteIndex: 1, rotation: directions[0].x === 0 ? Math.PI / 2 : 0, scale: .98 };
  const rotation = has(0,-1) && has(1,0) ? 0 : has(1,0) && has(0,1) ? Math.PI/2 : has(0,1) && has(-1,0) ? Math.PI : -Math.PI/2;
  return { spriteIndex: 2, rotation, scale: 1.06 };
}

function nextSnakeCell() { const next = snakeDirectionQueue[0] || direction; return { x: snake[0].x + next.x, y: snake[0].y + next.y }; }
function snakeDangerNearHead() {
  if (!snake[0]) return false;
  const next = nextSnakeCell();
  return (!difficultyProfile.wrapWalls && (next.x < 0 || next.y < 0 || next.x >= gridColumns || next.y >= gridRows))
    || snakeObstacles.some((cell) => cell.x === next.x && cell.y === next.y)
    || (difficultyProfile.selfCollision && snake.slice(1, -1).some((cell) => cell.x === next.x && cell.y === next.y));
}

function drawGardenBoard(layout) {
  const { originX, originY, boardWidth, boardHeight, cell } = layout;
  drawPlayfield(originX - 12, originY - 12, boardWidth + 24, boardHeight + 24, { radius: 32, alpha: .98, fill: "rgba(250,255,252,.98)", stroke: "rgba(38,106,83,.78)", lineWidth: 5 });
  ctx.save(); ctx.beginPath(); ctx.roundRect(originX, originY, boardWidth, boardHeight, 24); ctx.clip();
  ctx.strokeStyle = "rgba(70,118,101,.1)"; ctx.lineWidth = 1.2;
  for (let index = 0; index <= gridColumns; index += 2) { ctx.beginPath(); ctx.moveTo(originX + index * cell, originY); ctx.lineTo(originX + index * cell, originY + boardHeight); ctx.stroke(); }
  for (let index = 0; index <= gridRows; index += 2) { ctx.beginPath(); ctx.moveTo(originX, originY + index * cell); ctx.lineTo(originX + boardWidth, originY + index * cell); ctx.stroke(); }
  ctx.restore();
}

function renderedSnakeParts(timestamp) {
  if (!snakeRenderDuration) return snake;
  const progress = Math.max(0, Math.min(1, (timestamp - snakeRenderStartedAt) / snakeRenderDuration));
  const eased = 1 - Math.pow(1 - progress, 3);
  return snake.map((part, index) => {
    const from = snakeRenderFrom[index] || part;
    if (Math.abs(part.x - from.x) > 1 || Math.abs(part.y - from.y) > 1) return part;
    return { x: from.x + (part.x - from.x) * eased, y: from.y + (part.y - from.y) * eased };
  });
}

function cachedSnakeSprite(index) {
  const image = stageCImages[index];
  if (!image?.complete || !image.naturalWidth) return null;
  const cached = snakeSpriteCache.get(index);
  if (cached?.width === image.naturalWidth && cached?.height === image.naturalHeight) return cached.canvas;
  if (!bitmapSourceRects.has(image)) cacheBitmapSourceRect(image);
  const source = bitmapSourceRects.get(image) || { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
  const scale = Math.min(1, 192 / Math.max(source.width, source.height));
  const sprite = document.createElement("canvas"); sprite.width = Math.max(1, Math.round(source.width * scale)); sprite.height = Math.max(1, Math.round(source.height * scale));
  sprite.getContext("2d").drawImage(image, source.x, source.y, source.width, source.height, 0, 0, sprite.width, sprite.height);
  snakeSpriteCache.set(index, { canvas: sprite, width: image.naturalWidth, height: image.naturalHeight }); return sprite;
}

function drawCachedSnakeSprite(index, x, y, width, height, options = {}) {
  const sprite = cachedSnakeSprite(index);
  if (!sprite) { ctx.fillStyle = options.fallback || palette.primary; ctx.fillRect(x, y, width, height); return; }
  const padding = Math.max(0, Number(options.padding) || 0); const fit = Math.min((width - padding * 2) / sprite.width, (height - padding * 2) / sprite.height);
  ctx.save(); ctx.translate(x + width / 2, y + height / 2); if (options.rotation) ctx.rotate(options.rotation); ctx.drawImage(sprite, -sprite.width * fit / 2, -sprite.height * fit / 2, sprite.width * fit, sprite.height * fit); ctx.restore();
}

function rebuildSnakeStaticLayer() {
  clearCanvas(); ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = snakeLayout(); const { originX, originY, cell } = layout; drawGardenBoard(layout);
  snakeObstacles.forEach((obstacle) => { const size = cell * 1.28; drawBitmapImage(stageCImages[5], originX + (obstacle.x + .5) * cell - size / 2, originY + (obstacle.y + .5) * cell - size / 2, size, size, { fallback: palette.accent, alpha: .94 }); });
  const x = originX + (food.x + .5) * cell; const y = originY + (food.y + .5) * cell; const golden = food.kind === "golden";
  const glow = ctx.createRadialGradient(x, y, cell * .15, x, y, cell * (golden ? 1.15 : .78)); glow.addColorStop(0, golden ? "rgba(255,235,121,.78)" : "rgba(255,103,78,.32)"); glow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, cell * (golden ? 1.15 : .78), 0, Math.PI * 2); ctx.fill();
  const size = cell * (golden ? 2.08 : 1.82); drawBitmapImage(stageCImages[4], x - size / 2, y - size / 2, size, size, { fallback: palette.primary, padding: 8 });
  if (golden) { ctx.strokeStyle = "rgba(212,157,35,.9)"; ctx.lineWidth = Math.max(3, cell * .11); ctx.beginPath(); ctx.arc(x, y, cell * .82, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore(); finishCanvasStyle(); snakeStaticContext.clearRect(0, 0, snakeStaticLayer.width, snakeStaticLayer.height); snakeStaticContext.drawImage(canvas, 0, 0); snakeStaticDirty = false; snakeStaticRebuilds += 1;
}

function drawSnake(timestamp = performance.now()) {
  const signature = [backgroundArtReady, backgroundArt.naturalWidth, stageCImages[4]?.naturalWidth || 0, stageCImages[5]?.naturalWidth || 0].join(":");
  if (signature !== snakeStaticAssetSignature) { snakeStaticAssetSignature = signature; snakeStaticDirty = true; }
  if (snakeStaticDirty) rebuildSnakeStaticLayer();
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(snakeStaticLayer, 0, 0); ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = snakeLayout(); const { originX, originY, boardHeight, cell } = layout; const parts = renderedSnakeParts(timestamp);
  ctx.strokeStyle = "rgba(42,142,102,.96)"; ctx.lineWidth = cell * .58; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
  parts.forEach((part, index) => { const x = originX + (part.x + .5) * cell; const y = originY + (part.y + .5) * cell; if (!index) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  parts.slice().reverse().forEach((part, reverseIndex) => {
    const index = parts.length - 1 - reverseIndex; const look = snakeBodySprite(index); const head = index === 0; const tail = index === snake.length - 1;
    const scale = (head ? 2 : tail ? 1.58 : 1.5) * look.scale * (timestamp < turnPulseUntil && head ? 1.09 : 1) * (timestamp < growthPulseUntil && index < 2 ? 1.08 : 1); const size = cell * scale;
    drawCachedSnakeSprite(look.spriteIndex, originX + (part.x + .5) * cell - size / 2, originY + (part.y + .5) * cell - size / 2, size, size, { fallback: head ? palette.highlight : palette.primary, rotation: look.rotation, padding: head ? 6 : 4 });
  });
  if (snakeDangerNearHead() || collisionMarker) { const marker = collisionMarker || snake[0]; const size = cell * 2.35; drawBitmapImage(stageCImages[7], originX + (marker.x + .5) * cell - size / 2, originY + (marker.y + .5) * cell - size / 2, size, size, { fallback: palette.primary, alpha: collisionMarker ? .94 : .48 }); }
  if (snakeEffect && timestamp < snakeEffect.until) { const size = cell * 2.8; drawBitmapImage(stageCImages[6], originX + (snakeEffect.x + .5) * cell - size / 2, originY + (snakeEffect.y + .5) * cell - size / 2, size, size, { fallback: palette.highlight, alpha: Math.max(0, (snakeEffect.until - timestamp) / 420) }); }
  if (snakePaused) { ctx.fillStyle = "rgba(246,252,247,.8)"; ctx.fillRect(originX, originY, layout.boardWidth, boardHeight); ctx.fillStyle = "#214b3d"; ctx.textAlign = "center"; ctx.font = "700 38px Inter, Microsoft YaHei, sans-serif"; ctx.fillText("巡游暂停", 360, originY + boardHeight * .48); ctx.font = "500 19px Inter, Microsoft YaHei, sans-serif"; ctx.fillText("按 P、空格或继续返回庭园", 360, originY + boardHeight * .53); }
  if (timestamp < snakeCompletionUntil) drawBitmapImage(stageCImages[8], 170, originY + boardHeight * .32, 380, 380, { fallback: palette.highlight, alpha: .96 });
  ctx.restore();
}

function currentStepDelay() { const baseDelay = difficultyProfile.speed / campaignScale("speedMultiplier"); const tuned = baseDelay * currentSnakeBlueprint().speedScale; return activeDifficulty === "challenging" ? Math.max(55, tuned - score * 2.5) : Math.max(72, tuned); }
function restartSnakeClock(timestamp = performance.now()) { snakeStepAccumulator = 0; snakeLastFrameAt = timestamp; }

function snakeStep(timestamp = performance.now()) {
  if (!running || snakePaused || timestamp < snakeReadyUntil) return;
  const previous = snake.map((part) => ({ ...part })); const queued = snakeDirectionQueue.shift(); if (queued) { direction = queued; snakeStats.turns += 1; }
  let head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y }; const crossed = head.x < 0 || head.y < 0 || head.x >= gridColumns || head.y >= gridRows;
  if (crossed && difficultyProfile.wrapWalls) head = { x: (head.x + gridColumns) % gridColumns, y: (head.y + gridRows) % gridRows };
  const eats = head.x === food.x && head.y === food.y;
  const reason = crossed && !difficultyProfile.wrapWalls ? "撞到边界" : snakeObstacles.some((part) => part.x === head.x && part.y === head.y) ? "撞到庭院障碍" : difficultyProfile.selfCollision && (eats ? snake : snake.slice(0,-1)).some((part) => part.x === head.x && part.y === head.y) ? "撞到自己的身体" : "";
  if (reason) { snakeStats.collisionReason = reason; collisionMarker = head; drawSnake(); const seconds = Math.max(1, Math.round((performance.now() - snakeStats.startedAt) / 1000)); showResult(false, "巡游中断", reason + "。本局 " + score + " 分，最长 " + snake.length + " 节，转向 " + snakeStats.turns + " 次，用时 " + seconds + " 秒。"); return; }
  snake.unshift(head); snakeStats.distance += 1; snakeRenderFrom = previous; snakeRenderStartedAt = timestamp; snakeRenderDuration = Math.min(180, Math.max(72, currentStepDelay() * .94));
  if (eats) {
    score += food.value; if (food.kind === "golden") snakeStats.bonusCount += 1; snakeEffect = { x: head.x, y: head.y, until: performance.now() + 420 }; growthPulseUntil = performance.now() + 240; setMetric(score + " / " + foodTarget); playSound("success");
    if (score >= foodTarget) { snakeCompletionUntil = performance.now() + 1600; const token = ++snakeCompletionToken; running = false; setGameSessionState("stage-complete"); drawSnake(timestamp); window.setTimeout(() => { if (token !== snakeCompletionToken) return; const seconds = Math.max(1, Math.round((performance.now() - snakeStats.startedAt) / 1000)); showResult(true, "青玉巡游完成", currentSnakeBlueprint().name + "完成：" + score + " 分，长度 " + snake.length + "，金果 " + snakeStats.bonusCount + "，转向 " + snakeStats.turns + "，险情 " + snakeStats.nearMisses + "，用时 " + seconds + " 秒。"); }, 760); return; }
    placeFood();
  } else snake.pop();
  const danger = snakeDangerNearHead(); if (danger && !snakeWasInDanger) snakeStats.nearMisses += 1; snakeWasInDanger = danger;
}

function snakeAnimationLoop(timestamp) {
  const rawDelta = snakeLastFrameAt ? timestamp - snakeLastFrameAt : 16.7; const delta = Math.max(0, Math.min(80, rawDelta)); snakeLastFrameAt = timestamp; snakeFrameInterval = snakeFrameInterval * .9 + Math.min(50, Math.max(4, rawDelta)) * .1;
  if (running && !snakePaused) {
    if (food.kind === "golden" && timestamp >= food.expiresAt) { placeFood("normal"); setStatus("金果光芒消散，新的朱果已在可达庭径出现。"); }
    if (timestamp >= snakeReadyUntil) { snakeStepAccumulator += delta; const delay = currentStepDelay(); if (snakeStepAccumulator >= delay) { snakeStepAccumulator = Math.min(snakeStepAccumulator - delay, delay); snakeStep(timestamp); } }
  }
  const active = running || snakePaused || timestamp < snakeRenderStartedAt + snakeRenderDuration || timestamp < growthPulseUntil || timestamp < turnPulseUntil || timestamp < snakeCompletionUntil || Boolean(snakeEffect && timestamp < snakeEffect.until) || collisionMarker;
  if (active) { drawSnake(timestamp); snakeRenderedFrames += 1; }
  requestAnimationFrame(snakeAnimationLoop);
}

function queueSnakeTurn(dx, dy) {
  if (!running || snakePaused || snakeDirectionQueue.length >= 2) return false;
  const previous = snakeDirectionQueue[snakeDirectionQueue.length - 1] || direction;
  if ((dx === previous.x && dy === previous.y) || (dx === -previous.x && dy === -previous.y)) return false;
  snakeDirectionQueue.push({ x: dx, y: dy }); turnPulseUntil = performance.now() + 120; playSound("ui"); return true;
}

function syncPauseControl() {
  document.querySelectorAll("[data-control=pause]").forEach((button) => { button.textContent = snakePaused ? "继续" : "暂停"; button.setAttribute("aria-label", snakePaused ? "继续游戏" : "暂停游戏"); button.disabled = !(gameSessionState === "playing" || gameSessionState === "paused"); });
}

function toggleSnakePause() {
  if (gameSessionState === "playing") { snakePaused = true; setGameSessionState("paused"); stopEnvironmentAudio(); setStatus("巡游已暂停；返回页面后由你主动继续。"); }
  else if (gameSessionState === "paused") { snakePaused = false; setGameSessionState("playing"); restartSnakeClock(); startAmbient(); setStatus(currentSnakeBlueprint().name + "继续 · " + (snakeControlMode === "swipe" ? "在庭园上滑动转向" : "使用四键转向") + "。"); }
  syncPauseControl(); drawSnake();
}

function startGame() {
  snakeCompletionToken += 1; resetCampaignRandom(); applySnakeCampaignTuning(); previewSnake(); score = 0; snakeEffect = null; collisionMarker = null; snakeCompletionUntil = 0; growthPulseUntil = 0; turnPulseUntil = 0; snakePaused = false;
  snakeStats = { turns: 0, nearMisses: 0, distance: 0, bonusCount: 0, startedAt: performance.now(), collisionReason: "" }; snakeWasInDanger = false; createSnakeObstacles(); placeFood("normal"); running = true; hideOverlay(); snakeReadyUntil = performance.now() + 900;
  setMetric("0 / " + foodTarget); setStatus("第 " + currentCampaignLevel().number + " 关 · " + currentSnakeBlueprint().name + " · " + currentSnakeBlueprint().chapter + "；" + (snakeControlMode === "swipe" ? "滑动庭园转向" : "使用四键转向") + "。"); startAmbient(); restartSnakeClock(); syncPauseControl(); drawSnake();
}

function handleControl(value) { const map = { up:[0,-1], right:[1,0], down:[0,1], left:[-1,0] }; if (value === "pause") { toggleSnakePause(); return; } if (map[value]) queueSnakeTurn(map[value][0], map[value][1]); }
function handleKey(key) { const normalized = key.length === 1 ? key.toLowerCase() : key; if (normalized === "p" || key === " ") { toggleSnakePause(); return; } const map = { ArrowUp:"up", ArrowRight:"right", ArrowDown:"down", ArrowLeft:"left", w:"up", d:"right", s:"down", a:"left" }; if (map[normalized]) handleControl(map[normalized]); }

canvas.addEventListener("pointerdown", (event) => { if (!running || snakePaused || snakeControlMode !== "swipe") return; snakeSwipe = { pointerId:event.pointerId, x:event.clientX, y:event.clientY }; canvas.setPointerCapture?.(event.pointerId); });
canvas.addEventListener("pointerup", (event) => { if (!snakeSwipe || snakeSwipe.pointerId !== event.pointerId) return; const dx = event.clientX - snakeSwipe.x; const dy = event.clientY - snakeSwipe.y; snakeSwipe = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return; if (Math.abs(dx) > Math.abs(dy)) queueSnakeTurn(dx > 0 ? 1 : -1, 0); else queueSnakeTurn(0, dy > 0 ? 1 : -1); });
canvas.addEventListener("pointercancel", () => { snakeSwipe = null; });

difficultyButtons.forEach((button) => button.addEventListener("click", () => { const value = button.dataset.snakeDifficulty; if (!running && !snakePaused) { applyDifficulty(value, false); return; } const now = performance.now(); if (pendingDifficulty !== value || now > pendingDifficultyUntil) { pendingDifficulty = value; pendingDifficultyUntil = now + 2500; setStatus("再次点击“" + difficultyProfiles[value].label + "”确认切换；当前巡游会重新开始。"); return; } pendingDifficulty = null; applyDifficulty(value, true); }));
controlModeButtons.forEach((button) => button.addEventListener("click", () => { const value = button.dataset.snakeControlMode; if (value !== "swipe" && value !== "buttons") return; snakeControlMode = value; syncSnakeControlMode(); }));
document.addEventListener("visibilitychange", () => { if (document.hidden && gameSessionState === "playing") toggleSnakePause(); });

onCampaignLevelChanged = () => { applySnakeCampaignTuning(); if (!running && !snakePaused) { resetCampaignRandom(); previewSnake(); createSnakeObstacles(); placeFood("normal"); drawSnake(); } };
runtimeDebugActions = {
  legalAction: () => { queueSnakeTurn(0,-1); },
  previewCompletion: () => { snakeCompletionUntil = performance.now() + 1600; drawSnake(); },
  queueTurnSequence: () => { previewSnake(); running = true; snakePaused = false; snakeReadyUntil = 0; queueSnakeTurn(0,-1); queueSnakeTurn(-1,0); snakeStep(performance.now()); snakeStep(performance.now() + currentStepDelay()); },
  sampleReachableFood: () => { let valid = true; for (let index = 0; index < 100; index += 1) { placeFood(index % 7 === 0 ? "golden" : "normal"); valid = valid && reachableSnakeCells().has(snakeCellKey(food.x, food.y)) && !snake.some((cell) => cell.x === food.x && cell.y === food.y) && !snakeObstacles.some((cell) => cell.x === food.x && cell.y === food.y); } snakeFoodProbe = { count:100, valid }; },
  pause: () => toggleSnakePause(), setSwipeMode: () => { snakeControlMode = "swipe"; syncSnakeControlMode(); }, setButtonMode: () => { snakeControlMode = "buttons"; syncSnakeControlMode(); },
};
runtimeDebugState = () => ({
  level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, levelName: currentSnakeBlueprint().name, chapter: currentSnakeBlueprint().chapter, pattern: currentSnakeBlueprint().pattern, layoutSignature: snakeLayoutSignature,
  difficulty: activeDifficulty, score, target: foodTarget, length: snake.length, obstacleCount: snakeObstacles.length, grid: { columns:gridColumns, rows:gridRows }, stepDelay: Math.round(currentStepDelay()), rendering: "requestAnimationFrame-interpolation",
  staticLayerCached: true, staticLayerRebuilds: snakeStaticRebuilds, interpolationMs: Math.round(snakeRenderDuration), estimatedFps: Math.round(1000 / Math.max(1, snakeFrameInterval)), renderedFrames: snakeRenderedFrames,
  wrapWalls: difficultyProfile.wrapWalls, selfCollision: difficultyProfile.selfCollision, assetRoles: ["head","body-straight","body-corner","tail","food","obstacle","eat","danger","complete"], head: snake[0], direction: { ...direction }, directionQueue: snakeDirectionQueue.map((value) => ({ ...value })),
  dangerNearHead: snakeDangerNearHead(), completionActive: performance.now() < snakeCompletionUntil, collision: collisionMarker, paused: snakePaused, controlMode: snakeControlMode, readyGraceActive: performance.now() < snakeReadyUntil,
  food: { ...food, reachable: reachableSnakeCells().has(snakeCellKey(food.x, food.y)) }, foodProbe: snakeFoodProbe, stats: { ...snakeStats },
});

loadSnakeControlMode(); syncDifficultyUi(); previewSnake(); createSnakeObstacles(); placeFood("normal"); drawSnake(); requestAnimationFrame(snakeAnimationLoop);
`;
