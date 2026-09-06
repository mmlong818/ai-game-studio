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

// Main progression is numerical; technique tasks are optional honours, never a random-spawn gate.
mergeBlueprints.forEach((blueprint,index)=>{
  blueprint.target=[128,256,512,1024,2048][Math.floor(index/4)];
  if(blueprint.missionType==="target")blueprint.missionValue=blueprint.target;
});
for(const [index,name] of [[3,"百二十八结点"],[7,"二百五十六核"],[11,"五百一十二门"],[14,"从容织造"],[15,"千位高塔"]])mergeBlueprints[index].name=name;

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
let mergeTrackedSpawn = null;
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
let mergeTutorialMode = null;
let mergePracticeReturn = null;
let mergeSelectedMode = "campaign";
let mergeLevelNumber = 1;
let mergeMilestone = null;
let mergeBurst = null;
let mergeHintVisible = false;
let mergeHintUses = 0;

function mergeStorageKey() {
  return config.campaignStorageKey+":merge-journey-v3:"+(mergeEndless?"endless":"level-"+mergeLevelNumber);
}

function mergeDirectionOptions() {
  return ["left","up","right","down"].map(direction=>{
    const result=resolveMergeMove(board2048,direction);
    return {direction,legal:result.changed,gain:result.scoreGain,pairs:result.mergedCells.length,
      spacesAfterSpawn:Math.max(0,availableCells(result.next).length-1)};
  });
}

function validMergeSnapshot(state) {
  const whole=value=>Number.isSafeInteger(value)&&value>=0;
  if(!state||!Array.isArray(state.board)||state.board.length!==4||!state.board.every(row=>Array.isArray(row)&&row.length===4&&row.every(value=>whole(value)&&(value===0||(value>=2&&Number.isInteger(Math.log2(value)))))))return false;
  if(!["score","bestTile","rngState","undoCredits","moves","merges","streak","peakStreak","bestMulti","previewTwos","previewFours","undoUsed"].every(key=>whole(state[key])))return false;
  if(![2,4].includes(state.nextValue)||state.bestTile!==Math.max(2,...state.board.flat()))return false;
  const tracked=state.trackedSpawn;
  return !tracked||(Number.isInteger(tracked.row)&&tracked.row>=0&&tracked.row<4&&Number.isInteger(tracked.column)&&tracked.column>=0&&tracked.column<4&&state.board[tracked.row][tracked.column]===tracked.value&&[2,4].includes(tracked.value));
}

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
  mergeTrackedSpawn = { row: cell.row, column: cell.column, value };
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
    streak: "连续有效合并", edge: "建立单调边缘", "preview-two": "下一步合并新出现的 2", "preview-four": "下一步合并新出现的 4",
    preview: "下一步合并新生块", undo: "使用一次回溯再完成目标",
  };
  return labels[mergeBlueprint.missionType] || "合成目标数字";
}

function mergeMissionComplete() {
  return !mergeEndless && bestTile >= mergeTarget;
}

function mergeSnapshot() {
  return {
    board: cloneBoard(board2048), score: mergeScore, bestTile, nextValue: mergeNextValue, rngState: mergeRngState,
    undoCredits: mergeUndoCredits, moves: mergeMoves, merges: mergeMerges, streak: mergeStreak, peakStreak: mergePeakStreak,
    bestMulti: mergeBestMulti, previewTwos: mergePreviewTwos, previewFours: mergePreviewFours, undoUsed: mergeUndoUsed,
    missionSchema: 3, trackedSpawn: mergeTrackedSpawn ? { ...mergeTrackedSpawn } : null,
    hintUses: mergeHintUses,
  };
}

