// 《空档接龙》纯规则模块:发牌、合法性、超级移动、自动收牌、求解器。
// 不依赖 DOM,浏览器 app.js 与 Node 测试共用同一份实现。
//
// 牌编码沿用 Microsoft FreeCell 顺序:card = rank * 4 + suit,
// rank 0..12 = A..K,suit 0..3 = 梅花 C、方块 D、红心 H、黑桃 S。

export const SUITS = ["club", "diamond", "heart", "spade"];
export const SUIT_LETTERS = ["C", "D", "H", "S"];
export const RANK_LABELS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
export const COLUMN_COUNT = 8;
export const CELL_COUNT = 4;
export const LEVEL_COUNT = 100;

export function rankOf(card) {
  return Math.floor(card / 4);
}

export function suitOf(card) {
  return card % 4;
}

export function isRed(card) {
  const suit = suitOf(card);
  return suit === 1 || suit === 2;
}

export function cardLabel(card) {
  return `${RANK_LABELS[rankOf(card)]}${SUIT_LETTERS[suitOf(card)]}`;
}

export function cardName(card) {
  const suitNames = ["梅花", "方块", "红心", "黑桃"];
  return `${suitNames[suitOf(card)]}${RANK_LABELS[rankOf(card)]}`;
}

/**
 * 经典 Microsoft FreeCell 发牌算法(seed = seed * 214013 + 2531011,取高 15 位)。
 * 返回 8 列,牌从左到右、从上到下逐张发出。第 1–100 局均为已知可解牌局。
 */
export function dealMicrosoft(gameNumber) {
  if (!Number.isInteger(gameNumber) || gameNumber < 1) throw new Error("牌局编号必须是正整数。");
  const deck = Array.from({ length: 52 }, (_, index) => index);
  const columns = Array.from({ length: COLUMN_COUNT }, () => []);
  let seed = gameNumber >>> 0;
  for (let dealt = 0; dealt < 52; dealt += 1) {
    seed = (Math.imul(seed, 214013) + 2531011) >>> 0;
    const random = (seed >>> 16) & 0x7fff;
    const remaining = 52 - dealt;
    const pick = random % remaining;
    const card = deck[pick];
    deck[pick] = deck[remaining - 1];
    columns[dealt % COLUMN_COUNT].push(card);
  }
  return columns;
}

export function createState(gameNumber) {
  return {
    gameNumber,
    columns: dealMicrosoft(gameNumber),
    cells: Array(CELL_COUNT).fill(null),
    foundations: [0, 0, 0, 0],
  };
}

export function cloneState(state) {
  return {
    gameNumber: state.gameNumber,
    columns: state.columns.map((column) => column.slice()),
    cells: state.cells.slice(),
    foundations: state.foundations.slice(),
  };
}

export function isWon(state) {
  return state.foundations.every((count) => count === 13);
}

export function emptyCellCount(state) {
  return state.cells.filter((card) => card === null).length;
}

export function emptyColumnCount(state) {
  return state.columns.filter((column) => column.length === 0).length;
}

/** 两张牌能否按“交替颜色、点数递减 1”叠放。 */
export function stacksOn(upper, lower) {
  return rankOf(upper) + 1 === rankOf(lower) && isRed(upper) !== isRed(lower);
}

/** 某列底部可整体移动的有序牌组长度。 */
export function orderedRunLength(column) {
  if (column.length === 0) return 0;
  let length = 1;
  for (let index = column.length - 1; index > 0; index -= 1) {
    if (!stacksOn(column[index], column[index - 1])) break;
    length += 1;
  }
  return length;
}

/** 超级移动上限:(空档数 + 1) × 2^(空列数);目标本身是空列时不计入该空列。 */
export function maxMovableCount(state, targetIsEmptyColumn) {
  const emptyColumns = emptyColumnCount(state) - (targetIsEmptyColumn ? 1 : 0);
  return (emptyCellCount(state) + 1) * 2 ** Math.max(0, emptyColumns);
}

export function canPlaceOnFoundation(state, card) {
  return state.foundations[suitOf(card)] === rankOf(card);
}

function sourceCards(state, from, count) {
  if (from.type === "cell") {
    const card = state.cells[from.index];
    return card === null || count !== 1 ? null : [card];
  }
  const column = state.columns[from.index];
  if (!column || count < 1 || count > column.length) return null;
  if (count > orderedRunLength(column)) return null;
  return column.slice(column.length - count);
}

/**
 * 判定一次移动是否合法。move = { from: {type:"column"|"cell", index}, to: {type:"column"|"cell"|"foundation", index}, count }
 * 返回 { ok, reason, cards }。
 */
