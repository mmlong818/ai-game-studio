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
const mahjongRoutes = [
  { id: "garden", name: "雾灯花园", tag: "休整", detail: "本段获得 1 次提示，牌阵保持标准规模", tileDelta: 0, scoreMultiplier: 1, timeDelta: 0, sprite: 5 },
  { id: "market", name: "珊瑚夜市", tag: "赏金", detail: "开局获得 100 分，但牌阵增加 4 张", tileDelta: 4, scoreMultiplier: 1.1, timeDelta: 0, sprite: 4 },
  { id: "archive", name: "沉月档案馆", tag: "构筑", detail: "遗物协同额外增幅，牌阵增加 4 张", tileDelta: 4, scoreMultiplier: 1.15, timeDelta: 0, sprite: 2 },
  { id: "tideway", name: "蓝潮捷径", tag: "限时", detail: "本段限时，得分提高 35%", tileDelta: 0, scoreMultiplier: 1.35, timeDelta: -15, sprite: 3 },
  { id: "elite", name: "镜礁禁航区", tag: "精英", detail: "更大的封锁牌阵与更短潮汐，胜利计入真结局", tileDelta: 8, scoreMultiplier: 1.65, timeDelta: -25, sprite: 8 },
];
const mahjongSynergies = [
  { id: "navigator", relics: ["compass", "atlas"], name: "星潮领航", detail: "每段额外获得 2 次提示" },
  { id: "moon-thread", relics: ["thread", "mirror"], name: "月镜织术", detail: "每段首次配对再乘 2 倍" },
  { id: "storm-crown", relics: ["anchor", "crown"], name: "风暴加冕", detail: "抵消王冠的计时惩罚" },
  { id: "echo-reef", relics: ["shell", "reef"], name: "回声礁群", detail: "撤销和配错都不会中断连击" },
];
const mahjongConflicts = [
  { id: "crown-charm", relics: ["crown", "charm"], name: "逆风税", detail: "每段洗牌次数 -1，得分再提高 25%" },
  { id: "lantern-atlas", relics: ["lantern", "atlas"], name: "光路重叠", detail: "封锁直接解除，但群岛图不再追加提示" },
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
let mahjongKeyboardNavigation = false;
let mahjongRelicChoices = [];
let mahjongRouteChoices = [];
let mahjongAwaitingRoute = false;
let mahjongCurrentRouteId = null;
let mahjongRouteHistory = [];
let mahjongEliteWins = 0;
let mahjongEnding = null;
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
  const route = currentMahjongRoute();
  return Math.min(72, counts[currentCampaignLevel().tier - 1] + mahjongStage * 4 + (route?.tileDelta || 0));
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
  const route = currentMahjongRoute();
  if (route?.id === "elite") return { id: "elite", label: "精英围猎", detail: "清空双重封锁的大型牌阵", timeLimit: Math.max(80, 145 - currentCampaignLevel().tier * 8) };
  if (route?.id === "tideway") return { id: "tideway", label: "蓝潮捷径", detail: "在潮汐归零前清空牌阵", timeLimit: Math.max(70, 135 - currentCampaignLevel().tier * 8) };
  if (mahjongStage === 1) return { id: "sealed", label: "封锁层", detail: "完成 2 对后解除封锁层", timeLimit: 0 };
  if (mahjongStage === 2) return { id: "tide", label: "限时潮汐", detail: "在潮汐归零前清空牌阵", timeLimit: Math.max(75, 165 - currentCampaignLevel().tier * 12) };
  return { id: "harbor", label: "开放长堤", detail: "从开放边缘建立连击", timeLimit: 0 };
}