function restoreMergeSnapshot(state) {
  board2048 = cloneBoard(state.board); mergeScore = state.score; bestTile = state.bestTile; mergeNextValue = state.nextValue;
  mergeRngState = state.rngState; mergeUndoCredits = state.undoCredits; mergeMoves = state.moves; mergeMerges = state.merges;
  mergeStreak = state.streak; mergePeakStreak = state.peakStreak; mergeBestMulti = state.bestMulti;
  // 旧存档记录的是随机生成次数，不能作为新任务的掌握证据；棋盘、分数和关卡保留。
  mergePreviewTwos = state.missionSchema === 3 ? state.previewTwos : 0;
  mergePreviewFours = state.missionSchema === 3 ? state.previewFours : 0;
  mergeTrackedSpawn = state.missionSchema === 3 && state.trackedSpawn ? { ...state.trackedSpawn } : null;
  mergeUndoUsed = state.undoUsed;
  mergeHintUses = Number.isSafeInteger(state.hintUses)&&state.hintUses>=0?state.hintUses:0;
}

function saveMergeSession() {
  if (!running || mergeTutorialMode || mergeAnimation) return;
  try { safeStorage.setItem(mergeStorageKey(), JSON.stringify({ schema: 3, snapshot: mergeSnapshot(), history: mergeHistory })); } catch {}
}

function restoreMergeSession() {
  try {
    let saved = JSON.parse(safeStorage.getItem(mergeStorageKey()) || "null");
    // Migrate an old current-level board without removing the old record.
    if(!saved&&!mergeEndless){const legacy=JSON.parse(safeStorage.getItem(mergeSessionKey)||"null");if(legacy?.schema===2&&legacy.level===mergeLevelNumber)saved=legacy;}
    if (![2,3].includes(saved?.schema) || !validMergeSnapshot(saved.snapshot)) return false;
    restoreMergeSnapshot(saved.snapshot);
    mergeHistory=saved.schema===3&&validMergeSnapshot(saved.history)?saved.history:null;
    return true;
  } catch { return false; }
}

function clearMergeSession() {
  // Tombstone prevents a deliberately restarted v3 session from re-importing an old v2 board.
  try { safeStorage.setItem(mergeStorageKey(),JSON.stringify({schema:3,retired:true})); } catch {}
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
  const helpUses=mergeHintUses;
  restoreMergeSnapshot(mergeHistory);
  mergeHintUses=helpUses;
  mergeUndoCredits = creditsAfterUndo;
  mergeUndoUsed += 1;
  mergeHistory = null;
  mergeLastSpawn = null;
  mergeMilestone=null;mergeBurst=null;
  playSound("move");
  updateMergeStatus("已回溯一步 · 剩余 " + mergeUndoCredits + " 次");
  saveMergeSession();
  drawMergeBoard();
}

function handleMergeVictory() {
  if (mergeEndless || !mergeMissionComplete()) return false;
  clearMergeSession();
  writeHistoricalBest();
  const summary={tile:bestTile,moves:mergeMoves,score:mergeScore,multi:mergeBestMulti,streak:mergePeakStreak,spaces:availableCells().length,bonus:mergeMissionProgress()>=mergeBlueprint.missionValue,hints:mergeHintUses};
  const detail = "从小数字织成 "+bestTile+" · "+mergeMoves+" 次滑动，完成 "+mergeMerges+" 组合并。";
  const finalLevel = currentCampaignLevel().number === mergeBlueprints.length;
  if (finalLevel) {
    mergeContinueState = mergeSnapshot();
    startButton.dataset.mergeContinue = "1";
  }
  showResult(true, "矩阵稳定", detail);
  const result=document.createElement("section");result.className="merge-result";
  result.innerHTML="<strong>"+summary.tile+"<small>本关合成达成</small></strong><div><b>"+summary.score+" 分</b><span>单步最多 "+summary.multi+" 并 · 连续 "+summary.streak+" 步合并</span><span>留下 "+summary.spaces+" 个空位 · 方向帮助 "+summary.hints+" 次</span><span>"+(summary.bonus?"技巧挑战达成":"技巧挑战留待下次")+"</span></div>";
  overlay.querySelector(".victory-summary")?.appendChild(result);
  if (finalLevel) startButton.textContent = "继续无尽";
  return true;
}

