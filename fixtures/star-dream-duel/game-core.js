export const ROWS = 8;
export const COLS = 8;
export const MIN_STARTING_SCORE = 100;
export const MAX_STARTING_SCORE = 1000;
export const SCORE_STEP = 100;
export const STARTING_SCORE = MIN_STARTING_SCORE;
export const TILE_TYPES = ['moon', 'cloud', 'star', 'flower', 'heart', 'drop'];
export const TACTICAL_RULE_VERSION = 2;

export function tileBase(tile) {
  if (typeof tile !== 'string' || tile === 'blocker') return null;
  return tile.split(':')[0];
}

export function tileSpecial(tile) {
  if (typeof tile !== 'string') return null;
  return tile.split(':')[1] ?? null;
}

function sameTile(left, right) {
  const type = tileBase(left);
  return Boolean(type && type !== 'prism' && type === tileBase(right));
}

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

export function canOwnerSwap(first, second, owner, board = null) {
  if (!isAdjacent(first, second) || !belongsToOwner(first, owner) || !belongsToOwner(second, owner)) return false;
  return !board || (board[first.row]?.[first.col] !== 'blocker' && board[second.row]?.[second.col] !== 'blocker');
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
      const same = col < COLS && sameTile(board[row][col], board[row][start]);
      if (same) continue;
      if (tileBase(board[row][start]) && tileBase(board[row][start]) !== 'prism' && col - start >= 3) {
        groups.push({
          axis: 'horizontal',
          type: tileBase(board[row][start]),
          positions: Array.from({ length: col - start }, (_, index) => ({ row, col: start + index }))
        });
      }
      start = col;
    }
  }

  for (let col = 0; col < COLS; col += 1) {
    let start = 0;
    for (let row = 1; row <= ROWS; row += 1) {
      const same = row < ROWS && sameTile(board[row][col], board[start][col]);
      if (same) continue;
      if (tileBase(board[start]?.[col]) && tileBase(board[start]?.[col]) !== 'prism' && row - start >= 3) {
        groups.push({
          axis: 'vertical',
          type: tileBase(board[start][col]),
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
        if (second.col >= COLS || second.row >= endRow || !canOwnerSwap(first, second, owner, board)) continue;
        const swapped = swapTiles(board, first, second);
        const groups = findMatchGroups(swapped);
        const prism = tileSpecial(board[first.row][first.col]) === 'prism' || tileSpecial(board[second.row][second.col]) === 'prism';
        if (groups.length > 0 || prism) {
          const matchCount = new Set(groups.flatMap((group) => group.positions.map(({ row, col }) => `${row}:${col}`))).size;
          moves.push({ first, second, matchCount: prism ? 8 : matchCount, score: prism ? 32 : calculateMatchScore(groups), prism });
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

function moveKey(move) {
  return `${move.first.row}:${move.first.col}-${move.second.row}:${move.second.col}`;
}

function boardSeed(board, move) {
  let value = 2166136261;
  const input = `${board.flat().join('|')}|${moveKey(move)}`;
  for (const character of input) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

export function classifyMatchShape(groups) {
  const coverage = new Map();
  for (const group of groups) {
    for (const position of group.positions) {
      const key = `${position.row}:${position.col}`;
      coverage.set(key, (coverage.get(key) ?? 0) + 1);
    }
  }
  const longest = groups.reduce((maximum, group) => Math.max(maximum, group.positions.length), 0);
  if (longest >= 5) return 'prism';
  if ([...coverage.values()].some((count) => count > 1)) return 'nova';
  if (longest >= 4) return groups.find((group) => group.positions.length === longest)?.axis === 'vertical' ? 'column' : 'row';
  return 'plain';
}

export function createSpecialFromGroups(groups, movedTo = null) {
  const shape = classifyMatchShape(groups);
  if (shape === 'plain') return null;
  const coverage = new Map();
  for (const group of groups) {
    for (const position of group.positions) {
      const key = `${position.row}:${position.col}`;
      coverage.set(key, { position, count: (coverage.get(key)?.count ?? 0) + 1 });
    }
  }
  const longest = [...groups].sort((left, right) => right.positions.length - left.positions.length)[0];
  const candidates = shape === 'nova'
    ? [...coverage.values()].filter((entry) => entry.count > 1).map((entry) => entry.position)
    : longest.positions;
  const anchor = movedTo && candidates.some((position) => position.row === movedTo.row && position.col === movedTo.col)
    ? movedTo
    : candidates[Math.floor(candidates.length / 2)];
  return { position: anchor, shape, type: shape === 'prism' ? 'prism' : longest.type };
}

export function expandSpecialMatches(board, matches) {
  const expanded = new Map(matches.map((position) => [`${position.row}:${position.col}`, position]));
  const queue = [...matches];
  const activated = [];
  const seen = new Set();
  while (queue.length) {
    const position = queue.shift();
    const special = tileSpecial(board[position.row]?.[position.col]);
    const key = `${position.row}:${position.col}`;
    if (!special || special === 'prism' || seen.has(key)) continue;
    seen.add(key);
    activated.push({ position, special });
    const affected = [];
    if (special === 'row') for (let col = 0; col < COLS; col += 1) affected.push({ row: position.row, col });
    if (special === 'column') for (let row = 0; row < ROWS; row += 1) affected.push({ row, col: position.col });
    if (special === 'nova') {
      for (let row = Math.max(0, position.row - 1); row <= Math.min(ROWS - 1, position.row + 1); row += 1) {
        for (let col = Math.max(0, position.col - 1); col <= Math.min(COLS - 1, position.col + 1); col += 1) affected.push({ row, col });
      }
    }
    for (const target of affected) {
      const targetKey = `${target.row}:${target.col}`;
      if (!expanded.has(targetKey)) {
        expanded.set(targetKey, target);
        queue.push(target);
      }
    }
  }
  return { matches: [...expanded.values()], activated };
}

export function prismSwapTargets(board, first, second) {
  const firstPrism = tileSpecial(board[first.row]?.[first.col]) === 'prism';
  const secondPrism = tileSpecial(board[second.row]?.[second.col]) === 'prism';
  if (!firstPrism && !secondPrism) return null;
  const prismDestination = firstPrism ? second : first;
  const targetSource = firstPrism ? second : first;
  const targetDestination = firstPrism ? first : second;
  const targetType = tileBase(board[targetSource.row][targetSource.col]);
  if (!targetType || targetType === 'prism') return null;
  const matches = [prismDestination, targetDestination];
  for (let row = 0; row < ROWS; row += 1) for (let col = 0; col < COLS; col += 1) {
    if (row === targetSource.row && col === targetSource.col) continue;
    if (tileBase(board[row][col]) === targetType) matches.push({ row, col });
  }
  return { targetType, matches };
}

export function calculateTacticalEffects(board, matches, groups = [], cascadeLevel = 1) {
  const counts = Object.fromEntries(TILE_TYPES.map((type) => [type, 0]));
  for (const { row, col } of matches) {
    const type = tileBase(board[row]?.[col]);
    if (counts[type] !== undefined) counts[type] += 1;
  }
  const shape = classifyMatchShape(groups);
  const shapeBonus = shape === 'prism' ? 8 : shape === 'nova' ? 6 : shape === 'row' || shape === 'column' ? 4 : 0;
  const chainBonus = Math.max(0, cascadeLevel - 1);
  return {
    counts,
    shape,
    damage: counts.star * 4 + shapeBonus + chainBonus,
    healing: counts.heart * 3 + chainBonus,
    energy: {
      tide: counts.drop * 2 + counts.cloud,
      bloom: counts.flower * 2 + counts.cloud,
      veil: counts.moon * 2 + counts.cloud,
    },
    extraTurn: cascadeLevel === 1 && groups.some((group) => group.positions.length >= 4),
  };
}

export function evaluateTacticalMove(board, move, owner, options = {}) {
  const swapped = swapTiles(board, move.first, move.second);
  const allowShapes = options.allowShapes !== false;
  const prism = allowShapes ? prismSwapTargets(board, move.first, move.second) : null;
  if (prism) {
    const effects = calculateTacticalEffects(swapped, prism.matches, [], 1);
    effects.shape = 'prism';
    effects.damage += 8;
    const immediateScore = effects.damage * 6 + effects.healing * 3 + Object.values(effects.energy).reduce((total, amount) => total + amount, 0) + prism.matches.length * 2 + 28;
    return { ...move, owner, immediateScore, opponentReply: 0, tacticalScore: immediateScore, effects, prismTarget: prism.targetType };
  }
  const preview = resolveCascadePreview(swapped, createSeededRng(boardSeed(board, move)), { allowSpecials: allowShapes });
  const firstGroups = findMatchGroups(swapped);
  const firstMatches = findMatches(swapped);
  const firstEffects = calculateTacticalEffects(swapped, firstMatches, firstGroups, 1);
  const energyTotal = Object.values(firstEffects.energy).reduce((total, amount) => total + amount, 0);
  const shapeValue = allowShapes ? { plain: 0, row: 12, column: 12, nova: 18, prism: 28 }[firstEffects.shape] : 0;
  const firstDamage = allowShapes ? firstEffects.damage : firstEffects.counts.star * 4;
  const immediateScore = preview.damage * 2 + firstDamage * 6 + firstEffects.healing * 3 + energyTotal + shapeValue + (firstEffects.extraTurn ? 24 : 0);
  let opponentReply = 0;
  if ((options.lookahead ?? 1) > 1 && !firstEffects.extraTurn) {
    const opponent = owner === 'ai' ? 'player' : 'ai';
    opponentReply = findValidMoves(preview.board, opponent).reduce((maximum, reply) => {
      const replyBoard = swapTiles(preview.board, reply.first, reply.second);
      const replyGroups = findMatchGroups(replyBoard);
      const replyEffects = calculateTacticalEffects(replyBoard, findMatches(replyBoard), replyGroups, 1);
      const replyEnergy = Object.values(replyEffects.energy).reduce((total, amount) => total + amount, 0);
      const replyDamage = allowShapes ? replyEffects.damage : replyEffects.counts.star * 4;
      return Math.max(maximum, replyDamage * 6 + replyEffects.healing * 3 + replyEnergy + (replyEffects.extraTurn ? 24 : 0));
    }, 0);
  }
  return { ...move, owner, immediateScore, opponentReply, tacticalScore: immediateScore - opponentReply * 0.68, effects: firstEffects };
}

export function rankTacticalMoves(board, owner, options = {}) {
  return findValidMoves(board, owner)
    .map((move) => evaluateTacticalMove(board, move, owner, options))
    .sort((left, right) => right.tacticalScore - left.tacticalScore || right.immediateScore - left.immediateScore || moveKey(left).localeCompare(moveKey(right)));
}

export function chooseTacticalAiMove(board, difficulty = 'standard', rng = Math.random, options = {}) {
  const ranked = rankTacticalMoves(board, 'ai', { ...options, lookahead: difficulty === 'challenging' ? 2 : 1 });
  if (!ranked.length) return null;
  if (difficulty === 'challenging') return ranked[0];
  if (difficulty === 'relaxed') {
    const pool = ranked.slice(Math.min(ranked.length - 1, Math.max(1, Math.floor(ranked.length * 0.45))));
    return pool[Math.floor(rng() * pool.length)] ?? ranked.at(-1);
  }
  const pool = ranked.slice(0, Math.max(1, Math.ceil(ranked.length / 3)));
  return pool[Math.floor(rng() * pool.length)] ?? ranked[0];
}

export function applyAttack(scores, actor, damage) {
  const shieldKey = actor === 'player' ? 'aiShield' : 'playerShield';
  const scoreKey = actor === 'player' ? 'aiScore' : 'playerScore';
  const damageKey = actor === 'player' ? 'playerDamage' : 'aiDamage';
  const absorbed = Math.min(scores[shieldKey] ?? 0, damage);
  return {
    ...scores,
    [shieldKey]: Math.max(0, (scores[shieldKey] ?? 0) - damage),
    [scoreKey]: Math.max(0, scores[scoreKey] - Math.max(0, damage - absorbed)),
    [damageKey]: scores[damageKey] + Math.max(0, damage - absorbed),
    lastAbsorbed: absorbed,
  };
}

function collapseColumnSegment(board, col, start, end, rng) {
  const remaining = [];
  for (let row = end; row >= start; row -= 1) if (board[row][col]) remaining.push(board[row][col]);
  let target = end;
  for (const tile of remaining) board[target--][col] = tile;
  while (target >= start) board[target--][col] = TILE_TYPES[Math.floor(rng() * TILE_TYPES.length)];
}

export function removeAndCollapse(board, matches, rng = Math.random, creation = null) {
  const next = cloneBoard(board);
  const creationKey = creation ? `${creation.position.row}:${creation.position.col}` : null;
  for (const { row, col } of matches) if (`${row}:${col}` !== creationKey) next[row][col] = null;
  if (creation) next[creation.position.row][creation.position.col] = `${creation.type}:${creation.shape}`;

  for (let col = 0; col < COLS; col += 1) {
    let segmentStart = 0;
    for (let row = 0; row <= ROWS; row += 1) {
      if (row < ROWS && next[row][col] !== 'blocker') continue;
      if (row > segmentStart) collapseColumnSegment(next, col, segmentStart, row - 1, rng);
      segmentStart = row + 1;
    }
  }

  return next;
}

function fillBoardWithoutMatches(rng, blockerKeys = new Set()) {
  const board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (blockerKeys.has(`${row}:${col}`)) {
        board[row][col] = 'blocker';
        continue;
      }
      const blocked = new Set();
      if (col >= 2 && sameTile(board[row][col - 1], board[row][col - 2])) blocked.add(tileBase(board[row][col - 1]));
      if (row >= 2 && sameTile(board[row - 1][col], board[row - 2][col])) blocked.add(tileBase(board[row - 1][col]));
      const choices = TILE_TYPES.filter((type) => !blocked.has(type));
      board[row][col] = choices[Math.floor(rng() * choices.length)];
    }
  }
  return board;
}

export function createBoard(rng = Math.random, options = {}) {
  const blockerKeys = new Set((options.blockers ?? []).map(({ row, col }) => `${row}:${col}`));
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const board = fillBoardWithoutMatches(rng, blockerKeys);
    if (findValidMoves(board, 'player').length && findValidMoves(board, 'ai').length) return board;
  }
  throw new Error('无法生成双方均可操作的棋盘');
}

export function resolveCascadePreview(board, rng = Math.random, options = {}) {
  let current = cloneBoard(board);
  let level = 1;
  let damage = 0;
  let healing = 0;
  let energy = 0;
  let extraTurn = false;
  const steps = [];

  while (true) {
    const groups = findMatchGroups(current);
    if (!groups.length) break;
    const baseMatches = findMatches(current);
    const expanded = options.allowSpecials === false ? { matches: baseMatches, activated: [] } : expandSpecialMatches(current, baseMatches);
    const creation = options.allowSpecials !== false && level === 1 ? createSpecialFromGroups(groups) : null;
    const matches = expanded.matches;
    const effects = calculateTacticalEffects(current, matches, groups, level);
    const stepDamage = options.allowSpecials === false ? effects.counts.star * 4 + Math.max(0, level - 1) : effects.damage;
    damage += stepDamage;
    healing += effects.healing;
    energy += Object.values(effects.energy).reduce((total, amount) => total + amount, 0);
    extraTurn ||= effects.extraTurn;
    steps.push({ level, tileCount: matches.length, damage: stepDamage, healing: effects.healing, energy: effects.energy, shape: effects.shape, creation, activated: expanded.activated });
    current = removeAndCollapse(current, matches, rng, creation);
    level += 1;
  }

  return { board: current, damage, healing, energy, extraTurn, steps };
}