function currentMahjongRoute() { return mahjongRoutes.find((route) => route.id === mahjongCurrentRouteId) || null; }
function activeMahjongSynergies() { return mahjongSynergies.filter((synergy) => synergy.relics.every((id) => mahjongRelicStacks.has(id))); }
function activeMahjongConflicts() { return mahjongConflicts.filter((conflict) => conflict.relics.every((id) => mahjongRelicStacks.has(id))); }
function mahjongHasSynergy(id) { return activeMahjongSynergies().some((synergy) => synergy.id === id); }
function mahjongHasConflict(id) { return activeMahjongConflicts().some((conflict) => conflict.id === id); }

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
      schemaVersion: 3, level: currentCampaignLevel().number, mode: mahjongMode, seed: mahjongRunSeed,
      stage: mahjongStage, score: mahjongScore, combo: mahjongCombo, hints: mahjongHints, shuffles: mahjongShuffles,
      board: mahjongBoard, relicStacks: Object.fromEntries(mahjongRelicStacks), matches: mahjongMatches,
      sealedIds: [...mahjongSealedIds], deadline: mahjongDeadline, awaitingRelic: mahjongAwaitingRelic,
      awaitingRoute: mahjongAwaitingRoute, currentRouteId: mahjongCurrentRouteId, routeHistory: mahjongRouteHistory,
      eliteWins: mahjongEliteWins, ending: mahjongEnding, updatedAt: Date.now(),
    }));
  } catch {}
}

function clearMahjongRun() {
  try { safeStorage.removeItem(mahjongRunStorageKey); } catch {}
}

function restoreMahjongRun() {
  try {
    const saved = JSON.parse(safeStorage.getItem(mahjongRunStorageKey) || "null");
    if (!saved || ![2, 3].includes(saved.schemaVersion) || saved.level !== currentCampaignLevel().number || saved.mode !== mahjongMode || saved.seed !== mahjongRunSeed || !Array.isArray(saved.board)) return false;
    mahjongStage = Math.max(0, Math.min(2, Number(saved.stage) || 0));
    mahjongScore = Number(saved.score) || 0; mahjongCombo = Number(saved.combo) || 0;
    mahjongHints = Math.max(0, Number(saved.hints) || 0); mahjongShuffles = Math.max(0, Number(saved.shuffles) || 0);
    mahjongBoard = saved.board; mahjongRelicStacks = new Map(Object.entries(saved.relicStacks || {}).map(([key, value]) => [key, Number(value) || 0]));
    mahjongMatches = Number(saved.matches) || 0; mahjongSealedIds = new Set(saved.sealedIds || []);
    mahjongDeadline = Number(saved.deadline) || 0; mahjongAwaitingRelic = Boolean(saved.awaitingRelic);
    mahjongAwaitingRoute = Boolean(saved.awaitingRoute); mahjongCurrentRouteId = saved.currentRouteId || null;
    mahjongRouteHistory = Array.isArray(saved.routeHistory) ? saved.routeHistory : [];
    mahjongEliteWins = Number(saved.eliteWins) || 0; mahjongEnding = saved.ending || null;
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
  const controlsLocked = !running || mahjongAwaitingRelic || mahjongAwaitingRoute;
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
  const tileWidth = Math.min(148, 670 / (maxX * .96 + 1.1));
  const tileHeight = tileWidth * 1.24;
  const stepX = tileWidth * .96;
  const stepY = tileHeight * .93;
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
  const keyboardFocused = mahjongKeyboardNavigation && tile.id === mahjongKeyboardId;
  const sealed = mahjongSealedIds.has(tile.id) && !mahjongRelicStacks.has("lantern");
  return { free, selected, hinted, matching, newlyFree, keyboardFocused, sealed };
}

function drawMahjongTileBody(rect, tile, free, sealed) {
  const depth = Math.max(7, Math.min(11, rect.width * .065));
  const radius = Math.max(14, rect.width * .15);
  const sideGradient = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.width, rect.y + rect.height);
  sideGradient.addColorStop(0, free ? "#e7d8b8" : "#b3aa98");
  sideGradient.addColorStop(1, sealed ? "#80695d" : free ? "#ad9d7e" : "#887f70");
  ctx.save();
  ctx.fillStyle = "rgba(12,28,34,.3)";
  ctx.shadowColor = "rgba(10,27,34,.38)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetX = depth * .7;
  ctx.shadowOffsetY = depth * .9;
  ctx.beginPath();
  ctx.roundRect(rect.x + depth, rect.y + depth, rect.width, rect.height, radius);
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.fillStyle = sideGradient;
  ctx.beginPath();
  ctx.roundRect(rect.x + depth, rect.y + depth, rect.width, rect.height, radius);
  ctx.fill();
  ctx.strokeStyle = free ? "rgba(91,76,52,.46)" : "rgba(42,48,48,.58)";
  ctx.lineWidth = Math.max(2, rect.width * .018);
  ctx.stroke();
  ctx.restore();
  return depth;
}

