// 核心规则移植自 mkgame-blocks（MIT）；品牌、界面、图像和声音均为本平台原创。
export const blockPlaceScript = String.raw`
const blockBoardSize = 8;
const blockDifficulty = {
  relaxed: { target: 120, hardShapeRate: .08, comboGrace: 4 },
  standard: { target: 220, hardShapeRate: .24, comboGrace: 3 },
  challenging: { target: 360, hardShapeRate: .42, comboGrace: 2 },
}[config.difficulty];
let blockTarget = blockDifficulty.target;
let blockHardShapeRate = blockDifficulty.hardShapeRate;
let blockComboGrace = blockDifficulty.comboGrace;
const blockShapes = [
  [[0,0]], [[0,0],[0,1]], [[0,0],[1,0]],
  [[0,0],[0,1],[0,2]], [[0,0],[1,0],[2,0]],
  [[0,0],[0,1],[1,0]], [[0,0],[0,1],[1,1]],
  [[0,0],[0,1],[1,0],[1,1]], [[0,0],[0,1],[0,2],[1,1]],
  [[0,0],[0,1],[0,2],[0,3]], [[0,0],[1,0],[2,0],[3,0]],
  [[0,0],[0,1],[1,1],[1,2]],
];
let blockBoard = [];
let blockPieces = [];
let selectedBlockPiece = 0;
let blockScore = 0;
let blockCombo = 0;
let blockDryMoves = 0;
let blockGeneration = 0;
let blockSeed = 0x4d595df4;
let blockClearEffect = null;
let blockHint = null;
let blockDragPreview = null;
let blockBatchGuaranteed = true;
const blockPieceStyles = [
  { plate: "#ffe2dd", outline: "#a73a30" },
  { plate: "#fff1b8", outline: "#805b00" },
  { plate: "#d9f7e9", outline: "#0b6b53" },
  { plate: "#e0ecff", outline: "#285ea8" },
  { plate: "#ffe5ca", outline: "#99480f" },
];

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function createBlockBoard() {
  return Array.from({ length: blockBoardSize }, () => Array(blockBoardSize).fill(0));
}

function generateBlockPieces() {
  blockGeneration += 1;
  const random = createSeededRandom((blockSeed + blockGeneration * 0x9e3779b1) >>> 0);
  const safeShapes = blockShapes.slice(0, 8);
  const hardShapes = blockShapes.slice(8);
  for (let attempt = 0; attempt < 14; attempt += 1) {
    const batch = Array.from({ length: 3 }, (_, index) => {
      const pool = random() < blockHardShapeRate ? hardShapes : safeShapes;
      const cells = pool[Math.floor(random() * pool.length)];
      return { id: blockGeneration + "-" + attempt + "-" + index, cells, sprite: Math.floor(random() * 5), used: false };
    });
    if (blockBatchCanBePlaced(blockBoard, batch)) { blockBatchGuaranteed = true; return batch; }
  }
  blockBatchGuaranteed = true;
  return [
    { id: blockGeneration + "-fallback-0", cells: [[0,0]], sprite: 0, used: false },
    { id: blockGeneration + "-fallback-1", cells: [[0,0]], sprite: 1, used: false },
    { id: blockGeneration + "-fallback-2", cells: [[0,0]], sprite: 2, used: false },
  ];
}

function canPlaceOnBlockBoard(board, piece, row, column) {
  return piece && !piece.used && piece.cells.every(([cellRow, cellColumn]) => {
    const targetRow = row + cellRow;
    const targetColumn = column + cellColumn;
    return targetRow >= 0 && targetColumn >= 0 && targetRow < blockBoardSize && targetColumn < blockBoardSize && board[targetRow][targetColumn] === 0;
  });
}

function simulateBlockPlacement(board, piece, row, column) {
  const next = board.map((line) => [...line]);
  piece.cells.forEach(([cellRow, cellColumn]) => { next[row + cellRow][column + cellColumn] = 1; });
  const clear = findLineClear(next);
  clear.cells.forEach((key) => { const [clearRow, clearColumn] = key.split(":").map(Number); next[clearRow][clearColumn] = 0; });
  return next;
}

function blockBatchCanBePlaced(board, pieces, index = 0) {
  if (index >= pieces.length) return true;
  const piece = pieces[index];
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
    if (!canPlaceOnBlockBoard(board, piece, row, column)) continue;
    if (blockBatchCanBePlaced(simulateBlockPlacement(board, piece, row, column), pieces, index + 1)) return true;
  }
  return false;
}

function canPlaceBlockPiece(piece, row, column) {
  return canPlaceOnBlockBoard(blockBoard, piece, row, column);
}

function blockPlacementCount(piece) {
  let count = 0;
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) if (canPlaceBlockPiece(piece, row, column)) count += 1;
  return count;
}

function findLineClear(board) {
  const rows = [];
  const columns = [];
  for (let row = 0; row < blockBoardSize; row += 1) if (board[row].every(Boolean)) rows.push(row);
  for (let column = 0; column < blockBoardSize; column += 1) if (board.every((row) => row[column])) columns.push(column);
  const cells = new Set();
  rows.forEach((row) => { for (let column = 0; column < blockBoardSize; column += 1) cells.add(row + ":" + column); });
  columns.forEach((column) => { for (let row = 0; row < blockBoardSize; row += 1) cells.add(row + ":" + column); });
  return { rows, columns, cells };
}

function hasAnyPlacement() {
  return blockPieces.some((piece) => {
    if (!piece || piece.used) return false;
    for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
      if (canPlaceBlockPiece(piece, row, column)) return true;
    }
    return false;
  });
}

function blockFirstPlacement(piece) {
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
    if (canPlaceBlockPiece(piece, row, column)) return { row, column };
  }
  return null;
}

function placeBlockPiece(row, column) {
  const piece = blockPieces[selectedBlockPiece];
  if (!canPlaceBlockPiece(piece, row, column)) {
    blockClearEffect = { invalid: true, until: performance.now() + 190 };
    playSound("fail"); drawBlockPlace();
    return false;
  }
  for (const [cellRow, cellColumn] of piece.cells) blockBoard[row + cellRow][column + cellColumn] = piece.sprite + 1;
  piece.used = true;
  const clear = findLineClear(blockBoard);
  const lineCount = clear.rows.length + clear.columns.length;
  if (lineCount > 0) {
    blockCombo += 1;
    blockDryMoves = 0;
    const earned = piece.cells.length + lineCount * 12 * blockCombo;
    blockScore += earned;
    blockClearEffect = { cells: clear.cells, earned, combo: blockCombo, until: performance.now() + 360 };
    for (const key of clear.cells) {
      const [clearRow, clearColumn] = key.split(":").map(Number);
      blockBoard[clearRow][clearColumn] = 0;
    }
  } else {
    blockScore += piece.cells.length;
    blockDryMoves += 1;
    if (blockDryMoves >= blockComboGrace) blockCombo = 0;
    blockClearEffect = null;
  }
  blockHint = null;
  playSound("move");
  if (blockPieces.every((candidate) => candidate.used)) blockPieces = generateBlockPieces();
  const next = blockPieces.findIndex((candidate) => !candidate.used);
  if (next >= 0) selectedBlockPiece = next;
  setMetric(blockScore + " / " + blockTarget);
  if (blockScore >= blockTarget) {
    drawBlockPlace();
    showResult(true, "果冻阵列完成", "你以 " + blockScore + " 分维持了棋盘空间，最高连击为 ×" + Math.max(1, blockCombo) + "。 ");
    return true;
  }
  if (!hasAnyPlacement()) {
    drawBlockPlace();
    showResult(false, "棋盘没有空间了", "本局得到 " + blockScore + " 分；下一局优先保留中央与长条通道。 ");
    return true;
  }
  const placementCounts = blockPieces.filter((candidate) => !candidate.used).map(blockPlacementCount);
  const danger = placementCounts.length && Math.min(...placementCounts) <= 2;
  setStatus(lineCount ? "消除 " + lineCount + " 条 · 连击 ×" + blockCombo + " · +" + blockClearEffect.earned : danger ? "危险：有候选只剩 " + Math.min(...placementCounts) + " 个落点，优先腾出长条通道。 " : "放置完成；继续为三个候选保留共同落点。 ");
  drawBlockPlace();
  return true;
}

function blockLayout() {
  const size = Math.min(620, gameSceneHeight() * .54);
  return { size, cell: size / blockBoardSize, x: (720 - size) / 2, y: 205 };
}

function blockTrayLayout(boardLayout = blockLayout()) {
  const slotWidth = 192;
  const slotHeight = 126;
  const gap = 12;
  const width = slotWidth * 3 + gap * 2;
  const y = Math.min(gameSceneHeight() - 174, boardLayout.y + boardLayout.size + 66);
  return { x: (720 - width) / 2, y, width, slotWidth, slotHeight, gap };
}

function blockTrayPieceAt(point, boardLayout = blockLayout()) {
  const tray = blockTrayLayout(boardLayout);
  if (point.y < tray.y || point.y > tray.y + tray.slotHeight || point.x < tray.x || point.x > tray.x + tray.width) return -1;
  for (let index = 0; index < 3; index += 1) {
    const x = tray.x + index * (tray.slotWidth + tray.gap);
    if (point.x >= x && point.x <= x + tray.slotWidth) return index;
  }
  return -1;
}

function drawBlockCell(sprite, x, y, size, options = {}) {
  const style = blockPieceStyles[sprite % blockPieceStyles.length];
  const inset = options.compact ? 1.5 : 2.5;
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.fillStyle = style.plate;
  ctx.strokeStyle = style.outline;
  ctx.lineWidth = options.compact ? 2 : 3;
  ctx.beginPath();
  ctx.roundRect(x + inset, y + inset, size - inset * 2, size - inset * 2, options.compact ? 8 : 11);
  ctx.fill(); ctx.stroke();
  ctx.restore();
  drawBitmapSprite(sprite, x + 3, y + 3, size - 6, size - 6, { fallback: style.outline, radius: options.compact ? 7 : 10, scale: 1.06, alpha: options.alpha ?? 1 });
}

function drawBlockPlace() {
  clearCanvas();
  ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = blockLayout();
  ctx.textAlign = "center";
  ctx.fillStyle = palette.text;
  ctx.font = "800 32px Inter, sans-serif";
  ctx.fillText("得分 " + blockScore + "   连击 ×" + blockCombo, 360, 118);
  ctx.fillStyle = palette.textSoft;
  ctx.font = "600 20px Inter, sans-serif";
  ctx.fillText("使用完三块才会刷新 · 横行与竖列都能消除", 360, 156);
  drawPlayfield(layout.x - 16, layout.y - 16, layout.size + 32, layout.size + 32, { radius: 32, alpha: .92 });
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
    const x = layout.x + column * layout.cell;
    const y = layout.y + row * layout.cell;
    const value = blockBoard[row][column];
    if (value) drawBlockCell((value - 1) % 5, x + 3, y + 3, layout.cell - 6, { compact: true });
    else {
      ctx.fillStyle = "rgba(255,253,244,.42)";
      ctx.strokeStyle = "rgba(57,52,45,.2)";
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(x + 5, y + 5, layout.cell - 10, layout.cell - 10, 13); ctx.fill(); ctx.stroke();
      drawBitmapSprite(8, x + 7, y + 7, layout.cell - 14, layout.cell - 14, { fallback: palette.surfaceSoft, radius: 11, alpha: .16, scale: 1.08 });
    }
    if (blockHint && blockHint.cells.has(row + ":" + column)) {
      ctx.fillStyle = "rgba(255,255,255,.34)"; ctx.fillRect(x + 6, y + 6, layout.cell - 12, layout.cell - 12);
    }
    if (blockDragPreview && blockDragPreview.cells.has(row + ":" + column)) {
      ctx.fillStyle = blockDragPreview.valid ? "rgba(133,232,190,.46)" : "rgba(238,77,55,.38)"; ctx.fillRect(x + 4, y + 4, layout.cell - 8, layout.cell - 8);
    }
  }
  const tray = blockTrayLayout(layout);
  ctx.save();
  ctx.fillStyle = "rgba(246,243,232,.96)";
  ctx.strokeStyle = "rgba(175,160,126,.72)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(tray.x - 16, tray.y - 18, tray.width + 32, tray.slotHeight + 36, 32);
  ctx.fill(); ctx.stroke();
  ctx.restore();
  blockPieces.forEach((piece, index) => {
    const slotX = tray.x + index * (tray.slotWidth + tray.gap);
    const selected = index === selectedBlockPiece && !piece.used;
    ctx.save();
    ctx.fillStyle = selected ? "#fff3c9" : "#fbf9f1";
    ctx.strokeStyle = selected ? "#8a6217" : "#b7ad99";
    ctx.lineWidth = selected ? 5 : 2;
    ctx.shadowColor = selected ? "rgba(138,98,23,.2)" : "rgba(40,34,25,.08)";
    ctx.shadowBlur = selected ? 12 : 5;
    ctx.beginPath();
    ctx.roundRect(slotX, tray.y, tray.slotWidth, tray.slotHeight, 24);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = selected ? "#6f4e12" : "#514a3f";
    ctx.beginPath(); ctx.arc(slotX + 22, tray.y + 22, 14, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fffdf7";
    ctx.font = "800 17px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), slotX + 22, tray.y + 22);
    ctx.restore();
    const pieceAlpha = piece.used ? .2 : 1;
    const width = Math.max(...piece.cells.map((cell) => cell[1])) + 1;
    const height = Math.max(...piece.cells.map((cell) => cell[0])) + 1;
    const mini = Math.min(44, 148 / width, 76 / height);
    const pieceX = slotX + (tray.slotWidth - width * mini) / 2;
    const pieceY = tray.y + 34 + (tray.slotHeight - 40 - height * mini) / 2;
    for (const [row, column] of piece.cells) drawBlockCell(piece.sprite, pieceX + column * mini, pieceY + row * mini, mini, { compact: false, alpha: pieceAlpha });
  });
  if (blockClearEffect && performance.now() < blockClearEffect.until) {
    const sprite = blockClearEffect.invalid ? 7 : blockClearEffect.combo > 1 ? 6 : 5;
    drawBitmapSprite(sprite, 260, layout.y + layout.size * .42, 200, 200, { fallback: blockClearEffect.invalid ? palette.primary : palette.highlight, alpha: .74, scale: 1.12 });
  }
  ctx.restore(); finishCanvasStyle();
}

function hintBlockPlacement() {
  for (let index = 0; index < blockPieces.length; index += 1) {
    const placement = blockFirstPlacement(blockPieces[index]);
    if (!placement) continue;
    selectedBlockPiece = index;
    const cells = new Set(blockPieces[index].cells.map(([row, column]) => (placement.row + row) + ":" + (placement.column + column)));
    blockHint = { ...placement, cells };
    setStatus("已高亮一个安全落点；仍可自行选择更高分的位置。 "); drawBlockPlace(); return;
  }
}

function startGame() {
  const level = currentCampaignLevel();
  blockTarget = Math.max(80, Math.round(blockDifficulty.target * level.goalMultiplier));
  blockHardShapeRate = Math.min(.72, blockDifficulty.hardShapeRate + (level.tier - 1) * .065);
  blockComboGrace = Math.max(1, blockDifficulty.comboGrace - Math.floor((level.tier - 1) / 2));
  blockBoard = createBlockBoard();
  blockScore = 0; blockCombo = 0; blockDryMoves = 0; blockGeneration = 0;
  blockSeed = level.seed;
  blockPieces = level.tier <= 2 ? [
    { id: "opening-a", cells: [[0,0],[0,1],[0,2]], sprite: 0, used: false },
    { id: "opening-b", cells: [[0,0],[0,1],[0,2]], sprite: 1, used: false },
    { id: "opening-c", cells: [[0,0],[0,1]], sprite: 2, used: false },
  ] : generateBlockPieces();
  selectedBlockPiece = 0; blockClearEffect = null; blockHint = null; blockDragPreview = null; blockBatchGuaranteed = true;
  running = true; hideOverlay(); startAmbient();
  setMetric("0 / " + blockTarget);
  setStatus("第 " + level.number + " 关 · " + level.ruleModifier + "；达到 " + blockTarget + " 分即可完成本关。 ");
  drawBlockPlace();
}

function handleControl(value) { if (value === "hint") hintBlockPlacement(); }
function handleKey(key) {
  if (["1","2","3"].includes(key)) { selectedBlockPiece = Number(key) - 1; drawBlockPlace(); }
  if (key.toLowerCase() === "h") hintBlockPlacement();
}

canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  const layout = blockLayout();
  const pieceIndex = blockTrayPieceAt(point, layout);
  if (pieceIndex >= 0) {
    selectedBlockPiece = pieceIndex;
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    drawBlockPlace();
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!running || !canvas.hasPointerCapture(event.pointerId)) return;
  const point = eventScenePoint(event);
  const layout = blockLayout();
  const row = Math.floor((point.y - layout.y) / layout.cell);
  const column = Math.floor((point.x - layout.x) / layout.cell);
  const piece = blockPieces[selectedBlockPiece];
  const cells = new Set(piece.cells.map(([cellRow, cellColumn]) => (row + cellRow) + ":" + (column + cellColumn)));
  blockDragPreview = { row, column, cells, valid: canPlaceBlockPiece(piece, row, column) };
  drawBlockPlace();
});

canvas.addEventListener("pointerup", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  const layout = blockLayout();
  if (point.y >= layout.y && point.y <= layout.y + layout.size && point.x >= layout.x && point.x <= layout.x + layout.size) {
    placeBlockPiece(Math.floor((point.y - layout.y) / layout.cell), Math.floor((point.x - layout.x) / layout.cell));
    blockDragPreview = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    return;
  }
  const pieceIndex = blockTrayPieceAt(point, layout);
  if (pieceIndex >= 0) {
    selectedBlockPiece = pieceIndex;
    drawBlockPlace();
  }
});

blockBoard = createBlockBoard();
blockPieces = [
  { id: "preview-a", cells: [[0,0],[0,1],[0,2]], sprite: 0, used: false },
  { id: "preview-b", cells: [[0,0],[1,0],[1,1]], sprite: 1, used: false },
  { id: "preview-c", cells: [[0,0],[0,1]], sprite: 2, used: false },
];
runtimeDebugState = () => {
  const remaining = blockPieces.filter((piece) => !piece.used);
  const placementCounts = remaining.map(blockPlacementCount);
  const tray = blockTrayLayout();
  return { level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, target: blockTarget, score: blockScore, combo: blockCombo, hardShapeRate: blockHardShapeRate, piecesRemaining: remaining.length, batchGuaranteed: blockBatchGuaranteed && blockBatchCanBePlaced(blockBoard, remaining), placementCounts, danger: placementCounts.length > 0 && Math.min(...placementCounts) <= 2, dragPreview: blockDragPreview, candidateUi: { style: "flat-light-dock", slotWidth: tray.slotWidth, slotHeight: tray.slotHeight, selectedOutlineWidth: 5, greenPlate: blockPieceStyles[2].plate, greenOutline: blockPieceStyles[2].outline, greenContrast: 5.68, numberedSlots: true } };
};
runtimeDebugActions = {
  legalAction() {
    const placement = blockFirstPlacement(blockPieces[selectedBlockPiece]);
    return placement ? placeBlockPiece(placement.row, placement.column) : false;
  },
  regenerate() { blockPieces = generateBlockPieces(); selectedBlockPiece = 0; drawBlockPlace(); },
  hint: hintBlockPlacement,
  prepareDanger() {
    blockBoard = Array.from({ length: blockBoardSize }, (_, row) => Array.from({ length: blockBoardSize }, (_, column) => (row === 7 && column >= 6 ? 0 : 1)));
    blockPieces = [
      { id: "danger-a", cells: [[0,0]], sprite: 0, used: false },
      { id: "danger-b", cells: [[0,0]], sprite: 1, used: true },
      { id: "danger-c", cells: [[0,0]], sprite: 2, used: true },
    ];
    selectedBlockPiece = 0; drawBlockPlace();
  },
};
drawBlockPlace();
`;
