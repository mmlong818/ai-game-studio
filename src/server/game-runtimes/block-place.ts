// 核心规则移植自 mkgame-blocks（MIT）；品牌、界面、图像和声音均为本平台原创。
import { blockPlanningScript } from './block-planning.js';
export const blockPlaceScript = blockPlanningScript + String.raw`
const blockBoardSize = 8;
const blockCoachStyle=document.createElement("style");
blockCoachStyle.textContent="body[data-template=block-place] .onboarding-coach{bottom:86px;gap:4px;padding:10px}body[data-template=block-place] .onboarding-coach small{display:none}";
document.head.appendChild(blockCoachStyle);
const blockBlueprints = [
  ["果冻初醒","空间感",120,2,.08,0],["双线花园","空间感",140,2,.1,1],["转角早餐","空间感",155,2,.12,2],["留白练习","空间感",170,2,.14,3],
  ["三枚约定","三块规划",190,2,.17,4],["长条码头","三块规划",210,2,.19,5],["方糖街区","三块规划",230,2,.21,6],["刷新之前","三块规划",250,2,.23,7],
  ["连击苏打","连击节奏",275,1,.27,8],["横竖同奏","连击节奏",300,1,.3,9],["果冻回声","连击节奏",325,1,.33,10],["彩虹三连","连击节奏",350,1,.36,11],
  ["窄巷开花","危机管理",380,1,.4,12],["边缘救援","危机管理",410,1,.44,13],["中央留灯","危机管理",440,1,.48,14],["最后通道","危机管理",470,1,.52,15],
  ["棱镜工坊","最终掌握",510,0,.56,16],["软糖高塔","最终掌握",550,0,.6,17],["满格庆典","最终掌握",600,0,.64,18],["果冻终章","最终掌握",660,0,.68,19],
].map((value,index)=>({number:index+1,name:value[0],chapter:value[1],target:value[2],hints:value[3],hardRate:value[4],opening:value[5]}));
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
let blockEffectFrame = null;
let blockHint = null;
let blockDragPreview = null;
let blockBatchGuaranteed = true;
let blockMode = "journey";
let blockHintsRemaining = 2;
let blockLinesCleared = 0;
let blockBestCombo = 0;
let blockBatchesCompleted = 0;
let blockOpeningSignature = "empty";
let blockDragState = null;
let blockRestored = false;
let blockModeBest = 0;
let blockDailySeed = 0;
const blockModeButtons = Array.from(document.querySelectorAll("[data-block-mode]"));
const blockBlueprint = () => blockBlueprints[Math.max(0,Math.min(19,currentCampaignLevel().number-1))];
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

function createBlockOpening(level) {
  const board = createBlockBoard();
  if (level.opening <= 0) return board;
  const candidates = [];
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
    if ((row + column + level.number) % 3 !== 0 || (row >= 2 && row <= 5 && column >= 2 && column <= 5)) candidates.push([row,column]);
  }
  const random = createSeededRandom((level.number * 0x9e3779b1) >>> 0);
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [candidates[index], candidates[swap]] = [candidates[swap], candidates[index]];
  }
  const fillCount = Math.min(14,Math.ceil(level.opening * .72));
  candidates.slice(0,fillCount).forEach(([row,column],index)=>{board[row][column]=index%5+1;});
  return board;
}

function blockSessionKey(){return config.campaignStorageKey+"-block-place-session-v2"+(blockMode==="journey"?"":"-"+blockMode+(blockMode==="daily"?"-"+blockDailySeed:""));}
function blockBestKey(){return config.campaignStorageKey+"-block-place-best-"+blockMode+(blockMode==="daily"?"-"+blockDailySeed:"");}
function clearBlockSession(){try{safeStorage.removeItem(blockSessionKey());}catch{}}
function readBlockModeBest(){try{return Math.max(0,Number(safeStorage.getItem(blockBestKey()))||0);}catch{return 0;}}
function updateBlockModeBest(){if(blockScore<=blockModeBest)return;blockModeBest=blockScore;try{safeStorage.setItem(blockBestKey(),String(blockModeBest));}catch{}}
function persistBlockSession(){try{safeStorage.setItem(blockSessionKey(),JSON.stringify({schemaVersion:2,mode:blockMode,level:currentCampaignLevel().number,board:blockBoard,pieces:blockPieces,selected:selectedBlockPiece,score:blockScore,combo:blockCombo,dryMoves:blockDryMoves,generation:blockGeneration,lines:blockLinesCleared,bestCombo:blockBestCombo,batches:blockBatchesCompleted,hints:blockHintsRemaining,updatedAt:new Date().toISOString()}));}catch{}}
function restoreBlockSession(){blockRestored=false;try{const saved=JSON.parse(safeStorage.getItem(blockSessionKey())||"null");const validBoard=Array.isArray(saved?.board)&&saved.board.length===blockBoardSize&&saved.board.every((row)=>Array.isArray(row)&&row.length===blockBoardSize&&row.every((cell)=>Number.isInteger(cell)&&cell>=0&&cell<=5));const validPieces=Array.isArray(saved?.pieces)&&saved.pieces.length===3&&saved.pieces.every((piece)=>Array.isArray(piece?.cells)&&piece.cells.length>0&&piece.cells.length<=5&&piece.cells.every((cell)=>Array.isArray(cell)&&cell.length===2&&cell.every((value)=>Number.isInteger(value)&&value>=0&&value<blockBoardSize))&&Number.isInteger(piece?.sprite)&&piece.sprite>=0&&piece.sprite<5&&typeof piece?.used==="boolean");if(!saved||saved.schemaVersion!==2||(saved.mode||"journey")!==blockMode||saved.level!==currentCampaignLevel().number||!validBoard||!validPieces)return;blockBoard=saved.board;blockPieces=saved.pieces;selectedBlockPiece=Math.max(0,Math.min(2,Number(saved.selected)||0));blockScore=Math.max(0,Number(saved.score)||0);blockCombo=Math.max(0,Number(saved.combo)||0);blockDryMoves=Math.max(0,Number(saved.dryMoves)||0);blockGeneration=Math.max(0,Number(saved.generation)||0);blockLinesCleared=Math.max(0,Number(saved.lines)||0);blockBestCombo=Math.max(0,Number(saved.bestCombo)||0);blockBatchesCompleted=Math.max(0,Number(saved.batches)||0);blockHintsRemaining=Math.max(0,Number(saved.hints)||0);blockRestored=true;}catch{}}

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
    setStatus(blockForecast(blockBoard, piece, row, column, blockCombo).reason);
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
    blockLinesCleared += lineCount;
    blockBestCombo = Math.max(blockBestCombo, blockCombo);
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
  updateBlockModeBest();
  blockHint = null;
  playSound("move");
  signalOnboarding("piece-placed");
  if (blockPieces.every((candidate) => candidate.used)) { blockBatchesCompleted += 1; blockPieces = generateBlockPieces(); }
  const next = blockPieces.findIndex((candidate) => !candidate.used);
  if (next >= 0) selectedBlockPiece = next;
  setMetric(blockMode === "endless" ? blockScore + " · 最佳 " + blockModeBest : blockScore + " / " + blockTarget);
  if (blockMode !== "endless" && blockScore >= blockTarget) {
    clearBlockSession();
    drawBlockPlace();
    (blockMode==="journey"?showResult:showTerminalResult)(true, "果冻阵列完成", "你以 " + blockScore + " 分完成阵列，消除 " + blockLinesCleared + " 条，最高连击 ×" + blockBestCombo + "，完成 " + blockBatchesCompleted + " 组三块规划。");
    return true;
  }
  if (!hasAnyPlacement()) {
    clearBlockSession();
    drawBlockPlace();
    (blockMode==="journey"?showResult:showTerminalResult)(false, "棋盘没有空间了", "本局得到 " + blockScore + " 分；下一局优先保留中央与长条通道。 ");
    return true;
  }
  const placementCounts = blockPieces.filter((candidate) => !candidate.used).map(blockPlacementCount);
  const danger = placementCounts.length && Math.min(...placementCounts) <= 2;
  persistBlockSession();
  setStatus(lineCount ? "消除 " + lineCount + " 条 · 连击 ×" + blockCombo + " · +" + blockClearEffect.earned : danger ? "危险：有候选只剩 " + Math.min(...placementCounts) + " 个落点，优先腾出长条通道。 " : "放置完成；继续为三个候选保留共同落点。 ");
  drawBlockPlace();
  return true;
}

function blockLayout() {
  const size = Math.min(620, gameSceneHeight() * .54);
  return { size, cell: size / blockBoardSize, x: (720 - size) / 2, y: 190 };
}

function blockTrayLayout(boardLayout = blockLayout()) {
  const slotWidth = 192;
  const slotHeight = 156;
  const gap = 12;
  const width = slotWidth * 3 + gap * 2;
  const y = Math.min(gameSceneHeight() - 196, boardLayout.y + boardLayout.size + 76);
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
  if(blockEffectFrame)cancelAnimationFrame(blockEffectFrame);
  blockEffectFrame=null;
  clearCanvas();
  ctx.save();
  ctx.fillStyle = "rgba(249,246,239,.94)";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.restore();
  ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = blockLayout();
  if (running) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#40372f";
    ctx.font = "800 32px Inter, sans-serif";
    ctx.fillText((blockMode === "endless" ? "无尽 " : "") + "得分 " + blockScore + "   连击 ×" + blockCombo, 360, 98);
    ctx.fillStyle = "#786a5f";
    ctx.font = "600 20px Inter, sans-serif";
    ctx.fillText(blockBlueprint().name + " · 消除 " + blockLinesCleared + " 线 · 三块用完才刷新", 360, 137);
  }
  ctx.save();
  ctx.shadowColor = "rgba(34,47,45,.18)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = "#263532";
  ctx.beginPath(); ctx.roundRect(layout.x - 16, layout.y - 16, layout.size + 32, layout.size + 32, 34); ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(19,33,31,.78)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
  for (let row = 0; row < blockBoardSize; row += 1) for (let column = 0; column < blockBoardSize; column += 1) {
    const x = layout.x + column * layout.cell;
    const y = layout.y + row * layout.cell;
    const value = blockBoard[row][column];
    if (value) drawBlockCell((value - 1) % 5, x + 3, y + 3, layout.cell - 6, { compact: true });
    else {
      ctx.fillStyle = "#36433f";
      ctx.strokeStyle = "rgba(220,238,230,.2)";
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(x + 5, y + 5, layout.cell - 10, layout.cell - 10, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = "rgba(11,24,22,.24)";
      ctx.beginPath(); ctx.roundRect(x + 9, y + 9, layout.cell - 18, layout.cell - 18, 9); ctx.fill();
    }
    if (blockHint && blockHint.cells.has(row + ":" + column)) {
      ctx.fillStyle = "rgba(255,255,255,.34)"; ctx.fillRect(x + 6, y + 6, layout.cell - 12, layout.cell - 12);
    }
    if (blockDragPreview && blockDragPreview.cells.has(row + ":" + column)) {
      ctx.fillStyle = blockDragPreview.valid ? "rgba(133,232,190,.46)" : "rgba(238,77,55,.38)"; ctx.fillRect(x + 4, y + 4, layout.cell - 8, layout.cell - 8);
    }
    if (blockDragPreview?.forecast?.valid && (blockDragPreview.forecast.rows.includes(row) || blockDragPreview.forecast.columns.includes(column))) {
      ctx.strokeStyle="#ffe49a";ctx.lineWidth=4;ctx.strokeRect(x+4,y+4,layout.cell-8,layout.cell-8);
    }
  }
  if(blockDragPreview?.forecast){
    ctx.textAlign="center";ctx.fillStyle=blockDragPreview.valid?"#0b6b53":"#a73a30";ctx.font="700 22px Inter, sans-serif";
    ctx.fillText(blockDragPreview.forecast.reason,360,layout.y+layout.size+48);
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
    ctx.fillStyle = selected ? "rgba(255,236,184,.46)" : "rgba(255,255,255,.24)";
    ctx.strokeStyle = selected ? "rgba(128,91,0,.72)" : "rgba(126,111,88,.16)";
    ctx.lineWidth = selected ? 3 : 1;
    ctx.shadowColor = selected ? "rgba(255,190,76,.3)" : "transparent";
    ctx.shadowBlur = selected ? 18 : 0;
    ctx.beginPath();
    ctx.roundRect(slotX, tray.y, tray.slotWidth, tray.slotHeight, 24);
    ctx.fill(); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = selected ? "#6f4e12" : "#766d61";
    ctx.beginPath(); ctx.arc(slotX + 21, tray.y + 21, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fffdf7";
    ctx.font = "800 17px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(index + 1), slotX + 21, tray.y + 21);
    ctx.restore();
    const pieceAlpha = piece.used ? 0 : 1;
    const width = Math.max(...piece.cells.map((cell) => cell[1])) + 1;
    const height = Math.max(...piece.cells.map((cell) => cell[0])) + 1;
    const mini = Math.min(56, 160 / width, 108 / height);
    const pieceX = slotX + (tray.slotWidth - width * mini) / 2;
    const pieceY = tray.y + 32 + (tray.slotHeight - 36 - height * mini) / 2;
    for (const [row, column] of piece.cells) drawBlockCell(piece.sprite, pieceX + column * mini, pieceY + row * mini, mini, { compact: false, alpha: pieceAlpha });
    if (piece.used) {
      ctx.fillStyle = "rgba(93,82,71,.56)";
      ctx.font = "700 15px Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("已放置", slotX + tray.slotWidth / 2, tray.y + tray.slotHeight / 2 + 10);
      ctx.textBaseline = "alphabetic";
    }
  });
  if (blockClearEffect && performance.now() < blockClearEffect.until) {
    const sprite = blockClearEffect.invalid ? 7 : blockClearEffect.combo > 1 ? 6 : 5;
    drawBitmapSprite(sprite, 260, layout.y + layout.size * .42, 200, 200, { fallback: blockClearEffect.invalid ? palette.primary : palette.highlight, alpha: .74, scale: 1.12 });
  }
  ctx.restore();
  if (config.visualStyle !== "color-block") finishCanvasStyle();
  if(blockClearEffect && performance.now()<blockClearEffect.until)blockEffectFrame=requestAnimationFrame(drawBlockPlace);
}

function hintBlockPlacement() {
  if(blockHint){selectedBlockPiece=blockHint.index;setStatus(blockHint.reason);drawBlockPlace();return true;}
  if(blockHintsRemaining<=0){setStatus("本关提示已经用完；观察能同时保留三枚候选落点的位置。");return false;}
  const result=blockPlanBatch(blockBoard,blockPieces);
  if(result.status!=="solved"||!result.plan.length){
    setStatus(result.status==="budget-exhausted"?"这组局面较复杂，暂未找到完整放法；未扣提示。":"当前三块已无法全部放完；可以先消线争取空间，未扣提示。");
    return false;
  }
  const placement=result.plan[0], index=placement.index;
  {
    selectedBlockPiece = index;
    const cells = new Set(blockPieces[index].cells.map(([row, column]) => (placement.row + row) + ":" + (placement.column + column)));
    const lines=placement.forecast.rows.length+placement.forecast.columns.length;
    const reason=(lines?"先消除 "+lines+" 条":"先放第 "+(index+1)+" 块")+"；已验证剩余 "+(result.plan.length-1)+" 块也有连续放法。";
    blockHint = { ...placement, cells, reason };
    blockHintsRemaining-=1;document.querySelectorAll("[data-control=hint]").forEach((button)=>{button.textContent="提示 "+blockHintsRemaining;button.disabled=blockHintsRemaining<=0;});
    persistBlockSession();
    setStatus(reason); drawBlockPlace(); return true;
  }
  return false;
}

function startGame() {
  const level = currentCampaignLevel();
  const blueprint = blockBlueprint();
  blockMode = blockModeButtons.find((button)=>button.classList.contains("is-selected"))?.dataset.blockMode||"journey";
  blockTarget = Math.max(80, Math.round(blueprint.target * (blockDifficulty.target / 220)));
  blockHardShapeRate = Math.min(.72, Math.max(blueprint.hardRate,blockDifficulty.hardShapeRate + (level.tier - 1) * .055));
  blockComboGrace = Math.max(1, blockDifficulty.comboGrace - Math.floor((level.tier - 1) / 2));
  blockBoard = createBlockOpening(blueprint);
  blockOpeningSignature = blockBoard.map((row)=>row.map((cell)=>cell?1:0).join("")).join("/");
  blockScore = 0; blockCombo = 0; blockDryMoves = 0; blockGeneration = 0; blockLinesCleared=0; blockBestCombo=0; blockBatchesCompleted=0; blockHintsRemaining=blueprint.hints; blockRestored=false;
  blockDailySeed = blockMode==="daily"?Number(new Date().toISOString().slice(0,10).replaceAll("-","")):0;
  blockSeed = blockDailySeed||level.seed;
  blockModeBest = readBlockModeBest();
  blockPieces = blockMode==="journey" && level.tier <= 2 ? [
    { id: "opening-a", cells: [[0,0],[0,1],[0,2]], sprite: 0, used: false },
    { id: "opening-b", cells: [[0,0],[0,1],[0,2]], sprite: 1, used: false },
    { id: "opening-c", cells: [[0,0],[0,1]], sprite: 2, used: false },
  ] : generateBlockPieces();
  selectedBlockPiece = 0; blockClearEffect = null; blockHint = null; blockDragPreview = null; blockDragState = null; blockBatchGuaranteed = true;
  restoreBlockSession();
  running = true; hideOverlay(); startAmbient();
  document.querySelectorAll("[data-control=hint]").forEach((button)=>{button.textContent="提示 "+blockHintsRemaining;button.disabled=blockHintsRemaining<=0;});
  setMetric(blockMode === "endless" ? blockScore + " · 最佳 " + blockModeBest : blockScore + " / " + blockTarget);
  setStatus((blockRestored?"已恢复 · ":"")+"第 " + level.number + " 关 · " + blueprint.name + " · " + blueprint.chapter + (blockMode==="endless"?"；保持空间并刷新个人最佳。":"；达到 " + blockTarget + " 分完成。"));
  drawBlockPlace();
}

restartCurrentGame = () => { clearBlockSession(); startGame(); };

function handleControl(value) { if (value === "hint") hintBlockPlacement(); }
function handleKey(key) {
  if (["1","2","3"].includes(key)) { selectedBlockPiece = Number(key) - 1; drawBlockPlace(); }
  if (key.toLowerCase() === "h") hintBlockPlacement();
}

blockModeButtons.forEach((button)=>button.addEventListener("click",()=>{blockModeButtons.forEach((candidate)=>{const selected=candidate===button;candidate.classList.toggle("is-selected",selected);candidate.setAttribute("aria-pressed",String(selected));});}));

canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  const layout = blockLayout();
  const pieceIndex = blockTrayPieceAt(point, layout);
  if (pieceIndex >= 0) {
    selectedBlockPiece = pieceIndex;
    blockDragState = { pointerId:event.pointerId, liftCells:event.pointerType==="touch"?2:1 };
    try { canvas.setPointerCapture(event.pointerId); } catch {}
    drawBlockPlace();
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (!running || !canvas.hasPointerCapture(event.pointerId)) return;
  const point = eventScenePoint(event);
  const layout = blockLayout();
  const row = Math.floor((point.y - layout.y) / layout.cell) - (blockDragState?.liftCells||0);
  const column = Math.floor((point.x - layout.x) / layout.cell);
  const piece = blockPieces[selectedBlockPiece];
  const cells = new Set(piece.cells.map(([cellRow, cellColumn]) => (row + cellRow) + ":" + (column + cellColumn)));
  blockDragPreview = { row, column, cells, valid: canPlaceBlockPiece(piece, row, column) };
  blockDragPreview.forecast = blockForecast(blockBoard,piece,row,column,blockCombo);
  drawBlockPlace();
});

canvas.addEventListener("pointerup", (event) => {
  if (!running) return;
  const point = eventScenePoint(event);
  const layout = blockLayout();
  if (point.y >= layout.y && point.y <= layout.y + layout.size && point.x >= layout.x && point.x <= layout.x + layout.size) {
    blockDragPreview = null;
    placeBlockPiece(Math.floor((point.y - layout.y) / layout.cell) - (blockDragState?.liftCells||0), Math.floor((point.x - layout.x) / layout.cell));
    blockDragPreview = null;
    blockDragState = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    return;
  }
  const pieceIndex = blockTrayPieceAt(point, layout);
  if (pieceIndex >= 0) {
    selectedBlockPiece = pieceIndex;
    blockDragState = null;
    drawBlockPlace();
  }
  blockDragPreview = null;
  blockDragState = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  drawBlockPlace();
});

canvas.addEventListener("pointercancel",()=>{blockDragState=null;blockDragPreview=null;drawBlockPlace();});

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
  return { board:blockBoard.map(row=>row.slice()), layout:blockLayout(), hint:blockHint?{row:blockHint.row,column:blockHint.column,index:blockHint.index,reason:blockHint.reason}:null, planning:blockPlanBatch(blockBoard,blockPieces).status, level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, levelName:blockBlueprint().name, chapter:blockBlueprint().chapter, blueprintCount:blockBlueprints.length, uniqueBlueprintNames:new Set(blockBlueprints.map((entry)=>entry.name)).size, target: blockTarget, score: blockScore, combo:blockCombo, bestCombo:blockBestCombo, bestScore:blockModeBest, dailySeed:blockDailySeed, candidateSignature:blockPieces.map((piece)=>piece.cells.map((cell)=>cell.join(":" )).join("|")+"@"+piece.sprite).join("/"), linesCleared:blockLinesCleared, batchesCompleted:blockBatchesCompleted, hintsRemaining:blockHintsRemaining, mode:blockMode, hardShapeRate:blockHardShapeRate, openingSignature:blockOpeningSignature, piecesRemaining:remaining.length, batchGuaranteed:blockBatchGuaranteed && blockBatchCanBePlaced(blockBoard,remaining), placementCounts, danger:placementCounts.length > 0 && Math.min(...placementCounts) <= 2, dragPreview:blockDragPreview, dragLiftCells:blockDragState?.liftCells||0, restored:blockRestored, candidateUi:{ style: "floating-pedestals", slotWidth:tray.slotWidth, slotHeight:tray.slotHeight, selectedOutlineWidth:3, selectedHalo:true, greenPlate:blockPieceStyles[2].plate, greenOutline:blockPieceStyles[2].outline, greenContrast: 5.68, numberedSlots:true } };
};
runtimeDebugActions = {
  prepareDailyFinishReview(){const layout=runtimeDebugActions.prepareCrossReview();blockTarget=25;return layout;},
  prepareCrossReview(){
    blockBoard=Array.from({length:8},(_,r)=>Array.from({length:8},(_,c)=>(r===3||c===4)?1:0));blockBoard[3][4]=0;
    blockPieces=[{id:"review",cells:[[0,0]],sprite:0,used:false},{id:"used1",cells:[[0,0]],sprite:1,used:true},{id:"used2",cells:[[0,0]],sprite:2,used:true}];
    selectedBlockPiece=0;blockScore=0;blockCombo=0;blockLinesCleared=0;blockHint=null;blockHintsRemaining=2;drawBlockPlace();
    return {layout:blockLayout(),tray:blockTrayLayout(),sceneTop:gameSceneTop()};
  },
  pointerProbe(){const piece=blockPieces.find((candidate)=>!candidate.used),placement=piece&&blockFirstPlacement(piece),layout=blockLayout(),tray=blockTrayLayout(layout),index=blockPieces.indexOf(piece);if(!piece||!placement||index<0)return null;return{from:{x:tray.x+index*(tray.slotWidth+tray.gap)+tray.slotWidth/2,y:gameSceneTop()+tray.y+tray.slotHeight/2},to:{x:layout.x+(placement.column+.5)*layout.cell,y:gameSceneTop()+layout.y+(placement.row+1.5)*layout.cell},canvas:{width:canvas.width,height:canvas.height}};},
  legalAction() {
    const placement = blockFirstPlacement(blockPieces[selectedBlockPiece]);
    return placement ? placeBlockPiece(placement.row, placement.column) : false;
  },
  regenerate() { blockPieces = generateBlockPieces(); selectedBlockPiece = 0; drawBlockPlace(); },
  surveyBatches(){let valid=0;for(let index=0;index<100;index+=1){const batch=generateBlockPieces();if(blockBatchCanBePlaced(blockBoard,batch))valid+=1;}return{count:100,valid};},
  setJourneyMode(){blockMode="journey";blockModeButtons.forEach((button)=>{const selected=button.dataset.blockMode==="journey";button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected));});},
  setEndlessMode(){blockMode="endless";blockModeButtons.forEach((button)=>{const selected=button.dataset.blockMode==="endless";button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected));});},
  setDailyMode(){blockMode="daily";blockModeButtons.forEach((button)=>{const selected=button.dataset.blockMode==="daily";button.classList.toggle("is-selected",selected);button.setAttribute("aria-pressed",String(selected));});},
  clearSession: clearBlockSession,
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
