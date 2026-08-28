export const puzzleScript = String.raw`
let image = new Image();
let pieces = [];
let columns = 4;
let rows = 3;
let board = { x: 50, y: 80, width: 620, height: 465, cellWidth: 155, cellHeight: 155 };
let selectedPiece = null;
let dragOffset = { x: 0, y: 0 };
let placedCount = 0;
let moves = 0;
let activePieceCount = config.puzzleRules ? config.puzzleRules.pieceCount : 20;
let activeLevelId = config.imageLevels?.[0]?.id || "pocket-garden";
let puzzleImageLoading = true;
let puzzleImageRequestId = 0;
let draggingPiece = false;
let dragOrigin = null;
let snapPulseUntil = 0;
let bounceCount = 0;

function setPuzzleImageLoading(loading) {
  puzzleImageLoading = loading;
  startButton.disabled = loading;
  startButton.setAttribute("aria-busy", String(loading));
  if (loading) setStatus("正在载入关卡图片，请稍候。");
}

function beginPuzzleImageLoad() {
  puzzleImageRequestId += 1;
  setPuzzleImageLoading(true);
  return puzzleImageRequestId;
}

function clearPuzzleCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = palette.surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const paperLight = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  paperLight.addColorStop(0, "rgba(255,255,255,.36)");
  paperLight.addColorStop(.54, "rgba(255,255,255,.08)");
  paperLight.addColorStop(1, "rgba(102,84,107,.055)");
  ctx.fillStyle = paperLight;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function activeLevelLabel() {
  return config.imageLevels?.find((level) => level.id === activeLevelId)?.label || "我的图片";
}

function gridForImage() {
  const aspect = Math.max(.25, Math.min(4, image.naturalWidth / image.naturalHeight));
  const candidates = [];
  for (let candidateRows = 2; candidateRows <= activePieceCount; candidateRows += 1) {
    if (activePieceCount % candidateRows !== 0) continue;
    const candidateColumns = activePieceCount / candidateRows;
    if (candidateColumns < 2) continue;
    candidates.push({ rows: candidateRows, columns: candidateColumns });
  }
  const best = candidates.sort((left, right) => {
    const leftDistance = Math.abs(Math.log((left.columns / left.rows) / aspect));
    const rightDistance = Math.abs(Math.log((right.columns / right.rows) / aspect));
    return leftDistance - rightDistance;
  })[0] || { rows: 4, columns: 5 };
  columns = best.columns;
  rows = best.rows;
}

function layoutBoard() {
  const aspect = Math.max(.25, Math.min(4, image.naturalWidth / image.naturalHeight));
  const maxWidth = config.aspectRatio === "9:16" ? Math.min(580, canvas.width * .81) : Math.min(540, canvas.width * .75);
  const maxHeight = config.aspectRatio === "9:16" ? Math.min(860, canvas.height * .67) : Math.min(720, canvas.height * .58);
  let width = maxWidth;
  let height = width / aspect;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspect;
  }
  board = {
    x: (canvas.width - width) / 2,
    y: (canvas.height - height) / 2,
    width,
    height,
    cellWidth: width / columns,
    cellHeight: height / rows,
  };
}

function perimeterSlots() {
  const gap = Math.max(7, Math.min(board.cellWidth, board.cellHeight) * .12);
  const tabMargin = Math.min(board.cellWidth, board.cellHeight) * .24 + 5;
  const slots = [];
  const edgeCounts = [0, 0, 0, 0];
  for (let index = 0; index < activePieceCount; index += 1) edgeCounts[index % 4] += 1;
  const spread = (count, start, end) => Array.from({ length: count }, (_, index) => (
    count === 1 ? (start + end) / 2 : start + (end - start) * index / (count - 1)
  ));
  const topY = Math.max(tabMargin, board.y - board.cellHeight - gap);
  const rightX = Math.min(canvas.width - board.cellWidth - tabMargin, board.x + board.width + gap);
  const bottomY = Math.min(canvas.height - board.cellHeight - tabMargin, board.y + board.height + gap);
  const leftX = Math.max(tabMargin, board.x - board.cellWidth - gap);
  const horizontalStart = tabMargin;
  const horizontalEnd = canvas.width - board.cellWidth - tabMargin;
  const verticalStart = Math.max(tabMargin, board.y);
  const verticalEnd = Math.min(canvas.height - board.cellHeight - tabMargin, board.y + board.height - board.cellHeight);
  spread(edgeCounts[0], horizontalStart, horizontalEnd).forEach((x) => slots.push({ x, y: topY }));
  spread(edgeCounts[1], verticalStart, verticalEnd).forEach((y) => slots.push({ x: rightX, y }));
  spread(edgeCounts[2], horizontalEnd, horizontalStart).forEach((x) => slots.push({ x, y: bottomY }));
  spread(edgeCounts[3], verticalEnd, verticalStart).forEach((y) => slots.push({ x: leftX, y }));
  return slots;
}

function boundarySign(kind, row, column) {
  const seed = row * 31 + column * 17 + (kind === "horizontal" ? 7 : 13);
  return seed % 2 === 0 ? 1 : -1;
}

function edgesFor(row, column) {
  return {
    top: row === 0 ? 0 : -boundarySign("horizontal", row - 1, column),
    right: column === columns - 1 ? 0 : boundarySign("vertical", row, column),
    bottom: row === rows - 1 ? 0 : boundarySign("horizontal", row, column),
    left: column === 0 ? 0 : -boundarySign("vertical", row, column - 1),
  };
}

function horizontalEdge(path, startX, y, deltaX, sign, outward) {
  if (sign === 0) {
    path.lineTo(startX + deltaX, y);
    return;
  }
  const depth = Math.min(Math.abs(deltaX), board.cellHeight) * .21 * sign * outward;
  path.lineTo(startX + deltaX * .34, y);
  path.bezierCurveTo(startX + deltaX * .34, y + depth, startX + deltaX * .66, y + depth, startX + deltaX * .66, y);
  path.lineTo(startX + deltaX, y);
}

function verticalEdge(path, x, startY, deltaY, sign, outward) {
  if (sign === 0) {
    path.lineTo(x, startY + deltaY);
    return;
  }
  const depth = Math.min(Math.abs(deltaY), board.cellWidth) * .21 * sign * outward;
  path.lineTo(x, startY + deltaY * .34);
  path.bezierCurveTo(x + depth, startY + deltaY * .34, x + depth, startY + deltaY * .66, x, startY + deltaY * .66);
  path.lineTo(x, startY + deltaY);
}

function piecePath(piece, x = piece.x, y = piece.y) {
  const path = new Path2D();
  const width = board.cellWidth;
  const height = board.cellHeight;
  path.moveTo(x, y);
  horizontalEdge(path, x, y, width, piece.edges.top, -1);
  verticalEdge(path, x + width, y, height, piece.edges.right, 1);
  horizontalEdge(path, x + width, y + height, -width, piece.edges.bottom, 1);
  verticalEdge(path, x, y + height, -height, piece.edges.left, -1);
  path.closePath();
  return path;
}

function createPieces() {
  pieces = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const homeX = board.x + column * board.cellWidth;
      const homeY = board.y + row * board.cellHeight;
      pieces.push({ row, column, homeX, homeY, x: homeX, y: homeY, edges: edgesFor(row, column), locked: false });
    }
  }
  const slots = perimeterSlots();
  for (let index = slots.length - 1; index > 0; index -= 1) {
    const swapIndex = (index * 17 + activePieceCount * 13) % (index + 1);
    [slots[index], slots[swapIndex]] = [slots[swapIndex], slots[index]];
  }
  pieces.forEach((piece, index) => {
    const slot = slots[Math.floor(index * slots.length / pieces.length)];
    piece.x = slot.x;
    piece.y = slot.y;
  });
}

function drawPiece(piece) {
  const bounce = piece.bounceUntil > performance.now() ? Math.sin((piece.bounceUntil - performance.now()) * .08) * 8 : 0;
  const drawX = piece.x + bounce;
  const drawY = piece.y;
  const path = piecePath(piece, drawX, drawY);
  const deltaX = drawX - piece.homeX;
  const deltaY = drawY - piece.homeY;
  ctx.save();
  ctx.clip(path);
  ctx.drawImage(image, board.x + deltaX, board.y + deltaY, board.width, board.height);
  if (piece.locked) {
    ctx.fillStyle = palette.surfaceSoft;
    ctx.fill(path);
  }
  ctx.restore();
  ctx.strokeStyle = piece === selectedPiece ? palette.highlight : piece.locked ? palette.secondary : palette.textSoft;
  ctx.lineWidth = piece === selectedPiece ? 4 : 2;
  ctx.stroke(path);
}

function drawPuzzle() {
  clearPuzzleCanvas();
  if (!image.naturalWidth) return;
  drawPlayfield(board.x - 18, board.y - 18, board.width + 36, board.height + 36, { radius: 24, alpha: .9 });
  ctx.save();
  ctx.globalAlpha = config.puzzleRules ? config.puzzleRules.guideOpacity : .14;
  ctx.drawImage(image, board.x, board.y, board.width, board.height);
  ctx.restore();
  ctx.strokeStyle = palette.grid;
  ctx.lineWidth = 2;
  ctx.strokeRect(board.x, board.y, board.width, board.height);
  pieces.filter((piece) => piece.locked && piece !== selectedPiece).forEach(drawPiece);
  pieces.filter((piece) => !piece.locked && piece !== selectedPiece).forEach(drawPiece);
  if (selectedPiece) drawPiece(selectedPiece);
  if (selectedPiece) drawBitmapSprite(5, selectedPiece.x + board.cellWidth / 2 - 17, selectedPiece.y + board.cellHeight / 2 - 17, 34, 34, { fallback: palette.secondary, circle: true, padding: 8 });
  finishCanvasStyle();
  if (pieces.some((piece) => piece.bounceUntil > performance.now()) || snapPulseUntil > performance.now()) requestAnimationFrame(drawPuzzle);
}

function drawPreview() {
  clearPuzzleCanvas();
  drawPlayfield(board.x - 18, board.y - 18, board.width + 36, board.height + 36, { radius: 24, alpha: .9 });
  ctx.drawImage(image, board.x, board.y, board.width, board.height);
  ctx.strokeStyle = palette.textSoft;
  ctx.lineWidth = 2;
  ctx.strokeRect(board.x, board.y, board.width, board.height);
  finishCanvasStyle();
}

function pointerPosition(event) {
  return eventCanvasPoint(event);
}

function findPieceAt(x, y) {
  for (let index = pieces.length - 1; index >= 0; index -= 1) {
    const piece = pieces[index];
    if (!piece.locked && ctx.isPointInPath(piecePath(piece), x, y)) return piece;
  }
  return null;
}

function snapSelectedPiece() {
  if (!selectedPiece) return;
  moves += 1;
  const distance = Math.hypot(selectedPiece.x - selectedPiece.homeX, selectedPiece.y - selectedPiece.homeY);
  const snapDistance = Math.min(board.cellWidth, board.cellHeight) * (config.puzzleRules ? config.puzzleRules.snapTolerance : .26);
  if (distance <= snapDistance) {
    selectedPiece.x = selectedPiece.homeX;
    selectedPiece.y = selectedPiece.homeY;
    selectedPiece.locked = true;
    snapPulseUntil = performance.now() + 220;
    placedCount += 1;
    playSound("move");
    setMetric(placedCount + " / " + pieces.length);
    if (placedCount === pieces.length) {
      drawPuzzle();
      showResult(true, "画面完整重现", "你移动了 " + moves + " 次，完成 " + columns + " × " + rows + " 拼图。");
      return;
    }
    setStatus("已归位 " + placedCount + " 块，继续寻找图像边缘和纹理线索。");
  } else {
    selectedPiece.bounceUntil = performance.now() + 240;
    bounceCount += 1;
    setStatus("还没到正确位置；参考底层淡化原图继续调整。");
  }
}

canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  const point = pointerPosition(event);
  const hitPiece = findPieceAt(point.x, point.y);
  if (!hitPiece && selectedPiece && point.x >= board.x && point.x <= board.x + board.width && point.y >= board.y && point.y <= board.y + board.height) {
    const column = Math.max(0, Math.min(columns - 1, Math.floor((point.x - board.x) / board.cellWidth)));
    const row = Math.max(0, Math.min(rows - 1, Math.floor((point.y - board.y) / board.cellHeight)));
    selectedPiece.x = board.x + column * board.cellWidth;
    selectedPiece.y = board.y + row * board.cellHeight;
    snapSelectedPiece();
    if (selectedPiece.locked) selectedPiece = null;
    drawPuzzle();
    return;
  }
  if (!hitPiece) { selectedPiece = null; drawPuzzle(); return; }
  selectedPiece = hitPiece;
  draggingPiece = true;
  dragOrigin = { x: point.x, y: point.y };
  dragOffset.x = point.x - selectedPiece.x;
  dragOffset.y = point.y - selectedPiece.y;
  canvas.setPointerCapture(event.pointerId);
  drawPuzzle();
});

canvas.addEventListener("pointermove", (event) => {
  if (!selectedPiece || !draggingPiece) return;
  const point = pointerPosition(event);
  selectedPiece.x = Math.max(0, Math.min(canvas.width - board.cellWidth, point.x - dragOffset.x));
  selectedPiece.y = Math.max(0, Math.min(canvas.height - board.cellHeight, point.y - dragOffset.y));
  drawPuzzle();
});

function releasePiece(event) {
  if (!selectedPiece || !draggingPiece) return;
  const point = pointerPosition(event);
  const moved = dragOrigin ? Math.hypot(point.x - dragOrigin.x, point.y - dragOrigin.y) : 0;
  draggingPiece = false;
  dragOrigin = null;
  if (moved >= 8) snapSelectedPiece();
  if (selectedPiece.locked) selectedPiece = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  drawPuzzle();
}

canvas.addEventListener("pointerup", releasePiece);
canvas.addEventListener("pointercancel", releasePiece);

const uploadInput = document.querySelector("#puzzle-upload");
if (uploadInput) uploadInput.addEventListener("change", (event) => {
  const file = event.target.files && event.target.files[0];
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const requestId = beginPuzzleImageLoad();
    const nextImage = new Image();
    nextImage.addEventListener("load", () => {
      if (requestId !== puzzleImageRequestId) return;
      image = nextImage;
      setPuzzleImageLoading(false);
      activeLevelId = "custom";
      if (!config.imageLevels.some((level) => level.id === "custom")) {
        config.imageLevels.unshift({ id: "custom", label: "我的图片", path: "" });
        levelInputs.forEach((input) => input.add(new Option("我的图片", "custom", true, true), 0));
      }
      syncInputs(levelInputs, activeLevelId);
      document.querySelector("#upload-name").textContent = file.name + " · " + image.naturalWidth + "×" + image.naturalHeight;
      startGame();
    });
    nextImage.src = String(reader.result);
  });
  reader.readAsDataURL(file);
});

const pieceCountInputs = Array.from(document.querySelectorAll("[data-puzzle-count]"));
const levelInputs = Array.from(document.querySelectorAll("[data-puzzle-level]"));

function syncInputs(inputs, value) {
  inputs.forEach((input) => { input.value = String(value); });
}

function applyPuzzleCampaignLevel(level) {
  const allowedCounts = config.puzzleRules?.allowedPieceCounts || [6, 9, 12, 16, 20, 24, 30, 36, 42, 48, 50];
  const difficultyOffset = config.difficulty === "relaxed" ? -1 : config.difficulty === "challenging" ? 1 : 0;
  const countIndex = Math.max(0, Math.min(allowedCounts.length - 1, Math.floor((level.number - 1) / 2) + difficultyOffset));
  activePieceCount = allowedCounts[countIndex];
  syncInputs(pieceCountInputs, activePieceCount);
  if (activeLevelId === "custom") return;
  const builtInLevels = config.imageLevels.filter((candidate) => candidate.id !== "custom");
  const nextLevel = builtInLevels[(level.number - 1) % builtInLevels.length];
  if (!nextLevel || nextLevel.id === activeLevelId) return;
  activeLevelId = nextLevel.id;
  syncInputs(levelInputs, activeLevelId);
  const requestId = beginPuzzleImageLoad();
  const nextImage = new Image();
  nextImage.addEventListener("load", () => {
    if (requestId !== puzzleImageRequestId) return;
    image = nextImage;
    setPuzzleImageLoading(false);
    gridForImage();
    layoutBoard();
    if (!running) drawPreview();
  });
  nextImage.src = nextLevel.path;
}

onCampaignLevelChanged = applyPuzzleCampaignLevel;

pieceCountInputs.forEach((input) => input.addEventListener("change", () => {
  activePieceCount = Number(input.value);
  syncInputs(pieceCountInputs, activePieceCount);
  if (running) startGame();
  else setStatus("已选择 " + activeLevelLabel() + " · " + activePieceCount + " 块。开始后拼块会排在画板外围。");
}));

levelInputs.forEach((input) => input.addEventListener("change", () => {
  const nextLevel = config.imageLevels.find((level) => level.id === input.value);
  if (!nextLevel || nextLevel.id === "custom") return;
  const shouldRestart = running;
  activeLevelId = nextLevel.id;
  syncInputs(levelInputs, activeLevelId);
  setStatus("正在载入“" + nextLevel.label + "”…");
  const requestId = beginPuzzleImageLoad();
  const nextImage = new Image();
  nextImage.addEventListener("load", () => {
    if (requestId !== puzzleImageRequestId) return;
    image = nextImage;
    setPuzzleImageLoading(false);
    gridForImage();
    layoutBoard();
    if (shouldRestart) startGame();
    else {
      drawPreview();
      setStatus("已选择 " + nextLevel.label + " · " + activePieceCount + " 块。");
    }
  });
  nextImage.src = nextLevel.path;
}));

syncInputs(pieceCountInputs, activePieceCount);
syncInputs(levelInputs, activeLevelId);

function startGame() {
  if (puzzleImageLoading || !image.naturalWidth || !image.naturalHeight) {
    setStatus("图片仍在载入，请稍候。");
    return;
  }
  running = true;
  placedCount = 0;
  moves = 0;
  selectedPiece = null;
  draggingPiece = false;
  dragOrigin = null;
  snapPulseUntil = 0;
  bounceCount = 0;
  gridForImage();
  layoutBoard();
  createPieces();
  hideOverlay();
  setMetric("0 / " + pieces.length);
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + activeLevelLabel() + " · " + pieces.length + " 块；拼块已排布在画板外围。");
  startAmbient();
  drawPuzzle();
}

function selectNextPuzzlePiece() {
  const available = pieces.filter((piece) => !piece.locked);
  if (!available.length) return;
  const current = available.indexOf(selectedPiece);
  selectedPiece = available[(current + 1 + available.length) % available.length];
  setStatus("已选择第 " + (pieces.indexOf(selectedPiece) + 1) + " 块；方向键微调，Enter 尝试吸附。 ");
  drawPuzzle();
}

function handleControl() {}
function handleKey(key) {
  if (!running) return;
  if (key === "Tab") { selectNextPuzzlePiece(); return; }
  if (!selectedPiece) return;
  const step = Math.max(8, Math.min(board.cellWidth, board.cellHeight) * .18);
  if (key === "ArrowLeft") selectedPiece.x -= step;
  if (key === "ArrowRight") selectedPiece.x += step;
  if (key === "ArrowUp") selectedPiece.y -= step;
  if (key === "ArrowDown") selectedPiece.y += step;
  selectedPiece.x = Math.max(0, Math.min(canvas.width - board.cellWidth, selectedPiece.x));
  selectedPiece.y = Math.max(0, Math.min(canvas.height - board.cellHeight, selectedPiece.y));
  if (key === "Enter" || key === " ") { snapSelectedPiece(); if (selectedPiece.locked) selectedPiece = null; }
  drawPuzzle();
}

runtimeDebugState = () => ({ level: currentCampaignLevel().number, imageLevel: activeLevelId, imageLevelCount: config.imageLevels.length, pieceCount: activePieceCount, placedCount, moves, boardAspect: Number((board.width / board.height).toFixed(3)), imageAspect: image.naturalWidth ? Number((image.naturalWidth / image.naturalHeight).toFixed(3)) : 0, perimeterZones: 4, clickPlacement: true, keyboardPlacement: true, bounceCount, snapFeedback: snapPulseUntil > performance.now() });
runtimeDebugActions = {
  selectNext: selectNextPuzzlePiece,
  placeSelectedAtHome() {
    if (!selectedPiece) selectNextPuzzlePiece();
    if (!selectedPiece) return false;
    selectedPiece.x = selectedPiece.homeX; selectedPiece.y = selectedPiece.homeY; snapSelectedPiece(); selectedPiece = null; drawPuzzle(); return true;
  },
};

const initialImageRequestId = beginPuzzleImageLoad();
image.addEventListener("load", () => {
  if (initialImageRequestId !== puzzleImageRequestId) return;
  setPuzzleImageLoading(false);
  gridForImage();
  layoutBoard();
  drawPreview();
  setStatus("已选择 " + activeLevelLabel() + " · " + activePieceCount + " 块。");
});
image.src = config.imagePath;
`;
