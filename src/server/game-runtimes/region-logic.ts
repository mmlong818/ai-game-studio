// 规则架构参考 mkgame-sudoku（MIT）；题面、生成器、名称和视听资产均为本平台原创。
export const regionLogicScript = String.raw`
const regionDifficulty = {
  relaxed: { size: 5, lives: 5, freeHints: 3, fixedStars: 1 },
  standard: { size: 6, lives: 4, freeHints: 2, fixedStars: 0 },
  challenging: { size: 7, lives: 3, freeHints: 1, fixedStars: 0 },
}[config.difficulty];
let regionSize = regionDifficulty.size;
let regionFixedStars = regionDifficulty.fixedStars;

function applyRegionCampaignSettings() {
  const tier = currentCampaignLevel().tier;
  regionSize = Math.min(8, regionDifficulty.size + Math.floor((tier - 1) / 2));
  regionFixedStars = Math.max(0, regionDifficulty.fixedStars - Math.floor((tier - 1) / 2));
}

let regionPuzzle = null;
let placedRegionStars = new Set();
let manualRegionMarks = new Set();
let autoRegionMarks = new Set();
let regionHistory = [];
let regionMode = "star";
let regionLives = regionDifficulty.lives;
let regionHints = regionDifficulty.freeHints;
let regionFlash = null;
let regionErrors = 0;
let regionHintCost = 0;
let regionStartedAt = 0;
let regionLastConflictType = "none";

function regionKey(row, column) { return row + ":" + column; }

function regionRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffledRegionValues(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function createRegionSolution(size, random) {
  const columns = Array.from({ length: size }, (_, index) => index);
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate = shuffledRegionValues(columns, random);
    if (candidate.every((column, row) => row === 0 || Math.abs(column - candidate[row - 1]) > 1)) return candidate;
  }
  const fallback = [];
  function search(row, used) {
    if (row === size) return true;
    for (const column of columns) {
      if (used.has(column) || (row > 0 && Math.abs(column - fallback[row - 1]) <= 1)) continue;
      fallback[row] = column; used.add(column);
      if (search(row + 1, used)) return true;
      used.delete(column);
    }
    return false;
  }
  search(0, new Set());
  return fallback;
}

function growConnectedRegions(size, solution, random) {
  const regions = Array.from({ length: size }, () => Array(size).fill(-1));
  solution.forEach((column, row) => { regions[row][column] = row; });
  let remaining = size * size - size;
  const neighbors = [[-1,0],[1,0],[0,-1],[0,1]];
  while (remaining > 0) {
    let grew = false;
    for (const regionId of shuffledRegionValues(Array.from({ length: size }, (_, index) => index), random)) {
      const frontier = [];
      for (let row = 0; row < size; row += 1) for (let column = 0; column < size; column += 1) {
        if (regions[row][column] !== regionId) continue;
        for (const [deltaRow, deltaColumn] of neighbors) {
          const nextRow = row + deltaRow;
          const nextColumn = column + deltaColumn;
          if (nextRow >= 0 && nextColumn >= 0 && nextRow < size && nextColumn < size && regions[nextRow][nextColumn] < 0) frontier.push([nextRow, nextColumn]);
        }
      }
      if (!frontier.length) continue;
      const [row, column] = frontier[Math.floor(random() * frontier.length)];
      if (regions[row][column] >= 0) continue;
      regions[row][column] = regionId;
      remaining -= 1;
      grew = true;
    }
    if (!grew) break;
  }
  return regions;
}

function canMoveRegionCell(regions, row, column) {
  const source = regions[row][column];
  const size = regions.length;
  const remaining = [];
  for (let targetRow = 0; targetRow < size; targetRow += 1) for (let targetColumn = 0; targetColumn < size; targetColumn += 1) {
    if (regions[targetRow][targetColumn] === source && (targetRow !== row || targetColumn !== column)) remaining.push([targetRow, targetColumn]);
  }
  if (!remaining.length) return false;
  const seen = new Set([regionKey(remaining[0][0], remaining[0][1])]);
  const queue = [remaining[0]];
  for (let index = 0; index < queue.length; index += 1) {
    const [currentRow, currentColumn] = queue[index];
    for (const [deltaRow, deltaColumn] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nextRow = currentRow + deltaRow;
      const nextColumn = currentColumn + deltaColumn;
      const key = regionKey(nextRow, nextColumn);
      if (nextRow < 0 || nextColumn < 0 || nextRow >= size || nextColumn >= size || seen.has(key) || regions[nextRow][nextColumn] !== source || (nextRow === row && nextColumn === column)) continue;
      seen.add(key); queue.push([nextRow, nextColumn]);
    }
  }
  return seen.size === remaining.length;
}

function mutateRegionShape(regions, solution, random) {
  const size = regions.length;
  for (let attempt = 0; attempt < 48; attempt += 1) {
    const row = Math.floor(random() * size);
    const column = Math.floor(random() * size);
    if (solution[row] === column || !canMoveRegionCell(regions, row, column)) continue;
    const source = regions[row][column];
    const targets = [];
    for (const [deltaRow, deltaColumn] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      const nextRow = row + deltaRow;
      const nextColumn = column + deltaColumn;
      if (nextRow < 0 || nextColumn < 0 || nextRow >= size || nextColumn >= size) continue;
      const target = regions[nextRow][nextColumn];
      if (target !== source && !targets.includes(target)) targets.push(target);
    }
    if (!targets.length) continue;
    const target = targets[Math.floor(random() * targets.length)];
    regions[row][column] = target;
    return { row, column, source };
  }
  return null;
}

function analyzeRegionPuzzle(regions, fixedStars, limit = 2) {
  const size = regions.length;
  const usedColumns = new Set();
  const usedRegions = new Set();
  let solutions = 0;
  let searchNodes = 0;
  let branchPoints = 0;
  let maxCandidates = 0;
  function search(row, previousColumn) {
    if (solutions >= limit) return;
    searchNodes += 1;
    if (row === size) { solutions += 1; return; }
    const fixedColumn = fixedStars.has(row) ? fixedStars.get(row) : null;
    const candidates = [];
    for (let column = 0; column < size; column += 1) {
      if (fixedColumn !== null && column !== fixedColumn) continue;
      const regionId = regions[row][column];
      if (usedColumns.has(column) || usedRegions.has(regionId) || (row > 0 && Math.abs(column - previousColumn) <= 1)) continue;
      candidates.push(column);
    }
    if (candidates.length > 1) branchPoints += 1;
    maxCandidates = Math.max(maxCandidates, candidates.length);
    for (const column of candidates) {
      const regionId = regions[row][column];
      usedColumns.add(column); usedRegions.add(regionId);
      search(row + 1, column);
      usedColumns.delete(column); usedRegions.delete(regionId);
    }
  }
  search(0, -99);
  return { solutions, searchNodes, branchPoints, maxCandidates, score: searchNodes + branchPoints * 3 };
}

function countRegionSolutions(regions, fixedStars, limit = 2) {
  return analyzeRegionPuzzle(regions, fixedStars, limit).solutions;
}

function countRegionCompletions(regions, stars, limit = 1) {
  const requiredStars = new Map();
  for (const key of stars) {
    const [row, column] = key.split(":").map(Number);
    if (requiredStars.has(row) && requiredStars.get(row) !== column) return 0;
    requiredStars.set(row, column);
  }
  return analyzeRegionPuzzle(regions, requiredStars, limit).solutions;
}

function regionComplexityTarget() {
  const tier = currentCampaignLevel().tier;
  return { minSearchNodes: regionSize + tier * 2, minBranchPoints: Math.min(5, tier + 1) };
}

function generateUniqueRegionPuzzle() {
  const size = regionSize;
  const random = regionRandom((currentCampaignLevel().seed ^ size * 0x9e3779b1) >>> 0);
  let candidate = null;
  let bestUnique = null;
  const target = regionComplexityTarget();
  for (let attempt = 0; attempt < 28; attempt += 1) {
    const solution = createRegionSolution(size, random);
    const regions = growConnectedRegions(size, solution, random);
    const fixedStars = new Map();
    const requested = Math.min(regionFixedStars, size - 1);
    const fixedRows = shuffledRegionValues(Array.from({ length: size }, (_, row) => row), random).slice(0, requested);
    for (const row of fixedRows) fixedStars.set(row, solution[row]);
    let solutionCount = countRegionSolutions(regions, fixedStars, 32);
    candidate = { size, solution, regions, fixedStars, complexity: analyzeRegionPuzzle(regions, fixedStars) };
    for (let step = 0; step < 320; step += 1) {
      const mutation = mutateRegionShape(regions, solution, random);
      if (!mutation) break;
      const nextCount = countRegionSolutions(regions, fixedStars, 32);
      const accept = nextCount <= solutionCount || random() < .025;
      if (!accept) regions[mutation.row][mutation.column] = mutation.source;
      else solutionCount = nextCount;
      if (solutionCount !== 1) continue;
      const complexity = analyzeRegionPuzzle(regions, fixedStars);
      candidate = { size, solution, regions: regions.map((line) => [...line]), fixedStars, complexity };
      if (!bestUnique || complexity.score > bestUnique.complexity.score) bestUnique = candidate;
      if (complexity.searchNodes >= target.minSearchNodes && complexity.branchPoints >= target.minBranchPoints) return candidate;
    }
  }
  if (bestUnique) return bestUnique;
  for (let row = 0; row < size - 1; row += 1) {
    candidate.fixedStars.set(row, candidate.solution[row]);
    if (countRegionSolutions(candidate.regions, candidate.fixedStars) === 1) break;
  }
  candidate.complexity = analyzeRegionPuzzle(candidate.regions, candidate.fixedStars);
  return candidate;
}

function recomputeAutoMarks() {
  autoRegionMarks = new Set();
  if (!regionPuzzle) return;
  for (const key of placedRegionStars) {
    const [row, column] = key.split(":").map(Number);
    const regionId = regionPuzzle.regions[row][column];
    for (let index = 0; index < regionPuzzle.size; index += 1) {
      autoRegionMarks.add(regionKey(row, index));
      autoRegionMarks.add(regionKey(index, column));
    }
    for (let targetRow = 0; targetRow < regionPuzzle.size; targetRow += 1) for (let targetColumn = 0; targetColumn < regionPuzzle.size; targetColumn += 1) {
      if (regionPuzzle.regions[targetRow][targetColumn] === regionId || (Math.abs(targetRow - row) <= 1 && Math.abs(targetColumn - column) <= 1)) autoRegionMarks.add(regionKey(targetRow, targetColumn));
    }
  }
  for (const star of placedRegionStars) autoRegionMarks.delete(star);
}

function snapshotRegionState() {
  regionHistory.push({ stars: new Set(placedRegionStars), marks: new Set(manualRegionMarks) });
  if (regionHistory.length > 30) regionHistory.shift();
}

function regionLayout() {
  const boardSize = Math.min(620, gameSceneHeight() * .56);
  return { boardSize, cell: boardSize / regionPuzzle.size, x: (720 - boardSize) / 2, y: 205 };
}

function drawRegionLogic() {
  clearCanvas();
  ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = regionLayout();
  const regionColors = ["#ffe09a", "#c6f2df", "#ffc8d7", "#cbd8ff", "#ddd0ff", "#bfeaf2", "#f7c7a7"];
  drawPlayfield(74, 64, 572, 116, { radius: 26, alpha: .96, fill: "rgba(255,250,248,.94)", stroke: "rgba(102,84,107,.18)", lineWidth: 2 });
  ctx.textAlign = "center"; ctx.fillStyle = "#4f3f52";
  ctx.font = "800 30px Inter, sans-serif";
  ctx.fillText("星星 " + placedRegionStars.size + " / " + regionPuzzle.size + "   能量 " + "●".repeat(regionLives), 360, 118);
  ctx.fillStyle = "rgba(79,63,82,.76)"; ctx.font = "600 20px Inter, sans-serif";
  ctx.fillText("每行、每列、每个色区一颗星 · 星星不能相邻", 360, 158);
  drawPlayfield(layout.x - 18, layout.y - 18, layout.boardSize + 36, layout.boardSize + 36, { radius: 34, alpha: .92 });
  for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
    const x = layout.x + column * layout.cell;
    const y = layout.y + row * layout.cell;
    const regionId = regionPuzzle.regions[row][column];
    const key = regionKey(row, column);
    ctx.fillStyle = regionColors[regionId % regionColors.length];
    ctx.globalAlpha = .62; ctx.fillRect(x, y, layout.cell, layout.cell); ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(41,44,47,.14)"; ctx.lineWidth = 1; ctx.strokeRect(x, y, layout.cell, layout.cell);
    ctx.strokeStyle = "rgba(33,35,38,.72)"; ctx.lineWidth = 5;
    if (row === 0 || regionPuzzle.regions[row - 1][column] !== regionId) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + layout.cell, y); ctx.stroke(); }
    if (column === 0 || regionPuzzle.regions[row][column - 1] !== regionId) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + layout.cell); ctx.stroke(); }
    if (row === regionPuzzle.size - 1 || regionPuzzle.regions[row + 1][column] !== regionId) { ctx.beginPath(); ctx.moveTo(x, y + layout.cell); ctx.lineTo(x + layout.cell, y + layout.cell); ctx.stroke(); }
    if (column === regionPuzzle.size - 1 || regionPuzzle.regions[row][column + 1] !== regionId) { ctx.beginPath(); ctx.moveTo(x + layout.cell, y); ctx.lineTo(x + layout.cell, y + layout.cell); ctx.stroke(); }
    if (autoRegionMarks.has(key)) {
      ctx.fillStyle = "rgba(52,67,73,.28)";
      ctx.beginPath(); ctx.arc(x + layout.cell / 2, y + layout.cell / 2, Math.max(2.5, layout.cell * .045), 0, Math.PI * 2); ctx.fill();
    }
    if (manualRegionMarks.has(key)) drawBitmapSprite(5, x + layout.cell * .3, y + layout.cell * .3, layout.cell * .4, layout.cell * .4, { fallback: palette.textSoft, alpha: .9, scale: 1.06 });
    if (placedRegionStars.has(key)) {
      const locked = regionPuzzle.fixedStars.has(row) && regionPuzzle.fixedStars.get(row) === column;
      drawBitmapSprite(locked ? 1 : regionId % 5, x + 6, y + 6, layout.cell - 12, layout.cell - 12, { fallback: palette.highlight, scale: 1.18 });
    }
  }
  if (regionFlash && performance.now() < regionFlash.until) {
    const x = layout.x + regionFlash.column * layout.cell;
    const y = layout.y + regionFlash.row * layout.cell;
    drawBitmapSprite(regionFlash.type === "hint" ? 6 : 7, x + 2, y + 2, layout.cell - 4, layout.cell - 4, { fallback: regionFlash.type === "hint" ? palette.highlight : palette.primary, alpha: .82, scale: 1.16 });
  }
  const modeY = Math.min(gameSceneHeight() - 135, layout.y + layout.boardSize + 74);
  ctx.fillStyle = palette.text; ctx.font = "700 23px Inter, sans-serif";
  ctx.fillText(regionMode === "star" ? "当前：放置星星" : "当前：标记排除格", 360, modeY);
  ctx.fillStyle = palette.textSoft; ctx.font = "500 18px Inter, sans-serif";
  const complexityLabel = regionPuzzle.complexity.branchPoints >= 5 ? "高阶推理" : regionPuzzle.complexity.branchPoints >= 3 ? "进阶推理" : "基础推理";
  ctx.fillText("提示能量 " + regionHints + " · 错误 " + regionErrors + " · " + complexityLabel, 360, modeY + 38);
  ctx.restore(); finishCanvasStyle();
}

function findRegionRuleConflict(row, column) {
  const regionId = regionPuzzle.regions[row][column];
  for (const star of placedRegionStars) {
    const [starRow, starColumn] = star.split(":").map(Number);
    if (starRow === row) return "同一行已经有星星";
    if (starColumn === column) return "同一列已经有星星";
    if (regionPuzzle.regions[starRow][starColumn] === regionId) return "同一色区已经有星星";
    if (Math.abs(starRow - row) <= 1 && Math.abs(starColumn - column) <= 1) return "星星不能彼此相邻";
  }
  return "";
}

function toggleRegionCell(row, column) {
  const key = regionKey(row, column);
  if (regionMode === "mark") {
    if (placedRegionStars.has(key)) return;
    snapshotRegionState();
    if (manualRegionMarks.has(key)) manualRegionMarks.delete(key); else manualRegionMarks.add(key);
    playSound("move"); drawRegionLogic(); return;
  }
  const locked = regionPuzzle.fixedStars.has(row) && regionPuzzle.fixedStars.get(row) === column;
  if (locked) return;
  if (placedRegionStars.has(key)) {
    snapshotRegionState(); placedRegionStars.delete(key); recomputeAutoMarks();
    setMetric(placedRegionStars.size + " / " + regionPuzzle.size); playSound("move"); drawRegionLogic(); return;
  }
  const ruleConflict = findRegionRuleConflict(row, column);
  const tentativeStars = new Set(placedRegionStars);
  tentativeStars.add(key);
  const createsDeadEnd = !ruleConflict && countRegionCompletions(regionPuzzle.regions, tentativeStars) === 0;
  if (ruleConflict || createsDeadEnd) {
    regionLives -= 1; regionErrors += 1; regionFlash = { row, column, type: "error", until: performance.now() + 720 };
    regionLastConflictType = ruleConflict ? "rule" : "dead-end";
    playSound("fail"); setStatus(ruleConflict ? ruleConflict + "；换一个满足全部规则的位置。 " : "这一步会让剩余行无解；请结合色区边界继续排除。 ");
    if (regionLives <= 0) { drawRegionLogic(); showResult(false, "星能耗尽", "重新观察色区边界，并先标记确定不能放星的位置。 "); return; }
    drawRegionLogic(); return;
  }
  snapshotRegionState(); placedRegionStars.add(key); manualRegionMarks.delete(key); recomputeAutoMarks();
  playSound("move"); setMetric(placedRegionStars.size + " / " + regionPuzzle.size);
  if (placedRegionStars.size === regionPuzzle.size) {
    const elapsed = Math.max(1, Math.round((performance.now() - regionStartedAt) / 1000));
    const cleanBonus = regionErrors === 0 ? " · 无错误奖励" : "";
    const noHintBonus = regionHintCost === 0 ? " · 无提示奖励" : "";
    drawRegionLogic(); showResult(true, "星灵巡格完成", "用时 " + elapsed + " 秒 · 错误 " + regionErrors + " 次" + cleanBonus + noHintBonus + "。每行、每列与每个色区都已成立。 "); return;
  }
  setStatus("规则成立；自动排除范围已淡化标记。 "); drawRegionLogic();
}

function spendRegionHint(cost) {
  if (regionHints < cost) { setStatus("提示能量不足；查冲突免费，排除一格消耗 1，点亮答案消耗 2。 "); return false; }
  regionHints -= cost; regionHintCost += cost; return true;
}

function hintRegionConflict() {
  const wrongMark = [...manualRegionMarks].find((key) => {
    const [row, column] = key.split(":").map(Number);
    return regionPuzzle.solution[row] === column;
  });
  if (!wrongMark) { setStatus("当前没有规则冲突或误排除；继续从行、列和色区交叉判断。 "); return; }
  const [row, column] = wrongMark.split(":").map(Number);
  regionFlash = { row, column, type: "error", until: performance.now() + 1400 };
  setStatus("这里错误地排除了答案格；查冲突不消耗提示能量。 "); drawRegionLogic();
}

function hintRegionEliminate() {
  if (!spendRegionHint(1)) return;
  for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
    const key = regionKey(row, column);
    if (regionPuzzle.solution[row] === column || autoRegionMarks.has(key) || manualRegionMarks.has(key)) continue;
    snapshotRegionState(); manualRegionMarks.add(key);
    regionFlash = { row, column, type: "hint", until: performance.now() + 1100 };
    setStatus("已排除一格，不会替你落星；消耗 1 点提示能量。 "); drawRegionLogic(); return;
  }
  setStatus("当前可排除格都已经标记。 ");
}

function hintRegionCorrect() {
  if (currentCampaignLevel().tier >= 3) { setStatus("进阶关不再直接点亮答案；可用排除提示继续推理。 "); return; }
  if (!spendRegionHint(2)) return;
  const row = regionPuzzle.solution.findIndex((column, index) => !placedRegionStars.has(regionKey(index, column)));
  if (row < 0) return;
  regionFlash = { row, column: regionPuzzle.solution[row], type: "hint", until: performance.now() + 1600 };
  setStatus("点亮了一个正确位置，但不会自动落子；消耗 2 点提示能量。 "); drawRegionLogic();
}

function undoRegionMove() {
  const state = regionHistory.pop();
  if (!state) return;
  placedRegionStars = state.stars; manualRegionMarks = state.marks; recomputeAutoMarks();
  setMetric(placedRegionStars.size + " / " + regionPuzzle.size); setStatus("已撤销上一步。 "); drawRegionLogic();
}

function startGame() {
  applyRegionCampaignSettings();
  regionPuzzle = generateUniqueRegionPuzzle();
  placedRegionStars = new Set(); manualRegionMarks = new Set(); autoRegionMarks = new Set(); regionHistory = [];
  regionPuzzle.fixedStars.forEach((column, row) => placedRegionStars.add(regionKey(row, column)));
  recomputeAutoMarks(); regionMode = "star";
  regionLives = Math.max(2, regionDifficulty.lives - Math.floor((currentCampaignLevel().tier - 1) / 2));
  regionHints = Math.max(0, regionDifficulty.freeHints - Math.floor((currentCampaignLevel().tier - 1) / 2));
  regionFlash = null; regionErrors = 0; regionHintCost = 0; regionLastConflictType = "none"; regionStartedAt = performance.now();
  running = true; hideOverlay(); startAmbient();
  setMetric(placedRegionStars.size + " / " + regionPuzzle.size);
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + regionSize + "×" + regionSize + " · " + regionPuzzle.fixedStars.size + " 颗引导星 · " + regionHints + " 点提示；题面已验证唯一解。 "); drawRegionLogic();
}

function handleControl(value) {
  if (value === "star") { regionMode = "star"; drawRegionLogic(); }
  if (value === "mark") { regionMode = "mark"; drawRegionLogic(); }
  if (value === "undo") undoRegionMove();
  if (value === "hint-conflict") hintRegionConflict();
  if (value === "hint-eliminate") hintRegionEliminate();
  if (value === "hint-correct") hintRegionCorrect();
}
function handleKey(key) {
  if (key.toLowerCase() === "s") { regionMode = "star"; drawRegionLogic(); }
  if (key.toLowerCase() === "x") { regionMode = "mark"; drawRegionLogic(); }
  if (key.toLowerCase() === "z") undoRegionMove();
  if (key.toLowerCase() === "h") hintRegionConflict();
}

canvas.addEventListener("pointerup", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  const layout = regionLayout();
  if (point.y < layout.y || point.y > layout.y + layout.boardSize || point.x < layout.x || point.x > layout.x + layout.boardSize) return;
  toggleRegionCell(Math.min(regionPuzzle.size - 1, Math.floor((point.y - layout.y) / layout.cell)), Math.min(regionPuzzle.size - 1, Math.floor((point.x - layout.x) / layout.cell)));
});

applyRegionCampaignSettings();
regionPuzzle = generateUniqueRegionPuzzle();
regionPuzzle.fixedStars.forEach((column, row) => placedRegionStars.add(regionKey(row, column)));
recomputeAutoMarks();
onCampaignLevelChanged = () => {
  if (!running) {
    applyRegionCampaignSettings();
    regionPuzzle = generateUniqueRegionPuzzle();
    placedRegionStars = new Set();
    regionPuzzle.fixedStars.forEach((column, row) => placedRegionStars.add(regionKey(row, column)));
    recomputeAutoMarks();
    drawRegionLogic();
  }
};
runtimeDebugActions = {
  probeDeadEnd: () => {
    for (let row = 0; row < regionPuzzle.size; row += 1) for (let column = 0; column < regionPuzzle.size; column += 1) {
      if (regionPuzzle.solution[row] === column || findRegionRuleConflict(row, column)) continue;
      toggleRegionCell(row, column);
      return true;
    }
    return false;
  },
  solveRegion: () => {
    placedRegionStars = new Set(regionPuzzle.solution.map((column, row) => regionKey(row, column)));
    recomputeAutoMarks(); drawRegionLogic();
    const elapsed = Math.max(1, Math.round((performance.now() - regionStartedAt) / 1000));
    showResult(true, "星灵巡格完成", "用时 " + elapsed + " 秒 · 错误 " + regionErrors + " 次。 ");
  },
  failRegion: () => { regionLives = 0; regionErrors += 1; drawRegionLogic(); showResult(false, "星能耗尽", "错误次数达到本局上限。 "); },
};
runtimeDebugState = () => ({ level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, size: regionPuzzle.size, lives: regionLives, hints: regionHints, errors: regionErrors, hintCost: regionHintCost, stars: placedRegionStars.size, fixedStars: regionPuzzle.fixedStars.size, uniqueSolutions: countRegionSolutions(regionPuzzle.regions, regionPuzzle.fixedStars), searchNodes: regionPuzzle.complexity.searchNodes, branchPoints: regionPuzzle.complexity.branchPoints, maxCandidates: regionPuzzle.complexity.maxCandidates, complexityTarget: regionComplexityTarget(), directAnswerEnabled: currentCampaignLevel().tier < 3, lastConflictType: regionLastConflictType });
drawRegionLogic();
`;
