// 《空档接龙》浏览器层:渲染、点击/拖拽/键盘输入、撤销、进度与牌背存储。
// 规则全部来自 game-core.js;本文件不重复实现合法性判断。
import {
  CELL_COUNT,
  COLUMN_COUNT,
  LEVEL_COUNT,
  RANK_LABELS,
  SUITS,
  applyMove,
  autoPlayAll,
  cardLabel,
  cardName,
  createState,
  findBestDestination,
  isRed,
  isWon,
  legalMoves,
  nextAutoMove,
  maxMovableCount,
  orderedRunLength,
  rankOf,
  solve,
  suitOf,
  validateMove,
} from "./game-core.js";

const PROGRESS_KEY = "freecell.progress.v1";
const SESSION_KEY = "freecell.session.v1";
const CARD_BACK_KEY = "freecell.cardBack.v1";
const SUPERMOVE_TIP_KEY = "freecell.tip.supermove.v1";
const DEFAULT_CARD_BACK = "assets/card-back.png";
const CARD_BACK_WIDTH = 500;
const CARD_BACK_HEIGHT = 700;

const dom = {
  body: document.body,
  table: document.getElementById("table"),
  cards: document.getElementById("cards"),
  status: document.getElementById("status"),
  moves: document.getElementById("moves"),
  timer: document.getElementById("timer"),
  level: document.getElementById("level-number"),
  unlocked: document.getElementById("unlocked-count"),
  undo: document.getElementById("undo"),
  hint: document.getElementById("hint"),
  restart: document.getElementById("restart"),
  openLevels: document.getElementById("open-levels"),
  openBack: document.getElementById("open-back"),
  openBackDialog: document.getElementById("open-back-dialog"),
  deckPreview: document.getElementById("deck-preview-image"),
  winDialog: document.getElementById("win-dialog"),
  winLevel: document.getElementById("win-level"),
  winMoves: document.getElementById("win-moves"),
  winTime: document.getElementById("win-time"),
  winBest: document.getElementById("win-best"),
  nextLevel: document.getElementById("next-level"),
  replayLevel: document.getElementById("replay-level"),
  levelDialog: document.getElementById("level-dialog"),
  levelGrid: document.getElementById("level-grid"),
  closeLevels: document.getElementById("close-levels"),
  backDialog: document.getElementById("back-dialog"),
  closeBack: document.getElementById("close-back"),
  backCanvas: document.getElementById("back-canvas"),
  backFile: document.getElementById("back-file"),
  backZoom: document.getElementById("back-zoom"),
  backOffsetX: document.getElementById("back-offset-x"),
  backOffsetY: document.getElementById("back-offset-y"),
  applyBack: document.getElementById("apply-back"),
  resetBack: document.getElementById("reset-back"),
  backStatus: document.getElementById("back-status"),
  stuckBanner: document.getElementById("stuck-banner"),
  stuckUndo: document.getElementById("stuck-undo"),
  stuckRestart: document.getElementById("stuck-restart"),
};

// ---------- 本地存储 ----------

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 隐私模式或容量不足时进度只保留在内存 */
  }
}

function loadProgress() {
  const stored = readJson(PROGRESS_KEY, null);
  const progress = { unlocked: 1, results: {} };
  if (stored && typeof stored === "object") {
    progress.unlocked = Math.min(LEVEL_COUNT, Math.max(1, Number(stored.unlocked) || 1));
    if (stored.results && typeof stored.results === "object") progress.results = stored.results;
  }
  return progress;
}

const progress = loadProgress();

// ---------- 游戏会话 ----------

const game = {
  level: 1,
  state: null,
  history: [],
  moves: 0,
  startedAt: null,
  elapsedBefore: 0,
  won: false,
  cascading: false,
  selection: null,
  cursor: { row: 1, index: 0 },
  keyboardMode: false,
  hint: null,
};

function elapsedMs() {
  return game.elapsedBefore + (game.startedAt ? Date.now() - game.startedAt : 0);
}

function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function saveSession() {
  writeJson(SESSION_KEY, {
    level: game.level,
    state: game.state,
    history: game.history,
    moves: game.moves,
    elapsed: elapsedMs(),
    won: game.won,
  });
}

function restoreSession() {
  const session = readJson(SESSION_KEY, null);
  if (!session || !session.state || !Array.isArray(session.state.columns) || session.won) return false;
  if (!Number.isInteger(session.level) || session.level < 1 || session.level > progress.unlocked) return false;
  game.level = session.level;
  game.state = session.state;
  game.history = Array.isArray(session.history) ? session.history : [];
  game.moves = Number(session.moves) || 0;
  game.elapsedBefore = Number(session.elapsed) || 0;
  game.startedAt = game.moves > 0 ? Date.now() : null;
  game.won = false;
  return true;
}

function startLevel(level, { deal = true } = {}) {
  game.level = level;
  game.state = createState(level);
  game.history = [];
  game.moves = 0;
  game.startedAt = null;
  game.elapsedBefore = 0;
  game.won = false;
  game.selection = null;
  game.hint = null;
  dom.body.dataset.gameState = "playing";
  saveSession();
  renderMeta();
  setStatus(`第 ${level} 关开始。`);
  if (deal) dealAnimation();
  else render();
}

// ---------- 卡牌元素 ----------

const cardElements = new Map();

function suitAsset(card) {
  return `assets/suits/${SUITS[suitOf(card)]}.png`;
}

function courtAsset(card) {
  const rank = rankOf(card);
  const name = rank === 10 ? "jack" : rank === 11 ? "queen" : "king";
  return `assets/courts/${name}-${SUITS[suitOf(card)]}.png`;
}