function finishMergeMove(animation) {
  if (mergeAnimation !== animation) return;
  mergeAnimation = null;
  mergeBurst={cells:animation.mergedCells,at:performance.now()};
  const tutorialMode = mergeTutorialMode;
  if (mergeTutorialMode === "slide") {
    signalOnboarding("board-slid");
    mergeTutorialMode = "merge";
    board2048 = emptyBoard();
    board2048[3] = [0, 0, 2, 2];
    mergeNextValue = 2;
    updateMergeStatus("很好。现在向左滑动，让两个相同数字合并。 ");
    drawMergeBoard();
    return;
  }
  if (mergeTutorialMode === "merge") {
    signalOnboarding("equal-merged-once");
    mergeTutorialMode = null;
    finishMergePractice();
    return;
  }
  if (!tutorialMode) {
    signalOnboarding("board-slid");
    if (animation.mergedCells.length) signalOnboarding("equal-merged-once");
  }
  spawnNumber();
  writeHistoricalBest();
  saveMergeSession();
  if (handleMergeVictory()) return;
  if (!hasAvailableMove()) {
    // Keep a recoverable board when an undo exists, rather than ending before it can be used.
    if(mergeHistory&&mergeUndoCredits>0){updateMergeStatus("没有可滑动方向，可回溯上一步后换个方向。");drawMergeBoard();return;}
    clearMergeSession();
    if(mergeEndless)showTerminalResult(false,"本次纪录 · "+bestTile,"获得 "+mergeScore+" 分，完成 "+mergeMerges+" 组合并。无尽模式不影响关卡星章。");
    else showResult(false, "空间用尽", "最高合成 "+bestTile+" · "+mergeScore+" 分。试着让大数字留在一角，给小数字留路。");
    return;
  }
  updateMergeStatus();
  const queued = mergeQueuedDirection;
  mergeQueuedDirection = null;
  drawMergeBoard();
  if (queued) moveBoard(queued);
}

function recordMergeSpawnUse(result) {
  if (!result.changed || mergeTutorialMode || !mergeTrackedSpawn) return;
  const used = result.movements.some((movement) => movement.merged &&
    movement.from.row === mergeTrackedSpawn.row && movement.from.column === mergeTrackedSpawn.column &&
    movement.value === mergeTrackedSpawn.value);
  if (used) {
    if (mergeTrackedSpawn.value === 4) mergePreviewFours += 1;
    else if (mergeTrackedSpawn.value === 2) mergePreviewTwos += 1;
  }
  mergeTrackedSpawn = null;
}

