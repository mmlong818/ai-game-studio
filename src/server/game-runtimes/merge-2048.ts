// 玩法结构遵循 Gabriele Cirulli 2048（MIT）的公开规则；本文件为平台独立重制，未复制上游视听资产。
export const merge2048Script = String.raw`
const boardSize = 4;
const mergeMoveDuration = 168;
const mergeSpawnDuration = 138;
const mergeSessionKey = config.campaignStorageKey + ":merge-session-v2";
const mergeBlueprints = [
  { name: "成双启程", target: 64, missionType: "target", missionValue: 64, moveLimit: 0, undo: 2, opening: [[0,0,0,0],[0,2,0,0],[0,0,2,0],[0,0,0,0]] },
  { name: "角落锚点", target: 64, missionType: "corner", missionValue: 32, moveLimit: 0, undo: 2, opening: [[2,0,0,0],[0,2,0,0],[0,0,4,0],[0,0,0,0]] },
  { name: "余白四格", target: 64, missionType: "reserve", missionValue: 6, moveLimit: 0, undo: 2, opening: [[2,0,0,2],[0,4,0,0],[0,0,0,0],[0,0,0,0]] },
  { name: "六十四结点", target: 64, missionType: "target", missionValue: 64, moveLimit: 42, undo: 2, opening: [[0,0,0,0],[2,2,0,0],[0,0,4,0],[0,0,0,0]] },
  { name: "双并同拍", target: 128, missionType: "multi", missionValue: 2, moveLimit: 0, undo: 2, opening: [[2,2,0,0],[2,2,0,0],[0,0,4,0],[0,0,0,0]] },
  { name: "三段回声", target: 128, missionType: "streak", missionValue: 3, moveLimit: 0, undo: 2, opening: [[2,2,4,4],[0,0,0,0],[0,2,0,2],[0,0,0,0]] },
  { name: "高低分流", target: 128, missionType: "edge", missionValue: 32, moveLimit: 0, undo: 2, opening: [[16,8,4,2],[0,0,0,0],[2,0,2,0],[0,0,0,0]] },
  { name: "百二十八核", target: 128, missionType: "target", missionValue: 128, moveLimit: 68, undo: 2, opening: [[8,4,2,0],[4,2,0,0],[2,0,0,0],[0,0,0,0]] },
  { name: "下一块·二", target: 256, missionType: "preview-two", missionValue: 4, moveLimit: 0, undo: 2, opening: [[0,2,0,0],[0,2,0,0],[0,4,0,0],[0,0,0,0]] },
  { name: "下一块·四", target: 256, missionType: "preview-four", missionValue: 2, moveLimit: 0, undo: 2, opening: [[4,0,4,0],[0,2,0,2],[0,0,0,0],[0,0,0,0]] },
  { name: "预兆转向", target: 256, missionType: "preview", missionValue: 6, moveLimit: 0, undo: 2, opening: [[8,4,0,0],[4,2,0,0],[0,0,2,0],[0,0,0,0]] },
  { name: "二百五十六门", target: 256, missionType: "target", missionValue: 256, moveLimit: 96, undo: 2, opening: [[16,8,4,2],[8,4,2,0],[4,2,0,0],[0,0,0,0]] },
  { name: "密阵开局", target: 512, missionType: "reserve", missionValue: 5, moveLimit: 0, undo: 2, opening: [[2,4,8,16],[4,8,0,0],[2,4,0,0],[0,0,0,0]] },
  { name: "一步回溯", target: 512, missionType: "undo", missionValue: 1, moveLimit: 0, undo: 1, opening: [[2,2,4,8],[0,0,4,8],[0,0,0,0],[0,0,0,0]] },
  { name: "限步织造", target: 512, missionType: "target", missionValue: 512, moveLimit: 118, undo: 1, opening: [[32,16,8,4],[16,8,4,2],[0,0,0,0],[0,0,0,0]] },
  { name: "五百一十二塔", target: 512, missionType: "edge", missionValue: 256, moveLimit: 124, undo: 1, opening: [[64,32,16,8],[0,8,4,2],[0,0,0,0],[0,0,0,0]] },
  { name: "千位角锚", target: 1024, missionType: "corner", missionValue: 512, moveLimit: 0, undo: 1, opening: [[128,64,32,16],[64,32,16,8],[0,0,4,2],[0,0,0,0]] },
  { name: "零撤销局", target: 1024, missionType: "target", missionValue: 1024, moveLimit: 166, undo: 0, opening: [[128,64,32,16],[64,32,16,8],[32,16,8,4],[0,0,0,2]] },
  { name: "连锁三响", target: 1024, missionType: "streak", missionValue: 5, moveLimit: 0, undo: 1, opening: [[64,64,32,32],[16,16,8,8],[4,4,2,2],[0,0,0,0]] },
  { name: "二〇四八核心", target: 2048, missionType: "target", missionValue: 2048, moveLimit: 0, undo: 1, opening: [[256,128,64,32],[128,64,32,16],[64,32,16,8],[4,2,0,0]] },
];

let board2048 = [];
let mergeScore = 0;
let bestTile = 2;
let historicalBest = 0;
let mergeTarget = 64;
let mergeBlueprint = mergeBlueprints[0];
let mergeNextValue = 2;
let mergeRngState = 1;
let mergeHistory = null;
let mergeAnimation = null;
let mergeQueuedDirection = null;
let mergeLastSpawn = null;
let mergeInvalidUntil = 0;
let mergeInvalidDirection = "";
let mergeUndoCredits = 2;
let mergeMoves = 0;
let mergeMerges = 0;
let mergePeakStreak = 0;
let mergeStreak = 0;
let mergeBestMulti = 0;
let mergePreviewTwos = 0;
let mergePreviewFours = 0;
let mergeUndoUsed = 0;
let mergeEndless = false;
let mergeContinueState = null;
let mergeTutorialVisible = true;

function activeMergeBlueprint() {
  return mergeBlueprints[Math.max(0, Math.min(mergeBlueprints.length - 1, currentCampaignLevel().number - 1))];
}

function emptyBoard() {
  return Array.from({ length: boardSize }, () => Array(boardSize).fill(0));
}

function cloneBoard(value) {
  return value.map((row) => [...row]);
}

function readHistoricalBest() {
  try { return Math.max(0, Number(safeStorage.getItem(config.campaignStorageKey + ":2048-best")) || 0); } catch { return 0; }
}

function writeHistoricalBest() {
  historicalBest = Math.max(historicalBest, mergeScore);
  try { safeStorage.setItem(config.campaignStorageKey + ":2048-best", String(historicalBest)); } catch {}
}

function seedMergeRandom() {
  mergeRngState = (currentCampaignLevel().seed ^ 0x2048cafe) >>> 0;
  if (!mergeRngState) mergeRngState = 1;
}

function mergeRandom() {
  mergeRngState = (Math.imul(1664525, mergeRngState) + 1013904223) >>> 0;
  return mergeRngState / 4294967296;
}

function chooseSpawnValue() {
  const fourChance = config.difficulty === "relaxed" ? .05 : config.difficulty === "challenging" ? .18 : .1;
  return mergeRandom() < fourChance ? 4 : 2;
}

function availableCells(value = board2048) {
  const cells = [];
  for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
    if (value[row][column] === 0) cells.push({ row, column });
  }
  return cells;
}

function spawnNumber() {
  const cells = availableCells();
  if (!cells.length) return false;
  const cell = cells[Math.floor(mergeRandom() * cells.length)];
  const value = mergeNextValue;
  board2048[cell.row][cell.column] = value;
  mergeLastSpawn = { row: cell.row, column: cell.column, value, at: performance.now() };
  if (value === 4) mergePreviewFours += 1; else mergePreviewTwos += 1;
  mergeNextValue = chooseSpawnValue();
  return true;
}

function lineCoordinates(index, direction) {
  const coordinates = [];
  for (let offset = 0; offset < boardSize; offset += 1) {
    if (direction === "left") coordinates.push({ row: index, column: offset });
    if (direction === "right") coordinates.push({ row: index, column: boardSize - 1 - offset });
    if (direction === "up") coordinates.push({ row: offset, column: index });
    if (direction === "down") coordinates.push({ row: boardSize - 1 - offset, column: index });
  }
  return coordinates;
}

function resolveMergeMove(source, direction) {
  const next = emptyBoard();
  const movements = [];
  const mergedCells = [];
  let scoreGain = 0;
  for (let lineIndex = 0; lineIndex < boardSize; lineIndex += 1) {
    const coordinates = lineCoordinates(lineIndex, direction);
    const items = coordinates.map((from) => ({ value: source[from.row][from.column], from })).filter((item) => item.value > 0);
    let itemIndex = 0;
    let destinationIndex = 0;
    while (itemIndex < items.length) {
      const first = items[itemIndex];
      const second = items[itemIndex + 1];
      const to = coordinates[destinationIndex];
      if (second && first.value === second.value) {
        const resultValue = first.value * 2;
        next[to.row][to.column] = resultValue;
        movements.push({ from: first.from, to, value: first.value, merged: true }, { from: second.from, to, value: second.value, merged: true });
        mergedCells.push({ ...to, value: resultValue });
        scoreGain += resultValue;
        itemIndex += 2;
      } else {
        next[to.row][to.column] = first.value;
        movements.push({ from: first.from, to, value: first.value, merged: false });
        itemIndex += 1;
      }
      destinationIndex += 1;
    }
  }
  return { next, movements, mergedCells, scoreGain, changed: JSON.stringify(next) !== JSON.stringify(source) };
}

function hasAvailableMove(value = board2048) {
  if (availableCells(value).length) return true;
  for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
    const current = value[row][column];
    if (row + 1 < boardSize && value[row + 1][column] === current) return true;
    if (column + 1 < boardSize && value[row][column + 1] === current) return true;
  }
  return false;
}

function boardHasMonotonicEdge() {
  const edges = [board2048[0], board2048[3], board2048.map((row) => row[0]), board2048.map((row) => row[3])];
  return edges.some((edge) => {
    const values = edge.filter(Boolean);
    if (values.length < 3) return false;
    const down = values.every((value, index) => index === 0 || values[index - 1] >= value);
    const up = values.every((value, index) => index === 0 || values[index - 1] <= value);
    return down || up;
  });
}

function bestTileInCorner() {
  return [board2048[0][0], board2048[0][3], board2048[3][0], board2048[3][3]].includes(bestTile);
}

function mergeMissionProgress() {
  const type = mergeBlueprint.missionType;
  if (type === "target") return bestTile;
  if (type === "corner") return bestTileInCorner() ? bestTile : 0;
  if (type === "reserve") return availableCells().length;
  if (type === "multi") return mergeBestMulti;
  if (type === "streak") return mergePeakStreak;
  if (type === "edge") return boardHasMonotonicEdge() ? Math.max(...board2048.flat()) : 0;
  if (type === "preview-two") return mergePreviewTwos;
  if (type === "preview-four") return mergePreviewFours;
  if (type === "preview") return mergePreviewTwos + mergePreviewFours;
  if (type === "undo") return mergeUndoUsed;
  return bestTile;
}

function mergeMissionLabel() {
  const labels = {
    target: "合成目标数字", corner: "让最高数字停在角落", reserve: "移动后保留空格", multi: "一次完成多组合并",
    streak: "连续有效合并", edge: "建立单调边缘", "preview-two": "利用即将出现的 2", "preview-four": "利用即将出现的 4",
    preview: "根据下一块连续规划", undo: "使用一次回溯再完成目标",
  };
  return labels[mergeBlueprint.missionType] || "合成目标数字";
}

function mergeMissionComplete() {
  const progress = mergeMissionProgress();
  const missionMet = progress >= mergeBlueprint.missionValue;
  const foundation = mergeBlueprint.missionType === "target" ? true : bestTile >= Math.min(mergeBlueprint.target, 64);
  return missionMet && foundation;
}

function mergeSnapshot() {
  return {
    board: cloneBoard(board2048), score: mergeScore, bestTile, nextValue: mergeNextValue, rngState: mergeRngState,
    undoCredits: mergeUndoCredits, moves: mergeMoves, merges: mergeMerges, streak: mergeStreak, peakStreak: mergePeakStreak,
    bestMulti: mergeBestMulti, previewTwos: mergePreviewTwos, previewFours: mergePreviewFours, undoUsed: mergeUndoUsed,
  };
}

function restoreMergeSnapshot(state) {
  board2048 = cloneBoard(state.board); mergeScore = state.score; bestTile = state.bestTile; mergeNextValue = state.nextValue;
  mergeRngState = state.rngState; mergeUndoCredits = state.undoCredits; mergeMoves = state.moves; mergeMerges = state.merges;
  mergeStreak = state.streak; mergePeakStreak = state.peakStreak; mergeBestMulti = state.bestMulti;
  mergePreviewTwos = state.previewTwos; mergePreviewFours = state.previewFours; mergeUndoUsed = state.undoUsed;
}

function saveMergeSession() {
  if (!running || mergeEndless) return;
  try { safeStorage.setItem(mergeSessionKey, JSON.stringify({ schema: 2, level: currentCampaignLevel().number, snapshot: mergeSnapshot() })); } catch {}
}

function restoreMergeSession() {
  try {
    const saved = JSON.parse(safeStorage.getItem(mergeSessionKey) || "null");
    if (saved?.schema !== 2 || saved.level !== currentCampaignLevel().number || !Array.isArray(saved.snapshot?.board)) return false;
    restoreMergeSnapshot(saved.snapshot);
    return true;
  } catch { return false; }
}

function clearMergeSession() {
  try { safeStorage.removeItem(mergeSessionKey); } catch {}
}

function updateMergeStatus(message) {
  setMetric(bestTile + " / " + (mergeEndless ? "∞" : mergeTarget));
  setStatus(message || ("分数 " + mergeScore + " · " + availableCells().length + " 空位 · 下一块 " + mergeNextValue));
}

function undoMergeMove() {
  if (!running || mergeAnimation || !mergeHistory || mergeUndoCredits <= 0) {
    if (running && mergeUndoCredits <= 0) setStatus("本关没有可用回溯。 ");
    return;
  }
  const creditsAfterUndo = mergeUndoCredits - 1;
  restoreMergeSnapshot(mergeHistory);
  mergeUndoCredits = creditsAfterUndo;
  mergeUndoUsed += 1;
  mergeHistory = null;
  mergeLastSpawn = null;
  playSound("move");
  updateMergeStatus("已回溯一步 · 剩余 " + mergeUndoCredits + " 次");
  saveMergeSession();
  drawMergeBoard();
}

function handleMergeVictory() {
  if (mergeEndless || !mergeMissionComplete()) return false;
  clearMergeSession();
  writeHistoricalBest();
  const detail = mergeBlueprint.name + "完成 · " + mergeMoves + " 步 · " + mergeScore + " 分。";
  const finalLevel = currentCampaignLevel().number === mergeBlueprints.length;
  if (finalLevel) {
    mergeContinueState = mergeSnapshot();
    startButton.dataset.mergeContinue = "1";
  }
  showResult(true, "矩阵稳定", detail);
  if (finalLevel) startButton.textContent = "继续无尽";
  return true;
}

function finishMergeMove(animation) {
  if (mergeAnimation !== animation) return;
  mergeAnimation = null;
  spawnNumber();
  writeHistoricalBest();
  saveMergeSession();
  if (handleMergeVictory()) return;
  if (mergeBlueprint.moveLimit && mergeMoves >= mergeBlueprint.moveLimit) {
    clearMergeSession();
    showResult(false, "步数耗尽", "最高数字 " + bestTile + " · 任务进度 " + mergeMissionProgress() + " / " + mergeBlueprint.missionValue);
    return;
  }
  if (!hasAvailableMove()) {
    clearMergeSession();
    showResult(false, "矩阵锁死", "棋盘没有可移动方向；最高数字为 " + bestTile + "。 ");
    return;
  }
  updateMergeStatus();
  const queued = mergeQueuedDirection;
  mergeQueuedDirection = null;
  drawMergeBoard();
  if (queued) moveBoard(queued);
}

function moveBoard(direction) {
  if (!running) return;
  if (mergeAnimation) { mergeQueuedDirection = direction; return; }
  const before = mergeSnapshot();
  const result = resolveMergeMove(board2048, direction);
  if (!result.changed) {
    mergeInvalidDirection = direction;
    mergeInvalidUntil = performance.now() + 150;
    playSound("fail");
    drawMergeBoard();
    return;
  }
  mergeTutorialVisible = false;
  mergeHistory = before;
  board2048 = result.next;
  mergeScore += result.scoreGain;
  mergeMoves += 1;
  mergeMerges += result.mergedCells.length;
  mergeBestMulti = Math.max(mergeBestMulti, result.mergedCells.length);
  mergeStreak = result.mergedCells.length ? mergeStreak + 1 : 0;
  mergePeakStreak = Math.max(mergePeakStreak, mergeStreak);
  bestTile = Math.max(bestTile, ...board2048.flat());
  mergeAnimation = { ...result, before: before.board, startedAt: performance.now() };
  playSound(result.mergedCells.length ? "collect" : "move");
  drawMergeBoard();
}

function mergeLayout() {
  const portrait = config.aspectRatio === "9:16";
  const frameSize = portrait ? 660 : 596;
  const sceneHeight = gameSceneHeight();
  return { portrait, frameSize, originX: (720 - frameSize) / 2, originY: portrait ? 294 : (sceneHeight - frameSize) / 2, sceneHeight };
}

function tileColor(value) {
  const level = value ? Math.round(Math.log2(value)) : 0;
  return value ? palette.pieces[(level - 1) % palette.pieces.length] : palette.surfaceSoft;
}

function tileFontSize(value, size) {
  const digits = String(value).length;
  return Math.round(size * (digits <= 2 ? .42 : digits === 3 ? .35 : digits === 4 ? .29 : .24));
}

function drawTileNumber(value, x, y, size, alpha = 1) {
  if (!value) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  ctx.font = "850 " + tileFontSize(value, size) + "px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  ctx.strokeStyle = "rgba(255,252,242,.94)";
  ctx.lineWidth = Math.max(4, size * .045);
  ctx.strokeText(String(value), x + size / 2, y + size / 2 + 2);
  ctx.fillStyle = value >= 256 ? "#171a1f" : "#2b2825";
  ctx.fillText(String(value), x + size / 2, y + size / 2 + 2);
  ctx.restore();
}

function drawMergeTile(value, x, y, size, options = {}) {
  const level = value ? Math.round(Math.log2(value)) : 0;
  const sprite = value ? 1 + ((level - 1) % 6) : 0;
  const scale = options.scale || 1;
  const actual = size * scale;
  const dx = x + (size - actual) / 2;
  const dy = y + (size - actual) / 2;
  drawBitmapSprite(sprite, dx, dy, actual, actual, { fallback: tileColor(value), radius: 22, padding: 0, scale: 1.08, alpha: options.alpha ?? (value ? 1 : .38) });
  if (value) drawTileNumber(value, dx, dy, actual, options.alpha ?? 1);
}

function drawMergeHud(layout) {
  if (!layout.portrait) return;
  const cards = [
    { x: 34, width: 206, label: "本关目标", value: mergeEndless ? "无尽" : mergeTarget },
    { x: 254, width: 206, label: "下一块", value: mergeNextValue },
    { x: 474, width: 212, label: "剩余步数", value: mergeBlueprint.moveLimit ? Math.max(0, mergeBlueprint.moveLimit - mergeMoves) : "∞" },
  ];
  cards.forEach((card, index) => {
    drawPlayfield(card.x, 86, card.width, 142, { radius: 24, alpha: .88 });
    ctx.textAlign = "center";
    ctx.fillStyle = palette.textSoft;
    ctx.font = "650 20px Inter, sans-serif";
    ctx.fillText(card.label, card.x + card.width / 2, 126);
    ctx.fillStyle = palette.text;
    ctx.font = "850 " + (index === 1 ? 48 : 42) + "px ui-monospace, SFMono-Regular, monospace";
    ctx.fillText(String(card.value), card.x + card.width / 2, 190);
  });
}

function drawMergeMission(layout) {
  if (!layout.portrait) return;
  drawPlayfield(42, 1000, 636, 132, { radius: 28, alpha: .84 });
  ctx.textAlign = "left";
  ctx.fillStyle = palette.textSoft;
  ctx.font = "650 20px Inter, sans-serif";
  ctx.fillText("第 " + currentCampaignLevel().number + " 关 · " + mergeBlueprint.name, 72, 1039);
  ctx.fillStyle = palette.text;
  ctx.font = "760 25px Inter, sans-serif";
  ctx.fillText(mergeMissionLabel(), 72, 1080);
  ctx.textAlign = "right";
  ctx.fillStyle = mergeMissionComplete() ? palette.highlight : palette.textSoft;
  ctx.font = "800 22px ui-monospace, SFMono-Regular, monospace";
  ctx.fillText(mergeMissionProgress() + " / " + mergeBlueprint.missionValue, 648, 1080);
  ctx.textAlign = "left";
  ctx.fillStyle = palette.textSoft;
  ctx.font = "560 18px Inter, sans-serif";
  ctx.fillText("分数 " + mergeScore + " · 空位 " + availableCells().length + " · 回溯 " + mergeUndoCredits, 72, 1111);
  if (mergeTutorialVisible) {
    drawPlayfield(126, 1160, 468, 64, { radius: 32, alpha: .9 });
    ctx.textAlign = "center";
    ctx.fillStyle = palette.text;
    ctx.font = "700 21px Inter, sans-serif";
    ctx.fillText("在棋盘上滑动 · 相同数字只合并一次", 360, 1201);
  }
}

function drawMergeBoard() {
  clearCanvas();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const layout = mergeLayout();
  drawMergeHud(layout);
  const gap = layout.portrait ? 12 : 11;
  const inset = 14;
  const cell = (layout.frameSize - inset * 2 - gap * 3) / boardSize;
  let boardOffsetX = 0;
  const now = performance.now();
  if (mergeInvalidUntil > now) {
    const amount = Math.sin((1 - (mergeInvalidUntil - now) / 150) * Math.PI) * 8;
    boardOffsetX = mergeInvalidDirection === "left" ? -amount : mergeInvalidDirection === "right" ? amount : 0;
  }
  ctx.save();
  ctx.translate(boardOffsetX, 0);
  ctx.beginPath();
  ctx.roundRect(layout.originX, layout.originY, layout.frameSize, layout.frameSize, 34);
  ctx.fillStyle = "rgba(25,31,39,.64)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,252,241,.7)";
  ctx.lineWidth = 3;
  ctx.stroke();
  for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
    const x = layout.originX + inset + column * (cell + gap);
    const y = layout.originY + inset + row * (cell + gap);
    drawMergeTile(0, x, y, cell);
  }
  if (mergeAnimation) {
    const progress = Math.max(0, Math.min(1, (now - mergeAnimation.startedAt) / mergeMoveDuration));
    const eased = 1 - Math.pow(1 - progress, 3);
    mergeAnimation.movements.forEach((movement) => {
      const fromX = layout.originX + inset + movement.from.column * (cell + gap);
      const fromY = layout.originY + inset + movement.from.row * (cell + gap);
      const toX = layout.originX + inset + movement.to.column * (cell + gap);
      const toY = layout.originY + inset + movement.to.row * (cell + gap);
      drawMergeTile(movement.value, fromX + (toX - fromX) * eased, fromY + (toY - fromY) * eased, cell, { alpha: movement.merged ? .92 : 1 });
    });
    if (progress >= 1) finishMergeMove(mergeAnimation);
  } else {
    for (let row = 0; row < boardSize; row += 1) for (let column = 0; column < boardSize; column += 1) {
      const value = board2048[row][column];
      if (!value) continue;
      const x = layout.originX + inset + column * (cell + gap);
      const y = layout.originY + inset + row * (cell + gap);
      let scale = 1;
      if (mergeLastSpawn?.row === row && mergeLastSpawn?.column === column && now - mergeLastSpawn.at < mergeSpawnDuration) {
        const progress = Math.max(0, Math.min(1, (now - mergeLastSpawn.at) / mergeSpawnDuration));
        scale = .72 + .28 * (1 - Math.pow(1 - progress, 3));
      }
      drawMergeTile(value, x, y, cell, { scale });
    }
  }
  ctx.restore();
  drawMergeMission(layout);
  ctx.restore();
  finishCanvasStyle();
  if (mergeAnimation || mergeInvalidUntil > now || (mergeLastSpawn && now - mergeLastSpawn.at < mergeSpawnDuration)) requestAnimationFrame(drawMergeBoard);
}

function setupOpening() {
  board2048 = cloneBoard(mergeBlueprint.opening);
  bestTile = Math.max(2, ...board2048.flat());
  mergeNextValue = chooseSpawnValue();
}

function resetMergeStats() {
  mergeScore = 0; mergeHistory = null; mergeAnimation = null; mergeQueuedDirection = null; mergeLastSpawn = null;
  mergeUndoCredits = mergeBlueprint.undo; mergeMoves = 0; mergeMerges = 0; mergePeakStreak = 0; mergeStreak = 0;
  mergeBestMulti = 0; mergePreviewTwos = 0; mergePreviewFours = 0; mergeUndoUsed = 0; mergeTutorialVisible = true;
}

function startGame() {
  mergeBlueprint = activeMergeBlueprint();
  mergeTarget = mergeBlueprint.target;
  historicalBest = readHistoricalBest();
  if (startButton.dataset.mergeContinue === "1" && mergeContinueState) {
    restoreMergeSnapshot(mergeContinueState);
    mergeEndless = true;
    mergeHistory = null;
    mergeContinueState = null;
    delete startButton.dataset.mergeContinue;
    startButton.textContent = "开始游戏";
  } else {
    mergeEndless = false;
    seedMergeRandom();
    resetMergeStats();
    if (!restoreMergeSession()) setupOpening();
  }
  running = true;
  hideOverlay();
  updateMergeStatus("第 " + currentCampaignLevel().number + " 关 · " + mergeBlueprint.name + " · 下一块 " + mergeNextValue);
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

let mergeSwipeStart = null;
canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  mergeSwipeStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture?.(event.pointerId);
});
canvas.addEventListener("pointerup", (event) => {
  if (!mergeSwipeStart || mergeSwipeStart.id !== event.pointerId) return;
  const dx = event.clientX - mergeSwipeStart.x;
  const dy = event.clientY - mergeSwipeStart.y;
  mergeSwipeStart = null;
  canvas.releasePointerCapture?.(event.pointerId);
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  handleControl(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
});
canvas.addEventListener("pointercancel", () => { mergeSwipeStart = null; });
canvas.addEventListener("lostpointercapture", () => { mergeSwipeStart = null; });

restartButton.addEventListener("click", () => {
  if (restartButton.textContent === "再次点击重开") clearMergeSession();
});

onCampaignLevelChanged = () => {
  mergeBlueprint = activeMergeBlueprint();
  mergeTarget = mergeBlueprint.target;
  clearMergeSession();
  if (!running) drawMergeBoard();
};

runtimeDebugState = () => ({
  level: currentCampaignLevel().number, blueprintName: mergeBlueprint.name, blueprintCount: mergeBlueprints.length,
  uniqueBlueprintNames: new Set(mergeBlueprints.map((item) => item.name)).size, target: mergeTarget, board: cloneBoard(board2048),
  bestTile, score: mergeScore, historicalBest, availableCells: availableCells().length, danger: availableCells().length <= 2,
  nextValue: mergeNextValue, canUndo: Boolean(mergeHistory) && mergeUndoCredits > 0, undoCredits: mergeUndoCredits,
  moves: mergeMoves, merges: mergeMerges, missionType: mergeBlueprint.missionType, missionProgress: mergeMissionProgress(),
  missionValue: mergeBlueprint.missionValue, missionComplete: mergeMissionComplete(), moveLimit: mergeBlueprint.moveLimit,
  animation: mergeAnimation ? { duration: mergeMoveDuration, queued: mergeQueuedDirection } : null,
  spawnAnimated: Boolean(mergeLastSpawn && performance.now() - mergeLastSpawn.at < mergeSpawnDuration), directSwipe: true,
  spawnDistribution: config.difficulty === "relaxed" ? "95/5" : config.difficulty === "challenging" ? "82/18" : "90/10",
  rngState: mergeRngState, endless: mergeEndless,
});

runtimeDebugActions = {
  undo: undoMergeMove,
  finishAnimation() {
    if (mergeAnimation) finishMergeMove(mergeAnimation);
    if (mergeLastSpawn) mergeLastSpawn.at = performance.now();
    drawMergeBoard();
  },
  prepareMerge() {
    board2048 = emptyBoard(); board2048[3][0] = 2; board2048[3][1] = 2; mergeScore = 0; bestTile = 2;
    mergeHistory = null; mergeAnimation = null; mergeNextValue = 2; drawMergeBoard();
  },
  prepareDoubleMerge() {
    board2048 = emptyBoard(); board2048[3] = [2,2,2,2]; mergeScore = 0; bestTile = 2;
    mergeHistory = null; mergeAnimation = null; mergeNextValue = 2; drawMergeBoard();
  },
  prepareDanger() {
    board2048 = [[2,4,8,16],[4,8,16,32],[8,16,32,64],[16,32,0,0]]; bestTile = 64;
    mergeHistory = null; mergeAnimation = null; drawMergeBoard();
  },
  prepareNoop() {
    board2048 = [[2,4,8,16],[0,0,0,0],[0,0,0,0],[0,0,0,0]]; bestTile = 16;
    mergeHistory = null; mergeAnimation = null; drawMergeBoard();
  },
};

mergeBlueprint = activeMergeBlueprint();
seedMergeRandom();
setupOpening();
drawMergeBoard();
`;
