import { regionLogicLevels } from "./region-logic-levels.generated.js";

// Core Star Battle solver/generator structure is adapted from
// MelodyLucien/starbattle (MIT). The fixed campaign, hint pedagogy, session
// model, rendering, input system and all audiovisual assets are original.
export const regionLogicScript = String.raw`
const regionCoachStyle = document.createElement("style");
regionCoachStyle.textContent = 'body[data-template=region-logic] .onboarding-coach{bottom:148px}';
document.head.appendChild(regionCoachStyle);
const regionLevelCatalog = ${JSON.stringify(regionLogicLevels)};
const regionDifficulty = {
  relaxed: { hints: 4 },
  standard: { hints: 3 },
  challenging: { hints: 2 },
}[config.difficulty];
const regionSessionSchemaVersion = 3;
const regionColors = ["#f7dca5", "#bfe5d5", "#f3c4cb", "#c9d8ee", "#d9cbea", "#b9dfe4", "#efc8aa", "#cbdcaf", "#ead6a4", "#c8cedf"];
const regionRuleLabels = { "quota-fill": "配额填满", "unit-complete": "单位已满", "line-lock": "行列锁定", contradiction: "反证排除", conflict: "路径矛盾" };

let regionPuzzle = regionLevelCatalog[0];
let placedRegionStars = new Set();
let manualRegionMarks = new Set();
let autoRegionMarks = new Set();
let regionHistory = [];
let regionFuture = [];
let regionToolMode = "cycle";
let regionHints = regionDifficulty.hints;
let regionHintsUsed = 0;
let regionObservationsUsed = 0;
const regionObservedPositions = new Set();
let regionErrors = 0;
let regionMoves = 0;
let regionStartedAt = 0;
let regionElapsedBeforeRestore = 0;
let regionFocus = { row: 0, column: 0 };
let regionFocusVisible = false;
let regionFlash = null;
let regionHint = null;
let regionLastConflictType = "none";
let regionLastAction = "none";
let regionUniqueSolutions = 0;

function regionKey(row, column) { return row + ":" + column; }
function currentRegionPuzzle() { return regionLevelCatalog[Math.max(0, Math.min(regionLevelCatalog.length - 1, currentCampaignLevel().number - 1))]; }
function regionTargetStars() { return regionPuzzle.size * regionPuzzle.starsPerUnit; }

const regionComboCache = new Map();
function regionRowCombos(size, starsPerUnit) {
  const cacheKey = size + ":" + starsPerUnit;
  if (regionComboCache.has(cacheKey)) return regionComboCache.get(cacheKey);
  const result = [];
  function visit(start, chosen) {
    if (chosen.length === starsPerUnit) { result.push([...chosen]); return; }
    for (let column = start; column < size; column += 1) {
      if (chosen.length && column <= chosen[chosen.length - 1] + 1) continue;
      chosen.push(column); visit(column + 2, chosen); chosen.pop();
    }
  }
  visit(0, []); regionComboCache.set(cacheKey, result); return result;
}

function solveRegionPuzzle(requiredStars = new Set(), forbiddenMarks = new Set(), limit = 2) {
  const size = regionPuzzle.size;
  const starsPerUnit = regionPuzzle.starsPerUnit;
  const solutions = [];
  const columnCounts = Array(size).fill(0);
  const regionCounts = Array(size).fill(0);
  const rows = [];
  const requiredRows = Array.from({ length: size }, () => []);
  for (const key of requiredStars) {
    const parts = key.split(":").map(Number);
    if (parts[0] < 0 || parts[1] < 0 || parts[0] >= size || parts[1] >= size) return [];
    requiredRows[parts[0]].push(parts[1]);
  }
  function search(row) {
    if (solutions.length >= limit) return;
    if (row === size) {
      if (columnCounts.every((count) => count === starsPerUnit) && regionCounts.every((count) => count === starsPerUnit)) solutions.push(rows.flatMap((columns, rowIndex) => columns.map((column) => [rowIndex, column])));
      return;
    }
    for (const columns of regionRowCombos(size, starsPerUnit)) {
      if (requiredRows[row].some((column) => !columns.includes(column))) continue;
      if (columns.some((column) => forbiddenMarks.has(regionKey(row, column)))) continue;
      if (columns.some((column) => columnCounts[column] >= starsPerUnit || regionCounts[regionPuzzle.regions[row][column]] >= starsPerUnit)) continue;
      if (row > 0 && columns.some((column) => rows[row - 1].some((previous) => Math.abs(column - previous) <= 1))) continue;
      rows[row] = columns;
      columns.forEach((column) => { columnCounts[column] += 1; regionCounts[regionPuzzle.regions[row][column]] += 1; });
      search(row + 1);
      columns.forEach((column) => { columnCounts[column] -= 1; regionCounts[regionPuzzle.regions[row][column]] -= 1; });
    }
  }
  search(0); return solutions;
}

function countRegionSolutions(limit = 2) { return solveRegionPuzzle(new Set(), new Set(), limit).length; }
function countRegionCompletions(stars = placedRegionStars, marks = new Set([...manualRegionMarks, ...autoRegionMarks]), limit = 1) { return solveRegionPuzzle(stars, marks, limit).length; }

function regionCellsForUnit(kind, id) {
  const cells = [];
  for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
    if ((kind === "row" && row === id) || (kind === "column" && column === id) || (kind === "region" && regionPuzzle.regions[row][column] === id)) cells.push([row, column]);
  }
  return cells;
}
function regionStarsInUnit(kind, id) { return regionCellsForUnit(kind, id).filter(([row, column]) => placedRegionStars.has(regionKey(row, column))).length; }
function regionCandidateCells(kind, id) {
  return regionCellsForUnit(kind, id).filter(([row, column]) => {
    const key = regionKey(row, column);
    return !placedRegionStars.has(key) && !manualRegionMarks.has(key) && !autoRegionMarks.has(key);
  });
}

function allRegionsConnected() {
  for (let id = 0; id < regionPuzzle.size; id += 1) {
    const cells = regionCellsForUnit("region", id);
    if (!cells.length) return false;
    const available = new Set(cells.map(([row, column]) => regionKey(row, column)));
    const seen = new Set([regionKey(cells[0][0], cells[0][1])]);
    const queue = [cells[0]];
    for (let index = 0; index < queue.length; index += 1) {
      const [row, column] = queue[index];
      for (const [rowDelta, columnDelta] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const next = [row + rowDelta, column + columnDelta];
        const key = regionKey(next[0], next[1]);
        if (available.has(key) && !seen.has(key)) { seen.add(key); queue.push(next); }
      }
    }
    if (seen.size !== cells.length) return false;
  }
  return true;
}

function recomputeAutoMarks() {
  autoRegionMarks = new Set();
  for (const key of placedRegionStars) {
    const [row, column] = key.split(":").map(Number);
    const regionId = regionPuzzle.regions[row][column];
    for (let index = 0; index < regionPuzzle.size; index += 1) {
      if (regionStarsInUnit("row", row) >= regionPuzzle.starsPerUnit) autoRegionMarks.add(regionKey(row, index));
      if (regionStarsInUnit("column", column) >= regionPuzzle.starsPerUnit) autoRegionMarks.add(regionKey(index, column));
    }
    for (let targetRow = 0; targetRow < regionPuzzle.size; targetRow += 1) for (let targetColumn = 0; targetColumn < regionPuzzle.size; targetColumn += 1) {
      if ((regionPuzzle.regions[targetRow][targetColumn] === regionId && regionStarsInUnit("region", regionId) >= regionPuzzle.starsPerUnit) || (Math.abs(targetRow - row) <= 1 && Math.abs(targetColumn - column) <= 1)) autoRegionMarks.add(regionKey(targetRow, targetColumn));
    }
  }
  for (const key of placedRegionStars) autoRegionMarks.delete(key);
  for (const key of manualRegionMarks) autoRegionMarks.delete(key);
}

function regionElapsedSeconds() { return Math.max(0, Math.round(regionElapsedBeforeRestore + (running && regionStartedAt ? (performance.now() - regionStartedAt) / 1000 : 0))); }
function regionSnapshot() { return { stars: [...placedRegionStars], marks: [...manualRegionMarks], moves: regionMoves, errors: regionErrors, hints: regionHints, hintsUsed: regionHintsUsed, elapsed: regionElapsedSeconds() }; }
function restoreRegionSnapshot(snapshot) {
  placedRegionStars = new Set(snapshot.stars); manualRegionMarks = new Set(snapshot.marks);
  regionMoves = snapshot.moves; regionErrors = snapshot.errors;
  // Assistance is an attempt-level record; undo cannot erase paid help.
  regionHints = Math.min(regionHints, snapshot.hints); regionHintsUsed = Math.max(regionHintsUsed, snapshot.hintsUsed);
  regionElapsedBeforeRestore = snapshot.elapsed; regionStartedAt = performance.now(); recomputeAutoMarks();
}
function regionSessionKey() { return "forge-region-v3:" + config.campaignStorageKey + ":" + currentCampaignLevel().number; }
function persistRegionSession() {
  if (!running) return;
  try { safeStorage.setItem(regionSessionKey(), JSON.stringify({ schemaVersion: regionSessionSchemaVersion, level: currentCampaignLevel().number, signature: regionPuzzle.regions.flat().join(""), ...regionSnapshot(), observationsUsed: regionObservationsUsed, observedPositions: [...regionObservedPositions], assistanceUsed: regionObservationsUsed + regionHintsUsed, history: regionHistory.slice(-40), future: regionFuture.slice(-40), updatedAt: new Date().toISOString() })); } catch {}
}
function pushRegionHistory() { regionHint = null; regionHistory.push(regionSnapshot()); if (regionHistory.length > 40) regionHistory.shift(); regionFuture = []; }

function directRegionConflict(row, column) {
  const regionId = regionPuzzle.regions[row][column];
  if (regionStarsInUnit("row", row) >= regionPuzzle.starsPerUnit) return "这一行的星数已经满足";
  if (regionStarsInUnit("column", column) >= regionPuzzle.starsPerUnit) return "这一列的星数已经满足";
  if (regionStarsInUnit("region", regionId) >= regionPuzzle.starsPerUnit) return "这个色区的星数已经满足";
  for (const key of placedRegionStars) {
    const [starRow, starColumn] = key.split(":").map(Number);
    if (Math.abs(starRow - row) <= 1 && Math.abs(starColumn - column) <= 1) return "星星不能横向、纵向或对角相邻";
  }
  return "";
}

function regionLayout() {
  const boardSize = Math.min(660, gameSceneHeight() * .62);
  return { boardSize, cell: boardSize / regionPuzzle.size, x: (720 - boardSize) / 2, y: 196 };
}
function drawRegionCompletionTicks(layout) {
  for (let index = 0; index < regionPuzzle.size; index += 1) {
    ctx.fillStyle = regionStarsInUnit("row", index) === regionPuzzle.starsPerUnit ? "#2f9b7f" : "rgba(72,62,78,.14)";
    ctx.fillRect(layout.x - 12, layout.y + index * layout.cell + 5, 5, layout.cell - 10);
    ctx.fillStyle = regionStarsInUnit("column", index) === regionPuzzle.starsPerUnit ? "#2f9b7f" : "rgba(72,62,78,.14)";
    ctx.fillRect(layout.x + index * layout.cell + 5, layout.y - 12, layout.cell - 10, 5);
  }
}

function drawRegionLogic() {
  clearCanvas(); ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = regionLayout(); const target = regionTargetStars();
  drawPlayfield(42, 52, 636, 118, { radius: 25, alpha: .97, fill: "rgba(255,252,249,.95)", stroke: "rgba(83,67,89,.18)", lineWidth: 2 });
  ctx.textAlign = "left"; ctx.fillStyle = "#4d3e52"; ctx.font = "800 29px Inter, sans-serif"; ctx.fillText(regionPuzzle.name, 70, 101);
  ctx.fillStyle = "rgba(77,62,82,.72)"; ctx.font = "650 18px Inter, sans-serif"; ctx.fillText(regionPuzzle.size + "×" + regionPuzzle.size + " · 每行 / 列 / 区 " + regionPuzzle.starsPerUnit + " 星", 70, 137);
  ctx.textAlign = "right"; ctx.fillStyle = "#239783"; ctx.font = "800 31px ui-monospace, Consolas, monospace"; ctx.fillText(placedRegionStars.size + " / " + target, 650, 111);
  ctx.fillStyle = "rgba(77,62,82,.64)"; ctx.font = "650 16px Inter, sans-serif"; ctx.fillText("提示 " + regionHints + " · " + regionElapsedSeconds() + "秒", 650, 141);
  drawPlayfield(layout.x - 20, layout.y - 20, layout.boardSize + 40, layout.boardSize + 40, { radius: 30, alpha: .96, fill: "rgba(255,252,249,.92)", stroke: "rgba(74,64,80,.22)", lineWidth: 2 });
  drawRegionCompletionTicks(layout);
  for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
    const x = layout.x + column * layout.cell; const y = layout.y + row * layout.cell; const key = regionKey(row, column); const regionId = regionPuzzle.regions[row][column];
    ctx.fillStyle = regionColors[regionId % regionColors.length]; ctx.globalAlpha = .78; ctx.fillRect(x, y, layout.cell, layout.cell); ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(55,51,61,.11)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, layout.cell, layout.cell);
    ctx.strokeStyle = "rgba(45,42,50,.78)"; ctx.lineWidth = regionPuzzle.size >= 10 ? 3 : 4;
    if (row === 0 || regionPuzzle.regions[row - 1][column] !== regionId) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + layout.cell, y); ctx.stroke(); }
    if (column === 0 || regionPuzzle.regions[row][column - 1] !== regionId) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + layout.cell); ctx.stroke(); }
    if (row === regionPuzzle.size - 1 || regionPuzzle.regions[row + 1][column] !== regionId) { ctx.beginPath(); ctx.moveTo(x, y + layout.cell); ctx.lineTo(x + layout.cell, y + layout.cell); ctx.stroke(); }
    if (column === regionPuzzle.size - 1 || regionPuzzle.regions[row][column + 1] !== regionId) { ctx.beginPath(); ctx.moveTo(x + layout.cell, y); ctx.lineTo(x + layout.cell, y + layout.cell); ctx.stroke(); }
    if (autoRegionMarks.has(key)) { ctx.fillStyle = "rgba(63,65,73,.3)"; ctx.beginPath(); ctx.arc(x + layout.cell / 2, y + layout.cell / 2, Math.max(2.5, layout.cell * .047), 0, Math.PI * 2); ctx.fill(); }
    if (manualRegionMarks.has(key)) drawBitmapSprite(5, x + layout.cell * .3, y + layout.cell * .3, layout.cell * .4, layout.cell * .4, { fallback: "#685d70", alpha: .9, scale: 1.02 });
    if (placedRegionStars.has(key)) drawBitmapSprite(regionId % 5, x + layout.cell * .1, y + layout.cell * .1, layout.cell * .8, layout.cell * .8, { fallback: "#f1ac42", scale: 1.09 });
    if (regionFocusVisible && regionFocus.row === row && regionFocus.column === column) { ctx.strokeStyle = "rgba(214,151,51,.95)"; ctx.lineWidth = 3; ctx.strokeRect(x + 4, y + 4, layout.cell - 8, layout.cell - 8); }
  }
  const now = performance.now();
  const activeCue = regionHint && now < regionHint.until ? regionHint : regionFlash && now < regionFlash.until ? regionFlash : null;
  if (activeCue) for (const [row, column] of (activeCue.stage === "observe" ? activeCue.evidence : activeCue.cells)) {
    const x = layout.x + column * layout.cell; const y = layout.y + row * layout.cell;
    ctx.save(); ctx.strokeStyle = activeCue.type === "error" ? "#df5d62" : activeCue.stage === "observe" ? "#239783" : "#d39a30"; ctx.lineWidth = activeCue.stage === "observe" ? 3 : 5;
    ctx.strokeRect(x + 5, y + 5, layout.cell - 10, layout.cell - 10);
    if (activeCue.type === "error") { ctx.beginPath(); ctx.moveTo(x + 12, y + 12); ctx.lineTo(x + layout.cell - 12, y + layout.cell - 12); ctx.stroke(); }
    ctx.restore();
  }
  const noteY = layout.y + layout.boardSize + 48;
  ctx.textAlign = "center"; ctx.fillStyle = "#4d3e52"; ctx.font = "750 21px Inter, sans-serif";
  ctx.fillText(regionHint && now < regionHint.until ? (regionHint.stage === "observe" ? "先观察 · " : "推理依据 · ") + regionRuleLabels[regionHint.rule] : regionToolMode === "cycle" ? "点按循环：星星 → 排除 → 清空" : regionToolMode === "star" ? "当前工具：放置星星" : "当前工具：标记排除", 360, noteY);
  ctx.fillStyle = "rgba(77,62,82,.68)"; ctx.font = "560 17px Inter, sans-serif";
  const detail = regionHint && now < regionHint.until ? (regionHint.stage === "observe" ? regionHint.question : regionHint.text) : regionPuzzle.starsPerUnit === 2 ? "双星关：每个单位都必须恰好放置两颗星" : "星星不能横向、纵向或对角相邻";
  // Wrap by measured width: do not shrink the explanation into unreadable mobile text.
  let line = ""; let lineIndex = 0;
  for (const character of detail) { if (ctx.measureText(line + character).width > 620) { ctx.fillText(line, 360, noteY + 30 + lineIndex * 24); line = ""; lineIndex += 1; } line += character; }
  if (line) ctx.fillText(line, 360, noteY + 30 + lineIndex * 24); ctx.restore(); finishCanvasStyle();
}

function syncRegionControls() {
  document.body.dataset.regionTool = regionToolMode;
  document.querySelectorAll("[data-control=cycle],[data-control=star],[data-control=mark]").forEach((button) => {
    const active = button.dataset.control === regionToolMode; button.classList.toggle("is-selected", active); button.setAttribute("aria-pressed", String(active));
  });
  const undo = document.querySelector("[data-control=undo]"); const redo = document.querySelector("[data-control=redo]"); const hint = document.querySelector("[data-control=hint]");
  if (undo) undo.disabled = !running || !regionHistory.length;
  if (redo) redo.disabled = !running || !regionFuture.length;
  if (hint) { hint.disabled = !running; hint.textContent = regionHint ? regionHint.stage === "observe" ? "展开理由" : "重看理由" : "观察线索"; }
}
function refreshRegionUi(message) { setMetric(placedRegionStars.size + " / " + regionTargetStars()); if (message) setStatus(message); syncRegionControls(); drawRegionLogic(); }
function setRegionCue(type, cells, duration = 1300) { regionFlash = { type, cells, until: performance.now() + duration }; drawRegionLogic(); setTimeout(() => drawRegionLogic(), duration + 20); }

function checkRegionCompletion() {
  if (placedRegionStars.size !== regionTargetStars() || countRegionCompletions(placedRegionStars, new Set([...manualRegionMarks, ...autoRegionMarks]), 1) !== 1) return false;
  const elapsed = regionElapsedSeconds(); running = false;
  try { safeStorage.removeItem(regionSessionKey()); } catch {}
  drawRegionLogic(); playSound("win");
  showResult(true, "星域成立", regionPuzzle.name + " · " + regionPuzzle.size + "×" + regionPuzzle.size + " · " + elapsed + " 秒 · 观察 " + regionObservationsUsed + " 个局面 · 展开理由 " + regionHintsUsed + " 次 · 错误 " + regionErrors + " 次。 ");
  return true;
}

function placeRegionStar(row, column) {
  const key = regionKey(row, column);
  if (placedRegionStars.has(key)) {
    pushRegionHistory(); placedRegionStars.delete(key); regionMoves += 1; recomputeAutoMarks(); persistRegionSession(); refreshRegionUi("已移除星星；相关格重新开放。 "); return true;
  }
  const conflict = directRegionConflict(row, column);
  if (conflict) {
    regionErrors += 1; regionLastConflictType = "direct-rule"; regionLastAction = "rejected-star"; playSound("fail"); setStatus(conflict + "。 "); setRegionCue("error", [[row, column]], 900); return false;
  }
  pushRegionHistory(); placedRegionStars.add(key); manualRegionMarks.delete(key); regionMoves += 1; regionLastAction = "star"; recomputeAutoMarks(); playSound("move"); signalOnboarding("candidate-eliminated"); persistRegionSession();
  if (!checkRegionCompletion()) refreshRegionUi("星星已放置；直接确定的排除格已自动标记。 "); return true;
}
function toggleRegionMark(row, column) {
  const key = regionKey(row, column); if (placedRegionStars.has(key)) return false;
  pushRegionHistory(); if (manualRegionMarks.has(key)) manualRegionMarks.delete(key); else manualRegionMarks.add(key);
  regionMoves += 1; regionLastAction = manualRegionMarks.has(key) ? "mark" : "clear-mark"; recomputeAutoMarks(); playSound("ui"); persistRegionSession();
  if (manualRegionMarks.has(key)) signalOnboarding("candidate-eliminated");
  refreshRegionUi(manualRegionMarks.has(key) ? "已标记为排除格。 " : "已清除手动排除。 "); return true;
}
function cycleRegionCell(row, column) {
  const key = regionKey(row, column);
  if (placedRegionStars.has(key)) {
    pushRegionHistory(); placedRegionStars.delete(key); manualRegionMarks.add(key); regionMoves += 1; regionLastAction = "star-to-mark"; recomputeAutoMarks(); playSound("ui"); persistRegionSession(); refreshRegionUi("星星已改为手动排除。 "); return true;
  }
  if (manualRegionMarks.has(key)) return toggleRegionMark(row, column);
  return placeRegionStar(row, column);
}
function actOnRegionCell(row, column) { regionFocus = { row, column }; return regionToolMode === "star" ? placeRegionStar(row, column) : regionToolMode === "mark" ? toggleRegionMark(row, column) : cycleRegionCell(row, column); }

function undoRegionMove() {
  const snapshot = regionHistory.pop(); if (!snapshot) return false;
  regionHint = null;
  regionFuture.push(regionSnapshot()); restoreRegionSnapshot(snapshot); regionLastAction = "undo"; playSound("ui"); persistRegionSession(); refreshRegionUi("已撤销上一步。 "); return true;
}
function redoRegionMove() {
  const snapshot = regionFuture.pop(); if (!snapshot) return false;
  regionHint = null;
  regionHistory.push(regionSnapshot()); restoreRegionSnapshot(snapshot); regionLastAction = "redo"; playSound("ui"); persistRegionSession(); refreshRegionUi("已恢复下一步。 "); return true;
}

function nextRegionDeduction() {
  const combinedMarks = new Set([...manualRegionMarks, ...autoRegionMarks]);
  if (solveRegionPuzzle(placedRegionStars, combinedMarks, 1).length === 0) {
    const lastStar = [...placedRegionStars].at(-1); const cells = lastStar ? [lastStar.split(":").map(Number)] : [];
    return { rule: "conflict", action: "undo", cells, evidence: [], question: "当前星星或手动排除互相矛盾。", text: "当前局面无解，请逐步撤销；不一定是最后一颗星出错。" };
  }
  for (const kind of ["row", "column", "region"]) for (let id = 0; id < regionPuzzle.size; id += 1) {
    const remaining = regionPuzzle.starsPerUnit - regionStarsInUnit(kind, id); const candidates = regionCandidateCells(kind, id);
    if (remaining > 0 && candidates.length === remaining) {
      const unit = kind === "row" ? "这一行" : kind === "column" ? "这一列" : "这个色区";
      return { rule: "quota-fill", action: "star", cells: candidates, evidence: regionCellsForUnit(kind, id), question: "观察青框：数数空白候选，还缺几颗星？", text: unit + "还缺 " + remaining + " 星，恰好剩 " + candidates.length + " 格候选；金框都应放星。" };
    }
  }
  for (let regionId = 0; regionId < regionPuzzle.size; regionId += 1) {
    const candidates = regionCandidateCells("region", regionId); if (candidates.length < 2) continue;
    const rows = new Set(candidates.map(([row]) => row)); const columns = new Set(candidates.map(([, column]) => column));
    if (rows.size === 1) {
      const row = [...rows][0]; const outside = regionCandidateCells("row", row).filter(([candidateRow, candidateColumn]) => regionPuzzle.regions[candidateRow][candidateColumn] !== regionId);
      if (outside.length && regionPuzzle.starsPerUnit - regionStarsInUnit("region", regionId) === regionPuzzle.starsPerUnit - regionStarsInUnit("row", row)) return { rule: "line-lock", action: "mark", cells: outside, evidence: candidates, question: "观察青框：这个色区的候选落在同一行吗？", text: "该区剩余星占满这一行的空额；金框是区外格，可标记排除。" };
    }
    if (columns.size === 1) {
      const column = [...columns][0]; const outside = regionCandidateCells("column", column).filter(([candidateRow, candidateColumn]) => regionPuzzle.regions[candidateRow][candidateColumn] !== regionId);
      if (outside.length && regionPuzzle.starsPerUnit - regionStarsInUnit("region", regionId) === regionPuzzle.starsPerUnit - regionStarsInUnit("column", column)) return { rule: "line-lock", action: "mark", cells: outside, evidence: candidates, question: "观察青框：这个色区的候选落在同一列吗？", text: "该区剩余星占满这一列的空额；金框是区外格，可标记排除。" };
    }
  }
  for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
    const key = regionKey(row, column); if (placedRegionStars.has(key) || manualRegionMarks.has(key) || autoRegionMarks.has(key)) continue;
    const assumed = new Set(placedRegionStars); assumed.add(key);
    if (solveRegionPuzzle(assumed, combinedMarks, 1).length === 0) return { rule: "contradiction", action: "mark", cells: [[row, column]], evidence: regionCellsForUnit("row", row), question: "这一行需要反证：尝试检查放星后的连锁限制。", text: "金框放星后，求解检查找不到合法完整局面，可排除。此步不是局部直接推理。" };
  }
  return null;
}
function requestRegionHint() {
  if (regionHint) {
    if (regionHint.stage === "observe") {
      if (regionHints <= 0) { setStatus("展开理由次数已用完；青框观察仍免费。可继续推理或撤销。 "); return false; }
      regionHints -= 1; regionHintsUsed += 1; regionHint.stage = "explain";
    }
    persistRegionSession(); refreshRegionUi(regionHint.text + " 请自行" + (regionHint.action === "star" ? "放星。" : regionHint.action === "mark" ? "标记排除。" : "撤销检查。")); return true;
  }
  // Even free observation consults global consistency and is assisted play.
  // Returning to the same position through undo or redo never double-counts it.
  const positionSignature = JSON.stringify([[...placedRegionStars].sort(), [...manualRegionMarks].sort()]);
  if (!regionObservedPositions.has(positionSignature)) {
    regionObservedPositions.add(positionSignature); regionObservationsUsed += 1;
  }
  const deduction = nextRegionDeduction(); if (!deduction) { persistRegionSession(); setStatus("当前没有可执行提示；请检查手动标记。 "); return false; }
  regionHint = { ...deduction, stage: "observe", type: deduction.rule === "conflict" ? "error" : "hint", until: Infinity };
  regionLastConflictType = deduction.rule === "conflict" ? "logical-dead-end" : regionLastConflictType; regionLastAction = "hint-" + deduction.rule;
  playSound("ui"); persistRegionSession(); refreshRegionUi(deduction.question + " 再按展开理由；观察免费，不自动落子。 "); return true;
}

function initializeRegionPuzzle() {
  regionPuzzle = currentRegionPuzzle(); placedRegionStars = new Set(); manualRegionMarks = new Set(); autoRegionMarks = new Set(); regionHistory = []; regionFuture = [];
  regionHints = Math.max(1, regionDifficulty.hints - Math.floor((regionPuzzle.chapter - 1) / 2)); regionHintsUsed = 0; regionObservationsUsed = 0; regionObservedPositions.clear(); regionErrors = 0; regionMoves = 0;
  regionElapsedBeforeRestore = 0; regionFocus = { row: 0, column: 0 }; regionFocusVisible = false; regionFlash = null; regionHint = null; regionLastConflictType = "none"; regionLastAction = "none";
  regionUniqueSolutions = countRegionSolutions(2); recomputeAutoMarks();
}
function startGame() {
  try { safeStorage.removeItem(regionSessionKey()); } catch {}
  initializeRegionPuzzle(); running = true; regionStartedAt = performance.now(); hideOverlay(); startAmbient();
  canvas.setAttribute("aria-label", "星灵巡格 " + regionPuzzle.size + " 乘 " + regionPuzzle.size + " 棋盘，每行每列每区 " + regionPuzzle.starsPerUnit + " 颗星");
  refreshRegionUi("全新开局 · 第 " + currentCampaignLevel().number + " 关 · " + regionPuzzle.name + " · 严格唯一解 · " + regionPuzzle.size + "×" + regionPuzzle.size + " · 每单位 " + regionPuzzle.starsPerUnit + " 星。 ");
}
restartCurrentGame = () => {
  try { safeStorage.removeItem(regionSessionKey()); } catch {}
  startGame();
  refreshRegionUi("已重新开始第 " + currentCampaignLevel().number + " 关 · " + regionPuzzle.name + "。 ");
};
function handleControl(value) {
  if (["cycle", "star", "mark"].includes(value)) { regionToolMode = value; refreshRegionUi(value === "cycle" ? "单击依次切换星星、排除和清空。 " : value === "star" ? "已切换为星星工具。 " : "已切换为排除工具。 "); return true; }
  if (value === "undo") return undoRegionMove(); if (value === "redo") return redoRegionMove(); if (value === "hint") return requestRegionHint(); return false;
}
function handleKey(key) {
  if (key === "ArrowUp") { regionFocusVisible = true; regionFocus.row = Math.max(0, regionFocus.row - 1); }
  else if (key === "ArrowDown") { regionFocusVisible = true; regionFocus.row = Math.min(regionPuzzle.size - 1, regionFocus.row + 1); }
  else if (key === "ArrowLeft") { regionFocusVisible = true; regionFocus.column = Math.max(0, regionFocus.column - 1); }
  else if (key === "ArrowRight") { regionFocusVisible = true; regionFocus.column = Math.min(regionPuzzle.size - 1, regionFocus.column + 1); }
  else if (key === " " || key === "Enter") { regionFocusVisible = true; return actOnRegionCell(regionFocus.row, regionFocus.column); }
  else if (key.toLowerCase() === "s") { regionFocusVisible = true; return placeRegionStar(regionFocus.row, regionFocus.column); }
  else if (key.toLowerCase() === "x") { regionFocusVisible = true; return toggleRegionMark(regionFocus.row, regionFocus.column); }
  else if (key.toLowerCase() === "z") return undoRegionMove();
  else if (key.toLowerCase() === "y") return redoRegionMove();
  else if (key.toLowerCase() === "h") return requestRegionHint();
  else return false;
  drawRegionLogic(); return true;
}

canvas.addEventListener("pointerup", (event) => {
  if (!running) return; const point = eventScenePoint(event); const layout = regionLayout();
  if (point.y < layout.y || point.y >= layout.y + layout.boardSize || point.x < layout.x || point.x >= layout.x + layout.boardSize) return;
  regionFocusVisible = false;
  actOnRegionCell(Math.floor((point.y - layout.y) / layout.cell), Math.floor((point.x - layout.x) / layout.cell));
});

initializeRegionPuzzle();
onCampaignLevelChanged = () => { if (!running) { initializeRegionPuzzle(); drawRegionLogic(); } };
runtimeDebugActions = {
  cycleFirstCell: () => actOnRegionCell(0, 0),
  undoRegion: () => undoRegionMove(),
  redoRegion: () => redoRegionMove(),
  hintRegion: () => requestRegionHint(),
  probeDirectConflict: () => {
    const first = regionPuzzle.solution[0]; placeRegionStar(first[0], first[1]);
    const adjacentColumn = first[1] + 1 < regionPuzzle.size ? first[1] + 1 : first[1] - 1;
    if (adjacentColumn >= 0) { placeRegionStar(first[0], adjacentColumn); return true; }
    return false;
  },
  probeDeadEnd: () => {
    const solutionKeys = new Set(regionPuzzle.solution.map(([row, column]) => regionKey(row, column)));
    for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
      const key = regionKey(row, column); if (solutionKeys.has(key) || directRegionConflict(row, column)) continue;
      const assumed = new Set(placedRegionStars); assumed.add(key);
      if (solveRegionPuzzle(assumed, new Set([...manualRegionMarks, ...autoRegionMarks]), 1).length === 0) { placeRegionStar(row, column); requestRegionHint(); return true; }
    }
    return false;
  },
  solveRegion: () => { placedRegionStars = new Set(regionPuzzle.solution.map(([row, column]) => regionKey(row, column))); manualRegionMarks = new Set(); recomputeAutoMarks(); drawRegionLogic(); checkRegionCompletion(); },
  failRegion: () => { running = false; showResult(false, "推理中断", "调试失败分支已验证；标准游戏不会因错误次数耗尽而强制结束。 "); },
};
runtimeDebugState = () => ({
  level: currentCampaignLevel().number, chapter: regionPuzzle.chapter, name: regionPuzzle.name, size: regionPuzzle.size, starsPerUnit: regionPuzzle.starsPerUnit,
  targetStars: regionTargetStars(), stars: placedRegionStars.size, manualMarks: manualRegionMarks.size, autoMarks: autoRegionMarks.size,
  hints: regionHints, hintsUsed: regionHintsUsed, errors: regionErrors, moves: regionMoves, uniqueSolutions: regionUniqueSolutions, regionsConnected: allRegionsConnected(),
  observationsUsed: regionObservationsUsed, assistanceUsed: regionObservationsUsed + regionHintsUsed,
  layoutSignature: regionPuzzle.regions.flat().join(""), campaignSignatureCount: new Set(regionLevelCatalog.map((level) => level.regions.flat().join(""))).size,
  catalogSize: regionLevelCatalog.length, logicTraceSteps: regionPuzzle.difficulty.steps, contradictionSteps: regionPuzzle.difficulty.contradictionSteps,
  logicSolvable: regionPuzzle.difficulty.steps > 0, hintRule: regionHint?.rule || null, hintAction: regionHint?.action || null, hintUsesSolution: false,
  hintStage: regionHint?.stage || null, hintCells: regionHint?.cells || [], hintEvidence: regionHint?.evidence || [], hintText: regionHint?.text || null,
  boardLayout: regionLayout(), starCells: [...placedRegionStars], markCells: [...manualRegionMarks], autoMarkCells: [...autoRegionMarks],
  lastConflictType: regionLastConflictType, lastAction: regionLastAction, historyDepth: regionHistory.length, futureDepth: regionFuture.length,
  sessionSchemaVersion: regionSessionSchemaVersion, restored: false, toolMode: regionToolMode, boardAreaVersion: 2,
});
drawRegionLogic();
`;