function buildCardElement(card) {
  const element = document.createElement("div");
  const label = cardLabel(card);
  const isCourt = rankOf(card) >= 10;
  element.className = `card ${isRed(card) ? "is-red" : "is-black"}${isCourt ? " card--court" : ""}`;
  element.dataset.card = label;
  element.setAttribute("role", "button");
  element.setAttribute("aria-label", cardName(card));
  element.tabIndex = -1;
  const face = document.createElement("div");
  face.className = "card__face";
  const rankText = RANK_LABELS[rankOf(card)];
  const corner = document.createElement("span");
  corner.className = "card__corner";
  corner.innerHTML = `<span>${rankText}</span><img src="${suitAsset(card)}" alt="" draggable="false">`;
  const cornerBottom = corner.cloneNode(true);
  cornerBottom.classList.add("card__corner--bottom");
  const center = document.createElement("img");
  center.className = "card__center";
  center.alt = "";
  center.draggable = false;
  center.src = isCourt ? courtAsset(card) : suitAsset(card);
  face.append(corner, center, cornerBottom);
  const back = document.createElement("div");
  back.className = "card__back";
  element.append(face, back);
  return element;
}

for (let card = 0; card < 52; card += 1) {
  const element = buildCardElement(card);
  cardElements.set(card, element);
  dom.cards.append(element);
}

// ---------- 布局与渲染 ----------

const metrics = { cardW: 44, cardH: 62, gap: 6, left: 0, topRowY: 0, columnsY: 0, stackOffset: 18, tableHeight: 0 };

function computeMetrics() {
  const rect = dom.table.getBoundingClientRect();
  const inner = rect.width - 8;
  const gap = Math.max(4, Math.min(12, rect.width * 0.012));
  const cardW = Math.floor((inner - gap * (COLUMN_COUNT - 1)) / COLUMN_COUNT);
  const cardH = Math.round(cardW * 1.4);
  metrics.gap = gap;
  metrics.cardW = Math.max(30, Math.min(cardW, 96));
  metrics.cardH = Math.round(metrics.cardW * 1.4);
  const totalWidth = metrics.cardW * COLUMN_COUNT + gap * (COLUMN_COUNT - 1);
  metrics.left = Math.round((inner - totalWidth) / 2);
  metrics.topRowY = 0;
  metrics.columnsY = metrics.cardH + gap * 1.6;
  metrics.tableHeight = rect.height - 8;
  metrics.stackOffset = Math.max(12, Math.min(Math.round(metrics.cardH * 0.3), 34));
  dom.table.style.setProperty("--card-w", `${metrics.cardW}px`);
  dom.table.style.setProperty("--card-h", `${metrics.cardH}px`);
  dom.table.style.setProperty("--gap", `${gap}px`);
  void cardH;
}

function slotPosition(slot) {
  const x = metrics.left + slot.index * (metrics.cardW + metrics.gap);
  if (slot.type === "cell") return { x, y: metrics.topRowY };
  if (slot.type === "foundation") return { x: metrics.left + (CELL_COUNT + slot.index) * (metrics.cardW + metrics.gap), y: metrics.topRowY };
  return { x, y: metrics.columnsY };
}

function columnOffset(length) {
  if (length <= 1) return metrics.stackOffset;
  const available = Math.max(metrics.cardH * 2, metrics.tableHeight - metrics.columnsY - metrics.cardH);
  return Math.max(9, Math.min(metrics.stackOffset, Math.floor(available / (length - 1))));
}

function placeCard(element, x, y, z) {
  element.style.setProperty("--x", `${Math.round(x)}px`);
  element.style.setProperty("--y", `${Math.round(y)}px`);
  element.style.zIndex = String(z);
}

function cardPosition(state, card) {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    if (state.cells[index] === card) return { ...slotPosition({ type: "cell", index }), z: 5 };
  }
  for (let column = 0; column < COLUMN_COUNT; column += 1) {
    const row = state.columns[column].indexOf(card);
    if (row >= 0) {
      const base = slotPosition({ type: "column", index: column });
      return { x: base.x, y: base.y + row * columnOffset(state.columns[column].length), z: 10 + row };
    }
  }
  const suit = suitOf(card);
  if (state.foundations[suit] > rankOf(card)) {
    return { ...slotPosition({ type: "foundation", index: suit }), z: 2 + rankOf(card) };
  }
  return null;
}

function render() {
  computeMetrics();
  const state = game.state;
  const selected = new Set(selectedCards());
  const capped = cappedCards();
  for (let card = 0; card < 52; card += 1) {
    const element = cardElements.get(card);
    const position = cardPosition(state, card);
    if (!position) continue;
    element.classList.remove("is-facedown");
    element.classList.toggle("is-on-foundation", state.foundations[suitOf(card)] > rankOf(card));
    element.classList.toggle("is-selected", selected.has(card));
    element.classList.toggle("is-capped", capped.has(card));
    element.classList.toggle("is-hint", Boolean(game.hint && game.hint.cards.includes(card)));
    const covered = state.foundations[suitOf(card)] > rankOf(card) + 1;
    element.hidden = covered;
    if (!covered) placeCard(element, position.x, position.y, position.z + (selected.has(card) ? 40 : 0));
  }
  renderSlots();
  renderMeta();
  renderStuck();
}