function moveBoard(direction) {
  if (!running) return;
  if (mergeAnimation) { mergeQueuedDirection = direction; return; }
  const expectedTutorialDirection = mergeTutorialMode === "slide" ? "right" : mergeTutorialMode === "merge" ? "left" : null;
  if (expectedTutorialDirection && direction !== expectedTutorialDirection) {
    mergeInvalidDirection = direction;
    mergeInvalidUntil = performance.now() + 150;
    updateMergeStatus(mergeTutorialMode === "slide" ? "先向右滑动，感受整盘移动。 " : "现在向左滑动，让两个 2 合并。 ");
    playSound("fail");
    drawMergeBoard();
    return;
  }
  const before = mergeSnapshot();
  const result = resolveMergeMove(board2048, direction);
  if (!result.changed) {
    mergeInvalidDirection = direction;
    mergeInvalidUntil = performance.now() + 150;
    playSound("fail");
    updateMergeStatus("这个方向已贴边，且没有可合并的相邻同值块。换个方向试试。");
    drawMergeBoard();
    return;
  }
  mergeTutorialVisible = false;
  mergeHistory = before;
  recordMergeSpawnUse(result);
  board2048 = result.next;
  mergeScore += result.scoreGain;
  mergeMoves += 1;
  mergeMerges += result.mergedCells.length;
  mergeBestMulti = Math.max(mergeBestMulti, result.mergedCells.length);
  mergeStreak = result.mergedCells.length ? mergeStreak + 1 : 0;
  mergePeakStreak = Math.max(mergePeakStreak, mergeStreak);
  bestTile = Math.max(bestTile, ...board2048.flat());
  if(!mergeTutorialMode&&bestTile>before.bestTile&&bestTile>=32){mergeMilestone={value:bestTile,at:performance.now()};playSound("reward");}
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
  ctx.fillStyle = value >= 256 ? "#fffaf0" : "#28231f";
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
  const alpha = options.alpha ?? 1;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = value ? tileColor(value) : "rgba(22,36,43,.94)";
  ctx.strokeStyle = value ? "rgba(255,255,255,.7)" : "rgba(152,190,196,.28)";
  ctx.lineWidth = value ? 3 : 2;
  ctx.shadowColor = value ? "rgba(2,9,13,.48)" : "transparent";
  ctx.shadowBlur = value ? 14 : 0;
  ctx.shadowOffsetY = value ? 6 : 0;
  ctx.beginPath(); ctx.roundRect(dx, dy, actual, actual, 22); ctx.fill(); ctx.stroke();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = value ? "rgba(255,255,255,.16)" : "rgba(255,255,255,.035)";
  ctx.beginPath(); ctx.roundRect(dx + 7, dy + 7, actual - 14, Math.max(12, actual * .24), 14); ctx.fill();
  ctx.restore();
  drawBitmapSprite(sprite, dx + 3, dy + 3, actual - 6, actual - 6, { fallback: tileColor(value), radius: 19, padding: 0, scale: 1.08, alpha: alpha * (value ? .72 : .2) });
  if (value) drawTileNumber(value, dx, dy, actual, options.alpha ?? 1);
}

function drawMergeHud(layout) {
  if (!layout.portrait) return;
  const cards = [
    { x: 34, width: 206, label: "本关目标", value: mergeEndless ? "无尽" : mergeTarget },
    { x: 254, width: 206, label: "下一块", value: mergeNextValue },
    { x: 474, width: 212, label: "本局得分", value: mergeScore },
  ];
  cards.forEach((card, index) => {
    ctx.fillStyle="#193344";ctx.beginPath();ctx.roundRect(card.x,86,card.width,142,20);ctx.fill();
    ctx.textAlign = "center";
    ctx.fillStyle = "#bbd1d8";
    ctx.font = "650 20px Inter, sans-serif";
    ctx.fillText(card.label, card.x + card.width / 2, 126);
    ctx.fillStyle = "#edf8fa";
    ctx.font = "850 " + (index === 1 ? 48 : 42) + "px ui-monospace, SFMono-Regular, monospace";
    ctx.fillText(String(card.value), card.x + card.width / 2, 190);
  });
}

