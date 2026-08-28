// 玩法结构参考 Whatajong（MIT）；牌阵、遗物、数值、名称和全部视听资产均为本平台原创。
export const mahjongRogueliteScript = String.raw`
const mahjongDifficulty = {
  relaxed: { hints: 3, shuffles: 3 },
  standard: { hints: 2, shuffles: 2 },
  challenging: { hints: 1, shuffles: 1 },
}[config.difficulty];

const mahjongVariantColors = ["#ef6b55", "#168d8a", "#e1a72f", "#274b73"];
const mahjongRelics = [
  { id: "compass", name: "月汐罗盘", detail: "立即获得 2 次提示", rarity: "稀有", scope: "整段航线", sprite: 6 },
  { id: "thread", name: "琥珀丝线", detail: "每层使配对得分 +100%", rarity: "史诗", scope: "本次旅程", sprite: 7 },
  { id: "charm", name: "潮铃护符", detail: "立即获得 1 次洗牌", rarity: "稀有", scope: "整段航线", sprite: 8 },
  { id: "lantern", name: "引潮灯", detail: "提前解除本段封锁层", rarity: "史诗", scope: "当前航段", sprite: 5 },
  { id: "pearl", name: "雾港珠", detail: "立即获得 120 分", rarity: "普通", scope: "立即生效", sprite: 4 },
  { id: "anchor", name: "银湾锚", detail: "潮汐计时增加 30 秒", rarity: "稀有", scope: "潮汐航段", sprite: 3 },
  { id: "atlas", name: "群岛图", detail: "每段开始额外获得 1 次提示", rarity: "史诗", scope: "后续航段", sprite: 2 },
  { id: "mirror", name: "月镜", detail: "下一次配对得分翻倍", rarity: "稀有", scope: "一次配对", sprite: 1 },
  { id: "shell", name: "回声贝", detail: "撤销后保留连击", rarity: "普通", scope: "本次旅程", sprite: 0 },
  { id: "reef", name: "珊瑚结", detail: "配错时不清空连击", rarity: "普通", scope: "本次旅程", sprite: 8 },
  { id: "sail", name: "晨风帆", detail: "每段开局获得 60 分", rarity: "普通", scope: "后续航段", sprite: 7 },
  { id: "crown", name: "潮王冠", detail: "高风险：计时 -15 秒，得分 +150%", rarity: "传说", scope: "本次旅程", sprite: 6 },
];

let mahjongBoard = [];
let mahjongStage = 0;
let mahjongScore = 0;
let mahjongCombo = 0;
let mahjongHints = mahjongDifficulty.hints;
let mahjongShuffles = mahjongDifficulty.shuffles;
let mahjongSelectedId = null;
let mahjongHintIds = new Set();
let mahjongHistory = [];
let mahjongRelicStacks = new Map();
let mahjongAwaitingRelic = false;
let mahjongFlash = null;
let mahjongHitAreas = [];
let mahjongNewlyFreeIds = new Set();
let mahjongKeyboardId = null;
let mahjongRelicChoices = [];
let mahjongMatches = 0;
let mahjongSealedIds = new Set();
let mahjongMode = "campaign";
let mahjongRunSeed = 0;
let mahjongDeadline = 0;
let mahjongHiddenAt = 0;
let mahjongRestored = false;
const mahjongRunStorageKey = config.campaignStorageKey + ":mahjong-run-v2";
const mahjongBestStorageKey = config.campaignStorageKey + ":mahjong-best-v2";

function mahjongTileCountForLevel() {
  const counts = config.difficulty === "relaxed"
    ? [24, 28, 32, 36, 40]
    : config.difficulty === "challenging"
      ? [32, 40, 48, 56, 64]
      : [28, 32, 40, 48, 56];
  return Math.min(64, counts[currentCampaignLevel().tier - 1] + mahjongStage * 4);
}

function mahjongHash(value) {
  let hash = 2166136261;
  for (const character of String(value)) { hash ^= character.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return hash >>> 0;
}

function readMahjongSetup() {
  const mode = document.querySelector("[data-mahjong-mode]");
  const seed = document.querySelector("[data-mahjong-seed]");
  mahjongMode = mode?.value || "campaign";
  const dateKey = new Date().toISOString().slice(0, 10);
  mahjongRunSeed = mahjongMode === "daily" ? mahjongHash("daily:" + dateKey) : mahjongMode === "seeded" ? mahjongHash(seed?.value.trim() || "MOON-PORT") : currentCampaignLevel().seed;
}

function currentMahjongRule() {
  if (mahjongStage === 1) return { id: "sealed", label: "封锁层", detail: "完成 2 对后解除封锁层", timeLimit: 0 };
  if (mahjongStage === 2) return { id: "tide", label: "限时潮汐", detail: "在潮汐归零前清空牌阵", timeLimit: Math.max(75, 165 - currentCampaignLevel().tier * 12) };
  return { id: "harbor", label: "开放长堤", detail: "从开放边缘建立连击", timeLimit: 0 };
}

function mahjongRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffleMahjongList(values, random) {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

function createMahjongPositions(tileCount) {
  const baseColumns = tileCount >= 56 ? 8 : tileCount >= 40 ? 7 : 5;
  const baseRows = tileCount >= 56 ? 6 : 4;
  const baseCount = Math.min(tileCount, baseColumns * baseRows);
  const positions = [];
  for (let index = 0; index < baseCount; index += 1) {
    positions.push({ id: "m-" + index, x: index % baseColumns, y: Math.floor(index / baseColumns), z: 0 });
  }
  const overlayCount = tileCount - baseCount;
  const overlayColumns = Math.min(baseColumns - 2, Math.max(2, Math.ceil(overlayCount / Math.max(1, Math.ceil(overlayCount / 8)))));
  const overlayRows = Math.ceil(overlayCount / overlayColumns);
  const startX = (baseColumns - overlayColumns) / 2;
  const startY = (baseRows - overlayRows) / 2;
  for (let index = 0; index < overlayCount; index += 1) {
    positions.push({ id: "m-" + (baseCount + index), x: startX + index % overlayColumns, y: startY + Math.floor(index / overlayColumns), z: 1 });
  }
  return positions;
}

function mahjongPositionIsFree(position, positions, removed) {
  if (removed.has(position.id)) return false;
  const alive = positions.filter((candidate) => !removed.has(candidate.id));
  const covered = alive.some((candidate) => candidate.z > position.z && Math.abs(candidate.x - position.x) < .95 && Math.abs(candidate.y - position.y) < .95);
  if (covered) return false;
  const leftBlocked = alive.some((candidate) => candidate.z === position.z && candidate.x < position.x && position.x - candidate.x <= 1.05 && Math.abs(candidate.y - position.y) < .55);
  const rightBlocked = alive.some((candidate) => candidate.z === position.z && candidate.x > position.x && candidate.x - position.x <= 1.05 && Math.abs(candidate.y - position.y) < .55);
  return !leftBlocked || !rightBlocked;
}

function buildMahjongRemovalOrder(positions, random) {
  const removed = new Set();
  const order = [];
  while (removed.size < positions.length) {
    const free = shuffleMahjongList(positions.filter((position) => mahjongPositionIsFree(position, positions, removed)), random);
    if (free.length < 2) return null;
    const first = free[0];
    const second = free.find((candidate) => candidate.id !== first.id);
    removed.add(first.id); removed.add(second.id);
    order.push([first.id, second.id]);
  }
  return order;
}

function assignMahjongPairs(positions, seed) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const random = mahjongRandom((seed + attempt * 0x9e3779b1) >>> 0);
    const order = buildMahjongRemovalOrder(positions, random);
    if (!order) continue;
    const pairOrder = shuffleMahjongList(Array.from({ length: order.length }, (_, index) => index), random);
    const byId = new Map();
    order.forEach((ids, index) => {
      const value = pairOrder[index];
      const symbol = value % 9;
      const variant = Math.floor(value / 9) % mahjongVariantColors.length;
      ids.forEach((id) => byId.set(id, { symbol, variant, pairId: "p-" + value }));
    });
    return positions.map((position) => ({ ...position, ...byId.get(position.id), deleted: false, selected: false }));
  }
  throw new Error("无法生成可解灵牌阵列");
}

function createSolvableMahjongBoard(tileCount, seed) {
  return assignMahjongPairs(createMahjongPositions(tileCount), seed);
}

function isMahjongTileFree(tile) {
  if (!tile || tile.deleted) return false;
  if (mahjongSealedIds.has(tile.id) && !mahjongRelicStacks.has("lantern")) return false;
  return mahjongPositionIsFree(tile, mahjongBoard, new Set(mahjongBoard.filter((candidate) => candidate.deleted).map((candidate) => candidate.id)));
}

function getAvailableMahjongPairs() {
  const free = mahjongBoard.filter(isMahjongTileFree);
  const pairs = [];
  for (let left = 0; left < free.length; left += 1) for (let right = left + 1; right < free.length; right += 1) {
    if (free[left].pairId === free[right].pairId) pairs.push([free[left], free[right]]);
  }
  return pairs;
}

function mahjongRemaining() { return mahjongBoard.filter((tile) => !tile.deleted).length; }
function mahjongRelicCount() { return [...mahjongRelicStacks.values()].reduce((total, count) => total + count, 0); }

function mahjongTimeRemaining() {
  return mahjongDeadline ? Math.max(0, Math.ceil((mahjongDeadline - Date.now()) / 1000)) : 0;
}

function saveMahjongRun() {
  try {
    safeStorage.setItem(mahjongRunStorageKey, JSON.stringify({
      schemaVersion: 2, level: currentCampaignLevel().number, mode: mahjongMode, seed: mahjongRunSeed,
      stage: mahjongStage, score: mahjongScore, combo: mahjongCombo, hints: mahjongHints, shuffles: mahjongShuffles,
      board: mahjongBoard, relicStacks: Object.fromEntries(mahjongRelicStacks), matches: mahjongMatches,
      sealedIds: [...mahjongSealedIds], deadline: mahjongDeadline, awaitingRelic: mahjongAwaitingRelic, updatedAt: Date.now(),
    }));
  } catch {}
}

function clearMahjongRun() {
  try { safeStorage.removeItem(mahjongRunStorageKey); } catch {}
}

function restoreMahjongRun() {
  try {
    const saved = JSON.parse(safeStorage.getItem(mahjongRunStorageKey) || "null");
    if (!saved || saved.schemaVersion !== 2 || saved.level !== currentCampaignLevel().number || saved.mode !== mahjongMode || saved.seed !== mahjongRunSeed || !Array.isArray(saved.board)) return false;
    mahjongStage = Math.max(0, Math.min(2, Number(saved.stage) || 0));
    mahjongScore = Number(saved.score) || 0; mahjongCombo = Number(saved.combo) || 0;
    mahjongHints = Math.max(0, Number(saved.hints) || 0); mahjongShuffles = Math.max(0, Number(saved.shuffles) || 0);
    mahjongBoard = saved.board; mahjongRelicStacks = new Map(Object.entries(saved.relicStacks || {}).map(([key, value]) => [key, Number(value) || 0]));
    mahjongMatches = Number(saved.matches) || 0; mahjongSealedIds = new Set(saved.sealedIds || []);
    mahjongDeadline = Number(saved.deadline) || 0; mahjongAwaitingRelic = Boolean(saved.awaitingRelic);
    mahjongSelectedId = null; mahjongHintIds = new Set(); mahjongHistory = []; mahjongNewlyFreeIds = new Set();
    mahjongKeyboardId = mahjongBoard.find(isMahjongTileFree)?.id || null; mahjongRestored = true;
    return true;
  } catch { return false; }
}

function updateMahjongBestScore() {
  try {
    const key = mahjongMode + ":" + (mahjongMode === "daily" ? new Date().toISOString().slice(0, 10) : "all");
    const scores = JSON.parse(safeStorage.getItem(mahjongBestStorageKey) || "{}");
    scores[key] = Math.max(Number(scores[key]) || 0, mahjongScore);
    safeStorage.setItem(mahjongBestStorageKey, JSON.stringify(scores));
    return scores[key];
  } catch { return mahjongScore; }
}

function mahjongBlockReason(tile) {
  const alive = mahjongBoard.filter((candidate) => !candidate.deleted);
  const covered = alive.some((candidate) => candidate.z > tile.z && Math.abs(candidate.x - tile.x) < .95 && Math.abs(candidate.y - tile.y) < .95);
  return covered ? "这张灵牌仍被上层覆盖。" : "这张灵牌左右都被夹住，先从边缘打开通路。";
}

function snapshotMahjongState() {
  mahjongHistory.push({
    board: mahjongBoard.map((tile) => ({ ...tile, selected: false })),
    score: mahjongScore,
    combo: mahjongCombo,
    selectedId: null,
    matches: mahjongMatches,
    sealedIds: new Set(mahjongSealedIds),
  });
  if (mahjongHistory.length > 30) mahjongHistory.shift();
}

function syncMahjongControls() {
  const hintButton = document.querySelector('[data-control="hint"]');
  const shuffleButton = document.querySelector('[data-control="shuffle"]');
  const undoButton = document.querySelector('[data-control="undo"]');
  const controlsLocked = !running || mahjongAwaitingRelic;
  if (hintButton) {
    hintButton.textContent = "提示 · " + mahjongHints;
    hintButton.disabled = controlsLocked || mahjongHints <= 0;
  }
  if (shuffleButton) {
    shuffleButton.textContent = "洗牌 · " + mahjongShuffles;
    shuffleButton.disabled = controlsLocked || mahjongShuffles <= 0;
  }
  if (undoButton) undoButton.disabled = controlsLocked || mahjongHistory.length === 0;
  if (new URLSearchParams(location.search).has("qa")) canvas.dataset.qaState = JSON.stringify(runtimeDebugState());
}

function mahjongLayout() {
  const alive = mahjongBoard.length ? mahjongBoard : createMahjongPositions(32);
  const maxX = Math.max(...alive.map((tile) => tile.x));
  const maxY = Math.max(...alive.map((tile) => tile.y));
  const tileWidth = Math.min(148, 670 / (maxX * .8 + 1.1));
  const tileHeight = tileWidth * 1.24;
  const stepX = tileWidth * .8;
  const stepY = tileHeight * .74;
  const boardWidth = maxX * stepX + tileWidth;
  const boardHeight = maxY * stepY + tileHeight + 22;
  return { tileWidth, tileHeight, stepX, stepY, x: (720 - boardWidth) / 2, y: 195, boardWidth, boardHeight };
}

function mahjongTileRect(tile, layout) {
  return {
    x: layout.x + tile.x * layout.stepX + tile.z * 8,
    y: layout.y + tile.y * layout.stepY - tile.z * 18,
    width: layout.tileWidth,
    height: layout.tileHeight,
  };
}

function mahjongTileVisualState(tile, selectedTile) {
  const free = isMahjongTileFree(tile);
  const selected = tile.id === mahjongSelectedId;
  const hinted = mahjongHintIds.has(tile.id);
  const matching = Boolean(selectedTile && selectedTile.id !== tile.id && selectedTile.pairId === tile.pairId && free);
  const newlyFree = mahjongNewlyFreeIds.has(tile.id);
  const keyboardFocused = tile.id === mahjongKeyboardId;
  const sealed = mahjongSealedIds.has(tile.id) && !mahjongRelicStacks.has("lantern");
  return { free, selected, hinted, matching, newlyFree, keyboardFocused, sealed };
}

function drawMahjongRelicChoice() {
  ctx.fillStyle = "rgba(13,28,37,.84)";
  ctx.fillRect(0, 130, 720, Math.min(930, gameSceneHeight() - 170));
  ctx.textAlign = "center"; ctx.fillStyle = "#fffaf0";
  ctx.font = "800 34px Inter, sans-serif"; ctx.fillText("选择一件旅途遗物", 360, 240);
  ctx.font = "600 19px Inter, sans-serif"; ctx.fillStyle = "rgba(255,250,240,.78)";
  ctx.fillText("它会陪你进入下一段月港航线", 360, 280);
  mahjongRelicChoices.forEach((relic, index) => {
    const x = 42 + index * 226;
    const y = 350;
    ctx.fillStyle = "rgba(255,250,236,.94)";
    ctx.beginPath(); ctx.roundRect(x, y, 184, 310, 28); ctx.fill();
    drawBitmapSprite(relic.sprite, x + 34, y + 28, 116, 116, { fallback: palette.highlight, scale: 1.12 });
    ctx.fillStyle = "#20343c"; ctx.font = "800 22px Inter, sans-serif"; ctx.fillText(relic.name, x + 92, y + 184);
    ctx.fillStyle = relic.rarity === "传说" ? "#b45b31" : relic.rarity === "史诗" ? "#775a9c" : "#52727a";
    ctx.font = "800 14px Inter, sans-serif"; ctx.fillText(relic.rarity + " · 已有 " + (mahjongRelicStacks.get(relic.id) || 0) + " 层", x + 92, y + 208);
    ctx.fillStyle = "#54676c"; ctx.font = "600 15px Inter, sans-serif";
    const lines = relic.detail.length > 12 ? [relic.detail.slice(0, 12), relic.detail.slice(12, 24)] : [relic.detail];
    lines.forEach((line, lineIndex) => ctx.fillText(line, x + 92, y + 238 + lineIndex * 22));
    ctx.fillStyle = "#718287"; ctx.font = "600 12px Inter, sans-serif"; ctx.fillText(relic.scope, x + 92, y + 295);
  });
}

function drawMahjongRoguelite() {
  clearCanvas();
  ctx.save(); ctx.translate(0, gameSceneTop());
  const layout = mahjongLayout();
  const freeCount = mahjongBoard.filter(isMahjongTileFree).length;
  const pairCount = getAvailableMahjongPairs().length;
  const selectedTile = mahjongBoard.find((tile) => tile.id === mahjongSelectedId) || null;
  drawPlayfield(94, 34, 532, 118, { radius: 30, alpha: .88 });
  ctx.textAlign = "center"; ctx.fillStyle = palette.text;
  ctx.font = "800 29px Inter, sans-serif";
  const rule = currentMahjongRule();
  const tideText = mahjongDeadline ? "   潮汐 " + mahjongTimeRemaining() + "秒" : "";
  ctx.fillText("航段 " + (mahjongStage + 1) + " / 3   " + rule.label + "   剩余 " + mahjongRemaining() + tideText, 360, 82);
  ctx.fillStyle = palette.textSoft; ctx.font = "700 18px Inter, sans-serif";
  ctx.fillText("可选 " + freeCount + "   ·   可配对 " + pairCount + "   ·   得分 " + mahjongScore + "   ·   连击 ×" + Math.max(1, mahjongCombo), 360, 123);
  drawPlayfield(layout.x - 24, layout.y - 30, layout.boardWidth + 48, layout.boardHeight + 60, { radius: 36, alpha: .9 });
  mahjongHitAreas = [];
  const drawOrder = [...mahjongBoard].filter((tile) => !tile.deleted).sort((left, right) => left.z - right.z || left.y - right.y || left.x - right.x);
  drawOrder.forEach((tile) => {
    const rect = mahjongTileRect(tile, layout);
    const { free, selected, hinted, matching, newlyFree, keyboardFocused, sealed } = mahjongTileVisualState(tile, selectedTile);
    ctx.save();
    ctx.globalAlpha = free ? 1 : .72;
    ctx.shadowColor = selected ? palette.highlight : hinted || matching ? "#f1ad36" : newlyFree ? "#41a79c" : free ? "rgba(22,141,138,.72)" : "rgba(20,35,42,.24)";
    ctx.shadowBlur = selected || hinted || matching || newlyFree ? 28 : free ? 18 : 6;
    ctx.shadowOffsetY = free ? 7 : 2;
    drawBitmapSprite(tile.symbol, rect.x, rect.y - (selected ? 7 : 0), rect.width, rect.height, { fallback: "#fff6de", scale: selected ? 1.09 : 1.04 });
    if (!free) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = sealed ? "rgba(91,52,48,.52)" : "rgba(36,49,54,.42)";
      ctx.beginPath(); ctx.roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, Math.max(12, rect.width * .14)); ctx.fill();
      const pillWidth = Math.max(32, rect.width * .42);
      ctx.fillStyle = sealed ? "rgba(255,232,211,.94)" : "rgba(241,245,242,.92)";
      ctx.beginPath(); ctx.roundRect(rect.x + (rect.width - pillWidth) / 2, rect.y + rect.height * .74, pillWidth, Math.max(18, rect.height * .15), 10); ctx.fill();
      ctx.fillStyle = sealed ? "#713f37" : "#33474d";
      ctx.font = "800 " + Math.max(10, rect.width * .095) + "px Inter, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(sealed ? "封锁" : "被压", rect.x + rect.width / 2, rect.y + rect.height * .815);
      ctx.textBaseline = "alphabetic";
    }
    ctx.globalAlpha = free ? .98 : .7;
    ctx.fillStyle = mahjongVariantColors[tile.variant];
    const markerX = rect.x + rect.width * .79;
    const markerY = rect.y + rect.height * .18 - (selected ? 7 : 0);
    const markerRadius = Math.max(9, rect.width * .095);
    ctx.beginPath(); ctx.arc(markerX, markerY, markerRadius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,250,240,.94)"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#fffaf0"; ctx.font = "800 " + Math.max(14, rect.width * .14) + "px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(tile.variant + 1), markerX, markerY + .5);
    ctx.textBaseline = "alphabetic";
    if (free) {
      ctx.strokeStyle = selected ? palette.highlight : hinted || matching ? "#f1ad36" : newlyFree ? "#41a79c" : keyboardFocused ? "#0b6070" : "#168d8a";
      ctx.lineWidth = selected || hinted || matching ? 8 : keyboardFocused ? 7 : 5;
      ctx.beginPath(); ctx.roundRect(rect.x + 3, rect.y + 3 - (selected ? 7 : 0), rect.width - 6, rect.height - 6, 18); ctx.stroke();
    }
    ctx.restore();
    mahjongHitAreas.push({ tile, rect: { ...rect, y: rect.y - (selected ? 7 : 0) } });
  });
  const footerY = Math.min(gameSceneHeight() - 110, layout.y + layout.boardHeight + 78);
  drawPlayfield(91, footerY - 38, 538, 62, { radius: 22, alpha: .86 });
  ctx.fillStyle = palette.text; ctx.font = "700 18px Inter, sans-serif";
  ctx.fillText("青绿描边可选   ·   金色为配对目标   ·   灰暗牌仍被压住", 360, footerY - 5);
  ctx.fillStyle = palette.textSoft; ctx.font = "600 14px Inter, sans-serif";
  ctx.fillText("提示 " + mahjongHints + "   ·   洗牌 " + mahjongShuffles, 360, footerY + 18);
  if (mahjongFlash && performance.now() < mahjongFlash.until) {
    drawBitmapSprite(mahjongFlash.sprite, mahjongFlash.x - 70, mahjongFlash.y - 70, 140, 140, { fallback: palette.highlight, alpha: .8, scale: 1.16 });
  }
  if (mahjongAwaitingRelic) drawMahjongRelicChoice();
  ctx.restore(); finishCanvasStyle();
  syncMahjongControls();
}

function chooseMahjongRelic(index) {
  const relic = mahjongRelicChoices[index];
  if (!relic) return;
  mahjongRelicStacks.set(relic.id, (mahjongRelicStacks.get(relic.id) || 0) + 1);
  if (relic.id === "compass") mahjongHints += 2;
  if (relic.id === "charm") mahjongShuffles += 1;
  if (relic.id === "pearl") mahjongScore += 120;
  if (relic.id === "anchor" && mahjongDeadline) mahjongDeadline += 30_000;
  if (relic.id === "sail") mahjongScore += 60;
  mahjongAwaitingRelic = false;
  mahjongStage = Math.min(2, mahjongStage + 1);
  setGameSessionState("playing");
  saveMahjongRun();
  startMahjongStage();
}

function pickMahjongRelicChoices() {
  const random = mahjongRandom((mahjongRunSeed ^ (mahjongStage + 1) * 0x9e3779b1) >>> 0);
  mahjongRelicChoices = shuffleMahjongList(mahjongRelics, random).slice(0, 3);
}

function startMahjongStage() {
  const tileCount = mahjongTileCountForLevel();
  mahjongBoard = createSolvableMahjongBoard(tileCount, (mahjongRunSeed ^ tileCount ^ mahjongStage * 0x9e3779b1) >>> 0);
  mahjongSealedIds = new Set(); mahjongMatches = 0;
  const initialPairs = getAvailableMahjongPairs();
  if (currentMahjongRule().id === "sealed" && initialPairs.length > 1 && !mahjongRelicStacks.has("lantern")) {
    initialPairs[1].forEach((tile) => mahjongSealedIds.add(tile.id));
  }
  const openingPair = getAvailableMahjongPairs()[0] || [];
  const rule = currentMahjongRule();
  mahjongDeadline = rule.timeLimit ? Date.now() + Math.max(45, rule.timeLimit - (mahjongRelicStacks.has("crown") ? 15 : 0)) * 1000 : 0;
  if (mahjongRelicStacks.has("anchor") && mahjongDeadline) mahjongDeadline += 30_000;
  if (mahjongRelicStacks.has("atlas")) mahjongHints += 1;
  if (mahjongRelicStacks.has("sail")) mahjongScore += 60;
  mahjongSelectedId = null;
  mahjongHintIds = new Set(openingPair.map((tile) => tile.id));
  mahjongHistory = []; mahjongCombo = 0; mahjongFlash = null; mahjongNewlyFreeIds = new Set();
  mahjongKeyboardId = openingPair[0]?.id || mahjongBoard.find(isMahjongTileFree)?.id || null;
  setMetric(mahjongRemaining() + " 张");
  setStatus("第 " + currentCampaignLevel().number + " 关 · 航段 " + (mahjongStage + 1) + " / 3 · " + rule.label + "：" + rule.detail + "。已点亮第一对自由牌。 ");
  saveMahjongRun();
  drawMahjongRoguelite();
}

function resolveMahjongStageClear() {
  playSound("success");
  if (mahjongStage >= 2) {
    const best = updateMahjongBestScore();
    clearMahjongRun();
    drawMahjongRoguelite();
    showResult(true, "月港旅程完成", "你清空了三段差异航线，以 " + mahjongScore + " 分带回 " + mahjongRelicCount() + " 件遗物；当前模式最佳分 " + best + "。 ");
    syncMahjongControls();
    return;
  }
  mahjongAwaitingRelic = true;
  pickMahjongRelicChoices();
  setGameSessionState("stage-complete");
  setMetric("航段完成");
  setStatus("选择一件遗物，再进入下一段航线。 ");
  saveMahjongRun();
  drawMahjongRoguelite();
}

function checkMahjongContinuity() {
  if (mahjongRemaining() === 0) { resolveMahjongStageClear(); return; }
  const pairs = getAvailableMahjongPairs();
  if (pairs.length) return;
  if (mahjongShuffles > 0) {
    setStatus("当前没有可用对子；使用洗牌重建一条可解路线。 ");
    return;
  }
  drawMahjongRoguelite();
  showResult(false, "航线被封住了", "牌面没有可用对子且洗牌已用完；下一次优先打开上层与长边。 ");
  syncMahjongControls();
}

function selectMahjongTile(tile) {
  if (!isMahjongTileFree(tile)) {
    mahjongFlash = { x: mahjongTileRect(tile, mahjongLayout()).x + 45, y: mahjongTileRect(tile, mahjongLayout()).y + 55, sprite: 7, until: performance.now() + 360 };
    setStatus(mahjongBlockReason(tile)); playSound("fail"); drawMahjongRoguelite(); return;
  }
  mahjongHintIds = new Set();
  if (!mahjongSelectedId) {
    mahjongSelectedId = tile.id; tile.selected = true; playSound("move");
    setStatus("已选中一张自由牌；再找一张图案与角标都相同的牌。 "); drawMahjongRoguelite(); return;
  }
  const first = mahjongBoard.find((candidate) => candidate.id === mahjongSelectedId);
  if (first.id === tile.id) {
    first.selected = false; mahjongSelectedId = null; playSound("move"); drawMahjongRoguelite(); return;
  }
  if (first.pairId !== tile.pairId) {
    first.selected = false; tile.selected = true; mahjongSelectedId = tile.id;
    if (!mahjongRelicStacks.has("reef")) mahjongCombo = 0;
    setStatus("这两张不是同一对；已保留第二张继续寻找。 "); playSound("fail"); drawMahjongRoguelite(); return;
  }
  const freeBeforeMatch = new Set(mahjongBoard.filter(isMahjongTileFree).map((candidate) => candidate.id));
  snapshotMahjongState();
  first.deleted = true; first.selected = false; tile.deleted = true;
  mahjongSelectedId = null; mahjongCombo += 1;
  mahjongKeyboardId = null;
  mahjongNewlyFreeIds = new Set(mahjongBoard.filter(isMahjongTileFree).map((candidate) => candidate.id).filter((id) => !freeBeforeMatch.has(id)));
  let multiplier = 1 + (mahjongRelicStacks.get("thread") || 0) + (mahjongRelicStacks.get("crown") || 0) * 1.5;
  if ((mahjongRelicStacks.get("mirror") || 0) > 0) {
    multiplier *= 2;
    const remainingMirrors = (mahjongRelicStacks.get("mirror") || 0) - 1;
    if (remainingMirrors > 0) mahjongRelicStacks.set("mirror", remainingMirrors); else mahjongRelicStacks.delete("mirror");
  }
  const earned = (10 + mahjongCombo * 3) * multiplier;
  mahjongScore += earned;
  mahjongMatches += 1;
  if (mahjongMatches >= 2 && mahjongSealedIds.size) {
    mahjongSealedIds = new Set();
    mahjongNewlyFreeIds = new Set(mahjongBoard.filter(isMahjongTileFree).map((candidate) => candidate.id));
    setStatus("封锁层已经解除；新开放的牌正在发光。 ");
  }
  const rect = mahjongTileRect(tile, mahjongLayout());
  mahjongFlash = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, sprite: 8, until: performance.now() + 420 };
  setMetric(mahjongRemaining() + " 张");
  setStatus("配对成功 · 连击 ×" + mahjongCombo + " · +" + earned + " 分");
  saveMahjongRun(); playSound("move"); drawMahjongRoguelite(); checkMahjongContinuity();
}

function hintMahjongPair() {
  if (mahjongHints <= 0) { setStatus("本次旅程的提示已经用完。 "); return; }
  const pair = getAvailableMahjongPairs()[0];
  if (!pair) { checkMahjongContinuity(); return; }
  mahjongHints -= 1;
  mahjongHintIds = new Set(pair.map((tile) => tile.id));
  setStatus("一对可消除灵牌已经点亮；提示不会替你移除。 "); saveMahjongRun(); drawMahjongRoguelite();
}

function reshuffleMahjongBoard() {
  if (mahjongShuffles <= 0) { setStatus("本次旅程的洗牌已经用完。 "); return; }
  const active = mahjongBoard.filter((tile) => !tile.deleted).map((tile) => ({ id: tile.id, x: tile.x, y: tile.y, z: tile.z }));
  if (!active.length) return;
  snapshotMahjongState();
  const reassigned = assignMahjongPairs(active, (currentCampaignLevel().seed ^ active.length ^ mahjongScore) >>> 0);
  const replacement = new Map(reassigned.map((tile) => [tile.id, tile]));
  mahjongBoard = mahjongBoard.map((tile) => tile.deleted ? tile : replacement.get(tile.id));
  mahjongShuffles -= 1; mahjongSelectedId = null; mahjongHintIds = new Set(); mahjongCombo = 0; mahjongNewlyFreeIds = new Set();
  mahjongKeyboardId = mahjongBoard.find(isMahjongTileFree)?.id || null;
  setStatus("牌面已重排，并重新验证存在完整消除顺序。 "); saveMahjongRun(); playSound("move"); drawMahjongRoguelite();
}

function undoMahjongPair() {
  const state = mahjongHistory.pop();
  if (!state) { setStatus("目前没有可以撤销的配对。 "); return; }
  mahjongBoard = state.board; mahjongScore = state.score; mahjongCombo = mahjongRelicStacks.has("shell") ? mahjongCombo : state.combo; mahjongSelectedId = state.selectedId;
  mahjongMatches = state.matches; mahjongSealedIds = state.sealedIds;
  mahjongHintIds = new Set(); mahjongNewlyFreeIds = new Set();
  mahjongKeyboardId = mahjongBoard.find(isMahjongTileFree)?.id || null;
  setMetric(mahjongRemaining() + " 张"); setStatus("已撤销上一对。 "); saveMahjongRun(); drawMahjongRoguelite();
}

function moveMahjongKeyboardCursor(direction) {
  const freeTiles = mahjongBoard.filter(isMahjongTileFree).sort((left, right) => left.y - right.y || left.x - right.x);
  if (!freeTiles.length) return;
  const currentIndex = Math.max(0, freeTiles.findIndex((tile) => tile.id === mahjongKeyboardId));
  const nextIndex = (currentIndex + direction + freeTiles.length) % freeTiles.length;
  mahjongKeyboardId = freeTiles[nextIndex].id;
  setStatus("键盘焦点已移动到一张自由牌；按回车或空格选择。 ");
  drawMahjongRoguelite();
}

function startGame() {
  readMahjongSetup();
  if (restoreMahjongRun()) {
    running = true; hideOverlay(); startAmbient();
    if (mahjongAwaitingRelic) { pickMahjongRelicChoices(); setGameSessionState("stage-complete"); }
    setMetric(mahjongRemaining() + " 张");
    setStatus("已恢复上次月港旅程 · 航段 " + (mahjongStage + 1) + " / 3 · 剩余 " + mahjongRemaining() + " 张。 ");
    drawMahjongRoguelite(); canvas.focus({ preventScroll: true }); return;
  }
  mahjongStage = 0; mahjongScore = 0; mahjongCombo = 0;
  const resourcePenalty = Math.floor((currentCampaignLevel().tier - 1) / 2);
  mahjongHints = Math.max(0, mahjongDifficulty.hints - resourcePenalty);
  mahjongShuffles = Math.max(1, mahjongDifficulty.shuffles - resourcePenalty);
  mahjongRelicStacks = new Map(); mahjongAwaitingRelic = false;
  mahjongRestored = false;
  running = true; hideOverlay(); startAmbient(); startMahjongStage();
  canvas.focus({ preventScroll: true });
}

function handleControl(value) {
  if (!running || mahjongAwaitingRelic) return;
  if (value === "hint") hintMahjongPair();
  if (value === "shuffle") reshuffleMahjongBoard();
  if (value === "undo") undoMahjongPair();
}

function handleKey(key) {
  if (!running && !mahjongAwaitingRelic) return;
  if (mahjongAwaitingRelic && ["1", "2", "3"].includes(key)) { chooseMahjongRelic(Number(key) - 1); return; }
  if (mahjongAwaitingRelic) return;
  if (key.toLowerCase() === "h") hintMahjongPair();
  if (key.toLowerCase() === "s") reshuffleMahjongBoard();
  if (key.toLowerCase() === "z") undoMahjongPair();
  if (["ArrowLeft", "ArrowUp"].includes(key)) moveMahjongKeyboardCursor(-1);
  if (["ArrowRight", "ArrowDown"].includes(key)) moveMahjongKeyboardCursor(1);
  if (["Enter", " "].includes(key)) {
    const tile = mahjongBoard.find((candidate) => candidate.id === mahjongKeyboardId);
    if (tile) selectMahjongTile(tile);
  }
}

canvas.addEventListener("pointerup", (event) => {
  if (!running && !mahjongAwaitingRelic) return;
  const point = eventScenePoint(event);
  if (mahjongAwaitingRelic) {
    if (point.y >= 350 && point.y <= 660) chooseMahjongRelic(Math.max(0, Math.min(2, Math.floor((point.x - 42) / 226))));
    return;
  }
  const hit = [...mahjongHitAreas].reverse().find(({ rect }) => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height);
  if (hit) { mahjongKeyboardId = hit.tile.id; selectMahjongTile(hit.tile); }
});

canvas.addEventListener("focus", () => {
  if (!running || mahjongAwaitingRelic) return;
  if (!mahjongKeyboardId) mahjongKeyboardId = mahjongBoard.find(isMahjongTileFree)?.id || null;
  drawMahjongRoguelite();
});

const mahjongModeSelect = document.querySelector("[data-mahjong-mode]");
const mahjongSeedInput = document.querySelector("[data-mahjong-seed]");
mahjongModeSelect?.addEventListener("change", () => {
  mahjongSeedInput.disabled = mahjongModeSelect.value !== "seeded";
  if (mahjongModeSelect.value === "seeded") mahjongSeedInput.focus();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) { mahjongHiddenAt = Date.now(); saveMahjongRun(); return; }
  if (mahjongHiddenAt && mahjongDeadline) mahjongDeadline += Date.now() - mahjongHiddenAt;
  mahjongHiddenAt = 0; saveMahjongRun();
});

setInterval(() => {
  if (!running || gameSessionState !== "playing" || !mahjongDeadline) return;
  if (mahjongTimeRemaining() <= 0) {
    clearMahjongRun(); drawMahjongRoguelite(); showResult(false, "潮汐淹没了航线", "第三航段计时归零；优先消除能打开更多边缘的对子。 "); return;
  }
  drawMahjongRoguelite();
}, 1000);

runtimeDebugActions = {
  selectFirstFree: () => {
    const pair = getAvailableMahjongPairs()[0];
    if (pair?.[0]) selectMahjongTile(pair[0]);
  },
  completeMahjongStage: () => { mahjongBoard.forEach((tile) => { tile.deleted = true; }); mahjongSelectedId = null; drawMahjongRoguelite(); resolveMahjongStageClear(); },
  chooseFirstRelic: () => { if (mahjongAwaitingRelic) chooseMahjongRelic(0); },
  failMahjong: () => { clearMahjongRun(); showResult(false, "航线被封住了", "牌面没有可用对子且洗牌已用完。 "); },
};
runtimeDebugState = () => ({
  level: currentCampaignLevel().number,
  tier: currentCampaignLevel().tier,
  stage: mahjongStage,
  remaining: mahjongRemaining(),
  score: mahjongScore,
  hints: mahjongHints,
  shuffles: mahjongShuffles,
  selectedId: mahjongSelectedId,
  keyboardId: mahjongKeyboardId,
  relicCount: mahjongRelicCount(),
  relicStacks: Object.fromEntries(mahjongRelicStacks),
  awaitingRelic: mahjongAwaitingRelic,
  mode: mahjongMode,
  runSeed: mahjongRunSeed,
  rule: currentMahjongRule().id,
  matches: mahjongMatches,
  sealedCount: mahjongSealedIds.size,
  timeRemaining: mahjongTimeRemaining(),
  restored: mahjongRestored,
  relicPoolSize: mahjongRelics.length,
  relicChoices: mahjongRelicChoices.map((relic) => ({ id: relic.id, rarity: relic.rarity, scope: relic.scope, stacks: mahjongRelicStacks.get(relic.id) || 0 })),
  availablePairs: getAvailableMahjongPairs().map((pair) => pair.map((tile) => tile.id)),
  freeCount: mahjongBoard.filter(isMahjongTileFree).length,
  blockedCount: mahjongBoard.filter((tile) => !tile.deleted && !isMahjongTileFree(tile)).length,
  compatibleFreeCount: mahjongSelectedId ? mahjongBoard.filter((tile) => tile.id !== mahjongSelectedId && isMahjongTileFree(tile) && tile.pairId === mahjongBoard.find((candidate) => candidate.id === mahjongSelectedId)?.pairId).length : 0,
  boardLayout: mahjongLayout(),
  visualCueVersion: 2,
  hitAreas: mahjongHitAreas.map(({ tile, rect }) => ({ id: tile.id, pairId: tile.pairId, free: isMahjongTileFree(tile), rect })),
});

mahjongBoard = createSolvableMahjongBoard(mahjongTileCountForLevel(), 0x4d4a5254);
drawMahjongRoguelite();
`;