/** 没有任何合法移动（含放入空档与收牌）且未通关时，提醒玩家撤销或重开。 */
function renderStuck() {
  const stuck = Boolean(game.state) && !game.won && !game.cascading && !isWon(game.state) && legalMoves(game.state).length === 0;
  dom.stuckBanner.hidden = !stuck;
  if (stuck) {
    dom.stuckUndo.hidden = game.history.length === 0;
    setStatus("没有可以移动的牌了。");
  }
}

function renderSlots() {
  const targets = new Set(game.selection ? validTargets(game.selection).map(slotKey) : []);
  const cursorKey = slotKey(cursorSlot());
  const hintKey = game.hint ? slotKey(game.hint.move.to) : null;
  for (const slot of dom.table.querySelectorAll(".slot")) {
    const key = slot.dataset.slot;
    slot.classList.toggle("is-target", targets.has(key));
    slot.classList.toggle("is-cursor", game.keyboardMode && document.activeElement === dom.table && key === cursorKey);
    slot.classList.toggle("is-hint", key === hintKey);
  }
}

function renderMeta() {
  dom.level.textContent = String(game.level);
  dom.moves.textContent = String(game.moves);
  dom.moves.dataset.prefix = "步";
  dom.timer.dataset.prefix = "时";
  dom.unlocked.dataset.prefix = "解锁";
  dom.unlocked.textContent = String(progress.unlocked);
  dom.timer.textContent = formatTime(elapsedMs());
  dom.undo.disabled = game.history.length === 0 || game.won;
  dom.hint.disabled = game.won;
  document.title = `空档接龙 · 第 ${game.level} 关`;
}

function slotKey(slot) {
  return `${slot.type}-${slot.index}`;
}

function setStatus(message) {
  dom.status.textContent = message;
}

// ---------- 选择与移动 ----------

function selectedCards() {
  if (!game.selection || !game.state) return [];
  const { from, count } = game.selection;
  if (from.type === "cell") return game.state.cells[from.index] === null ? [] : [game.state.cells[from.index]];
  const column = game.state.columns[from.index];
  return column.slice(column.length - count);
}

/** 选中一列牌组时,有序牌组里超出本次搬动上限、这次带不走的牌。 */
function cappedCards() {
  const capped = new Set();
  if (!game.selection || !game.state || game.selection.from.type !== "column") return capped;
  const column = game.state.columns[game.selection.from.index];
  const run = orderedRunLength(column);
  const limit = maxMovableCount(game.state, false);
  if (run <= limit) return capped;
  for (let index = column.length - run; index < column.length - limit; index += 1) capped.add(column[index]);
  return capped;
}

let ruleToastTimer = null;
/** 在目标位置旁边短暂弹出规则说明;第一次触发时多解释一句。 */
function showRuleToast(message, slot) {
  let toast = dom.table.querySelector(".rule-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "rule-toast";
    toast.setAttribute("role", "status");
    dom.table.appendChild(toast);
  }
  let text = message;
  try {
    if (!localStorage.getItem(SUPERMOVE_TIP_KEY)) {
      text = `${message} 空档和空列越多，一次能搬得越多：每个空档 +1，每个空列翻倍。`;
      localStorage.setItem(SUPERMOVE_TIP_KEY, "1");
    }
  } catch { /* 存储不可用时只显示短提示 */ }
  toast.textContent = text;
  const position = slot ? slotPosition(slot) : { x: metrics.left, y: metrics.columnsY };
  const width = Math.min(dom.table.clientWidth - 16, 300);
  const left = Math.max(4, Math.min(position.x + metrics.cardW / 2 - width / 2, dom.table.clientWidth - width - 4));
  toast.style.setProperty("--x", `${Math.round(left)}px`);
  toast.style.setProperty("--y", `${Math.round(position.y + metrics.cardH + 8)}px`);
  toast.style.width = `${width}px`;
  toast.hidden = false;
  toast.classList.add("is-visible");
  if (ruleToastTimer) clearTimeout(ruleToastTimer);
  ruleToastTimer = setTimeout(() => { toast.classList.remove("is-visible"); toast.hidden = true; }, 3200);
}

/** 统一处理被拒绝的移动:上限类拒绝在目标旁弹出说明,其余只更新状态栏。 */
function rejectMove(move, verdict) {
  setStatus(verdict.reason ?? "这个位置不能放。");
  if (verdict.code === "supermove-limit") showRuleToast(verdict.reason, move.to);
}

function validTargets(selection) {
  const targets = [];
  for (let index = 0; index < CELL_COUNT; index += 1) targets.push({ type: "cell", index });
  for (let index = 0; index < 4; index += 1) targets.push({ type: "foundation", index });
  for (let index = 0; index < COLUMN_COUNT; index += 1) targets.push({ type: "column", index });
  return targets.filter((to) => validateMove(game.state, { from: selection.from, to, count: selection.count }).ok);
}

function startTimerIfNeeded() {
  if (!game.startedAt && !game.won) game.startedAt = Date.now();
}

/** 执行玩家移动:记录历史、自动收牌、检测胜利。返回是否成功。 */
function performMove(move, { announce = true } = {}) {
  if (game.won) return false;
  const verdict = validateMove(game.state, move);
  if (!verdict.ok) {
    rejectMove(move, verdict);
    return false;
  }
  if (game.cascading) return false;
  startTimerIfNeeded();
  game.history.push({ state: game.state, moves: game.moves });
  if (game.history.length > 500) game.history.shift();
  const moved = applyMove(game.state, move);
  const auto = autoPlayAll(moved);
  game.state = moved;
  game.moves += 1;
  game.selection = null;
  game.hint = null;
  const label = verdict.cards.map(cardName).join("、");
  if (announce) {
    if (verdict.cards.length > 1) setStatus(`超级移动 ×${verdict.cards.length}:${label}。`);
    else if (auto.moves.length > 0) setStatus(`${label} 已放好,自动收牌 ${auto.moves.length} 张。`);
    else setStatus(`${label} 已放好。`);
  }
  render();
  // 会话直接保存收牌完成后的局面:刷新后不会卡在收牌中途。
  writeJson(SESSION_KEY, { level: game.level, state: auto.state, history: game.history, moves: game.moves, elapsed: elapsedMs(), won: false });
  if (auto.moves.length > 0) runCascade(auto.state);
  else if (isWon(game.state)) finishLevel();
  return true;
}

