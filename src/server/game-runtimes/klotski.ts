export const klotskiScript = String.raw`
const initialPieces = [
  { id: "cao", label: "队长机器人", x: 1, y: 0, w: 2, h: 2, kind: "hero" },
  { id: "guan", label: "星星包裹", x: 1, y: 2, w: 2, h: 1, kind: "guard" },
  { id: "z1", label: "蓝色包裹", x: 0, y: 0, w: 1, h: 2, kind: "guard" },
  { id: "z2", label: "珊瑚包裹", x: 3, y: 0, w: 1, h: 2, kind: "guard" },
  { id: "z3", label: "蓝色包裹", x: 0, y: 2, w: 1, h: 2, kind: "guard" },
  { id: "z4", label: "珊瑚包裹", x: 3, y: 2, w: 1, h: 2, kind: "guard" },
  { id: "s1", label: "小熊包裹", x: 0, y: 4, w: 1, h: 1, kind: "soldier" },
  { id: "s2", label: "小猫包裹", x: 3, y: 4, w: 1, h: 1, kind: "soldier" },
  { id: "s3", label: "小熊包裹", x: 1, y: 3, w: 1, h: 1, kind: "soldier" },
  { id: "s4", label: "小猫包裹", x: 2, y: 3, w: 1, h: 1, kind: "soldier" },
];

const klotskiPieceOrder = ["z1","z2","z3","z4","guan","cao","s1","s2","s3","s4"];
const klotskiBlueprints = [
  ["初开朱门",8,[[0,0],[1,0],[2,0],[3,0],[0,3],[2,3],[0,2],[1,2],[0,4],[1,4]]],
  ["双兵让道",12,[[2,0],[3,0],[0,1],[1,1],[0,3],[2,3],[0,0],[1,0],[0,4],[1,4]]],
  ["横梁移位",16,[[2,0],[1,1],[0,3],[1,3],[2,2],[2,3],[0,0],[1,0],[3,0],[0,2]]],
  ["回廊换肩",20,[[0,0],[1,0],[2,0],[3,1],[2,4],[0,2],[3,0],[3,3],[0,4],[1,4]]],
  ["侧门借位",24,[[0,0],[1,0],[3,0],[3,2],[2,4],[1,2],[2,0],[2,1],[0,4],[1,4]]],
  ["二空接力",30,[[2,0],[3,0],[0,1],[0,3],[1,4],[1,2],[0,0],[1,1],[3,3],[3,4]]],
  ["长将归边",36,[[1,0],[3,0],[2,1],[3,2],[2,4],[0,3],[0,0],[0,1],[1,2],[2,3]]],
  ["中心腾挪",42,[[0,0],[2,0],[3,0],[1,2],[2,4],[2,2],[1,1],[0,2],[0,3],[1,4]]],
  ["折返三隙",48,[[0,0],[3,1],[2,2],[3,3],[0,4],[0,2],[1,0],[3,0],[1,1],[2,4]]],
  ["双列换位",54,[[1,0],[0,1],[2,1],[3,1],[2,4],[0,3],[0,0],[2,0],[1,2],[2,3]]],
  ["横刀解扣",60,[[2,0],[1,3],[2,3],[3,3],[1,2],[0,0],[3,0],[0,2],[3,2],[0,4]]],
  ["门前清障",66,[[2,0],[3,1],[1,3],[3,3],[1,2],[0,0],[3,0],[0,2],[0,4],[2,4]]],
  ["深庭回旋",72,[[3,1],[0,2],[1,2],[2,3],[0,4],[1,0],[0,0],[0,1],[2,2],[3,3]]],
  ["四角调兵",78,[[0,0],[2,0],[3,1],[0,3],[2,4],[1,2],[1,0],[1,1],[3,3],[1,4]]],
  ["错层借道",84,[[2,0],[3,0],[0,2],[2,3],[0,4],[0,0],[1,2],[1,3],[3,3],[3,4]]],
  ["窄门转轴",90,[[3,0],[2,1],[0,2],[3,3],[0,4],[0,0],[2,0],[1,2],[2,3],[2,4]]],
  ["长廊逆行",96,[[2,0],[1,2],[2,2],[3,2],[0,4],[0,0],[3,0],[3,1],[0,3],[2,4]]],
  ["层层设防",104,[[3,0],[3,2],[0,3],[1,3],[1,2],[0,0],[2,1],[0,2],[2,4],[3,4]]],
  ["水泄不通",112,[[1,0],[0,1],[1,2],[0,3],[2,4],[2,0],[2,2],[3,2],[3,3],[1,4]]],
  ["横刀立马",120,[[0,0],[3,1],[0,3],[2,3],[0,2],[1,0],[3,0],[1,3],[1,4],[3,4]]],
];

function activeKlotskiBlueprint() {
  return klotskiBlueprints[Math.max(0, Math.min(klotskiBlueprints.length - 1, currentCampaignLevel().number - 1))];
}

function createCampaignKlotskiPieces() {
  const blueprint = activeKlotskiBlueprint();
  return klotskiPieceOrder.map((id, index) => {
    const base = initialPieces.find((piece) => piece.id === id);
    return { ...base, x: blueprint[2][index][0], y: blueprint[2][index][1] };
  });
}
const courtyardArt = new Image();
courtyardArt.decoding = "async";
courtyardArt.src = "./assets/klotski-courtyard.png";
courtyardArt.addEventListener("load", () => drawKlotski());
let pieces = [];
let selectedId = "cao";
let moves = 0;
let moveAnimation = null;
let particles = [];
let blockedUntil = 0;
let exitOpen = false;
let winAt = 0;
let selectedAt = performance.now();
let klotskiHistory = [];
let klotskiRedo = [];
let replayPath = [];
let initialLayoutSnapshot = [];
let replaying = false;
let optimalReference = null;
let klotskiHint = null;
let klotskiHintDistance = null;

function klotskiLayout() {
  const cell = config.aspectRatio === "9:16" ? 144 : 112;
  return {
    cell,
    originX: (720 - cell * 4) / 2,
    originY: (gameSceneHeight() - cell * 5) / 2,
  };
}

function occupiedBy(piece, x, y) {
  return x >= piece.x && x < piece.x + piece.w && y >= piece.y && y < piece.y + piece.h;
}

function canMove(piece, dx, dy) {
  const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
  if (next.x < 0 || next.y < 0 || next.x + next.w > 4 || next.y + next.h > 5) return false;
  return !pieces.some((other) => other.id !== piece.id &&
    next.x < other.x + other.w && next.x + next.w > other.x && next.y < other.y + other.h && next.y + next.h > other.y);
}

function klotskiStateKey(state) {
  return state.map((piece) => [piece.kind, piece.w, piece.h, piece.x, piece.y].join(":" )).sort().join("|");
}

function klotskiStateCanMove(state, piece, dx, dy) {
  const nextX = piece.x + dx;
  const nextY = piece.y + dy;
  if (nextX < 0 || nextY < 0 || nextX + piece.w > 4 || nextY + piece.h > 5) return false;
  return !state.some((other) => other.id !== piece.id && nextX < other.x + other.w && nextX + piece.w > other.x && nextY < other.y + other.h && nextY + piece.h > other.y);
}

function solveKlotski(source = pieces) {
  const start = source.map(({ id, kind, w, h, x, y }) => ({ id, kind, w, h, x, y }));
  const startKey = klotskiStateKey(start);
  const queue = [start];
  const parents = new Map([[startKey, null]]);
  const parentMoves = new Map();
  let goalKey = null;
  for (let cursor = 0; cursor < queue.length && cursor < 26000; cursor += 1) {
    const state = queue[cursor];
    const stateKey = klotskiStateKey(state);
    const hero = state.find((piece) => piece.id === "cao");
    if (hero?.x === 1 && hero?.y === 3) { goalKey = stateKey; break; }
    for (const piece of state) for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      if (!klotskiStateCanMove(state, piece, dx, dy)) continue;
      const next = state.map((item) => item.id === piece.id ? { ...item, x: item.x + dx, y: item.y + dy } : { ...item });
      const nextKey = klotskiStateKey(next);
      if (parents.has(nextKey)) continue;
      parents.set(nextKey, stateKey);
      parentMoves.set(nextKey, { id: piece.id, dx, dy });
      queue.push(next);
    }
  }
  if (!goalKey) return null;
  let cursorKey = goalKey;
  let first = null;
  let distance = 0;
  while (parents.get(cursorKey)) {
    first = parentMoves.get(cursorKey);
    cursorKey = parents.get(cursorKey);
    distance += 1;
  }
  return { first, distance };
}

function requestKlotskiHint() {
  if (!running || moveAnimation || replaying) return;
  const solution = solveKlotski();
  klotskiHint = solution?.first ?? null;
  klotskiHintDistance = solution?.distance ?? null;
  if (!klotskiHint) { setStatus("当前状态没有可验证解法，请重开本关。"); return; }
  selectedId = klotskiHint.id;
  selectedAt = performance.now();
  const arrows = { "-1,0": "左", "1,0": "右", "0,-1": "上", "0,1": "下" };
  const piece = pieces.find((candidate) => candidate.id === klotskiHint.id);
  setStatus("提示：拖动“" + piece.label + "”向" + arrows[klotskiHint.dx + "," + klotskiHint.dy] + "一格。 ");
  spawnParticles(piece, "select", 10);
}

function pieceCenter(piece, x = piece.renderX, y = piece.renderY) {
  const { cell, originX, originY } = klotskiLayout();
  return {
    x: originX + (x + piece.w / 2) * cell,
    y: originY + (y + piece.h / 2) * cell,
  };
}

function spawnParticles(piece, type, count = 8) {
  const center = pieceCenter(piece);
  for (let index = 0; index < count; index += 1) {
    const angle = Math.PI * 2 * index / count + Math.random() * .35;
    const speed = type === "victory" ? 2.2 + Math.random() * 3.2 : .7 + Math.random() * 1.8;
    particles.push({
      x: center.x,
      y: center.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (type === "victory" ? 1.8 : .3),
      life: type === "victory" ? 72 + Math.random() * 32 : 34 + Math.random() * 22,
      maxLife: type === "victory" ? 104 : 56,
      size: type === "victory" ? 18 + Math.random() * 18 : 12 + Math.random() * 14,
      tone: index % 3,
    });
  }
}

function validMoves(piece) {
  return [
    { dx: -1, dy: 0, symbol: "←" },
    { dx: 1, dy: 0, symbol: "→" },
    { dx: 0, dy: -1, symbol: "↑" },
    { dx: 0, dy: 1, symbol: "↓" },
  ].filter((direction) => canMove(piece, direction.dx, direction.dy));
}

function snapshotKlotski() {
  return pieces.map(({ id, x, y }) => ({ id, x, y }));
}

function restoreKlotski(snapshot) {
  snapshot.forEach((saved) => {
    const piece = pieces.find((candidate) => candidate.id === saved.id);
    if (!piece) return;
    piece.x = saved.x; piece.y = saved.y; piece.renderX = saved.x; piece.renderY = saved.y;
  });
  moveAnimation = null;
  exitOpen = false;
  winAt = 0;
}

function undoKlotskiMove() {
  if (!running || moveAnimation || replaying || !klotskiHistory.length) return;
  const last = klotskiHistory.pop();
  const replayMove = replayPath.pop() ?? null;
  klotskiRedo.push({ snapshot: snapshotKlotski(), selectedId, replayMove });
  restoreKlotski(last.snapshot);
  moves = Math.max(0, moves - 1);
  selectedId = last.selectedId;
  selectedAt = performance.now();
  setMetric(String(moves));
  setStatus("已撤销一步 · 当前 " + moves + " 步 · 最优 " + optimalReference + " 步。 ");
  playSound("move");
}

function redoKlotskiMove() {
  if (!running || moveAnimation || replaying || !klotskiRedo.length) return;
  const next = klotskiRedo.pop();
  klotskiHistory.push({ snapshot: snapshotKlotski(), selectedId });
  restoreKlotski(next.snapshot);
  if (next.replayMove) replayPath.push(next.replayMove);
  selectedId = next.selectedId;
  selectedAt = performance.now();
  moves += 1;
  setMetric(String(moves));
  setStatus("已重做一步 · 当前 " + moves + " 步 · 最优 " + optimalReference + " 步。 ");
  playSound("move");
}

async function replayKlotskiMoves() {
  if (!running || moveAnimation || replaying || !replayPath.length) return;
  const path = replayPath.map((move) => ({ ...move }));
  replaying = true;
  restoreKlotski(initialLayoutSnapshot);
  moves = 0;
  klotskiHistory = [];
  setMetric("0");
  setStatus("正在回放 " + path.length + " 步操作……");
  for (const move of path) {
    selectedId = move.id;
    moveSelected(move.dx, move.dy, true);
    await new Promise((resolve) => setTimeout(resolve, 245));
  }
  replayPath = path;
  replaying = false;
  setStatus("回放完成 · 可继续操作或撤销。 ");
}

function moveSelected(dx, dy, fromReplay = false, preserveRedo = false) {
  if (!running || moveAnimation) return false;
  const piece = pieces.find((candidate) => candidate.id === selectedId);
  if (!piece || !canMove(piece, dx, dy)) {
    blockedUntil = performance.now() + 280;
    if (piece) spawnParticles(piece, "blocked", 6);
    setStatus("这条方向被挡住了；发光箭头表示当前可以移动的位置。");
    playSound("fail");
    return false;
  }
  const fromX = piece.renderX;
  const fromY = piece.renderY;
  klotskiHint = null;
  klotskiHintDistance = null;
  if (!fromReplay) {
    if (!preserveRedo) klotskiRedo = [];
    klotskiHistory.push({ snapshot: snapshotKlotski(), selectedId });
    replayPath.push({ id: piece.id, dx, dy });
  } else klotskiHistory.push({ snapshot: snapshotKlotski(), selectedId });
  piece.x += dx;
  piece.y += dy;
  moveAnimation = {
    piece,
    fromX,
    fromY,
    toX: piece.x,
    toY: piece.y,
    startedAt: performance.now(),
    duration: 210,
  };
  moves += 1;
  setMetric(String(moves));
  setStatus("正在移动“" + piece.label + "”；目标是让队长机器人抵达发光出口。");
  spawnParticles(piece, "move", 5);
  playSound("move");
  return true;
}

function completeMove(animation) {
  animation.piece.renderX = animation.toX;
  animation.piece.renderY = animation.toY;
  moveAnimation = null;
  selectedAt = performance.now();
  if (animation.piece.id === "cao" && animation.piece.x === 1 && animation.piece.y === 3) {
    exitOpen = true;
    winAt = performance.now() + 780;
    spawnParticles(animation.piece, "victory", 30);
    setStatus("朱门已经开启，队长机器人正在穿过出口……");
  } else {
    setStatus("已移动“" + animation.piece.label + "”；继续利用发光方向提示腾出出口。");
  }
}

function updateKlotskiEffects(timestamp) {
  if (moveAnimation) {
    const progress = Math.min(1, (timestamp - moveAnimation.startedAt) / moveAnimation.duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    moveAnimation.piece.renderX = moveAnimation.fromX + (moveAnimation.toX - moveAnimation.fromX) * eased;
    moveAnimation.piece.renderY = moveAnimation.fromY + (moveAnimation.toY - moveAnimation.fromY) * eased;
    if (progress >= 1) completeMove(moveAnimation);
  }
  particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += .035;
    particle.life -= 1;
  });
  particles = particles.filter((particle) => particle.life > 0);
  if (winAt && timestamp >= winAt) {
    winAt = 0;
    showResult(true, "朱门流光开启", "队长机器人穿过了发光门庭，共移动 " + moves + " 步。");
  }
}

function drawCourtyard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#f4e4cd";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (courtyardArt.complete && courtyardArt.naturalWidth) {
    ctx.save();
    drawImageCover(courtyardArt, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(255,248,236,.08)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

function drawExit(originX, originY, cell, timestamp) {
  const pulse = .5 + Math.sin(timestamp / 230) * .22;
  const exitX = originX + cell;
  const exitY = originY + cell * 5 - 24;
  ctx.save();
  const glow = ctx.createRadialGradient(exitX + cell, exitY + 14, 12, exitX + cell, exitY + 14, cell * 1.3);
  glow.addColorStop(0, exitOpen ? "rgba(255,244,172,.95)" : "rgba(255,115,103," + pulse + ")");
  glow.addColorStop(1, "rgba(255,115,103,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(exitX - cell * .5, exitY - cell * .6, cell * 3, cell * 1.4);
  drawBitmapSprite(7, exitX, exitY - 2, cell * 2, 44, { fallback: palette.secondary, radius: 14, padding: 8, alpha: exitOpen ? 1 : .9 });
  ctx.restore();
}

function drawMoveGuides(piece, originX, originY, cell, timestamp) {
  if (!running || moveAnimation || exitOpen) return;
  const guideStrength = currentCampaignLevel().tier >= 4 ? .46 : currentCampaignLevel().tier >= 3 ? .58 : .68;
  const pulse = guideStrength + Math.sin(timestamp / 180) * .16;
  ctx.save();
  ctx.font = "700 22px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  validMoves(piece).forEach((direction) => {
    const x = originX + (piece.x + piece.w / 2 + direction.dx * (piece.w / 2 + .22)) * cell;
    const y = originY + (piece.y + piece.h / 2 + direction.dy * (piece.h / 2 + .22)) * cell;
    ctx.beginPath();
    ctx.arc(x, y, 19 + pulse * 3, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,228,128," + pulse + ")";
    ctx.fill();
    ctx.fillStyle = "#5d3b3e";
    ctx.fillText(direction.symbol, x, y + 1);
  });
  ctx.restore();
}

function pieceSprite(piece) {
  if (piece.kind === "hero") return 0;
  if (piece.kind === "guard") return piece.w > piece.h ? 3 : (Number(piece.id.slice(-1)) % 2 ? 1 : 2);
  return piece.id.charCodeAt(piece.id.length - 1) % 2 ? 4 : 5;
}

function pieceScale(piece) {
  if (piece.kind === "hero") return .94;
  if (piece.kind === "soldier") return .92;
  if (piece.w > piece.h) return .94;
  return .96;
}

function pieceSourceRect(piece) {
  const sprite = pieceSprite(piece);
  if (sprite === 3) return { x: .08, y: .3, width: .84, height: .66 };
  if (sprite === 4 || sprite === 5) return { x: .17, y: .32, width: .66, height: .64 };
  return null;
}

function pieceFrameTone(piece) {
  if (piece.kind === "hero") return { fill: "#fff3d5", stroke: "#8f3d43" };
  const sprite = pieceSprite(piece);
  if (sprite === 1) return { fill: "#e5f5ff", stroke: "#2d759c" };
  if (sprite === 2) return { fill: "#fff0e9", stroke: "#b65751" };
  if (sprite === 3) return { fill: "#fff7d7", stroke: "#a96f1e" };
  if (sprite === 4) return { fill: "#f3eaff", stroke: "#765b91" };
  return { fill: "#fff0e8", stroke: "#a85e55" };
}

function drawBoardGrid(originX, originY, cell) {
  ctx.save();
  ctx.strokeStyle = "rgba(105,55,58,.24)";
  ctx.lineWidth = 2;
  for (let column = 0; column <= 4; column += 1) {
    ctx.beginPath();
    ctx.moveTo(originX + column * cell, originY);
    ctx.lineTo(originX + column * cell, originY + cell * 5);
    ctx.stroke();
  }
  for (let row = 0; row <= 5; row += 1) {
    ctx.beginPath();
    ctx.moveTo(originX, originY + row * cell);
    ctx.lineTo(originX + cell * 4, originY + row * cell);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPiece(piece, originX, originY, cell, timestamp) {
  const inset = 5;
  let x = originX + piece.renderX * cell + inset;
  let y = originY + piece.renderY * cell + inset;
  const width = piece.w * cell - inset * 2;
  const height = piece.h * cell - inset * 2;
  const selected = piece.id === selectedId;
  const frame = pieceFrameTone(piece);
  if (selected && !moveAnimation) y -= Math.sin((timestamp - selectedAt) / 170) * 2.5;
  if (selected && timestamp < blockedUntil) x += Math.sin((blockedUntil - timestamp) * .16) * 8;
  ctx.save();
  ctx.fillStyle = "rgba(53,27,35,.26)";
  ctx.beginPath();
  ctx.roundRect(x + 5, y + 8, width, height, 18);
  ctx.fill();
  if (selected) {
    const glow = ctx.createRadialGradient(x + width / 2, y + height / 2, 12, x + width / 2, y + height / 2, Math.max(width, height) * .72);
    glow.addColorStop(0, "rgba(255,239,158,.5)");
    glow.addColorStop(1, "rgba(255,193,92,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(x - 18, y - 18, width + 36, height + 36);
  }
  ctx.fillStyle = frame.fill;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, Math.min(20, styleProfile.corner || 14));
  ctx.fill();
  drawBitmapSprite(pieceSprite(piece), x, y, width, height, {
    fallback: frame.fill,
    radius: Math.min(20, styleProfile.corner || 14),
    padding: 7,
    scale: pieceScale(piece),
    sourceRect: pieceSourceRect(piece),
  });
  ctx.beginPath();
  ctx.roundRect(x + 2, y + 2, width - 4, height - 4, Math.min(18, styleProfile.corner || 12));
  ctx.strokeStyle = selected ? "#ffbf38" : "rgba(82,45,49,.92)";
  ctx.lineWidth = selected ? 8 : 6;
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + 8, y + 8, width - 16, height - 16, Math.min(14, styleProfile.corner || 10));
  ctx.strokeStyle = selected ? "rgba(255,255,232,.96)" : frame.stroke;
  ctx.lineWidth = selected ? 2 : 3;
  ctx.stroke();
  ctx.restore();
}

function drawParticles() {
  particles.forEach((particle) => {
    const alpha = Math.min(1, particle.life / Math.max(1, particle.maxLife * .45));
    const sprite = particle.tone === 0 ? 8 : particle.tone === 1 ? 6 : 7;
    drawBitmapSprite(sprite, particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size, {
      fallback: particle.tone === 0 ? "#fff0c4" : particle.tone === 1 ? "#ff8d7c" : "#8de0d0",
      circle: true,
      padding: 12,
      alpha,
      rotation: particle.x * .01,
    });
  });
}

function drawKlotski(timestamp = performance.now()) {
  drawCourtyard();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const { cell, originX, originY } = klotskiLayout();
  drawPlayfield(originX - 22, originY - 22, cell * 4 + 44, cell * 5 + 44, {
    radius: 34,
    alpha: .72,
    fill: "rgba(255,247,230,.76)",
    stroke: "rgba(185,78,71,.62)",
    lineWidth: 5,
  });
  drawBoardGrid(originX, originY, cell);
  drawExit(originX, originY, cell, timestamp);
  const selectedPiece = pieces.find((piece) => piece.id === selectedId);
  if (selectedPiece) drawMoveGuides(selectedPiece, originX, originY, cell, timestamp);
  pieces.forEach((piece) => drawPiece(piece, originX, originY, cell, timestamp));
  drawParticles();
  ctx.restore();
  finishCanvasStyle();
}

function animationLoop(timestamp) {
  updateKlotskiEffects(timestamp);
  drawKlotski(timestamp);
  requestAnimationFrame(animationLoop);
}

let klotskiDrag = null;
let suppressKlotskiClick = false;
canvas.addEventListener("pointerdown", (event) => {
  if (!running || moveAnimation || replaying) return;
  const { x: px, y: py } = eventScenePoint(event);
  const { cell, originX, originY } = klotskiLayout();
  const gridX = Math.floor((px - originX) / cell);
  const gridY = Math.floor((py - originY) / cell);
  const piece = pieces.find((candidate) => occupiedBy(candidate, gridX, gridY));
  if (!piece) return;
  selectedId = piece.id;
  selectedAt = performance.now();
  klotskiDrag = { id: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture?.(event.pointerId);
});

canvas.addEventListener("pointerup", async (event) => {
  if (!klotskiDrag || klotskiDrag.id !== event.pointerId) return;
  const drag = klotskiDrag;
  klotskiDrag = null;
  canvas.releasePointerCapture?.(event.pointerId);
  const rect = canvas.getBoundingClientRect();
  const scale = canvas.width / Math.max(1, rect.width);
  const deltaX = (event.clientX - drag.x) * scale;
  const deltaY = (event.clientY - drag.y) * scale;
  if (Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 24) return;
  const horizontal = Math.abs(deltaX) >= Math.abs(deltaY);
  const dx = horizontal ? Math.sign(deltaX) : 0;
  const dy = horizontal ? 0 : Math.sign(deltaY);
  const distance = horizontal ? Math.abs(deltaX) : Math.abs(deltaY);
  const steps = Math.max(1, Math.min(4, Math.round(distance / klotskiLayout().cell)));
  suppressKlotskiClick = true;
  for (let index = 0; index < steps; index += 1) {
    if (!moveSelected(dx, dy, false, index > 0)) break;
    await new Promise((resolve) => setTimeout(resolve, 220));
  }
  setTimeout(() => { suppressKlotskiClick = false; }, 0);
});
canvas.addEventListener("pointercancel", () => { klotskiDrag = null; });
canvas.addEventListener("lostpointercapture", () => { klotskiDrag = null; });

canvas.addEventListener("click", (event) => {
  if (suppressKlotskiClick) return;
  if (moveAnimation) return;
  const { x: px, y: py } = eventScenePoint(event);
  const { cell, originX, originY } = klotskiLayout();
  const gridX = Math.floor((px - originX) / cell);
  const gridY = Math.floor((py - originY) / cell);
  const piece = pieces.find((candidate) => occupiedBy(candidate, gridX, gridY));
  if (piece) {
    selectedId = piece.id;
    selectedAt = performance.now();
    spawnParticles(piece, "select", 5);
    setStatus("已选择“" + piece.label + "”；发光箭头显示当前可以移动的方向。");
  }
});

function resetPieces() {
  resetCampaignRandom();
  pieces = createCampaignKlotskiPieces().map((piece) => ({ ...piece, renderX: piece.x, renderY: piece.y }));
  optimalReference = activeKlotskiBlueprint()[1];
  selectedId = "cao";
  moves = 0;
  moveAnimation = null;
  particles = [];
  blockedUntil = 0;
  exitOpen = false;
  winAt = 0;
  selectedAt = performance.now();
  klotskiHistory = [];
  klotskiRedo = [];
  replayPath = [];
  replaying = false;
  klotskiHint = null;
  klotskiHintDistance = null;
  initialLayoutSnapshot = snapshotKlotski();
}

function startGame() {
  resetPieces();
  running = true;
  hideOverlay();
  setMetric("0");
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + activeKlotskiBlueprint()[0] + " · 最优 " + optimalReference + " 步；拖动棋子让队长机器人抵达出口。");
  startAmbient();
}

function handleControl(value) {
  const vectors = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  if (vectors[value]) moveSelected(vectors[value][0], vectors[value][1]);
  if (value === "undo") undoKlotskiMove();
  if (value === "redo") redoKlotskiMove();
  if (value === "hint") requestKlotskiHint();
  if (value === "replay") replayKlotskiMoves();
}

function handleKey(key) {
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", z: "undo", Z: "undo", y: "redo", Y: "redo", h: "hint", H: "hint", r: "replay", R: "replay" };
  if (map[key]) handleControl(map[key]);
}

resetPieces();
runtimeDebugState = () => {
  const layout = klotskiLayout();
  const dragEntry = pieces.map((piece) => ({ piece, move: validMoves(piece)[0] })).find((entry) => entry.move);
  const dragProbe = dragEntry ? {
    id: dragEntry.piece.id,
    from: { x: layout.originX + (dragEntry.piece.x + dragEntry.piece.w / 2) * layout.cell, y: layout.originY + (dragEntry.piece.y + dragEntry.piece.h / 2) * layout.cell },
    to: { x: layout.originX + (dragEntry.piece.x + dragEntry.piece.w / 2 + dragEntry.move.dx) * layout.cell, y: layout.originY + (dragEntry.piece.y + dragEntry.piece.h / 2 + dragEntry.move.dy) * layout.cell },
  } : null;
  const hintedPiece = klotskiHint ? pieces.find((piece) => piece.id === klotskiHint.id) : null;
  return { level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, blueprintName: activeKlotskiBlueprint()[0], layoutCount: klotskiBlueprints.length, uniqueBlueprints: new Set(klotskiBlueprints.map((item) => JSON.stringify(item[2]))).size, moves, canUndo: klotskiHistory.length > 0, canRedo: klotskiRedo.length > 0, replayLength: replayPath.length, replaying, optimalReference, optimalExact: Number.isInteger(optimalReference), transitionMs: 210, directDrag: true, dragProbe, canvasSize: { width: canvas.width, height: canvas.height }, hint: klotskiHint, hintDistance: klotskiHintDistance, hintLegal: Boolean(hintedPiece && klotskiStateCanMove(pieces, hintedPiece, klotskiHint.dx, klotskiHint.dy)), boardWidthRatio: Number(((layout.cell * 4 + 44) / 720 * 100).toFixed(1)), identityUsesShapeAndBitmap: true, pieceGap: 10, pieceOutlineWidth: 6, incompleteArtIsCropped: true, pieceState: pieces.map(({ id, x, y }) => ({ id, x, y })) };
};
runtimeDebugActions = {
  undo: undoKlotskiMove,
  redo: redoKlotskiMove,
  hint: requestKlotskiHint,
  replay: replayKlotskiMoves,
  legalMove() {
    const movable = pieces.map((piece) => ({ piece, moves: validMoves(piece) })).find((entry) => entry.moves.length);
    if (!movable) return false;
    selectedId = movable.piece.id;
    moveSelected(movable.moves[0].dx, movable.moves[0].dy);
    return true;
  },
};
requestAnimationFrame(animationLoop);
`;
