// 规则架构参考 mkgame-poly（MIT）；关卡、拼块、名称和视听资产均为本平台原创。
export const polyominoFitScript = String.raw`
const polyDifficulty = {
  relaxed: { board: 5, snap: 1.35, level: 0 },
  standard: { board: 6, snap: 1.05, level: 1 },
  challenging: { board: 7, snap: .82, level: 2 },
}[config.difficulty];
let polyBoardSize = polyDifficulty.board;

const polyLevels = [
  {
    pieces: [
      { id: "citrus", cells: [[0,0],[1,0],[2,0],[2,1]], solution: [0,0,0] },
      { id: "bubble", cells: [[0,0],[0,1],[0,2],[1,1]], solution: [0,1,0] },
      { id: "berry", cells: [[0,0],[1,0],[1,1],[2,1]], solution: [1,3,0] },
      { id: "star", cells: [[0,0],[1,0],[1,1]], solution: [3,3,0] },
    ],
  },
  {
    pieces: [
      { id: "citrus", cells: [[0,0],[0,1],[1,0]], solution: [1,1,0] },
      { id: "bubble", cells: [[0,0],[1,0],[2,0],[2,1]], solution: [0,4,0] },
      { id: "berry", cells: [[0,0],[0,1],[1,1],[1,2]], solution: [3,1,0] },
      { id: "star", cells: [[0,0],[1,0],[1,1]], solution: [3,4,0] },
      { id: "ripple", cells: [[0,0],[0,1]], solution: [5,3,0] },
    ],
  },
  {
    pieces: [
      { id: "citrus", cells: [[0,0],[0,1],[0,2],[1,1]], solution: [1,1,0] },
      { id: "bubble", cells: [[0,0],[1,0],[2,0],[2,1]], solution: [1,4,0] },
      { id: "berry", cells: [[0,0],[0,1],[1,1],[2,1]], solution: [3,1,0] },
      { id: "star", cells: [[0,0],[1,0],[1,1],[1,2]], solution: [3,3,0] },
      { id: "ripple", cells: [[0,0],[0,1],[1,0]], solution: [5,3,0] },
      { id: "confetti", cells: [[0,0],[0,1],[0,2]], solution: [6,4,0] },
    ],
  },
];

function buildCampaignPolyLevel() {
  const tier = currentCampaignLevel().tier;
  const sourceIndex = tier === 1 ? 0 : tier <= 3 ? 1 : 2;
  const source = polyLevels[sourceIndex];
  polyBoardSize = sourceIndex === 0 ? 5 : sourceIndex === 1 ? 6 : 7;
  const turns = currentCampaignLevel().variant % 4;
  const mirrored = Math.floor((currentCampaignLevel().number - 1) / 4) % 2 === 1;
  const transformedPieces = source.pieces.map((piece) => {
    let cells = rotatePolyCells(piece.cells, piece.solution[2]).map(([row, column]) => [row + piece.solution[0], column + piece.solution[1]]);
    if (mirrored) cells = cells.map(([row, column]) => [row, polyBoardSize - 1 - column]);
    for (let turn = 0; turn < turns; turn += 1) cells = cells.map(([row, column]) => [column, polyBoardSize - 1 - row]);
    return { piece, cells };
  });
  const allCells = transformedPieces.flatMap((entry) => entry.cells);
  const globalMinRow = Math.min(...allCells.map(([row]) => row));
  const globalMinColumn = Math.min(...allCells.map(([, column]) => column));
  return transformedPieces.map(({ piece, cells }) => {
    const normalized = cells.map(([row, column]) => [row - globalMinRow, column - globalMinColumn]);
    const minRow = Math.min(...normalized.map(([row]) => row));
    const minColumn = Math.min(...normalized.map(([, column]) => column));
    return {
      ...piece,
      cells: normalized.map(([row, column]) => [row - minRow, column - minColumn]),
      solution: [minRow, minColumn, 0],
      rotation: 0,
    };
  });
}

let polyPieces = [];
let polyPlacements = [];
let selectedPolyPiece = 0;
let polyHintCell = null;
let polyPulseUntil = 0;

function rotatePolyCells(cells, turns) {
  let rotated = cells.map(([row, column]) => [row, column]);
  for (let turn = 0; turn < turns; turn += 1) {
    rotated = rotated.map(([row, column]) => [column, -row]);
    const minRow = Math.min(...rotated.map((cell) => cell[0]));
    const minColumn = Math.min(...rotated.map((cell) => cell[1]));
    rotated = rotated.map(([row, column]) => [row - minRow, column - minColumn]);
  }
  return rotated;
}

function polyCellKey(row, column) { return row + ":" + column; }

function polyTargetCells() {
  const target = new Set();
  for (const piece of polyPieces) {
    const [row, column, rotation] = piece.solution;
    for (const [cellRow, cellColumn] of rotatePolyCells(piece.cells, rotation)) {
      target.add(polyCellKey(row + cellRow, column + cellColumn));
    }
  }
  return target;
}

function polyOccupiedCells(ignoreId = null) {
  const occupied = new Set();
  for (const placement of polyPlacements) {
    if (placement.id === ignoreId) continue;
    const piece = polyPieces.find((item) => item.id === placement.id);
    for (const [cellRow, cellColumn] of rotatePolyCells(piece.cells, placement.rotation)) {
      occupied.add(polyCellKey(placement.row + cellRow, placement.column + cellColumn));
    }
  }
  return occupied;
}

function canPlacePolyPiece(piece, row, column, rotation = piece.rotation) {
  const target = polyTargetCells();
  const occupied = polyOccupiedCells(piece.id);
  return rotatePolyCells(piece.cells, rotation).every(([cellRow, cellColumn]) => {
    const boardRow = row + cellRow;
    const boardColumn = column + cellColumn;
    const key = polyCellKey(boardRow, boardColumn);
    return boardRow >= 0 && boardColumn >= 0 && boardRow < polyBoardSize && boardColumn < polyBoardSize && target.has(key) && !occupied.has(key);
  });
}

function findNearestLegalPlacement(piece, targetRow, targetColumn) {
  const cells = rotatePolyCells(piece.cells, piece.rotation);
  const candidates = [];
  for (const [grabRow, grabColumn] of cells) {
    const row = targetRow - grabRow;
    const column = targetColumn - grabColumn;
    if (!canPlacePolyPiece(piece, row, column)) continue;
    const distance = Math.hypot(row + grabRow - targetRow, column + grabColumn - targetColumn);
    candidates.push({ row, column, distance });
  }
  return candidates.sort((left, right) => left.distance - right.distance)[0] || null;
}

function placePieceCoveringCell(row, column) {
  const piece = polyPieces[selectedPolyPiece];
  if (!piece || polyPlacements.some((placement) => placement.id === piece.id)) return false;
  const placement = findNearestLegalPlacement(piece, row, column);
  if (!placement) {
    polyPulseUntil = performance.now() + 180;
    playSound("fail");
    drawPolyomino();
    return false;
  }
  polyPlacements.push({ id: piece.id, row: placement.row, column: placement.column, rotation: piece.rotation });
  polyHintCell = null;
  playSound("move");
  const next = polyPieces.findIndex((candidate) => !polyPlacements.some((placed) => placed.id === candidate.id));
  if (next >= 0) selectedPolyPiece = next;
  if (polyPlacements.length === polyPieces.length) {
    drawPolyomino();
    showResult(true, "软糖岛完整了", "所有拼块已经覆盖目标轮廓，没有重叠或遗漏。");
    return true;
  }
  drawPolyomino();
  setMetric(polyPlacements.length + " / " + polyPieces.length);
  setStatus("已吸附 " + polyPlacements.length + " 块；选择下一块继续填形。 ");
  return true;
}

function polyLayout() {
  const boardSize = Math.min(620, gameSceneHeight() * .53);
  return { boardSize, cell: boardSize / polyBoardSize, x: (720 - boardSize) / 2, y: 190 };
}

function polyTrayLayout(boardLayout = polyLayout()) {
  const columns = polyPieces.length > 4 ? 3 : Math.max(1, polyPieces.length);
  const rows = Math.ceil(polyPieces.length / columns);
  const slotWidth = Math.min(165, 660 / columns);
  const slotHeight = rows > 1 ? 142 : 160;
  const width = slotWidth * columns;
  const height = slotHeight * rows;
  const y = Math.min(gameSceneHeight() - height - 24, boardLayout.y + boardLayout.boardSize + 42);
  return { x: (720 - width) / 2, y, width, height, columns, rows, slotWidth, slotHeight };
}

function drawPolyomino() {
  clearCanvas();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const layout = polyLayout();
  drawPlayfield(78, 76, 564, 86, { radius: 24, alpha: .96, fill: "rgba(255,250,244,.96)", stroke: "rgba(102,84,107,.2)", lineWidth: 2 });
  drawPlayfield(layout.x - 18, layout.y - 18, layout.boardSize + 36, layout.boardSize + 36, { radius: 36, alpha: .9 });
  const target = polyTargetCells();
  const occupied = polyOccupiedCells();
  for (let row = 0; row < polyBoardSize; row += 1) for (let column = 0; column < polyBoardSize; column += 1) {
    const key = polyCellKey(row, column);
    if (!target.has(key)) continue;
    const x = layout.x + column * layout.cell;
    const y = layout.y + row * layout.cell;
    ctx.fillStyle = occupied.has(key) ? "rgba(255,255,255,.08)" : "rgba(255,243,204,.92)";
    ctx.strokeStyle = "rgba(92,69,34,.68)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(x + 3, y + 3, layout.cell - 6, layout.cell - 6, 16);
    ctx.fill(); ctx.stroke();
    if (!occupied.has(key)) drawBitmapSprite(8, x + 8, y + 8, layout.cell - 16, layout.cell - 16, { fallback: palette.surfaceSoft, radius: 12, alpha: .1, scale: 1.05 });
  }
  for (const placement of polyPlacements) {
    const pieceIndex = polyPieces.findIndex((piece) => piece.id === placement.id);
    const piece = polyPieces[pieceIndex];
    for (const [row, column] of rotatePolyCells(piece.cells, placement.rotation)) {
      drawBitmapSprite(pieceIndex % 6, layout.x + (placement.column + column) * layout.cell + 3, layout.y + (placement.row + row) * layout.cell + 3, layout.cell - 6, layout.cell - 6, { fallback: palette.pieces[pieceIndex], radius: 16, scale: 1.16 });
    }
  }
  if (polyHintCell) {
    drawBitmapSprite(7, layout.x + polyHintCell.column * layout.cell, layout.y + polyHintCell.row * layout.cell, layout.cell, layout.cell, { fallback: palette.highlight, alpha: .78, scale: 1.18 });
  }
  ctx.textAlign = "center";
  ctx.fillStyle = "#4f3f52";
  ctx.font = "800 27px Inter, sans-serif";
  ctx.fillText("点击下方拼块旋转 · 再点击上方轮廓吸附", 360, 130);
  const tray = polyTrayLayout(layout);
  polyPieces.forEach((piece, index) => {
    const used = polyPlacements.some((placement) => placement.id === piece.id);
    const columnIndex = index % tray.columns;
    const rowIndex = Math.floor(index / tray.columns);
    const x = tray.x + columnIndex * tray.slotWidth;
    const y = tray.y + rowIndex * tray.slotHeight;
    ctx.globalAlpha = used ? .2 : 1;
    ctx.fillStyle = index === selectedPolyPiece && !used ? "rgba(255,244,210,.94)" : "rgba(255,255,255,.66)";
    ctx.strokeStyle = index === selectedPolyPiece && !used ? palette.highlight : "rgba(104,76,110,.24)";
    ctx.lineWidth = index === selectedPolyPiece && !used ? 5 : 2;
    ctx.beginPath();
    ctx.roundRect(x + 6, y + 4, tray.slotWidth - 12, tray.slotHeight - 10, 24);
    ctx.fill(); ctx.stroke();
    if (index === selectedPolyPiece && !used) {
      ctx.fillStyle = "#76506f";
      ctx.font = "800 24px Inter, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("↻", x + tray.slotWidth - 18, y + 32);
    }
    const cells = rotatePolyCells(piece.cells, piece.rotation);
    const maxColumn = Math.max(...cells.map((cell) => cell[1])) + 1;
    const maxRow = Math.max(...cells.map((cell) => cell[0])) + 1;
    const mini = Math.min(48, (tray.slotWidth - 28) / maxColumn, (tray.slotHeight - 40) / maxRow);
    const pieceX = x + (tray.slotWidth - maxColumn * mini) / 2;
    const pieceY = y + 20 + (tray.slotHeight - 34 - maxRow * mini) / 2;
    for (const [row, column] of cells) drawBitmapSprite(index % 6, pieceX + column * mini, pieceY + row * mini, mini, mini, { fallback: palette.pieces[index], radius: 10, scale: 1.18 });
    ctx.globalAlpha = 1;
  });
  if (performance.now() < polyPulseUntil) {
    ctx.fillStyle = "rgba(238,77,55,.16)";
    ctx.fillRect(layout.x, layout.y, layout.boardSize, layout.boardSize);
  }
  ctx.restore();
  finishCanvasStyle();
}

function rotateSelectedPolyPiece() {
  const piece = polyPieces[selectedPolyPiece];
  if (!piece || polyPlacements.some((placement) => placement.id === piece.id)) return;
  piece.rotation = (piece.rotation + 1) % 4;
  playSound("move"); drawPolyomino();
}

function hintPolyPiece() {
  const index = polyPieces.findIndex((piece) => !polyPlacements.some((placement) => placement.id === piece.id));
  if (index < 0) return;
  selectedPolyPiece = index;
  const piece = polyPieces[index];
  polyHintCell = { row: piece.solution[0], column: piece.solution[1] };
  setStatus("提示只标出目标区域与锚点，不会自动旋转；请先判断方向，再点击发光格。 ");
  drawPolyomino();
}

function undoPolyPiece() {
  const removed = polyPlacements.pop();
  if (!removed) return;
  selectedPolyPiece = polyPieces.findIndex((piece) => piece.id === removed.id);
  setMetric(polyPlacements.length + " / " + polyPieces.length);
  setStatus("已撤销上一块。 "); drawPolyomino();
}

function startGame() {
  polyPieces = buildCampaignPolyLevel();
  polyPlacements = [];
  selectedPolyPiece = 0;
  polyHintCell = null;
  running = true;
  hideOverlay(); startAmbient();
  setMetric("0 / " + polyPieces.length);
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + currentCampaignLevel().ruleModifier + "；先选拼块，再旋转并点击轮廓落点。 ");
  drawPolyomino();
}

function handleControl(value) {
  if (value === "rotate") rotateSelectedPolyPiece();
  if (value === "hint") hintPolyPiece();
  if (value === "undo") undoPolyPiece();
}

function handleKey(key) {
  if (key.toLowerCase() === "r") rotateSelectedPolyPiece();
  if (key.toLowerCase() === "h") hintPolyPiece();
  if (key.toLowerCase() === "z") undoPolyPiece();
}

canvas.addEventListener("pointerup", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  const layout = polyLayout();
  if (point.y >= layout.y && point.y <= layout.y + layout.boardSize && point.x >= layout.x && point.x <= layout.x + layout.boardSize) {
    placePieceCoveringCell(Math.floor((point.y - layout.y) / layout.cell), Math.floor((point.x - layout.x) / layout.cell));
    return;
  }
  const tray = polyTrayLayout(layout);
  if (point.y >= tray.y && point.y <= tray.y + tray.height && point.x >= tray.x && point.x <= tray.x + tray.width) {
    const columnIndex = Math.floor((point.x - tray.x) / tray.slotWidth);
    const rowIndex = Math.floor((point.y - tray.y) / tray.slotHeight);
    const clickedIndex = rowIndex * tray.columns + columnIndex;
    if (clickedIndex >= polyPieces.length || polyPlacements.some((placement) => placement.id === polyPieces[clickedIndex].id)) return;
    selectedPolyPiece = clickedIndex;
    rotateSelectedPolyPiece();
    setStatus("已选择并旋转拼块；继续点击可再次旋转，随后点击上方轮廓完成吸附。 ");
  }
});

polyPieces = buildCampaignPolyLevel();
onCampaignLevelChanged = () => {
  if (!running) {
    polyPieces = buildCampaignPolyLevel();
    polyPlacements = [];
    selectedPolyPiece = 0;
    drawPolyomino();
  }
};
runtimeDebugState = () => {
  const tray = polyTrayLayout();
  const firstPiece = polyPieces[0];
  const firstCells = firstPiece ? rotatePolyCells(firstPiece.cells, firstPiece.rotation) : [];
  const firstMaxColumn = firstCells.length ? Math.max(...firstCells.map((cell) => cell[1])) + 1 : 1;
  const firstMaxRow = firstCells.length ? Math.max(...firstCells.map((cell) => cell[0])) + 1 : 1;
  const trayCellSize = Math.min(48, (tray.slotWidth - 28) / firstMaxColumn, (tray.slotHeight - 40) / firstMaxRow);
  return {
    level: currentCampaignLevel().number,
    tier: currentCampaignLevel().tier,
    contourCount: config.campaignLevels.length,
    contourSignature: [...polyTargetCells()].sort().join("|"),
    targetCellCount: polyTargetCells().size,
    boardSize: polyBoardSize,
    pieceCount: polyPieces.length,
    placed: polyPlacements.length,
    selectedRotation: polyPieces[selectedPolyPiece]?.rotation || 0,
    hintAnchorOnly: Boolean(polyHintCell),
    clickToRotate: true,
    tray: { columns: tray.columns, rows: tray.rows, slotWidth: Math.round(tray.slotWidth), slotHeight: tray.slotHeight, cellSize: Math.round(trayCellSize) },
    trayFirstCenterCanvas: { x: tray.x + tray.slotWidth / 2, y: gameSceneTop() + tray.y + tray.slotHeight / 2 },
    canvasSize: { width: canvas.width, height: canvas.height },
  };
};
runtimeDebugActions = {
  legalAction() {
    const piece = polyPieces[selectedPolyPiece];
    if (!piece) return false;
    piece.rotation = piece.solution[2];
    return placePieceCoveringCell(piece.solution[0], piece.solution[1]);
  },
  hint: hintPolyPiece,
  rotate: rotateSelectedPolyPiece,
  placeSolutionPiece() {
    const piece = polyPieces[selectedPolyPiece];
    if (!piece) return false;
    piece.rotation = piece.solution[2];
    return placePieceCoveringCell(piece.solution[0], piece.solution[1]);
  },
};
drawPolyomino();
`;