const REDUCED_MOTION = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** 自动收牌:一张一张飞向收牌堆;全部到位后再结算。牌越多间隔越短,整段不超过约 4 秒。 */
function runCascade(finalState) {
  if (REDUCED_MOTION) {
    game.state = finalState;
    render();
    if (isWon(game.state)) finishLevel();
    return;
  }
  const total = autoPlayAll(game.state).moves.length;
  const interval = Math.max(70, Math.min(160, Math.floor(3600 / Math.max(1, total))));
  game.cascading = true;
  dom.body.dataset.cascading = "true";
  const step = () => {
    const move = nextAutoMove(game.state);
    if (!move) {
      game.cascading = false;
      dom.body.dataset.cascading = "false";
      game.state = finalState;
      render();
      if (isWon(game.state)) celebrateThenFinish();
      return;
    }
    const card = move.from.type === "cell" ? game.state.cells[move.from.index] : game.state.columns[move.from.index].at(-1);
    const element = cardElements.get(card);
    element.classList.add("is-flying");
    setTimeout(() => element.classList.remove("is-flying"), 520);
    game.state = applyMove(game.state, move);
    render();
    setTimeout(step, interval);
  };
  step();
}

/** 通关时先让四个收牌堆依次弹一下,再弹出结算面板。 */
function celebrateThenFinish() {
  dom.body.classList.add("is-celebrating");
  setTimeout(() => {
    dom.body.classList.remove("is-celebrating");
    finishLevel();
  }, 1100);
}

function undo() {
  if (game.cascading) return;
  const previous = game.history.pop();
  if (!previous || game.won) return;
  game.state = previous.state;
  game.moves = previous.moves;
  game.selection = null;
  game.hint = null;
  setStatus("已撤销上一步。");
  render();
  saveSession();
}

function autoMoveFrom(from, count) {
  const move = findBestDestination(game.state, from, count);
  if (!move) {
    setStatus("这组牌现在没有可放的位置。");
    return false;
  }
  return performMove(move);
}

function isMovableRun(from, count) {
  if (from.type === "cell") return count === 1 && game.state.cells[from.index] !== null;
  const column = game.state.columns[from.index];
  return count >= 1 && count <= orderedRunLength(column);
}

function select(from, count) {
  if (game.cascading) return false;
  if (!isMovableRun(from, count)) {
    setStatus("只能拿起底部连续交替颜色、点数递减的牌组。");
    return false;
  }
  let capped = false;
  if (from.type === "column") {
    const limit = maxMovableCount(game.state, false);
    if (count > limit) { count = limit; capped = true; }
  }
  game.selection = { from, count };
  game.hint = null;
  const cards = selectedCards();
  if (capped) setStatus(`现在最多一次搬 ${count} 张，已拿起底部 ${count} 张；上面变灰的牌这次带不走。`);
  else setStatus(cards.length > 1 ? `已拿起 ${cards.length} 张牌(${cardName(cards[0])} 起),再点目标位置。` : `已拿起 ${cardName(cards[0])},点目标位置或再点一次自动放置。`);
  render();
  return true;
}

function clearSelection() {
  game.selection = null;
  render();
}

function locateCard(card) {
  const cellIndex = game.state.cells.indexOf(card);
  if (cellIndex >= 0) return { from: { type: "cell", index: cellIndex }, count: 1 };
  for (let column = 0; column < COLUMN_COUNT; column += 1) {
    const row = game.state.columns[column].indexOf(card);
    if (row >= 0) return { from: { type: "column", index: column }, count: game.state.columns[column].length - row };
  }
  return null;
}

function handleCardTap(card) {
  if (game.won) return;
  const location = locateCard(card);
  if (!location) return;
  if (!game.selection) {
    select(location.from, location.count);
    return;
  }
  const sameSource = game.selection.from.type === location.from.type && game.selection.from.index === location.from.index;
  if (sameSource) {
    if (game.selection.count === location.count) {
      autoMoveFrom(game.selection.from, game.selection.count);
    } else {
      select(location.from, location.count);
    }
    return;
  }
  const target = location.from.type === "cell" ? { type: "cell", index: location.from.index } : { type: "column", index: location.from.index };
  const move = { from: game.selection.from, to: target, count: game.selection.count };
  if (validateMove(game.state, move).ok) performMove(move);
  else select(location.from, location.count);
}

function handleSlotTap(slot) {
  if (game.won) return;
  if (!game.selection) {
    if (slot.type === "column" && game.state.columns[slot.index].length > 0) {
      select(slot, 1);
    } else if (slot.type === "cell" && game.state.cells[slot.index] !== null) {
      select(slot, 1);
    }
    return;
  }
  const move = { from: game.selection.from, to: slot, count: game.selection.count };
  performMove(move);
}

// ---------- 指针:点击与拖拽 ----------