function drawMahjongCornerMarks(rect, color, lineWidth = 5) {
  const inset = Math.max(8, rect.width * .075);
  const length = Math.max(14, rect.width * .18);
  const left = rect.x + inset; const right = rect.x + rect.width - inset;
  const top = rect.y + inset; const bottom = rect.y + rect.height - inset;
  ctx.save();
  ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = "round";
  [[left + length, top, left, top, left, top + length], [right - length, top, right, top, right, top + length], [left + length, bottom, left, bottom, left, bottom - length], [right - length, bottom, right, bottom, right, bottom - length]].forEach((points) => {
    ctx.beginPath(); ctx.moveTo(points[0], points[1]); ctx.lineTo(points[2], points[3]); ctx.lineTo(points[4], points[5]); ctx.stroke();
  });
  ctx.restore();
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

function drawMahjongRouteChoice() {
  ctx.fillStyle = "rgba(13,28,37,.88)";
  ctx.fillRect(0, 130, 720, Math.min(930, gameSceneHeight() - 170));
  ctx.textAlign = "center"; ctx.fillStyle = "#fffaf0";
  ctx.font = "800 34px Inter, sans-serif"; ctx.fillText("选择下一段航线", 360, 228);
  ctx.font = "600 20px Inter, sans-serif"; ctx.fillStyle = "rgba(255,250,240,.78)";
  ctx.fillText("路线改变牌阵、风险与得分，也决定最终归航结局", 360, 267);
  mahjongRouteChoices.forEach((route, index) => {
    const x = 42 + index * 226; const y = 324;
    const elite = route.id === "elite";
    ctx.fillStyle = elite ? "rgba(43,26,31,.97)" : "rgba(255,250,236,.96)";
    ctx.beginPath(); ctx.roundRect(x, y, 184, 346, 28); ctx.fill();
    ctx.strokeStyle = elite ? "#ef9a5d" : "rgba(22,141,138,.46)"; ctx.lineWidth = elite ? 5 : 2;
    ctx.beginPath(); ctx.roundRect(x + 2, y + 2, 180, 342, 26); ctx.stroke();
    drawBitmapSprite(route.sprite, x + 34, y + 24, 116, 116, { fallback: elite ? "#ef9a5d" : palette.highlight, scale: 1.1 });
    ctx.fillStyle = elite ? "#ffd3ad" : "#20343c"; ctx.font = "800 22px Inter, sans-serif";
    ctx.fillText(route.name, x + 92, y + 174);
    ctx.fillStyle = elite ? "#ef9a5d" : "#168d8a"; ctx.font = "800 17px Inter, sans-serif";
    ctx.fillText(route.tag + " · ×" + route.scoreMultiplier.toFixed(2), x + 92, y + 204);
    ctx.fillStyle = elite ? "rgba(255,244,228,.82)" : "#54676c"; ctx.font = "650 18px Inter, sans-serif";
    const lines = [route.detail.slice(0, 8), route.detail.slice(8, 16), route.detail.slice(16, 24)].filter(Boolean);
    lines.forEach((line, lineIndex) => ctx.fillText(line, x + 92, y + 238 + lineIndex * 27));
    ctx.fillStyle = elite ? "#fff2df" : "#718287"; ctx.font = "700 16px Inter, sans-serif";
    ctx.fillText("按 " + (index + 1) + " 选择", x + 92, y + 318);
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
  const route = currentMahjongRoute();
  ctx.fillText("航段 " + (mahjongStage + 1) + " / 3   " + (route?.name || "待选航线") + "   剩余 " + mahjongRemaining() + tideText, 360, 82);
  ctx.fillStyle = palette.textSoft; ctx.font = "700 18px Inter, sans-serif";
  ctx.fillText(rule.label + "   ·   可配对 " + pairCount + "   ·   得分 " + Math.round(mahjongScore) + "   ·   连击 ×" + Math.max(1, mahjongCombo), 360, 123);
  drawPlayfield(layout.x - 24, layout.y - 30, layout.boardWidth + 48, layout.boardHeight + 60, { radius: 36, alpha: .9 });
  mahjongHitAreas = [];
  const drawOrder = [...mahjongBoard].filter((tile) => !tile.deleted).sort((left, right) => left.z - right.z || left.y - right.y || left.x - right.x);
  drawOrder.forEach((tile) => {
    const rect = mahjongTileRect(tile, layout);
    const { free, selected, hinted, matching, newlyFree, keyboardFocused, sealed } = mahjongTileVisualState(tile, selectedTile);
    ctx.save();
    const tileDepth = drawMahjongTileBody(rect, tile, free, sealed);
    ctx.globalAlpha = free ? 1 : .76;
    ctx.filter = free ? "none" : "saturate(.5) brightness(.84)";
    drawBitmapSprite(tile.symbol, rect.x, rect.y, rect.width, rect.height, { fallback: "#fff6de", scale: 1 });
    ctx.filter = "none";
    if (!free) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = sealed ? "rgba(92,46,42,.44)" : "rgba(31,45,49,.29)";
      ctx.beginPath(); ctx.roundRect(rect.x + 4, rect.y + 4, rect.width - 8, rect.height - 8, Math.max(12, rect.width * .14)); ctx.fill();
      ctx.strokeStyle = sealed ? "rgba(119,55,49,.86)" : "rgba(44,56,59,.5)";
      ctx.lineWidth = Math.max(2, rect.width * .024);
      ctx.beginPath(); ctx.moveTo(rect.x + rect.width * .18, rect.y + rect.height * .86); ctx.lineTo(rect.x + rect.width * .82, rect.y + rect.height * .86); ctx.stroke();
    }
    ctx.globalAlpha = free ? .98 : .7;
    ctx.fillStyle = mahjongVariantColors[tile.variant];
    const markerX = rect.x + rect.width * .79;
    const markerY = rect.y + rect.height * .18;
    const markerRadius = Math.max(9, rect.width * .095);
    ctx.beginPath(); ctx.arc(markerX, markerY, markerRadius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "rgba(255,250,240,.94)"; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = "#fffaf0"; ctx.font = "800 " + Math.max(14, rect.width * .14) + "px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(tile.variant + 1), markerX, markerY + .5);
    ctx.textBaseline = "alphabetic";
    if (free) {
      ctx.strokeStyle = selected ? "#146f78" : keyboardFocused ? "#0b6070" : "rgba(78,65,44,.48)";
      ctx.lineWidth = selected ? 6 : keyboardFocused ? 4 : 2;
      if (keyboardFocused && !selected) ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.roundRect(rect.x + 5, rect.y + 5, rect.width - 10, rect.height - 10, Math.max(12, rect.width * .13)); ctx.stroke();
      ctx.setLineDash([]);
      if (hinted || matching) drawMahjongCornerMarks(rect, "#e6a42c", matching ? 6 : 5);
      if (newlyFree && !hinted && !matching) drawMahjongCornerMarks(rect, "#2f9a8d", 4);
      if (selected) {
        const badgeRadius = Math.max(10, rect.width * .09);
        const badgeX = rect.x + rect.width * .19; const badgeY = rect.y + rect.height * .18;
        ctx.fillStyle = "#146f78"; ctx.beginPath(); ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "rgba(255,251,235,.96)"; ctx.lineWidth = 3; ctx.stroke();
        ctx.strokeStyle = "#fffbed"; ctx.lineWidth = 3; ctx.lineCap = "round"; ctx.lineJoin = "round";
        ctx.beginPath(); ctx.moveTo(badgeX - badgeRadius * .42, badgeY); ctx.lineTo(badgeX - badgeRadius * .08, badgeY + badgeRadius * .34); ctx.lineTo(badgeX + badgeRadius * .48, badgeY - badgeRadius * .36); ctx.stroke();
      }
    }
    ctx.restore();
    mahjongHitAreas.push({ tile, rect: { ...rect }, depth: tileDepth });
  });
  const footerY = Math.min(gameSceneHeight() - 110, layout.y + layout.boardHeight + 78);
  drawPlayfield(91, footerY - 38, 538, 62, { radius: 22, alpha: .86 });
  ctx.fillStyle = palette.text; ctx.font = "700 18px Inter, sans-serif";
  ctx.fillText("亮面为自由牌   ·   金色角标为配对目标   ·   灰暗牌仍被覆盖", 360, footerY - 5);
  ctx.fillStyle = palette.textSoft; ctx.font = "600 14px Inter, sans-serif";
  const buildText = activeMahjongSynergies().length ? "协同 " + activeMahjongSynergies().map((item) => item.name).join("、") : mahjongRelicCount() ? "继续收集遗物以激活协同" : "首段完成后可选择遗物";
  ctx.fillText("提示 " + mahjongHints + "   ·   洗牌 " + mahjongShuffles + "   ·   " + buildText, 360, footerY + 18);
  if (mahjongFlash && performance.now() < mahjongFlash.until) {
    drawBitmapSprite(mahjongFlash.sprite, mahjongFlash.x - 70, mahjongFlash.y - 70, 140, 140, { fallback: palette.highlight, alpha: .8, scale: 1.16 });
  }
  if (mahjongAwaitingRelic) drawMahjongRelicChoice();
  if (mahjongAwaitingRoute) drawMahjongRouteChoice();
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
  presentMahjongRouteChoices();
}

function pickMahjongRelicChoices() {
  const random = mahjongRandom((mahjongRunSeed ^ (mahjongStage + 1) * 0x9e3779b1) >>> 0);
  mahjongRelicChoices = shuffleMahjongList(mahjongRelics, random).slice(0, 3);
}

function pickMahjongRouteChoices() {
  const random = mahjongRandom((mahjongRunSeed ^ (mahjongStage + 11) * 0x85ebca6b) >>> 0);
  const normalRoutes = shuffleMahjongList(mahjongRoutes.filter((route) => route.id !== "elite"), random).slice(0, 3);
  if (mahjongStage >= 1) normalRoutes[2] = mahjongRoutes.find((route) => route.id === "elite");
  mahjongRouteChoices = normalRoutes;
}

function presentMahjongRouteChoices() {
  mahjongCurrentRouteId = null; mahjongAwaitingRoute = true; mahjongDeadline = 0;
  pickMahjongRouteChoices(); setGameSessionState("stage-complete");
  setMetric("选择航线");
  setStatus("选择第 " + (mahjongStage + 1) + " 航段：稳健补给、收益路线或精英挑战会改变本段规则。 ");
  saveMahjongRun(); drawMahjongRoguelite();
}

function chooseMahjongRoute(index) {
  const route = mahjongRouteChoices[index];
  if (!route) return;
  mahjongCurrentRouteId = route.id; mahjongAwaitingRoute = false;
  mahjongRouteHistory.push({ stage: mahjongStage + 1, id: route.id, name: route.name, tag: route.tag });
  if (route.id === "garden") mahjongHints += 1;
  if (route.id === "market") mahjongScore += 100;
  setGameSessionState("playing"); saveMahjongRun(); startMahjongStage();
}

function mahjongEndingForRun() {
  const synergies = activeMahjongSynergies();
  if (mahjongEliteWins >= 2 && synergies.length >= 1) return { id: "moon-crown", name: "潮冠归航", detail: "你穿越两处禁航区，并让遗物形成完整协同。" };
  if (synergies.length >= 2) return { id: "lantern-fleet", name: "万灯领航", detail: "两组遗物协同让整支月港船队找到了新航线。" };
  if (mahjongScore >= 1800) return { id: "treasure-route", name: "星砂富航", detail: "你以高额赏金刷新了月港商会的航行纪录。" };
  return { id: "safe-return", name: "平潮归航", detail: "你稳妥完成三段航程，新的路线已经解锁。" };
}

function startMahjongStage() {
  const tileCount = mahjongTileCountForLevel();
  mahjongBoard = createSolvableMahjongBoard(tileCount, (mahjongRunSeed ^ tileCount ^ mahjongStage * 0x9e3779b1) >>> 0);
  mahjongSealedIds = new Set(); mahjongMatches = 0;
  const initialPairs = getAvailableMahjongPairs();
  if (["sealed", "elite"].includes(currentMahjongRule().id) && initialPairs.length > 1 && !mahjongRelicStacks.has("lantern")) {
    initialPairs[1].forEach((tile) => mahjongSealedIds.add(tile.id));
    if (currentMahjongRule().id === "elite" && initialPairs.length > 2) initialPairs[2].forEach((tile) => mahjongSealedIds.add(tile.id));
  }
  const openingPair = getAvailableMahjongPairs()[0] || [];
  const rule = currentMahjongRule();
  const route = currentMahjongRoute();
  const crownPenalty = mahjongRelicStacks.has("crown") && !mahjongHasSynergy("storm-crown") ? 15 : 0;
  mahjongDeadline = rule.timeLimit ? Date.now() + Math.max(45, rule.timeLimit + (route?.timeDelta || 0) - crownPenalty) * 1000 : 0;
  if (mahjongRelicStacks.has("anchor") && mahjongDeadline) mahjongDeadline += 30_000;
  if (mahjongRelicStacks.has("atlas") && !mahjongHasConflict("lantern-atlas")) mahjongHints += 1;
  if (mahjongHasSynergy("navigator")) mahjongHints += 2;
  if (mahjongHasConflict("crown-charm")) mahjongShuffles = Math.max(0, mahjongShuffles - 1);
  if (mahjongRelicStacks.has("sail")) mahjongScore += 60;
  mahjongSelectedId = null;
  mahjongHintIds = new Set(openingPair.map((tile) => tile.id));
  mahjongHistory = []; mahjongCombo = 0; mahjongFlash = null; mahjongNewlyFreeIds = new Set();
  mahjongKeyboardId = openingPair[0]?.id || mahjongBoard.find(isMahjongTileFree)?.id || null;
  setMetric(mahjongRemaining() + " 张");
  const buildNotice = activeMahjongSynergies().length ? " · 已激活 " + activeMahjongSynergies().map((item) => item.name).join("、") : "";
  setStatus("第 " + currentCampaignLevel().number + " 关 · " + route.name + " · " + rule.label + "：" + rule.detail + buildNotice + "。已点亮第一对自由牌。 ");
  saveMahjongRun();
  drawMahjongRoguelite();
}

function resolveMahjongStageClear() {
  playSound("success");
  if (currentMahjongRoute()?.id === "elite") mahjongEliteWins += 1;
  if (mahjongStage >= 2) {
    mahjongEnding = mahjongEndingForRun();
    const best = updateMahjongBestScore();
    clearMahjongRun();
    drawMahjongRoguelite();
    showResult(true, mahjongEnding.name, mahjongEnding.detail + " 你以 " + Math.round(mahjongScore) + " 分带回 " + mahjongRelicCount() + " 件遗物，完成 " + mahjongEliteWins + " 次精英挑战；当前模式最佳分 " + Math.round(best) + "。 ");
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
  const routeMultiplier = currentMahjongRoute()?.scoreMultiplier || 1;
  let multiplier = (1 + (mahjongRelicStacks.get("thread") || 0) + (mahjongRelicStacks.get("crown") || 0) * 1.5) * routeMultiplier;
  if (mahjongHasConflict("crown-charm")) multiplier *= 1.25;
  if (currentMahjongRoute()?.id === "archive" && activeMahjongSynergies().length) multiplier *= 1 + activeMahjongSynergies().length * .25;
  if (mahjongHasSynergy("moon-thread") && mahjongMatches === 0) multiplier *= 2;
  if ((mahjongRelicStacks.get("mirror") || 0) > 0) {
    multiplier *= 2;
    const remainingMirrors = (mahjongRelicStacks.get("mirror") || 0) - 1;
    if (remainingMirrors > 0) mahjongRelicStacks.set("mirror", remainingMirrors); else mahjongRelicStacks.delete("mirror");
  }
  const earned = Math.round((10 + mahjongCombo * 3) * multiplier);
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
  mahjongKeyboardNavigation = true;
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
    if (mahjongAwaitingRoute) { pickMahjongRouteChoices(); setGameSessionState("stage-complete"); }
    setMetric(mahjongAwaitingRoute ? "选择航线" : mahjongRemaining() + " 张");
    setStatus("已恢复上次月港旅程 · 航段 " + (mahjongStage + 1) + " / 3 · " + (mahjongAwaitingRoute ? "等待选择航线" : "剩余 " + mahjongRemaining() + " 张") + "。 ");
    drawMahjongRoguelite(); canvas.focus({ preventScroll: true }); return;
  }
  mahjongStage = 0; mahjongScore = 0; mahjongCombo = 0;
  const resourcePenalty = Math.floor((currentCampaignLevel().tier - 1) / 2);
  mahjongHints = Math.max(0, mahjongDifficulty.hints - resourcePenalty);
  mahjongShuffles = Math.max(1, mahjongDifficulty.shuffles - resourcePenalty);
  mahjongRelicStacks = new Map(); mahjongAwaitingRelic = false;
  mahjongAwaitingRoute = false; mahjongCurrentRouteId = null; mahjongRouteHistory = []; mahjongEliteWins = 0; mahjongEnding = null;
  mahjongRestored = false;
  running = true; hideOverlay(); startAmbient(); presentMahjongRouteChoices();
  canvas.focus({ preventScroll: true });
}

function handleControl(value) {
  if (!running || mahjongAwaitingRelic || mahjongAwaitingRoute) return;
  if (value === "hint") hintMahjongPair();
  if (value === "shuffle") reshuffleMahjongBoard();
  if (value === "undo") undoMahjongPair();
}

function handleKey(key) {
  if (!running && !mahjongAwaitingRelic && !mahjongAwaitingRoute) return;
  if (mahjongAwaitingRelic && ["1", "2", "3"].includes(key)) { chooseMahjongRelic(Number(key) - 1); return; }
  if (mahjongAwaitingRoute && ["1", "2", "3"].includes(key)) { chooseMahjongRoute(Number(key) - 1); return; }
  if (mahjongAwaitingRelic) return;
  if (mahjongAwaitingRoute) return;
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

window.addEventListener("keydown", (event) => {
  if (gameSessionState !== "stage-complete" || (!mahjongAwaitingRelic && !mahjongAwaitingRoute)) return;
  if (!["1", "2", "3"].includes(event.key)) return;
  event.preventDefault(); handleKey(event.key);
});

canvas.addEventListener("pointerup", (event) => {
  if (!running && !mahjongAwaitingRelic && !mahjongAwaitingRoute) return;
  mahjongKeyboardNavigation = false;
  const point = eventScenePoint(event);
  if (mahjongAwaitingRelic) {
    if (point.y >= 350 && point.y <= 660) chooseMahjongRelic(Math.max(0, Math.min(2, Math.floor((point.x - 42) / 226))));
    return;
  }
  if (mahjongAwaitingRoute) {
    if (point.y >= 324 && point.y <= 670) chooseMahjongRoute(Math.max(0, Math.min(2, Math.floor((point.x - 42) / 226))));
    return;
  }
  const hit = [...mahjongHitAreas].reverse().find(({ rect }) => point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height);
  if (hit) { mahjongKeyboardId = hit.tile.id; selectMahjongTile(hit.tile); }
});

canvas.addEventListener("focus", () => {
  if (!running || mahjongAwaitingRelic) return;
  if (!mahjongKeyboardId) mahjongKeyboardId = mahjongBoard.find(isMahjongTileFree)?.id || null;
  if (mahjongKeyboardNavigation) drawMahjongRoguelite();
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
    if (mahjongAwaitingRoute) chooseMahjongRoute(0);
    const pair = getAvailableMahjongPairs()[0];
    if (pair?.[0]) selectMahjongTile(pair[0]);
  },
  completeMahjongStage: () => { if (mahjongAwaitingRoute) chooseMahjongRoute(0); mahjongBoard.forEach((tile) => { tile.deleted = true; }); mahjongSelectedId = null; drawMahjongRoguelite(); resolveMahjongStageClear(); },
  chooseFirstRelic: () => { if (mahjongAwaitingRelic) chooseMahjongRelic(0); },
  chooseFirstRoute: () => { if (mahjongAwaitingRoute) chooseMahjongRoute(0); },
  chooseEliteRoute: () => { if (mahjongAwaitingRoute) { const index = mahjongRouteChoices.findIndex((route) => route.id === "elite"); if (index >= 0) chooseMahjongRoute(index); } },
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
  awaitingRoute: mahjongAwaitingRoute,
  mode: mahjongMode,
  runSeed: mahjongRunSeed,
  rule: currentMahjongRule().id,
  matches: mahjongMatches,
  sealedCount: mahjongSealedIds.size,
  timeRemaining: mahjongTimeRemaining(),
  restored: mahjongRestored,
  relicPoolSize: mahjongRelics.length,
  routePoolSize: mahjongRoutes.length,
  currentRoute: currentMahjongRoute() ? { id: currentMahjongRoute().id, name: currentMahjongRoute().name, tag: currentMahjongRoute().tag } : null,
  routeChoices: mahjongRouteChoices.map((route) => ({ id: route.id, name: route.name, tag: route.tag, tileDelta: route.tileDelta, scoreMultiplier: route.scoreMultiplier })),
  routeHistory: mahjongRouteHistory,
  activeSynergies: activeMahjongSynergies().map((item) => ({ id: item.id, name: item.name, detail: item.detail })),
  activeConflicts: activeMahjongConflicts().map((item) => ({ id: item.id, name: item.name, detail: item.detail })),
  eliteWins: mahjongEliteWins,
  ending: mahjongEnding,
  relicChoices: mahjongRelicChoices.map((relic) => ({ id: relic.id, rarity: relic.rarity, scope: relic.scope, stacks: mahjongRelicStacks.get(relic.id) || 0 })),
  availablePairs: getAvailableMahjongPairs().map((pair) => pair.map((tile) => tile.id)),
  freeCount: mahjongBoard.filter(isMahjongTileFree).length,
  blockedCount: mahjongBoard.filter((tile) => !tile.deleted && !isMahjongTileFree(tile)).length,
  compatibleFreeCount: mahjongSelectedId ? mahjongBoard.filter((tile) => tile.id !== mahjongSelectedId && isMahjongTileFree(tile) && tile.pairId === mahjongBoard.find((candidate) => candidate.id === mahjongSelectedId)?.pairId).length : 0,
  boardLayout: mahjongLayout(),
  visualCueVersion: 3,
  layerCueVersion: 1,
  selectionChangesGeometry: false,
  keyboardNavigation: mahjongKeyboardNavigation,
  hitAreas: mahjongHitAreas.map(({ tile, rect, depth }) => ({ id: tile.id, pairId: tile.pairId, z: tile.z, free: isMahjongTileFree(tile), depth, rect })),
});

mahjongBoard = createSolvableMahjongBoard(mahjongTileCountForLevel(), 0x4d4a5254);
drawMahjongRoguelite();
`;
