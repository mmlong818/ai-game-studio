export const mazeScript = String.raw`
let mazeColumns = 9;
let mazeRows = 15;
let maze = [];
let player = { x: 0, y: 0, renderX: 0, renderY: 0 };
let steps = 0;
let trail = [];
let moveAnimation = null;
let bumpUntil = 0;
let bumpVector = { x: 0, y: 0 };
let gesturePoint = null;
let lastBlockedSound = 0;
let lastMazeDraw = 0;
let mazeShortestPath = [];
let mazeCheckpointKeys = new Set();
let mazeReachedCheckpoints = new Set();
let mazeBranchMarkers = new Set();
let mazeChallengeEnabled = false;

function createMaze() {
  maze = Array.from({ length: mazeRows }, () => Array.from({ length: mazeColumns }, () => ({ visited: false, walls: [true, true, true, true] })));
  const stack = [[0, 0]];
  maze[0][0].visited = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const options = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]]
      .map(([dx, dy, wall, opposite]) => ({ nx: x + dx, ny: y + dy, wall, opposite }))
      .filter(({ nx, ny }) => nx >= 0 && ny >= 0 && nx < mazeColumns && ny < mazeRows && !maze[ny][nx].visited);
    if (!options.length) {
      stack.pop();
      continue;
    }
    const next = options[Math.floor(campaignRandom() * options.length)];
    maze[y][x].walls[next.wall] = false;
    maze[next.ny][next.nx].walls[next.opposite] = false;
    maze[next.ny][next.nx].visited = true;
    stack.push([next.nx, next.ny]);
  }
  braidMaze();
}

function mazeKey(x, y) { return x + ":" + y; }

function openMazePassage(x, y, nx, ny) {
  const dx = nx - x;
  const dy = ny - y;
  const wall = dx === 1 ? 1 : dx === -1 ? 3 : dy === 1 ? 2 : 0;
  const opposite = wall === 0 ? 2 : wall === 1 ? 3 : wall === 2 ? 0 : 1;
  maze[y][x].walls[wall] = false;
  maze[ny][nx].walls[opposite] = false;
}

function closedMazePassages() {
  const result = [];
  maze.forEach((row, y) => row.forEach((cell, x) => {
    if (x + 1 < mazeColumns && cell.walls[1]) result.push({ x, y, nx: x + 1, ny: y });
    if (y + 1 < mazeRows && cell.walls[2]) result.push({ x, y, nx: x, ny: y + 1 });
  }));
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(campaignRandom() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function mazeDegree(x, y) {
  return maze[y][x].walls.filter((wall) => !wall).length;
}

function mazeLoopCount() {
  let edges = 0;
  maze.forEach((row) => row.forEach((cell) => {
    if (!cell.walls[1]) edges += 1;
    if (!cell.walls[2]) edges += 1;
  }));
  return Math.max(0, edges - mazeColumns * mazeRows + 1);
}

function mazeJunctionCount() {
  let count = 0;
  maze.forEach((row, y) => row.forEach((_cell, x) => { if (mazeDegree(x, y) >= 3) count += 1; }));
  return count;
}

function mazeGoalReachableWithoutEdge(blockedFrom, blockedTo) {
  const queue = [{ x: 0, y: 0 }];
  const visited = new Set([mazeKey(0, 0)]);
  const directions = [[0,-1,0],[1,0,1],[0,1,2],[-1,0,3]];
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    if (point.x === mazeColumns - 1 && point.y === mazeRows - 1) return true;
    for (const [dx, dy, wall] of directions) {
      if (maze[point.y][point.x].walls[wall]) continue;
      const next = { x: point.x + dx, y: point.y + dy };
      const blocked = (point.x === blockedFrom.x && point.y === blockedFrom.y && next.x === blockedTo.x && next.y === blockedTo.y)
        || (point.x === blockedTo.x && point.y === blockedTo.y && next.x === blockedFrom.x && next.y === blockedFrom.y);
      if (blocked || next.x < 0 || next.y < 0 || next.x >= mazeColumns || next.y >= mazeRows) continue;
      const key = mazeKey(next.x, next.y);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push(next);
    }
  }
  return false;
}

function mazeAlternativeSegments(path = solveMazeShortestPath()) {
  let count = 0;
  for (let index = 1; index < path.length; index += 1) {
    if (mazeGoalReachableWithoutEdge(path[index - 1], path[index])) count += 1;
  }
  return count;
}

function braidMaze() {
  const tier = currentCampaignLevel().tier;
  const targetLoops = 5 + (tier - 1) * 2 + currentCampaignLevel().variant;
  const targetAlternatives = 3 + tier;
  const candidates = closedMazePassages();
  let opened = 0;
  while (candidates.length) {
    if (opened >= targetLoops && mazeAlternativeSegments() >= targetAlternatives) break;
    const passage = candidates.pop();
    openMazePassage(passage.x, passage.y, passage.nx, passage.ny);
    opened += 1;
  }
}

function solveMazeShortestPath() {
  const queue = [{ x: 0, y: 0 }];
  const previous = new Map([[mazeKey(0, 0), null]]);
  const directions = [[0,-1,0],[1,0,1],[0,1,2],[-1,0,3]];
  for (let index = 0; index < queue.length; index += 1) {
    const point = queue[index];
    if (point.x === mazeColumns - 1 && point.y === mazeRows - 1) break;
    for (const [dx, dy, wall] of directions) {
      if (maze[point.y][point.x].walls[wall]) continue;
      const next = { x: point.x + dx, y: point.y + dy };
      const key = mazeKey(next.x, next.y);
      if (previous.has(key)) continue;
      previous.set(key, point); queue.push(next);
    }
  }
  const path = [];
  let point = { x: mazeColumns - 1, y: mazeRows - 1 };
  while (point) { path.unshift(point); point = previous.get(mazeKey(point.x, point.y)); }
  return path;
}

function prepareMazeLandmarks() {
  mazeShortestPath = solveMazeShortestPath();
  mazeCheckpointKeys = new Set([.25, .5, .75].map((ratio) => mazeShortestPath[Math.floor((mazeShortestPath.length - 1) * ratio)]).filter(Boolean).map((point) => mazeKey(point.x, point.y)));
  mazeReachedCheckpoints = new Set();
  mazeBranchMarkers = new Set();
}

function mazeLayout() {
  const boardWidth = config.aspectRatio === "9:16" ? 660 : 620;
  const cell = boardWidth / mazeColumns;
  const boardHeight = cell * mazeRows;
  return {
    boardWidth,
    boardHeight,
    cell,
    originX: (720 - boardWidth) / 2,
    originY: (gameSceneHeight() - boardHeight) / 2,
  };
}

function drawMazeWall(x, y, width, height) {
  const radius = Math.min(width, height) / 2;
  ctx.save();
  ctx.fillStyle = palette.primary;
  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = Math.max(1, Math.min(width, height) * .16);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
  ctx.fill();
  ctx.globalAlpha = .5;
  ctx.stroke();
  ctx.restore();
}

function openDirections() {
  const walls = maze[player.y][player.x].walls;
  return [
    { dx: 0, dy: -1, wall: 0 },
    { dx: 1, dy: 0, wall: 1 },
    { dx: 0, dy: 1, wall: 2 },
    { dx: -1, dy: 0, wall: 3 },
  ].filter((direction) => !walls[direction.wall]);
}

function drawTrail(originX, originY, cell) {
  ctx.save();
  const memoryLength = currentCampaignLevel().tier <= 2 ? 18 : currentCampaignLevel().tier === 3 ? 10 : 5;
  trail.slice(-memoryLength).forEach((point, index, points) => {
    const alpha = .12 + .42 * (index + 1) / points.length;
    ctx.beginPath();
    ctx.arc(originX + (point.x + .5) * cell, originY + (point.y + .5) * cell, Math.max(2, cell * .09), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,219,121," + alpha + ")";
    ctx.fill();
  });
  ctx.restore();
}

function drawOpenDirectionHints(originX, originY, cell, timestamp) {
  if (!running || moveAnimation) return;
  if (currentCampaignLevel().tier >= 4 && openDirections().length < 3) return;
  const pulse = .5 + Math.sin(timestamp / 180) * .2;
  ctx.save();
  openDirections().forEach((direction) => {
    const x = originX + (player.x + .5 + direction.dx * .58) * cell;
    const y = originY + (player.y + .5 + direction.dy * .58) * cell;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(3, cell * .13), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,231,139," + pulse + ")";
    ctx.fill();
  });
  ctx.restore();
}

function drawMazeLandmarks(originX, originY, cell) {
  ctx.save();
  mazeBranchMarkers.forEach((key) => {
    const [x, y] = key.split(":").map(Number);
    ctx.fillStyle = "rgba(249,173,105,.82)";
    ctx.beginPath(); ctx.arc(originX + (x + .5) * cell, originY + (y + .5) * cell, Math.max(3, cell * .14), 0, Math.PI * 2); ctx.fill();
  });
  mazeCheckpointKeys.forEach((key) => {
    const [x, y] = key.split(":").map(Number);
    const reached = mazeReachedCheckpoints.has(key);
    ctx.strokeStyle = reached ? "#ffe49b" : "rgba(255,228,155,.45)";
    ctx.lineWidth = Math.max(2, cell * .1);
    ctx.beginPath(); ctx.arc(originX + (x + .5) * cell, originY + (y + .5) * cell, Math.max(4, cell * .24), 0, Math.PI * 2); ctx.stroke();
  });
  ctx.restore();
}

function drawMazeJunctions(originX, originY, cell) {
  ctx.save();
  maze.forEach((row, y) => row.forEach((_cell, x) => {
    if (mazeDegree(x, y) < 3) return;
    const centerX = originX + (x + .5) * cell;
    const centerY = originY + (y + .5) * cell;
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(5, cell * .22), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(101,145,103,.12)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX, centerY, Math.max(2, cell * .055), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(74,117,79,.48)";
    ctx.fill();
  }));
  ctx.restore();
}

function drawMaze(timestamp = performance.now()) {
  clearCanvas();
  ctx.save();
  ctx.translate(0, gameSceneTop());
  const { boardWidth, boardHeight, cell, originX, originY } = mazeLayout();
  drawPlayfield(originX - 12, originY - 12, boardWidth + 24, boardHeight + 24, { radius: 24, alpha: .9 });
  const wall = Math.max(8, cell * .18);
  maze.forEach((row, y) => row.forEach((cellData, x) => {
    const px = originX + x * cell;
    const py = originY + y * cell;
    if (cellData.walls[0]) drawMazeWall(px - wall / 2, py - wall / 2, cell + wall, wall);
    if (cellData.walls[1]) drawMazeWall(px + cell - wall / 2, py - wall / 2, wall, cell + wall);
    if (cellData.walls[2]) drawMazeWall(px - wall / 2, py + cell - wall / 2, cell + wall, wall);
    if (cellData.walls[3]) drawMazeWall(px - wall / 2, py - wall / 2, wall, cell + wall);
  }));
  drawMazeJunctions(originX, originY, cell);
  drawTrail(originX, originY, cell);
  drawMazeLandmarks(originX, originY, cell);
  drawOpenDirectionHints(originX, originY, cell, timestamp);
  drawBitmapSprite(3, originX + (mazeColumns - 1) * cell - cell * .18, originY + (mazeRows - 1) * cell - cell * .18, cell * 1.36, cell * 1.36, { fallback: palette.secondary, circle: true, padding: 34 });
  let playerX = player.renderX;
  let playerY = player.renderY;
  if (timestamp < bumpUntil) {
    const shake = Math.sin((bumpUntil - timestamp) * .2) * .12;
    playerX += bumpVector.x * shake;
    playerY += bumpVector.y * shake;
  }
  drawBitmapSprite(2, originX + playerX * cell - cell * .2, originY + playerY * cell - cell * .2, cell * 1.4, cell * 1.4, { fallback: palette.primary, circle: true, padding: 34 });
  ctx.restore();
  finishCanvasStyle();
}

function finishPlayerMove() {
  if (!moveAnimation) return;
  player.renderX = moveAnimation.toX;
  player.renderY = moveAnimation.toY;
  moveAnimation = null;
  if (player.x === mazeColumns - 1 && player.y === mazeRows - 1) {
    const optimal = Math.max(1, mazeShortestPath.length - 1);
    const over = Math.max(0, steps - optimal);
    if (mazeChallengeEnabled && over > Math.max(2, Math.floor(optimal * .08))) {
      showResult(false, "抵达终点，但未完成最短径挑战", "本局 " + steps + " 步，最短路径 " + optimal + " 步；自由探索模式不限制步数。 ");
      return;
    }
    showResult(true, "找到星星", "你用 " + steps + " 步抵达终点；最短路径为 " + optimal + " 步，点亮 " + mazeReachedCheckpoints.size + " / 3 盏阶段灯火。 ");
    return;
  }
  setStatus("已前进 " + steps + " 步。可以滑动迷宫、长按方向键，或使用键盘继续移动。");
}

function updateMazeAnimation(timestamp) {
  if (!moveAnimation) return;
  const progress = Math.min(1, (timestamp - moveAnimation.startedAt) / moveAnimation.duration);
  const eased = 1 - Math.pow(1 - progress, 3);
  player.renderX = moveAnimation.fromX + (moveAnimation.toX - moveAnimation.fromX) * eased;
  player.renderY = moveAnimation.fromY + (moveAnimation.toY - moveAnimation.fromY) * eased;
  if (progress >= 1) finishPlayerMove();
}

function mazeAnimationLoop(timestamp) {
  updateMazeAnimation(timestamp);
  if (moveAnimation || timestamp < bumpUntil || timestamp - lastMazeDraw > 240) {
    drawMaze(timestamp);
    lastMazeDraw = timestamp;
  }
  requestAnimationFrame(mazeAnimationLoop);
}

function movePlayer(dx, dy, wall) {
  if (!running || moveAnimation) return false;
  if (maze[player.y][player.x].walls[wall]) {
    bumpUntil = performance.now() + 220;
    bumpVector = { x: dx, y: dy };
    setStatus("这个方向有墙。试试云朵旁边亮起的方向提示。");
    if (performance.now() - lastBlockedSound > 260) {
      playSound("fail");
      lastBlockedSound = performance.now();
    }
    return false;
  }
  const fromX = player.renderX;
  const fromY = player.renderY;
  trail.push({ x: player.x, y: player.y });
  if (openDirections().length >= 3) mazeBranchMarkers.add(mazeKey(player.x, player.y));
  player.x += dx;
  player.y += dy;
  steps += 1;
  const currentKey = mazeKey(player.x, player.y);
  if (mazeCheckpointKeys.has(currentKey) && !mazeReachedCheckpoints.has(currentKey)) {
    mazeReachedCheckpoints.add(currentKey); playSound("collect");
  }
  moveAnimation = {
    fromX,
    fromY,
    toX: player.x,
    toY: player.y,
    startedAt: performance.now(),
    duration: 118,
  };
  setMetric(String(steps));
  playSound("move");
  return true;
}

function startGame() {
  resetCampaignRandom();
  const portraitSizes = [[9, 15], [9, 15], [13, 21], [13, 21], [15, 25]];
  const landscapeSizes = [[9, 9], [9, 9], [13, 13], [13, 13], [15, 15]];
  [mazeColumns, mazeRows] = (config.aspectRatio === "9:16" ? portraitSizes : landscapeSizes)[currentCampaignLevel().tier - 1];
  mazeChallengeEnabled = Boolean(document.querySelector("[data-maze-shortest]")?.checked);
  createMaze();
  prepareMazeLandmarks();
  player = { x: 0, y: 0, renderX: 0, renderY: 0 };
  steps = 0;
  trail = [];
  moveAnimation = null;
  bumpUntil = 0;
  running = true;
  hideOverlay();
  setMetric("0");
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + mazeColumns + "×" + mazeRows + " · " + mazeLoopCount() + " 处环路与 " + mazeJunctionCount() + " 个岔口 · " + (mazeChallengeEnabled ? "最短径挑战" : "自由探索") + "。");
  startAmbient();
  lastMazeDraw = 0;
  drawMaze();
}

function handleControl(value) {
  const movesByControl = { up: [0, -1, 0], right: [1, 0, 1], down: [0, 1, 2], left: [-1, 0, 3] };
  return movesByControl[value] ? movePlayer(...movesByControl[value]) : false;
}

function handleKey(key) {
  const normalized = key.length === 1 ? key.toLowerCase() : key;
  const map = { ArrowUp: "up", ArrowRight: "right", ArrowDown: "down", ArrowLeft: "left", w: "up", d: "right", s: "down", a: "left" };
  if (map[normalized]) handleControl(map[normalized]);
}

function gestureDirection(dx, dy) {
  if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

canvas.addEventListener("pointerdown", (event) => {
  if (!running) return;
  gesturePoint = eventScenePoint(event);
  canvas.setPointerCapture?.(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!running || !gesturePoint) return;
  const point = eventScenePoint(event);
  const dx = point.x - gesturePoint.x;
  const dy = point.y - gesturePoint.y;
  const threshold = Math.max(18, mazeLayout().cell * .42);
  if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return;
  handleControl(gestureDirection(dx, dy));
  gesturePoint = point;
});

canvas.addEventListener("pointerup", (event) => {
  if (!running || !gesturePoint) return;
  const point = eventScenePoint(event);
  const dx = point.x - gesturePoint.x;
  const dy = point.y - gesturePoint.y;
  const threshold = Math.max(18, mazeLayout().cell * .42);
  if (Math.max(Math.abs(dx), Math.abs(dy)) >= threshold) handleControl(gestureDirection(dx, dy));
  gesturePoint = null;
});

canvas.addEventListener("pointercancel", () => { gesturePoint = null; });

let holdDelay = null;
let holdRepeat = null;
let lastPointerControlAt = 0;
function stopControlRepeat() {
  clearTimeout(holdDelay);
  clearInterval(holdRepeat);
  holdDelay = null;
  holdRepeat = null;
}

document.querySelectorAll(".maze-pad [data-control]").forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    stopControlRepeat();
    lastPointerControlAt = performance.now();
    handleControl(button.dataset.control);
    holdDelay = setTimeout(() => {
      holdRepeat = setInterval(() => handleControl(button.dataset.control), 145);
    }, 330);
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach((name) => button.addEventListener(name, stopControlRepeat));
  button.addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    if (performance.now() - lastPointerControlAt > 500) handleControl(button.dataset.control);
  });
});

resetCampaignRandom();
createMaze();
runtimeDebugActions = {
  solveMaze: () => {
    steps = Math.max(1, mazeShortestPath.length - 1);
    player = { x: mazeColumns - 1, y: mazeRows - 1, renderX: mazeColumns - 1, renderY: mazeRows - 1 };
    mazeReachedCheckpoints = new Set(mazeCheckpointKeys); drawMaze();
    showResult(true, "找到星星", "沿最短路径用 " + steps + " 步抵达终点。 ");
  },
  failMazeChallenge: () => { showResult(false, "最短径挑战未完成", "探索步数超过本关目标。 "); },
};
runtimeDebugState = () => ({ level: currentCampaignLevel().number, tier: currentCampaignLevel().tier, columns: mazeColumns, rows: mazeRows, steps, optimalSteps: Math.max(1, mazeShortestPath.length - 1), checkpoints: mazeReachedCheckpoints.size, branchMarkers: mazeBranchMarkers.size, loopCount: mazeLoopCount(), junctionCount: mazeJunctionCount(), alternativeSegments: mazeAlternativeSegments(mazeShortestPath), hasMultipleRoutes: mazeAlternativeSegments(mazeShortestPath) > 0, challenge: mazeChallengeEnabled, player: { ...player } });
requestAnimationFrame(mazeAnimationLoop);
`;