const drag = { pointerId: null, card: null, startX: 0, startY: 0, offsetX: 0, offsetY: 0, cards: [], moving: false, origin: null, suppressClick: false };

function parseSlot(element) {
  const key = element?.dataset?.slot;
  if (!key) return null;
  const [type, index] = key.split("-");
  return { type, index: Number(index) };
}

function cardFromElement(element) {
  const label = element?.closest?.(".card")?.dataset.card;
  if (!label) return null;
  for (const [card, node] of cardElements) if (node.dataset.card === label) return card;
  return null;
}

dom.table.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.pointerType === "mouse") return;
  game.keyboardMode = false;
  const card = cardFromElement(event.target);
  if (card === null || game.won) return;
  const location = locateCard(card);
  if (!location) return;
  const movable = location.from.type === "cell" || location.count <= orderedRunLength(game.state.columns[location.from.index]);
  drag.pointerId = event.pointerId;
  drag.card = card;
  drag.startX = event.clientX;
  drag.startY = event.clientY;
  drag.moving = false;
  drag.origin = movable ? location : null;
  drag.cards = movable ? (location.from.type === "cell" ? [card] : game.state.columns[location.from.index].slice(-location.count)) : [];
  const rect = cardElements.get(card).getBoundingClientRect();
  drag.offsetX = event.clientX - rect.left;
  drag.offsetY = event.clientY - rect.top;
  dom.table.setPointerCapture?.(event.pointerId);
});

dom.table.addEventListener("pointermove", (event) => {
  if (drag.pointerId !== event.pointerId || drag.card === null) return;
  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.moving) {
    if (Math.hypot(dx, dy) < 6 || !drag.origin) return;
    drag.moving = true;
    dom.table.dataset.dragging = "true";
    game.selection = { from: drag.origin.from, count: drag.origin.count };
    game.hint = null;
    renderSlots();
    drag.cards.forEach((card) => cardElements.get(card).classList.add("is-dragging"));
  }
  const tableRect = dom.table.getBoundingClientRect();
  const offset = columnOffset(drag.cards.length + 1);
  drag.cards.forEach((card, index) => {
    const x = event.clientX - tableRect.left - 4 - drag.offsetX;
    const y = event.clientY - tableRect.top - 4 - drag.offsetY + index * offset;
    placeCard(cardElements.get(card), x, y, 200 + index);
  });
});

function dropTargetAt(clientX, clientY) {
  const dragged = drag.cards.map((card) => cardElements.get(card));
  dragged.forEach((element) => { element.style.visibility = "hidden"; });
  let element = document.elementFromPoint(clientX, clientY);
  dragged.forEach((node) => { node.style.visibility = ""; });
  const card = cardFromElement(element);
  if (card !== null) {
    const location = locateCard(card);
    if (location) return location.from.type === "cell" ? { type: "cell", index: location.from.index } : { type: "column", index: location.from.index };
  }
  const slot = parseSlot(element?.closest?.(".slot"));
  if (slot) return slot;
  // 落在列下方的空白处也算该列。
  const tableRect = dom.table.getBoundingClientRect();
  const x = clientX - tableRect.left - 4 - metrics.left;
  const column = Math.floor(x / (metrics.cardW + metrics.gap));
  if (column >= 0 && column < COLUMN_COUNT && clientY - tableRect.top - 4 >= metrics.columnsY) return { type: "column", index: column };
  return null;
}

function endDrag(event) {
  if (drag.pointerId !== event.pointerId || drag.card === null) return;
  const card = drag.card;
  const wasMoving = drag.moving;
  const origin = drag.origin;
  const draggedCards = drag.cards;
  drag.pointerId = null;
  drag.card = null;
  drag.moving = false;
  // 指针捕获会让随后的 click 落在牌桌上,这里吞掉它,避免刚选中的牌被当成“点空白取消”。
  drag.suppressClick = true;
  dom.table.dataset.dragging = "false";
  draggedCards.forEach((item) => cardElements.get(item).classList.remove("is-dragging"));
  if (event.type === "pointercancel") {
    game.selection = null;
    render();
    return;
  }
  if (!wasMoving) {
    handleCardTap(card);
    return;
  }
  const target = dropTargetAt(event.clientX, event.clientY);
  const move = target ? { from: origin.from, to: target, count: origin.count } : null;
  if (move && validateMove(game.state, move).ok) {
    performMove(move);
  } else {
    if (move && !(target.type === origin.from.type && target.index === origin.from.index)) rejectMove(move, validateMove(game.state, move));
    game.selection = null;
    render();
  }
}

dom.table.addEventListener("pointerup", endDrag);
dom.table.addEventListener("pointercancel", endDrag);

dom.table.addEventListener("click", (event) => {
  if (drag.suppressClick) {
    drag.suppressClick = false;
    return;
  }
  if (cardFromElement(event.target) !== null) return;
  const slot = parseSlot(event.target.closest?.(".slot"));
  if (slot) handleSlotTap(slot);
  else if (game.selection) clearSelection();
});

// ---------- 键盘 ----------

function cursorSlot() {
  const { row, index } = game.cursor;
  if (row === 0) return index < CELL_COUNT ? { type: "cell", index } : { type: "foundation", index: index - CELL_COUNT };
  return { type: "column", index };
}

