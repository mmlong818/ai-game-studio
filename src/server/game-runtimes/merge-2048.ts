// 玩法结构移植自 Gabriele Cirulli 的 2048（MIT）。本文件使用本平台运行时接口重新实现，未复制上游视听资产。
export const merge2048Script = String.raw`
const boardSize = 4;
let board2048 = [];
let mergeScore = 0;
let bestTile = 2;
let lastMergedValue = 0;
let mergeFlashUntil = 0;
let mergeTarget = 256;
let mergeHistory = null;
let historicalBest = 0;
let lastSpawn = null;
let spawnAt = 0;
let lastMoveDirection = "";

function readHistoricalBest() {
  try { return Math.max(0, Number(safeStorage.getItem(config.campaignStorageKey + ":2048-best")) || 0); } catch { return 0; }
}

function writeHistoricalBest() {
  historicalBest = Math.max(historicalBest, mergeScore);
  try { safeStorage.setItem(config.campaignStorageKey + ":2048-best", String(historicalBest)); } catch {}
}

function applyMergeCampaignLevel() {
  const basePower = config.difficulty === "relaxed" ? 7 : config.difficulty === "challenging" ? 9 : 8;
  mergeTarget = 2 ** (basePower + currentCampaignLevel().tier - 1);
}

function emptyBoard() {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
}

function availableCells() {
  const cells = [];
  for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
    if (board2048[row][column] === 0) cells.push({ row, column });
  }
  return cells;
}

function spawnNumber() {
  const cells = availableCells();
  if (!cells.length) return;
  const cell = cells[Math.floor(campaignRandom() * cells.length)];
  const fourChance = (config.difficulty === "challenging" ? .18 : .1) + (currentCampaignLevel().tier - 1) * .012;
  board2048[cell.row][cell.column] = campaignRandom() < fourChance ? 4 : 2;
  lastSpawn = { row: cell.row, column: cell.column };
  spawnAt = performance.now();
}

function snapshotMergeBoard() {
  return { board: board2048.map((row) => [...row]), score: mergeScore, bestTile };
}

function undoMergeMove() {
  if (!running || !mergeHistory) return;
  board2048 = mergeHistory.board.map((row) => [...row]);
  mergeScore = mergeHistory.score;
  bestTile = mergeHistory.bestTile;
  mergeHistory = null;
  lastMergedValue = 0;
  setMetric(bestTile + " / " + mergeTarget);
  setStatus("已撤销一步 · 本局分数 " + mergeScore + " · 历史最佳 " + historicalBest + "。 ");
  playSound("move");
  drawMergeBoard();
}

function mergeLine(values) {
  const compact = values.filter(Boolean);
  const merged = new Set();
  for (let index = 0; index < compact.length - 1; index += 1) {
    if (compact[index] !== compact[index + 1] || merged.has(index)) continue;
    compact[index] *= 2;
    mergeScore += compact[index];
    bestTile = Math.max(bestTile, compact[index]);
    lastMergedValue = compact[index];
    compact.splice(index + 1, 1);
    merged.add(index);
  }
  while (compact.length < boardSize) compact.push(0);
  return compact;
}

function moveBoard(direction) {
  if (!running) return;
  const before = JSON.stringify(board2048);
  const beforeSnapshot = snapshotMergeBoard();
  const scoreBeforeMove = mergeScore;
  lastMergedValue = 0;
  for (let index = 0; index < boardSize; index += 1) {
    let line = direction === "left" || direction === "right"
      ? [...board2048[index]]
      : board2048.map((row) => row[index]);
    if (direction === "right" || direction === "down") line.reverse();
    line = mergeLine(line);
    if (direction === "right" || direction === "down") line.reverse();
    if (direction === "left" || direction === "right") board2048[index] = line;
    else line.forEach((value, row) => { board2048[row][index] = value; });
  }
  if (before === JSON.stringify(board2048)) return;
  mergeHistory = beforeSnapshot;
  lastMoveDirection = direction;
  if (mergeScore > scoreBeforeMove) mergeFlashUntil = performance.now() + 260;
  playSound("move");
  if (bestTile >= mergeTarget) {
    drawMergeBoard();
    setMetric(bestTile + " / " + mergeTarget);
    showResult(true, "矩阵完成", "你合成了 " + bestTile + "，并以 " + mergeScore + " 分稳定了棋盘。");
    return;
  }
  spawnNumber();
  writeHistoricalBest();
  drawMergeBoard();
  setMetric(bestTile + " / " + mergeTarget);
  const danger = availableCells().length <= 2;
  setStatus("分数 " + mergeScore + " · 历史最佳 " + historicalBest + (danger ? " · 危险：只剩 " + availableCells().length + " 个空位。" : " · 保留空位，避免棋盘被锁死。"));
  if (!hasAvailableMove()) showResult(false, "矩阵锁死", "棋盘已没有可移动方向，最高数字为 " + bestTile + "。");
}

function hasAvailableMove() {
  if (availableCells().length) return true;
  for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
    const value = board2048[row][column];
    if (row + 1 < boardSize && board2048[row + 1][column] === value) return true;
    if (column + 1 < boardSize && board2048[row][column + 1] === value) return true;
  }
  return false;
}

function tileColor(value) {
  const level = value ? Math.round(Math.log2(value)) : 0;
  return value ? palette.pieces[(level - 1) % palette.pieces.length] : palette.surfaceSoft;
}

function tileFontSize(value) {
  if (value >= 16384) return 31;
  if (value >= 1024) return 37;
  if (value >= 128) return 44;
  if (value >= 16) return 51;
  return 58;
}

function drawTileNumber(value, x, y, size) {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.font = "850 " + tileFontSize(value) + "px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.strokeStyle = "rgba(255, 252, 242, .88)";
  ctx.lineWidth = value >= 1024 ? 5 : 7;
  ctx.strokeText(String(value), x + size / 2, y + size / 2 + 2);
  ctx.fillStyle = "#2a2522";
  ctx.shadowColor = "rgba(255, 255, 255, .65)";
  ctx.shadowBlur = 2;
  ctx.fillText(String(value), x + size / 2, y + size / 2 + 2);
  ctx.restore();
}

function mergeLayout() {
  const portrait = config.aspectRatio === "9:16";
  const frameSize = portrait ? 660 : 596;
  return {
    portrait,
    frameSize,
    originX: (720 - frameSize) / 2,
    originY: (gameSceneHeight() - frameSize) / 2,
  };
}

function drawMergeBoard() {
  clearCanvas();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const layout = mergeLayout();
  if (layout.portrait) {
    drawPlayfield(42, 72, 636, 150, { radius: 28, alpha: .82 });
    drawBitmapSprite(7, 70, 94, 106, 106, { fallback: palette.primary, radius: 22, padding: 8 });
    ctx.fillStyle = palette.textSoft;
    ctx.textAlign = "left";
    ctx.font = "600 25px Inter, sans-serif";
    ctx.fillText("本局目标", 204, 124);
    ctx.fillStyle = palette.text;
    ctx.font = "800 58px Inter, sans-serif";
    ctx.fillText(String(mergeTarget), 204, 184);
    drawPlayfield(42, gameSceneHeight() - 222, 636, 150, { radius: 28, alpha: .78 });
    ctx.textAlign = "center";
    ctx.fillStyle = palette.text;
    ctx.font = "700 25px Inter, sans-serif";
    ctx.fillText("滑动合并 · 保留空位 · 守住最大数", 360, gameSceneHeight() - 154);
    ctx.fillStyle = palette.textSoft;
    ctx.font = "500 21px Inter, sans-serif";
    ctx.fillText("当前 " + mergeScore + " · 最佳 " + historicalBest + " · " + availableCells().length + " 空位", 360, gameSceneHeight() - 112);
  }
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(layout.originX, layout.originY, layout.frameSize, layout.frameSize, 34);
  ctx.fillStyle = "rgba(24, 29, 43, .56)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 252, 241, .72)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  const gap = layout.portrait ? 14 : 13;
  const innerSize = layout.frameSize - 16;
  const cell = (innerSize - gap * 5) / boardSize;
  const now = performance.now();
  const mergeFlash = Math.max(0, Math.min(1, (mergeFlashUntil - now) / 260));
  for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
    const value = board2048[row][column];
    const x = layout.originX + 8 + gap + column * (cell + gap);
    const y = layout.originY + 8 + gap + row * (cell + gap);
    const level = value ? Math.round(Math.log2(value)) : 0;
    const sprite = value ? 1 + ((level - 1) % 6) : 0;
    drawBitmapSprite(sprite, x, y, cell, cell, {
      fallback: tileColor(value),
      radius: 24,
      padding: 0,
      scale: value ? 1.28 : 1.22,
      alpha: value ? 1 : .42,
    });
    if (lastSpawn && lastSpawn.row === row && lastSpawn.column === column && performance.now() - spawnAt < 300) {
      const spawnProgress = Math.min(1, (performance.now() - spawnAt) / 300);
      ctx.save(); ctx.globalAlpha = 1 - spawnProgress; ctx.strokeStyle = palette.highlight; ctx.lineWidth = 8 - spawnProgress * 5;
      ctx.beginPath(); ctx.roundRect(x - 4, y - 4, cell + 8, cell + 8, 27); ctx.stroke(); ctx.restore();
    }
    if (mergeFlash > 0 && value === lastMergedValue) {
      const effectScale = 1.04 + Math.sin((1 - mergeFlash) * Math.PI) * .16;
      const effectSize = cell * effectScale;
      drawBitmapSprite(7, x + (cell - effectSize) / 2, y + (cell - effectSize) / 2, effectSize, effectSize, {
        fallback: palette.highlight,
        padding: 0,
        scale: 1.12,
        alpha: .28 + mergeFlash * .46,
      });
    }
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, cell - 6, cell - 6, 22);
    ctx.strokeStyle = value === bestTile && value > 2 ? "rgba(255, 249, 218, .96)" : "rgba(255, 255, 255, .22)";
    ctx.lineWidth = value === bestTile && value > 2 ? 3 : 1;
    ctx.stroke();
    ctx.restore();
    if (!value) continue;
    drawTileNumber(value, x, y, cell);
  }
  ctx.restore();
  finishCanvasStyle();
  if (mergeFlashUntil > performance.now() || performance.now() - spawnAt < 300) requestAnimationFrame(drawMergeBoard);
}

function startGame() {
  resetCampaignRandom();
  applyMergeCampaignLevel();
  board2048 = emptyBoard();
  mergeScore = 0;
  bestTile = 2;
  lastMergedValue = 0;
  mergeFlashUntil = 0;
  mergeHistory = null;
  historicalBest = readHistoricalBest();
  lastSpawn = null;
  lastMoveDirection = "";
  spawnNumber();
  spawnNumber();
  running = true;
  hideOverlay();
  setMetric("2 / " + mergeTarget);
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + currentCampaignLevel().ruleModifier + "；合成目标 " + mergeTarget + "。");
  startAmbient();
  drawMergeBoard();
}

function handleControl(value) {
  if (["up", "right", "down", "left"].includes(value)) moveBoard(value);
  if (value === "undo") undoMergeMove();
}

function handleKey(key) {
  const map = { ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left", w: "up", d: "right", s: "down", a: "left", z: "undo", Z: "undo" };
  if (map[key]) handleControl(map[key]);
}

let swipeStart = null;
canvas.addEventListener("pointerdown", (event) => { swipeStart = { x: event.clientX, y: event.clientY }; });
canvas.addEventListener("pointerup", (event) => {
  if (!swipeStart) return;
  const dx = event.clientX - swipeStart.x;
  const dy = event.clientY - swipeStart.y;
  swipeStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
  handleControl(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
});

onCampaignLevelChanged = () => {
  applyMergeCampaignLevel();
  if (!running) drawMergeBoard();
};
runtimeDebugState = () => ({ level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, target: mergeTarget, bestTile, score: mergeScore, historicalBest, availableCells: availableCells().length, danger: availableCells().length <= 2, canUndo: Boolean(mergeHistory), lastMoveDirection, spawnAnimated: performance.now() - spawnAt < 300 });
runtimeDebugActions = {
  undo: undoMergeMove,
  prepareMerge() {
    board2048 = emptyBoard(); board2048[3][0] = 2; board2048[3][1] = 2; mergeScore = 0; bestTile = 2; mergeHistory = null; drawMergeBoard();
  },
  prepareDanger() {
    board2048 = [[2,4,8,16],[4,8,16,32],[8,16,32,64],[16,32,0,0]]; bestTile = 64; drawMergeBoard();
  },
};

board2048 = emptyBoard();
board2048[1][1] = 2;
board2048[2][2] = 2;
drawMergeBoard();
`;
