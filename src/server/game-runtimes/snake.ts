import { snakeMotionScript } from './snake-motion.js';
import { snakeForagingScript } from './snake-foraging.js';

export const snakeScript = snakeMotionScript + snakeForagingScript + String.raw`
const difficultyProfiles = {
  relaxed: { label: "轻松", columns: 14, portraitRows: 24, landscapeRows: 14, foodTarget: 8, speed: 190, wrapWalls: true, selfCollision: false, obstacleScale: .58, description: "慢速巡游 · 持续采集 · 越界会从另一侧回来" },
  standard: { label: "标准", columns: 14, portraitRows: 24, landscapeRows: 14, foodTarget: 12, speed: 135, wrapWalls: false, selfCollision: true, obstacleScale: 1, description: "适中速度 · 分段采集 · 边界、身体与庭石都会中断巡游" },
  challenging: { label: "挑战", columns: 16, portraitRows: 28, landscapeRows: 16, foodTarget: 18, speed: 104, wrapWalls: false, selfCollision: true, obstacleScale: 1.25, description: "高速开局 · 分段采集 · 场型更密并随收集继续加速" },
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
let snakeHeading = 0;
let snakeTargetHeading = 0;
let snakeDirectionQueue = [];
let food = { x: 10, y: 8, kind: "normal", value: 1, expiresAt: 0 };
let foods = [];
let snakeMode = 'campaign';
let forage = newSnakeForaging();
let foragePlan = snakeForagingPlan(1, snakeMode);
let foodSerial = 0;
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
let snakePickupEffects = [];
let collisionMarker = null;
let snakeCompletionUntil = 0;
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
  gridColumns = difficultyProfile.columns * 3 + growth;
  gridRows = difficultyProfile.portraitRows * 2 + growth * 2;
  foragePlan = snakeForagingPlan(currentCampaignLevel().number, snakeMode);
  foodTarget = foragePlan.phases * foragePlan.quota;
  snakeStaticDirty = true;
}

function snakeLayout() {
  const cell = 42, boardWidth = gridColumns * cell, boardHeight = gridRows * cell;
  const head = snake[0] || { x: gridColumns / 2, y: gridRows / 2 };
  const cameraX = Math.max(360, Math.min(boardWidth - 360, (head.x + .5) * cell));
  const cameraY = Math.max(gameSceneHeight() / 2, Math.min(boardHeight - gameSceneHeight() / 2, (head.y + .5) * cell));
  return { boardWidth, boardHeight, cell, originX: 360 - cameraX, originY: gameSceneHeight() / 2 - cameraY };
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

function loadSnakeControlMode() { snakeControlMode = "swipe"; syncSnakeControlMode(); }

function previewSnake() {
  const y = Math.floor(gridRows / 2);
  const x = Math.floor(gridColumns * .46);
  snake = [{ x, y }, { x: x - 1, y }, { x: x - 2, y }, { x: x - 3, y }];
  direction = { x: 1, y: 0 };
  snakeHeading = 0; snakeTargetHeading = 0;
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
  const head = snake[0] && { x: Math.round(snake[0].x), y: Math.round(snake[0].y) };
  if (!head) return new Map();
  const blocked = new Set([...snakeObstacles.map((cell) => snakeCellKey(cell.x, cell.y)), ...snake.slice(1).map((cell) => snakeCellKey(Math.round(cell.x), Math.round(cell.y)))]);
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

function nextSnakeFoodKind() { return ['normal', 'golden', 'normal', 'mint', 'normal', 'dew'][foodSerial++ % 6]; }
function selectNearestFood() {
  if (foods.length) food = foods.reduce((best, item) => Math.hypot(item.x - snake[0].x, item.y - snake[0].y) < Math.hypot(best.x - snake[0].x, best.y - snake[0].y) ? item : best);
}
function placeFood(requestedKind = nextSnakeFoodKind(), distances = reachableSnakeCells()) {
  const occupied = new Set(snake.map(cell => snakeCellKey(Math.round(cell.x), Math.round(cell.y))));
  foods.forEach(cell => { for(let dx=-1;dx<=1;dx++) for(let dy=-1;dy<=1;dy++) occupied.add(snakeCellKey(cell.x+dx,cell.y+dy)); });
  let candidates = [...distances.entries()].filter(([key, distance]) => distance >= 3 && !occupied.has(key));
  if (!candidates.length) candidates = [...distances.entries()].filter(([key, distance]) => distance >= 2 && !occupied.has(key));
  const selected = candidates[Math.floor(campaignRandom() * candidates.length)];
  if (!selected) return false;
  const [x, y] = selected[0].split(":").map(Number);
  const kind = snakeFoodTypes[requestedKind] ? requestedKind : 'normal';
  foods.push({ x, y, kind, value: snakeFoodTypes[kind].points, expiresAt: 0 });
  selectNearestFood(); snakeStaticDirty = true; return true;
}
function refreshFoodPopulation(reset = false) {
  if (!snakeShouldSeedFood(snakeMode, foods.length, reset)) return;
  if (reset) { foods = []; foodSerial = 0; }
  const distances = reachableSnakeCells();
  // Seed the whole reachable map once. Existing food is never moved or replaced.
  for (let i = foods.length; i < foragePlan.population; i++) if (!placeFood(nextSnakeFoodKind(), distances)) break;
  selectNearestFood();
}
function snakeTimeLabel(seconds) { const value = Math.floor(seconds); return Math.floor(value / 60) + ':' + String(value % 60).padStart(2,'0'); }
function updateForageHud() {
  setMetric(snakeMode === 'endless' ? score + ' 分' : (Math.min(forage.phase + 1,foragePlan.phases)) + '/' + foragePlan.phases + ' 段');
}
function syncSnakeModeUi() {
  document.querySelectorAll('.campaign-setup, [data-campaign-progress], .mastery-card, .mastery-panel').forEach(node => { node.style.display = snakeMode === 'endless' ? 'none' : ''; });
  document.querySelectorAll('.objective').forEach(node => {
    if (!node.dataset.campaignCopy) node.dataset.campaignCopy = node.textContent;
    node.textContent = snakeMode === 'endless' ? '无限巡游没有目标和胜利终点。朱果增长、金果加分、青叶灵活转向、露珠吸取；碰撞规则遵循所选难度。' : node.dataset.campaignCopy;
  });
  document.querySelectorAll('[data-snake-mode]').forEach(button => { const selected = button.dataset.snakeMode === snakeMode; button.setAttribute('aria-pressed', String(selected)); button.style.background = selected ? '#287a55' : '#edf8f0'; button.style.color = selected ? '#fff' : '#214b3d'; });
  document.querySelectorAll('[data-campaign-level]').forEach(select => { select.disabled = snakeMode === 'endless'; });
}
function installSnakeModes() {
  const panel = document.createElement('div');
  panel.style.cssText = 'display:grid;gap:8px;margin:10px 0;color:#214b3d;font-size:12px;line-height:1.5';
  panel.innerHTML = '<div style="display:flex;gap:8px"><button type="button" data-snake-mode="campaign" style="flex:1;border:1px solid #287a55;border-radius:24px;padding:12px;font:inherit;font-weight:700">关卡巡游</button><button type="button" data-snake-mode="endless" style="flex:1;border:1px solid #287a55;border-radius:24px;padding:12px;font:inherit;font-weight:700">无限巡游</button></div><span>朱果增长 · 金果加分 · 青叶灵活转向 · 露珠吸取<br>每段巡游 30 秒并计入 8–10 枚采集；整关至少两类，超额采集保留。首关至少 2 分钟，后续至少 3–5 分钟；无限版无目标。</span>';
  startButton.before(panel);
  window.addEventListener('game:state-change', () => { panel.style.display = gameSessionState === 'idle' ? 'grid' : 'none'; });
  panel.querySelectorAll('[data-snake-mode]').forEach(button => button.addEventListener('click', () => {
    if (gameSessionState !== 'idle') return;
    snakeMode = button.dataset.snakeMode; applySnakeCampaignTuning(); forage = newSnakeForaging(); refreshFoodPopulation(true); syncSnakeModeUi(); updateForageHud(); drawSnake();
  }));
  syncSnakeModeUi();
}

function applyDifficulty(value, restartIfRunning = false) {
  if (!difficultyProfiles[value]) return;
  const wasPlaying = gameSessionState === "playing" || gameSessionState === "paused";
  activeDifficulty = value; difficultyProfile = difficultyProfiles[value]; applySnakeCampaignTuning(); syncDifficultyUi();
  if (wasPlaying && restartIfRunning) { startGame(); return; }
  previewSnake(); createSnakeObstacles(); refreshFoodPopulation(true); drawSnake(); setMetric("—");
  setStatus("已选择" + difficultyProfile.label + "难度。" + difficultyProfile.description + "。");
  overlayTitle.textContent = difficultyProfile.label + "难度已就绪";
  overlayDetail.textContent = currentSnakeBlueprint().name + " · " + currentSnakeBlueprint().chapter + "。改变方向收集朱果。";
  startButton.textContent = "开始" + difficultyProfile.label + "巡游";
}

function snakeBodySprite(index) {
  if (index === 0) return { spriteIndex: 0, rotation: snakeHeading, scale: 1.12 };
  const part = snake[index], previous = snake[index - 1];
  return { spriteIndex: index === snake.length - 1 ? 3 : 1, rotation: Math.atan2(previous.y - part.y, previous.x - part.x), scale: 1 };
}

function nextSnakeCell() { const next = snakeDirectionQueue[0] || direction; return { x: snake[0].x + next.x, y: snake[0].y + next.y }; }
function snakeDangerNearHead() {
  if (!snake[0]) return false;
  const next = nextSnakeCell();
  return (!difficultyProfile.wrapWalls && (next.x < 0 || next.y < 0 || next.x >= gridColumns || next.y >= gridRows))
    || snakeObstacles.some((cell) => Math.hypot(cell.x - next.x, cell.y - next.y) < 1.1)
    || (difficultyProfile.selfCollision && snake.slice(3).some((cell) => Math.hypot(cell.x - next.x, cell.y - next.y) < .8));
}

function drawGardenBoard(layout) {
  const { originX, originY, boardWidth, boardHeight, cell } = layout;
  drawPlayfield(originX - 12, originY - 12, boardWidth + 24, boardHeight + 24, { radius: 32, alpha: .99, fill: "rgba(237,248,240,.99)", stroke: "rgba(27,91,70,.9)", lineWidth: 6 });
  ctx.save(); ctx.beginPath(); ctx.roundRect(originX, originY, boardWidth, boardHeight, 24); ctx.clip();
  for (let row = Math.max(0, Math.floor(-originY / cell)); row < Math.min(gridRows, Math.ceil((gameSceneHeight() - originY) / cell)); row += 1) for (let column = Math.max(0, Math.floor(-originX / cell)); column < Math.min(gridColumns, Math.ceil((720 - originX) / cell)); column += 1) {
    if ((row + column) % 2 === 0) { ctx.fillStyle = "rgba(74,132,104,.055)"; ctx.fillRect(originX + column * cell, originY + row * cell, cell, cell); }
  }
  ctx.strokeStyle = "rgba(45,104,82,.2)"; ctx.lineWidth = 1.35;
  for (let index = 0; index <= gridColumns; index += 1) { ctx.beginPath(); ctx.moveTo(originX + index * cell, originY); ctx.lineTo(originX + index * cell, originY + boardHeight); ctx.stroke(); }
  for (let index = 0; index <= gridRows; index += 1) { ctx.beginPath(); ctx.moveTo(originX, originY + index * cell); ctx.lineTo(originX + boardWidth, originY + index * cell); ctx.stroke(); }
  ctx.restore();
}

function renderedSnakeParts() { return snake; }

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
  snakeObstacles.forEach((obstacle) => { const size = cell * 1.46; drawBitmapImage(stageCImages[5], originX + (obstacle.x + .5) * cell - size / 2, originY + (obstacle.y + .5) * cell - size / 2, size, size, { fallback: palette.accent, alpha: 1 }); });
  foods.forEach(item => {
    const x = originX + (item.x + .5) * cell, y = originY + (item.y + .5) * cell;
    if (x < -60 || x > 780 || y < -60 || y > gameSceneHeight() + 60) return;
    const spriteIndex = {normal:4,golden:9,mint:10,dew:11}[item.kind];
    const size = cell * (item.kind === 'normal' ? 1.35 : 1.2);
    drawCachedSnakeSprite(spriteIndex, x-size/2, y-size/2, size, size, {fallback:snakeFoodTypes[item.kind].color});
  });
  ctx.restore(); finishCanvasStyle(); snakeStaticContext.clearRect(0, 0, snakeStaticLayer.width, snakeStaticLayer.height); snakeStaticContext.drawImage(canvas, 0, 0); snakeStaticDirty = false; snakeStaticRebuilds += 1;
}

function drawSnake(timestamp = performance.now()) {
  snakeStaticDirty = true;
  const signature = [backgroundArtReady, backgroundArt.naturalWidth, stageCImages[4]?.naturalWidth || 0, stageCImages[5]?.naturalWidth || 0].join(":");
  if (signature !== snakeStaticAssetSignature) { snakeStaticAssetSignature = signature; snakeStaticDirty = true; }
  if (snakeStaticDirty) rebuildSnakeStaticLayer();
  ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.drawImage(snakeStaticLayer, 0, 0); ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = snakeLayout(); const { originX, originY, boardHeight, cell } = layout; const parts = renderedSnakeParts(timestamp);
  // Fade only the collected food at its original position, beneath the dragon.
  snakePickupEffects = snakePickupEffects.filter(effect => timestamp < effect.until);
  snakePickupEffects.forEach(effect => {
    const remaining = Math.max(0, Math.min(1, (effect.until - timestamp) / 220));
    const size = cell * (effect.kind === 'normal' ? 1.35 : 1.2) * (.65 + .35 * remaining);
    const index = {normal:4,golden:9,mint:10,dew:11}[effect.kind];
    ctx.save(); ctx.globalAlpha = remaining;
    drawCachedSnakeSprite(index, originX + (effect.x + .5)*cell-size/2, originY + (effect.y + .5)*cell-size/2, size, size);
    ctx.restore();
  });
  ctx.strokeStyle = "rgba(20,72,54,.42)"; ctx.lineWidth = cell * .78; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath();
  parts.forEach((part, index) => { const x = originX + (part.x + .5) * cell; const y = originY + (part.y + .5) * cell; if (!index) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  ctx.strokeStyle = "rgba(38,154,108,.98)"; ctx.lineWidth = cell * .56; ctx.beginPath();
  parts.forEach((part, index) => { const x = originX + (part.x + .5) * cell; const y = originY + (part.y + .5) * cell; if (!index) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.stroke();
  parts.slice().reverse().forEach((part, reverseIndex) => {
    const index = parts.length - 1 - reverseIndex; const look = snakeBodySprite(index); const head = index === 0; const tail = index === snake.length - 1;
    const scale = (head ? 2.18 : tail ? 1.72 : 1.66) * look.scale; const size = cell * scale;
    drawCachedSnakeSprite(look.spriteIndex, originX + (part.x + .5) * cell - size / 2, originY + (part.y + .5) * cell - size / 2, size, size, { fallback: head ? palette.highlight : palette.primary, rotation: look.rotation, padding: head ? 3 : 2 });
  });
  if (snakeDangerNearHead() || collisionMarker) { const marker = collisionMarker || snake[0]; const size = cell * 2.35; drawBitmapImage(stageCImages[7], originX + (marker.x + .5) * cell - size / 2, originY + (marker.y + .5) * cell - size / 2, size, size, { fallback: palette.primary, alpha: collisionMarker ? .94 : .48 }); }
  if (forage.magnetUntil > forage.activeSeconds) { ctx.strokeStyle = '#327caa'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(originX + (snake[0].x + .5)*cell, originY + (snake[0].y + .5)*cell, cell*1.8, 0, Math.PI*2); ctx.stroke(); }
  ctx.save(); ctx.fillStyle = 'rgba(245,255,249,.94)'; ctx.beginPath(); ctx.roundRect(60,14,600,76,18); ctx.fill(); ctx.fillStyle = '#214b3d'; ctx.font = '700 23px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(snakeMode === 'endless' ? '无限巡游 · ' + snakeTimeLabel(forage.activeSeconds) + ' · ' + score + ' 分' : '第 ' + Math.min(forage.phase+1,foragePlan.phases) + '/' + foragePlan.phases + ' 段 · ' + snakeTimeLabel(forage.phaseSeconds) + '/0:30',360,44);
  ctx.font = '19px sans-serif'; ctx.fillText(snakeMode === 'endless' ? '朱果增长 · 金果加分 · 青叶灵活转向 · 露珠吸取' : '采集 ' + forage.picked + '/' + foragePlan.quota + ' · 种类 ' + forage.kinds.length + '/2 · ' + score + ' 分',360,73); ctx.restore();
  const fruitX = originX + (food.x + .5) * cell, fruitY = originY + (food.y + .5) * cell;
  if (foods.length && (fruitX < 40 || fruitX > 680 || fruitY < 40 || fruitY > gameSceneHeight() - 40)) {
    const hintX = Math.max(40, Math.min(680, fruitX)), hintY = Math.max(40, Math.min(gameSceneHeight() - 40, fruitY));
    ctx.save(); ctx.translate(hintX, hintY); ctx.rotate(Math.atan2(fruitY - hintY, fruitX - hintX)); ctx.fillStyle = '#c95339'; ctx.beginPath(); ctx.moveTo(17,0); ctx.lineTo(-10,-10); ctx.lineTo(-10,10); ctx.closePath(); ctx.fill(); ctx.restore();
  }
  if (snakePaused) { ctx.fillStyle = "rgba(246,252,247,.8)"; ctx.fillRect(0, 0, 720, gameSceneHeight()); ctx.fillStyle = "#214b3d"; ctx.textAlign = "center"; ctx.font = "700 38px Inter, Microsoft YaHei, sans-serif"; ctx.fillText("巡游暂停", 360, gameSceneHeight() * .48); }
  if (timestamp < snakeCompletionUntil) drawBitmapImage(stageCImages[8], 170, gameSceneHeight() * .32, 380, 380, { fallback: palette.highlight, alpha: .96 });
  ctx.restore();
}

function currentStepDelay() { const baseDelay = difficultyProfile.speed / campaignScale("speedMultiplier"); const tuned = baseDelay * currentSnakeBlueprint().speedScale; return activeDifficulty === "challenging" ? Math.max(55, tuned - score * 2.5) : Math.max(72, tuned); }
function restartSnakeClock(timestamp = performance.now()) { snakeStepAccumulator = 0; snakeLastFrameAt = timestamp; }

function snakeStep(timestamp = performance.now(), seconds = 1 / 60) {
  if (!running || snakePaused || timestamp < snakeReadyUntil) return;
  const motion = advanceSnakeMotion(snake, snakeHeading, snakeTargetHeading, seconds, { speed: Math.min(6, 650 / currentStepDelay()), turnRate: forage.agilityUntil > forage.activeSeconds ? 5.4 : 3.6, width: gridColumns, height: gridRows, obstacles: snakeObstacles, selfCollision: difficultyProfile.selfCollision, wrap: difficultyProfile.wrapWalls });
  snake = motion.parts; snakeHeading = motion.angle; direction = { x: Math.cos(snakeHeading), y: Math.sin(snakeHeading) };
  const head = snake[0], reason = motion.reason;
  if (reason) { snakeStats.collisionReason = reason; collisionMarker = motion.collision; drawSnake(); showResult(false, "巡游中断", reason + "。本局 " + score + " 分，采集 " + forage.totalPicked + " 枚，巡游 " + snakeTimeLabel(forage.activeSeconds) + "。"); return; }
  forage.activeSeconds += seconds; forage.phaseSeconds += seconds;
  snakeStats.distance += motion.distance;
  const radius = forage.magnetUntil > forage.activeSeconds ? 1.8 : .85;
  const collected = foods.filter(item => Math.hypot(head.x-item.x,head.y-item.y) < radius);
  for (const item of collected) {
    const reward = snakeFoodReward(forage, item.kind, snake.length);
    while (snake.length < reward.length) snake.push({ ...snake[snake.length - 1] });
    snake.length = reward.length; score += reward.points;
    if (item.kind === 'golden') snakeStats.bonusCount += 1;
    snakePickupEffects.push({ x:item.x, y:item.y, kind:item.kind, until:performance.now()+220 });
    setStatus(snakeFoodTypes[item.kind].name + '：' + snakeFoodTypes[item.kind].effect);
  }
  if (collected.length) { foods = foods.filter(item => !collected.includes(item)); refreshFoodPopulation(); playSound('success'); }
  selectNearestFood(); updateForageHud();
  const previousPhase = forage.phase;
  const complete = advanceSnakeForage(forage, foragePlan);
  if (complete) {
    snakeCompletionUntil = performance.now() + 1600; const token = ++snakeCompletionToken;
    running = false; setGameSessionState("stage-complete"); drawSnake(timestamp);
    window.setTimeout(() => { if (token !== snakeCompletionToken) return; showResult(true, "青玉巡游完成", "完成 " + foragePlan.phases + " 段巡游，采集 " + forage.totalPicked + " 枚，" + score + " 分，用时 " + snakeTimeLabel(forage.activeSeconds) + "。"); },760);
    return;
  }
  if (forage.phase !== previousPhase) { refreshFoodPopulation(); setStatus('进入第 ' + (forage.phase+1) + ' 段：采集两类食物，青叶可提高转向灵活度，露珠可扩大吸取范围。'); playSound('success'); }
  const danger = snakeDangerNearHead(); if (danger && !snakeWasInDanger) snakeStats.nearMisses += 1; snakeWasInDanger = danger;
}

function snakeAnimationLoop(timestamp) {
  const rawDelta = snakeLastFrameAt ? timestamp - snakeLastFrameAt : 16.7; const delta = Math.max(0, Math.min(80, rawDelta)); snakeLastFrameAt = timestamp; snakeFrameInterval = snakeFrameInterval * .9 + Math.min(50, Math.max(4, rawDelta)) * .1;
  if (running && !snakePaused && !onboardingIsActive()) {
    if (timestamp >= snakeReadyUntil) snakeStep(timestamp, delta / 1000);
  }
  const active = running || snakePaused || timestamp < snakeRenderStartedAt + snakeRenderDuration || timestamp < snakeCompletionUntil || snakePickupEffects.some(effect => timestamp < effect.until) || collisionMarker;
  if (active) { drawSnake(timestamp); snakeRenderedFrames += 1; }
  requestAnimationFrame(snakeAnimationLoop);
}

function queueSnakeTurn(dx, dy) {
  if (!running || snakePaused || Math.hypot(dx, dy) < .01) return false;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(Math.atan2(Math.sin(angle - snakeTargetHeading), Math.cos(angle - snakeTargetHeading))) < .03) return false;
  snakeTargetHeading = angle; snakeStats.turns += 1; signalOnboarding("direction-changed"); return true;
}

function syncPauseControl() {
  document.querySelectorAll("[data-control=pause]").forEach((button) => { button.textContent = snakePaused ? "继续" : "暂停"; button.setAttribute("aria-label", snakePaused ? "继续游戏" : "暂停游戏"); button.disabled = !(gameSessionState === "playing" || gameSessionState === "paused"); });
}

function toggleSnakePause() {
  if (gameSessionState === "playing") { snakePaused = true; setGameSessionState("paused"); stopEnvironmentAudio(); setStatus("巡游已暂停；返回页面后由你主动继续。"); }
  else if (gameSessionState === "paused") { snakePaused = false; setGameSessionState("playing"); restartSnakeClock(); startAmbient(); setStatus(currentSnakeBlueprint().name + "继续 · 鼠标指向或单指拖动，自由转向。"); }
  syncPauseControl(); drawSnake();
}

function startGame() {
  snakeCompletionToken += 1; forage = newSnakeForaging(); resetCampaignRandom(); applySnakeCampaignTuning(); previewSnake(); score = 0; snakePickupEffects = []; collisionMarker = null; snakeCompletionUntil = 0; snakePaused = false;
  snakeStats = { turns: 0, nearMisses: 0, distance: 0, bonusCount: 0, startedAt: performance.now(), collisionReason: "" }; snakeWasInDanger = false; createSnakeObstacles(); refreshFoodPopulation(true); running = true; hideOverlay(); snakeReadyUntil = performance.now() + 900;
  updateForageHud(); syncSnakeModeUi(); setStatus(snakeMode === 'endless' ? '无限巡游 · 自由采集，没有通关目标。' : "第 " + currentCampaignLevel().number + " 关 · " + currentSnakeBlueprint().name + " · " + currentSnakeBlueprint().chapter + "；鼠标指向或单指拖动，自由转向。"); startAmbient(); restartSnakeClock(); syncPauseControl(); drawSnake();
}

function handleControl(value) { const map = { up:[0,-1], right:[1,0], down:[0,1], left:[-1,0] }; if (value === "pause") { toggleSnakePause(); return; } if (map[value]) queueSnakeTurn(map[value][0], map[value][1]); }
function handleKey(key) { const normalized = key.length === 1 ? key.toLowerCase() : key; if (normalized === "p" || key === " ") { toggleSnakePause(); return; } const map = { ArrowUp:"up", ArrowRight:"right", ArrowDown:"down", ArrowLeft:"left", w:"up", d:"right", s:"down", a:"left" }; if (map[normalized]) handleControl(map[normalized]); }

canvas.addEventListener("pointerdown", (event) => { if (!running || snakePaused) return; snakeSwipe = { pointerId:event.pointerId, x:event.clientX, y:event.clientY }; canvas.setPointerCapture?.(event.pointerId); });
canvas.addEventListener("pointermove", (event) => {
  if (!running || snakePaused) return;
  if (event.pointerType === 'mouse') { const rect = canvas.getBoundingClientRect(), layout = snakeLayout(); queueSnakeTurn((event.clientX - rect.left) * canvas.width / rect.width - (layout.originX + (snake[0].x + .5) * layout.cell), (event.clientY - rect.top) * canvas.height / rect.height - gameSceneTop() - (layout.originY + (snake[0].y + .5) * layout.cell)); }
  else if (snakeSwipe?.pointerId === event.pointerId) { const dx = event.clientX - snakeSwipe.x, dy = event.clientY - snakeSwipe.y; if (Math.hypot(dx,dy) > 12) queueSnakeTurn(dx,dy); }
});
canvas.addEventListener("pointerup", () => { snakeSwipe = null; });
canvas.addEventListener("pointercancel", () => { snakeSwipe = null; });

difficultyButtons.forEach((button) => button.addEventListener("click", () => { const value = button.dataset.snakeDifficulty; if (!running && !snakePaused) { applyDifficulty(value, false); return; } const now = performance.now(); if (pendingDifficulty !== value || now > pendingDifficultyUntil) { pendingDifficulty = value; pendingDifficultyUntil = now + 2500; setStatus("再次点击“" + difficultyProfiles[value].label + "”确认切换；当前巡游会重新开始。"); return; } pendingDifficulty = null; applyDifficulty(value, true); }));
controlModeButtons.forEach((button) => button.addEventListener("click", () => { const value = button.dataset.snakeControlMode; if (value !== "swipe" && value !== "buttons") return; snakeControlMode = value; syncSnakeControlMode(); }));
document.addEventListener("visibilitychange", () => { if (document.hidden && gameSessionState === "playing") toggleSnakePause(); });

onCampaignLevelChanged = () => { if (gameSessionState === 'stage-complete' || gameSessionState === 'won') return; applySnakeCampaignTuning(); if (!running && !snakePaused) { resetCampaignRandom(); previewSnake(); createSnakeObstacles(); refreshFoodPopulation(true); drawSnake(); } };
runtimeDebugActions = {
  legalAction: () => { queueSnakeTurn(0,-1); },
  previewCompletion: () => { snakeCompletionUntil = performance.now() + 1600; drawSnake(); },
  aimDiagonal: () => { queueSnakeTurn(1,-1); },
  sampleReachableFood: () => { let valid = true; const saved = foods.map(item => ({...item})); for (let index=0;index<100;index++) { foods=[]; placeFood(nextSnakeFoodKind()); const reachable=reachableSnakeCells(); valid = valid && foods.length===1 && reachable.has(snakeCellKey(food.x,food.y)) && !snake.some(cell => Math.round(cell.x)===food.x && Math.round(cell.y)===food.y); } foods=saved; selectNearestFood(); snakeFoodProbe={count:100,valid}; },
  pause: () => toggleSnakePause(), setSwipeMode: () => { snakeControlMode = "swipe"; syncSnakeControlMode(); }, setButtonMode: () => { snakeControlMode = "buttons"; syncSnakeControlMode(); },
};
runtimeDebugState = () => ({
  level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, levelName: currentSnakeBlueprint().name, chapter: currentSnakeBlueprint().chapter, pattern: currentSnakeBlueprint().pattern, layoutSignature: snakeLayoutSignature,
  mode: snakeMode, collected: forage.totalPicked, foodVariety: forage.totalKinds.length, forage: {...forage, kinds:[...forage.kinds], totalKinds:[...forage.totalKinds]}, foragePlan: {...foragePlan}, foods: foods.map(item => ({...item})),
  difficulty: activeDifficulty, score, target: foodTarget, length: snake.length, obstacleCount: snakeObstacles.length, grid: { columns:gridColumns, rows:gridRows }, stepDelay: Math.round(currentStepDelay()), rendering: "requestAnimationFrame-continuous",
  motionVersion: 2, steering: 'continuous-angle', camera: snakeLayout(), targetHeading: snakeTargetHeading, staticLayerCached: false, staticLayerRebuilds: snakeStaticRebuilds, interpolationMs: 0, estimatedFps: Math.round(1000 / Math.max(1, snakeFrameInterval)), renderedFrames: snakeRenderedFrames,
  wrapWalls: difficultyProfile.wrapWalls, selfCollision: difficultyProfile.selfCollision, assetRoles: ["head","body-straight","body-corner","tail","food","obstacle","eat","danger","complete"], head: snake[0], direction: { ...direction }, directionQueue: snakeDirectionQueue.map((value) => ({ ...value })),
  dangerNearHead: snakeDangerNearHead(), completionActive: performance.now() < snakeCompletionUntil, collision: collisionMarker, paused: snakePaused, controlMode: snakeControlMode, readyGraceActive: performance.now() < snakeReadyUntil,
  food: { ...food, reachable: reachableSnakeCells().has(snakeCellKey(food.x, food.y)) }, foodProbe: snakeFoodProbe, stats: { ...snakeStats },
});

installSnakeModes(); loadSnakeControlMode(); applySnakeCampaignTuning(); syncDifficultyUi(); previewSnake(); createSnakeObstacles(); refreshFoodPopulation(true); drawSnake(); requestAnimationFrame(snakeAnimationLoop);
`;