function drawMergeMission(layout) {
  if (!layout.portrait) return;
  if(!onboardingIsActive()&&!mergeHintVisible){
  ctx.fillStyle="#193344";ctx.beginPath();ctx.roundRect(42,1000,636,132,22);ctx.fill();
  ctx.textAlign = "left";
  ctx.fillStyle = palette.textSoft;
  ctx.font = "650 20px Inter, sans-serif";
  ctx.fillText(mergeEndless?"自由无尽 · 没有终点": "第 " + mergeLevelNumber + " 关 · " + mergeBlueprint.name, 72, 1039);
  ctx.fillStyle = palette.text;
  ctx.font = "760 21px Inter, sans-serif";
  ctx.fillText(mergeEndless?"保持空位，挑战自己的最高数字":"加分技巧 · "+mergeMissionLabel(), 72, 1080);
  ctx.textAlign = "right";
  ctx.fillStyle = mergeMissionComplete() ? palette.highlight : palette.textSoft;
  ctx.font = "800 22px ui-monospace, SFMono-Regular, monospace";
  if(!mergeEndless&&mergeBlueprint.missionType!=="target")ctx.fillText(Math.min(mergeMissionProgress(),mergeBlueprint.missionValue) + " / " + mergeBlueprint.missionValue, 648, 1039);
  ctx.textAlign = "left";
  ctx.fillStyle = palette.textSoft;
  ctx.font = "560 18px Inter, sans-serif";
  ctx.fillText(availableCells().length<=2?"空间紧张 · 先合并腾空；无路可走时试试回溯":"滑动 "+mergeMoves+" 步 · 空位 " + availableCells().length + " · 回溯 " + mergeUndoCredits, 72, 1111);
  }
  // A single uninterrupted growth track, not separate rounds or automatic modal rewards.
  const marks=mergeEndless?[32,64,128,256,512,1024,2048]:[mergeTarget/4,mergeTarget/2,mergeTarget];
  const width=636/marks.length;
  marks.forEach((value,index)=>{
    const x=42+index*width;
    ctx.fillStyle=bestTile>=value?"#70d6bb":"#45616c";
    ctx.beginPath();ctx.roundRect(x+4,248,width-8,6,3);ctx.fill();
    ctx.textAlign="center";ctx.font="700 18px Consolas,monospace";
    ctx.fillText((bestTile>=value?"✓ ":"")+value,x+width/2,281);
  });
  if(mergeMilestone&&performance.now()-mergeMilestone.at<1100){
    ctx.textAlign="center";ctx.fillStyle="#fff5ca";ctx.font="800 28px 'Microsoft YaHei',sans-serif";
    ctx.fillText("合成 "+mergeMilestone.value+" · 继续织造",360,1190);
  }
  if (mergeTutorialVisible) {
    drawPlayfield(126, 1160, 468, 64, { radius: 32, alpha: .9 });
    ctx.textAlign = "center";
    ctx.fillStyle = palette.text;
    ctx.font = "700 21px Inter, sans-serif";
    ctx.fillText("在棋盘上滑动 · 相同数字只合并一次", 360, 1201);
  }
}

function drawMergeBoard() {
  syncMergeInterface();
  clearCanvas();
  ctx.fillStyle="#102638";ctx.fillRect(0,0,canvas.width,canvas.height);
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
  ctx.fillStyle = "rgba(15,23,30,.94)";
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
      if(mergeBurst&&now-mergeBurst.at<280&&mergeBurst.cells.some(cell=>cell.row===row&&cell.column===column))scale=1+Math.sin((now-mergeBurst.at)/280*Math.PI)*.075;
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
  if (mergeAnimation || mergeInvalidUntil > now || (mergeLastSpawn && now - mergeLastSpawn.at < mergeSpawnDuration) || (mergeBurst&&now-mergeBurst.at<280) || (mergeMilestone&&now-mergeMilestone.at<1100)) requestAnimationFrame(drawMergeBoard);
}

function setupOpening() {
  board2048 = cloneBoard(mergeBlueprint.opening);
  bestTile = Math.max(2, ...board2048.flat());
  mergeNextValue = chooseSpawnValue();
}

function setupMergeTutorial() {
  mergeTrackedSpawn = null;
  const stepId = onboardingState.activeStepId;
  mergeTutorialMode = stepId === "ONBOARD-MERGE" ? "merge" : "slide";
  board2048 = emptyBoard();
  board2048[3] = mergeTutorialMode === "merge" ? [0, 0, 2, 2] : [2, 0, 0, 0];
  bestTile = 2;
  mergeNextValue = 2;
  mergeHistory = null;
  mergeAnimation = null;
  mergeQueuedDirection = null;
  mergeLastSpawn = null;
}

function resetMergeStats() {
  mergeHintUses=0;mergeMilestone=null;
  mergeTrackedSpawn = null;
  mergeScore = 0; mergeHistory = null; mergeAnimation = null; mergeQueuedDirection = null; mergeLastSpawn = null;
  mergeUndoCredits = mergeBlueprint.undo; mergeMoves = 0; mergeMerges = 0; mergePeakStreak = 0; mergeStreak = 0;
  mergeBestMulti = 0; mergePreviewTwos = 0; mergePreviewFours = 0; mergeUndoUsed = 0; mergeTutorialVisible = false; mergeTutorialMode = null;
}

