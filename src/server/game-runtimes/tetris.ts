export const tetrisScript = String.raw`
const columns = 10;
const rows = 20;
const board = Array.from({ length: rows }, () => Array(columns).fill(0));
const pieceNames = ["I", "O", "T", "J", "L", "S", "Z"];
const rotationStates = [
  [
    [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
    [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
    [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
  ],
  [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  [
    [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 1, 0]],
    [[0, 1, 0], [1, 1, 0], [0, 1, 0]],
  ],
  [
    [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 1], [0, 1, 0], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 1], [0, 0, 1]],
    [[0, 1, 0], [0, 1, 0], [1, 1, 0]],
  ],
  [
    [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 0], [0, 1, 1]],
    [[0, 0, 0], [1, 1, 1], [1, 0, 0]],
    [[1, 1, 0], [0, 1, 0], [0, 1, 0]],
  ],
  [
    [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    [[0, 1, 0], [0, 1, 1], [0, 0, 1]],
    [[0, 0, 0], [0, 1, 1], [1, 1, 0]],
    [[1, 0, 0], [1, 1, 0], [0, 1, 0]],
  ],
  [
    [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    [[0, 0, 1], [0, 1, 1], [0, 1, 0]],
    [[0, 0, 0], [1, 1, 0], [0, 1, 1]],
    [[0, 1, 0], [1, 1, 0], [1, 0, 0]],
  ],
];
const shapes = rotationStates.map((states) => states[0]);
const jlstzKickTests = {
  "0>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "1>0": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "1>2": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "2>1": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "2>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "3>2": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "3>0": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "0>3": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};
const iKickTests = {
  "0>1": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "1>0": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "1>2": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "2>1": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "2>3": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "3>2": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "3>0": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "0>3": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};
const blockColors = palette.pieces;
const tetrisCellGeometry = Object.freeze({
  inset: 2,
  radiusRatio: .15,
  textureScale: 1.46,
  outlineWidth: 2.5,
  axisAlignedCells: true,
  protrusion: 0,
});
let piece;
let nextPieceIndex = 0;
let pieceQueue = [];
let heldPieceIndex = null;
let holdUsed = false;
let lines = 0;
let score = 0;
let hardDropScore = 0;
let softDropScore = 0;
let combo = -1;
let backToBack = false;
let lastClearLabel = "";
let lastClearPoints = 0;
let lastActionWasRotation = false;
let clearedRows = [];
let clearFlashUntil = 0;
let tetrisMode = "standard";
let modeTimeLimit = 0;
let modeStartedAt = 0;
let tickId = null;
let lockTimerId = null;
let lockResetCount = 0;
let pieceSerial = 0;
let lineTarget = 6;
let fallInterval = 570;
const lockDelayMs = 500;
const maxLockResets = 15;

function collides(candidate, offsetX = piece.x, offsetY = piece.y) {
  return candidate.some((row, y) => row.some((value, x) => value && (
    offsetX + x < 0 || offsetX + x >= columns || offsetY + y >= rows ||
    (offsetY + y >= 0 && board[offsetY + y][offsetX + x])
  )));
}

function randomPieceIndex() {
  fillPieceQueue();
  const index = pieceQueue.shift();
  fillPieceQueue();
  return index;
}

function createSevenBag() {
  const bag = pieceNames.map((_, index) => index);
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(campaignRandom() * (index + 1));
    [bag[index], bag[swapIndex]] = [bag[swapIndex], bag[index]];
  }
  return bag;
}

function fillPieceQueue() {
  while (pieceQueue.length < 7) pieceQueue.push(...createSevenBag());
}

function clearLockTimer() {
  if (lockTimerId) clearTimeout(lockTimerId);
  lockTimerId = null;
}

function scheduleLock() {
  if (lockTimerId || !running) return;
  const serial = piece.serial;
  lockTimerId = setTimeout(() => {
    lockTimerId = null;
    if (!running || piece.serial !== serial || !collides(piece.shape, piece.x, piece.y + 1)) return;
    mergePiece();
    drawTetris();
  }, lockDelayMs);
}

function refreshLockDelay() {
  if (!collides(piece.shape, piece.x, piece.y + 1)) {
    clearLockTimer();
    return;
  }
  if (lockResetCount >= maxLockResets) return;
  lockResetCount += 1;
  clearLockTimer();
  scheduleLock();
}

function spawnPiece(forcedIndex = null) {
  clearLockTimer();
  const shapeIndex = forcedIndex === null ? randomPieceIndex() : forcedIndex;
  fillPieceQueue();
  nextPieceIndex = pieceQueue[0];
  piece = { shapeIndex, rotation: 0, shape: rotationStates[shapeIndex][0].map((row) => [...row]), x: 3, y: 0, color: shapeIndex + 1, serial: ++pieceSerial };
  holdUsed = false;
  lockResetCount = 0;
  lastActionWasRotation = false;
  if (collides(piece.shape)) {
    if (tetrisMode === "zen") {
      board.splice(0, 4);
      while (board.length < rows) board.push(Array(columns).fill(0));
      setStatus("禅模式已柔和整理顶部空间，继续保持节奏。 ");
    } else showResult(false, "堆叠触顶", "光块已经抵达天际线，重新整理节奏再试一次。");
  }
}

function tSpinDetected() {
  if (piece.shapeIndex !== 2 || !lastActionWasRotation) return false;
  const pivotX = piece.x + 1;
  const pivotY = piece.y + 1;
  const corners = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
  const occupied = corners.filter(([dx, dy]) => {
    const x = pivotX + dx;
    const y = pivotY + dy;
    return x < 0 || x >= columns || y >= rows || (y >= 0 && board[y][x]);
  }).length;
  return occupied >= 3;
}

function scoreLineClear(cleared, tSpin, perfectClear) {
  const level = Math.max(1, currentCampaignLevel().tier);
  const lineBase = [0, 100, 300, 500, 800][cleared] || 0;
  const tSpinBase = [400, 800, 1200, 1600][cleared] || 0;
  const difficult = cleared === 4 || (tSpin && cleared > 0);
  const wasBackToBack = backToBack;
  combo = cleared > 0 ? combo + 1 : -1;
  let points = (tSpin ? tSpinBase : lineBase) * level;
  if (difficult && wasBackToBack) points = Math.round(points * 1.5);
  if (cleared > 0 && combo > 0) points += 50 * combo * level;
  if (perfectClear && cleared > 0) points += ([0, 800, 1200, 1800, 2000][cleared] || 0) * level;
  if (difficult) backToBack = true;
  else if (cleared > 0) backToBack = false;
  if (cleared > 0 || tSpin) {
    const clearNames = ["", "单消", "双消", "三消", "四线消除"];
    lastClearLabel = (tSpin ? "T 旋 · " : "") + clearNames[cleared] + (wasBackToBack && difficult ? " · 背靠背" : "") + (combo > 0 ? " · 连消 ×" + (combo + 1) : "") + (perfectClear ? " · 全清" : "");
    lastClearPoints = points;
  } else {
    lastClearLabel = "";
    lastClearPoints = 0;
  }
  return points;
}

function mergePiece() {
  clearLockTimer();
  const tSpin = tSpinDetected();
  piece.shape.forEach((row, y) => row.forEach((value, x) => {
    if (value && piece.y + y >= 0) board[piece.y + y][piece.x + x] = piece.color;
  }));
  navigator.vibrate?.(12);
  const completedRows = [];
  for (let y = rows - 1; y >= 0; y -= 1) {
    if (board[y].every(Boolean)) completedRows.push(y);
  }
  completedRows.forEach((rowIndex) => board.splice(rowIndex, 1));
  for (let index = 0; index < completedRows.length; index += 1) board.unshift(Array(columns).fill(0));
  const cleared = completedRows.length;
  const perfectClear = cleared > 0 && board.every((row) => row.every((value) => !value));
  score += scoreLineClear(cleared, tSpin, perfectClear);
  if (cleared) {
    clearedRows = completedRows;
    clearFlashUntil = performance.now() + 320;
    lines += cleared;
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
  if (!collides(piece.shape, piece.x, piece.y + 1)) {
    piece.y += 1;
    lastActionWasRotation = false;
    clearLockTimer();
  } else scheduleLock();
  drawTetris();
}

function softDrop() {
  if (!running) return;
  if (!collides(piece.shape, piece.x, piece.y + 1)) {
    piece.y += 1;
    softDropScore += 1;
    score += 1;
    lastActionWasRotation = false;
    clearLockTimer();
  } else scheduleLock();
  drawTetris();
}

function movePiece(direction) {
  if (!running) return;
  if (!collides(piece.shape, piece.x + direction, piece.y)) {
    piece.x += direction;
    lastActionWasRotation = false;
    refreshLockDelay();
    playSound("move");
  }
  drawTetris();
}

function rotatePiece() {
  if (!running) return;
  const from = piece.rotation;
  const to = (from + 1) % 4;
  const rotated = rotationStates[piece.shapeIndex][to];
  const table = piece.shapeIndex === 0 ? iKickTests : piece.shapeIndex === 1 ? { [from + ">" + to]: [[0, 0]] } : jlstzKickTests;
  const tests = table[from + ">" + to] || [[0, 0]];
  const kick = tests.find(([dx, dy]) => !collides(rotated, piece.x + dx, piece.y + dy));
  if (kick) {
    piece.rotation = to;
    piece.shape = rotated.map((row) => [...row]);
    piece.x += kick[0];
    piece.y += kick[1];
    lastActionWasRotation = true;
    refreshLockDelay();
    playSound("move");
  }
  drawTetris();
}

function hardDrop() {
  if (!running) return;
  let distance = 0;
  while (!collides(piece.shape, piece.x, piece.y + 1)) { piece.y += 1; distance += 1; }
  if (distance > 0) lastActionWasRotation = false;
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
  if (!options.ghost) {
    ctx.shadowColor = "rgba(14,8,22,.46)";
    ctx.shadowBlur = Math.max(4, size * .12);
    ctx.shadowOffsetY = Math.max(2, size * .05);
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(blockX, blockY, blockSize, blockSize, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";
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
  ctx.strokeStyle = options.ghost ? "rgba(255,202,222,.66)" : "rgba(255,255,255,.9)";
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

function drawMiniPiece(shapeIndex, x, y, label = "", options = {}) {
  const shape = shapes[shapeIndex];
  const miniCell = options.cell || 20;
  const slotWidth = options.width || 124;
  const slotHeight = options.height || 78;
  const cells = [];
  shape.forEach((row, rowIndex) => row.forEach((value, columnIndex) => { if (value) cells.push([columnIndex, rowIndex]); }));
  const minX = Math.min(...cells.map(([column]) => column));
  const maxX = Math.max(...cells.map(([column]) => column));
  const minY = Math.min(...cells.map(([, row]) => row));
  const maxY = Math.max(...cells.map(([, row]) => row));
  const labelHeight = label ? 25 : 0;
  const shapeWidth = (maxX - minX + 1) * miniCell;
  const shapeHeight = (maxY - minY + 1) * miniCell;
  const shapeX = x + (slotWidth - shapeWidth) / 2 - minX * miniCell;
  const shapeY = y + labelHeight + (slotHeight - labelHeight - shapeHeight) / 2 - minY * miniCell;
  ctx.save();
  if (label) {
    ctx.fillStyle = palette.textSoft; ctx.font = "700 16px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + slotWidth / 2, y + 17);
  }
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
    drawPlayfield(18, 26, 132, 118, { radius: 22, alpha: .76 });
    if (heldPieceIndex === null) {
      ctx.fillStyle = palette.textSoft; ctx.font = "700 16px Inter, sans-serif"; ctx.textAlign = "center"; ctx.fillText("暂存", 84, 52); ctx.font = "800 25px Inter, sans-serif"; ctx.fillText("—", 84, 103);
    } else drawMiniPiece(heldPieceIndex, 22, 37, "暂存", { width: 124, height: 96, cell: 18 });
    drawPlayfield(160, 26, 398, 118, { radius: 22, alpha: .76 });
    ctx.fillStyle = palette.textSoft; ctx.font = "750 15px Inter, sans-serif"; ctx.textAlign = "left";
    ctx.fillText((tetrisMode === "standard" ? "旅程" : tetrisMode === "timed" ? "限时" : "禅模式") + " · 接下来 5 枚", 178, 49);
    pieceQueue.slice(0, 5).forEach((shapeIndex, index) => drawMiniPiece(shapeIndex, 169 + index * 76, 57, "", { width: 72, height: 60, cell: 12 }));
    if (lastClearLabel) {
      ctx.fillStyle = palette.highlight; ctx.font = "800 13px Inter, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(lastClearLabel + "  +" + lastClearPoints, 359, 135, 365);
    }
    drawPlayfield(568, 26, 134, 118, { radius: 22, alpha: .76 });
    const timeText = tetrisMode === "timed" ? " · " + Math.max(0, Math.ceil(modeTimeLimit - (performance.now() - modeStartedAt) / 1000)) + "秒" : "";
    ctx.textAlign = "center"; ctx.fillStyle = palette.textSoft; ctx.font = "700 13px Inter, sans-serif"; ctx.fillText("得分", 635, 48);
    ctx.fillStyle = palette.text; ctx.font = "850 21px Inter, sans-serif"; ctx.fillText(String(score), 635, 72, 118);
    ctx.fillStyle = palette.textSoft; ctx.font = "700 13px Inter, sans-serif"; ctx.fillText(lines + "/" + lineTarget + " 行 · Lv." + currentCampaignLevel().tier, 635, 99);
    ctx.fillStyle = backToBack ? palette.highlight : palette.textSoft; ctx.font = "750 12px Inter, sans-serif";
    ctx.fillText((combo > 0 ? "连消 ×" + (combo + 1) : "连消待续") + timeText, 635, 125, 120);
  }
  ctx.save();
  ctx.globalAlpha = .96;
  ctx.fillStyle = "rgba(29,25,38,.96)";
  ctx.strokeStyle = "rgba(255,157,188,.72)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(originX - 14, originY - 14, columns * size + 28, rows * size + 28, 22);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,238,246,.12)";
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
    clearedRows.forEach((row) => ctx.fillRect(originX, originY + row * size, columns * size, size));
    ctx.restore(); requestAnimationFrame(drawTetris);
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
  softDropScore = 0;
  combo = -1;
  backToBack = false;
  lastClearLabel = "";
  lastClearPoints = 0;
  pieceQueue = [];
  heldPieceIndex = null;
  holdUsed = false;
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
  if (value === "down") softDrop();
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
  else if (dy > 0) softDrop();
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
  return { level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, mode: tetrisMode, modes: ["standard", "timed", "zen"], modeTimeLimit, lineTarget, lines, fallInterval, score, hardDropScore, softDropScore, combo, backToBack, lastClearLabel, lastClearPoints, nextPieceIndex, nextQueue: pieceQueue.slice(0, 5), heldPieceIndex, holdUsed, currentPiece: piece ? { shapeIndex: piece.shapeIndex, rotation: piece.rotation, x: piece.x, y: piece.y } : null, dangerHeight: dangerRow >= 0 && dangerRow <= 4, clearFeedbackMs: Math.max(0, clearFlashUntil - performance.now()), gestureSupport: true, sevenBagRandomizer: true, rotationSystem: "SRS-clockwise", lockDelayMs, maxLockResets, cellGeometry: { ...tetrisCellGeometry } };
};
runtimeDebugActions = {
  legalAction: hardDrop,
  softDrop: softDrop,
  hold: holdPiece,
  prepareWallKick() {
    board.forEach((row) => row.fill(0));
    clearLockTimer();
    piece = { shapeIndex: 0, rotation: 1, shape: rotationStates[0][1].map((row) => [...row]), x: -2, y: 4, color: 1, serial: ++pieceSerial };
    rotatePiece();
  },
  setStandardMode() { setTetrisMode("standard"); },
  setTimedMode() { setTetrisMode("timed"); },
  setZenMode() { setTetrisMode("zen"); },
  clearLinePreview() { clearedRows = [17, 18, 19]; clearFlashUntil = performance.now() + 320; drawTetris(); },
};
drawTetris();
`;