function moveCursor(dx, dy) {
  game.cursor.row = Math.max(0, Math.min(1, game.cursor.row + dy));
  game.cursor.index = (game.cursor.index + dx + 8) % 8;
  renderSlots();
  const slot = cursorSlot();
  const description = slot.type === "cell"
    ? `空档 ${slot.index + 1}:${game.state.cells[slot.index] === null ? "空" : cardName(game.state.cells[slot.index])}`
    : slot.type === "foundation"
      ? `收牌堆 ${slot.index + 1}:已收 ${game.state.foundations[slot.index]} 张`
      : `第 ${slot.index + 1} 列:${game.state.columns[slot.index].length ? `底牌 ${cardName(game.state.columns[slot.index].at(-1))}` : "空列"}`;
  setStatus(description);
}

function keyboardSelect() {
  const slot = cursorSlot();
  if (slot.type === "foundation") return;
  const sameSource = game.selection && game.selection.from.type === slot.type && game.selection.from.index === slot.index;
  if (sameSource && slot.type === "column") {
    const run = orderedRunLength(game.state.columns[slot.index]);
    const next = game.selection.count >= run ? 1 : game.selection.count + 1;
    select(slot, next);
    return;
  }
  if (sameSource) {
    clearSelection();
    return;
  }
  handleSlotTap(slot);
}

function keyboardConfirm() {
  const slot = cursorSlot();
  if (!game.selection) {
    if (slot.type !== "foundation" && (slot.type === "cell" ? game.state.cells[slot.index] !== null : game.state.columns[slot.index].length > 0)) {
      autoMoveFrom(slot, 1);
    }
    return;
  }
  const sameSource = game.selection.from.type === slot.type && game.selection.from.index === slot.index;
  if (sameSource) autoMoveFrom(game.selection.from, game.selection.count);
  else handleSlotTap(slot);
}

document.addEventListener("keydown", (event) => {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  const inDialog = document.querySelector("dialog[open]");
  if (inDialog || /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
  const key = event.key;
  if (/^(Arrow(Left|Right|Up|Down)| |Enter|[1-8])$/.test(key)) game.keyboardMode = true;
  if (key === "ArrowLeft") { moveCursor(-1, 0); dom.table.focus(); event.preventDefault(); return; }
  if (key === "ArrowRight") { moveCursor(1, 0); dom.table.focus(); event.preventDefault(); return; }
  if (key === "ArrowUp") { moveCursor(0, -1); dom.table.focus(); event.preventDefault(); return; }
  if (key === "ArrowDown") { moveCursor(0, 1); dom.table.focus(); event.preventDefault(); return; }
  if (key === " " ) { dom.table.focus(); keyboardSelect(); event.preventDefault(); return; }
  if (key === "Enter") { dom.table.focus(); keyboardConfirm(); event.preventDefault(); return; }
  if (key === "Escape") { clearSelection(); return; }
  if (/^[1-8]$/.test(key)) { game.cursor = { row: 1, index: Number(key) - 1 }; dom.table.focus(); renderSlots(); keyboardSelect(); return; }
  if (key === "u" || key === "U") { undo(); return; }
  if (key === "h" || key === "H") { showHint(); return; }
  if (key === "r" || key === "R") { restartLevel(); return; }
  if ((key === "n" || key === "N") && game.won) { goNextLevel(); }
});

dom.table.addEventListener("focus", renderSlots);
dom.table.addEventListener("blur", renderSlots);

// ---------- 提示 ----------

function showHint() {
  if (game.won) return;
  const result = solve(game.state, { maxNodes: 40_000 });
  const move = result.moves[0]?.move;
  if (!move) {
    setStatus(result.solved ? "剩下的牌会自动收完。" : "暂时算不出路线,试试撤销几步。");
    return;
  }
  const verdict = validateMove(game.state, move);
  game.hint = { move, cards: verdict.cards ?? [] };
  const target = move.to.type === "foundation" ? "收牌堆" : move.to.type === "cell" ? `空档 ${move.to.index + 1}` : `第 ${move.to.index + 1} 列`;
  setStatus(`提示:把 ${verdict.cards.map(cardName).join("、")} 移到${target}。`);
  render();
}

// ---------- 关卡与结算 ----------

function finishLevel() {
  game.won = true;
  game.elapsedBefore = elapsedMs();
  game.startedAt = null;
  const seconds = Math.round(game.elapsedBefore / 1000);
  const key = String(game.level);
  const previous = progress.results[key];
  const best = previous ? Math.min(previous.bestMoves, game.moves) : game.moves;
  progress.results[key] = {
    moves: game.moves,
    seconds,
    bestMoves: best,
    bestSeconds: previous ? Math.min(previous.bestSeconds, seconds) : seconds,
    completedAt: new Date().toISOString(),
  };
  if (game.level >= progress.unlocked && game.level < LEVEL_COUNT) progress.unlocked = game.level + 1;
  writeJson(PROGRESS_KEY, progress);
  writeJson(SESSION_KEY, { level: game.level, won: true });
  dom.body.dataset.gameState = "won";
  dom.winLevel.textContent = String(game.level);
  dom.winMoves.textContent = String(game.moves);
  dom.winTime.textContent = formatTime(game.elapsedBefore);
  dom.winBest.textContent = String(best);
  dom.nextLevel.hidden = game.level >= LEVEL_COUNT;
  renderMeta();
  setStatus(`第 ${game.level} 关完成!${game.moves} 步,用时 ${formatTime(game.elapsedBefore)}。`);
  for (const [, element] of cardElements) element.classList.remove("is-selected", "is-hint");
  if (!dom.winDialog.open) dom.winDialog.showModal();
}

function goNextLevel() {
  dom.winDialog.close();
  startLevel(Math.min(LEVEL_COUNT, game.level + 1));
}

function restartLevel() {
  if (dom.winDialog.open) dom.winDialog.close();
  startLevel(game.level);
}

function renderLevelGrid() {
  dom.levelGrid.textContent = "";
  for (let level = 1; level <= LEVEL_COUNT; level += 1) {
    const button = document.createElement("button");
    const result = progress.results[String(level)];
    button.type = "button";
    button.className = `level${result ? " is-done" : ""}${level === game.level ? " is-current" : ""}`;
    button.dataset.level = String(level);
    button.setAttribute("role", "listitem");
    button.disabled = level > progress.unlocked;
    button.innerHTML = `<span>${level}</span><small>${result ? `${result.bestMoves} 步` : level > progress.unlocked ? "未解锁" : "可玩"}</small>`;
    button.setAttribute("aria-label", `第 ${level} 关${result ? `,最佳 ${result.bestMoves} 步` : level > progress.unlocked ? ",未解锁" : ""}`);
    button.addEventListener("click", () => {
      dom.levelDialog.close();
      startLevel(level);
    });
    dom.levelGrid.append(button);
  }
}

// ---------- 牌背 ----------

function applyCardBack(dataUrl) {
  const url = dataUrl || DEFAULT_CARD_BACK;
  document.documentElement.style.setProperty("--card-back", `url("${url}")`);
  dom.deckPreview.src = url;
  for (const image of document.querySelectorAll(".win-card")) image.src = url;
  dom.body.dataset.cardBack = dataUrl ? "custom" : "default";
}

function loadCardBack() {
  try {
    const stored = localStorage.getItem(CARD_BACK_KEY);
    applyCardBack(stored && stored.startsWith("data:image/") ? stored : null);
  } catch {
    applyCardBack(null);
  }
}

const backEditor = { image: null, zoom: 1, offsetX: 0, offsetY: 0 };

function drawBackPreview(context, width, height) {
  context.clearRect(0, 0, width, height);
  const image = backEditor.image;
  if (!image) {
    const fallback = new Image();
    fallback.src = dom.deckPreview.src;
    if (fallback.complete) context.drawImage(fallback, 0, 0, width, height);
    return;
  }
  // 先按“覆盖”比例填满 5:7 画布,再叠加缩放与平移。
  const cover = Math.max(width / image.naturalWidth, height / image.naturalHeight) * backEditor.zoom;
  const drawWidth = image.naturalWidth * cover;
  const drawHeight = image.naturalHeight * cover;
  const maxShiftX = Math.max(0, (drawWidth - width) / 2);
  const maxShiftY = Math.max(0, (drawHeight - height) / 2);
  const x = (width - drawWidth) / 2 - backEditor.offsetX * maxShiftX;
  const y = (height - drawHeight) / 2 - backEditor.offsetY * maxShiftY;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, x, y, drawWidth, drawHeight);
}