export function validateMove(state, move) {
  const count = move.count ?? 1;
  if (move.from.type === move.to.type && move.from.index === move.to.index) return { ok: false, reason: "起点与终点相同。" };
  const cards = sourceCards(state, move.from, count);
  if (!cards) return { ok: false, reason: "这些牌不是可移动的有序牌组。" };
  if (move.to.type === "foundation") {
    if (cards.length !== 1) return { ok: false, reason: "收牌堆一次只能收一张。" };
    if (!canPlaceOnFoundation(state, cards[0])) return { ok: false, reason: "收牌堆必须按同花色从 A 到 K 依次收牌。" };
    if (move.to.index !== undefined && move.to.index !== suitOf(cards[0])) return { ok: false, reason: "花色不匹配。" };
    return { ok: true, cards };
  }
  if (move.to.type === "cell") {
    if (cards.length !== 1) return { ok: false, reason: "空档一次只能放一张。" };
    if (state.cells[move.to.index] !== null) return { ok: false, reason: "这个空档已被占用。" };
    return { ok: true, cards };
  }
  const target = state.columns[move.to.index];
  if (!target) return { ok: false, reason: "目标列不存在。" };
  const limit = maxMovableCount(state, target.length === 0);
  if (cards.length > limit) return { ok: false, reason: `当前空档与空列只允许一次移动 ${limit} 张。` };
  if (target.length > 0 && !stacksOn(cards[0], target[target.length - 1])) return { ok: false, reason: "只能放到颜色相反、点数大 1 的牌上。" };
  return { ok: true, cards };
}

export function applyMove(state, move) {
  const verdict = validateMove(state, move);
  if (!verdict.ok) throw new Error(verdict.reason);
  const next = cloneState(state);
  const cards = verdict.cards;
  if (move.from.type === "cell") next.cells[move.from.index] = null;
  else next.columns[move.from.index].splice(next.columns[move.from.index].length - cards.length, cards.length);
  if (move.to.type === "foundation") next.foundations[suitOf(cards[0])] += 1;
  else if (move.to.type === "cell") next.cells[move.to.index] = cards[0];
  else next.columns[move.to.index].push(...cards);
  return next;
}

/**
 * 安全自动收牌:A、2 总是安全;点数为 r 的牌只在两种相反颜色的 r-1 都已进收牌堆
 * (即相反颜色收牌堆张数 ≥ r-1,对应 rank 索引 ≥ rankOf(card))时自动收,避免收走别人还需要的底牌。
 */
export function isSafeToFoundation(state, card) {
  if (!canPlaceOnFoundation(state, card)) return false;
  const rank = rankOf(card);
  if (rank <= 1) return true;
  const opposite = isRed(card) ? [0, 3] : [1, 2];
  return opposite.every((suit) => state.foundations[suit] >= rank);
}

/** 找出下一张可以安全自动收牌的牌,返回 move 或 null。 */
export function nextAutoMove(state) {
  for (let index = 0; index < CELL_COUNT; index += 1) {
    const card = state.cells[index];
    if (card !== null && isSafeToFoundation(state, card)) {
      return { from: { type: "cell", index }, to: { type: "foundation", index: suitOf(card) }, count: 1 };
    }
  }
  for (let index = 0; index < COLUMN_COUNT; index += 1) {
    const column = state.columns[index];
    if (column.length === 0) continue;
    const card = column[column.length - 1];
    if (isSafeToFoundation(state, card)) {
      return { from: { type: "column", index }, to: { type: "foundation", index: suitOf(card) }, count: 1 };
    }
  }
  return null;
}

export function autoPlayAll(state) {
  const moves = [];
  let current = state;
  let move = nextAutoMove(current);
  while (move) {
    current = applyMove(current, move);
    moves.push(move);
    move = nextAutoMove(current);
  }
  return { state: current, moves };
}

/** 点击/键盘的“自动放置”:按 收牌堆 → 非空列 → 空档 → 空列 的顺序为一组牌挑目标。 */
export function findBestDestination(state, from, count = 1) {
  const cards = sourceCards(state, from, count);
  if (!cards) return null;
  const tryMove = (to) => (validateMove(state, { from, to, count }).ok ? { from, to, count } : null);
  if (count === 1) {
    const toFoundation = tryMove({ type: "foundation", index: suitOf(cards[0]) });
    if (toFoundation) return toFoundation;
  }
  for (let index = 0; index < COLUMN_COUNT; index += 1) {
    if (state.columns[index].length === 0) continue;
    const move = tryMove({ type: "column", index });
    if (move) return move;
  }
  if (count === 1 && from.type === "column") {
    for (let index = 0; index < CELL_COUNT; index += 1) {
      const move = tryMove({ type: "cell", index });
      if (move) return move;
    }
  }
  for (let index = 0; index < COLUMN_COUNT; index += 1) {
    if (state.columns[index].length !== 0) continue;
    // 整列搬到另一空列没有意义。
    if (from.type === "column" && count === state.columns[from.index].length) continue;
    const move = tryMove({ type: "column", index });
    if (move) return move;
  }
  return null;
}

