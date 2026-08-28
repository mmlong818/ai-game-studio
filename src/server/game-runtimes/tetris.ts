export const tetrisScript = String.raw`
const columns = 10;
const rows = 20;
const board = Array.from({ length: rows }, () => Array(columns).fill(0));
const shapes = [
  [[1, 1, 1, 1]],
  [[1, 1], [1, 1]],
  [[0, 1, 0], [1, 1, 1]],
  [[1, 0, 0], [1, 1, 1]],
  [[0, 0, 1], [1, 1, 1]],
  [[0, 1, 1], [1, 1, 0]],
  [[1, 1, 0], [0, 1, 1]],
];
const blockColors = palette.pieces;
const tetrisCellGeometry = Object.freeze({
  inset: 3,
  radiusRatio: .15,
  textureScale: 1.34,
  outlineWidth: 2,
  axisAlignedCells: true,
  protrusion: 0,
});
let piece;
let nextPieceIndex = 0;
let heldPieceIndex = null;
let holdUsed = false;
let lines = 0;
let score = 0;
let hardDropScore = 0;
let clearedRows = [];
let clearFlashUntil = 0;
let tetrisMode = "standard";
let modeTimeLimit = 0;
let modeStartedAt = 0;
let tickId = null;
let lineTarget = 6;
let fallInterval = 570;

function rotateShape(shape) {
  return shape[0].map((_, index) => shape.map((row) => row[index]).reverse());
}

function collides(candidate, offsetX = piece.x, offsetY = piece.y) {
  return candidate.some((row, y) => row.some((value, x) => value && (
    offsetX + x < 0 || offsetX + x >= columns || offsetY + y >= rows ||
    (offsetY + y >= 0 && board[offsetY + y][offsetX + x])
  )));
}

function randomPieceIndex() {
  return Math.floor(campaignRandom() * shapes.length);
}

function spawnPiece(forcedIndex = null) {
  const shapeIndex = forcedIndex === null ? nextPieceIndex : forcedIndex;
  if (forcedIndex === null) nextPieceIndex = randomPieceIndex();
  piece = { shape: shapes[shapeIndex].map((row) => [...row]), x: 3, y: 0, color: shapeIndex + 1 };
  holdUsed = false;
  if (collides(piece.shape)) {
    if (tetrisMode === "zen") {
      board.splice(0, 4);
      while (board.length < rows) board.push(Array(columns).fill(0));
      setStatus("禅模式已柔和整理顶部空间，继续保持节奏。 ");
    } else showResult(false, "堆叠触顶", "光块已经抵达天际线，重新整理节奏再试一次。");
  }
}

function mergePiece() {
  piece.shape.forEach((row, y) => row.forEach((value, x) => {
    if (value && piece.y + y >= 0) board[piece.y + y][piece.x + x] = piece.color;
  }));
  navigator.vibrate?.(12);
  let cleared = 0;
  for (let y = rows - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) {
      board.splice(y, 1);
      board.unshift(Array(columns).fill(0));
      cleared += 1;
      y += 1;
    }
  }
  if (cleared) {
    clearedRows = [];
    for (let index = 0; index < cleared; index += 1) clearedRows.push(index);
    clearFlashUntil = performance.now() + 320;
    lines += cleared;
    score += [0, 100, 300, 500, 800][cleared] * Math.max(1, currentCampaignLevel().tier);
    setMetric(lines + " / " + lineTarget);
    playSound("success");
    if (lines >= lineTarget) {
      showResult(true, "天际线完成", "你用 " + lines + " 条消行建立了稳定结构。");
      return;
    }
  }
  spawnPiece();
}

function stepDown() {
  if (!running) return;
  if (tetrisMode === "timed" && performance.now() - modeStartedAt >= modeTimeLimit * 1000) {
    showResult(false, "限时结束", "本局完成 " + lines + " 条消行、得到 " + score + " 分。 ");
    return;
  }
  if (!collides(piece.shape, piece.x, piece.y + 1)) piece.y += 1;
  else mergePiece();
  drawTetris();
}

function movePiece(direction) {
  if (!running) return;
  if (!collides(piece.shape, piece.x + direction, piece.y)) {
    piece.x += direction;
    playSound("move");
  }
  drawTetris();
}

function rotatePiece() {
  if (!running) return;
  const rotated = rotateShape(piece.shape);
  if (!collides(rotated)) {
    piece.shape = rotated;
    playSound("move");
  }
  drawTetris();
}

function hardDrop() {
  if (!running) return;
  let distance = 0;
  while (!collides(piece.shape, piece.x, piece.y + 1)) { piece.y += 1; distance += 1; }
  hardDropScore += distance * 2;
  score += distance * 2;
  mergePiece();
  drawTetris();
}

function holdPiece() {
  if (!running || holdUsed) return;
  const currentIndex = piece.color - 1;
  const replacement = heldPieceIndex;
  heldPieceIndex = currentIndex;
  if (replacement === null) spawnPiece();
  else spawnPiece(replacement);
  holdUsed = true;
  playSound("move");
  drawTetris();
}

function connectedEdges(shape, x, y) {
  return {
    top: Boolean(shape[y - 1]?.[x]),
    right: Boolean(shape[y]?.[x + 1]),
    bottom: Boolean(shape[y + 1]?.[x]),
    left: Boolean(shape[y]?.[x - 1]),
  };
}

function boardEdges(x, y, colorIndex) {
  return {
    top: board[y - 1]?.[x] === colorIndex,
    right: board[y]?.[x + 1] === colorIndex,
    bottom: board[y + 1]?.[x] === colorIndex,
    left: board[y]?.[x - 1] === colorIndex,
  };
}

function drawBlock(x, y, colorIndex, size, originX, originY, _edges, options = {}) {
  const px = Math.round(originX + x * size);
  const py = Math.round(originY + y * size);
  const color = blockColors[colorIndex - 1] || palette.primary;
  const alpha = options.ghost ? .24 : 1;
  const inset = Math.min(tetrisCellGeometry.inset, size * .14);
  const blockX = px + inset;
  const blockY = py + inset;
  const blockSize = size - inset * 2;
  const radius = Math.max(2, Math.round(blockSize * tetrisCellGeometry.radiusRatio));
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(blockX, blockY, blockSize, blockSize, radius);
  ctx.fill();
  if (!options.ghost) {
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(blockX, blockY, blockSize, blockSize, radius);
    ctx.clip();
    drawBitmapSprite((colorIndex - 1) % 7, blockX, blockY, blockSize, blockSize, {
      fallback: color,
      fit: "cover",
      scale: tetrisCellGeometry.textureScale,
    });
    const shine = ctx.createLinearGradient(blockX, blockY, blockX + blockSize, blockY + blockSize);
    shine.addColorStop(0, "rgba(255,255,255,.18)");
    shine.addColorStop(.42, "rgba(255,255,255,.02)");
    shine.addColorStop(1, "rgba(40,20,50,.12)");
    ctx.fillStyle = shine;
    ctx.fillRect(blockX, blockY, blockSize, blockSize);
    ctx.restore();
  }
  ctx.strokeStyle = options.ghost ? "rgba(103,77,93,.42)" : "rgba(255,255,255,.82)";
  ctx.lineWidth = options.ghost ? 3 : tetrisCellGeometry.outlineWidth;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.roundRect(blockX, blockY, blockSize, blockSize, radius);
  ctx.stroke();
  ctx.restore();
}

function drawShape(shape, offsetX, offsetY, colorIndex, size, originX, originY, options = {}) {
  shape.forEach((row, y) => row.forEach((value, x) => {
    if (!value || offsetY + y < 0) return;
    drawBlock(offsetX + x, offsetY + y, colorIndex, size, originX, originY, connectedEdges(shape, x, y), options);
  }));
}

function drawMiniPiece(shapeIndex, x, y, label) {
  const shape = shapes[shapeIndex];
  const miniCell = 20;
  const shapeWidth = shape[0].length * miniCell;
  const shapeHeight = shape.length * miniCell;
  const shapeX = x + (124 - shapeWidth) / 2;
  const shapeY = y + 30 + (48 - shapeHeight) / 2;
  ctx.save();
  ctx.fillStyle = palette.textSoft; ctx.font = "700 18px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + 62, y + 20);
  shape.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    if (!value) return;
    drawBlock(columnIndex, rowIndex, shapeIndex + 1, miniCell, shapeX, shapeY, connectedEdges(shape, columnIndex, rowIndex));
  }));
  ctx.restore();
}

function landingY() {
  let y = piece.y;
  while (!collides(piece.shape, piece.x, y + 1)) y += 1;
  return y;
}

function drawTetris() {
  clearCanvas();
  const size = config.aspectRatio === "9:16" ? 50 : 29;
  const originX = (canvas.width - columns * size) / 2;
  const originY = config.aspectRatio === "9:16" ? 168 : (canvas.height - rows * size) / 2;
  if (config.aspectRatio === "9:16") {
    drawPlayfield(22, 26, 150, 112, { radius: 22, alpha: .76 });
    drawMiniPiece(nextPieceIndex, 35, 38, "下一个");
    drawPlayfield(548, 26, 150, 112, { radius: 22, alpha: .76 });
    if (heldPieceIndex === null) { ctx.fillStyle = palette.textSoft; ctx.font = "700 18px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText("暂存", 623, 62); }
    else drawMiniPiece(heldPieceIndex, 561, 38, "暂存");
    const timeText = tetrisMode === "timed" ? " · " + Math.max(0, Math.ceil(modeTimeLimit - (performance.now() - modeStartedAt) / 1000)) + "秒" : "";
    ctx.fillStyle = palette.text; ctx.font = "800 24px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText((tetrisMode === "standard" ? "标准" : tetrisMode === "timed" ? "限时" : "禅模式") + " · 得分 " + score + " · 等级 " + currentCampaignLevel().tier + timeText, 360, 102);
  }
  ctx.save();
  ctx.globalAlpha = .96;
  ctx.fillStyle = "rgba(255,250,245,.9)";
  ctx.strokeStyle = "rgba(247,137,128,.56)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(originX - 14, originY - 14, columns * size + 28, rows * size + 28, 22);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "rgba(99,73,88,.12)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= columns; x += 1) {
    ctx.beginPath(); ctx.moveTo(originX + x * size, originY); ctx.lineTo(originX + x * size, originY + rows * size); ctx.stroke();
  }
  for (let y = 0; y <= rows; y += 1) {
    ctx.beginPath(); ctx.moveTo(originX, originY + y * size); ctx.lineTo(originX + columns * size, originY + y * size); ctx.stroke();
  }
  board.forEach((row, y) => row.forEach((value, x) => {
    if (value) drawBlock(x, y, value, size, originX, originY, boardEdges(x, y, value));
  }));
  const dangerRow = board.findIndex((row) => row.some(Boolean));
  if (dangerRow >= 0 && dangerRow <= 4) {
    ctx.save(); ctx.fillStyle = "rgba(238,77,55,.16)"; ctx.fillRect(originX, originY, columns * size, size * 5); ctx.restore();
  }
  if (piece) {
    const ghostY = landingY();
    if (ghostY !== piece.y) drawShape(piece.shape, piece.x, ghostY, piece.color, size, originX, originY, { ghost: true });
    drawShape(piece.shape, piece.x, piece.y, piece.color, size, originX, originY);
  }
  if (clearFlashUntil > performance.now()) {
    ctx.save(); ctx.globalAlpha = (clearFlashUntil - performance.now()) / 320; ctx.fillStyle = palette.highlight;
    ctx.fillRect(originX, originY, columns * size, rows * size); ctx.restore(); requestAnimationFrame(drawTetris);
  }
  finishCanvasStyle();
}

function startGame() {
  resetCampaignRandom();
  const baseTarget = config.difficulty === "relaxed" ? 4 : config.difficulty === "challenging" ? 8 : 6;
  const baseInterval = config.difficulty === "relaxed" ? 820 : config.difficulty === "challenging" ? 460 : 620;
  lineTarget = Math.max(3, Math.round(baseTarget * campaignScale("goalMultiplier")));
  fallInterval = Math.max(210, Math.round(baseInterval / campaignScale("speedMultiplier")));
  if (tetrisMode === "timed") {
    lineTarget = Math.max(3, lineTarget - 1);
    fallInterval = Math.max(190, Math.round(fallInterval * .86));
    modeTimeLimit = config.difficulty === "relaxed" ? 110 : config.difficulty === "challenging" ? 70 : 90;
  } else if (tetrisMode === "zen") {
    lineTarget += 2;
    fallInterval = Math.round(fallInterval * 1.12);
    modeTimeLimit = 0;
  } else modeTimeLimit = 0;
  modeStartedAt = performance.now();
  board.forEach((row) => row.fill(0));
  lines = 0;
  score = 0;
  hardDropScore = 0;
  heldPieceIndex = null;
  holdUsed = false;
  nextPieceIndex = randomPieceIndex();
  running = true;
  hideOverlay();
  setMetric("0 / " + lineTarget);
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + currentCampaignLevel().ruleModifier + "；完成 " + lineTarget + " 条消行。");
  spawnPiece();
  if (tickId) clearInterval(tickId);
  tickId = setInterval(stepDown, fallInterval);
  startAmbient();
  drawTetris();
}

function handleControl(value) {
  if (value === "left") movePiece(-1);
  if (value === "right") movePiece(1);
  if (value === "down") stepDown();
  if (value === "rotate") rotatePiece();
  if (value === "hold") holdPiece();
  if (value === "drop") hardDrop();
}

function handleKey(key) {
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowDown: "down", ArrowUp: "rotate", " ": "drop", c: "hold", C: "hold" };
  if (map[key]) handleControl(map[key]);
}

let tetrisSwipeStart = null;
canvas.addEventListener("pointerdown", (event) => { tetrisSwipeStart = { x: event.clientX, y: event.clientY, at: performance.now() }; });
canvas.addEventListener("pointerup", (event) => {
  if (!tetrisSwipeStart || !running) return;
  const dx = event.clientX - tetrisSwipeStart.x;
  const dy = event.clientY - tetrisSwipeStart.y;
  const elapsed = performance.now() - tetrisSwipeStart.at;
  tetrisSwipeStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { rotatePiece(); return; }
  if (Math.abs(dx) > Math.abs(dy)) movePiece(dx > 0 ? 1 : -1);
  else if (dy > 0 && (Math.abs(dy) > 70 || elapsed < 220)) hardDrop();
  else if (dy > 0) stepDown();
});
function setTetrisMode(mode) {
  tetrisMode = ["standard", "timed", "zen"].includes(mode) ? mode : "standard";
  document.querySelectorAll("[data-tetris-mode]").forEach((candidate) => {
    const selected = candidate.dataset.tetrisMode === tetrisMode;
    candidate.classList.toggle("is-selected", selected);
    candidate.setAttribute("aria-pressed", String(selected));
  });
  if (running) startGame();
}
document.querySelectorAll("[data-tetris-mode]").forEach((button) => button.addEventListener("click", () => setTetrisMode(button.dataset.tetrisMode)));
runtimeDebugState = () => {
  const dangerRow = board.findIndex((row) => row.some(Boolean));
  return { level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, mode: tetrisMode, modes: ["standard", "timed", "zen"], modeTimeLimit, lineTarget, lines, fallInterval, score, hardDropScore, nextPieceIndex, heldPieceIndex, holdUsed, dangerHeight: dangerRow >= 0 && dangerRow <= 4, clearFeedbackMs: Math.max(0, clearFlashUntil - performance.now()), gestureSupport: true, cellGeometry: { ...tetrisCellGeometry } };
};
runtimeDebugActions = { legalAction: hardDrop, hold: holdPiece, setStandardMode() { setTetrisMode("standard"); }, setTimedMode() { setTetrisMode("timed"); }, setZenMode() { setTetrisMode("zen"); }, clearLinePreview() { clearFlashUntil = performance.now() + 320; drawTetris(); } };
drawTetris();
`;