function refreshBackPreview() {
  const context = dom.backCanvas.getContext("2d");
  drawBackPreview(context, dom.backCanvas.width, dom.backCanvas.height);
}

function openBackDialog() {
  backEditor.image = null;
  backEditor.zoom = 1;
  backEditor.offsetX = 0;
  backEditor.offsetY = 0;
  dom.backZoom.value = "1";
  dom.backOffsetX.value = "0";
  dom.backOffsetY.value = "0";
  for (const input of [dom.backZoom, dom.backOffsetX, dom.backOffsetY]) input.disabled = true;
  dom.applyBack.disabled = true;
  dom.backStatus.textContent = dom.body.dataset.cardBack === "custom" ? "当前使用自定义牌背。" : "当前使用默认牌背。";
  dom.backFile.value = "";
  const preview = new Image();
  preview.onload = () => {
    const context = dom.backCanvas.getContext("2d");
    context.clearRect(0, 0, dom.backCanvas.width, dom.backCanvas.height);
    context.drawImage(preview, 0, 0, dom.backCanvas.width, dom.backCanvas.height);
  };
  preview.src = dom.deckPreview.src;
  dom.backDialog.showModal();
}

/** 把选中的本机图片解码到内存;不上传、不写入网络。 */
async function loadBackFile(file) {
  if (!file || !file.type.startsWith("image/")) {
    dom.backStatus.textContent = "请选择一张图片文件。";
    return;
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("图片无法解码。"));
      image.src = url;
    });
    backEditor.image = image;
    backEditor.zoom = 1;
    backEditor.offsetX = 0;
    backEditor.offsetY = 0;
    dom.backZoom.value = "1";
    dom.backOffsetX.value = "0";
    dom.backOffsetY.value = "0";
    for (const input of [dom.backZoom, dom.backOffsetX, dom.backOffsetY]) input.disabled = false;
    dom.applyBack.disabled = false;
    dom.backStatus.textContent = `${image.naturalWidth}×${image.naturalHeight},拖动滑块调整取景后点“使用这张图片”。`;
    refreshBackPreview();
  } catch (error) {
    dom.backStatus.textContent = error instanceof Error ? error.message : "图片无法读取。";
  } finally {
    URL.revokeObjectURL(url);
  }
}

function exportCardBack() {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_BACK_WIDTH;
  canvas.height = CARD_BACK_HEIGHT;
  const context = canvas.getContext("2d");
  context.fillStyle = "#2b3a67";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawBackPreview(context, canvas.width, canvas.height);
  // JPEG 体积可控(约 60–150KB),避免撑爆 localStorage;牌背不需要透明通道。
  return canvas.toDataURL("image/jpeg", 0.86);
}