/** 枚举所有合法移动(供提示与求解器)。 */
export function legalMoves(state) {
  const moves = [];
  const sources = [];
  for (let index = 0; index < CELL_COUNT; index += 1) if (state.cells[index] !== null) sources.push({ type: "cell", index, runLength: 1 });
  for (let index = 0; index < COLUMN_COUNT; index += 1) if (state.columns[index].length > 0) sources.push({ type: "column", index, runLength: orderedRunLength(state.columns[index]) });
  for (const source of sources) {
    const from = { type: source.type, index: source.index };
    const top = source.type === "cell" ? state.cells[source.index] : state.columns[source.index].at(-1);
    if (canPlaceOnFoundation(state, top)) moves.push({ from, to: { type: "foundation", index: suitOf(top) }, count: 1 });
    for (let count = 1; count <= source.runLength; count += 1) {
      for (let target = 0; target < COLUMN_COUNT; target += 1) {
        if (source.type === "column" && target === source.index) continue;
        const targetColumn = state.columns[target];
        // 整列搬进另一空列不会改变局面,直接跳过。
        if (targetColumn.length === 0 && source.type === "column" && count === state.columns[source.index].length) continue;
        const move = { from, to: { type: "column", index: target }, count };
        if (validateMove(state, move).ok) moves.push(move);
      }
      if (count === 1 && source.type === "column") {
        const cell = state.cells.indexOf(null);
        if (cell >= 0) moves.push({ from, to: { type: "cell", index: cell }, count: 1 });
      }
    }
  }
  return dedupeEmptyTargets(moves, state);
}

// 多个空列彼此等价,只保留最左侧一个目标,减少求解器分支。
function dedupeEmptyTargets(moves, state) {
  const firstEmpty = state.columns.findIndex((column) => column.length === 0);
  return moves.filter((move) => move.to.type !== "column" || state.columns[move.to.index].length > 0 || move.to.index === firstEmpty);
}

export function stateKey(state) {
  const columns = state.columns.map((column) => column.join(",")).sort();
  const cells = state.cells.filter((card) => card !== null).sort((left, right) => left - right);
  return `${columns.join("|")}#${cells.join(",")}#${state.foundations.join(",")}`;
}

function heuristic(state) {
  let score = 52 - state.foundations.reduce((sum, count) => sum + count, 0);
  // 压在小牌上面的牌越多越糟。
  for (const column of state.columns) {
    let minRank = 99;
    for (const card of column) {
      const rank = rankOf(card);
      if (rank < minRank) minRank = rank;
      else score += 1;
    }
  }
  score += (CELL_COUNT - emptyCellCount(state)) * 1;
  return score;
}

/**
 * 有界最佳优先求解器。返回 { solved, moves, nodes } ;超过 maxNodes 返回 solved=false。
 * 用于校验 100 个牌局可解以及提供提示。
 */
export function solve(initialState, options = {}) {
  const maxNodes = options.maxNodes ?? 200_000;
  const start = autoPlayAll(initialState);
  const open = new BinaryHeap((left, right) => left.priority - right.priority);
  const seen = new Map();
  const startKey = stateKey(start.state);
  const startNode = { state: start.state, parent: null, move: null, autoMoves: start.moves, depth: 0, priority: heuristic(start.state) };
  open.push(startNode);
  seen.set(startKey, 0);
  let nodes = 0;
  while (open.size() > 0 && nodes < maxNodes) {
    const node = open.pop();
    nodes += 1;
    if (isWon(node.state)) {
      const path = [];
      let cursor = node;
      while (cursor) {
        if (cursor.move) path.unshift({ move: cursor.move, autoMoves: cursor.autoMoves });
        cursor = cursor.parent;
      }
      return { solved: true, moves: path, nodes, initialAutoMoves: start.moves };
    }
    for (const move of legalMoves(node.state)) {
      const applied = autoPlayAll(applyMove(node.state, move));
      const key = stateKey(applied.state);
      const depth = node.depth + 1;
      const known = seen.get(key);
      if (known !== undefined && known <= depth) continue;
      seen.set(key, depth);
      open.push({ state: applied.state, parent: node, move, autoMoves: applied.moves, depth, priority: heuristic(applied.state) * 4 + depth * 0.5 });
    }
  }
  return { solved: false, moves: [], nodes, initialAutoMoves: start.moves };
}

class BinaryHeap {
  constructor(compare) {
    this.compare = compare;
    this.items = [];
  }

  size() {
    return this.items.length;
  }

  push(item) {
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.compare(items[index], items[parent]) >= 0) break;
      [items[index], items[parent]] = [items[parent], items[index]];
      index = parent;
    }
  }

  pop() {
    const items = this.items;
    const top = items[0];
    const last = items.pop();
    if (items.length > 0) {
      items[0] = last;
      let index = 0;
      for (;;) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < items.length && this.compare(items[left], items[smallest]) < 0) smallest = left;
        if (right < items.length && this.compare(items[right], items[smallest]) < 0) smallest = right;
        if (smallest === index) break;
        [items[index], items[smallest]] = [items[smallest], items[index]];
        index = smallest;
      }
    }
    return top;
  }
}

/** 把一局牌面打印成 Microsoft 风格的行文本(测试与文档用)。 */
export function formatDeal(columns) {
  const rows = [];
  const depth = Math.max(...columns.map((column) => column.length));
  for (let row = 0; row < depth; row += 1) {
    rows.push(columns.map((column) => (column[row] === undefined ? "  " : cardLabel(column[row]).padStart(2, " "))).join(" "));
  }
  return rows.join("\n");
}