function startGame() {
  mergeLevelNumber=currentCampaignLevel().number;
  mergeBlueprint = activeMergeBlueprint();
  mergeTarget = mergeBlueprint.target;
  historicalBest = readHistoricalBest();
  if (startButton.dataset.mergeContinue === "1" && mergeContinueState) {
    restoreMergeSnapshot(mergeContinueState);
    mergeEndless = true;
    mergeSelectedMode="endless";
    mergeHistory = null;
    mergeContinueState = null;
    delete startButton.dataset.mergeContinue;
    startButton.textContent = "开始游戏";
  } else {
    mergeEndless = mergeSelectedMode==="endless";
    if(mergeEndless)mergeBlueprint=mergeBlueprints[0];
    seedMergeRandom();
    resetMergeStats();
    const restored = restoreMergeSession();
    if (!restored) setupOpening();
    if (startOnboarding()) {mergePracticeReturn={snapshot:mergeSnapshot(),history:mergeHistory};setupMergeTutorial();}
  }
  running = true;
  document.body.dataset.mergeMode=mergeSelectedMode;
  mergeModeBar.querySelectorAll("button").forEach(item=>item.setAttribute("aria-pressed",String(item.dataset.mergeMode===mergeSelectedMode)));
  hideOverlay();
  updateMergeStatus("第 " + currentCampaignLevel().number + " 关 · " + mergeBlueprint.name + " · 下一块 " + mergeNextValue);
  startAmbient();
  drawMergeBoard();
}