function saveCardBack() {
  if (!backEditor.image) return;
  const dataUrl = exportCardBack();
  try {
    localStorage.setItem(CARD_BACK_KEY, dataUrl);
  } catch {
    dom.backStatus.textContent = "浏览器存储空间不足,牌背只在本次会话生效。";
  }
  applyCardBack(dataUrl);
  dom.backStatus.textContent = "已更换牌背,刷新后仍然有效。";
  setStatus("牌背已更换。");
  dom.backDialog.close();
}

function resetCardBack() {
  try {
    localStorage.removeItem(CARD_BACK_KEY);
  } catch {
    /* ignore */
  }
  applyCardBack(null);
  backEditor.image = null;
  dom.applyBack.disabled = true;
  for (const input of [dom.backZoom, dom.backOffsetX, dom.backOffsetY]) input.disabled = true;
  dom.backStatus.textContent = "已恢复默认牌背。";
  setStatus("已恢复默认牌背。");
  const preview = new Image();
  preview.onload = () => {
    const context = dom.backCanvas.getContext("2d");
    context.clearRect(0, 0, dom.backCanvas.width, dom.backCanvas.height);
    context.drawImage(preview, 0, 0, dom.backCanvas.width, dom.backCanvas.height);
  };
  preview.src = DEFAULT_CARD_BACK;
}

// ---------- 发牌动画 ----------

function dealAnimation() {
  computeMetrics();
  const deckX = metrics.left + (metrics.cardW + metrics.gap) * 3.5;
  const deckY = metrics.topRowY;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  for (let card = 0; card < 52; card += 1) {
    const element = cardElements.get(card);
    element.hidden = false;
    element.classList.remove("is-dealing", "is-selected", "is-hint");
    element.classList.add("is-facedown");
    element.style.transition = "none";
    placeCard(element, deckX, deckY, 100 + card);
  }
  // 强制回流,让起始位置生效后再开启过渡。
  void dom.cards.offsetWidth;
  const order = [];
  for (let row = 0; row < 7; row += 1) {
    for (let column = 0; column < COLUMN_COUNT; column += 1) {
      const card = game.state.columns[column][row];
      if (card !== undefined) order.push(card);
    }
  }
  order.forEach((card, index) => {
    const element = cardElements.get(card);
    element.style.transition = "";
    if (reduced) {
      element.classList.remove("is-facedown");
      return;
    }
    element.classList.add("is-dealing");
    setTimeout(() => {
      element.classList.remove("is-facedown");
      const position = cardPosition(game.state, card);
      if (position) placeCard(element, position.x, position.y, position.z);
    }, 16 + index * 14);
    setTimeout(() => element.classList.remove("is-dealing"), 700 + index * 14);
  });
  dom.body.dataset.dealing = "true";
  setTimeout(() => {
    dom.body.dataset.dealing = "false";
    render();
  }, reduced ? 0 : 760 + order.length * 14);
  renderSlots();
  renderMeta();
}

// ---------- 事件绑定 ----------

dom.undo.addEventListener("click", undo);
dom.hint.addEventListener("click", showHint);
dom.restart.addEventListener("click", restartLevel);
dom.openLevels.addEventListener("click", () => {
  renderLevelGrid();
  dom.levelDialog.showModal();
});
dom.closeLevels.addEventListener("click", () => dom.levelDialog.close());
dom.openBack.addEventListener("click", openBackDialog);
dom.openBackDialog.addEventListener("click", openBackDialog);
dom.closeBack.addEventListener("click", () => dom.backDialog.close());
dom.backFile.addEventListener("change", () => loadBackFile(dom.backFile.files?.[0]));
dom.backZoom.addEventListener("input", () => { backEditor.zoom = Number(dom.backZoom.value); refreshBackPreview(); });
dom.backOffsetX.addEventListener("input", () => { backEditor.offsetX = Number(dom.backOffsetX.value); refreshBackPreview(); });
dom.backOffsetY.addEventListener("input", () => { backEditor.offsetY = Number(dom.backOffsetY.value); refreshBackPreview(); });
dom.applyBack.addEventListener("click", saveCardBack);
dom.resetBack.addEventListener("click", resetCardBack);
dom.nextLevel.addEventListener("click", goNextLevel);
dom.replayLevel.addEventListener("click", restartLevel);
for (const dialog of [dom.winDialog, dom.levelDialog, dom.backDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
}

window.addEventListener("resize", () => render());
setInterval(() => {
  if (game.startedAt && !game.won) dom.timer.textContent = formatTime(elapsedMs());
}, 500);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) saveSession();
});

dom.stuckUndo.addEventListener("click", () => undo());
dom.stuckRestart.addEventListener("click", () => restartLevel());

// ---------- 启动 ----------

dom.body.dataset.cascading = "false";
loadCardBack();
if (restoreSession()) {
  dom.body.dataset.gameState = "playing";
  setStatus(`已恢复第 ${game.level} 关的进度。`);
  render();
} else {
  const session = readJson(SESSION_KEY, null);
  const resumeLevel = session?.won && Number.isInteger(session.level) ? Math.min(progress.unlocked, session.level + 1) : progress.unlocked;
  startLevel(Math.max(1, Math.min(LEVEL_COUNT, resumeLevel)), { deal: true });
}

// 测试与调试钩子:只读状态、按规则执行移动、求解当前局面。不暴露任何跳过规则的捷径。
window.__freecell = {
  getState: () => JSON.parse(JSON.stringify(game.state)),
  getMeta: () => ({ level: game.level, moves: game.moves, won: game.won, unlocked: progress.unlocked, historyLength: game.history.length }),
  validateMove: (move) => validateMove(game.state, move),
  solve: (options) => solve(game.state, options),
  cardLabel,
};
