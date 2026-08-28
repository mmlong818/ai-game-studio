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

let scrambleMoveCount = 0;

function createCampaignKlotskiPieces() {
  const result = initialPieces.map((piece) => ({ ...piece }));
  const scrambleSteps = 4 + currentCampaignLevel().tier * 7 + currentCampaignLevel().variant * 2;
  let previousMove = null;
  for (let step = 0; step < scrambleSteps; step += 1) {
    const legal = [];
    result.forEach((piece) => {
      [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => {
        if (previousMove && previousMove.id === piece.id && previousMove.dx === -dx && previousMove.dy === -dy) return;
        const next = { ...piece, x: piece.x + dx, y: piece.y + dy };
        if (next.x < 0 || next.y < 0 || next.x + next.w > 4 || next.y + next.h > 5) return;
        if (piece.id === "cao" && next.x === 1 && next.y === 3) return;
        const blocked = result.some((other) => other.id !== piece.id && next.x < other.x + other.w && next.x + next.w > other.x && next.y < other.y + other.h && next.y + next.h > other.y);
        if (!blocked) legal.push({ piece, dx, dy });
      });
    });
    if (!legal.length) { previousMove = null; continue; }
    const move = legal[Math.floor(campaignRandom() * legal.length)];
    move.piece.x += move.dx;
    move.piece.y += move.dy;
    previousMove = { id: move.piece.id, dx: move.dx, dy: move.dy };
  }
  scrambleMoveCount = scrambleSteps;
  return result;
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
let replayPath = [];
let initialLayoutSnapshot = [];
let replaying = false;
let optimalReference = null;
// 由 scripts/compute-klotski-optimal.py 对 25,955 个可达状态反向广搜得到；一步等于棋子移动一格。
const klotskiOptimalByLevel = [115, 113, 111, 113, 112, 112, 115, 114, 114, 117, 107, 115, 117, 113, 117, 113, 111, 111, 114, 115];

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
  restoreKlotski(last.snapshot);
  replayPath.pop();
  moves = Math.max(0, moves - 1);
  selectedId = last.selectedId;
  selectedAt = performance.now();
  setMetric(String(moves));
  setStatus("已撤销一步 · 当前 " + moves + " 步 · 参考解法约 " + scrambleMoveCount + " 步。 ");
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

function moveSelected(dx, dy, fromReplay = false) {
  if (!running || moveAnimation) return;
  const piece = pieces.find((candidate) => candidate.id === selectedId);
  if (!piece || !canMove(piece, dx, dy)) {
    blockedUntil = performance.now() + 280;
    if (piece) spawnParticles(piece, "blocked", 6);
    setStatus("这条方向被挡住了；发光箭头表示当前可以移动的位置。");
    playSound("fail");
    return;
  }
  const fromX = piece.renderX;
  const fromY = piece.renderY;
  if (!fromReplay) {
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

canvas.addEventListener("click", (event) => {
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
  optimalReference = klotskiOptimalByLevel[currentCampaignLevel().number - 1] ?? null;
  selectedId = "cao";
  moves = 0;
  moveAnimation = null;
  particles = [];
  blockedUntil = 0;
  exitOpen = false;
  winAt = 0;
  selectedAt = performance.now();
  klotskiHistory = [];
  replayPath = [];
  replaying = false;
  initialLayoutSnapshot = snapshotKlotski();
}

function startGame() {
  resetPieces();
  running = true;
  hideOverlay();
  setMetric("0");
  setStatus("第 " + currentCampaignLevel().number + " 关 · 布局 " + currentCampaignLevel().number + "/20 · 最优参考 " + (optimalReference ?? "—") + " 步；让队长机器人抵达出口。");
  startAmbient();
}

function handleControl(value) {
  const vectors = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  if (vectors[value]) moveSelected(vectors[value][0], vectors[value][1]);
  if (value === "undo") undoKlotskiMove();
  if (value === "replay") replayKlotskiMoves();
}

function handleKey(key) {
  const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", z: "undo", Z: "undo", r: "replay", R: "replay" };
  if (map[key]) handleControl(map[key]);
}

resetPieces();
runtimeDebugState = () => {
  const layout = klotskiLayout();
  return { level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, layoutCount: config.campaignLevels.length, moves, canUndo: klotskiHistory.length > 0, replayLength: replayPath.length, replaying, optimalReference, optimalExact: Number.isInteger(optimalReference), scrambleMoveCount, transitionMs: 210, boardWidthRatio: Number(((layout.cell * 4 + 44) / 720 * 100).toFixed(1)), identityUsesShapeAndBitmap: true, pieceGap: 10, pieceOutlineWidth: 6, incompleteArtIsCropped: true, pieceState: pieces.map(({ id, x, y }) => ({ id, x, y })) };
};
runtimeDebugActions = {
  undo: undoKlotskiMove,
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