function finishMergePractice(){
  mergeTutorialMode=null;mergeAnimation=null;mergeQueuedDirection=null;mergeLastSpawn=null;
  if(mergePracticeReturn){restoreMergeSnapshot(mergePracticeReturn.snapshot);mergeHistory=mergePracticeReturn.history;mergePracticeReturn=null;}
  else{resetMergeStats();setupOpening();}
  updateMergeStatus("练习完成，回到你的棋盘。相同数字相遇时合并。");saveMergeSession();drawMergeBoard();
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

window.addEventListener("forge:onboarding-skip", () => {
  if (!running || !mergeTutorialMode) return;
  finishMergePractice();
  updateMergeStatus("教学已跳过，可以自由滑动。 ");
  drawMergeBoard();
});
window.addEventListener("forge:onboarding-replay", () => {
  if (!running) return;
  if(!mergePracticeReturn){if(mergeAnimation)finishMergeMove(mergeAnimation);mergePracticeReturn={snapshot:mergeSnapshot(),history:mergeHistory};}
  setupMergeTutorial();
  updateMergeStatus("向右滑动，先感受整盘移动。 ");
  drawMergeBoard();
});

restartButton.addEventListener("click", () => {
  if (restartButton.textContent === "再次点击重开") {clearMergeSession();mergePracticeReturn=null;}
});

onCampaignLevelChanged = () => {
  mergeBlueprint = activeMergeBlueprint();
  mergeTarget = mergeBlueprint.target;
  if (!running) drawMergeBoard();
};

const mergeModeBar=document.createElement("div");mergeModeBar.className="merge-modes";mergeModeBar.setAttribute("aria-label","玩法选择");
for(const [value,label] of [["campaign","关卡闯关"],["endless","自由无尽"]]){
  const button=document.createElement("button");button.type="button";button.dataset.mergeMode=value;button.textContent=label;
  button.setAttribute("aria-pressed",String(value===mergeSelectedMode));
  button.addEventListener("click",()=>{mergeSelectedMode=value;document.body.dataset.mergeMode=value;delete startButton.dataset.mergeContinue;mergeContinueState=null;mergeModeBar.querySelectorAll("button").forEach(item=>item.setAttribute("aria-pressed",String(item.dataset.mergeMode===value)));startButton.textContent=value==="endless"?"进入无尽":"开始闯关";});
  mergeModeBar.appendChild(button);
}
startButton.before(mergeModeBar);
overlay.querySelector(".campaign-setup")?.before(mergeModeBar);
overlayTitle.textContent="数织矩阵";
overlayDetail.textContent="滑动棋盘，让相同数字相遇。一步步织出更大的数字。";
const mergeHelpButton=document.createElement("button");mergeHelpButton.type="button";mergeHelpButton.className="control-button";mergeHelpButton.textContent="看方向";mergeHelpButton.setAttribute("aria-expanded","false");
document.querySelector(".touch-controls")?.appendChild(mergeHelpButton);
const mergeHelpPanel=document.createElement("aside");mergeHelpPanel.className="merge-direction-help";mergeHelpPanel.hidden=true;mergeHelpPanel.setAttribute("aria-label","当前棋盘方向预览");document.body.appendChild(mergeHelpPanel);
mergeHelpButton.addEventListener("click",()=>{if(!running||mergeTutorialMode)return;mergeHintVisible=!mergeHintVisible;if(mergeHintVisible)mergeHintUses++;mergeHelpButton.setAttribute("aria-expanded",String(mergeHintVisible));saveMergeSession();drawMergeBoard();});
const mergeStyle=document.createElement("style");
mergeStyle.textContent="body[data-template=merge-2048]{--theme-panel:#193344;--theme-text:#edf8fa;--theme-muted:#bbd1d8;--theme-line:#466375;--theme-accent:#70d6bb;--theme-on-accent:#142d3c;background:#102638;color:#edf8fa}body[data-template=merge-2048] .canvas-frame{background:#102638;border-color:#294c62;box-shadow:none}body[data-template=merge-2048] .game-panel{transform:none}body[data-template=merge-2048] .game-overlay{background:#193344;color:#edf8fa;border:1px solid #648092;border-radius:22px}body[data-template=merge-2048] .game-overlay p{color:#bbd1d8}.merge-modes{display:flex;gap:8px;margin:16px 0}.merge-modes button{flex:1;min-height:46px;border:1px solid #648092;background:#102638;color:#bbd1d8;border-radius:12px;font-weight:700}.merge-modes button[aria-pressed=true]{background:#70d6bb;color:#142d3c;border-color:#70d6bb}.merge-modes button:focus-visible{outline:3px solid #ffda83;outline-offset:2px}.merge-direction-help{position:fixed;z-index:6;padding:10px 12px;border-radius:14px;border:1px solid #648092;background:#193344;color:#edf8fa;font:12px/1.5 'Microsoft YaHei',sans-serif;pointer-events:none}.merge-direction-help[hidden]{display:none}.merge-direction-help strong{display:block;margin-bottom:6px}.merge-direction-help .merge-options{display:grid;grid-template-columns:repeat(4,1fr);gap:5px}.merge-options span{padding:6px 1px;text-align:center;border-radius:8px;background:#294c62}.merge-options .blocked{color:#9bafb8;background:#142d3c}.merge-direction-help small{display:block;margin-top:5px;color:#bbd1d8}.merge-result{display:flex;align-items:center;gap:16px;padding:16px 0;border-top:1px solid #648092;margin-top:14px}.merge-result strong{font:800 42px Consolas,monospace;color:#70d6bb}.merge-result small{display:block;font:11px 'Microsoft YaHei',sans-serif;color:#bbd1d8}.merge-result div{display:grid;gap:6px}.merge-result div span{font-size:11px!important;color:#bbd1d8!important;letter-spacing:0!important}body[data-template=merge-2048] .onboarding-coach{position:fixed;right:auto;bottom:auto;background:#193344;color:#edf8fa;border-color:#648092;border-radius:14px}body[data-template=merge-2048] .control-button{border-radius:12px}body[data-template=merge-2048]:not([data-game-state=playing]) .merge-direction-help{display:none}";
document.head.appendChild(mergeStyle);
mergeStyle.textContent+="body[data-template=merge-2048]:not([data-game-state=playing]) .onboarding-coach{display:none}body[data-template=merge-2048][data-merge-help=true] .onboarding-coach.is-compact{display:none}body[data-template=merge-2048][data-merge-mode=endless] .campaign-setup{display:none}body[data-template=merge-2048] .style-ornament{display:none}";
mergeStyle.textContent+="@media(max-width:720px){body[data-template=merge-2048][data-game-state=playing] .game-controls{width:210px;height:48px;right:12px;bottom:12px}body[data-template=merge-2048][data-game-state=playing] .touch-controls{display:flex;width:210px;height:48px;gap:8px}body[data-template=merge-2048][data-game-state=playing] .touch-controls .control-button{width:101px;height:48px;min-height:48px;border:1px solid #648092;border-radius:14px;background:#193344;color:#edf8fa;box-shadow:none}body[data-template=merge-2048] .onboarding-coach small{display:none}}";
let mergeInterfaceKey="";
function syncMergeInterface(){
  const rect=canvas.getBoundingClientRect();
  const x=rect.x+14,width=rect.width-28,y=rect.y+(gameSceneTop()+990)/canvas.height*rect.height;
  mergeHelpPanel.hidden=!running||!mergeHintVisible||onboardingIsActive();
  document.body.dataset.mergeHelp=String(!mergeHelpPanel.hidden);
  if(mergeTutorialMode&&onboardingInstruction)onboardingInstruction.textContent=mergeTutorialMode==="slide"?"向右滑动，整盘数字一起移动 →":"向左滑动，让两个 2 合成 4 ←";
  mergeHelpPanel.style.cssText="left:"+x+"px;top:"+y+"px;width:"+width+"px";
  mergeHelpButton.disabled=!running||onboardingIsActive();
  if(onboardingCoach){onboardingCoach.style.left=x+"px";onboardingCoach.style.top=(onboardingIsActive()?y:rect.y+(gameSceneTop()+1150)/canvas.height*rect.height)+"px";onboardingCoach.style.width=width+"px";}
    const key=JSON.stringify([board2048,mergeHintVisible,mergeTutorialMode]);
  if(key!==mergeInterfaceKey){mergeInterfaceKey=key;
    const arrows={left:"←",right:"→",up:"↑",down:"↓"};
    mergeHelpPanel.innerHTML="<strong>先看空位，再看合并</strong><div class='merge-options'>"+mergeDirectionOptions().map(option=>"<span class='"+(option.legal?"":"blocked")+"'>"+arrows[option.direction]+"<br>"+(option.legal?(option.pairs?option.pairs+" 并 +"+option.gain:"可移动"):"不可移动")+"</span>").join("")+"</div><small>仅展示这一步；不预测随机新块，也不保证最佳路线。</small>";
  }
}
window.addEventListener("resize",()=>{drawMergeBoard();});

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
  directionOptions:mergeDirectionOptions(),hintUses:mergeHintUses,sessionKey:mergeStorageKey(),
  techniqueComplete:mergeMissionProgress()>=mergeBlueprint.missionValue?1:0,
  tutorialMode: mergeTutorialMode,
});

runtimeDebugActions = {
  undo: undoMergeMove,
  finishAnimation() {
    if (mergeAnimation) finishMergeMove(mergeAnimation);
    if (mergeLastSpawn) mergeLastSpawn.at = performance.now();
    drawMergeBoard();
  },
  prepareMerge() {
    mergeTutorialMode = null;
    board2048 = emptyBoard(); board2048[3][0] = 2; board2048[3][1] = 2; mergeScore = 0; bestTile = 2;
    mergeHistory = null; mergeAnimation = null; mergeNextValue = 2; drawMergeBoard();
  },
  prepareDoubleMerge() {
    mergeTutorialMode = null;
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
