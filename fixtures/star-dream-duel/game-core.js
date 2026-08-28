export const ROWS = 8;
export const COLS = 8;
export const MIN_STARTING_SCORE = 100;
export const MAX_STARTING_SCORE = 1000;
export const SCORE_STEP = 100;
export const STARTING_SCORE = MIN_STARTING_SCORE;
export const TILE_TYPES = ['moon', 'cloud', 'star', 'flower', 'heart', 'drop'];

export function createSeededRng(seed = Date.now()) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function normalizeStartingScore(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return MIN_STARTING_SCORE;
  const steppedValue = MIN_STARTING_SCORE
    + Math.round((numericValue - MIN_STARTING_SCORE) / SCORE_STEP) * SCORE_STEP;
  return Math.min(MAX_STARTING_SCORE, Math.max(MIN_STARTING_SCORE, steppedValue));
}

export function cloneBoard(board) {
  return board.map((row) => [...row]);
}

export function isAdjacent(first, second) {
  return Math.abs(first.row - second.row) + Math.abs(first.col - second.col) === 1;
}

export function belongsToOwner(position, owner) {
  return owner === 'ai' ? position.row < ROWS / 2 : position.row >= ROWS / 2;
}

export function canOwnerSwap(first, second, owner) {
  return isAdjacent(first, second) && belongsToOwner(first, owner) && belongsToOwner(second, owner);
}

export function swapTiles(board, first, second) {
  const next = cloneBoard(board);
  [next[first.row][first.col], next[second.row][second.col]] = [
    next[second.row][second.col],
    next[first.row][first.col]
  ];
  return next;
}

export function findMatchGroups(board) {
  const groups = [];

  for (let row = 0; row < ROWS; row += 1) {
    let start = 0;
    for (let col = 1; col <= COLS; col += 1) {
      const same = col < COLS && board[row][col] && board[row][col] === board[row][start];
      if (same) continue;
      if (board[row][start] && col - start >= 3) {
        groups.push({
          axis: 'horizontal',
          positions: Array.from({ length: col - start }, (_, index) => ({ row, col: start + index }))
        });
      }
      start = col;
    }
  }

  for (let col = 0; col < COLS; col += 1) {
    let start = 0;
    for (let row = 1; row <= ROWS; row += 1) {
      const same = row < ROWS && board[row][col] && board[row][col] === board[start][col];
      if (same) continue;
      if (board[start]?.[col] && row - start >= 3) {
        groups.push({
          axis: 'vertical',
          positions: Array.from({ length: row - start }, (_, index) => ({ row: start + index, col }))
        });
      }
      start = row;
    }
  }

  return groups;
}

export function findMatches(board) {
  const matched = new Map();
  for (const group of findMatchGroups(board)) {
    for (const position of group.positions) {
      matched.set(`${position.row}:${position.col}`, position);
    }
  }
  return [...matched.values()];
}

export function findValidMoves(board, owner) {
  const moves = [];
  const startRow = owner === 'ai' ? 0 : ROWS / 2;
  const endRow = owner === 'ai' ? ROWS / 2 : ROWS;

  for (let row = startRow; row < endRow; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const first = { row, col };
      const candidates = [{ row, col: col + 1 }, { row: row + 1, col }];
      for (const second of candidates) {
        if (second.col >= COLS || second.row >= endRow || !canOwnerSwap(first, second, owner)) continue;
        const swapped = swapTiles(board, first, second);
        const groups = findMatchGroups(swapped);
        if (groups.length > 0) {
          const matchCount = new Set(groups.flatMap((group) => group.positions.map(({ row, col }) => `${row}:${col}`))).size;
          moves.push({ first, second, matchCount, score: calculateMatchScore(groups) });
        }
      }
    }
  }

  return moves;
}

export function chooseAiMove(board, rng = Math.random) {
  const moves = findValidMoves(board, 'ai');
  if (!moves.length) return null;
  const bestScore = Math.max(...moves.map((move) => move.score));
  const bestMoves = moves.filter((move) => move.score === bestScore);
  return bestMoves[Math.floor(rng() * bestMoves.length)];
}

export function calculateGroupScore(tileCount) {
  return tileCount < 3 ? 0 : 5 * (2 ** (tileCount - 3));
}

export function calculateMatchScore(groups) {
  return groups.reduce((total, group) => total + calculateGroupScore(group.positions.length), 0);
}

export function applyAttack(scores, actor, damage) {
  if (actor === 'player') {
    return {
      ...scores,
      aiScore: Math.max(0, scores.aiScore - damage),
      playerDamage: scores.playerDamage + damage
    };
  }
  return {
    ...scores,
    playerScore: Math.max(0, scores.playerScore - damage),
    aiDamage: scores.aiDamage + damage
  };
}

export function removeAndCollapse(board, matches, rng = Math.random) {
  const next = cloneBoard(board);
  for (const { row, col } of matches) next[row][col] = null;

  for (let col = 0; col < COLS; col += 1) {
    const remaining = [];
    for (let row = ROWS - 1; row >= 0; row -= 1) {
      if (next[row][col]) remaining.push(next[row][col]);
    }
    let row = ROWS - 1;
    for (const tile of remaining) {
      next[row][col] = tile;
      row -= 1;
    }
    while (row >= 0) {
      next[row][col] = TILE_TYPES[Math.floor(rng() * TILE_TYPES.length)];
      row -= 1;
    }
  }

  return next;
}

function fillBoardWithoutMatches(rng) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const blocked = new Set();
      if (col >= 2 && board[row][col - 1] === board[row][col - 2]) blocked.add(board[row][col - 1]);
      if (row >= 2 && board[row - 1][col] === board[row - 2][col]) blocked.add(board[row - 1][col]);
      const choices = TILE_TYPES.filter((type) => !blocked.has(type));
      board[row][col] = choices[Math.floor(rng() * choices.length)];
    }
  }
  return board;
}

export function createBoard(rng = Math.random) {
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const board = fillBoardWithoutMatches(rng);
    if (findValidMoves(board, 'player').length && findValidMoves(board, 'ai').length) return board;
  }
  throw new Error('无法生成双方均可操作的棋盘');
}

export function resolveCascadePreview(board, rng = Math.random) {
  let current = cloneBoard(board);
  let level = 1;
  let damage = 0;
  const steps = [];

  while (true) {
    const groups = findMatchGroups(current);
    if (!groups.length) break;
    const matches = findMatches(current);
    const stepDamage = calculateMatchScore(groups);
    damage += stepDamage;
    steps.push({ level, tileCount: matches.length, damage: stepDamage });
    current = removeAndCollapse(current, matches, rng);
    level += 1;
  }

  return { board: current, damage, steps };
}
